FROM node:22-alpine AS base
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy only product-service (monorepo users typically copy from root; keep it simple here)
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:3003/health', r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"


ENV NODE_ENV=production
CMD ["node", "dist/main.js"]
