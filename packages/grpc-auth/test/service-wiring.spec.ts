import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "../../..");

const adminControllers = [
  "apps/user-service/src/user/user.controller.ts",
  "apps/media-service/src/media.controller.ts",
  "apps/media-service/src/grpc/media-grpc.controller.ts",
  "apps/product-service/src/product/product.controller.ts",
  "apps/product-service/src/product/grpc/product-grpc.controller.ts",
  "apps/product-service/src/taxonomy/taxonomy.controller.ts",
  "apps/product-service/src/taxonomy/grpc/taxonomy-grpc.controller.ts",
  "apps/blog-service/src/blog/blog.controller.ts",
  "apps/blog-service/src/blog/grpc/blog-grpc.controller.ts",
  "apps/blog-service/src/taxonomy/taxonomy.controller.ts",
  "apps/blog-service/src/taxonomy/grpc/taxonomy-grpc.controller.ts",
  "apps/taxonomy-service/src/taxonomy/taxonomy.controller.ts",
  "apps/taxonomy-service/src/taxonomy/grpc/taxonomy-grpc.controller.ts",
  "apps/settings-service/src/settings.controller.ts",
  "apps/settings-service/src/grpc/settings-grpc.controller.ts",
  "apps/order-service/src/order/order.controller.ts",
  "apps/order-service/src/order/grpc/order-grpc.controller.ts",
] as const;

const generatedInterfaceControllers = [
  "apps/settings-service/src/grpc/settings-grpc.controller.ts",
  "apps/product-service/src/taxonomy/grpc/taxonomy-grpc.controller.ts",
  "apps/blog-service/src/taxonomy/grpc/taxonomy-grpc.controller.ts",
] as const;

