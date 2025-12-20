import {Controller, Logger} from "@nestjs/common"
import {GrpcMethod} from "@nestjs/microservices"
import {Metadata, status} from "@grpc/grpc-js"
import {Public, Roles, resolveCtxUser, toRpc} from "@nebula/grpc-auth"
import {MediaService} from "../media.service"
import {media} from "@nebula/protos"

@Controller()
export class MediaGrpcController {
  private readonly log = new Logger(MediaGrpcController.name)
  constructor(private readonly svc: MediaService) {}

  @Public()
  @GrpcMethod("MediaService", "Ping")
  async ping(_: media.Empty): Promise<media.Pong> {
    return media.Pong.create({message: "pong"})
  }

  // admin/root-admin (panel writes)
  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "Create")
  async create(req: media.CreateReq, meta: Metadata, call: any): Promise<media.MediaRes> {
    const ctx = resolveCtxUser(meta, call)
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context")

    const created = await this.svc.create({
      storage: req.storage?.trim() ? req.storage.trim() : "local",
      bucket: req.bucket?.trim() ? req.bucket.trim() : null,

      path: req.path?.trim() ?? "",
      filename: req.filename?.trim() ?? "",
      mimeType: req.mimeType?.trim() ?? "",

      // keep as numeric string; service parses to Number()
      sizeBytes: req.sizeBytes?.trim() ? Number(req.sizeBytes.trim()) : 0,

      // 0 means "unset" in proto land -> store null
      width: req.width && req.width > 0 ? req.width : null,
      height: req.height && req.height > 0 ? req.height : null,
      durationSec: req.durationSec && req.durationSec > 0 ? req.durationSec : null,

      ownerId: req.ownerId?.trim() ? req.ownerId.trim() : (ctx.userId ?? null),
      visibility: req.visibility?.trim() ? req.visibility.trim() : "private",
      scope: req.scope?.trim() ? req.scope.trim() : "panel",

      sha256: req.sha256?.trim() ? req.sha256.trim() : null,
    } as any)

    this.log.debug(`[MediaService] Create id=${created.id} filename=${created.filename}`)
    return media.MediaRes.create({media: toProtoMedia(created)})
  }

  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "GetById")
  async getById(req: media.GetByIdReq, meta: Metadata, call: any): Promise<media.MediaRes> {
    const ctx = resolveCtxUser(meta, call)
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context")

    const row = await this.svc.getById(req.id)
    return media.MediaRes.create({media: toProtoMedia(row)})
  }

  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "List")
  async list(req: media.ListReq, meta: Metadata, call: any): Promise<media.ListRes> {
    const ctx = resolveCtxUser(meta, call)
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context")

    const items = await this.svc.list({
      q: req.q ?? "",
      take: req.take ?? 50,
      skip: req.skip ?? 0,
      ownerId: req.ownerId?.trim() ? req.ownerId.trim() : undefined,
      visibility: req.visibility?.trim() ? req.visibility.trim() : undefined,
      scope: req.scope?.trim() ? req.scope.trim() : undefined,
    } as any)

    return media.ListRes.create({items: items.map(toProtoMedia)})
  }

  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "DeleteById")
  async deleteById(req: media.DeleteByIdReq, meta: Metadata, call: any): Promise<media.DeleteRes> {
    const ctx = resolveCtxUser(meta, call)
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context")

    const deleted = await this.svc.deleteById(req.id)
    this.log.debug(`[MediaService] DeleteById id=${req.id} -> ${deleted}`)
    return media.DeleteRes.create({deleted})
  }

  // admin/root-admin (panel writes)
  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "PresignUpload")
  async presignUpload(req: media.PresignUploadReq, meta: Metadata, call: any): Promise<media.PresignUploadRes> {
    const ctx = resolveCtxUser(meta, call)
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context")

    const out = await this.svc.presignUpload({
      filename: req.filename?.trim() ?? "",
      mimeType: req.mimeType?.trim() ?? "",
      ownerId: req.ownerId?.trim() ? req.ownerId.trim() : (ctx.userId ?? undefined),
      visibility: req.visibility?.trim() ? req.visibility.trim() : "private",
      scope: req.scope?.trim() ? req.scope.trim() : "panel",
    } as any)

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
      scope: out.scope ?? "panel",
    })
  }

  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "FinalizeUpload")
  async finalizeUpload(req: media.FinalizeUploadReq, meta: Metadata, call: any): Promise<media.MediaRes> {
    const ctx = resolveCtxUser(meta, call)
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context")

    const created = await this.svc.finalizeUpload({
      storage: req.storage?.trim() ? req.storage.trim() : "s3",
      bucket: req.bucket?.trim() ? req.bucket.trim() : undefined,
      path: req.path?.trim() ?? "",

      filename: req.filename?.trim() || undefined,
      mimeType: req.mimeType?.trim() || undefined,
      visibility: req.visibility?.trim() || undefined,
      scope: req.scope?.trim() || undefined,

      // if not provided, default to ctx user
      ownerId: req.ownerId?.trim() ? req.ownerId.trim() : (ctx.userId ?? null),
      sha256: req.sha256?.trim() ? req.sha256.trim() : null,
    } as any)

    return media.MediaRes.create({media: toProtoMedia(created)})
  }
}

// Prisma -> Proto mapper (safe + explicit)
function toProtoMedia(row: any): media.Media {
  return media.Media.create({
    id: row.id,

    storage: row.storage ?? "local",
    bucket: row.bucket ?? "",
    path: row.path ?? "",
    filename: row.filename ?? "",
    mimeType: row.mimeType ?? "",
    sizeBytes: (row.sizeBytes ?? 0).toString(),

    width: row.width ?? 0,
    height: row.height ?? 0,
    durationSec: row.durationSec ?? 0,

    ownerId: row.ownerId ?? "",
    visibility: row.visibility ?? "private",
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
  })
}
