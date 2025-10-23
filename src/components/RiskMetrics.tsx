'use client';

import React, { useState, useMemo } from 'react';
import { MarketSnapshot, RiskMetrics as RiskMetricsType, RegimeType } from '@/lib/types';
import LoadingSpinner, { CardSkeleton } from './ui/LoadingSpinner';
import ErrorBoundary from './ui/ErrorBoundary';

interface RiskMetricsProps {
  snapshot?: MarketSnapshot;
  isLoading?: boolean;
  error?: Error;
  onRefresh?: () => void;
}

interface PositionSizingCalculation {
  accountSize: number;
  riskPerTrade: number;
  stopLossDistance: number;
  positionSize: number;
  dollarRisk: number;
}

export default function RiskMetrics({ 
  snapshot, 
  isLoading = false, 
  error, 
  onRefresh 
}: RiskMetricsProps) {
  const [accountSize, setAccountSize] = useState<number>(100000);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('SPY');
  const [customStopDistance, setCustomStopDistance] = useState<number | null>(null);

  // Calculate position sizing for selected symbol
  const positionCalculation = useMemo((): PositionSizingCalculation | null => {
    if (!snapshot?.riskMetrics) return null;

    const riskPerTrade = accountSize * snapshot.riskMetrics.positionSizeFactor;
    const stopLossDistance = customStopDistance || (snapshot.indexes[selectedSymbol]?.atr14 * 2) || 10;
    const positionSize = Math.floor(riskPerTrade / stopLossDistance);
    const dollarRisk = positionSize * stopLossDistance;

    return {
      accountSize,
      riskPerTrade: snapshot.riskMetrics.positionSizeFactor,
      stopLossDistance,
      positionSize,
      dollarRisk
    };
  }, [snapshot, accountSize, selectedSymbol, customStopDistance]);

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
        <div className="text-red-400 text-xl font-semibold mb-2">
          Risk Metrics Error
        </div>
        <p className="text-gray-400 mb-4">
          {error.message || 'Unable to calculate risk metrics'}
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
          <LoadingSpinner size="lg" message="Calculating risk metrics..." />
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
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Risk Management Dashboard</h2>
            <p className="text-gray-400 text-sm">
              Position sizing, stop losses, and volatility adjustments
            </p>
          </div>
          <button
            onClick={onRefresh}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Risk Overview Cards */}
        <RiskOverviewCards 
          riskMetrics={snapshot.riskMetrics}
          regime={snapshot.regime}
          vixLevel={snapshot.vix.value}
        />

        {/* Position Sizing Calculator */}
        <PositionSizingCalculator
          calculation={positionCalculation}
          accountSize={accountSize}
          setAccountSize={setAccountSize}
          selectedSymbol={selectedSymbol}
          setSelectedSymbol={setSelectedSymbol}
          customStopDistance={customStopDistance}
          setCustomStopDistance={setCustomStopDistance}
          availableSymbols={Object.keys(snapshot.indexes)}
          snapshot={snapshot}
        />

        {/* Stop Loss Visualization */}
        <StopLossVisualization 
          indexes={snapshot.indexes}
          riskMetrics={snapshot.riskMetrics}
        />

        {/* Volatility Adjustments */}
        <VolatilityAdjustments 
          riskMetrics={snapshot.riskMetrics}
          vixLevel={snapshot.vix.value}
          regime={snapshot.regime}
        />
      </div>
    </ErrorBoundary>
  );
}

