import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';

export interface RollingUpdateConfig {
  maxUnavailable: number | string; // Number or percentage (e.g., "25%")
  maxSurge: number | string;       // Number or percentage (e.g., "25%")
  healthCheckPath: string;
  healthCheckTimeout: number;
  healthCheckRetries: number;
  updateBatchSize: number;
  updateDelay: number;
  rollbackOnFailure: boolean;
  instanceStartupTimeout: number;
  gracefulShutdownTimeout: number;
}

export interface Instance {
  id: string;
  status: 'PENDING' | 'STARTING' | 'HEALTHY' | 'UNHEALTHY' | 'UPDATING' | 'TERMINATING' | 'TERMINATED';
  version: string;
  port: number;
  process?: ChildProcess;
  startTime?: Date;
  updateTime?: Date;
  healthChecks: {
    passed: number;
    failed: number;
    lastCheck: Date;
  };
}

export interface RollingUpdateStatus {
  inProgress: boolean;
  phase: 'IDLE' | 'STARTING' | 'UPDATING' | 'COMPLETING' | 'ROLLING_BACK' | 'COMPLETED' | 'FAILED';
  startTime?: Date;
  endTime?: Date;
  currentBatch: number;
  totalBatches: number;
  targetVersion: string;
  previousVersion: string;
  instances: Instance[];
  updatedInstances: number;
  healthyInstances: number;
  failedInstances: number;
  rollbackAvailable: boolean;
}

export class RollingUpdateManager extends EventEmitter {
  private config: RollingUpdateConfig;
  private status: RollingUpdateStatus;
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private basePort: number = 4000;

  constructor(config: RollingUpdateConfig) {
    super();
    this.config = config;
    
    this.status = {
      inProgress: false,
      phase: 'IDLE',
      currentBatch: 0,
      totalBatches: 0,
      targetVersion: '',
      previousVersion: '',
      instances: [],
      updatedInstances: 0,
      healthyInstances: 0,
      failedInstances: 0,
      rollbackAvailable: false
    };
  }

  public async initialize(instanceCount: number, initialVersion: string): Promise<void> {
    console.log(`🔄 Initializing Rolling Update Manager with ${instanceCount} instances`);
    
    // Create initial instances
    this.status.instances = [];
    for (let i = 0; i < instanceCount; i++) {
      const instance: Instance = {
        id: `instance-${i + 1}`,
        status: 'PENDING',
        version: initialVersion,
        port: this.basePort + i,
        healthChecks: {
          passed: 0,
          failed: 0,
          lastCheck: new Date()
        }
      };
      
      this.status.instances.push(instance);
    }

    // Start all instances
    await this.startAllInstances();
    
    // Wait for all instances to be healthy
    await this.waitForAllInstancesHealthy();
    
    this.status.previousVersion = initialVersion;
    this.status.healthyInstances = this.status.instances.length;
    
    console.log('✅ Rolling Update Manager initialized');
    this.emit('initialized', this.status);
  }

