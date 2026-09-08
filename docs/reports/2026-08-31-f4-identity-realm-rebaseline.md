# F4 Identity-Realm Rebaseline And Changelog Reconciliation

Date: 2026-08-31

Status: Batch 1R complete. Documentation and architecture only; this report and
ADR-0015 authorize no schema, migration, proto, runtime, key, session,
federation, deployment, or traffic change.

## Outcome

The dated F4 records were reconciled against current source and ADR-0014. The
completed Tenant Authority and membership work is preserved as default-realm
compatibility; it is not discarded or relabeled as multi-realm proof. The scan
also found concrete gaps that were not visible from the roadmap summary alone:

- the historical root subject holds both customer `TENANT_ADMIN` and operator
  `PLATFORM_ADMIN`, which conflicts with separate operator/customer realms;
- version-1 audit/outbox history cannot be rewritten or consumed as though it
  originally carried realm facts;
- the role importer is a bounded default-realm migration artifact and cannot
  scan subjects created for later realms;
- the implemented resolver correctly denies missing membership, so consumer
  JIT access needs an audited membership transaction before resolution;
- `sr1_` sessions and `ar1_` decisions are not realm/application-qualified;
- current sessions contain no application audience and cannot be inferred into
  subordinate sessions;
- Batch 3 item 5 froze the durable Authority outbox but selected no publisher;
  Realm Auth invalidation is a separate durability/ownership problem;
- User-service documentation incorrectly said the repaired base seed created
  no root administrator.

Salar approved the separate operator/customer administrator mapping and the
bounded one-use legacy-session upgrade. ADR-0015 freezes those choices, the
record-owner matrix, and the R0-R11 migration/rollback order. Batch 1R closes
after the adversarial review recorded below; corrective implementation starts
in Batch 3R only.

## Evidence Ledger

### Exact checklist wording

Batch 1R must produce the corrected owner/record and additive migration
matrices for isolated licensed-root realms, realm-qualified actors,
application trust, credential/session consistency, context v3, default-realm
preservation, selected subordinate SSO, excluded personnel applications, and
unrelated-root denial. No implementation may begin until decisions that can
change the first schema are frozen.

### Dated records inspected

- `docs/reports/2026-08-24-f4-authority-audit.md`
- `docs/reports/2026-08-24-f4-batch1-exit-matrix.md`
- `docs/reports/2026-08-26-f4-batch2-exit-proof.md`
- `docs/reports/2026-08-26-f4-batch3-execution-checklist.md`
- `docs/reports/2026-08-22-f3-exit-proof.md`
- `docs/reports/2026-08-24-f3-execution-checklist.md`

### Current governing decisions

- `docs/architecture/decisions/0014-f4-customer-identity-realms-and-federation.md`
- `docs/architecture/decisions/0015-f4-identity-realm-record-and-migration-freeze.md`

The repository has no project-owned file named `CHANGELOG`; these dated audit,
exit, and execution reports are the applicable change records. Dependency or
vendored changelogs were not used as NebulaNV implementation evidence.

### Current source checked

- `apps/user-service/prisma/schema.prisma`
- `apps/user-service/prisma/seed.ts`
- `apps/user-service/src/user/user.service.ts`
- `apps/auth-service/src/auth/grpc/grpc-auth.controller.ts`
- `apps/auth-service/src/auth/auth.service.ts`
- `apps/auth-service/src/auth/redis/auth-redis.service.ts`
- `apps/auth-service/src/auth/token/access-token-validation.service.ts`
- `apps/tenant-authority-service/prisma/schema.prisma`
- Tenant Authority seed/import/resolver/mutation source and focused tests
- Auth/User/Tenant Authority proto and typed-client contracts
- current Compose/release Redis placement

The login-identifier inspection confirmed that User/Auth currently apply
`trim().toLowerCase()` to email while Auth forwards the non-email identifier as
phone without a canonicalizer. The closed target versions preserve the former
and refuse to guess the latter during migration.

Negative searches covered realm/provider/issuer/audience/application-bound
Auth fields, durable active-session persistence, selected-session revocation,
password-to-session invalidation, an outbox dispatcher/publisher/consumer,
OIDC/SAML/SCIM owners, and realm-qualified domain actor references. Absence was
not inferred from memory.

