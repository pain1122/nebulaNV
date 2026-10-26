import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { repositoryRoot } from "../backend.mjs";
import { localCopyInputs } from "./check-build-context.mjs";

export const proofCases = [
  ...["product", "order"].map((owner) => ({
    name: `${owner}-baseline`,
    owner,
    kind: "baseline",
  })),
  ...["product", "order"].map((owner) => ({
    name: `${owner}-source`,
    owner,
    kind: "source",
    file: `apps/${owner}-service/src/health.controller.ts`,
  })),
  ...["product", "order"].map((owner) => ({
    name: `${owner}-unrelated`,
    owner,
    kind: "unrelated",
    file: "apps/media-service/src/health.controller.ts",
  })),
  ...["product", "order"].map((owner) => ({
    name: `${owner}-schema`,
    owner,
    kind: "schema",
    file: `apps/${owner}-service/prisma/schema.prisma`,
  })),
  ...["product", "order"].map((owner) => ({
    name: `${owner}-shared`,
    owner,
    kind: "shared",
    file: "packages/protos/product.proto",
  })),
];

export function modifiedProofInput(original, proof, runId) {
  assert.ok(runId && proof.name, "missing proof identity");
  // Cache mounts survive previous proof runs. Each changed case must represent
  // a genuinely new input, including when both owners edit the same shared file.
  return Buffer.concat([
    original,
    Buffer.from(
      `\n// nebula-native-build-isolation-proof ${runId} ${proof.name}\n`,
    ),
  ]);
}

function childOf(root, relative) {
  const result = path.resolve(root, relative);
  const relation = path.relative(path.resolve(root), result);
  assert.ok(
    relation &&
      relation !== ".." &&
      !relation.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relation),
    "proof path outside owned root",
  );
  return result;
}

export function prepareSnapshot(root, destination) {
  const inputs = [
    ...new Set([
      ...localCopyInputs(
        readFileSync(path.join(root, "docker/backend.Dockerfile"), "utf8"),
      ),
      "docker/backend.Dockerfile",
      ".dockerignore",
    ]),
  ];
  const keep = (source) => {
    const relative = path.relative(root, source).split(path.sep).join("/");
    const parts = relative.split("/");
    const name = parts.at(-1);
    if (
      parts.some((part) =>
        [
          "node_modules",
          "dist",
          ".turbo",
          ".git",
          "test",
          "tests",
          "__tests__",
        ].includes(part),
      )
    )
      return false;
    if (
      name === ".gitignore" ||
      name === ".env" ||
      name.startsWith(".env.") ||
      name.endsWith(".tsbuildinfo")
    )
      return false;
    if (
      relative.includes("/prisma/generated/") ||
      relative.endsWith("/prisma/generated") ||
      relative.startsWith("packages/protos/generated")
    )
      return false;
    assert.equal(
      lstatSync(source).isSymbolicLink(),
      false,
      `proof snapshot refuses source symlink: ${relative}`,
    );
    return true;
  };
  for (const input of inputs) {
    assert.ok(
      !/[*?]/.test(input),
      "proof snapshot requires literal COPY inputs",
    );
    const source = childOf(root, input);
    assert.ok(existsSync(source), `missing COPY input ${input}`);
    if (
      inputs.some(
        (parent) =>
          parent !== input &&
          input.startsWith(`${parent}/`) &&
          lstatSync(childOf(root, parent)).isDirectory(),
      )
    )
      continue;
    const target = childOf(destination, input);
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(source, target, {
      recursive: true,
      preserveTimestamps: true,
      filter: keep,
    });
  }
  for (const proof of proofCases) {
    if (proof.file)
      assert.ok(
        existsSync(childOf(destination, proof.file)),
        `missing proof source ${proof.file}`,
      );
  }
  return inputs.length;
}

