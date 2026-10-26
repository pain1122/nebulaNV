# D1 Batch 4 demo seeders - 2026-10-10

Status: showcase seed/reset/recreation/verify/rerun and limits seed/verify passed;
legacy Product entrypoint replacement implemented, live integration pending.

## Evidence and scope

Confirmed implementation gap: scripts/demo/catalog.mjs and png.mjs are draft
fixtures, not imported by a seed runner. The catalogue covers lifecycle,
inventory, variants, discount timing, Unicode and boundary profiles, but not
the now-deployed Media text/saved-size contracts. scripts/backend.mjs still
creates one minimal Product and one Blog item through internal HTTP endpoints.
That existing seeder is valid, guarded against production and rerun-aware;
it is insufficient for the requested comprehensive D1 demonstration.

Product and Blog Prisma seeders intentionally create no base content. Preserve
them and all identity, Settings and authority setup seeders. No schema or
service change is planned. No legacy fixture retirement occurs before the
replacement's live proof; backend:seed remains unchanged at this checkpoint.

Implement in this order:

1. Complete the versioned declarative catalogue: showcase default, limits on
   demand; commercial/lifecycle/variant examples, inherited/empty/overridden
   text, image recipes and precise expected visibility/prices. Keep generated
   PNG patterns labelled as fixtures rather than product photography.
2. Add a Gateway-only seed/verify/reset runner and root commands. Read configured
   shop currency without changing it. Upload through presign/PUT/finalize,
   observe bounded READY/CLEAN and approved saved generations, then bind Product.
   Seed Products as drafts until their graph is assembled.
3. Keep a local ignored ownership journal containing IDs and fixture facts,
   never credentials, signed URLs or tokens. Serialize runs with a lock; refuse
   production/nonlocal targets, conflicting existing records and drift. Rerun
   verifies completed records instead of overwriting business changes. Resume
   partial records from the journal. Reset preflights ownership and removes
   Product/gallery dependencies before Media and child-first Taxonomy entries.
   External dependents cause a service conflict; never widen reset to a whole
   database or delete unowned records.
4. Verify actual public/admin visibility, variants, commercial state, Media
   text/saved-byte checksums and malformed/over-limit denial. Tests cover
   catalogue facts, guardrails and failure/resume/rerun/reset ownership.
5. Complete focused checks locally, then hand the real seed/verify/rerun and
   reset/recreate proof to Salar. Record exact live output before retiring the
   old minimal Product or marking D1 exit complete.

Files: scripts/demo/catalog.mjs, png.mjs, new Gateway runner/journal/tests,
package.json, .gitignore, docs/current-focus.md and this checkpoint. Existing
generated client and Gateway operations are consumed, not regenerated. Blog
demo, frontend, cloud/CDN, payment and tenant activation stay out of scope.

The runner is a bounded D1 fixture tool. Future features extend the declarative
catalogue and verifier explicitly; they must not be silently advertised as
proved. Stateful API proof belongs to live runs; simulated tests do not establish
container, scanner or database success. No new Docker image build is expected.

## Implemented local checkpoint

Showcase: 18 Products, two generated landscape Media patterns, seven taxonomy
records, four variants. Limits includes the same showcase and expands to 122
Products, 50 Media records, 71 taxonomies, a 50-variant Product, 64 tags and a
50-entry gallery, maximum title/SKU/option/stock/text fields and pagination.
The gallery bound is a request-size limit; this tool does not claim a database
cap on lifetime gallery rows. Future/expired offers use fixed 2099/2000 windows.

The front Media uses four recipes: square crop, focal card crop/text watermark,
inside-fit detail/image watermark using the second approved Media, and portrait
mobile crop. Product text includes inheritance, explicit empty decorative alt,
nullable reset and local overrides. The existing demoPng default remains 64x64
for earlier proofs; new fixtures request explicit landscape dimensions.

Root commands: demo:d1:plan, demo:d1:seed, demo:d1:verify, demo:d1:reset and
test:demo:d1. Pass limits to plan/seed/verify for the expanded profile. Reset
targets every ID in the local D1 journal, including limits records if present;
it does not target only whichever profile argument is supplied.

The ignored .nebula-demo/d1.json journal binds IDs/definition hashes and stable
Media/Product facts to the local Gateway target. No credentials, tokens or
signed upload links are stored. The journal is excluded from Docker context.
Each successful creation is saved before downstream work. Completed fixtures
must match recorded revisions/generations; reruns refuse drift rather than
overwrite it. Both seed and verify perform visibility, commercial/variant/text,
saved-byte checksums, malformed requests, SKU collision and permission checks.
Limits also proves the 51st variant is rejected and public pagination is exact.

