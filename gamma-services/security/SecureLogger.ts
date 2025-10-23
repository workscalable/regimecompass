import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import { DataEncryption } from './DataEncryption';

export interface LoggerConfig {
  logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  outputs: LogOutput[];
  encryption: {
    enabled: boolean;
    encryptSensitive: boolean;
    keyRotationInterval: number;
  };
  sensitiveDataHandling: {
    enabled: boolean;
    maskingRules: MaskingRule[];
    exclusionRules: ExclusionRule[];
  };
  auditTrail: {
    enabled: boolean;
    includeStackTrace: boolean;
    includeUserContext: boolean;
    retentionPeriod: number; // in milliseconds
  };
  performance: {
    asyncLogging: boolean;
    bufferSize: number;
    flushInterval: number;
  };
  compliance: {
    gdprCompliant: boolean;
    hipaaCompliant: boolean;
    pciCompliant: boolean;
  };
}

export interface LogOutput {
  type: 'FILE' | 'CONSOLE' | 'DATABASE' | 'REMOTE' | 'SYSLOG';
  config: any;
  enabled: boolean;
  minLevel: string;
  formatter?: LogFormatter;
}

export interface MaskingRule {
  field: string;
  pattern: RegExp;
  replacement: string;
  description: string;
}

export interface ExclusionRule {
  field: string;
  condition: (value: any) => boolean;
  description: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: string;
  message: string;
  data?: any;
  context?: LogContext;
  metadata: LogMetadata;
  encrypted: boolean;
  masked: boolean;
}

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  operation?: string;
  component?: string;
}

export interface LogMetadata {
  hostname: string;
  pid: number;
  version: string;
  environment: string;
  stackTrace?: string;
  performance?: {
    duration?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
}

export interface AuditLogEntry extends LogEntry {
  auditType: 'ACCESS' | 'MODIFICATION' | 'DELETION' | 'AUTHENTICATION' | 'AUTHORIZATION' | 'SYSTEM';
  actor: {
    userId?: string;
    username?: string;
    role?: string;
    ipAddress?: string;
  };
  resource: {
    type: string;
    id?: string;
    name?: string;
  };
  action: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export type LogFormatter = (entry: LogEntry) => string;

export class SecureLogger extends EventEmitter {
  private config: LoggerConfig;
  private dataEncryption?: DataEncryption;
  private logBuffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private logCounts: Record<string, number> = {};
  private sensitivePatterns: RegExp[] = [];

  constructor(config: LoggerConfig) {
    super();
    this.config = config;
    this.initializeSensitivePatterns();
  }

  public async initialize(dataEncryption?: DataEncryption): Promise<void> {
    console.log('📝 Initializing Secure Logger...');
    
    try {
      this.dataEncryption = dataEncryption;
      
      // Set up async logging if enabled
      if (this.config.performance.asyncLogging) {
        this.setupAsyncLogging();
      }
      
      // Initialize log outputs
      await this.initializeOutputs();
      
      console.log('✅ Secure Logger initialized');
      this.emit('initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Secure Logger:', error);
      throw error;
    }
  }

  public debug(message: string, data?: any, context?: LogContext): void {
    this.log('DEBUG', message, data, context);
  }

  public info(message: string, data?: any, context?: LogContext): void {
    this.log('INFO', message, data, context);
  }

  public warn(message: string, data?: any, context?: LogContext): void {
    this.log('WARN', message, data, context);
  }

  public error(message: string, error?: Error | any, context?: LogContext): void {
    const errorData = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error;
    
    this.log('ERROR', message, errorData, context);
  }

  public critical(message: string, data?: any, context?: LogContext): void {
    this.log('CRITICAL', message, data, context);
  }

