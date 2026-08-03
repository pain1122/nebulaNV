// Default values so you DON’T need to set env per shell
process.env.AUTH_HTTP_URL ||= 'http://127.0.0.1:3001';
process.env.AUTH_GRPC_URL ||= '127.0.0.1:50052';
process.env.USER_GRPC_URL ||= '127.0.0.1:50051';

process.env.S2S_SIGNATURE_HEADER ||= 'x-s2s-signature';
process.env.SVC_NAME ||= 'gateway';
process.env.S2S_TEST_GATEWAY_KEY ||= 'dev-only-gateway-to-auth-s2s-key-00001';
process.env.S2S_TEST_SERVICE_KEY ||= 'dev-only-auth-to-auth-s2s-key-00000001';

// Real admin (lets the admin→user & user→admin gRPC assertions run)
process.env.SEED_ADMIN_EMAIL ||= 'admin@example.com';
process.env.SEED_ADMIN_PASS ||= 'Admin123!';
process.env.SEED_USER_EMAIL ||= 'user@example.com';
process.env.SEED_USER_PASS ||= 'User123!';
