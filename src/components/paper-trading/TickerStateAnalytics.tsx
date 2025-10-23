'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock,
  Zap,
  Activity,
  AlertTriangle
} from 'lucide-react';

interface StateAnalytics {
  stateEfficiency: {
    READY: { avgDuration: number; successRate: number; count: number };
    SET: { avgDuration: number; successRate: number; count: number };
    GO: { avgDuration: number; successRate: number; count: number };
    COOLDOWN: { avgDuration: number; successRate: number; count: number };
  };
  transitionPatterns: {
    pattern: string;
    frequency: number;
    avgConfidence: number;
    successRate: number;
  }[];
  performanceByRegime: {
    regime: string;
    avgConfidence: number;
    transitionRate: number;
    successfulTrades: number;
  }[];
  timeOfDayAnalysis: {
    hour: number;
    transitionCount: number;
    avgConfidence: number;
    successRate: number;
  }[];
  confidenceDistribution: {
    range: string;
    count: number;
    successRate: number;
    avgPnL: number;
  }[];
}

export function TickerStateAnalytics() {
  const [analytics, setAnalytics] = useState<StateAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      // Mock analytics data
      const mockAnalytics = generateMockAnalytics();
      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockAnalytics = (): StateAnalytics => {
    return {
      stateEfficiency: {
        READY: { avgDuration: 1800000, successRate: 0.75, count: 45 },
        SET: { avgDuration: 600000, successRate: 0.85, count: 38 },
        GO: { avgDuration: 300000, successRate: 0.92, count: 32 },
        COOLDOWN: { avgDuration: 900000, successRate: 0.68, count: 28 }
      },
      transitionPatterns: [
        { pattern: 'READY → SET', frequency: 35, avgConfidence: 72.5, successRate: 0.8 },
        { pattern: 'SET → GO', frequency: 28, avgConfidence: 85.2, successRate: 0.9 },
        { pattern: 'GO → COOLDOWN', frequency: 25, avgConfidence: 78.1, successRate: 0.85 },
        { pattern: 'COOLDOWN → READY', frequency: 22, avgConfidence: 65.3, successRate: 0.75 }
      ],
      performanceByRegime: [
        { regime: 'BULL', avgConfidence: 78.5, transitionRate: 0.85, successfulTrades: 18 },
        { regime: 'BEAR', avgConfidence: 65.2, transitionRate: 0.65, successfulTrades: 8 },
        { regime: 'NEUTRAL', avgConfidence: 71.8, transitionRate: 0.75, successfulTrades: 12 },
        { regime: 'TRANSITION', avgConfidence: 58.9, transitionRate: 0.55, successfulTrades: 4 }
      ],
      timeOfDayAnalysis: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        transitionCount: Math.floor(Math.random() * 20) + 5,
        avgConfidence: Math.random() * 40 + 50,
        successRate: Math.random() * 0.4 + 0.6
      })),
      confidenceDistribution: [
        { range: '90-100%', count: 12, successRate: 0.95, avgPnL: 245.50 },
        { range: '80-90%', count: 18, successRate: 0.88, avgPnL: 185.25 },
        { range: '70-80%', count: 25, successRate: 0.76, avgPnL: 125.75 },
        { range: '60-70%', count: 22, successRate: 0.65, avgPnL: 85.30 },
        { range: '50-60%', count: 15, successRate: 0.52, avgPnL: 45.80 },
        { range: '<50%', count: 8, successRate: 0.35, avgPnL: -25.60 }
      ]
    };
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'READY': return 'bg-blue-100 text-blue-800';
      case 'SET': return 'bg-yellow-100 text-yellow-800';
      case 'GO': return 'bg-green-100 text-green-800';
      case 'COOLDOWN': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 0.8) return 'text-green-600';
    if (rate >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
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

  if (!analytics) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            No analytics data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* State Efficiency Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            State Efficiency Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(analytics.stateEfficiency).map(([state, data]) => (
              <div key={state} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <Badge className={getStateColor(state)}>{state}</Badge>
                  <div className="text-sm text-gray-600">{data.count} times</div>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-gray-600">Avg Duration</div>
                    <div className="font-medium">{formatDuration(data.avgDuration)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Success Rate</div>
                    <div className={`font-bold ${getSuccessRateColor(data.successRate)}`}>
                      {(data.successRate * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transition Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Transition Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.transitionPatterns.map((pattern, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="font-medium">{pattern.pattern}</div>
                  <Badge variant="outline">{pattern.frequency} times</Badge>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-gray-600">Confidence:</span>
                    <span className="ml-1 font-medium">{pattern.avgConfidence.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Success:</span>
                    <span className={`ml-1 font-bold ${getSuccessRateColor(pattern.successRate)}`}>
                      {(pattern.successRate * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance by Regime */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Performance by Market Regime
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {analytics.performanceByRegime.map((regime, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="text-center mb-3">
                  <Badge className={getRegimeColor(regime.regime)}>{regime.regime}</Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Confidence:</span>
                    <span className="font-medium">{regime.avgConfidence.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transition Rate:</span>
                    <span className="font-medium">{(regime.transitionRate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Successful Trades:</span>
                    <span className="font-bold text-green-600">{regime.successfulTrades}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Confidence Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Confidence Distribution Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.confidenceDistribution.map((dist, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="font-medium w-20">{dist.range}</div>
                  <Badge variant="outline">{dist.count} trades</Badge>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-gray-600">Success Rate:</span>
                    <span className={`ml-1 font-bold ${getSuccessRateColor(dist.successRate)}`}>
                      {(dist.successRate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Avg P&L:</span>
                    <span className={`ml-1 font-bold ${dist.avgPnL > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${dist.avgPnL.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Time of Day Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time of Day Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
            {analytics.timeOfDayAnalysis.map((hourData) => {
              const isMarketHours = hourData.hour >= 9 && hourData.hour <= 16;
              const intensity = hourData.transitionCount / 25; // Normalize to 0-1
              
              return (
                <div
                  key={hourData.hour}
                  className={`p-2 rounded text-center text-xs ${
                    isMarketHours ? 'bg-blue-100' : 'bg-gray-100'
                  }`}
                  style={{
                    opacity: 0.3 + (intensity * 0.7)
                  }}
                >
                  <div className="font-medium">{hourData.hour}:00</div>
                  <div className="text-xs text-gray-600">{hourData.transitionCount}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-100 rounded"></div>
                <span>Market Hours (9 AM - 4 PM)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-100 rounded"></div>
                <span>After Hours</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Key Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium text-green-800">High Success in GO State</div>
                <div className="text-sm text-green-700">
                  GO state shows 92% success rate with average duration of 5 minutes
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <div className="font-medium text-yellow-800">BULL Regime Dominance</div>
                <div className="text-sm text-yellow-700">
                  78.5% average confidence in BULL regime with 18 successful trades
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <div className="font-medium text-blue-800">Market Hours Activity</div>
                <div className="text-sm text-blue-700">
                  Peak transition activity occurs between 10 AM - 2 PM
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
              <TrendingDown className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <div className="font-medium text-red-800">Low Confidence Risk</div>
                <div className="text-sm text-red-700">
                  Trades with &lt;50% confidence show negative average P&L of -$25.60
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}