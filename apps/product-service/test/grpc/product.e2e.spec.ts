import { loadClient, call, mdS2S } from './helpers';

const PRODUCT_PROTO = require.resolve('@nebula/protos/product.proto');
const URL = process.env.PRODUCT_GRPC_URL || '127.0.0.1:50053';

// Minimal inputs (service validates & fills defaults)
const input = { title: 'E2E Widget gRPC', price: 149.5 };

describe('ProductService gRPC (gateway-only S2S, admin required on writes)', () => {
  const client = loadClient<any>({
    url: URL,
    protoPath: PRODUCT_PROTO,
    pkg: ['product'],
    svc: 'ProductService',
  });

  let id = '';

  it('CreateProduct requires signature + admin role', async () => {
    await expect(
      call<any>(client, 'CreateProduct', { data: input }) // no metadata
    ).rejects.toBeTruthy();

    const created = await call<any>(
      client,
      'CreateProduct',
      { data: input },
      mdS2S({ role: 'admin' })
    );
    expect(created).toHaveProperty('data');
    expect(created.data).toHaveProperty('id');
    expect(created.data.title).toBe(input.title);
    id = created.data.id;
  });

  it('GetProduct returns the created item', async () => {
    const res = await call<any>(client, 'GetProduct', { id }, mdS2S());
    expect(res.data.id).toBe(id);
  });

  it('ListProducts finds the created item', async () => {
    const res = await call<any>(client, 'ListProducts', { q: 'gRPC', page: 1, limit: 20 }, mdS2S());
    expect(res).toHaveProperty('data');
    expect(Array.isArray(res.data)).toBe(true);
    const hit = res.data.find((p: any) => p.id === id);
    expect(!!hit).toBe(true);
  });

  it('UpdateProduct (admin) changes title', async () => {
    const res = await call<any>(
      client,
      'UpdateProduct',
      { id, patch: { title: 'E2E Widget gRPC Pro' } },
      mdS2S({ role: 'admin' })
    );
    expect(res.data.id).toBe(id);
    expect(res.data.title).toBe('E2E Widget gRPC Pro');
  });
});
