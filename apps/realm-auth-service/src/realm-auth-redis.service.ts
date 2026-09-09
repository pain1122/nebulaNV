import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RealmAuthRedisService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    this.redis = new Redis(config.getOrThrow<string>("REALM_AUTH_REDIS_URL"), {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });
  }

  async checkReadiness(): Promise<void> {
    if (this.redis.status === "wait") await this.redis.connect();
    await this.redis.ping();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis.status === "ready") await this.redis.quit();
    else this.redis.disconnect();
  }
}
