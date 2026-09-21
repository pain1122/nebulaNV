# D1 Product Identifier Conflict Checkpoint

Date: 2026-09-21

Status: implementation and all local, rebuilt-container, HTTP/gRPC end-to-end,
backend readiness, and preserved F3 live verification complete.

Scope: close confirmed defect D1-009 while preserving the current globally
unique Product slug and SKU model. Tenant/site-scoped uniqueness remains a
later F4 migration.

## Evidence Classification

### Confirmed Defect

Product generated slugs and SKUs by querying before insert, which allowed two
concurrent requests to select the same identifier without a database-conflict
retry. Generated SKU values contained random tokens, while a caller-provided
duplicate SKU was silently changed by adding another random token. Explicit
duplicate slugs instead reached the generic database error path. Update also
stored slug text without applying create's normalization. The same logical
conflict therefore produced different stored values and errors depending on
the request path.

### Existing Mechanisms Preserved

PostgreSQL unique constraints remain the authority for global Product slug and
SKU uniqueness. Existing rows, primary IDs, routes, request/response shapes,
authorization, Product lifecycle, and public/admin visibility are unchanged.
No lookup-by-slug endpoint is added.

### Deferred Work

Tenant/site-scoped slug and SKU uniqueness remains the explicitly deferred F4
migration. Product optimistic concurrency is D1-010. Variant SKUs belong to the
later bounded variant model. This checkpoint does not claim any of those items
are complete.

## Implemented Contract

Product now treats identifier ownership as follows:

- an omitted slug is generated deterministically from the normalized title;
- an omitted SKU is generated deterministically as `SKU-<UPPERCASE-SLUG>`;
- a generated slug collision retries after the database unique constraint with
  suffixes `-2`, `-3`, and so on;
- a generated SKU collision retries with the same deterministic suffix order;
- retries are bounded at 1,000 attempts per generated identifier and fail as
  `product_identifier_exhausted` rather than looping forever;
- caller-supplied slug and SKU values remain caller-owned and are never
  silently rewritten to resolve a duplicate;
- explicit duplicate slug and SKU writes return HTTP `409` messages
  `product_slug_conflict` and `product_sku_conflict` respectively;
- the gRPC boundary translates those conflicts to `ALREADY_EXISTS` while
  preserving the stable message;
- create and update apply the same slug normalization, and both trim an
  explicitly supplied SKU.

The insert itself now decides uniqueness. The removed preflight reads could
only observe a stale snapshot and are no longer part of identifier generation.
If another writer wins after this request chooses a generated value, Product
uses the actual `P2002` result to select the next deterministic candidate.

Blank slug or SKU strings retain the current proto3-compatible omission
behavior: create generates the omitted value and update leaves that field
unchanged. Caller-supplied SKU casing remains unchanged apart from surrounding
whitespace, preserving existing client ownership of explicit SKU spelling.

## Data And Compatibility

No database migration or data rewrite is required. Existing generated SKUs
retain their historical date/random format. Only newly generated identifiers
use the deterministic format. Global database constraints remain unchanged so
the later F4 scoped-uniqueness migration requirement is still visible rather
than being implemented early.

Clients that omit identifiers keep receiving generated values. Clients that
previously relied on Product silently renaming a duplicate explicit SKU now
receive a conflict and must choose a new value. This is the intentional repair:
an administration client can present the collision instead of losing the
operator's requested identity.

## Verification

Passed locally:

- Product TypeScript check;
- Product build;
- Product ESLint;
- Product unit configuration: 9 suites and 51 tests;
- six focused identifier tests covering generated slug retry, generated SKU
  retry, explicit slug conflict, explicit SKU conflict, update normalization,
  and update conflict mapping;
- formatting and `git diff --check`;
- rebuilt Product container full configuration: 13 suites and 84 tests;
- Product HTTP assertions for both stable `409` conflict messages;
- Product gRPC assertion for `ALREADY_EXISTS` with the stable SKU-conflict
  message;
- all 11 backend readiness checks;
- all six F3 gateway/generated-client live flows.

The rebuilt-container run proves that the PostgreSQL constraints expose the
same contract as the focused mocks. It also proves that deterministic generated
values remain compatible with the existing Product HTTP and gRPC create flows.

The readiness check initially repeated `backend_health_failed_user-service`
because Docker infrastructure had resumed while development application
containers, which intentionally have no restart policy, were stopped. The
prepared stack was restored and now reports all 11 services healthy. The
supported recovery command is `docker compose up -d --no-build`; the health
command remains a read-only diagnostic.

## Next Work

Continue with stable destructive-operation errors before the larger stock,
availability, optimistic-concurrency, and variant work.
