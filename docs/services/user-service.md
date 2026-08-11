# User Service

User-service owns persisted user account rows and profile operations.

Auth-service owns token lifecycle and uses user-service as the user data authority.

## Owns

- User IDs.
- Email lookup.
- Phone lookup.
- Password hash storage.
- Role string storage.
- Profile update rules.
- Self/admin access checks for profile reads and updates.

## Does Not Own

- JWT issuing.
- Token refresh/rotation logic.
- Active refresh-session storage.
- Token versioning.
- Redis invalidation.
- Disabled-user Redis state.
- Login response shape.
- Media/user files.
- Orders/products/blog content.

## Main Flow

```txt
HTTP/gRPC request
-> auth guard context
-> user DTO/proto request
-> UserService
-> Postgres User table
-> response
```

## Auth Boundary

Auth-service depends on user-service for user data.

Auth-service uses user-service for:

- Registering users through gRPC `CreateUser`.
- Looking up users with password hash through `FindUserWithHash`.
- Fetching profile data through `GetUser` or `GetUserWithHash`.

User-service should not trust caller-supplied user IDs by themselves. User-facing reads and writes must use auth-verified context from guards.

## HTTP Contract

Base controller: `/users`

Current routes:

- `GET /health`, `/health/live`, `/health/ready`
- `GET /users`
- `GET /users/:id`
- `PUT /users/me`

Access policy:

- Health routes are public; readiness checks Postgres and the S2S replay store.
- `GET /users` requires `admin` or `root-admin`.
- `GET /users/:id` requires `user`, `admin`, or `root-admin`.
- Normal users can only read themselves.
- Admin/root-admin can read other users.
- `PUT /users/me` requires `user`, `admin`, or `root-admin`.
- `PUT /users/me` updates the authenticated actor's own profile.

Important: `PUT /users/me` does not take a target user ID from request body. It uses `ReqUser.userId`.

## gRPC Contract

Proto: `packages/protos/user.proto`

Service: `UserService`

Current methods:

- `FindUser`
- `GetUser`
- `ListUsers`
- `UpdateProfile`
- `CreateUser`
- `FindUserWithHash`
- `GetUserWithHash`

Access policy:

- `GetUser` requires `user`, `admin`, or `root-admin`; self or admin only.
- `FindUser` requires `admin` or `root-admin`.
- `ListUsers` requires `admin` or `root-admin`. It is intentionally
  unpaginated and returns only `id`, `email`, `phone`, `role`, and ISO-8601
  `createdAt`; it never returns password/hash data.
- `UpdateProfile` requires `user`, `admin`, or `root-admin`; self or admin only.
- `CreateUser` is internal-only and accepts only verified `auth-service` S2S calls. Its signed request body is the registration target; it always creates the normal `user` role.
- `FindUserWithHash` is internal-only for verified `auth-service` auth flows.
- `GetUserWithHash` is internal-only for verified `auth-service`; its signed request body identifies the target user.

Security behavior:

- `GetUser` and `UpdateProfile` use verified guard context.
- Spoofed role metadata must not override the signed bearer token.
- Internal auth methods do not create a fake human actor from service identity or raw metadata.
- Self-register style `CreateUser` creates normal `user` role even if its request contains another role.

## Storage Model

Database model: `User`

The root Prisma commands include this service first. Its current base seed
upserts the configurable development admin and normal-user accounts; it does
not store refresh tokens and refuses to run when `NODE_ENV=production`. The
ordinary seeded admin is used by the separate API demo seed; no default
`root-admin` is created. See
[Local Development And Docker Boot](../architecture/local-dev-and-docker-boot.md)
for the shared commands and complete database order.

Current fields:

- `id`
- `email`
- `phone`
- `password`
- `role`
- `createdAt`
- `updatedAt`

Notes:

- `email` is unique and nullable.
- `phone` is unique and nullable.
- `password` stores a password hash.
- `role` is currently a string, not a DB enum.
- Active refresh sessions, rotation, replay handling, and revocation belong to
  auth-service Redis state; user-service does not persist refresh tokens.

