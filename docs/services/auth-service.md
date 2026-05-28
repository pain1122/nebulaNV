# Auth Service

Auth service owns authentication, token handling, refresh-token behavior, and user identity source-of-truth.

## Main Flow

```txt
login/refresh request
-> auth DTO
-> AuthService
-> Redis/session/token storage
-> response
```

## Boundary Rule

Access tokens and refresh tokens have different responsibilities.

Do not use refresh-token storage as an active frontend state source.

## Security Rule

Service-to-service secrets and gateway secrets are separate boundaries.

Examples:

- `S2S_SECRET`
- `GATEWAY_SECRET`

Do not merge them casually.

## Guard Rule

Auth decorators and guards should enforce:

- public route semantics
- required user ID semantics
- role boundaries
- service-to-service signature checks

## Type Rule

Auth context should be represented explicitly.

Avoid passing raw decoded JWT payloads through unrelated service layers.
