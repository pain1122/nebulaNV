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
  ProtectedFeatureReadUrlDto,
  PublicLibraryDeleteConfirmDto,
  PublicLibraryDeletePreviewDto,
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
  @Get("public-library/browse")
  async browsePublicLibrary(@Query() q: ListMediaDto) {
    return { data: await this.svc.browsePublicFilemanager(q) };
  }

  @Roles("admin", "root-admin")
  @Get("protected-library/browse")
  async browseProtectedLibrary(
    @Query() q: ListMediaDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return {
      data: await this.svc.browseProtectedFilemanager({
        ...q,
        ownerId: this.resolveOwnerId(req, q.ownerId),
      }),
    };
  }

  @Roles("admin", "root-admin")
  @Get("strict-library/browse")
  async browseStrictLibrary(
    @Query() q: ListMediaDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return {
      data: await this.svc.browseStrictFilemanager({
        ...q,
        ownerId: this.resolveOwnerId(req, q.ownerId),
      }),
    };
  }

  @Roles("user", "admin", "root-admin")
  @Get("my/protected-library/browse")
  async browseMyProtectedLibrary(
    @Query() q: ListMediaDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return {
      data: await this.svc.browseProtectedFilemanager({
        ...q,
        ownerId: this.resolveOwnerId(req),
        accessClass: "PROTECTED",
        visibility: "private",
      }),
    };
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
  @Delete("public-library/:id")
  async deletePublicLibrary(@Param() p: DeleteMediaDto) {
    return { deleted: await this.svc.deletePublicLibraryById(p.id) };
  }

  @Roles("admin", "root-admin")
  @Post("public-library/delete-preview")
  async previewPublicLibraryDelete(
    @Body() b: PublicLibraryDeletePreviewDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = req.user?.userId;
    if (!actorUserId) throw new UnauthorizedException("missing_user_context");

    return {
      data: await this.svc.previewPublicLibraryDelete({
        ...b,
        actorUserId,
        actorRole: req.user?.role ?? null,
      }),
    };
  }

  @Roles("admin", "root-admin")
  @Post("public-library/delete-confirm")
  async confirmPublicLibraryDelete(
    @Body() b: PublicLibraryDeleteConfirmDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = req.user?.userId;
    if (!actorUserId) throw new UnauthorizedException("missing_user_context");

    return {
      data: await this.svc.confirmPublicLibraryDelete({
        ...b,
        actorUserId,
        actorRole: req.user?.role ?? null,
      }),
    };
  }

  @Roles("admin", "root-admin")
  @Delete("protected-library/:id")
  async deleteProtectedLibrary(@Param() p: DeleteMediaDto) {
    return { deleted: await this.svc.deleteProtectedLibraryById(p.id) };
  }

  @Roles("admin", "root-admin")
  @Delete("strict-library/:id")
  async deleteStrictLibrary(@Param() p: DeleteMediaDto) {
    return { deleted: await this.svc.deleteStrictLibraryById(p.id) };
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
  @Post("public-library/presign")
  async presignPublicLibrary(
    @Body() b: PresignUploadDto,
    @Req() req: AuthenticatedRequest,
  ) {
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
  @Post("protected-library/presign")
  async presignProtectedLibrary(
    @Body() b: PresignUploadDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = req.user?.userId;
    if (!actorUserId) throw new UnauthorizedException("missing_user_context");
    return {
      data: await this.svc.presignProtectedLibraryUpload({
        ...b,
        accessClass: "PROTECTED",
        visibility: "private",
        ownerId: this.resolveOwnerId(req, b.ownerId),
        actorUserId,
        actorRole: req.user?.role ?? null,
      }),
    };
  }

  @Roles("admin", "root-admin")
  @Post("strict-library/presign")
  async presignStrictLibrary(
    @Body() b: PresignUploadDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = req.user?.userId;
    if (!actorUserId) throw new UnauthorizedException("missing_user_context");
    return {
      data: await this.svc.presignStrictLibraryUpload({
        ...b,
        accessClass: "STRICT",
        visibility: "private",
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
  @Post("public-library/finalize")
  async finalizePublicLibrary(
    @Body() b: FinalizeUploadDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = req.user?.userId;
    if (!actorUserId) throw new UnauthorizedException("missing_user_context");

    return {
      data: await this.svc.finalizeUpload({
        ...b,
        accessClass: "PUBLIC",
        visibility: "public",
        ownerId: this.resolveOwnerId(req, b.ownerId),
        actorUserId,
        actorRole: req.user?.role ?? null,
      }),
    };
  }

  @Roles("admin", "root-admin")
  @Post("protected-library/finalize")
  async finalizeProtectedLibrary(
    @Body() b: FinalizeUploadDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = req.user?.userId;
    if (!actorUserId) throw new UnauthorizedException("missing_user_context");

    return {
      data: await this.svc.finalizeUpload({
        ...b,
        accessClass: "PROTECTED",
        visibility: "private",
        ownerId: this.resolveOwnerId(req, b.ownerId),
        actorUserId,
        actorRole: req.user?.role ?? null,
      }),
    };
  }

  @Roles("admin", "root-admin")
  @Post("strict-library/finalize")
  async finalizeStrictLibrary(
    @Body() b: FinalizeUploadDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = req.user?.userId;
    if (!actorUserId) throw new UnauthorizedException("missing_user_context");

    return {
      data: await this.svc.finalizeUpload({
        ...b,
        accessClass: "STRICT",
        visibility: "private",
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

  @Roles("admin", "root-admin")
  @Post("public-library/:id/read-url")
  async createPublicLibraryReadUrl(
    @Param() p: GetMediaDto,
    @Req() req: AuthenticatedRequest,
    @Query("download") download?: string,
  ) {
    const actorUserId = req.user?.userId;
    if (!actorUserId) throw new UnauthorizedException("missing_user_context");

    return {
      data: await this.svc.createPublicLibraryReadUrl(p.id, {
        actorUserId,
        actorRole: req.user?.role ?? null,
        download: download === "true" || download === "1",
      }),
    };
  }

  @Roles("admin", "root-admin")
  @Post("protected-library/:id/read-url")
  async createProtectedLibraryReadUrl(
    @Param() p: GetMediaDto,
    @Req() req: AuthenticatedRequest,
    @Query("download") download?: string,
  ) {
    const actorUserId = req.user?.userId;
    if (!actorUserId) throw new UnauthorizedException("missing_user_context");

    return {
      data: await this.svc.createProtectedLibraryReadUrl(p.id, {
        actorUserId,
        actorRole: req.user?.role ?? null,
        download: download === "true" || download === "1",
      }),
    };
  }

  @Roles("admin", "root-admin")
  @Post("strict-library/:id/read-url")
  async createStrictLibraryReadUrl(
    @Param() p: GetMediaDto,
    @Req() req: AuthenticatedRequest,
    @Query("download") download?: string,
  ) {
    const actorUserId = req.user?.userId;
    if (!actorUserId) throw new UnauthorizedException("missing_user_context");

    return {
      data: await this.svc.createStrictLibraryReadUrl(p.id, {
        actorUserId,
        actorRole: req.user?.role ?? null,
        download: download === "true" || download === "1",
      }),
    };
  }

  @Roles("user", "admin", "root-admin")
  @Post("my/protected-library/:id/read-url")
  async createMyProtectedLibraryReadUrl(
    @Param() p: GetMediaDto,
    @Query() q: ProtectedFeatureReadUrlDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = req.user?.userId;
    if (!actorUserId) throw new UnauthorizedException("missing_user_context");

    return {
      data: await this.svc.createProtectedFeatureReadUrl(p.id, {
        ...q,
        ownerId: actorUserId,
        actorUserId,
        actorRole: req.user?.role ?? null,
        download: q.download === "true" || q.download === "1",
      }),
    };
  }
}
