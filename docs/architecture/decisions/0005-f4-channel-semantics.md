# ADR-0005: F4 WEB, ANDROID, And IOS Channel Semantics

Date: 2026-08-24

Status: accepted for the F4 Batch 1 channel decision. Batch 2 item 2 stages the
`WEB`, `ANDROID`, and `IOS` records and profile/channel constraints; default
registrations, typed resolution, and traffic cutover remain later items.

Amended 2026-08-31 by [ADR-0014](0014-f4-customer-identity-realms-and-federation.md):
channel remains a presentation classification and never an identity owner.
Its references to global user credentials/sessions now mean only that those
facts remain outside Channel; the target owner is the exact accepted identity
realm and application session, not one platform-global population.

## Context And Classified Findings

F3 currently distinguishes public application profiles
`storefront-web`/`admin-web`/`mobile` and derives a coarse runtime
`ApplicationChannelKind` of `web` or `mobile`. Static registry examples also use
readable `channelId` values such as `storefront-web`, `admin-web`, and
`native-mobile`.

That behavior is a valid F3 compatibility bridge. Persistent `WEB`, `ANDROID`,
and `IOS` authority records and their relationship to application profiles do
not exist, which is a **confirmed gap against F4**.

Treating the storefront and admin profiles as separate business-data channels,
or treating one generic mobile channel as sufficient native identity, would be
a **stale target interpretation**. Channel-specific copies of site data,
channel-owned authorization, or channel-selected tenant/site IDs would be
**confirmed defects** if introduced.

Additional presentation kinds such as desktop, kiosk, partner server, or edge
device remain **future scaling/product considerations**. They do not justify a
generic free-string channel in F4.

## Decision

F4 has exactly three closed channel kinds:

```text
WEB
ANDROID
IOS
```

A channel is a stable, authority-owned presentation classification under one
site. It says which client environment an application registration targets. It
does not own, partition, duplicate, or authorize business data.

Each site may have at most one channel record of each kind. A site may omit a
kind it does not support. Multiple applications may bind to the same channel.
Every application binds to exactly one channel, and that channel's owning site
must be the application's owning site.

Channel IDs use ADR-0003 UUIDv4 identifiers. Names, application profiles,
domains, origins, package/bundle identities, and public client IDs are not
channel IDs.

## Exact Kind Semantics

| Kind      | Client environment                                                  | Eligible F3 application profiles                                                                      | Registration evidence boundary                                                                                                            | Data and authorization rule                                                                                                                 |
| --------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `WEB`     | Browser-delivered storefront, admin, or other approved web clients. | `storefront-web` and `admin-web` may both bind the site's one `WEB` channel as separate applications. | Exact verified web origins/domains belong to application registrations. `Host` or a public client ID alone is not channel/site authority. | Uses the same site-owned business data. Profile/route/role policy may differ, but no storefront/admin data copy is created.                 |
| `ANDROID` | Signed native Android application.                                  | The F3 `mobile` profile may project to this kind during compatibility.                                | Later registration rules verify the Android package/application and signing identity. Browser `Origin` is not native identity.            | Uses the same site-owned data. Package identity, client storage, build flags, and device claims cannot select another site or grant access. |
| `IOS`     | Signed native iOS application.                                      | The F3 `mobile` profile may project to this kind during compatibility.                                | Later registration rules verify the iOS bundle/application/team identity. Browser `Origin` is not native identity.                        | Uses the same site-owned data. Bundle identity, client storage, build flags, and device claims cannot select another site or grant access.  |

`ANDROID` and `IOS` are separate authority kinds because their verified
registration identities and release artifacts differ. They may share DTOs,
mobile UI code, application profile policy, and domain data without becoming
one authority record.

The reserved `partner-server` profile is not a presentation channel and must
not be disguised as `WEB`, `ANDROID`, or `IOS`. Confidential partner execution
remains deferred and requires its own approved credential/registration
contract.

## What A Channel Owns And Does Not Own

A channel owns only:

- its UUID identity;
- its owning site relationship;
- one closed `WEB`/`ANDROID`/`IOS` kind;
- presentation classification used by verified application and later
  capability decisions;
- creation/update audit facts required by the later audit decision.

A channel does not own:

- products, product sets, taxonomy, blogs/pages, media, settings, carts,
  orders, memberships, or copies of those records;
- global user identity, credentials, sessions, roles, or site grants;
- application domains/origins, public client IDs, Android signing identities,
  or iOS application/team identities;
- application lifecycle or site lifecycle;
- feature entitlements, module deployment, build support, or license state;
- rate limits, idempotency state, storage paths, jobs, events, search, vectors,
  or audit storage merely because those records may include `channelId` as
  provenance.

Domain records remain tenant/site-owned according to the later data matrix. A
future visibility or capability rule may include channel as one condition, but
that does not change record ownership and must never turn a missing channel
filter into cross-site sharing.

## Lifecycle And Availability

Channel has no independent F4 business lifecycle enum. Its owning site's
lifecycle is the ceiling, and its application registrations have the lifecycle
from ADR-0004.

- If the site is not `ACTIVE`, no application under any channel resolves.
- If one application is `DISABLED` or `REVOKED`, sibling applications on the
  same channel are unaffected.
- If a site has no channel of a kind, applications of that kind cannot be
  registered or resolved.
- Once a channel ID is referenced, the record is retained and the ID is never
  reused. Stopping client support is expressed by disabling/revoking its
  applications; later retention/schema decisions govern physical cleanup.
- Runtime/mobile-build availability may make an active application unusable,
  but health/build state never creates or activates a channel.

This avoids three overlapping switches at site, channel, and application level
while retaining exact platform classification.

## F3 Compatibility And Migration

