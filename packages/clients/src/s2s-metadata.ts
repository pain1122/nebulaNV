import { Metadata } from "@grpc/grpc-js";
import {
  resolveServiceName,
  selectOutboundS2SSecret,
  signS2S,
  minuteBucket,
  deriveServiceSecret,
  S2S_METHOD_CANONICAL,
  S2S_PATH_CANONICAL,
} from "@nebula/grpc-auth";

export function getSignedMetadata(
  kind: "interservice" | "gateway" = "interservice",
) {
  const md = new Metadata();

  const svc = resolveServiceName();
  md.set("x-svc", svc);

  const secret = selectOutboundS2SSecret(kind);
  if (!secret) throw new Error("Missing outbound S2S secret");

  const bucket = minuteBucket();
  const derived = deriveServiceSecret(secret, svc);
  const sig = signS2S(
    derived,
    svc,
    S2S_METHOD_CANONICAL,
    S2S_PATH_CANONICAL,
    bucket,
  );

  md.set(process.env.GATEWAY_HEADER ?? "x-gateway-sign", sig);

  return md;
}