## Preserved Implemented Evidence

| Change record                  | What is proven                                                                                                                                                                    | Correct realm disposition                                                                                                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F4 pre-implementation audit    | Exact F3 static registry, global User/Auth, signed context, service database, domain-reference, Redis, and migration starting point                                               | Treat it as the implementation being migrated, not the final identity topology. Preserve registry seam, Auth checks, S2S, typed clients, and independent domain owners.    |
| Batch 1 exit                   | Tenant Authority ownership; direct parent; closed target roles; strict context/migration principles; service-by-service tenant/site matrix                                        | Keep every non-global decision. ADR-0014 supersedes only identity/session/actor-reference assumptions and inserts corrective gates.                                        |
| Batch 2 exit                   | Four persistent registrations; unknown/cross-bound/native denial; four historical migrations; one seed audit and nine outbox facts; deterministic seed, recovery, healthy runtime | Preserve all IDs, handles, verification records, lifecycle, audit, outbox, runtime, and gateway-static rollback. Add policies/trust without regenerating rows.             |
| Batch 3 item 1                 | Stable Membership, immutable MembershipEpoch, closed grants, internal numeric generation and `meg1_` HMAC reference                                                               | Add default realm plus subject to Membership. Preserve Membership/epoch/grant IDs, generation, key ID, and `meg1_`; never regenerate for realm scope.                      |
| Batch 3 item 2                 | Exact privacy-minimized role audit/export, bounded snapshot, serializable importer, invalid-value denial, idempotent rollback                                                     | Keep only as the one default-realm migration artifact. Never rerun it over operator/second-realm subjects.                                                                 |
| Batch 3 item 3                 | Dedicated editor seed, exact grant cardinalities, clean-order/adversarial disposable verifier                                                                                     | Preserve target grants and rerun this verifier after later stateful migrations. The normal development database has 34 memberships; the minimal disposable proof has four. |
| Batch 3 item 4                 | Exact target/path resolver, strict statuses, live Auth actor/session match, resolver-only context v2, missing-membership denial, `ar1_` revision                                  | Preserve as default-realm receiver compatibility. Realm authentication alone cannot bypass its membership predicate.                                                       |
| Batch 3 item 5 evidence ledger | Existing Authority outbox/revisions and live DB resolution; no general revocation mutations, dispatcher, publisher, consumer, or selected Pub/Sub/Streams contract                | Preserve the Authority outbox. Specify Authority publication separately from Realm Auth credential/session invalidation before implementation.                             |
| Current Auth source/tests      | Hashed refresh tokens, Redis Lua rotation, replay-family containment, current/all logout, token-version/disable/session checks                                                    | Preserve behavior inside each realm. Do not mistake it for durable session inventory, password invalidation, app audience, realm routing, or HA proof.                     |

## Classified Findings

| Finding                                                            | Classification                                                              | Required treatment                                                                                                                                                                                           |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| One User table and bare Membership/PlatformGrant/domain references | Confirmed gap against revised F4                                            | Default-realm backfill, realm-qualified references, same-email second-realm proof.                                                                                                                           |
| Password write and session creation lack durable shared fences     | Confirmed defect                                                            | Auth-owned credential/session generations plus primary-database session CAS and race tests.                                                                                                                  |
| `ValidateUser` is followed by unbound `GetTokens(userId)`          | Confirmed trust-boundary defect                                             | One atomic Realm Auth `Login` owns credential proof plus application-bound session issuance; no credential-login grant/fallback.                                                                             |
| Email normalization is implicit and phone login is not canonical   | Confirmed migration/contract gap                                            | Persist closed Auth-owned normalization versions; preserve lower/trim email and quarantine non-matching legacy phone values until verified.                                                                  |
| Root subject holds customer and operator grants                    | Confirmed migration contradiction                                           | Preserve the customer subject as `TENANT_ADMIN` plus exact `PARENT_MANAGER`; create a distinct operator-realm subject and atomically replace only its `PLATFORM_ADMIN` grant after recovery and route proof. |
| User-service seed note denied current root-admin creation          | Stale documentation                                                         | Corrected to the source/report-proven root-admin/admin/user plus later editor order.                                                                                                                         |
| Batch 2 handoff still stated the old global target                 | Stale documentation                                                         | Added a historical amendment; original evidence is unchanged.                                                                                                                                                |
| Authority outbox publisher transport                               | Deliberately deferred R11 runtime selection; not a Batch 1R schema decision | Choose from measured deployment/failure evidence only after Authority and Realm Auth event ownership/versioning are separate; owner/outbox records are already frozen.                                       |
| SAML/SCIM connectors                                               | Enterprise integration gap, not a local-login defect                        | Preserve provider-neutral seams; phase placement requires roadmap consultation.                                                                                                                              |
| Per-realm regional HA, failover, and load/soak proof               | Confirmed production-readiness gap for the upper-enterprise goal            | F4 proves functional two-realm isolation; proposed F9 amendment requires Salar approval.                                                                                                                     |

