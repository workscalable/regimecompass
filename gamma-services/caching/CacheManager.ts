import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { logger } from '../logging/Logger';
import { auditLogger } from '../logging/AuditLogger';

export interface CacheConfig {
  enabled: boolean;
  defaultTTL: number; // milliseconds
  maxSize: number; // maximum number of entries
  maxMemory: number; // maximum memory usage in MB
  cleanupInterval: number; // cleanup interval in milliseconds
  compression: {
    enabled: boolean;
    threshold: number; // compress items larger than this (bytes)
    algorithm: 'gzip' | 'deflate' | 'brotli';
  };
  persistence: {
    enabled: boolean;
    filePath?: string;
    saveInterval: number;
  };
  clustering: {
    enabled: boolean;
    nodes: string[];
    replicationFactor: number;
  };
  metrics: {
    enabled: boolean;
    trackHitRate: boolean;
    trackLatency: boolean;
  };
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  ttl: number;
  createdAt: Date;
  expiresAt: Date;
  accessCount: number;
  lastAccessed: Date;
  size: number; // size in bytes
  compressed: boolean;
  tags: string[];
  metadata?: Record<string, any>;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number; // bytes
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  averageLatency: number;
  memoryUsage: number; // MB
  oldestEntry?: Date;
  newestEntry?: Date;
}

export interface CacheQuery {
  pattern?: string;
  tags?: string[];
  minAccessCount?: number;
  maxAge?: number;
  limit?: number;
}

export type CacheInvalidationStrategy = 
  | 'TTL' // Time-based expiration
  | 'LRU' // Least Recently Used
  | 'LFU' // Least Frequently Used
  | 'FIFO' // First In, First Out
  | 'MANUAL'; // Manual invalidation only

export class CacheManager extends EventEmitter {
  private config: CacheConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private stats: CacheStats;
  private cleanupTimer?: NodeJS.Timeout;
  private persistenceTimer?: NodeJS.Timeout;
  private compressionEnabled: boolean;

  constructor(config: CacheConfig) {
    super();
    this.config = config;
    this.compressionEnabled = config.compression.enabled;
    this.stats = {
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
      missRate: 0,
      totalHits: 0,
      totalMisses: 0,
      averageLatency: 0,
      memoryUsage: 0
    };
  }

