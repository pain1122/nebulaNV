# ADR-0015: F4 Identity-Realm Record And Migration Freeze

Date: 2026-08-31

Status: accepted. This closes the F4 Batch 1R design gate only. It authorizes
no Prisma, migration, proto, runtime, key, session, federation, traffic, or
deployment change by itself.

## Decision Scope

ADR-0014 selected isolated licensed-root identity realms. This ADR freezes the
exact owner/record, identifier, compatibility, migration, traffic-gate,
rollback, and deployment boundaries needed before the first corrective schema
is written.

It preserves completed F3 and F4 evidence, including the static
`ApplicationRegistry` seam, four persistent application registrations,
Membership IDs, immutable MembershipEpoch history, role grants, `meg1_`
references, audit chains, outbox rows, target resolver, strict context-v2
receiver, Auth rotation/replay checks, typed clients, independent service
databases, and domain authorization.

## Approved Administrator Split

The former default `root-admin` identity currently holds both the main
tenant's `TENANT_ADMIN` and the platform `PLATFORM_ADMIN`. The approved target
is:

1. Preserve its existing UUID as the subject ID in the default licensed-root
   customer realm.
2. Preserve its main-tenant Membership, MembershipEpoch, `TENANT_ADMIN` grant,
   and historical audit/outbox identity.
3. Give that customer subject a separate explicit `PARENT_MANAGER` grant when
   operating the approved central-parent hierarchy. `TENANT_ADMIN` still
   governs its own tenant/sites; `PARENT_MANAGER` alone governs one exact
   direct subordinate path.
4. Create a distinct subject with distinct credentials/sessions in the
   platform-operator realm for `PLATFORM_ADMIN`.
5. In one Tenant Authority transaction, activate the new operator
   `PlatformGrant`, terminally revoke the old customer's PlatformGrant, advance
   revisions, and write audit/outbox evidence. Never reassign the old grant row
   to a different subject.
6. Verify the new operator subject and recovery path before that transaction.
   Any failure leaves the old platform grant active; successful commit leaves
   no customer-realm subject with platform authority.

The same human may control both accounts, but the subjects, login ceremonies,
credentials, sessions, audiences, and grants remain separate. A platform
session grants no automatic customer-data access, and a customer session
cannot perform platform recovery.

The original schema permits at most one active tenant-role grant per membership
epoch. The corrected target permits at most one active grant **per tenant role**
for an epoch, so `TENANT_ADMIN` and `PARENT_MANAGER` may coexist. They are never
unioned or ordered: the resolver selects the one exact role eligible for the
operation and target path, and ambiguity denies. This is an additive target
constraint change; existing grants and epochs are not regenerated.

Future licensed roots receive their own explicitly provisioned customer-realm
administrator. They never enter the bounded legacy-role importer and never
receive `PLATFORM_ADMIN` merely because they are a licensed root.

## Closed Vocabularies And Lifecycle Semantics

The first schema must use these closed values; implementation may not invent a
new owner or trust meaning while applying this ADR:

- realm kind: `PLATFORM_OPERATOR`, `LICENSED_ROOT_CONSUMER`,
  `LICENSED_ROOT_WORKFORCE`, `SUBORDINATE_CONSUMER`, or
  `SUBORDINATE_WORKFORCE`;
- principal class: `PLATFORM_OPERATOR`, `CONSUMER`, or `WORKFORCE`;
- identity-provider kind: `NEBULA_LOCAL`, `OIDC`, or `SAML`;
- login-identifier kind: `EMAIL` or `PHONE`; identifier state:
  `PENDING_VERIFICATION`, `ACTIVE`, or terminal `REVOKED`; normalization
  version: `EMAIL_LOWER_TRIM_V1` or `PHONE_PLUS_DIGITS_V1`, matching the kind;
- realm/subject lifecycle: `PROVISIONING`, `ACTIVE`, `SUSPENDED`, or `REVOKED`;
- provider/trust lifecycle: `PENDING_VERIFICATION`, `ACTIVE`, `SUSPENDED`, or
  `REVOKED`;
- application-policy lifecycle: `DRAFT`, `ACTIVE`, `DISABLED`, or `RETIRED`;
- session lifecycle: `ACTIVE` or `REVOKED`; expiry is also denied from the
  authoritative timestamp and need not wait for a state rewrite;
- legacy-session bridge state: `PENDING`, `CONSUMED`, or `REVOKED`;
- root-SSO exchange-grant state: `PENDING`, `CONSUMED`, or `REVOKED`, with
  expiry denied from the timestamp;
- trust mode: `LOCAL_LOGIN`, `EXTERNAL_LOGIN`, or `ROOT_SSO_EXCHANGE`;
- legacy compatibility is the separate bounded
  `LEGACY_DEFAULT_UPGRADE` application-session mode, never a federation trust;
- application login mode is an explicit non-empty set of `LOCAL_LOGIN`,
  `EXTERNAL_LOGIN`, `ROOT_SSO_EXCHANGE`, and `LEGACY_DEFAULT_UPGRADE`.

