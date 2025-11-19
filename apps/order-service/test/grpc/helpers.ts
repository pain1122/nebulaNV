// apps/order-service/test/grpc/helpers.ts
import * as crypto from "crypto";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

export const AUTHORIZATION_HEADER = "authorization";
export const X_SVC_HEADER = "x-svc";
export const X_USER_ID_HEADER = "x-user-id";
export const X_ROLE_HEADER = "x-role";
export const X_SIGN_HEADER = "x-gateway-sign";

export function minuteBucket(): number {
  return Math.floor(Date.now() / 60000);
}

export function hmac(secret: string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function mdBearer(token?: string): grpc.Metadata {
  const md = new grpc.Metadata();
  if (token) md.set(AUTHORIZATION_HEADER, `Bearer ${token}`);
  return md;
}

export function mdS2S(opts?: { svc?: string; userId?: string; role?: string }): grpc.Metadata {
  const md = new grpc.Metadata();
  const svcName = opts?.svc || process.env.SVC_NAME || "order-service";
  const header = process.env.GATEWAY_HEADER || X_SIGN_HEADER;
  const secret = process.env.S2S_SECRET || "";

  const payload = `${svcName}:${minuteBucket()}`;
  const sign = hmac(secret, payload);

  md.set(X_SVC_HEADER, svcName);
  md.set(header, sign);

  if (opts?.userId) md.set(X_USER_ID_HEADER, opts.userId);
  if (opts?.role) md.set(X_ROLE_HEADER, opts.role);

  return md;
}

export function mergeMd(a?: grpc.Metadata, b?: grpc.Metadata): grpc.Metadata | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;

  const merged = new grpc.Metadata();
  for (const [k, v] of a.getMap() as any) merged.set(k, v as any);
  for (const [k, v] of b.getMap() as any) merged.set(k, v as any);
  return merged;
}

export function loadClient<T extends grpc.Client>(
  protoPath: string,
  pkg: string,
  svc: string,
  url: string,
): T {
  const def = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  const proto = grpc.loadPackageDefinition(def) as any;
  const ctor = pkg.split(".").reduce((acc, k) => acc[k], proto)[svc];
  return new ctor(
    url,
    grpc.credentials.createInsecure(),
  ) as T;
}

export function call<T>(
  client: grpc.Client,
  method: string,
  req: any,
  md?: grpc.Metadata,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const fn: any = (client as any)[method].bind(client);
    const cb = (err: any, res: T) => (err ? reject(err) : resolve(res));
    if (md) fn(req, md, cb);
    else fn(req, cb);
  });
}
