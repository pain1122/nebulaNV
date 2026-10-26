# Media HTTP setup failure (2026-10-07)

Recorded before implementation changes. Salar's Media test:e2e run reported
nine passing suites, one failing HTTP suite, one skipped database suite:
101 passed, 20 failed, six skipped. Every HTTP failure points to line 18, the
first Auth login in beforeAll. These are a single setup failure propagated to
twenty tests, not twenty observed Media behavior defects. gRPC passed.

Inspection confirms all sixteen containers healthy. A focused, unchanged
HTTP health test passed locally, including both setup logins, in about six
seconds. The reported closed socket is intermittent; its precise transport
cause is not established and no service restart or architecture change is
justified. Confirmed test setup defect: readiness fetches return without
consuming response bodies. Both readiness and JSON requests lack individual
timeouts. Retained connections across setup/test delays are a plausible
contributor, not a proven root cause.

Narrow correction: consume readiness bodies, bound requests by the existing
readiness deadline, and close readiness/JSON helper connections for these
integration tests. Keep production clients and service settings unchanged.
Do not replay login or other writes after a transport failure, and do not
weaken HTTP/authorization assertions. Add focused helper tests for request
handling, HTTP errors and single-attempt transport failures. Salar runs the
full integration suite after focused validation. Preserve all earlier passing
processing, upgrade, recovery, D1 reference and F3 proofs. Batch A integration
sign-off remains open; Batch B image tools are next after this gate.

Correction checkpoint: readiness responses are consumed, readiness and JSON
helper requests close their test connections, and request timeouts are bounded
(readiness respects its existing overall deadline; JSON requests use ten
seconds). The focused real HTTP setup/login/health test and three helper
regression tests pass; the other nineteen HTTP cases were intentionally
excluded from this focused run and are not claimed passed. Helper tests retain
HTTP 403 and propagate a closed socket with exactly one write request.
Formatting and diff whitespace checks pass. No image rebuild is needed.
Focused lint reports no errors; existing JSON/helper/global-setup unsafe-type
warnings remain and are not represented as a warning-free result.
Salar should rerun `pnpm --filter @nebula/media-service test:e2e` once to verify
the full HTTP/gRPC behavior; preserve skipped database tests as skipped.

Container-cause follow-up at Salar's request: inspected Auth, User, Media and
Gateway restart counts, start times, reported OOM state and health history.
All report zero automatic restarts, OOMKilled=false, no current state error,
and healthy. Auth/User/Gateway have run since 2026-10-05; Media since its
intentional recovery restart on 2026-10-06. The retained health history covers
only recent checks, so it cannot exclude a brief outage at the failed request.
Logs from 09:35-09:39 Tehran (06:05-06:09 UTC) show healthy Auth/User/Media
responses; Auth completed two logins with HTTP 200 at 06:08:31 UTC for the
later passing gRPC setup. No application ERROR/FATAL/WARN appeared in the
inspected incident window. This provides no evidence of a container crash or
application exception. A host/Docker network interruption or stale connection
remains possible; the exact cause of the failed socket is still unresolved.
The test-helper corrections address observed connection-handling gaps and
must not be presented as proof that Docker was uninvolved.

## Passing full integration rerun

Salar supplied the passing rerun: eleven suites passed, 124 tests passed,
one suite/six tests skipped, no failures (21.5 seconds). HTTP and gRPC both
passed. The skipped suite is media-processing.database.spec.ts: deliberately
opt-in via MEDIA_PROCESSING_DB_PROOF=1 and restricted to a local disposable
nebula_media_verify_* database. It exercises concurrent job claims, expired
leases/stale completion, retry exhaustion, deletion/completion cleanup races,
blocked-upload fencing and distinct owner records for identical bytes.
The ordinary test:e2e command must not run these against operator/demo jobs.
The existing `pnpm db:verify:media` owner creates/migrates its disposable
database, invokes test:processing:db with its dedicated Jest configuration
and cleans the database. Six skipped tests are not counted as passed in this
integration run; retain the separately reported disposable-database evidence.
Batch A HTTP/gRPC integration sign-off is now satisfied. Batch B saved image
recipes is the next implementation slice; no further integration rerun or
image rebuild is required merely to remove the expected skip count.
