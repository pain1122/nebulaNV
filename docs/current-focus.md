# Current Focus

Last updated: 2026-08-15

## Active Slice

F3 - External API Gateway, Batch 5 versioned route adapters.

The F2 exit and F3 entry gates are complete, every required gateway decision is
frozen, and Batches 1 through 4 have passed their focused checks. Batch 4 now
has the executable route-policy and input-profile contracts, stable external
envelopes/errors/pagination, bounded Redis idempotency, and contract-owned
OpenAPI infrastructure. Batch 3 retains the outbound trust, verified context,
internal contracts/clients, Auth resolver, causal propagation, and readiness
foundation. `TODO.md` remains the milestone board. This file is the single,
complete F3 checklist and work order; it is not evidence that an unchecked item
is implemented.

## Current Goal

Create one versioned public API boundary for storefront, admin, and mobile
clients, with the same boundary reserved for future partners. Reuse existing
auth, S2S, validation, error, logging, health, domain, Docker, and tooling
owners. Derive trusted application and request context, keep backend HTTP/gRPC
ports private in release, and preserve local diagnostic access.

## F2 Entry Gate

- [x] Observe the dependency, image, and secret/config gates passing in hosted
      CI under the approved F2 policy.
- [x] Prove the complete hosted live-and-scan workflow leaves tracked files
      unchanged.
- [x] Finish durable F2 documentation with the final verified commands and
      outcomes.
- [x] Recheck `TODO.md` and record that all F2 exit items are complete before
      the first F3 implementation patch.

