import assert from "node:assert/strict";
import console from "node:console";
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { backendServices, repositoryRoot } from "../backend.mjs";
import { selectedGraph } from "./backend-build-graph.mjs";
import { prepareSnapshot } from "./benchmark-build-graph.mjs";
import { checkBuildContext } from "./check-build-context.mjs";

const require = createRequire(import.meta.url);
const eslintRequire = createRequire(require.resolve("eslint/package.json"));
const yaml = eslintRequire("js-yaml");
export const pilots = ["product-service", "gateway", "media-service"];
const helper = "scripts/docker/runtime-package-overlay.mjs";
const read = (root, file) => readFileSync(path.join(root, file), "utf8");
const json = (file, value) =>
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

export function packagingInputs(root) {
  const compose = yaml.load(read(root, "docker-compose.yml"));
  return backendServices.map((service) => {
    const target = compose.services[service.dockerService]?.build?.target;
    assert.match(target ?? "", /^[a-z][a-z0-9-]*-runtime$/);
    return {
      ...service,
      target,
      shared: selectedGraph(root, service.name)
        .workspaces.filter((entry) =>
          entry.directory.startsWith(`packages${path.sep}`),
        )
        .map((entry) => entry.manifest.name),
    };
  });
}

// Copy the accepted file verbatim; the new targets exist only in the owned context.
// A changed baseline layout must be reviewed, rather than silently mis-transformed.
export function candidateDockerfile(original, services) {
  const match = original.match(
    /^FROM node:[^\r\n]+ AS runtime-base\r?\n([\s\S]*?)^COPY --link --from=prod-deps \/app\/node_modules \.\/node_modules/m,
  );
  assert.ok(match, "packaging_baseline_os_boundary_missing");
  const os = match[0].slice(0, match[0].lastIndexOf("COPY --link"));
  const stages = [];
  for (const name of pilots) {
    const service = services.find((entry) => entry.name === name);
    assert.ok(
      service && service.shared.length,
      `packaging_missing_pilot_${name}`,
    );
    const marker = `FROM runtime-base AS ${service.target}`;
    assert.equal(
      original.split(marker).length,
      2,
      "packaging_runtime_target_not_unique",
    );
    const body = original.split(marker)[1].split(/\r?\nFROM /)[0];
    const app = `/app/${service.directory.replaceAll(path.sep, "/")}`;
    for (const file of ["package.json", "node_modules"])
      assert.equal(
        body.split(`--from=prod-deps ${app}/${file}`).length,
        2,
        "packaging_runtime_dependency_boundary_changed",
      );
    assert.match(body, /USER|WORKDIR/);
    assert.match(body, /CMD \["node", "dist\/main.js"\]/);
    stages.push(
      [
        `FROM prod-deps AS packaging-deps-${name}`,
        "RUN --mount=type=cache,id=nebula-pnpm-store,target=/root/.local/share/pnpm/store,sharing=locked \\",
        `    pnpm --filter=${service.packageName} --prod --ignore-scripts --frozen-lockfile deploy /runtime-deployment`,
        `FROM packaging-deps-${name} AS packaging-output-${name}`,
        `COPY ${helper} /runtime-package-overlay.mjs`,
        "RUN --mount=from=shared-runtime-artifacts,source=/packages,target=/built-packages,ro \\",
        `    node /runtime-package-overlay.mjs /built-packages /runtime-deployment ${service.shared.join(" ")}`,
        os.replace(" AS runtime-base", ` AS packaging-${name}`),
        "USER node",
        body
          .replace(
            `--from=prod-deps ${app}/package.json`,
            `--from=packaging-deps-${name} /runtime-deployment/package.json`,
          )
          .replace(
            `--from=prod-deps ${app}/node_modules`,
            `--from=packaging-output-${name} /runtime-deployment/node_modules`,
          ),
      ].join("\n"),
    );
  }
  return `${original}\n# Owned runtime-packaging experiment; accepted targets above are unchanged.\n${stages.join("\n")}\n`;
}

