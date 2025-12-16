import { Injectable, BadRequestException, Logger, NotFoundException } from "@nestjs/common"
import { PrismaService } from "./prisma.service"
import { CreateMediaDto, ListMediaDto } from "./dto"

const SAFE_FILENAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/
const safeTrim = (s: any) => (typeof s === "string" ? s.trim() : s)

@Injectable()
export class MediaService {
  private readonly log = new Logger(MediaService.name)
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateMediaDto) {
    const filename = safeTrim(dto.filename)
    if (!SAFE_FILENAME.test(filename)) throw new BadRequestException("filename is not safe")

    const path = safeTrim(dto.path)
    const mimeType = safeTrim(dto.mimeType)

    if (!path) throw new BadRequestException("path is required")
    if (!mimeType) throw new BadRequestException("mimeType is required")

    // BigInt comes as numeric string from DTO
    const sizeBytes = BigInt(dto.sizeBytes)

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
      },
    })
  }

  async getById(id: string) {
    const row = await this.prisma.media.findUnique({ where: { id } })
    if (!row) throw new NotFoundException("media_not_found")
    return row
  }

  async list(dto: ListMediaDto) {
    const take = Math.min(Math.max(dto.take ?? 50, 1), 200)
    const skip = Math.max(dto.skip ?? 0, 0)
    const q = (dto.q ?? "").trim()

    return this.prisma.media.findMany({
      where: {
        ...(dto.ownerId ? { ownerId: dto.ownerId } : {}),
        ...(dto.visibility ? { visibility: dto.visibility } : {}),
        ...(dto.scope ? { scope: dto.scope } : {}),
        ...(q
          ? {
              OR: [
                { filename: { contains: q, mode: "insensitive" } },
                { path: { contains: q, mode: "insensitive" } },
                { mimeType: { contains: q, mode: "insensitive" } },
                { sha256: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    })
  }

  async deleteById(id: string) {
    try {
      await this.prisma.media.delete({ where: { id } })
      return true
    } catch (e: any) {
      if (e?.code === "P2025") return false
      this.log.error(`deleteById failed id=${id}`, e?.meta ?? e)
      throw e
    }
  }
}
