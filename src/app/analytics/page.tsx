'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Shield, 
  Brain, 
  Zap,
  BarChart3,
  Settings,
  Play,
  Pause,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Calculator,
  Activity,
  DollarSign,
  Clock,
  ArrowUp,
  ArrowDown,
  Minus,
  PieChart,
  LineChart,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AlertCircle,
  CheckCircle2,
  XCircle as XCircleIcon,
  Info,
  ExternalLink,
  Download,
  Upload,
  Filter,
  Search,
  SortAsc,
  SortDesc,
  BarChart,
  Scatter,
  Radar,
  Layers,
  Gauge,
  Thermometer,
  Wind,
  Sun,
  Moon,
  Star,
  Zap as ZapIcon,
  Target as TargetIcon,
  Shield as ShieldIcon,
  Brain as BrainIcon,
  Activity as ActivityIcon,
  TrendingUp as TrendingUpIcon2,
  TrendingDown as TrendingDownIcon2,
  BarChart3 as BarChart3Icon,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Scatter as ScatterIcon,
  Radar as RadarIcon,
  Gauge as GaugeIcon,
  Thermometer as ThermometerIcon,
  Wind as WindIcon,
  Sun as SunIcon,
  Moon as MoonIcon,
  Star as StarIcon
} from 'lucide-react';
import { toast } from 'sonner';

interface PerformanceMetric {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'neutral';
  category: 'performance' | 'risk' | 'efficiency' | 'stability';
  description: string;
  threshold: {
    excellent: number;
    good: number;
    acceptable: number;
  };
}

interface SignalAnalysis {
  signalType: string;
  totalSignals: number;
  successfulSignals: number;
  successRate: number;
  avgConfidence: number;
  avgHoldingPeriod: number;
  totalPnL: number;
  effectiveness: 'high' | 'medium' | 'low';
  recommendation: string;
}

interface MarketRegimeAnalysis {
  regime: 'BULL' | 'BEAR' | 'NEUTRAL';
  confidence: number;
  duration: number;
  performance: {
    winRate: number;
    avgReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
  };
  signals: {
    total: number;
    successful: number;
    avgConfidence: number;
  };
  recommendations: string[];
}

interface FibonacciAnalysis {
  zone: string;
  totalTrades: number;
  winRate: number;
  avgReturn: number;
  maxDrawdown: number;
  multiplier: number;
  effectiveness: 'high' | 'medium' | 'low';
  recommendation: string;
}

interface LearningInsights {
  category: string;
  insight: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  recommendation: string;
  timestamp: string;
}

