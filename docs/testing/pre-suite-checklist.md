# Mandatory test preparation checklist

Adopted: 2026-10-12. Applies before recommending, running or handing off a broad
suite, live proof, image build, or commit containing implementation changes.
AGENTS.md and AI_CONTEXT.md require this gate. A changed implementation is not
ready merely because its own focused test passes.

## Gate 1 - Map the change before editing

- [ ] Record the exact requirement, current mechanism and confirmed finding.
- [ ] Inspect `git status --short`, tracked/staged differences and relevant new
      files. A tracked-only diff misses new consumers and fixtures.
- [ ] Search changed functions, DTO/message/model names, RPCs, routes, fields,
      environment variables and commands with `rg`; follow callers and response
      consumers. List the actual files inspected, not just directory names.
- [ ] Include indirect consumers: serializers, shared clients/proto generation,
      Gateway DTOs/policies/input profiles, OpenAPI, generated client, seeds,
      SQL verification scripts, mocks, snapshots/counts/hash pins, dormant
      compatibility inventory, test helpers, package scripts, Docker build/copy
      targets, runtime imports and current documentation where applicable.
- [ ] For each dependency, record update required, unchanged with a reason, or
      explicitly deferred with its owning phase. An unexplained missing consumer
      blocks the handoff. Deferred behavior must not be advertised as complete.
- [ ] Reuse the existing documentation owner and tool before adding another.
      docs/README.md is the navigation index, the adopted TODO owns phase order,
      current-focus owns active actions, service/package/operations notes own
      current behavior, and the owning dated report holds detailed evidence.
      Trace commands, CI, Docker inputs and dynamic inventories before declaring
      a script or document redundant; a missing text reference is insufficient.
- [ ] For a feature spanning two systems or formats, trace the complete path:
      producer -> encoding/export -> transport/import/defaulting -> consumer ->
      verifier and retry/recovery. Name the actual files/tools on both sides and
      distinguish source identity from runtime identity. Inspect actual boundary
      output before finalizing comparisons; mark unavailable native observations
      pending with the exact missing proof rather than treating assumptions as
      verified behavior.

Use this table in the slice's dated report. Revisit it after implementation.

| Changed owner/symbol | Consumer file and evidence/search   | Required action or unchanged/deferred reason | Check and result                  |
| -------------------- | ----------------------------------- | -------------------------------------------- | --------------------------------- |
| Exact path + symbol  | Exact caller/fixture/assertion path | Concrete action; owner for deferral          | Actual command; pending until run |

## Gate 2 - Check the contracts and fixtures after editing

- [ ] Follow the actual input and response through every affected transport.
      Test omitted/null/empty/false/zero values where meaningful; do not turn
      omitted patch booleans into false or absent overrides into zero.
- [ ] Build boundary regressions from independently observed producer and
      consumer representations. Reusing the same assumed object on both sides
      cannot prove serialization/import compatibility. Cover documented or
      observed harmless differences and reject meaningful value changes; retain
      exact byte/digest checks where required. For operator-owned heavy proofs,
      prepare these focused cases and label the remaining native result pending.
- [ ] Exercise actual protobuf serialization for changed responses. Empty
      repeated fields may be omitted on the wire; consumers must honor the
      defined empty-list contract rather than crash on `.map`.
- [ ] Check boundary validation at the owning service, not just Gateway DTOs.
      Media watermark recipe dimensions exposed a DTO-only validation gap.
- [ ] Review every affected inventory assertion: route/profile/RPC counts,
      exact OpenAPI paths, pinned hashes and fixtures. Inspect the source diff
      before rebaselining. Preserve uniqueness, authorization and signature
      checks; never delete assertions or broadly exclude new entries to get green.
- [ ] When changing a package command or registered test-file list, search both
      the old exact command and its individual filenames through tooling tests,
      CI and docs. Update exact registration assertions before handoff; passing
      the newly registered suite does not exercise a separate script-list test.
- [ ] Check dormant/deferred compatibility separately from active behavior.
      The 59 preserved R5 receivers and eight explicitly deferred post-R5 RPCs
      are separate claims; unknown additions still fail the inventory check.
      D2's four Order-only Product stock RPCs have a separate exact inventory;
      they add no Gateway routes or protected Gateway RPCs. Their dormant
      context-v3 compatibility remains owned by the paused F4 restart audit.
      The two Batch 3 admin Order reads add Gateway routes but remain explicitly
      deferred from dormant F4 V3; do not count them as preserved R5 receivers.
      The two explicit demo payment operations have the same named deferral.
- [ ] Regenerate affected artifacts using their existing generators; never
      hand-edit generated output. Verify both freshness and consumer behavior.
- [ ] Check fixtures against current migration SQL, schema and service rules:
      required fields, defaults, enums, currency, precision, stock, lifecycle,
      references, dates, permissions, versions and capacity limits.
