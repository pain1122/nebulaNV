# Settings Service

Settings-service owns safe runtime configuration values that other services can read or write through HTTP, gRPC, or the typed `@nebula/clients` settings proxy.

Use it for app/business defaults and admin-managed configuration. Do not use it as a secret store or as the source of auth/trust policy.

## Owns

- Safe app and business configuration values.
- Frontend/admin defaults.
- Service defaults that are safe to expose as configuration.
- Namespaced key/value settings.
- Environment-aware settings.

Examples:

- Product default category.
- Product/order currency policy.
- Cart TTL.
- SEO or UI defaults.
- Blog/product taxonomy defaults.

## Does Not Own

- Secrets.
- Auth policy.
- Role hierarchy.
- Trust boundaries.
- DB URLs.
- S3/storage credentials.
- Per-service private logic.

Settings-service may influence service behavior through explicit consumers, but it must not become a hidden security boundary.

## Main Flow

```txt
HTTP/gRPC request
-> settings DTO/proto request
-> SettingsService
-> Postgres app_settings table
-> typed response
```

## HTTP Contract

Base controller: `/settings`

Current routes:

- `GET /settings/string`
- `PUT /settings/string`
- `DELETE /settings/string`

Access policy:

- `GET /settings/string` is public.
- `PUT /settings/string` requires `admin` or `root-admin`.
- `DELETE /settings/string` requires `admin` or `root-admin`.

HTTP string read returns:

```ts
{
  value: string;
  found: boolean;
}
```

HTTP string write returns:

```ts
{
  value: string;
}
```

HTTP string delete returns:

```ts
{
  deleted: boolean;
}
```

## gRPC Contract

Proto: `packages/protos/settings.proto`

Service: `SettingsService`

Current methods:

- `GetString`
- `SetString`
- `DeleteString`
- `EnsureBootstrapString`

Access policy:

- `GetString` is public.
- `SetString` requires valid S2S metadata plus admin/root-admin user context.
- `DeleteString` requires valid S2S metadata plus admin/root-admin user context.
- `EnsureBootstrapString` requires a verified service caller. Product-service is limited to `product/default_product_category`, blog-service is limited to `blog/default_blog_category`, and both require environment `default`.

Use the typed client from `@nebula/clients` when another service calls settings-service.

Use the general admin write only for verified human-admin flows:

```ts
this.settings().SetString(...)
```

Service-owned startup initialization uses the narrower typed method:

```ts
this.settings().EnsureBootstrapString(...)
```

Avoid raw untyped stubs when a typed proxy exists:

```ts
this.settingsClient.getService<any>(...)
```

## Storage Model

Database table: `app_settings`

Current Prisma model: `Setting`

The root Prisma commands include this service after user-service. Its current
base seed upserts settings-service-owned defaults. See
[Local Development And Docker Boot](../architecture/local-dev-and-docker-boot.md)
for the shared commands and complete database order.

Important fields:

- `namespace`
- `environment`
- `key`
- `valueString`
- `valueNumber`
- `valueBool`
- `valueJson`
- `deletedAt`

Unique identity:

```txt
namespace + environment + key
```

Example:

```txt
namespace = product
environment = default
key = default_product_category
```

Current public API exposes string values only. The DB already has fields for number, boolean, and JSON values, but those are not first-class HTTP/gRPC contracts yet.

## Normalization And Validation

Settings-service normalizes these fields:

- `namespace`
- `environment`
- `key`

Normalization behavior:

- Trim whitespace.
- Lowercase values.
- Default `environment` to `default` when omitted.

Allowed key format:

```txt
^[a-z0-9][a-z0-9._-]*$
```

Valid examples:

- `pricing/default_currency`
- `order/cart_ttl_minutes`
- `product/default_product_category`

Important: the slash above is conceptual documentation. In the actual API, namespace and key are separate fields.

Example API shape:

```ts
{
  namespace: "pricing",
  environment: "default",
  key: "default_currency"
}
```

## Known Consumers

Current or intended consumers:

- Product-service reads `pricing/default_currency`.
- Product-service reads `product/default_product_category` and writes it through the service-only bootstrap contract.
- Order-service reads `order/cart_ttl_minutes`.
- Order-service should use settings-service as the source of store currency/display policy.
- Blog-service retains an unwired default-taxonomy initializer. Activation is deferred until blog post creation consumes `blog/default_blog_category` or a separately approved launch requirement makes it mandatory.
- Admin/frontend can use settings-service for safe UI and business defaults.

## Current Tests

HTTP test file:

- `apps/settings-service/test/http/settings.http.e2e.spec.ts`

Covered behavior:

- Public string read returns miss for unknown key.
- Normal users cannot write.
- Admins can write.
- Public read returns written value.
- Normal users cannot delete.
- Admins can delete.
- Public read returns miss after deletion.

gRPC test file:

- `apps/settings-service/test/grpc/settings.e2e.spec.ts`

Covered behavior:

- Public `GetString` returns miss for unknown key.
- Normal users cannot `SetString`.
- Admins can `SetString`.
- Admin-written value can be read.
- Normal users cannot `DeleteString`.
- Admins can `DeleteString`.
- `SetString` without S2S metadata is rejected.
- Bootstrap writes enforce verified service identity, caller-specific key scope, and environment `default`.

Test setup waits for:

- Auth HTTP.
- Settings HTTP.
- Settings gRPC.

## Health

Health routes:

```txt
GET /health/live
GET /health/ready
GET /health
```

Liveness is dependency-free. Readiness and its `/health` compatibility alias
check Postgres and the S2S replay store, returning HTTP `503` with sanitized
check statuses when degraded.

## Known Gaps

- Only string settings are exposed through the active HTTP/gRPC contract.
- DB supports number, boolean, and JSON values, but those APIs are not implemented yet.
- `deletedAt` exists in Prisma but is not actively used by service logic.
- HTTP delete currently returns `{ deleted: true }` from the controller after calling service delete.
- No typed settings registry exists yet, so invalid business-level values can still be inserted by an admin.
- No audit/history exists for setting changes.
- No settings cache exists yet.
- Settings-service must not be used for secrets, credentials, auth policy, or trust decisions.

## Related Files

- `apps/settings-service/src/settings.service.ts`
- `apps/settings-service/src/settings.controller.ts`
- `apps/settings-service/src/grpc/settings-grpc.controller.ts`
- `apps/settings-service/src/settings.module.ts`
- `apps/settings-service/src/main.ts`
- `apps/settings-service/src/health.controller.ts`
- `apps/settings-service/src/config/env.validation.ts`
- `apps/settings-service/prisma/schema.prisma`
- `apps/settings-service/test/http/settings.http.e2e.spec.ts`
- `apps/settings-service/test/grpc/settings.e2e.spec.ts`
- `packages/protos/settings.proto`
- `packages/clients/src/settings.client.ts`
- `packages/clients/src/settings.types.ts`
