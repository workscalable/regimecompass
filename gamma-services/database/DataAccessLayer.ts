import { EventEmitter } from 'events';
import { DatabaseOptimizer } from './DatabaseOptimizer';
import { CacheManager } from '../caching/CacheManager';
import { logger } from '../logging/Logger';
import { auditLogger } from '../logging/AuditLogger';

export interface DataAccessConfig {
  caching: {
    enabled: boolean;
    defaultTTL: number;
    strategies: {
      readThrough: boolean;
      writeThrough: boolean;
      writeBehind: boolean;
      refresh: boolean;
    };
    invalidation: {
      onWrite: boolean;
      onDelete: boolean;
      cascading: boolean;
    };
  };
  optimization: {
    batchOperations: boolean;
    lazyLoading: boolean;
    prefetching: boolean;
    compression: boolean;
  };
  monitoring: {
    trackPerformance: boolean;
    logSlowOperations: boolean;
    alertThresholds: {
      slowRead: number;
      slowWrite: number;
      highCacheMiss: number;
    };
  };
}

export interface QueryOptions {
  cache?: boolean;
  cacheTTL?: number;
  cacheKey?: string;
  tags?: string[];
  timeout?: number;
  explain?: boolean;
  batch?: boolean;
}

export interface WriteOptions {
  invalidateCache?: boolean;
  cascadeInvalidation?: boolean;
  batch?: boolean;
  transaction?: boolean;
}

export interface DataAccessMetrics {
  reads: {
    total: number;
    cached: number;
    database: number;
    averageTime: number;
    cacheHitRate: number;
  };
  writes: {
    total: number;
    averageTime: number;
    batchedOperations: number;
  };
  cache: {
    hits: number;
    misses: number;
    invalidations: number;
    size: number;
  };
  performance: {
    slowReads: number;
    slowWrites: number;
    errors: number;
  };
}

export class DataAccessLayer extends EventEmitter {
  private config: DataAccessConfig;
  private dbOptimizer: DatabaseOptimizer;
  private cacheManager: CacheManager;
  private metrics: DataAccessMetrics;
  private batchQueue: Map<string, any[]> = new Map();
  private batchTimer?: NodeJS.Timeout;

  constructor(
    config: DataAccessConfig,
    dbOptimizer: DatabaseOptimizer,
    cacheManager: CacheManager
  ) {
    super();
    this.config = config;
    this.dbOptimizer = dbOptimizer;
    this.cacheManager = cacheManager;
    
    this.metrics = {
      reads: {
        total: 0,
        cached: 0,
        database: 0,
        averageTime: 0,
        cacheHitRate: 0
      },
      writes: {
        total: 0,
        averageTime: 0,
        batchedOperations: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        invalidations: 0,
        size: 0
      },
      performance: {
        slowReads: 0,
        slowWrites: 0,
        errors: 0
      }
    };
  }

