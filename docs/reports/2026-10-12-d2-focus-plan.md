# D2 current-focus plan - 2026-10-12

Scope: replace the completed D1/Core Media execution detail in current-focus
with a compact D2 Cart, Checkout, And Order checklist. Preserve the adopted
TODO requirements/order; add substeps only at useful execution boundaries.
No application, schema, transport or runtime change is part of this task.

## Evidence and consumer impact before editing

Read TODO-ALTERNATIVE.md's Cart/Checkout, Orders and D2/B0 gates; AGENTS.md;
the current focus; Order service cart/checkout/user-read code and DTOs; Gateway
Order controller/route and mapper references; the relevant package commands.
The service already calls Product and Settings, persists carts/order items,
creates an order/items and clears its cart in a local Prisma transaction, and
filters user order reads by userId. These observations establish existing
mechanisms, not full D2 correctness or distributed rollback evidence.

| Changed owner          | Consumer inspected                                               | Planned action                                                                      |
| ---------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| docs/current-focus.md  | TODO-ALTERNATIVE.md link to #preserved-d1-checklist              | Move completed detail to a dated archive; redirect the link to its preserved anchor |
| docs/current-focus.md  | TODO-ALTERNATIVE.md link to #d2-entry-audit                      | Retain that anchor in the new focused checklist                                     |
| docs/current-focus.md  | AGENTS.md and AI_CONTEXT.md preparation instructions             | Keep mandatory impact review, cheap checks and handoff receipt in effect            |
| Archived current-focus | Existing relative report/testing links                           | Adjust relative paths for the archive's docs/reports location                       |
| D2 requirements        | Existing Order/Product/Settings, Gateway, proto/client and tests | Name the working files; leave source unchanged and full audit pending               |

The planned sequence is entry audit, cart/selection, checkout, orders, and
contracts/exit proof. The entry audit records real gaps and consumer files;
later unchecked items do not imply the feature is absent or implemented.
Production payments, broad inventory, new frontend, cloud/CDN and F4 remain
deferred. Existing D1/Core Media sign-off is preserved rather than retested.

Documentation verification: check formatting, diff whitespace, moved links and
the preserved D2 anchor. No broad suite, live command, build or Compose operation
is necessary for this documentation-only change.

Completed: current-focus now contains only the D2 goal, working rules, five
execution stages, exit/B0 handoff, working paths and next action. The former
D1/Core Media detail is preserved in `2026-10-12-d1-completed-focus.md`;
the adopted TODO's old D1 link now targets that archive. The existing D2 anchor
is retained. Formatting/diff checks pass; all 27 local link targets and both
adopted TODO anchors passed the focused documentation check. No runtime changes
or broad test execution were needed. Batch 0's full D2 audit remains pending.
