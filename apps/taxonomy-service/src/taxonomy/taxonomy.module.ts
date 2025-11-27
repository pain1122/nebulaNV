import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { TaxonomyService } from "./taxonomy.service";
import { TaxonomyHttpController } from "./taxonomy.controller";
import { TaxonomyGrpcController } from "./grpc/taxonomy-grpc.controller";

@Module({
  imports: [],
  controllers: [TaxonomyHttpController, TaxonomyGrpcController],
  providers: [PrismaService, TaxonomyService],
  exports: [TaxonomyService, PrismaService],
})
export class TaxonomyModule {}
