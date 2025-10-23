import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface EncryptionConfig {
  algorithm: string;
  keyDerivation: {
    algorithm: string;
    iterations: number;
    keyLength: number;
    saltLength: number;
  };
  compression: {
    enabled: boolean;
    algorithm: 'gzip' | 'deflate';
  };
  keyRotation: {
    enabled: boolean;
    interval: number; // milliseconds
    retentionCount: number;
  };
  auditLogging: boolean;
}

export interface EncryptionKey {
  id: string;
  version: number;
  algorithm: string;
  key: Buffer;
  salt: Buffer;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  metadata: Record<string, any>;
}

export interface EncryptedData {
  keyId: string;
  keyVersion: number;
  algorithm: string;
  iv: string;
  authTag: string;
  data: string;
  compressed: boolean;
  timestamp: Date;
  checksum: string;
}

export interface EncryptionMetrics {
  totalOperations: number;
  encryptionOperations: number;
  decryptionOperations: number;
  keyRotations: number;
  failedOperations: number;
  averageOperationTime: number;
  dataVolume: {
    encrypted: number;
    decrypted: number;
  };
}

export class DataEncryption extends EventEmitter {
  private config: EncryptionConfig;
  private keys: Map<string, EncryptionKey> = new Map();
  private activeKeyId?: string;
  private metrics: EncryptionMetrics;
  private rotationTimer?: NodeJS.Timeout;

  constructor(config: EncryptionConfig) {
    super();
    this.config = config;
    this.metrics = {
      totalOperations: 0,
      encryptionOperations: 0,
      decryptionOperations: 0,
      keyRotations: 0,
      failedOperations: 0,
      averageOperationTime: 0,
      dataVolume: { encrypted: 0, decrypted: 0 }
    };
  }

  public async initialize(masterPassword: string): Promise<void> {
    console.log('🔐 Initializing Data Encryption...');
    
    try {
      // Load existing keys or create initial key
      await this.loadKeys(masterPassword);
      
      if (this.keys.size === 0) {
        await this.generateInitialKey(masterPassword);
      }
      
      // Set up key rotation if enabled
      if (this.config.keyRotation.enabled) {
        this.setupKeyRotation();
      }
      
      console.log('✅ Data Encryption initialized');
      this.emit('initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Data Encryption:', error);
      throw error;
    }
  }

  public async encryptData(data: string | Buffer, options?: {
    keyId?: string;
    compress?: boolean;
    metadata?: Record<string, any>;
  }): Promise<EncryptedData> {
    const startTime = Date.now();
    
    try {
      const keyId = options?.keyId || this.activeKeyId;
      if (!keyId) {
        throw new Error('No active encryption key available');
      }

      const encryptionKey = this.keys.get(keyId);
      if (!encryptionKey || !encryptionKey.isActive) {
        throw new Error(`Encryption key not found or inactive: ${keyId}`);
      }

      // Convert data to buffer
      const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
      
      // Compress data if enabled
      let processedData = dataBuffer;
      let compressed = false;
      
      if (options?.compress !== false && this.config.compression.enabled) {
        processedData = await this.compressData(dataBuffer);
        compressed = true;
      }

      // Generate IV
      const iv = crypto.randomBytes(16);
      
      // Create cipher
      const cipher = crypto.createCipher(this.config.algorithm, encryptionKey.key);
      cipher.setAAD(Buffer.from(keyId)); // Additional authenticated data
      
      // Encrypt data
      let encrypted = cipher.update(processedData);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      // Get authentication tag
      const authTag = cipher.getAuthTag();
      
      // Calculate checksum
      const checksum = crypto.createHash('sha256')
        .update(encrypted)
        .update(authTag)
        .digest('hex');

      const encryptedData: EncryptedData = {
        keyId,
        keyVersion: encryptionKey.version,
        algorithm: this.config.algorithm,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        data: encrypted.toString('hex'),
        compressed,
        timestamp: new Date(),
        checksum
      };

      // Update metrics
      this.updateMetrics('encrypt', Date.now() - startTime, processedData.length);
      
      if (this.config.auditLogging) {
        this.logOperation('ENCRYPT', keyId, processedData.length, options?.metadata);
      }

      this.emit('dataEncrypted', {
        keyId,
        dataSize: processedData.length,
        compressed,
        duration: Date.now() - startTime
      });

      return encryptedData;

    } catch (error) {
      this.metrics.failedOperations++;
      this.emit('encryptionError', { error, duration: Date.now() - startTime });
      throw error;
    }
  }

