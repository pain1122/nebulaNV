// apps/user-service/test/prisma.mock.ts
// Minimal in-memory Prisma mock for unit tests of user-service.
// Focused on prisma.user.* methods commonly used by UserService.

import * as crypto from 'crypto';

export type MockUser = {
  id: string;
  email: string;
  role: 'user' | 'admin' | 'root-admin';
  password?: string | null;
  refreshToken?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  // add any extra fields your DTOs expect (displayName, phone, etc.)
  [k: string]: any;
};

function genId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString('hex');
}
function now() {
  return new Date();
}

type WhereUnique = { id?: string; email?: string };
type Where = Partial<MockUser> & { id?: string; email?: string };
type CreateArgs = { data: Partial<MockUser> & { email: string } };
type UpdateArgs = { where: WhereUnique; data: Partial<MockUser> };
type UpsertArgs = {
  where: WhereUnique;
  create: CreateArgs['data'];
  update: UpdateArgs['data'];
};
type FindUniqueArgs = { where: WhereUnique };
type FindManyArgs = {
  where?: Where;
  take?: number;
  skip?: number;
  orderBy?: any;
};
type CountArgs = { where?: Where };

function matches(u: MockUser, where?: Where): boolean {
  if (!where) return true;
  for (const [k, v] of Object.entries(where)) {
    if (v === undefined) continue;
    if ((u as any)[k] !== v) return false;
  }
  return true;
}

export class PrismaUserMock {
  private store: Map<string, MockUser> = new Map();

  seed(users: Array<Partial<MockUser>>) {
    for (const raw of users) {
      const id = raw.id ?? genId();

      // Destructure to avoid duplicate keys when we add ...rest below
      const {
        email,
        role,
        password,
        refreshToken,
        createdAt,
        updatedAt,
        ...rest
      } = raw;

      const u: MockUser = {
        id,
        email: email ?? `${id}@local.test`,
        role: (role as any) ?? 'user',
        password: password ?? null,
        refreshToken: refreshToken ?? null,
        createdAt: createdAt ?? now(),
        updatedAt: updatedAt ?? now(),
        ...rest, // only truly extra fields
      };
      this.store.set(u.id, u);
    }
  }

  get data(): MockUser[] {
    return Array.from(this.store.values());
  }

  // ---- prisma.user.findUnique({ where: { id? email? } })
  async findUnique(args: FindUniqueArgs): Promise<MockUser | null> {
    const { id, email } = args.where || {};
    if (id) return this.store.get(id) ?? null;
    if (email) return this.data.find((u) => u.email === email) ?? null;
    return null;
  }

  // ---- prisma.user.findMany({ where? ... })
  async findMany(args: FindManyArgs = {}): Promise<MockUser[]> {
    const list = this.data.filter((u) => matches(u, args.where));
    // naive order/skip/take
    let out = list;
    if (typeof args.skip === 'number') out = out.slice(args.skip);
    if (typeof args.take === 'number') out = out.slice(0, args.take);
    return out;
  }

  // ---- prisma.user.count({ where? })
  async count(args: CountArgs = {}): Promise<number> {
    return this.data.filter((u) => matches(u, args.where)).length;
  }

  // ---- prisma.user.create({ data })
  async create(args: CreateArgs): Promise<MockUser> {
    const id = genId();
    const existing = this.data.find((u) => u.email === args.data.email);
    if (existing) {
      const err: any = new Error(
        'Unique constraint failed on the fields: (`email`)',
      );
      err.code = 'P2002';
      err.meta = { target: ['email'] };
      throw err;
    }

    // Destructure to avoid overwriting by spread
    const {
      email,
      role,
      password,
      refreshToken,
      createdAt, // rarely set by callers, but supported
      updatedAt, // rarely set by callers, but supported
      ...rest
    } = args.data;

    const u: MockUser = {
      id,
      email: email!, // CreateArgs enforces presence
      role: (role as any) ?? 'user',
      password: password ?? null,
      refreshToken: refreshToken ?? null,
      createdAt: createdAt ?? now(),
      updatedAt: updatedAt ?? now(),
      ...rest, // extra fields only (won't include the ones above)
    };

    this.store.set(id, u);
    return { ...u };
  }

  // ---- prisma.user.update({ where, data })
  async update(args: UpdateArgs): Promise<MockUser> {
    const target =
      (args.where.id && this.store.get(args.where.id)) ||
      (args.where.email &&
        this.data.find((u) => u.email === args.where.email)) ||
      null;
    if (!target) {
      const err: any = new Error('Record to update not found.');
      err.code = 'P2025';
      throw err;
    }
    // unique email check
    if (args.data.email && args.data.email !== target.email) {
      if (this.data.find((u) => u.email === args.data.email)) {
        const err: any = new Error(
          'Unique constraint failed on the fields: (`email`)',
        );
        err.code = 'P2002';
        err.meta = { target: ['email'] };
        throw err;
      }
    }
    const next: MockUser = {
      ...target,
      ...args.data,
      updatedAt: now(),
    };
    this.store.set(next.id, next);
    return { ...next };
  }

  // ---- prisma.user.upsert({ where, create, update })
  async upsert(args: UpsertArgs): Promise<MockUser> {
    const existing = await this.findUnique({ where: args.where });
    if (existing) {
      return this.update({ where: args.where, data: args.update });
    }
    return this.create({ data: args.create });
  }
}

export class PrismaMock {
  user = new PrismaUserMock();
  // add more models here if needed later (e.g., profile, roles, etc.)
}

export function makePrismaMock(seed?: {
  admin?: Partial<MockUser>;
  user?: Partial<MockUser>;
  extra?: Partial<MockUser>[];
}) {
  const prisma = new PrismaMock();
  // Reasonable defaults for unit tests; override via `seed` param as needed.
  const admin: Partial<MockUser> = {
    email: seed?.admin?.email ?? 'admin.mock@local.test',
    role: 'admin',
    password: seed?.admin?.password ?? null,
    ...seed?.admin,
  };
  const user: Partial<MockUser> = {
    email: seed?.user?.email ?? 'user.mock@local.test',
    role: 'user',
    password: seed?.user?.password ?? null,
    ...seed?.user,
  };
  prisma.user.seed([admin, user, ...(seed?.extra ?? [])]);
  return prisma;
}
