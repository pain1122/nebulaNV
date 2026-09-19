# D1 Batch 1 Existing-Contract Repair Checkpoint

Date: 2026-09-15

Status: implementation, focused verification, container-backed Product
regression, and preserved F3 live verification complete.

Scope: the first narrow D1 Batch 1 repair from the Batch 0 audit. This closes
the false `effectivePrice` fact, inconsistent discount state/wire behavior, and
Product-create price requiredness mismatch. It does not add stock, availability,
variants, taxonomy relationships, Media references, or shop-currency policy.

## Evidence Classification

The repaired items were confirmed defects:

- `effectivePrice` was declared by protobuf, gateway DTO, OpenAPI, and the
  generated client, but Product omitted it. Proto scalar decoding could expose
  the omission as zero.
- no-discount rows returned an empty type even though the external enum promised
  `NONE`; single-row clearing left stale value/active/window fields; a one-sided
  date patch ignored the stored opposite date; and percentages above 100 were
  accepted by the owning service.
- Product create rejected an absent price while the gateway advertised it as
  optional and converted omission to an explicit zero.
- gateway create and bulk mappers materialized absent optional proto scalars as
  empty strings, zeros, false values, and empty arrays instead of preserving
  caller omission.

Stock/availability and variants remain confirmed implementation gaps. Currency,
gallery append mapping, identifier conflicts, and destructive-operation error
mapping remain confirmed defects in the Batch 0 ledger. No optional hardening or
future scaling item was promoted into this repair.

## Implemented Behavior

Product-service now owns price calculation and discount-state validation:

- `price`, `discountValue`, and `effectivePrice` leave the service as numbers;
- no discount is represented externally as `NONE` and internally as five
  canonical values: null type/value/window and inactive state;
- active percentage discounts calculate `price * (100 - value) / 100`;
- active fixed discounts calculate `price - value` and clamp at zero;
- the effective value is rounded to the Product money scale of two decimals
  using half-up rounding;
- inactive, future, and expired discounts return the base price;
- percentage values above 100 and negative values are rejected;
- a stored discount type requires a value, while fields without a type are
  rejected;
- `NONE` clears type, value, active state, start, and end for both single and
  bulk mutations;
- a partial date mutation is merged with stored state before validation, so its
  complete resulting window must remain ordered;
- partial bulk mutations are validated against every currently selected row
  before the common update is issued.

The gateway now requires callers to provide `price`, including when the intended
price is explicitly zero. Its create and bulk adapters send only fields supplied
by the caller. Product patch behavior remains sparse. Response mapping validates
the discount enum and temporarily accepts the former empty response as `NONE`
for rolling-upgrade compatibility.

The gateway input profile now requires both `title` and `price` for creation. A
bulk-discount request must contain at least one selector and at least one
discount change. OpenAPI and the generated TypeScript client reflect the
required create price.

## Why The Narrower Corrections Were Insufficient

Filling `effectivePrice` only in the gateway would have left Product's direct
HTTP and gRPC responses inconsistent and duplicated commercial arithmetic in a
transport adapter. Product therefore calculates it at the owning service.

Clearing only `discountType` would preserve contradictory database state and
make a later type change reactivate stale values or dates. The five discount
fields are normalized as one state. Validating only fields present in a patch
would still accept an invalid complete date window, so discount patches read and
validate the stored counterpart.

Changing only the OpenAPI annotation for price would leave the mapper's implicit
zero behavior. The DTO, input profile, generated contract, and mapper were
changed together.

## Compatibility, Migration, And Maintenance Cost

No Prisma schema or data migration is required. Existing null discount rows map
to `NONE` on read. Existing consumers that omitted create price must now send a
number; a free product remains supported by sending `price: 0` explicitly. This
is an intentional correction of contradictory behavior rather than a new
commercial feature.

The gateway accepts the old empty-string discount response during a mixed-image
rollout, but emits only the external `NONE` value. Partial bulk validation adds
one Product read query before mutation. This is acceptable for the current
default-site release; database-level invariant enforcement and large-catalogue
bulk scaling remain later considerations alongside D1 concurrency work.

## Focused Verification

Passed locally:

- Product unit: 6 suites, 36 tests;
- new Product discount coverage: 13 cases, including transformed undefined
  patch-property omission;
- focused gateway Product/input/OpenAPI: 4 suites, 19 tests;
- API client: 5 runtime tests plus browser and React Native compile consumers;
- Product and gateway type checks;
- Product and gateway builds;
- Product, gateway, and API-client lint with zero errors; existing Product e2e
  test typing warnings remain warning-only;
- protobuf isolated generated check;
- OpenAPI and generated-client stale checks.

The first container-backed attempt exposed two environment/implementation
findings. Several dependency containers had previously exited, so the initial
Product and F3 runs failed before Product assertions; restarting the existing
stack restored all eleven health checks and all six F3 live flows. A following
Product run passed 9 of 10 suites and 63 of 64 tests, then exposed that an HTTP
validation DTO can own an omitted discount property with value `undefined`.
Presence detection now ignores only `undefined` while retaining explicit
`null`, `false`, and zero values. Focused regression, type, and lint checks pass.
After rebuilding Product, its complete test configuration passed all 10 suites
and 65 tests. All eleven backend readiness checks and all six preserved F3 live
flows also pass.

## Next D1 Work

After the container-backed checkpoint passes, continue the existing-contract
repair order with shop-currency authority, gallery append semantics,
deterministic identifier conflicts, and stable destructive-operation errors.
Then add the Product commercial schema for stock, availability, concurrency,
and bounded variants.
