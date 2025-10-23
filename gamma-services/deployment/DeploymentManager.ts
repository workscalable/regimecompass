import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

export interface DeploymentConfig {
  strategy: 'ROLLING_UPDATE' | 'BLUE_GREEN' | 'CANARY';
  healthCheckUrl: string;
  healthCheckTimeout: number;
  healthCheckRetries: number;
  gracefulShutdownTimeout: number;
  rollbackOnFailure: boolean;
  preDeploymentChecks: PreDeploymentCheck[];
  postDeploymentChecks: PostDeploymentCheck[];
  notifications: NotificationConfig[];
  backup: BackupConfig;
}

export interface PreDeploymentCheck {
  name: string;
  type: 'HEALTH_CHECK' | 'DATABASE_MIGRATION' | 'DEPENDENCY_CHECK' | 'CUSTOM';
  config: any;
  required: boolean;
  timeout: number;
}

export interface PostDeploymentCheck {
  name: string;
  type: 'SMOKE_TEST' | 'INTEGRATION_TEST' | 'PERFORMANCE_TEST' | 'CUSTOM';
  config: any;
  required: boolean;
  timeout: number;
  retries: number;
}

export interface NotificationConfig {
  type: 'SLACK' | 'EMAIL' | 'WEBHOOK' | 'CUSTOM';
  config: any;
  events: DeploymentEvent[];
}

export interface BackupConfig {
  enabled: boolean;
  retentionCount: number;
  backupPath: string;
  includeDatabase: boolean;
  includeFiles: string[];
}

export type DeploymentEvent = 'STARTED' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK' | 'HEALTH_CHECK_FAILED';

export interface DeploymentStatus {
  id: string;
  strategy: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'ROLLING_BACK' | 'ROLLED_BACK';
  startTime: Date;
  endTime?: Date;
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  version: {
    from: string;
    to: string;
  };
  instances: DeploymentInstance[];
  checks: CheckResult[];
  logs: DeploymentLog[];
  rollbackAvailable: boolean;
}

export interface DeploymentInstance {
  id: string;
  status: 'PENDING' | 'UPDATING' | 'HEALTHY' | 'UNHEALTHY' | 'TERMINATED';
  version: string;
  healthChecksPassed: number;
  healthChecksFailed: number;
  lastHealthCheck: Date;
  startTime: Date;
  endTime?: Date;
}

export interface CheckResult {
  name: string;
  type: string;
  status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  message?: string;
  details?: any;
}

export interface DeploymentLog {
  timestamp: Date;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  details?: any;
}

export class DeploymentManager extends EventEmitter {
  private config: DeploymentConfig;
  private currentDeployment?: DeploymentStatus;
  private deploymentHistory: DeploymentStatus[] = [];
  private runningProcesses: Map<string, ChildProcess> = new Map();

  constructor(config: DeploymentConfig) {
    super();
    this.config = config;
  }

  public async startDeployment(
    fromVersion: string,
    toVersion: string,
    deploymentPath: string
  ): Promise<string> {
    if (this.currentDeployment && this.currentDeployment.status === 'IN_PROGRESS') {
      throw new Error('Deployment already in progress');
    }

    const deploymentId = this.generateDeploymentId();
    
    this.currentDeployment = {
      id: deploymentId,
      strategy: this.config.strategy,
      status: 'PENDING',
      startTime: new Date(),
      currentStep: 'Initializing',
      totalSteps: this.calculateTotalSteps(),
      completedSteps: 0,
      version: { from: fromVersion, to: toVersion },
      instances: [],
      checks: [],
      logs: [],
      rollbackAvailable: false
    };

    this.log('INFO', `Starting ${this.config.strategy} deployment from ${fromVersion} to ${toVersion}`);
    this.emit('deploymentStarted', this.currentDeployment);
    this.sendNotification('STARTED', this.currentDeployment);

    try {
      await this.executeDeployment(deploymentPath);
    } catch (error) {
      await this.handleDeploymentFailure(error as Error);
    }

    return deploymentId;
  }

