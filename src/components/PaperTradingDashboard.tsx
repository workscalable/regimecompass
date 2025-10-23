'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  AlertTriangle,
  Activity,
  BarChart3,
  Settings,
  RefreshCw
} from 'lucide-react';

interface PaperPosition {
  id: string;
  ticker: string;
  optionSymbol: string;
  contractType: 'CALL' | 'PUT';
  strike: number;
  expiration: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  confidence: number;
  regime: string;
  daysToExpiration: number;
  greeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
}

interface PerformanceMetrics {
  accountBalance: number;
  totalPnL: number;
  totalPnLPercent: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

interface SystemHealth {
  overall: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  components: Record<string, boolean>;
  activeTickers: number;
  openPositions: number;
}

export const PaperTradingDashboard: React.FC = () => {
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [performance, setPerformance] = useState<PerformanceMetrics>({
    accountBalance: 100000,
    totalPnL: 0,
    totalPnLPercent: 0,
    winRate: 0,
    totalTrades: 0,
    profitFactor: 0,
    sharpeRatio: 0,
    maxDrawdown: 0
  });
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    overall: 'HEALTHY',
    components: {},
    activeTickers: 0,
    openPositions: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchData, 3000); // Update every 3 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchData = async () => {
    try {
      const [positionsRes, performanceRes, healthRes] = await Promise.all([
        fetch('/api/paper/positions'),
        fetch('/api/paper/performance'),
        fetch('/api/system/health')
      ]);

      if (positionsRes.ok) {
        const positionsData = await positionsRes.json();
        setPositions(positionsData);
      }

      if (performanceRes.ok) {
        const performanceData = await performanceRes.json();
        setPerformance(performanceData);
      }

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setSystemHealth(healthData);
      }

