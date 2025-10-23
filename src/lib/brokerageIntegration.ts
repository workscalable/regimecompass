/**
 * Brokerage Integration Compatibility Layer
 * Provides data format compatibility for major brokerage APIs
 */

import { TradingCandidate, MarketSnapshot } from './types';
import { logger } from './monitoring';

export interface BrokerageOrder {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit';
  price?: number;
  stopPrice?: number;
  timeInForce: 'day' | 'gtc' | 'ioc' | 'fok';
  metadata?: Record<string, any>;
}

export interface BrokeragePosition {
  symbol: string;
  quantity: number;
  averagePrice: number;
  marketValue: number;
  unrealizedPnL: number;
  side: 'long' | 'short';
}

export interface BrokerageAccount {
  accountId: string;
  buyingPower: number;
  totalValue: number;
  dayTradingBuyingPower?: number;
  positions: BrokeragePosition[];
}

/**
 * Alpaca API Integration
 */
export class AlpacaIntegration {
  /**
   * Convert trading candidate to Alpaca order format
   */
  static formatOrder(candidate: TradingCandidate, accountSize: number): any {
    const quantity = Math.floor(candidate.positionSize / candidate.entry);
    
    return {
      symbol: candidate.symbol,
      qty: quantity,
      side: candidate.type === 'LONG' ? 'buy' : 'sell',
      type: 'limit',
      time_in_force: 'day',
      limit_price: candidate.entry.toFixed(2),
      stop_loss: {
        stop_price: candidate.stopLoss.toFixed(2)
      },
      take_profit: {
        limit_price: candidate.target.toFixed(2)
      },
      client_order_id: `rc_${candidate.symbol}_${Date.now()}`,
      extended_hours: false
    };
  }

  /**
   * Format market snapshot for Alpaca webhook
   */
  static formatMarketData(snapshot: MarketSnapshot): any {
    return {
      timestamp: snapshot.timestamp.toISOString(),
      market_regime: snapshot.regime,
      regime_strength: snapshot.regimeClassification.strength,
      signals: {
        long_candidates: snapshot.tradingCandidates.long.map(c => ({
          symbol: c.symbol,
          entry_price: c.entry,
          confidence: c.confidence,
          position_size: c.positionSize
        })),
        hedge_candidates: snapshot.tradingCandidates.hedge.map(c => ({
          symbol: c.symbol,
          entry_price: c.entry,
          confidence: c.confidence
        }))
      },
      risk_metrics: {
        portfolio_heat: snapshot.riskMetrics.portfolioHeat,
        max_drawdown: snapshot.riskMetrics.maxDrawdown,
        volatility_adjustment: snapshot.riskMetrics.volatilityAdjustment
      }
    };
  }

  /**
   * Generate Alpaca-compatible portfolio recommendations
   */
  static generatePortfolioRecommendations(
    snapshot: MarketSnapshot,
    currentPositions: BrokeragePosition[],
    accountSize: number
  ): any {
    const recommendations = [];
    
    // Calculate current exposure
    const currentExposure = currentPositions.reduce((sum, pos) => 
      sum + Math.abs(pos.marketValue), 0
    );
    
    const targetExposure = this.getTargetExposure(snapshot.regime, accountSize);
    
    // Generate position adjustments
    if (currentExposure > targetExposure * 1.1) {
      recommendations.push({
        action: 'reduce_exposure',
        current_exposure: currentExposure,
        target_exposure: targetExposure,
        reduction_needed: currentExposure - targetExposure
      });
    }
    
    // Add new position recommendations
    snapshot.tradingCandidates.long.forEach(candidate => {
      recommendations.push({
        action: 'add_position',
        symbol: candidate.symbol,
        side: 'buy',
        target_allocation: candidate.positionSize / accountSize,
        entry_price: candidate.entry,
        stop_loss: candidate.stopLoss,
        reasoning: candidate.reasoning[0]
      });
    });
    
    return {
      timestamp: new Date().toISOString(),
      account_size: accountSize,
      current_exposure: currentExposure,
      target_exposure: targetExposure,
      regime: snapshot.regime,
      recommendations
    };
  }

  private static getTargetExposure(regime: string, accountSize: number): number {
    switch (regime) {
      case 'BULL': return accountSize * 0.8; // 80% exposure
      case 'BEAR': return accountSize * 0.3; // 30% exposure
      case 'NEUTRAL': return accountSize * 0.5; // 50% exposure
      default: return accountSize * 0.5;
    }
  }
}

/**
 * TD Ameritrade API Integration
 */
