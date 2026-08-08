# syntax=docker/dockerfile:1.7

FROM node:22-bookworm AS build-base
WORKDIR /app

ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@10.17.1 --activate

# Keep dependency resolution independent from application source changes.
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

RUN --mount=type=cache,id=nebula-pnpm-store,target=/root/.local/share/pnpm/store,sharing=locked \
    pnpm fetch --frozen-lockfile

# Install build dependencies and compile every backend service once.
FROM build-base AS build
WORKDIR /app

COPY --from=deps /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json /app/.npmrc ./
COPY --from=deps /app/apps ./apps
COPY --from=deps /app/packages ./packages

# Workspace postinstall scripts generate Prisma clients, so schemas must exist
# before the full development install. Later source copies merge with this tree.
COPY apps/blog-service/prisma/schema.prisma apps/blog-service/prisma/schema.prisma
COPY apps/media-service/prisma/schema.prisma apps/media-service/prisma/schema.prisma
COPY apps/order-service/prisma/schema.prisma apps/order-service/prisma/schema.prisma
COPY apps/product-service/prisma/schema.prisma apps/product-service/prisma/schema.prisma
COPY apps/settings-service/prisma/schema.prisma apps/settings-service/prisma/schema.prisma
COPY apps/taxonomy-service/prisma/schema.prisma apps/taxonomy-service/prisma/schema.prisma
COPY apps/user-service/prisma/schema.prisma apps/user-service/prisma/schema.prisma

RUN --mount=type=cache,id=nebula-pnpm-store,target=/root/.local/share/pnpm/store,sharing=locked \
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

# Copy only backend build inputs. Documentation, reports, tests, local env files,
# and the web application are deliberately absent from this build context slice.
COPY turbo.json tsconfig.base.json ./
COPY apps/auth-service ./apps/auth-service
COPY apps/blog-service ./apps/blog-service
COPY apps/media-service ./apps/media-service
COPY apps/order-service ./apps/order-service
COPY apps/product-service ./apps/product-service
COPY apps/settings-service ./apps/settings-service
COPY apps/taxonomy-service ./apps/taxonomy-service
COPY apps/user-service ./apps/user-service
COPY packages/clients ./packages/clients
COPY packages/config ./packages/config
COPY packages/grpc-auth ./packages/grpc-auth
COPY packages/protos ./packages/protos

# A Turbo cache hit skips pnpm's post-build injected-dependency sync. Build the
# small shared workspaces first so Nest can resolve their package names. The
# proto package generates its ignored TypeScript contracts inside this stage,
# so the image never depends on host-generated output. Keep verified Docker
# artifacts in a versioned cache namespace.
ARG TURBO_FORCE=0
RUN --mount=type=cache,id=nebula-pnpm-store,target=/root/.local/share/pnpm/store,sharing=locked \
    --mount=type=cache,id=nebula-turbo,target=/app/.turbo,sharing=locked \
    pnpm --filter=@nebula/protos build && \
    pnpm --filter=@nebula/grpc-auth build && \
    pnpm --filter=@packages/config build && \
    pnpm --filter=@nebula/clients build && \
    if [ "$TURBO_FORCE" = "1" ]; then \
      pnpm turbo run build --force --cache-dir=/app/.turbo/runtime-imports-v2 \
        --filter=@nebula/user-service... \
        --filter=@nebula/auth-service... \
        --filter=@nebula/settings-service... \
        --filter=@nebula/media-service... \
        --filter=@nebula/taxonomy-service... \
        --filter=@nebula/product-service... \
        --filter=@nebula/blog-service... \
        --filter=@nebula/order-service...; \
    else \
      pnpm turbo run build --cache-dir=/app/.turbo/runtime-imports-v2 \
        --filter=@nebula/user-service... \
        --filter=@nebula/auth-service... \
        --filter=@nebula/settings-service... \
        --filter=@nebula/media-service... \
        --filter=@nebula/taxonomy-service... \
        --filter=@nebula/product-service... \
        --filter=@nebula/blog-service... \
        --filter=@nebula/order-service...; \
    fi

# A backend artifact must resolve shared workspaces through their package names.
# Relative paths into packages/* bypass the injected production dependency graph
# and can make an otherwise successful image fail only when its process starts.
# Copy this check after compilation so changes to the verifier do not invalidate
# the expensive Turbo build layer.
COPY scripts/backend.mjs ./scripts/backend.mjs
COPY scripts/docker/verify-runtime-imports.mjs ./scripts/docker/verify-runtime-imports.mjs
RUN node ./scripts/docker/verify-runtime-imports.mjs /app

