import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const imageTag = "nebulanv-vendor-seaweedfs:4.51-gojose4.1.7";
export const sourceRevision = "153ab668c99731a6d29492bf6c61d0b4fa701101";
const moduleName = "github.com/go-jose/go-jose/v4";

export function validateVendorEvidence({
  report,
  identity,
  binary,
  patch,
  workflowCommit,
}) {
  assert.match(workflowCommit, /^[a-f0-9]{40}$/u, "workflow_commit_required");
  assert.match(identity.id, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(identity.os, "linux");
  assert.equal(identity.architecture, "amd64");
  assert.equal(identity.labels["io.nebulanv.vendor.go-jose"], "v4.1.7");
  assert.equal(
    identity.labels["org.opencontainers.image.revision"],
    sourceRevision,
  );
  assert.ok(identity.diffIds.length > 0, "image_layers_required");
  assert.ok(
    [identity.id, imageTag].includes(report.ArtifactName),
    "scan_artifact_mismatch",
  );
  assert.equal(report.ArtifactType, "container_image");
  assert.deepEqual(
    report.Metadata?.DiffIDs,
    identity.diffIds,
    "scan_image_layers_mismatch",
  );
  assert.equal(report.Metadata?.OS?.Family, "alpine");
  assert.ok(
    report.Results?.some(
      (result) => result.Type === "alpine" && result.Packages?.length > 0,
    ),
    "os_inventory_missing",
  );
  const go = report.Results?.find(
    (result) =>
      result.Type === "gobinary" && result.Target.endsWith("usr/bin/weed"),
  );
  assert.ok(go?.Packages?.length > 0, "weed_go_inventory_missing");
  assert.ok(
    go.Packages.some(
      (pkg) => pkg.Name === moduleName && pkg.Version === "v4.1.7",
    ),
    "compiled_go_jose_version_mismatch",
  );
  assert.ok(
    go.Packages.some(
      (pkg) => pkg.Name === "stdlib" && pkg.Version === "v1.26.10",
    ),
    "compiled_go_toolchain_mismatch",
  );
  const blockers = report.Results.flatMap(
    (result) => result.Vulnerabilities ?? [],
  ).filter((finding) => ["HIGH", "CRITICAL"].includes(finding.Severity));
  assert.equal(blockers.length, 0, "vendor_image_vulnerability_gate_failed");
  assert.match(binary, /go1\.26\.10/u);
  assert.match(binary, /dep\s+github\.com\/go-jose\/go-jose\/v4\s+v4\.1\.7\s/u);
  assert.ok(binary.includes(`vcs.revision=${sourceRevision}`));
  const changes = patch
    .split(/\r?\n/u)
    .filter((line) => /^[+-]/u.test(line) && !/^(---|\+\+\+)/u.test(line));
  assert.ok(changes.length > 0, "module_patch_missing");
  assert.ok(
    changes.every((line) => line.includes(moduleName)),
    "unrelated_module_patch",
  );
  return {
    schemaVersion: 1,
    workflowCommit,
    imageTag,
    imageId: identity.id,
    diffIds: identity.diffIds,
    platform: "linux/amd64",
    vendorRevision: sourceRevision,
    goJose: "v4.1.7",
    goVersion: "go1.26.10",
    scannedAt: report.CreatedAt,
    scanImageId: report.Metadata.ImageID,
    highCriticalFindings: 0,
  };
}

function run(command, args) {
  return execFileSync(command, args, {
    encoding: "utf8",
    timeout: 30_000,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  assert.equal(
    process.argv.length,
    3,
    "usage: seaweed-vendor-evidence.mjs directory",
  );
  const directory = path.resolve(process.argv[2]);
  const inspect = (field) =>
    JSON.parse(
      run("docker", [
        "image",
        "inspect",
        imageTag,
        "--format",
        `{{json ${field}}}`,
      ]),
    );
  const identity = {
    id: inspect(".Id"),
    os: inspect(".Os"),
    architecture: inspect(".Architecture"),
    diffIds: inspect(".RootFS.Layers"),
    labels: inspect(".Config.Labels"),
  };
  const fromImage = (name) =>
    run("docker", [
      "run",
      "--rm",
      "--network",
      "none",
      "--entrypoint",
      "cat",
      identity.id,
      `/usr/share/nebula-vendor/seaweedfs/${name}`,
    ]);
  const binary = fromImage("binary.txt");
  const patch = fromImage("module.patch");
  const manifest = validateVendorEvidence({
    report: JSON.parse(readFileSync(path.join(directory, "scan.json"), "utf8")),
    identity,
    binary,
    patch,
    workflowCommit: process.env.GITHUB_SHA,
  });
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    path.join(directory, "image.json"),
    `${JSON.stringify({ ...manifest, workflowRun: process.env.GITHUB_RUN_ID, scanner: run("trivy", ["--version"]) }, null, 2)}\n`,
  );
  writeFileSync(path.join(directory, "binary.txt"), `${binary}\n`);
  writeFileSync(path.join(directory, "module.patch"), `${patch}\n`);
  writeFileSync(
    path.join(directory, "go-jose-tests.txt"),
    `${fromImage("go-jose-tests.txt")}\n`,
  );
}
