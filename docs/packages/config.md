# Config Package

`@packages/config` provides shared HTTP policy, validation, health, structured
logging, lifecycle logging, and small environment-schema primitives. Each
service-local Joi schema remains the runtime source of truth.

The unused monolithic root schema and its Nest wrapper were removed during
Standard Service Bootstrap Batch 6. No service imported them, and retaining
them would have created a second, incomplete configuration path.

## Environment Primitives

The shared environment helpers cover fields that have the same meaning in
every applicable service:

- `runtimeEnvSchema` validates `NODE_ENV`;
- `serviceBindEnvSchema()` validates generic and service-specific HTTP/gRPC
  listener host and port fields;
- `resolveServiceBind()` applies service-specific, then generic, then default
  listener precedence;
- `grpcTargetEnvSchema()` validates downstream `host:port` client targets;
- `bcryptEnvSchema` bounds bcrypt work factors used by auth and user;
- `jwtAccessVerificationEnvSchema` validates an optional local access-token
  verification secret.

HTTP CORS settings remain in `httpPolicyEnvSchema`. S2S identity, trust-map,
replay, and Redis settings remain in `s2sEnvSchema()` from
`@nebula/grpc-auth`.

Database, media storage, token signing, and other service-owned requirements
stay in the owning service schema. In particular, auth-service requires its
separate access and refresh signing secrets and token durations. Other services
do not require refresh-token secrets.

## Listener And Target Rules

HTTP listener precedence is:

1. `<SERVICE>_HTTP_PORT`
2. `PORT`
3. the service default

gRPC listener precedence is:

1. `<SERVICE>_GRPC_HOST` / `<SERVICE>_GRPC_PORT`
2. `GRPC_HOST` / `GRPC_PORT`
3. `0.0.0.0` and the service default port

`*_GRPC_URL` fields are client targets only and are never reused as server bind
addresses. Targets use `host:port` syntax without an HTTP URL scheme.

## HTTP Validation Contract

`createHttpValidationPipe()` is the shared HTTP boundary. It enables DTO
transformation, removes no declared fields, and rejects unknown fields through
`whitelist: true` plus `forbidNonWhitelisted: true`.

Implicit conversion is disabled. A query, path, or body value changes type only
when its DTO declares an explicit transform such as `@Type(() => Number)`.
Missing required fields, unknown fields, and wrong types therefore fail instead
of being silently accepted or guessed.

This HTTP policy must not be copied into gRPC controllers. gRPC uses a separate
factory so its error type and coercion rules remain transport-correct.

## HTTP CORS And Security Headers

`createHttpCorsOptionsDelegate()` classifies each request as a browser API,
internal health route, or public-render route. Browser APIs allow only exact
HTTP(S) origins from `HTTP_CORS_ORIGINS`; wildcards, credentials, paths, query
strings, and fragments are rejected. CORS credentials are disabled, and the
browser header allowlist contains only `Authorization` and `Content-Type`.

Health and public-render routes do not inherit browser API CORS. Media's
public-render path keeps its narrow resource-header exception, but future CDN
or render CORS remains a separate decision.

`createHttpSecurityHeadersMiddleware()` supplies the shared Helmet baseline.
HSTS is active in production and disabled outside production so local HTTP
development is not forced into HTTPS. CORS and security headers reduce browser
exposure; neither mechanism authenticates a caller.

## Environment File Loading

Direct service runs load the service-local `.env` first and the repository root
`.env` second. A service-local duplicate therefore overrides the root value.

Local Compose also loads both files, then applies its explicit `environment`
values. Shared `HTTP_CORS_ORIGINS` configuration belongs only in the root
`.env` and `.env.example`; service-local files should contain only
service-owned overrides. Release Compose receives the same shared value through
`deploy/.env.production`.

Release Compose injects JWT signing secrets only into auth-service. A
non-auth service may perform the existing optional local access-signature
precheck when `JWT_ACCESS_SECRET` is deliberately supplied, but auth-service
remains the source of truth for token validity and revocation.

## Logging Contract

`createHttpRequestLoggingMiddleware` emits one JSON completion record per HTTP
request. Its allowlist contains the service, method, route template, status,
duration, direct socket peer IP, generated request ID, and any actor/caller
identifiers already verified and attached by guards. It never reads bodies,
authorization or cookie headers, query values, forwarded-IP headers, or raw
URLs. An unmatched route is recorded as `unmatched`.

`serviceLogLevels()` fixes production levels to `error`, `warn`, and `log`;
development/test also enables `debug`. There is intentionally no log-level
environment override.

`createServiceLifecycleProvider`, `logServiceReady`, and `logFatalStartup`
provide the shared ready, shutdown, and sanitized startup-failure events.
Fatal events include only a cleaned error type, never its message or stack.
Logging failures are swallowed because observability must not change request or
lifecycle behavior.

The current IP field is `peerIp`, taken only from the direct socket. Do not
enable Express `trust proxy` or consume `X-Forwarded-For` until the deployed
gateway/proxy hops are explicitly known and tested.

## Health Contract

`StandardHealthController` provides the common public routes:

- `/health/live` for dependency-free process liveness;
- `/health/ready` for required dependency readiness;
- `/health` as the readiness compatibility alias.

Services supply named probes using their existing module-owned clients. A
failed probe is sanitized and produces HTTP `503`; probe error messages are
never returned. The shared helper does not decide which dependencies a service
requires.

## Rules

- Never restore a shared S2S master secret.
- Never copy gateway keys into service trust maps.
- Never put pairwise service secrets in the root/browser/mobile environment.
- Keep shared `HTTP_CORS_ORIGINS` in the root/deployment environment rather
  than duplicating it in every service file.
- Production replay storage is Redis; memory mode is test-only.
- Release secrets come from `deploy/.env.production`, not tracked service
  `.env` files.

```powershell
pnpm --filter @packages/config test
pnpm --filter @packages/config check-types
pnpm --filter @packages/config build
```

The package test suite also contains health, HTTP-policy, and logging wiring
checks for every backend service. Those checks read the canonical
`nebula.backendServices` inventory from the root `package.json`; they do not
maintain a second service list.
