# TODO: NebulaNV Platform Roadmap

Last reviewed: 2026-07-11

## Mission

Build a secure, tenant-aware, channel-aware, media-capable, API-first, modular, and Kubernetes-ready platform foundation before expanding product features.

Milestone order:

1. Complete the platform foundation.
2. Deliver a usable commerce demo across admin, storefront, and React Native.
3. Build advanced capabilities as independent modules.
4. Productize the proven platform as a parent/subordinate multi-tenant SaaS.

## Sources Of Truth

- Current execution: `docs/current-focus.md`
- Technical audit: `docs/audit/NebulaNV-technical-audit-2026-07-08.md`
- Platform target: `docs/architecture/tenant-package-channel-platform.md`
- Service boundaries: `docs/architecture/system-relationships.md`
- Contract rules: `docs/architecture/contracts-and-boundaries.md`
- Media contract: `docs/services/media-service.md`
- Composition target: `docs/frontend/block-and-theme-system.md`

## Non-Negotiable Rules

- Do not start advanced features before the Foundation Definition of Done passes.
- External clients call one public gateway, never internal services directly.
- Internal service calls require verified S2S identity.
- Raw user, role, tenant, site, app, or service headers are never trusted identity.
- Every applicable resource, cache key, job, event, and storage path is tenant/site scoped.
- Each service owns its database and domain.
- Cross-service access uses versioned HTTP/gRPC contracts.
- Media-service owns media policy; object storage owns bytes only.
- Frontends never become the security, identity, or entitlement authority.
- Premium backend implementations live in separate module services or workers.
- Core schemas must not accumulate fields belonging to premium modules.
- Every migration, deployment, contract change, and parent action is auditable.
- Planned behavior must not be documented as implemented.

---

# Verified Starting Point

- [x] pnpm/Turborepo monorepo exists.
- [x] Auth, user, settings, taxonomy, media, product, blog, and order services exist.
- [x] Per-service Prisma ownership exists.
- [x] HTTP and gRPC foundations exist.
- [x] Protobuf generation exists.
- [x] Docker Compose includes PostgreSQL, Redis, MinIO, and backend services.
- [x] S3-compatible presign/finalize foundation exists.
- [x] Public/protected/strict media access classes exist.
- [x] Public media render-by-ID foundation exists.
- [x] Focused auth and media tests exist.
- [x] Full workspace build passes as of 2026-07-11.
- [x] Docker Compose configuration parses as of 2026-07-11.
- [x] Full workspace lint passes.
- [ ] Full infrastructure-backed integration suite passes.
- [ ] Dedicated external API gateway exists.
- [ ] Tenant/site/channel ownership exists.
- [ ] Media promotion and variant workers exist.
- [ ] Public storefront exists.
- [ ] React Native application exists.
- [ ] Kubernetes/Helm deployment exists.

---

# FOUNDATION

## F0 — Close Current Media Policy

Active checkpoint: P0-0D Download Resistance and SEO Media Strategy.

- [x] Freeze CORS/origin matrix for storefront, admin, direct uploads, CDN, and signed reads.
- [x] Document canvas, WebGL, overlays, and UI restrictions as casual-copy resistance, not DRM.
- [x] Freeze temporary protected/strict preview behavior.
- [x] Record the future trigger for downsized or watermarked sensitive previews.
- [x] Update media and web documentation with the final decisions.
- [x] Mark F0 complete.
- [x] Move active focus to F1 Security And Trust Integrity.

### F0 Exit Gate

- [x] Public, protected, and strict delivery policies are unambiguous.
- [x] Website, mobile, admin, storage, and CDN origin rules do not conflict.
- [x] No documentation promises unimplemented DRM or media variants.

---

## F1 — Security And Trust Integrity

### S2S Enforcement

- [x] Apply `S2SGuard` consistently to auth-service internal calls.
- [x] Apply `S2SGuard` consistently to media-service gRPC calls.
- [x] Apply `S2SGuard` consistently to order-service gRPC calls.
- [x] Audit every service's HTTP and gRPC guard chain.
- [x] Standardize enforced guard order: service identity before user/JWT identity.
- [x] Reject unsigned internal calls in every service.
- [x] Reject unauthorized gateway-only calls.
- [x] Separate gateway secrets from inter-service secrets.
- [x] Bind S2S signatures to method, path/RPC, timestamp, body, nonce, and request identity.
- [x] Add replay resistance using bounded server time and atomic nonce tracking.
- [x] Add secret rotation with current and time-limited previous key support.

