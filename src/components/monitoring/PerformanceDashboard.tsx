'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  Database,
  RefreshCw,
  Settings,
  Download
} from 'lucide-react';

interface OperationStats {
  count: number;
  successRate: number;
  averageDuration: number;
  p95Duration: number;
  p99Duration: number;
  errorRate: number;
  recentErrors: string[];
}

interface PerformanceData {
  timeRange: string;
  summary: {
    totalOperations: number;
    operationTypes: string[];
    overallSuccessRate: number;
    averageResponseTime: number;
    slowestOperations: any[];
    errorSummary: Record<string, number>;
  };
  activeOperations: {
    count: number;
    operations: any[];
  };
  thresholds: {
    tradeExecution: number;
    positionUpdate: number;
    optionsChainFetch: number;
    pnlCalculation: number;
    riskCheck: number;
  };
  timestamp: string;
}

export function PerformanceDashboard() {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [operationStats, setOperationStats] = useState<Record<string, OperationStats>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(30);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchPerformanceData = async () => {
    try {
      const response = await fetch(`/api/health/performance?minutes=${selectedTimeRange}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.status === 'success') {
        setPerformanceData(result.data);
        
        // Fetch individual operation stats
        const operationTypes = result.data.summary.operationTypes;
        const statsPromises = operationTypes.map(async (type: string) => {
          const statsResponse = await fetch(`/api/health/performance?operation=${type}&minutes=${selectedTimeRange}`);
          if (statsResponse.ok) {
            const statsResult = await statsResponse.json();
            return { type, stats: statsResult.data.stats };
          }
          return null;
        });
        
        const statsResults = await Promise.all(statsPromises);
        const newOperationStats: Record<string, OperationStats> = {};
        
        statsResults.forEach(result => {
          if (result) {
            newOperationStats[result.type] = result.stats;
          }
        });
        
        setOperationStats(newOperationStats);
        setError(null);
      } else {
        throw new Error(result.message || 'Failed to fetch performance data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Performance data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportPerformanceData = async () => {
    try {
      const response = await fetch(`/api/health/performance?format=export&minutes=${selectedTimeRange}`);
      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const clearPerformanceHistory = async () => {
    try {
      const response = await fetch('/api/health/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clearHistory' })
      });

      if (response.ok) {
        fetchPerformanceData();
      }
    } catch (err) {
      console.error('Clear history failed:', err);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
  }, [selectedTimeRange]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchPerformanceData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedTimeRange]);

  const getPerformanceColor = (value: number, threshold: number, isErrorRate: boolean = false) => {
    if (isErrorRate) {
      if (value > 0.1) return 'text-red-600';
      if (value > 0.05) return 'text-yellow-600';
      return 'text-green-600';
    } else {
      if (value > threshold * 2) return 'text-red-600';
      if (value > threshold) return 'text-yellow-600';
      return 'text-green-600';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading performance data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load performance data: {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchPerformanceData}
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!performanceData) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>No performance data available</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-bold">Performance Monitor</h1>
          <Activity className="h-6 w-6 text-blue-500" />
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(parseInt(e.target.value))}
            className="px-3 py-1 border rounded-md text-sm"
          >
            <option value={15}>Last 15 minutes</option>
            <option value={30}>Last 30 minutes</option>
            <option value={60}>Last hour</option>
            <option value={240}>Last 4 hours</option>
            <option value={1440}>Last 24 hours</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Disable' : 'Enable'} Auto-refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportPerformanceData}
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPerformanceData}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Operations</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData.summary.totalOperations}</div>
            <p className="text-xs text-muted-foreground">
              {performanceData.timeRange}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(1 - performanceData.summary.overallSuccessRate, 0.1, true)}`}>
              {formatPercentage(performanceData.summary.overallSuccessRate)}
            </div>
            <p className="text-xs text-muted-foreground">
              Overall success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(performanceData.summary.averageResponseTime, 500)}`}>
              {formatDuration(performanceData.summary.averageResponseTime)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all operations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Operations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData.activeOperations.count}</div>
            <p className="text-xs text-muted-foreground">
              Currently running
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Performance Tabs */}
      <Tabs defaultValue="operations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
          <TabsTrigger value="slowest">Slowest Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Object.entries(operationStats).map(([operationType, stats]) => (
              <Card key={operationType}>
                <CardHeader>
                  <CardTitle className="text-lg capitalize">
                    {operationType.replace(/[-_]/g, ' ')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Count:</span>
                      <span className="ml-2 font-medium">{stats.count}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Success Rate:</span>
                      <span className={`ml-2 font-medium ${getPerformanceColor(1 - stats.successRate, 0.1, true)}`}>
                        {formatPercentage(stats.successRate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Avg Duration:</span>
                      <span className={`ml-2 font-medium ${getPerformanceColor(stats.averageDuration, performanceData.thresholds[operationType as keyof typeof performanceData.thresholds] || 1000)}`}>
                        {formatDuration(stats.averageDuration)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">P95 Duration:</span>
                      <span className="ml-2 font-medium">{formatDuration(stats.p95Duration)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Error Rate:</span>
                      <span className={`ml-2 font-medium ${getPerformanceColor(stats.errorRate, 0.05, true)}`}>
                        {formatPercentage(stats.errorRate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">P99 Duration:</span>
                      <span className="ml-2 font-medium">{formatDuration(stats.p99Duration)}</span>
                    </div>
                  </div>
                  
                  {stats.recentErrors.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-red-600 mb-2">Recent Errors:</h4>
                      <div className="space-y-1">
                        {stats.recentErrors.slice(0, 3).map((error, index) => (
                          <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(performanceData.summary.errorSummary).length === 0 ? (
                <p className="text-green-600">No errors in the selected time range</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(performanceData.summary.errorSummary).map(([error, count]) => (
                    <div key={error} className="flex justify-between items-center p-2 border rounded">
                      <span className="text-sm">{error}</span>
                      <Badge variant="destructive">{count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="thresholds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Thresholds</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(performanceData.thresholds).map(([operation, threshold]) => (
                  <div key={operation} className="flex justify-between items-center p-3 border rounded">
                    <span className="capitalize">{operation.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <Badge variant="outline">{formatDuration(threshold)}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="slowest" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Slowest Operations</CardTitle>
            </CardHeader>
            <CardContent>
              {performanceData.summary.slowestOperations.length === 0 ? (
                <p className="text-muted-foreground">No operations recorded</p>
              ) : (
                <div className="space-y-2">
                  {performanceData.summary.slowestOperations.slice(0, 10).map((operation, index) => (
                    <div key={index} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <span className="font-medium">{operation.operationType}</span>
                        {operation.metadata && (
                          <span className="text-sm text-muted-foreground ml-2">
                            {JSON.stringify(operation.metadata)}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${getPerformanceColor(operation.duration, 1000)}`}>
                          {formatDuration(operation.duration)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(operation.startTime).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          Last updated: {new Date(performanceData.timestamp).toLocaleString()}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={clearPerformanceHistory}
          className="text-red-600 hover:text-red-700"
        >
          Clear History
        </Button>
      </div>
    </div>
  );
}