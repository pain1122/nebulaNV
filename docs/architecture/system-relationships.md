# System Relationships

Last reviewed: 2026-06-17

Purpose: describe valid service ownership and communication paths. This file is a system map, not a full service manual.

## Core Rule

Each service owns its own data and business boundary. Other services must use HTTP/gRPC contracts, not direct Prisma/database access.

## Service Ownership Map

| Service | Owns | Does Not Own |
| --- | --- | --- |
| auth-service | JWT issuance, refresh, logout/revocation, token validation, auth gRPC | User profile persistence, product/media/order data |
| user-service | Users, profiles, roles, user persistence | Token issuance/revocation |
| settings-service | Safe runtime app/business/frontend defaults and admin-managed settings | Secrets, auth policy, trust boundaries, DB URLs, storage credentials |
| taxonomy-service | Taxonomy/category/tag/grouping records | Product/blog ownership |
| product-service | Products, product images relation, catalog behavior | Media bytes, taxonomy source records |
| blog-service | Blog posts, blog taxonomy relation, editorial content | Media bytes, global taxonomy source records |
| order-service | Cart, checkout, orders, order status flow | Product catalog authority, auth/user records |
| media-service | Media metadata, access classes, signed URLs, upload/read authorization | Product/blog ownership, Supabase/AWS as privacy authority |
| web | UI/admin/storefront consumption | Backend policy enforcement |

## Runtime Infrastructure

| Infra | Used For | Notes |
| --- | --- | --- |
| Postgres | Service databases | Each service uses its own DB/schema target. |
| Redis | Auth/session/token version behavior now; broader state later | State-service may own broader Redis usage later. |
| MinIO | Local S3-compatible object storage | Future-compatible with Supabase S3 and AWS S3. |
| Supabase Storage | Planned filemanager/storage provider | Must not replace media-service policy. |
| AWS S3 | Future production object storage | Same S3-compatible boundary as MinIO/Supabase. |

## Valid Communication Paths

| Caller | Target | Protocol | Why |
| --- | --- | --- | --- |
| auth-service | user-service | gRPC | Validate/create/read auth-facing user data. |
| user-service | auth-service | gRPC | Guard token validation. |
| settings consumers | settings-service | gRPC/HTTP where exposed | Read safe app/business defaults. |
| product-service | settings-service | gRPC | Settings-backed product defaults/config. |
| product-service | taxonomy-service | gRPC | Product taxonomy integration. |
| blog-service | settings-service | gRPC | Blog/site defaults/config. |
| blog-service | taxonomy-service | gRPC | Blog taxonomy integration. |
| order-service | product-service | gRPC | Product/cart/order validation. |
| order-service | settings-service | gRPC | Order defaults/config. |
| media-service | auth-service | gRPC | Guard token validation. |
| frontend/admin | gateway/services | HTTP | User-facing/admin actions. |

## Forbidden Paths

- No service imports another service's Prisma client.
- No service directly queries another service's database.
- No storage provider decides app privacy.
- No settings key defines secrets, auth policy, role hierarchy, or internal trust.
- No frontend bypasses media-service for protected/private media access.
- No metadata role claim is trusted over signed JWT validation.

## Auth And S2S Rules

- User identity comes from signed JWT validation.
- S2S identity comes from HMAC metadata validation.
- gRPC protected calls should enforce S2S and then user/role policy where needed.
- Spoofed `x-user-role` or `x-user-id` must not override signed token payload.

## Media Relationship

- Public admin filemanager assets use human-readable keys under `MEDIA_PUBLIC_FOLDER`.
- Protected/strict assets use feature-owned flows and opaque storage keys.
- MinIO/Supabase/AWS store bytes only.
- Media-service owns metadata, signed URLs, and access checks.

## Future Boundaries

- Go workers may process media/showroom/streaming/state tasks but should not own media access policy.
- Rust may accelerate 3D/media/browser/mobile paths later but should not own business policy.
- Python may own analytics/AI/recommendation workflows later but should not own core transactional authority.
