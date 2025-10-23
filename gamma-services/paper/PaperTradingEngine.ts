import { EventBus } from '../core/EventBus';
import { OptionsChainService } from '../data/OptionsChainService';
import { PositionManager } from './PositionManager';
import { RiskManager } from './RiskManager';
import { DatabaseManager } from '../database/DatabaseManager';
import { AutomatedPositionManager, PositionManagementConfig } from './AutomatedPositionManager';
import { ExitConditionManager, ExitConditionConfig } from './ExitConditionManager';
import { DEFAULT_POSITION_MANAGEMENT_CONFIG } from './AutomatedPositionManagerConfig';
import { performanceMonitor } from '../monitoring/PerformanceMonitor';
import { errorHandler } from '../errors/ErrorHandler';
import { gracefulDegradationManager } from '../errors/GracefulDegradation';
import { logger, createLogger } from '../logging/Logger';
import { auditLogger } from '../logging/AuditLogger';
import { alertSystem } from '../alerts/AlertSystem';
import { 
  PaperTradingError,
  TradeExecutionError,
  DataSourceError,
  PositionManagementError,
  DatabaseError,
  ERROR_CODES
} from '../errors/PaperTradingErrors';
import { 
  PaperOrder, 
  PaperPosition, 
  TradeSignal, 
  TradeAnalysis, 
  ExitReason,
  PerformanceMetrics,
  validateTradeSignal
} from '../models/PaperTradingTypes';

// Re-export types for external use
export {
  PaperPosition,
  TradeSignal,
  TradeAnalysis,
  ExitReason,
  OptionsGreeks
} from '../models/PaperTradingTypes';

export class PaperTradingEngine {
  private positions: Map<string, PaperPosition> = new Map();
  private orders: Map<string, PaperOrder> = new Map();
  private accountBalance: number = 100000; // $100k paper account
  private initialBalance: number = 100000;
  private portfolio: Map<string, number> = new Map(); // Ticker -> quantity
  private tradeHistory: PaperPosition[] = [];
  private analysis: TradeAnalysis[] = [];
  private accountId: string;
  private engineLogger: any;
  
  // Automated position management components
  private automatedPositionManager: AutomatedPositionManager;
  private exitConditionManager: ExitConditionManager;

  constructor(
    private eventBus: EventBus,
    private optionsChainService: OptionsChainService,
    private positionManager: PositionManager,
    private riskManager: RiskManager,
    private databaseManager: DatabaseManager,
    accountId?: string,
    positionManagementConfig?: PositionManagementConfig
  ) {
    this.accountId = accountId || 'default-paper-account';
    this.engineLogger = createLogger({ 
      component: 'PaperTradingEngine',
      accountId: this.accountId 
    });
    
    // Initialize automated position management
    const exitConfig: ExitConditionConfig = {
      profitTargetPercent: 50,
      stopLossPercent: 50,
      timeDecayThreshold: 0.30,
      trailingStopPercent: 20,
      breakevenStopEnabled: true,
      expirationDaysWarning: 2,
      enableAutoExit: true
    };
    
    this.exitConditionManager = new ExitConditionManager(this.eventBus, exitConfig);
    this.automatedPositionManager = new AutomatedPositionManager(
      positionManagementConfig || DEFAULT_POSITION_MANAGEMENT_CONFIG,
      this.exitConditionManager,
      this.riskManager,
      this.databaseManager,
      this.eventBus
    );
    
    this.setupEventListeners();
    this.setupErrorHandling();
    this.setupLoggingAndAlerting();
    this.initializeAccount();
    this.startAutomatedManagement();
  }

  private setupEventListeners(): void {
    // Listen for trade signals from ReadySetGo controller
    this.eventBus.on('trade:executed', this.handleTradeSignal.bind(this));
    this.eventBus.on('market:data', this.updatePositions.bind(this));
    this.eventBus.on('exit:signal', this.handleExitSignal.bind(this));
  }

