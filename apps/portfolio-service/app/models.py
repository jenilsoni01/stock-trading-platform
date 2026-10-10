from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class TradeExecutionEvent(BaseModel):
    tradeId: str
    orderId: str
    userId: str
    symbol: str
    side: str  # BUY or SELL
    quantity: int = Field(gt=0)
    pricePaise: int = Field(ge=0)
    totalValuePaise: int = Field(ge=0)
    executedAt: Optional[str] = None


class HoldingItem(BaseModel):
    symbol: str
    quantity: int
    averageCostPaise: int
    totalInvestedPaise: int
    currentPricePaise: int
    currentValuationPaise: int
    unrealizedPnlPaise: int
    unrealizedPnlPercentage: float


class PortfolioSummaryResponse(BaseModel):
    userId: str
    totalInvestedPaise: int
    currentValuationPaise: int
    totalUnrealizedPnlPaise: int
    totalUnrealizedPnlPercentage: float
    totalRealizedPnlPaise: int
    holdingsCount: int
    lastUpdated: str


class PositionDetailResponse(BaseModel):
    userId: str
    symbol: str
    quantity: int
    averageCostPaise: int
    totalInvestedPaise: int
    currentPricePaise: int
    currentValuationPaise: int
    unrealizedPnlPaise: int
    unrealizedPnlPercentage: float
    realizedPnlPaise: int


class PerformanceResponse(BaseModel):
    userId: str
    totalRealizedPnlPaise: int
    totalTradesCount: int
    profitableTradesCount: int
    winRatePercentage: float
    realizedTrades: List[dict]
