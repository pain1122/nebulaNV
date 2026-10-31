import assert from "node:assert/strict";
import test from "node:test";
import {
  imageTag,
  sourceRevision,
  validateVendorEvidence,
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
