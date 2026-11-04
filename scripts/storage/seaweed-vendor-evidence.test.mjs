import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  imageTag,
  sourceRevision,
  validateVendorEvidence,
  validateSupplyManifest,
  verifyVendorArchive,
  validateLoadedVendorImage,
} from "./seaweed-vendor-evidence.mjs";

function fixture() {
  const id = `sha256:${"a".repeat(64)}`;
  const diffIds = [`sha256:${"b".repeat(64)}`];
  return {
    workflowCommit: "c".repeat(40),
    identity: {
      id,
      os: "linux",
      architecture: "amd64",
      diffIds,
      labels: {
        "io.nebulanv.vendor.go-jose": "v4.1.7",
        "org.opencontainers.image.revision": sourceRevision,
      },
    },
    binary: `/out/weed: go1.26.10\n dep github.com/go-jose/go-jose/v4 v4.1.7 h1:proof\n build vcs.revision=${sourceRevision}`,
    patch:
      "--- a/go.mod\n+++ b/go.mod\n-github.com/go-jose/go-jose/v4 v4.1.5\n+github.com/go-jose/go-jose/v4 v4.1.7\n",
    report: {
      ArtifactName: imageTag,
      ArtifactType: "container_image",
      Metadata: { ImageID: id, DiffIDs: diffIds, OS: { Family: "alpine" } },
      Results: [
        { Type: "alpine", Packages: [{ Name: "musl" }] },
        {
          Type: "gobinary",
          Target: "usr/bin/weed",
          Packages: [
            { Name: "github.com/go-jose/go-jose/v4", Version: "v4.1.7" },
            { Name: "stdlib", Version: "v1.26.10" },
          ],
        },
      ],
    },
  };
}

function supplyFixture(t) {
  const directory = mkdtempSync(path.join(tmpdir(), "nebula-vendor-archive-"));
  t.after(() => {
    assert.ok(
      path.resolve(directory).startsWith(path.resolve(tmpdir()) + path.sep),
    );
    assert.ok(path.basename(directory).startsWith("nebula-vendor-archive-"));
    rmSync(directory, { recursive: true, force: true });
  });
  const input = fixture();
  const configuration = {
    os: "linux",
    architecture: "amd64",
    rootfs: { diff_ids: input.identity.diffIds },
    config: { Labels: input.identity.labels, Env: ["VENDOR_FIXTURE=present"] },
  };
  const configBytes = Buffer.from(JSON.stringify(configuration));
  const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
  const configId = `sha256:${sha(configBytes)}`;
  const archiveBytes = Buffer.from("owned test archive; tar reads injected");
  const manifest = {
    schemaVersion: 1,
    repository: "pain1122/nebulaNV",
    releaseTag: "vendor-seaweedfs-fixture",
    archive: "image.tar.gz",
    archiveSha256: sha(archiveBytes),
    workflowRun: "41203305981",
    workflowCommit: input.workflowCommit,
    imageTag,
    imageConfigId: configId,
    diffIds: input.identity.diffIds,
    vendorRevision: sourceRevision,
    platform: "linux/amd64",
  };
  input.report.ArtifactName = configId;
  input.report.Metadata.ImageID = configId;
  const recorded = {
    workflowCommit: input.workflowCommit,
    workflowRun: manifest.workflowRun,
    imageId: configId,
    diffIds: manifest.diffIds,
  };
  for (const [file, contents] of Object.entries({
    "image.tar.gz": archiveBytes,
    "image.json": JSON.stringify(recorded),
    "scan.json": JSON.stringify(input.report),
    "binary.txt": input.binary,
    "module.patch": input.patch,
    "image.tar.gz.sha256": `${manifest.archiveSha256}  image.tar.gz\n`,
    "go-jose-tests.txt": "owned fixture: passing module tests\n",
  }))
    writeFileSync(path.join(directory, file), contents);
  manifest.evidenceSha256 = Object.fromEntries(
    [
      "image.tar.gz.sha256",
      "image.json",
      "scan.json",
      "binary.txt",
      "module.patch",
      "go-jose-tests.txt",
    ].map((name) => [name, sha(readFileSync(path.join(directory, name)))]),
  );
  const configFile = `${configId.slice(7)}.json`;
  const entries = [{ RepoTags: [imageTag], Config: configFile }];
  return {
    directory,
    manifest,
    configuration,
    configBytes,
    configFile,
    entries,
    refreshEvidence(name) {
      manifest.evidenceSha256[name] = sha(
        readFileSync(path.join(directory, name)),
      );
    },
    extract(_archive, entry) {
      return entry === "manifest.json"
        ? Buffer.from(JSON.stringify(entries))
        : configBytes;
    },
  };
}

