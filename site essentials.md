# Site Essentials - NebulaNV (English Education Website)

Last updated: 2026-05-28
Purpose: single source of truth for launch essentials before prioritization.

## 0) Priority Bands

- `P0-MUST (Release)`:
  `SITE-01..07`, `USER-01..06`, `BLOG-01..08`, `PROD-01..04`, `PROD-08..09`, `PROD-11`, `PROD-13`, `PROD-15`, `PROD-17..20`, `PAGE-01..04`, `SET-01..08`, `MED-01..05`, `ADM-01..09`, `ADM-11`, `API-01..07`, `SEO-01..12`, `OPS-01..06`.
- `P1-SHOULD (If Time Holds)`:
  `PROD-05..07`, `PROD-10`, `PROD-12`, `PROD-14`, `PROD-16`, `PROD-21`, `PAGE-05`, `ADM-10`, `API-08`.
- `P2-DEFER (Post-Launch)`:
  Any architecture rewrites, realtime streaming/classrooms, queue/agent overhaul, deep observability stack.

## 1) Product Scope (Launch)

- Public website built with Next.js + Tailwind.
- Admin panel built with Next.js + Bootstrap.
- Backend APIs stable enough for public + admin flows.
- Blog + user club features fully usable at launch.
- Product, taxonomy, media, settings, and auth contracts remain stable across HTTP and gRPC.

## 2) Public Website Essentials

- `SITE-01` Home page with dynamic sections from admin settings.
- `SITE-02` Blog listing page with pagination, category filter, and search.
- `SITE-03` Blog single page with SEO-ready metadata, sharing, and related posts.
- `SITE-04` Static pages: About, Contact, Privacy Policy, Terms, 404.
- `SITE-05` Header and footer fully controlled by admin settings.
- `SITE-06` Menu rendering with nested items and custom order.
- `SITE-07` Favicon/logo/social preview assets render correctly.

## 3) User Club Essentials

- `USER-01` Register, login, logout, refresh-token flow.
- `USER-02` Forgot password + reset password flow.
- `USER-03` User profile page with editable personal info.
- `USER-04` Favorite blogs add/remove/list flow.
- `USER-05` Account area dashboard with profile, favorites, and basic settings.
- `USER-06` Protected routes for user-only pages.

## 4) Blog/CMS Essentials

- `BLOG-01` Blog CRUD in admin: create, edit, delete, publish/unpublish.
- `BLOG-02` Draft and published states.
- `BLOG-03` Slug generation and uniqueness validation.
- `BLOG-04` Category and tag management.
- `BLOG-05` Featured image + content media attachment.
- `BLOG-06` Author and publish date display.
- `BLOG-07` SEO fields per post: title, description, canonical, schema.
- `BLOG-08` Draft preview workflow for blog posts before publish.

## 5) Product Catalog Essentials (Woo-Level Target)

- `PROD-01` Product CRUD with short description (`excerpt`) + full description (`content`).
- `PROD-02` Product taxonomy support for categories, tags, and brands.
- `PROD-03` Product thumbnail and multi-image gallery management.
- `PROD-04` Product type support: `PHYSICAL`, `DIGITAL_ACCESS`, `DOWNLOADABLE`.
- `PROD-05` Variable products with parent-child variants.
- `PROD-06` Variant inheritance model: inherits parent fields unless overridden.
- `PROD-07` Variant-level SKU, price, and image override support.
- `PROD-08` Pricing model: regular price + sale/discount price.
- `PROD-09` Discount schedule window (`start/end`) and active toggle.
- `PROD-10` Discount event/campaign support assignable to products.
- `PROD-11` Inventory management: stock quantity, stock status, low stock threshold.
- `PROD-12` Inventory policy flags: manage stock, backorders, sold individually.
- `PROD-13` Product attributes system: global + product-specific, typed values.
- `PROD-14` Variant option matrix from attributes.
- `PROD-15` Shipping/delivery fields for physical items: weight, dimensions, class/policy.
- `PROD-16` Downloadable file config: file list, download limits, expiry.
- `PROD-17` Product visibility/publish controls: draft, active, archived, featured.
- `PROD-18` Product SEO fields and canonical/schema overrides.
- `PROD-19` Admin product list filters: type, status, category, brand, stock.
- `PROD-20` Product API contract parity across HTTP and gRPC.
- `PROD-21` Draft preview workflow for product pages before publish.

## 6) Dynamic Pages + Content Essentials

- `PAGE-01` Manual TS page sections can be connected to API content.
- `PAGE-02` Admin can configure page content blocks without redeploy.
- `PAGE-03` Admin can configure homepage and key landing pages.
- `PAGE-04` Safe fallback rendering when a configured block is missing.
- `PAGE-05` Draft preview workflow for managed pages before publish.