Reset preflights every owner and scans admin Product references to detect
external use of owned taxonomy before any deletion. Product hard-delete and
Media deletion continue through their owning contracts; a conflict stops reset.
Gallery rows are removed before Products, Media after Products and child
taxonomies before parents. Reset is incremental, not a transaction across
services. Completed deletes are journalled so it can resume. A concurrent
external writer can still change references after preflight; this local fixture
tool does not add cross-service locking or claim atomic graph replacement.

Limits/known restrictions: crash after server creation but before journal save
can leave an unjournalled collision. The runner refuses to adopt/delete it
automatically. Keep the journal; if lost, do not run a broad namespace delete.
A crashed process may leave d1.lock; confirm it is no longer running before
removing that exact lock. Requests are bounded at 30 seconds; each Media wait is
bounded at 180 seconds. Writes are not blindly retried. Generated patterns are
not product photographs. The legacy minimal Product/Blog remains untouched.

Observed local checks: 13 tests pass, including actual Gateway DTO validation
of both profiles, guards/journal serialization and simulated partial-seed,
rerun/drift, dependency order/reset/recreate and external-reference denial.
API-client TypeScript build, scoped lint and diff checks pass. All eleven
current backend services passed health. Simulation results do not establish
live seeding or scanner success. No live seed/reset, database proof or Docker
operation was run at this checkpoint.

## Operator checkpoint

### First live seed failure: empty taxonomy response

Confirmed defect (2026-10-10): the first showcase seed stops at the initial
taxonomy lookup with HTTP 500. Authenticated populated taxonomy reads succeed;
a search with no matches fails. Product's direct HTTP response omits `data`
for the same empty search. The local D1 journal contains no created
records, so reset is unnecessary.

The Product Taxonomy client uses protobuf decoding without default values.
An empty repeated field is omitted from the decoded response.
Product forwards it as undefined, then its gRPC controller calls
`res.data.map`, producing the Gateway 500. Implemented narrow correction: restore
the omitted response collection (`data: []`) in Product's taxonomy
proxy and verify empty and populated responses with real protobuf codecs.
Preserve transport/request omission semantics, authentication and schemas.
Gateway already enables response defaults; it does not need a code change.
Only the Product image needs rebuilding before retrying the live seed.

Focused validation passed: three regression tests use the real proto-loader
response codec with defaults disabled to prove omitted empty collections,
empty pages with nonzero totals and unchanged populated responses. Product
TypeScript, scoped ESLint and diff checks pass. The codec preserves the explicit
zero total, so no pagination fallback or transport change was introduced.
The running Product container still has the previous code; deployment and
successful live seed remain unproved until the operator rebuilds it.

Live seed, rerun, reset/recreate and limits proofs remain pending.

