import { useState, useEffect, useCallback, useMemo } from 'react';
import { Position, Trade, PerformanceMetrics, TradeFilters } from '../components/PaperTradingDashboard';

/**
 * Paper Trading Data Hook
 * 
 * Manages paper trading data and performance analytics:
 * - Real-time position tracking with P&L updates
 * - Trade history and performance metrics
 * - Portfolio Greeks and risk calculations
 * - Performance analytics and reporting
 */

export interface PaperTradingDataHook {
  positions: Position[];
  trades: Trade[];
  metrics: PerformanceMetrics;
  isLive: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  closePosition: (positionId: string) => Promise<void>;
  exportData: () => void;
  refreshData: () => Promise<void>;
  setLiveTrading: (isLive: boolean) => void;
  
  // Filtering
  filteredTrades: Trade[];
  applyFilters: (filters: TradeFilters) => void;
}

export const usePaperTradingData = (): PaperTradingDataHook => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({} as PerformanceMetrics);
  const [isLive, setIsLive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TradeFilters>({});

  // Filter trades based on current filters
  const filteredTrades = useMemo(() => {
    let filtered = trades;
    
    if (filters.symbol) {
      filtered = filtered.filter(trade => trade.symbol.includes(filters.symbol!));
    }
    
    if (filters.type && filters.type !== 'ALL') {
      filtered = filtered.filter(trade => trade.type === filters.type);
    }
    
    if (filters.outcome && filters.outcome !== 'ALL') {
      filtered = filtered.filter(trade => 
        filters.outcome === 'WIN' ? trade.pnl > 0 : trade.pnl < 0
      );
    }
    
    if (filters.dateRange) {
      filtered = filtered.filter(trade => 
        trade.entryTime >= filters.dateRange!.start && 
        trade.entryTime <= filters.dateRange!.end
      );
    }
    
    return filtered;
  }, [trades, filters]);

  // Close a position
  const closePosition = useCallback(async (positionId: string) => {
    try {
      setIsLoading(true);
      
      // Find the position
      const position = positions.find(p => p.id === positionId);
      if (!position) {
        throw new Error('Position not found');
      }
      
      // Create a trade record
      const trade: Trade = {
        id: `trade_${Date.now()}`,
        symbol: position.symbol,
        type: position.type,
        strike: position.strike,
        expiration: position.expiration,
        quantity: position.quantity,
        entryPrice: position.entryPrice,
        exitPrice: position.currentPrice,
        entryTime: position.entryTime,
        exitTime: new Date(),
        pnl: position.unrealizedPnL,
        pnlPercent: position.unrealizedPnLPercent,
        holdingPeriod: (Date.now() - position.entryTime.getTime()) / (1000 * 60 * 60),
        entryReason: 'Manual entry',
        exitReason: 'Manual close',
        confidence: position.confidence,
        deltaImpact: position.delta ? position.delta * position.quantity : undefined,
        gammaImpact: position.gamma ? position.gamma * position.quantity : undefined,
        thetaImpact: position.theta ? position.theta * position.quantity : undefined,
        vegaImpact: position.vega ? position.vega * position.quantity : undefined,
        maxFavorableExcursion: position.maxFavorableExcursion,
        maxAdverseExcursion: position.maxAdverseExcursion,
        vixAtEntry: position.vixAtEntry,
        vixAtExit: 20 + Math.random() * 10, // Mock VIX at exit
        marketRegime: 'BULL' // Mock market regime
      };
      
      // Update positions and trades
      setPositions(prev => prev.filter(p => p.id !== positionId));
      setTrades(prev => [trade, ...prev]);
      
      // Recalculate metrics
      await calculateMetrics([trade, ...trades], positions.filter(p => p.id !== positionId));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close position');
    } finally {
      setIsLoading(false);
    }
  }, [positions, trades]);

  // Export data
  const exportData = useCallback(() => {
    const data = {
      positions,
      trades: filteredTrades,
      metrics,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paper-trading-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [positions, filteredTrades, metrics]);

  // Refresh data
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would fetch from API
      const mockPositions = generateMockPositions();
      const mockTrades = generateMockTrades();
      
      setPositions(mockPositions);
      setTrades(mockTrades);
      
      await calculateMetrics(mockTrades, mockPositions);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set live trading mode
  const setLiveTrading = useCallback((live: boolean) => {
    setIsLive(live);
  }, []);

  // Apply filters
  const applyFilters = useCallback((newFilters: TradeFilters) => {
    setFilters(newFilters);
  }, []);

  // Calculate performance metrics
  const calculateMetrics = useCallback(async (tradeData: Trade[], positionData: Position[]) => {
    const totalValue = 100000; // Starting capital
    const totalPnL = tradeData.reduce((sum, trade) => sum + trade.pnl, 0) + 
                     positionData.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
    
    const winningTrades = tradeData.filter(t => t.pnl > 0);
    const losingTrades = tradeData.filter(t => t.pnl < 0);
    
    const winRate = tradeData.length > 0 ? winningTrades.length / tradeData.length : 0;
    const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length : 0;
    const profitFactor = Math.abs(avgLoss) > 0 ? avgWin / Math.abs(avgLoss) : 0;
    
    // Portfolio Greeks
    const portfolioDelta = positionData.reduce((sum, pos) => sum + (pos.delta || 0) * pos.quantity, 0);
    const portfolioGamma = positionData.reduce((sum, pos) => sum + (pos.gamma || 0) * pos.quantity, 0);
    const portfolioTheta = positionData.reduce((sum, pos) => sum + (pos.theta || 0) * pos.quantity, 0);
    const portfolioVega = positionData.reduce((sum, pos) => sum + (pos.vega || 0) * pos.quantity, 0);
    
    // Generate equity curve (mock data)
    const equityCurve = generateEquityCurve(tradeData, totalValue);
    const dailyReturns = generateDailyReturns(equityCurve);
    
    const newMetrics: PerformanceMetrics = {
      totalValue: totalValue + totalPnL,
      totalPnL,
      totalPnLPercent: (totalPnL / totalValue) * 100,
      dayPnL: Math.random() * 1000 - 500, // Mock day P&L
      dayPnLPercent: (Math.random() - 0.5) * 2,
      portfolioHeat: Math.abs(totalPnL / totalValue) * 100,
      maxDrawdown: 5.2, // Mock max drawdown
      currentDrawdown: Math.max(0, -totalPnL / totalValue * 100),
      sharpeRatio: 1.2 + Math.random() * 0.8,
      totalTrades: tradeData.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      profitFactor,
      avgWin,
      avgLoss,
      portfolioDelta,
      portfolioGamma,
      portfolioTheta,
      portfolioVega,
      equityCurve,
      dailyReturns
    };
    
    setMetrics(newMetrics);
  }, []);

  // Initialize data on mount
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Update positions periodically when live
  useEffect(() => {
    if (!isLive) return;
    
    const interval = setInterval(() => {
      setPositions(prev => prev.map(position => ({
        ...position,
        currentPrice: position.currentPrice + (Math.random() - 0.5) * 0.5,
        unrealizedPnL: (position.currentPrice - position.entryPrice) * position.quantity * 100,
        unrealizedPnLPercent: ((position.currentPrice - position.entryPrice) / position.entryPrice) * 100,
        maxFavorableExcursion: Math.max(position.maxFavorableExcursion, 
          Math.max(0, (position.currentPrice - position.entryPrice) * position.quantity * 100)),
        maxAdverseExcursion: Math.min(position.maxAdverseExcursion,
          Math.min(0, (position.currentPrice - position.entryPrice) * position.quantity * 100))
      })));
    }, 2000);
    
    return () => clearInterval(interval);
  }, [isLive]);

  return {
    positions,
    trades,
    metrics,
    isLive,
    isLoading,
    error,
    closePosition,
    exportData,
    refreshData,
    setLiveTrading,
    filteredTrades,
    applyFilters
  };
};

// Mock data generators
function generateMockPositions(): Position[] {
  const symbols = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL'];
  const positions: Position[] = [];
  
  for (let i = 0; i < 5; i++) {
    const symbol = symbols[i];
    const isCall = Math.random() > 0.5;
    const strike = 400 + Math.random() * 100;
    const entryPrice = 2 + Math.random() * 8;
    const currentPrice = entryPrice + (Math.random() - 0.5) * 2;
    const quantity = Math.floor(Math.random() * 10) + 1;
    const entryTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
    
    positions.push({
      id: `pos_${i}`,
      symbol,
      type: isCall ? 'CALL' : 'PUT',
      strike,
      expiration: new Date(Date.now() + (7 + Math.random() * 30) * 24 * 60 * 60 * 1000),
      quantity,
      entryPrice,
      currentPrice,
      entryTime,
      unrealizedPnL: (currentPrice - entryPrice) * quantity * 100,
      unrealizedPnLPercent: ((currentPrice - entryPrice) / entryPrice) * 100,
      realizedPnL: 0,
      totalPnL: (currentPrice - entryPrice) * quantity * 100,
      delta: isCall ? 0.3 + Math.random() * 0.4 : -(0.3 + Math.random() * 0.4),
      gamma: Math.random() * 0.1,
      theta: -(Math.random() * 0.1 + 0.01),
      vega: Math.random() * 0.3,
      maxFavorableExcursion: Math.max(0, (currentPrice - entryPrice) * quantity * 100),
      maxAdverseExcursion: Math.min(0, (currentPrice - entryPrice) * quantity * 100),
      daysHeld: Math.floor((Date.now() - entryTime.getTime()) / (1000 * 60 * 60 * 24)),
      status: 'OPEN',
      confidence: 0.6 + Math.random() * 0.4,
      vixAtEntry: 15 + Math.random() * 15,
      fibonacciLevel: Math.random()
    });
  }
  
  return positions;
}

function generateMockTrades(): Trade[] {
  const symbols = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'];
  const trades: Trade[] = [];
  
  for (let i = 0; i < 20; i++) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const isCall = Math.random() > 0.5;
    const strike = 400 + Math.random() * 100;
    const entryPrice = 2 + Math.random() * 8;
    const exitPrice = entryPrice + (Math.random() - 0.5) * 4;
    const quantity = Math.floor(Math.random() * 10) + 1;
    const entryTime = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const exitTime = new Date(entryTime.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);
    const pnl = (exitPrice - entryPrice) * quantity * 100;
    
    trades.push({
      id: `trade_${i}`,
      symbol,
      type: isCall ? 'CALL' : 'PUT',
      strike,
      expiration: new Date(exitTime.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000),
      quantity,
      entryPrice,
      exitPrice,
      entryTime,
      exitTime,
      pnl,
      pnlPercent: (pnl / (entryPrice * quantity * 100)) * 100,
      holdingPeriod: (exitTime.getTime() - entryTime.getTime()) / (1000 * 60 * 60),
      entryReason: 'High confidence signal',
      exitReason: pnl > 0 ? 'Profit target hit' : 'Stop loss triggered',
      confidence: 0.6 + Math.random() * 0.4,
      deltaImpact: (isCall ? 0.4 : -0.4) * quantity,
      gammaImpact: 0.05 * quantity,
      thetaImpact: -0.05 * quantity,
      vegaImpact: 0.2 * quantity,
      maxFavorableExcursion: Math.max(pnl, pnl + Math.random() * 200),
      maxAdverseExcursion: Math.min(pnl, pnl - Math.random() * 200),
      vixAtEntry: 15 + Math.random() * 15,
      vixAtExit: 15 + Math.random() * 15,
      marketRegime: ['BULL', 'BEAR', 'SIDEWAYS', 'VOLATILE'][Math.floor(Math.random() * 4)] as any
    });
  }
  
  return trades.sort((a, b) => b.entryTime.getTime() - a.entryTime.getTime());
}

function generateEquityCurve(trades: Trade[], startingCapital: number): { date: Date; value: number; drawdown: number }[] {
  const curve: { date: Date; value: number; drawdown: number }[] = [];
  let currentValue = startingCapital;
  let peak = startingCapital;
  
  // Add starting point
  curve.push({
    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    value: startingCapital,
    drawdown: 0
  });
  
  // Generate daily points
  for (let i = 29; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dayTrades = trades.filter(t => 
      t.exitTime.toDateString() === date.toDateString()
    );
    
    const dayPnL = dayTrades.reduce((sum, t) => sum + t.pnl, 0);
    currentValue += dayPnL;
    peak = Math.max(peak, currentValue);
    const drawdown = ((currentValue - peak) / peak) * 100;
    
    curve.push({
      date,
      value: currentValue,
      drawdown
    });
  }
  
  return curve;
}

function generateDailyReturns(equityCurve: { date: Date; value: number; drawdown: number }[]): { date: Date; return: number; cumReturn: number }[] {
  const returns: { date: Date; return: number; cumReturn: number }[] = [];
  let cumReturn = 0;
  
  for (let i = 1; i < equityCurve.length; i++) {
    const dailyReturn = ((equityCurve[i].value - equityCurve[i-1].value) / equityCurve[i-1].value) * 100;
    cumReturn += dailyReturn;
    
    returns.push({
      date: equityCurve[i].date,
      return: dailyReturn,
      cumReturn
    });
  }
  
  return returns;
}