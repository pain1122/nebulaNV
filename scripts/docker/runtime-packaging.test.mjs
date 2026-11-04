import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import { overlayRuntimePackages } from "./runtime-package-overlay.mjs";
import {
  buildArguments,
  candidateDockerfile,
  comparisonPlan,
  exportedImageIdentity,
  layerEvidence,
  packagingInputs,
  pilots,
  probeImage,
  verifyWarmImage,
} from "./benchmark-runtime-packaging.mjs";
import { repositoryRoot } from "../backend.mjs";

const pnpm = process.env.npm_execpath;
assert.ok(
  pnpm,
  "run through pnpm test:build-graph scripts/docker/runtime-packaging.test.mjs",
);
function write(root, file, value) {
  const target = path.join(root, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(
    target,
    typeof value === "string" ? value : JSON.stringify(value),
  );
}
function temporary(check) {
  const root = mkdtempSync(path.join(tmpdir(), "nebula-runtime-packaging-"));
  try {
    return check(root);
  } finally {
    const actual = realpathSync(root);
    assert.equal(path.dirname(actual), realpathSync(tmpdir()));
    assert.ok(path.basename(actual).startsWith("nebula-runtime-packaging-"));
    rmSync(actual, { recursive: true, force: true });
  }
}
function run(root, args) {
  const result = spawnSync(process.execPath, [pnpm, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, CI: "true", GITHUB_ACTIONS: "true" },
  });
  assert.equal(
    result.status,
    0,
    `${args.join(" ")}\n${result.stdout}\n${result.stderr}`,
  );
  return result.stdout.trim();
}
function artifacts(root) {
  write(root, "built/shared/package.json", {
    name: "@fixture/shared",
    version: "1.0.0",
    main: "dist/index.js",
    files: ["dist", "*.proto"],
  });
  write(
    root,
    "built/shared/dist/index.js",
    "module.exports = 'compiled-runtime';\n",
  );
  write(root, "built/shared/current.proto", 'syntax = "proto3";\n');
}
function basic(root) {
  artifacts(root);
  write(root, "deploy/node_modules/@fixture/shared/package.json", {
    name: "@fixture/shared",
    version: "1.0.0",
  });
  write(root, "deploy/node_modules/@fixture/shared/dist/stale.js", "stale");
  write(root, "deploy/node_modules/@fixture/shared/stale.proto", "stale");
}

