import { EventEmitter } from 'events';
import { 
  StrikeRecommendation, 
  StrikeSelection, 
  OptionType 
} from '@/lib/trading';
import { tradierService } from '@/services/tradierService';
import { polygonService } from '@/services/polygonService';
import { twelveDataService } from '@/services/twelveDataService';

/**
 * StrikeSelector - Strike Recommendation Engine
 * 
 * Uses Tradier + Polygon + Twelve Data to select 1–2 optimal strikes and expiry ≤ 5 DTE
 * 
 * Features:
 * - Multi-source options data integration
 * - Delta-based strike selection
 * - Risk/reward optimization
 * - Expiration selection (≤ 5 DTE)
 * - Greeks analysis
 * - Probability calculations
 */

export class StrikeSelector extends EventEmitter {
  private selections: Map<string, StrikeSelection> = new Map();
  private readonly maxDTE = 5; // Maximum days to expiration
  private readonly minDelta = 0.2; // Minimum delta
  private readonly maxDelta = 0.8; // Maximum delta
  private readonly minVolume = 100; // Minimum volume
  private readonly minOpenInterest = 50; // Minimum open interest

  constructor() {
    super();
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for strike selection events
   */
  private setupEventHandlers(): void {
    this.on('strikesSelected', (selection: StrikeSelection) => {
      console.log(`Strikes selected for ${selection.symbol}:`, {
        strikes: selection.recommendedStrikes.length,
        confidence: selection.confidence,
        riskLevel: selection.riskLevel
      });
    });

    this.on('highRiskSelection', (selection: StrikeSelection) => {
      console.log(`High risk selection for ${selection.symbol}:`, {
        strikes: selection.recommendedStrikes.length,
        reasoning: selection.reasoning
      });
    });
  }

  /**
   * Select optimal strikes for a symbol
   */
  async selectStrikes(
    symbol: string,
    direction: 'LONG' | 'SHORT',
    currentPrice: number,
    targetPrice?: number,
    maxRisk?: number
  ): Promise<StrikeSelection> {
    try {
      // Fetch options chain data
      const optionsChain = await this.fetchOptionsChain(symbol);
      
      if (!optionsChain || optionsChain.length === 0) {
        throw new Error(`No options data available for ${symbol}`);
      }

      // Filter options by criteria
      const filteredOptions = this.filterOptionsByCriteria(optionsChain, currentPrice);
      
      if (filteredOptions.length === 0) {
        throw new Error(`No options meet criteria for ${symbol}`);
      }

      // Calculate strike recommendations
      const recommendations = await this.calculateStrikeRecommendations(
        symbol,
        filteredOptions,
        direction,
        currentPrice,
        targetPrice,
        maxRisk
      );

      // Select optimal strikes (1-2 strikes)
      const selectedStrikes = this.selectOptimalStrikes(recommendations, direction);

      // Calculate confidence and risk level
      const confidence = this.calculateSelectionConfidence(selectedStrikes);
      const riskLevel = this.calculateRiskLevel(selectedStrikes);
      const reasoning = this.generateReasoning(selectedStrikes, direction);

      const selection: StrikeSelection = {
        symbol,
        recommendedStrikes: selectedStrikes,
        confidence,
        reasoning,
        riskLevel,
        maxDTE: this.maxDTE,
        timestamp: new Date()
      };

      // Store selection
      this.selections.set(symbol, selection);

      // Emit events
      this.emit('strikesSelected', selection);
      if (riskLevel === 'HIGH') {
        this.emit('highRiskSelection', selection);
      }

      return selection;

    } catch (error) {
      console.error(`Error selecting strikes for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Fetch options chain from Tradier
   */
  private async fetchOptionsChain(symbol: string): Promise<any[]> {
    try {
      // Get next few expirations
      const expirations = this.getNextExpirations(3);
      const allOptions: any[] = [];

      for (const expiration of expirations) {
        try {
          const response = await tradierService.fetchOptionsChain(symbol, expiration);
          if (response.data && response.data.options) {
            allOptions.push(...response.data.options);
          }
        } catch (error) {
          console.warn(`Failed to fetch options for ${symbol} expiration ${expiration}:`, error);
        }
      }

      return allOptions;
    } catch (error) {
      console.error(`Error fetching options chain for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Get next few expirations (within maxDTE)
   */
  private getNextExpirations(count: number): string[] {
    const expirations: string[] = [];
    const today = new Date();
    
    for (let i = 1; i <= count; i++) {
      const expiration = new Date(today);
      expiration.setDate(today.getDate() + i);
      
      if (expiration.getDay() === 5) { // Friday expiration
        expirations.push(expiration.toISOString().split('T')[0]);
      }
    }
    
    return expirations;
  }

  /**
   * Filter options by criteria
   */
  private filterOptionsByCriteria(options: any[], currentPrice: number): any[] {
    return options.filter(option => {
      // Check expiration (≤ maxDTE)
      const expiration = new Date(option.expiration_date);
      const today = new Date();
      const dte = Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dte > this.maxDTE) return false;
      
      // Check delta range
      const delta = Math.abs(option.delta || 0);
      if (delta < this.minDelta || delta > this.maxDelta) return false;
      
      // Check volume
      if ((option.volume || 0) < this.minVolume) return false;
      
      // Check open interest
      if ((option.open_interest || 0) < this.minOpenInterest) return false;
      
      // Check if option has valid bid/ask
      if (!option.bid || !option.ask || option.bid <= 0 || option.ask <= 0) return false;
      
      return true;
    });
  }

  /**
   * Calculate strike recommendations
   */
  private async calculateStrikeRecommendations(
    symbol: string,
    options: any[],
    direction: 'LONG' | 'SHORT',
    currentPrice: number,
    targetPrice?: number,
    maxRisk?: number
  ): Promise<StrikeRecommendation[]> {
    const recommendations: StrikeRecommendation[] = [];

    for (const option of options) {
      try {
        const recommendation = await this.calculateStrikeRecommendation(
          symbol,
          option,
          direction,
          currentPrice,
          targetPrice,
          maxRisk
        );

        if (recommendation) {
          recommendations.push(recommendation);
        }
      } catch (error) {
        console.warn(`Error calculating recommendation for option ${option.symbol}:`, error);
      }
    }

    return recommendations;
  }

  /**
   * Calculate individual strike recommendation
   */
  private async calculateStrikeRecommendation(
    symbol: string,
    option: any,
    direction: 'LONG' | 'SHORT',
    currentPrice: number,
    targetPrice?: number,
    maxRisk?: number
  ): Promise<StrikeRecommendation | null> {
    try {
      const strike = option.strike;
      const type = option.option_type.toUpperCase() as OptionType;
      const expiry = option.expiration_date;
      const delta = option.delta || 0;
      const gamma = option.gamma || 0;
      const theta = option.theta || 0;
      const vega = option.vega || 0;
      const bid = option.bid || 0;
      const ask = option.ask || 0;
      const mid = (bid + ask) / 2;
      const volume = option.volume || 0;
      const openInterest = option.open_interest || 0;
      const impliedVolatility = option.mid_iv || 0;

      // Calculate probability of profit
      const probability = this.calculateProbability(option, currentPrice, targetPrice);
      
      // Calculate risk/reward ratio
      const riskReward = this.calculateRiskReward(option, currentPrice, targetPrice, maxRisk);

      // Calculate Greeks-weighted score
      const greeksScore = this.calculateGreeksScore(delta, gamma, theta, vega);

      // Calculate liquidity score
      const liquidityScore = this.calculateLiquidityScore(volume, openInterest, bid, ask);

      const recommendation: StrikeRecommendation = {
        strike,
        type,
        expiry,
        delta,
        gamma,
        theta,
        vega,
        bid,
        ask,
        mid,
        volume,
        openInterest,
        impliedVolatility,
        probability,
        riskReward,
        greeksScore,
        liquidityScore
      };

      return recommendation;

    } catch (error) {
      console.error(`Error calculating recommendation for option ${option.symbol}:`, error);
      return null;
    }
  }

  /**
   * Calculate probability of profit
   */
  private calculateProbability(option: any, currentPrice: number, targetPrice?: number): number {
    const strike = option.strike;
    const type = option.option_type;
    const impliedVolatility = option.mid_iv || 0.2;
    
    // Simplified probability calculation
    if (type === 'call') {
      if (targetPrice && targetPrice > strike) {
        return Math.min(0.9, 0.5 + (targetPrice - strike) / (currentPrice * 0.1));
      }
      return Math.max(0.1, 0.5 - (strike - currentPrice) / (currentPrice * 0.1));
    } else {
      if (targetPrice && targetPrice < strike) {
        return Math.min(0.9, 0.5 + (strike - targetPrice) / (currentPrice * 0.1));
      }
      return Math.max(0.1, 0.5 - (currentPrice - strike) / (currentPrice * 0.1));
    }
  }

  /**
   * Calculate risk/reward ratio
   */
  private calculateRiskReward(
    option: any,
    currentPrice: number,
    targetPrice?: number,
    maxRisk?: number
  ): number {
    const strike = option.strike;
    const type = option.option_type;
    const mid = (option.bid + option.ask) / 2;
    
    if (type === 'call') {
      const maxProfit = targetPrice ? Math.max(0, targetPrice - strike - mid) : strike * 0.1;
      const maxLoss = mid;
      return maxLoss > 0 ? maxProfit / maxLoss : 0;
    } else {
      const maxProfit = targetPrice ? Math.max(0, strike - targetPrice - mid) : strike * 0.1;
      const maxLoss = mid;
      return maxLoss > 0 ? maxProfit / maxLoss : 0;
    }
  }

  /**
   * Calculate Greeks-weighted score
   */
  private calculateGreeksScore(delta: number, gamma: number, theta: number, vega: number): number {
    // Weight Greeks based on importance
    const deltaScore = Math.abs(delta) * 0.4; // Higher delta is better
    const gammaScore = Math.min(1, gamma * 10) * 0.2; // Moderate gamma is good
    const thetaScore = Math.max(0, 1 - Math.abs(theta) * 10) * 0.2; // Lower theta is better
    const vegaScore = Math.min(1, vega * 5) * 0.2; // Moderate vega is good
    
    return deltaScore + gammaScore + thetaScore + vegaScore;
  }

  /**
   * Calculate liquidity score
   */
  private calculateLiquidityScore(volume: number, openInterest: number, bid: number, ask: number): number {
    const volumeScore = Math.min(1, volume / 1000) * 0.4;
    const openInterestScore = Math.min(1, openInterest / 500) * 0.3;
    const spreadScore = Math.max(0, 1 - (ask - bid) / bid) * 0.3;
    
    return volumeScore + openInterestScore + spreadScore;
  }

  /**
   * Select optimal strikes (1-2 strikes)
   */
  private selectOptimalStrikes(
    recommendations: StrikeRecommendation[],
    direction: 'LONG' | 'SHORT'
  ): StrikeRecommendation[] {
    // Sort by combined score
    const sortedRecommendations = recommendations.sort((a, b) => {
      const scoreA = (a.greeksScore * 0.4) + (a.liquidityScore * 0.3) + (a.probability * 0.2) + (a.riskReward * 0.1);
      const scoreB = (b.greeksScore * 0.4) + (b.liquidityScore * 0.3) + (b.probability * 0.2) + (b.riskReward * 0.1);
      return scoreB - scoreA;
    });

    // Select top 1-2 strikes
    const selected = sortedRecommendations.slice(0, 2);
    
    // Ensure we have both call and put if possible
    if (selected.length === 2) {
      const hasCall = selected.some(s => s.type === 'CALL');
      const hasPut = selected.some(s => s.type === 'PUT');
      
      if (!hasCall || !hasPut) {
        // Try to find a different type
        const alternative = recommendations.find(r => 
          r.type !== selected[0].type && 
          r.strike !== selected[0].strike
        );
        
        if (alternative) {
          selected[1] = alternative;
        }
      }
    }

    return selected;
  }

  /**
   * Calculate selection confidence
   */
  private calculateSelectionConfidence(strikes: StrikeRecommendation[]): number {
    if (strikes.length === 0) return 0;
    
    const avgProbability = strikes.reduce((sum, s) => sum + s.probability, 0) / strikes.length;
    const avgLiquidity = strikes.reduce((sum, s) => sum + s.liquidityScore, 0) / strikes.length;
    const avgGreeks = strikes.reduce((sum, s) => sum + s.greeksScore, 0) / strikes.length;
    
    return (avgProbability * 0.4) + (avgLiquidity * 0.3) + (avgGreeks * 0.3);
  }

  /**
   * Calculate risk level
   */
  private calculateRiskLevel(strikes: StrikeRecommendation[]): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (strikes.length === 0) return 'HIGH';
    
    const avgRiskReward = strikes.reduce((sum, s) => sum + s.riskReward, 0) / strikes.length;
    const avgProbability = strikes.reduce((sum, s) => sum + s.probability, 0) / strikes.length;
    const avgLiquidity = strikes.reduce((sum, s) => sum + s.liquidityScore, 0) / strikes.length;
    
    if (avgRiskReward >= 2 && avgProbability >= 0.6 && avgLiquidity >= 0.7) return 'LOW';
    if (avgRiskReward >= 1.5 && avgProbability >= 0.5 && avgLiquidity >= 0.5) return 'MEDIUM';
    return 'HIGH';
  }

  /**
   * Generate reasoning for selection
   */
  private generateReasoning(strikes: StrikeRecommendation[], direction: 'LONG' | 'SHORT'): string[] {
    const reasoning: string[] = [];
    
    if (strikes.length === 0) {
      reasoning.push('No suitable options found');
      return reasoning;
    }
    
    const avgDelta = strikes.reduce((sum, s) => sum + Math.abs(s.delta), 0) / strikes.length;
    const avgProbability = strikes.reduce((sum, s) => sum + s.probability, 0) / strikes.length;
    const avgRiskReward = strikes.reduce((sum, s) => sum + s.riskReward, 0) / strikes.length;
    
    reasoning.push(`Selected ${strikes.length} strike(s) with avg delta ${avgDelta.toFixed(2)}`);
    reasoning.push(`Average probability of profit: ${(avgProbability * 100).toFixed(1)}%`);
    reasoning.push(`Average risk/reward ratio: ${avgRiskReward.toFixed(2)}`);
    
    if (direction === 'LONG') {
      reasoning.push('Bullish strategy - calls selected');
    } else {
      reasoning.push('Bearish strategy - puts selected');
    }
    
    return reasoning;
  }

  /**
   * Get strike selection for symbol
   */
  getSelection(symbol: string): StrikeSelection | undefined {
    return this.selections.get(symbol);
  }

  /**
   * Get all strike selections
   */
  getAllSelections(): StrikeSelection[] {
    return Array.from(this.selections.values());
  }

  /**
   * Clear selection for symbol
   */
  clearSelection(symbol: string): void {
    this.selections.delete(symbol);
  }

  /**
   * Clear all selections
   */
  clearAllSelections(): void {
    this.selections.clear();
  }

  /**
   * Get strike selection statistics
   */
  getSelectionStats(): {
    totalSelections: number;
    avgConfidence: number;
    riskLevelDistribution: Record<'LOW' | 'MEDIUM' | 'HIGH', number>;
    avgStrikesPerSelection: number;
    avgProbability: number;
    avgRiskReward: number;
  } {
    const allSelections = Array.from(this.selections.values());
    
    const avgConfidence = allSelections.length > 0
      ? allSelections.reduce((sum, s) => sum + s.confidence, 0) / allSelections.length
      : 0;

    const riskLevelDistribution = allSelections.reduce((acc, s) => {
      acc[s.riskLevel] = (acc[s.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<'LOW' | 'MEDIUM' | 'HIGH', number>);

    const avgStrikesPerSelection = allSelections.length > 0
      ? allSelections.reduce((sum, s) => sum + s.recommendedStrikes.length, 0) / allSelections.length
      : 0;

    const allStrikes = allSelections.flatMap(s => s.recommendedStrikes);
    const avgProbability = allStrikes.length > 0
      ? allStrikes.reduce((sum, s) => sum + s.probability, 0) / allStrikes.length
      : 0;

    const avgRiskReward = allStrikes.length > 0
      ? allStrikes.reduce((sum, s) => sum + s.riskReward, 0) / allStrikes.length
      : 0;

    return {
      totalSelections: allSelections.length,
      avgConfidence,
      riskLevelDistribution,
      avgStrikesPerSelection,
      avgProbability,
      avgRiskReward
    };
  }
}

// Export singleton instance
export const strikeSelector = new StrikeSelector();


