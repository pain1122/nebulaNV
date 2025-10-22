import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Transport, ClientGrpc, ClientProxyFactory } from '@nestjs/microservices';
import { AppModule } from '../src/app.module';
import { APP_GUARD } from '@nestjs/core';
import { TestBypassGrpcAuthGuard } from './utils/test-auth.guard';
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

interface UserServiceClient {
  GetUser(req: { id: string }, md?: Metadata): import('rxjs').Observable<{ id: string; email: string; role: string }>;
  FindUser(req: { email?: string; phone?: string }, md?: Metadata): import('rxjs').Observable<{ id: string; email: string; role: string }>;
  UpdateProfile(req: { id: string; email?: string; newPassword?: string; currentPassword?: string }, md?: Metadata): import('rxjs').Observable<{ id: string; email: string; role: string }>;
  FindUserWithHash(req: { email?: string; phone?: string }, md?: Metadata): import('rxjs').Observable<{ id: string; email: string; role: string; passwordHash: string; refreshToken: string }>;
  SetRefreshToken(req: { userId: string; refreshToken: string }, md?: Metadata): import('rxjs').Observable<{ id: string; email: string; role: string }>;
  GetUserWithHash(req: { id: string }, md?: Metadata): import('rxjs').Observable<{ id: string; email: string; role: string; passwordHash: string; refreshToken: string }>;
}

function mdWith(kv: Record<string, string>): Metadata {
  const md = new Metadata();
  for (const [k, v] of Object.entries(kv)) md.add(k, v);
  return md;
}

describe('[e2e] user-service gRPC', () => {
  let app: INestApplication;
  let client: ClientGrpc;
  let svc: UserServiceClient;

  let adminId = '';
  let userId  = '';
  const prisma = new PrismaClient();

  beforeAll(async () => {
    // override BOTH global guards for tests
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(APP_GUARD).useClass(TestBypassGrpcAuthGuard)
      .overrideProvider(APP_GUARD).useClass(TestBypassGrpcAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.connectMicroservice({
      transport: Transport.GRPC,
      options: {
        package: 'user',
        protoPath: require.resolve('@nebula/protos/user.proto'),
        url: '0.0.0.0:50051',
      },
    });

    await app.startAllMicroservices();
    await app.init();

    client = ClientProxyFactory.create({
      transport: Transport.GRPC,
      options: {
        package: 'user',
        protoPath: require.resolve('@nebula/protos/user.proto'),
        url: '127.0.0.1:50051',
      },
    }) as unknown as ClientGrpc;

    svc = client.getService<UserServiceClient>('UserService');

    // 🔧 Self-seed directly via Prisma (idempotent)
    const adminEmail = 'admin@example.com';
    const userEmail  = 'user@example.com';
    const adminHash  = await bcrypt.hash('Admin123!', 10);
    const userHash   = await bcrypt.hash('User123!', 10);

    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: 'admin', password: adminHash },
      create: { email: adminEmail, role: 'admin', password: adminHash },
      select: { id: true },
    });
    const user = await prisma.user.upsert({
      where: { email: userEmail },
      update: { role: 'user', password: userHash },
      create: { email: userEmail, role: 'user', password: userHash },
      select: { id: true },
    });

    adminId = admin.id;
    userId  = user.id;
  });

  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
  });

  it('GetUser (self) should succeed with ctx user', async () => {
    const res = await firstValueFrom(
      svc.GetUser({ id: userId }, mdWith({ 'x-user-id': userId, 'x-user-role': 'user' }))
    );
    expect(res.id).toBe(userId);
    expect(res.role).toBe('user');
  });

  it('GetUser (cross) should be denied for non-admin', async () => {
    await expect(
      firstValueFrom(svc.GetUser({ id: adminId }, mdWith({ 'x-user-id': userId, 'x-user-role': 'user' })))
    ).rejects.toBeTruthy();
  });

  it('FindUser should require admin + internal', async () => {
    // missing x-svc -> should fail
    await expect(
      firstValueFrom(svc.FindUser({ email: 'user@example.com' }, mdWith({ 'x-user-id': adminId, 'x-user-role': 'admin' })))
    ).rejects.toBeTruthy();

    // admin + x-svc -> ok
    const res = await firstValueFrom(
      svc.FindUser(
        { email: 'user@example.com' },
        mdWith({ 'x-user-id': adminId, 'x-user-role': 'admin', 'x-svc': 'auth-service' })
      )
    );
    expect(res.email).toBe('user@example.com');
  });

  it('FindUserWithHash should require x-svc', async () => {
    await expect(
      firstValueFrom(svc.FindUserWithHash({ email: 'user@example.com' }, mdWith({})))
    ).rejects.toBeTruthy();

    const res = await firstValueFrom(
      svc.FindUserWithHash({ email: 'user@example.com' }, mdWith({ 'x-svc': 'auth-service' }))
    );
    expect(res.id).toBe(userId);
    expect(res.passwordHash?.length).toBeGreaterThan(0);
  });

  it('SetRefreshToken requires x-svc + RequireUserId', async () => {
    await expect(
      firstValueFrom(svc.SetRefreshToken({ userId, refreshToken: 'dummy-hash' }, mdWith({})))
    ).rejects.toBeTruthy();

    const ok = await firstValueFrom(
      svc.SetRefreshToken(
        { userId, refreshToken: 'dummy-hash' },
        mdWith({ 'x-svc': 'auth-service', 'x-user-id': adminId, 'x-user-role': 'admin' })
      )
    );
    expect(ok.id).toBe(userId);
  });

  it('GetUserWithHash requires x-svc + RequireUserId', async () => {
    await expect(
      firstValueFrom(svc.GetUserWithHash({ id: userId }, mdWith({})))
    ).rejects.toBeTruthy();

    const ok = await firstValueFrom(
      svc.GetUserWithHash({ id: userId }, mdWith({ 'x-svc': 'auth-service', 'x-user-id': adminId, 'x-user-role': 'admin' }))
    );
    expect(ok.id).toBe(userId);
    expect(ok.passwordHash?.length).toBeGreaterThan(0);
  });
});
