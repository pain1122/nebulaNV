import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

const SAFE = /^[a-z0-9][a-z0-9._-]*$/;
const norm = (s: string) => (s ?? '').trim().toLowerCase();
const assertSafe = (label: string, v: string) => {
  if (!SAFE.test(v)) throw new BadRequestException(`${label} must match ${SAFE}`);
};

// Your schema uses valueString; keep that as the primary field.
const PRIMARY_VALUE_FIELD = 'valueString' as const;
// Optional read fallback if you ever rename the column in the future.
const READ_FALLBACK_FIELDS = ['value', 'value_string'];

@Injectable()
export class SettingsService {
  private readonly log = new Logger(SettingsService.name);
  constructor(private prisma: PrismaService) {}

  async getString(namespace: string, key: string, environment = 'default') {
    const ns = norm(namespace), k = norm(key), env = norm(environment);
    assertSafe('namespace', ns); assertSafe('key', k); assertSafe('environment', env);

    const row = await this.prisma.setting.findUnique({
      // compound-unique input name is the underscored field list:
      where: { namespace_environment_key: { namespace: ns, environment: env, key: k } },
    });

    if (!row) return { value: '', found: false };

    // Prefer valueString, but tolerate older columns if present
    const anyRow = row as any;
    const value =
      anyRow[PRIMARY_VALUE_FIELD] ??
      READ_FALLBACK_FIELDS.map(f => anyRow[f]).find(v => v !== undefined) ??
      '';

    return { value, found: true };
  }

  async debugInsert() {
    return this.prisma.setting.create({
      data: {
        namespace: 'test',
        environment: 'default',
        key: 'ping',
        valueString: 'pong',
      },
    });
  }

  async setString(namespace: string, key: string, value: string, environment = 'default') {
    const ns = norm(namespace), k = norm(key), env = norm(environment);
    assertSafe('namespace', ns); assertSafe('key', k); assertSafe('environment', env);

    try {
      await this.prisma.setting.upsert({
        where: { namespace_environment_key: { namespace: ns, environment: env, key: k } },
        update: { [PRIMARY_VALUE_FIELD]: value } as any,
        create: { namespace: ns, environment: env, key: k, [PRIMARY_VALUE_FIELD]: value } as any,
      });
      return value;
    } catch (e: any) {
      // If your DB/client is out of sync (e.g., column missing), this logs the real cause
      this.log.error(`setString failed ns=${ns} key=${k} env=${env}`, e?.meta ?? e);
      throw e;
    }
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