export function comparisonPlan(services, runId) {
  assert.match(runId, /^[a-z0-9-]+$/);
  assert.equal(
    services.length,
    11,
    "packaging_inventory_changed_review_required",
  );
  const steps = [];
  for (const [layout, warm, names] of [
    ["baseline", false, services.map((s) => s.name)],
    ["baseline", true, pilots],
    ["candidate", false, pilots],
    ["candidate", true, pilots],
  ])
    for (const name of names) {
      const service = services.find((s) => s.name === name);
      assert.ok(service, `packaging_unknown_service_${name}`);
      steps.push({
        name: `${name}-${layout}${warm ? "-warm" : ""}`,
        service: name,
        layout,
        warm,
        target: layout === "baseline" ? service.target : `packaging-${name}`,
        tag: `nebula-packaging/${runId}-${name}:${layout}`,
      });
    }
  return steps;
}

export function buildArguments(step, context) {
  return [
    "buildx",
    "build",
    "--file",
    path.join(context, "docker/backend.Dockerfile"),
    "--target",
    step.target,
    "--build-arg",
    "BACKEND_BUILD_SERVICE=all",
    "--build-arg",
    "BACKEND_BUILD_PIPELINE=graph",
    "--build-arg",
    "BACKEND_BUILD_CONCURRENCY=1",
    "--load",
    "--progress=plain",
    "--tag",
    step.tag,
    context,
  ];
}

// Runs inside an unprivileged image with no network, env files or mounted project.
export async function runtimeProbe() {
  const assert = require("node:assert/strict");
  const fs = require("node:fs");
  const path = require("node:path");
  const { createHash } = require("node:crypto");
  const { createRequire } = require("node:module");
  assert.notEqual(process.getuid(), 0, "packaging_probe_root_user");
  const cwd = process.cwd();
  const app = require(path.join(cwd, "package.json"));
  assert.deepEqual(fs.readdirSync("/workspace/apps"), [path.basename(cwd)]);
  for (const dependency of Object.keys(app.dependencies ?? {}))
    require.resolve(dependency);
  // Hash the actual selected artifacts, not dependency layout or regenerated lock files.
  const files = {};
  function collect(root, label) {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      const file = path.join(root, entry.name);
      const key = `${label}/${entry.name}`;
      assert.equal(
        entry.isSymbolicLink(),
        false,
        "packaging_probe_artifact_symlink",
      );
      if (entry.isDirectory()) collect(file, key);
      else
        files[key] = createHash("sha256")
          .update(fs.readFileSync(file))
          .digest("hex");
    }
  }
  collect(path.join(cwd, "dist"), "app/dist");
  await import(
    require("node:url").pathToFileURL(
      path.join(cwd, "dist/config/env.validation.js"),
    ).href
  );
  const visited = new Set();
  function visit(name, resolver) {
    if (visited.has(name)) return;
    visited.add(name);
    resolver(name);
    const metadata = resolver.resolve(`${name}/package.json`);
    const directory = fs.realpathSync(path.dirname(metadata));
    assert.ok(
      directory.startsWith("/workspace/"),
      "packaging_probe_nonportable_workspace",
    );
    collect(path.join(directory, "dist"), `${name}/dist`);
    for (const file of fs
      .readdirSync(directory)
      .filter((f) => f.endsWith(".proto"))) {
      assert.equal(
        resolver.resolve(`${name}/${file}`),
        path.join(directory, file),
      );
      files[`${name}/${file}`] = createHash("sha256")
        .update(fs.readFileSync(path.join(directory, file)))
        .digest("hex");
    }
    const manifest = JSON.parse(fs.readFileSync(metadata, "utf8"));
    const nested = createRequire(metadata);
    for (const dep of Object.keys(manifest.dependencies ?? {})) {
      nested.resolve(dep);
      if (dep.startsWith("@nebula/") || dep.startsWith("@packages/"))
        visit(dep, nested);
    }
  }
  for (const name of Object.keys(app.dependencies ?? {}).filter(
    (name) => name.startsWith("@nebula/") || name.startsWith("@packages/"),
  ))
    visit(name, require);
  if (app.dependencies?.["@prisma/adapter-pg"]) {
    const { PrismaClient } = require(
      path.join(cwd, "dist/generated/prisma/client.js"),
    );
    const { PrismaPg } = require("@prisma/adapter-pg");
    assert.equal(typeof PrismaClient, "function");
    assert.equal(typeof PrismaPg, "function");
    collect(path.join(cwd, "prisma"), "app/prisma");
  } else if (fs.existsSync(path.join(cwd, "prisma/generated"))) {
    require(path.join(cwd, "prisma/generated"));
    // Custom clients also contain the requested musl engine, which cannot load on Debian.
    const engines = fs
      .readdirSync(path.join(cwd, "prisma/generated"))
      .filter(
        (name) => name === "libquery_engine-debian-openssl-3.0.x.so.node",
      );
    assert.ok(engines.length, "packaging_probe_prisma_engine_missing");
    for (const engine of engines)
      require(path.join(cwd, "prisma/generated", engine));
    collect(path.join(cwd, "prisma"), "app/prisma");
  }
  if (app.name === "@nebula/media-service") {
    const sharp = require("sharp");
    const font = path.join(cwd, "assets/fonts/Vazirmatn-Regular.ttf");
    assert.ok(fs.statSync(font).size > 0);
    assert.ok(fs.statSync(path.join(cwd, "assets/fonts/OFL.txt")).size > 0);
    await sharp({
      create: { width: 1, height: 1, channels: 3, background: "#ffffff" },
    })
      .png()
      .toBuffer();
    const text = await sharp({
      text: { text: "Demo", font: "Vazirmatn", fontfile: font, rgba: true },
    })
      .png()
      .toBuffer();
    assert.ok(text.length > 0);
    collect(path.join(cwd, "assets"), "app/assets");
  }
  console.log(
    JSON.stringify({ app: app.name, workspaces: [...visited].sort(), files }),
  );
}

