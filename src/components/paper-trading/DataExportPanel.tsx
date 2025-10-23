'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Download, FileText, BarChart3, DollarSign, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

interface ExportOptions {
  format: 'CSV' | 'JSON';
  exportType: 'trades' | 'performance' | 'account' | 'report';
  dateRange?: {
    start: string;
    end: string;
  };
  includeOpenPositions: boolean;
  includeAnalytics: boolean;
  filters: {
    tickers: string[];
    regimes: string[];
    confidenceRange?: { min: number; max: number };
    pnlFilter?: { type: string; threshold?: number };
    status: string[];
  };
}

export function DataExportPanel() {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'CSV',
    exportType: 'trades',
    includeOpenPositions: false,
    includeAnalytics: true,
    filters: {
      tickers: [],
      regimes: [],
      status: []
    }
  });

  const [isExporting, setIsExporting] = useState(false);
  const [customTickers, setCustomTickers] = useState('');
  const [confidenceMin, setConfidenceMin] = useState('');
  const [confidenceMax, setConfidenceMax] = useState('');

  const exportTypes = [
    { value: 'trades', label: 'Trade History', icon: FileText },
    { value: 'performance', label: 'Performance Metrics', icon: BarChart3 },
    { value: 'account', label: 'Account Summary', icon: DollarSign },
    { value: 'report', label: 'Full Report', icon: FileSpreadsheet }
  ];

  const regimeOptions = ['BULL', 'BEAR', 'NEUTRAL', 'TRANSITION'];
  const statusOptions = ['OPEN', 'CLOSED', 'EXPIRED'];

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Build query parameters for GET request
      const params = new URLSearchParams({
        format: exportOptions.format,
        type: exportOptions.exportType,
        includeOpen: exportOptions.includeOpenPositions.toString(),
        includeAnalytics: exportOptions.includeAnalytics.toString()
      });

      if (exportOptions.dateRange) {
        params.append('startDate', exportOptions.dateRange.start);
        params.append('endDate', exportOptions.dateRange.end);
      }

      const response = await fetch(`/api/paper/export?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition?.match(/filename=\"(.+)\"/)?.[1] || 
        `paper-${exportOptions.exportType}-${new Date().toISOString().split('T')[0]}.${exportOptions.format.toLowerCase()}`;

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`${exportOptions.exportType} data exported successfully`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCustomExport = async () => {
    setIsExporting(true);
    
    try {
      // Build custom export request
      const customOptions = { ...exportOptions };
      
      // Parse custom tickers
      if (customTickers.trim()) {
        customOptions.filters.tickers = customTickers
          .split(',')
          .map(t => t.trim().toUpperCase())
          .filter(t => t.length > 0);
      }

      // Parse confidence range
      if (confidenceMin || confidenceMax) {
        customOptions.filters.confidenceRange = {
          min: confidenceMin ? parseFloat(confidenceMin) : 0,
          max: confidenceMax ? parseFloat(confidenceMax) : 1
        };
      }

      const response = await fetch('/api/paper/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(customOptions)
      });

      if (!response.ok) {
        throw new Error('Custom export failed');
      }

      const result = await response.json();
      
      // Download as JSON file
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { 
        type: 'application/json' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `custom-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Custom export completed (${result.metadata.recordCount} records)`);
    } catch (error) {
      console.error('Custom export error:', error);
      toast.error('Failed to export custom data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className=\"w-full max-w-4xl mx-auto\">
      <CardHeader>
        <CardTitle className=\"flex items-center gap-2\">
          <Download className=\"h-5 w-5\" />
          Data Export
        </CardTitle>
      </CardHeader>
      <CardContent className=\"space-y-6\">
        {/* Export Type Selection */}
        <div className=\"space-y-3\">
          <Label className=\"text-sm font-medium\">Export Type</Label>
          <div className=\"grid grid-cols-2 md:grid-cols-4 gap-3\">
            {exportTypes.map((type) => {
              const Icon = type.icon;
              return (
                <Button
                  key={type.value}
                  variant={exportOptions.exportType === type.value ? 'default' : 'outline'}
                  className=\"h-auto p-3 flex flex-col items-center gap-2\"
                  onClick={() => setExportOptions(prev => ({ ...prev, exportType: type.value as any }))}
                >
                  <Icon className=\"h-4 w-4\" />
                  <span className=\"text-xs\">{type.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Format Selection */}
        <div className=\"space-y-3\">
          <Label className=\"text-sm font-medium\">Format</Label>
          <Select
            value={exportOptions.format}
            onValueChange={(value) => setExportOptions(prev => ({ ...prev, format: value as any }))}
          >
            <SelectTrigger className=\"w-48\">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=\"CSV\">CSV (Spreadsheet)</SelectItem>
              <SelectItem value=\"JSON\">JSON (Data)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className=\"space-y-3\">
          <Label className=\"text-sm font-medium\">Date Range (Optional)</Label>
          <div className=\"flex gap-3 items-center\">
            <div className=\"space-y-1\">
              <Label className=\"text-xs text-muted-foreground\">Start Date</Label>
              <Input
                type=\"date\"
                value={exportOptions.dateRange?.start || ''}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  dateRange: {
                    start: e.target.value,
                    end: prev.dateRange?.end || ''
                  }
                }))}
                className=\"w-40\"
              />
            </div>
            <div className=\"space-y-1\">
              <Label className=\"text-xs text-muted-foreground\">End Date</Label>
              <Input
                type=\"date\"
                value={exportOptions.dateRange?.end || ''}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  dateRange: {
                    start: prev.dateRange?.start || '',
                    end: e.target.value
                  }
                }))}
                className=\"w-40\"
              />
            </div>
          </div>
        </div>

        {/* Options */}
        <div className=\"space-y-3\">
          <Label className=\"text-sm font-medium\">Options</Label>
          <div className=\"space-y-2\">
            <div className=\"flex items-center space-x-2\">
              <Checkbox
                id=\"includeOpen\"
                checked={exportOptions.includeOpenPositions}
                onCheckedChange={(checked) => 
                  setExportOptions(prev => ({ ...prev, includeOpenPositions: !!checked }))
                }
              />
              <Label htmlFor=\"includeOpen\" className=\"text-sm\">
                Include open positions
              </Label>
            </div>
            <div className=\"flex items-center space-x-2\">
              <Checkbox
                id=\"includeAnalytics\"
                checked={exportOptions.includeAnalytics}
                onCheckedChange={(checked) => 
                  setExportOptions(prev => ({ ...prev, includeAnalytics: !!checked }))
                }
              />
              <Label htmlFor=\"includeAnalytics\" className=\"text-sm\">
                Include performance analytics
              </Label>
            </div>
          </div>
        </div>

        {/* Quick Export */}
        <div className=\"space-y-3\">
          <Separator />
          <div className=\"flex justify-between items-center\">
            <div>
              <h3 className=\"text-sm font-medium\">Quick Export</h3>
              <p className=\"text-xs text-muted-foreground\">
                Export with current settings
              </p>
            </div>
            <Button 
              onClick={handleExport} 
              disabled={isExporting}
              className=\"min-w-24\"
            >
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className=\"space-y-4\">
          <Separator />
          <h3 className=\"text-sm font-medium\">Advanced Filters</h3>
          
          {/* Custom Tickers */}
          <div className=\"space-y-2\">
            <Label className=\"text-xs text-muted-foreground\">
              Specific Tickers (comma-separated)
            </Label>
            <Input
              placeholder=\"e.g., AAPL, MSFT, TSLA\"
              value={customTickers}
              onChange={(e) => setCustomTickers(e.target.value)}
              className=\"w-full\"
            />
          </div>

          {/* Regime Filter */}
          <div className=\"space-y-2\">
            <Label className=\"text-xs text-muted-foreground\">Market Regimes</Label>
            <div className=\"flex flex-wrap gap-2\">
              {regimeOptions.map((regime) => (
                <div key={regime} className=\"flex items-center space-x-1\">
                  <Checkbox
                    id={`regime-${regime}`}
                    checked={exportOptions.filters.regimes.includes(regime)}
                    onCheckedChange={(checked) => {
                      setExportOptions(prev => ({
                        ...prev,
                        filters: {
                          ...prev.filters,
                          regimes: checked
                            ? [...prev.filters.regimes, regime]
                            : prev.filters.regimes.filter(r => r !== regime)
                        }
                      }));
                    }}
                  />
                  <Label htmlFor={`regime-${regime}`} className=\"text-xs\">
                    {regime}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Confidence Range */}
          <div className=\"space-y-2\">
            <Label className=\"text-xs text-muted-foreground\">Confidence Range</Label>
            <div className=\"flex gap-2 items-center\">
              <Input
                type=\"number\"
                placeholder=\"Min (0.0)\"
                min=\"0\"
                max=\"1\"
                step=\"0.1\"
                value={confidenceMin}
                onChange={(e) => setConfidenceMin(e.target.value)}
                className=\"w-24\"
              />
              <span className=\"text-xs text-muted-foreground\">to</span>
              <Input
                type=\"number\"
                placeholder=\"Max (1.0)\"
                min=\"0\"
                max=\"1\"
                step=\"0.1\"
                value={confidenceMax}
                onChange={(e) => setConfidenceMax(e.target.value)}
                className=\"w-24\"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className=\"space-y-2\">
            <Label className=\"text-xs text-muted-foreground\">Position Status</Label>
            <div className=\"flex gap-3\">
              {statusOptions.map((status) => (
                <div key={status} className=\"flex items-center space-x-1\">
                  <Checkbox
                    id={`status-${status}`}
                    checked={exportOptions.filters.status.includes(status)}
                    onCheckedChange={(checked) => {
                      setExportOptions(prev => ({
                        ...prev,
                        filters: {
                          ...prev.filters,
                          status: checked
                            ? [...prev.filters.status, status]
                            : prev.filters.status.filter(s => s !== status)
                        }
                      }));
                    }}
                  />
                  <Label htmlFor={`status-${status}`} className=\"text-xs\">
                    {status}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Export Button */}
          <div className=\"pt-3\">
            <Button 
              onClick={handleCustomExport} 
              disabled={isExporting}
              variant=\"outline\"
              className=\"w-full\"
            >
              {isExporting ? 'Exporting...' : 'Export with Filters'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}