### User And Actor Context

- [x] Remove raw `x-user-id` fallback from trusted identity resolution.
- [x] Remove raw `x-user-role` fallback from trusted authorization.
- [x] Attach user context only after verified JWT processing; keep S2S identity separate.
- [x] Keep current actor, owner, target, and service identities separate; reserve tenant, site, and app as distinct future context.
- [x] Reject caller-supplied owner IDs when ownership must come from context.
- [x] Standardize trusted context carriers and user shape across HTTP and gRPC.

### Authorization And Tokens

- [x] Require admin authorization for gRPC order-status changes.
- [x] Verify HTTP/gRPC role parity for every service.
- [x] Ensure public routes cannot bypass internal-only requirements.
- [x] Add resource-level authorization after route-level role checks.
- [x] Centralize token-version validation.
- [x] Define refresh-token replay handling.
- [x] Invalidate affected sessions after confirmed refresh replay.
- [x] Define multi-device refresh-session families for web and mobile clients.
- [x] Test current-session logout and all-device invalidation.
- [x] Redact authentication and security logs.

### Security Tests

- [x] Unsigned gRPC calls fail through the shared guard installed by every internal service.
- [x] Forged user metadata fails without verified context.
- [x] Forged role metadata cannot elevate permissions.
- [x] Non-admin order status updates fail.
- [x] Gateway-only endpoints reject ordinary service signatures.
- [x] Expired/replayed S2S requests fail.
- [x] Refresh replay behavior is deterministic.
- [x] Protected/strict media cannot be reached through public routes.
- [x] Live Docker auth session lifecycle smoke test passes.

### F1 Exit Gate

- [x] No service trusts raw caller identity.
- [x] Every protected internal route verifies service identity.
- [x] HTTP and gRPC produce equivalent authorization decisions.
- [x] Focused security denial tests pass locally with reproducible commands.

---

## F2 — Code Quality And Reproducibility

### Formatting, Lint, Types, And Contracts

- [x] Make CI run focused security unit suites without depending on live service containers; keep live e2e verification in a separately provisioned job. Local and CI use `pnpm test:security`; live tests use the separate provisioned `pnpm test:e2e` job.
- [x] Format `packages/grpc-auth`.
- [x] Rerun full lint and expose failures hidden by the first failed package.
- [x] Fix web TypeScript/React lint errors.
- [x] Make lint pass in every workspace.
- [x] Add meaningful `check-types` scripts to every workspace.
- [x] Make workspace type checking pass.
- [x] Correct malformed source comments when encountered.
- [x] Export generated order contracts from `@nebula/protos`.
- [x] Use generated/shared contract types where available.
- [x] Remove unnecessary local proto-type duplicates.
- [x] Make proto checks ignore unrelated working-tree changes.
- [x] Define backward-compatible API/proto versioning rules.

### Standard Service Bootstrap

- [x] Replace product/blog initializer `x-user-id` metadata with an explicit service-only settings bootstrap contract; never create a fake human actor.
- [x] Verify the product initializer end-to-end and decide whether to register the currently unwired blog initializer.
- [x] Standardize validation pipes.
- [x] Standardize CORS configuration.
- [x] Standardize security headers.
- [x] Standardize HTTP/gRPC error translation.
- [x] Standardize health, readiness, and shutdown behavior.
- [x] Standardize environment validation.
- [x] Standardize logging bootstrap; auth request bodies are already fully excluded from logs.
- [x] Remove service-specific guard/bootstrap drift.

### Database And Migrations

- [x] Remove the legacy user refresh-token storage path coherently: delete the unused auth gRPC wrapper, `SetRefreshToken` proto/user-service contract, response fields, tests, and `User.refreshToken` column through a migration.
- [x] Add root commands for every Prisma-backed service.
- [x] Generate every Prisma client through one command.
- [x] Deploy every service migration through one command.
- [x] Define deterministic migration order.
- [x] Add migration status verification.
- [x] Add deterministic development/demo seed data.
- [x] Verify clean-database boot from migrations only.
- [x] Define backup and restore procedures.
- [x] Test migration failure and recovery policy.

