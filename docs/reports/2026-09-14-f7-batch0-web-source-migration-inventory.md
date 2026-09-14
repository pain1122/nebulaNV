# F7 Batch 0 Web Source And Migration Inventory

Date: 2026-09-14

Status: complete.

Authority: this report supplies the file and runtime evidence for F7 Batch 0 in
[`docs/current-focus.md`](../current-focus.md). It does not claim F7 completion.

## Decision

F7 will retain Next.js for the admin application and create a separate Next.js
storefront. The current `apps/web` application is the code source and rollback
baseline for the admin extraction. It must not remain as a third application
after both named owners pass their gates.

The earlier Vite admin direction is optional framework work, not a requirement
for a usable admin/storefront boundary. It is deferred until a measured bundle,
runtime, deployment, or developer-experience problem justifies the migration.

## Evidence Summary

| Evidence                       | Result                                                                                                | Consequence                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Application inventory          | Only `apps/web` exists                                                                                | Separate admin and storefront owners remain an F7 implementation gap                  |
| Current framework              | Next.js 16, React 19, App Router, TypeScript                                                          | Existing code can be renamed/extracted without a framework conversion                 |
| Reachable UI routes            | Eleven `/panel` pages                                                                                 | Nine belong to admin; five of the auth pages are template-only placeholders           |
| Reachable BFF routes           | Seven `/api` handlers                                                                                 | Auth, Product, and Taxonomy behavior currently belongs with admin                     |
| Storefront UI                  | No public storefront page or layout exists                                                            | Storefront requires a clean shell rather than a copy of the panel template            |
| Current browser session        | Same-origin Next BFF, in-memory plus `sessionStorage` access token, host-only HttpOnly refresh cookie | Preserve in admin; implement an equivalent app-owned boundary for storefront          |
| Direct gateway CORS            | Registered exact origins, but `credentials: false`                                                    | A direct cross-origin Vite session would not preserve the current refresh-cookie flow |
| Gateway registrations          | `admin-web-local` at port 3000 and `storefront-web-local` at port 3008 already exist                  | The split does not require inventing application identities or activating F4          |
| Direct public asset references | 39 existing files                                                                                     | These have a known admin owner during extraction                                      |
| Stylesheet dependencies        | 97 additional existing local files                                                                    | Retain with the admin stylesheet until CSS is reduced                                 |
| Entire public template tree    | 3,782 files, about 141.47 MiB                                                                         | Most is candidate template residue; do not copy it into storefront                    |
| Current focused tests          | 6 suites and 15 tests passed                                                                          | Auth/Product/Taxonomy BFF behavior has a green migration baseline                     |
| Current type check             | Passed                                                                                                | TypeScript baseline is green                                                          |
| Current lint                   | Passed with 26 warnings and no errors                                                                 | Warnings identify template/CSS/image/hook cleanup; they do not block extraction       |
| Production build               | Passed in the current workspace; user reported completion on 2026-09-14                               | Batch 0 build baseline is green                                                       |

The code rollback point before F7 source moves is commit `3285c00`. The roadmap
and audit documentation added after that commit remains working-tree material
until its own checkpoint is committed. The unrelated untracked Realm Auth R6.1
experiment is excluded from every F7 move and command.

## Reachable Route Inventory

Next.js route groups do not appear in the URL. Every `page.tsx` and `route.ts`
below is reachable unless the application adds a guard during later F7 work.

