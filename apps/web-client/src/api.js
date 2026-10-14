const API_BASE = '';

export function getAuthToken() {
  return localStorage.getItem('stp_jwt_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('stp_jwt_token', token);
  } else {
    localStorage.removeItem('stp_jwt_token');
  }
}

async function request(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const url = `${API_BASE}${path}`;
  try {
    const response = await fetch(url, { ...options, headers });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      throw new Error(data.message || data.error || `HTTP ${response.status}`);
    }
    return data;
  } catch (err) {
    console.error(`API Error on ${path}:`, err);
    throw err;
  }
}

export const api = {
  // Auth
  register: (data) => request('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/api/v1/users/me'),

  // Wallet
  getWallet: () => request('/api/v1/wallet'),
  getWalletTransactions: (limit = 50) => request(`/api/v1/wallet/transactions?limit=${limit}`),

  // Market Data
  getStocks: () => request('/api/v1/stocks'),
  getStockDetail: (symbol) => request(`/api/v1/stocks/${symbol}`),
  getStockQuote: (symbol) => request(`/api/v1/stocks/${symbol}/quote`),
  getStockHistory: (symbol, range = '1d') => request(`/api/v1/stocks/${symbol}/history?range=${range}`),

  // Orders & Trades
  createOrder: (data, idempotencyKey) =>
    request('/api/v1/orders', {
      method: 'POST',
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
      body: JSON.stringify(data),
    }),
  getOrders: (limit = 50) => request(`/api/v1/orders?limit=${limit}`),
  getOrder: (id) => request(`/api/v1/orders/${id}`),
  cancelOrder: (id) => request(`/api/v1/orders/${id}/cancel`, { method: 'POST' }),
  getTrades: (limit = 50) => request(`/api/v1/trades?limit=${limit}`),

  // Portfolio
  getPortfolio: () => request('/api/v1/portfolio'),
  getHoldings: () => request('/api/v1/portfolio/holdings'),
  getPosition: (symbol) => request(`/api/v1/portfolio/positions/${symbol}`),
  getPerformance: () => request('/api/v1/portfolio/performance'),

  // Notifications
  getNotifications: (unreadOnly = false) => request(`/api/v1/notifications?unreadOnly=${unreadOnly}`),
  markNotificationRead: (id) => request(`/api/v1/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/api/v1/notifications/read-all', { method: 'POST' }),
  getNotificationPreferences: () => request('/api/v1/notifications/preferences'),
  updateNotificationPreferences: (data) =>
    request('/api/v1/notifications/preferences', { method: 'PATCH', body: JSON.stringify(data) }),

  // Health checks for microservices
  checkGatewayHealth: () => request('/actuator/health'),
};
