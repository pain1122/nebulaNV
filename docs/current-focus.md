# Current Focus

Last updated: 2026-09-28

Status: active backend execution checklist.

## Active Slice

D1 - Default-Site Commerce Domain, backend implementation and proof only.

The adopted backend-first sequence is:

```text
D1 product/catalog backend
-> D2 cart/checkout/order backend
-> B0 Backend Ecommerce Release
-> wait for the user-supplied Vite admin
-> F7 admin integration foundation
-> D3 admin workflow proof
-> P0 Admin-Validated Ecommerce Demo
-> M2 -> F5 -> M5 -> M3S -> F8 -> F6 -> D5
-> AI0 -> M7 -> F9 -> resume F4 at R6.1
```

D4 client-driven storefront delivery is a separate non-gating track after B0.
It begins only when concrete client requirements exist.

`TODO-ALTERNATIVE.md` owns this order. F4 R0-R5 remains preserved at commit
`3285c00` and paused. Its implementation and restart state remain recorded in
the F4 depth audit and paused execution checklist.

Unchecked items in this file are planned work. They do not claim that the
behavior exists.

## Current Goal

Finish and harden the backend path from the existing core services through a
coherent default-site ecommerce workflow. Prove that workflow through the
public gateway, generated external client, integration tests, deterministic
fixtures, and live database evidence before depending on a frontend.

The current milestone does not build a storefront, import or modify the Vite
admin, implement a file-manager UI, select production client origins, or resume
tenant/realm work. When the Vite admin is supplied, it becomes a consumer of
the proven backend rather than a prerequisite for defining it.

Client IDs, origins, domains, proxy paths, and deployment addresses remain
environment/registry configuration. Local examples may exercise the contracts,
but they are not permanent production topology decisions.

## Repository Truth At Entry

| Area               | Current implementation                                                                                                                          | D1 consequence                                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Gateway            | F3 exposes generated, gateway-only external Auth, User, Settings, Media, Taxonomy, Product, Blog, and Order APIs                                | Preserve this boundary and close only proven Product contract gaps                                           |
| Product lifecycle  | `DRAFT`, `ACTIVE`, and `ARCHIVED` exist; public reads force active/non-deleted visibility and admin reads are separate                          | Keep the mechanism and extend it without weakening visibility                                                |
| Product model      | Product owns bounded base stock, derived availability, mutation version, and bounded variants alongside its existing commercial fields          | Preserve the verified Batch 1 contract while completing taxonomy, Media references, and D1 exit proof        |
| Variants           | Bounded ProductVariant, shared SKU reservation, versioned mutation, and Gateway/client contracts passed Docker migration and live Gateway proof | Preserve this slice while completing D1-R and D1-X                                                           |
| Taxonomy           | Product-scoped taxonomy facade and default-category initialization exist                                                                        | Preserve ownership; prove category/tag/brand needs against current taxonomy contracts                        |
| Media              | Media-service owns media policy, while Product currently stores URL strings and does not validate Media records                                 | Replace product-facing URL authority with the minimum validated Media-reference contract; no file-manager UI |
| Currency           | Product validates writes against the Settings shop currency; Order still has a separate cart default                                            | Align Order during D2 without reopening Product's completed write authority                                  |
| Product operations | Internal HTTP is limited, but the gateway already exposes all current gRPC management operations and generates client methods                   | Preserve the route boundary and repair its commercial data and response contracts                            |
| Orders             | Cart, checkout, order snapshots, ownership checks, and admin status mutation already exist                                                      | D2 will harden idempotency, stock, currency, transitions, rollback, and response mapping                     |
| Frontends          | `apps/web` remains the compatibility client; the intended admin is an external Vite project and no storefront is required now                   | Do not change frontend source during D1/D2                                                                   |
| Tenant work        | F4 R0-R5 is dormant and the paused R6.1 experiment is preserved in a named path-scoped stash                                                    | Preserve that stash untouched and make no tenant-isolation claim                                             |

## Finding Classification

| Finding                                                                      | Classification                  | Treatment                                                                         |
| ---------------------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------- |
| Public/admin Product visibility separation exists and has focused tests      | Confirmed working mechanism     | Preserve and expand regression coverage only where behavior changes               |
| Product variants were absent                                                 | Confirmed implementation gap    | Bounded variant slice implemented and locally verified                            |
| Product media is represented by unchecked URLs                               | Confirmed implementation gap    | Introduce validated Media references and semantic roles through service contracts |
| Product and Order currency sources can drift                                 | Confirmed implementation gap    | Define one settings-backed shop-currency invariant across D1/D2                   |
| Some management operations lack gateway parity                               | Confirmed implementation gap    | Expose only the operations required by the admin ecommerce workflow               |
| A new storefront is needed before backend work                               | Stale roadmap assumption        | Remove it from the D1/D2 entry and B0 exit gates                                  |
| The Vite admin must be converted or finalized now                            | Stale roadmap assumption        | Wait for its source, then integrate it during F7/D3                               |
| Fixed production origins or BFF topology can be chosen now                   | Future deployment consideration | Keep them configurable and decide from client/deployment requirements             |
| Full storage-provider abstraction or file manager is required by D1          | Optional/deferred breadth       | Keep Media correctness; defer file-manager UI and M3S breadth                     |
| General tenant/site scoping is required for the default-site backend release | Deferred F4 work                | Preserve migration seams and state the single-site limitation                     |

