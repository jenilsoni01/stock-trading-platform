import React, { useState } from 'react';
import { 
  BookOpen, 
  TrendingUp, 
  ShieldCheck, 
  Cpu, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  Zap, 
  HelpCircle,
  Clock,
  Lock,
  Database,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export function TradingGuideView({ onSelectStockForOrder }) {
  const [activeGuideTab, setActiveGuideTab] = useState('orders'); // 'orders' | 'saga' | 'ledger'
  const [simSide, setSimSide] = useState('BUY');
  const [simType, setSimType] = useState('LIMIT');
  const [simMarketPrice, setSimMarketPrice] = useState(2450);
  const [simLimitPrice, setSimLimitPrice] = useState(2500);

  // Evaluate interactive order simulation
  const evaluateOrder = () => {
    if (simType === 'MARKET') {
      return {
        status: 'EXECUTED',
        execPrice: simMarketPrice,
        reason: 'Market orders execute immediately at current prevailing quote.',
        color: '#10b981',
      };
    }

    // LIMIT BUY: executed only if market <= limit
    if (simSide === 'BUY') {
      if (simMarketPrice <= simLimitPrice) {
        return {
          status: 'EXECUTED',
          execPrice: simMarketPrice,
          reason: `Market price (₹${simMarketPrice}) is ≤ your limit ceiling (₹${simLimitPrice}). Executed at best price ₹${simMarketPrice}!`,
          color: '#10b981',
        };
      } else {
        return {
          status: 'REJECTED / WAITING',
          execPrice: null,
          reason: `LIMIT_PRICE_EXCEEDED: Current price (₹${simMarketPrice}) exceeds your buy ceiling (₹${simLimitPrice}). Engine protects your capital!`,
          color: '#f43f5e',
        };
      }
    }

    // LIMIT SELL: executed only if market >= limit
    if (simSide === 'SELL') {
      if (simMarketPrice >= simLimitPrice) {
        return {
          status: 'EXECUTED',
          execPrice: simMarketPrice,
          reason: `Market price (₹${simMarketPrice}) is ≥ your limit floor (₹${simLimitPrice}). Executed at premium price ₹${simMarketPrice}!`,
          color: '#10b981',
        };
      } else {
        return {
          status: 'REJECTED / WAITING',
          execPrice: null,
          reason: `LIMIT_PRICE_UNMET: Current price (₹${simMarketPrice}) is below your sell floor (₹${simLimitPrice}). Protects your profit floor!`,
          color: '#f43f5e',
        };
      }
    }
  };

  const simResult = evaluateOrder();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div className="glass-card" style={{ padding: '28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <BookOpen size={20} color="#38bdf8" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.05em' }}>
                TRADING ENGINE KNOWLEDGE BASE & ACADEMY
              </span>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>
              How Trading Orders & Microservices Work
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '750px' }}>
              Master the execution mechanics of Market Orders, Limit Orders, Distributed SAGA Orchestration, and Double-Entry Integer Paise Ledgers.
            </p>
          </div>

          {/* Guide navigation tabs */}
          <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '12px', padding: '4px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setActiveGuideTab('orders')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px',
                background: activeGuideTab === 'orders' ? 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)' : 'transparent',
                color: activeGuideTab === 'orders' ? '#ffffff' : 'var(--text-muted)',
              }}
            >
              Order Types & Logic
            </button>
            <button
              onClick={() => setActiveGuideTab('saga')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px',
                background: activeGuideTab === 'saga' ? 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)' : 'transparent',
                color: activeGuideTab === 'saga' ? '#ffffff' : 'var(--text-muted)',
              }}
            >
              Distributed SAGA Pattern
            </button>
            <button
              onClick={() => setActiveGuideTab('ledger')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px',
                background: activeGuideTab === 'ledger' ? 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)' : 'transparent',
                color: activeGuideTab === 'ledger' ? '#ffffff' : 'var(--text-muted)',
              }}
            >
              Financial Invariants & Ledger
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Order Types & Interactive Simulator */}
      {activeGuideTab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Interactive Simulator Card */}
          <div className="glass-card" style={{ padding: '28px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Zap size={22} color="#38bdf8" />
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Interactive Order Rule Simulator</h2>
              <span className="badge badge-neutral" style={{ marginLeft: 'auto' }}>Live Rule Evaluator</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              {/* Simulator Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                    1. SELECT SIDE
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setSimSide('BUY')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 700,
                        background: simSide === 'BUY' ? 'var(--success)' : 'rgba(255, 255, 255, 0.05)',
                        color: '#ffffff',
                      }}
                    >
                      BUY ORDER
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimSide('SELL')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 700,
                        background: simSide === 'SELL' ? 'var(--danger)' : 'rgba(255, 255, 255, 0.05)',
                        color: '#ffffff',
                      }}
                    >
                      SELL ORDER
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                    2. ORDER TYPE
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setSimType('MARKET')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 700,
                        background: simType === 'MARKET' ? '#38bdf8' : 'rgba(255, 255, 255, 0.05)',
                        color: simType === 'MARKET' ? '#000000' : '#ffffff',
                      }}
                    >
                      MARKET ORDER
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimType('LIMIT')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 700,
                        background: simType === 'LIMIT' ? '#38bdf8' : 'rgba(255, 255, 255, 0.05)',
                        color: simType === 'LIMIT' ? '#000000' : '#ffffff',
                      }}
                    >
                      LIMIT ORDER
                    </button>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>
                      CURRENT MARKET PRICE
                    </label>
                    <span className="mono" style={{ fontWeight: 700, color: '#38bdf8' }}>₹{simMarketPrice}</span>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="5000"
                    step="25"
                    value={simMarketPrice}
                    onChange={(e) => setSimMarketPrice(parseInt(e.target.value, 10))}
                    style={{ width: '100%', accentColor: '#38bdf8' }}
                  />
                </div>

                {simType === 'LIMIT' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>
                        YOUR LIMIT PRICE (CEILING / FLOOR)
                      </label>
                      <span className="mono" style={{ fontWeight: 700, color: '#f59e0b' }}>₹{simLimitPrice}</span>
                    </div>
                    <input
                      type="range"
                      min="1000"
                      max="5000"
                      step="25"
                      value={simLimitPrice}
                      onChange={(e) => setSimLimitPrice(parseInt(e.target.value, 10))}
                      style={{ width: '100%', accentColor: '#f59e0b' }}
                    />
                  </div>
                )}
              </div>

              {/* Simulation Result Preview */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.45)',
                borderRadius: '12px',
                padding: '24px',
                border: `1px solid ${simResult.color}`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    {simResult.status === 'EXECUTED' ? (
                      <CheckCircle2 size={24} color={simResult.color} />
                    ) : (
                      <XCircle size={24} color={simResult.color} />
                    )}
                    <span style={{ fontSize: '18px', fontWeight: 800, color: simResult.color }}>
                      ENGINE OUTCOME: {simResult.status}
                    </span>
                  </div>

                  <p style={{ color: '#f1f5f9', fontSize: '14px', lineHeight: 1.6, marginBottom: '16px' }}>
                    {simResult.reason}
                  </p>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block' }}>EXECUTION PRICE</span>
                    <span className="mono" style={{ fontSize: '16px', fontWeight: 700, color: simResult.color }}>
                      {simResult.execPrice ? `₹${simResult.execPrice}.00` : 'None (Protected)'}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block' }}>SAGA TRANSITION</span>
                    <span className="mono" style={{ fontSize: '13px', fontWeight: 600 }}>
                      {simResult.status === 'EXECUTED' ? 'RESERVE → CAPTURE' : 'VALIDATE → REJECT'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Explanations Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {/* Market Order Card */}
            <div className="glass-card" style={{ padding: '28px', borderTop: '4px solid #38bdf8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  <TrendingUp size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Market Order (Instant Fill)</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Priority: Immediate Execution Speed</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6 }}>
                <p>
                  A <strong>Market Order</strong> instructs the trading engine to execute your trade immediately at the best available current market price.
                </p>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 16px', borderRadius: '8px', borderLeft: '3px solid #38bdf8' }}>
                  <strong>How It Works in Our Platform:</strong>
                  <ul style={{ paddingLeft: '18px', marginTop: '6px' }}>
                    <li>The C++ Drogon engine queries the live price from MongoDB/Go simulator.</li>
                    <li>Funds are reserved in PostgreSQL with integer paise precision.</li>
                    <li>The trade executes instantly and notifies the user via Kafka SSE.</li>
                  </ul>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: 'var(--success)', fontWeight: 700, display: 'block' }}>✓ When to Use:</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>High-liquidity blue chips when you want an immediate fill.</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: 'var(--warning)', fontWeight: 700, display: 'block' }}>⚠ Caveat:</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Subject to slippage during rapid market spikes.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Limit Order Card */}
            <div className="glass-card" style={{ padding: '28px', borderTop: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Limit Order (Price Protection)</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Priority: Strict Price Guarantee</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6 }}>
                <p>
                  A <strong>Limit Order</strong> sets a strict price threshold. You never buy above your limit or sell below your limit.
                </p>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 16px', borderRadius: '8px', borderLeft: '3px solid #f59e0b' }}>
                  <strong>Execution Conditions:</strong>
                  <ul style={{ paddingLeft: '18px', marginTop: '6px' }}>
                    <li><strong>BUY LIMIT:</strong> Executes only if <code>Market Price ≤ Limit Price</code>.</li>
                    <li><strong>SELL LIMIT:</strong> Executes only if <code>Market Price ≥ Limit Price</code>.</li>
                  </ul>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: 'var(--success)', fontWeight: 700, display: 'block' }}>✓ When to Use:</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Entering swing trades with strict budget or target exits.</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: 'var(--danger)', fontWeight: 700, display: 'block' }}>⚠ Caveat:</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Order may never fill if the market moves away from your price.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Distributed SAGA Architecture */}
      {activeGuideTab === 'saga' && (
        <div className="glass-card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Cpu size={24} color="#38bdf8" />
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Distributed SAGA Orchestration Architecture</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                How 5 independent microservices maintain strict data consistency across polyglot databases without blocking 2-Phase Commit (2PC).
              </p>
            </div>
          </div>

          {/* SAGA Step-by-Step Pipeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '24px 0' }}>
            {[
              {
                step: '1',
                title: 'Order Received & Validated',
                service: 'Order Service (C++ Drogon / MySQL)',
                desc: 'Client sends order with Idempotency-Key. Drogon queries Go market service for latest quote, writes Order record with status VALIDATING.',
                color: '#38bdf8',
              },
              {
                step: '2',
                title: 'Pessimistic Cash Reservation',
                service: 'Identity & Wallet Service (Java 21 / PostgreSQL)',
                desc: 'Wallet service locks user wallet (SELECT FOR UPDATE). Moves cost from Available to Reserved balance. Appends DEBIT_RESERVE ledger entry.',
                color: '#f59e0b',
              },
              {
                step: '3',
                title: 'Order Matching & Execution',
                service: 'Order Service (C++ Drogon / MySQL)',
                desc: 'Executes trade atomically inside MySQL. Updates order status to EXECUTED. Writes to outbox table in the same DB transaction.',
                color: '#10b981',
              },
              {
                step: '4',
                title: 'Transactional Outbox & Kafka Publishing',
                service: 'Outbox Relay → Apache Kafka',
                desc: 'Outbox Relay publishes orders.executed and trades.executed events to Kafka topic with guaranteed at-least-once delivery.',
                color: '#8b5cf6',
              },
              {
                step: '5',
                title: 'Asynchronous Event Consumers',
                service: 'Portfolio Service (Python/Redis) & Notification (Node/Firestore)',
                desc: 'Portfolio service recalculates live P&L and holdings in Redis. Notification service pushes Server-Sent Events (SSE) to browser.',
                color: '#ec4899',
              },
            ].map((s) => (
              <div
                key={s.step}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '18px',
                  padding: '20px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  borderLeft: `4px solid ${s.color}`,
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: s.color,
                  color: '#000000',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '14px',
                }}>
                  {s.step}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 700 }}>{s.title}</h4>
                    <span className="badge badge-neutral" style={{ fontSize: '11px', color: s.color }}>{s.service}</span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Financial Invariants & Integer Paise Arithmetic */}
      {activeGuideTab === 'ledger' && (
        <div className="glass-card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Database size={24} color="#10b981" />
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Financial Invariants & Integer Paise Arithmetic</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                Why institutional trading systems strictly avoid IEEE 754 floating point arithmetic and enforce double-entry auditability.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '24px' }}>
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f43f5e', marginBottom: '8px' }}>
                ❌ The Danger of Floating Point (Float / Double)
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                In binary floating point (IEEE 754), <code>0.1 + 0.2 = 0.30000000000000004</code>. In financial exchanges, rounding errors accumulate into millions of dollars in drift, causing invariant breaches and regulatory audit failures.
              </p>
            </div>

            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#10b981', marginBottom: '8px' }}>
                ✓ Our Integer Paise Standard
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                All balances, quotes, and trade settlements are modeled as 64-bit signed integers (<code>BIGINT</code> / <code>int64_t</code>) in <strong>paise</strong> (1 INR = 100 paise). Arithmetic is 100% exact, with zero rounding drift.
              </p>
            </div>

            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>
                ⚖ Double-Entry Invariant Formula
              </h3>
              <div className="mono" style={{ padding: '12px', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '6px', fontSize: '13px', color: '#38bdf8', margin: '8px 0' }}>
                availableBalance + reservedBalance == totalBalance
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Enforced in PostgreSQL via <code>CHECK (available_balance_paise &gt;= 0)</code> and verified on every ledger entry.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
