# Media recovery proof (2026-10-06)

Recorded before implementation. Existing scanner preflight pauses claims,
PostgreSQL retains jobs across process stops, and expired leases can be
reclaimed. Unit/disposable tests cover these mechanisms, but the real
container outage/restart path has not been exercised. Classification: missing
release evidence, not a confirmed runtime defect or architecture replacement.

Add an optional recovery profile to the existing local Media live proof:

1. Create one approved PNG through the current Gateway/storage/worker flow.
2. Stop only the local scanner. Approved render/readiness must keep working;
   new uploads must remain PENDING/QUEUED without consuming attempts.
3. Remove one newly uploaded test object's bytes through Media's own runtime
   storage client; never delete another upload or expose credentials.
4. Stop Media, install an expired abandoned-lease fixture on one freshly
   created test job, then restart Media and scanner without rebuilding images.
   This is explicitly a controlled crash-state fixture, not a claim of killing
   an observed in-flight worker. Actual restarted worker processing must recover
   the lease once and approve, while missing bytes become BLOCKED/FAILED.
5. Restore stopped services on failures, delete only the proof's own records
   through the existing confirmed-delete API, and log out with idempotency.

Use the explicit development Compose file, repository-root project directory,
loopback Gateway port 3002, and a nonproduction caller. Only Media-owned test
rows are changed. Reuse the existing three processing tables and current API;
no service, migration, contract or scanner image change is required. Run the
longer live profile through Salar after syntax/lint and focused failure-path
checks. Preserve the earlier passing processing/D1/F3 results. Populated
migration/backfill/rollback evidence and the unreported Media HTTP/gRPC result
remain separate gates.

Populated migration proof: reuse the backend tool's existing disposable
database, SQL-migration and Prisma helpers. Apply the exact five pre-processing
migrations, insert eight legacy states and snapshot every Media field. Inject
an exception before the new migration commits; prove all new tables/type roll
back and old rows remain identical. Resolve the five established baseline
migrations, then deploy the real new migration through Prisma, verify its
selective three-job backfill and absence of invented scan/ownership evidence,
and rerun deploy/status. Always remove only the database created by the proof.
This proves failed-upgrade transaction rollback, not a successful deployment
downgrade to an old image. Old images cannot guarantee verified-copy delivery;
do not drop the processing tables or copies as a rollback shortcut. These
fixtures never access live/demo Media rows or storage objects.

Implementation checkpoint: both proof commands are prepared. Eight focused
client/recovery tests and four Media database-tooling tests pass; new live
scripts pass syntax and lint checks. The backend scripts pass syntax and
focused orchestration checks; their existing root ESLint Node-global/regex
configuration failures are not represented as a clean backend-script lint run.
Read-only probing confirms the current Media image contains Prisma/S3 clients,
processing is enabled, polling is 2 seconds and the attempt limit is five.
No containers were stopped and no actual fixture/migration/live proof was run
by Codex while preparing these scripts. Actual outcomes remain pending.

Run separately from the repository root in PowerShell, stopping on failure:

```powershell
pnpm db:verify:media:upgrade
pnpm test:media:recovery:live
```

The second command temporarily stops/restarts local Media and the scanner.
The three new failure-path tests verify ordinary exceptions attempt service
restoration, preserve primary errors and still restore the scanner if Media
restoration fails. Forced termination cannot guarantee JavaScript cleanup;
after interrupting the proof, restore with
`docker compose up -d --no-build --wait --wait-timeout 600` before other live
work. The main proof retains its confirmed-delete and logout cleanup. No Docker
image rebuild or repeat of the successful infected/corrupt/type tests is needed.
Record yesterday's unreported Media HTTP/gRPC suite result separately before
closing Batch A.

## Failed runs and correction plan

Salar ran both commands on 2026-10-06. Neither passed; Batch A remains open.
The upgrade proof rejected an unexpected SQL failure. Confirmed defect in the
proof: JavaScript string replacement interprets `$$` as one dollar sign,
corrupting the injected PostgreSQL DO block before its intended exception.
Use a replacement callback and assert the generated SQL retains both dollar
delimiters. Preserve the exact expected-error check and disposable cleanup.