test("pinned metadata-only deploy is frozen, ignores hooks, excludes dev dependencies and remains portable after overlay", () =>
  temporary((root) => {
    const workspace = path.join(root, "workspace");
    const deployed = path.join(root, "deployed");
    const hooks = { postinstall: 'node -e "process.exit(93)"' };
    write(workspace, "package.json", {
      private: true,
      packageManager: "pnpm@10.17.1",
    });
    write(
      workspace,
      "pnpm-workspace.yaml",
      "packages:\n  - apps/*\n  - packages/*\ninjectWorkspacePackages: true\nsyncInjectedDepsAfterScripts:\n  - build\n",
    );
    write(
      workspace,
      ".npmrc",
      "inject-workspace-packages=true\nshared-workspace-lockfile=true\n",
    );
    write(workspace, "apps/app/package.json", {
      name: "@fixture/app",
      version: "1.0.0",
      scripts: hooks,
      dependencies: { "@fixture/shared": "workspace:*" },
      devDependencies: { "@fixture/dev-only": "workspace:*" },
    });
    write(workspace, "packages/shared/package.json", {
      name: "@fixture/shared",
      version: "1.0.0",
      main: "dist/index.js",
      files: ["dist", "*.proto"],
      scripts: hooks,
    });
    write(workspace, "packages/dev-only/package.json", {
      name: "@fixture/dev-only",
      version: "1.0.0",
    });
    assert.equal(run(workspace, ["--version"]), "10.17.1");
    // Only the disposable authoring step creates a lock; actual installs/deploy are frozen.
    run(workspace, [
      "install",
      "--lockfile-only",
      "--ignore-scripts",
      "--config.frozen-lockfile=false",
      "--store-dir",
      path.join(root, "store"),
    ]);
    const lock = readFileSync(path.join(workspace, "pnpm-lock.yaml"), "utf8");
    run(workspace, [
      "install",
      "--prod",
      "--offline",
      "--ignore-scripts",
      "--frozen-lockfile",
      "--store-dir",
      path.join(root, "store"),
    ]);
    run(workspace, [
      "--filter=@fixture/app",
      "--prod",
      "--offline",
      "--ignore-scripts",
      "--frozen-lockfile",
      "deploy",
      deployed,
      "--store-dir",
      path.join(root, "store"),
    ]);
    assert.equal(
      readFileSync(path.join(workspace, "pnpm-lock.yaml"), "utf8"),
      lock,
    );
    assert.equal(
      existsSync(path.join(deployed, "node_modules/@fixture/dev-only")),
      false,
    );
    artifacts(root);
    const slot = realpathSync(
      path.join(deployed, "node_modules/@fixture/shared"),
    );
    write(slot, "dist/stale.js", "stale");
    write(slot, "stale.proto", "stale");
    const result = overlayRuntimePackages(path.join(root, "built"), deployed, [
      "@fixture/shared",
    ]);
    assert.ok(result.copies >= 1);
    assert.equal(existsSync(path.join(slot, "dist/stale.js")), false);
    assert.equal(existsSync(path.join(slot, "stale.proto")), false);
    // Move is unnecessary: resolving after the original workspace is removed proves isolation.
    assert.equal(path.dirname(realpathSync(workspace)), realpathSync(root));
    rmSync(workspace, { recursive: true, force: true });
    const require = createRequire(path.join(deployed, "package.json"));
    assert.equal(require("@fixture/shared"), "compiled-runtime");
    assert.ok(
      readFileSync(
        require.resolve("@fixture/shared/current.proto"),
        "utf8",
      ).includes("proto3"),
    );
  }));

test("overlay validates all versions before replacing stale artifacts", () =>
  temporary((root) => {
    basic(root);
    write(root, "deploy/node_modules/@fixture/shared/package.json", {
      name: "@fixture/shared",
      version: "2.0.0",
    });
    assert.throws(
      () =>
        overlayRuntimePackages(
          path.join(root, "built"),
          path.join(root, "deploy"),
          ["@fixture/shared"],
        ),
      /slot_version_mismatch/,
    );
    assert.equal(
      readFileSync(
        path.join(root, "deploy/node_modules/@fixture/shared/dist/stale.js"),
        "utf8",
      ),
      "stale",
    );
  }));

test("overlay rejects a deployment link escaping its root without modifying the outside package", () =>
  temporary((root) => {
    artifacts(root);
    write(root, "outside/package.json", {
      name: "@fixture/shared",
      version: "1.0.0",
    });
    write(root, "outside/dist/retained.js", "retained");
    mkdirSync(path.join(root, "deploy/node_modules/@fixture"), {
      recursive: true,
    });
    symlinkSync(
      path.join(root, "outside"),
      path.join(root, "deploy/node_modules/@fixture/shared"),
      "junction",
    );
    assert.throws(
      () =>
        overlayRuntimePackages(
          path.join(root, "built"),
          path.join(root, "deploy"),
          ["@fixture/shared"],
        ),
      /path_outside_root/,
    );
    assert.equal(
      readFileSync(path.join(root, "outside/dist/retained.js"), "utf8"),
      "retained",
    );
  }));

test("overlay refuses artifact links rather than copying dependency trees", () =>
  temporary((root) => {
    basic(root);
    symlinkSync(
      path.join(root, "deploy"),
      path.join(root, "built/shared/node_modules"),
      "junction",
    );
    assert.throws(
      () =>
        overlayRuntimePackages(
          path.join(root, "built"),
          path.join(root, "deploy"),
          ["@fixture/shared"],
        ),
      /artifact_symlink/,
    );
  }));

