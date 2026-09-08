# Clients Package

`@nebula/clients` provides thin typed wrappers for the manifest-selected Auth,
User, Settings, Product, product-taxonomy, Blog, blog-taxonomy, generic
Taxonomy, Order, and Media gRPC calls.
It also provides the read-only tenant-authority v1 wrapper staged for F4.

## Exports

- `getSettings(client, signingPolicy?)`
- `getTaxonomy(client, signingPolicy?)`
- `getAuth(client, signingPolicy?)`
- `getUser(client, signingPolicy?)`
- `getProduct(client, signingPolicy?)`
- `getProductTaxonomy(client, signingPolicy?)`
- `getBlog(client, signingPolicy?)`
- `getBlogTaxonomy(client, signingPolicy?)`
- `getOrder(client, signingPolicy?)`
- `getMedia(client, signingPolicy?)`
- `getTenantAuthority(client, signingPolicy?)`
- `GrpcClientSigningPolicy`
- `buildClientGrpcS2SMetadata(options)`
- `getSignedMetadata(options)`
- settings and taxonomy request/response proxy types
- typed proxy interfaces and recursive request-input types for the selected
  generated contracts

## Security Behavior

Every wrapper call signs its concrete generated RPC definition and concrete request through `buildClientGrpcS2SMetadata`.

```ts
buildClientGrpcS2SMetadata({
  policy,
  target: SETTINGS_SERVICE_TARGET,
  definition: settings.SettingsServiceService.getString,
  request,
});
```

The optional policy may inject only caller kind/name, pairwise key, verified signed context, and ingress request ID. The wrapper still owns the fixed target, generated RPC definition, and actual shaped request body. Timestamp and nonce are not injectable and are fresh for every invocation/retry. Omitting the policy preserves the original ordinary-service v2 behavior and environment-based service identity/key lookup.

A gateway policy must include signed context; missing context fails closed. A
context-propagating ordinary service obtains its policy from
`createVerifiedServiceDownstreamContext(...)`, supplies the inherited context
and request ID, and retains its own environment-resolved service identity and
pairwise target key.

If a caller supplies bearer or other application metadata, the wrapper uses `mergeSignedMetadata`. Application fields are retained, reserved S2S envelope fields are discarded, and a fresh signature is always installed. Custom metadata therefore cannot suppress S2S authentication, change the target, replace context, or override the request ID.

Each call and retry creates a fresh signature, timestamp, and nonce because
replay state is per invocation. A new public gateway ingress creates the
request ID; every nested causal service hop preserves that verified request ID
while re-signing as its own service identity with its own pairwise target key.

## Settings Wrapper

`getSettings` exposes:

- `GetString`
- `SetString`
- `DeleteString`
- `EnsureBootstrapString` (internal bootstrap callers only)

## Taxonomy Wrapper

`getTaxonomy` exposes:

- `GetTaxonomy`
- `GetBySlug`
- `CreateTaxonomy`
- `UpdateTaxonomy`
- `DeleteTaxonomy`
- `ListTaxonomies`
- `EnsureSystemTaxonomy` (internal product/blog bootstrap callers only)

It maps friendly create/update inputs to the protobuf request envelopes before signing, so the digest matches the actual transmitted request.

## Manifest-Selected Wrappers

- Auth includes register, credential validation/token issuance, refresh,
  logout, token validation, and profile. Auth-service remains the token owner.
- User includes get, the intentionally unpaginated admin list, and self-profile
  update. Auth-only create/hash lookup methods are absent.
- Product includes authoritative public reads, distinct admin reads, selected
  mutations, and gallery actions. ProductTaxonomy is a separate proxy on the
  same product connection.
- Blog includes published public reads and selected admin mutations.
  BlogTaxonomy is a separate proxy on the same blog connection.
- Order includes the user cart/checkout/order paths and admin status update;
  Ping and nonexistent admin list/read behavior are absent.
- Media includes the selected administrative lanes, owned protected list/read,
  and two-step public deletion. Compatibility Create/List/Delete, Ping, and
  direct public delete are absent from this gateway-facing proxy.
- Tenant authority includes application registration, allowed web-origin,
  target-scope, entitlement-reference, and explicit actor/target authority
  reads only. The actor resolver still requires the caller to supply the exact
  v2 resolution signing policy and bearer metadata; the wrapper cannot create
  trusted actor facts. It has no generic CRUD or mutation method, and a
  resolved fact does not authorize a domain action.

Each method binds one generated unary definition and signs the actual
protobuf-shaped request. `GrpcRequestInput<T>` removes generated `$type`
markers recursively while retaining the generated field types.

## Boundary

This package does not register Nest clients, resolve service URLs, retry calls,
or own domain policy. Each consuming runtime owns its `ClientsModule`
configuration and pairwise outbound key. Gateway registration requires all
eight currently active deployment-owned `host:port` targets; the staged
tenant-authority target joins that exact gateway set only when its persistent
adapter is wired. Clients cannot select or override
those upstreams.

```powershell
pnpm --filter @nebula/clients check-types
pnpm --filter @nebula/clients lint
pnpm --filter @nebula/clients test
pnpm --filter @nebula/clients build
```
