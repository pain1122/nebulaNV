# API And Proto Versioning

Last reviewed: 2026-08-22

Purpose: define which NebulaNV HTTP and gRPC contract changes are backward-compatible, when a new version is required, and how contract changes are verified.

## Current State

- Internal gRPC contracts live in `packages/protos/*.proto` and generated TypeScript lives in `packages/protos/generated`.
- The current proto packages and HTTP routes are mostly unversioned. That does not make breaking in-place changes safe.
- Generated namespaces such as `authv1`, `productv1`, and `orderv1` are TypeScript export names. The wire identity still comes from each proto package, service, method, field number, and field type.
- External `/api/v1` gateway routes are implemented from one validated manifest:
  70 checked operations across 60 paths, a deterministic OpenAPI artifact, and
  the generated `@nebula/api-client` consumer contract.

## Compatibility Rule

Preserve the existing wire contract unless every known producer and consumer can be migrated atomically. When independent deployment or an external client makes atomic migration uncertain, introduce a new version and run both versions during migration.

Security fixes may intentionally reject behavior that was previously accepted. Treat that as a documented compatibility exception: add denial tests, identify affected callers, and provide a migration path where safe. Never preserve an unsafe bypass solely for compatibility.

## Backward-Compatible Proto Changes

Usually safe when semantics remain unchanged:

- Add a new field with a new, never-used field number.
- Add a new RPC without changing existing RPCs.
- Add a new message that existing methods do not require.
- Let old consumers ignore a newly added response field.
- Let new consumers tolerate an absent request/response field by using a documented default.

For every added field:

- choose a new field number;
- define absence/default behavior;
- do not make old callers send it immediately;
- verify old and new consumers during the rollout.

## Breaking Proto Changes

Require a new package/service version or a coordinated migration with no independent consumers:

- Reusing a field number or a reserved name.
- Changing a field number, wire type, scalar meaning, or repeated/singular shape.
- Renaming or removing a proto package, service, or RPC method.
- Moving a field to a different meaning while retaining its number.
- Changing a response from success to failure for ordinary valid input, except for an explicitly documented security correction.
- Making a previously optional value mandatory without a transition period.

When removing a field, stop writing it first, migrate all readers, then reserve both its number and name. Do not recycle either.

## HTTP Compatibility

The current unversioned service routes accept only additive, behavior-preserving evolution:

- Optional request fields with server defaults may be added.
- Response fields may be added when clients ignore unknown fields.
- Existing field names, meanings, status codes, authorization requirements, and error meanings must remain stable unless a security correction is required.

A breaking external contract must use a new route version such as `/api/v2`.
Keep the previous version available until known clients have migrated and the
deprecation window recorded for that release has ended.

## Deprecation And Rollout

1. Record the current producers and consumers.
2. Add the replacement contract without removing the old one.
3. Regenerate shared types and update adapters at controller/client boundaries.
4. Deploy readers that understand both shapes before writers emit only the new shape.
5. Add compatibility and denial tests for both paths.
6. Mark the old contract deprecated in source and service docs.
7. Remove it only after every known consumer has migrated and at least one published release has carried the deprecation.
8. Reserve removed proto field numbers and names.

## Verification

For proto changes run:

```powershell
pnpm proto:gen
pnpm proto:check
pnpm --filter @nebula/gateway openapi:check
pnpm --filter @nebula/api-client generate:check
pnpm check-types
pnpm test:security
```

Then run the affected service tests and the provisioned live lane when wire behavior changed:

```powershell
pnpm test:e2e:provision
pnpm test:e2e
```

Generated files are ignored build artifacts and are never edited by hand.
`proto:check` performs isolated, non-mutating generation and verifies the
expected contract inventory, so unrelated tracked changes do not affect the
result. Source and Docker builds generate again through the same package-owned
tool before compiling the output.
