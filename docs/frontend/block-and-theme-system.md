# NebulaNV Block And Theme System

Status: Planned client-side phase.

This is a future frontend composition direction for NebulaNV. It is not part of the current backend/media stabilization scope.

## Purpose

NebulaNV should not become a generic Elementor-style page builder. The target is a curated, performance-first block and theme system built specifically for NebulaNV storefronts, admin/client views, and later mobile apps.

The goal is to let clients compose polished pages and app screens from approved UI building blocks while keeping the output fast, accessible, SEO-aware, and deeply integrated with NebulaNV service contracts.

## Core Model

Use a layered composition model:

```txt
Page or screen
-> Section or row
-> Layout preset
-> Slots or columns
-> Blocks inside slots
```

A block can be a full-width section, but it does not have to be. A section can contain multiple slots, such as a `2/3 + 1/3` layout where a product slider sits beside a promo banner.

Example:

```ts
{
  type: "section",
  layout: "featured-commerce-row",
  slots: [
    {
      id: "featured-products",
      block: {
        id: "block-instance-uuid",
        type: "product-slider",
        version: 1,
        props: {
          source: { type: "featured", limit: 8 },
          variant: "editorial"
        }
      },
      intent: {
        role: "primary",
        priority: 2,
        density: "comfortable"
      },
      renderers: {
        web: {
          desktop: { span: 8, order: 1 },
          tablet: { span: 6, order: 1 },
          mobile: { span: 12, order: 2 }
        },
        native: {
          presentation: "horizontal-carousel",
          order: 2
        }
      }
    },
    {
      id: "sale-banner",
      block: {
        id: "block-instance-uuid",
        type: "promo-banner",
        version: 1,
        props: {
          mediaId: "media-uuid",
          href: "/sale"
        }
      },
      intent: {
        role: "secondary",
        priority: 1,
        density: "compact"
      },
      renderers: {
        web: {
          desktop: { span: 4, order: 2 },
          tablet: { span: 6, order: 2 },
          mobile: { span: 12, order: 1 }
        },
        native: {
          presentation: "card",
          order: 1
        }
      }
    }
  ]
}
```

This allows grid shifts such as:

```txt
Desktop:
[ product slider 2/3 ][ banner 1/3 ]

Tablet:
[ product slider 1/2 ][ banner 1/2 ]

Mobile web:
[ banner ]
[ product slider ]
```

## Shared Schema, Platform Renderers

The composition schema should describe what appears and how it is arranged. Each platform should render it in its own optimized way.

```txt
Shared composition schema
Shared theme tokens
Shared data bindings

Next.js web renderer
React Native or Flutter mobile renderer
Admin editor/configuration UI
```

The mobile app should not be treated as only the mobile breakpoint of the website. It should reuse schema, theme, and data concepts, but render native mobile components with app-specific navigation, gestures, caching, and screen density.

The shared layer should communicate meaning, not web implementation details. Shared fields can describe role, priority, density, data source, variant, and desired presentation. Renderer fields can then translate that meaning into CSS grid on web or native list/card/carousel behavior on mobile.

This prevents the composition model from quietly becoming a CSS-grid schema with a mobile renderer forced on top.

## Block Versioning And Registry

Every block instance should carry its block type and schema version from the beginning.

```ts
{
  id: "block-instance-uuid",
  type: "product-slider",
  version: 1,
  props: {}
}
```

Block definitions should live in a registry. The registry owns the current version, validation schema, migration rules, platform support, theme support, allowed slot types, fallback behavior, and rough performance cost.

Conceptual shape:

```ts
type BlockDefinition = {
  type: string;
  currentVersion: number;
  supportedPlatforms: Array<"web" | "native" | "editor">;
  allowedSlots: string[];
  fallback?: string;
  schema: unknown;
  migrate: (fromVersion: number, props: unknown) => unknown;
};
```

Without versioning, published pages can break when a component evolves. With versioning, old configurations can be migrated deliberately and tested before publishing.

