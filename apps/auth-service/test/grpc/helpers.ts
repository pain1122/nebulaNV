// apps/auth-service/test/grpc/helpers.ts
import * as crypto from 'crypto';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as jwt from 'jsonwebtoken';

export const AUTHORIZATION_HEADER = 'authorization';
export const X_SVC_HEADER        = 'x-svc';
export const X_USER_ID_HEADER    = 'x-user-id';
export const X_ROLE_HEADER       = 'x-role';
export const X_USER_ROLE_HEADER  = 'x-user-role';
export const X_SIGN_HEADER       = 'x-gateway-sign';

export function minuteBucket(): number {
  return Math.floor(Date.now() / 60000);
}
export function hmac(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function mdBearer(token?: string): grpc.Metadata {
  const md = new grpc.Metadata();
  if (token) md.set(AUTHORIZATION_HEADER, `Bearer ${token}`);
  return md;
}

export function mdS2S(opts?: { svc?: string; secret?: string }): grpc.Metadata {
  const md = new grpc.Metadata();
  const svc = opts?.svc ?? process.env.SVC_NAME ?? 'auth-service';
  const secret = opts?.secret ?? process.env.GATEWAY_SECRET;
  if (!secret) return md;
  const sig = hmac(secret, `${svc}:${minuteBucket()}`);
  md.set(X_SIGN_HEADER, sig);
  md.set(X_SVC_HEADER, svc);
  return md;
}

export function mdUser(userId?: string | null, role?: string | null): grpc.Metadata {
  const md = new grpc.Metadata();
  if (userId) md.set(X_USER_ID_HEADER, String(userId));
  if (role) {
    // set both, some code reads x-user-role, some reads x-role
    md.set(X_USER_ROLE_HEADER, String(role));
    md.set(X_ROLE_HEADER,      String(role));
  }
  return md;
}

export function mergeMd(
  ...arr: Array<grpc.Metadata | undefined>
): grpc.Metadata {
  const out = new grpc.Metadata();
  for (const m of arr) {
    if (!m) continue;
    const map: Record<string, string> = (m as any)?.getMap?.() ?? {};
    for (const k in map) out.set(k, map[k]);
  }
  return out;
}

export function mdAuth(params: {
  access?: string;
  userId?: string;
  role?: 'user' | 'admin' | 'root-admin' | string;
  s2s?: boolean;
} = {}): grpc.Metadata {
  const { access, userId, role, s2s = true } = params;

  // infer role from JWT if not provided
  let effectiveRole = role;
  if (!effectiveRole && access) {
    try {
      const payload = jwt.decode(access) as any | null;
      if (payload?.role) effectiveRole = String(payload.role);
    } catch { /* ignore */ }
  }

  return mergeMd(
    mdBearer(access),
    s2s ? mdS2S() : undefined,
    mdUser(userId, effectiveRole),
  );
}

export function loadClient<TClient extends grpc.Client>(opts: {
  url: string;
  protoPath: string;
  pkg: string | string[];
  svc: string;
}): TClient {
  const def = protoLoader.loadSync(opts.protoPath, {
    keepCase: true,
    longs: String as any,
    enums: String as any,
    defaults: true,
    oneofs: true,
  });
  const loaded = grpc.loadPackageDefinition(def) as any;
  const pkgs = Array.isArray(opts.pkg) ? opts.pkg : [opts.pkg];

  for (const pkg of pkgs) {
    let obj: any = loaded;
    let ok = true;
    for (const part of pkg.split('.')) {
      obj = obj?.[part];
      if (!obj) {
        ok = false;
        break;
      }
    }
    const Ctor = ok && obj?.[opts.svc];
    if (Ctor) return new Ctor(opts.url, grpc.credentials.createInsecure());
  }
  throw new Error(
    `Service not found. Tried pkgs: ${pkgs.join(', ')} for ${opts.svc}`
  );
}

function resolveMethodName(client: any, name: string): string {
  if (client && typeof client[name] === 'function') return name;

  const lowerCamel = name[0].toLowerCase() + name.slice(1);
  if (client && typeof client[lowerCamel] === 'function') return lowerCamel;

  const pascal = name[0].toUpperCase() + name.slice(1);
  if (client && typeof client[pascal] === 'function') return pascal;

  const snake = name.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`).replace(/^_/, '');
  if (client && typeof client[snake] === 'function') return snake;

  const avail = Object.keys(client || {});
  throw new Error(
    `gRPC method not found: tried ${name}/${lowerCamel}/${pascal}/${snake}, available: ${avail.join(', ')}`
  );
}

export function call<TResp>(
  client: any,
  method: string,
  req: any,
  md?: grpc.Metadata
): Promise<TResp> {
  const m = resolveMethodName(client, method);
  return new Promise<TResp>((resolve, reject) => {
    client[m](req, md, (err: grpc.ServiceError | null, res: TResp) =>
      err ? reject(err) : resolve(res)
    );
  });
}

export const CODES = grpc.status;
