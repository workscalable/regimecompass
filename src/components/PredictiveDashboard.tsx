'use client';

import React, { useState } from 'react';
import { MarketSnapshot, PredictiveSignals, MomentumDivergence, VolumeAnalysis, OptionsFlow, RegimeProbability } from '@/lib/types';
import { SignalTooltip } from './ui/Tooltip';
import LoadingSpinner, { CardSkeleton } from './ui/LoadingSpinner';
import ErrorBoundary from './ui/ErrorBoundary';

interface PredictiveDashboardProps {
  snapshot?: MarketSnapshot;
  isLoading?: boolean;
  error?: Error;
  onRefresh?: () => void;
}

export default function PredictiveDashboard({ 
  snapshot, 
  isLoading = false, 
  error, 
  onRefresh 
}: PredictiveDashboardProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'short' | 'medium' | 'long'>('medium');

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
        <div className="text-red-400 text-xl font-semibold mb-2">
          Predictive Analysis Error
        </div>
        <p className="text-gray-400 mb-4">
          {error.message || 'Unable to generate predictive signals'}
        </p>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white transition-colors"
        >
          Retry Analysis
        </button>
      </div>
    );
  }

  if (isLoading || !snapshot) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <LoadingSpinner size="lg" message="Generating predictive analysis..." />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const predictiveSignals = snapshot.predictiveSignals;

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header with Timeframe Selection */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Predictive Analysis Dashboard</h2>
            <p className="text-gray-400 text-sm">
              Forward-looking signals and regime probability forecasts
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">Timeframe:</span>
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as 'short' | 'medium' | 'long')}
              className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-sm"
            >
              <option value="short">Short (1-3 days)</option>
              <option value="medium">Medium (1-2 weeks)</option>
              <option value="long">Long (2-4 weeks)</option>
            </select>
            <button
              onClick={onRefresh}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Regime Probability Forecast */}
        <RegimeProbabilityCard 
          regimeProbability={predictiveSignals.regimeProbability}
          currentRegime={snapshot.regime}
          timeframe={selectedTimeframe}
        />

        {/* Predictive Signals Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Momentum Divergence Analysis */}
          <MomentumDivergenceCard 
            divergence={predictiveSignals.momentumDivergence}
            timeframe={selectedTimeframe}
          />

          {/* Volume Analysis */}
          <VolumeAnalysisCard 
            volumeAnalysis={predictiveSignals.volumeAnalysis}
          />
        </div>

        {/* Options Flow Analysis */}
        <OptionsFlowCard 
          optionsFlow={predictiveSignals.optionsFlow}
        />

        {/* Forward Guidance */}
        <ForwardGuidanceCard 
          forwardLooking={snapshot.forwardLooking}
          projectedLevels={predictiveSignals.projectedLevels}
        />
      </div>
    </ErrorBoundary>
  );
}

