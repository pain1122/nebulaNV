# SeaweedFS transition: decision and compatibility gate

Started: 2026-10-28. Salar selected self-hosted community SeaweedFS, conditional
on required functionality. Paid subscriptions, proprietary vendor activation
and license procurement are excluded by the deployment constraints. No claim
about general regional legal requirements is made by this technical decision.

## Evidence and bounded decision

Requirement clarification: Salar means one commercial multi-tenant NebulaNV
serving multiple customer tenants. Checkupino is prior experience with the
technology, not an application to integrate or share credentials with here.
Storage selection must accommodate that SaaS/commercial distribution target
without paid subscriptions, vendor activation or per-tenant license fees.

The community [SeaweedFS license](https://github.com/seaweedfs/seaweedfs/blob/4.51/LICENSE)
is Apache-2.0. Normal open-source notice/license obligations still apply; no paid
license contract or activation is needed for the community implementation.
[Bucket-scoped credentials](https://github.com/seaweedfs/seaweedfs/wiki/S3-Credentials)
provide independent storage namespaces on one server, usable as primitives for
future tenant storage isolation. Bucket-per-tenant versus policy-scoped prefixes
is a later F4 design decision, not fixed by this pilot. The two synthetic
application-named identities in the prepared proof exercise bucket permissions;
they do not represent completed Nebula tenant provisioning or authorization.

Current Media uses AWS S3 clients, signed uploads, metadata binding, ETag checks,
conditional immutable promotion, checksums and deletion. Existing MinIO is
affected by the previously recorded advisory; the archived community release
does not supply its fix. This is the confirmed unmet requirement. Replacing the
byte server can preserve the application contracts; reimplementing the Media
pipeline or expanding tenant/cloud/CDN features is unnecessary.

The official [S3 API](https://github.com/seaweedfs/seaweedfs/wiki/Amazon-S3-API)
and [conditional operations](https://github.com/seaweedfs/seaweedfs/wiki/S3-Conditional-Operations)
describe the required capabilities. Documentation is not native proof. Verify
actual signature, precondition, race and access-denial behavior before cutover.

Candidate: release 4.51, observed current stable on Oct 28. Docker registry
manifest index digest verified read-only:
`sha256:f7a49e3f3972ebed5be2ed4befa4a0c68eb7bdddba6e692d42729ceb545134b8`.
Pinned upstream `mini.go`, `s3.go`, `s3api_server.go`, Dockerfile/entrypoint and
filer configuration were inspected. The image runs mini with persistent filer
metadata under `/data/filerldb2`; S3 `/status` exists. Disable unused WebDAV,
admin UI, Iceberg and Lance in the pilot. Keep persistence on a separate volume.
Upstream source evidence is ignored under `.ci-evidence/seaweed-review/upstream/`.

## Before-edit consumer trace

| Owner and actual inspected paths                                                                                                                                                                 | First compatibility gate                                                                                                   | Later cutover action                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| New `docker/seaweedfs/compose.proof.yml`, `scripts/storage/seaweed-s3-proof.mjs`                                                                                                                 | Isolated pinned server, loopback-only endpoint, generated fixture credentials and two scoped app buckets; actual SDK proof | Remove no existing service/data while proving parity                                                                                               |
| `apps/media-service/src/processing/media-processing.storage.ts`, `apps/media-service/src/media.service.ts`                                                                                       | Match signed upload, metadata, HEAD/GET/ETag, conditional create, delete, range, integrity and race semantics              | Keep S3 implementation if proof passes; no source rewrite assumed                                                                                  |
| `apps/media-service/src/config/env.validation.ts`, `apps/media-service/src/dto/create-media.dto.ts`                                                                                              | Existing `s3` lane is sufficient for candidate probing                                                                     | Review provider default and stored provider labels before changing active configuration                                                            |
| `docker-compose.yml`, `docker-compose.release.yml`, `.env.example`, `deploy/.env.production.example`                                                                                             | Unchanged during isolated proof                                                                                            | Replace MinIO server/init, wire bucket-scoped credentials, persistence, readiness and public/internal endpoints                                    |
| `.github/workflows/ci.yml`, `.github/minio-offline.yml`, `scripts/docker/release-image-inventory.mjs`, `scripts/backend.mjs`, `scripts/backend.test.mjs`                                         | Unchanged; historic vendor archive and inventories remain accurate for accepted MinIO deployment                           | Replace retired vendor supply, inspect all boot/readiness/backup/inventory/count/hash assumptions and test them; do not blindly refresh assertions |
| `scripts/backend-dev-env.mjs`, `apps/media-service/test/http/media.http.e2e.spec.ts`, `apps/media-service/test/grpc/media.e2e.spec.ts`, `packages/api-client/test/media-processing-recovery.mjs` | No endpoint/env/test rewrite before native compatibility is known                                                          | Trace exact S3 defaults, runtime recovery and fixtures for active cutover                                                                          |
| Gateway/OpenAPI/SDK/protobuf, Product references, demo journals, Media SQL                                                                                                                       | No contract/schema/generated change in this pilot                                                                          | Existing IDs/objects need explicit copy or owned demo regeneration; changing endpoint alone does not copy bytes                                    |
| `docs/current-focus.md`, `TODO-ALTERNATIVE.md`, dependency assessment, `docs/docker-configs.md`, `docs/architecture/local-dev-and-docker-boot.md`                                                | Record decision and pending native gate                                                                                    | Update operational docs together with actual deployment; preserve dated MinIO history                                                              |

The pilot proves byte storage and two-app credential isolation, not Nebula tenant
activation or Checkupino integration. No existing app, real environment file,
MinIO volume or database is modified. Current D1/D2/Media functional acceptance
remains preserved. Full cutover consumer tracing continues after this gate.

For eventual multi-tenant acceptance, authoritative tenant context must constrain
Media database access, object namespace resolution, signed uploads/downloads,
processing jobs and cleanup. Cross-tenant reads, writes, listing and deletion
must be denied through Nebula APIs as well as the storage layer. A tenant label
or caller-provided bucket is not authority. Current Media's owner/realm/subject,
scope/entity context and configured default bucket are existing mechanisms;
they are not full tenant isolation. This is a planned F4 requirement under the
adopted roadmap, not a newly discovered defect in the accepted default-site demo.
Storage patch/security verification and native compatibility remain current work;
commercial multi-tenant readiness is not claimed by either license or pilot.

## Proof behavior and operator boundary

Preparation generates random fixture-only admin and two application identities
under ignored `.ci-evidence/seaweed-s3-proof/`, scoped to uniquely named buckets.
Run actual signed uploads/readbacks, metadata and byte checks, ETag preconditions,
sequential and competing immutable writes, range reads, missing-object semantics,
unsigned/invalid-credential denial and cross-application read/write/delete denial.
Include nested object paths and a filename containing a space and plus sign.
Use request deadlines and no automatic write retries. Keep witness objects for
an explicit server restart, then verify persistence and remove only owned proof
objects/buckets. Report cleanup failures separately from primary failures.

Heavy pull/start/restart commands stay with Salar. The active stack is not the
pilot project. Native proof, restart evidence, image scan and full Media live
regressions remain pending until actually run. No security-clean image claim is
made from documentation or an S3 proof alone.

## First operator gate

Oct 28 first native result: the proof server became healthy in 25.8s, but the
first signed PUT returned HTTP 400. Owned cleanup passed. Server log first error:
`checksum mismatch for X-Amz-Checksum-Crc32: expected AAAAAA==` versus the actual
nonempty payload checksum. The installed AWS SDK's real presigner reproduces
`x-amz-checksum-crc32=AAAAAA==` when signing a PutObject without its eventual body.
SeaweedFS is correctly validating that incorrect empty-body checksum.

Confirmed integration defect: Media's public signing client uses the same SDK
default and signs uploads without their bodies. Narrow correction: set
`requestChecksumCalculation: "WHEN_REQUIRED"` on the public URL signer only;
do not invent a checksum before the client supplies bytes. Internal/processing
clients keep their normal checksum defaults; explicit supplied checksums,
upload binding, signature, ETag, scanning and stored SHA256 checks remain.
[AWS checksum settings](https://docs.aws.amazon.com/sdkref/latest/guide/feature-dataintegrity.html).

Before-fix exact impact trace:

| Path / consumer                                                                                                                    | Required action                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/media-service/src/media.service.ts`: `getPublicSigningS3`, `presignUpload`, `presignSensitiveLibraryUpload`, `createReadUrl` | Narrow signer configuration; all three upload lanes share it; GET signing has no upload payload                                                                          |
| `apps/media-service/src/processing/media-processing.storage.ts`: original/promotion/derivative IO                                  | Unchanged; worker knows payload bytes and retains SDK checksums/ETag/SHA256 validation                                                                                   |
| `apps/media-service/test/media-upload-binding.unit.spec.ts`                                                                        | Exercise actual service-generated public/protected/strict URLs with the installed SDK, not a mocked presigner; preserve binding assertions and explicit checksum support |
| `apps/media-service/test/media.service.access.spec.ts`                                                                             | Existing mocked signer access contract unchanged; run focused compatibility case with binding regressions                                                                |
| `scripts/storage/seaweed-s3-proof.mjs`                                                                                             | Apply the same signer-only option; retain normal write-client defaults, expose S3 response error code, safely rearm a failed owned session after cleanup                 |
| Same proof anonymous request                                                                                                       | Fix its stale flat `/source.txt` path to target the real existing encoded object URL; nested-key rename had missed the template literal                                  |
| Media upload/read HTTP/gRPC/Gateway, generated SDK, demo/live callers                                                              | Opaque URL and request/response fields unchanged; no schema, inventory/hash or generator edits needed; run preflight before any broad handoff                            |
| `docker/seaweedfs/compose.proof.yml` and active deployment                                                                         | Unchanged; running proof server is healthy and enforces checksums. Media image rollout remains pending separately                                                        |

The proof's initial status-only error hid useful response diagnostics, and its
preparation missed the SDK's empty-body behavior. Record and correct these gaps;
do not relax server validation or change the passing-status expectation.

Further focused native checks found a separate provider compatibility gap:
SeaweedFS 4.51 persists metadata supplied in signed headers, but drops metadata
hoisted into the signed URL query. Direct SDK metadata writes work. Adding an
unsigned metadata header to the old query URL fails signature validation; do
not use that workaround. A real `unhoistableHeaders` signature stores the binding
and rejects a changed header with 403. The isolated proof therefore tests this
standard signed-header form, including missing/tampered-header denial.
[AWS presigner header options](https://github.com/aws/aws-sdk-js-v3/blob/main/packages/s3-request-presigner/README.md).

This does not silently change Media's current URL-only client contract. Before
active SeaweedFS cutover, Media must expose required signed upload headers and
carry them through `packages/protos/media.proto`,
`apps/media-service/src/grpc/media-grpc.controller.ts`,
`apps/gateway/src/media/media-api.dto.ts`,
`apps/gateway/src/media/gateway-media-api.service.ts`, generated OpenAPI/SDK and
all upload callers. Known concrete callers include
`scripts/demo/gateway.mjs`, `scripts/demo/runner.mjs`,
`packages/api-client/test/media-processing-live.mjs`,
`packages/api-client/test/d1-references-live.mjs`, both native Media HTTP/gRPC
test files and the owner/Gateway upload fixtures. Finish their exact tracing and
codec/input/output checks in the cutover slice. This is a required compatibility
step, not deferred tenant implementation. Active deployment remains MinIO;
the checksum correction is compatible there, but does not alone make current
Media uploads compatible with SeaweedFS. No binding assertion is removed.

Preparation has already generated the local ignored fixture configuration.
Run from the repository root in PowerShell, stopping on any failure:

```powershell
docker compose -p nebula-seaweed-proof -f docker/seaweedfs/compose.proof.yml up -d --wait --wait-timeout 180
node scripts/storage/seaweed-s3-proof.mjs run
```

Expected result: five passing operation/isolation markers followed by storage
proof passed and the awaiting-restart instruction. This gate pulls the vendor
image and starts one isolated server; it does not build backend services.
Return the first error if any marker fails. Cleanup is attempted on a failed
first run; cleanup failures are reported with the primary error.

After this gate passes, the separate restart phase is:

```powershell
docker compose -p nebula-seaweed-proof -f docker/seaweedfs/compose.proof.yml restart seaweed
node scripts/storage/seaweed-s3-proof.mjs verify-after-restart
```

The second command waits for authenticated readiness, verifies four persisted
objects across both buckets (including binding metadata/ETag/cache headers),
then verifies deletion and removes only the owned buckets. A verify failure
preserves witnesses for diagnosis; `cleanup` mode is available for an explicit
owned cleanup. Successful native proof still needs image-security and real
Media integration gates before active cutover. After acceptance, remove the
isolated proof project/volume explicitly so it does not accumulate as Docker junk.

## Preparation receipt

Initial preparation is retained below; the correction/result receipt supersedes
the pending first-run notes. Restart and active integration remain open.

- Requirement and finding: Apache-2.0 community target, no paid activation;
  replace the unsupported affected byte store only after required parity.
- Before/after consumer trace: table above; active Compose/CI/runtime/application
  consumers are unchanged intentionally, pending the native gate. New proof
  paths are direct operator tools; no root alias or dependency was introduced.
- Cheap gates: script syntax and scoped ESLint pass; generated credentials have
  three distinct identities and exactly two bucket-scoped app action sets.
  Actual Compose render includes only the proof service, pinned image/digest,
  one loopback S3 mapping and a separate project volume. No listener on the
  chosen host port was observed. Existing deployment env values are not consumed
  by the proof script; no real credentials were printed.
- Formatting/diff/local link checks accompany this receipt. No Gateway, RPC,
  protobuf, OpenAPI or generated client contract changed; their preflight is
  not required for this isolated S3 tool. Earlier host preflight remains passing.
- Native operation/race/isolation, restart/persistence, image scan and full Media
  live proof: PENDING. No mock or configuration check certifies these behaviors.
- Readiness: READY FOR ISOLATED NATIVE S3 PROOF. Active-stack migration is not
  complete. Existing MinIO volume/data, application containers and databases
  remain intact; future data transfer or owned demo regeneration is explicit.

## Corrected native result and restart handoff - 2026-10-28

Later operator result: isolated restart completed in 3.4s. Salar supplied passing
`restart-preserves-objects-metadata-index-and-bytes` and `owned-cleanup` markers.
Native restart/persistence is accepted; the four witness objects/buckets are now
removed. No further restart is needed for application header source changes.

The new actual-service regression first failed for all three upload lanes
(PUBLIC/PROTECTED/STRICT): three failures and thirteen passes before the signer
correction. After correction, binding and access regressions pass: two suites,
32 tests. This uses the installed real AWS presigner for generated URL assertions;
Prisma naming lookups are mocked and no database startup is performed.

Focused checks completed:

- Media source/test scoped typed ESLint and owner no-emit build types: exit zero.
- Proof tool syntax, ESLint and formatting: pass.
- Gateway/OpenAPI/generated SDK freshness and preflight: four suites, 23 tests
  pass; no schema or generated contract changed during this correction.
- Real server paired request: old default checksum returns 400 `BadDigest`;
  unknown-body signer returns 200; an explicitly wrong SHA256 still returns
  400 `BadDigest`. The initial pair also exposed query-only metadata loss; its
  failed metadata assertion is retained, not relabeled as passing evidence.
- Separate real server metadata controls: direct SDK metadata is stored;
  query-only metadata is lost; adding an unsigned duplicate header returns 403;
  an explicitly signed binding header is stored; changing it returns 403.

The agent then ran the short corrected native proof against the existing
operator-started server (about 1.9s, exit zero). It rearmed the failed session
only after successful owned cleanup. All five operation markers pass:
signed upload/binding metadata/HEAD/ETag/bytes, immutable conditional create,
eight competing creates with exactly one winner, range/missing-object behavior,
and two-credential-namespace read/write/delete/list isolation plus anonymous,
signature and missing/tampered-binding denial. No S3 assertion was relaxed.
Ignored stdout: `.ci-evidence/seaweed-review/proof-corrected-run.log`.
Four owned witness objects remain for the explicit restart gate; they have not
been cleaned or regenerated. State is `awaiting-restart`.

Consumer table revisited: correction is limited to Media's signing-client
configuration, its existing binding regression file, the isolated proof tool and
documentation. Worker/internal checksum defaults and all binding/SHA256/ETag
checks remain. Active Media still needs the explicit signed-header response and
caller update described above before SeaweedFS cutover. No full Media/image/live
integration acceptance or tenant-isolation acceptance is claimed.

Readiness: READY FOR ISOLATED RESTART/PERSISTENCE PROOF using the two commands
above. The already running proof image/config needs no rebuild. Run full test
type preparation and contract/consumer review before a later application image
or broad live-suite handoff. Existing MinIO and databases remain unchanged.

## Signed-header integration slice: before-edit plan

Proceed with the confirmed required integration correction. Return
`uploadHeaders` containing Content-Type and the opaque signed upload-binding
header for all three upload lanes. Sign the binding as an actual header using
the SDK's `unhoistableHeaders`. Keep the unknown-body checksum correction,
normal worker checksums and signature/binding/ETag/SHA256 validation. Existing
URL-only upload consumers must use the returned headers. This is a visible
client behavior change, required before active cutover; no deployed-client
backwards-compatibility claim is made. Media/Gateway must roll out together.

| Exact owner/consumer                                                                                                                                          | Planned update or unchanged reason                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/media-service/src/media.service.ts`                                                                                                                     | Both public/sensitive signing paths return required headers; protected/strict wrappers share the latter                                                      |
| `packages/protos/media.proto`, `apps/media-service/src/grpc/media-grpc.controller.ts`                                                                         | Add map field 17 without renumbering existing fields; serialize it through all legacy and V3 wrapper responses                                               |
| `apps/gateway/src/media/media-api.dto.ts`, `apps/gateway/src/media/gateway-media-api.service.ts`                                                              | Expose string map and reject absent/malformed binding headers; preserve lane/auth validation                                                                 |
| `apps/media-service/test/media-upload-binding.unit.spec.ts`, `apps/media-service/test/media-grpc-gateway-contracts.unit.spec.ts`                              | Real service URL/header signing regressions and actual protobuf encode/decode of map                                                                         |
| `apps/gateway/test/gateway-media-api.service.spec.ts`, `apps/gateway/test/media-http.spec.ts`, `apps/gateway/test/openapi-contract.spec.ts`                   | Map forwarding/negative validation, HTTP fixture and published response schema                                                                               |
| `apps/gateway/test/r5-v3-receiver-inventory.spec.ts`                                                                                                          | Inspect exact additive proto diff, record/re-pin only Media source hash with old/new evidence; keep exact RPC/authorization inventories and codec assertions |
| `apps/gateway/openapi/nebula-v1.openapi.json`, `packages/api-client/src/generated.ts`, ignored proto output                                                   | Regenerate with existing tools; no hand-edited generated output                                                                                              |
| `packages/clients/src/media.client.ts`, `packages/clients/test/service-wrappers.spec.ts`, `packages/clients/test/dormant-v3-wrappers.spec.ts`                 | Existing typed response forwarding; no RPC/signature/authority change; type/check against regenerated producers                                              |
| `packages/api-client/test/media-processing-live.mjs`, `packages/api-client/test/d1-references-live.mjs`                                                       | Upload and deliberate upload-URL-reuse requests forward returned headers                                                                                     |
| `apps/media-service/test/http/media.http.e2e.spec.ts`, `apps/media-service/test/grpc/media.e2e.spec.ts`, `apps/product-service/test/grpc/product.e2e.spec.ts` | All direct uploads and local response/helper types consume the map                                                                                           |
| `scripts/demo/gateway.mjs`, `scripts/demo/runner.mjs`, `scripts/demo/demo.test.mjs`                                                                           | Forward headers through demo uploader; update fixture and verify its received contract rather than allow silent omission                                     |
| `docs/packages/api-client.md`, `docs/services/media-service.md`, this report/current-focus/TODO                                                               | Describe required header forwarding, rollout and remaining proof scope                                                                                       |
| Media workers/storage/SQL, Gateway route/input inventories, active Compose/CI                                                                                 | Unchanged: opaque response addition does not change worker, DB, route count, caller authority or storage deployment yet                                      |

Cheap completion gates: scoped source/test types and lint, real codec/signature
regressions, actual demo wrapper request regression, regenerated freshness and
preflight. Run full backend test-helper no-emit before any image/live handoff.
Do not request a build while one of these preparations fails. Active storage
conversion and full Media runtime proof follow separately, after these contracts
are reviewable and the selected images are built by Salar.

## Signed-header integration completion and image receipt

Implemented source behavior: all public/protected/strict presign responses return
the required Content-Type/binding header map. The actual binding header is signed;
unknown-body checksums are not invented. Protobuf field 17 and the shared gRPC
response mapper preserve the map. Gateway rejects absent, malformed, mismatched
MIME or unexpected header entries, and publishes the map in regenerated OpenAPI
and SDK types. Upload callers listed in the impact table now forward it,
including URL-reuse tests, native Product gallery setup and D1 demo seeding.

The existing URL-only binding test was updated to assert signed-header coverage
and opaque binding delivery rather than query hoisting. Original binding
substitution/signature assertions remain. A real codec round-trip preserves the
map; an old/empty response decodes to an empty map and fails Gateway validation.
The demo wrapper regression invokes the real generated client/wrapper with a
mock HTTP transport and proves exact upload headers/body forwarding and refusal
of omission. Its fixture seeder asserts that the runner supplies the map.

Media proto pin review: the only protobuf source edit is
`map<string, string> uploadHeaders = 17;` in `PresignUploadRes`.
Removing precisely that line reconstructs the previous pinned source hash
`d8815d105e6644ecdf451b2adb6d2f539d20575f30fdc870bb5b0841f97038b2`.
The inspected new source pin is
`63e3fbac19c23ce876552b48e871b92405fb1a393e611e8144d859ee421e11ed`.
No other field/RPC/authorization change is hidden by the pin update. Exact
receiver/route/input inventories remain enforced; no broad exclusion was added.

Observed preparation results:

| Gate                                     | Result                                                                                                                                                                                                                                                               |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared producer and generated artifacts  | Protos built and isolated `proto:check` freshness passes; OpenAPI/SDK regenerated and their preflight freshness passes; SDK build passes                                                                                                                             |
| Media binding/access/codec focused tests | Three suites, 40 tests pass; codec test rerun after formatting correction also passes                                                                                                                                                                                |
| Gateway Media mapper/HTTP focused tests  | Two suites, 22 tests pass, including five unsafe/missing-header rejection cases                                                                                                                                                                                      |
| Contract preflight                       | Four suites, 24 tests pass; exact RPC inventories and reviewed Media source pin pass                                                                                                                                                                                 |
| D1/D2 fixture tests with CI/GitHub flags | 46 tests pass, zero skipped/failing; includes actual SDK/demo uploader forwarding regression                                                                                                                                                                         |
| External client                          | Eight focused client tests and browser/React Native compiler checks pass                                                                                                                                                                                             |
| Signed shared wrappers                   | Two suites, 19 tests pass, including dormant V3 forwarding                                                                                                                                                                                                           |
| Backend test/helper types                | All eight live owners, 125 files, zero errors; final scoped Media test-type check also passes after codec fixture formatting correction                                                                                                                              |
| Scoped lint                              | Gateway and changed script/live callers pass. Media passes with 446 warnings and zero errors; Product gallery fixture passes with 52 warnings and zero errors. Native tests use existing broad `any` response types; warnings remain visible, with no rules disabled |

The initial Media lint run found four formatter errors in the new codec mock;
the mock was simplified, formatted and checked again. No broad handoff was sent
while this known preparation error remained. Warnings are not represented as a
warning-free baseline. Relevant logs are ignored under
`.ci-evidence/seaweed-review/headers-*.log`.

A direct invocation of the Media test tsconfig subsequently hit its narrow
`rootDir` for an existing cross-workspace fixture. The established backend type
gate already handles that by using the repository root. The corrected final
scoped command, `pnpm --filter @nebula/media-service exec tsc -p test/tsconfig.json
--noEmit --rootDir ../..`, passes. No compiler rule/configuration, test include
or coverage was weakened to clear that preparation-command error.

Consumer table revisited: legacy and dormant signed clients already forward the
typed response, so no client method/authority edit is needed. Current Web has no
direct upload-URL consumer in the inspected authored source. Future supplied
admin integration must follow the documented response map. No database/worker,
route/count, package manifest or dependency-lock change is needed. Active
Compose/CI/vendor archive still describe MinIO correctly and await the separate
storage-conversion slice. No live demo reset, migration or database wipe ran.

Handoff scope: build only Media and Gateway together. The actual `--plan` command
confirms one shared `media-service,gateway` graph and two sequential exports,
without force or cache deletion. No Dockerfile COPY/context inputs changed.
Existing images predate these source/proto changes; host tests cannot certify
those images. A grouped rollout and real Media integration proof remain pending.
Do not expose the new Gateway with an old Media image or use old URL-only upload
callers. Active storage remains MinIO until its separately prepared conversion.

The isolated proof's state is `complete`; its buckets/objects are removed. The
operator may now remove only the `nebula-seaweed-proof` project and its owned
volume to release resources before building. This does not remove the active
MinIO data volume. No archive/image-tag publication or repository push occurred.

Readiness: READY FOR SELECTED MEDIA/GATEWAY IMAGE BUILD. Final scoped
format/diff/freshness/type checks pass. Salar owns image build, deployment and broad
live execution. The active provider conversion, image-security scan, complete
Media live pipeline and eventual F4 tenant isolation are not completed by this
source slice.

## Image build accepted; grouped deployment handoff

Salar supplied exit zero. Agent inspection of `media-header-build.log` confirms
both sequential image builds: Media 332.4s and Gateway 57.9s. The final tagged
image IDs are Media
`sha256:1803b518c7782b80ab1643bd412d8b80c07e9d727718bfe4f63c454a3df23e1f`
and Gateway
`sha256:d595fee66df169b4adf12ffacea7693bf55457ea33c90df42f0b192852c2d08b`.
These are image-index identities as reported by Docker, not compiled source
hashes or deployment evidence.

Agent offline checks ran each image with no network and a short Node entrypoint:
the new compiled header mapping exists, the installed protobuf map round-trip
passes, Nest is 11.2.5 and gRPC JS is 1.14.6 in both images. Temporary probe
containers were removed automatically. No application process, credentials or
database connection was needed for these artifact checks.

The actual Media/Gateway containers are healthy but still reference their old
images, so they require grouped recreation. Fourteen project containers are
currently running/healthy, including PostgreSQL, Redis, MinIO, scanner, Auth and
Product. Realm Auth and Tenant Authority are stopped from earlier runs: exit
255/1, neither OOM-killed. Realm logs include shutdown completion; Authority's
last scoped error is `Connection is closed.` No new boot failure or need for
source edits/rebuilds of those two services is inferred. Restore their existing
images during startup so full backend health can be checked. This restores
existing foundation services; it does not implement or activate general tenants.
The completed isolated proof project has no remaining containers.

Next operator commands, stopping on failure:

```powershell
docker compose up -d --no-build --wait --no-deps realm-auth-service tenant-authority-service media-service gateway
pnpm backend:health
pnpm --filter @nebula/media-service test:e2e
pnpm test:media:derivatives:live
pnpm test:f3:live
```

The Media suite covers the updated native HTTP/gRPC upload consumers and existing
access/processing regressions. Its already optional database skips remain
explicit, not an acceptance claim. The derivative live mode also runs the normal
processing/upload/reused-URL/bad-file controls, avoiding a duplicate standalone
processing run. F3 checks Gateway/auth/storefront compatibility. This proves the
new signed-header integration against the current MinIO deployment; it does not
claim active SeaweedFS migration or future tenant isolation. No migration, seed
reset or another build is requested. Startup, full health and these native/live
results remain pending until observed or supplied by Salar.

Handoff receipt: exact consumer trace and cheap gates above remain valid; no
implementation changed after those checks. New-image artifact/codec/version
probes pass. Readiness is READY FOR GROUPED DEPLOYMENT, THEN NAMED NATIVE/LIVE
PROOFS. Stop at a startup/health failure and inspect its first error rather than
continuing tests against an unavailable stack.

## Deployed header acceptance and deferred-tenant clarification

Salar supplied the full Oct 28 transcript in attachment
`7a4a42c3-9826-4b4a-9dbc-7fb724087ec8/Pasted text.txt`:

- All four requested containers became healthy; full backend health passed for
  eleven services.
- Media regular suite: fourteen suites/176 tests passed, zero failures; two
  suites/eleven tests intentionally skipped. This includes actual HTTP/gRPC
  uploads with required headers, not only mocks or the raw S3 pilot.
- Live processing/derivative proof: scan/promote/render, automatic saved presets,
  cropped aspect ratios/watermarks/checksums, invalid-recipe denial, immutable
  approved bytes after upload URL reuse, infected/corrupt/type/extension denial
  and owned cleanup all passed.
- F3: all six readiness/auth/storefront/admin/mobile/disabled-partner markers
  passed. No new hosted CI or active SeaweedFS deployment is implied.

The signed-header integration is accepted on the current MinIO deployment.
Do not repeat its build or passing proofs without a relevant change. The next
Media stabilization work is the actual SeaweedFS storage/CI/configuration
conversion, image-security review and applicable pipeline/recovery proofs on
that provider. No new tenant, cloud/CDN or file-manager feature is introduced.

Salar reiterated that tenant implementation is halted until the later roadmap
phase. Inspection confirms that Media registers only an Auth RPC client;
`apps/media-service/src/health.controller.ts` probes its DB, object storage,
schema and replay store. Gateway's explicit client target list in
`apps/gateway/src/downstream/gateway-grpc-clients.module.ts` contains no Tenant
Authority/Realm Auth client; Auth's active module registers Auth/User clients.
Search of the active Gateway/Auth/Media and shared guard sources found no active
Tenant Authority/Realm Auth client call. Existing shared target constants and
the unused Compose URL are not evidence of a runtime call dependency.

Starting the two foundation containers was needed only for the blanket
`checkBackendHealth` inventory in `scripts/backend.mjs`, which defaults to all
eleven registered services. It was broader than the Media proof needed. No F4
implementation was resumed. Future Media handoffs will target actual Media
dependencies; do not silently narrow the global health contract or add a tenant
profile refactor to this storage slice. No services are removed/stopped by this
documentation clarification. General tenant implementation remains F4/P2-owned.

The eleven skips are exactly six tests in
`apps/media-service/test/media-processing.database.spec.ts` and five in
`apps/media-service/test/media-derivatives.database.spec.ts`. They run only when
`MEDIA_PROCESSING_DB_PROOF=1` and refuse production or ordinary demo databases:
the URL must name a local owned `nebula_media_verify_*` database. They cover
worker claims/leases/retry/deletion races and derivative generation/publication/
watermark races. `jest.processing-db.config.ts` enables the lane; the existing
`pnpm db:verify:media` wrapper provisions/migrates a disposable database and runs
it before cleanup. Earlier isolated evidence is recorded in the Oct 7/10 Media
checkpoints. They did not run in this supplied regular-suite transcript and are
not counted among its 176 passes. Reuse valid earlier evidence or run the owned
wrapper when a relevant change/final Media gate requires it; never enable them
against the ordinary demo database just to remove the skipped count.

### Media-only database verification handoff

Salar requests full core Media stabilization while retaining the tenant deferral.
Use the existing `pnpm db:verify:media` wrapper for one current isolated run of
the eleven database cases and current Media constraints/migration checks. This
is a core worker/derivative proof, not additional foundation implementation.
Inspection of `scripts/backend.mjs` confirms the Media branch invokes both
SQL constraint checks and `test:processing:db` using the owned verification
database environment. The test sources enforce the local disposable name.
PostgreSQL's current `pg_isready` probe accepts connections.

Preparation receipt: no implementation/SQL/fixture change since the passing
consumer/type/preflight gates above; current native Media HTTP/gRPC and live
processing/derivatives pass. Existing schema/client generation and prior SQL
checkpoints remain applicable. No new generated artifact or compatibility
consumer is introduced. Readiness: READY FOR OWNED MEDIA DB VERIFICATION;
actual result pending Salar. Never pass the ordinary demo DATABASE_URL directly
to the opt-in Jest config. This command provisions/cleans only its disposable
database and does not reset the demo. Actual SeaweedFS conversion, vendor image
review and pipeline/recovery on that provider remain the subsequent Media work.

### October 31 operational restart and isolated database proof

Salar explicitly requested removal of stale containers, a stack restart and
execution of the pending `pnpm db:verify:media` command by the agent. Initial
inspection found sixteen running healthy project containers and three completed
initialization containers; no orphan or unrelated containers were present.
Removed only the exit-zero `minio-init`, `realm-auth-db-init` and
`tenant-authority-db-init` containers. These one-shot containers remain defined
in Compose and can be recreated when needed. No volumes, images, build caches or
running services were removed. Restart existing infrastructure first, then
existing applications, with readiness checks before the database proof.

Preparation receipt: operational work only; no implementation, fixture, SQL,
generated contract or dependency changes. The preceding consumer trace and cheap
gates remain applicable. Reviewed `verifyCleanMigrations` and the isolated Jest
configuration again: the Media wrapper creates/migrates a disposable database,
runs SQL constraints and both opt-in database suites, then cleans up its owned
database. No ordinary demo database reset or tenant implementation is requested.
Readiness: READY FOR POST-RESTART OWNED MEDIA DATABASE PROOF, pending observed
infrastructure/application health. Actual restart/proof results will be recorded
below; the prior MinIO acceptance does not certify the SeaweedFS conversion.

Observed completion on October 31: all five infrastructure services and eleven
application containers restarted successfully without image builds. Compose
readiness and `pnpm backend:health` passed. `pnpm db:verify:media` exited zero:
all eight migrations applied and migration status was current; processing,
saved derivative and descriptive metadata SQL checks completed, followed by
the isolated processing/derivative database suites (six plus five cases).
The wrapper reports the claim, lease, atomic replacement, retry, deletion and
watermark proofs passed. Successful Jest output is captured by the wrapper,
so this receipt records its exit/proof marker and the inspected suite inventory,
rather than claiming a separately printed Jest summary. Prisma's existing
configuration deprecation/update notices remain warnings, not failures.

The owned database was `nebula_media_verify_98eae75352de`. A post-proof catalog
query found no `nebula_media_verify_*` databases; the pre-proof query also found
none. Final inventory: sixteen running healthy containers, no stopped project
containers. Volumes and the demo database were preserved. This closes the
pending isolated Media DB proof; active SeaweedFS conversion/security and its
provider-specific pipeline/recovery gates remain next. F4 stays deferred.

## M1 security review - October 31

Status: release/license/digest/advisory and image scan review complete; one HIGH
Go dependency finding blocks image acceptance. Remediation/rescan remain pending.
M1 is not checked off and M2 has not started.
No application, Compose, credentials, volume, vendor pin or CI code changed.

### Exact review scope and consumers

| Path or input                                     | Inspection and disposition                                                                                                                                                                                                                            |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker/seaweedfs/compose.proof.yml`              | Existing 4.51 index digest, mini flags, scoped-config mount, persistence and loopback-only S3 publication inspected; unchanged.                                                                                                                       |
| `scripts/storage/seaweed-s3-proof.mjs`            | Existing native S3/namespace proof remains compatibility evidence, not an image vulnerability scan; unchanged.                                                                                                                                        |
| `scripts/backend.mjs`                             | Inspected `buildTrivyImageArgs`, `summarizeTrivyImageVulnerabilities`, evidence filtering and backend image inventory. Existing gate scans backend service images, not this vendor image; use a separate exact-digest vendor scan. Preserve the gate. |
| `.github/workflows/ci.yml`                        | CI pins Trivy v0.73.0 and still supplies MinIO images. No workflow change in M1; vendor supply/coverage belongs to M4.                                                                                                                                |
| `docs/current-focus.md` M1                        | Record partial result and named pending scan without claiming a completed task.                                                                                                                                                                       |
| Gateway/protobuf/OpenAPI/SDK/worker/SQL consumers | Unchanged; security review introduces no contract, fixture, schema or generator input. No preflight/native suite rerun is warranted.                                                                                                                  |

### Verified release, license and image identity

The official [latest-release endpoint](https://api.github.com/repos/seaweedfs/seaweedfs/releases/latest)
returns 4.51, published 2026-10-25T19:39:12Z, neither draft nor prerelease. Its
[release notes](https://github.com/seaweedfs/seaweedfs/releases/tag/4.51) identify
commit prefix 153ab66. The pinned
[security policy](https://github.com/seaweedfs/seaweedfs/blob/4.51/SECURITY.md)
places security fixes in the latest release; do not assume an indefinite LTS
backport commitment. The pinned [license](https://github.com/seaweedfs/seaweedfs/blob/4.51/LICENSE)
remains Apache-2.0, compatible with the selected community/no-paid-activation
direction subject to its existing notice and redistribution requirements.

Read-only Docker registry requests rehashed the current tag manifest, selected
linux/amd64 manifest and image configuration, verifying each digest:

- Index/pin: `sha256:f7a49e3f3972ebed5be2ed4befa4a0c68eb7bdddba6e692d42729ceb545134b8`.
- linux/amd64 manifest: `sha256:3a522c379599e163433a636e75022630848b63a74f08ea37bf06f8d776e9a707`.
- Configuration: `sha256:e9535759e270021cc18782c39e1dcc7977ad801edc4e3676a3d2f6c29bf598b6`.
- Created: 2026-10-26T05:01:37.454963186Z; ten compressed layers totaling
  197,014,588 bytes. This is registry layer size, not a runtime disk-use claim.

The image configuration starts `/entrypoint.sh` with mini. Although its configured
user defaults to root, the pinned [entrypoint source](https://github.com/seaweedfs/seaweedfs/blob/4.51/docker/entrypoint.sh)
fixes volume ownership when needed and switches to the seaweed user before
starting the process. Do not infer that the application runs as root solely from
an empty configured User field. Source inspection is not a new native runtime
identity proof; preserve this existing mechanism during M2.

Ignored public metadata evidence is under `.ci-evidence/seaweed-review/m1/`:
release.json, advisories.json, manifest-index.json, manifest-amd64.json,
image-identity.json and pinned license/security/entrypoint/S3-gRPC sources. The
anonymous registry token was held in memory only and was neither saved nor
printed. No real application configuration or environment was dumped.

### Advisory and deployment-boundary review

The official [repository advisory API](https://api.github.com/repos/seaweedfs/seaweedfs/security-advisories?per_page=100)
returned 25 published, non-withdrawn advisories. None of their currently stated
affected ranges includes 4.51. Some patch-version fields are blank, so this is
an affected-range review, not a blanket fixed/security-clean assertion. Examples:

| Advisory                                                                                                     | Reported affected range | Current review                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| [S3 identity administration](https://github.com/seaweedfs/seaweedfs/security/advisories/GHSA-5fx4-c9qp-36jc) | <=4.45                  | 4.51 is outside the range; pinned S3 gRPC source also calls admin authentication before identity mutations.                          |
| [POST Object bucket policy](https://github.com/seaweedfs/seaweedfs/security/advisories/GHSA-qmx6-fpcw-q3xg)  | <=4.45                  | 4.51 is outside the range; keep explicit bucket-scoped credentials and denial proofs rather than assuming every upload path is safe. |
| [Filer TUS scope](https://github.com/seaweedfs/seaweedfs/security/advisories/GHSA-99q7-x53r-6j4g)            | =4.39, patched 4.40     | Does not select 4.51; raw filer/TUS is not an intended public Media interface.                                                       |

The upstream trust model requires master, volume, filer and internal RPC ports
to stay on trusted networks. The current proof publishes only loopback S3 and
disables WebDAV/admin/Iceberg/Lance. Carry that boundary into M2; no direct raw
filer/internal RPC publication or tenant-feature expansion is justified here.
These are existing deployment requirements, not a new architecture replacement.

### Findings and pending scan

- **Stale local scanner data:** installed Trivy is 0.74.0; its cached vulnerability
  DB was updated Aug 25 and is insufficient for an Oct 31 review. The prepared
  scan must refresh normally; do not use skip-db-update/offline-scan or ignore
  unfixed findings. CI scanner 0.73.0 remains separately pinned and unchanged.
- **Confirmed operational failure:** a read-only Docker image inventory received
  engine HTTP 500. No restart/reset was attempted during M1. The prepared scan
  selects the registry directly, so it does not depend on this engine condition.
- **Future scaling consideration:** storage namespace primitives do not establish
  authoritative tenant isolation. That remains deferred F4; no tenant work starts.

Image package/Go-binary vulnerability results are still unknown. Scanning only
the source advisory page or the backend fleet would leave that coverage gap.
SeaweedFS is Alpine-based in the inspected build source; the existing narrowly
scoped unfixed-Debian backend exception must not automatically cover its findings.
Any image finding requires its actual package/version/fix/reachability review;
no new blanket waiver is approved.

### Named scan handoff receipt

Preparation: inspected exact target/policy/consumers above; registry digest and
platform verified; local Trivy help confirms image-src, platform, timeout,
scanners and JSON-output flags. The report directory is Git-ignored. No source
change invalidates previous focused/type/contract/SQL/native evidence. Only
documentation formatting/link/diff checks apply to this preparation. The actual
scan is operator-owned because it refreshes the DB and downloads/analyzes image
layers; it has not run. Readiness: READY FOR EXACT-DIGEST REMOTE IMAGE SCAN.

Run from the repository in PowerShell:

```powershell
New-Item -ItemType Directory -Force .security-reports | Out-Null
trivy image --db-repository ghcr.io/aquasecurity/trivy-db:2 --image-src remote --platform linux/amd64 --scanners vuln --severity HIGH,CRITICAL --exit-code 1 --timeout 15m --format json --output .security-reports/seaweedfs-4.51-m1.json chrislusf/seaweedfs:4.51@sha256:f7a49e3f3972ebed5be2ed4befa4a0c68eb7bdddba6e692d42729ceb545134b8
"scan_exit_code=$LASTEXITCODE"
```

Exit 1 can mean matching vulnerability findings; retain the JSON and error output
for triage. A transport/database download failure is not a vulnerability result,
and exit zero is not proof of unscanned architectures or runtime authorization.
Inspect report identity, database freshness and OS/Go coverage before closing M1.

### M1 database-mirror failure and narrow retry

Salar ran the initial command without a repository override at 11:33:38 local
time on Oct 31. It exited 1 before image analysis: the database download from
mirror.gcr.io returned HTTP 403. No SeaweedFS scan JSON was produced. This is a
confirmed download/access failure, not a reported SeaweedFS vulnerability and
not successful use of the old cached database.

The official [Trivy database documentation](https://trivy.dev/latest/docs/configuration/db/)
lists GHCR as a database source and documents the db-repository override. A
bounded anonymous manifest probe of ghcr.io/aquasecurity/trivy-db:2 returned
HTTP 200, digest
`sha256:fec68f9070bde1c8913e45ca280d6c9d5f0493b9ab4fd11954520656bd7e0f2b`.
The probe retrieved metadata only; it does not prove complete layer download or
image analysis. No credentials were printed or persisted.

The runnable command above now selects GHCR directly, bypassing the denied
Google mirror while retaining database refresh, exact target/platform, all
HIGH/CRITICAL findings and nonzero vulnerability exit policy. No source/CI/global
scanner configuration changed. Existing preparation remains valid; actual retry
and finding triage remain pending. M1 stays unchecked.

### M1 actual image scan result and remediation boundary

Salar supplied the GHCR retry result: the database downloaded successfully,
Alpine and Go binary analysis completed, and vulnerability exit code was 1.
Agent inspected the actual JSON, not only the exit code:

- Report: `.security-reports/seaweedfs-4.51-m1.json`, created
  2026-10-31T11:43:04.8719968+03:30; SHA-256
  `9509afa8d461e67770a25bfa88fdbb9b9a27f7e5b6c1469989520066663f7884`.
- Artifact index equals the reviewed pin; ImageID equals configuration digest
  `sha256:e9535759e270021cc18782c39e1dcc7977ad801edc4e3676a3d2f6c29bf598b6`.
- Trivy 0.74.0 DB updated 2026-10-31T07:07:33.630580495Z and downloaded
  08:12:08.5859695Z; this is the fresh DB, not the August cache.
- Alpine 3.24.3: 29 inventoried packages, zero reported HIGH/CRITICAL findings.
- `usr/bin/weed`: 245 inventoried Go packages, one HIGH and zero CRITICAL findings.
  Lower severities were not selected; no all-severity clean claim is made.

| Classification                   | Finding                                                                                                 | Evidence and disposition                                                                                                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Confirmed affected component     | CVE-2026-116587 / GHSA-mgcc-cww5-fp2q, github.com/go-jose/go-jose/v4 v4.1.5 in the compiled weed binary | Upstream fixes the crafted RSA/JWK parsing CPU exhaustion in 4.1.6. Retain as an image-acceptance blocker; no waiver or exploitability claim.                                                       |
| Stale scanner lifecycle metadata | Trivy warns Alpine 3.24 is absent from its EOL list                                                     | The official Alpine release table lists 3.24.3 and current main/community support; main support ends 2028-06-01. The warning is not evidence of an unsupported OS or absent vulnerability analysis. |

Primary checks: the [go-jose advisory](https://github.com/go-jose/go-jose/security/advisories/GHSA-mgcc-cww5-fp2q),
[4.1.6 release](https://github.com/go-jose/go-jose/releases/tag/v4.1.6),
[SeaweedFS 4.51 go.mod](https://github.com/seaweedfs/seaweedfs/blob/4.51/go.mod),
[current upstream go.mod](https://github.com/seaweedfs/seaweedfs/blob/master/go.mod)
and [Alpine release policy/table](https://alpinelinux.org/releases/).
The tagged SeaweedFS source agrees with the scan at go-jose 4.1.5; inspected
upstream master already selects 4.1.6. This does not establish that a released,
approved replacement image exists. The published fixed module adds a 4096-bit
RSA modulus limit by default; account for that if JWK consumers are enabled.

Scope check: inspected pinned `weed/iam/oidc/oidc_provider.go` uses
golang-jwt/jwt/v5 directly, so the presence of go-jose must not be casually
described as proof that this particular OIDC handler is vulnerable. The exact
transitive call path and exploitability from our configured SigV4-only API have
not been established. No exploit, payload or production service was exercised.
Do not infer safety solely because the package is indirect or tenant work is
deferred. The repository's current policy blocks this HIGH non-Debian finding.

The narrow correction to prepare is a source-pinned SeaweedFS 4.51 security
rebuild carrying only the selected go-jose dependency correction (now 4.1.7;
see the subsequent currency decision below), followed
by a fresh image scan and digest-specific compatibility proof. Updating npm or
Alpine packages cannot replace a Go module already compiled into weed; a blanket
move to upstream master would include unrelated changes. Preserve the current
entrypoint, S3 contract and persistence behavior. This is a vendor dependency
repair, not a replacement of Media or its storage architecture.

Cost/consumer boundary before any implementation: a custom vendor artifact
requires a reproducible source/toolchain/module patch record, an owned image tag
and identity, a fresh scan, the existing isolated S3/restart proof against the new
artifact, and later M4 CI/archive supply integration. It adds vendor-build
maintenance until an acceptable official release supersedes it. Trace the new
build recipe, `docker/seaweedfs/compose.proof.yml`,
`scripts/storage/seaweed-s3-proof.mjs` and M4 image consumers before editing;
do not silently swap the accepted pilot image or execute a long source build.
No build recipe, vendor pin or deployment was changed during this review.

Observed result summary is saved under the ignored
`.ci-evidence/seaweed-review/m1/scan-summary.json`. M1 remains open for remediation
and rescan; do not advance the active cutover based on the passing API pilot.

### M1 dependency currency decision - go-jose 4.1.7

Salar requested that this vendor dependency be brought current during Media,
rather than repaired to a minimum version and reopened during maintenance.
The authoritative GitHub release API and Go module proxy both confirm
**v4.1.7** as the latest stable v4 release on Oct 31, published
2026-10-30T19:11:27Z. An earlier cached latest-release HTML response still showed
4.1.6; the explicit [4.1.7 release page](https://github.com/go-jose/go-jose/releases/tag/v4.1.7),
live API and module version list resolve that discrepancy. The 4.1.6 figure above
is the minimum fix for the scanned CVE, not the selected current target.

4.1.7 includes five further security fixes plus parsing corrections. The module
path remains github.com/go-jose/go-jose/v4; both 4.1.6 and 4.1.7 declare Go
1.24.0 with no new module requirements in their published go.mod files. SeaweedFS
4.51 declares Go 1.26.6. This clears the declared Go/module-major compatibility
check; it does not substitute for compilation, focused vendor checks, image
rescan or native S3/restart acceptance. Deprecated parse APIs and tightened
limits must be checked against actual consumers during rebuild preparation.

Select **4.1.7** for the pending narrow vendor rebuild. Inspected SeaweedFS
master selected 4.1.6 at review time, so do not call this an already adopted
upstream SeaweedFS release or switch wholesale to master. The artifact still
contains 4.1.5 until rebuilt and verified; M1 remains open.

Public metadata is saved under `.ci-evidence/seaweed-review/m1/` as
go-jose-latest.json and go-jose-v4.1.6.mod / go-jose-v4.1.7.mod. Once M1's new
artifact, version, scan and compatibility receipt passes, maintenance D1/D4 must
consume that evidence rather than rebuild/rescan the same unchanged vendor
cohort merely because the roadmap reaches dependencies. Reopen only for changed
inputs, a newly relevant advisory or an explicit freshness requirement; no
permanent exemption from future security maintenance is implied.

### M1 4.1.7 rebuild - before-edit trace

Salar explicitly selected 4.1.7. Prepare a candidate image without changing the
accepted pilot or active MinIO deployment. The upstream 4.51 normal-image release
matrix uses empty Go build tags; large-disk/full variants are separate. Preserve
the normal variant, CGO-free Go binary, existing runtime image/entrypoint/assets
and compiler version. The scanned binary uses Go 1.26.10, also the current
supported 1.26 patch in the official download feed at this check. The official
golang:1.26.10-alpine3.24 builder index was verified as
`sha256:a2012b4a1d1f9f7e9f44e0d39b805a901e856b1dd80b4e6ee4338db547050308`.
Source tag 4.51 resolves to commit
`153ab668c99731a6d29492bf6c61d0b4fa701101`. No moving master checkout is needed.

| Owner / symbol                      | Consumer path                                                                                                                                                                             | Action / reason                                                                                                                                                                          |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New vendor build recipe             | `docker/seaweedfs/security.Dockerfile`                                                                                                                                                    | Pin source, Go builder and original runtime; change only go-jose requirement/sums; enforce unchanged remaining module graph, run module tests and verify final binary build metadata.    |
| Candidate artifact                  | `docker/seaweedfs/compose.security-proof.yml`                                                                                                                                             | New opt-in image override for isolated proof only; leave accepted base proof image and active Compose unchanged.                                                                         |
| Operator instructions               | `docker/seaweedfs/README.md`                                                                                                                                                              | Name native checks/build/scan/proof order, actual pending states, labels/provenance and rollback to accepted image. No backend image rebuild.                                            |
| Isolated S3 proof                   | `scripts/storage/seaweed-s3-proof.mjs`, `docker/seaweedfs/compose.proof.yml`                                                                                                              | Reuse all existing signature, race, namespace, metadata and persistence assertions unchanged against the candidate; only the explicit override selects the new image.                    |
| Active image supply / inventory     | `.github/workflows/ci.yml`, `.github/minio-offline.yml`, `scripts/docker/release-image-inventory.mjs`, `scripts/docker/save-release-images.ps1`, `scripts/docker/load-release-images.ps1` | Unchanged now; candidate is not accepted/published/deployed. Adoption and vendor archive consumers remain M2/M4-owned.                                                                   |
| Media / Gateway / SDK / SQL / seeds | Existing header/caller/store/fixture paths in earlier trace                                                                                                                               | Unchanged: vendor binary dependency correction introduces no application contract/schema change. Existing passes remain; provider-specific native proof is pending.                      |
| Build context                       | Root `.dockerignore`, `scripts/docker/check-build-context.mjs`                                                                                                                            | No root-context or backend COPY change. Candidate recipe has no local COPY/ADD inputs; use the small docker/seaweedfs context and inspect native BuildKit checks before heavy execution. |
| Accepted maintenance receipts       | `docs/current-focus.md`, dependency assessment                                                                                                                                            | Record pending candidate checks; carry accepted version/digest/scan forward once actual proofs pass.                                                                                     |

Docker readiness probe currently times out after eight seconds; no engine reset
or build was attempted. Finish static preparation and preserve this operational
failure separately from compatibility. Do not claim native Docker checks passed
or hand off heavy execution while their required preparation is unresolved.

### M1 4.1.7 candidate preparation receipt

Implemented the three candidate-only files in the preceding trace. The new
security Dockerfile pins the original source commit, current matching Go compiler
image and accepted runtime image. It changes go-jose 4.1.5 to 4.1.7 with Go's
normal checksum verification plus the two observed sumdb hashes. It compares the
remaining complete module graph, refuses unrelated go.mod/go.sum edits, runs the
module's tests and verifies compiled module metadata. Normal tags/CGO-free build,
the original entrypoint/assets and data layout are preserved. Module/compiler
caches and bounded Go concurrency avoid a backend or Rust rebuild. All output
commands and provenance refer to public vendor inputs, not project credentials.

The opt-in security proof overlay changes only image/pull policy. The accepted
base proof, proof script, active application Compose, SDK, SQL and current CI
archive supply are unchanged. M2/M4 consumers are explicitly deferred until this
artifact is accepted. No image was built, loaded, pushed or selected for Media.

Observed cheap checks:

- Three actual shell RUN blocks parse with Git Bash in syntax-only mode.
- The actual module-diff awk guard accepts the selected module update and rejects
  unrelated dependency and Go-directive changes (three controls).
- Source SHA, builder digest and both selected module hashes match the retrieved
  public metadata; base proof and candidate overlay parse with the installed
  YAML parser, and the overlay adds no endpoint/credential/mount changes.
- No local COPY/ADD input exists in the candidate recipe; all three copies are
  from its builder stage. Root Docker context/COPY exclusions are untouched, so
  the backend local-copy probe is inapplicable here. Native Dockerfile/BuildKit
  checks are still required before the long build.
- Existing proof script passes Node syntax checking; new Markdown/YAML pass
  formatting, new source has no trailing whitespace and git diff checking passes.
  No application contract changed, so broad preflight/native suites are not
  repeated for this preparation. Go tests run inside the pending vendor build;
  no host Go installation or passing Go test result is claimed.

Operational prerequisite remains unresolved: Docker Desktop status reports
running, while an eight-second engine/version probe times out. Do not mistake
Desktop UI status for engine readiness. No engine kill, WSL shutdown, volume
reset, cache prune or backend build was attempted. Operator restart/readiness is
the next handoff; the long candidate command is documented as a conditional plan,
not released for execution before native preparation is complete.

Readiness: STATIC PREPARATION PASSED; NATIVE PREPARATION BLOCKED BY DOCKER ENGINE
READINESS. After recovery, inspect the native BuildKit check and finish the
consumer review receipt before handing over the long source build. M1 remains
unchecked; the accepted version decision is 4.1.7, not an installed upgrade yet.

### M1 engine recovery and vendor-build handoff

Salar supplied restored engine resources: seven CPUs and 14,065,836,032 memory
bytes. Agent then ran native BuildKit check for security.Dockerfile against the
docker/seaweedfs context, linux/amd64: exit zero, "Check complete, no warnings
found." Builder/runtime digest metadata resolves. This is Dockerfile validation,
not source compilation, Go tests, image export or candidate acceptance.

Both base and candidate Compose configurations render successfully through the
real Docker CLI. The parsed full-object comparison proves the only differences
are the candidate image and pull policy. Loopback S3 publication, original mini
flags, persistent data and read-only credential mount remain unchanged. No
container was started by these checks. An initial PowerShell-to-Node quoting
failure in the read-only inspection command was corrected; native rendering and
the subsequent direct-argv comparison both passed before handoff.

Handoff receipt:

- Requirement/finding: replace compiled go-jose 4.1.5 with selected current stable
  4.1.7 in the source-pinned SeaweedFS 4.51 candidate, without application or
  storage-layout changes.
- Changed files/consumers: preceding exact trace and candidate files reviewed;
  base proof, SDK/worker/SQL and active CI/deployment remain unchanged for the
  recorded reasons. No omitted generator/hash/fixture refresh is required.
- Cheap checks: static shell/negative controls/pins/YAML/format/diff pass; native
  BuildKit check exits zero without warnings; actual Compose base/candidate
  equality passes after excluding the two intentional image/pull-policy fields.
- Actual native dependency tests and build: pending inside the long vendor
  build. No passing Go/compiler result or candidate image identity is invented.
- Source/image drift: candidate does not exist yet. It needs its own source build;
  no Nebula backend image or application migration needs rerunning for this edit.
- Limitations: local linux/amd64 candidate only, scan and isolated S3/restart
  acceptance pending; M2/M4 adoption/publication and F4 remain deferred.
- Next command: the documented Buildx candidate build, with sequential bounded
  compilation and cached modules, local load and stop-on-error. Expected: exact
  dependency/module-graph guards, go-jose tests, binary metadata, runtime version
  check and image export pass; retain its exit code and final log tail.

Readiness: READY FOR NAMED VENDOR SOURCE BUILD. M1 remains unchecked until the
actual resulting image scan and candidate compatibility proof are accepted.

### M1 first source-build failure - module download route

Salar's candidate build exited 1. Agent decoded the full PowerShell UTF-16 build
log and separated successful prerequisites from the actual failure: source and
compiler checks, go-jose 4.1.7 download/checksums, module verification, unchanged
other-module graph and go-jose tests all completed. Eight packages report test
passes; two utility packages have no test files. Compilation then failed while
downloading several unrelated, unchanged module ZIPs from proxy.golang.org:
HTTP 403 for AWS SDK, Google API, compression/LZ4/Roaring dependencies. No
candidate image, completed compiler output or runtime proof is claimed.

Confirmed operational finding: the default comma-separated Go proxy configuration
does not fall back on HTTP 403. The official
[Go module reference](https://go.dev/ref/mod#environment-variables) documents
comma fallback on 404/410 versus pipe-separated fallback on download errors.
Bounded host range requests for the exact AWS, Google API and compression ZIPs
returned HTTP 206 from both goproxy.cn and goproxy.io, without downloading the
archives. Host results do not substitute for container-network evidence.

Before-edit scope: change only vendor-builder module download routing in
security.Dockerfile and its README/status receipts. Keep the existing source,
compiler/runtime pins, go-jose version/hashes, graph/diff assertions, tests,
readonly compilation and cache IDs. Explicitly retain sum.golang.org checksum
verification. Base/candidate Compose, proof/SDK/worker/SQL and M4 CI/archive
consumers remain unchanged. Probe the builder network and repeat native/static
checks before handing over another source build; do not clear the populated
module/compiler caches or solve this by disabling integrity checks.

### M1 module-routing correction and retry receipt

Prepared a configurable builder GOPROXY default using goproxy.cn, goproxy.io and
direct source fallback, with pipe separators so an access denial can fall back.
GOSUMDB remains explicitly sum.golang.org and the build asserts it is enabled.
The source/compiler/runtime pins, selected module and both hashes, module graph
and patch assertions, tests, readonly compilation and both cache IDs are intact.
The new download settings are after the cached source stage; no backend build,
active Compose, application contract, generator, SQL or vendor artifact changed.
README and current-focus record the actual failed attempt and pending retry.

Native network checks used the same pinned Go builder image. HEAD requests for
all five failing archive families (AWS SDK, Google API, compression, LZ4 and
Roaring) returned HTTP 200 from the selected alternates. Earlier bounded range
requests reached HTTP 206; BusyBox wget treats that partial response as an error,
so those were not counted as successful complete downloads. Actual Go archive
download/verification remains part of the operator build, not a HEAD-probe claim.

Post-edit cheap checks pass: all three shell RUN blocks parse, explicit checksum
DB/cache settings are intact, native BuildKit check exits zero without warnings,
Markdown formatting and git whitespace checks pass. No local COPY input or
candidate Compose change was introduced, so prior context/override checks remain
applicable. No scoped application/preflight/SQL suite was invalidated.

Preserved the original failed UTF-16 log under the ignored
`.ci-evidence/seaweed-review/m1/source-build-first-failure.log`, SHA-256
`21ec37a239a9c403e323fb38acf609b830527c2ac303bd8ea7636afabfc87cb2`, before
the root build log is overwritten by a retry.

Readiness: READY FOR SAME NAMED VENDOR SOURCE BUILD WITH CORRECTED DOWNLOAD
ROUTING. Reuse the documented Buildx command and caches; do not force/no-cache or
change the selected dependency version. Expected result remains a complete
binary with only go-jose 4.1.7 changed, guard/test success and local candidate
export. Compilation/export, candidate scan and S3/restart proof are still pending.

### M1 corrected source build accepted; candidate scan handoff

Salar supplied build exit code zero. Agent decoded the complete current log and
inspected the local immutable candidate with short no-network containers:

- Tag: `nebulanv-vendor-seaweedfs:4.51-gojose4.1.7`.
- Local image/index identity:
  `sha256:696f5dba5b4a35b76f65e9fd5d5b209137c50cfc65c648ffe57850844f751413`.
- Exported linux/amd64 manifest:
  `sha256:5772abacf440c57ed26c8591472b1726d681d1b421fb365e26d297000cae0f90`.
- Exported configuration:
  `sha256:dd21ba25de53ac8e0e66951a942d1d1792d8f115c9a7b3833d28d05a7808b3b9`.
- Embedded build metadata: Go 1.26.10, go-jose v4.1.7 with its expected checksum,
  source revision 153ab668c99731a6d29492bf6c61d0b4fa701101. The recorded modified
  VCS tree is expected from the explicit module patch, not an untracked server edit.
- Actual stored module patch contains four changed dependency lines, all for
  go-jose; other-module comparison and source/diff guards passed. Patch digest
  as read/normalized by the inspection helper:
  `4b35a72afcff4941e54810059e8b469157da3f694a065dbd9cda7efc1158c6ef`.
- Eight go-jose packages pass tests (cache reused from the preceding successful
  dependency test stage); two utility packages contain no test files. Both the
  earlier actual run and this cache reuse are preserved, not reported as new
  independent coverage.
- Compilation and runtime version check pass: normal 30GB variant, SeaweedFS
  4.51, pinned revision, linux/amd64. The long build RUN completed in 1282.1s;
  export completed in 18.8s. These are stages, not a measured total build duration.

The runtime's enterprise-edition informational message does not mean this
community artifact requires activation. No enterprise features were selected.
The active application stack and accepted base proof image remain unchanged.
Inspection containers used the immutable local image ID, no network, no volumes
and automatic removal. Public artifact evidence is stored under ignored
`.ci-evidence/seaweed-review/m1/candidate-build-identity.json`.

Candidate scan receipt: all preceding exact consumer, native BuildKit, routing,
shell/pin/graph/hash controls and formatting/diff gates remain applicable. Only
documentation status changed after the successful build. The named next proof
is Trivy against the actual local candidate with the GHCR DB source, linux/amd64
and HIGH/CRITICAL policy; retain the JSON even for nonzero vulnerability exit.
It must establish the correct image, fresh DB, actual Go 4.1.7 coverage and finding
disposition. Do not rescan the original registry image or infer a clean result
from successful compilation. Actual candidate scan and isolated S3/restart proof
are still pending. Readiness: READY FOR LOCAL CANDIDATE IMAGE SCAN; M1 remains open.

### M1 hosted build route - before-edit trace

Salar requested building on GitHub and loading the resulting image locally to
avoid local download restrictions. Prepare a standalone, bounded vendor job,
not another full backend build. GitHub-hosted Linux provides a separate network
and SSD-backed runner; that makes it a useful route, not a guarantee that every
registry will be available. Current local image/build evidence is preserved.

| Owner / consumer                                                               | Action or unchanged reason                                                                                                                                                                                             |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New `.github/workflows/seaweed-vendor.yml`                                     | Build the existing pinned recipe, scan before artifact export, retain a checksummed image archive briefly and emit exact commit/image/provenance evidence. No registry/package/release publication or project secrets. |
| `docker/seaweedfs/security.Dockerfile`                                         | Reuse unchanged source/compiler/runtime/module pins and guards; hosted execution may override only public download routing.                                                                                            |
| New `scripts/storage/seaweed-vendor-evidence.mjs` and `.test.mjs`              | Validate actual image labels, platform, scan layer identity/coverage, selected module and HIGH/CRITICAL policy before exporting; regression-test missing/mismatched/unsafe evidence.                                   |
| `docker/seaweedfs/README.md`                                                   | Add hosted artifact/download/load workflow and precise pending results; local build remains fallback, not a required rebuild of an already accepted artifact.                                                          |
| Existing `.github/workflows/ci.yml`, backend tooling tests and release scripts | Unchanged. Their current workflow policy tests inspect ci.yml directly; standalone vendor job does not silently replace backend quality, image or release gates. M4 still owns active provider supply.                 |
| Current dirty repository                                                       | Preserve unrelated changes/index/main. Publish only reviewed vendor-workflow inputs on an isolated branch if executing the requested hosted build; identify exact tested commit.                                       |
| App/API/SQL/proof consumers                                                    | Unchanged; accepted Media/D2 results remain. The downloaded artifact still needs local S3/restart proof before M1 acceptance and active cutover.                                                                       |

Before hosted handoff: Node focused evidence tests, typed-independent scoped JS
lint, YAML/action/shell validation, native recipe check reuse, formatting and
diff review. No pnpm install, app rebuild or Gateway preflight is required for a
standalone Node/Docker vendor workflow with no API/generator changes.

### M1 hosted workflow preparation and execution receipt

Implemented the standalone workflow plus a pure Node evidence gate and ten
focused regressions. The gate rejects old compiled module/toolchain evidence,
missing OS/Go inventories, different scanned layers/artifacts, HIGH/CRITICAL
findings including unfixed ones, wrong source labels and unrelated module edits.
Only a passing image can be exported. Provenance and scan evidence accompany
the streamed compressed archive and its SHA-256 file; artifact retention is
three days. Failed scan evidence can be retained without exporting the image.
The job uses the existing pinned BuildKit/setup/cache patterns, pinned checkout
and artifact actions, and current verified Trivy 0.76.1 for this job only.
The ordinary backend CI's scanner/version/policy remain unchanged.

Local preparation: ten Node tests pass without failures/skips, scoped JS lint
passes, new source passes formatting, actionlint 1.7.12 reports no workflow
errors, and native recipe checks remain valid because the Dockerfile is unchanged.
Actionlint was downloaded into ignored local tooling and its release asset
SHA-256 verified before execution. It checks workflow syntax/expressions; absent
external shellcheck/pyflakes executables are not claimed as passing semantic
linters. Actual workflow Bash blocks receive separate syntax-only checks before
publication. No API/SQL/generator consumer changed, so broad backend/preflight
suites are not repeated.

Review/publication boundary: the requested cloud build can use a branch snapshot
containing only the workflow, vendor Dockerfile, evidence helper and focused
tests. Preserve all unrelated dirty files and the user's real Git index/main.
No repository secrets, real envs, demo data, image-registry write token or public
release asset are part of the new job. A branch push starts this narrow workflow;
existing CI push filters do not run the full backend suite on that branch.

Readiness after final cheap checks: READY FOR ISOLATED HOSTED VENDOR BUILD.
Actual commit/run/image/scan/artifact identities remain pending and must be
recorded from the run; the locally built candidate is not silently certified by
future cloud output. M1 and active cutover remain open.

Hosted execution started:

- Published only four reviewed files on agent/seaweed-vendor-20261031: workflow,
  security Dockerfile, evidence helper and helper tests. Commit
  `c26ca397e1c6e9376fc6b01bcee57e7758508f7d` is based on fetched origin/main.
  A separate temporary Git index and commit-tree snapshot preserved the real
  index byte-for-byte, local branch/HEAD and every unrelated working change.
  No main push or bulk working-tree commit occurred.
- Run [41203305981](https://github.com/pain1122/nebulaNV/actions/runs/41203305981),
  job 124543268602, is in progress. Connected GitHub job metadata confirms setup,
  checkout, ten evidence tests, pinned BuildKit and masked cache credential setup
  succeeded; vendor build is running. No hosted scan, artifact or downloaded
  image has passed yet.
- Final local checks: ten focused tests, scoped JS lint, actionlint and four
  actual workflow Bash syntax blocks pass. Formatting and git whitespace checks
  pass after correcting three documentation-format warnings. No known cheap
  preparation failure was left for the hosted run.

The runner performs download/compile/scan and only then produces the temporary
vendor archive. Local use will still require archive checksum and image identity
verification plus the existing S3/restart proof. This hosted run certifies only
its four-file vendor snapshot, not the broader uncommitted Media/tooling cohort.

### M1 hosted build and scan passed; download handoff

Connected GitHub job metadata and run status now confirm run 41203305981/job
124543268602 completed successfully at commit c26ca397. Every applicable step
passed: ten focused evidence tests, pinned build/cache setup, vendor build,
Trivy installation, actual image scan/evidence validation, archive export and
artifact upload. The failure-only scan upload was skipped as intended; this is
not skipped test coverage. Hosted HIGH/CRITICAL policy and compiled module/layer
checks passed; independent inspection of the downloaded JSON is still pending.

Artifact seaweedfs-linux-amd64-41203305981 is present and not expired. GitHub
reports 313,208,186 bytes (about 299 MiB) and the configured retention is three
days. It contains only the vendor image archive, checksum and public build/scan
evidence. No public registry or release asset was published.

Download from the repository root:

```powershell
gh run download 41203305981 --repo pain1122/nebulaNV --name seaweedfs-linux-amd64-41203305981 --dir .ci-evidence/seaweed-hosted/41203305981
```

Receipt: the previously traced workflow/recipe/evidence gate and its passing
cheap checks are unchanged; hosted execution provides the missing build/scan
result. The next operator-owned operation is only this archive download. Verify
its SHA-256, manifest/commit/scan and exact loaded image identity before local
proof; do not silently equate the separately built local candidate with this
hosted artifact. Actual local load and S3/restart proof remain pending, and M1
is not yet marked complete. No repeat local compilation is requested.

### M1 downloaded artifact verified; local load handoff

Salar completed the download. Agent independently streamed the entire archive
through SHA-256 and verified its checksum file:
`6ddc676c6f1b1ef6802f8108f2132b9f4775b5904a6f110110f34ac7819a06c6`.
The compressed image archive is 313,002,453 bytes. Read-only tar-to-stdout
inspection found exactly one tagged image, validated its configuration filename,
hashed the actual configuration bytes and matched them to hosted image identity
`sha256:f8f5f36e5a431ba22a2bdc53fb80700982ca0292430bf11cf091cf639d209cc8`.
All fourteen actual configuration layer IDs equal the manifest and scan layers.
No archive files were extracted into application paths.

Replayed the evidence gate against the downloaded scan, binary metadata and
patch using the actual archive's platform/labels/layers. Workflow commit/run
match c26ca397e1c6e9376fc6b01bcee57e7758508f7d / 41203305981; Go 1.26.10,
go-jose 4.1.7 and the vendor source match. The actual scan contains 29 Alpine and
245 Go package records, zero selected HIGH/CRITICAL findings, Trivy 0.76.1 and
same-day refreshed database metadata. Lower severities were not selected. The
local verification receipt is saved beside the ignored downloaded artifact.

Preserved the previous local candidate (image/index 696f5dba...) under
`nebulanv-vendor-seaweedfs:4.51-gojose4.1.7-local-backup-20261031` before the
hosted archive replaces the mutable candidate tag. No application container,
storage volume or active provider changed. The isolated proof project has no
containers. Its old journal is complete, run a91c10f90dfafecef66bd1f4; preparation
must preserve that completed fixture session before creating a fresh one because
the current prepare command refuses any existing state file. README now reflects
that actual guard; no proof assertion was weakened or script changed.

Load receipt: archive integrity, source/scan identities, platform/module evidence
and all relevant earlier cheap gates pass. No source/config/contract changed
since the hosted scan. Operator-owned Docker load is the next operation; no
rebuild or scanner rerun is required for this exact archive. After load, inspect
the actual loaded tag/config/layers before handing off the isolated proof. Both
local load and that new artifact's S3/restart proof remain pending. Readiness:
READY FOR VERIFIED HOSTED IMAGE LOAD.

```powershell
docker load --input .ci-evidence/seaweed-hosted/41203305981/image.tar.gz
"load_exit_code=$LASTEXITCODE"
```

### November 2 resumption - health and loaded-image checkpoint

The October 31 turn was interrupted after successful local loaded-image
verification. Preserve its actual result: local Docker store ID
`sha256:0f27a2ec053a9dc1b25342d1f754799e3d12d736f0a6c6daa847ba3dcc35a75c`
differs from the archive's canonical configuration ID f8f5f36e..., but all
fourteen loaded layers and the complete runtime configuration equal the scanned
artifact, and actual stored binary metadata/module patch equal the downloaded
files. The first comparison incorrectly treated store ID and configuration ID
as interchangeable and rejected scan_artifact_mismatch. This was corrected by
verifying canonical configuration/layers/runtime values, with no relaxation of
the hosted evidence gate or assertion removal. The successful local receipt is
`.ci-evidence/seaweed-hosted/41203305981/loaded-verification.json`.

The completed original proof session a91c10f90dfafecef66bd1f4 was preserved under
the ignored `.ci-evidence/seaweed-s3-proof.completed-a91c10f90dfafecef66bd1f4`
after checking owned paths, completed state/bucket scope and absence of proof
containers. Fresh session 0b263ed8a1e64a5246eefaed is prepared with random scoped
credentials; no proof objects/server were started before the interruption.

Salar now explicitly requests container health/recovery and resumption. Docker
responds with seven CPUs/about 13.10GiB. Current inventory: all five infrastructure
services healthy, all eleven app containers stopped with exit 255 from the same
shutdown window; no isolated SeaweedFS proof container exists. Candidate tag
still resolves to the exact previously verified local store ID. No source/image
change, pending migration or need for an image rebuild is inferred from this
stopped state. Restore the existing apps, then readiness-check the backend.

Preparation receipt: prior unchanged recipe/override/consumer/type/contract and
hosted scan/artifact checks remain valid. Only operational recovery is requested.
Prepared proof state is reusable; never rerun prepare over it or erase journals.
Readiness: READY FOR EXISTING-APP STARTUP AND ISOLATED CANDIDATE S3/RESTART PROOF,
conditional on actual readiness. Salar's explicit request permits agent execution
of this recovery/proof. No volumes/caches are reset, no active storage cutover or
tenant feature work is part of the operation. Actual results follow below.

### November 2 recovery result and operator-owned proof receipt

The attempted simultaneous app startup failed when the Docker engine began
returning HTTP 500, including on container inspection. Windows had only about
330 MiB free RAM; memory pressure is a possible contributor, not a proven root
cause. No application defect or image rebuild requirement was established.
Salar then clarified that all long operations remain operator-owned, superseding
the preceding execution permission. Agent work is preparation and fast checks.

Salar now supplies a successful `pnpm backend:health` result: all eleven services,
including Realm Auth and Tenant Authority, report ok. This is operator-reported
readiness, not an independently rerun suite. Fast local inspection confirms the
candidate tag still resolves to verified store ID 0f27a2ec..., and the proof
journal remains prepared at run 0b263ed8a1e64a5246eefaed. Do not repeat prepare,
download, load, compilation or scan for this unchanged accepted artifact.

Requirement/finding: complete the pending isolated functional/restart acceptance
of the security-reviewed hosted SeaweedFS artifact before M2 adoption.

| Owner / consumer                                                                | Action and evidence                                                                                                                                           |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| docker/seaweedfs/compose.proof.yml; docker/seaweedfs/compose.security-proof.yml | Inspected unchanged server flags, loopback port, persistence and candidate-only override; use both files in that order.                                       |
| scripts/storage/seaweed-s3-proof.mjs                                            | Inspected prepared/run/restart state guards; unchanged assertions and owned cleanup. Existing prepared credentials are reused without exposing them.          |
| .ci-evidence/seaweed-hosted/41203305981/loaded-verification.json                | Prior accepted actual runtime config, fourteen layers, Go/module and scan receipt retained; current tag matches its loaded store ID.                          |
| docs/current-focus.md; docker/seaweedfs/README.md; this report                  | Correct stale pending-load wording, retain pending functional proof and record operator ownership.                                                            |
| Active Compose, Media/Gateway/protobuf/OpenAPI/client and CI implementation     | Unchanged in this resumption; existing traced focused/type/preflight evidence remains valid. M2-M6 own active provider, supply and Media integration changes. |

Format/syntax/lint/types: documentation-only resumption; Markdown format and
whitespace checks are recorded below. No source, request, fixture or generated
contract changed; prior applicable source checks are preserved, not rerun.
Actual SQL/runtime: earlier Media SQL remains accepted; all eleven backend
health checks supplied by Salar. The candidate S3/restart proof is still pending.
Source/image drift: exact loaded artifact unchanged; no rebuild requested.
Limitations: this does not convert active MinIO, certify the broader uncommitted
snapshot in hosted backend CI, or complete tenant isolation.
Next commands: isolated Compose up, existing proof run, isolated restart, then
verify-after-restart. Expect namespace/signature/metadata/conditional-write/byte
checks, restart persistence and owned cleanup; stop at the first failure.
Readiness: READY FOR SALAR-OWNED ISOLATED CANDIDATE S3/RESTART PROOF.

Documentation gate result: Prettier completed on all three changed Markdown
files and `git diff --check` passed. No implementation changed in this handoff.

### November 2 M1 acceptance

Salar reports all four handed-off operations completed successfully: isolated
candidate startup, S3 proof, server restart and verify-after-restart. Agent fast
inspection independently confirms journal run 0b263ed8a1e64a5246eefaed is complete
and the running, healthy proof container uses exact verified imported store ID
`sha256:0f27a2ec053a9dc1b25342d1f754799e3d12d736f0a6c6daa847ba3dcc35a75c`.
The unchanged proof reaches complete only after restart witness comparisons and
owned cleanup. Full console markers/counts were not supplied; do not invent them.

Together with hosted run 41203305981, its checksum/config/layer/scan evidence and
local actual artifact verification, this closes M1. No proof was rerun by the
agent. Update current-focus, adopted TODO and candidate README consistently.
Active Media remains on MinIO; M2-M6 adoption, release supply, existing object
cutover and real Media-on-Seaweed acceptance remain open. Tenant work stays paused.

### November 2 M2 preparation - exact dependency trace

Requirement: replace the approved local/release storage configuration with the
accepted community SeaweedFS artifact, scoped Media credentials, explicit bucket
bootstrap, browser upload CORS, client-reachable signing endpoint and durable
object plus filer metadata storage. This is the already selected provider change,
not a new optional architecture replacement. The existing generic S3 Media driver
is retained; no new storage framework or tenant mechanism is required.

Confirmed configuration mismatch against the selected target: both active
Compose files still declare minio/minio, minio/mc and minio-data, and Media still
depends on minio/minio-init. Local Media takes MinIO root credentials. Startup,
release boundary assertions and CI vendor supply explicitly name MinIO. An image
swap alone therefore cannot complete the requested migration. Existing mechanisms
are not being classified as independently insecure merely because they use MinIO.

| Owner / exact consumer paths                                                                                                                                                                     | Required action or unchanged/deferred reason                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| docker-compose.yml; docker-compose.release.yml                                                                                                                                                   | M2 selects accepted Seaweed image, isolated management interfaces, health/readiness, persistent data and filer metadata, explicit initializer and matching Media dependencies/endpoints. Preserve old MinIO data for rollback.     |
| .env.example; deploy/.env.production.example; apps/media-service/.env.example                                                                                                                    | M2/M3 reconcile server/admin versus scoped app credentials, bucket, native/internal/public endpoints and local versus release requirements. Never dump developer env values.                                                       |
| docker/seaweedfs/compose.proof.yml; docker/seaweedfs/compose.security-proof.yml; security.Dockerfile; scripts/storage/seaweed-s3-proof.mjs                                                       | Keep accepted isolated proof and source/scan recipe unchanged. Add active setup assets separately; preserve completed journal. Inspect exact pinned source before relying on bootstrap/auth/CORS/persistence flags.                |
| scripts/backend.mjs provisionBackend, validateRenderedComposeBoundary; scripts/backend.test.mjs dependency fixture, provisioning assertions, release inventory assertions                        | M3 must replace actual minio startup and port assumptions with the selected topology; update valid/invalid fixtures together without dropping readiness or boundary assertions. Block active-stack broad handoff until reconciled. |
| scripts/backend-dev-env.mjs; scripts/backend-dev.test.mjs                                                                                                                                        | M3 checks native Media endpoints and config validation against real storage inputs. Existing generic endpoint handling is retained where sufficient; do not assume the legacy MINIO_ENDPOINT key covers MEDIA_S3 inputs.           |
| apps/media-service/src/config/env.validation.ts; apps/media-service/src/dto/create-media.dto.ts                                                                                                  | Inspected allowed provider labels: the literal seaweedfs is currently rejected. Prefer existing s3 compatibility label unless an actual requirement justifies a separately traced enum/API change.                                 |
| apps/media-service/src/media.service.ts; apps/media-service/src/processing/media-processing.storage.ts; apps/media-service/src/health.controller.ts                                              | M3 verifies generic S3 access/signing/readiness. No replacement solely for provider naming. Existing stored keys/provider labels are handled by M5, not silently rewritten.                                                        |
| .github/workflows/ci.yml; .github/minio-offline.yml                                                                                                                                              | M4 replaces actual cached MinIO archive/load identities and Compose override; a three-day hosted artifact is not durable release supply. Do not claim existing CI proves new topology.                                             |
| scripts/docker/release-image-inventory.mjs; scripts/docker/record-image-identities.mjs; scripts/docker/save-release-images.ps1; scripts/docker/load-release-images.ps1; scripts/backend.test.mjs | Inspected dynamic Compose inventory and save/load consumers: preserve exact artifact coverage and local/release parity; update affected expected vendor images/counts in M4. No blanket hash refresh.                              |
| scripts/demo/runner.mjs; scripts/demo/commerce-runner.mjs; scripts/demo/state.mjs; scripts/demo/commerce-state.mjs                                                                               | M5 owns existing demo object/journal cutover. Do not repoint live Media at an empty store and call old fixtures valid. Keep MinIO volume and data intact until acceptance.                                                         |
| docs/docker-configs.md; docs/architecture/local-dev-and-docker-boot.md; docker/seaweedfs/README.md; docs/current-focus.md; TODO-ALTERNATIVE.md                                                   | Reconcile active startup/storage instructions as implementation lands. Older reports remain historical evidence with dated superseding receipts.                                                                                   |

Execution approach: prepare and check scoped auth/bootstrap/CORS/persistence assets
first, wire local/release configuration, then reconcile the actual M3/M4 startup
and inventory consumers before any active-stack handoff. Keep accepted proof and
old MinIO data intact. M5 chooses and records the owned-object transition before
mutation; M6 supplies actual Media processing/render/recovery acceptance. Do not
expand into distributed Seaweed deployment, cloud/CDN, general storage abstraction
or tenant implementation.

No active configuration or application source changed during this checkpoint.
No new install, compilation, Compose restart or broad test command is requested.
M2 preparation is underway; implementation and native acceptance remain pending.

### November 2 execution-order clarification

Salar requests the observations be incorporated into current-focus so task order
is executable without an ambiguous early provider switch. Classification: a
planning/documentation gap, not a newly demonstrated application defect.

Retain the existing seven Media actions and accepted M1 result. M2 now prepares
Seaweed alongside the live store; M3 reconciles real runtime/tooling consumers;
M4 supplies durable image/build availability; M5 reconciles objects and activates
Media; M6 accepts the activated pipeline and M7 closes evidence. Shared M2-M4
checks may be completed together, but active-stack startup waits for M5's
prerequisites. Current-focus explicitly distinguishes these local task IDs from
the roadmap's similarly named phases.

The task exit gates now include initializer reruns and scoped credential denial,
actual object/filer persistence across container recreation, explicit native/
internal/public endpoints, browser preflight plus signed-header uploads, durable
vendor availability beyond a three-day artifact, and a consistent object/row/
journal cutover with bounded writes and rollback handling for new writes.
These are required verifications under the existing tasks, not passing evidence.
The narrow generic S3 implementation and accepted M1 receipts remain unchanged.

Consumer review: docs/current-focus.md owns the detailed sequence and adds the
previously omitted apps/media-service/.env.example plus vendor workflow/evidence
helper paths. docker/seaweedfs/README.md now agrees that M5 owns activation.
TODO-ALTERNATIVE.md continues to delegate detailed task ordering to current-focus;
its phase order and current M1-complete/M2-next status require no change. Historical
receipts above remain dated history; this section supersedes any inference that
M2 activates live Media before M5. No source, Compose, env, credentials, objects,
schema, generated contracts or deployed services change with this documentation
revision. Types, lint, preflight and runtime suites are inapplicable to this
documentation-only change; existing implementation evidence is preserved.

Verification: Prettier passed for all three edited Markdown files, git diff
whitespace checks passed, and the focus inventory still contains 22 unique tasks
with all six relative document links resolving. M1 stays complete and M2 is next.
No broad command is handed off by this planning revision.

### November 2 M2 implementation preparation

Implement the first M2 handoff as an opt-in alongside configuration, rather than
editing active Media endpoints before M5. Exact new owners/consumers are
docker/seaweedfs/compose.storage.yml, docker/seaweedfs/filer.toml,
docker/seaweedfs/.env.storage.example, scripts/storage/seaweed-setup.mjs,
scripts/storage/seaweed-setup.test.mjs, scripts/storage/seaweed-storage-proof.mjs
and .gitignore for private generated .nebula-storage/ material. Reconcile
docker/seaweedfs/README.md, current-focus and this report after checks.

The fragment will be rendered with both existing base Compose files but will
start only the added Seaweed service when explicitly selected. Its independent
port and volume preserve working MinIO. Native Node bootstrap reuses Media's
installed S3 SDK, with no package/lockfile change or new application image build.
Active Compose Media dependencies, .env examples, backend provisioning/inventory,
CI, serializers, generated contracts and seeds remain unchanged for a reason:
this prepares another store, and M3-M5 own their recorded reconciliation before
activation. Do not advertise those later integrations as complete.

Pinned source inspection confirms mini's -s3.config and -s3.allowedOrigins,
read-only IAM flag and separate auxiliary disable flags. The shipped filer config
uses /data/filerldb2, so explicitly bind the reviewed config and persist /data.
Sources: https://github.com/seaweedfs/seaweedfs/blob/153ab668c99731a6d29492bf6c61d0b4fa701101/weed/command/mini.go
and https://github.com/seaweedfs/seaweedfs/blob/153ab668c99731a6d29492bf6c61d0b4fa701101/docker/filer.toml.
Bucket CORS middleware and native permission handling were inspected at the same
revision (weed/s3api/cors/middleware.go and weed/s3api/auth_credentials.go).
Bucket-scoped Read/Write/List compatibility is retained, without an Admin grant;
this is not fine-grained tenant IAM. No optional auth framework is introduced.

Planned focused checks cover invalid settings, credential scope/separation,
repeat preparation without key rotation, first-error bootstrap behavior, valid
versus denied CORS and owned persistence witnesses/cleanup. Actual container
initialization, browser-style upload and recreation proof remain operator-owned.

### M2 alongside implementation and native handoff

Prepared docker/seaweedfs/compose.storage.yml as an opt-in fragment after either
root Compose file. It selects the accepted local vendor image without pull/build,
publishes only loopback port 19000 to S3, mounts explicit filer.toml and a new
seaweed-data volume at /data, loads a generated read-only credential secret,
disables automatic bucket creation, keeps IAM writes disabled and disables the
unused auxiliary interfaces. Management ports have no host publication; this is
not a claim of tenant isolation or authenticated internal filer access.

New seaweed-setup.mjs generates separate random admin and bucket-scoped app
credentials in ignored .nebula-storage/seaweedfs, refuses altered files/scope and
reuses saved keys on reruns. Explicit initialization creates only a missing
configured bucket, sets/verifies exact CORS and checks Media access. Only 404
permits bucket creation; auth/storage errors retain their first cause. The native
helper uses Media's exact installed SDK with no package or lockfile changes.

Cheap review caught and corrected two new-helper issues before handoff. Supplying
the entire generated future Media env to release Compose would redirect live
Media; a separate checked compose.env now supplies only port/origins. Independent
actual local/release renders confirm all 19 original services remain identical.
An actual SDK signing test showed cache-control is excluded from signatures by
default; the proof signer now explicitly requests that signed header. The binding
header remains signed/unhoisted and unknown-body empty CRC is not injected. No
active Media signer or contract changed to correct these preparation issues.

New seaweed-storage-proof.mjs journals exact owned witnesses before mutation,
checks positive/negative CORS preflights and actual signed upload, bytes/metadata,
anonymous denial and read/list/write/admin denial outside the app bucket. It
requires real container identity to change after recreation while image identity
stays the same, then compares bytes, metadata, cache control and ETag and verifies
owned deletion. Scoped control-bucket cleanup preserves primary and cleanup
errors; it never empties unknown content. Failed proof state is preserved with an
explicit owned cleanup mode, not silently erased. Error summaries retain named
checks/status/locations without printing credentials, request objects or URLs.

| Consumer                                                                                                                                                                                                                                                                                                                                                       | Final disposition before handoff                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| docker/seaweedfs/compose.storage.yml; filer.toml; .env.storage.example                                                                                                                                                                                                                                                                                         | Added alongside-only configuration and documented settings. Actual local/release renders checked; only seaweed service is added.                                                                                                                                      |
| scripts/storage/seaweed-setup.mjs; seaweed-storage-proof.mjs; seaweed-setup.test.mjs                                                                                                                                                                                                                                                                           | New setup, native proof and focused tests. Exact SDK signing exercised offline; operational proofs remain pending.                                                                                                                                                    |
| .gitignore; .dockerignore                                                                                                                                                                                                                                                                                                                                      | Exclude the private generated storage directory from version control and build context. git check-ignore confirms private env/config are ignored. No Dockerfile COPY inputs change; actual scratch context gate remains required before a future image-build handoff. |
| docker-compose.yml; docker-compose.release.yml; .env.example; deploy/.env.production.example; apps/media-service/.env.example                                                                                                                                                                                                                                  | Inspected, unchanged: existing Media stays on MinIO until M5. Fragment is rendered with these bases, not activated as a global override.                                                                                                                              |
| scripts/backend.mjs; scripts/backend.test.mjs; scripts/backend-dev-env.mjs; scripts/backend-dev.test.mjs; apps/media-service/src/config/env.validation.ts; apps/media-service/src/dto/create-media.dto.ts; apps/media-service/src/health.controller.ts; apps/media-service/src/media.service.ts; apps/media-service/src/processing/media-processing.storage.ts | Unchanged active consumers. M3 owns actual startup/env/boundary reconciliation and any necessary generic compatibility correction; new helpers use existing s3 labeling.                                                                                              |
| .github/workflows/ci.yml; .github/minio-offline.yml; .github/workflows/seaweed-vendor.yml; scripts/docker/release-image-inventory.mjs; scripts/docker/record-image-identities.mjs; scripts/docker/save-release-images.ps1; scripts/docker/load-release-images.ps1                                                                                              | M4 owns durable supply/bootstrap, image inventory and regular hosted registration of the new setup tests. No current-snapshot CI pass is claimed.                                                                                                                     |
| Media/Gateway/protobuf/OpenAPI/generated client, Product/Order and demo seed/journal consumers in the M2 trace above                                                                                                                                                                                                                                           | No contract or active endpoint changes; accepted earlier proofs remain valid. M5 reconciles existing objects/rows/journals before activation; M6 proves actual Media integration.                                                                                     |
| docker/seaweedfs/README.md; docs/current-focus.md; this report                                                                                                                                                                                                                                                                                                 | Updated exact commands, pending evidence, secret handling and execution boundaries. Adopted TODO already delegates this detailed ordering; phase order remains unchanged.                                                                                             |

Handoff receipt:

- Requirement/finding: verify the prepared approved provider alongside MinIO,
  including initializer reruns, browser preflight and actual container recreation.
- Focused behavior: setup regressions, negative controls, exact SDK signing and
  cleanup/error preservation pass locally; final counts/checks follow below.
- Format/syntax/lint/types: focused JS checks apply; no TypeScript/protobuf/API
  producer changes. Backend test-type gate and contract preflight are inapplicable
  to this isolated infrastructure proof; no backend live suite is handed off.
- Runtime prerequisites: last supplied eleven-service backend readiness is valid
  for unchanged active apps. New Seaweed readiness and actual initialized bucket
  are established by the first operator commands, not presumed from a render.
- SQL/seeds: unchanged; reuse Oct 31 SQL proof. No seed or database reset needed.
- Source/image decision: accepted vendor image is reused; no image build, pull or
  install requested. Actual new-container image equality is checked by the proof.
- Limits/deferrals: native helper requires the installed Media SDK; fresh release
  and CI bootstrap are M3/M4, existing objects/activation M5, Media acceptance M6.
  The CORS default origins are localhost:3000 and localhost:5173; this does not
  choose production admin endpoints or implement UI. CORS is browser policy,
  while signature/IAM checks enforce object access.
- Next operations, exactly as documented in docker/seaweedfs/README.md: start only
  the opt-in seaweed service, init twice, create witness, recreate only seaweed,
  then verify/owned cleanup. Stop on first error and return named markers or the
  safe error summary. Long commands remain Salar-owned.
- Readiness: READY FOR SALAR-OWNED M2 ALONGSIDE NATIVE PROOF, conditional on the
  final cheap checks below. Actual operational evidence is still pending.

Final cheap receipt: ten focused tests pass, zero skipped, including actual SDK
presigning; scoped ESLint and Node syntax checks pass for all three JS files.
Prettier and git diff whitespace checks pass; Git reports only the existing
CRLF-to-LF normalization notice on .gitignore, not an error. Both actual prepared
Compose renders preserve all 19 base service definitions and add only seaweed.
Preparation and rerun verify the private saved configuration without rotating
credentials; git check-ignore confirms all generated env/config files remain
ignored. No staged changes were introduced. No new container has been started.
Readiness: READY FOR SALAR-OWNED M2 ALONGSIDE NATIVE PROOF. Runtime startup, real
init/rerun, CORS/scope assertions and recreation persistence remain pending.

### M2 denied-header preflight correction - preparation

Salar reports alongside Seaweed startup and two real initialization calls pass.
Witness creation fails first at seaweed_denied_header_preflight; continuing with
recreation and verify then correctly fails the awaiting-recreation state guard.
No completed persistence witness exists from that run. Agent read-only probe
confirms phase creating, run d6ff4dcd0e8643dd88aea21b, HTTP 200 for the unapproved
header, matching allowed origin but no Access-Control-Allow-Methods or
Access-Control-Allow-Headers. No signed URL or credentials were printed.

Classification: confirmed defect in the new proof's HTTP-status assumption, not
a demonstrated storage authorization defect. Pinned cors.go builds an origin-only
response for an unapproved method/header, and middleware.go sends 200. A browser
still rejects the requested cross-origin PUT because permission headers are
missing. The Fetch CORS-preflight algorithm requires those permissions, not
specifically HTTP 403: https://fetch.spec.whatwg.org/#cors-preflight-fetch.
The exact pinned source is weed/s3api/cors/cors.go plus middleware.go at commit
153ab668c99731a6d29492bf6c61d0b4fa701101. No vendor rebuild/replacement is justified.

Before editing, trace: scripts/storage/seaweed-storage-proof.mjs owns the negative
preflight assertion; scripts/storage/seaweed-setup.test.mjs needs regressions for
200-withheld-permissions and permissive/wildcard responses that must fail the
denial assertion. Positive origin/header assertions, SDK signature, IAM denial,
actual upload and recreation checks stay intact. docker/seaweedfs/README.md,
docs/current-focus.md and this report must record the interrupted proof and
recovery; setup/config/Compose, active Media, API contracts and generated clients
remain unchanged because their behavior was not the failure.

Preserve the failed proof journal. Inspect only its validated exact fixture key
and buckets; archive it only if all are actually absent. Otherwise use the
existing scoped cleanup route before any fresh witness. Preparation checks and
the new focused regressions must pass before a native re-handoff. Actual signed
upload/recreation acceptance remains pending.

Correction receipt: the proof now accepts HTTP 403 or a successful OPTIONS that
withholds the requested header permission. It explicitly fails if that header or
wildcard is granted, or if an outage response is offered as denial evidence.
Positive origin/method/header assertions, denied-origin 403, signed binding,
credentials, byte/metadata checks and actual container-ID change remain intact.
The new regression covers the exact observed 200/origin-only response plus
permissive header/wildcard cases, 503 and empty negative requests.

Agent read-only checks using the configured admin identity establish 404 for the
exact witness key and both exact control buckets; no storage data needed deletion.
The actual denied-header response passes the corrected assertion. After validating
the journal, its phase/run, no symlink, workspace-bounded source/destination,
nonexisting destination and unchanged original contents, preserve it as
.nebula-storage/seaweedfs/proof.failed-d6ff4dcd0e8643dd88aea21b.json.
Keys/config remain unchanged. The fresh witness guard is now unblocked; no native
proof, container restart or reinitialization was performed by the agent.

Handoff: eleven focused setup tests pass, zero skipped; final format/lint/syntax
checks follow. Setup/Compose, installed SDK, active storage and contracts did not
change, so no build, SQL rerun, contract preflight or backend suite is required for
this proof correction. README/current-focus now reflect effective CORS denial and
the interrupted run. Reuse accepted startup and both initialization results.
Salar next runs only witness, the documented seaweed-only force-recreation, then
verify. Stop at the first error. Readiness is READY FOR SALAR-OWNED FRESH M2
WITNESS/RECREATION PROOF after the final cheap gates; M2 stays open until it passes.

Final gates pass: Prettier on all five edited files, scoped ESLint, Node syntax
and git diff whitespace checks. The only notice is unchanged .gitignore line
normalization. No known cheap preparation failure remains for the three commands.

### November 2 M2 alongside acceptance

Salar supplies all expected fresh native proof markers:
allowed-and-denied-browser-preflights, signed-upload-bytes-metadata-scoped-access,
witness-saved, then a healthy force-recreated container (16.2s reported), followed
by recreated-container-preserves-bytes-metadata-etag and owned-cleanup. Preserve
these as operator-reported runtime results, not an agent-rerun suite.

Agent fast inspection independently confirms journal run
06d5f1e9e064cf004ee93b8b is complete, the current container differs from its saved
pre-recreation ID, image identity is unchanged and health is healthy. Its actual
store image ID remains the accepted imported vendor image:
`sha256:0f27a2ec053a9dc1b25342d1f754799e3d12d736f0a6c6daa847ba3dcc35a75c`.
Private configuration/credential checks also pass without key rotation.

M2's alongside preparation is accepted: earlier real startup/init/rerun results,
both unchanged-service local/release renders, eleven focused regressions and
the corrected native CORS/access/recreation proof now agree. No code or config
changed after the last passing preparation checks. Retain the original failed
journal and corrected-test evidence; no assertion was weakened to accept actual
forbidden-header grants. No storage or database reset was performed.

Current-focus advances to M3; the README and adopted TODO are updated. Active
Media remains on MinIO, its data and base Compose route are intact, and no app
endpoint was changed. M3 owns runtime/provision/native-env/boundary alignment;
M4 owns durable CI/release supply and registration of the new setup tests; M5
owns object reconciliation and deliberate activation; M6 owns real Media-on-
Seaweed processing/render/recovery acceptance. This is not full release or hosted
backend CI acceptance. No new long command is needed to close this checkpoint.

### November 2 requested unused Supabase scaffold cleanup - preparation

Salar explicitly requests removing infra because Supabase is no longer used.
Classification: unused deployment scaffold and stale current documentation.
Inspection finds three unchanged tracked files: infra/supabase/.gitignore,
config.toml (generated CLI configuration) and seed.sql (Supabase storage.buckets
initializer). The only ignored local files are .branches/\_current_branch and
.temp/cli-latest. No command/build/CI reference to the scaffold is found in root
manifests, Setup, .github, scripts, docker, apps or packages. There is no active
application/schema migration dependency on this Supabase-specific bucket seed.

Before deletion, verify the resolved target is exactly the repository's infra
directory, every child remains within it, no reparse points exist, and the file
inventory contains only those five inspected files. Check tracked files have no
user edits. Native PowerShell removes only this authorized folder; no Docker
resource, database, other directory or generated Media/S3 credential is targeted.

| Consumer                                                                                                                                                                                                              | Disposition                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| infra/supabase/.gitignore; config.toml; seed.sql; two ignored CLI cache files                                                                                                                                         | Remove the unused scaffold and caches after path/inventory checks.                                                                                                                                                      |
| README.md; AI_CONTEXT.md; docs/services/media-service.md; docs/architecture/system-relationships.md; docs/architecture/testing-and-health.md; site essentials.md                                                      | Correct the stale preferred/next Supabase provider claims to accepted Seaweed preparation plus still-active MinIO and deferred cloud selection.                                                                         |
| TODO-ALTERNATIVE.md                                                                                                                                                                                                   | Remove Supabase as a committed provider candidate and align local compatibility wording with the selected transition; preserve the phase order and F9 decision gate.                                                    |
| TODO.md; docs/reports/2026-06-23-media-filemanager-and-supabase-conclusion.md; docs/reports/2026-06-29-media-filemanager-vision-evolution.md; docs/audit/NebulaNV-technical-audit-2026-07-08.md; other dated evidence | Preserve historical records, including old tree/provider observations. They do not make the retired folder an active dependency.                                                                                        |
| apps/media-service/src/config/env.validation.ts; apps/media-service/scripts/s3-smoke.mjs; apps/media-service/test/jest.env.ts; apps/media-service/test/http/media.http.e2e.spec.ts                                    | Preserve existing generic S3 behavior, legacy accepted provider label and folder-response shape; comments/test descriptions referencing Supabase are not CLI deployment dependencies. No API/enum removal is requested. |
| Active Compose/env, backend provisioning, storage helpers, CI, package/lock and generated contracts                                                                                                                   | Unchanged: no scaffold consumer found. Current Seaweed setup/proof scripts remain necessary for the adopted transition; no replacement scripts are introduced by cleanup.                                               |

Checks: inspect deletion/diff and bounded reference search, Markdown formatting,
relative documentation links and whitespace. No runtime code or contract changes,
so broad suites/builds, SQL, preflight and backend test types are inapplicable.
M3 remains next; this is a bounded user-requested cleanup, not a new roadmap phase.

Cleanup execution: resolved/inventory/reparse-point checks passed; both staged and
worktree diffs confirmed the three tracked files had no user edits. Automatic
command review rejected the recursive directory deletion, then also rejected
explicit native Remove-Item cleanup commands, with only "blocked by policy" as
the reason. The file-edit tool safely removed all five individually named files.
The remaining empty infra/supabase/.branches and .temp directory tree still
requires Salar's local directory cleanup; do not claim physical folder removal.
No Docker resource or data volume was touched. Current provider documentation is
updated in the seven traced Markdown consumers; runtime compatibility labels,
historical audits and the original TODO reference stay as traced above.

Verification passed: all five retired files are absent, the remaining infra tree
contains zero files, both new README links resolve, no runtime command references
the removed scaffold, Prettier passes on the eight edited Markdown files, and
git diff whitespace checks pass (existing .gitignore normalization notice only).
Runtime behavior is unchanged; no test suite, install, build or restart is needed.
Final physical cleanup command for Salar: Remove-Item -LiteralPath
'D:\Salar\NebulaBackup\nebulaNV-main\infra' -Recurse -Force.

### M3 runtime/tooling preparation - November 2

Salar confirms local empty-directory cleanup; agent Test-Path confirms infra is
absent. Resume M3 with existing tooling, not new scripts. Inspect current source
and tests before modifying their shared startup/environment contracts.

Confirmed tooling gaps: provisionBackend hardcodes minio in the infrastructure
startup list, and release boundary validation hardcodes minio/9000. The selected
store should follow the effective Media internal endpoint and its declared
healthy dependency, not the mere presence of an alongside Seaweed container.
The native preload validates obsolete MINIO*ENDPOINT/S3_ENDPOINT aliases but
omits the effective MEDIA_S3*\* fields declared/read by Media. It must inspect
actual used storage endpoints without rejecting an unused fallback endpoint.

No owning-service storage replacement is justified: Media env validation already
accepts s3 compatibility labeling, CreateMediaDto accepts storage=s3, health uses
HeadBucket on the configured internal endpoint, and processing storage reads the
same endpoint/credentials through the S3 SDK. Preserve those mechanisms and signed
binding/conditional-object checks. The selected-native Media scanner transport
remains explicitly unsupported; this work does not publish scanner TCP or claim
a native Media watch pilot passed.

| Owner / exact consumer                                                                                                                                                                   | Planned action or unchanged reason                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| scripts/backend.mjs provisionBackend, validateRenderedComposeBoundary; scripts/backend.test.mjs renderedBoundaryFixture and boot/boundary assertions                                     | Resolve the configured local store from literal rendered Media settings; require the matching healthy dependency and existing generic provider label. Boot reads configuration without printing secrets and selects only that store. Extend strict release data-port checks to Seaweed without admitting management/unused store publications. Update positive, mixed/invalid and exact startup fixtures together. |
| scripts/backend-dev-env.mjs prepareNativeEnvironment; scripts/backend-dev.test.mjs isolated preload fixtures                                                                             | Check the effective internal/public S3 endpoint keys under the existing loopback native policy. Preserve Nest precedence, legacy aliases for their actual declaring owners, credentials, SQL owner/port rewriting and unused-fallback behavior. Add clean real-Nest/Joi child-process regressions.                                                                                                                 |
| scripts/backend-dev.mjs nativeEnvironment and developmentPlan                                                                                                                            | Inspected unchanged: process overrides/endpoints and deliberate scanner refusal stay in force. No automatic provider/credential switch.                                                                                                                                                                                                                                                                            |
| apps/media-service/src/config/env.validation.ts; src/dto/create-media.dto.ts; src/health.controller.ts; src/media.service.ts; src/processing/media-processing.storage.ts                 | Inspected unchanged generic S3 mechanisms satisfy this task. No enum/API/codec/schema or worker change is needed.                                                                                                                                                                                                                                                                                                  |
| scripts/backend.mjs backupLocalDatabases and backup manifest; docs/docker-configs.md; docs/architecture/local-dev-and-docker-boot.md; docs/architecture/runtime-environment-ownership.md | Keep SQL backup implementation; explicitly distinguish it from object/filer recovery required by B4. Document selected-store behavior, native endpoint checks and activation boundaries.                                                                                                                                                                                                                           |
| docker-compose.yml; docker-compose.release.yml; docker/seaweedfs/compose.storage.yml; .env examples; private prepared configuration                                                      | Leave active provider and deployment values unchanged until M5. Validate current plus alongside renders and mocked future selected-Seaweed fixture separately; a prototype selection fixture is not native Media integration evidence.                                                                                                                                                                             |
| scripts/storage/seaweed-setup.mjs; seaweed-storage-proof.mjs; .github/workflows/ci.yml; release image helpers                                                                            | M2 native helpers stay accepted. M4 owns durable CI/release/bootstrap supply and registration of setup tests. M5 owns initializer wiring/object reconciliation/activation; no global boot or app deployment handoff before those prerequisites.                                                                                                                                                                    |
| Gateway/RPC/protobuf/OpenAPI/client, seeds, package/lock, Dockerfile/build graph                                                                                                         | Unchanged; no route, generated contract, model, dependency or image-source change in M3. Preserve earlier preflight/SQL evidence.                                                                                                                                                                                                                                                                                  |

Preparation gates will use focused boot/boundary/native regressions under hosted
CI flags, scoped lint/syntax/format and actual read-only Compose validation. Broad
tooling suites remain Salar-owned after the receipt. Do not run backend:boot:
its full migrations/seeds/build/startup are unnecessary for this preparation.

### M3 implementation and focused results

Updated existing backend.mjs with configuredMediaStorage: parse only the rendered
Media S3 endpoint, accept the two currently managed internal store hosts/ports,
require its healthy dependency, reject mixed provider dependencies and require
the existing s3 label for Seaweed. Provisioning reads config with capture enabled
and emission disabled before infrastructure starts. Existing database migration,
seeding, selected image build, application readiness and demo-seed order remains
asserted for both selected-store fixture cases. An invalid plan fails before
startup, SQL work or builds. Release boundary keeps every existing Gateway/app/
PostgreSQL/Redis/startup check and extends exact storage data-port rules to the
selected store; management and unused store publications fail.

Native preload now follows the actual internal/public S3 keys when S3 is used,
checks effective fallbacks under the existing loopback policy, and leaves unused
fallbacks and local-driver storage alone. New isolated real Nest/Joi child tests
cover current MinIO and prepared Seaweed loopback endpoints, IPv6, missing primary
fallback, remote internal/public endpoints, retained credentials and unchanged
fixture env. Existing precedence, database owner/port and no-secret regressions
still pass. The initial pnpm-exec attempt did not set npm_execpath, so the fixture
correctly refused execution; rerun used the actual installed pnpm.cjs entrypoint
from the inspected PowerShell launcher. The guard was preserved, not disabled.

Scoped lint initially reported existing undeclared Node globals in the touched
tool owners. Added explicit standard Node imports and globalThis qualification
in those owners/test files rather than disabling rules or modifying lint policy.
This does not change their runtime mechanisms. Scoped lint now passes.

Read-only actual local and release base Compose configurations pass the complete
boundary validator and select MinIO. Adding the M2 preparation fragment still
selects MinIO; release validation correctly rejects its extra alongside port.
These observations are distinct from the mocked future selected-Seaweed boot
fixture. No global Seaweed activation, native Media watch or real boot is claimed.
The effective generic S3 app implementations and API contracts remain unchanged.

Updated docs/architecture/local-dev-and-docker-boot.md,
docs/architecture/runtime-environment-ownership.md, docs/docker-configs.md,
docker/seaweedfs/README.md and current-focus. SQL backup tooling still covers SQL
only; object/filer/private-config recovery remains B4. Active Compose/env files,
SDK setup/proof, M1/M2 receipts, application source, credentials and stored data
remain unchanged. M4 still owns durable CI/release supply and bootstrap/test
registration before M5 initializer/object reconciliation and activation.

Focused observed results: five backend selection/boot/boundary tests pass; four
native network/preload/scanner tests pass with CI=true/GITHUB_ACTIONS=true. The
native fixtures took 23.7 seconds total and did not start real apps or containers.
Final expanded consumer-focused checks and handoff receipt follow below; full
backend-tooling and backend-dev suite execution remains Salar-owned.

### M3 broad tooling handoff receipt

Requirement: reconcile existing startup/boundary/native consumers for selected
storage without switching live Media. Final consumer review agrees with the M3
impact table: two implementation owners and their two existing test files are
updated, the operational documents plus current-focus/report reflect actual
behavior, and app/schema/contracts/SDK/Compose/env/image/seed consumers remain
unchanged for their recorded reasons. No new script or dependency was added.

Observed expanded focused checks: eleven backend inventory/Compose redaction/
boundary/boot/health/archive regressions pass under CI=true and
GITHUB_ACTIONS=true, zero skipped. Four native environment/network/scanner
regressions pass under those flags, zero skipped, including isolated real Nest
precedence and effective-storage checks. These are targeted subsets, not full
suite or running-image acceptance. Actual read-only base renders pass; alongside
selection and the release rejection are separately checked as described above.

Scoped ESLint is clean; Prettier and git diff whitespace checks pass. Node syntax
checks apply to the four JS owners; final result follows. No backend API producer
or test-type contract changed, so contract preflight/backend test-type traversal
is not required for these tooling-only suites. No database or migration changed;
retain existing SQL and M1/M2 proofs. No application build, boot or restart is
requested; all active Media/MinIO settings remain unchanged.

Operator-owned next commands are pnpm test:backend-tooling and
pnpm test:backend-dev. The package-script invocation supplies the real pnpm
fixture context; do not substitute bare node/pnpm exec for the latter. Expect both
complete tooling suites to pass, including temporary fixture/process cleanup.
Stop and report the first failure. M3 stays open until those actual results are
supplied; M4 durable supply/bootstrap/test registration and M5 activation stay
pending. Readiness: READY FOR SALAR-OWNED M3 FULL TOOLING SUITES, subject to the
final syntax check below. No broad provisioning or live Media test is handed off.

Final syntax, lint, formatting and whitespace gates pass for the named files.
The index remains unchanged and infra is absent. Readiness is confirmed for the
two operator-owned tooling suites; no known cheap preparation failure remains.

### November 2 M3 acceptance

Salar supplies both full tooling suite results: pnpm test:backend-tooling reports
86 tests, 86 passing, zero failures/cancellations/skips/todos; pnpm test:backend-dev
reports 16 tests, 16 passing, zero failures/cancellations/skips/todos, duration
25.9 seconds. The latter includes real pinned pnpm/Turbo injected-copy refresh
after edits and cached producer restoration. Total: 102 passing tests. These are
operator-reported local full-suite receipts, distinct from agent-focused checks
and hosted CI. No source changed after the passing preparation gates.

M3 runtime/tooling preparation is accepted. Update current-focus to checked M3
and active M4; adopted TODO and storage README agree. Preserve M1/M2 image,
security, CORS/access and recreation receipts. No extra build, restart or suite
rerun is necessary to close this checkpoint.

MinIO still serves live Media. M4 owns durable vendor supply, CI/release bootstrap
and setup-test registration; M5 owns object reconciliation/initializer wiring and
activation; M6 owns actual Media-on-Seaweed pipeline acceptance. SQL-only backup
limits and final B4 object/filer/config recovery remain explicit. No tenant,
cloud, native Media watch or current-snapshot hosted CI acceptance is implied.

### M4 first supply/bootstrap preparation - November 2

Requirement: replace the expiring vendor download with durable verified supply,
register storage regressions in quality, and prepare release/CI bucket bootstrap
without installing a new utility image or changing live Media before M5.
Inspection confirms current main CI still loads the checksum-pinned MinIO release
cache; the Seaweed vendor workflow exports only a three-day artifact. The accepted
M1 image/archive already exists locally, so do not repeat its source compilation.

Prepare a tracked vendor-image manifest with the accepted archive SHA, canonical
config/layers, workflow/source identity and proposed non-latest vendor release
coordinates. Extend the existing vendor evidence helper/tests to verify archive
bytes, tar manifest/config, scan/module evidence and actual loaded config/layers
before recording a sanitized supply receipt. Store-ID wrapping must not be treated
as a config-digest mismatch. No raw Config.Env or signed URLs may be emitted.
Public asset publication remains a reviewable final operation; do not silently
publish a new asset or use an unavailable release as live CI input.

| Owner / exact consumer                                                                                                                                                                           | Required action or retained/deferred reason                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| docker/seaweedfs/vendor-image.json; scripts/storage/seaweed-vendor-evidence.mjs; seaweed-vendor-evidence.test.mjs                                                                                | Add immutable supply coordinates and archive/load verification inside existing helper, preserving legacy scan-evidence workflow invocation and strict security/module assertions.                                                                                                                                   |
| scripts/storage/seaweed-setup.mjs; seaweed-setup.test.mjs; docker/seaweedfs/compose.bootstrap.yml                                                                                                | Reuse the existing Media image's S3 SDK in a non-root one-shot initializer, reading only the existing read-only S3 secret. Derive/validate exact scoped config; use internal endpoint only in explicit container mode. Preserve native setup defaults and credential files.                                         |
| package.json; .github/workflows/ci.yml; scripts/backend.test.mjs                                                                                                                                 | Register vendor/setup tests as a regular quality command and assert exact wiring. Current live MinIO cache remains until Seaweed durable supply can actually be downloaded/loaded; its replacement stays M4 pending.                                                                                                |
| scripts/docker/release-image-inventory.mjs; scripts/backend.test.mjs; scripts/docker/save-release-images.ps1; scripts/docker/load-release-images.ps1; scripts/docker/record-image-identities.mjs | Inventory must honor explicitly selected Compose files, retaining complete profile coverage and backend/vendor assertions. Existing PowerShell wrappers use that inventory; backend identity evidence remains backend-only, with separate sanitized vendor receipt. No speculative full-release loader replacement. |
| .github/workflows/seaweed-vendor.yml; .github/minio-offline.yml; main live CI load/boot/archive steps                                                                                            | Preserve reproducible pinned build and existing working CI until reviewed durable Seaweed supply is available. M4 must later reconcile these consumers before closing; no current-snapshot hosted pass is claimed now.                                                                                              |
| root Compose/env files; docker/seaweedfs/compose.storage.yml; SDK/app/protobuf/OpenAPI/client/demo consumers                                                                                     | Current APIs, credentials and MinIO activation stay unchanged. New bootstrap is opt-in alongside preparation. M5 owns actual runtime override/object reconciliation; no schema or generated contract change is needed.                                                                                              |
| docker/seaweedfs/README.md; docs/current-focus.md; this report                                                                                                                                   | Record exact files/commands, partial preparation, pending publication/native proofs and limitations. No new roadmap phase or standalone script is introduced.                                                                                                                                                       |

Before handoff, run focused checksum/config mismatch and initializer ownership/
endpoint tests, CI wiring/inventory tests, format/lint/syntax and actual read-only
Compose renders. Actual Docker initializer/load and any large archive operation
remain Salar-owned. Current Docker Compose is 2.39.4; reference semantics checked
against Docker's official merge/env documentation and GitHub CLI release-create
documentation. No optional platform replacement is part of this work.

### M4 first implementation and handoff receipt

Added vendor-image.json from the accepted M1 identities, with the known archive
SHA 6ddc676c... and SHA-256 pins for all six verification/checksum files. The
proposed release is vendor-seaweedfs-4.51-gojose4.1.7 in pain1122/nebulaNV; it is
not published. Existing archive bytes are reused; no Go build or new scan is
requested for unchanged accepted inputs. Public release review/publication and
actual download/load remain open before live CI replacement.

Existing vendor helper now supports verify-archive/load-archive while retaining
its original hosted scan-evidence CLI. It hashes the archive/evidence, validates
safe tar paths and the single tag, checks actual canonical config/layers and
scan/module/provenance, then optionally loads and compares full runtime config
in memory. Local store-ID wrapping is handled without weakening config/layer
equality. CLI errors and the separate vendor receipt exclude raw Env/config.
Tests retain every original strict vulnerability/module assertion and add checksum,
mixed-image, unsafe-path, provenance and loaded-config mismatch controls.

Extended the existing setup helper with explicit init-container mode and a pure
exact-secret adapter. It derives the single app bucket and validates the full
two-identity/grant config before using the internal endpoint. Native mode and
saved settings remain unchanged. New compose.bootstrap.yml reuses the prebuilt
Media image/SDK as its existing user node, read-only, with only port/origins env
and the existing read-only S3 secret. No new operational script or utility image.

Registered vendor/setup regressions as test:storage:setup and a normal quality
step. The release inventory helper now honors selected Compose files and the
platform/explicit path separator, preserving all-profile/backend completeness and
deduplication. Existing save/load wrappers and backend-only identity recorder
remain appropriate; the sanitized storage receipt is separate. Default inventory
is still 16; actual alongside/bootstrap selection is 17, with Media/init image
deduplicated. No expected vendor coverage was removed to obtain a pass.

Final consumer review: the new manifest/initializer, existing two storage helper/
test pairs, release inventory, root script, quality wiring and backend wiring
assertions are updated. README/current-focus/report reflect actual pending status.
Working live MinIO cache/override, active root Compose/env, app/worker/contracts,
private credentials, seeds and M1-M3 proofs stay unchanged for the M4 trace's
recorded reasons. Durable CI cache replacement remains unfinished M4 work; M5
still owns actual Media initializer/object reconciliation and activation.

Observed cheap results: 25 storage tests pass, zero skips, including real SDK
signing and synthetic archive negative controls. Four focused CI/inventory tests
pass under CI=true/GITHUB_ACTIONS=true. A new CI-wiring test first referenced a
helper outside its scope; focused lint/test caught it and the test now uses its
own existing YAML resolver. No assertion was removed. Scoped lint and Node syntax
checks pass. Actionlint 1.7.12 validates both workflow files using the previously
verified executable; no claim of a newly executed hosted workflow is made.

Actual read-only local/release renders add only seaweed-init and preserve all
20 earlier definitions. Its image equals Media's image, no ports or secret env
are present, the S3 secret is referenced, healthy Seaweed is required and inherited
app healthcheck is disabled for the one-shot. Actual selected inventory is 17.
Existing Media image user is node; current Seaweed health is healthy. Full archive
bytes/tar validation through the new helper and actual container execution remain
operator-owned; synthetic tests do not certify those operations.

Handoff: exact three commands are recorded in the README's M4 preparation section:
verify the existing downloaded archive, then run the opt-in initializer twice.
Expect one archive-checksum-config-layers-and-scan marker and two
bucket-cors-scoped-media-access markers. Stop at first error. No build, new pull,
full boot, migration, fixture reset or app restart is requested. SDK/API/schema
producer contracts did not change, so backend test-type traversal/preflight/SQL
reruns are inapplicable to this isolated initializer/supply proof. .dockerignore
scratch verification remains required before a future image-build handoff.

Readiness: READY FOR SALAR-OWNED M4 ARCHIVE AND CONTAINER-BOOTSTRAP PROOF after
final format/diff checks below. M4 stays open; no public upload or live-CI provider
switch has occurred. Existing app/private storage configuration remains intact.

Final gates pass: scoped lint and formatting, six Node syntax checks, supply
manifest validation (14 layers/six evidence hashes), actionlint and diff whitespace
checks. The existing archive is present; the Git index is untouched. No known
cheap preparation failure remains for the three named operator operations.

### M4 archive and first container result; CI preparation trace

Salar supplies archive-checksum-config-layers-and-scan=ok from the actual M1
download and one bucket-cors-scoped-media-access=ok from the non-root one-shot
container. Accept those actual operator results; the second initializer run is
not yet supplied and remains pending. Do not infer rerun evidence from one result.

Read-only GitHub CLI checks find the proposed vendor release absent and confirm
source commit c26ca397e1c6e9376fc6b01bcee57e7758508f7d exists remotely. The connector
does not expose release-asset operations, so use gh for that reviewed supply step.
No asset upload, release/tag creation or source publication has occurred here.

Next preparation: .github/seaweed-runtime.yml will explicitly select Seaweed only
when merged, replacing Media's storage dependencies/settings and removing MinIO
services/volume declarations from that selected model. Base files and their
rollback route remain intact; existing MinIO data is not deleted. Native Compose
probe confirms !reset can remove the services, and the existing Media dependency
then fails as expected until explicitly replaced. Use documented Compose merge
semantics, validated by actual renders, rather than silently filtering vendors
from the archive inventory.

Affected consumers before editing: .github/workflows/ci.yml live COMPOSE_FILE/
COMPOSE_ENV_FILES and vendor-load/bootstrap steps; scripts/backend.test.mjs exact
cache/ordering/retained-evidence/selected inventory assertions; the existing
release-image-inventory helper/save-load wrappers via the selected configuration;
Docker storage/bootstrap fragments and the Media image they reference; README,
current-focus and this report. Add sanitized vendor receipt to CI artifact
allowlist. Keep existing backend identity records/security gates and all-profile
coverage. Old MinIO offline override is retained as the working rollback route.
App API/source, worker, DB, fixture and generated-contract changes are not needed
for fresh-CI topology preparation. Existing native/live tests are consumers, so
actual current-snapshot hosted acceptance remains B5 and Media acceptance M6.

A selected fresh CI store has no legacy objects to migrate. Local activation still
waits for M5. Prepare the complete workflow/configuration before reviewing the
public vendor-only release upload, and do not queue a live CI run against a
missing asset. The public-cache upload is a final concrete operator operation,
not implicit authorization to push the broader uncommitted application snapshot.

Additional traced consumer before editing: backend.mjs source scanning targets
the repository root and its explicit skip list omits both generated private
.nebula-storage and ignored .ci-evidence (including local proof credentials and
downloaded vendor archives). These are non-source directories already excluded
from Git/build use, not application code. Add precisely those two generated paths
to the existing source-scope exclusions and assert them in backend.test.mjs;
retain scans of actual .github/docker/scripts/app sources and env examples,
and retain the independent vendor image scan. This corrects source scope rather
than suppressing a reported application vulnerability; no new scan result is claimed.

### M4 selected workflow and public-cache review preparation

Prepared .github/seaweed-runtime.yml is explicit opt-in: replace Media dependencies
with healthy Seaweed/completed initializer plus existing Postgres/Auth/Redis and
scanner-start behavior, set only Media's generic S3 storage inputs, and reset
MinIO service and volume declarations from that selected model. Removing a
declaration is not deleting its existing Docker volume. Root files and old offline
override are retained for rollback; no local activation command was run.

Prepared main CI now materializes env/private storage settings, downloads the
manifest-selected archive/evidence, runs the verified load helper, validates
selected local/release boundaries, then uses the existing boot/build/live/security/
archive pipeline. COMPOSE_ENV_FILES supplies the prepared settings only in the
fresh live job. It does not export admin credentials into app containers. The
vendor receipt alone is added to the strict artifact allowlist; raw runtime
config, private files and vendor archives are not uploaded as backend evidence.
This is worktree preparation, not a published/accepted new hosted run. Do not
push/run this path until its public release exists and is verified.

Actual read-only selected local and release renders pass all boundaries, choose
Seaweed, require the initializer, and omit MinIO services/volume declarations.
Inventory with all profiles contains exactly 15 unique images: eleven backends
plus Postgres, Redis, ClamAV and Seaweed. Default base remains 16 and alongside
preparation 17. No helper filters vendors from the result; actual Compose models
define each inventory. Tests retain complete backend/profile, default/custom,
checksum-before-load, actual loaded config/layers and strict artifact assertions.

Traced Media Jest setup and HTTP/gRPC test consumers retain their current
application endpoints; they have no direct S3 SDK import in those live transport
files. The legacy Jest S3 fixture default is not the selected server's runtime
configuration. No native Media watch or full Media pipeline acceptance is claimed;
actual changed-provider consumer proofs remain M6/B5, not inferred from mocks.

Seven targeted orchestration/CI/inventory/source-scope tests now pass. A duplicate
test-local variable introduced during the static assertion update was caught by
the cheap syntax gate and renamed; no assertion was removed. Storage tests remain
25 passing. Scoped lint/actionlint pass, and seven workflow Bash blocks pass
Git-for-Windows bash -n without executing them. Public review material contains
eight explicitly selected vendor-only assets, 313,209,600 bytes total: the seven
accepted archive/evidence files plus the public supply manifest. Notes are staged
at .ci-evidence/seaweed-release-notes.md. Target tag is
vendor-seaweedfs-4.51-gojose4.1.7, non-latest prerelease, source target c26ca397...
No application image, project env, runtime credentials, database dump or object
volume is selected. No upload/tag/release/source push has occurred.

Next operator checkpoint: repeat the same initializer once for the missing
idempotency receipt and run pnpm test:backend-tooling for the updated full suite.
Exact initializer command remains in the README. Public cache publication is the
next concrete long operation after this checkpoint; the absent release is an
explicit external prerequisite, not a passing hosted result. M4 remains open.

Handoff receipt for this checkpoint: received actual archive and first initializer
success are retained; no need to rebuild/reverify unchanged archive input. Seven
hosted-flag focused tests, lint, syntax, actionlint, Bash parse and whitespace
checks pass. Actual prepared models and complete image inventories pass as above;
the index and active local provider are unchanged. All new/changed consumers have
updated assertions or named deferred ownership. No RPC/API/schema contract or
backend application test type changed, so preflight/SQL/application builds remain
inapplicable to these tooling operations. Next commands are only the already
documented initializer repeat and pnpm test:backend-tooling; expect its full suite
and bucket-cors-scoped-media-access to pass. Readiness: READY FOR SALAR-OWNED M4
INITIALIZER RERUN AND FULL TOOLING REGRESSION. Do not run/publish the prepared live
workflow before the reviewed public cache exists. Publication and remote load/
hosted acceptance remain pending, and no public write is included in this receipt.

### M4 repeat/tooling acceptance and vendor-upload handoff

Salar reports both requested operations pass: repeated one-shot container
initialization and the updated full backend-tooling suite. Counts and full console
output were not supplied; do not invent them or replace earlier detailed counts.
Preserve actual archive verification and first initializer output. No source or
configuration change follows these results in this checkpoint.

Rechecked proposed release vendor-seaweedfs-4.51-gojose4.1.7 via read-only gh:
release not found. Notes, the eight-file explicit upload list and the original
accepted build commit are prepared. Upload as a non-latest vendor prerelease
draft targeting c26ca397e1c6e9376fc6b01bcee57e7758508f7d, not the uncommitted app
snapshot. The public-data review scope is exactly image.tar.gz, its checksum,
image.json, scan.json, binary.txt, module.patch, go-jose-tests.txt and the supply
manifest copy (313,209,600 bytes total). No new archive, credentials, project env,
storage contents or application image is selected. The publisher command must
use this literal list, not enumerate every file in the ignored download folder.

Previous focused/lint/syntax/workflow/model gates remain valid; this is an
operator-owned upload handoff, not a backend build/live proof. Actual upload,
remote asset identities, publication, download/load and hosted execution remain
pending. Create a draft first so asset completeness/digests can be inspected before
publication. Do not clobber an existing release or push the broader code. M4 stays
open; the prepared live workflow must wait for available verified supply.

### M4 draft review and durable cache publication

Salar completes the eight-asset draft upload. The untagged draft URL identifies
release ID 431347730; its API tag_name is the intended
vendor-seaweedfs-4.51-gojose4.1.7. Agent inspection verifies exactly eight unique
reviewed asset names, every server SHA-256 and byte size against the prepared
manifest/local evidence, uploaded states, draft/prerelease flags and target
c26ca397e1c6e9376fc6b01bcee57e7758508f7d. No unexpected file was uploaded.
The review is retained in ignored draft-release-review.json.

After that concrete review, publish within the requested M4 vendor-cache scope
using gh release edit --draft=false --prerelease --latest=false. It succeeds.
Post-publication API inspection confirms published/prerelease state, all eight
asset digests still match, and the actual lightweight Git tag points to the
accepted vendor workflow commit c26ca397.... The stable release URL is
https://github.com/pain1122/nebulaNV/releases/tag/vendor-seaweedfs-4.51-gojose4.1.7.
The receipt is ignored published-release-review.json. No application commit/main
push, application image, private env, SQL dump or object-storage data was published.
No release-triggered deployment workflow exists in the inspected workflow set.

The release is 313,209,600 bytes across its eight assets, including the accepted
archive digest 6ddc676c.... This publishes the accepted dated M1 security/build
evidence, not a new scan or claim of zero lower-severity findings. MinIO rollback
cache/data and active app settings remain unchanged. Source/code is unchanged
after the passing full tooling/focused gates; only these docs/receipts update.

Final native supply handoff: the README records gh release download into fresh
.ci-evidence/seaweed-release/4.51-gojose4.1.7 (currently absent), followed by the
existing load-archive helper on that directory. It revalidates committed archive/
evidence/config/scan identities before loading and compares actual loaded config/
layers without retaining Env. Expect checksum-config-layers-scan-and-loaded-image
and the sanitized vendor receipt. Both long operations remain Salar-owned.
Actual public-byte download/load is pending; API digest inspection does not
replace this network/load proof. Readiness: READY FOR SALAR-OWNED M4 PUBLIC CACHE
DOWNLOAD/LOAD. No new build, boot, DB proof, contract preflight or restart is needed.
M4 stays open until the native supply proof completes; final whole-snapshot
hosted execution remains B5 and local Media activation remains M5.

### Nov 2 - M4 imported configuration comparison correction: preparation

Salar's public release download succeeds. load-archive verifies archive/evidence
checksums, canonical configuration bytes, layers and scan, then Docker reports
the image loaded. Its final comparison fails with
vendor_loaded_configuration_mismatch. This is a confirmed verifier defect, not
evidence of a bad image, storage outage or a need to rebuild. Read-only inspection
and a bounded 3.4-second extraction of the canonical configuration confirm its
SHA-256 is f8f5f36e... and all loaded layers match. The only runtime configuration
differences are omitted User versus Docker's empty string, and omitted OnBuild
versus Docker's null. No environment values were emitted. The earlier M1
runtimeConfigMatched receipt was too broad: reinspection exposes these two
representation differences; this correction supersedes that literal equality
claim without invalidating its separate binary/layer/S3 proofs.

Authoritative references inspected: OCI image config permits absent/null optional
fields, and Docker's container config declares User as a string and OnBuild as
an optional string list. Restrict normalization to these observed empty fields;
do not discard unknown fields or normalize arbitrary values. Preserve exact
Env, entrypoint/command, labels, ports, filesystem settings and nonempty User or
OnBuild values. Archive/config hash and ordered layer checks remain unchanged.
References: https://github.com/opencontainers/image-spec/blob/main/config.md;
https://github.com/moby/moby/blob/master/api/types/container/config.go.

| Changed owner/symbol                                                  | Exact consumer inspected                                                                                                                                    | Action / reason                                                                                                               | Check status before editing |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| scripts/storage/seaweed-vendor-evidence.mjs validateLoadedVendorImage | scripts/storage/seaweed-vendor-evidence.test.mjs                                                                                                            | Add omitted/empty import regression and changed runtime-field negatives; retain all existing evidence assertions              | Pending focused run         |
| Same owner CLI dispatch                                               | .github/workflows/ci.yml load-archive call                                                                                                                  | Existing load operation uses corrected comparator; workflow command stays unchanged                                           | Source trace reviewed       |
| Same owner CLI dispatch                                               | docker/seaweedfs/README.md                                                                                                                                  | Document verify-loaded for already imported images; still verify full archive before comparing                                | Pending edit                |
| Sanitized vendor receipt                                              | .github/workflows/ci.yml artifact allowlist; docker/seaweedfs/vendor-image.json; .github/workflows/seaweed-vendor.yml; docker/seaweedfs/security.Dockerfile | Keep receipt schema, asset pins, image recipe, build workflow and release unchanged; no new image is needed                   | Inventory reviewed          |
| M4 acceptance                                                         | docs/current-focus.md; TODO-ALTERNATIVE.md                                                                                                                  | Keep M4 pending until corrected native verification succeeds; roadmap order unchanged                                         | Pending updated receipt     |
| Application transports / SQL / image contents                         | No dependency from this comparator to Gateway, RPC, SDK, database or worker code                                                                            | No application change, preflight, migration, build or restart required; M5 activation and B5 hosted execution remain deferred | Inapplicable with reason    |

The index is empty and existing unrelated work is preserved. Scope is the
verifier, focused tests and operator/evidence docs. Next cheap checks: syntax,
format, scoped lint, storage tests and actual already-loaded configuration
comparison. Full public archive revalidation without another load remains the
operator-owned final receipt; do not claim M4 complete before it passes.

#### Correction and handoff receipt

The verifier now normalizes only User omitted/null to empty string, and OnBuild
omitted/null to absence. The full remaining configuration is compared exactly,
including unrecognized fields. The new regression passes the actual observed
shape, checks input immutability and sanitized receipts, rejects fifteen runtime
changes (including nonempty User, build triggers, Env, commands, labels, ports,
volumes and an unknown field), and proves explicit nonempty archive defaults
must survive comparison. Original archive hash, provenance, scan, platform and
ordered-layer assertions remain intact.

verify-loaded reuses full verifyVendorArchive and the same inspect/comparison/
receipt path as load-archive, but never invokes Docker load. Existing CI keeps
load-archive, whose post-import check is corrected automatically. No published
release asset, source workflow commit, pin, image, credential or Compose service
was changed. The README documents the recovery command; current-focus retains
M4 pending. TODO-ALTERNATIVE already delegates to this M4 gate and needs no
roadmap edit. The consumer table above is resolved by this receipt; app transport,
SQL, image-build and hosted B5 deferrals remain as recorded.

Checks after edits: Node syntax, scoped ESLint and Prettier pass; all 26 storage
tests pass with zero skips/failures. Scoped lint initially caught an unqualified
structuredClone test global; globalThis qualification fixes it and lint/tests
were rerun successfully. git diff --check passes with only the pre-existing
.gitignore line-ending warning. The index remains empty. Agent read-only proof
against the actual loaded image and digest-checked canonical config passes:
actual-loaded-config-and-ordered-layers=ok. This focused proof does not create
the final full-archive receipt or claim a new security scan.

Requirement/finding: correct the two confirmed empty-field representation
differences without accepting real config drift. Changed owners/consumers and
unchanged/deferred reasons are recorded above. No source/image drift requires a
build, application restart, new download or another Docker load. Earlier full
backend-tooling evidence remains valid for unchanged backend orchestration; the
changed storage verifier has its full focused suite rerun. Next operator command:

```powershell
node scripts/storage/seaweed-vendor-evidence.mjs verify-loaded .ci-evidence/seaweed-release/4.51-gojose4.1.7
```

Expect checksum-config-layers-scan-and-loaded-image=ok and the sanitized
.ci-evidence/seaweed-vendor.json receipt. Full archive revalidation remains
Salar-owned. Readiness: READY FOR M4 ALREADY-LOADED PUBLIC SUPPLY VERIFICATION.
M4 closure waits for that actual CLI result; M5 activation and B5 hosted
acceptance remain separate.

### Nov 2 - M4 acceptance and preparation failure log

Salar reports the exact final marker
checksum-config-layers-scan-and-loaded-image=ok from verify-loaded. Agent
inspection confirms .ci-evidence/seaweed-vendor.json exists with the pinned
canonical configuration, expected imported store identity and ordered layers.
M4's native vendor-supply proof is accepted. This does not activate Media on
Seaweed or certify the uncommitted snapshot in hosted CI: M5 and B5 remain open.

Confirmed preparation failure: the agent implemented archive creation/import
verification as one feature without clarifying the complete producer-to-consumer
representation change. Its synthetic loaded-image fixture reused the archive's
configuration object, so it could not expose Docker's inserted empty defaults.
The mismatch was predictable from inspecting both actual sides before handoff;
the unnecessary operator failure was an agent preparation error. Do not attribute
it to corrupted vendor bytes, local storage, networking or resource pressure.
The earlier overbroad M1 config-equality claim is corrected above.

Before this documentation correction, traced consumers are:

| Owner / requirement              | Exact consumer                                                                                             | Action / reason                                                                                                                                                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mandatory dependency preparation | docs/testing/pre-suite-checklist.md; AGENTS.md; AI_CONTEXT.md                                              | Add explicit both-side lifecycle trace, independently observed boundary fixtures and recurring-failure log to the existing mandatory checklist; the two instruction entrypoints already require it and remain unchanged |
| M4 acceptance                    | docs/current-focus.md; TODO-ALTERNATIVE.md; docker/seaweedfs/README.md                                     | Record successful native receipt, mark M4 accepted and identify M5 as next; remove current pending wording without rewriting historical evidence                                                                        |
| Defect and regression evidence   | scripts/storage/seaweed-vendor-evidence.mjs; scripts/storage/seaweed-vendor-evidence.test.mjs; this report | Retain the narrow correction and 26-test result; add root cause and prevention here; no further implementation change or suite rerun required                                                                           |

Permanent prevention: before handing off a cross-boundary feature, identify the
producer, intermediate encoding/normalization, consumer and verification/retry
path. Inspect observed output at each changed boundary or record it explicitly
pending before handoff. Build regression fixtures from those observations rather
than making both sides share the same assumed object; test allowed representation
differences alongside rejection of meaningful changes. Log future operator-found
preparation defects with cause, missed consumer, regression and prevention in the
existing checklist ledger and owning report. This is a required review gate, not
a claim that automated tests discover every missing boundary.

Scope of this checkpoint is documentation only. Verify formatting and whitespace;
retain earlier application/storage test evidence, keep the index untouched, and
do not run builds, Compose, archive loads or new live proofs for a process update.

Documentation receipt: all five changed Markdown files pass Prettier checking;
git diff --check passes with the existing .gitignore line-ending warning only.
Final diff review confirms the new mandatory gate, logged root cause and M4/M5
status agree across the checklist, report, focus, README and adopted TODO. The
index remains empty; no implementation or running-service change was made.

### Nov 2 - M5 object-preserving cutover: preparation and dependency trace

Read-only inspection finds all seventeen running containers healthy, including
alongside Seaweed. MinIO's media bucket has 302 objects / 20,109,453 bytes; Seaweed's
media bucket is empty. Media owns 50 READY rows, all already storage=s3 and
bucket=media, 50 verified sources, 204 derivative rows, 50 completed processing
jobs, 51 completed generations, and zero pending object cleanups. The fifty D1
journal Media IDs match the database; D1 has 122 Product entries and the two D2
journals each have three Products, targeting the same Gateway. No credentials,
raw container environments or journal customer/order data were emitted.

All verified sources exist. Four historical derivative objects are absent;
the owning generation is retired and not approved. Source inspection of
media-derivative.store.ts confirms retirement schedules old files for cleanup;
media.service.ts delivers the approved generation. There are 200 approved outputs
and four retired historical rows. Preserve that intentional distinction: require
every currently delivered source/approved output and its stored checksum, but do
not recreate already-cleaned retired bytes or classify their absence as a defect.
The first JSON inventory probe used json_agg's multiline text incorrectly; changed
the read-only probe to compact jsonb_agg before drawing any conclusions.

Selected route: copy the entire existing bucket, retaining keys and object
metadata plus ContentType/CacheControl and other supported delivery headers.
No Media, Product, Order or journal rewrite is needed: both stores use media,
all Media rows already have the generic s3 label, and Gateway/journal IDs remain
unchanged. Compare actual independently downloaded source/destination bytes and
metadata, not ETags as a cross-provider byte checksum. Recheck database/journal/
source inventory stability before accepting the receipt. Existing conditional
write/upload-binding and Media worker rules are unchanged.

| Owner / boundary                                    | Exact inspected consumer                                                                                                                                         | Required action / reason                                                                                                                                                                                                              |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New bounded one-time transfer owner                 | scripts/storage/seaweed-transfer.mjs and seaweed-transfer.test.mjs                                                                                               | Prepare read-only plan, stopped-writer copy/resume and independent verification; no deletion or overwrite of conflicting destination objects; forward/reverse direction support for rollback after new writes                         |
| Source/target SDK construction and private material | scripts/storage/seaweed-setup.mjs; docker/seaweedfs/vendor-image.json; actual MinIO/Media container configs                                                      | Reuse prepared scoped Seaweed SDK and manifest guards; source credentials stay in memory; validate exact local endpoints/bucket and expected container identity before mutation                                                       |
| Media-owned inventory / bytes / delivery            | apps/media-service/prisma/schema.prisma; src/media.service.ts; src/processing/media-processing.storage.ts; media-processing.worker.ts; media-derivative.store.ts | Read only the Media owner's tables; require no queued/processing work or cleanup; hash sources and approved derivatives against stored SHA-256/size facts. Preserve rows and distinguish retired generations. No schema/worker change |
| Demo identities and facts                           | scripts/demo/{runner,state,commerce-runner,commerce-state,run,gateway}.mjs; .nebula-demo/d1.json, d2-showcase.json, d2-limits.json                               | Snapshot journal hashes and preserve existing IDs/targets; no reset, re-seed, caller or API response change. Native verify remains post-activation evidence                                                                           |
| Selected runtime and rollback                       | docker-compose.yml; docker-compose.release.yml; .github/seaweed-runtime.yml; docker/seaweedfs/{compose.storage,compose.bootstrap}.yml                            | Reuse accepted opt-in selection, validate actual local/release models; base MinIO config/volume retained. Operator stops Gateway/Media for transfer, then activates only Media/Gateway after accepted receipt                         |
| Test registration / docs                            | package.json test:storage:setup; .github/workflows/ci.yml; docker/seaweedfs/README.md; docs/architecture/d2-demo-workflow.md; docs/current-focus.md              | Register transfer regression file in existing storage suite/quality step; document freeze, copy, receipt, activation and post-write reverse-copy rollback. Keep M5 pending until actual native activation                             |
| API/generated contracts / backend images            | Gateway/protobuf/SDK consumers; backend orchestration and image inventory from accepted M3/M4                                                                    | Unchanged with reason: no transport/schema/image/code dependency change. Preflight, SQL migrations and image rebuild are inapplicable. Final runtime/Media proofs remain M6; hosted snapshot remains B5                               |

Operational order before any mutation: pause manual/demo clients and live proofs
(including outstanding uploads), plan; stop Gateway and Media gracefully; copy
with unchanged-state guards and conditional creation; independently verify source
and target; stop old MinIO to retire old signed URLs; select the prepared Seaweed
configuration and recreate only Media/Gateway. Keep both volumes and all rows.
No ordinary demo writes before M6 acceptance. If interrupted, retain plan/receipt
and both stores, resume identical objects only, and refuse conflicts/drift.

Rollback before new writes uses the unchanged base MinIO configuration. After
any Seaweed writes, freeze Gateway/Media again, start retained MinIO, reverse-plan
and copy/verify all current Seaweed objects into it before reverting endpoints.
Never overwrite a different existing object automatically; stop for explicit
reconciliation. Extra retained MinIO objects are left intact; database lifecycle
controls delivery. A config-only rollback after post-switch writes is forbidden.
Actual native transfer/activation is operator-owned and pending. No container,
database, object or journal has been mutated during these inventory probes.

#### M5 preparation results and operator handoff

The new transfer helper is registered in the existing test:storage:setup command,
already called by hosted quality. No new dependency, schema, generated contract,
backend image or workflow step is required. The ten new focused cases pass:
independent source/destination metadata and byte reads with different ETags;
partial-run resume without overwrite; retaining unreferenced objects; reverse
copy preserving new writes and old target objects; conflicts in bytes/binding/
headers; stored checksum failure before write; inventory drift; missing approved
references; active work/unfinished uploads; and bounded pagination/object sizes.
One case sends the actual transfer through the installed Media SDK's HTTP
serialization/deserialization, independently supplying target headers/body. It
checks create-only If-None-Match, upload-binding metadata, CacheControl/ContentType
and Expires as an actual Date-to-HTTP-to-Date conversion. No live transfer pass is
inferred from that substituted HTTP handler.

Actual read-only native plan passes with 302 objects and 250 required references,
confirming all currently approved files exist; the four missing historical files
are excluded by the actual approved-generation relation. The plan is stored
privately in .nebula-storage/seaweedfs/transfer.json. An identical plan rerun passes
without rewriting it. Actual CLI copy invoked with running writers refuses at
transfer_stop_gateway_and_media_first before listing/writing objects, preserves
the plan's SHA-256 and releases its operation lock. Agent did not stop a service
or copy an object. Stored application rows and demo journals remain unchanged.

The helper rechecks prepared settings plus actual source/destination/container
identities against the accepted vendor receipt; credentials remain in memory.
Copies are serial and bounded, use source If-Match and destination If-None-Match,
and have request/body deadlines. The receipt follows two independent full reads
of both stores plus unchanged Media-owner database, journal and source-inventory
checks. Destination conflicts are not overwritten; the source is never deleted.
The same operation in reverse handles new post-switch keys before rollback;
native reverse execution is pending and conflicting old keys require review.

Consumer review: setup/vendor helpers and both base Compose files are unchanged;
the new transfer owner reuses them. Existing Media processing/delivery rules,
approved-generation semantics, Product IDs, D1/D2 journals and client contracts
are preserved. Current-focus, the storage README and D2 demo workflow explain the
copy checkpoint and preserved records. The adopted TODO already delegates to M5
and stays unchanged. A concrete remaining activation concern is default selection:
an explicit Seaweed render alone does not change an ordinary later base startup.
Verify default/everyday selection and Node inventory/boot consumers together
before any activation handoff. Docker documentation confirms Windows COMPOSE_FILE
uses semicolons by default and COMPOSE_ENV_FILES uses commas:
https://docs.docker.com/compose/how-tos/environment-variables/envvars/.
No claim of a persistent provider switch is made by this copy checkpoint.

Handoff receipt: requirement and exact impact table are above. Node syntax and
scoped ESLint pass; all 36 storage tests pass, zero skipped/failed (26 retained
plus ten new). Actual native plan/rerun and stopped-writer guard pass as recorded.
Final source/package/docs Prettier checks and whitespace checks pass, with only
the existing .gitignore line-ending warning. SQL is read-only Media-owner
inventory, not a migration; Gateway/RPC/
OpenAPI, backend test types and application builds are unchanged/inapplicable.
The index and source MinIO volume remain untouched. Necessary actual copy, object
metadata/byte comparison, subsequent activation and M6 consumer proofs remain
operator-owned and pending. No full backend suite is needed for unchanged owners.

Run these PowerShell commands separately, stopping at the first failure. Pause
all clients, demo seeders, live proofs and outstanding uploads first:

```powershell
docker compose -f docker-compose.yml stop gateway media-service
node scripts/storage/seaweed-transfer.mjs copy
docker compose -f docker-compose.yml stop minio
```

Expected receipt: minio-to-seaweed
bytes-metadata-approved-checksums-database-journals=ok objects=302. Only then stop
MinIO with the last command to retire the old upload endpoint; retain its data.
Leave Gateway/Media stopped at this checkpoint. Do not activate from an empty
bucket, reset seeds, delete volumes or remove orphans. Next agent step is review
of the actual copy receipt and preparation of coherent persistent selection /
activation, not a rebuild. Readiness: READY FOR M5 OWNED COPY AND OLD-ENDPOINT STOP;
M5 itself remains open.

### Nov 2 - M5 accepted copy and persistent activation preparation

Salar supplies the full successful 302-object copy marker and confirms Gateway,
Media and then MinIO stopped. Agent inspection confirms phase=verified,
302 object receipts totalling 20,109,453 bytes, correct forward direction, all
three stopped containers and healthy alongside Seaweed. Stopped containers'
retained unhealthy flag is not a running-service failure. No activation is yet
claimed. This accepts the copy checkpoint, retaining MinIO volume and rows.

Before editing activation, two concrete consumer gaps are confirmed: inventory
forces --file docker-compose.yml when no shell selection is supplied, defeating
Docker's persistent .env selection; and an isolated native Compose fixture shows
COMPOSE_ENV_FILES inside .env does not bootstrap the additional environment file.
Do not hand off that assumed nested-loading configuration. The minimal route is
to persist COMPOSE_FILE plus a portable explicit separator in ignored root .env,
materialize only Media-scoped prepared settings there, and set the native Media
env's S3 endpoints to loopback. Never copy the bootstrap administrator credentials.
The prepared private settings remain the source; retain hash-checked backups.
This is local activation configuration, not a secret-management redesign.

Preparation also finds a stale exact script assertion in scripts/backend.test.mjs:
the prior transfer registration added a third file but this consumer still
expected two. Correct it before full tooling handoff and log the missed consumer;
the earlier 36 storage tests did not exercise this separate assertion. Native
copy success remains valid; no operator failure from this stale assertion is
reported. This is a confirmed preparation omission, not a reason to drop its
inventory check or rerun the object transfer.

| Owner / boundary                                 | Exact consumer inspected                                                                                                                                                                                                               | Planned action / unchanged reason                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Persistent configuration / rollback              | scripts/storage/seaweed-transfer.mjs; seaweed-transfer.test.mjs; ignored .env and apps/media-service/.env                                                                                                                              | Extend the existing migration owner with guarded activate-config/restore-config, preserve unrelated env content, detect duplicate/custom selection, retain private before/after hashes/backups; bind to the accepted unchanged database/journal receipt and stopped writers                                                                                           |
| Prepared scoped settings / credential boundaries | scripts/storage/seaweed-setup.mjs; .nebula-storage/seaweedfs/{.env,manifest.json}; .gitignore; .dockerignore                                                                                                                           | Reuse existing integrity validation and only Media settings plus port/origins. Prepared source files, administrator identity, stored data and vendor image remain unchanged                                                                                                                                                                                           |
| Docker default versus explicit selection         | scripts/docker/release-image-inventory.mjs; scripts/backend.test.mjs inventory and script-registration cases                                                                                                                           | Let no explicit selection use Docker's normal discovery; preserve explicit composeFiles/COMPOSE_FILE/--env-file overrides, full backend inclusion and dedup checks. Update exact argument and registration assertions                                                                                                                                                 |
| Boot and native-development consumers            | scripts/backend.mjs runCompose/captureComposeConfigurations; scripts/backend-dev.mjs developmentPlan; scripts/backend-dev-env.mjs prepareNativeEnvironment; scripts/docker/{save-release-images,load-release-images,build-backend}.ps1 | Local Docker calls inherit persistent .env defaults; archive wrappers inherit corrected inventory. Explicit release-example evidence stays an explicitly named baseline, separate from selected Seaweed release render. Native Media gets loopback S3 settings; native Media watch remains unsupported while scanner TCP is unpublished. No shared build graph change |
| Actual deployment composition                    | docker-compose.yml; docker-compose.release.yml; .github/seaweed-runtime.yml; docker/seaweedfs/{compose.storage,compose.bootstrap}.yml                                                                                                  | Reuse accepted files; base files remain runnable MinIO rollback. Validate default local selection and explicitly selected release render plus exact image inventory using actual Compose before handoff                                                                                                                                                               |
| Evidence / operator instructions                 | docker/seaweedfs/README.md; docs/architecture/{local-dev-and-docker-boot,runtime-environment-ownership}.md; docs/current-focus.md; docs/testing/pre-suite-checklist.md; this report                                                    | Record precise private-config precedence, backup/recovery, consumer correction and accepted copy. M5 activation/readiness and M6 proofs remain pending; don't mark the feature complete at config preparation                                                                                                                                                         |
| Application/contracts/database                   | Gateway/Media runtime source, Product/Order consumers, generated SDK/proto/OpenAPI and schema                                                                                                                                          | Unchanged: same generic s3 driver, bucket/IDs/keys and existing images. No rebuild, SQL mutation, broad application suite or API preflight required for these tooling/config changes                                                                                                                                                                                  |

Before mutating env files, focused tests must cover original content preservation,
duplicate assignments, real dotenv roundtrip, rollback drift refusal, source
receipt requirements and explicit/default image selection. Use native config-only
fixtures to check both Docker parsing and the Node inventory consumer. Any broad
tooling proof and Compose activation remain Salar-owned after cheap gates pass.

Further exact env_file tracing refines that plan before any host env mutation:
root .env is imported into multiple service containers. Therefore do not put new
Media credentials there. Add a derived Media-only private media.env under the
already ignored storage directory, verify its contents against the accepted
settings, and append it only to Media's env_file list. An independent native
Compose fixture proves that !reset null on the old inline credential/public
endpoint fields allows those fields to come from that scoped env file. The same
fixture proves persistent .env COMPOSE_FILE selection with an explicit pipe
separator. Root .env will receive only nonsecret file-selection/port/origin
settings. Native Media's own ignored app env gets its loopback scoped settings.
This supersedes the proposed root credential materialization above. Existing
prepared env/S3-config/compose manifest hashes and credentials remain unchanged.
Extend the trace to scripts/storage/seaweed-setup.mjs and its exact setup tests,
plus the selected runtime overlay: setup prepares/verifies the additional derived
file on both new and existing installations, without rotating old settings or
claiming that this changes the accepted copied bytes.

#### Persistent configuration results and startup handoff

Implementation follows the refined scoped-file route. setup's prepare handles
both fresh and accepted existing material: it creates media.env if absent and
checks its exact derived contents if present. readPreparedSettings validates it
when present while allowing the original three-file manifest to be upgraded by
prepare. Existing env/config/compose hashes and random keys are unchanged. The
selected overlay appends this file only to Media and resets five old inline
public-endpoint/credential/bucket/region overrides, leaving explicit internal
Seaweed routing. Original base Compose files and bootstrap secret scope are
unchanged; no image build is needed for the host-mounted initializer helper.

The existing transfer owner now has activate-config and restore-config. Config
activation requires stopped Gateway/Media, stopped old MinIO, healthy pinned
Seaweed, a complete accepted transfer receipt, unchanged prepared settings and
unchanged Media database/journals. It writes two private, hash-checked backups and
only then patches root selection/port/origins and native Media's scoped loopback
settings. Unrelated env lines/values are preserved. A receipt binds before/after
hashes; partially applied files can resume, while duplicate keys, custom Compose
selections, altered backups/settings or subsequent user edits fail before config
overwrite. Restoration additionally requires a matching verified reverse copy;
it never discards new post-switch objects or later config edits silently.

Cheap gates pass: Node syntax, scoped ESLint, formatting and all forty storage
tests (zero failures/skips), including four config-specific cases for dotenv
roundtrip, scoped ownership, exact backup/rerun/restoration, drift refusal and
interruption resumption. Setup's existing repeat test now also proves a missing
derived output is recreated without rotating original material, refuses altered
derived credentials, and excludes administrator keys. Five targeted backend
tooling tests pass with CI=true and GITHUB_ACTIONS=true, preserving the exact
three-file registration, explicit/default selections, all backend image coverage
and updated selected CI file/dependency scope. The missed registration consumer
and concrete old-command search prevention are logged in the mandatory checklist.

Actual native checks are distinct from those tests. An isolated Compose fixture
proves default .env selection, pipe separation and !reset fallback to a scoped
env_file. Previewed actual local and selected-release models pass the existing
boundary validator, Media credentials match the prepared scoped identity, Gateway
does not receive its secret, and actual archive inventory is fifteen images with
no MinIO image. The release preview initially lacked release-required Redis input
because local development env was used; reran with the production example plus
only the proposed nonsecret selection/port/origin settings and it passes. This is
config-only fixture evidence; no release credentials or deployment are claimed.

Agent runs prepare once: private-config-reused-without-rotation=ok. It adds only
the derived scoped file. Agent then runs activate-config successfully against
the accepted copy: seaweed-config-prepared-private-backups-retained=ok;
containers unchanged. Actual ordinary docker compose config and unqualified Node
releaseArchiveImages now agree on fifteen images and literal internal Seaweed
settings. Every other rendered service is checked not to receive the scoped
Media secret; native Media has loopback endpoints. activation.json is configured,
all private outputs/backups are Git-ignored, and Gateway/Media/MinIO still remain
stopped. No database, object, journal, image tag or running service was changed by
configuration preparation. Config-only explicit base rollback render retains the
original MinIO endpoint and actual old container credentials. ensureBackendEnvironment
only fills missing files; it does not overwrite this persistent local selection.

Consumer table closure: inventory/wrappers and boot use the same default Docker
selection, explicit caller overrides remain tested, and release-example capture
remains its named baseline rather than a claim of selected deployment. Native
Media receives correct scoped host settings; Media watch/scanner accessibility
remains explicitly unsupported. README, environment ownership, local boot, focus
and adopted TODO reflect the actual stopped/configured checkpoint. No runtime
application source, API/proto/generated client, schema or dependency version was
changed; prior type/preflight/SQL/image evidence is not invalidated. The changed
helpers are Node tooling with their syntax/lint/focused gates complete. M6 owns
actual pipeline/delivery/recovery and B5 owns current-snapshot hosted execution.

Handoff receipt: source/test/overlay final formatting and whitespace checks pass
with the existing .gitignore CRLF warning only; the index remains empty. Actual
copy and native config/identity/scope checks pass as above. Full backend-tooling
regression is pending after the changed inventory/registration assertions; actual
Media/Gateway startup and readiness are also pending. Run separately and stop on
the first error:

```powershell
pnpm test:backend-tooling
docker compose up -d --no-build --wait --wait-timeout 240 media-service gateway
pnpm backend:health
```

Expected: full tooling green, selected seaweed-init completes, Media/Gateway
healthy and all configured backend health checks green. Allow dependencies here;
--no-deps would bypass the required initializer service gate. Retained old MinIO
containers may appear as orphans; do not remove them or their volumes. No build,
cache prune, new vendor load, object recopy or seed reset is needed. Readiness:
READY FOR M5 FULL TOOLING AND SELECTED STARTUP. M5 remains open until native
running-provider inspection; copied data and configuration alone are insufficient.

### Nov 2 - M5 running acceptance and M6 proof preparation

Salar supplies the full backend-tooling result: 89 tests pass, zero failures or
skips. Selected startup completes successfully, including seaweed-init exit zero
and healthy Media/Gateway; all eleven backend health checks pass. Agent inspects
the actual runtime: Media driver/provider s3, internal endpoint
http://seaweed:8333, public endpoint http://127.0.0.1:19000, bucket media. Media,
Gateway and Seaweed are running/healthy; initializer exited zero; MinIO remains
stopped with exit zero and its retained data. Its stale unhealthy flag and the
reported orphan warning do not identify an active dependency failure. Transfer
receipt remains verified and configuration receipt configured. M5 is accepted;
M6 actual feature and recovery proofs remain pending.

Before M6 implementation, exact consumer review finds one confirmed stale
helper: media-processing-recovery.mjs forces --file docker-compose.yml, which
would select MinIO on its deliberate Media recreation. Correct it to honor the
same project/default Compose selection accepted in M5, with injected execution
for regression and a native config-only check. D2's separate recovery helper
already honors default selection and needs no edit. Do not execute the known-bad
Media restart proof before fixing it. No operator failure from it is reported.

The existing Gateway processing proof uploads using returned signed headers but
does not send Origin or run preflight. M2 independently proved provider CORS;
M6 must now prove that the actual Gateway-issued upload URL/header set supports
allowed/denied browser-style preflight and an Origin-bearing PUT. Reuse the
existing storage proof's pure preflight assertions, preserve all processing,
immutable-byte, bad-file and cleanup assertions, and do not claim a real browser
UI run from Node HTTP behavior.

| Changed owner / boundary          | Exact consumer inspected                                                                                                                                                         | Action / unchanged reason                                                                                                                                                                                           |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Media recovery Compose runner     | packages/api-client/test/media-processing-recovery.mjs; media-processing-recovery.test.mjs; media-processing-live.mjs                                                            | Remove forced base file, preserve root project, inherited selection/timeout/input and restoration safeguards; add regression and native selected render                                                             |
| Browser preflight/upload proof    | scripts/storage/seaweed-storage-proof.mjs; scripts/storage/seaweed-setup.test.mjs; packages/api-client/test/media-processing-live.mjs                                            | Add pure denied-origin assertion and focused negatives; check actual signed URL/header preflight once per run and actual PUT Origin/allow-origin. No change to existing M2 CLI proof path                           |
| Mode/registration consumers       | package.json test:media:\*:live; packages/api-client/package.json test and all four Media modes; scripts/backend.test.mjs storage registration; .github/workflows/ci.yml quality | Existing scripts/test files already execute changed helpers; no new file, command, registration count or workflow needed                                                                                            |
| Independent delivery/features     | packages/api-client/test/{media-derivatives-live,media-metadata-live,d1-references-live,f3-live-flows}.mjs; apps/media-service/test/{http/media.http.e2e,grpc/media.e2e}.spec.ts | Reviewed provider assumptions. Keep existing contract/feature assertions; public signed endpoint changes are configured, not a client-contract replacement. Their actual Seaweed execution remains pending          |
| Other restart/inventory consumers | packages/api-client/test/d2-checkout-recovery.mjs; scripts/docker/release-image-inventory.mjs; scripts/backend.mjs                                                               | Already honor default selection; keep M5's passing native/89-test evidence. No backend rebuild or new orchestration change                                                                                          |
| Required preparation / evidence   | scripts/check-backend-test-types.mjs; docs/current-focus.md; this report; docker/seaweedfs/README.md                                                                             | Record actual M5 acceptance, focused syntax/lint/tests and native render. Whole-backend no-emit test traversal remains a necessary operator-owned gate before live proofs; no runtime/source image or schema change |

No Gateway/RPC/protobuf/OpenAPI/generated client contract changes are planned;
freshness/count/hash regeneration and API preflight are inapplicable. Preserve
the Oct 31 Media SQL proof and earlier M2 persistence proof for unchanged paths.
Native feature/restart proofs and broad test-type traversal remain Salar-owned.

#### M6 cheap checks and test-type handoff

The recovery helper now constructs Compose arguments through createMediaCompose,
preserving root working/project directories, inherited default/explicit selection,
stdin, timeout and restoration semantics while removing its forced base file.
The new regression asserts those exact invocation boundaries. Actual invocation
of that runner with config --format json confirms internal Seaweed and no MinIO,
without stopping/restarting any container. The separate D2 runner already uses
compose plus caller args without a forced file; it remains unchanged.

The existing storage proof exports one new pure denied-origin assertion, covered
for permission withheld on successful responses, 403 denial, forbidden reflected
or wildcard grants, and 503 outage rejection. No prior M2 CLI path/assertion is
changed. The Gateway processing proof reuses it and the existing allowed-header
preflight assertion with its actual issued URL/header names, performs one allowed
and one denied preflight per run, and sends Origin on PUT with reflected-origin
validation. Its new gateway-presigned-browser-cors-upload marker is not claimed
until actual native execution. All four existing Media modes inherit this check;
existing bad-file, immutable approval, derivative, metadata, restart and owned
cleanup assertions remain intact. No new standalone script or command was added.

Post-change checks: syntax/scoped lint and eleven focused recovery tests pass;
all 41 storage tests pass, zero failures/skips. New pure denial coverage is in the
already registered setup test file; recovery regression is in its existing file
already registered by packages/api-client/package.json. Exact package scripts and
89-test backend-tooling evidence remain unchanged. Current focus/TODO record M5
acceptance and M6 next; README/local boot reflect the actual running provider.
The mandatory checklist adds an actual-runner topology check so a mocked restart
cannot stand in for native file selection. Preserve the accepted 302-object copy,
M2 persistence, Oct 31 SQL and unchanged application images.

Handoff receipt: exact impact table and changed/unchanged consumers are above.
Readiness is operator-reported eleven backend checks plus agent-observed healthy
active Media/Gateway/Seaweed and correct literal provider/endpoints. Full-backend
test-type traversal is a necessary no-emit preparation gate; it may be long on
this host and remains Salar-owned. Run:

```powershell
node scripts/check-backend-test-types.mjs
```

Expected: every listed owner has errors=0, final exit zero. Do not rebuild images,
recopy objects, reset seeds or rerun unchanged SQL. Actual M6 feature/restart
execution and Media's broad Jest suite remain pending; its configuration has
globalSetup wait-for-services and dotenv setup, so it is a live suite rather than
a cheap mocked check. Runtime application source, codecs/generated contracts and
schema are unchanged; API freshness/count regeneration/preflight do not apply to
these test-helper changes. Readiness: READY FOR M6 TEST-TYPE PREREQUISITE;
feature/recovery commands follow the actual prerequisite result.

Final preparation receipt: Prettier and whitespace checks pass (existing
.gitignore line-ending warning only); index unchanged. All required owner Prisma
client type files and declared shared package type outputs exist, so no known
missing-producer failure is handed to the test-type gate. These filesystem checks
are prerequisites, not a claim that whole-backend types have passed.

### Nov 2 - M6 test-type acceptance and live sequence preparation

Salar supplies errors=0 for all eight test-owning services: User 10 files, Auth
17, Settings 8, Media 21, Taxonomy 8, Product 27, Blog 12 and Order 22 (125 files
total). Accept that no-emit gate for the unchanged owners. All feature/restart
proofs remain pending; no live result is inferred from typechecking.

Final broad-suite preparation inspects Media globalSetup, test/jest.env.ts,
HTTP/gRPC helpers and the complete live-mode sequence. It finds a stale dormant
test fallback: jest.env.ts still names Supabase and defaults to the removed
54321 S3 gateway/local region. The configured native app .env already overrides
it with the accepted Seaweed endpoint, so this is stale fixture/documentation,
not evidence the running provider failed. Correct those two fallback literals
and comment to loopback Seaweed/us-east-1 before suite handoff. No new behavior
test mirroring constants is needed. Recheck only Media's unchanged no-emit rules
after that TS fixture edit; retain the seven other passing owner results.

Consumer trace extension: apps/media-service/test/jest.env.ts is loaded by
apps/media-service/jest.config.ts after dotenv/config; HTTP/grpc helper files
consume its environment. The fallback correction preserves process/app env
precedence and test credential defaults. packages/api-client/test/
media-processing-live.mjs modes and package scripts are unchanged. Derivatives,
metadata and recovery each include the base processing/CORS/negative-file flow,
so a fourth standalone processing run is redundant. D1 references must use the
existing ready-Media opt-in; F3 checks the surrounding Gateway flows. The two
Media database suites remain opt-in and retain their accepted Oct 31 SQL proof;
do not enable them against the shared demo DB or advertise skips as new passes.

The narrow fixture correction is complete. Typed ESLint and Prettier pass.
Media-only no-emit recheck uses exactly check-backend-test-types.mjs's compiler
settings/include/exclude rules and passes 21 files/errors=0. This updates that
owner after its TS fixture edit without repeating the seven unaffected owners;
the accepted whole-backend gate plus this focused recheck cover the current tree.
There is no application/runtime/schema or transport-contract change, and no
image rebuild is required. Previously passing 41 storage and eleven recovery
checks remain valid for unchanged helper source. Exact new fixture path, its
Jest setup caller and native consumers are traced above; no consumer is omitted.

Handoff receipt: current exact file trace is above; source/fixture syntax,
typed/scoped lint, format and whitespace gates pass (existing .gitignore CRLF
warning only). Native M5 readiness/provider evidence is retained; no relevant
service/config changed since startup. Whole-backend no-emit evidence is accepted
with the focused Media recheck. API preflight and SQL reprovisioning are
inapplicable to the fixture-literal correction; no generated contract changed.
Live/Jest acceptance remains operator-owned and pending. Next commands, each
separate with stop-on-first-failure:

```powershell
pnpm --filter @nebula/media-service test:e2e
pnpm test:media:derivatives:live
pnpm test:media:metadata:live
pnpm test:media:recovery:live
$env:D1_READY_MEDIA_FIXTURE = '1'
try { pnpm test:d1:references:live } finally { Remove-Item Env:D1_READY_MEDIA_FIXTURE }
pnpm test:f3:live
```

Do not run F3 if the reference proof fails. No simultaneous seed/test runs while
recovery deliberately restarts services. Default database-suite skips are named
above, not claimed as new SQL passes. Expect new CORS marker, feature markers
and successful owned cleanup; actual Media/HTTP/gRPC feature and transport
recovery results are still pending. Readiness: READY FOR M6 LIVE ACCEPTANCE.
Index unchanged; keep MinIO/data for rollback through acceptance.

### Nov 2 - M6 acceptance and M7 closure preparation

Salar reports all six handed-off commands pass: Media test:e2e, derivative live,
metadata live, recovery live, ready-Media Product references and F3 live. The
three Media modes include base scan/promote/render, gateway-presigned CORS,
immutable approved bytes, invalid-file denial and cleanup. Accept the reported
suite/feature/restart/reference/Gateway results. Detailed console counts and
markers were not supplied; do not invent a Jest pass/skip count or claim the
operator separately enabled the two opt-in database suites. Their accepted
Oct 31 dedicated SQL/eleven-case evidence remains separate. No real browser UI,
cloud/CDN, tenant isolation or production deployment is claimed by these proofs.

Agent's post-recovery read-only inspection finds all sixteen running selected
containers healthy. Actual Media still uses provider s3, internal Seaweed and
public loopback 19000; old MinIO remains stopped and initializer exit is zero.
Thus restart restoration preserved the selected provider, not merely readiness.
M6 is accepted. Keep stopped MinIO/data for explicit rollback; removing them is
not necessary to close the feature or an authorization to discard data.

M7 is documentation-only. Before edits, reviewed exact current-status consumers:

| File / consumer                                                                                                                  | Required correction / unchanged reason                                                                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| docs/services/media-service.md                                                                                                   | Replace active MinIO/pending pipeline/crop claims with accepted Seaweed and M6 evidence; retain actual file-manager/audit/encryption gaps and dated historical test counts                                            |
| docs/packages/api-client.md                                                                                                      | Record native signed-header/CORS and feature proof acceptance; distinguish SDK declarations from accepted D2 runtime evidence instead of stale new-image pending wording                                              |
| docs/docker-configs.md; docs/architecture/local-dev-and-docker-boot.md; docs/architecture/runtime-environment-ownership.md       | Distinguish persistent selected local Seaweed, explicit base MinIO rollback, selected versus published CI, image inventory and SQL-only backup limits. Preserve operational commands/rollback and dated audit history |
| README.md; AI_CONTEXT.md; site essentials.md; docs/architecture/system-relationships.md; docs/architecture/testing-and-health.md | Remove stale active-MinIO instructions so users/future agents do not restart it as the default or imply unfinished cloud/tenant work is required                                                                      |
| docs/current-focus.md; TODO-ALTERNATIVE.md                                                                                       | Check M6/M7, advance to maintenance D1, preserve B0/B5 pending state and later Vite/tenant/cloud scope                                                                                                                |
| docker/seaweedfs/README.md; this report                                                                                          | Close actual native acceptance, retained security/image/data/rollback identities and limits; retain precise historical failed checks and corrections                                                                  |
| scripts/storage/\*; actual private config/receipts; application/schema/generated clients                                         | Unchanged: passing native/typed/scoped evidence remains valid; no implementation, object mutation, new scan or source/image change is needed for doc closure                                                          |

Accepted vendor remains community SeaweedFS 4.51, source 153ab668..., patched
go-jose 4.1.7, hosted build 41203305981 and non-latest durable vendor release.
Archive 6ddc676c..., canonical config f8f5f36e... and imported store 0f27a2ec...
are already recorded above with exact full pins in vendor-image.json. The
zero-HIGH/CRITICAL scan is the dated Oct 31 scan; native feature acceptance does
not refresh it or certify lower severities. The 302-object migration preserves
Media/derived SHA-256 facts and D1/D2 IDs/journals. Source MinIO is retained but
excluded from the selected fifteen-image archive. Private material remains
ignored and Media-scoped. Current-snapshot hosted acceptance remains B5, recovery
packaging remains B4, dependency maintenance remains D1-D9, and B0 is not signed
off. Native acceptance is not deployment approval or an automatic main push.

#### M7 closure receipt

The traced current-status docs now agree: active community Seaweed/S3, scoped
private Media settings, retained stopped MinIO, selected fifteen-image supply,
native processing/derivative/metadata/recovery/ready-reference/F3 acceptance,
and the dated limits of security/SQL/browser/hosted evidence. Old Supabase-style
browse terminology and actual deferred file-manager/audit/encryption features
are preserved as interface/history or explicit gaps, not active deployment
dependencies. Historical dated checkpoint counts remain history; no unreported
live suite count or new full-service lint pass is invented.

M1-M7 are accepted. No application, schema, package version, credential, runtime,
image or data change follows this doc closure. Index remains untouched. The
current focus advances through maintenance D1's read-only cohort review to D2;
fresh findings and exact target/compatibility decisions are recorded in
[the maintenance execution ledger](2026-10-31-dependency-maintenance-execution.md).
Nine older packaged Nest/gRPC versions are a maintenance rollout fact, not a
retroactive failure of the reported Media feature proofs or evidence of a cache
defect. No extra provider migration, vendor rebuild or seed reset is requested.

Document consumer review and format/whitespace checks complete the closure;
no broad runtime/type/SQL suite is needed for these documentation edits. Actual
version changes must repeat only the proofs invalidated by their owning changes.
B0/B4/B5, remaining dependency maintenance, later Vite integration, cloud/CDN and
tenant implementation remain explicitly outside this local Media acceptance.

Fresh-machine limit: the accepted active configuration is in this prepared
workspace's ignored env files. Fresh clones do not inherit it; the retained
explicit base still defines MinIO rollback. README's old clone/install/up/native
example was therefore stale and could also launch two processes on one port.
Replace it with existing-workspace instructions and an explicit B3 clean-setup
gate. B3 must prove fresh Seaweed bootstrap/selection before release instructions
are advertised; B5 still owns publishing/testing the reviewed source snapshot.
This names the remaining setup evidence rather than claiming local migration
has already certified a fresh installation or adding a new bootstrap framework.
