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

Access policy:

- `GetString` is public.
- `SetString` requires valid S2S metadata plus admin/root-admin user context.
- `DeleteString` requires valid S2S metadata plus admin/root-admin user context.

Use the typed client from `@nebula/clients` when another service calls settings-service.

Prefer:

```ts
this.settings().SetString(...)
```

Avoid raw untyped stubs when a typed proxy exists:

```ts
this.settingsClient.getService<any>(...)
```

## Storage Model

Database table: `app_settings`

Current Prisma model: `Setting`

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
- Product-service reads/writes `product/default_product_category`.
- Order-service reads `order/cart_ttl_minutes`.
- Order-service should use settings-service as the source of store currency/display policy.
- Blog-service has a default taxonomy initializer designed to use settings-service, but it currently appears not wired as an active provider.
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

Test setup waits for:

- Auth HTTP.
- Settings HTTP.
- Settings gRPC.

## Health

Current health route:

```txt
GET /health
```

It returns process health:

```ts
{
  status: "ok";
  time: string;
}
```

It does not currently verify DB connectivity.

## Known Gaps

- Only string settings are exposed through the active HTTP/gRPC contract.
- DB supports number, boolean, and JSON values, but those APIs are not implemented yet.
- `deletedAt` exists in Prisma but is not actively used by service logic.
- HTTP delete currently returns `{ deleted: true }` from the controller after calling service delete.
- No typed settings registry exists yet, so invalid business-level values can still be inserted by an admin.
- No audit/history exists for setting changes.
- No settings cache exists yet.
- `/health` does not check Postgres connectivity.
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
