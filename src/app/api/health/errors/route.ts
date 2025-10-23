import { NextRequest, NextResponse } from 'next/server';
import { errorHandler } from '@/gamma-services/errors/ErrorHandler';
import { gracefulDegradationManager } from '@/gamma-services/errors/GracefulDegradation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeDetails = searchParams.get('details') === 'true';
    const category = searchParams.get('category');
    const severity = searchParams.get('severity');

    // Get error metrics
    const errorMetrics = errorHandler.getErrorMetrics();
    
    // Filter recent errors if category or severity specified
    let filteredErrors = errorMetrics.recentErrors;
    if (category) {
      filteredErrors = filteredErrors.filter(error => error.category === category);
    }
    if (severity) {
      filteredErrors = filteredErrors.filter(error => error.severity === severity);
    }

    // Get circuit breaker status
    const circuitBreakers = errorHandler.getCircuitBreakerStatus();
    
    // Get degradation status
    const systemHealth = gracefulDegradationManager.getSystemHealth();
    const activeDegradations = gracefulDegradationManager.getActiveDegradations();
    const serviceStatuses = gracefulDegradationManager.getServiceStatuses();

    const response = {
      status: 'success',
      data: {
        errorMetrics: {
          ...errorMetrics,
          recentErrors: includeDetails ? filteredErrors : filteredErrors.length
        },
        circuitBreakers,
        systemHealth,
        degradation: {
          activeDegradations,
          serviceStatuses
        },
        summary: {
          totalErrors: errorMetrics.totalErrors,
          criticalErrors: errorMetrics.errorsBySeverity.CRITICAL,
          highSeverityErrors: errorMetrics.errorsBySeverity.HIGH,
          recoverySuccessRate: errorMetrics.recoveryAttempts > 0 
            ? (errorMetrics.successfulRecoveries / errorMetrics.recoveryAttempts) * 100 
            : 0,
          openCircuitBreakers: Object.values(circuitBreakers).filter(cb => cb.isOpen).length,
          degradedServices: systemHealth.degradedServices,
          systemStatus: systemHealth.status
        },
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error metrics API error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to retrieve error metrics',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, service, data } = body;

    switch (action) {
      case 'resetMetrics':
        errorHandler.resetMetrics();
        return NextResponse.json({
          status: 'success',
          message: 'Error metrics reset successfully'
        });

      case 'forceRecovery':
        if (!service) {
          return NextResponse.json(
            { status: 'error', message: 'Service name is required for recovery' },
            { status: 400 }
          );
        }
        
        await gracefulDegradationManager.forceRecovery(service);
        return NextResponse.json({
          status: 'success',
          message: `Recovery initiated for service: ${service}`
        });

      case 'degradeService':
        if (!service || !data?.level) {
          return NextResponse.json(
            { status: 'error', message: 'Service name and degradation level are required' },
            { status: 400 }
          );
        }

        // Create a mock error for manual degradation
        const mockError = {
          severity: data.level === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
          category: 'SYSTEM',
          message: `Manual degradation triggered for ${service}`
        } as any;

        await gracefulDegradationManager.degradeService(service, mockError, data.level);
        return NextResponse.json({
          status: 'success',
          message: `Service ${service} degraded to level ${data.level}`
        });

      case 'testCircuitBreaker':
        if (!service) {
          return NextResponse.json(
            { status: 'error', message: 'Service name is required for circuit breaker test' },
            { status: 400 }
          );
        }

        // Simulate failures to test circuit breaker
        for (let i = 0; i < 6; i++) {
          try {
            await errorHandler.handleError(
              new Error(`Test failure ${i + 1}`),
              async () => { throw new Error('Simulated failure'); },
              { operationName: service }
            );
          } catch (e) {
            // Expected to fail
          }
        }

        return NextResponse.json({
          status: 'success',
          message: `Circuit breaker test completed for ${service}`
        });

      default:
        return NextResponse.json(
          { status: 'error', message: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error handling action failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to process error handling action',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}