## Final Corrected Owner And Record Matrix

This is the concise review matrix. ADR-0015 is normative for exact closed
vocabularies, fields, constraints, generation fences, and forbidden contents.

| Record/fact                               | One authoritative owner                                                            | Minimum identity/constraint                                                                                                                                                                            | Explicitly not stored here                                                                                    |
| ----------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `IdentityRealm`                           | Tenant Authority control-plane database                                            | UUID, exact kind/owner/root, immutable root-default flag, lifecycle, immutable unique lowercase-UUIDv4 `authRouteRef`, revision; one non-revoked default consumer realm per root                       | Passwords, provider secrets, private keys, raw sessions, endpoint/URL, unrelated-realm directory              |
| `IdentityProviderRegistration`            | Tenant Authority for public/trust metadata                                         | UUID, realm, provider kind, exact normalized issuer/entity/discovery reference, lifecycle, revision                                                                                                    | Client secret, external password, private signing/decryption key                                              |
| Provider client secret/private realm keys | Per-realm secret manager/KMS consumed only by Realm Auth                           | Realm/provider/key purpose and version separated; public JWKS/metadata may be published                                                                                                                | Tenant membership, business data, raw tokens in logs/config DB                                                |
| `ApplicationIdentityPolicy`               | Tenant Authority                                                                   | Exactly one active policy per application revision; accepted principal classes, session mode, exact audience, default deny                                                                             | Credential proof, email lookup, target role grant                                                             |
| `FederationTrust`                         | Tenant Authority                                                                   | Exact application + realm + optional provider + principal class + audience; lifecycle/revision; no parent-edge inference                                                                               | Provider password/secret, broad sibling or cross-license trust                                                |
| `RealmSubject`                            | Realm Auth database                                                                | Immutable subject UUID inside one exact realm, principal class, lifecycle, monotonic `credentialGeneration` and `sessionGeneration`                                                                    | Tenant role, domain permission, unrelated-realm lookup                                                        |
| Authentication login identifier           | Realm Auth database                                                                | Realm-local `EMAIL_LOWER_TRIM_V1` or `PHONE_PLUS_DIGITS_V1`, verification/login state, and uniqueness; same value may exist in another realm                                                           | Cross-realm auto-linking, caller-selected normalization, or platform-global search                            |
| `LocalCredential`                         | Same Realm Auth transaction boundary as subject generation                         | One active hash/algorithm parameters per local subject; absent for external-only subject                                                                                                               | Raw password, tenant grant, profile authorization                                                             |
| `ExternalIdentityLink`                    | Realm Auth database                                                                | Exact registered provider plus issuer and provider subject maps to one realm subject; lifecycle and conflict denial                                                                                    | Email-based merge, provider secret, tenant permission                                                         |
| `RootSsoExchangeGrant`                    | Issuing Realm Auth PostgreSQL primary                                              | Internal UUID; 48-character random `rsg1_` returned once and only its 32-byte SHA-256 digest stored; source/linked target sessions; exact target/audience/request/redirect; PKCE S256; revisions/state | Raw code, credential-login proof, legacy upgrade, parent refresh token, reusable multi-audience bearer        |
| `AuthSession`/session family              | Realm Auth database                                                                | Realm, subject, `sr2_`/key ID, observed credential/session generations, provider/auth authority, application/audience, family/rotation sequence, hash only, lifecycle/times, minimized device metadata | Raw refresh token, membership generation, domain role                                                         |
| `LegacySessionBridge`                     | Default Realm Auth database during the bounded window                              | Immutable `lsb1_`/key ID, subject, both observed Auth generations, expiry, `PENDING`/`CONSUMED`/`REVOKED`, optional exact target-session link                                                          | Raw legacy token/session ID, guessed generation/audience, federation eligibility                              |
| Auth credential/session outbox and audit  | Realm Auth database                                                                | Additive event version, realm/subject/session/application purpose, monotonic generation/sequence, retry state; audit contains no secrets                                                               | Tenant Authority event ownership or shared generic event log                                                  |
| Credential/session migration artifacts    | Source User/current Auth migration command in transit to exact Realm Auth importer | Bounded canonical manifest, source/migration ID, keyed record HMACs, destination encryption, expiry, idempotent import; only counts/HMACs/key IDs remain as evidence                                   | General runtime API, direct cross-owner database read, plaintext password, or secret/session material in logs |
| Redis session/rotation/replay cache       | Exact realm Auth deployment                                                        | Realm/application/purpose-separated keys; derived from durable primary and never allowed to revive a denied generation/session                                                                         | Sole durable generation/session inventory, cross-realm namespace                                              |
| Realm profile/contact                     | Matching realm User/profile database                                               | Realm plus subject; only profile/contact fields owned by that realm, with auth login identifiers changed through Auth-owned workflow                                                                   | Password hash, refresh session, tenant grant                                                                  |
| Subordinate local consumer projection     | Exact target application/domain owner                                              | Realm plus subject, target tenant/site/application, minimal consented/product-required fields, lifecycle                                                                                               | Parent credential/session, unrelated profile, admin grant                                                     |
| `Membership`                              | Tenant Authority                                                                   | Preserve ID; unique `(tenantId, identityRealmId, subjectId)`; JIT is audited/idempotent and can create only `USER` path                                                                                | Email, password, profile, credential/session generation                                                       |
| `MembershipEpoch` and role grants         | Tenant Authority                                                                   | Preserve epoch/grant IDs; internal generation stays private; only existing `meg1_` HMAC leaves; exact target role                                                                                      | Auth credential/session generations, realm-wide role hierarchy                                                |
| `PlatformGrant`                           | Tenant Authority                                                                   | Realm-qualified subject; `PLATFORM_ADMIN` eligible only from the platform-operator realm                                                                                                               | Customer credential/profile, automatic customer membership                                                    |
| Authority audit/invalidation              | Tenant Authority                                                                   | Future event version carries realm-qualified actor when applicable; historical HMAC chain/payload remains immutable                                                                                    | Realm Auth password/session event authority                                                                   |
| Domain actor/owner reference              | Each domain database                                                               | Explicit `identityRealmId` plus `subjectId`; optional pairs are both-null or both-set; legacy UUID is default-realm migration input only                                                               | Bare UUID with platform-global meaning, email/provider claim, opaque-wrapper alternative                      |
| Context v3 actor/decision                 | `@nebula/grpc-auth` schema; Auth/Authority/domain each prove their owned facts     | Realm+subject, `sr2_`/key ID, authentication-authority ref, exact application audience/policy, target/membership/role, `ar2_`/key ID, freshness; exact union and receiver-first                        | Raw provider claims/tokens, email, internal session ID, membership generation, credential/session generation  |

