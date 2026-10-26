# External API Client Package

`@nebula/api-client` is the generated, platform-neutral TypeScript client for
the public gateway. It is not the internal gRPC `@nebula/clients` package.

D2's checkout snapshot contract adds read-only Order checkoutMode
`DEMO_NO_PAYMENT` and OrderItem variantId/selectedOptions. Amounts are fixed
two-decimal strings, dates ISO strings and meta/address fields JSON strings.
Browser and React Native type consumers cover the additive fields. No payment
credential input or durable checkout replay guarantee is introduced by this
declaration; rebuilt runtime proof remains separate.

For checkout, continue supplying idempotencyKey in the client's request options
and repeat the exact body on retry. The SDK already emits the required header;
it is not a new body field. The replay slice propagates that header to Order's
durable receipt. New-image integration remains pending, and no stock/recovery
guarantee is implied by the unchanged external type declaration.

## Ownership

Contract source:

`apps/gateway/openapi/nebula-v1.openapi.json`

Generated output:

`packages/api-client/src/generated.ts`

The 2026-10-07 saved-image integration adds
`admin_media_derivatives_get` and `admin_media_derivatives_regenerate`.
Regeneration requires an admin access token and idempotency key.
`media_render` accepts web/thumbnail/card/detail/mobile; image recipes are
admin requests, never public render query parameters. Run
`pnpm test:media:derivatives:live` after deploying the Media migration and
updated Media/Gateway images. Runtime evidence remains pending.

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

## Batch C metadata contract checkpoint

D2 Batch 1 adds optional variantId to orders_cart_add and option/line/Cart total
facts to the generated DTOs. All 77 operations and their identity/idempotency
policies remain unchanged. Browser and React Native compiler fixtures exercise
these fields. pnpm test:d2:cart:live is the separate Gateway-only runtime proof;
its deployment/result is pending in the
[execution receipt](../reports/2026-10-13-d2-batch1-execution.md).

At the Batch C checkpoint the inventory had 77 operations. Its new admin operations were
`admin_media_metadata_update` and `admin_products_gallery_metadata_update`;
they require bearer authorization and an idempotency key. JSON nullable text
preserves reset versus explicit empty value. Product create/update also accept
thumbnailTitle/thumbnailAlt. Admin reads expose stored overrides alongside
effective text; public Product reads expose effective text only.

The contract is generated and locally checked. Salar reports Batch C deployment
and `pnpm test:media:metadata:live` passed against updated images. Media/Product
integration and D1/F3 regressions also passed; Batch C is closed.

D2 Batch 3 adds `admin_orders_list` and `admin_orders_get`, making 79 operations.
Both are protected GET reads for an admin application and verified admin role;
personal Order paths keep owner-only authority. Admin list accepts optional
status/userId and page/limit (defaults 1/20, limit at most 100). Its envelope uses
`meta.pagination` with profile `page-limit-total`. Native/generated codec,
signing and typed consumer checks are local preparation; new-image proof remains
pending in the [read-slice receipt](../reports/2026-10-19-d2-batch3-reads.md).

`admin_orders_status` additionally requires `body.expectedVersion` and its
existing idempotency key. Read current admin Order.version before writing.
Response version is optional solely for immutable historical Checkout replay;
never substitute 1 when it is absent. Manual demo changes currently allow
PENDING -> PAID -> FULFILLED. Explicit unpaid cancellation uses the proved stock-restoration owner; generic
processing is still denied and must use the payment operation below. This
manual-status checkpoint had 79 operations. Deployment/live proof is pending in the
[status-control receipt](../reports/2026-10-19-d2-batch3-status-controls.md).

## D2 demo payment contract

The generated operation inventory now contains 81 operations, including
`orders_demo_payment_start` and `admin_orders_demo_payment_outcome`. Both require
bearer authorization, Idempotency-Key and `body.expectedVersion`. Start targets
`path.id`; admin outcome targets both `path.id` and `path.attemptId`, with
`body.outcome` SUCCEEDED/FAILED/CANCELLED/UNKNOWN. Customer/admin application and
verified-role policies remain enforced at Gateway and Order.

`data` contains `{order,attempt}`; attempt mode is explicitly DEMO. UNKNOWN stays
PROCESSING with no Order version increment. Confirmed failure/cancellation
returns the Order to PENDING after release; retry starts a fresh validated attempt.
The SDK exposes no payment credential/provider fields. Read the returned/current
Order version for each new command and preserve the original body/key for replay.

Browser and React Native compiler fixtures cover nested demo responses. The
focused client check covers actual path, key/header and body forwarding.
`pnpm test:d2:payment:live` is prepared for the grouped deployment; it uses the
existing owned Checkout fixture and retains Order history. Its local harness
checks do not certify running services. See the
[transport receipt](../reports/2026-10-24-d2-demo-payment-transports.md).
