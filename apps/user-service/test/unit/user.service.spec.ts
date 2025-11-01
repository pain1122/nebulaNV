// apps/user-service/test/unit/user.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { UserService } from '../../src/user/user.service';
import { PrismaService } from '../../src/prisma.service';

// --- Minimal in-memory Prisma double, focused on fields your service uses ---
type User = {
  id: string;
  email?: string | null;
  phone?: string | null;
  password: string;
  role: string;
  refreshToken?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

function applySelect(u: any, select?: any) {
  if (!select) return { ...u };
  const out: any = {};
  for (const k of Object.keys(select)) {
    if (select[k]) out[k] = (u as any)[k];
  }
  return out;
}

class PrismaDouble {
  public user = new (class {
    private store = new Map<string, User>();
    private byEmail = new Map<string, string>();
    private byPhone = new Map<string, string>();
    private seq = 1;

    seed(list: User[]) {
      for (const u of list) {
        this.store.set(u.id, { ...u });
        if (u.email) this.byEmail.set(u.email.toLowerCase(), u.id);
        if (u.phone) this.byPhone.set(u.phone, u.id);
      }
    }

    private genId() {
      return 'u' + this.seq++;
    }

    async findUnique(args: any): Promise<any> {
      const where = args?.where || {};
      if (where.id) {
        const u = this.store.get(where.id);
        return u ? applySelect(u, args?.select) : null;
      }
      if (where.email) {
        const id = this.byEmail.get(where.email.toLowerCase());
        const u = id ? this.store.get(id)! : null;
        return u ? applySelect(u, args?.select) : null;
      }
      if (where.phone) {
        const id = this.byPhone.get(where.phone);
        const u = id ? this.store.get(id)! : null;
        return u ? applySelect(u, args?.select) : null;
      }
      return null;
    }

    async findMany(args: any = {}): Promise<any[]> {
      let list = Array.from(this.store.values());
      if (args.where) {
        list = list.filter((u) =>
          Object.entries(args.where).every(([k, v]) => (v === undefined ? true : (u as any)[k] === v)),
        );
      }
      return list.map((u) => applySelect(u, args.select));
    }

    async count(args: any = {}): Promise<number> {
      return (await this.findMany(args)).length;
    }

    async create(args: any): Promise<any> {
      const data = args.data;
      const email = (data.email || '').toLowerCase();
      if (email && this.byEmail.has(email)) {
        const err: any = new Error('Unique constraint failed on the fields: (`email`)');
        err.code = 'P2002';
        err.meta = { target: ['email'] };
        throw err;
      }
      const phone = data.phone;
      if (phone && this.byPhone.has(phone)) {
        const err: any = new Error('Unique constraint failed on the fields: (`phone`)');
        err.code = 'P2002';
        err.meta = { target: ['phone'] };
        throw err;
      }
      const id = this.genId();
      const now = new Date();
      const u: User = {
        id,
        email: data.email ?? null,
        phone: data.phone ?? null,
        password: data.password,
        role: data.role ?? 'user',
        refreshToken: data.refreshToken ?? null,
        createdAt: now,
        updatedAt: now,
      };
      this.store.set(id, u);
      if (u.email) this.byEmail.set(u.email.toLowerCase(), id);
      if (u.phone) this.byPhone.set(u.phone, id);
      return { ...u };
    }

    async update(args: any): Promise<any> {
      const where = args.where;
      const id = where.id
        ? where.id
        : where.email
        ? this.byEmail.get(where.email.toLowerCase())
        : where.phone
        ? this.byPhone.get(where.phone)
        : undefined;
      if (!id || !this.store.has(id)) {
        const err: any = new Error('Record to update not found.');
        err.code = 'P2025';
        throw err;
      }
      const target = this.store.get(id)!;
      const data = args.data;

      if (data.email && data.email.toLowerCase() !== (target.email || '').toLowerCase()) {
        const key = data.email.toLowerCase();
        if (this.byEmail.has(key)) {
          const err: any = new Error('Unique constraint failed on the fields: (`email`)');
          err.code = 'P2002';
          err.meta = { target: ['email'] };
          throw err;
        }
      }

      if ('email' in data) {
        if (target.email) this.byEmail.delete(target.email.toLowerCase());
        target.email = data.email;
        if (target.email) this.byEmail.set(target.email.toLowerCase(), id);
      }
      if ('phone' in data) {
        if (target.phone) this.byPhone.delete(target.phone);
        target.phone = data.phone;
        if (target.phone) this.byPhone.set(target.phone, id);
      }
      if ('password' in data) target.password = data.password;
      if ('role' in data) target.role = data.role;
      if ('refreshToken' in data) target.refreshToken = data.refreshToken;

      target.updatedAt = new Date();
      const out = { ...target };
      return args?.select ? applySelect(out, args.select) : out;
    }
  })();
}

// -------------------- TESTS --------------------

describe('UserService (unit with Prisma double)', () => {
  let service: UserService;
  let prisma: PrismaDouble;

  const adminId = 'adm-1';
  const userId = 'usr-1';
  const adminPlain = 'Admin123!';
  const userPlain = 'User123!';

  beforeAll(() => {
    process.env.BCRYPT_ROUNDS = '4'; // faster hashing in tests
  });

  beforeEach(async () => {
    prisma = new PrismaDouble();
    const adminHash = await bcrypt.hash(adminPlain, 4);
    const userHash = await bcrypt.hash(userPlain, 4);

    (prisma.user as any).seed([
      { id: adminId, email: 'admin@local.test', role: 'admin', password: adminHash, refreshToken: null },
      { id: userId,  email: 'user@local.test',  role: 'user',  password: userHash,  refreshToken: null },
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('createUser hashes password and sets role=user', async () => {
    const u = await service.createUser('New@Local.TEST', 'NewPass123!');
    expect(u.id).toBeTruthy();
    expect(u.email).toBe('new@local.test');
    expect(u.role).toBe('user');
    expect(u.password).not.toBe('NewPass123!');
    const ok = await bcrypt.compare('NewPass123!', u.password);
    expect(ok).toBe(true);
  });

  it('validateUser returns user with correct password and null with wrong password', async () => {
    const ok = await service.validateUser('user@local.test', userPlain);
    expect(ok?.id).toBe(userId);

    const bad = await service.validateUser('user@local.test', 'WrongPass!');
    expect(bad).toBeNull();
  });

  it('getUserById (self) returns record; (admin) can read any', async () => {
    const self = await service.getUserById(userId, { userId, role: 'user' });
    expect(self?.id).toBe(userId);

    const adminRead = await service.getUserById(userId, { userId: adminId, role: 'admin' });
    expect(adminRead?.id).toBe(userId);
  });

  it('getAllUsers enforces admin role', async () => {
    await expect(service.getAllUsers({ role: 'user' } as any)).rejects.toBeInstanceOf(ForbiddenException);

    const list = await service.getAllUsers({ role: 'admin' } as any);
    expect(Array.isArray(list)).toBe(true);
    for (const row of list) {
      expect(row).toHaveProperty('id');
      expect(row).toHaveProperty('email');
      expect(row).toHaveProperty('role');
      expect(row).not.toHaveProperty('password');
    }
  });

  it('updateProfile: email change works & uniqueness enforced', async () => {
    const updated = await service.updateProfile(userId, { email: 'newmail@test.dev' } as any, { userId, role: 'user' });
    expect(updated.email).toBe('newmail@test.dev');

    await (prisma.user as any).create({ data: { email: 'taken@test.dev', password: await bcrypt.hash('x', 4), role: 'user' } });
    await expect(
      service.updateProfile(userId, { email: 'taken@test.dev' } as any, { userId, role: 'user' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updateProfile: password change requires currentPassword and hashes new password', async () => {
    await expect(
      service.updateProfile(userId, { newPassword: 'NextPass123!' } as any, { userId, role: 'user' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.updateProfile(userId, { currentPassword: 'Nope123!', newPassword: 'NextPass123!' } as any, { userId, role: 'user' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const after = await service.updateProfile(
      userId,
      { currentPassword: userPlain, newPassword: 'NextPass123!' } as any,
      { userId, role: 'user' },
    );
    const ok = await bcrypt.compare('NextPass123!', after.password);
    expect(ok).toBe(true);
  });

  it('setRefreshToken sets and clears refresh token', async () => {
    const r1 = await service.setRefreshToken(userId, 'RT-1');
    expect(r1.id).toBe(userId);

    const got1 = await (prisma.user as any).findUnique({ where: { id: userId } });
    expect(got1?.refreshToken).toBe('RT-1');

    const r2 = await service.setRefreshToken(userId, null);
    expect(r2.id).toBe(userId);
    const got2 = await (prisma.user as any).findUnique({ where: { id: userId } });
    expect(got2?.refreshToken).toBe(null);
  });
});
