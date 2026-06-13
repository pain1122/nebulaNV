# syntax=docker/dockerfile:1.4

FROM node:22-bookworm AS build-base
WORKDIR /app

ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@10.17.1 --activate

FROM build-base AS deps
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./

COPY apps/auth-service/package.json apps/auth-service/package.json
COPY apps/blog-service/package.json apps/blog-service/package.json
COPY apps/media-service/package.json apps/media-service/package.json
COPY apps/order-service/package.json apps/order-service/package.json
COPY apps/product-service/package.json apps/product-service/package.json
COPY apps/settings-service/package.json apps/settings-service/package.json
COPY apps/taxonomy-service/package.json apps/taxonomy-service/package.json
COPY apps/user-service/package.json apps/user-service/package.json
COPY apps/web/package.json apps/web/package.json

COPY packages/clients/package.json packages/clients/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/grpc-auth/package.json packages/grpc-auth/package.json
COPY packages/protos/package.json packages/protos/package.json

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store,sharing=locked \
    pnpm fetch --frozen-lockfile

FROM build-base AS build
WORKDIR /app

COPY --from=deps /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json /app/.npmrc ./
COPY --from=deps /app/apps ./apps
COPY --from=deps /app/packages ./packages

# Workspace postinstall scripts run `prisma generate`, so schemas must exist
# before `pnpm install`; full source is copied later for better cache reuse.
COPY apps/blog-service/prisma/schema.prisma apps/blog-service/prisma/schema.prisma
COPY apps/media-service/prisma/schema.prisma apps/media-service/prisma/schema.prisma
COPY apps/order-service/prisma/schema.prisma apps/order-service/prisma/schema.prisma
COPY apps/product-service/prisma/schema.prisma apps/product-service/prisma/schema.prisma
COPY apps/settings-service/prisma/schema.prisma apps/settings-service/prisma/schema.prisma
COPY apps/taxonomy-service/prisma/schema.prisma apps/taxonomy-service/prisma/schema.prisma
COPY apps/user-service/prisma/schema.prisma apps/user-service/prisma/schema.prisma

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile \
    --filter=@nebula/protos... \
    --filter=@nebula/grpc-auth... \
    --filter=@nebula/user-service... \
    --filter=@nebula/auth-service... \
    --filter=@nebula/settings-service... \
    --filter=@nebula/media-service... \
    --filter=@nebula/taxonomy-service... \
    --filter=@nebula/product-service... \
    --filter=@nebula/blog-service... \
    --filter=@nebula/order-service...

COPY . .

# Build shared packages and backend services once. The deploy stage below
# runs sequentially so full Compose builds do not stampede the npm registry.
RUN pnpm turbo run build \
    --filter=@nebula/user-service... \
    --filter=@nebula/auth-service... \
    --filter=@nebula/settings-service... \
    --filter=@nebula/media-service... \
    --filter=@nebula/taxonomy-service... \
    --filter=@nebula/product-service... \
    --filter=@nebula/blog-service... \
    --filter=@nebula/order-service...

FROM build AS deploy-all
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store,sharing=locked \
    pnpm deploy --filter=@nebula/user-service --prod /out/user && \
    pnpm deploy --filter=@nebula/auth-service --prod /out/auth && \
    pnpm deploy --filter=@nebula/settings-service --prod /out/settings && \
    pnpm deploy --filter=@nebula/media-service --prod /out/media && \
    pnpm deploy --filter=@nebula/taxonomy-service --prod /out/taxonomy && \
    pnpm deploy --filter=@nebula/product-service --prod /out/product && \
    pnpm deploy --filter=@nebula/blog-service --prod /out/blog && \
    pnpm deploy --filter=@nebula/order-service --prod /out/order

FROM node:22-bookworm-slim AS runtime-base
WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates openssl && \
    rm -rf /var/lib/apt/lists/*

COPY --from=build /app/packages/grpc-auth/dist /packages/grpc-auth/dist
COPY --from=build /app/packages/clients/dist /packages/clients/dist
RUN mkdir -p /packages && ln -s /app/node_modules /packages/node_modules

FROM runtime-base AS user-runtime
COPY --from=deploy-all /out/user/. /app/
EXPOSE 3100 50051
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3100/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]

FROM runtime-base AS auth-runtime
COPY --from=deploy-all /out/auth/. /app/
EXPOSE 3001 50052
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]

FROM runtime-base AS settings-runtime
COPY --from=deploy-all /out/settings/. /app/
EXPOSE 3010 50054
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3010/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]

FROM runtime-base AS media-runtime
COPY --from=deploy-all /out/media/. /app/
EXPOSE 3007 50058
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3007/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]

FROM runtime-base AS taxonomy-runtime
COPY --from=deploy-all /out/taxonomy/. /app/
EXPOSE 3006 50057
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3006/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]

FROM runtime-base AS product-runtime
COPY --from=deploy-all /out/product/. /app/
EXPOSE 3003 50053
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3003/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]

FROM runtime-base AS blog-runtime
COPY --from=deploy-all /out/blog/. /app/
EXPOSE 3004 50055
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3004/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]

FROM runtime-base AS order-runtime
COPY --from=deploy-all /out/order/. /app/
EXPOSE 3005 50056
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3005/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
