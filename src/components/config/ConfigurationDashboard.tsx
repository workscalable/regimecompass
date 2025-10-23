'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw,
  Download,
  Save,
  Eye,
  EyeOff,
  Database,
  Key,
  Bell,
  FileText
} from 'lucide-react';

interface ConfigSummary {
  environment: string;
  version: string;
  featuresEnabled: string[];
  databaseConnected: boolean;
  apisConfigured: boolean;
  alertingEnabled: boolean;
  loggingLevel: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missing: string[];
  invalid: string[];
  summary: {
    total: number;
    required: number;
    provided: number;
    valid: number;
  };
}

interface ConfigSection {
  name: string;
  icon: React.ReactNode;
  description: string;
  config: any;
}

export function ConfigurationDashboard() {
  const [configSummary, setConfigSummary] = useState<ConfigSummary | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [configSections, setConfigSections] = useState<ConfigSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSensitive, setShowSensitive] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);

  const fetchConfigData = async () => {
    try {
      // Fetch configuration summary
      const summaryResponse = await fetch('/api/config?action=summary');
      if (summaryResponse.ok) {
        const summaryResult = await summaryResponse.json();
        if (summaryResult.status === 'success') {
          setConfigSummary(summaryResult.data);
        }
      }

      // Fetch validation results
      const validationResponse = await fetch('/api/config?action=validation');
      if (validationResponse.ok) {
        const validationResult = await validationResponse.json();
        if (validationResult.status === 'success') {
          setValidationResult(validationResult.data);
        }
      }

      // Fetch configuration sections
      const sections = ['database', 'trading', 'monitoring', 'logging', 'alerting'];
      const sectionPromises = sections.map(async (section) => {
        const response = await fetch(`/api/config?section=${section}`);
        if (response.ok) {
          const result = await response.json();
          if (result.status === 'success') {
            return {
              name: section,
              icon: getSectionIcon(section),
              description: getSectionDescription(section),
              config: result.data.config
            };
          }
        }
        return null;
      });

      const sectionResults = await Promise.all(sectionPromises);
      setConfigSections(sectionResults.filter(Boolean) as ConfigSection[]);

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Config data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const reloadConfig = async () => {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reload' })
      });

      if (response.ok) {
        fetchConfigData();
      }
    } catch (err) {
      console.error('Config reload failed:', err);
    }
  };

  const validateEnvironment = async () => {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate' })
      });

      if (response.ok) {
        const result = await response.json();
        setValidationResult(result.data);
      }
    } catch (err) {
      console.error('Environment validation failed:', err);
    }
  };

  const downloadDocumentation = async () => {
    try {
      const response = await fetch('/api/config?action=documentation');
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'environment-variables.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Documentation download failed:', err);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/config?action=template');
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '.env.template';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Template download failed:', err);
    }
  };

  const getSectionIcon = (section: string) => {
    switch (section) {
      case 'database': return <Database className="h-5 w-5" />;
      case 'trading': return <Settings className="h-5 w-5" />;
      case 'monitoring': return <Eye className="h-5 w-5" />;
      case 'logging': return <FileText className="h-5 w-5" />;
      case 'alerting': return <Bell className="h-5 w-5" />;
      default: return <Settings className="h-5 w-5" />;
    }
  };

  const getSectionDescription = (section: string) => {
    switch (section) {
      case 'database': return 'Database connection and performance settings';
      case 'trading': return 'Trading rules, risk management, and position sizing';
      case 'monitoring': return 'Health checks, metrics, and performance thresholds';
      case 'logging': return 'Log levels, outputs, and retention policies';
      case 'alerting': return 'Alert channels, rules, and notification settings';
      default: return 'Configuration settings';
    }
  };

  const getStatusColor = (status: boolean) => {
    return status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const maskSensitiveValue = (key: string, value: any) => {
    const sensitiveKeys = ['password', 'apiKey', 'secret', 'token', 'key', 'pass'];
    const isSensitive = sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive.toLowerCase())
    );
    
    if (isSensitive && !showSensitive && typeof value === 'string' && value.length > 0) {
      return '***';
    }
    
    return value;
  };

  const renderConfigValue = (key: string, value: any, depth: number = 0): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400">null</span>;
    }

    if (typeof value === 'boolean') {
      return (
        <Badge className={value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
          {value.toString()}
        </Badge>
      );
    }

    if (typeof value === 'number') {
      return <span className="font-mono text-blue-600">{value}</span>;
    }

    if (typeof value === 'string') {
      const maskedValue = maskSensitiveValue(key, value);
      return <span className="font-mono">{maskedValue}</span>;
    }

    if (Array.isArray(value)) {
      return (
        <div className="ml-4">
          {value.map((item, index) => (
            <div key={index} className="text-sm">
              [{index}]: {renderConfigValue(`${key}[${index}]`, item, depth + 1)}
            </div>
          ))}
        </div>
      );
    }

    if (typeof value === 'object') {
      return (
        <div className="ml-4 space-y-1">
          {Object.entries(value).map(([subKey, subValue]) => (
            <div key={subKey} className="text-sm">
              <span className="font-medium">{subKey}:</span>{' '}
              {renderConfigValue(subKey, subValue, depth + 1)}
            </div>
          ))}
        </div>
      );
    }

    return <span>{String(value)}</span>;
  };

  useEffect(() => {
    fetchConfigData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading configuration data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load configuration data: {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchConfigData}
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
          <h1 className="text-2xl font-bold">Configuration Management</h1>
          <Settings className="h-6 w-6 text-blue-500" />
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSensitive(!showSensitive)}
          >
            {showSensitive ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
            {showSensitive ? 'Hide' : 'Show'} Sensitive
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadTemplate}
          >
            <Download className="h-4 w-4 mr-1" />
            .env Template
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadDocumentation}
          >
            <Download className="h-4 w-4 mr-1" />
            Documentation
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={reloadConfig}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Reload
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {configSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Environment</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{configSummary.environment}</div>
              <p className="text-xs text-muted-foreground">
                Version {configSummary.version}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Database</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Badge className={getStatusColor(configSummary.databaseConnected)}>
                {configSummary.databaseConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">APIs</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Badge className={getStatusColor(configSummary.apisConfigured)}>
                {configSummary.apisConfigured ? 'Configured' : 'Missing Keys'}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alerting</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Badge className={getStatusColor(configSummary.alertingEnabled)}>
                {configSummary.alertingEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Validation Results */}
      {validationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Environment Validation</span>
              <Button
                variant="outline"
                size="sm"
                onClick={validateEnvironment}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Re-validate
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${validationResult.valid ? 'text-green-600' : 'text-red-600'}`}>
                  {validationResult.valid ? <CheckCircle className="h-8 w-8 mx-auto" /> : <AlertTriangle className="h-8 w-8 mx-auto" />}
                </div>
                <p className="text-sm text-gray-600">
                  {validationResult.valid ? 'Valid' : 'Invalid'}
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{validationResult.summary.provided}</div>
                <p className="text-sm text-gray-600">Provided</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{validationResult.summary.required}</div>
                <p className="text-sm text-gray-600">Required</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{validationResult.errors.length}</div>
                <p className="text-sm text-gray-600">Errors</p>
              </div>
            </div>

            {validationResult.errors.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-red-600 mb-2">Errors:</h4>
                <div className="space-y-1">
                  {validationResult.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {validationResult.warnings.length > 0 && (
              <div>
                <h4 className="font-medium text-yellow-600 mb-2">Warnings:</h4>
                <div className="space-y-1">
                  {validationResult.warnings.map((warning, index) => (
                    <div key={index} className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                      {warning}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Configuration Sections */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {configSections.map((section) => (
            <TabsTrigger key={section.name} value={section.name}>
              {section.name.charAt(0).toUpperCase() + section.name.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {configSections.map((section) => (
              <Card key={section.name}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    {section.icon}
                    <span className="ml-2 capitalize">{section.name}</span>
                  </CardTitle>
                  <p className="text-sm text-gray-600">{section.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {Object.entries(section.config).slice(0, 5).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-start text-sm">
                        <span className="font-medium">{key}:</span>
                        <div className="text-right max-w-xs truncate">
                          {renderConfigValue(key, value)}
                        </div>
                      </div>
                    ))}
                    {Object.keys(section.config).length > 5 && (
                      <p className="text-xs text-gray-500">
                        ... and {Object.keys(section.config).length - 5} more
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {configSummary && (
            <Card>
              <CardHeader>
                <CardTitle>Enabled Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {configSummary.featuresEnabled.map((feature) => (
                    <Badge key={feature} variant="outline">
                      {feature.replace(/([A-Z])/g, ' $1').trim()}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {configSections.map((section) => (
          <TabsContent key={section.name} value={section.name} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    {section.icon}
                    <span className="ml-2 capitalize">{section.name} Configuration</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingSection(editingSection === section.name ? null : section.name)}
                  >
                    {editingSection === section.name ? 'Cancel' : 'Edit'}
                  </Button>
                </CardTitle>
                <p className="text-sm text-gray-600">{section.description}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(section.config).map(([key, value]) => (
                    <div key={key} className="border-b pb-2">
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-sm">{key}:</span>
                        <div className="text-right max-w-md">
                          {renderConfigValue(key, value)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}