import "reflect-metadata";
import { Metadata, status } from "@grpc/grpc-js";
import { RpcException } from "@nestjs/microservices";
import {
  createGrpcValidationPipe,
  IS_PUBLIC_KEY,
  ROLES_KEY,
  type MetadataWithContext,
} from "@nebula/grpc-auth";
import { MediaGrpcController } from "../src/grpc/media-grpc.controller";
import { MediaService } from "../src/media.service";
import { ListMediaDto, MyProtectedReadUrlGrpcDto } from "../src/dto";

function handler(
  name: keyof MediaGrpcController,
): (...args: never[]) => unknown {
  const value: unknown = Object.getOwnPropertyDescriptor(
    MediaGrpcController.prototype,
    name,
  )?.value;
  if (typeof value !== "function") throw new Error(`missing_${String(name)}`);
  return value as (...args: never[]) => unknown;
}

function actorMetadata(
  userId = "00000000-0000-4000-8000-000000000001",
  role = "user",
): MetadataWithContext {
  const meta = new Metadata() as MetadataWithContext;
  meta.user = { userId, role };
  return meta;
}

async function rpcError(promise: Promise<unknown>) {
  try {
    await promise;
    throw new Error("expected_rpc_error");
  } catch (error) {
    if (!(error instanceof RpcException)) throw error;
    return error.getError() as { code: number; message: string };
  }
}