export default function AnalyticsPage() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('30D');
  const [selectedMetric, setSelectedMetric] = useState('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLive, setIsLive] = useState(false);

  // Mock analytics data
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([
    {
      name: 'Win Rate',
      value: 68.2,
      change: 2.1,
      changePercent: 3.2,
      trend: 'up',
      category: 'performance',
      description: 'Percentage of profitable trades',
      threshold: { excellent: 70, good: 60, acceptable: 55 }
    },
    {
      name: 'Profit Factor',
      value: 1.85,
      change: 0.12,
      changePercent: 6.9,
      trend: 'up',
      category: 'performance',
      description: 'Ratio of gross profit to gross loss',
      threshold: { excellent: 2.0, good: 1.5, acceptable: 1.2 }
    },
    {
      name: 'Sharpe Ratio',
      value: 1.42,
      change: -0.05,
      changePercent: -3.4,
      trend: 'down',
      category: 'risk',
      description: 'Risk-adjusted return measure',
      threshold: { excellent: 2.0, good: 1.5, acceptable: 1.0 }
    },
    {
      name: 'Max Drawdown',
      value: 3.2,
      change: -0.8,
      changePercent: -20.0,
      trend: 'up',
      category: 'risk',
      description: 'Maximum peak-to-trough decline',
      threshold: { excellent: 2.0, good: 5.0, acceptable: 10.0 }
    },
    {
      name: 'Sortino Ratio',
      value: 1.85,
      change: 0.08,
      changePercent: 4.5,
      trend: 'up',
      category: 'risk',
      description: 'Downside risk-adjusted return',
      threshold: { excellent: 2.0, good: 1.5, acceptable: 1.0 }
    },
    {
      name: 'Calmar Ratio',
      value: 1.39,
      change: 0.15,
      changePercent: 12.1,
      trend: 'up',
      category: 'risk',
      description: 'Return to max drawdown ratio',
      threshold: { excellent: 2.0, good: 1.5, acceptable: 1.0 }
    }
  ]);

  const [signalAnalysis, setSignalAnalysis] = useState<SignalAnalysis[]>([
    {
      signalType: 'Trend',
      totalSignals: 45,
      successfulSignals: 32,
      successRate: 71.1,
      avgConfidence: 0.82,
      avgHoldingPeriod: 2.3,
      totalPnL: 1250.00,
      effectiveness: 'high',
      recommendation: 'Increase weight in trending markets'
    },
    {
      signalType: 'Momentum',
      totalSignals: 38,
      successfulSignals: 24,
      successRate: 63.2,
      avgConfidence: 0.76,
      avgHoldingPeriod: 1.8,
      totalPnL: 890.00,
      effectiveness: 'medium',
      recommendation: 'Optimize parameters for better accuracy'
    },
    {
      signalType: 'Volume',
      totalSignals: 42,
      successfulSignals: 28,
      successRate: 66.7,
      avgConfidence: 0.79,
      avgHoldingPeriod: 2.1,
      totalPnL: 1100.00,
      effectiveness: 'high',
      recommendation: 'Maintain current weight'
    },
    {
      signalType: 'Fibonacci',
      totalSignals: 35,
      successfulSignals: 22,
      successRate: 62.9,
      avgConfidence: 0.74,
      avgHoldingPeriod: 2.5,
      totalPnL: 750.00,
      effectiveness: 'medium',
      recommendation: 'Adjust zone parameters'
    },
    {
      signalType: 'Gamma',
      totalSignals: 28,
      successfulSignals: 18,
      successRate: 64.3,
      avgConfidence: 0.71,
      avgHoldingPeriod: 1.9,
      totalPnL: 680.00,
      effectiveness: 'medium',
      recommendation: 'Improve timing accuracy'
    }
  ]);

  const [marketRegimeAnalysis, setMarketRegimeAnalysis] = useState<MarketRegimeAnalysis>({
    regime: 'BULL',
    confidence: 0.87,
    duration: 15,
    performance: {
      winRate: 72.5,
      avgReturn: 2.8,
      maxDrawdown: 2.1,
      sharpeRatio: 1.65
    },
    signals: {
      total: 156,
      successful: 113,
      avgConfidence: 0.81
    },
    recommendations: [
      'Increase trend signal weight',
      'Reduce volatility exposure',
      'Focus on momentum strategies',
      'Adjust position sizing for regime'
    ]
  });

  const [fibonacciAnalysis, setFibonacciAnalysis] = useState<FibonacciAnalysis[]>([
    {
      zone: 'Zone 1 (0.618)',
      totalTrades: 25,
      winRate: 68.0,
      avgReturn: 2.2,
      maxDrawdown: 1.8,
      multiplier: 1.0,
      effectiveness: 'high',
      recommendation: 'Maintain current multiplier'
    },
    {
      zone: 'Zone 2 (1.0)',
      totalTrades: 35,
      winRate: 71.4,
      avgReturn: 2.8,
      maxDrawdown: 2.1,
      multiplier: 1.2,
      effectiveness: 'high',
      recommendation: 'Consider increasing multiplier'
    },
    {
      zone: 'Zone 3 (1.618)',
      totalTrades: 28,
      winRate: 64.3,
      avgReturn: 2.5,
      maxDrawdown: 2.5,
      multiplier: 1.5,
      effectiveness: 'medium',
      recommendation: 'Optimize entry timing'
    },
    {
      zone: 'Zone 4 (2.618)',
      totalTrades: 18,
      winRate: 55.6,
      avgReturn: 1.8,
      maxDrawdown: 3.2,
      multiplier: 2.0,
      effectiveness: 'low',
      recommendation: 'Reduce position size'
    }
  ]);

  const [learningInsights, setLearningInsights] = useState<LearningInsights[]>([
    {
      category: 'Signal Optimization',
      insight: 'Trend signals perform 15% better in trending markets',
      confidence: 0.89,
      impact: 'high',
      recommendation: 'Increase trend signal weight during trending periods',
      timestamp: '2024-01-18T10:30:00Z'
    },
    {
      category: 'Risk Management',
      insight: 'Portfolio heat above 15% increases drawdown risk by 40%',
      confidence: 0.92,
      impact: 'high',
      recommendation: 'Implement stricter heat limits',
      timestamp: '2024-01-18T09:15:00Z'
    },
    {
      category: 'Fibonacci Zones',
      insight: 'Zone 2 (1.0) shows highest success rate at 71.4%',
      confidence: 0.85,
      impact: 'medium',
      recommendation: 'Increase focus on Zone 2 entries',
      timestamp: '2024-01-18T08:45:00Z'
    },
    {
      category: 'Market Regime',
      insight: 'Current BULL regime expected to continue for 2-3 weeks',
      confidence: 0.78,
      impact: 'medium',
      recommendation: 'Maintain bullish bias in position sizing',
      timestamp: '2024-01-18T07:30:00Z'
    }
  ]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-400" />;
      default: return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-400';
      case 'down': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getEffectivenessColor = (effectiveness: string) => {
    switch (effectiveness) {
      case 'high': return 'text-green-400 bg-green-900/20';
      case 'medium': return 'text-yellow-400 bg-yellow-900/20';
      case 'low': return 'text-red-400 bg-red-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-400 bg-red-900/20';
      case 'medium': return 'text-yellow-400 bg-yellow-900/20';
      case 'low': return 'text-green-400 bg-green-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRegimeColor = (regime: string) => {
    switch (regime) {
      case 'BULL': return 'text-green-400 bg-green-900/20';
      case 'BEAR': return 'text-red-400 bg-red-900/20';
      case 'NEUTRAL': return 'text-yellow-400 bg-yellow-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getMetricStatus = (value: number, threshold: any) => {
    if (value >= threshold.excellent) return 'excellent';
    if (value >= threshold.good) return 'good';
    if (value >= threshold.acceptable) return 'acceptable';
    return 'poor';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-400 bg-green-900/20';
      case 'good': return 'text-blue-400 bg-blue-900/20';
      case 'acceptable': return 'text-yellow-400 bg-yellow-900/20';
      case 'poor': return 'text-red-400 bg-red-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-8 w-8 text-blue-400" />
                <h1 className="text-2xl font-bold">Advanced Analytics</h1>
              </div>
              <Badge className="bg-blue-900/20 text-blue-400 px-3 py-1">
                {selectedTimeframe} Analysis
              </Badge>
              <Badge className="bg-green-900/20 text-green-400 px-3 py-1">
                {marketRegimeAnalysis.regime} Market
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                <span className="text-sm text-gray-400">
                  {isLive ? 'LIVE' : 'PAUSED'}
                </span>
              </div>
              
              <Button
                variant={isLive ? "destructive" : "default"}
                size="sm"
                onClick={() => setIsLive(!isLive)}
                className="flex items-center space-x-2"
              >
                {isLive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                <span>{isLive ? 'Pause' : 'Start'}</span>
              </Button>
              
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" size="sm" onClick={() => setShowAdvanced(!showAdvanced)}>
                {showAdvanced ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="performance" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Performance</span>
            </TabsTrigger>
            <TabsTrigger value="signals" className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Signals</span>
            </TabsTrigger>
            <TabsTrigger value="regime" className="flex items-center space-x-2">
              <Brain className="h-4 w-4" />
              <span>Regime</span>
            </TabsTrigger>
            <TabsTrigger value="fibonacci" className="flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Fibonacci</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Insights</span>
            </TabsTrigger>
          </TabsList>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            {/* Performance Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {performanceMetrics.map((metric, index) => {
                const status = getMetricStatus(metric.value, metric.threshold);
                return (
                  <Card key={index} className="bg-gray-800 border-gray-700">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-gray-400">
                          {metric.name}
                        </CardTitle>
                        <div className="flex items-center space-x-2">
                          {getTrendIcon(metric.trend)}
                          <Badge className={getStatusColor(status)}>
                            {status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white mb-1">
                        {metric.value.toFixed(metric.name.includes('Ratio') ? 2 : 1)}
                        {metric.name.includes('Rate') || metric.name.includes('Drawdown') ? '%' : ''}
                      </div>
                      <div className={`text-sm ${getTrendColor(metric.trend)}`}>
                        {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}
                        ({metric.changePercent > 0 ? '+' : ''}{metric.changePercent.toFixed(1)}%)
                      </div>
                      <div className="text-xs text-gray-400 mt-2">
                        {metric.description}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Performance Summary */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-xl">Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400 mb-2">
                      {(performanceMetrics.find(m => m.name === 'Win Rate')?.value || 0).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-400">Win Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400 mb-2">
                      {(performanceMetrics.find(m => m.name === 'Profit Factor')?.value || 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-400">Profit Factor</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-400 mb-2">
                      {(performanceMetrics.find(m => m.name === 'Sharpe Ratio')?.value || 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-400">Sharpe Ratio</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-400 mb-2">
                      {(performanceMetrics.find(m => m.name === 'Max Drawdown')?.value || 0).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-400">Max Drawdown</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Signals Tab */}
          <TabsContent value="signals" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-xl">Signal Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {signalAnalysis.map((signal, index) => (
                    <div key={index} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Badge className="bg-blue-900/20 text-blue-400">
                            {signal.signalType}
                          </Badge>
                          <span className="text-white font-medium">
                            {signal.totalSignals} signals
                          </span>
                          <span className="text-gray-400">
                            {signal.successfulSignals} successful
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge className={getEffectivenessColor(signal.effectiveness)}>
                            {signal.effectiveness.toUpperCase()}
                          </Badge>
                          <span className="text-white font-medium">
                            {signal.successRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Avg Confidence:</span>
                          <span className="text-white ml-2">
                            {(signal.avgConfidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Avg Holding:</span>
                          <span className="text-white ml-2">
                            {signal.avgHoldingPeriod} days
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Total P&L:</span>
                          <span className="text-green-400 ml-2">
                            ${signal.totalPnL.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Recommendation:</span>
                          <span className="text-blue-400 ml-2 text-xs">
                            {signal.recommendation}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Regime Tab */}
          <TabsContent value="regime" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl">Market Regime Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Current Regime</span>
                    <Badge className={getRegimeColor(marketRegimeAnalysis.regime)}>
                      {marketRegimeAnalysis.regime}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Confidence</span>
                    <span className="text-white font-medium">
                      {(marketRegimeAnalysis.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Duration</span>
                    <span className="text-white font-medium">
                      {marketRegimeAnalysis.duration} days
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Win Rate</span>
                    <span className="text-green-400 font-medium">
                      {marketRegimeAnalysis.performance.winRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Avg Return</span>
                    <span className="text-white font-medium">
                      {marketRegimeAnalysis.performance.avgReturn.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Max Drawdown</span>
                    <span className="text-red-400 font-medium">
                      {marketRegimeAnalysis.performance.maxDrawdown.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Sharpe Ratio</span>
                    <span className="text-white font-medium">
                      {marketRegimeAnalysis.performance.sharpeRatio.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl">Regime Recommendations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {marketRegimeAnalysis.recommendations.map((recommendation, index) => (
                      <div key={index} className="bg-gray-700 rounded-lg p-3">
                        <div className="flex items-start space-x-3">
                          <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-300">{recommendation}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Fibonacci Tab */}
          <TabsContent value="fibonacci" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-xl">Fibonacci Zone Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {fibonacciAnalysis.map((zone, index) => (
                    <div key={index} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Badge className="bg-purple-900/20 text-purple-400">
                            {zone.zone}
                          </Badge>
                          <span className="text-white font-medium">
                            {zone.totalTrades} trades
                          </span>
                          <span className="text-gray-400">
                            {zone.winRate.toFixed(1)}% win rate
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge className={getEffectivenessColor(zone.effectiveness)}>
                            {zone.effectiveness.toUpperCase()}
                          </Badge>
                          <span className="text-white font-medium">
                            {zone.avgReturn.toFixed(1)}% avg return
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Max Drawdown:</span>
                          <span className="text-red-400 ml-2">
                            {zone.maxDrawdown.toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Multiplier:</span>
                          <span className="text-white ml-2">
                            {zone.multiplier}x
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Effectiveness:</span>
                          <span className="text-blue-400 ml-2">
                            {zone.effectiveness}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Recommendation:</span>
                          <span className="text-blue-400 ml-2 text-xs">
                            {zone.recommendation}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-xl">Learning Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {learningInsights.map((insight, index) => (
                    <div key={index} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Badge className="bg-blue-900/20 text-blue-400">
                            {insight.category}
                          </Badge>
                          <Badge className={getImpactColor(insight.impact)}>
                            {insight.impact.toUpperCase()} IMPACT
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-400">
                            {new Date(insight.timestamp).toLocaleDateString()}
                          </span>
                          <Badge className={getConfidenceColor(insight.confidence)}>
                            {(insight.confidence * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <div className="text-white font-medium mb-2">
                          {insight.insight}
                        </div>
                        <div className="text-sm text-gray-400">
                          <strong>Recommendation:</strong> {insight.recommendation}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
