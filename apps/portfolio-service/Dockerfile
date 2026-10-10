# ============================================
# Portfolio Service - Dockerfile
# Python 3.11 slim runtime with non-root user
# ============================================

FROM python:3.11-slim

WORKDIR /app

# Install build dependencies if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY app/ ./app/

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
    CMD curl -f http://localhost:8084/health || exit 1

EXPOSE 8084

ENTRYPOINT ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8084"]