      setLastUpdate(new Date());
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-600';
    if (pnl < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'HEALTHY': return 'text-green-600';
      case 'DEGRADED': return 'text-yellow-600';
      case 'UNHEALTHY': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const openPositions = positions.filter(p => p.pnl !== undefined);
  const totalExposure = openPositions.reduce((sum, p) => sum + (p.currentPrice * p.quantity * 100), 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">📄 Paper Trading Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="w-4 h-4 mr-2" />
            Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Account Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Account Balance</p>
                <p className="text-2xl font-bold">{formatCurrency(performance.accountBalance)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total P&L</p>
                <p className={`text-2xl font-bold ${getPnLColor(performance.totalPnL)}`}>
                  {formatCurrency(performance.totalPnL)}
                </p>
                <p className={`text-sm ${getPnLColor(performance.totalPnL)}`}>
                  {formatPercent(performance.totalPnLPercent)}
                </p>
              </div>
              {performance.totalPnL >= 0 ? (
                <TrendingUp className="w-8 h-8 text-green-600" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Win Rate</p>
                <p className="text-2xl font-bold">{performance.winRate.toFixed(1)}%</p>
                <p className="text-sm text-gray-500">{performance.totalTrades} trades</p>
              </div>
              <Target className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Health</p>
                <p className={`text-2xl font-bold ${getHealthColor(systemHealth.overall)}`}>
                  {systemHealth.overall}
                </p>
                <p className="text-sm text-gray-500">{systemHealth.openPositions} open positions</p>
              </div>
              <AlertTriangle className={`w-8 h-8 ${getHealthColor(systemHealth.overall)}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="positions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="positions">Open Positions ({openPositions.length})</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="system">System Status</TabsTrigger>
        </TabsList>

        {/* Positions Tab */}
        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Open Positions</span>
                <Badge variant="outline">
                  Exposure: {formatCurrency(totalExposure)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {openPositions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No open positions
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Ticker</th>
                        <th className="text-left p-2">Contract</th>
                        <th className="text-left p-2">Side</th>
                        <th className="text-left p-2">Qty</th>
                        <th className="text-left p-2">Entry</th>
                        <th className="text-left p-2">Current</th>
                        <th className="text-left p-2">P&L</th>
                        <th className="text-left p-2">Confidence</th>
                        <th className="text-left p-2">Greeks</th>
                        <th className="text-left p-2">DTE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openPositions.map((position) => (
                        <tr key={position.id} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-medium">{position.ticker}</td>
                          <td className="p-2">
                            <div className="text-sm">
                              <div>{position.optionSymbol}</div>
                              <div className="text-gray-500">
                                {position.contractType} ${position.strike}
                              </div>
                            </div>
                          </td>
                          <td className="p-2">
                            <Badge 
                              variant={position.side === 'LONG' ? 'default' : 'secondary'}
                            >
                              {position.side}
                            </Badge>
                          </td>
                          <td className="p-2">{position.quantity}</td>
                          <td className="p-2">${position.entryPrice.toFixed(2)}</td>
                          <td className="p-2">${position.currentPrice.toFixed(2)}</td>
                          <td className={`p-2 font-medium ${getPnLColor(position.pnl)}`}>
                            <div>{formatCurrency(position.pnl)}</div>
                            <div className="text-sm">
                              {formatPercent(position.pnlPercent)}
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center space-x-2">
                              <Progress 
                                value={position.confidence * 100} 
                                className="w-16 h-2"
                              />
                              <span className="text-sm">
                                {(position.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="text-xs space-y-1">
                              <div>Δ: {position.greeks.delta.toFixed(3)}</div>
                              <div>Θ: {position.greeks.theta.toFixed(3)}</div>
                            </div>
                          </td>
                          <td className="p-2">
                            <Badge 
                              variant={position.daysToExpiration <= 7 ? 'destructive' : 'outline'}
                            >
                              {position.daysToExpiration}d
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Profit Factor:</span>
                  <span className="font-medium">{performance.profitFactor.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sharpe Ratio:</span>
                  <span className="font-medium">{performance.sharpeRatio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Drawdown:</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(performance.maxDrawdown)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Trades:</span>
                  <span className="font-medium">{performance.totalTrades}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Portfolio Heat:</span>
                  <span className="font-medium">
                    {((totalExposure / performance.accountBalance) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Open Positions:</span>
                  <span className="font-medium">{openPositions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Exposure:</span>
                  <span className="font-medium">{formatCurrency(totalExposure)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Available Cash:</span>
                  <span className="font-medium">
                    {formatCurrency(performance.accountBalance - totalExposure)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Greeks Exposure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {openPositions.length > 0 ? (
                  <>
                    <div className="flex justify-between">
                      <span>Total Delta:</span>
                      <span className="font-medium">
                        {openPositions.reduce((sum, p) => sum + (p.greeks.delta * p.quantity), 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Gamma:</span>
                      <span className="font-medium">
                        {openPositions.reduce((sum, p) => sum + (p.greeks.gamma * p.quantity), 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Theta:</span>
                      <span className="font-medium text-red-600">
                        {openPositions.reduce((sum, p) => sum + (p.greeks.theta * p.quantity), 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Vega:</span>
                      <span className="font-medium">
                        {openPositions.reduce((sum, p) => sum + (p.greeks.vega * p.quantity), 0).toFixed(2)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-gray-500">No positions</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Status Tab */}
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Components</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(systemHealth.components).map(([component, healthy]) => (
                  <div key={component} className="flex items-center justify-between p-3 border rounded">
                    <span className="capitalize">{component.replace(/([A-Z])/g, ' $1')}</span>
                    <Badge variant={healthy ? 'default' : 'destructive'}>
                      {healthy ? 'Healthy' : 'Error'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Active Tickers:</span>
                <span className="font-medium">{systemHealth.activeTickers}</span>
              </div>
              <div className="flex justify-between">
                <span>Open Positions:</span>
                <span className="font-medium">{systemHealth.openPositions}</span>
              </div>
              <div className="flex justify-between">
                <span>System Status:</span>
                <Badge variant={systemHealth.overall === 'HEALTHY' ? 'default' : 'destructive'}>
                  {systemHealth.overall}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};