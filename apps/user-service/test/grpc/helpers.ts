// apps/user-service/test/grpc/helpers.ts
// gRPC helpers for user-service tests: real login via auth HTTP, JWT/S2S metadata,
// gRPC client loader, unary call wrapper, and a simple bootstrap.

import * as crypto from 'crypto';
import * as grpc from '@grpc/grpc-js';
import { Metadata } from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { httpJson, subFromJwt, roleFromJwt } from '../utils/http';

type LoginResponse = { accessToken: string; refreshToken?: string };

let cached = {
  admin: null as null | { access: string; refresh?: string; userId: string; role?: string },
  user: null as null | { access: string; refresh?: string; userId: string; role?: string },
};

// ----------------------------- Login (via auth HTTP) -----------------------------
export async function loginAdmin() {
    if (cached.admin) return cached.admin;
    const r = await httpJson<LoginResponse>('POST', `${process.env.AUTH_HTTP_URL}/auth/login`, {
      identifier: process.env.ADMIN_IDENTIFIER,
      password: process.env.ADMIN_PASSWORD,
    });
    const access = r.accessToken;
    const userId = subFromJwt(access);
    const role = roleFromJwt(access);
    cached.admin = { access, refresh: r.refreshToken, userId, role };
    return cached.admin;
  }

  export async function loginUser() {
    if (cached.user) return cached.user;
    const r = await httpJson<LoginResponse>('POST', `${process.env.AUTH_HTTP_URL}/auth/login`, {
      identifier: process.env.USER_IDENTIFIER,
      password: process.env.USER_PASSWORD,
    });
    const access = r.accessToken;
    const userId = subFromJwt(access);
    const role = roleFromJwt(access);
    cached.user = { access, refresh: r.refreshToken, userId, role };
    return cached.user;
  }

// ----------------------------- Metadata builders -----------------------------

function minuteBucket(): number {
  return Math.floor(Date.now() / 60000);
}
function hmac(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/** S2S HMAC for @Public({gatewayOnly:true}) */
export function mdS2S(svcName = process.env.SVC_NAME!, secret = process.env.GATEWAY_SECRET!): Metadata {
  const md = new Metadata();
  md.set('x-svc', svcName);
  md.set('x-gateway-sign', hmac(secret, `${svcName}:${minuteBucket()}`));
  return md;
}
/** Authorization: Bearer ... */
export function mdAuth(access: string): Metadata {
  const md = new Metadata();
  md.set('authorization', `Bearer ${access}`);
  return md;
}
/** x-user-id (+ optional x-role) for @RequireUserId */
export function mdUser(userId: string, role?: string): Metadata {
  const md = new Metadata();
  md.set('x-user-id', userId);
  if (role) md.set('x-role', role);
  return md;
}
/** Shallow merge is fine for our header set */
export function mergeMd(...parts: Metadata[]): Metadata {
  const out = new Metadata();
  for (const m of parts) {
    const map = m.getMap() as Record<string, string>;
    for (const k of Object.keys(map)) out.set(k, String(map[k]));
  }
  return out;
}

// Convenience presets
export const mdAuthOnly = (a: string) => mdAuth(a);
export const mdS2SOnly = () => mdS2S();
export const mdAuthS2S = (a: string) => mergeMd(mdAuth(a), mdS2S());
export const mdAuthS2SUser = (a: string, uid: string, role?: string) => mergeMd(mdAuth(a), mdS2S(), mdUser(uid, role));
export const mdS2SUser = (uid: string, role?: string) => mergeMd(mdS2S(), mdUser(uid, role));

// ----------------------------- gRPC loader + unary -----------------------------

type LoadOptions = {
  protoPath: string;
  pkg: string;     // e.g. 'userv1'
  service: string; // e.g. 'UserService'
  url?: string;    // defaults to USER_GRPC_URL
};

export function loadGrpcClient<T = any>(opts: LoadOptions): T {
  const def = protoLoader.loadSync(opts.protoPath, {
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    keepCase: false,
  });
  const pkg: any = grpc.loadPackageDefinition(def);
  const ns = opts.pkg.split('.').reduce((acc: any, k) => (acc ? acc[k] : undefined), pkg) || (pkg as any)[opts.pkg];
  if (!ns) throw new Error(`Package "${opts.pkg}" not found in ${opts.protoPath}`);
  const Svc = (ns as any)[opts.service];
  if (!Svc) throw new Error(`Service "${opts.service}" not found in package "${opts.pkg}"`);
  return new (Svc as any)(opts.url || process.env.USER_GRPC_URL, grpc.credentials.createInsecure()) as T;
}

export function grpcUnary<TReq extends object, TRes = any>(
  client: any,
  method: string,
  req: TReq,
  md?: Metadata,
): Promise<TRes> {
  return new Promise<TRes>((resolve, reject) => {
    const fn = client[method];
    if (typeof fn !== 'function') return reject(new Error(`Method ${method} not found on client`));
    const cb = (err: grpc.ServiceError | null, res: TRes) => (err ? reject(err) : resolve(res));
    if (md) fn.call(client, req, md, cb);
    else fn.call(client, req, cb);
  });
}

// ----------------------------- Bootstrap -----------------------------

export async function ensureIdentities() {
  const [admin, user] = await Promise.all([loginAdmin(), loginUser()]);
  return { admin, user };
}

export async function bootstrapForSpecs() {
  const { admin, user } = await ensureIdentities();
  return {
    env: process.env,
    admin,
    user,
    md: {
      adminAuth: mdAuth(admin.access),
      userAuth: mdAuth(user.access),
      adminAuthS2S: mdAuthS2S(admin.access),
      userAuthS2S: mdAuthS2S(user.access),
      s2s: mdS2S(),
      adminS2SUser: mdS2SUser(admin.userId, admin.role),
      userS2SUser: mdS2SUser(user.userId, user.role),
      adminFull: mdAuthS2SUser(admin.access, admin.userId, admin.role),
      userFull: mdAuthS2SUser(user.access, user.userId, user.role),
    },
  };
}
