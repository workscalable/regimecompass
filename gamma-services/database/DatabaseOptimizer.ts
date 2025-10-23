import { EventEmitter } from 'events';
import { Pool, PoolClient, PoolConfig } from 'pg';
import { CacheManager } from '../caching/CacheManager';
import { logger } from '../logging/Logger';
import { auditLogger } from '../logging/AuditLogger';

export interface DatabaseConfig {
  connection: PoolConfig;
  optimization: {
    connectionPooling: {
      enabled: boolean;
      min: number;
      max: number;
      idleTimeoutMillis: number;
      connectionTimeoutMillis: number;
      acquireTimeoutMillis: number;
    };
    queryOptimization: {
      enabled: boolean;
      preparedStatements: boolean;
      queryTimeout: number;
      slowQueryThreshold: number;
      explainAnalyze: boolean;
    };
    indexManagement: {
      enabled: boolean;
      autoCreateIndexes: boolean;
      indexUsageTracking: boolean;
      unusedIndexThreshold: number; // days
    };
    caching: {
      enabled: boolean;
      queryResultCache: boolean;
      schemaCache: boolean;
      defaultTTL: number;
    };
  };
  monitoring: {
    enabled: boolean;
    trackQueryPerformance: boolean;
    trackConnectionUsage: boolean;
    alertThresholds: {
      slowQuery: number;
      highConnectionUsage: number;
      longRunningQuery: number;
    };
  };
}

export interface QueryMetrics {
  queryId: string;
  sql: string;
  parameters?: any[];
  startTime: Date;
  endTime?: Date;
  duration?: number;
  rowCount?: number;
  cached: boolean;
  connectionId?: string;
  executionPlan?: any;
  error?: string;
}

export interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  averageQueryTime: number;
  slowQueries: number;
  totalQueries: number;
  connectionErrors: number;
}

export interface IndexInfo {
  schemaName: string;
  tableName: string;
  indexName: string;
  columns: string[];
  isUnique: boolean;
  size: number; // bytes
  scans: number;
  tuplesRead: number;
  tuplesInserted: number;
  lastUsed?: Date;
  createdAt: Date;
}

export interface QueryPlan {
  nodeType: string;
  totalCost: number;
  rows: number;
  width: number;
  actualTime?: number;
  actualRows?: number;
  children?: QueryPlan[];
}

export class DatabaseOptimizer extends EventEmitter {
  private config: DatabaseConfig;
  private pool: Pool;
  private cacheManager?: CacheManager;
  private queryMetrics: Map<string, QueryMetrics> = new Map();
  private preparedStatements: Map<string, string> = new Map();
  private indexUsage: Map<string, IndexInfo> = new Map();
  private monitoringTimer?: NodeJS.Timeout;
  private connectionMetrics: ConnectionMetrics;

  constructor(config: DatabaseConfig, cacheManager?: CacheManager) {
    super();
    this.config = config;
    this.cacheManager = cacheManager;
    
    // Initialize connection pool
    this.pool = new Pool({
      ...config.connection,
      min: config.optimization.connectionPooling.min,
      max: config.optimization.connectionPooling.max,
      idleTimeoutMillis: config.optimization.connectionPooling.idleTimeoutMillis,
      connectionTimeoutMillis: config.optimization.connectionPooling.connectionTimeoutMillis,
      acquireTimeoutMillis: config.optimization.connectionPooling.acquireTimeoutMillis
    });
    
    this.connectionMetrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      averageQueryTime: 0,
      slowQueries: 0,
      totalQueries: 0,
      connectionErrors: 0
    };
    
