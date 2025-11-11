# ⚙️ NebulaNV — Local Development & Docker Setup

![OS](https://img.shields.io/badge/Platform-Windows%2011%20%7C%20WSL2-blue?style=flat-square)
![Toolchain](https://img.shields.io/badge/Toolchain-Node.js%2022%20%7C%20pnpm%209%20%7C%20Docker%20BuildKit-green?style=flat-square)
![Editor](https://img.shields.io/badge/Editor-VS%20Code-blueviolet?style=flat-square)
![Database](https://img.shields.io/badge/Database-PostgreSQL%2017-lightblue?style=flat-square)

**Author:** Salar Abbasi  
**Project:** NebulaNV Monorepo  
**Stack:** NestJS microservices • PostgreSQL • Prisma ORM • TurboRepo • pnpm • Docker

---

## 🧩 1. Prerequisites

| Tool | Version | Notes |
|------|----------|-------|
| **Node.js** | ≥ 22.x (LTS) | Install via `nvm` or Node installer |
| **pnpm** | ≥ 9.0 | `corepack enable && corepack prepare pnpm@10.17.1 --activate` |
| **Docker Desktop** | Latest | Enable **WSL2 backend** |
| **PostgreSQL** | via Docker | Auto-managed via `docker-compose.yml` |
| **VS Code** | Latest | Recommended editor with workspace configs |

---

## ⚙️ 2. Environment Configuration

NebulaNV uses two layers of environment configuration:

1. **Root `.env`** → Shared variables for all services (ports, secrets, gRPC registry).  
2. **Per-service `.env`** → Database URLs & unique gateway secrets.

### 🏠 Root `.env`
Located at project root:

```ini
# ⚙️ Docker & Build
COMPOSE_BAKE=true
DOCKER_BUILDKIT=1
COMPOSE_DOCKER_CLI_BUILD=1

# 🌍 Environment
NODE_ENV=development
PUBLIC_MODE=OPEN

# 🔐 Security
S2S_SECRET=:9T>X1R<_@_Dq*Tz@7l6Z?=&p75h£P~l
GATEWAY_HEADER=x-gateway-sign

# 🧩 gRPC Registry
USER_GRPC_URL=127.0.0.1:50051
AUTH_GRPC_URL=127.0.0.1:50052
PRODUCT_GRPC_URL=127.0.0.1:50053
SETTINGS_GRPC_URL=127.0.0.1:50054

# 🌐 HTTP Ports
USER_HTTP_PORT=3100
AUTH_HTTP_PORT=3001
PRODUCT_HTTP_PORT=3003
SETTINGS_HTTP_PORT=3010

# 🔑 JWT Tokens
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
JWT_ACCESS_SECRET=FqjGH02`9X<c@u9@?AN0+YL>.AWZ7Iq3
JWT_REFRESH_SECRET=PwBeMgs!+lbL9|Cl2n357KZu?</v^bs9
```

### 🧱 Service `.env` (example)
`apps/user-service/.env`
```ini
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nebula_users?schema=public
SHADOW_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=shadow_users"
GATEWAY_SECRET=L*vqvwy7R1>*$5\pc£AxYr,2aN3Atf<!
SVC_NAME=user-service
```

Repeat for each service (`auth`, `product`, `settings`) using unique `GATEWAY_SECRET`s.

---

## 📦 3. Install Dependencies

```bash
pnpm install
```

This installs workspace packages for all microservices and shared modules under `/packages`.

---

## 🐘 4. Database Setup

### 4.1 Start PostgreSQL

```bash
docker compose up -d postgres
```

### 4.2 Apply Prisma Migrations

Run migrations for each service:

```powershell
docker compose run --rm `
  -e DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nebula_settings?schema=public" `
  settings-service `
  npx prisma migrate dev --name init --schema apps/settings-service/prisma/schema.prisma
```

Repeat for `user-service` and `product-service`.

---

## 🏗️ 5. Build All Services

```bash
docker compose build --no-cache
```

💡 Tip:  
If you see `load local bake definitions`, reset your builder:

```powershell
docker buildx rm default --force
docker buildx create --use --name default
```

---

## 🚀 6. Run the Stack

```bash
docker compose up -d
```

All services will start automatically after PostgreSQL passes its health check.

---

## 🧠 7. Local Dev (Hot Reload)

Run each service with watch mode:

```bash
pnpm -C apps/auth-service start:dev
pnpm -C apps/user-service start:dev
pnpm -C apps/settings-service start:dev
pnpm -C apps/product-service start:dev
```

---

## 🔍 8. Health Checks

| Service | Port | URL |
|----------|------|-----|
| **Auth** | 3001 | [http://localhost:3001/health](http://localhost:3001/health) |
| **User** | 3100 | [http://localhost:3100/health](http://localhost:3100/health) |
| **Product** | 3003 | [http://localhost:3003/health](http://localhost:3003/health) |
| **Settings** | 3010 | [http://localhost:3010/health](http://localhost:3010/health) |

---

## 🔐 9. Security Notes

- `.env` files are git-ignored by default.  
- Use **same S2S_SECRET** across all services for inter-service auth.  
- Generate fresh JWT secrets for production.  
- Never expose `.env` files in CI/CD logs.

---

## ⚡ 10. Optimization Tips

| Action | Purpose |
|---------|----------|
| `COMPOSE_BAKE=true` | Enables parallel, incremental Docker builds |
| `pnpm fetch` | Pre-caches dependencies faster |
| `--mount=type=cache,id=pnpm-store` | Persists pnpm store across builds |
| `pnpm prune --prod` | Trims final image size |

---

## 🧱 11. Troubleshooting

| Issue | Fix |
|-------|-----|
| Prisma errors | Check DB URL or rebuild Prisma client |
| Module not found | Run `pnpm build` |
| Port conflict | Edit `.env` ports |
| Missing `dist` folder | Ensure `nest build` completed before Docker copy |

---

**© 2025 Salar Abbasi – NebulaNV Project**  
Built with ❤️ using NestJS, TypeScript, Prisma, and Docker.
