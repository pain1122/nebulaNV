import assert from "node:assert/strict";
import console from "node:console";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  createReadStream,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";

export const imageTag = "nebulanv-vendor-seaweedfs:4.51-gojose4.1.7";
export const sourceRevision = "153ab668c99731a6d29492bf6c61d0b4fa701101";
const moduleName = "github.com/go-jose/go-jose/v4";
const repository = fileURLToPath(new URL("../../", import.meta.url));
const evidenceFiles = [
  "image.tar.gz.sha256",
  "image.json",
  "scan.json",
  "binary.txt",
  "module.patch",
  "go-jose-tests.txt",
];

export function readSupplyManifest() {
  return JSON.parse(
    readFileSync(
      path.join(repository, "docker/seaweedfs/vendor-image.json"),
      "utf8",
    ),
  );
}

export function validateSupplyManifest(manifest) {
  assert.equal(manifest.schemaVersion, 1);
  assert.match(manifest.repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u);
  assert.match(manifest.releaseTag, /^[A-Za-z0-9][A-Za-z0-9_.-]+$/u);
  assert.match(manifest.archive, /^[A-Za-z0-9][A-Za-z0-9_.-]*\.tar\.gz$/u);
  assert.match(manifest.archiveSha256, /^[a-f0-9]{64}$/u);
  assert.match(manifest.workflowCommit, /^[a-f0-9]{40}$/u);
  assert.match(manifest.workflowRun, /^[0-9]+$/u);
  assert.equal(manifest.imageTag, imageTag);
  assert.equal(manifest.vendorRevision, sourceRevision);
  assert.equal(manifest.platform, "linux/amd64");
  assert.match(manifest.imageConfigId, /^sha256:[a-f0-9]{64}$/u);
  assert.ok(
    manifest.diffIds.length > 0 &&
      manifest.diffIds.every((id) => /^sha256:[a-f0-9]{64}$/u.test(id)),
    "vendor_supply_layers_invalid",
  );
  assert.deepEqual(
    Object.keys(manifest.evidenceSha256 ?? {}).sort(),
    [...evidenceFiles].sort(),
    "vendor_supply_evidence_inventory_invalid",
  );
  for (const digest of Object.values(manifest.evidenceSha256))
    assert.match(digest, /^[a-f0-9]{64}$/u);
  return manifest;
}

export async function verifyVendorArchive(
  directory,
  {
    manifest = readSupplyManifest(),
    extract = (archive, entry) =>
      execFileSync("tar", ["-xOf", archive, entry], {
        timeout: 60000,
        maxBuffer: 4 * 1024 * 1024,
      }),
  } = {},
) {
  validateSupplyManifest(manifest);
  const archive = path.resolve(directory, manifest.archive);
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(archive)) hash.update(chunk);
  assert.equal(
    hash.digest("hex"),
    manifest.archiveSha256,
    "vendor_archive_checksum_mismatch",
  );
  for (const name of evidenceFiles) {
    const evidenceHash = createHash("sha256");
    for await (const chunk of createReadStream(path.join(directory, name)))
      evidenceHash.update(chunk);
    assert.equal(
      evidenceHash.digest("hex"),
      manifest.evidenceSha256[name],
      `vendor_evidence_checksum_mismatch_${name.replaceAll(".", "_")}`,
    );
  }
  const entries = JSON.parse(
    extract(archive, "manifest.json").toString("utf8"),
  );
  assert.equal(entries.length, 1, "vendor_archive_requires_one_image");
  assert.deepEqual(
    entries[0].RepoTags,
    [manifest.imageTag],
    "vendor_archive_tag_mismatch",
  );
  const configFile = entries[0].Config;
  assert.match(
    configFile,
    /^(?:blobs\/sha256\/[a-f0-9]{64}|[a-f0-9]{64}\.json)$/u,
    "vendor_archive_config_path_invalid",
  );
  const configBytes = extract(archive, configFile);
  assert.equal(
    `sha256:${createHash("sha256").update(configBytes).digest("hex")}`,
    manifest.imageConfigId,
    "vendor_archive_config_digest_mismatch",
  );
  const configuration = JSON.parse(configBytes.toString("utf8"));
  assert.equal(configuration.os, "linux");
  assert.equal(configuration.architecture, "amd64");
  assert.deepEqual(
    configuration.rootfs?.diff_ids,
    manifest.diffIds,
    "vendor_archive_layers_mismatch",
  );
  const read = (name) => readFileSync(path.join(directory, name), "utf8");
  const recorded = JSON.parse(read("image.json"));
  assert.equal(
    recorded.workflowCommit,
    manifest.workflowCommit,
    "vendor_workflow_commit_mismatch",
  );
  assert.equal(
    recorded.workflowRun,
    manifest.workflowRun,
    "vendor_workflow_run_mismatch",
  );
  assert.equal(
    recorded.imageId,
    manifest.imageConfigId,
    "vendor_recorded_image_mismatch",
  );
  assert.deepEqual(recorded.diffIds, manifest.diffIds);
  const report = JSON.parse(read("scan.json"));
  assert.equal(
    report.Metadata?.ImageID,
    manifest.imageConfigId,
    "vendor_scan_config_mismatch",
  );
  const evidence = validateVendorEvidence({
    report,
    identity: {
      id: manifest.imageConfigId,
      os: configuration.os,
      architecture: configuration.architecture,
      diffIds: configuration.rootfs.diff_ids,
      labels: configuration.config?.Labels ?? {},
    },
    binary: read("binary.txt"),
    patch: read("module.patch"),
    workflowCommit: manifest.workflowCommit,
  });
  return { archive, manifest, configuration, evidence };
}

