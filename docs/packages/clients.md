
# Clients Package

## Purpose

`@nebula/clients` provides shared typed client helpers for calling internal gRPC services.

It currently focuses on:

- Settings-service client proxy helpers.
- Taxonomy-service client proxy helpers.
- Shared S2S metadata helper utilities.
- Lightweight request/response/proxy TypeScript types.

This package is a consumer-side convenience layer. It helps services call stable gRPC contracts without importing another service's source code.

It is not a service registry and does not currently create Nest `ClientsModule` registrations. Each service still owns its own gRPC client module for proto path, package name, URL, loader options, and channel options.

## Location

Package root:

`packages/clients`

Important files:

- `packages/clients/index.ts`
- `packages/clients/src/settings.client.ts`
- `packages/clients/src/settings.types.ts`
- `packages/clients/src/taxonomy.client.ts`
- `packages/clients/src/taxonomy.types.ts`
- `packages/clients/src/s2s-metadata.ts`
- `packages/clients/package.json`
- `packages/clients/tsconfig.json`

## Package Name

The package is named:

`@nebula/clients`

It builds to:

`packages/clients/dist`

The package entrypoint works:

- `main`: `dist/index.js`
- `types`: `dist/index.d.ts`

## Public Exports

`packages/clients/index.ts` exports:

- Settings types.
- Settings client helper.
- S2S metadata helper.
- Taxonomy types.
- Taxonomy client helper.

Runtime exports currently include:

- `getSettings`
- `getTaxonomy`
- `getSignedMetadata`

Type-only exports include:

- `SettingsProxy`
- `TaxonomyProxy`
- `TaxonomyDto`
- Settings request/response shapes.
- Taxonomy request/response shapes.

## Settings Client

File:

`packages/clients/src/settings.client.ts`

Main helper:

```ts
getSettings(client: ClientGrpc): SettingsProxy
```

It wraps a Nest `ClientGrpc` and returns a typed proxy for:

- `GetString`
- `SetString`
- `DeleteString`

By default, each call attaches S2S metadata using:

```ts
buildS2SMetadata({ serviceName: process.env.SVC_NAME })
```

Callers can override metadata by passing their own `Metadata`.

## Settings Types

File:

`packages/clients/src/settings.types.ts`

Current request/response types:

- `GetStringReq`
- `GetStringRes`
- `SetStringReq`
- `SetStringRes`
- `DeleteStringReq`
- `DeleteStringRes`
- `SettingsProxy`

These mirror the settings-service gRPC contract but are manually maintained, not generated directly from `@nebula/protos`.

## Taxonomy Client

File:

`packages/clients/src/taxonomy.client.ts`

Main helper:

```ts
getTaxonomy(client: ClientGrpc): TaxonomyProxy
```

It wraps a Nest `ClientGrpc` and returns a typed proxy for:

- `GetTaxonomy`
- `GetBySlug`
- `CreateTaxonomy`
- `UpdateTaxonomy`
- `DeleteTaxonomy`
- `ListTaxonomies`

By default, each call attaches S2S metadata using:

```ts
buildS2SMetadata({ serviceName: process.env.SVC_NAME })
```

It also maps friendlier flat inputs into the proto request shapes:

- `CreateTaxonomy(req)` becomes `{ data: req }`.
- `UpdateTaxonomy({ id, ...patch })` becomes `{ id, patch }`.

## Taxonomy Types

File:

`packages/clients/src/taxonomy.types.ts`

Important types:

- `TaxonomyDto`
- `TaxonomyMeta`
- `GetTaxonomyReq`
- `GetBySlugReq`
- `CreateTaxonomyReq`
- `UpdateTaxonomyReq`
- `DeleteTaxonomyReq`
- `ListTaxonomiesReq`
- `TaxonomyRes`
- `TaxonomyListRes`
- `TaxonomyProxy`

These are manually maintained convenience types for consumers.

## S2S Metadata Helper

File:

`packages/clients/src/s2s-metadata.ts`

Main helper:

```ts
getSignedMetadata(kind?: "interservice" | "gateway")
```

It creates gRPC `Metadata` with:

- `x-svc`
- Gateway/S2S signature header, using `GATEWAY_HEADER` or `x-gateway-sign`.

It uses helpers from `@nebula/grpc-auth`:

- `resolveServiceName`
- `selectOutboundS2SSecret`
- `signS2S`
- `minuteBucket`
- `deriveServiceSecret`
- `S2S_METHOD_CANONICAL`
- `S2S_PATH_CANONICAL`

Current note: most package client wrappers use `buildS2SMetadata` directly from `@nebula/grpc-auth`, not `getSignedMetadata`.

## Current Consumers

Services that import `@nebula/clients` in source:

- Product-service
- Blog-service
- Order-service

Services that declare it as a dependency:

- Product-service
- Blog-service
- Order-service
- Taxonomy-service

Taxonomy-service currently declares the dependency but source usage was not found.

## Product-Service Usage

Product-service uses:

- `getSettings`
- `SettingsProxy`
- `getTaxonomy`
- `TaxonomyProxy`
- `TaxonomyDto`
- `UpdateTaxonomyReq`

Current usage areas:

- Product creation reads default currency from settings-service.
- Product creation reads default product category from settings-service.
- Product category validation calls taxonomy-service.
- Product taxonomy facade calls taxonomy-service through `getTaxonomy`.
- Default product taxonomy initializer uses both settings and taxonomy clients.

## Blog-Service Usage

Blog-service uses:

- `getSettings`
- `SettingsProxy`
- `getTaxonomy`
- `TaxonomyProxy`
- `TaxonomyDto`
- `UpdateTaxonomyReq`

Current usage areas:

- Blog taxonomy facade calls taxonomy-service through `getTaxonomy`.
- Default blog taxonomy initializer uses both settings and taxonomy clients.
- Blog taxonomy DTO types reference `TaxonomyDto`.

## Order-Service Usage

Order-service uses:

- `getSettings`
- `SettingsProxy`

Current usage area:

- Cart TTL is read from settings-service through `getSettings`.

Order-service does not currently use `getTaxonomy`.

## What This Package Does Not Do

`@nebula/clients` does not currently:

- Register Nest `ClientsModule`.
- Resolve proto paths.
- Own service URLs.
- Own gRPC loader options.
- Own channel options.
- Replace service-local client modules.
- Provide clients for auth-service, user-service, product-service, media-service, blog-service, or order-service.
- Generate its types directly from `@nebula/protos`.

Each consuming service still has modules like:

- `settings-client.module.ts`
- `taxonomy-client.module.ts`
- `product-client.module.ts`
- `auth-client.module.ts`

Those modules configure transport details. `@nebula/clients` only wraps the resulting `ClientGrpc`.

## Dependency Direction Standard

This package exists to prevent services from importing each other's source code.

Good dependency direction:

```text
product-service -> @nebula/clients -> taxonomy-service gRPC contract
blog-service -> @nebula/clients -> taxonomy-service gRPC contract
order-service -> @nebula/clients -> settings-service gRPC contract
```

Bad dependency direction:

```text
product-service -> apps/taxonomy-service/src/*
order-service -> apps/product-service/src/*
any service -> another service's Prisma models
```

Cross-service dependencies are allowed, but only through stable contracts:

- `.proto` files
- generated contract types
- shared client helpers
- explicit gRPC/HTTP APIs

A service should not import another service's implementation files.

## Important Behavior Notes

Default client calls attach S2S metadata automatically.

If a caller passes explicit metadata, the helper uses that metadata instead.

This matters for special cases. For example, some default taxonomy initializers use `getSettings()` for reads, but bypass the settings proxy for writes so they can send custom `x-user-id` metadata.

So this package is a convenience layer, not the whole authorization or metadata policy.

## Build And Validation

Useful commands:

```powershell
pnpm --filter @nebula/clients build
pnpm --filter @nebula/clients lint
pnpm --filter @nebula/clients check-types
```

Current validation status:

- Build passes.
- Lint passes.
- Type-check passes.
- Runtime package import works.

## Known Watch Points

- Settings and taxonomy types are manually maintained instead of generated from `@nebula/protos`.
- If `.proto` shapes change, client types may drift unless updated.
- Settings and taxonomy helpers are not perfectly symmetrical: settings is mostly a direct proxy wrapper, while taxonomy also reshapes flat helper inputs into proto request objects.
- Client helper style is not fully standardized yet. Before adding new clients, choose whether helpers should be pure pass-through wrappers or convenience mappers.
- `getSignedMetadata` exists, but current wrappers use `buildS2SMetadata` directly.
- The package does not centralize Nest gRPC registration, so repeated service-local client module boilerplate still exists.
- The package is currently narrow. That is good for stability, but future client helpers should be added deliberately.
- Avoid putting business policy here. Keep it as transport/proxy convenience only.

## Future Refinement

Create more service client helpers only when a contract is consumed by multiple services or the call pattern is security-sensitive.

Do not rush to create a full SDK for every service during contract freeze.

Likely future candidates:

- Product client helper, because order-service already consumes product-service manually.
- Media client helper, if product/blog/admin flows begin calling media-service directly.
- Order client helper, only if another backend service starts consuming order-service.

Auth is special and currently belongs mostly in `@nebula/grpc-auth`, not here.

Good long-term shape:

- `@nebula/protos` owns generated contract types.
- `@nebula/clients` owns thin, safe, S2S-aware call wrappers.
- Services own business logic and their own databases.