## Declarative Data Binding

Block configuration should store safe data requests, not copied service records.

Good:

```ts
{
  type: "product-grid",
  version: 1,
  props: {
    source: {
      type: "category",
      categoryId: "category-uuid",
      sort: "featured",
      limit: 8
    },
    variant: "editorial"
  }
}
```

Bad:

```ts
{
  type: "product-grid",
  props: {
    products: [
      { id: "...", title: "...", price: "..." }
    ]
  }
}
```

The renderer should resolve product, blog, taxonomy, media, menu, and settings data through NebulaNV services at render time. Data bindings should be declarative, allowlisted, validated, and resolved server-side so content does not become stale, duplicated, or detached from service ownership.

## Space-Aware Blocks

Blocks should understand the space they are placed into. For example, a product slider can show more items in a full-width slot and fewer items in a narrow slot.

Example behavior:

```txt
Full width slot: show 4 product cards
2/3 slot: show 3 product cards
1/2 slot: show 2 product cards
1/3 slot: show 1 compact card or banner-style product
```

For web, this should be driven mostly by CSS grid, CSS container queries, and block density rules. Container-aware styling lets the component respond to its parent slot size instead of relying only on the viewport.

For mobile apps, the native renderer should interpret the same intent as native list, carousel, stack, or card behavior.

## Next.js SSR Strategy

The web renderer can still use Next.js SSR and React Server Components.

Recommended approach:

- Server-render the page schema, section structure, block data, and initial product/blog/media content.
- Let CSS grid and container queries handle most visual adaptation after render.
- Use small client components only for real interactivity such as carousels, gestures, tabs, or editor controls.
- Avoid server-rendering completely different HTML based on unknown browser width to prevent hydration mismatch.
- Fetch a bounded dataset appropriate to the block, render the complete bounded set, and let grid/container rules determine cards per row.
- Interactive sliders may render a modest buffer beyond the initially visible cards, but should not routinely hide large amounts of server-rendered content with CSS.
- Use media IDs and media-service render URLs, not raw storage URLs.
- Use responsive image sizing so narrow slots and mobile layouts do not download unnecessarily large assets.

This keeps pages SEO-friendly and fast while still allowing intelligent responsive behavior.

## Canonical Schema Technology

The persisted composition contract should be JSON-compatible and validated from one canonical schema source.

The implementation must choose one source of truth before this phase starts. Good candidates are:

- JSON Schema as the stored/runtime artifact.
- TypeBox-style schemas that generate JSON Schema and TypeScript types.
- Zod-style schemas only if they can reliably emit JSON-compatible schemas for editor/API use.

Do not maintain unrelated TypeScript interfaces, runtime validators, editor forms, and migration test schemas by hand.

The canonical schema source should support:

- runtime validation
- editor form generation
- API validation
- generated TypeScript types
- migration tests
- persisted JSON compatibility

The safest architectural target is a JSON Schema-compatible contract, even if the authoring ergonomics are provided by a TypeScript schema library.

## Version Scope

Block versioning is required but not enough. The persisted model should version every contract layer that can evolve independently.

Likely version fields:

- `compositionSchemaVersion`
- `pageRevisionVersion`
- block `type` and `version`
- theme version
- layout-preset version
- data-binding contract version when needed
- renderer capability manifest version when needed

A block may remain unchanged while the surrounding page schema, theme contract, layout preset, or data-binding contract evolves.

## Ownership And Tenant Context

Compositions should carry ownership and publishing context from the beginning, even before full multi-tenancy is implemented.

Important fields:

- `siteId`
- future `tenantId`
- locale
- author identity
- last editor identity
- publishing actor identity
- ownership and permission metadata
- created, updated, previewed, published, restored timestamps

Saved sections, themes, page revisions, and reusable presets should all have clear ownership. Retrofitting ownership later across every composition artifact will be painful and risky.

## Publishing And Revisions

Draft, preview, publish, and restore should become a formal model, not only an editor feature.

