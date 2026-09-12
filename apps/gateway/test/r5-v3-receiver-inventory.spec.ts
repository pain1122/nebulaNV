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

const legacyProtoSha256 = {
  "packages/protos/auth.proto":
    "869530a647471618ccff23dd505aac6a4f5a6b2b3fcd83ef2f12602a171ea6e7",
  "packages/protos/user.proto":
    "b443986769d858834f300bad6a1852ddaceec13a962556984bd870cd72fe7748",
  "packages/protos/settings.proto":
    "da4e82fed896c382144717fde6a2fe550341ecdb66f08cbef2c25c54ca65d5f9",
  "packages/protos/product.proto":
    "a5864c5e565c27bc8aacbf15d1da7f9935ba5ecff20618f49611ce5880c15fde",
  "packages/protos/blog.proto":
    "82ec00ddc5d77fa41c7615e96439e30dd4f87c4d1d6a3bb6daaaa145e8651d45",
  "packages/protos/order.proto":
    "97ef34c45649161b3e93b52f29d883a3748edb5b38e4eab216f27373a727747a",
  "packages/protos/media.proto":
    "7a2c3833d5d8041211757d438be7c46b6a31fee52f60708273c72af655a11ed4",
} as const;

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

  it("declares an exact separate v3 receiver for every protected RPC", () => {
    expect(protectedRpcs).toHaveLength(56);

    for (const rpc of protectedRpcs) {
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

  it("keeps every legacy protobuf source byte except additive V3 RPC lines", () => {
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

  it("leaves the gateway without an active v3 writer", () => {
    const writerSources = allTypeScript(
      path.join(repositoryRoot, "apps/gateway/src"),
    );

    expect(writerSources).not.toMatch(/\b\w+V3\b/);
    expect(protectedRpcs.every((rpc) => !rpc.endsWith("V3"))).toBe(true);
  });
});
