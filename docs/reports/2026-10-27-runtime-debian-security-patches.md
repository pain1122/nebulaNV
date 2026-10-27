# Runtime Debian security patch receipt

Requirement: retain the existing image-security gate while closing build-cleanup
Segment 3. Classification: confirmed fixable OS package findings in the pinned
runtime base, not an application-package finding or an optional OS replacement.

## Evidence and trace before implementation

Run 40470059781 (`94cd5ad`) passes complete quality, native boot, metadata upgrade,
F3 and all invoked live integration suites. Eleven images build in 101.5s combined
on a fresh builder using imported layers. Image scan then fails all eleven: each
has eleven blocking findings in libpcre2-8-0/perl-base, zero application-package
findings, and 57 unfixed Debian findings retained under the existing F9 policy.
The archive step has not run. Sanitized reports are under
`.ci-evidence/build-ci-cache/hosted-94cd5ad-live/.security-reports/`.

Current Dockerfile pins Node 22 Bookworm build/slim runtime indexes. Its shared
runtime apt layer refreshes package indexes and installs ca-certificates/openssl
but does not update the two affected inherited packages. No Node/OS-family or
security-policy replacement is necessary: update those packages in that same
runtime layer. Preserve all service-specific imports, Prisma and Sharp checks.

Authoritative verification (Oct 27): Debian records Bookworm-security fixes for
[PCRE2 CVE-2026-103111](https://security-tracker.debian.org/tracker/CVE-2026-103111)
at 10.42-1+deb12u2 and
[Perl CVE-2026-13221](https://security-tracker.debian.org/tracker/CVE-2026-13221)
at 5.36.0-7+deb12u4. Actual apt-cache policy in an owned, disposable container from
the existing Product image reports exactly those candidates from the existing
bookworm-security repository. Only package indexes were fetched; no package,
image, project volume or app container was changed by the probe. The first
non-root probe was correctly denied; the read-only repository check was repeated
as root only inside that disposable container, without mounts or env inputs.

| Exact owner / consumer inspected                                                         | Disposition                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker/backend.Dockerfile` runtime-base apt RUN                                         | Add libpcre2-8-0 and perl-base to the existing package install. Keep both immutable Node indexes, Node ABI, Bookworm family, package cleanup and npm/Corepack removal. No broad distro upgrade. |
| Same Dockerfile's eleven final runtime targets                                           | All inherit this shared correction. Retain each workspace import check, nine Prisma closures, Media Sharp/font path and commands. New image/runtime/scan/archive acceptance required.           |
| `scripts/backend.test.mjs` pinned runtime policy                                         | Require both explicit package updates in the runtime apt layer; preserve base-family/digest and existing security-policy assertions.                                                            |
| `scripts/backend.mjs` summarizeTrivyImageVulnerabilities/runBackendImageScans            | Unchanged: application findings and fixable Debian findings block; unfixed Debian reports remain F9-owned. No allowlist or threshold alteration.                                                |
| `.github/workflows/ci.yml`, `.github/backend-cache.hcl`, `docker-bake.hcl`               | Unchanged: all quality/live/scan/archive gates and cache scopes stay enabled. Compilation/dependency graphs unaffected; shared runtime packaging must rerun.                                    |
| `docs/architecture/testing-and-health.md` image policy                                   | Retain exact approved treatment; correct stale ten-image count to eleven.                                                                                                                       |
| `docs/current-focus.md`, `docs/ASAP-BUILD-CLEANUP.md`, `TODO-ALTERNATIVE.md`, CI receipt | Record green live tests and fresh-builder warm timing separately from pending patched-image/security/archive acceptance.                                                                        |
| Runtime APIs/proto/OpenAPI/generated clients/seeders/SQL/env and shared package sources  | Unchanged. Prior contract/preflight/SQL evidence remains applicable.                                                                                                                            |

The same-release security package updates are the narrow correction. Replacing
the OS, changing Node major, dropping scanner coverage or expanding F9 deferrals
would add compatibility/maintenance cost without fixing a separate requirement.
No such replacement is implemented or requested.

## Handoff receipt

All impact rows revisited: runtime apt list and the exact policy assertion are
updated; other listed consumers remain unchanged for their stated reasons.
Prettier, Node syntax, scoped lint and diff checks pass. All 82 tooling checks
pass, preserving the existing Trivy-policy regression. Actual Buildx Dockerfile
check completes without warnings; it performs no install/compiler RUN or image
export. COPY/context inputs did not change, so the earlier context proof remains
applicable. Actual apt candidate versions match both required fixes. Installed
patched package versions and patched image scans remain pending CI proof.

No application contract changed; prior 23-test preflight and SQL evidence remains
applicable. Native nine-owner Prisma deployment, full quality and live suites on
94cd5ad remain valid before this OS-layer change; repeat image/runtime/scan/archive
proof is required for the new packaged bytes. Local infrastructure/app state is
unchanged. No local migration, app recreation, image build, prune or volume action.

Fresh-builder cache evidence from 94cd5ad: all eleven image exports pass in 101.5s
combined. All dependency/generation/compilation RUNs restore cached outputs. A
shared runtime overlay and some import/Sharp smoke checks rerun (0.1-7.9s); this
is not an all-RUN-cache-hit claim. Earlier 111.1s local acceptance had all RUNs
cached. Host and BuildKit round trips are observed, but scan/archive acceptance
remains open. Existing Media optional DB suites remain skipped in the default
live command (two suites / eleven tests), not newly skipped by this change.

Next proof: authorized main CI using existing tests/security/image/archive gates.
Fetch/install/compilation caches should remain reusable; shared runtime package
installation and final image packaging must rerun. No forced local build command.
Readiness: READY FOR PATCHED RUNTIME/IMAGE-SCAN/ARCHIVE PROOF; Segment 3 remains open.
