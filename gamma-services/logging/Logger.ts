/**
 * Comprehensive logging system for Paper Trading
 * Provides structured logging with context, correlation tracking, and multiple output formats
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
export type LogCategory = 
  | 'TRADE_EXECUTION' 
  | 'POSITION_MANAGEMENT' 
  | 'RISK_MANAGEMENT'
  | 'DATA_SOURCE' 
  | 'PERFORMANCE' 
  | 'SYSTEM' 
  | 'USER_ACTION'
  | 'API_REQUEST'
  | 'DATABASE'
  | 'ALERT'
  | 'LEARNING';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  accountId?: string;
  ticker?: string;
  positionId?: string;
  orderId?: string;
  sessionId?: string;
  requestId?: string;
  operation?: string;
  component?: string;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  message: string;
  context: LogContext;
  error?: Error;
  stack?: string;
  duration?: number;
  tags?: string[];
}

export interface LogOutput {
  name: string;
  write(entry: LogEntry): Promise<void>;
  flush?(): Promise<void>;
  close?(): Promise<void>;
}

/**
 * Console log output with colored formatting
 */
export class ConsoleLogOutput implements LogOutput {
  name = 'console';

  private getColorCode(level: LogLevel): string {
    switch (level) {
      case 'DEBUG': return '\x1b[36m'; // Cyan
      case 'INFO': return '\x1b[32m';  // Green
      case 'WARN': return '\x1b[33m';  // Yellow
      case 'ERROR': return '\x1b[31m'; // Red
      case 'CRITICAL': return '\x1b[35m'; // Magenta
      default: return '\x1b[0m';       // Reset
    }
  }

  async write(entry: LogEntry): Promise<void> {
    const color = this.getColorCode(entry.level);
    const reset = '\x1b[0m';
    const timestamp = entry.timestamp.toISOString();
    
    let logLine = `${color}[${timestamp}] ${entry.level} [${entry.category}]${reset} ${entry.message}`;
    
    if (entry.context.correlationId) {
      logLine += ` (${entry.context.correlationId})`;
    }
    
    if (entry.context.ticker) {
      logLine += ` [${entry.context.ticker}]`;
    }
    
    if (entry.duration !== undefined) {
      logLine += ` (${entry.duration}ms)`;
    }

    console.log(logLine);
    
    if (entry.context.metadata && Object.keys(entry.context.metadata).length > 0) {
      console.log(`  Context:`, entry.context.metadata);
    }
    
    if (entry.error) {
      console.error(`  Error:`, entry.error.message);
      if (entry.stack) {
        console.error(`  Stack:`, entry.stack);
      }
    }
  }
}

/**
 * File log output with JSON formatting
 */
export class FileLogOutput implements LogOutput {
  name = 'file';
  private writeStream: any = null;
  private buffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout;

  constructor(private filePath: string, private bufferSize: number = 100) {
    this.initializeFileStream();
    
    // Flush buffer every 5 seconds
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 5000);
  }

  private initializeFileStream(): void {
    // In a real implementation, this would use fs.createWriteStream
    // For now, we'll simulate file writing
    console.log(`File logging initialized: ${this.filePath}`);
  }

  async write(entry: LogEntry): Promise<void> {
    this.buffer.push(entry);
    
    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    const entries = [...this.buffer];
    this.buffer = [];
    
    // In a real implementation, this would write to file
    // For now, we'll simulate by logging the count
    console.log(`[FILE LOG] Flushed ${entries.length} log entries to ${this.filePath}`);
  }

  async close(): Promise<void> {
    clearInterval(this.flushInterval);
    await this.flush();
    
    if (this.writeStream) {
      // Close file stream
      console.log(`[FILE LOG] Closed log file: ${this.filePath}`);
    }
  }
}

/**
 * Remote log output for centralized logging
 */
export class RemoteLogOutput implements LogOutput {
  name = 'remote';
  private buffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout;

  constructor(
    private endpoint: string,
    private apiKey: string,
    private bufferSize: number = 50
  ) {
    // Flush buffer every 10 seconds
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 10000);
  }

  async write(entry: LogEntry): Promise<void> {
    this.buffer.push(entry);
    
    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    const entries = [...this.buffer];
    this.buffer = [];
    
    try {
      // In a real implementation, this would send to remote logging service
      console.log(`[REMOTE LOG] Sending ${entries.length} entries to ${this.endpoint}`);
      
      // Simulate API call
      // await fetch(this.endpoint, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${this.apiKey}`
      //   },
      //   body: JSON.stringify({ logs: entries })
      // });
    } catch (error) {
      console.error('[REMOTE LOG] Failed to send logs:', error);
      // Re-add entries to buffer for retry
      this.buffer.unshift(...entries);
    }
  }

  async close(): Promise<void> {
    clearInterval(this.flushInterval);
    await this.flush();
  }
}

/**
 * Main Logger class with multiple outputs and structured logging
 */
export class Logger {
  private outputs: LogOutput[] = [];
  private defaultContext: LogContext = {};
  private correlationIdCounter = 0;

  constructor() {
    // Initialize default outputs
    this.addOutput(new ConsoleLogOutput());
  }

  /**
   * Add a log output
   */
  addOutput(output: LogOutput): void {
    this.outputs.push(output);
  }

  /**
   * Remove a log output
   */
  removeOutput(outputName: string): void {
    this.outputs = this.outputs.filter(output => output.name !== outputName);
  }

  /**
   * Set default context for all log entries
   */
  setDefaultContext(context: LogContext): void {
    this.defaultContext = { ...this.defaultContext, ...context };
  }