The recovery proof passed scanner-outage/paused-attempts/approved-render, then
failed its one-shot Gateway readiness fetch after restarting Media with
`UND_ERR_SOCKET` (the peer closed the connection). Confirmed proof gap: it has
no reconnect window at that deliberate restart boundary. A stale HTTP
connection is plausible, but its precise cause is not established; no runtime
replacement is justified. Add bounded retries only there for connection
failures and HTTP 503, with request timeouts. Keep initial scanner-outage
delivery, forbidden responses and byte-integrity assertions strict. Verify
temporary recovery, exhausted retries and immediate integrity failures.

Read-only follow-up: all 16 running containers healthy, all 11 backend health
checks pass, zero Media verification databases, zero proof Media rows and zero
object-cleanup intents. Service restoration and record cleanup succeeded.
These corrections affect local proof scripts/tests only; no image rebuild or
application/schema change is planned. Both real proofs must be rerun.

Correction checkpoint: replacement callback preserves the injected DO block;
the orchestration test now checks its complete dollar-quoted suffix. After
Media restart only, approved delivery retries known transport failures and
HTTP 503 for at most six attempts within 60 seconds; readiness and render
share a bounded request signal. All other failures remain immediate. Twelve
client/recovery tests and four focused database-tooling tests pass, including
temporary socket/503 recovery, exhausted reconnects, forbidden responses,
incorrect bytes and cleanup restoration. Focused live-script lint, formatting,
syntax and `git diff --check` pass. Actual upgrade/recovery outcomes remain
pending rerun; earlier successful processing/D1/F3 evidence remains valid.

## Second live run

Salar supplied a passing populated upgrade: eight legacy records preserved,
three jobs backfilled, injected failure rolled back, deploy rerun passed and
the one disposable database was cleaned. This gate is now evidenced.

Recovery again passed scanner-outage behavior and now passed the approved
delivery reconnect check after Media restart. After starting the scanner, its
admin status poll failed with `UND_ERR_SOCKET`. Confirmed proof defect: the
previous correction covered only readiness/render immediately after restart;
subsequent read polling still aborted on a dropped connection. All sixteen
containers are healthy on inspection. The precise transport cause remains
unproven; this does not justify altering application clients or workers.

Before changing code: reuse one bounded reconnect helper for read-only recovery
operations after the deliberate restart, including terminal polling and final
render checks. Respect the existing polling deadline, bound each request, and
retry only known transport failures or HTTP 503. Keep writes, ordinary upload
proofs, pre-restart outage checks, permissions and byte assertions strict.
Add regression coverage for the complete recovery path and bounded read
failure handling. No rebuild or upgrade-proof rerun is needed.

Correction verified locally: the shared read reconnect helper now covers
post-restart terminal polls and final render reads as well as approved delivery.
Terminal polls retain their original 60-second deadline. Fifteen focused
client/recovery tests pass, including simulated complete lease/missing-source
recovery, a dropped admin-read socket, retry exhaustion and an already-expired
poll deadline. Focused lint, formatting, syntax and diff whitespace checks
pass. Independent database reads confirm zero proof Media rows, zero cleanup
intents and zero verifier databases. Only the actual recovery command remains
pending; the upgrade proof must not be repeated merely because recovery failed.

## Passing recovery result

Salar supplied the successful rerun on 2026-10-06: scanner restored healthy,
`expired-lease-fixture-recovered-after-worker-restart=ok`,
`missing-source-denied=ok` and `cleanup=ok`. Together with the preceding
scanner-outage and approved-delivery checks, the recovery proof now passes.
This establishes controlled expired-lease recovery through an actual worker
restart, not an observed in-flight process crash. Independent follow-up finds
all sixteen containers healthy, zero proof Media rows and zero cleanup intents.
Both populated upgrade and live recovery gates are satisfied. Media HTTP/gRPC
output remains unreported; record that result before Batch A integration
sign-off. No rebuild or further repeat of these passing proofs is required.
