# D2 Batch 3 read slice

2026-10-19. Read implementation and local preparation passed. Native/new-image
integration is pending; remaining Batch 3 mutations/effects are not implemented.
Parent: [Batch 3 trace and approved plan](2026-10-19-d2-batch3-file-trace-and-plan.md).

Requirement: retain personal owner-only reads and add distinct protected admin
list/detail. Confirmed gap: only admin status update exists. Existing customer
guards, explicit snapshot mapping and completed-Checkout predicates work.

Pinned contract: GET `/api/v1/admin/orders` and `/api/v1/admin/orders/:id`;
native HTTP `/admin/orders` and `/admin/orders/:id`; signed `AdminListOrders`
and `AdminGetOrder`. List filters are optional status/customer userId, page
default 1 (maximum 1,000,000), limit default 20 (maximum 100). Sort createdAt
descending then ID descending. One repeatable read snapshot returns rows/count.
Legacy Orders or COMPLETED checkout attempts are visible; unfinished attempts
stay hidden from these ordinary admin reads. No status/version/payment change.

Before-edit impact map (revisited with results before handoff):

| Owner                       | Exact consumers                                                                                                                                                                                                                                                                | Decision                                                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New read validation/service | `apps/order-service/src/order/order.service.ts`, new `order-admin-read.ts`; `dto/order.dto.ts`, new `admin-order.controller.ts`, `order.module.ts`, `grpc/order-grpc.controller.ts`                                                                                            | Owner validates IDs/filter/page/limit before DB, separate protected native/RPC reads. No Cart lock or migration.                                                |
| Wire/client                 | `packages/protos/order.proto`, generated Order source; `packages/clients/src/order.client.ts`; `packages/clients/test/service-wrappers.spec.ts`                                                                                                                                | Add three messages, two RPCs and signed wrappers; preserve all existing field numbers/methods and assertions.                                                   |
| Dormant compatibility       | `packages/clients/src/dormant-v3.client.ts`, `packages/clients/test/dormant-v3-wrappers.spec.ts`, `apps/gateway/test/r5-v3-receiver-inventory.spec.ts`                                                                                                                         | Do not activate F4. Deliberately exclude the two new post-R5 reads from old V3 projection and name their paused-F4 deferral. Preserve 59 R5 receivers.          |
| Gateway                     | `apps/gateway/src/order/order-api.dto.ts`, `gateway-order-api.service.ts`, `gateway-order.controller.ts`; `contracts/routes/order.routes.ts`, `contracts/inputs/order.inputs.ts`                                                                                               | Separate admin policies, owner pagination/filter response checks, collection metadata; personal read rules unchanged.                                           |
| Contract consumers          | Gateway OpenAPI; `packages/api-client/src/generated.ts`; `test/client.test.mjs`, `browser-consumer.ts`, `react-native-consumer.ts`; focused route/profile/OpenAPI/RPC inventories                                                                                              | Regenerate, inspect additions and update exact counts/hashes only for reviewed changes: two routes, two Gateway RPCs, one admin-list input profile.             |
| Owner checks                | New `apps/order-service/test/order-admin-read.unit.spec.ts`; existing `resource-authorization.spec.ts`, HTTP/gRPC owner tests, `jest.unit.config.ts`; Order fixture helpers                                                                                                    | Add owner query/count/validation/visibility tests and native guard checks. Existing successful caller shapes remain unchanged.                                  |
| Gateway checks              | `apps/gateway/test/order-http.spec.ts`, `gateway-order-api.service.spec.ts`, `contracts/inputs/order.inputs.spec.ts`, `contracts/route-policy.aggregate.spec.ts`, `contracts/input-profiles.aggregate.spec.ts`, `openapi-contract.spec.ts`, `r5-v3-receiver-inventory.spec.ts` | Cover admin/customer application/role separation, wrong identity/filter/pagination, empty codec list; replace obsolete AdminListOrders absence assertion.       |
| Other mocks/tooling         | `apps/order-service/test/order.error-translation.unit.spec.ts`; proto/client raw mocks found by full symbol search; root/package commands and backend scoped Dockerfile                                                                                                        | Extend complete raw-method mocks. No schema/seed/Product changes; future Order/Gateway image integration can be grouped with the next compatible Batch 3 slice. |

Generators/checks: existing proto generate/build then shared client build;
`pnpm api:gen`; scoped owner/Gateway/clients behavior, types/lint/format, actual
empty-list codec, artifact freshness and `pnpm test:preflight`. Native/live/image
proof remains pending until named handoff; mock passes do not certify images.

