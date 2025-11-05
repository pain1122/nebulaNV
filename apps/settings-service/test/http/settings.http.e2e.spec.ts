import { httpJson } from '../utils/http';
import { minuteBucket, hmac } from '../grpc/helpers';

const SETTINGS_HTTP  = process.env.SETTINGS_HTTP_URL ?? 'http://127.0.0.1:3010';
const GATEWAY_HEADER = process.env.GATEWAY_HEADER ?? 'x-gateway-sign';
const SVC            = process.env.SVC_NAME ?? 'gateway'; // how the caller identifies itself
const SECRET         = process.env.S2S_SECRET ?? process.env.GATEWAY_SECRET ?? '';

// build headers for S2S writes (svc:bucket)
function s2sHeaders(): Record<string,string> {
  if (!SECRET) return {};
  const sig = hmac(SECRET, `${SVC}:${minuteBucket()}`);
  return { [GATEWAY_HEADER]: sig, 'x-svc': SVC };
}

describe('settings-service HTTP (gateway-only S2S on writes)', () => {
  const ns  = 'e2e';
  const key = `theme_color_${Math.random().toString(36).slice(2, 8)}`;
  const env = 'default';

  it('GET /settings/string (miss) → found=false', async () => {
    const res = await httpJson<any>(
      'GET',
      `${SETTINGS_HTTP}/settings/string?namespace=${ns}&key=${key}&environment=${env}`
    );
    expect(res).toEqual({ value: '', found: false });
  });

  it('PUT /settings/string requires signature', async () => {
    await expect(
      httpJson<any>('PUT', `${SETTINGS_HTTP}/settings/string`,
        { namespace: ns, key, value: 'red', environment: env })
    ).rejects.toBeTruthy();

    const res = await httpJson<any>(
      'PUT',
      `${SETTINGS_HTTP}/settings/string`,
      { namespace: ns, key, value: 'red', environment: env },
      s2sHeaders()
    );
    expect(res).toEqual({ value: 'red' });
  });

  it('GET /settings/string (hit) → found=true', async () => {
    const res = await httpJson<any>(
      'GET',
      `${SETTINGS_HTTP}/settings/string?namespace=${ns}&key=${key}&environment=${env}`
    );
    expect(res).toEqual({ value: 'red', found: true });
  });

  it('DELETE /settings/string requires signature, then miss', async () => {
    await expect(
      httpJson<any>('DELETE', `${SETTINGS_HTTP}/settings/string?namespace=${ns}&key=${key}&environment=${env}`)
    ).rejects.toBeTruthy();

    const del = await httpJson<any>(
      'DELETE',
      `${SETTINGS_HTTP}/settings/string?namespace=${ns}&key=${key}&environment=${env}`,
      undefined,
      s2sHeaders()
    );
    expect(del).toEqual({ deleted: true });

    const res = await httpJson<any>(
      'GET',
      `${SETTINGS_HTTP}/settings/string?namespace=${ns}&key=${key}&environment=${env}`
    );
    expect(res).toEqual({ value: '', found: false });
  });
});
