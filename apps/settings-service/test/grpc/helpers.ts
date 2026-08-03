import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { settings } from "@nebula/protos";
import {
  finalizeS2SClientMetadata,
  markS2SMetadata,
  registerS2SClientDefinition,
} from "@nebula/grpc-auth";

export const CODES = grpc.status;

export function mdS2S() {
  const md = markS2SMetadata(new grpc.Metadata(), {
    kind: "gateway",
    serviceName: "gateway",
    key: {
      id: "gateway-settings-v1",
      secret:
        process.env.S2S_TEST_GATEWAY_KEY ??
        "dev-only-gateway-to-settings-s2s-key-001",
    },
  });
  return md;
}

export function mdProductService() {
  return markS2SMetadata(new grpc.Metadata(), {
    kind: "service",
    serviceName: "product-service",
    key: {
      id: "product-settings-v1",
      secret:
        process.env.S2S_TEST_PRODUCT_KEY ??
        "dev-only-product-to-settings-s2s-key-0001",
    },
  });
}

export function mdAuth(opts: { access: string }) {
  const md = mdS2S();
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
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const grpcObj = grpc.loadPackageDefinition(pkgDef) as any;
  const ns = opts.pkg.reduce((acc: any, key: string) => acc?.[key], grpcObj);
  const Ctor = ns?.[opts.svc];
  if (!Ctor) throw new Error(`Service ${opts.svc} not found`);
  const client = new Ctor(opts.url, grpc.credentials.createInsecure());
  registerS2SClientDefinition(client, settings.SettingsServiceService);
  return client as T;
}

export async function call<TResp>(
  client: any,
  method: string,
  req: any,
  md?: grpc.Metadata,
): Promise<TResp> {
  const metadata = finalizeS2SClientMetadata({
    client,
    method,
    request: req,
    metadata: md,
  });
  return new Promise<TResp>((resolve, reject) => {
    client[method](
      req,
      metadata,
      (err: grpc.ServiceError | null, res: TResp) =>
        err ? reject(err) : resolve(res),
    );
  });
}
