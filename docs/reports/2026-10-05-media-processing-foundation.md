# Media processing foundation checkpoint (2026-10-05)

Status: Batch A source implementation and local checks complete. Salar reports
the disposable PostgreSQL proof passed; the additive demo migration was then
deployed successfully. The corrected Media image build completed in 3m 19s.
The actual scanner/processing live proof passed all seven checks including
cleanup. Salar also supplied passing D1 ready-media reference and all six F3
regression flows. Populated upgrade and live recovery passed on 2026-10-06,
including controlled expired-lease recovery, missing-source denial and cleanup.
The 2026-10-07 integration run passed gRPC and 101 tests, with six database
tests skipped; HTTP failed at its first setup login. A focused unchanged
setup rerun passed. The
[HTTP setup checkpoint](2026-10-07-media-http-setup-failure.md) records the
test-helper correction. The full integration rerun subsequently passed eleven
suites/124 tests, with six disposable-database tests intentionally skipped.
Batch A is signed off on 2026-10-07; the F5 Core exit remains open until image
tools, descriptive metadata and integration/handoff proof are complete.

Live follow-up: Salar's processing run passed actual scan/validate/promotion/
render, verified-copy stability after upload-key overwrite, and infected,
corrupt, MIME-mismatched and extension-mismatched denial. Its final logout
failed client-side with `gateway_idempotency_key_required`. Inspection confirms
the script omitted logout's required idempotency key; both Media deletion
requests already supplied keys. Classification: confirmed proof-script defect,
not a scanner or Gateway enforcement failure. The narrow correction added a
fresh key to logout and preserved the existing client requirement. The proof
was rerun without rebuilding images. At the failed-run checkpoint, full proof
success remained unclaimed; the later successful result is recorded below.
The script correction passes syntax/lint checks. Read-only database inspection
found zero remaining `media-processing-` fixture rows and zero object-cleanup
intents, confirming file cleanup completed in the failed run; logout and the
overall proof still required a successful rerun.

Salar's subsequent complete rerun passed on 2026-10-05:

```text
[media-processing-live] scan-validate-promote-render=ok
[media-processing-live] reused-upload-url-cannot-change-approved-bytes=ok
[media-processing-live] infected.png-denied=ok
[media-processing-live] corrupt.png-denied=ok
[media-processing-live] wrong-type.webp-denied=ok
[media-processing-live] wrong-extension.jpg-denied=ok
[media-processing-live] cleanup=ok
```

The last container inspection independently confirmed every application,
scanner and infrastructure container running and healthy. Do not repeat
successful proofs or rebuild without a new reason.

## End-of-day checkpoint (2026-10-05, Asia/Tehran)

Salar supplied these additional passing live results before stopping for the day:

```text
[d1-references-live] deferred-url-inputs-denied=ok
[d1-references-live] wrong-kind-denied=ok
[d1-references-live] missing-media-denied=ok
[d1-references-live] raw-gallery-url-denied=ok
[d1-references-live] ready-media-bind-render=ok
[d1-references-live] blocked-media-denial=ok
[d1-references-live] cleanup=ok
[f3-live] gateway-readiness=ok
[f3-live] anonymous-storefront=ok
[f3-live] authenticated-storefront=ok
[f3-live] authorized-admin=ok
[f3-live] registered-mobile=ok
[f3-live] partner-execution-disabled=ok
```

The ready-media fixture flag was removed afterward. Media HTTP/gRPC suite
output was not included, so its status is unreported rather than failed or
passed. Resume by checking container readiness if the machine/Docker was
stopped, recording that suite's result (run only if needed), then collecting
scanner/worker outage-restart and populated migration/backfill/rollback
evidence. Image tools remain Batch B, followed by descriptive metadata in
Batch C. No further implementation, tests, builds or container changes were
started after Salar's stop request.

## Resume sanity check (2026-10-06, Asia/Tehran)

Read-only checks confirmed all sixteen running containers healthy and all
eleven `pnpm backend:health` readiness checks passing. Application/scanner/
infrastructure containers report zero restart counts; initialization jobs
exited successfully. The old authority initialization orphan remains unchanged.
Scanner memory is about 953 MiB, Media about 90 MiB, with low observed CPU use;
Docker still has two CPUs and about 3.8 GiB total RAM. Actual healthy scanner
checks are used rather than relying only on Docker's OOM flag.

The demo Media database has zero unfinished migrations, queued processing
jobs, expired processing leases and pending object-cleanup intents. No Media
verifier databases remain. No containers were restarted and no image build or
live suite was repeated. Yesterday's Media HTTP/gRPC result remains unreported;
confirm it before asking Salar to repeat the suite. Recovery and populated
upgrade/rollback proofs remain outstanding.

The subsequent [recovery/upgrade checkpoint](2026-10-06-media-recovery-proof.md)
provides prepared, locally checked proof commands without rebuilding the image:
`pnpm db:verify:media:upgrade` and `pnpm test:media:recovery:live`. Populated
upgrade and recovery now pass after the documented read-reconnect corrections.
All sixteen containers are healthy and proof rows/cleanup intents are absent.
No rebuild or repeat of either proof is needed.

