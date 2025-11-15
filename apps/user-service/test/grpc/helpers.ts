// apps/user-service/test/grpc/helpers.ts
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as crypto from 'crypto';

export const CODES = grpc.status;

// --------- metadata helpers ---------
export function mdAuth(opts: { access?: string; userId?: string; role?: string } = {}) {
  const md = new grpc.Metadata();
  if (opts.access) md.set('authorization', `Bearer ${opts.access}`);
  if (opts.userId) md.set('x-user-id', opts.userId);
  if (opts.role)   md.set('x-user-role', opts.role);
  return md;
}

export function mdUser(userId: string, role?: string) {
  const md = new grpc.Metadata();
  md.set('x-user-id', userId);
  if (role) md.set('x-user-role', role);
  return md;
}

export function minuteBucket(): number {
  return Math.floor(Date.now() / 60_000);
}

export function mdS2S() {
  const svc    = process.env.SVC_NAME ?? 'user-service';
  const secret = process.env.S2S_SECRET ?? process.env.GATEWAY_SECRET ?? "n}T>QYq}Gfji_A3@*YBT9)WoT>Aq_Tf%3F79Q:TG";
  const sig = crypto.createHmac('sha256', secret)
    .update(`${minuteBucket()}:${svc}`)
    .digest('hex');

  const md = new grpc.Metadata();
  md.set('x-svc', svc);
  md.set('x-gateway-sign', sig);
  return md;
}

export function mergeMd(...mds: grpc.Metadata[]) {
  const out = new grpc.Metadata();
  for (const md of mds) {
    for (const [k, v] of md.getMap() as any) out.set(k, String(v));
  }
  return out;
}

// --------- client loader & invoker ---------
export function loadClient<T>(opts: {
  url: string;
  protoPath: string;
  pkg: string[]; // e.g. ['user','userv1']
  svc: string;   // e.g. 'UserService'
}): T {
  const def = protoLoader.loadSync(opts.protoPath, {
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const root = grpc.loadPackageDefinition(def) as any;
  const ns = opts.pkg.reduce((acc, k) => acc?.[k], root);
  const Ctor = ns?.[opts.svc];
  if (!Ctor) throw new Error(`Service ${opts.pkg.join('.')}#${opts.svc} not found in ${opts.protoPath}`);
  return new Ctor(opts.url, grpc.credentials.createInsecure());
}

function resolveMethodName(client: any, m: string) {
  if (typeof client[m] === 'function') return m;
  const alt = Object.keys(client).find(k => k.toLowerCase() === m.toLowerCase());
  if (!alt) throw new Error(`Method ${m} not found on client`);
  return alt;
}

export async function call<TResp>(
  client: any,
  method: string,
  req: any,
  md?: grpc.Metadata
): Promise<TResp> {
  const m = resolveMethodName(client, method);
  const metadata = md ?? new grpc.Metadata();
  return new Promise<TResp>((resolve, reject) => {
    client[m](req, metadata, (err: grpc.ServiceError | null, res: TResp) =>
      err ? reject(err) : resolve(res)
    );
  });
}
