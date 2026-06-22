
# Protos Package

## Purpose

`@nebula/protos` is the shared gRPC contract package for NebulaNV.

It owns the `.proto` files that define service boundaries between backend services, plus generated TypeScript types used by NestJS gRPC controllers, clients, tests, and shared guards.

This package is contract-level only. It should not contain business logic, auth policy, database logic, or service implementation code.

## Location

Package root:

`packages/protos`

Important files:

- `packages/protos/*.proto`
- `packages/protos/generated/*.ts`
- `packages/protos/index.ts`
- `scripts/proto-gen.mjs`
- `packages/protos/package.json`
- `packages/protos/tsconfig.json`

## Proto Contracts

Current source proto files:

- `auth.proto`: AuthService token validation, token issuing, refresh, and profile lookup.
- `user.proto`: UserService user lookup, profile update, and auth-facing user/hash methods.
- `settings.proto`: SettingsService string key-value reads, writes, and deletes.
- `taxonomy.proto`: TaxonomyService canonical taxonomy CRUD/list/get-by-slug.
- `media.proto`: MediaService media metadata, listing, deletion, presigned uploads, and finalize upload.
- `product.proto`: ProductService product CRUD, gallery, discount methods, and product taxonomy facade.
- `blog.proto`: BlogService post CRUD/list and blog taxonomy facade.
- `order.proto`: OrderService cart, checkout, order lookup/list, and status update.

## Generated Output

Generated files live in:

`packages/protos/generated`

Current generated files include:

- `auth.ts`
- `user.ts`
- `settings.ts`
- `taxonomy.ts`
- `media.ts`
- `product.ts`
- `blog.ts`
- `order.ts`
- `typeRegistry.ts`

Generated files should not be hand-edited.

Regenerate with:

```powershell
pnpm proto:gen
```

Check generated output with:

```powershell
pnpm proto:check
```

Important: `proto:check` currently checks the full git working tree. Run it from a clean tree, otherwise unrelated dirty files can make it fail.

## Public Exports

`packages/protos/index.ts` currently exports:

- `authv1`
- `userv1`
- `productv1`
- `settings`
- `blogv1`
- `taxonomy`
- `media`

Known gap:

- `generated/order.ts` exists, but `index.ts` does not export an `order` namespace yet.
- This is not currently fatal because order-service uses the raw `order.proto` path for transport setup.
- If order-service starts using generated request/response types from `@nebula/protos`, add an explicit `order` export.

## How Services Use This Package

There are two valid usage patterns.

### Raw Proto Path For gRPC Transport

Services and tests use `require.resolve("@nebula/protos/<name>.proto")` when configuring Nest gRPC transports or test clients.

Examples:

- Auth-service uses `auth.proto` and `user.proto`.
- User-service uses `user.proto` and `auth.proto`.
- Settings-service uses `settings.proto` and `auth.proto`.
- Product-service uses `product.proto`, `auth.proto`, `settings.proto`, and `taxonomy.proto`.
- Blog-service uses `blog.proto`, `auth.proto`, `settings.proto`, and `taxonomy.proto`.
- Taxonomy-service uses `taxonomy.proto`, `auth.proto`, and `settings.proto`.
- Media-service uses `media.proto` and `auth.proto`.
- Order-service uses `order.proto`, `auth.proto`, `product.proto`, and `settings.proto`.

### Generated Types For Controllers And Guards

Service code imports generated namespaces from `@nebula/protos`.

Examples:

- `authv1` is used by auth-service and grpc-auth.
- `userv1` is used by auth-service and user-service.
- `settings` is used by settings-service.
- `taxonomy` is used by taxonomy-service.
- `media` is used by media-service.
- `productv1` is used by product-service.
- `blogv1` is used by blog-service.

## Contract Change Checklist

When changing a proto contract:

1. Edit the source `.proto` file.
2. Run `pnpm proto:gen`.
3. Check generated output under `packages/protos/generated`.
4. Update `packages/protos/index.ts` if a new generated namespace should be public.
5. Update affected service controllers, clients, and tests.
6. Run the focused service tests first.
7. Run broader contract/e2e tests after the focused tests pass.

## Known Watch Points

- Do not hand-edit `packages/protos/generated`.
- Do not treat proto fields as database truth; Prisma schemas still define persisted storage.
- Keep proto contracts backward-aware because several services consume them directly.
- `order.proto` has generated output but no package-level export yet.
- `packages/protos/scripts/write-index-dts.cjs` appears stale because it only writes `authv1` and `userv1`.
- If declaration generation starts using that script again, update it or remove it to avoid misleading package types.