  private setupErrorHandling(): void {
    // Listen for degradation events
    gracefulDegradationManager.on('service-degraded', async (event) => {
      await this.engineLogger.warn('SYSTEM', `Service degraded: ${event.service}`, {
        metadata: {
          service: event.service,
          level: event.strategy.level,
          description: event.strategy.description
        }
      });
      
      // Update alert system
      alertSystem.updateMetric('service.degraded', true);
      
      this.eventBus.emit('paper:service:degraded', event);
    });

    gracefulDegradationManager.on('service-recovered', async (event) => {
      await this.engineLogger.info('SYSTEM', `Service recovered: ${event.service}`, {
        metadata: {
          service: event.service
        }
      });
      
      // Update alert system
      alertSystem.updateMetric('service.recovered', true);
      
      this.eventBus.emit('paper:service:recovered', event);
    });

    // Listen for error events
    errorHandler.on('error-occurred', async (error: PaperTradingError) => {
      await this.engineLogger.error('SYSTEM', `Error occurred: ${error.message}`, {
        metadata: {
          errorCode: error.code,
          severity: error.severity,
          category: error.category,
          correlationId: error.correlationId
        }
      }, error);
      
      // Log audit event
      await auditLogger.logErrorOccurred(
        error.category,
        error.message,
        {
          accountId: this.accountId,
          component: 'PaperTradingEngine',
          correlationId: error.correlationId,
          metadata: { errorCode: error.code, severity: error.severity }
        }
      );
      
      // Update alert metrics
      alertSystem.updateMetric('error.severity', error.severity);
      alertSystem.updateMetric('error.rate', 1);
      
      this.eventBus.emit('paper:error', {
        errorCode: error.code,
        severity: error.severity,
        category: 'PAPER_TRADING',
        correlationId: error.name
      });
      
      // Trigger degradation for critical errors
      if (error.shouldAlert()) {
        await this.handleCriticalError(error);
      }
    });

    errorHandler.on('circuit-breaker-opened', async (event) => {
      await this.engineLogger.warn('SYSTEM', `Circuit breaker opened for ${event.service}`, {
        metadata: {
          service: event.service,
          failureCount: event.failureCount
        }
      });
      
      // Update alert system
      alertSystem.updateMetric('circuit.breaker.open', true);
      
      this.eventBus.emit('paper:circuit-breaker:opened', event);
    });
  }

  private setupLoggingAndAlerting(): void {
    // Set up alert system listeners
    alertSystem.on('alert-triggered', async (alert) => {
      await this.engineLogger.warn('ALERT', `Alert triggered: ${alert.title}`, {
        metadata: {
          alertId: alert.id,
          type: alert.type,
          severity: alert.severity
        }
      });
      
      // Log audit event
      await auditLogger.logAlertTriggered(
        alert.id,
        alert.type,
        alert.severity,
        {
          accountId: this.accountId,
          component: 'PaperTradingEngine',
          correlationId: alert.correlationId
        }
      );
      
      this.eventBus.emit('paper:alert:triggered', alert);
    });

    alertSystem.on('alert-acknowledged', async (alert) => {
      await this.engineLogger.info('ALERT', `Alert acknowledged: ${alert.title}`, {
        metadata: {
          alertId: alert.id,
          acknowledgedBy: alert.acknowledgedBy
        }
      });
      
      // Log audit event
      await auditLogger.logAlertAcknowledged(
        alert.id,
        alert.acknowledgedBy || 'system',
        {
          accountId: this.accountId,
          component: 'PaperTradingEngine'
        }
      );
    });

    alertSystem.on('alert-resolved', async (alert) => {
      await this.engineLogger.info('ALERT', `Alert resolved: ${alert.title}`, {
        metadata: {
          alertId: alert.id,
          resolvedBy: alert.resolvedBy
        }
      });
      
      // Log audit event
      await auditLogger.logAlertResolved(
        alert.id,
        alert.resolvedBy || 'system',
        {
          accountId: this.accountId,
          component: 'PaperTradingEngine'
        }
      );
    });

    // Log system start
    auditLogger.logSystemStart({
      accountId: this.accountId,
      component: 'PaperTradingEngine',
      metadata: { version: '1.0.0', environment: process.env.NODE_ENV || 'development' }
    });
  }

  private async handleCriticalError(error: PaperTradingError): Promise<void> {
    try {
      // Determine which service to degrade based on error category
      let service: string | null = null;
      
      switch (error.category) {
        case 'DATA_SOURCE':
        case 'API_CONNECTIVITY':
          service = 'options-data';
          break;
        case 'DATABASE':
          service = 'database';
          break;
        case 'TRADE_EXECUTION':
          service = 'risk-management';
          break;
        case 'SYSTEM':
          service = 'performance';
          break;
      }

      if (service) {
        await gracefulDegradationManager.degradeService(service, error);
      }
    } catch (degradationError) {
      console.error('Failed to handle critical error:', degradationError);
    }
  }

  public async executePaperTrade(signal: TradeSignal): Promise<string> {
    return await errorHandler.handleTradeExecutionError(
      new Error('Trade execution initiated'),
      async () => {
        return await performanceMonitor.trackOperation('trade-execution', async () => {
          try {
            // Validate signal format
            const validatedSignal = validateTradeSignal(signal);

            // 1. Validate trade with risk manager
            const riskValidation = await performanceMonitor.trackOperation('risk-check', async () => {
              return await this.riskManager.validateTrade(validatedSignal, this.accountBalance);
            }, { ticker: validatedSignal.ticker, confidence: validatedSignal.confidence });

            if (!riskValidation.approved) {
              throw new TradeExecutionError(
                `Trade rejected: ${riskValidation.reason}`,
                ERROR_CODES.TRADE_EXECUTION_FAILED,
                'MEDIUM',
                {
                  operation: 'risk-validation',
                  ticker: validatedSignal.ticker,
                  accountId: this.accountId,
                  metadata: { reason: riskValidation.reason }
                }
              );
            }

            // 2. Select optimal option contract with error handling
            const optionContract = await errorHandler.handleDataSourceError(
              new Error('Options chain fetch'),
              async () => {
                return await performanceMonitor.trackOperation('options-chain-fetch', async () => {
                  return await this.optionsChainService.findOptimalContract(
                    validatedSignal.ticker,
                    validatedSignal.side === 'LONG' ? 'CALL' : 'PUT',
                    validatedSignal.confidence,
                    validatedSignal.expectedMove,
                    validatedSignal.timeframe
                  );
                }, { ticker: validatedSignal.ticker, side: validatedSignal.side });
              },
              // Fallback to synthetic pricing if available
              async () => {
                return await this.generateSyntheticContract(validatedSignal);
              },
              `options-chain-${validatedSignal.ticker}`
            );

            // 3. Calculate position size with automated validation
            let positionSize = performanceMonitor.trackSyncOperation('position-sizing', () => {
              return this.positionManager.calculatePositionSize(
                validatedSignal,
                optionContract,
                this.accountBalance
              );
            }, { ticker: validatedSignal.ticker, optionPrice: optionContract.midPrice });

            // Validate position size with automated position manager
            const sizeValidation = await this.automatedPositionManager.validatePositionSize(
              validatedSignal,
              positionSize,
              this.accountBalance
            );

            if (!sizeValidation.approved) {
              positionSize = sizeValidation.recommendedSize;
              await this.engineLogger.info('POSITION_MANAGEMENT', 'Position size adjusted by automated manager', {
                originalSize: sizeValidation.originalSize,
                recommendedSize: sizeValidation.recommendedSize,
                reason: sizeValidation.adjustmentReason,
                riskMetrics: sizeValidation.riskMetrics
              });
            }

            if (positionSize === 0) {
              throw new TradeExecutionError(
                'Position size calculated as zero - insufficient funds or risk limits',
                ERROR_CODES.POSITION_SIZE_ZERO,
          'MEDIUM',
          true
        );
      }

      // 4. Create paper position through position manager
      const position = await this.positionManager.createPosition(validatedSignal, optionContract);
      position.quantity = positionSize;

      // 5. Create paper order record
      const order: PaperOrder = {
        id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ticker: validatedSignal.ticker,
        optionSymbol: optionContract.symbol,
        side: 'BUY',
        quantity: positionSize,
        price: optionContract.midPrice,
        type: optionContract.type,
        strike: optionContract.strike,
        expiration: optionContract.expiration.toISOString(),
        greeks: optionContract.greeks,
        filled: true, // Paper trading fills immediately
        fillPrice: optionContract.midPrice,
        timestamp: Date.now()
      };

      // 6. Update internal tracking
      this.positions.set(position.id, position);
      this.orders.set(order.id, order);
      this.portfolio.set(validatedSignal.ticker, (this.portfolio.get(validatedSignal.ticker) || 0) + positionSize);

      // 7. Update account balance (deduct premium paid)
      const premiumPaid = optionContract.midPrice * positionSize * 100;
      this.accountBalance -= premiumPaid;

      // 8. Store in database
      try {
        await this.databaseManager.createPaperPosition(position);
        await this.databaseManager.updatePaperAccount(this.accountId, {
          current_balance: this.accountBalance,
          available_balance: this.accountBalance
        });
      } catch (dbError) {
        console.error('Database storage failed:', dbError);
        // Continue execution but log the error
        this.eventBus.emitSystemError(
          dbError as Error,
          'Paper trade database storage',
          'MEDIUM'
        );
      }

      // 9. Emit events for tracking
      this.eventBus.emit('paper:trade:executed', {
        order,
        position,
        accountBalance: this.accountBalance
      });

      console.log(`📄 Paper trade executed: ${validatedSignal.ticker} ${optionContract.type} ${positionSize} contracts @ $${optionContract.midPrice}`);
      return position.id;
    } catch (error) {
      if (error instanceof PaperTradingError) {
        throw error;
      }
      
      const tradingError = new PaperTradingError(
        `Paper trade execution failed: ${error}`,
        'EXECUTION_FAILED',
        'HIGH',
        true
      );
      
      this.eventBus.emitSystemError(tradingError, 'Paper trade execution', 'HIGH');
      throw tradingError;
    }
      });
    });
  }

