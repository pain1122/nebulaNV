import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  buildSelected,
  collectArtifacts,
  generateSelectedPrisma,
  prepareGraph,
  selectedGraph,
  syncInjectedRuntime,
  verifySelectedRuntimeImports,
} from "./backend-build-graph.mjs";
import { backendServices, repositoryRoot } from "../backend.mjs";
import {
  contextProbeDockerfile,
  localCopyInputs,
} from "./check-build-context.mjs";
import {
  inspectProofLog,
  modifiedProofInput,
  prepareSnapshot,
  proofCases,
} from "./benchmark-build-graph.mjs";

const require = createRequire(import.meta.url);
const turbo = path.join(
  path.dirname(require.resolve("turbo/package.json")),
  "bin",
  "turbo",
);
const pnpm = process.env.npm_execpath;
assert.ok(pnpm, "run these pinned-tool checks through pnpm test:build-graph");

function run(command, args, { cwd }) {
  const isTurbo =
    command === "turbo" ||
    (command === "pnpm" && args[0] === "exec" && args[1] === "turbo");
  const binary = isTurbo ? turbo : pnpm;
  const parameters =
    command === "turbo" ? args : isTurbo ? args.slice(2) : args;
  const result = spawnSync(process.execPath, [binary, ...parameters], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, TURBO_TELEMETRY_DISABLED: "1" },
  });
  assert.equal(
    result.status,
    0,
    `${command} ${parameters.join(" ")}\n${result.stdout}\n${result.stderr}`,
  );
  return result.stdout;
}

function temporary(check) {
  const directory = mkdtempSync(path.join(tmpdir(), "nebula-build-graph-"));
  try {
    return check(directory);
  } finally {
    const actual = realpathSync(directory);
    assert.equal(path.dirname(actual), realpathSync(tmpdir()));
    assert.ok(path.basename(actual).startsWith("nebula-build-graph-"));
    rmSync(actual, { recursive: true, force: true });
  }
}

function write(root, name, content) {
  const file = path.join(root, name);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(
    file,
    typeof content === "string" ? content : JSON.stringify(content, null, 2),
  );
}

