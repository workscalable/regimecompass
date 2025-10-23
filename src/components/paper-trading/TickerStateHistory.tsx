'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

interface StateTransition {
  ticker: string;
  from: string;
  to: string;
  timestamp: string;
  confidence: number;
  reason?: string;
}

interface TickerStateHistory {
  ticker: string;
  transitions: StateTransition[];
  currentState: string;
  totalTransitions: number;
  avgTimeInState: number;
  mostCommonTransition: string;
}

export function TickerStateHistory() {
  const [histories, setHistories] = useState<TickerStateHistory[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStateHistories();
  }, []);

  const loadStateHistories = async () => {
    try {
      // Mock data for demonstration
      const mockHistories = generateMockHistories();
      setHistories(mockHistories);
    } catch (error) {
      console.error('Failed to load state histories:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockHistories = (): TickerStateHistory[] => {
    const tickers = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA'];
    const states = ['READY', 'SET', 'GO', 'COOLDOWN'];
    
    return tickers.map(ticker => {
      const transitions: StateTransition[] = [];
      const transitionCount = Math.floor(Math.random() * 10) + 5;
      
      for (let i = 0; i < transitionCount; i++) {
        const from = states[Math.floor(Math.random() * states.length)];
        let to = states[Math.floor(Math.random() * states.length)];
        while (to === from) {
          to = states[Math.floor(Math.random() * states.length)];
        }
        
        transitions.push({
          ticker,
          from,
          to,
          timestamp: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
          confidence: Math.random() * 100,
          reason: `Confidence threshold ${to === 'GO' ? 'exceeded' : 'not met'}`
        });
      }
      
      transitions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      return {
        ticker,
        transitions,
        currentState: transitions[0]?.to || 'READY',
        totalTransitions: transitions.length,
        avgTimeInState: Math.random() * 3600000, // Random milliseconds
        mostCommonTransition: 'READY → SET'
      };
    });
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

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const selectedHistory = histories.find(h => h.ticker === selectedTicker);

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
    <div className="space-y-4">
      {/* Ticker Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Ticker State History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={selectedTicker} onValueChange={setSelectedTicker}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select ticker" />
              </SelectTrigger>
              <SelectContent>
                {histories.map(history => (
                  <SelectItem key={history.ticker} value={history.ticker}>
                    {history.ticker}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={loadStateHistories}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History Overview */}
      {histories.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {histories.map(history => (
            <Card 
              key={history.ticker} 
              className={`cursor-pointer transition-colors ${
                selectedTicker === history.ticker ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedTicker(history.ticker)}
            >
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="font-bold text-lg">{history.ticker}</div>
                  <Badge className={getStateColor(history.currentState)}>
                    {history.currentState}
                  </Badge>
                  <div className="text-sm text-gray-600 mt-2">
                    {history.totalTransitions} transitions
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detailed History */}
      {selectedHistory && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{selectedHistory.ticker} Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-gray-600">Current State</div>
                <Badge className={getStateColor(selectedHistory.currentState)}>
                  {selectedHistory.currentState}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Transitions</div>
                <div className="text-2xl font-bold">{selectedHistory.totalTransitions}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Avg Time in State</div>
                <div className="font-medium">{formatDuration(selectedHistory.avgTimeInState)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Most Common Transition</div>
                <div className="font-medium">{selectedHistory.mostCommonTransition}</div>
              </div>
            </CardContent>
          </Card>

          {/* Transition Timeline */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Transition Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {selectedHistory.transitions.map((transition, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge className={getStateColor(transition.from)}>
                        {transition.from}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <Badge className={getStateColor(transition.to)}>
                        {transition.to}
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        Confidence: {transition.confidence.toFixed(1)}%
                      </div>
                      {transition.reason && (
                        <div className="text-xs text-gray-600">{transition.reason}</div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTimestamp(transition.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transition Analysis */}
      {selectedHistory && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transition Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['READY → SET', 'SET → GO', 'GO → COOLDOWN', 'COOLDOWN → READY'].map(transition => {
                const count = selectedHistory.transitions.filter(t => 
                  `${t.from} → ${t.to}` === transition
                ).length;
                const percentage = selectedHistory.totalTransitions > 0 ? 
                  (count / selectedHistory.totalTransitions) * 100 : 0;
                
                return (
                  <div key={transition} className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-sm font-medium">{transition}</div>
                    <div className="text-2xl font-bold text-blue-600">{count}</div>
                    <div className="text-xs text-gray-600">{percentage.toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}