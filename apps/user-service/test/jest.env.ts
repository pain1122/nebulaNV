// apps/user-service/test/jest.env.ts
// Default envs for user-service tests (won't override if already set)

process.env.AUTH_HTTP_URL ||= 'http://127.0.0.1:3001';
process.env.USER_HTTP_URL ||= 'http://127.0.0.1:3100';
process.env.AUTH_GRPC_URL ||= '127.0.0.1:50052';
process.env.USER_GRPC_URL ||= '127.0.0.1:50051';

// S2S signing (used by mdS2S in test helpers)
process.env.S2S_SIGNATURE_HEADER ||= 'x-s2s-signature';
process.env.S2S_TEST_GATEWAY_KEY ||= 'dev-only-gateway-to-user-s2s-key-00001';
process.env.S2S_TEST_SERVICE_KEY ||= 'dev-only-auth-to-user-s2s-key-00000001';
process.env.SVC_NAME ||= 'auth-service';

// Seeded users (match your seeder defaults)
process.env.SEED_ADMIN_EMAIL ||= 'admin@example.com';
process.env.SEED_ADMIN_PASS ||= 'Admin123!';
process.env.SEED_USER_EMAIL ||= 'user@example.com';
process.env.SEED_USER_PASS ||= 'User123!';
