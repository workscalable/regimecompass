# Gamma Adaptive System - Scalability and Monitoring Guide

## Overview

The Gamma Adaptive System includes comprehensive scalability and monitoring infrastructure designed to handle high-throughput trading operations with automatic scaling, real-time monitoring, and enterprise-grade observability.

## Architecture Components

### 1. Load Balancer (`LoadBalancer.ts`)
- **Purpose**: Distributes ticker processing across multiple worker threads
- **Features**:
  - Automatic worker creation and management
  - Load-based ticker assignment
  - Health monitoring and failover
  - Dynamic load rebalancing
  - Graceful worker shutdown

### 2. Metrics Collector (`MetricsCollector.ts`)
- **Purpose**: Collects and aggregates system, application, and performance metrics
- **Features**:
  - Real-time metrics collection
  - Configurable alert thresholds
  - Multiple export targets (Prometheus, Grafana, Datadog)
  - Historical data retention
  - Performance percentile calculations

### 3. Health Check Service (`HealthCheckService.ts`)
- **Purpose**: Provides comprehensive health monitoring with HTTP endpoints
- **Features**:
  - Multiple health check types (Database, API, Cache, Queue, Custom)
  - Configurable check intervals and timeouts
  - REST API endpoints for health status
  - Kubernetes-compatible liveness/readiness probes
  - Authentication support

### 4. Scalability Manager (`ScalabilityManager.ts`)
- **Purpose**: Orchestrates automatic scaling decisions based on system metrics
- **Features**:
  - CPU and memory-based scaling triggers
  - Configurable scaling policies
  - Cooldown periods to prevent thrashing
  - Scaling history and decision logging
  - Integration with load balancer and metrics

### 5. Monitoring Dashboard (`MonitoringDashboard.ts`)
- **Purpose**: Web-based real-time monitoring interface
- **Features**:
  - Real-time system metrics visualization
  - Worker status and load distribution
  - Scaling history and current decisions
  - Active alerts and health check status
  - Server-Sent Events for live updates

## Quick Start

### Basic Usage

```typescript
import { GammaAdaptiveScalingSystem } from './gamma-services/scaling';

// Initialize with default configuration
const scalingSystem = new GammaAdaptiveScalingSystem();

await scalingSystem.initialize();

// Add tickers for processing
await scalingSystem.addTicker('SPY');
await scalingSystem.addTicker('QQQ');

// Get system status
const status = await scalingSystem.getSystemStatus();
console.log('System Status:', status);

// Shutdown gracefully
await scalingSystem.shutdown();
```

### Custom Configuration

```typescript
import { GammaAdaptiveScalingSystem, createDefaultScalabilityConfig } from './gamma-services/scaling';

const customConfig = {
  ...createDefaultScalabilityConfig(),
  scaling: {
    minInstances: 3,
    maxInstances: 20,
    targetCpuUtilization: 65,
    targetMemoryUtilization: 70,
    scaleUpThreshold: 0.75,
    scaleDownThreshold: 0.25,
    cooldownPeriod: 300000, // 5 minutes
    evaluationPeriod: 60000  // 1 minute
  },
  loadBalancer: {
    maxWorkersPerNode: 12,
    maxTickersPerWorker: 6,
    healthCheckInterval: 30000,
    loadThreshold: 0.8,
    failoverTimeout: 10000,
    scalingPolicy: 'AGGRESSIVE'
  }
};

const scalingSystem = new GammaAdaptiveScalingSystem(customConfig);
```

## Configuration Options

### Scaling Configuration

```typescript
interface ScalingConfig {
  minInstances: number;        // Minimum number of worker instances
  maxInstances: number;        // Maximum number of worker instances
  targetCpuUtilization: number; // Target CPU utilization percentage
  targetMemoryUtilization: number; // Target memory utilization percentage
  scaleUpThreshold: number;    // Threshold to trigger scale up (0-1)
  scaleDownThreshold: number;  // Threshold to trigger scale down (0-1)
  cooldownPeriod: number;      // Minimum time between scaling actions (ms)
  evaluationPeriod: number;    // How often to evaluate scaling (ms)
}
```

