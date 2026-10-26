# Product Service

Last reviewed: 2026-10-24 (Batch 2 closed; restoration locally proved, Order binding source prepared, deployment pending).

## Purpose

Product-service owns product catalog data, product pricing fields, product presentation metadata, product gallery records, discount fields, and product-scoped taxonomy facade routes.

The D1 variant slice adds bounded sellable combinations under a Product. Each
variant has one to three option values, its own globally reserved SKU, optional
price override, stock, active flag, and deterministic sort order. The parent
Product still owns status, currency, discount policy, and inventory tracking.

Product-service does not own media storage. D1 binds Media IDs and validates
renderable references through Media contracts. Product denies legacy URL inputs;
Gateway omits legacy URL response fields. Completed D1 evidence is in the
2026-10-12 exit report.

## D2 checkout stock intent

Apply application migrations with `pnpm db:migrate:product`, then check
`pnpm db:status:product`. These root scripts supply the required pnpm execution
context and pin the Docker database at port 15432. Disposable verification does
not migrate the application database; direct `node scripts/backend.mjs` migration
invocation lacks the required pnpm context.

`ReserveCheckoutStock`, `FinalizeCheckoutStock`, `CancelCheckoutStock` and the
new `RestoreCheckoutStock` are
internal signed RPCs restricted to Order service. They do not expose an admin
or customer stock mutation route. An intent UUID and canonical payload hash
identify currency and exact selection/quantity/version/SKU/options/price facts.
Reserve atomically claims Product versions and consumes tracked base/variant
stock once. Same identity replays the durable state; changed facts conflict.
Finalize confirms the existing decrement; cancel restores held stock once.
Cancelling an unseen intent records a tombstone that blocks a delayed reserve.
Unmanaged inventory stays unmanaged.

Held rows block absolute quantity/tracking/mode replacement and physical row
deletion. Soft deletion remains recoverable. Terminal operations detach the
protective references while retaining intent identity and original line facts.
The price check uses the same Decimal discount calculation as catalogue replies.
No remote call runs inside the short Product transaction; remote publication
eligibility is checked before locking. There is no independent automatic hold
expiry that could refund a committed Order.

The owner SQL/Prisma proof passes with publication dependencies stubbed. Salar
reports native Product migration verification passed. Order checkout source now
invokes stock RPCs through its durable coordinator; the two-database owner proof
passes. Salar reports native Order verification passed. Product application
deployment/rerun/status pass after correcting the pnpm migration handoff;
Salar reports corrected Checkout, Cart and F3 live passed, followed by the
corrected deliberate outage/cache-loss/Order-restart and Cart live proofs. See
`docs/reports/2026-10-14-d2-checkout-coordination.md`.
Run `pnpm db:verify:d2:stock` for the owned disposable database proof; native
Prisma deployment/status is separately verified by `pnpm db:verify:product`.

### Finalized restoration primitive

`RestoreCheckoutStock` accepts the recorded intent ID/hash from the Order
service. It requires FINALIZED and credits only the recorded originally tracked
base/variant quantities. A separate `CheckoutStockRestoration` receipt commits
with the credits and makes repeats return RESTORED, including after later
catalogue deletion. The original intent remains FINALIZED; ordinary HELD cancel
still cannot reverse it. No new Gateway or native HTTP mutation is exposed.

Sorted parent locks preserve counter/version concurrency. Inactive/soft-deleted
original rows can receive their stock; publication is unchanged. Missing tracked
rows, wrong original parent/selection mode and integer-capacity overflow reject
the whole restoration. Replacement rows sharing a SKU never receive its credit.
Originally unmanaged lines are not credited when tracking later changes.
Version-ceiling handling matches existing held compensation.

Migration `20261019000100_finalized_stock_restoration` and the owner primitive
have actual populated/rollback/race/atomicity proof in
`pnpm db:verify:d2:restoration`; remote publication is stubbed in this owner-only
proof. Salar's original-stock regression also passed on Oct 24. Application
migration/private RPC/image proof remains separate. Order's durable cancellation
binding is prepared in source, with SQL/native evidence still pending. See the
[restoration receipt](../reports/2026-10-19-d2-stock-restoration.md) and
[Order binding receipt](../reports/2026-10-24-d2-order-cancellation.md).
Detailed consumer trace: `docs/reports/2026-10-14-d2-stock-execution.md`.

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

The service's direct HTTP listener does not expose product
delete/restore/hard-delete, bulk discount, or gallery actions. Those operations
exist in gRPC and are already exposed externally through the gateway.

## External Gateway Contract

The public gateway exposes public Product list/get/gallery reads and admin
list/get/create/update/delete/restore/hard-delete, bulk-discount, and gallery
management. It also exposes admin variant create/update/delete at
`/api/v1/admin/products/:id/variants`, with a versioned PATCH/DELETE at
`/api/v1/admin/products/:id/variants/:variantId`. Product responses include
`selectionMode` and `variants`; public responses omit inactive and deleted
variants. Generated `@nebula/api-client` methods cover the same routes.
External callers must use this gateway contract; the direct Product HTTP
listener remains an internal compatibility surface.

