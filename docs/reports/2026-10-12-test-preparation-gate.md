# Mandatory test preparation gate - 2026-10-12

User requirement: identify dependent files before changes, update/check them
afterward, and catch recurring preparation failures before broad test handoff.
Confirmed workflow defect: earlier handoffs did not consistently inspect all
inventory assertions or execute changed SQL fixtures before broad runs.

## Consumer impact and implementation

| Changed owner                  | Consumer inspected                                                                                                                                                           | Action/result                                                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| New checklist                  | AGENTS.md                                                                                                                                                                    | Mandatory dependency review and handoff receipt                                                                            |
| New checklist                  | AI_CONTEXT.md                                                                                                                                                                | Same gate required for future session/batch handoffs                                                                       |
| New checklist                  | docs/current-focus.md                                                                                                                                                        | Required before D2 edits and broad handoff                                                                                 |
| New checklist                  | TODO-ALTERNATIVE.md                                                                                                                                                          | Mandatory preparation added to roadmap evidence rules                                                                      |
| package.json test:preflight    | Gateway openapi:check and api-client generate:check                                                                                                                          | Reuse actual freshness commands; no generated source change                                                                |
| package.json test:preflight    | Gateway test/openapi-contract.spec.ts; test/contracts/route-policy.aggregate.spec.ts; test/contracts/input-profiles.aggregate.spec.ts; test/r5-v3-receiver-inventory.spec.ts | Reuse all four focused inventories; no assertion removed or changed                                                        |
| Conditional fixture/SQL checks | scripts/backend.mjs, scripts/backend.test.mjs, scripts/db/verify-d1-product-upgrade.sql, scripts/db/verify-d1-order-upgrade.sql                                              | Inspected existing fixture/error machinery; unchanged; mock and real SQL evidence explicitly separated                     |
| Seeder/runtime preparation     | scripts/demo/demo.test.mjs and dated seeder/recovery/build reports                                                                                                           | Existing behavior preserved; checklist covers observed limits, rate/reconnect/idempotency/cleanup and build-scope failures |

The checklist contains five ordered gates: dependency mapping, contract/fixture
review, cheap focused checks, runtime/command preparation, and handoff receipt.
It requires exact paths/results, justified non-applicability, explicit deferrals
and actual PostgreSQL checks for affected SQL. A pending heavy proof is not a
pass; it can only be delegated after its cheap prerequisites/fixture checks.

## Evidence and enforcement boundary

Formatting and diff checks pass. The new `pnpm test:preflight` command passed
locally: OpenAPI and generated-client freshness, followed by all four focused
inventory suites/20 tests. No broad suite, runtime behavior, schema or image
change is required by this workflow correction.

AGENTS.md/AI_CONTEXT.md enforce the preparation obligations on the assistant's
future work; the automated command catches the selected inventory/artifact
failures. Raw test commands are not globally intercepted. Neither documentation
nor this command can automatically prove every semantic consumer, SQL fixture or
container. The impact review and actual applicable evidence remain mandatory.

The previous instruction to repeat all migration/seed verifiers after every
stateful item now targets verifiers identified by actual dependency impact.
Unrelated passing evidence is retained with a reason; affected evidence must be
rerun after the change that invalidates it. This preserves verification while
avoiding routine repeated broad work.
