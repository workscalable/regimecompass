import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface KeyConfig {
  encryptionKey?: string;
  keyStorePath: string;
  rotationInterval: number; // in milliseconds
  backupCount: number;
  compressionEnabled: boolean;
}

export interface SecureKey {
  id: string;
  name: string;
  value: string;
  encrypted: boolean;
  createdAt: Date;
  lastUsed?: Date;
  expiresAt?: Date;
  metadata: Record<string, any>;
}

export interface KeyRotationInfo {
  keyId: string;
  oldVersion: string;
  newVersion: string;
  rotatedAt: Date;
  reason: string;
}

export class SecureKeyManager {
  private config: KeyConfig;
  private masterKey: Buffer;
  private keys: Map<string, SecureKey> = new Map();
  private rotationTimers: Map<string, NodeJS.Timeout> = new Map();
  private algorithm = 'aes-256-gcm';

  constructor(config: KeyConfig) {
    this.config = config;
    this.masterKey = this.deriveMasterKey(config.encryptionKey || process.env.MASTER_ENCRYPTION_KEY || 'default-key');
  }

  public async initialize(): Promise<void> {
    console.log('🔐 Initializing Secure Key Manager...');
    
    try {
      // Ensure key store directory exists
      await fs.mkdir(path.dirname(this.config.keyStorePath), { recursive: true });
      
      // Load existing keys
      await this.loadKeys();
      
      // Set up automatic key rotation
      this.setupKeyRotation();
      
      console.log('✅ Secure Key Manager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Secure Key Manager:', error);
      throw error;
    }
  }

  public async storeKey(name: string, value: string, options?: {
    expiresIn?: number;
    metadata?: Record<string, any>;
    encrypt?: boolean;
  }): Promise<string> {
    const keyId = this.generateKeyId();
    const now = new Date();
    
    const secureKey: SecureKey = {
      id: keyId,
      name,
      value: options?.encrypt !== false ? this.encrypt(value) : value,
      encrypted: options?.encrypt !== false,
      createdAt: now,
      expiresAt: options?.expiresIn ? new Date(now.getTime() + options.expiresIn) : undefined,
      metadata: options?.metadata || {}
    };

    this.keys.set(keyId, secureKey);
    await this.persistKeys();
    
    // Set up expiration if specified
    if (options?.expiresIn) {
      setTimeout(() => {
        this.deleteKey(keyId);
      }, options.expiresIn);
    }

    console.log(`🔑 Stored secure key: ${name} (ID: ${keyId})`);
    return keyId;
  }

  public async getKey(keyId: string): Promise<string | null> {
    const secureKey = this.keys.get(keyId);
    
    if (!secureKey) {
      return null;
    }

    // Check expiration
    if (secureKey.expiresAt && secureKey.expiresAt < new Date()) {
      await this.deleteKey(keyId);
      return null;
    }

    // Update last used timestamp
    secureKey.lastUsed = new Date();
    await this.persistKeys();

    return secureKey.encrypted ? this.decrypt(secureKey.value) : secureKey.value;
  }

  public async getKeyByName(name: string): Promise<string | null> {
    for (const [keyId, secureKey] of this.keys) {
      if (secureKey.name === name) {
        return this.getKey(keyId);
      }
    }
    return null;
  }

  public async deleteKey(keyId: string): Promise<boolean> {
    const deleted = this.keys.delete(keyId);
    
    if (deleted) {
      await this.persistKeys();
      
      // Clear rotation timer if exists
      const timer = this.rotationTimers.get(keyId);
      if (timer) {
        clearTimeout(timer);
        this.rotationTimers.delete(keyId);
      }
      
      console.log(`🗑️  Deleted secure key: ${keyId}`);
    }
    
    return deleted;
  }

  public async rotateKey(keyId: string, newValue: string): Promise<KeyRotationInfo> {
    const existingKey = this.keys.get(keyId);
    
    if (!existingKey) {
      throw new Error(`Key not found: ${keyId}`);
    }

    const oldValue = existingKey.encrypted ? this.decrypt(existingKey.value) : existingKey.value;
    const rotationInfo: KeyRotationInfo = {
      keyId,
      oldVersion: this.hashValue(oldValue),
      newVersion: this.hashValue(newValue),
      rotatedAt: new Date(),
      reason: 'Manual rotation'
    };

    // Update the key
    existingKey.value = existingKey.encrypted ? this.encrypt(newValue) : newValue;
    existingKey.lastUsed = new Date();
    
    await this.persistKeys();
    
    console.log(`🔄 Rotated key: ${existingKey.name} (ID: ${keyId})`);
    return rotationInfo;
  }

