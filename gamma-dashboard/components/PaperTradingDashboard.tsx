import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Target,
  Activity,
  BarChart3,
  Download,
  Filter,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';

// Utility functions
const getPnLColor = (value: number): string => {
  if (value > 0) return 'text-green-600';
  if (value < 0) return 'text-red-600';
  return 'text-gray-600';
};

const getPositionStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'open':
      return 'bg-blue-100 text-blue-800';
    case 'closed':
      return 'bg-gray-100 text-gray-800';
    case 'expired':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Paper Trading Dashboard Component
 * 
 * Comprehensive performance analytics visualization:
 * - Real-time PnL and position tracking
 * - Performance charts for equity curve, drawdown, and returns analysis
 * - Trade analysis tables with filtering and export capabilities
 * - Portfolio heat and risk metrics
 * - Greeks impact tracking and time decay analysis
 */

export interface Position {
  id: string;
  symbol: string;
  type: 'CALL' | 'PUT' | 'STOCK';
  strike?: number;
  expiration?: Date;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  entryTime: Date;
  
  // PnL Metrics
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
  totalPnL: number;
  
  // Greeks (for options)
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  
  // Risk Metrics
  maxFavorableExcursion: number;
  maxAdverseExcursion: number;
  daysHeld: number;
  
  // Status
  status: 'OPEN' | 'CLOSED' | 'EXPIRED';
  confidence: number;
  
  // Market Context
  vixAtEntry: number;
  fibonacciLevel?: number;
}

export interface Trade {
  id: string;
  symbol: string;
  type: 'CALL' | 'PUT' | 'STOCK';
  strike?: number;
  expiration?: Date;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  entryTime: Date;
  exitTime: Date;
  
  // Performance
  pnl: number;
  pnlPercent: number;
  holdingPeriod: number; // hours
  
  // Execution
  entryReason: string;
  exitReason: string;
  confidence: number;
  
  // Greeks Impact (for options)
  deltaImpact?: number;
  gammaImpact?: number;
  thetaImpact?: number;
  vegaImpact?: number;
  
  // Risk Metrics
  maxFavorableExcursion: number;
  maxAdverseExcursion: number;
  
  // Market Context
  vixAtEntry: number;
  vixAtExit: number;
  marketRegime: 'BULL' | 'BEAR' | 'SIDEWAYS' | 'VOLATILE';
}

export interface PerformanceMetrics {
  // Portfolio Metrics
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  dayPnL: number;
  dayPnLPercent: number;
  
  // Risk Metrics
  portfolioHeat: number;
  maxDrawdown: number;
  currentDrawdown: number;
  sharpeRatio: number;
  
  // Trade Statistics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  
  // Greeks Portfolio
  portfolioDelta: number;
  portfolioGamma: number;
  portfolioTheta: number;
  portfolioVega: number;
  
  // Time-based
  equityCurve: { date: Date; value: number; drawdown: number }[];
  dailyReturns: { date: Date; return: number; cumReturn: number }[];
}

export interface PaperTradingDashboardProps {
  positions: Position[];
  trades: Trade[];
  metrics: PerformanceMetrics;
  isLive: boolean;
  onExportData?: () => void;
  onClosePosition?: (positionId: string) => void;
  onFilterChange?: (filters: TradeFilters) => void;
}

export interface TradeFilters {
  symbol?: string;
  type?: 'CALL' | 'PUT' | 'STOCK' | 'ALL';
  dateRange?: { start: Date; end: Date };
  minPnL?: number;
  maxPnL?: number;
  outcome?: 'WIN' | 'LOSS' | 'ALL';
}

