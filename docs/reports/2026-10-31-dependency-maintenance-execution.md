# Dependency maintenance execution

Started 2026-11-02 after local Media tasks M1-M7 passed. The filename follows the
adopted current-focus pointer. B0 and current-snapshot hosted CI remain open.
This report records decisions and execution; the Oct 28 assessment remains dated
before-state evidence. No version, lockfile, image or database change is applied
by this initial cohort review.

## D1 observed baseline

Fresh ignored evidence is under .ci-evidence/dependency-review:
2026-11-02-host.json, 2026-11-02-images.json and 2026-11-02-upstream.json.
All probes are read-only metadata collection; no install/build/scan was run.

- Nineteen importers and 516 declared dependency/dev/optional entries checked
  against the lockfile and actual owner node_modules. Zero installed-version
  drift after explaining one identical runtime/dev jsonwebtoken declaration in
  packages/grpc-auth/package.json; pnpm stores it once in the runtime bucket.
  It is not a missing install or reason to regenerate the lockfile. Redundant
  declaration cleanup is optional, not a security fix.
- Root pnpm pin and actual executable are 10.17.1. Host Node is 22.14.0.
  Lockfile SHA-256 remains
  e74d538cf2bbbf85f9a4ffc731650b88870188959634ee7c1e024d0738d7fca6,
  matching the accepted frozen realignment. Keep its evidence; do not reinstall
  merely to repeat it. This check includes workspace/duplicate declarations and
  is broader than the earlier 481-entry comparison; counts are not regressions.
- Actual host direct versions include Nest 11.2.5, gRPC JS 1.14.6, Prisma
  CLI/client 6.16.2, TypeScript 5.9.2, Joi 18.2.6, Jest 30.2.0, Sharp 0.35.5,
  Turbo 2.5.8 and unshipped Web Next 16.0.7.
- All eleven running backend images were queried through their own installed
  runtime package manifests. Each runs Node 22.23.2. Media/Gateway have Nest
  11.2.5 and gRPC 1.14.6; the other nine have Nest 11.1.28 and, where present,
  gRPC 1.14.4. Prisma owners have 6.16.2; Media has Sharp 0.35.5. This is confirmed
  stale deployment relative to the wanted lock, not evidence of a cache/build
  graph defect or a new vulnerability. D8 must reconcile actual in-image versions.
- Infrastructure reports PostgreSQL 17.8, Redis 7.4.8 and ClamAV 1.4.6. ClamAV's
  printed database timestamp is Oct 6; D4 must verify/update signature freshness
  and connectivity. Native EICAR/recovery success is not a freshness guarantee.
  No scanner replacement is justified by that timestamp alone.

Direct versions are not a transitive/OS security audit. A lockfile audit cannot
certify the nine older running images; final packaged scans/parity remain D8/B5.

## D1 proposed cohort and exceptions

These are reviewed upgrade candidates, not applied upgrades or blanket approval
for major migrations. Each implementation task must establish the requirement,
compatibility cost and applicable proof before selecting its final inputs.

Publisher registry metadata and official support/migration docs were rechecked
Nov 2. Exact observed engines/peers and source URLs are retained in the upstream
JSON. These are implementation targets with named gates, not a claim that major
upgrades have already passed our tests. Patch targets must be rechecked for new
releases/advisories before changing inputs or acquiring image digests.

| Component                  | Current / fresh upstream observation                                                           | Selected direction and gate                                                                                                                                                                                                                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node                       | Host 22.14.0; images 22.23.2; feed now marks 26.13.0 Lithium LTS                               | Target 26.13.0 for D3. Align host/CI/build/runtime and verify native Sharp/bcrypt/Prisma imports. Node 26 needs explicit package-manager bootstrap because Corepack is no longer bundled                                                                                                                                  |
| TypeScript                 | 5.9.2; latest 7.0.2, classic 6.0.3 available                                                   | D5 bridge target 6.0.3. ts-jest/compiler-API consumers and parser/Swagger peers prevent a direct 7 replacement. Remove deprecated resolution/baseUrl settings rather than suppressing warnings. Native 7/compatibility aliases need a separately proven dual-compiler path, not an untracked fallback                     |
| Nest                       | Host 11.2.5; core/common/microservices/platform/testing all published 12.3.2                   | D6 target matched 12.3.2 with Config 12.0.1, JWT 12.0.3, Swagger 12.1.0, Throttler 6.7.1 and CLI 12.0.11. Preserve existing validators/runner; inspect lifecycle, config options, DTO/OpenAPI and RPC consumers before edits                                                                                              |
| Joi                        | 18.2.6; latest 18.3.1                                                                          | Target same-major patch 18.3.1 in D6. Existing Joi 18 supports Standard Schema; preserve it. Review libraryOptions nesting only where applicable; no automatic Zod replacement or new config framework                                                                                                                    |
| Jest / typed lint          | Jest 30.2.0; latest 30.5.2; ts-jest latest 29.4.15; typescript-eslint/parser 8.72.1            | D5 keep the established runner, target compatible patches with TypeScript 6. Parser peers require TS below 6.1; ts-jest requires below 7. ESLint 10.14.0 / @eslint/js 10.0.1 are a coordinated tooling target with flat-config/typed-test checks, not automatic rule suppression                                          |
| Prisma                     | CLI/client 6.16.2; stable matched 7.10.1 exists; CLI latest tag is 8.0.0-rc.29                 | D7 target exact stable CLI/client/adapter-pg 7.10.1, never the RC via blanket latest. Nine-owner config/generation/adapter/pooling/seed/SQL/recovery migration needs its own trace before implementation; CommonJS-to-ESM conversion is not assumed necessary                                                             |
| gRPC JS                    | Host 1.14.6, nine older packaged consumers 1.14.4; latest 1.14.7                               | Target same-major 1.14.7 with transport/signature/codec proofs in D6/D8; inventory the actual runtime version at rollout                                                                                                                                                                                                  |
| PostgreSQL                 | 17.8; current supported-17 patch is 17.11; 18.6 also exists                                    | D4 target 17.11 on the supported 17 line (through Nov 2029). A major introduces data-directory upgrade work without an identified demo requirement. Do not attach an 18 image to the 17 volume                                                                                                                            |
| Redis                      | 7.4.8; current branch release notes show 7.4.12                                                | D4 patch target 7.4.12 on the supported 7.4 line (through Dec 2029), with explicit digest/license/security and persistence/replay-store checks. No paid activation or speculative Redis replacement is selected                                                                                                           |
| ClamAV                     | Running 1.4.6, current 1.4 LTS patch in support matrix                                         | Retain 1.4.6 supported LTS; D4 checks image/OS findings and stale observed signature timestamp, then applicable real scanner/recovery proofs. No needless engine rebuild for an unchanged supported binary                                                                                                                |
| Seaweed / image processing | Accepted patched community 4.51/go-jose 4.1.7; host/image Sharp 0.35.5 equals current registry | Retain accepted M1-M7 evidence and pins. Do not redo migration, vendor publishing or storage selection absent changed inputs, a relevant advisory or an explicit scan freshness gate                                                                                                                                      |
| Package manager / Turbo    | Proven pnpm 10.17.1 / Turbo 2.5.8; registry latest 12.16.1 / 2.11.10                           | Preserve known pins through source migration. D8 explicitly evaluates these tool upgrades against lock format, prune/injected synchronization and native graph proofs before final maintenance closure. This is a temporary build-tool compatibility exception, not an assertion of audited security/support for old pins |
| Unshipped legacy Web       | Next 16.0.7; registry latest 16.4.4                                                            | D2 resolves actual advisory attribution and explicit backend-B0 shipping scope. No Vite/admin UI work or package-tree exclusion hiding runtime findings. Any Web patch/security deferral has an owning disposition                                                                                                        |

The Node decision updates the Oct 28 observation: 26 was not then marked LTS;
the fresh feed now marks 26.13.0 LTS. The old report is not a current target list.
The Prisma CLI latest tag also advanced from the older RC.28 to RC.29;
exact stable pairing takes precedence over the mutable tag.

TypeScript 7 has no compatible JavaScript compiler API for our existing
createProgram checks/ts-jest. Upstream documents a side-by-side compatibility
package; it introduces two diagnostic/compiler paths. The selected TypeScript 6
bridge satisfies current ts-jest, parser and Swagger peer ranges with less
integration scope. D5 must document the upgrade condition rather than treating
native 7 as impossible or bypassing peer checks.

Joi preservation is also based on fresh evidence. The current Nest guide says
Joi 18 schemas work with Config's Standard Schema support. The earlier assessment's
validation-callback suggestion is an option, not a required replacement. Preserve
defaults/options after inspecting each actual owner. Prisma driver adapters and
explicit CLI env/config loading, by contrast, are real v7 migration requirements.

## Exact starting owners and rollout order

| Cohort boundary                         | Files to inspect/update under its owning task                                                                                                                                                                                                                  |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root/shared toolchain                   | package.json; pnpm-lock.yaml; pnpm-workspace.yaml; .npmrc; turbo.json; tsconfig.base.json; scripts/check-backend-test-types.mjs; root/owner ESLint/Jest configs                                                                                                |
| Eleven backend manifests/config callers | apps/{user-service,auth-service,realm-auth-service,tenant-authority-service,settings-service,media-service,taxonomy-service,product-service,blog-service,order-service,gateway}/package.json and each actual src/app.module.ts/config/main lifecycle caller    |
| Shared/generated clients                | packages/{api-client,clients,config,grpc-auth,migration-artifacts,protos}/package.json; packages/api-client/scripts/generate-client.mjs; actual shared build/exports and generated contract consumers                                                          |
| Nine Prisma owners                      | apps/{user-service,realm-auth-service,tenant-authority-service,settings-service,media-service,taxonomy-service,product-service,blog-service,order-service}/prisma/{schema.prisma,migrations,generated}; owning Prisma services, seeds and scripts/db consumers |
| Runtime/build/CI                        | docker/backend.Dockerfile; docker-bake.hcl; scripts/docker/{backend-build-graph,verify-runtime-imports}.mjs; scripts/backend{,-dev}.mjs; .github/{workflows/ci.yml,backend-cache.hcl}; Setup.md                                                                |
| Infrastructure/storage                  | docker-compose.yml; docker-compose.release.yml; docker/seaweedfs/; .github/seaweed-runtime.yml; Media scanner/storage helpers and current native receipts                                                                                                      |
| Security/shipping evidence              | scripts/backend.mjs classifyDependencyAdvisories/generateBackendDependencyReport; scripts/backend.test.mjs; apps/web/package.json; this ledger/current-focus; original assessment and realignment reports                                                      |

Do source/config preparation in the adopted D3-D7 order, validating each changed
owner before broad handoff. Group compatible image changes into the D8 rollout
instead of rebuilding eleven images after every package decision. Retain graph
isolation/injected-package correctness and the new Seaweed selection. Dormant
Prisma owners participate only in dependency compatibility, not resumed F4
feature implementation. Cloud/CDN/admin/storage-framework expansion remains out.

No new API, schema or manifest implementation is included in D1. The major tasks
must extend these starting paths into exact call/fixture/generated/test traces
before editing. D1 records compatible declared targets, observed state and named
exceptions; it does not waive their native SQL/codec/lifecycle/image gates.

## Primary sources checked Nov 2

