import { EventEmitter } from 'events';
import { DeploymentManager, DeploymentConfig, DeploymentStatus } from './DeploymentManager';
import { GracefulShutdownManager, ShutdownConfig, createDefaultShutdownConfig } from './GracefulShutdownManager';
import { BlueGreenDeployment, BlueGreenConfig, createDefaultBlueGreenConfig } from './BlueGreenDeployment';
import { RollingUpdateManager, RollingUpdateConfig, createDefaultRollingUpdateConfig } from './RollingUpdateManager';

export interface OrchestrationConfig {
  strategy: 'ROLLING_UPDATE' | 'BLUE_GREEN' | 'CANARY';
  deployment: DeploymentConfig;
  shutdown: ShutdownConfig;
  blueGreen?: BlueGreenConfig;
  rollingUpdate?: RollingUpdateConfig;
  monitoring: {
    enabled: boolean;
    metricsEndpoint?: string;
    alertWebhook?: string;
  };
  validation: {
    preDeployment: boolean;
    postDeployment: boolean;
    rollbackOnFailure: boolean;
  };
}

export interface OrchestrationStatus {
  strategy: string;
  deployment: DeploymentStatus | null;
  shutdown: any;
  blueGreen?: any;
  rollingUpdate?: any;
  health: {
    overall: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    components: Record<string, 'HEALTHY' | 'UNHEALTHY'>;
  };
}

export class DeploymentOrchestrator extends EventEmitter {
  private config: OrchestrationConfig;
  private deploymentManager: DeploymentManager;
  private shutdownManager: GracefulShutdownManager;
  private blueGreenDeployment?: BlueGreenDeployment;
  private rollingUpdateManager?: RollingUpdateManager;
  private isInitialized: boolean = false;

  constructor(config: OrchestrationConfig) {
    super();
    this.config = config;
    
    // Initialize core components
    this.deploymentManager = new DeploymentManager(config.deployment);
    this.shutdownManager = new GracefulShutdownManager(config.shutdown);
    
    // Initialize strategy-specific components
    if (config.strategy === 'BLUE_GREEN' && config.blueGreen) {
      this.blueGreenDeployment = new BlueGreenDeployment(config.blueGreen);
    }
    
    if (config.strategy === 'ROLLING_UPDATE' && config.rollingUpdate) {
      this.rollingUpdateManager = new RollingUpdateManager(config.rollingUpdate);
    }
    
    this.setupEventHandlers();
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('Deployment orchestrator already initialized');
    }

    console.log('🚀 Initializing Deployment Orchestrator...');
    