  /**
   * Generate a new correlation ID
   */
  generateCorrelationId(): string {
    this.correlationIdCounter++;
    return `${Date.now()}-${this.correlationIdCounter.toString().padStart(4, '0')}`;
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger();
    childLogger.outputs = this.outputs;
    childLogger.defaultContext = { ...this.defaultContext, ...context };
    return childLogger;
  }

  /**
   * Log a message with specified level
   */
  async log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    context: LogContext = {},
    error?: Error,
    duration?: number,
    tags?: string[]
  ): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      context: { ...this.defaultContext, ...context },
      error,
      stack: error?.stack,
      duration,
      tags
    };

    // Ensure correlation ID exists
    if (!entry.context.correlationId) {
      entry.context.correlationId = this.generateCorrelationId();
    }

    // Write to all outputs
    const writePromises = this.outputs.map(output => 
      output.write(entry).catch(err => 
        console.error(`Failed to write to ${output.name}:`, err)
      )
    );

    await Promise.all(writePromises);
  }

  /**
   * Debug level logging
   */
  async debug(
    category: LogCategory,
    message: string,
    context?: LogContext,
    duration?: number
  ): Promise<void> {
    await this.log('DEBUG', category, message, context, undefined, duration);
  }

  /**
   * Info level logging
   */
  async info(
    category: LogCategory,
    message: string,
    context?: LogContext,
    duration?: number
  ): Promise<void> {
    await this.log('INFO', category, message, context, undefined, duration);
  }

  /**
   * Warning level logging
   */
  async warn(
    category: LogCategory,
    message: string,
    context?: LogContext,
    error?: Error
  ): Promise<void> {
    await this.log('WARN', category, message, context, error);
  }

  /**
   * Error level logging
   */
  async error(
    category: LogCategory,
    message: string,
    context?: LogContext,
    error?: Error
  ): Promise<void> {
    await this.log('ERROR', category, message, context, error);
  }

  /**
   * Critical level logging
   */
  async critical(
    category: LogCategory,
    message: string,
    context?: LogContext,
    error?: Error
  ): Promise<void> {
    await this.log('CRITICAL', category, message, context, error);
  }

  /**
   * Log trade execution events
   */
  async logTradeExecution(
    message: string,
    context: {
      ticker: string;
      side: 'LONG' | 'SHORT';
      quantity: number;
      price: number;
      accountId: string;
      signalId?: string;
      success: boolean;
    },
    duration?: number,
    error?: Error
  ): Promise<void> {
    const level = context.success ? 'INFO' : 'ERROR';
    await this.log(level, 'TRADE_EXECUTION', message, context, error, duration, ['trade']);
  }

  /**
   * Log position management events
   */
  async logPositionUpdate(
    message: string,
    context: {
      positionId: string;
      ticker: string;
      pnl: number;
      pnlPercent: number;
      accountId: string;
    },
    duration?: number
  ): Promise<void> {
    await this.log('INFO', 'POSITION_MANAGEMENT', message, context, undefined, duration, ['position']);
  }

  /**
   * Log risk management events
   */
  async logRiskEvent(
    message: string,
    context: {
      ticker?: string;
      accountId: string;
      riskType: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    },
    error?: Error
  ): Promise<void> {
    const level = context.severity === 'CRITICAL' ? 'CRITICAL' : 
                  context.severity === 'HIGH' ? 'ERROR' : 'WARN';
    await this.log(level, 'RISK_MANAGEMENT', message, context, error, undefined, ['risk']);
  }

  /**
   * Log performance metrics
   */
  async logPerformance(
    operation: string,
    duration: number,
    context: LogContext = {},
    success: boolean = true
  ): Promise<void> {
    const level = success ? 'INFO' : 'WARN';
    const message = `${operation} completed in ${duration}ms`;
    await this.log(level, 'PERFORMANCE', message, { ...context, operation }, undefined, duration, ['performance']);
  }

  /**
   * Log API requests
   */
  async logApiRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context: LogContext = {}
  ): Promise<void> {
    const level = statusCode >= 400 ? 'ERROR' : statusCode >= 300 ? 'WARN' : 'INFO';
    const message = `${method} ${url} - ${statusCode}`;
    await this.log(level, 'API_REQUEST', message, { ...context, metadata: { method, url, statusCode } }, undefined, duration, ['api']);
  }

  /**
   * Log database operations
   */
  async logDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    success: boolean,
    context: LogContext = {},
    error?: Error
  ): Promise<void> {
    const level = success ? 'INFO' : 'ERROR';
    const message = `${operation} on ${table} - ${success ? 'SUCCESS' : 'FAILED'}`;
    await this.log(level, 'DATABASE', message, { ...context, metadata: { operation, table } }, error, duration, ['database']);
  }

  /**
   * Flush all outputs
   */
  async flush(): Promise<void> {
    const flushPromises = this.outputs
      .filter(output => output.flush)
      .map(output => output.flush!().catch(err => 
        console.error(`Failed to flush ${output.name}:`, err)
      ));

    await Promise.all(flushPromises);
  }

  /**
   * Close all outputs
   */
  async close(): Promise<void> {
    await this.flush();
    
    const closePromises = this.outputs
      .filter(output => output.close)
      .map(output => output.close!().catch(err => 
        console.error(`Failed to close ${output.name}:`, err)
      ));

    await Promise.all(closePromises);
  }
}

// Export singleton logger instance
export const logger = new Logger();

// Export logger factory for creating child loggers
export const createLogger = (context: LogContext): Logger => {
  return logger.child(context);
};