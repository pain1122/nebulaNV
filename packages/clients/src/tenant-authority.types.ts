import type { CallOptions, Metadata } from "@grpc/grpc-js";
import type { tenantauthorityv1 } from "@nebula/protos";
import type { Observable } from "rxjs";

export type ResolveApplicationRegistrationRequest = Omit<
  tenantauthorityv1.ResolveApplicationRegistrationRequest,
  "$type"
>;
export type ResolveApplicationRegistrationResponse =
  tenantauthorityv1.ResolveApplicationRegistrationResponse;
export type ListAllowedWebOriginsRequest = Omit<
  tenantauthorityv1.ListAllowedWebOriginsRequest,
  "$type"
>;
export type ListAllowedWebOriginsResponse =
  tenantauthorityv1.ListAllowedWebOriginsResponse;
export type ValidateTargetScopeRequest = Omit<
  tenantauthorityv1.ValidateTargetScopeRequest,
  "$type"
>;
export type ValidateTargetScopeResponse =
  tenantauthorityv1.ValidateTargetScopeResponse;
export type ResolveEntitlementScopeRefRequest = Omit<
  tenantauthorityv1.ResolveEntitlementScopeRefRequest,
  "$type"
>;
export type ResolveEntitlementScopeRefResponse =
  tenantauthorityv1.ResolveEntitlementScopeRefResponse;
export type ResolveActorAuthorizationRequest = Omit<
  tenantauthorityv1.ResolveActorAuthorizationRequest,
  "$type"
>;
export type ResolveActorAuthorizationResponse =
  tenantauthorityv1.ResolveActorAuthorizationResponse;

export interface TenantAuthorityProxy {
  ResolveApplicationRegistration(
    request: ResolveApplicationRegistrationRequest,
    metadata?: Metadata,
    options?: CallOptions,
  ): Observable<ResolveApplicationRegistrationResponse>;
  ListAllowedWebOrigins(
    request: ListAllowedWebOriginsRequest,
    metadata?: Metadata,
    options?: CallOptions,
  ): Observable<ListAllowedWebOriginsResponse>;
  ValidateTargetScope(
    request: ValidateTargetScopeRequest,
    metadata?: Metadata,
    options?: CallOptions,
  ): Observable<ValidateTargetScopeResponse>;
  ResolveEntitlementScopeRef(
    request: ResolveEntitlementScopeRefRequest,
    metadata?: Metadata,
    options?: CallOptions,
  ): Observable<ResolveEntitlementScopeRefResponse>;
  ResolveActorAuthorization(
    request: ResolveActorAuthorizationRequest,
    metadata?: Metadata,
    options?: CallOptions,
  ): Observable<ResolveActorAuthorizationResponse>;
}
