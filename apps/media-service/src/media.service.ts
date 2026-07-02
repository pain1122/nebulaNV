import {Injectable, BadRequestException, Logger, NotFoundException, ForbiddenException} from "@nestjs/common"
import {PrismaService} from "./prisma.service"
import {CreateMediaDto, ListMediaDto, PresignUploadDto} from "./dto"
import {S3Client, PutObjectCommand, HeadObjectCommand, HeadBucketCommand, GetObjectCommand, DeleteObjectCommand} from "@aws-sdk/client-s3"
import {getSignedUrl} from "@aws-sdk/s3-request-presigner"
import {AccessClass as PrismaAccessClass, type Media, MediaStatus, Prisma, ScanStatus} from "../prisma/generated"
import {createHmac, randomUUID, timingSafeEqual} from "node:crypto"
import type {Readable} from "node:stream"

const SAFE_FILENAME = /^[a-zA-Z0-9][a-zA-Z0-9._()\-]*$/
const SAFE_FOLDER_SEGMENT = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/
const SAFE_CONTEXT_VALUE = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/
const OPAQUE_KEY_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function safeTrim(value: string): string
function safeTrim<T>(value: T): T
function safeTrim(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value
}
// Keep this tight for now. Expand later (video/* etc) when streaming work starts.
const ALLOWED_PRESIGN_MIME = new Set(["image/webp", "image/jpeg", "image/png", "image/gif"])

type AccessClass = PrismaAccessClass
type SensitiveAccessClass = "PROTECTED" | "STRICT"

type ActorContext = {
  actorUserId?: string | null
  actorRole?: string | null
}

export type OwnerScopedInput = ActorContext & {
  ownerId?: string | null
}

export type CreateMediaInput = CreateMediaDto &
  OwnerScopedInput & {
    accessClass?: string | null
    folderPath?: string | null
    displayName?: string | null
    originalFilename?: string | null
    entityType?: string | null
    entityId?: string | null
  }

export type PresignUploadInput = PresignUploadDto &
  OwnerScopedInput & {
    accessClass?: string | null
    folderPath?: string | null
    displayName?: string | null
    entityType?: string | null
    entityId?: string | null
  }

export type FinalizeUploadInput = OwnerScopedInput & {
  storage?: string
  bucket?: string
  path: string
  folderPath?: string | null
  displayName?: string | null
  originalFilename?: string | null
  filename?: string
  mimeType?: string
  visibility?: string
  accessClass?: string
  scope?: string
  entityType?: string | null
  entityId?: string | null
  sha256?: string | null
}

export type CreateReadUrlInput = ActorContext & {
  download?: boolean
}

export type FeatureReadUrlInput = CreateReadUrlInput & {
  ownerId?: string | null
  scope?: string
  entityType?: string
  entityId?: string
}

export type CreateRenderInput = {
  variant?: string | null
}

export type PublicRenderObject = {
  stream: Readable
  mimeType: string
  sizeBytes: number
  filename: string
  etag: string | null
  cacheControl: string
  contentDisposition: string
}

export type PublicLibraryDeleteInput = ActorContext & {
  items: Array<{
    type: "file" | "folder"
    id?: string | null
    folderPath?: string | null
  }>
  recursive?: boolean | null
  scope?: string | null
}

export type PublicLibraryDeleteConfirmInput = PublicLibraryDeleteInput & {
  confirmToken: string
}

type BrowseFolderEntry = {
  id: null
  type: "folder"
  name: string
  path: string
  folderPath: string
  metadata: null
}

type BrowseFileEntry = Media & {
  type: "file"
  name: string
  metadata: {
    size: number
    mimetype: string
  }
}

type PublicLibraryDeleteTokenShape = {
  actorUserId: string
  actorRole: string
  scope: string
  recursive: boolean
  requestedFileIds: string[]
  requestedFolderPaths: string[]
  planFileIds: string[]
  fileCount: number
  folderCount: number
  totalSizeBytes: number
}

type PublicLibraryDeleteTokenPayload = PublicLibraryDeleteTokenShape & {
  v: 1
  exp: number
}

const ACCESS_CLASS_SET = new Set<AccessClass>(Object.values(PrismaAccessClass))
const MEDIA_STATUS_SET = new Set<string>(Object.values(MediaStatus))
const SCAN_STATUS_SET = new Set<string>(Object.values(ScanStatus))

@Injectable()
export class MediaService {
  private readonly log = new Logger(MediaService.name)
  constructor(private prisma: PrismaService) {}
  private internalS3?: S3Client
  private publicS3?: S3Client

  private enforceOwnerForWrite(input: OwnerScopedInput): string {
    const actorUserId = input.actorUserId ?? null
    const actorRole = input.actorRole ?? null
    const requestedOwnerId = input.ownerId ?? null

    if (!actorUserId) throw new BadRequestException("missing_actor_user_id")

    if (!requestedOwnerId) return actorUserId

    if (actorRole === "admin" || actorRole === "root-admin") return requestedOwnerId

    return actorUserId
  }

  private readBooleanEnv(name: string, fallback: boolean): boolean {
    const value = process.env[name]
    if (value === undefined) return fallback
    return ["1", "true", "yes", "on"].includes(value.toLowerCase())
  }

  private readNumberEnv(name: string, fallback: number): number {
    const raw = Number(process.env[name])
    return Number.isFinite(raw) && raw > 0 ? raw : fallback
  }

  private getS3Config(endpoint: string) {
    if (process.env.MEDIA_STORAGE_DRIVER !== "s3") {
      throw new Error("MEDIA_STORAGE_DRIVER_not_s3")
    }

    const region = process.env.MEDIA_S3_REGION || "local"
    const accessKeyId = process.env.MEDIA_S3_ACCESS_KEY
    const secretAccessKey = process.env.MEDIA_S3_SECRET_KEY
    const forcePathStyle = this.readBooleanEnv("MEDIA_S3_FORCE_PATH_STYLE", true)

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error("MEDIA_S3_env_missing")
    }