  public async rollbackDeployment(deploymentId?: string): Promise<void> {
    const deployment = deploymentId 
      ? this.deploymentHistory.find(d => d.id === deploymentId)
      : this.currentDeployment;

    if (!deployment) {
      throw new Error('Deployment not found');
    }

    if (!deployment.rollbackAvailable) {
      throw new Error('Rollback not available for this deployment');
    }

    this.log('WARN', `Starting rollback for deployment ${deployment.id}`);
    deployment.status = 'ROLLING_BACK';
    deployment.currentStep = 'Rolling back';

    try {
      await this.executeRollback(deployment);
      
      deployment.status = 'ROLLED_BACK';
      deployment.endTime = new Date();
      deployment.currentStep = 'Rollback completed';
      
      this.log('INFO', `Rollback completed for deployment ${deployment.id}`);
      this.emit('deploymentRolledBack', deployment);
      this.sendNotification('ROLLED_BACK', deployment);
      
    } catch (error) {
      this.log('ERROR', `Rollback failed: ${(error as Error).message}`);
      deployment.status = 'FAILED';
      throw error;
    }
  }

  public getDeploymentStatus(deploymentId?: string): DeploymentStatus | null {
    if (deploymentId) {
      return this.deploymentHistory.find(d => d.id === deploymentId) || null;
    }
    return this.currentDeployment || null;
  }

  public getDeploymentHistory(limit: number = 10): DeploymentStatus[] {
    return this.deploymentHistory.slice(-limit);
  }

  public async validateDeployment(deploymentPath: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      checks: []
    };

    try {
      // Check if deployment path exists
      await fs.access(deploymentPath);
      result.checks.push({ name: 'Deployment path exists', passed: true });
    } catch {
      result.valid = false;
      result.errors.push('Deployment path does not exist');
      result.checks.push({ name: 'Deployment path exists', passed: false });
    }

    // Validate package.json
    try {
      const packagePath = path.join(deploymentPath, 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf-8');
      const packageJson = JSON.parse(packageContent);
      
      if (!packageJson.version) {
        result.warnings.push('Package.json missing version field');
      }
      
      result.checks.push({ name: 'Package.json valid', passed: true });
    } catch {
      result.valid = false;
      result.errors.push('Invalid or missing package.json');
      result.checks.push({ name: 'Package.json valid', passed: false });
    }

    // Run pre-deployment checks
    for (const check of this.config.preDeploymentChecks) {
      const checkResult = await this.runPreDeploymentCheck(check);
      result.checks.push({
        name: check.name,
        passed: checkResult.status === 'PASSED'
      });
      
      if (checkResult.status === 'FAILED' && check.required) {
        result.valid = false;
        result.errors.push(`Required pre-deployment check failed: ${check.name}`);
      }
    }

    return result;
  }

  private async executeDeployment(deploymentPath: string): Promise<void> {
    if (!this.currentDeployment) return;

    this.currentDeployment.status = 'IN_PROGRESS';
    
    try {
      // Step 1: Validate deployment
      await this.updateStep('Validating deployment');
      const validation = await this.validateDeployment(deploymentPath);
      if (!validation.valid) {
        throw new Error(`Deployment validation failed: ${validation.errors.join(', ')}`);
      }

      // Step 2: Create backup
      if (this.config.backup.enabled) {
        await this.updateStep('Creating backup');
        await this.createBackup();
      }

      // Step 3: Run pre-deployment checks
      await this.updateStep('Running pre-deployment checks');
      await this.runPreDeploymentChecks();

      // Step 4: Execute deployment strategy
      switch (this.config.strategy) {
        case 'ROLLING_UPDATE':
          await this.executeRollingUpdate(deploymentPath);
          break;
        case 'BLUE_GREEN':
          await this.executeBlueGreenDeployment(deploymentPath);
          break;
        case 'CANARY':
          await this.executeCanaryDeployment(deploymentPath);
          break;
      }

      // Step 5: Run post-deployment checks
      await this.updateStep('Running post-deployment checks');
      await this.runPostDeploymentChecks();

      // Step 6: Complete deployment
      await this.completeDeployment();

    } catch (error) {
      throw error;
    }
  }

