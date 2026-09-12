import { Controller, Logger, UsePipes } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { Metadata, status } from "@grpc/grpc-js";
import {
  type CreateMediaInput,
  type FinalizeUploadInput,
  MediaService,
  type PresignUploadInput,
} from "../media.service";
import type { Media as MediaRecord } from "../../prisma/generated";
import {
  createGrpcValidationPipe,
  DormantS2SAuthorizationV3Receiver,
  Public,
  Roles,
  resolveCtxUser,
  toRpc,
} from "@nebula/grpc-auth";
import { media } from "@nebula/protos";
import {
  ListMediaDto,
  MyProtectedReadUrlGrpcDto,
  PublicLibraryDeleteConfirmDto,
  PublicLibraryDeletePreviewDto,
} from "../dto";

type GrpcPresignOutput = {
  storage?: string | null;
  bucket?: string | null;
  path?: string | null;
  uploadUrl?: string | null;
  expiresIn?: number | null;
  filename?: string | null;
  mimeType?: string | null;
  visibility?: string | null;
  accessClass?: string | null;
  scope?: string | null;
  folderPath?: string | null;
  displayName?: string | null;
  originalFilename?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  ownerId?: string | null;
};

const Pipe = createGrpcValidationPipe();

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

  private listInput(
    req: Partial<Omit<media.ListReq, "$type">>,
    ctx: { userId?: string | null; role?: string },
    overrides: Partial<ListMediaDto> = {},
  ): ListMediaDto {
    return {
      q: req.q ?? "",
      take: req.take ?? 50,
      skip: req.skip ?? 0,
      ownerId:
        overrides.ownerId ??
        (req.ownerId?.trim()
          ? (this.resolveOwnerId(ctx, req.ownerId) ?? undefined)
          : undefined),
      accessClass:
        overrides.accessClass ??
        (req.accessClass?.trim() ? req.accessClass.trim() : undefined),
      visibility:
        overrides.visibility ??
        (req.visibility?.trim() ? req.visibility.trim() : undefined),
      scope:
        overrides.scope ?? (req.scope?.trim() ? req.scope.trim() : undefined),
      entityType:
        overrides.entityType ??
        (req.entityType?.trim() ? req.entityType.trim() : undefined),
      entityId:
        overrides.entityId ??
        (req.entityId?.trim() ? req.entityId.trim() : undefined),
      folderPath:
        overrides.folderPath ??
        (req.folderPath?.trim() ? req.folderPath.trim() : undefined),
      status:
        overrides.status ??
        (req.status?.trim() ? req.status.trim() : undefined),
      scanStatus:
        overrides.scanStatus ??
        (req.scanStatus?.trim() ? req.scanStatus.trim() : undefined),
      search:
        overrides.search ??
        (req.search?.trim() ? req.search.trim() : undefined),
      path: overrides.path ?? (req.path?.trim() ? req.path.trim() : undefined),
      mimeType:
        overrides.mimeType ??
        (req.mimeType?.trim() ? req.mimeType.trim() : undefined),
      mediaType:
        overrides.mediaType ??
        (req.mediaType?.trim() ? req.mediaType.trim() : undefined),
      sortBy:
        overrides.sortBy ??
        (req.sortBy?.trim() ? req.sortBy.trim() : undefined),
      order:
        overrides.order ?? (req.order?.trim() ? req.order.trim() : undefined),
    };
  }

  private presignInput(
    req: media.PresignUploadReq,
    ctx: { userId?: string | null; role?: string },
    overrides: Partial<PresignUploadInput> = {},
  ): PresignUploadInput {
    return {
      filename: req.filename?.trim() ?? "",
      mimeType: req.mimeType?.trim() ?? "",
      actorUserId: ctx.userId ?? null,
      actorRole: ctx.role ?? null,
      ownerId:
        overrides.ownerId ?? this.resolveOwnerId(ctx, req.ownerId) ?? undefined,
      accessClass:
        overrides.accessClass ??
        (req.accessClass?.trim() ? req.accessClass.trim() : undefined),
      visibility:
        overrides.visibility ??
        (req.visibility?.trim() ? req.visibility.trim() : undefined),
      scope:
        overrides.scope ?? (req.scope?.trim() ? req.scope.trim() : "panel"),
      folderPath:
        overrides.folderPath ??
        (req.folderPath?.trim() ? req.folderPath.trim() : undefined),
      displayName:
        overrides.displayName ??
        (req.displayName?.trim() ? req.displayName.trim() : undefined),
      entityType:
        overrides.entityType ??
        (req.entityType?.trim() ? req.entityType.trim() : undefined),
      entityId:
        overrides.entityId ??
        (req.entityId?.trim() ? req.entityId.trim() : undefined),
    };
  }

  private finalizeInput(
    req: media.FinalizeUploadReq,
    ctx: { userId?: string | null; role?: string },
    overrides: Partial<FinalizeUploadInput> = {},
  ): FinalizeUploadInput {
    return {
      storage: req.storage?.trim() ? req.storage.trim() : "s3",
      bucket: req.bucket?.trim() ? req.bucket.trim() : undefined,
      path: req.path?.trim() ?? "",
      folderPath:
        overrides.folderPath ??
        (req.folderPath?.trim() ? req.folderPath.trim() : undefined),
      displayName:
        overrides.displayName ??
        (req.displayName?.trim() ? req.displayName.trim() : undefined),
      originalFilename: req.originalFilename?.trim()
        ? req.originalFilename.trim()
        : undefined,
      filename: req.filename?.trim() || undefined,
      mimeType: req.mimeType?.trim() || undefined,
      visibility:
        overrides.visibility ??
        (req.visibility?.trim() ? req.visibility.trim() : undefined),
      accessClass:
        overrides.accessClass ??
        (req.accessClass?.trim() ? req.accessClass.trim() : undefined),
      scope: overrides.scope ?? (req.scope?.trim() || undefined),
      actorUserId: ctx.userId ?? null,
      actorRole: ctx.role ?? null,
      ownerId: overrides.ownerId ?? this.resolveOwnerId(ctx, req.ownerId),
      sha256: req.sha256?.trim() ? req.sha256.trim() : null,
      entityType:
        overrides.entityType ??
        (req.entityType?.trim() ? req.entityType.trim() : undefined),
      entityId:
        overrides.entityId ??
        (req.entityId?.trim() ? req.entityId.trim() : undefined),
    };
  }

  private presignResponse(out: GrpcPresignOutput) {
    return media.PresignUploadRes.create({
      storage: out.storage ?? "s3",
      bucket: out.bucket ?? "",
      path: out.path ?? "",
      uploadUrl: out.uploadUrl ?? "",
      expiresIn: out.expiresIn ?? 600,

      filename: out.filename ?? "",
      mimeType: out.mimeType ?? "",
      visibility: out.visibility ?? "private",
      accessClass: out.accessClass ?? "PUBLIC",
      scope: out.scope ?? "panel",
      folderPath: out.folderPath ?? "/",
      displayName: out.displayName ?? "",
      originalFilename: out.originalFilename ?? "",
      entityType: out.entityType ?? "",
      entityId: out.entityId ?? "",
      ownerId: out.ownerId ?? "",
    });
  }

  private readUrlResponse(
    out: Awaited<ReturnType<MediaService["createReadUrl"]>>,
  ) {
    return media.ReadUrlRes.create({
      url: out.url,
      expiresIn: out.expiresIn,
      accessClass: out.accessClass,
      filename: out.filename,
      mimeType: out.mimeType,
    });
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
      entityType: req.entityType?.trim() ? req.entityType.trim() : undefined,
      entityId: req.entityId?.trim() ? req.entityId.trim() : undefined,
      sha256: req.sha256?.trim() ? req.sha256.trim() : null,
    };

    const created = await this.svc.create(input);

    this.log.debug(`media_created id=${created.id}`);
    return media.MediaRes.create({ media: toProtoMedia(created) });
  }

  @DormantS2SAuthorizationV3Receiver("MediaService", "GetByIdV3")
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

    const input = this.listInput(req, ctx);

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
    this.log.debug(`media_deleted id=${req.id} deleted=${deleted}`);
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

    const input = this.presignInput(req, ctx);

    const out = await this.svc.presignUpload(input);

    return this.presignResponse(out);
  }

  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "FinalizeUpload")
  async finalizeUpload(
    req: media.FinalizeUploadReq,
    meta: Metadata,
  ): Promise<media.MediaRes> {
    const ctx = resolveCtxUser(meta);
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context");

    const input = this.finalizeInput(req, ctx);

    const created = await this.svc.finalizeUpload(input);

    return media.MediaRes.create({ media: toProtoMedia(created) });
  }

  @DormantS2SAuthorizationV3Receiver("MediaService", "ListPublicLibraryV3")
  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "ListPublicLibrary")
  async listPublicLibrary(
    req: media.ListReq,
    meta: Metadata,
  ): Promise<media.ListRes> {
    const ctx = resolveCtxUser(meta);
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context");

    const out = await this.svc.browsePublicFilemanager(
      this.listInput(req, ctx, {
        accessClass: "PUBLIC",
        visibility: "public",
      }),
    );

    return media.ListRes.create({ items: out.files.map(toProtoMedia) });
  }

  @DormantS2SAuthorizationV3Receiver("MediaService", "ListProtectedLibraryV3")
  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "ListProtectedLibrary")
  async listProtectedLibrary(
    req: media.ListReq,
    meta: Metadata,
  ): Promise<media.ListRes> {
    const ctx = resolveCtxUser(meta);
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context");

    const out = await this.svc.browseProtectedFilemanager(
      this.listInput(req, ctx, {
        ownerId: this.resolveOwnerId(ctx, req.ownerId) ?? undefined,
        accessClass: "PROTECTED",
        visibility: "private",
      }),
    );

    return media.ListRes.create({ items: out.files.map(toProtoMedia) });
  }

  @DormantS2SAuthorizationV3Receiver("MediaService", "ListStrictLibraryV3")
  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "ListStrictLibrary")
  async listStrictLibrary(
    req: media.ListReq,
    meta: Metadata,
  ): Promise<media.ListRes> {
    const ctx = resolveCtxUser(meta);
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context");

    const out = await this.svc.browseStrictFilemanager(
      this.listInput(req, ctx, {
        ownerId: this.resolveOwnerId(ctx, req.ownerId) ?? undefined,
        accessClass: "STRICT",
        visibility: "private",
      }),
    );

    return media.ListRes.create({ items: out.files.map(toProtoMedia) });
  }

  @DormantS2SAuthorizationV3Receiver("MediaService", "ListMyProtectedLibraryV3")
  @UsePipes(Pipe)
  @Roles("user", "admin", "root-admin")
  @GrpcMethod("MediaService", "ListMyProtectedLibrary")
  async listMyProtectedLibrary(
    req: ListMediaDto,
    meta: Metadata,
  ): Promise<media.ListRes> {
    const ctx = resolveCtxUser(meta);
    if (!ctx?.userId)
      throw toRpc(status.UNAUTHENTICATED, "Missing user context");

    const out = await this.svc.browseProtectedFilemanager(
      this.listInput(req, ctx, {
        ownerId: ctx.userId,
        accessClass: "PROTECTED",
        visibility: "private",
      }),
    );
    return media.ListRes.create({ items: out.files.map(toProtoMedia) });
  }

  @DormantS2SAuthorizationV3Receiver(
    "MediaService",
    "PresignPublicLibraryUploadV3",
  )
  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "PresignPublicLibraryUpload")
  async presignPublicLibraryUpload(
    req: media.PresignUploadReq,
    meta: Metadata,
  ): Promise<media.PresignUploadRes> {
    const ctx = resolveCtxUser(meta);
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context");

    const out = await this.svc.presignUpload(
      this.presignInput(req, ctx, {
        accessClass: "PUBLIC",
        visibility: "public",
      }),
    );
    return this.presignResponse(out);
  }

  @DormantS2SAuthorizationV3Receiver(
    "MediaService",
    "PresignProtectedLibraryUploadV3",
  )
  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "PresignProtectedLibraryUpload")
  async presignProtectedLibraryUpload(
    req: media.PresignUploadReq,
    meta: Metadata,
  ): Promise<media.PresignUploadRes> {
    const ctx = resolveCtxUser(meta);
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context");

    const out = await this.svc.presignProtectedLibraryUpload(
      this.presignInput(req, ctx, {
        accessClass: "PROTECTED",
        visibility: "private",
      }),
    );
    return this.presignResponse(out);
  }

  @DormantS2SAuthorizationV3Receiver(
    "MediaService",
    "PresignStrictLibraryUploadV3",
  )
  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "PresignStrictLibraryUpload")
  async presignStrictLibraryUpload(
    req: media.PresignUploadReq,
    meta: Metadata,
  ): Promise<media.PresignUploadRes> {
    const ctx = resolveCtxUser(meta);
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context");

    const out = await this.svc.presignStrictLibraryUpload(
      this.presignInput(req, ctx, {
        accessClass: "STRICT",
        visibility: "private",
      }),
    );
    return this.presignResponse(out);
  }

  @DormantS2SAuthorizationV3Receiver(
    "MediaService",
    "FinalizePublicLibraryUploadV3",
  )
  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "FinalizePublicLibraryUpload")
  async finalizePublicLibraryUpload(
    req: media.FinalizeUploadReq,
    meta: Metadata,
  ): Promise<media.MediaRes> {
    const ctx = resolveCtxUser(meta);
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context");

    const created = await this.svc.finalizeUpload(
      this.finalizeInput(req, ctx, {
        accessClass: "PUBLIC",
        visibility: "public",
      }),
    );
    return media.MediaRes.create({ media: toProtoMedia(created) });
  }

  @DormantS2SAuthorizationV3Receiver(
    "MediaService",
    "FinalizeProtectedLibraryUploadV3",
  )
  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "FinalizeProtectedLibraryUpload")
  async finalizeProtectedLibraryUpload(
    req: media.FinalizeUploadReq,
    meta: Metadata,
  ): Promise<media.MediaRes> {
    const ctx = resolveCtxUser(meta);
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context");

    const created = await this.svc.finalizeUpload(
      this.finalizeInput(req, ctx, {
        accessClass: "PROTECTED",
        visibility: "private",
      }),
    );
    return media.MediaRes.create({ media: toProtoMedia(created) });
  }

  @DormantS2SAuthorizationV3Receiver(
    "MediaService",
    "FinalizeStrictLibraryUploadV3",
  )
  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "FinalizeStrictLibraryUpload")
  async finalizeStrictLibraryUpload(
    req: media.FinalizeUploadReq,
    meta: Metadata,
  ): Promise<media.MediaRes> {
    const ctx = resolveCtxUser(meta);
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context");

    const created = await this.svc.finalizeUpload(
      this.finalizeInput(req, ctx, {
        accessClass: "STRICT",
        visibility: "private",
      }),
    );
    return media.MediaRes.create({ media: toProtoMedia(created) });
  }

  @DormantS2SAuthorizationV3Receiver(
    "MediaService",
    "CreatePublicLibraryReadUrlV3",
  )
  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "CreatePublicLibraryReadUrl")
  async createPublicLibraryReadUrl(
    req: media.ReadUrlReq,
    meta: Metadata,
  ): Promise<media.ReadUrlRes> {
    const ctx = resolveCtxUser(meta);
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context");

    const out = await this.svc.createPublicLibraryReadUrl(req.id, {
      actorUserId: ctx.userId ?? null,
      actorRole: ctx.role ?? null,
      download: req.download,
    });
    return this.readUrlResponse(out);
  }

  @DormantS2SAuthorizationV3Receiver(
    "MediaService",
    "CreateProtectedLibraryReadUrlV3",
  )
  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "CreateProtectedLibraryReadUrl")
  async createProtectedLibraryReadUrl(
    req: media.ReadUrlReq,
    meta: Metadata,
  ): Promise<media.ReadUrlRes> {
    const ctx = resolveCtxUser(meta);
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context");

    const out = await this.svc.createProtectedLibraryReadUrl(req.id, {
      actorUserId: ctx.userId ?? null,
      actorRole: ctx.role ?? null,
      download: req.download,
    });
    return this.readUrlResponse(out);
  }

  @DormantS2SAuthorizationV3Receiver(
    "MediaService",
    "CreateStrictLibraryReadUrlV3",
  )
  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "CreateStrictLibraryReadUrl")
  async createStrictLibraryReadUrl(
    req: media.ReadUrlReq,
    meta: Metadata,
  ): Promise<media.ReadUrlRes> {
    const ctx = resolveCtxUser(meta);
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context");

    const out = await this.svc.createStrictLibraryReadUrl(req.id, {
      actorUserId: ctx.userId ?? null,
      actorRole: ctx.role ?? null,
      download: req.download,
    });
    return this.readUrlResponse(out);
  }

  @DormantS2SAuthorizationV3Receiver(
    "MediaService",
    "CreateMyProtectedReadUrlV3",
  )
  @UsePipes(Pipe)
  @Roles("user", "admin", "root-admin")
  @GrpcMethod("MediaService", "CreateMyProtectedReadUrl")
  async createMyProtectedReadUrl(
    req: MyProtectedReadUrlGrpcDto,
    meta: Metadata,
  ): Promise<media.ReadUrlRes> {
    const ctx = resolveCtxUser(meta);
    if (!ctx?.userId)
      throw toRpc(status.UNAUTHENTICATED, "Missing user context");

    const out = await this.svc.createProtectedFeatureReadUrl(req.id, {
      ownerId: ctx.userId,
      actorUserId: ctx.userId,
      actorRole: ctx.role ?? null,
      scope: req.scope,
      entityType: req.entityType,
      entityId: req.entityId,
      download: req.download,
    });
    return this.readUrlResponse(out);
  }

  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "DeletePublicLibraryById")
  async deletePublicLibraryById(
    req: media.DeleteByIdReq,
    meta: Metadata,
  ): Promise<media.DeleteRes> {
    const ctx = resolveCtxUser(meta);
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context");

    const deleted = await this.svc.deletePublicLibraryById(req.id);
    return media.DeleteRes.create({ deleted });
  }

  @DormantS2SAuthorizationV3Receiver(
    "MediaService",
    "DeleteProtectedLibraryByIdV3",
  )
  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "DeleteProtectedLibraryById")
  async deleteProtectedLibraryById(
    req: media.DeleteByIdReq,
    meta: Metadata,
  ): Promise<media.DeleteRes> {
    const ctx = resolveCtxUser(meta);
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context");

    const deleted = await this.svc.deleteProtectedLibraryById(req.id);
    return media.DeleteRes.create({ deleted });
  }

  @DormantS2SAuthorizationV3Receiver(
    "MediaService",
    "DeleteStrictLibraryByIdV3",
  )
  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "DeleteStrictLibraryById")
  async deleteStrictLibraryById(
    req: media.DeleteByIdReq,
    meta: Metadata,
  ): Promise<media.DeleteRes> {
    const ctx = resolveCtxUser(meta);
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context");

    const deleted = await this.svc.deleteStrictLibraryById(req.id);
    return media.DeleteRes.create({ deleted });
  }

  @DormantS2SAuthorizationV3Receiver(
    "MediaService",
    "PreviewPublicLibraryDeleteV3",
  )
  @UsePipes(Pipe)
  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "PreviewPublicLibraryDelete")
  async previewPublicLibraryDelete(
    req: PublicLibraryDeletePreviewDto,
    meta: Metadata,
  ): Promise<media.PreviewPublicLibraryDeleteRes> {
    const ctx = resolveCtxUser(meta);
    if (!ctx?.userId)
      throw toRpc(status.UNAUTHENTICATED, "Missing user context");

    const out = await this.svc.previewPublicLibraryDelete({
      ...req,
      actorUserId: ctx.userId,
      actorRole: ctx.role ?? null,
    });
    return media.PreviewPublicLibraryDeleteRes.create({
      scope: out.scope,
      recursive: out.recursive,
      canDelete: out.canDelete,
      warnings: out.warnings.map((warning) => ({
        code: warning.code,
        folderPath: warning.folderPath ?? "",
        fileCount: warning.fileCount ?? 0,
        limit: warning.limit ?? 0,
      })),
      fileCount: out.fileCount,
      folderCount: out.folderCount,
      totalSizeBytes: out.totalSizeBytes.toString(),
      folders: out.folders.map((folder) => ({
        type: folder.type,
        folderPath: folder.folderPath,
        fileCount: folder.fileCount,
      })),
      files: out.files.map((file) => ({
        type: file.type,
        id: file.id,
        folderPath: file.folderPath,
        displayName: file.displayName,
        path: file.path,
        sizeBytes: file.sizeBytes.toString(),
        mimeType: file.mimeType,
      })),
      confirmToken:
        "confirmToken" in out && typeof out.confirmToken === "string"
          ? out.confirmToken
          : "",
      expiresIn:
        "expiresIn" in out && typeof out.expiresIn === "number"
          ? out.expiresIn
          : 0,
    });
  }

  @DormantS2SAuthorizationV3Receiver(
    "MediaService",
    "ConfirmPublicLibraryDeleteV3",
  )
  @UsePipes(Pipe)
  @Roles("admin", "root-admin")
  @GrpcMethod("MediaService", "ConfirmPublicLibraryDelete")
  async confirmPublicLibraryDelete(
    req: PublicLibraryDeleteConfirmDto,
    meta: Metadata,
  ): Promise<media.ConfirmPublicLibraryDeleteRes> {
    const ctx = resolveCtxUser(meta);
    if (!ctx?.userId)
      throw toRpc(status.UNAUTHENTICATED, "Missing user context");

    const out = await this.svc.confirmPublicLibraryDelete({
      ...req,
      actorUserId: ctx.userId,
      actorRole: ctx.role ?? null,
    });
    return media.ConfirmPublicLibraryDeleteRes.create({
      deleted: out.deleted,
      fileCount: out.fileCount,
      folderCount: out.folderCount,
      totalSizeBytes: out.totalSizeBytes.toString(),
    });
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
    entityType: row.entityType ?? "",
    entityId: row.entityId ?? "",

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
