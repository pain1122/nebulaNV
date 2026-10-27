# Segment 4: Authority release environment correction

Before-edit trace: 2026-10-27. Classification: confirmed release configuration
defect. Expanded schema review finds twenty-one of twenty-two service/mode cases
valid; only release tenant-authority-service lacks two required existing inputs:
AUTHORITY_MEMBERSHIP_EPOCH_HMAC_KEY_ID and AUTHORITY_MEMBERSHIP_EPOCH_HMAC_KEY.
Native/local inputs and the production template already provide them; the release map failed to forward them. The successful Segment 3 CI boot uses
local Compose; its release boundary check focuses on Gateway and does not certify
an actually started release stack. Its observed pass remains valid for that scope.

The first diagnostic printed per-owner errors without a failing exit status;
the final aggregate assertion exposed these two missing fields before commit.
Earlier draft wording saying all cases passed is corrected in the final receipt.
Retain this negative evidence; do not weaken the required Authority schema.

| Exact owner / consumer inspected                                                                                       | Narrow action                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/tenant-authority-service/src/config/env.validation.ts`                                                           | Unchanged: existing required key ID format and secret min32.                                                                                                                   |
| `apps/tenant-authority-service/src/authority/legacy-role-backfill.ts` and `apps/tenant-authority-service/.env.example` | Preserve current derivation/session behavior and local inputs; no tenant feature or key rotation.                                                                              |
| `docker-compose.release.yml` tenant-authority-service environment                                                      | Add explicit required interpolation for the two existing owner inputs.                                                                                                         |
| `deploy/.env.production.example` Authority section                                                                     | Preserve existing declarations/placeholders; add explanatory comments about forwarding and retaining deployed keys. No real operator env edit.                                 |
| `scripts/backend.test.mjs` release/runtime policy                                                                      | Add a wiring regression requiring correct variables and valid example formats; all previous assertions retained.                                                               |
| Owned clean Compose/schema probes                                                                                      | Read current tracked working-tree examples/configs; assert zero diagnostics across all twenty-two cases and fail for either missing required deployment input. No app startup. |
| `deploy/README.md`, environment ownership/review/current-focus/ASAP/adopted TODO                                       | Document input requirement, corrected result and implementation scope. Existing deployments preserve their key ID/key; rotation is a separate action.                          |
| Workflow/Bake/Dockerfile/build graph/lock, APIs/proto/generated contracts, database schemas/seeders                    | Unchanged: no image build, wire/schema migration, cloud or tenant activation needed.                                                                                           |

Plan: patch only the release map and template comments, add the focused regression, verify
positive/negative actual Compose/schema probes, tooling and format/lint/link
gates. Runtime-only operator recreation remains separate and is not requested
while D2's local application deployment is pending.

Final receipt: the two existing production-template variables now reach Authority
through required release interpolation. Their original declarations and placeholder
values are preserved; a regression also rejects shadowing duplicate declarations.
Exact unchanged owner consumers include test/app-wiring.spec.ts and
test/authority-foundation.spec.ts. Their focused run passes two suites / four
tests without an integration startup hook. Source schema/backfill/key semantics
and real operator files are unchanged.

All twenty-two clean local/release schema cases pass. Removing either production
input from the owned snapshot fails on that exact required variable before
startup. Native/Compose precedence and unchanged-build-spec probes pass.
Tooling passes 83/83 under CI settings; scoped lint and Node syntax pass.
Formatting, relative-link and diff checks precede the final commit.

No SQL, API/RPC/protobuf/OpenAPI/generated consumer changed; previous preflight
remains applicable. No new image build is required by these runtime-only inputs.
The accepted Segment 3 image/CI proof remains tied to 7035545. A normal hosted
workflow after this authorized main push may validate the new config regression;
actual release server startup and operator runtime recreation remain pending,
not claimed by schema checks. D2 local deployment work is preserved.
Readiness: READY FOR CONFIGURATION/CI VALIDATION; no heavy local command needed.

Final checkpoint checks: Markdown formatting, all 98 relative links and diff checks pass. D2 evidence and adopted phase order are preserved. The Segment 4 runtime correction has 83 tooling passes, four focused Authority passes and twenty-two clean schema cases; only two required release mappings change and original template values remain intact. No image/compiler/API/SQL input changed. Hosted validation of the new configuration checkpoint is pending its normal main push; the recorded Segment 3 acceptance remains on 7035545.
