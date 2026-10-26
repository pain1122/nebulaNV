# D1 legacy Product reference audit (2026-09-29)

Read-only audit of the local `nebula_products` database after the additive
reference migrations. The command was `pnpm db:audit:d1-references`; two
follow-up read-only aggregate queries classified URL shape and row lifecycle.

| Legacy state                   |      Rows | Finding                                                                                                                                   |
| ------------------------------ | --------: | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Thumbnail URL without Media ID |         0 | No thumbnail backfill needed in this database.                                                                                            |
| Gallery URL without Media ID   |        35 | All images and parent Products are undeleted drafts. The URLs are two distinct absolute HTTP values; none is a gateway Media render path. |
| Free-form tags                 | 1 Product | The Product is active and undeleted. Its legacy tag is suppressed on public reads.                                                        |

A 2026-09-30 read-only follow-up found that all 35 gallery rows belong to 22
draft Products whose slugs begin `e2e-hidden-draft-`. They remain non-public;
their URL values still have no verified Media owner. The active free-form tag is
`demo` on the local `nebula-demo-product` seed Product. There is no visible
Product-scoped Taxonomy tag with the matching `demo` slug or title. Those facts
identify a bounded local cleanup or explicit mapping decision, not an
automatic URL-to-Media or tag-to-Taxonomy conversion.

The 22 draft Products have 35 gallery rows and no Product variants, comments,
attributes, or VR hotspots in this local database. Product hard-delete is
restricted while gallery rows exist, so any chosen local test-data cleanup must
remove those gallery rows first. Mapping the demo tag would require creating or
selecting a Taxonomy-owned Product tag, then setting `tagIds` and clearing the
legacy `tags` array with an expected-version write. Current Product writes reject
new nonempty free-form tags, so restoring the old array would require a data
snapshot and an explicit database rollback. At this point, no cleanup or
mapping had been applied.

On 2026-09-30, the local legacy demo Product was replaced through the Gateway
hard-delete operation and the existing `pnpm backend:seed` command. Before
deletion, its exact slug/SKU, `ACTIVE` status, version 1, single `demo` tag,
empty `tagIds`, empty gallery, and absence of Product dependents, cart items,
and order items were checked. The seeder reported `product=existing` before
deletion, `product=created` afterward, and `product=existing` on an immediate
rerun. The recreated Product has the same slug/SKU, `ACTIVE` status, empty
`tags` and `tagIds`, and no gallery rows. Its ID changed from
`99ab1d48-83cb-47e0-bd30-45d8b3b904f6` to
`6b5c044e-c0f0-4ed5-b505-0379961141ac`. The Blog demo remained existing and
was not changed. A read-only post-seed query reports zero undeleted Products
with free-form tags.

The **remaining unresolved** rows are the 35 URL-only gallery rows on 22 draft
Products. No ID is inferred from a URL or tag string.
Automatic URL-to-Media mapping would be a guess because these URLs do not encode
a Media record ID, and an ordinary new upload cannot yet reach `READY/CLEAN`
without the planned M2 promotion pipeline. The draft gallery rows can remain in
the compatibility columns until an eligible Media item is uploaded and assigned
through Product's validated `mediaId` write path. These draft rows are not
created by `backend:seed` and are not public.

The audit prints row IDs and MD5 fingerprints, not stored URL or tag values.
Fingerprints are for matching rows during reconciliation and do not prove Media
or Taxonomy ownership.