describe("Media additive gateway contracts", () => {
  const browseProtectedFilemanager = jest.fn();
  const createProtectedFeatureReadUrl = jest.fn();
  const previewPublicLibraryDelete = jest.fn();
  const confirmPublicLibraryDelete = jest.fn();
  const controller = new MediaGrpcController({
    browseProtectedFilemanager,
    createProtectedFeatureReadUrl,
    previewPublicLibraryDelete,
    confirmPublicLibraryDelete,
  } as unknown as MediaService);

  beforeEach(() => jest.clearAllMocks());

  it("keeps owned reads private to users and delete confirmation admin-only", () => {
    for (const name of [
      "listMyProtectedLibrary",
      "createMyProtectedReadUrl",
    ] as const) {
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler(name))).toBeUndefined();
      expect(Reflect.getMetadata(ROLES_KEY, handler(name))).toEqual([
        "user",
        "admin",
        "root-admin",
      ]);
    }

    for (const name of [
      "previewPublicLibraryDelete",
      "confirmPublicLibraryDelete",
    ] as const) {
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler(name))).toBeUndefined();
      expect(Reflect.getMetadata(ROLES_KEY, handler(name))).toEqual([
        "admin",
        "root-admin",
      ]);
    }
  });

  it("derives the protected-list owner and lane from verified context", async () => {
    browseProtectedFilemanager.mockResolvedValue({ files: [] });
    const req = {
      q: "manual",
      take: 20,
      skip: 5,
      ownerId: "00000000-0000-4000-8000-000000000999",
      accessClass: "PUBLIC",
      visibility: "public",
      scope: "product-media",
      entityType: "product",
      entityId: "prod_123",
    } as ListMediaDto;

    await expect(
      controller.listMyProtectedLibrary(req, actorMetadata()),
    ).resolves.toEqual({ $type: "media.ListRes", items: [] });
    expect(browseProtectedFilemanager).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "manual",
        take: 20,
        skip: 5,
        ownerId: "00000000-0000-4000-8000-000000000001",
        accessClass: "PROTECTED",
        visibility: "private",
        scope: "product-media",
        entityType: "product",
        entityId: "prod_123",
      }),
    );
  });

  it("derives owned read identity while preserving feature context", async () => {
    createProtectedFeatureReadUrl.mockResolvedValue({
      url: "https://signed.example.test/read",
      expiresIn: 120,
      accessClass: "PROTECTED",
      filename: "manual.webp",
      mimeType: "image/webp",
    });
    const req: MyProtectedReadUrlGrpcDto = {
      id: "00000000-0000-4000-8000-000000000010",
      scope: "product-media",
      entityType: "product",
      entityId: "prod_123",
      download: true,
    };

    await controller.createMyProtectedReadUrl(req, actorMetadata());
    expect(createProtectedFeatureReadUrl).toHaveBeenCalledWith(req.id, {
      ownerId: "00000000-0000-4000-8000-000000000001",
      actorUserId: "00000000-0000-4000-8000-000000000001",
      actorRole: "user",
      scope: "product-media",
      entityType: "product",
      entityId: "prod_123",
      download: true,
    });
  });

  it("derives preview actor and maps the bounded confirmation plan", async () => {
    previewPublicLibraryDelete.mockResolvedValue({
      scope: "panel",
      recursive: true,
      canDelete: true,
      warnings: [
        { code: "recursive_delete", folderPath: "/hero", fileCount: 1 },
      ],
      fileCount: 1,
      folderCount: 1,
      totalSizeBytes: 42,
      folders: [{ type: "folder", folderPath: "/hero", fileCount: 1 }],
      files: [
        {
          type: "file",
          id: "00000000-0000-4000-8000-000000000020",
          folderPath: "/hero",
          displayName: "hero.webp",
          path: "uploads/hero/hero.webp",
          sizeBytes: 42,
          mimeType: "image/webp",
        },
      ],
      confirmToken: "signed-plan",
      expiresIn: 30,
    });

    const response = await controller.previewPublicLibraryDelete(
      {
        items: [{ type: "folder", folderPath: "/hero" }],
        recursive: true,
      },
      actorMetadata("00000000-0000-4000-8000-000000000002", "admin"),
    );
    expect(previewPublicLibraryDelete).toHaveBeenCalledWith({
      items: [{ type: "folder", folderPath: "/hero" }],
      recursive: true,
      actorUserId: "00000000-0000-4000-8000-000000000002",
      actorRole: "admin",
    });
    expect(response).toMatchObject({
      canDelete: true,
      totalSizeBytes: "42",
      confirmToken: "signed-plan",
      expiresIn: 30,
      files: [{ sizeBytes: "42" }],
    });
  });

  it("derives confirmation actor and never accepts it from the request", async () => {
    confirmPublicLibraryDelete.mockResolvedValue({
      deleted: true,
      fileCount: 1,
      folderCount: 1,
      totalSizeBytes: 42,
    });
    const req = {
      items: [
        { type: "file" as const, id: "00000000-0000-4000-8000-000000000020" },
      ],
      recursive: false,
      confirmToken: "signed-plan",
    };

    await expect(
      controller.confirmPublicLibraryDelete(
        req,
        actorMetadata("00000000-0000-4000-8000-000000000002", "root-admin"),
      ),
    ).resolves.toMatchObject({ deleted: true, totalSizeBytes: "42" });
    expect(confirmPublicLibraryDelete).toHaveBeenCalledWith({
      ...req,
      actorUserId: "00000000-0000-4000-8000-000000000002",
      actorRole: "root-admin",
    });
  });

  it("rejects missing verified actors before reaching media policy", async () => {
    const error = await rpcError(
      controller.listMyProtectedLibrary({}, new Metadata()),
    );
    expect(error).toEqual({
      code: status.UNAUTHENTICATED,
      message: "Missing user context",
    });
    expect(browseProtectedFilemanager).not.toHaveBeenCalled();
  });

  it("strictly validates the owned read id and context", async () => {
    const pipe = createGrpcValidationPipe();
    await expect(
      pipe.transform(
        {
          id: "not-a-uuid",
          scope: "bad scope",
          entityType: "product",
          entityId: "prod_123",
        },
        { type: "body", metatype: MyProtectedReadUrlGrpcDto },
      ),
    ).rejects.toBeInstanceOf(RpcException);
  });
});
