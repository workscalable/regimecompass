'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Shield, 
  RefreshCw,
  XCircle,
  CheckCircle,
  Clock,
  TrendingDown,
  Activity,
  Zap,
  Settings
} from 'lucide-react';

interface ErrorMetrics {
  totalErrors: number;
  errorsByCategory: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  recoveryAttempts: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  recentErrors: any[];
}

interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: Date | null;
  nextAttemptTime: Date | null;
  threshold: number;
  timeout: number;
}

interface SystemHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  degradedServices: number;
  criticalServices: number;
  affectedFeatures: string[];
}

interface ErrorData {
  errorMetrics: ErrorMetrics;
  circuitBreakers: Record<string, CircuitBreakerState>;
  systemHealth: SystemHealth;
  degradation: {
    activeDegradations: any[];
    serviceStatuses: any[];
  };
  summary: {
    totalErrors: number;
    criticalErrors: number;
    highSeverityErrors: number;
    recoverySuccessRate: number;
    openCircuitBreakers: number;
    degradedServices: number;
    systemStatus: string;
  };
  timestamp: string;
}

export function ErrorHandlingDashboard() {
  const [errorData, setErrorData] = useState<ErrorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchErrorData = async () => {
    try {
      const response = await fetch('/api/health/errors?details=true');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.status === 'success') {
        setErrorData(result.data);
        setError(null);
      } else {
        throw new Error(result.message || 'Failed to fetch error data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetMetrics = async () => {
    try {
      const response = await fetch('/api/health/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resetMetrics' })
      });

      if (response.ok) {
        fetchErrorData();
      }
    } catch (err) {
      console.error('Reset metrics failed:', err);
    }
  };

  const forceRecovery = async (service: string) => {
    try {
      const response = await fetch('/api/health/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'forceRecovery', service })
      });

      if (response.ok) {
        fetchErrorData();
      }
    } catch (err) {
      console.error('Force recovery failed:', err);
    }
  };

  const testCircuitBreaker = async (service: string) => {
    try {
      const response = await fetch('/api/health/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'testCircuitBreaker', service })
      });

      if (response.ok) {
        setTimeout(fetchErrorData, 1000); // Delay to see circuit breaker effect
      }
    } catch (err) {
      console.error('Circuit breaker test failed:', err);
    }
  };

  useEffect(() => {
    fetchErrorData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchErrorData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'DEGRADED':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'CRITICAL':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading error handling data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load error handling data: {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchErrorData}
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!errorData) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>No error handling data available</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-bold">Error Handling & Recovery</h1>
          <Shield className="h-6 w-6 text-blue-500" />
          {getStatusIcon(errorData.systemHealth.status)}
          <Badge className={getSeverityColor(errorData.systemHealth.status)}>
            {errorData.systemHealth.status}
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
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
            onClick={resetMetrics}
            className="text-red-600 hover:text-red-700"
          >
            Reset Metrics
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchErrorData}
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
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorData.summary.totalErrors}</div>
            <p className="text-xs text-muted-foreground">
              {errorData.summary.criticalErrors} critical, {errorData.summary.highSeverityErrors} high
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recovery Rate</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorData.summary.recoverySuccessRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {errorData.errorMetrics.successfulRecoveries} / {errorData.errorMetrics.recoveryAttempts} attempts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Circuit Breakers</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorData.summary.openCircuitBreakers}</div>
            <p className="text-xs text-muted-foreground">
              Open / {Object.keys(errorData.circuitBreakers).length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Degraded Services</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorData.summary.degradedServices}</div>
            <p className="text-xs text-muted-foreground">
              Services in degraded state
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="errors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="errors">Error Metrics</TabsTrigger>
          <TabsTrigger value="circuit-breakers">Circuit Breakers</TabsTrigger>
          <TabsTrigger value="degradation">Service Degradation</TabsTrigger>
          <TabsTrigger value="recovery">Recovery Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="errors" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Errors by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(errorData.errorMetrics.errorsByCategory).map(([category, count]) => (
                    <div key={category} className="flex justify-between items-center">
                      <span className="text-sm capitalize">{category.replace(/_/g, ' ').toLowerCase()}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Errors by Severity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(errorData.errorMetrics.errorsBySeverity).map(([severity, count]) => (
                    <div key={severity} className="flex justify-between items-center">
                      <span className="text-sm">{severity}</span>
                      <Badge className={getSeverityColor(severity)}>{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {errorData.errorMetrics.recentErrors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {errorData.errorMetrics.recentErrors.slice(0, 10).map((error, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={getSeverityColor(error.severity)}>
                          {error.severity}
                        </Badge>
                        <Badge variant="outline">{error.category}</Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(error.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{error.message}</p>
                      <p className="text-xs text-gray-600 mt-1">Code: {error.code}</p>
                      {error.context?.ticker && (
                        <p className="text-xs text-gray-600">Ticker: {error.context.ticker}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="circuit-breakers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(errorData.circuitBreakers).map(([service, breaker]) => (
              <Card key={service}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="capitalize">{service.replace(/-/g, ' ')}</span>
                    {breaker.isOpen ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <Badge className={breaker.isOpen ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                        {breaker.isOpen ? 'OPEN' : 'CLOSED'}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Failures:</span>
                      <span className="ml-2 font-medium">{breaker.failureCount} / {breaker.threshold}</span>
                    </div>
                    {breaker.lastFailureTime && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Last Failure:</span>
                        <span className="ml-2 text-xs">
                          {new Date(breaker.lastFailureTime).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {breaker.nextAttemptTime && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Next Attempt:</span>
                        <span className="ml-2 text-xs">
                          {new Date(breaker.nextAttemptTime).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testCircuitBreaker(service)}
                      disabled={breaker.isOpen}
                    >
                      Test
                    </Button>
                    {breaker.isOpen && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => forceRecovery(service)}
                      >
                        Force Reset
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="degradation" className="space-y-4">
          {errorData.degradation.activeDegradations.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Active Degradations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {errorData.degradation.activeDegradations.map((degradation, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium capitalize">{degradation.service.replace(/-/g, ' ')}</h4>
                        <Badge className={getSeverityColor(degradation.strategy.level)}>
                          {degradation.strategy.level}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{degradation.strategy.description}</p>
                      <div className="text-xs text-gray-500">
                        <p>Duration: {Math.round(degradation.duration / 1000 / 60)} minutes</p>
                        <p>Affected Features: {degradation.strategy.affectedFeatures.join(', ')}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => forceRecovery(degradation.service)}
                        className="mt-2"
                      >
                        Force Recovery
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium">No Active Degradations</p>
                <p className="text-gray-600">All services are operating normally</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Service Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {errorData.degradation.serviceStatuses.map((status, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium capitalize">{status.service.replace(/-/g, ' ')}</h4>
                      {getStatusIcon(status.status)}
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <Badge className={getSeverityColor(status.status)}>{status.status}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Level:</span>
                        <span>{status.degradationLevel}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Last Update: {new Date(status.lastUpdate).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recovery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recovery Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {errorData.errorMetrics.successfulRecoveries}
                  </div>
                  <p className="text-sm text-gray-600">Successful Recoveries</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {errorData.errorMetrics.failedRecoveries}
                  </div>
                  <p className="text-sm text-gray-600">Failed Recoveries</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {errorData.summary.recoverySuccessRate.toFixed(1)}%
                  </div>
                  <p className="text-sm text-gray-600">Success Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Health Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Force Recovery All Services</h4>
                    <p className="text-sm text-gray-600">Attempt to recover all degraded services</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      errorData.degradation.activeDegradations.forEach(d => 
                        forceRecovery(d.service)
                      );
                    }}
                    disabled={errorData.degradation.activeDegradations.length === 0}
                  >
                    Recover All
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Reset Error Metrics</h4>
                    <p className="text-sm text-gray-600">Clear all error statistics and start fresh</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={resetMetrics}
                    className="text-red-600 hover:text-red-700"
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {new Date(errorData.timestamp).toLocaleString()}
      </div>
    </div>
  );
}