### Docker And Local Runtime

- [x] Make Bake the official backend image build graph.
- [x] Exclude documentation, audits, tests, reports, and local env files from the backend Docker context.
- [x] Replace broad source copies with explicit backend service/package inputs.
- [x] Persist pnpm and Turbo caches for normal builds.
- [x] Replace eight isolated `pnpm deploy` trees with one reusable production dependency layer.
- [x] Keep all eight service images independently runnable while sharing universal foundation layers.
- [x] Verify every image resolves its declared internal packages without another container or network access.
- [ ] Add gateway/web/admin runtimes to the complete stack when available.
- [x] Add reliable healthchecks for infrastructure and services.
- [x] Make services wait for readiness rather than process start.
- [x] Run migrations before accepting traffic.
- [x] Confirm ports and `.env.example` files agree.
- [x] Remove stale Docker-profile documentation.
- [x] Provide one-command boot, seed, health, and shutdown workflows.
- [ ] Verify the complete stack from a clean checkout.

### CI

- [ ] Verify formatting, lint, types, protos, tests, and builds.
- [ ] Start required databases and storage.
- [ ] Run migrations and seeds.
- [ ] Run integration/e2e tests.
- [ ] Build container images.
- [ ] Verify Compose configuration.
- [ ] Add dependency, image, and secret scanning.
- [ ] Preserve useful build/test artifacts.

### F2 Exit Gate

- [ ] Clean install, lint, type check, build, migrate, seed, and test pass.
- [ ] No manual database repair is required.
- [ ] Local and CI verification use the same commands.
- [ ] Verification leaves tracked source files clean.

---

## F3 — External API Gateway

### Gateway Boundary

- [ ] Create a dedicated gateway application.
- [ ] Expose versioned external routes under `/api/v1`.
- [ ] Keep internal service ports private.
- [ ] Route admin, storefront, mobile, and partner traffic through the gateway.
- [ ] Authenticate calling application and user.
- [ ] Resolve trusted tenant, site, channel, and actor context.
- [ ] Sign forwarded internal context.
- [ ] Apply rate limits and request-size limits.
- [ ] Add request/trace IDs.
- [ ] Add gateway health and dependency readiness.

### API Standards

- [ ] Define success and error envelopes.
- [ ] Define validation-error shape.
- [ ] Define pagination, filtering, and sorting.
- [ ] Define idempotency for create, checkout, upload, and contract operations.
- [ ] Define retry-safe operations.
- [ ] Define API versioning and deprecation.
- [ ] Generate API documentation.
- [ ] Provide typed web/mobile clients.

### Client Types

- [ ] Define anonymous storefront clients.
- [ ] Define authenticated user clients.
- [ ] Define admin clients.
- [ ] Define registered mobile applications.
- [ ] Reserve partner credentials for future integrations.
- [ ] Ensure partner credentials never reuse S2S secrets.
- [ ] Define OAuth/API-key direction without implementing a partner marketplace.

### Current Integration Corrections

- [ ] Fix web refresh helper to use POST.
- [ ] Fix refresh-cookie rotation.
- [ ] Add product POST gateway/proxy route.
- [ ] Align product create payload with backend DTOs.
- [ ] Remove frontend assumptions about individual service URLs.

### F3 Exit Gate

- [ ] External clients need only the gateway URL.
- [ ] Internal services are not publicly reachable.
- [ ] Gateway context cannot be forged by an ordinary client.
- [ ] Typed clients and documentation match runtime behavior.

---

## F4 — Tenant, Site, Channel, And Application Foundation

### Ownership

- [ ] Decide service ownership for tenant, site, channel, membership, app registration, and entitlement records.
- [ ] Freeze tenant and site identifiers.
- [ ] Define site status lifecycle.
- [ ] Define web, Android, and iOS channels.
- [ ] Define app registration and package identity.
- [ ] Define parent/subordinate-ready relationships without commercial SaaS screens.

