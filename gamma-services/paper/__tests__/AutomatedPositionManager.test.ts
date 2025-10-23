import { AutomatedPositionManager, PositionManagementConfig } from '../AutomatedPositionManager';
import { ExitConditionManager, ExitConditionConfig } from '../ExitConditionManager';
import { RiskManager } from '../RiskManager';
import { DatabaseManager } from '../../database/DatabaseManager';
import { EventBus } from '../../core/EventBus';
import { PaperPosition, TradeSignal, ExitReason } from '../../models/PaperTradingTypes';
import { DEFAULT_POSITION_MANAGEMENT_CONFIG } from '../AutomatedPositionManagerConfig';

// Mock dependencies
jest.mock('../../core/EventBus');
jest.mock('../ExitConditionManager');
jest.mock('../RiskManager');
jest.mock('../../database/DatabaseManager');
jest.mock('../../logging/Logger');
jest.mock('../../monitoring/PerformanceMonitor');
jest.mock('../../alerting/AlertSystem');

describe('AutomatedPositionManager', () => {
  let automatedPositionManager: AutomatedPositionManager;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockExitConditionManager: jest.Mocked<ExitConditionManager>;
  let mockRiskManager: jest.Mocked<RiskManager>;
  let mockDatabaseManager: jest.Mocked<DatabaseManager>;
  let config: PositionManagementConfig;

  beforeEach(() => {
    // Create mocks
    mockEventBus = new EventBus() as jest.Mocked<EventBus>;
    mockExitConditionManager = new ExitConditionManager(mockEventBus, {} as ExitConditionConfig) as jest.Mocked<ExitConditionManager>;
    mockRiskManager = new RiskManager(mockEventBus, {}) as jest.Mocked<RiskManager>;
    mockDatabaseManager = new DatabaseManager() as jest.Mocked<DatabaseManager>;

    // Setup mock implementations
    mockEventBus.on = jest.fn();
    mockEventBus.emit = jest.fn();
    mockDatabaseManager.getPaperPositions = jest.fn().mockResolvedValue([]);
    mockDatabaseManager.healthCheck = jest.fn().mockResolvedValue(true);

    config = { ...DEFAULT_POSITION_MANAGEMENT_CONFIG };

    // Create instance
    automatedPositionManager = new AutomatedPositionManager(
      config,
      mockExitConditionManager,
      mockRiskManager,
      mockDatabaseManager,
      mockEventBus
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Position Size Validation', () => {
    it('should approve position size within limits', async () => {
      const signal: TradeSignal = {
        signalId: 'test-signal-1',
        ticker: 'SPY',
        side: 'LONG',
        confidence: 0.8,
        conviction: 0.7,
        expectedMove: 2.5,
        timeframe: 'MEDIUM',
        regime: 'BULL',
        source: 'REGIMECOMPASS',
        timestamp: new Date()
      };

      const proposedSize = 5;
      const accountBalance = 100000;

      const validation = await automatedPositionManager.validatePositionSize(
        signal,
        proposedSize,
        accountBalance
      );

      expect(validation.approved).toBe(true);
      expect(validation.recommendedSize).toBeGreaterThan(0);
      expect(validation.riskMetrics.riskPerTrade).toBeLessThanOrEqual(config.positionSizing.maxRiskPerTrade);
    });

    it('should adjust position size when risk per trade is exceeded', async () => {
      const signal: TradeSignal = {
        signalId: 'test-signal-2',
        ticker: 'SPY',
        side: 'LONG',
        confidence: 0.6,
        conviction: 0.5,
        expectedMove: 2.5,
        timeframe: 'MEDIUM',
        regime: 'BULL',
        source: 'REGIMECOMPASS',
        timestamp: new Date()
      };

      const proposedSize = 50; // Very large size
      const accountBalance = 100000;

      const validation = await automatedPositionManager.validatePositionSize(
        signal,
        proposedSize,
        accountBalance
      );

      expect(validation.approved).toBe(false);
      expect(validation.recommendedSize).toBeLessThan(proposedSize);
      expect(validation.adjustmentReason).toContain('Risk per trade exceeded');
    });

    it('should apply confidence multipliers correctly', async () => {
      const highConfidenceSignal: TradeSignal = {
        signalId: 'test-signal-3',
        ticker: 'SPY',
        side: 'LONG',
        confidence: 0.9,
        conviction: 0.8,
        expectedMove: 2.5,
        timeframe: 'MEDIUM',
        regime: 'BULL',
        source: 'REGIMECOMPASS',
        timestamp: new Date()
      };

      const lowConfidenceSignal: TradeSignal = {
        ...highConfidenceSignal,
        signalId: 'test-signal-4',
        confidence: 0.4
      };

      const proposedSize = 5;
      const accountBalance = 100000;

      const highConfidenceValidation = await automatedPositionManager.validatePositionSize(
        highConfidenceSignal,
        proposedSize,
        accountBalance
      );

      const lowConfidenceValidation = await automatedPositionManager.validatePositionSize(
        lowConfidenceSignal,
        proposedSize,
        accountBalance
      );

      // High confidence should result in larger position size
      expect(highConfidenceValidation.recommendedSize).toBeGreaterThan(lowConfidenceValidation.recommendedSize);
    });
  });

  describe('Time-Based Exit Evaluation', () => {
    it('should identify positions that exceed maximum holding period', async () => {
      const position: PaperPosition = {
        id: 'test-position-1',
        signalId: 'test-signal-1',
        ticker: 'SPY',
        optionSymbol: 'SPY240315C450',
        contractType: 'CALL',
        strike: 450,
        expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        side: 'LONG',
        quantity: 5,
        entryPrice: 2.50,
        currentPrice: 2.75,
        entryTimestamp: new Date(Date.now() - 80 * 60 * 60 * 1000), // 80 hours ago (exceeds 72 hour limit)
        pnl: 125,
        pnlPercent: 10,
        maxFavorableExcursion: 150,
        maxAdverseExcursion: -25,
        greeks: {
          delta: 0.5,
          gamma: 0.1,
          theta: -0.05,
          vega: 0.2,
          rho: 0.01,
          impliedVolatility: 0.25
        },
        status: 'OPEN',
        confidence: 0.8,
        conviction: 0.7,
        regime: 'BULL'
      };

      // Use reflection to access private method for testing
      const evaluateTimeBasedExit = (automatedPositionManager as any).evaluateTimeBasedExit;
      const result = evaluateTimeBasedExit.call(automatedPositionManager, position, new Date());

      expect(result.shouldExit).toBe(true);
      expect(result.reason).toBe('TIME_DECAY');
      expect(result.message).toContain('Maximum holding period exceeded');
    });

    it('should identify positions approaching expiration', async () => {
      const position: PaperPosition = {
        id: 'test-position-2',
        signalId: 'test-signal-2',
        ticker: 'SPY',
        optionSymbol: 'SPY240315C450',
        contractType: 'CALL',
        strike: 450,
        expiration: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now (less than 4 hour threshold)
        side: 'LONG',
        quantity: 5,
        entryPrice: 2.50,
        currentPrice: 2.75,
        entryTimestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        pnl: 125,
        pnlPercent: 10,
        maxFavorableExcursion: 150,
        maxAdverseExcursion: -25,
        greeks: {
          delta: 0.5,
          gamma: 0.1,
          theta: -0.05,
          vega: 0.2,
          rho: 0.01,
          impliedVolatility: 0.25
        },
        status: 'OPEN',
        confidence: 0.8,
        conviction: 0.7,
        regime: 'BULL'
      };

      // Use reflection to access private method for testing
      const evaluateTimeBasedExit = (automatedPositionManager as any).evaluateTimeBasedExit;
      const result = evaluateTimeBasedExit.call(automatedPositionManager, position, new Date());

      expect(result.shouldExit).toBe(true);
      expect(result.reason).toBe('EXPIRATION');
      expect(result.message).toContain('Force exit before expiration');
    });
  });

  describe('Portfolio Heat Management', () => {
    it('should calculate portfolio heat metrics correctly', () => {
      // Add some mock positions to the internal positions map
      const positions = new Map();
      const position1: PaperPosition = {
        id: 'test-position-1',
        signalId: 'test-signal-1',
        ticker: 'SPY',
        optionSymbol: 'SPY240315C450',
        contractType: 'CALL',
        strike: 450,
        expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        side: 'LONG',
        quantity: 5,
        entryPrice: 2.50,
        currentPrice: 2.75,
        entryTimestamp: new Date(),
        pnl: 125,
        pnlPercent: 10,
        maxFavorableExcursion: 150,
        maxAdverseExcursion: -25,
        greeks: {
          delta: 0.5,
          gamma: 0.1,
          theta: -0.05,
          vega: 0.2,
          rho: 0.01,
          impliedVolatility: 0.25
        },
        status: 'OPEN',
        confidence: 0.8,
        conviction: 0.7,
        regime: 'BULL'
      };

      positions.set('test-position-1', position1);
      
      // Set the internal positions map using reflection
      (automatedPositionManager as any).positions = positions;

      const heatMetrics = automatedPositionManager.getPortfolioHeatMetrics();

      expect(heatMetrics.currentHeat).toBeGreaterThanOrEqual(0);
      expect(heatMetrics.maxHeat).toBe(config.portfolioHeatManagement.maxPortfolioHeat);
      expect(heatMetrics.totalExposure).toBeGreaterThan(0);
      expect(heatMetrics.heatByTicker).toHaveProperty('SPY');
    });
  });

  describe('Confidence-Based Exit Configuration', () => {
    it('should set different exit parameters based on confidence levels', async () => {
      const highConfidencePosition: PaperPosition = {
        id: 'test-position-high',
        signalId: 'test-signal-high',
        ticker: 'SPY',
        optionSymbol: 'SPY240315C450',
        contractType: 'CALL',
        strike: 450,
        expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        side: 'LONG',
        quantity: 5,
        entryPrice: 2.50,
        currentPrice: 2.75,
        entryTimestamp: new Date(),
        pnl: 125,
        pnlPercent: 10,
        maxFavorableExcursion: 150,
        maxAdverseExcursion: -25,
        greeks: {
          delta: 0.5,
          gamma: 0.1,
          theta: -0.05,
          vega: 0.2,
          rho: 0.01,
          impliedVolatility: 0.25
        },
        status: 'OPEN',
        confidence: 0.9, // High confidence
        conviction: 0.8,
        regime: 'BULL'
      };

      const lowConfidencePosition: PaperPosition = {
        ...highConfidencePosition,
        id: 'test-position-low',
        signalId: 'test-signal-low',
        confidence: 0.4 // Low confidence
      };

      // Use reflection to access private method
      const getTimeDecayThreshold = (automatedPositionManager as any).getTimeDecayThreshold;
      
      const highConfidenceThreshold = getTimeDecayThreshold.call(automatedPositionManager, 0.9);
      const lowConfidenceThreshold = getTimeDecayThreshold.call(automatedPositionManager, 0.4);

      // High confidence should have lower time decay threshold (more tolerant)
      expect(highConfidenceThreshold).toBeLessThan(lowConfidenceThreshold);
      expect(highConfidenceThreshold).toBe(config.confidenceBasedExits.highConfidence.timeDecayThreshold);
      expect(lowConfidenceThreshold).toBe(config.confidenceBasedExits.lowConfidence.timeDecayThreshold);
    });
  });

  describe('Automation Control', () => {
    it('should start and stop automation correctly', async () => {
      await automatedPositionManager.startAutomation();
      
      // Verify that monitoring was started
      expect(mockExitConditionManager.startMonitoring).toHaveBeenCalled();

      automatedPositionManager.stopAutomation();
      
      // Verify that monitoring was stopped
      expect(mockExitConditionManager.stopMonitoring).toHaveBeenCalled();
    });

    it('should handle configuration updates', () => {
      const newConfig = {
        portfolioHeatManagement: {
          ...config.portfolioHeatManagement,
          maxPortfolioHeat: 0.15 // Reduce from default 0.20
        }
      };

      automatedPositionManager.updateConfig(newConfig);
      
      const updatedConfig = automatedPositionManager.getConfig();
      expect(updatedConfig.portfolioHeatManagement.maxPortfolioHeat).toBe(0.15);
    });
  });

  describe('Event Handling', () => {
    it('should set up event listeners correctly', () => {
      // Verify that event listeners were set up
      expect(mockEventBus.on).toHaveBeenCalledWith('paper:trade:executed', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('paper:position:update', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('paper:position:closed', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('paper:account:update', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('market:data', expect.any(Function));
    });
  });

  describe('Statistics and Metrics', () => {
    it('should provide comprehensive statistics', () => {
      const stats = automatedPositionManager.getStats();

      expect(stats).toHaveProperty('activePositions');
      expect(stats).toHaveProperty('portfolioHeat');
      expect(stats).toHaveProperty('consecutiveLosses');
      expect(stats).toHaveProperty('currentDrawdown');
      expect(stats).toHaveProperty('automatedExitsTriggered');
      expect(stats).toHaveProperty('positionSizeAdjustments');

      expect(typeof stats.activePositions).toBe('number');
      expect(typeof stats.portfolioHeat).toBe('number');
      expect(typeof stats.consecutiveLosses).toBe('number');
      expect(typeof stats.currentDrawdown).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle position size validation errors gracefully', async () => {
      const signal: TradeSignal = {
        signalId: 'test-signal-error',
        ticker: 'SPY',
        side: 'LONG',
        confidence: 0.8,
        conviction: 0.7,
        expectedMove: 2.5,
        timeframe: 'MEDIUM',
        regime: 'BULL',
        source: 'REGIMECOMPASS',
        timestamp: new Date()
      };

      // Mock an error scenario
      const originalMethod = (automatedPositionManager as any).getTickerExposure;
      (automatedPositionManager as any).getTickerExposure = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      const validation = await automatedPositionManager.validatePositionSize(signal, 5, 100000);

      expect(validation.approved).toBe(false);
      expect(validation.recommendedSize).toBe(1); // Minimum safe size
      expect(validation.adjustmentReason).toContain('Error during validation');

      // Restore original method
      (automatedPositionManager as any).getTickerExposure = originalMethod;
    });
  });

  describe('Shutdown', () => {
    it('should shutdown cleanly', async () => {
      await automatedPositionManager.shutdown();
      
      // Verify that shutdown was called
      expect((automatedPositionManager as any).isShuttingDown).toBe(true);
    });
  });
});