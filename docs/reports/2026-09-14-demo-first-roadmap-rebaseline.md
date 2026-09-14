# Demo-First Roadmap Rebaseline

Date: 2026-09-14

Status: partially superseded by the
[Backend Ecommerce Roadmap Correction](2026-09-14-backend-ecommerce-roadmap-correction.md).
The F4 pause, default-site compatibility rule, M3S policy, and post-product
cloud/tenant direction remain adopted. The frontend-first order and release
gates below are historical.

## Decision

NebulaNV will pause F4 after the audited R5 checkpoint and build a complete,
usable default-site product before resuming tenant and realm implementation.
The adopted execution order is:

```text
F7
-> D1 -> D2 -> D3 -> D4
-> M2
-> F5
-> M5
-> M3S
-> F8
-> F6
-> D5
-> AI0
-> M7
-> F9
-> F4 (resume at R6.1)
```

General M6 is deferred. An owning phase may implement a bounded queue, polling
loop, index, cache, or reconciliation path for a concrete consumer, but it may
not turn that local need into a general event/search/worker platform without a
later evidence-backed roadmap change.

## Evidence Behind The Change

The F4 implementation-depth audit found a safe pause boundary at commit
`3285c00`:

- Tenant Authority persistence, membership/grants, inactive realm/trust control
  records, and typed reads exist.
- Realm Auth default/operator stores, encrypted shadow migration, and staged
  operator credentials exist but expose health only.
- Context-v3 receivers and clients exist but have no writer or gateway
  selection.
- The gateway still uses the static single-site application registry.
- Existing Auth/User and signed context v1/v2 remain the active demo path.
- Domain tenant/site ownership, Realm Auth sessions/cutover, subordinate SSO,
  second-root isolation, invalidation, and final adversarial proof remain open.

This means continuing F4 would build more tenant/realm foundation before the
product has supplied enough real frontend, commerce, media, module, AI, and
cloud behavior to validate the assumptions. Pausing does not leave a partially
activated authentication or tenant path.

## Release Boundaries

### P0: Working Web Commerce Demo

F7 and D1-D4 deliver separate admin/storefront applications and the complete
web catalog, cart, demo checkout, order, and administration flow through the
gateway.

P0 is explicitly default-site/single-realm. It does not claim general tenant
isolation, licensed modules, mobile, advanced storage, AI, or cloud deployment.

### P1: Commerce Portfolio Product

M2, F5, M5, M3S, F8, F6, and D5 add content/composition, governed bounded media,
a web-first showroom with mobile handoff, storage compatibility, the mobile
application, an evidence-backed module boundary, and mobile commerce.

P1 still makes no multi-tenant claim. Its purpose is a coherent demonstrable
product rather than a commercial SaaS control plane.

### P2: Multi-Tenant Foundation

AI0 and M7 add evaluated default-site AI/RAG and analytics. F9 then deploys the
actual product shape and chooses the primary cloud/storage topology. F4 resumes
at R6.1 afterward and completes Realm Auth activation, application/authority
cutover, domain scoping, migration, federation, and isolation evidence.

Only the completed F4 exit permits tenant/realm isolation claims.

## Default-Site Compatibility Rule

Before F4 resumes:

- existing configured tenant/site/application values are compatibility context;
- public callers cannot choose or override tenant/site scope;
- product phases preserve service ownership, actor authorization, gateway-only
  APIs, stable IDs, and migration inventories;
- new work does not activate dormant F4 services/contracts as a side effect;
- future tenant fields and abstractions are added only when current behavior or
  an already verified contract requires them;
- documentation and demos state the single-site/default-realm limit.

This avoids building speculative multi-tenant structures while preserving a
bounded path for the later F4 migration.

## M3S Storage Decision

M3S storage is a compatibility feature before cloud implementation.

Media-service remains the application privacy and media-policy authority.
Object storage holds bytes and does not decide whether a caller may read or
mutate media. MinIO remains the local provider.

Pre-F9 M3S may implement:

- only the S3-compatible operations required by F5/M5 workflows;
- a provider-neutral contract fixture/test double;
- deterministic media/asset identifiers and provenance;
- selected derived variants or bundles proven necessary by M2/M5;
- failure, retry, cleanup, and reconciliation behavior for those exact
  operations;
- an F9 handoff containing measured object sizes, rates, URL behavior,
  lifecycle needs, failure cases, and portability assumptions.

Pre-F9 M3S must not select or build:

- permanent bucket/account/region topology;
- a broad storage abstraction covering unused providers/features;
- replication, cross-cloud synchronization, or active-active behavior;
- provider migration orchestration;
- final lifecycle, retention, secure-deletion, or KMS/key topology;
- full Supabase/AWS/Azure parity.

F9 selects and proves the primary cloud from actual workload evidence. An
explicit ADR may then strengthen or revise the M3S compatibility boundary.

## Phase Dependency Corrections

- F7 now depends on completed F3 gateway/client behavior, not unfinished
  F4-F6.
- D1-D4 use the current default-site domain model and record later F4 migration
  requirements instead of pretending scoped persistence already exists.
- M2 follows real admin/storefront content consumers rather than AI0.
- F5 follows real M2/media/showroom needs and owns only its bounded job path.
- M5 is web-first, uses F5 media, and does not wait for M3S, F6, F8, F9, or M6.
- M3S generalizes only the media/storage compatibility demonstrated by F5/M5.
- F8 adds the mobile side of the already proven product/showroom contracts.
- F6 follows real web/mobile/showroom capability needs and defers final licensed
  tenant allocation to resumed F4/commercial work.
- D5 closes mobile commerce after F8/F6.
- AI0/M7 are default-site product capabilities and list every future scope
  record that F4 must isolate.
- F9 uses the implemented workload to decide cloud and storage structure.
- F4 resumes from R6.1 with a larger but evidence-backed domain inventory.

## Documentation Actions Completed

- `TODO-ALTERNATIVE.md` now owns the demo-first sequence, release definitions,
  compatibility rules, revised phase entry gates, deferred M6 status, and M3S
  storage boundary.
- The prior F4 current-focus checklist is preserved as
  `docs/reports/2026-09-14-f4-paused-execution-checklist.md`.
- `docs/current-focus.md` now owns F7 and begins with a repository-backed
  frontend inventory before any application move.
- Historical F4 ADRs and execution reports remain unchanged evidence. Their
  target requirements are paused rather than silently weakened or marked
  complete.

## Restart And Rollback

The roadmap change is documentation-only. It changes no runtime, schema, data,
deployment, or traffic.

F4 can resume from the clean R5 commit boundary after resolving the untracked
R6.1 experiment and rerunning the focused/stateful gates recorded in the F4
audit. M3S provider structure can advance only after F9 records primary-cloud
evidence. General M6 can re-enter only through scope change control with named
consumers and measured benefit.
