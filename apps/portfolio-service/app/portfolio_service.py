from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from app.models import (
    TradeExecutionEvent,
    HoldingItem,
    PortfolioSummaryResponse,
    PositionDetailResponse,
    PerformanceResponse,
)
from app.redis_client import redis_store
from app.market_client import market_client
import logging

logger = logging.getLogger("portfolio.service")


class PortfolioService:
    async def process_trade(self, trade: TradeExecutionEvent) -> bool:
        # Check idempotency
        if await redis_store.is_trade_processed(trade.tradeId):
            logger.info(f"Trade {trade.tradeId} already processed (idempotent skip)")
            return True

        user_id = trade.userId
        symbol = trade.symbol.upper()
        side = trade.side.upper()
        qty = trade.quantity
        price = trade.pricePaise

        pos = await redis_store.get_position(user_id, symbol) or {
            "quantity": 0,
            "total_cost_paise": 0,
            "average_cost_paise": 0,
            "realized_pnl_paise": 0,
        }

        current_qty = pos.get("quantity", 0)
        current_total_cost = pos.get("total_cost_paise", 0)
        current_avg_cost = pos.get("average_cost_paise", 0)
        pos_realized_pnl = pos.get("realized_pnl_paise", 0)

        trade_realized_pnl = 0

        if side == "BUY":
            new_qty = current_qty + qty
            trade_cost = qty * price
            new_total_cost = current_total_cost + trade_cost
            new_avg_cost = int(new_total_cost / new_qty) if new_qty > 0 else 0

            pos["quantity"] = new_qty
            pos["total_cost_paise"] = new_total_cost
            pos["average_cost_paise"] = new_avg_cost

        elif side == "SELL":
            cost_basis_per_share = current_avg_cost if current_avg_cost > 0 else price
            trade_realized_pnl = int((price - cost_basis_per_share) * qty)
            
            new_qty = max(0, current_qty - qty)
            new_total_cost = int(new_qty * cost_basis_per_share)
            new_avg_cost = cost_basis_per_share if new_qty > 0 else 0

            pos["quantity"] = new_qty
            pos["total_cost_paise"] = new_total_cost
            pos["average_cost_paise"] = new_avg_cost
            pos["realized_pnl_paise"] = pos_realized_pnl + trade_realized_pnl

            # Increment global user realized PnL
            await redis_store.increment_realized_pnl(user_id, trade_realized_pnl)

        await redis_store.save_position(user_id, symbol, pos)
        await redis_store.mark_trade_processed(trade.tradeId)

        # Record trade in user's history
        trade_record = {
            "tradeId": trade.tradeId,
            "orderId": trade.orderId,
            "symbol": symbol,
            "side": side,
            "quantity": qty,
            "pricePaise": price,
            "totalValuePaise": trade.totalValuePaise,
            "realizedPnlPaise": trade_realized_pnl,
            "executedAt": trade.executedAt or datetime.now(timezone.utc).isoformat(),
        }
        await redis_store.record_user_trade(user_id, trade_record)

        logger.info(f"Processed trade {trade.tradeId} for user {user_id}: {side} {qty} {symbol} @ {price} paise")
        return True

    async def get_portfolio_summary(self, user_id: str) -> PortfolioSummaryResponse:
        positions = await redis_store.get_all_positions(user_id)
        prices = await market_client.get_all_prices()
        total_realized = await redis_store.get_total_realized_pnl(user_id)

        total_invested = 0
        total_valuation = 0
        active_holdings_count = 0

        for symbol, pos in positions.items():
            qty = pos.get("quantity", 0)
            if qty > 0:
                active_holdings_count += 1
                total_cost = pos.get("total_cost_paise", 0)
                total_invested += total_cost
                
                cur_price = prices.get(symbol, pos.get("average_cost_paise", 0))
                val = qty * cur_price
                total_valuation += val

        total_unrealized_pnl = total_valuation - total_invested
        unrealized_pct = round((total_unrealized_pnl / total_invested * 100), 2) if total_invested > 0 else 0.0

        return PortfolioSummaryResponse(
            userId=user_id,
            totalInvestedPaise=total_invested,
            currentValuationPaise=total_valuation,
            totalUnrealizedPnlPaise=total_unrealized_pnl,
            totalUnrealizedPnlPercentage=unrealized_pct,
            totalRealizedPnlPaise=total_realized,
            holdingsCount=active_holdings_count,
            lastUpdated=datetime.now(timezone.utc).isoformat(),
        )

    async def get_holdings(self, user_id: str) -> List[HoldingItem]:
        positions = await redis_store.get_all_positions(user_id)
        prices = await market_client.get_all_prices()
        holdings = []

        for symbol, pos in positions.items():
            qty = pos.get("quantity", 0)
            if qty <= 0:
                continue

            avg_cost = pos.get("average_cost_paise", 0)
            total_invested = pos.get("total_cost_paise", 0)
            cur_price = prices.get(symbol, avg_cost)
            val = qty * cur_price
            unrealized_pnl = val - total_invested
            unrealized_pct = round((unrealized_pnl / total_invested * 100), 2) if total_invested > 0 else 0.0

            holdings.append(
                HoldingItem(
                    symbol=symbol,
                    quantity=qty,
                    averageCostPaise=avg_cost,
                    totalInvestedPaise=total_invested,
                    currentPricePaise=cur_price,
                    currentValuationPaise=val,
                    unrealizedPnlPaise=unrealized_pnl,
                    unrealizedPnlPercentage=unrealized_pct,
                )
            )

        return holdings

    async def get_position_detail(self, user_id: str, symbol: str) -> Optional[PositionDetailResponse]:
        symbol = symbol.upper()
        pos = await redis_store.get_position(user_id, symbol)
        if not pos:
            return None

        qty = pos.get("quantity", 0)
        avg_cost = pos.get("average_cost_paise", 0)
        total_invested = pos.get("total_cost_paise", 0)
        realized_pnl = pos.get("realized_pnl_paise", 0)

        cur_price = await market_client.get_current_price(symbol) or avg_cost
        val = qty * cur_price
        unrealized_pnl = val - total_invested
        unrealized_pct = round((unrealized_pnl / total_invested * 100), 2) if total_invested > 0 else 0.0

        return PositionDetailResponse(
            userId=user_id,
            symbol=symbol,
            quantity=qty,
            averageCostPaise=avg_cost,
            totalInvestedPaise=total_invested,
            currentPricePaise=cur_price,
            currentValuationPaise=val,
            unrealizedPnlPaise=unrealized_pnl,
            unrealizedPnlPercentage=unrealized_pct,
            realizedPnlPaise=realized_pnl,
        )

    async def get_performance(self, user_id: str) -> PerformanceResponse:
        total_realized = await redis_store.get_total_realized_pnl(user_id)
        trades = await redis_store.get_user_trades(user_id, limit=100)

        sell_trades = [t for t in trades if t.get("side") == "SELL"]
        profitable_trades = [t for t in sell_trades if t.get("realizedPnlPaise", 0) > 0]

        win_rate = (
            round((len(profitable_trades) / len(sell_trades) * 100), 2)
            if sell_trades
            else 0.0
        )

        return PerformanceResponse(
            userId=user_id,
            totalRealizedPnlPaise=total_realized,
            totalTradesCount=len(trades),
            profitableTradesCount=len(profitable_trades),
            winRatePercentage=win_rate,
            realizedTrades=trades,
        )


portfolio_service = PortfolioService()
