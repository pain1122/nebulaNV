import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaService } from '../prisma.service';
import { UserGrpcController } from './grpc/user-grpc.controller';
import { AuthClientModule } from '../auth-client.module';

@Module({
  imports: [AuthClientModule],
  // gRPC guards are provided once by AppModule through the canonical shared
  // security bundle. Re-registering them here creates an incomplete DI scope.
  providers: [UserService, PrismaService],
  controllers: [UserController, UserGrpcController],
  exports: [PrismaService],
})
export class UserModule {}
