'use client';

import React, { useState, useMemo } from 'react';
import { MarketSnapshot, SectorData, SectorRecommendations, SectorAllocation } from '@/lib/types';
import { RegimeTooltip } from './ui/Tooltip';
import LoadingSpinner, { HeatmapSkeleton } from './ui/LoadingSpinner';
import ErrorBoundary from './ui/ErrorBoundary';

interface SectorHeatmapProps {
  snapshot?: MarketSnapshot;
  isLoading?: boolean;
  error?: Error;
  onRefresh?: () => void;
}

interface SectorTileData {
  symbol: string;
  name: string;
  score: number;
  change: number;
  recommendation: string;
  weight?: number;
  volume: number;
  relativeStrength: number;
}

export default function SectorHeatmap({ 
  snapshot, 
  isLoading = false, 
  error, 
  onRefresh 
}: SectorHeatmapProps) {
  const [sortBy, setSortBy] = useState<'score' | 'change' | 'strength'>('score');
  const [viewMode, setViewMode] = useState<'heatmap' | 'list'>('heatmap');

  // Process sector data for visualization
  const sectorTiles = useMemo(() => {
    if (!snapshot?.sectors) return [];
    
    return Object.entries(snapshot.sectors).map(([symbol, data]): SectorTileData => ({
      symbol,
      name: data.name,
      score: data.trendScore9,
      change: data.changePercent,
      recommendation: data.recommendation,
      weight: data.weight,
      volume: data.volume,
      relativeStrength: data.relativeStrength
    })).sort((a, b) => {
      switch (sortBy) {
        case 'score': return b.score - a.score;
        case 'change': return b.change - a.change;
        case 'strength': return b.relativeStrength - a.relativeStrength;
        default: return b.score - a.score;
      }
    });
  }, [snapshot?.sectors, sortBy]);

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
        <div className="text-red-400 text-xl font-semibold mb-2">
          Sector Analysis Error
        </div>
        <p className="text-gray-400 mb-4">
          {error.message || 'Unable to load sector data'}
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
          <LoadingSpinner size="lg" message="Loading sector analysis..." />
        </div>
        <HeatmapSkeleton />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header with Controls */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Sector Analysis Heatmap</h2>
            <p className="text-gray-400 text-sm">
              9-day trend scores and sector rotation recommendations
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('heatmap')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  viewMode === 'heatmap' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Heatmap
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                List
              </button>
            </div>

            {/* Sort Controls */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'score' | 'change' | 'strength')}
              className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-sm"
            >
              <option value="score">Sort by Trend Score</option>
              <option value="change">Sort by % Change</option>
              <option value="strength">Sort by Rel. Strength</option>
            </select>

            <button
              onClick={onRefresh}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Sector Recommendations Summary */}
        <SectorRecommendationsCard 
          recommendations={snapshot.sectorAnalysis.recommendations}
          allocation={snapshot.sectorAnalysis.allocation}
        />

        {/* Main Heatmap/List View */}
        {viewMode === 'heatmap' ? (
          <SectorHeatmapGrid sectorTiles={sectorTiles} />
        ) : (
          <SectorListView sectorTiles={sectorTiles} />
        )}

        {/* Sector Rotation Analysis */}
        <SectorRotationCard 
          recommendations={snapshot.sectorAnalysis.recommendations}
          currentRegime={snapshot.regime}
        />
      </div>
    </ErrorBoundary>
  );
}