  public async initialize(): Promise<void> {
    console.log('🗄️ Initializing Cache Manager...');
    
    try {
      if (this.config.enabled) {
        // Load persisted cache if enabled
        if (this.config.persistence.enabled) {
          await this.loadPersistedCache();
        }
        
        // Start cleanup timer
        this.startCleanupTimer();
        
        // Start persistence timer
        if (this.config.persistence.enabled) {
          this.startPersistenceTimer();
        }
      }
      
      console.log('✅ Cache Manager initialized');
      this.emit('initialized');
      
      // Log initialization
      await auditLogger.logSystemStart({
        component: 'CacheManager',
        metadata: {
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          config: {
            enabled: this.config.enabled,
            defaultTTL: this.config.defaultTTL,
            maxSize: this.config.maxSize,
            compression: this.config.compression.enabled
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize Cache Manager:', error);
      throw error;
    }
  }

  public async set<T>(
    key: string,
    value: T,
    options: {
      ttl?: number;
      tags?: string[];
      metadata?: Record<string, any>;
      compress?: boolean;
    } = {}
  ): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    const startTime = Date.now();
    
    try {
      const ttl = options.ttl || this.config.defaultTTL;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttl);
      
      // Serialize and optionally compress the value
      let serializedValue = JSON.stringify(value);
      let compressed = false;
      let size = Buffer.byteLength(serializedValue, 'utf8');
      
      if (this.shouldCompress(serializedValue, options.compress)) {
        serializedValue = await this.compressData(serializedValue);
        compressed = true;
        size = Buffer.byteLength(serializedValue, 'utf8');
      }
      
      // Check memory limits
      if (this.stats.totalSize + size > this.config.maxMemory * 1024 * 1024) {
        await this.evictEntries(size);
      }
      
      // Check entry count limits
      if (this.cache.size >= this.config.maxSize) {
        await this.evictEntries();
      }
      
      const entry: CacheEntry<string> = {
        key,
        value: serializedValue,
        ttl,
        createdAt: now,
        expiresAt,
        accessCount: 0,
        lastAccessed: now,
        size,
        compressed,
        tags: options.tags || [],
        metadata: options.metadata
      };
      
      // Remove existing entry if it exists
      if (this.cache.has(key)) {
        const existingEntry = this.cache.get(key)!;
        this.stats.totalSize -= existingEntry.size;
      } else {
        this.stats.totalEntries++;
      }
      
      this.cache.set(key, entry);
      this.stats.totalSize += size;
      
      this.updateStats();
      this.emit('entrySet', { key, size, ttl });
      
      // Log cache operation
      if (this.config.metrics.trackLatency) {
        const latency = Date.now() - startTime;
        await auditLogger.logEvent(
          'DATA_EXPORT', // Using closest available event type
          'cache',
          'set',
          { key, size, ttl, latency, compressed },
          'SUCCESS',
          { component: 'CacheManager', operation: 'cache_set' }
        );
      }
      
      return true;
      
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    if (!this.config.enabled) {
      return null;
    }

    const startTime = Date.now();
    
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.stats.totalMisses++;
        this.updateStats();
        this.emit('cacheMiss', { key });
        return null;
      }
      
      // Check if entry has expired
      if (new Date() > entry.expiresAt) {
        this.cache.delete(key);
        this.stats.totalEntries--;
        this.stats.totalSize -= entry.size;
        this.stats.totalMisses++;
        this.updateStats();
        this.emit('entryExpired', { key });
        return null;
      }
      
      // Update access statistics
      entry.accessCount++;
      entry.lastAccessed = new Date();
      
      // Deserialize and optionally decompress the value
      let value = entry.value;
      if (entry.compressed) {
        value = await this.decompressData(value);
      }
      
      const deserializedValue = JSON.parse(value);
      
      this.stats.totalHits++;
      this.updateStats();
      this.emit('cacheHit', { key, accessCount: entry.accessCount });
      
      // Log cache operation
      if (this.config.metrics.trackLatency) {
        const latency = Date.now() - startTime;
        await auditLogger.logEvent(
          'API_ACCESS',
          'cache',
          'get',
          { key, hit: true, latency, accessCount: entry.accessCount },
          'SUCCESS',
          { component: 'CacheManager', operation: 'cache_get' }
        );
      }
      
      return deserializedValue;
      
    } catch (error) {
      console.error('Cache get error:', error);
      this.stats.totalMisses++;
      this.updateStats();
      return null;
    }
  }

  public async getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    options: {
      ttl?: number;
      tags?: string[];
      metadata?: Record<string, any>;
      compress?: boolean;
    } = {}
  ): Promise<T | null> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    try {
      // Generate value using factory function
      const value = await factory();
      
      // Store in cache
      await this.set(key, value, options);
      
      return value;
    } catch (error) {
      console.error('Cache getOrSet factory error:', error);
      return null;
    }
  }

  public async delete(key: string): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    
    this.cache.delete(key);
    this.stats.totalEntries--;
    this.stats.totalSize -= entry.size;
    
    this.updateStats();
    this.emit('entryDeleted', { key, size: entry.size });
    
    // Log cache operation
    await auditLogger.logEvent(
      'API_ACCESS',
      'cache',
      'delete',
      { key, size: entry.size },
      'SUCCESS',
      { component: 'CacheManager', operation: 'cache_delete' }
    );
    
    return true;
  }

  public async invalidateByTags(tags: string[]): Promise<number> {
    if (!this.config.enabled) {
      return 0;
    }

    let invalidatedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        await this.delete(key);
        invalidatedCount++;
      }
    }
    
    this.emit('tagsInvalidated', { tags, count: invalidatedCount });
    
    // Log invalidation
    await auditLogger.logEvent(
      'API_ACCESS',
      'cache',
      'invalidate_by_tags',
      { tags, invalidatedCount },
      'SUCCESS',
      { component: 'CacheManager', operation: 'cache_invalidate_tags' }
    );
    
    return invalidatedCount;
  }

  public async invalidateByPattern(pattern: string): Promise<number> {
    if (!this.config.enabled) {
      return 0;
    }

    const regex = new RegExp(pattern);
    let invalidatedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        await this.delete(key);
        invalidatedCount++;
      }
    }
    
    this.emit('patternInvalidated', { pattern, count: invalidatedCount });
    
    // Log invalidation
    await auditLogger.logEvent(
      'API_ACCESS',
      'cache',
      'invalidate_by_pattern',
      { pattern, invalidatedCount },
      'SUCCESS',
      { component: 'CacheManager', operation: 'cache_invalidate_pattern' }
    );
    
    return invalidatedCount;
  }

  public async clear(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const entriesCount = this.cache.size;
    const totalSize = this.stats.totalSize;
    
    this.cache.clear();
    this.stats.totalEntries = 0;
    this.stats.totalSize = 0;
    
    this.updateStats();
    this.emit('cacheCleared', { entriesCount, totalSize });
    
    // Log cache clear
    await auditLogger.logEvent(
      'API_ACCESS',
      'cache',
      'clear',
      { entriesCount, totalSize },
      'SUCCESS',
      { component: 'CacheManager', operation: 'cache_clear' }
    );
  }

  public query(query: CacheQuery): CacheEntry[] {
    const results: CacheEntry[] = [];
    
    for (const entry of this.cache.values()) {
      let matches = true;
      
      // Pattern matching
      if (query.pattern) {
        const regex = new RegExp(query.pattern);
        matches = matches && regex.test(entry.key);
      }
      
      // Tag matching
      if (query.tags && query.tags.length > 0) {
        matches = matches && query.tags.some(tag => entry.tags.includes(tag));
      }
      
      // Access count filtering
      if (query.minAccessCount !== undefined) {
        matches = matches && entry.accessCount >= query.minAccessCount;
      }
      
      // Age filtering
      if (query.maxAge !== undefined) {
        const age = Date.now() - entry.createdAt.getTime();
        matches = matches && age <= query.maxAge;
      }
      
      if (matches) {
        results.push(entry);
      }
    }
    
    // Sort by last accessed (most recent first)
    results.sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime());
    
    // Apply limit
    if (query.limit) {
      return results.slice(0, query.limit);
    }
    
    return results;
  }

  public getStats(): CacheStats {
    return { ...this.stats };
  }

  public async warmup(keys: Array<{ key: string; factory: () => Promise<any> | any; options?: any }>): Promise<void> {
    console.log(`🔥 Warming up cache with ${keys.length} entries...`);
    
    const promises = keys.map(async ({ key, factory, options }) => {
      try {
        const value = await factory();
        await this.set(key, value, options);
      } catch (error) {
        console.error(`Cache warmup failed for key ${key}:`, error);
      }
    });
    
    await Promise.all(promises);
    
    console.log('✅ Cache warmup completed');
    this.emit('warmupCompleted', { count: keys.length });
  }

  private shouldCompress(data: string, forceCompress?: boolean): boolean {
    if (forceCompress !== undefined) {
      return forceCompress && this.compressionEnabled;
    }
    
    return this.compressionEnabled && 
           Buffer.byteLength(data, 'utf8') > this.config.compression.threshold;
  }

  private async compressData(data: string): Promise<string> {
    const zlib = require('zlib');
    const util = require('util');
    
    switch (this.config.compression.algorithm) {
      case 'gzip':
        const gzip = util.promisify(zlib.gzip);
        return (await gzip(Buffer.from(data))).toString('base64');
      case 'deflate':
        const deflate = util.promisify(zlib.deflate);
        return (await deflate(Buffer.from(data))).toString('base64');
      case 'brotli':
        const brotliCompress = util.promisify(zlib.brotliCompress);
        return (await brotliCompress(Buffer.from(data))).toString('base64');
      default:
        return data;
    }
  }

  private async decompressData(data: string): Promise<string> {
    const zlib = require('zlib');
    const util = require('util');
    const buffer = Buffer.from(data, 'base64');
    
    switch (this.config.compression.algorithm) {
      case 'gzip':
        const gunzip = util.promisify(zlib.gunzip);
        return (await gunzip(buffer)).toString();
      case 'deflate':
        const inflate = util.promisify(zlib.inflate);
        return (await inflate(buffer)).toString();
      case 'brotli':
        const brotliDecompress = util.promisify(zlib.brotliDecompress);
        return (await brotliDecompress(buffer)).toString();
      default:
        return data;
    }
  }

  private async evictEntries(requiredSpace?: number): Promise<void> {
    const entriesToEvict: string[] = [];
    let freedSpace = 0;
    
    // Sort entries by access pattern (LRU strategy)
    const sortedEntries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => {
        // Prioritize by last accessed time (LRU)
        const timeDiff = a.lastAccessed.getTime() - b.lastAccessed.getTime();
        if (timeDiff !== 0) return timeDiff;
        
        // Then by access count (LFU)
        return a.accessCount - b.accessCount;
      });
    
    for (const [key, entry] of sortedEntries) {
      entriesToEvict.push(key);
      freedSpace += entry.size;
      
      // Stop if we've freed enough space or entries
      if (requiredSpace && freedSpace >= requiredSpace) break;
      if (!requiredSpace && entriesToEvict.length >= Math.ceil(this.cache.size * 0.1)) break;
    }
    
    // Remove selected entries
    for (const key of entriesToEvict) {
      await this.delete(key);
    }
    
    this.emit('entriesEvicted', { count: entriesToEvict.length, freedSpace });
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private startPersistenceTimer(): void {
    if (this.config.persistence.enabled) {
      this.persistenceTimer = setInterval(() => {
        this.persistCache();
      }, this.config.persistence.saveInterval);
    }
  }

  private cleanup(): void {
    const now = new Date();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      this.delete(key);
    }
    
    if (expiredKeys.length > 0) {
      this.emit('cleanupCompleted', { expiredCount: expiredKeys.length });
    }
  }

  private async persistCache(): Promise<void> {
    if (!this.config.persistence.enabled || !this.config.persistence.filePath) {
      return;
    }
    
    try {
      const fs = require('fs').promises;
      const cacheData = {
        entries: Array.from(this.cache.entries()),
        stats: this.stats,
        timestamp: new Date()
      };
      
      await fs.writeFile(
        this.config.persistence.filePath,
        JSON.stringify(cacheData, null, 2)
      );
      
      this.emit('cachePersisted', { entriesCount: this.cache.size });
    } catch (error) {
      console.error('Cache persistence error:', error);
    }
  }

  private async loadPersistedCache(): Promise<void> {
    if (!this.config.persistence.enabled || !this.config.persistence.filePath) {
      return;
    }
    
    try {
      const fs = require('fs').promises;
      const data = await fs.readFile(this.config.persistence.filePath, 'utf8');
      const cacheData = JSON.parse(data);
      
      // Restore cache entries
      for (const [key, entry] of cacheData.entries) {
        // Check if entry is still valid
        if (new Date(entry.expiresAt) > new Date()) {
          this.cache.set(key, {
            ...entry,
            createdAt: new Date(entry.createdAt),
            expiresAt: new Date(entry.expiresAt),
            lastAccessed: new Date(entry.lastAccessed)
          });
        }
      }
      
      this.updateStats();
      this.emit('cacheLoaded', { entriesCount: this.cache.size });
      
    } catch (error) {
      console.error('Cache loading error:', error);
    }
  }

  private updateStats(): void {
    const totalOperations = this.stats.totalHits + this.stats.totalMisses;
    
    this.stats.hitRate = totalOperations > 0 ? this.stats.totalHits / totalOperations : 0;
    this.stats.missRate = totalOperations > 0 ? this.stats.totalMisses / totalOperations : 0;
    this.stats.memoryUsage = this.stats.totalSize / (1024 * 1024); // Convert to MB
    
    // Update oldest and newest entry timestamps
    if (this.cache.size > 0) {
      const entries = Array.from(this.cache.values());
      this.stats.oldestEntry = entries.reduce((oldest, entry) => 
        entry.createdAt < oldest ? entry.createdAt : oldest, entries[0].createdAt);
      this.stats.newestEntry = entries.reduce((newest, entry) => 
        entry.createdAt > newest ? entry.createdAt : newest, entries[0].createdAt);
    }
  }

  public async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Cache Manager...');
    
    // Clear timers
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
    }
    
    // Persist cache if enabled
    if (this.config.persistence.enabled) {
      await this.persistCache();
    }
    
    // Log final stats
    await auditLogger.logSystemStop({
      component: 'CacheManager',
      metadata: {
        uptime: Date.now(),
        reason: 'shutdown',
        finalStats: {
          totalEntries: this.stats.totalEntries,
          hitRate: this.stats.hitRate,
          memoryUsage: this.stats.memoryUsage
        }
      }
    });
    
    console.log('✅ Cache Manager shutdown complete');
    this.emit('shutdown');
  }
}

// Default cache configuration
export const defaultCacheConfig: CacheConfig = {
  enabled: true,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 10000, // 10,000 entries
  maxMemory: 256, // 256MB
  cleanupInterval: 60 * 1000, // 1 minute
  compression: {
    enabled: true,
    threshold: 1024, // 1KB
    algorithm: 'gzip'
  },
  persistence: {
    enabled: false,
    saveInterval: 5 * 60 * 1000 // 5 minutes
  },
  clustering: {
    enabled: false,
    nodes: [],
    replicationFactor: 1
  },
  metrics: {
    enabled: true,
    trackHitRate: true,
    trackLatency: true
  }
};