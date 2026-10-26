import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { GATEWAY_ROUTE_POLICIES } from "../src/contracts/route-policy";

const repositoryRoot = path.resolve(__dirname, "../../..");

const serviceFiles = {
  AuthService: {
    proto: "packages/protos/auth.proto",
    controller: "apps/auth-service/src/auth/grpc/grpc-auth.controller.ts",
  },
  UserService: {
    proto: "packages/protos/user.proto",
    controller: "apps/user-service/src/user/grpc/user-grpc.controller.ts",
  },
  SettingsService: {
    proto: "packages/protos/settings.proto",
    controller: "apps/settings-service/src/grpc/settings-grpc.controller.ts",
  },
  ProductService: {
    proto: "packages/protos/product.proto",
    controller:
      "apps/product-service/src/product/grpc/product-grpc.controller.ts",
  },
  ProductTaxonomyService: {
    proto: "packages/protos/product.proto",
    controller:
      "apps/product-service/src/taxonomy/grpc/taxonomy-grpc.controller.ts",
  },
  BlogService: {
    proto: "packages/protos/blog.proto",
    controller: "apps/blog-service/src/blog/grpc/blog-grpc.controller.ts",
  },
  BlogTaxonomyService: {
    proto: "packages/protos/blog.proto",
    controller:
      "apps/blog-service/src/taxonomy/grpc/taxonomy-grpc.controller.ts",
  },
  OrderService: {
    proto: "packages/protos/order.proto",
    controller: "apps/order-service/src/order/grpc/order-grpc.controller.ts",
  },
  MediaService: {
    proto: "packages/protos/media.proto",
    controller: "apps/media-service/src/grpc/media-grpc.controller.ts",
  },
} as const;

// Product/Media: approved D1/F5 Core additions; Product/Order: D2 exact price and Cart fields.
// D2 stock: docs/reports/2026-10-14-d2-stock-execution.md. Gateway/R5 inventory is unchanged;
// four Order-only receivers are asserted separately below.
const legacyProtoSha256 = {
  "packages/protos/auth.proto":
    "869530a647471618ccff23dd505aac6a4f5a6b2b3fcd83ef2f12602a171ea6e7",
  "packages/protos/user.proto":
    "b443986769d858834f300bad6a1852ddaceec13a962556984bd870cd72fe7748",
  "packages/protos/settings.proto":
    "da4e82fed896c382144717fde6a2fe550341ecdb66f08cbef2c25c54ca65d5f9",
  "packages/protos/product.proto":
    "75b20bb82fd4fd5a5195bea0d0e9e812d543cab1e2e344079719391774071db5",
  "packages/protos/blog.proto":
    "82ec00ddc5d77fa41c7615e96439e30dd4f87c4d1d6a3bb6daaaa145e8651d45",
  "packages/protos/order.proto":
    "6ec54d32a9c0a8ca6b7f635443ef206a3970d0f8ca654011a3be4e1a363f58c2",
  "packages/protos/media.proto":
    "d8815d105e6644ecdf451b2adb6d2f539d20575f30fdc870bb5b0841f97038b2",
} as const;

// F4 is paused. Track these exact post-R5 v2 additions for its restart audit.
const deferredV3Rpcs = [
  "MediaService.GetDerivatives",
  "MediaService.RegenerateDerivatives",
  "MediaService.UpdateMetadata",
  "OrderService.AdminGetOrder",
  "OrderService.AdminListOrders",
  "OrderService.ResolveDemoPayment",
  "OrderService.StartDemoPayment",
  "ProductService.UpdateImageMetadata",
] as const;