Additional proof consumers traced before adding them: native HTTP and gRPC
fixtures create one Order before their existing status mutation; new read cases
run before that mutation. `packages/api-client/test/d2-checkout-live.mjs` gains
an opt-in `--admin-reads` mode and root/package `test:d2:orders:live` command;
the default closed Batch 2 proof retains its previous operation surface.
`scripts/db/verify-d2-order-reads.mjs` and root `db:verify:d2:orders` will check
actual Prisma queries against current Order migrations in one owned disposable
database. This proves sorting/filtering/count/visibility and personal ownership
without modifying shared demo rows. Existing database scripts and seeders need
no changes because no stored schema or existing operation changes here.

## Post-change consumer review and evidence

All results below were observed locally on 2026-10-19, unless explicitly pending.
The worktree already contained substantial D1/F5/D2 changes before this slice;
the full repository diff is not a diff of this slice alone.

| Consumer                                                                                                                                                                           | Final decision and result                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Order service/helper, DTO, new admin HTTP controller, module registration and gRPC controller listed above                                                                         | Separate owner validation and role policies added. Existing personal predicates and commercial serializer retained. New 18-case admin suite plus two existing resource-authorization cases pass. Actual native controller/RPC execution awaits images.                                                                                                                        |
| `packages/protos/order.proto`, `packages/protos/generated/order.ts`, `packages/clients/src/order.client.ts`                                                                        | Three additive messages and two signed methods; no existing field number/signature changed. Proto generation/build and client build pass. Isolated `check-generated` passes. Empty/omitted/zero values pass generated codecs and the actual receiver's defaults:false proto-loader.                                                                                           |
| `packages/clients/src/dormant-v3.client.ts`, `test/dormant-v3-wrappers.spec.ts`, `test/service-wrappers.spec.ts`                                                                   | Projection deliberately retains eight prior Order V3 methods. Both selected wrapper suites pass: 19 tests. Signed new methods keep fixed target/path/body digests. No dormant activation.                                                                                                                                                                                     |
| Gateway DTO/service/controller, route/profile manifests, `test/order-http.spec.ts`, `test/gateway-order-api.service.spec.ts`, `test/contracts/inputs/order.inputs.spec.ts`         | Updated and checked: 32 tests pass. Covers role/application separation, filters/bounds, UUIDs, empty lists, response identity and pagination drift. Customer delegation remains separate. Gateway downstream loader is defaults:true; existing personal empty repeated-list mapping therefore stays unchanged.                                                                |
| OpenAPI, generated SDK and four exact contract inventories                                                                                                                         | Generated with `pnpm api:gen`; `pnpm test:preflight` passes 21 tests and freshness checks. Inventories are 79 routes, 48 input profiles, 65 protected Gateway RPCs, 59 preserved R5 receivers and six named deferred post-R5 RPCs. Unknown additions still fail.                                                                                                              |
| Order proto hash pin in `test/r5-v3-receiver-inventory.spec.ts`                                                                                                                    | Removing only these three messages/two RPCs/comment reproduces the prior normalized pin `f093f88332fbee771a9707de23ce7933bf277fbacb7ed341c9d5bb1f32d631b2`. Reviewed additive surface has new pin `baab329db8a8388b5e69955a48baeeb7eb748f291a5f9ca9132a0f0b9d5a8490`. Other pins and preserved-receiver assertions remain.                                                    |
| `packages/api-client/test/client.test.mjs`, `browser-consumer.ts`, `react-native-consumer.ts`                                                                                      | Admin read paths/auth/query/envelope checked. Typed pagination union is narrowed by its profile before reading total. Package check passes 37 Node tests plus both platform compiler fixtures. Existing Media/D2 recovery assertions stay intact.                                                                                                                             |
| `apps/order-service/test/http/order.http.e2e.spec.ts`, `test/grpc/order.e2e.spec.ts`, `test/grpc/helpers.ts`                                                                       | Two native read cases added before existing status changes; helpers already sign from generated definitions and need no change. Explicit TypeScript compiler check including both native files passes. Runtime cases are pending, not certified by mocks. Existing native fixtures retain 103 lint warnings about earlier any-typed data; new read cases use typed responses. |
| `scripts/db/verify-d2-order-reads.mjs`, root `db:verify:d2:orders`                                                                                                                 | Passes real current migration SQL and Prisma reads: deterministic ties/pages/count/filters, empty and past-last pages, completed/legacy visibility, unfinished/missing detail denial and personal owner denial. One guarded disposable database created and removed; shared demo rows unchanged. This is not native Prisma migrate-deploy/history or new-image evidence.      |
| `packages/api-client/test/d2-checkout-live.mjs`, root/package command scripts                                                                                                      | Opt-in `test:d2:orders:live` adds real admin list/detail, empty page, filter and role/application denials to the existing checkout fixture. Default Checkout and recovery modes do not invoke new routes. Syntax/lint pass; execution pending rebuilt images. Existing mutation keys, scoped Product cleanup and session cleanup retained. No test Orders are newly erased.   |
| `apps/order-service/test/order.error-translation.unit.spec.ts`, `test/utils/order.fixture.ts`, `test/resource-authorization.spec.ts`, `src/order/checkout-contract.ts`             | Inspected and unchanged: they do not construct the expanded raw Order client or change this operation's wire fields. Current fixture/serializer remain valid. Personal owner behavior additionally passes actual Prisma proof.                                                                                                                                                |
| Order schema/migrations, existing `scripts/db/verify-d2-*.mjs`, `scripts/demo/`, Product stock/clients/controllers                                                                 | Unchanged: additive reads require no stored fields, quote/stock mutation or seeder rewrite. Existing receipt bodies remain immutable. No migration, upgrade/rollback or seeder rerun is required for this slice. Final D2 fixture/parity work remains Batch 4.                                                                                                                |
| `docker/backend.Dockerfile`, `docker-compose.yml`, `docker-bake.hcl`, Gateway client module and Order bootstrap                                                                    | Inspected, unchanged: existing scoped cached builds/copy paths cover new source, shared contracts and runtime imports. New read runtime requires Order/Gateway images; no reason to rebuild eleven services. Internal build service filter and concurrency 1 already exist. Group expensive deployment with compatible mutation work.                                         |
| `docs/current-focus.md`, `TODO-ALTERNATIVE.md`, `docs/services/order-service.md`, `docs/services/gateway.md`, `docs/packages/api-client.md`, `docs/testing/pre-suite-checklist.md` | Updated read progress, contracts and exact inventory; personal ownership item checked. Admin/status combined item, transitions/effects and final exit stay open. Historical reports retain their original evidence. Checklist now names six current post-R5 deferrals.                                                                                                        |

