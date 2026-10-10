# ============================================
# Identity & Wallet Service - Dockerfile
# Multi-stage build: Maven build → JRE runtime
# ============================================

# --- Stage 1: Build ---
FROM maven:3.9.9-eclipse-temurin-17-alpine AS build
WORKDIR /app

# Copy source and build jar
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests -B

# --- Stage 2: Runtime ---
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Install curl
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy built jar
COPY --from=build /app/target/*.jar app.jar

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=30s \
    CMD curl -f http://localhost:8081/actuator/health || exit 1

# Switch to non-root
USER appuser

EXPOSE 8081

ENTRYPOINT ["java", "-jar", "app.jar"]
