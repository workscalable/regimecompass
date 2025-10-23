/**
 * API Integration Service
 * Connects the modern UI with the backend services and database
 */

// Base API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
  count?: number;
}

// Trading API
export class TradingApi {
  static async getSignals(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/trading/signals`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching signals:', error);
      return { success: false, error: 'Failed to fetch signals' };
    }
  }

  static async startTrading(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/trading/signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });
      return await response.json();
    } catch (error) {
      console.error('Error starting trading:', error);
      return { success: false, error: 'Failed to start trading' };
    }
  }

  static async stopTrading(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/trading/signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });
      return await response.json();
    } catch (error) {
      console.error('Error stopping trading:', error);
      return { success: false, error: 'Failed to stop trading' };
    }
  }

  static async addSymbol(symbol: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/trading/signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addSymbol', symbol })
      });
      return await response.json();
    } catch (error) {
      console.error('Error adding symbol:', error);
      return { success: false, error: 'Failed to add symbol' };
    }
  }

  static async getSystemHealth(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/trading/health`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching system health:', error);
      return { success: false, error: 'Failed to fetch system health' };
    }
  }
}

// Paper Trading API
export class PaperTradingApi {
  static async getPositions(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/paper/positions`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching positions:', error);
      return { success: false, error: 'Failed to fetch positions' };
    }
  }

  static async getTrades(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/paper/trades`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching trades:', error);
      return { success: false, error: 'Failed to fetch trades' };
    }
  }

  static async getPerformance(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/paper/performance`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching performance:', error);
      return { success: false, error: 'Failed to fetch performance' };
    }
  }

  static async getSignals(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/paper/signals`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching paper trading signals:', error);
      return { success: false, error: 'Failed to fetch signals' };
    }
  }

  static async getOrchestratorStatus(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/paper/orchestrator`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching orchestrator status:', error);
      return { success: false, error: 'Failed to fetch orchestrator status' };
    }
  }

  static async startOrchestrator(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/paper/orchestrator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });
      return await response.json();
    } catch (error) {
      console.error('Error starting orchestrator:', error);
      return { success: false, error: 'Failed to start orchestrator' };
    }
  }

  static async stopOrchestrator(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/paper/orchestrator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });
      return await response.json();
    } catch (error) {
      console.error('Error stopping orchestrator:', error);
      return { success: false, error: 'Failed to stop orchestrator' };
    }
  }
}

// Analytics API
export class AnalyticsApi {
  static async getPerformanceMetrics(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/paper/analytics/performance`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      return { success: false, error: 'Failed to fetch performance metrics' };
    }
  }

  static async getSignalStatistics(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/paper/signals?action=statistics`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching signal statistics:', error);
      return { success: false, error: 'Failed to fetch signal statistics' };
    }
  }

  static async getTickerData(ticker: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/paper/signals?action=ticker_data&ticker=${ticker}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching ticker data:', error);
      return { success: false, error: 'Failed to fetch ticker data' };
    }
  }

  static async getAllTickerData(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/paper/signals?action=all_tickers`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching all ticker data:', error);
      return { success: false, error: 'Failed to fetch all ticker data' };
    }
  }
}

// Health API
export class HealthApi {
  static async getSystemHealth(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching system health:', error);
      return { success: false, error: 'Failed to fetch system health' };
    }
  }

  static async getMetrics(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/health/metrics`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching metrics:', error);
      return { success: false, error: 'Failed to fetch metrics' };
    }
  }

  static async getPerformance(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/health/performance`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching performance:', error);
      return { success: false, error: 'Failed to fetch performance' };
    }
  }

  static async getAlerts(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/health/alerts`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching alerts:', error);
      return { success: false, error: 'Failed to fetch alerts' };
    }
  }
}

// Export API
export class ExportApi {
  static async exportCSV(type: string): Promise<Blob> {
    try {
      const response = await fetch(`${API_BASE_URL}/export/csv?type=${type}`);
      return await response.blob();
    } catch (error) {
      console.error('Error exporting CSV:', error);
      throw new Error('Failed to export CSV');
    }
  }

  static async exportJSON(type: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/export/json?type=${type}`);
      return await response.json();
    } catch (error) {
      console.error('Error exporting JSON:', error);
      throw new Error('Failed to export JSON');
    }
  }
}

// Real-time data hooks
export function useRealtimeData<T>(
  endpoint: string,
  interval: number = 5000,
  initialData?: T
): { data: T | null; loading: boolean; error: string | null } {
  const [data, setData] = React.useState<T | null>(initialData || null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        const result = await response.json();
        
        if (result.success) {
          setData(result.data);
          setError(null);
        } else {
          setError(result.error || 'Failed to fetch data');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, interval);

    return () => clearInterval(intervalId);
  }, [endpoint, interval]);

  return { data, loading, error };
}

// Dashboard API
export class DashboardApi {
  static async getDashboardData(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return { success: false, error: 'Failed to fetch dashboard data' };
    }
  }
}

// Analytics API with database integration
export class AnalyticsApi {
  static async getPerformanceMetrics(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics?type=performance`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      return { success: false, error: 'Failed to fetch performance metrics' };
    }
  }

  static async getSignalAnalysis(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics?type=signals`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching signal analysis:', error);
      return { success: false, error: 'Failed to fetch signal analysis' };
    }
  }

  static async getFibonacciAnalysis(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics?type=fibonacci`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching Fibonacci analysis:', error);
      return { success: false, error: 'Failed to fetch Fibonacci analysis' };
    }
  }

  static async getLearningInsights(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics?type=insights`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching learning insights:', error);
      return { success: false, error: 'Failed to fetch learning insights' };
    }
  }

  static async getPerformanceHistory(days: number = 30): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics?type=history&days=${days}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching performance history:', error);
      return { success: false, error: 'Failed to fetch performance history' };
    }
  }

  static async getPortfolioAnalytics(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics?type=portfolio`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching portfolio analytics:', error);
      return { success: false, error: 'Failed to fetch portfolio analytics' };
    }
  }
}

// Database connection utilities
export class DatabaseApi {
  static async getPositions(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/paper/positions`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching positions from database:', error);
      return { success: false, error: 'Failed to fetch positions' };
    }
  }

  static async getTrades(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/paper/trades`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching trades from database:', error);
      return { success: false, error: 'Failed to fetch trades' };
    }
  }

  static async getPerformanceHistory(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/paper/performance`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching performance history:', error);
      return { success: false, error: 'Failed to fetch performance history' };
    }
  }
}

// Error handling utility
export function handleApiError(error: any): string {
  if (error?.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

// Type definitions for API responses
export interface TradingSignal {
  id: string;
  ticker: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  timeframe: string;
  factors: string[];
  strength: string;
  timestamp: string;
}

export interface Position {
  id: string;
  ticker: string;
  type: 'STOCK' | 'CALL' | 'PUT' | 'SPREAD' | 'STRADDLE' | 'STRANGLE';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  marketValue: number;
  costBasis: number;
  unrealizedPnL: number;
  realizedPnL: number;
  daysHeld: number;
  confidence: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'CLOSED' | 'EXPIRED';
  entryDate: string;
  expiryDate?: string;
  strike?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  rho?: number;
  intrinsicValue?: number;
  timeValue?: number;
  moneyness?: 'ITM' | 'ATM' | 'OTM';
}

export interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  currentDrawdown: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  avgHoldingPeriod: number;
}

export interface SystemHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  uptime: string;
  latency: string;
  errors: number;
  warnings: number;
  lastUpdate: string;
  components: Record<string, boolean>;
}
