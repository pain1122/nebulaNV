# F4 Batch 3 Execution Checklist

Date started: 2026-08-26

Batch 2 is closed by
`docs/reports/2026-08-26-f4-batch2-exit-proof.md`. Batch 3 proceeds in the exact
order in `docs/current-focus.md`; this log does not combine later role
migration, seeding, authorization, freshness, audit, or denial items.

Historical amendment (2026-08-31): items 1-4 remain valid implementation and
clean-database evidence for the default realm. ADR-0014 supersedes their bare
platform-global actor/session target; Batch 1R and corrective Batch 3R in
`docs/current-focus.md` must close before item 5 continues. This report's
recorded commands/results are not retroactively changed.

## Item 1 - Separate Global Identity From Scoped Membership

Status: complete on 2026-08-26; reaffirmed by the 2026-08-26 retrospective.

### Repository evidence before the decision

- User-service persists global User ID, email/phone, password hash, and the
  current free-string compatibility role. It has no tenant/site column.
- Auth-service issues and validates JWTs, refresh sessions, session references,
  disablement, and token version. It has no authority database.
- Tenant-authority-service already owns Tenant and Site but had no Membership
  or grant persistence.
- ADR-0001, ADR-0008, ADR-0011, and ADR-0013 freeze authority ownership and the
  five physical records required by Batch 3 Step 3.

Classification: the missing persistent membership/grant owner was the planned
Batch 3 implementation gap and a confirmed defect only against the adopted F4
requirement. The existing global User/Auth separation remains correct and was
preserved. Custom roles, ABAC/policy engines, tenant-scoped Auth sessions, and
distributed authorization infrastructure remain future considerations, not
current fixes.

### Decision and implementation

Migration `20260826000200_membership_authority_foundation` adds:

- stable `Membership` keyed by exact Tenant and global UUID User reference;
- immutable retained `MembershipEpoch` history and one owned current pointer;
- `TenantRoleGrant` with exact `TENANT_ADMIN`/`PARENT_MANAGER` vocabulary;
- `SiteRoleGrant` with exact `SITE_ADMIN`/`EDITOR`/`USER` vocabulary and
  composite Site/Tenant scope;
- `PlatformGrant` with exact `PLATFORM_ADMIN` vocabulary.

Membership lifecycle is closed to `PENDING`, `ACTIVE`, `SUSPENDED`, and
`REVOKED`; grant lifecycle is `ACTIVE` or terminal `REVOKED`. Database checks,
partial unique indexes, composite foreign keys, immutable-history triggers,
deferred current-epoch consistency, revision rules, and runtime DELETE denial
prevent duplicate, cross-scope, reopened, or reassigned authority.

The numeric generation remains authority-internal. The service derives:

```text
"meg1_" + base64url(HMAC-SHA256(
  dedicatedMembershipEpochKey,
  JSON.stringify(["nebula-membership-epoch", "1", membershipId, generation])
))
```

This is keyed HMAC, not a guessable plain hash. The schema stores only the key
ID and opaque result alongside the internal generation. No credential or key
is stored in the database.

### Consequences and boundaries

- A global User ID alone grants no tenant/site operation.
- No User-service or Auth-service schema/runtime contract changed.
- No password, profile, JWT secret, refresh session, or token version was
  duplicated.
- No membership/grant row was seeded; legacy-role migration remains item 2 and
  default memberships remain item 3.
- No RPC/HTTP membership surface, resolver, context v2 writer, consumer, cache,
  or gateway traffic change was added.

### Failure-oriented review

