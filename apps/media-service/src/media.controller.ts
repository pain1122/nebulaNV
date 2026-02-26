import {Body, Controller, Delete, Get, Param, Post, Query, Req, UnauthorizedException, UsePipes, ValidationPipe} from "@nestjs/common"
import {Roles} from "@nebula/grpc-auth"
import {MediaService} from "./media.service"
import {CreateMediaDto, ListMediaDto, GetMediaDto, DeleteMediaDto, PresignUploadDto} from "./dto"

const Pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: {enableImplicitConversion: true},
})

@Controller("media")
@UsePipes(Pipe)
export class MediaController {
  constructor(private readonly svc: MediaService) {}

  private resolveOwnerId(req: any, requested?: string | null) {
    const ctxUserId = req?.user?.userId ?? null
    if (!ctxUserId) throw new UnauthorizedException("missing_user_context")

    const requestedOwnerId = requested?.trim()
    if (!requestedOwnerId) return ctxUserId

    const role = req?.user?.role
    if (role === "admin" || role === "root-admin") return requestedOwnerId

    return ctxUserId
  }

  @Roles("admin", "root-admin")
  @Get()
  async list(@Query() q: ListMediaDto) {
    return {data: await this.svc.list(q)}
  }

  @Roles("admin", "root-admin")
  @Get(":id")
  async get(@Param() p: GetMediaDto) {
    return {data: await this.svc.getById(p.id)}
  }

  @Roles("admin", "root-admin")
  @Post()
  async create(@Body() b: CreateMediaDto, @Req() req: any) {
    return {
      data: await this.svc.create({
        ...b,
        ownerId: this.resolveOwnerId(req, b.ownerId),
        actorUserId: req.user.userId,
        actorRole: req.user.role,
      }),
    }
  }

  @Roles("admin", "root-admin")
  @Delete(":id")
  async delete(@Param() p: DeleteMediaDto) {
    return {deleted: await this.svc.deleteById(p.id)}
  }

  @Roles("admin", "root-admin")
  @Post("presign")
  async presign(@Body() b: PresignUploadDto, @Req() req: any) {
    return {
      data: await this.svc.presignUpload({
        ...b,
        ownerId: this.resolveOwnerId(req, b.ownerId),
        actorUserId: req.user.userId,
        actorRole: req.user.role,
      }),
    }
  }
}
