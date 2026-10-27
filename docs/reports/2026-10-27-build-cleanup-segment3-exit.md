# Build cleanup Segment 3 exit proof

Accepted: 2026-10-27. Tested implementation: main
`7035545e39db1d905acbf180244ff3c06ca53e82`.
[Successful hosted run 40472070054](https://github.com/pain1122/nebulaNV/actions/runs/40472070054).
Both quality (job 122081301952) and live-e2e (122082442206) conclude success.
This closes build-cleanup Segment 3; D2 feature acceptance remains separate.

## Final evidence

| Requirement                                               | Observed result                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All eleven selected service graphs and shared batch union | Native rollout and offline packaged closures passed previously; accepted pipeline retained on all eleven hosted images. No sibling application checkout/output required at runtime.                                                                                              |
| Input isolation and cached producer synchronization       | Ten native Product/Order modified-input cases passed; nine graph fixtures and actual COPY-context check pass in quality. Earlier evidence remains valid; no compiler/graph source changed in final runtime patch.                                                                |
| Host task cache                                           | Quality saves bounded Turbo outputs on main; a separate fresh live runner restores them. Earlier and final jobs retain frozen installs, tests and generated-file checks.                                                                                                         |
| BuildKit layer persistence                                | Subsequent fresh hosted builders import per-image GHA layers. Run 40470059781 exports all eleven images in 101.5s with cached dependency/generation/compilation; some runtime overlay/import/Sharp checks rerun. This is not an all-RUN-cache-hit claim.                         |
| Final patched images                                      | Eleven exports succeed, 151.7s combined. The shared runtime OS layer changes; this timing includes its repackaging rather than an unchanged warm benchmark.                                                                                                                      |
| Local warm reference                                      | Earlier all-image acceptance: 111.1s, every RUN cached, app/config digests unchanged. Resources differ from the initial slow baseline; no controlled single-cause or cold-build three-minute claim.                                                                              |
| Native infrastructure and startup                         | Checksum-pinned vendor images load, all configured owner migrations deploy/status and base/demo seeds complete; required backend readiness passes.                                                                                                                               |
| Database upgrade                                          | Historical populated Product metadata upgrade, failed-upgrade rollback and deploy rerun pass with current migration tails. Other D2-specific upgrade/recovery/feature proofs retain their own owners.                                                                            |
| Public/runtime compatibility                              | F3 live profiles and all invoked live/e2e suites pass. Existing optional Media DB suites remain skipped by default: two suites / eleven tests. No new skip.                                                                                                                      |
| Preparation                                               | 82 tooling tests, all 125 test/helper inputs across eight live owners, lint/types, generated contracts, shared/security/Gateway/Authority/client/Web checks and source builds pass in quality.                                                                                   |
| Security                                                  | Source and runtime dependency gates pass. Eleven image reports each have zero blocking/application findings and 57 unfixed Debian findings retained under the existing F9 policy. 627 image occurrences are repeated findings, not 627 distinct CVEs. No gate/policy relaxation. |
| Release archive                                           | Complete sixteen-reference Docker save/load stream passes under pipefail; before/after image IDs compare equal. No giant tar is retained on the runner.                                                                                                                          |
| Exact tested backend identities                           | Artifact contains the correct commit and eleven unique backend references/sha256 IDs; Config/env/labels are excluded.                                                                                                                                                            |
| Evidence/cleanup                                          | Fourteen-day allowlisted artifacts and unconditional runner resource cleanup succeed; no operator application/volume mutation.                                                                                                                                                   |

Downloaded bounded final evidence:
`.ci-evidence/build-ci-cache/hosted-7035545-live/` contains sanitized security
reports and `.ci-evidence/backend-tested-images.json`. The GitHub job log records
all image timings and the archive gate. Hosted artifacts expire after fourteen
days; this committed receipt and the run links preserve the acceptance facts.

## Closure dependency/documentation review

No implementation change is required to accept the observed green run. Before
documentation edits, inspected the active checklist/current-focus/adopted TODO,
final workflow/jobs/log, CI/native/runtime-patch receipts, actual release Compose,
archive inventory/helper scripts, deployment runbook and environment/build docs.

| Exact consumer                                                                                                                               | Final action                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/ASAP-BUILD-CLEANUP.md`                                                                                                                 | Close remaining Segment 3 integration/archive/cache items; activate bounded Segment 4 decision work.                                                                                               |
| `docs/current-focus.md`, `TODO-ALTERNATIVE.md`                                                                                               | Replace stale pending CI narrative with final proof and Segment 4 next slice. Preserve every D2 feature/deployment gate and phase order.                                                           |
| `docs/reports/2026-10-26-build-cleanup-segment3.md`, `2026-10-26-build-cleanup-ci-cache.md`, `2026-10-27-runtime-debian-security-patches.md` | Add final accepted status and reference this exit report. Earlier chronological pending receipts remain historical evidence, superseded by this final result.                                      |
| `deploy/README.md`, `docs/docker-configs.md`, `docs/architecture/local-dev-and-docker-boot.md`                                               | Correct stale image counts/omitted scanner and Realm DB init runbook input; identify image-only delivery as manual and update hosted acceptance. No automated release publishing/deployment claim. |
| Workflow/Bake/Dockerfile/lock/env/SQL/API/protobuf/generated code/test assertions                                                            | Unchanged by closure; previously passing evidence remains applicable. No rebuild/broad suite is needed for these documentation edits.                                                              |

Preparation receipt: documentation-only closure, Markdown format/local links and
diff checks required before commit. No public/SQL/generated consumer changed;
preflight/source/image suites are inapplicable to the closure edit itself. The
observed hosted proofs above are actual acceptance, not mocked subprocess results.
Any Segment 4 implementation must receive its own impact review and cheap gates.

## Explicit boundaries and next work

Segment 4 begins with runtime environment ownership and precedence review.
Production-package layout, watch/restart workflow and universal shared-package
splits remain evidence-led decisions; starting the segment does not authorize
an unreviewed replacement. Keep the accepted build graph, Node/OS family,
application contracts, operator real env files, storage and pending D2 work.
Automated image publication/server rollout is not implemented by this segment.

Closure changes are documentation-only. The subsequent Segment 4 Authority
release-input correction is separately traced and checked in its
[receipt](2026-10-27-release-authority-env-correction.md); it does not alter the
accepted compiler/packaged image inputs or graduate D2 feature gates.

Final checkpoint checks: Markdown formatting, all 98 relative links and diff checks pass. D2 evidence and adopted phase order are preserved. The Segment 4 runtime correction has 83 tooling passes, four focused Authority passes and twenty-two clean schema cases; only two required release mappings change and original template values remain intact. No image/compiler/API/SQL input changed. Hosted validation of the new configuration checkpoint is pending its normal main push; the recorded Segment 3 acceptance remains on 7035545.
