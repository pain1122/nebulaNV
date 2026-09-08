# ADR-0004: F4 Tenant, Site, And Application Lifecycle

Date: 2026-08-24

Status: accepted for the F4 Batch 1 lifecycle decision. Batch 2 item 2 stages
the closed database states and transition guards; authorized/audited mutation,
invalidation, consumers, and traffic cutover remain later checklist items.

Amended 2026-08-31 by [ADR-0014](0014-f4-customer-identity-realms-and-federation.md):
tenant/site/application lifecycle remains accepted. References to one global
identity/session population are superseded by realm, provider, federation-
trust, root-SSO, and application-session lifecycle rules.

## Context And Classified Findings

The gateway currently has one deployment-configured `enabled` boolean per
application record. It rejects disabled records and includes only enabled web
origins. This is a correct F3 single-site bridge and must be preserved until
the persistent registry migration.

There is no persistent tenant, site, or application lifecycle, no lifecycle
revision/invalidation path, and no status-aware export/recovery rule. That is a
**confirmed defect against the adopted F4 requirement**, not evidence that the
current gateway boolean is incorrectly implemented.

Current Product, Blog, Media, and Order statuses are domain-record lifecycles.
Auth's temporary user-disable key is a global identity/session control. Shared
health responses report runtime readiness as `ok` or `degraded`. Reusing any of
those as tenant/site/application lifecycle would be a **stale or incorrect
boundary interpretation**.

Automatic suspension grace periods, customer self-service recovery, legal
retention schedules, and automated erasure are **optional hardening or future
product/operations work**. F6 separately owns license lifecycle and grace
behavior. F4 must not invent those policies.

## Decision Summary

Tenant and Site use these business lifecycle states:

```text
PROVISIONING -> ACTIVE <-> SUSPENDED
       |          |            |
       +----------+------------+-> ARCHIVED
                                    |
                                    +-> SUSPENDED (platform recovery only)
```

Application uses these registration lifecycle states:

```text
PENDING_VERIFICATION -> ACTIVE <-> DISABLED
          |                |          |
          +----------------+----------+-> REVOKED

ACTIVE or DISABLED -> PENDING_VERIFICATION when ADR-0006 registration rules
require identity re-verification.
```

Application `REVOKED` is terminal for that `applicationId`. Tenant/Site
`ARCHIVED` is terminal for normal access but may enter `SUSPENDED` through an
explicit platform recovery operation before any later activation.

No state transition is implied by a client request, deployment health signal,
license state, billing event, domain-record state, or parent relationship.
Tenant-authority-service owns each transition and its durable audit/revision effects.
ADR-0006/0008 define who may request it, and ADR-0012 defines live-required
execution, atomic audit/outbox effects, and freshness.

## Tenant And Site States

| State          | Meaning                                                                                 | Normal business reads/writes                                                                                                                             | Login and session consequence                                                                                                                                                                                               | Export/recovery consequence                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PROVISIONING` | Authority record exists but setup/verification is incomplete.                           | Denied. Only explicit authority setup and validation operations are allowed. Domain data must not treat the scope as live.                               | Gateway must not resolve an external application into this scope, so application-scoped login/refresh is denied. Global Auth identity is unchanged.                                                                         | Only setup/diagnostic metadata may be exported. This state does not promise that domain data exists.                                                |
| `ACTIVE`       | Scope is eligible for normal use. This is necessary but never sufficient authorization. | Allowed only after application, membership, role, target, resource, entitlement-when-applicable, and domain checks also pass.                            | An active verified application may reach Auth. Auth still independently validates credentials/session.                                                                                                                      | A dedicated authorized export may run with verified scope and audit. Normal reads are not an export substitute.                                     |
| `SUSPENDED`    | Reversible business/security hold. Data and identifiers are retained.                   | Denied for normal tenant/site business operations, including writes and ordinary reads. Narrow authority recovery/diagnostic operations remain possible. | Applications under the effective suspended scope do not resolve for external login/refresh. Existing global sessions are not destroyed merely because one scope is suspended and may remain usable in another active scope. | A dedicated audited export/recovery lane remains eligible while data is retained. Status eligibility does not itself authorize the actor.           |
| `ARCHIVED`     | Scope is retained but closed to normal use. No automatic physical deletion occurs.      | Denied. Only explicit retention, export, legal/erasure, and platform recovery operations may access retained data.                                       | No application under the scope resolves for external login/refresh. Global identity/session state remains independently owned by User/Auth.                                                                                 | A dedicated audited export may run while retention permits. Recovery must move to `SUSPENDED`, reconcile data/references, then separately activate. |

ADR-0008 freezes export-role eligibility and ADR-0012 requires live authority
and durable audit for the dedicated operation. This ADR freezes the state gate:
`ACTIVE`, `SUSPENDED`, and retained `ARCHIVED` allow only that dedicated export
operation after independent authorization; `PROVISIONING` allows only setup
metadata. If a service has no export contract today, this decision does not
create one or permit database access as a substitute.

## Application States

| State                  | Meaning                                                                                | Gateway resolution and public traffic                                                                                                                          | Administration and recovery                                                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PENDING_VERIFICATION` | Registration exists but its domain/origin or native identity is not currently trusted. | Never resolves. It cannot provide CORS origin admission, login, refresh, reads, writes, or client capability delivery.                                         | Only ADR-0006/0008/0012 verification, edit, revoke, and audited operations are eligible.                                                                      |
| `ACTIVE`               | Registration is verified and administratively enabled.                                 | May resolve only when its owning tenant and site are also `ACTIVE` and every exact identity check passes. Resolution still grants no user/domain permission.   | ADR-0006 registration rules govern changes and re-verification.                                                                                               |
| `DISABLED`             | Reversible application-specific hold; owning tenant/site state is unchanged.           | Never resolves. Existing application-bound cache/context is invalidated within ADR-0012's 15-second bound. Global user sessions are not automatically revoked. | An authorized operation may re-enable it after all registered identities still verify, or move it to re-verification/revocation.                              |
| `REVOKED`              | Registration is permanently retired for this `applicationId`.                          | Never resolves and never contributes an allowed browser origin or mobile identity. No fallback to its static F3 record is allowed.                             | The application ID is never reused or reactivated. ADR-0006 governs external-identity quarantine, reassignment, deletion/tombstone, and any new registration. |

