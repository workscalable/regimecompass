/**
 * Comprehensive caching system for market data and analysis results
 * Implements multiple cache layers with TTL, LRU eviction, and performance monitoring
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
  entryCount: number;
  hitRate: number;
}

interface CacheConfig {
  maxSize: number; // Maximum cache size in bytes
  defaultTTL: number; // Default TTL in milliseconds
  maxEntries: number; // Maximum number of entries
  cleanupInterval: number; // Cleanup interval in milliseconds
}

export class PerformanceCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSize: 0,
    entryCount: 0,
    hitRate: 0
  };
  private config: CacheConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 50 * 1024 * 1024, // 50MB default
      defaultTTL: 5 * 60 * 1000, // 5 minutes default
      maxEntries: 1000,
      cleanupInterval: 60 * 1000, // 1 minute cleanup
      ...config
    };

    // Start cleanup timer
    this.startCleanup();
  }

  /**
   * Get item from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.totalSize -= entry.size;
      this.stats.entryCount--;
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    this.updateHitRate();

    return entry.data;
  }

  /**
   * Set item in cache
   */
  set(key: string, data: T, ttl?: number): void {
    const entryTTL = ttl || this.config.defaultTTL;
    const size = this.estimateSize(data);
    
    // Check if we need to evict entries
    this.evictIfNeeded(size);

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: entryTTL,
      accessCount: 1,
      lastAccessed: Date.now(),
      size
    };

    // Remove existing entry if it exists
    const existingEntry = this.cache.get(key);
    if (existingEntry) {
      this.stats.totalSize -= existingEntry.size;
      this.stats.entryCount--;
    }

    this.cache.set(key, entry);
    this.stats.totalSize += size;
    this.stats.entryCount++;
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.stats.totalSize -= entry.size;
      this.stats.entryCount--;
      return true;
    }
    return false;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats.totalSize = 0;
    this.stats.entryCount = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache entries for debugging
   */
  getEntries(): Array<{ key: string; entry: CacheEntry<T> }> {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({ key, entry }));
  }

  /**
   * Evict entries if cache is too large
   */
  private evictIfNeeded(newEntrySize: number): void {
    // Check size limit
    while (this.stats.totalSize + newEntrySize > this.config.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }

    // Check entry count limit
    while (this.cache.size >= this.config.maxEntries) {
      this.evictLRU();
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      const entry = this.cache.get(oldestKey);
      if (entry) {
        this.cache.delete(oldestKey);
        this.stats.totalSize -= entry.size;
        this.stats.entryCount--;
        this.stats.evictions++;
      }
    }
  }

  /**
   * Estimate size of data in bytes
   */
  private estimateSize(data: T): number {
    try {
      return JSON.stringify(data).length * 2; // Rough estimate (UTF-16)
    } catch {
      return 1024; // Default 1KB if can't serialize
    }
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Start cleanup timer
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });

    for (const key of keysToDelete) {
      this.delete(key);
    }
  }

  /**
   * Destroy cache and cleanup timers
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}

// Cache instances for different data types
export const marketDataCache = new PerformanceCache({
  maxSize: 20 * 1024 * 1024, // 20MB for market data
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxEntries: 100
});

export const analysisCache = new PerformanceCache({
  maxSize: 30 * 1024 * 1024, // 30MB for analysis results
  defaultTTL: 10 * 60 * 1000, // 10 minutes
  maxEntries: 200
});

export const sectorCache = new PerformanceCache({
  maxSize: 10 * 1024 * 1024, // 10MB for sector data
  defaultTTL: 15 * 60 * 1000, // 15 minutes
  maxEntries: 50
});

/**
 * Cache decorator for functions
 */
export function cached<T extends (...args: any[]) => any>(
  cache: PerformanceCache<ReturnType<T>>,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl?: number
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: Parameters<T>): Promise<ReturnType<T>> {
      const key = keyGenerator(...args);
      
      // Try to get from cache
      const cached = cache.get(key);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await method.apply(this, args);
      
      // Store in cache
      cache.set(key, result, ttl);
      
      return result;
    };

    return descriptor;
  };
}

