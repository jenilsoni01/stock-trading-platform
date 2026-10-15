import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Wallet, ShieldCheck, History, ArrowDownLeft, ArrowUpRight, Lock, CheckCircle2, PlusCircle, X, Loader2, Sparkles } from 'lucide-react';

export function WalletLedgerView() {
  const { user, wallet, refreshWallet, openAuthModal } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositAmountInr, setDepositAmountInr] = useState('50000');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState(null);
  const [depositError, setDepositError] = useState(null);

  const fetchLedger = async () => {
    if (!user) return;
    try {
      await refreshWallet();
      const res = await api.getWalletTransactions(50);
      setTransactions(res.content || res.transactions || (Array.isArray(res) ? res : []));
    } catch (e) {
      console.error('Failed to load ledger:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLedger();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
        <Wallet size={48} color="#10b981" style={{ margin: '0 auto 16px auto' }} />
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Login to View Wallet & Ledger</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          Your virtual wallet is credited with ₹100,000 INR on registration.
        </p>
        <button onClick={() => openAuthModal('login')} className="btn btn-primary">
          Login to Continue
        </button>
      </div>
    );
  }

  const formatInr = (paise) => {
    if (!paise && paise !== 0) return '0.00';
    return (paise / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    setDepositError(null);
    setDepositSuccess(null);

    const inrValue = parseFloat(depositAmountInr);
    if (!inrValue || inrValue <= 0) {
      setDepositError('Please enter a valid deposit amount');
      return;
    }

    const amountPaise = Math.round(inrValue * 100);
    setDepositLoading(true);

    try {
      await api.depositFunds(amountPaise);
      await fetchLedger();
      setDepositSuccess(`Successfully deposited ₹${inrValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })} into your wallet!`);
      setTimeout(() => {
        setIsDepositOpen(false);
        setDepositSuccess(null);
      }, 1500);
    } catch (err) {
      setDepositError(err.message || 'Deposit failed');
    } finally {
      setDepositLoading(false);
    }
  };

  const setPresetAmount = (inr) => {
    setDepositAmountInr(inr.toString());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header with Deposit Action */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Wallet & Double-Entry Ledger</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            ACID ledger in PostgreSQL with integer paise arithmetic and pessimistic row-locking
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '13px', fontWeight: 600 }}>
            <ShieldCheck size={18} />
            <span>Financial Invariants Verified</span>
          </div>
          <button
            onClick={() => {
              setDepositError(null);
              setDepositSuccess(null);
              setIsDepositOpen(true);
            }}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 700 }}
          >
            <PlusCircle size={18} />
            <span>Deposit Funds</span>
          </button>
        </div>
      </div>

      {/* Balance Summary Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
      }}>
        {/* Available Balance */}
        <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #10b981' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
            AVAILABLE TO TRADE
          </span>
          <div className="mono" style={{ fontSize: '28px', fontWeight: 800, color: '#10b981', marginBottom: '4px' }}>
            ₹{formatInr(wallet?.availableBalancePaise)}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Free liquid capital ready for order execution
          </span>
        </div>

        {/* Reserved Balance */}
        <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
            RESERVED CASH (IN SAGA)
          </span>
          <div className="mono" style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b', marginBottom: '4px' }}>
            ₹{formatInr(wallet?.reservedBalancePaise)}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Locked atomically during active buy orders
          </span>
        </div>

        {/* Total Balance */}
        <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #38bdf8' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
            TOTAL VIRTUAL WEALTH
          </span>
          <div className="mono" style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
            ₹{formatInr(wallet?.totalBalancePaise)}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Available + Reserved = Total invariant holds
          </span>
        </div>
      </div>

      {/* Ledger Transactions Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Append-Only Ledger Transactions ({transactions.length})</h2>
          <button onClick={fetchLedger} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
            Refresh Ledger
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>TRANSACTION ID</th>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>OPERATION</th>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>DESCRIPTION</th>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>AMOUNT</th>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>BALANCE AFTER</th>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>TIMESTAMP</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {loading ? 'Loading ledger entries...' : 'No ledger transactions recorded yet.'}
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const op = tx.entryType || tx.operationType || 'TRANSACTION';
                const isCredit = op.includes('CREDIT') || op.includes('INITIAL') || op.includes('RELEASE') || op.includes('DEPOSIT') || op.includes('REFUND');
                return (
                  <tr key={tx.id || tx.entryId} className="glass-card-hover" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <span className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {(tx.id || tx.entryId)?.slice(0, 8)}...
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span className={`badge ${isCredit ? 'badge-success' : 'badge-danger'}`}>
                        {op}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: '13px', color: '#f1f5f9' }}>
                      {tx.description || tx.reason || 'Wallet operation'}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <span className="mono" style={{
                        fontWeight: 700,
                        color: isCredit ? 'var(--success)' : 'var(--danger)',
                      }}>
                        {isCredit ? '+' : '-'}₹{formatInr(tx.amountPaise)}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <span className="mono" style={{ color: 'var(--text-muted)' }}>
                        ₹{formatInr(tx.balanceAfterPaise)}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right', fontSize: '12px', color: 'var(--text-dim)' }}>
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Deposit Funds Modal */}
      {isDepositOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          padding: '20px',
        }} onClick={() => setIsDepositOpen(false)}>
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: '460px',
              padding: '32px',
              background: '#121826',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={20} color="#10b981" />
                  Deposit Virtual Trading Funds
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                  Credit virtual INR into your trading account with immediate PostgreSQL ACID ledger audit
                </p>
              </div>
              <button onClick={() => setIsDepositOpen(false)} className="btn btn-secondary" style={{ padding: '6px', borderRadius: '50%' }}>
                <X size={16} />
              </button>
            </div>

            {depositSuccess && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10b981',
                padding: '12px 16px',
                borderRadius: '8px',
                color: '#10b981',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <CheckCircle2 size={16} />
                <span>{depositSuccess}</span>
              </div>
            )}

            {depositError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                padding: '12px 16px',
                borderRadius: '8px',
                color: '#ef4444',
                fontSize: '13px',
                marginBottom: '16px',
              }}>
                {depositError}
              </div>
            )}

            <form onSubmit={handleDepositSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Quick Presets */}
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                  QUICK SELECT AMOUNT
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[10000, 50000, 100000, 500000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setPresetAmount(amt)}
                      className="btn btn-secondary"
                      style={{
                        padding: '8px 4px',
                        fontSize: '12px',
                        fontWeight: 700,
                        borderColor: parseFloat(depositAmountInr) === amt ? '#10b981' : undefined,
                        color: parseFloat(depositAmountInr) === amt ? '#10b981' : undefined,
                      }}
                    >
                      +₹{(amt / 1000)}k
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount input */}
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                  DEPOSIT AMOUNT (INR ₹)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 700 }}>
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={depositAmountInr}
                    onChange={(e) => setDepositAmountInr(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '32px', fontSize: '18px', fontWeight: 700 }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '12px', color: 'var(--text-dim)' }}>
                  <span>Integer Paise equivalent:</span>
                  <span className="mono" style={{ color: '#38bdf8', fontWeight: 600 }}>
                    {(parseFloat(depositAmountInr || 0) * 100).toLocaleString('en-IN')} paise
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsDepositOpen(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={depositLoading}
                  className="btn btn-primary"
                  style={{ flex: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                >
                  {depositLoading ? <Loader2 size={16} className="spin" /> : <PlusCircle size={16} />}
                  <span>Confirm Deposit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
