import { EventEmitter } from 'events';
import * as http from 'http';
import * as https from 'https';

export interface HealthCheckConfig {
  port: number;
  endpoints: HealthEndpoint[];
  checks: HealthCheck[];
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  gracefulShutdownTimeout: number;
}

export interface HealthEndpoint {
  path: string;
  method: 'GET' | 'POST';
  handler: HealthCheckHandler;
  auth?: {
    type: 'BASIC' | 'BEARER';
    credentials: string;
  };
}

export interface HealthCheck {
  name: string;
  type: 'DATABASE' | 'EXTERNAL_API' | 'CACHE' | 'QUEUE' | 'CUSTOM';
  config: any;
  timeout: number;
  critical: boolean;
  interval: number;
  enabled: boolean;
}

export interface HealthStatus {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  timestamp: Date;
  uptime: number;
  version: string;
  environment: string;
  checks: HealthCheckResult[];
  system: SystemHealth;
  dependencies: DependencyHealth[];
}

export interface HealthCheckResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  responseTime: number;
  message?: string;
  details?: any;
  lastCheck: Date;
  consecutiveFailures: number;
}

export interface SystemHealth {
  cpu: {
    usage: number;
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  };
  memory: {
    usage: number;
    available: number;
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  };
  disk: {
    usage: number;
    available: number;
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  };
  network: {
    latency: number;
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  };
}

export interface DependencyHealth {
  name: string;
  type: 'DATABASE' | 'API' | 'CACHE' | 'QUEUE';
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  responseTime: number;
  lastCheck: Date;
  endpoint?: string;
}

