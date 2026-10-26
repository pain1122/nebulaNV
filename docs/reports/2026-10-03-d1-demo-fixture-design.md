# D1 demo fixture catalogue and execution design (2026-10-03)

Status: implementation planned before seeder changes. Salar selected showcase
by default and a limits profile on demand. Live seed/reset proof is not claimed.

## Scope and feature ownership

The first fixture module covers the implemented D1 Product/catalogue release.
It supplements the current minimal Product/Blog boot seed until the replacement
has passed clean creation, verification, rerun, and scoped reset. Identity,
Settings, default Taxonomy initialization, and authority base seeders remain
owned by their services. Order/cart scenario modules follow D2 hardening; M2,
3D/VR, frontend, tenant, payment, and AI scenarios must not imply completion.

## Fixture catalogue

| Feature                | Showcase                                                                   | Limits/adversarial proof                                                                                       |
| ---------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Product lifecycle      | Active, draft, archived, soft-deleted                                      | Hidden/deleted public reads denied; archive/restore workflow                                                   |
| Commercial state       | Normal, free, cent-valued, tracked/untracked                               | int32 maximum stock; largest safe example below Decimal(18,2) limit; invalid scale/range denied                |
| Discounts              | Percentage, 100%, fixed clamp-to-zero, future, expired, inactive           | Percentage >100 and contradictory discount state rejected                                                      |
| Variants               | Multiple options, inherited price, override, zero stock, inactive, deleted | 50 non-deleted variants, 3 option names, 40/80-character name/value bounds; 51st and fourth option denied      |
| Taxonomy               | Parent/child categories, brand, ordered tags, separate hidden category     | 64 bound tags; 65th, wrong kind, missing and hidden references denied                                          |
| Media                  | Two real uploaded PNG fixtures, thumbnail and ordered gallery              | 50 images in one permitted add request; 51 in one request rejected; provider URL and storage metadata rejected |
| Public/admin reads     | Eligible public rows; repairable admin-only rows                           | Visibility cannot be widened with caller filters or identity/site fields                                       |
| Concurrency/uniqueness | Stable SKU/slug and versioned mutation examples                            | Stale writes, SKU/option collisions rejected with unchanged state                                              |
| Presentation           | Unicode content, featured ordering, promo and SEO metadata                 | Maximum title/SKU and selected string bounds; deferred URLs rejected                                           |

Over-limit payloads are executable rejection scenarios, not invalid persistent
seed rows. Maximum capacities are loaded explicitly, keeping ordinary boot
and daily demo use practical. The catalogue records the owning constraint;
future features add scenario entries or a domain module, not conditional SQL
scattered across unrelated service seeders.

## Determinism, reruns, and reset

- Use a versioned namespace and stable fixture aliases/slugs/SKUs. UUIDs remain
  service-generated and are resolved into a local manifest; reset may change
  UUIDs without changing the scenario. Never promise deterministic UUIDs.
- Create relations through Gateway contracts in dependency order: Taxonomy,
  Media, draft Product, variants/gallery, then publication/lifecycle.
- Read the configured shop currency. Never silently rewrite operator Settings.
- Keep a checkpoint manifest without credentials, tokens, provider paths, or
  upload URLs. Checkpoint each created resource; recover partial seed runs.
- A completed rerun verifies known state instead of overwriting edited demo
  rows. Drift fails explicitly and can be repaired through the scoped reset.
- Reset only named resources in the manifest, removing Product gallery
  dependencies before Products, then Media and child-before-parent Taxonomy.
  Preserve non-demo rows, base/identity seeders, and legacy audit data.
- Refuse production and non-local targets for this local D1 fixture command.
  Provide an offline plan command before any writes.

## Media dependency (updated 2026-10-05)

The current Media presign/upload/finalize path creates PENDING records. F5
owns scanner/promotion, not M2. Salar brought forward the bounded
[Media core slice](2026-10-05-media-core-execution-plan.md) before completing
this seeder. The proposed local direct-database promotion adapter is superseded
and must not be implemented. Upload generated assets through the real Media
contracts and wait for validated READY/CLEAN outputs; Product still binds
through Media's service contract. Existing D1 live tests' guarded test fixtures
remain historical reference proof, not ordinary upload-pipeline completion.

## Required evidence

Offline catalogue tests must verify boundary sizes, deterministic aliases,
complete feature labels, and invalid payload cases. Runner tests must prove
partial-run recovery, rerun without duplicate writes, drift refusal, dependency
failure, real Media processing/readiness, and reset preserving unrelated resources.
Salar runs the longer live showcase/limits seed, verification, rerun, and reset
sequence. Retire the old minimal demo Product seed only after that evidence.
