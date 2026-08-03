import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { S2SReplayStore } from '@nebula/grpc-auth';
import { HealthController } from '../src/health.controller';
import { AuthRedisService } from '../src/auth/redis/auth-redis.service';

describe('AuthService health', () => {
  let app: INestApplication<App>;
  const authRedis = {
    checkReadiness: jest.fn().mockResolvedValue(undefined),
  };
  const replayStore = {
    checkReadiness: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: AuthRedisService, useValue: authRedis },
        { provide: S2SReplayStore, useValue: replayStore },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health/ready reports auth and replay Redis readiness', async () => {
    const res = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200);

    expect(res.body).toEqual({
      status: 'ok',
      service: 'auth-service',
      time: expect.any(String),
      checks: {
        authRedis: { status: 'ok' },
        s2sReplay: { status: 'ok' },
      },
    });
  });
});
