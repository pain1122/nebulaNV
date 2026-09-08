# ADR-0006: F4 Web And Native Application Registration

Date: 2026-08-24

Status: accepted for the F4 Batch 1 registration decision. Batch 2 item 2
stages application and exact web/native identity persistence plus database
constraints. Verification challenges, typed operations, audit/outbox,
rotation/transfer workflows, seeds, and runtime resolution remain later items.

Amended 2026-08-31 by [ADR-0014](0014-f4-customer-identity-realms-and-federation.md):
web/native registration proof remains accepted, but every application also
needs an exact default-deny identity policy for accepted realms, providers,
principal classes, audience, and federation-trust lifecycle. Registration or
a parent edge alone never creates that trust.

## Decision Scope

This ADR freezes application registration, verification, activation,
uniqueness, rotation/reassignment, revocation, and deletion semantics for
`WEB`, `ANDROID`, and `IOS`.

It does not add a runtime, schema, migration, public administration API, mobile
client, vendor credential, or request-time attestation implementation.

## Context And Classified Findings

The F3 gateway already provides a useful bridge:

- a strict static registry has globally unique `clientId`, `applicationId`, and
  canonical exact web origins;
- web registrations require one to eight origins;
- mobile registrations reject browser origins;
- lookup requires one valid public client ID and, for web, one exact origin;
- disabled or contradictory records fail closed;
- public client IDs are explicitly documented as non-secret.

This behavior is preserved until persistent authority replaces it. The
production environment example omits the explicit `:443` required by the
implemented registry validator; that is a **confirmed configuration defect** to
correct in a separate narrow patch before migration evidence.

F3 has no durable proof of domain control, Android package/signing identity, or
iOS team/bundle identity. Its originless mobile record resolves from a public
client ID alone. Those are **confirmed gaps against F4**, not reasons to remove
the current gateway registry seam.

Request-time Android/iOS attestation could strengthen native caller evidence,
but it is **optional hardening**. Device/app attestation cannot replace Auth,
membership, target-scope, resource, or domain authorization. Automated
continuous domain/provider re-verification is also optional hardening beyond
the initial and change-time proof frozen here.

Multi-region verification workers, external domain-management providers, and
large-scale registration automation are **future scaling considerations**.

## Registration Aggregate

Tenant-authority-service owns:

- one application record with the ADR-0003 `applicationId`;
- one authority-issued public `clientId` lookup handle;
- exactly one owning tenant, site, and ADR-0005 channel;
- one approved application profile;
- application lifecycle from ADR-0004;
- channel-specific identity records and their verification state/evidence;
- immutable creation facts plus revision/audit references selected by later
  Batch 1 decisions.

A new public client ID uses canonical UUIDv4 text generated independently from
`applicationId`. It is globally unique across live records and retained
tombstones and is never reused. Existing F3 readable client IDs may remain
explicit migration aliases only; they do not set the new application ID.

Application site/channel ownership is immutable. Moving an external identity
to another site requires the transfer process below and a new application; an
update may never rewrite `tenantId`, `siteId`, or `channelId` in place.

Identity verification state is separate from application lifecycle:

```text
PENDING -> VERIFIED -> REVOKED
    |                      ^
    +----------------------+
```

An application may stage a new pending identity while its existing verified
identity continues serving traffic. Verification never activates an
application automatically.

## WEB Registration

### Canonical Origin

A web origin is the exact tuple of scheme, hostname, and effective port. F4
preserves the implemented gateway representation and stores it as:

```text
https://lowercase-ascii-host:port
```

Rules:

- production accepts only `https`;
- non-production `http` is limited to `localhost`, `127.0.0.1`, or `[::1]`;
- the stored form always contains an explicit port, including `:443` and `:80`;
- hostnames are lowercase canonical ASCII A-labels; Unicode display names are
  not stored as origins;
- ports are decimal `1..65535`;
- path must be exactly `/` when parsed and is omitted from stored form;
- username, password, query, fragment, wildcard, IP host in production,
  opaque/`null` origin, whitespace, and non-HTTP(S) schemes are rejected;
- lookup normalizes an omitted browser default port to `80` or `443` before
  exact comparison;
- one application may have at most eight registered web origins, preserving the
  current bounded registry rule;
- an origin is globally bound to one application at a time.

`Host`, `Referer`, forwarded host, path, CORS response, TLS certificate alone,
or public client ID alone never substitutes for exact `Origin` matching.
Origin/CORS admission is application resolution, not user or domain-resource
authorization.

### Domain-Control Verification

Production web origins require proof of control over their exact hostname.
Tenant-authority-service:

1. creates the application/identity in `PENDING`;
2. generates a single-use cryptographically random 32-byte challenge;
3. stores only a protected digest plus application, hostname, issue time,
   expiry, attempts, and request/audit reference;
