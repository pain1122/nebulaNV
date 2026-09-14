# Current Focus

Last updated: 2026-09-14

Status: active planning and execution checklist.

## Active Slice

F7 - Web And Admin Foundation.

The adopted demo-first sequence is:

```text
F7 -> D1 -> D2 -> D3 -> D4 -> P0 working web commerce demo
-> M2 -> F5 -> M5 -> M3S
-> F8 -> F6 -> D5 -> P1 commerce portfolio release
-> AI0 -> M7 -> F9 -> resume F4 at R6.1
```

`TODO-ALTERNATIVE.md` owns this order. F4 R0-R5 is preserved at commit
`3285c00` and paused. Its detailed state is recorded in:

- [F4 implementation depth audit](reports/2026-09-12-f4-implementation-depth-audit.md)
- [F4 paused execution checklist](reports/2026-09-14-f4-paused-execution-checklist.md)
- [F4 Batch 3R execution ledger](reports/2026-09-01-f4-batch3r-execution-checklist.md)

Unchecked items in this file are planned work. They do not claim that the
behavior exists.

## Current Goal

Turn the existing combined `apps/web` application into a clear admin and
storefront product boundary while preserving the completed F3 gateway-only API
path.

F7 must produce two independently buildable user-facing applications with real
authentication, gateway client usage, failure states, accessibility, RTL, and
test foundations. It must reuse working code deliberately rather than copying
the current template into two permanent owners.

F7 operates in explicit default-realm/single-site compatibility mode. It does
not resume Realm Auth, enable context v3, replace the static gateway registry,
perform tenant/domain backfills, build F5 processing, or invent F6 capability
and licensing behavior.

## Repository Truth At Entry

| Area                  | Current implementation                                                                                                                | F7 consequence                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Frontend applications | Only `apps/web` exists. There is no `apps/admin` or `apps/storefront`.                                                                | The split is a planned F7 implementation gap.                                        |
| Framework             | `apps/web` is Next.js 16 with React 19 and TypeScript.                                                                                | Inventory reusable React/UI code before choosing migration mechanics.                |
| Current role          | `apps/web` combines an administration panel, BFF routes, template assets, and partial product UI.                                     | Do not retain it as an accidental third product after the split.                     |
| Gateway boundary      | Server code uses `@nebula/api-client` and one gateway base URL/public client/origin contract.                                         | Preserve this working F3 mechanism in both final applications.                       |
| Auth BFF              | Login, refresh, and logout routes exist with focused tests; logout clears the host-only refresh cookie even when remote logout fails. | Reuse the proven cookie/session behavior through an explicit app-owned BFF boundary. |
| Product BFF           | Product list/create/get/update adapters and tests exist.                                                                              | Move or reuse them from one named owner; do not duplicate DTO mapping.               |
| Taxonomy BFF          | Product taxonomy list/create adapters and tests exist.                                                                                | Preserve gateway envelope, kind mapping, and idempotency behavior.                   |
| Order/media BFF       | No current `apps/web/app/api` order or media route family was found.                                                                  | Treat these as later D3/F5 consumer work, not hidden F7 completion.                  |
| Admin UI              | Product list/add/edit work exists among a large imported panel template and many placeholder/static HTML links.                       | Separate working product UI from unused template inventory before moving files.      |
| Storefront            | No dedicated public storefront application was found.                                                                                 | Build a bounded shell from current product needs; do not clone the admin template.   |
| Shared frontend       | No dedicated shared frontend package is present.                                                                                      | Create one only after the inventory proves stable shared code.                       |
| F4 foundation         | Tenant Authority, Realm Auth shadow, actor backfills, and V3 receivers are dormant or compatibility-only.                             | Preserve them; F7 uses the active F3/default-site path.                              |
| Working tree          | Untracked R6.1 Realm Auth experiment files remain outside the committed baseline.                                                     | Do not edit, import, test, delete, or move them during F7.                           |

## Finding Classification

| Finding                                                                      | Classification                            | Treatment                                                               |
| ---------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------- |
| Missing separate admin/storefront applications                               | Planned F7 implementation gap             | Close through the ordered batches below.                                |
| Current `apps/web` combines several responsibilities                         | Planned migration problem                 | Produce a source/disposition inventory before any bulk move.            |
| Existing Auth/product/taxonomy gateway adapters work and have focused tests  | Confirmed working mechanism               | Preserve or move with behavior-parity tests.                            |
| Template contains placeholder HTML links and broad unused assets             | Stale/unfinished UI implementation        | Identify reachable use before retaining it in the final admin bundle.   |
| A shared design-system package does not exist                                | Expected state                            | Add only the primitives actually shared by both applications.           |
| General tenant/site and capability behavior is unavailable                   | Deferred implementation, not an F7 defect | Label the release single-site; do not create fake selectors or claims.  |
| Replacing Next.js with Vite for admin adds migration/session deployment work | Optional optimization                     | Retain Next.js for F7; reconsider only from measured evidence.          |
| Full visual redesign during the split                                        | Optional product work                     | Keep outside the migration unless required for usability/accessibility. |
| Multi-app hosting/CDN/Kubernetes layout                                      | Future F9 consideration                   | Preserve build/runtime seams; do not select cloud topology in F7.       |

