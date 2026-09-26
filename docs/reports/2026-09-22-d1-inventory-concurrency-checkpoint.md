# D1 Product inventory and update-concurrency checkpoint

Date: 2026-09-22

## Scope

This checkpoint defines the minimum base-product inventory and optimistic
concurrency contract required before D2 cart and checkout hardening. It does
not introduce variants, warehouses, reservations, tenant partitioning, or a
new authorization system.

## Evidence at entry

- `Product` currently stores lifecycle, base price, discount, category, and
  presentation data, but no inventory state or mutation version.
- Public Product reads currently require `ACTIVE` and a null `deletedAt`; they
  cannot exclude an out-of-stock tracked product because that fact is absent.
- Product admin updates currently call Prisma `update({ where: { id } })`, so
  two editors can silently overwrite one another.
- Order add-to-cart reads Product once and copies its current base price.
  Cart updates and checkout do not revalidate Product availability, price, or
  stock. Those are D2 defects and depend on Product first owning a stable
  availability contract.
- Product writes already pass through admin/root-admin guards, and Gateway
  uses the existing signed downstream request path. No evidence supports an
  authentication or service-boundary replacement for this work.

## Finding classification

### Confirmed defects

1. Product cannot represent whether a base product is inventory tracked or
   currently purchasable.
2. Admin scalar updates do not detect stale client state.
3. Public visibility cannot fail closed for depleted tracked products.

### Future D2 work

1. Cart lines must use the Product effective price rather than the undiscounted
   base price.
2. Checkout must revalidate price and availability and perform an atomic stock
   decrement before an order is committed.
3. The cart's legacy currency fallback must be removed in favor of Product's
   required shop-currency value.

### Future scaling considerations

Variants, multi-warehouse stock, reservations, and distributed inventory are
outside this base-product contract. They should extend this authority after
the ecommerce demo path works end to end.

## Adopted contract

### Persisted fields

- `trackInventory: boolean`, default `false`.
- `stockQuantity: integer`, default `0`, never negative.
- `version: integer`, default `1`, incremented whenever the Product row is
  mutated through Product commands.

Existing rows migrate to untracked inventory with quantity zero and version
one. That preserves their current public visibility.

### Inventory invariant

An untracked product must have `stockQuantity = 0`. A tracked product may have
zero or more units. Product validates the combined stored and requested state,
and database checks defend the same invariant against bypass writes.

### Availability

Availability is derived rather than stored:

- `AVAILABLE` when inventory is untracked or `stockQuantity > 0`.
- `OUT_OF_STOCK` when inventory is tracked and `stockQuantity = 0`.

Admin reads return either state. Public Product get/list only return
`AVAILABLE`, `ACTIVE`, non-deleted products. Gateway verifies the same public
visibility rule so a rolling-upgrade or upstream regression fails closed.

### Optimistic update concurrency

Admin Product patch requests must send `expectedVersion >= 1`. Product applies
the patch only when the persisted version matches, then increments the version
atomically. A missing row returns `product_not_found`; an existing row with a
different version returns HTTP 409 / the repository's existing gRPC conflict
mapping with `product_version_conflict`.

Bulk discount and lifecycle mutations increment `version` so an older scalar
patch cannot later overwrite their effects. Their existing command contracts
remain unchanged in this checkpoint.

## Compatibility and cost

- Protobuf fields are appended with new field numbers; existing field numbers
  remain unchanged.
- Existing Product rows keep their current behavior because inventory tracking
  defaults off.
- Product update clients must add `expectedVersion`. This is an intentional
  API tightening that prevents silent lost updates.
- The implementation reuses Product ownership, Prisma, the existing Gateway,
  and current auth/signing paths. It does not require a new service.

## Verification target

- Prisma schema and migration generation/build checks.
- Product unit coverage for inventory invariants, public visibility, version
  increments, stale versions, and missing targets.
- Gateway unit coverage for field mapping, response validation, public
  fail-closed behavior, and expected-version forwarding.
- Existing Product and Gateway focused test suites.
- Product/Gateway image builds and live checks after local tests pass.

## Implementation status

Implemented:

- Product Prisma fields and database constraints for tracked inventory,
  nonnegative quantity, untracked-zero consistency, and positive versions;
- derived availability plus Product and Gateway fail-closed public reads;
- owning-service combined-state validation for create and patch;
- atomic `id + expectedVersion` scalar updates with stable missing/conflict
  errors and version invalidation on lifecycle and bulk-discount mutations;
- additive protobuf fields, required Gateway patch version, OpenAPI, generated
  client, and the existing web BFF envelope adapter;
- focused Product and Gateway tests, including malformed input, stale writes,
  public visibility, and upstream-response validation.
- disposable Product migration verification that exercises database defaults,
  all three constraints, a valid tracked-stock transition, and transaction
  rollback without touching the development database.

Local verification completed:

