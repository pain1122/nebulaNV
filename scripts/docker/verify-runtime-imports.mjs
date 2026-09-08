import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { backendServices } from "../backend.mjs";

const repositoryRoot = path.resolve(process.argv[2] ?? process.cwd());
const selectedServices = process.argv.slice(3);
const services =
  selectedServices.length > 0
    ? selectedServices
    : backendServices.map((service) => service.name);
const relativePackageSpecifier =
  /(?:\brequire(?:\.resolve)?\s*\(|\bimport\s*\(|\bfrom\s+)(["'`])((?:\.\.[\\/])+packages[\\/][^"'`\r\n]+)\1/g;

async function collectJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectJavaScriptFiles(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(entryPath);
    }
  }

  return files;
}

const findings = [];

for (const service of services) {
  const distDirectory = path.join(repositoryRoot, "apps", service, "dist");
  let files;

  try {
    files = await collectJavaScriptFiles(distDirectory);
  } catch (error) {
    if (error?.code === "ENOENT") {
      console.error(
        `Runtime import verification failed: missing ${path.relative(repositoryRoot, distDirectory)}`,
      );
      process.exit(1);
    }

    throw error;
  }

  if (files.length === 0) {
    console.error(
      `Runtime import verification failed: no compiled JavaScript found in ${path.relative(repositoryRoot, distDirectory)}`,
    );
    process.exit(1);
  }

  const envSchemaPath = path.join(
    distDirectory,
    "config",
    "env.validation.js",
  );

  try {
    await import(pathToFileURL(envSchemaPath).href);
  } catch (error) {
    console.error(
      `Runtime import verification failed: ${path.relative(repositoryRoot, envSchemaPath)} could not be loaded.`,
    );
    console.error(error);
    process.exit(1);
  }

  for (const file of files) {
    const contents = await readFile(file, "utf8");

    for (const match of contents.matchAll(relativePackageSpecifier)) {
      findings.push({
        file: path.relative(repositoryRoot, file),
        specifier: match[2],
      });
    }
  }
}

if (findings.length > 0) {
  console.error(
    "Runtime import verification failed: compiled services contain relative imports into packages/*.\n" +
      "Shared workspaces must be imported by package name so the production dependency graph can resolve them.",
  );

  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.specifier}`);
  }

  process.exit(1);
}

console.log(
  `Runtime import verification passed for ${services.length} backend service(s).`,
);