### Load Balancer Configuration

```typescript
interface LoadBalancingConfig {
  maxWorkersPerNode: number;   // Maximum workers per node
  maxTickersPerWorker: number; // Maximum tickers per worker
  healthCheckInterval: number; // Worker health check interval (ms)
  loadThreshold: number;       // Load threshold for worker overload (0-1)
  failoverTimeout: number;     // Timeout for worker failover (ms)
  scalingPolicy: 'CONSERVATIVE' | 'AGGRESSIVE' | 'ADAPTIVE';
}
```

### Metrics Configuration

```typescript
interface MetricsConfig {
  collectionInterval: number;  // How often to collect metrics (ms)
  retentionPeriod: number;     // How long to retain metrics (ms)
  aggregationWindows: number[]; // Time windows for aggregation (ms)
  alertThresholds: {
    cpuUsage: number;          // CPU usage alert threshold (%)
    memoryUsage: number;       // Memory usage alert threshold (%)
    errorRate: number;         // Error rate alert threshold (0-1)
    latency: number;           // Latency alert threshold (ms)
    throughput: number;        // Minimum throughput threshold
    availability: number;      // Minimum availability threshold (0-1)
  };
  exportTargets: ExportTarget[]; // External monitoring systems
}
```

## Monitoring Endpoints

### Health Check Endpoints

- `GET /health` - Overall system health status
- `GET /health/live` - Liveness probe (Kubernetes compatible)
- `GET /health/ready` - Readiness probe (Kubernetes compatible)

### Dashboard Endpoints

- `GET /` - Main monitoring dashboard
- `GET /api/data` - Complete dashboard data (JSON)
- `GET /api/metrics` - System metrics (JSON)
- `GET /api/health` - Health status (JSON)
- `GET /api/workers` - Worker status (JSON)
- `GET /api/scaling` - Scaling information (JSON)
- `GET /api/alerts` - Active alerts (JSON)
- `GET /events` - Server-Sent Events stream for real-time updates

## Scaling Behavior

### Scale Up Triggers

The system will scale up when any of these conditions are met:

1. **CPU Utilization** > `targetCpuUtilization`
2. **Memory Utilization** > `targetMemoryUtilization`
3. **Worker Utilization** > `scaleUpThreshold`
4. **Response Time** > latency alert threshold
5. **Error Rate** > error rate alert threshold

### Scale Down Triggers

The system will scale down when ALL of these conditions are met:

1. **CPU Utilization** < `scaleDownThreshold`
2. **Memory Utilization** < `scaleDownThreshold`
3. **Worker Utilization** < `scaleDownThreshold`
4. **Response Time** < 50% of latency threshold
5. **Error Rate** < 10% of error rate threshold

### Cooldown Period

After any scaling action, the system waits for the `cooldownPeriod` before making another scaling decision. This prevents rapid scaling oscillations.

## Worker Management

### Worker Lifecycle

1. **Creation**: Workers are created as Node.js worker threads
2. **Assignment**: Tickers are assigned based on current load
3. **Health Monitoring**: Regular health checks ensure worker responsiveness
4. **Load Balancing**: Tickers are redistributed when workers become overloaded
5. **Failure Handling**: Failed workers are replaced and their tickers reassigned
6. **Graceful Shutdown**: Workers receive shutdown signals and clean up resources

### Worker Metrics

Each worker reports:
- Processing time per signal
- Memory usage
- CPU usage
- Error count and rate
- Assigned ticker count
- Current load percentage

## Monitoring and Alerting

### System Metrics

- **CPU Usage**: Current CPU utilization percentage
- **Memory Usage**: Current memory utilization percentage
- **Network I/O**: Bytes sent/received, packets sent/received
- **Disk I/O**: Read/write operations and bytes

### Application Metrics

- **Signal Processing**: Signals processed, average processing time, throughput
- **Trading**: Active trades, trades executed, portfolio heat, P&L
- **Errors**: Total errors, error rate, errors by type
- **Orchestrator**: Active tickers, worker count, average worker load

