# D1 Batch 3 contract review (2026-10-03)

Status: Batch 3 closed. Operation/field review, narrow corrections, local
quality checks, and rebuilt-Gateway variant/F3 live proof pass. The user
reported no errors for the supplied full Gateway/build/live command sequence;
the full Gateway test summary was not pasted, so no new full-suite count is
claimed. Batch 4 remains the D1-wide fixture/migration/lifecycle exit work.

## Required operation set

The existing 18 Product Gateway operations cover the current default-site
catalogue and management requirement. HTTP service compatibility keeps its
existing list/detail/create/patch subset; canonical management uses gRPC behind
the Gateway. Parity does not require duplicating all management RPCs on internal
HTTP. Dormant V3 RPCs and advanced 3D/VR workflows are outside this slice.

| Gateway operation                | Owning Product RPC  | Required behavior                                                 |
| -------------------------------- | ------------------- | ----------------------------------------------------------------- |
| `products_list`                  | `ListProducts`      | Active, non-deleted, purchasable catalogue; total-only pagination |
| `products_get`                   | `GetProduct`        | Eligible public detail including visible variants and Media IDs   |
| `products_gallery_list`          | `ListGallery`       | Eligible public Media-ID gallery; unpaginated                     |
| `admin_products_list`            | `AdminListProducts` | Admin lifecycle/deletion filters; total-only pagination           |
| `admin_products_get`             | `AdminGetProduct`   | Full admin detail for repair                                      |
| `admin_products_create`          | `CreateProduct`     | Valid commercial state, taxonomy, and Media references            |
| `admin_products_update`          | `UpdateProduct`     | Sparse patch, external content mapping, expected parent version   |
| `admin_products_variants_create` | `CreateVariant`     | SKU/options/overrides, expected parent version                    |
| `admin_products_variants_update` | `UpdateVariant`     | Sparse overrides/options mutation, expected parent version        |
| `admin_products_variants_delete` | `DeleteVariant`     | Soft-delete variant using expected parent version                 |
| `admin_products_delete`          | `DeleteProduct`     | Product soft deletion                                             |
| `admin_products_restore`         | `RestoreProduct`    | Restore without bypassing public eligibility                      |
| `admin_products_hard_delete`     | `HardDeleteProduct` | Permanent deletion with dependent-row conflict                    |
| `admin_products_bulk_discount`   | `ApplyDiscountBulk` | Explicit selector and sparse commercial changes                   |
| `admin_products_gallery_list`    | `AdminListGallery`  | Include legacy repair row IDs without provider URLs               |
| `admin_products_gallery_add`     | `AddImages`         | Media-ID inputs, governed role, ordered output                    |
| `admin_products_gallery_order`   | `ReorderImages`     | Bounded explicit ordering                                         |
| `admin_products_gallery_remove`  | `RemoveImage`       | Product/image identity and explicit hard-delete choice            |

All operations are present in the route manifest, Gateway controller, OpenAPI,
and generated client. Public reads have their separate Product RPCs. Admin
routes require an admin application and actor. All management mutations use
the existing idempotency-key policy; reads use the safe-read policy.

## Findings and approved narrow corrections

1. **Confirmed contract defect:** `GatewayProductVariantDto.priceOverride`
   declared optional nullable object metadata. The mapper always emits a number
   or null. Generated TypeScript consequently exposed an optional empty object
   or null, preventing correct typed numeric consumption. Corrected to required
   nullable Number metadata; regenerated OpenAPI/client now declare
   `priceOverride: number | null`. Runtime
   response values, database schema, and service pricing behavior stay intact.
2. **Stale contract implementation:** Product input profiles still list the
   three disabled 3D/VR URL fields. DTO and owner rejection already worked, as
   Batch 2 proved. Removed those profile entries so the early allowlist matches
   DTOs, OpenAPI, and the generated client. This is not an authorization bypass.
3. **Stale documentation:** variant path DTOs require UUIDs, but the shared
   OpenAPI route decorator omits the three variant input profiles from its UUID
   path set. Added those profile names; validation already enforces UUIDs.

Preserve separate external DTOs and explicit response mapping. Product output
does not spread Prisma objects or downstream context. Preserve existing signed
S2S calls, actor-derived authority, request IDs, envelopes, and Media rendering.
No new endpoint, frontend, credential, tenant scope, or provider abstraction is
required by these findings. Batch 2's approved URL removals remain in effect.

## Current verification

- Sparse variant patch transport preserves explicit zero/false, omits
  absent optional scalar overrides, and distinguishes option replacement.
- Public and admin responses retain numeric/null variant overrides.
- Caller-selected authority is rejected on variant writes and nested
  gallery inputs are rejected for storage/internal fields before forwarding.
- The corrected response type compiles in browser and native client
  examples using numeric override operations.
- Focused Gateway checks passed six suites/55 tests: OpenAPI, Product HTTP,
  Product mapping, Product input profiles, route-policy aggregate, and
  input-profile aggregate.
- Gateway type check and changed-file lint passed. `pnpm api:check` passed.
  API client lint and five client tests passed, with browser/native compilation.
  The updated variant live script passes syntax/lint and its numeric/null
  override assertions pass against the rebuilt Gateway.

## Completed container and regression proof

The user reported successful completion of this sequence on 2026-10-03:

```powershell
pnpm --filter @nebula/gateway test
docker compose build gateway
docker compose up -d --no-build --wait --no-deps gateway
pnpm test:d1:variants:live
pnpm test:f3:live
```

The supplied variant output contains six passing checks: options/SKU/price/stock,
numeric/null override contract, public variant visibility, stale-write and SKU
collision rollback, depletion hiding the Product, and cleanup. F3 supplied
six passing flows: Gateway readiness, anonymous/authenticated storefront,
authorized admin, registered mobile, and disabled partner execution.

The agent then ran `pnpm backend:health`: all eleven checks passed. Docker
image IDs confirm the Gateway container uses its current `latest` image.
No Product schema/service behavior changed during this batch.

## Source evidence

- `apps/gateway/src/contracts/routes/product.routes.ts`
- `apps/gateway/src/contracts/inputs/product.inputs.ts`
- `apps/gateway/src/contracts/gateway-api-route.decorator.ts`
- `apps/gateway/src/product/product-api.dto.ts`
- `apps/gateway/src/product/gateway-product-api.service.ts`
- `apps/gateway/src/product/gateway-product.controller.ts`
- `apps/product-service/src/product/product.service.ts`
- `apps/product-service/src/product/grpc/product-grpc.controller.ts`
- `apps/product-service/src/product/dto/variant.dto.ts`
- `packages/protos/product.proto`
- `apps/gateway/openapi/nebula-v1.openapi.json`
- `packages/api-client/src/generated.ts`

Full lifecycle, deterministic seed/reset, and populated migration/rerun/rollback
proof remains Batch 4. An operation being present is not a claim that Batch 4's
complete workflow has passed.
