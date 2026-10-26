# D2 demo payment transports

## Before-edit requirement and dependency trace

Salar chose customer initiation and admin simulation/reconciliation. The proved
Order owner has `startDemoPayment` and `resolveDemoPayment`; missing transport
bindings are a confirmed implementation gap. Preserve the owner/migrations and
their passing actual SQL evidence. No provider, credential collection or generic
status bypass is introduced. Working tree: 271 entries, no staged changes.

Add only POST `orders/:id/demo-payment-attempts` and POST
`admin/orders/:id/demo-payment-attempts/:attemptId/outcome`, under `/api/v1` at
Gateway. Signed RPCs: `StartDemoPayment`, `ResolveDemoPayment`. Inputs carry only
expectedVersion and, for resolution, outcome; actor comes from verified context,
attempt ID from path, key from header. START maximum version 2147483645, OUTCOME 2147483646. Return explicit `{order, attempt}` with DEMO marker and fixed amounts.

| Owner/symbol          | Exact consumer paths                                                                                                                                                                                           | Required action/check                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Owner methods         | `apps/order-service/src/order/order.service.ts`, `demo-payment-contract.ts`, `demo-payment.ts`                                                                                                                 | Inspect/preserve proved lifecycle; adapt transports only                                                       |
| Native DTO/controller | `apps/order-service/src/order/dto/order.dto.ts`, `order.controller.ts`, `admin-order.controller.ts`, `grpc/order-grpc.controller.ts`                                                                           | Bind verified roles/actors/context/key and strict version/UUID/outcome input                                   |
| Native tests          | `apps/order-service/test/resource-authorization.spec.ts`, `order.http-validation.unit.spec.ts`, `demo-payment.unit.spec.ts`, `jest.unit.config.ts`                                                             | Forwarding, authority/validation and actual codec regressions; no native global startup                        |
| RPC                   | `packages/protos/order.proto`, `packages/protos/generated/order.ts`, `packages/clients/src/order.client.ts`, `packages/clients/test/service-wrappers.spec.ts`                                                  | Add two explicit signed methods and generate output; signed wrapper inventory                                  |
| Dormant inventory     | `packages/clients/src/dormant-v3.client.ts`, `packages/clients/test/dormant-v3-wrappers.spec.ts`, `apps/gateway/test/r5-v3-receiver-inventory.spec.ts`                                                         | Explicitly defer two additions under F4; retain 59 R5 and four private Product stock RPCs                      |
| Gateway policy        | `apps/gateway/src/contracts/routes/order.routes.ts`, `inputs/order.inputs.ts`, `test/contracts/route-policy.aggregate.spec.ts`, `input-profiles.aggregate.spec.ts`, `inputs/order.inputs.spec.ts`              | Exactly two routes/profiles; strict user/admin and idempotency policy                                          |
| Gateway binding       | `apps/gateway/src/order/order-api.dto.ts`, `gateway-order.controller.ts`, `gateway-order-api.service.ts`, `apps/gateway/test/order-http.spec.ts`, `gateway-order-api.service.spec.ts`                          | Explicit mapping/identity/version/state checks; extend complete raw mock to avoid bind failures                |
| OpenAPI/SDK           | `apps/gateway/test/openapi-contract.spec.ts`, `apps/gateway/openapi/nebula-v1.openapi.json`, `packages/api-client/src/generated.ts`, `test/client.test.mjs`, `browser-consumer.ts`, `react-native-consumer.ts` | Existing generators only; strict nested types and counts                                                       |
| Runtime consumers     | `packages/api-client/test/d2-checkout-live.mjs`, `d2-checkout-recovery.mjs`, root/API-client `package.json`, `docker-bake.hcl`, `docker-compose.yml`, `docker/backend.Dockerfile`                              | Inspect live extension and existing scoped cached builds; native/live proof operator-owned                     |
| Current docs          | `docs/current-focus.md`, `TODO-ALTERNATIVE.md`, `docs/services/order-service.md`, `gateway.md`, `docs/packages/api-client.md`, `docs/testing/pre-suite-checklist.md`                                           | Current proof/contract inventory and pending native boundary                                                   |
| SQL/seeds             | `scripts/db/verify-d2-demo-payment.mjs`, `scripts/demo/runner.mjs`                                                                                                                                             | Preserve existing passing SQL; D1 catalogue seeds do not call new operations. D2 demo template remains Batch 4 |