| URL                                     | Current source                                                     | Current behavior                                                               | Proposed owner/disposition                                           |
| --------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `/panel`                                | `app/(panel)/panel/(app)/page.tsx`                                 | Five-line dashboard placeholder                                                | Admin; replace with a small real landing page                        |
| `/panel/products/list-products`         | `.../products/list-products/page.tsx` and `ListProduct.client.tsx` | Functional Product/Taxonomy-backed list and filters mixed with template markup | Admin; move and retain API behavior                                  |
| `/panel/products/add-product`           | `.../products/add-product/page.tsx` and `AddProduct.client.tsx`    | Functional create flow with several unfinished fields and template sections    | Admin; move, then narrow to supported D1 fields                      |
| `/panel/products/add-product/[id]/edit` | `.../[id]/edit/page.tsx`                                           | Reuses the add-product client in edit mode                                     | Admin; move with create flow                                         |
| `/panel/login`                          | `.../(auth)/login/page.tsx`                                        | Functional login through `/api/auth/login`                                     | Admin; preserve                                                      |
| `/panel/logout`                         | `.../(auth)/logout/page.tsx`                                       | Functional logout and local-token clearing                                     | Admin; preserve                                                      |
| `/panel/forgot-password`                | `.../(auth)/forgot-password/page.tsx`                              | Static template form with an `.html` link and no backend action                | Remove from reachable navigation; defer real recovery workflow       |
| `/panel/lock`                           | `.../(auth)/lock/page.tsx`                                         | Static user/template screen with no session contract                           | Delete after the admin shell no longer links to it                   |
| `/panel/new-password`                   | `.../(auth)/new-password/page.tsx`                                 | Static template form with no token/backend action                              | Delete; add later only with an Auth contract                         |
| `/panel/success`                        | `.../(auth)/success/page.tsx`                                      | Static success template                                                        | Delete after no route references it                                  |
| `/panel/verification`                   | `.../(auth)/verification/page.tsx` and `verification-form.tsx`     | Static OTP template plus legacy global script                                  | Delete; add later only with an Auth verification contract            |
| `/api/auth/login`                       | `app/api/auth/login/route.ts`                                      | Gateway login adapter and refresh-cookie relay                                 | Admin BFF; preserve with tests                                       |
| `/api/auth/refresh`                     | `app/api/auth/refresh/route.ts`                                    | Same-origin refresh and cookie rotation                                        | Admin BFF; preserve with tests                                       |
| `/api/auth/logout`                      | `app/api/auth/logout/route.ts`                                     | Same-origin logout; clears local refresh cookie on upstream failure            | Admin BFF; preserve with tests                                       |
| `/api/products`                         | `app/api/products/route.ts`                                        | Product list/create gateway adapter                                            | Admin BFF for F7; storefront gets only its allowed public operations |
| `/api/products/[id]`                    | `app/api/products/[id]/route.ts`                                   | Product read/update gateway adapter                                            | Admin BFF for F7                                                     |
| `/api/taxonomy`                         | `app/api/taxonomy/route.ts`                                        | Taxonomy list adapter                                                          | Admin BFF; storefront adds a public adapter only when D1 requires it |
| `/api/taxonomy/create`                  | `app/api/taxonomy/create/route.ts`                                 | Taxonomy create adapter                                                        | Admin BFF only                                                       |

There is no root storefront route, order BFF, media BFF, error boundary,
not-found boundary, loading boundary, sitemap, robots handler, or public product
route in the current application.

## Source Disposition Matrix

### Application Shell And Routes

| Source                                                           | Disposition                                                    | Reason                                                                                                    |
| ---------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `app/(panel)/layout.tsx`                                         | Move to admin, then simplify                                   | Owns panel CSS/scripts, metadata, direction, and token initialization                                     |
| `app/(panel)/PanelClientShell.tsx`                               | Move to admin, then reduce                                     | Contains 406 lines of browser theme/template behavior plus token loading                                  |
| `app/(panel)/panel/(app)/layout.tsx`                             | Move to admin                                                  | Owns authenticated panel shell composition                                                                |
| `app/(panel)/panel/(app)/Header.tsx`                             | Extract a small admin header; delete remaining markup          | 859 lines contain many fake notifications, products, brands, and `.html` links                            |
| `app/(panel)/panel/(app)/Navbar.tsx`                             | Extract only implemented admin routes; delete remaining markup | 1,622 lines contain 136 links: 105 template `.html` links, 29 inert links, and only two current app links |
| Current dashboard and product route files                        | Move to admin                                                  | They are the only implemented admin product UI                                                            |
| Functional login/logout pages and auth layout                    | Move to admin                                                  | They exercise the current browser session                                                                 |
| Forgot-password, lock, new-password, success, verification pages | Delete after reachability check                                | They are template demonstrations without matching backend behavior                                        |
| `app/(panel)/panel/(app)/test.html`                              | Delete                                                         | Unrouted copied template script with no application ownership                                             |
| All seven `app/api` handlers                                     | Move to admin with their tests                                 | They implement the current same-origin admin BFF                                                          |

