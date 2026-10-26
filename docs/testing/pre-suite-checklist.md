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

Use this table in the slice's dated report. Revisit it after implementation.

| Changed owner/symbol | Consumer file and evidence/search   | Required action or unchanged/deferred reason | Check and result                  |
| -------------------- | ----------------------------------- | -------------------------------------------- | --------------------------------- |
| Exact path + symbol  | Exact caller/fixture/assertion path | Concrete action; owner for deferral          | Actual command; pending until run |

## Gate 2 - Check the contracts and fixtures after editing

- [ ] Follow the actual input and response through every affected transport.
      Test omitted/null/empty/false/zero values where meaningful; do not turn
      omitted patch booleans into false or absent overrides into zero.
- [ ] Exercise actual protobuf serialization for changed responses. Empty
      repeated fields may be omitted on the wire; consumers must honor the
      defined empty-list contract rather than crash on `.map`.
- [ ] Check boundary validation at the owning service, not just Gateway DTOs.
      Media watermark recipe dimensions exposed a DTO-only validation gap.
- [ ] Review every affected inventory assertion: route/profile/RPC counts,
      exact OpenAPI paths, pinned hashes and fixtures. Inspect the source diff
      before rebaselining. Preserve uniqueness, authorization and signature
      checks; never delete assertions or broadly exclude new entries to get green.
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
- [ ] Include new test files in a real typed lint project. Check sibling owners
      using the same fallback configuration; do not raise default-project file
      limits or disable typed rules to hide missing project coverage.
- [ ] Exercise tooling fixtures with `CI=true` and `GITHUB_ACTIONS=true` when
      hosted CI runs them. Check frozen-lock defaults and grouped/colored output
      against the pinned tools. Author temporary fixture locks with the package
      manager, then validate frozen installs; keep production installs frozen.
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

This document enforces the assistant's preparation workflow. The automated
command detects the existing contract/inventory regressions; it does not
automatically discover every semantic dependency or certify SQL, containers or
all shell commands. Raw Jest and direct package commands can bypass it, so they
must only be handed off after the recorded gate. No automatic hook claims
otherwise.
