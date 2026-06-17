# User Service

User-service owns persisted user account rows and profile operations.

Auth-service owns token lifecycle and uses user-service as the user data authority.

## Owns

- User IDs.
- Email lookup.
- Phone lookup.
- Password hash storage.
- Role string storage.
- Refresh-token hash storage.
- Profile update rules.
- Self/admin access checks for profile reads and updates.

## Does Not Own

- JWT issuing.
- Token refresh/rotation logic.
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
- Storing refresh-token hash through `SetRefreshToken`.
- Fetching profile data through `GetUser` or `GetUserWithHash`.

User-service should not trust caller-supplied user IDs by themselves. User-facing reads and writes must use auth-verified context from guards.

## HTTP Contract

Base controller: `/users`

Current routes:

- `GET /health`
- `GET /users`
- `GET /users/:id`
- `PUT /users/me`

Access policy:

- `GET /health` is public and checks DB.
- `GET /users` requires `admin`.
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
- `UpdateProfile`
- `CreateUser`
- `FindUserWithHash`
- `SetRefreshToken`
- `GetUserWithHash`

Access policy:

- `GetUser` requires `user`, `admin`, or `root-admin`; self or admin only.
- `FindUser` requires `admin` or `root-admin`.
- `UpdateProfile` requires `user`, `admin`, or `root-admin`; self or admin only.
- `CreateUser` is internal S2S gateway-only and requires user ID metadata.
- `FindUserWithHash` is internal S2S gateway-only for auth flows.
- `SetRefreshToken` is internal S2S gateway-only and requires user ID metadata.
- `GetUserWithHash` is internal S2S gateway-only and requires user ID metadata.

Security behavior:

- `GetUser` and `UpdateProfile` use verified guard context.
- Spoofed role metadata must not override the signed bearer token.
- `CreateUser` ignores requested admin role unless the verified caller is admin/root-admin.
- Self-register style `CreateUser` creates normal `user` role.

## Storage Model

Database model: `User`

Current fields:

- `id`
- `email`
- `phone`
- `password`
- `role`
- `refreshToken`
- `createdAt`
- `updatedAt`

Notes:

- `email` is unique and nullable.
- `phone` is unique and nullable.
- `password` stores a password hash.
- `refreshToken` stores the refresh-token hash/string provided by auth-service.
- `role` is currently a string, not a DB enum.

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

- Health returns `ok` and DB `up`.
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
- Internal `CreateUser` creates normal user even if role `admin` is requested.
- Internal hash lookup returns password hash and refresh token.
- Created gRPC user can log in through auth-service.
- `SetRefreshToken` stores refresh-token hash.
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

Current health route:

```txt
GET /health
```

It is public and checks Postgres with:

```sql
SELECT 1
```

Healthy response shape:

```ts
{
  status: "ok";
  db: "up";
  time: string;
}
```

Degraded response shape:

```ts
{
  status: "degraded";
  db: "down";
  error: string;
}
```

## Known Gaps

- `role` is a free string in DB.
- No soft delete or account status in user DB.
- Disabled-user state currently belongs to auth Redis behavior, not user DB.
- No rich profile model yet.
- No tenant ID yet.
- No audit trail for profile, email, or role changes.
- HTTP only exposes self-update, not admin profile update.
- `main.ts` reads `USER_HTTP_PORT` for HTTP, but `.env.example` shows `PORT`.
- gRPC bind is hard-coded to `0.0.0.0:50051`, not currently reading `GRPC_PORT`.
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
