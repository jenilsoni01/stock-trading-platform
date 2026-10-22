# ============================================
# API Gateway - Dockerfile
# Multi-stage build: Maven build → JRE runtime
# ============================================

# --- Stage 1: Build ---
FROM --platform=linux/amd64 maven:3.9.9-eclipse-temurin-17-alpine AS build
WORKDIR /app

# Cache dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B 2>/dev/null || true

# Copy source and build jar
COPY src/ ./src/
RUN mvn clean package -DskipTests -B

# --- Stage 2: Runtime ---
FROM --platform=linux/amd64 eclipse-temurin:17-jre-alpine
WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy jar
COPY --from=build /app/target/*.jar app.jar
RUN chown appuser:appgroup app.jar

USER appuser

HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=30s \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
