# Backend Ecommerce Roadmap Correction

Date: 2026-09-14

Status: adopted planning correction.

Supersedes: the frontend-first phase order in the 2026-09-14 demo-first
rebaseline. The decision to pause F4, the default-site compatibility boundary,
and the M3S storage-compatibility policy remain in force.

## Corrected Goal

NebulaNV will complete a coherent backend from its existing core services
through basic ecommerce before making a storefront or administration panel an
execution dependency.

The backend must be demonstrable through the public gateway, generated client,
deterministic data, integration tests, and live database evidence. The
user-owned Vite admin will later exercise these stable contracts and provide
operator workflow proof. Public storefront work begins only after concrete
client requirements are available.

## Evidence Behind The Correction

The repository already implements substantial Product and Order behavior:

- Product lifecycle states, public/admin read separation, taxonomy facade,
  gallery operations, internal gRPC contracts, and gateway Product routes.
- Cart ownership, cart item mutation, transactional checkout, order-item
  snapshots, user-owned order reads, admin status mutation, and gateway Order
  routes.
- Authenticated actor derivation, gateway envelopes, generated external client
  checks, and focused policy/denial tests.

The immediate gaps are backend gaps rather than missing frontend shells:

- no authoritative product variant model;
- unchecked product media URL fields instead of validated Media references;
- inconsistent Product/Order/settings currency policy;
- incomplete checkout idempotency, stock, status-transition, concurrency, and
  rollback behavior;
- incomplete parity between internal Product operations and the deliberately
  selected external administration surface;
- incomplete deterministic seed/reset and gateway-only live ecommerce proof.

Building a new storefront does not close these gaps and would force product UI
decisions before the backend contract is stable.

## Adopted Order

```text
D1 Product/Catalog backend
-> D2 Cart/Checkout/Order backend
-> B0 Backend Ecommerce Release
-> wait for the supplied Vite admin
-> F7 Admin Integration Foundation
-> D3 Admin Workflow Proof
-> P0 Admin-Validated Ecommerce Demo
-> M2 -> F5 -> M5 -> M3S -> F8 -> F6 -> D5
-> AI0 -> M7 -> F9 -> F4
```

D4 Client-Driven Storefront is a separate non-gating track after B0. It starts
only when a named client's requirements are known.

B0 is independent of every frontend. It proves the complete default-site demo
transaction through gateway APIs. F7 and D3 start only when the Vite source is
available. D4 is not a prerequisite for backend, admin, or later
backend-centered completion.

## Boundary Decisions

- D1/D2 own backend domain correctness, migrations, transport parity, gateway
  APIs, generated-client contracts, fixtures, and live failure evidence.
- Local client registrations may be used for tests, but production client IDs,
  origins, domains, proxy paths, and deployment addresses remain configurable.
- Current `apps/web` remains a compatibility client until the Vite admin passes
  D3 parity. It is not the desired final admin.
- F7 imports and adapts the supplied Vite admin without converting it to
  Next.js. It does not build a storefront.
- D4 selects its frontend framework and routing only from concrete client and
  deployment requirements available at that time.
- Product-to-Media correctness may be completed in D1. The admin file manager,
  processing breadth, and storage-provider structure remain later F5/M3S work.
- M3S remains a compatibility feature until F9 supplies primary-cloud evidence.
- F4 R0-R5 remains dormant; R6.1 and tenant/realm activation remain after F9.

## Working-Tree Disposition

The uncommitted `apps/storefront` experiment and its build/CI wiring were
removed. They had no database or deployed runtime effect. The committed F3
gateway/client profiles and APIs remain intact. The unrelated untracked Realm
Auth R6.1 experiment remains untouched.

## Restart And Rollback

This correction changes planning and removes only uncommitted frontend work.
It does not alter schemas, data, backend runtime behavior, or deployed traffic.
The previous frontend inventory remains historical evidence, marked
superseded for execution. D1 begins with a full contract/data audit before any
backend schema or API mutation.
