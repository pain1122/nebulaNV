import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadBackendServices } from "../backend.mjs";

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const writeJson = (file, data) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
};

function ensureBuildOutputIgnores(root) {
  const file = path.join(root, ".gitignore");
  if (existsSync(file)) return;
  // Docker excludes the repository ignore file. Turbo's root workspace
  // dependencies must not hash their own generated outputs or task logs.
  // Keep all authored source/manifest/schema inputs in the dependency hashes.
  writeFileSync(
    file,
    [
      "# Build-only output exclusions; authored inputs remain hashed.",
      "**/node_modules/",
      "**/dist/",
      "**/.turbo/",
      "*.tsbuildinfo",
      "/packages/protos/generated/",
      "**/prisma/generated/",
      "/.runtime-packages/",
      "",
    ].join("\n"),
  );
}

export function selectedGraph(root, selection) {
  const inventory = loadBackendServices(root);
  const names =
    selection === "all" ? inventory.map((s) => s.name) : selection.split(",");
  if (names.length === 0 || new Set(names).size !== names.length) {
    throw new Error("build_graph_invalid_selection");
  }
  const services = names.map((name) => {
    const service = inventory.find((entry) => entry.name === name);
    if (!service) throw new Error(`build_graph_unknown_service_${name}`);
    return service;
  });
  const workspaces = new Map();
  for (const group of ["apps", "packages"]) {
    if (!existsSync(path.join(root, group))) continue;
    for (const entry of readdirSync(path.join(root, group), {
      withFileTypes: true,
    })) {
      const directory = path.join(group, entry.name);
      const file = path.join(root, directory, "package.json");
      if (entry.isDirectory() && existsSync(file)) {
        const manifest = readJson(file);
        workspaces.set(manifest.name, { directory, manifest });
      }
    }
  }
  const ordered = [];
  const visited = new Set();
  const visiting = new Set();
  function visit(name) {
    if (visited.has(name)) return;
    if (visiting.has(name)) throw new Error(`build_graph_cycle_${name}`);
    const workspace = workspaces.get(name);
    if (!workspace) throw new Error(`build_graph_missing_workspace_${name}`);
    if (
      workspace.directory.startsWith(`apps${path.sep}`) &&
      !services.some((service) => service.packageName === name)
    ) {
      throw new Error(`build_graph_sibling_application_dependency_${name}`);
    }
    visiting.add(name);
    const dependencies = {
      ...workspace.manifest.dependencies,
      ...workspace.manifest.devDependencies,
      ...workspace.manifest.optionalDependencies,
      ...workspace.manifest.peerDependencies,
    };
    for (const [dependency, version] of Object.entries(dependencies).sort()) {
      if (version.startsWith("workspace:")) visit(dependency);
    }
    visiting.delete(name);
    visited.add(name);
    ordered.push(workspace);
  }
  for (const service of services) visit(service.packageName);
  return { services, workspaces: ordered };
}

function execute(command, args, { cwd }) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `build_graph_${command}_failed_exit_${result.status ?? "unknown"}`,
    );
  }
}

