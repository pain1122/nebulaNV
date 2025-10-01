# syntax=docker/dockerfile:1.4

#############################################
# ⚙️ NebulaNV Optimized Build (Auth-Service)
#############################################

# --- base tools
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

# -------------------------------------------------
# 🧩 deps: prefetch workspace dependencies (cached)
# -------------------------------------------------
FROM base AS deps
WORKDIR /app

# Copy workspace metadata for caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Prefetch dependency tarballs into pnpm store (does not install yet)
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm fetch --frozen-lockfile

# -------------------------------------------------
# 🏗 build: install filtered deps + build service
# -------------------------------------------------
FROM base AS build
WORKDIR /app

COPY --from=deps /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY . .

# Install only auth-service deps (offline, cached)
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter=@nebula/auth-service...

# Generate Prisma client for this service
RUN pnpm --filter=@nebula/auth-service prisma generate --schema apps/auth-service/prisma/schema.prisma

# Build the service (includes its dependent internal packages)
RUN pnpm turbo run build --filter=@nebula/auth-service^...

# ✅ Prune inside its own folder (pnpm v9 compatible)
RUN pnpm deploy --filter=@nebula/user-service --prod /app/deploy

# -------------------------------------------------
# 🚀 runtime: minimal production image
# -------------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy only what's needed at runtime
COPY --from=build /app/deploy/. /app/

EXPOSE 3001 50052

HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
