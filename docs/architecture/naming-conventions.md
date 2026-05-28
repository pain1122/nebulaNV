# Naming Conventions

Names are contracts once they cross a boundary.

Use one canonical name unless there is a real external format that must be translated.

## Standard Naming

| Area | Convention | Example |
| --- | --- | --- |
| TypeScript code | `camelCase` | `thumbnailUrl` |
| DTO fields | `camelCase` | `categoryId` |
| Service input fields | `camelCase` | `discountType` |
| Prisma model fields | `camelCase` | `createdAt` |
| Environment variables | `UPPER_SNAKE_CASE` | `GRPC_PORT` |
| Database mapped columns | DB-specific | `category_id` via Prisma `@map` |
| Proto files | proto convention | often `snake_case` in `.proto` |
| Generated gRPC TypeScript | generated shape | often `camelCase` |

## Internal Rule

Inside services, prefer `camelCase` everywhere.

Good:

```ts
thumbnailUrl
categoryId
discountType
```

Avoid aliases unless the meaning is truly different.

Bad:

```ts
thumbnail_url
imageUrl
catId
```

## Boundary Translation

Only translate names at real boundaries:

- HTTP controller
- gRPC controller
- Prisma mapper
- external API adapter

Example:

```ts
const input: CreateProductInput = {
  thumbnailUrl: req.thumbnailUrl,
};
```

After that, the service should only know `thumbnailUrl`.

## Different Names Must Mean Different Things

Some similar names are intentionally different.

Example from media:

- `actorUserId`: who is performing the action
- `ownerId`: who owns the media

These should not be merged just because both can be user IDs.

## Env Variables Are Different

Environment variables are deployment configuration, so they use `UPPER_SNAKE_CASE`.

Example:

```env
SVC_NAME=product-service
PORT=3003
GRPC_PORT=50053
```

Do not copy env naming style into DTOs or service inputs.

## Review Checklist

When adding or renaming a field, check:

- Does the DTO use the same internal name?
- Does the service input use the same internal name?
- Does Prisma use the same field name or explicitly map it?
- Does gRPC translate only at the controller boundary?
- Does the response mapper expose the intended public name?
- Do tests use the public API name, not a random internal alias?
