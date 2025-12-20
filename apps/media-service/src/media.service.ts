import {Injectable, BadRequestException, Logger, NotFoundException} from "@nestjs/common"
import {PrismaService} from "./prisma.service"
import {CreateMediaDto, ListMediaDto, PresignUploadDto} from "./dto"
import {S3Client, PutObjectCommand, HeadObjectCommand} from "@aws-sdk/client-s3"
import {getSignedUrl} from "@aws-sdk/s3-request-presigner"
import {randomUUID} from "crypto"

const SAFE_FILENAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/
const safeTrim = (s: any) => (typeof s === "string" ? s.trim() : s)

// Keep this tight for now. Expand later (video/* etc) when streaming work starts.
const ALLOWED_PRESIGN_MIME = new Set(["image/webp", "image/jpeg", "image/png", "image/gif"])

@Injectable()
export class MediaService {
  private readonly log = new Logger(MediaService.name)
  constructor(private prisma: PrismaService) {}
  private s3?: S3Client

  private getS3() {
    if (this.s3) return this.s3

    if (process.env.MEDIA_STORAGE_DRIVER !== "s3") {
      throw new Error("MEDIA_STORAGE_DRIVER_not_s3")
    }

    const endpoint = process.env.MEDIA_S3_ENDPOINT
    const region = process.env.MEDIA_S3_REGION || "local"
    const accessKeyId = process.env.MEDIA_S3_ACCESS_KEY
    const secretAccessKey = process.env.MEDIA_S3_SECRET_KEY

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error("MEDIA_S3_env_missing")
    }

    this.s3 = new S3Client({
      region,
      endpoint,
      credentials: {accessKeyId, secretAccessKey},
      forcePathStyle: true,
    })

