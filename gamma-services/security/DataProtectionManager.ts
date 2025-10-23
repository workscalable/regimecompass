import { EventEmitter } from 'events';
import { DataEncryption, createDefaultEncryptionConfig } from './DataEncryption';
import { TLSManager, createDefaultTLSConfig } from './TLSManager';
import { SecureLogger, createDefaultLoggerConfig } from './SecureLogger';

export interface DataProtectionConfig {
  encryption: {
    enabled: boolean;
    algorithm: string;
    keyRotationInterval: number;
    compressData: boolean;
  };
  tls: {
    enabled: boolean;
    minVersion: string;
    enforceHttps: boolean;
    hstsEnabled: boolean;
  };
  logging: {
    encryptLogs: boolean;
    auditTrailEnabled: boolean;
    sensitiveDataMasking: boolean;
    retentionPeriod: number;
  };
  compliance: {
    gdprEnabled: boolean;
    hipaaEnabled: boolean;
    pciEnabled: boolean;
    dataClassification: boolean;
  };
  backup: {
    enabled: boolean;
    encryptBackups: boolean;
    retentionCount: number;
    offSiteStorage: boolean;
  };
}

export interface DataClassification {
  PUBLIC: 'public';
  INTERNAL: 'internal';
  CONFIDENTIAL: 'confidential';
  RESTRICTED: 'restricted';
}

export interface ProtectedData {
  id: string;
  classification: keyof DataClassification;
  encrypted: boolean;
  compressed: boolean;
  timestamp: Date;
  metadata: {
    owner?: string;
    purpose?: string;
    retentionPeriod?: number;
    accessLog: DataAccessLog[];
  };
}

export interface DataAccessLog {
  timestamp: Date;
  userId?: string;
  operation: 'READ' | 'WRITE' | 'DELETE' | 'EXPORT';
  ipAddress?: string;
  userAgent?: string;
  authorized: boolean;
  purpose?: string;
}

export interface ComplianceReport {
  timestamp: Date;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalDataProcessed: number;
    encryptedDataPercentage: number;
    auditLogEntries: number;
    dataBreachIncidents: number;
    complianceViolations: number;
  };
  gdpr?: {
    dataSubjectRequests: number;
    rightToErasureRequests: number;
    dataPortabilityRequests: number;
    consentWithdrawals: number;
  };
  pci?: {
    cardDataProcessed: number;
    encryptedTransactions: number;
    vulnerabilityScans: number;
    accessControlViolations: number;
  };
  recommendations: string[];
}

export class DataProtectionManager extends EventEmitter {
  private config: DataProtectionConfig;
  private dataEncryption: DataEncryption;
  private tlsManager: TLSManager;
  private secureLogger: SecureLogger;
  private protectedDataRegistry: Map<string, ProtectedData> = new Map();
  private complianceMetrics: any = {};

  constructor(config: DataProtectionConfig) {
    super();
    this.config = config;
    
    // Initialize components
    this.dataEncryption = new DataEncryption(createDefaultEncryptionConfig());
    this.tlsManager = new TLSManager(createDefaultTLSConfig());
    this.secureLogger = new SecureLogger(createDefaultLoggerConfig());
  }

  public async initialize(): Promise<void> {
    console.log('🛡️  Initializing Data Protection Manager...');
    
    try {
      // Initialize encryption
      if (this.config.encryption.enabled) {
        const masterKey = process.env.MASTER_ENCRYPTION_KEY || 'default-master-key';
        await this.dataEncryption.initialize(masterKey);
      }
      
      // Initialize TLS
      if (this.config.tls.enabled) {
        await this.tlsManager.initialize();
      }
      
      // Initialize secure logging
      await this.secureLogger.initialize(
        this.config.logging.encryptLogs ? this.dataEncryption : undefined
      );
      
      // Set up event handlers
      this.setupEventHandlers();
      
      // Initialize compliance monitoring
      this.initializeComplianceMonitoring();
      
      console.log('✅ Data Protection Manager initialized');
      this.emit('initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Data Protection Manager:', error);
      throw error;
    }
  }

