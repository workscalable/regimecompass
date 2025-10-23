/**
 * Mock implementations for UAT tests
 * These mocks simulate the behavior of system components for testing
 */

export class MockMultiTickerOrchestrator {
  private tickers: string[] = [];
  private tickerStates: Map<string, any> = new Map();
  private isRunning = false;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(config: any) {
    this.tickers = config.tickers || [];
    this.initializeStates();
  }

  async initialize(): Promise<void> {
    // Mock initialization
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  async start(): Promise<void> {
    this.isRunning = true;
    this.tickers.forEach(ticker => {
      this.tickerStates.set(ticker, {
        lifecycle: 'READY',
        isActive: true,
        lastSignal: null,
        lastUpdate: Date.now(),
        lastProcessingTime: Math.random() * 150 + 50 // 50-200ms
      });
    });
  }

  async shutdown(): Promise<void> {
    this.isRunning = false;
  }

  async reset(): Promise<void> {
    this.initializeStates();
  }

  getMonitoredTickers(): string[] {
    return [...this.tickers];
  }

  getTickerState(ticker: string): any {
    return this.tickerStates.get(ticker) || {
      lifecycle: 'READY',
      isActive: false,
      lastSignal: null,
      lastUpdate: Date.now(),
      lastProcessingTime: 100
    };
  }

  getAllTickerStates(): Record<string, any> {
    const states: Record<string, any> = {};
    this.tickerStates.forEach((state, ticker) => {
      states[ticker] = state;
    });
    return states;
  }

  async addTickers(newTickers: string[]): Promise<void> {
    this.tickers.push(...newTickers);
    newTickers.forEach(ticker => {
      this.tickerStates.set(ticker, {
        lifecycle: 'READY',
        isActive: true,
        lastSignal: null,
        lastUpdate: Date.now(),
        lastProcessingTime: Math.random() * 150 + 50
      });
    });
  }

  async getDashboardData(): Promise<any> {
    return {
      tickers: this.tickers.map(ticker => ({
        symbol: ticker,
        confidence: Math.random(),
        state: this.getTickerState(ticker)
      })),
      overview: {
        totalTickers: this.tickers.length,
        activeTickers: this.tickers.length
      }
    };
  }

  getConfiguration(): any {
    return {
      maxConcurrentTrades: 3,
      monitoringInterval: 1000
    };
  }

  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private initializeStates(): void {
    this.tickerStates.clear();
    this.tickers.forEach(ticker => {
      this.tickerStates.set(ticker, {
        lifecycle: 'READY',
        isActive: false,
        lastSignal: null,
        lastUpdate: Date.now(),
        lastProcessingTime: 100
      });
    });
  }

  // Simulate signal updates for testing
  async simulateSignalUpdate(ticker: string, confidence: number): Promise<void> {
    const state = this.tickerStates.get(ticker);
    if (state) {
      state.lastSignal = {
        ticker,
        confidence,
        timestamp: new Date(),
        factors: {
          trendComposite: 0.8,
          momentumDivergence: 0.7,
          volumeProfile: 0.75,
          ribbonAlignment: 0.8,
          fibConfluence: 0.6,
          gammaExposure: 0.65
        }
      };
      state.lastUpdate = Date.now();
      
      // Emit state update event
      const listeners = this.eventListeners.get('stateUpdate') || [];
      listeners.forEach(listener => listener(ticker, state));
    }
  }
}

export class MockSignalWeightingEngine {
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async generateSignal(ticker: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    
    return {
      ticker,
      confidence: Math.random() * 0.4 + 0.6, // 0.6-1.0 range
      timestamp: new Date(),
      factors: {
        trendComposite: Math.random(),
        momentumDivergence: Math.random(),
        volumeProfile: Math.random(),
        ribbonAlignment: Math.random(),
        fibConfluence: Math.random(),
        gammaExposure: Math.random()
      }
    };
  }

  async injectSignal(signal: any): Promise<void> {
    // Mock signal injection for testing
  }

  async getSignalQualityMetrics(): Promise<any> {
    return {
      lastAnalysis: Date.now(),
      patternWeights: {
        'trend_momentum': 0.8,
        'volume_breakout': 0.7,
        'fibonacci_confluence': 0.6
      },
      averageAccuracy: 0.72
    };
  }
}

export class MockOptionsRecommendationEngine {
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async generateRecommendations(ticker: string, signal: any): Promise<any[]> {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));
    
