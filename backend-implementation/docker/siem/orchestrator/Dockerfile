# ============================================================================
# SECURITY ORCHESTRATOR DOCKERFILE
# ============================================================================
#
# Container for automated security response and orchestration
# Real-time security event processing and incident response
#
# Created by: DEVOPS-AGENT - TIER 1 Advanced Threat Protection
# Date: 2025-08-14
# Version: 1.0.0
# ============================================================================

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/
COPY config/ ./config/
COPY playbooks/ ./playbooks/

# Create logs directory
RUN mkdir -p /app/logs

# Set permissions
RUN chmod +x src/*.py

# Expose API port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Run the security orchestrator
CMD ["python", "src/orchestrator.py"]