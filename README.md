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
- 🌐 **Web Application:** Next.js 15 + Tailwind CSS (SSR, SEO, Admin & Public)
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

### Supabase, MinIO, and AWS Roles

Supabase Storage is planned as the preferred managed/self-contained file backend because it has a clean dashboard UI, useful storage tooling, and an S3-compatible API. It is **not** treated as the final privacy authority for NebulaNV.

MinIO is the local development S3-compatible replacement. It lets the project test AWS-style object storage without needing an AWS account.

AWS S3 is the future production-compatible target. The media contract should stay S3-compatible so MinIO, Supabase Storage S3, and AWS S3 can all sit behind the same media-service policy layer.

The intended endpoint split is:

```env
MEDIA_S3_INTERNAL_ENDPOINT=http://minio:9000
MEDIA_S3_PUBLIC_ENDPOINT=http://127.0.0.1:9000
```

For Supabase:

```env
MEDIA_S3_INTERNAL_ENDPOINT=https://project-ref.storage.supabase.co/storage/v1/s3
MEDIA_S3_PUBLIC_ENDPOINT=https://project-ref.storage.supabase.co/storage/v1/s3
```

For AWS/CDN later:

```env
MEDIA_S3_INTERNAL_ENDPOINT=https://s3.amazonaws.com
MEDIA_S3_PUBLIC_ENDPOINT=https://cdn.example.com
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

| Layer | Technology |
|-------|-------------|
| **Backend** | Node.js ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square), NestJS, TypeScript, Go, PostgreSQL ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=flat-square), gRPC |
| **Frontend** | Next.js ![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square), Tailwind CSS ![Tailwind](https://img.shields.io/badge/Tailwind-38B2AC?style=flat-square), React Query, NextAuth |
| **Mobile** | React Native (Expo) / Flutter 3+, gRPC bridge, SQLite Offline Cache |
| **Infrastructure** | Docker ![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square), Kubernetes ![K8s](https://img.shields.io/badge/Kubernetes-326CE5?style=flat-square), AWS (EKS, S3, MSK, RDS, ElastiCache), Helm |
| **Messaging & Events** | Kafka, NATS, Redis Streams |
| **Auth & Security** | JWT, S2S HMAC, OAuth2 (future), token versioning |
| **Monitoring** | OpenTelemetry, Prometheus, Grafana, AWS CloudWatch |
| **Developer Tools** | TurboRepo, ts-proto, Prisma, Jest, ESLint, Prettier |

---

## 🏗 Roadmap (v2.4)

| Phase | Status | Key Focus |
|--------|---------|------------|
| **1 – Foundation & Infrastructure** | ✅ Done | Monorepo, Docker, CI/CD, shared packages |
| **2 – Core Services (MVP)** | ✅ Done | Auth, User, Product, Order, Blog, Media |
| **3 – Frontend MVP + Media System** | 🔄 In Progress | Admin panel, storefront, media manager |
| **4 – State-Service + Multi-DB + Polyglot** | ⏳ Planned | Redis cluster, Go state-service, multi-DB setup |
| **5 – Web Application Launch** | ⏳ Planned | Next.js full app with SEO, SSR, dashboard |
| **6 – Product Feature Expansion** | ⏳ Planned | Variants, filters, FTS search, discounts, invoices |
| **7 – VR Showroom & 3D Support** | ⏳ Planned | React Three Fiber, WebXR, Rust 3D engine |
| **8 – Mobile Applications** | ⏳ Planned | React Native/Flutter, offline mode, notifications |
| **9 – Event-Driven Refactor** | ⏳ Planned | Kafka/NATS backbone, observability dashboards |
| **10 – Multi-Tenant Conversion** | ⏳ Planned | Tenant IDs, isolated schemas, subdomain routing |
| **11 – AI & Polyglot Expansion** | ⏳ Planned | AI recommender, Python analytics, Go search |
| **12 – Security & Compliance** | ⏳ Planned | Vault, GDPR, zero-trust network, Snyk CI |

---

## ⚡ Getting Started

```bash
# Clone the repo
git clone https://github.com/pain1122/nebulaNV.git
cd nebulaNV

# Install dependencies
pnpm install

# Start local infrastructure
docker compose up -d

# Run backend service (example)
pnpm run dev:auth

# Run tests
pnpm -w turbo test
```

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
Built to scale across services, devices, and realities — from backend APIs to immersive 3D environments — with an architecture that grows smarter, faster, and stronger with every phase.
