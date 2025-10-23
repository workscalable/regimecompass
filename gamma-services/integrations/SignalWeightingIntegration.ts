import { EnhancedSignalWeightingEngine, ConfidenceFactors } from '../signals/EnhancedSignalWeightingEngine';
import { EventBus } from '../core/EventBus';

// Integration layer between existing SignalWeightingEngine and enhanced multi-ticker version
export class SignalWeightingIntegration {
  private enhancedEngine: EnhancedSignalWeightingEngine;
  private eventBus: EventBus;
  private isInitialized: boolean = false;
  private tickerDataCache: Map<string, any> = new Map();
  private lastUpdateTime: Map<string, number> = new Map();
  private updateThrottleMs: number = 1000; // Throttle updates to prevent spam

  constructor(eventBus: EventBus, enhancedEngine?: EnhancedSignalWeightingEngine) {
    this.eventBus = eventBus;
    this.enhancedEngine = enhancedEngine || new EnhancedSignalWeightingEngine();
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Enable paper trading integration
    this.enhancedEngine.enablePaperTradingIntegration();

    // Set up event listeners for existing system integration
    this.setupExistingSystemListeners();

    // Set up enhanced engine event listeners
    this.setupEnhancedEngineListeners();

    this.isInitialized = true;
    console.log('📊 SignalWeighting Integration initialized');
  }

  private setupExistingSystemListeners(): void {
    // Listen for existing system confidence updates
    this.eventBus.on('signal:confidence:computed', (data) => {
      this.handleExistingConfidenceUpdate(data);
    });

    // Listen for existing system technical analysis updates
    this.eventBus.on('technical:analysis:update', (data) => {
      this.handleTechnicalAnalysisUpdate(data);
    });

    // Listen for existing system regime updates
    this.eventBus.on('regime:compass:update', (data) => {
      this.handleRegimeCompassUpdate(data);
    });

    // Listen for existing system breadth updates
    this.eventBus.on('breadth:update', (data) => {
      this.handleBreadthUpdate(data);
    });

    // Listen for existing system sector analysis
    this.eventBus.on('sector:analysis:update', (data) => {
      this.handleSectorAnalysisUpdate(data);
    });

    // Listen for existing system volume analysis
    this.eventBus.on('volume:analysis:update', (data) => {
      this.handleVolumeAnalysisUpdate(data);
    });
  }

  private setupEnhancedEngineListeners(): void {
    // Listen for enhanced engine multi-ticker confidence updates
    this.eventBus.on('confidence:multi-ticker', (data) => {
      this.handleMultiTickerConfidence(data);
    });

    // Listen for enhanced engine ticker-specific confidence updates
    this.eventBus.on('confidence:ticker', (data) => {
      this.handleTickerConfidence(data);
    });
  }

  // Handle updates from existing SignalWeightingEngine
  private handleExistingConfidenceUpdate(data: any): void {
    const { ticker, confidence, confidenceDelta, breakdown } = data;
    
    if (!ticker) return;

    // Convert existing confidence data to enhanced format
    const factors = this.convertToConfidenceFactors(data);
    
    // Check throttling
    if (this.shouldThrottleUpdate(ticker)) return;

    // Compute enhanced confidence
    const enhancedResult = this.enhancedEngine.computeTickerConfidence(ticker, factors);

    // Emit enhanced confidence update
    this.eventBus.emit('engine:confidence', {
      ticker,
      confidence: enhancedResult.confidence * 100, // Convert back to percentage for compatibility
      confidenceDelta: enhancedResult.confidenceDelta * 100,
      breakdown: enhancedResult.breakdown,
      reliability: enhancedResult.reliability,
      source: 'ENHANCED_ENGINE',
      timestamp: new Date()
    });

    this.lastUpdateTime.set(ticker, Date.now());
  }

  private convertToConfidenceFactors(data: any): ConfidenceFactors {
    // Convert existing system data to ConfidenceFactors format
    const cachedData = this.tickerDataCache.get(data.ticker) || {};
    
    return {
      trendStrength: this.normalizeValue(data.breakdown?.trendStrength || cachedData.trendStrength || 0.5),
      volumeConfirmation: this.normalizeValue(data.breakdown?.volumeConfirmation || cachedData.volumeConfirmation || 0.5),
      supportResistance: this.normalizeValue(data.breakdown?.supportResistance || cachedData.supportResistance || 0.5),
      momentumAlignment: this.normalizeValue(data.breakdown?.momentumAlignment || cachedData.momentumAlignment || 0.5),
      volatilityEnvironment: this.normalizeValue(data.breakdown?.volatilityEnvironment || cachedData.volatilityEnvironment || 0.5),
      marketBreadth: this.normalizeValue(cachedData.marketBreadth || 0.5),
      regimeAlignment: this.normalizeValue(cachedData.regimeAlignment || 0.5),
      sectorStrength: this.normalizeValue(cachedData.sectorStrength || 0.5)
    };
  }

  private normalizeValue(value: number): number {
    // Ensure value is between 0 and 1
    return Math.max(0, Math.min(1, value));
  }

