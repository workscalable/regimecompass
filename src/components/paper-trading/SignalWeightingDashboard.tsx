'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  BarChart3, 
  Settings, 
  RefreshCw, 
  Download, 
  Upload,
  Target,
  Activity,
  Zap,
  Brain
} from 'lucide-react';
import { toast } from 'sonner';

interface SignalWeights {
  technical: number;
  fundamental: number;
  sentiment: number;
  momentum: number;
  volatility: number;
  regime: number;
  sector: number;
}

interface TickerConfidenceData {
  ticker: string;
  confidence: number;
  confidenceDelta: number;
  reliability: number;
  confidenceTrend: 'RISING' | 'FALLING' | 'STABLE';
  averageConfidence: number;
  lastUpdate: string;
}

interface SignalStatistics {
  totalTickers: number;
  averageConfidence: number;
  confidenceRange: { min: number; max: number };
  highConfidenceTickers: number;
  reliabilityDistribution: { high: number; medium: number; low: number };
}

export function SignalWeightingDashboard() {
  const [statistics, setStatistics] = useState<SignalStatistics | null>(null);
  const [tickerData, setTickerData] = useState<TickerConfidenceData[]>([]);
  const [weights, setWeights] = useState<SignalWeights | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form states
  const [selectedTicker, setSelectedTicker] = useState('');
  const [confidenceInput, setConfidenceInput] = useState('');
  const [multiTickerInput, setMultiTickerInput] = useState('');

  useEffect(() => {
    loadData();
    
    // Set up polling for real-time updates
    const interval = setInterval(loadData, 15000); // Every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      // Load statistics
      const statsResponse = await fetch('/api/paper/signals?action=statistics');
      const statsData = await statsResponse.json();
      if (statsData.success) {
        setStatistics(statsData.statistics);
      }

      // Load all ticker data
      const tickersResponse = await fetch('/api/paper/signals?action=all_tickers');
      const tickersData = await tickersResponse.json();
      if (tickersData.success) {
        setTickerData(tickersData.tickers);
      }

      // Load weights
      const weightsResponse = await fetch('/api/paper/signals?action=weights');
      const weightsData = await weightsResponse.json();
      if (weightsData.success) {
        setWeights(weightsData.weights);
      }

      // Load status
      const statusResponse = await fetch('/api/paper/signals?action=status');
      const statusData = await statusResponse.json();
      if (statusData.success) {
        setStatus(statusData.status);
      }

    } catch (error) {
      console.error('Failed to load signal data:', error);
      toast.error('Failed to load signal data');
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (action: string, params: any = {}) => {
    setActionLoading(action);
    
    try {
      const response = await fetch('/api/paper/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ...params
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message || 'Action completed successfully');
        await loadData(); // Refresh data
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

  const updateWeights = async (newWeights: SignalWeights) => {
    await executeAction('update_weights', { weights: newWeights });
  };

  const updateConfidence = async () => {
    if (!selectedTicker || !confidenceInput) {
      toast.error('Please enter ticker and confidence value');
      return;
    }

    const confidence = parseFloat(confidenceInput);
    if (isNaN(confidence) || confidence < 0 || confidence > 100) {
      toast.error('Confidence must be a number between 0 and 100');
      return;
    }

    await executeAction('update_confidence', {
      ticker: selectedTicker.toUpperCase(),
      confidence
    });

    setSelectedTicker('');
    setConfidenceInput('');
  };

  const computeMultiTicker = async () => {
    if (!multiTickerInput.trim()) {
      toast.error('Please enter ticker symbols');
      return;
    }

    const tickers = multiTickerInput.split(',').map(t => t.trim().toUpperCase()).filter(t => t);
    
    if (tickers.length < 2) {
      toast.error('Please enter at least 2 ticker symbols');
      return;
    }

    await executeAction('compute_multi_ticker', { tickers });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.7) return 'text-green-600';
    if (confidence > 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getReliabilityBadge = (reliability: number) => {
    if (reliability > 0.7) return <Badge className="bg-green-100 text-green-800">High</Badge>;
    if (reliability > 0.5) return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
    return <Badge className="bg-red-100 text-red-800">Low</Badge>;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'RISING': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'FALLING': return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Enhanced Signal Weighting Engine
          <Badge variant="outline">Multi-Ticker</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tickers">Tickers</TabsTrigger>
            <TabsTrigger value="weights">Weights</TabsTrigger>
            <TabsTrigger value="controls">Controls</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Statistics */}
            {statistics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-blue-600">Total Tickers</div>
                  <div className="text-2xl font-bold text-blue-900">{statistics.totalTickers}</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-green-600">Avg Confidence</div>
                  <div className="text-2xl font-bold text-green-900">
                    {(statistics.averageConfidence * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="text-sm text-purple-600">High Confidence</div>
                  <div className="text-2xl font-bold text-purple-900">{statistics.highConfidenceTickers}</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="text-sm text-orange-600">Confidence Range</div>
                  <div className="text-lg font-bold text-orange-900">
                    {(statistics.confidenceRange.min * 100).toFixed(0)}% - {(statistics.confidenceRange.max * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            )}

            {/* Reliability Distribution */}
            {statistics && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Reliability Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{statistics.reliabilityDistribution.high}</div>
                      <div className="text-sm text-gray-600">High Reliability</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{statistics.reliabilityDistribution.medium}</div>
                      <div className="text-sm text-gray-600">Medium Reliability</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{statistics.reliabilityDistribution.low}</div>
                      <div className="text-sm text-gray-600">Low Reliability</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* System Status */}
            {status && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">System Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Initialized:</span> 
                      <Badge variant={status.isInitialized ? 'default' : 'secondary'} className="ml-2">
                        {status.isInitialized ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Tracked Tickers:</span> 
                      <span className="ml-2">{status.trackedTickers}</span>
                    </div>
                    <div>
                      <span className="font-medium">Cache Size:</span> 
                      <span className="ml-2">{status.cacheSize}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="tickers" className="space-y-4">
            {/* Ticker List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {tickerData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No ticker data available
                </div>
              ) : (
                tickerData.map((ticker) => (
                  <Card key={ticker.ticker}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="font-medium text-lg">{ticker.ticker}</div>
                          {getTrendIcon(ticker.confidenceTrend)}
                          {getReliabilityBadge(ticker.reliability)}
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${getConfidenceColor(ticker.confidence)}`}>
                            {(ticker.confidence * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-500">
                            Δ {ticker.confidenceDelta > 0 ? '+' : ''}{(ticker.confidenceDelta * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>Avg: {(ticker.averageConfidence * 100).toFixed(1)}%</div>
                        <div>Updated: {new Date(ticker.lastUpdate).toLocaleTimeString()}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="weights" className="space-y-4">
            {/* Weight Configuration */}
            {weights && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Signal Weights Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {Object.entries(weights).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="capitalize">{key}</Label>
                        <span className="text-sm text-gray-600">{(value * 100).toFixed(1)}%</span>
                      </div>
                      <Slider
                        value={[value * 100]}
                        onValueChange={(newValue) => {
                          const newWeights = { ...weights, [key]: newValue[0] / 100 };
                          setWeights(newWeights);
                        }}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  ))}
                  
                  <Separator />
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => updateWeights(weights)}
                      disabled={actionLoading === 'update_weights'}
                      className="flex-1"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      {actionLoading === 'update_weights' ? 'Updating...' : 'Update Weights'}
                    </Button>
                    
                    <Button
                      onClick={() => {
                        // Reset to default weights
                        const defaultWeights = {
                          technical: 0.35,
                          fundamental: 0.15,
                          sentiment: 0.10,
                          momentum: 0.20,
                          volatility: 0.08,
                          regime: 0.07,
                          sector: 0.05
                        };
                        setWeights(defaultWeights);
                      }}
                      variant="outline"
                    >
                      Reset to Default
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="controls" className="space-y-4">
            {/* Manual Confidence Update */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Manual Confidence Update</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Ticker</Label>
                    <Input
                      value={selectedTicker}
                      onChange={(e) => setSelectedTicker(e.target.value.toUpperCase())}
                      placeholder="e.g., AAPL"
                    />
                  </div>
                  <div>
                    <Label>Confidence (%)</Label>
                    <Input
                      type="number"
                      value={confidenceInput}
                      onChange={(e) => setConfidenceInput(e.target.value)}
                      placeholder="0-100"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={updateConfidence}
                      disabled={actionLoading === 'update_confidence'}
                      className="w-full"
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Update
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Multi-Ticker Confidence */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Multi-Ticker Confidence Computation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Ticker Symbols (comma-separated)</Label>
                  <Input
                    value={multiTickerInput}
                    onChange={(e) => setMultiTickerInput(e.target.value)}
                    placeholder="e.g., AAPL, MSFT, GOOGL"
                  />
                </div>
                <Button
                  onClick={computeMultiTicker}
                  disabled={actionLoading === 'compute_multi_ticker'}
                  className="w-full"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {actionLoading === 'compute_multi_ticker' ? 'Computing...' : 'Compute Multi-Ticker Confidence'}
                </Button>
              </CardContent>
            </Card>

            {/* System Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => executeAction('clear_cache')}
                    disabled={actionLoading === 'clear_cache'}
                    variant="outline"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Clear Cache
                  </Button>
                  
                  <Button
                    onClick={() => executeAction('export_data')}
                    disabled={actionLoading === 'export_data'}
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                </div>
                
                <Button
                  onClick={loadData}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}