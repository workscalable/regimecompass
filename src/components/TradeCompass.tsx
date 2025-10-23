'use client';

import React, { useState, useMemo } from 'react';
import { MarketSnapshot, TradingCandidate, RegimeType } from '@/lib/types';
import { SignalTooltip } from './ui/Tooltip';
import LoadingSpinner, { CardSkeleton } from './ui/LoadingSpinner';
import ErrorBoundary from './ui/ErrorBoundary';

interface TradeCompassProps {
  snapshot?: MarketSnapshot;
  isLoading?: boolean;
  error?: Error;
  onRefresh?: () => void;
}

export default function TradeCompass({ 
  snapshot, 
  isLoading = false, 
  error, 
  onRefresh 
}: TradeCompassProps) {
  const [selectedTab, setSelectedTab] = useState<'long' | 'hedge' | 'avoid'>('long');
  const [sortBy, setSortBy] = useState<'confidence' | 'riskReward' | 'entry'>('confidence');

  // Process trading candidates
  const sortedCandidates = useMemo(() => {
    if (!snapshot?.tradingCandidates) return [];
    
    const candidates = selectedTab === 'avoid' 
      ? [] 
      : snapshot.tradingCandidates[selectedTab] || [];
    
    return [...candidates].sort((a, b) => {
      switch (sortBy) {
        case 'confidence': return b.confidence - a.confidence;
        case 'riskReward': return b.riskReward - a.riskReward;
        case 'entry': return a.entry - b.entry;
        default: return b.confidence - a.confidence;
      }
    });
  }, [snapshot?.tradingCandidates, selectedTab, sortBy]);

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
        <div className="text-red-400 text-xl font-semibold mb-2">
          Trading Signals Error
        </div>
        <p className="text-gray-400 mb-4">
          {error.message || 'Unable to generate trading signals'}
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
          <LoadingSpinner size="lg" message="Generating trading signals..." />
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
            <h2 className="text-2xl font-semibold mb-2">Trade Compass</h2>
            <p className="text-gray-400 text-sm">
              Actionable trading signals based on current market regime
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'confidence' | 'riskReward' | 'entry')}
              className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-sm"
            >
              <option value="confidence">Sort by Confidence</option>
              <option value="riskReward">Sort by Risk/Reward</option>
              <option value="entry">Sort by Entry Price</option>
            </select>
            <button
              onClick={onRefresh}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Regime-Based Trading Summary */}
        <RegimeTradingSummary 
          regime={snapshot.regime}
          longCandidates={snapshot.tradingCandidates.long}
          hedgeCandidates={snapshot.tradingCandidates.hedge}
          avoidList={snapshot.tradingCandidates.avoid}
        />

        {/* Tab Navigation */}
        <div className="flex bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setSelectedTab('long')}
            className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
              selectedTab === 'long' 
                ? 'bg-green-600 text-white' 
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Long Candidates ({snapshot.tradingCandidates.long.length})
          </button>
          <button
            onClick={() => setSelectedTab('hedge')}
            className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
              selectedTab === 'hedge' 
                ? 'bg-red-600 text-white' 
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Hedge Positions ({snapshot.tradingCandidates.hedge.length})
          </button>
          <button
            onClick={() => setSelectedTab('avoid')}
            className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
              selectedTab === 'avoid' 
                ? 'bg-yellow-600 text-white' 
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Avoid List ({snapshot.tradingCandidates.avoid.length})
          </button>
        </div>

        {/* Trading Candidates Display */}
        {selectedTab === 'avoid' ? (
          <AvoidListCard avoidList={snapshot.tradingCandidates.avoid} />
        ) : (
          <TradingCandidatesGrid 
            candidates={sortedCandidates}
            type={selectedTab}
          />
        )}

        {/* Position Sizing Guide */}
        <PositionSizingGuide 
          riskMetrics={snapshot.riskMetrics}
          regime={snapshot.regime}
          vixLevel={snapshot.vix.value}
        />
      </div>
    </ErrorBoundary>
  );
}

