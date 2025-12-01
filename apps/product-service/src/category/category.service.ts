import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

import { TAXONOMY_SERVICE } from '../taxonomy-client.module';
import { getTaxonomy, TaxonomyProxy } from '@nebula/clients';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoryService {
  constructor(@Inject(TAXONOMY_SERVICE) private readonly taxonomyClient: ClientGrpc) {}

  private taxonomy(): TaxonomyProxy {
    return getTaxonomy(this.taxonomyClient);
  }

  private readonly scope = 'product';
  private readonly kind = 'category.default';

  async list() {
    const res = await firstValueFrom(
      this.taxonomy().ListTaxonomies({ scope: this.scope, kind: this.kind }),
    );
    return { data: res.data };
  }

  async get(id: string) {
    const res = await firstValueFrom(this.taxonomy().GetTaxonomy({ id }));
    if (res.data.scope !== this.scope || res.data.kind !== this.kind) {
      throw new BadRequestException('Not a product category');
    }
    return { data: res.data };
  }

  async create(dto: CreateCategoryDto) {
    const res = await firstValueFrom(
      this.taxonomy().CreateTaxonomy({
        scope: this.scope,
        kind: this.kind,
        slug: dto.slug,
        title: dto.title,
        description: dto.description,
        parentId: dto.parentId ?? null,
        isHidden: dto.isHidden ?? false,
        isSystem: false,
        sortOrder: dto.sortOrder ?? 0,
        meta: {},
      }),
    );
    return { data: res.data };
  }

  async update(id: string, dto: UpdateCategoryDto) {
    // Optionally check scope/kind first:
    const existing = await firstValueFrom(this.taxonomy().GetTaxonomy({ id }));
    if (existing.data.scope !== this.scope || existing.data.kind !== this.kind) {
      throw new BadRequestException('Not a product category');
    }

    const res = await firstValueFrom(
      this.taxonomy().UpdateTaxonomy({
        id,
        title: dto.title,
        description: dto.description,
        parentId: dto.parentId ?? null,
        isHidden: dto.isHidden,
        sortOrder: dto.sortOrder,
        meta: existing.data.meta, // or merge
      }),
    );

    return { data: res.data };
  }

  async remove(id: string) {
    // Optionally check scope/kind:
    const existing = await firstValueFrom(this.taxonomy().GetTaxonomy({ id }));
    if (existing.data.scope !== this.scope || existing.data.kind !== this.kind) {
      throw new BadRequestException('Not a product category');
    }

    await firstValueFrom(this.taxonomy().DeleteTaxonomy({ id }));
    return { data: true };
  }
}
