# D2 explicit Order cancellation live proof

Requirement: finish Batch 3's existing approved unpaid Order cancellation gate.
Confirmed proof gap: the Checkout driver covers manual paid/status controls;
the payment mode cancels a payment attempt and returns the Order to PENDING.
Neither invokes explicit Order CANCELLED and observes restored Product stock.
The deployed owner already implements the required operation; no replacement,
new route/schema or production behavior is needed.

## Before-edit consumer trace and bounded approach

| Exact path                                                                                                                                       | Disposition                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/order-service/src/order/order-cancellation.ts`                                                                                             | Inspected version/role/key-bound restoration and completed replay; unchanged.                                                                                                   |
| `apps/order-service/src/order/order-status.ts`                                                                                                   | Existing transition/audit authority; unchanged, passing owner SQL preserved.                                                                                                    |
| `apps/product-service/src/product/checkout-stock.service.ts`                                                                                     | Existing finalized restoration primitive and SQL proof; unchanged.                                                                                                              |
| `packages/api-client/test/d2-checkout-live.mjs`                                                                                                  | Add mutually exclusive cancellation mode to the existing owned Checkout fixture; preserve normal/admin/payment/recovery branches and cleanup.                                   |
| `packages/api-client/test/d2-order-cancellation-live.mjs`                                                                                        | New bounded Gateway helper: role/version-conflict denial, CANCELLED version, base/variant stock restored once, unmanaged stock unchanged, exact key replay and terminal denial. |
| `packages/api-client/test/d2-order-cancellation-live.test.mjs`                                                                                   | New focused fixture tests reject missing/double restoration and weakened denial. Mock evidence only; live remains operator-owned.                                               |
| `package.json`, `packages/api-client/package.json`                                                                                               | Add one explicit live alias; include focused helper regressions in existing client test command. No dependency/lock change.                                                     |
| `packages/api-client/src/generated.ts`, `apps/gateway/src/contracts/routes/order.routes.ts`, `apps/gateway/src/contracts/inputs/order.inputs.ts` | Existing admin status operation/schema reused; no count/hash/contract changes or generated edits. Run preflight before handoff.                                                 |
| `.github/workflows/ci.yml`                                                                                                                       | Existing client test invocation includes new focused helper tests through the package alias; no new job or live CI mutation.                                                    |
| `docs/current-focus.md`, `TODO-ALTERNATIVE.md`, `docs/packages/api-client.md`                                                                    | Record command, passed admin/payment checkpoint, and cancellation proof pending until supplied.                                                                                 |
| `scripts/demo/runner.mjs`, existing Cart/F3/Checkout recovery helpers                                                                            | Unchanged: no new shared demo records or behavior. D2 template remains Batch 4.                                                                                                 |
| Dockerfile/Compose/Bake and Order/Product migrations                                                                                             | Unchanged. Running images already contain the operation; no rebuild/migration needed.                                                                                           |

Execution: add only the fixture mode/helper and meaningful regression checks;
complete syntax/lint/format, focused tests, contract preflight and final consumer
review. Preserve Oct 27 eight-owner/125-file no-emit test-type evidence because
no backend TS/test/helper, shared producer or Prisma schema changes. Hand off
only the new Gateway live command, then update Batch 3 from actual results.

## Starting evidence - 2026-10-28

Salar reports the scoped Order/Gateway startup, `pnpm test:d2:orders:live` and
`pnpm test:d2:payment:live` all ran without errors. Exact stdout/counts were not
supplied; record them as operator-reported passes. Agent inspection confirms
Product, Order and Gateway running/healthy. The Product restoration migration
and all eleven Order migrations are applied, as recorded in the transport
resumption receipt. Prior owner SQL, contract, focused and native watch evidence
is preserved. Explicit Order cancellation live proof is still pending.

Status: preparation complete and actual Gateway live proof passed on
2026-10-28. The original handoff receipt below is preserved; its pending proof
status is superseded by the final result.

Preparation correction: a fresh Order starts at version 1 and status DTOs require
at least 1. A zero-version probe would return validation 400 instead of proving
an owner conflict. Inspecting the real Gateway DTO and Order intent validator
caught this before handoff. The negative now uses current version plus one,
which is valid input but conflicts with the stored version. The focused fixture
explicitly enforces the same minimum. No server validation/expectation weakened.

## Final consumer review and handoff receipt

The new helper is selected only by `--cancellation`; recovery/payment modes are
mutually exclusive. Actual driver subprocesses reject both conflicting flag
combinations before any Gateway connection. Original normal/admin/manual-paid
logic and owned cleanup are preserved. Payment uses the unchanged two-quantity
stock result; only cancellation adds a read of the unmanaged fixture and asserts
`trackInventory=false`. Replay checks preserve exact original key/body and the
existing driver verifies the original Checkout response remains immutable.

Root/package aliases agree. New focused tests are included in the existing
client `test` alias, reached by CI's `test:external-client` command. The complete
existing 81-operation inventory and strict DTO/input profiles are unchanged;
generated files stay untouched and freshness/preflight pass. No new provider,
authority input, source/schema/build/runtime behavior or live CI job is added.
SQL/seed/owner/Docker consumers listed above remain unchanged for those reasons.
The added test's explicit Node `URL` import corrects a scoped lint preparation
failure; no global lint exemption was added.

Observed preparation:

- Client forwarding, Checkout recovery, payment fixture and cancellation fixture:
  **36 Node tests pass**, zero skipped/failures. This includes five new
  cancellation tests and detects absent restoration, double credit and role
  acceptance. Separate run with `CI=true`/`GITHUB_ACTIONS=true`: **5/5 pass**.
  These are fixture/orchestration checks, not real stock or Gateway evidence.
- `pnpm test:preflight`: freshness and **4 suites / 23 tests pass**. Its stderr
  PASS lines appear inside PowerShell's NativeCommandError formatting in the
  redirected log; the command exits zero and Jest reports zero failures.
- API-client no-emit types, changed-module Node syntax and scoped ESLint pass.
  Changed JSON/MJS/docs pass scoped Prettier and `git diff --check`.
  Evidence logs: `.ci-evidence/d2-cancellation-focused.log`,
  `d2-cancellation-ci-focused.log` and `d2-cancellation-preflight.log`.
- No backend TS/test/helper, shared producer or Prisma schema changed. Preserve
  the Oct 27 eight-owner/125-file no-emit backend test gate and earlier passing
  owner SQL; no newly added untyped backend test is hidden by that decision.
- Product/Order/Gateway are observed healthy after the operator's successful
  admin/payment deployment. No server/image source changed in this slice;
  **no rebuild, migration, reset or repeat of those live proofs is required**.

Next operator-owned command:

```powershell
pnpm test:d2:cancellation:live
```

Expected: three cancellation markers, the original Checkout replay marker and
existing cleanup marker, with exit zero. Existing nonempty demo Cart refusal and
production refusal remain intact; only owned fixture records are cleaned and
Order history is retained. Real explicit cancellation/stock effects remain
PENDING until this command passes. Prior two-owner SQL provides separate
recovery/race/audit evidence; this new proof covers successful signed transport
and no-double-credit behavior, not a new outage exercise. Batch 4 fixture/exit,
real payments/paid refunds and dormant F4 compatibility remain separate.

Readiness: READY FOR EXPLICIT ORDER CANCELLATION LIVE PROOF.

## Operator result - 2026-10-28

Salar supplied all eight successful driver/helper markers, including:

- Exact base/variant Checkout stock effects, owner denial and original-key replay
  preserving a new Cart.
- Role/version conflict preserving Order and stock.
- CANCELLED Order with base/variant stock restored exactly once and unchanged
  unmanaged stock.
- Changed-intent/terminal conflicts and replay without double credit.
- Cancellation preserving the original Checkout reply.
- Owned catalogue/Cart/session cleanup.

The driver explicitly retains demo Order/receipt history and the reusable other
customer identity. Cache-loss/service-outage transport proofs remain separate;
the earlier accepted Checkout recovery and owner SQL evidence is not relabeled
as a new cancellation outage exercise. No new count of Jest tests, database
rows or audit events is inferred from these markers. The named live proof is
passed. [Batch 3 closure](2026-10-28-d2-batch3-exit.md) records the combined
evidence and remaining D2 exit work.
