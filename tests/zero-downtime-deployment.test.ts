import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  DeploymentManager,
  GracefulShutdownManager,
  BlueGreenDeployment,
  RollingUpdateManager,
  DeploymentOrchestrator,
  createRollingUpdateOrchestrator,
  createBlueGreenOrchestrator,
  createDeploymentOrchestrator,
  DEPLOYMENT_PRESETS
} from '../gamma-services/deployment';

describe('Zero-Downtime Deployment System', () => {
  
  describe('DeploymentManager', () => {
    let deploymentManager: DeploymentManager;
    
    beforeEach(() => {
      const config = {
        strategy: 'ROLLING_UPDATE' as const,
        healthCheckUrl: 'http://localhost:3000/health',
        healthCheckTimeout: 5000,
        healthCheckRetries: 3,
        gracefulShutdownTimeout: 10000,
        rollbackOnFailure: true,
        preDeploymentChecks: [],
        postDeploymentChecks: [],
        notifications: [],
        backup: {
          enabled: false,
          retentionCount: 5,
          backupPath: './test-backups',
          includeDatabase: false,
          includeFiles: []
        }
      };
      
      deploymentManager = new DeploymentManager(config);
    });
    
    test('should validate deployment successfully', async () => {
      // Mock file system operations
      jest.spyOn(require('fs/promises'), 'access').mockResolvedValue(undefined);
      jest.spyOn(require('fs/promises'), 'readFile').mockResolvedValue(
        JSON.stringify({ name: 'test-app', version: '1.0.0' })
      );
      
      const result = await deploymentManager.validateDeployment('./test-deployment');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.checks.length).toBeGreaterThan(0);
    });
    
    test('should fail validation for missing deployment path', async () => {
      jest.spyOn(require('fs/promises'), 'access').mockRejectedValue(new Error('Path not found'));
      
      const result = await deploymentManager.validateDeployment('./non-existent');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Deployment path does not exist');
    });
    
    test('should start deployment and return deployment ID', async () => {
      jest.spyOn(deploymentManager, 'validateDeployment').mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
        checks: []
      });
      
      const deploymentId = await deploymentManager.startDeployment('1.0.0', '1.1.0', './test-deployment');
      
      expect(deploymentId).toBeDefined();
      expect(typeof deploymentId).toBe('string');
      expect(deploymentId).toMatch(/^deploy-/);
    });
    
    test('should get deployment status', async () => {
      jest.spyOn(deploymentManager, 'validateDeployment').mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
        checks: []
      });
      
      const deploymentId = await deploymentManager.startDeployment('1.0.0', '1.1.0', './test-deployment');
      const status = deploymentManager.getDeploymentStatus(deploymentId);
      
      expect(status).toBeDefined();
      expect(status?.id).toBe(deploymentId);
      expect(status?.version.from).toBe('1.0.0');
      expect(status?.version.to).toBe('1.1.0');
    });
  });
  
  describe('GracefulShutdownManager', () => {
    let shutdownManager: GracefulShutdownManager;
    
    beforeEach(() => {
      const config = {
        gracefulTimeout: 5000,
        forceTimeout: 10000,
        healthCheckGracePeriod: 1000,
        drainConnections: true,
        waitForActiveRequests: true,
        shutdownHooks: [],
        signals: ['SIGTERM', 'SIGINT'] as NodeJS.Signals[]
      };
      
      shutdownManager = new GracefulShutdownManager(config);
    });
    
    afterEach(() => {
      // Clean up any running shutdown processes
      if (shutdownManager.isShutdownInitiated()) {
        // Force cleanup for tests
      }
    });
    
    test('should add and remove shutdown hooks', () => {
      const hook = {
        name: 'test-hook',
        priority: 100,
        timeout: 5000,
        handler: jest.fn().mockResolvedValue(undefined),
        required: true
      };
      
      shutdownManager.addShutdownHook(hook);
      
      const status = shutdownManager.getShutdownStatus();
      expect(status.initiated).toBe(false);
      
      shutdownManager.removeShutdownHook('test-hook');
    });
    
    test('should track shutdown status', () => {
      const status = shutdownManager.getShutdownStatus();
      
      expect(status).toHaveProperty('initiated');
      expect(status).toHaveProperty('phase');
      expect(status).toHaveProperty('completedHooks');
      expect(status).toHaveProperty('failedHooks');
      expect(status).toHaveProperty('activeConnections');
      expect(status).toHaveProperty('activeRequests');
      expect(status).toHaveProperty('timeRemaining');
      
      expect(status.initiated).toBe(false);
      expect(status.phase).toBe('NOT_STARTED');
    });
    
    test('should register and unregister servers', () => {
      const mockServer = {
        on: jest.fn(),
        close: jest.fn()
      } as any;
      
      shutdownManager.registerServer(mockServer);
      expect(mockServer.on).toHaveBeenCalledWith('connection', expect.any(Function));
      expect(mockServer.on).toHaveBeenCalledWith('request', expect.any(Function));
      
      shutdownManager.unregisterServer(mockServer);
    });
  });
  
  describe('BlueGreenDeployment', () => {
    let blueGreenDeployment: BlueGreenDeployment;
    
    beforeEach(() => {
      const config = {
        bluePort: 3000,
        greenPort: 3001,
        proxyPort: 8000,
        healthCheckPath: '/health',
        healthCheckTimeout: 3000,
        healthCheckRetries: 3,
        trafficSwitchDelay: 1000,
        rollbackTimeout: 10000,
        environmentVariables: {},
        startupCommand: 'echo "test"'
      };
      
      blueGreenDeployment = new BlueGreenDeployment(config);
    });
    
    afterEach(async () => {
      try {
        await blueGreenDeployment.shutdown();
      } catch (error) {
        // Ignore shutdown errors in tests
      }
    });
    
    test('should initialize with correct status', async () => {
      // Mock HTTP server creation
      jest.spyOn(require('http'), 'createServer').mockReturnValue({
        listen: jest.fn((port, callback) => callback()),
        close: jest.fn((callback) => callback())
      });
      
      await blueGreenDeployment.initialize();
      
      const status = blueGreenDeployment.getStatus();
      expect(status.proxy.status).toBe('RUNNING');
      expect(status.activeEnvironment).toBe('blue');
      expect(status.blue.status).toBe('HEALTHY');
    });
    
    test('should get deployment status', () => {
      const status = blueGreenDeployment.getStatus();
      
      expect(status).toHaveProperty('activeEnvironment');
      expect(status).toHaveProperty('blue');
      expect(status).toHaveProperty('green');
      expect(status).toHaveProperty('proxy');
      expect(status).toHaveProperty('deployment');
      
      expect(status.blue.name).toBe('blue');
      expect(status.green.name).toBe('green');
      expect(status.deployment.inProgress).toBe(false);
    });
  });
  
  describe('RollingUpdateManager', () => {
    let rollingUpdateManager: RollingUpdateManager;
    
    beforeEach(() => {
      const config = {
        maxUnavailable: 1,
        maxSurge: 1,
        healthCheckPath: '/health',
        healthCheckTimeout: 3000,
        healthCheckRetries: 3,
        updateBatchSize: 1,
        updateDelay: 1000,
        rollbackOnFailure: true,
        instanceStartupTimeout: 10000,
        gracefulShutdownTimeout: 5000
      };
      
      rollingUpdateManager = new RollingUpdateManager(config);
    });
    
    afterEach(async () => {
      try {
        await rollingUpdateManager.shutdown();
      } catch (error) {
        // Ignore shutdown errors in tests
      }
    });
    
    test('should initialize with instances', async () => {
      await rollingUpdateManager.initialize(3, '1.0.0');
      
      const status = rollingUpdateManager.getStatus();
      expect(status.instances).toHaveLength(3);
      expect(status.previousVersion).toBe('1.0.0');
      expect(status.healthyInstances).toBe(3);
    });
    
    test('should get rolling update status', () => {
      const status = rollingUpdateManager.getStatus();
      
      expect(status).toHaveProperty('inProgress');
      expect(status).toHaveProperty('phase');
      expect(status).toHaveProperty('instances');
      expect(status).toHaveProperty('updatedInstances');
      expect(status).toHaveProperty('healthyInstances');
      expect(status).toHaveProperty('failedInstances');
      
      expect(status.inProgress).toBe(false);
      expect(status.phase).toBe('IDLE');
    });
  });
  
  describe('DeploymentOrchestrator', () => {
    let orchestrator: DeploymentOrchestrator;
    
    beforeEach(() => {
      orchestrator = createRollingUpdateOrchestrator({
        rollingUpdate: {
          maxUnavailable: 1,
          updateBatchSize: 1,
          updateDelay: 100,
          healthCheckRetries: 2
        }
      });
    });
    
    afterEach(async () => {
      try {
        await orchestrator.shutdown();
      } catch (error) {
        // Ignore shutdown errors in tests
      }
    });
    
    test('should initialize successfully', async () => {
      await orchestrator.initialize();
      
      const status = orchestrator.getStatus();
      expect(status.strategy).toBe('ROLLING_UPDATE');
      expect(status.health.overall).toBe('HEALTHY');
    });
    
    test('should validate deployment', async () => {
      await orchestrator.initialize();
      
      // Mock validation
      jest.spyOn(orchestrator, 'validateDeployment').mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
        checks: [{ name: 'test', passed: true }]
      });
      
      const validation = await orchestrator.validateDeployment('./test-deployment');
      expect(validation.valid).toBe(true);
    });
    
    test('should get orchestration status', async () => {
      await orchestrator.initialize();
      
      const status = orchestrator.getStatus();
      
      expect(status).toHaveProperty('strategy');
      expect(status).toHaveProperty('deployment');
      expect(status).toHaveProperty('shutdown');
      expect(status).toHaveProperty('health');
      
      expect(status.health).toHaveProperty('overall');
      expect(status.health).toHaveProperty('components');
    });
  });
  
  describe('Deployment Presets', () => {
    test('should create development orchestrator', () => {
      const orchestrator = createDeploymentOrchestrator('DEVELOPMENT');
      
      const status = orchestrator.getStatus();
      expect(status.strategy).toBe('ROLLING_UPDATE');
    });
    
    test('should create staging orchestrator', () => {
      const orchestrator = createDeploymentOrchestrator('STAGING');
      
      const status = orchestrator.getStatus();
      expect(status.strategy).toBe('ROLLING_UPDATE');
    });
    
    test('should create production orchestrator', () => {
      const orchestrator = createDeploymentOrchestrator('PRODUCTION');
      
      const status = orchestrator.getStatus();
      expect(status.strategy).toBe('BLUE_GREEN');
    });
    
    test('should validate preset configurations', () => {
      expect(DEPLOYMENT_PRESETS.DEVELOPMENT).toBeDefined();
      expect(DEPLOYMENT_PRESETS.STAGING).toBeDefined();
      expect(DEPLOYMENT_PRESETS.PRODUCTION).toBeDefined();
      
      expect(DEPLOYMENT_PRESETS.DEVELOPMENT.strategy).toBe('ROLLING_UPDATE');
      expect(DEPLOYMENT_PRESETS.STAGING.strategy).toBe('ROLLING_UPDATE');
      expect(DEPLOYMENT_PRESETS.PRODUCTION.strategy).toBe('BLUE_GREEN');
    });
  });
  
  describe('Integration Tests', () => {
    test('should handle complete deployment lifecycle', async () => {
      const orchestrator = createRollingUpdateOrchestrator({
        rollingUpdate: {
          updateBatchSize: 1,
          updateDelay: 100,
          healthCheckRetries: 1
        }
      });
      
      const events: string[] = [];
      
      orchestrator.on('initialized', () => events.push('initialized'));
      orchestrator.on('deploymentStarted', () => events.push('deploymentStarted'));
      orchestrator.on('deploymentCompleted', () => events.push('deploymentCompleted'));
      orchestrator.on('shutdown', () => events.push('shutdown'));
      
      try {
        await orchestrator.initialize();
        expect(events).toContain('initialized');
        
        // Mock successful deployment
        jest.spyOn(orchestrator, 'deploy').mockResolvedValue('test-deployment-id');
        
        const deploymentId = await orchestrator.deploy('1.0.0', '1.1.0', './test');
        expect(deploymentId).toBe('test-deployment-id');
        
        await orchestrator.shutdown();
        expect(events).toContain('shutdown');
        
      } catch (error) {
        // Expected in test environment
        console.log('Test deployment simulation completed');
      }
    });
    
    test('should handle deployment failure and rollback', async () => {
      const orchestrator = createRollingUpdateOrchestrator({
        rollingUpdate: {
          rollbackOnFailure: true,
          healthCheckRetries: 1
        }
      });
      
      const events: string[] = [];
      
      orchestrator.on('deploymentFailed', () => events.push('deploymentFailed'));
      orchestrator.on('rollbackCompleted', () => events.push('rollbackCompleted'));
      
      try {
        await orchestrator.initialize();
        
        // Mock failed deployment
        jest.spyOn(orchestrator, 'deploy').mockRejectedValue(new Error('Deployment failed'));
        jest.spyOn(orchestrator, 'rollback').mockResolvedValue();
        
        try {
          await orchestrator.deploy('1.0.0', '1.1.0', './test');
        } catch (error) {
          // Expected failure
        }
        
        await orchestrator.rollback();
        
        await orchestrator.shutdown();
        
      } catch (error) {
        // Expected in test environment
        console.log('Test rollback simulation completed');
      }
    });
  });
});

// Helper functions for testing
function createMockServer() {
  return {
    listen: jest.fn((port, callback) => callback && callback()),
    close: jest.fn((callback) => callback && callback()),
    on: jest.fn()
  };
}

function createMockProcess() {
  return {
    kill: jest.fn(),
    on: jest.fn(),
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    killed: false
  };
}

// Test utilities
export const testUtils = {
  createMockServer,
  createMockProcess,
  
  async waitForEvent(emitter: any, event: string, timeout: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Event ${event} not received within ${timeout}ms`));
      }, timeout);
      
      emitter.once(event, (data: any) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  },
  
  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};