# Docker/WSL resource budget

Date: 2026-10-26. Salar explicitly requested approximately 85% of device resources
before continuing the paired Order build. Scope: CPU/RAM ceiling, not disk, GPU,
network, per-container reservations or compiler concurrency.

## Before-edit trace

- Owner: `C:/Users/asus/.wslconfig`; existing `[wsl2]` has memory=4GB and
  processors=2. Preserve unrelated configuration and save a timestamped backup.
- Consumers: Docker Desktop WSL2 VM and Ubuntu share these global WSL2 settings.
  Docker's WSL backend uses WSL resource configuration rather than the separate
  Hyper-V resource sliders. No Compose limits or application build files change.
- Hardware inspected: Intel i7-1065G7, four physical/eight logical CPUs;
  16,976,023,552 bytes physical RAM. Windows reported about 7,755 MB free at
  inspection; this is a momentary observation, not a RAM reservation guarantee.
- Requested RAM ceiling: floor(physical bytes _ 0.85 / 1,048,576) = 13,761 MB,
  about 13.44 GiB. CPU allocation is integer-only: round(8 _ 0.85) = seven
  logical CPUs (87.5%). This is not an exact 85% CPU-time quota or a promise of
  85% utilization; WSL allocates memory on demand up to its configured ceiling.
- Docker Desktop currently reports `starting`; Docker info/history queries time
  out or return engine HTTP 500. No host Docker build process was found. This
  inspection does not certify engine readiness or all daemon build history.
- Ubuntu has running PostgreSQL/Apache and shell processes. Applying global
  settings through WSL shutdown temporarily stops all distributions, not just
  Docker. Do not silently interrupt those while preparing configuration.

## Activation and evidence boundary

Long restart/startup remains operator-owned under Salar's standing instruction.
Save work in WSL before activation. Stop Docker Desktop, shut down WSL, then start
Desktop and verify Docker reports the larger CPU/memory budget. A ceiling change
does not require rebuilding images, deleting caches or recreating databases.
Startup/application health and Order image proof remain separate checks.

Hardware differs from the earlier two-CPU/4GB build baseline after activation;
label later timings with this resource change rather than attributing the entire
difference to build-graph improvements. Keep compiler concurrency bounded for
the first comparison. Existing source/SQL/contract evidence is unchanged.