- [ ] For each negative SQL case, first prove a valid control insert succeeds;
      then violate only the target rule. Require the exact SQLSTATE/column/
      constraint or first error. Missing Product.description must not masquerade
      as a successful missing-currency test.
- [ ] Execute changed SQL fixtures against an owned disposable database with
      actual PostgreSQL. Mocked subprocess success is orchestration evidence
      only. Apply real baseline/current migrations, preserve populated legacy
      facts, verify reruns, and test rollback when the change requires it.
- [ ] Preserve first-error evidence for deliberately failed migrations. An
      aborted-transaction error alone is insufficient. Explicit transaction
      rollback verified through psql must be reported separately from native
      Prisma failed-migration recovery.
- [ ] Exercise seeders through real service contracts. Read configured shop
      currency; hash approved delivered bytes, not a blank legacy hash column;
      verify actual public availability, deletion and ordering semantics.
- [ ] Seed/rerun/verify and ownership-aware reset/recreation must have the
      applicable evidence. Check search fields, exact pagination/uniqueness and
      over-limit rejection. Do not change expected values to hide stored drift.
- [ ] Check negative cases and failure restoration, not just the successful
      fixture: denied role, stale version, missing/blocked references, dependency
      outage, interrupted work and retry exhaustion where affected.

## Gate 3 - Cheap checks before broad suites or builds

- [ ] Format changed source/test files and run `git diff --check`.
- [ ] Run syntax, scoped lint and types for affected owners and consumers.
      Warnings remain visible; unrelated baseline findings are reported rather
      than concealed or automatically expanded into new work.
- [ ] Run focused behavior regressions, including real codecs/validators where
      applicable. Keep mock evidence distinct from database and live evidence.
- [ ] Inspect the selected test config and global setup before execution.
      Filtering to unit files does not bypass integration startup hooks; use
      the existing unit-only config when live dependencies are not required.
      After a Node major change, load every applicable inherited TS config with
      the actual installed runner and verify selected files/proof flags. After a
      database major change, probe changed diagnostics through both native SQL
      and the installed generated client before handing off dependent proofs;
      preserving a constraint does not guarantee the client's error mapping.
- [ ] Include new test files in a real typed lint project. Check sibling owners
      using the same fallback configuration; do not raise default-project file
      limits or disable typed rules to hide missing project coverage.
- [ ] Before backend live suites or image/provision handoff, run
      `node scripts/check-backend-test-types.mjs` after shared producers and owner
      Prisma clients are available. Source-only build checks exclude tests; this
      no-emit gate includes every live owner's tests/helpers and shared fixture
      imports. It does not run startup hooks or certify running services.
- [ ] Exercise tooling fixtures with `CI=true` and `GITHUB_ACTIONS=true` when
      hosted CI runs them. Check frozen-lock defaults and grouped/colored output
      against the pinned tools. Author temporary fixture locks with the package
      manager, then validate frozen installs; keep production installs frozen.
      Audit isolated dependency trials before promoting them to the workspace.
      Native behavior/type success does not establish dependency security;
      preserve unknown-path blockers and inspect newly introduced CLI transitives.
- [ ] When adding native vendor tests to an image recipe, prove their bounded
      test stage before a full image handoff. Inspect published fixture fixes
      when a dependency's tests contradict its own limits; preserve every case
      and runtime module bytes. If that stage is long, hand over that focused
      proof first. Use the actual container's shell/tool options, not assumed
      GNU options on BusyBox.
- [ ] Verify actual launcher context for operator snippets that call the backend
      runner. Its pnpm child invocations require npm_execpath from a root pnpm
      lifecycle; direct Node and pnpm exec do not supply it here. A mock executor
      validates arguments, not real process launch. Use a read-only native probe
      and verify its intended host/database before a migration handoff.
- [ ] Verify environment-sensitive tests in a clean owned snapshot without local
      `.env` files or inherited deployment variables. Supply and restore every
      required fixture input; import pure contract inventories without runtime
      module startup effects. Local developer configuration must not mask gaps.
- [ ] Run `pnpm test:preflight` whenever Gateway contracts, RPC/protobuf source,
      route/input inventories, OpenAPI or generated client consumers are involved.
      It runs freshness checks and the four focused inventory suites before a
      full Gateway/client suite. This does not validate all runtime consumers.
- [ ] Review the complete final diff and revisit Gate 1's consumer table.
      Record every consumer's result or justified unchanged/deferred status.
      A focused pass on the owner alone does not complete this review.
- [ ] If an applicable fast check fails, fix it and rerun that gate before
      handing over the broader suite. Do not let the operator discover known
      stale assertions, missing fixture fields or formatting failures.

## Gate 4 - Runtime and command preparation

