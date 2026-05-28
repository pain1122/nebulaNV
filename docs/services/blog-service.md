# Blog Service

Blog service owns blog posts and blog-specific taxonomy usage.

## Main Flow

```txt
HTTP/gRPC request
-> blog DTO
-> BlogService
-> Prisma blog post table
-> blog mapper
-> response
```

## Important Patterns

Blog service uses local mappers/types to separate:

- incoming DTOs
- Prisma blog post records
- public blog post response views

## Status Rule

DTO status values and Prisma status values should be converted deliberately when they cross the service boundary.

Do not compare unrelated enum types directly.

## Mapper Rule

Blog post response formatting belongs in the blog mapper.

The mapper is responsible for:

- converting `Date` values
- normalizing optional fields
- keeping response shape stable

## Taxonomy Rule

Blog taxonomy should be handled through typed taxonomy client shapes, not raw `any` values.

Use the same pattern as product taxonomy:

```txt
TaxonomyDto from @nebula/clients
-> local response mapper
-> proto/http response shape
```