const PaperTradingDashboard: React.FC<PaperTradingDashboardProps> = ({
  positions,
  trades,
  metrics,
  isLive,
  onExportData,
  onClosePosition,
  onFilterChange
}) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'positions' | 'trades' | 'analytics'>('overview');
  const [filters, setFilters] = useState<TradeFilters>({});
  const [sortBy, setSortBy] = useState<'pnl' | 'date' | 'symbol' | 'confidence'>('pnl');

  // Filter trades based on current filters
  const filteredTrades = useMemo(() => {
    let filtered = trades;
    
    if (filters.symbol) {
      filtered = filtered.filter(trade => trade.symbol.includes(filters.symbol!));
    }
    
    if (filters.type && filters.type !== 'ALL') {
      filtered = filtered.filter(trade => trade.type === filters.type);
    }
    
    if (filters.outcome && filters.outcome !== 'ALL') {
      filtered = filtered.filter(trade => 
        filters.outcome === 'WIN' ? trade.pnl > 0 : trade.pnl < 0
      );
    }
    
    if (filters.dateRange) {
      filtered = filtered.filter(trade => 
        trade.entryTime >= filters.dateRange!.start && 
        trade.entryTime <= filters.dateRange!.end
      );
    }
    
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'pnl':
          return b.pnl - a.pnl;
        case 'date':
          return b.entryTime.getTime() - a.entryTime.getTime();
        case 'symbol':
          return a.symbol.localeCompare(b.symbol);
        case 'confidence':
          return b.confidence - a.confidence;
        default:
          return 0;
      }
    });
  }, [trades, filters, sortBy]);

  // Calculate filtered metrics
  const filteredMetrics = useMemo(() => {
    const winningTrades = filteredTrades.filter(t => t.pnl > 0);
    const losingTrades = filteredTrades.filter(t => t.pnl < 0);
    
    return {
      totalTrades: filteredTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: filteredTrades.length > 0 ? winningTrades.length / filteredTrades.length : 0,
      totalPnL: filteredTrades.reduce((sum, t) => sum + t.pnl, 0),
      avgWin: winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0,
      avgLoss: losingTrades.length > 0 ? losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length : 0
    };
  }, [filteredTrades]);

  const handleFilterChange = (newFilters: Partial<TradeFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange?.(updatedFilters);
  };

  const getPositionStatusColor = (status: string): string => {
    switch (status) {
      case 'OPEN': return 'bg-green-500 text-white';
      case 'CLOSED': return 'bg-gray-500 text-white';
      case 'EXPIRED': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getPnLColor = (pnl: number): string => {
    return pnl >= 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold">Paper Trading Performance</h2>
          <Badge className={isLive ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}>
            <Activity className="w-3 h-3 mr-1" />
            {isLive ? 'Live' : 'Paused'}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button onClick={onExportData} size="sm" variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">${metrics.totalValue.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Portfolio Value</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${getPnLColor(metrics.totalPnL)}`}>
              ${metrics.totalPnL.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total P&L</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${getPnLColor(metrics.dayPnL)}`}>
              ${metrics.dayPnL.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Day P&L</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{(metrics.winRate * 100).toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Win Rate</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{metrics.sharpeRatio.toFixed(2)}</div>
            <div className="text-sm text-gray-600">Sharpe Ratio</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${
              metrics.portfolioHeat > 15 ? 'text-red-600' : 
              metrics.portfolioHeat > 10 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {metrics.portfolioHeat.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Portfolio Heat</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={(value: string) => setSelectedTab(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="positions">Positions ({positions.length})</TabsTrigger>
          <TabsTrigger value="trades">Trades ({trades.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <PerformanceOverview metrics={metrics} />
        </TabsContent>

        {/* Positions Tab */}
        <TabsContent value="positions" className="space-y-6">
          <PositionsTable 
            positions={positions}
            onClosePosition={onClosePosition}
          />
        </TabsContent>

        {/* Trades Tab */}
        <TabsContent value="trades" className="space-y-6">
          <TradesAnalysis
            trades={filteredTrades}
            metrics={filteredMetrics}
            filters={filters}
            sortBy={sortBy}
            onFilterChange={handleFilterChange}
            onSortChange={(sortBy: string) => setSortBy(sortBy as any)}
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <PerformanceAnalytics 
            metrics={metrics}
            trades={trades}
            positions={positions}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Performance Overview Component
const PerformanceOverview: React.FC<{ metrics: PerformanceMetrics }> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Equity Curve Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Equity Curve</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-2" />
              <p>Equity curve visualization</p>
              <p className="text-sm">Chart component would be implemented here</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drawdown Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Drawdown Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Current Drawdown:</span>
              <span className={`font-bold ${getPnLColor(-metrics.currentDrawdown)}`}>
                {metrics.currentDrawdown.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Max Drawdown:</span>
              <span className="font-bold text-red-600">
                {metrics.maxDrawdown.toFixed(2)}%
              </span>
            </div>
            <Progress 
              value={Math.abs(metrics.currentDrawdown)} 
              className="h-3"
            />
            <div className="h-32 flex items-center justify-center text-gray-500">
              <p>Drawdown chart visualization</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Greeks */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Greeks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold">{metrics.portfolioDelta.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Delta</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{metrics.portfolioGamma.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Gamma</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-red-600">{metrics.portfolioTheta.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Theta</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{metrics.portfolioVega.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Vega</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Total Trades:</span>
              <span className="font-bold">{metrics.totalTrades}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Win Rate:</span>
              <span className="font-bold">{(metrics.winRate * 100).toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Profit Factor:</span>
              <span className="font-bold">{metrics.profitFactor.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Avg Win:</span>
              <span className="font-bold text-green-600">${metrics.avgWin.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Avg Loss:</span>
              <span className="font-bold text-red-600">${metrics.avgLoss.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Positions Table Component
const PositionsTable: React.FC<{
  positions: Position[];
  onClosePosition?: (positionId: string) => void;
}> = ({ positions, onClosePosition }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Open Positions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Symbol</th>
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Quantity</th>
                <th className="text-left p-2">Entry Price</th>
                <th className="text-left p-2">Current Price</th>
                <th className="text-left p-2">P&L</th>
                <th className="text-left p-2">P&L %</th>
                <th className="text-left p-2">Delta</th>
                <th className="text-left p-2">Theta</th>
                <th className="text-left p-2">Days Held</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => (
                <tr key={position.id} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium">{position.symbol}</td>
                  <td className="p-2">
                    <Badge className={position.type === 'CALL' ? 'bg-green-500 text-white' : 
                                    position.type === 'PUT' ? 'bg-red-500 text-white' : 
                                    'bg-blue-500 text-white'}>
                      {position.type}
                      {position.strike && ` $${position.strike}`}
                    </Badge>
                  </td>
                  <td className="p-2">{position.quantity}</td>
                  <td className="p-2">${position.entryPrice.toFixed(2)}</td>
                  <td className="p-2">${position.currentPrice.toFixed(2)}</td>
                  <td className="p-2">
                    <span className={getPnLColor(position.unrealizedPnL)}>
                      ${position.unrealizedPnL.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-2">
                    <span className={getPnLColor(position.unrealizedPnL)}>
                      {position.unrealizedPnLPercent.toFixed(2)}%
                    </span>
                  </td>
                  <td className="p-2">
                    {position.delta ? position.delta.toFixed(3) : '-'}
                  </td>
                  <td className="p-2">
                    {position.theta ? (
                      <span className="text-red-600">{position.theta.toFixed(3)}</span>
                    ) : '-'}
                  </td>
                  <td className="p-2">{position.daysHeld}</td>
                  <td className="p-2">
                    <Badge className={getPositionStatusColor(position.status)}>
                      {position.status}
                    </Badge>
                  </td>
                  <td className="p-2">
                    {position.status === 'OPEN' && onClosePosition && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onClosePosition(position.id)}
                      >
                        Close
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

// Trades Analysis Component
const TradesAnalysis: React.FC<{
  trades: Trade[];
  metrics: any;
  filters: TradeFilters;
  sortBy: string;
  onFilterChange: (filters: Partial<TradeFilters>) => void;
  onSortChange: (sortBy: string) => void;
}> = ({ trades, metrics, filters, sortBy, onFilterChange, onSortChange }) => {
  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>Trade Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Symbol</label>
              <input
                type="text"
                placeholder="e.g., SPY"
                value={filters.symbol || ''}
                onChange={(e) => onFilterChange({ symbol: e.target.value })}
                className="w-full px-3 py-1 border rounded-md text-sm"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Type</label>
              <select
                value={filters.type || 'ALL'}
                onChange={(e) => onFilterChange({ type: e.target.value as any })}
                className="w-full px-3 py-1 border rounded-md text-sm"
              >
                <option value="ALL">All Types</option>
                <option value="CALL">Calls</option>
                <option value="PUT">Puts</option>
                <option value="STOCK">Stock</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Outcome</label>
              <select
                value={filters.outcome || 'ALL'}
                onChange={(e) => onFilterChange({ outcome: e.target.value as any })}
                className="w-full px-3 py-1 border rounded-md text-sm"
              >
                <option value="ALL">All Trades</option>
                <option value="WIN">Winners</option>
                <option value="LOSS">Losers</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className="w-full px-3 py-1 border rounded-md text-sm"
              >
                <option value="pnl">P&L</option>
                <option value="date">Date</option>
                <option value="symbol">Symbol</option>
                <option value="confidence">Confidence</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtered Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold">{metrics.totalTrades}</div>
            <div className="text-sm text-gray-600">Total Trades</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold">{(metrics.winRate * 100).toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Win Rate</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-xl font-bold ${getPnLColor(metrics.totalPnL)}`}>
              ${metrics.totalPnL.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Total P&L</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-green-600">
              ${metrics.avgWin.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Avg Win</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-red-600">
              ${metrics.avgLoss.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Avg Loss</div>
          </CardContent>
        </Card>
      </div>

      {/* Trades Table */}
      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Symbol</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Entry</th>
                  <th className="text-left p-2">Exit</th>
                  <th className="text-left p-2">P&L</th>
                  <th className="text-left p-2">P&L %</th>
                  <th className="text-left p-2">Hold Time</th>
                  <th className="text-left p-2">Confidence</th>
                  <th className="text-left p-2">MFE</th>
                  <th className="text-left p-2">MAE</th>
                  <th className="text-left p-2">Exit Reason</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{trade.symbol}</td>
                    <td className="p-2">
                      <Badge className={trade.type === 'CALL' ? 'bg-green-500 text-white' : 
                                      trade.type === 'PUT' ? 'bg-red-500 text-white' : 
                                      'bg-blue-500 text-white'}>
                        {trade.type}
                        {trade.strike && ` $${trade.strike}`}
                      </Badge>
                    </td>
                    <td className="p-2">${trade.entryPrice.toFixed(2)}</td>
                    <td className="p-2">${trade.exitPrice.toFixed(2)}</td>
                    <td className="p-2">
                      <span className={getPnLColor(trade.pnl)}>
                        ${trade.pnl.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-2">
                      <span className={getPnLColor(trade.pnl)}>
                        {trade.pnlPercent.toFixed(2)}%
                      </span>
                    </td>
                    <td className="p-2">{Math.round(trade.holdingPeriod)}h</td>
                    <td className="p-2">
                      <div className="flex items-center space-x-2">
                        <span>{(trade.confidence * 100).toFixed(0)}%</span>
                        <Progress value={trade.confidence * 100} className="w-12 h-2" />
                      </div>
                    </td>
                    <td className="p-2 text-green-600">
                      ${trade.maxFavorableExcursion.toFixed(2)}
                    </td>
                    <td className="p-2 text-red-600">
                      ${trade.maxAdverseExcursion.toFixed(2)}
                    </td>
                    <td className="p-2 text-xs">{trade.exitReason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Performance Analytics Component
const PerformanceAnalytics: React.FC<{
  metrics: PerformanceMetrics;
  trades: Trade[];
  positions: Position[];
}> = ({ metrics, trades, positions }) => {
  // Calculate additional analytics
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl < 0);
  
  const avgHoldingTime = trades.length > 0 
    ? trades.reduce((sum, t) => sum + t.holdingPeriod, 0) / trades.length 
    : 0;
  
  const bestTrade = trades.reduce((best, trade) => 
    trade.pnl > best.pnl ? trade : best, trades[0] || { pnl: 0 });
  
  const worstTrade = trades.reduce((worst, trade) => 
    trade.pnl < worst.pnl ? trade : worst, trades[0] || { pnl: 0 });

  return (
    <div className="space-y-6">
      {/* Advanced Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Risk Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Sharpe Ratio:</span>
              <span className="font-bold">{metrics.sharpeRatio.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Max Drawdown:</span>
              <span className="font-bold text-red-600">{metrics.maxDrawdown.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Current Drawdown:</span>
              <span className={`font-bold ${getPnLColor(-metrics.currentDrawdown)}`}>
                {metrics.currentDrawdown.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Portfolio Heat:</span>
              <span className={`font-bold ${
                metrics.portfolioHeat > 15 ? 'text-red-600' : 
                metrics.portfolioHeat > 10 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {metrics.portfolioHeat.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trade Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Profit Factor:</span>
              <span className="font-bold">{metrics.profitFactor.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Avg Hold Time:</span>
              <span className="font-bold">{Math.round(avgHoldingTime)}h</span>
            </div>
            <div className="flex justify-between">
              <span>Best Trade:</span>
              <span className="font-bold text-green-600">
                ${bestTrade?.pnl?.toFixed(2) || '0.00'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Worst Trade:</span>
              <span className="font-bold text-red-600">
                ${worstTrade?.pnl?.toFixed(2) || '0.00'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Portfolio Greeks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Net Delta:</span>
              <span className="font-bold">{metrics.portfolioDelta.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Net Gamma:</span>
              <span className="font-bold">{metrics.portfolioGamma.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Net Theta:</span>
              <span className="font-bold text-red-600">{metrics.portfolioTheta.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Net Vega:</span>
              <span className="font-bold">{metrics.portfolioVega.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                <p>Monthly returns chart</p>
                <p className="text-sm">Chart component would be implemented here</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Win/Loss Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Winning Trades:</span>
                <span className="font-bold text-green-600">{winningTrades.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Losing Trades:</span>
                <span className="font-bold text-red-600">{losingTrades.length}</span>
              </div>
              <div className="h-32 flex items-center justify-center text-gray-500">
                <p>Win/Loss distribution chart</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaperTradingDashboard;