// apps/blog-service/test/grpc/helpers.ts
import * as crypto from 'crypto';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

export const AUTHORIZATION_HEADER = 'authorization';
export const X_SVC_HEADER        = 'x-svc';
export const X_SIGN_HEADER       = process.env.GATEWAY_HEADER || 'x-gateway-sign';

export function minuteBucket(): number {
  return Math.floor(Date.now() / 60000);
}

export function hmac(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function mdS2S(opts?: { role?: string }) {
  const md = new grpc.Metadata();
  const secret = process.env.S2S_SECRET || 'test-secret';
  const svc    = process.env.SVC_NAME || 'blog-service';
  const bucket = minuteBucket();
  const sign   = hmac(secret, `${svc}:${bucket}`);

  md.set(X_SVC_HEADER, svc);
  md.set(X_SIGN_HEADER, sign);

  if (opts?.role) {
    md.set('x-role', opts.role);
  }
  return md;
}

export function loadClient<T = any>(opts: {
  url: string;
  protoPath: string;
  pkg: string | string[];
  svc: string;
}): T {
  const pkgDef = protoLoader.loadSync(opts.protoPath, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const grpcObj = grpc.loadPackageDefinition(pkgDef) as any;

  const pkgs = Array.isArray(opts.pkg) ? opts.pkg : [opts.pkg];
  let cur: any = grpcObj;
  for (const p of pkgs) cur = cur[p];

  const ClientCtor = cur[opts.svc] as grpc.ServiceClientConstructor;
  return new ClientCtor(
    opts.url,
    grpc.credentials.createInsecure(),
  ) as unknown as T;
}

export function call<T = any>(
  client: any,
  method: string,
  req: any,
  md?: grpc.Metadata,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const fn = client[method].bind(client);
    const cb = (err: any, res: T) => (err ? reject(err) : resolve(res));
    if (md) fn(req, md, cb);
    else fn(req, cb);
  });
}