function docker(args, { onStderr, ...options } = {}) {
  const result = spawnSync("docker", args, {
    encoding: "utf8",
    maxBuffer: 12 * 1024 * 1024,
    ...options,
  });
  if (result.error) throw result.error;
  assert.equal(
    result.status,
    0,
    `packaging_docker_failed_${args[0]}\n${result.stderr ?? ""}`,
  );
  if (result.stderr?.trim()) {
    process.stderr.write(result.stderr);
    onStderr?.(result.stderr);
  }
  return result.stdout;
}

export function probeImage(
  tag,
  container,
  execute = docker,
  inspect = spawnSync,
) {
  assert.match(tag, /^nebula-packaging\/[a-z0-9-]+:(baseline|candidate)$/);
  assert.match(container, /^nebula-packaging-[a-z0-9-]+$/);
  let primary;
  let result;
  const warnings = [];
  try {
    const source = `(${runtimeProbe.toString()})().catch(error => { console.error(error); process.exit(1); });`;
    result = JSON.parse(
      execute(
        [
          "run",
          "--rm",
          "--name",
          container,
          "--pull=never",
          "--network=none",
          "--read-only",
          "--tmpfs",
          "/tmp:rw,size=16m",
          "--entrypoint",
          "node",
          "-i",
          tag,
        ],
        {
          input: source,
          timeout: 120_000,
          onStderr: (text) => warnings.push(text),
        },
      ).trim(),
    );
  } catch (error) {
    primary = error;
  }
  let cleanup;
  try {
    const exists = inspect("docker", ["container", "inspect", container], {
      stdio: "ignore",
    });
    if (exists.error) throw exists.error;
    if (exists.status === 0) execute(["rm", "--force", container]);
  } catch (error) {
    cleanup = error;
  }
  if (primary || cleanup)
    throw new AggregateError(
      [primary, cleanup].filter(Boolean),
      "packaging_probe_or_cleanup_failed",
    );
  return { result, warnings };
}

