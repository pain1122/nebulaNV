# Gateway External API Standards

This document records the executable F3 gateway boundary. Batch 4 established
the shared contract machinery, Batch 5 landed the controllers, Batch 6 landed
the runtime/release boundary, and Batch 7 landed the generated external client
and current-web compatibility adapter. The checked contract contains 70
operations across 60 `/api/v1` paths.

## Contract Source

`apps/gateway/src/contracts/route-policy.ts` is the validated route-policy
aggregator. Service-specific definitions under `contracts/routes/` contain the
70 selected F3 endpoints and fix, for each endpoint:

- HTTP method and `/api/v1` path;
- accepted application profiles and actor policy;
- downstream target and RPC/transport;
- external input profile;
- success status, response, and pagination profile;
- retry/idempotency profile.

Controllers use `GatewayApiRoute(routeId, documentation)`. That one decorator
derives the runtime method/path, application/auth metadata, idempotency policy,
stable OpenAPI operation ID, HTTP success status, header declarations, and
response components. The optional documentation argument supplies only
concrete request/response DTO types and cookie response metadata; a controller
must not duplicate manifest values in independent decorators.

The shared `GATEWAY_HTTP_CONTROLLERS` list is imported by both the runtime
module and contract-only OpenAPI module. Health controllers are intentionally
not in that list.

## JSON Envelopes

An item or action response is:

```json
{
  "data": {},
  "requestId": "generated-ingress-request-id"
}
```

A collection response is:

```json
{
  "data": [],
  "meta": {
    "pagination": {
      "profile": "page-limit-total",
      "page": 1,
      "limit": 20,
      "total": 0
    }
  },
  "requestId": "generated-ingress-request-id"
}
```