# Create one production workspace dependency graph. This stage intentionally
# receives only dependency metadata, never compiled first-party files. The
# resulting large node_modules layer therefore changes only when dependency
# metadata changes, not whenever Nebula source code is rebuilt.
FROM build-base AS prod-deps
WORKDIR /app

COPY --from=deps /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json /app/.npmrc ./
COPY --from=deps /app/apps ./apps
COPY --from=deps /app/packages ./packages

RUN --mount=type=cache,id=nebula-pnpm-store,target=/root/.local/share/pnpm/store,sharing=locked \
    pnpm install \
      --prod \
      --offline \
      --ignore-scripts \
      --frozen-lockfile \
      --filter=@nebula/user-service... \
      --filter=@nebula/auth-service... \
      --filter=@nebula/settings-service... \
      --filter=@nebula/media-service... \
      --filter=@nebula/taxonomy-service... \
      --filter=@nebula/product-service... \
      --filter=@nebula/blog-service... \
      --filter=@nebula/order-service...

# Collect the compiled first-party runtime packages in a small, independent
# layer. Optional/licensed feature modules are deliberately not admitted here;
# they remain separately built and licensed images.
FROM scratch AS shared-runtime-artifacts

COPY --from=deps /app/packages/clients/package.json /packages/clients/package.json
COPY --from=deps /app/packages/config/package.json /packages/config/package.json
COPY --from=deps /app/packages/grpc-auth/package.json /packages/grpc-auth/package.json
COPY --from=deps /app/packages/protos/package.json /packages/protos/package.json
COPY --from=build /app/packages/clients/dist /packages/clients/dist
COPY --from=build /app/packages/config/dist /packages/config/dist
COPY --from=build /app/packages/grpc-auth/dist /packages/grpc-auth/dist
COPY --from=build /app/packages/protos/dist /packages/protos/dist
COPY --from=build /app/packages/protos/auth.proto /packages/protos/auth.proto
COPY --from=build /app/packages/protos/blog.proto /packages/protos/blog.proto
COPY --from=build /app/packages/protos/media.proto /packages/protos/media.proto
COPY --from=build /app/packages/protos/order.proto /packages/protos/order.proto
COPY --from=build /app/packages/protos/product.proto /packages/protos/product.proto
COPY --from=build /app/packages/protos/settings.proto /packages/protos/settings.proto
COPY --from=build /app/packages/protos/taxonomy.proto /packages/protos/taxonomy.proto
COPY --from=build /app/packages/protos/user.proto /packages/protos/user.proto

# This layer is referenced by every final service image. The layer is shared in
# a registry/local store, but is still part of each image manifest, so every
# image remains independently pushable, pullable, savable, and runnable.
FROM node:22-bookworm-slim AS runtime-base
WORKDIR /workspace

ENV NODE_ENV=production

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates openssl && \
    rm -rf /var/lib/apt/lists/*

COPY --link --from=prod-deps /app/node_modules ./node_modules
COPY --link --from=shared-runtime-artifacts /packages ./packages

# pnpm's injectWorkspacePackages mode places deployable copies of first-party
# packages inside the virtual store. Overlay the compiled artifacts onto every
# prepared slot that exists. A package can legitimately have no slot in a
# filtered production graph; the service-specific checks below remain the
# authority for whether each target's declared internal dependencies resolve.
# This keeps frozen-lockfile behavior and standalone images while preventing
# source edits from recreating the 320 MB dependency layer.
RUN --mount=from=shared-runtime-artifacts,source=/packages,target=/built-packages,ro \
    --mount=from=prod-deps,source=/app/packages,target=/production-packages,ro \
    set -eu; \
    for source in /built-packages/*; do \
      directory="${source##*/}"; \
      package_name="$(node -p "require('$source/package.json').name")"; \
      scope="${package_name%/*}"; \
      name="${package_name#*/}"; \
      if [ -d "/production-packages/$directory/node_modules" ]; then \
        cp -a "/production-packages/$directory/node_modules" "/workspace/packages/$directory/node_modules"; \
      fi; \
      for target in /workspace/node_modules/.pnpm/*/node_modules/"$scope"/"$name"; do \
        [ -d "$target" ] || continue; \
        cp -a "$source"/. "$target"/; \
      done; \
    done

# Root is required only while preparing the shared runtime filesystem. Every
# service target inherits this unprivileged runtime user.
USER node

FROM runtime-base AS user-runtime
WORKDIR /workspace/apps/user-service
COPY --link --from=prod-deps /app/apps/user-service/package.json ./package.json
COPY --link --from=prod-deps /app/apps/user-service/node_modules ./node_modules
COPY --link --from=build /app/apps/user-service/dist ./dist
COPY --link --from=build /app/apps/user-service/prisma ./prisma
RUN node -e "const d=require('./package.json').dependencies||{}; for(const p of Object.keys(d).filter(p=>p.startsWith('@nebula/')||p.startsWith('@packages/'))) require(p)"
EXPOSE 3100 50051
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3100/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]

