# F4 Batch 3R Execution Checklist

Date: 2026-09-01

Status: R0, R1, and R2 complete. R2 closed on 2026-09-08 with populated
old-schema upgrades, reruns, atomic rollback, earlier-seed regression, and
cleanup evidence. R3 Realm Auth shadow migration is next. Legacy readers and
traffic remain primary; the R1 control plane remains inactive.

## Execution Contract

Each item starts with its exact checklist wording, directly applicable ADR
clauses, current mechanisms, absence searches, and required proof. A first pass
may establish that implementation appears complete; only an adversarial second
pass covering clean order, reruns, contradictions, partial state, rollback, and
failure behavior may check the item. Every later stateful item reruns the
earlier migration/seed verifiers. Long builds, full Compose boot, complete e2e,
and scans remain user-run gates.

## R0_REBASELINE

### Evidence ledger

**Exact checklist wording:**

> `R0_REBASELINE`: start a new evidence ledger from current source, rerun the
> quick documentation gates and the existing clean disposable Tenant
> Authority/role-seed verifiers, and record that no corrective schema or
> runtime exists yet. R0 changes no data or traffic.

**Directly applicable decisions:**

- ADR-0015 status limits Batch 1R to architecture/documentation and authorizes
  no schema, migration, proto, runtime, key, session, federation, deployment, or
  traffic change.
- ADR-0015 `R0_REBASELINE` requires the ADR-0014/0015 supersession matrix,
  documentation consistency, and the existing clean Tenant Authority and role-
  seed verifiers before implementation. Its rollback is documentation-only.
- ADR-0015 orders R1-R11. In particular, R1 records remain non-admitting, R4
  issues no operator session, R5 receivers precede sessions/writers, R6
  activates only the default cohort, and R8 separately activates the operator
  cohort before the grant swap.
- ADR-0014 preserves the F3 gateway boundary, current Auth defenses, Tenant
  Authority, typed clients, signed S2S, service-owned databases, and independent
  domain authorization while superseding only platform-global identity/session
  assumptions.

**Current mechanisms inspected:**

- `apps/tenant-authority-service/prisma/schema.prisma` currently owns Tenant,
  Site, Application, Membership, immutable MembershipEpoch, tenant/site grants,
  PlatformGrant, and the 48-character HMAC-derived `membershipEpochRef`.
- Tenant Authority currently has five migrations, ending at
  `20260826000200_membership_authority_foundation`; User-service has two,
  ending at `20260801150000_remove_legacy_user_refresh_token`.
- `apps/user-service/prisma/schema.prisma` still has one global User row with
  unique email/phone, password hash, and free-string role. Auth-service has no
  Prisma directory.
- `packages/protos/auth.proto`, the typed Auth client, and gateway source still
  expose the split `ValidateUser` then `GetTokens(userId)` login path.
- Auth still preserves token version, hashed refresh-session state, atomic
  Redis rotation/replay containment, current/all logout, live session checks,
  and HMAC-derived `sr1_` session references.
- Gateway still resolves through `StaticApplicationRegistry`; strict current
  S2S/context-v2 compatibility code remains in `@nebula/grpc-auth`.

**Absence evidence:**

The following exact source scopes were searched together:

- `apps/tenant-authority-service/prisma/schema.prisma`
- `apps/user-service/prisma/schema.prisma`
- `packages/protos`
- `packages/grpc-auth/src`
- `packages/clients/src`
- `apps/auth-service/src`
- `apps/gateway/src`
- `apps/tenant-authority-service/src`

The search terms were `IdentityRealm`, `IdentityProviderRegistration`,
`ApplicationIdentityPolicy`, `FederationTrust`, `credentialGeneration`,
`sessionGeneration`, `LegacySessionBridge`, `RootSsoExchangeGrant`,
`authRouteRef`, `rsg1_`, `sr2_`, `ar2_`, and `identityRealmId`. The result was
zero matches. Therefore no ADR-0015 corrective schema, proto, or runtime
identifier exists in these inspected source boundaries at R0; this is a current
source result, not a claim from memory.

**Verifier safety inspected before execution:**

- `db:verify:tenant-authority` scopes `verifyCleanMigrations` to Tenant
  Authority, creates a random `_verify_` database from `template0`, deploys and
  checks current migrations, runs seed twice, executes registration/default-
  seed SQL evidence, and drops the disposable database.
- `db:verify:f4-batch3-role-seeds` creates disposable User and Tenant Authority
  databases, deploys current migrations, repeats seeds/backfill/fixtures,
  adversarially reruns earlier steps, executes both SQL verifiers and actor-
  resolution proof, then drops both databases.