export function validateLoadedVendorImage(loaded, supply) {
  const { manifest, configuration } = supply;
  assert.match(loaded.Id, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(loaded.Os, "linux");
  assert.equal(loaded.Architecture, "amd64");
  assert.deepEqual(
    loaded.RootFS?.Layers,
    manifest.diffIds,
    "vendor_loaded_layers_mismatch",
  );
  // Imported containerd store/index IDs can differ from the archive config ID.
  // Compare the actual runtime configuration in memory; never retain Config.Env.
  // Docker materializes these two omitted fields as their empty defaults.
  // Preserve every other field and all nonempty values for exact comparison.
  const importConfig = (config) => {
    assert.ok(config && typeof config === "object" && !Array.isArray(config));
    const normalized = { ...config };
    if (normalized.User == null) normalized.User = "";
    if (normalized.OnBuild == null) delete normalized.OnBuild;
    return normalized;
  };
  assert.deepEqual(
    importConfig(loaded.Config),
    importConfig(configuration.config),
    "vendor_loaded_configuration_mismatch",
  );
  return {
    schemaVersion: 1,
    imageTag: manifest.imageTag,
    canonicalConfigId: manifest.imageConfigId,
    loadedStoreId: loaded.Id,
    diffIds: manifest.diffIds,
    archiveSha256: manifest.archiveSha256,
    workflowCommit: manifest.workflowCommit,
    workflowRun: manifest.workflowRun,
    vendorRevision: manifest.vendorRevision,
    platform: manifest.platform,
  };
}

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
  try {
    if (
      ["verify-archive", "load-archive", "verify-loaded"].includes(
        process.argv[2],
      )
    ) {
      assert.equal(process.argv.length, 4, "vendor_archive_directory_required");
      const supply = await verifyVendorArchive(path.resolve(process.argv[3]));
      if (["load-archive", "verify-loaded"].includes(process.argv[2])) {
        if (process.argv[2] === "load-archive")
          execFileSync("docker", ["image", "load", "--input", supply.archive], {
            stdio: "inherit",
            timeout: 600000,
          });
        const loaded = JSON.parse(
          execFileSync(
            "docker",
            ["image", "inspect", supply.manifest.imageTag],
            { encoding: "utf8", timeout: 15000, maxBuffer: 4 * 1024 * 1024 },
          ),
        )[0];
        const receipt = validateLoadedVendorImage(loaded, supply);
        const output = path.join(
          repository,
          ".ci-evidence/seaweed-vendor.json",
        );
        mkdirSync(path.dirname(output), { recursive: true });
        writeFileSync(output, JSON.stringify(receipt, null, 2) + "\n");
        console.log(
          "[seaweed-vendor] checksum-config-layers-scan-and-loaded-image=ok",
        );
      } else
        console.log(
          "[seaweed-vendor] archive-checksum-config-layers-and-scan=ok",
        );
    } else {
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
        report: JSON.parse(
          readFileSync(path.join(directory, "scan.json"), "utf8"),
        ),
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
  } catch (error) {
    const label = String(error.message ?? "").split("\n")[0];
    console.error(
      JSON.stringify({
        error: "seaweed_vendor_verification_failed",
        name: error.name,
        check: /^[A-Za-z0-9_:-]{1,140}$/u.test(label)
          ? label
          : "vendor_verification_error",
      }),
    );
    process.exitCode = 1;
  }
}