    return this.s3
  }

  // Legacy (kept)
  async create(dto: CreateMediaDto) {
    const filename = safeTrim(dto.filename)
    if (!SAFE_FILENAME.test(filename)) throw new BadRequestException("filename is not safe")

    const path = safeTrim(dto.path)
    const mimeType = safeTrim(dto.mimeType)

    if (!path) throw new BadRequestException("path is required")
    if (!mimeType) throw new BadRequestException("mimeType is required")

    const sizeBytes = dto.sizeBytes
    if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
      throw new BadRequestException("sizeBytes invalid")
    }

    return this.prisma.media.create({
      data: {
        storage: dto.storage ?? "local",
        bucket: dto.bucket ?? null,
        path,
        filename,
        mimeType,
        sizeBytes,

        width: dto.width ?? null,
        height: dto.height ?? null,
        durationSec: dto.durationSec ?? null,

        ownerId: dto.ownerId ?? null,
        visibility: dto.visibility ?? "private",
        scope: dto.scope ?? "panel",

        sha256: dto.sha256 ?? null,

        // NEW lifecycle defaults (add to prisma model in Phase 3 if not already)
        status: "READY",
        scanStatus: "CLEAN",
        quarantineReason: null,
        etag: null,
        promotedAt: new Date(),
      } as any,
    })
  }

  async getById(id: string) {
    const row = await this.prisma.media.findUnique({where: {id}})
    if (!row) throw new NotFoundException("media_not_found")
    return row
  }

  async list(dto: ListMediaDto) {
    const take = Math.min(Math.max(dto.take ?? 50, 1), 200)
    const skip = Math.max(dto.skip ?? 0, 0)
    const q = (dto.q ?? "").trim()

    const where: any = {
      ...(dto.ownerId ? {ownerId: dto.ownerId} : {}),
      ...(dto.visibility ? {visibility: dto.visibility} : {}),
      ...(dto.scope ? {scope: dto.scope} : {}),
      ...(q
        ? {
            OR: [{filename: {contains: q, mode: "insensitive"}}, {path: {contains: q, mode: "insensitive"}}, {mimeType: {contains: q, mode: "insensitive"}}, {sha256: {contains: q, mode: "insensitive"}}],
          }
        : {}),
    }

    // Only apply if/when Prisma model has these columns
    if (dto.status) where.status = dto.status
    if (dto.scanStatus) where.scanStatus = dto.scanStatus

    return this.prisma.media.findMany({
      where,
      orderBy: {createdAt: "desc"},
      take,
      skip,
    })
  }

  async deleteById(id: string) {
    try {
      await this.prisma.media.delete({where: {id}})
      return true
    } catch (e: any) {
      if (e?.code === "P2025") return false
      this.log.error(`deleteById failed id=${id}`, e?.meta ?? e)
      throw e
    }
  }

  // Phase 2: presign creates a *pending* object key.
  async presignUpload(b: PresignUploadDto) {
    const bucket = process.env.MEDIA_S3_BUCKET || "media"
    const scope = b.scope ?? "panel"
    const visibility = (b.visibility ?? "private") as "private" | "public"

    const filename = safeTrim(b.filename)
    if (!filename || !SAFE_FILENAME.test(filename)) {
      throw new BadRequestException("filename is not safe")
    }

    const mimeType = safeTrim(b.mimeType)
    if (!mimeType) throw new BadRequestException("mimeType is required")

    // Tight allowlist for now
    if (!ALLOWED_PRESIGN_MIME.has(mimeType)) {
      throw new BadRequestException("mimeType_not_allowed")
    }

    // object key
    const ext = filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : ""
    const id = randomUUID()

    // IMPORTANT: upload into a pending prefix (scan/promotion later)
    const path = `${scope}/${visibility}/pending/${id}${ext ? "." + ext : ""}`

    const client = this.getS3()
    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: path,
      ContentType: mimeType,
    })

    const expiresIn = 600
    const uploadUrl = await getSignedUrl(client, cmd, {expiresIn})

    return {
      storage: "s3",
      bucket,
      path,
      mimeType,
      filename,
      visibility,
      scope,
      uploadUrl,
      expiresIn,
    }
  }

  // Phase 2: FinalizeUpload verifies object exists and writes DB row with trusted size/mime.
  async finalizeUpload(input: {storage?: string; bucket?: string; path: string; filename?: string; mimeType?: string; visibility?: string; scope?: string; ownerId?: string | null; sha256?: string | null}) {
    const storage = input.storage ?? "s3"
    if (storage !== "s3") throw new BadRequestException("storage_not_supported")

    const bucket = input.bucket ?? (process.env.MEDIA_S3_BUCKET || "media")
    const path = safeTrim(input.path)
    if (!path) throw new BadRequestException("path is required")

    const filename = safeTrim(input.filename ?? "upload.bin")
    if (!SAFE_FILENAME.test(filename)) throw new BadRequestException("filename is not safe")

    const client = this.getS3()

    // Trust storage metadata (not client)
    const head = await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: path,
      })
    )

    const sizeBytes = Number(head.ContentLength ?? 0)
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      throw new BadRequestException("upload_not_found_or_empty")
    }

    const mimeType = (head.ContentType ?? safeTrim(input.mimeType) ?? "").trim()
    if (!mimeType) throw new BadRequestException("mimeType_missing")

    // Optional: enforce allowlist here too
    if (!ALLOWED_PRESIGN_MIME.has(mimeType)) {
      throw new BadRequestException("mimeType_not_allowed")
    }

    const visibility = (safeTrim(input.visibility) || "private") as "private" | "public"
    const scope = safeTrim(input.scope) || "panel"

    const etag = typeof head.ETag === "string" ? head.ETag.replaceAll('"', "") : null

    // Create DB row as PENDING until scan/promotion pipeline runs
    return this.prisma.media.create({
      data: {
        storage: "s3",
        bucket,
        path,
        filename,
        mimeType,
        sizeBytes,

        ownerId: input.ownerId ?? null,
        visibility,
        scope,

        sha256: input.sha256 ?? null,

        status: "PENDING",
        scanStatus: "QUEUED",
        quarantineReason: null,
        etag,
        promotedAt: null,
      } as any,
    })
  }
}