| Concern             | Item 1 result                                                                                                                                                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prevention          | Closed enums, exact UUIDs, tenant/user uniqueness, same-scope Site FK plus membership-tenant trigger, current immutable epoch, partial active-grant uniqueness, terminal lifecycle, retained history, and keyed epoch reference.                                       |
| Detection           | Five-migration readiness, schema/static tests, disposable constraint evidence, revision/epoch reason codes, and later audit/outbox consumers.                                                                                                                          |
| Containment         | Tables are empty; no transport or consumer exists. Authority has no credential/session data and cannot issue tokens or replace domain authorization.                                                                                                                   |
| Fail state          | Missing membership/epoch/grant grants nothing. Invalid ID/ref, duplicate active grant, cross-tenant Site grant, stale pointer, reopened epoch, or invalid transition is rejected.                                                                                      |
| Recovery            | Before consumers exist, the additive empty slice can be administratively rolled back. Once referenced, stable IDs/epochs/grants are retained and reconciled rather than regenerated or reopened.                                                                       |
| Common-mode failure | A future compromised authority writer could create plausible grants; independent Auth actor/session proof and domain resource/operation checks remain mandatory.                                                                                                       |
| Evidence            | Prisma format/validate/generate; authority and focused HMAC tests; lint/types; disposable five-migration deploy/status and live SQL denial transaction; normal deploy/status; unchanged Batch 2 seed rerun and runtime-role resolution/readiness probe.                |
| Residual risk       | User existence is cross-database and must be validated through a typed User owner call before activation. Legacy invalid roles, root-admin mapping, last-platform-admin policy, delegation, live freshness, and operation authorization belong to later ordered items. |

### Verification result

- Disposable database: five migrations applied and current.
- Constraint evidence: completed, deferred checks forced, transaction rolled
  back.
- Existing default authority seed: `CREATED` then `ALREADY_CURRENT`; no
  membership was implicitly created.
- Normal development authority database: fifth migration applied and current.
- Existing runtime-role Batch 2 resolution/readiness probe: passed unchanged.
- Focused HMAC reference vectors prove membership ID, numeric generation, and
  dedicated key all affect the opaque output; malformed values fail closed.

## Item 2 - Migrate The Legacy Free-String Role

Status: complete on 2026-08-29 after clean-order repair and adversarial
disposable verification.

### Repository and live-data evidence before the decision

- User-service still owns the compatibility `User.role` string. Auth-service
  recognizes only exact `user`, `admin`, and `root-admin` values; its current
  fallback for any other stored value is the least-privileged `user` token
  role.
- Frozen ADR-0008 maps `root-admin` to `PLATFORM_ADMIN` and to the sole
  `TENANT_ADMIN` of the main/default tenant, `admin` to the default site's
  `SITE_ADMIN`, and `user` to that site's `USER`. An invalid value creates no
  authority grant.
- A privacy-minimized, read-only query of the development User database found
  32 records: 31 `user`, one `admin`, zero `root-admin`, zero invalid role
  values, and zero invalid UUIDs. It selected only `id` and `role`; no email,
  phone, password hash, credential, or session data was read or printed.

Classification: free-string migration is a planned Batch 3 implementation gap
and a confirmed defect only against the adopted F4 scoped-authorization
requirement. The current least-privilege handling of invalid Auth role values is
not a confirmed defect and is preserved. Replacing the compatibility field
early, custom roles, or a general policy engine would be optional/future work.

### Staged decision and implementation

- `classifyF4LegacyRole` provides one exact, case-sensitive mapping table. It
  does not trim, normalize, infer, or numerically order roles.
- `audit:f4-legacy-roles` is read-only and defaults to aggregate output. Invalid
  values are represented by SHA-256 fingerprints rather than raw role text;
  detailed JSON still contains no profile or credential fields.
- The audit blocks backfill for an invalid role, invalid UUID, or anything
  other than exactly one legacy `root-admin`.
- Compatibility modes are frozen as `LEGACY_PRIMARY`, `SHADOW_COMPARE`, then
  `SCOPED_PRIMARY`. Rollback is allowed only before persistent scoped authority
  becomes primary and before a second scope exists. There is no legacy fallback
  after either point.

The initial audit was `BLOCKED` solely by
`EXACTLY_ONE_ROOT_ADMIN_REQUIRED`. Because the data is local development data,
Salar delegated the fastest safe choice. A dedicated local-only root identity
was added instead of changing the existing admin's meaning. The final audit is
`READY`: 33 total users, 31 `user`, one `admin`, one `root-admin`, no invalid
role values, and no invalid UUIDs.

User-service exports that exact privacy-minimized manifest. It never connects
to the authority database. Tenant-authority-service consumes the in-memory
export, independently revalidates the exact mapping/cardinality/counts and
active default scope, then performs only its own writes in one serializable,
advisory-locked transaction. It created:

- 33 active default-tenant memberships with immutable generation-1 epochs;
- 31 default-site `USER` grants;
- one default-site `SITE_ADMIN` grant;
- the sole main-tenant `TENANT_ADMIN` and one `PLATFORM_ADMIN` grant for the
  dedicated root identity;
- one membership revision/outbox fact per membership and one minimized,
  HMAC-chained `LEGACY_ROLE.BACKFILL` audit event.

The generation is never exported or logged. Each epoch stores only the
dedicated key ID and the frozen opaque HMAC reference. A second execution
revalidated all 33 actors and returned `ALREADY_CURRENT` with the same manifest
SHA-256. A contradictory existing membership, epoch, grant, key, scope, or
platform role fails and rolls back the complete transaction.

Repair result: the general User seed now creates only the bounded legacy
root-admin/admin/user fixtures. The editor identity moved to a dedicated
non-production item-3 seed. The disposable verifier captures the complete
User-owned item-2 audit as one bounded snapshot, applies and immediately reruns
it, then reruns that same original snapshot after item 3. It does not regenerate
the migration input and accidentally classify a later editor as legacy data.
The original fail-closed grant validation remains unchanged.

### Failure-oriented review

| Concern             | Item 2 result                                                                                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prevention          | Exact role vocabulary, UUIDv4 validation, exactly-one-root prerequisite, read-only audit, and no automatic promotion or grant write.                                                                 |
| Detection           | Aggregate counts, hashed invalid-value evidence, stable blockers, and focused mapping/audit/rollback tests.                                                                                          |
| Containment         | Compatibility remains `LEGACY_PRIMARY`; authority facts are persisted but no runtime consumer or traffic path changed.                                                                               |
| Fail state          | Any invalid source record or missing/duplicate root administrator blocks the entire backfill instead of granting a guessed role.                                                                     |
| Recovery            | The audit is non-mutating; the importer rerun is idempotent. Before authority is primary, grant evaluation can stay disabled while retained epoch/audit/outbox history is reconciled.                |
| Common-mode failure | A compromised User writer could still alter the legacy role during the compatibility window; later backfill must use a bounded snapshot and compare evidence.                                        |
| Evidence            | Clean current-source User/Authority migrations; ordered seed/audit/backfill and post-item-3 rerun; exact SQL graph evidence; 16 User, 49 Authority, and 41 tooling tests; lint and both type checks. |
| Residual risk       | The compatibility role can still change independently until coordinated mutation/freshness work. Editor fixture, runtime comparison, revocation, and scoped-primary cutover remain later items.      |

## Item 3 - Seed Default Scoped Role Fixtures

Status: complete on 2026-08-29 after clean-order repair and adversarial
disposable verification.

### Repository evidence and decision

The item 2 snapshot already supplied the sole platform/main-tenant
administrator, one default-site administrator, and ordinary default-site users.
No legacy role represents the frozen content-only `EDITOR`; inventing a global
`editor` role would keep authority in User/Auth and contradict ADR-0008.

Classification: the missing editor/default-fixture seed was the planned item 3
implementation gap. Keeping the editor's global compatibility role as `user`
is the required identity/authority separation, not a degraded workaround.
Creating production bootstrap identities or general role-management UI remains
later operational/product work.

Two ordered User-owned development seed commands own four distinct login
identities. The general seed creates root admin, site admin, and user before
the legacy snapshot; the dedicated item-3 seed creates the global-user editor
after backfill. The exporter resolves the configured emails inside User-service
but emits only a version and four UUIDs. Tenant-authority-service validates the
version, UUIDv4 shape, distinctness, previously migrated root/admin/user facts,
exact editor membership/epoch/grant, and platform-admin cardinality within its
own serializable transaction.

The editor is a global `user` and has exactly one default-site `EDITOR` grant.
It has no tenant or platform grant. The root retains only `PLATFORM_ADMIN` and
the main tenant's sole `TENANT_ADMIN`; the selected admin/user fixtures retain
only `SITE_ADMIN`/`USER`. Other legacy users remain site-scoped users and none
receive global authority.

The normal development seed returned `CREATED`; the immediate rerun returned
`ALREADY_CURRENT`. The authority database now has 34 default-tenant
memberships: the 33 item 2 backfill actors plus the dedicated editor.

The current-source disposable proof now reproduces the intended order without
historical local state. Initial and immediate rerun passes produced exactly
four active memberships/open generation-1 epochs, one each of site `USER`,
`EDITOR`, and `SITE_ADMIN`, the sole main-tenant `TENANT_ADMIN`, the sole
`PLATFORM_ADMIN`, four membership invalidations, and one audit event for each
role-seed operation. The adversarial pass reran the general seed, base Authority
seed, original bounded backfill snapshot, editor seed, fixture export, and
Authority fixture seed with the same result.

### Failure-oriented review

| Concern             | Item 3 result                                                                                                                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prevention          | User-owner lookup, four distinct UUIDs, exact stored compatibility roles, production refusal, authority-owner validation, exact current epoch/grants, and one platform admin.                  |
| Detection           | Missing/reused/malformed identities, role drift, authority mismatch, extra platform administrator, partial transaction, or fixture-version drift returns a stable failure.                     |
| Containment         | Only the editor authority fact was new. No JWT/session/profile ownership, transport, resolver, cache, context, gateway, domain, or traffic behavior changed.                                   |
| Fail state          | Any source or authority mismatch rolls back the whole seed. It never promotes an arbitrary user, guesses from email outside User-service, or grants editor tenant/platform access.             |
| Recovery            | Correct the User-owned development fixture or reconcile retained authority facts, then rerun. Matching state produces no writes.                                                               |
| Common-mode failure | A compromised development seed/operator could coordinate false User and Authority fixtures; runtime Auth proof and domain checks remain independent and scoped authority is not primary.       |
| Evidence            | Disposable clean-order and adversarial rerun SQL proof; simulated partial-failure cleanup; 12 Authority suites/49 tests, 3 User suites/16 tests, 41 tooling tests, lint, and both type checks. |
| Residual risk       | Editor operation limits are persisted but not yet resolved/enforced. Compatibility shadowing must recognize this intentional global-user/scoped-editor difference.                             |

## Retrospective Evidence Audit - Items 1 Through 3

Date: 2026-08-26

The audit re-read the exact checklist text and ADR-0008/0009/0010/0011/0013,
compared the current User and Authority seeds/importers, reran the current
User-owned role audit, deliberately reran the Authority importer against the
post-item-3 manifest, and queried privacy-minimized authority counts.

| Finding                                                                                                                                                                                              | Classification                                               | Consequence                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Item 1 ownership/schema/HMAC foundation still matches its bounded checklist claim and focused constraint evidence.                                                                                   | Confirmed working mechanism                                  | Item 1 remains complete. Later population does not invalidate its historical empty-foundation boundary.           |
| Current source creates the editor in the general User seed before a clean legacy backfill; the backfill maps it to `USER`, while item 3 requires immutable `EDITOR`.                                 | Confirmed defect                                             | Items 2 and 3 reopen. A clean current-source execution cannot reproduce the historically successful live order.   |
| The post-item-3 User audit is `READY` with 34 users, but rerunning the importer fails with `legacy_role_backfill_existing_grant_mismatch`.                                                           | Confirmed safe failure and completion-evidence contradiction | No authority data was overwritten, but unchanged-manifest idempotency is not a clean end-state workflow proof.    |
| The live authority database has 34 active memberships/open epochs, 31 `USER`, one `EDITOR`, one `SITE_ADMIN`, one `TENANT_ADMIN`, and one `PLATFORM_ADMIN`; audit and membership outbox facts exist. | Confirmed current live state                                 | Live data is internally consistent and need not be deleted; it cannot substitute for a clean disposable proof.    |
| Items 2 and 3 lack one disposable end-to-end test that starts from current clean User/Authority databases and reruns the complete documented sequence.                                               | Confirmed evidence gap                                       | Add that verifier before either checkbox is restored.                                                             |
| Platform-grant-specific invalidation granularity, key-rotation behavior, and runtime compatibility shadowing are not yet executable.                                                                 | Later ordered Batch 3 requirements                           | Do not silently treat them as item 1-3 evidence; evaluate them explicitly in invalidation/freshness/denial items. |

