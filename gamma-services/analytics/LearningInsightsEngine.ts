import { EventBus } from '../core/EventBus';
import { DatabaseManager } from '../database/DatabaseManager';
import { PaperPosition, TradeAnalysis, MarketRegime } from '../models/PaperTradingTypes';
import { logger, createLogger } from '../logging/Logger';
// Performance monitoring removed for now
import { 
  StrategyRecommendation, 
  FibonacciZoneOptimization, 
  MarketRegimeAdaptation,
  SignalOptimizationMetrics,
  InsightsEngineConfig
} from './types/InsightsTypes';

export class LearningInsightsEngine {
  private eventBus: EventBus;
  private databaseManager: DatabaseManager;
  private logger = createLogger({ component: 'LearningInsightsEngine' });
  
  private tradeHistory: PaperPosition[] = [];
  private recommendations: Map<string, StrategyRecommendation> = new Map();
  private fibonacciOptimizations: Map<string, FibonacciZoneOptimization> = new Map();
  private regimeAdaptations: Map<MarketRegime, MarketRegimeAdaptation> = new Map();

  constructor(eventBus: EventBus, databaseManager: DatabaseManager) {
    this.eventBus = eventBus;
    this.databaseManager = databaseManager;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.on('paper:position:closed', async (data) => {
      this.tradeHistory.push(data.position);
      if (this.tradeHistory.length >= 30) {
        await this.generateAllInsights();
      }
    });
  }

  public async generateRecommendations(): Promise<StrategyRecommendation[]> {
    // Generate recommendations
      const recommendations: StrategyRecommendation[] = [];
      
      if (this.tradeHistory.length < 30) {
        return recommendations;
      }

      // Generate signal optimization recommendations
      const signalRecs = await this.generateSignalOptimizationRecommendations();
      recommendations.push(...signalRecs);

      // Generate Fibonacci zone recommendations  
      const fibRecs = await this.generateFibonacciRecommendations();
      recommendations.push(...fibRecs);

      // Generate market regime recommendations
      const regimeRecs = await this.generateRegimeRecommendations();
      recommendations.push(...regimeRecs);

      // Store and emit recommendations
      recommendations.forEach(rec => this.recommendations.set(rec.id, rec));
      
      this.eventBus.emit('insights:recommendations:generated', {
        recommendations,
        timestamp: new Date()
      });

      return recommendations;
  }

  public async analyzeFibonacciZonePerformance(): Promise<FibonacciZoneOptimization[]> {
    // Analyze Fibonacci zones
      const zones = ['COMPRESSION', 'MID_EXPANSION', 'FULL_EXPANSION', 'OVER_EXTENSION', 'EXHAUSTION'];
      const optimizations: FibonacciZoneOptimization[] = [];

      for (const zone of zones) {
        const zoneTrades = this.getTradesByZone(zone);
        
        if (zoneTrades.length >= 10) {
          const winRate = zoneTrades.filter(t => t.pnl > 0).length / zoneTrades.length;
          const averagePnL = zoneTrades.reduce((sum, t) => sum + t.pnl, 0) / zoneTrades.length;
          const currentMultiplier = this.getCurrentZoneMultiplier(zone);
          
          // Calculate optimal multiplier based on performance
          const effectiveness = (winRate * 0.7) + ((averagePnL > 0 ? 1 : 0) * 0.3);
          const recommendedMultiplier = Math.max(0, Math.min(1.5, effectiveness * 1.2));
          
          const optimization: FibonacciZoneOptimization = {
            zone: zone as any,
            currentMultiplier,
            recommendedMultiplier,
            winRate,
            totalTrades: zoneTrades.length,
            averagePnL,
            confidence: Math.min(1, zoneTrades.length / 20)
          };

          optimizations.push(optimization);
          this.fibonacciOptimizations.set(zone, optimization);
        }
      }

      // Emit optimization events
      optimizations.forEach(opt => {
        if (Math.abs(opt.recommendedMultiplier - opt.currentMultiplier) > 0.1) {
          this.eventBus.emit('insights:fibonacci:optimization', {
            optimization: opt,
            zone: opt.zone,
            adjustment: opt.recommendedMultiplier - opt.currentMultiplier,
            timestamp: new Date()
          });
        }
      });

      return optimizations;
  }

