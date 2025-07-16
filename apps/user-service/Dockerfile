# ---------------------------------------------
# Stage 1: Builder
# ---------------------------------------------
    FROM node:22-slim AS builder

    RUN apt-get update && apt-get install -y openssl
    RUN npm install -g pnpm@9
    
    WORKDIR /app
    
    # Copy all files (monorepo, code, configs)
    COPY . .
    
    # Install dependencies across workspaces
    RUN pnpm install --no-frozen-lockfile
    
    # Generate Prisma client & build app
    RUN pnpm --filter @nebula/user-service exec prisma generate
    RUN pnpm --filter @nebula/user-service run build
    
    # ---------------------------------------------
    # Stage 2: Runtime
    # ---------------------------------------------
    FROM node:22-slim
    
    RUN apt-get update \
     && apt-get install -y openssl \
     && npm install -g pnpm@9 wait-port
    
    WORKDIR /app
    
    # Copy everything from builder
    COPY --from=builder /app .
    
    # Wait for Postgres, run migrations, then start app
    CMD ["sh", "-c", "wait-port postgres:5432 && pnpm --filter @nebula/user-service exec prisma migrate deploy && node apps/user-service/dist/main"]
    