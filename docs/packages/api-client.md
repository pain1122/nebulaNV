# External API Client Package

`@nebula/api-client` is the generated, platform-neutral TypeScript client for
the public gateway. It is not the internal gRPC `@nebula/clients` package.

## Ownership

Contract source:

`apps/gateway/openapi/nebula-v1.openapi.json`

Generated output:

`packages/api-client/src/generated.ts`

Change gateway controllers, DTOs, or manifest metadata first, regenerate the
OpenAPI artifact, and then regenerate this client. Never hand-edit generated
output.

## Runtime Configuration

The client accepts:

- one gateway `baseUrl`;
- one registered public `publicClientId`;
- an optional structural fetch implementation;
- an optional access-token provider;
- optional credentials mode;
- a server/BFF-only configured application Origin.

There are no Auth, Product, Taxonomy, Media, gRPC, database, Redis, or MinIO
control-plane URL settings. Browser/mobile consumers configure only the
gateway API base. A client may follow a presigned storage or CDN URL returned
by a successful gateway response.

The client does not accept arbitrary headers. It derives the exact route,
method, public-client header, path/query/body encoding, Bearer requirement,
idempotency header, response mode, and response type from the generated
operation map. Gateway errors retain status, headers, request ID, and the safe
public error envelope.

## Platform Boundary

The shipped runtime uses only structural fetch/response interfaces and ES2021
primitives. It has no Node import and compiles both a DOM browser consumer and
a no-DOM React Native consumer. Node modules are used only by the generator and
test tooling.

The optional application Origin is for a trusted server-side BFF. Ordinary
browser JavaScript should not manufacture Origin or Fetch Metadata headers.
The current Next BFF uses this option after validating its configured
host/origin and retains a thin same-origin cookie adapter.

## Generation And Checks

```powershell
pnpm --filter @nebula/gateway openapi:generate
pnpm --filter @nebula/api-client generate
pnpm test:external-client
```

`generate:check` renders to an isolated temporary directory, byte-compares the
result with `src/generated.ts`, and removes only that temporary directory. The
external-client gate also runs lint, type-check, build, five runtime contract
tests, and browser/no-DOM React Native compile targets.

With the development stack already provisioned:

```powershell
pnpm test:f3:live
```

That bounded live proof covers anonymous storefront, authenticated storefront
user, authorized admin, registered mobile, and disabled partner execution. It
refuses `NODE_ENV=production` and never logs credentials or tokens.
