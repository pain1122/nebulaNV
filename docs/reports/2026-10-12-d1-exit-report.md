# D1 final exit report - 2026-10-12

Status: D1 closed on 2026-10-12; D2 is active at its entry audit.

## Completed scope and evidence

D1 Batches 0-3 cover default-site Product fields, lifecycle, public/admin
visibility, bounded base inventory/variants, shared SKU uniqueness, versioned
mutations, taxonomy/Media ownership, configured shop currency and Gateway/
OpenAPI/generated-client parity. Earlier closure evidence is linked from
`docs/current-focus.md` and the dated batch checkpoints.

F5 Core Media A-C/integration is closed: actual upload validation/scanning,
promotion and recovery; immutable verified originals; saved resize/crop recipes
and text/image watermarks; title/alt edits and contextual Product inheritance.
This closes the early Core slice, not all later F5 consumer integration.

Batch 4 showcase reset/recreation/seed/verify/rerun, limits seed/verify and
`backend:seed` delegation passed. Showcase has 18 Products/two Media/seven
taxonomies; limits has 122 Products/50 Media/71 taxonomies. The operator reports
the corrected populated Product/Order upgrade proof passed without errors.
Seven native Prisma failure/recovery checks and one metadata SQL rollback,
successful deployments/reruns, preservation and denial checks are covered.
See the [upgrade proof](2026-10-12-d1-upgrade-exit-proof.md) and
[seeder audit](2026-10-12-d1-seeder-contract-audit.md).

## Final verification ledger

| Gate                                                   | Result                                        | Evidence source                                                 |
| ------------------------------------------------------ | --------------------------------------------- | --------------------------------------------------------------- |
| Product types                                          | Passed                                        | Local `pnpm --filter @nebula/product-service check-types`       |
| Gateway lint/types                                     | Passed                                        | Local scoped package commands                                   |
| External client lint/types                             | Passed                                        | Local scoped package commands                                   |
| OpenAPI/generated-client freshness                     | Passed                                        | Local `pnpm api:check`                                          |
| Product lint                                           | Passed after formatting correction            | Local package lint: zero errors, 170 nonblocking warnings       |
| Product integration suite                              | Passed: 20 suites/163 tests                   | Operator-supplied output                                        |
| Gateway suite                                          | Passed after inventory correction             | Operator-reported full rerun; final stdout/counts not supplied  |
| External client suite/browser/React Native compilation | Passed: 15 tests and both target compilations | Operator-supplied command output                                |
| Backend readiness                                      | Passed: ten active backend checks             | Operator-supplied output; dormant Realm Auth is not in this run |
| D1 Product/variants/ready-Media references live        | All three passed                              | Operator-reported final runs; full stdout not supplied          |
| F3 live compatibility                                  | Passed                                        | Operator-reported final run; full stdout not supplied           |

Confirmed stale formatting, recorded before correction: Product package lint
reports three `prettier/prettier` errors at lines 153-157 of
`apps/product-service/test/product-metadata.unit.spec.ts`. Format only that file,
then rerun Product lint. No behavior, migration, generated contract or image
change is required. Existing lint warnings remain visible; do not describe them
as absent. The separate root-script lint baseline is recorded in the seeder
replacement checkpoint and is not included in package lint claims.

Confirmed stale test expectations, logged before correction: Gateway now has
77 routes, 47 input profiles and 63 protected downstream RPCs, while aggregate
tests still expect 73/44/59. The OpenAPI path assertion omits Media metadata and
Product gallery metadata. Actual OpenAPI/generated-client freshness passes.

The Product/Media protobuf diffs were inspected: additions are the approved
Media reference, derivative and descriptive metadata contracts; existing field
numbers are preserved, and Gallery alt now has the approved optional presence.
Rebaseline only those two current-surface hash pins, preserving the other five
and the exact controller/manifest/OpenAPI assertions.

The R5 inventory predates four new protected operations: Media.GetDerivatives,
Media.RegenerateDerivatives, Media.UpdateMetadata and Product.UpdateImageMetadata.
Their current v2 controllers retain admin roles/validation; Media also retains
its allowed service caller checks. They have no dormant V3 receiver yet. The
adopted roadmap explicitly pauses F4; do not implement or activate v3 transport
to satisfy a stale all-future-RPC expectation. Keep the original 59 receivers'
exact declarations/signatures checked, assert the complete current count of 63,
and name/test precisely these four deferred additions. Unknown additions must
still fail the inventory assertion. F4 resumption must include these four
receivers; this sign-off makes no broader v3 coverage claim.

Implemented: exact route/profile counts and both missing OpenAPI paths are now
updated; Product/Media current-surface pins reflect the inspected approved
changes. The receiver inventory retains all 59 R5 declaration/signature checks
and tests the exact four deferred post-R5 additions separately. No runtime or
protobuf source changed. All four corrected suites pass locally (20 tests),
and scoped lint on the four changed test files passes. The operator owns the
final full Gateway rerun; the subsequent run passed (operator-reported).

## Limits and release decision

A separate full live limits rerun was not reported; its orchestration is locally
tested. Earlier Media recovery/upgrade/derivative/metadata proofs are preserved
and are not being repeated without a new relevant change. Frontend/admin,
file-manager, cloud/CDN, production payment and general tenant isolation are
outside this sign-off. F4 remains paused; no tenant/site isolation is claimed.

Salar subsequently confirmed the full Gateway rerun and all final D1/F3 live
checks passed. All required ledger entries now pass; D1 is signed off and D2 is
active at its evidence-first entry audit. No new image build or demo reset was
needed for these final test corrections.

D2 will harden cart/checkout/order ownership, base/variant selection and
snapshots, authoritative totals/currency/stock, idempotent checkout, failure
rollback and authorized order transitions. These are planned audit/implementation
items, not features certified by D1. Broader inventory and production payment
remain outside D2's bounded demo contract.