test("vendor archive verifies pinned bytes/config/layers/scan before loading", async (t) => {
  const x = supplyFixture(t);
  validateSupplyManifest(x.manifest);
  const supply = await verifyVendorArchive(x.directory, x);
  assert.deepEqual(supply.configuration, x.configuration);
  assert.equal(supply.evidence.highCriticalFindings, 0);
  const loaded = {
    Id: `sha256:${"e".repeat(64)}`,
    Os: "linux",
    Architecture: "amd64",
    RootFS: { Layers: x.manifest.diffIds },
    Config: x.configuration.config,
  };
  const receipt = validateLoadedVendorImage(loaded, supply);
  assert.notEqual(receipt.loadedStoreId, receipt.canonicalConfigId);
  assert.doesNotMatch(JSON.stringify(receipt), /"Config"|"Env"|VENDOR_FIXTURE/);
  assert.throws(
    () =>
      validateLoadedVendorImage(
        { ...loaded, Config: { ...loaded.Config, Env: ["DIFFERENT=value"] } },
        supply,
      ),
    /vendor_loaded_configuration_mismatch/u,
  );
  assert.throws(
    () =>
      validateLoadedVendorImage({ ...loaded, RootFS: { Layers: [] } }, supply),
    /vendor_loaded_layers_mismatch/u,
  );
});

test("vendor archive rejects modified bytes before reading tar contents", async (t) => {
  const x = supplyFixture(t);
  writeFileSync(path.join(x.directory, "image.tar.gz"), "changed");
  await assert.rejects(
    verifyVendorArchive(x.directory, {
      manifest: x.manifest,
      extract: () =>
        assert.fail("checksum mismatch must stop before tar reads"),
    }),
    /vendor_archive_checksum_mismatch/u,
  );
});

test("loaded vendor accepts only the observed empty Docker import defaults", async (t) => {
  const x = supplyFixture(t);
  const supply = await verifyVendorArchive(x.directory, x);
  const loaded = {
    Id: `sha256:${"e".repeat(64)}`,
    Os: "linux",
    Architecture: "amd64",
    RootFS: { Layers: x.manifest.diffIds },
    Config: { ...x.configuration.config, User: "", OnBuild: null },
  };
  const original = globalThis.structuredClone(loaded.Config);
  const receipt = validateLoadedVendorImage(loaded, supply);
  assert.deepEqual(loaded.Config, original, "comparison must not mutate input");
  assert.equal(Object.hasOwn(supply.configuration.config, "User"), false);
  assert.doesNotMatch(JSON.stringify(receipt), /"Config"|"Env"|VENDOR_FIXTURE/);
  for (const user of [null, undefined, ""])
    for (const onBuild of [null, undefined])
      validateLoadedVendorImage(
        {
          ...loaded,
          Config: { ...loaded.Config, User: user, OnBuild: onBuild },
        },
        supply,
      );

  for (const changed of [
    { User: "root" },
    { User: "1000" },
    { User: false },
    { OnBuild: ["RUN unexpected-command"] },
    { OnBuild: [] },
    { Env: null },
    { Env: [] },
    { Env: ["VENDOR_FIXTURE=changed"] },
    { Entrypoint: ["unexpected-command"] },
    { Cmd: ["unexpected-argument"] },
    { WorkingDir: "/unexpected" },
    { Labels: { ...loaded.Config.Labels, extra: "changed" } },
    { ExposedPorts: { "9999/tcp": {} } },
    { Volumes: { "/unexpected": {} } },
    { UnknownField: null },
  ])
    assert.throws(
      () =>
        validateLoadedVendorImage(
          { ...loaded, Config: { ...loaded.Config, ...changed } },
          supply,
        ),
      /vendor_loaded_configuration_mismatch/u,
      `must reject changed ${Object.keys(changed).join(",")}`,
    );

  const explicit = {
    ...supply,
    configuration: {
      ...supply.configuration,
      config: { ...loaded.Config, User: "1000", OnBuild: ["RUN expected"] },
    },
  };
  validateLoadedVendorImage(
    { ...loaded, Config: explicit.configuration.config },
    explicit,
  );
  assert.throws(
    () => validateLoadedVendorImage(loaded, explicit),
    /vendor_loaded_configuration_mismatch/u,
    "nonempty archive values must never be normalized away",
  );
});

