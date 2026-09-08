import { Controller } from "@nestjs/common";
import { OperationalHealth, S2SReplayStore } from "@nebula/grpc-auth";
import { StandardHealthController, type HealthProbe } from "@packages/config";
import { AuthorityService } from "./authority/authority.service";

@OperationalHealth()
@Controller("health")
export class HealthController extends StandardHealthController {
  constructor(
    private readonly authority: AuthorityService,
    private readonly replayStore: S2SReplayStore,
  ) {
    super("tenant-authority-service");
  }

  protected readinessProbes(): readonly HealthProbe[] {
    return [
      {
        name: "databaseMigration",
        check: () => this.authority.checkReadiness(),
      },
      {
        name: "s2sReplay",
        check: () => this.replayStore.checkReadiness(),
      },
    ];
  }
}
