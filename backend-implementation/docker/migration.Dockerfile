# ============================================================================
# PRODUCTION MIGRATION DOCKER IMAGE
# ============================================================================
#
# Specialized Docker image for database migration operations in production
# environments. Includes all migration tools, validation framework, and
# backup/restore capabilities.
#
# Created by: Database-Architect
# Date: 2025-08-15
# Version: 1.0.0
# ============================================================================

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    postgresql-client \
    curl \
    bash \
    jq \
    git \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY scripts/ ./scripts/

# Create directories
RUN mkdir -p ./backups ./logs ./src/database/migrations ./src/database/validations

# Make scripts executable
RUN chmod +x ./scripts/*.sh

# Build TypeScript
RUN npm run build

# Create non-root user for security
RUN addgroup -g 1001 -S migrator && \
    adduser -S migrator -u 1001 -G migrator

# Change ownership of app directory
RUN chown -R migrator:migrator /app

# Switch to non-root user
USER migrator

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "process.exit(0)" || exit 1

# Default command
CMD ["npm", "run", "migration:status"]

# Labels
LABEL maintainer="Database-Architect"
LABEL version="1.0.0"
LABEL description="Production database migration container"