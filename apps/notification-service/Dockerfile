# ============================================
# Notification Service - Dockerfile
# Node.js 20 Alpine with non-root user
# ============================================

FROM node:20-alpine

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy package descriptors
COPY package*.json ./
RUN npm install --omit=dev

# Copy source code
COPY src/ ./src/

# Create non-root user
USER node

HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
    CMD curl -f http://localhost:8085/health || exit 1

EXPOSE 8085

ENTRYPOINT ["node", "src/index.js"]
