import type {
  INestApplication,
  INestMicroservice,
  Provider,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { ServiceDefinition } from "@grpc/grpc-js";
import { GrpcErrorFilter } from "./grpc-error.util";
import { GrpcTokenAuthGuard } from "./grpc-token-auth.guard";
import { S2SGuard } from "./s2s.guard";
import { S2SReplayStore } from "./s2s-replay.store";
import { createS2SServerInterceptor } from "./s2s.transport";
import { assertS2SRuntimeConfiguration } from "./tokens";

export const GRPC_SECURITY_PROVIDERS: Provider[] = [
  // Keep the provider bundle self-contained. Feature/root module visibility of
  // Nest's internal Reflector provider is not consistent across app layouts.
  Reflector,
  S2SReplayStore,
  S2SGuard,
  GrpcTokenAuthGuard,
];

export function grpcS2SServerChannelOptions(
  ...serviceDefinitions: ReadonlyArray<ServiceDefinition>
): Record<string, unknown> {
  return {
    interceptors: [createS2SServerInterceptor(serviceDefinitions)],
  };
}

/**
 * Preserve omission semantics for application DTO validation. The S2S digest
 * separately materializes generated protobuf defaults before hashing, so the
 * transport must not turn every omitted optional scalar into an explicit
 * empty value.
 */
export function grpcS2SProtoLoaderOptions(): { defaults: false } {
  return { defaults: false };
}

/** Apply the one canonical identity order to a Nest gRPC listener. */
export function applyGrpcSecurity(
  app: INestApplication,
  microservice: INestMicroservice,
): void {
  assertS2SRuntimeConfiguration();
  microservice.useGlobalGuards(app.get(S2SGuard), app.get(GrpcTokenAuthGuard));
  microservice.useGlobalFilters(new GrpcErrorFilter());

  // connectMicroservice({ ... }, { deferInitialization: true }) is required so
  // guards exist before Nest builds handler chains. The HTTP app owns module
  // lifecycle hooks, so suppress the deferred microservice's duplicate pass.
  const deferred = microservice as INestMicroservice & {
    setIsInitHookCalled?: (value: boolean) => void;
  };
  if (typeof deferred.setIsInitHookCalled !== "function") {
    throw new Error("grpc_deferred_initialization_contract_unavailable");
  }
  deferred.setIsInitHookCalled(true);
}

/** Configure a deferred hybrid listener, initialize once, then expose gRPC. */
export async function startSecuredGrpc(
  app: INestApplication,
  microservice: INestMicroservice,
): Promise<void> {
  applyGrpcSecurity(app, microservice);
  await app.init();
  await app.startAllMicroservices();
}
