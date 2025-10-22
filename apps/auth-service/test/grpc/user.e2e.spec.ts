// apps/auth-service/test/grpc/user.e2e.spec.ts
import { mdAuth, mdS2S, loadClient, call, CODES } from './helpers';

const USER_PROTO = require.resolve('@nebula/protos/user.proto');

describe('UserService gRPC (e2e, TS)', () => {
  const url = process.env.USER_GRPC_URL || '127.0.0.1:50051';
  const client = loadClient<any>({
    url,
    protoPath: USER_PROTO,
    pkg: ['user', 'userv1'],
    svc: 'UserService',
  });

  const itIf = (cond: boolean) => (cond ? it : it.skip);

  const adminId = process.env.ADMIN_ID;
  const userId = process.env.USER_ID;
  const adminAccess = process.env.ADMIN_ACCESS;
  const userAccess = process.env.USER_ACCESS;

  it('findUserWithHash accepts S2S only', async () => {
    const res = await call<any>(
      client,
      'findUserWithHash',
      { email: 'nope@example.com' },
      mdS2S()
    );
    expect(res).toHaveProperty('id'); // empty string when not found is ok
  });

  itIf(!!(userId && userAccess))(
    'getUser self with user JWT succeeds',
    async () => {
      const res = await call<any>(
        client,
        'getUser',
        { id: userId },
        mdAuth({ access: userAccess, userId })
      );
      expect(res).toHaveProperty('id', userId);
    }
  );

  itIf(!!(userAccess && userId && adminId))(
    'getUser user→admin is denied',
    async () => {
      await expect(
        call(client, 'getUser', { id: adminId }, mdAuth({ access: userAccess, userId }))
      ).rejects.toMatchObject({ code: CODES.PERMISSION_DENIED });
    }
  );

  itIf(!!(adminAccess && adminId && userId))(
    'getUser admin→user succeeds',
    async () => {
      const res = await call<any>(
        client,
        'getUser',
        { id: userId },
        mdAuth({ access: adminAccess, userId: adminId })
      );
      expect(res).toHaveProperty('id', userId);
    }
  );
});