export class TDAmeritradeIntegration {
  /**
   * Convert trading candidate to TD Ameritrade order format
   */
  static formatOrder(candidate: TradingCandidate, accountSize: number): any {
    const quantity = Math.floor(candidate.positionSize / candidate.entry);
    
    return {
      orderType: 'LIMIT',
      session: 'NORMAL',
      duration: 'DAY',
      orderStrategyType: 'SINGLE',
      orderLegCollection: [
        {
          instruction: candidate.type === 'LONG' ? 'BUY' : 'SELL',
          quantity: quantity,
          instrument: {
            symbol: candidate.symbol,
            assetType: 'EQUITY'
          }
        }
      ],
      price: candidate.entry.toFixed(2),
      stopPrice: candidate.stopLoss.toFixed(2),
      childOrderStrategies: [
        {
          orderType: 'STOP',
          session: 'NORMAL',
          duration: 'GTC',
          orderStrategyType: 'SINGLE',
          orderLegCollection: [
            {
              instruction: candidate.type === 'LONG' ? 'SELL' : 'BUY',
              quantity: quantity,
              instrument: {
                symbol: candidate.symbol,
                assetType: 'EQUITY'
              }
            }
          ],
          stopPrice: candidate.stopLoss.toFixed(2)
        }
      ]
    };
  }

  /**
   * Format watchlist for TD Ameritrade
   */
  static formatWatchlist(snapshot: MarketSnapshot): any {
    const watchlistItems: any[] = [];
    
    // Add long candidates
    snapshot.tradingCandidates.long.forEach(candidate => {
      watchlistItems.push({
        symbol: candidate.symbol,
        description: candidate.name,
        assetType: 'EQUITY',
        fundamental: {
          symbol: candidate.symbol,
          high52: candidate.target,
          low52: candidate.stopLoss,
          dividendAmount: 0,
          dividendYield: 0,
          peRatio: 0,
          pegRatio: 0,
          pbRatio: 0,
          prRatio: 0,
          pcfRatio: 0,
          grossMarginTTM: 0,
          grossMarginMRQ: 0,
          netProfitMarginTTM: 0,
          netProfitMarginMRQ: 0,
          operatingMarginTTM: 0,
          operatingMarginMRQ: 0,
          returnOnEquity: 0,
          returnOnAssets: 0,
          returnOnInvestment: 0,
          quickRatio: 0,
          currentRatio: 0,
          interestCoverage: 0,
          totalDebtToCapital: 0,
          ltDebtToEquity: 0,
          totalDebtToEquity: 0,
          epsTTM: 0,
          epsChangePercentTTM: 0,
          epsChangeYear: 0,
          epsChange: 0,
          revChangeYear: 0,
          revChangeTTM: 0,
          revChangeIn: 0,
          sharesOutstanding: 0,
          marketCapFloat: 0,
          marketCap: 0,
          bookValuePerShare: 0,
          shortIntToFloat: 0,
          shortIntDayToCover: 0,
          divGrowthRate3Year: 0,
          dividendPayAmount: 0,
          dividendPayDate: '',
          beta: 1,
          vol1DayAvg: 0,
          vol10DayAvg: 0,
          vol3MonthAvg: 0
        }
      });
    });
    
    return {
      name: `RegimeCompass_${snapshot.regime}_${new Date().toISOString().split('T')[0]}`,
      watchlistItems
    };
  }
}

/**
 * Interactive Brokers Integration
 */
export class InteractiveBrokersIntegration {
  /**
   * Convert trading candidate to IB order format
   */
  static formatOrder(candidate: TradingCandidate, accountSize: number): any {
    const quantity = Math.floor(candidate.positionSize / candidate.entry);
    
    return {
      conid: 0, // Contract ID - would need to be resolved
      orderType: 'LMT',
      side: candidate.type === 'LONG' ? 'BUY' : 'SELL',
      tif: 'DAY',
      price: candidate.entry.toFixed(2),
      quantity: quantity,
      useAdaptive: true,
      isCcyConv: false,
      allocationMethod: 'AvailableEquity',
      strategy: 'Vwap',
      outsideRth: false,
      ticker: candidate.symbol,
      secType: 'STK',
      exchange: 'SMART',
      listingExchange: 'NASDAQ',
      currency: 'USD'
    };
  }

  /**
   * Format scanner parameters for IB
   */
  static formatScanner(snapshot: MarketSnapshot): any {
    const filters = [];
    
    // Add regime-based filters
    if (snapshot.regime === 'BULL') {
      filters.push({
        code: 'changePercent',
        value: '5'
      });
      filters.push({
        code: 'volumeRate',
        value: '2'
      });
    } else if (snapshot.regime === 'BEAR') {
      filters.push({
        code: 'changePercent',
        value: '-5'
      });
    }
    
    return {
      instrument: 'STK',
      type: 'TOP_PERC_GAIN',
      filter: filters,
      location: 'STK.US.MAJOR',
      size: '25'
    };
  }
}

/**
 * Generic brokerage adapter
 */
export class BrokerageAdapter {
  /**
   * Convert RegimeCompass signals to generic order format
   */
  static convertToGenericOrders(
    candidates: TradingCandidate[],
    accountSize: number,
    brokerageType: 'alpaca' | 'td_ameritrade' | 'interactive_brokers'
  ): any[] {
    return candidates.map(candidate => {
      switch (brokerageType) {
        case 'alpaca':
          return AlpacaIntegration.formatOrder(candidate, accountSize);
        case 'td_ameritrade':
          return TDAmeritradeIntegration.formatOrder(candidate, accountSize);
        case 'interactive_brokers':
          return InteractiveBrokersIntegration.formatOrder(candidate, accountSize);
        default:
          throw new Error(`Unsupported brokerage type: ${brokerageType}`);
      }
    });
  }

