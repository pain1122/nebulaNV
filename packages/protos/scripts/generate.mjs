import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const isWindows = process.platform === "win32";
const scriptsDirectory = fileURLToPath(new URL(".", import.meta.url));
const protoDirectory = resolve(scriptsDirectory, "..");
const generatedDirectory = join(protoDirectory, "generated");
const binaryDirectory = join(protoDirectory, "node_modules", ".bin");
const commandExtension = isWindows ? ".CMD" : "";
const protocCommand = join(binaryDirectory, `protoc${commandExtension}`);
const tsProtoPlugin = join(
  binaryDirectory,
  `protoc-gen-ts_proto${commandExtension}`,
);

function fail(message) {
  console.error(`[protos] ${message}`);
  process.exit(1);
}

function listFiles(directory, extension, skippedDirectories = new Set()) {
  const files = [];
  for (const name of readdirSync(directory).sort()) {
    const file = join(directory, name);
    const entry = statSync(file);
    if (entry.isDirectory()) {
      if (!skippedDirectories.has(name)) {
        files.push(...listFiles(file, extension, skippedDirectories));
      }
    } else if (extname(name) === extension) {
      files.push(file);
    }
  }
  return files;
}

function expectedGeneratedFiles(protoFiles) {
  return [
    ...protoFiles.map((file) =>
      relative(protoDirectory, file).replace(/\.proto$/u, ".ts"),
    ),
    "typeRegistry.ts",
  ].sort();
}

function assertGeneratedInventory(outputDirectory, protoFiles) {
  const expected = expectedGeneratedFiles(protoFiles);
  const actual = listFiles(outputDirectory, ".ts")
    .map((file) => relative(outputDirectory, file))
    .sort();

  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    const missing = expected.filter((file) => !actual.includes(file));
    const unexpected = actual.filter((file) => !expected.includes(file));
    const details = [
      missing.length > 0 ? `missing=${missing.join(",")}` : "",
      unexpected.length > 0 ? `unexpected=${unexpected.join(",")}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    throw new Error(`generated_inventory_mismatch${details ? ` ${details}` : ""}`);
  }
}

function generate(outputDirectory, protoFiles) {
  mkdirSync(outputDirectory, { recursive: true });
  const result = spawnSync(
    protocCommand,
    [
      `--plugin=protoc-gen-ts_proto=${tsProtoPlugin}`,
      `--ts_proto_out=${outputDirectory}`,
      "--ts_proto_opt=esModuleInterop=true,outputServices=grpc-js,outputTypeRegistry=true,useOptionals=messages,env=node",
      "-I",
      protoDirectory,
      ...protoFiles,
    ],
    {
      cwd: protoDirectory,
      stdio: "inherit",
      shell: isWindows,
    },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`protoc_failed_exit_${result.status ?? "unknown"}`);
  }
  assertGeneratedInventory(outputDirectory, protoFiles);
}

const unsupportedArguments = process.argv
  .slice(2)
  .filter((argument) => argument !== "--check");
if (unsupportedArguments.length > 0) {
  fail(`unsupported arguments: ${unsupportedArguments.join(" ")}`);
}
if (!existsSync(protoDirectory)) fail("package directory is missing");
if (!existsSync(protocCommand)) fail(`protoc is missing at ${protocCommand}`);
if (!existsSync(tsProtoPlugin)) {
  fail(`ts-proto plugin is missing at ${tsProtoPlugin}`);
}

const protoFiles = listFiles(
  protoDirectory,
  ".proto",
  new Set(["dist", "generated", "node_modules"]),
);
if (protoFiles.length === 0) fail("no .proto source files were found");

const checkOnly = process.argv.includes("--check");
const temporaryRoot = checkOnly
  ? mkdtempSync(join(tmpdir(), "nebula-protos-check-"))
  : mkdtempSync(join(protoDirectory, ".generated-"));
const temporaryOutput = join(temporaryRoot, "generated");

try {
  generate(temporaryOutput, protoFiles);
  if (checkOnly) {
    console.log("[protos] isolated generation check passed");
  } else {
    rmSync(generatedDirectory, { recursive: true, force: true });
    renameSync(temporaryOutput, generatedDirectory);
    console.log(
      `[protos] generated ${protoFiles.length} contracts in ${basename(generatedDirectory)}`,
    );
  }
} catch (error) {
  console.error(
    `[protos] ${error instanceof Error ? error.message : "generation failed"}`,
  );
  process.exitCode = 1;
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
