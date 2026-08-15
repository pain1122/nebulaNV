import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import {
  canonicalGatewayJson,
  decodeGatewayIdempotencyState,
  gatewayIdempotencyRequestHash,
  gatewayIdempotencyStorageKey,
  type GatewayIdempotencyRequest,
  type GatewayIdempotencyScope,
  type GatewayInFlightIdempotencyState,
  type GatewayStoredResponse,
} from "../contracts/idempotency";
import { GatewayRedisService } from "./gateway-redis.service";

const COMPLETE_IF_LEASE_MATCHES = `
local current = redis.call("GET", KEYS[1])
if current ~= ARGV[1] then return 0 end
redis.call("SET", KEYS[1], ARGV[2], "EX", ARGV[3])
return 1
`;

export type GatewayIdempotencyLease = Readonly<{
  storageKey: string;
  requestHash: string;
  serializedInFlight: string;
}>;

export type GatewayIdempotencyBeginResult =
  | Readonly<{ kind: "started"; lease: GatewayIdempotencyLease }>
  | Readonly<{ kind: "in-progress" }>
  | Readonly<{ kind: "conflict" }>
  | Readonly<{ kind: "replay"; response: GatewayStoredResponse }>;

@Injectable()
export class GatewayIdempotencyService {
  private readonly completedTtlSeconds: number;
  private readonly inFlightTtlSeconds: number;
  private readonly maxResponseBytes: number;

  constructor(
    config: ConfigService,
    private readonly gatewayRedis: GatewayRedisService,
  ) {
    this.completedTtlSeconds = config.getOrThrow<number>(
      "GATEWAY_IDEMPOTENCY_TTL_SECONDS",
    );
    this.inFlightTtlSeconds = config.getOrThrow<number>(
      "GATEWAY_IDEMPOTENCY_IN_FLIGHT_TTL_SECONDS",
    );
    this.maxResponseBytes = config.getOrThrow<number>(
      "GATEWAY_IDEMPOTENCY_MAX_RESPONSE_BYTES",
    );
  }

  async begin(
    scope: GatewayIdempotencyScope,
    request: GatewayIdempotencyRequest,
  ): Promise<GatewayIdempotencyBeginResult> {
    const storageKey = gatewayIdempotencyStorageKey(scope);
    const requestHash = gatewayIdempotencyRequestHash(request);
    const state: GatewayInFlightIdempotencyState = Object.freeze({
      version: 1,
      state: "in-flight",
      requestHash,
      leaseId: randomUUID(),
      startedAt: new Date().toISOString(),
    });
    const serializedInFlight = canonicalGatewayJson(state);
    const redis = this.gatewayRedis.client();

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const claimed = await redis.set(
        storageKey,
        serializedInFlight,
        "EX",
        this.inFlightTtlSeconds,
        "NX",
      );
      if (claimed === "OK") {
        return {
          kind: "started",
          lease: Object.freeze({ storageKey, requestHash, serializedInFlight }),
        };
      }

      const existingValue = await redis.get(storageKey);
      if (existingValue === null) continue;
      const existing = decodeGatewayIdempotencyState(existingValue);
      if (!existing) throw new Error("gateway_idempotency_state_invalid");
      if (existing.requestHash !== requestHash) return { kind: "conflict" };
      if (existing.state === "in-flight") return { kind: "in-progress" };
      return { kind: "replay", response: existing.response };
    }
    throw new Error("gateway_idempotency_claim_race");
  }

  async complete(
    lease: GatewayIdempotencyLease,
    response: GatewayStoredResponse,
  ): Promise<void> {
    const completed = canonicalGatewayJson({
      version: 1,
      state: "completed",
      requestHash: lease.requestHash,
      response,
      completedAt: new Date().toISOString(),
    });
    if (Buffer.byteLength(completed, "utf8") > this.maxResponseBytes) {
      throw new Error("gateway_idempotency_response_too_large");
    }

    const result = await this.gatewayRedis
      .client()
      .eval(
        COMPLETE_IF_LEASE_MATCHES,
        1,
        lease.storageKey,
        lease.serializedInFlight,
        completed,
        String(this.completedTtlSeconds),
      );
    if (result !== 1) throw new Error("gateway_idempotency_lease_lost");
  }
}
