# Runtime environment ownership

Reviewed: 2026-10-27, build-cleanup Segment 4 first slice.
This describes the accepted configuration; it does not change operator files,
introduce a new config service or activate tenant/cloud features.

## Which file to edit

| Execution mode           | Owning inputs and precedence                                                                                                                                                                                                                          | Applying a runtime-only edit                                                                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native backend processes | Existing process variables override files. Each service loads its own `apps/<service>/.env` first and root `.env` as fallback.                                                                                                                        | Restart the affected native process after checking its schema.                                                                                       |
| Local Docker             | Eight backend services read root `.env` then their app `.env`; later file values win. Gateway reads only `apps/gateway/.env`. Explicit Compose `environment` values override env-file values. Realm Auth and Authority use explicit environment maps. | Recreate the affected container with its existing image after readiness/dependency preparation. No image build is required by the env change itself. |
| Image-only release       | `deploy/.env.production` plus shell interpolation supplies the explicit maps in `docker-compose.release.yml`. App-local files are not release inputs. Fixed internal addresses/listeners remain fixed where declared.                                 | Recreate the affected release container through the reviewed deployment procedure.                                                                   |

Root `.env` alone does not inject values into Docker: `env_file` and
`environment` determine what a service receives. Native process variables and
Compose interpolation are different sources. In particular, exporting a shell
variable does not overwrite an unrelated literal value in an app env file.
These rules match [Nest configuration](https://docs.nestjs.com/techniques/configuration)
and [Compose precedence](https://docs.docker.com/compose/how-tos/environment-variables/envvars-precedence/).

## Current owners

| Setting group                                                                                 | Owner / current consumers                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gateway JSON/rate/idempotency/readiness limits, public application registry and Gateway Redis | Gateway. Native/local settings belong in `apps/gateway/.env`; release settings belong in deployment inputs. Root example duplicates are native fallback/compatibility inputs, not a universal Docker tuning interface.                                   |
| Internal gRPC and Media HTTP targets                                                          | Native examples use host loopback. Local/release Compose assigns container DNS targets. Gateway's local Media origin remains explicitly `http://media-service:3007`.                                                                                     |
| Listener ports                                                                                | Service bind schemas and root inventory own defaults. Compose fixes container ports where required; published host ports are a separate deployment concern. `PORT` is service-local, not a shared process-wide selector for multiple services.           |
| Database URLs                                                                                 | Each SQL owner validates its own URL; native migrations use owner/admin inputs, while Authority/Realm runtime roles remain separate. Gateway/Auth have no Prisma database.                                                                               |
| S2S inbound/outbound maps, service identity, replay configuration                             | Shared grpc-auth mechanisms plus each service's trust bundle. `GATEWAY_INBOUND_KEYS` legitimately belongs to receivers; shared startup validation also examines `GATEWAY_OUTBOUND_KEYS`. Do not infer ownership or remove keys merely from their prefix. |
| JWT signing/verification                                                                      | Auth owns signing/session behavior; existing receiver verification inputs remain in their schemas. No signing/verification migration is part of this review.                                                                                             |
| Media storage/scanner/processing settings                                                     | Media and its infrastructure. Public upload endpoints may intentionally be host-accessible; service-to-storage/scanner targets remain internal in Docker.                                                                                                |
| Runtime mode, CORS, Redis replay and other shared defaults                                    | Shared schemas validate common behavior; per-app and explicit deployment values retain their current override rules.                                                                                                                                     |

Authority's existing membership-epoch HMAC inputs must also be supplied in the
release deployment file. Segment 4 wires the two previously omitted variables
through release Compose from the already declared public template inputs. Preserve deployed key material;
this correction does not rotate it. [Correction receipt](../reports/2026-10-27-release-authority-env-correction.md).

## Verified behavior and limits

All eleven current schemas validate both clean local and release renders using
only tracked examples. Native source inspection confirms service-first/root-second
file order for all eleven owners. Actual Nest ConfigModule probes confirm app
file precedence and process-variable precedence. A conflicting root/app Gateway
rate setting confirms local Gateway uses its app file; release uses its deployment
input. Re-rendering a runtime tuning edit changes the environment without changing
the service build specification. No running container was recreated for this proof.

Real `.env`/`.env.*` files are excluded by `.dockerignore`; Turbo's current
global dependencies are lock/workspace/package/TypeScript policy files, not real
runtime env. The existing source/compiler does not consume these backend runtime
values as build configuration. Build-policy flags and future browser build-time
variables must be evaluated separately rather than classified as runtime by name.

Eight local services inherit eleven Gateway runtime keys they do not declare in
their own schemas. Local root env-file inheritance is broader than the release's
explicit maps. This is confirmed duplication and optional local configuration
hardening, not evidence of an unresolved build bottleneck or a production leak.
Unknown schema keys may still be read by shared runtime mechanisms; schema counts
are not a proof of exclusive runtime ownership.

A future explicit per-service local map could narrow inheritance. Its cost is
preserving existing app-over-root overrides, native tooling inputs, all trust/key
maps, URL expansion and real operator configuration compatibility across eleven
services. The narrower current action is to document the proven contract and
preserve working behavior. A migration needs its own reviewed scope/approval.
No new env generator, mandatory bootstrap step, package split or deployment system
is introduced here.

Source trace, safe key-only counts, actual probes and decision status:
[Segment 4 review receipt](../reports/2026-10-27-build-cleanup-segment4-env-review.md).