## Clean-Order Repair And Second Completion Pass

Date: 2026-08-29

The confirmed defect was corrected without weakening immutable grants or
excluding any identity from the User-owned audit. The normal User seed no
longer creates the editor. `seed:f4-editor-user` creates that global `user`
identity only after item 2's bounded legacy snapshot has been imported. The
snapshot remains the item-2 migration artifact for later reruns; a fresh audit
after item 3 remains useful invalid-value evidence but is not substituted as a
new legacy migration input.

`pnpm db:verify:f4-batch3-role-seeds` performed both completion passes:

1. It created guarded disposable User and Authority databases, deployed and
   checked all current migrations, ran the base seeds twice, captured the
   three-identity legacy snapshot, ran its importer twice, created the editor
   twice, exported four IDs, and ran the Authority fixture twice.
2. It adversarially reran the earlier general User seed, base Authority seed,
   original legacy snapshot, editor seed, fixture export, and Authority fixture;
   rechecked migration status; asserted the exact final User and Authority
   graph with SQL; and removed both disposable databases. The tooling test also
   injected a mid-sequence audit failure and proved cleanup of both databases.

Final disposable evidence was four global users (`root-admin`: one, `admin`:
one, `user`: two), four active memberships/open generation-1 epochs, one active
default-site grant for each `USER`, `EDITOR`, and `SITE_ADMIN`, one main-tenant
`TENANT_ADMIN`, one `PLATFORM_ADMIN`, zero `PARENT_MANAGER`, four membership
outbox facts, and exactly one `LEGACY_ROLE.BACKFILL` plus one
`DEFAULT_ROLE_FIXTURES.SEED` audit event. The post-item-3 User audit remained
`READY` and contained exactly one additional valid `user` identity.

Focused gates passed: 16 User tests, 49 Authority tests, 41 backend-tooling
tests, User and Authority type checks, Authority lint, and the standalone
`db:verify:tenant-authority` clean five-migration/constraint/two-seed verifier.
No build, Compose boot, broad e2e suite, or normal-database mutation was run.

Classification after the second pass: the seed-order problem was a **confirmed
defect** and is fixed. Bounded-snapshot reuse is the required reversible
migration behavior. Runtime compatibility shadowing, live invalidation,
key-rotation behavior, and operation enforcement remain later ordered Batch 3
work rather than evidence for items 2 or 3.

## Next Item

Begin item 4 explicit actor/target authorization resolution. Do not combine it
with item 5 freshness/invalidation work.

### Item 4 pre-implementation evidence correction

The repository audit found that `ValidateTargetScope` proves only active
Tenant/Site ownership. None of the four existing RPCs reads Membership,
MembershipEpoch, or grants. ADR-0009 requires every protected decision to carry
one stable normalized operation.

The first audit incorrectly recorded operation-policy ownership as unresolved.
The source and referenced architecture documents already resolve it:

- F3 gateway route policies own stable route IDs, actor/application policy, and
  exact downstream RPC declarations.
- ADR-0009 assigns normalized-operation mapping to the receiving contract and
  trusted server policy. Authority resolves the applicable effective role,
  active membership/grant, exact target/path, and opaque revision.
- ADR-0010 keeps the normalized operation out of context duplication because
  the S2S envelope already signs the exact transport method/RPC path; the
  receiver maps that signed contract plus validated body semantics.
- ADR-0008 supplies the closed role/operation eligibility matrix, while Auth
  still verifies the actor/session and the domain owner still checks its exact
  resource and business operation.

Item 4 therefore needs an additive actor-authority read and receiver mapping,
not a competing role-policy service or a new unrelated operation catalog. No
proto, generated client, runtime resolver, or consumer was changed during the
incorrect design pause.

## Item 4 - Explicit Target Authorization Resolution

Status: complete on 2026-08-29 after both completion passes.

### Evidence ledger

Exact checklist wording:

> Implement explicit target-tenant/site authorization resolution. A role
> without a valid active membership and matching target scope grants nothing.

Directly applicable decisions:

- ADR-0008 supplies the non-hierarchical scoped roles and operation-family
  eligibility. It does not make Authority the owner of every domain operation.
- ADR-0009 requires one explicit target, one server-selected path, active
  membership/current epoch/matching grant or platform grant, direct parent
  proof where applicable, one effective role, normalized operation, and opaque
  target-specific revision. Auth and the domain owner remain independent.
- ADR-0010 requires the resolver RPC to receive S2S v3 plus strict context-v2
  `RESOLUTION/AUTHORITY`; that context grants no domain operation and cannot be
  propagated.
- ADR-0011 requires the opaque HMAC-derived `membershipEpochRef`, never the
  internal generation.
- ADR-0012 owns later invalidation, cache-age, outage, and recovery behavior;
  those cannot be claimed by item 4.

Current mechanisms found before implementation:

- `ValidateTargetScope` already proved active Tenant/Site ownership.
- `ResolveApplicationRegistration` already proved active Application/Channel/
  Site/Tenant consistency.
- Membership, immutable current epoch, exact grants, opaque epoch reference,
  platform grant, and direct relationship persistence already existed from
  items 1-3.
- Shared S2S v3 already signed caller kind/name, target service, RPC path,
  request body digest, request ID, context digest, time, nonce, and key.
- Auth's shared token guard already performed live token/session validation and
  compared the context-v1 actor to Auth truth.

The absence claim was established by reading
`packages/protos/tenant_authority.proto`, the generated-client owner,
`authority-grpc.controller.ts`, `authority.service.ts`,
`authority.repository.ts`, and their tests, then searching those files for
Membership/epoch/grant and actor-authorization reads. The four existing RPCs
never queried those records. This was the planned item-4 implementation gap,
not a defect in the intentionally narrower Batch 2 contract.

Required proof was: exact target/path behavior; missing/inactive/
contradictory membership and wrong scope denial; non-hierarchical exact role;
direct parent-only and explicit platform paths; live Auth actor/session
agreement; strict resolver-only context-v2 admission; v2 rejection on legacy
routes; no resolution propagation; generated proto/client coverage; real
current-source database resolution; unchanged earlier seed/migration evidence;
and no gateway/domain traffic cutover.

### Confirmed sequencing dependency and narrow correction

Implementing the resolver RPC under context v1 would have contradicted
ADR-0010's mixed-version denial. Deferring the complete resolver to Batch 4
would have skipped this exact Batch 3 item. This was a **confirmed roadmap
dependency defect**. Salar approved moving only the minimum receiver-first
prerequisite forward:

- context v1 remains an exact separate shape with its frozen canonical bytes;
- context v2 currently recognizes only canonical `RESOLUTION/AUTHORITY`, with
  optional exact application facts and an actor containing only
  `userId`/`sessionRef`;
- `RequireS2SAuthorityResolution` admits that shape only on an explicitly
  declared receiver, requires an actor, and rejects v1 on that receiver;
- every undeclared/legacy route rejects context v2;
- the token guard compares v2 actor user/session with live Auth truth but never
  treats the legacy global role as scoped authority;
- verified downstream propagation refuses every resolution context.

No `APPLICATION` or `ACTOR` resolution stage, `AUTHORIZED` context, authorized
writer, capability discovery, dual-read domain receiver, cache, or traffic
switch was moved forward. Batch 4 still owns those complete slices.

### Resolver and contract

The additive fifth RPC, `ResolveActorAuthorization`, requires signed exact
caller identity, the resolver-only v2 carrier, and a live bearer. Its
controller independently requires agreement among the signed v2 actor,
guard-attached actor, Auth-validated user/session, and request actor ID.
Application-path requests also require the signed application ID/tenant/site
to equal the explicit request target before a database read.

The Authority service then resolves:

- `APPLICATION`: active exact application target plus active Membership,
  current open epoch, and exactly one active grant for that Site;
- `TENANT_MANAGEMENT`: the target tenant's active Membership/current epoch and
  exact `TENANT_ADMIN` grant;
- `PARENT_MANAGEMENT`: active `PARENT_MANAGER` authority in the actor tenant
  plus one active direct edge to the different target tenant;