    try {
      // Initialize strategy-specific components
      if (this.blueGreenDeployment) {
        await this.blueGreenDeployment.initialize();
      }
      
      if (this.rollingUpdateManager) {
        await this.rollingUpdateManager.initialize(3, '1.0.0'); // Default 3 instances
      }
      
      // Add shutdown hooks for graceful shutdown
      this.addShutdownHooks();
      
      this.isInitialized = true;
      
      console.log('✅ Deployment Orchestrator initialized successfully');
      this.emit('initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Deployment Orchestrator:', error);
      throw error;
    }
  }

  public async deploy(fromVersion: string, toVersion: string, deploymentPath: string): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Deployment orchestrator not initialized');
    }

    console.log(`🚀 Starting ${this.config.strategy} deployment from ${fromVersion} to ${toVersion}`);
    
    try {
      let deploymentId: string;
      
      switch (this.config.strategy) {
        case 'ROLLING_UPDATE':
          deploymentId = await this.performRollingUpdate(toVersion, deploymentPath);
          break;
        case 'BLUE_GREEN':
          deploymentId = await this.performBlueGreenDeployment(toVersion, deploymentPath);
          break;
        case 'CANARY':
          deploymentId = await this.performCanaryDeployment(fromVersion, toVersion, deploymentPath);
          break;
        default:
          throw new Error(`Unsupported deployment strategy: ${this.config.strategy}`);
      }
      
      console.log(`✅ ${this.config.strategy} deployment completed successfully`);
      this.emit('deploymentCompleted', { deploymentId, strategy: this.config.strategy });
      
      return deploymentId;
      
    } catch (error) {
      console.error(`❌ ${this.config.strategy} deployment failed:`, error);
      this.emit('deploymentFailed', { error, strategy: this.config.strategy });
      throw error;
    }
  }

  public async rollback(deploymentId?: string): Promise<void> {
    console.log('🔄 Starting deployment rollback...');
    
    try {
      switch (this.config.strategy) {
        case 'ROLLING_UPDATE':
          if (this.rollingUpdateManager) {
            await this.rollingUpdateManager.rollback();
          }
          break;
        case 'BLUE_GREEN':
          if (this.blueGreenDeployment) {
            await this.blueGreenDeployment.rollback();
          }
          break;
        case 'CANARY':
          if (deploymentId) {
            await this.deploymentManager.rollbackDeployment(deploymentId);
          }
          break;
      }
      
      console.log('✅ Rollback completed successfully');
      this.emit('rollbackCompleted', { strategy: this.config.strategy });
      
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      this.emit('rollbackFailed', { error, strategy: this.config.strategy });
      throw error;
    }
  }

  public getStatus(): OrchestrationStatus {
    const status: OrchestrationStatus = {
      strategy: this.config.strategy,
      deployment: this.deploymentManager.getDeploymentStatus(),
      shutdown: this.shutdownManager.getShutdownStatus(),
      health: {
        overall: 'HEALTHY',
        components: {
          deploymentManager: 'HEALTHY',
          shutdownManager: 'HEALTHY'
        }
      }
    };

    if (this.blueGreenDeployment) {
      status.blueGreen = this.blueGreenDeployment.getStatus();
      status.health.components.blueGreen = status.blueGreen.proxy.status === 'RUNNING' ? 'HEALTHY' : 'UNHEALTHY';
    }

    if (this.rollingUpdateManager) {
      status.rollingUpdate = this.rollingUpdateManager.getStatus();
      status.health.components.rollingUpdate = status.rollingUpdate.healthyInstances > 0 ? 'HEALTHY' : 'UNHEALTHY';
    }

    // Determine overall health
    const componentStates = Object.values(status.health.components);
    const unhealthyCount = componentStates.filter(state => state === 'UNHEALTHY').length;
    
    if (unhealthyCount === 0) {
      status.health.overall = 'HEALTHY';
    } else if (unhealthyCount < componentStates.length) {
      status.health.overall = 'DEGRADED';
    } else {
      status.health.overall = 'UNHEALTHY';
    }

    return status;
  }

  public async validateDeployment(deploymentPath: string): Promise<any> {
    return this.deploymentManager.validateDeployment(deploymentPath);
  }

  public async initiateGracefulShutdown(reason?: string): Promise<void> {
    console.log('🛑 Initiating graceful shutdown of deployment orchestrator...');
    await this.shutdownManager.initiateShutdown(reason);
  }

  public async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Deployment Orchestrator...');
    
    try {
      // Shutdown strategy-specific components
      if (this.blueGreenDeployment) {
        await this.blueGreenDeployment.shutdown();
      }
      
      if (this.rollingUpdateManager) {
        await this.rollingUpdateManager.shutdown();
      }
      
      this.isInitialized = false;
      
      console.log('✅ Deployment Orchestrator shut down successfully');
      this.emit('shutdown');
      
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      throw error;
    }
  }

  private async performRollingUpdate(version: string, deploymentPath: string): Promise<string> {
    if (!this.rollingUpdateManager) {
      throw new Error('Rolling update manager not initialized');
    }

    await this.rollingUpdateManager.performRollingUpdate(version, deploymentPath);
    return `rolling-update-${Date.now()}`;
  }

  private async performBlueGreenDeployment(version: string, deploymentPath: string): Promise<string> {
    if (!this.blueGreenDeployment) {
      throw new Error('Blue-green deployment not initialized');
    }

    await this.blueGreenDeployment.deploy(version, deploymentPath);
    return `blue-green-${Date.now()}`;
  }

  private async performCanaryDeployment(fromVersion: string, toVersion: string, deploymentPath: string): Promise<string> {
    return this.deploymentManager.startDeployment(fromVersion, toVersion, deploymentPath);
  }

  private setupEventHandlers(): void {
    // Deployment Manager events
    this.deploymentManager.on('deploymentStarted', (deployment) => {
      console.log(`📦 Deployment started: ${deployment.id}`);
      this.emit('deploymentStarted', deployment);
    });

    this.deploymentManager.on('deploymentCompleted', (deployment) => {
      console.log(`✅ Deployment completed: ${deployment.id}`);
      this.emit('deploymentStepCompleted', deployment);
    });

    this.deploymentManager.on('deploymentFailed', (event) => {
      console.log(`❌ Deployment failed: ${event.deployment.id}`);
      this.emit('deploymentStepFailed', event);
    });

    // Shutdown Manager events
    this.shutdownManager.on('shutdownInitiated', (event) => {
      console.log('🛑 Graceful shutdown initiated');
      this.emit('shutdownInitiated', event);
    });

    this.shutdownManager.on('shutdownCompleted', (event) => {
      console.log('✅ Graceful shutdown completed');
      this.emit('shutdownCompleted', event);
    });

    // Blue-Green Deployment events
    if (this.blueGreenDeployment) {
      this.blueGreenDeployment.on('deploymentCompleted', (event) => {
        console.log('✅ Blue-Green deployment completed');
        this.emit('blueGreenCompleted', event);
      });

      this.blueGreenDeployment.on('trafficSwitched', (event) => {
        console.log(`🔀 Traffic switched to ${event.environment}`);
        this.emit('trafficSwitched', event);
      });
    }

    // Rolling Update events
    if (this.rollingUpdateManager) {
      this.rollingUpdateManager.on('updateCompleted', (event) => {
        console.log('✅ Rolling update completed');
        this.emit('rollingUpdateCompleted', event);
      });

      this.rollingUpdateManager.on('instanceUpdated', (event) => {
        console.log(`✅ Instance updated: ${event.instance.id}`);
        this.emit('instanceUpdated', event);
      });
    }
  }

  private addShutdownHooks(): void {
    // Add deployment-specific shutdown hooks
    this.shutdownManager.addShutdownHook({
      name: 'deployment-manager',
      priority: 100,
      timeout: 15000,
      handler: async () => {
        console.log('🔄 Shutting down deployment manager...');
        // Any cleanup needed for deployment manager
      },
      required: true
    });

    if (this.blueGreenDeployment) {
      this.shutdownManager.addShutdownHook({
        name: 'blue-green-deployment',
        priority: 90,
        timeout: 20000,
        handler: async () => {
          console.log('🔄 Shutting down blue-green deployment...');
          await this.blueGreenDeployment!.shutdown();
        },
        required: true
      });
    }

    if (this.rollingUpdateManager) {
      this.shutdownManager.addShutdownHook({
        name: 'rolling-update-manager',
        priority: 90,
        timeout: 20000,
        handler: async () => {
          console.log('🔄 Shutting down rolling update manager...');
          await this.rollingUpdateManager!.shutdown();
        },
        required: true
      });
    }
  }
}

