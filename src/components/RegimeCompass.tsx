'use client';

import React, { useState, useEffect } from 'react';
import { MarketSnapshot, RegimeType } from '@/lib/types';
import { RegimeTooltip } from './ui/Tooltip';
import LoadingSpinner, { CardSkeleton } from './ui/LoadingSpinner';
import ErrorBoundary from './ui/ErrorBoundary';

interface RegimeCompassProps {
  snapshot?: MarketSnapshot;
  isLoading?: boolean;
  error?: Error;
  onRefresh?: () => void;
}

export default function RegimeCompass({ 
  snapshot, 
  isLoading = false, 
  error, 
  onRefresh 
}: RegimeCompassProps) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!autoRefresh || !onRefresh) return;

    const interval = setInterval(() => {
      onRefresh();
      setLastUpdate(new Date());
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [autoRefresh, onRefresh]);

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
        <div className="text-red-400 text-xl font-semibold mb-2">
          Market Data Error
        </div>
        <p className="text-gray-400 mb-4">
          {error.message || 'Unable to fetch market data'}
        </p>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (isLoading || !snapshot) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <LoadingSpinner size="lg" message="Loading market regime analysis..." />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header with Controls */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Market Regime Dashboard</h2>
            <p className="text-gray-400 text-sm">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <span>Auto-refresh</span>
            </label>
            <button
              onClick={onRefresh}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Main Regime Display */}
        <RegimeIndicator snapshot={snapshot} />

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Market Breadth"
            value={`${snapshot.breadth.breadthPct.toFixed(1)}%`}
            subtitle={`${snapshot.breadth.advancingStocks}/${snapshot.breadth.advancingStocks + snapshot.breadth.decliningStocks + snapshot.breadth.unchangedStocks} advancing`}
            trend={snapshot.breadth.breadthPct > 50 ? 'positive' : 'negative'}
            tooltip="Percentage of sectors above their 9-day EMA"
          />
          <MetricCard
            title="VIX Level"
            value={snapshot.vix.value.toFixed(1)}
            subtitle={snapshot.vix.trend}
            trend={snapshot.vix.value < 20 ? 'positive' : snapshot.vix.value > 25 ? 'negative' : 'neutral'}
            tooltip="Market volatility index - fear gauge"
          />
          <MetricCard
            title="Regime Strength"
            value={`${snapshot.regimeClassification.strength}/100`}
            subtitle={snapshot.regimeClassification.confidence > 0.7 ? 'high' : snapshot.regimeClassification.confidence > 0.4 ? 'medium' : 'low'}
            trend={snapshot.regimeClassification.strength > 70 ? 'positive' : snapshot.regimeClassification.strength < 40 ? 'negative' : 'neutral'}
            tooltip="Quantitative strength of current regime classification"
          />
          <MetricCard
            title="Gamma Exposure"
            value={snapshot.gamma.gex > 0 ? '+$' : '-$'}
            valueExtra={`${Math.abs(snapshot.gamma.gex / 1e9).toFixed(1)}B`}
            subtitle={snapshot.gamma.bias}
            trend={snapshot.gamma.bias === 'supportive' ? 'positive' : snapshot.gamma.bias === 'suppressive' ? 'negative' : 'neutral'}
            tooltip="Net dealer gamma exposure affecting market dynamics"
          />
        </div>

        {/* Regime Factors Breakdown */}
        <RegimeFactorsCard snapshot={snapshot} />

        {/* Market Structure Indicators */}
        <MarketStructureCard snapshot={snapshot} />
      </div>
    </ErrorBoundary>
  );
}

// Main regime indicator component
function RegimeIndicator({ snapshot }: { snapshot: MarketSnapshot }) {
  const getRegimeColor = (regime: RegimeType) => {
    switch (regime) {
      case 'BULL': return 'text-green-400 bg-green-900/20 border-green-500/30';
      case 'BEAR': return 'text-red-400 bg-red-900/20 border-red-500/30';
      case 'NEUTRAL': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-500/30';
    }
  };

  const getRegimeIcon = (regime: RegimeType) => {
    switch (regime) {
      case 'BULL': return '📈';
      case 'BEAR': return '📉';
      case 'NEUTRAL': return '➡️';
      default: return '❓';
    }
  };

  return (
    <div className={`rounded-lg border p-6 text-center ${getRegimeColor(snapshot.regime)}`}>
      <div className="text-6xl mb-4">{getRegimeIcon(snapshot.regime)}</div>
      <RegimeTooltip
        regime={snapshot.regime}
        factors={{
          breadth: snapshot.breadth.breadthPct > 50,
          emaAlignment: snapshot.indexes.SPY.ema20 < snapshot.indexes.SPY.price,
          trendScore: snapshot.indexes.SPY.trendScore9 > 0,
          volatility: snapshot.vix.value < 25,
          gamma: snapshot.gamma.bias === 'supportive'
        }}
      >
        <h3 className="text-3xl font-bold mb-2">{snapshot.regime} REGIME</h3>
      </RegimeTooltip>
      <p className="text-lg opacity-80">
        Confidence: {snapshot.regimeClassification.confidence > 0.7 ? 'High' : snapshot.regimeClassification.confidence > 0.4 ? 'Medium' : 'Low'}
      </p>
      <div className="mt-4 text-sm opacity-70">
        {snapshot.forwardLooking.expectedRegimeChange > 70 && (
          <div className="bg-yellow-900/30 border border-yellow-500/50 rounded p-2 mt-2">
            ⚠️ Early warning: Potential regime change detected
          </div>
        )}
      </div>
    </div>
  );
}

