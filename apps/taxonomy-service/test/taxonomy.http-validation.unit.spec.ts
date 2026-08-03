import "reflect-metadata";

import {
  BadRequestException,
  type ArgumentMetadata,
  ValidationPipe,
} from "@nestjs/common";
import { createHttpValidationPipe } from "@packages/config";
import { CreateTaxonomyDto } from "../src/taxonomy/dto/create-taxonomy.dto";
import { ListTaxonomiesQueryDto } from "../src/taxonomy/dto/list-taxonomies-query.dto";

function createCurrentTaxonomyPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });
}

async function rejectsBadRequest(
  value: unknown,
  metadata: ArgumentMetadata,
): Promise<void> {
  await expect(
    createHttpValidationPipe().transform(value, metadata),
  ).rejects.toBeInstanceOf(BadRequestException);
}

describe("taxonomy HTTP validation migration", () => {
  const createMetadata: ArgumentMetadata = {
    type: "body",
    metatype: CreateTaxonomyDto,
  };
  const listMetadata: ArgumentMetadata = {
    type: "query",
    metatype: ListTaxonomiesQueryDto,
  };

  it("preserves valid typed create input", async () => {
    const input = {
      scope: "product",
      kind: "category",
      slug: "chairs",
      title: "Chairs",
      isHidden: false,
      sortOrder: 2,
    };

    const current: unknown = await createCurrentTaxonomyPipe().transform(
      input,
      createMetadata,
    );
    const shared: unknown = await createHttpValidationPipe().transform(
      input,
      createMetadata,
    );

    expect(shared).toEqual(current);
    expect(shared).toBeInstanceOf(CreateTaxonomyDto);
  });

  it("preserves missing create-field rejection", async () => {
    await rejectsBadRequest(
      {
        scope: "product",
        kind: "category",
        slug: "chairs",
      },
      createMetadata,
    );
  });

  it("rejects implicit create-body coercion", async () => {
    const input = {
      scope: "product",
      kind: "category",
      slug: "chairs",
      title: "Chairs",
      isHidden: "false",
      sortOrder: "2",
    };

    const current: unknown = await createCurrentTaxonomyPipe().transform(
      input,
      createMetadata,
    );
    expect(current).toMatchObject({ isHidden: true, sortOrder: 2 });

    await rejectsBadRequest(input, createMetadata);
  });

  it("explicitly transforms valid list pagination", async () => {
    const result: unknown = await createHttpValidationPipe().transform(
      {
        page: "2",
        limit: "25",
        scope: "product",
      },
      listMetadata,
    );

    expect(result).toBeInstanceOf(ListTaxonomiesQueryDto);
    expect(result).toMatchObject({
      page: 2,
      limit: 25,
      scope: "product",
    });
  });

  it("rejects invalid and unknown list fields", async () => {
    await rejectsBadRequest({ page: "not-a-number" }, listMetadata);
    await rejectsBadRequest(
      {
        page: "2",
        role: "root-admin",
      },
      listMetadata,
    );
  });
});
