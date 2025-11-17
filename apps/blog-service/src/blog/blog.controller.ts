import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  Query,
  UsePipes,
  ValidationPipe,
  ParseUUIDPipe,
} from "@nestjs/common";
import { BlogService } from "./blog.service";
import { Public, Roles } from "@nebula/grpc-auth";
import { Throttle } from "@nestjs/throttler";
import { CreatePostDto, UpdatePostDto, ListPostsQueryDto } from "./dto/post.dto";

const Pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

@Controller("blog")
@UsePipes(Pipe)
export class BlogController {
  constructor(private readonly svc: BlogService) {}

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get("posts")
  list(@Query() q: ListPostsQueryDto) {
    return this.svc.list(q);
  }

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get("posts/:slug")
  getBySlug(@Param("slug") slug: string) {
    return this.svc.getBySlug(slug);
  }

  @Roles("admin")
  @Post("posts")
  create(@Body() body: { data: CreatePostDto }) {
    return this.svc.create(body.data);
  }

  @Roles("admin")
  @Patch("posts/:id")
  update(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() body: { patch: UpdatePostDto },
  ) {
    return this.svc.update(id, body.patch);
  }

  @Roles("admin")
  @Delete("posts/:id")
  remove(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string) {
    return this.svc.softDelete(id);
  }
}
