/**
 * Comprehensive logging and monitoring system
 * Provides structured logging, error tracking, and performance monitoring
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
  requestId?: string;
  userId?: string;
  component?: string;
}

export interface MetricEntry {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface ErrorEntry {
  error: Error;
  context: Record<string, any>;
  timestamp: Date;
  requestId?: string;
  userId?: string;
  component?: string;
  stack?: string;
}

/**
 * Structured logger with multiple output targets
 */
export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private outputs: LogOutput[] = [];
  private context: Record<string, any> = {};

  private constructor() {
    // Add console output by default
    this.addOutput(new ConsoleOutput());
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  addOutput(output: LogOutput): void {
    this.outputs.push(output);
  }

  setContext(context: Record<string, any>): void {
    this.context = { ...this.context, ...context };
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  fatal(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.FATAL, message, context, error);
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    if (level < this.logLevel) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: { ...this.context, ...context },
      error,
      component: this.context.component
    };

    this.outputs.forEach(output => {
      try {
        output.write(entry);
      } catch (err) {
        console.error('Failed to write log entry:', err);
      }
    });
  }
}

/**
 * Log output interface
 */
export interface LogOutput {
  write(entry: LogEntry): void;
}

/**
 * Console log output
 */
export class ConsoleOutput implements LogOutput {
  write(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp.toISOString();
    const contextStr = entry.context ? JSON.stringify(entry.context) : '';
    
    let message = `[${timestamp}] ${levelName}: ${entry.message}`;
    
    if (contextStr) {
      message += ` ${contextStr}`;
    }

    if (entry.error) {
      message += `\nError: ${entry.error.message}\nStack: ${entry.error.stack}`;
    }

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message);
        break;
      case LogLevel.INFO:
        console.info(message);
        break;
      case LogLevel.WARN:
        console.warn(message);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(message);
        break;
    }
  }
}

/**
 * File log output (for server environments)
 */
export class FileOutput implements LogOutput {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  write(entry: LogEntry): void {
    // In a real implementation, this would write to a file
    // For now, we'll just use console as fallback
    const consoleOutput = new ConsoleOutput();
    consoleOutput.write(entry);
  }
}

/**
 * Metrics collector
 */
export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: MetricEntry[] = [];
  private maxMetrics: number = 10000;

  private constructor() {}

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  /**
   * Record a metric value
   */
  record(name: string, value: number, unit: string = 'count', tags?: Record<string, string>): void {
    const entry: MetricEntry = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags
    };

    this.metrics.push(entry);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Increment a counter metric
   */
  increment(name: string, tags?: Record<string, string>): void {
    this.record(name, 1, 'count', tags);
  }

  /**
   * Record a timing metric
   */
  timing(name: string, duration: number, tags?: Record<string, string>): void {
    this.record(name, duration, 'ms', tags);
  }

  /**
   * Record a gauge metric
   */
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.record(name, value, 'gauge', tags);
  }

  /**
   * Get metrics for a time range
   */
  getMetrics(since?: Date): MetricEntry[] {
    if (!since) return [...this.metrics];
    
    return this.metrics.filter(metric => metric.timestamp >= since);
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(name: string, since?: Date): {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
  } {
    const relevantMetrics = this.getMetrics(since).filter(m => m.name === name);
    
    if (relevantMetrics.length === 0) {
      return { count: 0, sum: 0, avg: 0, min: 0, max: 0 };
    }

    const values = relevantMetrics.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      count: values.length,
      sum,
      avg: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(olderThan: Date): void {
    this.metrics = this.metrics.filter(metric => metric.timestamp >= olderThan);
  }
}

/**
 * Error tracker
 */
export class ErrorTracker {
  private static instance: ErrorTracker;
  private errors: ErrorEntry[] = [];
  private maxErrors: number = 1000;

  private constructor() {}

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  /**
   * Track an error
   */
  track(error: Error, context: Record<string, any> = {}): void {
    const entry: ErrorEntry = {
      error,
      context,
      timestamp: new Date(),
      stack: error.stack
    };

    this.errors.push(entry);

    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Log the error
    const logger = Logger.getInstance();
    logger.error(error.message, error, context);
  }

  /**
   * Get recent errors
   */
  getErrors(since?: Date): ErrorEntry[] {
    if (!since) return [...this.errors];
    
    return this.errors.filter(error => error.timestamp >= since);
  }

  /**
   * Get error statistics
   */
  getErrorStats(since?: Date): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsByComponent: Record<string, number>;
  } {
    const errors = this.getErrors(since);
    
    const errorsByType: Record<string, number> = {};
    const errorsByComponent: Record<string, number> = {};

    errors.forEach(error => {
      const type = error.error.constructor.name;
      errorsByType[type] = (errorsByType[type] || 0) + 1;

      const component = error.component || 'unknown';
      errorsByComponent[component] = (errorsByComponent[component] || 0) + 1;
    });

    return {
      totalErrors: errors.length,
      errorsByType,
      errorsByComponent
    };
  }
}

