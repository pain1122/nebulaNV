# D1 Shop-Currency Authority Checkpoint

Started: 2026-09-19

Completed: 2026-09-21

Status: implementation and all focused, migration, container-backed Product,
backend readiness, and preserved F3 live verification complete.

Scope: close the Product-owned portion of D1-006 without choosing D2 cart
migration behavior in advance. Settings now supplies the only shop-currency
value accepted for new or explicitly recurrencyed Product records. Order must
consume the same authority during D2 before the cross-service finding is fully
closed.

## Evidence Classification

### Confirmed Defect Repaired In Product

Before this checkpoint, Settings seeded `USD`, Product's database supplied an
independent `EUR` default, Product responses contained an `EUR` fallback, and
callers could persist any string up to eight characters. A transient Settings
failure also cached `USD` for the lifetime of the Product process. These were
multiple authorities for the same commercial fact.

### Existing Data Preserved

Read-only live queries before the migration found:

- `pricing/default/default_currency = USD` in Settings;
- 66 Product rows with `currency = USD`;
- no Product row with another currency.

The migration therefore removes only the stale database default. It does not
rewrite any Product row.

### Deferred D2 Contract

Order still creates a cart with a local default and later derives currency from
the first Product. Product now prevents newly written Product records from
contradicting Settings, which preserves current Order compatibility, but it
does not define what should happen to a nonempty cart when an operator changes
shop currency. That cart transition and checkout revalidation policy belongs
to D2 and remains open.

## Implemented Contract

`pricing/default/default_currency` in Settings is the Product write authority.
Product now:

- trims and uppercases the configured value;
- accepts alphabetic currency identifiers from three through eight characters,
  preserving the existing `USD`, `EUR`, and `RIAL` configuration vocabulary;
- uses the configured value when create omits currency;
- accepts a caller value only when its canonical form equals the configured
  value;
- rejects malformed input as `currency_invalid`;
- rejects a valid but contradictory input as `product_currency_mismatch`;
- returns `shop_currency_not_configured` when the setting is absent or invalid;
- translates Settings transport failures through the existing gRPC-to-HTTP
  error mapper;
- does not cache dependency failures or invent a fallback;
- writes currency explicitly and returns the stored non-null value without an
  `EUR` response fallback.

An empty transport value remains equivalent to omission. This preserves the
current proto3 string contract, which does not provide presence information for
this field. Nonempty direct HTTP and gRPC inputs are validated at the owning
service boundary.

## Schema And Migration

Migration `20260919000100_shop_currency_authority` drops the `EUR` default from
`Product.currency`. The column remains required. Raw writes which bypass the
Product service must now supply currency explicitly instead of silently
creating a conflicting fact.

A focused reusable command was added:

```text
pnpm db:verify:product
```

It selects only Product from the existing disposable-database migration
verifier. The verifier creates a clean database, deploys every Product
migration, checks Prisma migration status, and always removes the disposable
database.

## Verification

Passed locally:

- Product TypeScript check;
- focused Product ESLint;
- Product unit configuration: 7 suites and 44 tests;
- currency cases for omission, canonicalization, malformed input, mismatch,
  missing/invalid configuration, Settings unavailability, and recovery without
  poisoned cache;
- backend orchestration tests: 55 tests;
- Prisma schema validation;
- `pnpm db:verify:product`: four migrations applied, status current, and zero
  `nebula_products_verify_*` databases left behind;
- populated Compose Product upgrade: migration recorded once, all 66 Product
  rows remained `USD`, the column remained required, and its default changed
  from `EUR` to no default;
- rebuilt Product container full configuration: 11 suites and 74 tests,
  including HTTP and gRPC omission/mismatch assertions;
- all 11 backend readiness checks;
- all six F3 gateway/generated-client live flows;
- formatting and `git diff --check`.

The first direct package migration command read the service-local development
`.env` and therefore addressed the separate `localhost:5432` database. The
Compose upgrade was rerun with its explicit `127.0.0.1:15432` connection and
verified from inside the running Postgres container. Neither migration rewrites
Product data. The scoped root verifier remains the preferred clean-migration
command because it supplies and cleans its own Compose database target.

The Product HTTP and gRPC suites assert that omitted currency resolves to `USD`
and that explicit `EUR` is rejected with `product_currency_mismatch`.

During the container proof, all application containers were found exited with
code 255 at the same time after their infrastructure dependencies had
restarted. Restarting the existing dependency chain restored them. Product had
exhausted its deferred Taxonomy initialization while Taxonomy was down, so it
was restarted once after Settings and Taxonomy became healthy. This restored
the existing default-category initialization and all readiness checks. No
service image, migration, or application log identified a Product currency
failure.

## Compatibility And Cost

Existing rows and response shapes are unchanged. Matching lowercase or padded
caller input is canonicalized, so current clients do not need to add a currency
when they already omit it. Clients that intentionally sent a currency different
from the configured shop currency now receive a stable validation error.

Each Product create and each update that explicitly changes currency performs
one Settings read. Ordinary Product reads and updates that omit currency add no
Settings traffic. Successful values are deliberately not cached so an operator
configuration change is observed without a Product restart; a cache with
invalidation can be considered later only if measured load requires it.

## Next Work

Continue the narrow existing-contract repair order with gallery append
semantics, deterministic slug/SKU conflicts, and stable destructive-operation
errors. The larger Product commercial schema for stock, availability,
concurrency, and bounded variants follows those repairs.