- The shared deletion guard refuses to drop a database whose name does not
  contain `_verify_`. Neither command builds images or boots the backend stack;
  both require only the already-running local PostgreSQL container.

**Required R0 proof:**

1. Governing/current F4 documentation formats cleanly, all relative links
   resolve, Batch 1R has no unchecked item, and ADR-0015/current-focus contain
   the complete ordered R0-R11 gates without stale open/alternative wording.
2. Both approved clean disposable database verifiers pass from current source
   and clean up their temporary databases.
3. A second source search still finds no corrective R1+ identifiers after the
   gates; R0 itself changes no schema, runtime, data, or traffic.
4. The classified starting point and exact next R1 boundary are recorded before
   R0 is checked.

### Finding classification

| Finding                                                                                               | Classification                               | R0 treatment                                                                  |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------- |
| ADR-0015 corrective records/runtime are absent                                                        | Expected planned state, not a new defect     | Record the evidence; do not implement them during R0.                         |
| Split gateway login remains in current source                                                         | Confirmed defect already frozen by ADR-0015  | Preserve as baseline evidence; replace only at ordered R6 after R5 receivers. |
| Current Auth rotation, replay, logout, and live-session checks exist                                  | Preserved mechanism                          | Reuse inside Realm Auth; do not replace during R0.                            |
| Current Tenant Authority registrations, memberships, grants, epochs, `meg1_`, audit, and outbox exist | Preserved mechanism                          | Require clean migration/seed/rerun proof before R1.                           |
| Publisher transport is not selected                                                                   | Deliberately deferred R11 runtime selection  | It does not change R1 ownership/schema and is not selected during R0.         |
| Per-realm HA, failover, and load/soak infrastructure is absent                                        | Future F9 production-readiness consideration | Do not claim or implement it in R0.                                           |

### First completion pass

Completed 2026-09-01 from current source:

- Focused Prettier and `git diff --check` passed for the seven governing F4
  context, roadmap, ADR, current-focus, rebaseline, and execution-ledger files.
  A strict relative-Markdown-link check resolved every local target, the Batch
  1R report contained no unchecked item, and ADR-0015's R0-R11 parent gates plus
  current-focus's R6.1-R6.3 implementation sub-gates were present in order.
- `pnpm db:verify:tenant-authority` created a guarded disposable Authority
  database, deployed all five current migrations, reported current status,
  exercised the rolled-back constraint proof, and proved seed `CREATED` then
  `ALREADY_CURRENT` before cleanup.
- `pnpm db:verify:f4-batch3-role-seeds` created clean disposable User and
  Authority databases, deployed the current two/five migrations, ran the
  preserved seeds and backfill/fixture order with deliberate reruns, and passed
  its SQL and actor-resolution/denial evidence before cleanup.
- The post-gate source search across every scope named above again returned no
  R1+ identifier. PostgreSQL reported no remaining `_verify_` database.

### Adversarial second pass

Completed 2026-09-01:

- The two database gates started from `template0`, so success did not depend on
  historical local data. Their internal reruns proved idempotence after the
  later role fixture/backfill steps rather than only the initial seed order.
- Documentation was checked as two related sequences: ADR-0015 correctly owns
  the atomic `R6_DEFAULT_REALM_AUTH_V3_CUTOVER` parent gate, while
  current-focus deliberately divides that same frozen decision into R6.1,
  R6.2, and R6.3 proof checkpoints. No design clause is missing or reordered.
- Two preliminary wrapper results were discarded rather than counted: one
  PowerShell invocation passed the Prettier paths as one argument, and one
  over-strict ordering probe incorrectly required the current-focus R6 sub-gate
  names in the ADR parent table. Corrected strict commands then passed.
- The cleanup query found no disposable database. R0 has no partial data or
  traffic state to recover; rollback is limited to these documentation entries.
  The exact next boundary remains R1's inactive, non-admitting control-plane
  records, with no credential, provider secret, session, endpoint, private key,
  runtime consumer, or registry cutover.

### Completion

- [x] R0 rebaseline evidence and both completion passes are complete.

## R1_CONTROL_PLANE_UNUSED

### Evidence ledger

**Exact checklist wording:**

> `R1_CONTROL_PLANE_UNUSED`: persist `IdentityRealm`, provider public/trust
> metadata, ApplicationIdentityPolicy, and FederationTrust in Tenant
> Authority with exact owner/lifecycle/uniqueness/audit/outbox constraints.
> Seed one reviewed UUID manifest containing inactive default/operator
> realms and local providers, four draft policies, four pending default-
> local trusts, and one pending admin-web operator trust. Store no provider
> secret, credential hash, raw session, endpoint, or private signing key;
> every new record remains non-admitting and traffic stays static.

