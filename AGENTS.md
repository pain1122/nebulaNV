# Repository Working Instructions

## Mandatory Dependency And Test Preparation Gate

- Before implementation changes, follow
  [the mandatory test preparation checklist](docs/testing/pre-suite-checklist.md)
  and record exact affected consumer paths in the active slice's evidence report.
- After changes, revisit the impact table and update every applicable caller,
  fixture, serializer, inventory/count/hash assertion, generated contract,
  test/helper, command and documentation consumer. Record reasons for unchanged
  or explicitly deferred consumers; never silently omit them.
- Before recommending/running broad suites, handing off live proofs or builds,
  or committing implementation, complete the checklist's applicable cheap gates
  and record its handoff receipt. Do not send broad commands while a known cheap
  preparation failure remains. Necessary heavy proofs may be handed over with
  their actual proof status explicitly pending after prerequisite checks pass.
- Run `pnpm test:preflight` for affected Gateway/RPC/protobuf/OpenAPI/generated
  client contracts before the broad handoff. It supplements dependency review;
  mocked tests and contract checks do not certify PostgreSQL or running images.
- Never weaken a contract, remove a test, blindly refresh a hash/snapshot or
  broadly skip coverage to obtain a pass. Inspect changes, preserve assertions,
  and name/track any deferred compatibility gap under its owning phase.
- These requirements apply to each subsequent change. Preserve earlier passing
  evidence unless a new relevant change/failure invalidates it. Broad/long
  execution stays with Salar; preparation and focused checks stay with the agent.

## Evidence Before Security Or Architecture Recommendations

- Inspect the current implementation, configuration, tests, and relevant
  documentation before claiming that a mechanism is stale, weak, missing, or
  should be replaced.
- If a claim may depend on changing external behavior or standards, verify it
  against current authoritative sources before recommending a change.
- Classify every finding clearly as one of:
  - confirmed defect;
  - stale implementation or documentation;
  - optional hardening;
  - future scaling consideration.
- Do not present optional hardening or hypothetical future risk as required
  current work.
- Preserve an existing mechanism when it already satisfies the requirement.
  Prefer the narrowest fix for the confirmed gap.
- Before recommending a security or architecture replacement, state:
  - what the repository currently implements;
  - the evidence-backed defect or unmet requirement;
  - why a narrower correction is insufficient;
  - the compatibility, migration, and maintenance cost.
- Do not implement an optional replacement merely because the user agrees in
  the moment. First make its optional status and tradeoffs explicit and obtain
  approval based on the verified evidence.