2026-10-12: after the operator restarted Compose without errors, an independent
backend health check passed for all eleven applications. Inspection of the
running Product container's compiled taxonomy proxy confirmed `data: res.data
?? []` is deployed. The next action is retrying the showcase seed; health and
deployed-code inspection do not establish successful seeding.

### Second live seed failure: legacy checksum assumption

Confirmed seeder defect (2026-10-12), recorded before implementation: the
showcase retry created and journalled seven taxonomies and the first Media,
then stopped at `demo_source_checksum_mismatch`. No Products were created.
The seeder incorrectly treats the legacy `Media.sha256` as a verified source
checksum. The processing schema explicitly keeps client-claimed legacy hashes
separate from `MediaVerifiedSource`; completion stores the verified hash there
and does not fill the legacy field. Gateway faithfully returns the empty field.

A read through the live Gateway confirmed the first image is READY/CLEAN,
640x480, with an empty legacy hash. Its delivered original hashes to
`ec49afa9c236adfb196e68821cc92f75c186583374dfe48d5e966767ad4250c8`,
exactly matching the deterministic fixture bytes. Implemented narrow correction:
hash the delivered original during seeding, journal that observed checksum and
use the same byte-based check for rerun/verify. Retain checksum rejection,
Media processing ownership and derivative output checks. Update the simulation
to represent empty legacy hashes and cover corrupt original bytes/resume.
No Media/Gateway contract, schema, database or Docker rebuild is needed.
Keep the journal and resume the seed; do not reset these created records.

Local validation: all 15 seeder tests pass, including empty legacy hashes,
corrupt delivered-original rejection during seed and verify, and recovery using
the same journalled Media ID without duplicate uploads. Scoped ESLint, Node
syntax and diff checks pass. These are simulated fixture tests plus the live
read-only byte comparison above; successful full showcase seeding is still
pending the operator retry.

### Third live seed failure: incomplete text watermark recipe

Confirmed seeder defect (2026-10-12), logged before correction: both Media IDs
are now journalled, but custom regeneration returns HTTP 400 before Product
creation. The text watermark omits its width and height. Media's actual
`imagePresets` validator rejects this payload with `image_recipe_number_invalid`;
the Gateway DTO allows those properties to be omitted, so the previous DTO-only
catalogue check did not prove acceptance by the owning service.

Implemented correction: resolve a 160x32 text watermark box in the demo request
builder, retaining the existing image watermark's explicit 64x48 dimensions.
Keep existing catalogue definitions/hashes and both journalled Media IDs.
Validate resolved showcase/limits recipes through Media's actual validator,
and expose the Gateway error envelope's code/details/request ID in seeder
failures instead of losing them as `failed`. No backend contract, schema or
image rebuild is needed. Retry with the existing journal after local checks.

Local validation: all 17 seeder tests pass. Resolved recipes for both profiles
now pass Media's actual recipe normalization and source-region validation;
missing watermark dimensions are explicitly rejected by that test. Catalogue
definitions remain unchanged. Error-envelope code/details/request-ID preservation
is also tested. Scoped ESLint and syntax/diff checks pass. Custom generation and
full live showcase seeding remain pending the operator retry.

Run separately and stop on failure:

### Fourth live seed failure: Product patch changes omitted booleans

Confirmed owning-service defect (2026-10-12), recorded before correction:
all 18 showcase Products are now journalled, but verification finds the
percentage discount inactive. Gateway reads show all five intended enabled
discounts were saved as inactive after publication, while their type/value/date
fields remain intact. Media checks reached completion.

Product's DTO boolean transformer calls `toBool(undefined)` for fields exposed
by class-transformer. A direct reproduction transforming `{status: "ACTIVE"}`
produces explicit false values for `model3dLiveView`, `vrEnabled`, `isFeatured`,
`promoActive` and `discountActive`. Product correctly treats supplied false as
a write, so publication incorrectly disables existing flags. Gateway sends a
sparse patch; the omission is lost at Product's DTO boundary.

Implemented narrow correction: preserve undefined in the shared optional boolean
transformer while retaining explicit true/false conversion. Add regression
coverage for omitted and explicit booleans through HTTP and gRPC validation.
No schema change is needed; only Product's image needs rebuilding. Existing
demo Products already contain the wrong persisted values, so after deploying
the fix use the ownership-aware demo reset and seed again. Reset targets only
journalled demo fixtures, preserves unrelated/base setup records, and refuses
external references. Do not rewrite snapshots to hide the failed verification.

Local validation passed: three focused Product suites, 33 tests, including six
new HTTP/gRPC omission and explicit true/false patch cases. Product TypeScript,
scoped ESLint and diff checks pass. The running image still needs rebuilding;
the persisted fixture values have not been changed. Successful full live
seed/reset/rerun and limits proofs remain open.

Updated operator recovery sequence; run separately and stop on failure:

Superseded after operator recovery on 2026-10-12: Product build/start and the
owned reset succeeded. The next seed saved all fixtures, then exposed two
verifier assumptions about deleted activation and public out-of-stock variants.
See the [deep contract audit](2026-10-12-d1-seeder-contract-audit.md) for the
source/test/live evidence and corrections. All 20 local seeder tests and a
complete read-only positive showcase verification now pass. No additional
build/reset is needed; resume seed/verify/seed with the existing journal. Full
rejection/permission/rerun and limits proof are still pending. The earlier
recovery commands below are preserved as history, not the current next action.

Latest operator result: full showcase seed and standalone full verify pass.
The immediate second seed stopped on Gateway's 429 route quota. The demo-only
client now honors retry/quota headers while retaining Gateway limits, bounded
retry/time budgets and stable idempotency keys. All 25 local tests pass; live
rate-aware rerun remains pending. See the deep audit's rate-limit checkpoint.

```powershell
docker compose build product-service
docker compose up -d --no-build --wait --no-deps product-service
pnpm demo:d1:reset
pnpm demo:d1:seed
pnpm demo:d1:verify
pnpm demo:d1:seed
```

The first run seeds and verifies showcase; verify checks it independently; the
second seed reuses existing IDs and checks drift without fixture rewrites.
Reset/recreate and limits proofs follow these results. Do not retire the old
minimal Product seeder or mark Batch 4/D1 exit closed yet.
