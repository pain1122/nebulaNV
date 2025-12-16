# syntax=docker/dockerfile:1.4

#############################################
# ⚙️ NebulaNV Optimized Build (Media-Service)
#############################################

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app

# Enable pnpm and install OpenSSL for Prisma & crypto deps
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate \
 && apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# -------------------------------------------------
# 🧩 deps: fetch workspace dependencies (cached)
# -------------------------------------------------
FROM base AS deps
WORKDIR /app

# Root manifests + pnpm config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./

# Include ALL workspace packages so `fetch` can resolve them
COPY packages ./packages
COPY apps/*/package.json apps/*/package.json
RUN mkdir -p packages/clients
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm fetch --frozen-lockfile

# -------------------------------------------------
# 🏗 build: install filtered deps + build service
# -------------------------------------------------
FROM base AS build
WORKDIR /app

# Bring lockfile + workspace + npmrc
COPY --from=deps /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json /app/.npmrc ./
# Copy full source for this workspace
COPY . .

# Install only this service and its deps
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
  pnpm install --frozen-lockfile \
  --filter=@nebula/grpc-auth... \
  --filter=@nebula/media-service...

# Generate Prisma client for this service
RUN pnpm --filter=@nebula/media-service prisma generate --schema apps/media-service/prisma/schema.prisma

# Build this service and upstream internal packages
RUN pnpm turbo run build --filter=@nebula/media-service^...

# Create a minimal deploy dir (uses injected workspaces via .npmrc)
RUN pnpm deploy --filter=@nebula/media-service --prod /app/deploy

# -------------------------------------------------
# 🚀 runtime: minimal production image
# -------------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# OpenSSL again for runtime Prisma usage
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/deploy/. /app/

EXPOSE 3010 50054
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3010/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
