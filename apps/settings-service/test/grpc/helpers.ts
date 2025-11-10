import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import * as crypto from "crypto";

export const X_SIGN_HEADER = process.env.GATEWAY_HEADER ?? 'x-gateway-sign';
export const X_SVC_HEADER  = 'x-svc';

export function minuteBucket() {
  return Math.floor(Date.now() / 60_000);
}

// ---- svc:bucket HMAC with S2S_SECRET
export function mdS2S() {
  const secret = process.env.S2S_SECRET ?? process.env.GATEWAY_SECRET ?? 'dev-secret';
  const svc    = process.env.SVC_NAME ?? 'gateway';
  const payload = `${minuteBucket()}:${svc}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  const md = new grpc.Metadata();
  md.set(X_SIGN_HEADER, sig);
  md.set(X_SVC_HEADER, svc);
  return md;
}

type LoadOpts = {
  url: string;
  protoPath: string;
  pkg: string[];
  svc: string;
};



export function loadClient<T>(opts: LoadOpts): T {
  const loader = protoLoader.loadSync(opts.protoPath, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const pkgDef = grpc.loadPackageDefinition(loader) as any;
  const ns = opts.pkg.reduce((acc, k) => acc?.[k], pkgDef);
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
