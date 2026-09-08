# ADR-0003: F4 Authority Identifier Format And Creation

Date: 2026-08-24

Status: accepted for the F4 Batch 1 identifier decision. Batch 2 item 2 stages
UUIDv4 storage constraints for the first authority records; creation APIs,
stable default seeds, aliases, and consumers remain later checklist items.

Amended 2026-08-31 by [ADR-0014](0014-f4-customer-identity-realms-and-federation.md):
the bare platform-global `userId` clauses are superseded. Human identity is
the realm-qualified `(identityRealmId, subjectId)` pair; legacy user UUIDs are
preserved as default-realm subject IDs during additive migration.

## Context And Classified Findings

The current F3 static registry uses readable deployment labels such as
`single-site`, `storefront-web`, and `mobile-local` in fields that will later
refer to persistent authority records. Those values satisfy the current broad
signed-context grammar, but treating client/deployment-selected labels as
durable authority would be a **confirmed defect against the F4 requirement**.

The repository already has a dominant opaque-ID mechanism: User, Taxonomy,
Media, Product, Blog, and Order schemas use Prisma `uuid()` string IDs. Settings
alone uses `cuid()`. S2S signed-context identifiers permit UUID hyphens and have
a 128-character limit. Reusing UUIDs is therefore compatible with the current
database, DTO, proto, and context representation.

Adding CUID2, ULID, UUIDv7, or a prefixed-ID library would be **optional
hardening or a future scaling consideration**, depending on the goal. The
repository has no measured ordering, sharding, or type-discrimination need that
justifies a new identifier stack for F4.

## Decision

All new authority entity identifiers use canonical lowercase UUID version 4
text:

```text
xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
```

`x` is a lowercase hexadecimal digit and `y` is one of `8`, `9`, `a`, or `b`.
The exact accepted form is:

```regex
^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$
```

The rule applies to:

- `tenantId`;
- `siteId`;
- `channelId`;
- `applicationId`;
- `membershipId`;
- the explicit parent/subordinate relationship ID;
- the `EntitlementScopeRef` selected by ADR-0002.

ADR-0011 freezes the corresponding authority models and field meanings. The
implementation may make only mechanical naming adjustments that preserve
canonical UUIDv4 strings and native PostgreSQL UUID storage for these primary
identifiers. Typed service contracts carry them as strings and validate the
exact canonical form at trust boundaries.

## Creation Authority

Tenant-authority-service is the only runtime boundary allowed to create these IDs.
The database default or an authority-owned generator may produce the UUID, but
callers cannot choose it.

| Identifier                  | Creation operation owner                                                                                                      | Caller-supplied authority rule                                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Tenant                      | Tenant-authority-service tenant creation                                                                                      | A caller may provide later-approved descriptive/business input but no `tenantId`.                                                    |
| Site                        | Tenant-authority-service site creation under a verified tenant target                                                         | A caller cannot choose `siteId` or change tenant binding with an ID in the body/path.                                                |
| Channel                     | Tenant-authority-service channel creation under a verified site target                                                        | A channel kind or display label is not `channelId` and cannot select another site.                                                   |
| Application                 | Tenant-authority-service application registration under a verified site/channel target                                        | Public `clientId`, origin, domain, package, bundle, profile, and display name are attributes or lookup handles, not `applicationId`. |
| Membership                  | Tenant-authority-service membership creation after verifying the User-service global user ID and the target scope             | A user ID identifies the person to verify; it does not authorize or determine `membershipId`, role, tenant, or site.                 |
| Parent relationship         | Tenant-authority-service creation of an explicit relationship record after ADR-0007/0008 authorize the exact actor and target | Neither tenant may submit the relationship ID or infer authority from a `parentTenantId` value alone.                                |
| Entitlement scope reference | Tenant-authority-service entitlement-scope creation for an already verified tenant/site binding                               | No client or F6 module may mint the reference or use its presence as a feature grant.                                                |

ADR-0007/0008 freeze the precise human/platform role and target allowed to
request each operation. This item selects the creation boundary and does not
duplicate that role catalog.

Controlled migrations and seeds may provide fixed, previously generated UUIDv4
values through authority-owned tooling. That is the only exception to runtime
generation and exists so backfills, seed reruns, rollback manifests, and
environment promotion can be deterministic. Fixed seed IDs must be repository
constants, not hashes or transformations of names, domains, package identities,
or other public input.

## IDs, Lookup Handles, And Natural Identities

The following values remain separate from authority primary IDs:

- the gateway public `clientId` is a public application lookup handle, not a
  secret and not `applicationId`;
- a verified domain/origin is registration evidence and lookup data, not a site
  or application ID;
- Android package/application/signing identity and iOS bundle/application/team
  identity are verified registration attributes, not IDs for authority rows;
- tenant/site/application/channel names and slugs are mutable descriptive
  attributes, not authority;
- User-service continues to issue global `userId` values. Tenant-authority-service
  stores a verified reference and never remints or aliases global identity;
- existing domain-service record IDs retain their current owners and formats.

The current `PUBLIC_CLIENT_ID_PATTERN` and F3 human-readable client IDs may be
preserved during the controlled registry migration. Tenant-authority-service must
issue and uniquely own future lookup handles; possession of one merely selects
a registration to verify. ADR-0006 freezes handle rotation, reassignment,
revocation, uniqueness, tombstone, and no-reuse behavior.

