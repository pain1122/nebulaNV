import { Inject, Injectable, BadRequestException } from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import type { Metadata } from "@grpc/grpc-js";
import { firstValueFrom } from "rxjs";

import { TAXONOMY_SERVICE } from "../taxonomy-client.module";
import {
  getTaxonomy,
  type TaxonomyProxy,
  type UpdateTaxonomyReq,
} from "@nebula/clients";
import {
  wrapGrpc,
  type VerifiedServiceDownstreamContext,
} from "@nebula/grpc-auth";
import { CreateTaxonomyDto, UpdateTaxonomyDto } from "./dto/taxonomy.dto";

export type ListTaxonomyQuery = {
  page?: number;
  limit?: number;
  q?: string;
  parentId?: string | null;
};

type TaxonomyDownstream = Metadata | VerifiedServiceDownstreamContext;

function downstreamMetadata(
  downstream?: TaxonomyDownstream,
): Metadata | undefined {
  return downstream && "signingPolicy" in downstream
    ? downstream.metadata
    : downstream;
}

@Injectable()
export class TaxonomyService {
  // hard-lock blog scope
  private readonly scope = "blog";

  constructor(
    @Inject(TAXONOMY_SERVICE) private readonly taxonomyClient: ClientGrpc,
  ) {}

  private taxonomy(downstream?: TaxonomyDownstream): TaxonomyProxy {
    return getTaxonomy(
      this.taxonomyClient,
      downstream && "signingPolicy" in downstream
        ? downstream.signingPolicy
        : undefined,
    );
  }

  // ---------------------------
  // List (needs kind)
  // ---------------------------
  async list(
    kind: string,
    q?: ListTaxonomyQuery,
    downstream?: TaxonomyDownstream,
  ) {
    const page = q?.page ?? 1;
    const limit = q?.limit ?? 50;
    const search = q?.q ?? "";
    const parentId = q?.parentId ?? undefined;

    const res = await wrapGrpc(
      firstValueFrom(
        this.taxonomy(downstream).ListTaxonomies(
          {
            scope: this.scope,
            kind,
            page,
            limit,
            q: search,
            parentId,
          },
          downstreamMetadata(downstream),
        ),
      ),
    );

    return {
      data: res.data,
      page: res.page,
      limit: res.limit,
      total: res.total,
    };
  }

  // ---------------------------
  // Get (by ID only)
  // ---------------------------
  async get(id: string, downstream?: TaxonomyDownstream) {
    const res = await wrapGrpc(
      firstValueFrom(
        this.taxonomy(downstream).GetTaxonomy(
          { id },
          downstreamMetadata(downstream),
        ),
      ),
    );

    if (!res.data || res.data.scope !== this.scope) {
      throw new BadRequestException("taxonomy_not_in_blog_scope");
    }

    return { data: res.data };
  }

  // ---------------------------
  // Create (needs kind)
  // ---------------------------
  async create(
    kind: string,
    dto: CreateTaxonomyDto,
    downstream?: TaxonomyDownstream,
  ) {
    const res = await wrapGrpc(
      firstValueFrom(
        this.taxonomy(downstream).CreateTaxonomy(
          {
            scope: this.scope,
            kind,
            slug: dto.slug,
            title: dto.title,
            description: dto.description ?? "",
            isTree: !!dto.parentId,
            parentId: dto.parentId ?? "",
            path: dto.slug,
            isHidden: dto.isHidden ?? false,
            isSystem: false,
            sortOrder: dto.sortOrder ?? 0,
            meta: {},
          },
          downstreamMetadata(downstream),
        ),
      ),
    );

    if (!res.data || res.data.scope !== this.scope || res.data.kind !== kind) {
      // very defensive; normally taxonomy-service guarantees this
      throw new BadRequestException("taxonomy_scope_or_kind_mismatch");
    }

    return { data: res.data };
  }

  // ---------------------------
  // Update (by ID only)
  // ---------------------------
  async update(
    id: string,
    dto: UpdateTaxonomyDto,
    downstream?: TaxonomyDownstream,
  ) {
    // First make sure this taxonomy belongs to blog scope
    const existing = await wrapGrpc(
      firstValueFrom(
        this.taxonomy(downstream).GetTaxonomy(
          { id },
          downstreamMetadata(downstream),
        ),
      ),
    );
    if (!existing.data || existing.data.scope !== this.scope) {
      throw new BadRequestException("taxonomy_not_in_blog_scope");
    }

    const patch: UpdateTaxonomyReq = {
      id,
      slug: dto.slug,
      title: dto.title,
      description: dto.description,
      isHidden: dto.isHidden,
      sortOrder: dto.sortOrder,
    };

    // Distinguish "not provided" vs "explicit null"
    if (Object.prototype.hasOwnProperty.call(dto, "parentId")) {
      patch.parentId = dto.parentId === null ? null : dto.parentId;
    }

    const res = await wrapGrpc(
      firstValueFrom(
        this.taxonomy(downstream).UpdateTaxonomy(
          patch,
          downstreamMetadata(downstream),
        ),
      ),
    );

    return { data: res.data };
  }

  // ---------------------------
  // Delete (by ID only)
  // ---------------------------
  async remove(id: string, downstream?: TaxonomyDownstream) {
    const existing = await wrapGrpc(
      firstValueFrom(
        this.taxonomy(downstream).GetTaxonomy(
          { id },
          downstreamMetadata(downstream),
        ),
      ),
    );
    if (!existing.data || existing.data.scope !== this.scope) {
      throw new BadRequestException("taxonomy_not_in_blog_scope");
    }

    await wrapGrpc(
      firstValueFrom(
        this.taxonomy(downstream).DeleteTaxonomy(
          { id },
          downstreamMetadata(downstream),
        ),
      ),
    );
    return { data: true };
  }
}