### Membership And Roles

- [ ] Separate identity/profile ownership from tenant/site membership.
- [ ] Define tenant-wide and site-specific roles.
- [ ] Define parent-management authorization context.
- [ ] Ensure role changes refresh active authorization.
- [ ] Audit cross-site and parent actions.

### Domain Scoping

- [ ] Add tenant/site ownership to products.
- [ ] Add tenant/site ownership to media.
- [ ] Add tenant/site ownership to blogs and pages.
- [ ] Add tenant/site ownership to settings.
- [ ] Add tenant/site ownership to orders and carts.
- [ ] Define taxonomy ownership/sharing.
- [ ] Add tenant/site-aware unique constraints and indexes.
- [ ] Scope caches, jobs, events, storage, and search documents.
- [ ] Prevent cross-site content/media references.

### Default Development Context

- [ ] Create one default tenant and site.
- [ ] Create web, Android, and iOS channel records.
- [ ] Seed platform admin, site admin, editor, and user memberships.
- [ ] Migrate existing data into the default site.
- [ ] Preserve current flows in tenant-aware single-site mode.

### Isolation Tests

- [ ] Cross-tenant reads and writes fail.
- [ ] Cross-site media attachment fails.
- [ ] Forged tenant/site context fails.
- [ ] Parent authority does not imply sibling access.
- [ ] Cache keys cannot leak data between sites.
- [ ] Background work retains authoritative tenant/site context.

### F4 Exit Gate

- [ ] All applicable data belongs to a verified tenant/site.
- [ ] One default tenant supports normal development.
- [ ] Adding another tenant does not require schema redesign.
- [ ] Isolation tests pass across transports, jobs, caches, and storage.

---

## F5 — Media Processing And CDN Foundation

### Upload Safety

- [ ] Bind upload authorization to tenant, site, actor, access class, MIME, and maximum size.
- [ ] Verify object size and metadata during finalize.
- [ ] Add MIME sniffing.
- [ ] Define checksum behavior.
- [ ] Preserve immutable upload facts.
- [ ] Reject unsafe or mismatched storage paths.
- [ ] Define abandoned-presign cleanup.

### Lifecycle Worker

- [ ] Implement a queue or reliable poller for `PENDING/QUEUED` media.
- [ ] Verify stored objects.
- [ ] Extract MIME, dimensions, duration, size, and checksum.
- [ ] Add malware-scanner interface.
- [ ] Promote valid media to `READY/CLEAN`.
- [ ] Block infected or invalid media.
- [ ] Add retry-safe failure state.
- [ ] Add retries and dead-letter handling.
- [ ] Make lifecycle work idempotent.

### Originals And Variants

- [ ] Model immutable originals.
- [ ] Model derived variants separately.
- [ ] Generate public web, thumbnail, and mobile variants.
- [ ] Version variant outputs.
- [ ] Record processor/source version.
- [ ] Prevent public rendering of raw originals.
- [ ] Regenerate variants without replacing originals.

### Content Integration

- [ ] Replace product thumbnail/gallery URLs with media IDs.
- [ ] Replace blog cover URLs with media IDs.
- [ ] Define page/settings media references.
- [ ] Define roles, ordering, alt text, captions, and channel overrides.
- [ ] Validate content/media site ownership.
- [ ] Keep semantic media usage in the owning content service.

### CDN Routes

- [ ] Freeze site-aware canonical media routes.
- [ ] Include immutable variant/version identity in cacheable URLs.
- [ ] Keep media-service as CDN origin authority.
- [ ] Define cache-control and ETag behavior.
- [ ] Define replacement, invalidation, deletion, and revocation.
- [ ] Define public-media CORS.
- [ ] Define signed protected/strict delivery.
- [ ] Prevent CDN bypass of site, status, scan, or access policy.

### Consistency And Strict Media

- [ ] Add orphan-object cleanup.
- [ ] Add missing-object and DB/storage drift reconciliation.
- [ ] Define outbox/reconciliation for destructive operations.
- [ ] Add explicit folder records if empty folders remain required.
- [ ] Add worker-backed oversized deletion.
- [ ] Separate strict preview from full-original download and enforce default-deny strict download.
- [ ] Add durable strict-media audit records.
- [ ] Define provider versus app-level encryption.
- [ ] Define strict retention and secure deletion.

