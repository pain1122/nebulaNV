# Web And Admin Apps

The public web app consumes backend APIs and renders SEO-facing pages. The admin panel target is a separate Vite React SPA for app-like admin workflows.

## Boundary Rule

The web app should treat backend API responses as contracts.

If a backend response shape changes, update the frontend API client or mapper explicitly.

## Naming Rule

Use backend public API names as-is.

Prefer:

```ts
thumbnailUrl;
categoryId;
discountType;
```

Do not invent frontend-only aliases unless a local UI component needs a different display model.

## Token Rule

Frontend token behavior should respect auth-service boundaries.

Access tokens and refresh flows are separate concerns. Do not persist refresh tokens in active frontend state unless the auth design explicitly requires it.

## Browser Origin Rule

Frozen target policy:

- Browser applications call the public gateway, not individual backend services.
- Public CDN/render media allows any origin without credentials because only approved public variants are eligible.
- Public storefront APIs allow verified active origins registered to the owning site.
- Admin APIs allow exact verified admin origins; cookie-based state changes also require CSRF protection.
- Direct presigned uploads allow only verified site/admin upload origins, use no browser cookies, and send only required storage headers.
- Protected browser-readable previews allow exact verified site/admin origins only when JavaScript access is required.
- Strict browser-readable previews are limited to the exact verified admin origin and retain strict access, TTL, and audit rules.
- React Native and server clients are outside browser CORS enforcement and remain subject to authentication, app registration, tenant/site resolution, rate limits, and resource authorization.
- Browser code must never send `x-s2s-signature`, service identity, propagated user/role, or trusted tenant/site headers.
- Development uses the exact comma-separated `HTTP_CORS_ORIGINS` list when a browser must call a directly runnable service. The current Next.js `/api/*` proxy is same-origin and does not need backend CORS. Broad localhost patterns are not production configuration.

See [Media Service](media-service.md#cors-and-origin-policy) for the complete surface matrix and implementation phases.

## Download Resistance Rule

- Anything rendered by a website or native app can ultimately be captured.
- Public pages should request approved derived variants instead of raw originals when those variants exist.
- Short-lived URLs, watermarks, reduced resolution, overlays, disabled right-click, and canvas/WebGL may discourage casual copying but are not DRM.
- Frontend code must not describe UI restrictions as a security guarantee.
- Strong streaming DRM belongs to a separate licensed-content module.

See [Media Service](media-service.md#download-resistance-policy) for the complete policy.

## Sensitive Preview Rule

- Protected preview may temporarily use a full-file five-minute signed URL after owner/admin and business-context checks.
- Strict preview may temporarily use a full-file thirty-second signed URL for admin/root-admin only.
- Both preview types are inline and `private, no-store`.
- Preview UI must not trigger download implicitly.
- Strict download is disabled by default in the target policy and requires a future separately authorized, durably audited action.
- When F5 derived previews exist, strict preview defaults to downsized and/or watermarked variants; protected features may opt into downsized previews according to risk.
- Frontend logs must never record signed URLs.

See [Media Service](media-service.md#sensitive-preview-policy) for the complete policy and current implementation gaps.

## Future Direction

When API contracts stabilize, add typed frontend API clients so backend response changes are caught at build time.

Public website direction:

- Next.js remains the preferred public website framework because SEO, metadata, and public rendering matter.
- Public pages should store/use media IDs and render public images through `GET /media/render/:id?variant=web`.
- All approved public `variant=web` media is index-eligible by default, but image sitemap output should be generated from indexable public content records that reference those media IDs.
- Product, blog, page, category, and settings forms should own semantic image usage fields such as featured image media ID, gallery order, alt text, captions, and display role.
- The media filemanager is only the asset picker/library. Do not use filemanager metadata as the source of page-specific SEO image text.
- Image sitemap entries should use canonical render URLs, not storage provider URLs, presigned URLs, admin read URLs, protected/strict media, or raw/original variants.

Admin panel direction:

- Vite React SPA is the preferred admin panel direction because the admin is interactive, authenticated, and does not need public SEO.
- The reusable media filemanager should live in the admin app and call media-service lane routes, not raw S3/Supabase APIs.

Current delivery status:

- Admin-panel implementation is postponed until the Vite-based admin project/template is ready.
- Current `apps/web` is not the active admin deliverable and does not gate backend-only stabilization slices.
- F7 owns the decision to reuse, migrate, or replace current `apps/web`, separately from the future public Next.js storefront.
