import assert from "node:assert/strict";
import console from "node:console";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  watch,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { clearTimeout, setTimeout } from "node:timers";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  loadBackendServices,
  repositoryRoot,
  sanitizeOutput,
} from "./backend.mjs";
import {
  selectedGraph,
  syncInjectedRuntime,
} from "./docker/backend-build-graph.mjs";

const require = createRequire(import.meta.url);
const yaml = createRequire(require.resolve("eslint/package.json"))("js-yaml");
const slash = (value) => value.replaceAll(path.sep, "/");
const prefix = (service) =>
  service.name
    .replace(/-service$/, "")
    .replaceAll("-", "_")
    .toUpperCase();
const ignored = new Set([
  "node_modules",
  "dist",
  "generated",
  ".turbo",
  ".git",
  "test",
  "tests",
  "__tests__",
]);
const globalInputs = [
  ".env",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  ".npmrc",
  "turbo.json",
  "tsconfig.base.json",
  ".gitignore",
  "scripts/backend-dev.mjs",
  "scripts/backend-dev-env.mjs",
  "scripts/docker/backend-build-graph.mjs",
];

function sourceFiles(directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (
      ignored.has(entry.name) ||
      /\.(spec|test)\.[cm]?[jt]sx?$/.test(entry.name)
    )
      continue;
    assert.equal(
      entry.isSymbolicLink(),
      false,
      "backend_dev_authored_symlink_unsupported",
    );
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(file));
    else files.push(file);
  }
  return files;
}

export function developmentPlan(root, names) {
  const inventory = loadBackendServices(root);
  assert.ok(
    names.length && new Set(names).size === names.length,
    "backend_dev_unique_selection_required",
  );
  for (const name of names)
    assert.ok(
      inventory.some((s) => s.name === name),
      `backend_dev_unknown_service_${name}`,
    );
  const compose = yaml.load(
    readFileSync(path.join(root, "docker-compose.yml"), "utf8"),
  );
  const consumers = inventory.map((consumer) => {
    const references = sourceFiles(path.join(root, consumer.directory, "src"))
      .filter((file) => file.endsWith(".ts"))
      .map((file) => ({
        file: slash(path.relative(root, file)),
        text: readFileSync(file, "utf8"),
      }));
    const declared =
      compose.services?.[consumer.dockerService]?.depends_on ?? {};
    const dependencies = inventory.filter(
      (provider) =>
        provider.name !== consumer.name &&
        ((provider.grpcPort &&
          references.some((s) =>
            s.text.includes(`${prefix(provider)}_GRPC_URL`),
          )) ||
          (Array.isArray(declared)
            ? declared.includes(provider.dockerService)
            : Object.hasOwn(declared, provider.dockerService))),
    );
    return {
      name: consumer.name,
      dependencies: dependencies.map((s) => s.name),
      sources: references
        .filter((s) =>
          dependencies.some((p) => s.text.includes(`${prefix(p)}_GRPC_URL`)),
        )
        .map((s) => s.file),
    };
  });
  const native = new Set(names);
  let changed = true;
  while (changed) {
    changed = false;
    for (const consumer of consumers)
      if (
        !native.has(consumer.name) &&
        consumer.dependencies.some((name) => native.has(name))
      ) {
        native.add(consumer.name);
        changed = true;
      }
  }
  const services = inventory.filter((s) => native.has(s.name));
  const publications = compose.services?.postgres?.ports ?? [];
  const databasePorts = publications
    .map((entry) => {
      if (typeof entry === "object")
        return Number(entry.target) === 5432 ? Number(entry.published) : null;
      const pieces = String(entry)
        .replace(/\/tcp$/, "")
        .split(":");
      return pieces.at(-1) === "5432" && pieces.length >= 2
        ? Number(pieces.at(-2))
        : null;
    })
    .filter((port) => Number.isInteger(port) && port > 0 && port < 65536);
  if (services.some((s) => s.database))
    assert.equal(
      databasePorts.length,
      1,
      "backend_dev_postgres_publication_must_be_literal_and_unique",
    );
  const graph = selectedGraph(root, services.map((s) => s.name).join(","));
  const serviceWorkspaces = Object.fromEntries(
    services.map((service) => [
      service.name,
      selectedGraph(root, service.name).workspaces.map((w) =>
        slash(w.directory),
      ),
    ]),
  );
  return {
    root,
    inventory,
    requested: names,
    services,
    companions: services
      .filter((s) => !names.includes(s.name))
      .map((s) => s.name),
    workspaces: graph.workspaces.map((w) => slash(w.directory)),
    serviceWorkspaces,
    consumers,
    stopContainers: services.map((s) => s.dockerService),
    dockerDependencies: inventory
      .filter(
        (s) =>
          !native.has(s.name) &&
          consumers.some(
            (c) => native.has(c.name) && c.dependencies.includes(s.name),
          ),
      )
      .map((s) => s.dockerService),
    postgresPort: databasePorts[0] ?? null,
    unsupported:
      services.some((s) => s.name === "media-service") &&
      !compose.services?.["media-scanner"]?.ports?.length
        ? [
            "backend_dev_native_media_requires_reviewed_scanner_transport; keep Media in Docker (scanner TCP is intentionally not published)",
          ]
        : [],
  };
}