Preparation failures caught and corrected locally: generated request fixtures
needed `.create()` type metadata; the HTTP test needed the established nested
`meta.pagination` envelope; wrapper inventory needed the selected method order;
typed SDK fixtures needed pagination-profile narrowing. Lint failures in new
test/proof code were corrected without relaxing rules. These were preparation
failures, not a reason to change service contracts or request Docker rebuilds.

## Preparation receipt

```text
Requirement/finding: add missing protected admin reads; preserve working customer ownership.
Changed files/consumer review: exact paths and final decisions in both tables above.
Format/syntax/lint/types: changed files formatted, diff --check passes (CRLF-to-LF advisories only);
  scoped source/tests lint passes after fixes. Existing native fixture any-typing warnings: 103.
  Four affected owner/client check-types pass; native HTTP/gRPC fixtures compile explicitly.
Focused checks: Order 20, Gateway 32, signed/dormant clients 19, SDK/recovery 37,
  preflight 21 passed; final admin-only rerun 18 passed after the real loader check.
Artifacts: proto generation/build, client build, api:gen, isolated proto freshness,
  OpenAPI and SDK freshness passed. Real generated and defaults:false receiver codecs exercised.
SQL/runtime: owned PostgreSQL/Prisma read proof passed and cleaned its database.
  All sixteen existing containers were healthy. New native/image/Gateway proof remains PENDING.
Source/image drift: new RPCs/routes/owner source need Order/Gateway runtime images;
  no new migration, forced/no-cache build or whole-stack rebuild is required for these reads.
Limitations/deferrals: remaining Batch 3 transition/version/replay/audit and approved
  stock/payment effects are open; real providers/paid refunds outside scope; F4 V3 paused.
Next broad proofs: Order test:e2e and test:d2:orders:live after the grouped image handoff;
  expect native HTTP/RPC admin reads and denial/filter cases plus existing checkout proof labels.
Readiness: READY FOR READ PROOFS; expensive handoff intentionally grouped with the next
  compatible Batch 3 mutation slice. No broad command or image build was run here.
```