  public async decryptData(encryptedData: EncryptedData): Promise<Buffer> {
    const startTime = Date.now();
    
    try {
      const encryptionKey = this.keys.get(encryptedData.keyId);
      if (!encryptionKey) {
        throw new Error(`Decryption key not found: ${encryptedData.keyId}`);
      }

      // Verify checksum
      const encrypted = Buffer.from(encryptedData.data, 'hex');
      const authTag = Buffer.from(encryptedData.authTag, 'hex');
      const calculatedChecksum = crypto.createHash('sha256')
        .update(encrypted)
        .update(authTag)
        .digest('hex');

      if (calculatedChecksum !== encryptedData.checksum) {
        throw new Error('Data integrity check failed - checksum mismatch');
      }

      // Create decipher
      const decipher = crypto.createDecipher(encryptedData.algorithm, encryptionKey.key);
      decipher.setAAD(Buffer.from(encryptedData.keyId));
      decipher.setAuthTag(authTag);

      // Decrypt data
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      // Decompress if needed
      if (encryptedData.compressed) {
        decrypted = await this.decompressData(decrypted);
      }

      // Update metrics
      this.updateMetrics('decrypt', Date.now() - startTime, decrypted.length);
      
      if (this.config.auditLogging) {
        this.logOperation('DECRYPT', encryptedData.keyId, decrypted.length);
      }

      this.emit('dataDecrypted', {
        keyId: encryptedData.keyId,
        dataSize: decrypted.length,
        compressed: encryptedData.compressed,
        duration: Date.now() - startTime
      });

      return decrypted;

    } catch (error) {
      this.metrics.failedOperations++;
      this.emit('decryptionError', { error, encryptedData, duration: Date.now() - startTime });
      throw error;
    }
  }

  public async rotateKey(reason: string = 'Manual rotation'): Promise<string> {
    console.log(`🔄 Starting key rotation: ${reason}`);
    
    try {
      // Generate new key
      const newKey = await this.generateKey();
      
      // Deactivate old key but keep it for decryption
      if (this.activeKeyId) {
        const oldKey = this.keys.get(this.activeKeyId);
        if (oldKey) {
          oldKey.isActive = false;
        }
      }
      
      // Set new key as active
      this.activeKeyId = newKey.id;
      
      // Clean up old keys if needed
      await this.cleanupOldKeys();
      
      // Persist keys
      await this.persistKeys();
      
      this.metrics.keyRotations++;
      
      if (this.config.auditLogging) {
        this.logOperation('KEY_ROTATION', newKey.id, 0, { reason, oldKeyId: this.activeKeyId });
      }

      console.log(`✅ Key rotation completed: ${newKey.id}`);
      this.emit('keyRotated', { newKeyId: newKey.id, reason });
      
      return newKey.id;

    } catch (error) {
      console.error('❌ Key rotation failed:', error);
      this.emit('keyRotationError', { error, reason });
      throw error;
    }
  }

  public async encryptFile(filePath: string, outputPath?: string): Promise<string> {
    try {
      const data = await fs.readFile(filePath);
      const encryptedData = await this.encryptData(data, { compress: true });
      
      const output = outputPath || `${filePath}.encrypted`;
      await fs.writeFile(output, JSON.stringify(encryptedData, null, 2));
      
      console.log(`🔐 File encrypted: ${filePath} -> ${output}`);
      return output;

    } catch (error) {
      console.error(`❌ File encryption failed: ${filePath}`, error);
      throw error;
    }
  }