The approved scope was recorded in the
[execution plan](2026-10-05-media-core-execution-plan.md) before source edits.
This checkpoint addresses the confirmed missing upload-to-approved lifecycle.
It preserves current Media/Gateway/actor/S2S and storage boundaries, uses the
existing PostgreSQL database, and does not activate F4 or introduce a general
queue platform. Image tools and alt/title metadata are later core batches.

## Implementation and compatibility

Review finding before enabling automatic approval: presign already uses verified
actors and finalize validates the key's lane, but the stored object is not bound
to that verified actor/owner/context. Knowing another private upload key could
otherwise allow registering it under a different owner and receiving automatic
approval. Classification: confirmed unmet ownership requirement for the new
automatic pipeline, not a claim of anonymous service access. The narrow fix is
a domain-separated HMAC in signed S3 upload metadata, checked at finalize and
again against the job's expected binding during processing. Reuse the existing
required Media signing secret, preserve the adapters/DTOs, and do not introduce
an upload authority service. Old unapproved objects without the binding must
not be automatically approved; existing old approvals remain compatibility data.

The installed S3 presigner was tested locally: the opaque binding travels in
the signed upload query, so current clients do not need an additional header.
After deploying, discard any previously issued upload URL and presign/upload
again. Migrated old pending jobs have no authorization binding and terminate
as BLOCKED/FAILED with `upload_authorization_unverified`; they do not gain
approval from a fabricated proof. Their records and bytes remain available
for operator review. Rotating the existing signing secret invalidates
outstanding upload authorizations, but does not revoke already verified copies.

- Migration `20261005000100_media_processing_foundation` adds jobs, verified
  source facts, and independent object-cleanup intents. Old rows/IDs/bytes are
  preserved. Only existing unapproved S3 NONE/QUEUED/SCANNING uploads receive
  jobs; old approvals are not described as worker-verified.
- Finalize atomically creates its Media/job pair after size, declared MIME,
  ETag and optional checksum-claim checks. The checksum claim is not stored as
  verified fact. Verified checksums are non-unique across Media identities,
  allowing identical files with independent owners without collapsing policy.
- One bounded poller per Media process claims jobs under row locks with
  SKIP LOCKED, lease tokens and database time. Completion/failure requires the
  current unexpired claim and PENDING Media; expired claims recover, retries
  back off, and attempt exhaustion blocks instead of approving.
- Actual object reads require the finalized ETag, enforce actual byte counts,
  and abort stalled streams. ClamAV receives the complete bytes through
  INSTREAM. Sharp validates magic/format/extension/checksum and fully decodes
  pixels with size/time limits after a clean scan. Single-frame PNG/JPEG/WebP/
  GIF are supported; animations are explicitly deferred, not silently truncated.
- Before writing an isolated verified copy, persist its cleanup intent.
  Successful source publication, approval, job completion and intent removal
  are one transaction. Replaced/lost/deleted claims leave cleanup discoverable.
  Public render and authorized private read links use the verified copy, so
  reusing an upload URL does not change approved bytes.
- Local legacy create already rejected direct S3 creation. New local metadata
  registrations now stay PENDING/NONE; they cannot claim a scan. Existing
  pre-pipeline approvals retain compatibility reads, while a new job-backed
  approval missing its verified source fails closed.
- Delete locks Media before reading its verified-source relationship, revokes
  completion/read eligibility, cancels its job, removes upload/source objects,
  and only then removes the row. Cleanup failure preserves a DELETED row for
  retry. Independent staging-copy intents survive cascade deletion.
- No proto/OpenAPI/generated client contract was broadened in this batch.
  Media HTTP/gRPC tests now upload real WebP and await processing. D1 reference
  live proof now awaits actual promotion; its deliberate BLOCKED/restore owner
  fixture mutations remain explicit denial tests, not scanner simulations.

## Dependencies and operations

Sharp 0.35.5 is installed with its lockfile/native platform packages. The Media
image now decodes a tiny PNG during build to detect missing native bindings.
ClamAV uses the official 1.4 image pinned to digest
`sha256:57deb108fc4c72778aa83eafbca7bb7153e28c3f57c005afd38d31f16da86f23`,
verified against Docker Hub tag metadata on 2026-10-05. Development and release
Compose define the same scanner limits, signature volume and no host port.
The container has a 4 GiB limit; initial pull/signature preparation can take
time. No local Docker image build/pull or live database migration was run here.

Primary references consulted for the implemented interfaces:

