# Settings Service

Settings service owns runtime configuration values that other services read or write through a typed client.

## Main Flow

```txt
HTTP/gRPC request
-> settings DTO
-> SettingsService
-> settings storage
-> typed response
```

## Shared Client Types

Other services should call settings through `@nebula/clients`.

Important shared shapes:

- `SettingsProxy`
- `GetString`
- `SetString`

## Namespace Rule

Settings should be grouped by namespace.

Examples:

- `product`
- `pricing`
- `seo`

This avoids unrelated settings colliding on the same key.

## Environment Rule

Settings can be environment-aware.

Example:

```txt
namespace = product
environment = default
key = default_product_category
```

## Client Rule

Do not use raw gRPC stubs when a typed settings proxy exists.

Prefer:

```ts
this.settings().SetString(...)
```

Avoid:

```ts
this.settingsClient.getService<any>(...)
```

Typed proxies preserve request and response contracts.
