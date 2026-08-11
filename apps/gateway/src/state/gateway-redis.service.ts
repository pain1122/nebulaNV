import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class GatewayRedisService implements OnModuleDestroy {
  private readonly readinessTimeoutMs: number;
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    this.readinessTimeoutMs = config.getOrThrow<number>(
      "GATEWAY_READINESS_TIMEOUT_MS",
    );
    this.redis = new Redis(config.getOrThrow<string>("GATEWAY_REDIS_URL"), {
      lazyConnect: true,
      connectTimeout: this.readinessTimeoutMs,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });
    this.redis.on("error", () => {
      // Readiness reports only a sanitized state. Connection errors are not
      // logged here because their details can contain Redis credentials.
    });
  }

  /** The single gateway-owned Redis connection for stateful gateway features. */
  client(): Redis {
    return this.redis;
  }

  async readiness(): Promise<void> {
    try {
      if (this.redis.status === "wait" || this.redis.status === "end") {
        await this.withTimeout(this.redis.connect());
      }
      const pong = await this.withTimeout(this.redis.ping());
      if (pong !== "PONG") throw new Error("gateway_redis_not_ready");
    } catch {
      // Stop background retry after the bounded readiness deadline. A later
      // probe may establish a fresh connection when Redis recovers.
      this.redis.disconnect(false);
      throw new Error("gateway_redis_not_ready");
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis.status === "wait" || this.redis.status === "end") return;
    try {
      await this.redis.quit();
    } catch {
      this.redis.disconnect(false);
    }
  }

  private async withTimeout<T>(operation: Promise<T>): Promise<T> {
    let timeout: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        operation,
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(
            () => reject(new Error("gateway_redis_readiness_timeout")),
            this.readinessTimeoutMs,
          );
          timeout.unref?.();
        }),
      ]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
}
