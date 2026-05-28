# User Service

User service owns user-facing profile data and user account domain behavior that is not part of token issuance itself.

## Main Flow

```txt
HTTP/gRPC request
-> user DTO
-> UserService
-> user storage
-> response
```

## Auth Boundary

Auth service owns authentication and token lifecycle.

User service should consume trusted identity context from auth/gateway guards instead of trusting arbitrary caller-supplied user IDs.

## Profile Rule

Profile updates should distinguish:

- actor identity from auth context
- target user/profile being updated
- admin actions versus self-service actions

This prevents the same "actor vs owner" confusion that can happen in media access.

## Type Rule

Use explicit request/context types for authenticated handlers.

Avoid passing raw decoded JWT payloads or raw request objects into deep service logic.
