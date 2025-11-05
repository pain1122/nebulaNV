// Default values so you DON’T need to set env per shell
process.env.AUTH_HTTP_URL  ||= 'http://127.0.0.1:3001';
process.env.AUTH_GRPC_URL  ||= '127.0.0.1:50052';
process.env.USER_GRPC_URL  ||= '127.0.0.1:50051';

process.env.SVC_NAME       ||= 'auth-service';
process.env.GATEWAY_SECRET ||= "T6ybIF'B2^E,y?CTOfZ!YW10c5hc]f&3mx^";

// Real admin (lets the admin→user & user→admin gRPC assertions run)
process.env.SEED_ADMIN_EMAIL ||= 'admin@example.com';
process.env.SEED_ADMIN_PASS  ||= 'Admin123!';
process.env.SEED_USER_EMAIL  ||= 'user@example.com';
process.env.SEED_USER_PASS   ||= 'User123!';