**Directly applicable decisions:**

- ADR-0015's closed vocabularies fix realm kind, principal class, provider
  kind, realm/provider/policy/trust lifecycle, login mode, and trust mode. The
  non-active states used by R1 cannot admit a login, session, or trust decision.
- The ADR-0015 owner matrix places all four records in Tenant Authority. It
  requires immutable realm owner/root/default/route identity; provider metadata
  without secrets; one current versioned policy per application; and an exact
  application/policy/realm/provider/principal/audience/mode trust tuple with no
  parent-edge or public-client inference.
- ADR-0015 R1 requires one additive seed while preserving every Batch 2 UUID,
  application registration, handle, audit/outbox row, and the static gateway
  registry. Audit/outbox actor/subject v2 fields remain ordered R2 work; R1 uses
  the existing append-only audit and immutable outbox for its non-actor seed.
- ADR-0014 preserves Auth, signed S2S, typed clients, independent domain
  authorization, and service-owned databases. None receives an R1 realm reader,
  contract, context field, session, or traffic path.

**Current mechanisms inspected:**

- Tenant Authority's five migrations already enforce lowercase UUIDv4 record
  identity, owner-scope foreign keys, lifecycle/immutability guards, revision
  advancement, append-only HMAC-chained audit, immutable outbox payloads, and
  removal of runtime hard-delete privileges.
- The existing reviewed `DEFAULT_DEVELOPMENT_AUTHORITY` manifest owns the stable
  tenant/site/channel/application UUIDs. Its base seed is serializable,
  advisory-locked, create-only, audited, outboxed, idempotent on exact state,
  conflict-denying on partial/contradictory state, and production-refusing.
- The clean migration verifier applies every migration to `template0`, runs
  rolled-back constraint evidence, runs the development seed twice, verifies
  exact rows, and cleans its guarded `_verify_` database. The preserved role
  verifier repeats the User/Authority seed/backfill order adversarially.
- Gateway still uses `StaticApplicationRegistry`; Auth still owns the legacy
  unqualified session path. These mechanisms remain primary throughout R1.

**Absence evidence:**

The R0 post-gate search covered Authority/User schemas, protos, grpc-auth,
typed clients, Auth, gateway, and Authority runtime source for
`IdentityRealm`, `IdentityProviderRegistration`,
`ApplicationIdentityPolicy`, `FederationTrust`, `identityRealmId`, `sr2_`, and
`ar2_` and returned no match. Focused searches of the Authority migrations,
manifest, seed, repository/service/controller source, tests, database evidence
scripts, and backend verifier found no alternative realm/provider/policy/trust
table, seed, read API, activation workflow, or runtime consumer. R1 therefore
adds rather than replaces these records; no negative claim is based on memory.

**R1 implementation boundary:**

1. Extend the existing reviewed development manifest without changing any
   Batch 2 UUID. Add two realm IDs plus immutable non-public route references,
   two local-provider IDs/references, four policy IDs/audiences, and five trust
   IDs.
2. Add only the four Tenant Authority models and their closed enums. Database
   checks/triggers own UUID shape, owner topology, immutable identity,
   lifecycle/revision transitions, one non-revoked operator realm, one
   non-revoked root default, current policy cardinality, non-empty exact policy
   sets, provider/realm consistency, trust tuple uniqueness, and structural
   realm/application eligibility.
3. Run a separate serializable, advisory-locked, create-only R1 seed after the
   preserved base seed. It must either find the exact complete R1 state or
   create all 13 control records plus minimized audit/outbox evidence in one
   transaction; partial or contradictory state fails closed.
4. Seed realms as `PROVISIONING`, providers/trusts as
   `PENDING_VERIFICATION`, and policies as current `DRAFT`. Use non-routable
   local-provider references, exact per-application audiences, and no secret,
   credential, session, endpoint, key, email/phone, or domain authorization
   field.
5. Add no proto, client, repository/service/controller reader, Auth/gateway
   integration, registry replacement, context field, session, operator grant,
   actor backfill, or traffic change.

**Required R1 proof:**

1. Prisma formatting/validation/generation and focused schema/manifest/seed
   tests pass; a source boundary test proves no runtime import or route consumes
   the new records.
2. A clean disposable Authority database applies all migrations and rejects
   wrong owner/default/route, duplicate current policy/trust, empty or
   contradictory policy sets, provider/realm mismatch, invalid lifecycle
   reversal, identity rebinding, deletion, and runtime hard delete.
3. Two current-source seed runs produce `CREATED` then `ALREADY_CURRENT`; exact
   SQL evidence finds 2/2/4/5 inactive records, their 13 immutable outbox facts,
   one seed audit, no forbidden column/name/value, and no active admitting row.
