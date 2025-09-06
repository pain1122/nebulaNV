import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getString(ns: string, key: string, env = 'default'): Promise<string | null> {
    const row = await this.prisma.setting.findUnique({
      where: { namespace_environment_key: { namespace: ns, environment: env, key } },
    });
    return row?.valueString ?? null;
  }

  async setString(ns: string, key: string, value: string, env = 'default') {
    const row = await this.prisma.setting.upsert({
      where: { namespace_environment_key: { namespace: ns, environment: env, key } },
      update: { valueString: value, valueJson: null, valueNumber: null, valueBool: null },
      create: { namespace: ns, environment: env, key, valueString: value },
    });
    return row.valueString!;
  }
}