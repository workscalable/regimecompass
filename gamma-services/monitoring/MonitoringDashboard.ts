import { EventEmitter } from 'events';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import { ScalabilityManager } from '../scaling/ScalabilityManager';

export interface DashboardConfig {
  port: number;
  refreshInterval: number;
  enableRealTime: boolean;
  authentication: {
    enabled: boolean;
    username?: string;
    password?: string;
  };
  features: {
    systemMetrics: boolean;
    workerStatus: boolean;
    scalingHistory: boolean;
    healthChecks: boolean;
    alerting: boolean;
  };
}

export interface DashboardData {
  timestamp: Date;
  system: {
    capacity: any;
    health: any;
    metrics: any;
  };
  workers: {
    stats: any[];
    loadDistribution: Record<string, number>;
  };
  scaling: {
    history: any[];
    currentDecision: any;
  };
  alerts: {
    active: any[];
    recent: any[];
  };
}

export class MonitoringDashboard extends EventEmitter {
  private config: DashboardConfig;
  private scalabilityManager: ScalabilityManager;
  private server?: http.Server;
  private dashboardData: DashboardData;
  private updateTimer?: NodeJS.Timeout;
  private connectedClients: Set<http.ServerResponse> = new Set();

  constructor(config: DashboardConfig, scalabilityManager: ScalabilityManager) {
    super();
    this.config = config;
    this.scalabilityManager = scalabilityManager;
    
    this.dashboardData = {
      timestamp: new Date(),
      system: { capacity: null, health: null, metrics: null },
      workers: { stats: [], loadDistribution: {} },
      scaling: { history: [], currentDecision: null },
      alerts: { active: [], recent: [] }
    };
  }

  public async initialize(): Promise<void> {
    console.log('Initializing Monitoring Dashboard...');
    
    await this.startDashboardServer();
    this.startDataUpdates();
    this.setupEventHandlers();
    
    this.emit('initialized');
  }

  public getDashboardData(): DashboardData {
    return { ...this.dashboardData };
  }

  public async updateDashboardData(): Promise<void> {
    try {
      const [capacity, health, metrics] = await Promise.all([
        this.scalabilityManager.getSystemCapacity(),
        this.scalabilityManager.getSystemHealth(),
        this.scalabilityManager.getMetrics()
      ]);
      
      this.dashboardData = {
        timestamp: new Date(),
        system: {
          capacity,
          health,
          metrics
        },
        workers: {
          stats: this.scalabilityManager['loadBalancer'].getWorkerStats(),
          loadDistribution: this.scalabilityManager['loadBalancer'].getLoadDistribution()
        },
        scaling: {
          history: this.scalabilityManager.getScalingHistory(20),
          currentDecision: await this.scalabilityManager.evaluateScaling()
        },
        alerts: {
          active: this.getActiveAlerts(),
          recent: this.getRecentAlerts()
        }
      };
      
      // Broadcast to connected clients if real-time is enabled
      if (this.config.enableRealTime) {
        this.broadcastUpdate();
      }
      
      this.emit('dataUpdated', this.dashboardData);
      
    } catch (error) {
      console.error('Error updating dashboard data:', error);
      this.emit('updateError', error);
    }
  }