test("overlay rejects missing deployed slots and duplicate requirements before modifying another package", () =>
  temporary((root) => {
    basic(root);
    assert.throws(
      () =>
        overlayRuntimePackages(
          path.join(root, "built"),
          path.join(root, "deploy"),
          ["@fixture/shared", "@fixture/shared"],
        ),
      /duplicate_name/,
    );
    write(root, "built/missing/package.json", {
      name: "@fixture/missing",
      version: "1.0.0",
    });
    write(root, "built/missing/dist/index.js", "module.exports=1;");
    assert.throws(
      () =>
        overlayRuntimePackages(
          path.join(root, "built"),
          path.join(root, "deploy"),
          ["@fixture/shared", "@fixture/missing"],
        ),
      /slot_missing/,
    );
    assert.ok(
      existsSync(
        path.join(root, "deploy/node_modules/@fixture/shared/dist/stale.js"),
      ),
    );
  }));

test("generated experiment preserves the entire accepted Dockerfile and each pilot's runtime contract", () => {
  const original = readFileSync(
    path.join(repositoryRoot, "docker/backend.Dockerfile"),
    "utf8",
  );
  const services = packagingInputs(repositoryRoot);
  const generated = candidateDockerfile(original, services);
  assert.ok(generated.startsWith(original));
  const appended = generated.slice(original.length);
  assert.equal(
    (
      appended.match(
        /pnpm --filter=.* --prod --ignore-scripts --frozen-lockfile deploy/g,
      ) ?? []
    ).length,
    pilots.length,
  );
  for (const name of pilots) {
    const service = services.find((s) => s.name === name);
    const baseline = original
      .split(`FROM runtime-base AS ${service.target}`)[1]
      .split(/\r?\nFROM /)[0];
    const candidate = appended
      .split(` AS packaging-${name}\n`)[1]
      .split(/\r?\nFROM /)[0];
    // Ignore only the two intentionally substituted dependency COPYs; all other
    // runtime instructions, including native checks/assets, must be byte-identical.
    const expected = baseline
      .replace(
        `--from=prod-deps /app/${service.directory}/package.json`,
        `--from=packaging-deps-${name} /runtime-deployment/package.json`,
      )
      .replace(
        `--from=prod-deps /app/${service.directory}/node_modules`,
        `--from=packaging-output-${name} /runtime-deployment/node_modules`,
      );
    assert.ok(
      candidate.trimEnd().endsWith(expected.trimEnd()),
      `${name}_runtime_body_changed`,
    );
  }
  assert.throws(
    () =>
      candidateDockerfile(
        original.replace("AS runtime-base", "AS altered-base"),
        services,
      ),
    /os_boundary_missing/,
  );
  assert.throws(
    () =>
      candidateDockerfile(
        original,
        services.filter((s) => s.name !== "gateway"),
      ),
    /missing_pilot/,
  );
});

test("comparison bounds the same full compile union to twenty owned exports and never prunes or overwrites normal tags", () => {
  const plan = comparisonPlan(
    packagingInputs(repositoryRoot),
    "fixture-unique-run",
  );
  assert.equal(plan.length, 20);
  assert.equal(
    plan.filter((p) => p.layout === "baseline" && !p.warm).length,
    11,
  );
  assert.equal(plan.filter((p) => p.warm).length, 6);
  for (const step of plan) {
    const args = buildArguments(step, "/owned/context");
    assert.ok(args.includes("BACKEND_BUILD_SERVICE=all"));
    assert.ok(args.includes("BACKEND_BUILD_CONCURRENCY=1"));
    assert.ok(args.includes("BACKEND_BUILD_PIPELINE=graph"));
    assert.ok(!args.some((a) => /no-cache|force|prune|push|cache-to/.test(a)));
    assert.match(
      step.tag,
      /^nebula-packaging\/fixture-unique-run-[a-z-]+:(baseline|candidate)$/,
    );
  }
  assert.throws(() =>
    comparisonPlan(packagingInputs(repositoryRoot), "../unsafe"),
  );
});

