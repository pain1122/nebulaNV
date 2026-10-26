# Gateway Service

Last reviewed: 2026-10-13 (D2 checkout snapshots; new images pending).

Order replies include persisted variantId/options, fixed two-decimal amounts and
checkoutMode=DEMO_NO_PAYMENT. Gateway preserves these facts and rejects malformed
money or missing demo mode rather than masking an older producer. New Order and
Gateway images must be deployed together after the additive Order migration.
Durable checkout replay and stock effects remain pending D2 Batch 2; existing
Gateway cache alone does not certify either requirement.

The replay slice forwards the validated checkout Idempotency-Key header as a
signed Order RPC field. Order's completed receipts add durable replay while the
existing Redis cache remains intact. Clients should repeat the same Gateway body:
its request hash intentionally distinguishes omitted fields from explicit empty
values, even though Order normalizes omitted/empty note for owner intent. New
Order/Gateway images must deploy together; older Order code ignores the new wire
field and does not provide durable replay. Stock effects are still pending.

## Purpose

Gateway is NebulaNV's single versioned public API boundary for storefront,
admin, and registered mobile clients. Future partner/server integrations are
reserved at the same boundary but are not executable in F3.

The runtime is intentionally HTTP-only:

- package: `@nebula/gateway`;
- service identity: `gateway`;
- HTTP port: `3002`;
- external prefix: `/api/v1`;
- gRPC listener: none;
- Prisma database: none.

It does not replace Auth-service as JWT/session authority or replace domain
services as authorization and business-rule owners.

## Request Pipeline

For a manifest-backed request, the gateway:

1. creates a new ingress request ID and applies shared security, logging,
   validation, and JSON-size policy;
2. resolves the registered public client and exact web Origin, or the
   registered originless mobile client;
3. resolves an optional Bearer through Auth-service without decoding JWTs
   locally;
4. applies route-owned application profile, actor/role, input, retry, and
   idempotency policy;
5. creates canonical application/tenant/site/channel context from the fixed
   registry record;
6. calls one typed `@nebula/clients` wrapper with gateway-kind pairwise S2S v3
   metadata;
7. validates/maps the downstream result into the public envelope.

Gateway checks are defense in depth. Each downstream service still validates
S2S, actor consistency, roles, ownership, lifecycle, and domain rules.

## Public Application Registry

F3 uses a replaceable `ApplicationRegistry` interface backed by strict
`GATEWAY_APPLICATION_REGISTRY_JSON` deployment configuration. A record fixes
the client ID, application ID/profile, tenant, site, channel, origins, enabled
state, and rate-limit profile.

The public client ID is not secret and does not prove a mobile binary is
genuine. Copying it cannot change its fixed mapping and cannot bypass Bearer,
role, rate, ownership, or domain checks. Raw actor, role, application, tenant,
site, channel, request-ID, gateway, and S2S headers are ignored or rejected as
authority inputs.

F4 replaces only the static adapter with persistent registry/membership and
identity-policy authority plus stable lifecycle management. The existing
boundary remains; F4 must not move authority into settings-service or
client-supplied scope fields.

## F4 Identity-Realm Routing Target (Not Implemented)

[ADR-0014](../architecture/decisions/0014-f4-customer-identity-realms-and-federation.md)
keeps Gateway as the one public application boundary but not as an identity
issuer. The target order is:

```text
verified application identity
-> active ApplicationIdentityPolicy
-> exact accepted realm/provider/principal class and audience
-> selected Realm Auth endpoint
-> application-bound login/refresh/exchange session
-> realm-aware signed context
```

Gateway may route only from Tenant Authority's active exact policy. A login
identifier, email, issuer claim, tenant/site field, public client ID, parent
edge, or existing session cannot choose another realm. Prompt-free movement
from a licensed root to an allowed subordinate uses a one-use, short-lived,
audience-bound exchange and produces a separate subordinate application
session; Gateway never forwards a parent refresh token or creates one bearer
valid for sibling applications. Personnel-only policy rejects consumer-realm
admission before a local membership can be created.

The four implemented default registrations and `ApplicationRegistry` seam are
preserved. Their identity policies are additive, and the static adapter stays
primary until realm Auth routing, context-v3 receivers, rollback, and default-
realm parity are proven.

## External Contracts

The validated route manifest is aggregated by
`src/contracts/route-policy.ts`; service-specific route definitions live under
`src/contracts/routes/`. Input allowlists live under
`src/contracts/inputs/`. Controllers derive method, path, policy, success
status, operation ID, idempotency, and OpenAPI metadata through
`GatewayApiRoute`.

The checked public contract is
`apps/gateway/openapi/nebula-v1.openapi.json`: 70 operations across 60 paths.
`@nebula/api-client` is generated from that file. Internal gRPC clients remain
in the separate `@nebula/clients` package.

Detailed envelopes, pagination, retry/idempotency promises, domain route
boundaries, and media exceptions are documented in
[Gateway External API Standards](../architecture/gateway-api-standards.md).

## Browser, BFF, And Mobile Sessions

The current browser uses a same-origin thin Next BFF. The BFF sends its
configured registered client ID and validated application Origin, forwards the
raw refresh cookie without interpreting it, and relays the gateway's
`Set-Cookie`. It receives no S2S key.

Browser access tokens remain short-lived Bearers returned in JSON and stored by
the compatibility UI in memory/sessionStorage. Refresh material exists only in
the host-only HttpOnly `refreshToken` cookie with `Path=/api/auth`,
`SameSite=Lax`, no Domain, production Secure, and Auth's authoritative expiry.
Refresh and logout require POST, exact Origin/host, and same-origin Fetch
Metadata before cookie consumption.

