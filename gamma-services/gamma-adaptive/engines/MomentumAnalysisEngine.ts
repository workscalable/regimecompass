import { EventEmitter } from 'events';

/**
 * Momentum Analysis Engine - Advanced momentum divergence detection
 * Analyzes price vs momentum indicator divergences for signal confirmation
 */
export class MomentumAnalysisEngine extends EventEmitter {
  private readonly MOMENTUM_INDICATORS = {
    RSI: { period: 14, weight: 0.25, overbought: 70, oversold: 30 },
    STOCH: { kPeriod: 14, dPeriod: 3, weight: 0.20, overbought: 80, oversold: 20 },
    CCI: { period: 20, weight: 0.15, overbought: 100, oversold: -100 },
    WILLIAMS_R: { period: 14, weight: 0.15, overbought: -20, oversold: -80 },
    MACD: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, weight: 0.25 }
  };

  private readonly DIVERGENCE_LOOKBACK = 20; // Periods to look back for divergence
  private readonly MIN_DIVERGENCE_STRENGTH = 0.3; // Minimum strength to consider valid

  /**
   * Analyze momentum divergence between price and momentum indicators
   */
  public async analyzeMomentumDivergence(ticker: string): Promise<MomentumDivergenceResult> {
    try {
      // Get price data and calculate momentum indicators
      const priceData = await this.getPriceData(ticker, 100);
      const momentumData = await this.calculateAllMomentumIndicators(priceData);

      // Analyze divergence for each indicator
      const divergenceAnalysis = {
        rsi: this.analyzeRSIDivergence(priceData, momentumData.rsi),
        stochastic: this.analyzeStochasticDivergence(priceData, momentumData.stochastic),
        cci: this.analyzeCCIDivergence(priceData, momentumData.cci),
        williamsR: this.analyzeWilliamsRDivergence(priceData, momentumData.williamsR),
        macd: this.analyzeMACDDivergence(priceData, momentumData.macd)
      };

      // Calculate composite divergence score
      const compositeScore = this.calculateCompositeDivergence(divergenceAnalysis);
      
      // Determine overall divergence type and strength
      const overallType = this.determineOverallDivergenceType(divergenceAnalysis);
      const overallStrength = this.calculateOverallStrength(divergenceAnalysis);
      
      // Calculate momentum alignment across indicators
      const alignment = this.calculateMomentumAlignment(momentumData);
      
      // Get momentum regime context
      const regimeContext = this.getMomentumRegimeContext(momentumData);
      
      // Calculate confidence based on agreement between indicators
      const confidence = this.calculateDivergenceConfidence(divergenceAnalysis, alignment);

      const result: MomentumDivergenceResult = {
        ticker,
        compositeScore: Number(compositeScore.toFixed(3)),
        divergenceType: overallType,
        strength: Number(overallStrength.toFixed(3)),
        confidence: Number(confidence.toFixed(3)),
        alignment: Number(alignment.toFixed(3)),
        regimeContext,
        indicators: divergenceAnalysis,
        momentumValues: this.getCurrentMomentumValues(momentumData),
        timestamp: new Date()
      };

      this.emit('momentum:analyzed', result);
      return result;

    } catch (error) {
      console.error(`Error analyzing momentum divergence for ${ticker}:`, error);
      return this.getDefaultMomentumResult(ticker);
    }
  }

  /**
   * Calculate all momentum indicators
   */
  private async calculateAllMomentumIndicators(priceData: PriceBar[]): Promise<MomentumIndicatorData> {
    return {
      rsi: this.calculateRSI(priceData, this.MOMENTUM_INDICATORS.RSI.period),
      stochastic: this.calculateStochastic(priceData, 
        this.MOMENTUM_INDICATORS.STOCH.kPeriod, 
        this.MOMENTUM_INDICATORS.STOCH.dPeriod),
      cci: this.calculateCCI(priceData, this.MOMENTUM_INDICATORS.CCI.period),
      williamsR: this.calculateWilliamsR(priceData, this.MOMENTUM_INDICATORS.WILLIAMS_R.period),
      macd: this.calculateMACD(priceData, 
        this.MOMENTUM_INDICATORS.MACD.fastPeriod,
        this.MOMENTUM_INDICATORS.MACD.slowPeriod,
        this.MOMENTUM_INDICATORS.MACD.signalPeriod)
    };
  }

  /**
   * Analyze RSI divergence
   */
  private analyzeRSIDivergence(priceData: PriceBar[], rsiData: number[]): DivergenceAnalysis {
    const recentPriceData = priceData.slice(-this.DIVERGENCE_LOOKBACK);
    const recentRSIData = rsiData.slice(-this.DIVERGENCE_LOOKBACK);

    if (recentPriceData.length < 10 || recentRSIData.length < 10) {
      return { type: 'NONE', strength: 0, confidence: 0, description: 'Insufficient data' };
    }

    // Find price and RSI peaks/troughs
    const priceHighs = this.findPeaks(recentPriceData.map(bar => bar.high));
    const priceLows = this.findTroughs(recentPriceData.map(bar => bar.low));
    const rsiHighs = this.findPeaks(recentRSIData);
    const rsiLows = this.findTroughs(recentRSIData);

    // Check for bullish divergence (price lower low, RSI higher low)
    const bullishDivergence = this.detectBullishDivergence(priceLows, rsiLows);
    
    // Check for bearish divergence (price higher high, RSI lower high)
    const bearishDivergence = this.detectBearishDivergence(priceHighs, rsiHighs);

    if (bullishDivergence.detected && bullishDivergence.strength > this.MIN_DIVERGENCE_STRENGTH) {
      return {
        type: 'BULLISH',
        strength: bullishDivergence.strength,
        confidence: bullishDivergence.confidence,
        description: `RSI bullish divergence: Price made lower low while RSI made higher low`
      };
    } else if (bearishDivergence.detected && bearishDivergence.strength > this.MIN_DIVERGENCE_STRENGTH) {
      return {
        type: 'BEARISH',
        strength: bearishDivergence.strength,
        confidence: bearishDivergence.confidence,
        description: `RSI bearish divergence: Price made higher high while RSI made lower high`
      };
    }

    return { type: 'NONE', strength: 0, confidence: 0, description: 'No significant RSI divergence detected' };
  }

  /**
   * Analyze Stochastic divergence
   */
  private analyzeStochasticDivergence(priceData: PriceBar[], stochData: StochasticData): DivergenceAnalysis {
    const recentPriceData = priceData.slice(-this.DIVERGENCE_LOOKBACK);
    const recentStochK = stochData.k.slice(-this.DIVERGENCE_LOOKBACK);

    if (recentPriceData.length < 10 || recentStochK.length < 10) {
      return { type: 'NONE', strength: 0, confidence: 0, description: 'Insufficient stochastic data' };
    }

    const priceHighs = this.findPeaks(recentPriceData.map(bar => bar.high));
    const priceLows = this.findTroughs(recentPriceData.map(bar => bar.low));
    const stochHighs = this.findPeaks(recentStochK);
    const stochLows = this.findTroughs(recentStochK);

    const bullishDivergence = this.detectBullishDivergence(priceLows, stochLows);
    const bearishDivergence = this.detectBearishDivergence(priceHighs, stochHighs);

    if (bullishDivergence.detected && bullishDivergence.strength > this.MIN_DIVERGENCE_STRENGTH) {
      return {
        type: 'BULLISH',
        strength: bullishDivergence.strength,
        confidence: bullishDivergence.confidence,
        description: `Stochastic bullish divergence detected`
      };
    } else if (bearishDivergence.detected && bearishDivergence.strength > this.MIN_DIVERGENCE_STRENGTH) {
      return {
        type: 'BEARISH',
        strength: bearishDivergence.strength,
        confidence: bearishDivergence.confidence,
        description: `Stochastic bearish divergence detected`
      };
    }

    return { type: 'NONE', strength: 0, confidence: 0, description: 'No significant stochastic divergence' };
  }

  /**
   * Analyze CCI divergence
   */
  private analyzeCCIDivergence(priceData: PriceBar[], cciData: number[]): DivergenceAnalysis {
    const recentPriceData = priceData.slice(-this.DIVERGENCE_LOOKBACK);
    const recentCCIData = cciData.slice(-this.DIVERGENCE_LOOKBACK);

    if (recentPriceData.length < 10 || recentCCIData.length < 10) {
      return { type: 'NONE', strength: 0, confidence: 0, description: 'Insufficient CCI data' };
    }

    const priceHighs = this.findPeaks(recentPriceData.map(bar => bar.high));
    const priceLows = this.findTroughs(recentPriceData.map(bar => bar.low));
    const cciHighs = this.findPeaks(recentCCIData);
    const cciLows = this.findTroughs(recentCCIData);

    const bullishDivergence = this.detectBullishDivergence(priceLows, cciLows);
    const bearishDivergence = this.detectBearishDivergence(priceHighs, cciHighs);

    if (bullishDivergence.detected && bullishDivergence.strength > this.MIN_DIVERGENCE_STRENGTH) {
      return {
        type: 'BULLISH',
        strength: bullishDivergence.strength,
        confidence: bullishDivergence.confidence,
        description: `CCI bullish divergence detected`
      };
    } else if (bearishDivergence.detected && bearishDivergence.strength > this.MIN_DIVERGENCE_STRENGTH) {
      return {
        type: 'BEARISH',
        strength: bearishDivergence.strength,
        confidence: bearishDivergence.confidence,
        description: `CCI bearish divergence detected`
      };
    }

    return { type: 'NONE', strength: 0, confidence: 0, description: 'No significant CCI divergence' };
  }

  /**
   * Analyze Williams %R divergence
   */
  private analyzeWilliamsRDivergence(priceData: PriceBar[], williamsData: number[]): DivergenceAnalysis {
    const recentPriceData = priceData.slice(-this.DIVERGENCE_LOOKBACK);
    const recentWilliamsData = williamsData.slice(-this.DIVERGENCE_LOOKBACK);

    if (recentPriceData.length < 10 || recentWilliamsData.length < 10) {
      return { type: 'NONE', strength: 0, confidence: 0, description: 'Insufficient Williams %R data' };
    }

    const priceHighs = this.findPeaks(recentPriceData.map(bar => bar.high));
    const priceLows = this.findTroughs(recentPriceData.map(bar => bar.low));
    const williamsHighs = this.findPeaks(recentWilliamsData);
    const williamsLows = this.findTroughs(recentWilliamsData);

    const bullishDivergence = this.detectBullishDivergence(priceLows, williamsLows);
    const bearishDivergence = this.detectBearishDivergence(priceHighs, williamsHighs);

    if (bullishDivergence.detected && bullishDivergence.strength > this.MIN_DIVERGENCE_STRENGTH) {
      return {
        type: 'BULLISH',
        strength: bullishDivergence.strength,
        confidence: bullishDivergence.confidence,
        description: `Williams %R bullish divergence detected`
      };
    } else if (bearishDivergence.detected && bearishDivergence.strength > this.MIN_DIVERGENCE_STRENGTH) {
      return {
        type: 'BEARISH',
        strength: bearishDivergence.strength,
        confidence: bearishDivergence.confidence,
        description: `Williams %R bearish divergence detected`
      };
    }

    return { type: 'NONE', strength: 0, confidence: 0, description: 'No significant Williams %R divergence' };
  }

  /**
   * Analyze MACD divergence
   */
  private analyzeMACDDivergence(priceData: PriceBar[], macdData: MACDData): DivergenceAnalysis {
    const recentPriceData = priceData.slice(-this.DIVERGENCE_LOOKBACK);
    const recentMACDHistogram = macdData.histogram.slice(-this.DIVERGENCE_LOOKBACK);

    if (recentPriceData.length < 10 || recentMACDHistogram.length < 10) {
      return { type: 'NONE', strength: 0, confidence: 0, description: 'Insufficient MACD data' };
    }

    const priceHighs = this.findPeaks(recentPriceData.map(bar => bar.high));
    const priceLows = this.findTroughs(recentPriceData.map(bar => bar.low));
    const macdHighs = this.findPeaks(recentMACDHistogram);
    const macdLows = this.findTroughs(recentMACDHistogram);

    const bullishDivergence = this.detectBullishDivergence(priceLows, macdLows);
    const bearishDivergence = this.detectBearishDivergence(priceHighs, macdHighs);

    if (bullishDivergence.detected && bullishDivergence.strength > this.MIN_DIVERGENCE_STRENGTH) {
      return {
        type: 'BULLISH',
        strength: bullishDivergence.strength,
        confidence: bullishDivergence.confidence,
        description: `MACD bullish divergence detected`
      };
    } else if (bearishDivergence.detected && bearishDivergence.strength > this.MIN_DIVERGENCE_STRENGTH) {
      return {
        type: 'BEARISH',
        strength: bearishDivergence.strength,
        confidence: bearishDivergence.confidence,
        description: `MACD bearish divergence detected`
      };
    }

    return { type: 'NONE', strength: 0, confidence: 0, description: 'No significant MACD divergence' };
  }

  /**
   * Calculate composite divergence score from all indicators
   */
  private calculateCompositeDivergence(analysis: Record<string, DivergenceAnalysis>): number {
    let weightedSum = 0;
    let totalWeight = 0;

    Object.entries(analysis).forEach(([indicator, divergence]) => {
      const weight = this.getIndicatorWeight(indicator);
      const score = this.getDivergenceScore(divergence);
      
      weightedSum += score * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Get indicator weight for composite calculation
   */
  private getIndicatorWeight(indicator: string): number {
    const weights: Record<string, number> = {
      'rsi': this.MOMENTUM_INDICATORS.RSI.weight,
      'stochastic': this.MOMENTUM_INDICATORS.STOCH.weight,
      'cci': this.MOMENTUM_INDICATORS.CCI.weight,
      'williamsR': this.MOMENTUM_INDICATORS.WILLIAMS_R.weight,
      'macd': this.MOMENTUM_INDICATORS.MACD.weight
    };
    
    return weights[indicator] || 0.2;
  }

  /**
   * Convert divergence analysis to numerical score
   */
  private getDivergenceScore(divergence: DivergenceAnalysis): number {
    if (divergence.type === 'BULLISH') {
      return 0.5 + (divergence.strength * 0.5); // 0.5 to 1.0
    } else if (divergence.type === 'BEARISH') {
      return 0.5 - (divergence.strength * 0.5); // 0.0 to 0.5
    } else {
      return 0.5; // Neutral
    }
  }

  /**
   * Determine overall divergence type
   */
  private determineOverallDivergenceType(analysis: Record<string, DivergenceAnalysis>): DivergenceType {
    const bullishCount = Object.values(analysis).filter(d => d.type === 'BULLISH').length;
    const bearishCount = Object.values(analysis).filter(d => d.type === 'BEARISH').length;

    if (bullishCount > bearishCount && bullishCount >= 2) {
      return 'BULLISH';
    } else if (bearishCount > bullishCount && bearishCount >= 2) {
      return 'BEARISH';
    } else {
      return 'NONE';
    }
  }

  /**
   * Calculate overall divergence strength
   */
  private calculateOverallStrength(analysis: Record<string, DivergenceAnalysis>): number {
    const strengths = Object.values(analysis)
      .filter(d => d.type !== 'NONE')
      .map(d => d.strength);
    
    return strengths.length > 0 ? 
      strengths.reduce((sum, strength) => sum + strength, 0) / strengths.length : 0;
  }

  /**
   * Calculate momentum alignment across indicators
   */
  private calculateMomentumAlignment(momentumData: MomentumIndicatorData): number {
    const currentRSI = momentumData.rsi[momentumData.rsi.length - 1];
    const currentStochK = momentumData.stochastic.k[momentumData.stochastic.k.length - 1];
    const currentCCI = momentumData.cci[momentumData.cci.length - 1];
    const currentWilliamsR = momentumData.williamsR[momentumData.williamsR.length - 1];
    const currentMACDHistogram = momentumData.macd.histogram[momentumData.macd.histogram.length - 1];

    // Normalize indicators to 0-1 scale for comparison
    const normalizedRSI = currentRSI / 100;
    const normalizedStoch = currentStochK / 100;
    const normalizedCCI = Math.max(0, Math.min(1, (currentCCI + 200) / 400)); // CCI range -200 to +200
    const normalizedWilliams = (currentWilliamsR + 100) / 100; // Williams %R range -100 to 0
    const normalizedMACD = Math.max(0, Math.min(1, (currentMACDHistogram + 1) / 2)); // Approximate normalization

    const indicators = [normalizedRSI, normalizedStoch, normalizedCCI, normalizedWilliams, normalizedMACD];
    
    // Calculate standard deviation (lower = better alignment)
    const mean = indicators.reduce((sum, val) => sum + val, 0) / indicators.length;
    const variance = indicators.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / indicators.length;
    const stdDev = Math.sqrt(variance);
    
    // Convert to alignment score (0-1, higher = better alignment)
    return Math.max(0, 1 - (stdDev * 2));
  }

  /**
   * Get momentum regime context
   */
  private getMomentumRegimeContext(momentumData: MomentumIndicatorData): MomentumRegime {
    const currentRSI = momentumData.rsi[momentumData.rsi.length - 1];
    const currentStochK = momentumData.stochastic.k[momentumData.stochastic.k.length - 1];
    
    if (currentRSI > 70 && currentStochK > 80) {
      return 'OVERBOUGHT';
    } else if (currentRSI < 30 && currentStochK < 20) {
      return 'OVERSOLD';
    } else if (currentRSI > 50 && currentStochK > 50) {
      return 'BULLISH';
    } else if (currentRSI < 50 && currentStochK < 50) {
      return 'BEARISH';
    } else {
      return 'NEUTRAL';
    }
  }

  /**
   * Calculate divergence confidence
   */
  private calculateDivergenceConfidence(analysis: Record<string, DivergenceAnalysis>, alignment: number): number {
    const validDivergences = Object.values(analysis).filter(d => d.type !== 'NONE');
    
    if (validDivergences.length === 0) {
      return 0.3; // Low confidence when no divergences
    }

    // Average confidence of valid divergences
    const avgConfidence = validDivergences.reduce((sum, d) => sum + d.confidence, 0) / validDivergences.length;
    
    // Boost confidence when multiple indicators agree
    const agreementBonus = validDivergences.length >= 3 ? 0.2 : validDivergences.length >= 2 ? 0.1 : 0;
    
    // Factor in momentum alignment
    const alignmentBonus = alignment * 0.2;
    
    return Math.min(1, avgConfidence + agreementBonus + alignmentBonus);
  }

  /**
   * Get current momentum values for display
   */
  private getCurrentMomentumValues(momentumData: MomentumIndicatorData): CurrentMomentumValues {
    return {
      rsi: Number(momentumData.rsi[momentumData.rsi.length - 1].toFixed(2)),
      stochasticK: Number(momentumData.stochastic.k[momentumData.stochastic.k.length - 1].toFixed(2)),
      stochasticD: Number(momentumData.stochastic.d[momentumData.stochastic.d.length - 1].toFixed(2)),
      cci: Number(momentumData.cci[momentumData.cci.length - 1].toFixed(2)),
      williamsR: Number(momentumData.williamsR[momentumData.williamsR.length - 1].toFixed(2)),
      macdLine: Number(momentumData.macd.macd[momentumData.macd.macd.length - 1].toFixed(4)),
      macdSignal: Number(momentumData.macd.signal[momentumData.macd.signal.length - 1].toFixed(4)),
      macdHistogram: Number(momentumData.macd.histogram[momentumData.macd.histogram.length - 1].toFixed(4))
    };
  }

  // Technical indicator calculations
  private calculateRSI(priceData: PriceBar[], period: number): number[] {
    const rsi: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate price changes
    for (let i = 1; i < priceData.length; i++) {
      const change = priceData[i].close - priceData[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    if (gains.length < period) return [];

    // Calculate initial average gain and loss
    let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

    // Calculate RSI values
    for (let i = period; i < gains.length; i++) {
      avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;

      const rs = avgGain / (avgLoss || 0.0001); // Avoid division by zero
      const rsiValue = 100 - (100 / (1 + rs));
      rsi.push(rsiValue);
    }

    return rsi;
  }

  private calculateStochastic(priceData: PriceBar[], kPeriod: number, dPeriod: number): StochasticData {
    const kValues: number[] = [];
    
    // Calculate %K values
    for (let i = kPeriod - 1; i < priceData.length; i++) {
      const periodData = priceData.slice(i - kPeriod + 1, i + 1);
      const highestHigh = Math.max(...periodData.map(bar => bar.high));
      const lowestLow = Math.min(...periodData.map(bar => bar.low));
      const currentClose = priceData[i].close;
      
      const kValue = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
      kValues.push(kValue);
    }
    
    // Calculate %D values (SMA of %K)
    const dValues: number[] = [];
    for (let i = dPeriod - 1; i < kValues.length; i++) {
      const dValue = kValues.slice(i - dPeriod + 1, i + 1).reduce((sum, val) => sum + val, 0) / dPeriod;
      dValues.push(dValue);
    }
    
    return { k: kValues, d: dValues };
  }

  private calculateCCI(priceData: PriceBar[], period: number): number[] {
    const cci: number[] = [];
    
    for (let i = period - 1; i < priceData.length; i++) {
      const periodData = priceData.slice(i - period + 1, i + 1);
      
      // Calculate typical prices
      const typicalPrices = periodData.map(bar => (bar.high + bar.low + bar.close) / 3);
      
      // Calculate SMA of typical prices
      const smaTP = typicalPrices.reduce((sum, tp) => sum + tp, 0) / period;
      
      // Calculate mean deviation
      const meanDeviation = typicalPrices.reduce((sum, tp) => sum + Math.abs(tp - smaTP), 0) / period;
      
      // Calculate CCI
      const currentTP = typicalPrices[typicalPrices.length - 1];
      const cciValue = (currentTP - smaTP) / (0.015 * meanDeviation);
      
      cci.push(cciValue);
    }
    
    return cci;
  }

  private calculateWilliamsR(priceData: PriceBar[], period: number): number[] {
    const williamsR: number[] = [];
    
    for (let i = period - 1; i < priceData.length; i++) {
      const periodData = priceData.slice(i - period + 1, i + 1);
      const highestHigh = Math.max(...periodData.map(bar => bar.high));
      const lowestLow = Math.min(...periodData.map(bar => bar.low));
      const currentClose = priceData[i].close;
      
      const wrValue = ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
      williamsR.push(wrValue);
    }
    
    return williamsR;
  }

  private calculateMACD(priceData: PriceBar[], fastPeriod: number, slowPeriod: number, signalPeriod: number): MACDData {
    // Calculate EMAs
    const fastEMA = this.calculateEMAArray(priceData.map(bar => bar.close), fastPeriod);
    const slowEMA = this.calculateEMAArray(priceData.map(bar => bar.close), slowPeriod);
    
    // Calculate MACD line
    const macdLine: number[] = [];
    const startIndex = slowPeriod - fastPeriod;
    
    for (let i = 0; i < fastEMA.length - startIndex; i++) {
      macdLine.push(fastEMA[i + startIndex] - slowEMA[i]);
    }
    
    // Calculate signal line (EMA of MACD)
    const signalLine = this.calculateEMAArray(macdLine, signalPeriod);
    
    // Calculate histogram
    const histogram: number[] = [];
    const signalStartIndex = signalPeriod - 1;
    
    for (let i = 0; i < macdLine.length - signalStartIndex; i++) {
      histogram.push(macdLine[i + signalStartIndex] - signalLine[i]);
    }
    
    return {
      macd: macdLine,
      signal: signalLine,
      histogram
    };
  }

  private calculateEMAArray(values: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // Start with SMA for first value
    let sum = 0;
    for (let i = 0; i < period && i < values.length; i++) {
      sum += values[i];
    }
    ema.push(sum / Math.min(period, values.length));
    
    // Calculate EMA for remaining values
    for (let i = period; i < values.length; i++) {
      const currentEMA = (values[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
      ema.push(currentEMA);
    }
    
    return ema;
  }

  // Peak and trough detection
  private findPeaks(data: number[]): Array<{ index: number; value: number }> {
    const peaks: Array<{ index: number; value: number }> = [];
    
    for (let i = 1; i < data.length - 1; i++) {
      if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
        peaks.push({ index: i, value: data[i] });
      }
    }
    
    return peaks.slice(-5); // Return last 5 peaks
  }

  private findTroughs(data: number[]): Array<{ index: number; value: number }> {
    const troughs: Array<{ index: number; value: number }> = [];
    
    for (let i = 1; i < data.length - 1; i++) {
      if (data[i] < data[i - 1] && data[i] < data[i + 1]) {
        troughs.push({ index: i, value: data[i] });
      }
    }
    
    return troughs.slice(-5); // Return last 5 troughs
  }

  // Divergence detection
  private detectBullishDivergence(
    priceLows: Array<{ index: number; value: number }>,
    indicatorLows: Array<{ index: number; value: number }>
  ): { detected: boolean; strength: number; confidence: number } {
    if (priceLows.length < 2 || indicatorLows.length < 2) {
      return { detected: false, strength: 0, confidence: 0 };
    }

    // Get the two most recent lows
    const recentPriceLows = priceLows.slice(-2);
    const recentIndicatorLows = indicatorLows.slice(-2);

    // Check if price made lower low while indicator made higher low
    const priceLowerLow = recentPriceLows[1].value < recentPriceLows[0].value;
    const indicatorHigherLow = recentIndicatorLows[1].value > recentIndicatorLows[0].value;

    if (priceLowerLow && indicatorHigherLow) {
      // Calculate strength based on the magnitude of divergence
      const priceChange = Math.abs(recentPriceLows[1].value - recentPriceLows[0].value) / recentPriceLows[0].value;
      const indicatorChange = Math.abs(recentIndicatorLows[1].value - recentIndicatorLows[0].value) / Math.abs(recentIndicatorLows[0].value);
      
      const strength = Math.min(1, (priceChange + indicatorChange) * 2);
      const confidence = Math.min(1, strength * 0.8 + 0.2);
      
      return { detected: true, strength, confidence };
    }

    return { detected: false, strength: 0, confidence: 0 };
  }

  private detectBearishDivergence(
    priceHighs: Array<{ index: number; value: number }>,
    indicatorHighs: Array<{ index: number; value: number }>
  ): { detected: boolean; strength: number; confidence: number } {
    if (priceHighs.length < 2 || indicatorHighs.length < 2) {
      return { detected: false, strength: 0, confidence: 0 };
    }

    // Get the two most recent highs
    const recentPriceHighs = priceHighs.slice(-2);
    const recentIndicatorHighs = indicatorHighs.slice(-2);

    // Check if price made higher high while indicator made lower high
    const priceHigherHigh = recentPriceHighs[1].value > recentPriceHighs[0].value;
    const indicatorLowerHigh = recentIndicatorHighs[1].value < recentIndicatorHighs[0].value;

    if (priceHigherHigh && indicatorLowerHigh) {
      // Calculate strength based on the magnitude of divergence
      const priceChange = Math.abs(recentPriceHighs[1].value - recentPriceHighs[0].value) / recentPriceHighs[0].value;
      const indicatorChange = Math.abs(recentIndicatorHighs[1].value - recentIndicatorHighs[0].value) / Math.abs(recentIndicatorHighs[0].value);
      
      const strength = Math.min(1, (priceChange + indicatorChange) * 2);
      const confidence = Math.min(1, strength * 0.8 + 0.2);
      
      return { detected: true, strength, confidence };
    }

    return { detected: false, strength: 0, confidence: 0 };
  }

  // Utility methods
  private async getPriceData(ticker: string, periods: number): Promise<PriceBar[]> {
    // TODO: Integrate with actual market data service
    // Mock data generation for demonstration
    const mockData: PriceBar[] = [];
    const basePrice = 100;
    let currentPrice = basePrice;
    
    for (let i = 0; i < periods; i++) {
      const change = (Math.random() - 0.5) * 0.02; // ±1% random change
      currentPrice *= (1 + change);
      
      const high = currentPrice * (1 + Math.random() * 0.01);
      const low = currentPrice * (1 - Math.random() * 0.01);
      
      mockData.push({
        timestamp: new Date(Date.now() - (periods - i) * 3600000), // 1 hour intervals
        open: i === 0 ? basePrice : mockData[i - 1].close,
        high,
        low,
        close: currentPrice,
        volume: Math.floor(Math.random() * 1000000)
      });
    }
    
    return mockData;
  }

  private getDefaultMomentumResult(ticker: string): MomentumDivergenceResult {
    return {
      ticker,
      compositeScore: 0.5,
      divergenceType: 'NONE',
      strength: 0,
      confidence: 0.3,
      alignment: 0.5,
      regimeContext: 'NEUTRAL',
      indicators: {
        rsi: { type: 'NONE', strength: 0, confidence: 0, description: 'No data' },
        stochastic: { type: 'NONE', strength: 0, confidence: 0, description: 'No data' },
        cci: { type: 'NONE', strength: 0, confidence: 0, description: 'No data' },
        williamsR: { type: 'NONE', strength: 0, confidence: 0, description: 'No data' },
        macd: { type: 'NONE', strength: 0, confidence: 0, description: 'No data' }
      },
      momentumValues: {
        rsi: 50,
        stochasticK: 50,
        stochasticD: 50,
        cci: 0,
        williamsR: -50,
        macdLine: 0,
        macdSignal: 0,
        macdHistogram: 0
      },
      timestamp: new Date()
    };
  }
}

// Supporting interfaces and types
export interface MomentumDivergenceResult {
  ticker: string;
  compositeScore: number;
  divergenceType: DivergenceType;
  strength: number;
  confidence: number;
  alignment: number;
  regimeContext: MomentumRegime;
  indicators: Record<string, DivergenceAnalysis>;
  momentumValues: CurrentMomentumValues;
  timestamp: Date;
}

export interface DivergenceAnalysis {
  type: DivergenceType;
  strength: number;
  confidence: number;
  description: string;
}

export interface MomentumIndicatorData {
  rsi: number[];
  stochastic: StochasticData;
  cci: number[];
  williamsR: number[];
  macd: MACDData;
}

export interface StochasticData {
  k: number[];
  d: number[];
}

export interface MACDData {
  macd: number[];
  signal: number[];
  histogram: number[];
}

export interface CurrentMomentumValues {
  rsi: number;
  stochasticK: number;
  stochasticD: number;
  cci: number;
  williamsR: number;
  macdLine: number;
  macdSignal: number;
  macdHistogram: number;
}

export type DivergenceType = 'BULLISH' | 'BEARISH' | 'NONE';
export type MomentumRegime = 'OVERBOUGHT' | 'OVERSOLD' | 'BULLISH' | 'BEARISH' | 'NEUTRAL';

interface PriceBar {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}