// Default envs for settings-service tests (won't override if already set)
process.env.AUTH_HTTP_URL ||= "http://127.0.0.1:3001";
process.env.AUTH_GRPC_URL ||= "127.0.0.1:50052";
process.env.SETTINGS_HTTP_URL ||= "http://127.0.0.1:3010";
process.env.SETTINGS_GRPC_URL ||= "127.0.0.1:50054";

// Seeded accounts (from user-service seeder)
process.env.SEED_ADMIN_EMAIL ||= "admin@example.com";
process.env.SEED_ADMIN_PASS ||= "Admin123!";
process.env.SEED_USER_EMAIL ||= "user@example.com";
process.env.SEED_USER_PASS ||= "User123!";

// S2S / Gateway signing
process.env.S2S_SIGNATURE_HEADER ||= "x-s2s-signature";
process.env.SVC_NAME ||= "gateway";

// Obvious test-only gateway key; never copy it to a deployment.
process.env.S2S_TEST_GATEWAY_KEY ||= "dev-only-gateway-to-settings-s2s-key-001";
