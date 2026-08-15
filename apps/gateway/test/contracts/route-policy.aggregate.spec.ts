import { IS_PUBLIC_KEY, ROLES_KEY } from "@nebula/grpc-auth";
import { readFileSync, readdirSync } from "node:fs";
import * as path from "node:path";
import { GATEWAY_INPUT_PROFILES } from "../../src/contracts/input-profiles";
import {
  GATEWAY_ROUTE_POLICIES,
  gatewayRoutePolicy,
} from "../../src/contracts/route-policy";
import {
  GatewayRoutePolicyRef,
  GATEWAY_ROUTE_POLICY_METADATA,
} from "../../src/http/gateway-route-policy";

function readTypescriptSources(directory: string): string {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return readTypescriptSources(target);
      return entry.name.endsWith(".ts") ? [readFileSync(target, "utf8")] : [];
    })
    .join("\n");
}

class DecoratorProbe {
  @GatewayRoutePolicyRef("products.list")
  publicRoute(): void {}

  @GatewayRoutePolicyRef("admin.products.create")
  adminRoute(): void {}
}

describe("gateway route-policy aggregate", () => {
  it("is the unique executable source for all 70 frozen F3 endpoints", () => {
    expect(GATEWAY_ROUTE_POLICIES).toHaveLength(70);
    expect(
      new Set(GATEWAY_ROUTE_POLICIES.map((policy) => policy.id)).size,
    ).toBe(70);
    expect(
      new Set(
        GATEWAY_ROUTE_POLICIES.map(
          (policy) => `${policy.method} ${policy.path}`,
        ),
      ).size,
    ).toBe(70);
    expect(
      GATEWAY_ROUTE_POLICIES.every((policy) =>
        Object.hasOwn(GATEWAY_INPUT_PROFILES, policy.input),
      ),
    ).toBe(true);
  });

  it("keeps every admin endpoint on admin-web with an admin actor", () => {
    const adminRoutes = GATEWAY_ROUTE_POLICIES.filter((policy) =>
      policy.path.startsWith("/api/v1/admin/"),
    );

    expect(adminRoutes.length).toBeGreaterThan(0);
    for (const policy of adminRoutes) {
      expect(policy.applications).toEqual(["admin-web"]);
      expect(policy.actor).toBe("admin");
    }
  });

  it("records resource-specific pagination without inventing totals", () => {
    expect(gatewayRoutePolicy("blog.posts.list").pagination).toBe(
      "page-limit-total",
    );
    expect(gatewayRoutePolicy("products.list").pagination).toBe("total-only");
    expect(gatewayRoutePolicy("media.owned.list").pagination).toBe(
      "offset-take",
    );
    expect(gatewayRoutePolicy("orders.list").pagination).toBe("unpaginated");
  });

  it("makes the selected retry matrix executable", () => {
    expect(gatewayRoutePolicy("orders.cart.add").retry).toBe("key");
    expect(gatewayRoutePolicy("orders.checkout").retry).toBe("key");
    expect(gatewayRoutePolicy("auth.login").retry).toBe("session");
    expect(gatewayRoutePolicy("media.render").retry).toBe("stream");
    expect(
      GATEWAY_ROUTE_POLICIES.filter((policy) => policy.method === "GET").every(
        (policy) => policy.retry === "safe" || policy.retry === "stream",
      ),
    ).toBe(true);
  });

  it("fails closed for unknown policy IDs and exposes immutable records", () => {
    expect(() => gatewayRoutePolicy("unknown.route")).toThrow(
      "gateway_route_policy_unknown:unknown.route",
    );
    expect(Object.isFrozen(GATEWAY_ROUTE_POLICIES)).toBe(true);
    expect(Object.isFrozen(gatewayRoutePolicy("auth.register"))).toBe(true);
    expect(
      Object.isFrozen(gatewayRoutePolicy("auth.register").applications),
    ).toBe(true);
  });

  it("derives controller auth metadata from the same route policy", () => {
    const publicHandler = DecoratorProbe.prototype.publicRoute;
    const adminHandler = DecoratorProbe.prototype.adminRoute;
    expect(
      Reflect.getMetadata(GATEWAY_ROUTE_POLICY_METADATA, publicHandler),
    ).toBe("products.list");
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, publicHandler)).toBe(true);
    expect(
      Reflect.getMetadata(GATEWAY_ROUTE_POLICY_METADATA, adminHandler),
    ).toBe("admin.products.create");
    expect(Reflect.getMetadata(ROLES_KEY, adminHandler)).toEqual([
      "admin",
      "root-admin",
    ]);
  });

  it("keeps every nested external contract separate from proto and Prisma types", () => {
    const directory = path.resolve(__dirname, "../../src/contracts");
    const source = readTypescriptSources(directory);
    expect(source).not.toContain("@nebula/protos");
    expect(source).not.toMatch(/@prisma|PrismaClient/);
  });
});