- [ ] Separate engine restart and container restoration stages. Check each
      native command's exit and actual daemon availability before continuing;
      PowerShell does not automatically stop a multiline native-command block
      after failure. Verify restored running/readiness states after dependency
      groups. When staged source pins must not deploy, restore witnessed existing
      container identities directly; config rendering and partial start progress
      do not prove full lifecycle recovery.
- [ ] Before live tests, confirm the needed services and their dependencies are
      ready: PostgreSQL accepts connections; Auth/Gateway/domain services and
      any required storage/scanner respond. A running container alone is not
      readiness. Existing health evidence is valid only for the relevant state.
- [ ] Separate startup, migration, application, fixture and transport failures
      using the first meaningful error and scoped logs. A 503, refused socket or
      PostgreSQL rejecting connections is not evidence that an image needs a build.
- [ ] Identify actual source/image drift before requesting a rebuild. Select
      affected services/dependencies and confirm the internal build scope;
      selecting one image previously still compiled eleven apps. Preserve cache
      and bound concurrency on the limited Docker VM. No routine forced rebuild.
- [ ] When changing the selected Compose topology/provider, inspect every
      affected restart/restoration runner for forced base-file arguments. Test
      the actual runner with config-only rendering: a mock stop/start assertion
      cannot prove it will preserve the active provider after recreation.
- [ ] After changing Dockerfile COPY inputs or context exclusions, run
      `node scripts/docker/check-build-context.mjs` before handing over an image
      build. It checks all local COPY inputs against the actual `.dockerignore`
      using a scratch/cache-only BuildKit copy, with no install/compiler RUNs or
      image export. A successful `--call=check` alone does not validate COPY input
      checksums, and host pruning may see files excluded from the Docker context.
- [ ] Prepare commands for the user's actual shell. For SQL on Windows, prefer
      the existing Node/psql stdin/file runner; do not rely on nested PowerShell
      quotes surviving native arguments. Do not mix WSL and Windows paths/tools.
- [ ] Validate generated fixtures and request bodies locally before handing off
      expensive processing. Give separate runnable commands and a bounded result
      summary to return; broad/long commands remain operator-owned.
- [ ] Mutation requests, including cleanup/logout, carry required idempotency
      keys. Retry only supported operations: honor rate-limit headers and bounds;
      reconnect bounded reads at deliberate restarts; never blindly replay writes.
- [ ] Cleanup uses current mutation versions, targets only owned fixture rows/
      objects/disposable databases and guarded temporary paths, clears temporary
      environment variables, and restores deliberately stopped dependencies.
      Cleanup errors must not erase the primary failure or report a false pass.

## Gate 5 - Handoff and completion receipt

Before any broad handoff, write the receipt below in the active slice report.
Every applicable gate needs evidence. Mark a genuinely inapplicable gate with a
reason; do not leave it blank or invent a pass. If a necessary proof itself is
heavy, mark that proof pending and hand it over only after its fixture and cheap
prerequisite checks pass. This is not permission to claim the proof completed.

```text
Requirement/finding:
Changed files and consumer impact table:
Format/syntax/lint/types results:
Focused contract/behavior results:
Actual SQL/seed/runtime evidence (or clearly pending operator-owned proof):
Source/image drift and rebuild decision:
Known limitations and explicit deferrals:
Next broad command(s), why needed, and expected result summary:
Readiness: READY FOR NAMED PROOF / BLOCKED BY NAMED PREPARATION FAILURE
```

- [ ] The assistant must not send broad commands without this receipt and must
      not declare success while an applicable prerequisite is unresolved.
- [ ] Record operator-reported results separately from locally observed output.
      Skipped tests, warnings, counts not supplied and scope limits stay explicit.
- [ ] Repeat passing checks only when a later change, failure or recorded
      dependency impact invalidates them. A source change invalidates applicable
      checks made before it; do not repeat unrelated proofs by default.
- [ ] Complete the final required suite/live/migration proofs, then update
      current-focus, the adopted TODO and the dated exit report consistently.
- [ ] Check documentation and output hygiene in the final diff: update canonical
      instructions and link evidence rather than copy whole command transcripts
      into current-focus. Place raw logs/reports in existing ignored output folders.
      Give new persistent artifacts an owner and retention/regeneration decision.
      Before removing existing artifacts, verify callers, resolved target paths
      and rollback/evidence needs; preserve private config, ownership journals and
      persistent data. Record justified retention instead of blindly pruning.
- [ ] When an operator finds a missed preparation defect, record its symptom,
      root cause, missed boundary/consumer, corrective regression and prevention
      in the owning report and the ledger below. Link the evidence; a generic
      promise to double-check does not close the defect.

## Preparation failure ledger

Append confirmed preparation defects here with their owning report. Keep details
in that report and the applicable prevention in the gates above; do not create a
new task hierarchy or repeat unrelated expensive proofs.

