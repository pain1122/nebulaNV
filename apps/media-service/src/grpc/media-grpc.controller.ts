import { Controller, Logger } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { Metadata, status } from "@grpc/grpc-js";
import {
  type CreateMediaInput,
  type FinalizeUploadInput,
  MediaService,
  type PresignUploadInput,
} from "../media.service";
import type { Media as MediaRecord } from "../../prisma/generated";
import { Public, Roles, resolveCtxUser, toRpc } from "@nebula/grpc-auth";
import { media } from "@nebula/protos";
import type { ListMediaDto } from "../dto";

@Controller()
export class MediaGrpcController {
  private readonly log = new Logger(MediaGrpcController.name);
  constructor(private readonly svc: MediaService) {}

  private resolveOwnerId(
    ctx: { userId?: string | null; role?: string },
    requested?: string | null,
  ): string | null {
    const requestedOwnerId = requested?.trim();
    if (!requestedOwnerId) return ctx.userId ?? null;

    // Explicit admin override path; never anonymous caller identity.
    if (ctx.role === "admin" || ctx.role === "root-admin") {
      return requestedOwnerId;
    }

    return ctx.userId ?? null;
  }

  @Public()
  @GrpcMethod("MediaService", "Ping")
  ping(): media.Pong {
    return media.Pong.create({ message: "pong" });
  }

