# Stage 1: Build frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build backend
FROM node:22-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# Stage 3: Production image
FROM node:22-alpine
WORKDIR /app/backend

# Install only production dependencies
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy built files
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=frontend-build /app/frontend/dist ../frontend/dist
COPY backend/data/seeds ./data/seeds

RUN mkdir -p /data

ENV NODE_ENV=production
ENV DATABASE_PATH=/data/market.db

# Use tini for proper signal handling
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
