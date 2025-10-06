import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from '../src/app.service';
import { ConfigService } from '@nestjs/config';

describe('AppService', () => {
  let appService: AppService;

  const configMock = {
    get: jest.fn((key: string) => (key === 'PORT' ? '3100' : undefined)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    appService = module.get(AppService);
    jest.clearAllMocks();
  });

  it('returns greeting with configured port', () => {
    expect(appService.getHello()).toBe('Hello, Nebula on port 3100!');
    expect(configMock.get).toHaveBeenCalledWith('PORT');
  });
});
