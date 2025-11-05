import { Metadata } from "@grpc/grpc-js";
import * as crypto from "crypto";

function sign(secret: string, svc: string, bucket: number): string {
  return crypto.createHmac("sha256", secret).update(`${svc}:${bucket}`).digest("hex");
}

export function getSignedMetadata(
  svcName = process.env.SVC_NAME ?? "unknown",
  secret = process.env.S2S_SECRET ?? process.env.GATEWAY_SECRET ?? ""
) {
  const md = new Metadata();
  md.set("x-svc", svcName);
  const bucket = Math.floor(Date.now() / 60000);
  const sig = sign(secret, svcName, bucket);
  md.set(process.env.GATEWAY_HEADER ?? "x-gateway-sign", sig);
  return md;
}
