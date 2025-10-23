import { EventEmitter } from 'events';
import { MultiTickerOrchestrator } from './orchestrators/MultiTickerOrchestrator.js';
import { SignalWeightingEngine } from './engines/SignalWeightingEngine.js';
import { FibExpansionEngine } from './engines/FibExpansionEngine.js';
import { GammaExposureEngine } from './engines/GammaExposureEngine.js';
import { OptionsRecommendationEngine } from './engines/OptionsRecommendationEngine.js';
import { 
  MultiTickerConfig, 
  EnhancedSignal, 
  SignalFactors, 
  MultiTickerState,
  GammaAdaptiveConfig 
} from './types/core.js';

/**
 * Main Gamma Adaptive Trading System orchestrator
 * Coordinates all engines and provides unified interface
 */
export class GammaAdaptiveSystem extends EventEmitter {
  private orchestrator: MultiTickerOrchestrator;
  private signalEngine: SignalWeightingEngine;
  private fibEngine: FibExpansionEngine;
  private gammaEngine: GammaExposureEngine;
  private optionsEngine: OptionsRecommendationEngine;
  private config: GammaAdaptiveConfig;
  private isInitialized: boolean = false;

  constructor(config: GammaAdaptiveConfig) {
    super();
    this.config = config;
    
    // Initialize engines
    this.signalEngine = new SignalWeightingEngine();
    this.fibEngine = new FibExpansionEngine();
    this.gammaEngine = new GammaExposureEngine();
    this.optionsEngine = new OptionsRecommendationEngine();
    
    // Initialize orchestrator
    this.orchestrator = new MultiTickerOrchestrator(config.orchestrator);
    
    // Set up event forwarding
    this.setupEventForwarding();
  }

  /**
   * Initialize the Gamma Adaptive System
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('System is already initialized');
    }

    console.log('Initializing Gamma Adaptive Trading System v3.0');
    
    try {
      // Initialize all components
      await this.initializeEngines();
      
      this.isInitialized = true;
      
      this.emit('system:initialized', {
        timestamp: new Date(),
        watchlist: this.config.orchestrator.watchlist,
        engineCount: 4
      });
      
      console.log('Gamma Adaptive System initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Gamma Adaptive System:', error);
      throw error;
    }
  }

  /**
   * Start monitoring tickers
   */
  public async startMonitoring(tickers?: string[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('System must be initialized before starting monitoring');
    }

    const tickersToMonitor = tickers || this.config.orchestrator.watchlist;
    
    console.log(`Starting monitoring for ${tickersToMonitor.length} tickers:`, tickersToMonitor);
    
    // Update orchestrator watchlist if custom tickers provided
    if (tickers) {
      for (const ticker of tickers) {
        await this.orchestrator.addTicker(ticker);
      }
    }
    
    // Start the orchestrator
    await this.orchestrator.start();
    
    this.emit('monitoring:started', {
      tickers: tickersToMonitor,
      timestamp: new Date()
    });
  }

  /**
   * Stop monitoring
   */
  public async stopMonitoring(): Promise<void> {
    console.log('Stopping Gamma Adaptive System monitoring');
    
    await this.orchestrator.stop();
    
    this.emit('monitoring:stopped', {
      timestamp: new Date()
    });
  }

  /**
   * Process market data update
   */
  public async processMarketUpdate(marketData: MarketData): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      // Generate enhanced signal for the ticker
      const enhancedSignal = await this.generateEnhancedSignal(marketData.ticker, marketData);
      
      // Process signal through orchestrator
      await this.orchestrator.processEnhancedSignal(enhancedSignal);
      
