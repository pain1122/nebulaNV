# D2 commerce demo workflow

Storage transition checkpoint: M5 copies the existing Media bucket to SeaweedFS
without resetting D1/D2 records or journals. Pause demo runs during the transfer;
the helper verifies journal hashes and Media-owned references. Keep D2 Order and
receipt history intact. Native activation and subsequent demo verification are
separate gates; follow [the storage procedure](../../docker/seaweedfs/README.md#m5-existing-object-transfer-checkpoint).

The D2 template uses the public Gateway and generated client. It owns three
products and seven Orders: unpaid pending, unknown/processing, failed payment
pending, cancelled payment pending, paid after retry, fulfilled and explicitly
cancelled. An editable Cart contains base, variant and free/unmanaged items.
Amounts use configured shop currency. The existing D1 Media/Taxonomy/catalogue
showcase remains separate and is neither consumed nor modified by D2 checkout.

From the repository root in PowerShell:

```powershell
pnpm demo:d2:plan
pnpm demo:d2:seed
pnpm demo:d2:verify
```

Plan performs no login, writes or database access. Seed journals mutation intent
before sending, then persists successful replies and owned IDs. Repeated seed
verifies existing Orders without another checkout or stock deduction. An expired
editable Cart is explicitly reported by verify and refreshed by seed, without
creating another Order. Stored snapshots and fresh reads support verification
after the existing seven-day full Checkout replay window; the seeder does not
extend that service contract or reuse expired Checkout keys for new purchases.

The limits profile is opt-in:

```powershell
pnpm demo:d2:seed limits
pnpm demo:d2:verify limits
```

It uses a separate customer and journal and places the actual maximum quantity,
2,147,483,647, on the free/unmanaged Cart line. This creates one line, not that
many records. Zero and maximum-plus-one requests must fail validation. The
showcase remains realistic with three free items. Both profiles verify base/
variant stock, money/options and immutable snapshots.

Default customer addresses are `demo-d2-showcase@example.com` and
`demo-d2-limits@example.com`. Optional process inputs `DEMO_D2_SHOWCASE_EMAIL`,
`DEMO_D2_LIMITS_EMAIL` and `DEMO_D2_CUSTOMER_PASS` override them. The local
password otherwise follows `SEED_USER_PASS` and its existing demo default.
Use separate ordinary customers for the two profiles. Customer sessions use
`mobile-local`; admin sessions use `admin-web-local`. All sessions are logged
out through their original application. Credentials/tokens are never journalled.

The owned journals are `.nebula-demo/d2-showcase.json` and `d2-limits.json`, each
with its own exclusive lock and atomic writes. Their target, customer, currency,
definition and ownership checks prevent applying one environment's journal to
another or silently accepting drift. Unknown Cart items cause an explicit
refusal. Network/application errors stop the run; there is no blind retry of
arbitrary writes. Existing bounded rate-limit handling preserves mutation keys.
Rerun seed after a recoverable interruption to resume known original intents.
An unresolved catalogue create during reset explicitly requests seed recovery;
it does not manufacture a new product just to delete it.

Reset and recreation:

```powershell
pnpm demo:d2:reset
pnpm demo:d2:seed
pnpm demo:d2:verify
```

Reset verifies owners, resolves an owned processing attempt, cancels eligible
unpaid Orders, clears only owned Cart lines and deletes only owned products.
It retains immutable Order/receipt history and the reusable customer, archives
generation/Order/key references and uses new keys/IDs for the next generation.
Interrupted reset resumes from the same journal. Repeated empty reset is a no-op.
There is no Order deletion endpoint or automatic whole-database reset. A fresh
database therefore needs its matching fresh journal; do not transplant the old
journal or casually delete it while owned processing work remains.

No image rebuild is needed for these host-only demo scripts. They require the
existing Gateway, Auth/User, Order, Product, Settings and their dependencies to
be ready. Keep `showcase` and `limits` proof runs sequential. Actual live
acceptance is recorded separately from mock/DTO fixture tests in the
[Batch 4 execution report](../reports/2026-10-28-d2-batch4-execution.md).
Salar reports both complete cycles passed on Oct 28. The
[D2 exit ledger](../reports/2026-10-28-d2-exit-proof.md) records acceptance and the
remaining B0/publication limits.