// Regime probability forecast component
function RegimeProbabilityCard({ 
  regimeProbability, 
  currentRegime, 
  timeframe 
}: { 
  regimeProbability: RegimeProbability;
  currentRegime: string;
  timeframe: string;
}) {
  const probabilities = timeframe === 'short' ? regimeProbability.nextWeek : regimeProbability.nextMonth;
  const timeLabel = timeframe === 'short' ? 'Next Week' : 'Next Month';

  const getRegimeColor = (regime: string) => {
    switch (regime) {
      case 'BULL': return 'text-green-400 bg-green-900/20';
      case 'BEAR': return 'text-red-400 bg-red-900/20';
      case 'NEUTRAL': return 'text-yellow-400 bg-yellow-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const maxProb = Math.max(probabilities.BULL, probabilities.BEAR, probabilities.NEUTRAL);
  const likelyRegime = Object.entries(probabilities).find(([_, prob]) => prob === maxProb)?.[0];

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Regime Probability Forecast</h3>
        <div className="text-sm text-gray-400">
          Current: <span className={getRegimeColor(currentRegime).split(' ')[0]}>{currentRegime}</span>
        </div>
      </div>
      
      <div className="mb-4">
        <h4 className="text-md font-medium mb-3">{timeLabel} Probabilities</h4>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(probabilities).map(([regime, probability]) => (
            <div key={regime} className={`rounded-lg p-4 text-center ${getRegimeColor(regime)}`}>
              <div className="text-2xl font-bold mb-1">
                {(probability * 100).toFixed(0)}%
              </div>
              <div className="text-sm opacity-80">{regime}</div>
              {regime === likelyRegime && (
                <div className="text-xs mt-1 opacity-60">Most Likely</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Probability Change Indicators */}
      <div className="border-t border-gray-600 pt-4">
        <div className="text-sm text-gray-400 mb-2">Key Insights:</div>
        <div className="space-y-1 text-sm">
          {likelyRegime !== currentRegime && (
            <div className="text-yellow-400">
              📈 Regime change likely: {currentRegime} → {likelyRegime}
            </div>
          )}
          {maxProb > 0.6 && (
            <div className="text-green-400">
              ✓ High confidence forecast ({(maxProb * 100).toFixed(0)}%)
            </div>
          )}
          {maxProb < 0.4 && (
            <div className="text-yellow-400">
              ⚠️ Uncertain outlook - mixed signals
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Momentum divergence analysis component
function MomentumDivergenceCard({ 
  divergence, 
  timeframe 
}: { 
  divergence: MomentumDivergence;
  timeframe: string;
}) {
  const getDivergenceColor = (type: string) => {
    switch (type) {
      case 'bullish': return 'text-green-400 bg-green-900/20 border-green-500/30';
      case 'bearish': return 'text-red-400 bg-red-900/20 border-red-500/30';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-500/30';
    }
  };

  const getDivergenceIcon = (type: string) => {
    switch (type) {
      case 'bullish': return '📈';
      case 'bearish': return '📉';
      default: return '➡️';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Momentum Divergence Analysis</h3>
      
      {/* Main Divergence Signal */}
      <div className={`rounded-lg p-4 mb-4 border ${getDivergenceColor(divergence.type)}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{getDivergenceIcon(divergence.type)}</span>
            <span className="font-semibold capitalize">{divergence.type} Divergence</span>
          </div>
          <div className="text-sm">
            Strength: {(divergence.strength * 100).toFixed(0)}%
          </div>
        </div>
        <div className="text-sm opacity-80">
          Timeframe: {divergence.timeframe}
        </div>
      </div>

      {/* Divergence Details */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">RSI Divergence</span>
            <span className={divergence.rsiDivergence ? 'text-green-400' : 'text-gray-500'}>
              {divergence.rsiDivergence ? '✓' : '✗'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">MACD Divergence</span>
            <span className={divergence.macdDivergence ? 'text-green-400' : 'text-gray-500'}>
              {divergence.macdDivergence ? '✓' : '✗'}
            </span>
          </div>
        </div>
        
        {divergence.hiddenDivergence && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3">
            <div className="text-blue-400 text-sm font-medium">
              🔍 Hidden Divergence Detected
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Suggests trend continuation rather than reversal
            </div>
          </div>
        )}

        {/* Signal Interpretation */}
        <div className="border-t border-gray-600 pt-3">
          <div className="text-sm text-gray-400 mb-2">Interpretation:</div>
          <div className="text-sm">
            {divergence.type === 'bullish' && (
              <span className="text-green-400">
                Price may be forming a bottom. Watch for upward momentum confirmation.
              </span>
            )}
            {divergence.type === 'bearish' && (
              <span className="text-red-400">
                Price may be forming a top. Watch for downward momentum confirmation.
              </span>
            )}
            {divergence.type === 'none' && (
              <span className="text-gray-400">
                No significant divergence detected. Momentum aligned with price action.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Volume analysis component
function VolumeAnalysisCard({ volumeAnalysis }: { volumeAnalysis: VolumeAnalysis }) {
  const getThrustColor = (thrust: string) => {
    switch (thrust) {
      case 'up': return 'text-green-400';
      case 'down': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getThrustIcon = (thrust: string) => {
    switch (thrust) {
      case 'up': return '🚀';
      case 'down': return '📉';
      default: return '➡️';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Volume Analysis</h3>
      
      {/* Volume Confirmation Status */}
      <div className={`rounded-lg p-4 mb-4 border ${
        volumeAnalysis.confirmation 
          ? 'text-green-400 bg-green-900/20 border-green-500/30'
          : 'text-red-400 bg-red-900/20 border-red-500/30'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">{volumeAnalysis.confirmation ? '✅' : '❌'}</span>
            <span className="font-semibold">
              Volume {volumeAnalysis.confirmation ? 'Confirms' : 'Diverges'}
            </span>
          </div>
          <div className="text-sm">
            Ratio: {volumeAnalysis.volumeRatio.toFixed(1)}x
          </div>
        </div>
      </div>

      {/* Volume Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className={`text-2xl mb-1 ${getThrustColor(volumeAnalysis.thrust)}`}>
            {getThrustIcon(volumeAnalysis.thrust)}
          </div>
          <div className="text-sm text-gray-400">Volume Thrust</div>
          <div className="font-medium capitalize">{volumeAnalysis.thrust}</div>
        </div>
        
        <div className="text-center">
          <div className={`text-2xl mb-1 ${volumeAnalysis.exhaustion ? 'text-yellow-400' : 'text-gray-400'}`}>
            {volumeAnalysis.exhaustion ? '⚠️' : '✅'}
          </div>
          <div className="text-sm text-gray-400">Exhaustion</div>
          <div className="font-medium">{volumeAnalysis.exhaustion ? 'Detected' : 'None'}</div>
        </div>
      </div>

      {/* Additional Volume Indicators */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Volume Spike</span>
          <span className={volumeAnalysis.volumeSpike ? 'text-green-400' : 'text-gray-500'}>
            {volumeAnalysis.volumeSpike ? 'Yes' : 'No'}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">A/D Line</span>
          <span className={volumeAnalysis.accumulationDistribution > 0 ? 'text-green-400' : 'text-red-400'}>
            {volumeAnalysis.accumulationDistribution > 0 ? 'Accumulation' : 'Distribution'}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Volume Trend</span>
          <span className={
            volumeAnalysis.trend === 'increasing' ? 'text-green-400' : 
            volumeAnalysis.trend === 'decreasing' ? 'text-red-400' : 'text-yellow-400'
          }>
            {volumeAnalysis.trend}
          </span>
        </div>
      </div>

      {/* Volume Interpretation */}
      <div className="border-t border-gray-600 pt-3 mt-4">
        <div className="text-sm text-gray-400 mb-2">Key Insights:</div>
        <div className="text-sm space-y-1">
          {volumeAnalysis.confirmation && (
            <div className="text-green-400">✓ Volume supports current price action</div>
          )}
          {volumeAnalysis.volumeSpike && (
            <div className="text-blue-400">📊 Unusual volume activity detected</div>
          )}
          {volumeAnalysis.exhaustion && (
            <div className="text-yellow-400">⚠️ Potential trend exhaustion signal</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Options flow analysis component
function OptionsFlowCard({ optionsFlow }: { optionsFlow: OptionsFlow }) {
  const getBiasColor = (bias: string) => {
    switch (bias) {
      case 'bullish': return 'text-green-400 bg-green-900/20';
      case 'bearish': return 'text-red-400 bg-red-900/20';
      default: return 'text-yellow-400 bg-yellow-900/20';
    }
  };

  const getBiasIcon = (bias: string) => {
    switch (bias) {
      case 'bullish': return '🐂';
      case 'bearish': return '🐻';
      default: return '🦘';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Options Flow Analysis</h3>
      
      {/* Current Bias */}
      <div className={`rounded-lg p-4 mb-4 ${getBiasColor(optionsFlow.bias)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{getBiasIcon(optionsFlow.bias)}</span>
            <span className="font-semibold capitalize">{optionsFlow.bias} Bias</span>
          </div>
          <div className="text-sm">
            Confidence: {(optionsFlow.confidence * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Options Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-lg font-bold text-green-400">
            {(optionsFlow.callVolume / 1000).toFixed(0)}K
          </div>
          <div className="text-xs text-gray-400">Call Volume</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-bold text-red-400">
            {(optionsFlow.putVolume / 1000).toFixed(0)}K
          </div>
          <div className="text-xs text-gray-400">Put Volume</div>
        </div>
        
        <div className="text-center">
          <div className={`text-lg font-bold ${
            optionsFlow.putCallRatio > 1 ? 'text-red-400' : 'text-green-400'
          }`}>
            {optionsFlow.putCallRatio.toFixed(2)}
          </div>
          <div className="text-xs text-gray-400">P/C Ratio</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-bold text-blue-400">
            {optionsFlow.largeBlockTrades}
          </div>
          <div className="text-xs text-gray-400">Block Trades</div>
        </div>
      </div>

      {/* Forward Bias and Unusual Activity */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className={`rounded p-3 text-center ${getBiasColor(optionsFlow.forwardBias)}`}>
          <div className="font-medium">Forward Bias</div>
          <div className="text-sm capitalize">{optionsFlow.forwardBias}</div>
        </div>
        
        <div className={`rounded p-3 text-center ${
          optionsFlow.unusualActivity 
            ? 'text-orange-400 bg-orange-900/20' 
            : 'text-gray-400 bg-gray-900/20'
        }`}>
          <div className="font-medium">Unusual Activity</div>
          <div className="text-sm">{optionsFlow.unusualActivity ? 'Detected' : 'Normal'}</div>
        </div>
      </div>

      {/* IV Trend */}
      <div className="border-t border-gray-600 pt-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Implied Volatility</span>
          <span className={
            optionsFlow.impliedVolatilityTrend === 'rising' ? 'text-red-400' : 
            optionsFlow.impliedVolatilityTrend === 'falling' ? 'text-green-400' : 'text-yellow-400'
          }>
            {optionsFlow.impliedVolatilityTrend}
          </span>
        </div>
      </div>
    </div>
  );
}

// Forward guidance component
function ForwardGuidanceCard({ 
  forwardLooking, 
  projectedLevels 
}: { 
  forwardLooking: any;
  projectedLevels: any;
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Forward Guidance</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expected Levels */}
        <div>
          <h4 className="font-medium mb-3 text-gray-300">Key Levels to Watch</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Expected Move</span>
              <span className="text-white">±{projectedLevels?.expectedMove?.toFixed(0) || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Upside Target</span>
              <span className="text-green-400">{projectedLevels?.projectedUpside?.toFixed(0) || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Downside Target</span>
              <span className="text-red-400">{projectedLevels?.projectedDownside?.toFixed(0) || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Recommended Action */}
        <div>
          <h4 className="font-medium mb-3 text-gray-300">Recommended Action</h4>
          <div className={`rounded p-3 text-center ${
            forwardLooking?.recommendedAction === 'aggressive' ? 'text-green-400 bg-green-900/20' :
            forwardLooking?.recommendedAction === 'cautious' ? 'text-yellow-400 bg-yellow-900/20' :
            forwardLooking?.recommendedAction === 'hedge' ? 'text-red-400 bg-red-900/20' :
            'text-gray-400 bg-gray-900/20'
          }`}>
            <div className="font-semibold capitalize">
              {forwardLooking?.recommendedAction || 'Wait'}
            </div>
            <div className="text-sm mt-1">
              {forwardLooking?.expectedChangeTimeframe || 'Monitor market'}
            </div>
          </div>
        </div>
      </div>

      {/* Catalysts */}
      {forwardLooking?.catalysts && forwardLooking.catalysts.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-600">
          <h4 className="font-medium mb-2 text-gray-300">Key Catalysts</h4>
          <div className="space-y-1">
            {forwardLooking.catalysts.map((catalyst: string, index: number) => (
              <div key={index} className="text-sm text-gray-400">
                • {catalyst}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}