  public async adaptToMarketRegime(): Promise<MarketRegimeAdaptation[]> {
    // Adapt market regime
      const regimes: MarketRegime[] = ['BULL', 'BEAR', 'NEUTRAL'];
      const adaptations: MarketRegimeAdaptation[] = [];

      for (const regime of regimes) {
        const regimeTrades = this.tradeHistory.filter(t => t.regime === regime);
        
        if (regimeTrades.length >= 15) {
          const winRate = regimeTrades.filter(t => t.pnl > 0).length / regimeTrades.length;
          
          // Analyze signal performance within regime
          const signalTypes = ['trend', 'momentum', 'volume', 'ribbon', 'fibonacci', 'gamma'];
          const signalAdjustments: Record<string, any> = {};
          
          for (const signalType of signalTypes) {
            const signalTrades = regimeTrades.filter(t => this.tradeUsedSignal(t, signalType));
            
            if (signalTrades.length >= 5) {
              const signalWinRate = signalTrades.filter(t => t.pnl > 0).length / signalTrades.length;
              const currentWeight = this.getCurrentSignalWeight(signalType);
              const recommendedWeight = Math.max(0.05, Math.min(0.4, signalWinRate * 0.3));
              
              signalAdjustments[signalType] = {
                currentWeight,
                recommendedWeight,
                effectiveness: signalWinRate
              };
            }
          }

          const adaptation: MarketRegimeAdaptation = {
            regime,
            signalAdjustments,
            overallPerformance: {
              winRate,
              totalTrades: regimeTrades.length
            },
            recommendations: this.generateRegimeRecommendationStrings(regime, winRate, signalAdjustments)
          };

          adaptations.push(adaptation);
          this.regimeAdaptations.set(regime, adaptation);
        }
      }

      // Emit adaptation events
      adaptations.forEach(adaptation => {
        this.eventBus.emit('insights:regime:adaptation', {
          regime: adaptation.regime,
          oldRegime: 'UNKNOWN', // Previous regime not tracked in current interface
          newRegime: adaptation.regime,
          confidence: 0.5, // Default confidence since not available in interface
          timestamp: new Date()
        });
      });

      return adaptations;
  }

  private async generateSignalOptimizationRecommendations(): Promise<StrategyRecommendation[]> {
    const recommendations: StrategyRecommendation[] = [];
    const signalTypes = ['trend', 'momentum', 'volume', 'ribbon', 'fibonacci', 'gamma'];

    for (const signalType of signalTypes) {
      const signalTrades = this.tradeHistory.filter(t => this.tradeUsedSignal(t, signalType));
      
      if (signalTrades.length >= 20) {
        const winRate = signalTrades.filter(t => t.pnl > 0).length / signalTrades.length;
        const currentWeight = this.getCurrentSignalWeight(signalType);
        
        if (winRate < 0.55) {
          recommendations.push({
            id: `signal_opt_${signalType}_${Date.now()}`,
            category: 'SIGNAL_OPTIMIZATION',
            title: `Optimize ${signalType} signal parameters`,
            description: `${signalType} signal shows ${(winRate * 100).toFixed(1)}% win rate, below optimal threshold`,
            impact: winRate < 0.50 ? 'HIGH' : 'MEDIUM',
            confidence: Math.min(1, signalTrades.length / 50),
            implementation: [
              `Analyze ${signalType} signal parameters`,
              'Test parameter adjustments in simulation',
              'Implement gradual changes with monitoring'
            ],
            expectedImprovement: `${((0.60 - winRate) * 100).toFixed(1)}% win rate improvement`,
            supportingData: { winRate, totalTrades: signalTrades.length, currentWeight },
            generatedAt: new Date()
          });
        }
        
        if (winRate > 0.70 && currentWeight < 0.3) {
          recommendations.push({
            id: `signal_weight_${signalType}_${Date.now()}`,
            category: 'SIGNAL_OPTIMIZATION',
            title: `Increase ${signalType} signal weight`,
            description: `${signalType} signal shows excellent performance but low weighting`,
            impact: 'HIGH',
            confidence: Math.min(1, signalTrades.length / 30),
            implementation: [
              `Increase ${signalType} signal weight by 5-10%`,
              'Rebalance other signal weights',
              'Monitor overall system performance'
            ],
            expectedImprovement: `${((winRate - 0.60) * 50).toFixed(1)}% overall performance improvement`,
            supportingData: { winRate, totalTrades: signalTrades.length, currentWeight },
            generatedAt: new Date()
          });
        }
      }
    }

    return recommendations;
  }