    this.setupPoolEventListeners();
  }

  public async initialize(): Promise<void> {
    console.log('🗃️ Initializing Database Optimizer...');
    
    try {
      // Test database connection
      await this.testConnection();
      
      // Load existing indexes
      if (this.config.optimization.indexManagement.enabled) {
        await this.loadIndexInformation();
      }
      
      // Start monitoring
      if (this.config.monitoring.enabled) {
        this.startMonitoring();
      }
      
      console.log('✅ Database Optimizer initialized');
      this.emit('initialized');
      
      // Log initialization
      await auditLogger.logSystemStart({
        component: 'DatabaseOptimizer',
        metadata: {
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          config: {
            maxConnections: this.config.optimization.connectionPooling.max,
            queryOptimization: this.config.optimization.queryOptimization.enabled,
            caching: this.config.optimization.caching.enabled
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize Database Optimizer:', error);
      throw error;
    }
  }

  public async query<T = any>(
    sql: string,
    parameters?: any[],
    options: {
      cache?: boolean;
      cacheTTL?: number;
      cacheKey?: string;
      timeout?: number;
      explain?: boolean;
    } = {}
  ): Promise<{
    rows: T[];
    rowCount: number;
    duration: number;
    cached: boolean;
    queryId: string;
  }> {
    const queryId = this.generateQueryId(sql, parameters);
    const startTime = new Date();
    
    // Check cache first if enabled
    if (this.shouldUseCache(options.cache) && this.cacheManager) {
      const cacheKey = options.cacheKey || this.generateCacheKey(sql, parameters);
      const cached = await this.cacheManager.get<T[]>(cacheKey);
      
      if (cached) {
        const duration = Date.now() - startTime.getTime();
        
        this.recordQueryMetrics({
          queryId,
          sql,
          parameters,
          startTime,
          endTime: new Date(),
          duration,
          rowCount: cached.length,
          cached: true
        });
        
        return {
          rows: cached,
          rowCount: cached.length,
          duration,
          cached: true,
          queryId
        };
      }
    }
    
    let client: PoolClient | null = null;
    
    try {
      // Get connection from pool
      client = await this.pool.connect();
      
      // Set query timeout if specified
      if (options.timeout || this.config.optimization.queryOptimization.queryTimeout) {
        const timeout = options.timeout || this.config.optimization.queryOptimization.queryTimeout;
        await client.query(`SET statement_timeout = ${timeout}`);
      }
      
      // Execute query with optional EXPLAIN ANALYZE
      let result;
      let executionPlan;
      
      if (options.explain || this.config.optimization.queryOptimization.explainAnalyze) {
        const explainResult = await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`, parameters);
        executionPlan = explainResult.rows[0]['QUERY PLAN'][0];
        
        // Execute the actual query
        result = await client.query(sql, parameters);
      } else {
        result = await client.query(sql, parameters);
      }
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      // Cache result if enabled
      if (this.shouldUseCache(options.cache) && this.cacheManager && result.rows.length > 0) {
        const cacheKey = options.cacheKey || this.generateCacheKey(sql, parameters);
        const cacheTTL = options.cacheTTL || this.config.optimization.caching.defaultTTL;
        
        await this.cacheManager.set(cacheKey, result.rows, {
          ttl: cacheTTL,
          tags: this.extractTableNames(sql)
        });
      }
      
      // Record metrics
      this.recordQueryMetrics({
        queryId,
        sql,
        parameters,
        startTime,
        endTime,
        duration,
        rowCount: result.rowCount,
        cached: false,
        connectionId: (client as any).processID?.toString(),
        executionPlan
      });
      
      // Check for slow queries
      if (duration > this.config.monitoring.alertThresholds.slowQuery) {
        this.handleSlowQuery(queryId, sql, duration, executionPlan);
      }
      
      return {
        rows: result.rows,
        rowCount: result.rowCount,
        duration,
        cached: false,
        queryId
      };
      
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      // Record error metrics
      this.recordQueryMetrics({
        queryId,
        sql,
        parameters,
        startTime,
        endTime,
        duration,
        cached: false,
        error: error instanceof Error ? error.message : String(error)
      });
      
      this.connectionMetrics.connectionErrors++;
      
      // Log error
      await auditLogger.logErrorOccurred(
        'DATABASE_QUERY_ERROR',
        error instanceof Error ? error.message : String(error),
        {
          component: 'DatabaseOptimizer',
          operation: 'query',
          metadata: { queryId, sql: sql.substring(0, 100) }
        }
      );
      
      throw error;
      
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  public async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
    options: {
      isolationLevel?: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
      timeout?: number;
    } = {}
  ): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Set isolation level if specified
      if (options.isolationLevel) {
        await client.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`);
      }
      
      // Set timeout if specified
      if (options.timeout) {
        await client.query(`SET statement_timeout = ${options.timeout}`);
      }
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      
      return result;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async createIndex(
    tableName: string,
    columns: string[],
    options: {
      unique?: boolean;
      concurrent?: boolean;
      where?: string;
      method?: 'btree' | 'hash' | 'gist' | 'gin' | 'brin';
      name?: string;
    } = {}
  ): Promise<string> {
    const indexName = options.name || `idx_${tableName}_${columns.join('_')}`;
    
    let sql = `CREATE ${options.unique ? 'UNIQUE ' : ''}INDEX ${options.concurrent ? 'CONCURRENTLY ' : ''}${indexName} ON ${tableName}`;
    
    if (options.method) {
      sql += ` USING ${options.method}`;
    }
    
    sql += ` (${columns.join(', ')})`;
    
    if (options.where) {
      sql += ` WHERE ${options.where}`;
    }
    
    try {
      await this.query(sql);
      
      // Record index information
      const indexInfo: IndexInfo = {
        schemaName: 'public',
        tableName,
        indexName,
        columns,
        isUnique: options.unique || false,
        size: 0,
        scans: 0,
        tuplesRead: 0,
        tuplesInserted: 0,
        createdAt: new Date()
      };
      
      this.indexUsage.set(indexName, indexInfo);
      
      // Log index creation
      await auditLogger.logEvent(
        'CONFIGURATION_CHANGED',
        'database',
        'create_index',
        { tableName, indexName, columns, options },
        'SUCCESS',
        { component: 'DatabaseOptimizer', operation: 'create_index' }
      );
      
      this.emit('indexCreated', { indexName, tableName, columns });
      
      return indexName;
      
    } catch (error) {
      console.error('Index creation failed:', error);
      throw error;
    }
  }

  public async analyzeQueryPerformance(sql: string, parameters?: any[]): Promise<{
    executionPlan: QueryPlan;
    recommendations: string[];
    estimatedCost: number;
    suggestedIndexes: Array<{
      table: string;
      columns: string[];
      reason: string;
    }>;
  }> {
    try {
      const explainResult = await this.query(
        `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`,
        parameters,
        { explain: false } // Avoid double EXPLAIN
      );
      
      const plan = explainResult.rows[0]['QUERY PLAN'][0];
      const recommendations: string[] = [];
      const suggestedIndexes: Array<{ table: string; columns: string[]; reason: string }> = [];
      
      // Analyze execution plan for optimization opportunities
      this.analyzeExecutionPlan(plan.Plan, recommendations, suggestedIndexes);
      
      return {
        executionPlan: plan.Plan,
        recommendations,
        estimatedCost: plan.Plan['Total Cost'],
        suggestedIndexes
      };
      
    } catch (error) {
      console.error('Query analysis failed:', error);
      throw error;
    }
  }

  public async optimizeTable(tableName: string): Promise<{
    vacuumResult: any;
    analyzeResult: any;
    reindexResult: any;
    statistics: {
      rowCount: number;
      tableSize: string;
      indexSize: string;
      totalSize: string;
    };
  }> {
    try {
      // VACUUM and ANALYZE
      const vacuumResult = await this.query(`VACUUM ANALYZE ${tableName}`);
      const analyzeResult = await this.query(`ANALYZE ${tableName}`);
      
      // REINDEX if needed
      const reindexResult = await this.query(`REINDEX TABLE ${tableName}`);
      
      // Get table statistics
      const statsQuery = `
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE tablename = $1
      `;
      
      const sizeQuery = `
        SELECT 
          pg_size_pretty(pg_total_relation_size($1)) as total_size,
          pg_size_pretty(pg_relation_size($1)) as table_size,
          pg_size_pretty(pg_total_relation_size($1) - pg_relation_size($1)) as index_size,
          (SELECT reltuples::bigint FROM pg_class WHERE relname = $1) as row_count
      `;
      
      const sizeResult = await this.query(sizeQuery, [tableName]);
      
      const statistics = {
        rowCount: sizeResult.rows[0].row_count,
        tableSize: sizeResult.rows[0].table_size,
        indexSize: sizeResult.rows[0].index_size,
        totalSize: sizeResult.rows[0].total_size
      };
      
      // Log optimization
      await auditLogger.logEvent(
        'CONFIGURATION_CHANGED',
        'database',
        'optimize_table',
        { tableName, statistics },
        'SUCCESS',
        { component: 'DatabaseOptimizer', operation: 'optimize_table' }
      );
      
      this.emit('tableOptimized', { tableName, statistics });
      
      return {
        vacuumResult,
        analyzeResult,
        reindexResult,
        statistics
      };
      
    } catch (error) {
      console.error('Table optimization failed:', error);
      throw error;
    }
  }

  public async getConnectionMetrics(): Promise<ConnectionMetrics> {
    try {
      // Update connection metrics from pool
      this.connectionMetrics.totalConnections = this.pool.totalCount;
      this.connectionMetrics.activeConnections = this.pool.totalCount - this.pool.idleCount;
      this.connectionMetrics.idleConnections = this.pool.idleCount;
      this.connectionMetrics.waitingClients = this.pool.waitingCount;
      
      // Calculate average query time
      const recentQueries = Array.from(this.queryMetrics.values())
        .filter(q => q.duration !== undefined)
        .slice(-100);
      
      if (recentQueries.length > 0) {
        this.connectionMetrics.averageQueryTime = 
          recentQueries.reduce((sum, q) => sum + (q.duration || 0), 0) / recentQueries.length;
      }
      
      // Count slow queries
      this.connectionMetrics.slowQueries = recentQueries
        .filter(q => (q.duration || 0) > this.config.monitoring.alertThresholds.slowQuery).length;
      
      this.connectionMetrics.totalQueries = this.queryMetrics.size;
      
      return { ...this.connectionMetrics };
      
    } catch (error) {
      console.error('Failed to get connection metrics:', error);
      return this.connectionMetrics;
    }
  }

  public async getSlowQueries(limit: number = 10): Promise<QueryMetrics[]> {
    return Array.from(this.queryMetrics.values())
      .filter(q => q.duration !== undefined)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, limit);
  }

  public async getIndexUsage(): Promise<IndexInfo[]> {
    if (!this.config.optimization.indexManagement.indexUsageTracking) {
      return Array.from(this.indexUsage.values());
    }
    
    try {
      // Update index usage statistics from database
      const usageQuery = `
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes
      `;
      
      const result = await this.query(usageQuery);
      
      for (const row of result.rows) {
        const indexInfo = this.indexUsage.get(row.indexname);
        if (indexInfo) {
          indexInfo.scans = row.idx_scan;
          indexInfo.tuplesRead = row.idx_tup_read;
          indexInfo.lastUsed = new Date();
        }
      }
      
      return Array.from(this.indexUsage.values());
      
    } catch (error) {
      console.error('Failed to get index usage:', error);
      return Array.from(this.indexUsage.values());
    }
  }

  public async findUnusedIndexes(): Promise<IndexInfo[]> {
    const allIndexes = await this.getIndexUsage();
    const unusedThreshold = this.config.optimization.indexManagement.unusedIndexThreshold * 24 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - unusedThreshold);
    
    return allIndexes.filter(index => 
      index.scans === 0 || 
      (index.lastUsed && index.lastUsed < cutoff)
    );
  }

  private async testConnection(): Promise<void> {
    try {
      const result = await this.query('SELECT NOW() as current_time');
      console.log('✅ Database connection test successful');
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      throw error;
    }
  }

  private async loadIndexInformation(): Promise<void> {
    try {
      const indexQuery = `
        SELECT 
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
      `;
      
      const result = await this.query(indexQuery);
      
      for (const row of result.rows) {
        // Parse index definition to extract columns
        const columns = this.parseIndexColumns(row.indexdef);
        
        const indexInfo: IndexInfo = {
          schemaName: row.schemaname,
          tableName: row.tablename,
          indexName: row.indexname,
          columns,
          isUnique: row.indexdef.includes('UNIQUE'),
          size: 0,
          scans: 0,
          tuplesRead: 0,
          tuplesInserted: 0,
          createdAt: new Date()
        };
        
        this.indexUsage.set(row.indexname, indexInfo);
      }
      
      console.log(`📊 Loaded ${this.indexUsage.size} indexes`);
      
    } catch (error) {
      console.error('Failed to load index information:', error);
    }
  }

  private parseIndexColumns(indexDef: string): string[] {
    // Simple parser for index columns - could be enhanced
    const match = indexDef.match(/\(([^)]+)\)/);
    if (match) {
      return match[1].split(',').map(col => col.trim());
    }
    return [];
  }

  private setupPoolEventListeners(): void {
    this.pool.on('connect', (client) => {
      this.emit('connectionCreated', { processId: (client as any).processID });
    });
    
    this.pool.on('error', (error, client) => {
      this.connectionMetrics.connectionErrors++;
      this.emit('connectionError', { error, processId: (client as any)?.processID });
    });
    
    this.pool.on('acquire', (client) => {
      this.emit('connectionAcquired', { processId: (client as any).processID });
    });
    
    this.pool.on('release', (client) => {
      this.emit('connectionReleased', { processId: (client as any).processID });
    });
  }

  private startMonitoring(): void {
    this.monitoringTimer = setInterval(async () => {
      try {
        const metrics = await this.getConnectionMetrics();
        
        // Check thresholds
        if (metrics.activeConnections / this.config.optimization.connectionPooling.max > 
            this.config.monitoring.alertThresholds.highConnectionUsage) {
          this.emit('highConnectionUsage', metrics);
        }
        
        this.emit('metricsUpdate', metrics);
        
      } catch (error) {
        console.error('Monitoring error:', error);
      }
    }, 30000); // Every 30 seconds
  }

  private generateQueryId(sql: string, parameters?: any[]): string {
    const crypto = require('crypto');
    const content = sql + (parameters ? JSON.stringify(parameters) : '');
    return crypto.createHash('md5').update(content).digest('hex');
  }

  private generateCacheKey(sql: string, parameters?: any[]): string {
    return `query:${this.generateQueryId(sql, parameters)}`;
  }

  private shouldUseCache(cacheOption?: boolean): boolean {
    if (cacheOption !== undefined) {
      return cacheOption;
    }
    return this.config.optimization.caching.enabled && 
           this.config.optimization.caching.queryResultCache;
  }

  private extractTableNames(sql: string): string[] {
    // Simple table name extraction - could be enhanced with proper SQL parsing
    const tableRegex = /(?:FROM|JOIN|UPDATE|INSERT INTO|DELETE FROM)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi;
    const matches = sql.match(tableRegex);
    
    if (!matches) return [];
    
    return matches.map(match => 
      match.replace(/(?:FROM|JOIN|UPDATE|INSERT INTO|DELETE FROM)\s+/i, '').trim()
    );
  }

  private recordQueryMetrics(metrics: QueryMetrics): void {
    this.queryMetrics.set(metrics.queryId, metrics);
    
    // Keep only recent queries (last 1000)
    if (this.queryMetrics.size > 1000) {
      const oldestKey = Array.from(this.queryMetrics.keys())[0];
      this.queryMetrics.delete(oldestKey);
    }
    
    this.emit('queryExecuted', metrics);
  }

  private handleSlowQuery(queryId: string, sql: string, duration: number, executionPlan?: any): void {
    this.connectionMetrics.slowQueries++;
    
    this.emit('slowQuery', {
      queryId,
      sql: sql.substring(0, 200),
      duration,
      executionPlan
    });
    
    // Log slow query
    auditLogger.logEvent(
      'ALERT_TRIGGERED',
      'database',
      'slow_query',
      { queryId, duration, threshold: this.config.monitoring.alertThresholds.slowQuery },
      'SUCCESS',
      { component: 'DatabaseOptimizer', operation: 'slow_query_detected' }
    );
  }

  private analyzeExecutionPlan(
    plan: any,
    recommendations: string[],
    suggestedIndexes: Array<{ table: string; columns: string[]; reason: string }>
  ): void {
    // Analyze for sequential scans
    if (plan['Node Type'] === 'Seq Scan') {
      recommendations.push(`Sequential scan detected on table ${plan['Relation Name']}. Consider adding an index.`);
      
      if (plan['Filter']) {
        // Extract filter conditions for index suggestions
        suggestedIndexes.push({
          table: plan['Relation Name'],
          columns: ['filtered_column'], // Would need proper parsing
          reason: 'Sequential scan with filter condition'
        });
      }
    }
    
    // Analyze for nested loops
    if (plan['Node Type'] === 'Nested Loop' && plan['Total Cost'] > 1000) {
      recommendations.push('High-cost nested loop detected. Consider optimizing join conditions or adding indexes.');
    }
    
    // Analyze for sorts
    if (plan['Node Type'] === 'Sort' && plan['Sort Method'] === 'external merge') {
      recommendations.push('External sort detected. Consider increasing work_mem or adding an index for the ORDER BY clause.');
    }
    
    // Recursively analyze child plans
    if (plan['Plans']) {
      for (const childPlan of plan['Plans']) {
        this.analyzeExecutionPlan(childPlan, recommendations, suggestedIndexes);
      }
    }
  }

  public async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Database Optimizer...');
    
    // Clear monitoring timer
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
    
    // Close connection pool
    await this.pool.end();
    
    // Log final metrics
    const finalMetrics = await this.getConnectionMetrics();
    
    await auditLogger.logSystemStop({
      component: 'DatabaseOptimizer',
      metadata: {
        uptime: Date.now(),
        reason: 'shutdown',
        finalMetrics: {
          totalQueries: finalMetrics.totalQueries,
          averageQueryTime: finalMetrics.averageQueryTime,
          slowQueries: finalMetrics.slowQueries
        }
      }
    });
    
    console.log('✅ Database Optimizer shutdown complete');
    this.emit('shutdown');
  }
}

// Default database configuration
export const defaultDatabaseConfig: DatabaseConfig = {
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'gamma_adaptive',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  },
  optimization: {
    connectionPooling: {
      enabled: true,
      min: 2,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      acquireTimeoutMillis: 60000
    },
    queryOptimization: {
      enabled: true,
      preparedStatements: true,
      queryTimeout: 30000,
      slowQueryThreshold: 1000,
      explainAnalyze: false
    },
    indexManagement: {
      enabled: true,
      autoCreateIndexes: false,
      indexUsageTracking: true,
      unusedIndexThreshold: 30
    },
    caching: {
      enabled: true,
      queryResultCache: true,
      schemaCache: true,
      defaultTTL: 5 * 60 * 1000 // 5 minutes
    }
  },
  monitoring: {
    enabled: true,
    trackQueryPerformance: true,
    trackConnectionUsage: true,
    alertThresholds: {
      slowQuery: 1000, // 1 second
      highConnectionUsage: 0.8, // 80%
      longRunningQuery: 30000 // 30 seconds
    }
  }
};