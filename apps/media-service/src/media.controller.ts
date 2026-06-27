import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { Roles } from "@nebula/grpc-auth";
import { MediaService } from "./media.service";
import {
  CreateMediaDto,
  ListMediaDto,
  GetMediaDto,
  DeleteMediaDto,
  FinalizeUploadDto,
  PresignUploadDto,
} from "./dto";

const Pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

type AuthenticatedRequest = {
  user?: {
    userId?: string | null;
    role?: string | null;
  };
};

@Controller("media")
@UsePipes(Pipe)
export class MediaController {
  constructor(private readonly svc: MediaService) {}

  private resolveOwnerId(
    req: AuthenticatedRequest,
    requested?: string | null,
  ): string {
    const ctxUserId = req?.user?.userId ?? null;
    if (!ctxUserId) throw new UnauthorizedException("missing_user_context");

    const requestedOwnerId = requested?.trim();
    if (!requestedOwnerId) return ctxUserId;

    const role = req?.user?.role;
    if (role === "admin" || role === "root-admin") return requestedOwnerId;

    return ctxUserId;
  }

  @Roles("admin", "root-admin")
  @Get()
  async list(@Query() q: ListMediaDto) {
    return { data: await this.svc.list(q) };
  }

  @Roles("admin", "root-admin")
  @Get("browse")
  async browse(@Query() q: ListMediaDto) {
    return { data: await this.svc.browsePublicFilemanager(q) };
  }

  @Roles("admin", "root-admin")
  @Get(":id")
  async get(@Param() p: GetMediaDto) {
    return { data: await this.svc.getById(p.id) };
  }

  @Roles("admin", "root-admin")
  @Post()
  async create(@Body() b: CreateMediaDto, @Req() req: AuthenticatedRequest) {
    const actorUserId = req.user?.userId;
    if (!actorUserId) throw new UnauthorizedException("missing_user_context");
    return {
      data: await this.svc.create({
        ...b,
        ownerId: this.resolveOwnerId(req, b.ownerId),
        actorUserId,
        actorRole: req.user?.role ?? null,
      }),
    };
  }

  @Roles("admin", "root-admin")
  @Delete(":id")
  async delete(@Param() p: DeleteMediaDto) {
    return { deleted: await this.svc.deleteById(p.id) };
  }

  @Roles("admin", "root-admin")
  @Post("presign")
  async presign(@Body() b: PresignUploadDto, @Req() req: AuthenticatedRequest) {
    const actorUserId = req.user?.userId;
    if (!actorUserId) throw new UnauthorizedException("missing_user_context");
    return {
      data: await this.svc.presignUpload({
        ...b,
        ownerId: this.resolveOwnerId(req, b.ownerId),
        actorUserId,
        actorRole: req.user?.role ?? null,
      }),
    };
  }

  @Roles("admin", "root-admin")
  @Post("finalize")
  async finalize(
    @Body() b: FinalizeUploadDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = req.user?.userId;
    if (!actorUserId) throw new UnauthorizedException("missing_user_context");

    return {
      data: await this.svc.finalizeUpload({
        ...b,
        ownerId: this.resolveOwnerId(req, b.ownerId),
        actorUserId,
        actorRole: req.user?.role ?? null,
      }),
    };
  }

  @Roles("admin", "root-admin")
  @Post(":id/read-url")
  async createReadUrl(
    @Param() p: GetMediaDto,
    @Req() req: AuthenticatedRequest,
    @Query("download") download?: string,
  ) {
    const actorUserId = req.user?.userId;
    if (!actorUserId) throw new UnauthorizedException("missing_user_context");

    return {
      data: await this.svc.createReadUrl(p.id, {
        actorUserId,
        actorRole: req.user?.role ?? null,
        download: download === "true" || download === "1",
      }),
    };
  }
}