export function exportedImageIdentity(log) {
  const values = new Map(
    ["config", "manifest", "manifest list", "attestation manifest"].map(
      (kind) => [kind, new Set()],
    ),
  );
  const vertices = new Set();
  for (const match of log.matchAll(
    /^#(\d+)(?: \d+(?:\.\d+)?)? exporting (manifest list|attestation manifest|manifest|config) (sha256:[a-f0-9]{64})(?:[ \r]|$)/gm,
  )) {
    vertices.add(match[1]);
    values.get(match[2]).add(match[3]);
  }
  assert.equal(
    vertices.size,
    1,
    "packaging_export_vertex_missing_or_ambiguous",
  );
  for (const kind of ["config", "manifest"])
    assert.equal(
      values.get(kind).size,
      1,
      `packaging_export_${kind}_missing_or_ambiguous`,
    );
  assert.ok(
    values.get("manifest list").size <= 1,
    "packaging_export_index_ambiguous",
  );
  const result = {
    config: [...values.get("config")][0],
    manifest: [...values.get("manifest")][0],
    index: [...values.get("manifest list")][0] ?? null,
    attestations: [...values.get("attestation manifest")].sort(),
  };
  assert.ok(
    !result.attestations.length || result.index,
    "packaging_export_attestation_index_missing",
  );
  return result;
}

function assertExportBinding(image) {
  const exported = image.exported;
  assert.ok(
    exported &&
      [exported.config, exported.manifest, exported.index].includes(image.id),
    "packaging_inspected_id_not_in_export",
  );
}

export function verifyWarmImage(previous, current, name) {
  assertExportBinding(previous);
  assertExportBinding(current);
  // The config digest binds the complete image config without exposing Env.
  // The runnable manifest binds the config and compressed layer descriptors.
  // Build provenance belongs to a separate manifest in the enclosing index.
  const runnable = (image) => ({
    tag: image.tag,
    config: image.exported.config,
    manifest: image.exported.manifest,
    layers: image.layers,
    runtime: image.runtime,
    dockerReportedBytes: image.dockerReportedBytes,
  });
  assert.deepEqual(
    runnable(current),
    runnable(previous),
    `${name}_runnable_image_changed_without_input_change`,
  );
  assert.equal(
    Boolean(current.exported.index),
    Boolean(previous.exported.index),
    `${name}_export_layout_changed`,
  );
  if (previous.exported.index !== current.exported.index) {
    assert.ok(
      previous.exported.attestations.length &&
        current.exported.attestations.length,
      `${name}_unexplained_index_change`,
    );
    assert.notDeepEqual(
      previous.exported.attestations,
      current.exported.attestations,
      `${name}_unexplained_index_change`,
    );
  } else
    assert.deepEqual(
      previous.exported.attestations,
      current.exported.attestations,
      `${name}_inconsistent_attestation_export`,
    );
  if (previous.id !== current.id) {
    assert.equal(
      previous.id,
      previous.exported.index,
      `${name}_non_index_id_changed`,
    );
    assert.equal(
      current.id,
      current.exported.index,
      `${name}_non_index_id_changed`,
    );
  }
  return {
    inspectedIdChanged: previous.id !== current.id,
    provenanceChanged: previous.exported.index !== current.exported.index,
  };
}

export function imageEvidence(tag, exported) {
  const [item] = JSON.parse(docker(["image", "inspect", tag]));
  // Never persist Config.Env; inspect only the following allowlisted properties.
  const image = {
    tag,
    id: item.Id,
    exported,
    dockerReportedBytes: item.Size,
    layers: item.RootFS.Layers,
    runtime: {
      user: item.Config.User,
      workdir: item.Config.WorkingDir,
      command: item.Config.Cmd,
      entrypoint: item.Config.Entrypoint,
      ports: item.Config.ExposedPorts,
      health: item.Config.Healthcheck,
    },
  };
  assertExportBinding(image);
  return image;
}

export function layerEvidence(images) {
  const counts = new Map();
  for (const image of images)
    for (const layer of new Set(image.layers))
      counts.set(layer, (counts.get(layer) ?? 0) + 1);
  return {
    images: images.length,
    summedDockerReportedBytes: images.reduce(
      (sum, image) => sum + image.dockerReportedBytes,
      0,
    ),
    distinctLayerIds: counts.size,
    sharedLayerIds: [...counts.values()].filter((count) => count > 1).length,
  };
}

