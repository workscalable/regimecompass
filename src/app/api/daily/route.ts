import { NextRequest, NextResponse } from 'next/server';
import { MarketSnapshot } from '@/lib/types';
import { buildMarketSnapshot } from '@/lib/snapshotBuilder';
import { validateMarketSnapshot } from '@/lib/validation';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
let cachedSnapshot: MarketSnapshot | null = null;
let cacheTimestamp: number = 0;

/**
 * Daily market snapshot API endpoint
 * Returns comprehensive market regime analysis with all predictive signals
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check if we have valid cached data
    const now = Date.now();
    if (cachedSnapshot && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('Returning cached market snapshot');
      return NextResponse.json({
        success: true,
        data: cachedSnapshot,
        cached: true,
        timestamp: new Date(cacheTimestamp).toISOString(),
        processingTime: Date.now() - startTime
      });
    }

    console.log('Generating fresh market snapshot...');

    // Build comprehensive market snapshot
    const snapshot = await buildMarketSnapshot();
    
    // Validate the snapshot data
    try {
      validateMarketSnapshot(snapshot);
    } catch (validationError) {
      console.error('Market snapshot validation failed:', validationError);
      return NextResponse.json({
        success: false,
        error: 'Data validation failed',
        details: validationError instanceof Error ? validationError.message : 'Unknown validation error',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Cache the successful snapshot
    cachedSnapshot = snapshot;
    cacheTimestamp = now;

    // Log performance metrics
    const processingTime = Date.now() - startTime;
    console.log(`Market snapshot generated successfully in ${processingTime}ms`);

    // Return successful response
    return NextResponse.json({
      success: true,
      data: snapshot,
      cached: false,
      timestamp: snapshot.timestamp.toISOString(),
      processingTime,
      dataQuality: {
        completeness: snapshot.dataQuality.completeness,
        freshness: snapshot.dataQuality.freshness,
        sources: snapshot.dataQuality.sources
      }
    });

  } catch (error) {
    console.error('Error generating market snapshot:', error);
    
    // Return cached data if available, even if stale
    if (cachedSnapshot) {
      console.log('Returning stale cached data due to error');
      return NextResponse.json({
        success: true,
        data: cachedSnapshot,
        cached: true,
        stale: true,
        error: 'Fresh data unavailable, returning cached data',
        timestamp: new Date(cacheTimestamp).toISOString(),
        processingTime: Date.now() - startTime
      });
    }

    // Return error response
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - startTime
    }, { status: 500 });
  }
}

/**
 * POST endpoint for manual refresh or configuration updates
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { forceRefresh, config } = body;

    // Force refresh - clear cache
    if (forceRefresh) {
      cachedSnapshot = null;
      cacheTimestamp = 0;
      console.log('Cache cleared - forcing fresh data generation');
    }

    // Update configuration if provided
    if (config) {
      // TODO: Implement configuration updates
      console.log('Configuration update requested:', config);
    }

    // Generate fresh snapshot
    const snapshot = await buildMarketSnapshot();
    
    // Validate the snapshot
    try {
      validateMarketSnapshot(snapshot);
    } catch (validationError) {
      return NextResponse.json({
        success: false,
        error: 'Data validation failed',
        details: validationError instanceof Error ? validationError.message : 'Unknown validation error',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Update cache
    cachedSnapshot = snapshot;
    cacheTimestamp = Date.now();

    return NextResponse.json({
      success: true,
      data: snapshot,
      cached: false,
      forced: forceRefresh || false,
      timestamp: snapshot.timestamp.toISOString(),
      processingTime: Date.now() - startTime
    });

  } catch (error) {
    console.error('Error in POST /api/daily:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - startTime
    }, { status: 500 });
  }
}

/**
 * OPTIONS endpoint for CORS support
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

