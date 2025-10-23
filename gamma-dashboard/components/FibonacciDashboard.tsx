'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle } from 'lucide-react';
import { useFibonacciData } from '../hooks/useFibonacciData';

interface FibonacciLevel {
  level: number;
  type: 'SUPPORT' | 'RESISTANCE' | 'TARGET';
  strength: number;
  distance: number;
}

interface FibonacciZoneData {
  ticker: string;
  currentPrice: number;
  zone: 'COMPRESSION' | 'MID_EXPANSION' | 'FULL_EXPANSION' | 'OVER_EXTENSION' | 'EXHAUSTION';
  expansionLevel: number;
  keyLevels: FibonacciLevel[];
  confluence: number;
  zoneMultiplier: number;
  riskAdjustment: number;
  targets: {
    immediate: number;
    intermediate: number;
    extended: number;
  };
}

const getZoneColor = (zone: string) => {
  switch (zone) {
    case 'COMPRESSION': return 'bg-blue-500';
    case 'MID_EXPANSION': return 'bg-green-500';
    case 'FULL_EXPANSION': return 'bg-yellow-500';
    case 'OVER_EXTENSION': return 'bg-orange-500';
    case 'EXHAUSTION': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const getZoneIcon = (zone: string) => {
  switch (zone) {
    case 'COMPRESSION': return <TrendingUp className="h-4 w-4" />;
    case 'MID_EXPANSION': return <CheckCircle className="h-4 w-4" />;
    case 'FULL_EXPANSION': return <Target className="h-4 w-4" />;
    case 'OVER_EXTENSION': return <AlertTriangle className="h-4 w-4" />;
    case 'EXHAUSTION': return <TrendingDown className="h-4 w-4" />;
    default: return <Target className="h-4 w-4" />;
  }
};

const FibonacciZoneCard: React.FC<{ data: FibonacciZoneData }> = ({ data }) => {
  const supportLevels = data.keyLevels.filter(level => level.type === 'SUPPORT');
  const resistanceLevels = data.keyLevels.filter(level => level.type === 'RESISTANCE');
  const targetLevels = data.keyLevels.filter(level => level.type === 'TARGET');

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{data.ticker}</CardTitle>
          <Badge className={`${getZoneColor(data.zone)} text-white`}>
            <div className="flex items-center gap-1">
              {getZoneIcon(data.zone)}
              {data.zone.replace('_', ' ')}
            </div>
          </Badge>
        </div>
        <div className="text-2xl font-bold">${data.currentPrice.toFixed(2)}</div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Expansion Level */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Expansion Level</span>
            <span className="font-medium">{(data.expansionLevel * 100).toFixed(1)}%</span>
          </div>
          <Progress value={data.expansionLevel * 100} className="h-2" />
        </div>

        {/* Confluence Score */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Confluence Score</span>
            <span className="font-medium">{(data.confluence * 100).toFixed(0)}%</span>
          </div>
          <Progress value={data.confluence * 100} className="h-2" />
        </div>

        {/* Zone Multiplier */}
        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
          <span className="text-sm font-medium">Zone Multiplier</span>
          <span className={`font-bold ${data.zoneMultiplier > 1 ? 'text-green-600' : data.zoneMultiplier < 1 ? 'text-red-600' : 'text-gray-600'}`}>
            {data.zoneMultiplier.toFixed(2)}x
          </span>
        </div>

        {/* Key Levels */}
        <div className="space-y-3">
          {/* Support Levels */}
          {supportLevels.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-green-600 mb-2">Support Levels</h4>
              <div className="space-y-1">
                {supportLevels.slice(0, 3).map((level, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span>${level.level.toFixed(2)}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={level.strength * 100} className="w-12 h-1" />
                      <span className="text-xs text-gray-500">{level.distance.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resistance Levels */}
          {resistanceLevels.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-600 mb-2">Resistance Levels</h4>
              <div className="space-y-1">
                {resistanceLevels.slice(0, 3).map((level, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span>${level.level.toFixed(2)}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={level.strength * 100} className="w-12 h-1" />
                      <span className="text-xs text-gray-500">{level.distance.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Target Levels */}
          <div>
            <h4 className="text-sm font-medium text-blue-600 mb-2">Price Targets</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="font-medium">Immediate</div>
                <div>${data.targets.immediate.toFixed(2)}</div>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="font-medium">Intermediate</div>
                <div>${data.targets.intermediate.toFixed(2)}</div>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="font-medium">Extended</div>
                <div>${data.targets.extended.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const FibonacciDashboard: React.FC = () => {
  const { fibonacciData, loading, error } = useFibonacciData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Error loading Fibonacci data: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Fibonacci Analysis</h2>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Zone Distribution Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Zone Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {['COMPRESSION', 'MID_EXPANSION', 'FULL_EXPANSION', 'OVER_EXTENSION', 'EXHAUSTION'].map(zone => {
              const count = fibonacciData.filter(data => data.zone === zone).length;
              const percentage = (count / fibonacciData.length) * 100;
              
              return (
                <div key={zone} className="text-center">
                  <div className={`w-full h-2 ${getZoneColor(zone)} rounded mb-2`}></div>
                  <div className="text-sm font-medium">{zone.replace('_', ' ')}</div>
                  <div className="text-xs text-gray-500">{count} tickers ({percentage.toFixed(0)}%)</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Individual Ticker Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {fibonacciData.map((data, index) => (
          <FibonacciZoneCard key={data.ticker} data={data} />
        ))}
      </div>
    </div>
  );
};

export default FibonacciDashboard;