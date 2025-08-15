# ============================================================================
# WASTE MANAGEMENT SYSTEM - BACKEND DOCKERFILE
# ============================================================================
#
# Multi-stage Dockerfile for production-ready Node.js TypeScript application
# Optimized for security, performance, and minimal attack surface
# Security-Agent Coordinated: Comprehensive security hardening implemented
#
# Created by: DevOps-Agent coordinated with Security-Agent
# Date: 2025-08-13
# Version: 2.0.0 - Production Security Hardened
# ============================================================================

# ============================================================================
# Stage 1: Base Node.js image with security optimizations
# ============================================================================
FROM node:20-alpine AS base

# Security-Agent Coordination: Comprehensive security hardening
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates \
    tini \
    su-exec \
    && rm -rf /var/cache/apk/* /tmp/* /var/tmp/* \
    && addgroup -g 1001 -S nodejs \
    && adduser -S -D -H -u 1001 -s /sbin/nologin -G nodejs nodejs \
    && mkdir -p /app /app/logs /app/uploads /app/tmp \
    && chown -R nodejs:nodejs /app

# Security hardening: Set secure permissions and environment
ENV NODE_ENV=production \
    NPM_CONFIG_CACHE=/tmp/.npm \
    NODE_OPTIONS="--max-old-space-size=512" \
    TINI_SUBREAPER=1

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
# Stage 5: Production runtime (Security-Agent Hardened)
# ============================================================================
FROM base AS production

# Security-Agent Coordination: Enhanced production security
ARG BUILD_DATE
ARG VERSION
ARG SECURITY_GRADE
LABEL maintainer="DevOps-Agent + Security-Agent <infrastructure@waste-mgmt.com>" \
      version="${VERSION}" \
      build-date="${BUILD_DATE}" \
      security-grade="${SECURITY_GRADE}" \
      description="Security-hardened Waste Management Backend API"

# Copy built application and production dependencies with secure permissions
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Copy configuration files with restricted permissions
COPY --chown=nodejs:nodejs ./src/config ./src/config

# Security hardening: File permissions and directory structure
RUN chmod -R 755 /app && \
    chmod -R 700 /app/logs /app/uploads && \
    chmod 644 /app/package*.json && \
    chmod -R 755 /app/dist && \
    chmod -R 644 /app/src/config && \
    find /app -type f -name "*.js" -exec chmod 644 {} \; && \
    find /app -type f -name "*.json" -exec chmod 644 {} \; && \
    rm -rf /tmp/* /var/tmp/* /root/.npm /home/nodejs/.npm

# Production environment with security configurations
ENV NODE_ENV=production \
    PORT=3001 \
    NODE_OPTIONS="--max-old-space-size=512 --no-warnings" \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    FORCE_COLOR=0

# Security: Remove unnecessary packages and files
RUN apk del curl && \
    rm -rf /var/cache/apk/* /tmp/* /var/tmp/*

# Expose port (non-privileged)
EXPOSE 3001

# Switch to non-root user early
USER nodejs

# Security-enhanced health check (internal only, no curl needed)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "const http=require('http'); const options={hostname:'localhost',port:process.env.PORT||3001,path:'/health',timeout:5000}; const req=http.request(options,(res)=>{process.exit(res.statusCode===200?0:1)}); req.on('error',()=>process.exit(1)); req.end();"

# Security-Agent Coordinated: Secure application startup
CMD ["tini", "-s", "--", "node", "--unhandled-rejections=strict", "dist/server.js"]

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