// Sector recommendations summary card
function SectorRecommendationsCard({ 
  recommendations, 
  allocation 
}: { 
  recommendations: SectorRecommendations;
  allocation: SectorAllocation[];
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Sector Allocation Recommendations</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overweight Sectors */}
        <div>
          <h4 className="font-medium mb-3 text-green-400">Overweight (Top 3)</h4>
          <div className="space-y-2">
            {recommendations.overweight.map((sector, index) => (
              <div key={sector} className="flex items-center justify-between bg-green-900/20 rounded p-2">
                <span className="text-sm font-medium">{sector}</span>
                <span className="text-xs text-green-400">#{index + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Underweight Sectors */}
        <div>
          <h4 className="font-medium mb-3 text-red-400">Underweight/Avoid</h4>
          <div className="space-y-2">
            {recommendations.underweight.map((sector) => (
              <div key={sector} className="flex items-center justify-between bg-red-900/20 rounded p-2">
                <span className="text-sm font-medium">{sector}</span>
                <span className="text-xs text-red-400">Avoid</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rotation Signal */}
        <div>
          <h4 className="font-medium mb-3 text-gray-300">Rotation Signal</h4>
          <div className={`rounded-lg p-4 text-center ${
            recommendations.rotationSignal === 'into_growth' ? 'bg-blue-900/20 text-blue-400' :
            recommendations.rotationSignal === 'into_value' ? 'bg-purple-900/20 text-purple-400' :
            recommendations.rotationSignal === 'into_defensive' ? 'bg-yellow-900/20 text-yellow-400' :
            'bg-gray-900/20 text-gray-400'
          }`}>
            <div className="text-2xl mb-2">
              {recommendations.rotationSignal === 'into_growth' && '🚀'}
              {recommendations.rotationSignal === 'into_value' && '💎'}
              {recommendations.rotationSignal === 'into_defensive' && '🛡️'}
              {recommendations.rotationSignal === 'mixed' && '🔄'}
            </div>
            <div className="font-semibold capitalize">
              {recommendations.rotationSignal.replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Heatmap grid visualization
function SectorHeatmapGrid({ sectorTiles }: { sectorTiles: SectorTileData[] }) {
  const getScoreColor = (score: number) => {
    if (score >= 5) return 'bg-green-600 text-white';
    if (score >= 3) return 'bg-green-500 text-white';
    if (score >= 1) return 'bg-green-400 text-gray-900';
    if (score >= -1) return 'bg-yellow-400 text-gray-900';
    if (score >= -3) return 'bg-orange-500 text-white';
    return 'bg-red-600 text-white';
  };

  const getScoreIntensity = (score: number) => {
    const intensity = Math.min(Math.abs(score) / 9, 1);
    return intensity;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Sector Performance Heatmap</h3>
      
      {/* Legend */}
      <div className="flex items-center justify-center space-x-4 mb-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-600 rounded"></div>
          <span>Strong (≥5)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-400 rounded"></div>
          <span>Good (1-4)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-yellow-400 rounded"></div>
          <span>Neutral (-1 to 1)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-orange-500 rounded"></div>
          <span>Weak (-3 to -1)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-600 rounded"></div>
          <span>Very Weak (≤-3)</span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {sectorTiles.map((sector) => (
          <RegimeTooltip
            key={sector.symbol}
            regime={`${sector.name} Analysis`}
            factors={{
              breadth: sector.score > 0,
              emaAlignment: sector.change > 0,
              trendScore: sector.relativeStrength > 1,
              volatility: true,
              gamma: sector.recommendation === 'BUY'
            }}
          >
            <div
              className={`
                relative rounded-lg p-4 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg
                ${getScoreColor(sector.score)}
              `}
              style={{
                opacity: 0.7 + (getScoreIntensity(sector.score) * 0.3)
              }}
            >
              {/* Sector Symbol */}
              <div className="font-bold text-lg mb-1">{sector.symbol}</div>
              
              {/* Trend Score */}
              <div className="text-2xl font-bold mb-1">
                {sector.score > 0 ? '+' : ''}{sector.score.toFixed(0)}
              </div>
              
              {/* Change Percentage */}
              <div className="text-sm opacity-90">
                {sector.change > 0 ? '+' : ''}{sector.change.toFixed(1)}%
              </div>
              
              {/* Recommendation Badge */}
              <div className="absolute top-1 right-1">
                {sector.recommendation === 'BUY' && (
                  <div className="w-3 h-3 bg-white rounded-full opacity-80"></div>
                )}
                {sector.recommendation === 'SELL' && (
                  <div className="w-3 h-3 bg-black rounded-full opacity-80"></div>
                )}
              </div>
            </div>
          </RegimeTooltip>
        ))}
      </div>
    </div>
  );
}

// List view for detailed sector analysis
function SectorListView({ sectorTiles }: { sectorTiles: SectorTileData[] }) {
  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'BUY': return 'text-green-400 bg-green-900/20';
      case 'SELL': return 'text-red-400 bg-red-900/20';
      case 'HOLD': return 'text-yellow-400 bg-yellow-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 3) return 'text-green-400';
    if (score >= 0) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Detailed Sector Analysis</h3>
      
      {/* Table Header */}
      <div className="grid grid-cols-7 gap-4 pb-3 border-b border-gray-600 text-sm font-medium text-gray-400">
        <div>Sector</div>
        <div className="text-center">Trend Score</div>
        <div className="text-center">% Change</div>
        <div className="text-center">Rel. Strength</div>
        <div className="text-center">Volume</div>
        <div className="text-center">Recommendation</div>
        <div className="text-center">Weight</div>
      </div>

      {/* Sector Rows */}
      <div className="space-y-2 mt-4">
        {sectorTiles.map((sector, index) => (
          <div 
            key={sector.symbol}
            className="grid grid-cols-7 gap-4 py-3 px-2 rounded hover:bg-gray-700/50 transition-colors"
          >
            {/* Sector Info */}
            <div>
              <div className="font-medium">{sector.symbol}</div>
              <div className="text-xs text-gray-400 truncate">{sector.name}</div>
            </div>

            {/* Trend Score */}
            <div className={`text-center font-bold ${getScoreColor(sector.score)}`}>
              {sector.score > 0 ? '+' : ''}{sector.score.toFixed(1)}
            </div>

            {/* % Change */}
            <div className={`text-center ${sector.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {sector.change > 0 ? '+' : ''}{sector.change.toFixed(1)}%
            </div>

            {/* Relative Strength */}
            <div className={`text-center ${sector.relativeStrength >= 1 ? 'text-green-400' : 'text-red-400'}`}>
              {sector.relativeStrength.toFixed(2)}
            </div>

            {/* Volume */}
            <div className="text-center text-sm">
              {(sector.volume / 1e6).toFixed(1)}M
            </div>

            {/* Recommendation */}
            <div className="text-center">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getRecommendationColor(sector.recommendation)}`}>
                {sector.recommendation}
              </span>
            </div>

            {/* Weight */}
            <div className="text-center text-sm">
              {sector.weight ? `${(sector.weight * 100).toFixed(1)}%` : 'N/A'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Sector rotation analysis card
function SectorRotationCard({ 
  recommendations, 
  currentRegime 
}: { 
  recommendations: SectorRecommendations;
  currentRegime: string;
}) {
  const getRotationInsights = (signal: string, regime: string) => {
    const insights = [];
    
    if (signal === 'into_growth' && regime === 'BULL') {
      insights.push('✅ Growth rotation aligns with BULL regime');
      insights.push('📈 Technology and Consumer Discretionary favored');
      insights.push('⚡ High beta sectors showing strength');
    } else if (signal === 'into_value' && regime === 'BEAR') {
      insights.push('✅ Value rotation provides defensive positioning');
      insights.push('🛡️ Financials and Energy showing resilience');
      insights.push('💰 Dividend-paying sectors preferred');
    } else if (signal === 'into_defensive') {
      insights.push('⚠️ Defensive rotation suggests caution');
      insights.push('🏥 Healthcare and Utilities gaining favor');
      insights.push('🛡️ Risk-off sentiment increasing');
    } else if (signal === 'mixed') {
      insights.push('🔄 Mixed signals - no clear rotation trend');
      insights.push('⚖️ Balanced approach recommended');
      insights.push('👀 Monitor for clearer directional signals');
    }
    
    return insights;
  };

  const rotationInsights = getRotationInsights(recommendations.rotationSignal, currentRegime);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Sector Rotation Analysis</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Rotation Status */}
        <div>
          <h4 className="font-medium mb-3 text-gray-300">Current Rotation Signal</h4>
          <div className={`rounded-lg p-4 ${
            recommendations.rotationSignal === 'into_growth' ? 'bg-blue-900/20 border border-blue-500/30' :
            recommendations.rotationSignal === 'into_value' ? 'bg-purple-900/20 border border-purple-500/30' :
            recommendations.rotationSignal === 'into_defensive' ? 'bg-yellow-900/20 border border-yellow-500/30' :
            'bg-gray-900/20 border border-gray-500/30'
          }`}>
            <div className="text-lg font-semibold capitalize mb-2">
              {recommendations.rotationSignal.replace('_', ' ')}
            </div>
            <div className="text-sm opacity-80">
              Regime: <span className="font-medium">{currentRegime}</span>
            </div>
          </div>
        </div>

        {/* Rotation Insights */}
        <div>
          <h4 className="font-medium mb-3 text-gray-300">Key Insights</h4>
          <div className="space-y-2">
            {rotationInsights.map((insight, index) => (
              <div key={index} className="text-sm text-gray-300 flex items-start space-x-2">
                <span className="flex-shrink-0">{insight.split(' ')[0]}</span>
                <span>{insight.substring(insight.indexOf(' ') + 1)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sector Performance Summary */}
      <div className="mt-6 pt-4 border-t border-gray-600">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-400">
              {recommendations.overweight.length}
            </div>
            <div className="text-sm text-gray-400">Strong Sectors</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-400">
              {recommendations.neutral.length}
            </div>
            <div className="text-sm text-gray-400">Neutral Sectors</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-400">
              {recommendations.underweight.length}
            </div>
            <div className="text-sm text-gray-400">Weak Sectors</div>
          </div>
        </div>
      </div>
    </div>
  );
}