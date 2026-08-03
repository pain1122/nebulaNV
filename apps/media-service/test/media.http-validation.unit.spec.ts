import "reflect-metadata";

import {
  BadRequestException,
  type ArgumentMetadata,
  ValidationPipe,
} from "@nestjs/common";
import { createHttpValidationPipe } from "@packages/config";
import {
  CreateMediaDto,
  ListMediaDto,
  PresignUploadDto,
  PublicLibraryDeletePreviewDto,
  RenderMediaDto,
} from "../src/dto";
import { envSchema } from "../src/config/env.validation";

function createLegacyMediaPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });
}

function metadata(
  type: ArgumentMetadata["type"],
  metatype: NonNullable<ArgumentMetadata["metatype"]>,
): ArgumentMetadata {
  return { type, metatype };
}

async function rejectsBadRequest(
  pipe: ValidationPipe,
  value: unknown,
  argumentMetadata: ArgumentMetadata,
): Promise<void> {
  await expect(pipe.transform(value, argumentMetadata)).rejects.toBeInstanceOf(
    BadRequestException,
  );
}

async function transformBoth(
  value: unknown,
  argumentMetadata: ArgumentMetadata,
): Promise<{ legacy: unknown; shared: unknown }> {
  const legacy: unknown = await createLegacyMediaPipe().transform(
    value,
    argumentMetadata,
  );
  const shared: unknown = await createHttpValidationPipe().transform(
    value,
    argumentMetadata,
  );
  return { legacy, shared };
}

describe("media HTTP validation migration", () => {
  it("preserves explicit list-query transforms", async () => {
    const result = await transformBoth(
      {
        q: "  image  ",
        take: "25",
        skip: "0",
        accessClass: " protected ",
        mediaType: " IMAGE ",
      },
      metadata("query", ListMediaDto),
    );

    expect(result.shared).toEqual(result.legacy);
    expect(result.shared).toMatchObject({
      q: "image",
      take: 25,
      skip: 0,
      accessClass: "PROTECTED",
      mediaType: "image",
    });
  });

  it("preserves explicit media-size conversion", async () => {
    const result = await transformBoth(
      {
        path: "  uploads/image.png  ",
        filename: "image.png",
        mimeType: " image/png ",
        sizeBytes: "512",
      },
      metadata("body", CreateMediaDto),
    );

    expect(result.shared).toEqual(result.legacy);
    expect(result.shared).toMatchObject({
      path: "uploads/image.png",
      filename: "image.png",
      mimeType: "image/png",
      sizeBytes: 512,
    });
  });

  it("preserves explicit render-query normalization", async () => {
    const result = await transformBoth(
      { variant: " WEB " },
      metadata("query", RenderMediaDto),
    );

    expect(result.shared).toEqual(result.legacy);
    expect(result.shared).toMatchObject({ variant: "web" });
  });

  it("preserves valid nested delete items and boolean values", async () => {
    const result = await transformBoth(
      {
        items: [
          {
            type: "file",
            id: "11111111-1111-4111-8111-111111111111",
          },
        ],
        recursive: false,
      },
      metadata("body", PublicLibraryDeletePreviewDto),
    );

    expect(result.shared).toEqual(result.legacy);
    expect(result.shared).toMatchObject({ recursive: false });
  });

  it("preserves missing-field rejection", async () => {
    const argumentMetadata = metadata("body", PresignUploadDto);
    const input = { mimeType: "image/png" };

    await rejectsBadRequest(createLegacyMediaPipe(), input, argumentMetadata);
    await rejectsBadRequest(
      createHttpValidationPipe(),
      input,
      argumentMetadata,
    );
  });

  it("preserves unknown-field rejection", async () => {
    const argumentMetadata = metadata("query", ListMediaDto);
    const input = { take: "25", extra: "not-allowed" };

    await rejectsBadRequest(createLegacyMediaPipe(), input, argumentMetadata);
    await rejectsBadRequest(
      createHttpValidationPipe(),
      input,
      argumentMetadata,
    );
  });

  it("documents rejection of an implicitly converted boolean string", async () => {
    const argumentMetadata = metadata("body", PublicLibraryDeletePreviewDto);
    const input = {
      items: [
        {
          type: "file",
          id: "11111111-1111-4111-8111-111111111111",
        },
      ],
      recursive: "false",
    };

    const legacy: unknown = await createLegacyMediaPipe().transform(
      input,
      argumentMetadata,
    );
    expect(legacy).toMatchObject({ recursive: true });

    await rejectsBadRequest(
      createHttpValidationPipe(),
      input,
      argumentMetadata,
    );
  });
});

const baseMediaEnvironment = {
  S2S_OUTBOUND_KEYS: "{}",
  S2S_INBOUND_KEYS: "{}",
  GATEWAY_INBOUND_KEYS: "{}",
  DATABASE_URL: "postgresql://user:pass@127.0.0.1:5432/media",
  SHADOW_DATABASE_URL: "postgresql://user:pass@127.0.0.1:5432/media_shadow",
  MEDIA_STORAGE_DRIVER: "s3",
  MEDIA_S3_ENDPOINT: "http://127.0.0.1:9000",
  MEDIA_S3_ACCESS_KEY: "access-key",
  MEDIA_S3_SECRET_KEY: "secret-key",
  MEDIA_DELETE_CONFIRM_SECRET: "d".repeat(32),
};

describe("media environment validation", () => {
  it("requires an externally usable S3 endpoint in production", () => {
    expect(
      envSchema.validate({
        ...baseMediaEnvironment,
        NODE_ENV: "development",
      }).error,
    ).toBeUndefined();

    expect(
      envSchema.validate({
        ...baseMediaEnvironment,
        NODE_ENV: "production",
      }).error,
    ).toBeDefined();

    expect(
      envSchema.validate({
        ...baseMediaEnvironment,
        NODE_ENV: "production",
        MEDIA_S3_PUBLIC_ENDPOINT: "https://media.example.test",
      }).error,
    ).toBeUndefined();
  });

  it("bounds synchronous deletion work at startup", () => {
    expect(
      envSchema.validate({
        ...baseMediaEnvironment,
        MEDIA_SYNC_DELETE_MAX_FILES: 10_001,
      }).error,
    ).toBeDefined();
  });
});