export function inspectProofLog(log, proof) {
  const runs = new Map();
  for (const match of log.matchAll(/^#(\d+) \[([^\]]+)\] RUN[^\r\n]*/gm)) {
    runs.set(match[1], match[2].split(" ")[0]);
  }
  const stages = {};
  for (const [id, stage] of runs) {
    const status = log.match(
      new RegExp(`^#${id} (CACHED|DONE [^\\r\\n]+)`, "m"),
    )?.[1];
    assert.ok(status, `missing RUN result ${stage}`);
    (stages[stage] ??= []).push(status);
  }
  const misses = {};
  for (const match of log.matchAll(
    /(@(?:nebula|packages)\/[\w-]+):build: cache miss/g,
  )) {
    misses[match[1]] = (misses[match[1]] ?? 0) + 1;
  }
  const permitted = new Set([
    `@nebula/${proof.owner}-service`,
    "@nebula/protos",
    "@nebula/grpc-auth",
    "@nebula/clients",
    "@packages/config",
  ]);
  for (const name of Object.keys(misses))
    assert.ok(
      permitted.has(name),
      `${proof.name}: unexpected compiled workspace ${name}`,
    );
  if (proof.kind !== "baseline") {
    for (const stage of ["graph-fetch", "graph-deps"])
      assert.deepEqual(
        stages[stage],
        ["CACHED"],
        `${proof.name}: ${stage} must stay cached`,
      );
    assert.ok(
      stages["graph-build"]?.length === 1,
      "missing graph build result",
    );
    if (proof.kind === "unrelated") {
      assert.deepEqual(
        stages["graph-prisma"],
        ["CACHED"],
        `${proof.name}: unrelated generation`,
      );
      assert.deepEqual(
        stages["graph-build"],
        ["CACHED"],
        `${proof.name}: unrelated compilation`,
      );
    } else {
      assert.ok(
        stages["graph-build"][0].startsWith("DONE"),
        `${proof.name}: changed compilation must execute`,
      );
      assert.equal(
        misses[`@nebula/${proof.owner}-service`],
        1,
        `${proof.name}: owner must compile once`,
      );
      if (proof.kind === "schema")
        assert.ok(
          stages["graph-prisma"]?.[0].startsWith("DONE"),
          `${proof.name}: owner schema must generate`,
        );
      else
        assert.deepEqual(
          stages["graph-prisma"],
          ["CACHED"],
          `${proof.name}: generation must stay cached`,
        );
      for (const name of [
        "@nebula/protos",
        "@nebula/grpc-auth",
        "@nebula/clients",
        "@packages/config",
      ]) {
        assert.ok(
          (misses[name] ?? 0) <= (proof.kind === "shared" ? 1 : 0),
          `${proof.name}: unexpected repeated shared compile ${name}`,
        );
      }
      if (proof.kind === "shared") {
        for (const name of [
          "@nebula/protos",
          "@nebula/grpc-auth",
          "@nebula/clients",
        ])
          assert.equal(
            misses[name],
            1,
            `${proof.name}: shared change must propagate to ${name}`,
          );
      }
    }
  }
  return { stages, misses };
}

export function runNativeProof({
  prepareOnly = false,
  root = repositoryRoot,
} = {}) {
  const runId = randomUUID();
  const evidence = childOf(root, ".ci-evidence/build-graph-native");
  const contexts = childOf(evidence, "contexts");
  mkdirSync(contexts, { recursive: true });
  const context = mkdtempSync(path.join(contexts, "context-"));
  const results = [];
  let primaryError;
  try {
    const inputCount = prepareSnapshot(root, context);
    console.log(
      `[graph-native] prepared owned snapshot: ${inputCount} inputs; ${proofCases.length} sequential graph-build solves; no image exports; run=${runId}`,
    );
    if (!prepareOnly) {
      for (const proof of proofCases) {
        const file = proof.file ? childOf(context, proof.file) : null;
        const original = file ? readFileSync(file) : null;
        let result;
        const started = performance.now();
        console.log(`[graph-native] start ${proof.name}`);
        try {
          if (file)
            writeFileSync(file, modifiedProofInput(original, proof, runId));
          result = spawnSync(
            "docker",
            [
              "buildx",
              "build",
              "--file",
              childOf(context, "docker/backend.Dockerfile"),
              "--target",
              "graph-build",
              "--build-arg",
              "BACKEND_BUILD_PIPELINE=graph",
              "--build-arg",
              `BACKEND_BUILD_SERVICE=${proof.owner}-service`,
              "--build-arg",
              "BACKEND_BUILD_CONCURRENCY=1",
              "--output=type=cacheonly",
              "--progress=plain",
              context,
            ],
            { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
          );
        } finally {
          if (file) writeFileSync(file, original);
        }
        const elapsed = Number(
          ((performance.now() - started) / 1000).toFixed(1),
        );
        const log = (result.stdout ?? "") + (result.stderr ?? "");
        writeFileSync(childOf(evidence, `${proof.name}.log`), log);
        if (result.error) throw result.error;
        assert.equal(
          result.status,
          0,
          `${proof.name} build failed; inspect .ci-evidence/build-graph-native/${proof.name}.log`,
        );
        const checks = inspectProofLog(log, proof);
        results.push({ ...proof, elapsed, ...checks });
        writeFileSync(
          childOf(evidence, "summary.json"),
          JSON.stringify({ runId, status: "in-progress", results }, null, 2),
        );
        console.log(`[graph-native] ${proof.name}=ok elapsed=${elapsed}s`);
      }
      writeFileSync(
        childOf(evidence, "summary.json"),
        JSON.stringify({ runId, status: "passed", results }, null, 2),
      );
    }
  } catch (error) {
    primaryError = error;
    try {
      writeFileSync(
        childOf(evidence, "summary.json"),
        JSON.stringify(
          { runId, status: "failed", error: String(error), results },
          null,
          2,
        ),
      );
    } catch (evidenceError) {
      primaryError = new AggregateError(
        [error, evidenceError],
        "native_proof_and_evidence_failed",
      );
    }
  }
  try {
    const target = realpathSync(context);
    assert.equal(
      path.dirname(target),
      realpathSync(contexts),
      "proof cleanup outside owned contexts",
    );
    assert.ok(path.basename(target).startsWith("context-"));
    rmSync(target, { recursive: true, force: true });
  } catch (cleanupError) {
    if (primaryError)
      throw new AggregateError(
        [primaryError, cleanupError],
        "native_proof_and_cleanup_failed",
      );
    throw cleanupError;
  }
  if (primaryError) throw primaryError;
  console.log(
    prepareOnly
      ? "[graph-native] preparation passed; no Docker commands ran"
      : "[graph-native] all native isolation cases passed; working source and image tags unchanged",
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  assert.ok(
    process.argv.slice(2).every((arg) => arg === "--prepare-only"),
    "unknown native proof option",
  );
  runNativeProof({ prepareOnly: process.argv.includes("--prepare-only") });
}