    const basePrice = 100 + Math.random() * 400; // Mock stock price
    
    return [
      {
        contract: {
          symbol: `${ticker}240119C${Math.floor(basePrice + 5)}000`,
          strike: basePrice + 5,
          expiry: '2024-01-19',
          type: 'CALL'
        },
        suggestedQuantity: Math.floor(signal.confidence * 10) + 1,
        riskReward: {
          ratio: 2.5 + Math.random(),
          maxRisk: 500,
          maxReward: 1250
        },
        liquidity: {
          score: 0.8 + Math.random() * 0.2,
          bidAskSpread: 0.05 + Math.random() * 0.10,
          volume: Math.floor(Math.random() * 1000) + 100
        },
        greeks: {
          delta: 0.5 + Math.random() * 0.2,
          gamma: 0.02 + Math.random() * 0.01,
          theta: -0.05 - Math.random() * 0.03,
          vega: 0.1 + Math.random() * 0.05
        }
      },
      {
        contract: {
          symbol: `${ticker}240119C${Math.floor(basePrice + 10)}000`,
          strike: basePrice + 10,
          expiry: '2024-01-19',
          type: 'CALL'
        },
        suggestedQuantity: Math.floor(signal.confidence * 8) + 1,
        riskReward: {
          ratio: 2.2 + Math.random(),
          maxRisk: 400,
          maxReward: 880
        },
        liquidity: {
          score: 0.7 + Math.random() * 0.2,
          bidAskSpread: 0.08 + Math.random() * 0.12,
          volume: Math.floor(Math.random() * 800) + 80
        },
        greeks: {
          delta: 0.3 + Math.random() * 0.2,
          gamma: 0.015 + Math.random() * 0.01,
          theta: -0.04 - Math.random() * 0.02,
          vega: 0.08 + Math.random() * 0.04
        }
      },
      {
        contract: {
          symbol: `${ticker}240119C${Math.floor(basePrice + 15)}000`,
          strike: basePrice + 15,
          expiry: '2024-01-19',
          type: 'CALL'
        },
        suggestedQuantity: Math.floor(signal.confidence * 6) + 1,
        riskReward: {
          ratio: 2.0 + Math.random(),
          maxRisk: 300,
          maxReward: 600
        },
        liquidity: {
          score: 0.6 + Math.random() * 0.2,
          bidAskSpread: 0.10 + Math.random() * 0.15,
          volume: Math.floor(Math.random() * 600) + 60
        },
        greeks: {
          delta: 0.2 + Math.random() * 0.15,
          gamma: 0.01 + Math.random() * 0.008,
          theta: -0.03 - Math.random() * 0.02,
          vega: 0.06 + Math.random() * 0.03
        }
      }
    ];
  }
}

export class MockPaperTradingEngine {
  private positions: Map<string, any> = new Map();
  private portfolioValue = 100000; // Starting with $100k
  private tradeCounter = 0;

  constructor(config: any) {
    // Mock constructor
  }

  async resetPortfolio(): Promise<void> {
    this.positions.clear();
    this.portfolioValue = 100000;
    this.tradeCounter = 0;
  }

  async executeTrade(tradeRequest: any): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    
    this.tradeCounter++;
    const positionId = `pos_${this.tradeCounter}`;
    
    const entryPrice = 5.0 + Math.random() * 10; // Mock option price
    const totalCost = entryPrice * tradeRequest.quantity * 100; // Options are per 100 shares
    
    const position = {
      id: positionId,
      ticker: tradeRequest.ticker,
      symbol: tradeRequest.optionContract.symbol,
      quantity: tradeRequest.quantity,
      entryPrice,
      currentValue: totalCost,
      timestamp: new Date(),
      strategy: tradeRequest.strategy,
      confidence: tradeRequest.confidence
    };
    
    this.positions.set(positionId, position);
    this.portfolioValue -= totalCost;
    
