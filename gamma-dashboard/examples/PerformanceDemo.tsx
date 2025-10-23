import React, { useState, useEffect } from 'react';
import PaperTradingDashboard, { 
  Position, 
  Trade, 
  PerformanceMetrics 
} from '../components/PaperTradingDashboard';

/**
 * Performance Analytics Demo
 * 
 * Complete demonstration of the paper trading performance system:
 * - Real-time PnL and position tracking
 * - Performance charts and analytics
 * - Trade analysis with comprehensive filtering
 * - Portfolio Greeks and risk metrics
 */

const PerformanceDemo: React.FC = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({} as PerformanceMetrics);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    // Generate comprehensive mock data
    const mockPositions = generateMockPositions();
    const mockTrades = generateMockTrades();
    const mockMetrics = generateMockMetrics();
    
    setPositions(mockPositions);
    setTrades(mockTrades);
    setMetrics(mockMetrics);
  }, []);

  // Update positions in real-time when live
  useEffect(() => {
    if (!isLive) return;
    
    const interval = setInterval(() => {
      setPositions(prev => prev.map(position => {
        const priceChange = (Math.random() - 0.5) * 0.5;
        const newPrice = Math.max(0.05, position.currentPrice + priceChange);
        const newPnL = (newPrice - position.entryPrice) * position.quantity * 100;
        
        return {
          ...position,
          currentPrice: newPrice,
          unrealizedPnL: newPnL,
          unrealizedPnLPercent: ((newPrice - position.entryPrice) / position.entryPrice) * 100,
          maxFavorableExcursion: Math.max(position.maxFavorableExcursion, Math.max(0, newPnL)),
          maxAdverseExcursion: Math.min(position.maxAdverseExcursion, Math.min(0, newPnL))
        };
      }));
    }, 2000);
    
    return () => clearInterval(interval);
  }, [isLive]);

  const handleClosePosition = async (positionId: string) => {
    const position = positions.find(p => p.id === positionId);
    if (!position) return;
    
    // Create trade from closed position
    const newTrade: Trade = {
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
      entryReason: 'High confidence signal',
      exitReason: 'Manual close',
      confidence: position.confidence,
      deltaImpact: position.delta ? position.delta * position.quantity : undefined,
      gammaImpact: position.gamma ? position.gamma * position.quantity : undefined,
      thetaImpact: position.theta ? position.theta * position.quantity : undefined,
      vegaImpact: position.vega ? position.vega * position.quantity : undefined,
      maxFavorableExcursion: position.maxFavorableExcursion,
      maxAdverseExcursion: position.maxAdverseExcursion,
      vixAtEntry: position.vixAtEntry,
      vixAtExit: 20 + Math.random() * 10,
      marketRegime: 'BULL'
    };
    
    setTrades(prev => [newTrade, ...prev]);
    setPositions(prev => prev.filter(p => p.id !== positionId));
  };

  const handleExportData = () => {
    const data = {
      positions,
      trades,
      metrics,
      exportDate: new Date().toISOString()
    };
    
    console.log('Exporting performance data:', data);
    // In a real implementation, this would download the data
  };

  const handleFilterChange = (filters: any) => {
    console.log('Applying filters:', filters);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Paper Trading Performance Demo
          </h1>
          <p className="text-gray-600">
            Comprehensive performance analytics with real-time PnL tracking and trade analysis.
          </p>
        </div>

        <PaperTradingDashboard
          positions={positions}
          trades={trades}
          metrics={metrics}
          isLive={isLive}
          onExportData={handleExportData}
          onClosePosition={handleClosePosition}
          onFilterChange={handleFilterChange}
        />
      </div>
    </div>
  );
};

// Mock data generators
function generateMockPositions(): Position[] {
  const symbols = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL'];
  const positions: Position[] = [];
  
  symbols.forEach((symbol, i) => {
    const isCall = Math.random() > 0.5;
    const strike = 400 + Math.random() * 100;
    const entryPrice = 2 + Math.random() * 8;
    const currentPrice = entryPrice + (Math.random() - 0.5) * 2;
    const quantity = Math.floor(Math.random() * 10) + 1;
    const entryTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
    const unrealizedPnL = (currentPrice - entryPrice) * quantity * 100;
    
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
      unrealizedPnL,
      unrealizedPnLPercent: ((currentPrice - entryPrice) / entryPrice) * 100,
      realizedPnL: 0,
      totalPnL: unrealizedPnL,
      delta: isCall ? 0.3 + Math.random() * 0.4 : -(0.3 + Math.random() * 0.4),
      gamma: Math.random() * 0.1,
      theta: -(Math.random() * 0.1 + 0.01),
      vega: Math.random() * 0.3,
      maxFavorableExcursion: Math.max(0, unrealizedPnL + Math.random() * 200),
      maxAdverseExcursion: Math.min(0, unrealizedPnL - Math.random() * 200),
      daysHeld: Math.floor((Date.now() - entryTime.getTime()) / (1000 * 60 * 60 * 24)),
      status: 'OPEN',
      confidence: 0.6 + Math.random() * 0.4,
      vixAtEntry: 15 + Math.random() * 15,
      fibonacciLevel: Math.random()
    });
  });
  
  return positions;
}

