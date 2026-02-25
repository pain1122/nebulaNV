# syntax=docker/dockerfile:1.4

FROM node:22-bookworm AS os-base
WORKDIR /app

# node:22-bookworm already includes openssl and CA certificates.

FROM os-base AS base
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate

FROM base AS deps
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY packages ./packages
COPY apps/*/package.json apps/*/package.json
RUN mkdir -p packages/clients

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm fetch --frozen-lockfile

FROM base AS build
WORKDIR /app

COPY --from=deps /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json /app/.npmrc ./
COPY . .

# Install only core backend services and their transitive workspace dependencies.
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile \
    --filter=@nebula/protos... \
    --filter=@nebula/grpc-auth... \
    --filter=@nebula/user-service... \
    --filter=@nebula/auth-service... \
    --filter=@nebula/settings-service... \
    --filter=@nebula/media-service...

# Prisma generation for services that need runtime client artifacts.
RUN pnpm --filter=@nebula/user-service prisma generate --schema apps/user-service/prisma/schema.prisma && \
    pnpm --filter=@nebula/settings-service prisma generate --schema apps/settings-service/prisma/schema.prisma && \
    pnpm --filter=@nebula/media-service prisma generate --schema apps/media-service/prisma/schema.prisma

# Build all core services in one graph walk instead of per-image duplication.
RUN pnpm turbo run build \
    --filter=@nebula/user-service... \
    --filter=@nebula/auth-service... \
    --filter=@nebula/settings-service... \
    --filter=@nebula/media-service...

RUN pnpm deploy --filter=@nebula/user-service --prod /out/user && \
    pnpm deploy --filter=@nebula/auth-service --prod /out/auth && \
    pnpm deploy --filter=@nebula/settings-service --prod /out/settings && \
    pnpm deploy --filter=@nebula/media-service --prod /out/media

FROM os-base AS runtime-base
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/packages/grpc-auth/dist /packages/grpc-auth/dist
RUN mkdir -p /packages && ln -s /app/node_modules /packages/node_modules

FROM runtime-base AS user-runtime
COPY --from=build /out/user/. /app/
EXPOSE 3100 50051
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3100/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]

FROM runtime-base AS auth-runtime
COPY --from=build /out/auth/. /app/
EXPOSE 3001 50052
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]

FROM runtime-base AS settings-runtime
COPY --from=build /out/settings/. /app/
EXPOSE 3010 50054
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3010/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]

FROM runtime-base AS media-runtime
COPY --from=build /out/media/. /app/
EXPOSE 3007 50058
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3007/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