Likely entities:

- `Page`
- `PageRevision`
- `publishedRevisionId`
- editable draft revision
- immutable published revisions
- publishing metadata
- author/editor identity
- created, updated, previewed, and published timestamps

Publishing should be atomic. A renderer should receive either the previous complete revision or the new complete revision, never a partially edited page.

Preview links should be short-lived or securely signed, inaccessible to search engines, sent with `noindex`, and prevented from exposing protected or strict content.

## Publishing Concurrency

Atomic publishing protects public readers, but editors also need protection from overwriting each other.

Use one or more of these strategies:

- optimistic locking with revision number
- `updatedAt` comparison
- explicit draft ownership/locking
- conflict UI when two editors modify the same draft
- audit history for publish, restore, and destructive editor actions

The system should never silently overwrite another editor's draft or publish action.

## Cache Invalidation

SSR/RSC rendering needs a dependency model so the site can update precisely without flushing everything.

A rendered page may depend on:

- page revision
- theme version
- block definition versions
- product records
- category/taxonomy records
- media records
- blog posts
- menus
- settings

Each block definition should expose cache tags or dependency hints.

Example tags:

```txt
page:home
theme:luxury-v1
block:product-slider:v1
category:kitchen-appliances
media:abc123
settings:storefront
```

When product, media, settings, or page content changes, the renderer can invalidate the relevant tags instead of rebuilding the entire storefront.

## Runtime Failure Behavior

Public rendering should isolate most block failures instead of making the whole storefront unavailable.

Define explicit behavior for common failure cases:

| Case | Preferred behavior |
| --- | --- |
| old block type no longer exists | render fallback block or skip block; show editor warning |
| block migration fails | keep last valid published revision; mark revision as needing repair |
| product/blog/settings service unavailable | serve cached/last valid data where safe; otherwise render block fallback |
| referenced media was deleted | render approved placeholder/fallback; show editor warning |
| native renderer has no component | use manifest fallback or omit unsupported block on native |
| block props fail validation | skip block or fallback; block publishing until fixed in drafts |
| one block times out | render rest of page and isolate timed-out block |
| protected/strict media requested by public block | fail validation and block publish |

Editor previews can show detailed warnings. Public storefront pages should prefer stable fallback behavior and last valid published revisions.

## Renderer Capabilities

Not every block will exist on every platform. The block manifest should declare support explicitly.

Example:

```ts
{
  type: "three-dimensional-showroom",
  platforms: {
    web: "supported",
    native: "fallback",
    editor: "preview-only"
  },
  fallback: "media-gallery",
  ssr: false,
  clientRuntime: "required"
}
```

This avoids promising impossible parity. For the first release, native apps should remain out of implementation scope while the schema preserves a clean path for them.

## Smart Slot Rules

Slots should declare what kinds of blocks they allow.

Examples:

- A `1/3` sidebar slot may allow promo banners, compact product cards, countdowns, trust badges, and small testimonials.
- A full-width slot may allow hero sections, product grids, media galleries, and rich content blocks.
- Checkout, profile, order, and auth-related app blocks should be locked down more tightly than marketing/content blocks.

Smart slot rules should prevent clients from placing visually or functionally unsuitable blocks into narrow or sensitive areas.

## Composition Boundaries

Marketing and discovery pages are safer composition targets than transactional application screens.

Good early targets:

- homepage
- category landing pages
- campaign pages
- editorial pages
- product discovery pages
- content-rich static pages

Tightly controlled targets:

- checkout
- authentication
- account settings
- orders
- payment
- profile
- permission-sensitive admin screens

For V1, transactional screens should remain coded application routes. Later they can reuse theme tokens and approved components without becoming freely composable pages.

## Theme Tokens

Themes should define shared visual rules instead of forcing each block to be edited independently.

Examples:

- Typography scale
- Color palette
- Button style
- Card style
- Border radius
- Section spacing
- Container width
- Shadow/elevation level
- Motion style

