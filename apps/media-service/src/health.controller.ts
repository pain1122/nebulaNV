import { Controller } from "@nestjs/common";
import { type HealthProbe, StandardHealthController } from "@packages/config";
import { OperationalHealth, S2SReplayStore } from "@nebula/grpc-auth";
import { PrismaService } from "./prisma.service";
import { MediaService } from "./media.service";

@OperationalHealth()
@Controller("health")
export class HealthController extends StandardHealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
    private readonly replayStore: S2SReplayStore,
  ) {
    super("media-service");
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
        name: "storage",
        check: async () =>
          (await this.mediaService.checkStorageHealth()).status,
      },
      {
        name: "s2sReplay",
        check: () => this.replayStore.checkReadiness(),
      },
    ];
  }
}
