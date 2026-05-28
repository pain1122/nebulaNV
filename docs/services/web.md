# Web App

The web app consumes backend APIs and renders the public/admin user interface.

## Boundary Rule

The web app should treat backend API responses as contracts.

If a backend response shape changes, update the frontend API client or mapper explicitly.

## Naming Rule

Use backend public API names as-is.

Prefer:

```ts
thumbnailUrl
categoryId
discountType
```

Do not invent frontend-only aliases unless a local UI component needs a different display model.

## Token Rule

Frontend token behavior should respect auth-service boundaries.

Access tokens and refresh flows are separate concerns. Do not persist refresh tokens in active frontend state unless the auth design explicitly requires it.

## Future Direction

When API contracts stabilize, add typed frontend API clients so backend response changes are caught at build time.
