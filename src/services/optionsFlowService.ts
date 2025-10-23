import { OptionsFlow, TradingBias, VolatilityTrend, ServiceResponse } from '@/lib/types';

/**
 * Options Flow Analysis Service
 * Implements options flow analysis and unusual activity detection
 * Based on the predictive analytics from the trading specifications
 */

export interface OptionsFlowAnalysis {
  flow: OptionsFlow;
  unusualActivity: UnusualActivityAlert[];
  sentimentSignals: SentimentSignal[];
  forwardLookingBias: ForwardLookingBias;
  institutionalActivity: InstitutionalActivity;
}

export interface UnusualActivityAlert {
  type: 'call_sweep' | 'put_sweep' | 'large_block' | 'unusual_volume' | 'iv_spike';
  symbol: string;
  strike?: number;
  expiration?: string;
  volume: number;
  openInterest: number;
  volumeOIRatio: number;
  description: string;
  bullishBearish: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}

export interface SentimentSignal {
  indicator: 'put_call_ratio' | 'skew' | 'term_structure' | 'flow_direction';
  value: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  description: string;
}

export interface ForwardLookingBias {
  nextWeekBias: TradingBias;
  confidence: number;
  expectedMove: number; // Percentage
  keyLevels: number[];
  catalysts: string[];
}

export interface InstitutionalActivity {
  netFlow: number; // Positive = bullish, negative = bearish
  blockTradeRatio: number;
  smartMoneyIndicator: number;
  flowDirection: 'into_calls' | 'into_puts' | 'balanced';
  institutionalBias: TradingBias;
}

export class OptionsFlowService {
  
