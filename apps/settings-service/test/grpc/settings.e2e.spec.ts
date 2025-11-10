// apps/settings-service/test/grpc/settings.e2e.spec.ts
import { loadClient, call } from './helpers'; // your load/call as before
import { mdS2S } from './helpers';

const SETTINGS_PROTO = require.resolve('@nebula/protos/settings.proto');
const URL = process.env.SETTINGS_GRPC_URL || '127.0.0.1:55123';

describe('SettingsService gRPC (gateway-only S2S, svc:bucket)', () => {
  const client = loadClient<any>({
    url: URL,
    protoPath: SETTINGS_PROTO,
    pkg: ['settings'],
    svc: 'SettingsService',
  });

  const ns = 'e2e';
  const key = `site_title_${Math.random().toString(36).slice(2, 8)}`;
  const env = 'default';

  it('GetString (miss) → found=false', async () => {
    const res = await call<any>(client, 'GetString', { namespace: ns, environment: env, key }, mdS2S());
    expect(res).toEqual({ value: '', found: false });
  });

  it('SetString then GetString (hit)', async () => {
    const set = await call<any>(client, 'SetString', { namespace: ns, environment: env, key, value: 'Nebula E2E' }, mdS2S());
    expect(set).toEqual({ value: 'Nebula E2E' });

    const get = await call<any>(client, 'GetString', { namespace: ns, environment: env, key }, mdS2S());
    expect(get).toEqual({ value: 'Nebula E2E', found: true });
  });

  it('DeleteString then GetString (miss again)', async () => {
    const del = await call<any>(client, 'DeleteString', { namespace: ns, environment: env, key }, mdS2S());
    expect(del).toEqual({ deleted: true });

    const get2 = await call<any>(client, 'GetString', { namespace: ns, environment: env, key }, mdS2S());
    expect(get2).toEqual({ value: '', found: false });
  });

  it('Missing signature → request fails', async () => {
    await expect(
      call<any>(client, 'SetString', { namespace: ns, environment: env, key, value: 'x' }) // ← no mdS2S()
    ).rejects.toBeTruthy();
  });
});
