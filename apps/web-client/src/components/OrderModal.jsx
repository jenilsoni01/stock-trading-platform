import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { X, CheckCircle2, AlertCircle, Loader2, Info, Clock, ArrowRight } from 'lucide-react';

export function OrderModal({ stock, initialSide = 'BUY', onClose, onOrderCompleted }) {
  const { user, wallet, refreshWallet } = useAuth();
  const [side, setSide] = useState(initialSide);
  const [orderType, setOrderType] = useState('MARKET');
  const [quantity, setQuantity] = useState(1);
  const [currentStock, setCurrentStock] = useState(stock);
  const [priceFlash, setPriceFlash] = useState(false);
  const [limitPrice, setLimitPrice] = useState((stock.currentPricePaise / 100).toFixed(2));
  const [sharesOwned, setSharesOwned] = useState(0);
  const [loadingPosition, setLoadingPosition] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Poll live quote for real-time price updates while modal is open
  useEffect(() => {
    let isMounted = true;
    const fetchLatestQuote = async () => {
      try {
        const q = await api.getStockQuote(stock.symbol);
        if (isMounted && q && q.currentPricePaise) {
          setCurrentStock(prev => {
            if (prev.currentPricePaise !== q.currentPricePaise) {
              setPriceFlash(true);
              setTimeout(() => setPriceFlash(false), 800);
            }
            return { ...prev, ...q };
          });
        }
      } catch {
        // Ignore background polling errors
      }
    };

    fetchLatestQuote();
    const interval = setInterval(fetchLatestQuote, 1500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [stock.symbol]);

  // Fetch user's current holdings for this stock to validate SELL orders
  useEffect(() => {
    const userId = user?.id || user?.userId;
    if (userId) {
      setLoadingPosition(true);
      api.getPosition(stock.symbol, userId)
        .then(pos => {
          setSharesOwned(pos?.quantity || 0);
        })
        .catch(() => {
          setSharesOwned(0);
        })
        .finally(() => {
          setLoadingPosition(false);
        });
    }
  }, [stock.symbol, user?.id, user?.userId]);

  const livePricePaise = currentStock.currentPricePaise || stock.currentPricePaise;
  const targetLimitPaise = Math.max(1, Math.round(parseFloat(limitPrice || '0') * 100));

  const pricePerSharePaise = orderType === 'LIMIT' 
    ? targetLimitPaise
    : livePricePaise;

  const totalCostPaise = pricePerSharePaise * quantity;

  const formatInr = (paise) => {
    if (!paise && paise !== 0) return '0.00';
    return (paise / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleQuantityPreset = (qty) => {
    setQuantity(qty);
  };

  const handleLimitPricePreset = (multiplier) => {
    const newPrice = ((livePricePaise * multiplier) / 100).toFixed(2);
    setLimitPrice(newPrice);
  };

  // Limit Order Rule Analysis
  const isLimitBuyPending = orderType === 'LIMIT' && side === 'BUY' && targetLimitPaise < livePricePaise;
  const isLimitSellPending = orderType === 'LIMIT' && side === 'SELL' && targetLimitPaise > livePricePaise;
  const willExecuteImmediately = orderType === 'MARKET' || 
    (orderType === 'LIMIT' && side === 'BUY' && targetLimitPaise >= livePricePaise) ||
    (orderType === 'LIMIT' && side === 'SELL' && targetLimitPaise <= livePricePaise);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    if (orderType === 'LIMIT' && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      setError('Please enter a valid target limit price');
      return;
    }

    // BUY Validation: Check Available Wallet Balance
    if (side === 'BUY' && wallet && totalCostPaise > wallet.availableBalancePaise) {
      setError(`Insufficient wallet balance. Required: ₹${formatInr(totalCostPaise)}, Available: ₹${formatInr(wallet.availableBalancePaise)}`);
      return;
    }

    // SELL Validation: Check Shares Held in Portfolio
    if (side === 'SELL') {
      if (sharesOwned <= 0) {
        setError(`You do not own any shares of ${stock.symbol}. Buy shares before you can place a SELL order.`);
        return;
      }
      if (quantity > sharesOwned) {
        setError(`Cannot sell ${quantity} shares. You only hold ${sharesOwned} shares in your portfolio.`);
        return;
      }
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
        limitPricePaise: orderType === 'LIMIT' ? targetLimitPaise : null,
      };

      const res = await api.createOrder(payload, idempotencyKey);
      setResult(res);

      // Refresh wallet balance and position after execution or reservation
      await refreshWallet();
      if (onOrderCompleted) onOrderCompleted(res);
    } catch (err) {
      setError(err.message || 'Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  };

  const isSellDisabled = side === 'SELL' && sharesOwned <= 0;

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
          maxWidth: '500px',
          padding: '28px',
          background: '#121826',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Trade {stock.symbol}</h2>
              <span className="badge badge-neutral">{stock.sector || 'Equities'}</span>
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

        {/* Live Market Price Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: priceFlash ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '16px',
          transition: 'background 0.3s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="pulse-indicator" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>LIVE MARKET PRICE</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="mono" style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
              ₹{formatInr(livePricePaise)}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ticking</span>
          </div>
        </div>

        {/* Confirmation Screen */}
        {result ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            {result.order?.status === 'PENDING' ? (
              <>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(234, 179, 8, 0.15)',
                  color: '#fbbf24',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px auto',
                }}>
                  <Clock size={32} />
                </div>

                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
                  Limit {side} Placed in Order Book!
                </h3>

                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '18px', lineHeight: 1.5 }}>
                  {side === 'BUY'
                    ? `Limit order for ${quantity} shares placed. Cash ₹${formatInr(totalCostPaise)} is reserved in your wallet. Awaiting market price to drop to ₹${limitPrice}.`
                    : `Limit order for ${quantity} shares placed. Awaiting market price to rise to ₹${limitPrice}.`}
                </p>

                <div style={{
                  background: 'rgba(0, 0, 0, 0.35)',
                  borderRadius: '10px',
                  padding: '16px',
                  textAlign: 'left',
                  fontSize: '13px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  marginBottom: '20px',
                  border: '1px solid var(--border-color)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Order ID:</span>
                    <span className="mono">{String(result.order?.orderId || result.orderId || '').slice(0, 18)}...</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Order Type:</span>
                    <span style={{ fontWeight: 600, color: '#fbbf24' }}>LIMIT {side}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Target Limit Price:</span>
                    <span className="mono" style={{ fontWeight: 700, color: '#38bdf8' }}>₹{formatInr(targetLimitPaise)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Live Market Price:</span>
                    <span className="mono">₹{formatInr(livePricePaise)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Order Book Status:</span>
                    <span className="badge badge-warning">PENDING (Awaiting Price)</span>
                  </div>
                </div>

                <button onClick={onClose} className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '14px' }}>
                  View in Orders History
                </button>
              </>
            ) : (
              <>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: side === 'BUY' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                  color: side === 'BUY' ? '#10b981' : '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px auto',
                }}>
                  <CheckCircle2 size={34} />
                </div>

                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
                  {orderType} {side} Executed!
                </h3>

                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '18px' }}>
                  {side === 'BUY'
                    ? `Bought ${result.trade?.quantity || quantity} shares of ${stock.symbol} at live market price. Cash settled from wallet.`
                    : `Sold ${result.trade?.quantity || quantity} shares of ${stock.symbol} at live market price. ₹${formatInr(result.trade?.totalValuePaise || totalCostPaise)} credited to your wallet.`}
                </p>

                <div style={{
                  background: 'rgba(0, 0, 0, 0.35)',
                  borderRadius: '10px',
                  padding: '16px',
                  textAlign: 'left',
                  fontSize: '13px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  marginBottom: '20px',
                  border: '1px solid var(--border-color)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Order ID:</span>
                    <span className="mono">{String(result.order?.orderId || result.orderId || 'CONFIRMED').slice(0, 18)}...</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Fill Execution Price:</span>
                    <span className="mono" style={{ fontWeight: 700, color: '#ffffff' }}>
                      ₹{formatInr(result.trade?.pricePaise || result.order?.executionPricePaise || livePricePaise)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Quantity Filled:</span>
                    <span className="mono" style={{ fontWeight: 600 }}>{result.trade?.quantity || quantity} Shares</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Total Settlement:</span>
                    <span className="mono" style={{ fontWeight: 700, color: side === 'BUY' ? 'var(--danger)' : 'var(--success)' }}>
                      {side === 'BUY' ? '-' : '+'}₹{formatInr(result.trade?.totalValuePaise || result.order?.totalValuePaise || totalCostPaise)}
                    </span>
                  </div>
                </div>

                <button onClick={onClose} className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '14px' }}>
                  Done
                </button>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* BUY / SELL Switch */}
            <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => { setSide('BUY'); setError(null); }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13px',
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
                onClick={() => { setSide('SELL'); setError(null); }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13px',
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

            {/* Holdings Badge for Stock */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              border: '1px solid var(--border-color)',
            }}>
              <span style={{ color: 'var(--text-dim)' }}>Your Portfolio Holdings:</span>
              <span style={{ fontWeight: 700, color: sharesOwned > 0 ? '#38bdf8' : 'var(--text-muted)' }}>
                {sharesOwned} {sharesOwned === 1 ? 'Share' : 'Shares'} Held
              </span>
            </div>

            {/* Warn user if trying to SELL without holding shares */}
            {side === 'SELL' && sharesOwned <= 0 && (
              <div style={{
                background: 'rgba(234, 179, 8, 0.1)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#fbbf24',
                fontSize: '12px',
              }}>
                <Info size={16} />
                <span>You do not own any shares of {stock.symbol}. Buy shares first before selling.</span>
              </div>
            )}

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

            {/* Order Type Guidance */}
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', padding: '0 4px' }}>
              {orderType === 'MARKET' ? (
                <span>⚡ <strong>Market Order:</strong> Buys/sells at the real-time ticking market price at the moment you confirm.</span>
              ) : (
                <span>🎯 <strong>Limit Order:</strong> Sets a strict price ceiling (BUY) or floor (SELL). If the market hasn't reached your price, the order waits in the Order Book until it does.</span>
              )}
            </div>

            {/* Limit Price Input if LIMIT */}
            {orderType === 'LIMIT' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-dim)' }}>TARGET LIMIT PRICE (₹)</label>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Market Quote: ₹{formatInr(livePricePaise)}</span>
                </div>
                <input
                  type="number"
                  step="0.05"
                  className="input-field"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder="Enter target limit price..."
                />
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleLimitPricePreset(0.99)}
                    style={{ flex: 1, padding: '4px', fontSize: '11px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-color)', color: 'var(--text-dim)', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    -1%
                  </button>
                  <button
                    type="button"
                    onClick={() => setLimitPrice((livePricePaise / 100).toFixed(2))}
                    style={{ flex: 1, padding: '4px', fontSize: '11px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-color)', color: 'var(--text-dim)', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Current Quote
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLimitPricePreset(1.01)}
                    style={{ flex: 1, padding: '4px', fontSize: '11px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-color)', color: 'var(--text-dim)', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    +1%
                  </button>
                </div>

                {/* Educational Banner for Limit Order Status */}
                <div style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  lineHeight: 1.4,
                  background: willExecuteImmediately ? 'rgba(16, 185, 129, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                  border: '1px solid',
                  borderColor: willExecuteImmediately ? 'rgba(16, 185, 129, 0.3)' : 'rgba(234, 179, 8, 0.3)',
                  color: willExecuteImmediately ? '#10b981' : '#fbbf24',
                }}>
                  {willExecuteImmediately ? (
                    <span>⚡ <strong>Immediate Fill:</strong> Target limit ₹{limitPrice} satisfies current market ₹{formatInr(livePricePaise)}. Will execute instantly.</span>
                  ) : isLimitBuyPending ? (
                    <span>⏳ <strong>Order Book Pending:</strong> Target ₹{limitPrice} is below current market ₹{formatInr(livePricePaise)}. Will remain PENDING in Order Book until price drops to ₹{limitPrice}.</span>
                  ) : (
                    <span>⏳ <strong>Order Book Pending:</strong> Target ₹{limitPrice} is above current market ₹{formatInr(livePricePaise)}. Will remain PENDING in Order Book until price rises to ₹{limitPrice}.</span>
                  )}
                </div>
              </div>
            )}

            {/* Quantity Input with Presets */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-dim)' }}>QUANTITY (SHARES)</label>
                {side === 'SELL' && sharesOwned > 0 && (
                  <button
                    type="button"
                    onClick={() => setQuantity(sharesOwned)}
                    style={{ fontSize: '11px', color: '#38bdf8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    Max ({sharesOwned})
                  </button>
                )}
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
                {[1, 2, 5, 10, 25, 50].map((q) => (
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
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Cost Breakdown */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.35)',
              borderRadius: '10px',
              padding: '14px',
              border: '1px solid var(--border-color)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Price per Share:</span>
                <span className="mono">
                  ₹{formatInr(pricePerSharePaise)} {orderType === 'MARKET' ? '(Live)' : '(Limit)'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  {side === 'BUY' ? 'Total Settlement Required:' : 'Total Proceeds to Receive:'}
                </span>
                <span className="mono" style={{ fontWeight: 700, color: side === 'BUY' ? '#ffffff' : '#10b981' }}>
                  ₹{formatInr(totalCostPaise)}
                </span>
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
              disabled={submitting || isSellDisabled}
              className={side === 'BUY' ? 'btn btn-buy' : 'btn btn-sell'}
              style={{ 
                width: '100%', 
                padding: '14px', 
                fontSize: '14px',
                opacity: isSellDisabled ? 0.5 : 1,
                cursor: isSellDisabled ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Routing Order to Saga Orchestrator...
                </>
              ) : isSellDisabled ? (
                `No ${stock.symbol} Shares to Sell`
              ) : (
                `Confirm ${orderType} ${side} (${quantity} Shares • ₹${formatInr(totalCostPaise)})`
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
