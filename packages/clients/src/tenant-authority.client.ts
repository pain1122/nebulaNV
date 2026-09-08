import type { ClientGrpc } from "@nestjs/microservices";
import { TENANT_AUTHORITY_SERVICE_TARGET } from "@nebula/grpc-auth";
import { tenantauthorityv1 } from "@nebula/protos";
import {
  createSignedGrpcUnary,
  type GrpcClientSigningPolicy,
  type RawGrpcUnary,
} from "./s2s-metadata";
import type { TenantAuthorityProxy } from "./tenant-authority.types";

type Raw = {
  ResolveApplicationRegistration: RawGrpcUnary<
    tenantauthorityv1.ResolveApplicationRegistrationRequest,
    tenantauthorityv1.ResolveApplicationRegistrationResponse
  >;
  ListAllowedWebOrigins: RawGrpcUnary<
    tenantauthorityv1.ListAllowedWebOriginsRequest,
    tenantauthorityv1.ListAllowedWebOriginsResponse
  >;
  ValidateTargetScope: RawGrpcUnary<
    tenantauthorityv1.ValidateTargetScopeRequest,
    tenantauthorityv1.ValidateTargetScopeResponse
  >;
  ResolveEntitlementScopeRef: RawGrpcUnary<
    tenantauthorityv1.ResolveEntitlementScopeRefRequest,
    tenantauthorityv1.ResolveEntitlementScopeRefResponse
  >;
  ResolveActorAuthorization: RawGrpcUnary<
    tenantauthorityv1.ResolveActorAuthorizationRequest,
    tenantauthorityv1.ResolveActorAuthorizationResponse
  >;
};

export function getTenantAuthority(
  client: ClientGrpc,
  signingPolicy?: GrpcClientSigningPolicy,
): TenantAuthorityProxy {
  const raw = client.getService<Raw>("TenantAuthorityService");
  const common = {
    policy: signingPolicy,
    target: TENANT_AUTHORITY_SERVICE_TARGET,
  };
  return {
    ResolveApplicationRegistration: createSignedGrpcUnary({
      ...common,
      method: raw.ResolveApplicationRegistration.bind(raw),
      definition:
        tenantauthorityv1.TenantAuthorityServiceService
          .resolveApplicationRegistration,
    }),
    ListAllowedWebOrigins: createSignedGrpcUnary({
      ...common,
      method: raw.ListAllowedWebOrigins.bind(raw),
      definition:
        tenantauthorityv1.TenantAuthorityServiceService.listAllowedWebOrigins,
    }),
    ValidateTargetScope: createSignedGrpcUnary({
      ...common,
      method: raw.ValidateTargetScope.bind(raw),
      definition:
        tenantauthorityv1.TenantAuthorityServiceService.validateTargetScope,
    }),
    ResolveEntitlementScopeRef: createSignedGrpcUnary({
      ...common,
      method: raw.ResolveEntitlementScopeRef.bind(raw),
      definition:
        tenantauthorityv1.TenantAuthorityServiceService
          .resolveEntitlementScopeRef,
    }),
    ResolveActorAuthorization: createSignedGrpcUnary({
      ...common,
      method: raw.ResolveActorAuthorization.bind(raw),
      definition:
        tenantauthorityv1.TenantAuthorityServiceService
          .resolveActorAuthorization,
    }),
  };
}