`PROVISIONING`, `PENDING_VERIFICATION`, `DRAFT`, `SUSPENDED`, `DISABLED`,
`REVOKED`, and `RETIRED` never admit a new login/session/trust decision.
`SUSPENDED` and `DISABLED` may recover only through their audited owner
workflow. `REVOKED` and `RETIRED` are terminal; replacement uses a new record or
revision. SCIM is provisioning/deprovisioning integration, not a login or trust
mode.

Realm kind fixes its one principal class: `PLATFORM_OPERATOR` maps to
`PLATFORM_OPERATOR`, every `*_CONSUMER` maps to `CONSUMER`, and every
`*_WORKFORCE` maps to `WORKFORCE`. A subject cannot change class; moving between
classes creates a separately authorized subject. The context
`authenticationAuthorityRef` is exactly the verified
IdentityProviderRegistration UUID, including a `NEBULA_LOCAL` registration for
local credentials; it is never a provider name or unverified issuer string.
`EMAIL_LOWER_TRIM_V1` preserves current-source compatibility by applying the
Node string `trim().toLowerCase()` result once inside Auth. The project-owned
`PHONE_PLUS_DIGITS_V1` accepts only
`^\+[1-9][0-9]{1,14}$` and performs no rewriting or region guessing. A legacy
phone that does not match is quarantined from login until an audited
verification flow replaces it; no caller chooses a normalization version.

## Approved Local-Credential Login

Local credential login is one Realm Auth-owned `Login` operation. The gateway
submits the identifier/password and the already resolved application/audience
through one request-bound signed RPC; it never receives a subject ID and then
asks a second method to mint tokens for that subject. Realm Auth owns identifier
normalization, credential verification, and session issuance.

Password hashing need not hold a database lock. After verifying the candidate
hash, Realm Auth opens one primary-database transaction, locks `RealmSubject`
then `LocalCredential`, and rechecks the subject/credential lifecycle, exact
credential row and revision, both Auth generations, `NEBULA_LOCAL` registration,
and application/audience before creating `AuthSession`. A concurrent password
or subject change makes that comparison fail and returns no token; the caller
must retry the login ceremony. Tokens are returned only after commit.

There is no `CREDENTIAL_LOGIN` one-use grant or compatibility fallback. This is
the narrow replacement for the current unbound `ValidateUser` then
`GetTokens(userId)` gateway sequence. One-use durable grants are reserved for
root-application SSO; legacy-session upgrade is owned only by
`LegacySessionBridge`.

## Approved Legacy-Session Upgrade

Existing sessions contain no realm or application audience. They are not
assigned to a subordinate or arbitrary audience. During one bounded,
server-configured compatibility window, a valid legacy refresh family may be
upgraded once into the exact verified **presenting legacy-compatible default
application**.

The upgrade requires all of the following:

- the gateway already resolved one of the explicitly allowlisted original
  default applications and its active policy;
- the session, refresh hash/token ID, token version, subject, and default-realm
  mapping are current and active;
- the subject's migrated credential generation still equals the generation
  assigned to that legacy family;
- the legacy token version maps to the subject's current durable
  `sessionGeneration` and is compared again while creating the new session;
- the policy permits only `LEGACY_DEFAULT_UPGRADE`, never subordinate exchange,
  another realm, another license, or a client-selected audience;
- the new expiry is no later than both the old remaining refresh expiry and the
  target application's normal maximum;
- the durable legacy-session bridge row is still `PENDING`, and the upgrade
  locks it together with RealmSubject before consuming the Redis family;
- the bridge has a unique keyed fingerprint and becomes `CONSUMED` with the
  exact new AuthSession ID in the same database transaction that creates that
  session, so a retry cannot create a second session;
- deletion/consumption of the legacy family makes its old access tokens fail
  the existing live-session check;
- success writes an `sr2_` application session and minimized audit/outbox fact;
  raw tokens, session IDs, login identifiers, and password hashes are not
  logged.

Upgrade, current/selected-session logout, and logout-all use the fixed lock
order RealmSubject then legacy bridge. If current/selected logout wins, it
writes a `REVOKED` tombstone before deleting Redis. If upgrade wins, logout
waits, follows the committed target-session link, and revokes that AuthSession
before reporting success. If Redis is consumed but the database transaction
fails, a retry observes the missing family, revokes the bridge, and requires
reauthentication; the old session is never revived. There is no rollback from
an `sr2_` session to `sr1_`. At window close, every non-upgraded bridge/family
is revoked/expired. No legacy family is accepted by root-to-subordinate
federation.

From R6 onward, every legacy access/refresh validation reaches the default
Realm Auth primary through the typed compatibility path and requires a
`PENDING` bridge, matching subject generations, and the existing Redis family.
Either owner denying or being unavailable denies. A bridge tombstone therefore
invalidates the legacy family even if Redis cleanup is delayed; old Auth/Redis
alone can no longer authorize it.

