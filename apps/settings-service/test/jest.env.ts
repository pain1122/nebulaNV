// Default envs for settings-service tests (won't override if already set)
process.env.AUTH_HTTP_URL      ||= 'http://127.0.0.1:3001';
process.env.AUTH_GRPC_URL      ||= '127.0.0.1:50052';
process.env.SETTINGS_HTTP_URL  ||= 'http://127.0.0.1:3010';
process.env.SETTINGS_GRPC_URL  ||= '127.0.0.1:55123';

// Seeded accounts (from user-service seeder)
process.env.SEED_ADMIN_EMAIL   ||= 'admin@example.com';
process.env.SEED_ADMIN_PASS    ||= 'Admin123!';
process.env.SEED_USER_EMAIL    ||= 'user@example.com';
process.env.SEED_USER_PASS     ||= 'User123!';

// S2S / Gateway signing
process.env.GATEWAY_HEADER     ||= 'x-gateway-sign';
process.env.SVC_NAME           ||= 'gateway';

// IMPORTANT: keep S2S secret distinct from GATEWAY secret.
// Provide S2S_SECRET here because tests sign gRPC metadata directly.
process.env.S2S_SECRET         ||= 'dev-secret-s2s-please-change-this-32chars-min';
