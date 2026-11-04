# Post-D2 dependency maintenance: importance and cost

Nov 2 status: local Media M1-M7 is accepted on patched SeaweedFS. Fresh host/image
versions, registry/support/peer checks and the selected maintenance cohort are in
[the execution ledger](2026-10-31-dependency-maintenance-execution.md). The original
observations below remain dated before-state; do not select Node/Prisma/compiler
targets from them or repeat completed storage work.

Subsequent storage decision: Salar selected community SeaweedFS subject to its
[native compatibility gate](2026-10-28-seaweedfs-transition.md), excluding paid
subscriptions/vendor activation. The original options below remain assessment
history; no AIStor license will be procured. Active deployment is still MinIO.

Assessed: 2026-10-28. Decision preparation only; no dependency, lockfile, image,
volume or license changes. D2 functional acceptance remains valid; B0 is open.

## Recommended order

Restore a trustworthy installed baseline, address verified security/support gaps,
then modernize compatible tool groups. Keep the database-driver migration separate.
Latest stable compatible versions remain the target; a newer major alone does not
establish a defect. Costs below describe relative engineering and validation
effort, not time or price quotations. HDD installation/export and CI add machine
time even to a small code change.

| Order | Work                                                       | Importance and benefit                                     | Relative cost                                                     | Recommendation                                                          |
| ----- | ---------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 0     | Reconcile lockfile, installed packages and images          | Required to trust compatibility/security conclusions       | Low code effort; medium install I/O and eventual image validation | First prerequisite; frozen install and actual-version receipt           |
| 1     | Resolve object-store security/support                      | Confirmed affected MinIO release                           | Medium-large, depending on licensing and migration                | Compare AIStor Free with a maintained S3 alternative before selecting   |
| 2     | Patch vulnerable Web dependencies if shipping/exposing Web | High/critical advisory paths belong to `apps/web`          | Small direct fixes to medium editor/transitive work               | Security maintenance, without admin redesign                            |
| 3     | Align supported Node and infrastructure patches            | Removes host/image drift and enables newer tooling         | Medium; native modules, restart and image checks                  | Node 24 LTS modernization baseline; PostgreSQL/Redis maintenance minors |
| 4     | TypeScript 6 plus test/lint tools; then Nest 12            | Compiler compatibility and framework currency              | Medium tooling; medium-large across eleven apps                   | Preserve working validators, test runner and contracts                  |
| 5     | Prisma 7                                                   | Modern client/configuration; packaging benefit unmeasured  | Large: nine owners, adapters, generation, SQL/recovery            | Separate migration; do not combine with framework/manager majors        |
| Later | Native TypeScript 7, pnpm major, optional package splits   | Potential convenience/performance without proven necessity | Medium-large compatibility/cache validation                       | Measure benefit and clear blockers first                                |

Exposure changes security ordering: a public Web app's critical findings must not
wait behind local convenience. Runtime patch preparation can proceed alongside
the storage decision. This ranking does not select a storage replacement or make
every optional major a B0 prerequisite.

