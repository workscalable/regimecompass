import { PaperPosition, OptionsGreeks, GreeksImpact } from '../models/PaperTradingTypes';
import { EventBus } from '../core/EventBus';

export interface PnLBreakdown {
  intrinsicValue: number;
  timeValue: number;
  deltaContribution: number;
  gammaContribution: number;
  thetaContribution: number;
  vegaContribution: number;
  totalPnL: number;
  pnlPercent: number;
}

export interface PositionMetrics {
  position: PaperPosition;
  pnlBreakdown: PnLBreakdown;
  greeksImpact: GreeksImpact;
  riskMetrics: {
    deltaExposure: number;
    gammaRisk: number;
    thetaDecay: number;
    vegaRisk: number;
    timeToExpiration: number;
    moneyness: number;
  };
}

export class PnLCalculator {
  private eventBus: EventBus;
  private lastCalculationTime: Map<string, number> = new Map();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  public calculatePositionPnL(
    position: PaperPosition,
    currentOptionPrice: number,
    underlyingPrice: number,
    currentGreeks?: OptionsGreeks
  ): PnLBreakdown {
    try {
      // Basic PnL calculation
      const priceDifference = currentOptionPrice - position.entryPrice;
      const totalPnL = priceDifference * position.quantity * 100; // Options multiplier
      const pnlPercent = (priceDifference / position.entryPrice) * 100;

      // Calculate intrinsic and time value
      const intrinsicValue = this.calculateIntrinsicValue(
        underlyingPrice,
        position.strike,
        position.contractType
      );
      
      const entryIntrinsicValue = this.calculateIntrinsicValue(
        underlyingPrice, // Approximation - would need historical data
        position.strike,
        position.contractType
      );

      const timeValue = currentOptionPrice - intrinsicValue;
      const entryTimeValue = position.entryPrice - entryIntrinsicValue;

      // Greeks-based PnL attribution
      const greeksImpact = this.calculateGreeksImpact(
        position,
        currentOptionPrice,
        underlyingPrice,
        currentGreeks
      );

      return {
        intrinsicValue: (intrinsicValue - entryIntrinsicValue) * position.quantity * 100,
        timeValue: (timeValue - entryTimeValue) * position.quantity * 100,
        deltaContribution: greeksImpact.deltaContribution,
        gammaContribution: greeksImpact.gammaContribution,
        thetaContribution: greeksImpact.thetaContribution,
        vegaContribution: greeksImpact.vegaContribution,
        totalPnL,
        pnlPercent
      };
    } catch (error) {
      this.eventBus.emitSystemError(
        error as Error,
        `PnL calculation for position ${position.id}`,
        'MEDIUM'
      );
      
      // Return basic calculation as fallback
      const priceDifference = currentOptionPrice - position.entryPrice;
      const totalPnL = priceDifference * position.quantity * 100;
      const pnlPercent = (priceDifference / position.entryPrice) * 100;

      return {
        intrinsicValue: 0,
        timeValue: 0,
        deltaContribution: 0,
        gammaContribution: 0,
        thetaContribution: 0,
        vegaContribution: 0,
        totalPnL,
        pnlPercent
      };
    }
  }