Every session row stores both the credential and session generations observed
at creation. Local login locks RealmSubject then LocalCredential; refresh and
current/selected revocation lock RealmSubject then the exact AuthSession; root
SSO exchange locks RealmSubject, source AuthSession, then
RootSsoExchangeGrant; legacy upgrade locks RealmSubject then
LegacySessionBridge. Each path compares both generations before committing a
new or changed session, and multi-row scans use immutable UUID order.
Logout-all locks RealmSubject, monotonically advances `sessionGeneration`,
revokes active sessions plus pending bridges/exchange grants, and writes its
audit/outbox fact in one transaction. Password change/reset and subject
suspension/revocation lock that subject and advance `credentialGeneration` and
`sessionGeneration` together. No operation reports success before its owner
transaction commits. Therefore an upgrade committed before logout-all is
invalidated by it, while one attempting to commit afterward fails its
generation comparison. Current Auth
`tokenVersion` is migration input for the default realm's initial
`sessionGeneration`. The legacy credential generation is seeded explicitly
(normally `1`), never copied from token version. An active family with no
authoritative current token version is quarantined/revoked; migration must not
invoke the current lazy initializer and guess `1`. Neither raw Auth generation
leaves Realm Auth. Membership generation and `meg1_` are unrelated and are
never reused for this fence.

## Authoritative Record And Owner Matrix

### Tenant Authority control plane

| Record or fact                           | Authoritative owner and minimum fields                                                                                                                                                                                                 | Required constraints and denial                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Forbidden contents/meaning                                                                                           |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `IdentityRealm`                          | Tenant Authority PostgreSQL; UUID, one closed realm kind, nullable owning customer tenant, nullable licensed-root tenant, immutable `isRootDefault`, immutable unique lowercase-UUIDv4 `authRouteRef`, lifecycle, revision, timestamps | Exactly one non-revoked platform-operator realm has null customer/root owners. Root kinds require owner=root; subordinate kinds require the exact direct subordinate owner and licensed root. Exactly one non-revoked root-default realm exists per licensed root and it must be `LICENSED_ROOT_CONSUMER`; the flag/owners never change. IDs immutable; non-active realms never route; a default is never a public routing fallback; tenant-visible lookup cannot enumerate unrelated roots | Password, refresh/access token, provider secret, private key, raw session, endpoint/URL, cross-realm email directory |
| `IdentityProviderRegistration`           | Tenant Authority PostgreSQL; UUID, realm ID, kind (`NEBULA_LOCAL`, `OIDC`, `SAML`), exact normalized issuer/entity/discovery or metadata reference, lifecycle, revision                                                                | Unique active issuer/provider identity inside one realm; exact verification and audience policy; cross-license reuse requires a separately approved trust and is denied in F4                                                                                                                                                                                                                                                                                                               | External password, OAuth client secret, private signing/decryption key, unverified claims                            |
| `ApplicationIdentityPolicy`              | Tenant Authority PostgreSQL; application ID, exact audience, accepted principal classes, session/login mode, current policy revision, lifecycle, bounded legacy-upgrade eligibility                                                    | Exactly one current policy revision per application; default deny; audience change creates a new revision and invalidates affected sessions; four existing registrations receive additive policies without new IDs                                                                                                                                                                                                                                                                          | Credentials, session state, target role, client-selected realm, broad wildcard audience                              |
| `FederationTrust`                        | Tenant Authority PostgreSQL; UUID, policy/application, identity realm, optional provider, principal class, exact audience, trust mode, lifecycle, revision                                                                             | Exact tuple uniqueness; active direct hierarchy/licensed-root eligibility; no parent-edge, sibling, email, branding, network, or public-client inference; no cross-license trust in F4                                                                                                                                                                                                                                                                                                      | Provider secret, bearer/refresh token, implicit transitive trust                                                     |
| Realm-qualified `Membership`             | Tenant Authority PostgreSQL; preserve Membership ID, tenant ID, `identityRealmId`, `subjectId`, state, current epoch, revision                                                                                                         | Unique `(tenantId, identityRealmId, subjectId)`; realm belongs to an eligible hierarchy; subject existence is verified through a typed owner call; ID alone grants nothing                                                                                                                                                                                                                                                                                                                  | Email, phone, profile, password, token, raw session, credential generation                                           |
| `MembershipEpoch` and tenant/site grants | Tenant Authority PostgreSQL; preserve IDs, internal positive generation, `meg1_`, key ID, closed state, exact target and role                                                                                                          | `meg1_` remains unchanged; generation never leaves Authority. At most one active grant per `(epoch, tenantRole)` and per `(epoch, site, siteRole)`; resolver chooses one exact eligible role and denies ambiguity                                                                                                                                                                                                                                                                           | Credential generation, Auth/session state, role hierarchy or permission union                                        |
| Realm-qualified `PlatformGrant`          | Tenant Authority PostgreSQL; grant ID, operator realm ID, operator subject ID, role/state/revision/times                                                                                                                               | `PLATFORM_ADMIN` subject must belong to active platform-operator realm; last-valid-admin protection; old customer grant is retained revoked, never reassigned                                                                                                                                                                                                                                                                                                                               | Customer credential/profile, implicit customer membership, wildcard data-read power                                  |
| Authority audit v2                       | Tenant Authority PostgreSQL; existing chain fields plus realm/subject when actor-bearing, actor membership/grant, application, exact target/path, result/reason/revision                                                               | Existing v1 hashes/payloads immutable; new schema version only; append-only and HMAC chained; privacy-minimized                                                                                                                                                                                                                                                                                                                                                                             | Password/hash, raw token/session, provider secret, unnecessary profile/device data                                   |
| Authority invalidation v2                | Tenant Authority PostgreSQL outbox; aggregate/target, optional realm/subject reference, revision, payload version, retry state/times                                                                                                   | Existing v1 rows decode only as deterministic default-realm Authority facts; idempotent exact aggregate/revision; separate channel/purpose from Realm Auth events                                                                                                                                                                                                                                                                                                                           | Credential/session mutation authority or shared generic event ownership                                              |

