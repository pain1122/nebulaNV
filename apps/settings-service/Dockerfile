# syntax=docker/dockerfile:1.4

#############################################
# ⚙️ NebulaNV Optimized Build (Settings-Service)
#############################################

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

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
pnpm install --frozen-lockfile --workspace-concurrency=1 --filter=@nebula/settings-service...

# 🔧 Generate Prisma client
RUN pnpm --filter=@nebula/settings-service prisma generate --schema apps/settings-service/prisma/schema.prisma

# Build this service and its dependencies
RUN pnpm -w turbo run build --filter=@nebula/settings-service^... --no-cache

# ✅ Prune for production (pnpm 9 compatible)
RUN ls -R apps/settings-service || (echo "❌ dist not found" && exit 1)
RUN find /app -type d -name dist
RUN pnpm prune --prod

# -------------------------------------------------
# 🚀 runtime: minimal production image
# -------------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/apps/settings-service/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3005
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3005/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
