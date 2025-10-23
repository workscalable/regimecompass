// Zero-Downtime Deployment System
// Main entry point for all deployment-related functionality

export { DeploymentManager } from './DeploymentManager';
export { GracefulShutdownManager, HealthCheckIntegration, createDefaultShutdownConfig } from './GracefulShutdownManager';
export { BlueGreenDeployment, createDefaultBlueGreenConfig } from './BlueGreenDeployment';
export { RollingUpdateManager, createDefaultRollingUpdateConfig } from './RollingUpdateManager';
export { 
  DeploymentOrchestrator, 
  createDefaultOrchestrationConfig,
  createRollingUpdateOrchestrator,
  createBlueGreenOrchestrator,
  createCanaryOrchestrator
} from './DeploymentOrchestrator';

// Export all types
export type {
  DeploymentConfig,
  DeploymentStatus,
  DeploymentInstance,
  CheckResult,
  DeploymentLog,
  PreDeploymentCheck,
  PostDeploymentCheck,
  NotificationConfig,
  BackupConfig,
  DeploymentEvent,
  ValidationResult
} from './DeploymentManager';

export type {
  ShutdownConfig,
  ShutdownHook,
  ShutdownStatus
} from './GracefulShutdownManager';

export type {
  BlueGreenConfig,
  Environment,
  BlueGreenStatus
} from './BlueGreenDeployment';

export type {
  RollingUpdateConfig,
  Instance,
  RollingUpdateStatus
} from './RollingUpdateManager';

export type {
  OrchestrationConfig,
  OrchestrationStatus
} from './DeploymentOrchestrator';

// Predefined shutdown hooks for common services
export {
  createDatabaseShutdownHook,
  createCacheShutdownHook,
  createQueueShutdownHook,
  createMetricsShutdownHook,
  createLoggingShutdownHook
} from './GracefulShutdownManager';

/**
 * Zero-Downtime Deployment System
 * 
 * This module provides comprehensive zero-downtime deployment capabilities including:
 * 
 * 1. **Deployment Strategies**:
 *    - Rolling Updates: Gradual instance replacement
 *    - Blue-Green: Complete environment switching
 *    - Canary: Gradual traffic shifting
 * 
 * 2. **Graceful Shutdown**:
 *    - Connection draining
 *    - Request completion waiting
 *    - Service shutdown hooks
 *    - Health check integration
 * 
 * 3. **Deployment Management**:
 *    - Pre/post deployment checks
 *    - Automatic rollback on failure
 *    - Deployment validation
 *    - Backup and recovery
 * 
 * 4. **Monitoring & Observability**:
 *    - Real-time deployment status
 *    - Health monitoring
 *    - Event notifications
 *    - Deployment history
 * 
 * @example Basic Usage
 * ```typescript
 * import { createRollingUpdateOrchestrator } from './gamma-services/deployment';
 * 
 * const orchestrator = createRollingUpdateOrchestrator({
 *   rollingUpdate: {
 *     maxUnavailable: 1,
 *     updateBatchSize: 2,
 *     rollbackOnFailure: true
 *   }
 * });
 * 
 * await orchestrator.initialize();
 * await orchestrator.deploy('1.0.0', '1.1.0', './deployment');
 * ```
 * 
 * @example Blue-Green Deployment
 * ```typescript
 * import { createBlueGreenOrchestrator } from './gamma-services/deployment';
 * 
 * const orchestrator = createBlueGreenOrchestrator({
 *   blueGreen: {
 *     bluePort: 3000,
 *     greenPort: 3001,
 *     proxyPort: 8000
 *   }
 * });
 * 
 * await orchestrator.initialize();
 * await orchestrator.deploy('1.0.0', '1.1.0', './deployment');
 * ```
 * 
 * @example Graceful Shutdown
 * ```typescript
 * import { GracefulShutdownManager, createDatabaseShutdownHook } from './gamma-services/deployment';
 * 
 * const shutdownManager = new GracefulShutdownManager({
 *   gracefulTimeout: 30000,
 *   forceTimeout: 45000,
 *   signals: ['SIGTERM', 'SIGINT']
 * });
 * 
 * // Add custom shutdown hooks
 * shutdownManager.addShutdownHook(createDatabaseShutdownHook(async () => {
 *   await database.close();
 * }));
 * 
 * // Shutdown will be triggered automatically on process signals
 * ```
 */