    return {
      success: true,
      position
    };
  }

  async savePosition(position: any): Promise<void> {
    this.positions.set(position.id, position);
  }

  async updatePositionValue(positionId: string, newValue: number): Promise<void> {
    const position = this.positions.get(positionId);
    if (position) {
      const oldValue = position.currentValue;
      position.currentValue = newValue;
      this.portfolioValue += (newValue - oldValue);
    }
  }

  async closePosition(positionId: string, outcome: string): Promise<void> {
    const position = this.positions.get(positionId);
    if (position) {
      position.closed = true;
      position.outcome = outcome;
      position.closeTime = new Date();
    }
  }

  async getPositionMetrics(positionId: string): Promise<any> {
    const position = this.positions.get(positionId);
    if (!position) return null;
    
    return {
      currentValue: position.currentValue,
      unrealizedPnL: position.currentValue - (position.entryPrice * position.quantity * 100),
      percentChange: ((position.currentValue / (position.entryPrice * position.quantity * 100)) - 1) * 100
    };
  }
}

export class MockPerformanceAnalyticsEngine {
  private trades: any[] = [];
  private metrics: any = {};

  constructor(config: any) {
    this.resetMetrics();
  }

  async clearMetrics(): Promise<void> {
    this.trades = [];
    this.resetMetrics();
  }

  async calculateRealTimeMetrics(): Promise<any> {
    const totalTrades = this.trades.length;
    const winningTrades = this.trades.filter(t => t.outcome === 'WIN').length;
    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
    
    return {
      totalTrades,
      winRate,
      currentPnL: this.trades.reduce((sum, t) => sum + (t.pnl || 0), 0),
      portfolioValue: 100000 + this.trades.reduce((sum, t) => sum + (t.pnl || 0), 0),
      profitFactor: this.calculateProfitFactor(),
      sharpeRatio: 1.2 + Math.random() * 0.5,
      maxDrawdown: Math.random() * 0.05 // 0-5%
    };
  }

  async getDashboardAnalytics(): Promise<any> {
    const performance = await this.calculateRealTimeMetrics();
    
    return {
      performance,
      charts: {
        equityCurve: this.generateEquityCurve(),
        drawdownChart: this.generateDrawdownChart()
      }
    };
  }

  async analyzeTradeOutcomes(): Promise<void> {
    // Mock analysis
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  async analyzeSignalPatterns(): Promise<void> {
    // Mock analysis
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  async generateOptimizationRecommendations(): Promise<any[]> {
    return [
      {
        type: 'SIGNAL_WEIGHT_ADJUSTMENT',
        description: 'Increase momentum factor weight by 5%',
        impact: 'HIGH',
        implementation: 'Adjust momentum weight from 20% to 25%',
        priority: 1
      },
      {
        type: 'RISK_ADJUSTMENT',
        description: 'Reduce position size during high VIX periods',
        impact: 'MEDIUM',
        implementation: 'Apply 25% position size reduction when VIX > 25',
        priority: 2
      }
    ];
  }

  async getConfidenceCalibration(): Promise<any> {
    return {
      lastUpdate: Date.now() - Math.random() * 86400000, // Random time in last day
      adjustments: {
        '0.6-0.7': 0.95,
        '0.7-0.8': 1.02,
        '0.8-0.9': 1.05,
        '0.9-1.0': 0.98
      }
    };
  }

  async exportLearningState(): Promise<any> {
    return {
      confidenceAdjustments: await this.getConfidenceCalibration(),
      signalPatterns: {
        'trend_momentum': 0.8,
        'volume_breakout': 0.7
      },
      performanceHistory: this.trades
    };
  }

  async importLearningState(state: any): Promise<void> {
    // Mock import
  }

  private resetMetrics(): void {
    this.metrics = {
      totalTrades: 0,
      winRate: 0,
      profitFactor: 1.0,
      sharpeRatio: 0,
      maxDrawdown: 0
    };
  }

  private calculateProfitFactor(): number {
    const winners = this.trades.filter(t => t.pnl > 0);
    const losers = this.trades.filter(t => t.pnl < 0);
    
    const totalWins = winners.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0));
    
    return totalLosses > 0 ? totalWins / totalLosses : 1.0;
  }