Additional traced consumers before their edits: `apps/gateway/src/contracts/gateway-api-route.decorator.ts`
owns the explicit UUID input-profile set; extend it for both new profiles. Existing
native fixtures `apps/order-service/test/grpc/order.e2e.spec.ts` and
`test/http/order.http.e2e.spec.ts` retain their original manual-marker path and
gain nonmutating payment authority/input checks. Add live helper
`packages/api-client/test/d2-demo-payment-live.mjs`, called only by an explicit
`--demo-payment` mode in the existing Checkout driver, with
`d2-demo-payment-live.test.mjs` exercising its fixture sequence before handoff.
Preserve the normal Checkout/recovery branches. All public proof mutations use
keys; original Checkout response remains immutable. The new mode deliberately
retains Order history, as the existing driver does, and creates no shared demo
Cart consumption beyond that driver's precondition.

Baseline: 79 routes, 48 profiles, 65 protected RPCs, 59 preserved R5 receivers,
six named deferrals. Expected additive inventory: 81/50/67, 59 preserved/eight
deferrals, four private Product stock RPCs unchanged. Normalized Order proto pin
before edit: `838b56833d4d50953ffaf61c6596668bc6c1df181c41925edbec8664b840c5de`.
Reconstruct that baseline by removing only the new blocks before updating its
pin. Broad builds/suites/live remain blocked until the applicable cheap gates
and a final reviewed receipt are recorded here.

## Final consumer review

Before corrective test-only edits: the supplemental aggregate compiler found
stale fixture typing in `apps/gateway/tsconfig.spec.json`,
`test/env-validation.spec.ts`, `gateway-auth-api.service.spec.ts`,
`gateway-blog-api.service.spec.ts`, `gateway-downstream-context.spec.ts`,
`gateway-media-api.service.spec.ts`, `gateway-order-api.service.spec.ts`,
`gateway-product-api.service.spec.ts`, `gateway-settings-api.service.spec.ts`,
`gateway-taxonomy-api.service.spec.ts`, `gateway-user-api.service.spec.ts`,
`http-bootstrap.spec.ts` and `openapi-contract.spec.ts`. Correct only test types:
explicit partial Request casts, mock request/metadata argument tuples, tagged
codec fixtures, enum literals/context-union narrowing, current Node test lib,
duplicate environment object typing and header overload. Preserve all behavior,
negative checks and exact inventories; rerun this compiler and affected fixtures.
No runtime architecture or production TS configuration is replaced.

| Area                  | Reviewed result / disposition                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Native owner adapters | Both strict DTOs, HTTP controllers and role-restricted signed receivers bind the existing owner methods. Context/actor/key forwarding checks pass; no owner, schema or SQL-driver logic changed. Native HTTP/RPC fixtures add nonmutating role/version/input/missing-target cases while preserving original manual-status and Checkout replay cases.                                                                                                                                             |
| Protobuf and clients  | Generated nine contracts and built protos/clients. Reconstructed the original Order pin by removing only the new message/RPC blocks before adopting `6ec54d32a9c0a8ca6b7f635443ef206a3970d0f8ca654011a3be4e1a363f58c2`. New wrappers use their fixed generated definitions. Complete Gateway raw mocks were extended; a mock key-order mismatch was corrected without changing its exact assertion.                                                                                              |
| Actual codecs         | New requests preserve absent versus explicit-zero versions through generated and actual defaults:false receiver codecs. The real defaults:true Gateway loader reconstructs empty repeated items. Both nested response codecs are checked. No zero/default version is manufactured.                                                                                                                                                                                                               |
| Gateway               | Two route/profile entries, strict bodies/UUIDs and the shared UUID documentation set updated. Start requires consumer user; outcome requires admin application/verified admin. Explicit mapper rejects target/owner/attempt/mode/amount/currency/date/state/version drift and exposes no raw persistence/authority fields. Existing Cart/Checkout/admin serializers stay intact.                                                                                                                 |
| Contracts/SDK         | Generated `apps/gateway/openapi/nebula-v1.openapi.json` and `packages/api-client/src/generated.ts`; exact OpenAPI paths/required bodies/keys/UUID/version limits and SDK operation count checked. Browser/RN compiler fixtures cover both new typed operations. Inventory is exactly 81/50/67, with 59 preserved R5/eight named deferrals/private Product4 unchanged.                                                                                                                            |
| Live fixture/commands | `test:d2:payment:live` selects only the new mode of the existing Checkout driver. New helper covers forbidden actor/owner, wrong attempt, stale version, no extra first deduction, UNKNOWN retention, failure/replay, retry/cancel, retry/success and fulfillment. All mutation adapters supply keys. Normal/recovery modes and immutable original Checkout assertions remain. Three local harness tests validate its recipe and detect wrong stock/denial behavior; they are not live evidence. |
| Seeds/builds          | D1 seed implementation unchanged: it does not call these operations. D2 reusable demo template remains Batch4. Inspected `docker-compose.yml`, `docker/backend.Dockerfile`, `docker-bake.hcl`: existing Product/Order/Gateway targets scope `BACKEND_BUILD_SERVICE`, concurrency1. Preserve caches; no force/no-cache/all-eleven build. Other services never call the new Order methods and their old protobuf messages remain wire-compatible.                                                  |
| Documentation         | Current-focus, adopted TODO, owner/Gateway/SDK docs and mandatory checklist now distinguish the full operator SQL pass from pending native/image/live proof. Historical receipts retain their original scope.                                                                                                                                                                                                                                                                                    |