/**
 * Application performance monitor
 */
export class ApplicationMonitor {
  private static instance: ApplicationMonitor;
  private logger: Logger;
  private metrics: MetricsCollector;
  private errorTracker: ErrorTracker;
  private startTime: Date;

  private constructor() {
    this.logger = Logger.getInstance();
    this.metrics = MetricsCollector.getInstance();
    this.errorTracker = ErrorTracker.getInstance();
    this.startTime = new Date();
    
    // Set up periodic system metrics collection
    this.startSystemMetricsCollection();
  }

  static getInstance(): ApplicationMonitor {
    if (!ApplicationMonitor.instance) {
      ApplicationMonitor.instance = new ApplicationMonitor();
    }
    return ApplicationMonitor.instance;
  }

  /**
   * Monitor a function execution
   */
  async monitor<T>(
    name: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    this.logger.debug(`Starting ${name}`, context);
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      
      this.metrics.timing(`${name}.duration`, duration);
      this.metrics.increment(`${name}.success`);
      this.logger.debug(`Completed ${name}`, { ...context, duration });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.metrics.timing(`${name}.duration`, duration);
      this.metrics.increment(`${name}.error`);
      this.errorTracker.track(error as Error, { ...context, operation: name });
      
      throw error;
    }
  }

  /**
   * Get system health metrics
   */
  getSystemHealth(): {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    errors: any;
    performance: any;
  } {
    const now = Date.now();
    const uptime = now - this.startTime.getTime();
    const memory = process.memoryUsage();
    
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const errors = this.errorTracker.getErrorStats(oneHourAgo);
    
    const performance = {
      apiCalls: this.metrics.getAggregatedMetrics('api.call.duration', oneHourAgo),
      cacheHits: this.metrics.getAggregatedMetrics('cache.hit', oneHourAgo),
      cacheMisses: this.metrics.getAggregatedMetrics('cache.miss', oneHourAgo)
    };

    return {
      uptime,
      memory,
      errors,
      performance
    };
  }

  /**
   * Start collecting system metrics
   */
  private startSystemMetricsCollection(): void {
    setInterval(() => {
      const memory = process.memoryUsage();
      
      this.metrics.gauge('system.memory.heap_used', memory.heapUsed);
      this.metrics.gauge('system.memory.heap_total', memory.heapTotal);
      this.metrics.gauge('system.memory.external', memory.external);
      this.metrics.gauge('system.memory.rss', memory.rss);
      
      // CPU usage would require additional libraries in a real implementation
      
    }, 30000); // Every 30 seconds
  }
}

// Export singleton instances
export const logger = Logger.getInstance();
export const metrics = MetricsCollector.getInstance();
export const errorTracker = ErrorTracker.getInstance();
export const monitor = ApplicationMonitor.getInstance();

/**
 * Monitoring decorators
 */
export function monitored(name?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const monitorName = name || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      return monitor.monitor(monitorName, () => method.apply(this, args));
    };

    return descriptor;
  };
}

export function logged(level: LogLevel = LogLevel.INFO) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const methodName = `${target.constructor.name}.${propertyName}`;
      
      logger.debug(`Calling ${methodName}`, { args: args.length });
      
      try {
        const result = method.apply(this, args);
        
        if (result instanceof Promise) {
          return result.catch(error => {
            logger.error(`Error in ${methodName}`, error);
            throw error;
          });
        }
        
        return result;
      } catch (error) {
        logger.error(`Error in ${methodName}`, error as Error);
        throw error;
      }
    };

    return descriptor;
  };
}