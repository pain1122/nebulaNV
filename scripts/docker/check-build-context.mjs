import {
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { repositoryRoot } from "../backend.mjs";

export function localCopyInputs(dockerfile) {
  const sources = new Set();
  for (const line of dockerfile.replace(/\\\r?\n/g, " ").split(/\r?\n/)) {
    const copy = line.match(/^\s*COPY\s+(.+)$/i)?.[1];
    if (!copy || /(?:^|\s)--from(?:=|\s)/.test(copy)) continue;
    let fields;
    if (copy.startsWith("[")) fields = JSON.parse(copy);
    else {
      if (/['"$]|^--/.test(copy))
        throw new Error("context_probe_unsupported_local_copy");
      fields = copy.trim().split(/\s+/);
    }
    if (
      !Array.isArray(fields) ||
      fields.length < 2 ||
      fields.some((field) => typeof field !== "string")
    ) {
      throw new Error("context_probe_invalid_local_copy");
    }
    for (const source of fields.slice(0, -1)) sources.add(source);
  }
  if (sources.size === 0) throw new Error("context_probe_no_local_inputs");
  return [...sources];
}

export function contextProbeDockerfile(inputs) {
  return [
    "FROM scratch AS context-check",
    `COPY ${JSON.stringify([...inputs, "/context/"])}`,
    "",
  ].join("\n");
}

export function checkBuildContext(root = repositoryRoot) {
  const inputs = localCopyInputs(
    readFileSync(path.join(root, "docker/backend.Dockerfile"), "utf8"),
  );
  const temporary = mkdtempSync(path.join(tmpdir(), "nebula-context-probe-"));
  let primaryError;
  try {
    const dockerfile = path.join(temporary, "Dockerfile");
    writeFileSync(dockerfile, contextProbeDockerfile(inputs));
    const result = spawnSync(
      "docker",
      [
        "buildx",
        "build",
        "--file",
        dockerfile,
        "--output=type=cacheonly",
        "--quiet",
        root,
      ],
      { stdio: "inherit" },
    );
    if (result.error) throw result.error;
    if (result.status !== 0)
      throw new Error(
        `context_probe_failed_exit_${result.status ?? "unknown"}`,
      );
  } catch (error) {
    primaryError = error;
  }
  try {
    const target = realpathSync(temporary);
    if (
      path.dirname(target) !== realpathSync(tmpdir()) ||
      !path.basename(target).startsWith("nebula-context-probe-")
    ) {
      throw new Error("context_probe_cleanup_path_invalid");
    }
    rmSync(target, { recursive: true, force: true });
  } catch (cleanupError) {
    if (primaryError)
      throw new AggregateError(
        [primaryError, cleanupError],
        "context_probe_and_cleanup_failed",
      );
    throw cleanupError;
  }
  if (primaryError) throw primaryError;
  console.log(
    `[build-context] ${inputs.length} local COPY inputs verified by BuildKit; no install/compiler RUNs or image export`,
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  checkBuildContext();
}