### Provider Boundary

- [ ] Define storage adapter interface.
- [ ] Keep MinIO implementation.
- [ ] Verify Supabase Storage S3 compatibility.
- [ ] Reserve AWS S3/CDN implementation.
- [ ] Add provider contract tests.

### F5 Exit Gate

- [ ] Upload becomes renderable without manual DB edits.
- [ ] Web, thumbnail, and mobile variants are generated.
- [ ] Content uses media IDs.
- [ ] CDN routes are stable, versioned, and site-aware.
- [ ] Orphans and drift are detectable and recoverable.
- [ ] Public/protected/strict denial tests pass.

---

## F6 — Modular Feature And Entitlement Foundation

### Core Boundary

- [ ] Define what exists in every installation.
- [ ] Define optional module boundaries.
- [ ] Keep premium code out of unrelated core schemas.
- [ ] Move 3D/showroom product fields behind a module contract.
- [ ] Avoid arbitrary runtime npm plugin loading.
- [ ] Keep shared packages limited to contracts, clients, context, configuration, errors, observability, tests, and module SDKs.

### Feature Catalog And Entitlements

- [ ] Define feature keys and versions.
- [ ] Define boolean, metered, allocated, and non-delegable capabilities.
- [ ] Define site/channel allocations.
- [ ] Define user-permission intersection.
- [ ] Define server-authoritative capability checks.
- [ ] Define signed app capability manifest.

### Module Manifest

- [ ] Define image digest and core-version compatibility.
- [ ] Define HTTP/gRPC contracts and migrations.
- [ ] Define health/readiness contract.
- [ ] Define service account and network needs.
- [ ] Define CPU, memory, storage, and GPU requirements.
- [ ] Define feature limits.
- [ ] Define rollback, uninstall, and retention policy.
- [ ] Define shared, dedicated, and edge-worker modes.

### License Foundation

- [ ] Define signed deployment-bound entitlement manifests.
- [ ] Use server-authoritative time.
- [ ] Define `ACTIVE -> EXPIRING -> GRACE -> SUSPENDED -> TERMINATED`.
- [ ] Define one-month grace period and warning schedule.
- [ ] Define read/export behavior after suspension.
- [ ] Separate emergency revocation from normal expiry.
- [ ] Define contract/version/change identifiers.
- [ ] Never use a client-visible boolean as license authority.

### Proof Module

- [ ] Build one small independent backend module.
- [ ] Give it a separate container and health endpoint.
- [ ] Register it through the feature catalog.
- [ ] Protect it through gateway and entitlement checks.
- [ ] Add a matching optional web/mobile capability.
- [ ] Enable and disable it without editing core domain code.
- [ ] Test install, migration, rollback, and removal.

### F6 Exit Gate

- [ ] One module operates outside core.
- [ ] Module deployment and tenant entitlement are separate.
- [ ] Disabling the module cannot corrupt core data.
- [ ] Future premium features have a proven pattern.

---

## F7 — Web And Admin Foundation

### Application Split

- Admin implementation is postponed until the Vite-based admin project/template is ready; current `apps/web` does not gate backend-only stabilization work.
- [ ] Freeze `apps/storefront` as public Next.js.
- [ ] Freeze `apps/admin` as Vite React admin.
- [ ] Decide how current `apps/web` code is reused or migrated.
- [ ] Share only appropriate UI primitives and typed clients.
- [ ] Prevent frontend templates from defining backend contracts.

### Shared Frontend

- [ ] Typed gateway client.
- [ ] Authentication and refresh handling.
- [ ] Tenant/site/channel context.
- [ ] Capability manifest handling.
- [ ] Consistent loading, empty, denied, expired, offline, and error states.
- [ ] Localization, RTL, accessibility, and theme-token foundations.
- [ ] Frontend unit and integration test setup.

### Admin Shell

- [ ] Login/logout/refresh and protected routes.
- [ ] Role-aware and capability-aware navigation.
- [ ] Site context display.
- [ ] Media picker shell.
- [ ] Reusable list, form, filter, and pagination components.
- [ ] Parent-management context banner.
- [ ] Safe error boundaries.