  public calculatePortfolioPnL(positions: PaperPosition[]): {
    totalPnL: number;
    totalPnLPercent: number;
    byTicker: Record<string, number>;
    byContractType: Record<string, number>;
    greeksExposure: {
      totalDelta: number;
      totalGamma: number;
      totalTheta: number;
      totalVega: number;
    };
  } {
    let totalPnL = 0;
    let totalInvestment = 0;
    const byTicker: Record<string, number> = {};
    const byContractType: Record<string, number> = {};
    
    let totalDelta = 0;
    let totalGamma = 0;
    let totalTheta = 0;
    let totalVega = 0;

    for (const position of positions) {
      if (position.status === 'OPEN') {
        totalPnL += position.pnl;
        totalInvestment += position.entryPrice * position.quantity * 100;

        // By ticker
        byTicker[position.ticker] = (byTicker[position.ticker] || 0) + position.pnl;

        // By contract type
        byContractType[position.contractType] = (byContractType[position.contractType] || 0) + position.pnl;

        // Greeks exposure
        const positionMultiplier = position.quantity * 100;
        totalDelta += position.greeks.delta * positionMultiplier;
        totalGamma += position.greeks.gamma * positionMultiplier;
        totalTheta += position.greeks.theta * positionMultiplier;
        totalVega += position.greeks.vega * positionMultiplier;
      }
    }

    const totalPnLPercent = totalInvestment > 0 ? (totalPnL / totalInvestment) * 100 : 0;

    return {
      totalPnL,
      totalPnLPercent,
      byTicker,
      byContractType,
      greeksExposure: {
        totalDelta,
        totalGamma,
        totalTheta,
        totalVega
      }
    };
  }

  public calculatePositionMetrics(
    position: PaperPosition,
    currentOptionPrice: number,
    underlyingPrice: number,
    currentGreeks?: OptionsGreeks
  ): PositionMetrics {
    const pnlBreakdown = this.calculatePositionPnL(
      position,
      currentOptionPrice,
      underlyingPrice,
      currentGreeks
    );

    const greeksImpact = this.calculateGreeksImpact(
      position,
      currentOptionPrice,
      underlyingPrice,
      currentGreeks
    );

    const riskMetrics = this.calculateRiskMetrics(
      position,
      underlyingPrice,
      currentGreeks || position.greeks
    );

    return {
      position,
      pnlBreakdown,
      greeksImpact,
      riskMetrics
    };
  }

  private calculateIntrinsicValue(
    underlyingPrice: number,
    strikePrice: number,
    contractType: 'CALL' | 'PUT'
  ): number {
    if (contractType === 'CALL') {
      return Math.max(0, underlyingPrice - strikePrice);
    } else {
      return Math.max(0, strikePrice - underlyingPrice);
    }
  }

  private calculateGreeksImpact(
    position: PaperPosition,
    currentOptionPrice: number,
    underlyingPrice: number,
    currentGreeks?: OptionsGreeks
  ): GreeksImpact {
    const greeks = currentGreeks || position.greeks;
    const positionMultiplier = position.quantity * 100;
    
    // Estimate price movements since entry (simplified)
    // In a real implementation, you'd track historical data
    const estimatedUnderlyingMove = 0; // Would calculate from historical data
    const estimatedVolatilityChange = 0; // Would calculate from IV changes
    const timeDecay = this.calculateTimePassed(position.entryTimestamp);

    const deltaContribution = greeks.delta * estimatedUnderlyingMove * positionMultiplier;
    const gammaContribution = 0.5 * greeks.gamma * Math.pow(estimatedUnderlyingMove, 2) * positionMultiplier;
    const thetaContribution = greeks.theta * timeDecay * positionMultiplier;
    const vegaContribution = greeks.vega * estimatedVolatilityChange * positionMultiplier;

    return {
      deltaContribution,
      gammaContribution,
      thetaContribution,
      vegaContribution,
      totalGreeksImpact: deltaContribution + gammaContribution + thetaContribution + vegaContribution
    };
  }

  private calculateRiskMetrics(
    position: PaperPosition,
    underlyingPrice: number,
    greeks: OptionsGreeks
  ): {
    deltaExposure: number;
    gammaRisk: number;
    thetaDecay: number;
    vegaRisk: number;
    timeToExpiration: number;
    moneyness: number;
  } {
    const positionMultiplier = position.quantity * 100;
    const timeToExpiration = this.calculateTimeToExpiration(position.expiration);
    
    // Moneyness calculation
    let moneyness: number;
    if (position.contractType === 'CALL') {
      moneyness = underlyingPrice / position.strike;
    } else {
      moneyness = position.strike / underlyingPrice;
    }

    return {
      deltaExposure: Math.abs(greeks.delta * positionMultiplier),
      gammaRisk: greeks.gamma * positionMultiplier * Math.pow(underlyingPrice * 0.01, 2), // 1% move risk
      thetaDecay: Math.abs(greeks.theta * positionMultiplier), // Daily decay
      vegaRisk: Math.abs(greeks.vega * positionMultiplier * 0.01), // 1% IV change risk
      timeToExpiration,
      moneyness
    };
  }

