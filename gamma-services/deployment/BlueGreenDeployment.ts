import { EventEmitter } from 'events';
import * as http from 'http';
import { spawn, ChildProcess } from 'child_process';

export interface BlueGreenConfig {
  bluePort: number;
  greenPort: number;
  proxyPort: number;
  healthCheckPath: string;
  healthCheckTimeout: number;
  healthCheckRetries: number;
  trafficSwitchDelay: number;
  rollbackTimeout: number;
  environmentVariables: Record<string, string>;
  startupCommand: string;
  shutdownCommand?: string;
}

export interface Environment {
  name: 'blue' | 'green';
  port: number;
  status: 'STOPPED' | 'STARTING' | 'HEALTHY' | 'UNHEALTHY' | 'STOPPING';
  process?: ChildProcess;
  version?: string;
  startTime?: Date;
  healthChecks: {
    passed: number;
    failed: number;
    lastCheck: Date;
  };
}

export interface BlueGreenStatus {
  activeEnvironment: 'blue' | 'green' | null;
  blue: Environment;
  green: Environment;
  proxy: {
    status: 'STOPPED' | 'RUNNING';
    targetEnvironment: 'blue' | 'green' | null;
    port: number;
  };
  deployment: {
    inProgress: boolean;
    phase: string;
    startTime?: Date;
    targetVersion?: string;
  };
}

