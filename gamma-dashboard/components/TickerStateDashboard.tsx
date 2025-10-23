import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Zap,
  Target
} from 'lucide-react';

// Utility functions
const getStateColor = (state: string): string => {
  switch (state) {
    case 'GO': return 'bg-green-500';
    case 'SET': return 'bg-blue-500';
    case 'READY': return 'bg-yellow-500';
    case 'HOLD': return 'bg-orange-500';
    case 'EXIT': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const getStateIcon = (state: string) => {
  switch (state) {
    case 'GO': return <Zap className="w-4 h-4" />;
    case 'SET': return <Target className="w-4 h-4" />;
    case 'READY': return <CheckCircle className="w-4 h-4" />;
    case 'HOLD': return <Clock className="w-4 h-4" />;
    case 'EXIT': return <AlertTriangle className="w-4 h-4" />;
    default: return <Activity className="w-4 h-4" />;
  }
};

const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.8) return 'text-green-600';
  if (confidence >= 0.6) return 'text-yellow-600';
  if (confidence >= 0.4) return 'text-orange-600';
  return 'text-red-600';
};

/**
 * Ticker State Dashboard Component
 * 
 * Displays multi-ticker state overview with Ready-Set-Go status:
 * - Real-time state visualization for all monitored tickers
 * - Confidence heatmap with color-coded indicators
 * - State transition monitoring and history
 * - Performance metrics and alerts
 */

export interface TickerState {
  symbol: string;
  state: 'READY' | 'SET' | 'GO' | 'HOLD' | 'EXIT';
  confidence: number;
  lastUpdate: Date;
  stateHistory: {
    state: 'READY' | 'SET' | 'GO' | 'HOLD' | 'EXIT';
    timestamp: Date;
    confidence: number;
    reason: string;
  }[];
  metrics: {
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    avgVolume: number;
    vix?: number;
  };
  signals: {
    trend: number;
    momentum: number;
    volume: number;
    ribbon: number;
    fibonacci: number;
    gamma: number;
  };
  alerts: {
    type: 'INFO' | 'WARNING' | 'ERROR';
    message: string;
    timestamp: Date;
  }[];
}

export interface DashboardProps {
  tickers: TickerState[];
  isConnected: boolean;
  lastUpdate: Date;
  onTickerSelect?: (symbol: string) => void;
  onStateTransition?: (symbol: string, newState: string) => void;
}

