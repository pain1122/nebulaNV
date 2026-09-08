# Product Service

Last reviewed: 2026-08-11

## Purpose

Product-service owns product catalog data, product pricing fields, product presentation metadata, product gallery records, discount fields, and product-scoped taxonomy facade routes.

Product-service does not own media storage. It currently stores media-related URLs as strings.

## Main Responsibilities

- Public product list.
- Public product lookup by ID.
- Admin product create.
- Admin product update.
- gRPC product soft delete, restore, hard delete.
- gRPC bulk discount updates.
- gRPC product gallery add/list/reorder/remove.
- Product taxonomy facade over taxonomy-service.
- Default product category initialization through taxonomy-service and settings-service.
- Shared liveness plus Postgres/S2S-backed `/health/ready`; `/health` remains a readiness alias.

## Current HTTP Contract

Product routes:

- `GET /products`
- `GET /products/:id`
- `POST /products`
- `PATCH /products/:id`

Access:

- Anonymous product reads force `ACTIVE`, non-deleted product visibility.
- During the gateway migration, the same HTTP list/get routes preserve broader
  behavior only when the shared guard attaches a verified `admin` or
  `root-admin` actor; raw headers cannot select that branch.
- Product writes require `admin` or `root-admin`.

Taxonomy routes exposed by product-service:

- `GET /taxonomies/:kind`
- `GET /taxonomies/:kind/:id`
- `POST /taxonomies/:kind`
- `PATCH /taxonomies/:kind/:id`
- `DELETE /taxonomies/:kind/:id`

Access:

- Taxonomy reads are public.
- Taxonomy writes require `admin` or `root-admin`.

Important note:

HTTP currently does not expose product delete/restore/hard-delete, bulk discount, or gallery actions. Those exist in gRPC.

## Current gRPC Contract

Proto: `packages/protos/product.proto`

Services:

- `ProductService`
- `ProductTaxonomyService`

Product methods:

- `CreateProduct`
- `UpdateProduct`
- `GetProduct`
- `ListProducts`
- `AdminGetProduct`
- `AdminListProducts`
- `DeleteProduct`
- `RestoreProduct`
- `HardDeleteProduct`
- `ApplyDiscountBulk`
- `AddImages`
- `ListGallery`
- `AdminListGallery`
- `ReorderImages`
- `RemoveImage`

Product taxonomy methods:

- `List`
- `Get`
- `Create`
- `Update`
- `Delete`

Product read policy:

- `GetProduct`, `ListProducts`, and `ListGallery` are authoritative public
  reads. They return only `ACTIVE`, non-deleted products and non-deleted
  gallery rows. Gallery reads first verify that the parent product is publicly
  visible.
- The legacy public request fields `status` and `includeDeleted` remain on the
  wire as deprecated compatibility fields but are ignored; they cannot widen
  public visibility.
- `AdminGetProduct`, `AdminListProducts`, and `AdminListGallery` are private and
  require a verified `admin` or `root-admin` actor. Only these contracts accept
  lifecycle/deletion controls.
- `GalleryImage.deletedAt` is an additive admin-management field. It is always
  empty on public reads because deleted gallery rows are never returned there.

## Current DB Shape

The root Prisma commands include this service after taxonomy-service. Its base
seed intentionally performs no writes. `pnpm backend:seed` creates the stable
development product through this service's HTTP API and omits `categoryId`, so
the service-owned default-taxonomy initializer remains authoritative and
separate from blog-service. See
[Local Development And Docker Boot](../architecture/local-dev-and-docker-boot.md)
for the shared commands and complete database order.

Main Prisma models:

- `Product`
- `ProductGalleryImage`
- `ProductVrHotspot`
- `ProductAttribute`
- `ProductComment`
- `ProductSet`

Enums:

- `ProductStatus = DRAFT | ACTIVE | ARCHIVED`
- `DiscountType = PERCENTAGE | FIXED`
- `AttributeValueType = STRING | INT | BOOL`
- `CommentStatus = PENDING | APPROVED | REJECTED`

Important note:

The DB already has fields for attributes, comments, product sets, VR hotspots, 3D URLs, gallery, SEO, promos, and discounts. Not all of those have full HTTP/gRPC contracts yet.

