# NebulaNV Technical Audit

**Audit date:** 2026-07-08
**Repository:** `C:\Users\abbas\Desktop\work\nebula`
**Scope:** Review-only repository-level technical audit of the implementation present on disk at audit time.
**Status vocabulary:** `Implemented`, `Partial`, `Scaffolded`, `Planned`, `Not found`.
**Confidentiality note:** Secrets, tokens, private URLs, credentials, and personally identifying values are intentionally omitted.

## How to Read This Audit

This document separates implemented behavior from incomplete, scaffolded, or planned work. It should be treated as a technical credibility map: what the repository already proves, where the strongest engineering work is, and which issues should be fixed before making stronger portfolio or production-readiness claims.

## Table of Contents

- [1. Executive Summary](#1-executive-summary)
- [2. Verified Technology Inventory](#2-verified-technology-inventory)
- [3. Monorepo and Architecture Map](#3-monorepo-and-architecture-map)
- [4. Status Matrix](#4-status-matrix)
- [5. Service-Boundary Audit](#5-service-boundary-audit)
- [6. Contract Discipline](#6-contract-discipline)
- [7. Authentication and Token Lifecycle](#7-authentication-and-token-lifecycle)
- [8. Authorization and Identity Propagation](#8-authorization-and-identity-propagation)
- [9. Service-to-Service Security](#9-service-to-service-security)
- [10. Media/Filemanager Architecture](#10-mediafilemanager-architecture)
- [11. Media Access Lanes](#11-media-access-lanes)
- [12. Upload Security and Performance](#12-upload-security-and-performance)
- [13. Public Media Rendering](#13-public-media-rendering)
- [14. Protected and Strict Reads](#14-protected-and-strict-reads)
- [15. Delete and Folder Safety](#15-delete-and-folder-safety)
- [16. Media Data Model](#16-media-data-model)
- [17. Storage Abstraction Review](#17-storage-abstraction-review)
- [18. Media Processing and Future Workers](#18-media-processing-and-future-workers)
- [19. Next.js and Frontend Status](#19-nextjs-and-frontend-status)
- [20. Planned Block and Theme System](#20-planned-block-and-theme-system)
- [21. Docker and Local Infrastructure](#21-docker-and-local-infrastructure)
- [22. CI/CD and Code Quality](#22-cicd-and-code-quality)
- [23. Testing Audit](#23-testing-audit)
- [24. Security Risk Register](#24-security-risk-register)
- [25. Performance and Scalability Review](#25-performance-and-scalability-review)
- [26. Strongest Engineering Work](#26-strongest-engineering-work)
- [27. Weaknesses and Unfinished Areas](#27-weaknesses-and-unfinished-areas)
- [28. Recommended Golden Demo Flow](#28-recommended-golden-demo-flow)
- [29. Prioritized Implementation Roadmap](#29-prioritized-implementation-roadmap)
- [30. Architecture Diagrams in Text](#30-architecture-diagrams-in-text)
- [31. Truthful Resume Package](#31-truthful-resume-package)
- [32. Interview Preparation](#32-interview-preparation)
- [33. Final Truth Map](#33-final-truth-map)
- [34. Evidence Appendix](#34-evidence-appendix)

---

## 1. Executive Summary

NebulaNV is currently a TypeScript/NestJS service-oriented ecommerce platform foundation with separate backend services for auth, users, media, products, settings, taxonomy, blog, and orders, plus a Next.js admin-oriented web workspace. It is intended to solve modular commerce/admin/media management with gRPC service contracts, Prisma/PostgreSQL persistence, Redis-backed auth state, and S3-compatible media storage.

Actually implemented today: multi-service NestJS backends, HTTP and gRPC entry points, Prisma schemas and migrations, protobuf contracts and generated TypeScript, shared auth/client packages, Docker Compose infrastructure, CI workflows, and a substantial media/filemanager backend. The Next.js app builds, but it is not yet a reliable product/admin surface end to end.

Current maturity: **platform foundation / backend MVP**. It is not a production candidate yet because auth/S2S enforcement is inconsistent, CI lint is red, media promotion/scanning is missing, frontend product creation is broken, and deployment is incomplete.

What distinguishes it from ordinary CRUD: multiple bounded services, per-service databases, gRPC/protobuf contracts, token-version auth lifecycle, HMAC S2S helpers, direct-to-S3 media flow, public/protected/strict media lanes, delete preview/confirm, Dockerized local infra, and broad backend e2e test scaffolding.

Strongest subsystem: **media/filemanager backend**, with the caveat that the scan/promotion worker is not implemented.

## 2. Verified Technology Inventory

Actively used:

| Technology                  | Version/evidence                                                                 |
| --------------------------- | -------------------------------------------------------------------------------- |
| Node                        | package engines `>=22`; local command showed `v24.16.0`; CI uses Node 22         |
| pnpm                        | `packageManager: pnpm@10.17.1`; local command showed `10.17.1`                   |
| Turborepo                   | `turbo ^2.5.8`, [turbo.json](../../turbo.json)                                   |
| TypeScript                  | root `5.9.2`; app packages use `^5.9.2` or `^5`                                  |
| NestJS                      | `@nestjs/common/core/microservices/platform-express 11.1.6`                      |
| Next.js                     | `16.0.7`, [apps/web/package.json](../../apps/web/package.json)                   |
| React                       | `19.2.0`                                                                         |
| Tailwind CSS                | `^4.1.17`                                                                        |
| Prisma                      | `6.16.2`, multiple service schemas                                               |
| PostgreSQL                  | Docker Compose `postgres:17`                                                     |
| Redis                       | Docker Compose `redis:7-alpine`; auth uses `ioredis ^5.9.2`                      |
| MinIO/S3-compatible storage | Compose MinIO; media uses `@aws-sdk/client-s3 ^3.953.0` and presigner `^3.953.0` |
| gRPC                        | `@grpc/grpc-js ^1.14.0`, `@grpc/proto-loader ^0.8.0`                             |
| Protocol Buffers / ts-proto | `protoc ^32.1.0`, `ts-proto ^2.7.7`, `@bufbuild/protobuf ^2.9.0`                 |
| JWT/auth                    | `@nestjs/jwt ^11.0.0`, `jsonwebtoken ^9.0.2`, `bcrypt ^6.0.0`                    |
| Validation/config           | `class-validator ^0.14.2`, `joi ^18.0.1`, `@nestjs/config ^4.0.2`                |
| Testing                     | `jest ^30.2.0`, `ts-jest ^29.4.4`, service e2e specs                             |
| Docker                      | root compose files, `docker/backend.Dockerfile`                                  |

Installed but lightly used: `@packages/config`, Nx-related cache support, CKEditor/template libraries in web, service-specific legacy Dockerfiles, `proto` npm package.

Generated/build-time only: Prisma clients, `packages/protos/generated`, `dist`, `.next`, `.turbo`.

Scaffolded: service e2e suites requiring live infra, release compose, block/theme documentation, media lifecycle fields for scanning/promotion.

Planned/documented only: Go, Rust, Python AI, Kubernetes/AWS deployment, mobile apps, event-driven workers, block/theme editor, multi-tenancy.

Apparently unused or not central: no separate API gateway service found; no shared logging package found; root Prisma scripts target only user/product/settings; per-service Dockerfiles appear secondary to `docker/backend.Dockerfile`.

## 3. Monorepo and Architecture Map

Layout: `apps/*` for services and web, `packages/*` for protos/auth/clients/config, `docs/*` for architecture/service docs, `docker/*`, `.github/workflows/*`, and per-service Prisma folders.

| Workspace/service/package   | Responsibility                                         | Runtime/build role      | Dependencies                  | Current status      |
| --------------------------- | ------------------------------------------------------ | ----------------------- | ----------------------------- | ------------------- |
| `auth-service`              | Login/register/refresh/logout/token validation         | HTTP + gRPC             | user-service, Redis, JWT      | Partial             |
| `user-service`              | User records/password/refresh hash                     | HTTP + gRPC + Prisma    | Postgres, auth client         | Implemented         |
| `media-service`             | Media metadata, S3 presign/finalize/read/render/delete | HTTP + gRPC + Prisma    | Postgres, auth gRPC, S3/MinIO | Partial             |
| `product-service`           | Product catalog, gallery URLs, discounts               | HTTP + gRPC + Prisma    | taxonomy/settings clients     | Partial             |
| `settings-service`          | Namespaced key/value settings                          | HTTP + gRPC + Prisma    | Postgres                      | Implemented/Partial |
| `taxonomy-service`          | Shared taxonomy tree                                   | HTTP + gRPC + Prisma    | auth/settings clients         | Implemented         |
| `blog-service`              | Blog posts and taxonomy facade                         | HTTP + gRPC + Prisma    | taxonomy/settings/auth        | Partial             |
| `order-service`             | Cart/order checkout/status                             | HTTP + gRPC + Prisma    | product/settings/auth         | Partial             |
| `apps/web`                  | Next.js admin/panel proxy UI                           | Frontend/runtime proxy  | auth/product/taxonomy HTTP    | Partial             |
| `packages/protos`           | Proto contracts and generated TS                       | Build/runtime types     | ts-proto/protoc               | Partial             |
| `packages/grpc-auth`        | JWT/S2S guards, decorators, metadata helpers           | Runtime shared security | Nest/gRPC/JWT                 | Partial             |
| `packages/clients`          | Settings/taxonomy S2S gRPC clients                     | Runtime shared clients  | grpc-auth/protos              | Implemented         |
| `packages/config`           | Shared config module/schema                            | Build/runtime package   | Joi/Nest config               | Scaffolded          |
| `docker/backend.Dockerfile` | Multi-target backend images                            | Build/deploy            | pnpm/turbo                    | Implemented         |
| `docker-compose.yml`        | Local infra and backend services                       | Local runtime           | Postgres/Redis/MinIO          | Partial             |
| `.github/workflows`         | CI/proto check                                         | CI                      | pnpm/turbo/protoc             | Partial             |

Boundaries are meaningful at database/schema/proto level. They are not fully enforced at runtime because S2S guard wiring is inconsistent and user context can fall back to raw metadata/headers.

## 4. Status Matrix

| Area or feature          | Status      | Evidence                                           | Current limitations                           | Resume-safe claim             |
| ------------------------ | ----------- | -------------------------------------------------- | --------------------------------------------- | ----------------------------- |
| Monorepo setup           | Implemented | `pnpm-workspace.yaml`                              | Large vendored web assets                     | Built pnpm monorepo           |
| pnpm workspace           | Implemented | root `package.json`, workspace file                | Dirty lockfile existed before review          | Managed pnpm workspaces       |
| Turborepo pipelines      | Implemented | `turbo.json`                                       | `test` depends build; outputs warning for web | Added Turbo build/lint/test   |
| Shared TS config         | Implemented | `tsconfig.base.json`                               | Path aliases point to `dist`                  | Shared strict TS config       |
| Shared lint/formatting   | Partial     | `eslint.config.mjs`                                | Lint fails now                                | ESLint configured             |
| Environment validation   | Partial     | per-service `env.validation.ts`, `packages/config` | Inconsistent, shared config mostly unused     | Added Joi env validation      |
| Shared logging           | Not found   | service Prisma/Nest loggers only                   | No shared logger package                      | Used Nest/Prisma logging      |
| Proto generation         | Implemented | `scripts/proto-gen.mjs`                            | `--check` mutates and checks whole tree       | Automated ts-proto generation |
| Generated TS contracts   | Partial     | `packages/protos/generated`                        | `order` not exported from package index       | Generated gRPC TS contracts   |
| REST bootstrap           | Implemented | service `main.ts`                                  | Inconsistent CORS/helmet/validation           | HTTP services bootstrapped    |
| gRPC bootstrap           | Implemented | service `main.ts`                                  | Guard wiring differs by service               | gRPC services bootstrapped    |
| Auth service             | Partial     | `apps/auth-service/src/auth`                       | S2S missing, env validation thin              | JWT/refresh auth service      |
| User service             | Implemented | user Prisma/controller/service                     | Refresh hash single-session only              | User identity service         |
| Media service            | Partial     | media controller/service/schema                    | No scanner/promoter worker                    | S3 media platform foundation  |
| Gateway                  | Not found   | no gateway app                                     | Next API routes are partial proxy             | No gateway claim              |
| Product service          | Partial     | product service/schema                             | media IDs not integrated; web create broken   | Product catalog service       |
| Settings service         | Partial     | settings service/schema                            | only string API exposed                       | Settings service              |
| Order service            | Partial     | order service/schema                               | gRPC status role gap; no payment/inventory    | Cart/order foundation         |
| Blog service             | Partial     | blog service/schema                                | comments/local categories unfinished          | Blog service foundation       |
| Taxonomy service         | Implemented | taxonomy schema/service                            | HTTP auth awkward due global S2S              | Shared taxonomy service       |
| JWT access tokens        | Implemented | auth service/token guard                           | downstream depends auth-service availability  | JWT auth implemented          |
| Refresh rotation         | Partial     | `refreshTokens`                                    | replay does not globally invalidate           | Refresh rotation implemented  |
| Logout/invalidation      | Partial     | Redis token version                                | single-device semantics brittle               | Token version logout          |
| Role hierarchy           | Implemented | `roles.decorator.ts`                               | inconsistent decorator use                    | Role decorators/hierarchy     |
| User-context propagation | Partial     | metadata helpers                                   | raw `x-user-id` fallback risky                | Propagated user metadata      |
| HMAC service auth        | Partial     | `s2s.*`                                            | replayable, inconsistent enforcement          | HMAC S2S helpers              |
| gRPC service auth        | Partial     | guards/controllers                                 | auth/media/order gaps                         | gRPC guard package            |
| HTTP service auth        | Partial     | global guards/controllers                          | HTTP S2S behavior inconsistent                | HTTP JWT guards               |
| Prisma integration       | Implemented | per-service schemas                                | root scripts incomplete                       | Prisma per service            |
| PostgreSQL               | Implemented | compose + Prisma URLs                              | one physical DB server, multiple DBs          | Postgres-backed services      |
| Redis                    | Implemented | auth Redis service                                 | auth behavior fails if Redis down             | Redis token versioning        |
| MinIO/S3 storage         | Implemented | compose + AWS SDK                                  | provider abstraction thin                     | S3-compatible storage         |
| Presigned uploads        | Implemented | media presign methods                              | no max size binding                           | Direct upload presign         |
| Upload finalization      | Partial     | `finalizeUpload`                                   | creates `PENDING/QUEUED` only                 | Finalize verifies object      |
| Signed reads             | Partial     | `createReadUrl`                                    | only READY/CLEAN; URL reuse risk              | Signed read URLs              |
| Public rendering         | Partial     | `/media/render/:id`                                | only `variant=web`, no thumbnails             | Public render proxy           |
| Protected media          | Partial     | owner/context checks                               | signed URL leak/reuse until expiry            | Protected lane                |
| Strict media             | Partial     | opaque keys/short TTL/logs                         | no durable audit/encryption                   | Strict lane foundation        |
| Folder/filemanager       | Partial     | folder path/list/delete logic                      | no `MediaFolder` records                      | Public filemanager logic      |
| Delete preview/confirm   | Implemented | delete token/plan methods                          | synchronous confirm, queue warning            | Safe delete confirmation      |
| Media metadata lifecycle | Partial     | status/scan fields                                 | no worker transitions                         | Media lifecycle modeled       |
| Malware-status handling  | Scaffolded  | `scanStatus` enum/checks                           | no scanner                                    | Scan status modeled           |
| Next.js web app          | Partial     | Next build passed                                  | product create/refresh bugs                   | Next admin app foundation     |
| Admin UI                 | Partial     | panel routes/components                            | template-heavy, broken flows                  | Admin panel scaffold          |
| Storefront UI            | Not found   | no storefront routes found                         | panel only                                    | No storefront claim           |
| Docker Compose           | Partial     | compose config valid                               | no web service; migrations manual             | Local backend compose         |
| Multi-service startup    | Partial     | compose deps                                       | not run; readiness mixed                      | Compose model exists          |
| CI                       | Partial     | GitHub workflows                                   | lint fails locally                            | CI configured                 |
| Integration tests        | Partial     | backend e2e specs                                  | require live services/seed                    | Broad e2e test inventory      |
| Production deployment    | Scaffolded  | release compose                                    | no deploy workflow                            | Release compose scaffold      |
| Block/theme system       | Planned     | `docs/frontend/block-and-theme-system.md`          | no implementation                             | Planned architecture only     |
| Mobile support           | Planned     | docs/README                                        | no code                                       | Planned only                  |
| Multi-tenancy            | Planned     | docs mention future tenant                         | no tenant fields generally                    | Not implemented               |
| AI features              | Planned     | README/TODO                                        | no service/code                               | Planned only                  |
| Kubernetes/AWS           | Planned     | README/docs                                        | no k8s/helm found                             | Planned only                  |

## 5. Service-Boundary Audit

`auth-service`: owns auth workflows, not user rows. HTTP routes include register/login/refresh/logout/me in `auth.controller.ts`; gRPC exposes validate/get/refresh/profile in `grpc-auth.controller.ts`. Depends on user-service gRPC and Redis. It does not access another DB directly. Contracts are explicit but auth gRPC `@Public({gatewayOnly:true})` is brittle because `S2SGuard` is not wired globally. Domain logic is mostly in `AuthService`.

`user-service`: owns `User` Prisma model: email/phone/password/role/refreshToken. HTTP and gRPC expose user lookup/update/create/hash/refresh-token operations. It is a real boundary and does not directly access auth DB. Risk: refresh-token storage is single hash per user, and some internal gRPC methods rely heavily on propagated context.

`media-service`: owns `Media` metadata and S3 object lifecycle policy. HTTP/gRPC APIs are rich. It depends on auth gRPC and S3/MinIO, not other service DBs. Boundary is meaningful, but media gRPC lacks `S2SGuard`, making internal trust weaker than the design intends.

`product-service`: owns product catalog, gallery images as URL strings, product attributes/comments/sets. It validates taxonomy through taxonomy-service gRPC and settings through settings-service. No direct taxonomy DB access. Boundary is meaningful, but product/media integration is not complete.

`settings-service`: owns settings table; string get/set/delete are exposed. DB supports more value types than APIs expose. Good boundary, small scope.

`taxonomy-service`: owns tree taxonomy records. Provides reusable category/tag-like taxonomy. Strong ownership model; global S2S guard makes direct HTTP ergonomics awkward.

`blog-service`: owns blog posts/comments/local category table, but taxonomy facade delegates taxonomy categories. Some local `BlogCategory` model appears legacy/unfinished.

`order-service`: owns cart/order/order items. Calls product/settings services. No payment or inventory. gRPC auth is weak for status update.

Architecture enforces service ownership at data-access level better than at auth/trust-boundary level.

## 6. Contract Discipline

Intended flow mostly exists: controller DTO/proto -> service input -> Prisma -> mapper/response. Evidence: product DTOs in `product-input.dto.ts`, product mappers in `product.service.ts`; media DTOs and `media.service.ts`; generated proto types under `packages/protos/generated`.

Strengths: DTO validation, protobuf service definitions, service-layer mappers, docs explicitly warn against Prisma leakage.

Weaknesses:

- `packages/protos/index.ts` exports auth/user/product/settings/blog/taxonomy/media but not generated order.
- Some gRPC controllers use local request types instead of package exports, especially order.
- HTTP/gRPC contracts can drift: web sends `content`, product DTO expects `description`.
- Prisma Decimal values require careful mapping; product/order mix Decimal and string/number DTO boundaries.
- Optional string fields in proto3 make absence/default semantics weak.
- `resolveCtxUser` can use raw metadata, causing identity leakage into domain paths.

Proto maturity: useful and real, but not yet hardened for backward compatibility, semantic versioning, or package export completeness.

## 7. Authentication and Token Lifecycle

Registration: auth hashes password and calls user-service `CreateUser` over gRPC. Login: auth validates password through user-service hash lookup, checks Redis disabled state, reads token version, signs access and refresh tokens, bcrypt-hashes refresh token, stores it in user-service.

JWT payload includes `sub`, `email`, `role`, and token version (`tv`). Refresh token rotation verifies old refresh JWT, fetches stored hash, bcrypt-compares, issues new pair, stores new hash. Logout can clear refresh token and bump Redis token version.

Implemented: access/refresh issuance, refresh hash storage, rotation, Redis token versioning, disabled-user checks, downstream validation through `GrpcTokenAuthGuard`.

Brittle:

- Single refresh hash per user means "device" behavior is not really multi-session.
- Refresh-token replay mismatch throws but does not clearly global-invalidate/bump token version.
- Auth env validation misses some critical variables.
- If Redis or auth-service is unavailable, downstream token validation becomes unavailable/fails.
- Logs include user IDs and auth events; avoid expanding this into sensitive data.

Evidence: `apps/auth-service/src/auth/auth.service.ts`, `auth-redis.service.ts`, `apps/user-service/src/user/user.service.ts`.

## 8. Authorization and Identity Propagation

Role hierarchy exists in `packages/grpc-auth/src/roles.decorator.ts`. Decorators exist: `@Roles`, `@RoleAtLeast`, `@Public`, `@InternalOnly`, `@RequireUserId`. Context and metadata helpers exist in `metadata.ts` and `context.ts`.

Key distinction:

- User identity should come from a verified JWT or verified upstream service.
- Calling-service identity should come from S2S HMAC verification.
- Raw forwarded headers/metadata are untrusted unless S2S was validated.

Risk: `GrpcTokenAuthGuard` comments say it trusts service identity only if `S2SGuard` already ran, but `auth-service`, `media-service`, and `order-service` do not enforce that consistently. `resolveCtxUser` can fall back to raw `x-user-id`, `x-user-role`, `x-user-email`.

Downstream services cannot safely know user/service identity everywhere today. Some services can, some cannot. This is the main privilege-escalation/spoofing risk.

## 9. Service-to-Service Security

Metadata fields: `x-svc`, `x-svc-upstream`, configurable signature header, optional propagated user headers.

Signing: `deriveServiceSecret(master, serviceName)` then HMAC over `svc:method:path:minute`. Current callers use canonical method/path constants rather than the actual RPC path/body.

Timestamp: current minute and previous minute are accepted. Nonce: not present. Body/request binding: not present. Replay protection: limited to short time window. Rotation: old secret support exists, but operational rotation is not fully documented/tested.

Wiring:

- Product/blog gRPC use `micro.useGlobalGuards(S2SGuard, GrpcTokenAuthGuard)`.
- User/settings gRPC controllers use `@UseGuards(S2SGuard, GrpcTokenAuthGuard)`.
- Taxonomy has global S2S + token guards.
- Auth/media/order do not enforce S2S consistently.

Trust-boundary diagram:

```text
External user -> HTTP Authorization JWT -> service GrpcTokenAuthGuard -> auth-service ValidateToken
Internal service -> gRPC Metadata x-svc + HMAC -> S2SGuard -> trusted service context
Current gap -> some services accept token guard/user metadata without prior S2S verification
```

Conclusion: S2S is implemented in helpers and partially wired, but not consistently enforced and replay-resistant enough for production.

## 10. Media/Filemanager Architecture

Responsibility: media-service owns media metadata, storage keys, lane policy, presign/finalize/read/render/delete, and filemanager folder-path behavior.

Storage responsibility: object bytes live in S3-compatible storage. Metadata lives in Postgres. The service uses AWS SDK S3 clients for MinIO/Supabase S3-mode/AWS-style endpoints.

Lifecycle verified from code:

1. Presign: creates signed `PUT` URL with safe filename/key.
2. Direct PUT: client uploads to S3/MinIO, backend avoids bandwidth.
3. Finalize: service `HEAD`s object, verifies size and MIME, derives metadata.
4. DB row: creates `Media` row.
5. Read/list/render/delete: reads metadata, checks lane/status/ownership, uses signed URL or proxy stream.

Gap: finalized S3 uploads become `PENDING/QUEUED`, while read/render requires `READY/CLEAN`. No worker was found to move queued media to ready/clean.

Evidence: `apps/media-service/src/media.service.ts`, `media.controller.ts`, `media-render.controller.ts`, `media-grpc.controller.ts`, `apps/media-service/prisma/schema.prisma`.

## 11. Media Access Lanes

| Capability             | PUBLIC                            | PROTECTED                    | STRICT                             |
| ---------------------- | --------------------------------- | ---------------------------- | ---------------------------------- |
| Intended use           | Website/admin public assets       | User/app private assets      | More sensitive private assets      |
| Storage key            | Human-readable under public root  | Opaque private UUID          | Opaque private UUID                |
| Folder behavior        | `folderPath` and display name     | No public folder semantics   | No public folder semantics         |
| Filename               | Safe display/original allowed     | sanitized                    | stricter, avoids original exposure |
| Owner context          | optional/admin controlled         | required for users           | required                           |
| Scope/entity context   | optional-ish for public           | required for feature context | required                           |
| Upload auth            | admin/root routes                 | owner/admin routes           | admin/root-ish strict routes       |
| Read auth              | render public only if ready/clean | owner/admin signed read      | owner/admin signed read            |
| Listing auth           | admin/root public library         | owner/admin protected list   | admin/root strict list             |
| Delete auth            | admin/root with preview/confirm   | admin/root lane delete       | admin/root lane delete             |
| TTL                    | read TTL default class            | normal signed read TTL       | shorter strict TTL                 |
| Public render          | yes, public only                  | no                           | no                                 |
| Audit expectation      | normal logs                       | normal logs                  | service logs only                  |
| Encryption expectation | provider-level if configured      | provider-level               | app-level not implemented          |
| Current gaps           | no variants                       | URL leakage/revocation       | no durable audit/encryption        |

Lane separation is more than schema: service methods enforce public root, private root, owner/context, status, and render eligibility. It is not complete for strict-grade confidentiality.

## 12. Upload Security and Performance

Strengths:

- Direct-to-storage avoids backend file bandwidth.
- Safe filename regex and folder normalization exist.
- Public paths reject traversal/backslashes/unsafe segments.
- Sensitive lanes use opaque private keys.
- Finalize uses `HeadObjectCommand` and trusts storage metadata over client-provided size.
- MIME allowlist exists for image types.
- Signed upload TTL is configurable.

Risks:

- Presign does not bind max content length.
- Content type is ultimately storage metadata; MIME spoofing still possible without scanner/sniffing.
- No malware scanner.
- No orphan cleanup for abandoned presigned uploads.
- App-level duplicate/overwrite prevention is DB-driven and race-prone.
- Public display name uniqueness lacks DB unique constraint.
- No queue for very large delete workloads yet.

Direct upload is valuable because large files bypass NestJS memory/CPU/network. Remaining risks are lifecycle and validation, not the basic architecture.

## 13. Public Media Rendering

Route: `GET /media/render/:id?variant=web`.

Checks:

- accessClass must be `PUBLIC`.
- visibility must be `public`.
- path must be public-library compatible.
- status must be `READY`.
- scanStatus must be `CLEAN`.
- only `variant=web` is accepted.
- non-public/protected/strict and pending media are rejected.

Behavior: service proxies/streams object from S3 via backend, sets content headers, ETag/cache headers, and avoids exposing raw storage path. It does not redirect to raw storage URL.

Stable current contract: public media render by ID for clean/ready public assets. Planned but not implemented: thumbnails, responsive variants, format conversion, CDN invalidation.

## 14. Protected and Strict Reads

Protected/strict read uses signed S3 `GET` URLs after service authorization. Protected feature read checks owner plus scope/entity context. Strict uses shorter TTL and service logs.

Appropriate today:

- Private application documents: **maybe**, if short-lived signed URLs are acceptable and S2S/user auth is fixed.
- Sensitive business files: **partial**, needs audit and revocation story.
- Highly sensitive personal/medical files: **no**, not without durable audit, encryption design, stricter auth, compliance controls, download mediation, and revocation.

Risks: signed URL reuse until expiry, URL leakage, no durable audit table, no app-level encryption, no per-read revocation.

## 15. Delete and Folder Safety

Implemented:

- Single-file delete.
- Public-library delete preview and confirm.
- Recursive folder selection with warnings.
- Confirmation token with HMAC, actor, requested selection, plan file IDs, counts, expiry.
- Root folder delete rejected.
- `..`, unsafe slashes/backslashes rejected through normalization.
- Large plan warning (`delete_requires_worker_queue`).
- Confirm rebuilds plan and compares shape, so newly created files after preview change the plan and block stale confirm.

Remaining risks:

- Physical S3 delete then DB delete can drift if DB delete fails.
- Confirm is synchronous for allowed sizes.
- Protected/strict deletion is less rich than public preview/confirm.
- Cross-user safety depends on controller/guard correctness.

Overall deletion is one of the better-designed parts of the repo.

## 16. Media Data Model

`Media` fields include id, storage, bucket, path, filename, folderPath, displayName, originalFilename, mimeType, sizeBytes, dimensions/duration, ownerId, visibility, scope, entityType, entityId, accessClass, sha256, lifecycle status, scanStatus, scannedAt, scanError, quarantineReason, etag, promotedAt, created/updated timestamps.

Strong choices: lane enum, lifecycle enum, scan enum, owner/context fields, public folder/display fields, ETag/checksum fields, many useful indexes.

Missing/risky:

- No `MediaFolder` model.
- No variants table/model.
- No durable audit table.
- `sha256` unique nullable but scanner/dedupe not implemented.
- No unique constraint for public scope/folder/displayName.
- `ownerId` nullable creates policy complexity.
- Hard delete is used; `DELETED` enum exists but not consistently used.
- Object/database drift possible.

Evidence: `apps/media-service/prisma/schema.prisma`.

## 17. Storage Abstraction Review

There is no clean provider-neutral storage interface. Media service directly creates AWS SDK `S3Client` instances and uses `PutObjectCommand`, `HeadObjectCommand`, `GetObjectCommand`, `DeleteObjectCommand`, `getSignedUrl`.

MinIO support: real through S3-compatible endpoint/path-style config.
Supabase S3 compatibility: plausible if endpoint/credentials/path-style match.
AWS S3 readiness: plausible, but not proven by tests.
Provider switching: mostly S3-compatible switching, not abstract provider switching.

Conclusion: storage is S3-compatible, not truly provider-abstracted.

## 18. Media Processing and Future Workers

| Capability             | Status     | Evidence                              |
| ---------------------- | ---------- | ------------------------------------- |
| Thumbnails             | Not found  | no sharp/processor/variant worker     |
| Optimized web variants | Planned    | render accepts only `variant=web`     |
| Responsive variants    | Planned    | docs/TODO only                        |
| Image resizing         | Not found  | no processor dependency               |
| Format conversion      | Not found  | no worker                             |
| Watermarking           | Not found  | no code                               |
| Malware scanning       | Scaffolded | scan enums/status checks              |
| Queue jobs             | Scaffolded | warning code mentions worker queue    |
| Background workers     | Not found  | no worker app/process                 |
| Retries/dead-letter    | Not found  | no queue                              |
| Lifecycle transitions  | Scaffolded | `PENDING/QUEUED` created, no promoter |
| CDN invalidation       | Planned    | docs only                             |

Smallest reliable worker pipeline:

1. Poll/queue `PENDING/QUEUED`.
2. `HEAD` and optionally download/sample.
3. MIME sniff and size/dimension extraction.
4. Malware scan hook, even if local stub at first.
5. Promote to `READY/CLEAN` or `BLOCKED/INFECTED/FAILED`.
6. Generate one `web` variant.
7. Emit audit rows for strict reads/promotions/deletes.

## 19. Next.js and Frontend Status

Next.js `16.0.7`, React `19.2.0`, Tailwind `4.1.17`, App Router under `apps/web/app`. Build passed with `pnpm -w turbo build`.

Routes include auth login/refresh proxies, product list/get/patch proxies, taxonomy routes, and panel pages. The UI is admin-panel/template oriented with RTL/Persian text in places. It has client components for product add/list, rich text, taxonomy, media repeater UI state.

Important distinction: it **builds successfully**, but it is not yet a usable product interface. Refresh helper uses GET against POST-only route. Add product POST route is missing. Product create payload mismatches backend DTO. Media picker integration is TODO. Storefront UI was not found.

## 20. Planned Block and Theme System

Document found: `docs/frontend/block-and-theme-system.md`, status line says planned client-side phase.

Strong ideas:

- page/section/layout/slot/block model.
- semantic shared schema with renderer-specific config.
- block registry with versioning/migrations.
- declarative data binding to product/blog/media/taxonomy/settings.
- SSR/RSC rendering with cache tags.
- immutable published revisions, preview links, fallback behavior.
- renderer capability manifests.
- smart-slot rules that protect transactional screens.
- theme tokens, RTL/localization, accessibility, performance budgets.
- native mobile renderer considered separate from mobile web.

Missing decisions/risks: persistence models, ownership/tenant rollout, migration strategy, editor complexity, permissions, validation runtime, data cache invalidation, and first block catalog.

Smallest viable V1: one theme, 8-12 approved blocks, page/revision schema, registry validation, SSR renderer, draft/preview/publish, product/media/settings bindings, no arbitrary HTML/CSS, no transactional composition.

Status: **Planned**, not implemented.

## 21. Docker and Local Infrastructure

Docker Compose includes Postgres, Redis, MinIO, MinIO init, and backend services. `docker compose config` passed. Compose uses per-service env files and local development defaults; exact values are intentionally not repeated.

`docker/backend.Dockerfile` is a serious multi-stage backend build with pnpm fetch/install, Prisma schema copy, Turbo build, and per-service runtime targets. Release compose exists with required env placeholders.

Limitations:

- No web service in compose.
- Root Prisma scripts only cover user/product/settings, not media/taxonomy/blog/order.
- Compose does not clearly run migrations before services.
- Some `depends_on` entries are `service_started`, not full readiness.
- Docs mention `full` profiles, but current compose includes all backend app services without profiles.
- I did not run `docker compose up`, so live startup reliability is not verified.

## 22. CI/CD and Code Quality

Workflows:

- `.github/workflows/ci.yml`: checkout, Node 22, pnpm install frozen lockfile, Turbo lint, Turbo test, Turbo build.
- `.github/workflows/proto-gen.yml`: installs protoc, runs proto generation, fails on dirty generated output.

Local verification:

- `pnpm -w turbo build`: passed.
- `pnpm -w turbo check-types`: passed, but only packages with `check-types` ran.
- `pnpm -w turbo lint`: failed.

CI would currently fail at lint. Lint failures include formatting errors in `packages/grpc-auth` and React/TypeScript lint errors in `apps/web`.

Missing: Docker image build workflow, migration checks, security scanning, dependency audit, deployment workflow, frontend tests, database-backed CI services, generated code check that isolates proto output from unrelated dirty state.

## 23. Testing Audit

Found tests:

- Auth: app, HTTP/gRPC flow, user gRPC, Redis/security tests.
- User: HTTP and gRPC e2e.
- Media: access unit, HTTP e2e, gRPC e2e.
- Product: HTTP/gRPC product and taxonomy e2e.
- Settings: HTTP/gRPC e2e.
- Taxonomy: HTTP/gRPC e2e.
- Blog: HTTP/gRPC blog and taxonomy e2e.
- Order: HTTP/gRPC e2e.

Run results:

- `pnpm --filter @nebula/media-service test:unit`: 11 passed.
- `pnpm --filter @nebula/auth-service test -- --runInBand test/redis`: 19 passed.
- Full e2e suite not run because it depends on live services/seeded infra.

Gaps:

- No dedicated HMAC replay tests found.
- No frontend tests found.
- No storage adapter/provider swap tests.
- No worker tests because worker missing.
- Need more tests for forged metadata, guard ordering, order gRPC admin role, product/media integration, refresh replay invalidation.

First high-value tests:

1. S2S missing signature rejected per service.
2. Forged `x-user-id` rejected without S2S.
3. Media gRPC requires S2S.
4. Order status update requires admin.
5. Auth gateway-only gRPC actually verifies HMAC.
6. Refresh-token replay invalidates or is detected.
7. Logout all-devices invalidates old access token.
8. Finalize rejects wrong public/private path.
9. Finalize rejects MIME spoof.
10. Public render rejects pending/queued/blocked/infected.
11. Protected read rejects wrong owner.
12. Strict read TTL/audit behavior.
13. Delete confirm rejects stale plan after new file.
14. Public display-name race/duplicate behavior.
15. Product create web route works.
16. Refresh helper uses POST.
17. Proto export includes order.
18. Compose migration smoke test.
19. Root Prisma migrate all services.
20. Web product/media vertical slice.

## 24. Security Risk Register

| Risk                            | Severity    | Evidence                       | Likely impact                | Recommended mitigation              |
| ------------------------------- | ----------- | ------------------------------ | ---------------------------- | ----------------------------------- |
| Forged user context             | High        | metadata fallback              | user spoofing                | trust forwarded user only after S2S |
| Inconsistent HMAC enforcement   | High        | auth/media/order wiring        | internal route bypass        | wire S2S globally/explicitly        |
| Replay attacks                  | Medium      | minute HMAC, no nonce          | replay within window         | bind path/body, nonce/cache, mTLS   |
| Refresh replay                  | Medium      | mismatch throws only           | stolen token confusion       | clear hash/bump version on replay   |
| Token-version inconsistency     | Medium      | mixed guards                   | stale token acceptance risk  | centralize validation               |
| Role escalation                 | High        | order gRPC status              | unauthorized admin action    | add role guard + tests              |
| Unsafe internal routes          | High        | gatewayOnly without S2S        | public/internal confusion    | enforce S2S before public flags     |
| Media ownership bypass          | Medium      | guard dependency               | cross-user reads             | harden guards + service checks      |
| Public exposure protected media | Medium      | lane checks strong, guard weak | leak if auth bypassed        | guard fix + render tests            |
| Unsafe presigned uploads        | Medium      | no content length bind         | oversized/orphan objects     | size limits, lifecycle cleanup      |
| MIME spoofing                   | Medium      | ContentType trusted            | unsafe content served        | sniff/scan worker                   |
| Path traversal                  | Low         | normalization present          | mostly mitigated             | keep tests                          |
| Stale delete confirmation       | Low         | plan shape compare             | mostly mitigated             | add race tests                      |
| Object/database drift           | Medium      | physical delete then DB delete | orphan/missing records       | transactional outbox/reconciler     |
| Orphaned uploads                | Medium      | abandoned presign              | storage bloat                | cleanup worker                      |
| Signed URL leakage              | Medium      | signed read returns URL        | temporary unauthorized reuse | short TTL, proxy strict files       |
| Missing audit trails            | Medium/High | strict logs only               | weak forensic story          | audit table                         |
| Unsafe logs                     | Medium      | query/settings/auth logs       | data leakage                 | redact logs                         |
| Insecure CORS                   | Medium      | per-service CORS               | exposure if permissive env   | strict origin config                |
| Secrets handling                | Medium      | dev defaults in compose        | prod misconfig risk          | fail closed in prod                 |
| Dev MinIO assumptions           | Medium      | compose defaults               | accidental weak prod         | separate prod config                |
| Missing rate limits             | Low/Medium  | throttler present some         | partial DoS protection       | apply consistently                  |
| Large delete/upload DoS         | Medium      | sync delete limits             | service load                 | queue large operations              |

## 25. Performance and Scalability Review

Strengths:

- Direct-to-storage upload avoids backend bandwidth.
- Prisma schemas include many useful indexes.
- Redis token version checks are cheap.
- gRPC internal calls are reasonable for service boundaries.
- Pagination exists in list APIs.
- Delete planning has count/limit warnings.

Likely bottlenecks:

- Recursive folder planning can be heavy for large libraries.
- Synchronous delete confirm does physical storage operations inline.
- No background worker for scans, variants, cleanup, or reconciliation.
- Next UI is template-heavy and not optimized as a storefront.
- Downstream auth validation calls auth-service, creating dependency/load concentration.
- Prisma query logging can add overhead/noise.
- No benchmarks, load tests, or metrics found.

Premature optimization: polyglot/AI/mobile/Kubernetes roadmap before the core vertical slice is stable.

## 26. Strongest Engineering Work

1. Media lane model: technically meaningful because PUBLIC/PROTECTED/STRICT affect keys, auth, TTL, render eligibility, and metadata. Interview question: "How do you prevent private media from rendering publicly?" Answer with service checks, not just schema.
2. Direct S3 presign/finalize: avoids backend bandwidth and verifies object metadata. Trade-off: orphan cleanup and scanning become necessary.
3. Delete preview/confirm: prevents accidental recursive deletes and stale confirmations. Trade-off: synchronous limits until worker exists.
4. JWT + Redis token versioning: supports global invalidation. Trade-off: services depend on auth/Redis availability.
5. Protobuf/ts-proto contracts: explicit service APIs. Trade-off: proto export/versioning discipline needs improvement.
6. Per-service Prisma ownership: reduces cross-service DB coupling. Trade-off: consistency must be handled through services.
7. Docker backend build: multi-stage workspace-aware image build. Trade-off: migrations/startup still need polish.

## 27. Weaknesses and Unfinished Areas

### Immediate correctness/security blockers

- inconsistent S2S guard enforcement.
- raw user metadata fallback.
- order gRPC status update missing role guard.
- frontend refresh method mismatch.
- frontend product POST route missing.

### Portfolio blockers

- media finalize cannot produce renderable assets without worker/manual promotion.
- product/media/storefront integration missing.
- CI lint red.
- docs overstate planned roadmap unless carefully framed.

### Production blockers

- no scanner/promoter worker.
- no durable audit/encryption for strict media.
- no deployment pipeline.
- weak secret/config hardening.
- no observability/metrics.
- no migration orchestration.
- no full CI integration infra.

### Later improvements

- event/outbox workers.
- provider abstraction.
- block/theme V1.
- tenant model.
- staging deployment.

## 28. Recommended Golden Demo Flow

Strongest demo using current code:

1. Show monorepo and services.
2. Run build.
3. Run media access unit tests.
4. Explain media presign/finalize/read/render/delete from code.
5. Show auth Redis/security tests.
6. Show Docker compose config.

Flagship target flow status:

1. Admin authenticates - Implemented.
2. Verified user context propagates - Partial.
3. Admin requests upload - Implemented.
4. Client uploads directly to S3/MinIO - Implemented by presign contract, not live-verified here.
5. Media finalizes and verifies object - Implemented.
6. Metadata stored - Implemented.
7. Admin views/lists media - Partial.
8. Public media renders - Partial, only READY/CLEAN.
9. Protected/strict inaccessible publicly - Implemented in service logic, needs guard hardening.
10. Admin previews/confirms deletion safely - Implemented for public library.

Next commerce-connected flow:
Admin creates product -> uploads media -> product stores media IDs -> product is published -> Next storefront renders product and optimized media.

Current status: first step is broken in web; product stores URLs, not media IDs; storefront not found; optimized media not implemented.

## 29. Prioritized Implementation Roadmap

| Priority | Item                         | Why                     | Dependencies         | Definition of done                            | Complexity   | Resume claim unlocked           |
| -------- | ---------------------------- | ----------------------- | -------------------- | --------------------------------------------- | ------------ | ------------------------------- |
| P0       | Uniform S2S enforcement      | closes main trust gap   | guard audit          | all internal gRPC rejects unsigned calls      | Medium       | secured service-to-service auth |
| P0       | Remove raw user fallback     | prevents spoofing       | S2S fix              | `x-user-id` trusted only from verified caller | Medium       | verified identity propagation   |
| P0       | Fix order status role        | closes escalation       | roles tests          | non-admin rejected                            | Small        | role-based admin control        |
| P0       | Fix web refresh/product POST | restores UI basics      | proxy/DTO alignment  | create/refresh works                          | Small        | functional admin flow           |
| P0       | CI lint green                | credibility             | formatting/web fixes | CI lint passes                                | Medium       | CI quality gate                 |
| P1       | Media scan/promote worker    | makes finalize usable   | queue/poller         | PENDING -> READY/CLEAN or BLOCKED             | Medium/Large | complete media ingestion        |
| P1       | Orphan cleanup               | controls storage bloat  | lifecycle worker     | expired pending objects cleaned               | Medium       | storage lifecycle management    |
| P1       | Audit table                  | strict lane credibility | schema/events        | read/delete/promote audited                   | Medium       | auditable media operations      |
| P1       | Media tests                  | confidence              | guard fix            | lane/upload/delete tests pass                 | Medium       | tested media platform           |
| P2       | Product-media IDs            | commerce slice          | media V1             | products reference media IDs                  | Medium       | product/media integration       |
| P2       | Admin product UI             | usable demo             | web proxy fixes      | create/edit product works                     | Medium       | admin catalog workflow          |
| P2       | Storefront product page      | visible product         | Next route           | public product with media renders             | Medium       | commerce vertical slice         |
| P3       | Demo/staging docs            | portfolio               | stable flows         | screenshots/video/threat model                | Small        | case-study-ready project        |
| P3       | Docker startup/migrations    | reproducibility         | Prisma scripts       | one command starts seeded stack               | Medium       | reproducible local platform     |
| P3       | Deployment pipeline          | ops credibility         | images/env           | staging deploy documented                     | Large        | deployable service platform     |
| P4       | Block registry V1            | composition phase       | storefront stable    | 8-12 blocks SSR render                        | Large        | curated block system            |
| P4       | Draft/preview/publish        | editor credibility      | registry/schema      | revisions and preview work                    | Large        | content composition workflow    |
| P5       | Orders/payment/inventory     | commerce depth          | product slice        | payment boundary explicit                     | Large        | order lifecycle foundation      |
| P5       | Events/AI/mobile/tenant/k8s  | expansion               | stable core          | separate working services                     | Large        | advanced platform extensions    |

## 30. Architecture Diagrams in Text

### A. Monorepo/service architecture

```text
apps/
  auth user media product settings taxonomy blog order web
packages/
  protos grpc-auth clients config
infra/
  docker-compose + Postgres + Redis + MinIO
```

### B. Auth/user-context propagation

```text
User login -> auth-service -> user-service password/hash
auth-service -> JWT(access tv) + refresh token hash stored in user-service
downstream service -> GrpcTokenAuthGuard -> auth-service ValidateToken
```

### C. JWT user identity versus HMAC service identity

```text
JWT proves: userId/email/role/tokenVersion
HMAC proves: calling service name for internal request
Safe context requires both where user action is propagated by a service
```

### D. Media presign/finalize

```text
Admin/User -> media presign -> signed S3 PUT
Client -> S3/MinIO PUT
Client -> media finalize -> HeadObject -> Media row PENDING/QUEUED
Worker missing -> READY/CLEAN not automatic
```

### E. Public/protected/strict read

```text
PUBLIC -> render by media ID only if READY/CLEAN/public path
PROTECTED -> owner/admin -> signed read URL
STRICT -> owner/admin -> shorter signed URL + logs, no durable audit yet
```

### F. Delete preview/confirm

```text
selection -> normalize paths -> build plan -> warnings + HMAC token
confirm token -> verify expiry/signature -> rebuild plan -> compare -> delete
```

### G. Future product/media/storefront

```text
media upload -> READY/CLEAN media ID -> product references media ID
product publish -> storefront fetches product -> render media via /media/render/:id
```

## 31. Truthful Resume Package

### A. One-line project description

NebulaNV is a TypeScript/NestJS service-oriented ecommerce platform foundation with gRPC contracts, Prisma/PostgreSQL services, Redis-backed JWT auth, Dockerized local infrastructure, and S3-compatible media management.

### B. Short summary

Built a pnpm/Turborepo monorepo for a modular ecommerce platform with NestJS backend services, protobuf/gRPC contracts, Prisma/PostgreSQL persistence, Redis-backed token invalidation, and a Next.js admin workspace. The strongest implemented subsystem is a media service with S3-compatible presigned uploads, finalize-time object verification, public/protected/strict access lanes, signed reads, public render proxying, and delete preview/confirm workflows. The project is a backend platform foundation, with storefront, media processing workers, and production deployment still in progress.

### C. Resume bullets

- Built a pnpm/Turborepo TypeScript monorepo with multiple NestJS services, shared protobuf contracts, shared auth/client packages, and Dockerized Postgres/Redis/MinIO infrastructure.
- Implemented JWT access tokens, refresh-token hashing/rotation, Redis token-version invalidation, and gRPC-based user-service integration.
- Designed a media-service data model and S3-compatible upload flow with presigned PUT URLs, finalize-time `HEAD` verification, metadata persistence, and signed read URLs.
- Implemented public/protected/strict media lanes with separate storage-key strategies, owner/context checks, short strict read TTLs, and public render eligibility checks.
- Added public media render proxying by media ID, blocking pending, non-public, and unclean media from website use.
- Built delete preview/confirm logic for public filemanager operations using signed confirmation tokens and stale-plan detection.
- Created product, taxonomy, settings, blog, and order service foundations with Prisma schemas, HTTP/gRPC APIs, and inter-service clients.
- Added backend unit/e2e test coverage across services, with focused auth Redis/security and media access tests passing locally.

### D. Current safe claims

service-oriented TypeScript backend foundation; gRPC/protobuf contracts; Prisma/PostgreSQL services; Redis JWT invalidation; S3-compatible media flow; Docker local infra; Next.js admin scaffold; media lane design.

### E. Claims unlocked after Media Platform V1

complete media ingestion pipeline; scan/promotion lifecycle; auditable strict media; reliable public render variants; production-ready media tests.

### F. Claims unlocked after commerce vertical slice

functional admin product workflow; product-media integration; storefront product rendering; end-to-end commerce/media demo.

### G. Claims not to make yet

full ecommerce product, production cloud deployment, Kubernetes, mature event-driven architecture, AI recommendations, multi-tenancy, mobile applications, implemented block/theme editor, completed 3D/VR system, proven production scale.

## 32. Interview Preparation

Likely questions and truthful answer points:

1. Why microservices? Discuss bounded domains, but admit auth/S2S still needs hardening.
2. How do services communicate? gRPC/protobuf, shared generated TS, some HTTP for frontend.
3. How is user auth validated downstream? JWT plus auth-service validation and Redis token version.
4. What is the difference between JWT and S2S? JWT proves user; HMAC proves calling service.
5. Where is S2S weak today? inconsistent guard wiring, replay window, no body binding.
6. How does refresh rotation work? bcrypt hash stored in user-service, old token compared, new pair stored.
7. What happens on refresh replay? currently mismatch throws; stronger invalidation needed.
8. Why direct-to-S3 uploads? avoid backend bandwidth; finalize verifies object exists.
9. How do you prevent path traversal? safe filename/folder normalization and lane root enforcement.
10. How do public/protected/strict differ? key strategy, owner/context, TTL, render eligibility.
11. Why are uploaded files not immediately renderable? finalize creates PENDING/QUEUED; worker missing.
12. How does delete confirmation avoid accidental deletion? signed plan token and plan recomparison.
13. Why not store product image URLs directly? current code does; media IDs would be better.
14. What would you fix first? S2S/user context, web product/refresh, media worker.
15. What tests prove this? focused auth/media tests passed; e2e inventory exists but not fully run here.

Difficult follow-ups:

- Why trust `x-user-id` anywhere?
- How would you bind HMAC to RPC method and body?
- How do you revoke leaked signed URLs?
- How do you reconcile S3 objects and DB rows?
- How do you prevent MIME spoofing?
- How do you migrate proto contracts safely?
- How do you run migrations for all services?
- How do you seed a deterministic demo?

Strengthen before discussing confidently: S2S guard wiring, media worker, product/media IDs, CI lint, frontend route mismatches, full dockerized e2e run.

## 33. Final Truth Map

Project:
NebulaNV

Purpose:
A modular ecommerce/admin/media platform foundation with service-oriented NestJS backends, explicit contracts, and a planned richer storefront/composition layer.

Verified current stack:
TypeScript, Node, pnpm, Turborepo, NestJS, Next.js, React, Tailwind, Prisma, PostgreSQL, Redis, MinIO/S3-compatible storage, gRPC, Protocol Buffers, ts-proto, JWT, bcrypt, Docker Compose, GitHub Actions, Jest, ESLint.

Current maturity:
Platform foundation / backend MVP, not production-ready.

Already working:
Monorepo build, backend service builds, protobuf generation setup, Prisma schemas, auth token lifecycle logic, user service, taxonomy/settings basics, product/order/blog foundations, S3 media presign/finalize/read/render/delete logic, Docker Compose validation, focused auth/media tests.

Partially working:
S2S authentication, downstream user context, media lifecycle, protected/strict media hardening, frontend admin flows, product/media integration, CI, Docker startup/migration reproducibility.

Scaffolded:
Media scanning/promotion fields, queue/worker expectations, production release compose, shared config module, broad e2e suites, block/theme architecture docs.

Planned only:
Block/theme editor, mobile apps, AI/recommendations, multi-tenancy, Kubernetes/AWS, event-driven architecture, storefront composition system.

Not found:
Separate API gateway service, implemented storefront, media processing worker, malware scanner, thumbnail/variant generator, durable strict audit table, storage adapter interface, Kubernetes/Helm manifests, frontend tests.

Live/local status:
`docker compose config` passed; `pnpm -w turbo build` passed; focused media and auth tests passed; `pnpm -w turbo lint` failed; full service startup and full e2e suite were not run.

Repository:
Dirty before review with modified package manifests/lockfile; no source changes made by this audit.

Strongest subsystem:
Media/filemanager backend.

Strongest complete workflow:
Auth token lifecycle logic and media access-class unit workflow are the strongest verified workflows; media ingestion is architecturally strong but incomplete without promotion worker.

Strongest architectural decision:
Separating user identity, service identity, media metadata, and object storage concerns.

Biggest technical weakness:
Inconsistent S2S/user-context enforcement.

Biggest product weakness:
No complete product-media-storefront vertical slice.

Most urgent security concern:
Forged propagated user/service context where S2S is not enforced.

Most urgent integration concern:
Next.js product create and auth refresh routes are mismatched with backend/API behavior.

Next milestone:
Security/integration hardening plus Media Platform V1 scan/promotion/read/render/delete demo.

What it truthfully proves on a resume:
The developer can design and implement a serious TypeScript/NestJS backend platform foundation with gRPC contracts, Prisma/PostgreSQL services, Redis-backed auth invalidation, Dockerized infrastructure, and non-trivial S3-compatible media/filemanager workflows, while still needing to finish production hardening and the flagship commerce UI slice.

## 34. Evidence Appendix

| Claim                                 | File path(s)                                                                 | Relevant class/function/route/RPC/test              | Confidence |
| ------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------- | ---------- |
| pnpm monorepo exists                  | `pnpm-workspace.yaml`, `package.json`                                        | workspaces `apps/*`, `packages/*`                   | High       |
| Turbo pipelines exist                 | `turbo.json`                                                                 | build/lint/check-types/test                         | High       |
| Build passes                          | command result                                                               | `pnpm -w turbo build`                               | High       |
| Lint fails                            | command result                                                               | `pnpm -w turbo lint`                                | High       |
| Type check limited but passes         | command result                                                               | `pnpm -w turbo check-types`                         | High       |
| Docker compose parses                 | `docker-compose.yml`                                                         | `docker compose config`                             | High       |
| Auth JWT lifecycle exists             | `apps/auth-service/src/auth/auth.service.ts`                                 | login, refreshTokens, logout                        | High       |
| Redis token versioning exists         | `apps/auth-service/src/auth/redis/auth-redis.service.ts`                     | token version/disabled keys                         | High       |
| User owns refresh hash                | `apps/user-service/prisma/schema.prisma`                                     | `User.refreshToken`                                 | High       |
| Role decorators exist                 | `packages/grpc-auth/src/roles.decorator.ts`                                  | `Roles`, `RoleAtLeast`                              | High       |
| Public/internal decorators exist      | `packages/grpc-auth/src/public.decorator.ts`                                 | `Public`, `InternalOnly`, `RequireUserId`           | High       |
| S2S HMAC helpers exist                | `packages/grpc-auth/src/s2s.crypto.ts`, `s2s.guard.ts`                       | `signS2S`, `S2SGuard`                               | High       |
| S2S enforcement inconsistent          | service modules/main files                                                   | missing/partial `S2SGuard` wiring                   | High       |
| Raw propagated user risk exists       | `packages/grpc-auth/src/metadata.ts`, `grpc-token-auth.guard.ts`             | `resolveCtxUser`, comments                          | High       |
| Media model is substantial            | `apps/media-service/prisma/schema.prisma`                                    | `Media`, `AccessClass`, `MediaStatus`, `ScanStatus` | High       |
| Presigned uploads exist               | `apps/media-service/src/media.service.ts`                                    | `presignUpload`, S3 `PutObjectCommand`              | High       |
| Finalize verifies object              | `apps/media-service/src/media.service.ts`                                    | `HeadObjectCommand`, `finalizeUpload`               | High       |
| Finalize leaves queued                | `apps/media-service/src/media.service.ts`                                    | `status: PENDING`, `scanStatus: QUEUED`             | High       |
| Reads require ready/clean             | `apps/media-service/src/media.service.ts`                                    | `createReadUrl`, `openPublicRenderStream`           | High       |
| Public render route exists            | `apps/media-service/src/media-render.controller.ts`                          | `GET /media/render/:id`                             | High       |
| Delete preview/confirm exists         | `apps/media-service/src/media.service.ts`                                    | delete token/plan/confirm methods                   | High       |
| Worker/scanner not found              | repo search                                                                  | no worker app, no scanner dependency                | High       |
| Product stores URLs not media IDs     | `apps/product-service/prisma/schema.prisma`                                  | `thumbnailUrl`, `ProductGalleryImage.url`           | High       |
| Product validates taxonomy by service | `apps/product-service/src/product/product.service.ts`                        | `assertCategoryExists`                              | High       |
| Order status gRPC role gap            | `apps/order-service/src/order/grpc/order-grpc.controller.ts`                 | `UpdateOrderStatus`                                 | High       |
| Proto generation exists               | `scripts/proto-gen.mjs`                                                      | `protoc`, `ts-proto`                                | High       |
| Order proto export missing            | `packages/protos/index.ts`, `packages/protos/generated/order.ts`             | generated but not re-exported                       | High       |
| Next app builds                       | command result                                                               | Next build route output                             | High       |
| Web refresh mismatch                  | `apps/web/src/lib/auth/refresh.ts`, `apps/web/app/api/auth/refresh/route.ts` | GET helper vs POST route                            | High       |
| Web product create mismatch           | `apps/web/app/api/products/route.ts`, `AddProduct.client.tsx`                | no POST route; sends `content`                      | High       |
| Storefront not found                  | `apps/web/app`                                                               | panel routes only found                             | Medium     |
| Block/theme planned only              | `docs/frontend/block-and-theme-system.md`                                    | status planned                                      | High       |
| Production deploy incomplete          | `.github/workflows`, `docker-compose.release.yml`                            | no deploy workflow, release compose scaffold        | High       |
| Resume media bullet supported         | media service/schema/tests                                                   | presign/finalize/read/render/delete                 | High       |
| Resume auth bullet supported          | auth/user/redis tests                                                        | token lifecycle/security tests                      | High       |
| Resume full ecommerce claim unsafe    | web/product/media gaps                                                       | missing storefront/product-media flow               | High       |