4. The preserved clean role-seed verifier still passes after R1. No `_verify_`
   database remains, the existing IDs/history are unchanged, and static gateway
   routing plus current Auth traffic remain the only active path.
5. The adversarial pass evaluates clean order, rerun after later seed steps,
   partial/contradictory manifest state, rollback/removability, owner/provider/
   audience mismatch, common-mode configuration, failure behavior, and residual
   R2+ risk before R1 is checked.

### Finding classification

| Finding                                                       | Classification                           | R1 treatment                                                             |
| ------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------ |
| Realm/provider/policy/trust persistence is absent             | Expected planned R1 state                | Add the frozen inactive control-plane records only.                      |
| Existing gateway/Auth cannot consume realm records            | Preserved compatibility boundary         | Keep it unchanged; absence of an R1 reader is required containment.      |
| Existing seed is exact-state, audited, and conflict-denying   | Preserved mechanism                      | Reuse its transaction pattern in a separate additive R1 seed.            |
| Audit/outbox v1 lacks realm-qualified actor fields            | Ordered future R2 work, not an R1 defect | Emit only a non-actor control-plane seed fact; never rewrite v1 history. |
| Provider endpoints/secrets and realm Auth stores do not exist | Expected later R3/federation placement   | Do not add them to Tenant Authority.                                     |
| Physical realm HA/load/failover proof is absent               | Future F9 scaling consideration          | R1 claims only inactive control-plane durability.                        |

### First completion pass

Completed 2026-09-05 from current source:

- Added the four frozen Tenant Authority aggregates and closed enums to Prisma
  plus additive migration
  `20260901000100_identity_control_plane_unused`. Database checks, foreign
  keys, partial/exact uniqueness, deferred cardinality checks, immutable
  identity triggers, lifecycle/revision guards, retained-row triggers, and
  runtime-role `DELETE` revocation enforce the R1 structural boundary.
- Extended the one reviewed default-development manifest without changing a
  Batch 2 tenant/site/channel/application/client UUID. It now fixes two realm
  IDs and route references, two local-provider IDs and issuer references, four
  policy IDs/audiences, and five trust IDs.
- Added a separate serializable, advisory-locked, create-only,
  production-refusing identity-control-plane seed. It creates all 13 inactive
  records plus 13 revision-1 outbox facts and one HMAC-chained non-actor audit
  event in one transaction, returns `ALREADY_CURRENT` only for the exact
  complete bootstrap state, and rejects partial or contradictory state before
  writing.
- Prisma validation and generation passed. All 15 Tenant Authority suites (64
  tests) passed, including manifest shape, create-only/production refusal,
  partial-state rollback, and absence of Authority runtime wiring. Tenant
  Authority lint and type checking passed; Prisma and focused Prettier
  formatting passed.
- A post-implementation source search found no control-plane model/read
  reference in Auth, gateway, protos, typed clients, grpc-auth, or Tenant
  Authority runtime outside the reviewed manifest/seed. No proto, client,
  controller, repository, context carrier, registry change, or traffic switch
  was added.
- `pnpm db:verify:tenant-authority` passed from a random `template0` database:
  all six migrations applied, the rolled-back SQL constraint suite passed,
  seed runs returned `CREATED` then `ALREADY_CURRENT`, and exact SQL found the
  required 2/2/4/5 non-admitting rows, 13 pending outbox facts, one seed audit,
  and no forbidden control-plane column.
- `pnpm db:verify:f4-batch3-role-seeds` then passed from clean disposable User
  and Authority databases after the final R1 lifecycle-constraint edit. It
  reapplied all migrations, exercised the User/Authority/role seed orders and
  reruns, retained `ALREADY_CURRENT` for R1 after the later role steps, and
  passed the preserved exact-role SQL and resolution/denial evidence. A direct
  PostgreSQL query found no remaining `_verify_` database.

Two preliminary wrapper results were discarded rather than counted: Prisma
validation was first invoked from the repository root without a service
`DATABASE_URL`, and Prettier was first asked to parse a Prisma schema it does
not support. The corrected validation used a non-secret validation-only URL;
Prisma formatted its schema and Prettier checked only supported files.

### Adversarial second pass

Completed 2026-09-05 after the first pass:

| Review dimension    | R1 evidence and decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prevention          | Closed enums and non-active seed states prevent admission. Owner-shape and direct-parent checks, application/realm/provider foreign keys, provider-realm and policy-capability checks, exact trust uniqueness, one non-revoked operator, one non-revoked root default, and one current policy per application prevent ambiguous topology. Immutable identity and monotonic lifecycle/revision triggers prevent rebinding or reversal.                                                                                                                   |
| Detection           | Exact-state seed inspection detects partial records, alternate IDs/routes/issuers, extra current policies/local providers, conflicting trusts, missing outbox/audit, or changed bootstrap state. The SQL verifier rejects wrong owner/default/route, duplicate policy/trust, empty policy sets, provider/realm mismatch, activation with inactive dependencies, terminal lifecycle reversal, deletion, and runtime hard delete.                                                                                                                         |
| Containment         | The four aggregates exist only in Tenant Authority. No runtime reader, proto, typed client, Auth/gateway integration, context field, or application-registry replacement exists. Static gateway routing and legacy Auth remain the only traffic path, so corrupt R1 rows cannot admit a login or session.                                                                                                                                                                                                                                               |
| Fail state          | Production seeding is refused. Partial or contradictory seed state throws inside one serializable transaction. Invalid topology/lifecycle writes fail at PostgreSQL. Missing audit signing or any create failure rolls back the complete seed; no fallback infers trust from a client value, parent relationship, issuer label, or network location.                                                                                                                                                                                                    |
| Recovery/rollback   | R1 has no traffic or session to drain. Before R2, rollback is limited to a forward removal of the proven-unused four tables, their R1-only guards/indexes/functions/enums, after repeating the no-consumer search. Existing Batch 2 IDs/tables and generic append-only audit/outbox history remain intact. Once R2 references these records, this rollback is no longer permitted and ADR-0015’s later forward-recovery lines apply. No destructive rollback was run against the working database.                                                      |
| Common-mode failure | One reviewed manifest supplies the base and R1 fixture, and one database transaction creates all records. Stable independent UUIDs, database uniqueness, exact-state comparison, HMAC audit, and all-or-nothing commit make accidental overlap detectable, but a wrongly reviewed manifest can affect the whole development fixture. Review of the manifest and clean SQL evidence remain mandatory.                                                                                                                                                    |
| Evidence            | Prisma validation/generation, 64 focused tests, lint/types/format, the no-consumer source search, both clean disposable database verifiers, exact SQL, adversarial seed ordering, and cleanup query all passed from current source.                                                                                                                                                                                                                                                                                                                     |
| Residual risk       | R1 deliberately has no admission runtime. R2 must add realm-qualified actors; R3 adds isolated Realm Auth; R5 adds dormant receivers; R6 alone may activate the default cohort. Future mutation services must write lifecycle, revision, audit, and outbox atomically. The exact bootstrap seed will intentionally conflict rather than reset an evolved development database after activation or outbox dispatch, so the later gate must version its lifecycle verifier instead of weakening this R1 check. Physical HA/load/failover remains F9 work. |

The second pass found no confirmed R1 defect. The Prisma 7 package-config
deprecation warning is a future toolchain-maintenance consideration, not a
failure of this migration. The future activation/verifier behavior and F9
physical-resilience proof are recorded residual obligations, not claims that
R1 provides them.

### Completion

- [x] R1 inactive control-plane implementation and both completion passes are
      complete.

## R2_DEFAULT_ACTOR_BACKFILL

### Evidence ledger

**Exact checklist wording:**

> `R2_DEFAULT_ACTOR_BACKFILL`: add realm-qualified Membership,
> PlatformGrant, and domain actor references while preserving Membership
> IDs, immutable epochs, HMAC-derived epoch refs, grants, audit, and the
> current default seed. Backfill every legacy user into the deterministic
> default realm and prove idempotent reruns/rollback. Do not remove a bare-
> global column/reader or rewrite historical audit/outbox payloads here.

**Directly applicable decisions:**

- ADR-0015 defines human identity as the pair `(identityRealmId, subjectId)`.
  Its owner matrix requires nullable pairs beside existing legacy actor/owner
  columns during migration, both-null-or-both-set constraints, and the current
  UUID as the default-realm subject. It forbids email/provider inference and an
  opaque-wrapper alternative.
- `Membership` preserves its ID, tenant, state, current epoch, revision, epoch
  history, grants, and `meg1_`; its additive target uniqueness is
  `(tenantId, identityRealmId, subjectId)`. `PlatformGrant` gains the same actor
  coordinate, but the legacy customer-realm platform grant remains in place
  until the separate R8 operator swap.
- Domain owners keep their own databases and local resource checks. R2 adds
  realm/subject columns beside current actor IDs; it does not add tenant/site
  scope, context v3, a new authorization lookup, or a cross-service foreign
  key.
- Authority audit/outbox v1 history is immutable. R2 adds a new version that
  can carry a privacy-minimized realm/subject pair; it never rewrites or
  re-signs an existing payload/hash.
- ADR-0015 keeps current readers and traffic primary. Additive actor columns
  may be removed only before any Realm Auth session, v3 writer, or second-realm
  write; R3 and later require forward recovery.

**Entry mechanisms inspected (before R2 implementation):**

- Eight non-generated Prisma schemas were discovered and searched explicitly.
  Persisted human actor/owner columns exist only in Tenant Authority
  (`Membership.userId`, `PlatformGrant.userId`,
  `AuthorityAuditEvent.actorUserId`), Media (`Media.ownerId`), Order
  (`Order.userId`, `Cart.userId`), and Product
  (`ProductComment.userId`). Blog, Settings, and Taxonomy have no persisted
  human actor/owner field. User is the current identity/profile source rather
  than a domain actor reference.
- Tenant Authority currently has six migrations; Media has four, Order one,
  and Product two. None has a default-actor backfill migration.
- Membership/PlatformGrant, epoch/grant, role-import, seed, resolver, audit
  chain, and outbox mechanisms are already implemented. Current membership
  uniqueness is `(tenantId, userId)`; current platform identity is `userId`.
  Authority audit/outbox version columns exist, but no realm-qualified actor
  columns or v2 writer exists.
- Current Media, Order, and Product runtime code reads/writes only the legacy
  `ownerId`/`userId`. That behavior remains primary in R2; the new columns are
  migration facts, not authorization inputs.
- Existing clean database tooling can apply every service migration from
  `template0`, while the guarded Authority/role verifier preserves exact
  membership IDs, epochs, grants, and `meg1_`. R2 additionally needs an
  old-schema fixture path because an empty latest-schema database cannot prove
  backfill of pre-existing actor rows.

**Entry absence evidence (before R2 implementation):**

The explicit schema search covered all eight non-generated
`apps/*/prisma/schema.prisma` files for `userId`, `ownerId`, `actorUserId`,
`createdBy`, `updatedBy`, `authorId`, `customerId`, `buyerId`, `sellerId`,
`identityRealmId`, and `subjectId`. A second source/migration search covered
Tenant Authority, Media, Order, and Product while excluding generated output.
Only R1 provider/trust realm fields existed; no Membership/PlatformGrant,
audit/outbox, Media, Order/Cart, or ProductComment realm-qualified actor pair,
backfill command, migration, or reader was found. The first wildcard command
was invalid on Windows and is discarded; the replacement enumerated all
schema paths before making this negative claim.

**R2 implementation boundary:**

1. Add nullable `identityRealmId` plus `subjectId` beside each listed legacy
   actor/owner field. Domain databases use no cross-service foreign key;
   Tenant Authority may reference its local `IdentityRealm`. Optional actor
   pairs must be both null or both set, and a populated legacy actor maps only
   to the deterministic default-realm UUID plus the same canonical UUID
   subject.
2. Add partial realm-qualified uniqueness/indexes needed beside—not instead
   of—the current Membership, PlatformGrant, Media, Order/Cart, and comment
   access paths. Do not remove or reinterpret a legacy column/index/reader.
3. Backfill only existing persisted actor references in each owning database.
   R2 does not copy the User directory into Tenant Authority or move
   credentials/profiles; R3 owns Realm Auth subject and credential migration.
4. Add nullable Authority audit/outbox realm+subject fields with strict
   v1-versus-v2 pair/version checks. Emit only new v2 backfill evidence; retain
   every existing event, payload, HMAC, ID, sequence, and revision byte-for-
   byte.
5. Add no Realm Auth store, session, token, issuer, key, proto/context writer,
   target authorization change, domain tenant/site scope, or traffic switch.

**Required R2 proof:**

1. Prisma format/validation/generation plus focused schema/migration tests pass
   for Authority, Media, Order, and Product. Current service readers/writers
   remain legacy-primary and no context-v3 or realm-session dependency appears.
2. A guarded disposable verifier installs each exact pre-R2 migration set,
   inserts valid legacy actor fixtures plus malformed/partial contradiction
   cases where representable, applies current R2 migrations, and proves exact
   deterministic pairs without changing legacy IDs or business fields.
3. Rerunning each owner backfill writes nothing; a mismatched realm/subject,
   half pair, malformed legacy UUID, or wrong default-realm owner fails closed
   and cannot leave partial rows. Optional anonymous owner/comment pairs remain
   all-null.
4. Existing Authority audit/outbox rows and hashes remain byte-identical. New
   v2 evidence carries only the deterministic realm/subject coordinate and
   bounded counts/digests, never email, profile, credential, token, raw
   session, or membership generation.
