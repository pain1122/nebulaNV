# syntax=docker/dockerfile:1.4

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate

# --- deps (use lockfile + expose workspace manifests for fetch) ---
FROM base AS deps
WORKDIR /app
# Root manifests + pnpm config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
# Expose workspace package manifests so "fetch" can resolve them
COPY packages/*/package.json packages/*/package.json
COPY apps/*/package.json     apps/*/package.json

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm fetch --frozen-lockfile

# --- build ---
FROM base AS build
WORKDIR /app
# Bring lockfile + workspace + npmrc
COPY --from=deps /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json /app/.npmrc ./
# Now copy the full source
COPY . .

# Install only what's needed for auth-service
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter=@nebula/auth-service...

# (auth has no prisma)

# Build auth-service and its deps
RUN pnpm turbo run build --filter=@nebula/auth-service^...

# Create minimal deploy dir (uses .npmrc for injected workspaces)
RUN pnpm deploy --filter=@nebula/auth-service --prod /app/deploy

# --- runtime ---
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/deploy/ ./
EXPOSE 3001 50052
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