const TickerStateDashboard: React.FC<DashboardProps> = ({
  tickers,
  isConnected,
  lastUpdate,
  onTickerSelect,
  onStateTransition
}) => {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'heatmap'>('grid');
  const [sortBy, setSortBy] = useState<'symbol' | 'confidence' | 'state' | 'change'>('confidence');

  // Sort and filter tickers
  const sortedTickers = useMemo(() => {
    return [...tickers].sort((a, b) => {
      switch (sortBy) {
        case 'symbol':
          return a.symbol.localeCompare(b.symbol);
        case 'confidence':
          return b.confidence - a.confidence;
        case 'state':
          const stateOrder = { 'GO': 5, 'SET': 4, 'READY': 3, 'HOLD': 2, 'EXIT': 1 };
          return stateOrder[b.state] - stateOrder[a.state];
        case 'change':
          return b.metrics.changePercent - a.metrics.changePercent;
        default:
          return 0;
      }
    });
  }, [tickers, sortBy]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const total = tickers.length;
    const states = tickers.reduce((acc, ticker) => {
      acc[ticker.state] = (acc[ticker.state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const avgConfidence = tickers.reduce((sum, t) => sum + t.confidence, 0) / total;
    const highConfidence = tickers.filter(t => t.confidence >= 0.8).length;
    const alerts = tickers.reduce((sum, t) => sum + t.alerts.length, 0);
    
    return {
      total,
      states,
      avgConfidence,
      highConfidence,
      alerts
    };
  }, [tickers]);

  const getStateColor = (state: string): string => {
    switch (state) {
      case 'GO': return 'bg-green-500';
      case 'SET': return 'bg-yellow-500';
      case 'READY': return 'bg-blue-500';
      case 'HOLD': return 'bg-orange-500';
      case 'EXIT': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'GO': return <Zap className="w-4 h-4" />;
      case 'SET': return <Target className="w-4 h-4" />;
      case 'READY': return <CheckCircle className="w-4 h-4" />;
      case 'HOLD': return <Clock className="w-4 h-4" />;
      case 'EXIT': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    if (confidence >= 0.4) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const handleTickerClick = (symbol: string) => {
    setSelectedTicker(symbol);
    onTickerSelect?.(symbol);
  };

  return (
    <div className="space-y-6">
      {/* Header with Connection Status and Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">Multi-Ticker Dashboard</h1>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <span className="text-sm text-gray-500">
            Last update: {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 border rounded-md text-sm"
          >
            <option value="confidence">Sort by Confidence</option>
            <option value="symbol">Sort by Symbol</option>
            <option value="state">Sort by State</option>
            <option value="change">Sort by Change</option>
          </select>
          
          <div className="flex border rounded-md">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 text-sm ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-sm ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('heatmap')}
              className={`px-3 py-1 text-sm ${viewMode === 'heatmap' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}
            >
              Heatmap
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{summary.total}</div>
            <div className="text-sm text-gray-600">Total Tickers</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{summary.states.GO || 0}</div>
            <div className="text-sm text-gray-600">GO Signals</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{summary.states.SET || 0}</div>
            <div className="text-sm text-gray-600">SET Signals</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{(summary.avgConfidence * 100).toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Avg Confidence</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{summary.highConfidence}</div>
            <div className="text-sm text-gray-600">High Confidence</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{summary.alerts}</div>
            <div className="text-sm text-gray-600">Active Alerts</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={viewMode} onValueChange={(value: string) => setViewMode(value as any)}>
        <TabsList>
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="heatmap">Confidence Heatmap</TabsTrigger>
        </TabsList>

        {/* Grid View */}
        <TabsContent value="grid" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedTickers.map((ticker) => (
              <TickerCard
                key={ticker.symbol}
                ticker={ticker}
                isSelected={selectedTicker === ticker.symbol}
                onClick={() => handleTickerClick(ticker.symbol)}
              />
            ))}
          </div>
        </TabsContent>

        {/* List View */}
        <TabsContent value="list" className="space-y-4">
          <TickerList
            tickers={sortedTickers}
            selectedTicker={selectedTicker}
            onTickerSelect={handleTickerClick}
          />
        </TabsContent>

        {/* Heatmap View */}
        <TabsContent value="heatmap" className="space-y-4">
          <ConfidenceHeatmap
            tickers={sortedTickers}
            onTickerSelect={handleTickerClick}
          />
        </TabsContent>
      </Tabs>

      {/* Selected Ticker Details */}
      {selectedTicker && (
        <TickerDetails
          ticker={sortedTickers.find(t => t.symbol === selectedTicker)!}
          onClose={() => setSelectedTicker(null)}
        />
      )}
    </div>
  );
};

// Ticker Card Component
const TickerCard: React.FC<{
  ticker: TickerState;
  isSelected: boolean;
  onClick: () => void;
}> = ({ ticker, isSelected, onClick }) => {
  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-lg ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{ticker.symbol}</CardTitle>
          <Badge className={`${getStateColor(ticker.state)} text-white`}>
            <div className="flex items-center space-x-1">
              {getStateIcon(ticker.state)}
              <span>{ticker.state}</span>
            </div>
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Price and Change */}
        <div className="flex items-center justify-between">
          <span className="text-xl font-semibold">${ticker.metrics.price.toFixed(2)}</span>
          <div className={`flex items-center space-x-1 ${
            ticker.metrics.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {ticker.metrics.changePercent >= 0 ? 
              <TrendingUp className="w-4 h-4" /> : 
              <TrendingDown className="w-4 h-4" />
            }
            <span className="text-sm font-medium">
              {ticker.metrics.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Confidence */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span>Confidence</span>
            <span className={`font-medium ${getConfidenceColor(ticker.confidence)}`}>
              {(ticker.confidence * 100).toFixed(1)}%
            </span>
          </div>
          <Progress value={ticker.confidence * 100} className="h-2" />
        </div>

        {/* Signals Preview */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="font-medium">Trend</div>
            <div className={ticker.signals.trend > 0.5 ? 'text-green-600' : 'text-red-600'}>
              {(ticker.signals.trend * 100).toFixed(0)}%
            </div>
          </div>
          <div className="text-center">
            <div className="font-medium">Momentum</div>
            <div className={ticker.signals.momentum > 0.5 ? 'text-green-600' : 'text-red-600'}>
              {(ticker.signals.momentum * 100).toFixed(0)}%
            </div>
          </div>
          <div className="text-center">
            <div className="font-medium">Volume</div>
            <div className={ticker.signals.volume > 0.5 ? 'text-green-600' : 'text-red-600'}>
              {(ticker.signals.volume * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Alerts */}
        {ticker.alerts.length > 0 && (
          <div className="flex items-center space-x-1 text-sm text-orange-600">
            <AlertTriangle className="w-4 h-4" />
            <span>{ticker.alerts.length} alert{ticker.alerts.length > 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Last Update */}
        <div className="text-xs text-gray-500">
          Updated: {ticker.lastUpdate.toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
};

// Ticker List Component
const TickerList: React.FC<{
  tickers: TickerState[];
  selectedTicker: string | null;
  onTickerSelect: (symbol: string) => void;
}> = ({ tickers, selectedTicker, onTickerSelect }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticker List</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {tickers.map((ticker) => (
            <div
              key={ticker.symbol}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                selectedTicker === ticker.symbol 
                  ? 'bg-blue-50 border border-blue-200' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => onTickerSelect(ticker.symbol)}
            >
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Badge className={`${getStateColor(ticker.state)} text-white`}>
                    {getStateIcon(ticker.state)}
                  </Badge>
                  <span className="font-semibold">{ticker.symbol}</span>
                </div>
                
                <div className="text-sm text-gray-600">
                  ${ticker.metrics.price.toFixed(2)}
                </div>
                
                <div className={`text-sm ${
                  ticker.metrics.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {ticker.metrics.changePercent >= 0 ? '+' : ''}
                  {ticker.metrics.changePercent.toFixed(2)}%
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {(ticker.confidence * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">Confidence</div>
                </div>
                
                <Progress value={ticker.confidence * 100} className="w-20 h-2" />
                
                {ticker.alerts.length > 0 && (
                  <div className="flex items-center space-x-1 text-orange-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm">{ticker.alerts.length}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Confidence Heatmap Component
const ConfidenceHeatmap: React.FC<{
  tickers: TickerState[];
  onTickerSelect: (symbol: string) => void;
}> = ({ tickers, onTickerSelect }) => {
  const getHeatmapColor = (confidence: number): string => {
    const intensity = Math.floor(confidence * 9);
    const colors = [
      'bg-red-900', 'bg-red-700', 'bg-red-500',
      'bg-yellow-700', 'bg-yellow-500', 'bg-yellow-300',
      'bg-green-300', 'bg-green-500', 'bg-green-700', 'bg-green-900'
    ];
    return colors[intensity] || 'bg-gray-300';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confidence Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
          {tickers.map((ticker) => (
            <div
              key={ticker.symbol}
              className={`
                ${getHeatmapColor(ticker.confidence)} 
                text-white text-center p-3 rounded-lg cursor-pointer 
                transition-all hover:scale-105 hover:shadow-lg
              `}
              onClick={() => onTickerSelect(ticker.symbol)}
              title={`${ticker.symbol}: ${(ticker.confidence * 100).toFixed(1)}% confidence`}
            >
              <div className="font-semibold text-sm">{ticker.symbol}</div>
              <div className="text-xs mt-1">
                {(ticker.confidence * 100).toFixed(0)}%
              </div>
              <div className="text-xs mt-1">
                <Badge className={`${getStateColor(ticker.state)} text-white text-xs`}>
                  {ticker.state}
                </Badge>
              </div>
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="mt-6">
          <div className="text-sm font-medium mb-2">Confidence Scale</div>
          <div className="flex items-center space-x-2">
            <span className="text-xs">Low</span>
            <div className="flex space-x-1">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
                <div
                  key={level}
                  className={`w-4 h-4 ${getHeatmapColor(level / 9)}`}
                />
              ))}
            </div>
            <span className="text-xs">High</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Ticker Details Component
const TickerDetails: React.FC<{
  ticker: TickerState;
  onClose: () => void;
}> = ({ ticker, onClose }) => {
  return (
    <Card className="border-2 border-blue-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CardTitle className="text-xl">{ticker.symbol} Details</CardTitle>
            <Badge className={`${getStateColor(ticker.state)} text-white`}>
              <div className="flex items-center space-x-1">
                {getStateIcon(ticker.state)}
                <span>{ticker.state}</span>
              </div>
            </Badge>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Current Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">${ticker.metrics.price.toFixed(2)}</div>
            <div className="text-sm text-gray-600">Current Price</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              ticker.metrics.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {ticker.metrics.changePercent >= 0 ? '+' : ''}
              {ticker.metrics.changePercent.toFixed(2)}%
            </div>
            <div className="text-sm text-gray-600">Change</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{(ticker.confidence * 100).toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Confidence</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {(ticker.metrics.volume / 1000000).toFixed(1)}M
            </div>
            <div className="text-sm text-gray-600">Volume</div>
          </div>
        </div>

        {/* Signal Breakdown */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Signal Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(ticker.signals).map(([signal, value]) => (
              <div key={signal} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{signal}</span>
                  <span className={`text-sm font-semibold ${
                    value > 0.6 ? 'text-green-600' : 
                    value > 0.4 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {(value * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress value={value * 100} className="h-2" />
              </div>
            ))}
          </div>
        </div>

        {/* State History */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Recent State Changes</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {ticker.stateHistory.slice(-5).reverse().map((history, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <Badge className={`${getStateColor(history.state)} text-white`}>
                    {history.state}
                  </Badge>
                  <span className="text-sm">{history.reason}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {history.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Alerts */}
        {ticker.alerts.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Active Alerts</h3>
            <div className="space-y-2">
              {ticker.alerts.map((alert, index) => (
                <div key={index} className={`p-3 rounded-lg border-l-4 ${
                  alert.type === 'ERROR' ? 'bg-red-50 border-red-500' :
                  alert.type === 'WARNING' ? 'bg-yellow-50 border-yellow-500' :
                  'bg-blue-50 border-blue-500'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{alert.message}</span>
                    <span className="text-xs text-gray-500">
                      {alert.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TickerStateDashboard;