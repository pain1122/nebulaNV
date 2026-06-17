# NebulaNV Developer Docs

This folder is the context shortcut for NebulaNV. It should explain the system well enough that a returning developer or AI agent can work without rereading entire service directories.

The goal is not to document every line. The goal is to preserve boundaries, current contracts, known gaps, and the files that matter.

## Read Order

For most backend tasks, read in this order:

1. [Current Focus](current-focus.md)
2. [System Relationships](architecture/system-relationships.md)
3. [Contracts And Boundaries](architecture/contracts-and-boundaries.md)
4. The relevant service note under [Service Notes](#service-notes)
5. [Testing And Health](architecture/testing-and-health.md) if changing behavior or verification
6. [Local Dev And Docker Boot](architecture/local-dev-and-docker-boot.md) if running services or Docker

## Architecture Notes

- [System Relationships](architecture/system-relationships.md): ownership, valid service connections, forbidden paths.
- [Contracts And Boundaries](architecture/contracts-and-boundaries.md): DTO/proto/service/Prisma/mapper rules, naming, identity, cross-service clients.
- [Testing And Health](architecture/testing-and-health.md): build/lint/test layers, health model, readiness gaps, verification checklist.
- [Local Dev And Docker Boot](architecture/local-dev-and-docker-boot.md): ports, Docker/runtime URLs, DB migration patterns, WSL/Docker clock drift.

## Service Notes

- [Auth Service](services/auth-service.md)
- [User Service](services/user-service.md)
- [Settings Service](services/settings-service.md)
- [Taxonomy Service](services/taxonomy-service.md)
- [Media Service](services/media-service.md)
- [Product Service](services/product-service.md)
- [Blog Service](services/blog-service.md)
- [Order Service](services/order-service.md)
- [Web App](services/web.md)

## Reports

- [2026-05-28 Stabilization And Docs Report](reports/2026-05-28-stabilization-and-docs-report.md)

## Documentation Rule

Docs should be factual and current.

Mark future behavior as `Target` or `Planned`. Do not mix target architecture with implemented behavior without labeling it.

If a rule matters at runtime, it should eventually exist in code as one of these:

- type
- DTO validation
- mapper
- guard
- service check
- database constraint
- test

## Maintenance Checklist

When changing a service contract:

- Update the service doc.
- Update `system-relationships.md` if connections changed.
- Update `contracts-and-boundaries.md` only if a global rule changed.
- Update `testing-and-health.md` if verification expectations changed.
- Validate related file paths before adding them to docs.
