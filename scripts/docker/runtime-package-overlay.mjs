import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const manifest = (root) =>
  JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
function inside(root, target) {
  const relative = path.relative(root, target);
  assert.ok(
    relative &&
      relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative),
    "runtime_overlay_path_outside_root",
  );
}
function noLinks(root) {
  assert.equal(
    lstatSync(root).isSymbolicLink(),
    false,
    "runtime_overlay_artifact_symlink",
  );
  if (lstatSync(root).isDirectory())
    for (const entry of readdirSync(root)) noLinks(path.join(root, entry));
}

// Metadata-only deploy creates the portable dependency links. Overlay only built
// first-party files; copying the old workspace node_modules would break those links.
export function overlayRuntimePackages(sourceRoot, deployRoot, expectedNames) {
  assert.ok(
    Array.isArray(expectedNames) && expectedNames.length > 0,
    "runtime_overlay_names_required",
  );
  assert.equal(
    new Set(expectedNames).size,
    expectedNames.length,
    "runtime_overlay_duplicate_name",
  );
  for (const name of expectedNames)
    assert.match(name, /^@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/);
  const sources = realpathSync(sourceRoot);
  const deployment = realpathSync(deployRoot);
  const modules = path.join(deployment, "node_modules");
  const store = path.join(modules, ".pnpm");
  const packages = new Map();
  for (const entry of readdirSync(sources, { withFileTypes: true })) {
    assert.ok(
      entry.isDirectory(),
      "runtime_overlay_artifact_directory_required",
    );
    const directory = path.join(sources, entry.name);
    noLinks(directory);
    const metadata = manifest(directory);
    assert.ok(!packages.has(metadata.name), "runtime_overlay_duplicate_source");
    packages.set(metadata.name, { directory, metadata });
  }
  const plan = [];
  for (const name of expectedNames) {
    const source = packages.get(name);
    assert.ok(source, `runtime_overlay_source_missing_${name}`);
    assert.equal(typeof source.metadata.version, "string");
    assert.ok(
      existsSync(path.join(source.directory, "dist")),
      `runtime_overlay_dist_missing_${name}`,
    );
    const entries = readdirSync(source.directory);
    assert.ok(
      entries.every(
        (entry) =>
          entry === "package.json" ||
          entry === "dist" ||
          entry.endsWith(".proto"),
      ),
      "runtime_overlay_unexpected_artifact",
    );
    const candidates = [path.join(modules, ...name.split("/"))];
    if (existsSync(store))
      for (const slot of readdirSync(store, { withFileTypes: true })) {
        if (slot.isDirectory())
          candidates.push(
            path.join(store, slot.name, "node_modules", ...name.split("/")),
          );
      }
    const targets = [
      ...new Set(
        candidates
          .filter(existsSync)
          .map((candidate) => realpathSync(candidate)),
      ),
    ];
    assert.ok(targets.length > 0, `runtime_overlay_slot_missing_${name}`);
    for (const target of targets) {
      inside(deployment, target);
      const metadataFile = path.join(target, "package.json");
      assert.equal(
        lstatSync(metadataFile).isSymbolicLink(),
        false,
        "runtime_overlay_manifest_symlink",
      );
      const targetMetadata = manifest(target);
      assert.equal(
        targetMetadata.name,
        name,
        "runtime_overlay_slot_name_mismatch",
      );
      assert.equal(
        targetMetadata.version,
        source.metadata.version,
        "runtime_overlay_slot_version_mismatch",
      );
      const old = readdirSync(target).filter(
        (entry) => entry === "dist" || entry.endsWith(".proto"),
      );
      for (const entry of old) {
        const file = path.join(target, entry);
        inside(deployment, file);
        assert.equal(
          lstatSync(file).isSymbolicLink(),
          false,
          "runtime_overlay_existing_artifact_symlink",
        );
      }
      plan.push({ source: source.directory, target, old, entries });
    }
  }
  // Validate every source and slot before mutating any deployment artifact.
  for (const item of plan) {
    for (const entry of item.old)
      rmSync(path.join(item.target, entry), {
        recursive: entry === "dist",
        force: true,
      });
    for (const entry of item.entries)
      cpSync(path.join(item.source, entry), path.join(item.target, entry), {
        recursive: true,
      });
  }
  return { workspaces: [...expectedNames], copies: plan.length };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [source, target, ...names] = process.argv.slice(2);
  assert.ok(source && target, "runtime_overlay_paths_required");
  console.log(JSON.stringify(overlayRuntimePackages(source, target, names)));
}