function source(relativePath: string): string {
  return readFileSync(path.join(repositoryRoot, relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

function serviceBlock(proto: string, serviceName: string): string {
  const match = new RegExp(`service ${serviceName} \\{([\\s\\S]*?)\\n\\}`).exec(
    proto,
  );
  if (!match) throw new Error(`r5_proto_service_missing:${serviceName}`);
  return match[1];
}

function rpcSignatures(block: string): Map<string, string> {
  const signatures = new Map<string, string>();
  const expression =
    /rpc\s+(\w+)\s*\(\s*([.\w]+)\s*\)\s*returns\s*\(\s*([.\w]+)\s*\)/g;
  for (const match of block.matchAll(expression)) {
    signatures.set(match[1], `${match[2]}=>${match[3]}`);
  }
  return signatures;
}

function allTypeScript(directory: string): string {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return [allTypeScript(target)];
      return entry.name.endsWith(".ts") ? [readFileSync(target, "utf8")] : [];
    })
    .join("\n");
}

describe("R5 dormant context-v3 receiver inventory", () => {
  const protectedRpcs = [
    ...new Set(
      GATEWAY_ROUTE_POLICIES.filter(
        (policy) =>
          policy.actor !== "anonymous" &&
          policy.actor !== "optional" &&
          policy.downstreamTarget !== "media-render-http",
      ).map((policy) => policy.downstreamRpc),
    ),
  ].sort();

  const preservedR5Rpcs = protectedRpcs.filter(
    (rpc) => !deferredV3Rpcs.some((deferred) => deferred === rpc),
  );

  it("declares an exact separate v3 receiver for all 59 preserved R5 RPCs", () => {
    expect(protectedRpcs).toHaveLength(67);
    expect(preservedR5Rpcs).toHaveLength(59);

    for (const rpc of preservedR5Rpcs) {
      const match = /^(\w+)\.(\w+)$/.exec(rpc);
      if (!match) throw new Error(`r5_protected_rpc_invalid:${rpc}`);
      const [, serviceName, methodName] = match;
      const files = serviceFiles[serviceName as keyof typeof serviceFiles];
      if (!files)
        throw new Error(`r5_receiver_service_unmapped:${serviceName}`);

      const controller = source(files.controller);
      const declaration = new RegExp(
        `@DormantS2SAuthorizationV3Receiver\\(\\s*["']${serviceName}["']\\s*,\\s*["']${methodName}V3["']\\s*,?\\s*\\)`,
      );
      expect(controller).toMatch(declaration);
      const receiver = declaration.exec(controller);
      if (receiver === null) {
        throw new Error(`r5_receiver_declaration_missing:${rpc}`);
      }
      const previousLine = controller
        .slice(0, receiver.index)
        .trimEnd()
        .split("\n")
        .at(-1);
      expect(previousLine?.trimStart().startsWith("@")).toBe(false);

      const signatures = rpcSignatures(
        serviceBlock(source(files.proto), serviceName),
      );
      expect(signatures.get(`${methodName}V3`)).toBe(
        signatures.get(methodName),
      );
    }
  });

  it("records exactly eight v2 additions whose v3 receivers await F4", () => {
    expect(
      protectedRpcs.filter((rpc) => !preservedR5Rpcs.includes(rpc)),
    ).toEqual([...deferredV3Rpcs]);
    for (const rpc of deferredV3Rpcs) {
      const [serviceName, methodName] = rpc.split(".");
      const files = serviceFiles[serviceName as keyof typeof serviceFiles];
      const signatures = rpcSignatures(
        serviceBlock(source(files.proto), serviceName),
      );
      expect(signatures.has(methodName)).toBe(true);
      expect(signatures.has(`${methodName}V3`)).toBe(false);
      expect(source(files.controller)).toMatch(
        new RegExp(
          `@GrpcMethod\\(\\s*["']${serviceName}["']\\s*,\\s*["']${methodName}["']\\s*\\)`,
        ),
      );
    }
  });

  it("pins the landed protobuf source except additive V3 RPC lines", () => {
    for (const [relativePath, expectedHash] of Object.entries(
      legacyProtoSha256,
    )) {
      const legacySurface = source(relativePath)
        .split("\n")
        .filter((line) => !/^\s*rpc\s+\w+V3\s*\(/.test(line))
        .join("\n");
      expect(createHash("sha256").update(legacySurface).digest("hex")).toBe(
        expectedHash,
      );
    }
  });

  it("tracks exactly four Order-only stock receivers separately from Gateway and dormant F4 receivers", () => {
    const internal = [
      "ReserveCheckoutStock",
      "FinalizeCheckoutStock",
      "CancelCheckoutStock",
      "RestoreCheckoutStock",
    ];
    const signatures = rpcSignatures(
      serviceBlock(source("packages/protos/product.proto"), "ProductService"),
    );
    const controller = source(
      "apps/product-service/src/product/grpc/checkout-stock-grpc.controller.ts",
    );
    const declared = [
      ...controller.matchAll(/@GrpcMethod\("ProductService", "(\w+)"\)/g),
    ].map((match) => match[1]);
    expect(declared).toEqual(internal);
    for (const method of internal) {
      expect(signatures.has(method)).toBe(true);
      expect(signatures.has(`${method}V3`)).toBe(false);
      expect(protectedRpcs).not.toContain(`ProductService.${method}`);
    }
    expect([...controller.matchAll(/@InternalOnly\(\)/g)]).toHaveLength(4);
    expect([
      ...controller.matchAll(/@AllowedS2SCallers\("order-service"\)/g),
    ]).toHaveLength(4);
  });

  it("leaves the gateway without an active v3 writer", () => {
    const writerSources = allTypeScript(
      path.join(repositoryRoot, "apps/gateway/src"),
    );

    expect(writerSources).not.toMatch(/\b\w+V3\b/);
    expect(protectedRpcs.every((rpc) => !rpc.endsWith("V3"))).toBe(true);
  });
});
