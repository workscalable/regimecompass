import { EventEmitter } from 'events';
import { 
  TradeSignal, 
  SignalPayload, 
  SystemHealth,
  TradingSystemResponse 
} from '@/lib/trading';

// Import all 7 core modules
import { triangleDetector } from './patterns/TrianglePlayDetector_v2';
import { multiTFOrchestrator } from './confirmations/MultiTFOrchestrator';
import { orderFlowAnalyzer } from './data/OrderFlowAnalyzer';
import { optionsFlowModule } from './data/OptionsFlowModule';
import { strikeSelector } from './strategy/StrikeSelector';
import { tradeDecisionEngine } from './orchestration/TradeDecisionEngine';
import { signalEvolutionTracker } from './analytics/SignalEvolutionTracker';

// Import existing services
import { polygonService } from '@/services/polygonService';
import { tradierService } from '@/services/tradierService';
import { twelveDataService } from '@/services/twelveDataService';

/**
 * TradingOrchestrationSystem - Main Orchestration Engine
 * 
 * Integrates all 7 core modules into a comprehensive trading system:
 * 1. Pattern Recognition Layer (TrianglePlayDetector_v2)
 * 2. Multi-Timeframe Confirmation Engine (MultiTFOrchestrator)
 * 3. Order Flow + Delta Analyzer (OrderFlowAnalyzer)
 * 4. Options Flow Intelligence (OptionsFlowModule)
 * 5. Strike Recommendation Engine (StrikeSelector)
 * 6. Trade Decision Engine (TradeDecisionEngine)
 * 7. Signal Evolution Tracker (SignalEvolutionTracker)
 * 
 * Features:
 * - Real-time signal generation
 * - Multi-source data integration
 * - Comprehensive confidence scoring
 * - Signal lifecycle tracking
 * - Performance monitoring
 * - Event-driven architecture
 */

export class TradingOrchestrationSystem extends EventEmitter {
  private isRunning = false;
  private symbols: string[] = ['SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT'];
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly updateFrequency = 30000; // 30 seconds

  // Module health tracking
  private moduleHealth: Map<string, 'online' | 'offline' | 'degraded'> = new Map();
  private performanceMetrics: Map<string, number> = new Map();

  constructor() {
    super();
    this.initializeModules();
    this.setupEventHandlers();
  }

  /**
   * Initialize all modules and their health status
   */
  private initializeModules(): void {
    const modules = [
      'triangleDetector',
      'multiTFOrchestrator', 
      'orderFlowAnalyzer',
      'optionsFlowModule',
      'strikeSelector',
      'tradeDecisionEngine',
      'signalEvolutionTracker'
    ];

    modules.forEach(module => {
      this.moduleHealth.set(module, 'online');
    });
  }

  /**
   * Setup event handlers for system-wide events
   */
  private setupEventHandlers(): void {
    // Pattern detection events
    triangleDetector.on('patternDetected', (pattern) => {
      this.emit('patternDetected', pattern);
    });

    triangleDetector.on('patternUpdated', (pattern) => {
      this.emit('patternUpdated', pattern);
    });

    // Multi-timeframe confirmation events
    multiTFOrchestrator.on('confirmationReady', (confirmation) => {
      this.emit('confirmationReady', confirmation);
    });

    multiTFOrchestrator.on('confirmationGo', (confirmation) => {
      this.emit('confirmationGo', confirmation);
    });

    // Order flow events
    orderFlowAnalyzer.on('deltaShift', (symbol, delta) => {
      this.emit('deltaShift', symbol, delta);
    });

    orderFlowAnalyzer.on('volumeExpansion', (symbol, expansion) => {
      this.emit('volumeExpansion', symbol, expansion);
    });

    // Options flow events
    optionsFlowModule.on('unusualActivity', (symbol, activity) => {
      this.emit('unusualOptionsActivity', symbol, activity);
    });

    optionsFlowModule.on('largeBlockTrade', (sweep) => {
      this.emit('largeBlockTrade', sweep);
    });

    // Trade decision events
    tradeDecisionEngine.on('signalGenerated', (signal) => {
      this.emit('signalGenerated', signal);
      // Start tracking the signal
      signalEvolutionTracker.startTracking(signal);
    });

    tradeDecisionEngine.on('signalUpdated', (signal) => {
      this.emit('signalUpdated', signal);
    });

    // Signal evolution events
    signalEvolutionTracker.on('stageChange', (symbol, stage, confidence) => {
      this.emit('signalStageChange', symbol, stage, confidence);
    });

    signalEvolutionTracker.on('lifecycleComplete', (lifecycle) => {
      this.emit('signalLifecycleComplete', lifecycle);
    });
  }