test("layer evidence deduplicates shared identities without pretending logical size is physical disk usage", () => {
  assert.deepEqual(
    layerEvidence([
      { dockerReportedBytes: 100, layers: ["os", "shared", "app-a"] },
      { dockerReportedBytes: 110, layers: ["os", "shared", "app-b"] },
    ]),
    {
      images: 2,
      summedDockerReportedBytes: 210,
      distinctLayerIds: 4,
      sharedLayerIds: 2,
    },
  );
});

// Exact export digests from the failed native Product baseline/warm run c2f9b311.
// Docker Desktop reported the enclosing manifest-list digest as inspect.Id.
const nativeExport = {
  config:
    "sha256:9d5a264c8da565ec91e0a208b20000c572176a26aa03b231ae2bdab0186c65f8",
  manifest:
    "sha256:c762767e571ca7722a559c932b4119fb253ace4a734c7477e86ffff04a5ba8d2",
  baselineAttestation:
    "sha256:a30089d638a66a4c0da270da636ac03d6f2ee4d9829a298aec656fe5cbf692af",
  warmAttestation:
    "sha256:a6fbf42930ad4436c3c8eb279c3ecfe938ffa0b468c218eaf38cbe9def45bceb",
  baselineIndex:
    "sha256:77516857f5ee397608a4602dc3f8510d25b741e174fd23d416023c875051f87e",
  warmIndex:
    "sha256:5e5d47946ccf18611e3a3fd1f2c38980573470379c0503e41b11e012276f6bb9",
};
function nativeExportLog(warm) {
  return [
    `#83 exporting manifest ${nativeExport.manifest} 0.0s done`,
    `#83 exporting config ${nativeExport.config}`,
    `#83 exporting config ${nativeExport.config} 0.0s done`,
    `#83 exporting attestation manifest ${warm ? nativeExport.warmAttestation : nativeExport.baselineAttestation} 0.5s done`,
    `#83 exporting manifest list ${warm ? nativeExport.warmIndex : nativeExport.baselineIndex} 0.3s done`,
    "",
  ].join("\n");
}
function nativeImage(warm) {
  const exported = exportedImageIdentity(nativeExportLog(warm));
  return {
    tag: "nebula-packaging/fixture-product-service:baseline",
    id: exported.index,
    exported,
    dockerReportedBytes: 194461094,
    layers: [
      "sha256:1d69a5fd31932841d7825ef4780c06f008eea65aaa9f3110fe09d5832ed5c7d8",
    ],
    runtime: {
      user: "node",
      workdir: "/workspace/apps/product-service",
      command: ["node", "dist/main.js"],
    },
  };
}

test("warm comparison accepts the actual unchanged runnable export with a new provenance index, retaining exact IDs", () => {
  const baseline = nativeImage(false);
  const warm = nativeImage(true);
  assert.notEqual(baseline.id, warm.id);
  assert.deepEqual(verifyWarmImage(baseline, warm, "native-product"), {
    inspectedIdChanged: true,
    provenanceChanged: true,
  });
  assert.equal(baseline.id, nativeExport.baselineIndex);
  assert.equal(warm.id, nativeExport.warmIndex);
  assert.equal(warm.exported.config, nativeExport.config);
  assert.equal(warm.exported.manifest, nativeExport.manifest);
});

test("warm comparison still rejects changed config (including unprinted env), manifest, layers, runtime and size", () => {
  const mutations = [
    (image) => {
      image.exported.config = `sha256:${"a".repeat(64)}`;
    },
    (image) => {
      image.exported.manifest = `sha256:${"b".repeat(64)}`;
    },
    (image) => {
      image.layers[0] = `sha256:${"c".repeat(64)}`;
    },
    (image) => {
      image.runtime.user = "root";
    },
    (image) => {
      image.dockerReportedBytes += 1;
    },
  ];
  for (const mutate of mutations) {
    const warm = nativeImage(true);
    mutate(warm);
    assert.throws(
      () => verifyWarmImage(nativeImage(false), warm, "negative"),
      /runnable_image_changed/,
    );
  }
});