// Turbo owns pruning/lockfile generation; the helper partitions its output.
export function prepareGraph(root, selection, output, run = execute) {
  const graph = selectedGraph(root, selection);
  if (existsSync(output)) throw new Error("build_graph_output_already_exists");
  run(
    "turbo",
    [
      "prune",
      ...graph.services.map((s) => s.packageName),
      "--docker",
      `--out-dir=${output}`,
    ],
    { cwd: root },
  );
  const full = path.join(output, "full");
  const json = path.join(output, "json");
  // Turbo 2.5.8 drops pnpm's injectWorkspacePackages setting while serializing
  // its pruned lockfile. Preserve the input policy verbatim, never invent
  // package resolutions/snapshots. Frozen pnpm validation remains mandatory.
  const settingsPattern = /^settings:\r?\n(?:[ \t][^\r\n]*(?:\r?\n|$))+/m;
  const settings = readFileSync(
    path.join(root, "pnpm-lock.yaml"),
    "utf8",
  ).match(settingsPattern)?.[0];
  const lockfile = path.join(output, "pnpm-lock.yaml");
  const pruned = readFileSync(lockfile, "utf8");
  if (!settings || !settingsPattern.test(pruned))
    throw new Error("build_graph_lock_settings_missing");
  writeFileSync(
    lockfile,
    pruned.replace(settingsPattern, () => settings),
  );
  for (const file of [
    "tsconfig.base.json",
    ".npmrc",
    "pnpm-workspace.yaml",
    ".gitignore",
  ]) {
    if (existsSync(path.join(root, file)))
      cpSync(path.join(root, file), path.join(full, file));
  }
  cpSync(
    path.join(output, "pnpm-lock.yaml"),
    path.join(json, "pnpm-lock.yaml"),
  );
  cpSync(
    path.join(output, "pnpm-workspace.yaml"),
    path.join(json, "pnpm-workspace.yaml"),
  );
  cpSync(path.join(root, ".npmrc"), path.join(json, ".npmrc"));

  const rootManifest = readJson(path.join(root, "package.json"));
  writeJson(path.join(output, "fetch", "package.json"), {
    private: true,
    packageManager: rootManifest.packageManager,
    pnpm: rootManifest.pnpm,
  });
  for (const file of ["pnpm-lock.yaml", "pnpm-workspace.yaml"]) {
    cpSync(path.join(output, file), path.join(output, "fetch", file));
  }
  cpSync(path.join(root, ".npmrc"), path.join(output, "fetch", ".npmrc"));
  mkdirSync(path.join(output, "schemas"), { recursive: true });
  const schemaServices = graph.services.filter(
    (service) => service.database !== null,
  );
  writeJson(
    path.join(output, "schemas", ".backend-prisma.json"),
    schemaServices.map((s) => s.packageName),
  );
  for (const service of graph.services) {
    const file = path.join(json, service.directory, "package.json");
    const manifest = readJson(file);
    if (manifest.scripts?.postinstall) {
      if (manifest.scripts.postinstall !== "pnpm run prisma:gen") {
        throw new Error(
          `build_graph_unrecognized_workspace_postinstall_${service.name}`,
        );
      }
      delete manifest.scripts.postinstall;
      writeJson(file, manifest);
    }
    if (service.database !== null) {
      const schema = path.join(service.directory, "prisma", "schema.prisma");
      mkdirSync(path.dirname(path.join(output, "schemas", schema)), {
        recursive: true,
      });
      cpSync(path.join(root, schema), path.join(output, "schemas", schema));
    }
  }
  ensureBuildOutputIgnores(full);
  return graph;
}

export function generateSelectedPrisma(root, run = execute) {
  const owners = readJson(path.join(root, ".backend-prisma.json"));
  for (const owner of owners)
    run("pnpm", ["--filter", owner, "prisma:gen"], { cwd: root });
}

export function verifySelectedRuntimeImports(root, selection, run = execute) {
  const graph = selectedGraph(root, selection);
  run(
    "node",
    [
      "./scripts/docker/verify-runtime-imports.mjs",
      root,
      ...graph.services.map((service) => service.name),
    ],
    { cwd: root },
  );
}

function runtimeFiles(workspace) {
  const files = workspace.manifest.files;
  if (!Array.isArray(files) || !files.includes("dist")) {
    throw new Error(
      `build_graph_runtime_files_unknown_${workspace.manifest.name}`,
    );
  }
  if (files.some((file) => file !== "dist" && file !== "*.proto")) {
    throw new Error(
      `build_graph_runtime_files_unknown_${workspace.manifest.name}`,
    );
  }
  return files.includes("*.proto");
}

function copyRuntime(root, workspace, destination) {
  const source = path.join(root, workspace.directory);
  if (!existsSync(path.join(source, "dist"))) {
    throw new Error(`build_graph_missing_dist_${workspace.manifest.name}`);
  }
  mkdirSync(destination, { recursive: true });
  cpSync(path.join(source, "dist"), path.join(destination, "dist"), {
    recursive: true,
  });
  const manifest = path.join(source, "package.json");
  const targetManifest = path.join(destination, "package.json");
  if (
    !existsSync(targetManifest) ||
    readFileSync(manifest, "utf8") !== readFileSync(targetManifest, "utf8")
  ) {
    cpSync(manifest, targetManifest);
  }
  if (runtimeFiles(workspace)) {
    for (const file of readdirSync(source).filter((name) =>
      name.endsWith(".proto"),
    )) {
      cpSync(path.join(source, file), path.join(destination, file));
    }
  }
}