  // admin/root-admin (panel writes)
  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "Create")
  async create(req: media.CreateReq, meta: Metadata): Promise<media.MediaRes> {
    const ctx = resolveCtxUser(meta);
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context");

    const input: CreateMediaInput = {
      storage: req.storage?.trim() ? req.storage.trim() : "local",
      bucket: req.bucket?.trim() ? req.bucket.trim() : null,
      path: req.path?.trim() ?? "",
      folderPath: req.folderPath?.trim() ? req.folderPath.trim() : undefined,
      displayName: req.displayName?.trim() ? req.displayName.trim() : undefined,
      originalFilename: req.originalFilename?.trim()
        ? req.originalFilename.trim()
        : undefined,
      filename: req.filename?.trim() ?? "",
      mimeType: req.mimeType?.trim() ?? "",
      sizeBytes: req.sizeBytes?.trim() ? Number(req.sizeBytes.trim()) : 0,
      width: req.width && req.width > 0 ? req.width : undefined,
      height: req.height && req.height > 0 ? req.height : undefined,
      durationSec:
        req.durationSec && req.durationSec > 0 ? req.durationSec : undefined,
      actorUserId: ctx.userId ?? null,
      actorRole: ctx.role ?? null,
      ownerId: this.resolveOwnerId(ctx, req.ownerId),
      accessClass: req.accessClass?.trim() ? req.accessClass.trim() : undefined,
      visibility: req.visibility?.trim() ? req.visibility.trim() : "private",
      scope: req.scope?.trim() ? req.scope.trim() : "panel",
      sha256: req.sha256?.trim() ? req.sha256.trim() : null,
    };

    const created = await this.svc.create(input);

    this.log.debug(
      `[MediaService] Create id=${created.id} filename=${created.filename}`,
    );
    return media.MediaRes.create({ media: toProtoMedia(created) });
  }

  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "GetById")
  async getById(
    req: media.GetByIdReq,
    meta: Metadata,
  ): Promise<media.MediaRes> {
    const ctx = resolveCtxUser(meta);
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context");

    const row = await this.svc.getById(req.id);
    return media.MediaRes.create({ media: toProtoMedia(row) });
  }

  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "List")
  async list(req: media.ListReq, meta: Metadata): Promise<media.ListRes> {
    const ctx = resolveCtxUser(meta);
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context");

    const input: ListMediaDto = {
      q: req.q ?? "",
      take: req.take ?? 50,
      skip: req.skip ?? 0,
      ownerId: req.ownerId?.trim() ? req.ownerId.trim() : undefined,
      accessClass: req.accessClass?.trim() ? req.accessClass.trim() : undefined,
      visibility: req.visibility?.trim() ? req.visibility.trim() : undefined,
      scope: req.scope?.trim() ? req.scope.trim() : undefined,
      folderPath: req.folderPath?.trim() ? req.folderPath.trim() : undefined,
    };

    const items = await this.svc.list(input);

    return media.ListRes.create({ items: items.map(toProtoMedia) });
  }

  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "DeleteById")
  async deleteById(
    req: media.DeleteByIdReq,
    meta: Metadata,
  ): Promise<media.DeleteRes> {
    const ctx = resolveCtxUser(meta);
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context");

    const deleted = await this.svc.deleteById(req.id);
    this.log.debug(`[MediaService] DeleteById id=${req.id} -> ${deleted}`);
    return media.DeleteRes.create({ deleted });
  }

  // admin/root-admin (panel writes)
  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "PresignUpload")
  async presignUpload(
    req: media.PresignUploadReq,
    meta: Metadata,
  ): Promise<media.PresignUploadRes> {
    const ctx = resolveCtxUser(meta);
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context");

    const input: PresignUploadInput = {
      filename: req.filename?.trim() ?? "",
      mimeType: req.mimeType?.trim() ?? "",
      actorUserId: ctx.userId ?? null,
      actorRole: ctx.role ?? null,
      ownerId: this.resolveOwnerId(ctx, req.ownerId) ?? undefined,
      accessClass: req.accessClass?.trim() ? req.accessClass.trim() : undefined,
      visibility: req.visibility?.trim() ? req.visibility.trim() : undefined,
      scope: req.scope?.trim() ? req.scope.trim() : "panel",
      folderPath: req.folderPath?.trim() ? req.folderPath.trim() : undefined,
      displayName: req.displayName?.trim() ? req.displayName.trim() : undefined,
    };

    const out = await this.svc.presignUpload(input);

    return media.PresignUploadRes.create({
      storage: out.storage ?? "s3",
      bucket: out.bucket ?? "",
      path: out.path ?? "",
      uploadUrl: out.uploadUrl ?? "",
      expiresIn: out.expiresIn ?? 600,

      // optional echo fields (nice for clients)
      filename: out.filename ?? "",
      mimeType: out.mimeType ?? "",
      visibility: out.visibility ?? "private",
      accessClass: out.accessClass ?? "PUBLIC",
      scope: out.scope ?? "panel",
      folderPath: out.folderPath ?? "/",
      displayName: out.displayName ?? "",
      originalFilename: out.originalFilename ?? "",
    });
  }

  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "FinalizeUpload")
  async finalizeUpload(
    req: media.FinalizeUploadReq,
    meta: Metadata,
  ): Promise<media.MediaRes> {
    const ctx = resolveCtxUser(meta);
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context");

    const input: FinalizeUploadInput = {
      storage: req.storage?.trim() ? req.storage.trim() : "s3",
      bucket: req.bucket?.trim() ? req.bucket.trim() : undefined,
      path: req.path?.trim() ?? "",
      folderPath: req.folderPath?.trim() ? req.folderPath.trim() : undefined,
      displayName: req.displayName?.trim() ? req.displayName.trim() : undefined,
      originalFilename: req.originalFilename?.trim()
        ? req.originalFilename.trim()
        : undefined,
      filename: req.filename?.trim() || undefined,
      mimeType: req.mimeType?.trim() || undefined,
      visibility: req.visibility?.trim() || undefined,
      accessClass: req.accessClass?.trim() ? req.accessClass.trim() : undefined,
      scope: req.scope?.trim() || undefined,
      actorUserId: ctx.userId ?? null,
      actorRole: ctx.role ?? null,
      ownerId: this.resolveOwnerId(ctx, req.ownerId),
      sha256: req.sha256?.trim() ? req.sha256.trim() : null,
    };

    const created = await this.svc.finalizeUpload(input);

    return media.MediaRes.create({ media: toProtoMedia(created) });
  }
}

// Prisma -> Proto mapper (safe + explicit)
function toProtoMedia(row: MediaRecord): media.Media {
  return media.Media.create({
    id: row.id,

    storage: row.storage ?? "local",
    bucket: row.bucket ?? "",
    path: row.path ?? "",
    folderPath: row.folderPath ?? "/",
    displayName: row.displayName ?? "",
    originalFilename: row.originalFilename ?? "",
    filename: row.filename ?? "",
    mimeType: row.mimeType ?? "",
    sizeBytes: (row.sizeBytes ?? 0).toString(),

    width: row.width ?? 0,
    height: row.height ?? 0,
    durationSec: row.durationSec ?? 0,

    ownerId: row.ownerId ?? "",
    visibility: row.visibility ?? "private",
    accessClass: row.accessClass ?? "PUBLIC",
    scope: row.scope ?? "panel",

    sha256: row.sha256 ?? "",

    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : "",
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : "",

    // ✅ new lifecycle/security fields
    status: row.status ?? "PENDING",
    scanStatus: row.scanStatus ?? "NONE",
    quarantineReason: row.quarantineReason ?? "",
    etag: row.etag ?? "",
    promotedAt: row.promotedAt ? new Date(row.promotedAt).toISOString() : "",
  });
}