| Date / defect                                                                            | Root cause and missed boundary                                                                                                                                                                                          | Correction / required prevention                                                                                                                                                                                                                | Evidence                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-02: M4 loaded vendor config falsely rejected                                     | Archive config was compared literally with Docker's imported config; the synthetic loaded fixture reused the archive object and missed added empty User/OnBuild defaults                                                | Narrow two-field default normalization; regression accepts observed import shape and rejects meaningful config changes. Trace both actual sides and intermediate transformations before handoff                                                 | [M4 correction and acceptance](../reports/2026-10-28-seaweedfs-transition.md#nov-2---m4-acceptance-and-preparation-failure-log); scripts/storage/seaweed-vendor-evidence.test.mjs; 26 tests pass and native verify-loaded passes                         |
| 2026-11-02: M5 storage test registration missed a tooling consumer                       | Adding the transfer test to package.json left scripts/backend.test.mjs asserting the old two-file command; the focused storage suite could not detect that separate stale assertion                                     | Preserve the exact assertion and update its third filename; search old command strings and registered filenames across tooling tests/CI before handoff. Caught in activation preparation; no operator suite failure reported                    | [M5 activation trace](../reports/2026-10-28-seaweedfs-transition.md#nov-2---m5-accepted-copy-and-persistent-activation-preparation); five focused hosted-flag tooling tests pass                                                                         |
| 2026-11-03: mirror-restart handoff left applications stopped                             | Desktop restart timed out; subsequent restoration was partial, while config-only checks did not establish actual lifecycle completion. Exact earlier Compose start failure is unavailable.                              | Split engine/service stages, verify native exit and daemon state, then restore witnessed containers by dependency group and check real readiness. Preserve original images while staged pins are unaccepted.                                    | [Actual recovery and preparation correction](../reports/2026-10-31-dependency-maintenance-execution.md#mirror-activation-and-actual-service-recovery---nov-3); sixteen healthy containers, eleven readiness passes, original IDs/images/mounts preserved |
| 2026-11-04: PostgreSQL vendor build reaches broken upstream parser fixtures              | Moby user 0.4.1's file-cap test uses NUL padding that hits its line cap; static recipe checks did not exercise the new native test dependency. An agent-only repair probe also caught unsupported BusyBox diff -x.      | Apply the publisher's exact test-only fix to an isolated module copy, preserve every case, compare production-file SHA-256 manifests and prove the native test stage before retrying a full image.                                              | [Parser fixture correction](../reports/2026-10-31-dependency-maintenance-execution.md#november-4-build-failure---upstream-parser-test-fixture-correction); actual full parser package passes with unchanged module checksums.                            |
| 2026-11-04: inline migration command fails before Prisma                                 | The handoff invoked a runner requiring npm_execpath through plain Node; mocked argument checks bypassed the actual launcher.                                                                                            | Use the supported root db:prepare lifecycle command and verify actual pnpm-to-Prisma launch against the intended local port/database. Keep the existing launcher guard and explicit owner mapping.                                              | [Launcher correction](../reports/2026-10-31-dependency-maintenance-execution.md#november-4-migration-launcher-failure---supported-pnpm-handoff-correction); real read-only launch and focused regression pass.                                           |
| 2026-11-04: PG18/Node24 proof preparation missed diagnostic and config-loader boundaries | Parent RESTRICT changed from 23503 to 23001; Prisma 6.16.2 also leaves it unmapped. Node24 native TS loading cannot resolve Media's inherited config import. Migration/source checks did not establish these consumers. | Correct only parent SQL expectations; preserve P2003 runtime assertions and make D7 compatibility a PG18 prerequisite. Explicit existing ts-node loader passes actual config/selection/proof-flag checks; native client failure stays recorded. | [PG18 regression trace](../reports/2026-10-31-dependency-maintenance-execution.md#november-4-postgresql-18-regression-failures---preparation-trace); five actual FK definitions checked; temporary SQL controls pass; Media full retry pending.          |
| 2026-11-04: Product pilot omitted its dependency audit                                   | The isolated Prisma7 trial checked generation/types/native behavior but did not audit the new CLI graph before workspace installation; fast-uri3.1.0 introduced eight high unresolved findings.                         | Audit isolated trials before promotion; preserve the strict gate, patch only Ajv8.17.1's compatible fast-uri edge to3.1.9 and verify installed binding/security before stock handoff.                                                           | [Product installed dependency correction](../reports/2026-10-31-dependency-maintenance-execution.md#product-workspace-installation-accepted---fast-uri-dependency-correction); original failing report retained in D7 evidence.                          |

This document enforces the assistant's preparation workflow. The automated
command detects the existing contract/inventory regressions; it does not
automatically discover every semantic dependency or certify SQL, containers or
all shell commands. Raw Jest and direct package commands can bypass it, so they
must only be handed off after the recorded gate. No automatic hook claims
otherwise.
