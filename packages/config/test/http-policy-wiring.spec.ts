import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(__dirname, "../../..");

function source(path: string): string {
  return readFileSync(resolve(repositoryRoot, path), "utf8");
}

type BackendInventoryEntry = {
  name: string;
  transport: "http" | "http-grpc";
};

const manifest = JSON.parse(source("package.json")) as {
  nebula: { backendServices: BackendInventoryEntry[] };
};
const services = manifest.nebula.backendServices.filter(
  (service) => service.transport === "http-grpc",
);

describe("service HTTP policy wiring", () => {
  it.each(services)(
    "$name uses the shared CORS, security-header, and environment policy",
    ({ name }) => {
      const main = source(`apps/${name}/src/main.ts`);
      const envValidation = source(`apps/${name}/src/config/env.validation.ts`);

      expect(main).toContain("createHttpCorsOptionsDelegate");
      expect(main).toContain("createHttpSecurityHeadersMiddleware");
      expect(main).toContain("origins: process.env.HTTP_CORS_ORIGINS");
      expect(main).not.toMatch(/helmet\s*\(/);
      expect(main).not.toContain("credentials: true");
      expect(main).not.toMatch(/localhost\(\:\\d\+\)/);

      expect(envValidation).toContain("httpPolicyEnvSchema");
      expect(envValidation).toContain("...httpPolicyEnvSchema");
    },
  );

  it("keeps public render out of direct-service API CORS and cross-origin embeddable", () => {
    const mediaMain = source("apps/media-service/src/main.ts");
    const renderController = source(
      "apps/media-service/src/media-render.controller.ts",
    );

    expect(mediaMain).toContain('publicRenderPaths: ["/media/render"]');
    expect(renderController).toContain(
      'res.setHeader("cross-origin-resource-policy", "cross-origin")',
    );
    expect(renderController).not.toContain("access-control-allow-origin");
  });

  it("keeps internal trust headers out of every service bootstrap", () => {
    for (const { name } of services) {
      const main = source(`apps/${name}/src/main.ts`).toLowerCase();
      expect(main).not.toContain("x-s2s-signature");
      expect(main).not.toContain("x-gateway-sign");
      expect(main).not.toContain("x-user-id");
      expect(main).not.toContain("x-user-role");
      expect(main).not.toContain("x-tenant-id");
      expect(main).not.toContain("x-site-id");
    }
  });
});