  private async generateFibonacciRecommendations(): Promise<StrategyRecommendation[]> {
    const recommendations: StrategyRecommendation[] = [];
    const optimizations = Array.from(this.fibonacciOptimizations.values());

    for (const opt of optimizations) {
      const adjustment = opt.recommendedMultiplier - opt.currentMultiplier;
      
      if (Math.abs(adjustment) > 0.1 && opt.confidence > 0.7) {
        const direction = adjustment > 0 ? 'increase' : 'decrease';
        
        recommendations.push({
          id: `fib_zone_${opt.zone}_${Date.now()}`,
          category: 'FIBONACCI_ZONES',
          title: `Adjust ${opt.zone} zone multiplier`,
          description: `${opt.zone} zone shows ${(opt.winRate * 100).toFixed(1)}% win rate, suggesting ${direction} in position sizing`,
          impact: Math.abs(adjustment) > 0.2 ? 'HIGH' : 'MEDIUM',
          confidence: opt.confidence,
          implementation: [
            `${direction === 'increase' ? 'Increase' : 'Decrease'} ${opt.zone} zone multiplier by ${Math.abs(adjustment * 100).toFixed(1)}%`,
            'Monitor zone-specific performance for 2 weeks',
            'Validate improvement in risk-adjusted returns'
          ],
          expectedImprovement: `${(Math.abs(adjustment) * 100).toFixed(1)}% improvement in zone-specific returns`,
          supportingData: opt,
          generatedAt: new Date()
        });
      }
    }

    return recommendations;
  }

  private async generateRegimeRecommendations(): Promise<StrategyRecommendation[]> {
    const recommendations: StrategyRecommendation[] = [];
    const adaptations = Array.from(this.regimeAdaptations.values());

    for (const adaptation of adaptations) {
      if (adaptation.overallPerformance.winRate < 0.55 && adaptation.overallPerformance.totalTrades >= 15) {
        recommendations.push({
          id: `regime_adapt_${adaptation.regime}_${Date.now()}`,
          category: 'MARKET_REGIME',
          title: `Adapt strategy for ${adaptation.regime} market regime`,
          description: `${adaptation.regime} regime shows ${(adaptation.overallPerformance.winRate * 100).toFixed(1)}% win rate, requiring adaptation`,
          impact: 'HIGH',
          confidence: Math.min(1, adaptation.overallPerformance.totalTrades / 30),
          implementation: adaptation.recommendations,
          expectedImprovement: `${((0.60 - adaptation.overallPerformance.winRate) * 100).toFixed(1)}% win rate improvement`,
          supportingData: adaptation,
          generatedAt: new Date()
        });
      }
    }

    return recommendations;
  }

  // Helper methods

