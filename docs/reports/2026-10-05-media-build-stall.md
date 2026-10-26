# Media image build stall (2026-10-05)

Salar reported a Media image build at 6,486.6 seconds total, with 5,648.5
seconds inside the shared compilation step. Progress alone does not establish
whether that particular solve is stalled or swapping.

Verified before changing the build:

- The shared Dockerfile compiles all eleven backend applications, including
  unrelated Realm Auth/Gateway/Order services, even for `media-runtime`.
  The recorded compilation log starts multiple Nest/TypeScript processes
  together, with no explicit Turbo concurrency cap. Classification: confirmed
  build scope/concurrency gap for this small incremental Media change.
- Docker reports 2 CPUs and 4,111,769,600 bytes of VM RAM (about 3.8 GiB).
  The Windows host has 15.8 GiB total and about 2.9 GiB free at inspection.
  WSL has a 1 GiB swap device with about 280 MiB used.
- The latest completed Media history record was canceled after 67m 9s, not
  a compiler error. Its log ended after launching builds for all eleven apps.
  This canceled record is not claimed to be the currently reported solve.
- Scanner logs show loaded signatures and successful database self-checks.
  Subsequent health inspection says it cannot contact the daemon. Kernel
  `dmesg` confirms a global VM out-of-memory kill of `clamd` (about 567 MiB
  resident at the kill). The container's main process survived, so Docker's
  `State.OOMKilled=false` did not identify the child-process OOM. Classification:
  confirmed resource exhaustion and scanner failure. This does not establish
  which compiler or workload consumed each remaining byte of VM memory.

The prior instruction to build only Media selected one image, but still
compiled the whole backend. Starting the scanner concurrently was also a poor
default for this limited VM. Both instructions are corrected below.

Narrow correction: add a selected-service build argument, defaulting to the
existing full-backend graph; set the local Media target to Media and its
dependencies; cap Turbo compilation at one task by default. Preserve explicit
shared package builds, Prisma generation, frozen/offline dependency installs,
injected workspace synchronization, native Sharp proof and final runtime import
checks. Select the matching service in the existing import verifier. Keep full
backend builds available and their shared build layer reusable. This does not
replace the image/dependency architecture or change application contracts.

Temporarily stop the unused scanner during this build and reuse its persisted
signatures at restart. Do not prune the cache, change VM limits, restart Docker
or force all build caches to miss. Existing running solves cannot acquire a
Dockerfile correction retroactively. A rebuilt-image timing/runtime proof will
remain pending until Salar runs the corrected build.

Correction evidence: Compose validates, Bake print confirms the local Media
target receives the selected-service/one-task arguments, and an actual Turbo
dry run selects Media plus four shared dependencies with no other application.
The five existing explicit shared-package builds remain intact. Three focused
inventory/runtime/image orchestration checks pass. Docker Buildx `--check`
completed with no warnings; no image compilation was run by Codex. The existing
blanket `service_started` test was stale after adding the asynchronous scanner:
it now permits exactly Media's scanner dependency while preserving healthy/
completed dependency requirements everywhere else. The unhealthy scanner was
stopped successfully without removing its signature volume.

Next command, after canceling any still-running old solve with Ctrl+C:

```powershell
docker compose --progress plain build media-service
```

After a successful build, restart/wait for the backend and run the recorded
Media processing live proof. Do not claim an observed speedup before the
corrected build finishes.

Follow-up: Salar reported completion. Buildx history independently confirms
Media build `7vnoz9b8wch0cp0tnyrebh0io` completed in **3m 19s**. The new local
Media image exists with ID
`sha256:478104dfdbfe22e1ff97711ba1a3eab1fbdff41cd911137137c485d6a35f1081`.
This is an observed successful build, not a controlled cache/performance
benchmark. Infrastructure remains healthy; application/scanner containers
are stopped. Next restore the backend, verify readiness and run the actual
Media processing live proof. Scanner restart/scan and integration evidence
are still pending.
