# D1 Product Destructive-Operation Checkpoint

Date: 2026-09-22

Status: implementation and all local, rebuilt-container, HTTP/gRPC end-to-end,
backend readiness, and preserved F3 live verification complete.

Scope: close confirmed defect D1-012 with stable Product deletion and gallery
missing-parent errors. Preserve the current hard-delete route and database
foreign-key protections without adding cascade deletion, a retention system,
or a schema migration.

## Evidence Classification

### Confirmed Defects

Product's admin gallery list queried only child rows, so a nonexistent Product
returned an indistinguishable empty collection. Empty reorder requests had the
same result, and image removal returned `image_not_found` before establishing
whether the named Product existed.

Product hard delete can be rejected by PostgreSQL because gallery, attribute,
comment, and VR-hotspot relations all use `ON DELETE RESTRICT`. Prisma reports
that outcome as `P2003`, but Product did not translate it to a stable domain
error. Soft delete, restore, and hard delete also performed a preflight read
before their write; deletion between those calls could turn the write's
`P2025` into the generic `Related record not found` response.

### Existing Mechanisms Preserved

The published Gateway and Product gRPC contracts already expose soft delete,
restore, and hard delete. PostgreSQL already protects dependent rows. This
repair keeps those mechanisms and gives their actual database outcomes stable
meaning. It does not broaden hard delete or silently destroy related records.

### Deferred Work

General record-retention policy, tenant/site scope, Product optimistic
concurrency, and Media-owned asset lifecycle remain separate roadmap work.
Hard deletion of cross-service references cannot be enforced by Product's local
foreign keys and is not claimed here.

## Implemented Contract

Product now implements these outcomes:

- soft delete and restore execute one database update and translate a missing
  target, including a concurrent disappearance, to `product_not_found`;
- hard delete executes one database delete and translates a missing target to
  `product_not_found`;
- a Product with any locally dependent gallery, attribute, comment, or
  VR-hotspot row retains those rows and returns `product_has_dependents`;
- HTTP translates that dependency outcome to `409 Conflict`, while gRPC
  translates it to `ALREADY_EXISTS` with the same stable message;
- hard delete remains available for dependency-free administrative cleanup;
- admin gallery list, reorder, and removal first establish that the Product
  exists and return `product_not_found` when it does not;
- once the Product exists, a missing or concurrently removed image returns
  `image_not_found`.

The Product preflight reads were removed from soft delete, restore, and hard
delete. The database write is the authoritative existence and dependency
decision, closing the read/write race while reducing each successful operation
from two Product queries to one.

## Compatibility And Cost

No route, protobuf, Gateway DTO, OpenAPI shape, database schema, or existing row
changes. Successful responses keep their current Product and gallery shapes.
Clients that previously received a generic `400` for a restricted hard delete
now receive an actionable conflict. Clients that interpreted an empty admin
gallery as proof that a Product existed must now handle the correct `404`.

Each admin gallery operation performs one Product existence read before child
work. Public gallery reads retain their stronger active/non-deleted parent
check and do not add a redundant parent query.

## Verification

Passed locally:

- Product TypeScript check;
- Product ESLint with no errors; the package's existing unsafe-`any` test
  warnings remain warnings;
- Product unit configuration: 10 suites and 59 tests;
- seven focused destructive-operation tests covering `P2025` mapping for all
  Product destructive operations, restricted hard delete, missing admin
  gallery parent, empty reorder, Product-versus-image absence, and an image
  deletion race;
- rebuilt Product container full configuration: 14 suites and 96 tests;
- container-backed gRPC assertions for missing admin gallery parent,
  restricted hard delete with dependent gallery rows, restore after soft
  delete, and successful hard delete of a dependency-free Product;
- all 11 backend readiness checks;
- all six F3 gateway/generated-client live flows;
- formatting and `git diff --check`.

The rebuilt-container run proves that PostgreSQL's `ON DELETE RESTRICT`
constraints surface through Product as the stable conflict contract while
dependency-free hard deletion and restore continue to work.

## Next Work

Continue the remaining Product core work by defining the minimum base-product
stock/availability and mutation-concurrency contract from current Product and
Order behavior before introducing bounded variants.
