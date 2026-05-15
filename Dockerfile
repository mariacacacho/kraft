# ── Stage 1: build client ────────────────────────────────────────────────────
FROM node:20-alpine AS client-builder
WORKDIR /build/client
COPY client/package*.json ./
RUN npm ci --prefer-offline
COPY client/ ./
RUN npm run build

# ── Stage 2: compile server ──────────────────────────────────────────────────
FROM node:20-alpine AS server-builder
WORKDIR /build/server
COPY server/package*.json ./
RUN npm ci --prefer-offline
COPY server/ ./
RUN npm run build

# ── Stage 3: production image ────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Install only production deps
COPY server/package*.json ./
RUN npm ci --omit=dev --prefer-offline && npm cache clean --force

# Compiled server
COPY --from=server-builder /build/server/dist ./dist

# Built React app — Express serves it in production
COPY --from=client-builder /build/client/dist ./client/dist

# Persistent uploads directory
RUN mkdir -p uploads && addgroup -S kraft && adduser -S kraft -G kraft \
    && chown -R kraft:kraft /app

USER kraft

EXPOSE 3001
CMD ["node", "dist/index.js"]