## Execution Contract

Each D1 batch must:

1. inspect current schema, migrations, service code, transports, gateway DTOs,
   generated client output, seeds, and tests before changing a contract;
2. preserve working Auth, actor-policy, gateway envelope, S2S, taxonomy, media,
   and public-visibility mechanisms;
3. use the narrowest correction for a confirmed ecommerce gap;
4. keep external access gateway-only and service databases private;
5. make schema changes migration-safe and provide populated upgrade, rerun,
   rollback, and failure evidence when applicable;
6. keep the default-site/default-realm limitation explicit and avoid dormant
   F4 context-v3 activation;
7. leave broad Compose, full live suites, image builds, and other timeout-prone
   commands to Salar while running fast focused checks locally.

## Batch 0 - Product Contract And Data Audit

- [x] Build a field-by-field matrix across Prisma, HTTP DTOs, gRPC proto,
      gateway DTOs, OpenAPI, generated client types, seeds, and documentation.
- [x] Trace create, update, public read, admin read, archive/delete/restore,
      taxonomy, gallery, pricing, stock, and availability behavior end to end.
- [x] Record current uniqueness, concurrency, transaction, error translation,
      and authorization behavior with exact source/test evidence.
- [x] Confirm which existing advanced fields are dormant compatibility data and
      keep them outside the basic ecommerce contract.
- [x] Run focused Product, Taxonomy, Media, Settings, gateway, external-client,
      migration-status, and relevant live baselines.
      Product (24), Taxonomy (8), Media (30), Settings (12), and focused gateway
      Product (8) tests plus `pnpm api:check` pass. Product e2e passed 9 suites
      and 52 tests; F3 live passed all six flows; all nine Prisma services passed
      clean migration verification with zero disposable databases remaining;
      the final backend boot and all eleven readiness checks passed. Four
      baseline incidents and their narrow corrections are recorded in the D1
      audit.
- [x] Produce a dated D1 implementation matrix with confirmed defects separated
      from stale documentation, optional hardening, and future scaling work.
      See [D1 Batch 0 Product Contract And Data Audit](reports/2026-09-15-d1-batch0-product-contract-data-audit.md).

### Batch 0 Exit

- [x] Every D1 field and operation has one authoritative owner and an explicit
      external/internal exposure decision.
- [x] No schema or transport change is based only on a future frontend guess.
- [x] Existing passing behavior and rollback points are recorded.

## Batch 1 - Product Core, Lifecycle, And Variants

- [x] Repair the audited `effectivePrice`, discount-state/wire, create-price,
      and create/bulk omission defects across Product, gRPC, gateway, OpenAPI,
      generated client, focused tests, container-backed Product tests, and
      preserved F3 live flows.
- [x] Finalize required product fields: title, slug, excerpt, description, base
      SKU, lifecycle, availability, price, currency, and basic stock.
- [x] Preserve deterministic global slug/SKU uniqueness for the current
      single-site release and record the later F4 scoped-uniqueness migration.
- [x] Define and implement bounded variants with option values, variant SKU,
      price/stock overrides, active/deleted state, and deterministic ordering.
- [x] Reject invalid price, currency, stock, option, SKU, lifecycle, and
      availability combinations at the owning service boundary.
- [x] Define optimistic concurrency or another explicit lost-update behavior
      for admin mutations.
- [x] Keep public reads restricted to purchasable visible state and ensure
      hidden records cannot be revealed by caller-supplied filters.

### Batch 1 Exit

- [x] Base and variant products have deterministic validated commercial state.
- [x] Public/admin visibility, uniqueness, and concurrent mutation behavior are
      covered by focused service tests.
- [x] Product core contains no payment, showroom, recommendation, tenant, or
      storage-provider policy.

Batch 1 evidence: the
[inventory/concurrency checkpoint](reports/2026-09-22-d1-inventory-concurrency-checkpoint.md),
[shop-currency checkpoint](reports/2026-09-19-d1-shop-currency-authority-checkpoint.md),
and [variant checkpoint](reports/2026-09-26-d1-variants-checkpoint.md) record
schema, transport, migration, and live behavior. The 2026-09-28 closure review
confirmed service/DTO validation for lifecycle, selection mode, stock, options,
SKU, and currency; added a price-scale/range check matching `Decimal(18,2)` for
base prices and variant overrides; and passed Product unit tests (12 suites,
76 tests) and Product type checking. D1-wide populated-upgrade and cross-service
exit proof remain in Batch 4.