- Product and Gateway builds pass.
- Product unit/validation suite: 11 suites, 65 tests passed before container
  deployment. After the final patch-validation correction and rebuilt Product
  image, the complete Product e2e suite passed 15 suites and 103 tests on
  2026-09-26.
- Gateway: 42 suites, 178 tests passed.
- Web compatibility tests: 6 suites, 15 tests passed.
- Generated API client: 5 tests plus browser and React Native type checks
  passed.
- Prisma schema validation, OpenAPI/generated-client stale checks, formatting,
  and changed-package builds pass.
- Product and Gateway lint have zero errors. Product retains the repository's
  existing test-only unsafe-`any` warnings.
- Backend tooling: 56/56 tests passed, including the new disposable Product
  database-contract verifier.

Container-backed proof completed after the development migration correction:

- Product and Gateway images were rebuilt with the inventory contract, and the
  Product migration was deployed to the Compose PostgreSQL database;
- Product e2e passed 15 suites and 102 tests, and the preserved F3 live suite
  passed all six flows on 2026-09-23; Product e2e passed again with 15 suites
  and 103 tests after the final patch correction on 2026-09-26;
- the 2026-09-26 generated-client D1 live proof passed tracked create, public
  availability, versioned stock depletion, stale-write rejection, out-of-stock
  public denial, and cleanup;
- all running Compose services reported healthy after the post-restart Taxonomy
  initializer completed.

The preserved F3 live suite passed all six flows again on 2026-09-26 after the
final `ProductPatchDto` image update. Product e2e and the D1 live proof also
exercised that updated image successfully. This closes the base-product
inventory and concurrency checkpoint; bounded variants remain the next D1
slice.

## Development deployment incident — 2026-09-23

The first rebuilt-container proof failed even though all eleven readiness checks
passed. Product HTTP and gRPC reads/writes returned Prisma `P2022` because
`Product.trackInventory` did not exist in the database used by the container.
The F3 anonymous catalogue flow consequently returned HTTP 500.

Root cause: the direct package-level Prisma command loaded the Product `.env`
and migrated `localhost:5432`. The repository Compose PostgreSQL endpoint is
`127.0.0.1:15432`, and the Product container connects internally to
`postgres:5432`. The disposable verifier had used the correct backend-tooling
override, so its proof remained valid but did not update the development
database.

Classification: **confirmed configuration defect**. The Product `.env.example`
documented the stale host port. It is corrected to `127.0.0.1:15432`. The
development migration must be rerun with the backend-owned database endpoint
before repeating live tests.

## Disposable migration proof

Completed on 2026-09-22 with:

```text
pnpm db:verify:product
```

Result:

- all five Product migrations applied successfully to disposable database
  `nebula_products_verify_b4e0fbd79eb5`;
- Prisma reported the schema up to date;
- the inventory verification transaction confirmed default
  `trackInventory=false`, `stockQuantity=0`, and `version=1`;
- the untracked-positive-stock, negative-stock, and nonpositive-version
  constraints each denied their probe;
- the valid tracked-stock/version transition succeeded;
- all verification writes rolled back;
- the backend verifier reported
  `Product inventory database contract verified: product-service`.

The Prisma 7 configuration deprecation warning is pre-existing maintenance
work. It did not affect this Prisma 6.16.2 migration proof.

## Live contract corrections — 2026-09-23 to 2026-09-26

The first generated-client inventory create was rejected by Gateway with
`unknown_field` for `trackInventory` and `stockQuantity`. The Gateway had a
separate request-field allowlist, and it had not been extended with the new
Product fields or required patch `expectedVersion`. This was a **confirmed
implementation defect**. The allowlist and focused tests now cover create and
patch requests. Gateway contract tests, build, and generated API checks passed.

After Gateway was rebuilt, tracked create and public read passed, but a
stock-only `{ stockQuantity: 0, expectedVersion: 1 }` patch returned HTTP 400.
The owning Product gRPC validator instantiated the patch as `ProductInputDto`,
which still required `title` at runtime despite the TypeScript `Partial` type.
This was a **confirmed implementation defect**. An explicit `ProductPatchDto`
now makes `title` optional for both HTTP and gRPC patch validation. The focused
gRPC regression passed 5 tests, and Product type check and build passed.

One Gateway build failed before compilation because Corepack attempted to
download pinned `pnpm` again in a descendant Docker stage and the registry
timed out. This was a **confirmed Dockerfile reproducibility defect**. Corepack
preparation now persists in the build-only base layer. The backend tooling
suite passed 56 tests and Dockerfile static checking passed. A later forced
Product build stalled when Docker Desktop's `_ping` endpoint returned HTTP 500;
that was a **local environment interruption**. A cached Product Bake build
subsequently completed and its runtime image was verified to contain
`ProductPatchDto`.

On the first full Compose restart after that build, Product readiness remained
503 while the default Taxonomy category initializer retried. The initializer
eventually succeeded, Product's subsequent readiness probes returned 200, all
running services became healthy, and the generated-client D1 live proof passed
all six steps. No Product health or API failure persisted after dependency
initialization.
