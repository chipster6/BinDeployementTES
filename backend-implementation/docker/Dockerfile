# ============================================================================
# WASTE MANAGEMENT SYSTEM - BACKEND DOCKERFILE
# ============================================================================
#
# Multi-stage Dockerfile for production-ready Node.js TypeScript application
# Optimized for security, performance, and minimal attack surface
#
# Created by: Infrastructure Agent
# Date: 2025-08-12
# Version: 1.0.0
# ============================================================================

# ============================================================================
# Stage 1: Base Node.js image with security optimizations
# ============================================================================
FROM node:20-alpine AS base

# Install security updates and required dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# ============================================================================
# Stage 2: Development dependencies and build tools
# ============================================================================
FROM base AS deps

# Install all dependencies (including dev dependencies)
RUN npm ci --include=dev

# ============================================================================
# Stage 3: Build stage - compile TypeScript
# ============================================================================
FROM deps AS builder

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies for smaller production image
RUN npm ci --only=production && npm cache clean --force

# ============================================================================
# Stage 4: Development runtime
# ============================================================================
FROM base AS development

# Install development dependencies
COPY package*.json ./
RUN npm ci --include=dev

# Copy source code for development hot-reload
COPY . .

# Set environment variables
ENV NODE_ENV=development
ENV PORT=3001

# Expose ports
EXPOSE 3001 3002 3003

# Create directories for logs and uploads
RUN mkdir -p /app/logs /app/uploads && \
    chown -R nodejs:nodejs /app/logs /app/uploads

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Start application with hot reload
CMD ["dumb-init", "npm", "run", "dev:ts"]

# ============================================================================
# Stage 5: Production runtime (minimal and secure)
# ============================================================================
FROM base AS production

# Copy built application and production dependencies
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Copy configuration files
COPY --chown=nodejs:nodejs ./src/config ./src/config

# Set production environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Create directories for logs and uploads
RUN mkdir -p /app/logs /app/uploads && \
    chown -R nodejs:nodejs /app/logs /app/uploads

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Start application
CMD ["dumb-init", "node", "dist/server.js"]

# ============================================================================
# Stage 6: Testing environment
# ============================================================================
FROM deps AS testing

# Copy source code
COPY . .

# Set test environment
ENV NODE_ENV=test
ENV PORT=3002

# Expose test port
EXPOSE 3002

# Create test directories
RUN mkdir -p /app/test-results /app/coverage && \
    chown -R nodejs:nodejs /app/test-results /app/coverage

# Switch to non-root user
USER nodejs

# Default command for running tests
CMD ["npm", "run", "test:ci"]

# ============================================================================
# Labels for container metadata
# ============================================================================
LABEL maintainer="Infrastructure Agent <infrastructure@waste-mgmt.com>"
LABEL version="1.0.0"
LABEL description="Waste Management System Backend API"
LABEL org.opencontainers.image.source="https://github.com/waste-mgmt/backend"
LABEL org.opencontainers.image.documentation="https://waste-mgmt.github.io/backend"
LABEL org.opencontainers.image.licenses="PROPRIETARY"