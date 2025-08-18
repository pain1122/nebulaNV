import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// ✅ mock bcrypt for THIS spec (loads before import)
jest.mock('bcrypt', () => ({
  hash: jest.fn(async () => 'hashed_pw'),
  compare: jest.fn(async () => true),
}));

import { Test } from '@nestjs/testing';
import { UserService } from '../src/user/user.service';
import { PrismaService } from '../src/prisma.service';
import * as bcrypt from 'bcrypt';
const bcryptMock = bcrypt as unknown as {
  hash: jest.Mock<any>;
  compare: jest.Mock<any>;
};
type JMock = jest.Mock;

describe('UserService (simple)', () => {
  let service: UserService;

  // ultra-minimal Prisma mock; async arrows avoid TS 'never' traps
  const prisma = {
    user: {
      create: async (args: any) => ({
        id: 'u1',
        email: args.data.email,
        password: args.data.password,
        role: args.data.role,
      }),
      findUnique: async (args: any) => {
        if (args.where?.id === 'u1') {
          return { id: 'u1', email: 'x@y.com', password: 'hash', role: 'user' };
        }
        if (args.where?.email === 'a@b.com') {
          return { id: 'u1', email: 'a@b.com', password: 'stored_hash', role: 'user' };
        }
        if (args.where?.phone === '0912') {
          return { id: 'u1', email: 'p@y.com', phone: '0912', password: 'hash', role: 'user' };
        }
        return null;
      },
      findMany: async () => [
        { id: 'u1', email: 'x@y.com', phone: null, role: 'user', createdAt: new Date() },
      ],
      update: async (args: any) => ({ id: args.where.id, ...args.data }),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mod = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prisma as any },
      ],
    }).compile();

    service = mod.get(UserService);
  });

  it('createUser hashes password and creates user', async () => {
    const res = await service.createUser('a@b.com', 'secret');
    expect(bcrypt.hash).toHaveBeenCalledWith('secret', 10);
    expect(res).toMatchObject({ email: 'a@b.com', password: 'hashed_pw', role: 'user' });
  });

  it('validateUser returns user on password match, else null', async () => {
    // default compare is true from our mock
    const ok = await service.validateUser('a@b.com', 'secret');
    expect(ok).toMatchObject({ id: 'u1', email: 'a@b.com' });

    bcryptMock.compare.mockResolvedValueOnce(false);
    const bad = await service.validateUser('a@b.com', 'wrong');
    expect(bad).toBeNull();
  });

  it('getUserById hits prisma.findUnique', async () => {
    const res = await service.getUserById('u1');
    expect(res).toMatchObject({ id: 'u1', email: 'x@y.com' });
  });

  it('getAllUsers returns selected fields', async () => {
    const res = await service.getAllUsers();
    expect(Array.isArray(res)).toBe(true);
    expect(res[0]).toHaveProperty('id');
    expect(res[0]).toHaveProperty('createdAt');
  });

  it('updateProfile — email only', async () => {
    const res = await service.updateProfile('u1', { email: 'new@b.com' } as any);
    expect(res).toMatchObject({ id: 'u1', email: 'new@b.com' });
  });

  it('updateProfile — password change path', async () => {
    bcryptMock.compare.mockResolvedValueOnce(true);
    const res = await service.updateProfile('u1', { currentPassword: 'old', newPassword: 'new' } as any);
    expect(bcrypt.hash).toHaveBeenCalledWith('new', 10);
    expect(res).toMatchObject({ id: 'u1', password: 'hashed_pw' });
  });

  it('getUserByEmail / getUserByPhone delegate', async () => {
    const byEmail = await service.getUserByEmail('a@b.com');
    expect(byEmail).toMatchObject({ email: 'a@b.com' });

    const byPhone = await service.getUserByPhone('0912');
    expect(byPhone).toMatchObject({ phone: '0912' });
  });

  it('setRefreshToken updates user', async () => {
    const res = await service.setRefreshToken('u1', 'h');
    expect(res).toMatchObject({ id: 'u1', refreshToken: 'h' });
  });
});
