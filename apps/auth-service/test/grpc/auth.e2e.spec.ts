import { call, loadClient, mdS2S } from './helpers';
import { AUTH_HTTP, httpJson, type LoginResp } from '../utils/http';

const AUTH_PROTO = require.resolve('@nebula/protos/auth.proto');
const AUTH_GRPC_URL = process.env.AUTH_GRPC_URL ?? '127.0.0.1:50052';

describe('AuthService gRPC exact mixed caller policy', () => {
  const client = loadClient<any>({
    url: AUTH_GRPC_URL,
    protoPath: AUTH_PROTO,
    pkg: 'auth',
    svc: 'AuthService',
  });
  let accessToken = '';

  beforeAll(async () => {
    const login = await httpJson<LoginResp>('POST', `${AUTH_HTTP}/auth/login`, {
      identifier: process.env.SEED_USER_EMAIL ?? 'user@example.com',
      password: process.env.SEED_USER_PASS ?? 'User123!',
    });
    accessToken = login.accessToken;
  });

  it.each([
    ['gateway', undefined],
    ['ordinary auth service', { kind: 'service' as const }],
  ])(
    'ValidateToken accepts the approved %s identity',
    async (_label, options) => {
      const response = await call<any>(
        client,
        'ValidateToken',
        { token: accessToken },
        mdS2S(options),
      );

      expect(response.isValid).toBe(true);
      expect(response.userId).toBeTruthy();
      expect(response.sessionRef).toBeTruthy();
    },
  );
});
