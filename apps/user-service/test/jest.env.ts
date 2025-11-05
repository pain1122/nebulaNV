// apps/user-service/test/jest.env.ts
// Default envs for user-service tests (won't override if already set)

process.env.AUTH_HTTP_URL ||= 'http://127.0.0.1:3001';
process.env.USER_HTTP_URL ||= 'http://127.0.0.1:3100';
process.env.AUTH_GRPC_URL ||= '127.0.0.1:50052';
process.env.USER_GRPC_URL ||= '127.0.0.1:50051';
process.env.S2S_SECRET ||= 'dev-secret';

// S2S signing (used by mdS2S in test helpers)
process.env.GATEWAY_SECRET  ||= "`)C\Z<MB)T[}Sb3!A/]45#ZL-P}\BF<4x8y";
process.env.S2S_SECRET ||= 'dev-secret';
process.env.SVC_NAME ||= 'user-service';

// Seeded users (match your seeder defaults)
process.env.SEED_ADMIN_EMAIL ||= 'admin@example.com';
process.env.SEED_ADMIN_PASS ||= 'Admin123!';
process.env.SEED_USER_EMAIL ||= 'user@example.com';
process.env.SEED_USER_PASS ||= 'User123!';
