# Web And Admin Apps

The public web app consumes backend APIs and renders SEO-facing pages. The admin panel target is a separate Vite React SPA for app-like admin workflows.

## Boundary Rule

The web app should treat backend API responses as contracts.

If a backend response shape changes, update the frontend API client or mapper explicitly.

## Naming Rule

Use backend public API names as-is.

Prefer:

```ts
thumbnailUrl
categoryId
discountType
```

Do not invent frontend-only aliases unless a local UI component needs a different display model.

## Token Rule

Frontend token behavior should respect auth-service boundaries.

Access tokens and refresh flows are separate concerns. Do not persist refresh tokens in active frontend state unless the auth design explicitly requires it.

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
