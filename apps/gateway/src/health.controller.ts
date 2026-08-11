import { Controller } from "@nestjs/common";
import { StandardHealthController, type HealthProbe } from "@packages/config";
import { GatewayReadinessService } from "./gateway-readiness.service";
import { Public } from "@nebula/grpc-auth";

@Public()
@Controller("health")
export class HealthController extends StandardHealthController {
  constructor(private readonly gatewayReadiness: GatewayReadinessService) {
    super("gateway");
  }

  protected readinessProbes(): readonly HealthProbe[] {
    return this.gatewayReadiness.probes();
  }
}