  private async startDashboardServer(): Promise<void> {
    this.server = http.createServer(async (req, res) => {
      await this.handleRequest(req, res);
    });
    
    return new Promise((resolve, reject) => {
      this.server!.listen(this.config.port, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`Monitoring dashboard server listening on port ${this.config.port}`);
          resolve();
        }
      });
    });
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    
    // Authentication check
    if (this.config.authentication.enabled && !this.authenticateRequest(req)) {
      res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Monitoring Dashboard"' });
      res.end('Authentication required');
      return;
    }
    
    try {
      switch (url.pathname) {
        case '/':
          await this.serveDashboardHTML(res);
          break;
        case '/api/data':
          await this.serveAPIData(res);
          break;
        case '/api/metrics':
          await this.serveMetrics(res);
          break;
        case '/api/health':
          await this.serveHealth(res);
          break;
        case '/api/workers':
          await this.serveWorkers(res);
          break;
        case '/api/scaling':
          await this.serveScaling(res);
          break;
        case '/api/alerts':
          await this.serveAlerts(res);
          break;
        case '/events':
          await this.handleEventStream(req, res);
          break;
        case '/static/dashboard.js':
          await this.serveDashboardJS(res);
          break;
        case '/static/dashboard.css':
          await this.serveDashboardCSS(res);
          break;
        default:
          res.writeHead(404);
          res.end('Not found');
      }
    } catch (error) {
      console.error('Dashboard request error:', error);
      res.writeHead(500);
      res.end('Internal server error');
    }
  }

  private authenticateRequest(req: http.IncomingMessage): boolean {
    if (!this.config.authentication.enabled) return true;
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) return false;
    
    const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
    const [username, password] = credentials.split(':');
    
    return username === this.config.authentication.username && 
           password === this.config.authentication.password;
  }

  private async serveDashboardHTML(res: http.ServerResponse): Promise<void> {
    const html = this.generateDashboardHTML();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  private async serveAPIData(res: http.ServerResponse): Promise<void> {
    await this.updateDashboardData();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(this.dashboardData, null, 2));
  }

  private async serveMetrics(res: http.ServerResponse): Promise<void> {
    const metrics = await this.scalabilityManager.getMetrics();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(metrics, null, 2));
  }

  private async serveHealth(res: http.ServerResponse): Promise<void> {
    const health = await this.scalabilityManager.getSystemHealth();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(health, null, 2));
  }

  private async serveWorkers(res: http.ServerResponse): Promise<void> {
    const workerData = {
      stats: this.scalabilityManager['loadBalancer'].getWorkerStats(),
      loadDistribution: this.scalabilityManager['loadBalancer'].getLoadDistribution()
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(workerData, null, 2));
  }

  private async serveScaling(res: http.ServerResponse): Promise<void> {
    const scalingData = {
      history: this.scalabilityManager.getScalingHistory(50),
      currentDecision: await this.scalabilityManager.evaluateScaling(),
      capacity: await this.scalabilityManager.getSystemCapacity()
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(scalingData, null, 2));
  }

  private async serveAlerts(res: http.ServerResponse): Promise<void> {
    const alertData = {
      active: this.getActiveAlerts(),
      recent: this.getRecentAlerts()
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(alertData, null, 2));
  }

  private async handleEventStream(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    if (!this.config.enableRealTime) {
      res.writeHead(404);
      res.end('Real-time updates disabled');
      return;
    }
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    
    this.connectedClients.add(res);
    
    // Send initial data
    res.write(`data: ${JSON.stringify(this.dashboardData)}\n\n`);
    
    // Handle client disconnect
    req.on('close', () => {
      this.connectedClients.delete(res);
    });
  }

  private async serveDashboardJS(res: http.ServerResponse): Promise<void> {
    const js = this.generateDashboardJS();
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(js);
  }

  private async serveDashboardCSS(res: http.ServerResponse): Promise<void> {
    const css = this.generateDashboardCSS();
    res.writeHead(200, { 'Content-Type': 'text/css' });
    res.end(css);
  }

  private generateDashboardHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gamma Adaptive System - Monitoring Dashboard</title>
    <link rel="stylesheet" href="/static/dashboard.css">