  public async decryptFile(encryptedFilePath: string, outputPath?: string): Promise<string> {
    try {
      const encryptedContent = await fs.readFile(encryptedFilePath, 'utf8');
      const encryptedData: EncryptedData = JSON.parse(encryptedContent);
      
      const decryptedData = await this.decryptData(encryptedData);
      
      const output = outputPath || encryptedFilePath.replace('.encrypted', '');
      await fs.writeFile(output, decryptedData);
      
      console.log(`🔓 File decrypted: ${encryptedFilePath} -> ${output}`);
      return output;

    } catch (error) {
      console.error(`❌ File decryption failed: ${encryptedFilePath}`, error);
      throw error;
    }
  }

  public getMetrics(): EncryptionMetrics {
    return { ...this.metrics };
  }

  public getActiveKeyInfo(): { keyId: string; version: number; createdAt: Date } | null {
    if (!this.activeKeyId) return null;
    
    const key = this.keys.get(this.activeKeyId);
    if (!key) return null;
    
    return {
      keyId: key.id,
      version: key.version,
      createdAt: key.createdAt
    };
  }

  public listKeys(): Array<{
    id: string;
    version: number;
    isActive: boolean;
    createdAt: Date;
    expiresAt?: Date;
  }> {
    return Array.from(this.keys.values()).map(key => ({
      id: key.id,
      version: key.version,
      isActive: key.isActive,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt
    }));
  }

  private async generateInitialKey(masterPassword: string): Promise<void> {
    const key = await this.generateKey();
    this.activeKeyId = key.id;
    await this.persistKeys();
    
    console.log(`🔑 Generated initial encryption key: ${key.id}`);
  }

  private async generateKey(): Promise<EncryptionKey> {
    const keyId = crypto.randomUUID();
    const salt = crypto.randomBytes(this.config.keyDerivation.saltLength);
    
    // Derive key from master password
    const derivedKey = crypto.pbkdf2Sync(
      process.env.MASTER_ENCRYPTION_KEY || 'default-master-key',
      salt,
      this.config.keyDerivation.iterations,
      this.config.keyDerivation.keyLength,
      this.config.keyDerivation.algorithm
    );

    const key: EncryptionKey = {
      id: keyId,
      version: this.getNextKeyVersion(),
      algorithm: this.config.algorithm,
      key: derivedKey,
      salt,
      createdAt: new Date(),
      isActive: true,
      metadata: {}
    };

    this.keys.set(keyId, key);
    return key;
  }

  private getNextKeyVersion(): number {
    let maxVersion = 0;
    for (const key of this.keys.values()) {
      if (key.version > maxVersion) {
        maxVersion = key.version;
      }
    }
    return maxVersion + 1;
  }

  private async compressData(data: Buffer): Promise<Buffer> {
    const zlib = require('zlib');
    
    return new Promise((resolve, reject) => {
      if (this.config.compression.algorithm === 'gzip') {
        zlib.gzip(data, (err: Error | null, compressed: Buffer) => {
          if (err) reject(err);
          else resolve(compressed);
        });
      } else {
        zlib.deflate(data, (err: Error | null, compressed: Buffer) => {
          if (err) reject(err);
          else resolve(compressed);
        });
      }
    });
  }

  private async decompressData(data: Buffer): Promise<Buffer> {
    const zlib = require('zlib');
    
    return new Promise((resolve, reject) => {
      if (this.config.compression.algorithm === 'gzip') {
        zlib.gunzip(data, (err: Error | null, decompressed: Buffer) => {
          if (err) reject(err);
          else resolve(decompressed);
        });
      } else {
        zlib.inflate(data, (err: Error | null, decompressed: Buffer) => {
          if (err) reject(err);
          else resolve(decompressed);
        });
      }
    });
  }

  private setupKeyRotation(): void {
    this.rotationTimer = setInterval(async () => {
      try {
        await this.rotateKey('Automatic rotation');
      } catch (error) {
        console.error('❌ Automatic key rotation failed:', error);
      }
    }, this.config.keyRotation.interval);
  }

  private async cleanupOldKeys(): void {
    const sortedKeys = Array.from(this.keys.values())
      .filter(key => !key.isActive)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Keep only the configured number of old keys
    const keysToDelete = sortedKeys.slice(this.config.keyRotation.retentionCount);
    
    for (const key of keysToDelete) {
      this.keys.delete(key.id);
      console.log(`🗑️  Cleaned up old encryption key: ${key.id}`);
    }
  }

