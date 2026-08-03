# Clients Package

`@nebula/clients` provides thin typed wrappers for internal settings and taxonomy gRPC calls.

## Exports

- `getSettings(client)`
- `getTaxonomy(client)`
- `getSignedMetadata(options)`
- settings and taxonomy request/response proxy types

## Security Behavior

Every wrapper call signs its concrete generated RPC definition and concrete request with `buildGrpcS2SMetadata`.

```ts
buildGrpcS2SMetadata({
  target: SETTINGS_SERVICE_TARGET,
  definition: settings.SettingsServiceService.getString,
  request,
});
```

If a caller supplies bearer or other application metadata, the wrapper uses `mergeSignedMetadata`. Application fields are retained, reserved S2S envelope fields are discarded, and a fresh signature is always installed. Custom metadata therefore cannot suppress S2S authentication.

Each call and retry must create new metadata because timestamps and nonces are replay-protected.

## Settings Wrapper

`getSettings` exposes:

- `GetString`
- `SetString`
- `DeleteString`

## Taxonomy Wrapper

`getTaxonomy` exposes:

- `GetTaxonomy`
- `GetBySlug`
- `CreateTaxonomy`
- `UpdateTaxonomy`
- `DeleteTaxonomy`
- `ListTaxonomies`

It maps friendly create/update inputs to the protobuf request envelopes before signing, so the digest matches the actual transmitted request.

## Boundary

This package does not register Nest clients, resolve service URLs, retry calls, or own domain policy. Each consuming service owns its `ClientsModule` configuration and pairwise outbound key.

```powershell
pnpm --filter @nebula/clients check-types
pnpm --filter @nebula/clients build
```