## Immutability And Non-Authority

Authority IDs are immutable and never recycled for another logical record or
scope. A rename, domain change, package change, lifecycle transition, parent
change, or application reassignment cannot rewrite an ID to encode the new
state.

ADR-0004/0006 freeze lifecycle, revocation, tombstone, and current retention
boundaries. Under every permitted outcome, an old ID must not identify a newly
created record.

An ID proves only which record to look up. It grants no membership, role,
ownership, parent power, entitlement, or application access. Every operation
must still resolve active authoritative relationships and independently verify
the actor, target scope, resource ownership, and applicable domain policy.

## Migration Compatibility

The F3 registry labels are a bridge, not durable IDs. The later migration must:

1. generate and seed stable UUIDv4 tenant, site, channel, and application
   records for the default context;
2. map each existing registry record to those IDs while retaining its current
   public `clientId` as an explicit compatibility lookup handle;
3. deploy compatible context readers/writers according to ADR-0010 before UUID
   values become authoritative;
4. audit stored/logged/cached assumptions that use readable labels as IDs;
5. avoid deriving UUIDs from the old labels;
6. retain a reversible mapping manifest until the static registry compatibility
   window closes.

No existing domain row ID is rewritten merely to adopt authority UUIDs. Domain
rows receive authority references only through ADR-0011/0013's ordered
additive migration plans.

## Options Compared

| Option                               | Repository compatibility and cost                                                                                                                                                        | Decision                               |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Canonical UUIDv4                     | Matches six current service schemas, Prisma support, Postgres UUID storage, Node/runtime tooling, and the signed-context grammar. Random values expose no business sequence.             | **Selected.**                          |
| Keep readable/client-selected labels | Avoids mapping work but lets deployment/client vocabulary become durable authority, makes rename/reassignment unsafe, and exposes predictable identifiers as if they were authorization. | Rejected.                              |
| CUID/CUID2                           | Settings demonstrates CUID compatibility, but CUID is not the dominant repository convention and CUID2 would add a new application generator/dependency.                                 | Rejected for F4; no unmet requirement. |
| UUIDv7 or ULID                       | Time ordering may improve future high-volume index locality, but it introduces a new generation/validation convention with no measured F4 need.                                          | Future scaling consideration.          |
| Type-prefixed UUIDs                  | Easier visual diagnosis, but requires a custom storage/validation format and can encourage authorization by prefix. Typed DTO fields already provide type context.                       | Optional hardening, not selected.      |

## Failure-Oriented Review

| Concern             | Identifier decision                                                                                                                                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prevention          | Tenant-authority-service or its database generates IDs; create DTOs omit authoritative IDs; exact canonical validation rejects malformed/uppercase/non-v4 values; PK/unique constraints prevent duplicate persistence; IDs never encode scope or permission.   |
| Detection           | Focused tests and migration audits must find malformed, duplicate, reused, unknown, label-derived, wrong-version, wrong-type-field, and cross-scope references. UUID collision errors are observable and retried with a fresh generated value.                 |
| Containment         | Guessing or copying a valid UUID selects only a record to authorize. Gateway resolution, Auth actor validation, authority relationship checks, and domain resource checks remain independent. Public client IDs stay separate from internal application IDs.   |
| Fail state          | Unknown, malformed, duplicated, or scope-mismatched authority IDs fail closed. A service must not fall back to an old label, public client ID, raw tenant/site value, or unverified JWT claim.                                                                 |
| Recovery            | Deterministic seed constants and a migration mapping manifest permit default-context reconstruction. Database restore preserves IDs; recovery must reconcile references before traffic and must never regenerate IDs for restored logical records.             |
| Common-mode failure | A bad seed, migration, or authority operator can distribute internally consistent but wrongly bound IDs across services. Independent relationship/resource audits and a second isolation tenant are required; UUID randomness does not prevent operator error. |
| Evidence            | Generator/validator tests, caller-ID rejection, deterministic seed rerun, collision path, old-label mapping, restore/reconciliation, copied-ID denial, cross-site valid-ID denial, and no-reuse behavior are required before F4 exit.                          |
| Residual risk       | UUIDs can leak through logs or URLs and can still be copied. They reduce predictability but are not secrets or authorization. Random UUID index locality could become a scaling cost; current F4 volume does not justify a different scheme.                   |

## Rollback Boundary

This ADR is documentation-only. Before schema/runtime work it is freely
reversible.

After authority records exist but before other service databases reference
them, rollback can remove the records and restore the frozen static registry
through the approved migration window. Once service-owned rows, memberships,
audit records, or F6 state reference these UUIDs, changing formats requires a
versioned dual-ID migration, reference inventory, backfill, contradiction/orphan
audit, and rollback proof. IDs must never be rewritten in place without that
plan.

## Repository Evidence

- `apps/*/prisma/schema.prisma`
- `apps/gateway/src/application/application.contracts.ts`
- `apps/gateway/src/application/application-registry.ts`
- `packages/grpc-auth/src/s2s-context.ts`
- gateway/root/release environment registry examples
- [ADR-0001](0001-f4-authority-owner.md)
- [ADR-0002](0002-f4-f6-entitlement-boundary.md)
- `docs/reports/2026-08-24-f4-authority-audit.md`
