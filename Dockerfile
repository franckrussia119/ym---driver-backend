# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY --from=build /app/dist ./dist
COPY migrations ./migrations

# Volume monté par Coolify pour conserver les fichiers uploadés
# (signatures, photos, documents véhicules) entre les déploiements.
RUN mkdir -p /app/uploads
VOLUME ["/app/uploads"]

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-4000}/health" || exit 1

# Applique les migrations puis démarre le serveur.
CMD sh -c "node dist/migrate.js && node dist/index.js"
