import { EventEmitter } from 'events';
import * as http from 'http';
import * as https from 'https';

export interface ShutdownConfig {
  gracefulTimeout: number;
  forceTimeout: number;
  healthCheckGracePeriod: number;
  drainConnections: boolean;
  waitForActiveRequests: boolean;
  shutdownHooks: ShutdownHook[];
  signals: NodeJS.Signals[];
}

export interface ShutdownHook {
  name: string;
  priority: number;
  timeout: number;
  handler: () => Promise<void>;
  required: boolean;
}

export interface ShutdownStatus {
  initiated: boolean;
  startTime?: Date;
  phase: 'NOT_STARTED' | 'DRAINING' | 'STOPPING_SERVICES' | 'CLEANUP' | 'COMPLETED' | 'FORCED';
  completedHooks: string[];
  failedHooks: string[];
  activeConnections: number;
  activeRequests: number;
  timeRemaining: number;
}

export class GracefulShutdownManager extends EventEmitter {
  private config: ShutdownConfig;
  private shutdownStatus: ShutdownStatus;
  private servers: Set<http.Server | https.Server> = new Set();
  private activeConnections: Set<any> = new Set();
  private activeRequests: Set<any> = new Set();
  private shutdownTimer?: NodeJS.Timeout;
  private forceTimer?: NodeJS.Timeout;
  private isShuttingDown: boolean = false;

  constructor(config: ShutdownConfig) {
    super();
    this.config = config;
    this.shutdownStatus = {
      initiated: false,
      phase: 'NOT_STARTED',
      completedHooks: [],
      failedHooks: [],
      activeConnections: 0,
      activeRequests: 0,
      timeRemaining: 0
    };

    this.setupSignalHandlers();
  }

  public registerServer(server: http.Server | https.Server): void {
    this.servers.add(server);
    this.setupServerTracking(server);
  }

  public unregisterServer(server: http.Server | https.Server): void {
    this.servers.delete(server);
  }

  public addShutdownHook(hook: ShutdownHook): void {
    this.config.shutdownHooks.push(hook);
    // Sort hooks by priority (higher priority first)
    this.config.shutdownHooks.sort((a, b) => b.priority - a.priority);
  }

  public removeShutdownHook(name: string): void {
    this.config.shutdownHooks = this.config.shutdownHooks.filter(hook => hook.name !== name);
  }

  public async initiateShutdown(reason: string = 'Manual shutdown'): Promise<void> {
    if (this.isShuttingDown) {
      console.log('Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    this.shutdownStatus.initiated = true;
    this.shutdownStatus.startTime = new Date();
    this.shutdownStatus.timeRemaining = this.config.gracefulTimeout;

    console.log(`🛑 Initiating graceful shutdown: ${reason}`);
    this.emit('shutdownInitiated', { reason, status: this.shutdownStatus });

    // Start countdown timer
    this.startShutdownTimer();

    // Start force shutdown timer
    this.forceTimer = setTimeout(() => {
      this.forceShutdown();
    }, this.config.forceTimeout);

    try {
      await this.executeShutdownSequence();
    } catch (error) {
      console.error('Error during shutdown sequence:', error);
      this.forceShutdown();
    }
  }

  public getShutdownStatus(): ShutdownStatus {
    return { ...this.shutdownStatus };
  }

  public isShutdownInitiated(): boolean {
    return this.isShuttingDown;
  }

  private setupSignalHandlers(): void {
    for (const signal of this.config.signals) {
      process.on(signal, () => {
        this.initiateShutdown(`Received ${signal} signal`);
      });
    }

    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      this.initiateShutdown('Uncaught exception');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.initiateShutdown('Unhandled rejection');
    });
  }

  private setupServerTracking(server: http.Server | https.Server): void {
    // Track connections
    server.on('connection', (connection) => {
      this.activeConnections.add(connection);
      this.shutdownStatus.activeConnections = this.activeConnections.size;

      connection.on('close', () => {
        this.activeConnections.delete(connection);
        this.shutdownStatus.activeConnections = this.activeConnections.size;
      });
    });

    // Track requests
    server.on('request', (req, res) => {
      this.activeRequests.add(req);
      this.shutdownStatus.activeRequests = this.activeRequests.size;

      const cleanup = () => {
        this.activeRequests.delete(req);
        this.shutdownStatus.activeRequests = this.activeRequests.size;
      };

      res.on('finish', cleanup);
      res.on('close', cleanup);
      req.on('close', cleanup);
    });
  }

