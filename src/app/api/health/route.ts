import { NextRequest, NextResponse } from 'next/server';
import { systemHealthMonitor } from '@/gamma-services/monitoring/SystemHealthMonitor';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';

    if (detailed) {
      // Return detailed health information
      const healthStatus = systemHealthMonitor.getHealthStatus();
      const metrics = systemHealthMonitor.getMetrics(30); // Last 30 minutes
      const alerts = systemHealthMonitor.getActiveAlerts();
      const overallHealth = systemHealthMonitor.getOverallHealth();

      return NextResponse.json({
        status: 'success',
        data: {
          overallHealth,
          services: healthStatus,
          metrics: {
            latest: metrics[metrics.length - 1] || null,
            history: metrics
          },
          alerts: {
            active: alerts,
            count: alerts.length
          },
          timestamp: new Date().toISOString()
        }
      });
    } else {
      // Return simple health check
      const overallHealth = systemHealthMonitor.getOverallHealth();
      const healthStatus = systemHealthMonitor.getHealthStatus();
      
      return NextResponse.json({
        status: overallHealth === 'healthy' ? 'ok' : 'degraded',
        health: overallHealth,
        services: healthStatus.reduce((acc, service) => {
          acc[service.service] = service.status;
          return acc;
        }, {} as Record<string, string>),
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}