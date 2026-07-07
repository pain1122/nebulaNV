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
  layout: "responsive-grid",
  slots: [
    {
      id: "featured-products",
      block: { type: "product-slider", props: { source: "featured" } },
      placement: {
        desktop: { span: 8, order: 1 },
        tablet: { span: 6, order: 1 },
        mobile: { span: 12, order: 2 }
      }
    },
    {
      id: "sale-banner",
      block: { type: "promo-banner", props: { mediaId: "..." } },
      placement: {
        desktop: { span: 4, order: 2 },
        tablet: { span: 6, order: 2 },
        mobile: { span: 12, order: 1 }
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
- Render a safe maximum item set, then let CSS/container rules decide how many cards are visible.
- Use media IDs and media-service render URLs, not raw storage URLs.
- Use responsive image sizing so narrow slots and mobile layouts do not download unnecessarily large assets.

This keeps pages SEO-friendly and fast while still allowing intelligent responsive behavior.

## Smart Slot Rules

Slots should declare what kinds of blocks they allow.

Examples:

- A `1/3` sidebar slot may allow promo banners, compact product cards, countdowns, trust badges, and small testimonials.
- A full-width slot may allow hero sections, product grids, media galleries, and rich content blocks.
- Checkout, profile, order, and auth-related app blocks should be locked down more tightly than marketing/content blocks.

Smart slot rules should prevent clients from placing visually or functionally unsuitable blocks into narrow or sensitive areas.

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
- Do not make the block editor responsible for backend policy.
- Do not bypass media-service for protected or strict media.
- Do not emit storage provider URLs, private filenames, or presigned/admin URLs into SEO output.
- Keep mobile app rendering native, not a forced web layout.
- Keep the launch backend stable before starting this phase.

## First Implementation Slice

When this phase starts, begin small:

1. Define the schema for sections, slots, block props, theme tokens, breakpoints, and placement.
2. Build 8-12 high-quality web blocks around real NebulaNV data.
3. Add a minimal admin editor for selecting blocks and setting safe props.
4. Render through Next.js with SSR, CSS grid, and container queries.
5. Add draft/preview/publish.
6. Only then explore mobile app renderers and broader app-screen composition.
