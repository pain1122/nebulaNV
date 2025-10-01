# syntax=docker/dockerfile:1.4

#############################################
# ⚙️ NebulaNV Optimized Build (Settings-Service)
#############################################

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate

# -------------------------------------------------
# 🧩 deps: fetch workspace dependencies (cached)
# -------------------------------------------------
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm fetch --frozen-lockfile

# -------------------------------------------------
# 🏗 build: install filtered deps + build service
# -------------------------------------------------
FROM base AS build
WORKDIR /app

COPY --from=deps /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY . .

# 🧩 Install dependencies for this service only (sequential postinstall = safe on Windows)
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
pnpm install --frozen-lockfile --filter=@nebula/settings-service...

# 🔧 Generate Prisma client
RUN pnpm --filter=@nebula/settings-service prisma generate --schema apps/settings-service/prisma/schema.prisma

# Build this service and its dependencies
RUN pnpm turbo run build --filter=@nebula/settings-service^...

# ✅ Prune for production (pnpm 9 compatible)
RUN pnpm deploy --filter=@nebula/user-service --prod /app/deploy


# -------------------------------------------------
# 🚀 runtime: minimal production image
# -------------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

COPY --from=build /app/deploy/. /app/

EXPOSE 3005
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3005/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
