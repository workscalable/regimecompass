import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Settings, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  AlertCircle,
  TrendingUp,
  Activity,
  BarChart3,
  Target,
  Brain
} from 'lucide-react';

import TickerStateDashboard from '../components/TickerStateDashboard';
import FibonacciDashboard from '../components/FibonacciDashboard';
import AlgorithmLearningDashboard from '../components/AlgorithmLearningDashboard';
import { useRealTimeData, useMockRealTimeData } from '../hooks/useRealTimeData';

/**
 * Main Dashboard Page
 * 
 * Comprehensive dashboard with multi-ticker state visualization:
 * - Real-time ticker state monitoring with Ready-Set-Go status
 * - Confidence heatmap with color-coded indicators
 * - State transition history and alerts
 * - System health and connection status
 * - Configuration and control interfaces
 */

const Dashboard: React.FC = () => {
  // Use mock data for development, real WebSocket data for production
  const isDevelopment = process.env.NODE_ENV === 'development';
  const realTimeData = isDevelopment ? useMockRealTimeData() : useRealTimeData();
  
  const {
    tickers,
    isConnected,
    connectionStatus,
    lastUpdate,
    error,
    connect,
    disconnect,
    subscribeToTicker,
    unsubscribeFromTicker
  } = realTimeData;

  // Local state
  const [selectedTab, setSelectedTab] = useState('overview');
  const [showSettings, setShowSettings] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Connection status indicator
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600 bg-green-50';
      case 'connecting': return 'text-yellow-600 bg-yellow-50';
      case 'disconnected': return 'text-gray-600 bg-gray-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <Wifi className="w-4 h-4" />;
      case 'connecting': return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'disconnected': 
      case 'error': return <WifiOff className="w-4 h-4" />;
      default: return <WifiOff className="w-4 h-4" />;
    }
  };

  // Handle ticker selection
  const handleTickerSelect = (symbol: string) => {
    console.log('Selected ticker:', symbol);
    // Could navigate to detailed view or show modal
  };

  // Handle manual refresh
  const handleRefresh = () => {
    if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
      connect();
    }
  };

  // Subscribe to default tickers on mount
  useEffect(() => {
    const defaultTickers = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'AMZN'];
    defaultTickers.forEach(symbol => {
      subscribeToTicker(symbol);
    });
  }, [subscribeToTicker]);

  return (
    <>
      <Head>
        <title>Gamma Adaptive System - Dashboard</title>
        <meta name="description" content="Multi-ticker trading system dashboard with real-time monitoring" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-semibold text-gray-900">
                  Gamma Adaptive System
                </h1>
                
                {/* Connection Status */}
                <Badge className={getConnectionStatusColor()}>
                  <div className="flex items-center space-x-1">
                    {getConnectionIcon()}
                    <span className="capitalize">{connectionStatus}</span>
                  </div>
                </Badge>
                
                {/* Last Update */}
                <span className="text-sm text-gray-500">
                  Updated: {lastUpdate.toLocaleTimeString()}
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Auto Refresh Toggle */}
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded"
                  />
                  <span>Auto Refresh</span>
                </label>
                
                {/* Manual Refresh */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={connectionStatus === 'connecting'}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${
                    connectionStatus === 'connecting' ? 'animate-spin' : ''
                  }`} />
                  Refresh
                </Button>
                
                {/* Settings */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
              <span className="text-red-700">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.reload()}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                Reload Page
              </Button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview" className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="tickers" className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4" />
                <span>Tickers</span>
              </TabsTrigger>
              <TabsTrigger value="options" className="flex items-center space-x-2">
                <Target className="w-4 h-4" />
                <span>Options</span>
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center space-x-2">
                <Activity className="w-4 h-4" />
                <span>Performance</span>
              </TabsTrigger>
              <TabsTrigger value="learning" className="flex items-center space-x-2">
                <Brain className="w-4 h-4" />
                <span>Learning</span>
              </TabsTrigger>
              <TabsTrigger value="system" className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>System</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <SystemOverview 
                tickers={tickers}
                connectionStatus={connectionStatus}
                lastUpdate={lastUpdate}
              />
            </TabsContent>

            {/* Tickers Tab */}
            <TabsContent value="tickers" className="space-y-6">
              <TickerStateDashboard
                tickers={tickers}
                isConnected={isConnected}
                lastUpdate={lastUpdate}
                onTickerSelect={handleTickerSelect}
              />
            </TabsContent>

            {/* Options Tab */}
            <TabsContent value="options" className="space-y-6">
              <OptionsOverview />
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-6">
              <PerformanceOverview tickers={tickers} />
            </TabsContent>

            {/* Learning Tab */}
            <TabsContent value="learning" className="space-y-6">
              <LearningOverview />
            </TabsContent>

            {/* System Tab */}
            <TabsContent value="system" className="space-y-6">
              <SystemControls
                connectionStatus={connectionStatus}
                onConnect={connect}
                onDisconnect={disconnect}
                onSubscribe={subscribeToTicker}
                onUnsubscribe={unsubscribeFromTicker}
              />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
};

// System Overview Component
const SystemOverview: React.FC<{
  tickers: any[];
  connectionStatus: string;
  lastUpdate: Date;
}> = ({ tickers, connectionStatus, lastUpdate }) => {
  const stats = {
    totalTickers: tickers.length,
    goSignals: tickers.filter(t => t.state === 'GO').length,
    setSignals: tickers.filter(t => t.state === 'SET').length,
    readySignals: tickers.filter(t => t.state === 'READY').length,
    avgConfidence: tickers.length > 0 
      ? tickers.reduce((sum, t) => sum + t.confidence, 0) / tickers.length 
      : 0,
    highConfidence: tickers.filter(t => t.confidence >= 0.8).length,
    alerts: tickers.reduce((sum, t) => sum + t.alerts.length, 0)
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.totalTickers}</div>
            <div className="text-sm text-gray-600">Total Tickers</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.goSignals}</div>
            <div className="text-sm text-gray-600">GO Signals</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.setSignals}</div>
            <div className="text-sm text-gray-600">SET Signals</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.readySignals}</div>
            <div className="text-sm text-gray-600">READY Signals</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{(stats.avgConfidence * 100).toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Avg Confidence</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.highConfidence}</div>
            <div className="text-sm text-gray-600">High Confidence</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.alerts}</div>
            <div className="text-sm text-gray-600">Active Alerts</div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performers by Confidence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tickers
              .sort((a, b) => b.confidence - a.confidence)
              .slice(0, 5)
              .map((ticker) => (
                <div key={ticker.symbol} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="font-semibold">{ticker.symbol}</span>
                    <Badge className={`${
                      ticker.state === 'GO' ? 'bg-green-500' :
                      ticker.state === 'SET' ? 'bg-yellow-500' :
                      ticker.state === 'READY' ? 'bg-blue-500' :
                      ticker.state === 'HOLD' ? 'bg-orange-500' :
                      'bg-red-500'
                    } text-white`}>
                      {ticker.state}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{(ticker.confidence * 100).toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">${ticker.metrics.price.toFixed(2)}</div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Performance Overview Component
const PerformanceOverview: React.FC<{ tickers: any[] }> = ({ tickers }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Paper Trading Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Real-Time Performance Analytics
            </h3>
            <p className="text-gray-600 mb-6">
              Track paper trading performance with real-time PnL, position analysis, and comprehensive trade analytics.
            </p>
            <Button onClick={() => window.open('/performance', '_blank')}>
              <Activity className="w-4 h-4 mr-2" />
              Open Performance Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Quick Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">$12,450</div>
            <div className="text-sm text-gray-600">Total P&L</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">73%</div>
            <div className="text-sm text-gray-600">Win Rate</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">1.8</div>
            <div className="text-sm text-gray-600">Sharpe Ratio</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">8.2%</div>
            <div className="text-sm text-gray-600">Portfolio Heat</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Options Overview Component
const OptionsOverview: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Options Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Smart Options Analysis
            </h3>
            <p className="text-gray-600 mb-6">
              Get intelligent options recommendations with Greeks analysis, risk metrics, and liquidity assessment.
            </p>
            <Button onClick={() => window.open('/options', '_blank')}>
              <Target className="w-4 h-4 mr-2" />
              Open Options Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">12</div>
            <div className="text-sm text-gray-600">Active Recommendations</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">85%</div>
            <div className="text-sm text-gray-600">Avg Confidence</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">1:2.4</div>
            <div className="text-sm text-gray-600">Avg Risk/Reward</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Learning Overview Component
const LearningOverview: React.FC = () => {
  const [selectedView, setSelectedView] = useState<'fibonacci' | 'learning'>('fibonacci');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Learning & Analysis Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600">
              Advanced Fibonacci analysis and algorithm learning insights for continuous system improvement.
            </p>
            <div className="flex gap-2">
              <Button
                variant={selectedView === 'fibonacci' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedView('fibonacci')}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Fibonacci
              </Button>
              <Button
                variant={selectedView === 'learning' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedView('learning')}
              >
                <Brain className="w-4 h-4 mr-2" />
                Learning
              </Button>
            </div>
          </div>

          {selectedView === 'fibonacci' ? (
            <FibonacciDashboard />
          ) : (
            <AlgorithmLearningDashboard />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// System Controls Component
const SystemControls: React.FC<{
  connectionStatus: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onSubscribe: (symbol: string) => void;
  onUnsubscribe: (symbol: string) => void;
}> = ({ connectionStatus, onConnect, onDisconnect, onSubscribe, onUnsubscribe }) => {
  const [newSymbol, setNewSymbol] = useState('');

  const handleAddSymbol = () => {
    if (newSymbol.trim()) {
      onSubscribe(newSymbol.trim().toUpperCase());
      setNewSymbol('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>WebSocket Status: <strong className="capitalize">{connectionStatus}</strong></span>
            <div className="space-x-2">
              <Button
                onClick={onConnect}
                disabled={connectionStatus === 'connected' || connectionStatus === 'connecting'}
                size="sm"
              >
                Connect
              </Button>
              <Button
                onClick={onDisconnect}
                disabled={connectionStatus === 'disconnected'}
                variant="outline"
                size="sm"
              >
                Disconnect
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ticker Management */}
      <Card>
        <CardHeader>
          <CardTitle>Ticker Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              placeholder="Enter ticker symbol (e.g., AAPL)"
              className="flex-1 px-3 py-2 border rounded-md"
              onKeyPress={(e) => e.key === 'Enter' && handleAddSymbol()}
            />
            <Button onClick={handleAddSymbol} disabled={!newSymbol.trim()}>
              Add Ticker
            </Button>
          </div>
          
          <div className="text-sm text-gray-600">
            Add ticker symbols to monitor their real-time state and confidence levels.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;