import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth E2E (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;
  const email = `test${Date.now()}@example.com`;
  const password = 'securepass';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  it('registers and logs in, returning tokens', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: email, password })
      .expect(201);

    accessToken = loginRes.body.access_token;
    refreshToken = loginRes.body.refresh_token;

    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();
  });

  it('gets /auth/me with valid access token', async () => {
    const meRes = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(meRes.body.email).toBe(email);
  });

  it('refreshes tokens with valid refresh token', async () => {
    const refreshRes = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(201);

    expect(refreshRes.body.access_token).toBeDefined();
    expect(refreshRes.body.refresh_token).toBeDefined();

    // update tokens for subsequent requests
    accessToken = refreshRes.body.access_token;
    refreshToken = refreshRes.body.refresh_token;
  });

  it('accepts new access token on /auth/me', async () => {
    const meRes2 = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(meRes2.body.email).toBe(email);
  });

  describe('me Update E2E', () => {
    beforeAll(async () => {
      // tokens already set from above
    });

    it('updates email only', async () => {
      const newEmail = `updated${Date.now()}@example.com`;
      const res = await request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: newEmail })
        .expect(200);

      expect(res.body.email).toBe(newEmail);
    });

    it('changes password with correct currentPassword', async () => {
      await request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'securepass', newPassword: 'NewPass123' })
        .expect(200);

      // After password change, old refreshToken is invalid; optionally re-login
    });

    it('rejects wrong currentPassword', async () => {
      await request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'WrongPass', newPassword: 'DoesNotMatter' })
        .expect(400);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
