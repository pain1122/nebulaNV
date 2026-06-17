# Product Service

Last reviewed: 2026-06-17

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
- DB-backed `/health`.

## Current HTTP Contract

Product routes:

- `GET /products`
- `GET /products/:id`
- `POST /products`
- `PATCH /products/:id`

Access:

- Product reads are public.
- Product writes require `admin`.

Taxonomy routes exposed by product-service:

- `GET /taxonomies/:kind`
- `GET /taxonomies/:kind/:id`
- `POST /taxonomies/:kind`
- `PATCH /taxonomies/:kind/:id`
- `DELETE /taxonomies/:kind/:id`

Access:

- Taxonomy reads are public.
- Taxonomy writes require `admin`.

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
- `DeleteProduct`
- `RestoreProduct`
- `HardDeleteProduct`
- `ApplyDiscountBulk`
- `AddImages`
- `ListGallery`
- `ReorderImages`
- `RemoveImage`

Product taxonomy methods:

- `List`
- `Get`
- `Create`
- `Update`
- `Delete`

## Current DB Shape

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

## Product Rules

- Create requires `title`.
- Price must be non-negative.
- Slug is generated from title/input slug and made unique.
- SKU is generated if absent and made unique.
- `categoryId` is required directly or resolved from settings-service default.
- Category ID must point to taxonomy-service record with `scope = "product"` and `kind = "category.default"`.
- List excludes soft-deleted products unless `includeDeleted` is true.
- List orders featured products first, then feature sort, then newest.
- Soft delete exists in service logic and gRPC, but not in HTTP routes.
- Soft delete sets `deletedAt`.
- Restore clears `deletedAt`.
- Hard delete removes the DB row.

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

## Default Category Initialization

`DefaultProductTaxonomyInitializer` is registered as an active provider.

On module init it tries to:

- Ensure taxonomy-service has `product/category.default:uncategorized`.
- Store that taxonomy ID in settings-service key `product/default_product_category`.

This default is used when creating products without an explicit `categoryId`.

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
- Public list finds created product.
- Product taxonomy HTTP create/get/list/update/delete works through product-service facade.

gRPC:

- Admin S2S can create product.
- Public get/list product works.
- Admin S2S can update product.
- Product taxonomy gRPC create/get/list/update/delete works through product-service facade.

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
- `apps/product-service/test/setup/wait-for-services.ts`
- `apps/product-service/test/jest.env.ts`

## Known Gaps

- Public product read behavior needs launch review: `GET /products/:id` currently fetches by ID without deleted/status filtering.
- Public list excludes deleted products but does not force `ACTIVE` only unless status filtering is provided.
- Product variants are not modeled yet.
- Need WooCommerce-style variant support with per-variant SKU, price, stock, media, attributes/options, and active/deleted state.
- Order/cart items should eventually snapshot selected `variantId` and selected options, not only `productId`.
- Currency policy is not fully standardized with order-service yet.
- Default currency fallback and DB currency default differ: `USD` fallback vs `EUR` DB default.
- Product media fields are URL strings only; no media-service validation or media ID contract yet.
- HTTP does not expose delete/restore/hard-delete, bulk discount, or gallery actions.
- Product comments, attributes, product sets, and VR hotspots exist in DB shape but do not have full visible service contracts yet.
- gRPC admin enforcement should stay under review for every write method.