- [ClamAV INSTREAM protocol](https://docs.clamav.net/manual/Usage/ClamdProtocol.html)
- [Official ClamAV Docker deployment and memory guidance](https://docs.clamav.net/manual/Installing/Docker.html)
- [Official image configuration entrypoint](https://github.com/Cisco-Talos/clamav-docker/blob/main/clamav/1.4/alpine/scripts/docker-entrypoint.sh)
- [Sharp input validation and pixel limits](https://sharp.pixelplumbing.com/api-constructor/)
- [Sharp processing timeout](https://sharp.pixelplumbing.com/api-operation/#timeout)

Scanner unavailability pauses claims without spending every queued upload's
attempt budget. Existing approved delivery retains independent readiness.
Scanner-limit/ambiguous responses cannot become CLEAN. Disabled processing
also leaves uploads unapproved; it is not a bypass.

## Local evidence

- Media unit suite: **8 suites / 90 tests passed**.
- Media type check and Prisma generation passed.
- Focused processing/config/service tests and new Gateway-client live scripts
  lint clean; pre-existing Media access-test warnings are not presented as a
  full repository lint pass.
- Backend orchestration: **4 focused tests passed**, including isolated Media
  proof dispatch and disposal after a proof failure.
- Development Compose configuration validates; new live scripts parse and the
  generated PNG fixture fully decodes to 64x64 RGB. Release container execution,
  native Linux image loading, PostgreSQL job semantics and real ClamAV verdicts
  are not implied by these local checks.
- Current container inspection found healthy PostgreSQL, MinIO and Redis;
  application containers were stopped. The staged startup below restores the
  existing backend images as well as the newly built Media image.

## Salar's staged commands

### Follow-up container sanity check

Salar reported that the preceding `pnpm db:verify:media` test succeeded;
the full test output was not supplied. Read-only inspection confirmed zero
remaining Media verifier databases and zero unfinished migrations in the
existing `nebula_media` database. PostgreSQL, MinIO and both Redis containers
are running and healthy. All eleven application containers are stopped with
exit 255 and closely matching shutdown timestamps; none reports an OOM kill
or restart loop. This suggests a shared engine/machine shutdown, but does not
establish the exact cause. Initialization jobs exited successfully. The old
authority initialization container is an existing orphan, not a failed job.

The new processing table/migration was initially absent from the demo database
and the scanner container had not been created. The additive migration was
deployed successfully while applications were stopped; read-only verification
confirmed its completed migration record, no unfinished migrations, zero queued
jobs and zero verified sources. This deployment is not proof of populated
pending-upload backfill. Next: build Media and start the scanner/backend. Do not
declare overall backend readiness from infrastructure health alone. No cleanup
or image pruning was performed.

Run from the repository root in PowerShell. Proceed to each block only after
the preceding block succeeds. Return the first failure and its bounded tail.

First verify the complete migration chain, constraints, concurrent claims,
lease recovery, retry limits, deletion/completion race and source identity in
a disposable database. This command removes only the database it created:

```powershell
pnpm db:verify:media
```

The additive migration below has already been applied to this local database
during the follow-up. Skip this block on this machine. For another checkout, the
block restores any previous DATABASE_URL value. Do not point this local
sequence at a production database:

```powershell
$previousMediaDatabaseUrl = $env:DATABASE_URL
try {
    $env:DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:15432/nebula_media?schema=public'
    pnpm --filter @nebula/media-service prisma:migrate:deploy
    if ($LASTEXITCODE -ne 0) { throw 'Media migration failed; stop here.' }
} finally {
    if ($null -eq $previousMediaDatabaseUrl) {
        Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
    } else {
        $env:DATABASE_URL = $previousMediaDatabaseUrl
    }
}
```

Build only Media; no forced cache invalidation or Gateway rebuild is required
by this batch. The [build stall correction](2026-10-05-media-build-stall.md)
sets the local Media target to compile Media/dependencies only and one Turbo
task at a time. On this 3.8 GiB Docker VM, keep the scanner stopped during the
build, then start it with the backend. Its signatures persist across stops.
Run each command separately and stop on failure. If an old build is still
running, cancel it in its terminal with Ctrl+C before using the corrected file:

```powershell
docker compose stop media-scanner
docker compose --progress plain build media-service
docker compose up -d --no-build --wait --wait-timeout 600
pnpm backend:health
```

Finally exercise actual upload/scan/promotion, approved-byte stability after
upload-key overwrite, EICAR denial, malformed/type/extension denial, cleanup,
Product reference compatibility and preserved F3 behavior:

```powershell
pnpm test:media:processing:live
$env:D1_READY_MEDIA_FIXTURE = '1'
pnpm test:d1:references:live
Remove-Item Env:D1_READY_MEDIA_FIXTURE
pnpm test:f3:live
```

The processing proof above has passed. The next outstanding regression block is:

```powershell
pnpm --filter @nebula/media-service test:e2e
$env:D1_READY_MEDIA_FIXTURE = '1'
pnpm test:d1:references:live
Remove-Item Env:D1_READY_MEDIA_FIXTURE
pnpm test:f3:live
```

After these pass, record a live
worker/scanner outage/restart proof before closing Batch A. Populated backfill
and rollback evidence is also pending: the fresh disposable proof must not be
reported as a populated upgrade. Do not drop the new tables or source copies
as a rollback shortcut; an old image would not preserve the verified-copy
delivery guarantee. Record an explicit data-preserving rollback before use.
