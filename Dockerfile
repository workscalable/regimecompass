# Gamma Adaptive System - Production Dockerfile
# Multi-stage build for optimized production deployment

# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY gamma-services/ ./gamma-services/
COPY gamma-dashboard/ ./gamma-dashboard/

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM node:18-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S gamma && \
    adduser -S gamma -u 1001

# Set working directory
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/gamma-services ./gamma-services
COPY --from=builder /app/gamma-dashboard ./gamma-dashboard

# Copy configuration files
COPY gamma-adaptive-config.json ./
COPY deployment/ ./deployment/

# Create necessary directories
RUN mkdir -p logs data backups && \
    chown -R gamma:gamma /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV LOG_LEVEL=info
ENV CONFIG_PATH=/app/gamma-adaptive-config.json

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node deployment/healthcheck.js

# Switch to non-root user
USER gamma

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]