## Execution Contract

Each batch must:

1. inspect current routes, imports, assets, tests, configuration, and build
   behavior before moving code;
2. preserve a runnable checkpoint and use narrow reversible moves;
3. keep external API access through the gateway and generated external client;
4. add focused tests for changed behavior rather than snapshotting template
   markup;
5. classify discovered gaps before expanding the phase;
6. keep default-site/single-realm limitations visible in documentation;
7. leave long builds, full browser matrices, Compose boot, and broad live/e2e
   commands to Salar when they risk the session timeout.

## Batch 0 - Source And Migration Inventory

- [x] Enumerate every reachable `apps/web` route and classify it as admin,
      storefront, shared/BFF, template example, static asset, or obsolete.
- [x] Trace imports for Auth, product, taxonomy, media, layout, localization,
      fonts, CSS, scripts, and browser-only libraries.
- [x] Identify which public assets are referenced by reachable routes and which
      belong only to unused template examples.
- [x] Record current environment variables, public client/origin behavior,
      cookies, ports, build output, Docker/Compose/release ownership, and CI
      commands.
- [x] Run the focused current web tests, type check, lint, and a user-run build
      if it exceeds the session budget.
- [x] `pnpm test:web:current`, the web type check, web lint, and the user-run
      production build pass.
- [x] Produce a file-level disposition matrix: move to admin, move to
      storefront, extract after proven sharing, retain temporarily, or delete
      after evidence.
- [x] Retain Next.js for admin in F7. Vite adds an unproven proxy/session and
      framework migration without closing the application-boundary gap.
- [x] Freeze the migration order and rollback point before creating permanent
      new application owners.

Batch 0 evidence and the exact source/asset disposition are recorded in
[the F7 web source and migration inventory](reports/2026-09-14-f7-batch0-web-source-migration-inventory.md).

### Batch 0 Exit

- [x] Every reachable current route and required asset has exactly one proposed
      owner.
- [x] No working BFF/cookie/gateway behavior is left without an owner.
- [x] The admin framework choice is supported by current dependency evidence.
- [x] The split can be executed without maintaining three long-lived apps.

## Batch 1 - Application And Shared Boundaries

- [ ] Scaffold `apps/admin` and `apps/storefront` with distinct package names,
      ports, environment examples, type checks, lint, tests, and builds.
- [ ] Define which application owns browser-facing Auth BFF/session-cookie
      behavior and how the other application uses an equivalent safe boundary.
- [ ] Share only proven UI primitives, tokens, intent schemas, localization
      helpers, and the external API client.
- [ ] Keep application configuration, route components, application state, server
      adapters, and product-specific UI in their owning applications.
- [ ] Give admin and storefront distinct F3 public client IDs/origins while
      retaining the configured default tenant/site compatibility records.
- [ ] Add explicit loading, empty, denied, expired, unavailable, and unexpected
      error primitives without exposing internal error details.
- [ ] Establish Persian/English localization, RTL/LTR switching, font ownership,
      theme tokens, accessibility linting, and test utilities.

### Batch 1 Exit

- [ ] Both shells build and test independently.
- [ ] Neither imports Prisma, internal gRPC clients, service URLs, or S2S keys.
- [ ] Shared code has two real consumers and no application-owned policy.
- [ ] No dormant F4 mechanism or invented capability contract is activated.

## Batch 2 - Authentication And Gateway Client Parity

- [ ] Move or reimplement login, refresh, logout, protected-route, and cookie
      behavior with parity against the current focused tests.
- [ ] Preserve the gateway error envelope, request ID, public client/origin, and
      refresh-cookie rotation/expiry contract.
- [ ] Define admin and storefront session UX for expired, denied, dependency
      unavailable, and logout failure states.
- [ ] Ensure browser code cannot construct trusted S2S/context metadata or call
      backend service ports.
- [ ] Add negative tests for wrong origin/client, missing/expired access token,
      failed refresh, malformed gateway errors, and open-redirect attempts.
- [ ] Keep the existing Auth/User runtime authoritative; do not start F4 R6.1.

### Batch 2 Exit

- [ ] Admin and storefront authentication paths work through the gateway.
- [ ] Cookie/token material is not exposed to unrelated client code.
- [ ] Existing F3 Auth BFF behavior remains covered or is superseded by equal
      evidence in the new owner.
- [ ] Removing the old route cannot break an untracked consumer.

## Batch 3 - Admin Extraction

- [ ] Move the reachable admin shell, navigation, product list, add/edit flow,
      and taxonomy controls according to the disposition matrix.
