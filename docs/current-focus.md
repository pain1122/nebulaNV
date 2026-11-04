# Current Focus - Media, Dependency Maintenance And B0

Updated: 2026-11-04. Execution order: **M -> D -> B**. Resume at **D7 Media**;
D4 remains open behind dependency and image compatibility gates.
This checklist ends at backend ecommerce release B0. F7/D3 Vite admin integration
will receive a separate checklist; it is outside this implementation scope.

## November 4 device handoff

**Next objective: finish Media's native CLI migration proofs.** Salar's serialized
install passed in3m46.1s with exit0. Actual CLI/client/adapter7.10.1, pg8.23.1 and
generated Media source are present. Candidate preparation passed three type
projects, 63 focused tests, 11 real PostgreSQL processing/derivative cases and
14 recovery helper tests. Installed source/test/tool types, typed lint, 63 focused
tests, the eight-service type gate (128 files), dependency security and contract
preflight (24 tests) now pass. Installed check results and publication receipt are
in the final section of the [maintenance execution report](reports/2026-10-31-dependency-maintenance-execution.md).
Do not infer installed/native-CLI/image acceptance from candidate results.

1. Confirm this checkpoint's installed checks in that receipt; run any explicitly
   pending source/test/tool type, eight-owner test-type, lock/security checks.
   Use existing Media `prisma-options`/CJS/config and exact caller trace in the
   report; no further implementation is presumed necessary.
2. With PostgreSQL18.6 ready, Salar runs `pnpm db:verify:media`, then
   `pnpm db:verify:media:upgrade`, stopping on failure. These are the next complete
   native CLI clean/populated upgrade proofs. No application rebuild is needed
   for these host checks. Record actual results; preserve first errors and cleanup.
3. After Media acceptance, trace the next D7 owner before changing it. Remaining:
   Taxonomy, Settings, Blog, User, Realm Auth and Tenant Authority; root inherited
   Prisma tooling also needs final reconciliation. Product/Order host gates are
   already accepted. Tenant compatibility maintenance does not resume F4 features.
4. Then follow D8's grouped runtime rollout and D4's remaining infrastructure/
   scanner gates before B0. Avoid one image build per host-owner migration.

For another device, clone/pull **main**, select `.node-version` (24.22.2), enable
Corepack/pnpm10.17.1 and use `pnpm install --frozen-lockfile`; do not resolve a new
lock or install CLI latest (currently an RC). See [Setup](../Setup.md) for shared
producer generation/builds and example env materialization. Installs/builds stay
Salar-owned. The current device's `.env`, `.nebula-storage`, journals, evidence,
Docker images/volumes and generated output are deliberately absent from Git.
Keep existing-device credentials private; another empty demo setup needs its own
bootstrap, not copied secret values in source. Fresh-machine bootstrap remains
the explicit B3 gate; successful source checkout does not prove it.

SQL proofs need the custom PostgreSQL image from
`docker/postgres/security.Dockerfile` (18.6/gosu1.20/Go1.26.10); a new device must
build/load it before starting PostgreSQL. Seaweed's verified archive is available
through the pinned release in `docker/seaweedfs/vendor-image.json`; follow
[storage supply and setup](../docker/seaweedfs/README.md), retaining verification.
Do not follow historical MinIO cutover instructions as a fresh bootstrap, attach
old PostgreSQL17 data to18, or assume images/tags exist on a different machine.

Reference map: [D2 accepted exit](reports/2026-10-28-d2-exit-proof.md),
[build cleanup](ASAP-BUILD-CLEANUP.md),
[Media/Seaweed acceptance](reports/2026-10-28-seaweedfs-transition.md),
[dependency decision](reports/2026-10-28-dependency-maintenance-assessment.md),
[current maintenance evidence](reports/2026-10-31-dependency-maintenance-execution.md).
Tenant/cloud/CDN/admin work stays deferred. This is a continuation checkpoint,
not a D7/D8/B0 completion or current-snapshot CI pass.

## Accepted baseline

D1, F5 Core and D2 Batches 0-4 are accepted. B0 is not signed off. Media scanning,
immutable promotion, cropped saved sizes, watermarking, descriptive metadata and
checksums have native/live evidence. Required signed upload headers are deployed.
On Oct 31 all sixteen running containers were healthy; the Media database wrapper
passed eight migrations, SQL constraints and eleven isolated database cases,
then cleaned its disposable database.

**SeaweedFS is active.** Gateway, Media and Seaweed are healthy, the initializer
exited successfully, and all eleven backend health checks pass. MinIO is stopped
with its data retained. The 302-object copy and persistent selection are verified;
Seaweed-specific feature/recovery acceptance passes; current-snapshot hosted CI remains open.
The original host frozen realignment passed without version or lockfile changes;
the separate Nov 3 Joi 18.3.1 maintenance update now changes the host lockfile and
passes its focused checks/fresh audit. Neither certifies all images. Build cleanup and the bounded
Order/Gateway watch pilot are accepted. This end-of-day checkpoint is being
published to main; current-snapshot hosted CI remains a separate B5 gate.

Keep tenant implementation, cloud/CDN, file manager, real payments, frontend work
and speculative package/env restructuring deferred. Storage credential namespaces
are compatibility primitives, not completed tenant isolation. Community storage
must operate without paid activation/subscriptions.

History: [previous focus checkpoint](reports/2026-10-31-current-focus-checkpoint.md),
[Media transition](reports/2026-10-28-seaweedfs-transition.md),
[dependency assessment](reports/2026-10-28-dependency-maintenance-assessment.md),
[host realignment](reports/2026-10-28-package-realignment.md),
[D2 exit ledger](reports/2026-10-28-d2-exit-proof.md).

## Execution rules

Each checkbox is one action. Its files are the starting dependency trace; its
completion condition is the exit gate. Record edited, unchanged-with-reason and
explicitly deferred consumers in the active evidence report. Follow the
[mandatory preparation checklist](testing/pre-suite-checklist.md) on every change;
extend the trace only when an actual dependency requires it.

Agent owns edits and cheap checks. Salar owns long installs/builds, Compose and
native/live proofs unless explicitly asking the agent to execute them. Preserve
valid passing evidence; repeat only affected checks. Group compatible image
changes before export. No routine force builds, cache pruning or demo-volume
resets. Never weaken contracts, inventory assertions or security policy for green.

## M - Finish core Media and SeaweedFS setup

Record M1-M7 results in the existing Media transition report. Already accepted
signed-header/API and worker/database proofs remain the baseline.
M1-M7 here are local Media task IDs, not the similarly named roadmap phases.

Execution: **M2 prepare storage -> M3 reconcile consumers -> M4 prepare image
supply -> M5 reconcile objects and activate -> M6 accept the running stack -> M7
close evidence**. M2-M4 may be checked together while preparing their shared
consumers. Keep live Media on MinIO until M5's prerequisites pass; prepared
configuration is not an activated provider. Every operational handoff records
exact PowerShell commands, prerequisites and expected results in the Media report.
Salar runs long commands and stops at the first failure.

