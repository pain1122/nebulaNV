FROM node:20-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/auth-service/package.json ./apps/auth-service/package.json
RUN pnpm install --frozen-lockfile --filter ./apps/auth-service...

FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm -w turbo build --filter=auth-service

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/auth-service/dist ./dist
COPY --from=build /app/apps/auth-service/package.json ./
RUN corepack enable && pnpm i --prod
EXPOSE 3001 50052
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","dist/main.js"]
