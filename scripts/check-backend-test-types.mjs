import console from "node:console";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import { backendServices, repositoryRoot } from "./backend.mjs";

// Mirror each live owner's compiler settings without inherited test exclusions.
// No emit/startup: shared test fixtures may live outside an application's root.
let failed = false;
for (const service of backendServices) {
  const directory = path.join(repositoryRoot, service.directory);
  const manifest = JSON.parse(
    readFileSync(path.join(directory, "package.json"), "utf8"),
  );
  if (!manifest.scripts?.["test:e2e"]) continue;
  const configPath = path.join(directory, "tsconfig.json");
  const input = ts.readConfigFile(configPath, ts.sys.readFile);
  if (input.error)
    throw new Error(
      ts.flattenDiagnosticMessageText(input.error.messageText, "\n"),
    );
  const config = ts.parseJsonConfigFileContent(
    {
      ...input.config,
      compilerOptions: {
        ...input.config.compilerOptions,
        rootDir: repositoryRoot,
        noEmit: true,
        incremental: false,
      },
      include: ["test/**/*.ts"],
      exclude: ["node_modules", "dist"],
    },
    ts.sys,
    directory,
    {},
    configPath,
  );
  if (config.fileNames.length === 0)
    throw new Error(`backend_test_types_missing_${service.name}`);
  const program = ts.createProgram(config.fileNames, config.options);
  const diagnostics = [...config.errors, ...ts.getPreEmitDiagnostics(program)];
  if (diagnostics.length) {
    failed = true;
    console.error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (file) => file,
        getCurrentDirectory: () => repositoryRoot,
        getNewLine: () => "\n",
      }),
    );
  }
  console.log(
    `[backend-test-types] ${service.name}: files=${config.fileNames.length} errors=${diagnostics.length}`,
  );
}
if (failed) process.exitCode = 1;
