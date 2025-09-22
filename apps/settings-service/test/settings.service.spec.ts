import { Test } from '@nestjs/testing';
import { SettingsService } from '../src/settings.service';
import { PrismaService } from '../src/prisma.service';
import { Prisma } from '@prisma/client';
describe('SettingsService', () => {
  let service: SettingsService;

  // Minimal Prisma mock surface needed by the service
  let prisma: {
    setting: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      setting: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(SettingsService);
    jest.clearAllMocks();
  });

  describe('getString', () => {
    it('returns value and found=true when row exists', async () => {
      prisma.setting.findUnique.mockResolvedValue({
        valueString: 'blue',
      });

      const res = await service.getString('ui', 'theme_color', 'prod');

      expect(prisma.setting.findUnique).toHaveBeenCalledWith({
        where: {
          namespace_environment_key: {
            namespace: 'ui',
            environment: 'prod',
            key: 'theme_color',
          },
        },
        select: { valueString: true },
      });
      expect(res).toEqual({ value: 'blue', found: true });
    });

    it('defaults environment to "default" when omitted', async () => {
      prisma.setting.findUnique.mockResolvedValue({
        valueString: 'dark',
      });

      const res = await service.getString('ui', 'theme_color'); // env omitted

      expect(prisma.setting.findUnique).toHaveBeenCalledWith({
        where: {
          namespace_environment_key: {
            namespace: 'ui',
            environment: 'default',
            key: 'theme_color',
          },
        },
        select: { valueString: true },
      });
      expect(res).toEqual({ value: 'dark', found: true });
    });

    it('returns empty string and found=false when unset/not found', async () => {
      prisma.setting.findUnique.mockResolvedValue(null);

      const res = await service.getString('i18n', 'missing_key', 'default');

      expect(prisma.setting.findUnique).toHaveBeenCalledWith({
        where: {
          namespace_environment_key: {
            namespace: 'i18n',
            environment: 'default',
            key: 'missing_key',
          },
        },
        select: { valueString: true },
      });
      expect(res).toEqual({ value: '', found: false });
    });

    it('propagates Prisma errors', async () => {
      prisma.setting.findUnique.mockRejectedValue(new Error('db down'));

      await expect(service.getString('ui', 'theme_color', 'prod')).rejects.toThrow(
        'db down',
      );
    });
  });

  describe('setString', () => {
    it('upserts a string value, clears other typed columns, and returns the stored value', async () => {
      prisma.setting.upsert.mockResolvedValue({
        valueString: 'abc-123',
      });

      const res = await service.setString(
        'product',
        'defaultProductCategoryId',
        'abc-123',
        'default',
      );

      expect(prisma.setting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            namespace_environment_key: {
              namespace: 'product',
              environment: 'default',
              key: 'defaultProductCategoryId',
            },
          },
          // assert the UPDATE completely (you probably DO clear there)
          update: {
            valueString: 'abc-123',
            valueNumber: null,
            valueBool: null,
            valueJson: Prisma.DbNull, // if your service uses DbNull on update
          },
          // only assert the fields you actually set on CREATE
          create: expect.objectContaining({
            namespace: 'product',
            environment: 'default',
            key: 'defaultProductCategoryId',
            valueString: 'abc-123',
          }),
          select: { valueString: true },
        })
      );

      expect(res).toEqual({ value: 'abc-123' });
    });

    it('defaults environment to "default" when omitted', async () => {
      prisma.setting.upsert.mockResolvedValue({ valueString: 'red' });

      const res = await service.setString('ui', 'theme_color', 'red'); // env omitted

      expect(prisma.setting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            namespace_environment_key: {
              namespace: 'ui',
              environment: 'default',
              key: 'theme_color',
            },
          },
          update: {
            valueString: 'red',
            valueNumber: null,
            valueBool: null,
            valueJson: Prisma.DbNull,
          },
          create: expect.objectContaining({
            namespace: 'ui',
            environment: 'default',
            key: 'theme_color',
            valueString: 'red',
          }),
          select: { valueString: true },
        })
      );
      expect(res).toEqual({ value: 'red' });
    });

    it('propagates Prisma errors', async () => {
      prisma.setting.upsert.mockRejectedValue(new Error('unique violation'));

      await expect(
        service.setString('ui', 'theme_color', 'blue', 'prod'),
      ).rejects.toThrow('unique violation');
    });
  });
});