  private generateEquityCurve(): any[] {
    const points = [];
    let equity = 100000;
    
    for (let i = 0; i < 30; i++) {
      equity += (Math.random() - 0.4) * 1000; // Slight upward bias
      points.push({
        date: new Date(Date.now() - (30 - i) * 86400000),
        value: equity
      });
    }
    
    return points;
  }

  private generateDrawdownChart(): any[] {
    const points = [];
    let maxEquity = 100000;
    let currentEquity = 100000;
    
    for (let i = 0; i < 30; i++) {
      currentEquity += (Math.random() - 0.4) * 1000;
      maxEquity = Math.max(maxEquity, currentEquity);
      const drawdown = (currentEquity - maxEquity) / maxEquity;
      
      points.push({
        date: new Date(Date.now() - (30 - i) * 86400000),
        drawdown: drawdown * 100 // Convert to percentage
      });
    }
    
    return points;
  }
}

export class MockRiskManager {
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async getPortfolioMetrics(): Promise<any> {
    return {
      currentHeat: Math.random() * 0.15, // 0-15%
      maxDrawdown: Math.random() * 0.04, // 0-4%
      defensiveMode: Math.random() > 0.8, // 20% chance
      currentPnL: (Math.random() - 0.5) * 10000, // -5k to +5k
      consecutiveLosses: Math.floor(Math.random() * 3)
    };
  }

  async calculatePositionSize(ticker: string, confidence: number, baseSize: number, defensive = true): Promise<any> {
    const sizeMultiplier = defensive ? 0.5 : 1.0;
    const confidenceMultiplier = confidence * 1.2; // Higher confidence = larger size
    
    return {
      quantity: Math.floor(baseSize * sizeMultiplier * confidenceMultiplier / 100),
      reasoning: `Confidence: ${confidence.toFixed(2)}, Defensive: ${defensive}`
    };
  }
}

export class MockDataPipeline {
  private prices: Map<string, number> = new Map();

  constructor(config: any) {
    // Initialize with mock prices
    const tickers = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'META', 'AMZN', 'GOOGL', 'NFLX'];
    tickers.forEach(ticker => {
      this.prices.set(ticker, 100 + Math.random() * 400);
    });
  }

  async initialize(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  async disconnect(): Promise<void> {
    // Mock disconnect
  }

  async processMarketDataBatch(updates: any[]): Promise<void> {
    updates.forEach(update => {
      this.prices.set(update.ticker, update.price);
    });
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  async getCurrentPrice(ticker: string): Promise<number> {
    return this.prices.get(ticker) || 100;
  }

  async updatePrice(ticker: string, price: number): Promise<void> {
    this.prices.set(ticker, price);
  }
}

export class MockConfigurationManager {
  private config: any;

  constructor() {
    this.config = {
      orchestrator: {
        maxConcurrentTrades: 3,
        monitoringInterval: 1000
      },
      signal: {
        confidenceThreshold: 0.6,
        factorWeights: {
          trend: 0.25,
          momentum: 0.20,
          volume: 0.20,
          ribbon: 0.15,
          fibonacci: 0.10,
          gamma: 0.10
        }
      },
      options: {
        deltaRange: [0.30, 0.70],
        dteRange: [7, 45],
        preferredDte: 21
      },
      trading: {
        maxPositionSize: 0.02,
        maxPortfolioHeat: 0.20
      },
      analytics: {
        learningRate: 0.1,
        calibrationBounds: 0.2
      },
      risk: {
        maxDrawdown: 0.05,
        consecutiveLossLimit: 2
      },
      data: {
        primarySource: 'polygon',
        backupSource: 'twelvedata',
        updateInterval: 1000
      }
    };
  }

  async loadConfiguration(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  getCurrentConfig(): any {
    return { ...this.config };
  }

  getDataConfig(): any {
    return this.config.data;
  }

  getRiskConfig(): any {
    return this.config.risk;
  }

  getSignalConfig(): any {
    return this.config.signal;
  }

  getOptionsConfig(): any {
    return this.config.options;
  }

  getTradingConfig(): any {
    return this.config.trading;
  }

  getAnalyticsConfig(): any {
    return this.config.analytics;
  }

  async updateConfiguration(newConfig: any): Promise<any> {
    this.config = { ...this.config, ...newConfig };
    return { success: true };
  }
}