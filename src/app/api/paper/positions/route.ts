import { NextRequest, NextResponse } from 'next/server';

// Mock data for demonstration - in production, this would connect to the actual paper trading engine
const mockPositions = [
  {
    id: 'pos_1',
    ticker: 'SPY',
    optionSymbol: 'SPY241220C00580000',
    contractType: 'CALL',
    strike: 580,
    expiration: '2024-12-20',
    side: 'LONG',
    quantity: 5,
    entryPrice: 2.45,
    currentPrice: 2.78,
    entryTimestamp: '2024-10-15T09:30:00Z',
    pnl: 165,
    pnlPercent: 13.47,
    maxFavorableExcursion: 185,
    maxAdverseExcursion: -25,
    confidence: 0.82,
    conviction: 0.75,
    regime: 'BULL',
    daysToExpiration: 63,
    greeks: {
      delta: 0.65,
      gamma: 0.012,
      theta: -0.08,
      vega: 0.15,
      rho: 0.25,
      impliedVolatility: 0.18
    },
    status: 'OPEN'
  },
  {
    id: 'pos_2',
    ticker: 'QQQ',
    optionSymbol: 'QQQ241115P00480000',
    contractType: 'PUT',
    strike: 480,
    expiration: '2024-11-15',
    side: 'LONG',
    quantity: 3,
    entryPrice: 3.20,
    currentPrice: 2.95,
    entryTimestamp: '2024-10-16T14:15:00Z',
    pnl: -75,
    pnlPercent: -7.81,
    maxFavorableExcursion: 45,
    maxAdverseExcursion: -85,
    confidence: 0.68,
    conviction: 0.60,
    regime: 'NEUTRAL',
    daysToExpiration: 28,
    greeks: {
      delta: -0.35,
      gamma: 0.008,
      theta: -0.12,
      vega: 0.18,
      rho: -0.15,
      impliedVolatility: 0.22
    },
    status: 'OPEN'
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const ticker = searchParams.get('ticker');

    let filteredPositions = mockPositions;

    // Filter by status if provided
    if (status) {
      filteredPositions = filteredPositions.filter(pos => pos.status === status.toUpperCase());
    }

    // Filter by ticker if provided
    if (ticker) {
      filteredPositions = filteredPositions.filter(pos => 
        pos.ticker.toLowerCase().includes(ticker.toLowerCase())
      );
    }

    return NextResponse.json(filteredPositions);
  } catch (error) {
    console.error('Error fetching positions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch positions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['ticker', 'contractType', 'strike', 'expiration', 'side', 'quantity'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Create new position (mock implementation)
    const newPosition = {
      id: `pos_${Date.now()}`,
      ...body,
      entryTimestamp: new Date().toISOString(),
      pnl: 0,
      pnlPercent: 0,
      maxFavorableExcursion: 0,
      maxAdverseExcursion: 0,
      status: 'OPEN',
      greeks: {
        delta: 0,
        gamma: 0,
        theta: 0,
        vega: 0,
        rho: 0,
        impliedVolatility: 0.20
      }
    };

    // In production, this would call the paper trading engine
    // await paperTradingEngine.executePaperTrade(tradeSignal);

    return NextResponse.json(newPosition, { status: 201 });
  } catch (error) {
    console.error('Error creating position:', error);
    return NextResponse.json(
      { error: 'Failed to create position' },
      { status: 500 }
    );
  }
}