FROM runtime-base AS auth-runtime
WORKDIR /workspace/apps/auth-service
COPY --link --from=prod-deps /app/apps/auth-service/package.json ./package.json
COPY --link --from=prod-deps /app/apps/auth-service/node_modules ./node_modules
COPY --link --from=build /app/apps/auth-service/dist ./dist
RUN node -e "const d=require('./package.json').dependencies||{}; for(const p of Object.keys(d).filter(p=>p.startsWith('@nebula/')||p.startsWith('@packages/'))) require(p)"
EXPOSE 3001 50052
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3001/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]

FROM runtime-base AS settings-runtime
WORKDIR /workspace/apps/settings-service
COPY --link --from=prod-deps /app/apps/settings-service/package.json ./package.json
COPY --link --from=prod-deps /app/apps/settings-service/node_modules ./node_modules
COPY --link --from=build /app/apps/settings-service/dist ./dist
COPY --link --from=build /app/apps/settings-service/prisma ./prisma
RUN node -e "const d=require('./package.json').dependencies||{}; for(const p of Object.keys(d).filter(p=>p.startsWith('@nebula/')||p.startsWith('@packages/'))) require(p)"
EXPOSE 3010 50054
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3010/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]

FROM runtime-base AS media-runtime
WORKDIR /workspace/apps/media-service
COPY --link --from=prod-deps /app/apps/media-service/package.json ./package.json
COPY --link --from=prod-deps /app/apps/media-service/node_modules ./node_modules
COPY --link --from=build /app/apps/media-service/dist ./dist
COPY --link --from=build /app/apps/media-service/prisma ./prisma
RUN node -e "const d=require('./package.json').dependencies||{}; for(const p of Object.keys(d).filter(p=>p.startsWith('@nebula/')||p.startsWith('@packages/'))) require(p)"
EXPOSE 3007 50058
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3007/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]

FROM runtime-base AS taxonomy-runtime
WORKDIR /workspace/apps/taxonomy-service
COPY --link --from=prod-deps /app/apps/taxonomy-service/package.json ./package.json
COPY --link --from=prod-deps /app/apps/taxonomy-service/node_modules ./node_modules
COPY --link --from=build /app/apps/taxonomy-service/dist ./dist
COPY --link --from=build /app/apps/taxonomy-service/prisma ./prisma
RUN node -e "const d=require('./package.json').dependencies||{}; for(const p of Object.keys(d).filter(p=>p.startsWith('@nebula/')||p.startsWith('@packages/'))) require(p)"
EXPOSE 3006 50057
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3006/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]

FROM runtime-base AS product-runtime
WORKDIR /workspace/apps/product-service
COPY --link --from=prod-deps /app/apps/product-service/package.json ./package.json
COPY --link --from=prod-deps /app/apps/product-service/node_modules ./node_modules
COPY --link --from=build /app/apps/product-service/dist ./dist
COPY --link --from=build /app/apps/product-service/prisma ./prisma
RUN node -e "const d=require('./package.json').dependencies||{}; for(const p of Object.keys(d).filter(p=>p.startsWith('@nebula/')||p.startsWith('@packages/'))) require(p)"
EXPOSE 3003 50053
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3003/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]

FROM runtime-base AS blog-runtime
WORKDIR /workspace/apps/blog-service
COPY --link --from=prod-deps /app/apps/blog-service/package.json ./package.json
COPY --link --from=prod-deps /app/apps/blog-service/node_modules ./node_modules
COPY --link --from=build /app/apps/blog-service/dist ./dist
COPY --link --from=build /app/apps/blog-service/prisma ./prisma
RUN node -e "const d=require('./package.json').dependencies||{}; for(const p of Object.keys(d).filter(p=>p.startsWith('@nebula/')||p.startsWith('@packages/'))) require(p)"
EXPOSE 3004 50055
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3004/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]

FROM runtime-base AS order-runtime
WORKDIR /workspace/apps/order-service
COPY --link --from=prod-deps /app/apps/order-service/package.json ./package.json
COPY --link --from=prod-deps /app/apps/order-service/node_modules ./node_modules
COPY --link --from=build /app/apps/order-service/dist ./dist
COPY --link --from=build /app/apps/order-service/prisma ./prisma
RUN node -e "const d=require('./package.json').dependencies||{}; for(const p of Object.keys(d).filter(p=>p.startsWith('@nebula/')||p.startsWith('@packages/'))) require(p)"
EXPOSE 3005 50056
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3005/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
