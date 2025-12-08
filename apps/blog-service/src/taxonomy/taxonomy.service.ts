import {Inject, Injectable, BadRequestException} from "@nestjs/common"
import {ClientGrpc} from "@nestjs/microservices"
import {firstValueFrom} from "rxjs"

import {TAXONOMY_SERVICE} from "../taxonomy-client.module"
import {getTaxonomy, type TaxonomyProxy} from "@nebula/clients"
import {CreateTaxonomyDto, UpdateTaxonomyDto} from "./dto/taxonomy.dto"

export type ListTaxonomyQuery = {
  page?: number
  limit?: number
  q?: string
  parentId?: string | null
}

@Injectable()
export class TaxonomyService {
  // hard-lock blog scope
  private readonly scope = "blog"

  constructor(@Inject(TAXONOMY_SERVICE) private readonly taxonomyClient: ClientGrpc) {}

  private taxonomy(): TaxonomyProxy {
    return getTaxonomy(this.taxonomyClient)
  }

  // ---------------------------
  // List (needs kind)
  // ---------------------------
  async list(kind: string, q?: ListTaxonomyQuery) {
    const page = q?.page ?? 1
    const limit = q?.limit ?? 50
    const search = q?.q ?? ""
    const parentId = q?.parentId ?? undefined

    const res = await firstValueFrom(
      this.taxonomy().ListTaxonomies({
        scope: this.scope,
        kind,
        page,
        limit,
        q: search,
        parentId,
      })
    )

    return {
      data: res.data,
      page: res.page,
      limit: res.limit,
      total: res.total,
    }
  }

  // ---------------------------
  // Get (by ID only)
  // ---------------------------
  async get(id: string) {
    const res = await firstValueFrom(this.taxonomy().GetTaxonomy({id}))

    if (!res.data || res.data.scope !== this.scope) {
      throw new BadRequestException("taxonomy_not_in_blog_scope")
    }

    return {data: res.data}
  }

  // ---------------------------
  // Create (needs kind)
  // ---------------------------
  async create(kind: string, dto: CreateTaxonomyDto) {
    const res = await firstValueFrom(
      this.taxonomy().CreateTaxonomy({
        scope: this.scope,
        kind,
        slug: dto.slug,
        title: dto.title,
        description: dto.description ?? "",
        isTree: !!dto.parentId,
        parentId: dto.parentId ?? null,
        path: dto.slug,
        isHidden: dto.isHidden ?? false,
        isSystem: false,
        depth: 0,
        sortOrder: dto.sortOrder ?? 0,
        meta: {},
      })
    )

    if (!res.data || res.data.scope !== this.scope || res.data.kind !== kind) {
      // very defensive; normally taxonomy-service guarantees this
      throw new BadRequestException("taxonomy_scope_or_kind_mismatch")
    }

    return {data: res.data}
  }

  // ---------------------------
  // Update (by ID only)
  // ---------------------------
  async update(id: string, dto: UpdateTaxonomyDto) {
    // First make sure this taxonomy belongs to blog scope
    const existing = await firstValueFrom(this.taxonomy().GetTaxonomy({id}))
    if (!existing.data || existing.data.scope !== this.scope) {
      throw new BadRequestException("taxonomy_not_in_blog_scope")
    }

    const patch: any = {
      slug: dto.slug,
      title: dto.title,
      description: dto.description,
      isHidden: dto.isHidden,
      sortOrder: dto.sortOrder,
    }

    // Distinguish "not provided" vs "explicit null"
    if (Object.prototype.hasOwnProperty.call(dto, "parentId")) {
      patch.parentId = dto.parentId === null ? null : dto.parentId
    }

    const res = await firstValueFrom(
      this.taxonomy().UpdateTaxonomy({
        id,
        ...patch,
      })
    )

    return {data: res.data}
  }

  // ---------------------------
  // Delete (by ID only)
  // ---------------------------
  async remove(id: string) {
    const existing = await firstValueFrom(this.taxonomy().GetTaxonomy({id}))
    if (!existing.data || existing.data.scope !== this.scope) {
      throw new BadRequestException("taxonomy_not_in_blog_scope")
    }

    await firstValueFrom(this.taxonomy().DeleteTaxonomy({id}))
    return {data: true}
  }
}