// Regime-based trading summary
function RegimeTradingSummary({ 
  regime, 
  longCandidates, 
  hedgeCandidates, 
  avoidList 
}: {
  regime: RegimeType;
  longCandidates: TradingCandidate[];
  hedgeCandidates: TradingCandidate[];
  avoidList: string[];
}) {
  const getRegimeStrategy = (regime: RegimeType) => {
    switch (regime) {
      case 'BULL':
        return {
          allocation: '70-80% Long, 5% Hedge',
          strategy: 'Aggressive long positioning with minimal hedging',
          focus: 'Growth sectors, momentum plays, breakout trades',
          icon: '🚀'
        };
      case 'BEAR':
        return {
          allocation: '20-30% Long, 25% Hedge',
          strategy: 'Defensive positioning with significant hedging',
          focus: 'Quality names, defensive sectors, short hedges',
          icon: '🛡️'
        };
      case 'NEUTRAL':
        return {
          allocation: '50% Long, 15% Hedge',
          strategy: 'Balanced approach with sector rotation',
          focus: 'Relative strength plays, sector rotation',
          icon: '⚖️'
        };
      default:
        return {
          allocation: '50% Long, 15% Hedge',
          strategy: 'Balanced approach',
          focus: 'Monitor for regime clarity',
          icon: '❓'
        };
    }
  };

  const strategy = getRegimeStrategy(regime);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Current Trading Strategy</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Regime Strategy */}
        <div className="text-center">
          <div className="text-4xl mb-2">{strategy.icon}</div>
          <div className="font-semibold text-lg mb-1">{regime} Regime</div>
          <div className="text-sm text-gray-400">{strategy.allocation}</div>
        </div>

        {/* Long Opportunities */}
        <div className="text-center">
          <div className="text-3xl font-bold text-green-400 mb-1">
            {longCandidates.length}
          </div>
          <div className="text-sm font-medium mb-1">Long Opportunities</div>
          <div className="text-xs text-gray-400">
            Avg Confidence: {longCandidates.length > 0 
              ? (longCandidates.reduce((sum, c) => sum + c.confidence, 0) / longCandidates.length * 100).toFixed(0) + '%'
              : 'N/A'
            }
          </div>
        </div>

        {/* Hedge Positions */}
        <div className="text-center">
          <div className="text-3xl font-bold text-red-400 mb-1">
            {hedgeCandidates.length}
          </div>
          <div className="text-sm font-medium mb-1">Hedge Options</div>
          <div className="text-xs text-gray-400">
            Avg R/R: {hedgeCandidates.length > 0 
              ? (hedgeCandidates.reduce((sum, c) => sum + c.riskReward, 0) / hedgeCandidates.length).toFixed(1)
              : 'N/A'
            }
          </div>
        </div>

        {/* Avoid List */}
        <div className="text-center">
          <div className="text-3xl font-bold text-yellow-400 mb-1">
            {avoidList.length}
          </div>
          <div className="text-sm font-medium mb-1">Sectors to Avoid</div>
          <div className="text-xs text-gray-400">Weak momentum</div>
        </div>
      </div>

      {/* Strategy Description */}
      <div className="mt-6 pt-4 border-t border-gray-600">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-300 mb-2">Strategy Focus</h4>
            <p className="text-sm text-gray-400">{strategy.strategy}</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-300 mb-2">Key Areas</h4>
            <p className="text-sm text-gray-400">{strategy.focus}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Trading candidates grid