export function nativeEnvironment(plan, service, env = process.env) {
  assert.notEqual(
    String(env.NODE_ENV ?? "development").toLowerCase(),
    "production",
    "backend_dev_refused_in_production",
  );
  const result = {
    ...env,
    NODE_ENV: "development",
    NEBULA_DEV_PROFILE: "selected-native",
    [`${prefix(service)}_HTTP_PORT`]: String(service.httpPort),
  };
  if (service.database)
    Object.assign(result, {
      NEBULA_DEV_DATABASE: service.database,
      NEBULA_DEV_POSTGRES_PORT: String(plan.postgresPort),
    });
  else {
    delete result.NEBULA_DEV_DATABASE;
    delete result.NEBULA_DEV_POSTGRES_PORT;
  }
  if (service.grpcPort)
    Object.assign(result, {
      [`${prefix(service)}_GRPC_HOST`]: "127.0.0.1",
      [`${prefix(service)}_GRPC_PORT`]: String(service.grpcPort),
    });
  for (const target of plan.inventory.filter((s) => s.grpcPort))
    result[`${prefix(target)}_GRPC_URL`] = `127.0.0.1:${target.grpcPort}`;
  result.MEDIA_RENDER_HTTP_URL = `http://127.0.0.1:${plan.inventory.find((s) => s.name === "media-service")?.httpPort ?? 3007}`;
  return result;
}

function inputKind(plan, relative) {
  if (globalInputs.includes(relative))
    return relative === ".env"
      ? "env"
      : relative === "tsconfig.base.json"
        ? "build"
        : "structural";
  const workspace = plan.workspaces.find((w) => relative.startsWith(`${w}/`));
  if (!workspace) return null;
  const name = relative.slice(workspace.length + 1);
  if (
    name.split("/").some((part) => ignored.has(part)) ||
    /\.(spec|test)\.[cm]?[jt]sx?$/.test(name)
  )
    return null;
  if (name === ".env" && workspace.startsWith("apps/")) return "env";
  if (
    name === "package.json" ||
    name === ".npmrc" ||
    name === "prisma.config.ts" ||
    name.startsWith("prisma/")
  )
    return "structural";
  return /^(src|assets|scripts)\//.test(name) ||
    /^[^/]+\.(ts|proto)$/.test(name) ||
    /^(tsconfig.*\.json|nest-cli\.json)$/.test(name)
    ? "build"
    : null;
}