  /**
   * Start the trading orchestration system
   */
  async start(): Promise<void> {
    try {
      console.log('Starting Trading Orchestration System...');
      
      // Initialize data sources
      await this.initializeDataSources();
      
      // Start the main processing loop
      this.isRunning = true;
      this.startProcessingLoop();
      
      console.log('Trading Orchestration System started successfully');
      this.emit('systemStarted');
      
    } catch (error) {
      console.error('Error starting Trading Orchestration System:', error);
      this.emit('systemError', error);
      throw error;
    }
  }

  /**
   * Stop the trading orchestration system
   */
  async stop(): Promise<void> {
    try {
      console.log('Stopping Trading Orchestration System...');
      
      this.isRunning = false;
      
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
      
      // Clean up expired signals
      await signalEvolutionTracker.cleanupExpiredSignals();
      
      console.log('Trading Orchestration System stopped');
      this.emit('systemStopped');
      
    } catch (error) {
      console.error('Error stopping Trading Orchestration System:', error);
      this.emit('systemError', error);
    }
  }

  /**
   * Initialize data sources
   */
  private async initializeDataSources(): Promise<void> {
    try {
      // Test data source connections
      const polygonHealth = await polygonService.getHealthStatus();
      const tradierHealth = await tradierService.getHealthStatus();
      
      console.log('Data source health:', {
        polygon: polygonHealth.status,
        tradier: tradierHealth.status
      });
      
    } catch (error) {
      console.warn('Some data sources may be unavailable:', error);
    }
  }

  /**
   * Start the main processing loop
   */
  private startProcessingLoop(): void {
    this.updateInterval = setInterval(async () => {
      if (this.isRunning) {
        await this.processAllSymbols();
      }
    }, this.updateFrequency);
  }

