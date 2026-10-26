import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { releaseImages, repositoryRoot } from "../backend.mjs";

export function releaseArchiveImages({
  prefix = "nebulanv-main",
  tag = "latest",
  envFile,
  env = process.env,
  execute = (args, options) => execFileSync("docker", args, options),
} = {}) {
  const backend = releaseImages(prefix, tag);
  const args = ["compose", "--file", "docker-compose.yml"];
  if (envFile) args.push("--env-file", path.resolve(repositoryRoot, envFile));
  args.push("--profile", "*", "config", "--images");
  const output = execute(args, {
    cwd: repositoryRoot,
    env: { ...env, NEBULA_IMAGE_PREFIX: prefix, NEBULA_IMAGE_TAG: tag },
    encoding: "utf8",
    timeout: 15_000,
    maxBuffer: 1024 * 1024,
  });
  const images = [
    ...new Set(output.trim().split(/\r?\n/).filter(Boolean)),
  ].sort();
  assert.ok(
    images.every((image) => /^[a-zA-Z0-9][^\s]*$/.test(image)),
    "invalid Compose image reference",
  );
  for (const image of backend)
    assert.ok(
      images.includes(image),
      `release archive missing backend image: ${image}`,
    );
  return images;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  assert.ok(process.argv.length <= 5, "unexpected release inventory argument");
  const [prefix, tag, envFile] = process.argv.slice(2);
  console.log(JSON.stringify(releaseArchiveImages({ prefix, tag, envFile })));
}