export function changedServices(plan, files) {
  const targets = new Map();
  for (const file of files) {
    const kind = inputKind(plan, file);
    if (!kind) continue;
    assert.notEqual(kind, "structural", `backend_dev_restart_required_${file}`);
    for (const service of plan.services)
      if (
        globalInputs.includes(file) ||
        plan.serviceWorkspaces[service.name].some((w) =>
          file.startsWith(`${w}/`),
        )
      ) {
        targets.set(
          service.name,
          (targets.get(service.name) ?? false) || kind === "build",
        );
      }
  }
  return targets;
}

export function inputSnapshot(plan) {
  const files = new Set(globalInputs.map((file) => path.join(plan.root, file)));
  for (const workspace of plan.workspaces) {
    const directory = path.join(plan.root, workspace);
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isFile()) files.add(file);
      else if (["src", "assets", "scripts", "prisma"].includes(entry.name))
        for (const child of sourceFiles(file)) files.add(child);
    }
  }
  const snapshot = new Map();
  for (const file of [...files].sort()) {
    const relative = slash(path.relative(plan.root, file));
    if (!inputKind(plan, relative)) continue;
    try {
      snapshot.set(
        relative,
        createHash("sha256").update(readFileSync(file)).digest("hex"),
      );
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return snapshot;
}

export function snapshotChanges(previous, current) {
  return [...new Set([...previous.keys(), ...current.keys()])].filter(
    (file) => previous.get(file) !== current.get(file),
  );
}

export function watchDevelopmentInputs(plan, onChange, onError) {
  let previous = inputSnapshot(plan);
  let timer;
  let closed = false;
  const watchers = new Map();
  const refresh = () => {
    if (closed) return;
    try {
      const current = inputSnapshot(plan);
      const changes = snapshotChanges(previous, current);
      previous = current;
      install();
      if (changes.length) onChange(changes);
    } catch (error) {
      onError(error);
    }
  };
  const install = () => {
    const roots = new Map(
      globalInputs.map((file) => [
        path.dirname(path.join(plan.root, file)),
        false,
      ]),
    );
    for (const workspace of plan.workspaces) {
      const directory = path.join(plan.root, workspace);
      roots.set(directory, false);
      for (const child of ["src", "assets", "scripts", "prisma"])
        if (existsSync(path.join(directory, child)))
          roots.set(path.join(directory, child), true);
    }
    for (const [directory, recursive] of roots)
      if (!watchers.has(directory)) {
        const watcher = watch(directory, { recursive }, (_event, filename) => {
          if (closed) return;
          if (filename) {
            const relative = slash(
              path.relative(plan.root, path.join(directory, String(filename))),
            );
            if (!inputKind(plan, relative) && !inputKind(plan, `${relative}/`))
              return;
          }
          clearTimeout(timer);
          timer = setTimeout(refresh, 200);
        });
        watcher.on("error", onError);
        watchers.set(directory, watcher);
      }
  };
  try {
    install();
  } catch (error) {
    for (const watcher of watchers.values()) watcher.close();
    throw error;
  }
  return () => {
    closed = true;
    clearTimeout(timer);
    for (const watcher of watchers.values()) watcher.close();
  };
}

export class DevelopmentCoordinator {
  constructor(
    plan,
    { build, start, stop, abort = async () => {}, report = console.error },
  ) {
    Object.assign(this, { plan, build, start, stop, abort, report });
    this.pending = new Map();
    this.valid = new Set();
    this.failed = new Set();
    this.staged = new Set();
    this.closed = false;
    this.working = null;
  }
  request(targets) {
    if (this.closed) return Promise.resolve();
    for (const [name, build] of targets)
      this.pending.set(
        name,
        build || this.pending.get(name) || !this.valid.has(name),
      );
    for (const name of this.failed) this.pending.set(name, true);
    if (!this.working)
      this.working = this.drain().finally(() => {
        this.working = null;
      });
    return this.working;
  }
  async drain() {
    while (this.pending.size && !this.closed) {
      const batch = new Map(this.pending);
      this.pending.clear();
      const names = [...batch.keys()];
      await this.stop(names);
      for (const name of names) this.staged.add(name);
      const rebuild = names.filter((name) => batch.get(name));
      for (const name of rebuild) this.valid.delete(name);
      try {
        if (rebuild.length) await this.build(rebuild);
        for (const name of rebuild) {
          this.valid.add(name);
          this.failed.delete(name);
        }
      } catch (error) {
        for (const name of rebuild) this.failed.add(name);
        if (!this.closed)
          this.report(
            `[dev-watch] build failed; affected services remain stopped: ${names.join(", ")} (${error.message})`,
          );
        continue;
      }
      // A new edit may arrive while a producer is compiling. Finish the queued
      // builds before starting staged native callers that need those providers.
      if (!this.closed && !this.pending.size) {
        const ready = [...this.staged].filter((name) => this.valid.has(name));
        await this.start(ready);
        for (const name of ready) this.staged.delete(name);
      }
    }
  }
  async close() {
    this.closed = true;
    this.pending.clear();
    const errors = [];
    try {
      await this.abort();
    } catch (error) {
      errors.push(error);
    }
    try {
      await this.working;
    } catch (error) {
      errors.push(error);
    }
    try {
      await this.stop(this.plan.services.map((s) => s.name));
    } catch (error) {
      errors.push(error);
    }
    if (errors.length)
      throw new AggregateError(errors, "backend_dev_shutdown_failed");
  }
}

export class OwnedProcesses {
  constructor() {
    this.children = new Set();
    this.expected = new WeakSet();
  }
  launch(command, args, options = {}) {
    const child = spawn(command, args, {
      stdio: "inherit",
      detached: process.platform !== "win32",
      ...options,
    });
    this.children.add(child);
    const completion = new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (code, signal) => resolve({ code, signal }));
    }).finally(() => this.children.delete(child));
    // Attach immediately; runtime consumers install their fatal callback below.
    completion.catch(() => {});
    return { child, completion };
  }
  async stop(child) {
    if (!this.children.has(child) || child.exitCode !== null || !child.pid)
      return;
    this.expected.add(child);
    if (process.platform === "win32") {
      const killer = spawn(
        "taskkill",
        ["/PID", String(child.pid), "/T", "/F"],
        { stdio: "ignore", windowsHide: true },
      );
      await new Promise((resolve, reject) => {
        killer.once("error", reject);
        killer.once("close", resolve);
      });
    } else {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch (error) {
        if (error.code !== "ESRCH") throw error;
      }
    }
    for (let attempt = 0; attempt < 50 && this.children.has(child); attempt++)
      await delay(100);
    if (this.children.has(child)) {
      if (process.platform !== "win32")
        try {
          process.kill(-child.pid, "SIGKILL");
        } catch (error) {
          if (error.code !== "ESRCH") throw error;
        }
      for (let attempt = 0; attempt < 20 && this.children.has(child); attempt++)
        await delay(100);
    }
    assert.ok(
      !this.children.has(child),
      "backend_dev_owned_process_did_not_stop",
    );
  }
  async stopAll() {
    await Promise.all([...this.children].map((child) => this.stop(child)));
  }
}

