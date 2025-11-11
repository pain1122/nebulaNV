import { loadClient, call, mdS2S } from './helpers';

const PRODUCT_PROTO = require.resolve('@nebula/protos/product.proto');
const URL = process.env.PRODUCT_GRPC_URL || '127.0.0.1:50053';

const input = { title: 'E2E Widget gRPC', price: 149.5 };

describe('ProductService gRPC (admin required on writes)', () => {
  const client = loadClient<any>({
    url: URL,
    protoPath: PRODUCT_PROTO,
    pkg: ['product'],
    svc: 'ProductService',
  });

  let id = '';

  it('CreateProduct rejects without metadata', async () => {
    await expect(
      call<any>(client, 'CreateProduct', { data: input })
    ).rejects.toBeTruthy();
  });

  it('CreateProduct succeeds with S2S admin metadata', async () => {
    const res = await call<any>(client, 'CreateProduct', { data: input }, mdS2S({ role: 'admin' }));
    id = res.data.id;
    expect(res.data.title).toBe(input.title);
  });

  it('GetProduct returns the created item (public)', async () => {
    const res = await call<any>(client, 'GetProduct', { id }, mdS2S());
    expect(res.data.id).toBe(id);
  });

  it('ListProducts finds the created item (public)', async () => {
    const res = await call<any>(client, 'ListProducts', { q: 'gRPC', page: 1, limit: 20 }, mdS2S());
    const hit = res.data.find((p: any) => p.id === id);
    expect(!!hit).toBe(true);
  });

  it('UpdateProduct (admin) changes title', async () => {
    const res = await call<any>(
      client,
      'UpdateProduct',
      { id, data: { title: 'E2E Widget gRPC Pro' } },
      mdS2S({ role: 'admin' })
    );
    expect(res.data.title).toBe('E2E Widget gRPC Pro');
  });
});
