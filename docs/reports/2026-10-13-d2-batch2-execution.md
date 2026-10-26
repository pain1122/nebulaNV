# D2 Batch 2 execution — checkout validation and snapshots

Date: 2026-10-13. First slice only; durable replay, Product stock intent and
restart compensation remain pending Batch 2 work. Batch 1 evidence is preserved.

## Requirement and process review before editing

Confirmed defects: checkout copies stale Cart commercial facts without current
Product validation; variant identity/options cannot survive the Order schema or
wire reply; raw Prisma Decimal/Date/JSON results are returned on Order paths.
Existing owner locks, verified identity, signed Product/Settings clients and
Gateway cache are retained. This is completion of adopted requirements, not an
optional architecture replacement. No new privileges or cross-service SQL.

Rules pinned for this slice: capture the owned, unexpired Cart; fetch current
shop currency and one Product per distinct ID outside the short transaction;
validate current lifecycle, selection, options, SKU, exact price and stock.
Changed commercial facts return conflict and preserve the Cart; dependency or
producer-contract errors remain unavailable, not a fabricated success. Re-read
and compare captured facts under the existing owner lock before creating an
Order. Cosmetic title changes use the current title. This is point-in-time
validation and does not guarantee inventory across services.

Persist variant identity and options alongside existing immutable identity,
SKU/name/quantity/amounts. New and existing Orders are explicitly demo/no-payment;
existing PAID is a demo status, not proof of settlement. Read-only live audit:
28 PAID Orders, zero OrderItems with nonpositive quantity, negative price or
incorrect line total. No live data is rewritten by this audit.

Process questions: Are remote calls inside a lock? No. Does a local transaction
prove remote stock or durable replay? No. Can mocks certify migration rollback?
No. Can the interim variant denial disappear before complete snapshots and
codecs exist? No. Do additive fields require inventory review? Yes, even when
RPC counts stay unchanged. Heavy execution remains operator-owned.

## Exact consumer dispositions (first slice)

The full [85-path trace](2026-10-13-d2-batch2-file-trace-and-plan.md) remains the
baseline. This table records the concrete first-slice edits and exclusions.

