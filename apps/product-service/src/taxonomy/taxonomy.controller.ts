import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common"
import { Public, Roles } from "@nebula/grpc-auth"

import { TaxonomyService, ListTaxonomyQuery } from "./taxonomy.service"
import { CreateTaxonomyDto, UpdateTaxonomyDto } from "./dto/taxonomy.dto"

@Controller("taxonomies")
export class TaxonomyController {
  constructor(private readonly service: TaxonomyService) {}

  // ---------------------------
  // List by kind
  // GET /taxonomies/:kind?page=&limit=&q=&parentId=
  // ---------------------------
  @Public()
  @Get(":kind")
  list(
    @Param("kind") kind: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("q") q?: string,
    @Query("parentId") parentId?: string,
  ) {
    const query: ListTaxonomyQuery = {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      q: q ?? undefined,
      parentId: parentId ?? undefined,
    }

    return this.service.list(kind, query)
  }

  // ---------------------------
  // Get by ID
  // GET /taxonomies/:kind/:id
  // (kind is in the path but service doesn’t need it)
  // ---------------------------
  @Public()
  @Get(":kind/:id")
  get(
    @Param("id") id: string,
  ) {
    return this.service.get(id)
  }

  // ---------------------------
  // Create in a given kind
  // POST /taxonomies/:kind
  // ---------------------------
  @Roles("admin")
  @Post(":kind")
  create(
    @Param("kind") kind: string,
    @Body() dto: CreateTaxonomyDto,
  ) {
    return this.service.create(kind, dto)
  }

  // ---------------------------
  // Update by ID
  // PATCH /taxonomies/:kind/:id
  // ---------------------------
  @Roles("admin")
  @Patch(":kind/:id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateTaxonomyDto,
  ) {
    return this.service.update(id, dto)
  }

  // ---------------------------
  // Delete by ID
  // DELETE /taxonomies/:kind/:id
  // ---------------------------
  @Roles("admin")
  @Delete(":kind/:id")
  remove(
    @Param("id") id: string,
  ) {
    return this.service.remove(id)
  }
}
