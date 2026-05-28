# NebulaNV Developer Docs

This folder explains how the backend services are shaped and why the type boundaries exist.

The goal is not to document every line of code. The goal is to make it possible for a returning developer, or a new developer, to understand the project without holding the whole system in memory.

## Start Here

- [Type Shapes](architecture/type-shapes.md)
- [Naming Conventions](architecture/naming-conventions.md)
- [HTTP, gRPC, DTO, Prisma Flow](architecture/grpc-http-prisma-flow.md)
- [Service Boundaries](architecture/service-boundaries.md)
- [Local Dev And Docker Boot](architecture/local-dev-and-docker-boot.md)

## Service Notes

- [Product Service](services/product-service.md)
- [Media Service](services/media-service.md)
- [Blog Service](services/blog-service.md)
- [Order Service](services/order-service.md)
- [Auth Service](services/auth-service.md)
- [Taxonomy Service](services/taxonomy-service.md)
- [Settings Service](services/settings-service.md)
- [User Service](services/user-service.md)
- [Web App](services/web.md)

## Reports

- [2026-05-28 Stabilization And Docs Report](reports/2026-05-28-stabilization-and-docs-report.md)

## Working Rule

Use docs to explain intent and boundaries. Use TypeScript to enforce them.

If a rule matters at runtime, it should eventually exist in code as a type, mapper, validation rule, guard, or test.