// Risk overview cards
function RiskOverviewCards({ 
  riskMetrics, 
  regime, 
  vixLevel 
}: {
  riskMetrics: RiskMetricsType;
  regime: RegimeType;
  vixLevel: number;
}) {
  const getRiskLevel = (value: number, thresholds: [number, number]) => {
    if (value <= thresholds[0]) return { level: 'low', color: 'text-green-400' };
    if (value <= thresholds[1]) return { level: 'medium', color: 'text-yellow-400' };
    return { level: 'high', color: 'text-red-400' };
  };

  const portfolioHeatRisk = getRiskLevel(riskMetrics.portfolioHeat, [0.1, 0.2]);
  const volatilityRisk = getRiskLevel(riskMetrics.volatilityAdjustment, [0.8, 1.2]);
  const correlationRisk = getRiskLevel(riskMetrics.correlationRisk, [0.3, 0.6]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Portfolio Heat */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex justify-between items-start mb-2">
          <h4 className="text-sm font-medium text-gray-300">Portfolio Heat</h4>
          <span className={`text-lg ${portfolioHeatRisk.color}`}>
            {portfolioHeatRisk.level === 'low' ? '🟢' : portfolioHeatRisk.level === 'medium' ? '🟡' : '🔴'}
          </span>
        </div>
        <div className="text-2xl font-bold mb-1">
          {(riskMetrics.portfolioHeat * 100).toFixed(1)}%
        </div>
        <p className="text-sm text-gray-400">Total risk exposure</p>
      </div>

      {/* Max Drawdown */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex justify-between items-start mb-2">
          <h4 className="text-sm font-medium text-gray-300">Max Drawdown</h4>
          <span className="text-lg">📉</span>
        </div>
        <div className="text-2xl font-bold mb-1">
          {(riskMetrics.maxDrawdown * 100).toFixed(1)}%
        </div>
        <p className="text-sm text-gray-400">Risk limit</p>
      </div>

      {/* VIX Adjustment */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex justify-between items-start mb-2">
          <h4 className="text-sm font-medium text-gray-300">VIX Adjustment</h4>
          <span className={`text-lg ${vixLevel > 25 ? '🔴' : vixLevel < 15 ? '🟢' : '🟡'}`}>
            {vixLevel > 25 ? '⚠️' : '📊'}
          </span>
        </div>
        <div className="text-2xl font-bold mb-1">
          {(riskMetrics.vixAdjustment * 100).toFixed(0)}%
        </div>
        <p className="text-sm text-gray-400">Size adjustment</p>
      </div>

      {/* Correlation Risk */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex justify-between items-start mb-2">
          <h4 className="text-sm font-medium text-gray-300">Correlation Risk</h4>
          <span className={`text-lg ${correlationRisk.color}`}>
            {correlationRisk.level === 'low' ? '🟢' : correlationRisk.level === 'medium' ? '🟡' : '🔴'}
          </span>
        </div>
        <div className="text-2xl font-bold mb-1">
          {(riskMetrics.correlationRisk * 100).toFixed(0)}%
        </div>
        <p className="text-sm text-gray-400">Concentration risk</p>
      </div>
    </div>
  );
}

// Position sizing calculator
function PositionSizingCalculator({
  calculation,
  accountSize,
  setAccountSize,
  selectedSymbol,
  setSelectedSymbol,
  customStopDistance,
  setCustomStopDistance,
  availableSymbols,
  snapshot
}: {
  calculation: PositionSizingCalculation | null;
  accountSize: number;
  setAccountSize: (size: number) => void;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  customStopDistance: number | null;
  setCustomStopDistance: (distance: number | null) => void;
  availableSymbols: string[];
  snapshot: MarketSnapshot;
}) {
  const currentPrice = snapshot.indexes[selectedSymbol]?.price || 0;
  const atr = snapshot.indexes[selectedSymbol]?.atr14 || 0;
  const suggestedStop = atr * 2;

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Position Sizing Calculator</h3>
      
      {/* Input Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Account Size
          </label>
          <input
            type="number"
            value={accountSize}
            onChange={(e) => setAccountSize(Number(e.target.value))}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            placeholder="100000"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Symbol
          </label>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          >
            {availableSymbols.map(symbol => (
              <option key={symbol} value={symbol}>{symbol}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Stop Distance (Custom)
          </label>
          <input
            type="number"
            step="0.01"
            value={customStopDistance || ''}
            onChange={(e) => setCustomStopDistance(e.target.value ? Number(e.target.value) : null)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            placeholder={`${suggestedStop.toFixed(2)} (2x ATR)`}
          />
        </div>
      </div>

      {/* Calculation Results */}
      {calculation && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center bg-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400 mb-1">
              {calculation.positionSize}
            </div>
            <div className="text-sm text-gray-400">Shares</div>
          </div>
          
          <div className="text-center bg-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400 mb-1">
              ${(calculation.positionSize * currentPrice).toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Position Value</div>
          </div>
          
          <div className="text-center bg-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-400 mb-1">
              ${calculation.dollarRisk.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Dollar Risk</div>
          </div>
          
          <div className="text-center bg-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-400 mb-1">
              {(calculation.riskPerTrade * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-400">Account Risk</div>
          </div>
        </div>
      )}

      {/* Additional Info */}
      <div className="mt-4 pt-4 border-t border-gray-600 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-400">Current Price: </span>
          <span className="font-medium">${currentPrice.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-gray-400">14-day ATR: </span>
          <span className="font-medium">${atr.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-gray-400">Suggested Stop: </span>
          <span className="font-medium">${(currentPrice - suggestedStop).toFixed(2)}</span>
        </div>
        <div>
          <span className="text-gray-400">Stop Distance: </span>
          <span className="font-medium">${(customStopDistance || suggestedStop).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

// Stop loss visualization
function StopLossVisualization({ 
  indexes, 
  riskMetrics 
}: {
  indexes: Record<string, any>;
  riskMetrics: RiskMetricsType;
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Stop Loss Levels</h3>
      
      <div className="space-y-4">
        {Object.entries(indexes).map(([symbol, data]) => {
          const stopDistance = data.atr14 * 2;
          const stopPrice = data.price - stopDistance;
          const stopPercent = (stopDistance / data.price) * 100;
          
          return (
            <div key={symbol} className="bg-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold">{symbol}</h4>
                <span className="text-sm text-gray-400">
                  ATR: ${data.atr14.toFixed(2)}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">Current Price</div>
                  <div className="font-medium">${data.price.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-gray-400">Stop Loss</div>
                  <div className="font-medium text-red-400">${stopPrice.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-gray-400">Risk %</div>
                  <div className="font-medium">{stopPercent.toFixed(1)}%</div>
                </div>
              </div>
              
              {/* Visual stop loss bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Stop: ${stopPrice.toFixed(2)}</span>
                  <span>Current: ${data.price.toFixed(2)}</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full"
                    style={{ width: `${Math.min(stopPercent * 2, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Volatility adjustments
function VolatilityAdjustments({ 
  riskMetrics, 
  vixLevel, 
  regime 
}: {
  riskMetrics: RiskMetricsType;
  vixLevel: number;
  regime: RegimeType;
}) {
  const getAdjustmentRecommendations = () => {
    const recommendations = [];
    
    if (vixLevel > 25) {
      recommendations.push({
        type: 'warning',
        message: `High VIX (${vixLevel.toFixed(1)}) suggests reducing position sizes by ${((1 - riskMetrics.vixAdjustment) * 100).toFixed(0)}%`,
        action: 'Reduce position sizes and tighten stops'
      });
    } else if (vixLevel < 15) {
      recommendations.push({
        type: 'info',
        message: `Low VIX (${vixLevel.toFixed(1)}) allows for normal or slightly larger positions`,
        action: 'Normal position sizing acceptable'
      });
    }
    
    if (riskMetrics.portfolioHeat > 0.15) {
      recommendations.push({
        type: 'critical',
        message: `Portfolio heat (${(riskMetrics.portfolioHeat * 100).toFixed(1)}%) exceeds 15% threshold`,
        action: 'Reduce overall exposure immediately'
      });
    }
    
    if (riskMetrics.correlationRisk > 0.5) {
      recommendations.push({
        type: 'warning',
        message: `High correlation risk (${(riskMetrics.correlationRisk * 100).toFixed(0)}%) detected`,
        action: 'Diversify across uncorrelated assets'
      });
    }
    
    return recommendations;
  };

  const recommendations = getAdjustmentRecommendations();

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Volatility & Risk Adjustments</h3>
      
      {/* Current Adjustments */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center bg-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400 mb-1">
            {(riskMetrics.volatilityAdjustment * 100).toFixed(0)}%
          </div>
          <div className="text-sm text-gray-400">Volatility Factor</div>
        </div>
        
        <div className="text-center bg-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400 mb-1">
            {(riskMetrics.vixAdjustment * 100).toFixed(0)}%
          </div>
          <div className="text-sm text-gray-400">VIX Adjustment</div>
        </div>
        
        <div className="text-center bg-gray-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400 mb-1">
            {regime}
          </div>
          <div className="text-sm text-gray-400">Current Regime</div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-300">Risk Recommendations</h4>
          {recommendations.map((rec, index) => (
            <div 
              key={index}
              className={`rounded-lg p-3 border ${
                rec.type === 'critical' ? 'bg-red-900/20 border-red-500/30 text-red-400' :
                rec.type === 'warning' ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-400' :
                'bg-blue-900/20 border-blue-500/30 text-blue-400'
              }`}
            >
              <div className="font-medium mb-1">{rec.message}</div>
              <div className="text-sm opacity-80">{rec.action}</div>
            </div>
          ))}
        </div>
      )}

      {/* Risk Management Rules */}
      <div className="mt-6 pt-4 border-t border-gray-600">
        <h4 className="font-medium text-gray-300 mb-2">Risk Management Rules</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
          <div>
            <div>• Maximum 1-2% risk per trade</div>
            <div>• Stop losses at 2x ATR distance</div>
            <div>• Maximum 10% per single position</div>
          </div>
          <div>
            <div>• Reduce size when VIX &gt; 25</div>
            <div>• Maximum 15% portfolio heat</div>
            <div>• Diversify across sectors</div>
          </div>
        </div>
      </div>
    </div>
  );
}