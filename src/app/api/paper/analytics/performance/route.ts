import { NextRequest, NextResponse } from 'next/server';

// Mock performance time series data
const generateMockPerformanceData = (timeframe: string) => {
  const data = [];
  const now = new Date();
  let days = 30;

  switch (timeframe) {
    case '1D': days = 1; break;
    case '1W': days = 7; break;
    case '1M': days = 30; break;
    case '3M': days = 90; break;
    case '1Y': days = 365; break;
    case 'ALL': days = 365; break;
  }

  let balance = 100000;
  let totalPnL = 0;

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Generate realistic daily P&L
    const dailyPnL = (Math.random() - 0.45) * 500; // Slightly positive bias
    totalPnL += dailyPnL;
    balance = 100000 + totalPnL;
    
    // Calculate drawdown
    const peak = Math.max(balance, 100000);
    const drawdown = ((peak - balance) / peak) * 100;
    
    // Generate win rate (trending upward slightly)
    const baseWinRate = 60 + (Math.random() * 20) - 10; // 50-70% range
    const trendAdjustment = ((days - i) / days) * 10; // Slight upward trend
    const winRate = Math.max(0, Math.min(100, baseWinRate + trendAdjustment));
    
    // Generate trade count
    const trades = Math.floor(Math.random() * 3); // 0-2 trades per day

    data.push({
      date: date.toISOString().split('T')[0],
      accountBalance: Math.round(balance),
      totalPnL: Math.round(totalPnL),
      dailyPnL: Math.round(dailyPnL),
      drawdown: Math.round(drawdown * 100) / 100,
      winRate: Math.round(winRate * 100) / 100,
      trades
    });
  }

  return data;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '1M';
    const includeProjections = searchParams.get('projections') === 'true';

    // In production, this would call the performance calculator
    // const performanceData = await performanceCalculator.getPerformanceTimeSeries(
    //   timeframe, includeProjections
    // );

    const performanceData = generateMockPerformanceData(timeframe);

    // Add projections if requested
    if (includeProjections) {
      const lastDataPoint = performanceData[performanceData.length - 1];
      const projectionDays = 30;
      
      for (let i = 1; i <= projectionDays; i++) {
        const projectionDate = new Date();
        projectionDate.setDate(projectionDate.getDate() + i);
        
        // Simple projection based on recent trend
        const recentTrend = performanceData.slice(-7).reduce((sum, d) => sum + d.dailyPnL, 0) / 7;
        const projectedDailyPnL = recentTrend * (0.8 + Math.random() * 0.4); // Add some variance
        const projectedBalance = lastDataPoint.accountBalance + (projectedDailyPnL * i);
        
        performanceData.push({
          date: projectionDate.toISOString().split('T')[0],
          accountBalance: Math.round(projectedBalance),
          totalPnL: Math.round(projectedBalance - 100000),
          dailyPnL: Math.round(projectedDailyPnL),
          drawdown: 0,
          winRate: lastDataPoint.winRate,
          trades: 0,
          projected: true
        });
      }
    }

    return NextResponse.json(performanceData);
  } catch (error) {
    console.error('Error fetching performance analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance analytics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recalculate, benchmark, customPeriod } = body;

    if (recalculate) {
      // In production, this would trigger a full recalculation
      // await performanceCalculator.recalculateAllMetrics();
      
      return NextResponse.json({
        success: true,
        message: 'Performance metrics recalculation triggered',
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json(
      { error: 'Invalid request parameters' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing performance request:', error);
    return NextResponse.json(
      { error: 'Failed to process performance request' },
      { status: 500 }
    );
  }
}