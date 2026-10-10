import pytest
from app.models import TradeExecutionEvent


def test_average_cost_calculation():
    # Buy 10 shares at 100
    pos = {"quantity": 10, "total_cost_paise": 1000, "average_cost_paise": 100}
    
    # Buy another 10 shares at 200
    new_qty = 10
    new_price = 200
    total_qty = pos["quantity"] + new_qty
    total_cost = pos["total_cost_paise"] + (new_qty * new_price)
    avg_cost = int(total_cost / total_qty)

    assert total_qty == 20
    assert total_cost == 3000
    assert avg_cost == 150


def test_realized_pnl_on_sell():
    # Holding 20 shares at avg cost 150
    avg_cost = 150
    sell_qty = 5
    sell_price = 180

    realized_pnl = (sell_price - avg_cost) * sell_qty
    assert realized_pnl == 150  # (180 - 150) * 5 = +150
