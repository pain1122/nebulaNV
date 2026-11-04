# Current-focus replacement receipt

Date: 2026-10-31. Documentation change only; no implementation, package,
configuration, database or container changes are part of this task.

Salar requested an actionable replacement for current-focus covering Media and
SeaweedFS first, dependency maintenance second, then B0 release reconciliation.
F7/D3 admin integration must receive a separate later checklist. Each task has
one action, owner/consumer paths and an observable completion condition, with no
nested implementation checklist. Source files are review targets, not blanket
authorization for optional architecture replacements or major upgrades.

## Consumer trace

| Owner                                       | Consumer                                                                                           | Disposition                                                                                                                                                            |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| docs/current-focus.md                       | Active execution checklist                                                                         | Replaced historical narrative with M1-M7, D1-D9 and B1-B6; retained accepted baseline, pending SeaweedFS cutover, evidence boundaries and mandatory preparation rules. |
| Previous current-focus                      | docs/reports/2026-10-31-current-focus-checkpoint.md                                                | Archived before replacement; explicitly marked historical so earlier pending notes do not override current status.                                                     |
| Active checklist order                      | TODO-ALTERNATIVE.md current-execution paragraph                                                    | Align summary to Media -> dependencies -> B0; preserve phase order, completed feature checkboxes and deferred tenant/admin scope.                                      |
| Media implementation/evidence               | docs/reports/2026-10-28-seaweedfs-transition.md                                                    | Unchanged; remains detailed Media receipt, including the Oct 31 database pass and pending active-provider conversion.                                                  |
| Dependency baseline                         | docs/reports/2026-10-28-dependency-maintenance-assessment.md and 2026-10-28-package-realignment.md | Unchanged historical assessment and completed frozen-install evidence; planned version checks occur when maintenance starts.                                           |
| D2 acceptance                               | docs/reports/2026-10-28-d2-exit-proof.md                                                           | Unchanged; D2 accepted, B0 open, current-snapshot CI separate.                                                                                                         |
| Future implementation logs                  | Planned maintenance execution and B0 evidence reports named in current-focus                       | Create when those sections start, not empty completion reports now.                                                                                                    |
| Application/generated/config/test consumers | Paths named under the new tasks                                                                    | Inspected as planning targets only; no changed runtime contract, fixture, hash, generated file or test requires a refresh in this documentation task.                  |

## Validation receipt

Applicable checks: Markdown formatting, referenced repository path review, local
link resolution, final documentation diff and git whitespace checks. No broad
suite, preflight, image build or database rerun is necessary: this edit changes
no contract, source or operational input. Prior passing evidence remains intact.
Check results are recorded after execution below. All new implementation tasks
remain unchecked; this report does not certify their future compatibility or
security results. No new hosted CI, upgrade or SeaweedFS deployment is claimed.

Observed validation: all four edited/new Markdown files pass Prettier and
`git diff --check` passes. All 93 local Markdown links resolve, including rebased
links in the archived focus. All 24 brace-expanded API-client/demo consumer paths
exist. The task inventory contains exactly 22 unique unchecked IDs: seven Media,
nine maintenance and six B0 actions. Inspection of the actual API-client package
scripts corrected the planned admin-read path: it is the existing Checkout
entrypoint with `--admin-reads`, not a nonexistent separate Order test file.
Future execution-report paths remain explicitly planned, not broken links or
invented acceptance evidence. Readiness: READY TO START M1; no implementation
task was executed or checked off during this documentation replacement.
