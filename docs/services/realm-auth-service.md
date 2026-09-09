# Realm Auth Service

Last reviewed: 2026-09-09

## Purpose

Realm Auth is the per-identity-realm durable authentication and session owner
selected by ADR-0014/0015. R3 runs it only as a non-authoritative shadow. Current
User-service still owns credentials, current Auth still owns sessions, Gateway
still uses the static application registry, and no Realm Auth token/session is
issued.

The same package is deployed with one fixed tuple. The deterministic default
realm and platform-operator realm use separate logical PostgreSQL databases,
NOINHERIT runtime roles, Redis endpoints, issuers, route references, and key
references. Environment validation rejects crossed tuples; request data cannot
select a database or realm.

## Durable Shadow Aggregate

The initial Prisma migration owns:

- RealmBoundary and purpose-separated RealmKeyRegistration references;
- RealmSubject, LoginIdentifier, LocalCredential, and ExternalIdentityLink;
- AuthSession, terminal LegacySessionBridge, and terminal RootSsoExchangeGrant;
- append-only AuthAuditEvent, AuthOutboxEvent, and idempotent migration
  manifest/record receipts.

Database checks enforce the frozen identifier normalization pairings, positive
generations, bounded reference shapes, hash formats, lifecycle timestamps,
same-realm relations, immutable identities/key ownership, and terminal state.
The singleton RealmBoundary fixes the realm and principal class for one database.
While it is `SHADOW`, triggers reject AuthSession writes and subject-generation
changes. That fence remains authoritative even if application code is called by
mistake.

`seed-shadow-boundary.ts` creates only the exact boundary and six non-secret key
references under a serializable advisory lock. An exact rerun is read-only;
partial or contradictory state fails. Key material is not tracked or created by
this seed.

## Placement And Current Limits

`realm-auth-service` is the default deployment in the root backend inventory.
`operator-realm-auth-service` reuses the image and is gated by Compose profile
`r3-shadow`. `realm-auth-db-init` creates both databases/roles without dropping
or rewriting them. Dedicated Redis containers are `realm-auth-default-redis`
and `realm-auth-operator-redis`.

The generic backend build/migration inventory covers the default database.
Maintenance backup/restore includes both Realm Auth databases and refuses to
run while either Realm Auth runtime is active. The dual-store disposable
foundation proof passed on 2026-09-09. Plain Compose startup does not apply
migrations or seed boundaries.

## R3 Migration Commands

The R3 path is CLI-only and has no HTTP or gRPC migration endpoint. User-service
exports bounded credentials, current Auth exports bounded active-family facts
from the UUID-only subject selection, and Realm Auth authenticates, decrypts,
validates, and imports the pair in one serializable transaction. The shared
artifact format uses HMAC-SHA256 for records/manifests and destination-bound
AES-256-GCM for the complete payload. Key IDs are UUIDv4 values; each secret is
exactly 32 bytes encoded as 43 unpadded base64url characters.

Use `db:verify:f4-r3-shadow-import` for the disposable proof. It generates
ephemeral keys and files, never prints them, verifies exact import/rerun/login
behavior, and cleans its two databases, Redis container, and artifact directory.
The first populated stateful run passed on 2026-09-09. The expanded completion
run additionally covers adversarial artifacts, missing legacy version evidence,
exact copied-graph reruns, immutable bridge key binding, and idempotent shadow
rollback with retained manifests/receipts; that run also passed on 2026-09-09.
The verifier now begins the valid import with two simultaneous clients and
requires one create plus one exact-current result through a bounded retry of
only Prisma's serialization-conflict code. That concurrent stateful run passed
on 2026-09-09.

No login, refresh, logout, session upgrade, federation, public API, or typed
business RPC exists in this service during R3. Those paths remain ordered behind
later receiver, barrier, and traffic gates.
