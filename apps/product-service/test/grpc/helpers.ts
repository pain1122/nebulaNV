import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as crypto from 'crypto';

export const X_SIGN_HEADER = process.env.GATEWAY_HEADER ?? 'x-gateway-sign';
export const X_SVC_HEADER  = 'x-svc';
const X_USER_ID_HEADER     = 'x-user-id';
const X_USER_ROLE_HEADER   = 'x-user-role';

export function minuteBucket() {
  return Math.floor(Date.now() / 60_000);
}

export function mdS2S(opts?: { svc?: string; userId?: string; role?: 'user'|'admin'|'root-admin' }) {
  const secret = process.env.GATEWAY_SECRET ?? process.env.S2S_SECRET ?? 'dev-secret';
  const svc    = opts?.svc ?? process.env.SVC_NAME ?? 'gateway';

  const payload = `${minuteBucket()}:${svc}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  const md = new grpc.Metadata();
  md.set(X_SIGN_HEADER, sig);
  md.set(X_SVC_HEADER, svc);
  md.set(X_USER_ID_HEADER, opts?.userId ?? 'e2e-user');
  if (opts?.role) md.set(X_USER_ROLE_HEADER, opts.role);

  return md;
}

export function loadClient<T>(opts: { url: string; protoPath: string; pkg: string[]; svc: string; }): T {
  const loader = protoLoader.loadSync(opts.protoPath, {
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const pkgDef = grpc.loadPackageDefinition(loader) as any;
  const ns = opts.pkg.reduce((acc: any, k) => acc?.[k], pkgDef);
  const Ctor = ns?.[opts.svc];
  if (!Ctor) throw new Error(`Service ${opts.pkg.join('.')}#${opts.svc} not found in ${opts.protoPath}`);
  return new Ctor(opts.url, grpc.credentials.createInsecure());
}

export async function call<TResp>(client: any, m: string, req: any, md?: grpc.Metadata): Promise<TResp> {
  const metadata = md ?? new grpc.Metadata();
  return new Promise<TResp>((resolve, reject) => {
    client[m](req, metadata, (err: grpc.ServiceError | null, res: TResp) =>
      err ? reject(err) : resolve(res)
    );
  });
}