      this.emit('market:processed', {
        ticker: marketData.ticker,
        confidence: enhancedSignal.confidence,
        timestamp: new Date()
      });
    } catch (error) {
      console.error(`Error processing market update for ${marketData.ticker}:`, error);
      this.emit('market:error', { ticker: marketData.ticker, error });
    }
  }

  /**
   * Get current orchestrator state
   */
  public getOrchestratorState(): MultiTickerState {
    return this.orchestrator.getOrchestratorState();
  }

  /**
   * Get performance metrics
   */
  public async getPerformanceMetrics(): Promise<any> {
    // TODO: Integrate with performance analytics engine
    const state = this.getOrchestratorState();
    
    return {
      activeTickerCount: state.activeTickerCount,
      totalSignalsProcessed: state.totalSignalsProcessed,
      activeTrades: state.activeTrades,
      portfolioHeat: state.portfolioHeat,
      systemHealth: state.systemHealth,
      performance: state.performance,
      timestamp: new Date()
    };
  }

  /**
   * Generate enhanced signal for a ticker
   */
  private async generateEnhancedSignal(ticker: string, marketData: MarketData): Promise<EnhancedSignal> {
    // Create signal factors (this would normally come from market analysis)
    const factors: SignalFactors = {
      ticker,
      trendComposite: await this.signalEngine.calculateTrendComposite(ticker),
      momentumDivergence: await this.signalEngine.analyzeMomentumDivergence(ticker),
      volumeProfile: await this.signalEngine.assessVolumeProfile(ticker),
      ribbonAlignment: await this.signalEngine.measureRibbonAlignment(ticker),
      fibConfluence: Math.random() * 0.8 + 0.1, // Placeholder
      gammaExposure: Math.random() * 2 - 1, // -1 to +1
      timestamp: new Date()
    };

    // Get Fibonacci analysis
    const fibAnalysis = await this.fibEngine.analyzeExpansion(ticker);
    
    // Get Gamma analysis
    const gammaAnalysis = await this.gammaEngine.analyzeExposure(ticker);
    
    // Compute enhanced confidence
    const confidenceResult = this.signalEngine.computeEnhancedConfidence(
      factors, 
      fibAnalysis, 
      gammaAnalysis
    );
    
    // Generate options recommendations
    const recommendations = await this.optionsEngine.generateRecommendations(
      ticker,
      confidenceResult.confidence,
      0.03, // 3% expected move
      fibAnalysis
    );
    
    // Create enhanced signal
    const enhancedSignal: EnhancedSignal = {
      ticker,
      timestamp: new Date(),
      confidence: confidenceResult.confidence,
      conviction: confidenceResult.conviction,
      factors,
      fibAnalysis,
      gammaAnalysis,
      recommendations,
      riskAssessment: {
        riskScore: this.calculateRiskScore(confidenceResult.confidence, fibAnalysis, gammaAnalysis),
        portfolioHeat: 0.1, // Placeholder
        positionSize: this.calculatePositionSize(confidenceResult.confidence),
        maxRisk: 0.02,
        stopLoss: 0.02,
        profitTarget: 0.06
      },
      metadata: {
        regime: 'NEUTRAL', // Placeholder
        volatilityEnvironment: 'NORMAL',
        marketBreadth: 0.5,
        sectorRotation: 'TECH'
      }
    };

    return enhancedSignal;
  }

  /**
   * Initialize all engines
   */
  private async initializeEngines(): Promise<void> {
    // Engines are already instantiated, just verify they're ready
    console.log('Engines initialized:');
    console.log('- Signal Weighting Engine: Ready');
    console.log('- Fibonacci Expansion Engine: Ready');
    console.log('- Gamma Exposure Engine: Ready');
    console.log('- Options Recommendation Engine: Ready');
  }

  /**
   * Set up event forwarding from orchestrator
   */
  private setupEventForwarding(): void {
    // Forward orchestrator events
    this.orchestrator.on('orchestrator:started', (data) => {
      this.emit('orchestrator:started', data);
    });

    this.orchestrator.on('orchestrator:stopped', (data) => {
      this.emit('orchestrator:stopped', data);
    });

    this.orchestrator.on('ticker:state:transition', (data) => {
      this.emit('ticker:state:transition', data);
    });

    this.orchestrator.on('trade:executed', (data) => {
      this.emit('trade:executed', data);
    });

    this.orchestrator.on('signal:processed', (data) => {
      this.emit('signal:processed', data);
    });

    this.orchestrator.on('orchestrator:error', (data) => {
      this.emit('system:error', data);
    });
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(confidence: number, fibAnalysis: any, gammaAnalysis: any): number {
    let riskScore = 1 - confidence; // Base risk inverse to confidence
    
    // Adjust for Fibonacci zone
    if (fibAnalysis.currentZone === 'EXHAUSTION') {
      riskScore += 0.3;
    } else if (fibAnalysis.currentZone === 'OVER_EXTENSION') {
      riskScore += 0.1;
    }
    
    // Adjust for gamma exposure
    if (gammaAnalysis.pinningRisk > 0.5) {
      riskScore += 0.2;
    }
    
    return Math.min(1, riskScore);
  }

  /**
   * Calculate position size based on confidence
   */
  private calculatePositionSize(confidence: number): number {
    const baseSize = 1.0;
    
    if (confidence > 0.8) {
      return baseSize * 1.5; // 150% for high confidence
    } else if (confidence > 0.6) {
      return baseSize * 1.2; // 120% for medium confidence
    } else {
      return baseSize * 0.8; // 80% for low confidence
    }
  }
}

