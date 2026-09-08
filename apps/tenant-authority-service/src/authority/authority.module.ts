import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { AuthorityRepository } from "./authority.repository";
import { AuthorityService } from "./authority.service";
import { AuthorityGrpcController } from "./authority-grpc.controller";
import { AuthorityAuditSigner } from "./authority-audit.signer";
import { RegistrationMutationRepository } from "./registration-mutation.repository";
import { RegistrationMutationService } from "./registration-mutation.service";

@Module({
  controllers: [AuthorityGrpcController],
  providers: [
    PrismaService,
    AuthorityAuditSigner,
    AuthorityRepository,
    AuthorityService,
    RegistrationMutationRepository,
    RegistrationMutationService,
  ],
  exports: [AuthorityService, RegistrationMutationService],
})
export class AuthorityModule {}
