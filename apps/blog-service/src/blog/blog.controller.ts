import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  Query,
  ParseUUIDPipe,
} from "@nestjs/common";
import { BlogService } from "./blog.service";
import { Public, Roles } from "@nebula/grpc-auth";
import { Throttle } from "@nestjs/throttler";
import {
  CreatePostRequestDto,
  UpdatePostRequestDto,
  ListPostsQueryDto,
} from "./dto/post.dto";

@Controller("blog")
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

  @Roles("admin", "root-admin")
  @Post("posts")
  create(@Body() body: CreatePostRequestDto) {
    return this.svc.create(body.data);
  }

  @Roles("admin", "root-admin")
  @Patch("posts/:id")
  update(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() body: UpdatePostRequestDto,
  ) {
    return this.svc.update(id, body.patch);
  }

  @Roles("admin", "root-admin")
  @Delete("posts/:id")
  remove(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string) {
    return this.svc.softDelete(id);
  }
}