// Match the pinned pnpm virtual-store layout already used by runtime overlays.
// A Turbo restore does not execute syncInjectedDepsAfterScripts.
export function syncInjectedRuntime(root, workspace) {
  const store = path.join(root, "node_modules", ".pnpm");
  if (!existsSync(store)) throw new Error("build_graph_virtual_store_missing");
  for (const entry of readdirSync(store, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const slot = path.join(
      store,
      entry.name,
      "node_modules",
      ...workspace.manifest.name.split("/"),
    );
    if (!existsSync(path.join(slot, "package.json"))) continue;
    const target = realpathSync(slot);
    const source = realpathSync(path.join(root, workspace.directory));
    if (target === source) continue;
    const relative = path.relative(realpathSync(store), target);
    if (
      relative.startsWith(`..${path.sep}`) ||
      relative === ".." ||
      path.isAbsolute(relative)
    ) {
      throw new Error("build_graph_injected_target_outside_store");
    }
    const manifest = readJson(path.join(target, "package.json"));
    if (
      manifest.name !== workspace.manifest.name ||
      manifest.version !== workspace.manifest.version
    )
      continue;
    // Remove old output first so removed exports cannot survive a cached restore.
    rmSync(path.join(target, "dist"), { recursive: true, force: true });
    if (runtimeFiles(workspace)) {
      for (const file of readdirSync(target).filter((name) =>
        name.endsWith(".proto"),
      )) {
        rmSync(path.join(target, file));
      }
    }
    copyRuntime(root, workspace, target);
  }
}

export function buildSelected(
  root,
  selection,
  { run = execute, concurrency = "1", force = false } = {},
) {
  if (!/^[1-9]\d*$/.test(String(concurrency)))
    throw new Error("build_graph_concurrency_invalid");
  const graph = selectedGraph(root, selection);
  ensureBuildOutputIgnores(root);
  const build = (name) =>
    run(
      "pnpm",
      [
        "exec",
        "turbo",
        "run",
        "build",
        "--cache-dir=.turbo/runtime-imports-v3",
        `--concurrency=${concurrency}`,
        `--filter=${name}`,
        ...(force ? ["--force"] : []),
      ],
      { cwd: root },
    );
  for (const workspace of graph.workspaces.filter((w) =>
    w.directory.startsWith(`packages${path.sep}`),
  )) {
    build(workspace.manifest.name);
    syncInjectedRuntime(root, workspace);
  }
  for (const service of graph.services) build(service.packageName);
}

export function collectArtifacts(root, selection) {
  const output = path.join(root, ".runtime-packages");
  if (existsSync(output))
    throw new Error("build_graph_artifacts_already_exist");
  mkdirSync(output);
  for (const workspace of selectedGraph(root, selection).workspaces) {
    if (!workspace.directory.startsWith(`packages${path.sep}`)) continue;
    copyRuntime(
      root,
      workspace,
      path.join(output, path.basename(workspace.directory)),
    );
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [operation, selection = "all", output = "/pruned"] =
    process.argv.slice(2);
  const root = process.cwd();
  if (operation === "prune")
    prepareGraph(root, selection, path.resolve(output));
  else if (operation === "generate") generateSelectedPrisma(root);
  else if (operation === "verify")
    verifySelectedRuntimeImports(root, selection);
  else if (operation === "build")
    buildSelected(root, selection, {
      concurrency: process.env.BACKEND_BUILD_CONCURRENCY ?? "1",
      force: process.env.TURBO_FORCE === "1",
    });
  else if (operation === "artifacts") collectArtifacts(root, selection);
  else throw new Error("build_graph_operation_unknown");
}
