import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { media } from "@nebula/protos";
import {
  finalizeS2SClientMetadata,
  markS2SMetadata,
  registerS2SClientDefinition,
  withBearer,
} from "@nebula/grpc-auth";

type LoadClientArgs = {
  url: string;
  protoPath: string;
  pkg: string[];
  svc: string;
};

export function loadClient<T = any>(args: LoadClientArgs): T {
  const def = protoLoader.loadSync(args.protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const loaded = grpc.loadPackageDefinition(def) as any;
  const namespace = args.pkg.reduce(
    (current: any, key) => current[key],
    loaded,
  );
  const Ctor = namespace[args.svc];
  const client = new Ctor(args.url, grpc.credentials.createInsecure());
  registerS2SClientDefinition(client, media.MediaServiceService);
  return client as T;
}

export function call<TResp = any>(
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

let defaultActorAccessToken: string | undefined;

export function setS2STestActorToken(accessToken: string) {
  defaultActorAccessToken = accessToken;
}

function roleFromJwt(token: string): string | undefined {
  const [, payload] = token.split(".");
  if (!payload) return undefined;
  const decoded = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8"),
  ) as { role?: string };
  return decoded.role;
}

export function mdS2S(opts?: {
  accessToken?: string;
  role?: "user" | "admin" | "root-admin";
}) {
  const md = markS2SMetadata(new grpc.Metadata(), {
    kind: "gateway",
    serviceName: "gateway",
    key: {
      id: "gateway-media-v1",
      secret:
        process.env.S2S_TEST_GATEWAY_KEY ??
        "dev-only-gateway-to-media-s2s-key-0001",
    },
  });
  const accessToken = opts?.accessToken ?? defaultActorAccessToken;
  if (opts?.role && (!accessToken || roleFromJwt(accessToken) !== opts.role)) {
    throw new Error(`media_test_${opts.role}_jwt_missing_or_invalid`);
  }
  return withBearer(md, accessToken);
}
