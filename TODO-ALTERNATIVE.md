# TODO Alternative: NebulaNV Product And AI Roadmap

Status: adopted after F3 closure on 2026-08-24 and rebaselined to the
demo-first order on 2026-09-14. `TODO.md` remains the original roadmap and safe
comparison; this file owns the selected future phase order.

Created: 2026-08-22

## Purpose

Build one complete, demonstrable NebulaNV product before expanding into the
selected content, media, worker, 3D, and AI capabilities that strengthen its
portfolio and product story.

The 2026-09-14 rebaseline prioritizes a usable product before completing the
remaining speculative platform foundation. It preserves completed F4 R0-R5 as
a dormant checkpoint, builds the web commerce demonstration against the
existing default-realm/single-site boundary, and returns to the remaining
tenant implementation after cloud deployment has supplied concrete operational
requirements.

The selected growth path retains M2 Blog, CMS, And Composition; narrows M3 to
M3S compatibility and demonstrated advanced-media needs; gives M5 only the
bounded processing/jobs it actually needs; and defers the generalized M6 State,
Search, Events, And Workers platform. M1, M4, M8, the non-selected parts of M3,
and full commercial SaaS productization also remain deferred.

The repository-aware engineering agent is a separate, non-gating track. It may
start before the product AI phase, but it is not tenant-facing product AI and
must not become an authority over source, infrastructure, identity, or release
decisions.

## Success Definition

The active roadmap ends with a product that can demonstrate all of the
following coherently:

```text
gateway-only external access
-> working admin and storefront commerce flow in explicit single-site mode
-> governed media and content lifecycle
-> bounded web showroom and storage-compatible advanced media
-> mobile commerce flow and evidence-backed module boundary
-> permission-checked AI/RAG and evaluated analytics in default-site mode
-> reproducible cloud deployment and recovery evidence
-> completed tenant/realm isolation and multi-tenant migration evidence
```

The intermediate demo releases are portfolio-grade single-site products. They
are not claims of tenant isolation, production payment processing, streaming,
full offline mobile behavior, or commercial SaaS operations. The multi-tenant
claim becomes available only after resumed F4 exits.

## Roadmap Authority And Evidence Rules

- `TODO.md` remains the original roadmap and safe comparison. Its historical
  order and scope must not be rewritten to match this roadmap; verified
  completion checkboxes may still reflect work completed before the handoff.
- `docs/current-focus.md` remains the detailed execution checklist for the one
  active slice. This file must not duplicate its batch-level detail.
- A checked item means implementation, tests, configuration, and applicable
  documentation agree. Code existence alone is insufficient.
- Planned behavior must never be presented as implemented behavior.
- Every new finding must be classified as a confirmed defect, stale
  implementation/documentation, optional hardening, or future scaling
  consideration.
- Optional hardening and deferred breadth do not block a phase unless a later
  evidence-backed decision promotes them into the phase contract.
- Architecture, security, cloud, and AI-provider decisions that may change over
  time must be rechecked against current authoritative guidance at the start of
  their implementation phase.
- Detailed feature specifications belong in dedicated documents. This roadmap
  owns order, scope, dependencies, and exit evidence.

## Sources Of Truth

Repository sources:

- Current execution: `docs/current-focus.md`
- Original roadmap: `TODO.md`
- Collaboration and safety context: `AGENTS.md` and `AI_CONTEXT.md`
- Technical audit: `docs/audit/NebulaNV-technical-audit-2026-07-08.md`
- Platform target: `docs/architecture/tenant-package-channel-platform.md`
- Service boundaries: `docs/architecture/system-relationships.md`
- Contract rules: `docs/architecture/contracts-and-boundaries.md`
- Actor context: `docs/architecture/actor-context-contract.md`
- S2S contract: `docs/architecture/s2s-security-contract.md`
- Media contract: `docs/services/media-service.md`
- Composition target: `docs/frontend/block-and-theme-system.md`

AI/cloud guidance to recheck when the applicable phase starts:

