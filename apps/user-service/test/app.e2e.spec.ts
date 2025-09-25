import { describe, it, beforeAll, afterAll, expect, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { INestApplication, CanActivate, ExecutionContext, ValidationPipe } from '@nestjs/common';
import request from 'supertest';

import { UserController } from '../src/user/user.controller';
import { UserService } from '../src/user/user.service';
import { PrismaService } from '../src/prisma.service';

// bcrypt mock for password-change path only
jest.mock('bcrypt', () => ({
  hash: jest.fn(async () => 'new_hash'),
  compare: jest.fn(async (plain: string) => plain === 'securepass'),
}));

// Minimal guard: inject req.user from headers (or defaults)
class FakeAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const role = (req.headers['x-role'] as string) || 'admin';
    const userId = (req.headers['x-user-id'] as string) || 'u1';
    req.user = { userId, role, email: `${userId}@example.com` };
    return true;
  }
}

// In-memory Prisma stub (only what UserService calls)
function makePrisma(): PrismaService {
  const db = {
    users: [
      { id: 'u1', email: 'x@y.com', password: 'old_hash', role: 'user', phone: null, createdAt: new Date(), refreshToken: null as string | null },
      { id: 'u2', email: 'other@y.com', password: 'old_hash', role: 'user', phone: null, createdAt: new Date(), refreshToken: null as string | null },
    ],
  };

  return {
    user: {
      findMany: async ({ select }: any) =>
        db.users.map(u => select
          ? { id: u.id, email: u.email, phone: u.phone, role: u.role, createdAt: u.createdAt }
          : u),
      findUnique: async ({ where }: any) => {
        if (where.id) return db.users.find(u => u.id === where.id) || null;
        if (where.email) return db.users.find(u => u.email === where.email) || null;
        if (where.phone) return db.users.find(u => u.phone === where.phone) || null;
        return null;
      },
      create: async ({ data }: any) => {
        const u = { id: `u${db.users.length + 1}`, createdAt: new Date(), phone: null, refreshToken: null, ...data };
        db.users.push(u);
        return u;
      },
      update: async ({ where, data }: any) => {
        const i = db.users.findIndex(u => u.id === where.id);
        if (i === -1) throw new Error('Not found');
        db.users[i] = { ...db.users[i], ...data };
        return db.users[i];
      },
    },
    $connect: async () => {},
    $disconnect: async () => {},
  } as unknown as PrismaService;
}

describe('User E2E (minimal)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        UserService,
        { provide: PrismaService, useValue: makePrisma() },
      ],
    }).compile();

    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalGuards(new FakeAuthGuard());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /users (admin ok)', async () => {
    const res = await request(app.getHttpServer())
      .get('/users')
      .set('x-role', 'admin')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0]).toHaveProperty('createdAt');
  });

  // ⛔️ Removed GET /users/me — that endpoint lives in auth-service

  it('PUT /users/me updates email', async () => {
    const res = await request(app.getHttpServer())
      .put('/users/me')
      .set('x-user-id', 'u1')
      .set('x-role', 'user')
      .send({ email: `updated${Date.now()}@example.com` })
      .expect(200);

    expect(res.body.email).toContain('updated');
  });

  it('PUT /users/me changes password with correct currentPassword', async () => {
    const res = await request(app.getHttpServer())
      .put('/users/me')
      .set('x-user-id', 'u1')
      .set('x-role', 'user')
      .send({ currentPassword: 'securepass', newPassword: 'NewPass123' })
      .expect(200);

    expect(res.body).toHaveProperty('password');
  });

  it('PUT /users/me rejects wrong currentPassword', async () => {
    await request(app.getHttpServer())
      .put('/users/me')
      .set('x-user-id', 'u1')
      .set('x-role', 'user')
      .send({ currentPassword: 'WrongPass', newPassword: 'DoesNotMatter' })
      .expect(400);
  });

  it('GET /users/:id denies non-admin accessing others', async () => {
    await request(app.getHttpServer())
      .get('/users/u2')
      .set('x-user-id', 'u1')
      .set('x-role', 'user')
      .expect(403);
  });

  it('GET /users/:id allows admin accessing others', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/u2')
      .set('x-user-id', 'u1')
      .set('x-role', 'admin')
      .expect(200);

    expect(res.body).toMatchObject({ id: 'u2' });
  });
});
