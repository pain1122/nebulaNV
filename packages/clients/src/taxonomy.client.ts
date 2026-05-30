// packages/clients/src/taxonomy.client.ts
import type { CallOptions, Metadata } from "@grpc/grpc-js";
import type { ClientGrpc } from "@nestjs/microservices";
import type { Observable } from "rxjs";
import { buildS2SMetadata } from "@nebula/grpc-auth";

import type {
  TaxonomyProxy,
  GetTaxonomyReq,
  GetBySlugReq,
  CreateTaxonomyReq,
  UpdateTaxonomyReq,
  DeleteTaxonomyReq,
  ListTaxonomiesReq,
  TaxonomyRes,
  TaxonomyListRes,
} from "./taxonomy.types";

type UpdateTaxonomyPatch = Omit<UpdateTaxonomyReq, "id">;

type Raw = {
  GetTaxonomy(
    req: GetTaxonomyReq,
    meta?: Metadata,
    opts?: CallOptions,
  ): Observable<TaxonomyRes>;

  GetBySlug(
    req: GetBySlugReq,
    meta?: Metadata,
    opts?: CallOptions,
  ): Observable<TaxonomyRes>;

  CreateTaxonomy(
    req: { data: CreateTaxonomyReq },
    meta?: Metadata,
    opts?: CallOptions,
  ): Observable<TaxonomyRes>;

  UpdateTaxonomy(
    req: { id: string; patch: UpdateTaxonomyPatch },
    meta?: Metadata,
    opts?: CallOptions,
  ): Observable<TaxonomyRes>;

  DeleteTaxonomy(
    req: DeleteTaxonomyReq,
    meta?: Metadata,
    opts?: CallOptions,
  ): Observable<Record<string, never>>;

  ListTaxonomies(
    req: ListTaxonomiesReq & { q?: string; page?: number; limit?: number },
    meta?: Metadata,
    opts?: CallOptions,
  ): Observable<TaxonomyListRes>;
};

export function getTaxonomy(client: ClientGrpc): TaxonomyProxy {
  const raw = client.getService<Raw>("TaxonomyService");
  const defaultMeta = () =>
    buildS2SMetadata({ serviceName: process.env.SVC_NAME });

  return {
    GetTaxonomy: (req, m, opts) =>
      raw.GetTaxonomy(req, m ?? defaultMeta(), opts),

    GetBySlug: (req, m, opts) => raw.GetBySlug(req, m ?? defaultMeta(), opts),

    CreateTaxonomy: (req, m, opts) =>
      // Wrap flat input into { data: ... } as required by CreateTaxonomyRequest
      raw.CreateTaxonomy({ data: req }, m ?? defaultMeta(), opts),

    UpdateTaxonomy: (req, m, opts) => {
      const { id, ...patch } = req;
      // Map flat shape into { id, patch } as required by UpdateTaxonomyRequest
      return raw.UpdateTaxonomy({ id, patch }, m ?? defaultMeta(), opts);
    },

    DeleteTaxonomy: (req, m, opts) =>
      raw.DeleteTaxonomy(req, m ?? defaultMeta(), opts),

    ListTaxonomies: (req, m, opts) =>
      raw.ListTaxonomies(req, m ?? defaultMeta(), opts),
  };
}
