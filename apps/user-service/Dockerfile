# syntax=docker/dockerfile:1.4

#############################################
# ⚙️ NebulaNV Optimized Build (User-Service)
#############################################

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# ------------ deps ------------
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm fetch --frozen-lockfile

# ------------ build ------------
FROM base AS build
WORKDIR /app
COPY --from=deps /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY . .

# Install only what user-service (and its deps) needs
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter=@nebula/user-service...

# Generate Prisma client for user-service
RUN pnpm --filter=@nebula/user-service prisma generate --schema apps/user-service/prisma/schema.prisma

# Build user-service AND its upstream packages (protos, grpc-auth, config)
RUN pnpm turbo run build --filter=@nebula/user-service^...

# Prune production deps in the app folder (keeps dist)
RUN pnpm deploy --filter=@nebula/user-service --prod /app/deploy


# ------------ runtime ------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

# Copy compiled output & pruned deps
COPY --from=build /app/deploy/. /app/

EXPOSE 3100 50051

HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3100/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
