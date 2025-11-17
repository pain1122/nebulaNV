import { Controller, UsePipes, ValidationPipe } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { Public, Roles } from "@nebula/grpc-auth";
import { BlogService } from "../blog.service";
import { CreatePostDto, UpdatePostDto, ListPostsQueryDto } from "../dto/post.dto";
import { blogv1 } from "@nebula/protos";

const Pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

@Controller()
export class BlogGrpcController {
  constructor(private readonly svc: BlogService) {}

  // ------------------------------------------------------
  // ListPosts (Public)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Public()
  @GrpcMethod("BlogService", "ListPosts")
  async list(req: ListPostsQueryDto) {
    const res = await this.svc.list(req);

    return blogv1.ListPostsResponse.create({
      data: res.data.map((p: any) => this.toProtoPost(p)),
      page: res.page,
      limit: res.limit,
      total: res.total,
    });
  }

  // ------------------------------------------------------
  // GetPost (Public, by slug)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Public()
  @GrpcMethod("BlogService", "GetPost")
  async get(req: { slug: string }) {
    const res = await this.svc.getBySlug(req.slug);

    return blogv1.PostResponse.create({
      data: this.toProtoPost(res.data),
    });
  }

  // ------------------------------------------------------
  // CreatePost (Admin only)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Roles("admin")
  @GrpcMethod("BlogService", "CreatePost")
  async create(req: { data: CreatePostDto }) {
    const res = await this.svc.create(req.data);

    return blogv1.PostResponse.create({
      data: this.toProtoPost(res.data),
    });
  }

  // ------------------------------------------------------
  // UpdatePost (Admin only)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Roles("admin")
  @GrpcMethod("BlogService", "UpdatePost")
  async update(req: { id: string; patch: UpdatePostDto }) {
    const res = await this.svc.update(req.id, req.patch);

    return blogv1.PostResponse.create({
      data: this.toProtoPost(res.data),
    });
  }

  // ------------------------------------------------------
  // DeletePost (Admin only) → soft-delete (ARCHIVED)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Roles("admin")
  @GrpcMethod("BlogService", "DeletePost")
  async delete(req: { id: string }) {
    await this.svc.softDelete(req.id);

    return blogv1.BasicResponse.create({
      success: true,
    });
  }

  // ------------------------------------------------------
  // Mapper: internal BlogService DTO -> proto Post
  // ------------------------------------------------------
  private toProtoPost(p: any) {
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      body: p.body,
      excerpt: p.excerpt ?? "",
      coverImageUrl: p.coverImageUrl ?? "",
      status: p.status,
      tags: p.tags ?? [],
      categories: p.categories ?? [],
      metaTitle: p.metaTitle ?? "",
      metaDescription: p.metaDescription ?? "",
      metaKeywords: p.metaKeywords ?? "",
      publishedAt: p.publishedAt ? new Date(p.publishedAt).toISOString() : "",
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : "",
      updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : "",
    };
  }
}
