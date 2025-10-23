import { NextRequest, NextResponse } from 'next/server';

// Mock performance data - in production, this would come from the performance calculator
const mockPerformanceData = {
  accountBalance: 102350,
  totalPnL: 2350,
  totalPnLPercent: 2.35,
  winRate: 68.5,
  totalTrades: 47,
  winningTrades: 32,
  losingTrades: 15,
  profitFactor: 1.85,
  sharpeRatio: 1.42,
  maxDrawdown: 1250,
  maxDrawdownPercent: 1.25,
  averageWin: 185.50,
  averageLoss: -95.25,
  bestTrade: 850,
  worstTrade: -320,
  averageHoldingPeriod: 18.5, // hours
  consecutiveWins: 7,
  consecutiveLosses: 3,
  returnsPercent: 2.35
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // In production, this would call the performance calculator
    // const performance = await performanceCalculator.calculatePerformanceMetrics(
    //   positions, initialBalance, startDate, endDate
    // );

    let performanceData = { ...mockPerformanceData };

    // Adjust data based on period (mock implementation)
    switch (period) {
      case '1D':
        performanceData.totalPnL = 125;
        performanceData.totalPnLPercent = 0.12;
        break;
      case '1W':
        performanceData.totalPnL = 485;
        performanceData.totalPnLPercent = 0.48;
        break;
      case '1M':
        performanceData.totalPnL = 1250;
        performanceData.totalPnLPercent = 1.25;
        break;
    }

    return NextResponse.json(performanceData);
  } catch (error) {
    console.error('Error fetching performance data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, endDate, benchmark } = body;

    // In production, this would trigger a performance calculation
    // const performance = await performanceCalculator.calculateComprehensiveMetrics(
    //   positions, initialBalance, benchmark
    // );

    const calculatedPerformance = {
      ...mockPerformanceData,
      calculatedAt: new Date().toISOString(),
      period: {
        startDate: startDate || '2024-01-01',
        endDate: endDate || new Date().toISOString()
      },
      benchmark: benchmark || 'SPY'
    };

    return NextResponse.json(calculatedPerformance);
  } catch (error) {
    console.error('Error calculating performance:', error);
    return NextResponse.json(
      { error: 'Failed to calculate performance' },
      { status: 500 }
    );
  }
}