'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Clock, 
  Target, 
  AlertTriangle,
  CheckCircle,
  Pause,
  Play,
  BarChart3,
  Filter,
  SortAsc,
  SortDesc,
  RefreshCw,
  Zap,
  DollarSign,
  Percent
} from 'lucide-react';
import { toast } from 'sonner';

// Interfaces for ticker state data
interface TickerState {
  ticker: string;
  status: 'READY' | 'SET' | 'GO' | 'COOLDOWN';
  confidence: number;
  confidenceDelta: number;
  openPosition: boolean;
  positionId?: string;
  regime: string;
  trendComposite: number;
  phaseComposite: number;
  vwapDeviation: number;
  priority: number;
  lastUpdate: string;
  reliability: number;
  pnl?: number;
  unrealizedPnL?: number;
  daysHeld?: number;
}

interface TickerStateStats {
  totalTickers: number;
  activePositions: number;
  readyTickers: number;
  setTickers: number;
  goTickers: number;
  cooldownTickers: number;
  avgConfidence: number;
  totalPnL: number;
  bestPerformer: string;
  worstPerformer: string;
}

export function TickerStateDashboard() {
  const [tickerStates, setTickerStates] = useState<TickerState[]>([]);
  const [stats, setStats] = useState<TickerStateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Filtering and sorting state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [regimeFilter, setRegimeFilter] = useState<string>('');
  const [positionFilter, setPositionFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('confidence');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [confidenceRange, setConfidenceRange] = useState<{ min: number; max: number }>({ min: 0, max: 100 });

  useEffect(() => {
    loadTickerStates();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadTickerStates, 3000); // Every 3 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadTickerStates = async () => {
    try {
      const response = await fetch('/api/paper/ticker-states?action=states');
      const data = await response.json();
      
      if (data.success) {
        setTickerStates(data.states);
        setStats(data.stats);
      } else {
        // Fallback to mock data if API fails
        const mockData = generateMockTickerStates();
        setTickerStates(mockData.states);
        setStats(mockData.stats);
        console.warn('Using mock data due to API failure');
      }
    } catch (error) {
      console.error('Failed to load ticker states:', error);
      // Fallback to mock data
      const mockData = generateMockTickerStates();
      setTickerStates(mockData.states);
      setStats(mockData.stats);
      toast.error('Failed to load ticker states - using mock data');
    } finally {
      setLoading(false);
    }
  }; 
 // Generate mock data for demonstration
  const generateMockTickerStates = (): { states: TickerState[]; stats: TickerStateStats } => {
    const tickers = ['SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'META', 'AMZN', 'GOOGL', 'JPM', 'BAC'];
    const statuses: TickerState['status'][] = ['READY', 'SET', 'GO', 'COOLDOWN'];
    const regimes = ['BULL', 'BEAR', 'NEUTRAL', 'TRANSITION'];
    
    const states: TickerState[] = tickers.map(ticker => {
      const hasPosition = Math.random() > 0.7;
      const confidence = Math.random() * 100;
      const pnl = hasPosition ? (Math.random() - 0.5) * 1000 : undefined;
      
      return {
        ticker,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        confidence,
        confidenceDelta: (Math.random() - 0.5) * 10,
        openPosition: hasPosition,
        positionId: hasPosition ? `pos_${ticker}_${Date.now()}` : undefined,
        regime: regimes[Math.floor(Math.random() * regimes.length)],
        trendComposite: Math.random(),
        phaseComposite: Math.random(),
        vwapDeviation: (Math.random() - 0.5) * 0.02,
        priority: Math.random(),
        lastUpdate: new Date(Date.now() - Math.random() * 300000).toISOString(),
        reliability: Math.random(),
        pnl,
        unrealizedPnL: hasPosition ? pnl : undefined,
        daysHeld: hasPosition ? Math.floor(Math.random() * 30) : undefined
      };
    });

    const stats: TickerStateStats = {
      totalTickers: states.length,
      activePositions: states.filter(s => s.openPosition).length,
      readyTickers: states.filter(s => s.status === 'READY').length,
      setTickers: states.filter(s => s.status === 'SET').length,
      goTickers: states.filter(s => s.status === 'GO').length,
      cooldownTickers: states.filter(s => s.status === 'COOLDOWN').length,
      avgConfidence: states.reduce((sum, s) => sum + s.confidence, 0) / states.length,
      totalPnL: states.reduce((sum, s) => sum + (s.pnl || 0), 0),
      bestPerformer: states.sort((a, b) => (b.pnl || 0) - (a.pnl || 0))[0]?.ticker || 'N/A',
      worstPerformer: states.sort((a, b) => (a.pnl || 0) - (b.pnl || 0))[0]?.ticker || 'N/A'
    };

    return { states, stats };
  };

  // Filtering and sorting logic
  const getFilteredAndSortedStates = (): TickerState[] => {
    let filtered = tickerStates.filter(state => {
      // Search term filter
      if (searchTerm && !state.ticker.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Status filter
      if (statusFilter && state.status !== statusFilter) {
        return false;
      }
      
      // Regime filter
      if (regimeFilter && state.regime !== regimeFilter) {
        return false;
      }
      
      // Position filter
      if (positionFilter === 'open' && !state.openPosition) {
        return false;
      }
      if (positionFilter === 'closed' && state.openPosition) {
        return false;
      }
      
      // Confidence range filter
      if (state.confidence < confidenceRange.min || state.confidence > confidenceRange.max) {
        return false;
      }
      
      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;
      
      switch (sortBy) {
        case 'ticker':
          aValue = a.ticker;
          bValue = b.ticker;
          break;
        case 'confidence':
          aValue = a.confidence;
          bValue = b.confidence;
          break;
        case 'priority':
          aValue = a.priority;
          bValue = b.priority;
          break;
        case 'pnl':
          aValue = a.pnl || 0;
          bValue = b.pnl || 0;
          break;
        case 'reliability':
          aValue = a.reliability;
          bValue = b.reliability;
          break;
        case 'lastUpdate':
          aValue = new Date(a.lastUpdate).getTime();
          bValue = new Date(b.lastUpdate).getTime();
          break;
        default:
          aValue = a.confidence;
          bValue = b.confidence;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      return sortOrder === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
    });

    return filtered;
  };

  // Helper functions for UI
  const getStatusColor = (status: TickerState['status']) => {
    switch (status) {
      case 'READY': return 'bg-blue-100 text-blue-800';
      case 'SET': return 'bg-yellow-100 text-yellow-800';
      case 'GO': return 'bg-green-100 text-green-800';
      case 'COOLDOWN': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: TickerState['status']) => {
    switch (status) {
      case 'READY': return <Clock className="h-4 w-4" />;
      case 'SET': return <Target className="h-4 w-4" />;
      case 'GO': return <Zap className="h-4 w-4" />;
      case 'COOLDOWN': return <Pause className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRegimeColor = (regime: string) => {
    switch (regime) {
      case 'BULL': return 'bg-green-100 text-green-800';
      case 'BEAR': return 'bg-red-100 text-red-800';
      case 'NEUTRAL': return 'bg-blue-100 text-blue-800';
      case 'TRANSITION': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPnLColor = (pnl: number | undefined) => {
    if (!pnl) return 'text-gray-500';
    return pnl > 0 ? 'text-green-600' : 'text-red-600';
  };

  const formatPnL = (pnl: number | undefined) => {
    if (!pnl) return 'N/A';
    return `${pnl > 0 ? '+' : ''}$${pnl.toFixed(2)}`;
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const filteredStates = getFilteredAndSortedStates();

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
  }  retur
n (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Ticker State Dashboard
            <Badge variant="outline">{filteredStates.length} tickers</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {autoRefresh ? 'Pause' : 'Resume'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={loadTickerStates}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="states">Ticker States</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Statistics Cards */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-blue-600">Total Tickers</div>
                  <div className="text-2xl font-bold text-blue-900">{stats.totalTickers}</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-green-600">Active Positions</div>
                  <div className="text-2xl font-bold text-green-900">{stats.activePositions}</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="text-sm text-purple-600">Avg Confidence</div>
                  <div className="text-2xl font-bold text-purple-900">{stats.avgConfidence.toFixed(1)}%</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="text-sm text-orange-600">Total P&L</div>
                  <div className={`text-2xl font-bold ${getPnLColor(stats.totalPnL)}`}>
                    {formatPnL(stats.totalPnL)}
                  </div>
                </div>
              </div>
            )}

            {/* Status Distribution */}
            {stats && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{stats.readyTickers}</div>
                      <div className="text-sm text-gray-600">Ready</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{stats.setTickers}</div>
                      <div className="text-sm text-gray-600">Set</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{stats.goTickers}</div>
                      <div className="text-sm text-gray-600">Go</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">{stats.cooldownTickers}</div>
                      <div className="text-sm text-gray-600">Cooldown</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top Performers */}
            {stats && (
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-green-600">Best Performer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{stats.bestPerformer}</div>
                      <TrendingUp className="h-6 w-6 text-green-500 mx-auto mt-2" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-red-600">Worst Performer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{stats.worstPerformer}</div>
                      <TrendingDown className="h-6 w-6 text-red-500 mx-auto mt-2" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="states" className="space-y-4">
            {/* Filters and Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters & Sorting
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Search Ticker</Label>
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="e.g., AAPL"
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Statuses</SelectItem>
                        <SelectItem value="READY">Ready</SelectItem>
                        <SelectItem value="SET">Set</SelectItem>
                        <SelectItem value="GO">Go</SelectItem>
                        <SelectItem value="COOLDOWN">Cooldown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Regime</Label>
                    <Select value={regimeFilter} onValueChange={setRegimeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All regimes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Regimes</SelectItem>
                        <SelectItem value="BULL">Bull</SelectItem>
                        <SelectItem value="BEAR">Bear</SelectItem>
                        <SelectItem value="NEUTRAL">Neutral</SelectItem>
                        <SelectItem value="TRANSITION">Transition</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Positions</Label>
                    <Select value={positionFilter} onValueChange={setPositionFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All positions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Positions</SelectItem>
                        <SelectItem value="open">Open Only</SelectItem>
                        <SelectItem value="closed">No Positions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label>Sort by:</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ticker">Ticker</SelectItem>
                        <SelectItem value="confidence">Confidence</SelectItem>
                        <SelectItem value="priority">Priority</SelectItem>
                        <SelectItem value="pnl">P&L</SelectItem>
                        <SelectItem value="reliability">Reliability</SelectItem>
                        <SelectItem value="lastUpdate">Last Update</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                    {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  </Button>
                </div>
              </CardContent>
            </Card>      
      {/* Ticker States Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ticker States ({filteredStates.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredStates.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No tickers match the current filters
                    </div>
                  ) : (
                    filteredStates.map((state) => (
                      <div key={state.ticker} className="p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="font-bold text-lg">{state.ticker}</div>
                            <Badge className={getStatusColor(state.status)}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(state.status)}
                                {state.status}
                              </div>
                            </Badge>
                            <Badge className={getRegimeColor(state.regime)}>
                              {state.regime}
                            </Badge>
                            {state.openPosition && (
                              <Badge variant="default">
                                <DollarSign className="h-3 w-3 mr-1" />
                                Position
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${getConfidenceColor(state.confidence)}`}>
                              {state.confidence.toFixed(1)}%
                            </div>
                            <div className="text-sm text-gray-500">
                              {state.confidenceDelta > 0 ? '+' : ''}{state.confidenceDelta.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Priority:</span>
                            <div className="font-medium">{formatPercentage(state.priority)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Reliability:</span>
                            <div className="font-medium">{formatPercentage(state.reliability)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Trend:</span>
                            <div className="font-medium">{formatPercentage(state.trendComposite)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Phase:</span>
                            <div className="font-medium">{formatPercentage(state.phaseComposite)}</div>
                          </div>
                        </div>
                        
                        {state.openPosition && (
                          <div className="mt-3 p-2 bg-blue-50 rounded">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">P&L:</span>
                                <div className={`font-bold ${getPnLColor(state.pnl)}`}>
                                  {formatPnL(state.pnl)}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-600">Unrealized:</span>
                                <div className={`font-bold ${getPnLColor(state.unrealizedPnL)}`}>
                                  {formatPnL(state.unrealizedPnL)}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-600">Days Held:</span>
                                <div className="font-medium">{state.daysHeld || 0}</div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-2 text-xs text-gray-500">
                          Last updated: {formatTimestamp(state.lastUpdate)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {/* Confidence Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Confidence Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['High (80%+)', 'Medium (60-80%)', 'Low (<60%)'].map((range, index) => {
                    const ranges = [
                      tickerStates.filter(s => s.confidence >= 80),
                      tickerStates.filter(s => s.confidence >= 60 && s.confidence < 80),
                      tickerStates.filter(s => s.confidence < 60)
                    ];
                    const count = ranges[index].length;
                    const percentage = tickerStates.length > 0 ? (count / tickerStates.length) * 100 : 0;
                    
                    return (
                      <div key={range} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="font-medium">{range}</span>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-gray-600">{count} tickers</div>
                          <div className="text-sm font-bold">{percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Regime Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Regime Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['BULL', 'BEAR', 'NEUTRAL', 'TRANSITION'].map(regime => {
                    const count = tickerStates.filter(s => s.regime === regime).length;
                    const percentage = tickerStates.length > 0 ? (count / tickerStates.length) * 100 : 0;
                    
                    return (
                      <div key={regime} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <Badge className={getRegimeColor(regime)}>{regime}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-gray-600">{count} tickers</div>
                          <div className="text-sm font-bold">{percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">Profitable Positions</div>
                    <div className="text-2xl font-bold text-green-600">
                      {tickerStates.filter(s => s.pnl && s.pnl > 0).length}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">Losing Positions</div>
                    <div className="text-2xl font-bold text-red-600">
                      {tickerStates.filter(s => s.pnl && s.pnl < 0).length}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}