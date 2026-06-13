import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { CreateMediaDto, ListMediaDto, PresignUploadDto } from "./dto";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  AccessClass as PrismaAccessClass,
  MediaStatus,
  Prisma,
  ScanStatus,
} from "../prisma/generated";

const SAFE_FILENAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
const SAFE_FOLDER_SEGMENT = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
function safeTrim(value: string): string;
function safeTrim<T>(value: T): T;
function safeTrim(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}
// Keep this tight for now. Expand later (video/* etc) when streaming work starts.
const ALLOWED_PRESIGN_MIME = new Set([
  "image/webp",
  "image/jpeg",
  "image/png",
  "image/gif",
]);

type AccessClass = PrismaAccessClass;

type ActorContext = {
  actorUserId?: string | null;
  actorRole?: string | null;
};

export type OwnerScopedInput = ActorContext & {
  ownerId?: string | null;
};

export type CreateMediaInput = CreateMediaDto &
  OwnerScopedInput & {
    accessClass?: string | null;
    folderPath?: string | null;
    displayName?: string | null;
    originalFilename?: string | null;
  };

export type PresignUploadInput = PresignUploadDto &
  OwnerScopedInput & {
    accessClass?: string | null;
    folderPath?: string | null;
    displayName?: string | null;
  };

export type FinalizeUploadInput = OwnerScopedInput & {
  storage?: string;
  bucket?: string;
  path: string;
  folderPath?: string | null;
  displayName?: string | null;
  originalFilename?: string | null;
  filename?: string;
  mimeType?: string;
  visibility?: string;
  accessClass?: string;
  scope?: string;
  sha256?: string | null;
};

export type CreateReadUrlInput = ActorContext & {
  download?: boolean;
};

const ACCESS_CLASS_SET = new Set<AccessClass>(Object.values(PrismaAccessClass));
const MEDIA_STATUS_SET = new Set<string>(Object.values(MediaStatus));
const SCAN_STATUS_SET = new Set<string>(Object.values(ScanStatus));

@Injectable()
export class MediaService {
  private readonly log = new Logger(MediaService.name);
  constructor(private prisma: PrismaService) {}
  private internalS3?: S3Client;
  private publicS3?: S3Client;

  private enforceOwnerForWrite(input: OwnerScopedInput): string {
    const actorUserId = input.actorUserId ?? null;
    const actorRole = input.actorRole ?? null;
    const requestedOwnerId = input.ownerId ?? null;

    if (!actorUserId) throw new BadRequestException("missing_actor_user_id");

    if (!requestedOwnerId) return actorUserId;

    if (actorRole === "admin" || actorRole === "root-admin")
      return requestedOwnerId;

    return actorUserId;
  }

  private readBooleanEnv(name: string, fallback: boolean): boolean {
    const value = process.env[name];
    if (value === undefined) return fallback;
    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  }

  private readNumberEnv(name: string, fallback: number): number {
    const raw = Number(process.env[name]);
    return Number.isFinite(raw) && raw > 0 ? raw : fallback;
  }

  private getS3Config(endpoint: string) {
    if (process.env.MEDIA_STORAGE_DRIVER !== "s3") {
      throw new Error("MEDIA_STORAGE_DRIVER_not_s3");
    }

    const region = process.env.MEDIA_S3_REGION || "local";
    const accessKeyId = process.env.MEDIA_S3_ACCESS_KEY;
    const secretAccessKey = process.env.MEDIA_S3_SECRET_KEY;
    const forcePathStyle = this.readBooleanEnv(
      "MEDIA_S3_FORCE_PATH_STYLE",
      true,
    );

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error("MEDIA_S3_env_missing");
    }

