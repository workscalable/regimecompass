'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  Target, 
  Shield, 
  Brain, 
  Zap,
  BarChart3,
  Settings,
  Play,
  Pause,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';

// Main Dashboard Component
export default function TradingDashboard() {
  const [isLive, setIsLive] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1m');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Mock data - replace with real API calls
  const [marketData, setMarketData] = useState({
    regime: 'BULL',
    confidence: 0.87,
    vix: 18.5,
    breadth: 0.72,
    trendScore: 0.84,
    activeSignals: 12,
    openPositions: 3,
    totalPnL: 12450.75,
    dailyPnL: 1250.30,
    winRate: 0.68,
    sharpeRatio: 1.42,
    maxDrawdown: 0.03,
    consecutiveWins: 4,
    consecutiveLosses: 0
  });

  const [positions, setPositions] = useState([
    {
      id: '1',
      ticker: 'SPY',
      type: 'CALL',
      strike: 450,
      expiry: '2024-01-19',
      quantity: 10,
      entryPrice: 2.45,
      currentPrice: 3.12,
      pnl: 670.00,
      pnlPercent: 27.35,
      confidence: 0.89,
      delta: 0.65,
      gamma: 0.02,
      theta: -0.15,
      vega: 0.08
    },
    {
      id: '2',
      ticker: 'QQQ',
      type: 'PUT',
      strike: 380,
      expiry: '2024-01-19',
      quantity: 5,
      entryPrice: 1.80,
      currentPrice: 1.45,
      pnl: -175.00,
      pnlPercent: -19.44,
      confidence: 0.72,
      delta: -0.45,
      gamma: 0.03,
      theta: -0.12,
      vega: 0.06
    }
  ]);

  const [signals, setSignals] = useState([
    {
      id: '1',
      ticker: 'AAPL',
      signal: 'BUY',
      confidence: 0.92,
      timeframe: '5m',
      factors: ['Trend', 'Momentum', 'Volume', 'Fibonacci'],
      strength: 'Strong',
      timestamp: new Date().toISOString()
    },
    {
      id: '2',
      ticker: 'TSLA',
      signal: 'SELL',
      confidence: 0.78,
      timeframe: '15m',
      factors: ['Momentum', 'Volume', 'Gamma'],
      strength: 'Medium',
      timestamp: new Date(Date.now() - 300000).toISOString()
    }
  ]);

  const [performance, setPerformance] = useState({
    totalTrades: 156,
    winningTrades: 106,
    losingTrades: 50,
    winRate: 0.68,
    profitFactor: 1.85,
    sharpeRatio: 1.42,
    maxDrawdown: 0.03,
    avgWin: 245.50,
    avgLoss: -180.25,
    bestTrade: 1250.00,
    worstTrade: -450.00,
    consecutiveWins: 4,
    consecutiveLosses: 0,
    avgHoldingPeriod: '2.3 days'
  });

  const [riskMetrics, setRiskMetrics] = useState({
    portfolioHeat: 0.12,
    maxHeat: 0.20,
    currentDrawdown: 0.01,
    maxDrawdown: 0.03,
    var95: 850.00,
    expectedShortfall: 1200.00,
    beta: 0.95,
    correlation: 0.78
  });

  const [systemHealth, setSystemHealth] = useState({
    status: 'HEALTHY',
    uptime: '99.8%',
    latency: '12ms',
    errors: 0,
    warnings: 2,
    lastUpdate: new Date().toISOString()
  });

  // Auto-refresh data
  useEffect(() => {
    if (isLive) {
      const interval = setInterval(() => {
        // Simulate real-time updates
        setMarketData(prev => ({
          ...prev,
          confidence: Math.max(0.5, Math.min(1.0, prev.confidence + (Math.random() - 0.5) * 0.1)),
          vix: Math.max(10, Math.min(40, prev.vix + (Math.random() - 0.5) * 2)),
          breadth: Math.max(0.3, Math.min(0.9, prev.breadth + (Math.random() - 0.5) * 0.1))
        }));
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isLive]);

  const getRegimeColor = (regime: string) => {
    switch (regime) {
      case 'BULL': return 'text-green-400 bg-green-900/20';
      case 'BEAR': return 'text-red-400 bg-red-900/20';
      case 'NEUTRAL': return 'text-yellow-400 bg-yellow-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'BUY': return 'text-green-400 bg-green-900/20';
      case 'SELL': return 'text-red-400 bg-red-900/20';
      case 'HOLD': return 'text-yellow-400 bg-yellow-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Brain className="h-8 w-8 text-blue-400" />
                <h1 className="text-2xl font-bold">RegimeCompass</h1>
              </div>
              <Badge className={`${getRegimeColor(marketData.regime)} px-3 py-1`}>
                {marketData.regime} Market
              </Badge>
              <Badge className="bg-blue-900/20 text-blue-400 px-3 py-1">
                Confidence: {(marketData.confidence * 100).toFixed(1)}%
              </Badge>
      </div>
      
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                <span className="text-sm text-gray-400">
                  {isLive ? 'LIVE' : 'PAUSED'}
                </span>
              </div>
              
              <Button
                variant={isLive ? "destructive" : "default"}
                size="sm"
                onClick={() => setIsLive(!isLive)}
                className="flex items-center space-x-2"
              >
                {isLive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                <span>{isLive ? 'Pause' : 'Start'}</span>
              </Button>
              
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" size="sm" onClick={() => setShowAdvanced(!showAdvanced)}>
                {showAdvanced ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="positions" className="flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Positions</span>
            </TabsTrigger>
            <TabsTrigger value="signals" className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Signals</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="risk" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Risk</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Market Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Market Regime</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white mb-1">{marketData.regime}</div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${getRegimeColor(marketData.regime).includes('green') ? 'bg-green-400' : getRegimeColor(marketData.regime).includes('red') ? 'bg-red-400' : 'bg-yellow-400'}`} />
                    <span className="text-sm text-gray-400">Confidence: {(marketData.confidence * 100).toFixed(1)}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Portfolio P&L</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-400 mb-1">
                    ${marketData.totalPnL.toLocaleString()}
                  </div>
                  <div className="text-sm text-green-400">
                    +${marketData.dailyPnL.toLocaleString()} today
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Active Positions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white mb-1">{marketData.openPositions}</div>
                  <div className="text-sm text-gray-400">
                    {marketData.activeSignals} active signals
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white mb-1">
                    {(marketData.winRate * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-400">
                    Sharpe: {marketData.sharpeRatio.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Market Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg">Market Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">VIX</span>
                    <span className="text-white font-medium">{marketData.vix}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Breadth</span>
                    <span className="text-white font-medium">{(marketData.breadth * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Trend Score</span>
                    <span className="text-white font-medium">{(marketData.trendScore * 100).toFixed(1)}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg">Risk Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Portfolio Heat</span>
                    <span className="text-white font-medium">
                      {(riskMetrics.portfolioHeat * 100).toFixed(1)}% / {(riskMetrics.maxHeat * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Current Drawdown</span>
                    <span className="text-white font-medium">
                      {(riskMetrics.currentDrawdown * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">VaR (95%)</span>
                    <span className="text-white font-medium">${riskMetrics.var95.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg">System Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Status</span>
                    <Badge className="bg-green-900/20 text-green-400">
                      {systemHealth.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Uptime</span>
                    <span className="text-white font-medium">{systemHealth.uptime}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Latency</span>
                    <span className="text-white font-medium">{systemHealth.latency}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Positions Tab */}
          <TabsContent value="positions" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-xl">Active Positions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {positions.map((position) => (
                    <div key={position.id} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Badge className={getSignalColor(position.type)}>
                            {position.type}
                          </Badge>
                          <span className="font-medium">{position.ticker}</span>
                          <span className="text-gray-400">${position.strike}</span>
                          <span className="text-gray-400">{position.expiry}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className={`font-medium ${position.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ${position.pnl.toLocaleString()}
                          </span>
                          <Badge className={getConfidenceColor(position.confidence)}>
                            {(position.confidence * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Entry:</span>
                          <span className="text-white ml-2">${position.entryPrice}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Current:</span>
                          <span className="text-white ml-2">${position.currentPrice}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Delta:</span>
                          <span className="text-white ml-2">{position.delta}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Gamma:</span>
                          <span className="text-white ml-2">{position.gamma}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Signals Tab */}
          <TabsContent value="signals" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-xl">Active Signals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {signals.map((signal) => (
                    <div key={signal.id} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Badge className={getSignalColor(signal.signal)}>
                            {signal.signal}
                          </Badge>
                          <span className="font-medium">{signal.ticker}</span>
                          <span className="text-gray-400">{signal.timeframe}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <Badge className={getConfidenceColor(signal.confidence)}>
                            {(signal.confidence * 100).toFixed(0)}%
                          </Badge>
                          <Badge className="bg-blue-900/20 text-blue-400">
                            {signal.strength}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {signal.factors.map((factor, index) => (
                          <Badge key={index} variant="outline" className="text-gray-400 border-gray-600">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl">Performance Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-400">Total Trades</span>
                      <div className="text-2xl font-bold text-white">{performance.totalTrades}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Win Rate</span>
                      <div className="text-2xl font-bold text-green-400">
                        {(performance.winRate * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Profit Factor</span>
                      <div className="text-2xl font-bold text-white">{performance.profitFactor}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Sharpe Ratio</span>
                      <div className="text-2xl font-bold text-white">{performance.sharpeRatio}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl">Trade Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Average Win</span>
                      <span className="text-green-400 font-medium">${performance.avgWin}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Average Loss</span>
                      <span className="text-red-400 font-medium">${performance.avgLoss}</span>
                    </div>
              <div className="flex justify-between">
                      <span className="text-gray-400">Best Trade</span>
                      <span className="text-green-400 font-medium">${performance.bestTrade}</span>
              </div>
              <div className="flex justify-between">
                      <span className="text-gray-400">Worst Trade</span>
                      <span className="text-red-400 font-medium">${performance.worstTrade}</span>
              </div>
              <div className="flex justify-between">
                      <span className="text-gray-400">Avg Holding Period</span>
                      <span className="text-white font-medium">{performance.avgHoldingPeriod}</span>
                    </div>
              </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Risk Tab */}
          <TabsContent value="risk" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl">Risk Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Portfolio Heat</span>
                      <span className="text-white font-medium">
                        {(riskMetrics.portfolioHeat * 100).toFixed(1)}% / {(riskMetrics.maxHeat * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Current Drawdown</span>
                      <span className="text-white font-medium">
                        {(riskMetrics.currentDrawdown * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Drawdown</span>
                      <span className="text-white font-medium">
                        {(riskMetrics.maxDrawdown * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">VaR (95%)</span>
                      <span className="text-white font-medium">${riskMetrics.var95.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Expected Shortfall</span>
                      <span className="text-white font-medium">${riskMetrics.expectedShortfall.toLocaleString()}</span>
          </div>
        </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl">Portfolio Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Beta</span>
                      <span className="text-white font-medium">{riskMetrics.beta}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Correlation</span>
                      <span className="text-white font-medium">{riskMetrics.correlation}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Consecutive Wins</span>
                      <span className="text-green-400 font-medium">{performance.consecutiveWins}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Consecutive Losses</span>
                      <span className="text-red-400 font-medium">{performance.consecutiveLosses}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}