  public async protectSensitiveData(
    data: any,
    classification: keyof DataClassification,
    metadata?: {
      owner?: string;
      purpose?: string;
      retentionPeriod?: number;
    }
  ): Promise<string> {
    try {
      const dataId = require('crypto').randomUUID();
      
      // Determine protection level based on classification
      const shouldEncrypt = this.shouldEncryptData(classification);
      const shouldCompress = this.config.encryption.compressData;
      
      let protectedData = data;
      let encrypted = false;
      let compressed = false;
      
      // Apply encryption if required
      if (shouldEncrypt && this.config.encryption.enabled) {
        const encryptedResult = await this.dataEncryption.encryptData(
          JSON.stringify(data),
          { compress: shouldCompress }
        );
        protectedData = encryptedResult;
        encrypted = true;
        compressed = shouldCompress;
      }
      
      // Register protected data
      const protectedDataEntry: ProtectedData = {
        id: dataId,
        classification,
        encrypted,
        compressed,
        timestamp: new Date(),
        metadata: {
          ...metadata,
          accessLog: []
        }
      };
      
      this.protectedDataRegistry.set(dataId, protectedDataEntry);
      
      // Log data protection event
      await this.secureLogger.audit({
        level: 'INFO',
        message: 'Data protected',
        data: {
          dataId,
          classification,
          encrypted,
          compressed,
          purpose: metadata?.purpose
        },
        auditType: 'MODIFICATION',
        actor: { userId: metadata?.owner },
        resource: { type: 'DATA', id: dataId },
        action: 'PROTECT',
        outcome: 'SUCCESS',
        riskLevel: this.getRiskLevel(classification)
      });
      
      this.emit('dataProtected', { dataId, classification, encrypted });
      
      return dataId;
      
    } catch (error) {
      await this.secureLogger.error('Data protection failed', error);
      throw error;
    }
  }