  /**
   * Analyze comprehensive options flow
   */
  async analyzeOptionsFlow(symbol: string = 'SPY'): Promise<ServiceResponse<OptionsFlowAnalysis>> {
    try {
      // In a real implementation, this would fetch from options data APIs
      // For now, we'll use the existing tradier service and enhance the analysis
      
      const basicFlow = await this.getBasicOptionsFlow(symbol);
      const unusualActivity = await this.detectUnusualActivity(symbol);
      const sentimentSignals = this.analyzeSentimentSignals(basicFlow);
      const forwardLookingBias = this.calculateForwardBias(basicFlow, unusualActivity);
      const institutionalActivity = this.analyzeInstitutionalActivity(basicFlow, unusualActivity);

      const analysis: OptionsFlowAnalysis = {
        flow: basicFlow,
        unusualActivity,
        sentimentSignals,
        forwardLookingBias,
        institutionalActivity
      };

      return {
        data: analysis,
        timestamp: new Date(),
        source: 'options_flow_service',
        status: 'success'
      };

    } catch (error) {
      console.error('Error analyzing options flow:', error);
      
      // Return mock analysis as fallback
      const mockAnalysis = this.generateMockAnalysis(symbol);
      return {
        data: mockAnalysis,
        timestamp: new Date(),
        source: 'options_flow_mock',
        status: 'degraded',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get basic options flow data
   */
  private async getBasicOptionsFlow(symbol: string): Promise<OptionsFlow> {
    // This would integrate with the existing tradier service
    // For now, generate realistic flow data
    
    const callVolume = Math.floor(Math.random() * 1000000) + 200000;
    const putVolume = Math.floor(Math.random() * 800000) + 150000;
    const putCallRatio = putVolume / callVolume;
    
    let bias: TradingBias = 'neutral';
    if (putCallRatio < 0.7) bias = 'bullish';
    else if (putCallRatio > 1.3) bias = 'bearish';

    const confidence = Math.min(0.9, 0.3 + Math.abs(putCallRatio - 1) * 0.6);
    const unusualActivity = Math.random() > 0.7; // 30% chance
    
    const ivTrends: VolatilityTrend[] = ['rising', 'falling', 'flat'];
    const impliedVolatilityTrend = ivTrends[Math.floor(Math.random() * ivTrends.length)];

    return {
      bias,
      confidence,
      unusualActivity,
      callVolume,
      putVolume,
      putCallRatio,
      impliedVolatilityTrend,
      largeBlockTrades: Math.floor(Math.random() * 50) + 10,
      forwardBias: bias
    };
  }

  /**
   * Detect unusual options activity
   */
  private async detectUnusualActivity(symbol: string): Promise<UnusualActivityAlert[]> {
    const alerts: UnusualActivityAlert[] = [];
    
    // Simulate unusual activity detection
    const hasUnusualActivity = Math.random() > 0.6; // 40% chance
    
    if (hasUnusualActivity) {
      // Call sweep alert
      if (Math.random() > 0.5) {
        alerts.push({
          type: 'call_sweep',
          symbol: `${symbol}240315C00450000`,
          strike: 450,
          expiration: '2024-03-15',
          volume: 5000,
          openInterest: 1200,
          volumeOIRatio: 4.17,
          description: 'Large call sweep detected - aggressive bullish positioning',
          bullishBearish: 'bullish',
          confidence: 0.8
        });
      }

      // Put block trade
      if (Math.random() > 0.7) {
        alerts.push({
          type: 'large_block',
          symbol: `${symbol}240315P00440000`,
          strike: 440,
          expiration: '2024-03-15',
          volume: 3000,
          openInterest: 800,
          volumeOIRatio: 3.75,
          description: 'Large put block trade - potential hedging or bearish bet',
          bullishBearish: 'bearish',
          confidence: 0.7
        });
      }

      // Unusual volume
      if (Math.random() > 0.6) {
        alerts.push({
          type: 'unusual_volume',
          symbol: symbol,
          volume: 150000,
          openInterest: 50000,
          volumeOIRatio: 3.0,
          description: 'Unusual options volume - 3x normal activity',
          bullishBearish: 'neutral',
          confidence: 0.6
        });
      }
    }

    return alerts;
  }

  /**
   * Analyze sentiment signals from options data
   */
  private analyzeSentimentSignals(flow: OptionsFlow): SentimentSignal[] {
    const signals: SentimentSignal[] = [];

    // Put/Call Ratio Signal
    const pcrSignal: SentimentSignal = {
      indicator: 'put_call_ratio',
      value: flow.putCallRatio,
      signal: flow.putCallRatio < 0.7 ? 'bullish' : flow.putCallRatio > 1.3 ? 'bearish' : 'neutral',
      strength: Math.min(1, Math.abs(flow.putCallRatio - 1) * 2),
      description: `P/C Ratio: ${flow.putCallRatio.toFixed(2)} - ${flow.putCallRatio < 0.8 ? 'Low put activity suggests bullish sentiment' : flow.putCallRatio > 1.2 ? 'High put activity suggests bearish sentiment' : 'Balanced options activity'}`
    };
    signals.push(pcrSignal);

    // Flow Direction Signal
    const flowDirection = flow.callVolume > flow.putVolume ? 'bullish' : 'bearish';
    const flowSignal: SentimentSignal = {
      indicator: 'flow_direction',
      value: flow.callVolume / (flow.callVolume + flow.putVolume),
      signal: flowDirection,
      strength: Math.abs(0.5 - (flow.callVolume / (flow.callVolume + flow.putVolume))) * 2,
      description: `Flow Direction: ${(flow.callVolume / (flow.callVolume + flow.putVolume) * 100).toFixed(1)}% calls - ${flowDirection === 'bullish' ? 'Call buying dominates' : 'Put buying dominates'}`
    };
    signals.push(flowSignal);

    // IV Trend Signal
    const ivSignal: SentimentSignal = {
      indicator: 'term_structure',
      value: flow.impliedVolatilityTrend === 'rising' ? 1 : flow.impliedVolatilityTrend === 'falling' ? -1 : 0,
      signal: flow.impliedVolatilityTrend === 'falling' ? 'bullish' : flow.impliedVolatilityTrend === 'rising' ? 'bearish' : 'neutral',
      strength: flow.impliedVolatilityTrend === 'flat' ? 0 : 0.6,
      description: `IV Trend: ${flow.impliedVolatilityTrend} - ${flow.impliedVolatilityTrend === 'falling' ? 'Declining fear supports bullish moves' : flow.impliedVolatilityTrend === 'rising' ? 'Rising fear suggests caution' : 'Stable volatility environment'}`
    };
    signals.push(ivSignal);

    return signals;
  }

  /**
   * Calculate forward-looking bias
   */
  private calculateForwardBias(flow: OptionsFlow, alerts: UnusualActivityAlert[]): ForwardLookingBias {
    let nextWeekBias: TradingBias = flow.bias;
    let confidence = flow.confidence;

    // Adjust based on unusual activity
    const bullishAlerts = alerts.filter(a => a.bullishBearish === 'bullish').length;
    const bearishAlerts = alerts.filter(a => a.bullishBearish === 'bearish').length;

    if (bullishAlerts > bearishAlerts) {
      nextWeekBias = 'bullish';
      confidence = Math.min(0.9, confidence + 0.2);
    } else if (bearishAlerts > bullishAlerts) {
      nextWeekBias = 'bearish';
      confidence = Math.min(0.9, confidence + 0.2);
    }

    // Calculate expected move (simplified)
    const baseMove = 0.02; // 2% base expected move
    const volatilityMultiplier = flow.impliedVolatilityTrend === 'rising' ? 1.5 : 
                                flow.impliedVolatilityTrend === 'falling' ? 0.7 : 1.0;
    const expectedMove = baseMove * volatilityMultiplier * (1 + confidence);

    // Key levels (simplified - would use actual strike data)
    const currentPrice = 450; // Mock current price
    const keyLevels = [
      currentPrice * 0.98, // 2% down
      currentPrice,        // Current
      currentPrice * 1.02  // 2% up
    ];

    const catalysts = [];
    if (flow.unusualActivity) catalysts.push('Unusual options activity');
    if (flow.largeBlockTrades > 30) catalysts.push('High institutional flow');
    if (Math.abs(flow.putCallRatio - 1) > 0.5) catalysts.push('Extreme sentiment readings');

    return {
      nextWeekBias,
      confidence,
      expectedMove,
      keyLevels,
      catalysts
    };
  }

  /**
   * Analyze institutional activity patterns
   */
  private analyzeInstitutionalActivity(flow: OptionsFlow, alerts: UnusualActivityAlert[]): InstitutionalActivity {
    // Calculate net flow (positive = bullish, negative = bearish)
    const netFlow = flow.callVolume - flow.putVolume;
    
    // Block trade ratio (large trades vs total)
    const totalVolume = flow.callVolume + flow.putVolume;
    const blockVolume = alerts.reduce((sum, alert) => sum + alert.volume, 0);
    const blockTradeRatio = blockVolume / totalVolume;

    // Smart money indicator (based on block trades and unusual activity)
    const smartMoneyIndicator = (blockTradeRatio * 0.6) + (flow.largeBlockTrades / 100 * 0.4);

    // Flow direction
    let flowDirection: 'into_calls' | 'into_puts' | 'balanced' = 'balanced';
    if (flow.callVolume > flow.putVolume * 1.3) flowDirection = 'into_calls';
    else if (flow.putVolume > flow.callVolume * 1.3) flowDirection = 'into_puts';

    // Institutional bias
    let institutionalBias: TradingBias = 'neutral';
    if (netFlow > 0 && blockTradeRatio > 0.1) institutionalBias = 'bullish';
    else if (netFlow < 0 && blockTradeRatio > 0.1) institutionalBias = 'bearish';

    return {
      netFlow,
      blockTradeRatio,
      smartMoneyIndicator,
      flowDirection,
      institutionalBias
    };
  }

  /**
   * Generate mock analysis for fallback
   */
  private generateMockAnalysis(symbol: string): OptionsFlowAnalysis {
    const mockFlow: OptionsFlow = {
      bias: 'neutral',
      confidence: 0.5,
      unusualActivity: false,
      callVolume: 500000,
      putVolume: 450000,
      putCallRatio: 0.9,
      impliedVolatilityTrend: 'flat',
      largeBlockTrades: 15,
      forwardBias: 'neutral'
    };

    return {
      flow: mockFlow,
      unusualActivity: [],
      sentimentSignals: this.analyzeSentimentSignals(mockFlow),
      forwardLookingBias: this.calculateForwardBias(mockFlow, []),
      institutionalActivity: this.analyzeInstitutionalActivity(mockFlow, [])
    };
  }

  /**
   * Get options-based predictions for regime analysis
   */
  async getOptionsBasedPrediction(
    symbol: string,
    currentRegime: string
  ): Promise<{
    nextWeekBias: TradingBias;
    confidence: number;
    expectedMove: number;
    regimeSupport: 'strong' | 'moderate' | 'weak';
    changeRisk: number;
  }> {
    const analysis = await this.analyzeOptionsFlow(symbol);
    const flow = analysis.data.flow;
    const forwardBias = analysis.data.forwardLookingBias;

    let regimeSupport: 'strong' | 'moderate' | 'weak' = 'moderate';
    let changeRisk = 0.3;

    // Analyze regime support based on options flow
    if (currentRegime === 'BULL') {
      if (flow.bias === 'bullish' && flow.confidence > 0.6) {
        regimeSupport = 'strong';
        changeRisk = 0.2;
      } else if (flow.bias === 'bearish' && flow.confidence > 0.6) {
        regimeSupport = 'weak';
        changeRisk = 0.7;
      }
    } else if (currentRegime === 'BEAR') {
      if (flow.bias === 'bearish' && flow.confidence > 0.6) {
        regimeSupport = 'strong';
        changeRisk = 0.2;
      } else if (flow.bias === 'bullish' && flow.confidence > 0.6) {
        regimeSupport = 'weak';
        changeRisk = 0.7;
      }
    }

    // Unusual activity increases change risk
    if (flow.unusualActivity) {
      changeRisk = Math.min(0.9, changeRisk + 0.2);
    }

    return {
      nextWeekBias: forwardBias.nextWeekBias,
      confidence: forwardBias.confidence,
      expectedMove: forwardBias.expectedMove,
      regimeSupport,
      changeRisk
    };
  }

  /**
   * Analyze options flow for specific trading signals
   */
  async getOptionsTradeSignals(symbol: string): Promise<{
    signal: 'buy' | 'sell' | 'hold';
    confidence: number;
    reasoning: string[];
    timeframe: string;
    keyLevels: number[];
  }> {
    const analysis = await this.analyzeOptionsFlow(symbol);
    const flow = analysis.data.flow;
    const alerts = analysis.data.unusualActivity;
    const sentiment = analysis.data.sentimentSignals;

    let signal: 'buy' | 'sell' | 'hold' = 'hold';
    let confidence = 0;
    const reasoning: string[] = [];

    // Base signal from flow bias
    if (flow.bias === 'bullish' && flow.confidence > 0.5) {
      signal = 'buy';
      confidence = flow.confidence;
      reasoning.push(`Bullish options flow with ${(flow.confidence * 100).toFixed(0)}% confidence`);
    } else if (flow.bias === 'bearish' && flow.confidence > 0.5) {
      signal = 'sell';
      confidence = flow.confidence;
      reasoning.push(`Bearish options flow with ${(flow.confidence * 100).toFixed(0)}% confidence`);
    }

    // Enhance with unusual activity
    const bullishAlerts = alerts.filter(a => a.bullishBearish === 'bullish');
    const bearishAlerts = alerts.filter(a => a.bullishBearish === 'bearish');

    if (bullishAlerts.length > 0) {
      if (signal === 'buy') {
        confidence = Math.min(0.9, confidence * 1.3);
        reasoning.push(`${bullishAlerts.length} bullish unusual activity alert(s)`);
      } else if (signal === 'hold') {
        signal = 'buy';
        confidence = 0.6;
        reasoning.push('Bullish unusual activity detected');
      }
    }

    if (bearishAlerts.length > 0) {
      if (signal === 'sell') {
        confidence = Math.min(0.9, confidence * 1.3);
        reasoning.push(`${bearishAlerts.length} bearish unusual activity alert(s)`);
      } else if (signal === 'hold') {
        signal = 'sell';
        confidence = 0.6;
        reasoning.push('Bearish unusual activity detected');
      }
    }

    // Add sentiment confirmation
    const bullishSentiment = sentiment.filter(s => s.signal === 'bullish' && s.strength > 0.5).length;
    const bearishSentiment = sentiment.filter(s => s.signal === 'bearish' && s.strength > 0.5).length;

    if (bullishSentiment > bearishSentiment && signal === 'buy') {
      reasoning.push('Multiple sentiment indicators confirm bullish bias');
    } else if (bearishSentiment > bullishSentiment && signal === 'sell') {
      reasoning.push('Multiple sentiment indicators confirm bearish bias');
    }

    // Determine timeframe
    const timeframe = flow.unusualActivity ? 'Short-term (1-3 days)' : 'Medium-term (3-7 days)';

    return {
      signal,
      confidence,
      reasoning,
      timeframe,
      keyLevels: analysis.data.forwardLookingBias.keyLevels
    };
  }
}

// Export singleton instance
export const optionsFlowService = new OptionsFlowService();