  private calculateTimePassed(entryTime: Date): number {
    const now = new Date();
    const timeDiff = now.getTime() - entryTime.getTime();
    return timeDiff / (1000 * 60 * 60 * 24); // Days
  }

  private calculateTimeToExpiration(expiration: Date): number {
    const now = new Date();
    const timeDiff = expiration.getTime() - now.getTime();
    return Math.max(0, timeDiff / (1000 * 60 * 60 * 24)); // Days
  }

  public updatePositionMFE_MAE(
    position: PaperPosition,
    currentPnL: number
  ): { mfe: number; mae: number } {
    // Update Maximum Favorable Excursion
    const mfe = Math.max(position.maxFavorableExcursion, currentPnL);
    
    // Update Maximum Adverse Excursion
    const mae = Math.min(position.maxAdverseExcursion, currentPnL);

    return { mfe, mae };
  }

  public calculateBreakEvenPoints(
    position: PaperPosition,
    underlyingPrice: number
  ): {
    breakEvenPrice: number;
    profitableRange: { min: number; max: number } | null;
    maxLoss: number;
    maxProfit: number | null; // null for unlimited profit
  } {
    const premium = position.entryPrice;
    
    if (position.contractType === 'CALL') {
      if (position.side === 'LONG') {
        return {
          breakEvenPrice: position.strike + premium,
          profitableRange: { min: position.strike + premium, max: Infinity },
          maxLoss: premium * position.quantity * 100,
          maxProfit: null // Unlimited
        };
      } else {
        return {
          breakEvenPrice: position.strike + premium,
          profitableRange: { min: 0, max: position.strike + premium },
          maxLoss: Infinity, // Unlimited for short calls
          maxProfit: premium * position.quantity * 100
        };
      }
    } else { // PUT
      if (position.side === 'LONG') {
        return {
          breakEvenPrice: position.strike - premium,
          profitableRange: { min: 0, max: position.strike - premium },
          maxLoss: premium * position.quantity * 100,
          maxProfit: (position.strike - premium) * position.quantity * 100
        };
      } else {
        return {
          breakEvenPrice: position.strike - premium,
          profitableRange: { min: position.strike - premium, max: Infinity },
          maxLoss: (position.strike - premium) * position.quantity * 100,
          maxProfit: premium * position.quantity * 100
        };
      }
    }
  }

  public calculatePortfolioGreeksLimits(positions: PaperPosition[]): {
    deltaLimit: number;
    gammaLimit: number;
    thetaLimit: number;
    vegaLimit: number;
    currentExposure: {
      delta: number;
      gamma: number;
      theta: number;
      vega: number;
    };
    withinLimits: boolean;
  } {
    // Calculate current exposure
    let totalDelta = 0;
    let totalGamma = 0;
    let totalTheta = 0;
    let totalVega = 0;

    for (const position of positions) {
      if (position.status === 'OPEN') {
        const multiplier = position.quantity * 100;
        totalDelta += position.greeks.delta * multiplier;
        totalGamma += position.greeks.gamma * multiplier;
        totalTheta += position.greeks.theta * multiplier;
        totalVega += position.greeks.vega * multiplier;
      }
    }

    // Define limits (these could be configurable)
    const deltaLimit = 1000; // Max delta exposure
    const gammaLimit = 100;  // Max gamma exposure
    const thetaLimit = 500;  // Max theta decay per day
    const vegaLimit = 200;   // Max vega exposure

    const withinLimits = 
      Math.abs(totalDelta) <= deltaLimit &&
      Math.abs(totalGamma) <= gammaLimit &&
      Math.abs(totalTheta) <= thetaLimit &&
      Math.abs(totalVega) <= vegaLimit;

    return {
      deltaLimit,
      gammaLimit,
      thetaLimit,
      vegaLimit,
      currentExposure: {
        delta: totalDelta,
        gamma: totalGamma,
        theta: totalTheta,
        vega: totalVega
      },
      withinLimits
    };
  }

