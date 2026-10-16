import React, { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { X, CheckCircle2, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

export function OrderModal({ stock, initialSide = 'BUY', onClose, onOrderCompleted }) {
  const { user, wallet, refreshWallet } = useAuth();
  const [side, setSide] = useState(initialSide);
  const [orderType, setOrderType] = useState('MARKET');
  const [quantity, setQuantity] = useState(1);
  const [limitPrice, setLimitPrice] = useState((stock.currentPricePaise / 100).toFixed(2));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const pricePerSharePaise = orderType === 'LIMIT' 
    ? Math.round(parseFloat(limitPrice || '0') * 100) 
    : stock.currentPricePaise;

  const totalCostPaise = pricePerSharePaise * quantity;

  const formatInr = (paise) => {
    return (paise / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleQuantityPreset = (qty) => {
    setQuantity(qty);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    if (orderType === 'LIMIT' && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      setError('Please enter a valid limit price');
      return;
    }

    if (side === 'BUY' && wallet && totalCostPaise > wallet.availableBalancePaise) {
      setError(`Insufficient available balance (Required: ₹${formatInr(totalCostPaise)}, Available: ₹${formatInr(wallet.availableBalancePaise)})`);
      return;
    }

    setSubmitting(true);

    try {
      const userId = user?.id || user?.userId || 'trader';
      const idempotencyKey = `ord-${String(userId).slice(0, 8)}-${Date.now()}`;
      const payload = {
        userId: userId,
        symbol: stock.symbol,
        side: side,
        orderType: orderType,
        quantity: parseInt(quantity, 10),
        limitPricePaise: orderType === 'LIMIT' ? pricePerSharePaise : null,
      };

      const res = await api.createOrder(payload, idempotencyKey);
      setResult(res);
      await refreshWallet();
      if (onOrderCompleted) onOrderCompleted(res);
    } catch (err) {
      setError(err.message || 'Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px',
    }} onClick={onClose}>
      <div 
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '28px',
          background: '#121826',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Trade {stock.symbol}</h2>
              <span className="badge badge-neutral">{stock.sector}</span>
            </div>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{stock.name}</span>
          </div>
          <button 
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '6px', borderRadius: '50%' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Success Feedback View */}
        {result ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}>
              <CheckCircle2 size={36} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
              Order Executed Successfully!
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
              Distributed Saga completed: Cash reserved, trade recorded in MySQL, and ledger updated.
            </p>

            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '10px',
              padding: '16px',
              textAlign: 'left',
              fontSize: '13px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>Order ID:</span>
                <span className="mono">{String(result.order?.orderId || result.orderId || 'CONFIRMED').slice(0, 18)}...</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>Trade Price:</span>
                <span className="mono" style={{ fontWeight: 600 }}>₹{formatInr(result.trade?.pricePaise || stock.currentPricePaise)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>Total Settlement:</span>
                <span className="mono" style={{ fontWeight: 700, color: '#10b981' }}>₹{formatInr(result.trade?.totalValuePaise || totalCostPaise)}</span>
              </div>
            </div>

            <button onClick={onClose} className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* BUY / SELL Switch */}
            <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => setSide('BUY')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  background: side === 'BUY' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                  color: side === 'BUY' ? '#ffffff' : 'var(--text-muted)',
                  transition: 'all 0.15s ease',
                }}
              >
                BUY
              </button>
              <button
                type="button"
                onClick={() => setSide('SELL')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  background: side === 'SELL' ? 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)' : 'transparent',
                  color: side === 'SELL' ? '#ffffff' : 'var(--text-muted)',
                  transition: 'all 0.15s ease',
                }}
              >
                SELL
              </button>
            </div>

            {/* MARKET / LIMIT Switch */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setOrderType('MARKET')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: orderType === 'MARKET' ? '#38bdf8' : 'var(--border-color)',
                  background: orderType === 'MARKET' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: orderType === 'MARKET' ? '#38bdf8' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                Market Order
              </button>
              <button
                type="button"
                onClick={() => setOrderType('LIMIT')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: orderType === 'LIMIT' ? '#38bdf8' : 'var(--border-color)',
                  background: orderType === 'LIMIT' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: orderType === 'LIMIT' ? '#38bdf8' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                Limit Order
              </button>
            </div>

            {/* Limit Price Input if LIMIT */}
            {orderType === 'LIMIT' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '6px' }}>
                  LIMIT PRICE (₹)
                </label>
                <input
                  type="number"
                  step="0.05"
                  className="input-field"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder="Enter target price..."
                />
              </div>
            )}

            {/* Quantity Input with Presets */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-dim)' }}>QUANTITY (SHARES)</label>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Lot size: 1</span>
              </div>
              <input
                type="number"
                min="1"
                step="1"
                className="input-field"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value || '1', 10)))}
              />
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                {[1, 5, 10, 25, 50, 100].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleQuantityPreset(q)}
                    style={{
                      flex: 1,
                      padding: '4px',
                      borderRadius: '6px',
                      background: quantity === q ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid',
                      borderColor: quantity === q ? '#38bdf8' : 'var(--border-color)',
                      color: quantity === q ? '#38bdf8' : 'var(--text-dim)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    +{q}
                  </button>
                ))}
              </div>
            </div>

            {/* Cost Breakdown & Invariants Banner */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '10px',
              padding: '14px',
              border: '1px solid var(--border-color)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Unit Price:</span>
                <span className="mono">₹{formatInr(pricePerSharePaise)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Estimated Total:</span>
                <span className="mono" style={{ fontWeight: 700, color: '#ffffff' }}>₹{formatInr(totalCostPaise)}</span>
              </div>
              {wallet && side === 'BUY' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '6px', marginTop: '6px' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Available Cash:</span>
                  <span className="mono" style={{ color: '#10b981' }}>₹{formatInr(wallet.availableBalancePaise)}</span>
                </div>
              )}
            </div>

            {/* Error banner */}
            {error && (
              <div style={{
                background: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                borderRadius: '8px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--danger)',
                fontSize: '13px',
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className={side === 'BUY' ? 'btn btn-buy' : 'btn btn-sell'}
              style={{ width: '100%', padding: '14px', fontSize: '15px' }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Orchestrating Saga...
                </>
              ) : (
                `Confirm ${side} ${quantity} ${stock.symbol} (₹${formatInr(totalCostPaise)})`
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
