# Product Service

Product service owns product data, product taxonomy integration, product gallery images, and product discount logic.

## Main Flow

```txt
HTTP/gRPC request
-> product DTO
-> ProductServiceImpl
-> Prisma product tables
-> response mapper
```

## Important Files

- `src/product/dto/product-input.dto.ts`
- `src/product/product.service.ts`
- `src/product/grpc/product-grpc.controller.ts`
- `src/taxonomy/taxonomy.service.ts`
- `src/taxonomy/grpc/taxonomy-grpc.controller.ts`
- `src/default-product-taxonomy.initializer.ts`
- `src/prisma.service.ts`

## Important Shapes

- `ProductInputDto`: create/update input payload
- `ApplyDiscountBulkDto`: bulk discount request
- `ProductPatchInput`: internal update shape used by service logic
- `ListProductsInput`: internal list shape used by service logic
- `Product`: Prisma DB record
- `TaxonomyDto`: taxonomy-service response type from `@nebula/clients`
- `ProductTaxonomyRecord`: local extension when product taxonomy responses need extra optional fields

## Naming

Use `camelCase` internally:

- `categoryId`
- `thumbnailUrl`
- `discountType`
- `model3dUrl`

Do not introduce aliases unless a boundary requires translation.

## Discount Rule

The DTO enum supports:

- `PERCENTAGE`
- `FIXED`
- `NONE`

The Prisma enum supports:

- `PERCENTAGE`
- `FIXED`

So service logic converts:

```txt
DiscountTypeDto.NONE -> null
```

This means "no discount" in the database.

## Taxonomy Rule

Product categories are owned by taxonomy-service.

Product service stores only the taxonomy ID in `categoryId`.

Before creating or updating a product category, product service should verify that the taxonomy entry:

- exists
- has `scope === "product"`
- has the expected category kind

## Mapper Rule

Do not return raw Prisma product records directly if response values need formatting.

The service mapper handles:

- `Date` to ISO string
- nullable strings to empty strings where needed
- nullable discount values
- public response shape stability

## Current Cleanup Direction

Product service is being tightened to remove source `any` usage.

Preferred pattern:

```ts
async create(input: ProductInputDto) {
  // service logic
}
```

Not:

```ts
async create(input: any) {
  // blind trust
}
```