async function archiveBytes(tags) {
  const started = Date.now();
  return await new Promise((resolve, reject) => {
    const child = spawn("docker", ["image", "save", ...tags], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let bytes = 0;
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      bytes += chunk.length;
    });
    child.stderr.on("data", (chunk) => {
      stderr = (stderr + chunk.toString()).slice(-8000);
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve({
            bytes,
            seconds: (Date.now() - started) / 1000,
            warnings: stderr,
          })
        : reject(new Error(`packaging_archive_failed_${code}_${stderr}`)),
    );
  });
}

export async function runComparison({
  prepareOnly = false,
  root = repositoryRoot,
} = {}) {
  const runId = randomUUID();
  const services = packagingInputs(root);
  const steps = comparisonPlan(services, runId);
  const output = path.join(root, ".ci-evidence/runtime-packaging", runId);
  const contexts = path.join(output, "contexts");
  mkdirSync(contexts, { recursive: true });
  const context = mkdtempSync(path.join(contexts, "context-"));
  const evidence = {
    runId,
    status: "pending",
    scope: "eleven baseline; three candidate pilots; no adoption",
    steps: [],
    images: {},
    probes: {},
    probeWarnings: {},
    archives: {},
  };
  const ownedTags = new Set();
  let primary;
  try {
    prepareSnapshot(root, context);
    cpSync(path.join(root, helper), path.join(context, helper));
    const original = read(root, "docker/backend.Dockerfile");
    writeFileSync(
      path.join(context, "docker/backend.Dockerfile"),
      candidateDockerfile(original, services),
    );
    evidence.baselineDockerfileSha256 = createHash("sha256")
      .update(original)
      .digest("hex");
    const inputs = {};
    function hashInputs(directory) {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const file = path.join(directory, entry.name);
        assert.equal(
          entry.isSymbolicLink(),
          false,
          "packaging_snapshot_symlink",
        );
        if (entry.isDirectory()) hashInputs(file);
        else
          inputs[path.relative(context, file).replaceAll(path.sep, "/")] =
            createHash("sha256").update(readFileSync(file)).digest("hex");
      }
    }
    hashInputs(context);
    json(path.join(output, "inputs.json"), inputs);
    evidence.inputFiles = Object.keys(inputs).length;
    const commit = spawnSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(commit.status, 0, "packaging_source_commit_unavailable");
    evidence.sourceCommit = commit.stdout.trim();
    evidence.note =
      "Input hashes include uncommitted authored files; first solves are cache-eligible, not claimed cold builds. No registry push or application startup.";
    evidence.plan = steps;
    json(path.join(output, "evidence.json"), evidence);
    checkBuildContext(context);
    console.log(
      `[packaging] context passed; ${steps.length} sequential exports; run=${runId}`,
    );
    if (!prepareOnly) {
      for (const step of steps) {
        console.log(`[packaging] start ${step.name}`);
        const log = path.join(output, `${step.name}.log`);
        const fd = openSync(log, "w");
        const started = Date.now();
        try {
          docker(buildArguments(step, context), { stdio: ["ignore", fd, fd] });
        } catch (error) {
          evidence.steps.push({
            ...step,
            seconds: (Date.now() - started) / 1000,
            status: "failed",
            log: path.basename(log),
          });
          throw new Error(`${step.name} failed; inspect ${log}`, {
            cause: error,
          });
        } finally {
          closeSync(fd);
        }
        ownedTags.add(step.tag);
        const seconds = (Date.now() - started) / 1000;
        const image = imageEvidence(
          step.tag,
          exportedImageIdentity(readFileSync(log, "utf8")),
        );
        const recorded = {
          ...step,
          seconds,
          imageId: image.id,
          exported: image.exported,
          log: path.basename(log),
        };
        evidence.steps.push(recorded);
        // Preserve export timing/identities even if the comparison itself fails.
        if (step.warm)
          recorded.warmComparison = verifyWarmImage(
            evidence.images[step.tag],
            image,
            step.name,
          );
        evidence.images[step.tag] = image;
        json(path.join(output, "evidence.json"), evidence);
        console.log(
          `[packaging] ${step.name}=ok elapsed=${seconds.toFixed(1)}s`,
        );
      }
      for (const name of pilots) {
        for (const layout of ["baseline", "candidate"]) {
          const step = steps.find(
            (s) => s.service === name && s.layout === layout,
          );
          const container = `nebula-packaging-${runId}-${name}-${layout}`;
          const { result, warnings } = probeImage(step.tag, container);
          evidence.probes[`${name}-${layout}`] = result;
          evidence.probeWarnings[`${name}-${layout}`] = warnings;
        }
        assert.deepEqual(
          evidence.probes[`${name}-candidate`],
          evidence.probes[`${name}-baseline`],
          `${name}_packaged_artifact_mismatch`,
        );
        const baseline = steps.find(
          (s) => s.service === name && s.layout === "baseline",
        );
        const candidate = steps.find(
          (s) => s.service === name && s.layout === "candidate",
        );
        assert.deepEqual(
          evidence.images[candidate.tag].runtime,
          evidence.images[baseline.tag].runtime,
          `${name}_runtime_metadata_mismatch`,
        );
        console.log(`[packaging] ${name} offline/native/artifact parity=ok`);
      }
      const baseline = steps
        .filter((step) => step.layout === "baseline" && !step.warm)
        .map((step) => step.tag);
      const pilotBaseline = steps
        .filter(
          (step) =>
            step.layout === "baseline" &&
            !step.warm &&
            pilots.includes(step.service),
        )
        .map((step) => step.tag);
      const candidate = steps
        .filter((step) => step.layout === "candidate" && !step.warm)
        .map((step) => step.tag);
      const mixed = [
        ...baseline.filter((tag) => !pilotBaseline.includes(tag)),
        ...candidate,
      ];
      evidence.fleets = {};
      for (const [name, tags] of Object.entries({
        pilotBaseline,
        pilotCandidate: candidate,
        baselineFleet: baseline,
        mixedFleet: mixed,
      })) {
        console.log(`[packaging] stream ${name} archive; no tar retained`);
        evidence.archives[name] = await archiveBytes(tags);
        evidence.fleets[name] = layerEvidence(
          tags.map((tag) => evidence.images[tag]),
        );
      }
    }
    evidence.status = prepareOnly
      ? "preparation-passed-native-pending"
      : "comparison-passed-review-required";
  } catch (error) {
    primary = error;
    evidence.status = "failed";
    evidence.error = error.stack;
  }
  const cleanupErrors = [];
  for (const tag of ownedTags) {
    try {
      docker(["image", "rm", tag]);
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  try {
    const actual = realpathSync(context);
    assert.equal(path.dirname(actual), realpathSync(contexts));
    assert.ok(path.basename(actual).startsWith("context-"));
    rmSync(actual, { recursive: true, force: true });
  } catch (error) {
    cleanupErrors.push(error);
  }
  evidence.cleanupErrors = cleanupErrors.map((error) => error.message);
  json(path.join(output, "evidence.json"), evidence);
  console.log(
    `[packaging] evidence: ${path.relative(root, path.join(output, "evidence.json"))}`,
  );
  if (primary || cleanupErrors.length)
    throw new AggregateError(
      [primary, ...cleanupErrors].filter(Boolean),
      "runtime_packaging_comparison_or_cleanup_failed",
    );
  console.log(
    `[packaging] ${evidence.status}; accepted Dockerfile, tags and services unchanged`,
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  assert.ok(
    args.length <= 1 &&
      args.every((arg) => ["--plan", "--prepare-only"].includes(arg)),
    "unknown packaging option",
  );
  if (args.includes("--plan"))
    console.log(
      JSON.stringify(
        comparisonPlan(packagingInputs(repositoryRoot), "plan"),
        null,
        2,
      ),
    );
  else await runComparison({ prepareOnly: args.includes("--prepare-only") });
}