Consumer JIT admission uses one audited, idempotent Tenant Authority
transaction to create/reactivate only the exact target Membership, current
epoch, and site `USER` grant allowed by active application policy/trust. It then
calls the ordinary resolver. Authentication never makes a missing Membership
resolve implicitly, and JIT cannot create `EDITOR`, `SITE_ADMIN`,
`PARENT_MANAGER`, `TENANT_ADMIN`, or `PLATFORM_ADMIN`.

### Per-realm Auth security aggregate

Each realm uses a separate logical database, database role, Redis endpoint or
strictly isolated instance, issuer, signing-key set, and Auth deployment. The
same code may be deployed repeatedly; one deployment does not select an
arbitrary customer store from a public request.

| Record or fact                           | Authoritative owner and minimum fields                                                                                                                                                                                                                                                                                | Required constraints and denial                                                                                                                                                                                                                                               | Forbidden contents/meaning                                                                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `RealmSubject`                           | Exact Realm Auth PostgreSQL primary; realm ID, immutable subject UUID, principal class, lifecycle, positive monotonic `credentialGeneration` and `sessionGeneration`, timestamps                                                                                                                                      | Realm ID fixed to deployment; principal class must match the realm kind; password change/reset and suspension/revocation advance both generations; logout-all advances session generation; subject ID is meaningful only with realm                                           | Tenant/site role, cross-realm lookup, email-based link                                                                                      |
| `LoginIdentifier`                        | Realm Auth PostgreSQL; subject, kind, normalization version, normalized value, verification/login state                                                                                                                                                                                                               | Kind/version must match; unique `(realm, kind, normalizedValue)`; same value may exist in another realm; changes are Auth-owned and audited; noncanonical legacy phone denies until replacement                                                                               | Platform-global uniqueness/search, caller-selected normalization, or automatic provider/account merge                                       |
| `LocalCredential`                        | Realm Auth PostgreSQL in the same aggregate transaction; subject, password hash, algorithm/parameters, changed time                                                                                                                                                                                                   | Zero or one active local credential; hash replacement and generation advance commit together; external-only subjects have none                                                                                                                                                | Plaintext password, shared customer credential, membership role                                                                             |
| `ExternalIdentityLink`                   | Realm Auth PostgreSQL; subject, registered provider, exact issuer, provider `sub`, lifecycle                                                                                                                                                                                                                          | Unique exact `(provider, issuer, sub)` mapping; signature/key/audience/provider lifecycle checked; email cannot link                                                                                                                                                          | External password, tenant authorization, copied claims as authority                                                                         |
| `AuthSession`                            | Realm Auth PostgreSQL primary; internal UUID, immutable `sr2_` plus its key ID, subject, observed credential/session generations, provider/auth authority, exact application/audience, family/rotation sequence, current refresh hash/token ID, lifecycle, created/seen/expires/revoked times, minimized device label | Primary-DB compare-and-set serializes creation/rotation/revocation; both generations must still match RealmSubject; raw token never stored; selected/current/all revocation; stale replica and Redis cannot authorize; key rotation never recomputes a live session reference | Raw refresh/access token, membership generation, domain role, multi-audience session                                                        |
| `LegacySessionBridge`                    | Default Realm Auth PostgreSQL during the bounded window; immutable `lsb1_` keyed family fingerprint plus key ID, subject, observed credential/session generations, expiry, state, nullable consumed target-session ID, timestamps                                                                                     | Unique fingerprint; initially inventoried and final-reconciled only from verified active families; fixed subject/bridge lock order; `CONSUMED` and `REVOKED` terminal; missing token version or Redis disagreement denies; row retained through audit/rollback window         | Raw legacy token/session ID, guessed generation, application audience before verified presentation, federation eligibility                  |
| `RootSsoExchangeGrant`                   | Issuing Realm Auth PostgreSQL primary; internal UUID, 32-byte `SHA-256` digest of the `rsg1_` code, source AuthSession, exact target application/audience/request/registered redirect, PKCE S256 challenge, policy/trust revisions, expiry, state, nullable consumed target-session ID, timestamps                    | Active exact application policy and FederationTrust; source session and both generations rechecked; one target session is created and linked in the same primary-DB CAS that consumes the grant; `CONSUMED` and `REVOKED` terminal; replay/downgrade denied                   | Raw exchange code, credential-login proof, legacy-session upgrade, parent refresh token, reusable federation bearer, client-selected target |
| Auth audit and credential/session outbox | Realm Auth PostgreSQL; realm/subject/session/application purpose, generation/sequence, event version, retry state, minimized result/reason/time                                                                                                                                                                       | Same transaction as security mutation; idempotent; separate owner/namespace from Authority outbox                                                                                                                                                                             | Tenant role decision, raw credential/token, general event platform                                                                          |