// Individual metric card component
function MetricCard({
  title,
  value,
  valueExtra,
  subtitle,
  trend,
  tooltip
}: {
  title: string;
  value: string;
  valueExtra?: string;
  subtitle: string;
  trend: 'positive' | 'negative' | 'neutral';
  tooltip?: string;
}) {
  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'positive': return 'text-green-400 border-green-500/30';
      case 'negative': return 'text-red-400 border-red-500/30';
      case 'neutral': return 'text-yellow-400 border-yellow-500/30';
      default: return 'text-gray-400 border-gray-500/30';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'positive': return '↗️';
      case 'negative': return '↘️';
      case 'neutral': return '➡️';
      default: return '';
    }
  };

  const content = (
    <div className={`bg-gray-800 rounded-lg p-4 border ${getTrendColor(trend)}`}>
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-medium text-gray-300">{title}</h4>
        <span className="text-lg">{getTrendIcon(trend)}</span>
      </div>
      <div className="text-2xl font-bold mb-1">
        {value}
        {valueExtra && <span className="text-lg">{valueExtra}</span>}
      </div>
      <p className="text-sm text-gray-400">{subtitle}</p>
    </div>
  );

  if (tooltip) {
    return (
      <RegimeTooltip regime={tooltip} factors={undefined}>
        {content}
      </RegimeTooltip>
    );
  }

  return content;
}

// Regime factors breakdown card
function RegimeFactorsCard({ snapshot }: { snapshot: MarketSnapshot }) {
  const factors = [
    {
      name: 'Market Breadth',
      status: snapshot.breadth.breadthPct > 50,
      value: `${snapshot.breadth.breadthPct.toFixed(1)}%`,
      description: 'Sectors above 9-day EMA'
    },
    {
      name: 'EMA Alignment',
      status: snapshot.indexes.SPY.ema20 < snapshot.indexes.SPY.price,
      value: snapshot.indexes.SPY.ema20 < snapshot.indexes.SPY.price ? 'bullish' : 'bearish',
      description: 'SPY vs moving averages'
    },
    {
      name: 'Trend Score',
      status: snapshot.indexes.SPY.trendScore9 > 0,
      value: snapshot.indexes.SPY.trendScore9.toFixed(1),
      description: '9-day trend momentum'
    },
    {
      name: 'Volatility',
      status: snapshot.vix.value < 25,
      value: snapshot.vix.value.toFixed(1),
      description: 'VIX fear gauge'
    },
    {
      name: 'Gamma Exposure',
      status: snapshot.gamma.bias === 'supportive',
      value: snapshot.gamma.bias,
      description: 'Dealer positioning'
    }
  ];

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Regime Classification Factors</h3>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {factors.map((factor, index) => (
          <div key={index} className="text-center">
            <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center ${
              factor.status ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
            }`}>
              {factor.status ? '✓' : '✗'}
            </div>
            <h4 className="font-medium text-sm mb-1">{factor.name}</h4>
            <p className="text-lg font-bold mb-1">{factor.value}</p>
            <p className="text-xs text-gray-400">{factor.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Market structure indicators card
function MarketStructureCard({ snapshot }: { snapshot: MarketSnapshot }) {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Market Structure</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Index Performance */}
        <div>
          <h4 className="font-medium mb-3 text-gray-300">Major Indices</h4>
          <div className="space-y-2">
            {Object.entries(snapshot.indexes).map(([symbol, data]) => (
              <div key={symbol} className="flex justify-between items-center">
                <span className="text-sm">{symbol}</span>
                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    data.trendScore9 > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {data.trendScore9 > 0 ? '+' : ''}{data.trendScore9.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {data.ema20 < data.price ? 'bullish' : 'bearish'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sector Breadth */}
        <div>
          <h4 className="font-medium mb-3 text-gray-300">Sector Breadth</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Advancing</span>
              <span className="text-green-400">{snapshot.breadth.advancingStocks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Declining</span>
              <span className="text-red-400">{snapshot.breadth.decliningStocks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Unchanged</span>
              <span className="text-gray-400">{snapshot.breadth.unchangedStocks}</span>
            </div>
            <div className="pt-2 border-t border-gray-600">
              <div className="flex justify-between font-medium">
                <span className="text-sm">Breadth %</span>
                <span className={snapshot.breadth.breadthPct > 50 ? 'text-green-400' : 'text-red-400'}>
                  {snapshot.breadth.breadthPct.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Options Flow */}
        <div>
          <h4 className="font-medium mb-3 text-gray-300">Options Flow</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Net Gamma</span>
              <span className={snapshot.gamma.gex > 0 ? 'text-green-400' : 'text-red-400'}>
                ${(snapshot.gamma.gex / 1e9).toFixed(1)}B
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Bias</span>
              <span className={
                snapshot.gamma.bias === 'supportive' ? 'text-green-400' : 
                snapshot.gamma.bias === 'suppressive' ? 'text-red-400' : 'text-yellow-400'
              }>
                {snapshot.gamma.bias}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Zero Gamma</span>
              <span className="text-gray-300">
                ${snapshot.gamma.zeroGammaDist?.toFixed(0) || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}