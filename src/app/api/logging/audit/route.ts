import { NextRequest, NextResponse } from 'next/server';
import { auditLogger } from '@/gamma-services/logging/AuditLogger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const eventTypes = searchParams.get('eventTypes')?.split(',') as any[];
    const userId = searchParams.get('userId') || undefined;
    const accountId = searchParams.get('accountId') || undefined;
    const resource = searchParams.get('resource') || undefined;
    const outcome = searchParams.get('outcome') as any;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const tags = searchParams.get('tags')?.split(',') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;
    const format = searchParams.get('format') || 'json';

    // Build filter
    const filter = {
      eventTypes,
      userId,
      accountId,
      resource,
      outcome,
      startDate,
      endDate,
      tags,
      limit
    };

    // Remove undefined values
    Object.keys(filter).forEach(key => {
      if (filter[key as keyof typeof filter] === undefined) {
        delete filter[key as keyof typeof filter];
      }
    });

    if (format === 'export') {
      // Export audit events
      const exportFormat = searchParams.get('exportFormat') as 'JSON' | 'CSV' || 'JSON';
      const exportData = auditLogger.exportEvents(filter, exportFormat);
      
      const contentType = exportFormat === 'CSV' ? 'text/csv' : 'application/json';
      const filename = `audit-events-${new Date().toISOString().split('T')[0]}.${exportFormat.toLowerCase()}`;
      
      return new NextResponse(exportData, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    // Query events
    const events = auditLogger.queryEvents(filter);
    const statistics = auditLogger.getAuditStatistics();

    return NextResponse.json({
      status: 'success',
      data: {
        events,
        statistics,
        filter,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Audit log API error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to retrieve audit logs',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, eventId } = body;

    switch (action) {
      case 'getEvent':
        if (!eventId) {
          return NextResponse.json(
            { status: 'error', message: 'Event ID is required' },
            { status: 400 }
          );
        }
        
        const event = auditLogger.getEventById(eventId);
        if (!event) {
          return NextResponse.json(
            { status: 'error', message: 'Event not found' },
            { status: 404 }
          );
        }
        
        return NextResponse.json({
          status: 'success',
          data: { event }
        });

      case 'clearEvents':
        // This is a dangerous operation - should be protected
        auditLogger.clearAllEvents();
        return NextResponse.json({
          status: 'success',
          message: 'All audit events cleared'
        });

      default:
        return NextResponse.json(
          { status: 'error', message: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Audit log action error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to process audit log action',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}