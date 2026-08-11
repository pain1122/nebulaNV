import {
  Injectable,
  Inject,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { getAuth } from "@nebula/clients";
import {
  AUTH_SERVICE,
  AUTH_SERVICE_TARGET,
  GATEWAY_CALLER_ID,
  resolveOutboundS2SKey,
  wrapGrpc,
  type S2SSignedContext,
} from "@nebula/grpc-auth";
import { actorFromVerifiedAuth } from "../application/application-context";
import type {
  AuthenticatedActorState,
  GatewayRequestContext,
} from "../application/application.contracts";

function signedApplicationContext(
  context: GatewayRequestContext,
): S2SSignedContext {
  return Object.freeze({
    version: "1" as const,
    applicationId: context.applicationId,
    tenantId: context.tenantId,
    siteId: context.siteId,
    channelId: context.channelId,
  });
}

@Injectable()
export class GatewayAuthResolver {
  constructor(@Inject(AUTH_SERVICE) private readonly authClient: ClientGrpc) {}

  async resolve(
    token: string,
    requestContext: GatewayRequestContext,
  ): Promise<AuthenticatedActorState | null> {
    const key = resolveOutboundS2SKey("gateway", AUTH_SERVICE_TARGET);
    if (!key) {
      throw new ServiceUnavailableException("gateway_auth_trust_unavailable");
    }

    const request = { token };
    const response = await wrapGrpc(
      firstValueFrom(
        getAuth(this.authClient, {
          kind: "gateway",
          serviceName: GATEWAY_CALLER_ID,
          key,
          requestId: requestContext.requestId,
          context: signedApplicationContext(requestContext),
        }).ValidateToken(request),
      ),
    );
    if (!response.isValid) return null;

    try {
      return actorFromVerifiedAuth({
        userId: response.userId,
        role: response.role as "user" | "admin" | "root-admin",
        sessionRef: response.sessionRef,
      });
    } catch {
      throw new UnauthorizedException("auth_identity_invalid");
    }
  }
}