- `PLATFORM_MANAGEMENT`: exactly one live `PLATFORM_ADMIN` grant and an
  explicit active target;
- `SERVICE_OPERATION`: `DENIED`; a human resolver cannot manufacture service
  authority.

Missing membership/grant/relationship returns `DENIED`; inactive lifecycle or
closed epoch returns `INACTIVE`; unknown, cross-scope, and internally
contradictory records retain distinct closed statuses. A successful response
contains exactly one membership or platform authority variant, one effective
role, the target/path/normalized operation, optional direct relationship ID,
opaque `ar1_` revision, and resolution time. Membership authority exposes the
stored `meg1_` HMAC reference and never the internal generation.

`RESOLVED` means the scoped authority fact was resolved; it is not final
permission. The receiving trusted server maps the signed RPC/body semantics to
the normalized operation and applies ADR-0008 eligibility, while the owning
domain service loads and checks its resource. This preserves the corrected
operation owner and avoids a competing central policy catalog.

### Failure-oriented review

| Concern             | Item 4 result                                                                                                                                                                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prevention          | Exact generated request, canonical UUID/operation checks, S2S v3 body/path binding, resolver-only v2 receiver declaration, live bearer plus actor/session equality, active target/application/membership/epoch/grant/link predicates, exact role/path, and no role hierarchy. |
| Detection           | Closed statuses separate not-found, inactive, scope mismatch, contradiction, and denial; invalid carrier/path/actor/application disagreement has stable gRPC failure; focused tests cover each branch.                                                                        |
| Containment         | The RPC is read-only and internal, resolution context cannot propagate, no writer emits v2, no domain consumes the result, static F3 traffic remains primary, and Auth/domain checks remain independent.                                                                      |
| Fail state          | Missing or ambiguous facts deny; database failure is `UNAVAILABLE`; wrong context/version/route/actor/session is rejected; there is no fallback to JWT role, raw target, static registry, cached UI state, or context v1.                                                     |
| Recovery            | Correct Authority records or Auth/session/S2S configuration and retry. Because no writer/consumer/traffic cutover exists, the receiver-only prerequisite and additive RPC can be disabled without reviving revoked authority.                                                 |
| Common-mode failure | Gateway and Authority still share the context parser and may agree on a false signed fact; a compromised Authority database/operator can return plausible scope. Live Auth and later independent domain resource/operation checks limit but do not remove this risk.          |
| Evidence            | Canonical v1/v2 parser and wrong-route tests; actor/session tests; resolver/RPC denial tests; generated wrapper; clean real-DB role/path/missing-membership probe; clean-order seed/migration reruns; focused lint/types and complete package suites.                         |
| Residual risk       | Item 5 still must invalidate live decisions after membership/grant/site/tenant/link/application changes; item 6 still owns freshness/cache/outage disagreement; later items own parent audit and full role/denial integration.                                                |

### Second completion pass and verification

The adversarial pass tried absent, suspended, closed, cross-site,
wrong-application, duplicate/contradictory grant, wrong tenant role, same-tenant
parent, missing/direct/reverse relationship, multiple platform grant,
service-operation, actor/session, application-context, unknown path,
non-normalized operation, context-v1-on-v2-route, context-v2-on-legacy-route,
and attempted resolution propagation cases. It also verified that changing the
normalized operation changes the opaque authority revision.

`pnpm db:verify:f4-batch3-role-seeds` recreated both databases from current
migrations, reran earlier seeds/backfill/fixtures in clean and adversarial
order, reran SQL graph checks, then invoked the real repository/service against
that disposable Authority database. Exact `SITE_ADMIN`, `EDITOR`, `USER`,
`TENANT_ADMIN`, and `PLATFORM_ADMIN` paths resolved; a random actor with no
membership was denied; both databases were removed afterward.

Focused results: 126 grpc-auth tests, 13 client tests, 60 Authority tests, and
41 backend-tooling tests passed; all three package lints and focused type checks
passed. Proto generation/stale check and diff/format checks passed. The only
builds were small shared `protos` and `grpc-auth` package compiles needed to
refresh local workspace `dist`; no backend image, Compose, e2e, scan, or normal
database mutation was run.

## Next Item