The gateway preserves the service's public/admin visibility split and uses the
shared request envelope, actor policy, error mapping, and idempotency handling.
The current route inventory and the contract defects found behind those routes
are recorded in the
[D1 Batch 0 Product Contract And Data Audit](../reports/2026-09-15-d1-batch0-product-contract-data-audit.md).

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
- `CreateVariant`
- `UpdateVariant`
- `DeleteVariant`
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
seed intentionally performs no writes. `pnpm backend:seed` delegates Product
content to `pnpm demo:d1:seed`, the gateway-only showcase runner. It manages
journalled taxonomy/Media relationships, variants and commercial examples;
limits fixtures are available explicitly through `pnpm demo:d1:seed limits`.
The service-owned default-taxonomy initializer remains authoritative and
separate from blog-service. Existing legacy records are not deleted. See
[Local Development And Docker Boot](../architecture/local-dev-and-docker-boot.md)
for the shared commands and complete database order.

Main Prisma models:

- `Product`
- `ProductVariant`
- `CatalogSku`
- `ProductGalleryImage`
- `ProductVrHotspot`
- `ProductAttribute`
- `ProductComment`
- `ProductSet`

Enums:

- `ProductStatus = DRAFT | ACTIVE | ARCHIVED`
- `ProductSelectionMode = BASE | VARIANT`
- `DiscountType = PERCENTAGE | FIXED`
- `AttributeValueType = STRING | INT | BOOL`
- `CommentStatus = PENDING | APPROVED | REJECTED`

Important note:

`BASE` products use their own stock. `VARIANT` products are publicly visible
only when an active, non-deleted variant is available; base stock cannot be
used to make a variant product sellable. Variant mutations compare and advance
the parent Product version in the same transaction. Deleted variants remain
as tombstones and their SKUs remain reserved. The `CatalogSku` table reserves
SKUs across base products and variants; its migration backfills existing
Product SKUs.

The D1 variant migration and generated-client live proof passed on the local
Docker backend on 2026-09-28. The broader D1 exit proof still needs populated
upgrade, rerun, rollback, and malformed-data evidence.

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

- Create requires `title` and an explicit non-negative `price`.
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
- A stored percentage/fixed type requires a non-negative value; percentage is
  capped at 100.
- Partial single and bulk changes are checked against the complete stored
  discount state before mutation.
- Responses use `NONE` for no discount and include a numeric `effectivePrice`.
  Active in-window percentage/fixed discounts are rounded to two decimals, and
  fixed discounts clamp at zero.

## Media And Presentation Fields

Thumbnail and gallery writes require Media IDs. Product asks Media to validate
existence and eligibility for the requested role, and rechecks references
before public Product detail, catalogue, and gallery reads. Broken references
or unavailable owners cause a 503 response without partial public output.

External Product responses expose `thumbnailMediaId` and gallery `mediaId`.
They omit `thumbnailUrl`, gallery `url`, `model3dUrl`, `model3dPosterUrl`, and
`vrPlanImageUrl`. Clients render images using the existing Gateway Media render
operation and the Media ID. This approved response change requires older
clients that read those URL fields to adapt.

Stored legacy URL columns remain for SQL audit and reconciliation. Product
responses suppress their provider values; existing internal protobuf fields
remain for compatibility and return only derived Media render paths or empty
values. The deferred `model3dUrl`, `model3dPosterUrl`, and `vrPlanImageUrl`
write inputs are disabled on create and patch: Gateway/internal HTTP returns
400 and gRPC returns `INVALID_ARGUMENT`. Product never assigns those columns
through ordinary mutations; old values remain for audit. Internal protobuf
input slots are retained so old callers are rejected explicitly. This does
not activate 3D/VR. SEO and promo metadata are unchanged.

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
- `apps/product-service/test/product-discount.unit.spec.ts`
- `apps/product-service/test/setup/wait-for-services.ts`
- `apps/product-service/test/jest.env.ts`

## D1 entry gaps (historical)

The following list records the earlier entry audit, not current missing work.
D1 is closed; use the 2026-10-12 D1 exit report and current-focus for present
scope. D2 Batch 3 cancellation/payment integration remains open as described above.

- Product stock, availability, variants, selected options, and lost-update
  protection are not modeled yet.
- Product variants need a bounded ecommerce contract with per-variant SKU,
  price/stock overrides, options, active/deleted state, and deterministic order.
- Order/cart items should eventually snapshot selected `variantId` and selected options, not only `productId`.
- Currency policy is not standardized with order-service. Settings seeds `USD`,
  Product's database/response fallback is `EUR`, and a failed Settings lookup
  can cache `USD` for the process lifetime.
- Category ownership correctly stays in taxonomy-service. Product tags remain
  free strings and Product has no authoritative brand relationship.
- Product media fields are URL strings only; no media-service validation or media ID contract yet.
- Omitted gallery sort order becomes zero through the gateway instead of
  appending as the Product service intends.
- Slug/SKU generation and conflict handling are nondeterministic under
  concurrent writes; hard-delete dependency errors lack a stable mapped result.
- Product comments, attributes, product sets, and VR hotspots exist in DB shape but do not have full visible service contracts yet.
- gRPC admin enforcement should stay under review for every write method.

These are classified and ordered in the dated D1 audit. Advanced presentation,
comments, sets, and hotspot breadth remains compatibility data outside the
basic ecommerce contract unless a concrete consumer requires it.
