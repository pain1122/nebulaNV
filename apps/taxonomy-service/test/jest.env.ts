// Default envs for taxonomy-service tests (won't override if already set)
process.env.AUTH_HTTP_URL ||= "http://127.0.0.1:3001";
process.env.SETTINGS_HTTP_URL ||= "http://127.0.0.1:3010";
process.env.SETTINGS_GRPC_URL ||= "127.0.0.1:50054";

// Taxonomy service HTTP/GRPC (for tests or external clients)
process.env.TAXONOMY_HTTP_URL ||= "http://127.0.0.1:3006";
process.env.TAXONOMY_GRPC_URL ||= "127.0.0.1:50057";

// Seeded accounts (from user-service seeder)
process.env.SEED_ADMIN_EMAIL ||= "admin@example.com";
process.env.SEED_ADMIN_PASS ||= "Admin123!";
process.env.SEED_USER_EMAIL ||= "user@example.com";
process.env.SEED_USER_PASS ||= "User123!";
process.env.PUBLIC_MODE = "OPTIONAL_AUTH";

// S2S / Gateway signing
process.env.S2S_SIGNATURE_HEADER ||= "x-s2s-signature";
process.env.SVC_NAME ||= "gateway";

// IMPORTANT: tests sign gRPC metadata directly (gateway-style)
process.env.S2S_TEST_GATEWAY_KEY ||= "dev-only-gateway-to-taxonomy-s2s-key-001";