The current concepts map as follows:

| F3 concept                  | F4 interpretation                                                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `storefront-web` profile    | Separate application bound to the site's `WEB` channel.                                                                                      |
| `admin-web` profile         | Separate application bound to the same site's `WEB` channel.                                                                                 |
| `mobile` profile            | Compatibility application profile that must resolve through a distinct `ANDROID` or `IOS` registration. It is not a persistent channel kind. |
| `channelKind: "web"`        | Compatibility projection of `WEB`.                                                                                                           |
| `channelKind: "mobile"`     | Compatibility projection of either `ANDROID` or `IOS`; it cannot by itself prove which native platform was verified.                         |
| readable static `channelId` | Migration label mapped to a seeded authority UUID. It is not retained as the durable channel ID.                                             |

The two existing web registry records must map to one default-site `WEB`
channel while preserving their separate applications/profiles. The current
single `mobile-local` record contains no verified Android/iOS distinction, so
it cannot be copied into two active native authority registrations merely for
convenience. Batch 2 seeds distinct development Android and iOS channels and
registrations according to the later verification decision.

[ADR-0010](0010-f4-signed-context-compatibility.md) places the exact
`WEB`/`ANDROID`/`IOS` kind in context v2 application facts. Existing context-v1
`web`/`mobile` behavior remains only an explicit compatibility projection from
a verified authority record; callers cannot submit the projection as
authority.

## Options Compared

| Option                                                                          | Boundary and compatibility effect                                                                                                           | Decision                                                                         |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| One `WEB`, `ANDROID`, and `IOS` channel per site; many applications per channel | Matches the target platform, separates native verification, and preserves storefront/admin as application profiles sharing site data.       | **Selected.**                                                                    |
| One channel per application/profile                                             | Maps F3 labels directly but confuses applications with presentation kinds and encourages storefront/admin business-data duplication.        | Rejected.                                                                        |
| Generic `WEB` and `MOBILE`                                                      | Matches the coarse F3 kind but cannot express Android versus iOS registration identity or platform capability safely.                       | Rejected for persistent F4 authority; retained only as compatibility projection. |
| Free-string/extensible channel kinds now                                        | Avoids future enum migration but permits unsupported values to enter signed scope without implementation, verification, or denial evidence. | Rejected; add a versioned kind only when a concrete client exists.               |
| Channel-owned business data                                                     | Could simplify per-client customization but duplicates site truth and creates divergence/cross-channel authorization problems.              | Rejected. Site remains the business-data boundary.                               |

## Failure-Oriented Review

| Concern             | Channel decision                                                                                                                                                                                                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prevention          | Closed kind enum, one kind per site, exact application-to-channel/site binding, authority-generated IDs, and no client-selected kind/ID authority. Web/native identity is verified at the application registration boundary.                                                                                                  |
| Detection           | Migration and runtime evidence must detect duplicate site/kind rows, application/channel site mismatch, unsupported kinds, mobile-without-platform identity, copied channel IDs, and any query that treats channel as tenant/site ownership.                                                                                  |
| Containment         | A bad/disabled application affects only that registration; site lifecycle remains the ceiling. Domain services authorize site-owned resources independently, so a wrong channel classification cannot grant another site's data.                                                                                              |
| Fail state          | Unknown/missing/duplicate kind, missing channel, mismatched site, unverified native platform, or unavailable authority denies registration/resolution. There is no fallback from `ANDROID`/`IOS` to generic client-provided `mobile`.                                                                                         |
| Recovery            | Restore site/channel/application relationships, reconcile unique site/kind rows, invalidate registry/context caches, and reverify registrations before traffic. Do not regenerate referenced channel IDs or duplicate site data during recovery.                                                                              |
| Common-mode failure | Gateway and services may consume the same wrong channel-to-site mapping. Independent domain tenant/site ownership checks contain the result; shared authority/operator compromise remains residual.                                                                                                                           |
| Evidence            | Default three-channel seed/rerun; two web profiles on one `WEB`; distinct Android/iOS registrations; unsupported/duplicate/mismatched denial; copied/raw kind denial; site suspension cascade; sibling-application isolation; old `web`/`mobile` compatibility; same data IDs across allowed channels without duplicate rows. |
| Residual risk       | Channel classification does not attest a real device or make public client IDs secret. Optional mobile attestation may reduce abuse later but cannot replace registration, membership, or domain authorization.                                                                                                               |

## Rollback Boundary

This ADR is documentation-only and freely reversible before persistence.

During the explicit F3 compatibility window, rollback may restore readable
static channel labels only under ADR-0001's single-site conditions. After
applications, domain provenance, caches, audit records, or F6 allocations
reference channel UUIDs, changing the kind/cardinality requires a versioned
mapping, reference/backfill audit, signed-context compatibility, and rollback
proof. Rollback must never create per-channel copies of site data.

## Resolved And Deferred Boundaries

ADR-0006 freezes application registration, ADR-0007/0008 freeze parent and role
policy, ADR-0011 freezes domain provenance without channel-owned business data,
and ADR-0012 freezes availability/freshness. Application-profile expansion,
confidential partner credentials, F6 capability allocation/client manifests,
native build support, and mobile attestation remain later or optional work.

## Repository Evidence

- `apps/gateway/src/application/application.contracts.ts`
- `apps/gateway/src/application/application-registry.ts`
- `apps/gateway/src/application/trusted-request.ts`
- gateway/root/release static registry examples
- `packages/grpc-auth/src/s2s-context.ts`
- `docs/architecture/tenant-package-channel-platform.md`
- [ADR-0003](0003-f4-authority-identifiers.md)
- [ADR-0004](0004-f4-authority-lifecycle.md)