  private async executeRollingUpdate(deploymentPath: string): Promise<void> {
    if (!this.currentDeployment) return;

    await this.updateStep('Starting rolling update');
    
    // Get current instances
    const currentInstances = await this.getCurrentInstances();
    this.currentDeployment.instances = currentInstances.map(instance => ({
      id: instance.id,
      status: 'PENDING',
      version: this.currentDeployment!.version.from,
      healthChecksPassed: 0,
      healthChecksFailed: 0,
      lastHealthCheck: new Date(),
      startTime: new Date()
    }));

    // Update instances one by one
    for (let i = 0; i < currentInstances.length; i++) {
      const instance = this.currentDeployment.instances[i];
      
      await this.updateStep(`Updating instance ${i + 1}/${currentInstances.length}`);
      
      try {
        // Update instance
        instance.status = 'UPDATING';
        await this.updateInstance(instance.id, deploymentPath);
        
        // Wait for instance to be healthy
        await this.waitForInstanceHealth(instance);
        
        instance.status = 'HEALTHY';
        instance.version = this.currentDeployment.version.to;
        instance.endTime = new Date();
        
        this.log('INFO', `Instance ${instance.id} updated successfully`);
        
      } catch (error) {
        instance.status = 'UNHEALTHY';
        this.log('ERROR', `Failed to update instance ${instance.id}: ${(error as Error).message}`);
        throw error;
      }
    }

    this.log('INFO', 'Rolling update completed successfully');
  }

  private async executeBlueGreenDeployment(deploymentPath: string): Promise<void> {
    if (!this.currentDeployment) return;

    await this.updateStep('Starting blue-green deployment');
    
    // Create green environment
    await this.updateStep('Creating green environment');
    const greenInstances = await this.createGreenEnvironment(deploymentPath);
    
    this.currentDeployment.instances = greenInstances.map(instance => ({
      id: instance.id,
      status: 'UPDATING',
      version: this.currentDeployment!.version.to,
      healthChecksPassed: 0,
      healthChecksFailed: 0,
      lastHealthCheck: new Date(),
      startTime: new Date()
    }));

    // Wait for green environment to be healthy
    await this.updateStep('Validating green environment');
    for (const instance of this.currentDeployment.instances) {
      await this.waitForInstanceHealth(instance);
      instance.status = 'HEALTHY';
    }

    // Switch traffic to green
    await this.updateStep('Switching traffic to green environment');
    await this.switchTrafficToGreen();

    // Terminate blue environment
    await this.updateStep('Terminating blue environment');
    await this.terminateBlueEnvironment();

    this.log('INFO', 'Blue-green deployment completed successfully');
  }

  private async executeCanaryDeployment(deploymentPath: string): Promise<void> {
    if (!this.currentDeployment) return;

    await this.updateStep('Starting canary deployment');
    
    // Deploy canary instances (10% of traffic)
    await this.updateStep('Deploying canary instances');
    const canaryInstances = await this.createCanaryInstances(deploymentPath, 0.1);
    
    // Monitor canary performance
    await this.updateStep('Monitoring canary performance');
    const canaryHealthy = await this.monitorCanaryHealth(canaryInstances);
    
    if (!canaryHealthy) {
      throw new Error('Canary deployment failed health checks');
    }

    // Gradually increase traffic to canary
    await this.updateStep('Gradually increasing canary traffic');
    await this.graduallyIncreaseCanaryTraffic();

    // Complete canary deployment
    await this.updateStep('Completing canary deployment');
    await this.completeCanaryDeployment();

    this.log('INFO', 'Canary deployment completed successfully');
  }

