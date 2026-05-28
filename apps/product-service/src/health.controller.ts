import { Controller, Get } from "@nestjs/common";
import { PrismaClient } from "../prisma/generated/client";
import { Public } from "@nebula/grpc-auth";
import { errorMessage } from "./error.utils";

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
      return { status: "degraded", db: "down", error: errorMessage(e) };
    }
  }
}
