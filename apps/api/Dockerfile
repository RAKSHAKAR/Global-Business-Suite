FROM node:18-alpine AS builder
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
RUN apk update

# Set working directory
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy monorepo config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY turbo.json ./

# Copy apps and packages
COPY apps/api ./apps/api
COPY packages/database ./packages/database

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client and build API
RUN pnpm turbo run build --filter=api

FROM node:18-alpine AS runner
WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs
USER expressjs

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./package.json

EXPOSE 4000

ENV PORT 4000
ENV NODE_ENV production

CMD ["node", "dist/index.js"]