  public generatePnLReport(positions: PaperPosition[]): {
    summary: {
      totalPositions: number;
      totalPnL: number;
      totalPnLPercent: number;
      unrealizedPnL: number;
      realizedPnL: number;
    };
    breakdown: {
      byTicker: Record<string, { pnl: number; positions: number }>;
      byStrategy: Record<string, { pnl: number; positions: number }>;
      byTimeframe: Record<string, { pnl: number; positions: number }>;
    };
    riskMetrics: {
      portfolioHeat: number;
      maxDrawdown: number;
      sharpeRatio: number;
      winRate: number;
    };
  } {
    const openPositions = positions.filter(p => p.status === 'OPEN');
    const closedPositions = positions.filter(p => p.status === 'CLOSED');

    const unrealizedPnL = openPositions.reduce((sum, p) => sum + p.pnl, 0);
    const realizedPnL = closedPositions.reduce((sum, p) => sum + p.pnl, 0);
    const totalPnL = unrealizedPnL + realizedPnL;

    // Calculate total investment for percentage
    const totalInvestment = positions.reduce((sum, p) => 
      sum + (p.entryPrice * p.quantity * 100), 0
    );
    const totalPnLPercent = totalInvestment > 0 ? (totalPnL / totalInvestment) * 100 : 0;

    // Breakdown by ticker
    const byTicker: Record<string, { pnl: number; positions: number }> = {};
    for (const position of positions) {
      if (!byTicker[position.ticker]) {
        byTicker[position.ticker] = { pnl: 0, positions: 0 };
      }
      byTicker[position.ticker].pnl += position.pnl;
      byTicker[position.ticker].positions++;
    }

    // Breakdown by strategy (based on contract type and side)
    const byStrategy: Record<string, { pnl: number; positions: number }> = {};
    for (const position of positions) {
      const strategy = `${position.side}_${position.contractType}`;
      if (!byStrategy[strategy]) {
        byStrategy[strategy] = { pnl: 0, positions: 0 };
      }
      byStrategy[strategy].pnl += position.pnl;
      byStrategy[strategy].positions++;
    }

    // Breakdown by timeframe (based on days to expiration at entry)
    const byTimeframe: Record<string, { pnl: number; positions: number }> = {};
    for (const position of positions) {
      const daysToExp = Math.ceil((position.expiration.getTime() - position.entryTimestamp.getTime()) / (1000 * 60 * 60 * 24));
      let timeframe: string;
      if (daysToExp <= 7) timeframe = 'Weekly';
      else if (daysToExp <= 30) timeframe = 'Monthly';
      else timeframe = 'Quarterly';

      if (!byTimeframe[timeframe]) {
        byTimeframe[timeframe] = { pnl: 0, positions: 0 };
      }
      byTimeframe[timeframe].pnl += position.pnl;
      byTimeframe[timeframe].positions++;
    }

    // Risk metrics (simplified)
    const winningTrades = closedPositions.filter(p => p.pnl > 0).length;
    const winRate = closedPositions.length > 0 ? (winningTrades / closedPositions.length) * 100 : 0;

    return {
      summary: {
        totalPositions: positions.length,
        totalPnL,
        totalPnLPercent,
        unrealizedPnL,
        realizedPnL
      },
      breakdown: {
        byTicker,
        byStrategy,
        byTimeframe
      },
      riskMetrics: {
        portfolioHeat: 0, // Would calculate based on account size
        maxDrawdown: 0,   // Would calculate from historical data
        sharpeRatio: 0,   // Would calculate from returns series
        winRate
      }
    };
  }
}