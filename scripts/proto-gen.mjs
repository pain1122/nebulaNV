// scripts/proto-gen.mjs
import { spawnSync } from "node:child_process";
import { rmSync, mkdirSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, join, extname } from "node:path";

const isWin = process.platform === "win32";
const repoRoot = resolve(".");
const protoDir = resolve("packages/protos");      // your .proto files live directly here
const outDir = resolve(protoDir, "generated");

// Find ts-proto plugin: prefer root, then packages/protos
const rootPlugin = resolve("node_modules", ".bin", isWin ? "protoc-gen-ts_proto.cmd" : "protoc-gen-ts_proto");
const pkgPlugin  = resolve(protoDir, "node_modules", ".bin", isWin ? "protoc-gen-ts_proto.cmd" : "protoc-gen-ts_proto");
const plugin = existsSync(rootPlugin) ? rootPlugin : (existsSync(pkgPlugin) ? pkgPlugin : null);
if (!plugin) {
  console.error("Cannot find ts-proto plugin. Make sure 'ts-proto' is installed (root or packages/protos).");
  console.error("Expected at:", rootPlugin, "or", pkgPlugin);
  process.exit(1);
}

// Prefer your checked-in Windows protoc.exe; else rely on PATH (CI installs it)
const localProtocWin = resolve(protoDir, "protoc.exe");
const protocCmd = (isWin && existsSync(localProtocWin)) ? localProtocWin : "protoc";

function shouldSkip(p) {
  if (p.startsWith(outDir)) return true;
  if (p.includes(`${resolve(protoDir, "node_modules")}`)) return true;
  return false;
}
function listProtoFiles(dir) {
  const res = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (shouldSkip(p)) continue;
    if (s.isDirectory()) res.push(...listProtoFiles(p));
    else if (extname(name) === ".proto") res.push(p);
  }
  return res;
}

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");

// clean / ensure output
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

if (!existsSync(protoDir)) {
  console.error("Expected packages/protos to exist.");
  process.exit(1);
}

const files = listProtoFiles(protoDir);
if (files.length === 0) {
  console.error("No .proto files found under packages/protos");
  process.exit(1);
}

const protocArgs = [
  `--plugin=protoc-gen-ts_proto=${plugin}`,
  `--ts_proto_out=${outDir}`,
  `--ts_proto_opt=esModuleInterop=true,outputServices=grpc-js,outputTypeRegistry=true,useOptionals=messages,env=node`,
  `-I`, protoDir,
  ...files
];

const r = spawnSync(protocCmd, protocArgs, { cwd: repoRoot, stdio: "inherit", shell: isWin });
if (r.status !== 0) process.exit(r.status);

if (checkOnly) {
  const st = spawnSync("git", ["status", "--porcelain"], { stdio: "pipe" });
  if (st.status === 0 && st.stdout.toString().trim().length === 0) {
    console.log("✔ proto:check — working tree clean");
    process.exit(0);
  } else {
    console.error("✖ proto:check — generated output differs. Run `pnpm proto:gen` and commit.");
    process.exit(2);
  }
}
console.log("✔ proto:gen completed");
