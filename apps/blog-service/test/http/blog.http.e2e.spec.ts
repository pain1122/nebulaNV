// apps/blog-service/test/http/blog.http.e2e.spec.ts
import { httpJson } from '../utils/http';

const BLOG_HTTP = process.env.BLOG_HTTP_URL ?? 'http://127.0.0.1:3004';
const AUTH_HTTP = process.env.AUTH_HTTP_URL ?? 'http://127.0.0.1:3001';

type LoginResp = { accessToken: string };

describe('blog-service HTTP (admin writes, public reads)', () => {
  let admin = '';
  let user  = '';
  let id    = '';
  let slug  = '';

  beforeAll(async () => {
    // normal user
    const ut = await httpJson<LoginResp>('POST', `${AUTH_HTTP}/auth/login`, {
      identifier: process.env.SEED_USER_EMAIL ?? 'user@example.com',
      password:   process.env.SEED_USER_PASS  ?? 'User123!',
    });
    user = ut.accessToken;

    // admin user
    const at = await httpJson<LoginResp>('POST', `${AUTH_HTTP}/auth/login`, {
      identifier: process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com',
      password:   process.env.SEED_ADMIN_PASS  ?? 'Admin123!',
    });
    admin = at.accessToken;
  });

  it('GET /blog/posts is public', async () => {
    const res = await httpJson<any>('GET', `${BLOG_HTTP}/blog/posts`);
    expect(res).toHaveProperty('data');
    expect(Array.isArray(res.data)).toBe(true);
  });

  it('POST /blog/posts requires admin', async () => {
    await expect(
      httpJson<any>(
        'POST',
        `${BLOG_HTTP}/blog/posts`,
        {
          data: {
            title: 'E2E Blog Post HTTP',
            body:  'Hello from HTTP tests',
            status: 'PUBLISHED',
          },
        },
        { authorization: `Bearer ${user}` },
      ),
    ).rejects.toBeTruthy();
  });

  it('POST /blog/posts (admin) creates', async () => {
    const res = await httpJson<any>(
      'POST',
      `${BLOG_HTTP}/blog/posts`,
      {
        data: {
          title: 'E2E Blog Post HTTP',
          body:  'Hello from HTTP tests',
          status: 'PUBLISHED',
          tags: ['e2e', 'http'],
        },
      },
      { authorization: `Bearer ${admin}` },
    );

    id = res.data.id;
    slug = res.data.slug;
    expect(res.data.title).toBe('E2E Blog Post HTTP');
  });

  it('GET /blog/posts/:slug returns the created post', async () => {
    const res = await httpJson<any>(
      'GET',
      `${BLOG_HTTP}/blog/posts/${slug}`,
    );
    expect(res.data.id).toBe(id);
    expect(res.data.slug).toBe(slug);
  });

  it('PATCH /blog/posts/:id (admin) updates', async () => {
    const res = await httpJson<any>(
      'PATCH',
      `${BLOG_HTTP}/blog/posts/${id}`,
      { patch: { title: 'E2E Blog Post HTTP Pro' } },
      { authorization: `Bearer ${admin}` },
    );

    expect(res.data.title).toBe('E2E Blog Post HTTP Pro');
  });

  it('GET /blog/posts lists includes the post (q filter)', async () => {
    const res = await httpJson<any>(
      'GET',
      `${BLOG_HTTP}/blog/posts?q=blog`,
    );
    const hit = res.data.find((p: any) => p.id === id);
    expect(!!hit).toBe(true);
  });
});
