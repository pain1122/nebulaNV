# Type Shapes

This project uses different type shapes at different boundaries. They look similar, but they do different jobs.

## DTO Types

DTOs validate and transform external input.

Examples:

- `ProductInputDto`
- `CreateMediaDto`
- `ListPostsQueryDto`

Use DTOs in:

- HTTP controllers
- gRPC controllers when incoming payloads need validation

Do not treat DTOs as database records. DTOs describe incoming requests, not stored rows.

## Service Input Types

Service input types are the internal shape a service method accepts.

Examples:

- `CreateMediaInput`
- `PresignUploadInput`
- `ProductPatchInput`
- `ListProductsInput`

Use service input types between controllers and service methods.

The service should not care whether the request originally came from HTTP, gRPC, tests, or another internal caller.

## Prisma Types

Prisma types represent database records and database input shapes.

Examples:

- `Product`
- `BlogPost`
- `Media`
- `Prisma.ProductWhereInput`
- `Prisma.ProductUpdateManyMutationInput`

Use Prisma generated types for:

- DB records returned by Prisma
- DB filters
- DB mutation input objects

Do not return raw Prisma records directly if the public response shape differs from the DB shape.

## View / Response Types

View types are the shape returned to clients.

Examples:

- `ProductView`
- `BlogPostView`
- `MediaRecord`

Use mapper functions to convert DB records to response views.

Pattern:

```ts
function toProductView(product: Product): ProductView {
  return {
    id: product.id,
    title: product.title,
    createdAt: product.createdAt.toISOString(),
  };
}
```

This keeps response formatting in one controlled place.

## Shared Client Types

Shared client types describe cross-service gRPC contracts.

Examples:

- `TaxonomyDto`
- `TaxonomyProxy`
- `SettingsProxy`

These are exported from packages such as `@nebula/clients`.

Use them when a service calls another service.

Example:

```ts
import { type TaxonomyDto } from "@nebula/clients";
```

## Proto / Generated gRPC Types

Proto files define the gRPC contract. Generated TypeScript types describe the generated request and response shapes.

Use generated proto types in gRPC controllers.

Do not push generated proto objects deep into service logic. Convert them at the gRPC boundary if the internal service shape differs.

## Error Shapes

Caught errors and external payloads should start as `unknown`, not `any`.

Pattern:

```ts
catch (e: unknown) {
  if (isRecord(e) && e.code === "P2002") {
    // safe access after narrowing
  }
}
```

Use helpers such as:

- `isRecord`
- `errorMessage`
- `grpcErrorMessage`

## Main Rule

Do not pass raw objects through multiple layers.

Bad:

```ts
service.create(req as any);
```

Good:

```ts
const input: CreateProductInput = {
  title: dto.title,
  categoryId: dto.categoryId,
};

service.create(input);
```

One layer should translate the shape. The next layer should receive a known type.
