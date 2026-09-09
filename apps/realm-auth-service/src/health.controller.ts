import { Controller } from "@nestjs/common";
import { StandardHealthController, type HealthProbe } from "@packages/config";
import { RealmAuthRedisService } from "./realm-auth-redis.service";
import { RealmBoundaryService } from "./realm-boundary.service";

@Controller("health")
export class HealthController extends StandardHealthController {
  constructor(
    private readonly boundary: RealmBoundaryService,
    private readonly redis: RealmAuthRedisService,
  ) {
    super("realm-auth-service");
  }

  protected readinessProbes(): readonly HealthProbe[] {
    return [
      { name: "shadowBoundary", check: () => this.boundary.checkReadiness() },
      { name: "realmRedis", check: () => this.redis.checkReadiness() },
    ];
  }
}