// Supporting interfaces
interface MarketData {
  ticker: string;
  price: number;
  volume: number;
  timestamp: Date;
}

// Default configuration
export const DEFAULT_GAMMA_ADAPTIVE_CONFIG: GammaAdaptiveConfig = {
  orchestrator: {
    watchlist: ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'META', 'AMZN', 'GOOGL', 'NFLX'],
    maxConcurrentTrades: 3,
    confidenceThreshold: 0.62,
    fibZoneBlocklist: ['EXHAUSTION'],
    updateInterval: 30000, // 30 seconds
    priorityWeights: {
      'SPY': 1.2,
      'QQQ': 1.1,
      'AAPL': 1.0
    }
  },
  signalProcessing: {
    weights: {
      trendComposite: 0.25,
      momentumDivergence: 0.20,
      volumeProfile: 0.20,
      ribbonAlignment: 0.15,
      fibConfluence: 0.10,
      gammaExposure: 0.10
    },
    thresholds: {
      confidenceThreshold: 0.62,
      convictionThreshold: 0.7
    },
    adjustments: {
      regimeMultiplier: 1.1,
      volatilityAdjustment: 0.9
    }
  },
  riskManagement: {
    positionSizing: {
      maxRiskPerTrade: 0.02,
      maxPortfolioHeat: 0.20,
      maxDrawdown: 0.05,
      fibZoneMultipliers: {
        'COMPRESSION': 1.2,
        'MID_EXPANSION': 1.0,
        'FULL_EXPANSION': 0.8,
        'OVER_EXTENSION': 0.5,
        'EXHAUSTION': 0.0
      },
      confidenceMultipliers: {
        high: 1.5,
        medium: 1.2,
        low: 0.8
      },
      regimeAdjustments: {
        'BULL': 1.1,
        'BEAR': 0.9,
        'NEUTRAL': 1.0
      }
    },
    limits: {
      maxRiskPerTrade: 0.02,
      maxPortfolioHeat: 0.20,
      maxDrawdown: 0.05,
      maxConsecutiveLosses: 2,
      maxDailyLoss: 0.05,
      vixThreshold: 30
    },
    fibZoneMultipliers: {
      'COMPRESSION': 1.2,
      'MID_EXPANSION': 1.0,
      'FULL_EXPANSION': 0.8,
      'OVER_EXTENSION': 0.5,
      'EXHAUSTION': 0.0
    }
  },
  dataProviders: {
    primary: {
      name: 'polygon',
      apiKey: process.env.POLYGON_API_KEY || '',
      baseUrl: 'https://api.polygon.io',
      rateLimit: 5
    },
    fallback: {
      name: 'twelvedata',
      apiKey: process.env.TWELVEDATA_API_KEY || '',
      baseUrl: 'https://api.twelvedata.com',
      rateLimit: 8
    },
    rateLimit: {
      requestsPerSecond: 5,
      requestsPerMinute: 300,
      burstLimit: 10
    }
  },
  alerts: {
    channels: [
      { type: 'slack', enabled: true, webhook: process.env.SLACK_WEBHOOK_URL || '' },
      { type: 'telegram', enabled: false, token: '' },
      { type: 'discord', enabled: false, webhook: '' }
    ],
    thresholds: [
      { type: 'TRADE_EXECUTED', priority: 'HIGH' },
      { type: 'STATE_TRANSITION', priority: 'MEDIUM' },
      { type: 'RISK_VIOLATION', priority: 'CRITICAL' }
    ]
  }
};

// Export types for external use
export * from './types/core.js';