5. The preserved clean Tenant Authority and role-seed verifiers plus affected
   service migration tests pass after R2. No disposable database remains.
   Rollback removes only unused additive pairs/indexes/version support before
   R3; no epoch, `meg1_`, grant, historical event, or legacy actor column is
   regenerated or deleted.

### Finding classification

| Finding                                                                                | Classification                                | R2 treatment                                                                          |
| -------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------- |
| Persisted domain and Authority actors still use bare default-population UUIDs          | Confirmed unmet revised F4 requirement        | Add the frozen nullable pair and deterministic backfill; keep legacy readers primary. |
| Existing Membership IDs, epochs, `meg1_`, grants, and role resolution pass clean proof | Preserved mechanism                           | Change no ID, epoch, HMAC input/key, grant, or current resolver meaning.              |
| Existing audit/outbox rows have only v1 actor meaning                                  | Compatibility constraint, not corrupt history | Add v2-capable columns/writers; never rewrite v1 rows or hashes.                      |
| User/Auth still own the legacy identity/session population                             | Preserved migration source                    | Do not duplicate credentials, profiles, token state, or sessions during R2.           |
| Domain schemas still lack tenant/site scope                                            | Confirmed later F4 requirement                | Do not silently combine Batch 5-7 scope migrations with this actor-only gate.         |
| Realm Auth subjects/credentials and v3 context are absent                              | Expected R3/R5 state                          | Keep absent in R2; their absence preserves rollback.                                  |
| Physical multi-realm HA/load/failover is absent                                        | Future F9 production-readiness consideration  | No R2 claim or implementation.                                                        |

### First completion pass

Completed 2026-09-08. Implementation evidence:

- The four `20260905000100_default_actor_backfill/migration.sql` files in
  Tenant Authority, Media, Order, and Product add nullable realm/subject pairs,
  local indexes, compatibility triggers, and conditional backfill inside
  explicit transactions. Authority alone has local IdentityRealm foreign keys.
  The deterministic realm is `b1000000-0000-4000-8000-000000000001`; the subject
  preserves the legacy UUID. Anonymous Media and ProductComment actors stay null.
- `authority-audit.repository.ts` has a separate v2 writer. The v1 writer
  returns only `id`, allowing the current seed to execute before R2 columns
  exist without changing its payload or signing input.
- `default-actor-backfill.ts` and `prisma/backfill-f4-default-actors.ts` record
  bounded v2 evidence under a serializable transaction and advisory lock.
  Contradictory pairs, invalid default-realm ownership/lifecycle, and partial
  evidence fail closed. Exact reruns write nothing.
- `scripts/backend.mjs` exposes `database verify-f4-r2-default-actors` through
  root script `db:verify:f4-r2-default-actors`. Its twelve SQL fixture/check
  files install frozen pre-R2 migration sets, save legacy rows, exercise the
  upgrade or expected failure, and clean only tracked disposable databases.
  SQL travels through stdin to `psql --file=-`.

Executed proof:

| Gate                             | Result                                                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Four affected Prisma schemas     | Format, validation, and client generation passed.                                                                   |
| Authority tests                  | All 17 suites / 79 tests passed; the changed test helper was rechecked with all 9 default-actor tests passing.      |
| Authority lint and types         | Passed after correcting three test-only lint errors.                                                                |
| Backend tooling                  | All 50 tests passed; syntax and supported source formatting checks passed.                                          |
| `db:verify:f4-r2-default-actors` | Four populated upgrades plus two atomic rollback databases passed.                                                  |
| `db:verify:tenant-authority`     | Seven migrations, rolled-back constraints, and seed `CREATED` / `ALREADY_CURRENT` passed.                           |
| `db:verify:f4-batch3-role-seeds` | Clean User/Authority order, earlier seeds/imports, exact roles, resolver proof, actor evidence, and cleanup passed. |
| `db:verify:migrations`           | All eight Prisma services passed clean migration deployment/status and applicable Authority checks.                 |

The Authority upgrade starts with exactly six pre-R2 migrations and the current
R1/default seed. Its fixture preserves two memberships, three epochs including
a closed epoch, HMAC-derived `meg1_` references, tenant/site grants including
retained revoked history, and one PlatformGrant. Complete legacy-row snapshots
include the control-plane graph and v1 audit/outbox payloads and hashes. Two
actor-evidence executions, an earlier-seed rerun, and a third evidence execution
leave those snapshots unchanged and produce exactly three v2 outbox facts and
one v2 audit. Media, Order, and Product start with exactly four, one, and two
pre-R2 migrations respectively and prove unchanged business rows and zero-row
conditional backfill reruns.