function generateMockTrades(): Trade[] {
  const symbols = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'AMZN'];
  const trades: Trade[] = [];
  
  for (let i = 0; i < 25; i++) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const isCall = Math.random() > 0.5;
    const strike = 400 + Math.random() * 100;
    const entryPrice = 2 + Math.random() * 8;
    const exitPrice = entryPrice + (Math.random() - 0.4) * 4; // Slight bias toward profits
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
      entryReason: [
        'High confidence signal (85%+)',
        'Fibonacci confluence detected',
        'Strong momentum divergence',
        'Gamma squeeze setup',
        'VIX expansion play'
      ][Math.floor(Math.random() * 5)],
      exitReason: pnl > 0 ? 
        ['Profit target hit', 'Time decay favorable', 'Momentum exhausted'][Math.floor(Math.random() * 3)] :
        ['Stop loss triggered', 'Time decay unfavorable', 'Signal invalidated'][Math.floor(Math.random() * 3)],
      confidence: 0.6 + Math.random() * 0.4,
      deltaImpact: (isCall ? 0.4 : -0.4) * quantity,
      gammaImpact: 0.05 * quantity,
      thetaImpact: -0.05 * quantity,
      vegaImpact: 0.2 * quantity,
      maxFavorableExcursion: Math.max(pnl, pnl + Math.random() * 300),
      maxAdverseExcursion: Math.min(pnl, pnl - Math.random() * 200),
      vixAtEntry: 15 + Math.random() * 15,
      vixAtExit: 15 + Math.random() * 15,
      marketRegime: ['BULL', 'BEAR', 'SIDEWAYS', 'VOLATILE'][Math.floor(Math.random() * 4)] as any
    });
  }
  
  return trades.sort((a, b) => b.entryTime.getTime() - a.entryTime.getTime());
}

function generateMockMetrics(): PerformanceMetrics {
  const startingCapital = 100000;
  const totalPnL = 12450;
  const winningTrades = 18;
  const losingTrades = 7;
  const totalTrades = winningTrades + losingTrades;
  
  return {
    totalValue: startingCapital + totalPnL,
    totalPnL,
    totalPnLPercent: (totalPnL / startingCapital) * 100,
    dayPnL: 850,
    dayPnLPercent: 0.85,
    portfolioHeat: 8.2,
    maxDrawdown: 5.2,
    currentDrawdown: 1.1,
    sharpeRatio: 1.8,
    totalTrades,
    winningTrades,
    losingTrades,
    winRate: winningTrades / totalTrades,
    profitFactor: 2.4,
    avgWin: 950,
    avgLoss: -395,
    portfolioDelta: 12.5,
    portfolioGamma: 3.2,
    portfolioTheta: -45.8,
    portfolioVega: 125.3,
    equityCurve: generateEquityCurve(startingCapital),
    dailyReturns: generateDailyReturns()
  };
}

function generateEquityCurve(startingCapital: number): { date: Date; value: number; drawdown: number }[] {
  const curve: { date: Date; value: number; drawdown: number }[] = [];
  let currentValue = startingCapital;
  let peak = startingCapital;
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dailyReturn = (Math.random() - 0.45) * 0.02; // Slight positive bias
    currentValue *= (1 + dailyReturn);
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

function generateDailyReturns(): { date: Date; return: number; cumReturn: number }[] {
  const returns: { date: Date; return: number; cumReturn: number }[] = [];
  let cumReturn = 0;
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dailyReturn = (Math.random() - 0.45) * 2; // -0.9% to +1.1%
    cumReturn += dailyReturn;
    
    returns.push({
      date,
      return: dailyReturn,
      cumReturn
    });
  }
  
  return returns;
}

export default PerformanceDemo;