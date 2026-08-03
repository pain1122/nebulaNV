// packages/clients/src/taxonomy.client.ts
import type { CallOptions, Metadata } from "@grpc/grpc-js";
import type { ClientGrpc } from "@nestjs/microservices";
import type { Observable } from "rxjs";
import {
  TAXONOMY_SERVICE_TARGET,
  buildGrpcS2SMetadata,
  invokeGrpcUnary,
  mergeSignedMetadata,
} from "@nebula/grpc-auth";
import { taxonomy } from "@nebula/protos";

import type {
  TaxonomyProxy,
  GetTaxonomyReq,
  GetBySlugReq,
  CreateTaxonomyReq,
  UpdateTaxonomyReq,
  DeleteTaxonomyReq,
  EnsureSystemTaxonomyReq,
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

  EnsureSystemTaxonomy(
    req: EnsureSystemTaxonomyReq,
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

  return {
    GetTaxonomy: (req, m, opts) =>
      invokeGrpcUnary(
        raw.GetTaxonomy.bind(raw),
        req,
        mergeSignedMetadata(
          m,
          buildGrpcS2SMetadata({
            target: TAXONOMY_SERVICE_TARGET,
            definition: taxonomy.TaxonomyServiceService.getTaxonomy,
            request: req,
          }),
        ),
        opts,
      ),

    GetBySlug: (req, m, opts) =>
      invokeGrpcUnary(
        raw.GetBySlug.bind(raw),
        req,
        mergeSignedMetadata(
          m,
          buildGrpcS2SMetadata({
            target: TAXONOMY_SERVICE_TARGET,
            definition: taxonomy.TaxonomyServiceService.getBySlug,
            request: req,
          }),
        ),
        opts,
      ),

    EnsureSystemTaxonomy: (req, m, opts) =>
      invokeGrpcUnary(
        raw.EnsureSystemTaxonomy.bind(raw),
        req,
        mergeSignedMetadata(
          m,
          buildGrpcS2SMetadata({
            target: TAXONOMY_SERVICE_TARGET,
            definition: taxonomy.TaxonomyServiceService.ensureSystemTaxonomy,
            request: req,
          }),
        ),
        opts,
      ),

    CreateTaxonomy: (req, m, opts) => {
      const request = { data: req };
      return invokeGrpcUnary(
        raw.CreateTaxonomy.bind(raw),
        request,
        mergeSignedMetadata(
          m,
          buildGrpcS2SMetadata({
            target: TAXONOMY_SERVICE_TARGET,
            definition: taxonomy.TaxonomyServiceService.createTaxonomy,
            request,
          }),
        ),
        opts,
      );
    },

    UpdateTaxonomy: (req, m, opts) => {
      const { id, ...patch } = req;
      const request = { id, patch };
      return invokeGrpcUnary(
        raw.UpdateTaxonomy.bind(raw),
        request,
        mergeSignedMetadata(
          m,
          buildGrpcS2SMetadata({
            target: TAXONOMY_SERVICE_TARGET,
            definition: taxonomy.TaxonomyServiceService.updateTaxonomy,
            request,
          }),
        ),
        opts,
      );
    },

    DeleteTaxonomy: (req, m, opts) =>
      invokeGrpcUnary(
        raw.DeleteTaxonomy.bind(raw),
        req,
        mergeSignedMetadata(
          m,
          buildGrpcS2SMetadata({
            target: TAXONOMY_SERVICE_TARGET,
            definition: taxonomy.TaxonomyServiceService.deleteTaxonomy,
            request: req,
          }),
        ),
        opts,
      ),

    ListTaxonomies: (req, m, opts) =>
      invokeGrpcUnary(
        raw.ListTaxonomies.bind(raw),
        req,
        mergeSignedMetadata(
          m,
          buildGrpcS2SMetadata({
            target: TAXONOMY_SERVICE_TARGET,
            definition: taxonomy.TaxonomyServiceService.listTaxonomies,
            request: req,
          }),
        ),
        opts,
      ),
  };
}
