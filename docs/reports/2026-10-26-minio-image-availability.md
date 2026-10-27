# MinIO image availability and localization checkpoint

Date: 2026-10-26. Current implementation/main checkpoint: `980e15e`.

## Verified status

[CI run 40332174629](https://github.com/pain1122/nebulaNV/actions/runs/40332174629)
passes the complete quality job: 81 tooling tests, nine graph checks, lint/types,
security/shared/Gateway/client/Web tests, source builds, both actual Compose
boundaries, source scanning and tracked-file cleanliness. The dependency report
has zero high/critical backend-runtime findings, two tooling and 43 deferred Web
findings under the existing policy. This does not close runtime/image acceptance.

The successful quality job saved host Turbo cache. The separate live runner
restored that exact commit/lock key successfully (774,172 compressed bytes).
Pinned Buildx/BuildKit setup and masked GHA credential exposure also passed.
BuildKit layer import/export and hosted image integration are still unproven.

Live provisioning stopped before any backend image build: Docker Hub denied
`minio/minio:latest`. This is a confirmed infrastructure image availability
failure, not a TypeScript compilation, database migration or application failure.

After Salar enabled the VPN and requested a retry, anonymous manifest probes
returned:

| Reference                                                   | Observed result                    |
| ----------------------------------------------------------- | ---------------------------------- |
| `minio/minio:latest`                                        | Access denied / insufficient scope |
| `minio/mc:latest`                                           | Access denied / insufficient scope |
| `quay.io/minio/minio:latest`                                | HTTP 401                           |
| `quay.io/minio/mc:latest`                                   | HTTP 401                           |
| Quay server `RELEASE.2025-09-07T16-13-09Z`                  | HTTP 401                           |
| Google mirror server latest and the same historical release | Not found                          |
| `redis:7-alpine` control                                    | Manifest resolves successfully     |

Raw bounded diagnostics are in `.ci-evidence/build-ci-cache/vpn-registry-*.log`
and `registry-control-*.log`. A VPN on the workstation does not change GitHub's
runner network. These probes verify the current access result; they do not prove
which private credentials or regions, if any, still have access.

Primary upstream evidence: [MinIO repository](https://github.com/minio/minio)
is archived (2026-04-25); its README documents source-only distribution.
[MinIO Client repository](https://github.com/minio/mc) is archived (2026-07-14).
This supports an availability/maintenance review; it does not authorize a silent
switch to a different storage implementation.

## Localization path and decisions

Salar's latest direction is **retry with VPN and investigate localization or a
workaround**. This is not approval to adopt a fork. No storage image reference,
storage volume, bucket policy, application contract or database was changed.

1. Start the local Docker engine and inspect whether the previously tested
   `minio/minio:latest` and `minio/mc:latest` copies remain. At this checkpoint the
   desktop-linux named pipe is absent and `docker desktop status` reports Desktop
   unavailable, so their current IDs/versions cannot yet be certified. Do not
   infer that images were deleted and do not prune/reset Docker.
2. If present, preserve those exact two images in an owned archive on D:, record
   their IDs/digests and archive SHA-256, and verify a cache/offline startup path.
   Keep existing storage volumes intact. An explicit offline pull policy must be
   checked rather than assuming a mutable latest tag never queries a registry.
3. A local archive alone does not make the fresh GitHub runner reproducible.
   An accessible organization-controlled mirror of those tested artifacts, or
   reproducible builds from pinned upstream source, can supply that missing input.
   Registry destination/access and any publication need a concrete authorized
   target. No release/upload or registry credential change has been performed.
4. A maintained fork is an optional replacement requiring a separate compatibility
   and maintenance decision under AGENTS.md. It is not necessary merely to
   preserve existing cached images.

Source-build candidate evidence, not an implemented/passed build:

- Upstream server latest release: `RELEASE.2025-10-15T17-29-55Z`, commit
  `9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a`.
- Upstream client latest release: `RELEASE.2025-08-13T08-35-41Z`, commit
  `7394ce0dd2a80935aded936b09fa12cbb3cb8096` (annotated tag dereferenced).
- Building source adds an initial Go compilation/cache path and ownership of
  archived upstream maintenance; original-vendor code is not a guarantee of
  current security or existing-volume compatibility. Both need actual proofs.
- [PGSTY Silo](https://github.com/pgsty/silo) / [client](https://github.com/pgsty/mc)
  are optional fork candidates. The historical
  `pgsty/minio:RELEASE.2026-08-04T00-00-00Z` manifest resolves anonymously, but no
  binary, volume compatibility, application integration or security proof was run.
  A reachable manifest is not approval to substitute that image.

## File tracing before a future implementation

| Owner / consumer                                                                                       | Required consideration                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docker-compose.yml`, `docker-compose.release.yml` MinIO and minio-init                                | Preserve server/client pairing, credentials inputs, health checks, bucket initialization, ports and volumes; release remains image-only.                           |
| `scripts/backend.mjs` infrastructure boot                                                              | Infrastructure currently starts before backend image builds; a source-build path needs explicit preparation without making ordinary service edits rebuild storage. |
| `scripts/docker/release-image-inventory.mjs`, `save-release-images.ps1`, `load-release-images.ps1`     | Preserve complete archive coverage and exact identities; infrastructure refs derive from actual Compose.                                                           |
| `scripts/backend.test.mjs` archive fixtures and Compose checks                                         | Update exact image references only if changed; retain service/health/security/complete inventory assertions.                                                       |
| `.github/workflows/ci.yml`, `.github/backend-cache.hcl`, `docker-bake.hcl`                             | Supply images before provisioning and prove cache behavior; do not hide pull failures or drop storage-dependent tests.                                             |
| `docs/docker-configs.md`, `docs/architecture/local-dev-and-docker-boot.md`, adopted TODO/current-focus | Record sourcing/offline workflow and ownership; keep cloud/CDN and broader storage architecture deferred.                                                          |

Readiness: quality acceptance and host Turbo round trip **passed**. MinIO image
supply/local cached-image inspection **pending**. Backend hosted build/runtime,
image scanning, BuildKit cache persistence and release archive round trip remain
**pending**. Broad local execution remains with Salar.

## Docker restarted: cached-image preservation

Salar reports Docker started. Observed engine: seven CPUs / 14,065,840,128 bytes;
all five running infrastructure containers are healthy. Cached vendor images
are present, so no provider replacement is needed to preserve local operation:

- Server image ID/repository digest:
  `sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e`,
  62,245,347 image bytes. Running binary reports
  `RELEASE.2025-09-07T16-13-09Z`, commit
  `07c3a429bfed433e49018cb0f78a52145d4bedeb`.
- Client image ID/repository digest:
  `sha256:a7fe349ef4bd8521fb8497f55c6042871b2ae640607cf99d9bede5e9bdf11727`,
  29,837,309 image bytes. Network-disabled, pull-never version probe reports
  `RELEASE.2025-08-13T08-35-41Z`, commit
  `7394ce0dd2a80935aded936b09fa12cbb3cb8096`.

Before-write trace for preservation only: exact cached source IDs above; existing
`scripts/docker/save-release-images.ps1` / `load-release-images.ps1` demonstrate
save/load behavior but intentionally cover all sixteen release images; current
Compose MinIO/minio-init images, health checks and existing volume definitions;
`scripts/backend.mjs` infrastructure startup order; Git/build-context exclusions.
Preserve just these two images and their local aliases in
`D:/Salar/NebulaBackup/nebulaNV-offline/`, outside Git and Docker build context.
An external override selects those aliases with pull_policy never. Validate its
actual merged config and unchanged volume definitions. No main Compose, build,
application, SQL, credentials, bucket or running-container change is required.
CI still needs an authorized accessible distribution target for the same bytes.

Preservation passed: archive is 84,864,512 bytes at
`D:/Salar/NebulaBackup/nebulaNV-offline/minio-20250907-mc-20250813.tar`, SHA-256
`e1d3d52e52abddeec06867839e0b239e50ddd48e1ad49313a309ce6da9ce3a6b`.
It contains exactly two image configurations / four original-and-local tags.
Actual Docker load succeeds; all four refs retain their observed IDs and the
existing MinIO container stays unchanged and healthy. External local override
merges successfully, preserves volume/port/env/health/command/dependency fields,
and disables pulls for the two aliases. No service restart or volume operation.

Salar explicitly approved publishing this archive as a non-latest prerelease
asset in the public pain1122/nebulaNV repository and consuming it in CI. Before
CI edits, reviewed `.github/workflows/ci.yml` live job, its existing policy test
in `scripts/backend.test.mjs`, `scripts/docker/release-image-inventory.mjs` and
`docker-bake.hcl`. Add a checksum-before-load step and a CI-only pull-never overlay.
Keep original image refs so sixteen-image release inventory stays unchanged;
backend Bake inputs/cache scopes and all application contracts stay unchanged.

Portable identity check: this Docker Desktop image store reports index IDs;
the archive also contains config hashes (server 69b2ec208575b69597784255eec6fa6a2985ee9e1a47f4411a51f7f5fdd193a9,
client c2ad77420d33bb4ad8694457d3edf7188076428582bd24e3dd4d09d6a1d52872).
Accept only these two recorded representations per image after verifying the
whole archive hash. Unknown identities must fail. Docker documents distinct
[containerd/classic store capabilities](https://docs.docker.com/engine/storage/containerd/);
no daemon storage-mode change is needed or authorized by this correction.

## Oct 27 CI supply preparation receipt

Classification: confirmed external image-supply failure; the tested storage
implementation is preserved. Salar explicitly approved publication of the
81 MiB image-only cache as a public non-latest prerelease.
[Vendor cache published](https://github.com/pain1122/nebulaNV/releases/tag/vendor-minio-20250907)
with `--prerelease --latest=false`. GitHub reports draft=false, prerelease=true,
84,864,512 archive bytes and the exact pinned SHA-256 as its uploaded asset
digest. Public notes record upstream binary versions/source commits and license
provenance; the local path-bearing manifest was not uploaded. Hosted consumption
is not yet certified.

| Owner / exact consumer                                                                                                            | Final disposition and evidence                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml` live-e2e                                                                                               | Download the fixed release asset to RUNNER_TEMP; stream SHA-256 before Docker load; verify only the recorded index/config IDs; scoped existing github.token for download. Preparation precedes infrastructure boot. |
| `.github/minio-offline.yml`                                                                                                       | CI-only overlay forbids pulls for minio/minio-init. Actual merged Compose config preserves every other service field and volume definition.                                                                         |
| `scripts/backend.test.mjs` CI policy inventory                                                                                    | Retains existing security/quality/cache gates and asserts download identity/hash ordering, overlay contents and provision ordering. 81/81 pass both normally and with CI=true/GITHUB_ACTIONS=true.                  |
| `scripts/backend.mjs` Compose boot                                                                                                | Unchanged: already honors COMPOSE_FILE and provisions infrastructure before backend images; no extra source-build path.                                                                                             |
| `docker-compose.yml`, `docker-compose.release.yml`                                                                                | Unchanged by this slice: image refs, buckets, credentials inputs and storage volumes preserved. No operator env edit.                                                                                               |
| `scripts/docker/release-image-inventory.mjs`, `save-release-images.ps1`, `load-release-images.ps1`                                | Unchanged: original vendor refs retained; actual inventory remains sixteen unique images. Existing release checks retained.                                                                                         |
| `docker-bake.hcl`, `.github/backend-cache.hcl`, `docker/backend.Dockerfile`                                                       | Unchanged: eleven targets, selected graph/union and per-image layer-cache scopes preserved. Cache asset stays outside build context.                                                                                |
| `docs/docker-configs.md`, `docs/architecture/local-dev-and-docker-boot.md`                                                        | Document CI-only sourcing, no automatic local/release override and limits of reusing vendor binaries.                                                                                                               |
| `docs/current-focus.md`, `docs/ASAP-BUILD-CLEANUP.md`, `TODO-ALTERNATIVE.md`, `docs/reports/2026-10-26-build-cleanup-ci-cache.md` | Keep quality/host Turbo accepted; distinguish local preservation/preparation from pending hosted image/runtime/cache/archive gates.                                                                                 |
| Gateway/RPC/protobuf/OpenAPI/client/seed/SQL source and fixtures                                                                  | Unchanged: no public or database contract changes. Earlier preflight and SQL evidence remains applicable; no broad reruns justified by image sourcing.                                                              |

Format/syntax/lint: Node syntax and extracted actual workflow Bash syntax pass.
Root ESLint's default JS config reports nine pre-existing undefined Node globals
in this test file; scoped lint with process/URL/Buffer/structuredClone declared
passes without disabling rules. No unrelated lint/config edit. Tooling passes
81/81 in both environments. An ad hoc CommonJS verification initially used
top-level await; corrected to an async wrapper and reran successfully.

Actual artifact/runtime proof: the exact workflow JavaScript checks the pinned
84,864,512-byte archive, loads it and verifies both original image identities.
An intentionally invalid archive fails on the checksum before any load. Actual
Compose overlay rendering preserves both MinIO service configurations except
pull policy and leaves volume definitions unchanged. Existing MinIO remains
healthy; no containers/volumes were recreated. The two original image references
remain in the sixteen-image release inventory.

Oct 27 health observation: Docker seven CPUs / 14,065,840,128 bytes; all five
running infrastructure services healthy, PostgreSQL pg_isready accepts, both
Redis PINGs return PONG. All eleven applications are stopped with historical
exit codes, so full application readiness is not claimed. Start/deployment and
pending D2 migration acceptance remain a separate gate.

Known limits: linux/amd64 cache of archived upstream releases; this slice does
not supply security maintenance, a storage fork, cloud/CDN functionality or D2
feature closure. Release bytes are outside Git and Docker context; no project
env file, volume or credentials are uploaded. No broad tests were removed,
skipped or weakened.

Next proof: after verified publication and the authorized main push, hosted CI
must download/hash/load these bytes, boot actual services, build/scan images,
exercise integration and verify the release archive. BuildKit cross-run layer
persistence still needs actual hosted evidence.
Readiness: READY FOR AUTHORIZED MAIN PUSH AND HOSTED PROOF; Segment 3 remains open.
