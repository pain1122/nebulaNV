# Gateway External API Standards

This document records the executable F3 Batch 4 boundary. It does not mean the
Batch 5 domain controllers or checked OpenAPI JSON already exist.

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

Controllers use `GatewayApiRoute(routeId)`. That one decorator derives the
runtime method/path, application/auth metadata, idempotency policy, stable
OpenAPI operation ID, header declarations, and response components. A
controller must not duplicate those values in independent decorators.

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
The canonical checked path remains
`apps/gateway/openapi/nebula-v1.openapi.json`; it must not be generated while
the shared controller list is empty.