### Storefront Shell

- [ ] Site/domain resolution.
- [ ] Site identity and theme loading.
- [ ] Public API client.
- [ ] SEO/canonical/robots foundation.
- [ ] CDN media component.
- [ ] Product-list and product-detail skeleton.
- [ ] Error and not-found behavior.

### F7 Exit Gate

- [ ] Admin and storefront are separate deployable applications.
- [ ] Both use gateway and shared context contracts.
- [ ] Neither depends on Prisma or internal service URLs.
- [ ] Frontend tests run in CI.

---

## F8 — React Native Foundation

### Project And Build

- [ ] Create private React Native/Expo workspace.
- [ ] Define Android/iOS identities and build profiles.
- [ ] Keep signing credentials outside source control.
- [ ] Add Android build verification.
- [ ] Add controlled macOS/iOS build verification.
- [ ] Define release and runtime-version policy.

### Site Dependency

- [ ] Register each app to one owning site.
- [ ] Resolve site from verified app registration.
- [ ] Prevent arbitrary site selection.
- [ ] Load site branding, locale, theme, and navigation.
- [ ] Load signed capability manifest.
- [ ] Apply site contract and channel restrictions.

### App Runtime

- [ ] Authentication, refresh, and secure token storage.
- [ ] Typed gateway client and request IDs.
- [ ] Navigation and route protection.
- [ ] Public and authenticated sessions.
- [ ] Cache/offline boundaries.
- [ ] Update/version compatibility.
- [ ] Push-registration and deep-link foundations.

### Mobile Modules And Media

- [ ] Define mobile core and optional feature packages.
- [ ] Entitlement-lock included small features.
- [ ] Rebuild for physically absent native features.
- [ ] Require backend enforcement for protected operations.
- [ ] Keep S2S, registry, storage, and signing secrets out of the app.
- [ ] Use site-aware mobile CDN variants.
- [ ] Respect public/protected/strict policy.
- [ ] Define cache expiry and invalidation.

### F8 Exit Gate

- [ ] Signed app resolves its owning site.
- [ ] Login and refresh work.
- [ ] Site configuration and capabilities load.
- [ ] Public mobile media renders through CDN routes.
- [ ] Disabled capabilities remain unusable through APIs.
- [ ] Android/iOS builds are reproducible.

---

## F9 — Kubernetes, Delivery, And Operations Foundation

### Kubernetes

- [ ] Create core and optional-module Helm chart patterns.
- [ ] Define namespaces, service accounts, and default-deny network policies.
- [ ] Define resources, quotas, probes, migration jobs, and persistent storage.
- [ ] Define GPU/node-selection pattern.

### Images And Secrets

- [ ] Create private registry policy.
- [ ] Pin production images by digest.
- [ ] Define image signing and verification.
- [ ] Restrict pull credentials.
- [ ] Generate SBOMs and scan images.
- [ ] Keep secrets outside images.
- [ ] Define Kubernetes Secret encryption/KMS and rotation.
- [ ] Prevent modules from receiving unrelated secrets.

### Networking And Delivery

- [ ] Expose only gateway and approved media/CDN origins.
- [ ] Keep internal gRPC private.
- [ ] Define ingress, TLS, DNS, and domain mapping.
- [ ] Define CDN origin/cache behavior.
- [ ] Define internal/external storage endpoints.
- [ ] Define sensitive-workload egress restrictions.

### Observability And Reliability

- [ ] Add structured logs and trace propagation.
- [ ] Add safe service, tenant, site, actor, and module labels.
- [ ] Add metrics, dashboards, and alerts.
- [ ] Test database and media recovery.
- [ ] Test deployment rollback and migration failure recovery.
- [ ] Add worker retry/dead-letter monitoring.
- [ ] Add graceful shutdown and draining.
- [ ] Add basic load/noisy-neighbor tests.
- [ ] Create staging and disaster-recovery runbooks.

### F9 Exit Gate

