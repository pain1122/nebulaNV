import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(__dirname, "../../..");

function source(path: string): string {
  return readFileSync(resolve(repositoryRoot, path), "utf8");
}

type BackendInventoryEntry = {
  name: string;
  database: string | null;
  transport: "http" | "http-grpc";
};

const manifest = JSON.parse(source("package.json")) as {
  nebula: { backendServices: BackendInventoryEntry[] };
};
const services = manifest.nebula.backendServices;
const hybridServices = services.filter(
  (service) => service.transport === "http-grpc",
);

describe("service health and shutdown wiring", () => {
  it.each(services)(
    "$name uses the shared health contract and Nest shutdown hooks",
    ({ name }) => {
      const health = source(`apps/${name}/src/health.controller.ts`);
      const main = source(`apps/${name}/src/main.ts`);

      expect(health).toContain("extends StandardHealthController");
      if (name === "realm-auth-service") {
        const module = source(`apps/${name}/src/app.module.ts`);
        expect(module).not.toContain("APP_GUARD");
        expect(module).not.toContain("useGlobalGuards");
        expect(main).not.toContain("useGlobalGuards");
        expect(health).toContain("this.boundary.checkReadiness()");
        expect(health).toContain("this.redis.checkReadiness()");
      } else {
        expect(health).toContain("@OperationalHealth()");
      }
      expect(health).not.toContain("@Public()");
      expect(health).not.toContain("new PrismaClient");
      expect(main).toContain("app.enableShutdownHooks()");
    },
  );

  it.each(hybridServices)(
    "$name reports the shared S2S replay dependency",
    ({ name }) => {
      const health = source(`apps/${name}/src/health.controller.ts`);
      expect(health).toContain("s2sReplay");
    },
  );

  it("uses explicit readiness for backend Docker and provisioning gates", () => {
    const dockerfile = source("docker/backend.Dockerfile");
    const provision = source("scripts/backend.mjs");

    const runtimeStages = dockerfile
      .split(/(?=^FROM )/m)
      .filter((stage) => stage.startsWith("FROM runtime-base AS "));
    expect(runtimeStages).toHaveLength(services.length);
    for (const { name } of services) {
      const target = `${name.replace(/-service$/, "")}-runtime`;
      const stage = runtimeStages.find(
        (value) =>
          value.split(/\r?\n/, 1)[0] === `FROM runtime-base AS ${target}`,
      );
      expect(stage).toBeDefined();
      expect(stage?.match(/^HEALTHCHECK\b/gm)).toHaveLength(1);
      expect(stage).toContain("/health/ready");
    }
    expect(provision).toContain("composeServices.map");
    expect(provision).toContain("/health/ready");
    expect(dockerfile).not.toMatch(/localhost:\d+\/health['"]/);
  });

  it("does not keep the superseded Prisma beforeExit hook", () => {
    for (const { name } of services.filter(
      (service) => service.database !== null,
    )) {
      const prisma = source(`apps/${name}/src/prisma.service.ts`);

      expect(prisma).not.toContain("beforeExit");
      expect(prisma).not.toContain("enableShutdownHooks");
    }
  });
});