  public async listKeys(): Promise<Array<{
    id: string;
    name: string;
    createdAt: Date;
    lastUsed?: Date;
    expiresAt?: Date;
    metadata: Record<string, any>;
  }>> {
    return Array.from(this.keys.values()).map(key => ({
      id: key.id,
      name: key.name,
      createdAt: key.createdAt,
      lastUsed: key.lastUsed,
      expiresAt: key.expiresAt,
      metadata: key.metadata
    }));
  }

  public async exportKeys(password: string): Promise<string> {
    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      keys: Array.from(this.keys.values())
    };

    const exportJson = JSON.stringify(exportData);
    const exportKey = this.deriveMasterKey(password);
    
    return this.encryptWithKey(exportJson, exportKey);
  }

  public async importKeys(encryptedData: string, password: string): Promise<number> {
    try {
      const importKey = this.deriveMasterKey(password);
      const decryptedData = this.decryptWithKey(encryptedData, importKey);
      const importData = JSON.parse(decryptedData);
      
      let importedCount = 0;
      
      for (const keyData of importData.keys) {
        // Avoid duplicate keys
        if (!this.keys.has(keyData.id)) {
          this.keys.set(keyData.id, {
            ...keyData,
            createdAt: new Date(keyData.createdAt),
            lastUsed: keyData.lastUsed ? new Date(keyData.lastUsed) : undefined,
            expiresAt: keyData.expiresAt ? new Date(keyData.expiresAt) : undefined
          });
          importedCount++;
        }
      }
      
      await this.persistKeys();
      
      console.log(`📥 Imported ${importedCount} keys`);
      return importedCount;
      
    } catch (error) {
      console.error('❌ Failed to import keys:', error);
      throw new Error('Invalid import data or password');
    }
  }

  public async cleanup(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [keyId, secureKey] of this.keys) {
      // Remove expired keys
      if (secureKey.expiresAt && secureKey.expiresAt < now) {
        await this.deleteKey(keyId);
        cleanedCount++;
      }
    }
    
    console.log(`🧹 Cleaned up ${cleanedCount} expired keys`);
    return cleanedCount;
  }

  public getStats(): {
    totalKeys: number;
    encryptedKeys: number;
    expiredKeys: number;
    recentlyUsed: number;
  } {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    let encryptedKeys = 0;
    let expiredKeys = 0;
    let recentlyUsed = 0;
    
    for (const secureKey of this.keys.values()) {
      if (secureKey.encrypted) encryptedKeys++;
      if (secureKey.expiresAt && secureKey.expiresAt < now) expiredKeys++;
      if (secureKey.lastUsed && secureKey.lastUsed > oneDayAgo) recentlyUsed++;
    }
    
    return {
      totalKeys: this.keys.size,
      encryptedKeys,
      expiredKeys,
      recentlyUsed
    };
  }

  private encrypt(value: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.masterKey);
    
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedValue: string): string {
    const parts = encryptedValue.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted value format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipher(this.algorithm, this.masterKey);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  private encryptWithKey(value: string, key: Buffer): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipherGCM(this.algorithm, key, iv);
    
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  private decryptWithKey(encryptedValue: string, key: Buffer): string {
    const parts = encryptedValue.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted value format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipherGCM(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  private deriveMasterKey(password: string): Buffer {
    return crypto.pbkdf2Sync(password, 'gamma-adaptive-salt', 100000, 32, 'sha512');
  }

  private generateKeyId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private hashValue(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  private async loadKeys(): Promise<void> {
    try {
      const data = await fs.readFile(this.config.keyStorePath, 'utf8');
      const keyData = JSON.parse(data);
      
      for (const [keyId, keyInfo] of Object.entries(keyData)) {
        this.keys.set(keyId, {
          ...(keyInfo as any),
          createdAt: new Date((keyInfo as any).createdAt),
          lastUsed: (keyInfo as any).lastUsed ? new Date((keyInfo as any).lastUsed) : undefined,
          expiresAt: (keyInfo as any).expiresAt ? new Date((keyInfo as any).expiresAt) : undefined
        });
      }
      
      console.log(`📂 Loaded ${this.keys.size} keys from storage`);
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        console.error('❌ Failed to load keys:', error);
      }
      // File doesn't exist yet, start with empty key store
    }
  }

  private async persistKeys(): Promise<void> {
    try {
      const keyData: Record<string, any> = {};
      
      for (const [keyId, secureKey] of this.keys) {
        keyData[keyId] = secureKey;
      }
      
      await fs.writeFile(this.config.keyStorePath, JSON.stringify(keyData, null, 2));
      
      // Create backup
      await this.createBackup();
      
    } catch (error) {
      console.error('❌ Failed to persist keys:', error);
      throw error;
    }
  }

  private async createBackup(): Promise<void> {
    try {
      const backupPath = `${this.config.keyStorePath}.backup.${Date.now()}`;
      await fs.copyFile(this.config.keyStorePath, backupPath);
      
      // Clean up old backups
      await this.cleanupBackups();
      
    } catch (error) {
      console.error('⚠️  Failed to create backup:', error);
    }
  }

  private async cleanupBackups(): Promise<void> {
    try {
      const dir = path.dirname(this.config.keyStorePath);
      const basename = path.basename(this.config.keyStorePath);
      const files = await fs.readdir(dir);
      
      const backupFiles = files
        .filter(file => file.startsWith(`${basename}.backup.`))
        .map(file => ({
          name: file,
          path: path.join(dir, file),
          timestamp: parseInt(file.split('.').pop() || '0')
        }))
        .sort((a, b) => b.timestamp - a.timestamp);
      
      // Keep only the configured number of backups
      const filesToDelete = backupFiles.slice(this.config.backupCount);
      
      for (const file of filesToDelete) {
        await fs.unlink(file.path);
      }
      
    } catch (error) {
      console.error('⚠️  Failed to cleanup backups:', error);
    }
  }

  private setupKeyRotation(): void {
    // Set up automatic rotation for keys that need it
    for (const [keyId, secureKey] of this.keys) {
      if (secureKey.metadata.autoRotate) {
        const rotationInterval = secureKey.metadata.rotationInterval || this.config.rotationInterval;
        
        const timer = setTimeout(async () => {
          try {
            // Generate new key value (this would be service-specific)
            const newValue = crypto.randomBytes(32).toString('hex');
            await this.rotateKey(keyId, newValue);
            
            // Schedule next rotation
            this.setupKeyRotation();
          } catch (error) {
            console.error(`❌ Failed to auto-rotate key ${keyId}:`, error);
          }
        }, rotationInterval);
        
        this.rotationTimers.set(keyId, timer);
      }
    }
  }

  public async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Secure Key Manager...');
    
    // Clear all rotation timers
    for (const timer of this.rotationTimers.values()) {
      clearTimeout(timer);
    }
    this.rotationTimers.clear();
    
    // Final persist
    await this.persistKeys();
    
    console.log('✅ Secure Key Manager shut down');
  }
}

// Environment variable helper
export class EnvironmentKeyManager {
  private static instance: EnvironmentKeyManager;
  private keyManager: SecureKeyManager;

  private constructor() {
    this.keyManager = new SecureKeyManager({
      keyStorePath: process.env.KEY_STORE_PATH || './keys/secure-keys.json',
      rotationInterval: parseInt(process.env.KEY_ROTATION_INTERVAL || '86400000'), // 24 hours
      backupCount: parseInt(process.env.KEY_BACKUP_COUNT || '5'),
      compressionEnabled: process.env.KEY_COMPRESSION === 'true'
    });
  }

  public static getInstance(): EnvironmentKeyManager {
    if (!EnvironmentKeyManager.instance) {
      EnvironmentKeyManager.instance = new EnvironmentKeyManager();
    }
    return EnvironmentKeyManager.instance;
  }

  public async initialize(): Promise<void> {
    await this.keyManager.initialize();
    
    // Store common API keys from environment variables
    await this.storeEnvironmentKeys();
  }

  public async getApiKey(service: string): Promise<string | null> {
    return this.keyManager.getKeyByName(`api_key_${service}`);
  }

  public async storeApiKey(service: string, apiKey: string, options?: {
    expiresIn?: number;
    autoRotate?: boolean;
  }): Promise<string> {
    return this.keyManager.storeKey(`api_key_${service}`, apiKey, {
      metadata: {
        service,
        type: 'api_key',
        autoRotate: options?.autoRotate || false
      },
      expiresIn: options?.expiresIn,
      encrypt: true
    });
  }

  private async storeEnvironmentKeys(): Promise<void> {
    const envKeys = [
      { name: 'polygon', env: 'POLYGON_API_KEY' },
      { name: 'tradier', env: 'TRADIER_ACCESS_TOKEN' },
      { name: 'twelvedata', env: 'TWELVEDATA_API_KEY' },
      { name: 'cboe', env: 'CBOE_API_KEY' }
    ];

    for (const { name, env } of envKeys) {
      const value = process.env[env];
      if (value) {
        await this.storeApiKey(name, value, { autoRotate: false });
        console.log(`🔑 Stored API key for ${name}`);
      }
    }
  }

  public getKeyManager(): SecureKeyManager {
    return this.keyManager;
  }
}