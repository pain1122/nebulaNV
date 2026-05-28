import { Controller, Get } from "@nestjs/common";
import { PrismaClient } from "../prisma/generated/client";
import { Public } from "@nebula/grpc-auth";

const prisma = new PrismaClient();

@Public()
@Controller("health")
export class HealthController {
  @Get()
  async check() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: "ok", db: "up", time: new Date().toISOString() };
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : "unknown_error";
      return { status: "degraded", db: "down", error };
    }
  }
}
