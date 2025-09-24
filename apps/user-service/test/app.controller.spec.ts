import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';

describe('AppController', () => {
  let ctrl: AppController;

  const appServiceMock = {
    getHello: jest.fn(() => 'Hello, Nebula on port 3001!'),
  };

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: appServiceMock }],
    }).compile();

    ctrl = mod.get(AppController);
  });

  it('delegates to AppService.getHello', () => {
    const res = (ctrl as any).getHello?.() ?? (ctrl as any).getRoot?.();
    expect(appServiceMock.getHello).toHaveBeenCalled();
    expect(res).toBe('Hello, Nebula on port 3001!');
  });
});
