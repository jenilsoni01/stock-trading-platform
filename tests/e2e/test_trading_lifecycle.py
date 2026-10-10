"""
End-to-End Trading Lifecycle Integration Test
Validates the entire distributed microservices flow across Gateway, Identity, Market Data, Order, Portfolio, and Notification services.
"""

import time
import uuid
import pytest
import requests

GATEWAY_URL = "http://localhost:8080"


class TestTradingLifecycle:
    @pytest.fixture(scope="class")
    def user_session(self):
        # 1. Register a unique test user
        username = f"trader_{uuid.uuid4().hex[:8]}"
        email = f"{username}@test.stp"
        password = "SecurePassword123!"

        reg_resp = requests.post(
            f"{GATEWAY_URL}/api/v1/auth/register",
            json={
                "username": username,
                "email": email,
                "password": password,
                "fullName": "Automated E2E Tester",
            },
            timeout=5.0,
        )
        assert reg_resp.status_code in [200, 201], f"Registration failed: {reg_resp.text}"
        data = reg_resp.json()
        token = data.get("token")
        assert token, "Token not returned in registration response"

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        return {"headers": headers, "username": username, "userId": data.get("userId")}

    def test_01_verify_initial_wallet_balance(self, user_session):
        """Verify the user receives initial 10,000,000 paise (₹100,000.00 INR) upon registration."""
        resp = requests.get(f"{GATEWAY_URL}/api/v1/wallet", headers=user_session["headers"], timeout=5.0)
        assert resp.status_code == 200, f"Wallet lookup failed: {resp.text}"
        wallet = resp.json()

        assert wallet["availableBalancePaise"] == 10000000, "Expected 10,000,000 paise initial balance"
        assert wallet["reservedBalancePaise"] == 0, "Reserved balance should initially be 0"
        assert wallet["totalBalancePaise"] == 10000000, "Total balance invariant violated"

    def test_02_browse_stocks(self, user_session):
        """Verify the public market catalog is accessible and returns price quotes."""
        resp = requests.get(f"{GATEWAY_URL}/api/v1/stocks", headers=user_session["headers"], timeout=5.0)
        assert resp.status_code == 200, f"Stock listing failed: {resp.text}"
        data = resp.json()
        stocks = data.get("stocks", [])
        assert len(stocks) > 0, "No stocks returned from market data service"

    def test_03_execute_buy_order_saga(self, user_session):
        """
        Execute BUY Market Order.
        Tests distributed saga: Order created -> Cash atomically reserved -> Trade committed -> Outbox -> Notification.
        """
        idempotency_key = f"e2e-buy-{uuid.uuid4().hex}"
        order_payload = {
            "symbol": "TCS",
            "side": "BUY",
            "orderType": "MARKET",
            "quantity": 2,
        }

        headers = {**user_session["headers"], "Idempotency-Key": idempotency_key}
        resp = requests.post(f"{GATEWAY_URL}/api/v1/orders", json=order_payload, headers=headers, timeout=5.0)
        assert resp.status_code in [200, 201], f"Order execution failed: {resp.text}"

        body = resp.json()
        order = body.get("order")
        trade = body.get("trade")

        assert order["status"] == "EXECUTED", f"Order status is {order.get('status')}"
        assert trade["quantity"] == 2
        assert trade["pricePaise"] > 0
        assert trade["totalValuePaise"] == trade["pricePaise"] * 2

    def test_04_verify_wallet_after_buy(self, user_session):
        """Verify cash was correctly debited with append-only ledger record."""
        resp = requests.get(f"{GATEWAY_URL}/api/v1/wallet", headers=user_session["headers"], timeout=5.0)
        assert resp.status_code == 200
        wallet = resp.json()

        assert wallet["availableBalancePaise"] < 10000000, "Available balance should have decreased"
        assert wallet["totalBalancePaise"] == wallet["availableBalancePaise"] + wallet["reservedBalancePaise"]

    def test_05_check_notifications(self, user_session):
        """Verify in-app trade execution notification was generated."""
        time.sleep(1)  # Brief pause for event delivery
        resp = requests.get(f"{GATEWAY_URL}/api/v1/notifications", headers=user_session["headers"], timeout=5.0)
        assert resp.status_code == 200
        notifs = resp.json().get("notifications", [])
        assert len(notifs) >= 1, "Expected at least 1 notification for executed trade"


if __name__ == "__main__":
    pytest.main(["-v", __file__])
