import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { productv1, settings } from "@nebula/protos";
import {
  finalizeS2SClientMetadata,
  markS2SMetadata,
  registerS2SClientDefinition,
  withBearer,
} from "@nebula/grpc-auth";

let defaultActorAccessToken: string | undefined;

export function setS2STestActorToken(accessToken: string) {
  defaultActorAccessToken = accessToken;
}

export function mdS2S(opts?: {
  accessToken?: string;
  role?: "user" | "admin" | "root-admin";
}) {
  const md = markS2SMetadata(new grpc.Metadata(), {
    kind: "gateway",
    serviceName: "gateway",
    key: {
      id: "gateway-product-v1",
      secret:
        process.env.S2S_TEST_GATEWAY_KEY ??
        "dev-only-gateway-to-product-s2s-key-001",
    },
    targets: {
      "settings-service": {
        kind: "gateway",
        serviceName: "gateway",
        key: {
          id: "gateway-settings-v1",
          secret: "dev-only-gateway-to-settings-s2s-key-001",
        },
      },
    },
  });
  const accessToken = opts?.accessToken ?? defaultActorAccessToken;
  if (opts?.role && !accessToken) {
    throw new Error(`product_test_${opts.role}_jwt_missing`);
  }
  return withBearer(md, accessToken);
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
  const signingDefinition =
    opts.svc === "ProductService"
      ? productv1.ProductServiceService
      : opts.svc === "ProductTaxonomyService"
        ? productv1.ProductTaxonomyServiceService
        : opts.svc === "SettingsService"
          ? settings.SettingsServiceService
          : undefined;
  if (!signingDefinition) {
    throw new Error(`Signing definition for ${opts.svc} not found`);
  }
  registerS2SClientDefinition(client, signingDefinition);
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
