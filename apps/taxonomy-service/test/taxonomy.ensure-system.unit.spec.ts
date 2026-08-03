import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { PrismaService } from "../src/prisma.service";
import {
  TaxonomyService,
  type TaxonomyDto,
} from "../src/taxonomy/taxonomy.service";

const request = {
  scope: "product",
  kind: "category.default",
  slug: "uncategorized",
  title: "Uncategorized",
  description: "Default product category",
};

function taxonomyResponse(id: string): { data: TaxonomyDto } {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    data: {
      id,
      scope: request.scope,
      kind: request.kind,
      slug: request.slug,
      title: request.title,
      description: request.description,
      isTree: false,
      parentId: null,
      depth: 0,
      path: request.slug,
      isHidden: false,
      isSystem: true,
      sortOrder: 0,
      meta: null,
      createdAt: now,
      updatedAt: now,
      hasChildren: false,
    },
  };
}

describe("TaxonomyService.ensureSystemTaxonomy", () => {
  let service: TaxonomyService;

  beforeEach(() => {
    service = new TaxonomyService({} as PrismaService);
  });

  it("returns an existing taxonomy without creating another", async () => {
    const existing = taxonomyResponse("existing-id");
    const getBySlug = jest
      .spyOn(service, "getBySlug")
      .mockResolvedValue(existing);
    const create = jest.spyOn(service, "create");

    await expect(service.ensureSystemTaxonomy(request)).resolves.toBe(existing);

    expect(getBySlug).toHaveBeenCalledWith(
      request.scope,
      request.kind,
      request.slug,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it("creates the fixed system taxonomy when it is missing", async () => {
    const created = taxonomyResponse("created-id");

    jest
      .spyOn(service, "getBySlug")
      .mockRejectedValue(new NotFoundException("taxonomy_not_found"));
    const create = jest.spyOn(service, "create").mockResolvedValue(created);

    await expect(service.ensureSystemTaxonomy(request)).resolves.toBe(created);

    expect(create).toHaveBeenCalledWith({
      ...request,
      isTree: false,
      isHidden: false,
      isSystem: true,
      sortOrder: 0,
    });
  });

  it("rereads the winner after concurrent creation", async () => {
    const winner = taxonomyResponse("winner-id");

    const getBySlug = jest
      .spyOn(service, "getBySlug")
      .mockRejectedValueOnce(new NotFoundException("taxonomy_not_found"))
      .mockResolvedValueOnce(winner);

    jest
      .spyOn(service, "create")
      .mockRejectedValue(new BadRequestException("taxonomy_duplicate_slug"));

    await expect(service.ensureSystemTaxonomy(request)).resolves.toBe(winner);

    expect(getBySlug).toHaveBeenCalledTimes(2);
  });
});
