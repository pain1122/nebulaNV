import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from "@nestjs/common";
import { TaxonomyService } from "./taxonomy.service";

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
  create(@Body() body: any) {
    return this.svc.create(body);
  }

  @Patch("/:id")
  update(@Param("id") id: string, @Body() patch: any) {
    return this.svc.update(id, patch);
  }

  @Delete("/:id")
  delete(@Param("id") id: string) {
    return this.svc.delete(id);
  }
}
