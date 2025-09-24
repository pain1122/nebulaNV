# --- deps stage: install only what's needed to build user-service
FROM node:20-alpine AS deps
RUN corepack enable
WORKDIR /app
# workspace metadata
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
# shared packages used at build time (protos, etc.)
COPY packages ./packages
# service manifest so pnpm can filter install
COPY apps/user-service/package.json ./apps/user-service/package.json
# install (filtered) – postinstall will run prisma:gen for this service
RUN pnpm install --frozen-lockfile --filter ./apps/user-service...

# --- build stage: compile the service
FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /app
COPY . .
# install workspace deps for build (cached thanks to previous layer)
RUN pnpm install --frozen-lockfile
# build just user-service via turbo (same style you used for auth)
RUN pnpm -w turbo build --filter=user-service

# --- runtime stage: slim image with compiled dist and prod deps
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# copy compiled output & package.json
COPY --from=build /app/apps/user-service/dist ./dist
COPY --from=build /app/apps/user-service/package.json ./
# install prod deps for runtime (@prisma/client etc.)
RUN corepack enable && pnpm i --prod
# expose HTTP + gRPC
EXPOSE 3100 50051
# basic HTTP healthcheck (your /health endpoint)
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3100/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","dist/main.js"]