The current F3 `enabled: true` record maps to `ACTIVE` only after its persistent
tenant, site, application, and identity backfill all pass validation. An
`enabled: false` record maps to `DISABLED` unless migration evidence proves it
was never verified, in which case the migration plan may classify it as
`PENDING_VERIFICATION`. Nothing maps automatically to `REVOKED`.

## Effective State And Cascade Rules

Normal external access requires all of:

```text
tenant.lifecycle == ACTIVE
AND site.lifecycle == ACTIVE
AND application.lifecycle == ACTIVE
AND registration identity verifies exactly
AND actor and domain authorization pass
```

Rules:

1. Tenant state is the ceiling for every owned site and application. A
   non-active tenant blocks normal access without overwriting child rows.
2. Site state is the ceiling for its applications and domain data. Suspending
   one site does not suspend sibling sites owned by the same active tenant.
3. Application state affects only that registration/application. Disabling one
   application does not suspend its site, sibling applications, tenant, or a
   user's global identity.
4. Parent-management relationships never bypass the target tenant/site state
   and never make a sibling active or accessible.
5. Domain-record statuses remain intact. Suspending or archiving a site does not
   rewrite every Product, Blog, Media, Cart, or Order row; access applies the
   authority ceiling in addition to domain lifecycle.
6. Restoring a parent does not automatically restore children. Preserved child
   states are reevaluated independently.
7. Every material transition advances ADR-0012's authority revision in the same
   transaction as its audit/outbox facts and invalidates affected
   registration/membership decisions. Ordinary cached decisions expire within
   15 seconds; only allowlisted anonymous public reads have the absolute
   60-second safe-degraded ceiling.

## Authentication Versus Scope Admission

Global login credentials and sessions remain Auth/User concerns. Tenant, site,
and application lifecycle controls whether an external application may enter a
scope; it does not redefine whether the human identity exists.

- Gateway performs application and effective tenant/site lifecycle resolution
  before forwarding application-scoped login, refresh, or business traffic.
- Auth independently validates credentials, JWTs, token version, disabled-user
  state, and refresh-session state. Tenant-authority-service does not issue or parse
  JWTs.
- Suspending one tenant/site/application must not globally revoke a user who may
  have another active membership. ADR-0009/0012 membership freshness removes
  only the affected scope.
- Globally disabling a user in Auth continues to deny that user even when every
  tenant/site/application is active.
- A valid existing JWT, public client ID, old signed context, or cached
  registration cannot reactivate a non-active scope.

## Business Lifecycle Versus Runtime Health

Lifecycle and deployment/runtime health are independent dimensions:

| Dimension               | Owner and current/target vocabulary                                                                                                                          | Rule                                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Business lifecycle      | Tenant-authority-service; Tenant/Site `PROVISIONING`, `ACTIVE`, `SUSPENDED`, `ARCHIVED`; Application `PENDING_VERIFICATION`, `ACTIVE`, `DISABLED`, `REVOKED` | Durable administrative truth used for scope admission. Only authorized authority operations change it.                                                            |
| Service readiness       | Each runtime using the current shared health contract: overall `ok` or `degraded`, with probe `ok`, `skipped`, or `error`                                    | Observational signal. It may cause requests to fail safely, but it never mutates or overrides business lifecycle.                                                 |
| Deployment/module state | Future F6/F9 deployment owners                                                                                                                               | A deployment may be unavailable while its business record remains active. A healthy deployment cannot activate a suspended/archived scope or revoked application. |
| Domain-record lifecycle | Product, Blog, Media, Order, and other owning services                                                                                                       | Evaluated in addition to authority lifecycle. Domain `ACTIVE`, `ARCHIVED`, `PUBLISHED`, `READY`, or similar values never imply tenant/site eligibility.           |
| License lifecycle       | F6 technical entitlement owner                                                                                                                               | Evaluated separately when a feature requires it. License `ACTIVE` cannot override authority suspension; tenant `ACTIVE` does not grant a licensed feature.        |