export function acquireSession(root) {
  const directory = path.join(root, ".ci-evidence/backend-dev");
  mkdirSync(directory, { recursive: true });
  const file = path.join(directory, "session.lock");
  let fd;
  try {
    fd = openSync(file, "wx");
  } catch (error) {
    if (error.code === "EEXIST")
      throw new Error(
        "backend_dev_session_locked; stop the other session or inspect .ci-evidence/backend-dev/session.lock",
      );
    throw error;
  }
  const value = JSON.stringify({ pid: process.pid, nonce: randomUUID() });
  writeFileSync(fd, value);
  closeSync(fd);
  return () => {
    assert.equal(
      readFileSync(file, "utf8"),
      value,
      "backend_dev_lock_ownership_changed",
    );
    unlinkSync(file);
  };
}

export async function assertFreePorts(plan) {
  for (const service of plan.services)
    for (const port of [service.httpPort, service.grpcPort].filter(Boolean)) {
      await new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once("error", () =>
          reject(
            new Error(
              `backend_dev_port_in_use_${service.name}_${port}; stop its container/native process first`,
            ),
          ),
        );
        server.listen(port, "127.0.0.1", () => server.close(resolve));
      });
    }
}

export async function buildDevelopment(
  root,
  names,
  run,
  generated = new Set(),
) {
  const graph = selectedGraph(root, names.join(","));
  for (const workspace of graph.workspaces.filter((w) =>
    w.directory.startsWith(`packages${path.sep}`),
  )) {
    await run(
      "pnpm",
      [
        "exec",
        "turbo",
        "run",
        "build",
        "--cache-dir=.turbo/runtime-imports-v3",
        "--concurrency=1",
        `--filter=${workspace.manifest.name}`,
      ],
      root,
    );
    syncInjectedRuntime(root, workspace);
  }
  for (const service of graph.services) {
    if (service.database && !generated.has(service.name)) {
      await run("pnpm", ["--filter", service.packageName, "prisma:gen"], root);
      generated.add(service.name);
    }
    await run(
      "pnpm",
      [
        "exec",
        "turbo",
        "run",
        "build",
        "--cache-dir=.turbo/runtime-imports-v3",
        "--concurrency=1",
        `--filter=${service.packageName}`,
      ],
      root,
    );
  }
  await run(
    "node",
    [
      "scripts/docker/verify-runtime-imports.mjs",
      root,
      ...graph.services.map((s) => s.name),
    ],
    root,
  );
}