  private shouldThrottleUpdate(ticker: string): boolean {
    const lastUpdate = this.lastUpdateTime.get(ticker) || 0;
    return Date.now() - lastUpdate < this.updateThrottleMs;
  }

  // Handle technical analysis updates
  private handleTechnicalAnalysisUpdate(data: any): void {
    const { ticker, trendScore, supportResistance, momentum } = data;
    
    if (!ticker) return;

    const cachedData = this.tickerDataCache.get(ticker) || {};
    cachedData.trendStrength = this.normalizeValue(trendScore / 10); // Assuming 0-10 scale
    cachedData.supportResistance = this.normalizeValue(supportResistance);
    cachedData.momentumAlignment = this.normalizeValue(momentum);
    
    this.tickerDataCache.set(ticker, cachedData);
  }

  // Handle regime compass updates
  private handleRegimeCompassUpdate(data: any): void {
    const { ticker, regime, strength, confidence } = data;
    
    if (!ticker) return;

    const cachedData = this.tickerDataCache.get(ticker) || {};
    
    // Calculate regime alignment based on current regime
    let regimeAlignment = 0.5; // Neutral default
    
    switch (regime) {
      case 'BULL':
        regimeAlignment = 0.8; // High alignment for bull regime
        break;
      case 'BEAR':
        regimeAlignment = 0.2; // Low alignment for bear regime (favors shorts)
        break;
      case 'NEUTRAL':
        regimeAlignment = 0.5; // Neutral alignment
        break;
      case 'TRANSITION':
        regimeAlignment = 0.3; // Lower alignment during transitions
        break;
    }
    
    // Adjust by strength and confidence
    regimeAlignment *= (strength || 1.0) * (confidence || 1.0);
    
    cachedData.regimeAlignment = this.normalizeValue(regimeAlignment);
    this.tickerDataCache.set(ticker, cachedData);
  }

  // Handle breadth updates
  private handleBreadthUpdate(data: any): void {
    const { breadthPct, advanceDecline, newHighsLows } = data;
    
    // Market breadth affects all tickers
    const marketBreadth = this.normalizeValue(breadthPct / 100);
    
    // Update all cached ticker data with new breadth info
    for (const [ticker, cachedData] of this.tickerDataCache) {
      cachedData.marketBreadth = marketBreadth;
      this.tickerDataCache.set(ticker, cachedData);
    }
  }

  // Handle sector analysis updates
  private handleSectorAnalysisUpdate(data: any): void {
    const { sector, strength, tickers } = data;
    
    if (!tickers || !Array.isArray(tickers)) return;

    const sectorStrength = this.normalizeValue(strength);
    
    // Update all tickers in this sector
    for (const ticker of tickers) {
      const cachedData = this.tickerDataCache.get(ticker) || {};
      cachedData.sectorStrength = sectorStrength;
      this.tickerDataCache.set(ticker, cachedData);
    }
  }

  // Handle volume analysis updates
  private handleVolumeAnalysisUpdate(data: any): void {
    const { ticker, volumeConfirmation, volumeProfile } = data;
    
    if (!ticker) return;

    const cachedData = this.tickerDataCache.get(ticker) || {};
    cachedData.volumeConfirmation = this.normalizeValue(volumeConfirmation);
    
    this.tickerDataCache.set(ticker, cachedData);
  }

  // Handle enhanced engine outputs
  private handleMultiTickerConfidence(data: any): void {
    const { aggregateConfidence, topTickers, marketConsensus, recommendedFocus } = data;
    
    // Emit to ReadySetGo Controller and other systems
    this.eventBus.emit('confidence:aggregate', {
      avgConfidence: aggregateConfidence,
      topTickers,
      marketConsensus,
      recommendedFocus,
      timestamp: data.timestamp
    });

    // Emit recommendation for orchestrator mode switching
    this.eventBus.emit('orchestrator:recommendation', {
      recommendedMode: recommendedFocus === 'SINGLE_TICKER' ? 'single-ticker' : 'multi-ticker',
      confidence: aggregateConfidence,
      reasoning: this.generateModeRecommendationReasoning(data),
      timestamp: data.timestamp
    });
  }

  private handleTickerConfidence(data: any): void {
    const { ticker, confidence, confidenceDelta, reliability } = data;
    
    // Emit ticker-specific confidence for ReadySetGo Controller
    this.eventBus.emit('engine:confidence', {
      ticker,
      confidence: confidence * 100, // Convert to percentage
      confidenceDelta: confidenceDelta * 100,
      reliability,
      timestamp: data.timestamp
    });
  }

  private generateModeRecommendationReasoning(data: any): string[] {
    const reasoning: string[] = [];
    
    if (data.recommendedFocus === 'SINGLE_TICKER') {
      reasoning.push('Low market consensus suggests focusing on single best opportunity');
      if (data.topTickers.length > 0) {
        reasoning.push(`Top ticker: ${data.topTickers[0]} shows clear outperformance`);
      }
    } else if (data.recommendedFocus === 'MULTI_TICKER') {
      reasoning.push('High market consensus supports multi-ticker approach');
      reasoning.push(`${data.confidenceDistribution?.high?.length || 0} tickers show high confidence`);
    } else {
      reasoning.push('Mixed signals suggest selective ticker approach');
      reasoning.push('Focus on highest confidence opportunities only');
    }
    
    return reasoning;
  }