test("vendor archive rejects mixed images, wrong config, unsafe paths and incorrect provenance", async (t) => {
  const x = supplyFixture(t);
  x.entries.push(x.entries[0]);
  await assert.rejects(
    verifyVendorArchive(x.directory, x),
    /vendor_archive_requires_one_image/u,
  );
  x.entries.pop();
  x.entries[0].RepoTags = ["other:image"];
  await assert.rejects(
    verifyVendorArchive(x.directory, x),
    /vendor_archive_tag_mismatch/u,
  );
  x.entries[0].RepoTags = [imageTag];
  x.entries[0].Config = "../outside.json";
  await assert.rejects(
    verifyVendorArchive(x.directory, x),
    /vendor_archive_config_path_invalid/u,
  );
  x.entries[0].Config = x.configFile;
  await assert.rejects(
    verifyVendorArchive(x.directory, {
      ...x,
      extract: (_archive, entry) =>
        entry === "manifest.json"
          ? Buffer.from(JSON.stringify(x.entries))
          : Buffer.from("{}"),
    }),
    /vendor_archive_config_digest_mismatch/u,
  );
  const recordedFile = path.join(x.directory, "image.json");
  const recorded = JSON.parse(readFileSync(recordedFile, "utf8"));
  writeFileSync(
    recordedFile,
    JSON.stringify({ ...recorded, workflowRun: "different" }),
  );
  await assert.rejects(
    verifyVendorArchive(x.directory, x),
    /vendor_evidence_checksum_mismatch_image_json/u,
  );
  // A trusted checksum still must not bypass independent provenance validation.
  x.refreshEvidence("image.json");
  await assert.rejects(
    verifyVendorArchive(x.directory, x),
    /vendor_workflow_run_mismatch/u,
  );
  writeFileSync(recordedFile, JSON.stringify(recorded));
  x.refreshEvidence("image.json");
  const scanFile = path.join(x.directory, "scan.json");
  const report = JSON.parse(readFileSync(scanFile, "utf8"));
  report.Metadata.ImageID = `sha256:${"f".repeat(64)}`;
  writeFileSync(scanFile, JSON.stringify(report));
  x.refreshEvidence("scan.json");
  await assert.rejects(
    verifyVendorArchive(x.directory, x),
    /vendor_scan_config_mismatch/u,
  );
});

test("accepts a covered clean scan tied to the exact vendor layers and patch", () => {
  const result = validateVendorEvidence(fixture());
  assert.equal(result.goJose, "v4.1.7");
  assert.equal(result.highCriticalFindings, 0);
});

for (const [name, mutate, error] of [
  [
    "old compiled module",
    (x) => {
      x.report.Results[1].Packages[0].Version = "v4.1.5";
    },
    /compiled_go_jose_version_mismatch/u,
  ],
  [
    "missing Go coverage",
    (x) => {
      x.report.Results.pop();
    },
    /weed_go_inventory_missing/u,
  ],
  [
    "missing OS coverage",
    (x) => {
      x.report.Results.shift();
    },
    /os_inventory_missing/u,
  ],
  [
    "different scanned image",
    (x) => {
      x.report.Metadata.DiffIDs = ["other"];
    },
    /scan_image_layers_mismatch/u,
  ],
  [
    "unrelated artifact",
    (x) => {
      x.report.ArtifactName = "other-image";
    },
    /scan_artifact_mismatch/u,
  ],
  [
    "critical OS vulnerability",
    (x) => {
      x.report.Results[0].Vulnerabilities = [{ Severity: "CRITICAL" }];
    },
    /vendor_image_vulnerability_gate_failed/u,
  ],
  [
    "unfixed high Go vulnerability",
    (x) => {
      x.report.Results[1].Vulnerabilities = [
        { Severity: "HIGH", FixedVersion: "" },
      ];
    },
    /vendor_image_vulnerability_gate_failed/u,
  ],
  [
    "different source",
    (x) => {
      x.identity.labels["org.opencontainers.image.revision"] = "d".repeat(40);
    },
    /strictly equal/u,
  ],
  [
    "unrelated dependency edit",
    (x) => {
      x.patch += "+github.com/other/module v2.0.0\n";
    },
    /unrelated_module_patch/u,
  ],
]) {
  test(`rejects ${name}`, () => {
    const input = fixture();
    mutate(input);
    assert.throws(() => validateVendorEvidence(input), error);
  });
}
