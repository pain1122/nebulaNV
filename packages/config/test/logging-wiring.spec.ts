import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(__dirname, "../../..");

function source(path: string): string {
  return readFileSync(resolve(repositoryRoot, path), "utf8");
}

type BackendInventoryEntry = {
  name: string;
  database: string | null;
  moduleFile: string;
};

const manifest = JSON.parse(source("package.json")) as {
  nebula: { backendServices: BackendInventoryEntry[] };
};
const services = manifest.nebula.backendServices;
const prismaServices = services.filter((service) => service.database !== null);

describe("service logging wiring", () => {
  it.each(services)(
    "$name uses the shared request, level, readiness, fatal, and lifecycle policy",
    ({ name, moduleFile }) => {
      const main = source(`apps/${name}/src/main.ts`);
      const module = source(`apps/${name}/src/${moduleFile}`);
      const httpBootstrap =
        name === "gateway"
          ? `${main}\n${source("apps/gateway/src/http/configure-http.ts")}`
          : main;

      expect(httpBootstrap).toContain("createHttpRequestLoggingMiddleware");
      expect(main).toContain("serviceLogLevels()");
      expect(main).toContain("logServiceReady");
      expect(main).toContain("logFatalStartup");
      expect(main).not.toMatch(
        /console\.(?:log|debug|warn|error|time|timeEnd)/,
      );

      expect(module).toContain("createServiceLifecycleProvider");
      expect(module).toMatch(
        new RegExp(`createServiceLifecycleProvider\\(["']${name}["']\\)`),
      );
    },
  );

  it.each(prismaServices)(
    "$name does not emit SQL queries, parameters, or raw Prisma errors",
    ({ name }) => {
      const prisma = source(`apps/${name}/src/prisma.service.ts`);

      expect(prisma).not.toContain('level: "query"');
      expect(prisma).not.toContain("level: 'query'");
      expect(prisma).not.toContain("e.query");
      expect(prisma).not.toContain("e.params");
      expect(prisma).not.toContain("e.message");
      expect(prisma).not.toContain("JSON.stringify(e)");
      expect(prisma).toContain("prisma_error");
    },
  );
});
