# syntax=docker/dockerfile:1.4

#############################################
# ⚙️ NebulaNV Optimized Build (Product-Service)
#############################################

# --- base tools
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# -------------------------------------------------
# 🧩 deps: prefetch workspace dependencies (cached)
# -------------------------------------------------
FROM base AS deps
WORKDIR /app

# Copy only metadata first for caching efficiency
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Prefetch dependency tarballs into pnpm store (no install yet)
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm fetch --frozen-lockfile

# -------------------------------------------------
# 🏗 build: install filtered deps + build service
# -------------------------------------------------
FROM base AS build
WORKDIR /app

# Copy dependency metadata
COPY --from=deps /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./

# Copy full workspace source
COPY . .

# Install only deps needed for this service
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
pnpm install --frozen-lockfile --workspace-concurrency=1 --filter=@nebula/product-service...

# Explicitly generate Prisma client for product-service
RUN pnpm --filter=@nebula/product-service prisma generate --schema apps/product-service/prisma/schema.prisma

# Build this service only AND its dependencies (grpc-auth, protos, etc.)
RUN pnpm -w turbo build --filter=@nebula/product-service^...

# Prune to production deps only (reduces final image size)
RUN pnpm prune --prod --filter=@nebula/product-service...

# -------------------------------------------------
# 🚀 runtime: lightweight production image
# -------------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy built files and minimal runtime deps
COPY --from=build /app/apps/product-service/dist ./dist
COPY --from=build /app/apps/product-service/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:3003/health', r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/main.js"]
