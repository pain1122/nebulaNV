import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsGrpcController } from './grpc/settings.grpc';
import { PrismaService } from './prisma.service';
import { SettingsService } from './settings.service';

@Module({
  controllers: [SettingsController, SettingsGrpcController],
  providers: [PrismaService, SettingsService],
})
export class SettingsModule {}