| Owner / changed symbol      | Exact consumers                                                                                                                                                                                                                                                                                                                                                                              | Disposition / check                                                                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Checkout and stored replies | `apps/order-service/src/order/order.service.ts`; new `apps/order-service/src/order/checkout-contract.ts`                                                                                                                                                                                                                                                                                     | Fresh quotes, captured Cart comparison, explicit snapshots/replies; Focused behavior and actual database proof pass; see receipt below.                        |
| Existing Cart quote         | `apps/order-service/src/order/cart-contract.ts`; `apps/order-service/test/utils/cart.fixture.ts`                                                                                                                                                                                                                                                                                             | Reuse validation; no Product contract change.                                                                                                                  |
| Persisted snapshots         | `apps/order-service/prisma/schema.prisma`; new `apps/order-service/prisma/migrations/20261013000200_order_commercial_snapshots/migration.sql`                                                                                                                                                                                                                                                | Add variant/options and demo mode; preserve legacy facts; Actual SQL rollback/control pass; native deploy remains pending.                                     |
| Owner regressions           | new `apps/order-service/test/checkout.unit.spec.ts`; new `apps/order-service/test/utils/order.fixture.ts`; `apps/order-service/test/cart-mutations.unit.spec.ts`; `apps/order-service/test/resource-authorization.spec.ts`; `apps/order-service/test/order.error-translation.unit.spec.ts`; `apps/order-service/jest.unit.config.ts`                                                         | Replace temporary variant guard with snapshot assertions, update incomplete raw-row mock, preserve ownership/currency denials.                                 |
| Integration responses       | `apps/order-service/test/http/order.http.e2e.spec.ts`; `apps/order-service/test/grpc/order.e2e.spec.ts`; `apps/order-service/test/grpc/helpers.ts`; `apps/order-service/test/utils/http.ts`                                                                                                                                                                                                  | Review assertions for additive snapshot/mode and fixed amounts; helpers/verified inputs unchanged. Broad runs pending.                                         |
| Wire                        | `packages/protos/order.proto`; `packages/protos/generated/order.ts`; `packages/protos/scripts/generate.mjs`; `packages/protos/index.ts`                                                                                                                                                                                                                                                      | Add response fields using existing generator; generator/exports unchanged. Real codec/default loader checks required.                                          |
| Signed wrappers             | `packages/clients/src/order.client.ts`; `packages/clients/src/dormant-v3.client.ts`; `packages/clients/test/service-wrappers.spec.ts`; `packages/clients/test/dormant-v3-wrappers.spec.ts`; `packages/clients/test/signing-policy.spec.ts`                                                                                                                                                   | Same requests/RPC/signing; generated response type propagates. No new receiver or activation.                                                                  |
| Gateway mapper              | `apps/gateway/src/order/gateway-order-api.service.ts`; `apps/gateway/src/order/order-api.dto.ts`; `apps/gateway/test/gateway-order-api.service.spec.ts`; `apps/gateway/test/order-http.spec.ts`                                                                                                                                                                                              | Preserve snapshot/mode; enforce exact amounts; update producer fixtures; Focused mapper/HTTP/profile tests pass: 17 tests.                                     |
| External declarations       | `apps/gateway/src/openapi/gateway-openapi.ts`; `apps/gateway/openapi/nebula-v1.openapi.json`; `packages/api-client/src/generated.ts`; `packages/api-client/scripts/generate-client.mjs`; `packages/api-client/test/client.test.mjs`; `packages/api-client/test/browser-consumer.ts`; `packages/api-client/test/react-native-consumer.ts`                                                     | Regenerate declarations; add typed snapshot consumers; request/route inventory unchanged.                                                                      |
| Inventories                 | `apps/gateway/test/r5-v3-receiver-inventory.spec.ts`; `apps/gateway/test/openapi-contract.spec.ts`; `apps/gateway/test/contracts/route-policy.aggregate.spec.ts`; `apps/gateway/test/contracts/input-profiles.aggregate.spec.ts`                                                                                                                                                             | Review only Order message additions before pin update; preserve RPC/routes/counts and explicit deferrals. Preflight passes: 20 tests; reviewed Order pin only. |
| Input/transport             | `apps/order-service/src/order/order.controller.ts`; `apps/order-service/src/order/grpc/order-grpc.controller.ts`; `apps/order-service/src/order/dto/order.dto.ts`; `apps/gateway/src/order/gateway-order.controller.ts`; `apps/gateway/src/contracts/inputs/order.inputs.ts`; `apps/gateway/src/contracts/routes/order.routes.ts`; `apps/gateway/test/contracts/inputs/order.inputs.spec.ts` | No new customer authority/input. Durable key forwarding deliberately pending next Batch 2 slice.                                                               |
| Database tooling            | new `scripts/db/verify-d2-checkout.mjs`; `scripts/db/verify-d2-cart.mjs`; `scripts/backend.mjs`; `scripts/backend.test.mjs`; `package.json`                                                                                                                                                                                                                                                  | Add owned SQL proof command; preserve historical B1 Cart-only proof and pinned migration runner.                                                               |
| Historical fixture windows  | `scripts/db/d1-order-upgrade-fixture.sql`; `scripts/db/verify-d1-order-upgrade.sql`; `scripts/db/d1-upgrade-snapshots.sql`; `scripts/db/f4-r2-order-fixture.sql`; `scripts/db/verify-f4-r2-order.sql`; `apps/order-service/prisma/seed.ts`; `scripts/demo/runner.mjs`                                                                                                                        | Earlier migration windows and empty Order seed unchanged; D1 demo creates Products, not checkout Orders.                                                       |
| Builds                      | `docker/backend.Dockerfile`; `docker-compose.yml`; `docker-bake.hcl`; `apps/order-service/package.json`; `packages/api-client/package.json`                                                                                                                                                                                                                                                  | Existing generated/runtime copies cover additive fields. Order/Gateway affected; no Product/Media rebuild justified.                                           |
| Documentation               | `docs/services/order-service.md`; `docs/services/gateway.md`; `docs/packages/api-client.md`; `docs/current-focus.md`; `TODO-ALTERNATIVE.md`; this report                                                                                                                                                                                                                                     | Explain precise interim behavior and proof status; do not close whole Batch 2. Product service documentation unchanged: no stock effect yet.                   |

## Handoff receipt

Additional confirmed preparation defects found before handoff: the existing
`scripts/db/verify-d2-cart.mjs` replacement string converted SQL `$$` delimiters
to `$` through JavaScript replacement expansion; matching only the fault label
could accept a syntax error that quoted that label. Use a replacement callback
and require the actual first ERROR message. The corrected real PostgreSQL proof
passes; its intended-fault evidence supersedes that narrow earlier claim, while
other Cart evidence remains preserved. The new proof similarly rejects wrong
first errors. Its historical fixture is loaded before the Cart selection migration,
then brought forward, rather than weakening it for today's schema.

`docker-compose.yml` Order build lacks BACKEND_BUILD_SERVICE whereas the shared
Dockerfile defaults to `all`. Add only Order's existing supported selector;
check Compose/Bake resolve it before requesting a build. No Dockerfile rebuild
architecture replacement, cache purge or unrelated image compilation is needed.

