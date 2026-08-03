import { Get, ServiceUnavailableException } from "@nestjs/common";

export type HealthCheckStatus = "ok" | "skipped" | "error";

export type HealthProbe = {
  name: string;
  check: () => HealthCheckStatus | void | Promise<HealthCheckStatus | void>;
};

export type HealthResponse = {
  status: "ok" | "degraded";
  service: string;
  time: string;
  checks: Record<string, { status: HealthCheckStatus }>;
};

export async function runReadinessChecks(
  service: string,
  probes: readonly HealthProbe[],
): Promise<HealthResponse> {
  const entries = await Promise.all(
    probes.map(async (probe) => {
      try {
        const status = await probe.check();
        return [probe.name, { status: status ?? "ok" }] as const;
      } catch {
        return [probe.name, { status: "error" as const }] as const;
      }
    }),
  );
  const checks = Object.fromEntries(entries);
  const status = Object.values(checks).some((check) => check.status === "error")
    ? "degraded"
    : "ok";

  return {
    status,
    service,
    time: new Date().toISOString(),
    checks,
  };
}

export abstract class StandardHealthController {
  protected constructor(private readonly serviceName: string) {}

  protected abstract readinessProbes(): readonly HealthProbe[];

  @Get("live")
  liveness() {
    return {
      status: "ok" as const,
      service: this.serviceName,
      time: new Date().toISOString(),
    };
  }

  @Get()
  readiness() {
    return this.resolveReadiness();
  }

  @Get("ready")
  readinessExplicit() {
    return this.resolveReadiness();
  }

  private async resolveReadiness(): Promise<HealthResponse> {
    const response = await runReadinessChecks(
      this.serviceName,
      this.readinessProbes(),
    );

    if (response.status === "degraded") {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }
}
