
# Config Package

## Purpose

`@packages/config` is intended to be the shared configuration package for NebulaNV services.

It currently provides:

- A reusable NestJS `ConfigModule` wrapper.
- A shared Joi root environment schema.
- A small public export surface through `src/index.ts`.

Important: this package is not yet the active config standard across services. Current services mostly import `@nestjs/config` directly and use service-local `src/config/env.validation.ts` files.

## Location

Package root:

`packages/config`

Important files:

- `packages/config/src/index.ts`
- `packages/config/src/config.module.ts`
- `packages/config/src/env.validation.ts`
- `packages/config/package.json`
- `packages/config/tsconfig.json`
- `packages/config/eslint.config.mjs`

## Package Name

The package is currently named:

`@packages/config`

It is not named:

`@nebula/config`

This matters because services that want to use this package must import from `@packages/config`, unless the package is renamed later.

## Public Exports

`packages/config/src/index.ts` exports:

- `ConfigModule`
- `rootEnvSchema`

## Current Status

`@packages/config` builds, but it is not ready to be used inter-service-wide yet.

The current blockers are practical rather than conceptual:

- Services do not currently import `@packages/config` in source code.
- Auth-service and user-service do not currently declare `@packages/config` as a dependency.
- The package entrypoint is not aligned with the emitted build output.
- The config package build currently emits files from `packages/clients`, which means its TypeScript project is not cleanly isolated.
- Importing the built package can trigger Nest config validation immediately because the exported module is decorated at module load time.
- The shared gRPC URL schema uses hostname validation, but project values are host-port strings like `user-service:50051`.
- The shared schema expects `S2S_SECRET` and JWT secrets, while most service-local schemas currently validate `GATEWAY_SECRET` and database URLs.

Treat this package as a shared config foundation, not as the current source of truth.

## ConfigModule Behavior

`packages/config/src/config.module.ts` wraps NestJS `ConfigModule.forRoot`.

It does the following:

- Loads env files from guessed local/root paths.
- Sets `isGlobal: true`.
- Enables variable expansion with `expandVariables: true`.
- Uses `rootEnvSchema`.
- Allows service-specific unknown env keys with `allowUnknown: true`.
- Allows optional `PORT` and `GRPC_PORT`.

The env file guessing checks:

- Current working directory `.env`
- Repo root-ish `../../.env`
- Safety fallback `../../../.env`

This was designed to support local service development and Docker-style runtime env injection.

## Shared Root Env Schema

`packages/config/src/env.validation.ts` defines `rootEnvSchema`.

Current shared keys include:

- `NODE_ENV`
- `PUBLIC_MODE`
- `S2S_SECRET`
- `S2S_SECRET_OLD`
- `GATEWAY_HEADER`
- `USER_GRPC_URL`
- `AUTH_GRPC_URL`
- `PRODUCT_GRPC_URL`
- `SETTINGS_GRPC_URL`
- `BLOG_GRPC_URL`
- `USER_HTTP_PORT`
- `AUTH_HTTP_PORT`
- `PRODUCT_HTTP_PORT`
- `SETTINGS_HTTP_PORT`
- `BLOG_HTTP_PORT`
- `JWT_ACCESS_EXPIRATION`
- `JWT_REFRESH_EXPIRATION`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

## Current Usage Status

Current source usage check:

- No service source currently imports `@packages/config`.
- Services still import `ConfigModule` and `ConfigService` from `@nestjs/config`.
- Services still use local validation schemas from `apps/<service>/src/config/env.validation.ts`.

Services that currently list `@packages/config` as a dependency:

- `apps/blog-service`
- `apps/order-service`
- `apps/media-service`
- `apps/settings-service`
- `apps/taxonomy-service`
- `apps/product-service`

This means the package is present as a workspace dependency, but it is not yet the runtime source of truth.

## Current Service-Local Env Validation

Most service-local schemas validate:

- `SVC_NAME`
- `GATEWAY_SECRET`
- `DATABASE_URL`
- `SHADOW_DATABASE_URL`

Auth-service validates:

- `SVC_NAME`
- `GATEWAY_SECRET`

Media-service has the most detailed local schema and validates:

- `DATABASE_URL`
- `SHADOW_DATABASE_URL`
- `MEDIA_STORAGE_DRIVER`
- `MEDIA_STORAGE_PROVIDER`
- `MEDIA_S3_ENDPOINT`
- `MEDIA_S3_INTERNAL_ENDPOINT`
- `MEDIA_S3_PUBLIC_ENDPOINT`
- `MEDIA_S3_REGION`
- `MEDIA_S3_BUCKET`
- `MEDIA_S3_ACCESS_KEY`
- `MEDIA_S3_SECRET_KEY`
- `MEDIA_S3_FORCE_PATH_STYLE`
- `MEDIA_SIGNED_UPLOAD_TTL_SECONDS`
- `MEDIA_SIGNED_READ_TTL_SECONDS`
- `MEDIA_STRICT_READ_TTL_SECONDS`
- `MEDIA_PUBLIC_FOLDER`
- `MEDIA_PRIVATE_FOLDER`
- `MEDIA_SYSTEM_FOLDER`

## Keep In Mind

The clean direction is probably not a single magic config module that every service imports blindly.

A safer pattern is:

- Keep pure shared schema helpers in `@packages/config`.
- Let each service compose shared keys with service-specific keys.
- Keep media storage configuration local or expose it as a dedicated helper.
- Validate gRPC addresses as host-port values, not plain hostnames.
- Decide whether `GATEWAY_SECRET` and `S2S_SECRET` are separate concepts or aliases before migration.
- Avoid package-level imports that trigger env validation as a side effect.

This keeps config consistent without making every service depend on every env key.

## Build And Lint

Package scripts:

```powershell
pnpm --filter @packages/config build
pnpm --filter @packages/config lint
pnpm --filter @packages/config check-types
```

Package build uses:

```powershell
tsc -p tsconfig.json
```

## Known Watch Points

- `@packages/config` is not currently imported by service source code.
- Service-local env schemas are still the real validators.
- Shared schema does not include all active service env keys.
- Shared schema currently omits newer services like `ORDER_GRPC_URL`, `TAXONOMY_GRPC_URL`, and `MEDIA_GRPC_URL`.
- Shared schema does not include media S3/Supabase/AWS settings.
- Shared schema uses `S2S_SECRET`, while service-local schemas still use `GATEWAY_SECRET`.
- `packages/config/tsconfig.json` includes `../clients`, which is unusual for a config package and should be reviewed before treating this package as cleanly isolated.
- `package.json` has `"main": "index.js"`, while TypeScript output currently emits under `dist/packages/config/src`.
- The shared URL validation should not reject valid project values like `127.0.0.1:50051` or `user-service:50051`.
