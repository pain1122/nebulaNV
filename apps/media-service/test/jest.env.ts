// apps/media-service/test/jest.env.ts
process.env.AUTH_HTTP_URL ||= "http://127.0.0.1:3001";
process.env.AUTH_GRPC_URL ||= "127.0.0.1:50052";

process.env.MEDIA_HTTP_URL ||= "http://127.0.0.1:3007";
process.env.MEDIA_GRPC_URL ||= "127.0.0.1:50058";

// Seeded accounts (from user-service seeder)
process.env.SEED_ADMIN_EMAIL ||= "admin@example.com";
process.env.SEED_ADMIN_PASS ||= "Admin123!";
process.env.SEED_USER_EMAIL ||= "user@example.com";
process.env.SEED_USER_PASS ||= "User123!";

// S2S signature
process.env.S2S_SIGNATURE_HEADER ||= "x-s2s-signature";
process.env.MEDIA_DELETE_CONFIRM_SECRET ||=
  "test-only-media-delete-confirm-secret-0001";
process.env.SVC_NAME ||= "gateway";

// IMPORTANT: S2S secret used by mdS2S() in gRPC tests
process.env.S2S_TEST_GATEWAY_KEY ||= "dev-only-gateway-to-media-s2s-key-0001";

// Storage (Supabase Storage S3 gateway)
process.env.MEDIA_STORAGE_DRIVER ||= "s3";
process.env.MEDIA_S3_ENDPOINT ||= "http://127.0.0.1:54321/storage/v1/s3";
process.env.MEDIA_S3_REGION ||= "local";
process.env.MEDIA_S3_BUCKET ||= "media";

// If you already set these in apps/media-service/.env you can omit here.
// (But keeping them in your real .env is better)
