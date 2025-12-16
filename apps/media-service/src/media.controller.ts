import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common"
import { Public, Roles } from "@nebula/grpc-auth"
import { MediaService } from "./media.service"
import { CreateMediaDto, ListMediaDto, GetMediaDto, DeleteMediaDto } from "./dto"

const Pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
})

@Controller("media")
@UsePipes(Pipe)
export class MediaController {
  constructor(private readonly svc: MediaService) {}

  // If you want listing public later, keep @Public() here.
  // For now I’ll keep it admin/root-admin by default.
  @Roles("admin", "root-admin")
  @Get()
  async list(@Query() q: ListMediaDto) {
    const items = await this.svc.list(q)
    return { data: items }
  }

  @Roles("admin", "root-admin")
  @Get(":id")
  async get(@Param() p: GetMediaDto) {
    const row = await this.svc.getById(p.id)
    return { data: row }
  }

  @Roles("admin", "root-admin")
  @Post()
  async create(@Body() b: CreateMediaDto) {
    const row = await this.svc.create(b)
    return { data: row }
  }

  @Roles("admin", "root-admin")
  @Delete(":id")
  async delete(@Param() p: DeleteMediaDto) {
    const deleted = await this.svc.deleteById(p.id)
    return { deleted }
  }
}
