from fastapi import APIRouter, HTTPException
from app.models import TradeExecutionEvent
from app.portfolio_service import portfolio_service
import logging

logger = logging.getLogger("portfolio.internal")

router = APIRouter(prefix="/internal/v1/portfolio", tags=["Internal"])


@router.post("/trades")
async def ingest_trade_event(event: TradeExecutionEvent):
    """
    Direct trade ingestion endpoint for synchronous/fallback integration
    when Kafka is being replayed or bypassed in development.
    """
    success = await portfolio_service.process_trade(event)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to process trade projection")
    return {"status": "PROCESSED", "tradeId": event.tradeId}


@router.post("/rebuild/{user_id}")
async def rebuild_portfolio(user_id: str):
    """
    Rebuild user portfolio view
    """
    summary = await portfolio_service.get_portfolio_summary(user_id)
    return {"status": "REBUILT", "summary": summary}