// Default deployment configurations for common scenarios
export const DEPLOYMENT_PRESETS = {
  /**
   * Development environment preset
   * - Fast deployments with minimal checks
   * - Single instance updates
   * - No backup required
   */
  DEVELOPMENT: {
    strategy: 'ROLLING_UPDATE' as const,
    rollingUpdate: {
      maxUnavailable: 1,
      maxSurge: 0,
      updateBatchSize: 1,
      updateDelay: 1000,
      rollbackOnFailure: false,
      healthCheckRetries: 3
    },
    deployment: {
      healthCheckTimeout: 3000,
      gracefulShutdownTimeout: 10000,
      rollbackOnFailure: false,
      preDeploymentChecks: [],
      postDeploymentChecks: [],
      backup: { enabled: false }
    }
  },

  /**
   * Staging environment preset
   * - Moderate safety checks
   * - Small batch updates
   * - Basic backup enabled
   */
  STAGING: {
    strategy: 'ROLLING_UPDATE' as const,
    rollingUpdate: {
      maxUnavailable: 1,
      maxSurge: 1,
      updateBatchSize: 2,
      updateDelay: 5000,
      rollbackOnFailure: true,
      healthCheckRetries: 5
    },
    deployment: {
      healthCheckTimeout: 5000,
      gracefulShutdownTimeout: 20000,
      rollbackOnFailure: true,
      preDeploymentChecks: [
        {
          name: 'health-check',
          type: 'HEALTH_CHECK' as const,
          config: { url: '/health' },
          required: true,
          timeout: 10000
        }
      ],
      postDeploymentChecks: [
        {
          name: 'smoke-test',
          type: 'SMOKE_TEST' as const,
          config: { endpoints: ['/health'] },
          required: true,
          timeout: 15000,
          retries: 2
        }
      ],
      backup: { enabled: true, retentionCount: 3 }
    }
  },

  /**
   * Production environment preset
   * - Maximum safety and reliability
   * - Conservative update strategy
   * - Comprehensive checks and backup
   */
  PRODUCTION: {
    strategy: 'BLUE_GREEN' as const,
    blueGreen: {
      healthCheckRetries: 10,
      trafficSwitchDelay: 10000,
      rollbackTimeout: 60000
    },
    deployment: {
      healthCheckTimeout: 10000,
      gracefulShutdownTimeout: 60000,
      rollbackOnFailure: true,
      preDeploymentChecks: [
        {
          name: 'health-check',
          type: 'HEALTH_CHECK' as const,
          config: { url: '/health' },
          required: true,
          timeout: 15000
        },
        {
          name: 'database-migration',
          type: 'DATABASE_MIGRATION' as const,
          config: { checkOnly: true },
          required: true,
          timeout: 30000
        }
      ],
      postDeploymentChecks: [
        {
          name: 'smoke-test',
          type: 'SMOKE_TEST' as const,
          config: { endpoints: ['/health', '/api/status'] },
          required: true,
          timeout: 30000,
          retries: 5
        },
        {
          name: 'integration-test',
          type: 'INTEGRATION_TEST' as const,
          config: { testSuite: 'critical' },
          required: true,
          timeout: 120000,
          retries: 2
        }
      ],
      backup: { 
        enabled: true, 
        retentionCount: 10,
        includeDatabase: true
      }
    }
  }
};

/**
 * Utility function to create a deployment orchestrator with preset configuration
 */
export function createDeploymentOrchestrator(
  preset: keyof typeof DEPLOYMENT_PRESETS,
  overrides?: Partial<OrchestrationConfig>
): DeploymentOrchestrator {
  const presetConfig = DEPLOYMENT_PRESETS[preset];
  const baseConfig = createDefaultOrchestrationConfig(presetConfig.strategy);
  
  const finalConfig = {
    ...baseConfig,
    ...presetConfig,
    ...overrides
  };
  
  return new DeploymentOrchestrator(finalConfig);
}

/**
 * Health check utilities for deployment validation
 */
export const HEALTH_CHECK_UTILS = {
  /**
   * Standard health check endpoints
   */
  ENDPOINTS: {
    LIVENESS: '/health/live',
    READINESS: '/health/ready',
    STARTUP: '/health/startup'
  },

  /**
   * Create a comprehensive health check configuration
   */
  createHealthCheckConfig: (baseUrl: string) => ({
    liveness: `${baseUrl}/health/live`,
    readiness: `${baseUrl}/health/ready`,
    startup: `${baseUrl}/health/startup`
  }),

  /**
   * Validate health check response
   */
  validateHealthResponse: (response: any): boolean => {
    return response && 
           response.status === 'healthy' && 
           response.timestamp &&
           new Date(response.timestamp).getTime() > Date.now() - 60000; // Within last minute
  }
};

/**
 * Deployment event types for monitoring and alerting
 */
export const DEPLOYMENT_EVENTS = {
  // Deployment lifecycle
  DEPLOYMENT_STARTED: 'deployment.started',
  DEPLOYMENT_COMPLETED: 'deployment.completed',
  DEPLOYMENT_FAILED: 'deployment.failed',
  DEPLOYMENT_ROLLED_BACK: 'deployment.rolled_back',
  
  // Instance lifecycle
  INSTANCE_UPDATED: 'instance.updated',
  INSTANCE_HEALTHY: 'instance.healthy',
  INSTANCE_UNHEALTHY: 'instance.unhealthy',
  INSTANCE_TERMINATED: 'instance.terminated',
  
  // Traffic management
  TRAFFIC_SWITCHED: 'traffic.switched',
  LOAD_BALANCED: 'load.balanced',
  
  // Health and monitoring
  HEALTH_CHECK_PASSED: 'health.check.passed',
  HEALTH_CHECK_FAILED: 'health.check.failed',
  
  // Shutdown
  SHUTDOWN_INITIATED: 'shutdown.initiated',
  SHUTDOWN_COMPLETED: 'shutdown.completed',
  SHUTDOWN_FORCED: 'shutdown.forced'
} as const;