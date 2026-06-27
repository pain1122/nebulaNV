import { Controller, Get } from "@nestjs/common";
import { Public } from "@nebula/grpc-auth";
import { PrismaService } from "./prisma.service";
import { MediaService } from "./media.service";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type HealthCheck = {
  status: "ok" | "skipped" | "error";
  error?: string;
  driver?: string;
  provider?: string;
  bucket?: string;
};

@Public()
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  @Get()
  async check() {
    const checks: { db: HealthCheck; storage: HealthCheck } = {
      db: { status: "ok" as const },
      storage: await this.checkStorage(),
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error: unknown) {
      checks.db = {
        status: "error" as const,
        error: errorMessage(error),
      };
    }

    const status =
      checks.db.status === "ok" &&
      (checks.storage.status === "ok" || checks.storage.status === "skipped")
        ? "ok"
        : "degraded";

    return { status, time: new Date().toISOString(), checks };
  }

  private async checkStorage() {
    try {
      return await this.mediaService.checkStorageHealth();
    } catch (error: unknown) {
      return {
        status: "error" as const,
        error: errorMessage(error),
      };
    }
  }
}
