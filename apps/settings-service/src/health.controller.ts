import { Controller } from "@nestjs/common";
import { type HealthProbe, StandardHealthController } from "@packages/config";
import { Public, S2SReplayStore } from "@nebula/grpc-auth";
import { PrismaService } from "./prisma.service";

@Public()
@Controller("health")
export class HealthController extends StandardHealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly replayStore: S2SReplayStore,
  ) {
    super("settings-service");
  }

  protected readinessProbes(): readonly HealthProbe[] {
    return [
      {
        name: "database",
        check: async () => {
          await this.prisma.$queryRaw`SELECT 1`;
        },
      },
      {
        name: "s2sReplay",
        check: () => this.replayStore.checkReadiness(),
      },
    ];
  }
}
