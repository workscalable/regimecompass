import React, { useState, useEffect } from 'react';
import OptionsRecommendationDashboard, { 
  OptionsRecommendation, 
  OptionsChainData 
} from '../components/OptionsRecommendationDashboard';

/**
 * Options Recommendation Demo
 * 
 * Complete demonstration of the options recommendation system with:
 * - Smart strike/expiry suggestions with confidence scoring
 * - Greeks visualization and risk metrics display
 * - Liquidity assessment and recommendation ranking
 * - Real-time options chain integration
 */

const OptionsDemo: React.FC = () => {
  const [symbol] = useState('SPY');
  const [recommendations, setRecommendations] = useState<OptionsRecommendation[]>([]);
  const [optionsChain, setOptionsChain] = useState<OptionsChainData | null>(null);
  const [confidence] = useState(0.87);
  const [expectedMove] = useState(8.5);

  const fibonacciAnalysis = {
    currentLevel: 0.618,
    targetZones: [420, 435, 450],
    expansion: 'MID_EXPANSION' as const
  };

  useEffect(() => {
    // Generate mock data
    const mockRecommendations: OptionsRecommendation[] = [
      {
        id: 'SPY_C_435_2024-02-16',
        symbol: 'SPY',
        type: 'CALL',
        strike: 435,
        expiration: new Date('2024-02-16'),
        daysToExpiration: 21,
        bid: 3.85,
        ask: 3.95,
        midPrice: 3.90,
        lastPrice: 3.88,
        impliedVolatility: 0.18,
        delta: 0.42,
        gamma: 0.08,
        theta: -0.12,
        vega: 0.25,
        rho: 0.03,
        maxProfit: Infinity,
        maxLoss: 390,
        breakeven: 438.90,
        profitProbability: 0.42,
        expectedReturn: 0.15,
        riskRewardRatio: 2.8,
        volume: 1250,
        openInterest: 3420,
        bidAskSpread: 0.10,
        bidAskSpreadPercent: 0.026,
        liquidityScore: 0.85,
        confidence: 0.92,
        rank: 1,
        reasoning: [
          'High confidence signal (92%) based on multi-factor analysis',
          'Optimal delta (0.42) in target range for directional plays',
          'Strong liquidity with tight bid-ask spread (2.6%)',
          '21 DTE provides good time decay balance'
        ],
        alerts: [],
        underlyingPrice: 428.50,
        expectedMove: 8.5,
        fibonacciLevel: 0.618,
        gammaExposure: 2500000,
        timestamp: new Date()
      }
    ];

    const mockChain: OptionsChainData = {
      symbol: 'SPY',
      underlyingPrice: 428.50,
      impliedVolatility: 0.18,
      expectedMove: 8.5,
      expirations: [new Date('2024-02-16'), new Date('2024-02-23')],
      strikes: [420, 425, 430, 435, 440, 445, 450],
      calls: new Map(),
      puts: new Map(),
      lastUpdate: new Date()
    };

    setRecommendations(mockRecommendations);
    setOptionsChain(mockChain);
  }, []);

  const handleRecommendationSelect = (recommendation: OptionsRecommendation) => {
    console.log('Selected:', recommendation);
  };

  const handleRefresh = () => {
    console.log('Refreshing options data...');
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Options Recommendation System Demo
          </h1>
          <p className="text-gray-600">
            Smart options analysis with Greeks visualization and risk assessment.
          </p>
        </div>

        <OptionsRecommendationDashboard
          symbol={symbol}
          recommendations={recommendations}
          optionsChain={optionsChain || undefined}
          confidence={confidence}
          expectedMove={expectedMove}
          fibonacciAnalysis={fibonacciAnalysis}
          onRecommendationSelect={handleRecommendationSelect}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  );
};

export default OptionsDemo;