# D2 Cart, Checkout and Order exit proof

Accepted: 2026-10-28. D2 Batches 0-4 are complete for the default-site,
single-realm, demo-payment backend. This is feature/demo acceptance, not B0
release sign-off or hosted acceptance of the latest uncommitted tooling.

Subsequent maintenance changes Media presign responses with required signed
upload headers and an additive protobuf map. The dated D2 receipts below remain
historical functional evidence; they do not certify those new Media/Gateway/
generated-client inputs. Current-snapshot acceptance is tracked by the
[storage integration slice](2026-10-28-seaweedfs-transition.md).

## Requirement-to-evidence ledger

| Gate                                                            | Accepted evidence and scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cart ownership, base/variant selection, exact totals and bounds | [Batch 1 execution](2026-10-13-d2-batch1-execution.md): verified authority/input and actual codec checks, owned PostgreSQL preservation/constraint/rollback/concurrency, native deployment and operator-passed Cart/D1/F3 regressions.                                                                                                                                                                                                                                                                                                  |
| Checkout revalidation, immutable snapshots and durable replay   | [Checkout coordination closure](2026-10-14-d2-checkout-coordination.md#batch-2-closure-2026-10-19): exact base/variant/free totals, current commercial validation, original response/key replay, competing work and original Cart protection. Operator-passed Checkout/Cart/F3 and separate cache-loss/Product-outage/Order-restart recovery.                                                                                                                                                                                           |
| Product-owned stock and recovery                                | [Stock proof](2026-10-14-d2-stock-execution.md), [restoration proof](2026-10-19-d2-stock-restoration.md): actual SQL/Prisma atomic effects, no oversell, compensation/finalization/tombstones, versions, variants, unmanaged stock, rollback and replay. Remote publication/transport are stubbed in owner SQL; real signed transport is covered separately.                                                                                                                                                                            |
| Admin reads, permitted transitions, audit and authority         | [Batch 3 closure](2026-10-28-d2-batch3-exit.md): owner SQL race/atomic audit/replay plus operator-passed deployed Gateway admin Order/status live. Personal routes remain owner-only; app/role/unknown-authority input restrictions remain enforced.                                                                                                                                                                                                                                                                                    |
| Explicit unpaid Order cancellation                              | Supplied full [cancellation transcript](2026-10-28-d2-order-cancellation-live.md#operator-result---2026-10-28): stock restored once for base/variant, unmanaged stock unchanged, version/role/key/terminal denial, immutable original Checkout replay and owned cleanup. Earlier cancellation owner SQL/recovery remains separately scoped.                                                                                                                                                                                             |
| Demo payment lifecycle                                          | Operator-passed [payment Gateway proof](2026-10-24-d2-demo-payment-transports.md#operator-deploymentpayment-result---2026-10-28), earlier complete two-owner SQL recovery/race/rollback. UNKNOWN stays processing; confirmed failed/cancelled attempt releases once and returns PENDING; retry revalidates/reserves; successful first allocation is not deducted twice. No real provider settlement.                                                                                                                                    |
| Contract parity                                                 | Current freshness/preflight: 4 suites/23 tests pass. Existing 81 Gateway operations and exact inventories preserved; DTOs/protobuf/signed clients/OpenAPI/generated SDK and previous codec evidence reconciled. No server contract changed during Batch 4.                                                                                                                                                                                                                                                                              |
| Clean migrations and native fixtures                            | Verified decoded [hosted job 122140756637](https://github.com/pain1122/nebulaNV/actions/runs/40489398015/job/122140756637), commit ba181dcf6d6e3773e5bc0290cb7c7d71d509b1a4: clean Product 12/Order 11 migration deploy/status, current-tail populated metadata upgrade/rollback/rerun, Order 14 suites/202 tests and Product 22 suites/204 tests, including native HTTP/gRPC. Current relevant app/proto/client/SDK/Docker source matches that commit. Local Oct 28 deploy reruns report no pending migrations and both statuses pass. |
| Repeatable showcase and limits demo                             | Salar reports both complete seed/verify/seed/reset/seed/verify cycles passed without errors; exact stdout/counts were not supplied. The runner asserts seven current-generation Orders, three products, deterministic stock/commercial facts and editable Cart. Limits also proves the real quantity maximum on one free line and zero/maximum-plus-one denial. Separate profiles/customer/journals avoid consuming D1 or another Cart.                                                                                                 |
| Host fixture quality and compatibility                          | Corrected final CI-flags run: 45/45 Node tests (28 D1, 17 D2), zero failures/skips. Actual Gateway envelope factories/generated SDK/demo wrapper regression covers empty/nonempty lists and full seed/recovery/reset/recreation. DTO source validation, syntax/lint/types/format/diff pass. Domain effects remain mocked in these fixture tests; actual demo acceptance is the preceding operator evidence.                                                                                                                             |

Exact traces, failure corrections, commands and observed versus reported scopes
are retained in the [Batch 4 execution receipt](2026-10-28-d2-batch4-execution.md).
The initial Product-list envelope defect and its too-permissive mock are recorded,
fixed in both seed/reset consumers and protected by a full envelope/SDK regression.
The earlier passing fixture count did not certify that boundary; corrected live
cycles now do. No test assertion, inventory/hash or coverage was weakened.

## Reset and proof limits

Reset removes only owned working catalogue/Cart fixtures and cancels eligible
owned unpaid work. Paid/fulfilled and other immutable Order/receipt history,
the ordinary customer and archived generation/key references remain. Fresh
generation IDs/keys prevent cache/key reuse. There is no new Order deletion API,
silent database wipe or credential storage in journals. Normal Cart expiry can
be refreshed without a new Order; daily verify does not extend the seven-day
Checkout full-replay contract. [Operator workflow](../architecture/d2-demo-workflow.md).

Owner SQL fault/race evidence is distinct from live transport evidence. No new
explicit-cancellation transport-outage run is claimed. Hosted Order/Product
counts include unit and integration tests, not hundreds of live-only cases.
Existing optional Media database coverage retains two skipped suites/eleven
tests. Existing Prisma configuration deprecation warnings remain visible.

## B0 handoff and remaining release work

The subsequent [dependency assessment](2026-10-28-dependency-maintenance-assessment.md)
found installed/runtime dependency drift: sampled Product and Media images have
older Nest/gRPC packages than the current lockfile. Source parity and the D2
functional proofs above remain accepted; they are not dependency/security
currency claims. The subsequent [host frozen realignment](2026-10-28-package-realignment.md#completion-receipt---2026-10-28)
now passes; the selected image cohort still requires rollout before B0 dependency
sign-off. The MinIO security/support finding is also a
separate B0 maintenance decision, not a failed D2 functional proof.

The deterministic D2 template provides the Gateway/generated-client Cart,
Checkout, order-read and permitted admin transition journey. Combine it with
the accepted D1 product/variant/Taxonomy/Media proof for B0's final integrated
release evidence. D2 acceptance does not mark those B0 checklist rows complete.

Before B0 sign-off: perform Salar's post-D2 dependency/container-base currency
review, validate compatible updates and stage necessary major migrations.
Retained older versions require concrete compatibility/replacement reasons,
maintenance/security status and an upgrade path. Current local changes remain
uncommitted; a new hosted CI run has not certified that tooling snapshot.
Publishing/current-snapshot CI is a remaining repository/release task; prior
hosted evidence is reused only for the exact unchanged server inputs above.

Real payment providers, paid refunds/fulfilled reversals, cloud/CDN, file manager,
frontend and tenant/realm expansion remain outside this D2 acceptance.
