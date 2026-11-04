# SeaweedFS supply and setup

November 4 status: SeaweedFS is active and M1-M7 are accepted. MinIO is stopped
for retained rollback. Use the current root README/Setup and
[device handoff](../../docs/current-focus.md#november-4-device-handoff) for startup
and dependencies; fresh-machine bootstrap acceptance remains B3. The earlier M1-M5
preparation notes below are historical cutover evidence, not fresh-device steps.
The published archive and verification route are described later in this file.

## Historical isolated security candidate

The active application stack still uses MinIO. The accepted S3 pilot uses the
official pinned 4.51 image in compose.proof.yml. security.Dockerfile prepares a
separate linux/amd64 candidate fixing the compiled go-jose dependency to 4.1.7.
It does not deploy or publish anything.

The source commit is 153ab668c99731a6d29492bf6c61d0b4fa701101. Builder Go 1.26.10
matches the original scanned binary. Both builder and original runtime are
digest-pinned. Only the normal-variant weed binary is rebuilt; inherited runtime
files, Rust binaries, entrypoint and storage layout are preserved. The build
refuses unrelated module-graph or go.mod/go.sum changes, verifies the selected
module checksums, runs go-jose tests and checks the resulting binary metadata.
Provenance and the source license are included in the candidate image. Public
module downloads use goproxy.cn, then goproxy.io, then direct source fallback on
download errors. Go's signed checksum database and all version/hash guards remain
enabled. GOPROXY is a build argument for network-specific routing; do not disable
GOSUMDB or change module versions to work around access failures.

## Current proof status

Static preparation passed: shell syntax, selected checksum/source/builder pins,
module-diff negative controls and candidate-only YAML override. Docker engine
readiness is restored. Native BuildKit checks pass without warnings, and actual
Compose renders preserve the base proof settings except candidate image/pull
policy. The first source build passed go-jose module tests and graph/checksum
guards, then failed on blocked Google-proxy downloads of other unchanged modules.
The corrected-routing retry built successfully. Agent inspection of the local
candidate confirms go-jose 4.1.7, the pinned compiler/source and a module patch
containing only the intended dependency changes. Eight module packages pass tests;
two utility packages have no test files. The hosted candidate's scan and local
S3/restart proof now pass; see the Media transition report for exact identities.
On Nov 2 Salar reports all proof commands passed; agent inspection confirms
session 0b263ed8a1e64a5246eefaed is complete and the healthy proof container uses
the verified imported image. M1 is accepted. Active storage cutover remains M2-M6
work; the application stack still uses MinIO. Preserve caches and proof evidence.

## Operator sequence after preparation passes

### M2 alongside preparation

`compose.storage.yml` is an opt-in fragment merged after either root Compose
file. It adds only Seaweed, bound to loopback port 19000, with a new seaweed-data
volume. Master/filer/volume/admin interfaces have no published host ports. Both
objects and the explicit `/data/filerldb2` metadata store live under persistent
`/data`. Four volumes with a 1024 MiB master size limit are configured for this
bounded demo; this is not a filesystem quota or distributed deployment claim.
Do not attach a MinIO data volume to Seaweed.

`node scripts/storage/seaweed-setup.mjs prepare` creates private random admin and
bucket-scoped Media credentials under ignored `.nebula-storage/seaweedfs/`.
Reruns verify exact saved files without rotating keys; conflicts/tampering stop.
Keep that directory private and out of Git and Docker build contexts. Its
`s3.json` is mounted as a read-only Compose secret. Only the server receives it.
The native bootstrap uses Media's installed S3 SDK; no dependency install or
Nebula image build is needed on this prepared developer machine. Fresh release
and CI bootstrap integration remains M4/M5 work.

Pass only generated `compose.env` (port/origins) to Compose. Its private `.env`
also contains future Media settings and is read directly by the helpers; passing
it to release Compose would prematurely redirect Media. Root and Media env files
remain unchanged until M5. The sample `.env.storage.example` documents settings;
its placeholder credentials must not be deployed. Set SEAWEED_CORS_ORIGINS before
the first prepare for different exact browser origins; defaults are localhost
ports 3000 and 5173. Reconfiguration of an existing session requires review rather
than silent credential replacement.

After the report's cheap preparation receipt passes, Salar runs each operation
from the repository root, stopping at the first failure:

```powershell
docker compose --env-file .env --env-file .nebula-storage/seaweedfs/compose.env -f docker-compose.yml -f docker/seaweedfs/compose.storage.yml up -d --no-build --no-deps --wait --wait-timeout 180 seaweed
node scripts/storage/seaweed-setup.mjs init
node scripts/storage/seaweed-setup.mjs init
node scripts/storage/seaweed-storage-proof.mjs witness
docker compose --env-file .env --env-file .nebula-storage/seaweedfs/compose.env -f docker-compose.yml -f docker/seaweedfs/compose.storage.yml up -d --no-build --no-deps --force-recreate --wait --wait-timeout 180 seaweed
node scripts/storage/seaweed-storage-proof.mjs verify
```

The two init calls check real rerun behavior. They create a missing bucket,
explicitly set/verify CORS and check scoped Media access without deleting objects.
The witness checks allowed origins, denied origin/header preflights, signed upload
bytes/metadata and anonymous/cross-bucket/admin denial. It journals only owned
fixture names before mutation and records actual container/image identity.
Denied-header OPTIONS may return 200 with permission headers withheld; the proof
requires effective denial and rejects a response granting the forbidden header
or wildcard. An availability error does not count as a successful CORS denial.
Verify requires a different healthy container with the same image, compares bytes,
metadata, cache control and ETag, then deletes only the owned witness. Success
ends with recreated-container-preserves-bytes-metadata-etag and owned-cleanup.

On failure preserve `proof.json` and the reported check/status; do not repeat
witness or delete volumes to bypass the guard. An explicitly requested
`node scripts/storage/seaweed-storage-proof.mjs cleanup` targets only that
validated journal's fixture keys/buckets and refuses foreign ownership. Preserve
completed/cleaned journals before any future fresh proof. Do not switch live
Media, remove MinIO, prune containers or run new demo seeds in this handoff.

Release preparation uses the same fragment after docker-compose.release.yml,
with deploy/.env.production.example followed by generated compose.env for render
checks. It does not deploy the example or publish storage remotely. M2 preparation
is accepted on Nov 2: run 06d5f1e9e064cf004ee93b8b passes preflights, signed upload,
scoped access, recreation persistence and owned cleanup. Agent confirms the
complete journal, healthy recreated container and unchanged accepted image.
M4/M5 and final M6 Media acceptance remain separate gates; active Media still
uses MinIO. Preserve the completed proof journal rather than rerunning witness.

### M3 runtime preparation

M3 runtime preparation follows the selected Media endpoint and healthy dependency
in the rendered configuration. The current base still selects MinIO even when
this prepared Seaweed container is running. Native Media S3 inputs follow the
existing loopback endpoint policy; scanner publication/native Media watch remains
out of scope. Final release validation rejects the extra alongside storage port;
M4/M5 must prepare the actual selected topology and initializer before activation.
SQL backups do not include this volume, filer metadata or private settings; the
B4 recovery package must cover those separately. No full boot/build is needed to
verify this tooling preparation.

M3 preparation is accepted on Nov 2: focused checks and actual base renders pass,
and Salar reports full backend-tooling 86/86 plus backend-dev 16/16 passing, with
zero failures or skips. This does not activate Seaweed for Media or certify the
broader current snapshot in hosted CI.

### M4 supply and container bootstrap preparation

The repository vendor-image.json pins the existing M1 archive SHA-256, six
verification/checksum files, canonical configuration/layers and source/workflow
identity. The verified [vendor cache release](https://github.com/pain1122/nebulaNV/releases/tag/vendor-seaweedfs-4.51-gojose4.1.7)
is now published as a non-latest prerelease. All eight uploaded asset digests and
sizes match the reviewed files, and its source tag targets the accepted M1 build.
The published backend CI still uses its working MinIO cache. Prepared workflow
changes select Seaweed; fresh public download/load and corrected verify-loaded
verification now pass, accepting the M4 supply route. Full current-snapshot
hosted CI is B5.
`pnpm test:storage:setup` is now registered in ordinary CI quality and covers the
vendor evidence/archive gates plus native/container setup regressions.

The existing vendor helper accepts verify-archive, load-archive and verify-loaded
with a download directory. Verification checks repository-pinned hashes before tar metadata, then
checks exactly one tagged image, actual config digest/layers and matching scan/
module evidence. Loading additionally compares the actual loaded runtime config
and layers in memory, allowing Docker's local store ID to differ from its config
digest. Comparison treats only omitted/null User as the empty default and
omitted/null OnBuild as no build triggers, matching Docker's observed import
representation. All other fields and nonempty values are compared exactly.
Only a sanitized receipt is written to .ci-evidence/seaweed-vendor.json;
credentials and raw image Config.Env are never retained by that receipt.

compose.bootstrap.yml adds only a one-shot seaweed-init using the already built
Media image as user node, with read-only filesystem and no published ports. It
reads the existing read-only S3 secret and explicitly uses the internal Seaweed
endpoint. It does not load the app's Nest bootstrap, native env files or private
storage .env. Only port/origins enter its environment. Exact identity/grant checks
refuse unexpected config; no new utility image or application rebuild is needed.

After the M4 first-handoff receipt passes, run separately and stop at the first
failure:

```powershell
node scripts/storage/seaweed-vendor-evidence.mjs verify-archive .ci-evidence/seaweed-hosted/41203305981
docker compose --env-file .env --env-file .nebula-storage/seaweedfs/compose.env -f docker-compose.yml -f docker/seaweedfs/compose.storage.yml -f docker/seaweedfs/compose.bootstrap.yml run --rm --no-deps seaweed-init
docker compose --env-file .env --env-file .nebula-storage/seaweedfs/compose.env -f docker-compose.yml -f docker/seaweedfs/compose.storage.yml -f docker/seaweedfs/compose.bootstrap.yml run --rm --no-deps seaweed-init
```

Expect archive-checksum-config-layers-and-scan=ok and two
bucket-cors-scoped-media-access=ok results. Keep the existing Seaweed server running
for these commands; do not start the whole stack or redirect Media. The repeated
initializer verifies actual container reruns, not a new data migration.

Release inventory now honors COMPOSE_FILE/COMPOSE_PATH_SEPARATOR or an explicit
composeFiles selection while preserving all-profile and complete-backend checks.
The ordinary base retains 16 images; the opt-in alongside/bootstrap composition
has 17 unique images because initialization reuses Media. PowerShell save/load
wrappers remain the existing workflow; use the same Compose/environment selection
for inventory and deployment. Backend identity evidence remains backend-only,
with the separate vendor receipt for storage. Fresh public cache download/load
is accepted under M4; actual runtime activation remains M5, and the prepared
workflow still needs current-snapshot hosted acceptance in B5.

After the reviewed draft's eight server checksums/sizes and source tag were
verified, vendor release 431347730 was published as a non-latest prerelease.
For the final native supply check, Salar downloads the published assets into a
fresh owned directory and runs the existing verified loader:

```powershell
gh release download vendor-seaweedfs-4.51-gojose4.1.7 --repo pain1122/nebulaNV --dir .ci-evidence/seaweed-release/4.51-gojose4.1.7
node scripts/storage/seaweed-vendor-evidence.mjs load-archive .ci-evidence/seaweed-release/4.51-gojose4.1.7
```

Stop at the first failure. Expect checksum-config-layers-scan-and-loaded-image=ok
and a sanitized .ci-evidence/seaweed-vendor.json receipt. No image compilation,
application restart or provider switch is part of this check. Do not overwrite
an existing release/download to bypass a failed verification.

Nov 2: the public download and image load succeeded, but the original comparator
rejected Docker's empty User/OnBuild defaults. The corrected comparator preserves
all meaningful configuration checks. For this already imported image, run only:

```powershell
node scripts/storage/seaweed-vendor-evidence.mjs verify-loaded .ci-evidence/seaweed-release/4.51-gojose4.1.7
```

This rechecks the complete downloaded archive/evidence and the current loaded
image, then writes the same sanitized receipt. It does not invoke docker load,
download assets, rebuild images or restart containers. Expect the same
checksum-config-layers-scan-and-loaded-image=ok marker. Salar reports that marker
passes; agent inspection confirms the sanitized receipt. M4 native supply
verification is accepted. The two-sided representation oversight and required
prevention are recorded in docs/testing/pre-suite-checklist.md and the Media
transition report.

### M5 existing-object transfer checkpoint

The selected route preserves the existing demo. The initial read-only plan finds
302 MinIO objects (20,109,453 bytes), fifty ready Media originals and 200 approved
derivatives. Four retired derivative rows deliberately have no stored bytes after
normal cleanup. The transfer validates currently approved references and copies
all existing objects, including unreferenced ones. Both buckets are named media;
stored rows already use s3. IDs, paths, checksums, database rows and demo journals
remain unchanged. No reset or new application image is needed.

scripts/storage/seaweed-transfer.mjs is one bounded, local migration helper with
plan/copy/verify modes and an optional --reverse direction. It reads only the
Media owner's tables and keeps credentials in memory. It checks the accepted
vendor receipt, prepared settings, container identities, bucket scope, completed
work and journal stability. Its ignored transfer.json binds the plan to those
facts. Current bounds are 5,000 objects, 32 MiB each and 512 MiB total; larger
inventories require review. No mode deletes objects or overwrites differing ones.

The agent has prepared the plan and verified its rerun plus the running-writer
refusal. Stop all other demo/proof/browser uploads before the next checkpoint.
Run each command separately and stop on the first failure:

```powershell
docker compose -f docker-compose.yml stop gateway media-service
node scripts/storage/seaweed-transfer.mjs copy
docker compose -f docker-compose.yml stop minio
```

Copy refuses running writers, queued jobs, unfinished uploads, missing approved
objects or changed database/journal/source inventory. It creates missing objects
conditionally, preserves metadata and delivery headers, and independently reads
both providers twice. Bytes are compared with SHA-256, including stored verified
Media/derivative checksums. ETags bind reads within each provider; they are not
assumed equal across providers. Expires passes through the SDK as a Date, while
comparison uses its ISO value. Do not rewrite row ETags to match a provider:
unfinished upload jobs must complete on the old store first.

Expect minio-to-seaweed bytes-metadata-approved-checksums-database-journals=ok
objects=302. It writes phase=verified in
.nebula-storage/seaweedfs/transfer.json and leaves Gateway/Media stopped. The last
command then stops MinIO, closing its old upload endpoint while retaining data.
Run that last command only after a successful copy. If an
identical partial copy exists, rerunning copy verifies it and fills missing
objects. A conflict/drift stops without overwriting; keep the journal and both
stores for inspection. A leftover .lock after interruption requires confirming
the original process stopped before removing that one lock file. Never delete
the plan to bypass a mismatch.

The native copy checkpoint now passes for all 302 objects; do not repeat it while
MinIO is stopped. Follow the persistent activation section below. An explicit
base-only -f still selects MinIO for rollback; ordinary Compose discovers the
prepared Seaweed selection. A temporary shell setting is not a persistent switch.

Until the copy receipt is accepted, MinIO remains active and neither application
endpoint nor credentials change. Activation must stop MinIO to retire old signed
upload URLs, preserve its volume/container, recreate only Media/Gateway using the
checked selection, and verify actual readiness/provider and demo delivery.
Keep ordinary writes paused until the M6 proofs pass. Do not remove orphans or
volumes during this transition.

For rollback, first stop Gateway/Media and start the retained MinIO
container using the explicit base file. Leave Seaweed running. Then:

```powershell
docker compose -f docker-compose.yml stop gateway media-service
docker compose -f docker-compose.yml start minio
node scripts/storage/seaweed-transfer.mjs plan --reverse
node scripts/storage/seaweed-transfer.mjs copy --reverse
node scripts/storage/seaweed-transfer.mjs restore-config
docker compose -f docker-compose.yml up -d --no-build --wait --wait-timeout 240 media-service gateway
```

restore-config requires an accepted reverse receipt matching current Media data
and journals, stopped writers, intact backups and unchanged env files. It
restores the two original private env files exactly and refuses to erase later
user edits. Only then return Media/Gateway to the original MinIO configuration.
New Seaweed keys are copied back; extra old MinIO objects remain intact and database
lifecycle still controls delivery. Changed existing destination objects stop for
review; they are never overwritten automatically. This rollback keeps current
database rows/journals, so do not restore an older database snapshot over new
Orders or other post-switch changes. Native reverse execution is pending until
needed; its current regression uses independent fixture stores.

### M5 persistent activation

The copy is accepted, and activate-config has prepared the local configuration
with hash-checked backups under .nebula-storage/seaweedfs. Root .env contains
COMPOSE_FILE selecting base + compose.storage.yml + compose.bootstrap.yml +
.github/seaweed-runtime.yml, COMPOSE_PATH_SEPARATOR set to a pipe, and nonsecret
storage port/origins. No shell override is required. Inventory now uses Docker's
same discovery unless explicitly overridden; save/load wrappers and backend boot
therefore select the same fifteen images.

Only Media receives .nebula-storage/seaweedfs/media.env. Setup derives and verifies
that file from the accepted private settings on fresh installs and reruns; it is
not a separate settings owner. The selected overlay resets old inline S3
credential/public-endpoint fields so the scoped file takes effect, and keeps
internal endpoints at http://seaweed:8333. Native Media's own ignored app .env
uses scoped credentials with loopback S3 endpoints. Root .env gets no new Media
credentials or Seaweed administrator keys. The original three M2 manifest hashes
and keys are unchanged. Container bootstrap still reads the scoped secret; no
application image build is required.

Native preview and actual default configuration validate the local boundary,
selected release boundary, scoped credential ownership and fifteen-image archive
inventory. The release preview uses its production example inputs, not local
development passwords. This config-only check is not a production deployment.
Both env-file backups and activation.json are ignored/private; don't publish
them. activate-config can resume its own partially applied files, but refuses
duplicate assignments, existing custom selections or later file/settings drift.

Compose's installed-version probe confirmed that COMPOSE_ENV_FILES declared
inside .env does not load the second file as assumed. The selected scoped
env_file avoids that bootstrap ambiguity. Explicit --env-file/--file selections
retain precedence; [Docker documents the selection controls](https://docs.docker.com/compose/how-tos/environment-variables/envvars/).

After the full tooling regression passes, activate the prepared model. Run each
command separately and stop on failure:

```powershell
pnpm test:backend-tooling
docker compose up -d --no-build --wait --wait-timeout 240 media-service gateway
pnpm backend:health
```

Do not add --no-deps: Media requires the selected seaweed-init service to complete
successfully. Other already healthy dependencies remain in place. An orphan
warning for retained MinIO/old initializer containers is expected; do not remove
their volumes or use --remove-orphans. Expected result: full tooling pass,
completed initialization, healthy Media/Gateway and backend health. Running
provider verification and M6 consumer proofs follow the actual result; current
configuration and copied bytes alone do not certify them.

Nov 2 result: all 89 tooling tests pass, selected initialization/startup succeeds
and all eleven backend health checks pass. Agent confirms actual running Media
uses generic s3 with internal Seaweed and loopback public endpoints; Media,
Gateway and Seaweed are healthy and MinIO remains stopped. M5 is accepted.
M6 feature/recovery execution remains open. Its recovery helper now honors this
default selection rather than forcing the old base file, and its Gateway upload
proof checks allowed/denied preflight plus an Origin-bearing PUT. Run the required
test-type gate before handing off those live proofs; no rebuild or recopy is needed.

### M6 live acceptance

The operator's full backend test-type gate passes eight owners/125 files. The
final unused Media Jest fallback is updated from removed Supabase to Seaweed,
with typed lint and a Media-only no-emit recheck passing all 21 files; other
owners are unchanged. The standard Media Jest suite has two opt-in database
suites; retain their separately accepted Oct 31 evidence rather than enabling
them on the shared demo database.

Run each test separately in this order and stop at the first failure. The three
feature modes already include basic processing, CORS, immutable-byte and bad-file
checks; a standalone processing run adds no required coverage here.

```powershell
pnpm --filter @nebula/media-service test:e2e
pnpm test:media:derivatives:live
pnpm test:media:metadata:live
pnpm test:media:recovery:live
```

Recovery deliberately stops/restarts Media and its scanner and restores them;
do not run another test or seeder concurrently. Its runner now preserves the
active default Seaweed selection. After all four commands pass:

```powershell
$env:D1_READY_MEDIA_FIXTURE = '1'
try { pnpm test:d1:references:live } finally { Remove-Item Env:D1_READY_MEDIA_FIXTURE }
```

Then run pnpm test:f3:live only if the reference test passes. Expect each feature
proof's named checks and final cleanup=ok, including the new
gateway-presigned-browser-cors-upload=ok. Metadata has its own Product fixture
cleanup marker; the ready reference proof must include actual ready Media binding
and blocked-Media denial. F3 must pass all six flow markers. These are native
acceptance proofs, not a new release scan or hosted deployment. All M6 results
remain pending until reported; M7 follows only once they pass.

### Vendor build route

The standalone SeaweedFS vendor image workflow builds only this vendor image on
GitHub's Linux runner. It runs the evidence-gate tests, reuses BuildKit layer
cache, keeps normal signed Go checksums, scans with pinned Trivy 0.76.1, and
refuses to export an image with HIGH/CRITICAL findings or mismatched image/module
evidence. It performs no backend install/build and receives no storage secrets.

The workflow accepts manual dispatch after registration on the default branch.
An isolated agent/seaweed-vendor-\* branch push can also run it before main
integration. It does not change the ordinary backend CI workflow. The image is
uploaded as a workflow artifact for three days, not a public registry/release.
Layer caches use a separate scope; this does not claim that cache mounts survive
a fresh runner or that a cold vendor compilation has a guaranteed duration.

For a successful run, download the seaweedfs-linux-amd64-RUN_ID artifact into
an ignored directory such as .ci-evidence/seaweed-hosted/RUN_ID. Verify
image.tar.gz against image.tar.gz.sha256 and review image.json/scan.json before
loading with Docker. After load, the exact image identity and layer inventory
must match image.json. Use the existing security proof override for the isolated
S3/restart proof; a hosted scan does not prove local persistence or app integration.
Do not replace an in-progress proof's artifact or retag another image as accepted.

Hosted build [41203305981](https://github.com/pain1122/nebulaNV/actions/runs/41203305981)
passed from isolated commit c26ca397e1c6e9376fc6b01bcee57e7758508f7d.
Build, evidence tests, scan, export and local S3/restart acceptance pass.
The earlier separately built local candidate remains available;
do not rebuild locally solely because this workflow exists. Future vendor
rebuilds can use this route.

The downloaded Oct 31 hosted archive now passes local checksum, embedded image
configuration/layer and scan/module evidence verification. Local load and actual
runtime configuration/layer verification also pass. Docker's imported store ID
differs from the archive configuration digest; compare the canonical configuration
and layers rather than assuming those identifiers are interchangeable. The new
artifact's S3/restart proof passes. The earlier local build is preserved
under the 4.51-gojose4.1.7-local-backup-20261031 tag.

### Local fallback

Commands below are the reviewed execution plan, not a claim they have run.
Stop at the first failing prerequisite and retain its output. The initial build
downloads Go modules and compiles a large vendor binary; it does not rebuild
Nebula services. Keep concurrency bounded and preserve its caches.

1. Check Docker engine readiness and native BuildKit diagnostics:

   ```powershell
   docker info --format 'CPUs={{.NCPU}} MemoryBytes={{.MemTotal}}'
   docker buildx build --call=check --platform linux/amd64 --file docker/seaweedfs/security.Dockerfile docker/seaweedfs
   ```

2. After the recorded preparation gate passes, build the local candidate:

   ```powershell
   docker buildx build --platform linux/amd64 --file docker/seaweedfs/security.Dockerfile --tag nebulanv-vendor-seaweedfs:4.51-gojose4.1.7 --load --progress=plain docker/seaweedfs *> seaweed-security-build.log
   "build_exit_code=$LASTEXITCODE"
   Get-Content seaweed-security-build.log -Tail 35
   ```

3. Scan the actual local candidate, not the original registry image:

   ```powershell
   trivy image --db-repository ghcr.io/aquasecurity/trivy-db:2 --image-src docker --platform linux/amd64 --scanners vuln --severity HIGH,CRITICAL --exit-code 1 --timeout 15m --format json --output .security-reports/seaweedfs-4.51-gojose4.1.7-m1.json nebulanv-vendor-seaweedfs:4.51-gojose4.1.7
   "scan_exit_code=$LASTEXITCODE"
   ```

   Record the image ID, binary compiler/module versions, DB timestamp and scan
   findings. The tag names a candidate; it is not an immutable identity or a
   substitute for report review. Use a registry/digest scan only after an
   explicitly reviewed publication; this command assumes a local Docker image.

4. After candidate scan acceptance, run the existing isolated S3/restart proof:

   Before prepare, inspect any existing proof state. The script refuses every
   existing state file, including completed sessions. Preserve a completed or
   cleaned session before creating a fresh one; confirm no isolated proof
   container is still using its credential mount. Never remove unfinished state
   or wipe a volume to bypass the guard. The previous Oct 31 session is complete
   and has been checkpointed. As of Nov 2, session 0b263ed8a1e64a5246eefaed is
   complete for the verified hosted image: do not rerun this sequence on that
   journal. Preserve it before a future fresh proof. Long operations remain
   Salar-owned.

   ```powershell
   node scripts/storage/seaweed-s3-proof.mjs prepare
   docker compose -p nebula-seaweed-proof -f docker/seaweedfs/compose.proof.yml -f docker/seaweedfs/compose.security-proof.yml up -d --no-build --wait --wait-timeout 180
   node scripts/storage/seaweed-s3-proof.mjs run
   docker compose -p nebula-seaweed-proof -f docker/seaweedfs/compose.proof.yml -f docker/seaweedfs/compose.security-proof.yml restart seaweed
   node scripts/storage/seaweed-s3-proof.mjs verify-after-restart
   ```

   All base proof credentials, namespace/race/signature/metadata checks and owned
   cleanup remain unchanged. Prepare refuses unfinished good proof state; inspect
   and clean owned leftovers rather than deleting a volume to bypass a failure.
   Keep the candidate image and record actual proof identity before M2 adoption.

## Rollback and later adoption

Omit compose.security-proof.yml to select the original isolated pilot image.
Do not switch artifacts halfway through its persistence proof. Neither the
application Compose files nor CI/vendor archives select this candidate yet.
M2-M4 prepare that integration; M5 reconciles existing objects and activates it,
then M6 accepts the actual Media pipeline. Keep active MinIO and its data until
the recorded cutover prerequisites pass. No public image or vendor archive
upload is authorized by these local build/proof instructions.
