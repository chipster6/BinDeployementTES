# ============================================================================
# AI/ML SERVICES DOCKERFILE
# ============================================================================
#
# Multi-stage Dockerfile for ML services including:
# - OR-Tools route optimization
# - Prophet + LightGBM predictive analytics
# - Weaviate client integration
# - GraphHopper traffic integration
#
# Created by: DevOps-Agent (MESH Coordination coord-ai-ml-mesh-001)
# Date: 2025-08-13
# Version: 1.0.0 - Production Ready ML Infrastructure
# ============================================================================

# ============================================================================
# Stage 1: Base Python + Node.js environment
# ============================================================================
FROM python:3.11-slim AS ml-base

# Install system dependencies for ML libraries
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    pkg-config \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgeos-dev \
    libproj-dev \
    gdal-bin \
    libgdal-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Create ML user for security
RUN useradd --create-home --shell /bin/bash mluser \
    && mkdir -p /app /app/models /app/data /app/cache /app/logs \
    && chown -R mluser:mluser /app

WORKDIR /app

# ============================================================================
# Stage 2: Python ML dependencies
# ============================================================================
FROM ml-base AS ml-deps

# Copy requirements file
COPY requirements-ml.txt .

# Install Python ML dependencies
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements-ml.txt

# Install OR-Tools for route optimization
RUN pip install --no-cache-dir ortools==9.7.2996

# Install Prophet for forecasting
RUN pip install --no-cache-dir prophet==1.1.4

# Install LightGBM for gradient boosting
RUN pip install --no-cache-dir lightgbm==4.1.0

# Install additional ML libraries
RUN pip install --no-cache-dir \
    numpy==1.24.3 \
    pandas==2.0.3 \
    scikit-learn==1.3.0 \
    scipy==1.11.1 \
    joblib==1.3.1 \
    weaviate-client==3.25.3 \
    fastapi==0.103.0 \
    uvicorn==0.23.2 \
    pydantic==2.3.0 \
    redis==4.6.0 \
    psycopg2-binary==2.9.7 \
    sqlalchemy==2.0.19 \
    asyncpg==0.28.0

# ============================================================================
# Stage 3: Node.js TypeScript integration
# ============================================================================
FROM ml-deps AS ml-typescript

# Copy package files for Node.js dependencies
COPY package-ml.json package.json
COPY package-lock.json .

# Install Node.js dependencies for ML services
RUN npm ci --only=production

# Install additional ML-specific Node.js packages
RUN npm install \
    weaviate-ts-client@1.4.0 \
    @tensorflow/tfjs-node@4.10.0 \
    bull@4.11.3 \
    ioredis@5.3.2 \
    axios@1.5.0

# ============================================================================
# Stage 4: ML Services application
# ============================================================================
FROM ml-typescript AS ml-services

# Copy ML service code
COPY src/ml-services/ ./src/ml-services/
COPY src/config/ ./src/config/
COPY src/utils/ ./src/utils/

# Copy Python ML modules
COPY ml-python/ ./ml-python/

# Create ML service configuration
COPY ml-config/ ./config/

# Set environment variables
ENV PYTHONPATH=/app/ml-python:/app/src
ENV NODE_PATH=/app/node_modules
ENV ML_SERVICE_PORT=3000
ENV PYTHON_SERVICE_PORT=8000

# Create startup script
RUN cat > start-ml-services.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting ML Services..."

# Start Python ML backend
cd /app/ml-python
python -m uvicorn main:app --host 0.0.0.0 --port 8000 &
PYTHON_PID=$!

# Wait for Python service to be ready
sleep 10

# Start Node.js ML service orchestrator
cd /app
npm run start:ml &
NODE_PID=$!

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
EOF

RUN chmod +x start-ml-services.sh

# Health check for ML services
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:3000/health/ml && curl -f http://localhost:8000/health || exit 1

# Switch to ML user
USER mluser

# Expose ports
EXPOSE 3000 8000

# Start ML services
CMD ["./start-ml-services.sh"]

# ============================================================================
# Stage 5: Production ML optimizations
# ============================================================================
FROM ml-services AS ml-production

# Production environment
ENV NODE_ENV=production
ENV PYTHON_ENV=production
ENV ML_CACHE_ENABLED=true
ENV ML_MONITORING_ENABLED=true

# Optimize Python bytecode
RUN python -m compileall /app/ml-python

# Remove development dependencies
RUN pip uninstall -y pip setuptools wheel

# Security hardening
RUN rm -rf /tmp/* /var/tmp/* /root/.cache /home/mluser/.cache

USER mluser

# Production startup with resource monitoring
CMD ["./start-ml-services.sh"]