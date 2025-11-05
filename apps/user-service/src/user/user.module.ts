import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaService } from '../prisma.service';
import { UserGrpcController } from './grpc/user-grpc.controller';


@Module({
  providers: [UserService, PrismaService],
  controllers: [UserController , UserGrpcController],
})
export class UserModule {}