  public async audit(auditEntry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'metadata' | 'encrypted' | 'masked'>): Promise<void> {
    if (!this.config.auditTrail.enabled) {
      return;
    }

    const logEntry: AuditLogEntry = {
      ...auditEntry,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      metadata: this.createMetadata(),
      encrypted: false,
      masked: false
    };

    // Always log audit entries regardless of log level
    await this.processLogEntry(logEntry);
    
    this.emit('auditLog', logEntry);
  }

  public async securityEvent(
    event: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    details: any,
    context?: LogContext
  ): Promise<void> {
    const securityLog = {
      event,
      severity,
      details: await this.sanitizeData(details),
      timestamp: new Date().toISOString()
    };

    await this.audit({
      level: severity === 'CRITICAL' ? 'CRITICAL' : 'WARN',
      message: `Security Event: ${event}`,
      data: securityLog,
      context,
      auditType: 'SYSTEM',
      actor: {
        userId: context?.userId,
        ipAddress: context?.ipAddress
      },
      resource: {
        type: 'SYSTEM',
        name: 'Security Monitor'
      },
      action: event,
      outcome: 'SUCCESS',
      riskLevel: severity
    });
  }

  public async performanceLog(
    operation: string,
    duration: number,
    metadata?: any,
    context?: LogContext
  ): Promise<void> {
    const perfData = {
      operation,
      duration,
      metadata: await this.sanitizeData(metadata),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };

    this.info(`Performance: ${operation} completed in ${duration}ms`, perfData, context);
  }

  public async dataAccessLog(
    resource: string,
    action: string,
    userId?: string,
    success: boolean = true,
    context?: LogContext
  ): Promise<void> {
    await this.audit({
      level: 'INFO',
      message: `Data Access: ${action} on ${resource}`,
      auditType: 'ACCESS',
      actor: {
        userId,
        ipAddress: context?.ipAddress
      },
      resource: {
        type: 'DATA',
        name: resource
      },
      action,
      outcome: success ? 'SUCCESS' : 'FAILURE',
      riskLevel: success ? 'LOW' : 'MEDIUM',
      context
    });
  }

  public async flush(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    const entries = [...this.logBuffer];
    this.logBuffer = [];

    await Promise.all(entries.map(entry => this.writeToOutputs(entry)));
  }

  public getLogCounts(): Record<string, number> {
    return { ...this.logCounts };
  }

  public async searchLogs(criteria: {
    level?: string;
    startTime?: Date;
    endTime?: Date;
    userId?: string;
    component?: string;
    message?: string;
    limit?: number;
  }): Promise<LogEntry[]> {
    // This would integrate with your log storage system
    // For now, return empty array as placeholder
    return [];
  }

  private async log(level: string, message: string, data?: any, context?: LogContext): Promise<void> {
    // Check if log level is enabled
    if (!this.shouldLog(level)) {
      return;
    }

    try {
      const logEntry: LogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        level,
        message,
        data: data ? await this.sanitizeData(data) : undefined,
        context,
        metadata: this.createMetadata(),
        encrypted: false,
        masked: false
      };

      await this.processLogEntry(logEntry);
      
      // Update log counts
      this.logCounts[level] = (this.logCounts[level] || 0) + 1;
      
      this.emit('log', logEntry);

    } catch (error) {
      // Fallback logging to console if secure logging fails
      console.error('Secure logging failed:', error);
      console.log(`[${level}] ${message}`, data);
    }
  }

  private async processLogEntry(entry: LogEntry): Promise<void> {
    // Apply sensitive data handling
    if (this.config.sensitiveDataHandling.enabled) {
      entry = await this.applySensitiveDataHandling(entry);
    }

    // Encrypt if required
    if (this.config.encryption.enabled && this.shouldEncrypt(entry)) {
      entry = await this.encryptLogEntry(entry);
    }

    // Buffer or write immediately
    if (this.config.performance.asyncLogging) {
      this.logBuffer.push(entry);
      
      if (this.logBuffer.length >= this.config.performance.bufferSize) {
        await this.flush();
      }
    } else {
      await this.writeToOutputs(entry);
    }
  }

