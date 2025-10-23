'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  BellOff, 
  Check, 
  X, 
  AlertTriangle, 
  Info, 
  AlertCircle, 
  Zap,
  Settings,
  Webhook,
  TestTube,
  Plus,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface Alert {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  data: any;
}

interface AlertRule {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  conditions: any[];
  actions: any[];
  cooldownPeriod: number;
}

interface WebhookConfig {
  id: string;
  status: string;
  lastUsed: string | null;
}

export function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [statistics, setStatistics] = useState<any>({});
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [acknowledgedFilter, setAcknowledgedFilter] = useState<string>('');

  // New rule form
  const [newRule, setNewRule] = useState({
    name: '',
    type: 'TRADE_EXECUTED',
    enabled: true,
    cooldownPeriod: 0
  });

  // New webhook form
  const [newWebhook, setNewWebhook] = useState({
    id: '',
    url: '',
    method: 'POST'
  });

  useEffect(() => {
    loadAlerts();
    loadAlertRules();
    loadWebhooks();
    
    // Set up polling for real-time updates
    const interval = setInterval(loadAlerts, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [typeFilter, severityFilter, acknowledgedFilter]);

  const loadAlerts = async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.append('type', typeFilter);
      if (severityFilter) params.append('severity', severityFilter);
      if (acknowledgedFilter) params.append('acknowledged', acknowledgedFilter);
      params.append('limit', '50');

      const response = await fetch(`/api/paper/alerts?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setAlerts(data.alerts);
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const loadAlertRules = async () => {
    try {
      const response = await fetch('/api/paper/alerts/rules');
      const data = await response.json();
      
      if (data.success) {
        setAlertRules(data.rules);
      }
    } catch (error) {
      console.error('Failed to load alert rules:', error);
    }
  };

  const loadWebhooks = async () => {
    try {
      const response = await fetch('/api/paper/webhooks');
      const data = await response.json();
      
      if (data.success) {
        setWebhooks(data.webhooks);
      }
    } catch (error) {
      console.error('Failed to load webhooks:', error);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/paper/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'acknowledge',
          alertId
        })
      });

      if (response.ok) {
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        ));
        toast.success('Alert acknowledged');
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      toast.error('Failed to acknowledge alert');
    }
  };

  const createAlertRule = async () => {
    try {
      const response = await fetch('/api/paper/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          ruleData: {
            ...newRule,
            actions: [
              { type: 'WEBHOOK', config: { webhookId: 'default' }, enabled: true },
              { type: 'STORE', config: {}, enabled: true }
            ],
            conditions: []
          }
        })
      });

      if (response.ok) {
        await loadAlertRules();
        setNewRule({ name: '', type: 'TRADE_EXECUTED', enabled: true, cooldownPeriod: 0 });
        toast.success('Alert rule created');
      }
    } catch (error) {
      console.error('Failed to create alert rule:', error);
      toast.error('Failed to create alert rule');
    }
  };

  const toggleAlertRule = async (ruleId: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/paper/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          ruleId,
          ruleData: { enabled }
        })
      });

      if (response.ok) {
        setAlertRules(prev => prev.map(rule => 
          rule.id === ruleId ? { ...rule, enabled } : rule
        ));
        toast.success(`Alert rule ${enabled ? 'enabled' : 'disabled'}`);
      }
    } catch (error) {
      console.error('Failed to toggle alert rule:', error);
      toast.error('Failed to update alert rule');
    }
  };

  const deleteAlertRule = async (ruleId: string) => {
    try {
      const response = await fetch('/api/paper/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          ruleId
        })
      });

      if (response.ok) {
        setAlertRules(prev => prev.filter(rule => rule.id !== ruleId));
        toast.success('Alert rule deleted');
      }
    } catch (error) {
      console.error('Failed to delete alert rule:', error);
      toast.error('Failed to delete alert rule');
    }
  };

  const addWebhook = async () => {
    try {
      const response = await fetch('/api/paper/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          webhookId: newWebhook.id,
          webhookConfig: {
            url: newWebhook.url,
            method: newWebhook.method,
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000,
            retryAttempts: 3,
            retryDelay: 1000
          }
        })
      });

      if (response.ok) {
        await loadWebhooks();
        setNewWebhook({ id: '', url: '', method: 'POST' });
        toast.success('Webhook added');
      }
    } catch (error) {
      console.error('Failed to add webhook:', error);
      toast.error('Failed to add webhook');
    }
  };

  const testWebhook = async (webhookId: string) => {
    try {
      const response = await fetch('/api/paper/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          webhookId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Webhook test sent successfully');
      } else {
        toast.error(`Webhook test failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to test webhook:', error);
      toast.error('Failed to test webhook');
    }
  };

  const removeWebhook = async (webhookId: string) => {
    try {
      const response = await fetch('/api/paper/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          webhookId
        })
      });

      if (response.ok) {
        setWebhooks(prev => prev.filter(webhook => webhook.id !== webhookId));
        toast.success('Webhook removed');
      }
    } catch (error) {
      console.error('Failed to remove webhook:', error);
      toast.error('Failed to remove webhook');
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'LOW': return <Info className="h-4 w-4 text-blue-500" />;
      case 'MEDIUM': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'HIGH': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'CRITICAL': return <Zap className="h-4 w-4 text-red-500" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'bg-blue-100 text-blue-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
          <Bell className="h-5 w-5" />
          Alerts & Notifications
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="alerts" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="space-y-4">
            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-blue-600">Total Alerts</div>
                <div className="text-2xl font-bold text-blue-900">{statistics.totalAlerts || 0}</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm text-green-600">Acknowledged</div>
                <div className="text-2xl font-bold text-green-900">{statistics.acknowledgedAlerts || 0}</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-sm text-orange-600">Webhooks Sent</div>
                <div className="text-2xl font-bold text-orange-900">{statistics.webhooksSent || 0}</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-sm text-purple-600">Active Rules</div>
                <div className="text-2xl font-bold text-purple-900">{statistics.activeRules || 0}</div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="TRADE_EXECUTED">Trade Executed</SelectItem>
                  <SelectItem value="TRADE_CLOSED">Trade Closed</SelectItem>
                  <SelectItem value="RISK_VIOLATION">Risk Violation</SelectItem>
                  <SelectItem value="PERFORMANCE_MILESTONE">Performance Milestone</SelectItem>
                  <SelectItem value="SYSTEM_ERROR">System Error</SelectItem>
                </SelectContent>
              </Select>

              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Severities</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>

              <Select value={acknowledgedFilter} onValueChange={setAcknowledgedFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Alerts</SelectItem>
                  <SelectItem value="false">Unacknowledged</SelectItem>
                  <SelectItem value="true">Acknowledged</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={loadAlerts} variant="outline" size="sm">
                Refresh
              </Button>
            </div>

            {/* Alerts List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No alerts found
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 border rounded-lg ${
                      alert.acknowledged ? 'bg-gray-50 opacity-75' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getSeverityIcon(alert.severity)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{alert.title}</h4>
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity}
                            </Badge>
                            <Badge variant="outline">{alert.type}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
                          <div className="text-xs text-gray-500">
                            {new Date(alert.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {alert.acknowledged ? (
                          <Badge variant="secondary" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Acknowledged
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="rules" className="space-y-4">
            {/* Create New Rule */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Create Alert Rule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Rule Name</Label>
                    <Input
                      value={newRule.name}
                      onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter rule name"
                    />
                  </div>
                  <div>
                    <Label>Alert Type</Label>
                    <Select
                      value={newRule.type}
                      onValueChange={(value) => setNewRule(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TRADE_EXECUTED">Trade Executed</SelectItem>
                        <SelectItem value="TRADE_CLOSED">Trade Closed</SelectItem>
                        <SelectItem value="RISK_VIOLATION">Risk Violation</SelectItem>
                        <SelectItem value="PERFORMANCE_MILESTONE">Performance Milestone</SelectItem>
                        <SelectItem value="POSITION_ALERT">Position Alert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Cooldown Period (minutes)</Label>
                  <Input
                    type="number"
                    value={newRule.cooldownPeriod / 60000}
                    onChange={(e) => setNewRule(prev => ({ 
                      ...prev, 
                      cooldownPeriod: parseInt(e.target.value) * 60000 
                    }))}
                    placeholder="0"
                  />
                </div>
                <Button onClick={createAlertRule} disabled={!newRule.name}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Rule
                </Button>
              </CardContent>
            </Card>

            {/* Existing Rules */}
            <div className="space-y-3">
              {alertRules.map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={rule.enabled}
                          onCheckedChange={(checked) => toggleAlertRule(rule.id, !!checked)}
                        />
                        <div>
                          <h4 className="font-medium">{rule.name}</h4>
                          <div className="text-sm text-gray-500">
                            Type: {rule.type} • Cooldown: {rule.cooldownPeriod / 60000}min
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteAlertRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-4">
            {/* Add New Webhook */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Webhook</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Webhook ID</Label>
                    <Input
                      value={newWebhook.id}
                      onChange={(e) => setNewWebhook(prev => ({ ...prev, id: e.target.value }))}
                      placeholder="e.g., discord, slack"
                    />
                  </div>
                  <div>
                    <Label>Method</Label>
                    <Select
                      value={newWebhook.method}
                      onValueChange={(value) => setNewWebhook(prev => ({ ...prev, method: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={addWebhook} 
                      disabled={!newWebhook.id || !newWebhook.url}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Webhook URL</Label>
                  <Input
                    value={newWebhook.url}
                    onChange={(e) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://hooks.slack.com/services/..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Existing Webhooks */}
            <div className="space-y-3">
              {webhooks.map((webhook) => (
                <Card key={webhook.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Webhook className="h-5 w-5 text-blue-500" />
                        <div>
                          <h4 className="font-medium">{webhook.id}</h4>
                          <div className="text-sm text-gray-500">
                            Status: {webhook.status}
                            {webhook.lastUsed && ` • Last used: ${new Date(webhook.lastUsed).toLocaleString()}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => testWebhook(webhook.id)}
                        >
                          <TestTube className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeWebhook(webhook.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}