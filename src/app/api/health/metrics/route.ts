import { NextRequest, NextResponse } from 'next/server';
import { systemHealthMonitor } from '@/gamma-services/monitoring/SystemHealthMonitor';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minutes = parseInt(searchParams.get('minutes') || '30');
    const format = searchParams.get('format') || 'json';

    if (minutes < 1 || minutes > 1440) { // Max 24 hours
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Minutes parameter must be between 1 and 1440' 
        },
        { status: 400 }
      );
    }

    const metrics = systemHealthMonitor.getMetrics(minutes);

    if (format === 'prometheus') {
      // Return Prometheus format for monitoring systems
      const prometheusMetrics = formatPrometheusMetrics(metrics);
      return new NextResponse(prometheusMetrics, {
        headers: {
          'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'
        }
      });
    }

    return NextResponse.json({
      status: 'success',
      data: {
        timeRange: `${minutes} minutes`,
        count: metrics.length,
        metrics: metrics,
        summary: calculateMetricsSummary(metrics)
      }
    });
  } catch (error) {
    console.error('Metrics API error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to retrieve metrics',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function formatPrometheusMetrics(metrics: any[]): string {
  if (metrics.length === 0) return '';

  const latest = metrics[metrics.length - 1];
  const timestamp = Math.floor(latest.timestamp.getTime() / 1000);

  return `
# HELP paper_trading_memory_usage_bytes Memory usage in bytes
# TYPE paper_trading_memory_usage_bytes gauge
paper_trading_memory_usage_bytes{type="used"} ${latest.memoryUsage.used} ${timestamp}
paper_trading_memory_usage_bytes{type="total"} ${latest.memoryUsage.total} ${timestamp}

# HELP paper_trading_memory_usage_percent Memory usage percentage
# TYPE paper_trading_memory_usage_percent gauge
paper_trading_memory_usage_percent ${latest.memoryUsage.percentage} ${timestamp}

# HELP paper_trading_cpu_usage_percent CPU usage percentage
# TYPE paper_trading_cpu_usage_percent gauge
paper_trading_cpu_usage_percent ${latest.cpuUsage} ${timestamp}

# HELP paper_trading_response_time_ms Response time in milliseconds
# TYPE paper_trading_response_time_ms gauge
paper_trading_response_time_ms{quantile="average"} ${latest.responseTime.average} ${timestamp}
paper_trading_response_time_ms{quantile="0.95"} ${latest.responseTime.p95} ${timestamp}
paper_trading_response_time_ms{quantile="0.99"} ${latest.responseTime.p99} ${timestamp}

# HELP paper_trading_error_rate Error rate percentage
# TYPE paper_trading_error_rate gauge
paper_trading_error_rate ${latest.errorRate} ${timestamp}

# HELP paper_trading_throughput_rps Throughput in requests per second
# TYPE paper_trading_throughput_rps gauge
paper_trading_throughput_rps ${latest.throughput} ${timestamp}

# HELP paper_trading_active_connections Active connections count
# TYPE paper_trading_active_connections gauge
paper_trading_active_connections ${latest.activeConnections} ${timestamp}
`.trim();
}

function calculateMetricsSummary(metrics: any[]) {
  if (metrics.length === 0) return null;

  const memoryUsages = metrics.map(m => m.memoryUsage.percentage);
  const cpuUsages = metrics.map(m => m.cpuUsage);
  const responseTimes = metrics.map(m => m.responseTime.average);
  const errorRates = metrics.map(m => m.errorRate);
  const throughputs = metrics.map(m => m.throughput);

  return {
    memoryUsage: {
      min: Math.min(...memoryUsages),
      max: Math.max(...memoryUsages),
      average: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length
    },
    cpuUsage: {
      min: Math.min(...cpuUsages),
      max: Math.max(...cpuUsages),
      average: cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length
    },
    responseTime: {
      min: Math.min(...responseTimes),
      max: Math.max(...responseTimes),
      average: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    },
    errorRate: {
      min: Math.min(...errorRates),
      max: Math.max(...errorRates),
      average: errorRates.reduce((a, b) => a + b, 0) / errorRates.length
    },
    throughput: {
      min: Math.min(...throughputs),
      max: Math.max(...throughputs),
      average: throughputs.reduce((a, b) => a + b, 0) / throughputs.length
    }
  };
}