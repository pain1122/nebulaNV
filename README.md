# 🌌 NebulaNV

![Repo Size](https://img.shields.io/github/repo-size/pain1122/nebulaNV?color=green)
![Last Commit](https://img.shields.io/github/last-commit/pain1122/nebulaNV?color=orange)
![Stars](https://img.shields.io/github/stars/pain1122/nebulaNV?color=yellow)
![Forks](https://img.shields.io/github/forks/pain1122/nebulaNV?color=purple)
![License](https://img.shields.io/github/license/pain1122/nebulaNV?color=blue)

**Author:** Salar Abbasi — 25, Iran  
**Experience:** Senior Software Engineer since 19  
**Education:** Computer Science Diploma

NebulaNV is a **modern polyglot e-commerce monorepo**, designed for modular scalability, cloud-native deployments, and future-ready 3D & AI integrations.  
It evolves from a basic service-oriented architecture to a **multi-tenant, polyglot, AI-driven ecosystem** — powered by **NestJS, Go, Rust, and Python**.

---

## 🚀 Core Highlights

- 🧩 **Microservices Architecture:** Modular apps (user, auth, product, blog, order, settings, media)
- 🧠 **State-Service:** Centralized cache, session, and sync layer (Go + Redis + NATS)
- 💾 **Multi-Database:** PostgreSQL, MongoDB, Redis, ClickHouse
- 🌐 **Web Applications:** Next.js + Tailwind for the public SEO website; Vite React SPA for the admin panel
- 📱 **Mobile Apps:** React Native / Flutter (shared gRPC APIs)
- 🎨 **Media System:** Uploads, resizing, watermarking, anti-theft protection
- 🧠 **AI & Analytics:** Python-based recommendation and insights services
- 🕶 **VR/3D Support:** React Three Fiber + Rust engine for immersive experiences
- ☁️ **Cloud Infrastructure:** AWS (EKS, RDS, S3, MSK, ElastiCache), Kubernetes, Helm
- 🔐 **Security First:** HMAC signing, JWT rotation, token versioning, zero-trust networking

---

## 🗂 Media, Storage & Polyglot Boundaries

NebulaNV's media layer is intentionally split between **file storage**, **security policy**, and **heavy processing**.

### Media-Service Is The Security Boundary

`media-service` is the app-facing authority for media privacy and file access. The admin panel and public web app should talk to `media-service`, not directly to permanent storage credentials.

`media-service` owns:

- media metadata and database records
- owner/user relationships
- `PUBLIC`, `PROTECTED`, and `STRICT` access classes
- upload authorization
- short-lived signed upload/read URLs
- admin file-manager actions: list, search, upload, finalize, read, delete
- future edit/variant records for thumbnails, optimized images, and edited versions

### Object Storage Roles

SeaweedFS now serves local Media through the existing S3-compatible boundary. The 302-object copy, scoped access, browser-style upload CORS, persistence, processing, cropped derivatives, metadata and restart recovery are accepted. MinIO is stopped with retained data for guarded rollback, not ordinary startup.

The unused Supabase CLI scaffold is retired. Media-service remains the privacy and metadata authority; storage holds bytes behind its existing S3-compatible boundary.

Cloud provider selection and CDN integration remain deferred to F9. See [current-focus](docs/current-focus.md) and the [Seaweed setup](docker/seaweedfs/README.md) for actual transition status.

For the prepared Compose profile, the active storage endpoint split is:

```env
MEDIA_S3_INTERNAL_ENDPOINT=http://seaweed:8333
MEDIA_S3_PUBLIC_ENDPOINT=http://127.0.0.1:19000
```

### Access Classes

- `PUBLIC`: safe public assets after validation/promotion; suitable for CDN/public URLs.
- `PROTECTED`: authenticated or owner-scoped assets; served through short-lived signed URLs.
- `STRICT`: sensitive assets; prefer very short-lived URLs, backend-mediated access, and audit logging.

### Polyglot Responsibilities

- **TypeScript/NestJS:** request-path APIs, auth, media policy, service contracts, admin/public app integration.
- **Go:** state-service, Redis/NATS coordination, search/audit services, and production workers such as media-worker, showroom-asset-worker, and streaming-worker.
- **Rust:** performance-critical 3D/media tooling, WebAssembly helpers, GLB/GLTF processing, scene/geometry optimization, and browser/mobile showroom acceleration.
- **Python:** AI, recommendations, analytics, tagging, and offline intelligence workflows.

The guiding rule is: **storage holds bytes, media-service enforces access, workers process heavy jobs, and the frontend never receives permanent storage credentials.**

---

## 🛠 Tech Stack

| Layer                  | Technology                                                                                                                                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Backend**            | Node.js ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square), NestJS, TypeScript, Go, PostgreSQL ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=flat-square), gRPC     |
| **Frontend**           | Next.js ![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square), Tailwind CSS ![Tailwind](https://img.shields.io/badge/Tailwind-38B2AC?style=flat-square), React Query, NextAuth              |
| **Mobile**             | React Native (Expo) / Flutter 3+, gRPC bridge, SQLite Offline Cache                                                                                                                                             |
| **Infrastructure**     | Docker ![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square), Kubernetes ![K8s](https://img.shields.io/badge/Kubernetes-326CE5?style=flat-square), AWS (EKS, S3, MSK, RDS, ElastiCache), Helm |
| **Messaging & Events** | Kafka, NATS, Redis Streams                                                                                                                                                                                      |
| **Auth & Security**    | JWT, S2S HMAC, OAuth2 (future), token versioning                                                                                                                                                                |
| **Monitoring**         | OpenTelemetry, Prometheus, Grafana, AWS CloudWatch                                                                                                                                                              |
| **Developer Tools**    | TurboRepo, ts-proto, Prisma, Jest, ESLint, Prettier                                                                                                                                                             |

---

## Roadmap (backend-ecommerce-first rebaseline)

The detailed source of truth is [`TODO-ALTERNATIVE.md`](TODO-ALTERNATIVE.md).
The active execution checklist is [`docs/current-focus.md`](docs/current-focus.md).

| Order               | Phase           | Current intent                                                           |
| ------------------- | --------------- | ------------------------------------------------------------------------ |
| Complete            | F0-F3           | Preserve media/security/quality foundations and the gateway              |
| Paused after R5     | F4              | Preserve dormant authority/Realm Auth/V3 work; resume after F9           |
| 1                   | D1              | Complete and harden the Product/catalog backend                          |
| 2                   | D2              | Complete cart, idempotent demo checkout, and Order backend               |
| B0                  | Backend release | Prove ecommerce through gateway APIs without a frontend                  |
| 3                   | F7, D3          | When supplied, integrate the Vite admin and prove operator workflows     |
| Non-gating after B0 | D4              | Build a storefront only from concrete client requirements                |
| 5                   | M2              | Add CMS, composition, and content                                        |
| 6                   | F5              | Add bounded media processing and delivery; file-manager work starts here |
| 7                   | M5              | Deliver a bounded 3D showroom with proven jobs                           |
| 8                   | M3S             | Add demonstrated advanced media and storage compatibility only           |
| 9                   | F8, F6, D5      | Add mobile commerce and evidence-backed module compatibility             |
| 10                  | AI0, M7         | Add evaluated default-site AI/RAG and analytics                          |
| 11                  | F9              | Prove the primary cloud and actual storage topology                      |
| 12                  | F4              | Resume at R6.1 and complete tenant/realm isolation                       |

M3S keeps media-service as policy authority and SeaweedFS as local storage. It uses
only required S3-compatible operations until F9 selects and proves the primary
cloud. General M6 infrastructure and commercial SaaS expansion remain deferred.

---

## ⚡ Getting Started

The native toolchain target is Node `24.22.2` from `.node-version` with pnpm
`10.17.1`; [Setup.md](Setup.md) shows the session-local Windows selection.
D3 Windows runtime/native/tooling verification passes; the grouped D8 Linux image
rollout remains pending. The source target does not update running containers.

The accepted setup is the prepared local workspace; current-snapshot hosted CI
and clean-machine B0 setup remain pending. Existing provisioned workspaces use
images already loaded and the persistent local Seaweed selection:

```powershell
docker compose up -d --no-build
pnpm backend:health
```

Follow [the boot guide](docs/architecture/local-dev-and-docker-boot.md) and
[storage procedure](docker/seaweedfs/README.md) for actual prerequisites and
recovery. A fresh clone does not contain private storage settings or the ignored
Compose selection. B3 must verify that bootstrap before it becomes a release
recipe; the bare base Compose file remains explicit MinIO rollback. Do not pair
container startup with a native process on the same port. The adopted
[current focus](docs/current-focus.md) supplies the scoped test/build sequence.

---

## 📁 Directory Overview

```
/apps
  ├── auth-service        # JWT, refresh, token versioning
  ├── user-service        # Profiles, roles, CRUD
  ├── product-service     # Product, category, specs
  ├── order-service       # Cart, checkout, invoices
  ├── blog-service        # Posts, SEO, metadata
  ├── settings-service    # KV store, app config
  ├── taxonomy-service    # Manage grouping and labeling post types
  ├── media-service       # Upload, watermark, CDN
  └── web                 # Next.js (admin + public)

/packages
  ├── protos              # .proto files + ts-proto outputs
  ├── config              # Env & schema validation
  ├── clients             # gRPC clients per service
  └── grpc-auth           # Cross service auth handling
```

---

## 👨‍💻 About the Author

**Salar Abbasi**  
🚀 Full-stack engineer & architecture enthusiast  
🧠 Passionate about scalable systems, AI-driven development, and modular design  
🎨 Combining software engineering with 3D & game-dev experience  
🇮🇷 Based in Iran — building globally

---

## 📬 Contact

- **GitHub:** [pain1122](https://github.com/pain1122)
- **Email:** [abbasisalar24@gmail.com](mailto:abbasisalar24@gmail.com)

---

## 🧭 Vision

> “NebulaNV isn’t just an e-commerce platform — it’s a living ecosystem.”  
> Built to scale across services, devices, and realities — from backend APIs to immersive 3D environments — with an architecture that grows smarter, faster, and stronger with every phase.
