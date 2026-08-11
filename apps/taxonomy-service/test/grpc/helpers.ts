import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { taxonomy } from "@nebula/protos";
import {
  finalizeS2SClientMetadata,
  markS2SMetadata,
  registerS2SClientDefinition,
  withBearer,
} from "@nebula/grpc-auth";
import { gatewayTestSignedContext } from "../../../../packages/grpc-auth/test/gateway-context.fixture";

export const CODES = grpc.status;

let defaultActorAccessToken: string | undefined;

export function setS2STestActorToken(accessToken: string) {
  defaultActorAccessToken = accessToken;
}

export function mdS2S(opts?: {
  accessToken?: string;
  role?: "user" | "admin" | "root-admin";
}) {
  const accessToken = opts?.accessToken ?? defaultActorAccessToken;
  const md = markS2SMetadata(new grpc.Metadata(), {
    kind: "gateway",
    serviceName: "gateway",
    key: {
      id: "gateway-taxonomy-v1",
      secret:
        process.env.S2S_TEST_GATEWAY_KEY ??
        "dev-only-gateway-to-taxonomy-s2s-key-001",
    },
    context: gatewayTestSignedContext(accessToken),
  });
  if (opts?.role && !accessToken) {
    throw new Error(`taxonomy_test_${opts.role}_jwt_missing`);
  }
  return withBearer(md, accessToken);
}

export function mdProductService() {
  return markS2SMetadata(new grpc.Metadata(), {
    kind: "service",
    serviceName: "product-service",
    key: {
      id: "product-taxonomy-v1",
      secret:
        process.env.S2S_TEST_PRODUCT_KEY ??
        "dev-only-product-to-taxonomy-s2s-key-0001",
    },
  });
}

export function loadClient<T>(opts: {
  url: string;
  protoPath: string;
  pkg: string[];
  svc: string;
}): T {
  const loader = protoLoader.loadSync(opts.protoPath, {
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const pkgDef = grpc.loadPackageDefinition(loader) as any;
  const ns = opts.pkg.reduce((acc: any, key) => acc?.[key], pkgDef);
  const Ctor = ns?.[opts.svc];
  if (!Ctor) throw new Error(`Service ${opts.svc} not found`);
  const client = new Ctor(opts.url, grpc.credentials.createInsecure());
  registerS2SClientDefinition(client, taxonomy.TaxonomyServiceService);
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
