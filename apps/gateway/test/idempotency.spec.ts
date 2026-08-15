import { ConfigService } from "@nestjs/config";
import {
  canonicalGatewayJson,
  decodeGatewayIdempotencyState,
  gatewayIdempotencyRequestHash,
  gatewayIdempotencyStorageKey,
  validateIdempotencyKey,
} from "../src/contracts/idempotency";
import { GatewayIdempotencyService } from "../src/state/gateway-idempotency.service";
import type { GatewayRedisService } from "../src/state/gateway-redis.service";

class FakeRedis {
  readonly values = new Map<string, string>();

  async set(
    key: string,
    value: string,
    _expiry: "EX",
    _ttl: number,
    mode?: "NX",
  ): Promise<"OK" | null> {
    if (mode === "NX" && this.values.has(key)) return null;
    this.values.set(key, value);
    return "OK";
  }

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async eval(
    _script: string,
    _keys: number,
    key: string,
    expected: string,
    replacement: string,
  ): Promise<number> {
    if (this.values.get(key) !== expected) return 0;
    this.values.set(key, replacement);
    return 1;
  }
}

function createService(redis = new FakeRedis(), maxResponseBytes = 524_288) {
  const values: Record<string, number> = {
    GATEWAY_IDEMPOTENCY_TTL_SECONDS: 86_400,
    GATEWAY_IDEMPOTENCY_IN_FLIGHT_TTL_SECONDS: 60,
    GATEWAY_IDEMPOTENCY_MAX_RESPONSE_BYTES: maxResponseBytes,
  };
  const config = {
    getOrThrow: (key: string) => values[key],
  } as ConfigService;
  const gatewayRedis = {
    client: () => redis,
  } as unknown as GatewayRedisService;
  return {
    service: new GatewayIdempotencyService(config, gatewayRedis),
    redis,
  };
}

const scope = {
  applicationId: "admin-web-local",
  actorId: "admin-user",
  routeId: "admin.products.create",
  key: "018f6b70-19a2-7b90-a8ab-123456789abc",
};

const requestValue = {
  method: "POST" as const,
  routeId: "admin.products.create",
  params: {},
  query: {},
  body: { title: "Desk", content: "Description" },
};

describe("gateway idempotency contract", () => {
  it("accepts bounded high-entropy-style keys and rejects weak/unsafe keys", () => {
    expect(validateIdempotencyKey(scope.key)).toBe(true);
    expect(validateIdempotencyKey("short-key")).toBe(false);
    expect(validateIdempotencyKey(`valid-prefix-${"a".repeat(130)}`)).toBe(
      false,
    );
    expect(validateIdempotencyKey("unsafe/key/value-123456")).toBe(false);
  });

  it("hashes canonical request material independent of object key order", () => {
    expect(canonicalGatewayJson({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
    expect(gatewayIdempotencyRequestHash(requestValue)).toBe(
      gatewayIdempotencyRequestHash({
        ...requestValue,
        body: { content: "Description", title: "Desk" },
      }),
    );
    expect(gatewayIdempotencyStorageKey(scope)).toMatch(
      /^nebula:gateway:idempotency:v1:[a-f0-9]{64}$/,
    );
    expect(gatewayIdempotencyStorageKey(scope)).not.toContain(scope.key);
  });

  it("claims, reports in-flight/conflict, completes, and replays atomically", async () => {
    const { service } = createService();
    const started = await service.begin(scope, requestValue);
    expect(started.kind).toBe("started");
    await expect(service.begin(scope, requestValue)).resolves.toEqual({
      kind: "in-progress",
    });
    await expect(
      service.begin(scope, {
        ...requestValue,
        body: { title: "Different request" },
      }),
    ).resolves.toEqual({ kind: "conflict" });

    if (started.kind !== "started") throw new Error("expected_started");
    await service.complete(started.lease, {
      status: 201,
      body: { data: { id: "product-1" }, requestId: "original-request" },
      headers: { location: "/api/v1/admin/products/product-1" },
    });

    await expect(service.begin(scope, requestValue)).resolves.toEqual({
      kind: "replay",
      response: {
        status: 201,
        body: { data: { id: "product-1" }, requestId: "original-request" },
        headers: { location: "/api/v1/admin/products/product-1" },
      },
    });
  });

  it("isolates application, actor, route, and key scope", () => {
    expect(gatewayIdempotencyStorageKey(scope)).not.toBe(
      gatewayIdempotencyStorageKey({ ...scope, actorId: "another-admin" }),
    );
    expect(gatewayIdempotencyStorageKey(scope)).not.toBe(
      gatewayIdempotencyStorageKey({
        ...scope,
        routeId: "admin.blog.posts.create",
      }),
    );
  });

  it("fails closed on corrupt state, lost leases, and oversized responses", async () => {
    const first = createService();
    first.redis.values.set(gatewayIdempotencyStorageKey(scope), "not-json");
    await expect(first.service.begin(scope, requestValue)).rejects.toThrow(
      "gateway_idempotency_state_invalid",
    );
    expect(decodeGatewayIdempotencyState("{}")).toBeNull();

    const second = createService();
    const started = await second.service.begin(scope, requestValue);
    if (started.kind !== "started") throw new Error("expected_started");
    second.redis.values.delete(started.lease.storageKey);
    await expect(
      second.service.complete(started.lease, {
        status: 201,
        body: { data: {} },
        headers: {},
      }),
    ).rejects.toThrow("gateway_idempotency_lease_lost");

    const third = createService(new FakeRedis(), 1024);
    const large = await third.service.begin(scope, requestValue);
    if (large.kind !== "started") throw new Error("expected_started");
    await expect(
      third.service.complete(large.lease, {
        status: 201,
        body: { data: "x".repeat(2000) },
        headers: {},
      }),
    ).rejects.toThrow("gateway_idempotency_response_too_large");
  });
});
