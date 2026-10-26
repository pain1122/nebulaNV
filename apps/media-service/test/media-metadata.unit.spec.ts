import "reflect-metadata";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { media, productv1 } from "@nebula/protos";
import { MediaService } from "../src/media.service";
import { MediaMetadataDto } from "../src/dto/media-metadata.dto";
import type { PrismaService } from "../src/prisma.service";

const id = "dd90a288-ecdd-4b1b-91b7-b57773425019";
const admin = { userId: "admin-id", role: "admin" };
function harness(count = 1, status: string | null = "READY") {
  const row = {
    id,
    status,
    metadataVersion: 2,
    title: "title",
    defaultAlt: "alt",
  };
  const updateMany = jest
    .fn<Promise<{ count: number }>, [Record<string, unknown>]>()
    .mockResolvedValue({ count });
  const tx = {
    media: {
      updateMany,
      findUnique: jest.fn().mockResolvedValue(status === null ? null : row),
      findUniqueOrThrow: jest.fn().mockResolvedValue(row),
    },
  };
  const transaction = jest.fn((operation: (arg: typeof tx) => unknown) =>
    Promise.resolve(operation(tx)),
  );
  return {
    service: new MediaService({
      $transaction: transaction,
    } as unknown as PrismaService),
    updateMany,
    transaction,
  };
}

describe("Media descriptive metadata", () => {
  it("updates Unicode text atomically without touching image facts and preserves omitted alt", async () => {
    const { service, updateMany } = harness();
    await service.updateMetadata(
      id,
      { expectedVersion: 1, title: "لیوان آبی" },
      admin,
    );
    expect(updateMany.mock.calls[0][0]).toEqual({
      where: { id, status: { not: "DELETED" }, metadataVersion: 1 },
      data: { title: "لیوان آبی", metadataVersion: { increment: 1 } },
    });
  });
  it("distinguishes default reset from intentionally empty alt", async () => {
    const { service, updateMany } = harness();
    await service.updateMetadata(
      id,
      { expectedVersion: 1, title: null, defaultAlt: "" },
      admin,
    );
    expect(updateMany.mock.calls[0][0].data).toEqual({
      title: null,
      defaultAlt: "",
      metadataVersion: { increment: 1 },
    });
  });
  it.each([undefined, { userId: "u", role: "user" }])(
    "rejects unauthorized callers before writing",
    async (actor) => {
      const { service, transaction } = harness();
      await expect(
        service.updateMetadata(id, { expectedVersion: 1, title: "x" }, actor),
      ).rejects.toBeInstanceOf(
        actor ? ForbiddenException : UnauthorizedException,
      );
      expect(transaction).not.toHaveBeenCalled();
    },
  );
  it.each([
    {},
    { title: "a".repeat(201) },
    { defaultAlt: "a".repeat(181) },
    { title: "bad\u0000text" },
    { title: "x", clearTitle: true },
  ])("rejects invalid patch before writing: %j", async (patch) => {
    const { service, transaction } = harness();
    await expect(
      service.updateMetadata(id, { expectedVersion: 1, ...patch }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });
  it.each([
    ["READY", ConflictException],
    ["DELETED", NotFoundException],
    [null, NotFoundException],
  ] as const)(
    "rejects stale/deleted/missing edits: %s",
    async (status, error) => {
      await expect(
        harness(0, status).service.updateMetadata(
          id,
          { expectedVersion: 1, title: "x" },
          admin,
        ),
      ).rejects.toBeInstanceOf(error);
    },
  );
  it("validates strict revision and nullable text at HTTP boundary", () => {
    expect(
      validateSync(
        plainToInstance(MediaMetadataDto, {
          expectedVersion: 1,
          title: null,
          defaultAlt: "",
        }),
      ),
    ).toEqual([]);
    expect(
      validateSync(
        plainToInstance(MediaMetadataDto, { expectedVersion: "1", title: "x" }),
      ).length,
    ).toBeGreaterThan(0);
  });
  it("keeps absent and empty gallery text distinct through actual protobuf encoding", () => {
    const omitted = productv1.NewImage.decode(
      productv1.NewImage.encode(
        productv1.NewImage.create({ mediaId: id }),
      ).finish(),
    );
    const empty = productv1.NewImage.decode(
      productv1.NewImage.encode(
        productv1.NewImage.create({ mediaId: id, alt: "" }),
      ).finish(),
    );
    expect(omitted.alt).toBeUndefined();
    expect(empty.alt).toBe("");
    const reset = media.UpdateMetadataReq.decode(
      media.UpdateMetadataReq.encode(
        media.UpdateMetadataReq.create({
          id,
          expectedVersion: 1,
          clearDefaultAlt: true,
        }),
      ).finish(),
    );
    expect(reset.defaultAlt).toBeUndefined();
    expect(reset.clearDefaultAlt).toBe(true);
  });
});