Realm Auth PostgreSQL primary—not Redis or a standby—is authoritative for
credential/session admission, rotation, generation, and revocation. Existing
Redis Lua rotation/replay semantics are preserved as acceleration and replay
containment, but Redis disagreement cannot mint or revive a session. Standbys
may serve non-authoritative reporting only.

### Profile and domain references

| Record or fact               | Authoritative owner and minimum fields                                                                                                   | Required constraints and denial                                                                                                                                                        | Forbidden contents/meaning                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Realm profile/contact        | Matching realm User/profile database; realm ID plus subject ID and profile/contact fields                                                | Login identifiers change through Auth-owned workflow; profile projection is idempotent and may not activate an unready subject                                                         | Password, refresh token/session, tenant role, unrelated-realm search                                 |
| Target consumer projection   | Exact subordinate application/domain owner; realm+subject, target tenant/site/app, lifecycle, only product-required/consented fields     | Created only after active policy/trust and target JIT; target cannot read parent/root profile by default                                                                               | Parent credential/session, broad identity directory, admin grant                                     |
| Domain actor/owner reference | Each domain database; explicit `identityRealmId` plus `subjectId` columns beside the existing legacy actor/owner column during migration | Optional pairs are both null or both set; tenant/site and resource owner checks remain local; legacy UUID maps only to the deterministic default realm; final readers require the pair | Bare UUID with platform-global meaning, email, unverified provider claim, opaque-wrapper alternative |

For new registration, Realm Auth creates the subject/login/credential aggregate
and an outbox event. The profile consumer creates its row idempotently. A
subject remains `PROVISIONING` and cannot receive an application session until
the required profile projection acknowledges or the flow explicitly supports
an external-only/minimal subject. No distributed database transaction is
invented.

### Key and route ownership

- Realm signing/decryption keys and provider client secrets live in the exact
  realm's secret manager/KMS boundary and are consumed only by Realm Auth.
- Tenant Authority stores public verification/discovery metadata and opaque
  secret/key/route references, never secret values or raw internal URLs in
  tenant-facing responses.
- Gateway maps an authority-approved opaque Auth route reference to a
  deployment-owned typed client. Public realm, tenant, issuer, email, body,
  query, or header values cannot select an endpoint.
- S2S, JWT, session-reference, membership-epoch, audit-integrity, provider,
  and encryption keys remain purpose-separated and independently rotatable.

### Migration-artifact ownership

User-service and current Auth remain the only readers of their existing stores.
They expose no general credential/session migration API and no migration runner
connects directly to both owner databases.

- A migration-only User command emits one bounded credential snapshot for the
  deterministic default-realm subject set: source user UUID, normalized login
  identifiers and versions, password hash with its encoded algorithm
  parameters, source revision/time, migration ID, and keyed record HMAC. It contains
  no plaintext password or profile fields unrelated to login.
- A migration-only current-Auth command emits the active family facts needed to
  create bridges: source subject, internal family/session identity, current
  non-lazy token version, current token/hash evidence, expiry, source time, and
  migration ID. Raw legacy session/token material may exist only inside the
  encrypted artifact and importer memory; Realm Auth persists only `lsb1_` and
  the ordinary hashed session fields required by this ADR.
- Each source signs a canonical manifest with its purpose-separated migration
  integrity key. The complete artifact is envelope-encrypted to the exact
  destination Realm Auth migration key, access-controlled, expiry-bounded, and
  imported idempotently by `(sourceOwner, migrationId, recordHmac)`. Evidence
  retains counts, key IDs, manifest digests, duplicate/orphan results, and
  times—not credential/session material.
- R3 is a non-authoritative shadow snapshot. Immediately before R6, a bounded
  barrier rejects new login/registration, identifier/password, refresh/rotation,
  exchange, and logout mutations with a retryable failure while validation
  continues. No rejected operation reports success. The owners emit/import a
  final snapshot/delta, reconcile counts/digests/families/generations, and then
  switch one configured cohort. Failure before the switch releases the old
  owners unchanged; after the switch Realm Auth is primary and recovery is
  forward-only.
- Encrypted artifacts are destroyed after the documented rollback/audit window;
  their non-secret manifests remain. Password hashes are not rehashed in bulk:
  a later successful local login may upgrade its hash under Realm Auth policy in
  the same credential-generation transaction.

## Identifier And Context Freeze

- Authority roots and grants use immutable lowercase UUIDv4 IDs under ADR-0003.
- The deterministic default/operator realms use predeclared lowercase UUIDv4
  values in the reviewed migration/seed manifest. “Deterministic” means every
  rerun uses those same constants, not a UUID derived from tenant, email,
  issuer, label, or other public/business input.
- `IdentityRealm.authRouteRef` is a separately generated immutable lowercase
  UUIDv4. It contains no tenant/realm label, endpoint, hostname, or secret; only
  deployment-owned configuration maps it one-to-one to a typed Realm Auth
  client. The default/operator values are predeclared in the same reviewed
  manifest and never inferred from a public request.
- Human identity is exactly `(identityRealmId, subjectId)`.
- `meg1_` remains the existing HMAC reference over stable Membership ID and
  internal membership generation. Its canonical meaning and key do not change.