  private async selectOptionContract(ticker: string, side: 'LONG' | 'SHORT', confidence: number): Promise<{
    symbol: string;
    type: 'CALL' | 'PUT';
    strike: number;
    expiration: string;
    price: number;
    greeks: any;
  }> {
    // Get options chain from market data
    const optionsChain = await this.optionsChainService.getOptionsChain(ticker);

    // Select based on strategy and confidence
    const daysToExpiration = confidence > 0.8 ? 7 : 3; // Higher confidence = longer expiry
    const targetDelta = side === 'LONG' ? 0.3 : -0.3;

    const selectedOption = await this.optionsChainService.findOptimalContract(
      ticker,
      side === 'LONG' ? 'CALL' : 'PUT',
      confidence,
      2.5, // expectedMove placeholder
      daysToExpiration <= 3 ? 'SHORT' : 'MEDIUM'
    );

    return {
      symbol: selectedOption.symbol,
      type: selectedOption.type,
      strike: selectedOption.strike,
      expiration: selectedOption.expiration.toISOString(),
      price: selectedOption.midPrice,
      greeks: selectedOption.greeks
    };
  }

  private calculateOptionPositionSize(signalSize: number, optionPrice: number, confidence: number): number {
    const maxRiskPerTrade = this.accountBalance * 0.02; // 2% risk per trade
    const contractValue = optionPrice * 100; // Options are per share, 100 shares per contract
    let positionSize = Math.floor((this.accountBalance * signalSize * 0.1) / contractValue);

    // Adjust based on confidence
    if (confidence > 0.8) {
      positionSize = Math.floor(positionSize * 1.2);
    } else if (confidence < 0.6) {
      positionSize = Math.floor(positionSize * 0.8);
    }

    // Ensure minimum 1 contract
    return Math.max(1, positionSize);
  }



  private analyzeTrade(position: PaperPosition, exitReason: string): void {
    const analysis: TradeAnalysis = {
      signalId: position.signalId,
      ticker: position.ticker,
      entryConfidence: position.confidence,
      exitConfidence: 0, // Would need current confidence
      expectedMove: 2.5, // Placeholder
      actualMove: Math.abs(position.pnlPercent),
      pnl: position.pnl,
      holdingPeriod: position.exitTimestamp 
        ? position.exitTimestamp.getTime() - position.entryTimestamp.getTime()
        : 0,
      maxFavorableExcursion: position.maxFavorableExcursion,
      maxAdverseExcursion: position.maxAdverseExcursion,
      exitReason: exitReason as ExitReason,
      learnings: this.generateLearnings(position, exitReason)
    };

    this.analysis.push(analysis);

    // Emit for algorithm feedback
    this.eventBus.emit('paper:trade:analyzed', analysis);
  }

  private generateLearnings(position: PaperPosition, exitReason: string): string[] {
    const learnings: string[] = [];

    if (position.pnl > 0) {
      learnings.push(`High confidence (${position.confidence}) led to profitable trade`);
      if (position.confidence > 0.8) {
        learnings.push('Very high confidence signals perform well');
      }
    } else {
      learnings.push(`Confidence (${position.confidence}) was misleading`);
      if (position.confidence > 0.7 && position.pnl < 0) {
        learnings.push('High confidence false positive - review signal conditions');
      }
    }

    if (exitReason === 'TIME_DECAY') {
      learnings.push('Consider shorter expiration for this signal type');
    }

    return learnings;
  }

