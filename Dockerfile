# ---- Dependencies ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# better-sqlite3 ships prebuilt binaries, so install scripts (node-gyp) are not needed.
RUN npm ci --ignore-scripts

# ---- Build ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Runtime ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATA_DIR=/data \
    PUID=1000 \
    PGID=1000

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/drizzle ./drizzle
COPY --from=builder --chown=node:node /app/catalog ./catalog
# Make sure the native SQLite binary for every platform is present (output tracing may keep only one).
COPY --from=builder --chown=node:node /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --chown=node:node docker/start.js ./start.js

# Next.js writes caches under .next (cache/, server/route-cache…): make it writable by whichever
# user runs the server (PUID/PGID or compose `user:`).
RUN mkdir -p /data /app/.next/cache && chown node:node /data && chmod -R a+rwX /app/.next
VOLUME /data
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Starts as root only to fix /data ownership, then runs the server as PUID:PGID (see docker/start.js).
CMD ["node", "start.js"]
