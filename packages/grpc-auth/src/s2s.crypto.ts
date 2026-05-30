import crypto from "crypto";

export function deriveServiceSecret(
  masterSecret: string,
  serviceName: string,
): string {
  return crypto
    .createHmac("sha256", masterSecret)
    .update(`svc:${serviceName}`)
    .digest("hex");
}

export function signS2S(
  secret: string,
  svc: string,
  method: string,
  path: string,
  minute: number,
): string {
  const payload = `${svc}:${method}:${path}:${minute}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function minuteBucket(): number {
  return Math.floor(Date.now() / 60000);
}

export const S2S_METHOD_CANONICAL = "grpc";
export const S2S_PATH_CANONICAL = "service";
