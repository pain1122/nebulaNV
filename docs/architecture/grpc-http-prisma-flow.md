# HTTP, gRPC, DTO, Prisma Flow

Each service should follow the same basic flow.

```txt
HTTP/gRPC request
-> controller
-> DTO validation/transformation
-> service input
-> service logic
-> Prisma query/write
-> mapper
-> response
```

## HTTP Flow

```txt
JSON request
-> HTTP controller
-> DTO class
-> service input
-> service method
```

Example:

```ts
@Post()
create(@Body() body: CreateProductRequestDto) {
  return this.svc.create(body.data);
}
```

The controller validates the request. The service receives a known internal shape.

## gRPC Flow

```txt
gRPC request
-> gRPC controller
-> generated proto type / DTO
-> service input
-> service method
```

Example:

```ts
@GrpcMethod("ProductService", "CreateProduct")
create(dto: CreateProductDto) {
  return this.svc.create(dto.data);
}
```

gRPC controllers are boundary adapters. They should not leak proto-specific details into service logic.

## Prisma Flow

```txt
service method
-> Prisma input object
-> Prisma generated record
-> response mapper
```

Example:

```ts
const where: Prisma.ProductWhereInput = {
  deletedAt: null,
};
```

Prisma generated types should be used for DB filters and DB mutation shapes.

## Mapper Flow

Use mappers when the response shape is not exactly the DB shape.

Example:

```ts
private toDto(product: Product) {
  return {
    id: product.id,
    createdAt: product.createdAt.toISOString(),
  };
}
```

Reasons to map:

- Convert `Date` to string
- Convert `Decimal` to response-safe values
- Hide internal fields
- Normalize nullable fields
- Keep public response names stable

## Error Flow

Catch unknown errors as `unknown`.

Then narrow:

```ts
catch (e: unknown) {
  throw mapPrisma(e);
}
```

Prisma errors can be mapped to public Nest exceptions:

- `P2002` -> duplicate value
- `P2025` -> related record not found

## Important Rule

Controllers adapt input. Services apply business logic. Mappers shape output.

Do not let one layer do all three jobs unless the service is intentionally tiny.
