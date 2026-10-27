import "reflect-metadata";

import {
  BadRequestException,
  NotFoundException,
  type ArgumentMetadata,
} from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import {
  ALLOWED_S2S_CALLERS_KEY,
  INTERNAL_ONLY_KEY,
  IS_PUBLIC_KEY,
  createGrpcValidationPipe,
} from "@nebula/grpc-auth";
import { MediaStatus, ScanStatus } from "../prisma/generated";
import { ResolveProductReferenceDto } from "../src/dto/resolve-product-reference.dto";
import { MediaService } from "../src/media.service";
import { MediaGrpcController } from "../src/grpc/media-grpc.controller";
import type { PrismaService } from "../src/prisma.service";

const id = "dd90a288-ecdd-4b1b-91b7-b57773425019";
const publicImage = {
  id,
  storage: "s3",
  path: `uploads/products/${id}.webp`,
  accessClass: "PUBLIC",
  visibility: "public",
  status: MediaStatus.READY,
  scanStatus: ScanStatus.CLEAN,
  mimeType: "image/webp",
};

function harness(row: Record<string, unknown> | null = publicImage) {
  const findUnique = jest.fn().mockResolvedValue(row);
  const service = new MediaService({
    mediaVerifiedSource: { findUnique: jest.fn().mockResolvedValue(null) },
    mediaProcessingJob: { findUnique: jest.fn().mockResolvedValue(null) },
    media: { findUnique },
  } as unknown as PrismaService);
  return { service, findUnique };
}

describe("public Product Media reference resolution", () => {
  it("allows only Product-service to resolve references without an admin actor", () => {
    const handler: unknown = Object.getOwnPropertyDescriptor(
      MediaGrpcController.prototype,
      "resolveProductReference",
    )?.value;
    expect(typeof handler).toBe("function");
    if (typeof handler !== "function")
      throw new Error("media_reference_handler_missing");
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
    expect(Reflect.getMetadata(INTERNAL_ONLY_KEY, handler)).toBe(true);
    expect(Reflect.getMetadata(ALLOWED_S2S_CALLERS_KEY, handler)).toEqual([
      "product-service",
    ]);
  });

  it("returns only the stable gateway identity for a renderable image", async () => {
    const { service } = harness();

    await expect(
      service.resolveProductReference(id, "THUMBNAIL"),
    ).resolves.toEqual({
      mediaId: id,
      role: "THUMBNAIL",
      renderPath: `/api/v1/media/render/${id}`,
      mimeType: "image/webp",
    });
  });

  it("rejects an unknown role before accessing Media", async () => {
    const { service, findUnique } = harness();

    await expect(
      service.resolveProductReference(id, "MODEL_3D"),
    ).rejects.toEqual(new BadRequestException("product_media_role_invalid"));
    expect(findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ["private media", { accessClass: "PROTECTED", visibility: "private" }],
    ["outside the public library", { path: "private/objects/image.webp" }],
    ["pending media", { status: MediaStatus.PENDING }],
    ["unclean media", { scanStatus: ScanStatus.INFECTED }],
    ["unrenderable storage", { storage: "local" }],
    ["non-image media", { mimeType: "application/pdf" }],
  ])("rejects %s", async (_case, override) => {
    const { service } = harness({ ...publicImage, ...override });

    await expect(
      service.resolveProductReference(id, "GALLERY"),
    ).rejects.toThrow(/not_public_library_media|product_media_not_renderable/);
  });

  it("rejects a missing Media record", async () => {
    const { service } = harness(null);

    await expect(
      service.resolveProductReference(id, "GALLERY"),
    ).rejects.toEqual(new NotFoundException("media_not_found"));
  });

  it("validates the versioned RPC request before calling the service", async () => {
    const metadata: ArgumentMetadata = {
      type: "body",
      metatype: ResolveProductReferenceDto,
    };
    await expect(
      createGrpcValidationPipe().transform(
        { id: "bad-id", role: "GALLERY" },
        metadata,
      ),
    ).rejects.toBeInstanceOf(RpcException);
    await expect(
      createGrpcValidationPipe().transform({ id, role: "STRICT" }, metadata),
    ).rejects.toBeInstanceOf(RpcException);
  });
});