Begin item 5 authority invalidation/refresh. Do not combine item 6 bounded
freshness/cache/outage behavior with it.

## Item 5 - Authority Invalidation And Refresh

Status: in progress; implementation is paused at the publication-transport
decision below. Item 6 remains untouched.

### Evidence ledger

Exact checklist wording:

> Make membership, role, site, tenant, parent-link, and application revocation
> invalidate or refresh live authorization through the Auth-owned
> session/token-version mechanism or the ADR-selected equivalent.

Directly applicable decisions:

- ADR-0012 selects target/component revision changes in the same Authority
  transaction as each mutation, a durable Authority-owned outbox, an
  idempotent invalidation dispatcher, and absolute freshness bounds owned by
  item 6.
- ADR-0012 and ADR-0011 explicitly reject using a tenant membership change to
  destroy a global Auth session that may still be valid in another tenant.
  Auth token version remains authoritative for global identity/session state;
  Authority revision/epoch/outbox is the selected scoped equivalent.
- ADR-0011 identifies the affected Tenant, Site, Application, Membership,
  MembershipEpoch, ParentRelationship, PlatformGrant, and reference facts and
  requires immutable revoked epochs/grants.

Current mechanisms verified from source:

- Auth owns live JWT/session/token-version validation and exposes an internal
  `bumpTokenVersion`, but there is no Authority caller and using it for scoped
  revocation would violate the frozen cross-tenant session boundary.
- `AuthorityInvalidationOutbox` is already durable, versioned, indexed for
  pending dispatch, state-guarded, and unique by aggregate/revision.
- Application mutation and default/role seeds already write revision plus
  outbox in their Authority transaction. Application revocation also
  tombstones its handles and identities.
- The item-4 resolver currently performs live database reads and binds the
  application/tenant/site/membership epoch/grant/relationship revisions into
  its opaque decision revision. With no cache or live consumer yet, a committed
  change is observed by the next resolution.

Negative claims were established by searching
`apps/tenant-authority-service/src`, its Prisma migrations/tests, Auth source,
the auth and authority protos/clients, and the relevant ADRs for
`AuthorityInvalidationOutbox`, `dispatcher`, `publish`, `DISPATCHED`,
`nextAttemptAt`, `tokenVersion`, and mutation/revocation methods:

- no outbox dispatcher or invalidation publisher/consumer exists;
- no repository mutation currently revokes/suspends Membership, tenant/site
  role grants, PlatformGrant, Tenant, Site, or ParentRelationship while
  advancing the correct revision and inserting outbox evidence;
- no publication transport or channel contract is frozen in source. ADR-0012
  permits a durable outbox followed by Redis/pub-sub delivery but does not
  choose Pub/Sub versus a durable stream/pull contract.

Classification: missing revocation transactions and dispatcher are the planned
item-5 implementation gap. Existing live Auth validation, scoped Authority
separation, resolver reads, application transaction, and durable outbox are
working mechanisms to preserve. Replacing Auth sessions, adding a general event
platform, or adding cross-service distributed transactions would be optional
or future work.

Required proof: each named revocation advances the authoritative revision in
the same transaction as one exact outbox event; membership/role revocation
closes or invalidates the correct epoch/grant without touching global Auth
sessions; the live resolver immediately denies after commit; dispatcher retry,
duplication, ordering, backlog/readiness, and recovery are observable; and all
earlier clean migration/seed/resolver verifiers still pass. Item 6 will
separately prove the 15-second cache and outage behavior.

### Design decision required

The durable commit mechanism is frozen, but the publication transport is not.
The narrow recommendation is a versioned Redis Pub/Sub channel backed by the
existing PostgreSQL outbox and a dedicated authority-invalidation Redis
configuration. It is the fastest implementation and matches ADR-0012's model:
the outbox is the durable record, duplicate delivery is harmless, and item 6's
absolute 15-second cache age contains a missed subscriber notification.

Redis Streams would add consumer groups, retention, claiming, and another
durable log even though PostgreSQL already owns replay. It provides stronger
offline delivery but costs more operational state. Deferring push and relying
only on live resolution is simplest, but it cannot complete ADR-0012's explicit
dispatcher requirement and would leave item 5 unchecked.
