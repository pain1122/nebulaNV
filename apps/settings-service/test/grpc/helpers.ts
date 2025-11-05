import * as grpc from "@grpc/grpc-js"
import * as protoLoader from "@grpc/proto-loader"
import * as crypto from "crypto"

export const X_SIGN_HEADER = process.env.GATEWAY_HEADER ?? "x-gateway-sign"
export const X_SVC_HEADER = "x-svc"

export function minuteBucket(): number {
  return Math.floor(Date.now() / 60_000)
}

export function hmac(secret: string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex")
}

export function mdS2S(opts?: {svc?: string; secret?: string}) {
  const md = new grpc.Metadata()
  const svc = opts?.svc ?? process.env.SVC_NAME ?? "settings-service"
  const secret = opts?.secret ?? process.env.S2S_SECRET ?? process.env.GATEWAY_SECRET ?? ""
  if (!secret) return md
  const sig = hmac(secret, `${svc}:${minuteBucket()}`)
  md.set("x-svc", svc)
  md.set(process.env.GATEWAY_HEADER ?? "x-gateway-sign", sig)
  return md
}

// (keep your loadClient / call utilities if you had them here)
export function loadClient<T>(opts: {
  url: string
  protoPath: string
  pkg: string[] // e.g. ['settings']
  svc: string // e.g. 'SettingsService'
}): T {
  const def = protoLoader.loadSync(opts.protoPath, {keepCase: true})
  const root = grpc.loadPackageDefinition(def) as any
  const ns = opts.pkg.reduce((acc, k) => acc?.[k], root)
  const Ctor = ns?.[opts.svc]
  if (!Ctor) throw new Error(`Service ${opts.pkg.join(".")}#${opts.svc} not found in ${opts.protoPath}`)
  return new Ctor(opts.url, grpc.credentials.createInsecure())
}

export function call<TResp>(client: any, m: string, req: any, md?: grpc.Metadata): Promise<TResp> {
  const metadata = md ?? new grpc.Metadata()
  return new Promise<TResp>((resolve, reject) => {
    client[m](req, metadata, (err: grpc.ServiceError | null, res: TResp) => (err ? reject(err) : resolve(res)))
  })
}
