# D1 Gallery Append Checkpoint

Date: 2026-09-21

Status: implementation and all focused, container-backed Product, backend
readiness, and preserved F3 live verification complete.

Scope: close confirmed defect D1-011 without changing gallery ownership,
introducing Media policy early, or redesigning the external API.

## Evidence Classification

### Confirmed Defect

Product already treats an absent image `sort` as an append request. The
external gateway DTO also declares `sort` optional. The internal proto used a
plain proto3 scalar, however, and Gateway explicitly converted omission to
zero. An ordinary external addition therefore reached Product as an explicit
position zero and contradicted the documented owning-service behavior.

### Working Mechanisms Preserved

Product continues to own gallery rows and sort calculation. Existing public
parent-visibility checks, admin authorization, soft-deletion filtering,
explicit reorder operations, response validation, field numbers, routes, and
external DTO shapes are unchanged.

### Separate Open Work

Unchecked Media URLs remain D1-008. Concurrent append calls can still observe
the same current maximum and belong to the wider D1-010 concurrency repair.
Duplicate caller-supplied explicit positions and missing-parent/destructive
semantics remain separate audited items. This checkpoint does not claim those
issues are closed.

## Implemented Contract

`NewImage.sort` is now an optional proto3 field on its existing field number
`3`. Gateway omits the internal field when the external caller omits it and
retains explicit zero. Product then:

- appends each omitted item sequentially after the maximum active gallery
  position;
- preserves an explicitly supplied non-negative position, including zero;
- keeps the existing deterministic list order of `sortOrder`, then `createdAt`.

The wire change is backward compatible at the field-number level. Older
non-presence-aware senders already omit scalar zero on the wire, so a zero from
those old senders is interpreted as omission. A client that needs an explicit
zero must regenerate against the optional field. The maintained Gateway does
so and preserves that presence.

## Verification

Passed locally:

- isolated proto regeneration check;
- rebuilt `@nebula/protos` package;
- Product and Gateway type checks plus Clients type check;
- Product unit configuration: 8 suites and 45 tests;
- focused Product gallery test proving omitted sort appends after active rows
  while explicit zero remains zero;
- focused Gateway Product adapter: 7 tests, including omission versus explicit
  zero at the gRPC request boundary;
- rebuilt Product container full configuration: 12 suites and 75 tests,
  including the two-image omitted-sort gRPC assertion;
- all 11 backend readiness checks;
- all six F3 gateway/generated-client live flows;
- focused ESLint with no errors;
- formatting and `git diff --check`.

The Product gRPC suite now submits two images without sort in one request and
expects stable positions zero and one on both the add response and subsequent
admin read.

During the container proof, infrastructure containers had restarted under
their `unless-stopped` policy while development application containers, which
have no restart policy, remained exited with code 255. Recreating only Product
and Gateway with `--no-deps` left the other nine application services stopped,
so the read-only health command correctly failed at User. Starting the complete
prepared stack, then restarting Product after Settings and Taxonomy were
healthy, restored all readiness checks. The supported prepared-stack recovery
command remains `docker compose up -d --no-build`.

## Compatibility And Cost

No database migration, backfill, OpenAPI regeneration, route change, or
external-client shape change is required. The external `sort?: number` contract
already represented the intended behavior. Runtime cost is unchanged: Product
still performs one maximum-position read and one batched insert per add request.

## Next Work

Continue with deterministic slug/SKU conflict behavior and stable
destructive-operation errors before adding the larger stock, availability,
concurrency, and variant schema.
