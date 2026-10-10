from fastapi import APIRouter, Response
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health():
    return {"status": "UP", "service": "portfolio-service"}


@router.get("/ready")
async def ready():
    return {"status": "READY", "service": "portfolio-service"}


@router.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
