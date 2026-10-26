# D1 Batch 3 basic contract inventory (2026-09-30)

Status: implementation inventory; Batch 3 exit is not claimed.

This records the 2026-09-30 source revision. The
[2026-10-03 contract review](2026-10-03-d1-batch3-contract-review.md) records
the final Media-ID contract, disabled URL inputs, variant schema corrections,
operation matrix, and current verification. Test counts below are historical.

The current Gateway OpenAPI exposes the basic public catalogue as Product
list, detail, and gallery reads. Admin operations cover Product list/detail,
create/update, soft-delete/restore/hard-delete, gallery list/add/remove/order,
variant create/update/delete, and bulk discount. These operations already have
generated external-client methods. No additional basic Product endpoint was
identified by this inventory; the later Vite admin has not yet supplied a
concrete missing workflow.

The Gateway retains separate external Product DTOs and input profiles. Its
public list profile rejects caller-selected lifecycle and deletion filters;
admin routes require both an admin application and an admin actor. Focused
tests now also show that create/patch reject caller-supplied `actorUserId`,
`tenantId`, and `siteId` before Product service calls. This is coverage for an
existing boundary, not a new authority mechanism.

Checks on this source revision: `pnpm api:check` passed OpenAPI and generated
client freshness; `pnpm --filter @nebula/api-client test` passed five client
tests and both browser and React Native TypeScript compile checks; focused
Gateway Product HTTP/input-profile suites passed (2 suites, 12 tests).
Product-specific gRPC and HTTP tests also passed (2 suites, 19 tests): a Product
read outage becomes HTTP 503 with the standard `UPSTREAM_UNAVAILABLE` envelope
and request ID, while a stale admin update becomes HTTP 409 `CONFLICT`.
The full Gateway suite passed (42 suites, 188 tests), as did Gateway type and
lint checks.

Open for Batch 3 and D1 exit: complete the selected Gateway and external
client quality gates with Batch 4's deterministic fixture and gateway-only
lifecycle proof. Existing advanced Product fields remain compatibility data
under the earlier D1 audit decision; this inventory does not turn them into
basic ecommerce requirements. Seeder replacement is logged in
`docs/current-focus.md` Batch 4 and is deferred until the basic contracts are
settled. The exact replacement scope is recorded in the
[D1 demo seeder replacement log](2026-09-30-d1-seeder-replacement-log.md).
