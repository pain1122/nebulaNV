import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

const SAFE = /^[a-z0-9][a-z0-9._-]*$/;
const norm = (s: string) => (s ?? '').trim().toLowerCase();
const assertSafe = (label: string, v: string) => {
  if (!SAFE.test(v)) throw new BadRequestException(`${label} must match ${SAFE}`);
};

/**
 * If your Prisma field isn't literally `value`, update this to the real field name,
 * e.g. 'stringValue'. (Or update prisma schema to `value String @map("...")` and regenerate.)
 */
const VALUE_FIELD = 'value';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getString(namespace: string, key: string, environment = 'default') {
    const ns = norm(namespace), k = norm(key), env = norm(environment);
    assertSafe('namespace', ns); assertSafe('key', k); assertSafe('environment', env);

    // No `select` so TS won't complain even if VALUE_FIELD differs
    const row = await this.prisma.setting.findUnique({
      where: { namespace_environment_key: { namespace: ns, environment: env, key: k } },
    });

    const value = row ? (row as any)[VALUE_FIELD] ?? '' : '';
    return { value, found: !!row };
  }

  async setString(namespace: string, key: string, value: string, environment = 'default') {
    const ns = norm(namespace), k = norm(key), env = norm(environment);
    assertSafe('namespace', ns); assertSafe('key', k); assertSafe('environment', env);

    await this.prisma.setting.upsert({
      where: { namespace_environment_key: { namespace: ns, environment: env, key: k } },
      update: { [VALUE_FIELD]: value } as any,
      create: { namespace: ns, environment: env, key: k, [VALUE_FIELD]: value } as any,
    });

    return value;
  }

  async deleteString(namespace: string, key: string, environment = 'default') {
    const ns = norm(namespace), k = norm(key), env = norm(environment);
    assertSafe('namespace', ns); assertSafe('key', k); assertSafe('environment', env);

    try {
      await this.prisma.setting.delete({
        where: { namespace_environment_key: { namespace: ns, environment: env, key: k } },
      });
      return true;
    } catch (e: any) {
      if (e?.code === 'P2025') return false; // not found
      throw e;
    }
  }
}