  // Public API methods
  public computeMultiTickerConfidence(tickers: string[]): any {
    const tickerFactors = new Map<string, ConfidenceFactors>();
    
    for (const ticker of tickers) {
      const cachedData = this.tickerDataCache.get(ticker);
      if (cachedData) {
        const factors = this.convertToConfidenceFactors({ ticker, breakdown: cachedData });
        tickerFactors.set(ticker, factors);
      }
    }
    
    return this.enhancedEngine.computeMultiTickerConfidence(tickerFactors);
  }

  public getTickerConfidenceData(ticker: string): any {
    return this.enhancedEngine.getTickerConfidenceData(ticker);
  }

  public getAllTickerData(): any[] {
    return this.enhancedEngine.getAllTickerData();
  }

  public getConfidenceStatistics(): any {
    return this.enhancedEngine.getConfidenceStatistics();
  }

  public updateWeights(weights: any): void {
    this.enhancedEngine.updateWeights(weights);
  }

  public getWeights(): any {
    return this.enhancedEngine.getWeights();
  }

  // Integration with existing system methods
  public integrateWithExistingEngine(): void {
    // Set up periodic multi-ticker confidence computation
    setInterval(() => {
      this.computePeriodicMultiTickerUpdate();
    }, 5000); // Every 5 seconds

    console.log('📊 Integrated with existing SignalWeightingEngine');
  }

  private computePeriodicMultiTickerUpdate(): void {
    const tickers = Array.from(this.tickerDataCache.keys());
    
    if (tickers.length > 1) {
      try {
        const result = this.computeMultiTickerConfidence(tickers);
        
        // The result will automatically emit events through the enhanced engine
        console.log(`📊 Multi-ticker confidence computed for ${tickers.length} tickers`);
      } catch (error) {
        console.error('📊 Error computing multi-ticker confidence:', error);
      }
    }
  }

  // Method to be called by existing system components
  public handleLegacySignalUpdate(ticker: string, confidence: number, breakdown: any): void {
    this.handleExistingConfidenceUpdate({
      ticker,
      confidence: confidence / 100, // Convert from percentage
      confidenceDelta: 0,
      breakdown
    });
  }

  // Backward compatibility method
  public computeSignalConfidence(factors: any): any {
    // Convert legacy factors to new format and compute for a default ticker
    const enhancedFactors = this.convertToConfidenceFactors({ breakdown: factors });
    const result = this.enhancedEngine.computeTickerConfidence('DEFAULT', enhancedFactors);
    
    return {
      confidence: result.confidence * 100, // Convert back to percentage
      confidenceDelta: result.confidenceDelta * 100,
      breakdown: result.breakdown
    };
  }

  public getStatus(): {
    isInitialized: boolean;
    trackedTickers: number;
    lastUpdateTimes: Record<string, string>;
    cacheSize: number;
    enhancedEngineStats: any;
  } {
    const lastUpdateTimes: Record<string, string> = {};
    for (const [ticker, timestamp] of this.lastUpdateTime) {
      lastUpdateTimes[ticker] = new Date(timestamp).toISOString();
    }

    return {
      isInitialized: this.isInitialized,
      trackedTickers: this.tickerDataCache.size,
      lastUpdateTimes,
      cacheSize: this.tickerDataCache.size,
      enhancedEngineStats: this.enhancedEngine.getConfidenceStatistics()
    };
  }

  public clearCache(ticker?: string): void {
    if (ticker) {
      this.tickerDataCache.delete(ticker);
      this.lastUpdateTime.delete(ticker);
      this.enhancedEngine.resetTickerData(ticker);
    } else {
      this.tickerDataCache.clear();
      this.lastUpdateTime.clear();
      this.enhancedEngine.resetTickerData();
    }
    
    console.log(`📊 Cache cleared${ticker ? ` for ${ticker}` : ' for all tickers'}`);
  }

  public exportData(): any {
    return {
      tickerDataCache: Object.fromEntries(this.tickerDataCache),
      lastUpdateTimes: Object.fromEntries(this.lastUpdateTime),
      enhancedEngineData: this.enhancedEngine.exportConfidenceData(),
      exportTimestamp: new Date().toISOString()
    };
  }

  public importData(data: any): void {
    try {
      if (data.tickerDataCache) {
        this.tickerDataCache = new Map(Object.entries(data.tickerDataCache));
      }
      
      if (data.lastUpdateTimes) {
        this.lastUpdateTime = new Map(
          Object.entries(data.lastUpdateTimes).map(([ticker, time]) => [ticker, new Date(time as string).getTime()])
        );
      }
      
      if (data.enhancedEngineData) {
        this.enhancedEngine.importConfidenceData(data.enhancedEngineData);
      }
      
      console.log('📊 Integration data imported successfully');
    } catch (error) {
      console.error('📊 Failed to import integration data:', error);
    }
  }
}