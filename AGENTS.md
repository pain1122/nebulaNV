# Repository Working Instructions

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