  private async sanitizeData(data: any): Promise<any> {
    if (!data || !this.config.sensitiveDataHandling.enabled) {
      return data;
    }

    // Deep clone to avoid modifying original data
    const sanitized = JSON.parse(JSON.stringify(data));
    
    return this.applySanitization(sanitized);
  }

  private applySanitization(obj: any, path: string = ''): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.maskSensitiveString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item, index) => 
        this.applySanitization(item, `${path}[${index}]`)
      );
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        const fieldPath = path ? `${path}.${key}` : key;
        
        // Check exclusion rules
        const shouldExclude = this.config.sensitiveDataHandling.exclusionRules.some(
          rule => rule.field === key && rule.condition(value)
        );
        
        if (shouldExclude) {
          sanitized[key] = '[EXCLUDED]';
          continue;
        }

        // Apply masking rules
        const maskingRule = this.config.sensitiveDataHandling.maskingRules.find(
          rule => rule.field === key || rule.pattern.test(fieldPath)
        );
        
        if (maskingRule) {
          sanitized[key] = typeof value === 'string' 
            ? value.replace(maskingRule.pattern, maskingRule.replacement)
            : '[MASKED]';
        } else {
          sanitized[key] = this.applySanitization(value, fieldPath);
        }
      }
      
      return sanitized;
    }

    return obj;
  }

  private maskSensitiveString(str: string): string {
    let masked = str;
    
    for (const pattern of this.sensitivePatterns) {
      masked = masked.replace(pattern, '[REDACTED]');
    }
    
    return masked;
  }

  private async applySensitiveDataHandling(entry: LogEntry): Promise<LogEntry> {
    const processed = { ...entry };
    
    // Apply masking to message
    processed.message = this.maskSensitiveString(processed.message);
    processed.masked = processed.message !== entry.message;
    
    // Apply sanitization to data
    if (processed.data) {
      const originalData = JSON.stringify(processed.data);
      processed.data = await this.sanitizeData(processed.data);
      processed.masked = processed.masked || JSON.stringify(processed.data) !== originalData;
    }
    
    return processed;
  }

  private async encryptLogEntry(entry: LogEntry): Promise<LogEntry> {
    if (!this.dataEncryption) {
      return entry;
    }

    try {
      const sensitiveData = {
        message: entry.message,
        data: entry.data,
        context: entry.context
      };

      const encryptedData = await this.dataEncryption.encryptData(
        JSON.stringify(sensitiveData),
        { compress: true }
      );

      return {
        ...entry,
        message: '[ENCRYPTED]',
        data: { encrypted: JSON.stringify(encryptedData) },
        context: undefined,
        encrypted: true
      };

    } catch (error) {
      console.error('Log encryption failed:', error);
      return entry;
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];
    const configLevel = levels.indexOf(this.config.logLevel);
    const messageLevel = levels.indexOf(level);
    
    return messageLevel >= configLevel;
  }

  private shouldEncrypt(entry: LogEntry): boolean {
    if (!this.config.encryption.encryptSensitive) {
      return false;
    }

    // Encrypt based on level
    if (entry.level === 'CRITICAL' || entry.level === 'ERROR') {
      return true;
    }

    // Encrypt if contains sensitive data
    if (entry.context?.userId || entry.data) {
      return true;
    }

    return false;
  }

  private createMetadata(): LogMetadata {
    const metadata: LogMetadata = {
      hostname: require('os').hostname(),
      pid: process.pid,
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    if (this.config.auditTrail.includeStackTrace) {
      const stack = new Error().stack;
      metadata.stackTrace = stack?.split('\n').slice(3, 8).join('\n'); // Limit stack trace
    }

    return metadata;
  }

  private async writeToOutputs(entry: LogEntry): Promise<void> {
    const writePromises = this.config.outputs
      .filter(output => output.enabled && this.shouldWriteToOutput(entry, output))
      .map(output => this.writeToOutput(entry, output));

    await Promise.allSettled(writePromises);
  }

  private shouldWriteToOutput(entry: LogEntry, output: LogOutput): boolean {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];
    const outputLevel = levels.indexOf(output.minLevel);
    const entryLevel = levels.indexOf(entry.level);
    
    return entryLevel >= outputLevel;
  }

  private async writeToOutput(entry: LogEntry, output: LogOutput): Promise<void> {
    try {
      const formattedEntry = output.formatter ? output.formatter(entry) : this.defaultFormatter(entry);
      
      switch (output.type) {
        case 'FILE':
          await this.writeToFile(formattedEntry, output.config);
          break;
        case 'CONSOLE':
          this.writeToConsole(formattedEntry, entry.level);
          break;
        case 'DATABASE':
          await this.writeToDatabase(entry, output.config);
          break;
        case 'REMOTE':
          await this.writeToRemote(entry, output.config);
          break;
        case 'SYSLOG':
          await this.writeToSyslog(formattedEntry, output.config);
          break;
      }
    } catch (error) {
      console.error(`Failed to write to ${output.type} output:`, error);
    }
  }

  private async writeToFile(content: string, config: any): Promise<void> {
    const logFile = config.path || './logs/app.log';
    const logDir = path.dirname(logFile);
    
    // Ensure directory exists
    await fs.mkdir(logDir, { recursive: true });
    
    // Append to file
    await fs.appendFile(logFile, content + '\n');
    
    // Handle log rotation if configured
    if (config.maxSize) {
      await this.rotateLogFile(logFile, config);
    }
  }

  private writeToConsole(content: string, level: string): void {
    switch (level) {
      case 'DEBUG':
        console.debug(content);
        break;
      case 'INFO':
        console.info(content);
        break;
      case 'WARN':
        console.warn(content);
        break;
      case 'ERROR':
      case 'CRITICAL':
        console.error(content);
        break;
      default:
        console.log(content);
    }
  }

  private async writeToDatabase(entry: LogEntry, config: any): Promise<void> {
    // Database writing would be implemented based on your database choice
    // This is a placeholder
    console.log('Writing to database:', entry.id);
  }

  private async writeToRemote(entry: LogEntry, config: any): Promise<void> {
    // Remote logging would be implemented based on your remote logging service
    // This is a placeholder
    console.log('Writing to remote:', entry.id);
  }

  private async writeToSyslog(content: string, config: any): Promise<void> {
    // Syslog integration would be implemented here
    // This is a placeholder
    console.log('Writing to syslog:', content);
  }

  private defaultFormatter(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.padEnd(8);
    const message = entry.message;
    const data = entry.data ? ` | ${JSON.stringify(entry.data)}` : '';
    const context = entry.context ? ` | Context: ${JSON.stringify(entry.context)}` : '';
    
    return `${timestamp} [${level}] ${message}${data}${context}`;
  }

  private async rotateLogFile(logFile: string, config: any): Promise<void> {
    try {
      const stats = await fs.stat(logFile);
      
      if (stats.size > config.maxSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFile = `${logFile}.${timestamp}`;
        
        await fs.rename(logFile, rotatedFile);
        
        // Clean up old rotated files
        if (config.maxFiles) {
          await this.cleanupRotatedFiles(logFile, config.maxFiles);
        }
      }
    } catch (error) {
      console.error('Log rotation failed:', error);
    }
  }

  private async cleanupRotatedFiles(baseFile: string, maxFiles: number): Promise<void> {
    try {
      const dir = path.dirname(baseFile);
      const baseName = path.basename(baseFile);
      const files = await fs.readdir(dir);
      
      const rotatedFiles = files
        .filter(file => file.startsWith(baseName) && file !== baseName)
        .map(file => ({
          name: file,
          path: path.join(dir, file),
          stat: fs.stat(path.join(dir, file))
        }));

      const fileStats = await Promise.all(
        rotatedFiles.map(async file => ({
          ...file,
          stat: await file.stat
        }))
      );

      const sortedFiles = fileStats
        .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime())
        .slice(maxFiles);

      for (const file of sortedFiles) {
        await fs.unlink(file.path);
      }
    } catch (error) {
      console.error('Cleanup of rotated files failed:', error);
    }
  }

  private initializeSensitivePatterns(): void {
    this.sensitivePatterns = [
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card numbers
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
      /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, // IP addresses
      /password["\s]*[:=]["\s]*[^"\s,}]+/gi, // Passwords in JSON/config
      /token["\s]*[:=]["\s]*[^"\s,}]+/gi, // Tokens
      /key["\s]*[:=]["\s]*[^"\s,}]+/gi, // API keys
      /secret["\s]*[:=]["\s]*[^"\s,}]+/gi // Secrets
    ];
  }

  private setupAsyncLogging(): void {
    this.flushTimer = setInterval(async () => {
      if (this.logBuffer.length > 0) {
        await this.flush();
      }
    }, this.config.performance.flushInterval);
  }

  private async initializeOutputs(): Promise<void> {
    // Initialize any outputs that require setup
    for (const output of this.config.outputs) {
      if (output.type === 'FILE' && output.config.path) {
        const logDir = path.dirname(output.config.path);
        await fs.mkdir(logDir, { recursive: true });
      }
    }
  }

  public async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Secure Logger...');
    
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Final flush
    await this.flush();
    
    console.log('✅ Secure Logger shut down');
  }
}

// Default logger configuration
export const createDefaultLoggerConfig = (): LoggerConfig => ({
  logLevel: (process.env.LOG_LEVEL as any) || 'INFO',
  outputs: [
    {
      type: 'CONSOLE',
      config: {},
      enabled: process.env.NODE_ENV !== 'production',
      minLevel: 'DEBUG'
    },
    {
      type: 'FILE',
      config: {
        path: './logs/app.log',
        maxSize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5
      },
      enabled: true,
      minLevel: 'INFO'
    },
    {
      type: 'FILE',
      config: {
        path: './logs/audit.log',
        maxSize: 50 * 1024 * 1024, // 50MB
        maxFiles: 10
      },
      enabled: true,
      minLevel: 'WARN'
    }
  ],
  encryption: {
    enabled: process.env.NODE_ENV === 'production',
    encryptSensitive: true,
    keyRotationInterval: 24 * 60 * 60 * 1000 // 24 hours
  },
  sensitiveDataHandling: {
    enabled: true,
    maskingRules: [
      {
        field: 'password',
        pattern: /.*/,
        replacement: '[MASKED]',
        description: 'Mask all password fields'
      },
      {
        field: 'token',
        pattern: /.*/,
        replacement: '[MASKED]',
        description: 'Mask all token fields'
      },
      {
        field: 'apiKey',
        pattern: /.*/,
        replacement: '[MASKED]',
        description: 'Mask all API key fields'
      },
      {
        field: 'ssn',
        pattern: /\d{3}-\d{2}-\d{4}/,
        replacement: 'XXX-XX-XXXX',
        description: 'Mask SSN format'
      }
    ],
    exclusionRules: [
      {
        field: 'creditCard',
        condition: (value) => typeof value === 'string' && /\d{16}/.test(value),
        description: 'Exclude credit card numbers'
      }
    ]
  },
  auditTrail: {
    enabled: true,
    includeStackTrace: process.env.NODE_ENV !== 'production',
    includeUserContext: true,
    retentionPeriod: 90 * 24 * 60 * 60 * 1000 // 90 days
  },
  performance: {
    asyncLogging: true,
    bufferSize: 100,
    flushInterval: 5000 // 5 seconds
  },
  compliance: {
    gdprCompliant: true,
    hipaaCompliant: false,
    pciCompliant: true
  }
});