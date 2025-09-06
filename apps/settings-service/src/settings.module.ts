import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SettingsController } from './settings.controller';
import { SettingsGrpcController } from './grpc/settings-grpc.controller';
import { PrismaService } from './prisma.service';
import { SettingsService } from './settings.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [SettingsController, SettingsGrpcController],
  providers: [PrismaService, SettingsService],
})
export class SettingsModule {}