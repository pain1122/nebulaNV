import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { MediaStatus, ScanStatus } from "../prisma/generated";
import type { PrismaService } from "../src/prisma.service";
import { type CreateMediaInput, MediaService } from "../src/media.service";

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn(),
}));

const mockedGetSignedUrl = jest.mocked(getSignedUrl);

type MockPrisma = {
  media: {
    create: jest.Mock<Promise<Record<string, unknown>>, [MediaCreateArgs]>;
    findUnique: jest.Mock;
    findMany: jest.Mock;
  };
};

type MediaCreateArgs = {
  data: Record<string, unknown>;
};

function createMockPrisma(): MockPrisma {
  return {
    media: {
      create: jest.fn(({ data }: MediaCreateArgs) =>
        Promise.resolve({
          id: "media-id",
          createdAt: new Date("2026-06-30T00:00:00.000Z"),
          updatedAt: new Date("2026-06-30T00:00:00.000Z"),
          ...data,
        }),
      ),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };
}

function createInput(
  overrides: Partial<CreateMediaInput> = {},
): CreateMediaInput {
  return {
    storage: "local",
    path: "local/test.webp",
    filename: "test.webp",
    mimeType: "image/webp",
    sizeBytes: 10,
    actorUserId: "00000000-0000-0000-0000-000000000001",
    actorRole: "admin",
    scope: "panel",
    ...overrides,
  } as CreateMediaInput;
}

function readyS3Row(
  accessClass: "PUBLIC" | "PROTECTED" | "STRICT",
  overrides: Record<string, unknown> = {},
) {
  const isPublic = accessClass === "PUBLIC";

  return {
    id: `media-${accessClass.toLowerCase()}`,
    storage: "s3",
    bucket: "media",
    path: isPublic
      ? `uploads/test/${accessClass.toLowerCase()}.webp`
      : "private/objects/00000000-0000-4000-8000-000000000001",
    filename: `${accessClass.toLowerCase()}.webp`,
    mimeType: "image/webp",
    sizeBytes: 10,
    ownerId: "00000000-0000-0000-0000-000000000001",
    visibility: isPublic ? "public" : "private",
    accessClass,
    scope: isPublic ? "panel" : "product-media",
    folderPath: isPublic ? "/test" : "/",
    displayName: `${accessClass.toLowerCase()}.webp`,
    originalFilename: `${accessClass.toLowerCase()}.webp`,
    entityType: isPublic ? null : "product",
    entityId: isPublic ? null : "prod_123",
    status: MediaStatus.READY,
    scanStatus: ScanStatus.CLEAN,
    createdAt: new Date("2026-06-30T00:00:00.000Z"),
    updatedAt: new Date("2026-06-30T00:00:00.000Z"),
    width: null,
    height: null,
    durationSec: null,
    sha256: null,
    quarantineReason: null,
    etag: null,
    promotedAt: new Date("2026-06-30T00:00:00.000Z"),
    ...overrides,
  };
}

function lastCreatedData(prisma: MockPrisma): Record<string, unknown> {
  const calls = prisma.media.create.mock.calls;
  const call = calls[calls.length - 1];
  expect(call).toBeDefined();

  return call ? call[0].data : {};
}

describe("MediaService access-class contract", () => {
  let prisma: MockPrisma;
  let service: MediaService;
  const oldEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...oldEnv,
      MEDIA_STORAGE_DRIVER: "s3",
      MEDIA_S3_ENDPOINT: "http://127.0.0.1:9000",
      MEDIA_S3_PUBLIC_ENDPOINT: "http://127.0.0.1:9000",
      MEDIA_S3_REGION: "local",
      MEDIA_S3_ACCESS_KEY: "test-access",
      MEDIA_S3_SECRET_KEY: "test-secret",
      MEDIA_S3_BUCKET: "media",
      MEDIA_SIGNED_READ_TTL_SECONDS: "123",
      MEDIA_STRICT_READ_TTL_SECONDS: "7",
    };
    mockedGetSignedUrl.mockResolvedValue("https://signed.example.test/read");
    prisma = createMockPrisma();
    service = new MediaService(prisma as unknown as PrismaService);
  });

  afterAll(() => {
    process.env = oldEnv;
  });

  it("maps visibility=public to accessClass=PUBLIC", async () => {
    await service.create(createInput({ visibility: "public" }));

    const data = lastCreatedData(prisma);
    expect(data.accessClass).toBe("PUBLIC");
    expect(data.visibility).toBe("public");
  });

  it("maps visibility=private to accessClass=PROTECTED", async () => {
    await service.create(createInput({ visibility: "private" }));

    const data = lastCreatedData(prisma);
    expect(data.accessClass).toBe("PROTECTED");
    expect(data.visibility).toBe("private");
  });

  it("lets explicit accessClass override legacy visibility", async () => {
    await service.create(
      createInput({
        accessClass: "STRICT",
        visibility: "public",
      }),
    );

    const data = lastCreatedData(prisma);
    expect(data.accessClass).toBe("STRICT");
    expect(data.visibility).toBe("private");
  });

  it.each([
    ["PUBLIC", "123"],
    ["PROTECTED", "123"],
    ["STRICT", "7"],
  ] as const)(
    "uses the correct read TTL for %s media",
    async (accessClass, ttl) => {
      prisma.media.findUnique.mockResolvedValue(readyS3Row(accessClass));

      const out = await service.createReadUrl(
        `media-${accessClass.toLowerCase()}`,
        {
          actorUserId: "00000000-0000-0000-0000-000000000001",
          actorRole: "admin",
        },
      );

      expect(out.expiresIn).toBe(Number(ttl));
      expect(mockedGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: Number(ttl) },
      );
    },
  );

  it("allows a protected media owner to create a read URL", async () => {
    prisma.media.findUnique.mockResolvedValue(readyS3Row("PROTECTED"));

    const out = await service.createReadUrl("media-protected", {
      actorUserId: "00000000-0000-0000-0000-000000000001",
      actorRole: "user",
    });

    expect(out.accessClass).toBe("PROTECTED");
    expect(out.expiresIn).toBe(123);
    expect(mockedGetSignedUrl).toHaveBeenCalledTimes(1);
  });

  it("blocks a different user from creating a protected media read URL", async () => {
    prisma.media.findUnique.mockResolvedValue(readyS3Row("PROTECTED"));

    await expect(
      service.createReadUrl("media-protected", {
        actorUserId: "00000000-0000-0000-0000-000000000002",
        actorRole: "user",
      }),
    ).rejects.toThrow("media_access_denied");

    expect(mockedGetSignedUrl).not.toHaveBeenCalled();
  });

  it("lists protected files only inside the requested owner and feature context", async () => {
    prisma.media.findMany.mockResolvedValue([readyS3Row("PROTECTED")]);

    const out = await service.browseProtectedFilemanager({
      ownerId: "00000000-0000-0000-0000-000000000001",
      scope: "product-media",
      entityType: "product",
      entityId: "prod_123",
    });

    expect(prisma.media.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ownerId: "00000000-0000-0000-0000-000000000001",
          accessClass: "PROTECTED",
          visibility: "private",
          scope: "product-media",
          entityType: "product",
          entityId: "prod_123",
        }),
      }),
    );
    expect(out.files).toHaveLength(1);
    expect(out.folders).toEqual([]);
  });

  it("creates a protected feature read URL only when owner and feature context match", async () => {
    prisma.media.findUnique.mockResolvedValue(readyS3Row("PROTECTED"));

    const out = await service.createProtectedFeatureReadUrl("media-protected", {
      ownerId: "00000000-0000-0000-0000-000000000001",
      actorUserId: "00000000-0000-0000-0000-000000000001",
      actorRole: "user",
      scope: "product-media",
      entityType: "product",
      entityId: "prod_123",
    });

    expect(out.accessClass).toBe("PROTECTED");
    expect(mockedGetSignedUrl).toHaveBeenCalledTimes(1);
  });

  it("blocks protected feature read URLs from the wrong feature context", async () => {
    prisma.media.findUnique.mockResolvedValue(readyS3Row("PROTECTED"));

    await expect(
      service.createProtectedFeatureReadUrl("media-protected", {
        ownerId: "00000000-0000-0000-0000-000000000001",
        actorUserId: "00000000-0000-0000-0000-000000000001",
        actorRole: "user",
        scope: "product-media",
        entityType: "product",
        entityId: "prod_other",
      }),
    ).rejects.toThrow("media_context_mismatch");

    expect(mockedGetSignedUrl).not.toHaveBeenCalled();
  });
});