function source(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

type BackendInventoryEntry = {
  name: string;
  moduleFile: string;
  transport: "http" | "http-grpc";
};

const manifest = JSON.parse(source("package.json")) as {
  nebula: { backendServices: BackendInventoryEntry[] };
};
const services = manifest.nebula.backendServices.filter(
  (service) => service.transport === "http-grpc",
);

function expectInOrder(contents: string, markers: readonly string[]): void {
  let previousIndex = -1;

  for (const marker of markers) {
    const index = contents.indexOf(marker);
    expect(index).toBeGreaterThan(previousIndex);
    previousIndex = index;
  }
}

describe("canonical gRPC security wiring", () => {
  it("the shared template suppresses duplicate hybrid lifecycle hooks", () => {
    const security = source("packages/grpc-auth/src/grpc-security.ts");
    expect(security).toContain("setIsInitHookCalled(true)");
    expect(security).toContain("Reflector,");
    expect(security).toContain("grpcS2SProtoLoaderOptions");
    expect(security).toContain("defaults: false");
    expect(security).toContain(
      "microservice.useGlobalFilters(new GrpcErrorFilter())",
    );
    expect(security).toContain(
      "microservice.useGlobalGuards(app.get(S2SGuard), app.get(GrpcTokenAuthGuard))",
    );
  });

  it("feature modules do not create partial guard dependency scopes", () => {
    const userModule = source("apps/user-service/src/user/user.module.ts");
    expect(userModule).not.toContain("S2SGuard");
    expect(userModule).not.toContain("GrpcTokenAuthGuard");
  });

  it.each(services)(
    "$name installs S2S before token auth through the shared template",
    ({ name, moduleFile }) => {
      const main = source(`apps/${name}/src/main.ts`);
      const module = source(`apps/${name}/src/${moduleFile}`);

      expect(main).toContain("grpcS2SServerChannelOptions(");
      expect(main).toContain("loader: grpcS2SProtoLoaderOptions()");
      expect(main).toContain("await startSecuredGrpc(app, micro)");
      expect(main).toContain("{ deferInitialization: true }");
      expect(module).toContain("...GRPC_SECURITY_PROVIDERS");
      expect(module).toContain("useExisting: GrpcTokenAuthGuard");
      expect(module).not.toContain("useClass: S2SGuard");
      expectInOrder(module, [
        "useClass: ThrottlerGuard",
        "useExisting: GrpcTokenAuthGuard",
      ]);

      const envValidation = source(`apps/${name}/src/config/env.validation.ts`);
      expect(envValidation).toContain("s2sEnvSchema(");
      expect(envValidation).toContain(name);
      expect(envValidation).not.toContain("GATEWAY_SECRET");
    },
  );

  it.each(services)("$name follows the common bootstrap order", ({ name }) => {
    const main = source(`apps/${name}/src/main.ts`);

    expectInOrder(main, [
      "await NestFactory.create",
      "app.enableShutdownHooks()",
      "app.use(\n    createHttpRequestLoggingMiddleware",
      "app.useGlobalPipes(createHttpValidationPipe())",
      "app.use(createHttpSecurityHeadersMiddleware())",
      "app.enableCors(",
      "app.connectMicroservice<MicroserviceOptions>(",
      "await startSecuredGrpc(app, micro)",
      "await app.listen(",
      "logServiceReady(logger, SERVICE_NAME)",
    ]);
  });

  it("does not expose the internal signing header through browser CORS", () => {
    for (const { name } of services) {
      const main = source(`apps/${name}/src/main.ts`);
      expect(main).not.toContain("x-gateway-sign");
      expect(main).not.toContain("x-s2s-signature");
    }
  });

  it("signs the two shared client wrappers after merging caller metadata", () => {
    for (const file of ["settings.client.ts", "taxonomy.client.ts"]) {
      const client = source(`packages/clients/src/${file}`);
      expect(client).toContain("buildClientGrpcS2SMetadata");
      expect(client).toContain("mergeSignedMetadata");
      expect(client).not.toContain("m ??");
    }
  });

  it("does not attach validation pipes to generated-interface controllers", () => {
    for (const file of generatedInterfaceControllers) {
      const controller = source(file);
      expect(controller).not.toContain("ValidationPipe");
      expect(controller).not.toContain("@UsePipes");
    }
  });

  it("keeps gRPC order-status changes admin-only", () => {
    const controller = source(
      "apps/order-service/src/order/grpc/order-grpc.controller.ts",
    );
    expect(controller).toMatch(
      /@DormantS2SAuthorizationV3Receiver\("OrderService", "UpdateOrderStatusV3"\)\s*@Roles\("admin", "root-admin"\)\s*@GrpcMethod\("OrderService", "UpdateOrderStatus"\)/,
    );
  });

  it("does not exclude root-admin from admin controller policies", () => {
    for (const file of adminControllers) {
      expect(source(file)).not.toMatch(/@Roles\((["'])admin\1\)/);
    }
  });

  it("keeps taxonomy human policies equivalent and bootstrap service-only", () => {
    const http = source(
      "apps/taxonomy-service/src/taxonomy/taxonomy.controller.ts",
    );
    const grpc = source(
      "apps/taxonomy-service/src/taxonomy/grpc/taxonomy-grpc.controller.ts",
    );
    const ensureMethodStart = grpc.indexOf(
      '@GrpcMethod("TaxonomyService", "EnsureSystemTaxonomy")',
    );
    const ensurePolicy = grpc.slice(
      Math.max(0, ensureMethodStart - 180),
      ensureMethodStart,
    );

    expect(http.match(/@Public\(\)/g)).toHaveLength(2);
    expect(http.match(/@Roles\("admin", "root-admin"\)/g)).toHaveLength(3);
    expect(grpc.match(/@Public\(\)/g)).toHaveLength(4);
    expect(grpc.match(/@Roles\("admin", "root-admin"\)/g)).toHaveLength(3);
    expect(ensureMethodStart).toBeGreaterThan(-1);
    expect(ensurePolicy).toContain("@Public()");
    expect(ensurePolicy).toContain("@InternalOnly()");
    expect(ensurePolicy).toContain(
      '@AllowedS2SCallers("product-service", "blog-service")',
    );
  });

  it("keeps user-owned order methods on the same exact role policy", () => {
    const http = source("apps/order-service/src/order/order.controller.ts");
    const grpc = source(
      "apps/order-service/src/order/grpc/order-grpc.controller.ts",
    );

    expect(http.match(/@Roles\("user"\)/g)).toHaveLength(7);
    expect(grpc.match(/@Roles\("user"\)/g)).toHaveLength(7);
  });
});