The extended role-seed verifier separately captures the latest-schema graph
before its three actor-evidence executions around the earlier Authority seed.
All four Membership pairs and the PlatformGrant pair are exact; IDs, epochs,
grants, and v1 history remain unchanged. Exactly five v2 outbox facts and one
v2 audit exist, with bounded payloads excluding sensitive fields and membership
generation.

### Adversarial second pass

Completed from current source on 2026-09-08. The final six-database rerun used
suffix `ddd25b097184`, passed every case, and reported all six databases removed.

| Challenge                          | Evidence and result                                                                                                                                                                                                                                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Half-pairs and contradictions      | SQL checks reject both partial-pair directions, wrong realms, mismatched subjects, actorless pairs, and malformed/noncanonical ProductComment UUIDs. New legacy-only domain inserts still receive the exact default pair.                                                                |
| Audit/outbox versions              | Direct SQL rejects partial actors, wrong realms, mismatched audit legacy actors, and realm-bearing v1 facts. Exact actor-bearing v2 probes succeed inside a rolled-back transaction. Historical audit updates and outbox actor rewrites reject.                                          |
| Missing default realm              | Authority migration requires `authority_default_actor_realm_missing`; a fresh connection sees unchanged rows and the exact pre-R2 public columns, constraints, indexes, function bodies, and triggers.                                                                                   |
| Malformed legacy text actor        | Product migration requires `product_comment_legacy_user_id_invalid`; schema catalog and row snapshots prove complete transactional rollback.                                                                                                                                             |
| Partial evidence and invalid realm | Focused writer tests reject outbox-only/audit-only evidence and missing, wrong-owner, or revoked default realms before writes. The v2 signing test includes actor coordinates and the previous hash.                                                                                     |
| Tool failure and cleanup           | Tooling tests cover partial database creation, unexpected SQL success/error, misleading error prefixes/stdout, failed cleanup, and refusal to drop ordinary database names. Every created database gets a cleanup attempt; simultaneous verification/cleanup failures are both reported. |
| Earlier stateful gates             | Both earlier Authority/role-seed verifiers and the complete migration verifier passed after R2.                                                                                                                                                                                          |
| Final inventory                    | Salar ran `SELECT count(1) FROM pg_database WHERE datname LIKE '%verify%';` and reported `0`. The earlier Markdown-altered query was not counted as evidence.                                                                                                                            |

Confirmed defects corrected during the two passes:

- **Confirmed defect:** SQL pair checks could evaluate to `NULL` for partial
  actors, which PostgreSQL permits in a CHECK constraint. The disposable
  audit/outbox denial case reproduced this before explicit non-null predicates
  corrected all four migrations. Existing Membership/domain triggers were
  already rejecting partial pairs.
- **Confirmed defect:** the current Prisma client's default v1 audit return
  selection requested new columns on the pre-R2 schema. Selecting only `id`
  restored the older seed without changing v1 history or signing behavior.
- **Confirmed defect, repaired before this continuation:** missing explicit
  migration transactions and unconditional backfills. Current rollback and
  zero-row rerun evidence verifies their correction.
- **Stale verifier assumption:** the older Authority verifier created a
  Membership before the default realm. Its rollback-only realm fixture now
  satisfies the compatibility trigger's local foreign key; the verifier passes.
- **Confirmed verifier defects:** the new snapshot comparison initially
  stripped R1 provider/trust fields, and the rollback fixture initially used
  an active tenant without its required primary site. Scoped comparisons and
  a provisioning tenant corrected these fixtures. Failed diagnostic runs were
  cleaned and were not counted as successful proof.

Boundary search evidence: the exact patterns `identityRealmId`, `subjectId`,
`sr2_`, `RealmSubject`, and `AuthSession` returned no matches in TypeScript under
`apps/media-service/src`, `apps/order-service/src`, `apps/product-service/src`,
`apps/auth-service/src`, and `apps/gateway/src` (generated output excluded).
The Authority source search confines actor-pair use to the migration evidence
writer and audit-v2 support alongside R1 seed metadata. The domain-reader
regression test also passed. These searches support the preserved legacy
runtime boundary; they do not claim any later realm/session gate is implemented.

Recovery proof here is rollback of failed transactional migrations in disposable
databases. No working database was downgraded. Removal of unused additive fields
is permitted only before any v3 writer, Realm Auth session, or second-realm
write under ADR-0015. Full builds, image builds,
Compose boot, full e2e, scans, and production HA/load proof were not run; they
remain outside this R2 verification scope.

### Completion

- [x] R2 default-actor backfill implementation and both completion passes are
      complete, with the implementation, focused tests, disposable database
      evidence, earlier-gate regressions, and user-confirmed cleanup above.
      Next: R3's evidence ledger and frozen Realm Auth shadow migration.
