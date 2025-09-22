import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SettingsController } from './settings.controller';
import { SettingsGrpcController } from './grpc/settings-grpc.controller';
import { PrismaService } from './prisma.service';
import { SettingsService } from './settings.service';
export const SETTINGS_PROTO = require.resolve('@nebula/protos/settings.proto');
import { S2SGuard } from '@nebula/grpc-auth';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [SettingsController, SettingsGrpcController],
  providers: [PrismaService, SettingsService, S2SGuard],
})
export class SettingsModule {}