import { NextRequest, NextResponse } from 'next/server';
import { buildMarketSnapshot } from '@/lib/snapshotBuilder';
import { logger } from '@/lib/monitoring';

/**
 * JSON Export API for quantitative systems
 * Provides structured market data and analysis in JSON format
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'full';
    const includeHistory = searchParams.get('history') === 'true';
    const timeframe = searchParams.get('timeframe') || '1d';
    
    logger.info('JSON export requested', {
      format,
      includeHistory,
      timeframe,
      userAgent: request.headers.get('user-agent')
    });

    // Get current market snapshot
    const snapshot = await buildMarketSnapshot();
    
    // Format data based on request
    let exportData;
    
    switch (format) {
      case 'minimal':
        exportData = formatMinimalExport(snapshot);
        break;
      case 'regime':
        exportData = formatRegimeExport(snapshot);
        break;
      case 'signals':
        exportData = formatSignalsExport(snapshot);
        break;
      case 'full':
      default:
        exportData = formatFullExport(snapshot);
        break;
    }

    // Add metadata
    const response = {
      metadata: {
        exportTime: new Date().toISOString(),
        format,
        version: '1.0',
        source: 'RegimeCompass',
        processingTime: Date.now() - startTime
      },
      data: exportData
    };

    logger.info('JSON export completed', {
      format,
      dataSize: JSON.stringify(response).length,
      processingTime: Date.now() - startTime
    });

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 5 minutes
        'X-Export-Format': format,
        'X-Processing-Time': (Date.now() - startTime).toString()
      }
    });

  } catch (error) {
    logger.error('JSON export failed', error as Error, {
      processingTime: Date.now() - startTime
    });

    return NextResponse.json({
      error: 'Export failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * POST endpoint for custom export configurations
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { 
      fields = [], 
      filters = {}, 
      format = 'json',
      compression = false 
    } = body;

    logger.info('Custom JSON export requested', {
      fieldsCount: fields.length,
      filters,
      format,
      compression
    });

    // Get market snapshot
    const snapshot = await buildMarketSnapshot();
    
    // Apply custom filtering and field selection
    const customData = applyCustomExport(snapshot, fields, filters);
    
    const response = {
      metadata: {
        exportTime: new Date().toISOString(),
        customFields: fields,
        filters,
        recordCount: Array.isArray(customData) ? customData.length : 1,
        processingTime: Date.now() - startTime
      },
      data: customData
    };

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json',
        'X-Custom-Export': 'true',
        'X-Processing-Time': (Date.now() - startTime).toString()
      }
    });

  } catch (error) {
    logger.error('Custom JSON export failed', error as Error);

    return NextResponse.json({
      error: 'Custom export failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Format minimal export with key metrics only
 */
function formatMinimalExport(snapshot: any) {
  return {
    timestamp: snapshot.timestamp,
    regime: snapshot.regime,
    regimeStrength: snapshot.regimeClassification?.strength || 0,
    breadthPct: snapshot.breadth?.breadthPct || 0,
    vix: snapshot.vix?.value || 0,
    spyPrice: snapshot.indexes?.SPY?.price || 0,
    spyTrend: snapshot.indexes?.SPY?.trendScore9 || 0
  };
}

/**
 * Format regime-focused export
 */
function formatRegimeExport(snapshot: any) {
  return {
    timestamp: snapshot.timestamp,
    regime: {
      current: snapshot.regime,
      strength: snapshot.regimeClassification?.strength || 0,
      confidence: snapshot.regimeClassification?.confidence || 0,
      factors: snapshot.regimeClassification?.factors || {},
      duration: snapshot.regimeClassification?.regimeDuration || 0
    },
    breadth: {
      percentage: snapshot.breadth?.breadthPct || 0,
      advancing: snapshot.breadth?.advancingStocks || 0,
      declining: snapshot.breadth?.decliningStocks || 0,
      ratio: snapshot.breadth?.advanceDeclineRatio || 0
    },
    volatility: {
      vix: snapshot.vix?.value || 0,
      trend: snapshot.vix?.trend || 'flat',
      change: snapshot.vix?.change || 0
    },
    forwardLooking: snapshot.forwardLooking || {}
  };
}

/**
 * Format signals-focused export
 */
function formatSignalsExport(snapshot: any) {
  return {
    timestamp: snapshot.timestamp,
    regime: snapshot.regime,
    tradingSignals: {
      long: snapshot.tradingCandidates?.long || [],
      hedge: snapshot.tradingCandidates?.hedge || [],
      avoid: snapshot.tradingCandidates?.avoid || []
    },
    sectorRecommendations: {
      overweight: snapshot.sectorAnalysis?.recommendations?.overweight || [],
      underweight: snapshot.sectorAnalysis?.recommendations?.underweight || [],
      rotationSignal: snapshot.sectorAnalysis?.recommendations?.rotationSignal || 'mixed'
    },
    predictiveSignals: {
      momentumDivergence: snapshot.predictiveSignals?.momentumDivergence || {},
      volumeAnalysis: snapshot.predictiveSignals?.volumeAnalysis || {},
      optionsFlow: snapshot.predictiveSignals?.optionsFlow || {}
    },
    riskMetrics: {
      portfolioHeat: snapshot.riskMetrics?.portfolioHeat || 0,
      volatilityAdjustment: snapshot.riskMetrics?.volatilityAdjustment || 1,
      maxDrawdown: snapshot.riskMetrics?.maxDrawdown || 0.07
    }
  };
}

/**
 * Format full export with all data
 */
function formatFullExport(snapshot: any) {
  return {
    ...snapshot,
    exportMetadata: {
      version: '1.0',
      completeness: snapshot.dataQuality?.completeness || 0,
      freshness: snapshot.dataQuality?.freshness || 0,
      sources: snapshot.dataQuality?.sources || []
    }
  };
}

/**
 * Apply custom field selection and filtering
 */
function applyCustomExport(snapshot: any, fields: string[], filters: any) {
  let result = snapshot;
  
  // Apply field selection if specified
  if (fields.length > 0) {
    result = {};
    fields.forEach(field => {
      const value = getNestedValue(snapshot, field);
      if (value !== undefined) {
        setNestedValue(result, field, value);
      }
    });
  }
  
  // Apply filters
  if (filters.regime && snapshot.regime !== filters.regime) {
    return null;
  }
  
  if (filters.minConfidence && snapshot.regimeClassification?.confidence < filters.minConfidence) {
    return null;
  }
  
  if (filters.sectors && Array.isArray(filters.sectors)) {
    if (result.sectors) {
      result.sectors = Object.fromEntries(
        Object.entries(result.sectors).filter(([symbol]) => 
          filters.sectors.includes(symbol)
        )
      );
    }
  }
  
  return result;
}

/**
 * Get nested object value by dot notation path
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Set nested object value by dot notation path
 */
function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
}