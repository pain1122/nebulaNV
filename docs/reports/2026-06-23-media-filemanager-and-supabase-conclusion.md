# Media Filemanager And Supabase Conclusion

Last updated: 2026-06-23

## Decision

Use Supabase Storage as a storage backend and raw storage console, but keep `media-service` as the Nebula policy and metadata authority.

Supabase Studio can remain useful for trusted operational storage inspection, bulk public asset work, and debugging. The Nebula admin panel should not rely on Supabase Studio as the app-aware filemanager because Studio does not know Nebula-specific rules such as `PUBLIC`, `PROTECTED`, `STRICT`, owner context, scan status, SEO variants, or feature-owned private uploads.

## Storage Lanes

Public filemanager assets use descriptive S3-compatible keys:

```txt
uploads/products/shoes/hero.webp
```

The matching media DB row stores separate columns, not a JSON blob:

```txt
path        = uploads/products/shoes/hero.webp
folderPath  = /products/shoes
displayName = hero.webp
accessClass = PUBLIC
visibility  = public
```

Protected and strict assets use opaque keys:

```txt
private/objects/<opaque-id>
```

The matching media DB row keeps human meaning in metadata, not in the physical storage key:

```txt
path        = private/objects/<opaque-id>
folderPath  = /
displayName = original-or-admin-label.ext
accessClass = PROTECTED or STRICT
visibility  = private
ownerId      = owning user id when applicable
scope        = owning feature context
```

## Filemanager Rule

The general admin media library should browse only the public filemanager lane. It should show folders and files from media-service metadata, not from raw storage listing.

This keeps the UI Supabase-like while preserving Nebula policy:

```txt
GET /media/browse?path=products/shoes
```

returns:

```ts
{
  folders: [],
  files: []
}
```

Folders are virtual. They are derived from `folderPath` prefixes in the DB. Files are real `Media` rows.

## Why DB-Backed Browse

S3-compatible storage can list object keys with prefixes, but storage does not know Nebula's app policy. It cannot safely answer questions about `accessClass`, owner visibility, scan state, blocked/deleted files, SEO approval, or feature ownership.

The DB is already the app index and policy surface. Storage holds bytes. Media-service decides which bytes are visible, selectable, readable, deletable, or private.

## Admin Panel Direction

For launch, build only the small Nebula media UI needed by product, blog, settings, and page workflows:

- Browse public folders.
- Search public files.
- Upload public assets through media-service.
- Pick/select a public file.
- Keep delete/move/rename/edit as controlled follow-up features.

Do not build image editing, PDF editing, document editing, variants UI, or bulk operations in the launch slice. Those can be added later. When editing arrives, edits should create new files or variants rather than overwriting originals by default.

## Mental Model

```txt
Supabase Studio = raw storage console
Supabase/MinIO/AWS = byte storage
media-service = metadata, policy, and signed URL authority
Nebula admin media UI = app-safe file picker/filemanager
```
