import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from './prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getString(namespace: string, key: string, environment = 'default') {
    const row = await this.prisma.setting.findUnique({
      where: { namespace_environment_key: { namespace, environment, key } },
      select: { valueString: true },
    });
    // 'found' should reflect record existence, not non-empty string
    return { value: row?.valueString ?? '', found: !!row };
  }

  async setString(namespace: string, key: string, value: string, environment = 'default') {
    const row = await this.prisma.setting.upsert({
      where: { namespace_environment_key: { namespace, environment, key } },
      update: {
        valueString: value,
        valueNumber: null,
        valueBool: null,
        valueJson: Prisma.DbNull,
      },
      create: {
        namespace,
        environment,
        key,
        valueString: value,
      },
      select: { valueString: true },
    });
    return { value: row.valueString ?? '' };
  }
}