  private async executeShutdownSequence(): Promise<void> {
    try {
      // Phase 1: Stop accepting new connections
      await this.drainConnections();

      // Phase 2: Stop services in priority order
      await this.stopServices();

      // Phase 3: Cleanup resources
      await this.cleanup();

      // Phase 4: Complete shutdown
      this.completeShutdown();

    } catch (error) {
      console.error('Shutdown sequence failed:', error);
      throw error;
    }
  }

  private async drainConnections(): Promise<void> {
    this.shutdownStatus.phase = 'DRAINING';
    console.log('📤 Draining connections...');

    if (!this.config.drainConnections) {
      return;
    }

    // Stop accepting new connections
    for (const server of this.servers) {
      server.close();
    }

    // Wait for active requests to complete
    if (this.config.waitForActiveRequests) {
      const maxWaitTime = Math.min(this.config.gracefulTimeout * 0.6, 30000); // Max 30 seconds
      const startTime = Date.now();

      while (this.activeRequests.size > 0 && (Date.now() - startTime) < maxWaitTime) {
        console.log(`⏳ Waiting for ${this.activeRequests.size} active requests to complete...`);
        await this.sleep(1000);
      }

      if (this.activeRequests.size > 0) {
        console.log(`⚠️  ${this.activeRequests.size} requests still active, proceeding with shutdown`);
      }
    }

    // Close remaining connections
    for (const connection of this.activeConnections) {
      try {
        connection.destroy();
      } catch (error) {
        // Ignore errors when destroying connections
      }
    }

    console.log('✅ Connection draining completed');
    this.emit('connectionsDrained', this.shutdownStatus);
  }

