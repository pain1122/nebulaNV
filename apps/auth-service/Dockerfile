# syntax=docker/dockerfile:1.4

#############################################
# ⚙️ NebulaNV Optimized Build (Auth-Service)
#############################################

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app

# Enable pnpm and install OpenSSL for Node crypto deps
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate \
 && apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# ---------- deps (prefetch) ----------
FROM base AS deps
WORKDIR /app

# Root manifests + pnpm config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./

# Include ALL workspace packages for resolution
COPY packages ./packages
COPY apps/*/package.json apps/*/package.json
RUN mkdir -p packages/clients
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm fetch --frozen-lockfile

# ---------- build ----------
FROM base AS build
WORKDIR /app

# Bring lockfile + workspace + npmrc
COPY --from=deps /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json /app/.npmrc ./
# Copy the rest of the source
COPY . .

# Install only what's needed for auth-service (no prisma)
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
  pnpm install --frozen-lockfile \
  --filter=@nebula/grpc-auth... \
  --filter=@nebula/settings-service...

# Build auth-service and its deps
RUN pnpm turbo run build --filter=@nebula/auth-service^...

# Create minimal deploy dir (with injected workspaces)
RUN pnpm deploy --filter=@nebula/auth-service --prod /app/deploy

# ---------- runtime ----------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# OpenSSL again for runtime safety
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/deploy/ ./

EXPOSE 3001 50052
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