  private async runPreDeploymentChecks(): Promise<void> {
    if (!this.currentDeployment) return;

    for (const check of this.config.preDeploymentChecks) {
      const result = await this.runPreDeploymentCheck(check);
      this.currentDeployment.checks.push(result);
      
      if (result.status === 'FAILED' && check.required) {
        throw new Error(`Required pre-deployment check failed: ${check.name}`);
      }
    }
  }

  private async runPreDeploymentCheck(check: PreDeploymentCheck): Promise<CheckResult> {
    const result: CheckResult = {
      name: check.name,
      type: check.type,
      status: 'RUNNING',
      startTime: new Date()
    };

    try {
      switch (check.type) {
        case 'HEALTH_CHECK':
          await this.performHealthCheck(check.config.url);
          break;
        case 'DATABASE_MIGRATION':
          await this.checkDatabaseMigrations(check.config);
          break;
        case 'DEPENDENCY_CHECK':
          await this.checkDependencies(check.config);
          break;
        case 'CUSTOM':
          await this.runCustomCheck(check.config);
          break;
      }
      
      result.status = 'PASSED';
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime.getTime();
      
    } catch (error) {
      result.status = 'FAILED';
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime.getTime();
      result.message = (error as Error).message;
    }

    return result;
  }

  private async runPostDeploymentChecks(): Promise<void> {
    if (!this.currentDeployment) return;

    for (const check of this.config.postDeploymentChecks) {
      const result = await this.runPostDeploymentCheck(check);
      this.currentDeployment.checks.push(result);
      
      if (result.status === 'FAILED' && check.required) {
        throw new Error(`Required post-deployment check failed: ${check.name}`);
      }
    }
  }

  private async runPostDeploymentCheck(check: PostDeploymentCheck): Promise<CheckResult> {
    const result: CheckResult = {
      name: check.name,
      type: check.type,
      status: 'RUNNING',
      startTime: new Date()
    };

    let attempts = 0;
    const maxAttempts = check.retries + 1;

    while (attempts < maxAttempts) {
      try {
        switch (check.type) {
          case 'SMOKE_TEST':
            await this.runSmokeTests(check.config);
            break;
          case 'INTEGRATION_TEST':
            await this.runIntegrationTests(check.config);
            break;
          case 'PERFORMANCE_TEST':
            await this.runPerformanceTests(check.config);
            break;
          case 'CUSTOM':
            await this.runCustomCheck(check.config);
            break;
        }
        
        result.status = 'PASSED';
        break;
        
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          result.status = 'FAILED';
          result.message = (error as Error).message;
        } else {
          await this.sleep(2000); // Wait 2 seconds before retry
        }
      }
    }

    result.endTime = new Date();
    result.duration = result.endTime.getTime() - result.startTime.getTime();
    
