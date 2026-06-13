import { Module } from '@nestjs/common';
import { GrpcTokenAuthGuard, S2SGuard } from '@nebula/grpc-auth';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaService } from '../prisma.service';
import { UserGrpcController } from './grpc/user-grpc.controller';
import { AuthClientModule } from '../auth-client.module';

@Module({
  imports: [AuthClientModule],
  providers: [UserService, PrismaService, S2SGuard, GrpcTokenAuthGuard],
  controllers: [UserController, UserGrpcController],
})
export class UserModule {}