- [ ] Core runs in reproducible Kubernetes.
- [ ] Proof module deploys separately.
- [ ] Only approved routes are externally reachable.
- [ ] Backups, rollback, probes, monitoring, and alerts are verified.
- [ ] Clients have no cluster, node, registry, or internal-service access.

---

# FOUNDATION DEFINITION OF DONE

Foundation is complete only when this flow works:

```text
create and seed tenant/site/channels
→ authenticate through gateway
→ propagate verified actor/tenant/site/app/service/request context
→ reject forged and cross-tenant access
→ upload public/protected/strict media
→ scan and promote media
→ generate web/thumbnail/mobile variants
→ serve approved media through site-aware CDN routes
→ load configuration and capabilities in web/admin/mobile
→ enable and disable a proof module
→ pass CI, Docker, Kubernetes, backup, rollback, and smoke checks
```

- [ ] All F0-F9 exit gates pass.
- [ ] Documentation separates implemented and planned behavior.
- [ ] No advanced feature work began before this gate.

---

# COMMERCE DEMO

## D1 — Commerce Domain

- [ ] Finalize site-scoped product model.
- [ ] Remove premium 3D/showroom fields from core product ownership.
- [ ] Support draft, active, and archived products.
- [ ] Support title, slug, excerpt, description, SKU, price, and currency.
- [ ] Support category, tag, and brand taxonomy.
- [ ] Support thumbnail/gallery through media IDs.
- [ ] Support basic stock and availability.
- [ ] Ensure HTTP/gRPC parity.
- [ ] Add site-scoped product tests.

## D2 — Cart And Order

- [ ] Site-scoped cart and items.
- [ ] Snapshot product identity, price, and currency into order items.
- [ ] Basic checkout without production payment.
- [ ] User and admin order list/detail.
- [ ] Admin-authorized status changes.
- [ ] Idempotent checkout.
- [ ] Integration tests.

## D3 — Admin Demo

- [ ] Authenticate admin.
- [ ] List, create, edit, publish, and filter products.
- [ ] Select taxonomy.
- [ ] Upload/select site-owned media.
- [ ] Set price and stock.
- [ ] View and update orders.
- [ ] Display site and capability context.

## D4 — Storefront Demo

- [ ] Resolve site/domain.
- [ ] Product listing and detail.
- [ ] CDN media rendering.
- [ ] Basic SEO metadata.
- [ ] Login/register, cart, checkout, and confirmation.

## D5 — Mobile Demo

- [ ] Resolve owning site.
- [ ] Load theme and capabilities.
- [ ] Login/register/refresh.
- [ ] Product listing/detail and mobile media.
- [ ] Cart, checkout, and order history.
- [ ] Capability denial behavior.

## Commerce Demo Exit Gate

```text
admin uploads media
→ media becomes READY/CLEAN
→ admin creates and publishes product
→ storefront and mobile display product
→ user adds product to cart and checks out
→ admin views and updates order
```

- [ ] Entire flow is tenant/site scoped.
- [ ] Entire flow uses gateway APIs.
- [ ] Media uses IDs and CDN routes.
- [ ] Web and mobile use the same contracts.
- [ ] CI/staging smoke tests cover the flow.
- [ ] Demo resets and reseeds reliably.

---

# ADVANCED FEATURE MODULES

Implement only after the foundation and commerce demo pass.

## M1 — Commerce Expansion

- [ ] Payment abstraction, confirmation, refunds, and reconciliation.
- [ ] Variable products and variants.
- [ ] Discount campaigns.
- [ ] Advanced inventory and backorders.
- [ ] Shipping, downloads, invoices, and previews.

## M2 — Blog, CMS, And Composition

- [ ] Complete blog publishing and resolve taxonomy duplication.
- [ ] Blog media IDs and SEO.
- [ ] Custom pages and menu builder.
- [ ] Theme tokens and versioned block registry.
- [ ] Draft/preview/publish.
- [ ] Web/mobile renderer capabilities and fallbacks.
- [ ] Accessibility, RTL, sanitization, and performance tests.

## M3 — Advanced Media

- [ ] Rich variants and non-destructive editing.
- [ ] Watermarked previews.
- [ ] Video metadata and thumbnails.
- [ ] Asset bundles.
- [ ] Advanced provider adapters.
- [ ] Strict encryption/audit.
- [ ] Automated CDN invalidation.