R2 adds nullable `identityRealmId` and `subjectId` beside `ProductComment.userId`.
Identified comments use default realm `b1000000-0000-4000-8000-000000000001`
and the same UUID subject; anonymous comments stay all-null. Non-null legacy
text IDs must be canonical lowercase UUIDv4. Partial, mismatched, wrong-realm,
or actorless pairs reject. Existing readers stay primary and no cross-service
foreign key or tenant/site scope is added. `pnpm db:verify:f4-r2-default-actors`
passed populated upgrade, unchanged product/comment snapshots, zero-row reruns,
legacy-write compatibility, malformed-ID denial, and complete transactional
DDL rollback on a malformed old-schema comment.

## Product Rules

- Create requires `title`.
- Price must be non-negative.
- Slug is generated from title/input slug and made unique.
- SKU is generated if absent and made unique.
- `categoryId` is required directly or resolved from settings-service default.
- Category ID must point to taxonomy-service record with `scope = "product"` and `kind = "category.default"`.
- Public list always forces `status = ACTIVE` and `deletedAt = null`.
- Admin list excludes soft-deleted products unless `includeDeleted` is true and
  may filter by lifecycle status.
- List orders featured products first, then feature sort, then newest.
- Soft delete exists in service logic and gRPC, but not in HTTP routes.
- Soft delete sets `deletedAt`.
- Restore clears `deletedAt`.
- Hard delete removes the DB row.
- Updating a missing product returns `404 product_not_found` over HTTP and `NOT_FOUND` over gRPC.
- A missing or invalid related category remains invalid product input and returns `400`/`INVALID_ARGUMENT`.

## Currency Rules

- Product-service reads default currency from settings-service key `pricing/default_currency`.
- Current fallback is `USD`.
- Prisma DB default is currently `EUR`.
- Product input can currently override `currency`.
- Currency policy should be standardized with order-service before launch so product/order/shop currency cannot drift.

## Discount Rules

DTO discount type supports:

- `PERCENTAGE`
- `FIXED`
- `NONE`

Prisma discount type supports:

- `PERCENTAGE`
- `FIXED`

Mapping rule:

- `DiscountTypeDto.NONE` maps to `null` in the database.
- Clearing discount also clears value, active flag, and date window.
- Discount end must be greater than or equal to discount start.

## Media And Presentation Fields

Product stores these as string/metadata fields:

- `thumbnailUrl`
- `model3dUrl`
- `model3dFormat`
- `model3dPosterUrl`
- `vrPlanImageUrl`
- gallery image URLs
- SEO metadata
- promo metadata

Important note:

Product-service does not currently validate these URLs against media-service. Media-service integration is future contract work.

## Taxonomy Rules

- Product taxonomy facade hard-locks `scope = "product"`.
- `kind` comes from route/request, for example `category.default`.
- Reads are public.
- Writes require admin.
- Scope/kind mismatch is rejected defensively.
- Product records store only `categoryId`, not embedded category data.
- Downstream taxonomy gRPC failures use the shared `wrapGrpc` translator. Missing taxonomy records remain HTTP `404` through the facade and gRPC `NOT_FOUND` through `ProductTaxonomyService`.
- A missing category reference during product create/update remains invalid product input (`400` / `INVALID_ARGUMENT`), rather than becoming a product-resource `404`.

## Default Category Initialization

`DefaultProductTaxonomyInitializer` is registered as an active provider.

On module init it tries to:

- Call the service-only taxonomy contract to ensure `product/category.default:uncategorized`.
- Store that taxonomy ID through the service-only settings bootstrap contract at `product/default_product_category` in environment `default`.

This default is used when creating products without an explicit `categoryId`.

Initializer failure is logged and startup continues. This preserves reads and
explicitly categorized operations during a transient settings/taxonomy outage.
The shared readiness contract checks product Postgres and the S2S replay store;
it deliberately does not duplicate initializer or downstream domain calls.

## Service Relationships

Uses:

- Auth-service for token validation through `GrpcTokenAuthGuard`.
- Taxonomy-service for product-scoped taxonomy records.
- Settings-service for default product category and default currency.
- Postgres via Prisma for product persistence.

Does not currently use:

- Media-service directly.
- Order-service directly.

Current media behavior:

- Product stores URLs only.
- Product does not request signed URLs.
- Product does not store media IDs yet.

## Current Tests

HTTP:

- Public product list works.
- Normal user cannot create product.
- Admin can create product.
- Public get by ID works.
- Admin can update product.
- Missing product update returns `404 product_not_found`.
- Public list finds created product.
- Product taxonomy HTTP create/get/list/update/delete works through product-service facade.
- Missing taxonomy lookup returns `404` through the product HTTP facade.

gRPC:

- Admin S2S can create product.
- Public get/list/gallery enforce ACTIVE, non-deleted visibility even when a
  caller sends deprecated admin-capable fields.
- Distinct admin get/list/gallery contracts retain lifecycle/deletion access.
- Normal users are denied from the admin read contracts.
- Admin S2S can update product.
- Missing product update returns `NOT_FOUND` with `product_not_found`.
- Product taxonomy gRPC create/get/list/update/delete works through product-service facade.
- Missing taxonomy lookup returns gRPC `NOT_FOUND`.

## Related Files

Core:

- `apps/product-service/src/product/product.service.ts`
- `apps/product-service/src/product/product.controller.ts`
- `apps/product-service/src/product/grpc/product-grpc.controller.ts`
- `apps/product-service/src/product/product.module.ts`

DTOs:

- `apps/product-service/src/product/dto/product-input.dto.ts`
- `apps/product-service/src/product/dto/create-product.dto.ts`
- `apps/product-service/src/product/dto/update-product.dto.ts`
- `apps/product-service/src/product/dto/list-products.dto.ts`
- `apps/product-service/src/product/dto/apply-discount-bulk.dto.ts`
- `apps/product-service/src/product/dto/add-images.dto.ts`
- `apps/product-service/src/product/dto/list-gallery.dto.ts`
- `apps/product-service/src/product/dto/reorder-images.dto.ts`
- `apps/product-service/src/product/dto/remove-image.dto.ts`
- `apps/product-service/src/product/dto/id.dto.ts`

Taxonomy Facade:

- `apps/product-service/src/taxonomy/taxonomy.service.ts`
- `apps/product-service/src/taxonomy/taxonomy.controller.ts`
- `apps/product-service/src/taxonomy/grpc/taxonomy-grpc.controller.ts`
- `apps/product-service/src/taxonomy/dto/taxonomy.dto.ts`
- `apps/product-service/src/taxonomy/taxonomy.module.ts`

Contracts:

- `packages/protos/product.proto`
- `packages/protos/taxonomy.proto`

Runtime:

- `apps/product-service/src/app.module.ts`
- `apps/product-service/src/main.ts`
- `apps/product-service/src/config/env.validation.ts`
- `apps/product-service/src/health.controller.ts`
- `apps/product-service/src/prisma.service.ts`
- `apps/product-service/prisma/schema.prisma`
- `apps/product-service/src/auth-client.module.ts`
- `apps/product-service/src/taxonomy-client.module.ts`
- `apps/product-service/src/settings-client.module.ts`
- `apps/product-service/src/default-product-taxonomy.initializer.ts`

Tests:

- `apps/product-service/test/http/product.http.e2e.spec.ts`
- `apps/product-service/test/grpc/product.e2e.spec.ts`
- `apps/product-service/test/http/taxonomy.http.e2e.spec.ts`
- `apps/product-service/test/grpc/taxonomy.e2e.spec.ts`
- `apps/product-service/test/utils/settings.ts`
- `apps/product-service/test/default-product-taxonomy.initializer.unit.spec.ts`
- `apps/product-service/test/product.error-translation.unit.spec.ts`
- `apps/product-service/test/product-read-visibility.unit.spec.ts`
- `apps/product-service/test/setup/wait-for-services.ts`
- `apps/product-service/test/jest.env.ts`

## Known Gaps

- Product variants are not modeled yet.
- Need WooCommerce-style variant support with per-variant SKU, price, stock, media, attributes/options, and active/deleted state.
- Order/cart items should eventually snapshot selected `variantId` and selected options, not only `productId`.
- Currency policy is not fully standardized with order-service yet.
- Default currency fallback and DB currency default differ: `USD` fallback vs `EUR` DB default.
- Product media fields are URL strings only; no media-service validation or media ID contract yet.
- HTTP does not expose delete/restore/hard-delete, bulk discount, or gallery actions.
- Product comments, attributes, product sets, and VR hotspots exist in DB shape but do not have full visible service contracts yet.
- gRPC admin enforcement should stay under review for every write method.