No F4 schema may use readiness/deployment health as its tenant, site, or
application status field. No health probe may automatically change business
lifecycle.

## Failure-Oriented Review

| Concern             | Lifecycle decision                                                                                                                                                                                                                                                                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prevention          | Effective access requires all three active lifecycle records plus exact registration and independent actor/domain checks. Transition APIs are internal, typed, authorized, audited, and revisioned; raw status fields from clients are ignored/rejected. Parent/child state is evaluated without destructive cascade updates.                                              |
| Detection           | Required evidence includes every allowed/forbidden transition, non-active gateway resolution denial, status/cache contradiction, stale context after suspension, child-state preservation, cross-site isolation, export-lane access, and readiness/lifecycle disagreement.                                                                                                 |
| Containment         | Tenant suspension blocks all owned scopes; site suspension is limited to one site; application disablement is limited to one registration. None globally disables the user. Domain services repeat lifecycle/resource checks so a wrong gateway decision is insufficient.                                                                                                  |
| Fail state          | Unknown lifecycle values, missing records, contradictory ownership, stale/unverifiable freshness, and authority unavailability deny normal access. Export/recovery also fail closed unless their dedicated authorization and audit dependencies are available. No static production fallback is permitted.                                                                 |
| Recovery            | Preserve child states and IDs, restore authority data, reconcile tenant/site/application bindings, invalidate caches, re-establish revision freshness, and enter `SUSPENDED` before activation. Runtime recovery alone never changes business state.                                                                                                                       |
| Common-mode failure | Gateway and domains may consume the same wrong authority state/cache; Auth and authority may share operators, network, Redis, or configuration. Independent domain resource checks limit but cannot eliminate a falsely active authoritative scope.                                                                                                                        |
| Evidence            | Transition-table tests; active/non-active login, refresh, read, write, and export matrices; in-flight/stale-cache suspension; authority restart/restore; wrong gateway context denied downstream; sibling unaffected; parent bypass denied; runtime `ok` with suspended scope denied; runtime `degraded` with active scope fails operationally without changing lifecycle. |
| Residual risk       | A compromised authority administrator can suspend valid customers or activate invalid records. The export/recovery lane is intentionally powerful and requires ADR-0008 role plus ADR-0012 live/audit controls. Ordinary in-flight/cached authorization can remain usable for at most 15 seconds, and already-public content for at most 60 seconds.                       |

## Compatibility, Migration, And Rollback

This ADR changes documentation only. No current schema, registry, Auth flow,
domain behavior, health contract, or runtime contract changes.

ADR-0013's migration must be additive and preserve the F3 bridge:

1. create persistent lifecycle fields and accepted values only after the full
   Batch 1 schema matrix is approved;
2. seed default tenant/site/application records without deriving authority from
   public labels;
3. validate every enabled static registration and map it to `ACTIVE` only after
   tenant/site/identity checks pass;
4. deploy status-aware authority resolution behind `ApplicationRegistry` with
   ADR-0012's cache/revision policy;
5. prove disabled/non-active denial before making persistent authority primary;
6. retain the static adapter only for the explicit migration/test window, never
   as automatic outage fallback.

Before persistent authority is primary, rollback may restore the frozen static
registry under ADR-0001's compatibility conditions. After lifecycle state or
authority IDs are referenced by domain data, audit, membership, or F6 records,
rollback requires reconciliation and a data migration. It must not translate
`SUSPENDED`/`ARCHIVED`/`REVOKED` back to `enabled: true`.

## Resolved And Deferred Boundaries

ADR-0005 through ADR-0012 now freeze channel, registration, role, parent,
request/context, schema/backfill, freshness, invalidation, and authority-audit
decisions. Physical tenant/site data purge, legal retention for domain data, a
new export implementation, and F6 license/module/commercial behavior remain
outside this ADR and follow their later roadmap items.

## Repository Evidence

- `apps/gateway/src/application/application-registry.ts`
- `apps/gateway/src/application/application.contracts.ts`
- `apps/auth-service/src/auth/token/access-token-validation.service.ts`
- `apps/auth-service/src/auth/redis/auth-redis.service.ts`
- `packages/config/src/health.ts`
- current Product, Blog, Media, and Order Prisma lifecycle enums
- `docs/architecture/testing-and-health.md`
- `docs/architecture/tenant-package-channel-platform.md`
- [ADR-0001](0001-f4-authority-owner.md)
- [ADR-0002](0002-f4-f6-entitlement-boundary.md)
- [ADR-0003](0003-f4-authority-identifiers.md)
- `docs/reports/2026-08-24-f4-authority-audit.md`
