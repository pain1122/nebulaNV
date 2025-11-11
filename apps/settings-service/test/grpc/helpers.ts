// apps/settings-service/test/grpc/helpers.ts
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import * as crypto from "crypto";

export const X_SIGN_HEADER = process.env.GATEWAY_HEADER ?? "x-gateway-sign";
export const X_SVC_HEADER  = "x-svc";

// also used by resolveCtxUser()
const X_USER_ID_HEADER   = "x-user-id";
const X_USER_ROLE_HEADER = "x-user-role";

export function minuteBucket() {
  return Math.floor(Date.now() / 60_000);
}

/**
 * Build gateway-style S2S metadata.
 * Adds:
 *   - x-svc
 *   - signature header (HMAC_SHA256( "<minute>:+<svc>" , SECRET ))
 *   - x-user-id (required by controllers via resolveCtxUser)
 *   - x-user-role (optional; use 'admin' for admin endpoints)
 */
export function mdS2S(opts?: {
  svc?: string;
  userId?: string;
  role?: "user" | "admin" | "root-admin";
}) {
  const md = new grpc.Metadata();

  const secret  = process.env.S2S_SECRET ?? process.env.GATEWAY_SECRET ?? "dev-secret";
  const svc     = opts?.svc ?? process.env.SVC_NAME ?? "gateway";
  const payload = `${minuteBucket()}:${svc}`;
  const sign    = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  md.set(X_SVC_HEADER, svc);
  md.set(X_SIGN_HEADER, sign);

  // Simulate gateway injecting initiator context
  const userId = opts?.userId ?? "e2e-user";
  md.set(X_USER_ID_HEADER, userId);
  if (opts?.role) md.set(X_USER_ROLE_HEADER, opts.role);

  return md;
}

export function loadClient<T>(opts: {
  url: string;
  protoPath: string;
  pkg: string[];
  svc: string;
}): T {
  const pkgDef = protoLoader.loadSync(opts.protoPath, {
    // keep defaults; our protos are ts-proto friendly
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const grpcObj = (grpc as any).loadPackageDefinition(pkgDef);
  const ns = opts.pkg.reduce((acc: any, k: string) => acc?.[k], grpcObj);
  const Ctor = ns?.[opts.svc];
  if (!Ctor) throw new Error(`Service ${opts.pkg.join(".")}#${opts.svc} not found in ${opts.protoPath}`);
  return new Ctor(opts.url, grpc.credentials.createInsecure());
}

export async function call<TResp>(
  client: any,
  m: string,
  req: any,
  md?: grpc.Metadata
): Promise<TResp> {
  const metadata = md ?? new grpc.Metadata();
  return new Promise<TResp>((resolve, reject) => {
    client[m](req, metadata, (err: grpc.ServiceError | null, res: TResp) =>
      err ? reject(err) : resolve(res)
    );
  });
}