</head>
<body>
    <div class="dashboard">
        <header class="dashboard-header">
            <h1>Gamma Adaptive System Monitoring</h1>
            <div class="status-indicator" id="status-indicator">
                <span class="status-dot"></span>
                <span class="status-text">Loading...</span>
            </div>
        </header>
        
        <div class="dashboard-grid">
            <div class="card system-overview">
                <h2>System Overview</h2>
                <div class="metrics-grid">
                    <div class="metric">
                        <span class="metric-label">CPU Usage</span>
                        <span class="metric-value" id="cpu-usage">-</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Memory Usage</span>
                        <span class="metric-value" id="memory-usage">-</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Active Workers</span>
                        <span class="metric-value" id="active-workers">-</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Total Tickers</span>
                        <span class="metric-value" id="total-tickers">-</span>
                    </div>
                </div>
            </div>
            
            <div class="card performance-metrics">
                <h2>Performance Metrics</h2>
                <div class="metrics-grid">
                    <div class="metric">
                        <span class="metric-label">Avg Response Time</span>
                        <span class="metric-value" id="response-time">-</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Throughput</span>
                        <span class="metric-value" id="throughput">-</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Error Rate</span>
                        <span class="metric-value" id="error-rate">-</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Availability</span>
                        <span class="metric-value" id="availability">-</span>
                    </div>
                </div>
            </div>
            
            <div class="card worker-status">
                <h2>Worker Status</h2>
                <div id="worker-list" class="worker-list">
                    <!-- Workers will be populated here -->
                </div>
            </div>
            
            <div class="card scaling-info">
                <h2>Auto Scaling</h2>
                <div id="scaling-status" class="scaling-status">
                    <!-- Scaling info will be populated here -->
                </div>
            </div>
            
            <div class="card alerts">
                <h2>Active Alerts</h2>
                <div id="alerts-list" class="alerts-list">
                    <!-- Alerts will be populated here -->
                </div>
            </div>
            
            <div class="card health-checks">
                <h2>Health Checks</h2>
                <div id="health-checks" class="health-checks">
                    <!-- Health checks will be populated here -->
                </div>
            </div>
        </div>
    </div>
    
    <script src="/static/dashboard.js"></script>
</body>
</html>`;
  }

  private generateDashboardJS(): string {
    return `
class MonitoringDashboard {
    constructor() {
        this.eventSource = null;
        this.refreshInterval = ${this.config.refreshInterval};
        this.enableRealTime = ${this.config.enableRealTime};
        
        this.init();
    }
    
    init() {
        this.setupEventSource();
        this.startPeriodicRefresh();
        this.bindEvents();
    }
    
    setupEventSource() {
        if (!this.enableRealTime) return;
        
        this.eventSource = new EventSource('/events');
        
        this.eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.updateDashboard(data);
        };
        
        this.eventSource.onerror = (error) => {
            console.error('EventSource error:', error);
            this.updateStatusIndicator('error', 'Connection Error');
        };
        
