# Multi-stage Dockerfile for slam-poker app

# Stage 1: Build Frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app

# Copy frontend package files
COPY web/package*.json ./web/
WORKDIR /app/web

# Install frontend dependencies (including dev deps for building)
RUN npm ci

# Copy frontend source
COPY web/ .

# Build frontend (skip type checking for Docker build)
RUN npx vite build --mode production

# Stage 2: Build Backend
FROM node:22-alpine AS backend-builder
WORKDIR /app

# Copy backend package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev deps for building)
RUN npm ci && npm install tsc-alias

# Copy backend source
COPY src/ ./src/

# Build backend and resolve paths
RUN npm run build && npx tsc-alias

# Stage 3: Production
FROM node:22-alpine AS production
WORKDIR /app

# Copy backend package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# Copy built backend
COPY --from=backend-builder /app/dist ./dist

# Copy built frontend to be served as static files
COPY --from=frontend-builder /app/web/dist ./web/dist

# Copy environment configuration
COPY .env* ./

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
USER nextjs

# Expose port (configurable via environment)
EXPOSE ${PORT:-3001}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT:-3001}/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]