## Batch 2 - Taxonomy, Media References, And Shop Currency

- [ ] Confirm the minimum category, tag, and brand relationships required for
      the ecommerce release and use authoritative Taxonomy records.
- [ ] Replace public product URL authority with validated Media IDs and semantic
      thumbnail/gallery roles while preserving a bounded migration path for
      existing rows.
- [ ] Validate Media existence and permitted use through versioned service
      contracts; do not read the Media database or require a file-manager UI.
- [ ] Define one settings-backed shop currency, normalize its representation,
      and align Product defaults/validation with the D2 Order contract.
      Product write authority is complete in the
      [shop-currency checkpoint](reports/2026-09-19-d1-shop-currency-authority-checkpoint.md);
      Order alignment remains open for D2.
- [ ] Define dependency failure behavior for Taxonomy, Media, and Settings so a
      degraded dependency cannot produce partially valid product state.
- [ ] Add migration, compatibility, denial, ordering, missing-reference, and
      dependency-failure tests.

### Batch 2 Exit

- [ ] Published products reference valid taxonomy and Media records.
- [ ] Product price/currency state cannot contradict the configured shop
      currency accepted by Order.
- [ ] No storage credentials, provider URLs, or cross-service database reads
      enter Product contracts.

## Batch 3 - Gateway And External Contract Completion

- [ ] Define the minimum public catalogue and admin management operations for
      B0 and later Vite-admin integration.
- [ ] Complete HTTP/gRPC/gateway/OpenAPI/generated-client parity for those
      operations, including variants, media roles, lifecycle, and concurrency.
- [ ] Keep external DTOs separate from Prisma and internal proto shapes.
- [ ] Preserve request IDs, gateway error envelopes, idempotency headers where
      applicable, actor-derived authority, and exact public/admin route policy.
- [ ] Add negative coverage for caller-selected identity/site fields, hidden
      lifecycle access, role denial, invalid related records, conflicts, and
      degraded downstream services.
- [ ] Prove browser and native TypeScript consumers compile against the
      generated client without fixing a production origin or deployment path.

### Batch 3 Exit

- [ ] Every required catalogue operation is usable through the gateway and
      generated external client.
- [ ] No external contract exposes Prisma, internal service addresses, S2S
      credentials, storage credentials, or trusted-context construction.
- [ ] OpenAPI and generated client stale checks pass.

## Batch 4 - Deterministic Data And D1 Live Proof

- [ ] Add deterministic active, draft, archived, base, and variant products
      covering taxonomy and Media relationships.
- [ ] Make seed/reset behavior safe to rerun and clearly non-production.
- [ ] Prove clean migration, populated upgrade, unchanged legacy facts,
      idempotent rerun, malformed-data denial, and transactional rollback for
      every new D1 migration.
- [ ] Run gateway-only live create/update/publish/archive/read scenarios and
      prove anonymous visibility and admin denial boundaries.
- [ ] Rerun focused backend quality, generated-contract, and relevant live
      regression gates.
- [ ] Record exact commands, results, limitations, deferred behavior, and D2
      handoff in a dated D1 exit report.

## D1 Exit

- [ ] Admin-authorized API clients can manage a complete default-site product,
      variants, taxonomy, commercial state, and governed Media references
      entirely through the gateway.
- [ ] Anonymous API clients see only valid public products and cannot widen
      lifecycle, deletion, identity, application, or site scope.
- [ ] The shop-currency contract is stable for D2.
- [ ] Seeds, migrations, denial cases, dependency failures, and gateway-only
      live behavior pass.
- [ ] No storefront, admin UI, file manager, production endpoint, payment,
      tenant, showroom, or AI completion is claimed.
- [ ] D2 becomes the next active phase.

## Guardrails

- Do not create `apps/storefront` during D1/D2.
- Do not import, modify, convert, or scaffold the Vite admin until its source is
  supplied and B0 has passed.
- Preserve current `apps/web` and its F3 compatibility tests until D3 parity.
- Do not implement a file-manager UI or broad S3/provider abstraction.
- Do not activate Realm Auth, context v3, Tenant Authority, or general
  tenant/site scoping.
- Do not apply, edit, or drop the named R6.1 Realm Auth experiment stash.
- Preserve unrelated dirty work.

## Next Action

Batch 1 is closed. Execute D1-R, the Batch 2 taxonomy, validated Media-reference,
and shop-currency slice, following the
[D1-D2 backend ecommerce acceleration plan](reports/2026-09-26-d1-d2-acceleration-plan.md).
Preserve the Product currency authority already established; align Order's
currency and cart transitions during D2. After D1-R, complete Batch 3 contracts
and Batch 4 migration, fixture, rollback, and gateway-only live proof before
declaring D1 complete.
