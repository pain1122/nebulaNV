# D1 populated upgrade and exit proof — 2026-10-12

Status: populated Product/Order upgrade and rollback proof passed
(operator-reported); final regressions passed and D1 signed off.

## Evidence before implementation

The operator reports the updated `pnpm backend:seed` passed. Showcase
seed/reset/recreation/verify/rerun and limits seed/verify are already recorded.
The minimal Product generator is retired from the entrypoint; Blog and base
seeders and stored legacy records are preserved.

Confirmed verification gap: `db:verify:product` deploys into an empty disposable
database, then exercises constraints. Product metadata has its own populated
upgrade proof, but D1-wide preservation and failed-migration rollback were not
proved for the earlier currency/inventory/variant/reference migrations. Order's
two currency-default removals also lack populated before/after evidence.
Do not close D1 or describe those proofs as already passed.

## Authorized implementation scope

Add a verification command using two disposable databases and temporary copies
of the current Prisma schemas/migrations. For Product, stage the three pre-D1
migrations, insert legacy lifecycle/discount/currency/gallery rows, then exercise
the seven D1 migrations through metadata. For Order, stage the two pre-currency
migrations, insert a cart/order and their items, then exercise currency authority.

For each target migration, snapshot schema and populated data, inject a deliberate
failure into its temporary SQL copy. For seven migrations, execute actual Prisma
migrate deploy, require the marker and resolve the failed temporary migration.
For metadata's existing explicit transaction, use psql to require the exact first
error (see the diagnostic correction below). Assert unchanged schema/data,
restore the original copy and deploy successfully with Prisma. Verify original
column values, new defaults/backfills, and repeat deploy/status without changes.
The proof tests current migration behavior; it must not wrap or rewrite repository
migrations to manufacture rollback success. A failed atomicity assertion remains
a finding to investigate.

Only generated disposable database names may be dropped. Verify the temporary
directory's resolved path/name before recursive removal. Always clean owned
databases/copies after failure; surface cleanup errors. No persistent demo DB,
seed journal, running image or applied repository migration is changed.

Run orchestration/safety checks locally. Hand the actual migration proof and
remaining backend/generated-client/live regression commands to the operator.
SQL/mock tests do not establish PostgreSQL or Prisma rollback success.

## Local implementation checkpoint

`pnpm db:verify:d1:upgrade` stages actual Prisma deploy/resolve/status against
temporary schemas. It tests seven native Prisma failure/recovery cases and one
explicit SQL transaction rollback across Product and Order, preserves original
row-column values, verifies stock/version/
selection defaults, SKU backfill and null Media/taxonomy/text additions, checks
currency-default removal and missing-currency denial, then deploys/status-checks
twice with schema/data comparisons. The existing Product constraint scripts
cover malformed inventory/variant/reference writes in the upgraded database.

All 67 backend-tooling tests pass after the diagnostic correction. Five tests
cover staging/recovery for all eight migrations, unchanged repository migration
bytes, production refusal, unexpected-failure/schema-change stop behavior,
database/temp-file cleanup, and metadata's exact first error/nonzero exit.
Node syntax and diff checks pass. Root-script lint limitations already recorded
in the seeder replacement log remain; this does not claim that lint gate passed.
The operator verified the first six native rollback cases. Full preservation,
metadata rollback, Order recovery and final denial/rerun evidence stays pending
until the corrected operator command passes.
Failures include sanitized tool output so the failing layer remains diagnosable.

Run next:

```powershell
pnpm db:verify:d1:upgrade
```

Expected successful final line: D1 populated upgrade verified, services=2,
migrations=8, rollback=8, legacy-preserved=ok, deploy-rerun=ok and cleaned two
disposable databases. Do not rerun backend boot, build images or apply migrations
to the demo database for this verification command.

## Metadata rollback diagnostic correction

Confirmed verifier defect: the operator passed the first six Product rollback
checks, then the metadata check stopped because Prisma's output omitted the
injected marker. PostgreSQL container logs show the exact intentional error
`d1_upgrade_rollback_20261010000100_descriptive_metadata` at
2026-10-12 12:57:51.271 UTC, followed by the secondary aborted-transaction error
at 12:57:51.286 UTC on the same backend PID 37178. The metadata migration reached
the intended fault; this output does not identify a defective metadata migration.

