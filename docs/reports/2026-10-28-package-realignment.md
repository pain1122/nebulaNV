# Frozen package realignment

Started and host restore accepted: 2026-10-28. Status: frozen installation and
post-install verification complete; Docker rollout remains separate.
Scope is restoring the existing lockfile, not selecting new versions.
[Assessment](2026-10-28-dependency-maintenance-assessment.md).

## Finding and baseline

Classification: stale installed dependencies and local image rollout.
Pinned and executing pnpm are both 10.17.1; host Node remains 22.14.0. No active
native watch lock or Node process was observed during preparation. Existing
uncommitted application/tooling/docs work is preserved; nothing was staged,
committed, stashed or reset.

Read all 19 manifest/lockfile importers. The direct-resolution probe compared
479 installed external dependency entries, found 103 mismatched/missing
resolutions, and found 46 present workspace links/copies. These are occurrences
across owners, not 103 unique packages. Mismatches include Nest, gRPC JS, Joi,
Nest testing, compression and Web lint dependencies. Two entries are missing.
Manifest dependency presence checks have zero discrepancies; pnpm's consolidation
of the identical runtime/development jsonwebtoken declaration is accounted for.
Frozen install remains the authoritative full manifest/lockfile consistency gate.

The pre-install receipt hashes all 19 manifests plus the lockfile, workspace
configuration and `.npmrc` (22 input files). Wanted lockfile SHA256:
`e74d538cf2bbbf85f9a4ffc731650b88870188959634ee7c1e024d0738d7fca6`.
Ignored local evidence: `.ci-evidence/dependency-review/alignment-before.json`.
This hashes dependency inputs; it is not a full working-tree backup.

## Before-edit consumer trace

| Owner/mechanism                             | Exact consumer paths inspected                                                                                                                                                                                                                                                                                                                                                                                                          | Action and validation                                                                                                                                                       |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frozen install policy                       | `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.npmrc`                                                                                                                                                                                                                                                                                                                                                                       | Preserve all dependency inputs; use pinned pnpm with `--frozen-lockfile`, normal lifecycle scripts and existing store                                                       |
| App importers                               | `apps/auth-service/package.json`, `apps/blog-service/package.json`, `apps/gateway/package.json`, `apps/media-service/package.json`, `apps/order-service/package.json`, `apps/product-service/package.json`, `apps/realm-auth-service/package.json`, `apps/settings-service/package.json`, `apps/taxonomy-service/package.json`, `apps/tenant-authority-service/package.json`, `apps/user-service/package.json`, `apps/web/package.json` | Restore installed resolutions, including Web so workspace state is coherent; no manifest edits or feature changes                                                           |
| Shared importers/injected copies            | `packages/api-client/package.json`, `packages/clients/package.json`, `packages/config/package.json`, `packages/grpc-auth/package.json`, `packages/migration-artifacts/package.json`, `packages/protos/package.json`; workspace `syncInjectedDepsAfterScripts`                                                                                                                                                                           | Preserve peer requirements and refresh policy. Link presence is checked; compiled shared output correctness requires subsequent checks                                      |
| Nine generation hooks                       | Blog, Media, Order, Product, Realm Auth, Settings, Taxonomy, Tenant Authority and User manifests above, each `postinstall` -> `prisma:gen`                                                                                                                                                                                                                                                                                              | Normal install generates local clients; these commands do not migrate/seed databases. Do not use `--ignore-scripts` as a shortcut                                           |
| Existing build/CI consumers                 | `.github/workflows/ci.yml`, `docker/backend.Dockerfile`, `scripts/docker/backend-build-graph.mjs`, `scripts/docker/verify-runtime-imports.mjs`                                                                                                                                                                                                                                                                                          | Frozen policy already exists; unchanged. Current local images remain older until an explicitly selected rebuild/deployment                                                  |
| Checks and advisory attribution             | `scripts/check-backend-test-types.mjs`, `scripts/backend.mjs` dependency report/classifier; root `test:preflight` command                                                                                                                                                                                                                                                                                                               | Rerun applicable checks after successful restore; do not interpret old installed inventory as restored state                                                                |
| Gateway/codec/generated client/fixtures/SQL | Root `test:preflight`, `packages/api-client/package.json`, `packages/protos/package.json`; D2 accepted source unchanged                                                                                                                                                                                                                                                                                                                 | No symbols, transport fields, inventories, hash expectations, seed or migration contracts edited. Preflight after restore; SQL/live repeats only if relevant behavior fails |
| Work tracking                               | `docs/current-focus.md`, `TODO-ALTERNATIVE.md`, assessment and D2 exit report                                                                                                                                                                                                                                                                                                                                                           | Add this receipt; D2 stays accepted, B0/dependency alignment remain open                                                                                                    |

## Execution and after-install checks

Run from repository root in PowerShell:

```powershell
pnpm install --frozen-lockfile --reporter=append-only *> package-realignment.log
$alignmentExit = $LASTEXITCODE
Get-Content package-realignment.log -Tail 35
"exit_code=$alignmentExit"
```

The normal install may assemble many workspace packages and generate nine
clients, so Salar owns this long command. No force, cache deletion, lockfile
regeneration, version upgrade or database reset is requested. If it fails,
retain the first meaningful error rather than bypass frozen mode.

