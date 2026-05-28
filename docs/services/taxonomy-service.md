# Taxonomy Service

Taxonomy service owns reusable classification data such as categories, tags, brands, and service-specific taxonomy trees.

## Main Flow

```txt
HTTP/gRPC request
-> taxonomy DTO
-> TaxonomyService
-> Prisma taxonomy table
-> taxonomy response
```

## Shared Client Types

Other services should call taxonomy through `@nebula/clients`.

Important shared shapes:

- `TaxonomyDto`
- `CreateTaxonomyReq`
- `UpdateTaxonomyReq`
- `TaxonomyProxy`

## Scope Rule

Taxonomy entries should be scoped.

Examples:

- `scope = "product"`
- `scope = "blog"`

Services that consume taxonomy should verify the returned taxonomy entry belongs to the expected scope before storing or trusting its ID.

## Kind Rule

Taxonomy `kind` describes what the taxonomy entry is for.

Examples:

- `category.default`
- `tag`
- `brand`

Do not assume every taxonomy ID is valid for every use case.

## Client Rule

Consumer services should not re-declare taxonomy response types manually.

Prefer:

```ts
import { type TaxonomyDto } from "@nebula/clients";
```

This keeps cross-service contracts centralized.