Narrow correction, recorded before implementation: for an existing migration
with explicit BEGIN/COMMIT, run its faulted temporary SQL through the existing
psql failure checker, requiring the exact first error marker, then assert the
same unchanged populated data/schema. Do not accept arbitrary aborted-transaction
errors or add transaction wrappers. The other seven cases retain native Prisma
failure/resolve checks. Every successful migration and deploy/status rerun still
uses Prisma. No repository migration, persistent database or running image changes.
This distinguishes SQL transaction rollback evidence from failed Prisma migration
recovery evidence; the operator's complete eight-case proof remains pending.

The correction is implemented without changing repository migration SQL. Local
tests reject an unrelated/aborted first SQL error, an earlier error even when the
marker appears later, and a zero exit status; owned resources are still cleaned.
All 67 tooling tests, syntax checks and diff checks pass. Rerun the same command;
no image rebuild, demo reset or persistent database repair is required.

## Final constraint fixture audit

Confirmed verifier defect, recorded before implementation: the next operator
run passed all seven Product upgrade/rollback cases. The final missing-currency
probe omitted Product.description, required without a default in the original
20251002054925 migration and current Prisma model. PostgreSQL therefore reported
the description not-null violation, and the verifier correctly refused to count
it as currency rejection. No production/schema relaxation is appropriate.

The broader testing gap is that backend orchestration tests mock PostgreSQL;
their pass count cannot validate fixture SQL. Inspect both final scripts against
original migrations/current models, supply the missing description, and add
positive explicit-currency inserts for Product, Cart and Order before their
missing-currency probes. Preserve exact failed-column checks and transaction
rollback. Run real final SQL/constraint checks against owned disposable databases
before the operator repeats the full Prisma migration proof. Successful direct
SQL checks will not establish Prisma failed-migration recovery or close D1.

Implemented and executed: supplied Product.description, added positive explicit
currency controls to both scripts, and ran the original baseline migrations,
legacy fixtures/snapshots, remaining migrations and final SQL checks in two
owned `nebula_d1_sql_product_verify_*` / `nebula_d1_sql_order_verify_*` databases.
Both services passed real PostgreSQL valid inserts, missing-currency rejection
with the exact column diagnosis, legacy preservation and repeated final checks.
Product also passed inventory, variants, references and metadata constraint
scripts. All migrations in this audit were applied directly with psql; it does
not claim native Prisma deploy/resolve or injected-failure recovery success.
Both audit databases were dropped successfully. All 67 tooling tests and
format/diff checks also pass. Persistent demo data and images were untouched.

The common confirmed gap in these two incidents was inadequate real SQL/driver
validation of a new verifier, not evidence of a common container failure.
The full corrected `pnpm db:verify:d1:upgrade` remains the next operator gate;
D1 stays open until that and the remaining regression gates pass.

## Operator completion and current status

2026-10-12: Salar reports the corrected `pnpm db:verify:d1:upgrade` completed
without errors. Full final stdout was not supplied; record this as an
operator-reported pass, separately from the locally observed SQL audit.

The completed command covers Product's seven D1 migrations and Order's currency
migration: seven native Prisma failure/resolve/recovery checks, one explicit
metadata SQL transaction rollback, original populated-row preservation,
new defaults/SKU backfill, malformed/missing-currency denial, successful Prisma
deployment and repeated deploy/status/schema/data checks. Owned database and
temporary-copy cleanup are required for the command to return successfully.
No further upgrade-proof retry, image rebuild or demo reset is scheduled.

Completed D1 evidence now includes Batches 0-3, F5 Core Media A-C/integration,
showcase reset/recreation/seed/verify/rerun, limits seed/verify, legacy Product
entrypoint delegation and populated Product/Order upgrade/rollback proof.
The separately unreported live limits rerun is not counted as observed evidence;
its orchestration is locally tested. Broader frontend, cloud/CDN and tenant
completion remains unclaimed.

Remaining: run the final scoped Product/Gateway quality and generated-client
checks, Product integration and relevant D1/F3 live regressions; record their
actual results and limitations in the D1 exit report. D1 remains active at that
final gate. D2 cart/checkout/order hardening begins only after sign-off.