## 7) Global Settings Essentials

- `SET-01` Global SEO defaults: title, description, canonical base.
- `SET-02` Global schema defaults.
- `SET-03` Per-page SEO overrides.
- `SET-04` Default blog categories.
- `SET-05` Site identity: logo, favicon, brand text.
- `SET-06` Header layout settings.
- `SET-07` Footer layout settings.
- `SET-08` Menu builder with drag-sort, nested submenus, and placement control.

## 8) Media Essentials

- `MED-01` Media upload and storage using current S3-compatible flow.
- `MED-02` Media selection from admin forms for blog/pages/settings.
- `MED-03` Access class support (`PUBLIC`, `PROTECTED`, `STRICT`) wired end-to-end.
- `MED-04` Safe defaults for access class and ownership.
- `MED-05` Basic media metadata: filename, MIME type, size, owner.

## 9) Admin Panel Essentials

- `ADM-01` Admin authentication and route protection.
- `ADM-02` Role/permission boundaries: `admin`, `editor` minimum.
- `ADM-03` Blog management module.
- `ADM-04` User club management view: user profile lookup/basic moderation.
- `ADM-05` Settings management module: global SEO + branding + layout.
- `ADM-06` Menu builder UI with nested reorder.
- `ADM-07` Page builder/configuration UI for dynamic blocks.
- `ADM-08` Media library UI with picker integration.
- `ADM-09` Product management module: types, variants, inventory, discounts, shipping.
- `ADM-10` Admin audit log for settings/menu/SEO/product/content changes.
- `ADM-11` Clear permission matrix and UI guardrails between `admin` and `editor`.

## 10) Backend/API Essentials

- `API-01` Stable API contract for all launch flows.
- `API-02` Consistent response/error format.
- `API-03` Auth + authorization guards consistently enforced.
- `API-04` Input validation for public and admin endpoints.
- `API-05` Health endpoints for running services in launch path.
- `API-06` Environment validation for required launch variables.
- `API-07` RBAC enforcement parity across HTTP and gRPC.
- `API-08` Signed preview-token endpoints for blog/page/product draft previews.

## 11) SEO Essentials (Launch-Grade)

- `SEO-01` Dynamic metadata per page/post.
- `SEO-02` Canonical tags.
- `SEO-03` Structured data (JSON-LD) on key pages/posts.
- `SEO-04` Sitemap generation.
- `SEO-05` Robots configuration.
- `SEO-06` Open Graph + Twitter card tags.
- `SEO-07` Redirect manager (301/302) for slug/path changes.
- `SEO-08` Indexation rules: `noindex` for preview/admin/internal/filter URLs.
- `SEO-09` Canonical normalization: single canonical host/protocol/trailing-slash policy.
- `SEO-10` Duplicate URL control for params: `utm`, sort/filter/search, pagination strategy.
- `SEO-11` 404/410 hygiene with redirect mapping for deleted/moved content.
- `SEO-12` Search Console index hygiene routine: weekly validation + fix loop.

## 12) Operations Essentials

- `OPS-01` Reproducible local startup for core launch services.
- `OPS-02` Core deployment runbook with env checklist.
- `OPS-03` Basic error logging and log access path.
- `OPS-04` Backup plan for DB and media metadata.
- `OPS-05` Release smoke checks for core public + admin flows.
- `OPS-06` Pre-release crawl/index audit: canonical, duplicates, 404, sitemap freshness.

## 13) Website Gaps To Confirm Before Prioritization

- `GAP-01` Site-wide search UX: blog + product + page search behavior.
- `GAP-02` Contact/lead forms with anti-spam and clear submission handling.
- `GAP-04` Proper 404 and fallback states for missing dynamic blocks/content.
- `GAP-08` Error boundaries and user-safe error messages in web/admin.
- `GAP-09` Cookie/privacy consent banner if legally required for analytics.
- `GAP-10` Core web vitals/performance checks on homepage, blog list, blog single.

## 14) Launch Definition of Done

- `DOD-01` Public users can browse blogs and read blog pages without errors.
- `DOD-02` Users can register/login/manage profile/favorite blogs.
- `DOD-03` Admin can fully manage blogs, products, menus, global settings, and key pages.
- `DOD-04` SEO metadata/canonical/schema/sitemap/robots are all live.
- `DOD-05` No P0/P1 launch blockers remain open.
- `DOD-06` Final build and smoke checks pass.

## 15) Explicitly Post-Launch (Do Not Expand Scope Now)

- Realtime sessions/classroom streaming.
- Full queue/agent/event-driven overhaul.
- Deep analytics platform and complex observability stack.
- Large architectural rewrites not required for launch flows.
