import waitPort from 'wait-port';

function toTarget(spec: string) {
  // Accept either an HTTP URL (e.g. http://127.0.0.1:3001)
  // or a host:port pair (e.g. 127.0.0.1:50051)
  if (spec.startsWith('http')) {
    const u = new URL(spec);
    const defPort = u.protocol === 'https:' ? 443 : 80;
    return { host: u.hostname, port: Number(u.port || defPort), label: spec };
  }
  const [host, port] = spec.split(':');
  return { host, port: Number(port), label: spec };
}

export default async function () {
  const timeoutMs = Number(process.env.WAIT_TIMEOUT_MS ?? 20_000);

  // What we wait on:
  // - auth-service HTTP (for /auth/login used by tests)
  // - auth-service gRPC (GrpcTokenAuthGuard validates tokens through this)
  // - user-service gRPC (the service under test)
  const targets = [
    process.env.AUTH_HTTP_URL ?? 'http://127.0.0.1:3001',
    process.env.AUTH_GRPC_URL ?? '127.0.0.1:50052',
    process.env.USER_GRPC_URL ?? '127.0.0.1:50051',
    process.env.USER_HTTP_URL ?? 'http://127.0.0.1:3100',
  ].map(toTarget);

  for (const t of targets) {
    const ok = await waitPort({
      host: t.host,
      port: t.port,
      timeout: timeoutMs,
      output: 'silent',
    });
    if (!ok) {
      throw new Error(`Timed out waiting for ${t.label} (${t.host}:${t.port})`);
    }
  }
}
