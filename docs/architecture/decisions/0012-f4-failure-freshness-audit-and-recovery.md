# ADR-0012: F4 Failure, Freshness, Audit, And Recovery

Date: 2026-08-24

Status: accepted for the F4 Batch 1 failure-oriented decision; design only, not
yet implemented.

Amended 2026-08-31 by [ADR-0014](0014-f4-customer-identity-realms-and-federation.md):
authority revision/cache/audit rules remain accepted. Realm credential
generation, durable active sessions, issuer/audience/key/trust failure,
root-to-application revocation, authoritative-primary security reads, and
realm-contained recovery are added; one global Auth token version is no longer
the target.

[ADR-0015](0015-f4-identity-realm-record-and-migration-freeze.md) freezes the
primary-database credential/session generation CAS, terminal legacy-session
bridge and upgrade fail state, separate Auth/Authority outboxes, and forward-
only recovery rules.

## Decision Scope

This ADR freezes F4 behavior for:

- authority availability and bounded safe-degraded public reads;
- stale membership, role, lifecycle, application, and relationship decisions;
- forged scope and poisoned authorization caches;
- partial schema/data/contract migration;
- cross-database reference races;
- storage moves, including the later public-file rename operation;
- parent-path misuse;
- common S2S key, cache-key, epoch-key, audit-key, and configuration compromise;
- durable authority audit ownership and retention.

It records prevention, detection, containment, fail state, recovery, evidence,
and residual risk. It does not create a service, database, schema, migration,
cache, outbox, audit table, storage worker, or runtime contract.

## Repository Evidence And Classification

The following mechanisms already satisfy part of the requirement and must be
preserved:

- `@nebula/grpc-auth` binds caller, target, operation, body, context digest,
  request ID, time, nonce, and pairwise key. Replay-store failure rejects the
  call. Current plus time-limited previous keys support rotation.
- Auth-service validates its JWT/session state and live per-user token version.
  Authority membership invalidation must remain separate so one tenant cannot
  destroy a global session used in another tenant.
- Gateway application resolution has an `ApplicationRegistry` replacement seam
  and currently uses a validated static single-site registry.
- Each service owns readiness for its database, replay store, and applicable
  storage/Redis dependencies. Degraded readiness is sanitized HTTP `503` and
  never changes business lifecycle.
- Domain services perform their own resource checks and use typed clients for
  current cross-service lookups.
- Media already separates database metadata from object storage and has bounded
  delete preview/confirmation, checksum/metadata checks, and lane-specific
  access policy.

These are **working mechanisms**, not replacement targets.

The following are **confirmed unmet F4 requirements**:

- no persistent authority, authority decision cache, revision invalidation
  outbox, or authority availability policy exists yet;
- no durable authority audit exists; current User/Settings changes and strict
  Media access have either no audit history or transitional service logs;
- cross-service validation cannot be atomic with a consumer database write;
- F4 scope backfills and storage prefix moves have not been implemented;
- current domain schemas cannot independently contain a falsely resolved
  tenant/site because ADR-0011 ownership columns do not exist yet.

The absence of a general event platform, separate audit service, distributed
transaction coordinator, service mesh, hardware-backed key store, or
multi-region authority is an **optional hardening or future scaling
consideration**, not required F4 work.

## Operation Classes And Authority Availability

Every protected operation is assigned one server-owned class. A client cannot
select or downgrade the class.

