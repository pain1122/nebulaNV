# F4 Batch 2 Exit Proof

Date: 2026-08-26

Historical amendment (2026-08-31): all Batch 2 persistence, denial, recovery,
and runtime evidence remains valid. The `Batch 3 Handoff` describes the former
platform-global target; under ADR-0014 it is default-realm
compatibility evidence. Identity policies and realm routing are additive, and
the F3 static registry remains primary until the corrected Batch 1R/3R/4 gates
close.

## Outcome

F4 Batch 2 is complete. Persistent tenant authority owns its dedicated schema,
default non-production registration graph, typed internal reads, auditable
mutation foundation, readiness, backup/recovery inventory, and independently
deployable runtime. The gateway remains on the frozen F3
`StaticApplicationRegistry`; this batch did not cut over traffic or weaken
independent Auth and domain authorization.

## Exit Decisions And Evidence

### Persistent resolution and denial

The read-only runtime-role `verify:batch2-exit` probe ran against the normal
development authority database after migration, seed, recovery, and restart
work. It:

- resolved all four default registrations;
- rejected an unknown handle;
- rejected a storefront origin against the admin application boundary;
- rejected an origin on a native registration;
- verified all four required migrations;
- verified one seed audit event and nine invalidation outbox events.

This probe uses the authority repository/service directly and does not call the
gateway. It therefore proves persistence resolution independently of the F3
static registry. The subsequently rebuilt authority container read the same
database and reported its exact migration set ready after restart.

### Recovery and deterministic state

- The disposable authority database verifier deployed all four migrations,
  reported current migration status, seeded as `CREATED`, reran as
  `ALREADY_CURRENT`, verified the exact graph/audit/outbox state, exercised
  database constraints and privileges, and removed the disposable database.
- The normal development database was advanced from the foundation migration
  to all four migrations and the same two-run seed result was observed.
- `test:database-recovery` passed a disposable binary
  dump/drop/recreate/restore cycle and failed-migration recovery including
  authority deploy/status.
- The inventory-derived backup manifest includes `nebula_authority`; the 39
  backend-tooling tests cover database selection and recovery safety.

The seed is create-only and fails closed on partial, revised, colliding, or
contradictory state. It does not silently repair an authority graph.

### Rebuilt runtime

Salar ran the reserved targeted Docker builds and authority-only container
recreates. The final image/runtime evidence was:

- Nest initialized `AuthClientModule`, `ClientsModule`, `AuthorityModule`, and
  `AppModule`;
- HTTP and gRPC listeners started and emitted `service_ready`;
- `GET /health/live` returned `status: ok`;
- `GET /health/ready` returned `status: ok` with
  `databaseMigration: ok` and `s2sReplay: ok`;
- Docker reported `healthy`, zero failing checks, and repeated successful
  health probes.

No full-repository image build was required for this closeout.

## Defects Found During Restart Proof

Three findings were confirmed defects, not architecture replacements:

1. `tenant_authority.proto` was missing from the Docker shared runtime
   artifacts. The image now copies it and the authority runtime target resolves
   the exact subpath during build, moving detection from startup to build time.
2. `GrpcTokenAuthGuard` was registered without its required `AUTH_SERVICE`
   client provider. The authority application now registers the same existing
   Auth gRPC client seam used by peer services. Auth retains session/token
   ownership; no JWT secret or validation authority moved into tenant authority.
3. The health controller lacked the existing `@OperationalHealth()` policy and
   S2S replay readiness probe. Health is anonymously probeable but sanitized;
   readiness now fails closed for either migration/database or replay-store
   failure.

One stale test assumption was also corrected: the shared Docker health test
expected nine literal probes. It now derives the count from the ten-service
repository inventory.

## Failure-Oriented Exit Review

| Concern             | Batch 2 result                                                                                                                                                                                                                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prevention          | Closed schemas and states, same-scope constraints, runtime least privilege, exact typed reads, signed caller policies, create-only deterministic seed, and atomic audit/outbox writes prevent request or partial seed data becoming authority.                                                           |
| Detection           | Exact-migration and replay readiness, Docker health, typed closed resolution statuses, content-free read errors, HMAC-chained audit, outbox evidence, and build/DI regression checks expose failure.                                                                                                     |
| Containment         | Authority has no public business HTTP API, JWT keys, cross-service database access, gateway cutover, membership grant, or final domain authorization power.                                                                                                                                              |
| Fail state          | Read/storage failure is `UNAVAILABLE`; bad or rolled-back migrations degrade readiness; unknown/missing seed returns no authority facts; contradictory seed/state refuses overwrite; denied mutations produce stable reasons and durable audit.                                                          |
| Recovery            | Administrator migration/restore plus deterministic seed rerun restores trusted state; the service can then restart and prove exact readiness. Static F3 registry remains primary only until the explicit Batch 4 cutover.                                                                                |
| Common-mode failure | Gateway compromise alone cannot write authority or replace Auth/domain checks. Authority database/operator corruption remains material, but closed reads, readiness, audit, and independent downstream authorization limit silent admission.                                                             |
| Evidence            | Four-migration disposable verifier; two-run seed; binary backup/restore and failed-migration recovery; runtime-role exit probe; rebuilt healthy container; 32 authority tests; 21 shared health-wiring tests; lint, types, Compose validation, backend-tooling, and Docker build-time import assertions. |
| Residual risk       | No live gateway/domain consumer uses persistent authority yet. Membership/grants and opaque authorization freshness belong to Batch 3; registry adapter/cutover and rollback belong to Batch 4.                                                                                                          |

## Batch 3 Handoff

Begin Batch 3 from the first unchecked item in `docs/current-focus.md`. Preserve
global identity/profile and Auth session/token ownership, introduce scoped
membership and roles only in tenant authority, and keep domain services as the
final resource/operation authorization owners. Do not switch the gateway from
the F3 static registry during Batch 3.
