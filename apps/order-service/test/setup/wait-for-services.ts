// apps/order-service/test/setup/wait-for-services.ts
import * as net from "net";

type Target = { host: string; port: number; label: string };

function toTarget(raw: string): Target {
  // raw can be "http://127.0.0.1:3005" or "127.0.0.1:50056"
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    const url = new URL(raw);
    return { host: url.hostname, port: Number(url.port || 80), label: raw };
  }
  const [host, port] = raw.split(":");
  return { host, port: Number(port), label: raw };
}

function waitPort(target: Target, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();

    const onError = () => {
      if (Date.now() - start >= timeoutMs) {
        socket.destroy();
        return resolve(false);
      }
      setTimeout(() => {
        socket.connect(target.port, target.host);
      }, 250);
    };

    socket.setTimeout(timeoutMs);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", onError);
    socket.on("timeout", onError);

    socket.connect(target.port, target.host);
  });
}

export default async function () {
  const timeoutMs = Number(process.env.WAIT_TIMEOUT_MS ?? 20_000);

  const targets = [
    process.env.AUTH_HTTP_URL      ?? "http://127.0.0.1:3001",
    process.env.ORDER_HTTP_URL     ?? "http://127.0.0.1:3005",
    process.env.ORDER_GRPC_URL     ?? "127.0.0.1:50056",
    process.env.PRODUCT_HTTP_URL   ?? "http://127.0.0.1:3003",
    process.env.PRODUCT_GRPC_URL   ?? "127.0.0.1:50053",
    process.env.SETTINGS_HTTP_URL  ?? "http://127.0.0.1:3010",
    process.env.SETTINGS_GRPC_URL  ?? "127.0.0.1:50054",
  ].map(toTarget);

  for (const t of targets) {
    const ok = await waitPort(t, timeoutMs);
    if (!ok) throw new Error(`Timed out waiting for ${t.label} (${t.host}:${t.port})`);
  }
}

