import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { orderv1 } from "@nebula/protos";
import {
  copyS2SSigningIntent,
  finalizeS2SClientMetadata,
  markS2SMetadata,
  registerS2SClientDefinition,
} from "@nebula/grpc-auth";

export const AUTHORIZATION_HEADER = "authorization";

export function mdBearer(token?: string): grpc.Metadata {
  const md = new grpc.Metadata();
  if (token) md.set(AUTHORIZATION_HEADER, `Bearer ${token}`);
  return md;
}

export function mdS2S(): grpc.Metadata {
  const md = markS2SMetadata(new grpc.Metadata(), {
    kind: "gateway",
    serviceName: "gateway",
    key: {
      id: "gateway-order-v1",
      secret:
        process.env.S2S_TEST_GATEWAY_KEY ??
        "dev-only-gateway-to-order-s2s-key-0001",
    },
  });
  return md;
}

export function mergeMd(
  a?: grpc.Metadata,
  b?: grpc.Metadata,
): grpc.Metadata | undefined {
  if (!a && !b) return undefined;
  const merged = new grpc.Metadata();
  for (const source of [a, b]) {
    if (!source) continue;
    for (const [key, value] of Object.entries(source.getMap())) {
      merged.set(key, value);
    }
    copyS2SSigningIntent(source, merged);
  }
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
  const Ctor = pkg.split(".").reduce((current, key) => current[key], proto)[
    svc
  ];
  const client = new Ctor(url, grpc.credentials.createInsecure()) as T;
  registerS2SClientDefinition(client, orderv1.OrderServiceService);
  return client;
}

export function call<T>(
  client: grpc.Client,
  method: string,
  req: any,
  md?: grpc.Metadata,
): Promise<T> {
  const metadata = finalizeS2SClientMetadata({
    client,
    method,
    request: req,
    metadata: md,
  });
  return new Promise<T>((resolve, reject) => {
    const fn: any = (client as any)[method].bind(client);
    fn(req, metadata, (err: grpc.ServiceError | null, response: T) =>
      err ? reject(err) : resolve(response),
    );
  });
}
