// packages/clients/src/taxonomy.types.ts
import type {Metadata, CallOptions} from "@grpc/grpc-js"
import type {Observable} from "rxjs"

export type TaxonomyDto = {
  id: string
  scope: string
  kind: string
  slug: string
  title: string
  description?: string
  parentId?: string | null
  isTree?: boolean
  depth?: number
  path?: string
  isHidden?: boolean
  isSystem?: boolean
  sortOrder?: number
  meta?: any
}

export type GetTaxonomyReq = {id: string}
export type GetBySlugReq = {scope: string; kind: string; slug: string}

export type CreateTaxonomyReq = {
  scope: string
  kind: string
  slug: string
  title: string
  path: string
  description?: string
  isTree?: boolean
  parentId?: string | null
  isHidden?: boolean
  isSystem?: boolean
  depth?: number
  sortOrder?: number
  meta?: any
}

export type UpdateTaxonomyReq = {
  id: string
  title?: string
  slug?: string
  description?: string
  parentId?: string | null
  isHidden?: boolean
  sortOrder?: number
  meta?: any
}

export type DeleteTaxonomyReq = {id: string}

export type ListTaxonomiesReq = {
  scope: string
  kind: string
  q?: string
  page?: number
  limit?: number
  parentId?: string | null
}

export type TaxonomyRes = {data: TaxonomyDto}
export type TaxonomyListRes = {
  data: TaxonomyDto[]
  page: number
  limit: number
  total: number
}

export interface TaxonomyProxy {
  GetTaxonomy(req: GetTaxonomyReq, meta?: Metadata): Observable<TaxonomyRes>
  GetBySlug(req: GetBySlugReq, meta?: Metadata, opts?: CallOptions): Observable<TaxonomyRes>

  CreateTaxonomy(req: CreateTaxonomyReq, meta?: Metadata, opts?: CallOptions): Observable<TaxonomyRes>
  UpdateTaxonomy(req: UpdateTaxonomyReq, meta?: Metadata, opts?: CallOptions): Observable<TaxonomyRes>
  DeleteTaxonomy(req: DeleteTaxonomyReq, meta?: Metadata, opts?: CallOptions): Observable<{}>
  ListTaxonomies(req: ListTaxonomiesReq, meta?: Metadata, opts?: CallOptions): Observable<TaxonomyListRes>
}