| Class                       | Included operations                                                                                                                                                                                                          | Authority/cache rule                                                                                                                                                                           | Outage result                                                                                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LIVE_REQUIRED`             | authority and application mutations; tenant/site lifecycle; membership/role/parent-link changes; parent actions; platform/recovery/export operations; strict-original access; other explicitly security-sensitive operations | Resolve live for this normalized operation. A carried or cached decision cannot replace the live call.                                                                                         | Sanitized `503`/unavailable before side effects. An authorization denial remains `401`/`403` only when dependencies were available and actually denied it. |
| `BOUNDED`                   | authenticated self operations, normal content/cart/order actions, ordinary administrative reads, and non-security-sensitive writes after their exact route policy is frozen                                                  | A verified positive decision may be reused only until 15 seconds after `resolvedAt`. Push invalidation normally removes it sooner. There is no stale-on-error extension.                       | A still-fresh decision can finish within the 15-second ceiling; once refresh is required or an outage is detected, deny with sanitized `503`.              |
| `PUBLIC_READ_SAFE_DEGRADED` | explicitly allowlisted anonymous public `GET`/`HEAD` operations returning only already-public domain projections                                                                                                             | Normal freshness is 15 seconds. If authority becomes unavailable, the exact last verified positive application/tenant/site/lifecycle decision may be used until 60 seconds after `resolvedAt`. | Continue only inside the 60-second absolute age and only if independent domain public-state/scope checks pass; otherwise sanitized `503`.                  |

`PUBLIC_READ_SAFE_DEGRADED` excludes login, refresh, personalized content,
signed read URLs, protected/strict Media, previews, downloads, carts, orders,
writes, admin routes, parent paths, exports, recovery, and authority mutation.
It never turns an unknown application/site into the default site. A missing,
invalid, contradictory, negative, or already-expired entry denies; outage does
not reset or extend its age.

The 60-second public window deliberately trades a bounded delay in public
suspension visibility for storefront availability. It reveals only content the
domain still marks public. All private or mutating behavior keeps the stricter
15-second/live fail-closed rules.

## Freshness And Invalidation Contract

1. Authority advances the exact target/component revision in the same database
   transaction as every relevant lifecycle, application, relationship,
   membership epoch, or grant change.
2. That transaction inserts a versioned invalidation event into an
   authority-owned transactional outbox. Redis/pub-sub delivery alone is not a
   commit record.
3. An idempotent dispatcher publishes invalidation by affected tenant, site,
   application, membership epoch, relationship, and entitlement reference as
   applicable. Consumers purge only matching entries.
4. Consumers compare exact revision and epoch facts when available. Missed,
   delayed, duplicated, or reordered invalidations cannot extend a decision
   past its absolute 15-second age.
5. Context with `resolvedAt` more than five seconds in the future is invalid.
   Clock synchronization is operationally required; clock uncertainty never
   grants extra freshness.
6. A revoked-to-reinvited Membership creates ADR-0011's new immutable epoch and
   HMAC-derived `membershipEpochRef`. The old epoch never becomes current, even
   if a stale cache, outbox replay, restore, or deployment rollback carries it.
7. Auth continues to enforce global identity/session/token version. Authority
   cache validity cannot override an Auth denial, and Auth validity cannot
   manufacture current scoped authority.

Outbox age, undispatched count, invalidation delivery failure, cache age, live
resolution latency/error rate, clock skew, stale-epoch denial, and purge counts
are readiness/alert evidence. A dispatcher outage degrades readiness and is
recovered by replaying committed outbox rows; it does not roll back the durable
authority mutation or extend cache TTL.

## Cache Integrity And Poisoning Containment

Authorization caches are optional performance mechanisms, never alternative
authorities. Each consuming service owns its cache and follows these rules:

- cache only positive results received through the typed, pairwise-authenticated
  authority contract; forged public values never fill the cache;
- use a versioned canonical key containing the operation class, normalized
  operation, actor kind and verified identity/session reference when present,
  application, exact target, authorization path, resource selector when
  applicable, and membership/relationship facts;
- HMAC the canonical cache key and authenticate the serialized entry with a
  dedicated per-consumer cache-integrity key. Raw client strings are neither
  Redis key fragments nor trusted cached fields;
- include schema version, purpose, key hash, resolved/expires times,
  `authorityRevision`, applicable `membershipEpochRef`, and the exact decision
  facts in the authenticated entry;
- reject unknown fields/versions, signature mismatch, key/value mismatch,
  future time, expired age, wrong consumer/operation/target, or contradictory
  scope. Delete the entry and emit a safe reason-code metric;
- never use a negative cache entry as proof of identity or authority. Invalid
  attempts are controlled by rate limits and bounded request validation;
- namespace F4 cache keys separately from Auth sessions, gateway
  rate/idempotency state, S2S replay keys, and application-registry
  compatibility data;
- apply bounded entry count/size and expiry so attacker-selected resource IDs
  cannot create unbounded cache growth.

Cache-integrity keys are distinct per consumer and must not reuse JWT, S2S,
membership-epoch, application-registration, delete-confirmation, audit, or
storage credentials. Current and previous cache keys may overlap only for a
bounded receiver-first rotation window. A Redis compromise without the
consumer key can delete entries and cause availability loss but cannot create a
valid authorization entry. Compromise of both Redis and that consumer's key is
contained by the 15-second age, exact target/operation binding, independent Auth
and domain checks, and live-required operations; it is not fully eliminated.

## Durable Authority Audit

Authority-service owns an append-only `AuthorityAuditEvent` aggregate in its
own PostgreSQL database. No separate audit service is created. Domain services
continue to own domain audit records for their resource actions.

Authority audit is mandatory for:

- tenant/site/application lifecycle and registration changes;
- membership epoch and role-grant changes;
- parent-link proposals, acceptance, suspension, revocation, and every parent
  action attempt/result;
- platform, recovery, export-authorization, and last-admin operations;
- entitlement-scope reference administration;
- authority/cache/key recovery and security override operations.

Each event records only the necessary non-secret facts: immutable event ID,
event/schema version, time, actor global user ID plus membership/epoch or
platform-grant reference, authorization path, exact operation, application and
channel, caller/target service, target tenant/site/resource, relationship when
applicable, request ID, result and stable reason code, authority revision,
old/new state references or minimized canonical diffs, and integrity key ID.
It excludes tokens, credentials, signing material, raw sessions, signed URLs,
request/response bodies, parent-hidden profile data, and arbitrary error text.

The table is insert-only to the runtime database role. Updates and ordinary
deletes are denied. Events are chained with a dedicated-key HMAC over the
canonical event plus the previous event hash within the audit partition; the
secret is outside the database and only its key ID is stored. This provides
tamper evidence, not protection against simultaneous database, application,
and key compromise.

Authority audit retention is 365 days. Monthly partitions may be removed only
by an explicit retention job after expiry, legal-hold evaluation, final chain
seal/check, and a separately audited destruction record. Backups containing
audit data follow the same approved retention ceiling unless a documented legal
hold requires longer retention.

Authority mutations write their audit event in the same database transaction
as the state/revision/outbox change. If that insert fails, the mutation rolls
back. Cross-database parent/platform/recovery actions use an authority audit
intent before the domain action and an idempotent completion/failure event
afterward; an unavailable audit owner prevents the intent and therefore the
action. Incomplete intents are reconciled and remain visible. When the authority
database itself is unavailable, the denied attempt can produce only sanitized
operational security logs/metrics; no code may claim it was durably audited.

## Forged Scope And Parent Misuse

The following checks remain independent and conjunctive:

```text
registered active application and exact external identity
AND live Auth identity/session when required
AND verified caller/target S2S edge and exact operation
AND current authority target/membership/role/relationship decision
AND owning domain row tenant/site/resource/lifecycle policy
AND durable audit when the operation class requires it
```

Public headers, bodies, queries, routes, filenames, storage paths, cache keys,
job/event payloads, and unverified JWT claims remain selectors only. Context v2
is accepted only under ADR-0010 purpose/method rules. A domain mutation includes
verified tenant/site in its database predicate; loading a global ID and checking
afterward is insufficient.

Parent authorization additionally requires a live `PARENT_MANAGER` grant, the
exact active direct relationship ID, explicit direct-child target, narrow
operation allowlist, privacy-minimized response, and durable intent/result
audit. Sibling, reverse, transitive, wildcard, last-selected, and client-carried
parent targets deny. Parent operations are `LIVE_REQUIRED`; a cached parent
decision never authorizes an outage path.

## Partial Migration And Mixed Runtime

Every migration slice uses ADR-0011's nullable-add/backfill/audit/enforce/non-null
order and ADR-0010's receiver-first contract rollout. In addition:

1. A service publishes a versioned scope-enforcement capability and reports not
   ready for a target slice if schema, backfill manifest, constraints, context
   reader, or required owner contract is missing.
2. Gateway/authority does not route a second tenant/site or context-v2-only
   operation to a service until every replica reports that exact capability.
3. Shadow comparison may observe old/new decisions but old data, role strings,
   static registry entries, or default-site inference cannot authorize a target
   that the new path denies.
4. Enforcement is enabled per complete operation/service slice, never by one
   global flag that creates half-migrated behavior.
5. A manifest mismatch, null/contradiction/orphan count, absent index/FK/check,
   mixed context rejection, or old replica blocks cutover and degrades
   readiness. It is not repaired by silently assigning the default site.
6. Rollback stays inside ADR-0011's data boundary. Referenced authority IDs,
   immutable membership epochs, audit/outbox facts, and intentionally duplicated
   scoped values are reconciled, not regenerated or flattened.

## Cross-Database Reference Races

F4 does not introduce distributed transactions. A consumer write follows this
protocol:

1. Resolve its verified target and validate the referenced owner record through
   the typed owner contract, receiving exact ID, tenant/site, lifecycle, and
   owner revision.
2. Write only the validated canonical ID in the consumer's local transaction,
   together with its normal scoped row and idempotency/audit evidence.
3. Owner records used cross-service are tombstoned or lifecycle-disabled before
   destructive cleanup; their IDs are never reassigned to another site.
4. Revalidate at every security-sensitive use/render/checkout where owner state
   matters. A stale reference can become unavailable but can never inherit a
   different tenant/site identity.
5. Run idempotent post-write/periodic reconciliation against owner exports.
   Quarantine or hide unresolved records according to the owning domain's
   lifecycle; never substitute a raw URL, label, default, or similarly named ID.

If an owner changes between validation and commit, the consumer may temporarily
contain an unusable reference. Independent target checks, immutable ownership,
and revalidation contain this as an availability/consistency failure rather
than cross-site authorization. Operations needing stronger atomicity must be
designed later around an owner reservation/version contract; F4 does not claim
atomic cross-database writes.

## Storage Move And Rename Recovery

F4 prefix migration and F5 public rename/move use one recoverable state model:

```text
PLANNED -> COPYING -> VERIFIED -> METADATA_SWITCHED -> CLEANUP_PENDING -> COMPLETE
   |          |          |               |                  |
   +----------+----------+---------------+------------------> FAILED