  /**
   * Generate risk management rules for brokerage
   */
  static generateRiskRules(snapshot: MarketSnapshot): any {
    return {
      max_position_size: 0.1, // 10% max per position
      max_portfolio_heat: 0.15, // 15% max total risk
      stop_loss_required: true,
      max_drawdown: 0.07, // 7% max drawdown
      regime_based_sizing: {
        BULL: 1.25, // 25% larger positions in bull market
        BEAR: 0.75, // 25% smaller positions in bear market
        NEUTRAL: 1.0 // Normal sizing in neutral market
      },
      vix_adjustments: {
        high_vix_threshold: 25,
        high_vix_reduction: 0.5, // 50% size reduction when VIX > 25
        low_vix_threshold: 15,
        low_vix_increase: 1.1 // 10% size increase when VIX < 15
      },
      sector_limits: {
        max_sector_exposure: 0.25, // 25% max per sector
        correlation_limit: 0.6 // Max correlation between positions
      }
    };
  }

  /**
   * Create historical data export for backtesting
   */
  static createBacktestData(snapshots: MarketSnapshot[]): any {
    return {
      metadata: {
        start_date: snapshots[0]?.timestamp,
        end_date: snapshots[snapshots.length - 1]?.timestamp,
        total_periods: snapshots.length,
        export_date: new Date().toISOString()
      },
      data: snapshots.map(snapshot => ({
        timestamp: snapshot.timestamp,
        regime: snapshot.regime,
        regime_strength: snapshot.regimeClassification.strength,
        breadth_pct: snapshot.breadth.breadthPct,
        vix: snapshot.vix.value,
        spy_price: snapshot.indexes.SPY?.price,
        spy_trend: snapshot.indexes.SPY?.trendScore9,
        long_signals: snapshot.tradingCandidates.long.length,
        hedge_signals: snapshot.tradingCandidates.hedge.length,
        risk_metrics: {
          portfolio_heat: snapshot.riskMetrics.portfolioHeat,
          volatility_adjustment: snapshot.riskMetrics.volatilityAdjustment
        }
      }))
    };
  }

  /**
   * Validate brokerage compatibility
   */
  static validateCompatibility(brokerageType: string): {
    supported: boolean;
    features: string[];
    limitations: string[];
  } {
    const compatibility = {
      alpaca: {
        supported: true,
        features: [
          'Paper trading',
          'Live trading',
          'Fractional shares',
          'Extended hours',
          'Bracket orders',
          'Webhooks'
        ],
        limitations: [
          'US markets only',
          'No options trading',
          'Limited order types'
        ]
      },
      td_ameritrade: {
        supported: true,
        features: [
          'Paper trading',
          'Live trading',
          'Options trading',
          'Futures trading',
          'Advanced order types',
          'Real-time data'
        ],
        limitations: [
          'Complex API authentication',
          'Rate limits',
          'Account minimums'
        ]
      },
      interactive_brokers: {
        supported: true,
        features: [
          'Global markets',
          'All asset classes',
          'Advanced order types',
          'Low commissions',
          'Professional tools'
        ],
        limitations: [
          'Complex setup',
          'High account minimums',
          'Steep learning curve'
        ]
      }
    };

    return compatibility[brokerageType as keyof typeof compatibility] || {
      supported: false,
      features: [],
      limitations: ['Brokerage not supported']
    };
  }
}

/**
 * Export format utilities
 */
export class ExportFormatUtils {
  /**
   * Convert to MetaTrader 4/5 format
   */
  static toMetaTrader(snapshot: MarketSnapshot): string {
    const signals = snapshot.tradingCandidates.long.map(candidate => {
      return `${candidate.symbol},${candidate.type},${candidate.entry},${candidate.stopLoss},${candidate.target},${candidate.confidence}`;
    }).join('\n');
    
    return `# RegimeCompass Signals - ${snapshot.timestamp.toISOString()}\n` +
           `# Regime: ${snapshot.regime}\n` +
           `# Symbol,Type,Entry,StopLoss,Target,Confidence\n` +
           signals;
  }

  /**
   * Convert to TradingView Pine Script format
   */
  static toPineScript(snapshot: MarketSnapshot): string {
    return `
//@version=5
indicator("RegimeCompass Signals", overlay=true)

// Regime: ${snapshot.regime}
// Strength: ${snapshot.regimeClassification.strength}
// Timestamp: ${snapshot.timestamp.toISOString()}

regime_bull = ${snapshot.regime === 'BULL'}
regime_bear = ${snapshot.regime === 'BEAR'}
regime_neutral = ${snapshot.regime === 'NEUTRAL'}

bgcolor(regime_bull ? color.new(color.green, 90) : regime_bear ? color.new(color.red, 90) : color.new(color.yellow, 90))

plotshape(regime_bull, title="Bull Regime", location=location.belowbar, color=color.green, style=shape.triangleup, size=size.small)
plotshape(regime_bear, title="Bear Regime", location=location.abovebar, color=color.red, style=shape.triangledown, size=size.small)
`;
  }
}