  /**
   * Process all symbols for trading signals
   */
  private async processAllSymbols(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const promises = this.symbols.map(symbol => this.processSymbol(symbol));
      await Promise.allSettled(promises);
      
      const processingTime = Date.now() - startTime;
      this.performanceMetrics.set('lastProcessingTime', processingTime);
      
    } catch (error) {
      console.error('Error processing symbols:', error);
      this.emit('processingError', error);
    }
  }

  /**
   * Process individual symbol for trading signals
   */
  private async processSymbol(symbol: string): Promise<void> {
    try {
      // 1. Fetch market data
      const marketData = await this.fetchMarketData(symbol);
      if (!marketData) return;

      // 2. Process trade decision
      const tradeSignal = await tradeDecisionEngine.processTradeDecision(
        symbol,
        marketData.indexData,
        marketData.htfData,
        marketData.ltfData
      );

      if (tradeSignal) {
        this.emit('newTradeSignal', tradeSignal);
      }

    } catch (error) {
      console.error(`Error processing symbol ${symbol}:`, error);
    }
  }

  /**
   * Fetch comprehensive market data for a symbol
   */
  private async fetchMarketData(symbol: string): Promise<any> {
    try {
      // Fetch data from multiple sources in parallel
      const [indexData, sectorData, optionsFlow, gammaData] = await Promise.allSettled([
        polygonService.fetchMarketData([symbol]),
        polygonService.fetchSectorETFs(),
        optionsFlowModule.analyzeOptionsFlow(symbol),
        tradierService.fetchGammaExposure(symbol)
      ]);

      // Process index data
      const indexDataResult = indexData.status === 'fulfilled' ? indexData.value.data : {};
      const symbolData = indexDataResult[symbol];

      if (!symbolData) {
        console.warn(`No market data available for ${symbol}`);
        return null;
      }

      // Create mock HTF and LTF data (in real implementation, this would fetch from different timeframes)
      const htfData = {
        '15m': [symbolData],
        '1h': [symbolData]
      };

      const ltfData = {
        '5m': [symbolData],
        '1m': [symbolData]
      };

      return {
        indexData: [symbolData],
        htfData,
        ltfData,
        optionsFlow: optionsFlow.status === 'fulfilled' ? optionsFlow.value : null,
        gammaData: gammaData.status === 'fulfilled' ? gammaData.value : null
      };

    } catch (error) {
      console.error(`Error fetching market data for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      // Check module health
      const modules = {
        patternDetector: this.moduleHealth.get('triangleDetector') || 'offline',
        mtfOrchestrator: this.moduleHealth.get('multiTFOrchestrator') || 'offline',
        orderFlowAnalyzer: this.moduleHealth.get('orderFlowAnalyzer') || 'offline',
        optionsFlowModule: this.moduleHealth.get('optionsFlowModule') || 'offline',
        strikeSelector: this.moduleHealth.get('strikeSelector') || 'offline',
        tradeDecisionEngine: this.moduleHealth.get('tradeDecisionEngine') || 'offline',
        signalTracker: this.moduleHealth.get('signalEvolutionTracker') || 'offline'
      };

      // Check data source health
      const dataSources = {
        polygon: 'online', // Simplified for now
        tradier: 'online',
        finnhub: 'online',
        twelveData: 'online'
      };

      // Calculate overall health
      const moduleStatuses = Object.values(modules);
      const onlineModules = moduleStatuses.filter(status => status === 'online').length;
      const totalModules = moduleStatuses.length;
      
      let overall: 'healthy' | 'degraded' | 'critical';
      if (onlineModules === totalModules) {
        overall = 'healthy';
      } else if (onlineModules >= totalModules * 0.7) {
        overall = 'degraded';
      } else {
        overall = 'critical';
      }

      // Get performance metrics
      const performance = {
        avgResponseTime: this.performanceMetrics.get('lastProcessingTime') || 0,
        cacheHitRate: 0.85, // Mock value
        errorRate: 0.02, // Mock value
        signalsPerMinute: this.getSignalsPerMinute()
      };

      return {
        overall,
        modules,
        dataSources,
        performance,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Error getting system health:', error);
      return {
        overall: 'critical',
        modules: {} as any,
        dataSources: {} as any,
        performance: {
          avgResponseTime: 0,
          cacheHitRate: 0,
          errorRate: 1,
          signalsPerMinute: 0
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Get signals per minute
   */
  private getSignalsPerMinute(): number {
    const activeSignals = signalEvolutionTracker.getActiveLifecycles();
    return activeSignals.length; // Simplified calculation
  }

  /**
   * Get all active signals
   */
  getActiveSignals(): TradeSignal[] {
    return tradeDecisionEngine.getActiveSignals();
  }

  /**
   * Get signal statistics
   */
  getSignalStatistics(): any {
    return {
      tradeEngine: tradeDecisionEngine.getSignalStats(),
      signalTracker: signalEvolutionTracker.getPerformanceStats(),
      patternDetector: triangleDetector.getPatternStats(),
      multiTF: multiTFOrchestrator.getConfirmationStats(),
      orderFlow: orderFlowAnalyzer.getOrderFlowStats(),
      optionsFlow: optionsFlowModule.getFlowStats(),
      strikeSelector: strikeSelector.getSelectionStats()
    };
  }

  /**
   * Add symbol to monitoring list
   */
  addSymbol(symbol: string): void {
    if (!this.symbols.includes(symbol)) {
      this.symbols.push(symbol);
      this.emit('symbolAdded', symbol);
    }
  }

  /**
   * Remove symbol from monitoring list
   */
  removeSymbol(symbol: string): void {
    const index = this.symbols.indexOf(symbol);
    if (index > -1) {
      this.symbols.splice(index, 1);
      this.emit('symbolRemoved', symbol);
    }
  }

  /**
   * Get monitored symbols
   */
  getMonitoredSymbols(): string[] {
    return [...this.symbols];
  }

  /**
   * Update symbol list
   */
  updateSymbols(symbols: string[]): void {
    this.symbols = [...symbols];
    this.emit('symbolsUpdated', this.symbols);
  }

  /**
   * Get system status
   */
  getSystemStatus(): {
    isRunning: boolean;
    symbols: string[];
    modules: Map<string, string>;
    performance: Map<string, number>;
  } {
    return {
      isRunning: this.isRunning,
      symbols: this.symbols,
      modules: this.moduleHealth,
      performance: this.performanceMetrics
    };
  }

  /**
   * Export system data for analysis
   */
  exportSystemData(): {
    signals: TradeSignal[];
    lifecycles: any;
    patterns: any;
    confirmations: any;
    orderFlow: any;
    optionsFlow: any;
    strikes: any;
    timestamp: Date;
  } {
    return {
      signals: this.getActiveSignals(),
      lifecycles: signalEvolutionTracker.exportLifecycleData(),
      patterns: triangleDetector.getActivePatterns(),
      confirmations: multiTFOrchestrator.getActiveConfirmations(),
      orderFlow: orderFlowAnalyzer.getAllMetrics(),
      optionsFlow: optionsFlowModule.getAllFlowData(),
      strikes: strikeSelector.getAllSelections(),
      timestamp: new Date()
    };
  }

  /**
   * Clear all system data
   */
  clearAllData(): void {
    triangleDetector.clearPatterns();
    multiTFOrchestrator.clearConfirmations();
    orderFlowAnalyzer.clearAllMetrics();
    optionsFlowModule.clearAllFlowData();
    strikeSelector.clearAllSelections();
    tradeDecisionEngine.clearAllSignals();
    signalEvolutionTracker.clearAllData();
    
    this.emit('dataCleared');
  }
}

// Export singleton instance
export const tradingOrchestrationSystem = new TradingOrchestrationSystem();