  private async stopServices(): Promise<void> {
    this.shutdownStatus.phase = 'STOPPING_SERVICES';
    console.log('🔄 Stopping services...');

    // Execute shutdown hooks in priority order
    for (const hook of this.config.shutdownHooks) {
      try {
        console.log(`🔧 Executing shutdown hook: ${hook.name}`);
        
        const hookPromise = hook.handler();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Hook ${hook.name} timed out`)), hook.timeout);
        });

        await Promise.race([hookPromise, timeoutPromise]);
        
        this.shutdownStatus.completedHooks.push(hook.name);
        console.log(`✅ Shutdown hook completed: ${hook.name}`);

      } catch (error) {
        console.error(`❌ Shutdown hook failed: ${hook.name}`, error);
        this.shutdownStatus.failedHooks.push(hook.name);

        if (hook.required) {
          throw new Error(`Required shutdown hook failed: ${hook.name}`);
        }
      }
    }

    console.log('✅ Service shutdown completed');
    this.emit('servicesStopped', this.shutdownStatus);
  }

  private async cleanup(): Promise<void> {
    this.shutdownStatus.phase = 'CLEANUP';
    console.log('🧹 Performing cleanup...');

    // Clear timers
    if (this.shutdownTimer) {
      clearInterval(this.shutdownTimer);
    }

    if (this.forceTimer) {
      clearTimeout(this.forceTimer);
    }

    // Close any remaining resources
    this.servers.clear();
    this.activeConnections.clear();
    this.activeRequests.clear();

    console.log('✅ Cleanup completed');
    this.emit('cleanupCompleted', this.shutdownStatus);
  }

  private completeShutdown(): void {
    this.shutdownStatus.phase = 'COMPLETED';
    this.shutdownStatus.timeRemaining = 0;

    const duration = this.shutdownStatus.startTime 
      ? Date.now() - this.shutdownStatus.startTime.getTime()
      : 0;

    console.log(`✅ Graceful shutdown completed in ${duration}ms`);
    console.log(`📊 Shutdown summary:`);
    console.log(`   - Completed hooks: ${this.shutdownStatus.completedHooks.length}`);
    console.log(`   - Failed hooks: ${this.shutdownStatus.failedHooks.length}`);
    console.log(`   - Active connections closed: ${this.activeConnections.size}`);

    this.emit('shutdownCompleted', {
      status: this.shutdownStatus,
      duration
    });

    // Exit the process
    process.exit(0);
  }

  private forceShutdown(): void {
    this.shutdownStatus.phase = 'FORCED';
    console.log('⚠️  Force shutdown initiated - graceful timeout exceeded');

    // Clear any remaining timers
    if (this.shutdownTimer) {
      clearInterval(this.shutdownTimer);
    }

    // Force close all connections
    for (const connection of this.activeConnections) {
      try {
        connection.destroy();
      } catch (error) {
        // Ignore errors
      }
    }

    // Force close all servers
    for (const server of this.servers) {
      try {
        server.close();
      } catch (error) {
        // Ignore errors
      }
    }

    this.emit('shutdownForced', this.shutdownStatus);

    // Force exit
    process.exit(1);
  }

  private startShutdownTimer(): void {
    this.shutdownTimer = setInterval(() => {
      if (this.shutdownStatus.startTime) {
        const elapsed = Date.now() - this.shutdownStatus.startTime.getTime();
        this.shutdownStatus.timeRemaining = Math.max(0, this.config.gracefulTimeout - elapsed);

        this.emit('shutdownProgress', {
          status: this.shutdownStatus,
          elapsed,
          remaining: this.shutdownStatus.timeRemaining
        });

        if (this.shutdownStatus.timeRemaining <= 0) {
          clearInterval(this.shutdownTimer);
        }
      }
    }, 1000);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Default shutdown configuration
export const createDefaultShutdownConfig = (): ShutdownConfig => ({
  gracefulTimeout: 30000, // 30 seconds
  forceTimeout: 45000,    // 45 seconds
  healthCheckGracePeriod: 5000, // 5 seconds
  drainConnections: true,
  waitForActiveRequests: true,
  shutdownHooks: [],
  signals: ['SIGTERM', 'SIGINT', 'SIGUSR2']
});

// Predefined shutdown hooks for common services
export const createDatabaseShutdownHook = (
  closeDatabase: () => Promise<void>
): ShutdownHook => ({
  name: 'database',
  priority: 100,
  timeout: 10000,
  handler: closeDatabase,
  required: true
});

export const createCacheShutdownHook = (
  closeCache: () => Promise<void>
): ShutdownHook => ({
  name: 'cache',
  priority: 90,
  timeout: 5000,
  handler: closeCache,
  required: false
});

export const createQueueShutdownHook = (
  closeQueue: () => Promise<void>
): ShutdownHook => ({
  name: 'queue',
  priority: 80,
  timeout: 15000,
  handler: closeQueue,
  required: true
});

export const createMetricsShutdownHook = (
  flushMetrics: () => Promise<void>
): ShutdownHook => ({
  name: 'metrics',
  priority: 70,
  timeout: 5000,
  handler: flushMetrics,
  required: false
});

export const createLoggingShutdownHook = (
  flushLogs: () => Promise<void>
): ShutdownHook => ({
  name: 'logging',
  priority: 60,
  timeout: 3000,
  handler: flushLogs,
  required: false
});

// Health check integration for graceful shutdown
export class HealthCheckIntegration {
  private shutdownManager: GracefulShutdownManager;
  private healthCheckServer?: http.Server;
  private isHealthy: boolean = true;

  constructor(shutdownManager: GracefulShutdownManager) {
    this.shutdownManager = shutdownManager;
    this.setupHealthCheckIntegration();
  }

  public startHealthCheckServer(port: number): void {
    this.healthCheckServer = http.createServer((req, res) => {
      if (req.url === '/health') {
        this.handleHealthCheck(req, res);
      } else if (req.url === '/ready') {
        this.handleReadinessCheck(req, res);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    this.healthCheckServer.listen(port, () => {
      console.log(`Health check server listening on port ${port}`);
    });

    this.shutdownManager.registerServer(this.healthCheckServer);
  }

  private setupHealthCheckIntegration(): void {
    // Mark as unhealthy when shutdown is initiated
    this.shutdownManager.on('shutdownInitiated', () => {
      this.isHealthy = false;
      console.log('🏥 Health check marked as unhealthy due to shutdown');
    });

    // Add health check server shutdown hook
    this.shutdownManager.addShutdownHook({
      name: 'health-check-server',
      priority: 50,
      timeout: 5000,
      handler: async () => {
        if (this.healthCheckServer) {
          return new Promise<void>((resolve) => {
            this.healthCheckServer!.close(() => {
              console.log('Health check server closed');
              resolve();
            });
          });
        }
      },
      required: false
    });
  }

  private handleHealthCheck(req: http.IncomingMessage, res: http.ServerResponse): void {
    const status = this.isHealthy ? 200 : 503;
    const response = {
      status: this.isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      shutdown: this.shutdownManager.getShutdownStatus()
    };

    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response, null, 2));
  }

  private handleReadinessCheck(req: http.IncomingMessage, res: http.ServerResponse): void {
    const shutdownStatus = this.shutdownManager.getShutdownStatus();
    const isReady = this.isHealthy && !shutdownStatus.initiated;
    
    const status = isReady ? 200 : 503;
    const response = {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      shutdown: shutdownStatus
    };

    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response, null, 2));
  }
}