  private async loadKeys(masterPassword: string): Promise<void> {
    // In a real implementation, this would load keys from secure storage
    // For now, we'll simulate loading from environment or secure store
    console.log('📂 Loading encryption keys...');
  }

  private async persistKeys(): Promise<void> {
    // In a real implementation, this would persist keys to secure storage
    // For now, we'll simulate persistence
    console.log('💾 Persisting encryption keys...');
  }

  private updateMetrics(operation: 'encrypt' | 'decrypt', duration: number, dataSize: number): void {
    this.metrics.totalOperations++;
    
    if (operation === 'encrypt') {
      this.metrics.encryptionOperations++;
      this.metrics.dataVolume.encrypted += dataSize;
    } else {
      this.metrics.decryptionOperations++;
      this.metrics.dataVolume.decrypted += dataSize;
    }

    // Update average operation time
    const totalTime = this.metrics.averageOperationTime * (this.metrics.totalOperations - 1) + duration;
    this.metrics.averageOperationTime = totalTime / this.metrics.totalOperations;
  }

  private logOperation(operation: string, keyId: string, dataSize: number, metadata?: Record<string, any>): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation,
      keyId,
      dataSize,
      metadata: metadata || {}
    };
    
    // In a real implementation, this would write to secure audit log
    console.log(`🔍 Encryption Audit: ${JSON.stringify(logEntry)}`);
  }

  public async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Data Encryption...');
    
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }
    
    // Final key persistence
    await this.persistKeys();
    
    console.log('✅ Data Encryption shut down');
  }
}

// Default encryption configuration
export const createDefaultEncryptionConfig = (): EncryptionConfig => ({
  algorithm: 'aes-256-gcm',
  keyDerivation: {
    algorithm: 'sha512',
    iterations: 100000,
    keyLength: 32,
    saltLength: 16
  },
  compression: {
    enabled: true,
    algorithm: 'gzip'
  },
  keyRotation: {
    enabled: true,
    interval: 24 * 60 * 60 * 1000, // 24 hours
    retentionCount: 5
  },
  auditLogging: true
});

// Utility functions for common encryption tasks
export class EncryptionUtils {
  private static dataEncryption?: DataEncryption;

  public static async initialize(config?: EncryptionConfig): Promise<void> {
    const finalConfig = config || createDefaultEncryptionConfig();
    EncryptionUtils.dataEncryption = new DataEncryption(finalConfig);
    
    const masterPassword = process.env.MASTER_ENCRYPTION_KEY || 'default-master-key';
    await EncryptionUtils.dataEncryption.initialize(masterPassword);
  }

  public static async encryptSensitiveData(data: any): Promise<string> {
    if (!EncryptionUtils.dataEncryption) {
      throw new Error('Encryption not initialized');
    }

    const jsonData = JSON.stringify(data);
    const encrypted = await EncryptionUtils.dataEncryption.encryptData(jsonData, { compress: true });
    return JSON.stringify(encrypted);
  }

  public static async decryptSensitiveData(encryptedData: string): Promise<any> {
    if (!EncryptionUtils.dataEncryption) {
      throw new Error('Encryption not initialized');
    }

    const encrypted: EncryptedData = JSON.parse(encryptedData);
    const decrypted = await EncryptionUtils.dataEncryption.decryptData(encrypted);
    return JSON.parse(decrypted.toString('utf8'));
  }

  public static async encryptTradingData(tradingData: {
    positions?: any[];
    orders?: any[];
    pnl?: any;
    accountInfo?: any;
  }): Promise<string> {
    // Remove or mask sensitive fields before encryption
    const sanitizedData = {
      ...tradingData,
      accountInfo: tradingData.accountInfo ? {
        ...tradingData.accountInfo,
        accountNumber: '***MASKED***',
        ssn: undefined,
        bankAccount: undefined
      } : undefined
    };

    return EncryptionUtils.encryptSensitiveData(sanitizedData);
  }

  public static getEncryptionInstance(): DataEncryption | undefined {
    return EncryptionUtils.dataEncryption;
  }
}