    return {
      region,
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle,
    };
  }

  private getInternalS3() {
    if (this.internalS3) return this.internalS3;

    const endpoint =
      process.env.MEDIA_S3_INTERNAL_ENDPOINT ?? process.env.MEDIA_S3_ENDPOINT;
    if (!endpoint) throw new Error("MEDIA_S3_INTERNAL_ENDPOINT_missing");

    this.internalS3 = new S3Client(this.getS3Config(endpoint));
    return this.internalS3;
  }

  private getPublicSigningS3() {
    if (this.publicS3) return this.publicS3;

    const endpoint =
      process.env.MEDIA_S3_PUBLIC_ENDPOINT ??
      process.env.MEDIA_S3_INTERNAL_ENDPOINT ??
      process.env.MEDIA_S3_ENDPOINT;
    if (!endpoint) throw new Error("MEDIA_S3_PUBLIC_ENDPOINT_missing");

    this.publicS3 = new S3Client(this.getS3Config(endpoint));
    return this.publicS3;
  }

  private normalizeAccessClass(input?: string | null): AccessClass | undefined {
    const raw = safeTrim(input);
    if (!raw) return undefined;

    const upper = String(raw).toUpperCase();
    if (ACCESS_CLASS_SET.has(upper as AccessClass)) return upper as AccessClass;

    return undefined;
  }

  private resolveAccessClass(
    input?: string | null,
    visibility?: string | null,
  ): AccessClass {
    const normalized = this.normalizeAccessClass(input);
    if (normalized) return normalized;

    const vis = safeTrim(visibility)?.toLowerCase();
    if (vis === "public") return "PUBLIC";
    if (vis === "private") return "PROTECTED";

    return "PROTECTED";
  }

  private visibilityFromAccessClass(
    accessClass: AccessClass,
  ): "public" | "private" {
    return accessClass === "PUBLIC" ? "public" : "private";
  }

  private normalizeFolderRoot(value: string): string {
    const trimmed = value.trim().replace(/\/+$/g, "");

    if (
      !trimmed ||
      trimmed.startsWith("/") ||
      trimmed.includes("\\") ||
      trimmed.includes("//")
    ) {
      throw new Error("MEDIA_FOLDER_ROOT_invalid");
    }

    const segments = trimmed.split("/");
    if (
      segments.some(
        (segment) =>
          segment === "." ||
          segment === ".." ||
          !SAFE_FOLDER_SEGMENT.test(segment),
      )
    ) {
      throw new Error("MEDIA_FOLDER_ROOT_invalid");
    }

    return trimmed;
  }

  private getFolderRoot(name: string, fallback: string): string {
    return this.normalizeFolderRoot(process.env[name] ?? fallback);
  }

  private normalizeFilemanagerFolderPath(value?: string | null): string {
    const raw = safeTrim(value ?? "") || "";
    const stripped = raw === "/" ? "" : raw.replace(/^\/+|\/+$/g, "");

    if (!stripped) return "/";

    if (stripped.includes("\\") || stripped.includes("//")) {
      throw new BadRequestException("folderPath is not safe");
    }

    const publicRoot = this.getFolderRoot("MEDIA_PUBLIC_FOLDER", "uploads");
    if (stripped === publicRoot || stripped.startsWith(`${publicRoot}/`)) {
      throw new BadRequestException(
        "folderPath must be relative to MEDIA_PUBLIC_FOLDER",
      );
    }

    const segments = stripped.split("/");
    if (
      segments.some(
        (segment) =>
          segment === "." ||
          segment === ".." ||
          !SAFE_FOLDER_SEGMENT.test(segment),
      )
    ) {
      throw new BadRequestException("folderPath is not safe");
    }

    return `/${segments.join("/")}`;
  }

  private resolveDisplayName(filename: string, displayName?: string | null) {
    const resolved = safeTrim(displayName ?? "") || filename;
    if (!SAFE_FILENAME.test(resolved)) {
      throw new BadRequestException("displayName is not safe");
    }

    return resolved;
  }

  private createPublicLibraryKey(
    filename: string,
    folderPath?: string | null,
    displayName?: string | null,
  ) {
    const root = this.getFolderRoot("MEDIA_PUBLIC_FOLDER", "uploads");
    const normalizedFolderPath =
      this.normalizeFilemanagerFolderPath(folderPath);
    const resolvedDisplayName = this.resolveDisplayName(filename, displayName);
    const folderPrefix =
      normalizedFolderPath === "/" ? "" : `${normalizedFolderPath.slice(1)}/`;

    return {
      path: `${root}/${folderPrefix}${resolvedDisplayName}`,
      folderPath: normalizedFolderPath,
      displayName: resolvedDisplayName,
      originalFilename: filename,
    };
  }

  private derivePublicLibraryMetadata(
    path: string,
    filename: string,
    folderPath?: string | null,
    displayName?: string | null,
    originalFilename?: string | null,
  ) {
    if (folderPath !== undefined || displayName !== undefined) {
      return {
        folderPath: this.normalizeFilemanagerFolderPath(folderPath),
        displayName: this.resolveDisplayName(filename, displayName ?? filename),
        originalFilename: originalFilename ?? filename,
      };
    }

    const root = this.getFolderRoot("MEDIA_PUBLIC_FOLDER", "uploads");
    const prefix = `${root}/`;
    if (!path.startsWith(prefix)) {
      return {
        folderPath: "/",
        displayName: this.resolveDisplayName(filename, filename),
        originalFilename: originalFilename ?? filename,
      };
    }

    const relative = path.slice(prefix.length);
    const parts = relative.split("/").filter(Boolean);
    const resolvedDisplayName = parts.pop() ?? filename;
    const resolvedFolderPath = parts.length ? `/${parts.join("/")}` : "/";

    return {
      folderPath: this.normalizeFilemanagerFolderPath(resolvedFolderPath),
      displayName: this.resolveDisplayName(filename, resolvedDisplayName),
      originalFilename: originalFilename ?? filename,
    };
  }

  private resolveFilemanagerAccessClass(
    input?: string | null,
    visibility?: string | null,
  ): AccessClass {
    const normalized = this.normalizeAccessClass(input);
    const vis = safeTrim(visibility)?.toLowerCase();

    if (normalized && normalized !== "PUBLIC") {
      throw new BadRequestException("filemanager_uploads_must_be_public");
    }

    if (vis && vis !== "public") {
      throw new BadRequestException("filemanager_uploads_must_be_public");
    }

    return "PUBLIC";
  }

  // Legacy (kept)
  async create(dto: CreateMediaInput) {
    const filename = safeTrim(dto.filename);
    if (!SAFE_FILENAME.test(filename))
      throw new BadRequestException("filename is not safe");

    const path = safeTrim(dto.path);
    const mimeType = safeTrim(dto.mimeType);

    if (!path) throw new BadRequestException("path is required");
    if (!mimeType) throw new BadRequestException("mimeType is required");

    const folderPath = this.normalizeFilemanagerFolderPath(dto.folderPath);
    const displayName = this.resolveDisplayName(
      filename,
      dto.displayName ?? filename,
    );

    const sizeBytes = dto.sizeBytes;
    if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
      throw new BadRequestException("sizeBytes invalid");
    }

    const accessClass = this.resolveAccessClass(
      dto.accessClass,
      dto.visibility,
    );
    const visibility = this.visibilityFromAccessClass(accessClass);
    const data: Prisma.MediaCreateInput = {
      storage: dto.storage ?? "local",
      bucket: dto.bucket ?? null,
      path,
      filename,
      folderPath,
      displayName,
      originalFilename: dto.originalFilename ?? filename,
      mimeType,
      sizeBytes,

      width: dto.width ?? null,
      height: dto.height ?? null,
      durationSec: dto.durationSec ?? null,

      ownerId: this.enforceOwnerForWrite({
        actorUserId: dto.actorUserId ?? null,
        actorRole: dto.actorRole ?? null,
        ownerId: dto.ownerId ?? null,
      }),
      visibility,
      accessClass,
      scope: dto.scope ?? "panel",

      sha256: dto.sha256 ?? null,

      status: MediaStatus.READY,
      scanStatus: ScanStatus.CLEAN,
      quarantineReason: null,
      etag: null,
      promotedAt: new Date(),
    };

    return this.prisma.media.create({ data });
  }

  async getById(id: string) {
    const row = await this.prisma.media.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("media_not_found");
    return row;
  }

  async list(dto: ListMediaDto) {
    const take = Math.min(Math.max(dto.take ?? 50, 1), 200);
    const skip = Math.max(dto.skip ?? 0, 0);
    const q = (dto.q ?? "").trim();

    const accessClass = this.normalizeAccessClass(dto.accessClass);
    const folderPath =
      dto.folderPath === undefined
        ? undefined
        : this.normalizeFilemanagerFolderPath(dto.folderPath);

    const where: Prisma.MediaWhereInput = {
      ...(dto.ownerId ? { ownerId: dto.ownerId } : {}),
      ...(dto.visibility ? { visibility: dto.visibility } : {}),
      ...(dto.scope ? { scope: dto.scope } : {}),
      ...(accessClass ? { accessClass } : {}),
      ...(folderPath ? { folderPath } : {}),
      ...(q
        ? {
            OR: [
              { filename: { contains: q, mode: "insensitive" } },
              { displayName: { contains: q, mode: "insensitive" } },
              { originalFilename: { contains: q, mode: "insensitive" } },
              { path: { contains: q, mode: "insensitive" } },
              { mimeType: { contains: q, mode: "insensitive" } },
              { sha256: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    // Only apply if/when Prisma model has these columns
    if (dto.status && MEDIA_STATUS_SET.has(dto.status)) {
      where.status = dto.status as MediaStatus;
    }

    if (dto.scanStatus && SCAN_STATUS_SET.has(dto.scanStatus)) {
      where.scanStatus = dto.scanStatus as ScanStatus;
    }

    return this.prisma.media.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
    });
  }

  // Filemanager presign creates a public-library object key.
  async presignUpload(b: PresignUploadInput) {
    const bucket = process.env.MEDIA_S3_BUCKET || "media";
    const scope = b.scope ?? "panel";
    const accessClass = this.resolveFilemanagerAccessClass(
      b.accessClass,
      b.visibility,
    );
    const visibility = this.visibilityFromAccessClass(accessClass);

    const filename = safeTrim(b.filename);
    if (!filename || !SAFE_FILENAME.test(filename)) {
      throw new BadRequestException("filename is not safe");
    }

    const mimeType = safeTrim(b.mimeType);
    if (!mimeType) throw new BadRequestException("mimeType is required");

    // Tight allowlist for now
    if (!ALLOWED_PRESIGN_MIME.has(mimeType)) {
      throw new BadRequestException("mimeType_not_allowed");
    }

    this.enforceOwnerForWrite({
      actorUserId: b.actorUserId ?? null,
      actorRole: b.actorRole ?? null,
      ownerId: b.ownerId ?? null,
    });

    // Filemanager uploads are public-library objects. Sensitive uploads use a
    // separate feature-owned endpoint so storage keys do not mix policy lanes.
    const libraryObject = this.createPublicLibraryKey(
      filename,
      b.folderPath,
      b.displayName,
    );

    const client = this.getPublicSigningS3();
    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: libraryObject.path,
      ContentType: mimeType,
    });

    const expiresIn = this.readNumberEnv(
      "MEDIA_SIGNED_UPLOAD_TTL_SECONDS",
      600,
    );
    const uploadUrl = await getSignedUrl(client, cmd, { expiresIn });

    return {
      storage: "s3",
      bucket,
      path: libraryObject.path,
      folderPath: libraryObject.folderPath,
      displayName: libraryObject.displayName,
      originalFilename: libraryObject.originalFilename,
      mimeType,
      filename,
      visibility,
      accessClass,
      scope,
      uploadUrl,
      expiresIn,
    };
  }

  // Phase 2: FinalizeUpload verifies object exists and writes DB row with trusted size/mime.
  async finalizeUpload(input: FinalizeUploadInput) {
    const storage = input.storage ?? "s3";
    if (storage !== "s3")
      throw new BadRequestException("storage_not_supported");

    const bucket = input.bucket ?? (process.env.MEDIA_S3_BUCKET || "media");
    const path = safeTrim(input.path);
    if (!path) throw new BadRequestException("path is required");

    const filename = safeTrim(input.filename ?? "upload.bin");
    if (!SAFE_FILENAME.test(filename))
      throw new BadRequestException("filename is not safe");

    const libraryMetadata = this.derivePublicLibraryMetadata(
      path,
      filename,
      input.folderPath,
      input.displayName,
      input.originalFilename,
    );

    const client = this.getInternalS3();

    // Trust storage metadata (not client)
    const head = await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: path,
      }),
    );

    const sizeBytes = Number(head.ContentLength ?? 0);
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      throw new BadRequestException("upload_not_found_or_empty");
    }

    const mimeType = (
      head.ContentType ??
      safeTrim(input.mimeType) ??
      ""
    ).trim();
    if (!mimeType) throw new BadRequestException("mimeType_missing");

    // Optional: enforce allowlist here too
    if (!ALLOWED_PRESIGN_MIME.has(mimeType)) {
      throw new BadRequestException("mimeType_not_allowed");
    }

    const accessClass = this.resolveAccessClass(
      input.accessClass,
      input.visibility,
    );
    const visibility = this.visibilityFromAccessClass(accessClass);
    const scope = safeTrim(input.scope) || "panel";

    const etag =
      typeof head.ETag === "string" ? head.ETag.replaceAll('"', "") : null;

    // Create DB row as PENDING until scan/promotion pipeline runs
    const data: Prisma.MediaCreateInput = {
      storage: "s3",
      bucket,
      path,
      filename,
      folderPath: libraryMetadata.folderPath,
      displayName: libraryMetadata.displayName,
      originalFilename: libraryMetadata.originalFilename,
      mimeType,
      sizeBytes,

      ownerId: this.enforceOwnerForWrite({
        actorUserId: input.actorUserId ?? null,
        actorRole: input.actorRole ?? null,
        ownerId: input.ownerId ?? null,
      }),
      visibility,
      accessClass,
      scope,

      sha256: input.sha256 ?? null,

      status: MediaStatus.PENDING,
      scanStatus: ScanStatus.QUEUED,
      quarantineReason: null,
      etag,
      promotedAt: null,
    };

    return this.prisma.media.create({ data });
  }

  async createReadUrl(id: string, input: CreateReadUrlInput) {
    const row = await this.getById(id);

    if (row.storage !== "s3") {
      throw new BadRequestException("storage_not_supported");
    }

    if (
      row.status === MediaStatus.BLOCKED ||
      row.status === MediaStatus.DELETED
    ) {
      throw new ForbiddenException("media_not_available");
    }

    const actorUserId = input.actorUserId ?? null;
    const actorRole = input.actorRole ?? null;
    const isAdmin = actorRole === "admin" || actorRole === "root-admin";
    const isOwner = !!row.ownerId && row.ownerId === actorUserId;

    if (row.accessClass !== "PUBLIC" && !isAdmin && !isOwner) {
      throw new ForbiddenException("media_access_denied");
    }

    const expiresIn =
      row.accessClass === "STRICT"
        ? this.readNumberEnv("MEDIA_STRICT_READ_TTL_SECONDS", 30)
        : this.readNumberEnv("MEDIA_SIGNED_READ_TTL_SECONDS", 300);

    const cmd = new GetObjectCommand({
      Bucket: row.bucket ?? process.env.MEDIA_S3_BUCKET ?? "media",
      Key: row.path,
      ...(input.download
        ? {
            ResponseContentDisposition: `attachment; filename="${row.filename}"`,
          }
        : {}),
    });

    const url = await getSignedUrl(this.getPublicSigningS3(), cmd, {
      expiresIn,
    });

    return {
      url,
      expiresIn,
      accessClass: row.accessClass,
      filename: row.filename,
      mimeType: row.mimeType,
    };
  }

  async deleteById(id: string) {
    const row = await this.prisma.media.findUnique({ where: { id } });
    if (!row) return false;

    if (row.storage === "s3" && row.path) {
      try {
        await this.getInternalS3().send(
          new DeleteObjectCommand({
            Bucket: row.bucket ?? process.env.MEDIA_S3_BUCKET ?? "media",
            Key: row.path,
          }),
        );
      } catch (error) {
        this.log.error(`deleteObject failed id=${id} path=${row.path}`, error);
        throw error;
      }
    }

    await this.prisma.media.delete({ where: { id } });
    return true;
  }
}