Hosted evidence: [CI run 31391317016](https://github.com/pain1122/nebulaNV/actions/runs/31391317016)
passed `quality` and `live-e2e` on commit `1d090f8`, including dependency and
secret/config gates, Compose provisioning, live integration/e2e, scans of all
eight tested backend images, and the final tracked-diff check. The retained
image reports contain zero application findings, zero fixable Debian findings,
and 176 visible Debian findings without available fixes, which remain assigned
to F9 under the approved policy.

F3 investigation, decisions, and route design can proceed now. Gateway code,
proto changes, runtime wiring, and web integration wait for this entry gate
unless the milestone order in `TODO.md` is explicitly revised. The eight
hybrid backend services, seven Prisma services, shared packages, migrations,
seeds, sequential Bake flow, and live suites remain the foundation to preserve.
Local service ports remain available for diagnosis; privacy applies to the
release backend boundary. Existing unrelated dirty work, especially in
`apps/web`, must not be overwritten.

## F3 Coverage Map

| `TODO.md` F3 area               | Owning checklist section          |
| ------------------------------- | --------------------------------- |
| Gateway Boundary                | Decisions, Batches 1-3, 5-6 and 8 |
| API Standards                   | Route manifest, Batches 4-5 and 7 |
| Client Types                    | Decisions and Batch 2             |
| Current Integration Corrections | Batch 7                           |
| F3 Exit Gate                    | Batch 8                           |

The completed decisions, Batches 1 through 4, and the earlier API/proto
versioning rule are retained as checked items. Every other F3 work-order item
remains unchecked until verified.

## Current Mechanisms To Preserve

| Owner or mechanism             | Verified repository truth                                                                                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gateway/service S2S separation | `@nebula/grpc-auth` selects separate gateway and service key maps; byte-compatible v2 remains for context-free service calls and v3 additionally binds verified ingress context.        |
| Actor authority                | Auth-service owns token issuance, Redis session rotation/revocation, and live `ValidateToken` checks. A gateway must not become a second JWT authority.                                 |
| Shared HTTP and health policy  | `@packages/config` owns strict validation, Helmet, request logging/IDs, lifecycle handling, environment primitives, exact-origin service CORS, and sanitized health shapes.             |
| Domain authorization           | Services retain role, ownership, lifecycle, and business-rule enforcement. Gateway authorization is defense in depth.                                                                   |
| Internal clients and errors    | `@nebula/clients` owns typed request shaping and invocation. `@nebula/grpc-auth` owns shared gRPC-to-HTTP error translation.                                                            |
| Runtime/tooling                | One root inventory, shared Dockerfile/Bake graph, and sequential backend runner already own the eight-service runtime. Extend capability views rather than create another service list. |

## Classified Findings From The Source Audit

| Area                                           | Classification                        | Evidence-backed consequence for F3                                                                                                                                                                                                                                                                    |
| ---------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gateway application                            | confirmed defect                      | Batch 1 resolves the missing HTTP-only workspace/foundation; public routes, image, Compose service, OpenAPI artifact, and external client remain later-batch gaps.                                                                                                                                    |
| Gateway service-local env example              | confirmed defect                      | Batch 2 initially added only the root example even though every existing backend service has an app-local `.env.example`; the gateway example and ignored local override now match its startup schema.                                                                                                |
| HTTP-only configuration                        | confirmed defect                      | Resolved in Batch 1 by an additive shared HTTP-only schema/resolver; the existing hybrid resolver remains unchanged.                                                                                                                                                                                  |
| Gateway outbound trust                         | confirmed defect                      | Resolved by the first Batch 3 item with an exact-target outbound-only env/runtime validator; the hybrid receiver schema remains unchanged and no fake inbound/replay configuration was added.                                                                                                         |
| Shared Joi schema composition                  | confirmed defect                      | Adding the gateway trust schema exposed grpc-auth resolving Joi 18.0.2 while gateway/config used 18.0.1, which makes Joi reject the mixed schema at startup; grpc-auth is narrowly pinned to the existing 18.0.1 owner version.                                                                       |
| Signed context                                 | confirmed defect                      | Resolved at the shared receiver/signer boundary with strict v3 canonical context while retaining byte-compatible ordinary-service v2; raw context-looking metadata remains untrusted.                                                                                                                 |
| Transitive propagation                         | confirmed defect                      | Resolved in Batch 3: guarded service controllers project only verified ingress state, and Order/Product/ProductTaxonomy/BlogTaxonomy preserve context/request ID while each nested target gets a fresh service-kind signature.                                                                        |
| Internal clients                               | confirmed defect                      | Resolved for the F3 manifest: all selected Auth, User, Settings, Product/facade, Blog/facade, Taxonomy, Order, and Media methods now have fixed-definition signed wrappers; gateway owns eight validated targets.                                                                                     |
| Auth gateway path                              | confirmed defect                      | Resolved: Register/Logout, the exact mixed-kind `ValidateToken` policy, and a gateway-owned Auth resolver use gateway v3/pairwise signing without local JWT decoding or changing the ordinary-service guard.                                                                                          |
| Route parity                                   | confirmed defect                      | Resolved for the frozen F3 launch surface: User `ListUsers`, authoritative public/distinct admin Product reads, Media owned protected list/read, and two-step public delete now have additive gRPC contracts.                                                                                         |
| External standards                             | confirmed defect                      | Resolved for the Batch 4 standards layer: route policy, envelopes/errors, input and pagination profiles, complete gateway key semantics, Redis replay coordination, and contract-only OpenAPI setup are executable. Actual routes, the checked document, and external client remain later-batch work. |
| Registry authority                             | confirmed defect                      | Resolved for F3 by a replaceable, strictly validated deployment-configuration adapter; F4 still owns persistent tenant/site/channel/application authority and stable lifecycle management.                                                                                                            |
| Browser session/CORS                           | confirmed defect                      | Direct-service CORS uses `credentials: false` and a narrow header list; it cannot simply be reused for cookie routes, idempotency, or registry-driven origins.                                                                                                                                        |
| Browser token/cookie contract                  | confirmed defect                      | The app duplicates access-token transport and gives remember-me cookies 30 days while auth refresh truth is 7 days; choose one transport and align expiry/clear behavior.                                                                                                                             |
| Logout device selector                         | confirmed defect                      | The frozen input named `deviceId`, but auth-service has no device registry or device-scoped session behavior and the existing DTO ignored it; F3 rejects it and derives current-session logout from the bearer.                                                                                       |
| Current web integration                        | confirmed defect                      | Refresh omits POST, failed concurrent refresh can leave queued callers unresolved, no focused harness exists, and product forwarding/mapping is incomplete.                                                                                                                                           |
| Product public reads                           | confirmed defect                      | Resolved in Batch 3: public get/list/gallery now force ACTIVE/non-deleted visibility, while three distinct role-protected admin reads own lifecycle/deletion controls.                                                                                                                                |
| Release health                                 | confirmed defect                      | Release already uses `GATEWAY_ONLY`, while unsigned Docker `/health/ready` probes are only `@Public()` and can be rejected.                                                                                                                                                                           |
| Media transport                                | confirmed defect                      | Public render is an HTTP byte stream, but no signed gateway HTTP carrier or validated media HTTP target exists under the current release policy.                                                                                                                                                      |
| Release exposure                               | confirmed defect                      | Release publishes backend HTTP/gRPC, database, and MinIO ports. API ports must become internal while presigned storage data-plane access remains explicit.                                                                                                                                            |
| Release image archive                          | confirmed defect                      | The PowerShell image-save script uses an undefined `$repoRoot`; its passing regex test does not prove the script can archive a gateway image.                                                                                                                                                         |
| Refresh-rotation task                          | stale implementation or documentation | The web refresh route already stores the rotated token. F3 must characterize/preserve it and fix the POST caller, not add another rotation policy.                                                                                                                                                    |
| Release policy wording                         | stale implementation or documentation | `GATEWAY_ONLY` is already the release default and is an HTTP policy; it must be preserved and tested, not described as a new public-gRPC switch.                                                                                                                                                      |
| Deployment and blog documentation              | stale implementation or documentation | Resolved before the Batch 4 freeze: the deploy runbook now uses the supported sequential Bake wrapper and actual frozen offline production install, while the blog guide records rejection without an actor JWT and verified-admin success.                                                           |
| Batch ownership wording                        | stale implementation or documentation | Batch 2 previously implied live Auth and Next-BFF integration even though the frozen work order assigns those runtime changes to Batches 3 and 7; Batch 2 now owns their context/registry contracts only.                                                                                             |
| F3 milestone checkbox state                    | stale implementation or documentation | Completed Batch 1 gateway/rate-limit/readiness items and Batch 2 client-profile decisions remained unchecked in `TODO.md`; their milestone state is now aligned without checking composite trust/routes still owned by later batches.                                                                 |
| Distributed rate storage and full tracing      | future scaling consideration          | F3 needs a correlation ID and a single-gateway limit baseline. Multi-replica rate storage, trusted-proxy topology, and distributed spans belong to F9 unless scope changes.                                                                                                                           |
| Mobile/application attestation                 | optional hardening                    | Public client IDs do not prove binary authenticity; reserve an attestation extension point without blocking F3.                                                                                                                                                                                       |
| Partner marketplace and CDN/streaming redesign | future scaling consideration          | Reserve clean boundaries, but do not implement these later-phase capabilities in F3.                                                                                                                                                                                                                  |

## Existing Owners To Preserve

- `@nebula/grpc-auth`: S2S envelopes, gateway/service key separation, verified
  caller and actor context, metadata merging, replay defense, and gRPC/HTTP
  error translation.
- `@packages/config`: HTTP validation, CORS, security headers, request logging,
  request IDs, lifecycle logging, environment primitives, and health shapes.
- `@nebula/protos`: internal gRPC wire contracts. Generated files are never
  edited by hand.
- `@nebula/clients`: typed internal gRPC request shaping and invocation. Extend
  it instead of writing gateway-local signing wrappers; keep shared status
  translation in `@nebula/grpc-auth`.
- Auth-service: login, token issuance, refresh rotation/replay handling,
  logout/revocation, and access-token validation.
- Domain services: authorization, resource ownership, and business rules. A
  gateway check is not a replacement for service enforcement.
- A new external API-client package may own generated public clients; do not
  place browser/mobile contracts in the internal `@nebula/clients` package.
- The root inventory, shared Dockerfile/Bake graph, and sequential scripts own
  runtime selection. Add capability-aware views rather than a gateway list.

## Required Decisions Before Implementation

- [x] Freeze the gateway package name, service identity, public development
      port, and route prefix. Use `@nebula/gateway`, identity `gateway`,
      `GATEWAY_HTTP_PORT=3002`, `/api/v1`, and one HTTP-only Nest application.
      Port 3002 is the currently unallocated repository slot; the gateway is a
      gRPC client and does not expose a gRPC listener.
- [x] Freeze a route/policy manifest before proto or controller work. For each
      route record method/path, application profile, anonymous/user/admin
      policy, downstream service/RPC, allowed request/query fields, status and
      response shape, pagination profile, idempotency/retry policy, streaming
      exception, and any missing additive internal contract.
- [x] Freeze the signed-context wire contract and rollout. Use the bounded v3
      context contract below, receiver-first v2/v3 acceptance, mandatory v3
      context for gateway-kind calls, and continued context-free v2 support for
      ordinary service-to-service calls.
- [x] Freeze the internal transport rule. Use signed unary gRPC for every
      JSON/domain call and the fixed internal HTTP media-render exception below
      for the existing public byte stream. Apply the media-service release
      policy exception only after its host application port is private.
- [x] Freeze browser, native-mobile, and Next-BFF session transport separately.
      Use the browser/BFF refresh-cookie bridge and native JSON rotation
      contract below. Auth-service remains token/session owner; refresh and
      logout are POST-only and browser cookie use is protected by exact
      origin/fetch-metadata checks.
- [x] Freeze browser access-token transport after characterizing the current
      duplicate behavior. Keep the existing short-lived JSON bearer used from
      browser memory/session storage and remove the proven-unused HttpOnly
      access-token cookie; do not add cookie authentication to domain routes.
- [x] Freeze cookie attributes and expiry from auth truth. Keep one host-only
      `refreshToken` cookie with the exact attributes below and lifetime from
      auth-service expiry metadata (currently seven days). Remove the false
      30-day remember-me behavior until auth-service supports variable TTLs.
- [x] Freeze public-client authentication limits. Use the registry-resolution
      rules and `x-nebula-client-id` carrier below. Web origins and mobile IDs
      identify fixed public records but are copyable; actor authorization stays
      independent and no F3 proof claims cryptographic app authenticity.
- [x] Freeze the F3/F4 bridge. Use one `ApplicationRegistry` interface and the
      strictly validated static single-site adapter below for development,
      test, and release. Missing/ambiguous production records fail startup; F4
      replaces only the adapter with persistent registry/membership authority.
- [x] Freeze the release data-plane boundary. Publish the gateway API and, only
      when the bundled MinIO deployment issues client-facing presigned URLs,
      its object-data endpoint. Keep backend HTTP/gRPC, Postgres, Redis, and
      the MinIO console private; an external S3/CDN data endpoint replaces the
      published MinIO data port rather than adding another backend API.
- [x] Freeze gateway readiness dependencies. Use the exact critical matrix
      below: validated startup configuration, application registry, Auth gRPC
      transport, and gateway Redis. Do not gate readiness on the seven domain
      services or make synthetic business RPCs.
- [x] Freeze OpenAPI/client ownership, artifact paths, and generator. Generate
      the checked document with `@nestjs/swagger`, generate runtime-free types
      with `openapi-typescript`, and expose them through the browser/React-
      Native-compatible `@nebula/api-client` fetch package described below.

## Route Capability Baseline

This is the source-backed starting point for the required manifest. It prevents
the external API from silently promising a route that the signed internal path
cannot perform.

| Domain   | Existing capability to preserve                                                                                                                                                          | F3 prerequisite or boundary                                                                                                                                                      |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth     | HTTP register/login/refresh/logout/profile and gRPC register/login/refresh/logout/profile/token validation now exist; `ValidateToken` has an exact gateway-plus-approved-service policy. | Use the gateway-owned gateway-kind bearer resolver for validation. Never route registration through auth-only User CreateUser.                                                   |
| User     | Self/admin get, self update, and the unpaginated admin list have gRPC paths.                                                                                                             | Keep auth bootstrap/hash RPCs service-only and expose only the manifest-selected gateway routes.                                                                                 |
| Settings | Public read and admin set/delete have typed gRPC paths.                                                                                                                                  | Enforce the exact string-key allowlists in the manifest; do not expose trust/secret/bootstrap settings.                                                                          |
| Product  | Authoritative public list/get/gallery and distinct admin list/get/gallery now exist beside the prior admin mutations.                                                                    | Keep gateway adapters on the matching public/admin contracts and never forward lifecycle/deletion controls to public methods.                                                    |
| Blog     | Public published list/get-by-slug and admin create/update/delete exist.                                                                                                                  | Do not invent admin draft/archive list or get-by-ID behavior without an additive contract.                                                                                       |
| Taxonomy | Generic taxonomy and product/blog-scoped facade services exist.                                                                                                                          | Use product/blog facade services for their external routes; keep system ensure/bootstrap methods internal.                                                                       |
| Order    | User cart/checkout/list/get and admin status update have gRPC parity and derive actor from verified context.                                                                             | Do not promise admin list/read; classify route-specific retry/idempotency behavior.                                                                                              |
| Media    | Admin public/protected/strict lanes, user-owned protected browse/read, two-step public delete, presign/finalize, and public render now have the selected HTTP/gRPC paths.                | Keep owned list/read actor-derived, keep two-step delete policy in media-service, keep render as the HTTP stream exception, and keep presigned storage as a separate data plane. |

## Frozen F3 Route And Policy Manifest

This is the F3 launch surface. Batch 3 internal contracts, Batch 4 DTOs and
standards, Batch 5 controllers, OpenAPI, and the generated client must all be
derived from it. A route not listed here is not externally supported in F3.

Application profiles are `storefront-web`, `admin-web`, and `mobile`.
`storefront-web` and `mobile` may be anonymous or carry a verified user;
`admin-web` still requires a verified `admin` or `root-admin` actor on every
admin route. The current Next BFF represents the configured profile rather than
becoming a fourth application. Partner traffic is disabled in F3.

Response profiles below are `item` (`{ data }`), `collection`
(`{ data, meta }`), and `action` (`{ data }` with an action-specific result).
They name the semantic shape; Batch 4 freezes the common outer envelope and
error object. `stream` and operational health are explicit non-envelope
exceptions.

Retry profiles are:

- `safe`: a bounded retry is allowed for GET/HEAD before response delivery.
- `key`: `Idempotency-Key` is mandatory, bound to application, actor, route,
  and request hash. Gateway replay suppression is bounded and does not claim
  durable exactly-once behavior after a gateway crash.
- `session`: no generic response replay cache. Login is not retried
  automatically; refresh is single-flight and follows auth-service rotation;
  browser/native token transport is frozen separately below.
- `stream`: a render request may be retried only before response headers or
  bytes have been delivered.

### Auth, User, And Settings Routes

| External route                           | Applications and actor                      | Downstream contract                  | Input profile    | Success          | Retry     | Required boundary or prerequisite                                                                               |
| ---------------------------------------- | ------------------------------------------- | ------------------------------------ | ---------------- | ---------------- | --------- | --------------------------------------------------------------------------------------------------------------- |
| `POST /api/v1/auth/register`             | all three; anonymous                        | Auth `Register`                      | `auth-register`  | `201 item`       | `key`     | Add signed RPC; auth remains registration owner and User `CreateUser` remains auth-only.                        |
| `POST /api/v1/auth/login`                | all three; anonymous                        | Auth `ValidateUser` then `GetTokens` | `auth-login`     | `200 action`     | `session` | Never return browser refresh material through a JavaScript-readable path after the session decision is applied. |
| `POST /api/v1/auth/refresh`              | all three; existing session                 | Auth `RefreshTokens`                 | `auth-refresh`   | `200 action`     | `session` | Browser refresh comes from the selected cookie; native refresh comes from the native request body.              |
| `POST /api/v1/auth/logout`               | all three; `user`, `admin`, or `root-admin` | Auth `Logout`                        | `auth-logout`    | `200 action`     | `key`     | Add signed RPC; clear browser cookies with the exact attributes used to set them.                               |
| `GET /api/v1/auth/me`                    | all three; `user`, `admin`, or `root-admin` | Auth `GetProfile`                    | none             | `200 item`       | `safe`    | Actor ID is derived from verified auth, never from query/body.                                                  |
| `GET /api/v1/users/me`                   | all three; `user`, `admin`, or `root-admin` | User `GetUser`                       | none             | `200 item`       | `safe`    | Gateway supplies the verified actor ID.                                                                         |
| `PUT /api/v1/users/me`                   | all three; `user`, `admin`, or `root-admin` | User `UpdateProfile`                 | `profile-update` | `200 item`       | `key`     | Gateway supplies the verified actor ID; password changes require `currentPassword`.                             |
| `GET /api/v1/admin/users`                | `admin-web`; `admin` or `root-admin`        | User `ListUsers`                     | none             | `200 collection` | `safe`    | RPC added in Batch 3. The current list is explicitly unpaginated; do not invent page metadata.                  |
| `GET /api/v1/admin/users/:id`            | `admin-web`; `admin` or `root-admin`        | User `GetUser`                       | UUID path        | `200 item`       | `safe`    | Downstream role enforcement remains active.                                                                     |
| `GET /api/v1/settings/:ns/:key`          | all three; anonymous                        | Settings `GetString`                 | `setting-key`    | `200 item`       | `safe`    | Deployment environment is derived server-side; only the public allowlist below is accepted.                     |
| `PUT /api/v1/admin/settings/:ns/:key`    | `admin-web`; `admin` or `root-admin`        | Settings `SetString`                 | `setting-write`  | `200 item`       | `key`     | Only the admin allowlist below is accepted; trust, secret, registry, and bootstrap-only keys are forbidden.     |
| `DELETE /api/v1/admin/settings/:ns/:key` | `admin-web`; `admin` or `root-admin`        | Settings `DeleteString`              | `setting-key`    | `200 action`     | `key`     | Same allowlist and derived environment as the write route.                                                      |

The public string-setting allowlist is exactly `pricing/default_currency`.
The admin string-setting allowlist is `pricing/default_currency`,
`order/cart_ttl_minutes`, `product/default_product_category`, and
`blog/default_blog_category`. JSON/number settings are not claimed by the
current string-only RPC. Registry, signing, auth, storage credentials, and
other secret-bearing namespaces are never external settings.

### Product, Blog, And Taxonomy Routes

| External route                                       | Applications and actor               | Downstream contract           | Input profile           | Success          | Retry | Required boundary or prerequisite                                                               |
| ---------------------------------------------------- | ------------------------------------ | ----------------------------- | ----------------------- | ---------------- | ----- | ----------------------------------------------------------------------------------------------- |
| `GET /api/v1/products`                               | all three; anonymous                 | Product public `ListProducts` | `product-public-list`   | `200 collection` | safe  | Force `ACTIVE` and non-deleted in product-service; response metadata contains `total` only.     |
| `GET /api/v1/products/:id`                           | all three; anonymous                 | Product public `GetProduct`   | UUID path               | `200 item`       | safe  | Return 404 for non-ACTIVE or deleted products in the authoritative public contract.             |
| `GET /api/v1/products/:id/gallery`                   | all three; anonymous                 | Product public `ListGallery`  | UUID path               | `200 collection` | safe  | First enforce public product visibility and never return deleted gallery rows.                  |
| `GET /api/v1/admin/products`                         | `admin-web`; `admin` or `root-admin` | Product `AdminListProducts`   | `product-admin-list`    | `200 collection` | safe  | Distinct role-protected admin read; do not pass admin filters through the public RPC.           |
| `GET /api/v1/admin/products/:id`                     | `admin-web`; `admin` or `root-admin` | Product `AdminGetProduct`     | UUID path               | `200 item`       | safe  | Distinct role-protected admin read.                                                             |
| `POST /api/v1/admin/products`                        | `admin-web`; `admin` or `root-admin` | Product `CreateProduct`       | `product-write`         | `201 item`       | key   | Preserve `{ data }` semantics at the adapter; external DTO maps UI `content` to `description`.  |
| `PATCH /api/v1/admin/products/:id`                   | `admin-web`; `admin` or `root-admin` | Product `UpdateProduct`       | `product-patch`         | `200 item`       | key   | Preserve `{ patch }` semantics and the same `content` to `description` mapping.                 |
| `DELETE /api/v1/admin/products/:id`                  | `admin-web`; `admin` or `root-admin` | Product `DeleteProduct`       | UUID path               | `200 item`       | key   | Soft delete only.                                                                               |
| `POST /api/v1/admin/products/:id/restore`            | `admin-web`; `admin` or `root-admin` | Product `RestoreProduct`      | UUID path               | `200 item`       | key   | Explicit action; never overload public update.                                                  |
| `DELETE /api/v1/admin/products/:id/hard`             | `admin-web`; `admin` or `root-admin` | Product `HardDeleteProduct`   | UUID path               | `200 item`       | key   | High-impact action remains separately named and tested.                                         |
| `POST /api/v1/admin/products/discounts/bulk`         | `admin-web`; `admin` or `root-admin` | Product `ApplyDiscountBulk`   | `product-bulk-discount` | `200 action`     | key   | Exact filters/discount fields only.                                                             |
| `GET /api/v1/admin/products/:id/gallery`             | `admin-web`; `admin` or `root-admin` | Product `AdminListGallery`    | `gallery-admin-list`    | `200 collection` | safe  | Distinct admin read; deprecated public `includeDeleted` is ignored and cannot widen visibility. |
| `POST /api/v1/admin/products/:id/gallery`            | `admin-web`; `admin` or `root-admin` | Product `AddImages`           | `gallery-add`           | `201 collection` | key   | Maximum 50 images, with URL/alt/sort only.                                                      |
| `PUT /api/v1/admin/products/:id/gallery/order`       | `admin-web`; `admin` or `root-admin` | Product `ReorderImages`       | `gallery-order`         | `200 collection` | key   | Maximum 200 ID/sort entries.                                                                    |
| `DELETE /api/v1/admin/products/:id/gallery/:imageId` | `admin-web`; `admin` or `root-admin` | Product `RemoveImage`         | `gallery-remove`        | `200 collection` | key   | `hardDelete` is the sole accepted query flag.                                                   |
| `GET /api/v1/blog/posts`                             | all three; anonymous                 | Blog `ListPosts`              | `blog-list`             | `200 collection` | safe  | Downstream continues forcing `PUBLISHED`; metadata is page/limit/total.                         |
| `GET /api/v1/blog/posts/:slug`                       | all three; anonymous                 | Blog `GetPost`                | slug path               | `200 item`       | safe  | Published lookup by slug only.                                                                  |
| `POST /api/v1/admin/blog/posts`                      | `admin-web`; `admin` or `root-admin` | Blog `CreatePost`             | `blog-write`            | `201 item`       | key   | No admin list/get route is implied.                                                             |
| `PATCH /api/v1/admin/blog/posts/:id`                 | `admin-web`; `admin` or `root-admin` | Blog `UpdatePost`             | `blog-patch`            | `200 item`       | key   | UUID path; patch fields only.                                                                   |
| `DELETE /api/v1/admin/blog/posts/:id`                | `admin-web`; `admin` or `root-admin` | Blog `DeletePost`             | UUID path               | `200 action`     | key   | Existing soft-delete behavior only.                                                             |

Both `/api/v1/product-taxonomies` and
`/api/v1/blog-taxonomies` expose the same route shapes below through their
respective ProductTaxonomyService and BlogTaxonomyService facades. The gateway
never accepts `scope`; the facade hard-locks it to `product` or `blog`.

| External route family                                | Applications and actor           | Downstream method | Input profile    | Success          | Retry | Boundary                                                           |
| ---------------------------------------------------- | -------------------------------- | ----------------- | ---------------- | ---------------- | ----- | ------------------------------------------------------------------ |
| `GET /api/v1/{product,blog}-taxonomies`              | all three; anonymous             | `List`            | `taxonomy-list`  | `200 collection` | safe  | page/limit/total; `kind` is required.                              |
| `GET /api/v1/{product,blog}-taxonomies/:id`          | all three; anonymous             | `Get`             | UUID path        | `200 item`       | safe  | Get by ID only; no unimplemented slug route is promised.           |
| `POST /api/v1/admin/{product,blog}-taxonomies`       | `admin-web`; admin or root-admin | `Create`          | `taxonomy-write` | `201 item`       | key   | `scope` and `isSystem` are forbidden.                              |
| `PATCH /api/v1/admin/{product,blog}-taxonomies/:id`  | `admin-web`; admin or root-admin | `Update`          | `taxonomy-patch` | `200 item`       | key   | UUID path; partial fields only.                                    |
| `DELETE /api/v1/admin/{product,blog}-taxonomies/:id` | `admin-web`; admin or root-admin | `Delete`          | UUID path        | `200 action`     | key   | System/bootstrap ensure operations are never reachable externally. |

### Cart And Order Routes

| External route                          | Applications and actor               | Downstream contract       | Input profile  | Success          | Retry | Boundary                                                                                          |
| --------------------------------------- | ------------------------------------ | ------------------------- | -------------- | ---------------- | ----- | ------------------------------------------------------------------------------------------------- |
| `GET /api/v1/orders/cart`               | `storefront-web`, `mobile`; `user`   | Order `GetCart`           | none           | `200 item`       | safe  | User ID comes only from verified context.                                                         |
| `POST /api/v1/orders/cart/items`        | `storefront-web`, `mobile`; `user`   | Order `AddToCart`         | `cart-add`     | `200 item`       | key   | Replays otherwise increment quantity again; no automatic retry without a matching key.            |
| `PATCH /api/v1/orders/cart/items/:id`   | `storefront-web`, `mobile`; `user`   | Order `UpdateCartItem`    | `cart-update`  | `200 item`       | key   | Item ID is UUID; quantity zero keeps existing downstream removal semantics.                       |
| `DELETE /api/v1/orders/cart/items/:id`  | `storefront-web`, `mobile`; `user`   | Order `RemoveCartItem`    | UUID path      | `200 item`       | key   | User ID remains derived.                                                                          |
| `POST /api/v1/orders/checkout`          | `storefront-web`, `mobile`; `user`   | Order `Checkout`          | `checkout`     | `201 item`       | key   | Gateway suppression is not durable exactly-once after a lost post-commit response; document this. |
| `GET /api/v1/orders`                    | `storefront-web`, `mobile`; `user`   | Order `ListOrders`        | `order-list`   | `200 collection` | safe  | Current result is unpaginated; optional status only.                                              |
| `GET /api/v1/orders/:id`                | `storefront-web`, `mobile`; `user`   | Order `GetOrder`          | UUID path      | `200 item`       | safe  | Downstream verifies ownership.                                                                    |
| `PATCH /api/v1/admin/orders/:id/status` | `admin-web`; `admin` or `root-admin` | Order `UpdateOrderStatus` | `order-status` | `200 item`       | key   | No admin order list/read route exists in F3.                                                      |

### Media Routes

Media JSON routes are control-plane operations. Returned presigned upload/read
URLs are data-plane destinations and are not rewritten to the gateway. The
explicit lane name fixes access class and visibility; clients cannot override
those values in a body. `public-library` still means an admin-managed public
asset library, not anonymous file-manager access.

| External route                                                            | Applications and actor           | Downstream contract or transport          | Input profile          | Success          | Retry  | Boundary or prerequisite                                                                                             |
| ------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------- | ---------------------- | ---------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/admin/media/:id`                                             | `admin-web`; admin or root-admin | Media `GetById`                           | UUID path              | `200 item`       | safe   | Generic administrative record read only.                                                                             |
| `GET /api/v1/admin/media/{public,protected,strict}-library`               | `admin-web`; admin or root-admin | Media lane `List*Library`                 | lane list profile      | `200 collection` | safe   | `media-public-list` forbids owner selection; protected/strict use `media-admin-list` and may accept an owner filter. |
| `GET /api/v1/media/my/protected-library`                                  | `storefront-web`, `mobile`; user | Media `ListMyProtectedLibrary`            | `media-owned-list`     | `200 collection` | safe   | Owner/access/visibility are derived and fixed.                                                                       |
| `POST /api/v1/admin/media/{public,protected,strict}-library/presign`      | `admin-web`; admin or root-admin | Media lane `Presign*Upload`               | `media-presign`        | `200 action`     | key    | Upstream target and object path policy are server-owned.                                                             |
| `POST /api/v1/admin/media/{public,protected,strict}-library/finalize`     | `admin-web`; admin or root-admin | Media lane `Finalize*Upload`              | `media-finalize`       | `201 item`       | key    | Finalize validates the pending object; client metadata remains a hint.                                               |
| `POST /api/v1/admin/media/{public,protected,strict}-library/:id/read-url` | `admin-web`; admin or root-admin | Media lane `Create*ReadUrl`               | `media-read-url`       | `200 action`     | key    | Only `download` is accepted from query; TTL and storage target remain server-owned.                                  |
| `POST /api/v1/media/my/protected-library/:id/read-url`                    | `storefront-web`, `mobile`; user | Media `CreateMyProtectedReadUrl`          | `media-owned-read-url` | `200 action`     | key    | Owner is the verified actor and scope/entity context must match the record.                                          |
| `DELETE /api/v1/admin/media/{protected,strict}-library/:id`               | `admin-web`; admin or root-admin | Media lane `Delete*LibraryById`           | UUID path              | `200 action`     | key    | Public-library deletion uses the two-step routes below instead.                                                      |
| `POST /api/v1/admin/media/public-library/delete-preview`                  | `admin-web`; admin or root-admin | Media `PreviewPublicLibraryDelete`        | `media-delete-preview` | `200 action`     | key    | Returns bounded preview plus a short-lived confirmation token.                                                       |
| `POST /api/v1/admin/media/public-library/delete-confirm`                  | `admin-web`; admin or root-admin | Media `ConfirmPublicLibraryDelete`        | `media-delete-confirm` | `200 action`     | key    | Confirmation token and request hash must match.                                                                      |
| `GET /api/v1/media/render/:id`                                            | all three; anonymous             | fixed internal media HTTP render endpoint | `media-render`         | `200 stream`     | stream | Sole byte-stream exception; preserve content headers, ETag/cache behavior, and denial status without JSON.           |

### Exact Input And Query Profiles

- `auth-register`: `email`, `password`. `auth-login`: `identifier`, `password`.
  `auth-refresh`: no browser JSON field; native may send only `refreshToken`.
  `auth-logout`: optional `allDevices`; browser refresh material comes from the
  cookie and native may send `refreshToken`. Current-session identity comes
  from the validated access bearer. `deviceId` is not accepted because the
  current session store has no device registry or device-scoped revocation.
- `profile-update`: `email`, `newPassword`, `currentPassword`.
- `setting-key`: safe `ns` and `key` path segments; no client-selected
  environment. `setting-write`: the same path plus body `value` up to 4000
  characters.
- `product-public-list`: `q`, `categoryId`, `page`, `limit`; status and deleted
  flags are forbidden. `product-admin-list` adds `status` and `includeDeleted`.
- `product-write`: `title`, `slug`, `sku`, `price`, `currency`, `status`,
  external `content` (mapped by the gateway adapter to internal `description`),
  `excerpt`, `categoryId`, `thumbnailUrl`, `model3dUrl`,
  `model3dFormat`, `model3dLiveView`, `model3dPosterUrl`, `vrEnabled`,
  `vrPlanImageUrl`, `metaTitle`, `metaDescription`, `metaKeywords`,
  `customSchema`, `noindex`, `isFeatured`, `featureSort`, `promoTitle`,
  `promoBadge`, `promoActive`, `discountType`, `discountValue`,
  `discountActive`, `discountStart`, `discountEnd`, `tags`, and
  `complementaryIds`. `product-patch` permits the same fields as optional.
- `product-bulk-discount`: `ids`, `categoryId`, `status`, `q`, `discountType`,
  `discountValue`, `discountActive`, `discountStart`, and `discountEnd`.
  `gallery-admin-list`: `includeDeleted`; `gallery-add`: `images[]` containing
  only `url`, `alt`, `sort`; `gallery-order`: `orders[]` containing only `id`,
  `sort`; `gallery-remove`: optional boolean `hardDelete`.
- `blog-list`: `q`, `tag`, `category`, `page`, `limit`. `blog-write`: `title`,
  `slug`, `body`, `excerpt`, `coverImageUrl`, `status`, `tags`, `categories`,
  `metaTitle`, `metaDescription`, `metaKeywords`. `blog-patch` permits the same
  fields except slug, all optional.
- `taxonomy-list`: required `kind`, plus `q`, `page`, `limit`, `parentId`.
  `taxonomy-write`: `kind`, `slug`, `title`, `description`, `parentId`,
  `isHidden`, `sortOrder`. `taxonomy-patch` omits `kind` and makes the remaining
  fields optional.
- `cart-add`: `productId`, `quantity`; `cart-update`: `quantity`; `checkout`:
  optional `note`; `order-list`: optional `status`; `order-status`: `status` in
  `PENDING`, `PAID`, `FULFILLED`, `CANCELLED`.
- `media-public-list`: `q`, `search`, `path`, `take`, `skip`, `scope`,
  `entityType`, `entityId`, `folderPath`, `mimeType`, `mediaType`, `sortBy`,
  `order`, `status`, `scanStatus`. `media-admin-list` additionally permits
  `ownerId` for protected/strict administrative lanes; every lane fixes
  `accessClass` and `visibility`.
  `media-owned-list` is the same without `ownerId`, and fixes owner to actor,
  access to `PROTECTED`, and visibility to `private`.
- `media-presign`: `filename`, `mimeType`, `folderPath`, `displayName`, optional
  admin target `ownerId`, `scope`, `entityType`, `entityId`. `media-finalize`:
  `storage`, `path`, `folderPath`, `displayName`, `originalFilename`, `bucket`,
  `filename`, `mimeType`, optional admin target `ownerId`, `scope`,
  `entityType`, `entityId`, `sha256`. Lane routes reject client-supplied
  `accessClass` and `visibility`.
- `media-read-url`: optional boolean `download`. `media-owned-read-url`:
  required `scope`, `entityType`, `entityId`, optional boolean `download`.
  `media-delete-preview`: non-empty `items[]` of `{ type: file, id }` or
  `{ type: folder, folderPath }`, optional `recursive` and `scope`.
  `media-delete-confirm` adds only `confirmToken`. `media-render` permits only
  optional `variant=web`.

### Explicitly Non-External In F3

- Health routes remain unversioned operational contracts, not `/api/v1` JSON
  domain routes.
- Auth token validation, User create/hash lookups, Settings bootstrap ensure,
  raw Taxonomy write/ensure, and service Ping methods remain internal.
- The gateway never calls User `CreateUser` for registration and never exposes
  generic taxonomy scope selection.
- Admin blog draft/archive list/get, admin order list/read, and taxonomy
  get-by-slug are absent because no selected downstream contract supports them.
- Legacy generic media create/list/delete/presign/finalize aliases and direct
  public-library delete are not external. F3 uses explicit lane contracts and
  the two-step public delete flow.
- Confidential partner routes, credentials, application attestation, and F4
  tenant membership/domain scoping remain disabled rather than simulated.

## Frozen Signed Context Wire Contract

S2S v2 remains byte-for-byte compatible. F3 adds S2S envelope version `3`; it
does not reinterpret version `2` and does not introduce another key system.
Both versions continue using the existing pairwise keys, body/RPC binding,
timestamp window, nonce replay claim, request ID, and HMAC-SHA256 signature.

V3 adds exactly two reserved ASCII metadata fields:

- `x-s2s-context`: unpadded base64url of canonical UTF-8 JSON.
- `x-s2s-context-sha256`: lowercase 64-character SHA-256 of those canonical
  JSON bytes.

The v3 signature payload appends `contextSha256` after the existing v2
`bodySha256` element. The receiver decodes the context, validates its exact
schema and limits, reconstructs the canonical JSON, rejects a non-canonical
encoding, verifies the digest, and only then verifies the S2S signature. Both
new names join `S2S_RESERVED_HEADERS`; `mergeSignedMetadata` discards any
caller-supplied value for them.

The canonical context object has only these fields, serialized in this order:

```json
{
  "version": "1",
  "applicationId": "storefront-web-local",
  "tenantId": "single-site-tenant",
  "siteId": "single-site",
  "channelId": "web",
  "actor": {
    "userId": "verified-user-id",
    "role": "user",
    "sessionRef": "non-secret-session-reference"
  }
}
```

`actor` is omitted for anonymous calls. Unknown keys, null placeholders,
arrays, nested extension maps, duplicate metadata values, and missing required
top-level identifiers are rejected. Every identifier is 1-128 UTF-8 bytes and
matches `^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$`. Actor role is exactly `user`,
`admin`, or `root-admin`; `userId` and `sessionRef` use the same safe identifier
constraint. Email and raw session/token material are never included. Canonical
JSON is limited to 1024 bytes before base64url encoding.

The signed actor is a consistency assertion, not identity authority. The
gateway forwards the bearer on authenticated calls. For gateway/v3 traffic,
each receiver asks auth-service to validate it, attaches that result as
`ContextCarrier.user`, and requires exact `userId`, `role`, and `sessionRef`
agreement with the signed actor. A missing bearer with an actor assertion, a
bearer with no actor assertion, or any mismatch fails closed. Anonymous public
calls have neither. Legacy service-v2 bearer calls retain auth-service
validation during receiver-first migration but cannot claim signed
application/site context.

Verified application/site context is attached separately as
`ContextCarrier.requestContext`; it is never reconstructed from raw request
headers. Only the registry result and verified auth result can enter the
canonical context builder. External `x-s2s-*`, `x-svc*`, context, actor, role,
tenant/site/channel, and `x-request-id` headers are ignored as authority and
cannot override the generated ingress values. The separately selected public
client-ID carrier is only a registry lookup input, never signed verbatim.

Rollout order is receiver-first:

1. Shared receivers learn strict v2/v3 parsing while preserving the exact v2
   canonical payload and current ordinary-service tests.
2. `kind=gateway` calls require v3 and all four top-level context identifiers.
   There is no deployed legacy gateway that needs a v2 compatibility window.
3. `kind=service` calls without ingress context continue using v2. A service
   propagating verified ingress context uses v3, preserves the canonical
   context and request ID, forwards the bearer when present, and re-signs for
   its own target with a fresh nonce/timestamp.
4. Receivers reject partial v3 metadata, context fields on v2, unsupported
   versions, altered context/digest, duplicate carriers, and a v3 service hop
   that cannot supply its verified upstream context.

This is a confirmed compatibility extension: the current v2 signature does not
cover application/tenant/site/channel context, while arbitrary application
metadata currently survives `mergeSignedMetadata`. Adding these two reserved,
signed carriers is narrower than replacing pairwise S2S keys or adding a second
gateway token format.

## Frozen Internal Transport Rule

All F3 JSON and domain adapters use signed unary gRPC through
`@nebula/clients`. That includes auth registration/logout after their additive
RPCs, user/settings/product/blog/taxonomy/order operations, and every media
control-plane operation such as list, presign, finalize, read-URL creation, and
delete confirmation. The gateway exposes no gRPC listener.

`GET /api/v1/media/render/:id` is the sole exception. It streams from the
existing media-service HTTP `GET /media/render/:id` route through one validated
`MEDIA_RENDER_HTTP_URL` base. The value must be an `http://host:port` origin
with no credentials, path, query, or fragment. The gateway appends only the
validated UUID and optional `variant=web`, does not follow redirects, and never
accepts an upstream URL/path from the client.

The proxy streams without buffering and preserves downstream status,
`content-type`, `content-length`, `content-disposition`, `cache-control`, ETag,
and `x-content-type-options`. It keeps the gateway's own request ID header;
transport or mid-stream failures are logged with that ID and are not converted
to a JSON success envelope after bytes begin.

Release keeps `PUBLIC_MODE=GATEWAY_ONLY` for the other seven services. After
Batch 6 removes media-service's host `ports:` mapping, media-service alone uses
`PUBLIC_MODE=OPEN` so its already-public render path and operational health
remain reachable on the private Compose network. Its role-protected media
routes stay protected because they are not `@Public()`. Local development keeps
the media host port for diagnostics and the same public-render behavior.

This is a confirmed transport exception, not a general HTTP trust path. The
current S2S implementation signs unary request bodies and deliberately rejects
request-streaming/bidirectional RPCs; media render already returns an Express
byte stream and is public content. Building signed HTTP or a new gRPC streaming
contract would add key canonicalization, streaming authentication, cancellation,
and compatibility work without protecting non-public bytes, so it is not
required for F3.

## Frozen Browser, BFF, And Native Session Transport

Browser deployment is same-origin. The browser calls the current thin Next BFF
under `/api/auth/*`; that server identifies its configured registered
`storefront-web` or `admin-web` application and forwards to the gateway's
`/api/v1/auth/*` routes. It forwards the browser cookie without parsing the
refresh token and relays the gateway's `Set-Cookie` result back to the browser.
The BFF is an application adapter, not a confidential partner and not an S2S
caller.

For browser login, the refresh token is delivered only through an HttpOnly,
host-only cookie. Browser refresh is `POST /api/auth/refresh` with no refresh
token in JSON; browser logout is `POST /api/auth/logout` and may include only
non-secret logout options. Both routes require an exact registered Origin plus
same-origin Fetch Metadata (`Sec-Fetch-Site: same-origin` or `none`) before the
cookie is consumed. Missing/mismatched origin context and cross-site requests
fail closed. SameSite is defense in depth, not the CSRF decision.

The BFF forwards its configured public client ID and the validated original
browser origin/host. It does not trust arbitrary forwarded-host/origin headers,
does not mint application context, and does not receive any gateway or service
S2S key. Gateway CORS is not loosened for credentialed cross-origin browser use
in F3. A future cross-origin cookie deployment requires a separate approval for
exact credentialed CORS and `SameSite=None; Secure`.

Native mobile uses no browser cookie. Login returns `accessToken`,
`refreshToken`, and authoritative expiry metadata in JSON. The application
stores refresh material in the platform secure credential store, sends only
`refreshToken` in the POST refresh body, and atomically replaces both tokens
after rotation. Logout sends the access bearer plus the current refresh token
or `allDevices`; it deletes local credentials whether the remote session was
already gone or successfully revoked. The `mobile` public client ID identifies
a registry record but is not a secret or proof of binary authenticity.

Auth-service continues to create, rotate, replay-detect, and revoke Redis
session families. The gateway/BFF never implements a second rotation store.
The current web refresh route already writes the rotated refresh cookie and
that behavior is preserved; its missing POST method and failed-refresh queue
cleanup remain the narrow Batch 7 defects.

Browser access authentication uses the existing short-lived bearer response,
not an access cookie. Login/refresh return `accessToken` in JSON; the current
web client may keep it in memory plus `sessionStorage` for the F3 compatibility
slice and sends it explicitly as `Authorization: Bearer`. Gateway and BFF
domain routes authenticate only that header. The current `accessToken` cookie
is never read by the BFF or API helpers, so Batch 7 removes that duplicate
write/clear path rather than maintaining two auth mechanisms.

Because ordinary domain mutations are bearer-authenticated, refresh and logout
are the only F3 browser routes that consume an auth cookie and therefore the
only mandatory cookie-CSRF scope. XSS protection still matters: the access
token remains short-lived, response/log redaction is required, and broader
frontend hardening belongs to F7/F9 rather than a new F3 token store.

The browser refresh cookie contract is exact:

- name `refreshToken`;
- `HttpOnly=true`;
- `Secure=true` in production and false only for local HTTP development;
- `SameSite=Lax`;
- `Path=/api/auth` for the frozen same-origin BFF routes;
- no `Domain` attribute, so it remains host-only;
- `Max-Age` from auth-service's returned `refreshExpiresInSeconds`, with the
  current `JWT_REFRESH_EXPIRATION=7d` as the authority.

Auth token responses gain additive `accessExpiresInSeconds` and
`refreshExpiresInSeconds` fields so neither gateway nor BFF parses JWTs or
duplicates expiry-string logic. Login, successful rotation, logout, and failed
refresh/replay clearing use one shared cookie helper. Deletion repeats the same
Path, SameSite, Secure, and Domain omission and sets zero lifetime.

The current login route's 30-day remember-cookie choice cannot outlive the
seven-day token and is reset to seven days on refresh. F3 removes/ignores that
UI promise and uses the authoritative token lifetime. Variable remember-me
sessions require an explicit later auth-service policy, token TTL, Redis TTL,
response metadata, and UI change together; a longer cookie alone is invalid.

## Frozen Public Client Identification Limits

`x-nebula-client-id` is the sole explicit public-client carrier. It is one
ASCII value matching `^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$` and is included in
the gateway CORS allow-header list. It is never accepted as tenant/site/channel
context; it is only a lookup key for an immutable registry record.

For `storefront-web` and `admin-web`, the gateway requires the client ID and an
exact normalized Origin (`scheme://host:explicit-port`) to resolve the same
enabled registry record. There are no wildcard, suffix, substring, forwarded
host, or first-match fallbacks. The same-origin Next BFF sends its configured
client ID and configured/validated original Origin because server-side `fetch`
does not supply the browser Origin automatically. A supplied ID/origin pair
that names different records is denied.

For `mobile`, Origin is not required. The app sends its registered public ID;
the registry fixes its application, tenant, site, channel, allowed route
profile, and rate-limit profile. A web-origin record cannot be used as a mobile
record and vice versa. Disabled, unknown, duplicated, or ambiguous records
fail closed.

These values provide classification, not a secret. An ordinary non-browser
caller can copy a mobile ID or imitate an Origin. F3 proves only that callers
cannot directly set/override the signed context and that every accepted public
identifier resolves to its one fixed record. JWT/session validation,
membership/role checks, ownership, and domain authorization remain independent
and cannot be gained by changing the public client ID.

Confidential partner/server clients are a separate future mechanism. The
documented direction is OAuth 2.1 client credentials for managed integrations,
with hashed, scoped, rotatable API keys only where an operator-oriented
integration needs them. Neither credential may reuse S2S pairwise keys or be
shipped in browser/mobile code. Partner credential implementation, app
attestation, marketplace UX, and public-binary authenticity are deferred; the
direction and separation are required F3 documentation.

Future OAuth access tokens must target the gateway API as their audience and
carry explicit route/action scopes; possession never supplies tenant/site/
channel context without a separate enabled confidential-application mapping.
An approved API-key variant must store only a verifier/hash, expose a distinct
key ID for lookup and audit, support overlap during rotation, and support
immediate revocation and expiry. OAuth clients and API keys use a confidential
registry/authorization path separate from public client IDs and from gateway/
service S2S key maps. These are contract directions only: F3 executes no
partner authentication or routes.

## Frozen F3/F4 Application Registry Bridge

F3 defines one asynchronous `ApplicationRegistry` interface that resolves a
public lookup input to an immutable record. Controllers, CORS, rate limiting,
and signed-context construction depend on this interface rather than reading
environment variables directly:

```ts
type ApplicationRecord = {
  clientId: string;
  applicationId: string;
  profile: "storefront-web" | "admin-web" | "mobile";
  tenantId: string;
  siteId: string;
  channelId: string;
  enabled: boolean;
  origins: readonly string[];
  rateLimitProfile: string;
};

type ApplicationLookup = {
  clientId: string;
  origin?: string;
};

interface ApplicationRegistry {
  resolve(input: ApplicationLookup): Promise<ApplicationRecord | null>;
  allowedBrowserOrigins(): Promise<readonly string[]>;
  readiness(): Promise<void>;
}
```

The F3 adapter loads `GATEWAY_APPLICATION_REGISTRY_JSON` once during startup.
It is an explicit JSON array of at most 32 records and at most eight origins per
web record. All IDs use the signed-context safe-ID constraint. Origins are
canonical origins only: scheme, hostname, and explicit port, with no path,
query, fragment, credentials, wildcard, or trailing slash. Production web
origins require HTTPS; loopback HTTP is accepted only outside production.

Static single-site validation requires exactly one enabled record for each F3
profile, one shared tenant/site pair across the records, unique `clientId` and
`applicationId`, and globally unique web origins. Web records require at least
one origin; mobile requires an empty origin list. Every referenced rate-limit
profile must exist in gateway configuration. Unknown fields are rejected and
the parsed records are deep-frozen.

Startup fails on missing JSON, empty/disabled required profiles, duplicates,
ambiguous origin mappings, unsafe IDs, invalid origins, cross-site records, or
unknown rate-limit profiles in every environment. Development/test examples
are separate explicit values; production never falls back to them. The release
proof uses a real, strictly validated deployment value, so F3 may start and
serve its single configured site without pretending F4 already exists.

CORS preflight resolves the globally unique Origin from the same registry;
actual requests additionally require the matching client ID. Mobile bypasses
browser CORS but not registry lookup. Readiness reports the registry dependency
ready only after parsing and indexing complete, without returning record data.

F4 adds persistent application, tenant, site, channel, and membership records
behind this interface and preserves the `ApplicationRecord`/signed-context
shape during migration. It does not migrate temporary rows from settings-service
or a gateway-local Prisma schema because neither is created in F3.

## Frozen Release Data-Plane Boundary

The local Compose file keeps the existing backend HTTP/gRPC and infrastructure
host ports for development diagnostics. The release Compose file has a smaller
host boundary:

- publish `GATEWAY_HOST_PORT` to gateway container port `3002`;
- publish MinIO's object-data port `9000` only when
  `MEDIA_S3_PUBLIC_ENDPOINT` names that deployment endpoint, because clients
  must be able to follow gateway-issued presigned upload/read URLs;
- do not publish any of the eight backend HTTP or gRPC ports, PostgreSQL,
  Redis, or MinIO's administrative console port `9001`;
- when an external S3-compatible or CDN data endpoint is configured, clients
  follow that issued URL and the release host does not publish bundled MinIO's
  data port.

Docker `EXPOSE` metadata and service-to-service Compose networking remain
internal and do not count as published ports. The media render exception uses
the private `media-service:3007` network path. “Clients need only the gateway
URL” therefore means one configured API base URL and no configured backend
service URLs; following a gateway-issued presigned storage/CDN URL is an
intentional data-plane operation, not a second API authority.

## Frozen Gateway Readiness Matrix

Gateway liveness remains process-only. Invalid required environment or static
registry configuration is a startup failure, so the process never reports
ready with a bad configuration. Once started, the shared readiness response
contains only these required probes:

| Probe                 | Required behavior                                                                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `configuration`       | Startup validation completed successfully; the probe is static and never exposes environment values.                                                 |
| `applicationRegistry` | The already-owned registry adapter has parsed and indexed its records successfully; no record values are exposed.                                    |
| `authTransport`       | The already-owned Auth gRPC client channel reaches `READY` within a bounded deadline. This is a transport check, not `ValidateToken` or another RPC. |
| `gatewayRedis`        | The gateway-owned Redis client used for replay/idempotency state answers its readiness check.                                                        |

The gateway does not create a second Auth or Redis client for health. It does
not transitively inspect Auth's Redis state and does not call fake login/token
requests. Product, blog, taxonomy, settings, user, order, and media outages fail
only their affected routes; they do not evict an otherwise useful gateway from
readiness. Their target syntax and exact S2S key coverage are still mandatory
startup validation. If a future product requirement makes a domain globally
critical, adding its standard health capability and readiness dependency is a
separate reviewed change rather than an F3 assumption.

## Frozen OpenAPI And External Client Ownership

The gateway HTTP controllers and DTOs are the contract source. Add
`@nestjs/swagger` and use `SwaggerModule.createDocument()` to produce a
deterministically serialized OpenAPI document; do not hand-maintain a second
route schema. The checked artifacts and owners are:

| Artifact                                                        | Owner and purpose                                                                                                    |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `apps/gateway/openapi/nebula-v1.openapi.json`                   | Canonical checked OpenAPI document generated from the real gateway controllers/DTOs.                                 |
| `packages/api-client/src/schema.d.ts`                           | Checked runtime-free `paths`/`components` types generated by `openapi-typescript`.                                   |
| `packages/api-client/src/client.ts` and `src/index.ts`          | Handwritten small public API around `openapi-fetch`, including client-ID, bearer, idempotency, and request-ID hooks. |
| `packages/api-client/test/browser.spec.ts` and `native.spec.ts` | Fetch-injected contract tests for browser and React-Native usage without a live server.                              |

The package is named `@nebula/api-client`. It has no Nest, gRPC, Node built-in,
cookie-jar, or service URL dependency. It accepts one gateway base URL and an
optional injected standards-compatible `fetch`; otherwise it uses
`globalThis.fetch`. That keeps the same client usable in browsers and React
Native while leaving native secure refresh-token storage to the application.
The current React Native runtime exposes the standards-style Fetch API, and
`openapi-fetch` explicitly supports an injected fetch implementation.

Use one exported `GATEWAY_HTTP_CONTROLLERS` list in both the runtime module and
a contract-only OpenAPI module. The contract module supplies fail-on-call
adapters and never opens a listener, connects to gRPC/Redis, reads production
secrets, or performs lifecycle work against downstreams. Explicit stable
operation IDs, response codes, security schemes, stream metadata, and DTO
property annotations are required; runtime Swagger UI is disabled in F3.

Root `api:gen` regenerates the canonical JSON and client schema intentionally.
Root `api:check` creates both outputs in a temporary directory and byte-compares
them with the checked files, leaving the worktree untouched and failing on any
drift. CI runs `api:check`, the package's lint/type/build/tests, and a coverage
assertion that every controller in the shared list appears in the document.
Neither artifact uses the repository's ignored `**/generated/` path.

This choice follows Nest's documented controller-derived
[`createDocument()` contract](https://docs.nestjs.com/openapi/introduction) and
the OpenAPI TypeScript project's documented
[`openapi-typescript` plus `openapi-fetch` workflow](https://openapi-ts.dev/openapi-fetch/).
It is the narrowest current fit: generated types have no runtime, the fetch
adapter works across the two selected client environments, and it avoids a
large Node-specific generated SDK.

## Security And Architecture Change Rationale

The current S2S v2 mechanism is retained, not replaced: it already verifies
workload kind, pairwise target, RPC/body, timestamp, nonce, and request ID, and
services already distinguish gateway inbound keys. The confirmed gap is that
its fixed canonical payload does not bind the new application/tenant/site/
channel context, the gateway lacks an outbound-only startup validator, and the
existing client wrappers sign as ordinary services. Copying HTTP headers,
locally trusting JWT claims, or silently adding unsigned v2 metadata would not
meet the requirement. The narrow compatible correction is a receiver-first
shared-package extension with legacy v2 acceptance. Its cost is a shared
`grpc-auth` update, rebuild of all eight receivers, wrapper/caller updates, and
compatibility/denial tests; it does not add another signing or token system.

The browser boundary above was checked on 2026-08-10 against the WHATWG
[credentialed CORS rules](https://fetch.spec.whatwg.org/#cors-protocol-and-credentials),
the IETF [cookie specification draft](https://datatracker.ietf.org/doc/draft-ietf-httpbis-rfc6265bis/16/),
and the OWASP [CSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

## Work Order

### Batch 1 - Gateway Foundation

- [x] Add the dedicated gateway workspace with the existing Nest/TypeScript,
      lint, type-check, build, and test conventions; do not copy a hybrid
      service's Prisma or gRPC-listener setup.
- [x] Add and test a narrow HTTP-only bind/env schema and resolver in the shared
      config owner. Preserve the existing hybrid helper; do not give the
      gateway fake gRPC host/port fields.
- [x] Reuse shared strict HTTP validation, security headers, lifecycle/request
      logging, and fatal-startup handling. Add gateway CORS only after the
      registry/session decision in Batch 2; do not globally loosen service CORS.
- [x] Generate one trusted request ID at ingress, return it as `x-request-id`,
      and retain it as the F3 correlation ID. Distributed trace/span
      instrumentation remains F9 work.
- [x] Add explicit JSON/request-size limits and a gateway-owned rate-limit
      baseline. Key it from verified application plus actor, falling back only
      to the direct peer for anonymous traffic; do not trust forwarded IPs
      before a proxy topology is frozen. Keep service throttles as defense in
      depth. A distributed multi-replica limit store is future scaling work.
- [x] Add `/health/live`, `/health/ready`, and `/health` using the shared shape.
      Start with self/config probes and add only the readiness dependencies
      selected above as their registry/clients are implemented. Never create a
      second client or synthetic business request only for health.
- [x] Add focused bootstrap, env, validation, size-limit, rate-limit,
      request-ID, and health tests before domain routes.

Batch 1 verification on 2026-08-10 passed the gateway's 13 focused tests and
lint, the shared-config 64-test suite plus lint/type-check, formatting and diff
checks, frozen offline lockfile validation, and the user-run dependency-ordered
commands:

1. `pnpm --filter @packages/config build`
2. `pnpm --filter @nebula/gateway check-types`
3. `pnpm --filter @nebula/gateway build`

### Batch 2 - Application Registry And Context Model

- [x] Define stable application profiles such as storefront web, admin web,
      registered native mobile, and reserved confidential partner/server.
      Model actor state (`anonymous` or authenticated identity) separately; a
      storefront application does not change kind after login.
- [x] Define the bounded request-context constraints F3 needs: safe opaque
      identifiers, request identity, application ID/profile, tenant ID, site
      ID, and channel ID/derived kind. Preserve the exact smaller v3 signed
      projection frozen above for Batch 3. F4 retains persistence, stable-ID,
      membership, ownership, migration, and lifecycle decisions.
- [x] Implement one `ApplicationRegistry` interface and the selected strictly
      validated static adapter. An exact normalized origin plus registered web
      client ID, or an originless registered mobile ID, maps to fixed
      application/tenant/site/channel records; request bodies and raw context
      headers cannot supply authoritative scope.
- [x] Register the current Next BFF identity as the configured `admin-web`
      public application with its exact original origin. Do not mislabel it as
      a partner credential or give it an S2S secret; Batch 7 makes the BFF send
      that already-defined identity when its proxy routes move to the gateway.
- [x] Define actor identity so only the Batch 3 gateway Auth client may create
      authenticated state. Keep actor, application, tenant, site, channel,
      target, and owner distinct; Batch 2 never decodes or trusts a JWT.
- [x] Define the F3 admin-role bridge as only existing Auth-verified global
      `admin`/`root-admin` roles. Batch 5 applies it to selected admin routes;
      it is not tenant/site membership authorization, which F4 owns.
- [x] Derive gateway CORS from the same registry decision. Deny unknown origins;
      use exact origins and `Vary: Origin`; freeze credential mode and a fixed
      allowed/exposed header set covering `Authorization`, `Content-Type`, the
      chosen public-client header, `Idempotency-Key`, and `X-Request-ID`.
- [x] Treat browser hosts/origins and mobile client IDs as public identifiers,
      not authentication secrets. Always apply actor auth, registration status,
      rate limits, and domain authorization independently.
- [x] Define and document the future confidential partner credential direction:
      delegated OAuth/OIDC versus scoped server API keys, audience/scope,
      rotation/revocation, and separation rules. Do not execute a partner route
      or marketplace in F3, and never reuse browser/mobile identifiers or
      gateway/service S2S secrets.
- [x] Add registry schema/startup, exact-origin/preflight, BFF identity,
      anonymous/authenticated storefront, admin-role, copied-public-ID
      fixed-mapping, raw-context override, host/origin mismatch, record
      isolation, and production-fallback denial tests.

Batch 2 uses `GATEWAY_APPLICATION_REGISTRY_JSON` as a required explicit value
in every environment. The checked development example and ignored local
development environment define exactly one enabled `storefront-web`,
`admin-web`, and `mobile` record on one tenant/site pair. Production has no
fallback and requires its own HTTPS registry records. Gateway CORS is local to
the gateway and leaves the shared direct-service CORS policy unchanged.
A matching `apps/gateway/.env.example` supports standalone service development;
its checked alignment test prevents it from drifting from the startup schema.

Batch 2 focused verification on 2026-08-11 passed 33 gateway tests plus gateway
lint and type-check. Its final gateway build is included in the dependency-
ordered Batch 3 build checkpoint below so the newly required shared trust
package is built first.

### Batch 3 - Signed Trust, Internal Contracts, And Clients

- [x] Add an outbound-only gateway trust env/runtime validator to
      `@nebula/grpc-auth`, reusing the existing `GATEWAY_OUTBOUND_KEYS` parser
      and target selection. Require exact downstream target coverage without
      fake inbound keys, replay state, or gRPC listener configuration.
- [x] Implement the selected receiver-first context envelope in the shared S2S
      owner. Bind the bounded canonical context to the signature, require it
      for gateway-kind domain calls, and retain legacy ordinary-service v2
      acceptance during the documented migration.
- [x] Reserve every context/digest carrier name, build gateway metadata from an
      allowlist instead of copying inbound HTTP headers, enforce size and
      cardinality limits, reject duplicate/unsigned context, and attach trusted
      carriers only after signature/provenance verification.
- [x] Keep signed actor assertions separate from authoritative
      `ContextCarrier.user`. Downstream services still validate the forwarded
      bearer through auth-service and fail closed if actor ID/role/session
      assertions disagree; S2S identity alone never proves a human actor.
- [x] Add additive Auth Register and Logout RPCs because the prior proto had
      neither. Registration remains auth-service-owned; do not expose the
      auth-only user `CreateUser` RPC. Logout derives its actor/session from the
      verified bearer rather than an authoritative body user ID.
- [x] Add the other internal contracts selected by the route manifest: User
      ListUsers; distinct role-protected Product admin list/get/gallery reads
      plus authoritative ACTIVE/non-deleted public reads; Media user-owned
      protected list/read and public-library delete preview/confirm. Update
      every required proto, generated type, DTO, controller, mapper,
      documentation, and denial/e2e layer together.
  - [x] User `ListUsers`: private admin/root-admin RPC, current unpaginated
        non-secret projection, service-layer field selection, and unit/live
        authorization coverage.
  - [x] Product public/admin read separation and gallery reads.
  - [x] Media user-owned protected reads and public delete preview/confirm.
- [x] Refactor the existing settings and taxonomy wrappers to accept an
      injected caller/signing policy, verified context, and ingress request ID
      while preserving their ordinary-service defaults for current callers.
- [x] Add typed wrappers for Auth, User, Product, ProductTaxonomy, Blog,
      BlogTaxonomy, Order, and Media, and register validated `host:port` targets.
      Keep request shaping/invocation in `@nebula/clients` and shared status
      translation in `@nebula/grpc-auth`.
- [x] Replace or narrowly extend the service-only `@InternalOnly()` policy on
      Auth `ValidateToken` with an exact mixed policy for verified gateway kind
      plus the existing approved service callers. Adding `gateway` only to the
      name allowlist is insufficient because `S2SGuard` rejects its kind first.
      Keep every other internal bootstrap/auth-maintenance RPC service-only and
      add gateway-plus-service caller-policy tests.
- [x] Add a gateway-specific external bearer resolver, or parameterize the
      shared resolver, so Auth validation is signed with `kind: "gateway"` and
      the pairwise gateway key. Do not reuse the current service-signing guard
      unchanged and do not decode/trust JWT claims locally.
- [x] Make every gateway call bind `kind: "gateway"`, exact target and generated
      RPC definition/request, pairwise key, verified context, forwarded bearer
      when present, and the ingress request ID, with a fresh timestamp/nonce on
      every hop and retry.
- [x] Propagate the same verified context and request ID through nested causal
      calls such as gateway -> order -> product/settings, while re-signing each
      hop with its own caller identity and fresh nonce/timestamp.
- [x] Complete the selected downstream readiness probes only through clients
      already owned by the gateway; do not require a generic Ping that most
      service protos do not expose.
- [x] Add focused client-package, auth caller-policy, context migration,
      actor/bearer consistency, nested propagation, and denial tests covering
      wrong target/body/RPC, replay, altered ID, raw-header override, unsigned
      or duplicate context, wrong kind, and gateway-key reuse.

The first Batch 3 item was implemented on 2026-08-11. The gateway now composes
a shared outbound-only schema and repeats its runtime assertion before opening
the HTTP listener. It requires exact coverage for Auth, User, Product,
Settings, Blog, Order, Taxonomy, and Media, rejects undeclared authority and
pairwise-secret reuse, and has no fake inbound, replay, Redis, `PUBLIC_MODE`, or
gRPC-listener settings. Development, local ignored, root, and production
examples now carry the appropriate gateway outbound map; focused tests also
prove that every tracked development edge matches its receiver example.

Its dependency-ordered user-owned build checkpoint then passed all three
commands below:

1. `pnpm --filter @nebula/grpc-auth build`
2. `pnpm --filter @nebula/gateway check-types`
3. `pnpm --filter @nebula/gateway build`

The next three Batch 3 items were implemented receiver-first on 2026-08-11.
Ordinary service calls still emit/accept byte-compatible v2. Gateway or
context-propagating service calls use v3, whose exact-schema canonical context
and digest are signature-bound. Receivers reject partial, duplicate, unsigned,
non-canonical, oversized, or altered context; attach verified request context
only after signature, route-policy, and replay checks; and keep `signedActor`
separate from authoritative `user`. Gateway/v3 actor and Bearer halves must
appear together and match auth-service truth exactly before `user` is attached.
The gateway-specific metadata builder accepts only that optional verified
Bearer plus explicit trusted signing inputs, never raw inbound HTTP metadata.

Focused verification now passes 108 `@nebula/grpc-auth` tests plus package lint
and type-check. The existing gateway ingress boundary already strips raw S2S,
service, request-ID, tenant/site/channel, and actor/role authority headers.
Gateway-like live e2e helpers now emit v3 and derive their actor assertion only
inside an explicitly test-only fixture; production code never decodes a JWT to
create actor authority.

The additive Auth Register/Logout checkpoint was completed on 2026-08-11.
Registration remains owned by `AuthService.register`, so the gateway cannot
call the auth-only User `CreateUser` contract. Logout is a private,
gateway-kind-only, authenticated RPC: its actor and current session are derived
from auth-service validation of the forwarded bearer, never from a body user
ID. The unsupported `deviceId` selector is now rejected instead of silently
ignored. Auth token responses also expose authoritative access/refresh TTLs so
later browser and native transports do not invent cookie lifetimes.

The user-owned proto, grpc-auth, and final auth-service builds passed.
Auth-service verification also passed type-check, lint with zero errors, 26
security tests, and 11 focused gRPC-controller/strict-HTTP-validation tests.

User `ListUsers` was added on 2026-08-11 as an intentionally unpaginated,
private admin/root-admin RPC matching the existing HTTP capability. Its service
query selects only ID, email, phone, role, and creation time; the mapper emits
ISO-8601 time and cannot expose password/hash fields. Proto generation,
isolated stale-output checking, proto type-check/lint, user-service type-check,
user-service lint with zero errors, and six focused unit/denial tests pass. The
existing live gRPC suite now also covers admin success and ordinary-user denial;
execution remains with the later service-stack e2e checkpoint. Its final
user-service build also passed.

Product public/admin read separation was completed on 2026-08-11. Public
`GetProduct`, `ListProducts`, and `ListGallery` now force ACTIVE/non-deleted
product visibility, and gallery reads verify the public parent before returning
only non-deleted rows. Legacy public lifecycle/deletion request fields remain
wire-compatible but deprecated and ignored. The additive `AdminGetProduct`,
`AdminListProducts`, and `AdminListGallery` RPCs are private to verified admin/
root-admin actors; admin gallery rows now carry additive deletion timestamps.
The current direct HTTP list/get routes branch to the broad methods only from a
guard-verified admin actor, preserving the admin BFF during migration without
trusting request headers.

Proto generation/check/type/lint and the proto build pass. Product-service
type-check and lint pass with zero errors, seven focused visibility/role tests
pass, and the final product-service build passes. The existing live gRPC suite
now covers draft/deleted hiding, admin visibility, gallery separation, and
ordinary-user denial; execution remains with the later service-stack e2e
checkpoint.

Media route parity for the frozen F3 launch surface was completed on
2026-08-11 without replacing its existing policy owner. The additive
`ListMyProtectedLibrary` and `CreateMyProtectedReadUrl` RPCs derive owner and
actor from verified context, fix the lane to protected/private, and preserve
the existing exact scope/entity checks. `PreviewPublicLibraryDelete` and
`ConfirmPublicLibraryDelete` reuse media-service's bounded plan, actor/role-
bound short-lived token, plan re-check, and synchronous deletion cap. The
legacy direct public delete RPC remains an internal compatibility capability;
the public gateway manifest exposes only preview/confirm.

Proto generation/check/type/lint and the proto build pass. Media-service
type-check, focused lint, 21 focused controller/policy tests, and the final
media-service build pass. Two live gRPC scenarios now cover actor-derived
owned access, ordinary-user delete denial, preview, and token-bound confirm;
their execution remains with the later service-stack e2e checkpoint.

The existing Settings and Taxonomy wrappers were made gateway/context capable
on 2026-08-11 without changing current service callers. Their optional
`GrpcClientSigningPolicy` accepts only caller kind/name, pairwise key, verified
context, and ingress request ID. Each wrapper retains its fixed target,
generated RPC definition, and actual shaped request, while timestamp and nonce
remain fresh and non-injectable. Omitting the policy preserves environment-
resolved ordinary-service v2 behavior.

The clients package now owns a focused Jest harness. Its four tests prove the
ordinary-service default, reserved-header override rejection, injected gateway
v3 context/request ID/key, fresh retry nonce, fixed Taxonomy target, signing of
the actual wrapped create body, and missing-gateway-context fail-closed
behavior. Clients type-check, lint, test, and build all pass.

The remaining manifest-selected internal clients and gateway registrations
were completed on 2026-08-11. Auth, User, Product, ProductTaxonomy, Blog,
BlogTaxonomy, Order, and Media now expose thin typed proxies over fixed
generated unary definitions. The new proxies intentionally omit auth-only User
bootstrap/hash methods, service Ping methods, nonexistent Order admin reads,
generic Media compatibility mutations, and direct public-library delete. The
facade clients share their owning Product/Blog targets without falling back to
raw global Taxonomy writes.

Gateway startup now requires all eight scheme-free `host:port` control-plane
targets and registers one Nest gRPC client per backend connection. These values
are deployment configuration, not request inputs; development, ignored local,
root, and production examples are aligned. The shared optional target helper
remains unchanged for existing services, while a new required variant covers
runtimes without a safe upstream default.

Focused verification passes 12 clients tests across the two existing and eight
logical manifest wrappers, 65 shared-config tests, and 37 gateway tests. The
clients, config, grpc-auth, and gateway type/lint checks pass, and all four
package builds pass.

Auth `ValidateToken` received its narrow mixed-kind policy on 2026-08-11. A
new shared `AllowedS2SIdentities` decorator matches the signed caller kind and
name as one exact pair after signature verification. `ValidateToken` replaces
its service-only `@InternalOnly()` plus name-only allowlist with
`gateway/gateway` and the eight previously approved service identities. Every
other Auth internal/gateway route keeps its former policy; a caller name cannot
cross kinds to gain access.

The focused S2S guard suite passes 20 tests, including invalid policy creation,
gateway and ordinary-service acceptance, cross-policy denial, and unchanged
gateway-only/internal-only behavior. Auth controller policy tests pass seven
tests, auth-service type-check/focused lint/build pass, and two compiled live
ValidateToken cases are queued for the later stack checkpoint.

The gateway-owned external bearer resolver was completed on 2026-08-11. It
passes the opaque token only in the signed `ValidateToken` protobuf body, uses
the gateway-to-Auth pairwise key, binds the generated RPC/body plus the
registry-derived application/site/channel context and ingress request ID, and
accepts actor state only from Auth's `isValid`, user ID, role, and non-secret
session reference. It never imports a JWT decoder or the ordinary-service
`GrpcTokenAuthGuard`.

The HTTP guard rejects duplicate, malformed, and oversized Authorization
values; requires Auth truth for private/role routes; attaches separate actor
and user state; and runs before throttling so the existing application-plus-
actor tracker is effective. Public operational health stays independent of API
application identity. Gateway type-check, lint, 48 tests, and build pass; the
shared guard's ordinary-service signing path is unchanged.

Gateway downstream call construction was centralized on 2026-08-11. The
factory accepts only a middleware-resolved request and one declared backend
target, selects the gateway pairwise key, projects the exact signed context,
requires authenticated actor/user/bearer state to agree, and creates
application metadata containing only the verified bearer. Typed wrappers still
own the fixed target, generated definition, shaped body, and fresh timestamp/
nonce. The Auth bootstrap lookup remains the deliberate actor-free special
case because Auth truth must exist before an actor assertion can be created.

Three focused downstream-context tests prove anonymous header stripping,
authenticated actor/bearer forwarding, request-ID/context preservation, fresh
retry nonces, exact target binding, and failure on incomplete actor state,
missing context/key, or undeclared target. Gateway now passes 51 tests plus
type-check, lint, and build.

Transitive service propagation was completed on 2026-08-11 with an explicit
verified-context projector in `@nebula/grpc-auth`. It accepts only caller,
request, application, actor, user, and bearer state already attached by the
inbound guards; rejects inconsistent or partial state; and emits only the
original request ID, normalized signed context, and verified bearer. It
deliberately omits caller kind/name and target key so each next-hop service
resolves its own service identity and pairwise target key. The downstream
wrapper continues to bind the generated RPC/body and creates a fresh
timestamp/nonce. V2 requests retain their verified request ID without
inventing application context, while bootstrap initializers with no ingress
request remain on their existing ordinary v2 calls.

Order now propagates through cart-triggered Product and Settings calls, Product
propagates its create/update Settings and Taxonomy calls, and the Product/Blog
taxonomy facades propagate every gateway-triggered Taxonomy call. The focused
Order proof observes service-kind v3 signatures to both different targets with
the same request/context/bearer, distinct pairwise keys, and distinct nonces.
The shared propagation suite rejects missing trust, duplicate/malformed bearer
state, and actor/user inconsistencies. Grpc-auth passes 117 tests, Order passes
11 unit tests, Product passes 24, and Blog passes 17; all four affected
packages pass type-check/lint/build, with only their already-known test lint
warnings.

The frozen readiness matrix is also complete. The gateway reuses its owned Auth
gRPC client and checks only the channel's bounded `waitForReady`; it does not
call `ValidateToken`, `Ping`, or any synthetic business RPC. One lazy gateway-
owned Redis connection supplies the bounded `PING` readiness probe and is the
connection future gateway state owners will reuse. The configuration and
registry probes remain local. Product, Settings, Blog, Order, Taxonomy, User,
and Media outages do not evict the entire gateway. Gateway passes 53 focused
tests plus type-check, lint, and build.

The closing Batch 3 denial audit covers fixed generated targets/RPCs/bodies,
wrong receiver/RPC/body, replay and concurrent duplicates, altered signed
request IDs, reserved/raw-header override attempts, partial/duplicate/unsigned
context, actor/bearer mismatch, wrong caller kind, target-key coverage, and
cross-target secret reuse. The newly explicit altered-request-ID case brings
the S2S guard suite to 21 tests; the complete grpc-auth suite passes 117 tests.

### Batch 4 - External API Standards

- [x] Reuse the frozen additive API/proto versioning and deprecation rules in
      `docs/architecture/api-and-proto-versioning.md`. The `/api/v1` routes
      themselves remain unimplemented.
- [x] Turn the frozen route/policy manifest into the single contract source for
      DTOs, adapters, OpenAPI, tests, and generated clients. Do not infer route
      scope later from every method a proto happens to expose.
- [x] Define one JSON success envelope and one error envelope with stable error
      codes and request IDs. Normalize at the gateway; do not rewrite services.
      Do not wrap the media byte stream, empty/204 responses, or shared
      operational-health shapes in a JSON data envelope.
- [x] Define validation-error details from the shared strict HTTP pipe without
      exposing stacks, raw upstream messages, or internal service metadata.
- [x] Define resource-specific pagination profiles under the common envelope.
      Preserve page/limit/total where the downstream contract supplies it,
      translate product's total deliberately, retain media offset/take without
      inventing a total, and label current user/order lists unpaginated unless
      an additive contract is approved.
- [x] Define per-resource filter/sort/field allowlists and reject unsupported
      combinations. Never forward a generic query object to Prisma/proto, and
      do not expose generic settings keys or internal trust/secrets by default.
- [x] Define `Idempotency-Key` syntax, scope, request hashing, expiry,
      in-flight behavior, replay response, and conflict behavior for create,
      checkout, upload, and future contract operations.
- [x] Centralize gateway replay suppression in Redis. Document where a domain
      operation still requires owning-service durable idempotency; never claim
      gateway response caching provides exactly-once execution after a crash.
- [x] Turn the frozen route-specific retry/idempotency matrix into executable
      route policy and tests. GET/HEAD and explicitly idempotent operations may
      be retry-safe; cart-add increments, blog-create slug suffixing, and a
      checkout whose response is lost after commit are not made durable
      exactly-once by gateway caching.
- [x] Define external DTO/envelope/error/pagination/idempotency components
      separately from proto interfaces and Prisma models. Configure OpenAPI
      generation now, but generate/snapshot each domain only after its actual
      Batch 5 routes exist.

Batch 4 was completed on 2026-08-15. The executable manifest contains 70 unique
F3 endpoints and is consumed through `GatewayApiRoute(routeId)`, which derives
runtime method/path, application and actor metadata, idempotency policy, stable
operation ID, and OpenAPI response/header declarations from the same record.
Public/admin input profiles fail closed on unknown keys and unsupported
combinations without importing proto or Prisma types.

The post-Batch-4 maintainability cleanup keeps the original route/input
aggregator imports but moves definitions into service-specific `routes/` and
`inputs/` files with duplicate validation. Ambiguous application/HTTP context
files are now `trusted-request.ts` and `public-client-boundary.ts`, and the
OpenAPI-only shared DTO file is `openapi-envelope.dto.ts`. Manifest input
validation runs for safe, session, stream, and key-profile routes before
controller or downstream execution.

The gateway now owns one request-correlated JSON success/error contract, safe
validation field/code details, and four explicit pagination profiles. The
global boundary filter also normalizes application-identity middleware,
body-parser, Auth/role, downstream, throttle, and unknown failures without
returning raw internal messages. Stream, operational-health, and successful
empty-response exceptions remain explicit.

`Idempotency-Key` is a bounded 16-128 byte public request key. The Redis state
machine binds its digest to application, actor, route, and canonical request
material; atomically distinguishes first execution, in-flight duplicate,
conflicting reuse, and completed replay; and rebinds replayed envelopes to the
new ingress request ID. Defaults are a 60-second in-flight lease, 24-hour
completed TTL, and 512-KiB cached response cap. Redis failure fails key-profile
routes closed, while crash/lease ambiguity remains documented as not durable
exactly-once domain execution.

The contract-only OpenAPI module uses `@nestjs/swagger` 11.4.6 and the shared
controller list without importing runtime gRPC, Redis, lifecycle, or production
configuration. It creates deterministic controller-derived documents but does
not expose Swagger UI or generate an empty checked artifact before Batch 5
routes exist. `docs/architecture/gateway-api-standards.md` records the complete
contract.

Verification passes 114 gateway tests across 24 suites and 66 shared-config
tests. Gateway and config type-check/lint pass, both package builds pass,
formatting/diff checks
are clean, and the gateway environment examples cover every new bounded
idempotency setting.

### Batch 5 - Versioned Route Adapters

- [ ] Add `/api/v1/auth` routes for register, login, refresh, logout, and
      profile through the Batch 3 Auth client. Preserve auth-service issuance,
      validation, rotation, replay, and revocation behavior; apply the selected
      browser cookie/CSRF and native-mobile token transports without duplicating
      token logic.
- [ ] Add only the user self/admin routes selected by the manifest, retaining
      user-service enforcement. Do not promise admin listing unless the
      additive ListUsers path was completed.
- [ ] Add public/admin settings routes through the existing typed settings
      client and an explicit external key allowlist; never expose secret/trust
      configuration or the internal bootstrap RPC.
- [ ] Add public and explicitly selected admin product routes. Force ACTIVE,
      non-deleted product/gallery visibility for anonymous/storefront reads;
      never forward public `status` or `includeDeleted` controls. Keep admin
      lifecycle/actions distinct and test both policies.
- [ ] Add supported public/admin blog routes without inventing an admin draft
      list or get-by-ID contract that does not exist.
- [ ] Add product/blog taxonomy routes through `ProductTaxonomyService` and
      `BlogTaxonomyService`. Do not expose raw global taxonomy writes where the
      domain facade owns scope validation.
- [ ] Add cart, checkout, order read, and admin status routes through the
      existing contract with actor identity derived from the token. Label order
      list/get as user-only and status update as admin-only; do not imply an
      unimplemented admin order-list route.
- [ ] Add only the media lanes backed by the completed internal contracts.
      Preserve public/protected/strict authorization. Keep presign/finalize as
      JSON control-plane calls and allow clients to follow returned upload/
      delivery URLs on the storage data plane.
- [ ] Proxy `/api/v1/media/render/:id` as the sole byte-stream transport
      exception selected above. Preserve content type/length/disposition,
      cache/ETag behavior, and denial statuses; never JSON-wrap the bytes or
      allow user input to choose the internal upstream base/path.
- [ ] Apply JSON envelopes, query profile, idempotency/retry declaration,
      application policy, request ID, and signed context consistently wherever
      applicable, with stream/health/204 exceptions recorded in the manifest.
- [ ] Generate and snapshot the checked OpenAPI document as each domain lands.
      Add route/role/visibility, cookie/CSRF, context, downstream-status/error,
      pagination, idempotency, and stream tests one domain at a time; do not
      alter domain logic merely to make the gateway look uniform.

### Batch 6 - Runtime And Release Boundary

- [ ] Migrate the root backend inventory before adding gateway metadata. Keep
      one list with explicit capabilities/transport, then derive nine backend
      runtimes, eight HTTP/gRPC hybrid services, and seven Prisma services.
      Runtime views own quality/dev/build/health/env/image/save/scan work;
      hybrid and Prisma views retain their narrower security/database checks.
- [ ] Update inventory/tooling/config/grpc-auth tests that currently assume
      every record has integer HTTP and gRPC ports, gRPC bootstrap/replay, or
      published release ports. Never satisfy them with fake gateway fields.
- [ ] Add the gateway to the shared Dockerfile/Bake graph and sequential runner.
      Do not create a separate Dockerfile, a second service list, or parallel
      builds.
- [ ] Add local and release Compose gateway services with port 3002, validated
      downstream gRPC targets, gateway outbound key examples, registry/session/
      Redis configuration, the fixed media-render HTTP target, healthchecks,
      and selected dependency readiness.
- [ ] Keep all backend HTTP/gRPC ports published in local Compose for diagnosis.
      In release Compose publish the gateway API, remove backend application
      `ports:` mappings, keep Postgres and the MinIO console private, and expose
      only the selected storage data endpoint needed by presigned URLs.
- [ ] Preserve the existing release `PUBLIC_MODE=GATEWAY_ONLY` default. Add a
      narrow operational-health exception/contract so unsigned localhost
      Docker readiness works with sanitized responses, and test it in
      production mode without weakening domain routes.
- [ ] Separately prove unsigned gRPC is rejected, gateway-only RPCs reject an
      ordinary service identity, and intentional service-to-service RPCs still
      work. `PUBLIC_MODE` is an HTTP policy, not a global gRPC caller switch.
- [ ] Apply the selected private-network media render exception narrowly. If
      using the recommended existing public HTTP path, give media-service the
      explicit release policy needed for that path after its host port is no
      longer public; defer a new signed HTTP/streaming system.
- [ ] Fix and test the undefined `$repoRoot` in
      `scripts/docker/save-release-images.ps1` before relying on the release
      archive to contain the ninth image.
- [ ] Add gateway/shared unit and contract commands to the root quality/CI
      lane. Later add the external-client package's lint/type/build/test lane;
      do not assume the existing explicit security list or wildcard e2e command
      discovers these tests automatically.
- [ ] Assert rendered Compose reachability and health behavior, not only YAML
      parsing/regex. Extend the existing Docker/tooling owner and sequential
      boot flow rather than creating another workflow.

### Batch 7 - External Typed Client And Current Web Corrections

- [ ] Finish and stale-check the route-derived OpenAPI JSON, then generate a
      browser- and React-Native-compatible external TypeScript client before
      changing web callers. Keep it separate from internal `@nebula/clients`,
      avoid Node-only runtime assumptions, exercise both consumer targets, and
      add lint/type/build/test plus a non-mutating generate-to-temp CI check.
      F8 still owns integration into the actual React Native application.
- [ ] Add the smallest focused `apps/web` test/contract harness needed for these
      corrections; the current package has no test script or route/helper tests.
- [ ] Make the current Next BFF send its configured registered public-client
      identity and selected original host/origin context when calling the
      gateway. Browser `Origin` is not automatically forwarded by server-side
      `fetch`.
- [ ] Fix `apps/web/src/lib/auth/refresh.ts` to call its POST-only refresh route
      with `method: "POST"` and cover it with a regression test.
- [ ] Characterize and preserve the existing rotated refresh-cookie write, then
      repoint its upstream to the gateway. Align cookie lifetime/clear behavior
      with auth truth; do not implement a second rotation or revocation policy.
- [ ] Add or repoint the smallest browser logout handler/caller needed for the
      F3 proof: POST the gateway logout contract and clear the selected browser
      cookies with the same attributes. Do not expand this into an F7 auth UI.
- [ ] Fix `apiFetch` so queued concurrent requests are rejected and cleared
      when refresh fails rather than remaining unresolved forever.
- [ ] Add the missing product collection POST forwarding path. Preserve the
      UI's existing `{ data: ... }` create and `{ patch: ... }` update nesting,
      but map UI `content` to backend `description` for both POST and PATCH.
- [ ] Replace direct auth/product/taxonomy service URL assumptions with one
      configured gateway API base URL only after equivalent routes pass.
      Presigned storage/CDN URLs returned at runtime remain valid data-plane
      destinations.
- [ ] Migrate callers to the generated client, then remove or reduce old Next
      proxies only where cookie/error/status behavior has proven parity. Keep a
      thin same-origin BFF where the selected browser-session design requires it.
- [ ] Cover refresh success/failure/concurrency/cookie expiry, login/logout,
      product create/update mapping, application identity, gateway error shapes,
      and removal of individual service URL assumptions.
- [ ] Keep this compatibility patch surgical. F7 still owns the Vite admin,
      storefront split, and broader reuse or replacement of `apps/web`.

### Batch 8 - Documentation, Proofs, And F3 Exit Gate

- [ ] Document the route manifest, envelopes/errors, resource query profiles,
      idempotency/retry promises, application profiles, browser/mobile/BFF token
      behavior, signed-context provenance/migration, media/storage exceptions,
      readiness policy, and F4 registry replacement.
- [ ] Update the exact runtime owners: the new gateway document, docs index,
      `deploy/README.md`, `docs/docker-configs.md`, local Docker boot guide,
      testing/health contract, and config/grpc-auth/client docs. Preserve the
      corrected sequential Bake/frozen-offline-install instructions and, after
      gateway runtime wiring lands, distinguish nine backend runtime images,
      eight hybrid services, and seven databases.
- [ ] After the behavior lands, update the actor/S2S contracts so a new ingress
      gets a new request ID while nested causal hops preserve it and re-sign
      with fresh nonces. Correct the stale blog-service claim that gRPC create
      succeeds without caller metadata; current enforcement rejects it.
- [ ] Prove anonymous storefront, authenticated storefront user, authorized
      admin, and registered mobile request paths. Keep partner execution
      disabled while its separate credential direction remains reserved.
- [ ] Prove each external client configures only the gateway API base URL and no
      internal service URL. It may follow an issued presigned storage/CDN URL.
- [ ] Prove release clients cannot reach backend HTTP/gRPC, Postgres, or the
      MinIO console, while the approved storage data plane and local diagnostic
      ports behave as documented.
- [ ] Prove ordinary clients cannot directly set or override actor,
      application, tenant, site, channel, request ID, role, or gateway identity
      in signed context. Every accepted public identifier may be copied but
      resolves only its fixed registry record; actor/role authorization remains
      independent. Test raw-header, altered-bearer, host/origin mismatch,
      replay, and nested-hop cases without claiming public-app authenticity.
- [ ] Prove release healthchecks work under the preserved gateway-only policy,
      the selected media exception is no broader than documented, registry
      production configuration fails closed, and startup/readiness is honest.
- [ ] Run focused gateway/config/grpc-auth/clients/auth/web/tooling tests first;
      then external-client checks, backend lint/types, proto/API stale checks,
      security tests, source build, rendered Compose checks, and targeted live
      client flows. Leave the final heavy sequential image/live/scan lane to the
      user unless they request it in this session.
- [ ] Review the complete diff and tracked-file cleanliness. Update `TODO.md`
      checkboxes only from verified results, then close F3 only when runtime,
      generated clients, release boundary, documentation, and all four original
      F3 exit outcomes agree.

## Guardrails

- Work only on F3 gateway, shared trust/client support, the named web
  corrections, and required runtime wiring. Do not begin F4 domain migration,
  F5 broader media delivery, F6 modular/licensing work, F7 frontend redesign,
  F8 mobile implementation, or F9 production/Kubernetes work.
- Prefer extending the existing config, grpc-auth, proto, clients, inventory,
  Docker, Compose, and CI owners. Search before creating every helper or file.
- Do not place tenant/site/application trust in settings-service, browser
  headers, JWT claims that auth-service does not verify, or a service-local
  Prisma client.
- Do not duplicate JWT validation, refresh rotation, S2S signing, error maps,
  validation pipes, request logging, health shapes, or service registries.
- Do not weaken ordinary service-to-service v2 behavior, expose an auth-only
  bootstrap RPC, or make a signed workload assertion authoritative for a user.
- Keep external DTOs and envelopes at the gateway boundary. Domain services
  retain their current proto, service-input, mapper, and Prisma ownership.
- Do not invent totals, sorting, admin reads, public visibility, or idempotency
  guarantees that the route manifest and downstream contract cannot prove.
- Gateway authorization is defense in depth. Downstream services must continue
  enforcing roles, ownership, scope, and business rules.
- Never hand-edit generated proto/OpenAPI/client output. Change its source and
  regenerate through the selected owner.
- Development comes first: keep local service ports and full build/debug tools.
  Apply private-port restrictions to release configuration only.
- Keep ignored development/test `.env` files current as batches add variables;
  this explicitly includes editing or generating development-only secret
  values. The direct-secret restriction starts at the production phase and
  continues through later deployment phases, where only variable names,
  formats, and safe placeholders belong in repository files or output.
- Preserve the current dirty worktree and unrelated `apps/web`/documentation
  changes. Never overwrite or reformat them broadly.
- Review code changes before applying them, use small patches within this full
  plan, and leave builds/scans likely to exceed five minutes to the user.
- Classify each new finding as confirmed defect, stale implementation or
  documentation, optional hardening, or future scaling consideration. Do not
  turn partner-credential execution, attestation, CDN, marketplace, distributed
  tracing/rate storage, or Kubernetes work into an F3 blocker. The documented
  OAuth/API-key direction itself remains a required F3 decision.

## Next Action

Start Batch 5 with the `/api/v1/auth` adapters derived from the executable
manifest. Preserve Auth-service token/session ownership, implement the selected
browser/BFF and native transport split, and generate/snapshot only the Auth
portion of the checked OpenAPI document with focused cookie/CSRF, status/error,
application-policy, and idempotency tests. Compose remains deferred until the
capability-aware runtime inventory and gateway container wiring in Batch 6.
