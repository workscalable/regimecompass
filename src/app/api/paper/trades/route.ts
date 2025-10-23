import { NextRequest, NextResponse } from 'next/server';

// Mock trade history data
const mockTrades = [
  {
    id: 'trade_1',
    ticker: 'SPY',
    optionSymbol: 'SPY241018C00575000',
    contractType: 'CALL',
    side: 'LONG',
    quantity: 3,
    entryPrice: 2.15,
    exitPrice: 2.85,
    entryDate: '2024-10-15T09:30:00Z',
    exitDate: '2024-10-16T15:45:00Z',
    pnl: 210,
    pnlPercent: 32.56,
    holdingPeriod: 30.25, // hours
    confidence: 0.78,
    conviction: 0.82,
    regime: 'BULL',
    exitReason: 'PROFIT_TARGET',
    maxFavorableExcursion: 225,
    maxAdverseExcursion: -15
  },
  {
    id: 'trade_2',
    ticker: 'QQQ',
    optionSymbol: 'QQQ241011P00475000',
    contractType: 'PUT',
    side: 'LONG',
    quantity: 2,
    entryPrice: 1.95,
    exitPrice: 1.45,
    entryDate: '2024-10-10T11:15:00Z',
    exitDate: '2024-10-11T10:30:00Z',
    pnl: -100,
    pnlPercent: -25.64,
    holdingPeriod: 23.25,
    confidence: 0.65,
    conviction: 0.55,
    regime: 'NEUTRAL',
    exitReason: 'STOP_LOSS',
    maxFavorableExcursion: 25,
    maxAdverseExcursion: -110
  },
  {
    id: 'trade_3',
    ticker: 'NVDA',
    optionSymbol: 'NVDA241025C01200000',
    contractType: 'CALL',
    side: 'LONG',
    quantity: 1,
    entryPrice: 8.50,
    exitPrice: 12.25,
    entryDate: '2024-10-14T13:20:00Z',
    exitDate: '2024-10-15T16:00:00Z',
    pnl: 375,
    pnlPercent: 44.12,
    holdingPeriod: 26.67,
    confidence: 0.85,
    conviction: 0.90,
    regime: 'BULL',
    exitReason: 'PROFIT_TARGET',
    maxFavorableExcursion: 385,
    maxAdverseExcursion: -45
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let filteredTrades = [...mockTrades];

    // Filter by ticker
    if (ticker) {
      filteredTrades = filteredTrades.filter(trade => 
        trade.ticker.toLowerCase().includes(ticker.toLowerCase())
      );
    }

    // Filter by date range
    if (startDate) {
      filteredTrades = filteredTrades.filter(trade => 
        new Date(trade.entryDate) >= new Date(startDate)
      );
    }

    if (endDate) {
      filteredTrades = filteredTrades.filter(trade => 
        new Date(trade.exitDate) <= new Date(endDate)
      );
    }

    // Sort by exit date (most recent first)
    filteredTrades.sort((a, b) => 
      new Date(b.exitDate).getTime() - new Date(a.exitDate).getTime()
    );

    // Apply pagination
    const paginatedTrades = filteredTrades.slice(offset, offset + limit);

    return NextResponse.json({
      trades: paginatedTrades,
      total: filteredTrades.length,
      limit,
      offset,
      hasMore: offset + limit < filteredTrades.length
    });
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trades' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { analysis } = body;

    // In production, this would trigger trade analysis
    // const tradeAnalysis = await tradeAnalyzer.analyzeClosedTrade(position);

    const mockAnalysis = {
      id: `analysis_${Date.now()}`,
      tradeId: analysis?.tradeId || 'unknown',
      signalId: analysis?.signalId || 'unknown',
      entryConfidence: analysis?.entryConfidence || 0.5,
      actualOutcome: analysis?.pnl > 0 ? 'WIN' : 'LOSS',
      confidenceEffectiveness: analysis?.confidenceEffectiveness || 0.5,
      learnings: analysis?.learnings || [],
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      message: 'Trade analysis completed',
      analysis: mockAnalysis
    });
  } catch (error) {
    console.error('Error analyzing trade:', error);
    return NextResponse.json(
      { error: 'Failed to analyze trade' },
      { status: 500 }
    );
  }
}