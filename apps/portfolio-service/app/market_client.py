import httpx
from typing import Dict, Optional
from app.config import settings
import logging

logger = logging.getLogger("portfolio.market")


class MarketDataClient:
    def __init__(self):
        self.base_url = settings.MARKET_DATA_URL

    async def get_current_price(self, symbol: str) -> Optional[int]:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{self.base_url}/api/v1/stocks/{symbol}/quote")
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("currentPricePaise")
        except Exception as e:
            logger.warning(f"Failed to fetch price for {symbol}: {e}")
        return None

    async def get_all_prices(self) -> Dict[str, int]:
        prices = {}
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{self.base_url}/api/v1/stocks")
                if resp.status_code == 200:
                    stocks = resp.json().get("stocks", [])
                    for s in stocks:
                        prices[s["symbol"]] = s.get("currentPricePaise", 0)
        except Exception as e:
            logger.warning(f"Failed to fetch stock list: {e}")
        return prices


market_client = MarketDataClient()
