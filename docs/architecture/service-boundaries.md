# Service Boundaries

NebulaNV is a multi-service backend. Services should communicate through explicit contracts instead of sharing random internal shapes.

## Boundary Types

Use these at boundaries:

- DTOs for incoming HTTP/gRPC payloads
- Generated proto types for gRPC handlers
- `@nebula/clients` proxy types for cross-service calls
- Service input types for controller-to-service calls
- Prisma generated types for database interaction

## Cross-Service Calls

When one service calls another, use `@nebula/clients`.

Example:

```ts
import { getTaxonomy, type TaxonomyProxy } from "@nebula/clients";
```

The caller should trust the shared client type instead of re-declaring the remote response manually.

## Identity Boundary

Do not trust caller-supplied identity if authenticated context exists.

Use auth/gRPC guard helpers to resolve:

- actor user
- actor role
- service-to-service identity

For owner-scoped resources, keep these concepts separate:

- actor: who is doing the action
- owner: who owns the resource

## Database Boundary

Only the owning service should directly use its Prisma client.

Other services should call through gRPC/client packages.

Example:

Product service owns product DB access. Blog service should not import product-service Prisma types to query product tables.

## Settings And Taxonomy

Settings and taxonomy are shared capabilities.

Use the shared clients:

- `SettingsProxy`
- `TaxonomyProxy`

Do not call raw gRPC stubs unless there is no typed proxy yet.

## Tests

Tests may be looser than source files for now, but source files should avoid `any`.

Current cleanup convention:

- source unsafe `any`: error
- test unsafe `any`: warning

This keeps launch work moving without weakening production code.