  private getTradesByZone(zone: string): PaperPosition[] {
    // Placeholder implementation - would integrate with actual Fibonacci analysis
    return this.tradeHistory.filter(trade => {
      // Simulate zone assignment based on trade characteristics
      const hash = this.hashString(trade.id + trade.ticker);
      const zoneIndex = hash % 5;
      const zones = ['COMPRESSION', 'MID_EXPANSION', 'FULL_EXPANSION', 'OVER_EXTENSION', 'EXHAUSTION'];
      return zones[zoneIndex] === zone;
    });
  }

  private getCurrentZoneMultiplier(zone: string): number {
    const multipliers: Record<string, number> = {
      'COMPRESSION': 1.2,
      'MID_EXPANSION': 1.0,
      'FULL_EXPANSION': 0.8,
      'OVER_EXTENSION': 0.6,
      'EXHAUSTION': 0.0
    };
    return multipliers[zone] || 1.0;
  }

  private tradeUsedSignal(trade: PaperPosition, signalType: string): boolean {
    // Placeholder implementation - would integrate with actual signal tracking
    const hash = this.hashString(trade.signalId + signalType);
    return (hash % 100) < 60; // 60% chance a trade used this signal
  }

  private getCurrentSignalWeight(signalType: string): number {
    const weights: Record<string, number> = {
      'trend': 0.25,
      'momentum': 0.20,
      'volume': 0.20,
      'ribbon': 0.15,
      'fibonacci': 0.10,
      'gamma': 0.10
    };
    return weights[signalType] || 0.1;
  }

  private generateRegimeRecommendationStrings(regime: MarketRegime, winRate: number, signalAdjustments: Record<string, any>): string[] {
    const recommendations: string[] = [];
    
    if (winRate < 0.55) {
      recommendations.push(`Reduce position sizes by 20% in ${regime} regime`);
      recommendations.push(`Increase confidence threshold by 10% for ${regime} trades`);
      
      if (regime === 'BEAR') {
        recommendations.push('Implement shorter holding periods for bear market trades');
        recommendations.push('Focus on put options during bear regime');
      } else if (regime === 'BULL') {
        recommendations.push('Focus on momentum signals during bull regime');
        recommendations.push('Extend profit targets for bull market trades');
      } else {
        recommendations.push('Implement range-bound strategies for neutral regime');
        recommendations.push('Reduce directional bias in neutral markets');
      }
    }
    
    return recommendations;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private async generateAllInsights(): Promise<void> {
    try {
      await this.generateRecommendations();
      await this.analyzeFibonacciZonePerformance();
      await this.adaptToMarketRegime();
      
      await this.logger.info('LEARNING', 'All insights generated successfully', {
        metadata: {
          tradeHistory: this.tradeHistory.length,
          recommendations: this.recommendations.size,
          fibonacciOptimizations: this.fibonacciOptimizations.size,
          regimeAdaptations: this.regimeAdaptations.size
        }
      });
    } catch (error) {
      await this.logger.error('LEARNING', 'Error generating insights', {}, error as Error);
    }
  }

  // Public API methods

  public getRecommendations(): StrategyRecommendation[] {
    return Array.from(this.recommendations.values());
  }

  public getFibonacciOptimizations(): FibonacciZoneOptimization[] {
    return Array.from(this.fibonacciOptimizations.values());
  }

  public getRegimeAdaptations(): MarketRegimeAdaptation[] {
    return Array.from(this.regimeAdaptations.values());
  }

  public async getHealthStatus(): Promise<{
    tradeHistory: number;
    recommendations: number;
    fibonacciOptimizations: number;
    regimeAdaptations: number;
  }> {
    return {
      tradeHistory: this.tradeHistory.length,
      recommendations: this.recommendations.size,
      fibonacciOptimizations: this.fibonacciOptimizations.size,
      regimeAdaptations: this.regimeAdaptations.size
    };
  }

  public async shutdown(): Promise<void> {
    this.recommendations.clear();
    this.fibonacciOptimizations.clear();
    this.regimeAdaptations.clear();
    this.tradeHistory = [];
    
    await this.logger.info('LEARNING', 'Learning insights engine shutdown complete');
  }
}