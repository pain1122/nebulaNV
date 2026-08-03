import "reflect-metadata";

import {
  BadRequestException,
  type ArgumentMetadata,
  ValidationPipe,
} from "@nestjs/common";
import { createHttpValidationPipe } from "@packages/config";
import {
  CreatePostDto,
  CreatePostRequestDto,
  ListPostsQueryDto,
  UpdatePostRequestDto,
} from "../src/blog/dto/post.dto";

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

describe("blog HTTP validation migration", () => {
  const listMetadata: ArgumentMetadata = {
    type: "query",
    metatype: ListPostsQueryDto,
  };

  it("preserves explicit list pagination transforms", async () => {
    const result = await transformBoth(
      {
        q: "release",
        page: "2",
        limit: "25",
      },
      listMetadata,
    );

    expect(result.shared).toEqual(result.current);
    expect(result.shared).toMatchObject({
      q: "release",
      page: 2,
      limit: 25,
    });
  });

  it("preserves invalid-pagination rejection", async () => {
    await bothReject({ page: "0" }, listMetadata);
  });

  it("preserves list unknown-field rejection", async () => {
    await bothReject(
      {
        page: "2",
        extra: "not-allowed",
      },
      listMetadata,
    );
  });

  it("preserves valid nested create bodies", async () => {
    const input = {
      data: {
        title: "Release notes",
        body: "The release is ready.",
      },
    };
    const createMetadata: ArgumentMetadata = {
      type: "body",
      metatype: CreatePostRequestDto,
    };

    const result = await transformBoth(input, createMetadata);

    expect(result.shared).toEqual(result.current);
    expect(result.shared).toBeInstanceOf(CreatePostRequestDto);
    expect((result.shared as CreatePostRequestDto).data).toBeInstanceOf(
      CreatePostDto,
    );
  });

  it("rejects invalid nested create fields", async () => {
    await bothReject(
      {
        data: {
          title: 42,
        },
      },
      {
        type: "body",
        metatype: CreatePostRequestDto,
      },
    );
  });

  it("rejects unknown nested update fields", async () => {
    await bothReject(
      {
        patch: {
          title: "Release notes",
          role: "root-admin",
        },
      },
      {
        type: "body",
        metatype: UpdatePostRequestDto,
      },
    );
  });
});
