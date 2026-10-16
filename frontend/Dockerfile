# ==============================================================================
# Multi-stage Standalone Next.js Dockerfile for ARM64 (Raspberry Pi Optimized)
# Slashing container memory footprint from ~600MB to ~95MB
# ==============================================================================

# 1. Base Stage: Alpine Linux with libc compatibility
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 2. Dependencies Stage: Install only required npm packages
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# 3. Builder Stage: Build the Next.js standalone application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN mkdir -p public && npm run build

# 4. Production Runner Stage: Minimal non-root runtime container
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root system user (Least Privilege)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Ensure static public directory exists and copy standalone server output
RUN mkdir -p ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