export function nativeRuntimeArguments(root, probe = false) {
  return [
    "--import",
    pathToFileURL(path.join(root, "scripts/backend-dev-env.mjs")).href,
    ...(probe ? ["-e", "0"] : ["dist/main.js"]),
  ];
}

export async function runDevelopment(plan) {
  assert.ok(!plan.unsupported?.length, plan.unsupported?.join("; "));
  nativeEnvironment(plan, plan.services[0]);
  const pnpm = process.env.npm_execpath;
  assert.ok(pnpm, "backend_dev_run_through_pnpm_dev_watch");
  const release = acquireSession(plan.root);
  const processes = new OwnedProcesses();
  const applications = new Map();
  const builds = new Set();
  const generated = new Set();
  const run = async (command, args, cwd, env = process.env) => {
    assert.ok(!ending, "backend_dev_stopping");
    const invocation = command === "pnpm" ? [pnpm, ...args] : args;
    const item = processes.launch(process.execPath, invocation, { cwd, env });
    builds.add(item.child);
    try {
      const result = await item.completion;
      assert.equal(result.code, 0, `backend_dev_${command}_command_failed`);
    } finally {
      builds.delete(item.child);
    }
  };
  let closeWatch;
  let ending;
  let coordinator;
  let resolveEnded;
  const ended = new Promise((resolve) => {
    resolveEnded = resolve;
  });
  const finish = (error) => {
    if (ending) return ending;
    ending = (async () => {
      closeWatch?.();
      if (error) {
        console.error(sanitizeOutput(error.message));
        process.exitCode = 1;
      }
      try {
        await coordinator?.close();
      } catch (failure) {
        console.error(sanitizeOutput(failure.message));
        process.exitCode = 1;
      }
      try {
        await processes.stopAll();
      } catch (failure) {
        console.error(sanitizeOutput(failure.message));
        process.exitCode = 1;
      }
      try {
        release();
      } catch (failure) {
        console.error(failure.message);
        process.exitCode = 1;
      }
      resolveEnded();
    })();
    return ending;
  };
  const onSignal = () => {
    void finish();
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
  try {
    await assertFreePorts(plan);
    if (ending) {
      await ending;
      return;
    }
    coordinator = new DevelopmentCoordinator(plan, {
      build: (names) => buildDevelopment(plan.root, names, run, generated),
      stop: async (names) => {
        for (const name of names) {
          const child = applications.get(name);
          if (child) {
            await processes.stop(child);
            applications.delete(name);
          }
        }
      },
      abort: async () => {
        await Promise.all([...builds].map((child) => processes.stop(child)));
      },
      start: async (names) => {
        for (const name of names) {
          if (ending) return;
          const service = plan.services.find((s) => s.name === name);
          const env = nativeEnvironment(plan, service);
          const cwd = path.join(plan.root, service.directory);
          console.log(`[dev-watch] validate/start: ${name}`);
          await run("node", nativeRuntimeArguments(plan.root, true), cwd, env);
          if (ending) return;
          const item = processes.launch(
            process.execPath,
            nativeRuntimeArguments(plan.root),
            {
              cwd,
              env,
            },
          );
          applications.set(name, item.child);
          item.completion.then(
            () => {
              if (!processes.expected.has(item.child) && !ending)
                void finish(new Error(`backend_dev_runtime_exited_${name}`));
            },
            (error) => {
              void finish(error);
            },
          );
        }
        const deadline = Date.now() + 90_000;
        for (const name of names) {
          const service = plan.services.find((s) => s.name === name);
          let ready = false;
          while (!ending && Date.now() < deadline) {
            try {
              const response = await globalThis.fetch(
                `http://127.0.0.1:${service.httpPort}/health/ready`,
                { signal: globalThis.AbortSignal.timeout(1500) },
              );
              ready = response.status === 200;
            } catch {
              /* bounded startup/restart read */
            }
            if (ready) break;
            await delay(300);
          }
          if (!ending) assert.ok(ready, `backend_dev_readiness_failed_${name}`);
        }
        if (!ending && names.length)
          console.log(`[dev-watch] ready: ${names.join(", ")}`);
      },
    });
    closeWatch = watchDevelopmentInputs(
      plan,
      (changes) => {
        console.log(`[dev-watch] changed: ${changes.join(", ")}`);
        try {
          void coordinator
            .request(changedServices(plan, changes))
            .catch(finish);
        } catch (error) {
          void finish(error);
        }
      },
      finish,
    );
    console.log(
      `[dev-watch] requested=${plan.requested.join(",")} native=${plan.services.map((s) => s.name).join(",")}; serial cached builds; no Docker builds/migrations`,
    );
    await coordinator.request(
      new Map(plan.services.map((s) => [s.name, true])),
    );
    await ended;
  } catch (error) {
    await finish(error);
  } finally {
    process.removeListener("SIGINT", onSignal);
    process.removeListener("SIGTERM", onSignal);
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const args = process.argv.slice(2);
    assert.ok(
      args.filter((arg) => arg === "--plan").length <= 1,
      "backend_dev_duplicate_plan_flag",
    );
    const plan = developmentPlan(
      repositoryRoot,
      args.filter((arg) => arg !== "--plan"),
    );
    if (args.includes("--plan"))
      console.log(
        JSON.stringify(
          {
            requested: plan.requested,
            native: plan.services.map((s) => s.name),
            companions: plan.companions,
            sharedPackages: plan.workspaces.filter((w) =>
              w.startsWith("packages/"),
            ),
            stopContainers: plan.stopContainers,
            dockerDependencies: plan.dockerDependencies,
            postgresPort: plan.postgresPort,
            unsupported: plan.unsupported,
          },
          null,
          2,
        ),
      );
    else {
      nativeEnvironment(plan, plan.services[0]);
      await runDevelopment(plan);
    }
  } catch (error) {
    console.error(sanitizeOutput(error.message));
    process.exitCode = 1;
  }
}
