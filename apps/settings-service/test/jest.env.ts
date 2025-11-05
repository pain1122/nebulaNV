// Default envs for settings-service tests (won't override if already set)
process.env.SETTINGS_HTTP_URL ||= 'http://127.0.0.1:3010';
process.env.SETTINGS_GRPC_URL ||= '127.0.0.1:55123';

// Signature header & secret (from your .env)
process.env.GATEWAY_HEADER    ||= 'x-gateway-sign';
process.env.GATEWAY_SECRET    ||= ")d'F(Zy.{8`,3w|+*\N6^bQ;C/>t+Kxi-f(";

// Optional svc label (unused by bucket-only, harmless if present)
process.env.SVC_NAME          ||= 'settings-service';