## Normalization And Validation

Current service behavior:

- Email is trimmed and lowercased.
- Phone lookup strips non-digits.
- Duplicate email maps to `Email already in use`.
- Password changes require `currentPassword`.
- New password requires minimum length through DTO validation.
- Profile email update checks duplicates before writing.

## Current Tests

HTTP test file:

- `apps/user-service/test/http/user.http.e2e.spec.ts`

Covered behavior:

- Health readiness returns `ok` with database and S2S replay checks.
- Normal users cannot list users.
- Admin can list users.
- Admin can read another user.
- Duplicate email update is rejected.
- User can read self.
- User cannot read admin.
- Admin can read user.
- User can update own email.
- Cleanup reverts the seeded user's email.

gRPC test file:

- `apps/user-service/test/grpc/user.e2e.spec.ts`

Covered behavior:

- Internal `FindUserWithHash` miss returns structured empty response.
- Admin can `FindUser` by email.
- Normal user cannot `FindUser`.
- Admin can `ListUsers` through the non-secret list projection.
- Normal user cannot `ListUsers`.
- Internal `CreateUser` creates normal user even if role `admin` is requested.
- Internal hash lookups return only the user identity and password hash fields
  required by auth-service.
- Created gRPC user can log in through auth-service.
- `GetUserWithHash` does not expose a refresh token.
- User can update own email through gRPC.
- Spoofed admin metadata is rejected when bearer token is a normal user.
- User can get self.
- User cannot get admin.
- Admin can get user.

Test setup waits for:

- Auth HTTP.
- Auth gRPC.
- User HTTP.
- User gRPC.

## Health

Health routes:

```txt
GET /health/live
GET /health/ready
GET /health
```

They are public. Liveness is dependency-free; the two readiness routes check
Postgres with:

```sql
SELECT 1
```

Readiness also checks the S2S replay store. It returns HTTP `200` when ready and
a sanitized HTTP `503` when either required dependency fails. See
[Testing And Health](../architecture/testing-and-health.md) for the shared
response schema.

## Bootstrap Ports

HTTP bind resolution is `USER_HTTP_PORT`, then generic `PORT`, then `3100`. The gRPC listener binds to `0.0.0.0` and resolves `GRPC_PORT`, then `50051`. This keeps the service-local `.env.example`, root environment, and Compose port contract aligned.

## Known Gaps

- `role` is a free string in DB.
- No soft delete or account status in user DB.
- Disabled-user state currently belongs to auth Redis behavior, not user DB.
- No rich profile model yet.
- No tenant ID yet.
- No audit trail for profile, email, or role changes.
- HTTP only exposes self-update, not admin profile update.
- `AuthClientModule` exists because guards need auth-service validation.
- `apps/user-service/README.md` is still Nest boilerplate, not service-specific documentation.

## Related Files

- `apps/user-service/src/user/user.service.ts`
- `apps/user-service/src/user/user.controller.ts`
- `apps/user-service/src/user/grpc/user-grpc.controller.ts`
- `apps/user-service/src/user/user.module.ts`
- `apps/user-service/src/app.module.ts`
- `apps/user-service/src/auth-client.module.ts`
- `apps/user-service/src/main.ts`
- `apps/user-service/src/health.controller.ts`
- `apps/user-service/src/common/decorators/req-user.decorator.ts`
- `apps/user-service/src/dto/update-profile.dto.ts`
- `apps/user-service/src/config/env.validation.ts`
- `apps/user-service/prisma/schema.prisma`
- `apps/user-service/prisma/seed.ts`
- `apps/user-service/test/http/user.http.e2e.spec.ts`
- `apps/user-service/test/grpc/user.e2e.spec.ts`
- `apps/user-service/test/grpc/helpers.ts`
- `apps/user-service/test/setup/wait-for-services.ts`
- `packages/protos/user.proto`