// Default configuration factory
export const createDefaultOrchestrationConfig = (strategy: 'ROLLING_UPDATE' | 'BLUE_GREEN' | 'CANARY'): OrchestrationConfig => {
  const baseConfig: OrchestrationConfig = {
    strategy,
    deployment: {
      strategy,
      healthCheckUrl: 'http://localhost:3000/health',
      healthCheckTimeout: 5000,
      healthCheckRetries: 10,
      gracefulShutdownTimeout: 30000,
      rollbackOnFailure: true,
      preDeploymentChecks: [
        {
          name: 'health-check',
          type: 'HEALTH_CHECK',
          config: { url: 'http://localhost:3000/health' },
          required: true,
          timeout: 10000
        }
      ],
      postDeploymentChecks: [
        {
          name: 'smoke-test',
          type: 'SMOKE_TEST',
          config: { endpoints: ['/health', '/api/status'] },
          required: true,
          timeout: 30000,
          retries: 3
        }
      ],
      notifications: [],
      backup: {
        enabled: true,
        retentionCount: 5,
        backupPath: './backups',
        includeDatabase: false,
        includeFiles: ['package.json', 'package-lock.json']
      }
    },
    shutdown: createDefaultShutdownConfig(),
    monitoring: {
      enabled: true,
      metricsEndpoint: '/metrics',
      alertWebhook: process.env.ALERT_WEBHOOK_URL
    },
    validation: {
      preDeployment: true,
      postDeployment: true,
      rollbackOnFailure: true
    }
  };

  // Add strategy-specific configuration
  if (strategy === 'BLUE_GREEN') {
    baseConfig.blueGreen = createDefaultBlueGreenConfig();
  } else if (strategy === 'ROLLING_UPDATE') {
    baseConfig.rollingUpdate = createDefaultRollingUpdateConfig();
  }

  return baseConfig;
};

// Convenience factory functions
export const createRollingUpdateOrchestrator = (config?: Partial<OrchestrationConfig>): DeploymentOrchestrator => {
  const defaultConfig = createDefaultOrchestrationConfig('ROLLING_UPDATE');
  const finalConfig = { ...defaultConfig, ...config };
  return new DeploymentOrchestrator(finalConfig);
};

export const createBlueGreenOrchestrator = (config?: Partial<OrchestrationConfig>): DeploymentOrchestrator => {
  const defaultConfig = createDefaultOrchestrationConfig('BLUE_GREEN');
  const finalConfig = { ...defaultConfig, ...config };
  return new DeploymentOrchestrator(finalConfig);
};

export const createCanaryOrchestrator = (config?: Partial<OrchestrationConfig>): DeploymentOrchestrator => {
  const defaultConfig = createDefaultOrchestrationConfig('CANARY');
  const finalConfig = { ...defaultConfig, ...config };
  return new DeploymentOrchestrator(finalConfig);
};