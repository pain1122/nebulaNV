# Archived D1 and Core Media execution checklist

Last updated: 2026-10-12

Status: historical handoff snapshot archived on 2026-10-12 before the compact
D2 focus replaced it. This is not the active execution plan; use
[current-focus](../current-focus.md). Completed evidence and the D2 handoff
state below are preserved as recorded.

## Active Slice

D2 entry audit - cart, checkout and order backend.

D1 Batches 0-4 and F5 Core Media Batches A-C/integration are closed. Final
Product/Gateway/client quality, generated contracts and D1/F3 live checks pass.
The [D1 exit report](2026-10-12-d1-exit-report.md) distinguishes local
and operator-reported evidence and records deferred coverage. Seeders use real
Media processing. D2 starts with an audit, not an assumed implementation gap.
The authorized scope and evidence are recorded in the
[Media core execution plan](2026-10-05-media-core-execution-plan.md).

The adopted backend-first sequence is:

```text
D1 product/catalog Batches 0-3 (closed)
-> F5 Core Media processing and image tools (closed)
-> D1 Batch 4 deterministic fixtures and exit proof (closed)
-> D2 cart/checkout/order backend (current)
-> B0 Backend Ecommerce Release
-> wait for the user-supplied Vite admin
-> F7 admin integration foundation
-> D3 admin workflow proof
-> P0 Admin-Validated Ecommerce Demo
-> M2 -> remaining F5 consumer integration -> M5 -> M3S -> F8 -> F6 -> D5
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

The 2026-10-05 Media slice brings forward usable upload processing and the
requested resize/crop, saved view sizes, watermarking, and alt/title contracts.
Cloud/CDN work remains deferred to F9. Preserve original bytes, existing Media
IDs, access policy, and service ownership. The earlier 2-4 day estimate covered
promotion only; the expanded scope is estimated at 5-8 focused working days,
with integration and Docker build time uncertain.

Client IDs, origins, domains, proxy paths, and deployment addresses remain
environment/registry configuration. Local examples may exercise the contracts,
but they are not permanent production topology decisions.

## D2 Entry Audit

Mandatory before edits and broad handoff: follow the
[test preparation checklist](../testing/pre-suite-checklist.md), record the exact
consumer impact table, update it after implementation and write its handoff
receipt. Run `pnpm test:preflight` for contract changes. Known cheap preparation
failures block broad handoff; heavy proofs remain explicitly pending until run.

Unchecked items below are planned work. No D2 code change or completion is
claimed by the D1 sign-off.

- [ ] Trace current Cart/CartItem/Order/OrderItem schemas, migrations, DTOs,
      services, transactions, Gateway contracts, generated client and tests.
- [ ] Map verified user ownership, base/variant selection, quantity changes,
      totals, shop currency, Product lifecycle and stock validation at each
      owning boundary. Preserve mechanisms already meeting requirements.
- [ ] Inspect checkout replay/concurrency and Product stock mutation; identify
      actual partial-failure behavior before choosing decrement/reservation.
- [ ] Inspect order snapshots, public/admin response mapping, status changes
      and authorization. Record confirmed defects separately from stale docs,
      optional hardening and future scaling considerations.
- [ ] Produce a bounded D2 batch plan and commands from the verified findings;
      keep frontend, payments, cloud/CDN and tenant activation deferred.

## Preserved D1 Repository Truth At Entry

| Area               | Current implementation                                                                                                                          | D1 consequence                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Gateway            | F3 exposes generated, gateway-only external Auth, User, Settings, Media, Taxonomy, Product, Blog, and Order APIs                                | Preserve this boundary and close only proven Product contract gaps                                    |
| Product lifecycle  | `DRAFT`, `ACTIVE`, and `ARCHIVED` exist; public reads force active/non-deleted visibility and admin reads are separate                          | Keep the mechanism and extend it without weakening visibility                                         |
| Product model      | Product owns bounded base stock, derived availability, mutation version, and bounded variants alongside its existing commercial fields          | Preserve the verified Batch 1 contract while completing taxonomy, Media references, and D1 exit proof |
| Variants           | Bounded ProductVariant, shared SKU reservation, versioned mutation, and Gateway/client contracts passed Docker migration and live Gateway proof | Preserve this slice while completing D1-R and D1-X                                                    |
| Taxonomy           | Product validates category, brand, and ordered tag references through Taxonomy; default-category initialization exists                          | Preserve ownership and finish publication and legacy-row proof                                        |
| Media              | Media owns eligibility; Product validates thumbnail/gallery Media IDs, while legacy URL columns remain for reconciliation                       | Prove positive eligible references and dependency failure without a file-manager UI                   |
| Currency           | Product validates writes and public reads against the Settings shop currency; Order now reads the same setting for cart and checkout            | Prove the Order migration and live cart compatibility before Batch 2 exit                             |
| Product operations | Internal HTTP is limited, but the gateway already exposes all current gRPC management operations and generates client methods                   | Preserve the route boundary and repair its commercial data and response contracts                     |
| Orders             | Cart, checkout, order snapshots, ownership checks, and admin status mutation already exist                                                      | D2 will harden idempotency, stock, currency, transitions, rollback, and response mapping              |
| Frontends          | `apps/web` remains the compatibility client; the intended admin is an external Vite project and no storefront is required now                   | Do not change frontend source during D1/D2                                                            |
| Tenant work        | F4 R0-R5 is dormant and the paused R6.1 experiment is preserved in a named path-scoped stash                                                    | Preserve that stash untouched and make no tenant-isolation claim                                      |

## Finding Classification

| Finding                                                                      | Classification                  | Treatment                                                                           |
| ---------------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------- |
| Public/admin Product visibility separation exists and has focused tests      | Confirmed working mechanism     | Preserve and expand regression coverage only where behavior changes                 |
| Product variants were absent                                                 | Confirmed implementation gap    | Bounded variant slice implemented and locally verified                              |
| Product media was represented by unchecked URLs                              | Confirmed implementation gap    | Validated Media IDs and semantic roles implemented; legacy rows need reconciliation |
| Product and Order currency sources can drift                                 | Confirmed implementation gap    | Define one settings-backed shop-currency invariant across D1/D2                     |
| Some management operations lack gateway parity                               | Confirmed implementation gap    | Expose only the operations required by the admin ecommerce workflow                 |
| A new storefront is needed before backend work                               | Stale roadmap assumption        | Remove it from the D1/D2 entry and B0 exit gates                                    |
| The Vite admin must be converted or finalized now                            | Stale roadmap assumption        | Wait for its source, then integrate it during F7/D3                                 |
| Fixed production origins or BFF topology can be chosen now                   | Future deployment consideration | Keep them configurable and decide from client/deployment requirements               |
| Full storage-provider abstraction or file manager is required by D1          | Optional/deferred breadth       | Keep Media correctness; defer file-manager UI and M3S breadth                       |
| General tenant/site scoping is required for the default-site backend release | Deferred F4 work                | Preserve migration seams and state the single-site limitation                       |

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

## Completed Core Media Batches

Unchecked items remain exit requirements. Implementation progress and proof
are recorded separately in the checkpoint below.

### A - Reliable Upload Validation And Promotion

2026-10-05: the processing foundation is implemented. Media unit tests
(8 suites/90 tests), four focused orchestration tests, types and development
Compose checks pass. Salar reports the disposable database proof passed; the
additive demo migration was deployed and independently verified. The corrected
Media image built in 3m 19s. All eleven backend applications, scanner and
infrastructure containers are now running and healthy.

Salar supplied a complete passing processing live run: real scan/validate/
promotion/render, unchanged approved bytes after upload-key overwrite, infected/
corrupt/MIME/extension rejection, and cleanup. The logout idempotency omission
was corrected in the proof script. See the
[processing checkpoint](2026-10-05-media-processing-foundation.md) for
evidence and remaining integration/restart/populated-upgrade gates. The
[build incident](2026-10-05-media-build-stall.md) records the VM OOM and
scope/concurrency correction; no further image rebuild is currently required.

End-of-day checkpoint (2026-10-05): Salar supplied passing D1 ready-media
binding/render/blocking/cleanup and all six F3 regression flows, then stopped
for the day. Work is paused. Media HTTP/gRPC output is unreported; restart and
populated upgrade/rollback evidence remain outstanding. Preserve the passing
results and resume from those remaining checks, not from a fresh build.

Resumed on 2026-10-06 at Salar's request. Container sanity check passed: all
sixteen running containers are healthy, all eleven backend readiness checks
pass, no container restart loops are reported, and Media has no unfinished
migrations, queued jobs, expired leases, cleanup intents or verifier databases.
The scanner is responding normally and uses about 953 MiB on the 3.8-GiB VM.
No restart or rebuild was performed. Confirm yesterday's Media HTTP/gRPC result
before repeating that suite; remaining work is recovery and populated upgrade
evidence, then Batch B image tools.

Populated upgrade passed on 2026-10-06: eight legacy records preserved, three
jobs backfilled, failed-upgrade rollback and deploy rerun proved, disposable
database cleaned. Recovery passed scanner outage and approved delivery after
Media restart, then failed on a closed socket during admin status polling.
The [2026-10-06 proof checkpoint](2026-10-06-media-recovery-proof.md)
records both runs and corrections. Read-only recovery operations after restart
now share bounded reconnect handling; 15 client/recovery tests and focused
syntax/lint pass. All 16 containers are healthy and proof rows, cleanup intents
and verifier databases are absent. The subsequent recovery rerun passed
expired-lease recovery after worker restart, missing-source denial and cleanup.
Follow-up confirms all 16 containers healthy and no proof rows or cleanup
intents. Both proof commands now pass; no rebuild or repeat is needed. Media
HTTP/gRPC output was supplied on 2026-10-07: gRPC and 101 tests passed,
six database tests skipped, and all 20 HTTP tests failed from one closed socket
in their first setup login. A focused unchanged setup rerun passed. The
[HTTP setup checkpoint](2026-10-07-media-http-setup-failure.md) records
the intermittent failure and narrow test-helper corrections: consume health
bodies, close test connections, bound requests, never replay writes. Four
focused helper/login/health checks pass. Salar's full rerun then passed:
11 suites/124 tests, zero failures. Six disposable-database tests remain
intentionally skipped in test:e2e; `pnpm db:verify:media` owns their isolated
execution and its earlier reported evidence remains separate. Batch A
integration sign-off is now complete. No rebuild or repeat is required.

- [x] Verify actual object type, size, checksum, and safe image metadata.
- [x] Implement bounded durable jobs, leases, retries, recovery, and real
      malware scanning; scanner failures must not become CLEAN.
- [x] Preserve immutable source facts and prevent blocked/deleted resurrection.
- [x] Prove clean, infected, invalid, missing, unavailable, retry, and restart
      behavior before declaring ordinary upload promotion usable.

### B - Image Tools And Saved View Sizes

Started on 2026-10-07 after Salar reports the isolated Media database command
completed. The [image recipe checkpoint](2026-10-07-media-image-recipes.md)
records the pre-edit scope and first implementation: bounded, configurable
resize/crop recipes and text/approved-image watermarks, immutable input checks
and traceable output fingerprints. The initial engine checkpoint passed three
focused suites/56 tests, then 26 image tests after the crop regressions.

The saved-size integration is now implemented locally: Media-owned generation
and output tables, desired/approved pointers, lease recovery and bounded retries,
idempotent regeneration, atomic replacement, durable object cleanup, bundled
text font, signed admin Gateway operations and saved-preset delivery. New
verified sources get configured defaults; legacy records retain their existing
web compatibility. Local Media tests pass 11 suites/125 tests; focused Gateway,
client, types and tooling checks are recorded in the same report.

2026-10-10: Salar reports startup/health and both clean/populated Media database
proof commands passed; detailed output was not supplied.
Media/Gateway image builds are also reported complete; updated-container
startup exposed the missing demo migration. On 2026-10-10 the migration was
applied explicitly to Docker PostgreSQL on port 15432; direct Media readiness
now passes all probes. The package .env uses port 5432, so the earlier direct
migration command was corrected to supply the Docker datasource explicitly.
All eleven backend readiness checks and sixteen container health checks pass.
Salar supplied the complete passing saved-size live proof, including cropping,
watermarks, checksums, original preservation, denial cases and cleanup.
Salar then supplied passing Media HTTP/gRPC results (13 suites/157 tests;
11 isolated database tests intentionally skipped), D1 ready-media reference
checks including blocking and cleanup, and all six F3 flows. Batch B sign-off
is complete. No further rebuild or saved-size proof repeat is required.
Commands are in the [saved-size report](2026-10-07-media-image-recipes.md).
The demo migration is applied and deployment/live sign-off is complete.
Next: Batch C title/default-alt metadata and contextual Product text.

- [x] Generate versioned derivatives from immutable originals with configurable
      named thumbnail/card/detail/mobile presets and traceable recipes.
- [x] Implement bounded resize/crop and optional text/approved-image watermark
      recipes, saved outputs, idempotent regeneration, and atomic replacement.
- [x] Render only eligible saved presets; preserve protected/strict policy and
      deny arbitrary public transforms and raw-original exposure.

### C - Descriptive Metadata

Status: C1-C4 implemented and locally verified on 2026-10-10.
Batch B is closed. Salar reports all four C5 database proofs below passed without
errors on 2026-10-10. Salar also reports both demo migrations and the three
selected image builds passed, followed by updated container startup, backend
health and metadata live proof. Media integration output confirms 171 passed,
11 gated DB tests skipped. Product regression exposed three incomplete typed
fixtures and a stale raw-URL gallery fixture; corrected locally, all four
affected suites/41 tests passed. Salar reports the full Product rerun, D1
ready-media and F3 regressions passed. Batch C is closed.
Implementation and exact outcomes are in
the [Batch C checkpoint](2026-10-10-media-descriptive-metadata.md).

Completed database proofs (operator-reported passes):

```powershell
pnpm db:verify:media
pnpm db:verify:media:upgrade
pnpm db:verify:product
pnpm db:verify:product:metadata:upgrade
```

These commands own disposable databases. They do not migrate demo databases or
deploy new images. All eleven currently running backend services passed health
checks before deployment; updated-image health now also has an operator-reported
pass. Product's build now selects only
Product, matching Media/Gateway, instead of compiling all backend applications.
Leave demo migrations, image builds and Compose operations to Salar.
An unchecked item is a requirement, not a claim of implemented behavior.

#### Behavior Contract

Media owns reusable `title` and `defaultAlt`. Product owns contextual thumbnail
and gallery overrides. Existing gallery `alt` remains the override; add gallery
title and thumbnail title/alt without repurposing file names or storage keys.
Named derivatives inherit the source Media defaults rather than storing their
own descriptions. Implemented bounds are 200 characters for title and 180 for alt,
matching the existing gallery alt limit; support Unicode plain text.

| Input           | Partial update behavior                                | Product text resolution                              |
| --------------- | ------------------------------------------------------ | ---------------------------------------------------- |
| Omitted field   | Preserve the stored value                              | If no override is stored, inherit the Media default  |
| `null`          | Clear the Media default or remove the Product override | A removed override inherits the Media default        |
| `""`            | Store an intentionally empty value                     | Stay empty; explicit empty alt is decorative         |
| Nonempty string | Store validated text                                   | Product override takes precedence over Media default |

On creation, an omitted override starts in the inherited state. Changing a
Media default affects inherited placements only. Preserve all existing gallery
empty strings; do not fabricate text from filenames or rewrite historical alt.
Admin responses expose stored overrides and resolved values; public responses
provide effective title/alt for rendering. Clients escape text when displaying
it. Metadata edits must not alter original/derivative bytes, checksums, recipes,
approved generations, access classes, file names or processing jobs.

#### C1 - Presence Semantics And Migration Plan

- [x] Record the field-by-field update/read contract and exact transport
      representation of omitted, null and empty values before code changes.
      Confirmed gap: Gateway/gRPC currently collapse missing gallery alt to
      empty text. Preserve field numbers and correct this narrow mapping gap.
- [x] Plan additive nullable Media title/defaultAlt and Product thumbnail
      overrides/gallery title; retain the existing nullable gallery alt column.
      Primary files: both service `prisma/schema.prisma` files and new migrations.
- [x] Specify Media metadata revision checks and Product/gallery stale-edit
      checks, reusing Product's existing mutation rules where applicable.
      Stale writes return 409; unrelated image processing must not invalidate
      a metadata-only revision.
- [x] Define populated-upgrade, constraints and rerun fixtures that preserve
      IDs, existing alt values, eligibility and approved image facts.

#### C2 - Media Metadata

- [x] Implement bounded partial updates in `apps/media-service/src/media.service.ts`
      and metadata DTOs; follow existing access-lane authorization and reject
      unauthorized/deleted-record edits without adding a new access policy.
- [x] Add the update transport in Media HTTP/gRPC controllers and
      `packages/protos/media.proto`; return metadata through permitted reads
      and the existing Product-reference resolver.
- [x] Prove Unicode, bounds, omitted/null/empty handling, stale edits and
      unchanged image bytes/job/generation facts with focused tests.

#### C3 - Product Overrides And Inheritance

- [x] Extend `apps/product-service/src/product/` DTOs, service and controllers
      for thumbnail overrides, gallery title and editing an existing gallery
      entry; extend `packages/protos/product.proto` with explicit presence.
- [x] Resolve effective text through Media's service contract, once per unique
      Media ID per request; preserve eligibility checks and Gateway render paths.
      Do not copy defaults permanently into Product or read another service's DB.
- [x] Prove inheritance, explicit decorative alt, override reset, default edits,
      stale edits, gallery order and unchanged Product commercial invariants.

#### C4 - Gateway And Generated Contracts

- [x] Extend signed `packages/clients/src/media.client.ts` and `product.client.ts`;
      preserve dormant F4 proxy contracts and compile other proto consumers.
- [x] Update Gateway Media/Product DTOs, services, controllers and route/input
      manifests. Planned Media route: `PATCH /api/v1/admin/media/:id/metadata`.
      Thumbnail text uses existing Product create/update; gallery gets an entry
      metadata update under its existing route family. Apply existing permission,
      idempotency and validation conventions.
- [x] Regenerate Gateway OpenAPI and `packages/api-client/src/generated.ts`;
      prove input presence, response mapping and generated-client parity.

#### C5 - Local Verification And Grouped Deployment

- [x] Complete focused Media/Product/Gateway/client tests, types, proto consumer
      compilation and generated-contract checks before requesting image builds.
- [x] Prepare operator-owned clean/populated migration proofs and a metadata
      live proof. Record exact runnable commands before handing them over.
- [x] Receive operator-reported passes for both clean database proofs and both
      populated upgrade proofs; no full output or measured counts supplied.
- [x] Receive operator-reported passes for both demo migrations and selected
      Media/Product/Gateway image builds.
- [x] Verify container readiness, apply demo migrations using explicit Docker
      datasources, and build only affected images after local checks pass.
      Broad database/integration/live checks and image builds remain Salar-owned.

#### C6 - Exit Evidence And Handoff

- [x] Supply passing metadata live results, including permission denial,
      concurrent edits and all three text states (operator-reported).
- [x] Supply passing Media/Product integration results after deployment.
- [x] Prove Media default edits update inherited Product text while overrides,
      source checksums and approved derivative generations remain unchanged.
- [x] Supply populated-upgrade/rerun, D1 ready-media and F3 regression evidence;
      record operator-reported results separately from locally observed checks.
- [x] Close Batch C only after these gates pass, then continue Batch D and the
      D1 Batch 4 showcase/limits seeder handoff through the real Media lifecycle.

Blog-specific text, frontend editing UI, cloud/CDN and tenant activation remain
deferred. Blog and other proto consumers need compatibility compilation only.

### D - Integration And D1 Handoff

- [x] Prove Gateway upload/processing/editing/rendering and Product binding,
      including denial after source blocking and cleanup of derivatives.
- [x] Prove migration upgrade/rerun, restart recovery, and F3/D1 regressions.
- [x] Resume D1 Batch 4 showcase/limits fixtures through actual processing,
      without direct database promotion; record commands and exact outcomes.

## Preserved D1 Checklist

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
      See [D1 Batch 0 Product Contract And Data Audit](2026-09-15-d1-batch0-product-contract-data-audit.md).

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
[inventory/concurrency checkpoint](2026-09-22-d1-inventory-concurrency-checkpoint.md),
[shop-currency checkpoint](2026-09-19-d1-shop-currency-authority-checkpoint.md),
and [variant checkpoint](2026-09-26-d1-variants-checkpoint.md) record
schema, transport, migration, and live behavior. The 2026-09-28 closure review
confirmed service/DTO validation for lifecycle, selection mode, stock, options,
SKU, and currency; added a price-scale/range check matching `Decimal(18,2)` for
base prices and variant overrides; and passed Product unit tests (12 suites,
76 tests) and Product type checking. D1-wide populated-upgrade and cross-service
exit proof remain in Batch 4.

## Batch 2 - Taxonomy, Media References, And Shop Currency

Implementation checkpoint: [D1 Batch 2 references](2026-09-28-d1-batch2-reference-checkpoint.md)
and [Batch 2 exit check](2026-09-30-d1-batch2-exit-check.md).
The disposable Product database verifier and rebuilt-image reference live test
pass. Positive Media binding/rendering, later blocked-Media denial,
re-publication denial, and cleanup pass with a test-only local `READY/CLEAN`
fixture. The legacy demo Product was recreated through the seeder without
free-form tags. Public reads now recheck owners and shop currency, while Order
uses the same Settings key. The populated Order migration is applied and its
currency defaults are gone. On 2026-10-03 all eleven backend health checks
passed, Media/Product/Order used their rebuilt images, and all seven opt-in
reference live checks passed. The user also reported successful disposable
Order migration verification and Product live proof; Order integration passed
five suites/34 tests and all six F3 live flows passed. The user selected removal
of legacy URL fields from responses. The response change passes focused tests,
type checks, and the updated seven-check reference live flow on rebuilt
Product/Gateway images; all eleven backend health checks pass again. The user
also approved disabling the three deferred 3D/VR URL inputs. Gateway and Product
DTOs now reject them, Product no longer persists them, and 48 focused tests
plus both service type checks pass. The final rebuilt-container flow passed
all eight checks, including `deferred-url-inputs-denied=ok`, rendering,
blocked-Media denial, and cleanup. All eleven backend health checks pass;
Batch 2 is closed.
Keep the draft test data untouched during the basic backend contract work;
it is not created by the demo seeder and can be rebuilt or removed during Batch 4.

- [x] Confirm the minimum category, tag, and brand relationships required for
      the ecommerce release and use authoritative Taxonomy records.
- [x] Replace public product URL authority with validated Media IDs and semantic
      thumbnail/gallery roles while preserving a bounded migration path for
      existing rows.
- [x] Validate Media existence and permitted use through versioned service
      contracts; do not read the Media database or require a file-manager UI.
- [x] Define one settings-backed shop currency, normalize its representation,
      and align Product defaults/validation with the D2 Order contract.
      Product write authority is in the
      [shop-currency checkpoint](2026-09-19-d1-shop-currency-authority-checkpoint.md);
      Order alignment passes unit, clean migration, and rebuilt-container
      integration checks recorded in the Batch 2 exit check.
- [x] Define dependency failure behavior for Taxonomy, Media, and Settings so a
      degraded dependency cannot produce partially valid product state.
- [x] Add migration, compatibility, denial, ordering, missing-reference, and
      dependency-failure tests.

### Batch 2 Exit

- [x] Published products reference valid taxonomy and Media records.
      Owner validation and fail-closed public reads pass local tests and the
      rebuilt-container reference live flow, including blocked-Media denial.
- [x] Product price/currency state cannot contradict the configured shop
      currency accepted by Order.
      Product and Order use the same Settings key and deny mismatches;
      currency-change unit coverage and rebuilt-container regressions pass.
- [x] No storage credentials, provider URLs, or cross-service database reads
      enter Product contracts.
      D1 thumbnail/gallery writes require Media IDs. Legacy URL fields are
      removed from external response mappings and schemas, with stored data
      retained for audit. Updated rebuilt-container response proof passes.
      Deferred 3D/VR URL inputs are also disabled in DTOs, forwarding, and
      owner persistence; final rebuilt-container rejection proof passes.

## Batch 3 - Gateway And External Contract Completion

Basic inventory: [D1 Batch 3 contract inventory](2026-09-30-d1-batch3-contract-inventory.md).
Current review: [D1 Batch 3 contract review](2026-10-03-d1-batch3-contract-review.md).
The public/admin Product operation set is present; OpenAPI/client freshness,
browser/native compilation, focused caller-authority denial, and Product
conflict/outage envelopes pass. The final operation set contains 18 Product
Gateway operations. Corrected nullable numeric variant override metadata,
stale URL input-profile entries, and variant UUID path documentation pass six
focused suites/55 tests plus Gateway type/lint, API freshness, and client checks.
The user reports the full Gateway command sequence passed; six variant live
checks and all six F3 flows pass on the rebuilt Gateway. All eleven backend
health checks pass and the Gateway uses its current image. Batch 3 is closed;
Batch 4 lifecycle/fixture proof remains separate.

- [x] Define the minimum public catalogue and admin management operations for
      B0 and later Vite-admin integration.
- [x] Complete HTTP/gRPC/gateway/OpenAPI/generated-client parity for those
      operations, including variants, media roles, lifecycle, and concurrency.
- [x] Keep external DTOs separate from Prisma and internal proto shapes.
- [x] Preserve request IDs, gateway error envelopes, idempotency headers where
      applicable, actor-derived authority, and exact public/admin route policy.
- [x] Add negative coverage for caller-selected identity/site fields, hidden
      lifecycle access, role denial, invalid related records, conflicts, and
      degraded downstream services.
- [x] Prove browser and native TypeScript consumers compile against the
      generated client without fixing a production origin or deployment path.

### Batch 3 Exit

- [x] Every required catalogue operation is usable through the gateway and
      generated external client.
- [x] No external contract exposes Prisma, internal service addresses, S2S
      credentials, storage credentials, or trusted-context construction.
- [x] OpenAPI and generated client stale checks pass.

## Batch 4 - Deterministic Data And D1 Live Proof

Seeder scope: [D1 demo seeder replacement log](2026-09-30-d1-seeder-replacement-log.md).

2026-10-12 checkpoint: showcase default and limits-on-demand fixtures use real
upload/scan/promotion, saved sizes and metadata. Showcase has 18 Products/two
Media/seven taxonomies; limits has 122 Products/50 Media/71 taxonomies. Live
showcase reset/recreation/seed/verify/rerun, limits seed/verify, legacy Product
entrypoint integration and populated Product/Order upgrade/rollback proof pass.
Identity/setup and Blog seeds remain preserved. Final quality, generated-contract
and D1/F3 live regressions also pass; D1 exit is signed off in the
[exit report](2026-10-12-d1-exit-report.md).

- [x] Audit current base and demo seeders, retire only invalid fixtures after
      their replacement is ready, and recreate valid D1 demo records from
      scratch. Do not use the present local database contents as the fixture
      specification.
- [x] Audit the minimal Product/Blog seed path and unused showcase/limits draft;
      preserve all base/setup seeders. Product generator now delegates to D1
      showcase; Blog/base seeds and stored legacy records remain preserved.
      Operator reports `backend:seed` integration passed on 2026-10-12.
      Scope: [Batch 4 seeder checkpoint](2026-10-10-d1-batch4-demo-seeders.md).
- [x] Add deterministic active, draft, archived, base, and variant products
      covering taxonomy and Media relationships.
- [x] Implement catalogue definitions and ownership-journalled Gateway runner;
      Showcase creation/reset/recreation/verify/rerun and limits seed/verify pass.
- [x] Make seed/reset behavior safe to rerun and clearly non-production.
      Showcase reset/recreation, full seed, independent verify and rerun pass.
      Limits live capacity/pagination/denial proof now also passes.
- [x] Prove clean migration, populated upgrade, unchanged legacy facts,
      idempotent rerun, malformed-data denial, and transactional rollback for
      every new D1 migration.
- [x] Run gateway-only live create/update/publish/archive/read scenarios and
      prove anonymous visibility and admin denial boundaries.
- [x] Rerun focused backend quality, generated-contract, and relevant live
      regression gates.
- [x] Record exact commands, results, limitations, deferred behavior, and D2
      handoff in a dated D1 exit report.

## D1 Exit

- [x] Admin-authorized API clients can manage a complete default-site product,
      variants, taxonomy, commercial state, and governed Media references
      entirely through the gateway.
- [x] Anonymous API clients see only valid public products and cannot widen
      lifecycle, deletion, identity, application, or site scope.
- [x] The shop-currency contract is stable for D2.
- [x] Seeds, migrations, denial cases, dependency failures, and gateway-only
      live behavior pass.
- [x] No storefront, admin UI, file manager, production endpoint, payment,
      tenant, showroom, or AI completion is claimed.
- [x] D2 becomes the next active phase.

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

D1 is closed on 2026-10-12. Product passed 20 suites/163 tests; the external
client passed 15 tests and browser/React Native compilation. Gateway's corrected
full suite, all three D1 live proofs and F3 compatibility passed
(operator-reported). Product/Gateway/client lint/types, generated contracts,
populated upgrades, showcase/limits fixtures and backend readiness are recorded
in the exit report. Product lint has 170 nonblocking warnings; repository-wide
root-script lint and full F4/v3 coverage are not claimed clean or complete.

Start the D2 Entry Audit above. Read the existing order/cart implementation and
its consumers before proposing changes, then record findings and a bounded
implementation order. Do not repeat completed D1 suites, migrations, seeding,
image builds or resets without a new change/failure that justifies them.

Heavy builds, Compose operations and broad live/integration suites remain
operator-owned. The next milestone is Backend Ecommerce Release B0, followed
by integration of the separately supplied Vite admin. Frontend/admin work,
file-manager, cloud/CDN and tenant activation stay deferred.

The four post-R5 Media/metadata RPCs use guarded v2 paths; dormant v3 receiver
coverage is explicitly queued for F4 restart in `TODO-ALTERNATIVE.md`. The
preserved 59 R5 receivers remain checked, and the R6.1 experiment stash remains
untouched.