### Components, Hooks, And Libraries

| Source or exact group                              | Disposition                                         | Reason                                                                                       |
| -------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/components/editor/*`                          | Move to admin                                       | Used only by product authoring; includes a Next dynamic-import wrapper                       |
| `src/components/forms/TagifyInput.tsx`             | Move to admin                                       | Used by admin taxonomy/product forms                                                         |
| `src/components/media/MediaRepeaterSection.tsx`    | Move to admin as compatibility UI                   | Current URL-list behavior is not an F5 file manager                                          |
| `src/components/products/ProductPickerField.tsx`   | Move to admin                                       | Uses admin product search intent                                                             |
| `src/components/taxonomy/AddTaxonomyOffcanvas.tsx` | Move to admin                                       | Creates taxonomy through the admin BFF                                                       |
| `src/hooks/*`                                      | Move to admin                                       | Every hook currently serves the admin product form/list                                      |
| `src/lib/api/apiFetch.ts`                          | Move to admin                                       | Coupled to current admin access-token and refresh behavior                                   |
| `src/lib/auth/*`                                   | Move to admin                                       | Current browser session implementation; storefront needs separate evidence before extraction |
| `src/lib/gateway/server-client.ts`                 | Move to admin server boundary                       | Next-specific response/cookie/gateway adapter                                                |
| `src/lib/gateway/product-adapter.ts`               | Move to admin; reconsider sharing in D1             | Currently serves only admin Product routes                                                   |
| `src/lib/unknown.ts`                               | Move to admin initially                             | Small parsing helper with only current admin consumers                                       |
| `src/types/*`                                      | Move to admin while their template libraries remain | Current declarations serve Lord Icon and Tagify admin code                                   |
| `test/*.spec.ts`                                   | Move with the admin/BFF sources                     | All six suites verify current admin compatibility behavior                                   |

No current component has two demonstrated application consumers, so F7 should
not create a shared frontend package during the initial move. Extract a shared
primitive only after the storefront provides a second real use.

### Configuration And Delivery

| Source                                                                      | Disposition                                                                  |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `apps/web/package.json`, TypeScript, Jest, ESLint, PostCSS, and Next config | Use as the admin baseline; rename package and scripts during cutover         |
| `apps/web/.env.example`                                                     | Move to admin and retain its three server-only values                        |
| Root `dev:web` and `test:web:current` scripts                               | Keep through parity; replace with named admin/storefront commands at cutover |
| `.github/workflows/ci.yml` web test                                         | Keep through parity; split after both named apps exist                       |
| Docker/Compose                                                              | No web service is currently defined                                          | F7 owns build/runtime commands; F9 owns final cloud topology                      |
| `apps/web/README.md`                                                        | Replace                                                                      | It is unchanged create-next-app boilerplate and describes files that do not exist |

## Asset Inventory And Policy

`apps/web/public/assets` contains 3,782 files and about 141.47 MiB:

| Group    | Files | Approximate size | Disposition                                                                                                                        |
| -------- | ----: | ---------------: | ---------------------------------------------------------------------------------------------------------------------------------- |
| `css`    |     9 |         5.80 MiB | Move only active admin entry styles, then reduce                                                                                   |
| `fonts`  |    93 |        20.71 MiB | Retain the 97-file stylesheet dependency closure temporarily; select final Persian/Latin families later                            |
| `images` |   925 |        33.90 MiB | Move the 39 direct source references; retain CSS-dependent images temporarily; delete unused template sets after runtime proof     |
| `js`     |   142 |         2.21 MiB | Retain only scripts loaded by the active layout until their React replacements exist                                               |
| `json`   |    24 |         0.15 MiB | No direct application owner found; candidate deletion                                                                              |
| `lang`   |     9 |         0.07 MiB | No current application import found; candidate deletion                                                                            |
| `libs`   | 2,580 |        78.64 MiB | Do not copy to storefront; retain only the seven layout entry scripts/styles and required transitive files during admin extraction |

The source directly references 39 existing asset files. The active CSS entry
files reference 97 additional existing local files, producing a known 136-file,
22.10 MiB compatibility closure. The broad `app-rtl.min.css` also mentions many
template backgrounds and remote Google Font URLs, so CSS reduction must precede
claims that the final admin bundle is clean. The remaining asset tree is
classified as stale/unfinished template implementation, pending deletion after
the migrated admin runtime proves it is unreachable.

The root `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, and `window.svg` are
unused create-next-app assets and can be deleted during cutover.

## Framework Decision Evidence

### Current implementation

The admin UI, its seven BFF routes, session-cookie relay, route navigation,
images, dynamic editor import, script loading, tests, and build configuration
are all implemented in Next.js. The focused behavior and type checks pass.

### Confirmed gap

The repository lacks separate named admin and storefront applications. There is
no confirmed defect caused by Next.js being the admin framework.

### Why a Vite conversion is not the narrow correction

A Vite SPA cannot own the current Next route handlers. Direct cross-origin
gateway access also cannot preserve the current refresh-cookie behavior because
gateway CORS deliberately returns `credentials: false`. A viable Vite release
would therefore require a same-origin reverse proxy/static-host contract or a
new companion BFF, replacement routing/image/dynamic-import code, and rewritten
BFF tests. Those changes solve framework migration rather than the missing
product boundary.

### Compatibility and maintenance cost

Keeping Next.js allows the admin source and tests to move with small path/package
changes and leaves one framework/toolchain for both applications. Its cost is a
larger admin runtime than a pure SPA and continued server ownership. If measured
F7/F9 evidence later shows that cost matters, Vite can be reconsidered with a
concrete same-origin deployment plan.

Classification: preserving Next.js is the narrow F7 implementation choice.
Moving admin to Vite is optional future optimization.

## Frozen Migration Order

1. Preserve `apps/web` unchanged as the source-level rollback baseline while
   creating the named application directories.
2. Create `apps/admin` from the current Next configuration and move only the
   functional panel, BFF, library, and test inventory above.
3. Reduce admin Header/Navbar/auth placeholders immediately so the broad
   template does not become accepted product behavior.
4. Create `apps/storefront` as a clean Next.js application on port 3008 using
   `storefront-web-local`; do not copy admin routes or public assets.
5. Add equivalent storefront auth/session behavior against its own configured
   origin/client and add only the public shell required by F7.
6. Extract shared primitives only when both applications use the exact behavior.
7. Run named lint, type, tests, production builds, and focused browser proof.
8. Remove `apps/web` and old root/CI commands only after both named owners pass;
   record the final rollback commit.

Temporary coexistence during steps 2-7 is a migration state, not a supported
three-application architecture.

## Finding Classification

| Finding                                       | Classification                                 | Treatment                                                       |
| --------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| Missing admin/storefront split                | Confirmed F7 implementation gap                | Execute the frozen migration order                              |
| Missing storefront routes and UI              | Confirmed F7 implementation gap                | Build a clean storefront shell                                  |
| Static auth pages without backend actions     | Stale/unfinished implementation                | Remove from reachability; do not present as working features    |
| Header/Navbar template links and sample data  | Stale/unfinished implementation                | Replace with implemented routes and real states                 |
| `test.html` and create-next-app assets/readme | Stale implementation                           | Delete during cutover                                           |
| 141.47 MiB template asset tree                | Stale/unfinished implementation                | Preserve known compatibility closure, prune after runtime proof |
| Twenty-six lint warnings                      | Confirmed cleanup debt, currently non-blocking | Fix when the owning source is reduced/moved                     |
| No error/loading/not-found route boundaries   | Confirmed F7 implementation gap                | Add in admin/storefront batches                                 |
| Vite admin migration                          | Optional optimization                          | Deferred pending measured evidence                              |
| Final reverse proxy/container/cloud topology  | Future F9 consideration                        | Keep runtime seams; decide in F9                                |
| Tenant/realm/capability selectors             | Deferred F4/F6 work                            | Do not add in F7                                                |

## Verification

Completed locally on 2026-09-14:

```text
pnpm test:web:current          PASS: 6 suites, 15 tests
pnpm --filter web check-types PASS
pnpm --filter web lint        PASS: 0 errors, 26 warnings
```

User-run production build completed on 2026-09-14:

```powershell
pnpm --filter web build
```

Batch 0 is closed. The next implementation step is the named admin/storefront
application boundary.