### Consistency rules

- Realm Auth PostgreSQL primary is authoritative for credential and session
  security writes. Replicas may serve reporting, never password/session
  admission or generation checks.
- Password hash and both Auth generations change in one transaction. Logout-all
  advances `sessionGeneration`; session creation/rotation/upgrade uses a
  conditional write against both observed values. Exact legacy logout and
  upgrade also lock the same bridge row, so Redis disagreement cannot authorize
  or let an upgrade escape revocation.
- Membership, credential, and session generations are separate monotonic fences
  with separate owners and keys. Only `meg1_` exposes membership epoch; no raw
  generation enters context.
- Existing `sr1_`/`ar1_` remain exact v2/default-realm compatibility values.
  Realm/application sessions use `sr2_`; realm-aware decisions use `ar2_`.
- Consumer JIT calls an audited, idempotent Authority mutation that creates or
  reactivates only the allowed Membership/current epoch/site `USER` grant, then
  invokes the unchanged resolver. It cannot infer an admin/content role.
- Tenant Authority event v1 is decoded only as deterministic default-realm
  Authority state. Realm Auth never consumes it as a credential/session fact.

## Final Additive Order And Traffic Gates

This summary follows the normative R0-R11 gates in ADR-0015. In particular, v3
receivers precede every `sr2_` session, and rollback never converts `sr2_` into
`sr1_`.

