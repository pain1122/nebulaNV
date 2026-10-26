# D1 demo seeder replacement log (2026-09-30)

Status: queued for Batch 4; no seeder was removed in Batch 3.

## 2026-10-12 replacement checkpoint

Recorded before implementation: operator showcase seed, full verify and rerun
passed, as did limits seed/full verify. Independent journal inspection confirms
both catalogue hashes and 122 Products/50 Media/71 taxonomies. The D1 replacement
is ready for the legacy entrypoint; keep the broader D1 exit gates open.

The remaining gap is concrete: `backend:seed` and backend boot still call
`seedBackendDemo`, which creates only the old minimal Product through internal
HTTP. Replace that Product portion with `pnpm demo:d1:seed` (showcase), reusing
the proven Gateway runner, production/local guards, ownership journal and
rate-aware requests. Use the existing injected pnpm executor for focused tests
and stop on runner failure before continuing Blog work. Preserve the valid Blog
lookup/create behavior and all Prisma identity/setup seeders. Retire the unused
minimal Product fixture constant/generator; do not delete stored legacy records.
No database migration or Docker image build is required. Validate this host
entrypoint with focused tests, then hand its live run to the operator.

Implemented: `seedBackendDemo` now executes the D1 showcase command, stops if
it fails, and then keeps the existing Blog lookup/create. Backend boot passes
its pnpm executor into this path. The minimal Product generator/constant and
unused response helper are removed; existing database rows are untouched.
Product and local-boot documentation describe the new behavior.

Validation: four focused seeder tests and the complete 62-test backend-tooling
suite pass, including delegation, inherited seed credentials, Blog create/skip,
production refusal and failure propagation. Node syntax and diff checks pass.
Direct root-script ESLint still reports 54 existing errors: 47 undefined Node
globals under the current config and seven regex-space style findings, outside
the changed logic. Do not claim root-script lint passed; no unrelated cleanup
was introduced. The live `pnpm backend:seed` integration run remains pending.

Operator update (2026-10-12): `pnpm backend:seed` completed successfully, reported
without pasted full output. Entry-point replacement integration is complete.
No new per-service creation counts or legacy-row deletions are claimed.

The development demo Product and Blog post are created by
`seedBackendDemo()` in `scripts/backend.mjs`, which is run by `pnpm backend:seed`.
It looks up each record before creating it and refuses to run in production.
`apps/product-service/prisma/seed.ts` and
`apps/blog-service/prisma/seed.ts` create no base records. Other service seeders
provide setup or migration fixtures and are outside this D1 demo replacement.

The current demo Product is a valid minimal active base Product, as confirmed
by its successful recreation and an idempotent second seed run on 2026-09-30.
It does not cover D1 variants or Media/Taxonomy relationships. The local
URL-only gallery rows belong to old hidden draft test Products, not this demo
seeder; their presence is not a reason to change the seeder.

Batch 4 action: replace the demo Product fixture in `seedBackendDemo()` with
fresh, valid D1 examples after the Product, Media, and Taxonomy contract is
settled. Include active/draft/archived and base/variant coverage, with
relationship records created through their owning services. Keep the
development-only guard and rerun-safe lookup. Review the Blog demo separately
only if its own contract requires a change. Prove creation from an empty demo
dataset and a second idempotent run before retiring the old fixture. Do not
delete authority, identity, or other base seeders as part of this action.
