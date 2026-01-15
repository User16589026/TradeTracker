import axios from 'axios';

// Use environment variable for API URL (for production deployment)
// Falls back to localhost for local development
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',  // Skip ngrok interstitial page
  },
});

// MT5 endpoints
export const mt5Api = {
  connect: (login: number, password: string, server: string) =>
    api.post('/mt5/connect', { login, password, server }),

  disconnect: () => api.post('/mt5/disconnect'),

  getAccount: () => api.get('/mt5/account'),

  getTrades: (days: number = 30, startDate?: string, endDate?: string) => {
    if (startDate && endDate) {
      return api.post('/mt5/trades', { start_date: startDate, end_date: endDate });
    }
    return api.post('/mt5/trades', { days });
  },

  getTradesCustom: (startDate: string, endDate: string) =>
    api.post('/mt5/trades', { start_date: startDate, end_date: endDate }),

  getPositions: (days: number = 30, startDate?: string, endDate?: string) => {
    if (startDate && endDate) {
      return api.post('/mt5/positions', { start_date: startDate, end_date: endDate });
    }
    return api.post('/mt5/positions', { days });
  },

  getStatus: () => api.get('/mt5/status'),

  getOHLC: (symbol: string, timeframe: string = 'H1', bars: number = 500) =>
    api.post('/mt5/ohlc', { symbol, timeframe, bars }),

  getSymbols: () => api.get('/mt5/symbols'),
};

// Stats endpoints
export const statsApi = {
  calculate: (trades: any[], initialBalance: number = 10000) =>
    api.post('/stats/calculate', { trades, initial_balance: initialBalance }),

  getDemo: () => api.get('/stats/demo'),

  getPeriodStats: (trades: any[], initialBalance: number = 10000) =>
    api.post('/stats/period', { trades, initial_balance: initialBalance }),
};

export default api;