- Context-v2 `sr1_` and `ar1_` remain byte/meaning compatible only for declared
  default-realm operations. In particular, existing `sr1_` stays the prefix
  plus the first 32 base64url characters of HMAC-SHA256 under the existing JWT
  access secret over `nebula-session-ref:v1:<sessionId>`; its key, truncation,
  bytes, and meaning are not reused by v3.
- `sr2_` is exactly the prefix plus the unpadded base64url encoding of all 32
  HMAC-SHA256 bytes: 47 ASCII characters total. The HMAC uses a dedicated
  minimum-32-byte per-realm session-reference key and UTF-8 JSON with no
  whitespace of this ordered string array:
  `["nebula-session-ref","2",keyId,identityRealmId,applicationId,audience,internalSessionId]`.
  UUIDs are canonical lowercase; `keyId` is an immutable lowercase UUIDv4; the
  stored policy audience is used byte-for-byte. AuthSession persists the
  resulting reference and key ID once, so key rotation affects only new
  sessions and never changes a live reference. Raw session ID and generations
  do not leave Auth.
- `lsb1_` is exactly its five-character prefix plus all 32 unpadded base64url
  HMAC-SHA256 bytes: 48 ASCII characters total. A dedicated minimum-32-byte
  default-realm migration key signs compact UTF-8 JSON of the ordered string
  array
  `["nebula-legacy-session-bridge","1",keyId,defaultRealmId,subjectId,legacySessionId]`.
  The bridge stores the result and immutable lowercase UUIDv4 key ID, never the
  legacy session ID. That key is fixed for the compatibility window; ordinary
  rotation waits for window closure, while compromise closes the window and
  revokes every `PENDING` bridge instead of attempting ambiguous recomputation.
- `rsg1_` is its five-character prefix plus the unpadded base64url encoding of
  32 CSPRNG bytes: 48 ASCII characters total. The issuing Realm Auth returns it
  once and persists only `SHA-256(ASCII(rsg1_...))` beside the exact source
  session, target application/audience, registered redirect, request ID, PKCE
  S256 challenge, and policy/trust revisions. Exchange uses one primary-
  database compare-and-set to create/link the exact target AuthSession and move
  `PENDING` to `CONSUMED`; a lost success response never makes the code reusable
  and the still-valid root session may start a new exchange. Raw codes and
  digests never enter logs or URLs other than the exact approved authorization
  response.
- `ar2_` is likewise exactly 47 ASCII characters using all HMAC-SHA256 bytes, a
  separate minimum-32-byte Authority decision-reference key, and UTF-8 compact
  JSON of this ordered structure. All revisions/times are decimal strings and
  every absent optional value is JSON `null`, never an omitted or empty field:

  ```text
  ["nebula-authority-ref","2",keyId,
   identityRealmId,subjectId,sessionRef,authAuthorityRef,
   applicationId,audience,applicationPolicyRevision,
   federationTrustIdOrNull,federationTrustRevisionOrNull,
   targetKind,targetTenantId,targetSiteIdOrNull,actorAuthorityKind,
   membershipIdOrNull,membershipEpochRefOrNull,roleGrantIdOrNull,
   parentRelationshipIdOrNull,platformGrantIdOrNull,
   [tenantRevision,siteRevisionOrNull,applicationRevision,
    parentRelationshipRevisionOrNull,membershipRevisionOrNull,
    membershipEpochRevisionOrNull,roleGrantRevisionOrNull,
    platformGrantRevisionOrNull],resolvedAtUnixMs]
  ```

  Tenant Authority computes this only from verified owner records and returns
  its immutable lowercase UUIDv4 key ID beside the reference. A key remains in
  the verification ring for at least the maximum signed-context/cache lifetime
  plus clock skew; new resolutions use the new key. Client claims cannot supply
  any tuple field.

- Context v3 carries exact realm+subject, `sr2_` and its key ID, the verified provider/local
  authentication-authority reference, application/audience, target and the one
  effective actor-authority variant, `ar2_` and its key ID, and resolution time.
- Raw provider tokens/claims, email/phone, password/hash, private keys, raw
  session ID, internal membership generation, and internal credential
  or session generation never enter signed domain context.
- Each internal receiving method declares one exact v1, v2, or v3 contract.
  During the bounded migration, the gateway may send a verified legacy family
  only to a separately declared v2 compatibility method and an `sr2_` session
  only to its v3 method. One downstream request never carries both. Unknown,
  partial, mixed, or dual carriers and downgrade after v3 denial fail closed;
  legacy compatibility never reaches federation.

## Ordered Migration And Traffic Gates

