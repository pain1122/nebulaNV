import {Module} from "@nestjs/common"
import {TaxonomyService} from "./taxonomy.service"
import {TaxonomyController} from "./taxonomy.controller"
import {TaxonomyGrpcController} from "./grpc/taxonomy-grpc.controller"

@Module({
  controllers: [TaxonomyController, TaxonomyGrpcController],
  providers: [TaxonomyService],
  exports: [TaxonomyService],
})
export class TaxonomyModule {}
