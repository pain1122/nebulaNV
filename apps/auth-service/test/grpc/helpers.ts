import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { authv1, userv1 } from '@nebula/protos';
import {
  copyS2SSigningIntent,
  finalizeS2SClientMetadata,
  markS2SMetadata,
  registerS2SClientDefinition,
  type S2SActorAssertion,
  type S2SSigningIdentity,
} from '@nebula/grpc-auth';

export const AUTHORIZATION_HEADER = 'authorization';

const gatewayAuth: S2SSigningIdentity = {
  kind: 'gateway',
  serviceName: 'gateway',
  key: {
    id: 'gateway-auth-v1',
    secret:
      process.env.S2S_TEST_GATEWAY_KEY ??
      'dev-only-gateway-to-auth-s2s-key-00001',
  },
  context: {
    version: '1',
    applicationId: 'admin-web-test',
    tenantId: 'single-site-tenant',
    siteId: 'single-site',
    channelId: 'web',
  },
};

const authAuth: S2SSigningIdentity = {
  kind: 'service',
  serviceName: 'auth-service',
  key: {
    id: 'auth-auth-v1',
    secret:
      process.env.S2S_TEST_SERVICE_KEY ??
      'dev-only-auth-to-auth-s2s-key-00000001',
  },
};

const authUser: S2SSigningIdentity = {
  kind: 'service',
  serviceName: 'auth-service',
  key: {
    id: 'auth-user-v1',
    secret: 'dev-only-auth-to-user-s2s-key-00000001',
  },
};

export function mdBearer(token?: string): grpc.Metadata {
  const md = new grpc.Metadata();
  if (token) md.set(AUTHORIZATION_HEADER, `Bearer ${token}`);
  return md;
}

export function mdS2S(opts?: {
  kind?: 'service' | 'gateway';
  actor?: S2SActorAssertion;
}): grpc.Metadata {
  const baseIdentity = opts?.kind === 'service' ? authAuth : gatewayAuth;
  const identity = opts?.actor
    ? {
        ...baseIdentity,
        context: {
          ...gatewayAuth.context!,
          actor: opts.actor,
        },
      }
    : baseIdentity;
  return markS2SMetadata(new grpc.Metadata(), {
    ...identity,
    targets: { 'user-service': authUser },
  });
}

/** Test-only hostile metadata; production helpers must never create this. */
export function mdForgedActor(userId: string, role: string): grpc.Metadata {
  const md = new grpc.Metadata();
  md.set('x-user-id', userId);
  md.set('x-user-role', role);
  return md;
}

export function mergeMd(
  ...sources: Array<grpc.Metadata | undefined>
): grpc.Metadata {
  const out = new grpc.Metadata();
  for (const source of sources) {
    if (!source) continue;
    for (const [key, value] of Object.entries(source.getMap())) {
      out.set(key, value);
    }
    copyS2SSigningIntent(source, out);
  }
  return out;
}

export function mdAuth(
  params: {
    access?: string;
    s2s?: boolean;
    actor?: S2SActorAssertion;
  } = {},
): grpc.Metadata {
  const { access, s2s = true, actor } = params;
  return mergeMd(mdBearer(access), s2s ? mdS2S({ actor }) : undefined);
}

export function loadClient<TClient extends grpc.Client>(opts: {
  url: string;
  protoPath: string;
  pkg: string | string[];
  svc: string;
}): TClient {
  const definition = protoLoader.loadSync(opts.protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const loaded = grpc.loadPackageDefinition(definition) as any;
  const packages = Array.isArray(opts.pkg) ? opts.pkg : [opts.pkg];

  for (const packageName of packages) {
    const namespace = packageName
      .split('.')
      .reduce((current: any, key) => current?.[key], loaded);
    const Ctor = namespace?.[opts.svc];
    if (!Ctor) continue;
    const client = new Ctor(
      opts.url,
      grpc.credentials.createInsecure(),
    ) as TClient;
    const signingDefinition =
      opts.svc === 'AuthService'
        ? authv1.AuthServiceService
        : opts.svc === 'UserService'
          ? userv1.UserServiceService
          : undefined;
    if (!signingDefinition) {
      throw new Error(`Signing definition for ${opts.svc} not found`);
    }
    registerS2SClientDefinition(client, signingDefinition);
    return client;
  }
  throw new Error(`Service ${opts.svc} not found`);
}

function resolveMethodName(client: any, name: string): string {
  if (typeof client?.[name] === 'function') return name;
  const alternate = Object.keys(client ?? {}).find(
    (key) => key.toLowerCase() === name.toLowerCase(),
  );
  if (!alternate) throw new Error(`gRPC method not found: ${name}`);
  return alternate;
}

export function call<TResp>(
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

export const CODES = grpc.status;