| Gate                               | Required ordered work and proof                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Exact rollback/fail state                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `R0_REBASELINE`                    | Freeze ADR-0014/0015 and the supersession matrix; run documentation consistency plus existing clean Tenant Authority/role-seed verifiers before implementation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Documentation-only; no data/runtime rollback.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `R1_CONTROL_PLANE_UNUSED`          | Add unused Realm/Provider/Policy/Trust/audit/outbox schema; seed the inactive default/operator realms, each exact `NEBULA_LOCAL` provider registration, four draft existing-application policies, four pending default-realm local trusts, and one pending admin-web operator-local trust from one reviewed UUID manifest                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Remove only proven-unused new records/constraints. Preserve every Batch 2 ID, registration, handle, audit, and outbox row. Every realm/provider/policy/trust remains non-admitting and the static registry remains primary.                                                                                                                                                                                                                                                     |
| `R2_DEFAULT_ACTOR_BACKFILL`        | Add nullable realm+subject beside Membership/PlatformGrant/domain actor fields; backfill deterministic default realm and existing UUIDs; add new audit/outbox event version; preserve epochs/`meg1_`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Legacy readers remain primary. New columns may be removed only before any v3/session/second-realm writer. Never rewrite historical audit/outbox or regenerate epoch/grant IDs.                                                                                                                                                                                                                                                                                                  |
| `R3_REALM_AUTH_SHADOW`             | Create isolated default and operator Realm Auth DBs/roles/Redis/keysets; migrate default subjects/login/password hashes with count, HMAC-manifest, duplicate, orphan, and checksum evidence; seed credential generation explicitly (normally 1); inventory every verified active legacy family in `LegacySessionBridge`; map its non-lazy current token version to durable session generation; shadow-compare login without issuing realm sessions                                                                                                                                                                                                                                                                                                                             | Current User/Auth remains credential/session owner. Remove shadow copies only if no Realm Auth session or generation-changing write exists. A family with missing token version is quarantined, not initialized. No plaintext, hash, raw token/session ID, or raw generation enters evidence logs.                                                                                                                                                                              |
| `R4_ADMIN_SPLIT_STAGED`            | Create the operator-realm subject and recovery credential; verify stored lifecycle, credential check, and recovery procedure through an offline/non-issuing path; prepare the per-role tenant-grant constraint; create no AuthSession/token or operator PlatformGrant; leave the customer Membership/epoch/`TENANT_ADMIN`, current PlatformGrant, and traffic unchanged                                                                                                                                                                                                                                                                                                                                                                                                        | Delete only the unused staged subject after exact no-use/no-session proof. The customer platform grant remains active because receivers and the replacement operation path are not ready yet.                                                                                                                                                                                                                                                                                   |
| `R5_V3_RECEIVERS_DORMANT`          | Deploy separately declared exact context-v3 and `sr2_`/`ar2_` receivers for every protected route needed by the four original default applications and operator administration before any v3 writer/session; prove v1/v2 bytes, strict version routing/rejection, no propagation, and default-realm parity                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Disable only unused v3 receivers. Existing v1/v2 methods remain unchanged; no `sr2_` session or v3 authority fact exists yet.                                                                                                                                                                                                                                                                                                                                                   |
| `R6_DEFAULT_REALM_AUTH_V3_CUTOVER` | Enter the bounded fail-closed security-mutation barrier; final encrypted export/import and reconcile password hashes, identifiers, token versions and bridge inventory; atomically activate only the default realm, its `NEBULA_LOCAL` provider, four application policies and their four exact local trusts; make default Realm Auth primary, including mandatory bridge/generation checks for every legacy validation; replace split login with the frozen single Realm Auth `Login` operation and no credential-login grant; enable v3 writers for those protected routes as one cohort; issue only app-bound `sr2_`; keep User as profile projection; prove password/login, password/password, login/logout-all, exact logout/upgrade, barrier retry, and generation races | Before the first Realm Auth mutation/session, release the barrier and keep all new control records non-admitting. After divergence, stop new issuance but retain Realm Auth validation and v3 receiver/writer support until every `sr2_` drains or is revoked, then recover forward. Never activate the operator trust here; let old Auth/Redis authorize alone; project `sr2_` to `sr1_`; lower a generation; revive a family; or return credential ownership to a stale copy. |
| `R7_LEGACY_SESSION_WINDOW`         | Enable the approved bridge-based one-use upgrade only for a verified presenting allowlisted default application; route still-pending legacy families only through separate v2 compatibility methods; test replay, response loss, concurrent current/selected/all logout, password change, expiry cap, Redis loss, missing token version, and window closure                                                                                                                                                                                                                                                                                                                                                                                                                    | Stop upgrades and revoke remaining `PENDING` bridges/families. Keep v3 support for already-created sessions until drain/revocation. `CONSUMED`/`REVOKED` never return to `PENDING`; ambiguity or partial failure requires reauthentication.                                                                                                                                                                                                                                     |
| `R8_ADMIN_SPLIT_FINAL`             | Activate only the staged operator realm, its `NEBULA_LOCAL` provider, admin-web policy acceptance and exact operator-local trust; using dormant R5 receivers, enable its Auth/writer cohort, issue/validate an app-bound operator session, prove recovery and expected closed no-grant result, then in one Authority transaction create the operator PlatformGrant, add exact customer `PARENT_MANAGER`, revoke the customer PlatformGrant, advance revisions, and append audit/outbox; immediately prove one platform operation/audit through the new grant                                                                                                                                                                                                                   | Any pre-commit mismatch disables the operator cohort/trust and leaves the old customer platform grant active. A committed swap followed by operation-proof failure fails closed and recovers forward through the verified operator realm/break-glass procedure; the terminal customer grant is never reactivated/reassigned and subjects never merge.                                                                                                                           |
| `R9_SELECTED_AND_EXCLUDED`         | Add one direct selected consumer trust with one-use root SSO and JIT `USER`; add one personnel-only exclusion; prove exact target success and sibling/reverse/transitive/unapproved denial                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Disable exact trust/policy, revoke affected application sessions, and keep root plus unrelated apps contained. Parent edge alone never remains as fallback.                                                                                                                                                                                                                                                                                                                     |
| `R10_SECOND_LICENSED_ROOT`         | Deploy separate Auth/User DBs, roles, Redis, issuer/keys, users, policies and same normalized email; prove no lookup/session/key/membership/audit collision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Disable second-root traffic and retain its realm-qualified data. Never flatten into default realm or route to its store by email.                                                                                                                                                                                                                                                                                                                                               |
| `R11_CONTINUE_F4`                  | After the legacy window/default-v3/second-realm proofs, audit every actor reference, enforce final realm+subject non-null/uniqueness constraints, and remove bare global-user columns/readers only where no historical payload is rewritten; then resume Authority invalidation/freshness, domain scope, state and collapse slices; rerun earlier clean migration/seed verifiers after every stateful step                                                                                                                                                                                                                                                                                                                                                                     | Before legacy-column removal, restore compatible readers from the additive columns. After second-realm writes or removal, never flatten actors back to bare UUIDs; restore/reconcile forward from realm-qualified backups. Use ADR-0013 for later per-slice rollback. Retire static registry only after Batch 4 parity, outage and rollback proof.                                                                                                                              |

