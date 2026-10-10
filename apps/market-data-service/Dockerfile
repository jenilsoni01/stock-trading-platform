# ============================================
# Market Data Service - Dockerfile
# Multi-stage build: Go build → minimal runtime
# ============================================

# --- Stage 1: Build ---
FROM golang:1.22-alpine AS build
WORKDIR /app

# Cache dependencies
COPY go.mod go.sum* ./
RUN go mod download 2>/dev/null || true

# Copy source and build
COPY . .
RUN go mod tidy && CGO_ENABLED=0 GOOS=linux go build -o market-data-service ./cmd/server

# --- Stage 2: Runtime ---
FROM alpine:3.20
WORKDIR /app

# Install ca-certificates for HTTPS and timezone data
RUN apk --no-cache add ca-certificates tzdata

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy binary
COPY --from=build /app/market-data-service .

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
    CMD wget -qO- http://localhost:8082/health || exit 1

USER appuser

EXPOSE 8082 50051

ENTRYPOINT ["./market-data-service"]