        this.eventSource.onopen = () => {
            this.updateStatusIndicator('connected', 'Connected');
        };
    }
    
    startPeriodicRefresh() {
        if (this.enableRealTime) return;
        
        setInterval(() => {
            this.fetchData();
        }, this.refreshInterval);
        
        // Initial fetch
        this.fetchData();
    }
    
    async fetchData() {
        try {
            const response = await fetch('/api/data');
            const data = await response.json();
            this.updateDashboard(data);
            this.updateStatusIndicator('connected', 'Connected');
        } catch (error) {
            console.error('Fetch error:', error);
            this.updateStatusIndicator('error', 'Fetch Error');
        }
    }
    
    updateDashboard(data) {
        this.updateSystemOverview(data.system);
        this.updatePerformanceMetrics(data.system);
        this.updateWorkerStatus(data.workers);
        this.updateScalingInfo(data.scaling);
        this.updateAlerts(data.alerts);
        this.updateHealthChecks(data.system.health);
    }
    
    updateSystemOverview(system) {
        if (!system.capacity) return;
        
        document.getElementById('cpu-usage').textContent = 
            system.capacity.utilization.cpu.toFixed(1) + '%';
        document.getElementById('memory-usage').textContent = 
            system.capacity.utilization.memory.toFixed(1) + '%';
        document.getElementById('active-workers').textContent = 
            system.capacity.currentCapacity.workers;
        document.getElementById('total-tickers').textContent = 
            system.capacity.currentCapacity.totalTickers;
    }
    
    updatePerformanceMetrics(system) {
        if (!system.capacity) return;
        
        document.getElementById('response-time').textContent = 
            system.capacity.performance.averageResponseTime.toFixed(1) + 'ms';
        document.getElementById('throughput').textContent = 
            system.capacity.performance.throughput.toFixed(1) + '/s';
        document.getElementById('error-rate').textContent = 
            (system.capacity.performance.errorRate * 100).toFixed(2) + '%';
        document.getElementById('availability').textContent = 
            (system.capacity.performance.availability * 100).toFixed(2) + '%';
    }
    
    updateWorkerStatus(workers) {
        const workerList = document.getElementById('worker-list');
        workerList.innerHTML = '';
        
        workers.stats.forEach(worker => {
            const workerElement = document.createElement('div');
            workerElement.className = 'worker-item';
            workerElement.innerHTML = \`
                <div class="worker-id">\${worker.id.substring(0, 8)}</div>
                <div class="worker-status \${worker.status.toLowerCase()}">\${worker.status}</div>
                <div class="worker-load">\${(worker.currentLoad * 100).toFixed(1)}%</div>
                <div class="worker-tickers">\${worker.tickersAssigned.length} tickers</div>
            \`;
            workerList.appendChild(workerElement);
        });
    }
    
    updateScalingInfo(scaling) {
        const scalingStatus = document.getElementById('scaling-status');
        
        if (scaling.currentDecision) {
            const decision = scaling.currentDecision;
            scalingStatus.innerHTML = \`
                <div class="scaling-decision">
                    <strong>Current Decision:</strong> \${decision.action}
                </div>
                <div class="scaling-reason">
                    <strong>Reason:</strong> \${decision.reason}
                </div>
                <div class="scaling-instances">
                    <strong>Instances:</strong> \${decision.currentInstances} → \${decision.targetInstances}
                </div>
            \`;
        }
    }
    
    updateAlerts(alerts) {
        const alertsList = document.getElementById('alerts-list');
        alertsList.innerHTML = '';
        
        if (alerts.active.length === 0) {
            alertsList.innerHTML = '<div class="no-alerts">No active alerts</div>';
            return;
        }
        
        alerts.active.forEach(alert => {
            const alertElement = document.createElement('div');
            alertElement.className = \`alert-item \${alert.severity.toLowerCase()}\`;
            alertElement.innerHTML = \`
                <div class="alert-type">\${alert.type}</div>
                <div class="alert-message">\${alert.message}</div>
                <div class="alert-value">\${alert.currentValue} / \${alert.threshold}</div>
            \`;
            alertsList.appendChild(alertElement);
        });
    }
    
    updateHealthChecks(health) {
        if (!health) return;
        
        const healthChecks = document.getElementById('health-checks');
        healthChecks.innerHTML = '';
        
        health.checks.forEach(check => {
            const checkElement = document.createElement('div');
            checkElement.className = \`health-check \${check.status.toLowerCase()}\`;
            checkElement.innerHTML = \`
                <div class="check-name">\${check.name}</div>
                <div class="check-status">\${check.status}</div>
                <div class="check-time">\${check.responseTime}ms</div>
            \`;
            healthChecks.appendChild(checkElement);
        });
    }
    
    updateStatusIndicator(status, text) {
        const indicator = document.getElementById('status-indicator');
        const dot = indicator.querySelector('.status-dot');
        const textElement = indicator.querySelector('.status-text');
        
        dot.className = \`status-dot \${status}\`;
        textElement.textContent = text;
    }
    
    bindEvents() {
        // Add any event handlers here
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MonitoringDashboard();
});`;
  }

  private generateDashboardCSS(): string {
    return `
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: #f5f5f5;
    color: #333;
}

.dashboard {
    min-height: 100vh;
    padding: 20px;
}

.dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    padding: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.dashboard-header h1 {
    color: #2c3e50;
    font-size: 24px;
    font-weight: 600;
}

.status-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
}

.status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: #95a5a6;
}

.status-dot.connected {
    background-color: #27ae60;
}

.status-dot.error {
    background-color: #e74c3c;
}

.dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 20px;
}

.card {
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.card h2 {
    color: #2c3e50;
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 15px;
    border-bottom: 2px solid #ecf0f1;
    padding-bottom: 10px;
}

.metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
}

.metric {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 6px;
}

.metric-label {
    font-size: 12px;
    color: #7f8c8d;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 5px;
}

.metric-value {
    font-size: 24px;
    font-weight: 700;
    color: #2c3e50;
}

.worker-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.worker-item {
    display: grid;
    grid-template-columns: 1fr auto auto auto;
    gap: 15px;
    align-items: center;
    padding: 12px;
    background: #f8f9fa;
    border-radius: 6px;
    border-left: 4px solid #3498db;
}

.worker-status {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
}

.worker-status.idle {
    background: #d5dbdb;
    color: #7f8c8d;
}

.worker-status.busy {
    background: #f39c12;
    color: white;
}

.worker-status.overloaded {
    background: #e74c3c;
    color: white;
}

.worker-status.failed {
    background: #c0392b;
    color: white;
}

.scaling-status {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.scaling-decision,
.scaling-reason,
.scaling-instances {
    padding: 10px;
    background: #f8f9fa;
    border-radius: 4px;
}

.alerts-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.alert-item {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 15px;
    align-items: center;
    padding: 12px;
    border-radius: 6px;
    border-left: 4px solid;
}

.alert-item.low {
    background: #d4edda;
    border-left-color: #28a745;
}

.alert-item.medium {
    background: #fff3cd;
    border-left-color: #ffc107;
}

.alert-item.high {
    background: #f8d7da;
    border-left-color: #dc3545;
}

.alert-item.critical {
    background: #f5c6cb;
    border-left-color: #721c24;
}

.health-checks {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.health-check {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 15px;
    align-items: center;
    padding: 10px;
    background: #f8f9fa;
    border-radius: 4px;
    border-left: 4px solid;
}

.health-check.pass {
    border-left-color: #28a745;
}

.health-check.warn {
    border-left-color: #ffc107;
}

.health-check.fail {
    border-left-color: #dc3545;
}

.no-alerts {
    text-align: center;
    color: #7f8c8d;
    font-style: italic;
    padding: 20px;
}

@media (max-width: 768px) {
    .dashboard-grid {
        grid-template-columns: 1fr;
    }
    
    .metrics-grid {
        grid-template-columns: 1fr;
    }
    
    .worker-item {
        grid-template-columns: 1fr;
        text-align: center;
    }
    
    .alert-item {
        grid-template-columns: 1fr;
        text-align: center;
    }
}`;
  }

  private getActiveAlerts(): any[] {
    // This would integrate with your actual alerting system
    return [];
  }

  private getRecentAlerts(): any[] {
    // This would integrate with your actual alerting system
    return [];
  }

  private startDataUpdates(): void {
    this.updateTimer = setInterval(async () => {
      await this.updateDashboardData();
    }, this.config.refreshInterval);
    
    // Initial update
    setTimeout(() => this.updateDashboardData(), 1000);
  }

  private broadcastUpdate(): void {
    const data = JSON.stringify(this.dashboardData);
    
    for (const client of this.connectedClients) {
      try {
        client.write(`data: ${data}\n\n`);
      } catch (error) {
        // Client disconnected, remove from set
        this.connectedClients.delete(client);
      }
    }
  }

  private setupEventHandlers(): void {
    this.scalabilityManager.on('scalingExecuted', (decision) => {
      console.log('Scaling executed:', decision);
      this.updateDashboardData();
    });
    
    this.scalabilityManager.on('alertViolations', (violations) => {
      console.log('Alert violations:', violations);
      this.updateDashboardData();
    });
    
    this.scalabilityManager.on('workerAdded', (worker) => {
      console.log('Worker added:', worker.id);
      this.updateDashboardData();
    });
    
    this.scalabilityManager.on('workerFailed', (event) => {
      console.log('Worker failed:', event.workerId);
      this.updateDashboardData();
    });
  }

  public async shutdown(): Promise<void> {
    console.log('Shutting down Monitoring Dashboard...');
    
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    
    // Close all SSE connections
    for (const client of this.connectedClients) {
      try {
        client.end();
      } catch (error) {
        // Ignore errors when closing connections
      }
    }
    this.connectedClients.clear();
    
    // Close HTTP server
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          console.log('Monitoring dashboard server closed');
          resolve();
        });
      });
    }
    
    this.emit('shutdown');
  }
}