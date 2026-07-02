# Media Filemanager Vision Evolution

Last updated: 2026-06-29

## Why This Report Exists

This report preserves the previous media filemanager direction and records the newer lane-aware direction.

It is a reference note, not the active contract. Active execution still lives in `docs/current-focus.md`, `TODO.md`, and `docs/services/media-service.md`.

## Previous Direction

The previous model separated media management into three surfaces:

- Public media library/filemanager for public assets.
- Feature-owned private upload areas for protected/strict files.
- Root-admin media operations table for diagnostics and repair.

That model was safe because protected and strict files never appeared in the general public media browser.

The weakness was UX duplication. Product pages, user pages, order pages, and other admin features would each need their own private file UI even though many interactions are similar: upload, list, preview, select, delete, and inspect metadata.

## New Direction

Use one reusable admin filemanager UI shell, backed by separate backend route families per access lane:

- `PUBLIC` public-library routes.
- `PROTECTED` protected-library routes.
- `STRICT` strict-library routes.

The same UI shell can be reused, but each lane has different backend policy.

## Lane Meaning

### Public Library

Public media is folder-oriented and human-readable.

Example storage key:

```txt
uploads/products/shoes/hero.webp
```

Expected behavior:

- Browse by `folderPath`.
- Use descriptive keys under `MEDIA_PUBLIC_FOLDER`.
- Support public/admin content workflows such as product, blog, settings, and SEO images.
- Allow Supabase-style folders/files UI, powered by media-service DB metadata.

### Protected Library

Protected media is context-oriented, not folder-oriented.

Example storage key:

```txt
private/objects/<uuid>
```

Expected behavior:

- List by owner/scope/business entity context.
- Use opaque keys under `MEDIA_PRIVATE_FOLDER`.
- Use short-lived read URLs or policy-checked render/read endpoints.
- Avoid showing raw storage keys as the main admin-facing identity.

### Strict Library

Strict media is context-oriented with stronger privacy and audit expectations.

Example storage key:

```txt
private/objects/<uuid>
```

Expected behavior:

- List only through explicit owner/scope/business entity context.
- Use opaque storage keys.
- Avoid leaking sensitive original filenames in storage paths or casual metadata views.
- Use shorter read TTLs.
- Prefer explicit view/download actions and audit logging.
- Consider app-level envelope encryption later for maximum privacy.

## Supabase Role

Supabase Storage may still be useful as the storage provider and raw operational console.

The Nebula admin panel should not depend on Supabase Studio as the app-aware filemanager because Studio does not know Nebula-specific rules:

- access class,
- owner context,
- business entity context,
- scan status,
- strict privacy rules,
- render/read policy.

The Nebula filemanager should call media-service, not raw Supabase/S3 APIs.

## Frontend Direction

The public website remains Next.js because SEO and public rendering matter.

The admin panel direction is Vite React SPA because the admin is authenticated, interactive, and does not need public SEO.

## Consequences

Backend work should now focus on route-family design before UI implementation:

- public-library routes,
- protected-library routes,
- strict-library routes,
- context metadata fields,
- lane-specific delete behavior,
- strict filename/privacy behavior,
- optional strict encryption direction.

The older public-only filemanager model was not wrong. It was a safe first model. The lane-aware model keeps the safety boundary while making the admin UX more reusable.