## Final consumer review and observed results

All table entries were revisited. Order snapshots propagate through checkout,
list/detail/status, generated protobuf, Gateway DTO/mapper, OpenAPI and typed SDK
consumers. The former temporary variant rejection is replaced by positive base/
variant snapshot proofs, commercial conflict cases and actual Prisma-backed
concurrency/rollback. Existing Cart add/ambiguity assertions remain. No test was
removed or skipped to make the new behavior pass. HTTP meta consumers now parse
the declared JSON-string contract; gRPC/default-loader and generated codecs both
preserve empty base options and exact amounts. The Order number retains its date
prefix and uses a UUID suffix instead of the four-digit collision space; traced
consumers treat it as an opaque string, with no old format assertion found.

The reviewed Order message changes add only OrderItem fields 9/10 and Order field 16. The prior Batch 1 additions remain unchanged. No RPC or authorization was
added: 77 routes, 47 input profiles and 63 protected RPCs remain; 59 dormant
receivers and four previously named post-R5 deferrals remain. After reviewing
those exact source additions, only the normalized Order source pin changed to
70ad241461e74360d16719f8973e9a826bdc623d811459b369c09f79814cf7f4.

Locally observed:

- Order unit-only configuration: 6 suites / 66 tests passed, no skips.
- Gateway Order mapper/HTTP/input profiles: 3 suites / 17 tests passed, no skips.
- API client: 16 tests passed; browser and React Native type consumers compile.
- Order/Gateway/shared-client source type checks pass. The initial missing
  snapshot array type failed locally, was explicitly typed and rechecked before
  handoff; no compiler failure was handed to the operator.
- Prisma format/generate succeeds; protocol generation/build and isolated
  freshness check pass for all nine contracts; OpenAPI/SDK generation is fresh.
- pnpm test:preflight: 4 suites / 20 tests passed, no skips.
- Scoped owner/helper/new tests and Gateway lint: zero errors. Five existing
  unsafe-any warnings remain in unchanged authorization context/error fixture
  expressions (one plus four). Existing integration lint has 52 gRPC warnings
  and 51 HTTP warnings, zero errors; the newly added assertions use typed views.
- New PostgreSQL proof: valid demo-header/variant control inserts succeed;
  each negative case requires SQLSTATE 23514 and the exact named constraint.
  Deliberate migration fault requires first error P0001, all three added columns
  absent afterward, and preserved populated facts after successful apply.
  Actual updated OrderService/generated Prisma also prove stale price denial,
  nested item-write failure rollback with unchanged Cart, one winner in two
  concurrent checkouts, and immutable variant options/amounts/title after a
  changed remote catalogue stub. Cleaned one owned disposable database.
- Corrected prior Cart SQL/actual-Prisma proof passes and cleans its owned DB.
  This targeted rerun is justified by the newly found fault-injection defect;
  unrelated passing Batch 1/D1/F5 broad proofs were not rerun.
- Node syntax passes for both proof scripts. Changed source/test/docs formatted;
  git diff --check passes (existing CRLF normalization warnings only).
- Compose and Bake print resolve Order's build selector to order-service;
  Gateway resolves to gateway. Neither operation builds or restarts services.

Real SQL evidence uses disposable databases only. Remote Product/Settings calls
are stubbed in the owner database proof; mocked/codec tests do not certify new
images, Redis-loss replay, remote stock effects or restart recovery. Production
data/seed records, current service containers and the paused stash were untouched.

## Prepared operator handoff receipt

Requirement/finding: fresh checkout commercial validation, complete immutable
base/variant snapshots and explicit demo replies; confirmed producer/fixture/
build-scope preparation defects corrected.

Changed files and consumer impact: exact table above plus additional Cart proof
and Order Compose selector correction. Existing signed wrappers, input/route
policies, Product/Settings/Media sources, historical fixtures and empty Order
seed remain unchanged for the recorded reasons. Generated declarations refreshed
using existing generators. No frontend, new payment or tenant activation.

Format/syntax/lint/types/focused checks: passed as quantified above; baseline
warnings explicitly retained. No known applicable cheap gate is failing.

Actual SQL/runtime evidence: populated/control/first-error/owner-Prisma proof
passes. Docker PostgreSQL accepts these proofs. Native Prisma clean deploy/status,
populated deploy/rerun/status on the pinned live Order DB and new image integration
are pending operator-owned checks. Current healthy old images are not evidence
for the changed code; they have not been certified as the new producer.

Source/image drift: Order source/schema/wire and Gateway reply contracts changed.
Build Order and Gateway sequentially with normal cache. Product/Media images do
not need rebuilding. The shared Dockerfile supports the verified single-service
selector; no force/no-cache/all-service build is requested.

