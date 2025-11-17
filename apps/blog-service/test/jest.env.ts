// apps/blog-service/test/jest.env.ts

// HTTP URLs
process.env.AUTH_HTTP_URL     ||= 'http://127.0.0.1:3001';
process.env.BLOG_HTTP_URL     ||= 'http://127.0.0.1:3004';

// gRPC URLs
process.env.BLOG_GRPC_URL     ||= '127.0.0.1:50055';

// Seeded accounts (from user-service seeder)
process.env.SEED_ADMIN_EMAIL  ||= 'admin@example.com';
process.env.SEED_ADMIN_PASS   ||= 'Admin123!';
process.env.SEED_USER_EMAIL   ||= 'user@example.com';
process.env.SEED_USER_PASS    ||= 'User123!';

// Public mode (same as root)
process.env.PUBLIC_MODE       ||= 'OPTIONAL_AUTH';

// S2S / Gateway signing
process.env.GATEWAY_HEADER    ||= 'x-gateway-sign';
process.env.SVC_NAME          ||= 'blog-service';

// IMPORTANT: tests sign gRPC metadata directly (gateway-style)
process.env.S2S_SECRET        ||= 'n}T>QYq}Gfji_A3@*YBT9)WoT>Aq_Tf%3F79Q:TG';