### Performance Metrics

- **Latency**: Tick-to-decision time, signal processing time, database query time
- **Throughput**: Signals per second, trades per minute, requests per second
- **Reliability**: Uptime, availability, error rate, success rate

### Alert Types

- **CPU_USAGE**: High CPU utilization
- **MEMORY_USAGE**: High memory utilization
- **ERROR_RATE**: High error rate
- **HIGH_LATENCY**: Response time exceeds threshold
- **WORKER_FAILED**: Worker thread failure
- **HEALTH_CHECK_FAILED**: Health check failure

## Production Deployment

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://localhost:5432/gamma_adaptive

# API Keys
POLYGON_API_KEY=your_polygon_api_key
TRADIER_ACCESS_TOKEN=your_tradier_token

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379

# Dashboard Authentication
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=secure_password

# Application
NODE_ENV=production
APP_VERSION=1.0.0
```

### Docker Deployment

The system includes Docker support with multi-stage builds:

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Runtime stage
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3001 8080
CMD ["npm", "start"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gamma-adaptive-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gamma-adaptive-system
  template:
    metadata:
      labels:
        app: gamma-adaptive-system
    spec:
      containers:
      - name: gamma-adaptive
        image: gamma-adaptive-system:latest
        ports:
        - containerPort: 3001
        - containerPort: 8080
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
```

## Performance Tuning

### Scaling Parameters

- **Conservative Scaling**: Higher thresholds, longer cooldowns
- **Aggressive Scaling**: Lower thresholds, shorter cooldowns
- **Adaptive Scaling**: Dynamic thresholds based on historical performance

### Worker Optimization

- Adjust `maxTickersPerWorker` based on processing complexity
- Tune `healthCheckInterval` for balance between responsiveness and overhead
- Configure `loadThreshold` based on acceptable performance degradation

### Metrics Collection

- Reduce `collectionInterval` for more responsive scaling
- Increase `retentionPeriod` for longer historical analysis
- Configure `aggregationWindows` for different analysis timeframes

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Check for memory leaks in worker processes
   - Reduce `maxTickersPerWorker`
   - Increase `scaleUpThreshold` for memory

2. **Slow Response Times**
   - Check database connection pool settings
   - Verify network latency to data providers
   - Consider increasing worker count

3. **Frequent Scaling**
   - Increase `cooldownPeriod`
   - Adjust scaling thresholds
   - Check for external load spikes

4. **Worker Failures**
   - Check worker logs for error patterns
   - Verify resource limits
   - Consider reducing worker load

### Monitoring Tools

- Use the built-in dashboard for real-time monitoring
- Export metrics to Prometheus/Grafana for advanced visualization
- Set up alerts for critical system events
- Monitor worker thread performance and resource usage

## API Reference

### GammaAdaptiveScalingSystem

```typescript
class GammaAdaptiveScalingSystem {
  constructor(scalabilityConfig?: Partial<ScalabilityConfig>, dashboardConfig?: Partial<DashboardConfig>)
  
  async initialize(): Promise<void>
  async addTicker(ticker: string): Promise<string>
  async removeTicker(ticker: string): Promise<void>
  async getSystemStatus(): Promise<SystemStatus>
  getScalabilityManager(): ScalabilityManager
  getMonitoringDashboard(): MonitoringDashboard
  async shutdown(): Promise<void>
}
```

### ScalabilityManager

```typescript
class ScalabilityManager {
  async addTicker(ticker: string): Promise<string>
  async removeTicker(ticker: string): Promise<void>
  async getSystemCapacity(): Promise<SystemCapacity>
  async evaluateScaling(): Promise<ScalingDecision>
  async executeScalingDecision(decision: ScalingDecision): Promise<void>
  getScalingHistory(limit?: number): ScalingDecision[]
  async getSystemHealth(): Promise<HealthStatus>
  async getMetrics(): Promise<MetricsData>
}
```

This comprehensive scalability and monitoring infrastructure provides enterprise-grade capabilities for the Gamma Adaptive System, ensuring reliable operation under varying load conditions with full observability and automatic scaling capabilities.