- [ ] Replace placeholder HTML links in reachable navigation with typed routes
      or remove them.
- [ ] Preserve product DTO mapping, taxonomy kind mapping, pagination,
      validation, idempotency, and conflict behavior.
- [ ] Add reusable list/form/filter/pagination/error patterns only from the
      implemented product screens.
- [ ] Add a current-role-aware navigation boundary without inventing F6
      entitlement or F4 parent-target behavior.
- [ ] Keep current Media selection usable through approved gateway/media
      contracts; F5 processing states remain later work.
- [ ] Remove or quarantine unused template pages/assets only after import,
      route, CSS, and runtime checks prove they are unreachable.

### Batch 3 Exit

- [ ] An authorized admin can log in and use the migrated product/taxonomy
      workflows through gateway APIs.
- [ ] Insufficient-role, validation, conflict, expired-session, empty, and
      unavailable states are visible and tested.
- [ ] The admin output does not contain a second full copy of unused template
      assets.
- [ ] `apps/web` no longer owns migrated admin behavior.

## Batch 4 - Storefront Foundation

- [ ] Implement the public storefront shell, default-site branding/theme,
      navigation, product list/detail skeleton, error/not-found boundaries, and
      authentication entry points.
- [ ] Use only public gateway operations for anonymous data and the approved
      Auth BFF/session path for authenticated behavior.
- [ ] Establish SEO title/description, canonical, robots, sitemap input, and
      structured-data seams without fabricating D1-D4 product behavior.
- [ ] Add a media component that consumes gateway/media URLs and handles missing,
      denied, expired, and unavailable media.
- [ ] Implement accessible responsive navigation, loading, empty, and fallback
      states with Persian RTL and English LTR evidence.
- [ ] Add placeholders for CMS/AI/showroom only when they communicate a real
      unavailable capability; do not ship fake functional cards.

### Batch 4 Exit

- [ ] Storefront builds independently and serves a coherent public shell.
- [ ] No storefront bundle contains admin-only UI, storage credentials, internal
      clients, or service URLs.
- [ ] Public/authenticated boundaries and SEO/accessibility foundations pass
      focused tests.
- [ ] The shell is ready for D1-D4 without claiming those commerce flows exist.

## Batch 5 - Cutover, Regression, And F7 Exit

- [ ] Update workspace, root scripts, Docker/Compose/release inventory, CI,
      environment examples, and documentation for the two applications.
- [ ] Update F3 application registry defaults only as needed to preserve the
      existing admin/storefront public-client and origin boundary.
- [ ] Run generated external-client/OpenAPI stale checks and focused gateway/web
      contract tests.
- [ ] Run lint, type checks, unit/integration tests, production builds, and
      selected browser e2e for both applications.
- [ ] Verify the release exposes only gateway APIs plus approved media data-plane
      URLs.
- [ ] Prove no reachable route or required asset still depends on the legacy
      combined application.
- [ ] Remove or archive `apps/web` only after both replacements pass and the
      rollback point is recorded.
- [ ] Record exact commands, environment, limitations, retained template debt,
      bundle/build results, and rollback in a dated F7 exit report.

### F7 Exit

- [ ] Admin and storefront build, test, and deploy independently.
- [ ] Both use only gateway APIs and approved media data-plane URLs.
- [ ] Authentication, current application context, request IDs, errors,
      accessibility, localization, RTL/LTR, and core failure states are tested.
- [ ] Neither application owns backend contracts, identity/tenant policy,
      storage policy, Prisma, internal gRPC, or service addresses.
- [ ] The current single-site/default-realm limitation is explicit.
- [ ] F3 regression evidence remains green.
- [ ] D1 becomes the next active phase.

## Guardrails

- Preserve F4 R0-R5 code, migrations, records, reports, and dormant runtime
  boundaries. Do not continue R6.1 during F7.
- Do not touch the untracked R6.1 experiment without a separate user decision.
- Do not add tenant selectors, parent-target UI, realm/provider UI, entitlement
  dashboards, or cross-tenant claims.
- Do not begin D1 domain changes while F7 migration decisions are still open.
- Do not begin F5 workers, M3S storage abstraction, M5 rendering, F8 mobile, F6
  modules, AI0, M7, F9, or general M6 work inside F7.
- Preserve working Auth/product/taxonomy BFF behavior until its final owner has
  equal focused evidence.
- Do not duplicate generated API types or hand-edit generated artifacts.
- Do not bulk-copy the imported template into both applications.
- Keep product behavior usable throughout the split and prefer reversible
  route/package moves.
- Preserve unrelated dirty work.

## Next Action

Batch 0 is closed. Begin Batch 1 with the named Next.js admin extraction and a
clean storefront shell. Use the recorded commit as the source rollback point,
do not touch the R6.1 experiment, and do not copy the panel template into the
storefront.
