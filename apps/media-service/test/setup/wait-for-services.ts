// apps/media-service/test/setup/wait-for-services.ts
import waitPort from "wait-port"
import * as grpc from "@grpc/grpc-js"
import * as protoLoader from "@grpc/proto-loader"

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function toTarget(spec: string) {
  if (spec.startsWith("http")) {
    const u = new URL(spec)
    const def = u.protocol === "https:" ? 443 : 80
    return { host: u.hostname, port: Number(u.port || def), label: spec }
  }
  const [host, port] = spec.split(":")
  return { host, port: Number(port), label: spec }
}

async function waitHttpOk(baseUrl: string, timeoutMs: number) {
  const start = Date.now()
  const url = baseUrl.replace(/\/$/, "") + "/health" // add a HealthController if you don’t have it

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: "GET" })
      if (res.ok) return
    } catch {}
    await sleep(200)
  }

  // fallback: if you don't have /health yet, comment this function out
  throw new Error(`Timed out waiting for HTTP ready at ${url}`)
}

async function waitGrpcPing(grpcUrl: string, timeoutMs: number) {
  const start = Date.now()
  const MEDIA_PROTO = require.resolve("@nebula/protos/media.proto")

  const def = protoLoader.loadSync(MEDIA_PROTO, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  })
  const loaded = grpc.loadPackageDefinition(def) as any
  const MediaService = loaded.media.MediaService

  const client = new MediaService(grpcUrl, grpc.credentials.createInsecure())

  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise<void>((resolve, reject) => {
        client.Ping({}, (err: any) => (err ? reject(err) : resolve()))
      })
      return
    } catch {
      await sleep(200)
    }
  }

  throw new Error(`Timed out waiting for gRPC Ping at ${grpcUrl}`)
}

export default async function () {
  const timeoutMs = Number(process.env.WAIT_TIMEOUT_MS ?? 20_000)

  const authHttp = process.env.AUTH_HTTP_URL ?? "http://127.0.0.1:3001"
  const mediaHttp = process.env.MEDIA_HTTP_URL ?? "http://127.0.0.1:3007"
  const mediaGrpc = process.env.MEDIA_GRPC_URL ?? "127.0.0.1:50058"

  const targets = [authHttp, mediaHttp, mediaGrpc].map(toTarget)

  // 1) ports open
  for (const t of targets) {
    const ok = await waitPort({ host: t.host, port: t.port, timeout: timeoutMs, output: "silent" })
    if (!ok) throw new Error(`Timed out waiting for ${t.label} (${t.host}:${t.port})`)
  }

  // 2) HTTP ready (optional but recommended)
  // If you don't have /health yet, either add it or comment out these 2 lines.
  await waitHttpOk(authHttp, timeoutMs)
  await waitHttpOk(mediaHttp, timeoutMs)

  // 3) gRPC ready (real readiness)
  await waitGrpcPing(mediaGrpc, timeoutMs)
}