test("warm comparison rejects unexplained index drift and IDs not tied to the actual export", () => {
  const warm = nativeImage(true);
  warm.exported.attestations = nativeImage(false).exported.attestations;
  assert.throws(
    () => verifyWarmImage(nativeImage(false), warm, "negative"),
    /unexplained_index_change/,
  );
  const unrelated = nativeImage(true);
  unrelated.id = `sha256:${"d".repeat(64)}`;
  assert.throws(
    () => verifyWarmImage(nativeImage(false), unrelated, "negative"),
    /inspected_id_not_in_export/,
  );
  const inconsistent = nativeImage(false);
  inconsistent.exported.attestations = [nativeExport.warmAttestation];
  assert.throws(
    () => verifyWarmImage(nativeImage(false), inconsistent, "negative"),
    /inconsistent_attestation_export/,
  );
});

test("export parsing rejects incomplete, ambiguous and malformed evidence and supports an unchanged classic-store image", () => {
  const log = nativeExportLog(false);
  assert.throws(
    () => exportedImageIdentity(log.replace(/^.*exporting config.*\n/gm, "")),
    /config_missing_or_ambiguous/,
  );
  assert.throws(
    () =>
      exportedImageIdentity(
        `${log}#83 exporting config sha256:${"a".repeat(64)}\n`,
      ),
    /config_missing_or_ambiguous/,
  );
  assert.throws(
    () =>
      exportedImageIdentity(
        `${log}#84 exporting config ${nativeExport.config}\n`,
      ),
    /vertex_missing_or_ambiguous/,
  );
  assert.throws(
    () =>
      exportedImageIdentity(
        log.replaceAll(nativeExport.config, "sha256:malformed"),
      ),
    /config_missing_or_ambiguous/,
  );
  const image = nativeImage(false);
  image.exported = exportedImageIdentity(
    log.replace(/^.*exporting (attestation manifest|manifest list).*\n/gm, ""),
  );
  image.id = image.exported.config;
  assert.deepEqual(verifyWarmImage(image, image, "classic"), {
    inspectedIdChanged: false,
    provenanceChanged: false,
  });
});

test("probe preserves both the original runtime failure and owned-container cleanup failure", () => {
  const failure = new Error("native dependency missing");
  const cleanup = new Error("owned container removal failed");
  const calls = [];
  assert.throws(
    () =>
      probeImage(
        "nebula-packaging/fixture-product-service:candidate",
        "nebula-packaging-fixture",
        (args) => {
          calls.push(args);
          if (args[0] === "run") throw failure;
          throw cleanup;
        },
        () => ({ status: 0 }),
      ),
    (error) => {
      assert.deepEqual(error.errors, [failure, cleanup]);
      return true;
    },
  );
  assert.deepEqual(calls[1], ["rm", "--force", "nebula-packaging-fixture"]);
  assert.ok(calls[0].includes("--network=none"));
  assert.ok(calls[0].includes("--read-only"));
  assert.throws(() => probeImage("normal-image:latest", "product-service"));
});

test("probe retains successful runtime warnings and does not remove an absent auto-removed container", () => {
  const calls = [];
  const result = probeImage(
    "nebula-packaging/fixture-media-service:candidate",
    "nebula-packaging-fixture",
    (args, options) => {
      calls.push(args);
      options.onStderr("visible native warning");
      return '{"app":"@fixture/media"}\n';
    },
    () => ({ status: 1 }),
  );
  assert.equal(calls.length, 1);
  assert.deepEqual(result, {
    result: { app: "@fixture/media" },
    warnings: ["visible native warning"],
  });
});
