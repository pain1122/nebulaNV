import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from "@nestjs/common";
import { TaxonomyService } from "./taxonomy.service";
import { CreateTaxonomyDto } from "./dto/create-taxonomy.dto";
import { ListTaxonomiesQueryDto } from "./dto/list-taxonomies-query.dto";
import { UpdateTaxonomyDto } from "./dto/update-taxonomy.dto";
import { Public, Roles } from "@nebula/grpc-auth";

@Controller("taxonomies")
export class TaxonomyHttpController {
  constructor(private svc: TaxonomyService) {}

  @Public()
  @Get()
  list(@Query() q: ListTaxonomiesQueryDto) {
    return this.svc.list(q);
  }

  @Public()
  @Get("/:id")
  get(@Param("id") id: string) {
    return this.svc.get(id);
  }

  @Roles("admin", "root-admin")
  @Post()
  create(@Body() dto: CreateTaxonomyDto) {
    return this.svc.create(dto);
  }

  @Roles("admin", "root-admin")
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateTaxonomyDto) {
    return this.svc.update(id, dto);
  }

  @Roles("admin", "root-admin")
  @Delete("/:id")
  delete(@Param("id") id: string) {
    return this.svc.delete(id);
  }
}