## M4 — Streaming And Realtime

- [ ] Streaming module and ingest authorization.
- [ ] Transcoding, HLS/DASH, playback tokens, and recordings.
- [ ] Viewer limits and classroom/session model.
- [ ] Realtime presence/messaging.
- [ ] Shared and dedicated GPU modes.

## M5 — 3D Showroom

- [ ] Showroom module outside product core.
- [ ] GLB/GLTF/USDZ bundles and validation.
- [ ] Texture/geometry optimization and LODs.
- [ ] Scene manifests and product bindings.
- [ ] Web/native renderers.
- [ ] Worker/GPU deployment and access policy.

## M6 — State, Search, Events, And Workers

- [ ] Transactional outbox and versioned event contracts.
- [ ] Queue retry/dead-letter policy.
- [ ] Tenant-scoped state/cache/search.
- [ ] Worker scheduling, monitoring, and reconciliation.
- [ ] Avoid event-driven rewrites without concrete consumers.

## M7 — AI And Analytics

- [ ] Tenant-scoped analytics events.
- [ ] Recommendations, tagging, search enrichment, and insights.
- [ ] Model/version audit and privacy/retention policy.
- [ ] Use Python only for concrete ML/data workflows.

## M8 — Extended Mobile

- [ ] Offline catalog/cart rules.
- [ ] Push, deep links, and background sync.
- [ ] Streaming and 3D modules.
- [ ] App-specific content overrides.
- [ ] Parent-managed configuration.
- [ ] Store-release and compatibility automation.

---

# FULL MULTI-TENANT SAAS PRODUCTIZATION

Begin only after the platform and major feature modules are proven.

## S1 — Plans, Pricing, And Contracts

- [ ] Versioned commercial catalog, plans, pricing, contracts, limits, and billing.
- [ ] Upgrade/downgrade change orders, impact reports, acknowledgement, and effective dates.
- [ ] One-month grace, suspension, termination, retention, and deletion.

## S2 — Parent And Subordinate Product

- [ ] Require complete suite for parent/reseller eligibility.
- [ ] Provision and manage subordinate tenants/sites.
- [ ] Add parent dashboard, monitoring, package assignment, and usage.
- [ ] Preserve sibling isolation.
- [ ] Require a subordinate's own full contract before parent upgrade.

## S3 — White-Label Delivery

- [ ] Custom domains, DNS/TLS, branding, and themes.
- [ ] Website deployment pipeline.
- [ ] Private Android/iOS build and store workflow.
- [ ] Capability-aware app packages and version upgrades.

## S4 — Licensed Module Operations

- [ ] Signed leases, renewals, cached grace, and warnings.
- [ ] Shared and dedicated enforcement.
- [ ] Scale dedicated modules to zero after suspension where applicable.
- [ ] Module health/digest reporting.
- [ ] Audited activation, deployment, and removal.
- [ ] Add Kubernetes Operator only after manual lifecycle is proven.

## S5 — Production Scale And Compliance

- [ ] Usage accounting and noisy-neighbor controls.
- [ ] Dedicated database/storage options.
- [ ] Regional deployment and high availability.
- [ ] Disaster recovery and incident response.
- [ ] Security review and penetration testing.
- [ ] Privacy/export/deletion workflows.
- [ ] SLA, support, capacity, and cost reporting.

---

# Documentation Maintenance

- [ ] Keep `docs/current-focus.md` limited to one active slice.
- [ ] Keep `TODO.md` milestone-oriented.
- [ ] Move detailed feature specifications into dedicated documents.
- [ ] Keep architecture documents focused on stable boundaries.
- [ ] Keep audit reports immutable and historical.
- [ ] Mark obsolete reports as superseded.
- [ ] Correct README roadmap claims after verified milestones.
- [ ] Never mark a phase complete merely because code exists; verify its exit gate.

# Current Next Action

1. F1 Security And Trust Integrity is complete; preserve its contracts.
2. Continue F2 with deterministic verification, lint/types, contracts, bootstrap, migrations, and runtime consistency.
3. Do not begin gateway or new feature work before the F2 exit gate.
