'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Settings, 
  Activity, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Minus,
  Zap,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

interface OrchestratorStatus {
  mode: 'single-ticker' | 'multi-ticker';
  isRunning: boolean;
  isInitialized: boolean;
  transitionInProgress: boolean;
  currentTicker?: string;
  watchlist: string[];
  activeTickers?: number;
  activePositions: number;
  multiTickerStatus?: any;
  performanceMetrics: {
    totalTrades: number;
    winningTrades: number;
    totalPnL: number;
    consecutiveLosses: number;
    modePerformance: {
      singleTicker: { trades: number; pnl: number; winRate: number };
      multiTicker: { trades: number; pnl: number; winRate: number };
    };
  };
  config: any;
  health: {
    overall: string;
    components: Record<string, boolean>;
  };
}

export function OrchestratorDashboard() {
  const [status, setStatus] = useState<OrchestratorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Configuration state
  const [newTicker, setNewTicker] = useState('');
  const [switchMode, setSwitchMode] = useState<'single-ticker' | 'multi-ticker'>('multi-ticker');
  const [switchTicker, setSwitchTicker] = useState('');

  useEffect(() => {
    loadStatus();
    
    // Set up polling for real-time updates
    const interval = setInterval(loadStatus, 10000); // Every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const response = await fetch('/api/paper/orchestrator?detailed=true');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to load orchestrator status:', error);
      toast.error('Failed to load orchestrator status');
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (action: string, params: any = {}) => {
    setActionLoading(action);
    
    try {
      const response = await fetch('/api/paper/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ...params
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        await loadStatus(); // Refresh status
      } else {
        toast.error(data.error || 'Action failed');
      }
    } catch (error) {
      console.error(`Failed to execute ${action}:`, error);
      toast.error(`Failed to execute ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (isHealthy: boolean) => {
    return isHealthy ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (isHealthy: boolean) => {
    return isHealthy ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Failed to load orchestrator status
          </div>
        </CardContent>
      </Card>
    );
  }

  const winRate = status.performanceMetrics.totalTrades > 0 ? 
    (status.performanceMetrics.winningTrades / status.performanceMetrics.totalTrades * 100) : 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Realtime Orchestrator
          <Badge variant={status.isRunning ? 'default' : 'secondary'}>
            {status.isRunning ? 'Running' : 'Stopped'}
          </Badge>
          <Badge variant="outline">
            {status.mode}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="control">Control</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="health">Health</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* System Status */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-blue-600">Mode</div>
                <div className="text-lg font-bold text-blue-900">
                  {status.mode === 'single-ticker' ? 'Single' : 'Multi'}-Ticker
                </div>
                {status.currentTicker && (
                  <div className="text-xs text-blue-700">{status.currentTicker}</div>
                )}
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm text-green-600">Active Positions</div>
                <div className="text-2xl font-bold text-green-900">{status.activePositions}</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-sm text-purple-600">Watchlist</div>
                <div className="text-2xl font-bold text-purple-900">{status.watchlist.length}</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-sm text-orange-600">Health</div>
                <div className={`text-lg font-bold ${getStatusColor(status.health.overall === 'HEALTHY')}`}>
                  {status.health.overall}
                </div>
              </div>
            </div>

            {/* Watchlist */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Watchlist</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {status.watchlist.map((ticker) => (
                    <Badge key={ticker} variant="outline" className="text-sm">
                      {ticker}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Multi-Ticker Status */}
            {status.mode === 'multi-ticker' && status.multiTickerStatus && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Multi-Ticker Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {status.multiTickerStatus.tickers?.map((ticker: any) => (
                      <div key={ticker.ticker} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{ticker.ticker}</span>
                          <Badge variant={ticker.openPosition ? 'default' : 'secondary'}>
                            {ticker.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          Confidence: {(ticker.confidence * 100).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="control" className="space-y-4">
            {/* System Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={() => executeAction('start')}
                    disabled={status.isRunning || actionLoading === 'start'}
                    variant={status.isRunning ? 'secondary' : 'default'}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {actionLoading === 'start' ? 'Starting...' : 'Start'}
                  </Button>
                  
                  <Button
                    onClick={() => executeAction('pause_trading')}
                    disabled={!status.isRunning || actionLoading === 'pause_trading'}
                    variant="outline"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    {actionLoading === 'pause_trading' ? 'Pausing...' : 'Pause'}
                  </Button>
                  
                  <Button
                    onClick={() => executeAction('stop')}
                    disabled={!status.isRunning || actionLoading === 'stop'}
                    variant="destructive"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    {actionLoading === 'stop' ? 'Stopping...' : 'Stop'}
                  </Button>
                  
                  <Button
                    onClick={() => executeAction('restart')}
                    disabled={actionLoading === 'restart'}
                    variant="outline"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {actionLoading === 'restart' ? 'Restarting...' : 'Restart'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Mode Switching */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mode Control</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Target Mode</Label>
                    <Select value={switchMode} onValueChange={(value: any) => setSwitchMode(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multi-ticker">Multi-Ticker</SelectItem>
                        <SelectItem value="single-ticker">Single-Ticker</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {switchMode === 'single-ticker' && (
                    <div>
                      <Label>Ticker</Label>
                      <Input
                        value={switchTicker}
                        onChange={(e) => setSwitchTicker(e.target.value.toUpperCase())}
                        placeholder="e.g., SPY"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-end">
                    <Button
                      onClick={() => executeAction('switch_mode', {
                        mode: switchMode,
                        ticker: switchMode === 'single-ticker' ? switchTicker : undefined
                      })}
                      disabled={
                        status.transitionInProgress ||
                        (switchMode === 'single-ticker' && !switchTicker) ||
                        actionLoading === 'switch_mode'
                      }
                      className="w-full"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      {actionLoading === 'switch_mode' ? 'Switching...' : 'Switch Mode'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Watchlist Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Watchlist Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newTicker}
                    onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                    placeholder="Enter ticker symbol"
                    className="flex-1"
                  />
                  <Button
                    onClick={() => {
                      executeAction('add_ticker', { ticker: newTicker });
                      setNewTicker('');
                    }}
                    disabled={!newTicker || actionLoading === 'add_ticker'}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Current Tickers</Label>
                  <div className="flex flex-wrap gap-2">
                    {status.watchlist.map((ticker) => (
                      <div key={ticker} className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1">
                        <span className="text-sm">{ticker}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => executeAction('remove_ticker', { ticker })}
                          disabled={actionLoading === 'remove_ticker'}
                          className="h-4 w-4 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            {/* Performance Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-blue-600">Total Trades</div>
                <div className="text-2xl font-bold text-blue-900">{status.performanceMetrics.totalTrades}</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm text-green-600">Win Rate</div>
                <div className="text-2xl font-bold text-green-900">{winRate.toFixed(1)}%</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-sm text-purple-600">Total P&L</div>
                <div className={`text-2xl font-bold ${status.performanceMetrics.totalPnL >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                  ${status.performanceMetrics.totalPnL.toFixed(2)}
                </div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-sm text-orange-600">Consecutive Losses</div>
                <div className={`text-2xl font-bold ${status.performanceMetrics.consecutiveLosses > 3 ? 'text-red-900' : 'text-orange-900'}`}>
                  {status.performanceMetrics.consecutiveLosses}
                </div>
              </div>
            </div>

            {/* Mode Performance Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mode Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Single-Ticker Mode</h4>
                    <div className="space-y-1 text-sm">
                      <div>Trades: {status.performanceMetrics.modePerformance.singleTicker.trades}</div>
                      <div>P&L: ${status.performanceMetrics.modePerformance.singleTicker.pnl.toFixed(2)}</div>
                      <div>Win Rate: {(status.performanceMetrics.modePerformance.singleTicker.winRate * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Multi-Ticker Mode</h4>
                    <div className="space-y-1 text-sm">
                      <div>Trades: {status.performanceMetrics.modePerformance.multiTicker.trades}</div>
                      <div>P&L: ${status.performanceMetrics.modePerformance.multiTicker.pnl.toFixed(2)}</div>
                      <div>Win Rate: {(status.performanceMetrics.modePerformance.multiTicker.winRate * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Optimization */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Optimization</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => executeAction('optimize')}
                  disabled={actionLoading === 'optimize'}
                  variant="outline"
                  className="w-full"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  {actionLoading === 'optimize' ? 'Analyzing...' : 'Analyze & Optimize'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="health" className="space-y-4">
            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Health Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="font-medium">Overall Health</span>
                    <div className={`flex items-center gap-2 ${getStatusColor(status.health.overall === 'HEALTHY')}`}>
                      {getStatusIcon(status.health.overall === 'HEALTHY')}
                      <span>{status.health.overall}</span>
                    </div>
                  </div>
                  
                  {Object.entries(status.health.components).map(([component, healthy]) => (
                    <div key={component} className="flex items-center justify-between p-2 border-l-2 border-gray-200 pl-4">
                      <span className="capitalize">{component.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <div className={`flex items-center gap-2 ${getStatusColor(healthy)}`}>
                        {getStatusIcon(healthy)}
                        <span>{healthy ? 'Healthy' : 'Unhealthy'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Health Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Health Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => executeAction('health_check')}
                  disabled={actionLoading === 'health_check'}
                  variant="outline"
                  className="w-full"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  {actionLoading === 'health_check' ? 'Checking...' : 'Run Health Check'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}