## Local checks and runtime observation

- Order validation/verified transport/actual codecs: **2 suites / 20 tests pass**.
- Gateway HTTP/service/input-profile checks: **3 suites / 56 tests pass**;
  final stricter currency-mapping rerun: **41 service tests pass**.
- Signed and dormant client wrappers: **2 suites / 19 tests pass**.
- SDK forwarding/inventory and payment live-fixture recipe: **11 Node tests pass**.
- `pnpm test:preflight`: **4 suites / 23 tests pass**, with OpenAPI/SDK freshness.
- Production Order/Gateway types, clients build, browser/RN compiler fixtures and
  explicit native HTTP/RPC fixture compilation pass. Scoped implementation/test
  lint passes. Native integration files retain **103 existing unsafe-any warnings**;
  the added native cases introduce none. Missing Node globals/imports in the new
  MJS helper were corrected; its lint now passes without disabled rules.
- Read-only observation: **16 containers running/healthy** and
  `pnpm backend:health` passes **all eleven** configured services. These are the
  existing images, not a claim that the new payment routes are deployed.

Preparation also caught confirmed stale test typing in the exact additional
consumer paths listed above. Corrected partial Request fixture casts through
unknown (they intentionally implement only the fields read by the adapter), gave
mock callbacks explicit request/metadata parameters, preserved generated codec
tags with `.create`, and used the existing enum type for old status literals.
Signed-context tests now narrow the context union before asserting the same actor.
The missing-Media target fixture retains its explicit undefined override after
the spread, and the ambiguous multi-value HTTP header uses Supertest's object
overload without removing its rejection check. OpenAPI parameter iteration has an
explicit reference/parameter union. Test lib ES2022 matches existing Node22 test
APIs; production target/configuration is unchanged.

No assertion, hash guard, coverage or runtime mechanism was weakened. The complete
`tsc -p tsconfig.spec.json --noEmit` now passes. Scoped corrective fixture lint
passes and **11 affected suites / 101 tests pass**. Preflight was rerun after
these corrections: **4 suites / 23 tests pass**. No test-type deferral remains.

## Handoff receipt

```text
Requirement/finding: proved demo lifecycle lacked customer/admin transports.
Changed paths/consumers: before-edit and final review tables above.
Format/syntax/lint/types: scoped checks and complete Gateway test-type project
pass. Original native fixture warnings remain explicitly recorded above.
Focused behavior: Order20, Gateway56 (mapper41 also in corrected fixtures101),
clients19, SDK/recipe11. Corrected Gateway fixture checks:11 suites/101 tests.
Contracts: generated/fresh; preflight4 suites/23 tests; exact counts/pins preserved.
SQL: Salar supplied full two-owner recovery/race/rollback pass; both owned DBs
cleaned. Owner/schema/SQL code unchanged here, so that passing proof is preserved.
Runtime: existing16 containers healthy/all11 backend checks pass. New schema tail,
Product Restore RPC, Order handlers and Gateway routes still need native deployment.
Source/image drift: Product/Order/Gateway only; cached sequential scoped targets.
Deferrals: real providers, paid refunds, cloud/F4 V3; D2 template Batch4;
no Batch3/D2 closure before native/live proof.
Next operator steps (stop on first failure):
node scripts/backend.mjs database migrate-deploy product
node scripts/backend.mjs database migrate-deploy order
docker compose build product-service
docker compose build order-service
docker compose build gateway
Why: apply the already-proved migration tails to Docker-owned application DBs
and compile/load the three affected service images once. No cache deletion/force.
Expected: migrations applied/up-to-date and three successful image builds.
After those pass: recreate the three services with --no-build/--no-deps/--wait,
confirm readiness, then run native Order and Gateway payment/admin-read proofs.
Those runtime commands/results remain pending, not inferred from local mocks.
Readiness: READY FOR NAMED SCOPED DEPLOYMENT/IMAGE PROOF; actual native/live pending.
```
