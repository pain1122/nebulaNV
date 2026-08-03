import { createHash } from "node:crypto";
import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { ENV_S2S_REPLAY_STORE } from "./tokens";

type ReplayMode = "memory" | "redis";

function replayMode(): ReplayMode {
  const configured = process.env[ENV_S2S_REPLAY_STORE]?.toLowerCase();
  if (configured === "memory" || configured === "redis") return configured;
  return process.env.NODE_ENV === "test" ? "memory" : "redis";
}

@Injectable()
export class S2SReplayStore implements OnModuleDestroy {
  private readonly mode = replayMode();
  private readonly memory = new Map<string, number>();
  private redis?: Redis;

  async claim(fingerprint: string, ttlMs: number): Promise<boolean> {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) return false;
    const key = createHash("sha256").update(fingerprint).digest("hex");
    return this.mode === "memory"
      ? this.claimMemory(key, ttlMs)
      : this.claimRedis(key, ttlMs);
  }

  private claimMemory(key: string, ttlMs: number): boolean {
    const now = Date.now();
    const existing = this.memory.get(key);
    if (existing && existing > now) return false;
    this.memory.set(key, now + ttlMs);

    if (this.memory.size > 10_000) {
      for (const [candidate, expiresAt] of this.memory) {
        if (expiresAt <= now) this.memory.delete(candidate);
      }
      while (this.memory.size > 10_000) {
        const oldest = this.memory.keys().next().value;
        if (!oldest) break;
        this.memory.delete(oldest);
      }
    }
    return true;
  }

  private getRedis(): Redis {
    if (this.redis) return this.redis;

    const common = {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 3_000,
    } as const;
    const url = process.env.S2S_REPLAY_REDIS_URL?.trim();
    this.redis = url
      ? new Redis(url, common)
      : new Redis({
          ...common,
          host: process.env.REDIS_HOST?.trim() || "127.0.0.1",
          port: Number(process.env.REDIS_PORT ?? 6379),
          password: process.env.REDIS_PASSWORD || undefined,
          db: Number(process.env.S2S_REPLAY_REDIS_DB ?? 0),
        });
    return this.redis;
  }

  private async claimRedis(key: string, ttlMs: number): Promise<boolean> {
    const redis = this.getRedis();
    if (redis.status === "wait") await redis.connect();
    const result = await redis.set(
      `nebula:s2s:replay:v2:${key}`,
      "1",
      "PX",
      Math.ceil(ttlMs),
      "NX",
    );
    return result === "OK";
  }

  async checkReadiness(): Promise<void> {
    if (this.mode === "memory") return;

    const redis = this.getRedis();
    if (redis.status === "wait") await redis.connect();
    await redis.ping();
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.redis) return;
    if (this.redis.status === "ready") await this.redis.quit();
    else this.redis.disconnect();
  }
}