4. asks the operator to publish a TXT value of the form
   `nebula-verification=<base64url-token>` at
   `_nebula-verification.<exact-origin-host>`;
5. performs an authoritative DNS TXT lookup, compares the exact challenge in
   constant time after hashing, and rejects missing, duplicate-ambiguous,
   malformed, or mismatched values;
6. marks the hostname proof `VERIFIED`, records proof time/evidence digest, and
   consumes the challenge only after the transaction commits.

The challenge expires after 24 hours. Expired, failed, or consumed challenges
cannot be replayed; a new challenge is generated. Verification of an apex does
not automatically verify subdomains, and verification of one subdomain does not
verify siblings. Each exact hostname must prove control. Multiple exact origins
on one already verified hostname still retain separate origin records and
uniqueness.

Controlled non-production loopback seed registrations are the only proof
exception. They are tagged as development/test seed data, cannot be promoted to
production, and still use exact origin matching.

## ANDROID Registration

The production natural identity is:

```text
Android application/package ID
+ SHA-256 fingerprint of the app-signing certificate
```

Rules:

- the application ID is a canonical reverse-DNS-style package identifier and
  is bound to exactly one current Nebula application registration;
- the certificate fingerprint is the 32-byte SHA-256 digest normalized as 64
  lowercase hexadecimal characters for storage/display-independent matching;
- the trusted certificate is the app-signing certificate used for installed
  application artifacts, not merely a Play upload-key certificate;
- the pair `(packageId, signingCertificateSha256)` is verified and unique;
- multiple verified signing fingerprints may belong to the same application
  only for an evidenced platform-supported signing-key rotation or distinct
  approved distribution track. A fingerprint alone is not globally unique
  because one publisher may sign multiple package IDs with one key;
- an `ANDROID` application has no browser origins and must bind the site's
  `ANDROID` channel.

Accepted production verification evidence is one of:

1. a provider/account lookup controlled by Nebula operations that confirms the
   package and app-signing SHA-256 pair, such as the Play Console app-signing
   record or Android Developer ID status API; or
2. for approved non-Play distribution, extraction of the package ID and signer
   certificate from the signed installable artifact plus separate evidence that
   the authorized publisher controls that distribution.

Authority stores evidence type, provider/reference or artifact digest,
observed pair, verification time, and verifier/audit reference. It stores no
private signing key, upload key, provider API key, or artifact secret.

## IOS Registration

The production natural identity is:

```text
Apple Team ID + explicit Bundle ID
```

Its signed application identifier is the Team ID joined to the Bundle ID.

Rules:

- wildcard bundle IDs are not accepted;
- the exact `(teamId, bundleId)` pair is bound to one current Nebula
  application registration;
- the Apple numeric App Store ID may be stored as non-authoritative reference
  evidence, but it cannot replace Team ID plus Bundle ID;
- an `IOS` application has no browser origins and must bind the site's `IOS`
  channel;
- a bundle/team change is a new or transferred external identity, never an
  in-place site/channel rewrite.

Production verification uses a Nebula-controlled App Store Connect/Developer
account lookup proving the explicit Bundle ID belongs to the expected team and,
when an artifact is available, matches the signed build/provisioning
application-identifier entitlement. Approved enterprise/ad-hoc distribution
uses equivalent platform-operator inspection of the signed provisioning/build
evidence.

Authority stores evidence type, provider/reference or artifact digest,
observed Team/Bundle pair, verification time, and verifier/audit reference. It
stores no Apple private signing key, distribution certificate private key,
provisioning secret, or App Store Connect credential.

## Activation And Runtime Resolution

Activation is an explicit authority operation after verification. It succeeds
only when:

- Tenant and Site are `ACTIVE`;
- the application channel belongs to that site and matches the identity kind;
- application profile is compatible with the channel;
- public client ID and application ID are unique and not tombstoned aliases of
  another record;
- `WEB` has at least one `VERIFIED` exact origin;
- `ANDROID` has one verified package/signing-certificate pair;
- `IOS` has one verified Team ID/explicit Bundle ID pair;
- no uniqueness, ownership, lifecycle, or evidence contradiction exists;
- the later actor/role authorization and durable audit requirements pass.

Verification and activation commit separately so proof cannot accidentally
publish a registration. Activation advances authority revision/invalidation
according to the later freshness decision.

Runtime lookup remains:

| Channel         | Required lookup evidence                                                                                                        | Denial conditions                                                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WEB`           | Exactly one public client ID header plus exactly one canonical matching browser `Origin`; active application, site, and tenant. | Missing/duplicate/malformed ID or Origin; opaque/null/unregistered Origin; identity mismatch; non-active/unknown/contradictory record; authority/freshness unavailable. |
| `ANDROID`/`IOS` | Exactly one public client ID, no browser Origin, and a pre-verified active platform registration under the correct channel.     | Unknown/duplicate/malformed ID; browser Origin present; wrong platform/channel; non-active/unknown/contradictory record; authority/freshness unavailable.               |

The native row proves that Nebula approved an app identity and distribution
record. Without an implemented request-time attestation protocol, a public
client ID does not prove that a particular HTTP request came from that signed
binary. Anonymous native endpoints must tolerate copied public identifiers;
sensitive operations still require Auth, active membership, exact target
scope, resource/domain policy, and applicable rate/idempotency controls.

## Uniqueness And Collision Rules

| Value                                   | Uniqueness scope                          | Reuse rule                                                                              |
| --------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------- |
| `applicationId`                         | Global authority primary key              | Never reused.                                                                           |
| New public `clientId`                   | Global across live records and tombstones | Never reused, even after revocation. Existing F3 aliases are explicitly mapped.         |
| Canonical web origin                    | One non-revoked application at a time     | May move only through the atomic transfer process after fresh exact-host proof.         |
| Android package ID                      | One non-revoked application at a time     | May move only through verified transfer/new application; never by site update.          |
| `(Android package ID, signing SHA-256)` | Global pair                               | Same pair cannot belong to two applications concurrently. Historical tombstone remains. |
| `(Apple Team ID, explicit Bundle ID)`   | One non-revoked application at a time     | May move only through verified transfer/new application. Historical tombstone remains.  |
| Evidence/challenge token                | One identity verification attempt         | Single use; never authority after expiry/consumption.                                   |

Database uniqueness must cover active/pending/disabled claims so two concurrent
attempts cannot both pass an application-level precheck. Transfer is one
authority transaction that removes the source's current claim and activates the
target claim; there is no temporary duplicate window.

## Rotation, Reassignment, And Ownership Change

### Same-Application Rotation

- Web: add and verify a new origin before removing the old one. If removing the
  last verified origin, disable the application first.
- Android: stage and verify the new app-signing fingerprint with provider or
  proof-of-rotation evidence before retiring the old fingerprint. An upload-key
  rotation alone does not change registered installed-app identity.
- iOS: ordinary signing-certificate/provisioning renewal that preserves Team ID
  and Bundle ID updates evidence, not application identity. Team/Bundle change
  requires transfer/new registration.
- Public client ID rotation creates a new handle, deploys it through an
  explicit overlap window, then tombstones the old handle. Both handles map to
  the same application only during that bounded operator-controlled window;
  old handles never map to a different application.

### Cross-Application Or Cross-Site Transfer

Natural identities do not move by editing the existing application's owner.
Transfer requires:

1. a new target application in `PENDING_VERIFICATION` with its own IDs;
2. authorization for source and target scopes under the later role/parent
   policy, or the separately audited platform recovery path;
3. source application `DISABLED` or `REVOKED`, so it no longer resolves;
4. fresh target proof of exact domain/package/team control;
5. explicit impact/rollback record covering origins, clients, sessions/caches,
   data references, and deployment;
6. one atomic authority transaction that releases the current natural-identity
   claim, binds it to the target, advances revisions, and writes both audit
   results;
7. cache/registry invalidation before the target becomes resolvable.

There is no automatic reassignment, client-selected destination, silent
cooldown expiry, or parent-to-child/sibling transfer privilege. If source and
target authorization cannot both be established, only the later platform
recovery role may proceed after fresh external-control proof and explicit audit.

## Revocation And Deletion

- Revoking an identity immediately makes it ineligible for resolution and
  removes web origins from allowed CORS origin output within the later frozen
  freshness bound.
- Revoking the last required verified identity forces the application out of
  `ACTIVE`; it cannot continue on cached/static data.
- Application `REVOKED` is terminal. Its application ID and historical client
  handles remain tombstoned and never identify a new application.
- Referenced applications and verified identities are never hard-deleted in
  F4. Revocation/tombstones preserve uniqueness history, audit provenance, and
  cross-service reconciliation.
- A never-verified pending registration may be cancelled, but its application
  ID/client ID tombstone and audit event remain. Expired challenge secret/digest
  material may be purged under the later retention plan.
- Physical purge, legal retention duration, and erasure of non-authority
  business data are later policy/migration work. Deletion never reassigns
  tenant/site ownership or makes an identity free without the transfer rules.

## Failure-Oriented Review

| Concern             | Registration decision                                                                                                                                                                                                                                                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prevention          | Exact canonical parsing; DNS/provider/artifact proof; single-use challenges; closed channel/profile matching; immutable site binding; database uniqueness; explicit activation; no secrets in identity records; no public field creates authority.                                                                                                                               |
| Detection           | Challenge attempts/expiry, proof evidence digest/time, duplicate/contradiction audits, origin/client mismatch, wrong native channel, stale resolution, reassignment/revocation audit, provider-evidence failure, and production static-fallback attempts require observable evidence.                                                                                            |
| Containment         | One application/identity can be disabled without suspending its site or global users. Site/tenant lifecycle remains the ceiling. Auth and domain services independently authorize sensitive data. Provider credentials/signing private keys remain outside authority storage.                                                                                                    |
| Fail state          | Unknown, unverified, duplicate, expired, mismatched, non-active, revoked, or freshness-unavailable records deny resolution/activation/transfer. Verification-provider outage leaves records pending or prevents change; it does not accept self-asserted evidence. Existing active proof remains subject to explicit revocation rather than automatic allow from failed recheck. |
| Recovery            | Restore authority/tombstones/evidence metadata, reconcile uniqueness and bindings, invalidate registry/CORS caches, re-run fresh proof when evidence is uncertain, and activate only after source/target contradiction audits pass. Never restore from static production fallback.                                                                                               |
| Common-mode failure | DNS/account takeover, compromised platform provider credentials, authority/operator compromise, or shared cache/config error can produce valid-looking registration. Exact domain/resource authorization, pairwise S2S, independent Auth/domain checks, external credential isolation, and audited transfer contain but do not eliminate the risk.                               |
| Evidence            | Parser parity; DNS success/expiry/replay/mismatch; exact-origin/port/wildcard/null denial; Android package/fingerprint and upload-key confusion; iOS Team/Bundle mismatch; concurrent uniqueness; explicit activation; disabled/revoked CORS removal; rotation/atomic transfer/rollback; copied mobile client ID cannot bypass Auth/domain checks; restore/tombstone/no-reuse.   |
| Residual risk       | DNS proof and provider inspection are point-in-time control evidence. Public client IDs can be copied, browsers/non-browsers can forge headers outside browser protections, and F4 has no device attestation. Continuous re-verification and mobile attestation are optional hardening, not claimed controls.                                                                    |

## Compatibility, Migration, And Rollback

This ADR changes documentation only. No current gateway, env, schema, vendor
integration, credential, mobile app, or protocol behavior changes.

The later migration must:

1. correct the invalid production `:443` example in a separate reviewed config
   patch while preserving the existing origin validator;
2. create persistent pending records and map each F3 application/client alias;
3. map the two exact web origins only after production proof or controlled
   non-production seed classification;
4. avoid claiming that `mobile-local` proves Android or iOS identity; seed
   distinct controlled development registrations under ADR-0005;
5. deploy persistent lookup behind `ApplicationRegistry` with cache/revision
   behavior and denial evidence;
6. prove active records match before switching production authority;
7. retain static mode only in the explicit migration/test window and never as
   automatic outage or revocation fallback.

Rollback before persistent authority becomes primary may use the frozen static
registry under ADR-0001. After natural identities, client handles, or authority
IDs are referenced, rollback requires the mapping/tombstone/transfer audit. It
must not revive disabled/revoked registrations, reuse handles, or convert
unverified native identities into an originless active mobile record.

## Resolved And Deferred Boundaries

ADR-0007/0008 freeze parent and role permissions, ADR-0011 freezes the authority
record/reference matrix, and ADR-0012 freezes application-resolution freshness,
invalidation, outage, durable audit, and compromise behavior. Two-person
operational approval, request-time Android/iOS attestation, confidential partner
credentials/profile execution, continuous vendor re-verification, billing,
app-store automation, and commercial dashboards remain optional or later
roadmap work.

## Repository And External Evidence

Repository:

- `apps/gateway/src/application/application-origin.ts`
- `apps/gateway/src/application/application-registry.ts`
- `apps/gateway/src/http/public-client-boundary.ts`
- `apps/gateway/test/application-registry.spec.ts`
- gateway/root/release static registry examples
- [ADR-0003](0003-f4-authority-identifiers.md)
- [ADR-0004](0004-f4-authority-lifecycle.md)
- [ADR-0005](0005-f4-channel-semantics.md)
- `docs/reports/2026-08-24-f4-authority-audit.md`

Current authoritative platform/standards references checked on 2026-08-24:

- [MDN Origin definition](https://developer.mozilla.org/en-US/docs/Glossary/Origin)
- [RFC 8555 DNS-01 control-proof pattern](https://www.rfc-editor.org/rfc/rfc8555#section-8.4)
- [Android app signing](https://developer.android.com/studio/publish/app-signing)
- [Android package and signing-certificate registration status](https://developer.android.com/developer-verification/guides/check-registration-status)
- [Android application update identity](https://developer.android.com/google/play/app-updates)
- [Apple application identifier composition](https://developer.apple.com/documentation/Security/sharing-access-to-keychain-items-among-a-collection-of-apps)
- [Apple Bundle ID ownership/API](https://developer.apple.com/documentation/appstoreconnectapi/bundle-ids)
