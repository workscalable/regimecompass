import { useState, useEffect, useCallback, useMemo } from 'react';
import { OptionsRecommendation, OptionsChainData } from '../components/OptionsRecommendationDashboard';

/**
 * Options Data Hook
 * 
 * Manages options recommendations and chain data:
 * - Real-time options recommendations with Greeks
 * - Options chain data with bid/ask spreads
 * - Liquidity analysis and ranking
 * - Risk metrics and expected returns
 */

export interface OptionsDataHook {
  recommendations: OptionsRecommendation[];
  optionsChain: OptionsChainData | null;
  isLoading: boolean;
  error: string | null;
  refreshRecommendations: (symbol: string) => Promise<void>;
  refreshOptionsChain: (symbol: string) => Promise<void>;
  getRecommendationsForSymbol: (symbol: string) => OptionsRecommendation[];
}

export const useOptionsData = (symbol: string): OptionsDataHook => {
  const [recommendations, setRecommendations] = useState<OptionsRecommendation[]>([]);
  const [optionsChain, setOptionsChain] = useState<OptionsChainData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh recommendations
  const refreshRecommendations = useCallback(async (targetSymbol: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would call the backend API
      const mockRecommendations = generateMockRecommendations(targetSymbol);
      setRecommendations(mockRecommendations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recommendations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh options chain
  const refreshOptionsChain = useCallback(async (targetSymbol: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would call the backend API
      const mockChain = generateMockOptionsChain(targetSymbol);
      setOptionsChain(mockChain);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch options chain');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get recommendations for specific symbol
  const getRecommendationsForSymbol = useCallback((targetSymbol: string) => {
    return recommendations.filter(rec => rec.symbol === targetSymbol);
  }, [recommendations]);

  // Initial data load
  useEffect(() => {
    if (symbol) {
      refreshRecommendations(symbol);
      refreshOptionsChain(symbol);
    }
  }, [symbol, refreshRecommendations, refreshOptionsChain]);

  return {
    recommendations,
    optionsChain,
    isLoading,
    error,
    refreshRecommendations,
    refreshOptionsChain,
    getRecommendationsForSymbol
  };
};

// Mock data generators for development
function generateMockRecommendations(symbol: string): OptionsRecommendation[] {
  const basePrice = 150 + Math.random() * 100;
  const recommendations: OptionsRecommendation[] = [];
  
  // Generate 10 mock recommendations
  for (let i = 0; i < 10; i++) {
    const isCall = Math.random() > 0.5;
    const strike = basePrice + (Math.random() - 0.5) * 40;
    const daysToExpiration = 7 + Math.floor(Math.random() * 38); // 7-45 days
    const expiration = new Date(Date.now() + daysToExpiration * 24 * 60 * 60 * 1000);
    
    const bid = Math.random() * 10 + 1;
    const ask = bid + Math.random() * 2;
    const midPrice = (bid + ask) / 2;
    
    const delta = isCall ? Math.random() * 0.8 + 0.1 : -(Math.random() * 0.8 + 0.1);
    const gamma = Math.random() * 0.1;
    const theta = -(Math.random() * 0.1 + 0.01);
    const vega = Math.random() * 0.3 + 0.05;
    const rho = isCall ? Math.random() * 0.05 : -(Math.random() * 0.05);
    
    const volume = Math.floor(Math.random() * 1000);
    const openInterest = Math.floor(Math.random() * 5000);
    const bidAskSpread = ask - bid;
    const bidAskSpreadPercent = bidAskSpread / midPrice;
    
    const liquidityScore = Math.max(0, Math.min(1, 
      (volume / 100) * 0.3 + 
      (openInterest / 1000) * 0.4 + 
      (1 - bidAskSpreadPercent) * 0.3
    ));
    
    const confidence = Math.random() * 0.4 + 0.6; // 60-100%
    const expectedReturn = (Math.random() - 0.3) * 0.5; // -20% to +20%
    const maxProfit = isCall ? Infinity : strike * 100;
    const maxLoss = midPrice * 100;
    const riskRewardRatio = Math.abs(expectedReturn * midPrice * 100) / maxLoss;
    
    recommendations.push({
      id: `${symbol}_${isCall ? 'C' : 'P'}_${strike}_${expiration.toISOString()}`,
      symbol,
      type: isCall ? 'CALL' : 'PUT',
      strike,
      expiration,
      daysToExpiration,
      bid,
      ask,
      midPrice,
      lastPrice: midPrice + (Math.random() - 0.5) * 0.5,
      impliedVolatility: Math.random() * 0.5 + 0.2,
      delta,
      gamma,
      theta,
      vega,
      rho,
      maxProfit,
      maxLoss,
      breakeven: isCall ? strike + midPrice : strike - midPrice,
      profitProbability: Math.random() * 0.4 + 0.3,
      expectedReturn,
      riskRewardRatio,
      volume,
      openInterest,
      bidAskSpread,
      bidAskSpreadPercent,
      liquidityScore,
      confidence,
      rank: i + 1,
      reasoning: [
        `High confidence signal (${(confidence * 100).toFixed(1)}%)`,
        `Optimal delta range (${Math.abs(delta).toFixed(2)})`,
        `Good liquidity (${(liquidityScore * 100).toFixed(0)}% score)`,
        `${daysToExpiration} days to expiration within target range`
      ],
      alerts: Math.random() > 0.7 ? [
        'Wide bid-ask spread may impact execution',
        'Low volume - monitor liquidity'
      ] : [],
      underlyingPrice: basePrice,
      expectedMove: basePrice * 0.05, // 5% expected move
      fibonacciLevel: Math.random() > 0.5 ? Math.random() : undefined,
      gammaExposure: Math.random() > 0.5 ? Math.random() * 1000000 : undefined,
      timestamp: new Date()
    });
  }
  
  // Sort by confidence
  return recommendations.sort((a, b) => b.confidence - a.confidence);
}

function generateMockOptionsChain(symbol: string): OptionsChainData {
  const underlyingPrice = 150 + Math.random() * 100;
  const impliedVolatility = Math.random() * 0.3 + 0.2;
  const expectedMove = underlyingPrice * 0.05;
  
  // Generate expiration dates
  const expirations: Date[] = [];
  for (let i = 1; i <= 8; i++) {
    const weeks = i;
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + weeks * 7);
    // Set to Friday
    expiration.setDate(expiration.getDate() + (5 - expiration.getDay()));
    expirations.push(expiration);
  }
  
  // Generate strikes around current price
  const strikes: number[] = [];
  const strikeInterval = 5;
  const strikeRange = 50;
  
  for (let strike = underlyingPrice - strikeRange; strike <= underlyingPrice + strikeRange; strike += strikeInterval) {
    strikes.push(Math.round(strike / strikeInterval) * strikeInterval);
  }
  
  const calls = new Map<string, OptionsRecommendation>();
  const puts = new Map<string, OptionsRecommendation>();
  
  // Generate options for each strike/expiration combination
  expirations.forEach(expiration => {
    const daysToExpiration = Math.ceil((expiration.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    strikes.forEach(strike => {
      const key = `${strike}_${expiration.toISOString()}`;
      
      // Generate call option
      const callDelta = Math.max(0, Math.min(1, 0.5 + (underlyingPrice - strike) / (underlyingPrice * 0.2)));
      const callBid = Math.max(0.05, Math.max(0, underlyingPrice - strike) + Math.random() * 5);
      const callAsk = callBid + Math.random() * 2 + 0.05;
      
      calls.set(key, {
        id: `${symbol}_C_${strike}_${expiration.toISOString()}`,
        symbol,
        type: 'CALL',
        strike,
        expiration,
        daysToExpiration,
        bid: callBid,
        ask: callAsk,
        midPrice: (callBid + callAsk) / 2,
        lastPrice: (callBid + callAsk) / 2,
        impliedVolatility: impliedVolatility + (Math.random() - 0.5) * 0.1,
        delta: callDelta,
        gamma: Math.random() * 0.1,
        theta: -(Math.random() * 0.1 + 0.01),
        vega: Math.random() * 0.3 + 0.05,
        rho: Math.random() * 0.05,
        maxProfit: Infinity,
        maxLoss: (callBid + callAsk) / 2 * 100,
        breakeven: strike + (callBid + callAsk) / 2,
        profitProbability: callDelta,
        expectedReturn: Math.random() * 0.3 - 0.1,
        riskRewardRatio: Math.random() * 3 + 1,
        volume: Math.floor(Math.random() * 500),
        openInterest: Math.floor(Math.random() * 2000),
        bidAskSpread: callAsk - callBid,
        bidAskSpreadPercent: (callAsk - callBid) / ((callBid + callAsk) / 2),
        liquidityScore: Math.random(),
        confidence: Math.random() * 0.4 + 0.6,
        rank: 0,
        reasoning: [],
        alerts: [],
        underlyingPrice,
        expectedMove,
        timestamp: new Date()
      });
      
      // Generate put option
      const putDelta = Math.max(-1, Math.min(0, callDelta - 1));
      const putBid = Math.max(0.05, Math.max(0, strike - underlyingPrice) + Math.random() * 5);
      const putAsk = putBid + Math.random() * 2 + 0.05;
      
      puts.set(key, {
        id: `${symbol}_P_${strike}_${expiration.toISOString()}`,
        symbol,
        type: 'PUT',
        strike,
        expiration,
        daysToExpiration,
        bid: putBid,
        ask: putAsk,
        midPrice: (putBid + putAsk) / 2,
        lastPrice: (putBid + putAsk) / 2,
        impliedVolatility: impliedVolatility + (Math.random() - 0.5) * 0.1,
        delta: putDelta,
        gamma: Math.random() * 0.1,
        theta: -(Math.random() * 0.1 + 0.01),
        vega: Math.random() * 0.3 + 0.05,
        rho: -(Math.random() * 0.05),
        maxProfit: strike * 100,
        maxLoss: (putBid + putAsk) / 2 * 100,
        breakeven: strike - (putBid + putAsk) / 2,
        profitProbability: Math.abs(putDelta),
        expectedReturn: Math.random() * 0.3 - 0.1,
        riskRewardRatio: Math.random() * 3 + 1,
        volume: Math.floor(Math.random() * 500),
        openInterest: Math.floor(Math.random() * 2000),
        bidAskSpread: putAsk - putBid,
        bidAskSpreadPercent: (putAsk - putBid) / ((putBid + putAsk) / 2),
        liquidityScore: Math.random(),
        confidence: Math.random() * 0.4 + 0.6,
        rank: 0,
        reasoning: [],
        alerts: [],
        underlyingPrice,
        expectedMove,
        timestamp: new Date()
      });
    });
  });
  
  return {
    symbol,
    underlyingPrice,
    impliedVolatility,
    expectedMove,
    expirations,
    strikes,
    calls,
    puts,
    lastUpdate: new Date()
  };
}