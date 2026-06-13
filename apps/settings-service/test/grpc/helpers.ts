// apps/settings-service/test/grpc/helpers.ts
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { buildS2SMetadata } from "@nebula/grpc-auth";

export const X_SIGN_HEADER = process.env.GATEWAY_HEADER ?? "x-gateway-sign";
export const X_SVC_HEADER = "x-svc";
export const CODES = grpc.status;

/**
 * Build service-to-service metadata.
 * Adds:
 *   - x-svc
 *   - signature header using the shared canonical S2S contract
 *   - x-user-id / x-user-role when a test needs to mimic forwarded context
 */
export function mdS2S(opts?: {
  serviceName?: string;
  userId?: string;
  role?: "user" | "admin" | "root-admin";
}) {
  const md = buildS2SMetadata({
    serviceName: opts?.serviceName ?? "auth-service",
  });

  if (opts?.userId) md.set("x-user-id", opts.userId);
  if (opts?.role) md.set("x-user-role", opts.role);

  return md;
}

export function mdAuth(opts: {
  access: string;
  userId?: string;
  role?: "user" | "admin" | "root-admin";
}) {
  const md = mdS2S({ userId: opts.userId, role: opts.role });
  md.set("authorization", `Bearer ${opts.access}`);
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
  if (!Ctor)
    throw new Error(
      `Service ${opts.pkg.join(".")}#${opts.svc} not found in ${opts.protoPath}`,
    );
  return new Ctor(opts.url, grpc.credentials.createInsecure());
}

export async function call<TResp>(
  client: any,
  m: string,
  req: any,
  md?: grpc.Metadata,
): Promise<TResp> {
  const metadata = md ?? new grpc.Metadata();
  return new Promise<TResp>((resolve, reject) => {
    client[m](req, metadata, (err: grpc.ServiceError | null, res: TResp) =>
      err ? reject(err) : resolve(res),
    );
  });
}
