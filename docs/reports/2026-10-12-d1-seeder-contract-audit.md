# D1 seeder contract audit — 2026-10-12

## Scope and evidence before correction

The operator rebuilt/recreated Product, successfully reset only the journalled
demo graph, and seeded it again. Verification now stops at runner line 492:
an admin variant boolean is false where the fixture's creation input was true.
No successful complete showcase proof is claimed yet. The new journal contains
18 Products, two Media records and seven taxonomies. Preserve those records.

This audit reads current source, service documentation, existing tests and
live Gateway responses. It does not replace service behavior to fit fixtures.

## Findings

### Confirmed seeder defect: deleted variant activation expectation

The `old-xl` fixture is created active, then soft-deleted. Product's variant
deletion deliberately writes `active: false` and a deletion timestamp. Its
existing variant unit test asserts both changes and retained SKU reservation.
The live admin response agrees. The seeder incorrectly compares the terminal
active state to the original creation input. Correct expectation: inactive and
deleted after deletion, with its options/SKU/price/stock/order retained.

### Confirmed seeder defect: public out-of-stock variant expectation

Product public reads include active, non-deleted variants. Availability is
reported separately. A variant Product is visible only while at least one such
variant is available; other active variants can remain visible as out of stock.
The existing D1 live variant proof explicitly expects two visible variants,
including an OUT_OF_STOCK Red variant. Service documentation excludes inactive
and deleted variants, rather than every zero-stock variant.

The live showcase public response includes `blue-m` and `red-s`, matching that
contract. The seeder incorrectly removes `red-s` from its expected list.
Correct expectation: retain active, non-deleted variants and independently
assert each returned availability. Preserve Product's existing behavior.

### Confirmed simulation gap

The simulated deletion only set `deletedAt` and left `active` true. Its public
response filtered out zero-stock variants. Both behaviors matched the erroneous
verifier rather than the owning service, explaining passing simulation tests
despite live failure. The mock also synthesized effective prices from fixture
expectations; those tests establish orchestration, not independent commercial
correctness. Negative request mocks return status codes by operation/fixture
name, so they cannot establish actual backend rejection.

Correct the deletion/public response model and add regressions that check the
real terminal expectations, out-of-stock visibility and named assertion failure
when those states are corrupted. Keep actual backend contract tests and live
evidence distinct from simulation counts.

## Other inspected paths

- Taxonomy: the earlier omitted empty collection fix is deployed. All seven
  fixture IDs exist; the recent reset and seed advanced past taxonomy creation.
- Media: the legacy-hash assumption and incomplete text watermark request were
  corrected in the runner. The latest seed advanced past approval, recipes and
  byte verification. No Media implementation replacement is warranted.
- Product write mapping: Gateway sends sparse patches. The deployed DTO fix
  preserves omitted booleans. Live reads across all 18 Products now match every
  declared scalar input, discount flag/window and effective price.
- Variant options: apparent differences in JSON string output were key ordering
  only. The verifier uses structural comparison, which correctly accepts those
  maps. No options correction is warranted.
- Lifecycle/public product visibility: live admin deletion flags and anonymous
  200/404 results agree with all 18 fixture expectations.
- Rerun: completed records are compared to stored revisions and ownership;
  correction must not rewrite snapshots or alter catalogue hashes.
- Reset: the operator's ownership-aware reset succeeded. Repeating it is not
  needed for these verifier-only corrections.
- Limits: catalogue inputs and recipes have local Gateway/Media validation
  coverage. Actual maximum counts, pagination and backend over-limit rejections
  still require the limits live run. Do not claim that profile passed.

## Correction and verification

Changed only the runner's terminal variant expectations, its simulation and
assertion labels. No backend contract/schema/Docker image changes are required.
Run local regression tests and a read-only positive verifier over the existing
journal, including taxonomy, original/derivative bytes, metadata, Product fields,
variants, public visibility and gallery text. Leave full seeding/negative writes,
standalone verify/rerun and limits commands to the operator. Record results below
after they actually complete; Batch 4 and D1 exit remain open.

Observed results:

- All 20 local seeder tests pass. New regressions prove deleted activation,
  visible OUT_OF_STOCK variants, rejection of a misbehaving delete response and
  a false public availability declaration. Mock mutations and reads now use the
  same Product response projection, keeping their snapshots consistent.
- Scoped ESLint and diff checks pass.
- The complete positive showcase verifier passed against the running Gateway:
  18 Products, two Media and seven taxonomies. It checked ownership/definitions,
  saved revisions, original and all derivative byte hashes, recipe crop sizes,
  metadata, scalar fields/prices/discounts, admin variants, public visibility/
  availability, thumbnail inheritance and gallery text. It ran with
  `negative: false` and a save callback that refuses journal writes. No fixture
  writes or snapshot rewrites were performed; test login/logout sessions were
  closed.
- Thus the current failure is a verifier mismatch, not another broken seed or
  container outage. All records can be reused without reset or rebuild.

Remaining operator evidence: full seed including actual rejection/permission
checks, standalone full verify, a second seed proving stable IDs and no fixture
rewrites, and limits profile live checks. Earlier operator reset succeeded,
but its reseed has not yet completed the full verifier. Keep D1 exit unchecked.

Run separately and stop on failure:

## Showcase passes; immediate rerun rate limit

