// ---- Service endpoints (defaults match your assigned ports) ----
process.env.AUTH_HTTP_URL ||= 'http://127.0.0.1:3001';
process.env.AUTH_GRPC_URL ||= '127.0.0.1:50052';
process.env.USER_HTTP_URL ||= 'http://127.0.0.1:3100';
process.env.USER_GRPC_URL ||= '127.0.0.1:50051';

// ---- Security & mode (tests assume gateway-style hardening) ----
process.env.PUBLIC_MODE ||= 'GATEWAY_ONLY';
process.env.SVC_NAME ||= 'user-service';

// Used to sign x-gateway-sign (minute-bucket HMAC). Override in CI if needed.
process.env.GATEWAY_SECRET ||= 'dev_gateway_secret_change_me';

// ---- Seeded identities (already baked into DB as you said) ----
// Override these via env if your fixture creds differ.
process.env.ADMIN_IDENTIFIER ||= 'mytest3@example.com';
process.env.ADMIN_PASSWORD ||= 'MyStrongPass123!';
process.env.USER_IDENTIFIER ||= 'test@example.com';
process.env.USER_PASSWORD ||= 'MyStrongPass123!';

// Optional: print non-sensitive boot info when debugging
if (process.env.JEST_LOG_BOOT === '1') {
  // eslint-disable-next-line no-console
  console.log('[jest.env] AUTH_HTTP_URL =', process.env.AUTH_HTTP_URL);
  console.log('[jest.env] AUTH_GRPC_URL =', process.env.AUTH_GRPC_URL);
  console.log('[jest.env] USER_HTTP_URL =', process.env.USER_HTTP_URL);
  console.log('[jest.env] USER_GRPC_URL =', process.env.USER_GRPC_URL);
  console.log('[jest.env] PUBLIC_MODE   =', process.env.PUBLIC_MODE);
  console.log('[jest.env] SVC_NAME      =', process.env.SVC_NAME);
}