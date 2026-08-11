import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { blogv1 } from "@nebula/protos";
import {
  finalizeS2SClientMetadata,
  markS2SMetadata,
  registerS2SClientDefinition,
  withBearer,
} from "@nebula/grpc-auth";
import { gatewayTestSignedContext } from "../../../../packages/grpc-auth/test/gateway-context.fixture";

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
      id: "gateway-blog-v1",
      secret:
        process.env.S2S_TEST_GATEWAY_KEY ??
        "dev-only-gateway-to-blog-s2s-key-00001",
    },
    context: gatewayTestSignedContext(accessToken),
  });
  if (opts?.role && !accessToken) {
    throw new Error(`blog_test_${opts.role}_jwt_missing`);
  }
  return withBearer(md, accessToken);
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
  const namespace = pkgs.reduce((current: any, key) => current[key], grpcObj);
  const Ctor = namespace[opts.svc] as grpc.ServiceClientConstructor;
  const client = new Ctor(opts.url, grpc.credentials.createInsecure());
  const signingDefinition =
    opts.svc === "BlogService"
      ? blogv1.BlogServiceService
      : opts.svc === "BlogTaxonomyService"
        ? blogv1.BlogTaxonomyServiceService
        : undefined;
  if (!signingDefinition) {
    throw new Error(`Signing definition for ${opts.svc} not found`);
  }
  registerS2SClientDefinition(client, signingDefinition);
  return client as unknown as T;
}

export function call<T = any>(
  client: any,
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
  return new Promise((resolve, reject) => {
    client[method](req, metadata, (err: grpc.ServiceError | null, res: T) =>
      err ? reject(err) : resolve(res),
    );
  });
}