| Gate                            | Additive work and proof                                                                                                                                                                                                        | Rollback boundary                                                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R0 current baseline             | Freeze this matrix and rerun existing Tenant Authority plus role-seed verifiers                                                                                                                                                | No runtime/data change.                                                                                                                                                |
| R1 control-plane records        | Add unused Realm/Provider/Policy/Trust/audit/outbox schema; seed inactive default/operator realms/local providers, four policies/default-local trusts, and one admin-web operator trust                                        | Drop only unused non-admitting records after exact empty-reference audit; preserve Batch 2 IDs/handles/history and static routing.                                     |
| R2 actor references             | Add nullable realm+subject beside Membership/PlatformGrant/domain refs; backfill deterministic default realm and existing UUID; preserve every epoch/`meg1_`                                                                   | Readers remain legacy; remove only new columns if no v3/session/second-realm write exists.                                                                             |
| R3 Realm Auth shadow            | Add isolated default/operator Realm Auth aggregates; seed credential generation explicitly, map non-lazy token version to session generation, and inventory every verified family in the bridge without issuing realm sessions | User/current Auth remain owners; missing token version quarantines the family; shadow data is removable only before new generations/sessions.                          |
| R4 administrator split staged   | Prepare and non-issuingly verify the distinct operator subject/credential/recovery plus per-role tenant-grant constraint; create no AuthSession/token or PlatformGrant; leave traffic unchanged                                | Remove only the proven-unused/no-session subject; customer platform authority remains active until receivers and its replacement route are proven.                     |
| R5 context-v3 receivers dormant | Deploy separately declared v3 receivers for all protected original-application/operator routes before any v3 writer/session; prove strict version routing                                                                      | Disable only unused receivers; v1/v2 bytes remain unchanged and no `sr2_` exists.                                                                                      |
| R6 Realm Auth plus v3 cutover   | Barrier plus final encrypted reconciliation; activate only default realm/provider, four policies/local trusts; make Realm Auth/bridge checks primary and enable the default v3 cohort                                          | Pre-first-write failure leaves new records non-admitting; after divergence retain Auth/v3 through drain/revocation and recover forward; operator trust stays inactive. |
| R7 legacy-session transition    | Use the durable bridge for one upgrade into the verified presenting compatible default application; linearize exact/all logout and test partial failures                                                                       | Revoke pending bridges/families; keep v3 for consumed sessions; no state reversal, federation, or session-version downgrade.                                           |
| R8 administrator split final    | Activate exact operator realm/provider/admin-web trust and its R5 cohort; prove app-bound session/recovery and no-grant denial; atomically swap grants, then prove one audited operation                                       | Pre-commit failure disables operator admission and leaves old authority; post-commit failure recovers forward and never merges/reassigns/reactivates customer grant.   |
| R9 selected/excluded hierarchy  | Add one selected consumer trust plus JIT `USER`, and one personnel-only exclusion; prove prompt-free app-bound SSO and denial                                                                                                  | Disable exact trust/policy; revoke affected app sessions; root session and unrelated apps remain contained.                                                            |
| R10 second licensed root        | Deploy isolated Auth/User DB, Redis, issuer/keys and same-email subject; prove no lookup/session/key/membership collision                                                                                                      | Disable second-root traffic; never flatten its data into default realm.                                                                                                |
| R11 continue F4                 | Audit/enforce final realm+subject constraints, remove eligible bare-global actor columns/readers without rewriting history, then resume invalidation/domain slices and rerun earlier verifiers                                 | Before removal use additive readers; after second-realm writes/removal never flatten identity—restore/reconcile forward.                                               |

## Local/Test Versus Production Boundary

F4 functional proof uses separate database names/roles, Redis instances or
strictly isolated endpoints, issuers, secrets/keys, and Auth/User deployments
for the default and second licensed-root realms. They may share one local
Docker host and PostgreSQL server process, because that is test placement—not
shared identity tables or keys.

