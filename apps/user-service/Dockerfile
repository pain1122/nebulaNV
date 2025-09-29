# syntax=docker/dockerfile:1.4

#############################################
#  ⚙️  NebulaNV Optimized Build (User-Service)
#############################################

# --- base tools
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# -------------------------------------------------
# 🧩 deps: fetch workspace dependencies (cached)
# -------------------------------------------------
FROM base AS deps
WORKDIR /app

# copy only the workspace metadata to leverage Docker cache
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
# prefetch dependencies into the pnpm store (no install yet)
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm fetch --frozen-lockfile

# -------------------------------------------------
# 🏗 build: install filtered deps + build service
# -------------------------------------------------
FROM base AS build
WORKDIR /app
# Copy dependency metadata
COPY --from=deps /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./

# copy source (this invalidates only when files change)
COPY . .

# install only user-service deps (offline, cached)
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
pnpm install --frozen-lockfile --workspace-concurrency=1 --filter=@nebula/user-service...

# generate Prisma client for this service explicitly
RUN pnpm --filter=@nebula/user-service prisma generate --schema apps/user-service/prisma/schema.prisma

# build the service AND its dependencies (grpc-auth, protos, etc.)
RUN pnpm -w turbo build --filter=@nebula/user-service^...

# prune to production deps only (for smaller final image)
RUN pnpm prune --prod --filter=@nebula/user-service...

# -------------------------------------------------
# 🚀 runtime: minimal production image
# -------------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# copy only what's necessary
COPY --from=build /app/apps/user-service/dist ./dist
COPY --from=build /app/apps/user-service/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3100 50051

HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3100/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