- [NIST AI RMF Generative AI Profile](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence)
- [OWASP GenAI/LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [Kubernetes multi-tenancy guidance](https://kubernetes.io/docs/concepts/security/multi-tenancy/)
- [AWS secure multi-tenant RAG architecture](https://aws.amazon.com/blogs/architecture/secure-multi-tenant-rag-with-amazon-bedrock-and-verified-permissions/)
- [Azure secure multi-tenant RAG architecture](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/secure-multitenant-rag)
- [Azure agentic RAG architecture](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/rag/rag-agentic)

## Non-Negotiable Rules

- External clients call one public gateway and never internal services.
- Internal service calls require verified S2S identity.
- Raw actor, role, tenant, site, channel, app, service, entitlement, or model
  metadata is never trusted identity or authority.
- Before resumed F4, every new record keeps a stable service owner and any
  current default-site compatibility reference the implemented workflow needs.
  F4 inventories, backfills, and enforces authoritative tenant/site scope before
  multi-tenant activation.
- Current actor/application and document authorization is applied before
  retrieval. After F4, tenant/site authorization is also applied before results
  can mix; filtering an already mixed result set is never an isolation boundary.
- Each service owns its database and domain. AI, analytics, search, and workers
  do not become shadow transactional authorities.
- Cross-service access uses versioned HTTP/gRPC contracts or explicitly
  versioned events; no service or AI tool reads another service's database.
- Media-service owns media policy. Object storage, CDN, processors, AI models,
  and 3D workers own neither privacy nor content authorization.
- Frontends and mobile applications do not own identity, entitlement, tenant,
  media, AI-tool, or license policy.
- Retrieved content, user prompts, model output, tool output, and stored logs
  are all untrusted input at their next boundary.
- AI-generated output cannot directly authorize an action. Tools independently
  enforce the currently verified actor/application, capability, resource, and
  operation, plus tenant/site/entitlement after those authorities are active.
- Consequential writes require explicit product policy, idempotency, audit, and
  human confirmation unless a separately reviewed contract proves otherwise.
- Optional heavy implementations remain separable where an implemented failure,
  deployment, or dependency boundary justifies it; core schemas do not absorb
  unrelated premium implementation fields.
- No arbitrary runtime plugin loading, arbitrary agent shell/database access,
  or customer-controlled executable code.
- Every migration, deployment, contract change, model/index change, agent tool
  call, and parent action is traceable at the appropriate boundary.
- Development logs, prompts, traces, and evaluation artifacts must exclude
  secrets and use explicit retention. They are not automatically training data.

## Explicit Scope Decisions

Decision record:
[2026-09-14 Demo-First Roadmap Rebaseline](docs/reports/2026-09-14-demo-first-roadmap-rebaseline.md).

Committed active path:

1. Preserve completed F0-F3 and their regression gates.
2. Preserve completed F4 R0-R5 and pause F4 at the audited dormant boundary.
3. Execute `F7 -> D1 -> D2 -> D3 -> D4` and close the working web commerce
   demo checkpoint.
4. Execute `M2 -> F5 -> M5 -> M3S` with only consumer-driven media, storage,
   and worker compatibility.
5. Execute `F8 -> F6 -> D5` and close the full commerce portfolio release.
6. Execute `AI0 -> M7` against the proven default-site product without making
   a tenant-isolation claim.
7. Execute F9 cloud and operations work from the actual application/runtime
   shape, then revisit M3S provider policy from that cloud evidence.
8. Resume F4 at R6.1 and complete the remaining realm, tenant, domain-scope,
   migration, and isolation gates.

Deferred, not deleted:

- M1 production payments, refunds, advanced inventory, shipping, and related
  commerce expansion;
- M3 general-purpose editing and video-specific processing not required by the
  selected product;
- M4 streaming, transcoding, realtime presence/messaging, and classroom model;
- M8 broad offline, push, deep-link, and store-automation expansion beyond the
  F8/D5/M5 mobile contract;
- M6 generalized state, search, event, and worker infrastructure until multiple
  completed consumers prove a shared platform is smaller than bounded local
  implementations;
- S1-S5 commercial plans, reseller productization, white-label delivery,
  licensed-module operations at scale, and compliance-scale operations.

### Original Roadmap Disposition

| Original scope | Alternative disposition                                                      |
| -------------- | ---------------------------------------------------------------------------- |
| F0-F2          | Completed mechanisms preserved; regression gates remain active               |
| F3             | Complete; exit proof preserved and regression gates remain active            |
| F4             | R0-R5 preserved; R6.1 onward resumes after F9                                |
| F5             | Retained after M2 with current-provider compatibility and bounded media jobs |
| F6             | Moved after F8 so the module contract follows proven web/mobile consumers    |
| F7             | Next active phase; establishes the admin/storefront product shells           |
| F8             | Moved after the web showroom/media sequence and before F6/D5                 |
| F9             | Moved before resumed F4; supplies actual cloud/storage operating evidence    |
| D1-D4          | Moved immediately after F7; closes a working web commerce demo checkpoint    |
| D5             | Retained after F8/F6; closes the full commerce portfolio release             |
| M1             | Deferred until real merchant/payment scope exists                            |
| M2             | Moved after the working web commerce checkpoint                              |
| M3             | Narrowed to M3S; storage remains a compatibility feature until cloud proof   |
| M4             | Deferred in full                                                             |
| M5             | Retained as a bounded web-first showroom using only proven processing needs  |
| M6             | General platform deferred; owning phases may add bounded local jobs/adapters |
| M7             | Retained after AI0, before cloud and resumed tenant implementation           |
| M8             | Deferred; required F8/D5 mobile core and M5 mobile 3D remain committed       |
| S1-S5          | Deferred while F4/F6/F9 remain productization-ready                          |

## Dependency And Release Map

```text
EA0 Repository Agent Lab (parallel, read-only first, non-gating)

F0-F2 complete
-> F3 gateway
-> F4 R0-R5 dormant checkpoint (complete and audited)
-> F7 web/admin shells
-> D1-D4 web commerce vertical
-> Working Web Commerce Demo / Release P0
-> M2 content/composition
-> F5 bounded media lifecycle/CDN
-> M5 bounded web-first 3D showroom
-> M3S media/storage compatibility
-> F8 mobile foundation
-> F6 evidence-backed modules/entitlements
-> D5 mobile commerce
-> Commerce Portfolio Release P1
-> AI0 product AI/RAG foundation
-> M7 evaluated AI/analytics
-> F9 cloud/Kubernetes operations and primary-provider proof
-> resume F4 at R6.1 and complete tenant/realm isolation
-> Multi-Tenant Foundation Release P2
```

Release definitions:

- **P0 Working Web Commerce Demo:** F7 and D1-D4 pass against the preserved F3
  gateway and current default-realm/single-site backend. Checkout remains a
  clearly labeled demo without real payment collection.
- **P1 Commerce Portfolio Product:** M2, F5, M5, M3S, F8, F6, and D5 pass on top
  of P0. It includes content, governed media, a bounded showroom, and mobile,
  but still makes no multi-tenant claim.
- **P2 Multi-Tenant Foundation:** AI0, M7, F9, and the resumed F4 exit pass.
  Only this release may claim tenant/realm isolation. General M6 and commercial
  SaaS breadth remain separate future work.

The phase specifications below are physically arranged in execution order.
Completed checkpoints appear first, the active demo-first sequence follows, and
parallel or deferred work is kept after the active sequence.

## Phase Entry Gates

| Phase | May start implementation when                                            | Unlocks                                    |
| ----- | ------------------------------------------------------------------------ | ------------------------------------------ |
| EA0   | Any timeboxed window that does not delay the active product phase        | Internal retrieval/agent learning only     |
| F3    | F2 remains green                                                         | One controlled external boundary           |
| F4    | F9 and all earlier active phases pass; resume from audited R5 checkpoint | Tenant/realm isolation and scoped domains  |
| F5    | M2 supplies concrete media consumers; current media policy remains green | Governed bounded media lifecycle           |
| F6    | F8 and M5 expose concrete capability/module needs                        | Evidence-backed independent module pattern |
| F7    | F3 gateway/client contracts remain green                                 | Independent admin/storefront shells        |
| F8    | M3S and M5 define proven media/showroom needs                            | Default-site mobile core                   |
| F9    | Web/mobile/media/AI runtime shapes are implemented and measurable        | Primary-cloud operating evidence           |
| D1    | F7 shells and current single-site gateway contracts pass                 | Default-site demo catalog                  |
| D2    | D1 product invariants are stable                                         | Demo cart/order flow                       |
| D3-D4 | D1/D2 operations and F7 shells exist                                     | P0 working web commerce demo               |
| M2    | P0 supplies real admin/storefront content consumers                      | Governed CMS/composition corpus            |
| M5    | F5 baseline assets and the storefront/admin consumers pass               | Bounded web-first showroom                 |
| M3S   | F5 and M5 reveal exact compatibility needs                               | Portable media/storage seams               |
| D5    | F8, F6, and D1/D2 contracts pass                                         | P1 mobile commerce                         |
| AI0   | P1 is stable and default-site authorization is explicit                  | Bounded product RAG and read-only agency   |
| M7    | AI0 plus implemented product/content/showroom data is available          | Evaluated default-site intelligence        |
| M6    | Deferred until multiple measured consumers justify a shared platform     | Future generalized infrastructure          |

Architecture/discovery spikes may occur before an entry gate only when they are
timeboxed, non-production, and needed to remove a decision blocker. A spike may
not silently create public contracts, migrations, shadow data authority, or a
second runtime pattern that the owning phase must later inherit.

## Demo-First Compatibility Contract

Until resumed F4 exits, every active phase operates in the existing
default-realm/single-site mode:

- The configured default tenant/site/application values are compatibility
  context. They do not prove general tenant isolation.
- New product work uses service-owned records and versioned gateway contracts.
  It does not activate dormant Realm Auth, context v3, Tenant Authority reads,
  or a second tenant as a side effect.
- Add a future-scope field only when the current feature needs it or an existing
  verified contract already requires it. Do not build speculative tenant,
  provider, event, worker, or storage structures merely to anticipate F4/F9.
- Keep stable identifiers and migration inventories so resumed F4 can backfill
  and enforce authoritative scope without rewriting product behavior.
- Every pre-F4 release and runbook must identify itself as
  default-site/single-realm. Cross-tenant and cross-license guarantees remain
  unavailable until F4 exits.
- Owning phases may implement a bounded queue, polling loop, index, or cache for
  a concrete consumer. They must not present it as the generalized M6 platform.

For storage specifically, M3S is a compatibility feature before F9. Media
service remains the policy authority; MinIO remains the local byte store; code
uses the narrow S3-compatible operations the current workflows require. M3S
does not choose a permanent provider topology, multi-cloud abstraction,
bucket/region layout, replication model, lifecycle regime, KMS design, or
provider migration system. F9 selects and proves the primary cloud. Only then
may an evidence-backed follow-up harden provider-specific storage structure.

## Scope Change Control

Before adding an active-roadmap item, record:

1. the concrete user, portfolio, security, or operational requirement;
2. the current mechanism and evidence-backed gap;
3. the owning phase and prerequisites;
4. the narrowest acceptance test and exit-gate impact;
5. compatibility, migration, maintenance, cloud, model, and data cost;
6. which existing item is removed/deferred if the addition expands the phase.

New work is not automatically required because it is popular, appears in a
framework, or could be useful later. Prefer one proven consumer before a shared
abstraction, one primary cloud before parity, one evaluated model path before a
provider matrix, and measured CPU demand before GPU infrastructure.

---

# COMPLETED CHECKPOINTS

## F0-F2 - Preserve Completed Foundations

F0 Media Policy, F1 Security And Trust Integrity, and F2 Code Quality And
Reproducibility remain complete under `TODO.md`. Do not reopen or replace their
mechanisms without a classified, evidence-backed defect.

- [x] Preserve the public/protected/strict media policy and its denial tests.
- [x] Preserve verified actor/S2S identity, replay protection, key separation,
      refresh-session behavior, and fail-closed authorization.
- [x] Preserve inventory-backed quality, migration, Docker, CI, scan, backup,
      restore, and tracked-cleanliness gates.
- Re-run applicable regression gates after every later cross-cutting phase.

## F3 - Completed External API Gateway

Detailed execution and final evidence remain in `docs/current-focus.md` and
`docs/reports/2026-08-22-f3-exit-proof.md`. F3 is complete.

### External Client And Current Web

- [x] Complete and stale-check the route-derived external OpenAPI artifact.
- [x] Generate a separate browser/React-Native-compatible TypeScript client
      without Node-only runtime dependencies.
- [x] Test the client in representative browser/Next and React Native build
      targets before changing consumers.
- [x] Route the current web/BFF through the gateway with registered public
      client and original host/origin context.
- [x] Correct refresh POST behavior while preserving refresh-cookie rotation.
- [x] Complete product create/update forwarding and the documented
      `content`-to-`description` boundary mapping.
- [x] Remove frontend assumptions about individual service URLs.

### Correlation, Documentation, And Proof

- [x] Complete end-to-end request/correlation ID behavior: new external ingress
      creates the ID; nested internal calls preserve it and re-sign context.
- [x] Preserve application, actor, route, idempotency, media, readiness, and
      release-boundary decisions in durable documentation.
- [x] Run focused package tests, external-client checks, backend lint/types,
      proto/OpenAPI stale checks, security tests, source build, rendered Compose
      validation, and tracked-diff review.
- [x] Run the final user-owned sequential image/live/e2e checkpoint against the
      current source and record evidence without committing secrets or bulky
      runtime artifacts.

### F3 Exit Gate

- [x] Admin, storefront, and mobile-compatible clients configure only the
      gateway base URL, apart from gateway-issued storage/CDN URLs.
- [x] Release clients cannot reach backend HTTP/gRPC ports.
- [x] Public identifiers resolve registered context but cannot claim trusted
      application, actor, tenant, site, or service identity.
- [x] Downstream services accept propagated context only after S2S verification
      and continue enforcing their own authorization.
- [x] Typed clients, OpenAPI, runtime behavior, and documentation agree.
- [x] The complete F3 quality/live proof passes from current source.

---

# RELEASE P0 - WORKING WEB COMMERCE

Execution order: `F7 -> D1 -> D2 -> D3 -> D4`.

## F7 - Web And Admin Foundation

Purpose: establish separate, tested storefront and admin applications that
consume the proven F3 gateway contracts and can host the commerce demo before
the remaining tenant, media, module, mobile, and cloud foundations are built.

### Application Split And Shared Frontend

- [ ] Freeze `apps/storefront` as the public Next.js application and retain
      Next.js for `apps/admin` from the current working compatibility source.
      Reconsider Vite only after measured runtime or maintenance evidence.
- [ ] Decide through a migration inventory how current `apps/web` code is
      reused, moved, or retired; do not maintain three accidental authorities.
- [ ] Share only UI primitives, intent-oriented schemas, theme tokens, and the
      external gateway client; never Prisma, internal gRPC, or service URLs.
- [ ] Standardize authentication/refresh, the current configured application
      context, request IDs, and error envelopes. Reserve no tenant or capability
      behavior that the active backend cannot yet prove.
- [ ] Define loading, empty, denied, expired, degraded, offline, and unexpected
      failure states.
- [ ] Establish localization, RTL, accessibility, theme-token, unit,
      integration, and browser-e2e foundations.

### Admin Shell

- [ ] Implement login/logout/refresh, protected routes, and safe error
      boundaries.
- [ ] Add navigation from the current verified Auth role and gateway routes.
      Keep future capability and parent-target seams non-authoritative and
      hidden until F6 and resumed F4 implement them.
- [ ] Build reusable list, form, filter, pagination, validation-error, and
      optimistic-concurrency patterns.
- [ ] Add a media picker against the current gateway/media contract without
      exposing provider credentials or assuming the later F5 lifecycle.

### Storefront Shell

- [ ] Resolve the configured storefront application/origin and load the current
      default-site theme/configuration.
- [ ] Use the public external client for product/content data.
- [ ] Establish SEO, canonical, robots, sitemap-input, error, and not-found
      behavior.
- [ ] Build the CDN media component and product list/detail skeleton.
- [ ] Define capability-based placeholders for later CMS/AI/3D features; do not
      ship fake implementations.

### F7 Exit Gate

- [ ] Admin and storefront build, test, and deploy independently.
- [ ] Both use only gateway and approved CDN/storage data-plane URLs.
- [ ] Neither owns backend contracts, tenant policy, Prisma, or internal service
      addresses.
- [ ] Authentication, configured application context, accessibility, RTL, and
      core failure states have CI coverage.

## D1 - Default-Site Commerce Domain

Purpose: provide the product/catalog authority used consistently by the current
default-site admin and storefront, then mobile, content, and later AI/3D work.
General tenant/site persistence and isolation remain resumed F4 work.

### Product Model And Lifecycle

- [ ] Finalize the current default-site product model without premium
      AI/showroom fields.
- [ ] Support draft, active, and archived lifecycle with explicit public/admin
      visibility rules.
- [ ] Support title, slug, excerpt, description, SKU, price, currency, basic
      stock, and availability with validated invariants.
- [ ] Preserve deterministic current global slug/SKU uniqueness and record the
      later F4 scoped-uniqueness migration requirement.
- [ ] Support category, tag, and brand through authoritative taxonomy contracts.
- [ ] Use validated current Media IDs for thumbnail/gallery roles, ordering, alt
      text, and channel overrides.
- [ ] Preserve authoritative public reads that cannot expose drafts, archived,
      or deleted records through query flags.

### Contracts And Evidence

- [ ] Complete gateway/HTTP/gRPC parity for the selected product operations.
- [ ] Keep external DTOs separate from service inputs, proto types, and Prisma.
- [ ] Add lifecycle, taxonomy, media-reference, concurrency, actor-policy, and
      denial tests. Record cross-site coverage as an F4 exit dependency.
- [ ] Add deterministic seed products that exercise active/draft/archived and
      media/taxonomy relationships.

### D1 Exit Gate

- [ ] Admin can manage default-site products while anonymous clients see only
      active public records.
- [ ] No route accepts a caller-selected tenant/site override; general
      cross-tenant isolation remains explicitly unclaimed until F4.
- [ ] Product core contains no showroom, recommendation, or premium-module
      implementation fields.

## D2 - Cart, Checkout, And Order

Purpose: demonstrate a coherent commerce transaction without pretending to
collect or reconcile production payment.

### Cart And Checkout

- [ ] Implement the current default-site cart and items with verified user
      ownership.
- [ ] Validate product lifecycle, availability, currency, price, and basic stock
      at the authoritative boundaries.
- [ ] Define quantity/update/remove behavior and deterministic totals.
- [ ] Implement idempotent checkout using the gateway contract and bounded
      replay behavior.
- [ ] Snapshot product identity, SKU, title, unit price, currency, and quantity
      into order items so later catalog edits do not rewrite orders.
- [ ] Clearly label checkout as demo/no-production-payment and never collect real
      payment credentials or fabricate a settled provider transaction.

### Orders

- [ ] Add user order list/detail restricted to the verified owner.
- [ ] Add admin order list/detail and retain admin-authorized status changes.
- [ ] Define permitted status transitions, concurrency behavior, and audit.
- [ ] Prevent client-supplied user, price, or status authority and accept no
      caller-selected tenant/site override.
- [ ] Add integration tests for repeat checkout, stale product state, ownership
      denial, admin policy, and failure rollback.

### D2 Exit Gate

- [ ] A user can create a cart and produce one durable idempotent demo order.
- [ ] Orders retain immutable commercial snapshots and correct user ownership.
- [ ] User/admin reads and status transitions enforce their distinct policies.
- [ ] The UI and documentation never imply production payment capability.

## D3 - Admin Product Flow

Purpose: provide the operator side of the working demonstration through the
real gateway and current Auth, media, taxonomy, product, and order contracts.

- [ ] Authenticate/refresh/logout an admin through the gateway.
- [ ] Display the configured default-site/application context without presenting
      it as user-selectable or multi-tenant authority.
- [ ] List, filter, create, edit, publish/archive, and inspect products.
- [ ] Select only taxonomy records exposed by the current gateway contract.
- [ ] Upload/select current Media records and assign semantic product roles;
      migrate to F5 lifecycle states when F5 begins.
- [ ] Set validated price, currency, stock, and availability.
- [ ] View orders and perform permitted status transitions.
- [ ] Handle validation, conflict, denied, expired-session, degraded dependency,
      empty, and unexpected-error states.
- [ ] Add frontend unit/integration/e2e coverage against the external client;
      do not mock away gateway envelope and policy behavior in all tests.

### D3 Exit Gate

- [ ] An authorized admin can publish a complete default-site product with
      taxonomy and current Media records without direct service/database/storage
      access.
- [ ] An insufficient-role actor is denied; wrong-site denial remains an F4
      exit requirement.
- [ ] Admin behavior survives refresh, conflict, and degraded-service cases.

## D4 - Storefront Product Flow

Purpose: prove anonymous discovery and authenticated commerce for the
configured default storefront without internal-service knowledge.

- [ ] Resolve the configured storefront from the F3 origin/application contract;
      expose no public tenant/site selector.
- [ ] Render product listing/detail with taxonomy, price/availability, and CDN
      media from public gateway contracts.
- [ ] Add basic SEO title/description, canonical, robots, structured-data, and
      media-sitemap inputs without leaking provider/private media URLs.
- [ ] Implement register/login/refresh/logout through the gateway/BFF contract.
- [ ] Implement cart, demo checkout, order confirmation, and authenticated order
      history/detail.
- [ ] Define not-found versus unavailable/archived behavior without exposing
      hidden product existence.
- [ ] Cover anonymous/authenticated, wrong-origin/application,
      insufficient-role, missing-media, degraded-service, and checkout-replay
      scenarios.

### D4 Exit Gate

- [ ] A storefront visitor can discover an active product, authenticate, check
      out, and inspect the resulting order through gateway APIs.
- [ ] Draft/archived products and non-public media remain hidden.
- [ ] Storefront has no internal service URL, Prisma, storage credential, or
      trusted-context construction.

### Working Web Commerce Demo - Release P0

- [ ] An admin can authenticate, create and publish a complete product, and
      manage the resulting demo order entirely through gateway APIs.
- [ ] A storefront visitor can browse the public catalog, authenticate, use the
      cart, complete idempotent demo checkout, and inspect order history.
- [ ] Product lifecycle, price snapshots, ownership, role denial, media access,
      gateway envelopes, refresh/logout, failure states, accessibility, and RTL
      pass focused and browser-level evidence.
- [ ] The demo can reset/reseed deterministic non-production data and records
      setup, accounts, limitations, and verification commands.
- [ ] The release is labeled default-site/single-realm and makes no tenant,
      entitlement, cloud, advanced-media, or mobile completion claim.

---

# RELEASE P1 - COMMERCE PORTFOLIO

Execution order: `M2 -> F5 -> M5 -> M3S -> F8 -> F6 -> D5`.

## M2 - Blog, CMS, And Composition

Purpose: add a governed content/composition system that produces useful
storefront/mobile experiences and an authoritative corpus for later search and
AI without turning the editor into arbitrary executable code.

### Blog And Content Ownership

- [ ] Complete default-site blog authoring/publishing and resolve taxonomy
      duplication through the current authoritative taxonomy contracts.
- [ ] Replace blog cover/content URLs with validated Media IDs and add SEO,
      locale, author/editor, lifecycle, and revision ownership.
- [ ] Add custom pages, navigation/menu ownership, and default storefront/admin
      placement.
- [ ] Define draft, preview, scheduled publish where required, publish, archive,
      restore, and immutable published revision behavior.
- [ ] Protect editor concurrency with optimistic versioning or an equally
      explicit conflict contract.
- [ ] Use short-lived/noindex preview access and prevent previews from exposing
      protected/strict content.

### Composition Schema And Registry

- [ ] Select one canonical JSON-compatible schema source for runtime validation,
      generated types, editor forms, renderer inputs, and migration tests.
- [ ] Define versioned pages, revisions, sections, slots, block instances,
      themes, layout presets, data bindings, and renderer-capability manifests.
- [ ] Build a curated block registry with schema version, migration, allowed
      slots, platform support, fallback, cost profile, and data dependencies.
- [ ] Store declarative allowlisted data bindings, not copied product/blog/media
      records or arbitrary queries.
- [ ] Keep checkout, auth, profile, order, payment, and other sensitive screens
      outside free-form composition.
- [ ] Prohibit arbitrary CSS/HTML/JavaScript and sanitize structured rich text,
      URLs, links, embeds, and external resources under explicit CSP rules.

### Web, Mobile, Cache, And Failure Behavior

- [ ] Build the first high-quality web block set around real product, taxonomy,
      blog, media, settings, and menu contracts.
- [ ] Add a minimal admin editor for approved blocks and safe properties.
- [ ] Render through the storefront with SSR where appropriate, intent-oriented
      layout, responsive media, and precise dependency tags.
- [ ] Record semantic native renderer and fallback requirements for F8; M2
      implements the web renderer first.
- [ ] Invalidate affected pages/blocks when product, media, settings, taxonomy,
      menu, theme, or content revisions change without flushing the entire site.
- [ ] Preserve last valid published content or block-level fallback when a
      migration, service, media reference, or renderer fails.

### Accessibility, RTL, Performance, And AI Hooks

- [ ] Enforce alt/decorative semantics, heading structure, link labels, carousel
      controls, contrast, reduced motion, and other selected accessibility rules
      before publishing.
- [ ] Test localization/RTL in schemas, themes, editor, web, and supported native
      renderers rather than applying direction only at the final DOM layer.
- [ ] Define publish-time and measured runtime budgets for client JavaScript,
      media weight, fonts, third-party scripts, and heavy blocks.
- [ ] Expose versioned, permission-aware published/draft content contracts for
      AI0 ingestion; AI indexing must not read the CMS database directly.
- [ ] Index only lifecycle/role-authorized revisions, remove superseded/deleted
      revisions, and preserve source citations.
- [ ] Keep AI suggestions as reviewed drafts; models cannot publish content.

### M2 Exit Gate

- [ ] Admin can author, preview, publish, restore, and audit a default-site page
      and blog content through curated schemas.
- [ ] Storefront renders the semantic content, and the F8 native handoff records
      declared platform fallbacks.
- [ ] Old published block versions migrate or continue rendering safely.
- [ ] Sanitization, accessibility, RTL, cache invalidation, concurrency,
      fallback, and performance-budget tests pass.
- [ ] AI retrieval respects revision lifecycle and current role/application
      permissions.

## F5 - Media Processing And CDN Foundation

Purpose: turn the existing upload/finalize policy into a bounded, auditable
media lifecycle for the implemented content and showroom consumers while
preserving the current storage provider through the compatibility contract.

### Upload And Immutable Facts

- [ ] Bind upload authorization to the verified current actor/application and
      default-site compatibility context, access class, declared MIME, maximum
      size, and permitted current-provider key prefix.
- [ ] Sniff actual MIME/content type and reject mismatch with declared type,
      extension, access lane, or feature policy.
- [ ] Define checksum creation/verification and preserve immutable upload facts:
      original name, detected type, size, checksum, source, owner, and time.
- [ ] Retain current object-size/storage-metadata/path checks and add bounded
      abandoned-presign cleanup.
- [ ] Define archive/container expansion and parser resource limits before later
      accepting bundled or 3D assets.

### Lifecycle Worker

- [ ] Choose a bounded queue or reliable polling mechanism from demonstrated
      requirements; do not introduce a general event platform in F5.
- [ ] Implement idempotent `PENDING/QUEUED` claims with leases, retry limits,
      backoff, terminal failure, and dead-letter visibility.
- [ ] Verify stored objects and extract safe metadata such as detected MIME,
      dimensions, duration where supported, size, and checksum.
- [ ] Add a replaceable malware-scanner interface and explicit unavailable,
      timed-out, infected, clean, and manually reviewed states.
- [ ] Promote only validated media to `READY/CLEAN`; keep failed, infected,
      missing, or ambiguous objects non-renderable.
- [ ] Make reprocessing versioned and safe to retry without replacing immutable
      originals or duplicating derived records.

### Originals, Variants, And Provenance

- [ ] Model immutable originals and derived variants separately.
- [ ] Generate selected web, thumbnail, and mobile variants automatically.
- [ ] Record source media, processor/version, parameters, checksum, status,
      default-site compatibility reference, access class, and creation time for
      every derivative.
- [ ] Use immutable variant/version identity in cacheable URLs.
- [ ] Prevent public delivery of raw originals unless an explicit policy permits
      that exact media/access class/operation.
- [ ] Support regeneration and rollback without mutating the original.

### Content And CDN Integration

- [ ] Replace product thumbnail/gallery and blog cover URLs with media IDs.
- [ ] Define page/settings media references and semantic roles, ordering, alt
      text, captions, locale, and channel overrides in the owning content domain.
- [ ] Validate content/media ownership inside the current default-site boundary.
- [ ] Freeze compatibility-safe media/CDN routes, cache-control, ETag,
      replacement, invalidation, deletion, and revocation behavior.
- [ ] Add a narrow default-site public-media rename endpoint. Rename changes
      only `displayName` and its descriptive storage key, preserves the Media
      ID, original bytes, checksum, and existing content references, rejects
      destination collisions, and records recoverable/audited move state. Do
      not overload rename with image editing or mutate an immutable original.
- [ ] Keep media-service as CDN origin policy authority and ensure storage/CDN
      configuration cannot bypass status, scan, site, channel, or access class.
- [ ] Implement final CORS/preflight behavior for verified storefront/admin
      origins and preserve the rule that CORS is not mobile/server authorization.

### Consistency, Strict Media, And Providers

- [ ] Add orphan-object, missing-object, and database/storage drift detection.
- [ ] Add reconciliation for destructive operations and worker-backed execution
      for plans above the synchronous deletion cap.
- [ ] Define explicit folder ownership if empty folders remain a requirement.
- [ ] Separate strict preview from original download and default-deny strict
      original access.
- [ ] Add durable strict-media audits without storing signed URLs or secrets.
- [ ] Define provider-level versus application-level encryption, retention, and
      secure deletion responsibilities.
- [ ] Freeze only the S3-compatible operations required by current workflows;
      retain MinIO locally and prove that media policy does not depend on MinIO
      console/API extensions.
- [ ] Record Supabase Storage S3, AWS S3, and Azure Blob as candidates without
      implementing provider topology or parity before F9 selects the primary
      cloud.
- [ ] Keep provider configuration behind the media-service boundary and add a
      narrow contract test double or compatibility fixture. Do not add bucket
      fleets, replication, provider migration, KMS layout, or cross-cloud sync.

### F5 Exit Gate

- [ ] An authorized upload becomes `READY/CLEAN` and renderable without manual
      database edits.
- [ ] Web, thumbnail, and mobile variants are generated with traceable
      provenance while originals remain immutable.
- [ ] Products/blogs/pages use validated Media IDs rather than provider URLs;
      resumed F4 later proves same-site enforcement.
- [ ] Public/protected/strict delivery and denial tests pass after worker/CDN
      changes.
- [ ] Orphans, drift, failed processing, and oversized deletion are detectable
      and recoverable.
- [ ] The F5 worker pattern is sufficient for media but has not become an
      ungoverned general event system.

## M5 - 3D Showroom

Purpose: deliver a bounded web-first 3D showroom from the proven commerce and
F5 media paths. M5 owns only the scene and processing behavior its demonstration
requires; M3S, F8, F6, F9, and any future M6 generalize from that evidence later.

### Product And Module Boundary

- [ ] Keep product core limited to a versioned showroom reference. Use a
      separate package/service/worker only where ownership, dependency, or
      failure isolation requires it; do not pre-build the F6 module platform.
- [ ] Define default-site enablement, actor/admin permissions, component health,
      data retention, upgrade/rollback, and absent/disabled fallback.
- [ ] Validate product and scene ownership through versioned service contracts;
      never read product/media databases directly.
- [ ] Audit scene publication, product binding, destructive changes, privileged
      processing, and server enablement/permission decisions.

### 3D Asset And Processing Contract

- [ ] Run a web compatibility spike and freeze the smallest canonical runtime
      asset format plus accepted ingest formats before implementing converters.
- [ ] Support GLB/GLTF ingestion as selected; require USDZ only if an explicit
      iOS/AR acceptance case needs it.
- [ ] Validate container/archive structure, external references, paths, MIME,
      checksums, texture dimensions/formats, geometry/material counts, animation,
      decompression/resource limits, and prohibited content.
- [ ] Store 3D sources and derivatives as F5-governed default-site media with a
      minimal M5 manifest and immutable provenance; let M3S generalize bundles
      only from this implemented need.
- [ ] Build deterministic texture/geometry optimization, compression, preview/
      poster, and level-of-detail recipes with processor versions.
- [ ] Start with measured CPU workers; introduce GPU workers only for a proven
      workload and retain the same job/policy/provenance contracts.
- [ ] Add retry, cancellation, supersession, partial-output cleanup,
      reconciliation, and safe regeneration in one bounded M5/F5 job path.

### Scene Manifest And Authoring

- [ ] Define a versioned, JSON-compatible scene manifest containing bundle/
      asset versions, transforms, camera, lighting, environment, hotspots,
      product bindings, interaction intent, required renderer capabilities, and
      poster/fallback media.
- [ ] Keep manifest semantics platform-neutral; web/mobile renderer settings may
      specialize without leaking DOM/CSS or native implementation details into
      shared intent.
- [ ] Add schema validation, migrations, draft/preview/publish/restore,
      concurrency, immutable published revisions, and last-valid fallback.
- [ ] Build a bounded admin authoring flow for asset selection, product binding,
      camera/lighting presets, hotspots, preview, and publish; defer a general 3D
      modeling application.
- [ ] Prevent arbitrary scripts, external model/texture URLs, unsafe embeds, or
      client-defined executable behavior in scene manifests.

### Web Renderer And Future Mobile Contract

- [ ] Build a lazy-loaded web renderer with explicit client-only boundary,
      poster fallback, loading/progress/error states, keyboard/touch controls,
      reduced-motion behavior, and accessibility description/fallback content.
- [ ] Keep the manifest platform-neutral and record a renderer capability and
      poster fallback contract for F8; M5 does not implement the mobile renderer.
- [ ] Test representative low/mid/high browser/device profiles and define
      measured load, memory, frame, network, texture, and geometry budgets.
- [ ] Select LOD/quality from trusted capability/performance rules and preserve
      a functional product/media fallback when 3D is absent or too expensive.
- [ ] Deliver assets through approved CDN/media routes with versioned immutable
      cache identity; no renderer receives storage credentials.
- [ ] Record only the bounded web metrics needed for M7 evaluation without
      inventing a general event platform or logging raw sensitive scene/user data.

### Security, Operations, And Evidence

- [ ] Repeat current actor/application, default-site compatibility, product
      binding, scene lifecycle, and media access checks at component boundaries.
- [ ] Add processing and delivery quotas, timeouts, cancellation, cost labels,
      and denial behavior for malicious or oversized assets.
- [ ] Add bounded job, asset-processing, delivery, renderer-failure, and
      client-performance diagnostics appropriate to the demo.
- [ ] Test malformed/bomb assets, wrong product/media binding, disabled
      component, missing variants, stale manifest, worker outage, delivery
      failure, old manifest capability, and rollback.
- [ ] Run an actual storefront demonstration using the published scene and
      documented fallback. Mobile proof belongs to F8.

### M5 Exit Gate

- [ ] Admin can upload/process a governed 3D bundle, bind products, preview, and
      publish a versioned scene.
- [ ] Storefront renders the scene contract with measured behavior and a safe
      product/media fallback; the F8 handoff is explicit.
- [ ] Disabled or unauthorized users cannot obtain protected scene/assets
      through API, bounded worker, delivery, or renderer paths.
- [ ] Asset processing is deterministic, observable, recoverable, and bounded by
      measured device/infrastructure budgets.
- [ ] Product core remains usable and uncorrupted when the showroom module is
      disabled, absent, rolled back, or removed.

## M3S - Advanced Media And Storage Compatibility

Purpose: close only the advanced-media gaps demonstrated by F5 and the web
showroom, while keeping storage replaceable through a narrow compatibility
boundary. M3S does not design the final cloud storage structure, become a
general-purpose editor, or build a video platform.

### Retained Scope

- [ ] Extend deterministic derived-asset recipes beyond F5 only where M2 or M5
      has a concrete missing variant, preserving immutable originals and exact
      processor/source provenance.
- [ ] Add downscaled and/or watermarked protected/strict preview variants where
      the frozen media policy requires them; never describe them as DRM.
- [ ] Define the smallest versioned asset bundle needed by the implemented
      showroom, with manifest, members, checksums, media types, relationships,
      access class, default-site compatibility reference, and lifecycle.
- [ ] Support bundle validation, atomic publication, partial-failure cleanup,
      regeneration, replacement, retention, and deletion.
- [ ] Add strict-media encryption/audit behavior only for a demonstrated
      sensitive-asset use case, with media-service policy ownership preserved.
- [ ] Add automated, dependency-aware CDN invalidation and reconciliation for
      replaced/revoked derivatives and bundles.
- [ ] Prove the narrow required S3 operations against MinIO and a provider-neutral
      contract fixture. Do not select or structure the primary cloud in M3S.
- [ ] Produce an F9 handoff inventory covering required object operations,
      observed sizes/rates, URL behavior, lifecycle needs, failure modes, and
      portability assumptions. Treat provider-specific gaps as input to F9.
- [ ] Expose safe, versioned metadata hooks for later AI tagging/search while
      preventing model output from becoming authoritative MIME, scan, owner,
      access-class, or lifecycle data.

### Explicitly Deferred From Original M3

- General-purpose Photoshop-style or arbitrary non-destructive editing UI.
- Video-specific metadata, thumbnails, transcoding, and playback work that has
  no selected product consumer; streaming remains deferred with M4.
- Every possible storage/CDN/provider adapter.
- Provider-specific bucket/account/region topology, replication, lifecycle/KMS
  design, migration orchestration, or multi-cloud synchronization before F9.
- Unmeasured GPU acceleration or client-side processing that weakens the media
  policy boundary.

### M3S Exit Gate

- [ ] The selected previews/bundles and any demonstrated encryption/audit or CDN
      invalidation behavior pass their policy and recovery tests.
- [ ] The required object operations pass MinIO plus provider-neutral
      compatibility tests without bypassing media-service policy.
- [ ] Derived outputs can be regenerated from immutable originals with exact
      processor/recipe provenance.
- [ ] Bundle lifecycle cannot publish partial, wrong-reference, infected,
      missing, or unauthorized members; cross-site proof remains an F4 gate.
- [ ] The retained M3 scope is documented separately from deferred editing/video
      breadth.
- [ ] The report states that final cloud storage structure remains open until
      F9 and includes the exact evidence F9 must use for its provider decision.

## F8 - React Native Foundation

Purpose: create the secure default-site mobile core needed for D5 and the
already proven web showroom contract without expanding into deferred M8 or
claiming general site binding before F4.

### Project, Identity, And Builds

- [ ] Create the private React Native/Expo workspace and record the supported
      architecture/build strategy.
- [ ] Define Android/iOS application identities, signing boundaries, development
      profiles, release profiles, and runtime-version compatibility.
- [ ] Keep signing credentials, S2S keys, gateway keys, storage credentials, and
      registry/cluster access out of source and application bundles.
- [ ] Add reproducible Android verification and controlled macOS/iOS
      verification with retained, sanitized evidence.

### Site And Runtime Contract

- [ ] Bind each build profile to one configured F3 public application/client and
      prevent runtime tenant/site selection.
- [ ] Load default-site branding, locale, theme, navigation, and the F6-ready
      capability presentation contract from gateway APIs.
- [ ] Implement authentication, refresh, secure token storage, typed gateway
      client, request IDs, route protection, and public/authenticated sessions.
- [ ] Define bounded cache/offline behavior and version/update compatibility
      required for D5, without promising the broader M8 offline system.
- [ ] Implement push-registration foundations with site/app/user ownership,
      token lifecycle, logout/revocation cleanup, provider boundary, and no
      client authority over notification permissions or target tenant/site.
- [ ] Implement allowlisted deep-link parsing/routing foundations with
      authentication/capability checks and safe fallback for unknown, stale, or
      unauthorized targets.
- [ ] Defer broad push campaigns, background synchronization, app-specific
      overrides, and store-release automation to M8.

### Modules And Media

- [ ] Define mobile core versus optional feature packages and distinguish
      entitlement-locked included code from physically absent native modules.
- [ ] Require backend authorization for every protected operation regardless of
      client capability state.
- [ ] Use site-aware mobile variants and preserve public/protected/strict media
      behavior and cache expiry.
- [ ] Implement the mobile side of the versioned M5 scene/asset contract with a
      safe poster/product fallback; do not redesign the web-first showroom.

### F8 Exit Gate

- [ ] A signed Android/iOS build uses only its configured default-site public
      client and exposes no arbitrary scope selection.
- [ ] Login/refresh, configuration, capabilities, gateway calls, and public
      mobile media work on representative builds/devices.
- [ ] Disabled or absent capabilities remain unusable and render a defined
      fallback.
- [ ] Android/iOS builds are reproducible without exposing operational secrets.

## F6 - Modular Feature Compatibility Foundation

Purpose: use the implemented showroom and mobile needs to prove a small module
boundary without inventing the final tenant licensing system before resumed F4.

### Core And Capability Boundary

- [ ] Define the minimum core installed for every environment.
- [ ] Define optional module responsibilities and move existing showroom/3D
      fields out of product core through a compatible migration/contract plan.
- [ ] Limit shared packages to contracts, clients, verified context,
      configuration, errors, observability, tests, and a bounded module SDK.
- [ ] Define only the versioned feature keys and capability shapes required by
      implemented consumers. Record metering/allocation/delegation as later F4
      and commercial work unless a current feature proves the need.
- [ ] Make current capability server-authoritative from deployed module,
      configured default-site availability, channel/build support, and actor
      permission. Add licensed-target entitlement only when F4 resumes.
- [ ] Define a signed client capability manifest for presentation while keeping
      backend enforcement authoritative.

### Module Compatibility Contract

- [ ] Extract only the runtime/version/health/migration/resource/rollback fields
      that the implemented M5 component actually needs.
- [ ] Keep the contract compatible with a separate image/service/worker where
      M5 proved that boundary, without defining unused shared/dedicated/edge
      deployment modes.
- [ ] Make enable/disable state server-owned and fail closed; client-visible
      presentation flags and model responses cannot enable a backend operation.
- [ ] Record signed licensed entitlement manifests, allocation/delegation,
      grace/expiry/termination, metering, and fleet operation as deferred F4 and
      commercial work.

### Implemented Consumer Proof

- [ ] Use the already implemented M5 showroom boundary as the first real proof;
      do not build a contrived second proof module.
- [ ] Preserve its separate image/database/service identity only where M5
      evidence justified them.
- [ ] Register its exact capability and protect gateway/domain operations with
      server enablement plus actor/resource checks.
- [ ] Add a matching optional web/mobile capability and fallback behavior.
- [ ] Test installation, migration, upgrade, rollback, disablement, data
      retention/export, and removal without editing unrelated core code.

### F6 Exit Gate

- [ ] One module operates outside core with separate deployment and a
      default-site server capability boundary.
- [ ] Disabling or removing it cannot corrupt core data or break clients that
      follow the capability/fallback contract.
- [ ] Client flags cannot bypass server enforcement.
- [ ] The existing showroom and later AI work can use the proven pattern without
      turning it into a speculative module platform.
- [ ] Final tenant/site entitlement, allocation, delegation, and licensed-module
      isolation remain explicitly open for resumed F4 and commercial phases.

## D5 - Mobile Product Flow

Purpose: prove the same product and commerce contracts in the one configured
default-site mobile application without implementing deferred M8 breadth or
claiming general application/tenant isolation before F4.

- [ ] Bind the build to one configured public client/application and reject
      runtime tenant/site selection.
- [ ] Load the default-site theme, locale, navigation, and F6 capability
      presentation contract.
- [ ] Implement registration/login/refresh/logout with secure token storage.
- [ ] Render product list/detail and site-aware mobile media variants.
- [ ] Implement cart, demo checkout, order confirmation, and order history.
- [ ] Enforce route and feature denial in the UI while relying on backend policy
      as the actual security boundary.
- [ ] Handle expired sessions, absent capabilities, offline/degraded reads,
      version incompatibility, and missing media using the F8 contract.
- [ ] Run representative Android and controlled iOS device/build tests.

### D5 Exit Gate

- [ ] The signed app consumes only the configured default-site product through
      the external typed client.
- [ ] Login, refresh, catalog, media, cart, checkout, and orders work on the
      supported mobile builds.
- [ ] Capability tampering fails at client presentation and backend enforcement;
      multi-site tampering remains an explicit F4 exit case.
- [ ] No M8 offline catalog, push, background sync, or store automation is
      implied by completing D5.

## Commerce Portfolio Exit Gate - Release P1

```text
admin uploads media
-> media becomes READY/CLEAN with web/mobile variants
-> admin creates and publishes a default-site product
-> storefront and mobile display the same authoritative product
-> user adds it to a cart and completes idempotent demo checkout
-> admin sees and updates the resulting order
```

- [ ] The entire flow is explicitly default-site/single-realm, enforces current
      actor/application policy, and accepts no caller-selected scope override.
- [ ] Every client uses gateway APIs and approved CDN/storage data-plane URLs.
- [ ] Media uses IDs and verified variants; no client persists private provider
      URLs as content identity.
- [ ] Web and mobile use the same versioned external contracts while rendering
      platform-appropriate interfaces.
- [ ] CI and a reproducible local/release smoke environment cover the flow;
      primary-cloud staging remains F9.
- [ ] Demo reset/reseed is deterministic and cannot target production.
- [ ] Existing backup/restore and deployment rollback commands preserve or
      safely recover the demonstration state in their currently supported
      environment.
- [ ] A portfolio runbook records architecture, supported scenarios, deliberate
      exclusions, setup, demo accounts/data, verification commands, and known
      limitations.

---

# AI AND ANALYTICS

Execution order: `AI0 -> M7`.

## AI0 - Agentic AI And RAG Foundation

Purpose: add an evaluated AI boundary to the proven default-site P1 product.
AI0 provides bounded ingestion, retrieval, model, tool, evaluation, and privacy
contracts. Broad recommendations and analytics remain M7; tenant-isolated AI
remains part of the resumed F4 exit.

AI0 must reuse F3 gateway trust, current actor/application authorization, F5
governed media, F6 server capabilities, and the P1 domain contracts. It may use
the bounded F5 worker pattern for ingestion but must not pre-implement general
M6 or F9 infrastructure.

### Ownership And Architecture

- [ ] Create an ADR for AI orchestration, ingestion/index metadata, evaluation,
      and model-provider ownership before adding a new service/database.
- [ ] Keep Auth/User/Tenant/Product/Media/Blog/Order services authoritative for
      their existing domains; AI owns neither transactional truth nor access
      decisions.
- [ ] Access domain data through versioned clients/events and never by importing
      another service's Prisma client or querying its database.
- [ ] Keep the public AI surface behind the gateway and put premium AI behavior
      behind F6 capability/entitlement checks.
- [ ] Use Python only for concrete retrieval, ML/data, evaluation, or worker
      workflows where its ecosystem is justified; retain NestJS/TypeScript for
      existing request-path and domain ownership.
- [ ] Define a narrow internal provider/model interface without forcing every
      provider into a lowest-common-denominator abstraction.

### Knowledge Source And Ingestion Contract

- [ ] Define a source registry containing the default-site compatibility
      reference, source owner, classification, allowed audiences/roles,
      retention, legal/privacy status, lifecycle, and source contract/version.
- [ ] Admit only supported, scanned, authorized source media/content; do not
      index arbitrary storage objects because a key is discoverable.
- [ ] Apply current application/actor and document authorization before
      chunking/index writes.
- [ ] Define parser, normalization, chunking, embedding, metadata, and index
      versions with immutable source/content hashes and provenance.
- [ ] Give chunks stable source/revision relationships while allowing a new
      strategy/model to create a separate index version.
- [ ] Implement idempotent ingestion, retry, terminal failure, re-index, delete,
      tombstone, retention expiry, and reconciliation behavior.
- [ ] Remove or make expired/deauthorized content non-retrievable within a
      tested bound across source, chunks, vectors, caches, and derived summaries.
- [ ] Treat source text and metadata as untrusted content capable of indirect
      prompt injection.

### Retrieval And Grounded Response

- [ ] Enforce current application, actor/role, server capability, source
      lifecycle, and document ACL in the query/retrieval boundary before
      results can mix.
- [ ] Establish a vector-only baseline, then benchmark lexical/hybrid retrieval
      and reranking using the evaluation set before selecting added complexity.
- [ ] Preserve source ID, revision, chunk, score/rank, and index/model versions
      for every retrieved context item.
- [ ] Return inspectable citations that resolve only through authorized gateway
      or content/media routes.
- [ ] Define insufficient-context, conflicting-source, unavailable-model,
      retrieval-timeout, and partial-result behavior.
- [ ] Prevent model output from inventing internal identifiers, signed URLs,
      permissions, or unsupported citations.
- [ ] Validate and encode model output before using it in HTML, queries, tool
      parameters, files, or other interpreters.

### Agent And Tool Contract

- [ ] Begin with a bounded read-only product assistant over selected product,
      content, media-metadata, and help/knowledge operations.
- [ ] Register every tool with a versioned schema, owning service/client,
      allowed application/actor roles, required capability, side-effect class,
      timeout, retry/idempotency policy, and output/redaction limit.
- [ ] Derive tool authorization from verified gateway context; never accept an
      agent/model-generated application, actor, role, capability, or document
      scope as truth.
- [ ] Re-authorize every tool invocation at its owning boundary.
- [ ] Deny arbitrary shell, SQL, filesystem, URL fetch, cloud-control,
      Kubernetes, secret-store, and unrestricted internal-service tools.
- [ ] Bound iterations, parallel calls, tokens, wall time, provider cost, and
      output size per request.
- [ ] Treat retrieved content and previous tool output as data, never as policy
      or permission to select another tool.
- [ ] Require explicit user confirmation, idempotency, preview/diff, and audit
      before introducing any consequential write tool.
- [ ] Provide an operator kill switch that disables model/tool execution without
      disabling normal commerce operations.

### Evaluation And Release Policy

- [ ] Create versioned, default-site-safe evaluation datasets from synthetic,
      consented, or appropriately sanitized examples; production logs are not
      automatically evaluation/training data.
- [ ] Measure retrieval relevance/coverage, citation correctness, groundedness,
      task correctness, abstention, tool choice/arguments/result handling,
      latency, token use, and cost.
- [ ] Add deterministic actor/application/document ACL tests independent of
      model quality.
- [ ] Add direct/indirect prompt injection, poisoned source, malicious tool
      output, sensitive disclosure, excessive agency, unbounded consumption,
      citation forgery, and unauthorized-document retrieval cases.
- [ ] Establish baselines and explicit regression tolerances before comparing
      prompt, model, embedding, chunking, ranking, or tool changes.
- [ ] Keep model-judged evaluation distinguishable from deterministic checks and
      periodically calibrate it with human review.
- [ ] Run shadow/offline evaluation before enabling a new model/index/prompt;
      use capability-scoped rollout and rollback for online changes.

### Privacy, Observability, And Operations

- [ ] Record model/provider/version, prompt-template version, retrieval/index
      version, tool-contract version, request ID, safe scope labels, timing,
      token/cost totals, outcome, and policy decisions.
- [ ] Define whether prompts, retrieved passages, outputs, and tool payloads may
      be logged; default to redacted metadata where full content is unnecessary.
- [ ] Define data residency, provider retention/training, encryption, deletion,
      export, and incident response before sending product/user data to an
      external model/embedding provider.
- [ ] Restrict network egress to approved model/embedding endpoints and keep
      provider credentials in the F9 secret boundary.
- [ ] Add model/retrieval/tool latency, failure, rate, cost, denial, and quality-
      regression dashboards/alerts.
- [ ] Test provider outage, quota exhaustion, slow response, malformed output,
      index outage, partial ingestion, rollback, and cost-limit behavior.

### AI0 Exit Gate

- [ ] One user-facing, read-only, citation-bearing RAG/agent use case works
      through the gateway on authorized product/content knowledge.
- [ ] Wrong-application, wrong-actor, unauthorized-document, and forged-context
      retrieval/tool calls fail deterministically without relying on the model.
- [ ] Source update/delete/re-index behavior is traceable and reconciled.
- [ ] Every answer/tool run can identify its model, prompt, index, retrieved
      sources, tool contracts, scope, and evaluation baseline without leaking
      secrets.
- [ ] Prompt injection, excessive agency, disclosure, and unbounded-consumption
      denial suites pass at the approved threshold.
- [ ] A model/provider can be disabled or rolled back without disabling P1
      commerce or corrupting transactional data.
- [ ] The exit report labels the capability default-site/single-realm and leaves
      cross-tenant retrieval/index isolation to resumed F4.

## M7 - AI And Analytics

Purpose: build evaluated default-site intelligence on top of AI0, M2 content,
M3S assets, bounded owning-phase jobs/indexes, and the M5 showroom without
transferring transactional authority to models. Multi-tenant analytics and
learning isolation remain a resumed F4 gate.

### Analytics Event And Data Contract

- [ ] Define a versioned analytics catalog with event purpose, producer,
      default-site/application compatibility scope, actor/session pseudonym
      policy, consent/legal basis where applicable, payload schema, retention,
      and owner.
- [ ] Distinguish operational telemetry, security audit, product analytics,
      model/agent traces, and training/evaluation data; do not copy all logs into
      one analytics lake.
- [ ] Validate, minimize, and classify event fields; exclude secrets, tokens,
      signed URLs, unnecessary prompt/document content, and uncontrolled PII.
- [ ] Define late/duplicate/out-of-order event handling and deletion/export
      propagation through analytical stores and derived features.
- [ ] Add data-quality, freshness, lineage, schema-drift, and tenant-isolation
      checks before analytics becomes an AI input.

### Selected AI Capabilities

- [ ] Implement default-site semantic/catalog/content search enrichment using
      AI0's bounded index and measured relevance improvements.
- [ ] Implement media/content/product tag suggestions as non-authoritative
      reviewed proposals with provenance and confidence/quality evidence.
- [ ] Implement recommendations only after defining a useful baseline,
      eligibility/privacy policy, cold-start/fallback behavior, and offline/
      online success metrics.
- [ ] Implement bounded admin/site insights that cite or link their supporting
      data and state uncertainty/coverage limitations.
- [ ] Allow the agent to use new read tools only through AI0 tool policy; add
      write tools individually with confirmation, idempotency, authorization,
      audit, and rollback.
- [ ] Keep pricing, inventory, order status, media policy, entitlement, tenant
      authority, and publication decisions deterministic and service-owned.

### Model, Experiment, And Governance Lifecycle

- [ ] Maintain a registry for model/provider/version, prompt, feature pipeline,
      index, training/evaluation data version, parameters, owner, approval,
      deployment, rollback, and retirement.
- [ ] Define reproducible offline baselines and online rollout/experiment policy
      with explicit dataset/source boundaries. Cross-tenant learning isolation
      is added and proven when F4 resumes.
- [ ] Add model/retrieval/recommendation quality, drift, bias/coverage where
      relevant, latency, availability, and cost monitoring.
- [ ] Define user/admin feedback capture without treating feedback as trusted
      labels or automatic training consent.
- [ ] Define privacy notice, consent where required, retention, export, deletion,
      provider-training, residency, and incident procedures.
- [ ] Add human review/escalation for uncertain, sensitive, or consequential
      outputs and a capability-scoped shutdown/rollback path.
- [ ] Use Python only for concrete ML/data workflows and keep deployment,
      contracts, tests, observability, and ownership standards language-neutral.

### Evaluation And Failure Proofs

- [ ] Extend AI0 evaluations per capability: retrieval, tagging, search,
      recommendation, insight, and tool behavior each get task-appropriate
      deterministic and human-reviewed measures.
- [ ] Compare every learned/LLM capability against a simple non-AI baseline and
      retain AI only where measured value justifies complexity/cost.
- [ ] Test prompt/data poisoning, popularity/feedback manipulation, sparse/cold
      data, stale indexes, model/provider outage, quota/cost exhaustion, drift,
      deletion, rollback, and unauthorized-source scenarios.
- [ ] Test that AI failure degrades to normal product/search/media/showroom
      behavior rather than blocking commerce or weakening authorization.
- [ ] Publish model cards or equivalent internal capability records describing
      purpose, data, metrics, limits, risks, and rollback owner.

### M7 Exit Gate

- [ ] Default-site analytics is versioned, minimized, traceable, and covered by
      retention/export/deletion policy.
- [ ] Each shipped AI capability beats its declared non-AI baseline at the
      approved quality/cost/latency threshold.
- [ ] Model, prompt, index, data, tool, and experiment versions are auditable and
      reversible.
- [ ] Unauthorized-source disclosure, prompt injection, excessive agency,
      poisoned data, and model/provider outage tests pass at the approved
      release threshold; cross-tenant cases remain part of resumed F4.
- [ ] Disabling every AI capability leaves P1 commerce, M2 content, M3S media,
      and M5 showroom operational under defined non-AI fallbacks.
- [ ] The exit report makes no tenant-isolation claim and lists the analytics,
      indexes, pseudonyms, and traces that resumed F4 must scope and test.

---

# AI And Showroom Product Checkpoint

## End-To-End Product Proof

```text
site admin publishes governed media, products, and composed content
-> storefront and mobile render the same site contracts
-> user completes the P1 commerce flow
-> authorized RAG answers cite current default-site sources
-> bounded owning-phase jobs update AI indexes and derived state reliably
-> admin publishes an enabled 3D scene
-> web and mobile render it or use the declared fallback
-> analytics and selected AI insights remain default-site and reversible
```

- [ ] P0 Web Commerce and P1 Commerce Portfolio gates remain green.
- [ ] AI0, M2, F5, M5, M3S, F8, F6, D5, and M7 exit gates pass.
- [ ] The complete external path uses gateway plus approved CDN/storage URLs.
- [ ] Wrong-actor/application and unauthorized data, media, content, vector,
      agent/tool, analytics, and 3D access is denied in the default-site product.
- [ ] Web and mobile demonstrate commerce, content, governed media, AI/RAG, and
      the same server-enabled 3D showroom contract.
- [ ] The checkpoint produces the workload/storage/traffic evidence F9 needs and
      the complete data-owner inventory resumed F4 must scope.
- [ ] CI/staging includes deterministic contract/security gates and explicitly
      versioned AI/3D evaluation evidence.
- [ ] A portfolio demonstration explains current capabilities, architecture,
      failure handling, measurements, security boundaries, and deliberate
      exclusions without presenting planned features as complete.

---

# CLOUD AND MULTI-TENANT COMPLETION

Execution order: `F9 -> F4`. F4 resumes at R6.1 only after F9 exits.

## F9 - Cloud, Kubernetes, Delivery, And Operations Foundation

Purpose: prove one production-shaped deployment and a bounded portability path,
using the implemented product's actual traffic, storage, worker, AI, and
showroom needs. F9 does not maintain two complete production clouds or silently
finish tenant isolation.

### Cloud And Infrastructure Decision

- [ ] At F9 entry, select AWS or Azure as the primary deployment using explicit
      cost, regional availability, managed-service, learning, and portfolio
      criteria; record the decision and exit strategy in an ADR.
- [ ] Re-evaluate Supabase Storage S3, AWS S3, and Azure Blob from the measured
      F5/M5/M3S operation inventory. Select the primary object-store structure
      here rather than retroactively treating the pre-cloud compatibility layer
      as a permanent design.
- [ ] Define cloud-neutral application contracts for Kubernetes, PostgreSQL,
      Redis-compatible state, object storage, DNS/TLS, registry, secrets,
      telemetry, backups, and model-provider egress.
- [ ] Implement infrastructure as code for the primary environment and prohibit
      undocumented console-only production resources.
- [ ] Produce a service-by-service AWS/Azure mapping and complete a bounded
      second-cloud compatibility proof only after the primary exit gate passes.
- [ ] Do not claim active-active multi-cloud, automatic failover, or full parity
      without separate evidence and operational ownership.

### Kubernetes, Images, And Secrets

- [ ] Create core and optional-module Helm patterns with namespaces, service
      accounts, default-deny network policies, DNS exceptions, explicit service
      allowlists, resources, quotas, probes, migration jobs, and storage.
- [ ] Define node selection and optional GPU scheduling without allocating GPU
      infrastructure before a measured workload requires it.
- [ ] Use a private registry, digest-pinned images, restricted pull identity,
      SBOMs, scanning, and image-signing/verification policy.
- [ ] Rebuild from current stable base images at production freeze and resolve
      or formally classify every remaining runtime finding under the approved
      release policy.
- [ ] Keep secrets outside images; define managed secret/KMS encryption,
      workload access, audit, rotation, and revocation.
- [ ] Prevent core/module/worker workloads from receiving unrelated secrets.

### Networking And Delivery

- [ ] Expose only the gateway and approved storage/CDN origins.
- [ ] Keep internal gRPC, databases, Redis, admin storage console, metrics, and
      management endpoints private.
- [ ] Define ingress, TLS, DNS, the configured default storefront domain,
      CDN origin/cache, and internal/external storage endpoints. General
      site-domain verification remains resumed F4 work.
- [ ] Decide and document whether admin/storefront run in Kubernetes or an
      approved managed/static hosting boundary; in either case preserve gateway-
      only APIs, environment separation, CSP/security headers, rollback, and
      deployment evidence.
- [ ] Keep signed mobile build/distribution outside the cluster while using the
      same versioned gateway, configured public application/client, and
      release-compatibility contracts.
- [ ] Add egress restrictions for sensitive workloads and reserve explicit
      destinations for later model/embedding providers.
- [ ] Verify network policy with positive and negative reachability tests, not
      only rendered YAML.

### Observability, Reliability, And Cost

- [ ] Add structured logs, request/trace propagation, metrics, dashboards, and
      alerts with safe service/application/actor/module labels. Record where F4
      must later add authoritative tenant/site labels.
- [ ] Define log/trace/audit retention and prevent secrets, raw tokens, signed
      URLs, or unapproved prompt/document content from telemetry.
- [ ] Test database/media backup and restore, deployment rollback, failed
      migration recovery, graceful drain/shutdown, and dependency degradation.
- [ ] Add worker retry/dead-letter visibility before F5 workers are considered
      production-ready in Kubernetes.
- [ ] Run baseline load, rate-limit, noisy-neighbor, and resource-limit tests.
- [ ] Establish environment/resource cost attribution and budget alerts before
      later GPU or model-provider costs arrive.
- [ ] Create staging, deployment, rollback, incident, and disaster-recovery
      runbooks and exercise their critical paths.

### F9 Exit Gate

- [ ] Core and the F6 proof module run reproducibly in the primary Kubernetes
      environment from infrastructure/configuration source.
- [ ] Only gateway and approved media/storage data-plane routes are externally
      reachable; negative network tests pass.
- [ ] Images, secrets, migrations, probes, backups, rollback, monitoring, alerts,
      and cost controls are verified.
- [ ] Clients have no cluster, node, registry, database, S2S, or internal-service
      access.
- [ ] A documented second-cloud mapping/compatibility proof exists without a
      false full-parity claim.
- [ ] The chosen object-store topology, credentials/KMS, lifecycle, backup,
      delivery, and migration behavior pass primary-cloud evidence; M3S
      compatibility tests remain green or are revised through an explicit ADR.

## F4 - Tenant, Site, Application, And Identity-Realm Authority

Purpose: use the completed product and cloud evidence to finish the authoritative
tenant/site/application and customer-root identity isolation required before
NebulaNV can activate or claim multi-tenant behavior. Unrelated licensed customers must not share one
credential/session population, while explicitly selected subordinate
applications may provide prompt-free SSO through their licensed root realm.

The original Batch 1 and completed Batch 2/3 evidence remains historical.
[ADR-0014](docs/architecture/decisions/0014-f4-customer-identity-realms-and-federation.md)
supersedes only the platform-global identity/session clauses and requires a
corrective architecture/schema/contract gate before remaining F4 work continues.
[ADR-0015](docs/architecture/decisions/0015-f4-identity-realm-record-and-migration-freeze.md)
closed that Batch 1R design gate on 2026-08-31 with exact record owners,
administrator/session choices, identifiers, R0-R11 migration/rollback order,
and deployment boundaries. No corrective schema/runtime work is implied by
that documentation completion.

### Ownership, Realms, And Lifecycle

- [ ] Inspect current domain/config/Auth/User/authority ownership and decide,
      through ADRs, which boundary owns tenants, sites, channels, identity
      realms, realm/provider/application trust, memberships, application
      registrations, credential/session records, and entitlement anchors.
- [ ] Freeze opaque tenant/site/channel/application/identity-realm/provider/
      trust identifiers and the realm-qualified `(identityRealmId, subjectId)`
      actor coordinate. Keep login-identifier normalization closed and
      Auth-owned. Public or user-selectable identifiers never become authority.
- [ ] Give each licensed root one default isolated identity realm and permit
      additional consumer, workforce, subordinate-owned, or BYO-provider realms
      only through explicit lifecycle and trust records.
- [ ] Keep the NebulaNV platform-operator realm separate from every customer
      realm. The platform control plane may route and license realms but stores
      no customer password, raw session, provider secret, or private realm key.
- [ ] Define tenant, site, application, identity-realm, provider, and
      federation-trust lifecycle states, including login/session, disabled,
      read/export, key/provider outage, and deployment-health behavior.
- [ ] Define `WEB`, `ANDROID`, and `IOS` channels without making presentation
      channels separate business-data or identity owners.
- [ ] Bind domains and mobile package/application identities to verified active
      site registrations and an exact default-deny application identity policy
      containing accepted realms/providers/principal classes and audience.
- [ ] Preserve direct parent/subordinate management and sibling/transitive
      denial. A parent edge alone creates no realm trust, SSO, membership, role,
      or entitlement.

### Authentication, Sessions, Membership, Roles, And Context

- [ ] Migrate the current platform-global User/Auth population into a stable
      default realm. Identity/profile is realm-scoped; tenant membership and
      site authorization remain independently target-scoped. Transfer
      credential/session facts only through bounded source-owned encrypted
      artifacts and a fail-closed cutover barrier, never cross-database reads or
      asynchronous dual authority.
- [ ] Keep target-specific platform, tenant-wide, site-specific,
      parent-management, editor, and user roles. Permit an approved realm
      consumer to obtain only the exact subordinate `USER` baseline; every
      higher role requires an explicit target grant.
- [ ] Keep premium/subscription access out of administrative roles. F6 must
      intersect realm consumer entitlement with exact licensed target,
      allocation, deployed module, channel, and actor permission.
- [ ] Implement application-first login routing and root-to-subordinate SSO
      using an exact trusted issuer and one-use, short-lived, audience-bound
      code/token exchange. Never reuse one root bearer or refresh token across
      applications or siblings.
- [ ] Permit privacy-minimized local consumer membership/projection creation on
      the first protected subordinate action. Store no duplicated credential;
      personnel-only applications reject consumer-realm admission entirely.
- [ ] Make the local password hash and monotonically increasing
      `credentialGeneration` one realm-owned transaction. Keep a separate
      monotonic `sessionGeneration` in the same aggregate. Password change,
      reset, credential removal, suspension, and confirmed compromise advance
      both; logout-all advances session generation so every older realm/
      application session fails despite delayed cleanup.
- [ ] Add a durable minimized active-session ledger with current, selected-
      other, and all-session revocation plus the bounded terminal legacy bridge.
      Preserve hashed refresh tokens, atomic rotation, replay containment, and
      live session checks; Redis is not the sole recoverable generation,
      bridge, or session inventory.
- [ ] Bind every token/session to realm, subject, both Auth generations,
      issuer/provider, exact application/audience, and session family. Security
      decisions use the authoritative primary path, not stale asynchronous
      standbys.
- [ ] Freeze OIDC as the first federation/SSO contract and provider-neutral
      SAML/SCIM trust and lifecycle seams. Email/phone/name never auto-link
      accounts; external identity uses exact provider plus `(iss, sub)`.
- [ ] Ensure membership, role, realm/provider/trust, credential, application,
      site, tenant, and parent-link changes invalidate or refresh only the
      affected authorization/session scope without trusting stale client claims.
- [ ] Preserve signed S2S v3 and frozen context v1/v2 compatibility. Introduce
      strict realm-aware context v3 receiver-first with no dual carrier,
      downgrade, raw provider claim, or legacy-role fallback.
- [ ] Require sensitive services to repeat realm subject/session, tenant/site,
      resource-owner, role, membership, and entitlement checks instead of
      trusting gateway or identity-provider admission alone.
- [ ] Audit realm/provider/trust/session changes and parent actions with the
      minimized actor realm/subject, actor tenant/membership, target tenant/site,
      application/audience, action, request ID, time, result, and revision.

### Domain Migration And Scoping

- [ ] Add tenant/site ownership to products, media, blogs/pages, settings,
      taxonomy policy, carts, and orders according to each service's domain.
- [ ] Replace every bare domain `userId`/`ownerId` assumption that can cross a
      realm with explicit `identityRealmId` plus `subjectId` columns. Treat the
      old UUID as deterministic default-realm migration input only; do not add
      an opaque-wrapper alternative during F4.
- [ ] Add tenant/site-aware unique constraints and indexes before relying on
      application-only filters.
- [ ] Define taxonomy as site-owned, tenant-shared, or platform-owned per scope;
      never infer sharing from a missing site filter.
- [ ] Validate all cross-service references through the owning service because
      separate databases cannot provide cross-database foreign keys.
- [ ] Prevent cross-site product/media, blog/media, page/media, taxonomy, cart,
      order, membership, and realm-subject references.
- [ ] Scope Auth/session Redis keys by realm and session/app as applicable;
      scope membership caches, rate/idempotency keys, storage paths, jobs,
      events, audit records, search documents, and future vector records by
      their authoritative tenant/site/realm provenance.
- [ ] Create an ordered migration/backfill plan with rollback and orphan-report
      behavior for every existing single-site/global-identity record. Preserve
      stable legacy subject UUIDs inside the default realm.

### Default Development And Realm Context

- [ ] Seed one stable platform-operator realm, default licensed-root realm,
      default tenant/site, and exact realm/application policy.
- [ ] Seed web, Android, and iOS channels and registered development clients.
- [ ] Seed platform admin, site admin, editor, and user memberships with
      realm-qualified subjects and no automatic cross-license access.
- [ ] Seed one selected consumer subordinate, one consumer-excluded personnel
      subordinate, and a second isolated licensed-root realm with independent
      credential/session/key material.
- [ ] Migrate existing development/demo users and data into the default realm
      and site through clean, idempotent, reversible current-source execution.
- [ ] Preserve current flows in default-realm single-site compatibility before
      enabling subordinate federation or second-realm traffic.

### Isolation, Consistency, And Federation Evidence

- [ ] Test same-site allowed; exact approved root-to-subordinate target access
      allowed; and unapproved/wrong-target cross-site, cross-tenant, sibling,
      reverse, transitive, and cross-license reads/writes denied for every
      applicable service and gateway route.
- [ ] Prove the same normalized email can exist in two licensed-root realms
      without shared subject, credential, session, key, membership, lookup, or
      authorization state.
- [ ] Prove one root realm session enters an approved subordinate without a
      credential prompt and receives only an application-bound session.
- [ ] Prove the same subject is denied by a personnel-only subordinate,
      sibling, unrelated licensed root, wrong issuer/audience/key, inactive
      provider/trust, and parent relationship without identity policy.
- [ ] Prove password-change/concurrent-login, concurrent password change,
      current/selected/all logout, stale session, Redis loss/restore, database
      failover, provider outage, key rotation, and revocation propagation have
      the frozen fail state and recovery behavior.
- [ ] Test forged tenant/site/channel/application/realm/provider/subject/actor/
      target metadata across HTTP, gRPC, jobs, events, storage, cache, and
      future search adapters.
- [ ] Test background work retains verified tenant/site/realm provenance and
      cannot process a payload that only asserts raw IDs or provider claims.
- [ ] Add data-audit queries that find null, unknown, cross-realm,
      contradictory, duplicate, downgraded-generation, revived-session, or
      orphaned ownership before each environment is promoted.

### F4 Exit Gate

- [ ] All applicable existing data belongs to an authoritative tenant/site and
      every human/owner reference has one authoritative realm subject.
- [ ] A default licensed-root realm supports normal development; an approved
      subordinate proves seamless bounded SSO; an excluded subordinate and a
      second licensed-root realm prove isolation without schema redesign.
- [ ] Password/credential lifecycle and current/selected/all session revocation
      are durable, race-tested, and cannot be bypassed through stale replicas,
      Redis restoration, old generations, or copied application tokens.
- [ ] Forged, wrong-issuer/audience, unapproved or wrong-target cross-tenant,
      sibling, reverse, transitive, and cross-license access fails across
      transports and persistence boundaries; only exact approved target paths
      succeed.
- [ ] Gateway, realm Auth/User deployments, Tenant Authority, domain services,
      caches, storage, and background contracts agree on context provenance
      while preserving independent Auth and domain authorization.
- [ ] Future search/vector records, events, analytics pseudonyms, and AI traces
      have mandatory tenant/site/application/identity-realm/subject/request
      scope before they are implemented.

## Foundation Definition Of Done

Status: final foundation gate, evaluated only after F9 and resumed F4 complete.
It is no longer an entry prerequisite for the commerce demo.

```text
seed tenant/site/channels/apps
-> authenticate only through gateway
-> propagate verified actor/tenant/site/app/service/request context
-> reject forged and cross-tenant access
-> upload, scan, promote, derive, and deliver governed media
-> load configuration/capabilities in admin/storefront/mobile
-> enable and disable an independent proof module
-> deploy, observe, back up, restore, and roll back in Kubernetes
```

- [ ] Every F0-F9 exit gate passes against current source.
- [ ] Foundation documentation separates current mechanisms, target behavior,
      optional hardening, and deferred work.
- [ ] Clean CI and primary-cloud staging proofs are reproducible.
- [ ] No product feature has bypassed tenant, gateway, media, module, or
      operational authority to reach the demo faster.

---

# PARALLEL ENGINEERING AI TRACK

## EA0 - Repository Agent And Evaluation Lab

Purpose: gain practical RAG, agent, tool-calling, and evaluation experience
while improving navigation of NebulaNV's existing evidence. EA0 is an internal
engineering tool, not a customer feature and not a release authority.

EA0 may run in a separate timebox during later foundation work. It must not
delay an active foundation exit gate or silently modify production behavior.

### Corpus Governance

- [ ] Inventory candidate sources and classify each as authoritative,
      operational, generated, historical, superseded, or excluded.
- [ ] Define metadata for path, heading, owner, status, effective/review date,
      source commit/hash, domain, and supersession relationships.
- [ ] Keep `TODO.md`, `docs/current-focus.md`, architecture documents, audits,
      reports, generated contracts, and runtime evidence distinguishable.
- [ ] Exclude `.env` secrets, credentials, backups, database dumps, image
      archives, dependency caches, and unbounded raw logs.
- [ ] Preserve source path and heading boundaries in chunks so every retrieval
      result can be inspected in its original context.
- [ ] Invalidate or re-index changed/deleted sources deterministically; do not
      let an obsolete chunk survive because its filename still exists.
- [ ] Define retention for indexed logs/test evidence separately from durable
      architecture and contract documents.

### Retrieval And Answers

- [ ] Build a reproducible ingestion command that never mutates source files.
- [ ] Store chunk/content hashes and ingestion/index versions.
- [ ] Apply repository/workspace scope before retrieval.
- [ ] Return file/heading citations for repository claims.
- [ ] Prefer an explicit insufficient-evidence result over an invented answer.
- [ ] Distinguish implementation evidence from plans and historical reports in
      ranking and response policy.
- [ ] Test stale/superseded-document conflicts and require the current source
      of truth to win.

### Tools And Agency

- [ ] Start with read-only tools for search, file inspection, test ownership,
      dependency maps, and bounded test-result summaries.
- [ ] Give each tool a typed schema, exact filesystem/repository scope, timeout,
      output limit, and redaction policy.
- [ ] Do not expose unrestricted shell, database, cloud, GitHub, or secret-store
      access to the model.
- [ ] Treat retrieved documents, code comments, issues, logs, and tool output as
      untrusted data that cannot override agent policy.
- [ ] Require explicit human approval and a visible diff before any later
      source-writing experiment.
- [ ] Record model, prompt, retrieval/index, tool-contract, input-corpus, and
      evaluation versions for every assessed run.

### Evaluation And Safety

- [ ] Create a versioned evaluation set covering architecture ownership,
      current-focus status, commands, security boundaries, stale documents,
      insufficient evidence, and conflicting sources.
- [ ] Add retrieval relevance, citation correctness, answer correctness,
      refusal/abstention, tool-selection, tool-argument, latency, token, and
      cost measurements.
- [ ] Add malicious-document and indirect-prompt-injection cases.
- [ ] Add secret-seeking, path-escape, oversized-output, unauthorized-write,
      and destructive-tool cases.
- [ ] Separate deterministic assertions from model-judged scores and retain
      human-reviewed examples for subjective quality.
- [ ] Pin an evaluation baseline before changing prompts, chunking, embedding,
      ranking, models, or tools.

### EA0 Exit Gate

- [ ] Repository answers cite inspectable sources and distinguish plans from
      implementation.
- [ ] Stale or superseded documents cannot silently outrank active authority.
- [ ] The agent cannot read excluded secrets or write repository files through
      its normal tool set.
- [ ] Evaluation runs are reproducible enough to compare two configurations.
- [ ] Security-denial and insufficient-evidence cases pass.
- [ ] The lab has a concise runbook and bounded local/cloud cost report.

---

# DEFERRED GROWTH PARKING LOT

These items are intentionally outside the active path. They receive no partial
implementation merely because a shared field or UI placeholder is convenient.
Re-entry requires a concrete user/business need, dependencies, acceptance
criteria, cost estimate, and updated exit gate.

## Deferred M6 - State, Search, Events, And Workers

Status: deferred from the active sequence. This section preserves the future
scope and is not an implementation checklist until multiple measured consumers
justify one shared platform over the bounded jobs/indexes owned by F5, M5, AI0,
and M7.

### Event Contracts And Outbox

- [ ] Inventory concrete consumers and define which state changes require an
      event, direct synchronous contract, cache invalidation, or reconciliation.
- [ ] Add transactional outbox ownership inside each publishing service without
      creating cross-service database access.
- [ ] Define a versioned event envelope containing event ID/type/version,
      occurred/published time, producer, aggregate identity/version, verified
      tenant/site scope, request/causation/correlation IDs, and bounded payload.
- [ ] Define additive evolution, compatibility windows, deprecation, replay,
      ordering, duplicate, and unknown-version behavior.
- [ ] Keep PII/secrets/signed URLs/tokens out of general events and define
      reference-versus-snapshot policy per consumer.
- [ ] Add idempotent consumers and prove that duplicate/redelivered events do
      not duplicate domain effects.

### Queue And Worker Runtime

- [ ] Select queue/scheduler infrastructure using measured consumers and failure
      requirements rather than trend-driven replacement.
- [ ] Define job envelope, tenant/site scope, capability, priority, attempts,
      lease/heartbeat, timeout, cancellation, idempotency key, resource class,
      and safe payload limits.
- [ ] Implement bounded retry/backoff, poison-message quarantine, dead-letter
      review/replay, and terminal failure policy.
- [ ] Enforce per-tenant/site concurrency, quotas, fairness, rate, and resource
      budgets to limit noisy neighbors.
- [ ] Define worker registration, version compatibility, graceful drain,
      deployment rollback, and reconciliation after lost leases or crashes.
- [ ] Keep Go/Rust/Python workers behind contracts; language choice cannot move
      auth, media policy, entitlement, or transactional authority into workers.

### Tenant-Scoped State, Cache, And Search

- [ ] Inventory Redis/cache/state ownership and prevent a broad state service
      from silently absorbing domain authority.
- [ ] Standardize tenant/site-aware cache keys, TTL, invalidation, stampede
      control, and deletion behavior.
- [ ] Define search-document ownership, source/version, lifecycle, ACL/filter,
      locale, index schema/version, and rebuild/alias/rollback contracts.
- [ ] Apply tenant/site and document authorization inside the search boundary.
- [ ] Reconcile source records, outbox/events, search indexes, AI indexes, CDN
      tags, and worker state using bounded repair commands.
- [ ] Add backfill/re-index controls that cannot overload live services or mix
      tenants.

### Concrete Consumers And Operations

- [ ] Migrate F5/M3S media processing to the shared worker contract only where
      the migration is narrower and evidence-backed.
- [ ] Drive M2 cache/search invalidation from authoritative content events.
- [ ] Drive AI0 ingestion/delete/re-index from versioned authorized source
      changes while preserving reconciliation as a safety net.
- [ ] Add event/queue lag, attempts, dead letters, worker saturation, index
      freshness, reconciliation drift, and per-tenant usage telemetry.
- [ ] Test broker/cache/search outage, duplicate/out-of-order events, poison
      payloads, worker crash, lost lease, partial re-index, rollback, and replay.
- [ ] Do not rewrite synchronous request paths as events without a concrete
      latency, reliability, or decoupling requirement.

### M6 Exit Gate

- [ ] At least media, CMS/search, and AI ingestion use proven versioned event or
      worker contracts where appropriate.
- [ ] Duplicate, delayed, out-of-order, poison, and lost-worker scenarios are
      bounded, observable, and recoverable.
- [ ] Cache, search, jobs, events, indexes, and telemetry preserve tenant/site
      isolation.
- [ ] Indexes can rebuild/roll back without becoming transactional authority.
- [ ] The platform has no event-driven rewrite without a named consumer and
      evidence-backed benefit.

## Deferred M1 - Commerce Expansion

- Payment-provider abstraction, confirmation, reconciliation, refunds, and
  dispute/error lifecycle.
- Production checkout/payment security and compliance scope.
- Variable products/variants, discounts/campaigns, advanced inventory,
  backorders, shipping, downloads, invoices, and previews.

Re-entry trigger: the portfolio demo becomes a real merchant workflow or a
specific employer/client demonstration requires production commerce behavior.

## Deferred M3 Breadth

- General-purpose non-destructive editor and arbitrary transform graph.
- Video metadata/thumbnails/transcoding without a selected video consumer.
- Broad provider matrix beyond the primary and bounded compatibility proof.

Re-entry trigger: a concrete product workflow cannot be satisfied by F5/M3S or
M5 asset processing.

## Deferred M4 - Streaming And Realtime

- Streaming ingest, transcoding, HLS/DASH, playback tokens, recordings, viewer
  limits, classroom/session model, presence/messaging, and shared/dedicated GPU
  streaming modes.

Re-entry trigger: a validated streaming/classroom customer scenario supplies
load, latency, rights, retention, moderation, and cost requirements.

## Deferred M8 - Extended Mobile

- Broad offline catalog/cart synchronization, push, deep links, background
  synchronization, app-specific content overrides, parent-managed mobile
  configuration, and store-release automation beyond F8/D5/M5 needs.

Re-entry trigger: measured mobile usage or a specific release requirement shows
that the F8/D5 core and M5 renderer contract are insufficient.

## Deferred S1-S5 - Full SaaS Productization

- Commercial plans/pricing/contracts/billing, parent/reseller product,
  white-label delivery, licensed-module fleet operations, regional HA,
  compliance-scale privacy, SLA/support, and Kubernetes operator.

F4/F6/F9 remain parent-, entitlement-, and operations-ready, but readiness is
not a claim that commercial SaaS productization exists.

---

# DOCUMENTATION AND EXECUTION MAINTENANCE

- [x] Keep `docs/current-focus.md` limited to one active phase/slice and move
      completed detail into durable architecture/service/package documentation.
- [ ] Keep this alternative milestone-oriented; move AI, 3D, event, media,
      frontend, mobile, and cloud specifications into dedicated documents when
      their phases become active.
- [ ] Preserve audits/reports as historical evidence and mark supersession
      explicitly rather than rewriting history.
- [ ] Give agent-indexed documents owner/status/review/supersession metadata
      without turning every source file into noisy prompt material.
- [ ] Keep generated OpenAPI/proto/client/schema artifacts stale-checked and
      never hand-edit generated output.
- [ ] Update README/product claims only after the applicable exit gate passes.
- [ ] Record commands, environment assumptions, evidence location, known
      limitations, deferred work, and rollback for every exit gate.
- [ ] Re-review NIST/OWASP/cloud/Kubernetes guidance when AI0, F9, M6, M5, and
      M7 start; do not freeze vendor-specific 2026 implementation details as
      timeless architecture.

---

# CURRENT NEXT ACTION

1. Preserve F0-F3 and the audited F4 R0-R5 checkpoint. Do not continue R6.1,
   activate dormant Realm Auth/context v3/Tenant Authority consumers, or alter
   the completed F4 evidence during the demo-first phases.
2. Execute F7 from `docs/current-focus.md`. Start with the read-only
   `apps/web` route/import/asset/configuration/build inventory and write the
   file-level admin/storefront disposition matrix before moving code.
3. Complete `F7 -> D1 -> D2 -> D3 -> D4` and close the explicitly
   default-site/single-realm P0 working web commerce demo.
4. Continue in the adopted order:
   `M2 -> F5 -> M5 -> M3S -> F8 -> F6 -> D5 -> AI0 -> M7 -> F9 -> F4`.
   General M6 remains deferred; each owning phase may implement only its bounded
   proven jobs, indexes, or cache behavior.
5. Treat M3S storage as compatibility work. Retain media-service policy and
   MinIO local storage, implement only required S3-compatible operations and
   provider-neutral tests, and send measured requirements to F9. F9 selects and
   proves the primary provider topology before any full storage structure,
   migration, replication, lifecycle/KMS, or multi-cloud work.
6. Label every pre-F4 release as default-site/single-realm. Do not claim
   cross-tenant, cross-license, realm-isolated session, or tenant-scoped
   AI/analytics behavior until resumed F4 exits.
7. The assistant runs small inspections and focused checks directly. Salar runs
   commands likely to exceed the session timeout and returns bounded results.