    return {
      region,
      endpoint,
      credentials: {accessKeyId, secretAccessKey},
      forcePathStyle,
    }
  }

  private getInternalS3() {
    if (this.internalS3) return this.internalS3

    const endpoint = process.env.MEDIA_S3_INTERNAL_ENDPOINT ?? process.env.MEDIA_S3_ENDPOINT
    if (!endpoint) throw new Error("MEDIA_S3_INTERNAL_ENDPOINT_missing")

    this.internalS3 = new S3Client(this.getS3Config(endpoint))
    return this.internalS3
  }

  private getPublicSigningS3() {
    if (this.publicS3) return this.publicS3

    const endpoint = process.env.MEDIA_S3_PUBLIC_ENDPOINT ?? process.env.MEDIA_S3_INTERNAL_ENDPOINT ?? process.env.MEDIA_S3_ENDPOINT
    if (!endpoint) throw new Error("MEDIA_S3_PUBLIC_ENDPOINT_missing")

    this.publicS3 = new S3Client(this.getS3Config(endpoint))
    return this.publicS3
  }

  async checkStorageHealth() {
    const driver = process.env.MEDIA_STORAGE_DRIVER ?? "s3"
    if (driver !== "s3") {
      return {status: "skipped" as const, driver}
    }

    const bucket = process.env.MEDIA_S3_BUCKET || "media"
    await this.getInternalS3().send(new HeadBucketCommand({Bucket: bucket}))

    return {
      status: "ok" as const,
      driver,
      provider: process.env.MEDIA_STORAGE_PROVIDER ?? "s3",
      bucket,
    }
  }

  private normalizeAccessClass(input?: string | null): AccessClass | undefined {
    const raw = safeTrim(input)
    if (!raw) return undefined

    const upper = String(raw).toUpperCase()
    if (ACCESS_CLASS_SET.has(upper as AccessClass)) return upper as AccessClass

    return undefined
  }

  private resolveAccessClass(input?: string | null, visibility?: string | null): AccessClass {
    const normalized = this.normalizeAccessClass(input)
    if (normalized) return normalized

    const vis = safeTrim(visibility)?.toLowerCase()
    if (vis === "public") return "PUBLIC"
    if (vis === "private") return "PROTECTED"

    return "PROTECTED"
  }

  private visibilityFromAccessClass(accessClass: AccessClass): "public" | "private" {
    return accessClass === "PUBLIC" ? "public" : "private"
  }

  private normalizeScope(value?: string | null): string {
    const scope = safeTrim(value ?? "") || "panel"
    if (!SAFE_CONTEXT_VALUE.test(scope)) {
      throw new BadRequestException("scope is not safe")
    }

    return scope
  }

  private normalizeContextValue(value: string | null | undefined, fieldName: "entityType" | "entityId"): string | null {
    const normalized = safeTrim(value ?? "") || ""
    if (!normalized) return null

    if (!SAFE_CONTEXT_VALUE.test(normalized)) {
      throw new BadRequestException(`${fieldName} is not safe`)
    }

    return normalized
  }

  private resolveMediaContext(input: Pick<CreateMediaInput | PresignUploadInput | FinalizeUploadInput | ListMediaDto, "scope" | "entityType" | "entityId">, accessClass: AccessClass, requireSensitiveContext = true) {
    const scope = this.normalizeScope(input.scope)
    const entityType = this.normalizeContextValue(input.entityType, "entityType")
    const entityId = this.normalizeContextValue(input.entityId, "entityId")

    if ((entityType && !entityId) || (!entityType && entityId)) {
      throw new BadRequestException("media_context_incomplete")
    }

    if (requireSensitiveContext && accessClass !== "PUBLIC" && (!safeTrim(input.scope ?? "") || !entityType || !entityId)) {
      throw new BadRequestException("sensitive_media_requires_context")
    }

    return {scope, entityType, entityId}
  }

  private normalizeFolderRoot(value: string): string {
    const trimmed = value.trim().replace(/\/+$/g, "")

    if (!trimmed || trimmed.startsWith("/") || trimmed.includes("\\") || trimmed.includes("//")) {
      throw new Error("MEDIA_FOLDER_ROOT_invalid")
    }

    const segments = trimmed.split("/")
    if (segments.some((segment) => segment === "." || segment === ".." || !SAFE_FOLDER_SEGMENT.test(segment))) {
      throw new Error("MEDIA_FOLDER_ROOT_invalid")
    }

    return trimmed
  }

  private getFolderRoot(name: string, fallback: string): string {
    return this.normalizeFolderRoot(process.env[name] ?? fallback)
  }

  private normalizeFilemanagerFolderPath(value?: string | null): string {
    const raw = safeTrim(value ?? "") || ""
    const stripped = raw === "/" ? "" : raw.replace(/^\/+|\/+$/g, "")

    if (!stripped) return "/"

    if (stripped.includes("\\") || stripped.includes("//")) {
      throw new BadRequestException("folderPath is not safe")
    }

    const publicRoot = this.getFolderRoot("MEDIA_PUBLIC_FOLDER", "uploads")
    if (stripped === publicRoot || stripped.startsWith(`${publicRoot}/`)) {
      throw new BadRequestException("folderPath must be relative to MEDIA_PUBLIC_FOLDER")
    }

    const segments = stripped.split("/")
    if (segments.some((segment) => segment === "." || segment === ".." || !SAFE_FOLDER_SEGMENT.test(segment))) {
      throw new BadRequestException("folderPath is not safe")
    }

    return `/${segments.join("/")}`
  }

  private normalizeBrowseFolderPath(value?: string | null): string {
    const raw = safeTrim(value ?? "") || ""
    let stripped = raw === "/" ? "" : raw.replace(/^\/+|\/+$/g, "")
    const publicRoot = this.getFolderRoot("MEDIA_PUBLIC_FOLDER", "uploads")

    if (stripped === publicRoot) return "/"
    if (stripped.startsWith(`${publicRoot}/`)) {
      stripped = stripped.slice(publicRoot.length + 1)
    }

    return this.normalizeFilemanagerFolderPath(stripped)
  }

  private toBrowsePath(folderPath: string): string {
    return folderPath === "/" ? "" : folderPath.slice(1)
  }

  private childFolderName(parentFolderPath: string, candidateFolderPath: string): string | null {
    if (candidateFolderPath === parentFolderPath) return null

    const relative = parentFolderPath === "/" ? candidateFolderPath.replace(/^\/+/, "") : candidateFolderPath.startsWith(`${parentFolderPath}/`) ? candidateFolderPath.slice(parentFolderPath.length + 1) : ""

    const child = relative.split("/").filter(Boolean)[0]
    return child || null
  }

  private buildSearchWhere(search: string): Prisma.MediaWhereInput | undefined {
    if (!search) return undefined

    return {
      OR: [{filename: {contains: search, mode: "insensitive"}}, {displayName: {contains: search, mode: "insensitive"}}, {originalFilename: {contains: search, mode: "insensitive"}}, {path: {contains: search, mode: "insensitive"}}, {mimeType: {contains: search, mode: "insensitive"}}, {sha256: {contains: search, mode: "insensitive"}}],
    }
  }

  private buildMediaTypeWhere(mediaType?: string): Prisma.MediaWhereInput | undefined {
    if (!mediaType) return undefined

    if (mediaType === "image" || mediaType === "video" || mediaType === "audio") {
      return {mimeType: {startsWith: `${mediaType}/`}}
    }

    if (mediaType === "document") {
      return {
        OR: [{mimeType: "application/pdf"}, {mimeType: {startsWith: "text/"}}, {mimeType: {contains: "msword", mode: "insensitive"}}, {mimeType: {contains: "officedocument", mode: "insensitive"}}],
      }
    }

    return undefined
  }

  private buildBrowseFileOrder(sortBy?: string, order?: string): Prisma.MediaOrderByWithRelationInput {
    const direction = order === "desc" ? "desc" : "asc"

    if (sortBy === "createdAt") return {createdAt: direction}
    if (sortBy === "updatedAt") return {updatedAt: direction}
    if (sortBy === "size") return {sizeBytes: direction}
    return {displayName: direction}
  }

  private createBrowseFolderEntry(parentFolderPath: string, name: string): BrowseFolderEntry {
    const folderPath = parentFolderPath === "/" ? `/${name}` : `${parentFolderPath}/${name}`

    return {
      id: null,
      type: "folder",
      name,
      path: this.toBrowsePath(folderPath),
      folderPath,
      metadata: null,
    }
  }

  private createBrowseFileEntry(row: Media): BrowseFileEntry {
    return {
      ...row,
      type: "file",
      name: row.displayName || row.filename,
      metadata: {
        size: row.sizeBytes,
        mimetype: row.mimeType,
      },
    }
  }

  private resolveDisplayName(filename: string, displayName?: string | null) {
    const resolved = safeTrim(displayName ?? "") || filename
    if (!SAFE_FILENAME.test(resolved)) {
      throw new BadRequestException("displayName is not safe")
    }

    return resolved
  }

  private createSensitiveStorageKey(): string {
    return `${this.getFolderRoot("MEDIA_PRIVATE_FOLDER", "private/objects")}/${randomUUID()}`
  }

  private createStrictSafeFilename(filename: string): string {
    const {extension} = this.splitDisplayName(filename)
    return this.resolveDisplayName(filename, `strict-${randomUUID()}${extension || ".bin"}`)
  }

  private createSensitiveLibraryObject(filename: string, accessClass: SensitiveAccessClass, displayName?: string | null) {
    if (accessClass === "STRICT") {
      const safeFilename = this.createStrictSafeFilename(filename)

      return {
        path: this.createSensitiveStorageKey(),
        folderPath: "/",
        displayName: safeFilename,
        originalFilename: null,
        filename: safeFilename,
      }
    }

    return {
      path: this.createSensitiveStorageKey(),
      folderPath: "/",
      displayName: this.resolveDisplayName(filename, displayName ?? filename),
      originalFilename: filename,
      filename,
    }
  }

  private deriveSensitiveLibraryMetadata(accessClass: SensitiveAccessClass, filename: string, displayName?: string | null, originalFilename?: string | null) {
    if (accessClass === "STRICT") {
      const safeFilename = this.createStrictSafeFilename(filename)

      return {
        filename: safeFilename,
        folderPath: "/",
        displayName: safeFilename,
        originalFilename: null,
      }
    }

    return {
      filename,
      folderPath: "/",
      displayName: this.resolveDisplayName(filename, displayName ?? filename),
      originalFilename: originalFilename ?? filename,
    }
  }

  private isUnderFolderRoot(path: string, envName: string, fallback: string): boolean {
    const root = this.getFolderRoot(envName, fallback)
    return path === root || path.startsWith(`${root}/`)
  }

  private enforceFinalizeStorageLane(path: string, accessClass: AccessClass, input: Pick<FinalizeUploadInput, "folderPath" | "displayName">): void {
    const isPublicPath = this.isUnderFolderRoot(path, "MEDIA_PUBLIC_FOLDER", "uploads")

    if (accessClass === "PUBLIC") {
      if (!isPublicPath) {
        throw new BadRequestException("public_uploads_must_use_public_folder")
      }
      return
    }

    if (isPublicPath || (input.folderPath !== undefined && input.folderPath !== "/")) {
      throw new BadRequestException("sensitive_uploads_must_use_opaque_keys")
    }

    const privateRoot = this.getFolderRoot("MEDIA_PRIVATE_FOLDER", "private/objects")
    const opaqueSegment = path.split("/").pop() ?? ""
    const expectedPrivatePath = `${privateRoot}/${opaqueSegment}`

    if (isPublicPath || path !== expectedPrivatePath || !OPAQUE_KEY_SEGMENT.test(opaqueSegment) || (input.folderPath !== undefined && input.folderPath !== "/")) {
      throw new BadRequestException("sensitive_uploads_must_use_opaque_keys")
    }
  }

  private createPublicLibraryKey(filename: string, folderPath?: string | null, displayName?: string | null) {
    const root = this.getFolderRoot("MEDIA_PUBLIC_FOLDER", "uploads")
    const normalizedFolderPath = this.normalizeFilemanagerFolderPath(folderPath)
    const resolvedDisplayName = this.resolveDisplayName(filename, displayName)
    const folderPrefix = normalizedFolderPath === "/" ? "" : `${normalizedFolderPath.slice(1)}/`

    return {
      path: `${root}/${folderPrefix}${resolvedDisplayName}`,
      folderPath: normalizedFolderPath,
      displayName: resolvedDisplayName,
      originalFilename: filename,
    }
  }

  private splitDisplayName(displayName: string) {
    const dotIndex = displayName.lastIndexOf(".")
    const hasExtension = dotIndex > 0
    const base = hasExtension ? displayName.slice(0, dotIndex) : displayName
    const extension = hasExtension ? displayName.slice(dotIndex) : ""

    return {base, extension}
  }

  private createNumberedDisplayName(displayName: string, copyNumber: number): string {
    const {base, extension} = this.splitDisplayName(displayName)
    return this.resolveDisplayName(displayName, `${base}-(${copyNumber})${extension}`)
  }

  private parseNumberedDisplayName(displayName: string, requestedDisplayName: string): number | null {
    const {base, extension} = this.splitDisplayName(requestedDisplayName)
    const prefix = `${base}-(`
    const suffix = `)${extension}`

    if (!displayName.startsWith(prefix) || !displayName.endsWith(suffix)) {
      return null
    }

    const rawNumber = displayName.slice(prefix.length, displayName.length - suffix.length)
    if (!/^[1-9][0-9]*$/.test(rawNumber)) {
      return null
    }

    const copyNumber = Number(rawNumber)
    return Number.isSafeInteger(copyNumber) ? copyNumber : null
  }

  private async publicLibraryNameExists(scope: string, folderPath: string, displayName: string): Promise<boolean> {
    const existing = await this.prisma.media.findFirst({
      where: {
        accessClass: "PUBLIC",
        visibility: "public",
        scope,
        folderPath,
        displayName,
        NOT: {status: MediaStatus.DELETED},
      },
      select: {id: true},
    })

    return !!existing
  }

  private async createNextPublicLibraryKey(filename: string, folderPath: string | null | undefined, displayName: string | null | undefined, scope: string) {
    const requested = this.createPublicLibraryKey(filename, folderPath, displayName)
    const {base, extension} = this.splitDisplayName(requested.displayName)
    const numberedPrefix = `${base}-(`
    const numberedSuffix = `)${extension}`

    const [exactExists, latestVariant] = await Promise.all([
      this.publicLibraryNameExists(scope, requested.folderPath, requested.displayName),
      this.prisma.media.findFirst({
        where: {
          accessClass: "PUBLIC",
          visibility: "public",
          scope,
          folderPath: requested.folderPath,
          displayName: {
            startsWith: numberedPrefix,
            endsWith: numberedSuffix,
          },
          NOT: {status: MediaStatus.DELETED},
        },
        orderBy: {createdAt: "desc"},
        select: {displayName: true},
      }),
    ])

    const latestCopyNumber = latestVariant ? this.parseNumberedDisplayName(latestVariant.displayName, requested.displayName) : null
    if (!exactExists && latestCopyNumber === null) return requested

    const nextCopyNumber = latestCopyNumber === null ? 1 : latestCopyNumber + 1
    const nextDisplayName = this.createNumberedDisplayName(requested.displayName, nextCopyNumber)
    return this.createPublicLibraryKey(filename, requested.folderPath, nextDisplayName)
  }

  private async enforcePublicLibraryNameAvailable(scope: string, folderPath: string, displayName: string): Promise<void> {
    const exists = await this.publicLibraryNameExists(scope, folderPath, displayName)
    if (exists) throw new BadRequestException("public_library_file_already_exists")
  }

  private assertPublicLibraryMedia(row: Media): void {
    if (row.accessClass !== "PUBLIC" || row.visibility !== "public" || !this.isUnderFolderRoot(row.path, "MEDIA_PUBLIC_FOLDER", "uploads")) {
      throw new BadRequestException("not_public_library_media")
    }
  }

  private assertSensitiveLibraryMedia(row: Media, accessClass: SensitiveAccessClass): void {
    const errorCode = accessClass === "STRICT" ? "not_strict_library_media" : "not_protected_library_media"

    if (row.accessClass !== accessClass || row.visibility !== "private") {
      throw new BadRequestException(errorCode)
    }

    if (!row.ownerId || !row.scope || !row.entityType || !row.entityId) {
      throw new BadRequestException("sensitive_media_missing_context")
    }

    if (row.storage === "s3" && !this.isUnderFolderRoot(row.path, "MEDIA_PRIVATE_FOLDER", "private/objects")) {
      throw new BadRequestException(errorCode)
    }
  }

  private assertSensitiveFeatureContext(row: Media, input: FeatureReadUrlInput, accessClass: SensitiveAccessClass): void {
    this.assertSensitiveLibraryMedia(row, accessClass)

    const ownerId = safeTrim(input.ownerId ?? "") || ""
    if (!ownerId) {
      throw new BadRequestException("sensitive_media_requires_owner")
    }

    const context = this.resolveMediaContext(input, accessClass)

    if (row.ownerId !== ownerId || row.scope !== context.scope || row.entityType !== context.entityType || row.entityId !== context.entityId) {
      throw new ForbiddenException("media_context_mismatch")
    }
  }

  private publicLibraryBaseWhere(scope: string): Prisma.MediaWhereInput {
    return {
      accessClass: "PUBLIC",
      visibility: "public",
      scope,
      path: {startsWith: `${this.getFolderRoot("MEDIA_PUBLIC_FOLDER", "uploads")}/`},
      NOT: {status: MediaStatus.DELETED},
    }
  }

  private isInsideFolder(folderPath: string, candidateFolderPath: string): boolean {
    return candidateFolderPath === folderPath || candidateFolderPath.startsWith(`${folderPath}/`)
  }

  private normalizePublicDeleteSelection(input: PublicLibraryDeleteInput) {
    const scope = this.normalizeScope(input.scope)
    const recursive = input.recursive === true
    const items = Array.isArray(input.items) ? input.items : []

    if (!items.length) {
      throw new BadRequestException("delete_selection_required")
    }

    if (items.length > 250) {
      throw new BadRequestException("delete_selection_too_large")
    }

    const fileIds = new Set<string>()
    const folderPaths = new Set<string>()

    for (const item of items) {
      if (item.type === "file") {
        const id = safeTrim(item.id ?? "") || ""
        if (!id) throw new BadRequestException("delete_file_id_required")
        fileIds.add(id)
        continue
      }

      if (item.type === "folder") {
        const folderPath = this.normalizeFilemanagerFolderPath(item.folderPath)
        if (folderPath === "/") {
          throw new BadRequestException("public_library_root_delete_not_allowed")
        }
        folderPaths.add(folderPath)
        continue
      }

      throw new BadRequestException("delete_item_type_invalid")
    }

    return {
      scope,
      recursive,
      requestedFileIds: Array.from(fileIds).sort(),
      requestedFolderPaths: Array.from(folderPaths).sort(),
    }
  }

  private resolveDeleteActor(input: ActorContext) {
    const actorUserId = safeTrim(input.actorUserId ?? "") || ""
    const actorRole = safeTrim(input.actorRole ?? "") || ""

    if (!actorUserId) {
      throw new BadRequestException("missing_actor_user_id")
    }

    return {actorUserId, actorRole}
  }

  private deleteConfirmSecret(): string {
    const secret = process.env.GATEWAY_SECRET
    if (!secret) throw new Error("GATEWAY_SECRET_missing")
    return secret
  }

  private signDeletePayload(encodedPayload: string): string {
    return createHmac("sha256", this.deleteConfirmSecret()).update(encodedPayload).digest("base64url")
  }

  private createPublicLibraryDeleteToken(shape: PublicLibraryDeleteTokenShape): {confirmToken: string; expiresIn: number} {
    const expiresIn = this.readNumberEnv("MEDIA_DELETE_CONFIRM_TTL_SECONDS", 30)
    const payload: PublicLibraryDeleteTokenPayload = {
      ...shape,
      v: 1,
      exp: Math.floor(Date.now() / 1000) + expiresIn,
    }
    const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
    const signature = this.signDeletePayload(encodedPayload)

    return {
      confirmToken: `${encodedPayload}.${signature}`,
      expiresIn,
    }
  }

  private verifyPublicLibraryDeleteToken(confirmToken: string): PublicLibraryDeleteTokenPayload {
    const [encodedPayload, signature] = confirmToken.split(".")
    if (!encodedPayload || !signature) {
      throw new BadRequestException("delete_confirm_token_invalid")
    }

    const expectedSignature = this.signDeletePayload(encodedPayload)
    const signatureBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expectedSignature)
    if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
      throw new BadRequestException("delete_confirm_token_invalid")
    }

    let payload: PublicLibraryDeleteTokenPayload
    try {
      payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as PublicLibraryDeleteTokenPayload
    } catch {
      throw new BadRequestException("delete_confirm_token_invalid")
    }

    if (payload.v !== 1 || !Number.isFinite(payload.exp)) {
      throw new BadRequestException("delete_confirm_token_invalid")
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new BadRequestException("delete_confirm_token_expired")
    }

    return payload
  }

  private deleteTokenShapeFromPayload(payload: PublicLibraryDeleteTokenPayload): PublicLibraryDeleteTokenShape {
    return {
      actorUserId: payload.actorUserId,
      actorRole: payload.actorRole,
      scope: payload.scope,
      recursive: payload.recursive,
      requestedFileIds: payload.requestedFileIds,
      requestedFolderPaths: payload.requestedFolderPaths,
      planFileIds: payload.planFileIds,
      fileCount: payload.fileCount,
      folderCount: payload.folderCount,
      totalSizeBytes: payload.totalSizeBytes,
    }
  }

  private sameDeleteTokenShape(a: PublicLibraryDeleteTokenShape, b: PublicLibraryDeleteTokenShape): boolean {
    return JSON.stringify(a) === JSON.stringify(b)
  }

  private async buildPublicLibraryDeletePlan(input: PublicLibraryDeleteInput) {
    const actor = this.resolveDeleteActor(input)
    const selection = this.normalizePublicDeleteSelection(input)
    const baseWhere = this.publicLibraryBaseWhere(selection.scope)

    const [selectedFiles, folderFiles] = await Promise.all([
      selection.requestedFileIds.length
        ? this.prisma.media.findMany({
            where: {
              ...baseWhere,
              id: {in: selection.requestedFileIds},
            },
          })
        : Promise.resolve([]),
      selection.requestedFolderPaths.length
        ? this.prisma.media.findMany({
            where: {
              ...baseWhere,
              OR: selection.requestedFolderPaths.map((folderPath) => ({
                OR: [{folderPath}, {folderPath: {startsWith: `${folderPath}/`}}],
              })),
            },
          })
        : Promise.resolve([]),
    ])

    if (selectedFiles.length !== selection.requestedFileIds.length) {
      throw new BadRequestException("public_library_delete_item_not_found")
    }

    const rowById = new Map<string, Media>()
    for (const row of [...selectedFiles, ...folderFiles]) {
      this.assertPublicLibraryMedia(row)
      rowById.set(row.id, row)
    }

    const rows = Array.from(rowById.values()).sort((a, b) => {
      const folderSort = a.folderPath.localeCompare(b.folderPath)
      if (folderSort !== 0) return folderSort
      const nameSort = a.displayName.localeCompare(b.displayName)
      if (nameSort !== 0) return nameSort
      return a.id.localeCompare(b.id)
    })

    const warnings: Array<{code: string; folderPath?: string; fileCount?: number; limit?: number}> = []
    const folders = selection.requestedFolderPaths.map((folderPath) => {
      const files = rows.filter((row) => this.isInsideFolder(folderPath, row.folderPath))
      if (files.length && !selection.recursive) {
        warnings.push({
          code: "folder_not_empty_requires_recursive",
          folderPath,
          fileCount: files.length,
        })
      }

      if (files.length && selection.recursive) {
        warnings.push({
          code: "recursive_delete",
          folderPath,
          fileCount: files.length,
        })
      }

      return {
        type: "folder" as const,
        folderPath,
        fileCount: files.length,
      }
    })

    const affectedFolderPaths = new Set(selection.requestedFolderPaths)
    for (const row of rows) {
      affectedFolderPaths.add(row.folderPath)
    }

    const fileCount = rows.length
    const folderCount = affectedFolderPaths.size
    const totalSizeBytes = rows.reduce((sum, row) => sum + row.sizeBytes, 0)
    const maxSyncDeleteFiles = this.readNumberEnv("MEDIA_SYNC_DELETE_MAX_FILES", 500)
    if (fileCount > maxSyncDeleteFiles) {
      warnings.push({
        code: "delete_requires_worker_queue",
        fileCount,
        limit: maxSyncDeleteFiles,
      })
    }

    const canDelete = warnings.every((warning) => warning.code !== "folder_not_empty_requires_recursive" && warning.code !== "delete_requires_worker_queue")
    const tokenShape: PublicLibraryDeleteTokenShape = {
      actorUserId: actor.actorUserId,
      actorRole: actor.actorRole,
      scope: selection.scope,
      recursive: selection.recursive,
      requestedFileIds: selection.requestedFileIds,
      requestedFolderPaths: selection.requestedFolderPaths,
      planFileIds: rows.map((row) => row.id).sort(),
      fileCount,
      folderCount,
      totalSizeBytes,
    }

    return {
      rows,
      tokenShape,
      response: {
        scope: selection.scope,
        recursive: selection.recursive,
        canDelete,
        warnings,
        fileCount,
        folderCount,
        totalSizeBytes,
        folders,
        files: rows.map((row) => ({
          type: "file" as const,
          id: row.id,
          folderPath: row.folderPath,
          displayName: row.displayName,
          path: row.path,
          sizeBytes: row.sizeBytes,
          mimeType: row.mimeType,
        })),
      },
    }
  }

  private derivePublicLibraryMetadata(path: string, filename: string, folderPath?: string | null, displayName?: string | null, originalFilename?: string | null) {
    const root = this.getFolderRoot("MEDIA_PUBLIC_FOLDER", "uploads")
    const prefix = `${root}/`

    if (!path.startsWith(prefix)) {
      throw new BadRequestException("public_uploads_must_use_public_folder")
    }

    const relative = path.slice(prefix.length)
    const parts = relative.split("/").filter(Boolean)
    const pathDisplayName = parts.pop() ?? filename
    const pathFolderPath = parts.length ? `/${parts.join("/")}` : "/"

    const derivedFolderPath = this.normalizeFilemanagerFolderPath(pathFolderPath)
    const derivedDisplayName = this.resolveDisplayName(filename, pathDisplayName)

    if (folderPath !== undefined) {
      const requestedFolderPath = this.normalizeFilemanagerFolderPath(folderPath)

      if (requestedFolderPath !== derivedFolderPath) {
        throw new BadRequestException("public_metadata_must_match_path")
      }
    }

    if (displayName !== undefined) {
      const requestedDisplayName = this.resolveDisplayName(filename, displayName)

      if (requestedDisplayName !== derivedDisplayName) {
        throw new BadRequestException("public_metadata_must_match_path")
      }
    }

    return {
      filename,
      folderPath: derivedFolderPath,
      displayName: derivedDisplayName,
      originalFilename: originalFilename ?? filename,
    }
  }

  private resolveFilemanagerAccessClass(input?: string | null, visibility?: string | null): AccessClass {
    const normalized = this.normalizeAccessClass(input)
    const vis = safeTrim(visibility)?.toLowerCase()

    if (normalized && normalized !== "PUBLIC") {
      throw new BadRequestException("filemanager_uploads_must_be_public")
    }

    if (vis && vis !== "public") {
      throw new BadRequestException("filemanager_uploads_must_be_public")
    }

    return "PUBLIC"
  }

  // Legacy (kept)
  async create(dto: CreateMediaInput) {
    const filename = safeTrim(dto.filename)
    if (!SAFE_FILENAME.test(filename)) throw new BadRequestException("filename is not safe")

    const storage = (safeTrim(dto.storage ?? "local") || "local").toLowerCase()
    if (storage === "s3" || storage === "minio" || storage === "r2") {
      throw new BadRequestException("direct_s3_create_requires_finalize")
    }

    const path = safeTrim(dto.path)
    const mimeType = safeTrim(dto.mimeType)

    if (!path) throw new BadRequestException("path is required")
    if (!mimeType) throw new BadRequestException("mimeType is required")

    const sizeBytes = dto.sizeBytes
    if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
      throw new BadRequestException("sizeBytes invalid")
    }

    const accessClass = this.resolveAccessClass(dto.accessClass, dto.visibility)
    const visibility = this.visibilityFromAccessClass(accessClass)
    const context = this.resolveMediaContext(dto, accessClass, false)
    const libraryMetadata =
      accessClass === "PUBLIC"
        ? {
            filename,
            folderPath: this.normalizeFilemanagerFolderPath(dto.folderPath),
            displayName: this.resolveDisplayName(filename, dto.displayName ?? filename),
            originalFilename: dto.originalFilename ?? filename,
          }
        : this.deriveSensitiveLibraryMetadata(accessClass as SensitiveAccessClass, filename, dto.displayName, dto.originalFilename)
    const data: Prisma.MediaCreateInput = {
      storage,
      bucket: dto.bucket ?? null,
      path,
      filename: libraryMetadata.filename,
      folderPath: libraryMetadata.folderPath,
      displayName: libraryMetadata.displayName,
      originalFilename: libraryMetadata.originalFilename,
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
      scope: context.scope,
      entityType: context.entityType,
      entityId: context.entityId,

      sha256: dto.sha256 ?? null,

      status: MediaStatus.READY,
      scanStatus: ScanStatus.CLEAN,
      quarantineReason: null,
      etag: null,
      promotedAt: new Date(),
    }

    return this.prisma.media.create({data})
  }

  async getById(id: string) {
    const row = await this.prisma.media.findUnique({where: {id}})
    if (!row) throw new NotFoundException("media_not_found")
    return row
  }

  async getPublicLibraryById(id: string) {
    const row = await this.getById(id)
    this.assertPublicLibraryMedia(row)
    return row
  }

  async getProtectedLibraryById(id: string) {
    const row = await this.getById(id)
    this.assertSensitiveLibraryMedia(row, "PROTECTED")
    return row
  }

  async getStrictLibraryById(id: string) {
    const row = await this.getById(id)
    this.assertSensitiveLibraryMedia(row, "STRICT")
    return row
  }

  async list(dto: ListMediaDto) {
    const take = Math.min(Math.max(dto.take ?? 50, 1), 200)
    const skip = Math.max(dto.skip ?? 0, 0)
    const q = (dto.q ?? "").trim()

    const accessClass = this.normalizeAccessClass(dto.accessClass)
    const folderPath = dto.folderPath === undefined ? undefined : this.normalizeFilemanagerFolderPath(dto.folderPath)
    const entityType = this.normalizeContextValue(dto.entityType, "entityType")
    const entityId = this.normalizeContextValue(dto.entityId, "entityId")

    const where: Prisma.MediaWhereInput = {
      ...(dto.ownerId ? {ownerId: dto.ownerId} : {}),
      ...(dto.visibility ? {visibility: dto.visibility} : {}),
      ...(dto.scope ? {scope: this.normalizeScope(dto.scope)} : {}),
      ...(entityType ? {entityType} : {}),
      ...(entityId ? {entityId} : {}),
      ...(accessClass ? {accessClass} : {}),
      ...(folderPath ? {folderPath} : {}),
      ...(q
        ? {
            OR: [{filename: {contains: q, mode: "insensitive"}}, {displayName: {contains: q, mode: "insensitive"}}, {originalFilename: {contains: q, mode: "insensitive"}}, {path: {contains: q, mode: "insensitive"}}, {mimeType: {contains: q, mode: "insensitive"}}, {sha256: {contains: q, mode: "insensitive"}}],
          }
        : {}),
    }

    // Only apply if/when Prisma model has these columns
    if (dto.status && MEDIA_STATUS_SET.has(dto.status)) {
      where.status = dto.status as MediaStatus
    }

    if (dto.scanStatus && SCAN_STATUS_SET.has(dto.scanStatus)) {
      where.scanStatus = dto.scanStatus as ScanStatus
    }

    return this.prisma.media.findMany({
      where,
      orderBy: {createdAt: "desc"},
      take,
      skip,
    })
  }

  async browsePublicFilemanager(dto: ListMediaDto) {
    const take = Math.min(Math.max(dto.take ?? 50, 1), 200)
    const skip = Math.max(dto.skip ?? 0, 0)
    const search = ((dto.search ?? dto.q) || "").trim()
    const folderPath = this.normalizeBrowseFolderPath(dto.path ?? dto.folderPath)
    const requestedAccessClass = this.normalizeAccessClass(dto.accessClass)

    if (requestedAccessClass && requestedAccessClass !== "PUBLIC") {
      throw new BadRequestException("filemanager_browse_is_public_only")
    }

    if (dto.visibility && dto.visibility !== "public") {
      throw new BadRequestException("filemanager_browse_is_public_only")
    }

    const publicRoot = this.getFolderRoot("MEDIA_PUBLIC_FOLDER", "uploads")
    const baseWhere: Prisma.MediaWhereInput = {
      accessClass: "PUBLIC",
      visibility: "public",
      path: {startsWith: `${publicRoot}/`},
      ...(dto.ownerId ? {ownerId: dto.ownerId} : {}),
      ...(dto.scope ? {scope: this.normalizeScope(dto.scope)} : {}),
    }

    if (dto.status && MEDIA_STATUS_SET.has(dto.status)) {
      baseWhere.status = dto.status as MediaStatus
    }

    if (dto.scanStatus && SCAN_STATUS_SET.has(dto.scanStatus)) {
      baseWhere.scanStatus = dto.scanStatus as ScanStatus
    }

    const browseFilters: Prisma.MediaWhereInput[] = []
    const searchWhere = this.buildSearchWhere(search)
    const mediaTypeWhere = this.buildMediaTypeWhere(dto.mediaType)

    if (searchWhere) browseFilters.push(searchWhere)
    if (dto.mimeType) browseFilters.push({mimeType: dto.mimeType})
    if (mediaTypeWhere) browseFilters.push(mediaTypeWhere)

    const fileWhere: Prisma.MediaWhereInput = {
      ...baseWhere,
      folderPath,
      ...(browseFilters.length ? {AND: browseFilters} : {}),
    }

    const childPrefix = folderPath === "/" ? "/" : `${folderPath}/`
    const descendantWhere: Prisma.MediaWhereInput = {
      ...baseWhere,
      folderPath: {startsWith: childPrefix},
      NOT: {folderPath},
    }

    const fileFetchLimit = Math.min(skip + take, 500)
    const [fileRows, descendantRows] = await Promise.all([
      this.prisma.media.findMany({
        where: fileWhere,
        orderBy: this.buildBrowseFileOrder(dto.sortBy, dto.order),
        take: fileFetchLimit,
      }),
      this.prisma.media.findMany({
        where: descendantWhere,
        select: {folderPath: true},
        distinct: ["folderPath"],
        take: 5_000,
      }),
    ])

    const searchLower = search.toLowerCase()
    const folderNames = new Set<string>()

    for (const row of descendantRows) {
      const name = this.childFolderName(folderPath, row.folderPath)
      if (!name) continue
      if (searchLower && !name.toLowerCase().includes(searchLower)) continue
      folderNames.add(name)
    }

    const folderDirection = dto.order === "desc" ? -1 : 1
    const folderEntries = Array.from(folderNames)
      .sort((a, b) => a.localeCompare(b) * folderDirection)
      .map((name) => this.createBrowseFolderEntry(folderPath, name))

    const fileEntries = fileRows.map((row) => this.createBrowseFileEntry(row))
    const items = [...folderEntries, ...fileEntries].slice(skip, skip + take)
    const folders = items.filter((item) => item.type === "folder")
    const files = items.filter((item) => item.type === "file")
    const browsePath = this.toBrowsePath(folderPath)

    return {
      path: browsePath,
      folderPath,
      storagePrefix: browsePath ? `${publicRoot}/${browsePath}` : publicRoot,
      limit: take,
      offset: skip,
      folders,
      files,
      items,
    }
  }

  async browseSensitiveFilemanager(dto: ListMediaDto, accessClass: SensitiveAccessClass) {
    const take = Math.min(Math.max(dto.take ?? 50, 1), 200)
    const skip = Math.max(dto.skip ?? 0, 0)
    const search = ((dto.search ?? dto.q) || "").trim()

    if (!dto.ownerId) {
      throw new BadRequestException("sensitive_media_requires_owner")
    }

    const context = this.resolveMediaContext(dto, accessClass)
    const requestedAccessClass = this.normalizeAccessClass(dto.accessClass)
    if (requestedAccessClass && requestedAccessClass !== accessClass) {
      throw new BadRequestException("sensitive_media_lane_mismatch")
    }

    if (dto.visibility && dto.visibility !== "private") {
      throw new BadRequestException("sensitive_media_must_be_private")
    }

    const filters: Prisma.MediaWhereInput[] = []
    const searchWhere = this.buildSearchWhere(search)
    const mediaTypeWhere = this.buildMediaTypeWhere(dto.mediaType)

    if (searchWhere) filters.push(searchWhere)
    if (dto.mimeType) filters.push({mimeType: dto.mimeType})
    if (mediaTypeWhere) filters.push(mediaTypeWhere)

    const where: Prisma.MediaWhereInput = {
      ownerId: dto.ownerId,
      accessClass,
      visibility: "private",
      scope: context.scope,
      entityType: context.entityType,
      entityId: context.entityId,
      ...(filters.length ? {AND: filters} : {}),
    }

    if (dto.status && MEDIA_STATUS_SET.has(dto.status)) {
      where.status = dto.status as MediaStatus
    }

    if (dto.scanStatus && SCAN_STATUS_SET.has(dto.scanStatus)) {
      where.scanStatus = dto.scanStatus as ScanStatus
    }

    const rows = await this.prisma.media.findMany({
      where,
      orderBy: this.buildBrowseFileOrder(dto.sortBy, dto.order),
      take,
      skip,
    })

    const files = rows.map((row) => this.createBrowseFileEntry(row))

    return {
      context: {
        ownerId: dto.ownerId,
        scope: context.scope,
        entityType: context.entityType,
        entityId: context.entityId,
        accessClass,
      },
      folderPath: null,
      limit: take,
      offset: skip,
      folders: [],
      files,
      items: files,
    }
  }

  async browseProtectedFilemanager(dto: ListMediaDto) {
    return this.browseSensitiveFilemanager(dto, "PROTECTED")
  }

  async browseStrictFilemanager(dto: ListMediaDto) {
    return this.browseSensitiveFilemanager(dto, "STRICT")
  }

  // Filemanager presign creates a public-library object key.
  async presignUpload(b: PresignUploadInput) {
    const bucket = process.env.MEDIA_S3_BUCKET || "media"
    const accessClass = this.resolveFilemanagerAccessClass(b.accessClass, b.visibility)
    const visibility = this.visibilityFromAccessClass(accessClass)
    const context = this.resolveMediaContext(b, accessClass, false)
    const scope = context.scope

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

    this.enforceOwnerForWrite({
      actorUserId: b.actorUserId ?? null,
      actorRole: b.actorRole ?? null,
      ownerId: b.ownerId ?? null,
    })

    // Filemanager uploads are public-library objects. Sensitive uploads use a
    // separate feature-owned endpoint so storage keys do not mix policy lanes.
    const libraryObject = await this.createNextPublicLibraryKey(filename, b.folderPath, b.displayName, scope)

    const client = this.getPublicSigningS3()
    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: libraryObject.path,
      ContentType: mimeType,
    })

    const expiresIn = this.readNumberEnv("MEDIA_SIGNED_UPLOAD_TTL_SECONDS", 600)
    const uploadUrl = await getSignedUrl(client, cmd, {expiresIn})

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
      entityType: context.entityType,
      entityId: context.entityId,
      uploadUrl,
      expiresIn,
    }
  }

  async presignSensitiveLibraryUpload(b: PresignUploadInput, accessClass: SensitiveAccessClass) {
    const bucket = process.env.MEDIA_S3_BUCKET || "media"
    const visibility = this.visibilityFromAccessClass(accessClass)
    const context = this.resolveMediaContext(b, accessClass)

    if (b.visibility && b.visibility !== "private") {
      throw new BadRequestException("sensitive_media_must_be_private")
    }

    const filename = safeTrim(b.filename)
    if (!filename || !SAFE_FILENAME.test(filename)) {
      throw new BadRequestException("filename is not safe")
    }

    const mimeType = safeTrim(b.mimeType)
    if (!mimeType) throw new BadRequestException("mimeType is required")

    if (!ALLOWED_PRESIGN_MIME.has(mimeType)) {
      throw new BadRequestException("mimeType_not_allowed")
    }

    const ownerId = this.enforceOwnerForWrite({
      actorUserId: b.actorUserId ?? null,
      actorRole: b.actorRole ?? null,
      ownerId: b.ownerId ?? null,
    })

    const libraryObject = this.createSensitiveLibraryObject(filename, accessClass, b.displayName)

    const client = this.getPublicSigningS3()
    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: libraryObject.path,
      ContentType: mimeType,
    })

    const expiresIn = this.readNumberEnv("MEDIA_SIGNED_UPLOAD_TTL_SECONDS", 600)
    const uploadUrl = await getSignedUrl(client, cmd, {expiresIn})

    return {
      storage: "s3",
      bucket,
      path: libraryObject.path,
      folderPath: libraryObject.folderPath,
      displayName: libraryObject.displayName,
      originalFilename: libraryObject.originalFilename,
      mimeType,
      filename: libraryObject.filename,
      visibility,
      accessClass,
      scope: context.scope,
      entityType: context.entityType,
      entityId: context.entityId,
      ownerId,
      uploadUrl,
      expiresIn,
    }
  }

  async presignProtectedLibraryUpload(b: PresignUploadInput) {
    return this.presignSensitiveLibraryUpload(b, "PROTECTED")
  }

  async presignStrictLibraryUpload(b: PresignUploadInput) {
    return this.presignSensitiveLibraryUpload(b, "STRICT")
  }

  // Phase 2: FinalizeUpload verifies object exists and writes DB row with trusted size/mime.
  async finalizeUpload(input: FinalizeUploadInput) {
    const storage = input.storage ?? "s3"
    if (storage !== "s3") throw new BadRequestException("storage_not_supported")

    const bucket = input.bucket ?? (process.env.MEDIA_S3_BUCKET || "media")
    const path = safeTrim(input.path)
    if (!path) throw new BadRequestException("path is required")

    const filename = safeTrim(input.filename ?? "upload.bin")
    if (!SAFE_FILENAME.test(filename)) throw new BadRequestException("filename is not safe")

    const accessClass = this.resolveAccessClass(input.accessClass, input.visibility)
    const context = this.resolveMediaContext(input, accessClass)
    const ownerId = this.enforceOwnerForWrite({
      actorUserId: input.actorUserId ?? null,
      actorRole: input.actorRole ?? null,
      ownerId: input.ownerId ?? null,
    })

    this.enforceFinalizeStorageLane(path, accessClass, {
      folderPath: input.folderPath,
      displayName: input.displayName,
    })

    const libraryMetadata =
      accessClass === "PUBLIC"
        ? this.derivePublicLibraryMetadata(path, filename, input.folderPath, input.displayName, input.originalFilename)
        : this.deriveSensitiveLibraryMetadata(accessClass as SensitiveAccessClass, filename, input.displayName, input.originalFilename)

    if (accessClass === "PUBLIC") {
      await this.enforcePublicLibraryNameAvailable(context.scope, libraryMetadata.folderPath, libraryMetadata.displayName)
    }

    const client = this.getInternalS3()

    // Trust storage metadata (not client)
    const head = await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: path,
      }),
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

    const visibility = this.visibilityFromAccessClass(accessClass)

    const etag = typeof head.ETag === "string" ? head.ETag.replaceAll('"', "") : null

    // Create DB row as PENDING until scan/promotion pipeline runs
    const data: Prisma.MediaCreateInput = {
      storage: "s3",
      bucket,
      path,
      filename: libraryMetadata.filename,
      folderPath: libraryMetadata.folderPath,
      displayName: libraryMetadata.displayName,
      originalFilename: libraryMetadata.originalFilename,
      mimeType,
      sizeBytes,

      ownerId,
      visibility,
      accessClass,
      scope: context.scope,
      entityType: context.entityType,
      entityId: context.entityId,

      sha256: input.sha256 ?? null,

      status: MediaStatus.PENDING,
      scanStatus: ScanStatus.QUEUED,
      quarantineReason: null,
      etag,
      promotedAt: null,
    }

    return this.prisma.media.create({data})
  }

  async createReadUrl(id: string, input: CreateReadUrlInput) {
    const row = await this.getById(id)

    if (row.storage !== "s3") {
      throw new BadRequestException("storage_not_supported")
    }

    if (row.status !== MediaStatus.READY || row.scanStatus !== ScanStatus.CLEAN) {
      throw new ForbiddenException("media_not_available")
    }

    const actorUserId = input.actorUserId ?? null
    const actorRole = input.actorRole ?? null
    const isAdmin = actorRole === "admin" || actorRole === "root-admin"
    const isOwner = !!row.ownerId && row.ownerId === actorUserId

    if (row.accessClass !== "PUBLIC" && !isAdmin && !isOwner) {
      throw new ForbiddenException("media_access_denied")
    }

    const expiresIn = row.accessClass === "STRICT" ? this.readNumberEnv("MEDIA_STRICT_READ_TTL_SECONDS", 30) : this.readNumberEnv("MEDIA_SIGNED_READ_TTL_SECONDS", 300)
    const contentDisposition = input.download ? `attachment; filename="${row.filename}"` : `inline; filename="${row.filename}"`

    const cmd = new GetObjectCommand({
      Bucket: row.bucket ?? process.env.MEDIA_S3_BUCKET ?? "media",
      Key: row.path,
      ResponseContentType: row.mimeType,
      ResponseContentDisposition: contentDisposition,
      ResponseCacheControl: "private, no-store",
    })

    const url = await getSignedUrl(this.getPublicSigningS3(), cmd, {
      expiresIn,
    })

    return {
      url,
      expiresIn,
      accessClass: row.accessClass,
      filename: row.filename,
      mimeType: row.mimeType,
    }
  }

  async createPublicLibraryReadUrl(id: string, input: CreateReadUrlInput) {
    await this.getPublicLibraryById(id)
    return this.createReadUrl(id, input)
  }

  async createProtectedLibraryReadUrl(id: string, input: CreateReadUrlInput) {
    await this.getProtectedLibraryById(id)
    return this.createReadUrl(id, input)
  }

  async createProtectedFeatureReadUrl(id: string, input: FeatureReadUrlInput) {
    const row = await this.getById(id)
    this.assertSensitiveFeatureContext(row, input, "PROTECTED")
    return this.createReadUrl(id, input)
  }

  async createStrictLibraryReadUrl(id: string, input: CreateReadUrlInput) {
    const row = await this.getStrictLibraryById(id)
    this.log.log(`strict_media_read_url_requested id=${row.id} ownerId=${row.ownerId} actorUserId=${input.actorUserId ?? ""}`)
    return this.createReadUrl(id, input)
  }

  async openPublicRenderStream(id: string, input: CreateRenderInput = {}): Promise<PublicRenderObject> {
    const variant = safeTrim(input.variant ?? "web") || "web"
    if (variant !== "web") {
      throw new BadRequestException("render_variant_not_supported")
    }

    const row = await this.getById(id)

    if (row.accessClass !== "PUBLIC" || row.visibility !== "public") {
      throw new ForbiddenException("media_not_renderable")
    }

    this.assertPublicLibraryMedia(row)

    if (row.status !== MediaStatus.READY || row.scanStatus !== ScanStatus.CLEAN) {
      throw new ForbiddenException("media_not_available")
    }

    if (row.storage !== "s3") {
      throw new BadRequestException("storage_not_supported")
    }

    const object = await this.getInternalS3().send(
      new GetObjectCommand({
        Bucket: row.bucket ?? process.env.MEDIA_S3_BUCKET ?? "media",
        Key: row.path,
        ResponseContentType: row.mimeType,
        ResponseContentDisposition: `inline; filename="${row.filename}"`,
        ResponseCacheControl: "public, max-age=60, s-maxage=300, stale-while-revalidate=60",
      }),
    )

    const body = object.Body
    if (!body || typeof (body as {pipe?: unknown}).pipe !== "function") {
      throw new Error("storage_body_not_streamable")
    }

    return {
      stream: body as Readable,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      filename: row.filename,
      etag: typeof object.ETag === "string" ? object.ETag.replaceAll('"', "") : row.etag,
      cacheControl: "public, max-age=60, s-maxage=300, stale-while-revalidate=60",
      contentDisposition: `inline; filename="${row.filename}"`,
    }
  }

  async previewPublicLibraryDelete(input: PublicLibraryDeleteInput) {
    const plan = await this.buildPublicLibraryDeletePlan(input)
    if (!plan.response.canDelete) {
      return plan.response
    }

    const token = this.createPublicLibraryDeleteToken(plan.tokenShape)
    return {
      ...plan.response,
      ...token,
    }
  }

  async confirmPublicLibraryDelete(input: PublicLibraryDeleteConfirmInput) {
    const payload = this.verifyPublicLibraryDeleteToken(input.confirmToken)
    const plan = await this.buildPublicLibraryDeletePlan(input)
    const payloadShape = this.deleteTokenShapeFromPayload(payload)

    if (!this.sameDeleteTokenShape(payloadShape, plan.tokenShape)) {
      throw new BadRequestException("delete_plan_changed")
    }

    if (!plan.response.canDelete) {
      throw new BadRequestException("delete_plan_not_confirmable")
    }

    for (const row of plan.rows) {
      await this.deletePublicLibraryById(row.id)
    }

    return {
      deleted: true,
      fileCount: plan.response.fileCount,
      folderCount: plan.response.folderCount,
      totalSizeBytes: plan.response.totalSizeBytes,
    }
  }

  async deleteById(id: string) {
    const row = await this.prisma.media.findUnique({where: {id}})
    if (!row) return false

    if (row.storage === "s3" && row.path) {
      try {
        await this.getInternalS3().send(
          new DeleteObjectCommand({
            Bucket: row.bucket ?? process.env.MEDIA_S3_BUCKET ?? "media",
            Key: row.path,
          }),
        )
      } catch (error) {
        this.log.error(`deleteObject failed id=${id} path=${row.path}`, error)
        throw error
      }
    }

    await this.prisma.media.delete({where: {id}})
    return true
  }

  async deletePublicLibraryById(id: string) {
    const row = await this.prisma.media.findUnique({where: {id}})
    if (!row) return false

    this.assertPublicLibraryMedia(row)
    return this.deleteById(id)
  }

  async deleteProtectedLibraryById(id: string) {
    const row = await this.prisma.media.findUnique({where: {id}})
    if (!row) return false

    this.assertSensitiveLibraryMedia(row, "PROTECTED")
    return this.deleteById(id)
  }

  async deleteStrictLibraryById(id: string) {
    const row = await this.prisma.media.findUnique({where: {id}})
    if (!row) return false

    this.assertSensitiveLibraryMedia(row, "STRICT")
    this.log.log(`strict_media_delete_requested id=${row.id} ownerId=${row.ownerId}`)
    return this.deleteById(id)
  }
}