function fingerprint(directory) {
  const hash = createHash("sha256");
  function walk(relative = "") {
    for (const entry of readdirSync(path.join(directory, relative), {
      withFileTypes: true,
    }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(relative, entry.name);
      if (entry.isDirectory()) walk(file);
      else {
        hash.update(file);
        hash.update(readFileSync(path.join(directory, file)));
      }
    }
  }
  walk();
  return hash.digest("hex");
}

function fixture(
  root,
  {
    lockOnly = false,
    rootSharedDependencies = false,
    ignoreOutputs = true,
  } = {},
) {
  const order = backendServices.find((s) => s.name === "order-service");
  write(root, "package.json", {
    name: "graph-proof",
    private: true,
    packageManager: "pnpm@10.17.1",
    ...(rootSharedDependencies
      ? {
          dependencies: {
            "@nebula/protos": "workspace:*",
            "@nebula/clients": "workspace:*",
          },
        }
      : {}),
    nebula: { backendServices: [order] },
  });
  write(
    root,
    "pnpm-workspace.yaml",
    "packages:\n  - apps/*\n  - packages/*\ninjectWorkspacePackages: true\nsyncInjectedDepsAfterScripts:\n  - build\n",
  );
  write(root, ".npmrc", "inject-workspace-packages=true\n");
  if (ignoreOutputs) {
    write(
      root,
      ".gitignore",
      "node_modules/\ndist/\n.turbo/\n.runtime-packages/\n",
    );
  }
  write(root, "tsconfig.base.json", {});
  write(root, "turbo.json", {
    tasks: { build: { dependsOn: ["^build"], outputs: ["dist/**"] } },
  });
  for (const [name, directory, dependencies] of [
    ["@nebula/protos", "packages/protos", {}],
    [
      "@nebula/clients",
      "packages/clients",
      { "@nebula/protos": "workspace:*" },
    ],
    [order.packageName, order.directory, { "@nebula/clients": "workspace:*" }],
  ]) {
    write(root, `${directory}/package.json`, {
      name,
      version: "1.0.0",
      main: "dist/index.js",
      files: ["dist", ...(name === "@nebula/protos" ? ["*.proto"] : [])],
      dependencies,
      scripts: {
        build: "node build.cjs",
        ...(name === order.packageName
          ? {
              postinstall: "pnpm run prisma:gen",
              "prisma:gen":
                "node -e \"throw new Error('unexpected generation')\"",
            }
          : {}),
      },
    });
  }
  write(root, "packages/protos/value.txt", "v1");
  write(
    root,
    "packages/protos/tenant_authority.proto",
    "// owned proof contract\n",
  );
  write(
    root,
    "packages/protos/build.cjs",
    "const fs=require('node:fs'); fs.mkdirSync('dist',{recursive:true}); fs.writeFileSync('dist/index.js', 'exports.value = '+JSON.stringify(fs.readFileSync('value.txt','utf8'))+';');\n",
  );
  write(
    root,
    "packages/clients/build.cjs",
    "const fs=require('node:fs'); const p=require('@nebula/protos'); fs.mkdirSync('dist',{recursive:true}); fs.writeFileSync('dist/index.js',\"exports.value = require('@nebula/protos').value;\"); fs.writeFileSync('dist/build-value.txt',p.value);\n",
  );
  write(
    root,
    `${order.directory}/build.cjs`,
    "const fs=require('node:fs'); fs.mkdirSync('dist',{recursive:true}); fs.writeFileSync('dist/result.txt', require('@nebula/clients').value);\n",
  );
  write(
    root,
    `${order.directory}/prisma/schema.prisma`,
    "// selected-owner schema fixture\n",
  );
  run(
    "pnpm",
    [
      "install",
      "--offline",
      "--ignore-scripts",
      ...(lockOnly ? ["--lockfile-only"] : []),
    ],
    { cwd: root },
  );
}

test("native proof accepts isolated cache behavior and rejects reinstallation or stale builds", () => {
  assert.equal(proofCases.length, 10);
  assert.deepEqual(
    proofCases.filter((p) => p.kind === "baseline").map((p) => p.owner),
    ["product", "order"],
  );
  const original = Buffer.from("// canonical source\n");
  const firstRun = randomUUID();
  const secondRun = randomUUID();
  const variants = proofCases
    .filter((proof) => proof.file)
    .flatMap((proof) =>
      [firstRun, secondRun].map((runId) => {
        const changed = modifiedProofInput(original, proof, runId);
        assert.deepEqual(changed.subarray(0, original.length), original);
        assert.ok(changed.toString().endsWith(`${runId} ${proof.name}\n`));
        return changed.toString();
      }),
    );
  assert.equal(new Set(variants).size, variants.length);
  const log = ({
    prisma = "CACHED",
    compile = "DONE 1s",
    install = "CACHED",
    misses = ["@nebula/product-service"],
  } = {}) =>
    [
      "#1 [graph-fetch 2/2] RUN fetch",
      "#1 CACHED",
      "#2 [graph-deps 2/4] RUN install",
      `#2 ${install}`,
      "#3 [graph-prisma 2/2] RUN generate",
      `#3 ${prisma}`,
      "#4 [graph-build 2/2] RUN compile",
      `#4 ${compile}`,
      ...misses.map((name) => `${name}:build: cache miss, executing abc`),
    ].join("\n");
  assert.doesNotThrow(() =>
    inspectProofLog(log(), {
      name: "source",
      kind: "source",
      owner: "product",
    }),
  );
  assert.doesNotThrow(() =>
    inspectProofLog(log({ prisma: "DONE 1s" }), {
      name: "schema",
      kind: "schema",
      owner: "product",
    }),
  );
  assert.doesNotThrow(() =>
    inspectProofLog(log({ compile: "CACHED", misses: [] }), {
      name: "unrelated",
      kind: "unrelated",
      owner: "product",
    }),
  );
  assert.doesNotThrow(() =>
    inspectProofLog(
      log({
        misses: [
          "@nebula/protos",
          "@nebula/grpc-auth",
          "@nebula/clients",
          "@nebula/product-service",
        ],
      }),
      { name: "shared", kind: "shared", owner: "product" },
    ),
  );
  assert.throws(
    () =>
      inspectProofLog(log({ install: "DONE 2s" }), {
        name: "source",
        kind: "source",
        owner: "product",
      }),
    /must stay cached/,
  );
  assert.throws(
    () =>
      inspectProofLog(
        log({ misses: ["@nebula/product-service", "@nebula/protos"] }),
        { name: "source", kind: "source", owner: "product" },
      ),
    /unexpected repeated shared compile/,
  );
  assert.throws(
    () =>
      inspectProofLog(log({ misses: [] }), {
        name: "source",
        kind: "source",
        owner: "product",
      }),
    /owner must compile/,
  );
  assert.throws(
    () =>
      inspectProofLog(log(), {
        name: "unrelated",
        kind: "unrelated",
        owner: "product",
      }),
    /unrelated compilation/,
  );
  assert.throws(
    () =>
      inspectProofLog(log(), {
        name: "shared",
        kind: "shared",
        owner: "product",
      }),
    /must propagate/,
  );
  assert.throws(
    () =>
      inspectProofLog(log({ compile: "CACHED" }), {
        name: "source",
        kind: "source",
        owner: "product",
      }),
    /changed compilation must execute/,
  );
  assert.throws(
    () =>
      inspectProofLog(
        log({ misses: ["@nebula/product-service", "@nebula/order-service"] }),
        { name: "source", kind: "source", owner: "product" },
      ),
    /unexpected compiled workspace/,
  );
});

test("native proof snapshot excludes credentials/dependencies/generated files and never mutates source", () =>
  temporary((root) => {
    const source = path.join(root, "source");
    const target = path.join(root, "snapshot");
    write(
      source,
      "docker/backend.Dockerfile",
      "FROM scratch\nCOPY package.json ./\nCOPY apps/product-service ./apps/product-service\nCOPY apps/order-service ./apps/order-service\nCOPY apps/media-service ./apps/media-service\nCOPY packages/protos ./packages/protos\n",
    );
    write(source, ".dockerignore", ".env\n.env.*\n**/node_modules\n**/dist\n");
    write(source, "package.json", { name: "snapshot-control" });
    for (const file of new Set(proofCases.map((p) => p.file).filter(Boolean)))
      write(source, file, "// canonical source\n");
    write(source, "apps/product-service/.env", "PRIVATE=fixture-only");
    write(
      source,
      "apps/product-service/node_modules/package/index.js",
      "dependency",
    );
    write(source, "apps/product-service/dist/main.js", "compiled");
    write(source, "packages/protos/generated/product.ts", "generated");
    write(source, "apps/order-service/prisma/generated/client.js", "generated");
    prepareSnapshot(source, target);
    assert.equal(
      readFileSync(
        path.join(target, "apps/product-service/src/health.controller.ts"),
        "utf8",
      ),
      "// canonical source\n",
    );
    for (const file of [
      "apps/product-service/.env",
      "apps/product-service/node_modules",
      "apps/product-service/dist",
      "packages/protos/generated",
      "apps/order-service/prisma/generated",
    ])
      assert.equal(existsSync(path.join(target, file)), false, file);
    assert.equal(
      readFileSync(path.join(source, "apps/product-service/.env"), "utf8"),
      "PRIVATE=fixture-only",
    );
    assert.equal(
      readFileSync(
        path.join(source, "apps/product-service/src/health.controller.ts"),
        "utf8",
      ),
      "// canonical source\n",
    );
  }));

test("context probe checks every local COPY input without running build commands", () => {
  const inputs = localCopyInputs(
    'FROM scratch\nCOPY package.json .gitignore ./\nCOPY ["directory with spaces", "/target/"]\nCOPY --from=producer /dist /dist\n',
  );
  assert.deepEqual(inputs, [
    "package.json",
    ".gitignore",
    "directory with spaces",
  ]);
  const probe = contextProbeDockerfile(inputs);
  assert.equal(
    probe.split("\n")[1],
    `COPY ${JSON.stringify([...inputs, "/context/"])}`,
  );
  assert.doesNotMatch(probe, /^RUN\b/m);
  assert.throws(
    () => localCopyInputs('COPY "$UNRESOLVED" /target/'),
    /unsupported_local_copy/,
  );
  const actual = localCopyInputs(
    readFileSync(
      path.join(repositoryRoot, "docker/backend.Dockerfile"),
      "utf8",
    ),
  );
  assert.ok(actual.includes("scripts/docker/backend-build-graph.mjs"));
  assert.ok(actual.includes("pnpm-lock.yaml"));
});

test("actual all-owner, batch and full-inventory pruning preserves frozen metadata and special runtime inputs", () =>
  temporary((root) => {
    // Turbo also retains the root tooling's declared workspace dependencies.
    // Keep an exact source inventory without mistaking those for app build tasks.
    const rootManifest = JSON.parse(
      readFileSync(path.join(repositoryRoot, "package.json")),
    );
    const allWorkspaces = new Map(
      selectedGraph(repositoryRoot, "all").workspaces.map((workspace) => [
        workspace.manifest.name,
        workspace,
      ]),
    );
    const rootTooling = new Map();
    function visitTooling(manifest) {
      for (const [name, version] of Object.entries({
        ...manifest.dependencies,
        ...manifest.devDependencies,
        ...manifest.optionalDependencies,
      })) {
        if (!version.startsWith("workspace:") || rootTooling.has(name))
          continue;
        const workspace = allWorkspaces.get(name);
        assert.ok(workspace, `unknown root tooling dependency ${name}`);
        assert.ok(workspace.directory.startsWith(`packages${path.sep}`));
        rootTooling.set(name, workspace);
        visitTooling(workspace.manifest);
      }
    }
    visitTooling(rootManifest);
    for (const [index, selection] of [
      ...backendServices.map((service) => service.name),
      "product-service,order-service,gateway",
      "all",
    ].entries()) {
      const output = path.join(root, `prune-${index}`);
      const graph = prepareGraph(repositoryRoot, selection, output, run);
      const names = graph.services.map((service) => service.name);
      assert.deepEqual(
        readdirSync(path.join(output, "full", "apps")).sort(),
        [...names].sort(),
      );
      assert.deepEqual(
        readdirSync(path.join(output, "full", "packages")).sort(),
        [
          ...new Map([
            ...rootTooling,
            ...graph.workspaces.map((workspace) => [
              workspace.manifest.name,
              workspace,
            ]),
          ]).values(),
        ]
          .filter((workspace) =>
            workspace.directory.startsWith(`packages${path.sep}`),
          )
          .map((workspace) => path.basename(workspace.directory))
          .sort(),
      );
      assert.ok(existsSync(path.join(output, "full", "tsconfig.base.json")));
      for (const service of graph.services) {
        const name = service.name;
        assert.equal(
          existsSync(path.join(output, "full", "apps", name, ".env")),
          false,
        );
        const install = JSON.parse(
          readFileSync(path.join(output, "json", "apps", name, "package.json")),
        );
        assert.equal(install.scripts.postinstall, undefined);
        const full = JSON.parse(
          readFileSync(path.join(output, "full", "apps", name, "package.json")),
        );
        const original = JSON.parse(
          readFileSync(
            path.join(repositoryRoot, service.directory, "package.json"),
          ),
        );
        assert.equal(full.scripts.postinstall, original.scripts.postinstall);
        assert.equal(
          existsSync(
            path.join(
              output,
              "schemas",
              service.directory,
              "prisma/schema.prisma",
            ),
          ),
          service.database !== null,
        );
      }
      const owners = graph.services
        .filter((service) => service.database !== null)
        .map((service) => service.packageName);
      assert.deepEqual(
        JSON.parse(
          readFileSync(path.join(output, "schemas", ".backend-prisma.json")),
        ),
        owners,
      );
      const generationCalls = [];
      generateSelectedPrisma(path.join(output, "schemas"), (command, args) =>
        generationCalls.push([command, ...args]),
      );
      assert.deepEqual(
        generationCalls,
        owners.map((owner) => ["pnpm", "--filter", owner, "prisma:gen"]),
      );
      if (names.includes("media-service")) {
        for (const asset of ["Vazirmatn-Regular.ttf", "OFL.txt"])
          assert.deepEqual(
            readFileSync(
              path.join(output, "full/apps/media-service/assets/fonts", asset),
            ),
            readFileSync(
              path.join(
                repositoryRoot,
                "apps/media-service/assets/fonts",
                asset,
              ),
            ),
          );
      }
      if (selection === "realm-auth-service")
        assert.deepEqual(
          graph.workspaces
            .filter((workspace) =>
              workspace.directory.startsWith(`packages${path.sep}`),
            )
            .map((workspace) => path.basename(workspace.directory))
            .sort(),
          ["config", "migration-artifacts"],
        );
      if (
        graph.workspaces.some(
          (workspace) => workspace.manifest.name === "@nebula/protos",
        )
      )
        assert.ok(
          existsSync(
            path.join(output, "full/packages/protos/scripts/generate.mjs"),
          ),
        );
      const policy = JSON.parse(
        readFileSync(path.join(output, "fetch", "package.json")),
      );
      const original = JSON.parse(
        readFileSync(path.join(repositoryRoot, "package.json")),
      );
      assert.deepEqual(policy.pnpm, original.pnpm);
      assert.equal(policy.scripts, undefined);
      run(
        "pnpm",
        [
          "install",
          "--lockfile-only",
          "--frozen-lockfile",
          "--offline",
          "--ignore-scripts",
        ],
        { cwd: path.join(output, "json") },
      );
    }
  }));

test("union builds compile real shared producers once before both injected consumers", () =>
  temporary((root) => {
    fixture(root, { rootSharedDependencies: true, ignoreOutputs: false });
    const manifest = JSON.parse(readFileSync(path.join(root, "package.json")));
    const product = backendServices.find(
      (service) => service.name === "product-service",
    );
    manifest.nebula.backendServices.push(product);
    write(root, "package.json", manifest);
    write(root, "apps/product-service/package.json", {
      name: product.packageName,
      version: "1.0.0",
      dependencies: { "@nebula/clients": "workspace:*" },
      scripts: { build: "node build.cjs" },
    });
    write(
      root,
      "apps/product-service/build.cjs",
      "const fs=require('node:fs'); fs.mkdirSync('dist',{recursive:true}); fs.writeFileSync('dist/result.txt', require('@nebula/clients').value);\n",
    );
    run("pnpm", ["install", "--offline", "--ignore-scripts"], { cwd: root });
    const logs = [];
    buildSelected(root, "order-service,product-service", {
      run(command, args, options) {
        const output = run(command, args, options);
        logs.push(output);
        return output;
      },
    });
    for (const name of [
      "protos",
      "clients",
      "order-service",
      "product-service",
    ])
      assert.equal(
        (
          logs
            .join("\n")
            .match(new RegExp(`@nebula/${name}:build: cache miss`, "g")) ?? []
        ).length,
        1,
        name,
      );
    for (const name of ["order-service", "product-service"])
      assert.equal(
        readFileSync(path.join(root, "apps", name, "dist/result.txt"), "utf8"),
        "v1",
      );
  }));

test("runtime verification dispatches separate validated owners for leaves, batches and full inventory", () =>
  temporary((root) => {
    for (const service of backendServices)
      write(
        root,
        `${service.directory}/dist/config/env.validation.js`,
        "exports.schema = {};\n",
      );
    for (const selection of [
      "gateway",
      "product-service,order-service,gateway",
      "all",
    ]) {
      const expected = selectedGraph(repositoryRoot, selection).services.map(
        (service) => service.name,
      );
      verifySelectedRuntimeImports(
        repositoryRoot,
        selection,
        (command, args, options) => {
          assert.equal(command, "node");
          assert.equal(options.cwd, repositoryRoot);
          assert.equal(args[0], "./scripts/docker/verify-runtime-imports.mjs");
          assert.deepEqual(args.slice(2), expected);
          const result = spawnSync(
            process.execPath,
            [path.join(repositoryRoot, args[0]), root, ...args.slice(2)],
            { encoding: "utf8" },
          );
          assert.equal(result.status, 0, result.stderr);
          assert.match(
            result.stdout,
            new RegExp(`passed for ${expected.length} backend service`),
          );
        },
      );
    }
    write(
      root,
      "apps/gateway/dist/unsafe.js",
      "require('../../../packages/config');\n",
    );
    const denied = spawnSync(
      process.execPath,
      [
        path.join(repositoryRoot, "scripts/docker/verify-runtime-imports.mjs"),
        root,
        "gateway",
      ],
      { encoding: "utf8" },
    );
    assert.equal(denied.status, 1);
    assert.match(denied.stderr, /relative imports/);
  }));

test("pruned cache inputs isolate source, schema, unrelated source and root script edits", () =>
  temporary((root) => {
    const input = path.join(root, "input");
    mkdirSync(input);
    fixture(input, { lockOnly: true });
    // Match Docker's context: .gitignore itself is excluded, and node_modules
    // was never copied into the pruner. Pruning must work without that file.
    rmSync(path.join(input, ".gitignore"));
    let counter = 0;
    const prepare = () => {
      const output = path.join(root, `prune-${counter++}`);
      prepareGraph(input, "order-service", output, run);
      return Object.fromEntries(
        ["fetch", "json", "schemas", "full"].map((part) => [
          part,
          fingerprint(path.join(output, part)),
        ]),
      );
    };
    const before = prepare();
    write(
      input,
      "apps/order-service/extra-source.ts",
      "export const changed = true;\n",
    );
    const source = prepare();
    for (const part of ["fetch", "json", "schemas"])
      assert.equal(source[part], before[part], part);
    assert.notEqual(source.full, before.full);
    write(
      input,
      "apps/order-service/prisma/schema.prisma",
      "// changed schema\n",
    );
    const schema = prepare();
    for (const part of ["fetch", "json"])
      assert.equal(schema[part], source[part], part);
    assert.notEqual(schema.schemas, source.schemas);
    write(input, "apps/unrelated/src/extra.ts", "// unrelated\n");
    assert.deepEqual(prepare(), schema);
    const manifest = JSON.parse(readFileSync(path.join(input, "package.json")));
    manifest.scripts = { unrelated: "node -e \"console.log('example')\"" };
    write(input, "package.json", manifest);
    assert.equal(prepare().fetch, schema.fetch);
  }));

test("actual pinned pnpm/Turbo restores shared cache before a changed injected consumer builds", () =>
  temporary((root) => {
    fixture(root, { rootSharedDependencies: true, ignoreOutputs: false });
    const logs = [];
    const execute = (command, args, options) => {
      const output = run(command, args, options);
      logs.push(output);
      return output;
    };
    buildSelected(root, "order-service", { run: execute });
    for (const name of ["protos", "clients"]) {
      const misses =
        logs
          .join("\n")
          .match(new RegExp(`@nebula/${name}:build: cache miss`, "g")) ?? [];
      assert.equal(
        misses.length,
        1,
        `${name} must compile once across the shared/app phases`,
      );
    }
    assert.equal(
      readFileSync(
        path.join(root, "apps/order-service/dist/result.txt"),
        "utf8",
      ),
      "v1",
    );
    const graph = selectedGraph(root, "order-service");
    const store = path.join(root, "node_modules", ".pnpm");
    for (const workspace of graph.workspaces) {
      const dist = path.join(root, workspace.directory, "dist");
      assert.ok(path.resolve(dist).startsWith(path.resolve(root) + path.sep));
      rmSync(dist, { recursive: true, force: true });
    }
    for (const entry of readdirSync(store)) {
      for (const name of ["protos", "clients"]) {
        const directory = path.join(
          store,
          entry,
          "node_modules",
          "@nebula",
          name,
        );
        if (existsSync(directory))
          write(
            root,
            path.relative(root, path.join(directory, "dist", "stale.js")),
            "// stale\n",
          );
      }
    }
    const sourceProof = proofCases.find(
      (proof) => proof.name === "order-source",
    );
    const originalInput = Buffer.from("consumer changed\n");
    write(
      root,
      "apps/order-service/new-input.txt",
      modifiedProofInput(originalInput, sourceProof, randomUUID()).toString(),
    );
    logs.length = 0;
    buildSelected(root, "order-service", { run: execute });
    assert.ok(
      logs.some((log) => /cache hit/.test(log)),
      "real shared outputs must restore from Turbo cache",
    );
    assert.equal(
      readFileSync(
        path.join(root, "apps/order-service/dist/result.txt"),
        "utf8",
      ),
      "v1",
    );
    for (const entry of readdirSync(store)) {
      for (const name of ["protos", "clients"])
        assert.equal(
          existsSync(
            path.join(
              store,
              entry,
              "node_modules",
              "@nebula",
              name,
              "dist",
              "stale.js",
            ),
          ),
          false,
        );
    }
    // Reproduce the native failure: a repeated variant legitimately hits Turbo.
    logs.length = 0;
    buildSelected(root, "order-service", { run: execute });
    assert.doesNotMatch(logs.join("\n"), /:build: cache miss/);
    write(
      root,
      "apps/order-service/new-input.txt",
      modifiedProofInput(originalInput, sourceProof, randomUUID()).toString(),
    );
    logs.length = 0;
    buildSelected(root, "order-service", { run: execute });
    assert.equal(
      (logs.join("\n").match(/@nebula\/order-service:build: cache miss/g) ?? [])
        .length,
      1,
      "a new proof run must compile the changed owner exactly once",
    );
    assert.doesNotMatch(
      logs.join("\n"),
      /@nebula\/(?:protos|clients):build: cache miss/,
      "fresh owner marker must preserve shared cache hits",
    );
    write(root, "packages/protos/value.txt", "v2");
    buildSelected(root, "order-service", { run: execute });
    assert.equal(
      readFileSync(
        path.join(root, "packages/clients/dist/build-value.txt"),
        "utf8",
      ),
      "v2",
    );
    assert.equal(
      readFileSync(
        path.join(root, "apps/order-service/dist/result.txt"),
        "utf8",
      ),
      "v2",
    );
    collectArtifacts(root, "order-service");
    assert.ok(
      existsSync(
        path.join(root, ".runtime-packages/protos/tenant_authority.proto"),
      ),
    );
    assert.deepEqual(readdirSync(path.join(root, ".runtime-packages")).sort(), [
      "clients",
      "protos",
    ]);
    const generationCalls = [];
    write(root, ".backend-prisma.json", ["@nebula/order-service"]);
    generateSelectedPrisma(root, (command, args) =>
      generationCalls.push([command, ...args]),
    );
    assert.deepEqual(generationCalls, [
      ["pnpm", "--filter", "@nebula/order-service", "prisma:gen"],
    ]);
  }));

test("graph fails closed on sibling implementation imports, cycles, unknown owners and unsafe slots", () =>
  temporary((root) => {
    fixture(root);
    assert.throws(() => selectedGraph(root, "unknown"), /unknown_service/);
    assert.throws(
      () => selectedGraph(root, "order-service,order-service"),
      /invalid_selection/,
    );
    const file = path.join(root, "packages/protos/package.json");
    const manifest = JSON.parse(readFileSync(file));
    manifest.dependencies = { "@nebula/clients": "workspace:*" };
    write(root, "packages/protos/package.json", manifest);
    assert.throws(() => selectedGraph(root, "order-service"), /cycle/);
    delete manifest.dependencies;
    write(root, "packages/protos/package.json", manifest);
    const app = JSON.parse(
      readFileSync(path.join(root, "apps/order-service/package.json")),
    );
    app.dependencies["@nebula/product-service"] = "workspace:*";
    write(root, "apps/order-service/package.json", app);
    write(root, "apps/product-service/package.json", {
      name: "@nebula/product-service",
      version: "1.0.0",
    });
    assert.throws(
      () => selectedGraph(root, "order-service"),
      /sibling_application_dependency/,
    );
    delete app.dependencies["@nebula/product-service"];
    write(root, "apps/order-service/package.json", app);
    assert.throws(
      () => buildSelected(root, "order-service", { concurrency: "0" }),
      /concurrency_invalid/,
    );
    assert.throws(
      () => collectArtifacts(root, "order-service"),
      /missing_dist/,
    );
    const foreign = path.join(root, "foreign");
    write(root, "foreign/package.json", manifest);
    write(root, "foreign/dist/preserve.txt", "must survive");
    const unsafe = path.join(
      root,
      "node_modules/.pnpm/unsafe/node_modules/@nebula/protos",
    );
    mkdirSync(path.dirname(unsafe), { recursive: true });
    symlinkSync(
      foreign,
      unsafe,
      process.platform === "win32" ? "junction" : "dir",
    );
    assert.throws(
      () =>
        syncInjectedRuntime(root, { manifest, directory: "packages/protos" }),
      /outside_store/,
    );
    assert.equal(
      readFileSync(path.join(foreign, "dist/preserve.txt"), "utf8"),
      "must survive",
    );
  }));
