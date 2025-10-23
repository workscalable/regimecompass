// Database Optimization Components
export { DatabaseOptimizer, defaultDatabaseConfig } from './DatabaseOptimizer';
export { DataAccessLayer, defaultDataAccessConfig } from './DataAccessLayer';

// Caching Components
export { CacheManager, defaultCacheConfig } from '../caching/CacheManager';

// Types and Interfaces
export type {
  DatabaseConfig,
  QueryMetrics,
  ConnectionMetrics,
  IndexInfo,
  QueryPlan
} from './DatabaseOptimizer';

export type {
  DataAccessConfig,
  QueryOptions,
  WriteOptions,
  DataAccessMetrics
} from './DataAccessLayer';

export type {
  CacheConfig,
  CacheEntry,
  CacheStats,
  CacheQuery,
  CacheInvalidationStrategy
} from '../caching/CacheManager';

// Utility functions for database operations
export const DatabaseUtils = {
  /**
   * Generate optimized SQL for common operations
   */
  generateSelectSQL: (
    table: string,
    conditions: Record<string, any> = {},
    options: {
      columns?: string[];
      orderBy?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): { sql: string; parameters: any[] } => {
    const columns = options.columns ? options.columns.join(', ') : '*';
    let sql = `SELECT ${columns} FROM ${table}`;
    const parameters: any[] = [];
    let paramIndex = 1;
    
    // WHERE clause
    if (Object.keys(conditions).length > 0) {
      const whereConditions = Object.entries(conditions).map(([key, value]) => {
        parameters.push(value);
        return `${key} = $${paramIndex++}`;
      });
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    // ORDER BY clause
    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    }
    
    // LIMIT clause
    if (options.limit) {
      sql += ` LIMIT ${options.limit}`;
    }
    
    // OFFSET clause
    if (options.offset) {
      sql += ` OFFSET ${options.offset}`;
    }
    
    return { sql, parameters };
  },

  /**
   * Generate cache key for database queries
   */
  generateCacheKey: (
    operation: string,
    table: string,
    conditions?: Record<string, any>,
    options?: any
  ): string => {
    const crypto = require('crypto');
    const keyData = { operation, table, conditions, options };
    return crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex');
  },

  /**
   * Extract table names from SQL query
   */
  extractTableNames: (sql: string): string[] => {
    const tableRegex = /(?:FROM|JOIN|UPDATE|INSERT INTO|DELETE FROM)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi;
    const matches = sql.match(tableRegex);
    
    if (!matches) return [];
    
    return matches.map(match => 
      match.replace(/(?:FROM|JOIN|UPDATE|INSERT INTO|DELETE FROM)\s+/i, '').trim()
    );
  },

  /**
   * Validate SQL query for safety
   */
  validateSQL: (sql: string): { valid: boolean; issues: string[] } => {
    const issues: string[] = [];
    
    // Check for dangerous operations
    const dangerousPatterns = [
      /DROP\s+TABLE/i,
      /DROP\s+DATABASE/i,
      /TRUNCATE/i,
      /DELETE\s+FROM\s+\w+\s*$/i, // DELETE without WHERE
      /UPDATE\s+\w+\s+SET\s+.*\s*$/i // UPDATE without WHERE
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(sql)) {
        issues.push(`Potentially dangerous SQL pattern detected: ${pattern.source}`);
      }
    }
    
    // Check for SQL injection patterns
    const injectionPatterns = [
      /['"];?\s*--/i,
      /['"];?\s*\/\*/i,
      /UNION\s+SELECT/i,
      /OR\s+1\s*=\s*1/i
    ];
    
    for (const pattern of injectionPatterns) {
      if (pattern.test(sql)) {
        issues.push(`Potential SQL injection pattern detected: ${pattern.source}`);
      }
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  },

  /**
   * Optimize SQL query
   */
  optimizeSQL: (sql: string): {
    optimizedSQL: string;
    optimizations: string[];
  } => {
    let optimizedSQL = sql;
    const optimizations: string[] = [];
    
    // Remove unnecessary whitespace
    optimizedSQL = optimizedSQL.replace(/\s+/g, ' ').trim();
    optimizations.push('Removed unnecessary whitespace');
    
    // Add LIMIT if missing for SELECT queries without aggregation
    if (/^SELECT\s+(?!COUNT|SUM|AVG|MIN|MAX)/i.test(optimizedSQL) && 
        !/LIMIT\s+\d+/i.test(optimizedSQL)) {
      optimizedSQL += ' LIMIT 1000';
      optimizations.push('Added default LIMIT to prevent large result sets');
    }
    
    return {
      optimizedSQL,
      optimizations
    };
  }
};

// Cache utility functions
export const CacheUtils = {
  /**
   * Generate cache tags from table operations
   */
  generateCacheTags: (
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
    tables: string[]
  ): string[] => {
    const tags = [...tables];
    
    // Add operation-specific tags
    switch (operation) {
      case 'SELECT':
        tags.push('read-operation');
        break;
      case 'INSERT':
      case 'UPDATE':
      case 'DELETE':
        tags.push('write-operation');
        break;
    }
    
    return tags;
  },

  /**
   * Calculate optimal TTL based on data characteristics
   */
  calculateOptimalTTL: (
    dataType: 'static' | 'semi-static' | 'dynamic' | 'real-time',
    accessFrequency: 'high' | 'medium' | 'low'
  ): number => {
    const baseTTL = {
      'static': 24 * 60 * 60 * 1000, // 24 hours
      'semi-static': 60 * 60 * 1000, // 1 hour
      'dynamic': 15 * 60 * 1000, // 15 minutes
      'real-time': 60 * 1000 // 1 minute
    };
    
    const frequencyMultiplier = {
      'high': 1.5,
      'medium': 1.0,
      'low': 0.5
    };
    
    return baseTTL[dataType] * frequencyMultiplier[accessFrequency];
  },

  /**
   * Determine if data should be cached
   */
  shouldCache: (
    queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
    resultSize: number,
    executionTime: number
  ): boolean => {
    // Only cache SELECT queries
    if (queryType !== 'SELECT') {
      return false;
    }
    
    // Don't cache very large results (>10MB)
    if (resultSize > 10 * 1024 * 1024) {
      return false;
    }
    
    // Cache queries that take longer than 50ms
    if (executionTime > 50) {
      return true;
    }
    
    // Cache small, frequently accessed data
    if (resultSize < 1024 * 1024 && executionTime > 10) {
      return true;
    }
    
    return false;
  }
};

// Performance monitoring utilities
export const PerformanceUtils = {
  /**
   * Analyze query performance
   */
  analyzeQueryPerformance: (metrics: QueryMetrics[]): {
    slowQueries: QueryMetrics[];
    averageExecutionTime: number;
    cacheHitRate: number;
    recommendations: string[];
  } => {
    const slowQueries = metrics.filter(m => (m.duration || 0) > 1000);
    const totalQueries = metrics.length;
    const cachedQueries = metrics.filter(m => m.cached).length;
    
    const averageExecutionTime = totalQueries > 0 ? 
      metrics.reduce((sum, m) => sum + (m.duration || 0), 0) / totalQueries : 0;
    
    const cacheHitRate = totalQueries > 0 ? cachedQueries / totalQueries : 0;
    
    const recommendations: string[] = [];
    
    if (slowQueries.length > totalQueries * 0.1) {
      recommendations.push('High number of slow queries detected. Consider query optimization.');
    }
    
    if (cacheHitRate < 0.5) {
      recommendations.push('Low cache hit rate. Consider increasing cache TTL or improving cache strategy.');
    }
    
    if (averageExecutionTime > 500) {
      recommendations.push('High average execution time. Consider database optimization.');
    }
    
    return {
      slowQueries,
      averageExecutionTime,
      cacheHitRate,
      recommendations
    };
  },

  /**
   * Generate performance report
   */
  generatePerformanceReport: (
    dbMetrics: ConnectionMetrics,
    cacheStats: CacheStats,
    accessMetrics: DataAccessMetrics
  ): {
    summary: {
      overallHealth: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
      score: number;
    };
    database: {
      connectionUtilization: number;
      averageQueryTime: number;
      slowQueryRate: number;
    };
    cache: {
      hitRate: number;
      memoryUsage: number;
      efficiency: number;
    };
    recommendations: string[];
  } => {
    const recommendations: string[] = [];
    let score = 100;
    
    // Database analysis
    const connectionUtilization = dbMetrics.activeConnections / dbMetrics.totalConnections;
    const slowQueryRate = dbMetrics.slowQueries / Math.max(1, dbMetrics.totalQueries);
    
    if (connectionUtilization > 0.8) {
      score -= 15;
      recommendations.push('High database connection utilization. Consider connection pooling optimization.');
    }
    
    if (dbMetrics.averageQueryTime > 100) {
      score -= 20;
      recommendations.push('High average query time. Consider query optimization and indexing.');
    }
    
    if (slowQueryRate > 0.1) {
      score -= 15;
      recommendations.push('High slow query rate. Review and optimize slow queries.');
    }
    
    // Cache analysis
    const cacheEfficiency = cacheStats.hitRate * (1 - cacheStats.memoryUsage / 100);
    
    if (cacheStats.hitRate < 0.7) {
      score -= 10;
      recommendations.push('Low cache hit rate. Consider cache strategy optimization.');
    }
    
    if (cacheStats.memoryUsage > 80) {
      score -= 10;
      recommendations.push('High cache memory usage. Consider cache size optimization.');
    }
    
    const overallHealth = score >= 90 ? 'EXCELLENT' :
                         score >= 75 ? 'GOOD' :
                         score >= 60 ? 'FAIR' : 'POOR';
    
    return {
      summary: {
        overallHealth,
        score: Math.max(0, score)
      },
      database: {
        connectionUtilization,
        averageQueryTime: dbMetrics.averageQueryTime,
        slowQueryRate
      },
      cache: {
        hitRate: cacheStats.hitRate,
        memoryUsage: cacheStats.memoryUsage,
        efficiency: cacheEfficiency
      },
      recommendations
    };
  }
};

// Factory functions for creating optimized instances
export const DatabaseFactory = {
  /**
   * Create optimized database instance
   */
  createOptimizedDatabase: async (config?: Partial<DatabaseConfig>) => {
    const { CacheManager } = await import('../caching/CacheManager');
    const { DatabaseOptimizer } = await import('./DatabaseOptimizer');
    const { DataAccessLayer } = await import('./DataAccessLayer');
    
    // Create cache manager
    const cacheManager = new CacheManager(defaultCacheConfig);
    await cacheManager.initialize();
    
    // Create database optimizer
    const dbOptimizer = new DatabaseOptimizer(
      { ...defaultDatabaseConfig, ...config },
      cacheManager
    );
    await dbOptimizer.initialize();
    
    // Create data access layer
    const dataAccess = new DataAccessLayer(
      defaultDataAccessConfig,
      dbOptimizer,
      cacheManager
    );
    await dataAccess.initialize();
    
    return {
      cacheManager,
      dbOptimizer,
      dataAccess
    };
  },

  /**
   * Create high-performance database instance
   */
  createHighPerformanceDatabase: async () => {
    const highPerfConfig: Partial<DatabaseConfig> = {
      optimization: {
        connectionPooling: {
          enabled: true,
          min: 5,
          max: 50,
          idleTimeoutMillis: 10000,
          connectionTimeoutMillis: 1000,
          acquireTimeoutMillis: 30000
        },
        queryOptimization: {
          enabled: true,
          preparedStatements: true,
          queryTimeout: 10000,
          slowQueryThreshold: 500,
          explainAnalyze: true
        },
        indexManagement: {
          enabled: true,
          autoCreateIndexes: true,
          indexUsageTracking: true,
          unusedIndexThreshold: 7
        },
        caching: {
          enabled: true,
          queryResultCache: true,
          schemaCache: true,
          defaultTTL: 10 * 60 * 1000 // 10 minutes
        }
      }
    };
    
    return DatabaseFactory.createOptimizedDatabase(highPerfConfig);
  }
};

// Export default instances
export default {
  DatabaseUtils,
  CacheUtils,
  PerformanceUtils,
  DatabaseFactory
};