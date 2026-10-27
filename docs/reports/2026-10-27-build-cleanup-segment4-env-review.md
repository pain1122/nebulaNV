# Build cleanup Segment 4: environment ownership review

Started and first review completed: 2026-10-27. User direction: close Segment 3,
update docs and start Segment 4. This is the first bounded review/decision slice,
not blanket approval for optional architecture replacements.

## Requirement, before-edit trace and findings

Preserve accepted service build isolation and runtime-only configuration behavior;
review common/app/deployment inputs before proposing any migration. Inspected
`docker-compose.yml`, `docker-compose.release.yml`, `.env.example`,
`deploy/.env.production.example`, `.dockerignore`, `turbo.json`,
`pnpm-workspace.yaml`, `scripts/backend.mjs`, `scripts/docker/backend-build-graph.mjs`,
shared `packages/config/src/env.validation.ts`, `packages/grpc-auth/src/env.validation.ts`,
`packages/grpc-auth/src/tokens.ts`, `packages/grpc-auth/src/s2s.ts`,
`packages/grpc-auth/src/s2s-propagation.ts`, deployment/env/build documentation.

Every row below includes the owner's `src/config/env.validation.ts` and tracked
`.env.example`, plus the listed exact native module and its Compose entry.

| Owner directory                 | Native module inspected  | Schema keys | Local rendered keys | Release rendered keys |
| ------------------------------- | ------------------------ | ----------: | ------------------: | --------------------: |
| `apps/user-service`             | `src/app.module.ts`      |          26 |                  61 |                    27 |
| `apps/auth-service`             | `src/app.module.ts`      |          28 |                  59 |                    29 |
| `apps/realm-auth-service`       | `src/app.module.ts`      |           9 |                   8 |                     8 |
| `apps/tenant-authority-service` | `src/app.module.ts`      |          27 |                  18 |                    30 |
| `apps/settings-service`         | `src/settings.module.ts` |          25 |                  61 |                    27 |
| `apps/media-service`            | `src/media.module.ts`    |          57 |                  92 |                    47 |
| `apps/taxonomy-service`         | `src/app.module.ts`      |          26 |                  61 |                    27 |
| `apps/product-service`          | `src/app.module.ts`      |          28 |                  61 |                    27 |
| `apps/blog-service`             | `src/app.module.ts`      |          27 |                  61 |                    27 |
| `apps/order-service`            | `src/app.module.ts`      |          27 |                  61 |                    27 |
| `apps/gateway`                  | `src/app.module.ts`      |          23 |                  23 |                    22 |

Schema keys include optional/default inputs; rendered counts are actual map keys,
not secret values or a claim that every unknown key is unused. All eleven schemas
validate clean local and release renders with zero errors under Nest's default
allowUnknown behavior. Root example contains 53 keys. Eight local env-file consumers
inherit eleven Gateway tuning keys; Gateway, Realm and Authority do not receive
that same blanket root env file in local Compose.

Classifications:

- **Stale documentation:** active build/release docs still showed old image counts,
  omitted the scanner/Realm init runbook input and pending Segment 3 CI state.
  Closure docs correct those facts with the verified green run.
- **Confirmed duplication / optional hardening:** Gateway tuning defaults and
  broad local root inheritance exceed most owning schemas. Release already uses
  explicit maps; there is no demonstrated need to replace that working mechanism.
- **Confirmed release wiring defect:** Authority's two existing required
  membership-epoch HMAC inputs were not forwarded by release Compose (the template already declared them).
  The narrow correction supplies them without changing schemas or backfill logic.
  After correction all twenty-two schema cases pass; no runtime-env build defect
  was demonstrated. [Correction receipt](2026-10-27-release-authority-env-correction.md).
- **Future scaling consideration:** universal shared-package splits, per-service
  production packaging and a new env-generation system need measured benefit and
  migration/maintenance review; none follows merely from duplicate key names.

## Actual probes and corrected hypothesis

An owned snapshot materializes only tracked working-tree root/app/deployment examples.
All corresponding inherited shell keys and Compose selection variables are cleared.
Actual Compose renders and actual source Joi schemas are used, not operator env.
Schemas are loaded without Nest applications, database or Redis connections.