Blocks should adapt to the active theme while keeping their structure and data contract stable.

## Localization And RTL

Localization and RTL should be planned early, not patched in later.

The schema should choose between localized content fields:

```ts
{
  title: {
    en: "Featured products",
    fa: "محصولات ویژه"
  }
}
```

or translation keys:

```ts
{
  titleKey: "homepage.featuredProducts"
}
```

The renderer and theme system should account for RTL layout, mirrored directional icons, locale-specific typography, different text lengths, localized media, locale-specific slugs, and locale-specific SEO metadata.

## NebulaNV Data Integration

Blocks should be domain-aware and use NebulaNV service contracts.

Examples:

- Product blocks read product/product-category data.
- Blog blocks read post/category/tag data.
- Media blocks use media IDs and `GET /media/render/:id?variant=web`.
- Taxonomy blocks use taxonomy-service contracts.
- Settings blocks use site identity, menu, SEO, and layout settings.
- Auth/user/order/profile app blocks respect authenticated context and service permissions.

The builder should configure safe props and data bindings, not arbitrary raw code.

## Rich Content And URL Security

Even without arbitrary HTML, editable text and links create security risk.

Rules to define before implementation:

- sanitize rich text at input and render boundaries
- allow only approved rich-text marks and nodes
- allow only safe URL protocols such as `https`, `http`, `mailto`, `tel`, and internal routes
- reject `javascript:` URLs and unsafe `data:` URLs
- normalize and validate internal links
- define external-link behavior, including `rel` and target rules
- keep iframe/embed providers allowlisted
- keep custom embeds compatible with Content Security Policy
- treat any raw HTML block as out of V1 scope or heavily sandboxed

The editor should store structured rich text or sanitized content, not unchecked HTML strings.

## Accessibility Rules

The editor should prevent common accessibility problems before publication.

Examples:

- required alt text for meaningful images
- explicit decorative-image option
- heading-level validation
- only one page-level `h1`
- CTA text requirements
- accessible carousel controls
- contrast checking for theme token combinations
- no empty links
- warnings when important text is embedded inside images
- reduced-motion compatibility for animated blocks

This is one of the best reasons to keep the system curated instead of free-form.

## Performance Budgets

Performance-first should become measurable.

A block manifest can expose a rough cost profile:

```ts
{
  cost: {
    clientJavaScript: "low",
    mediaWeight: "medium",
    interaction: "client",
    aboveFoldRecommended: false
  }
}
```

At publish time, the editor can warn about too many client components, too many sliders, autoplaying videos, excessive above-the-fold media, oversized hero images, too many web fonts, large animation dependencies, too many blocks on one page, or excessive third-party scripts.

The first version can use simple warning rules. Later versions can calculate page-level budgets from real bundle and media data.

## Test Strategy

The architecture needs tests before it becomes a production page system.

Required test categories:

- schema validation tests
- block registry tests
- block migration tests
- renderer component/snapshot tests
- SSR/RSC rendering tests
- accessibility tests
- theme compatibility tests
- RTL/localization tests
- publish/restore integration tests
- cache invalidation tests
- missing-service and missing-media tests
- runtime fallback tests
- performance-budget tests
- URL/rich-content sanitization tests

Important invariant:

Every supported published block version must either render successfully or migrate successfully to a supported version.

## Useful Future Features

- Saved sections reusable across pages.
- Block variants such as minimal, editorial, compact, luxury, boxed, or media-heavy.
- Breakpoint preview tabs for desktop, tablet, mobile web, and app.
- Per-breakpoint visibility and ordering.
- Draft, preview, publish, and version restore.
- SEO and accessibility warnings.
- Performance budgets that warn about too many heavy blocks, videos, sliders, or client-only widgets.
- Recommended layout presets based on page goal, theme, and device priority.

## Guardrails