  public async accessProtectedData(
    dataId: string,
    userId?: string,
    purpose?: string,
    context?: {
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<any> {
    try {
      const protectedData = this.protectedDataRegistry.get(dataId);
      if (!protectedData) {
        throw new Error(`Protected data not found: ${dataId}`);
      }
      
      // Check access authorization
      const authorized = await this.authorizeDataAccess(protectedData, userId, purpose);
      
      // Log access attempt
      const accessLog: DataAccessLog = {
        timestamp: new Date(),
        userId,
        operation: 'READ',
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        authorized,
        purpose
      };
      
      protectedData.metadata.accessLog.push(accessLog);
      
      if (!authorized) {
        await this.secureLogger.audit({
          level: 'WARN',
          message: 'Unauthorized data access attempt',
          data: { dataId, userId, purpose },
          auditType: 'ACCESS',
          actor: { userId, ipAddress: context?.ipAddress },
          resource: { type: 'DATA', id: dataId },
          action: 'READ',
          outcome: 'FAILURE',
          riskLevel: 'HIGH'
        });
        
        throw new Error('Access denied');
      }
      
      // Decrypt data if encrypted
      let data = protectedData;
      if (protectedData.encrypted) {
        // In a real implementation, you would retrieve and decrypt the actual data
        // For now, we'll simulate this
        console.log(`Decrypting data: ${dataId}`);
      }
      
      // Log successful access
      await this.secureLogger.audit({
        level: 'INFO',
        message: 'Data accessed',
        data: { dataId, userId, purpose },
        auditType: 'ACCESS',
        actor: { userId, ipAddress: context?.ipAddress },
        resource: { type: 'DATA', id: dataId },
        action: 'READ',
        outcome: 'SUCCESS',
        riskLevel: this.getRiskLevel(protectedData.classification)
      });
      
      this.emit('dataAccessed', { dataId, userId, authorized });
      
      return data;
      
    } catch (error) {
      await this.secureLogger.error('Data access failed', error, { userId });
      throw error;
    }
  }

  public async deleteProtectedData(
    dataId: string,
    userId?: string,
    reason?: string
  ): Promise<boolean> {
    try {
      const protectedData = this.protectedDataRegistry.get(dataId);
      if (!protectedData) {
        return false;
      }
      
      // Check deletion authorization
      const authorized = await this.authorizeDeletion(protectedData, userId);
      
      if (!authorized) {
        await this.secureLogger.audit({
          level: 'WARN',
          message: 'Unauthorized data deletion attempt',
          data: { dataId, userId, reason },
          auditType: 'DELETION',
          actor: { userId },
          resource: { type: 'DATA', id: dataId },
          action: 'DELETE',
          outcome: 'FAILURE',
          riskLevel: 'HIGH'
        });
        
        throw new Error('Deletion not authorized');
      }
      
      // Remove from registry
      this.protectedDataRegistry.delete(dataId);
      
      // Log deletion
      await this.secureLogger.audit({
        level: 'INFO',
        message: 'Data deleted',
        data: { dataId, userId, reason },
        auditType: 'DELETION',
        actor: { userId },
        resource: { type: 'DATA', id: dataId },
        action: 'DELETE',
        outcome: 'SUCCESS',
        riskLevel: this.getRiskLevel(protectedData.classification)
      });
      
      this.emit('dataDeleted', { dataId, userId });
      
      return true;
      
    } catch (error) {
      await this.secureLogger.error('Data deletion failed', error, { userId });
      throw error;
    }
  }

  public async exportUserData(userId: string): Promise<any> {
    if (!this.config.compliance.gdprEnabled) {
      throw new Error('GDPR compliance not enabled');
    }
    
    try {
      // Find all data associated with the user
      const userData = Array.from(this.protectedDataRegistry.values())
        .filter(data => data.metadata.owner === userId);
      
      // Log export request
      await this.secureLogger.audit({
        level: 'INFO',
        message: 'User data export requested',
        data: { userId, recordCount: userData.length },
        auditType: 'ACCESS',
        actor: { userId },
        resource: { type: 'USER_DATA', id: userId },
        action: 'EXPORT',
        outcome: 'SUCCESS',
        riskLevel: 'MEDIUM'
      });
      
      // Return anonymized export
      return {
        userId,
        exportDate: new Date(),
        records: userData.map(data => ({
          id: data.id,
          classification: data.classification,
          created: data.timestamp,
          purpose: data.metadata.purpose
        }))
      };
      
    } catch (error) {
      await this.secureLogger.error('User data export failed', error, { userId });
      throw error;
    }
  }

  public async processRightToErasure(userId: string): Promise<{
    deleted: number;
    errors: string[];
  }> {
    if (!this.config.compliance.gdprEnabled) {
      throw new Error('GDPR compliance not enabled');
    }
    
    const result = { deleted: 0, errors: [] };
    
    try {
      // Find all data associated with the user
      const userDataIds = Array.from(this.protectedDataRegistry.entries())
        .filter(([_, data]) => data.metadata.owner === userId)
        .map(([id, _]) => id);
      
      // Delete each data entry
      for (const dataId of userDataIds) {
        try {
          await this.deleteProtectedData(dataId, userId, 'Right to erasure request');
          result.deleted++;
        } catch (error) {
          result.errors.push(`Failed to delete ${dataId}: ${(error as Error).message}`);
        }
      }
      
      // Log erasure completion
      await this.secureLogger.audit({
        level: 'INFO',
        message: 'Right to erasure processed',
        data: { userId, deleted: result.deleted, errors: result.errors.length },
        auditType: 'DELETION',
        actor: { userId },
        resource: { type: 'USER_DATA', id: userId },
        action: 'ERASE',
        outcome: result.errors.length === 0 ? 'SUCCESS' : 'PARTIAL',
        riskLevel: 'MEDIUM'
      });
      
      return result;
      
    } catch (error) {
      await this.secureLogger.error('Right to erasure processing failed', error, { userId });
      throw error;
    }
  }

  public async generateComplianceReport(
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport> {
    try {
      const report: ComplianceReport = {
        timestamp: new Date(),
        period: { start: startDate, end: endDate },
        metrics: {
          totalDataProcessed: this.protectedDataRegistry.size,
          encryptedDataPercentage: this.calculateEncryptedDataPercentage(),
          auditLogEntries: await this.getAuditLogCount(startDate, endDate),
          dataBreachIncidents: 0, // Would be tracked separately
          complianceViolations: 0 // Would be tracked separately
        },
        recommendations: []
      };
      
      // Add GDPR metrics if enabled
      if (this.config.compliance.gdprEnabled) {
        report.gdpr = {
          dataSubjectRequests: 0, // Would be tracked
          rightToErasureRequests: 0, // Would be tracked
          dataPortabilityRequests: 0, // Would be tracked
          consentWithdrawals: 0 // Would be tracked
        };
      }
      
      // Add PCI metrics if enabled
      if (this.config.compliance.pciEnabled) {
        report.pci = {
          cardDataProcessed: 0, // Would be tracked
          encryptedTransactions: 0, // Would be tracked
          vulnerabilityScans: 0, // Would be tracked
          accessControlViolations: 0 // Would be tracked
        };
      }
      
      // Generate recommendations
      report.recommendations = this.generateComplianceRecommendations(report);
      
      // Log report generation
      await this.secureLogger.audit({
        level: 'INFO',
        message: 'Compliance report generated',
        data: { period: report.period, metricsCount: Object.keys(report.metrics).length },
        auditType: 'ACCESS',
        actor: { userId: 'system' },
        resource: { type: 'COMPLIANCE_REPORT' },
        action: 'GENERATE',
        outcome: 'SUCCESS',
        riskLevel: 'LOW'
      });
      
      return report;
      
    } catch (error) {
      await this.secureLogger.error('Compliance report generation failed', error);
      throw error;
    }
  }

  public getDataEncryption(): DataEncryption {
    return this.dataEncryption;
  }

  public getTLSManager(): TLSManager {
    return this.tlsManager;
  }

  public getSecureLogger(): SecureLogger {
    return this.secureLogger;
  }

  public getProtectionMetrics(): {
    totalProtectedData: number;
    encryptedData: number;
    dataByClassification: Record<string, number>;
    recentAccesses: number;
  } {
    const dataArray = Array.from(this.protectedDataRegistry.values());
    const recentCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    return {
      totalProtectedData: dataArray.length,
      encryptedData: dataArray.filter(d => d.encrypted).length,
      dataByClassification: dataArray.reduce((acc, data) => {
        acc[data.classification] = (acc[data.classification] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recentAccesses: dataArray.reduce((count, data) => {
        return count + data.metadata.accessLog.filter(log => log.timestamp > recentCutoff).length;
      }, 0)
    };
  }

  private shouldEncryptData(classification: keyof DataClassification): boolean {
    switch (classification) {
      case 'RESTRICTED':
      case 'CONFIDENTIAL':
        return true;
      case 'INTERNAL':
        return this.config.encryption.enabled;
      case 'PUBLIC':
        return false;
      default:
        return this.config.encryption.enabled;
    }
  }

  private getRiskLevel(classification: keyof DataClassification): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    switch (classification) {
      case 'PUBLIC': return 'LOW';
      case 'INTERNAL': return 'MEDIUM';
      case 'CONFIDENTIAL': return 'HIGH';
      case 'RESTRICTED': return 'CRITICAL';
      default: return 'MEDIUM';
    }
  }

  private async authorizeDataAccess(
    protectedData: ProtectedData,
    userId?: string,
    purpose?: string
  ): Promise<boolean> {
    // Implement your authorization logic here
    // For now, we'll use simple rules
    
    if (protectedData.classification === 'PUBLIC') {
      return true;
    }
    
    if (!userId) {
      return false;
    }
    
    if (protectedData.metadata.owner === userId) {
      return true;
    }
    
    // Additional authorization checks would go here
    return false;
  }

  private async authorizeDeletion(protectedData: ProtectedData, userId?: string): Promise<boolean> {
    // Only allow deletion by data owner or admin
    return protectedData.metadata.owner === userId || this.isAdmin(userId);
  }

  private isAdmin(userId?: string): boolean {
    // Implement admin check logic
    return false;
  }

  private calculateEncryptedDataPercentage(): number {
    const dataArray = Array.from(this.protectedDataRegistry.values());
    if (dataArray.length === 0) return 0;
    
    const encryptedCount = dataArray.filter(d => d.encrypted).length;
    return (encryptedCount / dataArray.length) * 100;
  }

  private async getAuditLogCount(startDate: Date, endDate: Date): Promise<number> {
    // This would query your audit log storage
    // For now, return a placeholder
    return 0;
  }

  private generateComplianceRecommendations(report: ComplianceReport): string[] {
    const recommendations: string[] = [];
    
    if (report.metrics.encryptedDataPercentage < 80) {
      recommendations.push('Consider encrypting more sensitive data to improve security posture');
    }
    
    if (report.metrics.auditLogEntries === 0) {
      recommendations.push('Ensure audit logging is properly configured and functioning');
    }
    
    if (this.config.compliance.gdprEnabled && !this.config.logging.auditTrailEnabled) {
      recommendations.push('Enable comprehensive audit trails for GDPR compliance');
    }
    
    return recommendations;
  }

  private setupEventHandlers(): void {
    // Data encryption events
    this.dataEncryption.on('keyRotated', (event) => {
      this.secureLogger.info('Encryption key rotated', event);
    });
    
    this.dataEncryption.on('encryptionError', (event) => {
      this.secureLogger.error('Encryption error', event.error);
    });
    
    // TLS events
    this.tlsManager.on('secureConnection', (connection) => {
      this.secureLogger.debug('Secure connection established', {
        id: connection.id,
        tlsVersion: connection.tlsVersion,
        cipher: connection.cipher
      });
    });
    
    this.tlsManager.on('weakConnection', (connection) => {
      this.secureLogger.warn('Weak TLS connection detected', connection);
    });
  }

  private initializeComplianceMonitoring(): void {
    // Set up periodic compliance checks
    setInterval(async () => {
      try {
        const metrics = this.getProtectionMetrics();
        
        // Check for compliance violations
        if (this.config.compliance.pciEnabled && metrics.encryptedData < metrics.totalProtectedData * 0.9) {
          await this.secureLogger.warn('PCI compliance warning: Not all sensitive data is encrypted');
        }
        
        // Update compliance metrics
        this.complianceMetrics = {
          ...this.complianceMetrics,
          lastCheck: new Date(),
          ...metrics
        };
        
      } catch (error) {
        await this.secureLogger.error('Compliance monitoring error', error);
      }
    }, 60 * 60 * 1000); // Every hour
  }

  public async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Data Protection Manager...');
    
    await Promise.all([
      this.dataEncryption.shutdown(),
      this.tlsManager.shutdown(),
      this.secureLogger.shutdown()
    ]);
    
    console.log('✅ Data Protection Manager shut down');
  }
}

// Default data protection configuration
export const createDefaultDataProtectionConfig = (): DataProtectionConfig => ({
  encryption: {
    enabled: process.env.NODE_ENV === 'production',
    algorithm: 'aes-256-gcm',
    keyRotationInterval: 24 * 60 * 60 * 1000, // 24 hours
    compressData: true
  },
  tls: {
    enabled: process.env.NODE_ENV === 'production',
    minVersion: 'TLSv1.2',
    enforceHttps: process.env.NODE_ENV === 'production',
    hstsEnabled: true
  },
  logging: {
    encryptLogs: process.env.NODE_ENV === 'production',
    auditTrailEnabled: true,
    sensitiveDataMasking: true,
    retentionPeriod: 90 * 24 * 60 * 60 * 1000 // 90 days
  },
  compliance: {
    gdprEnabled: process.env.GDPR_COMPLIANCE === 'true',
    hipaaEnabled: process.env.HIPAA_COMPLIANCE === 'true',
    pciEnabled: process.env.PCI_COMPLIANCE === 'true',
    dataClassification: true
  },
  backup: {
    enabled: true,
    encryptBackups: true,
    retentionCount: 7,
    offSiteStorage: process.env.NODE_ENV === 'production'
  }
});