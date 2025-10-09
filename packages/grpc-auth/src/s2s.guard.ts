import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Metadata } from "@grpc/grpc-js";
import * as crypto from "crypto";

function hmac(secret: string, svc: string, bucket: number): string {
  return crypto.createHmac("sha256", secret).update(`${svc}:${bucket}`).digest("hex");
}

type PublicMode = "OPEN" | "OPTIONAL_AUTH" | "GATEWAY_ONLY";

@Injectable()
export class S2SGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const mode = (process.env.PUBLIC_MODE || "GATEWAY_ONLY").toUpperCase() as PublicMode;

    // Honor @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>("isPublic", [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    // Dev bypass
    if (mode === "OPEN") return true;

    // (Optional) You can allow specific controllers in OPTIONAL_AUTH
    // if (mode === "OPTIONAL_AUTH" && ctx.getClass().name.includes("SettingsGrpcController")) return true;

    // Enforce signature
    const meta = ctx.getArgByIndex?.(1) as Metadata | undefined;
    if (!meta) throw new UnauthorizedException("missing_metadata");

    const header = process.env.GATEWAY_HEADER ?? "x-gateway-sign";
    const sig = (meta.get?.(header)?.[0] as string) || "";
    const svc = (meta.get?.("x-svc")?.[0] as string) || "";
    const secret = process.env.S2S_SECRET ?? process.env.GATEWAY_SECRET;

    // quick visibility during debugging
    // console.log("[S2SGuard]", { sig: sig?.slice(0,10), svc, hasSecret: !!secret, mode });

    if (!sig || !svc) throw new UnauthorizedException("missing_s2s_signature");
    if (!secret) throw new UnauthorizedException("s2s_not_configured");

    const nowBucket = Math.floor(Date.now() / 60000);
    const expectedNow  = hmac(secret, svc, nowBucket);
    const expectedPrev = hmac(secret, svc, nowBucket - 1);

    if (sig !== expectedNow && sig !== expectedPrev) {
      throw new UnauthorizedException("invalid_s2s_signature");
    }
    return true;
  }
}
