import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { X, Bell, CheckCheck, Settings, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export function NotificationDrawer({ isOpen, onClose }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [nRes, pRes] = await Promise.all([
        api.getNotifications(false),
        api.getNotificationPreferences(),
      ]);
      setNotifications(nRes.notifications || []);
      setPreferences(pRes);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      fetchNotifications();
    }
  }, [isOpen, user]);

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (e) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {}
  };

  const handleTogglePref = async (key) => {
    if (!preferences) return;
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);
    try {
      await api.updateNotificationPreferences(updated);
    } catch (e) {}
  };

  if (!isOpen) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle2 size={16} color="#10b981" />;
      case 'WARNING':
        return <AlertTriangle size={16} color="#f59e0b" />;
      case 'ERROR':
        return <AlertCircle size={16} color="#f43f5e" />;
      default:
        return <Info size={16} color="#38bdf8" />;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      zIndex: 100,
      display: 'flex',
      justifyContent: 'flex-end',
    }} onClick={onClose}>
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '420px',
          height: '100%',
          background: '#121826',
          borderLeft: '1px solid var(--border-color)',
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={18} color="#38bdf8" />
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Notifications</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="btn btn-secondary"
              style={{ padding: '6px', borderRadius: '8px' }}
              title="Preferences"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '6px', borderRadius: '8px' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Subheader controls */}
        {!showSettings && notifications.length > 0 && (
          <div style={{
            padding: '10px 20px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
          }}>
            <span style={{ color: 'var(--text-dim)' }}>
              {notifications.filter(n => !n.read).length} Unread
            </span>
            <button
              onClick={handleMarkAllRead}
              style={{
                background: 'none',
                border: 'none',
                color: '#38bdf8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 600,
              }}
            >
              <CheckCheck size={14} /> Mark all read
            </button>
          </div>
        )}

        {/* Preferences Toggle Panel */}
        {showSettings ? (
          <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Notification Preferences</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <span>In-App Notifications</span>
                <input
                  type="checkbox"
                  checked={preferences?.inAppAlerts ?? true}
                  onChange={() => handleTogglePref('inAppAlerts')}
                />
              </label>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <span>Order Execution Alerts</span>
                <input
                  type="checkbox"
                  checked={preferences?.orderExecutionAlerts ?? true}
                  onChange={() => handleTogglePref('orderExecutionAlerts')}
                />
              </label>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <span>Price & Market Alerts</span>
                <input
                  type="checkbox"
                  checked={preferences?.priceAlerts ?? true}
                  onChange={() => handleTogglePref('priceAlerts')}
                />
              </label>
            </div>
          </div>
        ) : (
          /* Notifications List */
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No notifications received yet. Trade events will appear here in real-time.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && handleMarkRead(n.id)}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    marginBottom: '8px',
                    background: n.read ? 'rgba(255, 255, 255, 0.02)' : 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid',
                    borderColor: n.read ? 'var(--border-color)' : 'rgba(56, 189, 248, 0.25)',
                    cursor: n.read ? 'default' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ marginTop: '2px' }}>{getIcon(n.type)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: '#ffffff' }}>{n.title}</span>
                        {!n.read && <span className="status-dot status-dot-active" style={{ width: '6px', height: '6px' }} />}
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '6px' }}>
                        {n.message}
                      </p>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                        {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
