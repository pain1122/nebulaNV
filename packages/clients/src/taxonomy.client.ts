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
  GetTaxonomy(req: GetTaxonomyReq, meta?: any, opts?: any): Observable<TaxonomyRes>;
  GetBySlug(req: GetBySlugReq, meta?: any, opts?: any): Observable<TaxonomyRes>;
  CreateTaxonomy(req: CreateTaxonomyReq, meta?: any, opts?: any): Observable<TaxonomyRes>;
  UpdateTaxonomy(req: UpdateTaxonomyReq, meta?: any, opts?: any): Observable<TaxonomyRes>;
  DeleteTaxonomy(req: DeleteTaxonomyReq, meta?: any, opts?: any): Observable<{}>;
  ListTaxonomies(req: ListTaxonomiesReq, meta?: any, opts?: any): Observable<TaxonomyListRes>;
};

export function getTaxonomy(client: ClientGrpc): TaxonomyProxy {
  const raw = client.getService<Raw>('TaxonomyService') as any;
  const meta = () => buildS2SMetadata({ serviceName: process.env.SVC_NAME });

  return {
    GetTaxonomy: (req, m, opts) => raw.GetTaxonomy(req, m ?? meta(), opts),
    GetBySlug: (req, m, opts) => raw.GetBySlug(req, m ?? meta(), opts),
    CreateTaxonomy: (req, m, opts) => raw.CreateTaxonomy(req, m ?? meta(), opts),
    UpdateTaxonomy: (req, m, opts) => raw.UpdateTaxonomy(req, m ?? meta(), opts),
    DeleteTaxonomy: (req, m, opts) => raw.DeleteTaxonomy(req, m ?? meta(), opts),
    ListTaxonomies: (req, m, opts) => raw.ListTaxonomies(req, m ?? meta(), opts),
  };
}