Registered mobile is originless, receives both tokens and expiry metadata in
JSON, and must keep refresh material in platform secure storage. Auth-service
alone creates, rotates, replay-detects, and revokes session families.

## Readiness And Dependencies

Gateway readiness reuses runtime-owned clients and checks:

- validated startup configuration;
- the application registry adapter;
- Auth transport channel;
- gateway Redis.

The seven domain channels and fixed private Media-render transport remain
startup/runtime dependencies for their routes, but an outage degrades the
affected route instead of evicting the otherwise useful gateway from
readiness.

The runtime exposes unprefixed `/health/live`, `/health/ready`, and `/health`
using the shared sanitized shape. It never creates synthetic business requests
or duplicate health-only clients.

## Local And Release Boundary

Local Compose publishes gateway port 3002 and keeps each hybrid service port
available for diagnosis. Release Compose publishes gateway 3002 and the
approved MinIO data plane 9000 only. It does not publish backend HTTP/gRPC,
PostgreSQL, Redis, or MinIO console 9001.

The sole service-HTTP transport exception is public Media rendering over the
private `media-service:3007` network path. The gateway never accepts an
upstream URL from a request, never follows redirects, and preserves only the
allowlisted stream headers. Presigned storage/CDN URLs issued in JSON are
separate data-plane destinations that clients may follow.

## Main Files

- `apps/gateway/src/app.module.ts`
- `apps/gateway/src/main.ts`
- `apps/gateway/src/config/env.validation.ts`
- `apps/gateway/src/application/`
- `apps/gateway/src/contracts/`
- `apps/gateway/src/downstream/`
- `apps/gateway/src/auth/`
- `apps/gateway/src/http/`
- `apps/gateway/src/gateway-readiness.service.ts`
- `apps/gateway/openapi/nebula-v1.openapi.json`

## Verification

D2 Cart additions preserve existing routes and actor policies. Cart add accepts
optional variantId; caller options, price, currency, totals and ownership fields
remain rejected. Replies include authoritative selectedOptions, variantId when
present, lineTotal and decimal-string subtotal/total. Updated Order replies are
required; missing exact totals fail closed with an upstream contract error.
See [Order's bounded Cart behavior](order-service.md#d2-cart-contract).

```powershell
pnpm test:gateway:backend
pnpm test:external-client
pnpm test:web:current
pnpm test:f3:live
pnpm --filter @nebula/gateway check-types
pnpm --filter @nebula/gateway build
```

The live command is development-only and expects the provisioned stack and
seeded user/admin accounts. It prints only bounded pass labels, never tokens or
credentials.

It calls readiness before any idempotent mutation. Product list adapters
preserve omitted optional protobuf fields instead of manufacturing empty UUID
or enum values; the domain service remains the validation owner. The current
evidence map and remaining rebuilt-image lane are recorded in
[the F3 exit proof](../reports/2026-08-22-f3-exit-proof.md).

## D2 Batch 3 admin Order reads

Protected GET `/api/v1/admin/orders` and `/api/v1/admin/orders/:id` use separate
admin policies and signed Order admin RPCs; personal routes retain verified
customer ownership. List allows status/userId/page/limit only and returns the
existing page-limit-total envelope. Gateway checks echoed pagination, total,
row bounds, filter facts and detail identity before returning explicit snapshots.
Default page/limit are 1/20; limit is capped at 100. The two routes and RPCs add
to the read-slice checkpoint inventories (79 routes, 48 profiles, 65 protected
Gateway RPCs). The current payment additions below raise these to 81/50/67.
The 59 R5 receivers remain preserved; the two reads and two payment operations
join four prior post-R5 RPCs explicitly deferred from paused F4 V3.
New-image/native/live proof remains pending in the
[read-slice receipt](../reports/2026-10-19-d2-batch3-reads.md).

Admin status PATCH now requires expectedVersion alongside status and forwards
the validated header key in its signed RPC body. Current admin reads and status
replies require a valid version; historical Checkout replay may omit it.
Returned status/version must match the command outcome. The owner restricts
manual demo writes to PENDING -> PAID -> FULFILLED and records durable replay
and verified audit. Required cancellation/payment operations and new-image/live
proof remain open; see the [status-control receipt](../reports/2026-10-19-d2-batch3-status-controls.md).

## D2 demo payment operations (source prepared)

POST `/api/v1/orders/:id/demo-payment-attempts` is customer-only for consumer
applications. POST `/api/v1/admin/orders/:id/demo-payment-attempts/:attemptId/outcome`
is admin/root-admin only for the admin application. Both require a version and
header idempotency key. Outcome additionally requires one of SUCCEEDED, FAILED,
CANCELLED or UNKNOWN. Caller actor/owner/amount/currency fields are rejected.

The response item contains explicit Order and demo Attempt snapshots. Gateway
checks verified owner on start, target/attempt identity, DEMO mode, fixed amount/
currency, timestamps and outcome/status/version consistency. UNKNOWN retains
PAYMENT_PROCESSING and the same version; confirmed failure/cancellation returns
PENDING only after the owner releases its allocation. Only the payment owner
may enter PAYMENT_PROCESSING. The signed RPCs propagate verified downstream
context and bind the command key/targets/version/outcome. No provider is called.

Current inventory is 81 routes, 50 input profiles, 67 protected RPCs; 59 R5
receivers/eight named F4 deferrals and four private Product stock RPCs remain
separate. Native/image/live proof is pending in the
[transport receipt](../reports/2026-10-24-d2-demo-payment-transports.md).