- [Node releases](https://nodejs.org/en/about/previous-releases) and
  [machine-readable feed](https://nodejs.org/dist/index.json).
- [Corepack distribution/bootstrap](https://github.com/nodejs/corepack#default-installs).
- [ts-jest native TypeScript guidance](https://github.com/kulshekhar/ts-jest/blob/main/website/docs/guides/typescript-7.md).
- [Nest migration/config guidance](https://docs.nestjs.com/migration-guide).
- [Prisma v7 migration](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)
  and [system requirements](https://www.prisma.io/docs/orm/v7/reference/system-requirements).
- [PostgreSQL support/current minor](https://www.postgresql.org/support/versioning/),
  [Redis support](https://redis.io/docs/latest/operate/oss_and_stack/install/version-mgmt/),
  [Redis branch release notes](https://github.com/redis/redis/blob/7.4/00-RELEASENOTES),
  [ClamAV support matrix](https://docs.clamav.net/faq/faq-eol.html).
- Publisher npm metadata: exact URLs/engines/peers are in the ignored upstream
  JSON; examples [Prisma 7.10.1](https://registry.npmjs.org/prisma/7.10.1),
  [TypeScript 6.0.3](https://registry.npmjs.org/typescript/6.0.3) and
  [Nest core 12.3.2](https://registry.npmjs.org/@nestjs/core/12.3.2).

## D2 next diagnostic

The existing classifier labels unmatched audit paths backend-tooling by default;
the older Web findings showed why that needs actual attribution review. Do not
read its next runtime=0 message as D2 completion or clearance of older images.
Collect fresh data before the narrow classifier/shipping-scope correction.

The operator-owned command is pnpm scan:dependencies:backend. It performs a
network audit and recursive package inventory, writes
.security-reports/backend-dependencies.json and does not change packages,
containers or database contents. Old report input is preserved separately before
handoff. A nonzero audit/gate result is data to inspect, not permission to suppress
findings or install blanket latest versions. Full D2 acceptance remains pending.

## D1 completion and D2 collection receipt

D1 is complete as a cohort/state/compatibility decision, not an applied upgrade.
Current declarations, lockfile, host and eleven images are observed; fresh
targets, actual peer/engine constraints, preserved supported infrastructure
lines and explicit compiler/build-tool exceptions are recorded above. D3-D8
retain their own implementation and native acceptance gates. No dependency
version, package manifest, lockfile, image, stored data or API was changed.

For D2, inspected scripts/backend.mjs generateBackendDependencyReport and
classifyDependencyAdvisories, scripts/backend.test.mjs attribution/inventory
tests, apps/web/package.json and the published/prepared CI/shipping context.
The diagnostic command is unchanged; it writes only its ignored report. Existing
89-test tooling/type/native evidence remains valid for unchanged source. New
registry/host/image probes are data collection, not implementation tests or a
new npm/OS security audit. Docs formatting/whitespace review completes this
handoff; no API preflight, SQL migration or image build is applicable.

Run pnpm scan:dependencies:backend and return its summary or failure. Collection
may take time because it audits over the network and walks runtime dependencies,
so execution remains Salar-owned. Its output is provisional for attribution:
unmatched paths currently default to tooling and that is the named next fix.
Do not waive HIGH/CRITICAL findings or certify the older nine runtime images from
a host-lock audit. Readiness: READY FOR D2 FRESH AUDIT DATA COLLECTION ONLY.

Final receipt: all changed documentation passes Prettier and whitespace review;
only the existing .gitignore line-ending warning remains. The index is empty.
Current-focus/adopted TODO agree on D2 next, Media M1-M7 accepted, and unchanged
dependency versions pending implementation. The original ignored audit report
is preserved as 2026-11-02-before-audit.json. No new broad test or runtime proof
is needed for this metadata/documentation-only step.

## Nov 2 documentation and waste control preparation

Salar requested documentation and waste control inside maintenance because the
repository is becoming difficult to navigate. This authorizes a bounded plan and
ongoing hygiene gate, not blanket deletion or service restructuring. D2 remains
the next active task; no new package upgrade is authorized by this addition.

Inspected docs/README.md, docs/current-focus.md, TODO-ALTERNATIVE.md,
docs/testing/pre-suite-checklist.md, docs/ASAP-BUILD-CLEANUP.md, .gitignore and
.dockerignore, alongside the existing working/staged differences. The index is
empty; existing work remains intact.

Observed findings and classification:

- Confirmed housekeeping gap: root build logs remain untracked. git check-ignore
  does not match probe.log/probe.zip/probe.tar, while .ci-evidence and
  .security-reports are ignored. .gitignore's literal .zip/.tar entries do not
  exclude ordinary archives. D11 must decide intentional outputs and exclusions,
  rather than blindly adding broad patterns that could conceal fixtures.
- Stale documentation: the B0 checklist still says active storage conversion is
  pending despite the accepted M1-M7 checkpoint. Correct that contradiction now.
- Optional organization improvement: docs/README.md already provides navigation;
  reuse it. Long reports and repeated completed handoffs warrant consolidation
  of current instructions, not deletion of historical evidence.
- Existing accepted control: ASAP-BUILD-CLEANUP already retains a 40GiB automatic
  build-cache target. Preserve it and graph correctness; no new cache framework
  or wholesale prune is needed.

| Owner / consumer                                                                                       | Action and reason                                                                                         | Validation                                                    |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| docs/current-focus.md maintenance task IDs                                                             | Add D9 docs, D10 tooling/layout and D11 artifact retention; rename old closure D9 to D12; retain D2 start | Review numbering and completion gates                         |
| TODO-ALTERNATIVE.md execution checkpoint and B0 gate                                                   | Link bounded cleanup to maintenance; reconcile stale storage status                                       | Compare accepted Media state and roadmap scope                |
| docs/testing/pre-suite-checklist.md mandatory gates                                                    | Add canonical-doc, reuse and artifact-disposition checks for future changes                               | Verify AGENTS.md/AI_CONTEXT.md already require this checklist |
| docs/README.md; README.md; Setup.md; docs/services/; docs/packages/; docs/architecture/; docs/reports/ | Inspected navigation roles; substantive reconciliation is D9, no new competing index now                  | D9 must list exact changed consumers before implementation    |
| scripts/; package.json; .github/; Docker COPY inputs and script inventories                            | No runtime changes now; D10 traces real callers before consolidation                                      | Existing focused checks only when affected                    |
| .gitignore; .dockerignore; ignored evidence and private storage/demo directories                       | No ignore or deletion changes now; D11 measures and protects state first                                  | Context COPY check required if exclusions change              |
| Runtime, contracts, migrations, package inputs and generated artifacts                                 | Unchanged: plan-only scope                                                                                | No API preflight, SQL, builds or broad suites applicable      |

Completion receipt: the four changed documents pass Prettier; git diff --check
passes with only the pre-existing .gitignore line-ending warning. A read-only
check verifies maintenance D1-D12 occurs once in numeric order, D2 remains active
and the referenced canonical files exist. AGENTS.md and AI_CONTEXT.md already
mandate the updated preparation checklist; no additional policy file is needed.
The roadmap's stale pending-cutover paragraph is reconciled with M1-M7 acceptance.
The impact table above is unchanged after review: all implementation consumers
remain deferred to their named tasks, not silently removed from scope.

No dependency, command, ignore rule, API, schema, runtime, artifact or stored data
was changed. No broad test, image build, audit rerun or cleanup command is needed
for this documentation-only addition. D9-D11 are planned, not completed; actual
cleanup requires its own inventory and checks. Readiness: DOCUMENTATION ADDITION
COMPLETE; D2 FRESH AUDIT DATA COLLECTION REMAINS NEXT.

## Nov 2 foundation-priority preparation

Salar identified maintenance D as foundational to subsequent delivery and asked
for greater focus. The current list already names owners and completion checks,
but does not explicitly distinguish selection, prepared implementation and
accepted deployment, or explain how to avoid accumulating incompatible changes
before D8. Strengthen execution discipline without adding product features,
mandatory major upgrades, a new process framework or more task IDs.

Impact trace before editing: docs/current-focus.md is the action owner;
TODO-ALTERNATIVE.md is the B0 ordering/closure consumer; this report holds the
decision and evidence. docs/testing/pre-suite-checklist.md already mandates
exact consumer tracing and cheap checks, so retain it unchanged. D2 remains
active; D1 review evidence and M1-M7 acceptance remain valid. Runtime, manifests,
lockfile, generators, tests and operational tools are unchanged because this is
an execution-plan clarification. Documentation formatting, whitespace and task
order checks apply; no suite, install, audit or image build applies to this edit.

Receipt: current-focus now states the foundation priority and the distinction
between reviewed, prepared and accepted work. The adopted roadmap agrees. Task
order D1-D12 and D2 start are verified; Prettier and whitespace checks pass, with
only the existing unrelated .gitignore line-ending warning. Consumer review finds
no implementation changes or additional checks required. No new maintenance
task is marked complete; D2 diagnostic data collection remains next.

## D2 fresh audit and narrow correction preparation

Salar's Nov 2 audit exits 1 as required: runtime=1, tooling=4, deferred-web=43
(48 high/critical advisory records, not 48 distinct packages). The report at
.security-reports/backend-dependencies.json identifies Joi 18.2.6 and advisory
GHSA-4528-x5fx-h6hg; the maintainer lists 18.3.1 as patched. It affects the
multiple-email splitting option. Searches of apps/ and packages/ TypeScript
sources find no .email( or multiple: true usage; this does not prove general
absence of exposure, and the runtime package finding remains blocking. The
same-major patch preserves Joi; replacing validators is unnecessary.

Confirmed reporting defect: all four tooling records have apps\_\_web importer
paths (ckeditor5, its engine and two browserslist advisories) but no installed
runtime inventory match. The fallback silently calls unknown paths tooling.
Use the actual pnpm importer path as additional Web attribution, retain backend
inventory precedence and fail closed for unresolved attribution, including mixed
Web/unknown paths. Keep every finding visible. An unshipped Web classification
is a B0 scope disposition, not a vulnerability fix or approval to deploy Web.
The CI Web compatibility tests do not package a Web application; inspect release
service inventory and backend build selection as the shipping evidence.

Primary sources checked Nov 2:
[Joi maintainer advisory](https://github.com/hapijs/joi/security/advisories/GHSA-4528-x5fx-h6hg)
and [Joi changelog](https://joi.dev/resources/changelog). Both identify 18.3.1;
upstream tests cover the fix, so reuse our actual configuration/security suites
for compatibility rather than adding a copied third-party implementation test.

| Owner / exact consumer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Action / unchanged reason                                                                                                      | Required check                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| scripts/backend.mjs classifyDependencyAdvisories/generateBackendDependencyReport                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Correct Web importer evidence; unknown attribution blocks; report adds unresolved count without hiding raw paths               | Focused classifier/report regressions and syntax/lint                                      |
| scripts/backend.test.mjs classifier/report fixtures and summary assertion                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Cover all four operator-observed paths, mixed owners, unknown owners, shared runtime/Web versions and gate failure             | Filtered dependency tests, preserving existing runtime/empty/malformed cases               |
| package.json; apps/auth-service/package.json; apps/blog-service/package.json; apps/gateway/package.json; apps/media-service/package.json; apps/order-service/package.json; apps/product-service/package.json; apps/realm-auth-service/package.json; apps/settings-service/package.json; apps/taxonomy-service/package.json; apps/tenant-authority-service/package.json; apps/user-service/package.json; packages/config/package.json; packages/grpc-auth/package.json                                                                                                    | Change only exact Joi pins 18.2.6 to 18.3.1; no other cohort migration                                                         | JSON/pin consistency now; operator install/lock update pending                             |
| pnpm-lock.yaml; injected workspace dependencies; package lifecycle generators                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Do not hand-edit lock or injected copies; update via pinned pnpm installation                                                  | Inspect actual lock diff and installed versions after operator install                     |
| apps/auth-service/src/config/env.validation.ts; apps/blog-service/src/config/env.validation.ts; apps/gateway/src/config/env.validation.ts; apps/media-service/src/config/env.validation.ts; apps/order-service/src/config/env.validation.ts; apps/product-service/src/config/env.validation.ts; apps/realm-auth-service/src/config/env.validation.ts; apps/settings-service/src/config/env.validation.ts; apps/taxonomy-service/src/config/env.validation.ts; apps/tenant-authority-service/src/config/env.validation.ts; apps/user-service/src/config/env.validation.ts | Existing Joi consumers; no schema rule change justified                                                                        | Post-install owner validation/type checks; dormant owners compatibility only               |
| packages/config/src/env.validation.ts; packages/config/src/http-policy.ts; packages/grpc-auth/src/env.validation.ts; apps/gateway/src/application/application-registry.ts                                                                                                                                                                                                                                                                                                                                                                                                | Preserve existing validation behavior                                                                                          | Post-install focused shared configuration/security and registry checks                     |
| packages/config/test/env-validation.spec.ts; packages/config/test/http-policy.spec.ts; packages/grpc-auth/test/s2s-config.security.spec.ts; packages/grpc-auth/test/gateway-outbound-config.security.spec.ts                                                                                                                                                                                                                                                                                                                                                             | Reuse real schema/config regressions after new package installation                                                            | Pending installed patch; broad suites remain operator-owned                                |
| .github/workflows/ci.yml security report upload and dependency command; package.json scan:dependencies:backend and test:backend-tooling                                                                                                                                                                                                                                                                                                                                                                                                                                  | Existing entrypoints/artifact paths remain valid; console adds unresolved count                                                | Exact command/summary consumer search; no CI topology change                               |
| docs/architecture/testing-and-health.md; docs/current-focus.md; TODO-ALTERNATIVE.md                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Correct current gate semantics and record patch/installation status; preserve historical reports                               | Format and scope/status consistency                                                        |
| apps/web/package.json; docker-compose.release.yml; scripts/backend.mjs backend inventory                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Keep Web advisories visible and explicitly outside backend B0 shipping; no Web install exclusion or vulnerable shipping waiver | Verify actual release/build service selection; Web remediation owned by F7/D3 before reuse |
| API/protobuf/OpenAPI/client generation, SQL/schema/seeds and active images                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Unchanged in this slice; package installation is not deployed acceptance                                                       | No API preflight or SQL needed; actual images/scans remain D8/B5                           |

Preparation status: implementation and cheap checks pending. Preserve the fresh
operator audit before corrections; do not claim this advisory or D2 cleared until
the patched installation, attribution and required evidence have passed.

### D2 source-preparation result and installation receipt

Prepared: exact Joi 18.3.1 declarations in the fourteen listed manifests;
classifier uses observed Web importer evidence, preserves runtime/shared-package
blocking and labels unknown or mixed unproven owners unresolved. Unresolved
high/critical records now block. Report adds policy.blockUnresolved and
summary.unresolved; backendRuntime continues to count runtime records only.
backendTooling remains an additive-compatibility counter, not a default exemption.
The report path, audit entrypoint, CI upload and failure token are unchanged.

Post-change impact review: exact summary fixture updated; two new regressions
cover observed CKEditor/browser paths, inventory misses, shared backend packages,
similar/mixed importer names, separate unknown versions, absent evidence and
unresolved gate failure. Existing optional-CLI, malformed-audit, runtime blocking
and empty-audit assertions remain. No contract, fixture rule or security threshold
was weakened. Current health/testing documentation now describes the gate;
historical assessment remains a dated before-state. Release Compose service
selection and backendServices exclude Web; CI's Web tests are compatibility
checks, not deployment. All 47 reattributed Web records remain visible and owned
by F7/D3 before reuse/shipping, not hidden or waived shipping vulnerabilities.

Observed cheap checks:

- node --check scripts/backend.mjs and scripts/backend.test.mjs pass.
- node --test --test-name-pattern=dependency scripts/backend.test.mjs passes
  8/8 selected checks, zero skipped; two also cover Media/demo dependency behavior.
- pnpm exec eslint scripts/backend.mjs scripts/backend.test.mjs passes.
- Changed JSON files parse and all fourteen existing Joi declarations agree on
  18.3.1; formatting/whitespace checks pass.
- Saved-report attribution replay yields runtime=1, tooling=0, deferred-web=47,
  unresolved=0. It reconstructs advisory inputs from the retained operator report
  and inventory evidence; it is not a fresh pnpm audit or proof of an installed fix.
  Inputs and replay are retained under .ci-evidence/dependency-review/.
- pnpm-lock.yaml SHA256 is still
  e74d538cf2bbbf85f9a4ffc731650b88870188959634ee7c1e024d0738d7fca6.
  Installed Joi and images are unchanged; manifests intentionally await the
  package-manager operation. No source/image parity or frozen-install readiness
  is claimed yet.

Next required operator prerequisite: pnpm install --no-frozen-lockfile, capturing
output in .ci-evidence/dependency-review/d2-joi-install.log. It updates the lock
and installed/injected workspace copies using pinned pnpm and runs existing
lifecycle hooks; it may take time. Do not use --ignore-scripts or manually edit
lock/injected output. After success the agent inspects the actual lock diff and
installed owner versions, then runs applicable focused validation before handing
over the fresh audit/broad proofs. Required post-install checks and D2 closure
are pending. No build/recreate or container change is needed at this step.

Readiness: READY FOR NAMED PACKAGE INSTALLATION PREREQUISITE ONLY. Not ready for
Docker builds, broad suites, frozen-install CI or commit of the prepared cohort.

### Nov 3 installation verification and container sanity receipt

Salar reports pnpm install --no-frozen-lockfile exit 0 in 55.7s with pinned pnpm
10.17.1; the retained install-log tail agrees, including successful existing
Prisma 6.16.2 generators. No generator/version migration was added. This receipt
supersedes the installation-pending handoff above; fresh audit remains pending.

Read-only runtime inspection: all sixteen running project containers are healthy;
pnpm backend:health passes all eleven backend readiness checks. Docker records
zero restarts and no OOM kills for the inspected containers. MinIO is intentionally
exited 0 for rollback and retains a historical unhealthy health label; it is not
an active unhealthy service. seaweed-init has exited 0 as expected. No container
restart, recreation, rebuild, deletion or storage mutation was performed.

Post-install dependency verification:

- All fourteen declared direct owners actually resolve Joi 18.3.1; twenty-two
  shared Config/gRPC Auth resolutions through their callers also resolve 18.3.1.
- Semantic lock review against the pre-install HEAD lock finds one package
  version removed (joi@18.2.6) and one added (joi@18.3.1). Other changes are the
  fourteen importer pins, Joi snapshot, wait-on's transitive Joi resolution and
  twenty-six CKEditor supports-color transitive-peer metadata entries. No other
  package version or dependency edge changed. Preserve package-manager output;
  do not hand-edit metadata to produce a smaller diff. Detailed comparison is
  .ci-evidence/dependency-review/2026-11-03-lock-review.json.

Focused installed-patch checks, run by the agent:

- packages/config: test/env-validation.spec.ts and test/http-policy.spec.ts,
  2 suites / 13 tests pass.
- packages/grpc-auth: test/s2s-config.security.spec.ts and
  test/gateway-outbound-config.security.spec.ts, 2 suites / 10 tests pass.
- apps/gateway: test/application-registry.spec.ts, 1 suite / 9 tests pass.
- pnpm --filter @packages/config check-types and
  pnpm --filter @nebula/grpc-auth check-types pass.

The five targeted Jest suites have no startup hooks; source/config/security
compatibility is proven for their actual schemas, not all service flows. Earlier
8/8 focused classifier checks and lint remain valid: no implementation changed
after them. Current-focus and adopted TODO now reflect installed host status and
pending audit; formatting/whitespace review applies to those documentation edits.
Other consumers in the D2 impact table remain unchanged with the recorded
reasons. No API/protobuf/schema changes require preflight or SQL in this slice.

Next operator-owned command: pnpm scan:dependencies:backend. It collects fresh
network audit plus installed inventories and writes the ignored report. Expected
for the known findings only: runtime=0, tooling=0, deferred-web=47, unresolved=0;
fresh advisories can change these counts, so inspect results rather than pinning
them as a test expectation. Any runtime/unresolved high/critical finding still
blocks. Host success does not patch or certify running image contents; grouped
image update/scans remain D8/B5-owned. D2 stays unchecked until its audit and
scope evidence are reconciled.

Readiness: READY FOR FRESH DEPENDENCY AUDIT ONLY. No Docker restart/build needed.

### Nov 3 D2 acceptance preparation

Salar reports the fresh dependency gate passes. The actual generated report at
2026-11-03T06:58:42.061Z independently confirms backendRuntime=0,
backendTooling=0, deferredWeb=47 and unresolved=0. All 47 high/critical records
are classified only deferred-web, with no Joi finding. Policy still has no
approved advisories and blockUnresolved=true. Current lock SHA256 is
0ca94317f56a4adba6b72aa1cb51c191bbf4e2142a7b813e87c3273734f76892.

Exact documentation impact before closure: this execution report retains the
accepted audit receipt; docs/current-focus.md marks maintenance D2 complete and
moves the active start to D3; TODO-ALTERNATIVE.md updates both its Nov 2 execution
paragraph (including the obsolete no-version-changes claim) and the B0 maintenance
checkpoint. The original frozen realignment is historical evidence; the Nov 3
Joi update is a separate accepted host change. No implementation or package input
changes follow this audit, so earlier focused checks remain valid. Generated
contracts, SQL, runtime images and operational tools are unchanged; no API
preflight, live run or build is required for this documentation closure.

D2's local attribution/shipping-scope and Joi patch gates are satisfied by the
fresh audit, lock/installed-version inspection, 8 classifier checks, 32 focused
configuration/security/registry tests and two shared type checks. Web is explicitly
unshipped from backend B0, with all 47 findings retained for F7/D3 remediation
before reuse. D2 completion does not certify lower-severity findings, container
filesystems, old running Joi versions, broad hosted quality or release readiness.
Image update/parity/scans remain D8/B5-owned, not silently waived.

D3 starting observations only: docker/backend.Dockerfile pins Node 22 build and
runtime bases and uses bundled Corepack to bootstrap pnpm; .github/workflows/ci.yml
has two Node 22 setup steps; root package.json declares Node >=22 with Node 24
types; Setup.md uses Corepack. These are trace inputs, not proof that the supported
current mechanism is defective or that a major replacement is mandatory. Recheck
current support, package/native compatibility and both image bases before any D3
version decision. No Node, CI or Docker configuration is changed at this point.

Closure receipt: accepted raw audit is preserved as
.ci-evidence/dependency-review/2026-11-03-d2-accepted-audit.json. Current-focus
marks D2 complete and D3 active; the adopted TODO agrees and no longer claims
dependency versions are unchanged. Task order D1-D12, formatting and whitespace
checks pass, with only the pre-existing unrelated .gitignore line-ending warning.
The impact review is complete for the named documentation consumers; no source
or dependency input changed after the passing audit. Readiness: D2 LOCAL GATE
ACCEPTED; D3 SUPPORT/COMPATIBILITY TRACE NEXT; DEPLOYED ACCEPTANCE STILL D8/B5.

## Nov 3 full dependency, consumer and deprecation trace preparation

Salar requests a complete module/library trace and review of logs for stale
dependencies and deprecated usage before runtime changes. This expands the D3
inspection input across D4-D11; it does not authorize blanket upgrades, removals
or replacements. Reuse the accepted D2 audit and installed/lock evidence.

Read-only analysis scope: all nineteen root/workspace importers, direct/dev/peer/
optional declarations, every locked package/snapshot, first-party static/dynamic
imports and commands/config consumers, compiler/Jest/ESLint/Prisma/Docker/CI
configuration, retained build/install logs and existing dependency/image evidence.
Vendored Web assets are inventoried separately from first-party source; generated
clients, node_modules, binary archives, private envs, database/object volumes and
signed URLs are not bulk-read. Lock-graph reachability is distinct from proven
application runtime reachability. A missing static import never establishes that
a CLI, type package, dynamic consumer or peer is unused.

Documentation impact: this report records findings and precise consumers;
docs/current-focus.md receives actionable trace references under existing D tasks;
TODO-ALTERNATIVE.md only needs a checkpoint update if scope/status changes.
Runtime/package/generator/contract/SQL files remain unchanged during inspection.
Full inventories and log references belong in ignored .ci-evidence/dependency-review
artifacts rather than duplicating thousands of entries in current-focus. Registry
version age alone is optional modernization; support/deprecation/security claims
need publisher evidence and actual owner attribution. Long network inventories
remain operator-owned after local tracing/preparation.

### Trace coverage and evidence index

The Nov 3 trace is complete for the enumerated manifests, first-party files and
retained logs, with the semantic/security limits below. Counts are observations,
not numbers of defects:

| Layer                     | Observed coverage                                                                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace owners          | 19: root, 12 apps and 6 shared packages                                                                                                               |
| Declarations              | 528: 274 dependency, 242 dev-dependency and 12 peer entries; the earlier 516 count excluded peers                                                     |
| Distinct declared names   | 98, comprising 92 external libraries and 6 workspace packages                                                                                         |
| Publisher metadata        | All 92 external direct latest endpoints queried successfully Nov 3; all 6 deprecated locked versions independently rechecked                          |
| Lock graph                | 1,669 package records and 1,676 peer-context snapshots; alias normalization leaves zero missing traversed snapshot keys                               |
| First-party source/config | 760 JS/TS files; 1,503 static/dynamic/require/resolve references, command/bin and config-string consumers also indexed                                |
| Workspace relationships   | 46 declared edges; no service package depends on another service package in this graph                                                                |
| Peer checks               | 690 resolved package-context comparisons; 3 range mismatches, zero unresolved required peers                                                          |
| Logs                      | 181 retained logs, none skipped by the 16MiB per-file bound; 4,555 matching warning/hint lines, heavily duplicated and often historical lint findings |
| Running backend           | Read-only package metadata inside all 11 current containers; host and installed-image versions distinguished                                          |
| Infrastructure            | PostgreSQL 17.8, Redis 7.4.8, ClamAV 1.4.6; scanner process/update-log evidence inspected                                                             |
| Community storage vendor  | 1,029 Seaweed Go module entries from deployed provenance; source 153ab668c99731a6d29492bf6c61d0b4fa701101, Go 1.26.10, go-jose/v4 4.1.7               |
| Static Web vendor assets  | 51 top-level library directories, 16 checked-in package manifests; separate from pnpm's graph                                                         |

Detailed local artifacts, all under .ci-evidence/dependency-review/:

- 2026-11-03-full-trace.json: declarations, actual installed metadata, per-package
  callers, source list, command/config consumers, workspace edges, lock ancestry,
  config hints, sanitized warning locations, vendor manifests and dynamic loads.
- 2026-11-03-full-trace.md: the readable complete 98-package consumer index,
  exact file/line references, every declaration and deprecated-package ancestry.
- 2026-11-03-registry.json and 2026-11-03-version-comparison.json: successful
  publisher lookups and installed-versus-latest observations.
- 2026-11-03-deprecated-publisher-metadata.json and
  2026-11-03-extra-publisher-metadata.json: six verified notices, release tags
  and the additional relevant tooling/transitive candidates.
- 2026-11-03-peer-review.json and 2026-11-03-effective-tsconfig.json: actual
  peer resolution and inherited compiler settings for eighteen app/package owners.
- 2026-11-03-running-runtime.json, 2026-11-03-infrastructure.json,
  2026-11-03-scanner-update-hints.json, 2026-11-03-seaweed-modules.txt and
  2026-11-03-seaweed-binary.txt: deployed versions and vendor/update provenance.
- 2026-11-03-generator-consumers.json and
  2026-11-03-package-dispositions.json: compiler/generated/native consumers and
  the maintenance owner for every declared package.

The disposable trace-maintenance.cjs recipe remains ignored with its evidence;
it is not a new supported build/runtime command. No new production tool or
standalone planning hierarchy was created. Retain these audit artifacts through
D12; D11 can reconcile duplicate raw copies once the accepted receipt and needed
reproduction evidence are preserved.

### Findings, precise consumers and narrow dispositions

**F01 — Confirmed defect: deployed dependency drift, not a failed host patch.**
All eleven running backend containers still have vulnerable-range Joi: nine have
18.0.1 and Media/Gateway have 18.2.6; host owners all have 18.3.1. The same nine
also retain Nest 11.1.28/gRPC 1.14.4 instead of host 11.2.5/1.14.6. All containers
run Node 22.23.2. The [Joi advisory](https://github.com/hapijs/joi/security/advisories/GHSA-4528-x5fx-h6hg)
includes those deployed Joi versions. This is a dependency finding, not proof
that an externally reachable endpoint uses the affected multiple-email option.
Owner D8/B5: actual grouped image rebuild, in-image parity and filesystem scans
before release. Exact consumers: docker/backend.Dockerfile; docker-bake.hcl;
scripts/backend.mjs; scripts/docker/backend-build-graph.mjs;
scripts/docker/verify-runtime-imports.mjs; .github/workflows/ci.yml. A major Node
or framework upgrade by itself does not establish that Joi's bytes were patched.

**F02 — Confirmed defect: scanner signature updates are failing.**
The current database reports ClamAV 1.4.6/28145 dated Oct 6, while freshclam and
clamd both run. Recent updater logs explicitly report forbidden downloads and
previous 429/403 responses. Healthy clamd and EICAR acceptance do not establish
fresh signatures. The exact denial reason is not proven. Owner D4: restore
supported updater access and verify a new signature version/timestamp plus actual
scanning/recovery. Inspect docker-compose.yml:media-scanner,
docker-compose.release.yml:media-scanner and apps/media-service/src/processing/
clamav-scanner.ts. Preserve the working scan boundary and persistent signature
volume; no scanner replacement is justified. Follow the [FreshClam FAQ](https://docs.clamav.net/faq/faq-freshclam.html)
for denials/cooldowns; do not repeatedly hammer downloads or silently disable AV.

**F03 — Stale implementation: ESLint 9.36.0 is outside upstream support.**
The installed compiler/lint cohort uses ESLint 9, and its registry notice agrees
with [upstream's EOL date, Aug 6, 2026](https://eslint.org/version-support/).
Owner D5: coordinate supported ESLint/@eslint/js/typescript-eslint versions,
preserving typed lint and current assertions. Exact consumers include
eslint.config.mjs; every owner eslint.config.mjs; root/owner manifests;
apps/web/eslint.config.mjs; scripts/check-backend-test-types.mjs and the existing
CI quality commands. Merely updating ESLint 9's patch does not restore upstream
support. Paid extended support is outside this project's chosen constraints.

**F04 — Stale implementation with a dated support constraint: Prisma 6.**
All nine database owners still use CLI/client 6.16.2. It is not EOL on Nov 3:
[Prisma's release policy](https://www.prisma.io/docs/orm/release-status) provides
security fixes until **Nov 19, 2026**, sixteen days away. D7 must account for this
deadline; an open-ended v6 exception is unsuitable for a release after that date.
Stable matched 7.10.1 is available, while CLI latest resolves to 8.0.0-rc.29 and
client latest to 7.10.1. Thus blanket latest installs would select incompatible
generations. This does not justify replacing the ORM or selecting the RC.

Eight package.json files still contain deprecated Prisma seed configuration:
Blog, Media, Order, Product, Settings, Taxonomy, Tenant Authority and User. Realm
Auth is the ninth owner but lacks that deprecated package-level field. Fresh
install logs reproduce the eight warnings. The [v7 guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)
requires a coordinated config/runtime migration, not suppressing warnings. Trace
all nine prisma/schema.prisma, Prisma services and seeds; scripts/backend.mjs;
scripts/db/; packages/migration-artifacts/; scripts/docker/verify-runtime-imports.mjs;
scripts/docker/benchmark-runtime-packaging.mjs and generated path/engine checks.
The current native proof hardcodes the Debian OpenSSL engine and generated client
locations; update those consumers only with the chosen verified v7 generation
strategy. Tenant-owner compatibility does not resume tenant features.

**F05 — Stale implementation: compiler configuration blocks the planned upgrade.**
Four explicit baseUrl settings exist: tsconfig.base.json,
apps/auth-service/tsconfig.spec.json, apps/user-service/tsconfig.spec.json and
apps/web/tsconfig.json. Eight explicit legacy node resolutions exist in those
two backend test configs, Gateway/Media/Realm Auth/Settings/Tenant Authority
tsconfig.json and apps/web/tsconfig.test.json. More owners inherit CommonJS's
legacy default. They currently compile under installed TS 5.9.2; this is not a
new 5.9 compilation failure. [TypeScript 6's migration notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)
deprecate baseUrl and node10 resolution. D5 must preserve alias behavior with
explicit relative paths and compatible modern module/resolution pairs, including
tsconfig-paths/ts-node/Jest/generated consumers. No blanket ESM conversion or
ignoreDeprecations suppression is required or accepted.

TS 7 latest is not a drop-in compiler-library replacement: scripts/
check-backend-test-types.mjs imports TypeScript's JS compiler API, and ts-jest plus
typescript-eslint constrain the compiler cohort. Their [official TS 7 guide](https://github.com/kulshekhar/ts-jest/blob/main/website/docs/guides/typescript-7.md)
describes a separate compatibility path. Review TS 6 as a coordinated bridge;
document its upgrade trigger instead of claiming every latest package can be
installed together.

**F06 — Confirmed defect: peer-range mismatches, with different practical exposure.**
Actual package-context resolution yields 690 peer comparisons and three mismatches:
apps/auth-service and apps/user-service have @swc/core 1.13.5 with optional
@swc/helpers >=0.5.17 but resolve 0.5.15. Current Nest configs use the default
TypeScript builder and no .swcrc/externalHelpers configuration was found; this
does not prove current SWC execution failure. D5 must align the optional tooling
before relying on it. [SWC explains when external helpers are required](https://swc.rs/docs/configuration/compilation).

The third mismatch is required: apps/web's @ckeditor/ckeditor5-react 8.0.0 declares
React 16/17/18 peers while actual React is 19.2.0. The retained lock-install log
explicitly reports it, and installed metadata confirms it. Owner F7/D3 before
Web reuse: apps/web/package.json and src/components/editor/
RichTextEditor.client.tsx. This is a confirmed declared compatibility mismatch,
not proof of a production incident or permission to expand backend scope.

**F07 — Stale implementation: deprecated transitive records need parent-aware handling.**
The six registry-deprecated lock records are independently confirmed from their
exact publisher version metadata, not inferred from age:

| Package                                  | Actual ownership / shortest relevant chain                                           | Disposition                                                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| @types/helmet 4.0.0                      | Direct dev dependency in Blog, Order, Taxonomy manifests; Helmet already ships types | D5 remove the redundant stub with owning type/lint checks                                                               |
| @ungap/structured-clone 1.3.0            | Jest -> reporters -> jest-worker; also Web's CKEditor engine -> utils                | D5 parent-aware patched resolution; F7/D3 for Web path; publisher flags potential CWE-502, no exploitability claim here |
| glob 10.4.5                              | Jest reporters/config/runtime, Nest CLI and test-exclude                             | D5/D8 review compatible parents and the global override before updating                                                 |
| eslint 9.36.0                            | Root/Auth/Realm Auth/Tenant Authority/User/Web/migration-artifacts dev graph         | D5 supported lint cohort, not another EOL patch                                                                         |
| next 16.0.7                              | Web production dependency                                                            | Keep all Web findings tracked; remediate before F7/D3 reuse/shipping                                                    |
| @ckeditor/ckeditor5-build-classic 44.3.0 | Web production declaration; current editor source imports modern ckeditor5 instead   | F7/D3 caller-aware removal/migration review; latest tag itself remains deprecated                                       |

Root's glob override forces 10.4.5 into installed @nestjs/cli 11.0.10 even though
that CLI requests glob 11.0.3. This is a confirmed package-range discrepancy;
existing passing builds do not prove the override is safe for all commands. Fix
through compatible parent updates/scoped resolutions and existing gates, not a
blind global bump to latest glob 14.0.3. Seven other override targets are absent
from the current lock: fstream, npmlog, gauge, are-we-there-yet, inflight,
node-domexception and rimraf. They are optional cleanup candidates under D10,
not seven installed vulnerabilities; review original intent before removal.

**F08 — Confirmed tooling gap: six clean commands lack their executable.**
apps/gateway/package.json and packages/{api-client,clients,config,grpc-auth,protos}/
package.json define clean as rimraf dist, but no workspace declares rimraf, its
package is absent from the lock and no root/owner rimraf executable is installed.
A root override does not install a tool. These commands are not reproducible
from the declared workspace. Owner D10: choose the narrow existing-tool/native
cleanup correction or declare the tool, trace its callers and test guarded owned
paths. No deletion command was executed to diagnose this gap.

**F09 — Optional hardening: lint tooling depends on Auth's dev installation.**
Root plus nine service ESLint configs deliberately resolve typescript-eslint via
apps/auth-service/package.json. Exact files are in requireBindings in the trace:
Blog, Media, Order, Product, Realm Auth, Settings, Taxonomy, Tenant Authority and
User. The runtime workspace graph has no service-to-service package dependency;
this is development-tool coupling, not one service needing another service's
build output. Existing pins and accepted graph behavior work. D5 may rationalize
the development owner with a documented narrow tradeoff; no runtime package
split, new framework or forced service-isolation rewrite is justified.

**F10 — Stale implementation: Web vendor inventory remains outside npm audit coverage.**
Fifty-one checked-in vendor directories include sixteen package manifests; these
are not extra pnpm workspace owners. Examples are CKEditor classic 38.0.1 (versus
the separate installed 44.3.0 dependency), Moment 2.24.0 and Swiper 11.1.14.
apps/web/app/(panel)/layout.tsx directly serves several /assets/libs scripts and
styles. Upgrading npm packages does not replace those bytes. The [CKEditor
migration guide](https://ckeditor.com/docs/ckeditor5/latest/updating/nim-migration/migration-to-new-installation-methods.html)
confirms predefined builds are retired; [Moment's own status](https://momentjs.com/docs/)
labels it legacy maintenance. Owner F7/D3: decide asset/package disposition and
license/compatibility before Vite integration or legacy Web reuse. D10/D11 may
inventory/measure them now; do not silently delete templates or claim they are
safe because backend production audit passes. Full bundle/API/CVE analysis of
minified vendor bytes is not claimed by this source trace.

**F11 — Optional hardening/modernization: version alignment, not automatic defects.**
Sixty-seven of the 92 external direct names differ from their publisher latest
tag; twenty-five match. Latest can itself be deprecated or prerelease. Sharp
0.35.5, bcrypt 6.0.0, Joi 18.3.1, RxJS 7.8.2, class-transformer 0.5.1 and ts-node
10.9.2 already match current tags; retain working mechanisms unless new evidence
requires a change. An old publication date alone does not establish abandonment.
Duplicate bcrypt/bcryptjs use has real owners: Auth/User password hashing versus
Realm Auth migration/seed code. Do not merge them merely to reduce package count.

The four direct multi-version names are @types/jest (29/30), @types/node (20/24),
typescript-eslint (8.44.1/8.48.1) and @nestjs/throttler (6.4.0/6.5.0). D3/D5/D6
must review these against actual owners; no runtime break is inferred from the
count alone. Node host 22.14.0 and images 22.23.2 differ while backend types are
24.5.2 and Web types 20.19.25. [Node 22 remains LTS](https://nodejs.org/en/about/previous-releases);
its major is not stale merely because Node 26 LTS exists. Node 26 modernization
must account for [Corepack's removal from Node >=25](https://github.com/nodejs/corepack#default-installs).
D3 trace includes both Docker FROMs/bootstrap/removal guards, CI's two setup
steps, root engines/types, Setup.md and exact scripts/backend.test.mjs assertions.

**F12 — Optional hardening: warning/documentation hygiene needs context.**
Most of the 4,555 matches are old Web lint or earlier Media typed-lint warnings,
not deprecation incidents or current test failures. Fifty-three Prisma warnings
and thirty-five global-Turbo messages are repeated across retained logs. The
global Turbo 2.5.8 executable is deliberately installed in graph-pruner before
the local workspace install; its warning does not prove a cache or version
defect. Preserve accepted graph/injected-copy proofs. Historical Fontconfig
warnings in Salar's packaging output had passing font/native parity; no new
font failure is established. Search hits such as Array.isArray, Array.flatMap
and @aws-sdk/client-s3 are modern APIs, not deprecated util.isArray, RxJS flatMap
or AWS SDK v2. No such legacy API call was confirmed in the inspected source.

Remaining Supabase strings are compatibility enum values, browse-shape wording
and an old S3 helper comment; no Supabase npm dependency or active CLI scaffold
was found. A word match is not a dead dependency. Preserve the accepted generic
S3 behavior; optional terminology cleanup belongs to D9, not a storage redesign.

### Audit limits and execution disposition

This is a full enumerated dependency/consumer/log trace, not a proof that every
possible deprecated API is absent. Ten nonliteral loader sites were inspected:
packaging probes intentionally run inside selected images; demo tests load exact
Gateway DTO files; verify-runtime-imports loads generated config paths. The AWS
helpers intentionally use Media's createRequire context. These are not missing
root dependencies. Static evidence does not justify deleting CLI/type/peer
packages with no literal import. Cross-owner lint imports are explicitly noted.

Publisher latest checks cover all direct external libraries; the entire lock
graph is mapped, but we did not fetch fresh latest/support metadata for every
transitive version or scan all minified vendor/OS bytes. The accepted dependency
gate is production-only. Full development-dependency security attribution needs
one operator-owned diagnostic: pnpm audit --json, writing
.security-reports/workspace-all-dependencies.json. Its nonzero vulnerability exit
is evidence to inspect, not a command to run audit fix or suppress findings.
It does not replace the strict backend gate or certify images. Whole-owner type,
native, fresh-machine, OS image and current-snapshot hosted proofs remain under
their existing maintenance/B owners; no new broad suite was run in this trace.

Keep D3 active; carry concrete findings into D4-D11 without adding another phase
hierarchy. Priorities are deployed security parity before release, scanner update
recovery, supported lint tooling and the Nov 19 Prisma deadline. Version age,
lint coupling and inactive overrides must not be inflated into mandatory runtime
architecture replacements. No package, runtime, schema, generator, image,
container state, environment or stored data changed during this inspection.

### Complete direct-library version and disposition index

All 98 distinct declared names are included below: 92 external and six workspace packages. Installed versions are host observations; latest tags were queried from the publisher registry Nov 3 and are not approved targets. The complete caller/line, declaration, command and config index is .ci-evidence/dependency-review/2026-11-03-full-trace.md; full lock ancestry is in its JSON companion. Different does not imply vulnerable or unsupported.

| Package                           | Host installed   | Publisher latest                                                                  | Owning task / disposition                              |
| --------------------------------- | ---------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------ |
| @aws-sdk/client-s3                | 3.1106.0         | [3.1161.0](https://registry.npmjs.org/%40aws-sdk%2Fclient-s3/latest)              | D4/D8 Media native/S3 compatibility                    |
| @aws-sdk/s3-request-presigner     | 3.1106.0         | [3.1161.0](https://registry.npmjs.org/%40aws-sdk%2Fs3-request-presigner/latest)   | D4/D8 Media native/S3 compatibility                    |
| @bufbuild/protobuf                | 2.9.0            | [2.16.0](https://registry.npmjs.org/%40bufbuild%2Fprotobuf/latest)                | D5/D6 generator/transport cohort                       |
| @ckeditor/ckeditor5-build-classic | 44.3.0           | [44.3.0](https://registry.npmjs.org/%40ckeditor%2Fckeditor5-build-classic/latest) | F7/D3 before Web reuse                                 |
| @ckeditor/ckeditor5-react         | 8.0.0            | [12.0.0](https://registry.npmjs.org/%40ckeditor%2Fckeditor5-react/latest)         | F7/D3 before Web reuse                                 |
| @eslint/eslintrc                  | 3.3.1            | [3.3.7](https://registry.npmjs.org/%40eslint%2Feslintrc/latest)                   | D5 compiler/test/lint cohort                           |
| @eslint/js                        | 9.36.0           | [10.0.1](https://registry.npmjs.org/%40eslint%2Fjs/latest)                        | D5 compiler/test/lint cohort                           |
| @grpc/grpc-js                     | 1.14.6           | [1.14.7](https://registry.npmjs.org/%40grpc%2Fgrpc-js/latest)                     | D5/D6 generator/transport cohort                       |
| @grpc/proto-loader                | 0.8.1            | [0.8.1](https://registry.npmjs.org/%40grpc%2Fproto-loader/latest)                 | D5/D6 generator/transport cohort                       |
| @jest/globals                     | 29.7.0           | [30.5.2](https://registry.npmjs.org/%40jest%2Fglobals/latest)                     | D5 compiler/test/lint cohort                           |
| @nebula/api-client                | 0.0.1            | workspace                                                                         | D8 workspace graph; preserve boundaries                |
| @nebula/clients                   | 0.0.1            | workspace                                                                         | D8 workspace graph; preserve boundaries                |
| @nebula/grpc-auth                 | 0.0.1            | workspace                                                                         | D8 workspace graph; preserve boundaries                |
| @nebula/migration-artifacts       | 1.0.0            | workspace                                                                         | D8 workspace graph; preserve boundaries                |
| @nebula/protos                    | 0.0.1            | workspace                                                                         | D8 workspace graph; preserve boundaries                |
| @nestjs/cli                       | 11.0.10          | [12.0.11](https://registry.npmjs.org/%40nestjs%2Fcli/latest)                      | D6/D8 runtime compatibility; upgrade only if justified |
| @nestjs/common                    | 11.2.5           | [12.3.2](https://registry.npmjs.org/%40nestjs%2Fcommon/latest)                    | D6/D8 runtime compatibility; upgrade only if justified |
| @nestjs/config                    | 4.0.4            | [12.0.1](https://registry.npmjs.org/%40nestjs%2Fconfig/latest)                    | D6/D8 runtime compatibility; upgrade only if justified |
| @nestjs/core                      | 11.2.5           | [12.3.2](https://registry.npmjs.org/%40nestjs%2Fcore/latest)                      | D6/D8 runtime compatibility; upgrade only if justified |
| @nestjs/jwt                       | 11.0.2           | [12.0.3](https://registry.npmjs.org/%40nestjs%2Fjwt/latest)                       | D6/D8 runtime compatibility; upgrade only if justified |
| @nestjs/microservices             | 11.2.5           | [12.3.2](https://registry.npmjs.org/%40nestjs%2Fmicroservices/latest)             | D6/D8 runtime compatibility; upgrade only if justified |
| @nestjs/platform-express          | 11.2.5           | [12.3.2](https://registry.npmjs.org/%40nestjs%2Fplatform-express/latest)          | D6/D8 runtime compatibility; upgrade only if justified |
| @nestjs/schematics                | 11.0.7           | [12.0.12](https://registry.npmjs.org/%40nestjs%2Fschematics/latest)               | D6/D8 runtime compatibility; upgrade only if justified |
| @nestjs/swagger                   | 11.4.6           | [12.1.0](https://registry.npmjs.org/%40nestjs%2Fswagger/latest)                   | D6/D8 runtime compatibility; upgrade only if justified |
| @nestjs/testing                   | 11.2.5           | [12.3.2](https://registry.npmjs.org/%40nestjs%2Ftesting/latest)                   | D6/D8 runtime compatibility; upgrade only if justified |
| @nestjs/throttler                 | 6.4.0, 6.5.0     | [6.7.1](https://registry.npmjs.org/%40nestjs%2Fthrottler/latest)                  | D6/D8 runtime compatibility; upgrade only if justified |
| @next/eslint-plugin-next          | 16.2.4           | [16.4.4](https://registry.npmjs.org/%40next%2Feslint-plugin-next/latest)          | F7/D3 before Web reuse                                 |
| @packages/config                  | 1.0.0            | workspace                                                                         | D8 workspace graph; preserve boundaries                |
| @prisma/client                    | 6.16.2           | [7.10.1](https://registry.npmjs.org/%40prisma%2Fclient/latest)                    | D7 data-client cohort                                  |
| @swc/cli                          | 0.7.8            | [0.8.2](https://registry.npmjs.org/%40swc%2Fcli/latest)                           | D5 compiler/test/lint cohort                           |
| @swc/core                         | 1.13.5           | [1.16.21](https://registry.npmjs.org/%40swc%2Fcore/latest)                        | D5 compiler/test/lint cohort                           |
| @tailwindcss/postcss              | 4.1.18           | [4.3.4](https://registry.npmjs.org/%40tailwindcss%2Fpostcss/latest)               | F7/D3 before Web reuse                                 |
| @types/bcrypt                     | 6.0.0            | [6.0.0](https://registry.npmjs.org/%40types%2Fbcrypt/latest)                      | D5 compiler/test/lint cohort                           |
| @types/compression                | 1.8.1            | [1.8.1](https://registry.npmjs.org/%40types%2Fcompression/latest)                 | D5 compiler/test/lint cohort                           |
| @types/express                    | 5.0.3            | [5.0.6](https://registry.npmjs.org/%40types%2Fexpress/latest)                     | D5 compiler/test/lint cohort                           |
| @types/helmet                     | 4.0.0            | [4.0.0](https://registry.npmjs.org/%40types%2Fhelmet/latest)                      | D5 compiler/test/lint cohort                           |
| @types/jest                       | 30.0.0, 29.5.14  | [30.0.0](https://registry.npmjs.org/%40types%2Fjest/latest)                       | D5 compiler/test/lint cohort                           |
| @types/jquery                     | 3.5.33           | [4.0.1](https://registry.npmjs.org/%40types%2Fjquery/latest)                      | F7/D3 before Web reuse                                 |
| @types/jsonwebtoken               | 9.0.10           | [9.0.10](https://registry.npmjs.org/%40types%2Fjsonwebtoken/latest)               | D5 compiler/test/lint cohort                           |
| @types/mocha                      | 10.0.10          | [10.0.10](https://registry.npmjs.org/%40types%2Fmocha/latest)                     | D5 compiler/test/lint cohort                           |
| @types/node                       | 24.5.2, 20.19.25 | [26.6.6](https://registry.npmjs.org/%40types%2Fnode/latest)                       | D3 Node/types alignment                                |
| @types/react                      | 19.2.7           | [19.3.0](https://registry.npmjs.org/%40types%2Freact/latest)                      | F7/D3 before Web reuse                                 |
| @types/react-dom                  | 19.2.3           | [19.3.0](https://registry.npmjs.org/%40types%2Freact-dom/latest)                  | F7/D3 before Web reuse                                 |
| @types/supertest                  | 6.0.3            | [7.2.1](https://registry.npmjs.org/%40types%2Fsupertest/latest)                   | D5 compiler/test/lint cohort                           |
| @yaireo/tagify                    | 4.35.6           | [4.39.0](https://registry.npmjs.org/%40yaireo%2Ftagify/latest)                    | F7/D3 before Web reuse                                 |
| bcrypt                            | 6.0.0            | [6.0.0](https://registry.npmjs.org/bcrypt/latest)                                 | D6/D8 runtime compatibility; upgrade only if justified |
| bcryptjs                          | 3.0.2            | [3.0.3](https://registry.npmjs.org/bcryptjs/latest)                               | D6/D8 runtime compatibility; upgrade only if justified |
| ckeditor5                         | 47.3.0           | [49.0.1](https://registry.npmjs.org/ckeditor5/latest)                             | F7/D3 before Web reuse                                 |
| ckeditor5-premium-features        | 47.3.0           | [49.0.1](https://registry.npmjs.org/ckeditor5-premium-features/latest)            | F7/D3 before Web reuse                                 |
| class-transformer                 | 0.5.1            | [0.5.1](https://registry.npmjs.org/class-transformer/latest)                      | D6/D8 runtime compatibility; upgrade only if justified |
| class-validator                   | 0.14.4           | [0.15.1](https://registry.npmjs.org/class-validator/latest)                       | D6/D8 runtime compatibility; upgrade only if justified |
| compression                       | 1.8.2            | [1.8.2](https://registry.npmjs.org/compression/latest)                            | D6/D8 runtime compatibility; upgrade only if justified |
| concurrently                      | 9.2.1            | [10.0.6](https://registry.npmjs.org/concurrently/latest)                          | D6/D8 runtime compatibility; upgrade only if justified |
| dotenv                            | 17.2.3           | [18.0.9](https://registry.npmjs.org/dotenv/latest)                                | D6/D8 runtime compatibility; upgrade only if justified |
| eslint                            | 9.36.0           | [10.14.0](https://registry.npmjs.org/eslint/latest)                               | D5 compiler/test/lint cohort                           |
| eslint-config-next                | 16.0.7           | [16.4.4](https://registry.npmjs.org/eslint-config-next/latest)                    | F7/D3 before Web reuse                                 |
| eslint-config-prettier            | 10.1.8           | [10.1.8](https://registry.npmjs.org/eslint-config-prettier/latest)                | D5 compiler/test/lint cohort                           |
| eslint-import-resolver-node       | 0.3.10           | [0.4.0](https://registry.npmjs.org/eslint-import-resolver-node/latest)            | F7/D3 before Web reuse                                 |
| eslint-import-resolver-typescript | 4.4.4            | [4.4.5](https://registry.npmjs.org/eslint-import-resolver-typescript/latest)      | F7/D3 before Web reuse                                 |
| eslint-plugin-import              | 2.32.0           | [2.32.0](https://registry.npmjs.org/eslint-plugin-import/latest)                  | F7/D3 before Web reuse                                 |
| eslint-plugin-jsx-a11y            | 6.10.2           | [6.10.2](https://registry.npmjs.org/eslint-plugin-jsx-a11y/latest)                | F7/D3 before Web reuse                                 |
| eslint-plugin-prettier            | 5.5.4            | [5.5.7](https://registry.npmjs.org/eslint-plugin-prettier/latest)                 | D5 compiler/test/lint cohort                           |
| eslint-plugin-react               | 7.37.5           | [7.37.5](https://registry.npmjs.org/eslint-plugin-react/latest)                   | F7/D3 before Web reuse                                 |
| eslint-plugin-react-hooks         | 7.1.1            | [7.1.1](https://registry.npmjs.org/eslint-plugin-react-hooks/latest)              | F7/D3 before Web reuse                                 |
| express                           | 5.2.1            | [5.3.0](https://registry.npmjs.org/express/latest)                                | D6/D8 runtime compatibility; upgrade only if justified |
| globals                           | 16.4.0           | [17.14.0](https://registry.npmjs.org/globals/latest)                              | D6/D8 runtime compatibility; upgrade only if justified |
| helmet                            | 8.1.0            | [8.3.0](https://registry.npmjs.org/helmet/latest)                                 | D6/D8 runtime compatibility; upgrade only if justified |
| ioredis                           | 5.9.2            | [6.0.0](https://registry.npmjs.org/ioredis/latest)                                | D6/D8 runtime compatibility; upgrade only if justified |
| jest                              | 30.2.0           | [30.5.2](https://registry.npmjs.org/jest/latest)                                  | D5 compiler/test/lint cohort                           |
| joi                               | 18.3.1           | [18.3.1](https://registry.npmjs.org/joi/latest)                                   | D6/D8 runtime compatibility; upgrade only if justified |
| jquery                            | 3.7.1            | [4.0.0](https://registry.npmjs.org/jquery/latest)                                 | F7/D3 before Web reuse                                 |
| jsonwebtoken                      | 9.0.3            | [9.0.3](https://registry.npmjs.org/jsonwebtoken/latest)                           | D6/D8 runtime compatibility; upgrade only if justified |
| next                              | 16.0.7           | [16.4.4](https://registry.npmjs.org/next/latest)                                  | F7/D3 before Web reuse                                 |
| nx                                | 21.5.3           | [24.0.3](https://registry.npmjs.org/nx/latest)                                    | D6/D8 runtime compatibility; upgrade only if justified |
| postcss                           | 8.5.6            | [8.5.32](https://registry.npmjs.org/postcss/latest)                               | F7/D3 before Web reuse                                 |
| prettier                          | 3.6.2            | [3.9.10](https://registry.npmjs.org/prettier/latest)                              | D6/D8 runtime compatibility; upgrade only if justified |
| prisma                            | 6.16.2           | [8.0.0-rc.29 (RC; not a target)](https://registry.npmjs.org/prisma/latest)        | D7 data-client cohort                                  |
| protoc                            | 32.1.0           | [36.2.0](https://registry.npmjs.org/protoc/latest)                                | D5/D6 generator/transport cohort                       |
| react                             | 19.2.0           | [19.3.1](https://registry.npmjs.org/react/latest)                                 | F7/D3 before Web reuse                                 |
| react-dom                         | 19.2.0           | [19.3.1](https://registry.npmjs.org/react-dom/latest)                             | F7/D3 before Web reuse                                 |
| reflect-metadata                  | 0.2.2            | [0.2.2](https://registry.npmjs.org/reflect-metadata/latest)                       | D6/D8 runtime compatibility; upgrade only if justified |
| rxjs                              | 7.8.2            | [7.8.2](https://registry.npmjs.org/rxjs/latest)                                   | D6/D8 runtime compatibility; upgrade only if justified |
| select2                           | 4.1.0-rc.0       | [4.1.0](https://registry.npmjs.org/select2/latest)                                | F7/D3 before Web reuse                                 |
| sharp                             | 0.35.5           | [0.35.5](https://registry.npmjs.org/sharp/latest)                                 | D4/D8 Media native/S3 compatibility                    |
| source-map-support                | 0.5.21           | [0.5.21](https://registry.npmjs.org/source-map-support/latest)                    | D6/D8 runtime compatibility; upgrade only if justified |
| supertest                         | 7.1.4            | [7.3.1](https://registry.npmjs.org/supertest/latest)                              | D6/D8 runtime compatibility; upgrade only if justified |
| tailwindcss                       | 4.1.18           | [4.3.4](https://registry.npmjs.org/tailwindcss/latest)                            | F7/D3 before Web reuse                                 |
| throttler                         | 0.0.1            | [0.0.1](https://registry.npmjs.org/throttler/latest)                              | D6/D8 runtime compatibility; upgrade only if justified |
| ts-jest                           | 29.4.4           | [29.4.15](https://registry.npmjs.org/ts-jest/latest)                              | D5 compiler/test/lint cohort                           |
| ts-loader                         | 9.5.4            | [9.6.2](https://registry.npmjs.org/ts-loader/latest)                              | D6/D8 runtime compatibility; upgrade only if justified |
| ts-node                           | 10.9.2           | [10.9.2](https://registry.npmjs.org/ts-node/latest)                               | D5 compiler/test/lint cohort                           |
| ts-proto                          | 2.7.7            | [2.18.3](https://registry.npmjs.org/ts-proto/latest)                              | D5/D6 generator/transport cohort                       |
| tsconfig-paths                    | 4.2.0            | [4.2.0](https://registry.npmjs.org/tsconfig-paths/latest)                         | D6/D8 runtime compatibility; upgrade only if justified |
| turbo                             | 2.5.8            | [2.11.10](https://registry.npmjs.org/turbo/latest)                                | D8/D10 tooling cohort                                  |
| typescript                        | 5.9.2            | [7.0.2](https://registry.npmjs.org/typescript/latest)                             | D5 compiler/test/lint cohort                           |
| typescript-eslint                 | 8.44.1, 8.48.1   | [8.72.1](https://registry.npmjs.org/typescript-eslint/latest)                     | D5 compiler/test/lint cohort                           |
| wait-on                           | 9.0.3            | [9.5.1](https://registry.npmjs.org/wait-on/latest)                                | D8/D10 tooling cohort                                  |
| wait-port                         | 1.1.0            | [1.1.0](https://registry.npmjs.org/wait-port/latest)                              | D6/D8 runtime compatibility; upgrade only if justified |

### Full-trace closure and next diagnostic receipt

The existing action-owner list now carries F01-F12 under D3-D11; D3 remains
active and D2's production audit remains accepted. Exact changed consumers are
this report, docs/current-focus.md and TODO-ALTERNATIVE.md. Implementation,
package manifests, lockfile, generated output and contracts are unchanged from
the accepted D2 inputs. The lock SHA remains
0ca94317f56a4adba6b72aa1cb51c191bbf4e2142a7b813e87c3273734f76892;
the index is empty. No new test suite, install, restart, build, migration, cleanup
or security-threshold change was run. Read-only probes do not invalidate prior
focused/native receipts. Full trace JSON is about 8MiB and readable caller index
about 224KiB; both stay in the existing ignored evidence folder.

Coverage checks verify all 19 owners, 528 declarations, 98 distinct names, 92/92
successful direct publisher queries and zero unresolved traversed lock keys.
The preliminary three alias holes were npm alias spellings and are normalized
to actual snapshot keys. Package-context peer resolution accounts for exports;
zero required peers remain unresolved. This prevents false missing-dependency
claims from a package.json export restriction. Ten intentional dynamic loaders
and source-versus-generated probe contexts are recorded explicitly.

Next operator-owned diagnostic, using the existing pnpm command:

```powershell
pnpm audit --json > .security-reports/workspace-all-dependencies.json
"audit_exit_code=$LASTEXITCODE"
```

This is full-scope advisory data collection, including dev dependencies; no
package or lock mutation occurs. Nonzero findings require attribution, not
blanket audit fix. The expected artifact is the JSON report; network/error output
is not a clean audit. No known source-preparation failure blocks this diagnostic,
because it is intended to measure unresolved security scope, not certify a build
or commit. Native/OS/image and whole-owner semantic checks remain explicitly
pending under their existing owners. API preflight and SQL do not apply to this
read-only trace/documentation update.

Readiness: ENUMERATED TRACE COMPLETE; READY FOR FULL-SCOPE AUDIT DATA COLLECTION.
Implementation decisions remain gated on these findings and actual compatibility.

## Nov 3 full-scope audit result and remediation mapping

Salar reports pnpm audit --json exit 1. The actual file parses successfully
(PowerShell encoding normalized), has advisories/actions/metadata and no error.
This is a completed vulnerability scan with findings, not a network failure.
Original output remains .security-reports/workspace-all-dependencies.json;
normalized data and declaration-backed attribution are retained as
.ci-evidence/dependency-review/2026-11-03-all-scope-normalized.json and
2026-11-03-all-scope-attribution.json. These supersede the diagnostic-pending
receipt above; no implementation inputs changed.

### Scope and count interpretation

There are 231 advisory records. Classifying each reported importer/first-hop
against its actual manifest declaration gives the primary-path breakdown below.
An advisory can have other owners: pnpm paths are examples, not a complete
runtime reachability proof. All reported paths resolve to a known owner.

| Primary reported path           | Low | Moderate | High | Critical | Records |
| ------------------------------- | --- | -------- | ---- | -------- | ------- |
| Backend development tooling     | 11  | 54       | 63   | 7        | 135     |
| Backend runtime dependency      | 1   | 5        | 0    | 0        | 6       |
| Deferred Web runtime dependency | 10  | 35       | 37   | 6        | 88      |
| Web development tooling         | 0   | 0        | 2    | 0        | 2       |

Thus 70 high/critical records involve 18 backend-tooling package names; the seven
critical records concern four libraries, not seven separate installed products.
The raw pnpm metadata says high=120/critical=13; retain it verbatim rather than
confusing differently grouped metadata with the 115 high/critical advisory
records above. The metadata's devDependencies=0 does not establish absence of
development dependencies: actual paths explicitly traverse Jest, ts-jest, ESLint,
SWC and root dev declarations. Attribution uses those concrete paths/manifests.

The accepted production report's 47 deferred-Web findings remain tracked. Three
of its advisory IDs appear here under backend-tooling example paths as well:
form-data and two browserslist records. That is shared dependency ownership,
not newly introduced runtime exposure or an excuse to erase the Web finding.
One additional Web-only development record is measured by this full-scope audit.
Do not compare the primary Web bucket count directly with the earlier 47 total.
D2's high/critical production-runtime gate remains accepted; full maintenance is
not security-clean and its tooling findings require remediation.

### Confirmed dependency findings and exact repair owners

Every item below is a confirmed affected installed dependency according to the
audit, not proof that its vulnerable function is exercised or that compromise
occurred. Keep all severities in the evidence. Do not waive active tooling risks
merely because it is not shipped as an application server.

| Critical library / installed version | Actual reported chain                                    | Recorded patched minimum / owner                                                                   |
| ------------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| handlebars 4.7.8                     | root ts-jest -> handlebars                               | 4.7.10 covers the recorded bypass fixes; D5 test-transformer cohort                                |
| shell-quote 1.8.3                    | root concurrently -> shell-quote                         | Critical record fixes at 1.8.4, another high record requires 1.9.0; D5/D8 developer command cohort |
| @xhmikosr/decompress 10.2.0          | Auth @swc/cli -> bin-wrapper -> downloader -> decompress | 10.2.2 covers the two recorded critical traversal issues; D5 compiler/download tooling             |
| piscina 4.9.2                        | Auth @swc/cli -> piscina                                 | 4.9.4 covers the recorded critical issue; D5 compiler worker tooling                               |

Primary advisories inspected:
[Handlebars own-property bypass](https://github.com/handlebars-lang/handlebars.js/security/advisories/GHSA-p8wg-vrv2-v86f),
[shell-quote newline quoting](https://github.com/advisories/GHSA-w7jw-789q-3m8p),
[decompress symlink traversal](https://github.com/advisories/GHSA-hrh2-vp3x-79xf),
[Piscina thread options](https://github.com/advisories/GHSA-67c8-pqhq-4rmx).
The minimum versions are advisory constraints, not a complete approved install
command; check parent ranges, all records for that major, Node requirements and
the actual resulting lock graph before implementation. Existing parent updates
or compatible transitive refreshes are preferable to unnecessary replacements;
scoped overrides require an explicit justification and regression evidence.

Other high records involve glob, minimatch, serialize-javascript, flatted,
picomatch, lodash, axios, tmp, form-data, brace-expansion, js-yaml, fast-uri, nx
and browserslist. The exact version/range/advisory/path set for all 18 names is
preserved in the attribution artifact; do not patch only the earliest advisory
minimum while leaving a later bypass record open.

| Owning tool cohort                       | Exact owners / affected consumers already traced                                                                                              | Remediation boundary                                                                                                                                                    |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jest / ts-jest / type-test helpers       | root package.json; owner Jest/tsconfig.spec configs; scripts/check-backend-test-types.mjs; scripts/backend.test.mjs; .github/workflows/ci.yml | D5 preserve compiler API, transforms, assertions and test typing while resolving Handlebars/glob/minimatch/matchers/YAML/coverage chains                                |
| ESLint / @eslint/eslintrc                | root/Auth/User/Realm Auth/Tenant Authority/shared tooling manifests and all owner ESLint configs                                              | D5 supported lint cohort resolves flatted, minimatch, brace-expansion and YAML paths; preserve typed lint, no rule suppression                                          |
| Nest CLI / SWC                           | apps/auth-service/package.json; apps/user-service/package.json; nest-cli.json; corresponding builds and parent/shared tooling callers         | D5/D6 resolve decompressor, piscina, serialize-javascript, fast-uri and matcher dependencies with real builder/import proofs; optional helpers mismatch remains tracked |
| concurrently / wait-on                   | package.json dev:all and dev:\* commands; scripts/backend.mjs; scripts/backend-dev.mjs/tests                                                  | D5/D8 compatible command/process behavior while fixing shell-quote, axios and lodash paths; no blind dev-workflow replacement                                           |
| Nx                                       | package.json devDependencies and pnpm.ignoredBuiltDependencies                                                                                | D10/D5 remove only after final caller review if unused, otherwise compatible patch/update; no active Nx command/config/import found in trace                            |
| HTTP/runtime lower-severity dependencies | Express -> qs; Gateway Swagger -> js-yaml, plus root/package overrides                                                                        | D6/D8 review and patch with query/validation/OpenAPI compatibility; do not relabel as tooling or claim the runtime has zero advisories                                  |

Nx 21.5.3 has three high advisory records. The root declares it but active scripts,
CI, imports and root Nx/project/workspace config contain no consumer. This is a
strong removal candidate rather than justification for upgrading an unused build
framework. Preserve Redis's unrelated NX atomic-write flags. Removal, build-script
allowlist cleanup and lock changes have not been performed or accepted yet.

The six runtime records are five qs low/moderate records through Express and one
moderate js-yaml record through Gateway Swagger. The latest recorded minima are
qs >=6.16.1 and js-yaml >=5.4.1 for their respective currently affected branches;
inspect all owning dependency ranges and actual usage before choosing versions.
The current strict gate intentionally blocks high/critical; preserving its pass
does not mean lower-severity issues disappeared or justify changing the threshold.

### Preparation and status receipt

This is a read-only advisory attribution and plan update. Exact changed
documentation consumers: this report; docs/current-focus.md (full audit collected,
D5/D6/D8/D10 security disposition); TODO-ALTERNATIVE.md (maintenance checkpoint).
Package manifests, lock, generated APIs, runtime and CI implementation remain
unchanged. Earlier focused/source/host receipts are not invalidated by reading
new advisory data. No additional API preflight, SQL, native build, install or
broad suite applies to the documentation update.

Keep D3 active and prepare its compatible runtime baseline before the coordinated
D5 tooling changes; evidence-based removal of unused tooling can be included in
that cohort with its existing D10 trace. Record critical transitive fixes and
verify full-scope post-change audit before D5 closure. D12 must not claim supported,
secure maintenance with these active high/critical tooling records unresolved.
Deferred Web remediation remains F7/D3-owned; any Web tool actually used by current
CI must have a current exposure disposition rather than an automatic Web waiver.
Do not run audit fix --force, suppress records or rebuild images to treat host
tooling findings. Package installs/broad proofs remain operator-owned once their
actual source preparation is ready. No new diagnostic command is needed now.

Final receipt: the parsed full audit has 231 attributed records and zero unknown
reported owner paths. Independent count checks reproduce 70 high/critical tooling
records across 18 package names, seven critical records, and no high/critical
backend-runtime record. Current-focus/TODO reflect collected data and required
remediation rather than another pending scan. All three edited documents pass
Prettier/whitespace review (only the existing unrelated .gitignore line-ending
warning remains). The lock SHA is unchanged from accepted D2 inputs; Nx remains
declared and its ignored-build entry remains intact. No removal/update was made.
Readiness: FULL-SCOPE AUDIT ATTRIBUTED; D3 PREPARATION NEXT; D5 TOOLING SECURITY
REMEDIATION REQUIRED; D8/B5 DEPLOYED ACCEPTANCE STILL OPEN.

## D3 runtime alignment — preparation and selected compatibility baseline

Salar requested implementation to start after the full trace/audit. Select
**Node 24.22.2 LTS** for this compatibility pass, superseding D1's proposed Node
26 target. The official release feed now lists 22.23.4, 24.22.2 and 26.13.0;
Node 22 is still supported, so this is supported modernization under D3, not a
claim that Node 22 is EOL or a fix for all tooling CVEs.

Evidence/choice: the current [Prisma 6 system-requirements table](https://www.prisma.io/docs/orm/v6/reference/system-requirements)
explicitly lists Node 20/22/24 and has not established our installed Prisma 6
configuration on 26. Node 24 is the newest explicitly listed line, fourteen
backend/root/shared owners already use Node 24 types, and it retains bundled
Corepack. The generic statement about all LTS releases is not treated as native
proof for a newly released major. Node 26 modernization remains a separately
verified option after the Prisma/native compatibility decision; it would also
require explicit package-manager bootstrap. Choosing 24 avoids a speculative
Prisma/Node combination and an unnecessary bootstrap change. Node 22 patch-only
alignment is the narrower supported alternative, but does not meet the adopted
new-product preference for the newest mutually documented compatible baseline.
No framework/ORM replacement, compiler upgrade or runtime API refactor is needed
to prepare Node 24.

Sharp 0.35.5, bcrypt 6, current Nest and Prisma package engine ranges accept this
version. N-API/engine ranges are prerequisites, not proof that installed binaries,
Prisma engines, watch/preload or injected packages work. Host/native checks on
Node 24 remain pending until Salar installs/selects it. Linux image proofs remain
D8-owned; do not rebuild all images before the compatible maintenance cohort is
prepared. The observed 70 tooling high/critical records remain open for D5.

Official Docker Hub OCI indexes were read without pulling images. Pinned build:
node:24.22.2-bookworm@sha256:e7add2a490bb17d97b485b8641bd88455fff7839ade0f5eba493c3508124d413;
runtime: node:24.22.2-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c.
Both contain linux/amd64 entries; their index/child identities and source URLs
are preserved in 2026-11-03-d3-node-images.json. Release feed evidence is
2026-11-03-d3-node-releases.json. Preserve digest checks instead of replacing
immutable bases with floating tags.

| Changed owner / exact consumer                                                                                       | Action / unchanged reason                                                                                                                                              | Required evidence                                                                                              |
| -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| .node-version (new); package.json engines                                                                            | One canonical exact local/CI pin and compatible Node 24 patch range; no dependency change                                                                              | Selector/engine contract checks; actual host version pending                                                   |
| docker/backend.Dockerfile build-base and runtime-base FROMs                                                          | Pin exact official 24.22.2 Bookworm indexes; keep shared graph/injected outputs and runtime tool removal                                                               | Existing topology/immutability tests; actual Linux build/import proofs D8                                      |
| .github/workflows/ci.yml both setup-node steps                                                                       | Read .node-version; keep pnpm 10.17.1 and CI job scope unchanged                                                                                                       | All setup-node jobs must use selector; hosted current-snapshot proof B5                                        |
| scripts/backend.test.mjs runtime topology assertions                                                                 | Replace hardcoded Node 22 expectation with cross-file selector/engine/CI/base consistency; preserve 64-digit digest assertions and bounded Corepack preparation checks | Focused existing topology/CI checks and lint                                                                   |
| Setup.md; README.md; AI_CONTEXT.md; docs/docker-configs.md; docs/architecture/local-dev-and-docker-boot.md           | Current target, session-local fnm setup and pending acceptance; retain dated Node 22 proof descriptions as historical, not new Node 24 passes                          | Formatting, command/help validation, link/status review                                                        |
| scripts/backend-dev.mjs; scripts/backend-dev.test.mjs nativeRuntimeArguments/watch/process lifecycle                 | No version-specific implementation change found; --import preload and current dotenv/Joi/env ownership stay intact                                                     | Node 24 watch/preload/native tests pending; do not rewrite working env mechanism                               |
| scripts/docker/verify-runtime-imports.mjs; scripts/docker/benchmark-runtime-packaging.mjs/runtime-packaging.test.mjs | Existing package-name/schema/engine/native probes remain relevant; no new probe framework                                                                              | Windows host imports after selection; Linux native/artifact parity D8                                          |
| Fourteen Node 24 type owners including root; pnpm-lock.yaml                                                          | Existing type major already matches; do not roll Web's separate types into backend work or perform an unrelated install                                                | Lock hash unchanged; later D5 type patch/cohort and full owner types                                           |
| scripts/check-backend-test-types.mjs; owner Jest/tsconfig files; packages/config and grpc-auth consumers             | Source inputs unchanged; D3 changes execution runtime, not compiler/contract definitions                                                                               | Existing focused checks repeated on selected runtime; broad owner proofs operator-owned                        |
| API/protobuf/OpenAPI/client generation, schemas/migrations/seeds, private envs/storage, Seaweed supply               | Unchanged; no generator, contract, database or provider migration                                                                                                      | No API preflight/SQL needed for Node installation prerequisite; applicable final runtime proofs remain pending |

Host has fnm already installed, with system Node 22.14.0 and a separate fnm
22.15.0 installation. Do not replace Program Files Node, persist a new default
or edit shell profiles automatically. Salar can install/select 24.22.2 in the
current session using fnm; Corepack enables the existing exact pnpm version.
Preparation checks on current Node 22 are source/config checks only. No native
Node 24 or deployed acceptance is claimed before its actual execution.

### D3 source preparation result and installation handoff

Prepared .node-version=24.22.2; root engine range >=24.22.2 <25; both CI jobs read
that exact file; both Docker FROMs use the verified immutable 24.22.2 Bookworm
indexes. pnpm remains 10.17.1, all package dependencies/types and pnpm-lock.yaml
remain unchanged. The exact engine-range change is intentional runtime policy,
not an assertion that every Node 22 application is unsupported.

Expanded the existing runtime topology test to check selector/engine/CI/base
consistency while retaining immutable digest, bounded Corepack and image tool
removal assertions. It now guards package.json as a Turbo global dependency:
runtime policy changes already invalidate task caches through that file, so no
new cache key, global input, Docker COPY or pruning/synchronization behavior is
required. Inspected scripts/docker/backend-build-graph.mjs and its tests,
benchmark-build-graph.mjs, turbo.json and current CI/cache context. Preserve their
accepted graph structure; actual new-runtime native cache proofs remain D8-owned.

Updated Setup.md, README.md, AI_CONTEXT.md, Docker notes and the local boot guide
to distinguish the prepared Node 24 target from historical Node 22 receipts.
The touched setup text also contained obsolete nine-image/seven-database and
ordinary-MinIO claims, and README's active endpoint example still pointed to
MinIO immediately below its accepted Seaweed paragraph. Reconciled those narrow
document contradictions with the existing inventory/active provider; no Compose,
private env or storage setting was changed. Fresh-machine B3 remains pending.
Current-focus/TODO record Node 24 as selected and D3 remains unchecked.

Agent checks on the current **Node 22.14.0** host:

- node --check scripts/backend.test.mjs passes.
- node --test --test-name-pattern='runtime ports|CI|hosted'
  scripts/backend.test.mjs passes 4/4 selected topology/CI checks, zero skipped.
- pnpm exec eslint scripts/backend.test.mjs passes.
- Structured JSON/YAML validation confirms one selector, matching engine range,
  two CI jobs and two Docker bases identical to the queried OCI metadata.
- Existing fnm help confirms install/use and PowerShell env syntax. fnm is
  already installed; no new manager or profile edit is needed.
- Formatting/whitespace checks pass; only the existing unrelated .gitignore
  line-ending warning remains. Consumer review finds no active Node 22 selector
  left in changed configuration; dated accepted Node 22 proof remains historical.
- Lock SHA remains
  0ca94317f56a4adba6b72aa1cb51c191bbf4e2142a7b813e87c3273734f76892.

These are preparation/configuration checks, not Node 24 runtime results. No
Prisma, contract, generated-client or API source changed; no API preflight or
database proof is needed before the Node installation prerequisite. Docker
COPY inputs and exclusions did not change, so no new BuildKit context proof is
required for this handoff. Current images still contain their old runtime/Joi
versions; the 70 high/critical tooling records remain unresolved under D5.

Operator-owned next prerequisite, from this workspace in PowerShell:

```powershell
fnm install 24.22.2
fnm env --shell powershell | Out-String | Invoke-Expression
fnm use 24.22.2
corepack enable
corepack prepare pnpm@10.17.1 --activate
node --version
pnpm --version
```

Expected versions: v24.22.2 and 10.17.1. This selects only the current shell;
it does not set fnm default, replace system Node, edit profiles or restart Docker.
Do not install all workspace dependencies again solely for the runtime switch:
the actual native/import checks will first determine whether repair is needed.
After the operator result, run the existing scoped schemas/security/preload/watch
and actual bcrypt/Sharp/generated Prisma loading checks on Node 24. Broad proofs
and D8 Linux image builds remain operator-owned, with their exact results pending.

Readiness: READY FOR NODE INSTALL/SESSION SELECTION ONLY. D3 actual host/native/
watch acceptance, current-snapshot hosted CI and deployed-image proof remain open.

### D3 actual Node 24 compatibility results and broad handoff

Salar confirms fnm selected v24.22.2 and Corepack/pnpm 10.17.1. The agent's
separate shell still defaults to system Node 22, so every new runtime check was
explicitly executed through fnm exec --using=24.22.2. The actual executable is
the fnm Node 24 installation; pnpm.cmd --version independently reports 10.17.1.
No machine default, profile, system Node or Docker state was changed.

Actual Windows native operations on Node 24:

- Auth and User's real bcrypt 6 native modules both hash a disposable probe
  string and accept/reject correct/incorrect comparisons.
- Media's actual Sharp 0.35.5 native module encodes PNG, performs cover resizing
  and decodes the resulting image with expected dimensions/format.
- All nine database owners' generated Prisma clients import and each actual
  Windows .dll.node engine loads with the expected QueryEngine export. This is
  native ABI/import evidence, not a database connection, query or mutation.
- Twelve observations are preserved in
  .ci-evidence/dependency-review/2026-11-03-d3-native.json. Linux engine/image
  compatibility remains a distinct D8 proof.

Existing focused checks repeated on the selected runtime:

- packages/config env-validation and http-policy: 2 suites / 13 tests pass.
- packages/grpc-auth s2s-config.security and gateway-outbound-config.security:
  2 suites / 10 tests pass.
- Gateway application-registry: 1 suite / 9 tests pass.
- Existing backend-dev subset: 10 checks pass, zero skipped. Covers real Nest
  env precedence and redaction, effective Media S3 keys, awaited CommonJS preload,
  actual filesystem watch/debounce/new/deleted inputs, serialized restart/repair,
  closing during compilation, session ownership, port conflicts and owned Node
  shutdown releasing its port without stopping another process.
- Existing backend topology/CI subset: 4 checks pass, zero skipped, covering
  canonical pin/digest/CI/engine consistency and unchanged cache/evidence gates.
- scripts/docker/verify-runtime-imports.mjs passes for all eleven actual compiled
  backend service artifacts on Node 24, without compilation or image execution.

The focused dev runner used a temporary owned package manifest solely to invoke
the existing tests through pnpm with its real npm_execpath while selecting the
subset. No installation occurred. Its named file and empty directory were
removed after checking ownership/path identity; no persistent test tool was added.
The real shared-producer build/cache-restoration test was deliberately not run
inside this subset. Existing session.lock is absent after completion.

No application, library, schema, contract or runtime-loader correction was needed:
the current implementations already pass these Node 24 checks. Do not replace
working mechanisms or reinstall every dependency merely because the major changed.
The D3 impact table remains valid: unchanged consumers are covered by the named
checks or explicitly deferred Linux/hosted/broad proofs. Exact documentation
consumers updated now are current-focus and TODO; this report holds the details.
The root checkpoint changes from D3 next to D3 in progress.

Remaining operator-owned gates, in the already selected Node 24 shell:

```powershell
pnpm test:backend-tooling
pnpm test:backend-dev
```

The first verifies the complete backend runner/test-consumer surface under the
new runtime. The second adds the complete watch regression suite and the real
pinned pnpm/Turbo producer-edit/cache-restoration proof. No Docker build, restart,
database or feature fixture reset is needed. Full counts/results are pending;
the focused subset does not certify these omitted cases. D3 remains unchecked
until they pass. This handoff does not certify unchanged older runtime images,
clear the 70 tooling high/critical advisories or complete current-snapshot CI.
Those remain D5/D8/B5-owned.

Preparation receipt: no API/protobuf/OpenAPI/generated source changed, so API
preflight/SQL are inapplicable to this tooling-only handoff. Lock SHA remains
0ca94317f56a4adba6b72aa1cb51c191bbf4e2142a7b813e87c3273734f76892.
There is no known cheap preparation failure; formatting, scoped lint and final
documentation/consumer review apply before handoff. Runtime source, images,
private environment and stored data remain unchanged.

Final handoff receipt: Node 24 scoped ESLint and documentation Prettier pass;
git diff --check passes with only the pre-existing .gitignore line-ending warning.
Current-focus/TODO/native-artifact status checks agree on D3 still open and
full tooling/dev results pending. Readiness: READY FOR THE TWO NAMED NODE 24
TOOLING/WATCH SUITES; LINUX IMAGE AND HOSTED PROOFS REMAIN DEFERRED TO D8/B5.

### D3 host acceptance — operator results

Salar supplies both full Node 24 suite summaries: backend-tooling passes 91/91
with zero skipped in 9.631s; backend-dev passes 16/16 with zero skipped in 22.847s,
including the real pinned pnpm/Turbo producer-edit/injected-copy/cache-restoration
proof. These are operator-reported results, added to the agent-observed 12 actual
native observations, eleven compiled imports, 32 Jest checks, ten focused dev
checks and four topology/CI checks. No dependency reinstall or implementation
repair was required for Node 24 compatibility.

D3 host acceptance is complete. Update exact current consumers: current-focus,
TODO-ALTERNATIVE, Setup, README, AI_CONTEXT, Docker notes and local dev guide.
Keep the historical Node 22 live pilot distinct from Node 24 host regressions.
The .node-version/engines/CI/immutable-base policy is prepared, but no new Linux
image was built or deployed; D8/B5 retain native Linux/image/hosted acceptance.
Existing older Joi/image and full-tooling security findings remain open. No Node
24 proof clears those findings or licenses a B0 release. Next active task is D4.

## D4 preparation - infrastructure patch boundaries (Nov 3)

Requirement: apply supported infrastructure maintenance without changing database
majors, storage providers, application contracts or the paused tenant scope.
Source preparation and registry metadata are not deployment acceptance. The
working tree contains earlier Media/dependency changes; preserve them and the
empty staging index. No commit, reset or container mutation accompanies this trace.

Confirmed stale implementation: both Compose files use floating `postgres:17`
and `redis:7-alpine`; running binaries are PostgreSQL 17.8 and Redis 7.4.8.
Selected patches are 17.11 and 7.4.12. PostgreSQL stays on Debian 13/Trixie and
`/var/lib/postgresql/data`. The published Redis 7.4.12 Alpine variant still embeds
Alpine 3.21.9; its standard support ended November 1. The explicit Alpine 3.22
variant returns registry 404. Select the official 7.4.12 Bookworm variant rather
than creating a custom Redis build. This preserves the Redis branch/protocol but
changes its OS family, package footprint and runtime UID; native data/replay
acceptance is mandatory before closure. Bookworm amd64 has Debian LTS through
June 2028. Existing Redis 7.4 licensing remains RSALv2/SSPLv1; this maintenance
decision does not clear future commercial redistribution/service obligations.

ClamAV 1.4.6 remains the supported 1.4 LTS patch; its running image uses supported
Alpine 3.24.2. Preserve the accepted scanner pin unless actual image scanning
identifies a blocker. A newer same-engine image exists on Alpine 3.24.3; that is
not evidence that the current digest must be replaced. Confirmed operational
gap: signatures remain October 6 while freshclam logs show CDN denial/cooldown.
The existing freshclam daemon is alive. Its configured NotifyClamd path and
SIGUSR1 support permit one supported wakeup after cooldown, without starting a
second updater or deleting the signature database. Successful signal delivery
does not certify download success or clamd reload.

| Changed owner/symbol                                                                                          | Exact consumers inspected                                                                                        | Required action / reason                                                                                                                                                                          | Check / status                                                               |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `docker-compose.yml`, `docker-compose.release.yml`: Postgres image                                            | `postgres`, `tenant-authority-db-init`, `realm-auth-db-init` in both files                                       | Pin identical official 17.11/Trixie digest in all six references; preserve volume, init commands and profiles                                                                                     | Registry config proves major 17 and unchanged PGDATA; native upgrade pending |
| Same files: Redis image                                                                                       | `redis`, `realm-auth-default-redis`, `realm-auth-operator-redis` in both files                                   | Pin identical official 7.4.12/Bookworm digest; retain commands, ports, persistence and dormant `r3-shadow` profile                                                                                | Registry version/config inspection; native persistence/replay pending        |
| `scripts/backend.mjs`: F4 R3 owned Redis fixture                                                              | `scripts/backend.test.mjs`: consolidated-tool and shadow proof tests                                             | Match the selected Redis image without executing/resuming F4                                                                                                                                      | Focused source/orchestration checks pending                                  |
| `scripts/backend.test.mjs`: topology and archive image assertions                                             | Same file: both-Compose archive test, selected-files fixtures, Seaweed inventory fixture                         | Update real-reference expectations and pin-shape/major guards; retain arbitrary-image fixtures for deduplication and missing-backend rejection                                                    | Focused Node 24 tests pending                                                |
| `scripts/docker/release-image-inventory.mjs`                                                                  | `scripts/docker/save-release-images.ps1`, `scripts/docker/load-release-images.ps1`, `.github/workflows/ci.yml`   | Unchanged: inventory derives exact selected Compose images, including inactive profile references; archives transport selected images dynamically                                                 | Native config-only inventory comparison pending; no CI deployment claim      |
| `apps/tenant-authority-service/prisma/migrations/20260825000100_authority_registration_records/migration.sql` | `AndroidIdentity_current_package_application_excl`, `btree_gist` text/UUID GiST keys                             | Unchanged historical migration; inspect actual extension/index use against 17.9-17.11 notes before database restart; no blanket reindex                                                           | Catalog/release-note review pending; tenant implementation remains paused    |
| `docker-compose*.yml`: scanner configuration                                                                  | `apps/media-service/src/`, `packages/api-client/test/media-processing-live.mjs`, `media-processing-recovery.mjs` | Preserve supported engine pin, resource/stream bounds and persistent signatures; restore updater connectivity, then prove new signatures loaded and actual scanning                               | One updater wakeup and scanner proof operator-owned, pending                 |
| `docker/seaweedfs/`, `.github/seaweed-runtime.yml`, private storage/demo journals                             | Accepted vendor image/archive helpers and Media storage consumers                                                | Unchanged: accepted Seaweed input/provider and 302-object transition are unrelated; preserve retained MinIO and all data                                                                          | Existing accepted M1-M7 evidence retained                                    |
| `docs/docker-configs.md`, `deploy/README.md`, `docs/current-focus.md`                                         | `Setup.md`, `README.md`, `AI_CONTEXT.md`, `TODO-ALTERNATIVE.md`                                                  | Update explicit current image names and pending D4 receipt; general setup/roadmap already derives infra selection and needs no invented deployment pass                                           | Final documentation diff pending                                             |
| Gateway/RPC/protobuf/OpenAPI/generated API/client/seed contracts                                              | Existing Media/Order/Product native proofs and `scripts/check-backend-test-types.mjs`                            | Unchanged: image selectors introduce no contract/schema/TypeScript edits. `test:preflight` not applicable to this patch; backend test types required before later live/image provisioning handoff | Earlier passes retained; any later source change reopens applicable gates    |

Primary sources inspected: [PostgreSQL 17.11 migration notes](https://www.postgresql.org/docs/17/release-17-11.html),
[Redis 7.4 release notes](https://raw.githubusercontent.com/redis/redis/7.4/00-RELEASENOTES),
[Alpine support](https://www.alpinelinux.org/releases/),
[Debian Bookworm LTS](https://www.debian.org/releases/bookworm/),
[Redis licensing](https://redis.io/legal/licenses/),
[ClamAV lifecycle](https://docs.clamav.net/faq/faq-eol.html),
[freshclam download guidance](https://docs.clamav.net/faq/faq-freshclam.html),
and the [1.4.6 updater signal implementation](https://raw.githubusercontent.com/Cisco-Talos/clamav/clamav-1.4.6/freshclam/freshclam.c).
Registry/config/updater observations are retained in ignored
`.ci-evidence/dependency-review/2026-11-03-d4-*.json`; the Alpine candidate records
are rejected alternatives, not selected pins. Archive/build/scanner security
gates stay fail-closed. No assertion of clean vulnerability scans follows from
release/support metadata alone.

### D4 source preparation and applicability review

Selected immutable official indexes (linux/amd64 child/config identities recorded
separately, with no image layer download):

- `postgres:17.11-trixie@sha256:3b0cda93be7c8dba2ed484d19393d93845dc3dafb88973e248ba8e6d99d784e1`
- `redis:7.4.12-bookworm@sha256:b6b6e3dc0c0952737748e55d5d885272840c7e42ba41ab1d5489f693419882f5`

Both Compose files' three PostgreSQL and three Redis references now agree.
The consolidated tool's single disposable R3 Redis image follows the same pin.
The existing topology test guards the exact selected versions/index shape,
all six references per topology, unchanged PostgreSQL data path, dormant profile
and owned fixture alignment. Archive fixtures use the selected references while
retaining arbitrary scanner overrides, exact counts, deduplication, missing-image
failure and selected-provider assertions. No new inventory tool is introduced.
Dynamic archive/CI consumers need no code change. Historical dated audit/report
references remain historical observations rather than being rewritten.

Read-only native catalog inspection covers eleven existing Nebula databases:
only `nebula_authority` has a non-default extension, `btree_gist` 1.7. Its sole
GiST exclusion index uses `gist_text_ops` and `gist_uuid_ops`; no float GiST,
ltree or pgcrypto extension is present, and there are no replication slots.
The 17.11 notes recommend reindexing btree_gist **float** indexes with possible
NaN entries and affected long ltree btree indexes. Those conditions are absent;
do not add an unnecessary reindex/migration. The text not-equal search fix is a
relevant binary correction for the existing exclusion rule. No historical SQL
change is required. Release 17.9/17.10 notes require no additional 17.8 upgrade
procedure. Repository SQL has no pgcrypto PGP use or failing inline COPY fixture
to adjust. Catalog receipts are in `2026-11-03-d4-pg-catalogs.json`.

The Redis selected image config retains `docker-entrypoint.sh`, `redis-server`,
`/data` workdir/volume and port 6379. Its [exact official recipe](https://raw.githubusercontent.com/redis/docker-library-redis/786872f8c248c1f0990f93244cbcb3949329016d/debian/Dockerfile)
and [entrypoint](https://raw.githubusercontent.com/redis/docker-library-redis/786872f8c248c1f0990f93244cbcb3949329016d/debian/docker-entrypoint.sh)
create uid/gid 999 and correct data ownership before dropping privileges. This
supports preparing the OS-variant update; it does not substitute for a native
existing-volume load/replay check. Retain original anonymous Redis volumes and
old image IDs through acceptance. Do not infer persisted-data parity from PING.

Additional exact documentation consumer found during the final trace:
`deploy/README.md` explicitly lists archive infra references and is updated along
with `docs/docker-configs.md`. Setup/README/AI_CONTEXT general infra instructions
remain unchanged with respect to D4. Their D3 acceptance wording is reconciled.
`TODO-ALTERNATIVE.md` had a second stale D3-active sentence, now corrected. No
new API/protobuf/generated artifact, database schema, package lock or storage
input changes are included in D4. Source selection does not certify rebuilt
backend images; D8 retains grouped Node/Joi/framework rollout ownership.

### D4 prerequisite handoff receipt - download/update only

- Requirement and impact: table above revisited; all twelve Compose references,
  owned Redis fixture, topology/archive assertions and explicit current image
  documentation agree. No unknown active consumer remains from the scoped trace.
- Cheap gates: changed JS/YAML/docs formatted; both JS files pass syntax and
  scoped ESLint on Node 24.22.2; `git diff --check` passes (existing .gitignore
  CRLF normalization warning is informational). Lock SHA-256 remains
  `0ca94317f56a4adba6b72aa1cb51c191bbf4e2142a7b813e87c3273734f76892`.
- Focused behavior: five affected topology/R3-command/archive/inventory tests
  pass, zero skipped, also with `CI=true` and `GITHUB_ACTIONS=true` (191 ms).
  This does not replace Salar's accepted D3 91/16 baseline or claim a new full
  suite. No API contract change requires generated/preflight work here.
- Native preparation: actual Docker Compose config-only rendering passes for
  selected local and release topologies, matching all pins/data path/profiles;
  actual release-inventory wrapper agrees on fifteen selected and sixteen legacy
  release images. No environment values are exposed or stored in this receipt.
- Scanner prerequisite: `pkill` and `clamdscan` exist; daemon VERSION is still
  `ClamAV 1.4.6/28145/Tue Oct 6 06:26:12 2026`. The last observed cooldown ended
  November 3 at 07:01 UTC, before this inspection. Wake the existing updater once
  with VPN connectivity active. Never run a parallel updater, loop on CDN denial
  or remove its persistent databases/cooldown state.
- Actual SQL/persistence/live acceptance: **pending**, including restored-data
  startup, Redis RDB/AOF/replay behavior and a Media scanner proof after signature
  reload. Backend no-emit test types are required before that later live/provision
  handoff; this handoff only downloads immutable images and wakes the already
  running updater. No backend build, database restart, new volume or API mutation
  is requested. Prior accepted SQL/storage evidence remains intact.
- Image security and rollout: **pending** after download. New support metadata
  does not waive scans. Capture current image IDs/data witnesses and appropriate
  recoverable backup before any later replacement. Preserve accepted Seaweed,
  retained MinIO, anonymous Redis volumes and dormant operator profile. D4 stays
  unchecked; D8/B0/B5 remain open.

Operator commands from the repository PowerShell, stopping on a command error:

```powershell
docker compose pull postgres redis
docker compose exec -T media-scanner pkill -USR1 -x freshclam
docker compose exec -T media-scanner tail -n 40 /var/log/clamav/freshclam.log
docker compose exec -T media-scanner clamdscan --version
```

The signal requests an asynchronous updater wakeup, not a completed update. If
the log still shows download/reload in progress, rerun only the two read commands
when it finishes. Return the updater tail and daemon VERSION. Another 403/429
means connectivity/CDN policy is still unresolved; preserve its first error and
cooldown rather than recreating the scanner or weakening processing policy.
Neither `docker compose pull` nor this signal recreates PostgreSQL/Redis. Later
restart/acceptance commands will be prepared after these prerequisites pass.

### D4 downloaded-image acceptance and scanner denial - Nov 3

Salar reports both selected image pulls completed (PostgreSQL 159.4 seconds,
Redis 42.7 seconds), followed by the requested updater signal. Agent read-only
inspection verifies both downloaded official index references, linux/amd64
manifests, SHA-256 of their canonical config blobs, exact uncompressed layer
identities and effective runtime configuration. Receipts are in
`.ci-evidence/dependency-review/2026-11-03-d4-downloaded-images.json`.
Running PostgreSQL/main Redis/default-realm Redis/scanner remain healthy, zero
restarts, on their original image IDs and existing named/anonymous volumes.
Pulling an image has not replaced any running container. Candidate scan and
existing-data rollout remain pending.

Preparation observation caught before handoff: this Docker containerd store
reports the OCI **index** as image-inspect `Id`, whereas the canonical config has
a distinct digest. A first ad-hoc check incorrectly equated them and failed.
The existing Seaweed import verifier correctly handles its own runtime defaults
but is not a universal official-image configuration validator: PostgreSQL also
materializes omitted WorkingDir as empty and omitted Labels as null. The final
read-only inspection binds index -> amd64 manifest -> hashed config -> all
RootFS layers, then compares every config field with only the observed omitted
empty defaults (User/WorkingDir/Labels/OnBuild) normalized. Nonempty differences
still fail. No Seaweed verifier/assertion is weakened or generalized. Record
canonical config and loaded store identity separately; never infer one from
the other or refresh an expected digest to match a different object type.

Confirmed operational failure: the November 3 10:52:56 UTC update advertises daily
28173 but receives HTTP 403 for both incremental and full downloads. Freshclam
sets cooldown through **November 4 10:52:58 UTC (14:22:58 Tehran)** and exits.
The clamd process remains healthy and reports engine 1.4.6/signatures 28145 dated
October 6. Salar clarifies the VPN was off during that request and is now on;
this does not prove a successful VPN-routed CDN download. Do not retry during
the new cooldown, delete freshclam.dat, clear signatures or weaken scanning.

Next narrow operational action: restore exactly one updater using the image's
existing `/init` invocation (`freshclam --checks=1 --daemon --foreground --stdout
--user=clamav`), after confirming it is absent. Run it detached from the Docker
exec session; this recreates no container and changes no updater config. Its
existing database/log/cooldown state and NotifyClamd path remain intact. Verify
one updater process and a log entry acknowledging the cooldown. Fresh signature
download/reload and actual Media scanning remain unaccepted until a supported
post-cooldown update succeeds. Do not mark D4 complete merely because all Docker
health probes are green.

Agent restores the updater with that exact invocation after checking there is no
existing freshclam process. Native observation confirms **one** freshclam process
and an updater log explicitly acknowledging the existing November 4 cooldown.
No container is restarted, no signature is deleted, and no immediate CDN retry
is attempted. Receipt: `2026-11-03-d4-updater-restored.json`. The scanner's clamd
VERSION remains 28145; this restoration is process continuity, not fresh-signature
acceptance. The VPN will need to remain available for the supported next update.

### D4 security report collection handoff

The next operator action is three sequential read-only image scans. The exact
PostgreSQL/Redis references were inspected after download, the existing ClamAV
reference matches the running scanner, and all three are already local. The
selected/configured engine and data remain untouched. Keep the accepted Seaweed
scan/input evidence separate; no Seaweed rebuild or scan invalidation is caused
by this step.

Preparation receipt: no implementation change follows the five passing focused
D4 tests, syntax/lint checks and native config/inventory checks. Only this report
and current-focus gain operational results. The report output directory already
exists. Trivy 0.74.0 is installed; its cached DB dates October 31, so allow its
normal DB refresh from the GHCR source that previously succeeded. Do not use
`--skip-db-update` or ignore findings. Explicit `--image-src docker` avoids an
unrequested remote image selection. `--exit-code 0` is **collection only**, the
same strategy as existing `buildTrivyImageArgs`; it does not approve findings.
Scanner/tool errors still fail. Agent must subsequently review every report with
the existing `summarizeTrivyImageVulnerabilities` classification and preserve
HIGH/CRITICAL entries using `createTrivyEvidenceReport`. Existing policy defers
only unfixed Debian OS findings; fixable OS/application findings and scanner or
identity errors block. No new exception or blanket vulnerability waiver is
introduced. Exact config/platform identity and signature freshness checks remain
separate from vulnerability classification. No backend live/provision command is
handed off; that later handoff still requires backend test types and data/recovery
preparation.

```powershell
trivy image --image-src docker --platform linux/amd64 --db-repository ghcr.io/aquasecurity/trivy-db:2 --scanners vuln --severity HIGH,CRITICAL --exit-code 0 --timeout 15m --format json --output .security-reports/d4-postgres.json postgres:17.11-trixie@sha256:3b0cda93be7c8dba2ed484d19393d93845dc3dafb88973e248ba8e6d99d784e1
trivy image --image-src docker --platform linux/amd64 --db-repository ghcr.io/aquasecurity/trivy-db:2 --scanners vuln --severity HIGH,CRITICAL --exit-code 0 --timeout 15m --format json --output .security-reports/d4-redis.json redis:7.4.12-bookworm@sha256:b6b6e3dc0c0952737748e55d5d885272840c7e42ba41ab1d5489f693419882f5
trivy image --image-src docker --platform linux/amd64 --db-repository ghcr.io/aquasecurity/trivy-db:2 --scanners vuln --severity HIGH,CRITICAL --exit-code 0 --timeout 15m --format json --output .security-reports/d4-clamav.json clamav/clamav:1.4@sha256:57deb108fc4c72778aa83eafbca7bb7153e28c3f57c005afd38d31f16da86f23
```

Stop if a scan itself fails. Reports are ignored local evidence, not public CI
artifacts; raw image config/environment fields must not be printed or uploaded.
Tell the agent when collection finishes so the local reports can be inspected.
No claimed scan pass, restart, successful signature download or D4 closure is
recorded before that evidence exists.

### Checkupino comparison requested by Salar - Nov 3

Read the current public `pain1122/nebula` source through the GitHub connector,
rather than relying on the older local `D:\Salar\nebula` checkout. Relevant
consumers inspected: `docker-compose.scan.yml`, `docker-compose.scan-producer.yml`,
`docker-compose.scan-demo.yml`, `docker/medical-scan/{start.sh,freshclam.conf}`,
`scripts/media/diagnose-scanner-egress.mjs`, and the deployment notes
`medical-scanner-2026-10-05.md`, `clamav-upstream-access-draft-2026-10-08.md`,
`medical-scanner-acceptance-2026-10-09.md`, `medical-scanner-recovery-2026-10-10.md`.

Confirmed historical finding: that project's October 9 acceptance records a
corrected VPN **TUN route covering Docker** and a successful ordinary official
FreshClam update to daily 28148. The preceding diagnosis recorded IR/FRA; its
corrected-route observation recorded US/IAD, with public IP withheld. Its source
uses `DatabaseMirror database.clamav.net`, scripted updates, database load testing
and NotifyClamd. It does not implement a GitHub signature-build/import workaround.
The offline recovery test reuses existing fresh official definitions read-only;
it does not obtain updates offline or demonstrate a hosted database supply path.

Reference: [recorded updater acceptance](https://github.com/pain1122/nebula/blob/main/docs/deployment/medical-scanner-acceptance-2026-10-09.md),
[network diagnosis and recovery history](https://github.com/pain1122/nebula/blob/main/docs/deployment/clamav-upstream-access-draft-2026-10-08.md),
[updater configuration](https://github.com/pain1122/nebula/blob/main/docker/medical-scan/freshclam.conf).
These are that repository's source/recorded historical results, not newly executed
Checkupino runtime proofs. No other project's config, containers or data is changed.

Its scanner startup refreshes first and exits when either child dies; application
checks reject definitions older than 48 hours or over five minutes in the future.
NebulaNV currently checks availability/strict scan verdicts, with no equivalent
signature-age guard. This is a confirmed behavior difference, not the cause of
the CDN denial. Replacing process supervision, adding freshness enforcement or
moving to its 1.5 engine would be separate scoped changes requiring consumer and
recovery preparation; do not silently copy the medical application's architecture
or turn this comparison into a new scanner-engine migration. D4 acceptance still
requires actual fresh loaded signatures even though current health stays green.

One bounded metadata-only HTTPS observation after Salar enabled the VPN reports
**DE / FRA / TLS 1.3** from the running Media container on the scanner's shared
`nebulanv-main_default` bridge. The scanner has no configured proxy environment
variables; its FreshClam config has no explicit updater proxy. The scanner image
has no curl CLI, so no tool is installed and no helper container is created just
for this check. Existing Media Node fetch performs the request; only country,
colo and TLS are emitted, with public IP discarded in memory. Receipt:
`2026-11-03-d4-vpn-route.json`. This suggests the current Docker route differs from
direct Iranian egress; it is not an observation from the exact FreshClam process
or proof that the ClamAV CDN will allow the next download. Preserve cooldown
until November 4 10:52:58 UTC; no new definition request or scanner restart is
performed. VPN connectivity must also cover the next actual scheduled update.

A hosted signed-database supply path remains a possible fallback, not an
implemented/accepted replacement. It would need regular supported upstream
fetching, artifact integrity/version validation, safe transfer into the existing
signature volume, rollback and clamd reload/freshness evidence. Merely importing
an image cannot replace files hidden by that volume. The narrower route correction
has a successful historical precedent and currently observable non-IR Docker
egress; first preserve the cooldown and verify the subsequent official update.

Salar explicitly requests one further try after enabling the VPN. Agent sends
SIGUSR1 once to the existing updater. At November 3 11:13:15 UTC, FreshClam logs
the wakeup but refuses a new download because its existing cooldown still ends
November 4 10:52:58 UTC. This is a local cooldown refusal, **not** a newly observed
CDN 403 through the VPN. Clamd still reports 1.4.6/28145/October 6. No signature
or cooldown state is altered, no second updater is launched and no further retry
is made. Current-route definition access remains untested.

### D4 native vulnerability reports - Nov 3 operator results

All three reports were produced with the refreshed November 3 Trivy DB. Agent
inspects the actual local JSON, not just the successful command exit codes.
Each report's full artifact reference, repository digest, amd64 platform and
uncompressed layers match its previously inspected local image. Redis's command
looks truncated in chat, but its report contains the **full intended digest** and
matching layers; no repeat scan is needed to repair a presentation-only anomaly.
Raw reports remain under `.security-reports/d4-{postgres,redis,clamav}.json`.
Existing `createTrivyEvidenceReport` and
`summarizeTrivyImageVulnerabilities` retain/classify all findings; sanitized
receipts and summary are under `.ci-evidence/dependency-review/2026-11-03-d4-*.json`.
No gate, finding or threshold is changed.

| Image                                       | HIGH/CRITICAL package/advisory records | Current-policy blockers                            | Unfixed Debian OS records retained |
| ------------------------------------------- | -------------------------------------- | -------------------------------------------------- | ---------------------------------- |
| PostgreSQL 17.11/Trixie                     | 89                                     | 26, all Go stdlib records in `/usr/local/bin/gosu` | 63, including one CRITICAL         |
| Redis 7.4.12/Bookworm                       | 33                                     | 0                                                  | 33, including one CRITICAL         |
| Existing ClamAV 1.4.6 / Alpine 3.24.2 image | 3                                      | 3                                                  | 0                                  |

These are package/advisory records, not counts of demonstrated remotely
exploitable application defects. Redis passes the **existing development
classification**, not a zero-findings/security-clean claim or production release.
Unfixed Debian entries stay visible for production-hardening/recheck. The
PostgreSQL and scanner image reviews remain unaccepted; none is deployed by this
report processing. Signature freshness and image vulnerability scanning are
independent acceptance requirements.

#### Scanner: confirmed fixable OS package gaps

| Package     | Installed | Available fix | Advisory                  |
| ----------- | --------- | ------------- | ------------------------- |
| brotli-libs | 1.2.0-r1  | 1.2.1-r0      | CVE-2026-111497, CRITICAL |
| libcurl     | 8.22.0-r0 | 8.23.0-r0     | CVE-2026-92392, HIGH      |
| pcre2       | 10.48-r0  | 10.49-r0      | CVE-2026-103111, HIGH     |

All three fix versions are independently confirmed in the official
[Alpine 3.24 security database](https://secdb.alpinelinux.org/v3.24/main.json),
with source-package mappings brotli/curl/pcre2. Receipt:
`2026-11-03-d4-alpine-advisories.json`. Supported OS/engine status alone does not
clear these actual package gaps; the earlier decision to retain the scanner
digest was explicitly conditional on its scan result.

Narrowest next candidate: the official current 1.4 and 1.4.6 tags both resolve to
`clamav/clamav:1.4.6@sha256:8ad6197396974726c35d017e50aaaaf4b91745726a04faec8480c203edd98052`.
Its publisher config was created November 2, uses Alpine 3.24.3 and preserves
`/init`; amd64 manifest/config identities are recorded in
`2026-11-03-d4-clamav-candidate.json`. This keeps the same engine release and
tries a publisher OS refresh before considering a custom build. Installed package
versions and a clean candidate scan are **pending** until download/inspection.
No Compose/source pin is promoted yet, no scanner is recreated, and no signature
volume or cooldown is changed. Even a clean candidate image would not solve the
separate mounted signature database's freshness/CDN issue by itself.

#### PostgreSQL: assess the actual helper before a replacement build

The official PostgreSQL recipe uses gosu 1.19 to drop root privileges; Trivy
reports its embedded Go 1.24.6 stdlib, not the PostgreSQL server binary. Twenty-five
HIGH and one CRITICAL records have published Go fixes (the newest listed fix
floor in this report is 1.26.10 / 1.27.3). The CRITICAL example is
CVE-2025-68121 in TLS session resumption. The PostgreSQL/PGDATA/extension decisions
are unchanged; the scan does not justify moving database major or switching libc.

The [gosu security policy](https://github.com/tianon/gosu/blob/1.20/SECURITY.md)
explicitly identifies Go functionality that gosu never invokes and requests
govulncheck applicability analysis. Upstream [gosu 1.20](https://github.com/tianon/gosu/releases/tag/1.20)
still reports a Go 1.24.6 build, so blindly updating that version is not a
verified fix for these stdlib records. [Go's own guidance](https://go.dev/doc/security/vuln/)
supports source/binary symbol analysis to narrow affected code. Next inspect the
exact installed helper and match all reported advisories to actual applicable
symbols. No current finding is silently dismissed on the basis of a maintainer's
general statement; source/binary proof and its limits remain pending. Preserve
the strict scanner result until disposition is supported. Do not introduce a
custom PostgreSQL build, replace privilege dropping, ignore all stdlib records
or add a blanket VEX/allowlist simply to get green. Any subsequently proposed
replacement needs the requirement, narrower-fix analysis, compatibility and
maintenance cost recorded first.

#### Candidate download/scan prerequisite receipt

No implementation, package, contract, fixture or schema change accompanies this
handoff; the earlier five focused tests, syntax/lint, config/inventory and lock
checks remain valid. This is an image download and read-only scan, not a backend
live/provision handoff. The exact candidate tag/index and amd64 config are
reverified against the official registry, report directory exists, and the prior
three scans prove installed Trivy/GHCR DB access. Collect a **separate** report;
retain the original failing scanner evidence. Definition database, approved Media,
credentials, volume bindings and running containers are unchanged. Candidate
security/native acceptance and later backend test types/persistence/recovery
preparation remain pending. No additional broad test rerun is requested.

Operator commands, one at a time; stop on a tool/download error:

```powershell
docker pull clamav/clamav:1.4.6@sha256:8ad6197396974726c35d017e50aaaaf4b91745726a04faec8480c203edd98052
trivy image --image-src docker --db-repository ghcr.io/aquasecurity/trivy-db:2 --scanners vuln --severity HIGH,CRITICAL --timeout 15m --format json --output .security-reports/d4-clamav-updated.json clamav/clamav:1.4.6@sha256:8ad6197396974726c35d017e50aaaaf4b91745726a04faec8480c203edd98052
```

Scan completion alone is not acceptance: inspect the candidate's actual reports
and identity before changing either Compose pin. D4 stays open.

### D4 scanner publisher refresh - preparation before pin promotion

Salar completes the candidate pull and scan. Agent verifies exact reference,
amd64 architecture, repository digest and all uncompressed layers against the
downloaded local image. The fresh November 3 report contains **zero HIGH/CRITICAL
findings**, zero policy deferrals, on Alpine 3.24.3. Preserve the original failing
report. Sanitized identity/results are in
`2026-11-03-d4-clamav-updated-scan.json`. This supports promoting the source pin;
the still-running old scanner and its signature volume have not changed.

| Changed owner                                                        | Exact consumer                                                                                                                                                             | Action / unchanged reason                                                                                                                                   | Verification                                                                               |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `docker-compose.yml`, `docker-compose.release.yml`: scanner fallback | `MEDIA_SCANNER_IMAGE` override; `scripts/backend.test.mjs` archive/topology tests                                                                                          | Change both defaults to the scanned official 1.4.6 index; preserve override support, health/resource bounds, volume, endpoints and dependencies             | Pin equality and exact expected fallback assertion; native selected/release config pending |
| Same defaults                                                        | `scripts/docker/release-image-inventory.mjs`, save/load PowerShell wrappers, `.github/workflows/ci.yml`, `.github/seaweed-runtime.yml`                                     | No hardcoded scanner digest: derive the selected Compose image; preserve fifteen/sixteen image counts and custom override test                              | Existing native inventory wrapper + focused tests pending                                  |
| Scanner runtime                                                      | `apps/media-service/src/processing/clamav-scanner.ts`, `media-processing.worker.ts`; `packages/api-client/test/media-processing-live.mjs`, `media-processing-recovery.mjs` | No engine/protocol or application-source change; retain accepted transport tests and scanning policy. Later deployment/recovery evidence explicitly pending | Isolated no-network CLI version probe; no live startup yet                                 |
| Current behavior docs                                                | `docs/current-focus.md`, `docs/docker-configs.md`, owning execution report                                                                                                 | Distinguish scanned new source pin from old deployed scanner; preserve cooldown and signature freshness status                                              | Format/diff and final source/consumer review pending                                       |
| Historical evidence and data                                         | `.security-reports/d4-clamav.json`, dated Media/dependency reports, private scanner/storage/demo state                                                                     | Retain original IDs/results and all existing volumes; no blind global replacement of historical pin references                                              | Only current source fallback references change                                             |

Separately, Salar explicitly requests Docker engine mirror setup using verified
Iranian providers. Inspect actual Desktop engine config and Buildx driver before
changing settings. Current active daemon has no mirrors; its host configuration
is `C:\Users\asus\.docker\daemon.json`, containing enabled automatic builder GC
with a 40GB retention target and `experimental=false`. Both existing builders use
the integrated `docker` driver; do not create/switch builders or lose their cache.
Provider selection and metadata/blob checks precede local config edits; preserve
all other settings, keep a private backup and hand the long engine restart to
Salar. No insecure-registry/TLS exception, source image renaming, package-manager
mirror or FreshClam endpoint change is implied. This authorized engine transport
configuration is separate from scanner signature distribution and the PostgreSQL
helper assessment.

### Docker mirror selection and local configuration preparation

Primary instructions inspected: [Liara Docker Hub mirror](https://docs.liara.ir/mirrors/docker/),
[Arvan Docker mirror](https://www.arvancloud.ir/fa/dev/docker),
[Docker daemon registry mirrors](https://docs.docker.com/docker-hub/image-library/mirror/),
[Docker Desktop Engine settings](https://docs.docker.com/desktop/settings-and-maintenance/settings/#docker-engine),
and [BuildKit mirror configuration](https://docs.docker.com/build/buildkit/configure/#registry-mirror).
All three candidate endpoints respond with an ordinary anonymous Bearer challenge
and registry/2.0. That alone is not sufficient: bounded authenticated-anonymous
requests also verify the exact PostgreSQL index, amd64 manifest and config-blob
SHA-256 through all three. Arvan/Liara additionally pass the same checks for the
actual pinned Node build base and refreshed ClamAV image. TLS validation stays on;
no image layers, credentials, tokens or private images are involved or persisted.

Select `https://docker.arvancloud.ir` first and
`https://docker-mirror.liara.ir` second. Observed host metadata timings favor Arvan
(roughly 0.5-0.7 seconds vs 2.3-5.1 seconds in these probes), but these are not
large-layer throughput benchmarks or guarantees of future availability.
`https://registry.docker.ir` also passes the PostgreSQL probe; its commonly claimed
ParsPack attribution could not be verified against a current primary provider
source in this review, so it is not added merely from third-party lists. Salar's
request allows other good mirrors; the two provider-documented, verified endpoints
fulfil the selected scope without requiring an account/subscription or daemon
login. No universal speed/reliability claim follows from these bounded probes.

Use the existing `C:\Users\asus\.docker\daemon.json` and merge **only**
`registry-mirrors`. Before editing, retain original bytes privately under
`.ci-evidence/dependency-review/2026-11-03-docker-daemon-before-mirrors.json` and
record before/after hashes. Assert the remaining config is identical, including
enabled 40GB builder GC and experimental=false. Do not edit Docker client auth,
proxy, WSL/resources, managed settings or experimental flags. Arvan's example
also shows insecure-registries/logout; neither is necessary for the observed
valid HTTPS endpoint and neither is applied. No BuildKit-container driver is
created: both current builders are integrated Docker drivers and retain their
existing caches. A future standalone builder would require its own separately
validated registry configuration.

Impact/verification: host daemon file is the changed owner; integrated pull and
BuildKit resolvers are its runtime consumers. Both existing builders, current
Compose source references, immutable digests, release/CI image identity, package
manager/Go proxy settings and FreshClam distribution remain unchanged. The local
configuration change is explicitly user-requested transport setup, not a security
replacement. Validate JSON, exact two-provider list and preservation of other
keys before handing off restart. Active engine adoption, native image pull and
post-restart readiness remain **pending**, not established by editing the file.
No running containers are stopped/recreated by preparation. Any restart is
operator-owned; restore original containers rather than running an unscoped
Compose up that would prematurely apply the unaccepted PostgreSQL image.

Probe receipts: `2026-11-03-docker-mirror-endpoints.json`,
`2026-11-03-docker-mirror-manifests.json`,
`2026-11-03-docker-mirror-build-inputs.json`. Raw diagnostic scripts are ephemeral
agent execution; no new maintained tool, root command or CI dependency is added.
These daemon mirrors cover Docker Hub, not GHCR, apt/apk, npm, Go modules or
FreshClam. Registry mirror access cannot resolve the scanner CDN cooldown.

### Scanner pin and mirror activation handoff receipt

- Scanner source promotion is prepared: both Compose defaults select the scanned
  official 1.4.6 digest; the existing archive test additionally asserts that exact
  fallback without removing its digest-shape or override checks. Four affected
  topology/archive/selected-provider tests pass, zero skipped. Actual local/release
  config and inventory wrappers pass with fifteen/sixteen images and the original
  signature volume. Scoped lint/syntax/format/diff gates apply to the small pin
  change; no API/TypeScript/schema consumer changes require regenerated contracts.
- A no-network, read-only, automatically removed candidate CLI container reports
  ClamAV **1.4.6**, bundled definitions **28171 / November 1**. It mounts no live
  volume and starts neither clamd nor freshclam. This checks the engine, not fresh
  live definitions or the active worker. The current October 6 signature database
  and updater cooldown remain untouched. No application/scanner image is deployed
  by the mirror activation commands below.
- The exact candidate PostgreSQL helper is copied, without executing/rebuilding
  gosu or starting PostgreSQL, through one read-only/network-none/automatically
  removed image container. Its 1,769,900-byte ELF SHA-256 is
  `52c8749d0142edd234e9d6bd5237dff2d81e71f43537e2f4f66f75dd4b243dd0`.
  Binary and provenance live under ignored
  `.ci-evidence/dependency-review/d4-gosu/`; no new permanent tool/root command.
  govulncheck applicability analysis and any disposition remain pending. Do not
  turn the upstream general guidance into an unproved exception.
- Mirror daemon config is written and parsed back successfully, with Arvan then
  Liara and all other keys exactly retained. Original private config bytes,
  before/after hashes and pending-adoption status are in the previously named
  backup and `2026-11-03-docker-mirror-config.json`. Active daemon still advertises
  no mirrors before restart. Preparation is not active engine adoption.
- Baseline before the operator restart: all **sixteen** running `nebulanv-main`
  containers are healthy, and existing IDs/images/services are recorded in
  `2026-11-03-docker-mirror-pre-restart.json`. One additional existing container,
  `nebula-seaweed-proof-seaweed-1`, is healthy in its separate proof project with
  restart policy `no`. Preserve its data and restore its existing container after
  the engine restart; do not delete it or confuse it with live Seaweed storage.
  No other project/configuration is edited. Retained MinIO stays stopped.
- Long stop/restart/start/wait remains Salar-owned. Stop the project's existing
  services gracefully before Desktop restart; start the recorded sixteen service
  containers by name with `start`, preserving their current images and
  mounts while PostgreSQL assessment is open. No unscoped Compose up, image build,
  cache prune, volume reset or new migration is requested. This is resolver
  activation/existing-container restoration, not a new-image rollout or broad
  backend live-suite handoff; unchanged application/type/SQL evidence is retained.
- After restart, require the active engine to advertise both mirrors, inspect
  restored IDs/images/mounts and health, then perform a native pinned pull/resolver
  check. These runtime results are **pending**. Native full-layer throughput and
  actual mirror-hit/fallback observations are not established by host probes.
  D4 stays open for that result, PostgreSQL applicability/persistence, later
  selected image deployment/recovery and fresh signatures after the cooldown.

Preparation catches a local CLI compatibility limit: this installed Compose
`start --help` supports only `--dry-run`, without `--wait`/`--wait-timeout`. Do not
hand off those unsupported flags. Desktop restart's `--timeout` is verified.
Use plain start, inspect actual health with `docker compose ps`, and run the
health command after services become healthy. This correction is made before
operator execution; no failed startup is reported as readiness evidence.
PowerShell commands from the repository root, stopping on a command failure:

```powershell
docker compose stop --timeout 60
docker desktop restart --timeout 300
docker compose start postgres redis realm-auth-default-redis seaweed media-scanner user-service auth-service realm-auth-service tenant-authority-service settings-service media-service taxonomy-service product-service blog-service order-service gateway
docker start nebula-seaweed-proof-seaweed-1
docker info --format '{{json .RegistryConfig.Mirrors}}'
docker compose ps
```

Once the sixteen services show healthy:

```powershell
pnpm backend:health
```

Expected mirror output lists `https://docker.arvancloud.ir/` and
`https://docker-mirror.liara.ir/` (a trailing slash is harmless). Return mirror
output and final readiness result. If Desktop restart fails, retain its actual
error rather than forcing WSL/process termination. A Docker restart preserves
the signature cooldown; it is not another authorized CDN retry or proof of a
successful signature update. Rollback for a configuration-related daemon failure
is to copy the exact private before-mirrors backup back over the same host daemon
file and restart Desktop, preserving all other settings and data.

### Mirror activation and actual service recovery - Nov 3

Salar's engine reports both selected mirrors active. His running list initially
contains only seven of the sixteen main-stack services; consolidated health fails
at Auth. Native inspection finds nine application containers still cleanly exited
with code zero, no OOM/error/restart and no new StartedAt after the earlier stop.
Their last logs show graceful SIGTERM shutdown, rather than a fresh crash caused
by image/package changes. A scoped Compose dry-run reports `service "redis" has
no container to start` despite the existing Redis container being healthy. This
is an observed restoration-path limitation; it alone does not establish the
precise cause of the earlier partial Compose start.

Salar supplies the missing operator output: Docker Desktop restart failed to stop
its frontend/backend processes before a context deadline; only a partial start
progress excerpt follows. The active daemon nevertheless eventually returns with
the selected mirrors. The first handoff did not achieve verified full recovery.
Do not attribute this to an Auth crash or claim the restart command was successful.
The complete original Compose failure remains unavailable; preserve that limit.

Agent restores only the already-existing stopped containers in dependency groups:
Auth/Realm Auth/Authority/Taxonomy, then Product/Blog/Media, then Order, then
Gateway. Each direct `docker start` completes quickly and never creates a
container, pulls/replaces an image, runs a migration or changes configuration.
Actual HTTP readiness is checked between groups. One early Media read has a
closed socket; its next read is 200. Gateway initially returns UPSTREAM_UNAVAILABLE
503 during warmup, then its own health log and consolidated probe return 200.
No blanket reconnect policy, build, contract change or application patch is used
to hide these startup transitions.

Final native acceptance for this restoration: **all sixteen** main containers
running/healthy; **all eleven** consolidated backend readiness checks pass on
Node 24.22.2. Every container ID and image ID exactly matches the recorded
pre-restart baseline. PostgreSQL/Redis/scanner mounts exactly match the separate
pre-maintenance witness. Mirror order is active as Arvan then Liara, with harmless
trailing slashes. Receipt: `2026-11-03-docker-mirror-after-recovery.json`.
No selected new infrastructure/scanner image has been deployed. The updater and
clamd are both alive; loaded definitions remain 28145 / October 6. Existing
signature cooldown is retained. A native new-image pull/resolver check, PostgreSQL
applicability work and later selected-image/data/scanner acceptance remain open.

Preparation correction: future engine stop/restart and service restoration must
be separate stages, gated on the actual native exit and a reachable daemon;
PowerShell executing a multiline block does not automatically stop on a native
command failure. Validate actual restored containers/readiness after each group.
When source pins are staged but not accepted, direct starts of witnessed existing
containers preserve image/data identity without relying on current Compose
discovery. Config-only rendering or progress lines are not lifecycle acceptance.
Update the existing preparation checklist rather than adding a new startup tool.

### PostgreSQL helper applicability - prepared operator proof

Continue the original D4 task after restoring the stack. Exact candidate gosu
bytes still match the recorded SHA-256. The official Go module proxy reports
current stable `golang.org/x/vuln` **v1.9.0**, requiring Go **1.26.0**. Select the
existing digest-pinned Go **1.26.10 / Alpine 3.24** builder reference already owned
by `docker/seaweedfs/security.Dockerfile`; no unpinned latest/compiler bootstrap or
project dependency update. Metadata receipt: `2026-11-03-d4-govulncheck-version.json`.
The Go team's binary-analysis documentation supports `-mode=binary -json`.

The next command downloads/compiles/runs the diagnostic tool inside one bounded
temporary container (two CPUs, 2 GiB), with only the exact helper directory mounted
read-only. It does not run gosu or PostgreSQL, mount application code/secrets/data
or access the Docker socket. Default Go checksum verification stays enabled.
Temporary module/build caches live in the automatically removed container, with
no new named volume or maintained wrapper script. The original raw Trivy findings
stay unchanged. The fixed source artifact path, file hash, selected Go/tool
compatibility and output directory are checked before handoff; long tool/image
downloads and compilation stay operator-owned. Docker Hub mirrors cannot repair
a separate Go proxy/vulnerability-DB connection failure; keep the VPN available
and stop on an actual transport/tool error.

```powershell
docker run --rm --platform linux/amd64 --cpus 2 --memory 2g --pids-limit 128 --env GOTOOLCHAIN=local --env CGO_ENABLED=0 --mount "type=bind,source=D:\Salar\NebulaBackup\nebulaNV-main\.ci-evidence\dependency-review\d4-gosu,target=/proof,readonly" --entrypoint go golang:1.26.10-alpine3.24@sha256:a2012b4a1d1f9f7e9f44e0d39b805a901e856b1dd80b4e6ee4338db547050308 run golang.org/x/vuln/cmd/govulncheck@v1.9.0 -mode=binary -json /proof/gosu-linux-amd64 > .ci-evidence/dependency-review/d4-gosu/govulncheck.jsonl
```

Record `$LASTEXITCODE` after execution. The output is a JSON message stream;
PowerShell may write UTF-16, so decode its actual encoding before parsing rather
than assuming ordinary UTF-8 single-document JSON. Exit zero alone does not clear
all 26 Trivy records: verify scanned binary/compiler/tool identity and that the Go
database covers the reported advisories, then assess applicable symbols and any
additional findings. Binary analysis has limits and is not a blanket VEX/ignore
authorization. No suppression, helper replacement or custom database image is
implemented before that evidence. D4 remains open.

### End-of-day checkpoint - November 3; resume November 4

Salar runs the prepared bounded diagnostic and reports **exit code 1**. Downloads
of golang.org/x/vuln v1.9.0, telemetry, sync, mod and tools complete sufficiently
for govulncheck to start. It then fails fetching its vulnerability database:

```text
govulncheck: fetching vulnerabilities: HTTP GET https://vuln.go.dev/index/modules.json.gz returned unexpected status: 403 Forbidden
exit status 1
```

Classification: confirmed diagnostic transport/access failure, not a finding that
the gosu binary is safe or exploitable. The compiler/tool download stage is not
the failing stage. The exact CDN/network denial rule is unverified. Docker Hub
mirror activation does not redirect this Go vulnerability database endpoint.

Preserve `.ci-evidence/dependency-review/d4-gosu/govulncheck.jsonl` as **partial**
output (1,784 bytes observed), together with the exact helper binary/identity and
original raw/sanitized Trivy reports. No completed coverage/symbol result is
accepted; all 26 Go-library records remain unresolved. Do not parse absence of
findings from this failed run as a pass, change expected hashes, suppress records,
replace privilege dropping or rebuild PostgreSQL merely to clear an unavailable
diagnostic. The temporary container was requested with `--rm`; no persistent tool
or named module/build-cache volume was introduced by this command.

Salar explicitly requests logging this for tomorrow. Stop execution for the day;
no further network retry, scanner update, container restart or image rollout is
performed. Last accepted runtime evidence remains sixteen healthy main-stack
containers, eleven readiness passes, original images/mounts and active Arvan/Liara
mirrors. The newly scanned ClamAV source pin is prepared but not deployed.

Resume November 4: first verify a supported reachable route for the Go
vulnerability database, then repeat the bounded exact-binary analysis and assess
advisory coverage before disposition. If a hosted/offline diagnostic path is
needed, prepare its source/freshness/identity/import validation before execution;
it is not already implemented or approved as a permanent replacement. Preserve
the passing scanner scan and unchanged source checks. Independently, a controlled
FreshClam retry can occur only after the retained **November 4 14:22:58 Tehran /
10:52:58 UTC** cooldown, with Docker's VPN route verified; successful download and
loaded freshness still need proof. D4 remains unchecked and later maintenance
steps retain their existing scope/order.

### November 4 resume - runtime healthy; Go database route restored

At approximately 10:00 Tehran, all sixteen main-stack containers are running and
healthy, and `fnm exec --using=24.22.2 node scripts/backend.mjs health` passes all
eleven actual backend readiness checks. Seaweed initialization exited zero as
expected; retained MinIO stays stopped. The separate Seaweed proof container is
healthy. No restart, recreation, migration or image rollout is needed/performed.
The configured Arvan/Liara mirrors remain active, with seven CPUs and about 13.1
GiB available to Docker. Initial observations are retained in
`.ci-evidence/dependency-review/2026-11-04-d4-resume.json`.

Confirmed diagnostic access failure: initial Windows and Docker requests to the
official Go vulnerability database still return HTTP 403. The historical Google
Storage endpoint probes also return 403; no alternate database is selected.
Salar confirms the VPN was off and enables it. A bounded, read-only temporary
container using the **exact pinned Go 1.26.10 image and default Docker network**
then successfully retrieves `https://vuln.go.dev/index/db.json`. The same route
successfully downloads and parses both compressed module/vulnerability indexes.
TLS validation remains enabled; no project secrets, database/storage volumes or
Docker socket are mounted. No complete diagnostic compilation is repeated here.

The canonical database reports modified `2026-11-02T22:01:43Z`. Retained API bytes
and SHA-256 receipts are in `d4-gosu/2026-11-04-db-route.json` beside the three
downloaded index files. Its 1,444 module entries include 187 stdlib advisories;
the vulnerability index has 4,712 entries. All **26/26** original gosu CVEs have
aliases mapping to Go IDs present in that stdlib index, recorded separately in
`d4-gosu/2026-11-04-advisory-coverage.json`. This is index coverage only; individual
advisory records and actual binary symbol results remain pending. The extracted
binary SHA-256 still equals
`52c8749d0142edd234e9d6bd5237dff2d81e71f43537e2f4f66f75dd4b243dd0`.

Current authoritative references: the [Go database API](https://go.dev/doc/security/vuln/database)
defines these endpoints and supports a file database, and
[govulncheck documentation](https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck)
documents binary symbol analysis and its database selection. No hosted/offline
replacement is necessary now that the original route is reachable. Database
timestamps are retained as supplied, not treated as a wall-clock freshness SLA.

Preparation/handoff receipt:

| Owner/consumer                                                            | Action and result                                                                                                                                    |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/current-focus.md`; this report                                      | Update observed health, restored route and exact next proof.                                                                                         |
| `.ci-evidence/dependency-review/d4-gosu/{identity.json,gosu-linux-amd64}` | Unchanged; exact input bytes rehashed successfully.                                                                                                  |
| `d4-gosu/govulncheck.jsonl` and prior failure receipt                     | Preserve yesterday's incomplete output; next run uses a separate dated file.                                                                         |
| `2026-11-03-d4-postgres-scan.json`                                        | Unchanged; all 26 Go records matched to canonical index entries. No suppression/disposition.                                                         |
| Both Compose files; `scripts/backend.mjs`; Docker/CI recipes              | Unchanged: no implementation/configuration change, only diagnostic access restoration.                                                               |
| Gateway/RPC/protobuf/OpenAPI/generated clients; SQL/seed fixtures         | Unchanged: no affected contracts/data. Preflight, backend test types and broad suites are inapplicable to this documentation/diagnostic-only change. |
| FreshClam updater and its persistent cooldown                             | Unchanged: before Nov 4 14:22:58 Tehran, no update request. Remains a separate D4 proof.                                                             |

READY FOR NAMED PROOF: exact-input bounded binary analysis, operator-owned because
its module download/compilation may be long. Keep the VPN routing Docker traffic.
No broad build/test suite or infrastructure rollout is handed off. Record the
native exit code and assess the full JSON stream even if the command exits zero;
an emitted finding is not a transport failure or permission to omit a check.

```powershell
docker run --rm --platform linux/amd64 --cpus 2 --memory 2g --pids-limit 128 --env GOTOOLCHAIN=local --env CGO_ENABLED=0 --mount "type=bind,source=D:\Salar\NebulaBackup\nebulaNV-main\.ci-evidence\dependency-review\d4-gosu,target=/proof,readonly" --entrypoint go golang:1.26.10-alpine3.24@sha256:a2012b4a1d1f9f7e9f44e0d39b805a901e856b1dd80b4e6ee4338db547050308 run golang.org/x/vuln/cmd/govulncheck@v1.9.0 -mode=binary -json /proof/gosu-linux-amd64 > .ci-evidence/dependency-review/d4-gosu/govulncheck-2026-11-04.jsonl
"analysis_exit_code=$LASTEXITCODE"
```

Expected result: a completed JSON message stream rather than a database HTTP 403.
Whether vulnerable symbols are reported is deliberately not pre-assumed. The
next review will reconcile actual emitted records, binary identity and advisory
coverage; D4 and all 26 dispositions stay open until that review.

### November 4 completed binary review - applicability and separate parser issue

Salar reports native exit **0**. The retained UTF-16LE stream is 1,227,416 bytes;
decoding and parsing all objects succeeds. Review verifies govulncheck v1.9.0,
binary/symbol mode, canonical database modified `2026-11-02T22:01:43Z`, gosu
v1.19.0, embedded Go 1.24.6, Moby user v0.1.0 and unchanged input SHA-256.
The stream has 266 messages: one config, three progress, one SBOM, 190 advisory
messages (183 unique IDs), and 71 findings (59 unique IDs). These counts describe
different message levels and must not be called 71 exploitable vulnerabilities.
The [official tool documentation](https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck)
explicitly states JSON mode exits successfully regardless of detected findings.

The retained review receipt is
`.ci-evidence/dependency-review/d4-gosu/2026-11-04-analysis-review.json`;
the operator's complete output and yesterday's failed output both remain intact.
Every original Trivy CVE maps to an advisory actually emitted by this run.
**None of those 26 records has a vulnerable-function match.** One,
CVE-2026-39822 / GO-2026-4970, has an `os` package match; the others have only
module-level matching in this analysis. This is evidence of absent symbol matches
in this exact binary, not a universal assertion about all gosu builds, dynamic
reachability, future advisories or every PostgreSQL image. The existing strict
Trivy gate has no applicability-input consumer and still reports 26 blockers;
no automatic suppression, VEX import or exception is introduced by this review.

**Confirmed dependency defect, separately identified:** GO-2026-6686 /
CVE-2026-61801 / GHSA-mjcv-p78q-w5fw matches three functions in
`github.com/moby/sys/user` v0.1.0: `ParseGroupFilter`, `GetExecUserPath` and
`GetExecUser`. The [publisher advisory](https://github.com/moby/sys/security/advisories/GHSA-mjcv-p78q-w5fw)
classifies this as **Moderate**, fixed in v0.4.1, with memory-exhaustion denial of
service conditional on parsing attacker-controlled user/group database files.
It was not one of the HIGH/CRITICAL Trivy records under review. The canonical
Go advisory's aliases and fixed range agree with that primary advisory.

Trace: [gosu 1.19 main.go](https://github.com/tianon/gosu/blob/1.19/main.go)
calls SetupUser; [setup-user.go](https://github.com/tianon/gosu/blob/1.19/setup-user.go)
calls GetExecUserPath with the system passwd/group paths. The PostgreSQL
entrypoint uses `gosu postgres` to drop root before starting the database.
Both current Compose files mount PGDATA and read-only initialization scripts;
neither mounts user/group files or an untrusted root filesystem. Actual live
PostgreSQL mounts agree; it is not privileged and has no added capabilities.
Selected-field receipt: `d4-gosu/2026-11-04-postgres-helper-exposure.json`.
This does not prove arbitrary local/root compromise impossible, but no supported
demo request path controlling these files or remote exploitation is demonstrated.
Replacing the privilege-drop mechanism is not justified by these observations.

The current official PostgreSQL 17/Trixie Dockerfile still selects **gosu 1.19**.
[gosu 1.20 go.mod](https://github.com/tianon/gosu/blob/1.20/go.mod) selects the fixed
Moby parser **0.4.1**. Its [security policy](https://github.com/tianon/gosu/blob/1.20/SECURITY.md)
requests applicability review for unused Go functionality. Its wrapper excludes
only the older setuid advisory GO-2023-1840; that is not an exclusion for this
new parsing issue and has not been copied into this project.

Maintenance decision prepared for review (neither route implemented):

| Route                                             | Concrete scope and compatibility/maintenance cost                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep the publisher PostgreSQL image               | Preserve the selected digest, server, helper and entrypoint. Review narrowly scoped applicability evidence for the 26 exact findings and explicitly track the Moderate parser issue/exposure. Closing the strict gate would require a separately reviewed exact-identity applicability consumer; the current gate cannot consume this report. Exceptions require re-review on binary/advisory changes.                                                                                                                                                    |
| Patch only the existing helper in a derived image | Retain the digest-pinned PostgreSQL 17.11 filesystem, server, entrypoint and PGDATA. Build verified gosu 1.20 with the supported pinned Go compiler, preserving its privilege-drop behavior and fixing the Moby parser. This additionally removes the old compiled standard library. Adds one maintained vendor recipe/artifact/supply identity and requires helper ownership/group tests, actual fresh image scan, preserved-data startup and release/archive reconciliation. It does not rebuild PostgreSQL or require a database major/data migration. |

The derived-image route is **optional hardening for the demonstrated deployment
exposure**, although it directly repairs a confirmed dependency defect and avoids
maintaining version-based applicability exceptions. It has real artifact upkeep
cost; no such replacement is implied by the earlier transport failure or the
operator's successful analysis. Obtain an informed selection before implementing
either new gate semantics or an optional maintained image. A simple official
helper version bump alone does not guarantee every stdlib version warning clears.

Consumer review: `scripts/backend.mjs` summarizeTrivyImageVulnerabilities and
`scripts/backend.test.mjs` remain unchanged; both Compose files and
`scripts/docker/release-image-inventory.mjs` retain selected image identities.
No generated contract, application caller, SQL fixture, seeder, package lock or
CI job changes in this diagnostic-only step. Existing focused checks remain
valid. `docs/current-focus.md` and this report record the result and pending
decision. No broad suite, new image build, release write or live data mutation
is handed off. FreshClam's retained cooldown is still a separate pending proof.

### November 4 operator clarification - disposable demo data

Salar confirms that all current project data is dummy data supplied by seeders;
preserving those rows, objects and history is not a rollout requirement. This
supersedes the preserved-data startup requirement in the preceding proposed
helper-update route for this local demo. Prefer fresh initialization and actual
seeder/verification acceptance when recreation is necessary, instead of spending
time on backups or populated-data preservation solely for this deployment.
Existing `package.json` commands `demo:d1:{seed,verify,reset}` and
`demo:d2:{seed,verify,reset}` remain the starting consumers; their presence alone
does not certify a complete fresh deployment or permit bypassing their ownership
journals. Trace the selected recreation scope before issuing reset commands.

Migration/rollback tests remain correctness checks for the product, separately
from preservation of today's disposable fixture data. An empty database also
does not change the gosu binary or its scan findings. This clarification selects
neither a new vendor-image maintenance obligation nor vulnerability exceptions.
No volumes, credentials, configuration, signing keys, vendor evidence or journals
are removed here. Only this report and current-focus change; no implementation
or broad suite handoff occurs.

### November 4 authorized PostgreSQL 18 / gosu implementation trace

After the optional status, deployment exposure and maintenance costs are explained,
Salar explicitly requests updating PostgreSQL to the latest stable release and
gosu to the latest supported release. Selected targets are **PostgreSQL 18.6**
and **gosu 1.20**, retaining Debian/Trixie. This supersedes the preceding pending
image-choice status. Fresh demo data is authorized; no application database or
storage reset is performed during preparation. The old PostgreSQL 17 directory
must not be mounted as a PostgreSQL 18 cluster. Use an explicitly separate fresh
versioned volume, then retire the obsolete volume only after actual acceptance.

Pre-implementation dependency trace (results will be revisited before handoff):

| Owner / exact consumer paths                                                                                                                               | Required action / unchanged reason                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docker/postgres/security.Dockerfile` (new)                                                                                                                | Pin official 18.6 base and Go compiler; checksum/commit-pin gosu 1.20 source; retain entrypoint and privilege-drop behavior, license and binary provenance. No PostgreSQL source rebuild.                          |
| `docker-compose.yml`; `docker-compose.release.yml`                                                                                                         | Select one shared vendor image for PostgreSQL and both client-only initializers; mount fresh pgdata18 at /var/lib/postgresql, matching PG18 PGDATA. Ports/credentials/database names stay unchanged.               |
| `.github/workflows/ci.yml`; `scripts/backend.test.mjs`                                                                                                     | Build/load vendor image before fresh CI provisioning; trace ordering/cache/runtime assertions and immutable input pins. Update exact image/layout fixtures without changing archive counts or security thresholds. |
| `scripts/docker/release-image-inventory.mjs`; `scripts/docker/{save-release-images,load-release-images}.ps1`; `scripts/docker/record-image-identities.mjs` | Inspect dynamic inventory/identity consumers; retain discovery from effective Compose, ensure vendor tag is archived. Do not substitute local store ID for canonical config identity.                              |
| `scripts/backend.mjs`; `scripts/db/init-multiple-dbs.sh`; `scripts/db/ensure-tenant-authority-db.sh`; `scripts/db/ensure-realm-auth-dbs.sh`                | Trace fresh initialization/provisioning/Prisma commands and client image use. Preserve historical migration SQL and paused feature scope; compatibility remains pending actual PG18.                               |
| `scripts/demo/{run,state,commerce-state,runner,commerce-runner}.mjs`; `package.json`; `.nebula-demo/`                                                      | Trace identity journals against recreated databases; prepare fresh journal/seed acceptance, no blind reset against missing old IDs. Credentials and object-storage configuration remain separate.                  |
| `docs/docker-configs.md`; `deploy/README.md`; `docs/current-focus.md`; this report                                                                         | Record selected versus running versions, major-version volume change, build/scan/fresh bootstrap proof and future PG19 review.                                                                                     |
| `.github/seaweed-runtime.yml`; `docker/seaweedfs/`; Gateway/protobuf/OpenAPI/generated clients; nine Prisma owner schemas/clients                          | Inspect applicable bootstrap/storage/driver boundaries; unchanged unless an actual incompatibility is demonstrated. No contract or historical SQL edits merely for a database version bump.                        |

Official registry metadata resolves 18.6-trixie to index
`sha256:3a4264520e121176619f54ff867d12774bc81e95e7b84db58d63bccdb6144b81`,
amd64 manifest `sha256:f4b419e350fd98d4a8429603295208976dea4c8fb8326d818d346d3e29f1db6f`.
The gosu 1.20 tag resolves to commit
`29b939aa5bd4dc588af765b8248f6e39150d2565`. Native image build, scan,
privilege-switch tests, fresh cluster/Prisma/seed/runtime acceptance remain pending.

Salar additionally requests a **November 19, 2026 PostgreSQL 19 review**.
The [official RC1 announcement](https://www.postgresql.org/about/news/postgresql-19-rc-1-released-3409/)
plans RC2 on November 12 and GA on November 19, conditional on no further delay.
On/after GA verify actual stable release, official image/gosu/compiler, current
Prisma/driver support, release changes and migration/native acceptance; reassess
retiring the custom helper layer. This note creates neither an automatic upgrade
nor a scheduled external reminder. Continue stable 18.6 preparation now.

### PostgreSQL 18 / gosu preparation results and build handoff

Implementation now prepared; the live PostgreSQL 17 instance remains untouched.
The official amd64 base configuration is downloaded and independently SHA-256
verified against its manifest reference: config
`sha256:a1be1c8380f5c8ca80b4ad72f6be191f8a283e0ecb2e9496b1ee67dc0022d0f1`,
PG_MAJOR 18, PG_VERSION 18.6-1.pgdg13+2, GOSU_VERSION 1.19,
PGDATA `/var/lib/postgresql/18/docker`, VOLUME `/var/lib/postgresql`, original
`docker-entrypoint.sh` / `postgres` entrypoint and command. Selected-field receipt:
`.ci-evidence/dependency-review/d4-gosu/postgres-18.6-base-identity.json`.
No unverified assumption about the changed volume layout is used.

The actual official gosu archive is 18,160 bytes, SHA-256
`2b70da8a5480fafedc16bb1fc91b572f064d03df736cbd91a616af2f1b66ab51`.
Its version constant is 1.20 and go.mod/go.sum pin Moby user 0.4.1. The recipe
checks the archive, version, module checksum verification and unchanged module
files; builds only gosu with pinned Go 1.26.10, static linking and symbol metadata
retained; embeds its license and provenance. Build-time behavioral gates test the
patched parser plus real named/numeric UID/GID, supplemental groups, non-root and
invalid-user cases. Those RUN gates are **prepared, not yet executed**; they run
in Salar's forthcoming image build. PostgreSQL binaries/extensions are inherited.
GOSU_VERSION is explicitly updated so the runtime environment does not retain
the base image's stale 1.19 declaration. Scope is currently linux/amd64.

Revisited dependency table:

| Exact consumer                                                                                                                                                 | Final action / actual check                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker/postgres/security.Dockerfile`                                                                                                                          | New bounded vendor recipe with immutable base/compiler/source and actual build-time tests. BuildKit `--call=check` passes with no warnings; full build/native tests pending. Context is docker/postgres only, with no local COPY inputs or project env files. Remote source bytes were verified independently.                                                                                                                                                                        |
| Both Compose files                                                                                                                                             | All six server/client-initializer references select `nebulanv-vendor-postgres:18.6-gosu1.20-go1.26.10`. New pgdata18 mount matches the actual base config; existing PG17 volume is not silently reused or deleted. Native config-only local/release renders and boundary checks pass.                                                                                                                                                                                                 |
| `.github/workflows/ci.yml`                                                                                                                                     | Existing live CI builds/loads the same vendor recipe before provisioning, caches it under its own scope, and only the existing trusted writer condition can upload that cache. A separate pre-provision scan uses the existing runBackendImageScans policy unchanged. Its sanitized report is added to the exact artifact allowlist. No new workflow or external publication.                                                                                                         |
| `scripts/backend.test.mjs`                                                                                                                                     | Update shared image fixture, major-specific volume checks, immutable recipe/source guards, CI supply/scan ordering and exact retained evidence path. Nine focused cases pass, including under CI=true/GITHUB_ACTIONS=true; no registered test count or security threshold weakened.                                                                                                                                                                                                   |
| `scripts/backend.mjs`                                                                                                                                          | Unchanged. Existing runBackendImageScans accepts a selected services argument and applies the same policy to the new vendor in CI. The regular default scan covers backend application images only, so that default alone would not certify PostgreSQL; the explicit CI vendor scan closes this integration gap. Provisioning already runs both role/database initializers, all owner migrations/status/base seeds before service acceptance. Actual fresh execution remains pending. |
| `scripts/docker/{release-image-inventory.mjs,save-release-images.ps1,load-release-images.ps1,record-image-identities.mjs}`                                     | Unchanged dynamic inventory/archive commands include the new vendor through actual Compose. Native wrapper reports 15 selected references / 16 explicit legacy-base references, still one PostgreSQL image. Backend-tested-identities remains an eleven-application report, not infrastructure identity evidence; base identity and future actual vendor scan/build output are tracked separately here.                                                                               |
| `scripts/db/{init-multiple-dbs.sh,ensure-tenant-authority-db.sh,ensure-realm-auth-dbs.sh}`                                                                     | Unchanged: initialization uses the inherited official entrypoint and creates existing database names; both role initializers reuse the new vendor's psql. SQL execution on PG18 remains pending, not certified by configuration rendering.                                                                                                                                                                                                                                            |
| `scripts/db/{d1-upgrade-snapshots.sql,f4-r2-authority-rollback-fixture.sql,f4-r2-product-rollback-fixture.sql,verify-d2-stock.mjs,verify-d2-demo-payment.mjs}` | Catalog trace finds whole-schema before/after comparisons within one run, not hardcoded PostgreSQL-17 constraint counts. No assertions removed to avoid PG18 NOT NULL catalog entries. Relevant migration/rollback proofs need actual PG18 acceptance; paused F4 feature execution remains deferred.                                                                                                                                                                                  |
| `scripts/demo/{run,state,commerce-state,runner,commerce-runner}.mjs`; `.nebula-demo/{d1,d2-showcase,d2-limits}.json`                                           | Unchanged seeder implementations. A fresh database requires matching fresh journals; stop all seed/proof writers, archive only these owned journal files before running seeders, and do not call ownership reset against missing old IDs. Actual journal move/reseeding is deliberately deferred until the image scan passes. Seaweed objects are not deleted by database recreation.                                                                                                 |
| Nine Prisma owners / `scripts/check-backend-test-types.mjs`                                                                                                    | Unchanged packages/schema/SQL. Current [Prisma v6 compatibility documentation](https://docs.prisma.io/docs/orm/v6/reference/supported-databases) lists PostgreSQL 18. Native Prisma 6.16.2 migrate/query/seed acceptance is still required; documentation alone is not its result. All eight live test owners pass no-emit checks: 125 files, zero errors. D7 Prisma maintenance/support deadline remains open.                                                                       |
| Gateway/protobuf/OpenAPI/generated consumers; Seaweed supplier/overlay; historical audit reports                                                               | Unchanged: no API contract, storage endpoint, object format or historical fact changes. Existing proof evidence is preserved; test:preflight is inapplicable to this infrastructure-only slice.                                                                                                                                                                                                                                                                                       |
| `docs/docker-configs.md`; `deploy/README.md`; `docs/current-focus.md`; this report                                                                             | Update build supply, volume layout, pending native acceptance and November 19 review. Existing dated reports keep their historical PG17 observations.                                                                                                                                                                                                                                                                                                                                 |

Cheap gate receipt: formatting, scoped ESLint and Node syntax pass; git diff check
passes with only the pre-existing .gitignore CRLF warning. Actual local/release
Compose renders, existing boundary validator and dynamic archive inventory pass.
Nine selected topology/CI/archive/Trivy-policy tests pass in the hosted CI
environment, zero skips; eight owner test-type checks pass with 125 files.
An initial host Git Bash syntax-check invocation times out; both changed CI shell
blocks then pass actual `bash -n` through the existing PostgreSQL container,
without executing those blocks or changing the running database. No unresolved
cheap preparation failure remains.

**READY FOR NAMED PROOF: build only the PostgreSQL vendor image.** No application
image build, Compose recreation, data deletion or schema migration is part of
this handoff. Module download/compiler work and image load stay Salar-owned.
Keep the VPN on for Docker/Go source access. Source/image security policy and
versioned data compatibility are not certified until the subsequent proofs pass.

```powershell
docker buildx build --platform linux/amd64 --file docker/postgres/security.Dockerfile --tag nebulanv-vendor-postgres:18.6-gosu1.20-go1.26.10 --load --progress=plain docker/postgres *> postgres18-build.log
$postgresBuildExit = $LASTEXITCODE
Get-Content postgres18-build.log -Tail 30
"build_exit_code=$postgresBuildExit"
```

Stop on failure. Expected successful build runs the parser and actual helper
privilege/version gates and loads the vendor tag. Return the native exit and
tail; the next step inspects/scans that actual image and reconciles its canonical
configuration/layers and provenance before any live rollout. Do not infer a
security scan pass from successful compilation. Fresh PG18 initialization,
all-owner migration/status/base seed, fresh D1/D2 journals and seed verification,
relevant SQL contracts and live readiness/flows remain **pending**.

### November 4 build failure - upstream parser test fixture correction

Salar's first vendor build exits 1 in Moby user v0.4.1 tests, before helper build,
image export or live rollout. All three `TestParseGroupFileCapsReads` cases fail:
the short NUL padding becomes an unexpected group record; the long NUL padding
hits `bufio.Scanner: token too long` before the intended file-size guard. Source
inspection confirms the test constructs one NUL-filled line while production
deliberately caps each group line at 1 MiB. This is not PostgreSQL initialization,
Docker health, permission, module download or new compiler failure.

The [upstream test-only fix](https://github.com/moby/sys/commit/764f6927e9b8e5cf9c5b3c67efcd7875064ec481)
explicitly documents that the added line limit broke this fixture. It replaces
padding with bounded comment lines and keeps the below/exactly-at/above file-cap
expectations. It also uses reflect.DeepEqual instead of slices.Equal for these
non-nil expected slices. Only user/user_test.go changes. No test case or assertion
is dropped. Latest Moby user is v0.5.0, but that includes broader user-lookup
rewrites; a runtime dependency bump is unnecessary for this test-fixture defect.

Before editing, affected paths: `docker/postgres/security.Dockerfile` needs an
exact upstream test-file download applied only to an isolated module test copy;
`scripts/backend.test.mjs` must guard its immutable identity and isolation;
`docs/docker-configs.md`, `docs/current-focus.md` and this report must describe
the build receipt accurately. Both Compose files, vendor tag, CI recipe/scan
consumer, source gosu module files, runtime Moby version, release inventory and
SQL/seed consumers remain unchanged. Preserve the failed log under the existing
ignored evidence directory before a retry overwrites the root log. Verify all
other module files remain byte-identical and re-run checksum verification of
the original module cache. Focused native parser acceptance is pending until run;
do not hand off another full build while that known preparation failure remains.

Correction and native proof: the published corrected test file is 15,680 bytes,
SHA-256 `5dd67fd1ccfd0287084ed60ce1b791c7094204e9a2158b765c2ec1b2b13d5adc`,
downloaded by the recipe from the full upstream commit with an ADD checksum.
Comparison against the published v0.4.1 module ZIP confirms exactly the upstream
three-hunk test change, preserving all eleven top-level test functions and every
file-cap assertion. Diff receipt: `d4-gosu/verified-upstream-test-only.diff`.
The original checksum-verified module cache is never patched. Tests run in a
separate /tmp copy with only user_test.go replaced; sorted relative-path SHA-256
manifests of every other file match before and after testing. The original module
cache verifies again and gosu's go.mod/go.sum hashes remain unchanged.

The first agent-only repair probe catches a portability mistake before handoff:
Alpine BusyBox diff does not implement GNU diff -x. Replace that comparison with
portable file manifests plus cmp, retaining byte checks and detection of extra
files. No diffutils installation or weakened comparison is needed. This probe
and the operator's original failed log are retained separately. The retry then
passes actual native `helper-tests` execution: **full parser package PASS**, 0.089s
test execution / 2.3s final RUN, both manifest comparisons, module verification
and source-module hash checks. No image export or server startup occurs in this
cache-only focused target. Proof receipt: `d4-gosu/2026-11-04-parser-proof.json`;
log: `d4-gosu/parser-focused-check-2.log`. The production helper is still compiled
from the untouched original module, and its runtime privilege tests remain part
of the full build, not this focused proof.

Revisited consumers: only the recipe, its source/CI fixture guards in
scripts/backend.test.mjs, current-focus, Docker operations documentation, this
report and the mandatory preparation checklist change. CI still builds the same
full recipe/tag and scans with the same policy; no image reference, module version,
credential, application schema or generated contract changes. Existing backend
test-type evidence remains applicable. Formatting, syntax, scoped lint and six
affected topology/CI/archive tests pass both normally and with
CI=true/GITHUB_ACTIONS=true, zero skips. No broad suite or new PostgreSQL image
is claimed.

READY FOR NAMED PROOF: retry the same full vendor build
command from the preceding handoff, using normal cache. It now reuses the proved
helper-tests stage. Salar retains the long compiler/export step; report its real
exit code and last 30 log lines. No cache pruning, forced rebuild, test skip,
PostgreSQL recreation or data reset is requested. Image scanning and live
PostgreSQL 18 migration/seed acceptance still follow a successful full build.

### November 4 successful vendor build - identity accepted; scan pending

Salar reports exit 0 for the full vendor image build. The final RUN passes actual
gosu named/numeric UID/GID, supplementary groups, non-root operation and invalid
user denial, then reports PostgreSQL 18.6. Its printed error for
`nebula-user-must-not-exist` is the intended negative assertion; the RUN and build
both succeed. No assertion was skipped. The runtime image is loaded as
`nebulanv-vendor-postgres:18.6-gosu1.20-go1.26.10`.

Agent read-only acceptance of the loaded image verifies linux/amd64, every
inherited official-base RootFS diff ID, original entrypoint/command/volume,
PG_MAJOR 18 / PG_VERSION 18.6-1.pgdg13+2 / correct versioned PGDATA and updated
GOSU_VERSION. Isolated, network-disabled temporary containers (no existing data
mounts) report the exact gosu 1.20 / Go 1.26.10 version and embedded Moby user
0.4.1, source commit and test-fix commit. Actual installed helper SHA-256
`a84ba8c56ff8b62efbcc20f3b38d0ca97e6e7cc2074299e7195b05e3d574987a`
matches its embedded build provenance. The full parser log has eighteen passing
top-level tests across all package files, including all three file-cap boundaries;
the earlier eleven-function count referred specifically to user_test.go.

Image identity boundaries remain explicit: loaded store/index ID
`sha256:757a989bdba9e24b112262fca1388382911aea6a617b2cc53c073962730eb5aa`
matches the exported index in the successful build log. That log separately
reports canonical config digest
`sha256:0cf621506cd9fe650ff1f0ca54f86ed9a83a2cec9b274849cb964a274059ee7c`;
those two identifiers are not equated. The stored receipt identifies the latter
as the exported config identity, not an independently parsed archive config.
Receipt: `.ci-evidence/dependency-review/d4-gosu/2026-11-04-vendor-built.json`.
Successful and failed build logs are retained separately in the same ignored
directory. The running PostgreSQL 17 container remains healthy and unchanged.

Next handoff is a **fresh image vulnerability report only**, operator-owned.
The existing Trivy 0.74.0 database is due for refresh; use the reachable GHCR
database repository rather than skipping updates. The report directory exists.
No implementation consumer has changed since the passing focused gates; their
results and the backend test-type evidence remain valid. No application contract,
SQL fixture or generated client is involved. Source/raw scan policy remains the
same: collect HIGH/CRITICAL records, then classify with the existing helper;
unfixed Debian findings are retained visibly and fixable/application findings
block. A successful scan execution is not independently a security-gate pass.

```powershell
trivy image --image-src docker --db-repository ghcr.io/aquasecurity/trivy-db:2 --scanners vuln --severity HIGH,CRITICAL --timeout 15m --format json --output .security-reports/d4-postgres18.json nebulanv-vendor-postgres:18.6-gosu1.20-go1.26.10
"scan_exit_code=$LASTEXITCODE"
```

READY FOR NAMED PROOF: this scan. Inspect its actual image identity and findings
after completion; no guessed finding counts, vulnerability suppression or rollout
is accepted now. Fresh PG18 initialization, all-owner native migrations/seeds and
demo/runtime verification remain pending until the image security review passes.

### November 4 PostgreSQL 18 scan accepted - fresh database startup handoff

Salar's fresh GHCR database download and image scan exit zero. Agent review of
`.security-reports/d4-postgres18.json` applies the unchanged
summarizeTrivyImageVulnerabilities policy: **63 total HIGH/CRITICAL records,
zero blockers, 63 deferred unfixed Debian OS records**. One retained record is
Critical CVE-2026-6653 in libxml2; it is not hidden or marked fixed. The gosu
binary group now has **zero HIGH/CRITICAL findings**, clearing the previous
26 Go-library blockers through updated binary contents, not exceptions.
This accepts only the existing demo policy, not an unrestricted production
security signoff or zero-vulnerability claim.

Actual report identity checks: reference matches the selected vendor tag;
Metadata.ImageID equals the Docker loaded store/index ID; all seventeen
uncompressed layers match; effective runtime configuration matches with only
observed empty User/WorkingDir/OnBuild defaults normalized. No meaningful config
value is discarded. An initial diagnostic incorrectly compared Metadata.ImageID
to the exported canonical config digest; it fails before acceptance and is
corrected to compare the actual loaded store ID plus complete layers/config.
No expected hash or scan record is changed. Canonical export config identity
remains separately labeled. Receipt:
`.ci-evidence/dependency-review/d4-gosu/2026-11-04-postgres18-scan-accepted.json`.

Next action uses Salar's explicitly authorized disposable demo data policy.
Stop all eleven application containers before the database change; only
PostgreSQL is recreated from its already built/scanned local image. Preserve
the selected Seaweed configuration and use --no-deps/--no-build/--pull never so
no Redis, scanner, storage or application image is silently changed. A fresh
pgdata18 volume at /var/lib/postgresql gives inherited PostgreSQL 18 PGDATA;
do not remount the old cluster or run down -v. The old dummy volume is only an
obsolete cleanup item after acceptance, not a required data-preservation project.

Preparation receipt for **fresh startup only**: actual Compose selection contains
all named services; both native renders and archive/boundary checks already pass;
all three initialization scripts have LF bytes with zero CR; actual Compose
help supports every selected flag. Existing parser/runtime build tests, source/
CI fixtures and 125-file type gate remain applicable. No new implementation,
API or SQL change requires another broad suite. The application image cohort
is deliberately unchanged and is accepted separately under D8. Initializers,
all nine owner migrations/status/base seeds and live proofs are not falsely
certified by the server startup. Backend watch lock and demo writer locks are
absent at preparation time. Operator runs one command at a time and stops on
the first error; PowerShell native commands do not automatically stop a block.

```powershell
docker compose stop gateway order-service product-service media-service blog-service taxonomy-service settings-service tenant-authority-service realm-auth-service auth-service user-service
```

```powershell
docker compose up -d --no-build --no-deps --pull never --wait --wait-timeout 240 postgres
```

```powershell
docker compose exec -T postgres psql -U postgres -d postgres -Atc "SHOW server_version; SHOW data_directory;"
```

READY FOR NAMED PROOF: PostgreSQL fresh startup and version/data-directory read.
Expected server 18.6 and `/var/lib/postgresql/18/docker`. Applications remain
stopped until owner databases are migrated and seeded. Next preparation must
reconcile the existing D1/D2 journals and Redis caches with the new database;
their old IDs/sessions cannot be assumed valid. Keep the old journals available
for owned-object waste cleanup; database recreation does not erase Seaweed
objects. No seeder reset against already missing IDs or unrelated storage purge.
The existing provisioning API's databaseEnv is private, so do not recommend an
invalid import or let owner runtime-role .env connections run schema-owner
migrations. Prepare the explicit local schema-owner environment using the same
existing provisioning semantics for the next all-owner migration/seed handoff.

### November 4 fresh PostgreSQL 18 running - owner migration preparation

Salar's startup succeeds with new volume nebulanv-main_pgdata18, server
18.6-1.pgdg13+2 and `/var/lib/postgresql/18/docker`. Agent observation confirms
the scanned vendor image is running/healthy; all eleven applications exited
cleanly and remain stopped. The official first-init script creates the nine
expected owner databases plus nebula, without reusing the old PG17 directory.
The retained MinIO orphan warning is expected and is not a PostgreSQL failure.

Before reconciliation mutations: current Compose project/Redis ownership and
stopped-application states must be verified. Salar explicitly allows recreation
of all seeded demo data. Clear only the two project-owned development Redis
instances so old sessions, replay/idempotency and cache entries cannot refer to
the erased database. Archive only .nebula-demo/d1.json, d2-showcase.json and
d2-limits.json into a guarded local subdirectory, preserving hashes for later
owned-object cleanup. This is a reversible journal move, not a whole storage
wipe; do not delete credentials, signing keys or Seaweed objects. Backend watch
and demo writer locks are absent. No other project/container/cache is in scope.

Both initializer configurations select the built vendor and all required runtime
passwords pass their existing 32-128-character format gate without printing values.
Run the existing Authority/default+operator role initializers before owner
migrations. This restores prerequisite plumbing only; tenant feature execution
and operator runtime remain paused.

The all-owner handoff reuses exported runPrismaOperation and its existing nine
prismaServices inventory. A one-time local environment callback reproduces
private databaseEnv's exact loopback/schema-owner settings; no invalid export
import, runtime-role migration or new maintained script is introduced. A dry
invocation trace covers exactly 27 owner/operation calls across deploy, status
and base seed, with root administrator on 127.0.0.1:15432 and the correct database
per owner. That is command preparation, not actual Prisma/SQL acceptance. Product
and Blog base seeds retain their existing no-demo-write ownership; D1/D2 showcase
seeding follows actual application readiness. No image rebuild is required.

Reconciliation now executed successfully: all eleven container labels match the
current nebulanv-main project and every application is stopped; both Redis
instances are verified members of that same project. No watch/demo lock exists.
Resolved journal source/destination paths stay within the actual workspace;
only three regular named journal files are moved to the new guarded directory
`.nebula-demo/archive-pg17-before-pg18-20261104`. Their original hashes are saved.
FLUSHALL returns OK on only redis and realm-auth-default-redis. No image, volume,
credentials or Seaweed object is deleted. Native receipt:
`.ci-evidence/dependency-review/d4-gosu/2026-11-04-fresh-demo-reconciliation.json`.

Handoff receipt: no implementation edits; both initializer input formats and
vendor images verified. A 27-call dry trace confirms inventory, operations and
owner connection selection. Four focused existing base-seed/Prisma/boot-order
tests pass under hosted flags with zero skips. Previously accepted type checks,
image scan/build and fixture guards remain relevant; do not rerun unrelated
image builds or broad suites. Migrations/base seeding themselves are the pending
native SQL/Prisma proof. The callback below uses the same local connection
semantics as private databaseEnv, and all environment changes stay in the child
Node process rather than the operator's PowerShell session. Production mode is
refused. Node 24.22.2 is selected explicitly for this one-time invocation.

Run each block separately and stop on failure:

```powershell
docker compose run --rm --no-deps --pull never tenant-authority-db-init
```

```powershell
docker compose run --rm --no-deps --pull never realm-auth-db-init
```

```powershell
@'
import { runPrismaOperation } from './scripts/backend.mjs';
if (process.env.NODE_ENV === 'production') throw new Error('local_demo_only');
const environmentFor = ({ database }) => ({
  ...process.env,
  DATABASE_URL: `postgresql://postgres:postgres@127.0.0.1:15432/${database}?schema=public`,
  SHADOW_DATABASE_URL: `postgresql://postgres:postgres@127.0.0.1:15432/postgres?schema=${database}_shadow`,
});
for (const operation of ['migrate-deploy', 'migrate-status', 'seed']) {
  runPrismaOperation(operation, { environmentFor });
}
'@ | fnm exec --using=24.22.2 node --input-type=module *> postgres18-migrate-seed.log
$databaseExit = $LASTEXITCODE
Get-Content postgres18-migrate-seed.log -Tail 35
"database_exit_code=$databaseExit"
```

READY FOR NAMED PROOF: prerequisite role setup and native nine-owner migrations,
status and base seeds only. Expected native exits zero, all owner migration
histories current, base seeds complete with existing Product/Blog no-op ownership.
The first failing owner/SQL error remains authoritative; do not skip migrations
or edit historical SQL to make the run green. Existing Prisma package-config
deprecation messages remain D7 maintenance, not an inferred deployment failure.
After this proof, restore witnessed application containers without rebuilding or
silently updating Redis/scanner, verify all readiness, then run D1/D2 showcase
seed/verify using their new journals. Live commerce and SQL contract acceptance
remain separate pending gates. FreshClam cooldown remains unchanged.

### November 4 migration launcher failure - supported pnpm handoff correction

The operator's inline Node command fails before launching Prisma for User.
Confirmed cause: pnpmInvocation deliberately requires env.npm_execpath and throws
pnpm_cli_unavailable_run_through_pnpm if missing. Direct fnm/node lacks that
pnpm lifecycle input; runPrismaOperation wraps it as failed_to_start. A separate
read-only probe confirms pnpm exec also lacks npm_execpath here, so replacing
node with pnpm exec without testing would not fix the handoff. No migration SQL
error is established. The earlier dry invocation supplied a mock executor and
therefore missed this real package-manager launch requirement.

Correct the supported workflow rather than weakening the existing launcher guard:
add one db:prepare root lifecycle command backed by database prepare in the
existing scripts/backend.mjs. Extract/reuse only the existing three all-owner
Prisma operations with private databaseEnv; backend:boot calls that same function.
Authority/Realm role initializers remain prerequisites; image building, application
start and showcase seeding stay outside this command. Reject production mode
before invoking tools. This adds no new maintained script file or dependency.

Pre-edit trace: package.json command registration and scripts/backend.test.mjs
exact command assertions; scripts/backend.mjs runPrismaOperation/databaseEnv,
provisionBackend, CLI dispatch/help; existing Prisma/base-seed/provision-order tests;
docs/current-focus.md, docs/docker-configs.md and this report. Add a focused
regression for all nine owner URLs/operation order/early stop/production refusal.
Run a real read-only Prisma status through a pnpm lifecycle to verify actual
launcher behavior, keeping pending migrations distinct from spawn failure.
No Docker, SQL/schema, generated contract, image or seed algorithm change.
Root script metadata changes can invalidate future build keys; no application
rebuild is needed for this host-tool correction. Preserve the failed log.

Correction prepared: root package.json registers db:prepare; CLI dispatch invokes
prepareLocalDatabases in scripts/backend.mjs. That function refuses production,
checks real pnpm lifecycle availability before any default child work, and reuses
runPrismaOperation for deploy/status/seed with the existing private databaseEnv.
backend:boot delegates its old identical three-operation section to this function;
its role initialization, later builds/start/readiness order remain unchanged.
No loader fallback, global shell spawning, fake npm_execpath injection, dependency
install or weakening of role boundaries is introduced.

The exact root command inventory assertion is updated and one focused regression
checks all 27 owner/operation combinations, pinned loopback administrator URLs,
preserved environment values without mutating the caller, early abort on the
first owner failure, missing-lifecycle refusal and production refusal. Seven
affected Prisma/root-command/base-seed/boot-order cases pass. Formatting, scoped
ESLint, syntax and diff checks pass. Existing app test types remain valid because
only the host tool and its tests/command metadata change; no Gateway/RPC contract
preflight or application rebuild applies.

Actual launcher verification: Node 24.22.2 / pnpm 10.17.1 launches Prisma 6.16.2
successfully. A first bounded status probe times out before returning captured
child output; it is not accepted as an SQL result. A separate native version
probe passes. An unqualified root status confirms actual launching but reveals
User's existing .env selects localhost:5432, reinforcing why db:prepare must pin
its local-owner mapping rather than rely on per-owner .env URLs. No deploy/seed
is executed by these read-only probes. The final explicit 127.0.0.1:15432 root
lifecycle status probe completes and reports exactly the two pending User
migrations, exit 1 as expected for that unapplied history, not failed_to_start.
The update-notification check is disabled only for this bounded read-only probe;
no project setting or operator deployment disables it. Proof:
`.ci-evidence/dependency-review/d4-gosu/2026-11-04-pnpm-lifecycle-proof.json` and
`prisma-real-launch-status-confirmed.log`. All three expected runtime roles are
present, so the initializers need no repeat for the next action.

The earlier inline handoff is superseded. **READY FOR NAMED PROOF:**

```powershell
fnm exec --using=24.22.2 pnpm.cmd db:prepare *> postgres18-migrate-seed.log
$databaseExit = $LASTEXITCODE
Get-Content postgres18-migrate-seed.log -Tail 35
"database_exit_code=$databaseExit"
```

Actual native deploy/status/base-seed acceptance remains pending Salar's result.
No further fresh-volume replacement, cache flush, journal move or role
initialization is needed after this launch-only failure. Applications stay stopped
until preparation succeeds; D1/D2 showcase and live proofs remain the next gates.

### November 4 owner preparation passed - migration-history grant ordering

Salar reports db:prepare exit 0. The log includes all nine deploy/status/base-seed
operations and nine up-to-date confirmations. Agent SQL reads find all **45**
expected migrations completed across nine databases, with zero unfinished/failed
records; counts match the actual owner migration directories (2/1/8/1/8/1/12/1/11).
Receipt: `d4-gosu/2026-11-04-databases-prepared.json`.

Confirmed existing bootstrap defect: initializers run before Prisma creates
\_prisma_migrations. Their default privileges grant runtime INSERT/UPDATE on that
new table; their intended final conditional REVOKE was skipped while it did not
exist. Native checks on Authority and default Realm Auth show SELECT/INSERT/
UPDATE/DELETE = t/t/t/f. Existing scripts explicitly intend migration history
to be SELECT-only and already implement the needed REVOKE when rerun after DDL.
No architecture replacement is required. Preserve that mechanism and run it
after owner deploy/status/base seed completes.

Pre-edit trace: prepareLocalDatabases/provisionBackend in scripts/backend.mjs;
their injected Docker executor and ordering tests in scripts/backend.test.mjs;
existing scripts/db/ensure-tenant-authority-db.sh and ensure-realm-auth-dbs.sh;
docs/docker-configs.md, current-focus and this report. Add the two existing
client-only role reapplications after all owner operations, with --no-deps and
--pull never; no app/image startup or extra migration/seed rerun. Update positive
ordering and early-failure/production guards to ensure SQL grants do not run on
a failed preparation. Actual repair uses these same two scripts against the
already prepared databases, then verifies table privileges. Keep the successful
migration/seed evidence. No historical SQL/schema, runtime password or seed
algorithm change; operator feature execution remains paused.

Correction accepted: prepareLocalDatabases now reapplies those two existing
client-only initializers after all 27 owner operations. provisionBackend passes
its injected Docker executor/platform through, so both standalone db:prepare and
normal boot share the correction. The client calls use --no-deps/--pull never
and do not rebuild/start application or infrastructure dependencies. The local
preparation test verifies grant calls occur only after all owner operations;
production and failed migrations forbid grant work, and a failed first grant
halts the second. The boot ordering test independently checks both reapplications
are after base seeds and before builds. Seven affected focused tests pass under
hosted flags; formatting/scoped lint pass. No registered test is removed or skipped.

Agent native repair executes only the same two role scripts against already
prepared PostgreSQL 18, without rerunning any migration or seed. Both return 0;
actual Authority/default Realm migration-history privileges become t/f/f/f
(SELECT/INSERT/UPDATE/DELETE). Receipt:
`d4-gosu/2026-11-04-post-migration-role-grants.json`. Existing 45-migration and
base-seed acceptance remains valid. These repairs restore an existing documented
boundary; they do not introduce a replacement security mechanism or resume F4.

Application restoration handoff: actual selected local Compose passes the existing
boundary check and still uses Seaweed. Every one of the eleven application's
selected image references matches its existing stopped container image; image
IDs are recorded in `d4-gosu/2026-11-04-application-restore-plan.json`. Each
database-owning service targets PostgreSQL's internal hostname and its intended
database. Role grants now pass. No image build, pull or additional data/journal
reset is needed. Source application modernization remains D8, so do not silently
upgrade Redis/scanner or run backend:boot's complete build path here.

```powershell
docker compose up -d --no-build --no-deps --pull never --wait --wait-timeout 240 user-service auth-service realm-auth-service tenant-authority-service settings-service media-service taxonomy-service product-service blog-service order-service gateway
```

After that exits successfully:

```powershell
pnpm backend:health
```

Then, stopping on the first failure:

```powershell
pnpm demo:d1:seed
pnpm demo:d1:verify
pnpm demo:d2:seed
pnpm demo:d2:verify
```

READY FOR NAMED PROOF: existing-image restoration/readiness, then actual showcase
recreation against PostgreSQL 18. D1 uses the normal Media upload/scan/derivative
pipeline; D2 owns its separate commerce customer/cart/products/order scenarios.
Fresh journal files are expected after the earlier guarded archive; old Seaweed
objects remain outside this seeding acceptance and must be accounted for during
owned waste cleanup. Accepted prior type/preflight decisions remain valid because
this latest correction only changes host orchestration and existing role timing.
Do not claim actual restored readiness, showcase seed passes or full D4 completion
until native results arrive. FreshClam loaded freshness remains separately open.

### November 4 restoration/showcases pass - PostgreSQL regression handoff

Salar's attachment de5cc4ec-1fb5-46b5-aa8a-2d5ef876099d reports all eleven
applications healthy after selected restoration, then successful D1 seed/verify
and D2 seed/verify. D1 observes 18 products / 2 Media / 7 taxonomies; D2 observes
7 orders / 3 products / cart ready. Agent verifies all eleven actual readiness
endpoints under Node 24.22.2 and every running app's image ID against the earlier
restore plan; none was silently rebuilt/upgraded. Fresh journals exist and hashes
are recorded in `d4-gosu/2026-11-04-restore-showcase-receipt.json`. The retained
MinIO orphan warning remains expected, with its container stopped.

The operator's shell actually uses Node 22.14.0 for health and demo commands,
emitting the declared >=24.22.2 <25 engine warning. This does not erase the passing
HTTP/seed/verify observations, but is not Node24 proof for those invocations.
The prior fnm exec wrapper selected Node24 only for its child; it did not switch
the parent PowerShell session. Correct this operational handoff explicitly, without
changing fnm installation, dependency pins or the user's persistent shell profile.
No new seeding/reset is needed; verify existing showcases under Node24.

Next proofs are bounded to PostgreSQL-major-sensitive existing behavior. Do not
repeat all nine clean migration deployments already accepted. Instead run the
existing D1 Product/Order populated upgrade/rollback proof, Product stock SQL
concurrency/rollback proof, Order demo-payment SQL/retry proof and Media's clean
migration/constraint fixture, followed by F3 live Gateway profiles. These are
pending actual PG18 regression results; their old PG17 passes do not automatically
certify a new database major. All target scripts reuse guarded _verify_ databases
and cleanup; F3 uses the now-ready Gateway. This does not resume F4 feature work.

Preparation receipt: inspected migrationVerificationServices/verifyCleanMigrations,
verifyD1CommerceUpgrade, scripts/db/verify-d2-stock.mjs and
scripts/db/verify-d2-demo-payment.mjs, existing demo runner/journal selection and
packages/api-client/test/f3-live-flows.mjs. Local source and fixture inputs are
unchanged; required tests/types/source checks remain valid. No implementation,
contract, generated artifact or schema edit is made in this results-only step.
Long SQL/seed verification/live execution remains operator-owned. Preserve first
errors and stop on failure rather than continuing to collect cascading failures.

Switch this PowerShell session first (no install or persistent profile edit):

```powershell
fnm env --shell powershell | Out-String | Invoke-Expression
fnm use 24.22.2
node --version
```

Expected v24.22.2. Then run separately, stopping on any failure:

```powershell
pnpm demo:d1:verify
pnpm demo:d2:verify
pnpm db:verify:d1:upgrade
pnpm db:verify:d2:stock
pnpm db:verify:d2:demo-payment
pnpm db:verify:media
pnpm test:f3:live
```

READY FOR NAMED PROOFS: these existing verification commands only. No container
restart, image build, package install or fixture reset is requested. Source Redis
7.4.12 and refreshed scanner image selection still require their own actual
deployment/acceptance; live versions are unchanged. FreshClam retains its Nov4
14:22:58 Tehran cooldown, which has not yet expired at this handoff. Do not
attempt that update or declare all D4 complete based on these PostgreSQL results.

### November 4 PostgreSQL 18 regression failures - preparation trace

Attachment 2e136705-444c-48a4-9c39-500d4e123a80 confirms the demo-payment SQL
proof and six F3 live profiles pass under Node 24.22.2. Stock stops on a stale
23503 assertion: the actual named held-Product RESTRICT constraint rejects the
delete with 23001. Media migrations, processing SQL and saved derivative SQL
pass, then Jest fails to resolve its extensionless config import. Full stock
and Media acceptance remain pending; D1 upgrade and Node24 showcase verification
results are not present in this attachment.

Classification: stale proof expectation and confirmed test-launch compatibility
defect. PostgreSQL 18's [referential-integrity implementation](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/utils/adt/ri_triggers.c)
distinguishes parent RESTRICT rejection (23001) from invalid child references and
NO ACTION (23503); PostgreSQL 17 did not make that distinction. The installed
Jest 30.2.0 readConfigFileAndSetRootDir first attempts Node's native TS loading;
its non-SyntaxError fallback needs an explicit config-loader docblock. Existing
ts-node is already declared. No replacement test runner or database rule is needed.

Impact table recorded before implementation:

| Owner / consumer inspected                                                                                                                                                                                             | Action and reason                                                                                                                                                                                                                   | Validation status                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `scripts/db/verify-d2-stock.mjs`; `apps/product-service/prisma/migrations/20261014000100_checkout_stock_intents/migration.sql`                                                                                         | Require exact PG18 23001 and existing heldProductId constraint on parent deletion; preserve valid control and all rollback/runtime checks.                                                                                          | Native diagnostic control/catalog and syntax/lint/format pass; full proof pending.                        |
| `scripts/db/verify-d2-stock-restoration.mjs`; `apps/product-service/prisma/migrations/20261019000100_finalized_stock_restoration/migration.sql`                                                                        | Same correction for parent intent deletion only. Invalid child insert still requires 23503.                                                                                                                                         | Native diagnostic control/catalog and syntax/lint/format pass; full proof pending.                        |
| `scripts/db/verify-d2-coordination.mjs`; `apps/order-service/prisma/migrations/20261014000100_checkout_attempts/migration.sql`                                                                                         | Same correction for the exact CheckoutAttempt_orderId RESTRICT deletion.                                                                                                                                                            | Native diagnostic control/catalog and syntax/lint/format pass; full proof pending.                        |
| `scripts/db/verify-d2-checkout.mjs`; `apps/order-service/prisma/migrations/20261013000300_checkout_receipts/migration.sql`                                                                                             | Same correction for exact CheckoutReceipt_orderId RESTRICT deletion; retain receipt compaction assertions.                                                                                                                          | Native diagnostic control/catalog and syntax/lint/format pass; full proof pending.                        |
| `scripts/db/verify-d2-order-cancellation.mjs`; `apps/order-service/prisma/migrations/20261024000100_order_cancellation/migration.sql`                                                                                  | Same correction for parent CheckoutAttempt deletion only; invalid cancellation FK updates retain 23503.                                                                                                                             | Native diagnostic control/catalog and syntax/lint/format pass; full proof pending.                        |
| `apps/media-service/jest.processing-db.config.ts`; `jest.unit.config.ts`; `eslint.config.mjs`; `package.json`; `test/jest.env.ts`; `test/media-processing.database.spec.ts`; `test/media-derivatives.database.spec.ts` | Declare existing ts-node config loader explicitly; retain inherited setup/transform, proof flag and both DB test files. No sibling Jest config imports another Jest config.                                                         | Node24 config load, exact two-file selection, enabled proof flag and typed lint pass; full proof pending. |
| `scripts/backend.mjs` verifyCleanMigrations; `scripts/backend.test.mjs`; root `package.json`                                                                                                                           | Commands and registration unchanged; Media still receives its owned disposable DATABASE_URL. Existing orchestration assertions remain applicable.                                                                                   | No command/contract changes.                                                                              |
| `scripts/db/verify-d2-demo-payment.mjs`; `verify-media-derivatives.sql`; `verify-tenant-authority-records.sql`                                                                                                         | Invalid child inserts/updates retain foreign_key_violation/23503; no RESTRICT parent deletion is asserted in these cases.                                                                                                           | Existing payment/Media SQL passes preserved.                                                              |
| `apps/product-service/src/product/product.service.ts`; `apps/order-service/src/order/order.service.ts`; `checkout-coordinator.ts`                                                                                      | No direct raw SQLSTATE comparisons. Product hardDelete maps Prisma P2003 to conflict; check actual generated Prisma behavior before claiming the major upgrade preserves it. Cart deletion uses its own child cleanup.              | Confirmed unmapped 23001; owned database cleaned; D7 is required before PG18 sign-off.                    |
| Both Compose files; `.github/workflows/ci.yml`; `docs/current-focus.md`; `docs/testing/pre-suite-checklist.md`                                                                                                         | Selected maintained platform is PG18; do not broadly allow either code for every FK. Config/SQL proof repairs require no image rebuild. Log missed major-sensitive diagnostics and native TS config loading before another handoff. | Current-focus and checklist updated; final preparation receipt below.                                     |

No schema, migration, API, generated client, package pin or application image is
changed by this planned correction. Contract preflight is not applicable to these
proof/config-only edits. Long complete database proofs remain Salar-owned.

Native follow-up changes the disposition of the Product consumer: the actual
Prisma 6.16.2 generated client returns an unmapped ConnectorError for 23001,
not P2003, in an owned database with all current Product migrations. The existing
`scripts/db/verify-d2-stock.mjs` runtime assertion at the held-product delete
correctly requires P2003 and must remain intact. Thus fixing its earlier psql
assertion alone cannot make the full stock proof pass. Product's hardDelete
would also bypass its intended product_has_dependents conflict translation.
Receipt `d4-gosu/2026-11-04-pg18-prisma-diagnostic.json` retains the exact error
and confirms the disposable database was dropped. No runtime data was changed.

This is a confirmed Prisma/PG18 compatibility defect, not optional hardening.
The [upstream fix](https://github.com/prisma/orm/pull/29554) and
[Prisma 7.10.0 release](https://github.com/prisma/orm/releases/tag/7.10.0) explicitly
map 23001 to P2003 in the PostgreSQL adapters. Do not claim that fix exists in
the installed Rust-engine client, change the FK to NO ACTION, accept an arbitrary
Prisma exception, or add fragile parsing of its internal ConnectorError message.
Prisma D7's owner/client/adapter migration is now a prerequisite for PG18 runtime
sign-off; advance its preparation after the isolated Media retry, ahead of
unrelated compiler/framework upgrades. It still needs its own complete impact
trace and actual driver proof before any broad install/build handoff. All current
P2003 regressions remain required, including Product destructive-operation unit
tests, gRPC conflict mapping and this native held-stock deletion case.

Cheap lint additionally finds existing implicit process/console globals in
`scripts/db/verify-d2-checkout.mjs` under the root MJS lint scope. Add explicit
node:process/node:console imports matching its four sibling verifiers; no command
or runtime behavior changes. Other consumers in the table retain their stated
dispositions. Only Media can receive a full-proof retry at this point; do not
send the known-failing stock proof while its Prisma prerequisite is unresolved.

Final preparation receipt for this correction:

- All five changed verifier files pass Node24 syntax, scoped ESLint and Prettier.
  Media's config passes its owner's typed ESLint and Prettier. The only additional
  source cleanup is the two explicit Node builtin imports noted above.
- Actual installed Jest 30.2.0 under Node24 loads the dedicated config, retains
  ts-jest and both setup files, has no integration globalSetup, enables
  MEDIA_PROCESSING_DB_PROOF=1, and lists exactly the processing/derivative database
  suites. No skipped-test claim is substituted for full execution.
- Native catalog reads verify all five named Product/Order foreign keys still
  use ON DELETE RESTRICT. A temporary transaction proves valid control rows,
  exact RESTRICT/23001 versus invalid-child and NO ACTION/23503, preserved rows,
  and complete rollback. This diagnostic probe does not certify all five full
  runtime verifiers. Their SQL expectation edits retain exact constraint names;
  child 23503 assertions, valid controls and rollback checks remain unchanged.
- The actual generated Product client on a freshly migrated owned database
  fails its unchanged required P2003 contract. Database cleanup passes. Product
  application code and tests remain unchanged; runtime acceptance is blocked by
  D7, with the upstream adapter fix documented above. Do not run stock again yet.
- Root package commands, backend orchestration, CI inputs, migrations, image tags,
  sibling Jest configurations, RPC/HTTP contracts and generated inventories are
  unchanged. Earlier payment SQL and F3 passing results remain valid. Broad
  contract/type suites are not repeated for proof-only/config-loader edits;
  D7 will invalidate applicable consumer checks when its implementation starts.
- `docs/current-focus.md` names the discovered prerequisite and the sole ready
  retry; the preparation checklist records the missed boundaries/prevention.
  Evidence JSON stays in the existing ignored D4 folder, with the maintenance
  evidence retention owner. No new maintained helper or duplicate report is added.

READY FOR NAMED PROOF: `pnpm db:verify:media` only, under Node24. Its SQL portion
already passed; its complete Jest database run is still operator-pending. There
is no build, package install, Compose restart or fixture reset in this handoff.
PostgreSQL runtime compatibility is deliberately not signed off while D7 remains
unresolved; Redis/scanner rollout and FreshClam freshness remain separate.

### November 4 Media retry accepted - D7 isolated preparation

Salar reports `pnpm db:verify:media` passes on disposable
nebula_media_verify_879de16608fd: all eight migrations deploy and status checks
pass; processing SQL and saved-derivative constraints pass; the full database
claim, lease, atomic replacement, retry, deletion and watermark proof completes.
This supersedes only the pending Media retry above. Counts are not supplied in
the summarized output, so no test count is invented. Preserve this acceptance;
the upcoming Prisma change will need new evidence for its changed client inputs.

D7 preparation inspects all nine schema generators, datasource fields, manifests
and src/prisma.service.ts implementations. Current clients are prisma-client-js,
custom prisma/generated output and native/linux-musl engines; eight package-level
seed declarations remain. Nine standalone D2 SQL verifiers override datasources;
Media's two database suites and d1-references-live use datasourceUrl. Application
services use typed log events/lifecycle hooks that must remain intact. A package
version bump without those callers, config loading and Docker generation inputs
is insufficient.

Registry verification on Nov4 selects exact `prisma`, `@prisma/client` and
`@prisma/adapter-pg` **7.10.1**. CLI latest is 8.0.0-rc.30 while client/adapter
latest is 7.10.1. Select no RC and do not mix majors. Current Node24.22.2 and
TS5.9.2 meet the published prerequisites. The official generator supports
CommonJS via moduleFormat; a whole-repository ESM conversion is not required.
New prisma-client output is TypeScript, so each owner's current rootDir=src and
Docker copy/runtime import paths require explicit reconciliation before rollout.

Before changing installed workspace clients, prepare an ignored isolated pilot
under `.ci-evidence/dependency-review/d7-prisma/pilot/`. Its exact manifest pins
CLI/client/adapter 7.10.1, pg8.23.1, TS5.9.2 and Node types24.5.2, with a local
empty pnpm workspace to prevent installing the parent project. Install scripts
are disabled; generation is an explicit later proof step. No root manifest,
lockfile, owner schema/client, runtime environment or image is changed by this
pilot. This is not a new maintained tooling entrypoint; retain its manifest,
lock and diagnostic receipt until D7 acceptance, then apply D11's measured
artifact disposition. Installation is operator-owned because it can download
the CLI/tooling cohort; actual driver generation/query proof remains pending.

| Boundary traced before the isolated install                                                                                                                                                                                                                                                       | Disposition / next proof                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nine `apps/{blog,media,order,product,realm-auth,settings,taxonomy,tenant-authority,user}-service/{package.json,prisma/schema.prisma,src/prisma.service.ts}`                                                                                                                                       | Future coordinated migration, not modified by pilot. Preserve ownership and lifecycle/error logging.                                                                                                                         |
| `scripts/db/verify-d2-{cart,checkout,coordination,demo-payment,order-cancellation,order-reads,order-status,stock,stock-restoration}.mjs`                                                                                                                                                          | Later update all client constructors; preserve every guard, exact error, populated migration and cleanup assertion.                                                                                                          |
| `apps/media-service/test/{media-processing.database,media-derivatives.database}.spec.ts`; `packages/api-client/test/{d1-references-live,media-processing-recovery}.mjs`; `packages/config/test/health-wiring.spec.ts`                                                                             | Later reconcile overridden/implicit client URLs and test mocks; do not delete tests or count old client passes as new-client proof.                                                                                          |
| Nine owners' `prisma/` seed/audit/import/rollback/export files                                                                                                                                                                                                                                    | Exact constructor inventory retained in the D7 evidence folder before broader implementation; paused Realm/Authority compatibility does not resume tenant features.                                                          |
| `scripts/backend.mjs`; `scripts/backend.test.mjs`; `scripts/docker/backend-build-graph.mjs`; `docker/backend.Dockerfile`; `scripts/docker/{backend-build-graph.test,verify-runtime-imports,runtime-package-overlay}.mjs`; `.github/workflows/ci.yml`; `packages/migration-artifacts/package.json` | Later add CLI config to pruned generation inputs and reconcile selected source/compiled output paths. Preserve graph/cache boundaries and dynamic runtime verification. Migration-artifacts itself has no Prisma dependency. |
| `docs/current-focus.md`; this report; `docs/testing/pre-suite-checklist.md`                                                                                                                                                                                                                       | Record Media acceptance and staged pilot. No broad proof/install/build of application owners is authorized by a passing isolated package install alone.                                                                      |

Pilot acceptance requires an actual generated CJS client against PostgreSQL18
with the current Product schema/migrations, valid held-stock fixture, exact P2003
on restricted delete, unchanged parent/stock, transaction rollback and connection
cleanup. Then exercise the existing Product owner conflict mapper with that
client. Match schemas/model facts and preserve all workspace files; no NO ACTION
schema rewrite or private ConnectorError parsing. Native SQL and transport-stubbed
owner evidence remain distinct from running-container and complete stock proofs.

Isolated preparation receipt: exact files are pilot/package.json,
pnpm-workspace.yaml, prisma.config.ts, schema.prisma and tsconfig.json in the
ignored D7 folder. SHA-256 input identities and 62 exact Prisma consumer paths
are recorded in `d7-prisma/preparation.json`; the model-definition tail is
byte-identical to Product's source schema. `pnpm --dir <pilot> root -w` actually
resolves to the pilot/node_modules, not the root workspace. Git ignores the
pilot manifest. JSON parsing, Node engine/package-manager pins, package equality,
source model equality and output placement checks pass. No pnpm install,
generation, database operation or actual new-client acceptance has run yet.
Prisma config resolution and generated type compilation require the selected
dependencies and remain explicitly pending. This is an install preparation
receipt, not the full nine-owner implementation handoff.

Next operator command (dependency download/install only):

```powershell
pnpm --dir .ci-evidence/dependency-review/d7-prisma/pilot install --ignore-scripts
```

Stop on installation failure and retain its first error. After success, perform
the named generated-client/native SQL diagnostic before editing all owners. No
container restart, global install, production schema or demo reset is involved.

### November 4 D7 isolated generated-client proof accepted

Salar reports the isolated install completes in 2m30.2s with 157 packages:
CLI/client/adapter7.10.1, pg8.23.1, TS5.9.2 and Node types24.5.2. Agent verifies
the actual installed versions and executes generation under Node24.22.2 using
the explicit config. The new prisma-client generator produces CJS TypeScript
in 238ms; the isolated TS5.9.2 compiler completes without errors. Root dependency
installation and workspace client generation have not occurred.

The ignored `d7-prisma/pilot/prove.cjs` follows the pre-recorded pilot plan. It
requires the prepared real workspace path, exact Node version, non-production
execution, matching source/prepared-input hashes and an owned random _verify_
database. Its path-depth assertion caught an initial diagnostic path error before
database operations; correction preserves that guard. Package-version inspection
uses filesystem manifests because adapter-pg does not export package.json.
These are agent-only diagnostic corrections, not application changes.

Native results in `d7-prisma/native-pg18-result.json`:

- All twelve unchanged Product migrations apply to owned database
  nebula_products_verify_prisma7_3c4187b515c1. Valid held-stock insertion succeeds;
  native deletion raises exact SQLSTATE23001 and the named
  CheckoutStockLine_heldProductId_fkey constraint.
- The compiled CJS client and selected adapter/pg connect to the same PG18.6
  instance as psql, verified by system identifier. Decimal7.25, Date and stock
  reads are correct; restricted deletion returns
  PrismaClientKnownRequestError/P2003 rather than the unmapped error.
- Existing ProductServiceImpl with the new client injected returns
  product_has_dependents/409 from hardDelete. Unused remote ports are stubbed.
  This is actual owner mapping plus SQL, not a migrated Nest PrismaService or
  running Product image proof.
- A transaction that decrements stock/increments version before restricted
  deletion rolls back the complete Product row. Invalid child references also
  return P2003 and leave no extra stock line. Error event registration works.
  Removing the hold permits legitimate deletion; the diagnostic does not turn
  all deletes into denials to obtain a pass.
- Disconnect leaves zero database connections and DROP DATABASE succeeds.
  Root manifest/lock and named Product manifest/schema/generated-client/owner
  source hashes remain unchanged. All six diagnostic groups pass.

The full stock proof's required P2003 assertion is intact. Workspace clients and
running images are still on their earlier cohort; full stock remains on hold
until migration. This is not nine-owner, complete concurrency, Prisma deployment,
image, recovery or CI acceptance. Keep the ignored diagnostic and input/receipt
artifacts under the existing D7 evidence owner and D11 retention review.

Next: finish the exact owner/import/constructor, CLI-config/seed, generated TS
compilation, Docker graph/runtime and test/helper trace, then update nine owners
together. Preserve explicit URL ownership, event/lifecycle behavior and deliberate
pool/timeout settings. Use the proven adapter mapping; no internal-error text
parsing or FK-action change is needed. Compiler/lint D5 remains separate: an
installer notice about newer TypeScript does not select that major automatically
or invalidate this actual TS5.9.2 proof. No additional operator command is needed
for the isolated pilot.

### November 4 D7 Product implementation slice - pre-edit impact trace

Salar explicitly starts the Product-first migration. This supersedes the earlier
nine-owner-at-once execution wording: complete Product's owning configuration,
consumers and build inputs together, then migrate the remaining eight owners.
The confirmed defect and rejected weaker alternatives remain those established
by the native 6.16.2 failure and 7.10.1 adapter proof. No schema model or FK action
change is needed. Root lockfile resolution/install is an operator-owned next
gate; source preparation can be validated in an owned candidate snapshot with
the already installed pilot dependency cohort before that installation.

| Exact owner/consumer inspected before implementation                                                                                                                                                                                                                                               | Required disposition / proof                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/product-service/package.json`; `prisma/schema.prisma`; new `prisma.config.ts`; existing `prisma/seed.ts`                                                                                                                                                                                     | Match CLI/client/adapter7.10.1 and pg8.23.1; declare dotenv17.2.3 for CLI config; move URLs/seed command out of schema/package config. Base seed remains deliberately empty. Leave migration-path inference compatible with temporary --schema overrides.                     |
| `apps/product-service/src/prisma.service.ts`; new `src/prisma-options.ts`; new `test/prisma-options.unit.spec.ts`                                                                                                                                                                                  | Owner options factory requires an explicit runtime URL, sets adapter/schema and bounded pool/timeouts, retains error events/shutdown and existing readiness behavior. Test missing/invalid URL without credential disclosure and actual option propagation.                   |
| `apps/product-service/src/product/{product.service,checkout-stock.service,product-price}.ts`; `test/{checkout-stock,product-variants,product-thumbnail-media,product-taxonomy-references,product-read-visibility,product-inventory-concurrency,product-identifiers,product-discount}.unit.spec.ts` | Move generated imports to src/generated/prisma/client; preserve model/enums/Decimal, SQL and existing P2003 conflict assertions. New generator uses explicit CJS and extensionless imports for TS-node as well as compiled JS.                                                |
| `apps/product-service/{tsconfig.json,tsconfig.build.json,nest-cli.json,jest.unit.config.ts,eslint.config.mjs}`; new `tsconfig.tools.json`, `tsconfig.test.json`                                                                                                                                    | Generate inside src so existing rootDir/dist layout remains valid. Exclude generated code from lint; give config/seed/new tests real typed projects rather than expanding fallback limits. Keep unit config free of integration global setup.                                 |
| `scripts/db/verify-d2-stock.mjs`; `verify-d2-stock-restoration.mjs`; `verify-d2-coordination.mjs`; `verify-d2-demo-payment.mjs`                                                                                                                                                                    | All four Product client constructors use owner options and new generated path. Two mixed-owner proofs retain Order's unchanged Prisma6 constructor. Preserve guard, migration, rollback, exact SQLSTATE/P2003, stock/race and cleanup assertions.                             |
| `scripts/backend.mjs`; `scripts/backend.test.mjs`; `scripts/check-backend-test-types.mjs`; root `package.json`                                                                                                                                                                                     | Existing owner cwd/--schema commands continue loading owner config; verify temporary schema override and seed selection. Root test-type inventory follows imports automatically. No new command or API contract inventory is needed.                                          |
| `scripts/docker/backend-build-graph.mjs`; `backend-build-graph.test.mjs`; `docker/backend.Dockerfile`                                                                                                                                                                                              | Copy selected owner's CLI config alongside schema before generation; add Product config to legacy install inputs. Test config projection into the pruned schema stage. Compiled Product client travels in existing dist copy.                                                 |
| `.gitignore`; `.dockerignore`; `scripts/docker/benchmark-build-graph.mjs`; `scripts/docker/benchmark-runtime-packaging.mjs`; `runtime-packaging.test.mjs`                                                                                                                                          | Git already ignores generated folders. Exclude src/generated/prisma from Docker/synthetic ignore/snapshot inputs. Runtime packaging must load compiled Product client and adapter instead of requiring a Rust engine; retain legacy engine checks for eight unchanged owners. |
| `scripts/backend-dev.mjs`; `scripts/backend-dev.test.mjs`; `scripts/docker/verify-runtime-imports.mjs`                                                                                                                                                                                             | Watch already ignores generated directories; classify Prisma config changes as structural restart inputs. Verify compiled client import through existing runtime checker for migrated owner.                                                                                  |
| `.github/workflows/ci.yml`; Compose files; `packages/config/test/health-wiring.spec.ts`; `packages/migration-artifacts/package.json`; Media proof/live fixtures                                                                                                                                    | Existing selected build/generation, readiness/shutdown and dependency boundaries remain applicable. No transport/route/model/owner database change. Media's constructors and passing evidence remain unchanged in this Product-only slice.                                    |
| `docs/current-focus.md`; `docs/services/product-service.md`; `docs/docker-configs.md`; this report                                                                                                                                                                                                 | Record Product-first scope, actual owner versus candidate checks, generation/driver/config behavior and pending installed/image/stock acceptance. No D4/D7-wide sign-off.                                                                                                     |

The intended pool is pg's bounded ten-connection default with an explicit five
second connection/acquisition timeout. Preserve explicit connection_limit and
connect_timeout URL parameters and schema selection; current Product env has
only schema. This is a deliberate driver-default translation, not a claim that
Rust's CPU-derived default pool and pg's pool are identical. Runtime TLS remains
driver-validated; no certificate verification bypass is introduced.

Scoped root MJS lint catches existing implicit builtin globals in changed tooling:
`scripts/backend-dev.mjs` (console), `scripts/docker/backend-build-graph.test.mjs`
(Buffer), `benchmark-build-graph.mjs` (Buffer/console/performance),
`benchmark-runtime-packaging.mjs` and `verify-runtime-imports.mjs` (console).
Add explicit node builtin imports on those exact paths; preserve their actual
objects and behavior rather than suppressing no-undef or altering broad lint
configuration. No command, serialized runtime probe body or proof inventory is
changed by these imports. Recheck scoped lint before handoff.

#### Product slice preparation receipt and installation handoff

The impact table above is revisited with these dispositions:

| Boundary                                                      | Actual result / remaining gate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Product manifest/schema/config/seed                           | Source selects matching 7.10.1 CLI/client/adapter and pg8.23.1. New generator output is src/generated/prisma with CJS/extensionless imports; URL/seed config moves to prisma.config.ts. Native candidate CLI auto-detects this config without DATABASE_URL for generation, and executes the existing empty seed successfully with --schema. Workspace installation/lock resolution remains pending.                                                                                                                                  |
| Product source, model/enum/Decimal imports and typed projects | All eleven old source/test import sites move to the new client. Product model/enum tail is byte-identical to the accepted pilot schema. Candidate build, complete Product test and config/seed no-emit projects pass under TS5.9.2/Node24.22.2. Real typed lint projects replace fallback test limits; generated code is excluded from lint, not compilation.                                                                                                                                                                        |
| Driver/service/focused tests                                  | Four focused unit suites pass, 63 tests: driver options, destructive operations, stock and discounts. Scoped typed lint of driver/service/new test/config/seed passes. Existing lifecycle/event behavior is retained.                                                                                                                                                                                                                                                                                                                |
| Actual candidate service/SQL                                  | product-native-result.json passes actual PrismaService initialization, stock reserve/replay once, owner 409/P2003, transaction rollback, explicit alternate-schema selection, finalized replay, valid delete after release, retained audit stock line, shutdown and zero-connection owned DB cleanup. Only unused remote publication ports are stubbed. Expected negative cases emit generic prisma_error events; no credentials are logged.                                                                                         |
| Temporary CLI schemas                                         | Actual Prisma7 migrate status with --schema targeting a private copy sees exactly that copy's one baseline migration, not all twelve owner migrations; expected pending exit1 is asserted. Its owned database is cleaned. Config intentionally leaves migrations.path inferred so populated upgrade/rollback tooling keeps its temporary-schema behavior.                                                                                                                                                                            |
| Four SQL verifiers                                            | Product constructors use the owner options factory/new client; Order remains on its own six-version constructor in mixed proofs. Syntax and scoped root lint pass. Complete stock/restoration/coordination/payment proofs remain operator-pending after actual workspace installation; prior six-client proofs are not new-client acceptance.                                                                                                                                                                                        |
| Docker/cache/snapshot/runtime/watch                           | Focused native fixture checks pass for config-only invalidation without refetch/reinstall, new generated-source exclusion, owner dispatch, rejection of missing migrated client/options despite a legacy client, and structural watch config changes. All 52 literal Docker COPY inputs exist. Product config joins legacy and selected-generation stages; compiled client/options travel under dist. Rust engine checks remain for unmigrated owners.                                                                               |
| Orchestration/CI/contracts/other owners                       | Existing commands, owner cwd, dynamic inventories and CI selected-build orchestration remain unchanged. API/protobuf/OpenAPI/generated external client contracts and migration model facts do not change, so test:preflight regeneration is not applicable to this internal client slice. Prior Media acceptance remains valid. Full backend test types, actual graph pruning with the new root lock, security scan, running Product image and live acceptance are pending installed inputs; no broad suite/build is handed off now. |
| Docs/evidence                                                 | Current-focus, Product service and Docker notes reflect prepared source versus installed/image status. Details and raw logs stay under this report's existing ignored D7 evidence folder. Remaining eight owner migrations and D4/D7/D8 sign-off remain open.                                                                                                                                                                                                                                                                        |

Candidate preparation copied Product source without env/dependencies/outputs into
an owned D7 snapshot, resolving Prisma7 from the already installed isolated cohort.
It preserves the repository's root typeRoots/shared package paths and Auth-owned
lint toolchain through private dependency junctions. Initial snapshot omissions
of those existing boundaries caused missing ambient types/lint modules; restoring
the declared dependencies resolves them without suppressing diagnostics or
changing workspace config. These candidate checks do not establish root install
parity. Root MJS lint passes after the explicit builtin imports above.

The candidate contains read-only junction references to existing dependency
folders. Retain it through Product acceptance; D11 cleanup must unlink those
references without following them or deleting their external targets. No new
maintained command/helper script is added to the repository. Product's small
prisma-options source module is the shared owner factory used by its service and
four existing verifiers, avoiding divergent adapter configuration.

READY FOR INSTALLATION ONLY, under Node24.22.2:

```powershell
fnm exec --using=24.22.2 pnpm.cmd install --no-frozen-lockfile --child-concurrency=1 *> .ci-evidence/dependency-review/d7-product-install.log
```

This deliberately updates the existing workspace lock and executes serialized
owner generation hooks; it performs no migrations, database reset or Docker
build. After it passes, inspect actual selected package versions, generated
Product output, root lock diff and installed preparation gates before handing
off the full stock proof or any image build. Do not treat the isolated candidate
receipts as completion of those remaining gates.

#### Product workspace installation accepted - fast-uri dependency correction

Salar reports the serialized root install succeeds in 3m48.1s. Agent observes
actual Product CLI/client/adapter7.10.1, pg8.23.1 and dotenv17.2.3, the newly
generated src/generated/prisma/client.ts, and eight remaining owner CLI/client
pairs6.16.2. Node24 installed build/test/tool type projects pass, all four focused
unit suites pass again (63/63), and installed typed-lint results are checked.
Lock importer review against HEAD finds only the intended Product declarations
plus the previously accepted Joi18.3.1 changes; new CLI transitives explain the
additional lock entries. The Web CKEditor8/React19 peer warning remains deferred
Web work, not Product acceptance or a reason to downgrade the backend cohort.

The actual security gate is **blocked**, with runtime0/tooling0/deferred-Web47/
unresolved8. All eight high findings have the identical installed path:
Product -> @prisma/client -> optional Prisma CLI -> @prisma/dev ->
@prisma/streams-local -> ajv8.17.1 -> fast-uri3.1.0. Preserve the raw report as
`d7-prisma/installed-before-fast-uri-patch.json`. Do not classify away an unknown
path or suppress its advisories. Root security policy/reporting stays unchanged.

Confirmed defect: the installed new CLI graph retains vulnerable fast-uri3.1.0.
Installed Ajv8.17.1 declares ^3.0.1; registry verification selects supported
three-branch3.1.9 (latest overall is4.2.3). The publisher's
[3.1.9 security release](https://github.com/fastify/fast-uri/releases/tag/v3.1.9)
also fixes newer medium/low issues beyond the reported high fixes in3.1.7.
Use the latest compatible3.1.9 rather than forcing a four-version API change.

Pre-edit affected-consumer trace for this correction:

| Path                                                                                                                                                    | Action / reason                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root `package.json` pnpm.overrides; `pnpm-lock.yaml`                                                                                                    | Add version/parent-scoped ajv@8.17.1>fast-uri=3.1.9, within the parent's actual range. Re-resolve the lock with the existing manager. No direct application dependency or global fast-uri override.                                         |
| `scripts/backend.mjs` collectRuntimeDependencyInventory/classifyDependencyAdvisories/runDependencyGate; `scripts/backend.test.mjs` attribution fixtures | No policy or assertion change. Existing optional-peer handling and unresolved blockers must remain strict. Re-run the real audit after installation.                                                                                        |
| `scripts/docker/backend-build-graph.mjs`; `backend-build-graph.test.mjs`; Docker dependency fetch/install stages                                        | Existing root override metadata projection and frozen lock remain applicable. Future image build consumes the corrected graph normally; no unrelated image build now.                                                                       |
| Product CLI config/generator/seed; installed Ajv8.17.1 and fast-uri dependency                                                                          | After installation confirm the actual Ajv-bound version, legitimate schema reference compilation/validation and hostile URI rejection, then CLI generation/seed compatibility as applicable. Do not rely on the override declaration alone. |
| Product runtime/adapter/options/four SQL proofs; other owner manifests; Gateway/protobuf/OpenAPI/client inventories                                     | No source/API/model change. Preserve applicable passing Product types/unit/driver evidence; installation identity and security checks remain pending for the corrected lock.                                                                |
| `docs/current-focus.md`; `docs/testing/pre-suite-checklist.md`; this report                                                                             | Record the security hold, precise correction and missed pilot audit. Full stock/image handoff waits for the dependency gate.                                                                                                                |

Preparation failure: the isolated pilot established behavior/types but was not
audited before the workspace installation handoff; its same CLI graph could have
revealed this earlier. Future isolated dependency trials must include security
inspection before promoting that cohort to the root, with policy/attribution
unchanged. Record the miss without invalidating the passing SQL/error-mapping
proofs, which did not claim dependency security acceptance.

Installed preparation results preserved before the transitive-only correction:

- Actual Product installed build, test and CLI-tool no-emit projects pass.
  Installed typed ESLint passes for service/options/new test/config/seed; all
  four focused unit suites pass, 63/63. Eight-owner test/helper no-emit gate
  passes: 126 files, zero errors.
- The existing D7 native diagnostic is re-targeted to the real installed
  Product source/client (no candidate dependency view). It passes actual
  PrismaService/stock reservation replay once, P2003/409 conflict, complete
  transaction rollback, alternate schema selection, finalized replay and valid
  deletion, shutdown/zero connections and owned-database cleanup. Receipt:
  `d7-prisma/installed-product-native-result.json`. It certifies the installed
  Product driver behavior, not the new CLI's dependency security or image.
- Root override syntax/JSON/format and final diff checks pass. The selected
  patch3.1.9 satisfies Ajv's actual ^3.0.1 range; no security policy, external
  contract, owner code or test assertion is weakened. Existing source/type/unit
  results remain valid for unchanged runtime inputs. Actual corrected dependency
  binding, its schema/URI regressions, the real security gate and resolved lock
  remain pending installation. No full stock, live suite or image build is
  handed over while this security prerequisite remains unresolved.

READY FOR TRANSITIVE INSTALLATION ONLY:

```powershell
fnm exec --using=24.22.2 pnpm.cmd install --no-frozen-lockfile --ignore-scripts *> .ci-evidence/dependency-review/d7-fast-uri-install.log
```

Skip hooks for this refresh because owner clients have already been generated
and no generator/schema/runtime dependency changes in this correction. Verify
versions and the actual nested Ajv/fast-uri binding after install, then run the
unchanged security gate before the stock proof. Source/classifier checks cannot
substitute for an observed patched node_modules tree and audit result.

#### Product fast-uri refresh accepted - full stock proof ready

Salar reports the hook-free refresh succeeds in52.5s, +1/-1 package. Agent
verifies the installed Ajv8.17.1 actually resolves fast-uri3.1.9; the root lock
records the scoped override/new package and no fast-uri3.1.0 entry. Product
CLI/client/adapter and CLI engine still match7.10.1, pg remains8.23.1, and the
generated Product client remains available. This is a transitive CLI change;
the already-passing owner source/type/unit/native-driver evidence is preserved.

Real Ajv compilation resolves a separately registered HTTPS schema reference,
accepts valid data and rejects short strings, wrong types and extra properties.
The actual fast-uri library serializes a valid URI and rejects the malicious
port-authority injection with TypeError: URI port is malformed. The diagnostic
first assumed a returned error/default-port normalization; observed API behavior
corrects that agent-only probe without changing any project contract/assertion.
The final valid control uses an explicit non-default port, and the malformed
control requires the exact thrown TypeError. Receipt:
`d7-prisma/installed-fast-uri-result.json`.

The fresh unchanged security gate now passes: runtime0, tooling0, unresolved0,
deferred-Web47. No advisory was approved, reclassified away or suppressed. Raw
previous failed evidence remains retained alongside this accepted result. The
existing CKEditor/React19 peer warning and deprecated tooling notices remain
under the previously named Web/compiler/tooling work; they do not certify those
cohorts or block this corrected Product stock diagnostic.

Handoff receipt: installed typed/lint/unit checks and126-file backend test-type
gate remain valid for unchanged owner inputs; actual installed driver/native
conflict/rollback/schema/shutdown receipts are already accepted. No transport,
model, migration or generated external contract changed in this refresh. Format
and diff checks pass. Check PostgreSQL readiness before the named stock proof.

READY FOR NAMED PROOF: `pnpm db:verify:d2:stock`, under Node24.22.2. The existing
script creates and cleans an owned disposable Product database, runs the complete
SQL/stock/concurrency/rollback assertions and preserves its P2003 requirement.
Its result is still operator-pending. No Docker rebuild/restart, schema reset,
repeat of unchanged Media proofs or broad live suite is requested. Product's
running image and the eight other Prisma owners remain separate D7/D8 work.

#### Product full stock proof accepted - remaining host SQL gates

Salar reports `pnpm db:verify:d2:stock` passes all four complete groups with the
installed Product7.10.1 client on PostgreSQL18: populated preservation/first-error
rollback/exact constraints; same-key/restart replay, no oversell and multiline
rollback; finalize/cancel/tombstone/admin overwrite protection; variants/unmanaged
stock/deleted rows/refund/version ceiling. Its owned disposable database is
cleaned. Preserve this result; do not repeat the earlier isolated trials or
unchanged focused tests to substitute for missing distinct evidence.

Scope remains actual Product owner SQL/Prisma with remote publication eligibility
stubbed. The proof itself correctly separates native Prisma deployment and
cross-service recovery, so it does not close the following required boundaries:

| Existing command / exact consumer                                                                                             | Remaining evidence                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm db:verify:product`; scripts/backend.mjs verifyCleanMigrations and Product constraint fixtures                           | Current Product Prisma7 CLI deploy/status plus existing inventory/variant/metadata database contracts; stock used direct psql migration application.                   |
| `pnpm db:verify:d1:upgrade`; scripts/backend.mjs verifyD1CommerceUpgrade and its existing temporary schema/migration fixtures | Populated native CLI upgrade/failure rollback and override behavior after moving Product datasource config. Latest result on these new CLI inputs is not yet supplied. |
| `pnpm db:verify:d2:restoration`; scripts/db/verify-d2-stock-restoration.mjs                                                   | Full finalized stock restoration/concurrency/replay proof using its changed Product client constructor and owner options.                                              |
| `pnpm db:verify:d2:coordination`; scripts/db/verify-d2-coordination.mjs                                                       | Full mixed-owner coordination with Product7 and still-unchanged Order6.                                                                                                |
| `pnpm db:verify:d2:demo-payment`; scripts/db/verify-d2-demo-payment.mjs                                                       | Revalidate this changed mixed-owner consumer; the earlier Order6/Product6 pass does not establish its new Product7 path.                                               |

Handoff receipt: exact root commands and three changed constructor consumers are
rechecked, installed/source preparation and strict dependency gate remain passed,
and no implementation changes are made in this result-only step. Existing
guards/owned _verify_ database cleanup and assertions remain unchanged. These
commands use host clients and PostgreSQL, not rebuilt application images.
Run individually, stop on first failure and preserve its first error. Execution
remains Salar-owned; actual native deployment/full downstream proof results are
pending. Images/live recovery and eight remaining owner migrations stay under
their existing gates; no tenant feature work resumes.

#### Product remaining SQL gates accepted - Order slice pre-edit trace

Salar reports all five named commands complete without errors:
db:verify:product, db:verify:d1:upgrade, db:verify:d2:restoration,
db:verify:d2:coordination and db:verify:d2:demo-payment. This accepts the native
clean/populated Prisma7 migration and changed downstream host SQL consumers for
the Product7/Order6 inputs tested. Counts/transcripts were not supplied; preserve
the operator-reported scope without inventing them. Product host acceptance is
complete for this slice; running image/recovery/release evidence remains D8/B0.
Moving Order next will invalidate only its changed-input consumer results.

Requirement: move Order's existing client/CLI/options and all actual consumers
to the already validated7.10.1/pg8.23.1 cohort. This is dependency compatibility,
not a change to checkout, payment status, cancellation or stock policy. Preserve
the existing model/enum tail and migrations, typed event logging/shutdown, URL
ownership, strict security gate and the fast-uri3.1.9 correction.

| Exact changed owner / consumer paths inspected                                                                                                                                                                                                                                                              | Action / unchanged reason                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/order-service/package.json`; `prisma/schema.prisma`; new `prisma.config.ts`; `prisma/seed.ts`                                                                                                                                                                                                         | Matching CLI/client/adapter7.10.1, pg8.23.1 and dotenv17.2.3. Move URL/seed config to CLI config; preserve temporary migration-directory inference. Empty base seed remains empty and no longer constructs an unused client.                                                                                |
| `apps/order-service/src/prisma.service.ts`; new `src/prisma-options.ts`; `test/prisma-options.unit.spec.ts`                                                                                                                                                                                                 | Apply the proven owner-scoped adapter/options pattern with order error names. Preserve initialization behavior, sanitized error events and disconnect. Replace the obsolete log-event cast with the typed generated client options.                                                                         |
| `apps/order-service/src/order/{order.service,order-status,order-cancellation,order-admin-read,demo-payment,demo-payment-contract,checkout-receipt,checkout-receipt-retention,checkout-coordinator,checkout-contract,checkout-attempt-contract,cart-contract}.ts`; `src/order/grpc/order-grpc.controller.ts` | Update generated imports only; keep serializer/model/business rules unchanged.                                                                                                                                                                                                                              |
| `apps/order-service/test/{order.error-translation,order-status,order-cancellation,order-admin-read,demo-payment,checkout,checkout-recovery,cart-contract}.unit.spec.ts`; `test/utils/{order.fixture,checkout.fixture,checkout-attempt.fixture}.ts`                                                          | Update generated model/enum/Decimal imports; preserve assertions and fixtures.                                                                                                                                                                                                                              |
| `apps/order-service/jest.unit.config.ts`; `eslint.config.mjs`; new `tsconfig.test.json`, `tsconfig.tools.json`; existing `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`                                                                                                                            | Register new owner-options test in the existing explicit unit inventory (searched its filenames/callers). Use real typed lint projects and exclude generated output from lint; unchanged src rootDir already compiles new generated TS.                                                                     |
| `scripts/db/verify-d2-{cart,checkout,order-status,order-reads,order-cancellation,coordination,demo-payment}.mjs`                                                                                                                                                                                            | Seven actual Order constructors use new client/options. Checkout's additional receipt-Prisma import moves too. Mixed-owner proofs retain Product's accepted factory and add Order's factory; no raw datasource overrides remain for migrated owners. Preserve every negative/concurrency/cleanup assertion. |
| `scripts/backend.mjs`; `scripts/backend.test.mjs`; `scripts/check-backend-test-types.mjs`                                                                                                                                                                                                                   | Existing owner cwd/commands, no-base-writes assertion and test-type traversal remain applicable. Recheck actual config auto-loading and empty seed. No package command changes or broad test bypass.                                                                                                        |
| `docker/backend.Dockerfile`; `scripts/docker/{backend-build-graph,backend-build-graph.test,benchmark-build-graph,benchmark-runtime-packaging,verify-runtime-imports}.mjs`; `scripts/backend-dev.mjs`, `backend-dev.test.mjs`; `.dockerignore`, `.gitignore`                                                 | Add Order config to legacy COPY inputs. The accepted generic selected-config projection/generated ignores/structural watch/new-client runtime checks already cover Order; keep them. Root override/lock propagation remains unchanged.                                                                      |
| Gateway/protobuf/OpenAPI/generated external client; `packages/config/test/health-wiring.spec.ts`; other seven Prisma owners                                                                                                                                                                                 | No wire shape, enum value, health mechanism or unrelated owner change. Contract generation is unchanged. Seven owners remain explicitly deferred under D7; no tenant features resume.                                                                                                                       |
| `docs/current-focus.md`; `docs/services/order-service.md`; this report                                                                                                                                                                                                                                      | Log Product host acceptance and Order source/candidate versus installed/image results. Native/broad execution stays operator-owned.                                                                                                                                                                         |

Preparation uses an owned Order snapshot with the installed, already-audited
Prisma7 dependencies. Validate generation, source/test/tool types, focused driver/
status/checkout/payment tests and CLI/config behavior before a workspace install
handoff. Reuse prior security evidence only for the identical dependency cohort;
review the actual next root lock/inventory and fresh gate before broader proofs.

Order's scoped root lint also finds existing implicit console/timer globals and
a bare conditional expression in scripts/db/verify-d2-cart.mjs's concurrency
subprocess completion handler. Add explicit node:console/node:timers imports and
equivalent if/else resolve/reject control flow; keep timeout duration, lock SQL,
failure message and all concurrency assertions unchanged. No broad lint-rule
suppression or other owner code change is needed.

#### Order source preparation receipt - installation handoff

The pre-edit table is revisited with these observed results:

- Order manifest/config/options/service/seed and both real typed projects are
  prepared for CLI/client/adapter7.10.1, pg8.23.1 and dotenv17.2.3. Twenty-four
  authored source/test import consumers move to the new generated client. The
  entire model/enum body, including the leading OrderStatus enum, is byte-equal
  to its pre-edit source. No migration or business-rule body changes.
- All seven existing SQL client constructors now use Order's factory; the
  checkout receipt namespace import moves too. Mixed Product/Order constructors
  preserve the Product factory and select Order's factory for Order. Scoped
  lint and Node24 syntax pass, and no active old generated path/datasources
  constructor remains among these consumers. Cart's explicit timer imports and
  equivalent if/else completion handling resolve its existing scoped lint gap.
- Candidate generation auto-loads the owner config and succeeds with no database
  URL supplied. Build, complete test and CLI-tool no-emit projects pass. Scoped
  typed ESLint passes for the service/options/new test/config/seed. Five focused
  unit suites pass, **96 tests**: driver options, checkout, status, cancellation
  and demo payment. The new options suite is registered in the existing explicit
  unit list; searched command/filename consumers contain no stale exact list.
- Actual candidate PrismaService connects to an owned PG18 database with all
  eleven unchanged Order migrations. With only Settings/Product RPC ports
  stubbed, the real owner creates/reads an empty cart, adds two10-cent units and
  returns total0.20. Real Order Decimal/date/default status reads pass, a valid
  CheckoutReceipt protects its Order via P2003, a failed transaction rolls back
  the full versioned row, valid dependency removal permits deletion and cart
  item removal succeeds. Shutdown reaches zero connections and database cleanup.
- The diagnostic's first immediate backend-count read observed one closing
  backend after disconnect. A subsequent native read observed none; that first
  owned database was dropped without force. Preserve its first observation and
  reconciliation. A bounded diagnostic-only exit observation still requires
  zero connections before DROP; its rerun passes. No application timeout,
  shutdown mechanism, constraint or coverage is weakened. Receipts live under
  `d7-prisma/order/`; remote transport/image/recovery acceptance remains separate.
- Real CLI7 empty seeding succeeds even with an unreachable fixture database
  URL, confirming the intentionally empty seeder creates no connection. It
  retains the original output and no-base-records behavior, removing only its
  unused old client initialization/disconnect wrapper.
- Candidate dependency realpaths exactly match the already installed/audited
  Product client, adapter, pg, Prisma CLI and dotenv packages. The fast-uri3.1.9
  override and the latest strict gate remain unchanged. Record that identity in
  dependency-identity.json; inspect the actual next root resolution and fresh
  scan before a broad proof handoff, rather than treating this candidate as an
  installed Order version. No new advisory exception is created.
- Existing native tooling fixtures pass for config-only prune invalidation,
  migrated runtime import requirements and structural config/watch behavior.
  Order config joins legacy COPY; the generic selected-config projection and
  src-generated exclusions already cover it. Eight-owner type and actual root
  pruning/image checks wait for the new installed/generated owner inputs.
- Current-focus and canonical Order/Product notes record Product host acceptance
  and the prepared Order scope. Product's unchanged passing evidence is retained;
  the two mixed-owner proofs need new Order7-input results after install. External
  API/protobuf/OpenAPI fields and generated client contracts are unchanged, so
  contract regeneration/preflight is not applicable to these import-only changes.

Only the Order source/helper/test/config and seven named proof consumers change;
the seven remaining owners stay tracked under D7. Private candidate dependency
junctions and receipts follow the existing D11 retention/unlink-without-following
policy. Actual root generation/lock/security checks and complete Order/native
SQL proofs are still pending. No Docker image is built or declared accepted.

READY FOR INSTALLATION ONLY:

```powershell
fnm exec --using=24.22.2 pnpm.cmd install --no-frozen-lockfile --child-concurrency=1 *> .ci-evidence/dependency-review/d7-order-install.log
```

Run this existing package-manager lifecycle to resolve the prepared manifest and
generate Order's new client. After it passes, verify actual installed versions,
the narrow lock diff, security and root preparation gates before broad SQL or
image commands. No database migration/reset or Compose restart is in this handoff.

#### Installed Order acceptance checks - full SQL handoff

Salar reports the serialized install passes in2m4.9s. Agent observes actual
Order and Product CLI/client/adapter7.10.1 and pg8.23.1, both generated clients,
and seven unchanged6.16.2 owner pairs. Actual Order source/test/CLI-tool type
projects and typed lint pass; the five focused installed unit suites pass
**96/96**. The exact seed command auto-loads the real owner config and executes
the intentionally empty seeder successfully. The CLI's8.0 RC notice is not an
instruction to replace the deliberately matched stable cohort.

The native diagnostic runs against the installed workspace Order source/client,
not its candidate dependency view: actual cart/Decimal quote, receipt-backed
P2003 restriction, complete versioned-row transaction rollback, legitimate
dependency removal/deletion, cart removal and shutdown/zero connections/owned
database cleanup all pass. Retain installed-native-result.json plus
installed-native-selection.json, which records the actual root owner and executed
script/client hashes. The diagnostic retains its old order-candidate label;
the selection receipt and executed script establish the installed input scope.

Lock review confirms the intended Order7 package declarations and retained
fast-uri3.1.9 override, with no old3.1.0 entry. All19 workspace manifest dependency
specifiers match importer resolutions. The read-only comparison normalizes the
observed identical runtime/dev jsonwebtoken declaration in grpc-auth, which pnpm
deduplicates into one importer slot; differing specifiers still fail. No manifest,
lock or test is rewritten to conceal drift. Security gate again passes unchanged:
runtime0/tooling0/unresolved0, deferred-Web47. Existing Web peer/deprecation
warnings retain their named deferred ownership.

The eight-owner test/helper no-emit gate passes **127 files, zero errors**, after
the new Order client is generated. Earlier Product source/stock and candidate
tooling evidence is preserved for its tested inputs. Complete mixed-owner and
Order SQL results need new Order7-input acceptance as mapped below. No source,
model, migration, external API/protobuf/OpenAPI or generated external contract
changes in this installation-verification step; no extra contract regeneration
or unrelated suite repetition is required. PostgreSQL readiness is checked for
this handoff. No Docker build/restart is requested.

| Exact existing command           | Changed-input proof still required                                                                                                  |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm db:verify:order`           | Native Prisma7 clean Order migrate deploy/status.                                                                                   |
| `pnpm db:verify:d1:upgrade`      | Native populated/failure-rollback migration with Order's new CLI/config; existing composite also includes unchanged Product inputs. |
| `pnpm db:verify:d2:cart`         | Complete actual Order cart SQL/concurrency fixtures.                                                                                |
| `pnpm db:verify:d2:checkout`     | Complete checkout/receipt/replay and retention SQL.                                                                                 |
| `pnpm db:verify:d2:orders`       | Actual admin/owner order read filtering/count fixtures.                                                                             |
| `pnpm db:verify:d2:status`       | Versioned status controls, audits and replay.                                                                                       |
| `pnpm db:verify:d2:cancellation` | Complete cancellation coordination/rollback/lease fixtures.                                                                         |
| `pnpm db:verify:d2:coordination` | Mixed actual Product7/Order7 checkout coordination.                                                                                 |
| `pnpm db:verify:d2:demo-payment` | Mixed actual Product7/Order7 demo attempts, retry and prior cancellation/status regressions.                                        |

READY FOR THESE NAMED SQL PROOFS: installed prerequisites pass; exact package
commands and their seven changed constructor consumers were reviewed. Use Node24,
run individually and stop on the first failure. They retain their owned _verify_
database guards and cleanup. Broad/long execution stays Salar-owned. Do not
substitute native primitive/unit evidence for these complete proofs or certify
running images/live transport/remaining seven owners from host-only success.

#### Order full SQL gates accepted - Media pre-edit trace

Salar reports all nine installed-Order commands pass: clean migration,
populated D1 upgrade, cart, checkout, reads, status, cancellation, coordination
and demo payment. Accept those exact host Product7/Order7 inputs; no transcript
counts are invented. Preserve Product/Order host evidence. Their running images
and live recovery remain D8/B0 work. Media is the next D7 owner; this changes its
database client/configuration, not scan/storage/image processing policy.

| Exact affected owner / consumer paths inspected                                                                                                                                                                                                                                                                              | Planned action / unchanged reason                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/media-service/package.json`; `prisma/schema.prisma`; new `prisma.config.ts`; existing `prisma/seed.ts`                                                                                                                                                                                                                 | Matching audited7.10.1 CLI/client/adapter, pg8.23.1, dotenv17.2.3. Move URL/shadow/empty seed config; generate CJS under src. Preserve entire model/enum body and eight migrations.                                                                                                                                                                                                                      |
| `apps/media-service/src/prisma.service.ts`; new `src/prisma-options.ts`; new `test/prisma-options.unit.spec.ts`                                                                                                                                                                                                              | Owner factory with the validated explicit URL/schema/pool/timeout semantics; preserve Media's fail-fast initialization, sanitized errors and shutdown.                                                                                                                                                                                                                                                   |
| `apps/media-service/src/{media.service,grpc/media-grpc.controller,processing/media-processing.store,processing/media-processing.storage,processing/media-derivative.store}.ts`; `test/{media.service.access.spec,media-product-reference.unit.spec,media-processing-storage.unit.spec,media-derivative-worker.unit.spec}.ts` | Move old generated model/enum/Decimal imports. Preserve business bodies, RPC DTO/response fields, checksum/byte/state assertions and storage/scanner contracts. Controller change is a type-only import.                                                                                                                                                                                                 |
| `apps/media-service/test/{media-processing,media-derivatives}.database.spec.ts`                                                                                                                                                                                                                                              | New generated client + owner factory using the existing guarded local _verify_ URL. Preserve all claim/lease/atomic/retry/watermark/deletion cases, proof flag and cleanup; never run on the demo database.                                                                                                                                                                                              |
| `apps/media-service/{eslint.config.mjs,jest.unit.config.ts,jest.processing-db.config.ts,tsconfig.json,tsconfig.build.json}`; new `tsconfig.test.json`, `tsconfig.tools.json`                                                                                                                                                 | Real typed test/config projects, generated lint exclusion. Keep the explicit ts-node loader, inherited setup, two exact DB-suite patterns and enabled proof flag. Existing unit glob registers new options suite automatically.                                                                                                                                                                          |
| `packages/api-client/test/d1-references-live.mjs`                                                                                                                                                                                                                                                                            | The opt-in ready-media fixture uses Media-owned ts-node resolution, new client and factory. Validate its local owner URL before creating a client; keep IDs/ownership/prod guards and all API assertions. No SDK production/generated operation changes.                                                                                                                                                 |
| `packages/api-client/test/media-processing-recovery.mjs`; `media-processing-recovery.test.mjs`                                                                                                                                                                                                                               | Make the in-container client selector testable in the existing file; choose legacy6 versus compiled7 only from image manifest. Modern images must require their compiled client/options; no stale-file fallback. Keep credentials inside the container, pending/owned-filename checks, source deletion and restoration semantics. Add focused selector regressions in the existing registered test file. |
| `docker/backend.Dockerfile`; `scripts/docker/{backend-build-graph,backend-build-graph.test,benchmark-build-graph,benchmark-runtime-packaging,verify-runtime-imports}.mjs`; `scripts/backend-dev.mjs`; ignore files                                                                                                           | Add Media config to legacy COPY. Existing generic selected config projection, structural watch, generated excludes and manifest-driven runtime checks already cover the owner. Preserve Sharp/font runtime checks.                                                                                                                                                                                       |
| `scripts/backend.mjs` verifyCleanMigrations/verifyMediaProcessingUpgrade; `scripts/backend.test.mjs`; `scripts/check-backend-test-types.mjs`; `packages/api-client/package.json`                                                                                                                                             | Existing commands, owner cwd, real migration/SQL and inherited DB-runner contracts remain. Two database suites use the updated factory automatically. Existing API-client test registration already includes the recovery test file.                                                                                                                                                                     |
| `docs/current-focus.md`; `docs/services/media-service.md`; this report; dormant F4 receiver inventory                                                                                                                                                                                                                        | Log scoped acceptance/pending new inputs. No external route/protobuf/OpenAPI/receiver method body or signing behavior changes; preserve inventories and previously accepted evidence for unchanged inputs. Six other owners remain D7-owned; tenant/cloud/CDN work stays deferred.                                                                                                                       |

Use the identical already-audited installed Product dependency cohort for the
candidate snapshot; verify actual paths before promotion and audit the resolved
installed graph afterward. Candidate native database cases require owned
nebula*media_verify*<12hex> databases, with original production/local guards.
Legacy image selection is necessary while D8 has not rebuilt Media; host-side
candidate proof is not evidence of current scanner/S3/container behavior.

#### Media candidate acceptance and installation handoff

Implemented the pre-edit trace above. Matching CLI/client/adapter7.10.1,
pg8.23.1 and dotenv17.2.3 use the identical physical installed Product packages:
realpath comparisons for all five packages pass. This reuses the audited cohort;
it does not substitute for the fresh resolved-workspace audit after installation.
The complete Media enum/model body is byte-identical to the before snapshot.
Eight migration files and all business/processing/storage rules are preserved.

Post-edit consumer review:

| Reviewed consumer                                                                              | Result / remaining gate                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Media config/generator/service/factory, all generated import callers, seeds and typed projects | Candidate generation without DATABASE_URL/shadow inputs, source/test/tool no-emit checks and actual TypeScript compilation pass. Typed lint for new config/factory/service/options/DB suites passes. Nine remaining moved-import consumers pass lint with zero errors; two existing access-test unsafe-any warnings at lines163/277 remain visible. A long import's formatting error was found and corrected before handoff.                                                  |
| Media processing, derivative worker, access, storage and options unit suites                   | Five focused suites pass **63/63**, no skips. Existing state, checksum, crop/watermark and failure assertions remain.                                                                                                                                                                                                                                                                                                                                                         |
| Both actual PostgreSQL processing/derivative suites and inherited processing-db config         | Existing explicit ts-node loader loads under Node24.22.2 and selects both suites: **11/11**, zero skips. Apply the eight original migrations in an owned nebula*media_verify*<12hex> DB, preserve original proof/production/local guards, close all connections and drop the DB. Claim/lease/atomic replacement/retry/deletion/watermark cases pass. This is candidate SQL evidence, not native CLI deployment acceptance.                                                    |
| API-client opt-in ready-media source fixture                                                   | Owner-local ts-node loads the real candidate source client/options. Native read/delete works against an owned database. Its production/local demo URL validation still precedes construction; public API/byte/state/cleanup assertions stay. Live D1 integration awaits installed/image rollout.                                                                                                                                                                              |
| API-client in-container recovery selector and registered tests                                 | Serialized helper selects by manifest. A modern image must load dist/generated/prisma/client plus dist/prisma-options; no missing-module fallback. The legacy manifest retains its old constructor until D8. Fourteen focused helper tests pass, including serialized modern/legacy selection, missing-output denial and unchanged restoration/reconnect assertions. The same serialized function loads the actual compiled candidate client/options and performs native SQL. |
| Actual compiled Media PrismaService lifecycle                                                  | Initialization and a read through the compiled owner succeed; source fixture, serialized recovery client and service all disconnect, with zero DB connections before owned cleanup. Existing fail-fast initialization and sanitized errors stay.                                                                                                                                                                                                                              |
| Docker selected config projection, generated excludes, watch and runtime imports               | Add Media config to legacy COPY; existing generic Product/Order-era tooling covers the new owner without another script or duplicated branch. Sharp/font parity remains D8 image evidence. Six other Prisma owners keep their legacy paths/engine checks.                                                                                                                                                                                                                     |
| Contract inventories, API-client command registration, SQL runner, docs                        | No public DTO/RPC/protobuf/OpenAPI/generated SDK contract changed; controller change is type-only. Existing test registration already includes the edited helper tests. Preserve receiver/hash assertions and earlier tooling results for unchanged inputs; no contract regeneration or preflight suite applies to this private-client migration. Current-focus, Media/Order service notes and Docker notes now distinguish candidate, installed and image evidence.          |

Evidence lives under the existing ignored
.ci-evidence/dependency-review/d7-prisma/media/ owner: candidate.json,
dependency-identity.json, three tsconfig logs, focused-unit.log,
focused-lint.log, import-consumer-lint.log, native-database.log and
native-database-result.json, candidate-compile.log and compiled-native-result.json.
The 14 helper tests also pass directly under Node24.22.2. SDK fixture/helper
syntax and scoped lint pass. Full eight-owner installed types remain pending
Media generation. Root Media dependencies/lock still represent6.16.2 at this
checkpoint; no root-install or image claim is inferred from the candidate.

Waste ownership: candidate inputs and bounded diagnostic runners use only the
existing ignored evidence owner, with no new maintained project command. Their
node_modules/packages junctions reference installed workspace targets; retain
through D7 acceptance, then unlink without traversing/deleting target trees in
D11 evidence cleanup. Database proofs already removed both owned databases.
No Docker service/image/tag, storage object or ordinary demo DB was modified.

Handoff receipt: prerequisite trace revisited, formatting/scoped lint/types,
focused behavior and actual guarded native SQL/compiled selection pass. The
remaining necessary action is the operator's serialized root install and client
generation. Lock drift is intentional until that install; do not run broader
suites, live proofs or image builds against the half-installed Media source.
After success, verify installed owner/client/adapter identity, narrow lock diff,
security gate and source/test/tools plus eight-owner test types, then hand off
pnpm db:verify:media and pnpm db:verify:media:upgrade for native CLI clean/populated
upgrade acceptance. Running images/scanner/S3/live recovery remain D8/B0 gates.

```powershell
fnm exec --using=24.22.2 pnpm.cmd install --no-frozen-lockfile --child-concurrency=1 *> .ci-evidence/dependency-review/d7-media-install.log
$installExit = $LASTEXITCODE
Get-Content .ci-evidence/dependency-review/d7-media-install.log -Tail 20
"exit_code=$installExit"
```

#### November 4 end-of-day publication - pre-edit handoff trace

Salar reports serialized Media install/generation succeeded in3m46.1s with exit0.
Read-only owner inspection confirms actual Media CLI/client/adapter7.10.1,
pg8.23.1 and generated source. Product and Order still match; six owners remain6.
The Web CKEditor/React peer warning retains its deferred Web owner.

This publication includes accumulated accepted work since ba181dc, not only
Media: D2 closure, build/watch evidence, Seaweed cutover/supply, dependency and
PostgreSQL maintenance, Product/Order7 and the installed Media7 checkpoint.
Do not describe this as D7/D8/B0 completion. Prior exact reports remain authoritative.

Pre-edit consumer trace for today's wrap-up: docs/current-focus.md (immediate
resume objective and device instructions); AI_CONTEXT.md (entry pointer and
supported Node); this existing report (portable acceptance/pending receipt);
docs/services/media-service.md and docs/docker-configs.md (installed versus
candidate status); docker/seaweedfs/README.md (stale active-MinIO introduction
must be explicitly historical); .gitignore (untracked root build logs are local
waste, not source); existing Setup.md/README.md operational references (retain
canonical bootstrap ownership). Review all changed/untracked files, lock importers,
private-path exclusions and contract preflight before committing; ignore local
raw logs, caches, journals, credentials, generated clients and vendor archives.
Do not discard any file or assume ignored evidence is available on another device.
Agent checks remain bounded/container-free; SQL/live/image and full CI acceptance
remain pending where recorded. No new Media implementation is planned tonight.
Publication review found one portability defect: the documented safe
`docker/seaweedfs/.env.storage.example` was excluded by `.env.*`. Inspection shows
only documentation placeholders, no generated credentials. Add an exact-path
exception, preserving exclusion of every real `.env` and private storage file.
The consumer is docker/seaweedfs/README.md; no runtime code reads that sample.

#### November 4 installed Media and portable publication receipt

Salar's install exit0 is accepted; actual root inspection observes Media7.10.1
CLI/client/adapter, pg8.23.1 and regenerated source. Product/Order stay7.10.1;
six owners and inherited root tooling stay6.16.2. No model/migration changed.

| Preparation or acceptance                | Observed result / scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Actual installed Media source/test/tools | All three no-emit projects pass under Node24.22.2. Focused typed lint passes. Five focused unit suites pass63/63 with no skips. Prior candidate import lint retains two named access-test warnings; none are hidden or reclassified.                                                                                                                                                                                                                                                              |
| All eight live-service test/helper types | 128 files, zero errors: User10/Auth17/Settings8/Media22/Taxonomy8/Product28/Blog12/Order23. No startup hooks or image acceptance inferred.                                                                                                                                                                                                                                                                                                                                                        |
| Installed lock review                    | All19 manifest importers match declared specifiers and retain the scoped fast-uri3.1.9 override. The diagnostic's first raw count incorrectly treated auto-installed peer entries as extras. Inspection establishes six exact declared peers each for clients and grpc-auth; every extra is now required to match that manifest's peer specifier. Identical runtime/dev duplicates normalize to one importer entry; differing versions still fail. No manifest/lock/security policy was weakened. |
| Fresh unchanged backend dependency gate  | Runtime0/tooling0/unresolved0; deferred-Web47. The known CKEditor/React peer warning remains deferred Web work.                                                                                                                                                                                                                                                                                                                                                                                   |
| Current-snapshot contract preflight      | api:check freshness plus four inventory/contract suites pass24/24. Windows PowerShell wraps Jest stderr in NativeCommandError text in the redirected log; actual process exit0 and all four suite results pass.                                                                                                                                                                                                                                                                                   |
| Earlier owner/native evidence            | Product host SQL and all nine installed Order SQL gates remain accepted for unchanged inputs. Media candidate actual SQL11/11 and compiled/source selector/pool cleanup remain candidate evidence.                                                                                                                                                                                                                                                                                                |
| Pending next acceptance                  | Salar runs pnpm db:verify:media then pnpm db:verify:media:upgrade on ready PG18.6. Full Media native CLI clean/populated upgrade, remaining six owners/root reconciliation, D8 image cohort, D4 remaining infra/scanner and B0/hosted current-snapshot CI are explicitly open. No long SQL/live/image proof ran tonight.                                                                                                                                                                          |
| Portability and source hygiene           | AI_CONTEXT/current-focus plus docs index point to this receipt and past exit reports; stale October12 phase text and historical MinIO notes are labeled. Exact safe storage-sample exception follows the real .env exclusions. Root raw logs remain on disk but are ignored. Private env/storage/journals/evidence, dependency caches, generated Prisma clients, archives and runtime volumes are not source artifacts.                                                                           |

The installed logs remain locally under the existing ignored dependency-review
owner: d7-media-install.log; d7-prisma/media/installed-\*.log and
installed-lock-review.json; d7-ship-test-types.log, d7-ship-security.log and
d7-ship-preflight.log. This portable receipt records observed results without
copying machine-local evidence, credentials or dependency junctions into Git.
Read the earlier named sections for the complete impact trace and first errors.
The new device must materialize its own generated/shared output and environment;
B3 fresh-bootstrap acceptance is not asserted by this publication.

Requirement/finding: preserve the complete current project and unambiguous
continuation checkpoint on main at Salar's explicit request.
Changed files/impact: accumulated source+tests+recipes+CI+canonical reports since
ba181dc, reviewed through existing slice traces; today's changes are handoff and
source hygiene only. Root Docker/config/code changes retain their prior scoped
results; current implementation inputs have the new installed checks above.
Format/syntax/lint/types: scoped formatting/diff checks, installed Media gates and
current contract preflight pass. Staged source/config review follows below.
SQL/runtime: retain exact operator and candidate scopes; do not turn this commit
into a release approval. Docker COPY/build, broad suites and hosted CI remain
separate gates for Salar/CI rather than a long end-of-day local run.
Readiness: READY TO PUBLISH CONTINUATION CHECKPOINT; full Media CLI proof pending.
Publication uses normal fast-forward main, never force-pushes or a release tag.
Publication source review passes for203 added/modified files (plus three retired
Supabase deletions):49 JS/MJS/CJS syntax checks,23 JSON parses,10 YAML parses,
no staged private/artifact paths, no GitHub/AWS/private-key pattern matches, and
the safe storage example is included. The generic YAML parser warns on Compose's
!reset/!override tags; this is syntax inspection, not native Compose-semantic
acceptance. Existing native selected-topology evidence remains separately recorded.
Final scoped formatting and staged whitespace checks pass. Normal main publication
will trigger CI; no hosted outcome is claimed in this source checkpoint.
