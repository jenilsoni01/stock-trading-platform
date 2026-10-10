import json
import redis.asyncio as aioredis
from typing import Dict, List, Optional, Any
from app.config import settings
import logging

logger = logging.getLogger("portfolio.redis")


class RedisPortfolioStore:
    def __init__(self):
        self.redis: Optional[aioredis.Redis] = None

    async def connect(self):
        self.redis = aioredis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            password=settings.REDIS_PASSWORD or None,
            db=settings.REDIS_DB,
            decode_responses=True,
        )
        await self.redis.ping()
        logger.info(f"Connected to Redis at {settings.REDIS_HOST}:{settings.REDIS_PORT}")

    async def disconnect(self):
        if self.redis:
            await self.redis.close()
            logger.info("Disconnected from Redis")

    # Idempotency
    async def is_trade_processed(self, trade_id: str) -> bool:
        if not self.redis:
            return False
        return bool(await self.redis.sismember("portfolio:processed_trades", trade_id))

    async def mark_trade_processed(self, trade_id: str):
        if self.redis:
            await self.redis.sadd("portfolio:processed_trades", trade_id)

    # Position Hash: portfolio:{userId}:positions -> {symbol: json_str}
    async def get_all_positions(self, user_id: str) -> Dict[str, Dict[str, Any]]:
        if not self.redis:
            return {}
        raw = await self.redis.hgetall(f"portfolio:{user_id}:positions")
        positions = {}
        for symbol, data_str in raw.items():
            try:
                positions[symbol] = json.loads(data_str)
            except Exception:
                pass
        return positions

    async def get_position(self, user_id: str, symbol: str) -> Optional[Dict[str, Any]]:
        if not self.redis:
            return None
        raw = await self.redis.hget(f"portfolio:{user_id}:positions", symbol)
        if raw:
            try:
                return json.loads(raw)
            except Exception:
                return None
        return None

    async def save_position(self, user_id: str, symbol: str, data: Dict[str, Any]):
        if not self.redis:
            return
        if data.get("quantity", 0) <= 0 and data.get("realized_pnl_paise", 0) == 0:
            await self.redis.hdel(f"portfolio:{user_id}:positions", symbol)
        else:
            await self.redis.hset(f"portfolio:{user_id}:positions", symbol, json.dumps(data))

    # Realized PnL
    async def get_total_realized_pnl(self, user_id: str) -> int:
        if not self.redis:
            return 0
        val = await self.redis.get(f"portfolio:{user_id}:realized_pnl")
        return int(val) if val else 0

    async def increment_realized_pnl(self, user_id: str, amount_paise: int):
        if self.redis:
            await self.redis.incrby(f"portfolio:{user_id}:realized_pnl", amount_paise)

    # Trade History for performance tracking
    async def record_user_trade(self, user_id: str, trade_data: Dict[str, Any]):
        if self.redis:
            await self.redis.lpush(f"portfolio:{user_id}:trades", json.dumps(trade_data))
            await self.redis.ltrim(f"portfolio:{user_id}:trades", 0, 99)  # Keep latest 100

    async def get_user_trades(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        if not self.redis:
            return []
        items = await self.redis.lrange(f"portfolio:{user_id}:trades", 0, limit - 1)
        trades = []
        for item in items:
            try:
                trades.append(json.loads(item))
            except Exception:
                pass
        return trades


redis_store = RedisPortfolioStore()