- [x] **M1 - Complete the pinned SeaweedFS image security review.**
      Files: docker/seaweedfs/compose.proof.yml;
      scripts/storage/seaweed-s3-proof.mjs; scripts/backend.mjs security helpers;
      .github/workflows/ci.yml.
      Complete when: current authoritative release/support/license checks and
      actual image findings are recorded against a digest; blockers are resolved
      or explicitly open. A functional S3 pilot is not an image-security scan.
      Oct 31: latest release/license and registry/platform digests reverified;
      all 25 published advisory ranges reviewed. GHCR retry completed with a fresh
      DB: zero HIGH/CRITICAL Alpine findings, one HIGH in compiled go-jose 4.1.5
      (CVE-2026-116587; minimum fix 4.1.6). Selected current stable target is
      **go-jose 4.1.7**, released Oct 30, including further security fixes.
      The original vendor image was blocked; the patched hosted artifact now
      passes security review and local S3/restart proof. See the Media
      report for source/scan identities, compatibility cost and exact scope.
      Candidate recipe and isolated override are prepared under docker/seaweedfs/;
      static and native BuildKit checks pass with no warnings. Engine readiness
      is restored; native Compose comparison changes only candidate image/pull
      policy. First build passed go-jose tests/graph/hash guards, then failed on
      unrelated module ZIP downloads (Google proxy HTTP 403). Checksum-verified
      alternate proxy retry built successfully. Local candidate identity and
      embedded 4.1.7/compiler/source/module-patch checks pass; the hosted scan
      passes, and the hosted artifact's S3/restart proof now also passes.
      Salar selected a hosted build route to avoid local download restrictions:
      standalone .github/workflows/seaweed-vendor.yml builds/scans and exports a
      short-lived checksummed archive. Evidence-gate helpers/tests live under
      scripts/storage/seaweed-vendor-evidence\*.mjs. Hosted run
      [41203305981](https://github.com/pain1122/nebulaNV/actions/runs/41203305981)
      passed from isolated commit c26ca397: build, ten evidence tests, image scan,
      evidence validation and export succeeded. Downloaded archive checksum,
      embedded image config/layers and scan/version evidence are verified;
      local image load/config/layer verification passes. Nov 2: Salar reports
      all eleven backend readiness checks passing; the candidate tag still
      matches the verified import. Salar reports all four proof operations pass;
      agent inspection confirms session 0b263ed8a1e64a5246eefaed is complete and
      the healthy proof container uses that exact verified image. M1 is accepted;
      active Media still uses MinIO. Long operations remain Salar-owned.
      This is the same M1 vendor task, not full backend CI acceptance.

- [x] **M2 - Prepare persistent SeaweedFS alongside the active store.**
      Files: docker-compose.yml; docker-compose.release.yml; .env.example;
      deploy/.env.production.example; apps/media-service/.env.example;
      docker/seaweedfs/{compose.storage.yml,filer.toml,.env.storage.example};
      scripts/storage/{seaweed-setup,seaweed-setup.test,seaweed-storage-proof}.mjs;
      .gitignore; .dockerignore.
      Complete when: exact pinned-source behavior and both prepared renders agree
      on credential loading, scoped Media access, bounded repeatable bucket
      initialization, internal/public/native endpoints, readiness and separate
      persistent object/filer metadata paths. Verify initializer reruns and denied
      anonymous/out-of-scope access. App credentials must not grant admin access.
      Record CORS origins/methods/signed headers and prepare preflight assertions.
      Verify container recreation preserves stored bytes and metadata on the
      actual prepared topology; the M1 restart proof alone is insufficient.
      Use a new Seaweed volume and retain MinIO data plus a runnable rollback
      configuration. Do not activate Media or remove old storage in this task.
      Dependency trace and execution boundary are recorded in the Media report's
      Nov 2 M2 preparation section. Reconcile actual startup/boundary/inventory
      consumers before an active-stack handoff; do not test a half-switched stack.
      Nov 2: opt-in fragment and native bootstrap/recreation proof are prepared.
      Local/release renders preserve all 19 existing services; private generated
      compose.env carries only port/origins to avoid redirecting release Media.
      Root/Media env files and active Compose files remain unchanged. Salar's
      native startup and initialization/rerun pass. The first witness stopped on
      an incorrect 403-only header-preflight assumption; the proof now checks
      actual withheld browser permission, with the failed empty journal preserved.
      Fresh run 06d5f1e9e064cf004ee93b8b passes browser preflights, signed upload,
      scoped access, actual container recreation and owned cleanup. Agent confirms
      complete journal, different container ID, same accepted image and healthy
      server. M2 preparation is accepted. Media remains on MinIO; M3 is next.

- [x] **M3 - Reconcile storage-dependent runtime and tooling consumers.**
      Files: scripts/backend.mjs; scripts/backend.test.mjs;
      scripts/backend-dev-env.mjs; scripts/backend-dev.test.mjs;
      apps/media-service/src/config/env.validation.ts;
      apps/media-service/src/health.controller.ts;
      apps/media-service/src/media.service.ts;
      apps/media-service/src/processing/media-processing.storage.ts;
      apps/media-service/src/dto/create-media.dto.ts.
      Complete when: boot, native endpoints, health, backup assumptions, provider
      labels and their fixtures agree with M2's prepared topology. Prefer existing
      s3 compatibility labeling unless an actual requirement needs an enum change.
      Existing generic S3 behavior is preserved where sufficient. Relevant scoped
      tooling/env/storage and negative boundary checks pass without weakening
      signatures, conditional writes or upload binding. M2 and M3 changes may be
      prepared together; do not run active-stack startup until M5.
      Nov 2: existing backend tooling now resolves storage from the effective
      Media endpoint/healthy dependency; base MinIO remains selected alongside
      Seaweed. Strict release checks reject management and unused-store ports.
      Native checks cover actual effective MEDIA_S3 inputs without changing env
      precedence or unused fallbacks; Media scanner transport stays unsupported.
      Generic service storage/readiness/DTO logic is retained. Focused checks and
      actual base renders pass. Salar reports full backend-tooling 86/86 and
      backend-dev 16/16 passing, zero failures/skips. M3 preparation is accepted;
      M4 supply/bootstrap integration is next. Live activation still belongs to M5.

- [x] **M4 - Replace MinIO-specific CI and release image supply.**
      Files: .github/workflows/ci.yml; .github/minio-offline.yml;
      .github/seaweed-runtime.yml;
      .github/workflows/seaweed-vendor.yml;
      docker/seaweedfs/{vendor-image.json,compose.bootstrap.yml};
      scripts/storage/seaweed-vendor-evidence.mjs;
      scripts/storage/seaweed-vendor-evidence.test.mjs;
      scripts/storage/seaweed-setup.test.mjs;
      scripts/storage/seaweed-setup.mjs; package.json;
      scripts/backend.mjs source-scan scope;
      scripts/docker/release-image-inventory.mjs;
      scripts/docker/record-image-identities.mjs;
      scripts/docker/save-release-images.ps1;
      scripts/docker/load-release-images.ps1; scripts/backend.test.mjs.
      Complete when: a durable verified vendor source or reproducible build route
      supports fresh machines and CI under actual network constraints; the
      three-day M1 artifact alone is insufficient. Source/archive/config/layer
      identities, local/release coverage and count/hash assertions match the
      prepared topology. Verify imported config/layers without confusing Docker's
      local store ID with the archive config digest. Reconcile M3's startup and
      inventory consumers before handoff; retire MinIO supply only for the new
      topology while preserving the M5 rollback route. Review any new public
      vendor archive before publication. Final snapshot hosted CI remains B5.
      Register the new setup regressions in the regular hosted quality command;
      their focused local pass alone is not hosted CI coverage.
      Nov 2: supply manifest, archive/load checks and existing-image container
      bootstrap are prepared; 25 storage and seven focused CI/inventory tests pass.
      Both renders add only the initializer; current Media stays unchanged.
      Actual archive verification passes; Salar reports the initializer repeat
      and updated full tooling suite pass (counts not supplied). Prepared selected
      CI/local/release models validate with
      15 images and gated initialization. Base local Media remains on MinIO.
      Vendor release 431347730 is published as a non-latest prerelease; all eight
      server asset checksums/sizes and the source tag match the reviewed input.
      Public download and Docker load succeed; the final verifier exposed only
      omitted User/OnBuild versus Docker's empty-string/null defaults. The narrow
      correction and all 26 storage tests pass. Salar reports verify-loaded passes;
      agent inspection confirms the sanitized pinned-identity/layer receipt.
      M4 supply/bootstrap preparation is accepted; the missed two-sided boundary
      and its prevention are logged in the mandatory preparation checklist. Full
      current-snapshot hosted acceptance remains B5. Media activation stays M5.

- [x] **M5 - Reconcile owned objects and activate SeaweedFS.**
      Files: scripts/storage/; scripts/demo/gateway.mjs;
      scripts/demo/runner.mjs; scripts/demo/state.mjs;
      scripts/demo/commerce-runner.mjs; scripts/demo/commerce-state.mjs;
      both Compose files and the M2/M3 runtime configuration;
      docs/architecture/d2-demo-workflow.md; ignored .nebula-demo/ journals;
      Media stored object keys/provider labels.
      Requires accepted M2-M4 preparation. Complete when: the recorded copy or
      owned-fixture recreation route has reconciled objects, metadata, keys,
      checksums, Media rows/provider labels and journals, and Media is deliberately
      activated on the prepared Seaweed configuration. Bound writes/processing
      during transition so the inventory cannot drift; record the execution order
      for the selected route before mutation. Define rollback including any new
      post-switch writes; switching endpoints alone cannot reconcile them.
      Activation is conditional on that reconciliation and readiness, not merely
      a healthy empty bucket. Keep old storage intact through M6 acceptance. No
      unrelated fixture deletion or silent database/volume wipe.
      Nov 2: read-only plan finds 302 objects / 20,109,453 bytes and 250 currently
      deliverable references. All rows already use s3/media; copy preserves IDs,
      keys, rows and journals. Four intentionally cleaned retired outputs are
      distinguished from 200 required approved outputs. The bounded transfer
      helper's native copy receipt passes for all 302 objects; Gateway/Media and
      old MinIO are stopped, with its volume retained. Persistent local selection
      and native Media loopback env are prepared with hash-checked backups.
      Media-only credentials are in private media.env, not shared root .env;
      setup upgrades/reruns verify that derived file without rotating settings.
      Actual default Compose and Node inventory agree on fifteen images, and the
      selected release boundary passes. Forty storage tests and five focused
      hosted-flag tooling cases pass. A stale third-file registration assertion
      is corrected and logged. Salar reports 89 full tooling tests passing,
      successful selected startup and all eleven backend health checks green.
      Agent confirms actual Media s3/Seaweed routing, healthy running containers,
      successful initializer and stopped retained MinIO. M5 is accepted.

- [x] **M6 - Verify the running Media pipeline against SeaweedFS.**
      Files: apps/media-service/test/http/media.http.e2e.spec.ts;
      apps/media-service/test/grpc/media.e2e.spec.ts;
      packages/api-client/test/{media-processing-live,media-processing-recovery,
      media-derivatives-live,media-metadata-live,d1-references-live,
      f3-live-flows}.mjs.
      Complete when: prepared native/live proofs cover scan/promote/render,
      presets/crop/watermark/metadata, bad-file denial, immutable approved bytes,
      Product references and outage/restart recovery with owned cleanup on the
      exact activated image. Exercise browser-style OPTIONS preflight and actual
      upload with the required signed headers/origin, including denied origins;
      SDK upload success alone is insufficient. No admin UI implementation needed.
      Use existing test:media:\*:live, test:d1:references:live and test:f3:live
      package scripts; fix provider assumptions before handoff. Reuse Oct 31 SQL
      evidence unless a worker/store/schema change invalidates it. Distinguish
      default-suite skips from separately executed opt-in proofs; record actual
      commands/results and repeat only invalidated evidence.
      Nov 2 preparation catches Media recovery forcing the old base Compose file;
      it now honors the accepted default and has a native config-only check.
      Gateway-issued upload proofs now assert allowed/denied browser-style
      preflight and Origin-bearing PUT using the existing signed headers.
      Eleven focused recovery and 41 storage tests pass; native feature/restart
      proofs are now accepted as recorded below. Salar's whole-backend type gate passes all eight
      owners/125 files. The final Media Jest fallback is corrected from removed
      Supabase to Seaweed; Media-only no-emit recheck passes 21 files/errors=0
      and typed lint passes. Next: the recorded Media suite, derivatives,
      metadata, recovery, ready-Media references and F3 live sequence. The base
      processing proof is included in the three feature modes; don't run it twice.
      Salar reports the full six-command sequence passes. Detailed live/Jest
      counts were not supplied; database opt-in evidence stays separate. Agent
      confirms all sixteen selected running containers healthy after recovery,
      actual Seaweed provider preserved, MinIO stopped and initializer exit zero.
      M6 is accepted.

- [x] **M7 - Close the Media transition evidence.**
      Files: docs/reports/2026-10-28-seaweedfs-transition.md;
      docs/services/media-service.md; docs/packages/api-client.md;
      docs/docker-configs.md; docs/architecture/local-dev-and-docker-boot.md;
      docs/current-focus.md; TODO-ALTERNATIVE.md.
      Complete when: actual provider, source/images, security findings,
      persistence/rollback instructions and consumer proofs agree. Keep remaining
      limits explicit. Advance to maintenance only after M1-M6 are accepted.
      Nov 2: current docs, runtime/provider/supply, native evidence, retained
      rollback and known limits are reconciled. M1-M7 are accepted. No image,
      credential, data, schema or runtime change follows this doc closure.
      Maintenance D1 is next; B0/B4/B5 and later Vite/tenant/cloud work remain open.

## D - Close dependency maintenance

D1-D12 here are maintenance task IDs, not roadmap phase D1. Record execution in
docs/reports/2026-10-31-dependency-maintenance-execution.md. D9-D11 add bounded
documentation, tooling and waste control; the former D9 closure is now D12.
Apply the ongoing hygiene checks during D2-D8; close cleanup after the rollout.
Reverify authoritative versions/support at execution time;
Oct 28 candidate versions are historical observations, not automatic targets.

### Execution discipline

Maintenance is the active delivery priority before B0 reconciliation and new
feature work. Its outcome is a reproducible, supported and understandable backend
baseline, with evidence for retained choices as well as upgrades.

- Keep one active maintenance task. Before editing, record the current mechanism,
  confirmed requirement, exact producer/consumer files and the smallest justified
  correction in the execution report. Review affected documentation and tooling
  ownership during each task; D9-D11 consolidate those results rather than defer
  correctness until the end.
- Resolve each cohort's compatibility and migration cost before implementation.
  Classify required fixes, stale guidance, optional modernization and future
  scaling separately. Current stable compatible versions are the goal; a major
  replacement needs an evidence-backed decision, not an automatic latest install.
- Prepare each coherent change with an identifiable before/after diff, dependency
  inputs and recovery path. Run applicable focused checks before starting another
  change. If owners must change together, record that dependency and validate the
  combined slice; never accumulate known broken intermediate states until D8.
  Install/generate when needed for meaningful checks; D8 groups final image
  rollout, not all validation into one late step.
- Record review complete, source prepared and native/deployed accepted separately
  in the report. Each pending proof names its command, owner and expected result.
  A task with required evidence pending stays unchecked. Preserve passing evidence
  unless changed inputs or relevant findings invalidate it; mock/host results do
  not certify PostgreSQL, native modules, packaged images or hosted CI.
- Use the mandatory preparation receipt before every broad handoff. Salar runs
  long installs/builds/suites and operational commands; the agent owns tracing,
  narrow fixes and cheap checks. Consolidate compatible heavy proofs without
  hiding which change they cover, and inspect failures before requesting rebuilds.
- D12 must reconcile the final lockfile, local/CI/image inputs, supported-version
  decisions, actual required maintenance proofs and D9-D11 cleanup dispositions.
  Unresolved required failures prevent closure. Name any supported exception and
  its owner/revisit trigger; leave B0 release-wide evidence to B rather than claim
  maintenance alone proves the release.

Nov 3 full trace is recorded in the maintenance execution report under
"Full dependency, consumer and deprecation trace": nineteen owners, all 98
declared libraries, the 1,669-package lock graph, exact callers/config/command
consumers, publisher metadata, retained logs and actual container versions.
Use its F01-F12 findings and local full-trace evidence; do not repeat discovery
or treat a newer version alone as a confirmed defect. Full audit data is now
collected: reported paths identify 70 high/critical backend-tooling records across
18 package names, including seven critical records in four libraries. D5 owns
their remediation; the accepted D2 high/critical production gate stays valid.

- [x] **D1 - Finalize the compatible maintenance cohort.**
      Files: root package.json; pnpm-lock.yaml; pnpm-workspace.yaml; .npmrc;
      apps/_/package.json; packages/_/package.json;
      docs/reports/2026-10-28-dependency-maintenance-assessment.md.
      Complete when: installed/locked/image versions, current supported targets,
      affected owners and concrete exceptions are recorded. Reuse the completed
      frozen realignment; do not reinstall just to repeat its result.
      Reuse M1's accepted SeaweedFS/go-jose version, digest, scan and compatibility
      receipt when available; do not repeat that work here unless changed inputs,
      a new relevant advisory or a freshness requirement invalidates the evidence.
      Nov 2: fresh 19-importer/516-entry host comparison has no installed drift;
      one duplicate runtime/dev declaration is explained. Actual eleven-image
      inventory finds nine older Nest/gRPC deployments. Fresh publisher targets,
      compatible peer ranges, supported infrastructure lines and concrete
      TypeScript/build-tool exceptions are recorded in the maintenance execution
      report. No version/lock/image change is applied. One grouped rollout stays
      D8 after source preparation; D2 audit attribution is next.

- [x] **D2 - Resolve dependency-audit attribution and shipping scope.**
      Files: scripts/backend.mjs; scripts/backend.test.mjs;
      root/backend owner and packages/config, packages/grpc-auth package.json;
      apps/web/package.json; pnpm-lock.yaml; .github/workflows/ci.yml;
      docker-compose.release.yml; docs/architecture/testing-and-health.md.
      Complete when: unmatched Web paths are classified from evidence rather than
      presumed backend-tooling exposure; scan:dependencies:backend stays strict.
      Patch vulnerable shipping Web consumers or explicitly exclude unshipped Web
      from B0 with a tracked security owner. No admin redesign or hidden skip.
      Accepted Nov 3: Joi 18.3.1 installed across fourteen direct owners and
      twenty-two shared resolutions; lock review passes. Eight classifier checks,
      32 focused compatibility tests and two shared type checks pass. Fresh audit:
      runtime=0, tooling=0, deferred-web=47, unresolved=0; unknown ownership blocks.
      Legacy Web is absent from backend release/build selection; findings remain
      owned by F7/D3 before reuse. All sixteen running containers and eleven
      readiness checks pass, but image contents are unchanged. Actual image
      update/parity/scans remain D8/B5-owned. See the maintenance execution report
      for exact input hashes, scope limits and preserved audit receipts.

- [x] **D3 - Align the selected supported Node runtime.**
      Files: .node-version; root/affected owner package.json engines and Node types;
      docker/backend.Dockerfile; scripts/backend.test.mjs;
      .github/workflows/ci.yml;
      scripts/backend-dev.mjs; scripts/backend-dev.test.mjs; Setup.md;
      README.md; AI_CONTEXT.md; docs/docker-configs.md;
      docs/architecture/local-dev-and-docker-boot.md.
      Complete when: local instructions, CI and build/runtime images agree on a
      supported compatible baseline; native Sharp/bcrypt, generated Prisma imports
      and watch cleanup pass. Preserve pinned pnpm unless D1 justifies changing it.
      First resolve support/native-library compatibility and trace both image
      bases, Corepack bootstrap, CI setup and local instructions. D1's proposed
      Node-major target is not an applied change or automatic replacement order.
      Trace includes exact Node/Corepack assertions in scripts/backend.test.mjs,
      native/generated engine probes and ts-node/watch consumers. Node 22 is
      still LTS; choose the supported target from compatibility and product
      horizon, not a false EOL assumption. Full-scope audit attribution is recorded
      in the maintenance report; use its concrete parent/range constraints before
      finalizing dependent maintenance changes. No further audit collection is
      needed before source preparation.
      Selected compatibility baseline: Node 24.22.2 LTS, the newest explicitly
      listed Prisma 6 line and the existing backend type major. Node 26 remains
      an option after its Prisma/native/bootstrap proof; Node 22 is not EOL.
      Nov 3: Salar selected Node 24.22.2/pnpm 10.17.1. Agent checks explicitly
      on Node 24 pass: 12 real bcrypt/Sharp/Prisma native observations, all eleven
      compiled runtime imports, ten focused preload/watch/process checks,
      32 schema/security/registry tests and four topology/CI checks. No dependency
      reinstall or runtime code fix was needed. Salar reports full tooling 91/91
      and watch 16/16 pass, zero skipped, including the real pinned pnpm/Turbo
      producer/cache-restoration proof. D3 host acceptance is complete;
      Linux-image and hosted acceptance remain explicitly D8/B5-owned.

- [ ] **D4 - Apply selected infrastructure maintenance patches.**
      Files: both Compose files; docker/seaweedfs/; .github/workflows/ci.yml;
      scripts/backend.mjs; scripts/backend.test.mjs;
      scripts/docker/release-image-inventory.mjs; docs/docker-configs.md.
      Complete when: PostgreSQL, Redis, ClamAV and storage versions/digests have
      current support decisions and applicable readiness/persistence/scanner
      evidence. Preserve accepted SeaweedFS inputs and archive identity checks;
      database/storage major changes require a separately justified need.
      F02: current freshclam logs show CDN 429/403 download denials and Oct 6
      signatures. Restore supported updating and verify freshness as well as
      scanner functionality; healthy clamd alone is insufficient.
      Nov 3: D3 host acceptance passes 91 tooling / 16 dev tests. Both Compose
      files and the owned R3 fixture now select immutable PostgreSQL 17.11/Trixie
      and Redis 7.4.12/Bookworm references. Redis Alpine's published OS is EOL;
      no database major or new vendor is introduced. Real catalogs show only
      text/UUID btree_gist keys, no ltree/pgcrypto or replication slots. Keep
      ClamAV 1.4.6 on supported Alpine 3.24.2. Selected PostgreSQL/Redis downloads
      now pass native index/config/layer verification; running containers and
      volumes are unchanged. The Nov 3 scanner update received CDN 403 while
      Salar's VPN was off; it is now on. The exited updater is restored as one
      process, preserving cooldown until Nov 4 10:52:58 UTC / 14:22:58 Tehran.
      Image scans, preserved-data rollout, readiness/replay and successful
      post-cooldown signature update/reload remain pending. Follow the D4 receipt
      in the maintenance report; do not restart the stack yet.
      Checkupino comparison: its recorded fix was a corrected Docker VPN/TUN
      route and ordinary FreshClam, not a GitHub image build. A bounded shared
      Docker-network metadata check now reports DE egress; actual post-cooldown
      CDN download remains unverified. Preserve the Nov 4 cooldown and verify
      the next update before introducing a hosted database-transfer mechanism.
      All three image reports now match the intended digests/layers. Existing
      policy retains 63 PostgreSQL / 33 Redis unfixed Debian OS records. Redis
      has zero blockers; PostgreSQL has 26 reported Go-stdlib findings in gosu
      requiring applicability review. The publisher's refreshed scanner now
      passes with zero HIGH/CRITICAL findings on Alpine 3.24.3; its verified 1.4.6
      digest is selected in both Compose defaults. Four affected tests and native
      config/archive checks pass; the old scanner is still running. No custom
      rebuild or blanket vulnerability exception is selected. Actual gosu bytes
      are extracted for applicability analysis; no helper is replaced.
      Salar requests engine mirrors: Arvan then Liara are merged into the host
      daemon config after exact pinned PostgreSQL/Node/ClamAV metadata/blob checks,
      preserving enabled 40GB builder GC and a private byte-for-byte backup.
      Mirrors are now active. Desktop restart timed out and only part of the
      stack returned; agent direct-start recovery restores all sixteen healthy
      containers and eleven readiness passes, preserving original IDs/images and
      infra mounts. Native new-image pull remains pending. Keep source image
      identities and existing builders unchanged;
      mirrors cover Docker Hub, not FreshClam or Go/npm/GHCR downloads. No new
      image rollout is accepted yet; follow the report's existing-container
      restart receipt rather than applying unaccepted source pins prematurely.
      End-of-day Nov 3: Salar runs the pinned Go 1.26.10 / govulncheck v1.9.0
      diagnostic. Tool/module downloads succeed, but vulnerability database GET
      https://vuln.go.dev/index/modules.json.gz returns HTTP 403; exit code 1.
      The saved JSON stream is partial, not a completed analysis; all 26 gosu
      findings remain unresolved. Retain it and the exact helper identity.
      Resume Nov 4 by resolving/validating the supported Go vulnerability-DB
      access route before repeating the diagnostic. No blanket exception,
      helper replacement or custom PostgreSQL build is authorized by this failure.
      Separately, FreshClam's next controlled update must respect its existing
      Nov 4 14:22:58 Tehran / 10:52:58 UTC cooldown and use verified Docker VPN
      routing. D4/image rollout remains open; latest accepted runtime state is
      sixteen healthy containers, eleven readiness passes and active mirrors.
      Nov 4 resume: all sixteen main containers remain healthy and all eleven
      actual backend readiness probes pass; no restart is needed. With the VPN
      off, Windows/Docker database probes still return 403. After Salar enables
      it, the exact pinned Go image on Docker's default network downloads the
      official database metadata and both compressed indexes successfully.
      All 26 original gosu CVEs map to Go IDs present in the stdlib index. This
      verifies index coverage, not symbol applicability or a clean binary. Next:
      Salar reruns the bounded analysis into a separately dated output, preserving
      yesterday's partial stream. No image deployment or exception is accepted.
      FreshClam remains untouched before today's 14:22:58 Tehran cooldown expiry.
      Completed diagnostic: Salar reports exit 0; the complete stream contains
      266 messages, including 71 finding messages / 59 unique advisory IDs.
      JSON mode returns zero even with findings. All 26 original CVEs are covered
      by emitted advisory records, with zero vulnerable-function matches (one
      has an os-package match). Separately, GO-2026-6686 / CVE-2026-61801 matches
      three Moby user-parser functions actually used by gosu. Its published
      severity is Moderate and requires attacker-controlled user/group files;
      neither Compose mounts such files into PostgreSQL. No remote exploit is
      demonstrated. Official gosu 1.20 pins the fixed parser 0.4.1, but the
      selected PostgreSQL image still ships gosu 1.19. Keep the strict scan gate
      unchanged; choose reviewed applicability handling or a narrowly maintained
      helper update before any PostgreSQL rollout. Full results/tradeoffs are in
      the maintenance report; no custom image or exception is implemented yet.
      Salar clarifies Nov 4: all current project data is disposable seeded demo
      data. Existing dummy rows/objects/history need not survive a necessary
      rollout; prefer recreation and seeder verification over data-preservation
      work. This does not waive migration/rollback correctness proofs or select
      a custom PostgreSQL image. No reset has been performed by this clarification.
      Salar now explicitly selects stable PostgreSQL 18.6 plus latest gosu 1.20.
      Prepare the pinned derived image, PostgreSQL 18 volume layout, initialization,
      CI/release consumers and focused checks together; long build/scan/rollout
      remains operator-owned. Fresh database creation is allowed; application
      migration/seed compatibility must still be proved before accepting rollout.
      **Recheck on November 19, 2026:** PostgreSQL 19 GA is planned for that date,
      conditional on release readiness. Verify actual final release, current
      official image/helper, Prisma/driver support and relevant native proofs;
      review whether our helper customization can be retired. This is a review
      checkpoint, not automatic adoption of a release candidate or a scheduled job.
      Preparation complete: pinned helper recipe, all six Compose image references,
      fresh pgdata18 layout, CI build/scan ordering and dynamic release inventory
      agree. Nine focused CI/inventory/security-policy checks and 125 test-file
      type checks pass; BuildKit recipe validation has no warnings. The actual
      vendor build, fresh image scan, PG18 initialization/migrations/seeds and
      runtime acceptance remain pending. Salar runs the image build next; the
      currently running PostgreSQL 17 database has not been replaced.
      First full build stops on an upstream Moby 0.4.1 test-fixture defect, before
      runtime export. The exact publisher test-only correction is prepared in
      an isolated module copy; runtime dependency versions are unchanged and all
      test cases remain. Re-establish focused native parser acceptance before
      retrying the full image. Failed output is preserved in the D4 evidence.
      Correction verified: the actual helper-tests stage passes the full parser
      package (all eleven top-level tests retained), both production-file manifest
      comparisons, module-cache verification and unchanged source module hashes.
      No runtime image is exported by this focused proof. Focused source/CI checks
      pass; Salar can retry the same full build with its warmed caches. Runtime
      helper tests, image scan and PG18 rollout are still pending.
      Full build now passes, including named/numeric IDs, supplementary groups,
      non-root and invalid-user rejection. Loaded image/base layers, inherited
      entrypoint/data layout, gosu version, actual helper SHA and provenance agree;
      embedded parser log shows eighteen passing top-level tests across all files.
      The expected unknown-user error is the successful denial case. Next: Salar
      scans the built image with a fresh Trivy database; review actual findings
      under the existing policy before initializing PostgreSQL 18. Running
      PostgreSQL remains 17; no database/seed reset has occurred.
      Fresh Trivy review passes the existing demo gate: zero blockers and zero
      gosu HIGH/CRITICAL findings; 63 unfixed Debian records remain visible,
      including one Critical libxml2 record. Scan store identity, all 17 layers
      and effective runtime configuration match the built image. Next operator
      gate: stop all eleven applications and initialize only PostgreSQL 18 on
      pgdata18, then verify server version and data directory. Migrations, cache/
      journal reconciliation and seeding follow; no broad backend rebuild is needed.
      Fresh startup accepted: PostgreSQL 18.6 is healthy on pgdata18 with the
      correct data directory and nine initialized owner databases. All eleven
      applications are stopped. Old D1/D2 journals are archived under .nebula-demo/
      archive-pg17-before-pg18-20261104; both verified project Redis caches are
      cleared. No Seaweed objects/configuration were deleted. Next: Salar runs
      both existing role initializers, then nine-owner migrate-deploy/status/base
      seed through the existing runner with explicit local schema-owner URLs.
      This avoids rebuilding application images or migrating as restricted roles.
      The inline Node handoff failed before Prisma launch because it omitted
      pnpm's required lifecycle context. Fixed with the root `pnpm db:prepare`
      command, reusing boot's migration/status/base-seed function. Seven focused
      checks pass; a real pnpm lifecycle launches Prisma and reads the intended
      127.0.0.1:15432 database, reporting the expected pending User migrations.
      All three prerequisite runtime roles exist. Next: Salar runs db:prepare;
      no container restart or repeat of the role initializers is required now.
      Owner preparation now passes: all 45 migrations across nine databases and
      all base seeds complete. Native reads exposed default grants permitting
      runtime writes to newly created Prisma history tables; the existing role
      scripts have now reapplied their SELECT-only restriction successfully.
      db:prepare/boot now perform that reconciliation after DDL/seeds; seven
      focused tests cover order and fail-fast behavior. Next: Salar restores the
      eleven existing application images without builds/dependency upgrades,
      checks readiness, then seeds/verifies D1 and D2 showcase profiles.
      Restoration/showcases pass: all eleven applications are healthy with the
      same witnessed image IDs; D1 seed/verify has 18 products, 2 Media and 7
      taxonomies; D2 seed/verify has 7 orders, 3 products and a ready cart. Agent
      repeats all eleven readiness reads on Node 24 successfully. Operator logs
      show the parent shell still used Node 22.14.0; fnm exec only changed its
      child, not that shell. Keep the passing functional evidence, switch the
      shell to 24.22.2, then verify existing showcases and run the named PostgreSQL
      18 SQL/rollback and F3 regressions. Redis/scanner rollout and FreshClam
      freshness remain separately open; D4 is not complete.
      Nov4 PG18 regressions: demo-payment SQL and all six F3 profiles pass on
      Node24. Media SQL passes, but its inherited Jest config needs an explicit
      ts-node loader; that fix now passes actual config/test-selection and lint
      checks. Retry only db:verify:media. Five raw parent-RESTRICT proof assertions
      now require PG18's exact 23001; invalid child references still require 23503. Native probing additionally proves Prisma 6.16.2 fails to map 23001
      to P2003, affecting Product hard-delete conflict translation and the stock
      proof's unchanged runtime assertion. Do not hand off that known-failing
      stock proof or close PG18 acceptance. Prepare D7's supported Prisma/adapter
      migration next, ahead of unrelated D5/D6 upgrades; no FK weakening or
      internal-message parsing workaround. Exact traces/results are in the
      maintenance report's November 4 regression section. D1 upgrade and Node24
      showcase verification results were not included in the latest attachment.
      Media retry is now operator-accepted: all eight migrations/status checks,
      processing/derivative SQL constraints and complete claim, lease, atomic
      replacement, retry, deletion and watermark database proofs pass. No repeat
      is needed for unchanged inputs. Next is D7's isolated 7.10.1 adapter proof;
      keep D4 open for the stock/client incompatibility and remaining infra work.

- [ ] **D5 - Apply the selected compiler/test/lint compatibility cohort.**
      Files: root/affected owner manifests; pnpm-lock.yaml; tsconfig.base.json;
      affected apps/_/tsconfig_.json and packages/_/tsconfig_.json;
      root/owner ESLint and Jest configs; scripts/check-backend-test-types.mjs;
      turbo.json; packages/api-client/scripts/generate-client.mjs.
      Complete when: applicable deprecated resolution settings are corrected;
      compiler API, ts-jest, typed lint and browser/React Native client checks
      remain compatible. Warning suppression is not migration. Native TypeScript
      major changes require actual compiler-API compatibility, not assumed speed.
      F03/F05-F07: ESLint 9 is EOL; trace four baseUrl and eight explicit node10
      settings plus inheritance. Remove three redundant @types/helmet stubs with
      owner checks; resolve optional SWC-helper range mismatches and parent-owned
      deprecated transitive packages. Avoid blind global overrides or suppressed
      warnings. Full exact paths and compatibility constraints are in the report.
      Full-scope audit adds critical Handlebars (ts-jest), shell-quote
      (concurrently), decompressor and piscina (SWC tooling) plus high findings in
      the existing test/lint/CLI dependency graph. Resolve through compatible
      parent/transitive updates, then verify the full audit before closing D5.
      No force-fix, broad cross-major override or reliance on a production-only
      green result. Exact advisories, minimum ranges and consumer paths are in
      the Nov 3 full-scope audit section of the maintenance report.

- [ ] **D6 - Resolve the Nest/framework maintenance cohort.**
      Files: root/owner/shared manifests; pnpm-lock.yaml; apps/\*/src/main.ts;
      affected module/config/health files; packages/config/src/;
      packages/grpc-auth/src/; Gateway DTO/OpenAPI tests.
      Complete when: compatible framework packages agree across actual auth,
      validation, lifecycle, worker and transport consumers. Apply a major with
      scoped proofs or document the concrete supported compatibility exception
      and upgrade path. Do not replace validators/test runners by default.
      Full audit also records five low/moderate qs findings through Express and
      one moderate js-yaml finding through Gateway Swagger. Preserve query,
      validation and OpenAPI behavior when preparing compatible corrections;
      zero high/critical runtime findings is not a zero-advisory claim.

- [ ] **D7 - Resolve Prisma maintenance independently.**
      Files: root and nine Prisma owner manifests; each owner's
      prisma/schema.prisma, generators, seeds and Prisma service; scripts/backend.mjs;
      docker/backend.Dockerfile; packages/migration-artifacts/; scripts/db/.
      Owners: Blog, Media, Order, Product, Realm Auth, Settings, Taxonomy, Tenant
      Authority and User.
      Complete when: CLI/client/config/generation/runtime versions agree. A major
      needs its own exact owner trace and SQL/upgrade/recovery evidence; otherwise
      record the concrete supported exception and next migration gate. Do not
      select an RC through latest. Dormant-owner compatibility work does not
      resume tenant feature implementation.
      F04: upstream Prisma 6 security support ends Nov 19, 2026. Account for this
      deadline; do not sign off an indefinite v6 exception past support. Eight
      package-level seed configs are deprecated; all nine owners and generated
      path/native-engine proofs must participate. Reject mismatched CLI latest
      (8 RC) versus client latest (7 stable) installs.
      Required PG18 compatibility correction: the installed 6.16.2 Rust client
      surfaces RESTRICT 23001 as an unmapped ConnectorError. Upstream adapter
      correction is documented in Prisma 7.10.0. Advance this cohort's preparation
      after the isolated Media retry; trace each changed owner's full consumers
      before its installation. Product migrates first to unblock stock; eight
      remaining owners stay explicitly tracked under D7.
      Preserve P2003/409 dependent-delete assertions and prove the actual selected
      generated client against PG18 before handing off broad suites or rebuilding
      application images. PostgreSQL migration success alone cannot close D4.
      Isolated pilot prepared in .ci-evidence/dependency-review/d7-prisma/pilot/:
      matching 7.10.1 packages, CJS generator/config, unchanged Product model
      definitions and a separate pnpm workspace. Actual pnpm root resolves to
      that pilot; 62 Prisma consumer paths are inventoried for the later full
      trace. Isolated install, generation and TS5.9 compilation now pass. The
      actual client/adapter7.10.1 on PG18.6 returns P2003 for the exact held-Product
      RESTRICT rejection; existing Product hardDelete returns
      product_has_dependents/409. Decimal/date reads, transaction rollback,
      invalid-child rejection, valid deletion after hold removal, pool shutdown
      and owned database cleanup pass. Product's configuration, generated CJS
      path, runtime/SQL callers, Docker/watch inputs and real typed lint projects
      are now prepared. Candidate source/test/tool types, 63 focused tests,
      owner-native stock/replay/conflict/rollback/schema/shutdown and CLI seed/
      temporary-schema override checks pass. Root tooling cache/import/watch
      checks pass. Root install/generation now succeeds; actual Product7.10.1,
      all three installed type projects and 63/63 focused tests pass. Security
      review finds eight high findings through CLI Ajv8.17.1 -> fast-uri3.1.0;
      a parent/version-scoped3.1.9 override is prepared within Ajv's range.
      The transitive refresh now passes: Ajv actually binds3.1.9, legitimate
      URI/schema-reference validation and malicious-port rejection pass, and
      the unchanged dependency gate reports runtime0/tooling0/unresolved0 with
      47 deferred Web findings. Installed Product/CLI engine versions remain
      matched7.10.1. Salar's complete db:verify:d2:stock now passes: populated
      preservation/first-error rollback, exact constraints, replay/no oversell,
      multiline rollback, finalization/cancellation/tombstones, admin overwrite
      protection, variants and boundary/refund cases; owned DB cleanup succeeds.
      The five remaining Product host gates now pass: clean/populated native CLI
      migration, finalized restoration, coordination and demo-payment consumers.
      Preserve Product7/Order6 acceptance; installed/image/D7-wide claims remain
      distinct. Order's source migration is now prepared: config/CJS generator,
      owner adapter, 24 generated-import consumers, seven SQL constructors,
      typed projects, unit registration and Docker config input. The candidate
      uses the identical audited Product7 dependency bytes. Three type projects,
      typed lint, 96 focused tests, real cart/money/receipt-RESTRICT/rollback/
      shutdown SQL and empty CLI seed checks pass. Order install now passes:
      actual CLI/client/adapter7.10.1 and pg8.23.1 match Product; installed types,
      typed lint, 96 focused tests, native owner/driver checks and strict security
      gate pass. Eight-owner test types pass (127 files); all 19 workspace lock
      importer declarations match. Salar now reports all nine complete installed
      Order host SQL gates pass; preserve those Product7/Order7 inputs.
      Media's full owner/caller trace and CJS/config/adapter migration are prepared.
      Candidate source/test/tool types, typed lint, 63 focused tests, 11 actual
      processing/derivative DB cases, compiled recovery selection/source fixture
      loading and zero-connection cleanup pass. Fourteen recovery helper tests
      pass; models/eight migrations and external contracts are unchanged.
      Media root install now passes. Installed identity/lock/security/types,
      63 focused tests and eight-service types (128 files) pass; current-snapshot
      contract preflight passes24 tests. Next: the complete native clean/populated
      Media CLI proofs, db:verify:media then db:verify:media:upgrade.
      Candidate results do not certify the installed graph or running image.
      Six other owners and all three runtime images remain separate; D7/PG18
      sign-off stays open. The missed pilot audit remains in the preparation ledger.

- [ ] **D8 - Reconcile the installed and packaged dependency cohort.**
      Files: pnpm-lock.yaml; docker/backend.Dockerfile; docker-bake.hcl;
      scripts/docker/backend-build-graph.mjs;
      scripts/docker/backend-build-graph.test.mjs;
      scripts/docker/verify-runtime-imports.mjs; scripts/backend.mjs;
      scripts/backend-dev.mjs; .github/backend-cache.hcl; turbo.json.
      Complete when: one grouped rollout has approved inputs, native/artifact
      parity and actual in-image versions matching the lockfile. Preserve graph
      selection, injected shared outputs and cache correctness; source parity
      alone does not establish dependency parity.
      F01/F07: all eleven running containers still have pre-patch Joi (nine
      18.0.1, Media/Gateway 18.2.6). Enforce actual patched bytes before B0. Review
      the global glob override forcing CLI's requested 11.0.3 to 10.4.5 rather
      than preserving an incompatible stale pin through toolchain changes.

- [ ] **D9 - Reconcile canonical documentation and navigation.**
      Files: docs/README.md; README.md; Setup.md; AI_CONTEXT.md;
      docs/current-focus.md; TODO-ALTERNATIVE.md; docs/services/;
      docs/packages/; docs/architecture/; relevant docs/reports/.
      Complete when: roadmap owns phase order, current-focus owns active actions,
      service/package/operations notes describe current behavior, and dated reports
      hold evidence. Reuse docs/README.md as the index; fix conflicting current
      claims and links. Condense completed handoffs in current-focus into accepted
      checkpoints with evidence links. Mark superseded guidance explicitly;
      preserve migration, rollback, F4 audit and accepted historical evidence.

- [ ] **D10 - Reconcile tooling ownership and repository patterns.**
      Files: scripts/; root/owner package.json commands; .github/workflows/;
      docker/; scripts/backend.mjs; scripts/backend.test.mjs;
      scripts/docker/; turbo.json; owning service/package notes.
      Complete when: each reviewed tool has a purpose, entrypoint and disposition
      in the maintenance report. Trace package commands, CI, Docker COPY inputs,
      dynamic inventories, tests and documented operator commands before moving,
      merging or removing anything. Use existing domain folders and shared helpers
      where real consumers justify them; retain active proofs and seed/reset tools.
      A missing text reference alone does not prove a script is unused. No broad
      architecture rewrite, package split or cosmetic service renaming.
      F08/F09: six clean scripts call undeclared/uninstalled rimraf; resolve the
      command dependency with guarded-path checks. Ten lint configs deliberately
      borrow Auth's dev tooling; distinguish that optional tooling ownership
      cleanup from runtime service dependencies. Seven absent override targets
      and deferred Web/vendor duplication are review candidates, not automatic
      removals or permission to resume frontend work.
      Full audit identifies unused-candidate Nx 21.5.3 with three high records:
      no active command/import/Nx config was found, but root dependency and its
      ignored-build entry remain. Complete the caller review before removal;
      preserve unrelated Redis NX flags. Prefer removing a verified unused tool
      over introducing another build-framework upgrade solely to keep it.

- [ ] **D11 - Apply a measured artifact and disk-retention cleanup.**
      Files: .gitignore; .dockerignore; .ci-evidence/; .security-reports/;
      root build logs/archives; scripts/docker/; docs/ASAP-BUILD-CLEANUP.md;
      docs/docker-configs.md; maintenance report.
      Complete when: measured outputs have keep/rotate/remove decisions, owners,
      retention limits and regeneration/retrieval instructions; record bytes
      reclaimed and what remains. Keep raw logs in existing ignored output folders.
      Review duplicate vendor downloads, old snapshots, generated outputs and
      Docker containers/images/cache together with their callers and rollback use.
      Protect private envs, .nebula-storage/, .nebula-demo/, persistent volumes,
      migrations, fixtures, required generated contracts and accepted proof receipts.
      Stopped MinIO is deliberate rollback data. Preserve the approved 40GiB cache
      target and useful warm layers. No blanket prune, volume deletion or dependency
      reset; only verified owned targets, with heavy cleanup handed to Salar.

- [ ] **D12 - Close the maintenance ledger.**
      Files: the maintenance execution report;
      docs/reports/2026-10-28-dependency-maintenance-assessment.md;
      docs/reports/2026-10-28-package-realignment.md;
      docs/ASAP-BUILD-CLEANUP.md; docs/current-focus.md; TODO-ALTERNATIVE.md.
      Complete when: selected cohorts have actual results and retained older
      versions have concrete compatibility/replacement reasons, support/security
      status and upgrade paths. D9-D11 include canonical-doc ownership, tooling
      dispositions and measured cleanup/retention results. Optional package
      splits/env redesign remain deferred; unresolved required maintenance proofs
      or security blockers prevent maintenance sign-off.

## B - Reconcile backend ecommerce release B0

Record results in docs/reports/2026-10-31-b0-release-evidence.md, creating it when
B1 starts. Feature history remains valid only for the inputs actually tested.
This section adds no product features.

- [ ] **B1 - Reconcile the exact B0 requirement-to-evidence ledger.**
      Files: TODO-ALTERNATIVE.md B0 gate;
      docs/reports/2026-10-12-d1-exit-report.md;
      docs/reports/2026-10-28-d2-exit-proof.md;
      Media transition and maintenance execution reports.
      Complete when: each B0 row identifies source/image inputs, observed versus
      operator/hosted results and only missing/invalidated proofs. Keep accepted
      history; do not treat old CI as coverage of changed inputs.

- [ ] **B2 - Verify the integrated Gateway-only commerce journey.**
      Files: packages/api-client/test/{d1-product-live,d1-variants-live,
      d1-references-live,d2-cart-live,d2-checkout-live,d2-checkout-recovery,
      d2-demo-payment-live,d2-order-cancellation-live,f3-live-flows}.mjs;
      root/client package scripts. Admin reads use d2-checkout-live.mjs
      with --admin-reads; payment/cancellation modes use the same entrypoint.
      Complete when: B1's necessary proofs cover admin publication, customer
      Cart/Checkout, immutable Order, permitted admin transition, exact stock,
      role/owner denial, replay and affected degraded-dependency recovery on the
      accepted images. Reuse unchanged proofs; prepare fixtures/health and
      preflight before broad handoff. Demo payment is not real settlement.

- [ ] **B3 - Verify repeatable showcase and limits demo setup.**
      Files: scripts/demo/{run,gateway,runner,state,demo.test,commerce-catalog,
      commerce-runner,commerce-state,commerce.test}.mjs;
      docs/architecture/d2-demo-workflow.md; relevant Product/Order/Media seeders.
      Complete when: applicable profiles pass seed/verify/rerun/owned reset/
      recreate against final storage/contracts, preserving immutable Order history
      and unrelated data. Honor journal recovery, signed headers, current versions,
      configured shop currency and bounded rate-limit handling.
      Fresh clones do not inherit the ignored local storage/Compose settings.
      Verify prepared Seaweed selection/bootstrap in a clean environment before
      advertising a fresh release recipe; bare base Compose is retained MinIO
      rollback. Existing workspace health is not clean-machine setup evidence.

- [ ] **B4 - Verify the final release-image recovery package.**
      Files: docker-compose.release.yml; deploy/.env.production.example;
      scripts/docker/release-image-inventory.mjs;
      scripts/docker/record-image-identities.mjs;
      scripts/docker/save-release-images.ps1;
      scripts/docker/load-release-images.ps1; scripts/backend.mjs;
      docs/docker-configs.md.
      Complete when: the backend/vendor archive round trip preserves exact image
      identities; release configuration and appropriate migration/backup/restore
      evidence match the final cohort, including objects and filer metadata.
      Run only missing/invalidated recovery proofs from B1. Health alone is not
      persistence, and this is not a cloud deployment acceptance claim.

- [ ] **B5 - Validate the reviewed current snapshot in hosted CI.**
      Files: .github/workflows/ci.yml; .github/backend-cache.hcl;
      scripts/backend.test.mjs; scripts/docker/; scripts/backend-dev.test.mjs;
      root package scripts and all reviewed changed/new files.
      Complete when: a deliberately reviewed commit/publication has green
      applicable quality, contracts, native/live, security and image/archive jobs;
      record commit, run and image identities. Review generated artifacts,
      credentials and unrelated files before staging. Prior CI does not certify
      current local tooling; use publication authorization only where applicable.

- [ ] **B6 - Close B0 and stop this checklist.**
      Files: the new B0 evidence report; TODO-ALTERNATIVE.md B0 checkboxes;
      docs/current-focus.md; docs/reports/2026-10-28-d2-exit-proof.md;
      docs/services/media-service.md; docs/services/order-service.md.
      Complete when: all B0 rows match actual results and explicit limits. Label
      default-site/single-realm and demo-payment only. Record F7/D3 as the next
      separately planned stage without starting admin work or claiming tenant,
      cloud or real-payment readiness.
