import { Injectable } from "@nestjs/common";
import type { HealthCheckStatus, HealthProbe } from "@packages/config";

@Injectable()
export class GatewayReadinessService {
  probes(): readonly HealthProbe[] {
    return [
      {
        name: "configuration",
        check: (): HealthCheckStatus => "ok",
      },
    ];
  }
}
