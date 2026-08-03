import "reflect-metadata";

import {
  BadRequestException,
  type ArgumentMetadata,
  ValidationPipe,
} from "@nestjs/common";
import { createHttpValidationPipe } from "@packages/config";
import {
  CreateProductRequestDto,
  ListProductsRequestDto,
} from "../src/product/dto/product-input.dto";

function createCurrentGlobalPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
}

function createCurrentControllerPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });
}

async function transformCurrentPipeline(
  value: unknown,
  metadata: ArgumentMetadata,
): Promise<unknown> {
  const globalResult: unknown = await createCurrentGlobalPipe().transform(
    value,
    metadata,
  );
  return createCurrentControllerPipe().transform(globalResult, metadata);
}

async function transformBoth(
  value: unknown,
  metadata: ArgumentMetadata,
): Promise<{ current: unknown; shared: unknown }> {
  const current = await transformCurrentPipeline(value, metadata);
  const shared: unknown = await createHttpValidationPipe().transform(
    value,
    metadata,
  );
  return { current, shared };
}

async function bothReject(
  value: unknown,
  metadata: ArgumentMetadata,
): Promise<void> {
  await expect(
    transformCurrentPipeline(value, metadata),
  ).rejects.toBeInstanceOf(BadRequestException);
  await expect(
    createHttpValidationPipe().transform(value, metadata),
  ).rejects.toBeInstanceOf(BadRequestException);
}

describe("product HTTP validation migration", () => {
  const listMetadata: ArgumentMetadata = {
    type: "query",
    metatype: ListProductsRequestDto,
  };
  const createMetadata: ArgumentMetadata = {
    type: "body",
    metatype: CreateProductRequestDto,
  };

  it("preserves explicit list number and boolean transforms", async () => {
    const result = await transformBoth(
      {
        q: "chair",
        page: "2",
        limit: "25",
        includeDeleted: "true",
      },
      listMetadata,
    );

    expect(result.shared).toEqual(result.current);
    expect(result.shared).toMatchObject({
      q: "chair",
      page: 2,
      limit: 25,
      includeDeleted: true,
    });
  });

  it("preserves nested product number and boolean transforms", async () => {
    const result = await transformBoth(
      {
        data: {
          title: "Chair",
          price: "19.95",
          isFeatured: "1",
        },
      },
      createMetadata,
    );

    expect(result.shared).toEqual(result.current);
    expect(result.shared).toMatchObject({
      data: {
        title: "Chair",
        price: 19.95,
        isFeatured: true,
      },
    });
  });

  it("preserves missing nested-field rejection", async () => {
    await bothReject({ data: { price: "19.95" } }, createMetadata);
  });

  it("preserves top-level unknown-field rejection", async () => {
    await bothReject(
      {
        data: { title: "Chair" },
        extra: "not-allowed",
      },
      createMetadata,
    );
  });

  it("preserves nested unknown-field rejection", async () => {
    await bothReject(
      {
        data: {
          title: "Chair",
          role: "root-admin",
        },
      },
      createMetadata,
    );
  });
});
