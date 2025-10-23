import { EventEmitter } from 'events';
import { 
  MultiTFConfirmation, 
  TimeframeConfirmation, 
  Timeframe,
  SignalStage 
} from '@/lib/trading';
import { IndexData } from '@/lib/types';

/**
 * MultiTFOrchestrator - Multi-Timeframe Confirmation Engine
 * 
 * Validates breakout signals using both HTF (15m/1h) and LTF (5m/1m) confirmations
 * 
 * Confirmation Criteria:
 * - Δ slope (Polygon) > ± 0.6
 * - Volume > 1.3 × average
 * - Bid/Ask imbalance (Finnhub) > 1.2 or < 0.8
 * - Flow bias (Tradier sweeps) > 0.65
 * - Strat continuity (2UP / 2DOWN)
 * 
 * Output: READY → GO status with confidence scoring
 */

export class MultiTFOrchestrator extends EventEmitter {
  private confirmations: Map<string, MultiTFConfirmation> = new Map();
  private readonly htfTimeframes: Timeframe[] = ['15m', '1h'];
  private readonly ltfTimeframes: Timeframe[] = ['5m', '1m'];
  
  // Confirmation thresholds
  private readonly deltaSlopeThreshold = 0.6;
  private readonly volumeExpansionThreshold = 1.3;
  private readonly bidAskImbalanceThreshold = { high: 1.2, low: 0.8 };
  private readonly flowBiasThreshold = 0.65;
  private readonly stratContinuityThreshold = 2;