export type HealthCheckHandler = (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void>;

export class HealthCheckService extends EventEmitter {
  private config: HealthCheckConfig;
  private server?: http.Server;
  private startTime: Date = new Date();
  private checkResults: Map<string, HealthCheckResult> = new Map();
  private checkTimers: Map<string, NodeJS.Timeout> = new Map();
  private isShuttingDown: boolean = false;

  constructor(config: HealthCheckConfig) {
    super();
    this.config = config;
  }

  public async initialize(): Promise<void> {
    console.log('Initializing Health Check Service...');
    
    await this.startHealthCheckServer();
    this.startPeriodicHealthChecks();
    
    this.emit('initialized');
  }

  public async getHealthStatus(): Promise<HealthStatus> {
    const systemHealth = await this.getSystemHealth();
    const dependencyHealth = await this.getDependencyHealth();
    
    const checks = Array.from(this.checkResults.values());
    const criticalFailures = checks.filter(c => 
      this.config.checks.find(check => check.name === c.name)?.critical && c.status === 'FAIL'
    );
    
    let overallStatus: HealthStatus['status'] = 'HEALTHY';
    
    if (criticalFailures.length > 0) {
      overallStatus = 'UNHEALTHY';
    } else if (checks.some(c => c.status === 'WARN') || systemHealth.cpu.status !== 'HEALTHY') {
      overallStatus = 'DEGRADED';
    }
    
    return {
      status: overallStatus,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime.getTime(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
      system: systemHealth,
      dependencies: dependencyHealth
    };
  }

  public async performHealthCheck(checkName: string): Promise<HealthCheckResult> {
    const check = this.config.checks.find(c => c.name === checkName);
    if (!check || !check.enabled) {
      throw new Error(`Health check '${checkName}' not found or disabled`);
    }
    
    const startTime = Date.now();
    let result: HealthCheckResult;
    
    try {
      const checkResult = await this.executeHealthCheck(check);
      const responseTime = Date.now() - startTime;
      
      result = {
        name: checkName,
        status: checkResult.success ? 'PASS' : 'FAIL',
        responseTime,
        message: checkResult.message,
        details: checkResult.details,
        lastCheck: new Date(),
        consecutiveFailures: checkResult.success ? 0 : 
          (this.checkResults.get(checkName)?.consecutiveFailures || 0) + 1
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      result = {
        name: checkName,
        status: 'FAIL',
        responseTime,
        message: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date(),
        consecutiveFailures: (this.checkResults.get(checkName)?.consecutiveFailures || 0) + 1
      };
    }
    
    this.checkResults.set(checkName, result);
    this.emit('healthCheckCompleted', result);
    
    return result;
  }

  public registerCustomCheck(check: HealthCheck): void {
    this.config.checks.push(check);
    
    if (check.enabled) {
      this.startPeriodicCheck(check);
    }
  }

  public enableCheck(checkName: string): void {
    const check = this.config.checks.find(c => c.name === checkName);
    if (check) {
      check.enabled = true;
      this.startPeriodicCheck(check);
    }
  }

  public disableCheck(checkName: string): void {
    const check = this.config.checks.find(c => c.name === checkName);
    if (check) {
      check.enabled = false;
      
      const timer = this.checkTimers.get(checkName);
      if (timer) {
        clearInterval(timer);
        this.checkTimers.delete(checkName);
      }
    }
  }

  private async startHealthCheckServer(): Promise<void> {
    this.server = http.createServer(async (req, res) => {
      await this.handleHealthCheckRequest(req, res);
    });
    
    return new Promise((resolve, reject) => {
      this.server!.listen(this.config.port, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`Health check server listening on port ${this.config.port}`);
          resolve();
        }
      });
    });
  }

  private async handleHealthCheckRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const endpoint = this.config.endpoints.find(e => e.path === url.pathname);
    
    if (!endpoint) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
      return;
    }
    
    if (req.method !== endpoint.method) {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }
    
    // Check authentication if required
    if (endpoint.auth && !this.authenticateRequest(req, endpoint.auth)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
    
    try {
      await endpoint.handler(req, res);
    } catch (error) {
      console.error('Health check endpoint error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  private authenticateRequest(req: http.IncomingMessage, auth: { type: string; credentials: string }): boolean {
    const authHeader = req.headers.authorization;
    if (!authHeader) return false;
    
    switch (auth.type) {
      case 'BASIC':
        return authHeader === `Basic ${auth.credentials}`;
      case 'BEARER':
        return authHeader === `Bearer ${auth.credentials}`;
      default:
        return false;
    }
  }

  private startPeriodicHealthChecks(): void {
    for (const check of this.config.checks) {
      if (check.enabled) {
        this.startPeriodicCheck(check);
      }
    }
  }

  private startPeriodicCheck(check: HealthCheck): void {
    const timer = setInterval(async () => {
      if (!this.isShuttingDown) {
        await this.performHealthCheck(check.name);
      }
    }, check.interval);
    
    this.checkTimers.set(check.name, timer);
    
    // Perform initial check
    setTimeout(() => this.performHealthCheck(check.name), 1000);
  }

  private async executeHealthCheck(check: HealthCheck): Promise<{ success: boolean; message?: string; details?: any }> {
    switch (check.type) {
      case 'DATABASE':
        return this.checkDatabase(check.config);
      case 'EXTERNAL_API':
        return this.checkExternalAPI(check.config);
      case 'CACHE':
        return this.checkCache(check.config);
      case 'QUEUE':
        return this.checkQueue(check.config);
      case 'CUSTOM':
        return this.checkCustom(check.config);
      default:
        throw new Error(`Unknown health check type: ${check.type}`);
    }
  }

  private async checkDatabase(config: any): Promise<{ success: boolean; message?: string; details?: any }> {
    try {
      // This would connect to your actual database
      // For now, we'll simulate a database check
      const startTime = Date.now();
      
      // Simulate database query
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        message: 'Database connection successful',
        details: { responseTime, connectionPool: 'healthy' }
      };
      
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Database check failed',
        details: { error: error instanceof Error ? error.stack : error }
      };
    }
  }

  private async checkExternalAPI(config: any): Promise<{ success: boolean; message?: string; details?: any }> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const client = config.url.startsWith('https') ? https : http;
      
      const req = client.request(config.url, {
        method: config.method || 'GET',
        timeout: this.config.timeout,
        headers: config.headers || {}
      }, (res) => {
        const responseTime = Date.now() - startTime;
        
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve({
            success: true,
            message: `API responded with status ${res.statusCode}`,
            details: { statusCode: res.statusCode, responseTime }
          });
        } else {
          resolve({
            success: false,
            message: `API responded with status ${res.statusCode}`,
            details: { statusCode: res.statusCode, responseTime }
          });
        }
      });
      
      req.on('error', (error) => {
        resolve({
          success: false,
          message: error.message,
          details: { error: error.stack }
        });
      });
      
      req.on('timeout', () => {
        resolve({
          success: false,
          message: 'Request timeout',
          details: { timeout: this.config.timeout }
        });
      });
      
      req.end();
    });
  }

  private async checkCache(config: any): Promise<{ success: boolean; message?: string; details?: any }> {
    try {
      // This would connect to your actual cache (Redis, Memcached, etc.)
      // For now, we'll simulate a cache check
      const startTime = Date.now();
      
      // Simulate cache operation
      await new Promise(resolve => setTimeout(resolve, Math.random() * 20));
      
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        message: 'Cache connection successful',
        details: { responseTime, cacheHitRate: 0.85 }
      };
      
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Cache check failed',
        details: { error: error instanceof Error ? error.stack : error }
      };
    }
  }

  private async checkQueue(config: any): Promise<{ success: boolean; message?: string; details?: any }> {
    try {
      // This would connect to your actual queue system
      // For now, we'll simulate a queue check
      const startTime = Date.now();
      
      // Simulate queue operation
      await new Promise(resolve => setTimeout(resolve, Math.random() * 30));
      
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        message: 'Queue connection successful',
        details: { responseTime, queueDepth: 42, processingRate: 150 }
      };
      
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Queue check failed',
        details: { error: error instanceof Error ? error.stack : error }
      };
    }
  }

  private async checkCustom(config: any): Promise<{ success: boolean; message?: string; details?: any }> {
    try {
      // Execute custom health check function
      if (typeof config.checkFunction === 'function') {
        const result = await config.checkFunction();
        return result;
      }
      
      return {
        success: false,
        message: 'Custom check function not provided'
      };
      
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Custom check failed',
        details: { error: error instanceof Error ? error.stack : error }
      };
    }
  }

  private async getSystemHealth(): Promise<SystemHealth> {
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    const freeMem = require('os').freemem();
    const cpuUsage = process.cpuUsage();
    
    const memoryUsagePercent = (memUsage.rss / totalMem) * 100;
    const memoryAvailable = freeMem;
    
    // Simplified CPU usage calculation
    const cpuUsagePercent = (cpuUsage.user + cpuUsage.system) / 1000000;
    
    return {
      cpu: {
        usage: cpuUsagePercent,
        status: cpuUsagePercent > 80 ? 'CRITICAL' : cpuUsagePercent > 60 ? 'WARNING' : 'HEALTHY'
      },
      memory: {
        usage: memoryUsagePercent,
        available: memoryAvailable,
        status: memoryUsagePercent > 90 ? 'CRITICAL' : memoryUsagePercent > 75 ? 'WARNING' : 'HEALTHY'
      },
      disk: {
        usage: 0, // Would be calculated from actual disk usage
        available: 0,
        status: 'HEALTHY'
      },
      network: {
        latency: 0, // Would be measured from actual network tests
        status: 'HEALTHY'
      }
    };
  }

  private async getDependencyHealth(): Promise<DependencyHealth[]> {
    const dependencies: DependencyHealth[] = [];
    
    // Add health status for each configured dependency
    for (const check of this.config.checks) {
      if (check.type === 'DATABASE' || check.type === 'EXTERNAL_API' || 
          check.type === 'CACHE' || check.type === 'QUEUE') {
        
        const result = this.checkResults.get(check.name);
        
        dependencies.push({
          name: check.name,
          type: check.type,
          status: result?.status === 'PASS' ? 'HEALTHY' : 
                  result?.status === 'WARN' ? 'DEGRADED' : 'UNHEALTHY',
          responseTime: result?.responseTime || 0,
          lastCheck: result?.lastCheck || new Date(),
          endpoint: check.config?.url
        });
      }
    }
    
    return dependencies;
  }

  public async shutdown(): Promise<void> {
    console.log('Shutting down Health Check Service...');
    this.isShuttingDown = true;
    
    // Clear all check timers
    for (const timer of this.checkTimers.values()) {
      clearInterval(timer);
    }
    this.checkTimers.clear();
    
    // Close HTTP server
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          console.log('Health check server closed');
          resolve();
        });
        
        // Force close after timeout
        setTimeout(() => {
          console.log('Force closing health check server');
          resolve();
        }, this.config.gracefulShutdownTimeout);
      });
    }
    
    this.emit('shutdown');
  }
}

// Default health check endpoints
export const createDefaultHealthEndpoints = (healthService: HealthCheckService): HealthEndpoint[] => [
  {
    path: '/health',
    method: 'GET',
    handler: async (req, res) => {
      const status = await healthService.getHealthStatus();
      const statusCode = status.status === 'HEALTHY' ? 200 : 
                        status.status === 'DEGRADED' ? 200 : 503;
      
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(status, null, 2));
    }
  },
  {
    path: '/health/live',
    method: 'GET',
    handler: async (req, res) => {
      // Liveness probe - just check if the service is running
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'alive', timestamp: new Date() }));
    }
  },
  {
    path: '/health/ready',
    method: 'GET',
    handler: async (req, res) => {
      // Readiness probe - check if service is ready to handle requests
      const status = await healthService.getHealthStatus();
      const isReady = status.status !== 'UNHEALTHY';
      const statusCode = isReady ? 200 : 503;
      
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: isReady ? 'ready' : 'not_ready',
        timestamp: new Date(),
        checks: status.checks.filter(c => c.status === 'FAIL')
      }));
    }
  }
];