# D1 Variant Slice Checkpoint

Date: 2026-09-26

Status: variant slice implemented and verified on the local Docker backend.

## Scope

- `Product.selectionMode` distinguishes base-product and variant purchasing.
- `ProductVariant` stores up to three option values, SKU, optional price override,
  stock, active/deleted state, and sort order. The service limits a Product to
  50 live variants and enforces a unique option combination per Product.
- `CatalogSku` reserves SKUs across existing Products and new variants. Its
  migration backfills existing Product SKUs. Deleted variant SKUs stay reserved,
  while their option combination can be reused.
- Variant create, update, and delete compare and increment the parent Product
  version in one transaction. A stale write or SKU collision rolls back the
  whole mutation.
- Public Product and gallery reads require an active Product and either base
  availability or an available active variant. Public Product responses omit
  inactive and deleted variants; admin responses retain tombstones.
- Product gRPC, Gateway routes, OpenAPI, and generated client include the
  variant management contract. Gateway mutations retain admin actor policy,
  idempotency, and the dormant V3 receiver pairing.

The implementation keeps currency, discount policy, lifecycle, and inventory
tracking on Product. Cart selection and order snapshots belong to D2.

## Local Evidence

- Prisma schema validation and Product/Gateway type checks passed.
- Product: 16 suites and 109 tests passed at slice exit, including six
  variant-specific tests.
- Gateway: 42 suites and 180 tests passed at slice exit.
- Typed client wrapper tests: 3 suites, 23 tests passed.
- Generated external client tests and browser/React Native type checks passed.
- OpenAPI/client freshness check and backend tooling tests passed.
- Targeted lint passed on the changed Product source files and Gateway/client
  lint passed. Product package-wide lint is blocked by its existing ESLint
  project-size configuration and unrelated test warnings.
- The operator reported `pnpm db:verify:product` completed successfully on
  2026-09-26. The command output has not been copied into this report.
- Product and Gateway images were built with the normal Bake cache and loaded
  locally on 2026-09-28. Product and Gateway were recreated from those images.
- The Product migration was applied to the actual Docker database
  `nebula_products` at `127.0.0.1:15432`; Prisma reported all six migrations
  applied successfully.
- `pnpm test:d1:variants:live` passed option/SKU/price/stock, public variant
  visibility, stale-write and cross-type SKU collision denial with rollback,
  depletion hiding, and cleanup.
- `pnpm test:d1:product:live` and `pnpm test:f3:live` passed. Backend health
  passed for every service and Gateway after restarting an exited Order
  container.
- `pnpm api:check`, typed client wrapper tests, and `git diff --check` passed
  again at slice exit.

## Local Environment Correction

The Product package's ignored `.env` pointed to `localhost:5432`, while Docker
publishes the project's PostgreSQL on port `15432`. The operator's first live
migration command therefore succeeded against a different local PostgreSQL
instance. Product creation through the new image returned HTTP 500 because the
Docker database lacked `ProductVariant` and `CatalogSku`. The `.env` URLs were
changed locally to `127.0.0.1:15432`, matching the checked-in `.env.example`;
the migration then applied to the Docker database and the live test passed.
The earlier database at port `5432` was left untouched after this finding.

## Remaining D1 Evidence

1. Complete the D1-R taxonomy, Media-reference, and currency slice.
2. Run D1-X populated upgrade, rerun, rollback, and malformed-data proof,
   then close the full D1 exit matrix.

This checkpoint does not claim a populated upgrade or production rollout. The
full D1 exit proof will cover populated upgrade, rerun, rollback, and malformed
data after the remaining D1 Product slices are complete.
