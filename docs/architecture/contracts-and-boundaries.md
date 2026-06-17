# Contracts And Boundaries

Last reviewed: 2026-06-17

Purpose: define how data shapes move through NebulaNV services without leaking random internal objects across layers.

This file replaces the older split notes for type shapes, naming conventions, HTTP/gRPC/Prisma flow, and service boundaries.

## Core Rule

Every boundary gets one translation point.

```txt
external request
-> controller boundary
-> service input
-> service logic
-> Prisma/database
-> response mapper
-> public response
```

Do not pass raw request, proto, or Prisma objects through multiple layers.

Bad:

```ts
service.create(req as any);
```

Good:

```ts
const input: CreateProductInput = {
  title: dto.title,
  categoryId: dto.categoryId,
};

return service.create(input);
```

## Shape Types

| Shape | Used For | Rule |
| --- | --- | --- |
| DTO class | HTTP/gRPC input validation | Validate external payloads only. |
| Generated proto type | gRPC controller boundary | Convert before deep service logic if shapes differ. |
| Service input type | Controller-to-service call | Stable internal shape. |
| Prisma generated type | DB filters, writes, records | Keep inside owning service. |
| View/response type | Public API output | Use mappers when response differs from DB. |
| `@nebula/clients` proxy type | Cross-service gRPC calls | Prefer typed proxy over raw gRPC stub. |

## Naming Rules

Inside TypeScript service code, prefer `camelCase`.

Examples:

- `thumbnailUrl`
- `categoryId`
- `discountType`
- `ownerId`
- `actorUserId`

Environment variables use `UPPER_SNAKE_CASE`.

Examples:

- `SVC_NAME`
- `AUTH_GRPC_URL`
- `MEDIA_PUBLIC_FOLDER`

Only translate names at real boundaries:

- HTTP controller
- gRPC controller
- Prisma mapper
- External provider adapter

Different names must mean different things.

Example:

- `actorUserId`: who is performing the action.
- `ownerId`: who owns the resource.

Do not merge those just because both can contain a user ID.

## Controller Rule

Controllers adapt transport input.

They should:

- Validate DTOs.
- Read route/query/body/proto fields.
- Resolve auth context through guards/decorators.
- Build service input objects.
- Return mapped service responses.

They should not:

- Own deep business policy.
- Leak raw transport objects into service methods.
- Re-declare cross-service response shapes when a shared client type exists.

## Service Rule

Services own business behavior.

They should receive known internal inputs, not random request/proto objects.

Service methods should be callable from:

- HTTP controllers.
- gRPC controllers.
- Tests.
- Internal helpers.

without depending on the original transport.

## Prisma Rule

Only the owning service directly uses its Prisma client.

Forbidden:

- Service A importing Service B's Prisma client.
- Service A querying Service B's database tables.
- Frontend code depending on Prisma model shapes.

Allowed:

- Service A calls Service B through HTTP/gRPC.
- Service A uses `@nebula/clients` where a typed client exists.
- Service A stores remote IDs only after validating the remote contract.

## Mapper Rule

Use mappers when public response shape differs from DB shape.

Common mapper jobs:

- Convert `Date` to string.
- Convert `Decimal` to safe response values.
- Hide internal fields.
- Normalize nullable values.
- Preserve stable public names.

Example:

```ts
function toProductView(product: Product): ProductView {
  return {
    id: product.id,
    title: product.title,
    createdAt: product.createdAt.toISOString(),
  };
}
```

## Cross-Service Rule

Use shared clients for cross-service gRPC calls.

Examples:

- `SettingsProxy`
- `TaxonomyProxy`
- `getSettings(client)`
- `getTaxonomy(client)`

Avoid raw gRPC stubs unless no typed proxy exists yet.

## Identity Rule

Do not trust caller-supplied identity if authenticated context exists.

Use auth/gRPC guard helpers to resolve:

- actor user ID,
- actor role,
- service-to-service identity.

For owner-scoped resources, keep these concepts separate:

- actor: who is doing the action,
- owner: who owns the resource,
- target: which record is being acted on.

Spoofed metadata must not override signed JWT payloads.

## Settings And Taxonomy Rules

Settings-service stores safe app/business defaults. It does not own secrets, trust boundaries, auth policy, or role hierarchy.

Taxonomy-service stores global taxonomy records. Domain services should expose scoped facades where needed:

- Product-service hard-locks product taxonomy scope.
- Blog-service hard-locks blog taxonomy scope.

Consumers must verify taxonomy `scope` and `kind` before storing taxonomy IDs.

## Error Rule

Caught external errors should start as `unknown`, not `any`.

Pattern:

```ts
catch (e: unknown) {
  if (isRecord(e) && e.code === "P2002") {
    throw new BadRequestException("duplicate");
  }
  throw e;
}
```

Useful helpers:

- `isRecord`
- `errorMessage`
- `grpcErrorMessage`

## Review Checklist

When adding or changing a field:

- Does the DTO use the intended public name?
- Does the service input use the intended internal name?
- Does Prisma use the same name or an explicit `@map`?
- Does gRPC translate only at the controller boundary?
- Does the response mapper expose the intended public shape?
- Do tests use public API names instead of internal aliases?
- Is identity resolved from guard context instead of request body where applicable?
- Does cross-service data use a typed shared client or proto contract?
