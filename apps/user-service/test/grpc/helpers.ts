import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { userv1 } from '@nebula/protos';
import {
  copyS2SSigningIntent,
  finalizeS2SClientMetadata,
  markS2SMetadata,
  registerS2SClientDefinition,
} from '@nebula/grpc-auth';

export const CODES = grpc.status;

export function mdAuth(opts: { access?: string } = {}) {
  const md = mdS2S();
  if (opts.access) md.set('authorization', `Bearer ${opts.access}`);
  return md;
}

/** Test-only hostile metadata; production helpers must never create this. */
export function mdForgedActor(userId: string, role: string) {
  const md = new grpc.Metadata();
  md.set('x-user-id', userId);
  md.set('x-user-role', role);
  return md;
}

export function mdS2S(opts: { serviceName?: string } = {}) {
  const md = markS2SMetadata(new grpc.Metadata(), {
    kind: 'service',
    serviceName: opts.serviceName ?? 'auth-service',
    key: {
      id: 'auth-user-v1',
      secret:
        process.env.S2S_TEST_SERVICE_KEY ??
        'dev-only-auth-to-user-s2s-key-00000001',
    },
  });
  return md;
}

export function mergeMd(...sources: grpc.Metadata[]) {
  const out = new grpc.Metadata();
  for (const source of sources) {
    for (const [key, value] of Object.entries(source.getMap())) {
      out.set(key, value);
    }
    copyS2SSigningIntent(source, out);
  }
  return out;
}

export function loadClient<T>(opts: {
  url: string;
  protoPath: string;
  pkg: string[];
  svc: string;
}): T {
  const def = protoLoader.loadSync(opts.protoPath, {
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const root = grpc.loadPackageDefinition(def) as any;
  const namespace = opts.pkg.reduce(
    (current: any, key) => current?.[key],
    root,
  );
  const Ctor = namespace?.[opts.svc];
  if (!Ctor) throw new Error(`Service ${opts.svc} not found`);
  const client = new Ctor(opts.url, grpc.credentials.createInsecure());
  registerS2SClientDefinition(client, userv1.UserServiceService);
  return client as T;
}

function resolveMethodName(client: any, method: string) {
  if (typeof client[method] === 'function') return method;
  const alternate = Object.keys(client).find(
    (key) => key.toLowerCase() === method.toLowerCase(),
  );
  if (!alternate) throw new Error(`Method ${method} not found on client`);
  return alternate;
}

export async function call<TResp>(
  client: any,
  method: string,
  req: any,
  md?: grpc.Metadata,
): Promise<TResp> {
  const resolved = resolveMethodName(client, method);
  const metadata = finalizeS2SClientMetadata({
    client,
    method: resolved,
    request: req,
    metadata: md,
  });
  return new Promise<TResp>((resolve, reject) => {
    client[resolved](
      req,
      metadata,
      (err: grpc.ServiceError | null, response: TResp) =>
        err ? reject(err) : resolve(response),
    );
  });
}