  public async performRollingUpdate(targetVersion: string, deploymentPath: string): Promise<void> {
    if (this.status.inProgress) {
      throw new Error('Rolling update already in progress');
    }

    console.log(`🚀 Starting rolling update to version ${targetVersion}`);
    
    this.status.inProgress = true;
    this.status.phase = 'STARTING';
    this.status.startTime = new Date();
    this.status.targetVersion = targetVersion;
    this.status.updatedInstances = 0;
    this.status.failedInstances = 0;
    
    try {
      // Calculate update batches
      const batches = this.calculateUpdateBatches();
      this.status.totalBatches = batches.length;
      
      console.log(`📊 Update plan: ${batches.length} batches`);
      batches.forEach((batch, index) => {
        console.log(`   Batch ${index + 1}: ${batch.map(i => i.id).join(', ')}`);
      });

      this.status.phase = 'UPDATING';
      
      // Process each batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        this.status.currentBatch = batchIndex + 1;
        const batch = batches[batchIndex];
        
        console.log(`🔄 Processing batch ${batchIndex + 1}/${batches.length}`);
        
        await this.processBatch(batch, targetVersion, deploymentPath);
        
        // Wait between batches
        if (batchIndex < batches.length - 1) {
          console.log(`⏳ Waiting ${this.config.updateDelay}ms before next batch`);
          await this.sleep(this.config.updateDelay);
        }
      }

      // Complete the update
      this.status.phase = 'COMPLETING';
      await this.completeUpdate();
      
    } catch (error) {
      console.error('❌ Rolling update failed:', error);
      await this.handleUpdateFailure(error as Error);
      throw error;
    }
  }

  public async rollback(): Promise<void> {
    if (!this.status.rollbackAvailable) {
      throw new Error('Rollback not available');
    }

    console.log(`🔄 Starting rollback to version ${this.status.previousVersion}`);
    
    this.status.phase = 'ROLLING_BACK';
    
    try {
      // Find instances that need to be rolled back
      const instancesToRollback = this.status.instances.filter(
        instance => instance.version === this.status.targetVersion
      );

      // Rollback in batches
      const batches = this.calculateRollbackBatches(instancesToRollback);
      
      for (const batch of batches) {
        await this.rollbackBatch(batch);
        await this.sleep(this.config.updateDelay);
      }

      this.status.phase = 'COMPLETED';
      this.status.endTime = new Date();
      
      console.log('✅ Rollback completed successfully');
      this.emit('rollbackCompleted', this.status);
      
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      this.status.phase = 'FAILED';
      throw error;
    }
  }

  public getStatus(): RollingUpdateStatus {
    return { ...this.status };
  }

  public async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Rolling Update Manager...');
    
    // Clear health check intervals
    for (const interval of this.healthCheckIntervals.values()) {
      clearInterval(interval);
    }
    this.healthCheckIntervals.clear();
    
    // Stop all instances
    await Promise.all(
      this.status.instances.map(instance => this.stopInstance(instance))
    );
    
    console.log('✅ Rolling Update Manager shut down');
    this.emit('shutdown');
  }

  private calculateUpdateBatches(): Instance[][] {
    const totalInstances = this.status.instances.length;
    const maxUnavailable = this.calculateAbsoluteValue(this.config.maxUnavailable, totalInstances);
    const maxSurge = this.calculateAbsoluteValue(this.config.maxSurge, totalInstances);
    
    // For rolling updates, we typically update in small batches
    const batchSize = Math.min(this.config.updateBatchSize, maxUnavailable);
    const batches: Instance[][] = [];
    
    for (let i = 0; i < totalInstances; i += batchSize) {
      const batch = this.status.instances.slice(i, i + batchSize);
      batches.push(batch);
    }
    
    return batches;
  }

  private calculateRollbackBatches(instances: Instance[]): Instance[][] {
    const batchSize = this.config.updateBatchSize;
    const batches: Instance[][] = [];
    
    for (let i = 0; i < instances.length; i += batchSize) {
      const batch = instances.slice(i, i + batchSize);
      batches.push(batch);
    }
    
    return batches;
  }

  private async processBatch(batch: Instance[], targetVersion: string, deploymentPath: string): Promise<void> {
    console.log(`📦 Updating batch: ${batch.map(i => i.id).join(', ')}`);
    
    // Update instances in parallel within the batch
    const updatePromises = batch.map(instance => 
      this.updateInstance(instance, targetVersion, deploymentPath)
    );
    
    const results = await Promise.allSettled(updatePromises);
    
    // Check results
    let successCount = 0;
    let failureCount = 0;
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++;
      } else {
        failureCount++;
        console.error(`Failed to update ${batch[index].id}:`, result.reason);
      }
    });
    
    console.log(`📊 Batch results: ${successCount} successful, ${failureCount} failed`);
    
    if (failureCount > 0 && this.config.rollbackOnFailure) {
      throw new Error(`Batch update failed: ${failureCount} instances failed`);
    }
  }

  private async updateInstance(instance: Instance, targetVersion: string, deploymentPath: string): Promise<void> {
    console.log(`🔄 Updating instance ${instance.id} to version ${targetVersion}`);
    
    instance.status = 'UPDATING';
    instance.updateTime = new Date();
    
    try {
      // Stop the current instance
      await this.stopInstance(instance);
      
      // Deploy new version (in real implementation, this would copy files, etc.)
      await this.deployToInstance(instance, targetVersion, deploymentPath);
      
      // Start the updated instance
      await this.startInstance(instance);
      
      // Wait for health checks
      await this.waitForInstanceHealth(instance);
      
      instance.version = targetVersion;
      instance.status = 'HEALTHY';
      this.status.updatedInstances++;
      
      console.log(`✅ Instance ${instance.id} updated successfully`);
      this.emit('instanceUpdated', { instance, version: targetVersion });
      
    } catch (error) {
      instance.status = 'UNHEALTHY';
      this.status.failedInstances++;
      
      console.error(`❌ Failed to update instance ${instance.id}:`, error);
      this.emit('instanceUpdateFailed', { instance, error });
      
      throw error;
    }
  }

  private async rollbackBatch(batch: Instance[]): Promise<void> {
    console.log(`🔄 Rolling back batch: ${batch.map(i => i.id).join(', ')}`);
    
    const rollbackPromises = batch.map(instance => 
      this.rollbackInstance(instance)
    );
    
    await Promise.all(rollbackPromises);
  }

  private async rollbackInstance(instance: Instance): Promise<void> {
    console.log(`🔄 Rolling back instance ${instance.id} to version ${this.status.previousVersion}`);
    
    try {
      // Stop current instance
      await this.stopInstance(instance);
      
      // Rollback to previous version
      await this.deployToInstance(instance, this.status.previousVersion, '');
      
      // Start instance
      await this.startInstance(instance);
      
      // Wait for health
      await this.waitForInstanceHealth(instance);
      
      instance.version = this.status.previousVersion;
      instance.status = 'HEALTHY';
      
      console.log(`✅ Instance ${instance.id} rolled back successfully`);
      
    } catch (error) {
      console.error(`❌ Failed to rollback instance ${instance.id}:`, error);
      throw error;
    }
  }

  private async startAllInstances(): Promise<void> {
    console.log('🔄 Starting all instances...');
    
    const startPromises = this.status.instances.map(instance => 
      this.startInstance(instance)
    );
    
    await Promise.all(startPromises);
  }

  private async startInstance(instance: Instance): Promise<void> {
    if (instance.status === 'HEALTHY') {
      return; // Already running
    }

    instance.status = 'STARTING';
    instance.startTime = new Date();

    // Start the application process
    instance.process = spawn('node', ['app.js'], {
      env: {
        ...process.env,
        PORT: instance.port.toString(),
        INSTANCE_ID: instance.id,
        VERSION: instance.version
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Handle process events
    instance.process.on('exit', (code) => {
      console.log(`Instance ${instance.id} exited with code ${code}`);
      instance.status = 'TERMINATED';
      instance.process = undefined;
      this.emit('instanceStopped', { instance, code });
    });

    instance.process.on('error', (error) => {
      console.error(`Instance ${instance.id} error:`, error);
      instance.status = 'UNHEALTHY';
      this.emit('instanceError', { instance, error });
    });

    // Start health checking
    this.startInstanceHealthChecking(instance);

    console.log(`🔄 Started instance ${instance.id} on port ${instance.port}`);
  }

  private async stopInstance(instance: Instance): Promise<void> {
    if (instance.status === 'TERMINATED' || !instance.process) {
      return;
    }

    instance.status = 'TERMINATING';

    // Stop health checking
    const healthCheckInterval = this.healthCheckIntervals.get(instance.id);
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      this.healthCheckIntervals.delete(instance.id);
    }

    // Graceful shutdown
    if (instance.process) {
      instance.process.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (instance.process && !instance.process.killed) {
            console.log(`Force killing instance ${instance.id}`);
            instance.process.kill('SIGKILL');
          }
          resolve();
        }, this.config.gracefulShutdownTimeout);

        instance.process!.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }

    instance.status = 'TERMINATED';
    instance.process = undefined;
    
    console.log(`🛑 Stopped instance ${instance.id}`);
  }

  private async deployToInstance(instance: Instance, version: string, deploymentPath: string): Promise<void> {
    // In a real implementation, this would:
    // 1. Copy deployment files
    // 2. Install dependencies
    // 3. Run build processes
    // 4. Update configuration
    
    console.log(`📦 Deployed version ${version} to instance ${instance.id}`);
    await this.sleep(1000); // Simulate deployment time
  }

  private startInstanceHealthChecking(instance: Instance): void {
    const interval = setInterval(async () => {
      await this.performInstanceHealthCheck(instance);
    }, 5000);

    this.healthCheckIntervals.set(instance.id, interval);
  }

  private async performInstanceHealthCheck(instance: Instance): Promise<boolean> {
    if (instance.status === 'TERMINATED' || instance.status === 'TERMINATING') {
      return false;
    }

    try {
      // Simulate health check
      const isHealthy = Math.random() > 0.1; // 90% success rate
      
      if (isHealthy) {
        instance.healthChecks.passed++;
        instance.healthChecks.lastCheck = new Date();
        
        if (instance.status === 'STARTING') {
          instance.status = 'HEALTHY';
          this.updateHealthyInstanceCount();
          this.emit('instanceHealthy', { instance });
        }
        
        return true;
      } else {
        throw new Error('Health check failed');
      }
      
    } catch (error) {
      instance.healthChecks.failed++;
      instance.healthChecks.lastCheck = new Date();
      
      if (instance.status === 'HEALTHY') {
        instance.status = 'UNHEALTHY';
        this.updateHealthyInstanceCount();
        this.emit('instanceUnhealthy', { instance, error });
      }
      
      return false;
    }
  }

  private async waitForInstanceHealth(instance: Instance): Promise<void> {
    const maxAttempts = this.config.healthCheckRetries;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const isHealthy = await this.performInstanceHealthCheck(instance);
      
      if (isHealthy) {
        return;
      }

      attempts++;
      if (attempts < maxAttempts) {
        await this.sleep(2000);
      }
    }

    throw new Error(`Instance ${instance.id} failed health checks after ${maxAttempts} attempts`);
  }

  private async waitForAllInstancesHealthy(): Promise<void> {
    console.log('⏳ Waiting for all instances to be healthy...');
    
    const healthPromises = this.status.instances.map(instance => 
      this.waitForInstanceHealth(instance)
    );
    
    await Promise.all(healthPromises);
    
    console.log('✅ All instances are healthy');
  }

  private async completeUpdate(): Promise<void> {
    this.status.phase = 'COMPLETED';
    this.status.endTime = new Date();
    this.status.inProgress = false;
    this.status.rollbackAvailable = true;
    this.status.previousVersion = this.status.targetVersion;
    
    const duration = this.status.startTime 
      ? Date.now() - this.status.startTime.getTime()
      : 0;

    console.log(`✅ Rolling update completed in ${duration}ms`);
    console.log(`📊 Update summary:`);
    console.log(`   - Updated instances: ${this.status.updatedInstances}`);
    console.log(`   - Failed instances: ${this.status.failedInstances}`);
    console.log(`   - Healthy instances: ${this.status.healthyInstances}`);

    this.emit('updateCompleted', {
      status: this.status,
      duration
    });
  }

  private async handleUpdateFailure(error: Error): Promise<void> {
    this.status.phase = 'FAILED';
    this.status.endTime = new Date();
    this.status.inProgress = false;

    console.error('❌ Rolling update failed:', error.message);
    this.emit('updateFailed', { error, status: this.status });

    if (this.config.rollbackOnFailure) {
      console.log('🔄 Auto-rollback enabled, starting rollback...');
      try {
        await this.rollback();
      } catch (rollbackError) {
        console.error('❌ Auto-rollback failed:', rollbackError);
      }
    }
  }

  private calculateAbsoluteValue(value: number | string, total: number): number {
    if (typeof value === 'string' && value.endsWith('%')) {
      const percentage = parseInt(value.slice(0, -1));
      return Math.ceil((percentage / 100) * total);
    }
    return value as number;
  }

  private updateHealthyInstanceCount(): void {
    this.status.healthyInstances = this.status.instances.filter(
      instance => instance.status === 'HEALTHY'
    ).length;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Default configuration
export const createDefaultRollingUpdateConfig = (): RollingUpdateConfig => ({
  maxUnavailable: 1,
  maxSurge: 1,
  healthCheckPath: '/health',
  healthCheckTimeout: 5000,
  healthCheckRetries: 10,
  updateBatchSize: 1,
  updateDelay: 5000,
  rollbackOnFailure: true,
  instanceStartupTimeout: 30000,
  gracefulShutdownTimeout: 10000
});