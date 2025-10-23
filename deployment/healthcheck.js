#!/usr/bin/env node

/**
 * Gamma Adaptive System - Health Check Script
 * 
 * Comprehensive health check for Docker containers and Kubernetes deployments
 * Checks application health, database connectivity, and external API availability
 */

const http = require('http');
const https = require('https');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  app: {
    host: process.env.HEALTH_CHECK_HOST || 'localhost',
    port: process.env.PORT || 3000,
    timeout: 5000
  },
  database: {
    enabled: process.env.DATABASE_HEALTH_CHECK !== 'false',
    timeout: 3000
  },
  redis: {
    enabled: process.env.REDIS_HEALTH_CHECK !== 'false',
    timeout: 3000
  },
  externalAPIs: {
    enabled: process.env.EXTERNAL_API_HEALTH_CHECK !== 'false',
    timeout: 5000
  }
};

// Health check results
const healthStatus = {
  status: 'healthy',
  timestamp: new Date().toISOString(),
  checks: {},
  errors: []
};

// Utility functions
const log = (level, message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
};

const makeRequest = (options) => {
  return new Promise((resolve, reject) => {
    const client = options.protocol === 'https:' ? https : http;
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, options.timeout || 5000);

    const req = client.request(options, (res) => {
      clearTimeout(timeout);
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    req.end();
  });
};

// Health check functions
const checkApplicationHealth = async () => {
  try {
    log('info', 'Checking application health...');
    
    const response = await makeRequest({
      hostname: CONFIG.app.host,
      port: CONFIG.app.port,
      path: '/health',
      method: 'GET',
      timeout: CONFIG.app.timeout
    });

    if (response.statusCode === 200) {
      healthStatus.checks.application = {
        status: 'healthy',
        responseTime: Date.now(),
        details: 'Application is responding'
      };
      log('info', 'Application health check passed');
    } else {
      throw new Error(`Application returned status code: ${response.statusCode}`);
    }
  } catch (error) {
    healthStatus.checks.application = {
      status: 'unhealthy',
      error: error.message,
      details: 'Application is not responding'
    };
    healthStatus.errors.push(`Application: ${error.message}`);
    log('error', `Application health check failed: ${error.message}`);
  }
};

const checkDatabaseHealth = async () => {
  if (!CONFIG.database.enabled) {
    log('info', 'Database health check disabled');
    return;
  }

  try {
    log('info', 'Checking database connectivity...');
    
    // Try to connect to PostgreSQL
    const result = execSync('pg_isready -h postgres -p 5432', {
      timeout: CONFIG.database.timeout,
      encoding: 'utf8'
    });

    healthStatus.checks.database = {
      status: 'healthy',
      details: 'Database is accepting connections'
    };
    log('info', 'Database health check passed');
  } catch (error) {
    healthStatus.checks.database = {
      status: 'unhealthy',
      error: error.message,
      details: 'Database is not accepting connections'
    };
    healthStatus.errors.push(`Database: ${error.message}`);
    log('error', `Database health check failed: ${error.message}`);
  }
};

const checkRedisHealth = async () => {
  if (!CONFIG.redis.enabled) {
    log('info', 'Redis health check disabled');
    return;
  }

  try {
    log('info', 'Checking Redis connectivity...');
    
    // Try to ping Redis
    const result = execSync('redis-cli -h redis -p 6379 ping', {
      timeout: CONFIG.redis.timeout,
      encoding: 'utf8'
    });

    if (result.trim() === 'PONG') {
      healthStatus.checks.redis = {
        status: 'healthy',
        details: 'Redis is responding to ping'
      };
      log('info', 'Redis health check passed');
    } else {
      throw new Error('Redis did not respond with PONG');
    }
  } catch (error) {
    healthStatus.checks.redis = {
      status: 'unhealthy',
      error: error.message,
      details: 'Redis is not responding'
    };
    healthStatus.errors.push(`Redis: ${error.message}`);
    log('error', `Redis health check failed: ${error.message}`);
  }
};

const checkExternalAPIs = async () => {
  if (!CONFIG.externalAPIs.enabled) {
    log('info', 'External API health checks disabled');
    return;
  }

  const apis = [
    {
      name: 'Polygon.io',
      url: 'https://api.polygon.io/v1/meta/symbols/AAPL/company',
      expectedStatus: [200, 401] // 401 is OK, means API is up but we need auth
    },
    {
      name: 'TwelveData',
      url: 'https://api.twelvedata.com/time_series?symbol=AAPL&interval=1min&outputsize=1',
      expectedStatus: [200, 401, 429] // Rate limiting is OK
    }
  ];

  for (const api of apis) {
    try {
      log('info', `Checking ${api.name} API...`);
      
      const url = new URL(api.url);
      const response = await makeRequest({
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET',
        protocol: url.protocol,
        timeout: CONFIG.externalAPIs.timeout
      });

      if (api.expectedStatus.includes(response.statusCode)) {
        healthStatus.checks[`external_api_${api.name.toLowerCase().replace('.', '_')}`] = {
          status: 'healthy',
          details: `${api.name} API is responding`,
          statusCode: response.statusCode
        };
        log('info', `${api.name} API health check passed`);
      } else {
        throw new Error(`Unexpected status code: ${response.statusCode}`);
      }
    } catch (error) {
      healthStatus.checks[`external_api_${api.name.toLowerCase().replace('.', '_')}`] = {
        status: 'unhealthy',
        error: error.message,
        details: `${api.name} API is not responding`
      };
      healthStatus.errors.push(`${api.name} API: ${error.message}`);
      log('error', `${api.name} API health check failed: ${error.message}`);
    }
  }
};

const checkSystemResources = async () => {
  try {
    log('info', 'Checking system resources...');
    
    // Check memory usage
    const memInfo = execSync('cat /proc/meminfo', { encoding: 'utf8' });
    const memTotal = parseInt(memInfo.match(/MemTotal:\s+(\d+)/)[1]) * 1024;
    const memAvailable = parseInt(memInfo.match(/MemAvailable:\s+(\d+)/)[1]) * 1024;
    const memUsagePercent = ((memTotal - memAvailable) / memTotal) * 100;

    // Check disk usage
    const diskInfo = execSync('df -h /', { encoding: 'utf8' });
    const diskUsageMatch = diskInfo.match(/(\d+)%/);
    const diskUsagePercent = diskUsageMatch ? parseInt(diskUsageMatch[1]) : 0;

    const resourceStatus = {
      memory: {
        usagePercent: Math.round(memUsagePercent),
        total: Math.round(memTotal / (1024 * 1024 * 1024)), // GB
        available: Math.round(memAvailable / (1024 * 1024 * 1024)) // GB
      },
      disk: {
        usagePercent: diskUsagePercent
      }
    };

    // Determine if resources are healthy
    const memoryHealthy = memUsagePercent < 90;
    const diskHealthy = diskUsagePercent < 90;

    if (memoryHealthy && diskHealthy) {
      healthStatus.checks.system_resources = {
        status: 'healthy',
        details: 'System resources are within normal limits',
        resources: resourceStatus
      };
      log('info', 'System resources check passed');
    } else {
      const issues = [];
      if (!memoryHealthy) issues.push(`High memory usage: ${Math.round(memUsagePercent)}%`);
      if (!diskHealthy) issues.push(`High disk usage: ${diskUsagePercent}%`);
      
      healthStatus.checks.system_resources = {
        status: 'warning',
        details: `System resources are stressed: ${issues.join(', ')}`,
        resources: resourceStatus
      };
      log('warning', `System resources check warning: ${issues.join(', ')}`);
    }
  } catch (error) {
    healthStatus.checks.system_resources = {
      status: 'unhealthy',
      error: error.message,
      details: 'Could not check system resources'
    };
    log('error', `System resources check failed: ${error.message}`);
  }
};

// Main health check function
const runHealthChecks = async () => {
  log('info', 'Starting health checks...');
  
  const startTime = Date.now();
  
  // Run all health checks
  await Promise.all([
    checkApplicationHealth(),
    checkDatabaseHealth(),
    checkRedisHealth(),
    checkExternalAPIs(),
    checkSystemResources()
  ]);
  
  const endTime = Date.now();
  healthStatus.duration = endTime - startTime;
  
  // Determine overall health status
  const hasUnhealthy = Object.values(healthStatus.checks).some(check => check.status === 'unhealthy');
  const hasWarnings = Object.values(healthStatus.checks).some(check => check.status === 'warning');
  
  if (hasUnhealthy) {
    healthStatus.status = 'unhealthy';
  } else if (hasWarnings) {
    healthStatus.status = 'warning';
  } else {
    healthStatus.status = 'healthy';
  }
  
  // Log results
  log('info', `Health check completed in ${healthStatus.duration}ms`);
  log('info', `Overall status: ${healthStatus.status}`);
  
  if (healthStatus.errors.length > 0) {
    log('error', `Errors found: ${healthStatus.errors.join(', ')}`);
  }
  
  // Output results as JSON for Docker health check
  console.log(JSON.stringify(healthStatus, null, 2));
  
  // Exit with appropriate code
  if (healthStatus.status === 'unhealthy') {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log('error', `Uncaught exception: ${error.message}`);
  healthStatus.status = 'unhealthy';
  healthStatus.errors.push(`Uncaught exception: ${error.message}`);
  console.log(JSON.stringify(healthStatus, null, 2));
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('error', `Unhandled rejection: ${reason}`);
  healthStatus.status = 'unhealthy';
  healthStatus.errors.push(`Unhandled rejection: ${reason}`);
  console.log(JSON.stringify(healthStatus, null, 2));
  process.exit(1);
});

// Run health checks
runHealthChecks();