Every gate requires two passes: implementation evidence, then adversarial clean
order/rerun/partial-state/concurrency/outage/rollback evaluation. A later gate
cannot substitute its current local state for a clean execution from current
source.

## Local/Test And Production Placement

F4 functional proof requires at least the default licensed-root realm, platform
operator realm, and a second licensed-root realm to use separate logical
databases/roles, Redis endpoints or instances, issuers, keys/secrets, and
Auth/User deployments. They may share one local Docker host and PostgreSQL
server process; they may not share identity tables, Redis namespaces, signing
keys, or runtime-selected public connection strings.

This does not claim production HA. An upper-enterprise production release also
requires F9 placement, replica/primary routing, failover, restore fencing,
capacity/noisy-neighbor isolation, key/KMS availability, and sustained
per-realm plus federated login/logout load evidence. Those roadmap amendments
remain consultation-gated.

## Failure-Oriented Review

| Concern             | Frozen treatment                                                                                                                                                                                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prevention          | App-first exact policy; isolated realm stores/keys/issuers; primary-DB generation/session CAS; one-use exchange; realm-qualified references; explicit target roles; receiver-first context; independent domain checks.                                                  |
| Detection           | Owner counts/HMAC manifests; duplicate/orphan scans; generation/session/audience/provider/trust reason metrics; outbox lag; audit chains; clean reruns; same-email collision and wrong-route tests.                                                                     |
| Containment         | Customer and operator subjects/sessions are separate; a realm affects only explicit trusting apps; app session has one audience; Authority/Auth/domain owners remain conjunctive; no cross-license trust.                                                               |
| Fail state          | Unknown/mismatched/unavailable realm/provider/key/audience/trust/generation/session/membership denies. Session-upgrade partial failure requires reauthentication. No email, parent-edge, standby, Redis, v2, static-registry, or JWT-role fallback for realm traffic.   |
| Recovery            | Disable exact app/provider/trust; advance generations; revoke app/realm sessions; rotate keys; replay each owner's outbox; restore forward without decreasing generation/epoch; revalidate before reopening.                                                            |
| Common-mode failure | Operator/configuration/gateway/shared code may affect several realms. Separate credentials, keys, DB roles, route maps, typed policies, audit, Auth checks, domain checks, and later F9 placement reduce but cannot eliminate this risk.                                |
| Evidence            | Default parity; operator/customer split; exact selected target; personnel/sibling/unrelated denial; same email in two roots; password/session races; legacy upgrade replay/failure; Redis/DB restore; provider/key outage; context downgrade; clean migration/rollback. |
| Residual risk       | Physical HA/DR/capacity, full SAML/SCIM interoperability, customer IdP compromise, commercial governance, and multi-region behavior remain later approved work.                                                                                                         |

## Consequences

- There is no platform-global customer credential/session hub.
- Platform operations and customer administration use separate identities even
  when controlled by the same person.
- Existing default users keep their UUIDs and can avoid mass reauthentication
  through the bounded upgrade, but unbound sessions never enter federation.
- Tenant Authority gains public realm/trust metadata, not Auth secrets.
- Realm Auth gains a durable PostgreSQL security aggregate; Redis becomes
  acceleration and replay containment rather than sole recoverable truth.
- The corrected schema is larger and requires more deployments, migrations,
  keys, reconciliation, and failure testing. That cost is required by the
  selected upper-enterprise isolation boundary, not optional cleanup.
- F3 stays frozen as external-boundary evidence. Batch 3 items 1-4 stay frozen
  as default-realm evidence. Runtime corrections begin in Batch 3R only.
