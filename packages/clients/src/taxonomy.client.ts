// packages/clients/src/taxonomy.client.ts
import type { ClientGrpc } from '@nestjs/microservices';
import type { Observable } from 'rxjs';
import { buildS2SMetadata } from '@nebula/grpc-auth';

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
} from './taxonomy.types';

type Raw = {
  GetTaxonomy(
    req: GetTaxonomyReq,
    meta?: any,
  ): Observable<TaxonomyRes>;

  GetBySlug(
    req: GetBySlugReq,
    meta?: any,
  ): Observable<TaxonomyRes>;

  CreateTaxonomy(
    req: { data: CreateTaxonomyReq },
    meta?: any,
  ): Observable<TaxonomyRes>;

  UpdateTaxonomy(
    req: { id: string; patch: UpdateTaxonomyReq },
    meta?: any,
  ): Observable<TaxonomyRes>;

  DeleteTaxonomy(
    req: DeleteTaxonomyReq,
    meta?: any,
  ): Observable<{}>;

  ListTaxonomies(
    req: ListTaxonomiesReq & { q?: string; page?: number; limit?: number },
    meta?: any,
  ): Observable<TaxonomyListRes>;
};

export function getTaxonomy(client: ClientGrpc): TaxonomyProxy {
  const raw = client.getService<Raw>('TaxonomyService') as any;
  const defaultMeta = () => buildS2SMetadata({ serviceName: process.env.SVC_NAME });

  return {
    GetTaxonomy: (req, m) =>
      raw.GetTaxonomy(req, m ?? defaultMeta()),

    GetBySlug: (req, m) =>
      raw.GetBySlug(req, m ?? defaultMeta()),

    CreateTaxonomy: (req, m) =>
      // Wrap flat input into { data: ... } as required by CreateTaxonomyRequest
      raw.CreateTaxonomy({ data: req }, m ?? defaultMeta()),

    UpdateTaxonomy: (req, m) => {
      const { id, ...patch } = req;
      // Map flat shape into { id, patch } as required by UpdateTaxonomyRequest
      return raw.UpdateTaxonomy(
        { id, patch: patch as CreateTaxonomyReq },
        m ?? defaultMeta(),
      );
    },

    DeleteTaxonomy: (req, m) =>
      raw.DeleteTaxonomy(req, m ?? defaultMeta()),

    ListTaxonomies: (req, m) =>
      raw.ListTaxonomies(req, m ?? defaultMeta()),
  };
}