  public getPerformanceMetrics() {
    const totalTrades = this.tradeHistory.length;
    const winningTrades = this.tradeHistory.filter(t => t.pnl > 0).length;
    const losingTrades = this.tradeHistory.filter(t => t.pnl < 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const totalPnL = this.tradeHistory.reduce((sum, t) => sum + t.pnl, 0);
    const averageWin = winningTrades > 0 
      ? this.tradeHistory.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0) / winningTrades 
      : 0;
    const averageLoss = losingTrades > 0 
      ? this.tradeHistory.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0) / losingTrades 
      : 0;

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      totalPnL,
      averageWin,
      averageLoss,
      profitFactor: averageLoss !== 0 ? Math.abs(averageWin / averageLoss) : 0,
      accountBalance: this.accountBalance
    };
  }

  public getOpenPositions(): PaperPosition[] {
    return Array.from(this.positions.values());
  }

  public getAccountBalance(): number {
    return this.accountBalance;
  }

  private handleTradeSignal(signal: TradeSignal): void {
    this.executePaperTrade(signal).catch(error => {
      console.error('Failed to execute paper trade:', error);
    });
  }

  private handleExitSignal(data: { positionId: string; reason: ExitReason }): void {
    const position = this.positions.get(data.positionId);
    if (position) {
      this.closePosition(data.positionId, position.currentPrice, data.reason);
    }
  }

  private async initializeAccount(): Promise<void> {
    try {
      // Try to get existing account or create new one
      let account = await this.databaseManager.getPaperAccount(this.accountId);
      
      if (!account) {
        account = await this.databaseManager.createPaperAccount(this.accountId, this.initialBalance);
      }
      
      this.accountBalance = account.current_balance;
      this.initialBalance = account.initial_balance;
      
      // Load existing positions
      const positions = await this.databaseManager.getPaperPositions(account.id, 'OPEN');
      for (const position of positions) {
        this.positions.set(position.id, position);
      }
      
      console.log(`📄 Paper account initialized: $${this.accountBalance} balance, ${positions.length} open positions`);
    } catch (error) {
      console.error('Failed to initialize paper account:', error);
      // Continue with default values
    }
  }

  public async getDetailedPerformanceMetrics(): Promise<PerformanceMetrics> {
    const baseMetrics = this.getPerformanceMetrics();
    
    // Calculate additional metrics
    const allTrades = [...this.tradeHistory];
    const returns = allTrades.map(trade => trade.pnlPercent / 100);
    
    // Calculate Sharpe ratio (simplified)
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length || 0;
    const returnStdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length || 0
    );
    const sharpeRatio = returnStdDev > 0 ? (avgReturn * Math.sqrt(252)) / (returnStdDev * Math.sqrt(252)) : 0;

    // Calculate drawdown
    let peak = this.initialBalance;
    let maxDrawdown = 0;
    let currentDrawdown = 0;
    
    for (const trade of allTrades) {
      const currentBalance = this.initialBalance + allTrades
        .filter(t => t.exitTimestamp && t.exitTimestamp <= trade.exitTimestamp!)
        .reduce((sum, t) => sum + t.pnl, 0);
      
      if (currentBalance > peak) {
        peak = currentBalance;
      }
      
      currentDrawdown = (peak - currentBalance) / peak;
      maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
    }

    // Calculate consecutive wins/losses
    let consecutiveWins = 0;
    let consecutiveLosses = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    
    for (const trade of allTrades) {
      if (trade.pnl > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        consecutiveWins = Math.max(consecutiveWins, currentWinStreak);
      } else {
        currentLossStreak++;
        currentWinStreak = 0;
        consecutiveLosses = Math.max(consecutiveLosses, currentLossStreak);
      }
    }

    const bestTrade = Math.max(...allTrades.map(t => t.pnl), 0);
    const worstTrade = Math.min(...allTrades.map(t => t.pnl), 0);
    const avgHoldingPeriod = allTrades.reduce((sum, t) => {
      if (t.exitTimestamp && t.entryTimestamp) {
        return sum + (t.exitTimestamp.getTime() - t.entryTimestamp.getTime());
      }
      return sum;
    }, 0) / allTrades.length / (1000 * 60 * 60); // Convert to hours

    return {
      ...baseMetrics,
      sharpeRatio,
      maxDrawdown: maxDrawdown * this.initialBalance,
      maxDrawdownPercent: maxDrawdown * 100,
      averageHoldingPeriod: avgHoldingPeriod,
      bestTrade,
      worstTrade,
      consecutiveWins,
      consecutiveLosses,
      returnsPercent: ((this.accountBalance - this.initialBalance) / this.initialBalance) * 100
    };
  }

  public async forceCloseAllPositions(reason: ExitReason = 'RISK_MANAGEMENT'): Promise<void> {
    const openPositions = Array.from(this.positions.values()).filter(p => p.status === 'OPEN');
    
    for (const position of openPositions) {
      await this.closePosition(position.id, position.currentPrice, reason);
    }
    
    console.log(`📄 Force closed ${openPositions.length} positions due to ${reason}`);
  }

  public getAccountSummary(): {
    accountId: string;
    balance: number;
    initialBalance: number;
    totalPnL: number;
    totalPnLPercent: number;
    openPositions: number;
    totalTrades: number;
    availableBalance: number;
  } {
    const totalPnL = this.accountBalance - this.initialBalance;
    const openPositionsCount = Array.from(this.positions.values()).filter(p => p.status === 'OPEN').length;
    
    return {
      accountId: this.accountId,
      balance: this.accountBalance,
      initialBalance: this.initialBalance,
      totalPnL,
      totalPnLPercent: (totalPnL / this.initialBalance) * 100,
      openPositions: openPositionsCount,
      totalTrades: this.tradeHistory.length,
      availableBalance: this.accountBalance
    };
  }

  public async resetAccount(newBalance: number = 100000): Promise<void> {
    // Close all positions
    await this.forceCloseAllPositions('MANUAL');
    
    // Reset balances
    this.accountBalance = newBalance;
    this.initialBalance = newBalance;
    
    // Clear history
    this.tradeHistory = [];
    this.analysis = [];
    this.portfolio.clear();
    
    // Update database
    try {
      await this.databaseManager.updatePaperAccount(this.accountId, {
        current_balance: newBalance,
        initial_balance: newBalance,
        total_pnl: 0,
        available_balance: newBalance
      });
    } catch (error) {
      console.error('Failed to reset account in database:', error);
    }
    
    console.log(`📄 Paper account reset to $${newBalance}`);
  }

  public getPositionsByTicker(ticker: string): PaperPosition[] {
    return Array.from(this.positions.values()).filter(p => p.ticker === ticker);
  }

  public getPortfolioExposure(): Record<string, { positions: number; exposure: number; pnl: number }> {
    const exposure: Record<string, { positions: number; exposure: number; pnl: number }> = {};
    
    for (const position of this.positions.values()) {
      if (position.status === 'OPEN') {
        if (!exposure[position.ticker]) {
          exposure[position.ticker] = { positions: 0, exposure: 0, pnl: 0 };
        }
        
        exposure[position.ticker].positions++;
        exposure[position.ticker].exposure += position.currentPrice * position.quantity * 100;
        exposure[position.ticker].pnl += position.pnl;
      }
    }
    
    return exposure;
  }


  /**
   * Generate synthetic option contract when real data is unavailable
   */
  private async generateSyntheticContract(signal: TradeSignal): Promise<any> {
    console.log(`Generating synthetic contract for ${signal.ticker} due to data source failure`);
    
    // Use Black-Scholes model for synthetic pricing
    const underlyingPrice = 100; // Placeholder - would get from cache or estimate
    const strike = signal.side === 'LONG' ? underlyingPrice * 1.02 : underlyingPrice * 0.98;
    const daysToExpiration = signal.confidence > 0.8 ? 7 : 3;
    const impliedVolatility = 0.25; // 25% default IV
    
    // Simple Black-Scholes approximation for synthetic pricing
    const timeToExpiration = daysToExpiration / 365;
    const syntheticPrice = this.calculateBlackScholesPrice(
      underlyingPrice,
      strike,
      timeToExpiration,
      0.05, // Risk-free rate
      impliedVolatility,
      signal.side === 'LONG' ? 'CALL' : 'PUT'
    );

    return {
      symbol: `${signal.ticker}_SYNTHETIC_${strike}_${new Date().toISOString().split('T')[0]}`,
      strike,
      expiration: new Date(Date.now() + daysToExpiration * 24 * 60 * 60 * 1000),
      type: signal.side === 'LONG' ? 'CALL' : 'PUT',
      bid: syntheticPrice * 0.95,
      ask: syntheticPrice * 1.05,
      midPrice: syntheticPrice,
      volume: 0,
      openInterest: 0,
      impliedVolatility,
      greeks: {
        delta: signal.side === 'LONG' ? 0.5 : -0.5,
        gamma: 0.1,
        theta: -0.05,
        vega: 0.2,
        rho: 0.01,
        impliedVolatility
      },
      daysToExpiration,
      synthetic: true // Mark as synthetic
    };
  }

  /**
   * Simple Black-Scholes pricing for synthetic contracts
   */
  private calculateBlackScholesPrice(
    S: number, // Current stock price
    K: number, // Strike price
    T: number, // Time to expiration
    r: number, // Risk-free rate
    sigma: number, // Volatility
    type: 'CALL' | 'PUT'
  ): number {
    const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    
    const N = (x: number) => 0.5 * (1 + this.erf(x / Math.sqrt(2)));
    
    if (type === 'CALL') {
      return S * N(d1) - K * Math.exp(-r * T) * N(d2);
    } else {
      return K * Math.exp(-r * T) * N(-d2) - S * N(-d1);
    }
  }

  /**
   * Error function approximation for Black-Scholes
   */
  private erf(x: number): number {
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  /**
   * Enhanced error handling for position updates
   */
  public updatePositions(marketData: {
    ticker: string;
    price: number;
    options: { [symbol: string]: number };
    timestamp: number;
  }): void {
    try {
      performanceMonitor.trackSyncOperation('position-update', () => {
        let totalPnL = 0;

        for (const [positionId, position] of this.positions) {
          if (position.status === 'OPEN') {
            try {
              const currentPrice = marketData.options[position.optionSymbol] || position.currentPrice;
              
              // Track PnL calculation performance
              const { pnl, pnlPercent } = performanceMonitor.trackSyncOperation('pnl-calculation', () => {
                const pnl = (currentPrice - position.entryPrice) * position.quantity * 100;
                const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
                return { pnl, pnlPercent };
              }, { positionId, ticker: position.ticker });

              // Update MFE/MAE
              if (pnl > position.maxFavorableExcursion) {
                position.maxFavorableExcursion = pnl;
              }
              if (pnl < position.maxAdverseExcursion) {
                position.maxAdverseExcursion = pnl;
              }

              position.currentPrice = currentPrice;
              position.pnl = pnl;
              position.pnlPercent = pnlPercent;
              totalPnL += pnl;

              // Emit PnL update
              this.eventBus.emit('paper:position:update', {
                positionId,
                currentPrice,
                pnl,
                pnlPercent,
                timestamp: marketData.timestamp
              });
            } catch (positionError) {
              // Handle individual position update errors
              errorHandler.handlePositionError(
                positionError as Error,
                async () => { /* No retry for position updates */ },
                {
                  positionId,
                  ticker: position.ticker,
                  operation: 'position-update'
                }
              ).catch(err => {
                console.error(`Failed to handle position update error for ${positionId}:`, err);
              });
            }
          }
        }

        // Update account balance (paper trading)
        this.accountBalance = this.initialBalance + totalPnL;
        this.eventBus.emit('paper:account:update', {
          balance: this.accountBalance,
          totalPnL,
          timestamp: marketData.timestamp
        });
      }, { 
        ticker: marketData.ticker, 
        positionsCount: this.positions.size,
        timestamp: marketData.timestamp 
      });
    } catch (error) {
      console.error('Position update failed:', error);
      // Emit error event but don't throw to prevent system crash
      this.eventBus.emit('paper:position:update:error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ticker: marketData.ticker,
        timestamp: marketData.timestamp
      });
    }
  }

  /**
   * Enhanced error handling for position closure
   */
  public async closePosition(positionId: string, exitPrice: number, reason: ExitReason): Promise<void> {
    return await errorHandler.handlePositionError(
      new Error('Position closure initiated'),
      async () => {
        const position = this.positions.get(positionId);
        if (!position || position.status === 'CLOSED') {
          throw new PositionManagementError(
            `Position ${positionId} not found or already closed`,
            ERROR_CODES.POSITION_NOT_FOUND,
            'MEDIUM',
            { operation: 'close-position', positionId }
          );
        }

        position.exitPrice = exitPrice;
        position.exitTimestamp = new Date();
        position.status = 'CLOSED';
        position.exitReason = reason;

        const finalPnL = (exitPrice - position.entryPrice) * position.quantity * 100;
        position.pnl = finalPnL;
        position.pnlPercent = ((exitPrice - position.entryPrice) / position.entryPrice) * 100;

        // Move to trade history
        this.tradeHistory.push(position);
        this.positions.delete(positionId);

        // Analyze trade for learning
        this.analyzeTrade(position, reason);

        // Update database with error handling
        try {
          await errorHandler.handleDatabaseError(
            new Error('Database update for position closure'),
            async () => {
              await this.databaseManager.updatePaperPosition(positionId, {
                status: 'CLOSED',
                exit_price: exitPrice,
                exit_timestamp: position.exitTimestamp,
                pnl: finalPnL,
                pnl_percent: position.pnlPercent,
                exit_reason: reason
              });
            },
            { query: 'UPDATE paper_positions', table: 'paper_positions' }
          );
        } catch (dbError) {
          console.error('Failed to update position in database:', dbError);
          // Continue execution - position is closed in memory
        }

        this.eventBus.emit('paper:position:closed', {
          position,
          reason,
          finalPnL
        });
      },
      {
        positionId,
        ticker: this.positions.get(positionId)?.ticker || 'unknown',
        operation: 'close-position'
      }
    );
  }

  /**
   * Enhanced health check with comprehensive error handling
   */
  public async healthCheck(): Promise<{ healthy: boolean; issues: string[]; performance: any; errorMetrics: any }> {
    return await performanceMonitor.trackOperation('health-check', async () => {
      const issues: string[] = [];
      
      // Check account balance
      if (this.accountBalance < 0) {
        issues.push('Negative account balance');
      }
      
      // Check for stale positions
      const now = new Date();
      const stalePositions = Array.from(this.positions.values()).filter(p => 
        p.status === 'OPEN' && (now.getTime() - p.entryTimestamp.getTime()) > 30 * 24 * 60 * 60 * 1000 // 30 days
      );
      
      if (stalePositions.length > 0) {
        issues.push(`${stalePositions.length} positions older than 30 days`);
      }
      
      // Check database connectivity with error handling
      try {
        const dbHealthy = await performanceMonitor.trackOperation('database-health-check', async () => {
          return await this.databaseManager.healthCheck();
        });
        
        if (!dbHealthy) {
          issues.push('Database connectivity issues');
        }
      } catch (error) {
        issues.push('Database health check failed');
      }
      
      // Get performance metrics for this engine
      const performanceStats = {
        tradeExecution: performanceMonitor.getOperationStats('trade-execution', 30),
        positionUpdates: performanceMonitor.getOperationStats('position-update', 30),
        pnlCalculations: performanceMonitor.getOperationStats('pnl-calculation', 30),
        riskChecks: performanceMonitor.getOperationStats('risk-check', 30)
      };
      
      // Check for performance issues
      if (performanceStats.tradeExecution.averageDuration > 1000) {
        issues.push(`Trade execution is slow: ${performanceStats.tradeExecution.averageDuration}ms average`);
      }
      
      if (performanceStats.tradeExecution.errorRate > 0.1) {
        issues.push(`High trade execution error rate: ${(performanceStats.tradeExecution.errorRate * 100).toFixed(1)}%`);
      }

      // Get error metrics
      const errorMetrics = errorHandler.getErrorMetrics();
      const circuitBreakerStatus = errorHandler.getCircuitBreakerStatus();
      const systemHealth = gracefulDegradationManager.getSystemHealth();

      // Check for circuit breaker issues
      Object.entries(circuitBreakerStatus).forEach(([service, status]) => {
        if (status.isOpen) {
          issues.push(`Circuit breaker open for ${service}`);
        }
      });

      // Check for service degradations
      if (systemHealth.status !== 'HEALTHY') {
        issues.push(`System health: ${systemHealth.status} (${systemHealth.degradedServices} degraded services)`);
      }
      
      return {
        healthy: issues.length === 0,
        issues,
        performance: performanceStats,
        errorMetrics: {
          ...errorMetrics,
          circuitBreakers: circuitBreakerStatus,
          systemHealth
        }
      };
    }, { accountId: this.accountId, positionsCount: this.positions.size });
  }

  /**
   * Get comprehensive error and degradation status
   */
  public getErrorStatus(): {
    errorMetrics: any;
    circuitBreakers: any;
    activeDegradations: any;
    systemHealth: any;
  } {
    return {
      errorMetrics: errorHandler.getErrorMetrics(),
      circuitBreakers: errorHandler.getCircuitBreakerStatus(),
      activeDegradations: gracefulDegradationManager.getActiveDegradations(),
      systemHealth: gracefulDegradationManager.getSystemHealth()
    };
  }

  /**
   * Force recovery from degraded state
   */
  public async forceRecovery(service?: string): Promise<void> {
    if (service) {
      await gracefulDegradationManager.forceRecovery(service);
    } else {
      // Recover all degraded services
      const activeDegradations = gracefulDegradationManager.getActiveDegradations();
      for (const degradation of activeDegradations) {
        await gracefulDegradationManager.forceRecovery(degradation.service);
      }
    }
  }

  // Automated Position Management Methods

  private async startAutomatedManagement(): Promise<void> {
    try {
      // Start exit condition monitoring
      this.exitConditionManager.startMonitoring();
      
      // Start automated position management
      await this.automatedPositionManager.startAutomation();
      
      await this.engineLogger.info('SYSTEM', 'Automated position management started');
    } catch (error) {
      await this.engineLogger.error('SYSTEM', 'Failed to start automated management', {}, error as Error);
    }
  }

  public async stopAutomatedManagement(): Promise<void> {
    try {
      // Stop exit condition monitoring
      this.exitConditionManager.stopMonitoring();
      
      // Stop automated position management
      this.automatedPositionManager.stopAutomation();
      
      await this.engineLogger.info('SYSTEM', 'Automated position management stopped');
    } catch (error) {
      await this.engineLogger.error('SYSTEM', 'Failed to stop automated management', {}, error as Error);
    }
  }

  public getAutomatedPositionManagerStats(): any {
    return this.automatedPositionManager.getStats();
  }

  public getPortfolioHeatMetrics(): any {
    return this.automatedPositionManager.getPortfolioHeatMetrics();
  }

  public updatePositionManagementConfig(config: Partial<PositionManagementConfig>): void {
    this.automatedPositionManager.updateConfig(config);
  }

  public getPositionManagementConfig(): PositionManagementConfig {
    return this.automatedPositionManager.getConfig();
  }

  public getExitConditionStats(): any {
    return this.exitConditionManager.getStats();
  }

  public async shutdown(): Promise<void> {
    try {
      // Stop automated management
      await this.stopAutomatedManagement();
      
      // Shutdown automated position manager
      await this.automatedPositionManager.shutdown();
      
      // Shutdown exit condition manager
      this.exitConditionManager.shutdown();
      
      await this.engineLogger.info('SYSTEM', 'Paper trading engine shutdown complete');
    } catch (error) {
      await this.engineLogger.error('SYSTEM', 'Error during shutdown', {}, error as Error);
    }
  }
}