Next named commands: pnpm db:verify:order for native clean migration/status and
owned cleanup; docker compose build order-service; docker compose build gateway.
Run sequentially and stop at the first failure. Expected: five Order migrations
apply/status up to date and two successful images. After success, stop old Order,
run pnpm db:migrate:order twice plus pnpm db:status:order, then recreate Order and
Gateway and run affected integration proofs. That later maintenance/live block
must use current readiness and is not reported as passed here.

Known deferrals: durable key replay/intent/retention, Product reserve/finalize/
cancel and recovery remain Batch 2; status transitions/audit remain Batch 3.
Local atomicity is not remote atomicity; no stock consumption is advertised.
No mandatory user decision or approval is bypassed: this slice follows the adopted
scope and confirmed narrow fixes; heavy execution remains with Salar.

Readiness: READY FOR NAMED NATIVE CLEAN PROOF AND TWO SEQUENTIAL IMAGE BUILDS.
Batch 2 and its runtime feature boxes remain open pending the required proofs.

## Operator build checkpoint and deployment handoff

Salar reports the three named commands completed: native clean Order migration
proof, Order build and Gateway build. No full log/count/duration was supplied;
record this as operator-reported success, separately from locally observed tests.

Local read-only deployment checks: all 16 Compose containers are running and
healthy. Both running Order/Gateway image IDs differ from their newly built image
IDs, confirming recreation is required. The actual Docker nebula_order ledger
still has the four Batch 1 migrations and zero of the three new snapshot columns.
The clean disposable proof did not deploy the populated live database, as intended.
Do not run new Gateway against old Order or skip the populated deployment.

Prior cheap/preflight/SQL receipts remain valid: no implementation changed after
those passes. Native clean/build checkpoint is reported complete; live migration
deployment/rerun/status, recreation, new-image health and integration remain pending.

Next handoff: stop only Order; pnpm db:migrate:order twice; pnpm db:status:order;
docker compose up -d --no-build --wait --no-deps order-service gateway; pnpm
backend:health. These verified root commands pin the Docker database at port 15432. Stop at any failure. Expected: fifth migration applied, rerun applies none,
status up to date, both new images healthy, all backend health checks passing.
Keep other ready dependencies running. After this, affected full Order/Gateway
suites and Cart/F3 compatibility are the next integration checks; no blanket
Product/Media rebuild or unrelated proof repetition is needed.

Readiness: READY FOR PINNED POPULATED DEPLOYMENT AND IMAGE RECREATION.
Batch 2 remains open; durable replay/remote stock/recovery are not claimed.

## Deployed checkpoint and integration handoff

Salar reports the populated deployment/rerun/status, Order/Gateway recreation and
backend health block succeeded. Logs/counts/durations were not supplied. Local
read-only checks confirm the fifth snapshot migration applied, all three snapshot
columns present, both running image IDs equal their newly built image IDs, and
all 16 Compose containers running/healthy. The known seeded customer's Cart has
zero items before the integration checkout lane; no existing selection was wiped.

Receipt: earlier format/types/lint/codec/generated freshness/preflight/SQL gates
remain passing; no implementation changed since them. Order's broad config has
the existing live global setup and includes HTTP/gRPC plus unit regressions;
Gateway's complete config covers affected declarations, policies and mappings.
Run these broad suites sequentially, followed by the existing Gateway Cart live
and F3 compatibility proofs. Their actual results remain pending with Salar.
No additional Product/Media build, SDK unit repeat or unrelated D1 proof is needed:
those sources/contracts did not change in this slice. Preserve reported evidence
and return failure details or suite/test/skipped summaries when available.

Named handoff: pnpm --filter @nebula/order-service test:e2e; pnpm --filter
@nebula/gateway exec jest --config ./jest.config.ts --runInBand;
pnpm test:d2:cart:live; pnpm test:f3:live. Stop on first failure.

Readiness: READY FOR FOUR NAMED INTEGRATION/COMPATIBILITY CHECKS.
This checkpoint does not certify durable replay, stock effects or full Batch 2.

## First-slice sign-off

Salar reports all four named integration/compatibility commands passed: full Order
and Gateway suites, Gateway Cart live proof and F3 live proof. Exact broad counts,
skips and durations were not supplied; do not infer them from focused counts.
The native clean/populated migration, rerun/status, image deployment, locally
verified schema/image/health and reported integration checkpoints now complete
this slice. Current revalidation, immutable complete snapshots, demo labeling and
explicit reply mapping gates close. Whole Batch 2/D2 stays open for durable
replay, Product-owned stock and recovery.