An error response is:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request validation failed",
    "details": [{ "field": "body.email", "code": "invalid_format" }]
  },
  "requestId": "generated-ingress-request-id"
}
```

The gateway filter maps HTTP/gRPC failures to stable gateway codes and safe
messages. It does not return exception stacks, raw upstream messages, internal
service metadata, Redis details, or credentials. Validation details contain
only a stable field path and one of the declared validation codes.

The media render byte stream, successful empty/204 responses, and operational
health responses are not wrapped. Errors produced before media bytes begin may
still use the JSON error envelope. After response bytes begin, failures are
logged with the request ID and cannot be changed into JSON.

## Pagination Profiles

- `page-limit-total`: blog and taxonomy preserve downstream `page`, `limit`,
  and `total`.
- `total-only`: product collections expose only the downstream `total`; the
  gateway does not invent page-count metadata.
- `offset-take`: media collections expose `skip` and `take`; no total exists.
- `unpaginated`: current User, Order, gallery, and other selected collections
  explicitly state that the returned collection is unpaginated.

## Input And Query Policy

`input-profiles.ts` is the validated input-profile aggregator. Service-specific
definitions under `contracts/inputs/` own the external key allowlists and
cross-field rules; duplicate profile names fail at module load. Unknown body,
query, and path keys fail closed on every manifest-backed route before a
downstream operation. Detailed value types and formats remain in external DTOs
as controllers land.

The public-client HTTP trust boundary lives in `http/public-client-boundary.ts`;
the pure trusted request/actor builders live in
`application/trusted-request.ts`. These names distinguish runtime request state
from project/AI context documentation. Shared OpenAPI envelope descriptions
live in `contracts/openapi-envelope.dto.ts` and remain separate from runtime
envelope builders.

Tests mirror this ownership under `test/contracts/`: aggregate suites prove
route/profile uniqueness and cross-domain invariants, while service-specific
input suites own their accepted fields, rejected authority controls, required
relationships, and bounded collections.

Important boundary rules include:

- public product reads cannot send lifecycle/deletion controls;
- external product writes accept `content`, which the adapter maps to the
  internal Product `description` field;
- public and admin string-setting keys have separate exact allowlists;
- raw taxonomy scope/system controls are unavailable;
- public media listing cannot select an owner, while protected/strict admin
  listing may do so;
- media lane routes cannot select access class, visibility, or upstream URL;
- browser refresh/logout cannot submit native refresh-token body material;
- unsupported cross-field combinations and bounded gallery sizes fail closed.

## Application Profiles And Registry

`X-Nebula-Client-ID` is a registered public identifier, not a password or an
attestation claim. The strictly validated F3 registry maps each accepted ID to
one fixed application ID, profile, tenant, site, channel, origin set, enabled
state, and rate-limit profile:

- `storefront-web` supports anonymous and authenticated storefront traffic and
  requires an exact registered browser Origin;
- `admin-web` supports the current same-origin Next BFF and admin routes, with
  admin/root-admin actor checks applied independently;
- `mobile` is originless and still requires a registered enabled ID, actor
  authentication where the route requires it, and all normal domain checks;
- `partner-server` is reserved only. F3 creates no partner route, credential,
  or executable registry record.

Raw application, tenant, site, channel, actor, role, request-ID, S2S, or
forwarded-host headers never replace the registry record. A copied public ID
can select only its fixed enabled record and does not authenticate a human or
prove binary authenticity. The gateway generates the ingress request ID and
Auth-service remains the authority for actor identity and role.

`GATEWAY_APPLICATION_REGISTRY_JSON` is the F3 deployment adapter. Production
requires it explicitly and rejects malformed, duplicate, disabled-fallback, or
unsafe records at startup. F4 replaces this adapter with persistent
tenant/site/channel/application and membership authority behind the existing
registry interface; it does not move trust into browser headers or
settings-service.

## Retry Profiles

- `safe`: GET/HEAD may receive a bounded retry only before response delivery.
- `key`: `Idempotency-Key` is mandatory. There is no automatic mutation retry
  without a completed matching replay record.
- `session`: login is not retried automatically; refresh follows Auth's
  single-flight rotation contract and is not placed in the generic replay
  cache.
- `stream`: media render may retry only before response headers or bytes are
  delivered.

Every selected route has exactly one executable retry profile. In particular,
cart add, blog create, and checkout do not become durable exactly-once domain
operations merely because the gateway has a response cache.

## Idempotency-Key Contract

The header is one ASCII value matching
`^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$` (16-128 bytes). Clients should generate
a UUID or equivalently high-entropy value; syntax validation cannot prove
entropy.

Redis keys contain only a SHA-256 scope digest. Scope binds:

- registered application ID;
- verified actor ID, or `anonymous` for the few anonymous key routes;
- manifest route ID;
- client idempotency key.

The request hash is SHA-256 over canonical JSON containing the manifest route,
HTTP method, path parameters, query, and body. Object keys are sorted; invalid,
non-finite, circular, or non-JSON material is rejected.

The atomic state machine is:

1. The first request reserves `in-flight` with a unique lease for 60 seconds by
   default.
2. The same key and request hash receives `IDEMPOTENCY_IN_PROGRESS` while that
   lease is active.
3. The same scoped key with different request material receives
   `IDEMPOTENCY_CONFLICT`.
4. A successful JSON response replaces the matching lease atomically and is
   retained for 24 hours by default.
5. A matching completed request replays the stored status, safe selected
   headers, and body data, while rebinding `requestId` to the new ingress.

Local key/header/manifest-profile failures and the browser cookie-CSRF guard are
rejected before a lease is claimed. Later DTO or handler failures retain their
short lease because the gateway cannot always distinguish a pre-commit
downstream error from a lost post-commit response. Completed replay state may
retain `Location`, `ETag`, and only the strictly validated, secret-free
`refreshToken` deletion cookie needed to repeat browser logout. A live cookie
value is never stored.

Key-profile routes fail closed with `IDEMPOTENCY_STORE_UNAVAILABLE` when Redis
cannot claim or complete state. An ambiguous downstream failure deliberately
leaves the short in-flight lease rather than immediately allowing a duplicate.
After a gateway crash or lease expiry, however, a downstream operation may have
committed without a completed gateway record. Durable exactly-once behavior
therefore requires an owning-service transaction/idempotency mechanism and is
not promised by F3 gateway replay suppression.

The default completed TTL is 86,400 seconds, the in-flight TTL is 60 seconds,
and a cached response is limited to 524,288 bytes. All are bounded validated
environment values.

## OpenAPI Ownership

The gateway uses the official Nest `SwaggerModule.createDocument()` flow. The
contract-only `GatewayOpenApiContractModule` contains only the shared external
controller list, opens no listener, and does not import gRPC, Redis, production
configuration, or lifecycle providers. Runtime Swagger UI is not enabled.

Batch 4 supplies the stable external envelope/error/pagination models and a
deterministic serializer. Batch 5 adds and snapshots each real domain route.
The current snapshot contains every selected Batch 5 Auth, User, Settings,
Product, Blog, domain-scoped Taxonomy, Order, and Media operation.
The canonical checked path is
`apps/gateway/openapi/nebula-v1.openapi.json`; `openapi:generate` changes it
intentionally and `openapi:check` verifies it without writing.

Nest may reflect a query DTO beside manifest-owned explicit query metadata.
The document owner removes duplicate `(in,name)` parameters while retaining
the first explicit, stricter schema. Contract tests enforce uniqueness and
preserve constraints such as Media's `variant=web` enum.

## External TypeScript Client

`@nebula/api-client` is generated from the checked OpenAPI artifact and remains
separate from internal gRPC package `@nebula/clients`. Its runtime configuration
contains one gateway API base URL, one registered public client ID, an optional
Bearer provider, an injectable structural fetch implementation, and an
optional BFF-only configured application Origin. It has no internal service,
database, Redis, or storage-control-plane address.

The generated operation map types paths, queries, bodies, responses,
idempotency requirements, auth requirements, and JSON/binary response mode for
all 70 operations. The runtime never exposes a free-form header bag, and it
fails before fetch when a required Bearer, body, path value, or idempotency key
is absent. Browser and no-DOM React Native compile targets prove that the
shipped client has no Node-only runtime dependency. Presigned storage/CDN URLs
inside successful gateway responses remain deliberate data-plane destinations.

`generate:check` renders into a temporary directory, byte-compares the checked
client, and removes that exact temporary directory. It never rewrites tracked
output. See [API Client Package](../packages/api-client.md).

## Auth Session Transport

Auth-service remains the token/session authority. The gateway Auth adapter
uses the signed Batch 3 client and never signs, parses, rotates, or revokes JWTs
itself.

- Browser login/refresh returns the short-lived access token in JSON but keeps
  refresh material only in the host-only HttpOnly `refreshToken` cookie.
- The cookie uses `Path=/api/auth`, `SameSite=Lax`, no `Domain`, production-only
  `Secure`, and Auth's returned refresh lifetime.
- Browser refresh/logout passes the exact registry Origin boundary and then a
  pre-handler `Sec-Fetch-Site` gate before a cookie can be read.
- Native mobile receives and rotates both tokens in JSON and never uses the
  browser cookie path.
- Failed browser token rotation clears the cookie. Logout clearing is safely
  replayable with the route's idempotency result, without placing live refresh
  material in Redis.

## User Boundary

Self read/update routes take the target ID only from the Auth-verified actor;
there is no external user-ID or role field. Admin read/list routes are limited
to the `admin-web` application plus `admin`/`root-admin` actors, and
user-service repeats self/admin enforcement. The current list contract is
explicitly unpaginated and projects only ID, email, optional phone, role, and
creation time; password material is unavailable to the gateway wrapper.

## Settings Boundary

The anonymous setting surface is exactly `pricing/default_currency`. Admin
mutation authority is not inferred from arbitrary namespaces: the manifest
accepts only the four frozen non-secret string keys, while application and role
guards still require admin-web plus admin/root-admin for mutations. The gateway
always supplies settings environment `default`; query/body/path input cannot
select it. The adapter exposes only GetString, SetString, and DeleteString, so
the product/blog service-only bootstrap RPC remains unreachable.

## Product Boundary

Public list/get/gallery adapters call only the authoritative public Product
RPCs. They never forward `status` or `includeDeleted`; response validation also
fails closed if a public collection contains a non-ACTIVE/deleted product or a
deleted gallery row. Admin reads use distinct role-protected RPCs and keep soft
delete, restore, hard delete, bulk discount, and gallery mutations as separately
named manifest operations.

External write DTOs accept `content` and map it to Product's internal
`description` field. Updates build a deliberately sparse gRPC patch object so
an omitted field cannot become a generated scalar default, while an explicitly
supplied `false` or `0` remains present. The product receiver's existing
`defaults: false` loader setting is the wire-presence mechanism; no new patch
protocol or duplicate domain logic is introduced in the gateway.

## Blog And Taxonomy Boundaries

Public Blog list/get adapters call only the existing published-read contracts;
the gateway also rejects a non-PUBLISHED row if an upstream regression widens
the response. The admin surface is create/update/soft-delete only. It does not
invent a draft/archive list or an admin get-by-ID route, and update forwarding
uses the same sparse-presence rule as Product.

Product and Blog taxonomy routes use only `ProductTaxonomyService` and
`BlogTaxonomyService` on their respective domain connections. The external
request never contains `scope` or `isSystem`; the route and adapter select one
domain, the facade locks that scope again, and the gateway rejects a response
whose scope does not match. Raw global taxonomy mutations and service-only
ensure/bootstrap methods are therefore outside the HTTP controller and checked
OpenAPI surface.

## Order Boundary

Cart, checkout, and personal order list/get routes are limited to storefront
and mobile applications carrying a verified `user` actor. The proto retains
legacy `userId` fields, but the gateway sends them empty and order-service
derives identity from verified signed context; external body/query/path input
cannot select another user. Gateway response validation also rejects a cart or
personal order whose owner differs from the verified actor.

The admin surface contains only the separately named status update. It requires
admin-web plus `admin`/`root-admin`, and no admin order list/read contract is
invented. Keyed replay provides bounded duplicate suppression for cart and
checkout mutations but does not turn checkout into durable exactly-once work
after an ambiguous lost response.

## Media Control And Data Planes

The Media JSON surface is split into public-library administration, protected,
strict, and actor-owned protected controllers. Route and adapter selection fix
the downstream lane; external input never contains `accessClass`, `visibility`,
or an upstream URL. Public-list input cannot select an owner, protected/strict
admin lists may use their explicit owner filter, and owned results must carry
the verified user's owner ID plus PROTECTED/private classification. Public
library deletion exists only as preview plus confirmation-token operations.

Presign and read-URL results intentionally name storage data-plane destinations
that clients may follow. The gateway does not rewrite or pretend to own those
URLs. Media records and lane replies are validated before their JSON envelope
is returned.

`GET /api/v1/media/render/:id` is the sole binary exception. Startup requires
`MEDIA_RENDER_HTTP_URL` to be one fixed `http://host:port` origin without
credentials, path, query, or fragment. The proxy appends only a validated UUID
and optional `variant=web`, never follows redirects, never forwards an internal
Location header, and streams without buffering. It preserves the selected
content/cache/ETag/safety headers and the downstream status while retaining the
gateway request ID. Fixed library routes register before generic
`/admin/media/:id` so lane names cannot be captured as IDs.

## Runtime, Readiness, And Release Boundary

Gateway is one HTTP-only Nest runtime on port 3002. It exposes no gRPC listener
and owns no Prisma database. It is an outbound gRPC client of the eight hybrid
services, owns Redis-backed idempotency, and currently uses process-local
rate-limit counters. Its readiness matrix is limited to validated startup
configuration, the application registry, Auth transport, and gateway Redis. It
does not probe every domain channel or private Media-render transport, issue
synthetic domain requests, or construct health-only clients.

`/health/live`, `/health/ready`, and `/health` use the shared sanitized health
shape and remain outside `/api/v1`. A dependency failure produces degraded
readiness without leaking target addresses or credentials. Domain-route
availability can still degrade independently when a noncritical operation
fails.

Local Compose exposes gateway plus all nine hybrid HTTP/gRPC pairs for
diagnosis. Release Compose publishes gateway 3002 and the selected MinIO data
port 9000 only. Backend HTTP/gRPC, PostgreSQL, Redis, and MinIO console 9001
remain private. Media-service alone uses `PUBLIC_MODE=OPEN` on the private
network so the gateway can stream its already-public render route at
`http://media-service:3007`; private Media routes retain their guards. This is
not a second general service API boundary.