function TradingCandidatesGrid({ 
  candidates, 
  type 
}: { 
  candidates: TradingCandidate[];
  type: 'long' | 'hedge';
}) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400 bg-green-900/20';
    if (confidence >= 0.6) return 'text-yellow-400 bg-yellow-900/20';
    return 'text-red-400 bg-red-900/20';
  };

  const getRiskRewardColor = (rr: number) => {
    if (rr >= 2) return 'text-green-400';
    if (rr >= 1.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (candidates.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 text-center">
        <div className="text-gray-400 text-lg mb-2">
          No {type} candidates available
        </div>
        <p className="text-gray-500 text-sm">
          Current market conditions don't favor {type} positions
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4 capitalize">
        {type} Trading Candidates
      </h3>
      
      <div className="space-y-4">
        {candidates.map((candidate, index) => (
          <SignalTooltip
            key={`${candidate.symbol}-${index}`}
            signal={{
              entry: candidate.entry,
              stopLoss: candidate.stopLoss,
              target: candidate.target,
              confidence: candidate.confidence,
              reasoning: candidate.reasoning
            }}
          >
            <div className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors cursor-pointer">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-lg">{candidate.symbol}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      type === 'long' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                    }`}>
                      {candidate.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{candidate.name}</p>
                  {candidate.sector && (
                    <p className="text-xs text-gray-500">{candidate.sector}</p>
                  )}
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(candidate.confidence)}`}>
                  {(candidate.confidence * 100).toFixed(0)}%
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Entry</div>
                  <div className="font-medium">${candidate.entry.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Stop Loss</div>
                  <div className="font-medium text-red-400">${candidate.stopLoss.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Target</div>
                  <div className="font-medium text-green-400">${candidate.target.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Risk/Reward</div>
                  <div className={`font-medium ${getRiskRewardColor(candidate.riskReward)}`}>
                    {candidate.riskReward.toFixed(1)}:1
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Position Size: </span>
                  <span className="font-medium">${candidate.positionSize.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400">Timeframe: </span>
                  <span className="font-medium capitalize">{candidate.timeframe}</span>
                </div>
              </div>

              {/* Key Reasoning (first 2 points) */}
              <div className="mt-3 pt-3 border-t border-gray-600">
                <div className="text-xs text-gray-400 mb-1">Key Reasons:</div>
                <div className="text-sm space-y-1">
                  {candidate.reasoning.slice(0, 2).map((reason, idx) => (
                    <div key={idx} className="text-gray-300">• {reason}</div>
                  ))}
                  {candidate.reasoning.length > 2 && (
                    <div className="text-gray-500 text-xs">
                      +{candidate.reasoning.length - 2} more reasons (hover for details)
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SignalTooltip>
        ))}
      </div>
    </div>
  );
}

// Avoid list card
function AvoidListCard({ avoidList }: { avoidList: string[] }) {
  if (avoidList.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 text-center">
        <div className="text-green-400 text-lg mb-2">
          ✅ No sectors to avoid
        </div>
        <p className="text-gray-400 text-sm">
          All sectors showing acceptable momentum
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Sectors to Avoid</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {avoidList.map((sector) => (
          <div 
            key={sector}
            className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-center"
          >
            <div className="font-semibold text-red-400 mb-1">{sector}</div>
            <div className="text-xs text-gray-400">Weak momentum</div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-600">
        <div className="text-sm text-gray-400">
          <strong>Avoid Reasoning:</strong> These sectors show trend scores ≤ -3, indicating 
          significant weakness and potential for further decline. Consider reducing exposure 
          or avoiding new positions until momentum improves.
        </div>
      </div>
    </div>
  );
}

// Position sizing guide
function PositionSizingGuide({ 
  riskMetrics, 
  regime, 
  vixLevel 
}: {
  riskMetrics: any;
  regime: RegimeType;
  vixLevel: number;
}) {
  const getPositionSizeRecommendation = (regime: RegimeType, vix: number) => {
    let baseSize = 1.0; // 1% base risk per trade
    let adjustment = 1.0;
    let reasoning = [];

    // Regime adjustment
    switch (regime) {
      case 'BULL':
        adjustment *= 1.25;
        reasoning.push('BULL regime allows 25% larger positions');
        break;
      case 'BEAR':
        adjustment *= 0.75;
        reasoning.push('BEAR regime requires 25% smaller positions');
        break;
      case 'NEUTRAL':
        reasoning.push('NEUTRAL regime maintains normal position sizing');
        break;
    }

    // VIX adjustment
    if (vix > 25) {
      const vixReduction = Math.min(0.5, (vix - 25) / 20);
      adjustment *= (1 - vixReduction);
      reasoning.push(`High VIX (${vix.toFixed(1)}) reduces position size by ${(vixReduction * 100).toFixed(0)}%`);
    } else if (vix < 15) {
      adjustment *= 1.1;
      reasoning.push(`Low VIX (${vix.toFixed(1)}) allows 10% larger positions`);
    }

    const finalSize = baseSize * adjustment;
    
    return {
      recommendedSize: finalSize,
      maxPosition: Math.min(finalSize * 2, 0.1), // Max 10% per position
      reasoning
    };
  };

  const sizing = getPositionSizeRecommendation(regime, vixLevel);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Position Sizing Guide</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Recommended Size */}
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-400 mb-2">
            {(sizing.recommendedSize * 100).toFixed(1)}%
          </div>
          <div className="text-sm font-medium mb-1">Recommended Risk</div>
          <div className="text-xs text-gray-400">Per trade</div>
        </div>

        {/* Maximum Position */}
        <div className="text-center">
          <div className="text-3xl font-bold text-yellow-400 mb-2">
            {(sizing.maxPosition * 100).toFixed(1)}%
          </div>
          <div className="text-sm font-medium mb-1">Maximum Position</div>
          <div className="text-xs text-gray-400">Single holding</div>
        </div>

        {/* Current VIX Impact */}
        <div className="text-center">
          <div className={`text-3xl font-bold mb-2 ${
            vixLevel < 20 ? 'text-green-400' : vixLevel > 25 ? 'text-red-400' : 'text-yellow-400'
          }`}>
            {vixLevel.toFixed(1)}
          </div>
          <div className="text-sm font-medium mb-1">VIX Level</div>
          <div className="text-xs text-gray-400">
            {vixLevel < 20 ? 'Low volatility' : vixLevel > 25 ? 'High volatility' : 'Normal volatility'}
          </div>
        </div>
      </div>

      {/* Sizing Reasoning */}
      <div className="mt-6 pt-4 border-t border-gray-600">
        <h4 className="font-medium text-gray-300 mb-2">Sizing Factors</h4>
        <div className="space-y-1">
          {sizing.reasoning.map((reason, index) => (
            <div key={index} className="text-sm text-gray-400">
              • {reason}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Reference */}
      <div className="mt-4 pt-4 border-t border-gray-600">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Stop Loss Distance: </span>
            <span className="font-medium">2x ATR</span>
          </div>
          <div>
            <span className="text-gray-400">Target Distance: </span>
            <span className="font-medium">1.5x ATR</span>
          </div>
        </div>
      </div>
    </div>
  );
}