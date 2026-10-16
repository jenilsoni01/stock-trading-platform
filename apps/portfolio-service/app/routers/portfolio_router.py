from fastapi import APIRouter, Header, HTTPException, Query, Depends
from typing import Optional, List
from app.models import (
    PortfolioSummaryResponse,
    HoldingItem,
    PositionDetailResponse,
    PerformanceResponse,
)
from app.portfolio_service import portfolio_service
import logging

logger = logging.getLogger("portfolio.router")

router = APIRouter(prefix="/api/v1/portfolio", tags=["Portfolio"])


def get_authenticated_user_id(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    user_id: Optional[str] = Query(None, alias="userId"),
) -> str:
    uid = x_user_id or user_id
    if not uid:
        raise HTTPException(status_code=401, detail="Authentication required: missing user identity")
    return uid


@router.get("", response_model=PortfolioSummaryResponse)
async def get_portfolio_summary(
    user_id: str = Depends(get_authenticated_user_id)
):
    return await portfolio_service.get_portfolio_summary(user_id)


@router.get("/holdings", response_model=List[HoldingItem])
async def get_holdings(
    user_id: str = Depends(get_authenticated_user_id)
):
    return await portfolio_service.get_holdings(user_id)


@router.get("/positions/{symbol}", response_model=PositionDetailResponse)
async def get_position_detail(
    symbol: str,
    user_id: str = Depends(get_authenticated_user_id)
):
    pos = await portfolio_service.get_position_detail(user_id, symbol)
    if not pos:
        raise HTTPException(status_code=404, detail=f"No position found for symbol {symbol}")
    return pos


@router.get("/performance", response_model=PerformanceResponse)
async def get_performance(
    user_id: str = Depends(get_authenticated_user_id)
):
    return await portfolio_service.get_performance(user_id)
