import {CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException, Inject, OnModuleInit} from "@nestjs/common"
import {Reflector} from "@nestjs/core"
import {ClientGrpc} from "@nestjs/microservices"
import {firstValueFrom, Observable} from "rxjs"
import type {Metadata} from "@grpc/grpc-js"

import {ROLES_KEY, Role} from "./roles.decorator"
import {AUTH_SERVICE, AUTH_SERVICE_NAME} from "./tokens"
import {authv1} from "@nebula/protos"

export type PublicMode = "OPEN" | "GATEWAY_ONLY" | "OPTIONAL_AUTH"

interface AuthGrpc {
  validateToken(req: authv1.ValidateTokenRequest, meta?: Metadata): Observable<authv1.ValidateTokenResponse>
}

@Injectable()
export class GrpcTokenAuthGuard implements CanActivate, OnModuleInit {
  private auth!: AuthGrpc

  private extractToken(ctx: ExecutionContext): string | null {
    const httpReq = ctx.switchToHttp().getRequest?.()
    let token = this.parseBearer(httpReq?.headers?.authorization)
    if (!token) {
      const meta = ctx.getArgByIndex?.(1) as Metadata | undefined
      token = this.parseBearer(meta?.get?.("authorization")?.[0] as string)
    }
    return token
  }

  private async attachUserFromToken(ctx: ExecutionContext, token: string) {
    const res = await firstValueFrom(this.auth.validateToken(authv1.ValidateTokenRequest.create({token})))
    if (!res.isValid) throw new UnauthorizedException("Invalid or expired token")
    const user = {userId: res.userId, email: res.email, role: res.role}
    const httpReq = ctx.switchToHttp().getRequest?.()
    if (httpReq) (httpReq as any).user = user
    else (ctx.switchToRpc().getContext() as any).user = user
  }

  private attachAnonymous(ctx: ExecutionContext) {
    const anon = {userId: null, role: "guest"}
    const httpReq = ctx.switchToHttp().getRequest?.()
    if (httpReq) (httpReq as any).user = anon
    else (ctx.switchToRpc().getContext() as any).user = anon
  }

  private verifyGateway(ctx: ExecutionContext): boolean {
    const meta = ctx.getArgByIndex?.(1) as Metadata | undefined
    const sig = meta?.get?.(process.env.GATEWAY_HEADER ?? "x-gateway-sign")?.[0] as string
    if (!sig || !process.env.GATEWAY_SECRET) return false

    const crypto = require("crypto")
    const payload = `${(Date.now() / 60000) | 0}` // current minute bucket
    const expected = crypto.createHmac("sha256", process.env.GATEWAY_SECRET).update(payload).digest("hex")
    return sig === expected
  }

  constructor(
    @Inject(AUTH_SERVICE) private readonly client: ClientGrpc,
    private readonly reflector: Reflector
  ) {
    this.publicMode = (process.env.PUBLIC_MODE as PublicMode) || "OPEN"
  }
  private readonly publicMode: PublicMode

  onModuleInit() {
    this.auth = this.client.getService<AuthGrpc>(AUTH_SERVICE_NAME)
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    /** ---------- 0) Skip completely if @Public() ---------- */
    const isPublic = this.reflector.getAllAndOverride<boolean>("isPublic", [ctx.getHandler?.(), ctx.getClass?.()])

    if (isPublic) {
      if (this.publicMode === "OPEN") {
        // current behavior
        return true
      }

      if (this.publicMode === "OPTIONAL_AUTH") {
        const token = this.extractToken(ctx)
        if (token) await this.attachUserFromToken(ctx, token)
        else this.attachAnonymous(ctx)
        return true // <-- important
      }

      if (this.publicMode === "GATEWAY_ONLY") {
        if (this.verifyGateway(ctx)) {
          this.attachAnonymous(ctx)
          return true
        }
        const token = this.extractToken(ctx)
        if (token) {
          await this.attachUserFromToken(ctx, token)
          return true
        }
        // No gateway & no token → reject
        throw new UnauthorizedException("Public endpoint requires gateway or token")
      }
    }

    const token = this.extractToken(ctx)
    if (!token) throw new UnauthorizedException("Missing Bearer token")

    await this.attachUserFromToken(ctx, token)

    const user = (ctx.switchToHttp().getRequest?.() as any)?.user ?? (ctx.switchToRpc().getContext() as any)?.user

    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [ctx.getHandler?.(), ctx.getClass?.()]) ?? []
    if (required.length && !required.includes(user.role as Role)) {
      throw new ForbiddenException("Insufficient role")
    }

    return true
  }

  private parseBearer(h?: string | null): string | null {
    if (!h) return null
    const [type, val] = h.split(" ")
    return type?.toLowerCase() === "bearer" && val ? val : null
  }
}
