# ============================================
# Order Service - Dockerfile
# Multi-stage build: C++ build → minimal runtime
# ============================================

# --- Stage 1: Build ---
FROM ubuntu:22.04 AS build

ENV DEBIAN_FRONTEND=noninteractive

# Install compiler, CMake, Drogon dependencies, and MariaDB/MySQL async client dev libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    git \
    libjsoncpp-dev \
    uuid-dev \
    zlib1g-dev \
    libssl-dev \
    libmariadb-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Drogon framework
WORKDIR /tmp
RUN git clone https://github.com/drogonframework/drogon.git && \
    cd drogon && \
    git checkout v1.9.3 && \
    git submodule update --init && \
    mkdir build && cd build && \
    cmake .. -DCMAKE_BUILD_TYPE=Release -DBUILD_MYSQL=ON -DBUILD_POSTGRESQL=OFF -DBUILD_SQLITE=OFF -DBUILD_REDIS=OFF -DBUILD_EXAMPLES=OFF -DBUILD_TESTING=OFF && \
    make -j4 && \
    make install && \
    cd /tmp && rm -rf drogon

# Build Order Service
WORKDIR /app
COPY . .
RUN mkdir build && cd build && \
    cmake .. -DCMAKE_BUILD_TYPE=Release && \
    make -j4

# --- Stage 2: Runtime ---
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install runtime shared libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    libjsoncpp25 \
    libuuid1 \
    zlib1g \
    libssl3 \
    libmariadb3 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built binary, config, and migrations
COPY --from=build /app/build/order-service /app/order-service
COPY --from=build /app/config.json /app/config.json
COPY --from=build /app/migrations /app/migrations

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
    CMD curl -f http://localhost:8083/health || exit 1

EXPOSE 8083

ENTRYPOINT ["./order-service"]
