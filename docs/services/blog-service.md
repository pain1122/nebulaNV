# Blog Service

Last reviewed: 2026-06-17

## Purpose

Blog-service owns blog posts, public blog read APIs, admin blog write APIs, SEO metadata for posts, and a blog-scoped taxonomy facade.

Blog-service does not currently own media uploads. It stores `coverImageUrl` as a string.

## Main Responsibilities

- Public blog post listing.
- Public blog post lookup by slug.
- Admin blog post creation.
- Admin blog post updates.
- Admin soft-delete by marking posts `ARCHIVED`.
- Blog taxonomy facade over taxonomy-service.
- DB-backed `/health`.

## Current HTTP Contract

Blog routes:

- `GET /blog/posts`
- `GET /blog/posts/:slug`
- `POST /blog/posts`
- `PATCH /blog/posts/:id`
- `DELETE /blog/posts/:id`

Access:

- Blog reads are public.
- Blog writes require `admin`.

Taxonomy routes exposed by blog-service:

- `GET /taxonomies/:kind`
- `GET /taxonomies/:kind/:id`
- `POST /taxonomies/:kind`
- `PATCH /taxonomies/:kind/:id`
- `DELETE /taxonomies/:kind/:id`

Access:

- Taxonomy reads are public.
- Taxonomy writes require `admin`.

## Current gRPC Contract

Proto: `packages/protos/blog.proto`

Services:

- `BlogService`
- `BlogTaxonomyService`

Blog methods:

- `ListPosts`
- `GetPost`
- `CreatePost`
- `UpdatePost`
- `DeletePost`

Blog taxonomy methods:

- `List`
- `Get`
- `Create`
- `Update`
- `Delete`

## Current DB Shape

Main Prisma models:

- `BlogPost`
- `BlogComment`
- `BlogCategory`

Important note:

`BlogCategory` exists in the blog Prisma schema, but current blog taxonomy routes use taxonomy-service through a facade. Do not confuse the local legacy category shape with the taxonomy-service-backed blog taxonomy contract.

## Post Rules

- Only `PUBLISHED` posts appear in public list/get routes.
- Create auto-generates a unique slug from title or input slug.
- Delete is soft-delete by setting status to `ARCHIVED`.
- Updating status to `PUBLISHED` sets `publishedAt` if missing.
- Updating status back to `DRAFT` clears `publishedAt`.
- Blog post response formatting belongs in `blog.mapper.ts`.
- DTO status values and Prisma status values should be converted deliberately.

## Taxonomy Rules

- Blog taxonomy facade hard-locks `scope = "blog"`.
- `kind` comes from the route/request, for example `category.default`.
- Reads are public.
- Writes require admin.
- Scope mismatch is rejected defensively.
- Taxonomy data should flow through typed taxonomy client shapes, not raw `any` values.

## Service Relationships

Uses:

- Auth-service for token validation through `GrpcTokenAuthGuard`.
- Taxonomy-service for blog-scoped taxonomy records.
- Postgres via Prisma for blog post persistence.

Partially present:

- Settings-service client is imported.
- `DefaultBlogTaxonomyInitializer` exists and is designed to store a default blog category ID in settings-service, but it currently appears not wired as an active provider.

Does not currently use:

- Media-service directly.

Current media behavior:

- Blog stores `coverImageUrl` as a string.
- Blog does not validate `coverImageUrl` against media-service.
- Blog does not store a media ID yet.

## Current Tests

HTTP:

- Public blog list works.
- Normal user cannot create blog posts.
- Admin can create blog posts.
- Public get by slug works.
- Admin can update posts.
- List filtering by query finds created post.
- Blog taxonomy HTTP create/get/list/update/delete works through blog-service facade.

gRPC:

- Blog create/get/list/update/delete covered.
- Blog taxonomy create/get/list/update/delete covered.
- Some gRPC admin enforcement needs review because one test currently allows `CreatePost` without metadata.

## Related Files

Core:

- `apps/blog-service/src/blog/blog.service.ts`
- `apps/blog-service/src/blog/blog.controller.ts`
- `apps/blog-service/src/blog/grpc/blog-grpc.controller.ts`
- `apps/blog-service/src/blog/blog.mapper.ts`
- `apps/blog-service/src/blog/blog.types.ts`
- `apps/blog-service/src/blog/blog.module.ts`

Taxonomy Facade:

- `apps/blog-service/src/taxonomy/taxonomy.service.ts`
- `apps/blog-service/src/taxonomy/taxonomy.controller.ts`
- `apps/blog-service/src/taxonomy/grpc/taxonomy-grpc.controller.ts`
- `apps/blog-service/src/taxonomy/dto/taxonomy.dto.ts`
- `apps/blog-service/src/taxonomy/taxonomy.types.ts`

Contracts:

- `packages/protos/blog.proto`
- `packages/protos/taxonomy.proto`
- `apps/blog-service/src/blog/dto/post.dto.ts`

Runtime:

- `apps/blog-service/src/app.module.ts`
- `apps/blog-service/src/main.ts`
- `apps/blog-service/src/config/env.validation.ts`
- `apps/blog-service/src/health.controller.ts`
- `apps/blog-service/src/prisma.service.ts`
- `apps/blog-service/prisma/schema.prisma`
- `apps/blog-service/src/auth-client.module.ts`
- `apps/blog-service/src/taxonomy-client.module.ts`
- `apps/blog-service/src/settings-client.module.ts`

Tests:

- `apps/blog-service/test/http/blog.http.e2e.spec.ts`
- `apps/blog-service/test/grpc/blog.e2e.spec.ts`
- `apps/blog-service/test/http/taxonomy.http.e2e.spec.ts`
- `apps/blog-service/test/grpc/taxonomy.e2e.spec.ts`
- `apps/blog-service/test/setup/wait-for-services.ts`
- `apps/blog-service/test/jest.env.ts`

## Known Gaps

- Blog-service does not yet validate `coverImageUrl` against media-service.
- Blog-service does not yet store media IDs for cover images.
- `DefaultBlogTaxonomyInitializer` exists but appears not registered as a provider.
- gRPC write authorization tests need tightening.
- `BlogComment` model exists but no visible HTTP/gRPC comment contract is currently exposed.
- Local `BlogCategory` model may be legacy or unfinished beside the taxonomy-service facade.