After exit zero, the prepared local probe is available:

```powershell
node .ci-evidence/dependency-review/check-alignment.cjs after
```

It requires zero mismatched/missing direct resolutions, zero missing manifest
dependency entries and unchanged dependency input hashes. The script resolves
the existing Swagger-owned YAML parser; no new project dependency was added.
It is ignored local evidence tooling, not a production/CI gate. Its scope does
not prove transitive peer graphs, injected compiled artifacts, native binaries,
application behavior, running images or database correctness.

Agent follow-up after installation: inspect the result/lifecycle warnings,
reconcile actual versions/advisory attribution, verify shared artifact imports,
run preflight and applicable focused checks. Broad suites/builds are not handed
off until their cheap preparation gates pass. Keep image rollout grouped with
the selected next maintenance cohort where safe, avoiding duplicate exports.

## Handoff receipt

This initial handoff is retained as history; the completion receipt below
supersedes its pending installation notes.

- Requirement: restore the unchanged, already selected dependency graph.
- Consumer trace: above; application/contract consumers unchanged with reasons.
- Preparation: correct pnpm confirmed; lifecycle commands inspected; 19-importer
  baseline captured; probe syntax and actual before-state execution pass.
- Format/diff: checked with this documentation change; no implementation edited.
- Expected failing baseline: 103 direct resolutions; addressed by this install.
  No known manifest dependency omission blocks the named restore command.
- SQL/seed/live evidence: not applicable to installation; existing D2 passes
  preserved. Generated-client completion and post-install preflight pending.
- Source/image drift: existing Product/Media dependency drift confirmed; a host
  install does not update Docker tags. No image build handed off now.
- Deferrals: version upgrades, storage selection, Web security remediation and
  image rollout remain owned by the post-D2 maintenance assessment.
- Readiness: READY FOR FROZEN RESTORE ONLY. Package realignment is not complete
  until installation and verification pass; broad test/build handoff remains pending.

## Completion receipt - 2026-10-28

Salar supplied install exit zero and `Done in 1m 16s using pnpm v10.17.1`.
Agent inspection of `package-realignment.log` confirms all nine successful Prisma
6.16.2 client generations. Existing Prisma package-configuration deprecations
remain visible; no additional install warning category was found by the scoped
log inspection. No database migration or seed was performed.

| Post-install gate                               | Observed result                                                                                                                              |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Actual direct resolutions                       | 19 importers, 481 external entries, zero mismatched/missing versions; 46 workspace links/copies present                                      |
| Dependency input preservation                   | All 22 manifest/configuration/lockfile hashes unchanged; zero manifest dependency omissions                                                  |
| Generated clients                               | All nine owner clients import and report 6.16.2                                                                                              |
| Shared runtime imports                          | All 39 direct shared package imports across eleven backend services succeed                                                                  |
| Injected file parity                            | 1,055 compiled/proto file comparisons across 39 shared dependency references pass against existing producer outputs; not a fresh compilation |
| Compiled runtime import policy                  | `node scripts/docker/verify-runtime-imports.mjs` passes for eleven services                                                                  |
| Native modules                                  | Media Sharp 0.35.5 encodes/reads a 2x2 cropped PNG; bcrypt hash/compare passes without service/database startup                              |
| Gateway/client freshness and contract preflight | `pnpm test:preflight` exit zero; generated OpenAPI/SDK current; four suites, 23 tests pass                                                   |
| Shared environment validation                   | Focused `packages/config/test/env-validation.spec.ts`: one suite, six tests pass                                                             |
| Signed client wrappers                          | Focused `packages/clients/test/signing-policy.spec.ts` and `service-wrappers.spec.ts`: two suites, 13 tests pass                             |
| Dependency report                               | `pnpm scan:dependencies:backend` exit zero; runtime=0, tooling=4, deferred-web=43 under the existing policy                                  |

Ignored evidence includes `alignment-after.json`, `alignment-injected.json`,
`realignment-preflight.log`, `realignment-config.log`,
`realignment-clients.log` and `realignment-audit.log` under
`.ci-evidence/dependency-review/`. Windows PowerShell decorates some Jest stderr
PASS lines as `NativeCommandError` in redirected logs; the processes exit zero
and their suite/test summaries pass. No assertion or coverage was removed.

The four unmatched advisory records still use the classifier's tooling fallback
after restoration; their recorded audit paths remain Web-owned, with no matched
backend paths. This reporting-attribution gap remains with the maintenance
review. It is not evidence that package restoration failed, nor a reason to
weaken the gate or claim that every dependency is secure.

Consumer table revisited: no manifest, source, DTO/protobuf, inventory/hash,
fixture, seed, SQL or build/CI policy edit was required. The pre-install report
and probe remain local evidence only; documentation records the result.
Formatting, local links and `git diff --check` are checked with this receipt.

Readiness: HOST PACKAGE ALIGNMENT COMPLETE. Previous D2 functional acceptance
remains preserved. No broad integration/live suite, full test-type gate, fresh
image build, deployment or new hosted CI run is claimed. Existing local image
dependencies remain older than the restored host. Select and validate the next
maintenance cohort before grouped image rollout; run the mandatory cheap test
preparation gates before any later broad proof/build handoff.
