import { Controller, Get } from "@nestjs/common";
import { Public } from "@nebula/grpc-auth";

@Public()
@Controller("health")
export class HealthController {
  @Get()
  check() {
    return { status: "ok", time: new Date().toISOString() };
  }
}