Public conflicting sentinels test native app/root/process precedence, local
Gateway tuning and release deployment inputs. Actual Nest ConfigModule confirms
app before root and process before both. Local Gateway receives its app-file
tuning; explicit Compose addresses/listeners stay internal. Release receives its
deployment tuning. Gateway's build specification is identical before/after the
runtime-only tuning edit. No live recreate or image build is claimed.

The final aggregate assertion exposed two Authority release errors that the first
diagnostic printed without failing its process. It now requires zero errors for
all twenty-two cases. Corrected release input wiring passes; removing either
input in the owned template fails with its exact required-variable error.
The green Segment 3 run booted local Compose, not a full release deployment;
its existing release Gateway-boundary evidence was narrower than this review.

An initial diagnostic incorrectly expected root Gateway rate tuning to override
the local app file; actual Compose returned the app value. Source reinspection
showed the local map pins network targets, while the release map interpolates
tuning. The hypothesis was rejected and corrected before proposing configuration
changes. No runtime contract or assertion was weakened to hide a defect.

Key-only evidence: `.ci-evidence/build-ci-cache/segment4-env-summary.json` and
the review/probe script/log beside it. Source-module path/order checks cover all
eleven services. Successful snapshot cleanup verifies its absolute parent/name
before removal. One failed example-only snapshot is retained for diagnosis; no
operator file, volume, container or secret was read/changed by the review.

## Decision and consumer review

Preserve current mechanisms and wire the two omitted existing release inputs. Publish
[runtime environment ownership](../architecture/runtime-environment-ownership.md)
with exact edit/apply rules and a proposed later explicit-local-map option.
That option would touch both Compose assumptions, env examples/native fallbacks,
trust/schema tests and real operator override compatibility; it is optional and
not approved as an implementation by starting this segment. No replacement is
needed to satisfy the observed working runtime/build boundary.

| Exact consumer                                                                                       | Action / unchanged reason                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/architecture/runtime-environment-ownership.md`                                                 | New bounded contract describing verified current ownership/precedence and migration tradeoff.                                                                                      |
| `docs/ASAP-BUILD-CLEANUP.md`, `docs/current-focus.md`, `TODO-ALTERNATIVE.md`                         | Segment 3 closed; Segment 4 active; first env review/contract complete. Optional migration and remaining packaging/watch decisions stay explicit.                                  |
| `docs/docker-configs.md`, `docs/architecture/local-dev-and-docker-boot.md`, `deploy/README.md`       | Link the ownership contract and update stale release/build facts.                                                                                                                  |
| Existing owner schemas/modules/local examples, shared config/grpc-auth, Turbo/pnpm and Docker inputs | Unchanged. Only release Compose gains required forwarding; the production example retains existing inputs with clarified comments; no broad env migration.                         |
| scripts/backend.test.mjs and existing test/public/SQL consumers                                      | Add one release-input wiring regression. Existing Authority schema/backfill/wiring tests and API/proto/SQL/generated consumers are unchanged; focused tooling/config checks apply. |

Preparation receipt: actual twenty-two service-schema validations, eleven native
module path checks, native/Compose conflicting-input probes and unchanged build
spec check pass. Markdown formatting, local links and diff checks precede commit.
Earlier green CI/native evidence remains applicable. Runtime recreation remains
operator-owned and pending where D2 requires it; none is needed for this review.

Next Segment 4 decision: compare the current shared production dependency layer
against a per-service layout using size/duplication and closure evidence; retain
the accepted layout unless a measured benefit justifies another packaging gate.
Then prepare the selected-service watch/restart proposal. Shared-package splitting
remains conditional, not a new prerequisite for D2 feature work.

The two-input correction has its own [dependency and check receipt](2026-10-27-release-authority-env-correction.md).
It changes no owner application logic or image inputs. Tooling passes 83/83 and
focused existing Authority schema/wiring checks pass four tests; clean configuration
probes pass all twenty-two cases and both missing-input negatives. Broader
configuration replacement remains optional, with the current ownership preserved.

Final checkpoint checks: Markdown formatting, all 98 relative links and diff checks pass. D2 evidence and adopted phase order are preserved. The Segment 4 runtime correction has 83 tooling passes, four focused Authority passes and twenty-two clean schema cases; only two required release mappings change and original template values remain intact. No image/compiler/API/SQL input changed. Hosted validation of the new configuration checkpoint is pending its normal main push; the recorded Segment 3 acceptance remains on 7035545.
