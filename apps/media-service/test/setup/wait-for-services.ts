// apps/media-service/test/setup/wait-for-services.ts
import waitPort from "wait-port";
import { call, loadClient, mdS2S } from "../grpc/helpers";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function toTarget(spec: string) {
  if (spec.startsWith("http")) {
    const u = new URL(spec);
    const def = u.protocol === "https:" ? 443 : 80;
    return { host: u.hostname, port: Number(u.port || def), label: spec };
  }
  const [host, port] = spec.split(":");
  return { host, port: Number(port), label: spec };
}

async function waitHttpOk(baseUrl: string, timeoutMs: number) {
  const start = Date.now();
  const url = baseUrl.replace(/\/$/, "") + "/health";
  let lastError: unknown;

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.ok) return;
    } catch (err) {
      lastError = err;
    }
    await sleep(200);
  }

  const reason =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Timed out waiting for HTTP ready at ${url}: ${reason}`);
}

async function waitGrpcPing(grpcUrl: string, timeoutMs: number) {
  const start = Date.now();
  const MEDIA_PROTO = require.resolve("@nebula/protos/media.proto");
  const client = loadClient({
    url: grpcUrl,
    protoPath: MEDIA_PROTO,
    pkg: ["media"],
    svc: "MediaService",
  });
  let lastError: unknown;

  while (Date.now() - start < timeoutMs) {
    try {
      await call(client, "Ping", {}, mdS2S());
      return;
    } catch (error) {
      lastError = error;
      await sleep(200);
    }
  }

  const reason =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Timed out waiting for gRPC Ping at ${grpcUrl}: ${reason}`);
}

export default async function () {
  const timeoutMs = Number(process.env.WAIT_TIMEOUT_MS ?? 20_000);

  const authHttp = process.env.AUTH_HTTP_URL ?? "http://127.0.0.1:3001";
  const mediaHttp = process.env.MEDIA_HTTP_URL ?? "http://127.0.0.1:3007";
  const mediaGrpc = process.env.MEDIA_GRPC_URL ?? "127.0.0.1:50058";

  const targets = [authHttp, mediaHttp, mediaGrpc].map(toTarget);

  // 1) ports open
  for (const t of targets) {
    const ok = await waitPort({
      host: t.host,
      port: t.port,
      timeout: timeoutMs,
      output: "silent",
    });
    if (!ok)
      throw new Error(`Timed out waiting for ${t.label} (${t.host}:${t.port})`);
  }

  // 2) HTTP ready (optional but recommended)
  // If you don't have /health yet, either add it or comment out these 2 lines.
  await waitHttpOk(authHttp, timeoutMs);
  await waitHttpOk(mediaHttp, timeoutMs);

  // 3) gRPC ready (real readiness)
  await waitGrpcPing(mediaGrpc, timeoutMs);
}
