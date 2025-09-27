NebulaNV — Local Development (Windows + VS Code)

Monorepo with pnpm workspaces, NestJS microservices (auth, user, settings, product), local PostgreSQL, Prisma, and shared packages imported via @nebula/* aliases.

Prerequisites

Node.js 22.x

pnpm v9+

corepack enable
corepack prepare pnpm@latest --activate


Docker Desktop (WSL2 backend enabled)

VS Code (recommended)

Path aliases: This repo already uses @nebula/* (e.g., @nebula/clients, @nebula/logger, @nebula/proto, @nebula/config, @nebula/shared-types).
Jest configs for user-service and settings-service and the root tsconfig.base.json are already wired — you don’t need to change them here.

1) Install dependencies
pnpm install

2) Environment setup

Copy example envs and customize:

Copy-Item apps\auth-service\.env.example apps\auth-service\.env -Force
Copy-Item apps\user-service\.env.example apps\user-service\.env -Force
Copy-Item apps\settings-service\.env.example apps\settings-service\.env -Force
Copy-Item apps\product-service\.env.example apps\product-service\.env -Force

2.1 Generate secrets

Create one shared S2S secret (same for all services) and random JWT secrets where applicable:

Open each .env you just created:

Use the same $S2S for the gateway/server-to-server signing secret (e.g., S2S_SECRET or GATEWAY_SIGN_SECRET) in all services.

auth-service: set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET

Ensure the PORT matches your expectations:

auth-service → 3001

user-service → 3100

settings-service → 3005 (if your repo uses a different port, keep that)

product-service → 3003

Set a local DATABASE_URL (next section).

Typical variables (names may vary based on your .env.example):

NODE_ENV=development
PORT=3001|3100|3005|3003
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nebula?schema=public

# S2S (same across ALL services)
S2S_SECRET=<paste $S2S>

# Auth-only
JWT_ACCESS_SECRET=<random>
JWT_REFRESH_SECRET=<random>

# Optional
GATEWAY_HEADER=x-gateway-sign
SVC_NAME=<service-name>

3) Database (Docker) + Prisma
3.1 Start Postgres

From the repo root (where docker-compose.yml is):

docker compose up -d postgres


Confirm it’s running:

docker ps

3.2 Set DATABASE_URL

Use one database for all services, Prisma will isolate via schema:

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nebula?schema=public

3.3 Generate Prisma client + run migrations
# Generate Prisma clients
pnpm -C apps\user-service prisma:gen
pnpm -C apps\product-service prisma:gen
pnpm -C apps\settings-service prisma:gen

# Apply migrations (pick one approach consistently)
pnpm -C apps\user-service prisma:migrate:dev
pnpm -C apps\product-service prisma:migrate:dev
pnpm -C apps\settings-service prisma:migrate:dev


Prefer immutable apply in CI/CD:

pnpm -C apps\user-service prisma:migrate:deploy
pnpm -C apps\product-service prisma:migrate:deploy
pnpm -C apps\settings-service prisma:migrate:deploy

4) Build shared packages (in order)

Your services import internal packages via @nebula/*. Build them first so runtime imports resolve cleanly.

Common order:

# If you use turbo, this will chain everything correctly:
pnpm build

# Or explicitly:
pnpm -C packages\protos build
pnpm -C packages\clients build
pnpm -C packages\config build
pnpm -C packages\logger build
pnpm -C packages\shared-types build

# If you have protobuf codegen at root:
pnpm run proto:gen


If a service complains about missing @nebula/..., re-run pnpm install (root) and pnpm build to refresh package outputs.

5) Start services

You can run with Docker (where Dockerfiles exist) or locally (watch mode).

Option A — Docker
# Build images (first run or after changes)
docker compose build user-service auth-service product-service
# (Add settings-service here if you’ve added it to compose)

# Start containers
docker compose up -d user-service
docker compose up -d auth-service
docker compose up -d product-service
# docker compose up -d settings-service   # once added to compose


If settings-service isn’t in docker-compose.yml yet, run it in local mode for now.

Option B — Local dev (watch mode)

Open 4 terminals in VS Code:

pnpm -C apps\auth-service start:dev
pnpm -C apps\user-service start:dev
pnpm -C apps\settings-service start:dev
pnpm -C apps\product-service start:dev


Because you already have @nebula/* aliases wired, start:dev should include -r tsconfig-paths/register in each service’s script.

6) Health checks

GET http://localhost:3001/health (auth-service)

GET http://localhost:3100/health (user-service)

GET http://localhost:3005/health (settings-service)

GET http://localhost:3003/health (product-service)

7) Basic auth flow (Postman)

Register
POST http://localhost:3001/auth/register

{ "email": "me@example.com", "password": "StrongPass!23" }


Login
POST http://localhost:3001/auth/login → copy access_token.

Authenticated requests
Add header Authorization: Bearer <access_token> and call:

GET http://localhost:3001/auth/me

GET http://localhost:3100/users

POST http://localhost:3003/products (may require admin/role seeds)

Logout
POST http://localhost:3001/auth/logout

{ "allDevices": false }


or target a specific session:

{ "refreshToken": "<refresh-token>" }

8) Troubleshooting

Cannot find module @nebula/...
Build packages and restart service:

pnpm build
pnpm -C apps\<service> start:dev


Prisma connection errors

Ensure Postgres is running: docker ps

Check DATABASE_URL in each .env

Re-run prisma:gen + prisma:migrate:dev

Port in use
Change PORT in the service .env and update your Postman targets.

Container logs

docker logs -f auth-service
docker logs -f user-service
docker logs -f product-service
# docker logs -f settings-service

9) (Optional) Add settings-service to Docker Compose

If not present yet, add a stanza:

  settings-service:
    build:
      context: .
      dockerfile: apps/settings-service/Dockerfile
    env_file:
      - apps/settings-service/.env
    ports:
      - "3005:3005"
    depends_on:
      - postgres


Use a standard NestJS Dockerfile (Node 22, build to dist, run start:prod).

10) Script reference

Root (Turbo-aware):

pnpm dev           # if configured to run all services
pnpm build         # builds packages and services in topo order
pnpm lint
pnpm proto:gen     # protobuf codegen if applicable


Per service (example user-service):

pnpm -C apps\user-service start:dev
pnpm -C apps\user-service build
pnpm -C apps\user-service test
pnpm -C apps\user-service prisma:migrate:dev

11) Security

S2S secret: one shared value across all services.

JWT secrets: strong randoms; do not commit .env.

Rotate secrets when promoting to staging/production.

12) Next steps

Add/verify role seeding (admin) for protected endpoints.

Tighten CI (lint → typecheck → build → prisma migrate deploy).

Add service healthchecks in Compose.

Add observability (OpenTelemetry, Prometheus) when ready.