Operator evidence supplied after the audit: full showcase seed passed with
18 Products/two Media/seven taxonomies, and standalone full verify passed.
The immediately following seed reached verification but stopped on admin Product
GET with HTTP 429 RATE_LIMITED. The rerun gate remains open; the two complete
passing runs include actual malformed-write and permission checks.

Confirmed demo-client gap, recorded before correction: requests do not honor
the Gateway's backpressure. The running Gateway has TTL 60000 ms and limit 120.
The installed throttler keys counters by handler and trusted application/actor
tracker and emits `Retry-After-gateway` (seconds). Its guard runs before route
interceptors/handlers, so a confirmed RATE_LIMITED response rejects the request
before the mutation handler runs.

Implemented narrow correction: a shared demo-only request limiter honors the named
retry header, bounded by three retries/180 seconds total waiting per request.
All Gateway paths, including login/logout and anonymous permission probes, use
it. It pauses after a response exhausts the advertised quota and retries only
explicit 429 RATE_LIMITED envelopes, never arbitrary network/5xx failures.
Each attempt gets a fresh 30-second timeout; mutation retries retain the same
idempotency key. Missing retry headers stop rather than guessing the quota.
Gateway limits/contracts and fixtures remain unchanged. No build/reset needed.

Local validation: all 25 seeder tests pass, including named retry timing,
advertised quota exhaustion, bounded retry counts/oversized or missing headers,
no retries of other failures, stable mutation idempotency keys and renewed
timeout signals using the actual generated client with a simulated fetch.
Timer tests use a virtual clock; they do not establish a live throttled rerun.
The next operator action is `pnpm demo:d1:seed` using the unchanged journal.

Operator update (2026-10-12): the showcase rerun succeeded after the limiter
change. Independent journal inspection confirms the showcase profile hash
matches the current catalogue and retains 18 Products/two Media/seven taxonomies.
Together with the earlier owned reset/recreation, full seed and standalone
verify, showcase fixture proof is now complete. The operator did not provide
wait logs, so this does not separately prove that a live 429 was retried.

Next: the optional limits profile extends the same journal; no reset or Docker
build is needed. Expected totals are 122 Products, 50 Media and 71 taxonomies.
It exercises 50 variants, 64 tags, a 50-entry gallery, scalar/text boundaries,
pagination and actual over-limit denial. Limits live proof, migration/exit
evidence consolidation and legacy minimal-seeder retirement remain open.

```powershell
pnpm demo:d1:seed limits
pnpm demo:d1:verify limits
```

## Limits reached final pagination; search-field assumption

Confirmed seeder defect (operator log and read-only Gateway probes,
2026-10-12), recorded before correction: the limits seed created all 122
Products/50 Media/71 taxonomies. It reached `demo_public_pagination` after
per-record verification and denial checks, but expected 118 public IDs and
received an empty list. The journal still marks only showcase complete because
limits did not finish its verifier. Quota-wait messages confirm the request
limiter was exercised during the limits run.

Product list search explicitly matches title or SKU, not slug. The verifier
searches `nebula-demo-d1-v1`, which is a slug namespace; public reads with that
query correctly return zero rows. Live reads with `DEMO-D1` return 100 records
on page 1 and 18 on page 2. The admin collision lookup uses the same incorrect
slug query, so correct both lookups to the catalogue's `DEMO-D1-` SKU prefix.
Keep Product search behavior, fixture definitions/hashes and journal IDs intact.

The simulation only ran showcase orchestration and its admin list ignored
query/pagination. Implemented correction: model actual title/SKU search and paging,
exercise limits orchestration including the 51st-variant denial, and verify
public pagination with exact page sizes/unique owned IDs/an empty final page.
Name assertions by page/count/ID instead of dumping more than 100 UUIDs.
No schema/backend image change is needed. Retry the existing limits journal
after focused checks; do not reset or recreate these completed fixtures.

Observed validation: the corrected pagination helper passes against the live
Gateway with 118 exact owned public IDs, page sizes 100/18 and an empty third
page. It performs read-only requests and does not rewrite the journal. The
operator log reached the original final pagination assertion, establishing
that preceding per-record and denial checks completed in that run; complete
limits seed/verify success is still pending the corrected operator retry.
Local simulation now covers full limits creation and rerun, query/pagination
semantics, capacity denial and malformed pages (missing, duplicate, unowned and
trailing rows). Scoped ESLint, syntax and diff checks pass.

The complete 27-test suite passed, then the added SKU-search collision
regression passed separately (28 tests total). That regression proves a lost
Product journal entry is detected before duplicate creation rather than being
hidden by a query against the wrong field. Fixture hashes/IDs are unchanged.

Operator update: corrected `pnpm demo:d1:seed limits` and
`pnpm demo:d1:verify limits` both passed without errors. Independent journal
inspection confirms matching showcase and limits hashes, with all 122
Products/50 Media/71 taxonomies present. The limits capacity, per-record,
malformed-write/permission and pagination proof is complete. Its repeated-run
orchestration is locally tested; a separate full live limits rerun was not
reported. Full live showcase rerun was reported earlier.

The queued legacy Product seeder entrypoint replacement is now implemented and
locally checked; see the
[replacement checkpoint](2026-09-30-d1-seeder-replacement-log.md).
Next operator command is `pnpm backend:seed`. D1 remains open for entrypoint
integration, complete migration/rollback evidence and final regression/exit
consolidation. No Docker build/reset is required for this host-script change.

```powershell
pnpm demo:d1:seed
pnpm demo:d1:verify
pnpm demo:d1:seed
```