  constructor() {
    super();
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for confirmation events
   */
  private setupEventHandlers(): void {
    this.on('confirmationReady', (confirmation: MultiTFConfirmation) => {
      console.log(`Multi-TF confirmation ready for ${confirmation.symbol}:`, {
        confidence: confirmation.confidence,
        status: confirmation.status
      });
    });

    this.on('confirmationGo', (confirmation: MultiTFConfirmation) => {
      console.log(`Multi-TF confirmation GO for ${confirmation.symbol}:`, {
        confidence: confirmation.confidence,
        htfConfirmations: confirmation.htfConfirmations.length,
        ltfConfirmations: confirmation.ltfConfirmations.length
      });
    });

    this.on('confirmationWait', (confirmation: MultiTFConfirmation) => {
      console.log(`Multi-TF confirmation WAIT for ${confirmation.symbol}:`, {
        confidence: confirmation.confidence,
        missingConfirmations: this.getMissingConfirmations(confirmation)
      });
    });
  }

  /**
   * Process multi-timeframe confirmation for a symbol
   */
  async processConfirmation(
    symbol: string,
    htfData: Record<Timeframe, IndexData[]>,
    ltfData: Record<Timeframe, IndexData[]>,
    orderFlowData?: any,
    optionsFlowData?: any
  ): Promise<MultiTFConfirmation> {
    try {
      // Process HTF confirmations
      const htfConfirmations = await this.processHTFConfirmations(
        symbol, 
        htfData, 
        orderFlowData
      );

      // Process LTF confirmations
      const ltfConfirmations = await this.processLTFConfirmations(
        symbol, 
        ltfData, 
        orderFlowData
      );

      // Calculate overall confirmation
      const overallConfirmation = this.calculateOverallConfirmation(
        htfConfirmations, 
        ltfConfirmations
      );

      // Calculate confidence score
      const confidence = this.calculateConfidenceScore(
        htfConfirmations, 
        ltfConfirmations
      );

      // Determine status
      const status = this.determineStatus(confidence, overallConfirmation);

      const confirmation: MultiTFConfirmation = {
        symbol,
        htfConfirmations,
        ltfConfirmations,
        overallConfirmation,
        confidence,
        status,
        timestamp: new Date()
      };

      // Store confirmation
      this.confirmations.set(symbol, confirmation);

      // Emit appropriate event
      this.emit(`confirmation${status}`, confirmation);

      return confirmation;

    } catch (error) {
      console.error(`Error processing multi-TF confirmation for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Process HTF (Higher Timeframe) confirmations
   */
  private async processHTFConfirmations(
    symbol: string,
    htfData: Record<Timeframe, IndexData[]>,
    orderFlowData?: any
  ): Promise<TimeframeConfirmation[]> {
    const confirmations: TimeframeConfirmation[] = [];

    for (const timeframe of this.htfTimeframes) {
      const data = htfData[timeframe];
      if (!data || data.length < 10) continue;

      const confirmation = await this.analyzeTimeframe(
        symbol,
        timeframe,
        data,
        orderFlowData,
        true // isHTF
      );

      if (confirmation) {
        confirmations.push(confirmation);
      }
    }

    return confirmations;
  }

  /**
   * Process LTF (Lower Timeframe) confirmations
   */
  private async processLTFConfirmations(
    symbol: string,
    ltfData: Record<Timeframe, IndexData[]>,
    orderFlowData?: any
  ): Promise<TimeframeConfirmation[]> {
    const confirmations: TimeframeConfirmation[] = [];

    for (const timeframe of this.ltfTimeframes) {
      const data = ltfData[timeframe];
      if (!data || data.length < 10) continue;

      const confirmation = await this.analyzeTimeframe(
        symbol,
        timeframe,
        data,
        orderFlowData,
        false // isLTF
      );

      if (confirmation) {
        confirmations.push(confirmation);
      }
    }

    return confirmations;
  }

  /**
   * Analyze individual timeframe for confirmations
   */
  private async analyzeTimeframe(
    symbol: string,
    timeframe: Timeframe,
    data: IndexData[],
    orderFlowData?: any,
    isHTF: boolean = true
  ): Promise<TimeframeConfirmation | null> {
    try {
      // Calculate delta slope (price momentum)
      const deltaSlope = this.calculateDeltaSlope(data);
      
      // Calculate volume expansion
      const volumeExpansion = this.calculateVolumeExpansion(data);
      
      // Calculate bid/ask imbalance (simulated from order flow data)
      const bidAskImbalance = this.calculateBidAskImbalance(data, orderFlowData);
      
      // Calculate flow bias
      const flowBias = this.calculateFlowBias(data, orderFlowData);
      
      // Calculate strat continuity
      const stratContinuity = this.calculateStratContinuity(data);
      
      // Determine if confirmation criteria are met
      const confirmation = this.evaluateConfirmationCriteria(
        deltaSlope,
        volumeExpansion,
        bidAskImbalance,
        flowBias,
        stratContinuity,
        isHTF
      );
      
      // Calculate strength score
      const strength = this.calculateTimeframeStrength(
        deltaSlope,
        volumeExpansion,
        bidAskImbalance,
        flowBias,
        stratContinuity
      );

      return {
        timeframe,
        deltaSlope,
        volumeExpansion,
        bidAskImbalance,
        flowBias,
        stratContinuity,
        confirmation,
        strength
      };

    } catch (error) {
      console.error(`Error analyzing timeframe ${timeframe} for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Calculate delta slope (price momentum)
   */
  private calculateDeltaSlope(data: IndexData[]): number {
    if (data.length < 5) return 0;

    const prices = data.map(d => d.price);
    const recentPrices = prices.slice(-5);
    const previousPrices = prices.slice(-10, -5);

    if (previousPrices.length === 0) return 0;

    const recentAvg = recentPrices.reduce((sum, p) => sum + p, 0) / recentPrices.length;
    const previousAvg = previousPrices.reduce((sum, p) => sum + p, 0) / previousPrices.length;
    
    const slope = (recentAvg - previousAvg) / previousAvg;
    return Math.abs(slope);
  }

  /**
   * Calculate volume expansion ratio
   */
  private calculateVolumeExpansion(data: IndexData[]): number {
    if (data.length < 10) return 1;

    const volumes = data.map(d => d.volume);
    const recentVolumes = volumes.slice(-5);
    const historicalVolumes = volumes.slice(-10, -5);

    const recentAvg = recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length;
    const historicalAvg = historicalVolumes.reduce((sum, v) => sum + v, 0) / historicalVolumes.length;

    if (historicalAvg === 0) return 1;
    
    return recentAvg / historicalAvg;
  }

  /**
   * Calculate bid/ask imbalance (simulated)
   */
  private calculateBidAskImbalance(data: IndexData[], orderFlowData?: any): number {
    if (orderFlowData && orderFlowData.bidAskImbalance) {
      return orderFlowData.bidAskImbalance;
    }

    // Simulate bid/ask imbalance from price action
    if (data.length < 5) return 1;

    const recentPrices = data.slice(-5).map(d => d.price);
    const priceVolatility = this.calculateVolatility(recentPrices);
    
    // Higher volatility suggests more imbalance
    return 1 + (priceVolatility * 0.5);
  }

  /**
   * Calculate flow bias from order flow data
   */
  private calculateFlowBias(data: IndexData[], orderFlowData?: any): number {
    if (orderFlowData && orderFlowData.flowBias) {
      return orderFlowData.flowBias;
    }

    // Simulate flow bias from price and volume
    if (data.length < 5) return 0.5;

    const recentData = data.slice(-5);
    const priceChange = recentData[recentData.length - 1].price - recentData[0].price;
    const avgVolume = recentData.reduce((sum, d) => sum + d.volume, 0) / recentData.length;
    
    // Positive price change with high volume suggests bullish flow
    const flowBias = priceChange > 0 ? 0.6 + (avgVolume / 10000000) : 0.4 - (avgVolume / 10000000);
    
    return Math.max(0, Math.min(1, flowBias));
  }

  /**
   * Calculate strat continuity (consecutive moves in same direction)
   */
  private calculateStratContinuity(data: IndexData[]): number {
    if (data.length < 5) return 0;

    const prices = data.map(d => d.price);
    let consecutiveMoves = 0;
    let currentDirection = 0;

    for (let i = 1; i < prices.length; i++) {
      const direction = prices[i] > prices[i - 1] ? 1 : -1;
      
      if (direction === currentDirection) {
        consecutiveMoves++;
      } else {
        consecutiveMoves = 1;
        currentDirection = direction;
      }
    }

    return consecutiveMoves;
  }

  /**
   * Calculate price volatility
   */
  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Evaluate confirmation criteria
   */
  private evaluateConfirmationCriteria(
    deltaSlope: number,
    volumeExpansion: number,
    bidAskImbalance: number,
    flowBias: number,
    stratContinuity: number,
    isHTF: boolean
  ): boolean {
    // HTF requires more stringent criteria
    const deltaThreshold = isHTF ? this.deltaSlopeThreshold : this.deltaSlopeThreshold * 0.8;
    const volumeThreshold = isHTF ? this.volumeExpansionThreshold : this.volumeExpansionThreshold * 0.9;
    const continuityThreshold = isHTF ? this.stratContinuityThreshold : this.stratContinuityThreshold - 1;

    return (
      deltaSlope >= deltaThreshold &&
      volumeExpansion >= volumeThreshold &&
      (bidAskImbalance >= this.bidAskImbalanceThreshold.high || 
       bidAskImbalance <= this.bidAskImbalanceThreshold.low) &&
      flowBias >= this.flowBiasThreshold &&
      stratContinuity >= continuityThreshold
    );
  }

  /**
   * Calculate timeframe strength score
   */
  private calculateTimeframeStrength(
    deltaSlope: number,
    volumeExpansion: number,
    bidAskImbalance: number,
    flowBias: number,
    stratContinuity: number
  ): number {
    const weights = {
      deltaSlope: 0.25,
      volumeExpansion: 0.25,
      bidAskImbalance: 0.20,
      flowBias: 0.15,
      stratContinuity: 0.15
    };

    const normalizedDeltaSlope = Math.min(1, deltaSlope / this.deltaSlopeThreshold);
    const normalizedVolumeExpansion = Math.min(1, (volumeExpansion - 1) / (this.volumeExpansionThreshold - 1));
    const normalizedBidAskImbalance = Math.min(1, Math.abs(bidAskImbalance - 1) / 0.5);
    const normalizedFlowBias = flowBias;
    const normalizedStratContinuity = Math.min(1, stratContinuity / this.stratContinuityThreshold);

    return (
      normalizedDeltaSlope * weights.deltaSlope +
      normalizedVolumeExpansion * weights.volumeExpansion +
      normalizedBidAskImbalance * weights.bidAskImbalance +
      normalizedFlowBias * weights.flowBias +
      normalizedStratContinuity * weights.stratContinuity
    );
  }

  /**
   * Calculate overall confirmation status
   */
  private calculateOverallConfirmation(
    htfConfirmations: TimeframeConfirmation[],
    ltfConfirmations: TimeframeConfirmation[]
  ): boolean {
    const htfConfirmed = htfConfirmations.filter(c => c.confirmation).length;
    const ltfConfirmed = ltfConfirmations.filter(c => c.confirmation).length;

    // Require at least 1 HTF confirmation and 1 LTF confirmation
    return htfConfirmed >= 1 && ltfConfirmed >= 1;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidenceScore(
    htfConfirmations: TimeframeConfirmation[],
    ltfConfirmations: TimeframeConfirmation[]
  ): number {
    const htfStrength = htfConfirmations.reduce((sum, c) => sum + c.strength, 0) / htfConfirmations.length;
    const ltfStrength = ltfConfirmations.reduce((sum, c) => sum + c.strength, 0) / ltfConfirmations.length;

    // Weight HTF more heavily
    return (htfStrength * 0.6) + (ltfStrength * 0.4);
  }

  /**
   * Determine final status
   */
  private determineStatus(confidence: number, overallConfirmation: boolean): SignalStage {
    if (overallConfirmation && confidence >= 0.75) return 'GO';
    if (overallConfirmation && confidence >= 0.6) return 'READY';
    return 'WAIT';
  }

  /**
   * Get missing confirmations for debugging
   */
  private getMissingConfirmations(confirmation: MultiTFConfirmation): string[] {
    const missing: string[] = [];
    
    if (confirmation.htfConfirmations.length === 0) {
      missing.push('No HTF confirmations');
    }
    
    if (confirmation.ltfConfirmations.length === 0) {
      missing.push('No LTF confirmations');
    }
    
    const htfConfirmed = confirmation.htfConfirmations.filter(c => c.confirmation).length;
    const ltfConfirmed = confirmation.ltfConfirmations.filter(c => c.confirmation).length;
    
    if (htfConfirmed === 0) {
      missing.push('No HTF confirmations met criteria');
    }
    
    if (ltfConfirmed === 0) {
      missing.push('No LTF confirmations met criteria');
    }
    
    return missing;
  }

  /**
   * Get confirmation for symbol
   */
  getConfirmation(symbol: string): MultiTFConfirmation | undefined {
    return this.confirmations.get(symbol);
  }

  /**
   * Get all active confirmations
   */
  getActiveConfirmations(): MultiTFConfirmation[] {
    return Array.from(this.confirmations.values());
  }

  /**
   * Remove confirmation
   */
  removeConfirmation(symbol: string): boolean {
    return this.confirmations.delete(symbol);
  }

  /**
   * Get confirmation statistics
   */
  getConfirmationStats(): {
    totalConfirmations: number;
    byStatus: Record<SignalStage, number>;
    avgConfidence: number;
    htfSuccessRate: number;
    ltfSuccessRate: number;
  } {
    const confirmations = Array.from(this.confirmations.values());
    
    const byStatus = confirmations.reduce((acc, conf) => {
      acc[conf.status] = (acc[conf.status] || 0) + 1;
      return acc;
    }, {} as Record<SignalStage, number>);

    const avgConfidence = confirmations.length > 0
      ? confirmations.reduce((sum, c) => sum + c.confidence, 0) / confirmations.length
      : 0;

    const htfSuccessRate = confirmations.length > 0
      ? confirmations.reduce((sum, c) => {
          const htfConfirmed = c.htfConfirmations.filter(conf => conf.confirmation).length;
          return sum + (htfConfirmed / c.htfConfirmations.length);
        }, 0) / confirmations.length
      : 0;

    const ltfSuccessRate = confirmations.length > 0
      ? confirmations.reduce((sum, c) => {
          const ltfConfirmed = c.ltfConfirmations.filter(conf => conf.confirmation).length;
          return sum + (ltfConfirmed / c.ltfConfirmations.length);
        }, 0) / confirmations.length
      : 0;

    return {
      totalConfirmations: confirmations.length,
      byStatus,
      avgConfidence,
      htfSuccessRate,
      ltfSuccessRate
    };
  }

  /**
   * Clear all confirmations
   */
  clearConfirmations(): void {
    this.confirmations.clear();
  }
}

// Export singleton instance
export const multiTFOrchestrator = new MultiTFOrchestrator();