- Keep the system curated and preset-driven.
- Do not allow arbitrary CSS/HTML injection as the default model.
- Keep shared schema intent-oriented; do not let it become web CSS with a native renderer bolted on.
- Version every block instance and migrate old props through registry-owned migrations.
- Version page, revision, theme, layout-preset, and data-binding contracts where they can evolve independently.
- Use one canonical JSON-compatible schema source for runtime validation, API validation, generated types, editor forms, and migration tests.
- Store declarative data bindings, not copied service records.
- Carry site, future tenant, locale, ownership, and publishing identity on composition records.
- Keep published revisions immutable and publish atomically.
- Protect editor drafts with concurrency control.
- Track cache dependencies so data updates can invalidate precise pages and blocks.
- Define runtime fallback behavior for missing blocks, failed migrations, unavailable services, deleted media, validation errors, and unsupported renderers.
- Declare renderer/platform capability and fallback behavior per block.
- Do not make the block editor responsible for backend policy.
- Do not bypass media-service for protected or strict media.
- Do not emit storage provider URLs, private filenames, or presigned/admin URLs into SEO output.
- Sanitize rich text and validate URLs through allowlisted protocols, internal-link rules, embed allowlists, and CSP-compatible rendering.
- Keep mobile app rendering native, not a forced web layout.
- Keep transactional/auth/payment/account/order flows out of free-form composition for V1.
- Treat localization, RTL, accessibility, and performance budgets as schema/editor concerns.
- Keep the launch backend stable before starting this phase.

## Architecture Risks To Watch

- Schema drift: block props change but old published pages still exist. Mitigate with versioned block instances and migrations.
- Schema split-brain: TypeScript types, runtime validators, API contracts, and editor forms drift apart. Mitigate with one canonical JSON-compatible schema source.
- Renderer leakage: web grid fields become mandatory shared concepts. Mitigate by separating shared intent from platform renderer config.
- Stale data: blocks store copied products/posts instead of declarative bindings. Mitigate with allowlisted server-side data sources.
- Cache over-invalidation: every update clears the full site. Mitigate with dependency tags per page, block, and service record.
- Unsafe composition: clients can modify checkout, auth, payment, or private-account flows. Mitigate by keeping transactional screens coded in V1.
- Editor overwrite: two editors silently overwrite one draft. Mitigate with optimistic locking, draft ownership, or explicit conflict handling.
- Runtime fragility: one broken block takes down a whole page. Mitigate with block-level fallbacks and last valid published revisions.
- Rich-content injection: editable text/links become script or phishing vectors. Mitigate with structured rich text, sanitizer rules, safe URL protocols, and CSP.
- Incomplete platform parity: a block exists on web but not native. Mitigate with capability manifests and fallback blocks.
- RTL/accessibility debt: localized layouts are added after themes are built. Mitigate by requiring locale and accessibility metadata in schemas and editor validation.
- Performance creep: too many heavy blocks make pages slow. Mitigate with block cost profiles and publish-time warnings.

## First Implementation Slice

When this phase starts, begin small:

1. Define the schema for pages, revisions, sections, slots, block instances, intent, renderer configs, data bindings, theme tokens, breakpoints, and placement.
2. Choose the canonical JSON-compatible schema technology and type-generation flow.
3. Define ownership fields for site, future tenant, locale, author/editor identity, and publishing permissions.
4. Define the block registry with validation, versioning, migrations, allowed slots, renderer capabilities, fallbacks, and cost profiles.
5. Build 8-12 high-quality web blocks around real NebulaNV data.
6. Add a minimal admin editor for selecting blocks and setting safe props.
7. Render through Next.js with SSR, CSS grid, container queries, and server-side data resolution.
8. Add draft/preview/publish with immutable published revisions, concurrency control, signed/noindex preview links, and restore audit history.
9. Add dependency tags for page, theme, block, product, media, settings, and taxonomy invalidation.
10. Add runtime fallback, sanitizer, schema, migration, accessibility, RTL, cache, and performance-budget tests.
11. Only then explore mobile app renderers and broader app-screen composition.
