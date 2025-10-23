'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Zap, 
  Settings, 
  RefreshCw, 
  Play, 
  Pause,
  BarChart3,
  Network,
  Clock,
  Users,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

interface EventStats {
  totalEvents: number;
  eventsPerTicker: Record<string, number>;
  eventTypeCounts: Record<string, number>;
  averageLatency: number;
  peakThroughput: number;
  lastUpdate: string;
}

interface TickerActivity {
  eventCount: number;
  lastSeen: string;
  isActive: boolean;
}

interface Subscription {
  id: string;
  ticker: string;
  eventTypes: string[];
}

export function EventBusDashboard() {
  const [stats, setStats] = useState<EventStats | null>(null);
  const [registeredTickers, setRegisteredTickers] = useState<string[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [eventTypes, setEventTypes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form states
  const [newTicker, setNewTicker] = useState('');
  const [selectedTicker, setSelectedTicker] = useState('');
  const [batchSize, setBatchSize] = useState('10');
  const [timeoutMs, setTimeoutMs] = useState('100');

  useEffect(() => {
    loadData();
    
    // Set up polling for real-time updates
    const interval = setInterval(loadData, 5000); // Every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      // Load statistics
      const statsResponse = await fetch('/api/paper/events?action=stats');
      const statsData = await statsResponse.json();
      if (statsData.success) {
        setStats(statsData.stats);
      }

      // Load registered tickers
      const tickersResponse = await fetch('/api/paper/events?action=registered_tickers');
      const tickersData = await tickersResponse.json();
      if (tickersData.success) {
        setRegisteredTickers(tickersData.tickers);
      }

      // Load subscriptions
      const subsResponse = await fetch('/api/paper/events?action=subscriptions');
      const subsData = await subsResponse.json();
      if (subsData.success) {
        setSubscriptions(subsData.subscriptions);
      }

      // Load event types
      const typesResponse = await fetch('/api/paper/events?action=event_types');
      const typesData = await typesResponse.json();
      if (typesData.success) {
        setEventTypes(typesData.eventTypes);
      }

    } catch (error) {
      console.error('Failed to load event data:', error);
      toast.error('Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (action: string, params: any = {}) => {
    setActionLoading(action);
    
    try {
      const response = await fetch('/api/paper/events', {
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

  const registerTicker = async () => {
    if (!newTicker.trim()) {
      toast.error('Please enter a ticker symbol');
      return;
    }

    await executeAction('register_ticker', {
      ticker: newTicker.toUpperCase(),
      eventTypes: ['trade:signal', 'position:update', 'confidence:update']
    });

    setNewTicker('');
  };

  const unregisterTicker = async (ticker: string) => {
    await executeAction('unregister_ticker', { ticker });
  };

  const getActivityColor = (isActive: boolean) => {
    return isActive ? 'text-green-600' : 'text-gray-400';
  };

  const getActivityIcon = (isActive: boolean) => {
    return isActive ? <Activity className="h-4 w-4" /> : <Clock className="h-4 w-4" />;
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
          <Network className="h-5 w-5" />
          Multi-Ticker EventBus
          <Badge variant="outline">Real-time</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tickers">Tickers</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="controls">Controls</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Performance Metrics */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-blue-600">Total Events</div>
                  <div className="text-2xl font-bold text-blue-900">{stats.totalEvents.toLocaleString()}</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-green-600">Avg Latency</div>
                  <div className="text-2xl font-bold text-green-900">{stats.averageLatency.toFixed(2)}ms</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="text-sm text-purple-600">Peak Throughput</div>
                  <div className="text-2xl font-bold text-purple-900">{stats.peakThroughput.toFixed(0)}/s</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="text-sm text-orange-600">Registered Tickers</div>
                  <div className="text-2xl font-bold text-orange-900">{registeredTickers.length}</div>
                </div>
              </div>
            )}

            {/* Event Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Event Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Object.entries(eventTypes)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 10)
                    .map(([eventType, count]) => (
                    <div key={eventType} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium">{eventType}</span>
                      <Badge variant="secondary">{count.toLocaleString()}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Active Subscriptions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Subscriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{subscriptions.length}</div>
                  <div className="text-sm text-gray-600">Active subscriptions</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickers" className="space-y-4">
            {/* Add New Ticker */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Register New Ticker</CardTitle>
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
                    onClick={registerTicker}
                    disabled={!newTicker || actionLoading === 'register_ticker'}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Register
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Registered Tickers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Registered Tickers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {registeredTickers.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      No tickers registered
                    </div>
                  ) : (
                    registeredTickers.map((ticker) => (
                      <div key={ticker} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{ticker}</span>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            {getActivityIcon(true)}
                            <span>Events: {stats?.eventsPerTicker[ticker] || 0}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unregisterTicker(ticker)}
                          disabled={actionLoading === 'unregister_ticker'}
                        >
                          Remove
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            {/* Event Statistics */}
            {stats && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Events Per Ticker</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {Object.entries(stats.eventsPerTicker)
                      .sort(([,a], [,b]) => b - a)
                      .map(([ticker, count]) => (
                      <div key={ticker} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="font-medium">{ticker}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{count.toLocaleString()}</Badge>
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Test Events */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Test Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => executeAction('emit_test_events', {
                    tickers: registeredTickers.slice(0, 3)
                  })}
                  disabled={actionLoading === 'emit_test_events' || registeredTickers.length === 0}
                  className="w-full"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Emit Test Events
                </Button>
                
                <Button
                  onClick={() => executeAction('reset_stats')}
                  disabled={actionLoading === 'reset_stats'}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Statistics
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="controls" className="space-y-4">
            {/* Batch Processing */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Batch Processing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Batch Size</Label>
                    <Input
                      type="number"
                      value={batchSize}
                      onChange={(e) => setBatchSize(e.target.value)}
                      min="1"
                      max="100"
                    />
                  </div>
                  <div>
                    <Label>Timeout (ms)</Label>
                    <Input
                      type="number"
                      value={timeoutMs}
                      onChange={(e) => setTimeoutMs(e.target.value)}
                      min="10"
                      max="10000"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => executeAction('enable_batching', {
                      batchSize: parseInt(batchSize),
                      timeoutMs: parseInt(timeoutMs)
                    })}
                    disabled={actionLoading === 'enable_batching'}
                    className="flex-1"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Enable Batching
                  </Button>
                  
                  <Button
                    onClick={() => executeAction('disable_batching')}
                    disabled={actionLoading === 'disable_batching'}
                    variant="outline"
                    className="flex-1"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Disable Batching
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Event Aggregation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Event Aggregation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => executeAction('setup_confidence_aggregation')}
                  disabled={actionLoading === 'setup_confidence_aggregation'}
                  className="w-full"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Setup Confidence Aggregation
                </Button>
                
                <Button
                  onClick={() => executeAction('setup_position_aggregation')}
                  disabled={actionLoading === 'setup_position_aggregation'}
                  variant="outline"
                  className="w-full"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Setup Position Aggregation
                </Button>
                
                <Button
                  onClick={() => executeAction('setup_event_routing')}
                  disabled={actionLoading === 'setup_event_routing'}
                  variant="outline"
                  className="w-full"
                >
                  <Network className="h-4 w-4 mr-2" />
                  Setup Event Routing
                </Button>
              </CardContent>
            </Card>

            {/* Performance Monitoring */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Monitoring</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => executeAction('enable_performance_monitoring')}
                  disabled={actionLoading === 'enable_performance_monitoring'}
                  className="w-full"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Enable Performance Monitoring
                </Button>
              </CardContent>
            </Card>

            {/* System Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Actions</CardTitle>
              </CardHeader>
              <CardContent>
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