// apps/media-service/test/grpc/helpers.ts
import * as crypto from "crypto"
import * as grpc from "@grpc/grpc-js"
import * as protoLoader from "@grpc/proto-loader"

type LoadClientArgs = {
  url: string
  protoPath: string
  pkg: string[]
  svc: string
}

export function loadClient<T = any>({ url, protoPath, pkg, svc }: LoadClientArgs): T {
  const def = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  })

  const loaded = grpc.loadPackageDefinition(def) as any

  // walk packages, e.g. ["media"] -> loaded.media
  let cur: any = loaded
  for (const p of pkg) cur = cur[p]
  const ClientCtor = cur[svc]

  return new ClientCtor(url, grpc.credentials.createInsecure())
}

export function call<TResp = any>(
  client: any,
  method: string,
  req: any,
  md?: grpc.Metadata
): Promise<TResp> {
  const metadata = md ?? new grpc.Metadata()
  return new Promise<TResp>((resolve, reject) => {
    client[method](req, metadata, (err: grpc.ServiceError | null, res: TResp) =>
      err ? reject(err) : resolve(res)
    )
  })
}

function minuteBucket() {
  return Math.floor(Date.now() / 60_000)
}

// Matches Nebula gateway signing: HMAC( `${minute}:{svc}` )
export function mdS2S(opts?: { svc?: string; userId?: string; role?: "user" | "admin" | "root-admin" }) {
  const secret = process.env.S2S_SECRET ?? process.env.GATEWAY_SECRET ?? "dev-secret"
  const svc = opts?.svc ?? process.env.SVC_NAME ?? "bucket"

  const payload = `${minuteBucket()}:${svc}`
  const sign = crypto.createHmac("sha256", secret).update(payload).digest("hex")

  const md = new grpc.Metadata()
  md.set("x-svc", svc)
  md.set(process.env.GATEWAY_HEADER ?? "x-gateway-sign", sign)

  // user context headers consumed by grpc-auth helpers
  md.set("x-user-id", opts?.userId ?? "00000000-0000-0000-0000-000000000001")
  md.set("x-user-role", opts?.role ?? "user")

  return md
}