    return result;
  }

  private async createBackup(): Promise<void> {
    if (!this.config.backup.enabled) return;

    const backupId = `backup-${Date.now()}`;
    const backupPath = path.join(this.config.backup.backupPath, backupId);

    try {
      await fs.mkdir(backupPath, { recursive: true });

      // Backup files
      for (const filePath of this.config.backup.includeFiles) {
        await this.copyFile(filePath, path.join(backupPath, path.basename(filePath)));
      }

      // Backup database if enabled
      if (this.config.backup.includeDatabase) {
        await this.backupDatabase(path.join(backupPath, 'database.sql'));
      }

      // Clean up old backups
      await this.cleanupOldBackups();

      this.log('INFO', `Backup created: ${backupId}`);
      
    } catch (error) {
      this.log('ERROR', `Backup failed: ${(error as Error).message}`);
      throw error;
    }
  }

  private async completeDeployment(): Promise<void> {
    if (!this.currentDeployment) return;

    this.currentDeployment.status = 'COMPLETED';
    this.currentDeployment.endTime = new Date();
    this.currentDeployment.currentStep = 'Deployment completed';
    this.currentDeployment.completedSteps = this.currentDeployment.totalSteps;
    this.currentDeployment.rollbackAvailable = true;

    // Add to history
    this.deploymentHistory.push({ ...this.currentDeployment });
    
    // Keep only recent deployments in history
    if (this.deploymentHistory.length > 50) {
      this.deploymentHistory = this.deploymentHistory.slice(-50);
    }

    this.log('INFO', `Deployment ${this.currentDeployment.id} completed successfully`);
    this.emit('deploymentCompleted', this.currentDeployment);
    this.sendNotification('COMPLETED', this.currentDeployment);

    this.currentDeployment = undefined;
  }

  private async handleDeploymentFailure(error: Error): Promise<void> {
    if (!this.currentDeployment) return;

    this.log('ERROR', `Deployment failed: ${error.message}`);
    
    this.currentDeployment.status = 'FAILED';
    this.currentDeployment.endTime = new Date();
    this.currentDeployment.currentStep = `Failed: ${error.message}`;

    this.emit('deploymentFailed', { deployment: this.currentDeployment, error });
    this.sendNotification('FAILED', this.currentDeployment);

    // Auto-rollback if enabled
    if (this.config.rollbackOnFailure && this.currentDeployment.rollbackAvailable) {
      this.log('INFO', 'Auto-rollback enabled, starting rollback...');
      try {
        await this.rollbackDeployment(this.currentDeployment.id);
      } catch (rollbackError) {
        this.log('ERROR', `Auto-rollback failed: ${(rollbackError as Error).message}`);
      }
    }

    // Add to history
    this.deploymentHistory.push({ ...this.currentDeployment });
    this.currentDeployment = undefined;
  }

  // Helper methods (implementation stubs - would be implemented based on infrastructure)
  private async getCurrentInstances(): Promise<{ id: string }[]> {
    // Implementation would depend on your infrastructure (Docker, Kubernetes, etc.)
    return [{ id: 'instance-1' }, { id: 'instance-2' }];
  }

  private async updateInstance(instanceId: string, deploymentPath: string): Promise<void> {
    // Implementation would update the specific instance
    await this.sleep(5000); // Simulate deployment time
  }

  private async waitForInstanceHealth(instance: DeploymentInstance): Promise<void> {
    let attempts = 0;
    const maxAttempts = this.config.healthCheckRetries;

    while (attempts < maxAttempts) {
      try {
        await this.performHealthCheck(this.config.healthCheckUrl);
        instance.healthChecksPassed++;
        instance.lastHealthCheck = new Date();
        return;
      } catch {
        instance.healthChecksFailed++;
        attempts++;
        if (attempts < maxAttempts) {
          await this.sleep(2000);
        }
      }
    }

    throw new Error(`Instance ${instance.id} failed health checks`);
  }

  private async performHealthCheck(url: string): Promise<void> {
    // Implementation would perform actual health check
    await this.sleep(1000);
  }

  private async createGreenEnvironment(deploymentPath: string): Promise<{ id: string }[]> {
    // Implementation would create green environment
    return [{ id: 'green-1' }, { id: 'green-2' }];
  }

  private async switchTrafficToGreen(): Promise<void> {
    // Implementation would switch load balancer to green environment
    await this.sleep(2000);
  }

  private async terminateBlueEnvironment(): Promise<void> {
    // Implementation would terminate blue environment
    await this.sleep(1000);
  }

  private async createCanaryInstances(deploymentPath: string, trafficPercent: number): Promise<{ id: string }[]> {
    // Implementation would create canary instances
    return [{ id: 'canary-1' }];
  }

  private async monitorCanaryHealth(instances: { id: string }[]): Promise<boolean> {
    // Implementation would monitor canary health
    await this.sleep(30000); // Monitor for 30 seconds
    return true;
  }

  private async graduallyIncreaseCanaryTraffic(): Promise<void> {
    // Implementation would gradually increase traffic
    const steps = [0.25, 0.5, 0.75, 1.0];
    for (const step of steps) {
      await this.sleep(10000); // Wait 10 seconds between steps
      this.log('INFO', `Increased canary traffic to ${step * 100}%`);
    }
  }

  private async completeCanaryDeployment(): Promise<void> {
    // Implementation would complete canary deployment
    await this.sleep(2000);
  }

  private async executeRollback(deployment: DeploymentStatus): Promise<void> {
    // Implementation would rollback to previous version
    await this.sleep(10000);
  }

  private async checkDatabaseMigrations(config: any): Promise<void> {
    // Implementation would check database migrations
    await this.sleep(1000);
  }

  private async checkDependencies(config: any): Promise<void> {
    // Implementation would check dependencies
    await this.sleep(1000);
  }

  private async runCustomCheck(config: any): Promise<void> {
    // Implementation would run custom check
    if (config.command) {
      await this.executeCommand(config.command);
    }
  }

  private async runSmokeTests(config: any): Promise<void> {
    // Implementation would run smoke tests
    await this.sleep(5000);
  }

  private async runIntegrationTests(config: any): Promise<void> {
    // Implementation would run integration tests
    await this.sleep(10000);
  }

  private async runPerformanceTests(config: any): Promise<void> {
    // Implementation would run performance tests
    await this.sleep(15000);
  }

  private async backupDatabase(backupPath: string): Promise<void> {
    // Implementation would backup database
    await this.sleep(5000);
  }

  private async cleanupOldBackups(): Promise<void> {
    // Implementation would cleanup old backups
    const backupDir = this.config.backup.backupPath;
    const entries = await fs.readdir(backupDir);
    
    if (entries.length > this.config.backup.retentionCount) {
      const toDelete = entries.slice(0, entries.length - this.config.backup.retentionCount);
      for (const entry of toDelete) {
        await fs.rm(path.join(backupDir, entry), { recursive: true });
      }
    }
  }

  private async copyFile(source: string, destination: string): Promise<void> {
    await fs.copyFile(source, destination);
  }

  private async executeCommand(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn('sh', ['-c', command]);
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });
      
      process.on('error', reject);
    });
  }

  private generateDeploymentId(): string {
    return `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateTotalSteps(): number {
    let steps = 3; // Validate, pre-checks, deploy
    
    if (this.config.backup.enabled) steps++;
    if (this.config.postDeploymentChecks.length > 0) steps++;
    
    return steps;
  }

  private async updateStep(step: string): Promise<void> {
    if (!this.currentDeployment) return;
    
    this.currentDeployment.currentStep = step;
    this.currentDeployment.completedSteps++;
    
    this.log('INFO', step);
    this.emit('deploymentStepCompleted', {
      deployment: this.currentDeployment,
      step,
      progress: this.currentDeployment.completedSteps / this.currentDeployment.totalSteps
    });
  }

  private log(level: DeploymentLog['level'], message: string, details?: any): void {
    const logEntry: DeploymentLog = {
      timestamp: new Date(),
      level,
      message,
      details
    };

    if (this.currentDeployment) {
      this.currentDeployment.logs.push(logEntry);
    }

    console.log(`[${level}] ${message}`, details || '');
  }

  private async sendNotification(event: DeploymentEvent, deployment: DeploymentStatus): Promise<void> {
    for (const notification of this.config.notifications) {
      if (notification.events.includes(event)) {
        try {
          await this.sendNotificationToChannel(notification, event, deployment);
        } catch (error) {
          this.log('WARN', `Failed to send notification: ${(error as Error).message}`);
        }
      }
    }
  }

  private async sendNotificationToChannel(
    notification: NotificationConfig,
    event: DeploymentEvent,
    deployment: DeploymentStatus
  ): Promise<void> {
    // Implementation would send notifications to configured channels
    this.log('INFO', `Sending ${event} notification via ${notification.type}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checks: { name: string; passed: boolean }[];
}