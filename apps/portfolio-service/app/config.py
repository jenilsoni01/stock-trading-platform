import os
from pydantic_settings import BaseSettings
from typing import Optional

infra_host = os.getenv("INFRA_HOST", "localhost")


class Settings(BaseSettings):
    APP_NAME: str = "portfolio-service"
    PORT: int = int(os.getenv("PORT", os.getenv("PORTFOLIO_SERVICE_PORT", "8084")))
    REDIS_HOST: str = os.getenv("REDIS_HOST", infra_host)
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_PASSWORD: Optional[str] = os.getenv("REDIS_PASSWORD", "dev_redis_pass")
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
    MARKET_DATA_URL: str = os.getenv("MARKET_DATA_URL", f"http://{infra_host}:8082")
    KAFKA_BOOTSTRAP_SERVERS: str = os.getenv("KAFKA_BOOTSTRAP_SERVERS", f"{infra_host}:9092")
    KAFKA_GROUP_ID: str = os.getenv("KAFKA_GROUP_ID", "portfolio-service-group")
    KAFKA_TOPIC_TRADES: str = os.getenv("KAFKA_TOPIC_TRADES", "stp.trades")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-jwt-secret-change-me-in-production-this-must-be-at-least-256-bits-long-for-hs256")

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