export class BlueGreenDeployment extends EventEmitter {
  private config: BlueGreenConfig;
  private status: BlueGreenStatus;
  private proxyServer?: http.Server;
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: BlueGreenConfig) {
    super();
    this.config = config;
    
    this.status = {
      activeEnvironment: null,
      blue: this.createEnvironment('blue', config.bluePort),
      green: this.createEnvironment('green', config.greenPort),
      proxy: {
        status: 'STOPPED',
        targetEnvironment: null,
        port: config.proxyPort
      },
      deployment: {
        inProgress: false,
        phase: 'idle'
      }
    };
  }

  public async initialize(): Promise<void> {
    console.log('🔄 Initializing Blue-Green Deployment...');
    
    // Start proxy server
    await this.startProxyServer();
    
    // Start blue environment initially
    await this.startEnvironment('blue');
    await this.waitForEnvironmentHealth('blue');
    
    // Switch traffic to blue
    this.switchTraffic('blue');
    
    console.log('✅ Blue-Green Deployment initialized');
    this.emit('initialized', this.status);
  }

  public async deploy(version: string, deploymentPath: string): Promise<void> {
    if (this.status.deployment.inProgress) {
      throw new Error('Deployment already in progress');
    }

    console.log(`🚀 Starting Blue-Green deployment to version ${version}`);
    
    this.status.deployment.inProgress = true;
    this.status.deployment.startTime = new Date();
    this.status.deployment.targetVersion = version;
    
    try {
      const targetEnvironment = this.getInactiveEnvironment();
      const sourceEnvironment = this.getActiveEnvironment();
      
      if (!sourceEnvironment) {
        throw new Error('No active environment found');
      }

      // Phase 1: Deploy to inactive environment
      this.status.deployment.phase = `Deploying to ${targetEnvironment}`;
      console.log(`📦 Deploying to ${targetEnvironment} environment`);
      
      await this.deployToEnvironment(targetEnvironment, version, deploymentPath);
      
      // Phase 2: Start target environment
      this.status.deployment.phase = `Starting ${targetEnvironment} environment`;
      console.log(`🔄 Starting ${targetEnvironment} environment`);
      
      await this.startEnvironment(targetEnvironment);
      
      // Phase 3: Health check target environment
      this.status.deployment.phase = `Health checking ${targetEnvironment}`;
      console.log(`🏥 Health checking ${targetEnvironment} environment`);
      
      await this.waitForEnvironmentHealth(targetEnvironment);
      
      // Phase 4: Switch traffic
      this.status.deployment.phase = 'Switching traffic';
      console.log(`🔀 Switching traffic to ${targetEnvironment}`);
      
      await this.switchTrafficGradually(targetEnvironment);
      
      // Phase 5: Stop old environment
      this.status.deployment.phase = `Stopping ${sourceEnvironment}`;
      console.log(`🛑 Stopping ${sourceEnvironment} environment`);
      
      await this.stopEnvironment(sourceEnvironment);
      
      // Phase 6: Complete deployment
      this.status.deployment.phase = 'Completed';
      this.status.deployment.inProgress = false;
      
      console.log(`✅ Blue-Green deployment completed successfully`);
      this.emit('deploymentCompleted', {
        version,
        activeEnvironment: targetEnvironment,
        previousEnvironment: sourceEnvironment
      });
      
    } catch (error) {
      console.error(`❌ Blue-Green deployment failed:`, error);
      this.status.deployment.phase = 'Failed';
      this.status.deployment.inProgress = false;
      
      this.emit('deploymentFailed', { error, version });
      throw error;
    }
  }

  public async rollback(): Promise<void> {
    if (this.status.deployment.inProgress) {
      throw new Error('Cannot rollback during active deployment');
    }

    const currentActive = this.getActiveEnvironment();
    const rollbackTarget = this.getInactiveEnvironment();
    
    if (!currentActive || !rollbackTarget) {
      throw new Error('Cannot determine rollback target');
    }

    console.log(`🔄 Starting rollback from ${currentActive} to ${rollbackTarget}`);
    
    try {
      // Check if rollback target is available
      const rollbackEnv = this.status[rollbackTarget];
      if (rollbackEnv.status === 'STOPPED') {
        // Start the rollback environment
        await this.startEnvironment(rollbackTarget);
        await this.waitForEnvironmentHealth(rollbackTarget);
      }
      
      // Switch traffic back
      await this.switchTrafficGradually(rollbackTarget);
      
      // Stop current environment
      await this.stopEnvironment(currentActive);
      
      console.log(`✅ Rollback completed successfully`);
      this.emit('rollbackCompleted', {
        from: currentActive,
        to: rollbackTarget
      });
      
    } catch (error) {
      console.error(`❌ Rollback failed:`, error);
      this.emit('rollbackFailed', { error });
      throw error;
    }
  }

  public getStatus(): BlueGreenStatus {
    return { ...this.status };
  }

  public async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Blue-Green Deployment...');
    
    // Clear health check intervals
    for (const interval of this.healthCheckIntervals.values()) {
      clearInterval(interval);
    }
    this.healthCheckIntervals.clear();
    
    // Stop environments
    await Promise.all([
      this.stopEnvironment('blue'),
      this.stopEnvironment('green')
    ]);
    
    // Stop proxy server
    if (this.proxyServer) {
      await new Promise<void>((resolve) => {
        this.proxyServer!.close(() => {
          console.log('Proxy server stopped');
          resolve();
        });
      });
    }
    
    console.log('✅ Blue-Green Deployment shut down');
    this.emit('shutdown');
  }

  private createEnvironment(name: 'blue' | 'green', port: number): Environment {
    return {
      name,
      port,
      status: 'STOPPED',
      healthChecks: {
        passed: 0,
        failed: 0,
        lastCheck: new Date()
      }
    };
  }

  private async startProxyServer(): Promise<void> {
    this.proxyServer = http.createServer((req, res) => {
      this.handleProxyRequest(req, res);
    });

    return new Promise((resolve, reject) => {
      this.proxyServer!.listen(this.config.proxyPort, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          this.status.proxy.status = 'RUNNING';
          console.log(`🌐 Proxy server started on port ${this.config.proxyPort}`);
          resolve();
        }
      });
    });
  }

  private handleProxyRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const targetEnvironment = this.status.proxy.targetEnvironment;
    
    if (!targetEnvironment) {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.end('Service Unavailable - No active environment');
      return;
    }

    const targetPort = this.status[targetEnvironment].port;
    const targetUrl = `http://localhost:${targetPort}${req.url}`;

    // Create proxy request
    const proxyReq = http.request(targetUrl, {
      method: req.method,
      headers: req.headers
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (error) => {
      console.error(`Proxy request error:`, error);
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Bad Gateway');
    });

    req.pipe(proxyReq);
  }

  private async deployToEnvironment(
    environment: 'blue' | 'green',
    version: string,
    deploymentPath: string
  ): Promise<void> {
    const env = this.status[environment];
    env.version = version;
    
    // In a real implementation, this would:
    // 1. Copy deployment files to environment directory
    // 2. Install dependencies
    // 3. Run build processes
    // 4. Update configuration
    
    console.log(`📦 Deployed version ${version} to ${environment} environment`);
  }

  private async startEnvironment(environment: 'blue' | 'green'): Promise<void> {
    const env = this.status[environment];
    
    if (env.status !== 'STOPPED') {
      await this.stopEnvironment(environment);
    }

    env.status = 'STARTING';
    env.startTime = new Date();

    // Prepare environment variables
    const envVars = {
      ...process.env,
      ...this.config.environmentVariables,
      PORT: env.port.toString(),
      NODE_ENV: 'production',
      ENVIRONMENT: environment.toUpperCase()
    };

    // Start the application process
    env.process = spawn('sh', ['-c', this.config.startupCommand], {
      env: envVars,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Handle process events
    env.process.on('exit', (code) => {
      console.log(`${environment} environment exited with code ${code}`);
      env.status = 'STOPPED';
      env.process = undefined;
      this.emit('environmentStopped', { environment, code });
    });

    env.process.on('error', (error) => {
      console.error(`${environment} environment error:`, error);
      env.status = 'UNHEALTHY';
      this.emit('environmentError', { environment, error });
    });

    // Capture logs
    if (env.process.stdout) {
      env.process.stdout.on('data', (data) => {
        console.log(`[${environment}] ${data.toString().trim()}`);
      });
    }

    if (env.process.stderr) {
      env.process.stderr.on('data', (data) => {
        console.error(`[${environment}] ${data.toString().trim()}`);
      });
    }

    // Start health checking
    this.startHealthChecking(environment);

    console.log(`🔄 Started ${environment} environment on port ${env.port}`);
  }

  private async stopEnvironment(environment: 'blue' | 'green'): Promise<void> {
    const env = this.status[environment];
    
    if (env.status === 'STOPPED') {
      return;
    }

    env.status = 'STOPPING';

    // Stop health checking
    const healthCheckInterval = this.healthCheckIntervals.get(environment);
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      this.healthCheckIntervals.delete(environment);
    }

    // Stop the process
    if (env.process) {
      // Try graceful shutdown first
      env.process.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (env.process && !env.process.killed) {
            console.log(`Force killing ${environment} environment`);
            env.process.kill('SIGKILL');
          }
          resolve();
        }, 10000); // 10 second timeout

        env.process!.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }

    env.status = 'STOPPED';
    env.process = undefined;
    
    console.log(`🛑 Stopped ${environment} environment`);
  }

  private startHealthChecking(environment: 'blue' | 'green'): void {
    const interval = setInterval(async () => {
      await this.performHealthCheck(environment);
    }, 5000); // Check every 5 seconds

    this.healthCheckIntervals.set(environment, interval);
  }

  private async performHealthCheck(environment: 'blue' | 'green'): Promise<boolean> {
    const env = this.status[environment];
    const url = `http://localhost:${env.port}${this.config.healthCheckPath}`;

    try {
      const response = await this.httpRequest(url, { timeout: this.config.healthCheckTimeout });
      
      if (response.statusCode === 200) {
        env.healthChecks.passed++;
        env.healthChecks.lastCheck = new Date();
        
        if (env.status === 'STARTING') {
          env.status = 'HEALTHY';
          this.emit('environmentHealthy', { environment });
        }
        
        return true;
      } else {
        throw new Error(`Health check returned status ${response.statusCode}`);
      }
      
    } catch (error) {
      env.healthChecks.failed++;
      env.healthChecks.lastCheck = new Date();
      
      if (env.status === 'HEALTHY') {
        env.status = 'UNHEALTHY';
        this.emit('environmentUnhealthy', { environment, error });
      }
      
      return false;
    }
  }

  private async waitForEnvironmentHealth(environment: 'blue' | 'green'): Promise<void> {
    const env = this.status[environment];
    const maxAttempts = this.config.healthCheckRetries;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const isHealthy = await this.performHealthCheck(environment);
      
      if (isHealthy) {
        console.log(`✅ ${environment} environment is healthy`);
        return;
      }

      attempts++;
      console.log(`⏳ Waiting for ${environment} environment health (${attempts}/${maxAttempts})`);
      
      if (attempts < maxAttempts) {
        await this.sleep(2000);
      }
    }

    throw new Error(`${environment} environment failed health checks after ${maxAttempts} attempts`);
  }

  private switchTraffic(environment: 'blue' | 'green'): void {
    this.status.proxy.targetEnvironment = environment;
    this.status.activeEnvironment = environment;
    
    console.log(`🔀 Traffic switched to ${environment} environment`);
    this.emit('trafficSwitched', { environment });
  }

  private async switchTrafficGradually(environment: 'blue' | 'green'): Promise<void> {
    // In a more sophisticated implementation, this would gradually shift traffic
    // For now, we'll just add a delay and then switch
    
    console.log(`⏳ Preparing to switch traffic to ${environment}...`);
    await this.sleep(this.config.trafficSwitchDelay);
    
    this.switchTraffic(environment);
  }

  private getActiveEnvironment(): 'blue' | 'green' | null {
    return this.status.activeEnvironment;
  }

  private getInactiveEnvironment(): 'blue' | 'green' {
    return this.status.activeEnvironment === 'blue' ? 'green' : 'blue';
  }

  private async httpRequest(url: string, options: { timeout: number }): Promise<{ statusCode: number }> {
    return new Promise((resolve, reject) => {
      const req = http.get(url, { timeout: options.timeout }, (res) => {
        resolve({ statusCode: res.statusCode || 0 });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Default configuration
export const createDefaultBlueGreenConfig = (): BlueGreenConfig => ({
  bluePort: 3000,
  greenPort: 3001,
  proxyPort: 8000,
  healthCheckPath: '/health',
  healthCheckTimeout: 5000,
  healthCheckRetries: 10,
  trafficSwitchDelay: 2000,
  rollbackTimeout: 30000,
  environmentVariables: {},
  startupCommand: 'npm start'
});