```

- A service-issued operation ID and database reservation bind exact Media ID,
  verified tenant/site, source/destination provider/bucket/key, expected size,
  checksum/ETag policy, and requested display/folder metadata.
- Source and destination are canonicalized and proven inside approved roots.
  Client paths never become storage authority.
- Destination uniqueness is reserved before copy. Retry with the same operation
  ID is idempotent; a different operation cannot claim either active target.
- Copy precedes checksum/size verification. Reads continue from the source until
  a local database transaction switches Media metadata to the verified target.
- Source deletion occurs only after the metadata switch and a bounded safety
  interval. Failure before switch deletes only a verified temporary
  destination; failure after switch retains both objects and retries cleanup.
- Rename preserves Media ID, bytes, checksum, ownership, access class,
  lifecycle, and all Product/Blog references. Image editing is a separate
  immutable derivative operation.
- Reconciliation detects stuck operations, missing source/destination, checksum
  mismatch, duplicate physical key, metadata/object disagreement, and orphan
  bytes. Uncertain Media is non-renderable until reconciled.

No cleanup worker deletes an object from a computed, unresolved, wildcard, root,
or tenant-unverified path. Recovery resumes from durable state; it never guesses
which copy is authoritative from timestamps or filenames alone.

## Key And Configuration Compromise

The existing pairwise S2S trust map and current/previous receiver-first rotation
are preserved. F4 adds separate authority revision, cache-integrity,
membership-epoch, and audit-integrity keys; none may reuse another purpose's
secret. Key IDs are loggable, secrets are not.

On suspected compromise:

1. identify the exact key purpose/edge and disable affected writes or mark the
   dependent operation classes unready;
2. install new receiver trust first, switch writers, expire the compromised key
   without extending the normal overlap, and remove it after evidence passes;
3. purge affected decision/public caches and S2S replay state, advance relevant
   authority revisions, and re-resolve current membership/application/target;
4. inspect audit-chain, request/reason metrics, replay denials, anomalous target
   access, and configuration fingerprints; reconcile affected state before
   reopening;
5. if scope cannot be bounded to one edge/purpose, contain as common-mode
   compromise: fail every affected protected operation, rotate all possibly
   exposed keys, rebuild caches from durable owners, and require explicit
   operational recovery approval.

Startup validates closed configuration schemas, pairwise caller/target maps,
unique key IDs/secrets, required secret lengths, and forbidden reuse where the
process can observe it. Services publish only non-secret configuration
fingerprints for comparison. Matching fingerprints improve detection but never
prove that a shared value is correct. A compromised authority operator or
common deployment secret/config source can still misconfigure multiple layers;
independent Auth, S2S, domain ownership, audit, and restore evidence reduce but
cannot eliminate that risk.

## Complete Failure Matrix

| Failure                         | Prevention                                                                                              | Detection                                                                       | Containment and fail state                                                                                 | Recovery                                                                            | Required evidence                                                                             | Residual risk                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Authority unavailable           | Operation classes; 15-second ceiling; 60-second anonymous-public-only window; no stale extension        | readiness, resolution errors/latency, cache age                                 | Live/authenticated/write/admin/parent/export/recovery deny; exact public reads only within absolute window | restore authority DB/service, replay outbox, purge/rebuild cache, recheck revisions | outage before/during each class; public 59-second allow and 60-second expiry denial; recovery | up to 60 seconds of already-public content may remain visible after suspension |
| Stale membership/role/lifecycle | transactional revision + outbox; immutable epoch; 15-second ceiling; live-sensitive actions             | stale revision/epoch denials, outbox lag, cache-age metrics                     | affected exact actor/target; no global-session deletion or cross-target grant                              | replay invalidation, purge, re-resolve; uncertain grants inactive                   | revoke/reinvite/downgrade/suspend with lost/late/duplicate invalidations                      | ordinary in-flight/cached operations may complete inside 15 seconds            |
| Forged scope/context            | gateway registration, Auth, strict context v2, pairwise S2S, exact DB predicate                         | raw/duplicate/mismatch tests and reason metrics                                 | no default/JWT/header/body/path/cache fallback; scoped not-found/deny                                      | correct authoritative records/config; invalidate forged artifacts                   | wrong tenant/site/app/channel/role/resource/caller/target/purpose                             | multiple compromised trust layers can still misgrant                           |
| Cache poisoning                 | canonical HMAC key/value, per-consumer key, positive typed fills only, bounds/TTL                       | signature/key/value/version/time mismatch; unusual miss/size rates              | delete entry; resolve live or fail; Redis-only attacker causes availability loss                           | rotate cache key, flush namespace, rebuild from authority                           | forged/swapped/replayed/oversized entry; Redis outage/restore                                 | cache plus consumer-key compromise lasts up to TTL unless live-required        |
| Partial migration               | per-slice readiness/capability gate; nullable/backfill/audit/enforce sequence                           | ADR-0011 zero audits, schema introspection, mixed-version and replica inventory | block second scope/cutover; no silent default backfill                                                     | stop slice, restore/reconcile, redeploy compatible replicas                         | old/new replica, partial backfill/index, rollback with scoped duplicates                      | bad manifest/script may be consistently wrong across services                  |
| Cross-DB reference race         | immutable owner scope/IDs, typed prevalidation, tombstones, use-time revalidation                       | owner export/orphan reconciliation and revision mismatch                        | unresolved reference unavailable/quarantined; never rebind by name/default                                 | correct/revalidate/compensate or remove reference through owner policy              | owner disable/delete between validate/commit and during use                                   | temporary unusable references; no atomic guarantee                             |
| Storage move/rename             | durable state, canonical roots, reservation, copy/verify/switch/delete                                  | stuck-state, checksum/size/key/orphan reconciliation                            | reads old until switch; retain both after switch failure; uncertain media hidden                           | idempotently resume/compensate from durable state and manifest                      | failure/retry at every state, collision, missing object, rollback                             | provider may report misleading metadata; restore rehearsal remains necessary   |
| Parent misuse                   | live direct edge + exact role/target/operation + minimal response + audit                               | sibling/reverse/transitive/private-field/intent-without-result evidence         | parent path always live-required and fails closed; no cached outage access                                 | suspend link/grant, reconcile incomplete intents, rotate/revision purge             | allowed child plus sibling/grandchild/reverse/privacy/audit-outage denial                     | compromised authority/platform operator may create a false direct link         |
| Common key/config compromise    | pairwise/purpose-separated keys, closed config, receiver-first rotation, independent Auth/domain checks | key ID/config fingerprints, replay/audit/access anomalies                       | disable affected edge/classes; broad uncertainty fails all affected protected work                         | rotate, purge, revision advance, audit/reconcile, explicit reopen                   | single-edge and common-source compromise drills; expired previous-key denial                  | simultaneous owner/operator/key compromise can defeat several controls         |

## Audit And Alert Evidence

The implementation checklist must produce:

- exact operation-to-class inventory;
- cache key/value canonical test vectors without real secrets;
- expiry boundary tests at 15 and 60 seconds plus future-clock denial;
- invalidation outbox transaction, retry, ordering, duplication, backlog, and
  recovery evidence;
- authority outage tests for every class and proof that `503` is not translated
  into `401`/`403`;
- audit insert-only permissions, atomic mutation rollback, chain verification,
  intent/result reconciliation, retention/legal-hold/destruction tests, and
  secret/payload exclusion checks;
- cache poison/swap/replay/cross-target tests and namespace/size limits;
- cross-database owner-race and reconciliation tests;
- every storage-state failure/retry/rollback and path-boundary test;
- direct-child parent allow plus sibling/reverse/transitive/privacy denial;
- pairwise and common-source key/config compromise/rotation drills;
- backup/restore evidence proving immutable MembershipEpoch, audit/outbox facts,
  authority revisions, scoped data, and storage manifests remain consistent.

Long builds, Docker/Compose, full e2e, live scans, and disaster rehearsals remain
user-run evidence under the roadmap guardrail. Focused unit/contract and
documentation checks remain agent-run when implementation begins.

## Compatibility And Rollback

F3 remains frozen. This ADR changes documentation only. Later work adds
authority, revision/outbox/audit, caches, and scope enforcement beside the
current static default-site path and switches one complete operation slice at a
time.

Before new authority facts are authoritative, rollback can remove additive
runtime components. After audit/outbox/revision, MembershipEpoch, domain scope,
or storage-move records exist, rollback preserves and reconciles them. It never
extends expired cache entries, reuses an epoch, deletes audit history early,
turns an unresolved reference into a raw fallback, restores a compromised key,
or guesses storage ownership.

## Repository Evidence

- `packages/grpc-auth/src/s2s.guard.ts`
- `packages/grpc-auth/src/s2s-replay.store.ts`
- `packages/grpc-auth/test/s2s.guard.security.spec.ts`
- `apps/auth-service/src/auth/token/access-token-validation.service.ts`
- `apps/gateway/src/application/application-registry.ts`
- `apps/gateway/src/state/gateway-idempotency.service.ts`
- all service health controllers and `docs/architecture/testing-and-health.md`
- `deploy/.env.production.example` and `docs/packages/config.md`
- Product/Blog/Order/Taxonomy/Settings typed cross-service call paths
- Media schema/service/storage/delete behavior and `docs/services/media-service.md`
- [ADR-0004](0004-f4-authority-lifecycle.md)
- [ADR-0007](0007-f4-parent-relationships.md)
- [ADR-0008](0008-f4-scoped-roles.md)
- [ADR-0009](0009-f4-authoritative-request-scope.md)
- [ADR-0010](0010-f4-signed-context-compatibility.md)
- [ADR-0011](0011-f4-data-scope-and-migration-matrix.md)
- `docs/reports/2026-08-24-f4-authority-audit.md`
