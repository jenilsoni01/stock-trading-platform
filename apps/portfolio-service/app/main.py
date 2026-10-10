from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.redis_client import redis_store
from app.routers.portfolio_router import router as portfolio_router
from app.routers.internal_router import router as internal_router
from app.routers.health_router import router as health_router
import logging
import asyncio

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("portfolio.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME}...")
    try:
        await redis_store.connect()
    except Exception as e:
        logger.warning(f"Initial Redis connection failed: {e}. Will retry on demand.")
    yield
    logger.info(f"Shutting down {settings.APP_NAME}...")
    await redis_store.disconnect()


app = FastAPI(
    title="Stock Trading Platform - Portfolio Service",
    version="1.0.0",
    description="CQRS read-side materialized portfolio projection service with real-time valuation and P&L analytics",
    lifespan=lifespan,
)

# CORS middleware for direct local debugging
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health_router)
app.include_router(portfolio_router)
app.include_router(internal_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=False)