An upper-enterprise production claim additionally requires per-realm placement,
HA/failover, authoritative-primary behavior, restore fencing, capacity/noisy-
neighbor limits, and sustained per-realm plus federated login/logout load.
Those are mandatory production-readiness requirements but their infrastructure
implementation belongs in F9 and has not been silently added to that phase.

## Resolved And Consultation Register

1. **Historical root split — resolved.** Retain the existing subject UUID in
   the default licensed-root realm as the main tenant's `TENANT_ADMIN` and
   explicit `PARENT_MANAGER`. Create a distinct platform-operator-realm
   subject, credentials, session, and `PLATFORM_ADMIN`; atomically revoke the
   old customer PlatformGrant only after operator recovery and v3 route proof.
2. **Legacy active sessions — resolved.** A valid legacy family may perform one
   bounded upgrade into the exact verified presenting legacy-compatible
   default application. It cannot select an audience or enter federation. A
   durable bridge plus credential/session generation CAS prevents upgrade from
   escaping exact logout, logout-all, or password change. Non-upgraded sessions
   expire or are revoked at window close.
3. **F3 evidence notes.** Current source and the F3 commit show that split login
   existed when F3 closed. F3 proved the external boundary and normal login/
   logout flows, but not atomic credential-to-token binding, password session
   invalidation, Redis HA, or realm isolation. Adding non-rewriting scope notes
   to the two F3 reports requires Salar's cross-phase approval.
4. **Later-roadmap amendments.** F6/F7/F8/F9, D4/D5/P1, M6/M7, the Foundation
   exit, and the deferred enterprise split need proposed realm wording. Per the
   consultation guardrail, none is changed yet.

## Second-Pass Status

The adversarial pass has already caught and corrected the Batch 2 handoff,
User seed description, context-v2-as-final wording, absolute cross-tenant
denial inside F4, normal-development membership count, ambiguous tenant-role
cardinality, legacy-session application inference, a logout-all/legacy-upgrade
race, an exact-logout/upgrade race, and v3 issuance before receiver readiness.
The session races are contained by separate durable Auth generations and a
terminal bridge state machine; the ordering contradiction is contained by
receiver-first cohort cutover and drain/revoke-only rollback.

The final owner pass also closed four schema/migration ambiguities: each
licensed root has one immutable non-revoked default consumer realm without a
public fallback; login identifiers carry a closed normalization version; and
password/session state crosses service-owned stores only through bounded,
source-owned, encrypted, HMAC-manifested migration artifacts under a fail-closed
mutation barrier—not direct database access or asynchronous dual authority.
Domain actor/owner records use the explicit realm/subject pair rather than
leaving each service to choose an opaque wrapper.
The final negative-ambiguity pass also selected one atomic Realm Auth local
login and assigned the only internal one-use SSO grant to the issuing Realm Auth
PostgreSQL primary; credential login and legacy upgrade cannot fall back to that
grant. Its random `rsg1_`, digest-only storage, PKCE/request/redirect binding,
single-consumption target-session link, and lost-response behavior are now
exact. The same pass made R4 operator preparation non-issuing; only R8 may
activate the operator cohort on R5 receivers, prove no-grant denial, perform the
transactional grant swap, and then recover forward if the post-commit operation
proof fails.

The final review covers clean order/reruns, historical audit/outbox
immutability, partial migration, concurrent password/login and logout/upgrade,
missing legacy token version, stale replica/Redis, gateway/route/provider/key
failure, selected versus excluded trust, unrelated-root same-email collision,
context mixed-version/downgrade denial, forward recovery, and rollback cut
lines. No implementation or runtime claim was used to close this design gate.

## Batch 1R Exit

- [x] ADR-0014 and ADR-0015 form one internally consistent governing decision;
      older F4 identity-global clauses remain explicitly superseded history.
- [x] Every durable record, secret, key, route, session, generation, actor
      reference, audit, and outbox fact has one owner and an explicit forbidden
      owner.
- [x] R0-R11 define additive order, traffic gates, fail state, recovery, and the
      last safe rollback boundary without authorizing implementation.
- [x] The adversarial pass found no unresolved decision capable of changing the
      first Batch 3R schema. Later F3-note and F6/F7/F8/F9/domain-roadmap edits
      remain consultation-gated, but do not block the frozen F4 design.
