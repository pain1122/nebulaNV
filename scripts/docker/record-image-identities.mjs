import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { backendServices, releaseImages, repositoryRoot } from "../backend.mjs";

export function collectImageIdentities({
  commit = process.env.GITHUB_SHA ?? null,
  inspect = (reference) =>
    JSON.parse(
      execFileSync("docker", ["image", "inspect", reference], {
        encoding: "utf8",
        timeout: 15_000,
        maxBuffer: 4 * 1024 * 1024,
      }),
    )[0],
} = {}) {
  assert.ok(
    commit === null || /^[a-f0-9]{40}$/.test(commit),
    "invalid commit ID",
  );
  const references = releaseImages();
  const images = backendServices.map((service, index) => {
    const reference = references[index];
    const metadata = inspect(reference);
    assert.match(metadata?.Id ?? "", /^sha256:[a-f0-9]{64}$/, reference);
    const repoDigests = metadata.RepoDigests ?? [];
    assert.ok(
      Array.isArray(repoDigests) &&
        repoDigests.every((digest) =>
          /^[^\s@]+@sha256:[a-f0-9]{64}$/.test(digest),
        ),
      `invalid repository digests: ${reference}`,
    );
    // Deliberately exclude Config, environment, labels and full inspect output.
    return { name: service.name, reference, id: metadata.Id, repoDigests };
  });
  return { schemaVersion: 1, commit, images };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const evidence = collectImageIdentities();
  const output = path.join(
    repositoryRoot,
    ".ci-evidence/backend-tested-images.json",
  );
  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(
    `[image-evidence] recorded ${evidence.images.length} backend identities`,
  );
}
