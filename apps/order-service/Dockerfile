# syntax=docker/dockerfile:1.4

#############################################
# ⚙️ NebulaNV Optimized Build (order-Service)
#############################################

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate \
 && apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*


# ---------------- deps ----------------
FROM base AS deps
WORKDIR /app

# Root manifests + pnpm config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./

# 👇 Copy all workspace directories so pnpm can resolve them
COPY packages ./packages
COPY apps/*/package.json apps/*/package.json
RUN mkdir -p packages/clients
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm fetch --frozen-lockfile

# ---------------- build ----------------
FROM base AS build
WORKDIR /app

# Bring lockfile + workspace + npmrc
COPY --from=deps /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json /app/.npmrc ./
# Copy full source
COPY . .

# Install only deps needed for this service
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
  pnpm install --frozen-lockfile \
  --filter=@nebula/grpc-auth... \
  --filter=@nebula/order-service...

# Generate Prisma client
RUN pnpm --filter=@nebula/order-service prisma generate --schema apps/order-service/prisma/schema.prisma

# Build this service and its internal deps
RUN pnpm turbo run build --filter=@nebula/order-service^...

# Create minimal deploy dir
RUN pnpm deploy --filter=@nebula/order-service --prod /app/deploy

# ---------------- runtime ----------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/deploy/. /app/

EXPOSE 3003 50053
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:3003/health', r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/main.js"]