/**
 * Memoization decorator for expensive calculations
 */
export function memoize<T extends (...args: any[]) => any>(
  keyGenerator?: (...args: Parameters<T>) => string
) {
  const cache = new Map<string, ReturnType<T>>();
  
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (...args: Parameters<T>): ReturnType<T> {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      
      if (cache.has(key)) {
        return cache.get(key)!;
      }

      const result = method.apply(this, args);
      cache.set(key, result);
      
      return result;
    };

    return descriptor;
  };
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static metrics = new Map<string, {
    count: number;
    totalTime: number;
    minTime: number;
    maxTime: number;
    avgTime: number;
  }>();

  /**
   * Time a function execution
   */
  static time<T>(name: string, fn: () => T): T {
    const start = Date.now();
    const result = fn();
    const duration = Date.now() - start;
    
    this.recordMetric(name, duration);
    return result;
  }

  /**
   * Time an async function execution
   */
  static async timeAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    
    this.recordMetric(name, duration);
    return result;
  }

  /**
   * Record a performance metric
   */
  private static recordMetric(name: string, duration: number): void {
    const existing = this.metrics.get(name);
    
    if (existing) {
      existing.count++;
      existing.totalTime += duration;
      existing.minTime = Math.min(existing.minTime, duration);
      existing.maxTime = Math.max(existing.maxTime, duration);
      existing.avgTime = existing.totalTime / existing.count;
    } else {
      this.metrics.set(name, {
        count: 1,
        totalTime: duration,
        minTime: duration,
        maxTime: duration,
        avgTime: duration
      });
    }
  }

  /**
   * Get all performance metrics
   */
  static getMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    
    Array.from(this.metrics.entries()).forEach(([name, metric]) => {
      result[name] = { ...metric };
    });
    
    return result;
  }

  /**
   * Clear all metrics
   */
  static clearMetrics(): void {
    this.metrics.clear();
  }
}

/**
 * Performance decorator
 */
export function performance(name?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const metricName = name || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      return PerformanceMonitor.timeAsync(metricName, () => method.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * Lazy loading utility
 */
export class LazyLoader<T> {
  private promise: Promise<T> | null = null;
  private result: T | null = null;
  private loader: () => Promise<T>;

  constructor(loader: () => Promise<T>) {
    this.loader = loader;
  }

  async get(): Promise<T> {
    if (this.result !== null) {
      return this.result;
    }

    if (this.promise === null) {
      this.promise = this.loader().then(result => {
        this.result = result;
        return result;
      });
    }

    return this.promise;
  }

  reset(): void {
    this.promise = null;
    this.result = null;
  }
}

/**
 * Batch processor for efficient data processing
 */
export class BatchProcessor<T, R> {
  private batch: T[] = [];
  private timer: NodeJS.Timeout | null = null;
  private processor: (items: T[]) => Promise<R[]>;
  private batchSize: number;
  private delay: number;

  constructor(
    processor: (items: T[]) => Promise<R[]>,
    batchSize: number = 10,
    delay: number = 100
  ) {
    this.processor = processor;
    this.batchSize = batchSize;
    this.delay = delay;
  }

  add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.batch.push(item);
      
      // Store resolve/reject for this item
      (item as any).__resolve = resolve;
      (item as any).__reject = reject;

      if (this.batch.length >= this.batchSize) {
        this.processBatch();
      } else if (this.timer === null) {
        this.timer = setTimeout(() => this.processBatch(), this.delay);
      }
    });
  }

  private async processBatch(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const currentBatch = this.batch.splice(0);
    if (currentBatch.length === 0) return;

    try {
      const results = await this.processor(currentBatch);
      
      currentBatch.forEach((item, index) => {
        const resolve = (item as any).__resolve;
        if (resolve) {
          resolve(results[index]);
        }
      });
    } catch (error) {
      currentBatch.forEach(item => {
        const reject = (item as any).__reject;
        if (reject) {
          reject(error);
        }
      });
    }
  }
}