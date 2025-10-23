import { PaperPosition, TradeSignal, OptionsGreeks, ExitReason } from './PaperTradingEngine';
import { OptionContract } from '../data/OptionsChainService';

export interface MarketData {
  ticker: string;
  price: number;
  timestamp: Date;
  options: Record<string, OptionQuote>;
}

export interface OptionQuote {
  bid: number;
  ask: number;
  midPrice: number;
  impliedVolatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export class PositionManager {
  private positions: Map<string, PaperPosition> = new Map();

  public async createPosition(signal: TradeSignal, contract: OptionContract): Promise<PaperPosition> {
    const positionId = `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const position: PaperPosition = {
      id: positionId,
      signalId: signal.signalId,
      ticker: signal.ticker,
      optionSymbol: contract.symbol,
      contractType: contract.type,
      strike: contract.strike,
      expiration: contract.expiration,
      side: signal.side,
      quantity: 1, // Will be calculated by PaperTradingEngine
      entryPrice: contract.midPrice,
      currentPrice: contract.midPrice,
      entryTimestamp: new Date(),
      greeks: contract.greeks,
      pnl: 0,
      pnlPercent: 0,
      maxFavorableExcursion: 0,
      maxAdverseExcursion: 0,
      status: 'OPEN',
      confidence: signal.confidence,
      conviction: signal.conviction,
      regime: signal.regime
    };

    this.positions.set(positionId, position);
    return position;
  }

  public updatePosition(positionId: string, marketData: MarketData): void {
    const position = this.positions.get(positionId);
    if (!position || position.status !== 'OPEN') return;

    const optionQuote = marketData.options[position.optionSymbol];
    if (!optionQuote) return;

    const currentPrice = optionQuote.midPrice;
    const pnl = (currentPrice - position.entryPrice) * position.quantity * 100;
    const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

    // Update MFE/MAE tracking
    if (pnl > position.maxFavorableExcursion) {
      position.maxFavorableExcursion = pnl;
    }
    if (pnl < position.maxAdverseExcursion) {
      position.maxAdverseExcursion = pnl;
    }

    // Update position values
    position.currentPrice = currentPrice;
    position.pnl = pnl;
    position.pnlPercent = pnlPercent;

    // Update Greeks
    position.greeks = {
      delta: optionQuote.delta,
      gamma: optionQuote.gamma,
      theta: optionQuote.theta,
      vega: optionQuote.vega,
      rho: position.greeks.rho, // Keep existing rho if not provided
      impliedVolatility: optionQuote.impliedVolatility
    };
  }

  public async closePosition(positionId: string, exitPrice: number, reason: ExitReason): Promise<void> {
    const position = this.positions.get(positionId);
    if (!position || position.status === 'CLOSED') return;

    position.exitPrice = exitPrice;
    position.exitTimestamp = new Date();
    position.status = 'CLOSED';
    position.exitReason = reason;

    // Calculate final PnL
    const finalPnL = (exitPrice - position.entryPrice) * position.quantity * 100;
    position.pnl = finalPnL;
    position.pnlPercent = ((exitPrice - position.entryPrice) / position.entryPrice) * 100;

    // Remove from active positions
    this.positions.delete(positionId);
  }

  public getPosition(positionId: string): PaperPosition | null {
    return this.positions.get(positionId) || null;
  }

  public getPositionsByTicker(ticker: string): PaperPosition[] {
    return Array.from(this.positions.values()).filter(pos => pos.ticker === ticker);
  }

  public getAllOpenPositions(): PaperPosition[] {
    return Array.from(this.positions.values()).filter(pos => pos.status === 'OPEN');
  }

  public calculatePositionSize(
    signal: TradeSignal, 
    contract: OptionContract, 
    accountBalance: number
  ): number {
    const maxRiskPerTrade = accountBalance * 0.02; // 2% risk per trade
    const contractValue = contract.midPrice * 100; // Options are per share, 100 shares per contract
    
    // Base position size calculation
    let positionSize = Math.floor(maxRiskPerTrade / contractValue);

    // Adjust based on confidence
    const confidenceMultiplier = signal.confidence > 0.8 ? 1.2 : 
                                signal.confidence < 0.6 ? 0.8 : 1.0;
    
    // Adjust based on conviction
    const convictionMultiplier = signal.conviction;

    positionSize = Math.floor(positionSize * confidenceMultiplier * convictionMultiplier);

    // Ensure minimum 1 contract and maximum 10% of account
    const maxPositionValue = accountBalance * 0.1;
    const maxContracts = Math.floor(maxPositionValue / contractValue);
    
    return Math.max(1, Math.min(positionSize, maxContracts));
  }

  public getPortfolioExposure(): number {
    let totalExposure = 0;
    for (const position of this.positions.values()) {
      if (position.status === 'OPEN') {
        totalExposure += position.currentPrice * position.quantity * 100;
      }
    }
    return totalExposure;
  }

  public getPositionsByStatus(status: 'OPEN' | 'CLOSED' | 'EXPIRED'): PaperPosition[] {
    return Array.from(this.positions.values()).filter(pos => pos.status === status);
  }

  public getTotalPnL(): number {
    let totalPnL = 0;
    for (const position of this.positions.values()) {
      totalPnL += position.pnl;
    }
    return totalPnL;
  }

  public checkExpirations(): PaperPosition[] {
    const now = new Date();
    const expiringPositions: PaperPosition[] = [];

    for (const position of this.positions.values()) {
      if (position.status === 'OPEN' && position.expiration <= now) {
        position.status = 'EXPIRED';
        position.exitTimestamp = now;
        position.exitReason = 'EXPIRATION';
        
        // Calculate intrinsic value at expiration
        const intrinsicValue = this.calculateIntrinsicValue(position);
        position.exitPrice = intrinsicValue;
        position.pnl = (intrinsicValue - position.entryPrice) * position.quantity * 100;
        position.pnlPercent = ((intrinsicValue - position.entryPrice) / position.entryPrice) * 100;

        expiringPositions.push(position);
        this.positions.delete(position.id);
      }
    }

    return expiringPositions;
  }

  private calculateIntrinsicValue(position: PaperPosition): number {
    // This would need current underlying price - placeholder implementation
    const underlyingPrice = 100; // Would get from market data
    
    if (position.contractType === 'CALL') {
      return Math.max(0, underlyingPrice - position.strike);
    } else {
      return Math.max(0, position.strike - underlyingPrice);
    }
  }
}