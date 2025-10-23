'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Bell, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Download,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Check,
  X
} from 'lucide-react';

interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: string;
  userId?: string;
  accountId?: string;
  resource: string;
  action: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  errorMessage?: string;
  correlationId?: string;
  tags?: string[];
}

interface AlertData {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
  acknowledgedBy?: string;
  resolvedBy?: string;
}

interface AuditData {
  events: AuditEvent[];
  statistics: {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByOutcome: Record<string, number>;
    eventsByResource: Record<string, number>;
    recentActivity: AuditEvent[];
  };
}

interface AlertsOverview {
  activeAlerts: AlertData[];
  recentAlerts: AlertData[];
  statistics: {
    totalAlerts: number;
    activeAlerts: number;
    alertsBySeverity: Record<string, number>;
    alertsByType: Record<string, number>;
    acknowledgedAlerts: number;
    resolvedAlerts: number;
  };
}

export function LoggingAlertingDashboard() {
  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [alertsData, setAlertsData] = useState<AlertsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('audit');
  const [auditFilter, setAuditFilter] = useState({
    eventType: '',
    outcome: '',
    resource: '',
    limit: 100
  });

  const fetchAuditData = async () => {
    try {
      const params = new URLSearchParams();
      if (auditFilter.eventType) params.append('eventTypes', auditFilter.eventType);
      if (auditFilter.outcome) params.append('outcome', auditFilter.outcome);
      if (auditFilter.resource) params.append('resource', auditFilter.resource);
      params.append('limit', auditFilter.limit.toString());

      const response = await fetch(`/api/logging/audit?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.status === 'success') {
        setAuditData(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch audit data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Audit data fetch error:', err);
    }
  };

  const fetchAlertsData = async () => {
    try {
      const response = await fetch('/api/alerts');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.status === 'success') {
        setAlertsData(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch alerts data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Alerts data fetch error:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchAuditData(), fetchAlertsData()]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'acknowledge', 
          alertId, 
          userId: 'current-user' // In real app, get from auth
        })
      });

      if (response.ok) {
        fetchAlertsData();
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'resolve', 
          alertId, 
          userId: 'current-user' // In real app, get from auth
        })
      });

      if (response.ok) {
        fetchAlertsData();
      }
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  const exportAuditData = async (format: 'JSON' | 'CSV') => {
    try {
      const params = new URLSearchParams();
      params.append('format', 'export');
      params.append('exportFormat', format);
      if (auditFilter.eventType) params.append('eventTypes', auditFilter.eventType);
      if (auditFilter.outcome) params.append('outcome', auditFilter.outcome);
      if (auditFilter.resource) params.append('resource', auditFilter.resource);

      const response = await fetch(`/api/logging/audit?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-events-${new Date().toISOString().split('T')[0]}.${format.toLowerCase()}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'SUCCESS': return 'bg-green-100 text-green-800';
      case 'FAILURE': return 'bg-red-100 text-red-800';
      case 'PARTIAL': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading logging and alerting data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load logging and alerting data: {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchData}
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-bold">Logging & Alerting</h1>
          <FileText className="h-6 w-6 text-blue-500" />
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
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
            <CardTitle className="text-sm font-medium">Total Audit Events</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditData?.statistics.totalEvents || 0}</div>
            <p className="text-xs text-muted-foreground">
              All recorded events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alertsData?.statistics.activeAlerts || 0}</div>
            <p className="text-xs text-muted-foreground">
              Unresolved alerts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {auditData?.statistics.eventsByOutcome.SUCCESS && auditData?.statistics.totalEvents
                ? ((auditData.statistics.eventsByOutcome.SUCCESS / auditData.statistics.totalEvents) * 100).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Successful operations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alertsData?.statistics.alertsBySeverity.CRITICAL || 0}</div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="space-y-4">
          {/* Audit Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Audit Log Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Event Type</label>
                  <select
                    value={auditFilter.eventType}
                    onChange={(e) => setAuditFilter({...auditFilter, eventType: e.target.value})}
                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="">All Types</option>
                    <option value="TRADE_EXECUTED">Trade Executed</option>
                    <option value="POSITION_OPENED">Position Opened</option>
                    <option value="POSITION_CLOSED">Position Closed</option>
                    <option value="ALERT_TRIGGERED">Alert Triggered</option>
                    <option value="ERROR_OCCURRED">Error Occurred</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Outcome</label>
                  <select
                    value={auditFilter.outcome}
                    onChange={(e) => setAuditFilter({...auditFilter, outcome: e.target.value})}
                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="">All Outcomes</option>
                    <option value="SUCCESS">Success</option>
                    <option value="FAILURE">Failure</option>
                    <option value="PARTIAL">Partial</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Resource</label>
                  <select
                    value={auditFilter.resource}
                    onChange={(e) => setAuditFilter({...auditFilter, resource: e.target.value})}
                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="">All Resources</option>
                    <option value="trade">Trade</option>
                    <option value="position">Position</option>
                    <option value="account">Account</option>
                    <option value="alert">Alert</option>
                  </select>
                </div>
                <div className="flex items-end space-x-2">
                  <Button onClick={fetchAuditData} size="sm">
                    <Search className="h-4 w-4 mr-1" />
                    Filter
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportAuditData('JSON')}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    JSON
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportAuditData('CSV')}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Events */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Audit Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {auditData?.events.map((event) => (
                  <div key={event.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{event.eventType}</Badge>
                        <Badge className={getOutcomeColor(event.outcome)}>
                          {event.outcome}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-sm">
                      <p><strong>Resource:</strong> {event.resource}</p>
                      <p><strong>Action:</strong> {event.action}</p>
                      {event.accountId && <p><strong>Account:</strong> {event.accountId}</p>}
                      {event.correlationId && <p><strong>Correlation ID:</strong> {event.correlationId}</p>}
                      {event.errorMessage && (
                        <p className="text-red-600"><strong>Error:</strong> {event.errorMessage}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {/* Active Alerts */}
          {alertsData?.activeAlerts && alertsData.activeAlerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Active Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alertsData.activeAlerts.map((alert) => (
                    <div key={alert.id} className="p-4 border rounded-lg border-red-200 bg-red-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          <Badge variant="outline">{alert.type}</Badge>
                          <span className="text-sm text-gray-500">
                            {new Date(alert.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          {!alert.acknowledged && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => acknowledgeAlert(alert.id)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Acknowledge
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resolveAlert(alert.id)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Resolve
                          </Button>
                        </div>
                      </div>
                      <h4 className="font-medium">{alert.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                      {alert.acknowledged && (
                        <p className="text-xs text-green-600 mt-2">
                          Acknowledged by {alert.acknowledgedBy}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {alertsData?.recentAlerts.map((alert) => (
                  <div key={alert.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <Badge variant="outline">{alert.type}</Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(alert.timestamp).toLocaleString()}
                        </span>
                        {alert.resolved && (
                          <Badge className="bg-green-100 text-green-800">RESOLVED</Badge>
                        )}
                      </div>
                    </div>
                    <h4 className="font-medium">{alert.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                    {alert.resolvedBy && (
                      <p className="text-xs text-green-600 mt-2">
                        Resolved by {alert.resolvedBy}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Audit Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Audit Events by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {auditData && Object.entries(auditData.statistics.eventsByType).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="text-sm">{type.replace(/_/g, ' ')}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Alert Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Alerts by Severity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {alertsData && Object.entries(alertsData.statistics.alertsBySeverity).map(([severity, count]) => (
                    <div key={severity} className="flex justify-between items-center">
                      <span className="text-sm">{severity}</span>
                      <Badge className={getSeverityColor(severity)}>{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}