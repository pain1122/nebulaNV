import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from "@nestjs/common";
import { TaxonomyService } from "./taxonomy.service";
import { CreateTaxonomyDto } from "./dto/create-taxonomy.dto"
import { UpdateTaxonomyDto } from "./dto/update-taxonomy.dto"

@Controller("taxonomies")
export class TaxonomyHttpController {
  constructor(private svc: TaxonomyService) {}

  @Get()
  list(@Query() q: any) {
    return this.svc.list(q);
  }

  @Get("/:id")
  get(@Param("id") id: string) {
    return this.svc.get(id);
  }

  @Post()
  create(@Body() dto: CreateTaxonomyDto) {
    return this.svc.create(dto)
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateTaxonomyDto) {
    return this.svc.update(id, dto)
  }

  @Delete("/:id")
  delete(@Param("id") id: string) {
    return this.svc.delete(id);
  }
}
