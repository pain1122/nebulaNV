# Order Service

Order service owns cart and order workflows.

## Main Flow

```txt
gRPC/HTTP request
-> order controller
-> resolved auth context
-> OrderService
-> Prisma order/cart tables
-> response
```

## Identity Rule

Order handlers should not trust caller-supplied user IDs when authenticated context is available.

Use auth context helpers to resolve the actor.

## gRPC Rule

gRPC handlers should type their request, metadata, and call objects.

Avoid:

```ts
call: any
```

Prefer a local typed call shape when needed:

```ts
type GrpcCall<TReq> = ServerUnaryCall<TReq, unknown>;
```

## Status Rule

Order status values should be validated before casting to Prisma/order enums.

Never blindly cast arbitrary strings into enum values.