Host restoration follow-up: the subsequent
[frozen realignment](2026-10-28-package-realignment.md#completion-receipt---2026-10-28)
completed with zero direct-resolution mismatches and unchanged dependency inputs.
The original observations below are retained as the before-state; local image
rollout and all version/vendor choices remain open.

## Baseline evidence and scope

Inspected 19 package manifests including root, wanted lockfile versions, host
resolution, selected running Product/Media packages, infrastructure versions,
existing dependency report and upstream compatibility documentation. This is not
an exhaustive audit of every transitive package or a fresh eleven-image OS scan.

Ignored local evidence: `.ci-evidence/dependency-review/inventory.json`,
`candidates.json`, `prisma-candidates.json`, `audit-prod.json` and
`backend-gate.log`. Registry versions/tags are date-specific observations.

**Stale installation/runtime rollout:** wanted Nest core is 11.2.5 and gRPC JS
1.14.6; host and running Product/Media resolve 11.1.28 and 1.14.4 respectively.
Product's image was created at 2026-10-26T09:18:29Z, before lockfile security
commit `d404575` at 12:42:27Z. That explains observed image drift; it does not
prove a broken graph. Passing readiness and matching source do not certify
installed dependency versions.

Checkpoint current work, perform a frozen install using pinned pnpm, verify actual
owner resolution and reconcile advisory paths. Do not regenerate the lockfile
just to correct installation drift. Select the next patch/runtime cohort before
exporting the fleet so the same images are not rebuilt twice unnecessarily.

### Security scope

`pnpm audit --prod --json` returned nonzero: metadata lists 44 high and six
critical occurrences, not unique vulnerability counts. The existing
`pnpm scan:dependencies:backend` passed: runtime=0, tooling=4, deferred-web=43,
across 47 high/critical advisory records. All their audit paths start with
`apps__web>`.

The four tooling labels are two CKEditor and two Browserslist advisories with
empty matched backend/Web inventory paths. `scripts/backend.mjs` assigns
`backend-tooling` when neither installed inventory matches. That fallback is not
proof of four backend tool vulnerabilities. Reconcile after the frozen install;
if still ambiguous, improve attribution narrowly without weakening the gate.

Web's Next 16.0.7 has affected advisory ranges; observed stable candidate is
16.4.3. The older Sharp 0.34.5 advisories also belong to Web. Media's installed
and running Sharp is already 0.35.5, with runtime libvips 8.18.7. Scope fixes to
actual consumers; the separate Vite admin project is outside this assessment.
The npm gate does not cover MinIO's Go binary, Debian packages or old running
images. Historical F9 OS-scan exceptions remain separate.

## Storage decision: most important architectural choice

**Confirmed defect:** running MinIO `RELEASE.2025-09-07T16-13-09Z` is within
the vendor's [unsigned-trailer authentication bypass advisory](https://github.com/minio/minio/security/advisories/GHSA-hv4r-mvr4-25vw).
Knowing an access-key name and bucket can allow writes without the secret key;
the published fixed release is April 2026. No exploitation or compromise was
tested or inferred. Existing Media processing/render/recovery passes establish
functionality, not security immunity.

**Stale maintenance path:** the [community repository](https://github.com/minio/minio)
is archived. Rebuilding its final community release is insufficient for that
April advisory. Another [STS/service-account policy advisory](https://github.com/minio/minio/security/advisories/GHSA-jjjj-jwhf-8rgr)
postdates our image; its usage preconditions were not established here.

| Option                               | Convenience and financial cost                             | Compatibility and maintenance cost                                                                                |
| ------------------------------------ | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| AIStor Free, single node             | Advertised no-charge tier; potentially smallest API change | Active license and operational handling; redistribution restrictions affect public vendor cache and CI archives   |
| Paid AIStor                          | Similar product/API path; vendor quote required            | License procurement plus upgrade/recovery/CI checks; no demonstrated demo requirement for paid scale              |
| Maintained S3-compatible alternative | May avoid activation/subscription, depending on candidate  | Verify security/support/license, required S3 operations, object migration and rollback; no candidate selected yet |

AIStor Free is a candidate, not adopted. Verify its
[license operations](https://docs.min.io/aistor/operations/licenses/),
[community upgrade path](https://docs.min.io/aistor/administration/upgrade-aistor-server/),
[pricing](https://www.min.io/pricing) and
[Free Agreement](https://www.min.io/legal/aistor-free-agreement).
Our public vendor-image redistribution pattern cannot simply be carried over.
No terms were accepted, license requested or replacement image published.

Required parity stays bounded: signed upload, immutable conditional writes,
read/delete, metadata/checksums, scan/promotion, derivatives, Product rendering
and recovery. Inspect provider dispatch and stored provider IDs before promising
an endpoint-only switch. Preserve 3S compatibility; cloud/CDN and a general
storage framework remain deferred. The narrow CE rebuild is insufficient, but
the replacement choice still requires an evidence-backed decision.

## Modernization costs and compatibility exceptions

### Runtime and infrastructure

Host Node is 22.14.0; sampled images use 22.23.2. The
[release feed](https://nodejs.org/dist/index.json) reports 24.22.1 LTS and
22.23.4 LTS; its observed Node 26.12.1 entry is not marked LTS. Prefer a supported
LTS baseline and align local/CI/Docker. Backend Node types are 24, Web types 20;
type/runtime mismatch is optional hardening, not a demonstrated runtime defect.
Verify native Sharp/bcrypt and Prisma artifacts after a runtime change.

PostgreSQL is 17.8, with maintenance candidate 17.11. Redis is 7.4.8, with
candidate 7.4.12. Those major lines remain supported.
[PostgreSQL versioning](https://www.postgresql.org/support/versioning/) distinguishes
minor restarts from major data-format upgrades; [Redis support policy](https://redis.io/docs/latest/operate/oss_and_stack/install/version-mgmt/)
does not force a major jump. PostgreSQL 18/Redis 8 are optional modernization
without an identified feature requirement. Check target digests/release notes
before execution. ClamAV support/security currency was not fully audited here.

### TypeScript and Nest

Observed candidates: TypeScript 6.0.3 / 7.0.2, ts-jest 29.4.15,
typescript-eslint 8.72.1, Jest 30.5.2 and ESLint 10.13.0 (9.39.5 maintenance
alternative). TypeScript 5.9.2 is installed.

**Confirmed compatibility blocker:** direct TypeScript 7 replacement lacks the
JavaScript compiler API used by ts-jest and our
`scripts/check-backend-test-types.mjs`; current parser peers also cap TypeScript
below 6.1. The [ts-jest guide](https://github.com/kulshekhar/ts-jest/blob/main/website/docs/guides/typescript-7.md)
describes side-by-side TypeScript 6 API support. TypeScript 6 is the lower-cost
bridge. Replace `baseUrl` with explicit relative mappings and review inherited
configuration/types; suppressing the warning does not complete migration.
Native 7 can be benchmarked later. Faster compilation alone cannot promise
faster HDD dependency installation or image exports.

Nest candidate is 12.3.2, with 11.2.8 an interim legacy-line candidate.
Its [migration guide](https://docs.nestjs.com/migration-guide) requires newer
Node for ESM packages/Jest, so establish Node 24 first. Our apps can remain
CommonJS; class validation and Jest can remain. Adapt Joi through the Config
validation callback, match Swagger/Nest packages and inspect lifecycle ordering.
Environment, auth initialization, database and worker startup/shutdown across
eleven apps make this medium-large work. New starter defaults do not mandate
replacing our validators or test runner. Framework currency is optional
modernization unless a specific unmet requirement/advisory is established.

### Prisma

Prisma 6.16.2 spans nine database owners. Stable candidate CLI/client are both
7.10.1; 6.19.3 is an interim compatibility candidate. The CLI's observed `latest`
tag points to 8.0.0-rc.28 instead. Avoid blanket `--latest`: a tag is not proof
of a stable compatible ORM/CLI pair.

Owners currently use `prisma-client-js`, local `prisma/generated`, native engine
targets and PrismaClient constructors without a PostgreSQL adapter. The
[Prisma 7 migration](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)
changes driver/configuration/generation. CommonJS can remain using generator
`moduleFormat: "cjs"`, documented by the [Nest recipe](https://docs.nestjs.com/recipes/prisma).
Review pooling, timeouts, explicit environment loading, transactions, seeds,
SQL proof runners and runtime artifacts. Preserve money/stock/replay/recovery
assertions. Possible engine-payload savings remain unmeasured. This is the
largest batch; skip a short-lived 6-series bridge if the 7 migration is imminent.

### Package manager and dependencies already current

pnpm 10.17.1 has maintenance candidate 10.34.9; its stable `latest` channel is
12.15.0. Turbo 2.5.8 has candidate 2.11.10. Upgrade cost includes frozen installs,
injected workspace synchronization, pruning and cache restoration. No measured
performance defect currently requires a major jump. Sharp 0.35.5, proto-loader
0.8.1 and ts-node 10.9.2 already match observed latest tags. Keep them.

## Consumer trace and execution boundaries

These inspected entry points bound future slices; they do not replace each
implementation's exact consumer checklist. No application consumer needs an
edit during this assessment.

| Owner                | Paths and inspected mechanism                                                                                                                                                                                                                                             | Next action                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Installation/audit   | `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.npmrc`, `scripts/backend.mjs` classification, `apps/web/package.json`, resolved Product/Media packages                                                                                                         | Verify frozen actual versions and advisory attribution                                             |
| Runtime/build        | `docker/backend.Dockerfile`, `docker-bake.hcl`, both `docker-compose.yml` and `docker-compose.release.yml`, `.github/workflows/ci.yml`, `scripts/docker/backend-build-graph.mjs`, `scripts/docker/benchmark-build-graph.mjs`, `scripts/docker/verify-runtime-imports.mjs` | Align pins/bootstrap; preserve cache/artifact checks                                               |
| Native/configuration | `scripts/backend-dev.mjs`, `scripts/backend-dev-env.mjs`, `packages/config/src/env.validation.ts`, `apps/order-service/src/app.module.ts`                                                                                                                                 | Preserve precedence/Joi; expand exact eleven-owner trace for Nest                                  |
| Compiler             | `tsconfig.base.json`, `scripts/check-backend-test-types.mjs`, manifest compiler/test/lint dependencies                                                                                                                                                                    | Trace all inherited configs and API/generated-client consumers before editing                      |
| Storage              | `apps/media-service/src/processing/media-processing.storage.ts`, `apps/media-service/src/media.service.ts`, `apps/media-service/src/config/env.validation.ts`, `apps/media-service/src/dto/create-media.dto.ts`, `packages/api-client/test/media-processing-recovery.mjs` | Verify provider dispatch and migration; preserve conditional writes, hashes and all live behaviors |
| Vendor supply        | `.github/workflows/ci.yml`, `scripts/docker/save-release-images.ps1`, `scripts/docker/load-release-images.ps1`, `scripts/docker/release-image-inventory.mjs`                                                                                                              | Verify license and permitted CI distribution before vendor changes                                 |
| Prisma               | Root and nine owner manifests; representative Order schema/client and `apps/media-service/src/prisma.service.ts`; `scripts/backend.mjs` generation/migrations                                                                                                             | Exact schema/service/seed/test/SQL/artifact trace for each owner before implementation             |
| Acceptance           | `docs/current-focus.md`, `TODO-ALTERNATIVE.md`, `docs/reports/2026-10-28-d2-exit-proof.md`, `docs/testing/pre-suite-checklist.md`                                                                                                                                         | Keep D2 accepted and B0 open; record this assessment                                               |

The nine Prisma owners are Blog, Media, Order, Product, Realm Auth, Settings,
Taxonomy, Tenant Authority and User. The table bounds migration scope; it does
not claim that nine future upgrade traces or migrations are complete.

## Next execution and assessment receipt

1. Checkpoint work and reconcile the frozen baseline, preserving existing passes.
2. Compare storage choices on licensing/CI supply and the actual small S3 profile;
   select before implementing a replacement.
3. Prepare one runtime/security patch cohort; scope Web to its shipping status.
   Record retained supported majors and concrete future upgrade conditions.
4. Stage TypeScript/Nest modernization, with focused checks before grouped native
   and fleet validation. Keep Prisma independent so failures are attributable.
5. Apply the mandatory preparation checklist before any build/test handoff.
   Salar owns long installs, builds and live/SQL proofs.

Read-only metadata retrieval, allowlisted runtime probes and dependency-report
generation completed. Raw pnpm audit failed because findings exist; the current
scoped backend gate passed. Documentation checks passed: Prettier on this report,
current-focus, D2 exit and TODO; 91 relative file links resolved across those
files; `git diff --check` reported no errors. No install, broad suite, build or
migration ran for this assessment.
No upgrade compatibility or storage replacement is certified by this report.

## October 31 vendor maintenance allocation

Handle the SeaweedFS compiled go-jose dependency inside Media M1. The scanned
image contains 4.1.5; 4.1.6 is the scanned CVE's minimum fix, while the verified
latest stable target is 4.1.7, published Oct 30 with further security fixes.
See the [M1 currency decision](2026-10-28-seaweedfs-transition.md#m1-dependency-currency-decision---go-jose-417).
Rebuild/rescan/compatibility proof remain pending, so no completed upgrade is
claimed. On acceptance, reuse the exact vendor version/image/scan/proof receipt
in maintenance rather than treating the same dependency as fresh implementation
work. Only changed inputs, new relevant advisories or an explicit freshness
requirement justify repeating that acceptance. Other maintenance cohorts remain
open and retain their own consumer traces.