  public async initialize(): Promise<void> {
    console.log('🔗 Initializing Data Access Layer...');
    
    try {
      // Setup batch processing if enabled
      if (this.config.optimization.batchOperations) {
        this.setupBatchProcessing();
      }
      
      // Setup cache event listeners
      this.setupCacheEventListeners();
      
      console.log('✅ Data Access Layer initialized');
      this.emit('initialized');
      
      // Log initialization
      await auditLogger.logSystemStart({
        component: 'DataAccessLayer',
        metadata: {
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          config: {
            caching: this.config.caching.enabled,
            batchOperations: this.config.optimization.batchOperations,
            monitoring: this.config.monitoring.trackPerformance
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize Data Access Layer:', error);
      throw error;
    }
  }

  // Read Operations
  public async findById<T>(
    table: string,
    id: string | number,
    options: QueryOptions = {}
  ): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      const cacheKey = options.cacheKey || `${table}:${id}`;
      
      // Try cache first if enabled
      if (this.shouldUseCache(options.cache)) {
        const cached = await this.cacheManager.get<T>(cacheKey);
        if (cached) {
          this.recordReadMetrics(Date.now() - startTime, true);
          return cached;
        }
      }
      
      // Query database
      const sql = `SELECT * FROM ${table} WHERE id = $1`;
      const result = await this.dbOptimizer.query<T>(sql, [id], {
        cache: options.cache,
        cacheTTL: options.cacheTTL,
        cacheKey,
        timeout: options.timeout,
        explain: options.explain
      });
      
      const record = result.rows[0] || null;
      
      // Cache result if found and caching is enabled
      if (record && this.shouldUseCache(options.cache)) {
        await this.cacheManager.set(cacheKey, record, {
          ttl: options.cacheTTL || this.config.caching.defaultTTL,
          tags: options.tags || [table]
        });
      }
      
      this.recordReadMetrics(result.duration, false);
      
      return record;
      
    } catch (error) {
      this.metrics.performance.errors++;
      console.error('FindById error:', error);
      throw error;
    }
  }

  public async findMany<T>(
    table: string,
    conditions: Record<string, any> = {},
    options: QueryOptions & {
      orderBy?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<T[]> {
    const startTime = Date.now();
    
    try {
      const cacheKey = options.cacheKey || this.generateFindManyKey(table, conditions, options);
      
      // Try cache first if enabled
      if (this.shouldUseCache(options.cache)) {
        const cached = await this.cacheManager.get<T[]>(cacheKey);
        if (cached) {
          this.recordReadMetrics(Date.now() - startTime, true);
          return cached;
        }
      }
      
      // Build query
      const { sql, parameters } = this.buildSelectQuery(table, conditions, options);
      
      // Execute query
      const result = await this.dbOptimizer.query<T>(sql, parameters, {
        cache: options.cache,
        cacheTTL: options.cacheTTL,
        cacheKey,
        timeout: options.timeout,
        explain: options.explain
      });
      
      // Cache result if caching is enabled
      if (this.shouldUseCache(options.cache)) {
        await this.cacheManager.set(cacheKey, result.rows, {
          ttl: options.cacheTTL || this.config.caching.defaultTTL,
          tags: options.tags || [table]
        });
      }
      
      this.recordReadMetrics(result.duration, false);
      
      return result.rows;
      
    } catch (error) {
      this.metrics.performance.errors++;
      console.error('FindMany error:', error);
      throw error;
    }
  }

  public async findOne<T>(
    table: string,
    conditions: Record<string, any>,
    options: QueryOptions = {}
  ): Promise<T | null> {
    const results = await this.findMany<T>(table, conditions, { ...options, limit: 1 });
    return results[0] || null;
  }

  public async count(
    table: string,
    conditions: Record<string, any> = {},
    options: QueryOptions = {}
  ): Promise<number> {
    const startTime = Date.now();
    
    try {
      const cacheKey = options.cacheKey || `count:${table}:${JSON.stringify(conditions)}`;
      
      // Try cache first if enabled
      if (this.shouldUseCache(options.cache)) {
        const cached = await this.cacheManager.get<number>(cacheKey);
        if (cached !== null) {
          this.recordReadMetrics(Date.now() - startTime, true);
          return cached;
        }
      }
      
      // Build count query
      const { sql, parameters } = this.buildCountQuery(table, conditions);
      
      // Execute query
      const result = await this.dbOptimizer.query<{ count: string }>(sql, parameters, {
        cache: options.cache,
        cacheTTL: options.cacheTTL,
        cacheKey,
        timeout: options.timeout
      });
      
      const count = parseInt(result.rows[0].count);
      
      // Cache result if caching is enabled
      if (this.shouldUseCache(options.cache)) {
        await this.cacheManager.set(cacheKey, count, {
          ttl: options.cacheTTL || this.config.caching.defaultTTL,
          tags: options.tags || [table]
        });
      }
      
      this.recordReadMetrics(result.duration, false);
      
      return count;
      
    } catch (error) {
      this.metrics.performance.errors++;
      console.error('Count error:', error);
      throw error;
    }
  }

  // Write Operations
  public async create<T>(
    table: string,
    data: Partial<T>,
    options: WriteOptions = {}
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      if (options.batch && this.config.optimization.batchOperations) {
        return this.addToBatch('create', table, data, options);
      }
      
      const { sql, parameters } = this.buildInsertQuery(table, data);
      
      const result = await this.dbOptimizer.query<T>(`${sql} RETURNING *`, parameters);
      const created = result.rows[0];
      
      // Handle cache invalidation
      if (options.invalidateCache !== false && this.config.caching.invalidation.onWrite) {
        await this.invalidateTableCache(table, options.cascadeInvalidation);
      }
      
      // Cache the new record if write-through caching is enabled
      if (this.config.caching.strategies.writeThrough) {
        const cacheKey = `${table}:${(created as any).id}`;
        await this.cacheManager.set(cacheKey, created, {
          ttl: this.config.caching.defaultTTL,
          tags: [table]
        });
      }
      
      this.recordWriteMetrics(result.duration);
      
      // Log write operation
      await auditLogger.logEvent(
        'DATA_MODIFICATION',
        'database',
        'create',
        { table, recordId: (created as any).id },
        'SUCCESS',
        { component: 'DataAccessLayer', operation: 'create' }
      );
      
      return created;
      
    } catch (error) {
      this.metrics.performance.errors++;
      console.error('Create error:', error);
      throw error;
    }
  }

  public async update<T>(
    table: string,
    id: string | number,
    data: Partial<T>,
    options: WriteOptions = {}
  ): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      if (options.batch && this.config.optimization.batchOperations) {
        return this.addToBatch('update', table, { id, ...data }, options);
      }
      
      const { sql, parameters } = this.buildUpdateQuery(table, id, data);
      
      const result = await this.dbOptimizer.query<T>(`${sql} RETURNING *`, parameters);
      const updated = result.rows[0] || null;
      
      // Handle cache invalidation
      if (options.invalidateCache !== false && this.config.caching.invalidation.onWrite) {
        await this.invalidateRecordCache(table, id);
        
        if (options.cascadeInvalidation) {
          await this.invalidateTableCache(table, true);
        }
      }
      
      // Update cache if write-through caching is enabled
      if (updated && this.config.caching.strategies.writeThrough) {
        const cacheKey = `${table}:${id}`;
        await this.cacheManager.set(cacheKey, updated, {
          ttl: this.config.caching.defaultTTL,
          tags: [table]
        });
      }
      
      this.recordWriteMetrics(result.duration);
      
      // Log write operation
      await auditLogger.logEvent(
        'DATA_MODIFICATION',
        'database',
        'update',
        { table, recordId: id },
        'SUCCESS',
        { component: 'DataAccessLayer', operation: 'update' }
      );
      
      return updated;
      
    } catch (error) {
      this.metrics.performance.errors++;
      console.error('Update error:', error);
      throw error;
    }
  }

  public async delete(
    table: string,
    id: string | number,
    options: WriteOptions = {}
  ): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      if (options.batch && this.config.optimization.batchOperations) {
        return this.addToBatch('delete', table, { id }, options);
      }
      
      const sql = `DELETE FROM ${table} WHERE id = $1`;
      const result = await this.dbOptimizer.query(sql, [id]);
      
      const deleted = result.rowCount > 0;
      
      // Handle cache invalidation
      if (options.invalidateCache !== false && this.config.caching.invalidation.onDelete) {
        await this.invalidateRecordCache(table, id);
        
        if (options.cascadeInvalidation) {
          await this.invalidateTableCache(table, true);
        }
      }
      
      this.recordWriteMetrics(result.duration);
      
      // Log write operation
      await auditLogger.logEvent(
        'DATA_DELETION',
        'database',
        'delete',
        { table, recordId: id, deleted },
        'SUCCESS',
        { component: 'DataAccessLayer', operation: 'delete' }
      );
      
      return deleted;
      
    } catch (error) {
      this.metrics.performance.errors++;
      console.error('Delete error:', error);
      throw error;
    }
  }

  // Batch Operations
  public async executeBatch(batchKey?: string): Promise<void> {
    if (!this.config.optimization.batchOperations) {
      return;
    }
    
    const batches = batchKey ? 
      [this.batchQueue.get(batchKey)] : 
      Array.from(this.batchQueue.values());
    
    for (const batch of batches) {
      if (!batch || batch.length === 0) continue;
      
      try {
        await this.dbOptimizer.transaction(async (client) => {
          for (const operation of batch) {
            await this.executeBatchOperation(operation, client);
          }
        });
        
        this.metrics.writes.batchedOperations += batch.length;
        
      } catch (error) {
        console.error('Batch execution error:', error);
        throw error;
      }
    }
    
    // Clear processed batches
    if (batchKey) {
      this.batchQueue.delete(batchKey);
    } else {
      this.batchQueue.clear();
    }
  }

  // Cache Management
  public async invalidateCache(pattern?: string, tags?: string[]): Promise<number> {
    let invalidatedCount = 0;
    
    if (pattern) {
      invalidatedCount += await this.cacheManager.invalidateByPattern(pattern);
    }
    
    if (tags) {
      invalidatedCount += await this.cacheManager.invalidateByTags(tags);
    }
    
    this.metrics.cache.invalidations += invalidatedCount;
    
    return invalidatedCount;
  }

  public async warmupCache(table: string, conditions?: Record<string, any>): Promise<void> {
    console.log(`🔥 Warming up cache for table: ${table}`);
    
    try {
      // Load frequently accessed records
      const records = await this.findMany(table, conditions || {}, {
        cache: false, // Don't use cache for warmup
        limit: 100
      });
      
      // Cache each record individually
      for (const record of records) {
        const cacheKey = `${table}:${(record as any).id}`;
        await this.cacheManager.set(cacheKey, record, {
          ttl: this.config.caching.defaultTTL,
          tags: [table]
        });
      }
      
      console.log(`✅ Cache warmed up for ${records.length} records in ${table}`);
      
    } catch (error) {
      console.error('Cache warmup error:', error);
    }
  }

  // Metrics and Monitoring
  public getMetrics(): DataAccessMetrics {
    // Update cache metrics from cache manager
    const cacheStats = this.cacheManager.getStats();
    this.metrics.cache.hits = cacheStats.totalHits;
    this.metrics.cache.size = cacheStats.totalEntries;
    
    // Calculate cache hit rate
    this.metrics.reads.cacheHitRate = this.metrics.reads.total > 0 ? 
      this.metrics.reads.cached / this.metrics.reads.total : 0;
    
    return { ...this.metrics };
  }

  public async getPerformanceReport(): Promise<{
    summary: {
      totalOperations: number;
      cacheHitRate: number;
      averageReadTime: number;
      averageWriteTime: number;
    };
    recommendations: string[];
  }> {
    const metrics = this.getMetrics();
    const recommendations: string[] = [];
    
    // Analyze performance and generate recommendations
    if (metrics.reads.cacheHitRate < 0.7) {
      recommendations.push('Cache hit rate is low. Consider increasing cache TTL or warming up cache.');
    }
    
    if (metrics.performance.slowReads > metrics.reads.total * 0.1) {
      recommendations.push('High number of slow reads detected. Consider optimizing queries or adding indexes.');
    }
    
    if (metrics.performance.slowWrites > metrics.writes.total * 0.05) {
      recommendations.push('Slow writes detected. Consider using batch operations or optimizing write queries.');
    }
    
    return {
      summary: {
        totalOperations: metrics.reads.total + metrics.writes.total,
        cacheHitRate: metrics.reads.cacheHitRate,
        averageReadTime: metrics.reads.averageTime,
        averageWriteTime: metrics.writes.averageTime
      },
      recommendations
    };
  }

  // Private Helper Methods
  private shouldUseCache(cacheOption?: boolean): boolean {
    if (cacheOption !== undefined) {
      return cacheOption;
    }
    return this.config.caching.enabled;
  }

  private generateFindManyKey(
    table: string,
    conditions: Record<string, any>,
    options: any
  ): string {
    const keyData = {
      table,
      conditions,
      orderBy: options.orderBy,
      limit: options.limit,
      offset: options.offset
    };
    
    const crypto = require('crypto');
    return crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex');
  }

  private buildSelectQuery(
    table: string,
    conditions: Record<string, any>,
    options: any
  ): { sql: string; parameters: any[] } {
    let sql = `SELECT * FROM ${table}`;
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
  }

  private buildCountQuery(
    table: string,
    conditions: Record<string, any>
  ): { sql: string; parameters: any[] } {
    let sql = `SELECT COUNT(*) as count FROM ${table}`;
    const parameters: any[] = [];
    let paramIndex = 1;
    
    if (Object.keys(conditions).length > 0) {
      const whereConditions = Object.entries(conditions).map(([key, value]) => {
        parameters.push(value);
        return `${key} = $${paramIndex++}`;
      });
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    return { sql, parameters };
  }

  private buildInsertQuery(
    table: string,
    data: Record<string, any>
  ): { sql: string; parameters: any[] } {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, index) => `$${index + 1}`);
    
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
    
    return { sql, parameters: values };
  }

  private buildUpdateQuery(
    table: string,
    id: string | number,
    data: Record<string, any>
  ): { sql: string; parameters: any[] } {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, index) => `${col} = $${index + 1}`);
    
    const sql = `UPDATE ${table} SET ${setClause.join(', ')} WHERE id = $${columns.length + 1}`;
    const parameters = [...values, id];
    
    return { sql, parameters };
  }

  private async invalidateRecordCache(table: string, id: string | number): Promise<void> {
    const cacheKey = `${table}:${id}`;
    await this.cacheManager.delete(cacheKey);
  }

  private async invalidateTableCache(table: string, cascade: boolean = false): Promise<void> {
    await this.cacheManager.invalidateByTags([table]);
    
    if (cascade) {
      // Invalidate related patterns
      await this.cacheManager.invalidateByPattern(`${table}:*`);
      await this.cacheManager.invalidateByPattern(`count:${table}:*`);
    }
  }

  private recordReadMetrics(duration: number, cached: boolean): void {
    this.metrics.reads.total++;
    
    if (cached) {
      this.metrics.reads.cached++;
    } else {
      this.metrics.reads.database++;
    }
    
    // Update average time
    this.metrics.reads.averageTime = 
      (this.metrics.reads.averageTime * (this.metrics.reads.total - 1) + duration) / 
      this.metrics.reads.total;
    
    // Check for slow reads
    if (duration > this.config.monitoring.alertThresholds.slowRead) {
      this.metrics.performance.slowReads++;
    }
  }

  private recordWriteMetrics(duration: number): void {
    this.metrics.writes.total++;
    
    // Update average time
    this.metrics.writes.averageTime = 
      (this.metrics.writes.averageTime * (this.metrics.writes.total - 1) + duration) / 
      this.metrics.writes.total;
    
    // Check for slow writes
    if (duration > this.config.monitoring.alertThresholds.slowWrite) {
      this.metrics.performance.slowWrites++;
    }
  }

  private setupBatchProcessing(): void {
    // Process batches every 100ms
    this.batchTimer = setInterval(() => {
      this.executeBatch().catch(console.error);
    }, 100);
  }

  private setupCacheEventListeners(): void {
    this.cacheManager.on('cacheHit', () => {
      this.metrics.cache.hits++;
    });
    
    this.cacheManager.on('cacheMiss', () => {
      this.metrics.cache.misses++;
    });
  }

  private addToBatch(operation: string, table: string, data: any, options: WriteOptions): any {
    const batchKey = `${table}:${operation}`;
    
    if (!this.batchQueue.has(batchKey)) {
      this.batchQueue.set(batchKey, []);
    }
    
    this.batchQueue.get(batchKey)!.push({
      operation,
      table,
      data,
      options
    });
    
    // Return a promise that will be resolved when batch is executed
    return new Promise((resolve, reject) => {
      // This is a simplified implementation
      // In a real scenario, you'd want to track individual operations in the batch
      setTimeout(() => {
        resolve(data);
      }, 100);
    });
  }

  private async executeBatchOperation(operation: any, client: any): Promise<void> {
    // Execute individual batch operation
    // This would need to be implemented based on the specific operation type
    console.log('Executing batch operation:', operation);
  }

  public async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Data Access Layer...');
    
    // Clear batch timer
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    
    // Execute remaining batches
    if (this.config.optimization.batchOperations) {
      await this.executeBatch();
    }
    
    // Log final metrics
    const finalMetrics = this.getMetrics();
    
    await auditLogger.logSystemStop({
      component: 'DataAccessLayer',
      metadata: {
        uptime: Date.now(),
        reason: 'shutdown',
        finalMetrics: {
          totalReads: finalMetrics.reads.total,
          totalWrites: finalMetrics.writes.total,
          cacheHitRate: finalMetrics.reads.cacheHitRate
        }
      }
    });
    
    console.log('✅ Data Access Layer shutdown complete');
    this.emit('shutdown');
  }
}

// Default data access configuration
export const defaultDataAccessConfig: DataAccessConfig = {
  caching: {
    enabled: true,
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    strategies: {
      readThrough: true,
      writeThrough: true,
      writeBehind: false,
      refresh: false
    },
    invalidation: {
      onWrite: true,
      onDelete: true,
      cascading: false
    }
  },
  optimization: {
    batchOperations: true,
    lazyLoading: true,
    prefetching: false,
    compression: true
  },
  monitoring: {
    trackPerformance: true,
    logSlowOperations: true,
    alertThresholds: {
      slowRead: 100, // 100ms
      slowWrite: 200, // 200ms
      highCacheMiss: 0.3 // 30%
    }
  }
};