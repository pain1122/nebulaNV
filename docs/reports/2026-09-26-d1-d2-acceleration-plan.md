# D1-D2 Backend Ecommerce Acceleration Plan

Date: 2026-09-26

Status: adopted execution cadence for the remaining B0 work.

## Objective

Reach the frontend-independent B0 Backend Ecommerce Release through the
existing Gateway and generated client while reducing rebuilds, repeated broad
test runs, and environment recovery time. Correctness, migration proof, public
visibility, authorization, rollback, and gateway-only live evidence remain
required.

This plan changes execution cadence, not D1/D2 product scope. Frontend, Vite
admin, tenant, file-manager, production-payment, and broad storage work remain
outside B0.

## Confirmed Sources Of Lost Time

1. The shared backend Dockerfile compiles all backend workspaces before
   extracting one runtime image. `TURBO_FORCE=1` bypasses useful Turbo results
   for every workspace.
2. Image builds were repeated while a vertical contract slice was still being
   debugged.
3. A failed Buildx run retained the preceding image, which initially looked
   like a stale-image problem. The failure was a repeated Corepack download;
   the Dockerfile now persists the pinned package manager in `build-base`.
4. TypeScript's `Partial<T>` did not make Product patch validation optional at
   runtime. The explicit `ProductPatchDto` correction and regression test now
   cover stock-only zero-quantity updates.
5. Docker Desktop became unresponsive during a forced all-service build after
   restart. Its `_ping` endpoint returned HTTP 500 and the build log stopped
   advancing.

Classifications:

- repeated Corepack download: confirmed Dockerfile reproducibility defect,
  corrected;
- Product patch runtime metadata: confirmed implementation defect, corrected
  locally;
- forced all-service recompilation: optional build-performance hardening, not a
  B0 feature gate;
- Docker Desktop `_ping` failure: local environment interruption.

## Execution Rules

1. Work in complete vertical slices: schema and migration, owning service,
   proto, Gateway, OpenAPI/client, focused tests, then live proof.
2. Do not build an image while the slice is still failing local type, unit,
   contract, or migration checks.
3. Generate OpenAPI and the client once near the end of a contract slice, then
   run the stale check once after generation.
4. Use normal Bake cache by default. Use `TURBO_FORCE=1` only after evidence of
   an incorrect Turbo artifact, not as a routine freshness mechanism.
5. Recreate only the changed runtime containers. Do not run broad backend boot
   or rebuild unrelated services for a Product-only or Order-only change.
6. Run focused tests during implementation. Run each package's full relevant
   suite once at slice exit. Run cross-service and live regression gates once
   at D1 exit and once at D2/B0 exit.
7. Commit and push every stable vertical slice. Do not accumulate another
   multi-week uncommitted checkpoint.
8. Preserve the paused F4 stash and avoid frontend changes except existing
   generated-contract compatibility.

## Immediate Recovery And D1 Inventory Closure

1. Cancel the stalled forced Product build and restart Docker Desktop/WSL.
2. Retry the Product image with normal cache:

   ```powershell
   docker buildx bake product-service --load --progress=plain *> product-build.log
   ```

3. Verify the new image contains `ProductPatchDto`, then recreate only
   `product-service`.
4. Run backend health and `pnpm test:d1:product:live`.
5. If the live proof passes, run the focused Product validation suite and the
   preserved F3 live flow. Do not repeat already-passing broad suites unless a
   changed boundary makes them relevant.
6. Update the inventory/concurrency report with the Gateway allowlist defect,
   runtime patch-metadata defect, Dockerfile correction, and final live result.
7. Remove local build logs, perform status/diff checks, commit, and push this
   checkpoint before starting variants.

## Remaining D1 Slices

### Slice D1-V: Bounded Variants

- Add the variant persistence model, migration, option values, deterministic
  ordering, active/deleted state, SKU uniqueness, price/stock overrides, and
  explicit optimistic concurrency.
- Reuse the base-product inventory and availability rules rather than creating
  an advanced inventory subsystem.
- Carry the slice through Product, proto, Gateway, OpenAPI, generated client,
  migration proof, and focused live behavior before rebuilding images.
- Build Product and Gateway once at slice exit.

### Slice D1-R: Taxonomy, Media References, And Currency

- Confirm and preserve the minimum existing Taxonomy relationships; add no
  speculative category, brand, or tag model.
- Introduce only the Media-ID and semantic-role contract needed by products.
  Preserve legacy URL migration compatibility and avoid a file-manager or
  provider abstraction.
- Reuse the completed Product shop-currency authority checkpoint. Carry the
  shared currency invariant into Order during D2 instead of redesigning it in
  D1.
- Define fail-closed behavior for missing or unavailable dependencies and prove
  transaction rollback.
- Build affected images once at slice exit.

### Slice D1-X: Contract And Exit Proof

- Complete only the public catalogue and admin operations required by B0 and
  later Vite-admin integration.
- Add deterministic active, draft, archived, base, and variant fixtures.
- Run migration upgrade/rerun/malformed-data/rollback evidence, package exit
  suites, generated-client checks, Gateway-only live flows, and final health.
- Produce the D1 exit report, update the roadmap checkboxes supported by exact
  evidence, commit, and push.

## D2 Slices

### Slice D2-A: Cart And Commercial Validation

- Audit existing cart ownership and mutations before changing them.
- Add base/variant selections, selected-option snapshots, deterministic
  quantities/totals, and authoritative lifecycle, availability, currency,
  price, and stock validation.

### Slice D2-B: Idempotent Demo Checkout

- Implement bounded replay/conflict behavior, atomic stock decrement suitable
  for the demo, immutable commercial snapshots, and complete rollback.
- Keep the flow explicitly demo/no-production-payment and accept no payment
  credentials.

### Slice D2-C: Orders And External Contracts

- Finalize owner/admin reads, permitted status transitions, concurrency,
  idempotency, audit facts, and explicit response mapping.
- Prevent caller authority over user, price, totals, currency, status,
  application, or site.
- Carry the slice through Gateway, OpenAPI, generated client, focused tests,
  and one image build.

### Slice B0-X: Release Proof

- Run one deterministic generated-client workflow: admin authentication,
  product/variant publish, customer authentication, cart mutation, replay-safe
  demo checkout, order read, and one permitted admin transition.
- Prove visibility, ownership and role denial, replay, degraded dependencies,
  rollback, deterministic reset/reseed, and migration evidence.
- Run the broad B0 regression gate once, record limitations, commit, and push.

## Build And Test Budget

Planned expensive image checkpoints from the current point:

1. Product inventory closure;
2. D1 variants;
3. D1 references/contract exit;
4. D2 cart/checkout;
5. D2 order contracts/B0 exit.

An extra image build requires a concrete container-only failure or artifact
boundary change. Local focused checks remain available between those
checkpoints and should catch most defects before Docker is involved.