Sources: [Microsoft WSL configuration](https://learn.microsoft.com/en-us/windows/wsl/wsl-config),
[Docker resource settings](https://docs.docker.com/desktop/settings-and-maintenance/settings/#resources).

Configuration written and read-back verified:

```ini
[wsl2]
memory=13761MB
processors=7
```

Backup: `C:/Users/asus/.wslconfig.before-85pct-20261026-101646.bak`.
Only the memory/processors values and their obsolete inline comments changed.
No experimental/swap/disk/network settings or Docker settings-store entries were
added. The cap remains a ceiling; it does not reserve this RAM from Windows.

Operator activation, after saving WSL work:

```powershell
docker desktop stop --timeout 60
if ($LASTEXITCODE -ne 0) { throw 'Docker Desktop did not stop; stop here.' }
wsl --shutdown
if ($LASTEXITCODE -ne 0) { throw 'WSL did not shut down; stop here.' }
docker desktop start --timeout 120
if ($LASTEXITCODE -ne 0) { throw 'Docker Desktop did not start; stop here.' }
docker info --format 'CPUs={{.NCPU}} MemoryBytes={{.MemTotal}}'
```

Status: settings and backup verified, not applied to a restarted VM yet. Docker
should report seven CPUs and a larger memory budget after activation; exact
usable MemTotal can be below the configured ceiling due to VM/kernel overhead.
Runtime readiness is pending. No restart/build/Compose/database operation was run.

## Activation follow-up - Docker Ubuntu proxy startup failure

Salar reports DockerDesktop/Wsl/ExecError launching the Ubuntu integration proxy.
Read-only local checks confirm the following:

- Ubuntu starts successfully with seven CPUs and MemTotal 13,736,168 kB (about
  13.1 GiB usable). Configured cap is active in WSL; current available Linux
  memory exceeded 12 GiB. This does not show a resource-allocation failure.
- Docker Desktop still reports `starting`. Its backend log repeatedly reports
  missing `/mnt/wsl/docker-desktop/shared-sockets/host-services/backend.sock`.
  The shared Docker directory is absent in both Ubuntu's `/mnt/wsl` and Docker
  distro's `/mnt/host/wsl`. Docker's distro lists init/bridge processes, not a
  running dockerd. Engine readiness has not been established.
- WSL version is 2.4.13.0 on Windows 10; Ubuntu uses systemd. Its Wayland socket
  exists; no evidence supports changing WSLg, mount settings or the memory cap.
- Desktop's Windows UI/backend processes remain present. A fully closed Desktop
  followed by a clean WSL start is the next bounded recovery attempt. This is
  not a proven root-cause attribution beyond the missing startup mount/socket.

Long lifecycle execution remains with Salar. The scoped force-close below targets
only the stuck Docker Desktop UI/backend after confirming the engine is not up;
it does not stop Windows services or erase Docker state. WSL shutdown temporarily
stops Ubuntu services/shells too. Start Ubuntu first, then a fresh Desktop backend.

```powershell
Get-Process -Name 'Docker Desktop','com.docker.backend' -ErrorAction SilentlyContinue | Stop-Process -Force
wsl --shutdown
if ($LASTEXITCODE -ne 0) { throw 'WSL shutdown failed; stop here.' }
wsl -d Ubuntu -- true
if ($LASTEXITCODE -ne 0) { throw 'Ubuntu startup failed; stop here.' }
docker desktop start --timeout 120
if ($LASTEXITCODE -ne 0) { throw 'Docker startup failed; stop here.' }
docker info --format 'CPUs={{.NCPU}} MemoryBytes={{.MemTotal}}'
```

No integration feature was disabled, no settings store was edited, no distro
was unregistered, and no resource rollback was performed. Recovery/engine
verification remains pending this operator command sequence; do not resume the
Order image build before engine readiness succeeds.

## Recovery verified

Salar's next info query failed because the Linux engine pipe did not exist.
Local checks then found Docker Desktop and both WSL distributions fully stopped;
there was no current Docker backend process. The agent launched the installed
Desktop executable directly with a hidden, nonblocking Start-Process. No long
restart command or image build was launched. Fresh logs showed VM bootstrap,
restored backend socket, container recovery and BuildKit initialization.

After bounded read-only readiness probes, Docker info returned exit 0:

```text
CPUs=7 MemoryBytes=14065840128
```

The usable Docker memory budget is about 13.10 GiB; configured WSL maximum is
13,761 MB (about 13.44 GiB), with VM/kernel overhead accounting for the difference.
Resource activation and engine API recovery are now verified. No memory rollback,
integration disable, image rebuild, cache prune or data reset was necessary.
Later builds must be compared under this new seven-CPU resource budget.
Docker Desktop status is `running`; five running containers report healthy.
This is not full backend/application readiness: stopped application services
have not been started or checked. The Order image proof can run without them.

## Cache-budget restart: Desktop shutdown hang

After Salar ran `docker desktop restart --timeout 180`, the CLI reported seven
remaining Desktop/backend/build processes and deadline exceeded. Bounded local
inspection confirms Desktop status `stopping`; Docker info times out after 12s;
`wsl --list --verbose` reports both Ubuntu and docker-desktop Stopped. Thus the
WSL distributions have stopped but Windows Desktop processes have not exited.
Host CLI log records `POST /app/quit` connection closure after 2m59.998s. This is
a confirmed Desktop lifecycle failure; the underlying cause remains unknown.
No evidence attributes it to application build dependencies or the new cache cap.

Recovery scope/trace before action: `Docker Desktop.exe`,
`com.docker.backend.exe`, `com.docker.build.exe` under the installed Docker path
only. Close those leftover processes after verifying their executable paths,
then launch the installed Desktop executable hidden/nonblocking. WSL is already
stopped, so no extra global WSL shutdown is needed. Do not touch source, daemon
settings, images, volumes or cache. Verify engine and active GC budget afterward;
startup proof remains pending until successful. Existing application/preflight
checks remain valid; machine lifecycle recovery does not require broad suites.

Recovery action/result: verified every targeted Windows executable is under
`C:/Program Files/Docker/Docker/`, force-closed the seven leftover Desktop/backend/
build processes, then launched Desktop hidden and nonblocking. No WSL shutdown,
cache prune, configuration rollback or application command was run. New startup
restored Ubuntu integration; containerd warned about Bolt DB opening but then
reported successful boot in 14.813186s, so the warning was transient and is not
corruption evidence. Dockerd logged container loading start/done at 08:27:14 /
08:27:31 UTC. A subsequent bounded info query succeeds with seven CPUs and
14,065,840,128 memory bytes. The shutdown hang and fresh startup/recovery are
separate observations; root cause of the Windows quit hang remains unproven.

Reference: [Docker Desktop troubleshooting/logs](https://docs.docker.com/desktop/troubleshoot-and-support/troubleshoot/).
No diagnostic archive was uploaded. [Microsoft WSL commands](https://learn.microsoft.com/en-us/windows/wsl/basic-commands)
confirms global shutdown terminates all distributions; it was unnecessary here
because both were already stopped. Active cache budget and infrastructure health
will be recorded separately after their probes return.

Final budget verification: BuildKit running; GC rules 1-3 report Reserved Space
40GiB, rule 0 Max Used Space 5.527GiB. Docker reports five infrastructure
containers up; PostgreSQL and both Redis instances healthy, MinIO/scanner health
starting at the probe. Applications remain stopped; full backend health is not
claimed. Current-focus and native proof handoff updated; broad cache-only proof
is ready for Salar. Documentation formatting and scoped diff checks pass.
