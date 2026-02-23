import {CanActivate, ExecutionContext, Injectable} from "@nestjs/common"
import {Reflector} from "@nestjs/core"
import {RpcException} from "@nestjs/microservices"
import {status, Metadata} from "@grpc/grpc-js"
import {PublicFlags, PUBLIC_FLAGS_KEY, IS_PUBLIC_KEY} from "./public.decorator"
import {resolveS2SSignHeader, resolveAllowedServices, X_SVC_HEADER, resolveInboundInterserviceSecrets, resolveInboundGatewaySecrets, resolveGatewayServiceNames} from "./tokens"
import {deriveServiceSecret, signS2S, minuteBucket, S2S_METHOD_CANONICAL, S2S_PATH_CANONICAL} from "./s2s.crypto"

@Injectable()
export class S2SGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    // 1️⃣ Skip if marked @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler?.(), ctx.getClass?.()]) ?? false

    const publicFlags = this.reflector.getAllAndOverride<PublicFlags>(PUBLIC_FLAGS_KEY, [ctx.getHandler?.(), ctx.getClass?.()]) ?? {}

    const requireS2S = !isPublic || publicFlags.gatewayOnly === true
    if (!requireS2S) return true

    const meta = ctx.getArgByIndex?.(1) as Metadata | undefined
    if (!meta) return this.deny(ctx, "missing_metadata")

    const header = resolveS2SSignHeader()
    const sig = (meta.get?.(header)?.[0] as string) || ""
    if (!sig) return this.deny(ctx, "missing_signature")
    const svc = (meta.get?.(X_SVC_HEADER)?.[0] as string) || ""
    if (!svc) return this.deny(ctx, "missing_service_name")

    const allowed = resolveAllowedServices()
    if (allowed.length > 0 && !allowed.includes(svc)) {
      return this.deny(ctx, "service_not_allowed")
    }
    const gatewayCallers = resolveGatewayServiceNames()
    const isGatewayCaller = gatewayCallers.includes(svc)

    const secrets = isGatewayCaller ? resolveInboundGatewaySecrets() : resolveInboundInterserviceSecrets()

    if (!secrets.length) {
      return this.deny(ctx, isGatewayCaller ? "gateway_secret_not_configured" : "s2s_not_configured")
    }

    const now = minuteBucket()

    for (const master of secrets) {
      const derived = deriveServiceSecret(master, svc)

      const candidates = [signS2S(derived, svc, S2S_METHOD_CANONICAL, S2S_PATH_CANONICAL, now), signS2S(derived, svc, S2S_METHOD_CANONICAL, S2S_PATH_CANONICAL, now - 1)]
      if (candidates.includes(sig)) {
        this.attachSvc(ctx, svc)
        return true
      }
    }

    return this.deny(ctx, "invalid_s2s_signature")
  }

  /**
   * Utility: throw context-appropriate exceptions
   */
  private deny(ctx: ExecutionContext, message: string): never {
    const type = ctx.getType<"http" | "rpc">()
    if (type === "rpc") {
      throw new RpcException({code: status.UNAUTHENTICATED, message})
    }
    throw new RpcException({code: status.UNAUTHENTICATED, message: "invalid_s2s_signature"})
  }

  private attachSvc(ctx: ExecutionContext, svc: string): void {
    const req = ctx.switchToHttp().getRequest?.()
    if (req) (req as any).svc = svc

    const meta = ctx.getArgByIndex?.(1) as any
    if (meta) meta.svc = svc

    const call = ctx.switchToRpc().getContext?.()
    if (call) (call as any).svc = svc
    ;(ctx as any).svc = svc
  }
}
