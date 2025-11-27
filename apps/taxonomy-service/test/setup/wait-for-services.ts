import waitPort from 'wait-port';

function toTarget(spec: string) {
  if (spec.startsWith('http')) {
    const u = new URL(spec);
    const def = u.protocol === 'https:' ? 443 : 80;
    return { host: u.hostname, port: Number(u.port || def), label: spec };
  }
  const [host, port] = spec.split(':');
  return { host, port: Number(port), label: spec };
}

export default async function () {
  const timeoutMs = Number(process.env.WAIT_TIMEOUT_MS ?? 20_000);
  const targets = [
    process.env.AUTH_HTTP_URL      ?? 'http://127.0.0.1:3001',
    process.env.SETTINGS_HTTP_URL  ?? 'http://127.0.0.1:3010',
    process.env.SETTINGS_GRPC_URL  ?? '127.0.0.1:55123',
    process.env.PRODUCT_HTTP_URL   ?? 'http://127.0.0.1:3003',
    process.env.PRODUCT_GRPC_URL   ?? '127.0.0.1:50053',
  ].map(toTarget);

  for (const t of targets) {
    const ok = await waitPort({ host: t.host, port: t.port, timeout: timeoutMs, output: 'silent' });
    if (!ok) throw new Error(`Timed out waiting for ${t.label} (${t.host}:${t.port})`);
  }
}
