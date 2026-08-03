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
- Shared liveness plus Postgres/S2S-backed `/health/ready`; `/health` remains a readiness alias.

## Current HTTP Contract

Blog routes:

- `GET /blog/posts`
- `GET /blog/posts/:slug`
- `POST /blog/posts`
- `PATCH /blog/posts/:id`
- `DELETE /blog/posts/:id`

Access:

- Blog reads are public.
- Blog writes require `admin` or `root-admin`.

Taxonomy routes exposed by blog-service:

- `GET /taxonomies/:kind`
- `GET /taxonomies/:kind/:id`
- `POST /taxonomies/:kind`
- `PATCH /taxonomies/:kind/:id`
- `DELETE /taxonomies/:kind/:id`

Access:

- Taxonomy reads are public.
- Taxonomy writes require `admin` or `root-admin`.

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

The root Prisma commands include this service after product-service. Its base
seed intentionally performs no writes. `pnpm backend:seed` creates one stable
published development post through this service's HTTP API and leaves a
matching post unchanged. The blog default-taxonomy initializer remains a
separate service-owned path. See
[Local Development And Docker Boot](../architecture/local-dev-and-docker-boot.md)
for the shared commands and complete database order.

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
- Writes require `admin` or `root-admin`.
- Scope mismatch is rejected defensively.
- Taxonomy data should flow through typed taxonomy client shapes, not raw `any` values.
- The facade uses the shared downstream gRPC translator, so taxonomy status and availability failures retain their HTTP meaning without a local status table.

## Service Relationships

Uses:

- Auth-service for token validation through `GrpcTokenAuthGuard`.
- Taxonomy-service for blog-scoped taxonomy records.
- Postgres via Prisma for blog post persistence.

Partially present:

- Settings-service client is imported.
- `DefaultBlogTaxonomyInitializer` remains blog-service-owned but is intentionally absent from `AppModule` providers.

Automatic default blog taxonomy initialization is deferred because current post creation stores optional category strings and does not read `blog/default_blog_category`. Register the initializer only when an omitted post category is resolved through that setting, or when a separately approved launch requirement makes the default mandatory. Until then, no inactive feature flag or speculative startup dependency is added.

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
- Missing blog taxonomy records return `404 taxonomy_not_found`.

gRPC:

- Blog create/get/list/update/delete covered.
- Blog taxonomy create/get/list/update/delete covered.
- Missing blog taxonomy records return `NOT_FOUND` with `taxonomy_not_found`.
- The unwired initializer is covered in isolation for blog scope/key ownership, log-and-continue failure behavior, and safe repeated invocation.
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
- `apps/blog-service/test/default-blog-taxonomy.initializer.unit.spec.ts`
- `apps/blog-service/test/setup/wait-for-services.ts`
- `apps/blog-service/test/jest.env.ts`

## Known Gaps

- Blog-service does not yet validate `coverImageUrl` against media-service.
- Blog-service does not yet store media IDs for cover images.
- `DefaultBlogTaxonomyInitializer` exists but appears not registered as a provider.
- gRPC write authorization tests need tightening.
- `BlogComment` model exists but no visible HTTP/gRPC comment contract is currently exposed.
- Local `BlogCategory` model may be legacy or unfinished beside the taxonomy-service facade.
