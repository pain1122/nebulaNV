// apps/user-service/test/jest.env.ts
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// 1) Try the root .env first (../../.env from this file)
const ROOT_ENV = path.resolve(__dirname, '../../.env');
if (fs.existsSync(ROOT_ENV)) {
  dotenv.config({ path: ROOT_ENV, override: false });
}

// 2) Optionally load service-local .env (../.env)
const SERVICE_ENV = path.resolve(__dirname, '../.env');
if (fs.existsSync(SERVICE_ENV)) {
  dotenv.config({ path: SERVICE_ENV, override: false });
}

// 3) Defaults so you don't need to export these per shell
process.env.USER_HTTP_URL  ||= 'http://127.0.0.1:3100';
process.env.USER_GRPC_URL  ||= '127.0.0.1:50051';
process.env.SELF_USER_ID   ||= 'u_self_e2e';
process.env.OTHER_USER_ID  ||= 'u_other_e2e';
process.env.ADMIN_USER_ID  ||= 'u_admin_e2e';

// Optional S2S/Internal defaults (only if you use them in tests)
process.env.S2S_NAME       ||= 'gateway';
process.env.S2S_SECRET     ||= '';             // leave empty unless you actually test S2S
process.env.S2S_HEADER     ||= 'x-svc';
process.env.S2S_SIGN_HEADER||= 'x-svc-sign';

// Final guard: we MUST share the same JWT secret as the running service
if (!process.env.JWT_ACCESS_SECRET) {
  // Make this a hard failure to avoid signing mismatched tokens
  throw new Error(
    'JWT_ACCESS_SECRET is not set. Put it in your repo-root .env so tests can sign tokens the service will accept.'
  );
}
