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
# Root manifests + pnpm config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
# Expose workspace package manifests so `fetch` can resolve them
COPY packages/*/package.json packages/*/package.json
COPY apps/*/package.json     apps/*/package.json

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm fetch --frozen-lockfile

# -------------------------------------------------
# 🏗 build: install filtered deps + build service
# -------------------------------------------------
FROM base AS build
WORKDIR /app

# Bring lockfile + workspace + npmrc
COPY --from=deps /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json /app/.npmrc ./
# Now the full source
COPY . .

# Install only this service and its deps
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter=@nebula/settings-service...

# Generate Prisma client for this service
RUN pnpm --filter=@nebula/settings-service prisma generate --schema apps/settings-service/prisma/schema.prisma

# Build this service and upstream internal packages
RUN pnpm turbo run build --filter=@nebula/settings-service^...

# Create a minimal deploy dir (uses injected workspaces via .npmrc)
RUN pnpm deploy --filter=@nebula/settings-service --prod /app/deploy

# -------------------------------------------------
# 🚀 runtime: minimal production image
# -------------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/deploy/. /app/

EXPOSE 3010 55123
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3010/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
