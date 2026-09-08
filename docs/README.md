# NebulaNV Developer Docs

This folder is the context shortcut for NebulaNV. It should explain the system well enough that a returning developer or AI agent can work without rereading entire service directories.

The goal is not to document every line. The goal is to preserve boundaries, current contracts, known gaps, and the files that matter.

## Read Order

For most backend tasks, read in this order:

1. [Current Focus](current-focus.md)
2. [System Relationships](architecture/system-relationships.md)
3. [Contracts And Boundaries](architecture/contracts-and-boundaries.md)
4. [Actor Context Contract](architecture/actor-context-contract.md) for identity or authorization work
5. The relevant service note under [Service Notes](#service-notes)
6. The relevant package note under [Package Notes](#package-notes) if touching shared packages
7. [Testing And Health](architecture/testing-and-health.md) if changing behavior or verification
8. [Local Dev And Docker Boot](architecture/local-dev-and-docker-boot.md) if running services or Docker
9. [Docker Configs](docker-configs.md) if changing Compose, images, env, Dockerfiles, or release packaging

## Architecture Notes

- [System Relationships](architecture/system-relationships.md): ownership, valid service connections, forbidden paths.
- [Contracts And Boundaries](architecture/contracts-and-boundaries.md): DTO/proto/service/Prisma/mapper rules, naming, identity, cross-service clients.
- [API And Proto Versioning](architecture/api-and-proto-versioning.md): additive-change rules, breaking-change triggers, deprecation, and compatibility verification.
- [Gateway External API Standards](architecture/gateway-api-standards.md): executable route policies, envelopes/errors, query profiles, pagination, retry/idempotency, and contract-only OpenAPI ownership.
- [S2S Security Contract](architecture/s2s-security-contract.md): implemented v2 envelope, pairwise keys, replay defense, rotation, and canonical service bootstrap.
- [Actor Context Contract](architecture/actor-context-contract.md): implemented service/user identity provenance, forbidden raw-header fallbacks, and actor/target separation.
- [Tenant, Package, Channel, And Kubernetes Platform](architecture/tenant-package-channel-platform.md): target tenant hierarchy, parent contracts, site/app ownership, modular Kubernetes features, licensing, isolation, and pre-admin prerequisites.
- [ADR-0001: F4 Authority Owner](architecture/decisions/0001-f4-authority-owner.md): accepted ownership boundary for persistent tenant/site/application/membership authority, alternatives, costs, failure behavior, and rollback boundary.
- [ADR-0002: F4 Entitlement Reference And F6 Execution Boundary](architecture/decisions/0002-f4-f6-entitlement-boundary.md): minimal non-granting F4 entitlement anchor versus F6 technical capability/license execution and deferred commercial scope.
- [ADR-0003: F4 Authority Identifier Format And Creation](architecture/decisions/0003-f4-authority-identifiers.md): canonical UUIDv4 authority IDs, creation ownership, public lookup-handle separation, migration compatibility, and failure behavior.
- [ADR-0004: F4 Tenant, Site, And Application Lifecycle](architecture/decisions/0004-f4-authority-lifecycle.md): business lifecycle states and transitions, login/read/write/export behavior, effective-state cascade, runtime-health separation, and recovery.
- [ADR-0005: F4 WEB, ANDROID, And IOS Channel Semantics](architecture/decisions/0005-f4-channel-semantics.md): closed presentation kinds, application/profile mapping, site-data ownership, F3 compatibility, and channel failure behavior.
- [ADR-0006: F4 Web And Native Application Registration](architecture/decisions/0006-f4-application-registration.md): exact web-origin and Android/iOS identity proof, activation, uniqueness, transfer/rotation, revocation, deletion/tombstones, and native-attestation limits.
- [ADR-0007: F4 Parent And Subordinate Relationships](architecture/decisions/0007-f4-parent-relationships.md): explicit direct-link lifecycle, creation/acceptance, privacy-minimizing membership management, sibling denial, audit, and recovery.
- [ADR-0008: F4 Platform And Scoped Membership Roles](architecture/decisions/0008-f4-scoped-roles.md): non-hierarchical platform/tenant/site/parent/editor/user roles, operation matrix, delegation, privacy limits, and current-role migration.
- [ADR-0009: F4 Authoritative Request Scope](architecture/decisions/0009-f4-authoritative-request-scope.md): target-based actor/membership/application/operation authority, independent domain checks, freshness revision, failure behavior, and the explicit boundary before signed-context versioning.
- [ADR-0010: F4 Signed-Context Compatibility](architecture/decisions/0010-f4-signed-context-compatibility.md): unchanged S2S v3 envelope, strict default-realm context-v2 resolution/authorized shapes, envelope-versus-context field ownership, receiver-first rollout, and mixed-version/downgrade denial; ADR-0014 adds realm-aware context v3 without widening v2.
- [ADR-0011: F4 Data Scope And Migration Matrix](architecture/decisions/0011-f4-data-scope-and-migration-matrix.md): exact authority records, immutable membership epochs, per-service root/direct-child scope, scoped constraints, cross-service references, ordered backfill, orphan evidence, denial tests, and rollback boundaries.
- [ADR-0012: F4 Failure, Freshness, Audit, And Recovery](architecture/decisions/0012-f4-failure-freshness-audit-and-recovery.md): live/bounded/public-read operation classes, 15/60-second freshness ceilings, transactional invalidation, cache integrity, one-year append-only authority audit, cross-database race containment, recoverable storage moves, and compromise response.
- [ADR-0013: F4 Ordered Additive Migration Sequence](architecture/decisions/0013-f4-ordered-additive-migration-sequence.md): explicit traffic gates and authority/member/context/owner/consumer/state ordering that preserves default clients while preventing application filtering from substituting for database backfill and constraints.
- [ADR-0014: F4 Customer Identity Realms And Federation](architecture/decisions/0014-f4-customer-identity-realms-and-federation.md): superseding customer-root identity isolation, realm/provider/application trust, realm-qualified subjects, audience-bound subordinate SSO, durable credential/session generation, context-v3 compatibility, migration, and failure evidence while preserving F3 and tenant/domain authority boundaries.
- [ADR-0015: F4 Identity-Realm Record And Migration Freeze](architecture/decisions/0015-f4-identity-realm-record-and-migration-freeze.md): final Batch 1R administrator/session decisions, closed owner and lifecycle records, separate credential/session fences, exact context-v3 references, receiver-first R0-R11 migration/rollback order, and local/test versus production placement boundaries.
- [Testing And Health](architecture/testing-and-health.md): build/lint/test layers, health model, readiness gaps, verification checklist.
- [Local Dev And Docker Boot](architecture/local-dev-and-docker-boot.md): ports, Docker/runtime URLs, DB migration patterns, WSL/Docker clock drift.
- [Docker Configs](docker-configs.md): Compose files, backend Dockerfile, release image flow, env boundaries, Docker guardrails.

## Package Notes

- [Protos Package](packages/protos.md)
- [Config Package](packages/config.md)
- [Clients Package](packages/clients.md)
- [External API Client Package](packages/api-client.md)
- [gRPC Auth Package](packages/grpc-auth.md)

## Service Notes

- [Auth Service](services/auth-service.md)
- [Tenant Authority Service](services/tenant-authority-service.md)
- [Gateway Service](services/gateway.md)
- [User Service](services/user-service.md)
- [Settings Service](services/settings-service.md)
- [Taxonomy Service](services/taxonomy-service.md)
- [Media Service](services/media-service.md)
- [Product Service](services/product-service.md)
- [Blog Service](services/blog-service.md)
- [Order Service](services/order-service.md)
- [Web App](services/web.md)

## Reports

- [2026-08-31 F4 Identity-Realm Rebaseline](reports/2026-08-31-f4-identity-realm-rebaseline.md)
- [2026-08-26 F4 Batch 3 Execution Checklist](reports/2026-08-26-f4-batch3-execution-checklist.md)
- [2026-08-26 F4 Batch 2 Exit Proof](reports/2026-08-26-f4-batch2-exit-proof.md)
- [2026-08-24 F4 Batch 1 Exit Matrix](reports/2026-08-24-f4-batch1-exit-matrix.md)
- [2026-08-24 F4 Authority Pre-Implementation Audit](reports/2026-08-24-f4-authority-audit.md)
- [2026-08-24 F3 Execution Checklist Archive](reports/2026-08-24-f3-execution-checklist.md)
- [2026-08-22 F3 Exit Proof](reports/2026-08-22-f3-exit-proof.md)
- [2026-05-28 Stabilization And Docs Report](reports/2026-05-28-stabilization-and-docs-report.md)
- [2026-06-23 Media Filemanager And Supabase Conclusion](reports/2026-06-23-media-filemanager-and-supabase-conclusion.md)
- [2026-06-29 Media Filemanager Vision Evolution](reports/2026-06-29-media-filemanager-vision-evolution.md)

## Documentation Rule

Docs should be factual and current.

Mark future behavior as `Target` or `Planned`. Do not mix target architecture with implemented behavior without labeling it.

If a rule matters at runtime, it should eventually exist in code as one of these:

- type
- DTO validation
- mapper
- guard
- service check
- database constraint
- test

## Maintenance Checklist

When changing a service contract:

- Update the service doc.
- Update `system-relationships.md` if connections changed.
- Update `contracts-and-boundaries.md` only if a global rule changed.
- Update `testing-and-health.md` if verification expectations changed.
- Update package notes if a shared package contract or exported helper changed.
- Update `docker-configs.md` if Compose, Dockerfiles, release images, or runtime env boundaries changed.
- Validate related file paths before adding them to docs.
