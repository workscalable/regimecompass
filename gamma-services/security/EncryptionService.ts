import crypto from 'crypto';

export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  saltLength: number;
  iterations: number;
}

export class EncryptionService {
  private config: EncryptionConfig;
  private masterKey: string;

  constructor(masterKey: string, config?: Partial<EncryptionConfig>) {
    this.masterKey = masterKey;
    this.config = {
      algorithm: 'aes-256-gcm',
      keyLength: 32,
      ivLength: 16,
      saltLength: 32,
      iterations: 100000,
      ...config
    };
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(data: string, password?: string): string {
    try {
      const key = password ? this.deriveKey(password) : this.deriveKey(this.masterKey);
      const iv = crypto.randomBytes(this.config.ivLength);
      const cipher = crypto.createCipher(this.config.algorithm, key);
      cipher.setAAD(Buffer.from('regimecompass', 'utf8'));

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Combine IV, auth tag, and encrypted data
      const result = {
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        encrypted: encrypted
      };

      return Buffer.from(JSON.stringify(result)).toString('base64');
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string, password?: string): string {
    try {
      const key = password ? this.deriveKey(password) : this.deriveKey(this.masterKey);
      const data = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'));
      
      const iv = Buffer.from(data.iv, 'hex');
      const authTag = Buffer.from(data.authTag, 'hex');
      const encrypted = data.encrypted;

      const decipher = crypto.createDecipher(this.config.algorithm, key);
      decipher.setAAD(Buffer.from('regimecompass', 'utf8'));
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Hash sensitive data (one-way)
   */
  hash(data: string, salt?: string): string {
    try {
      const actualSalt = salt || crypto.randomBytes(this.config.saltLength).toString('hex');
      const hash = crypto.pbkdf2Sync(data, actualSalt, this.config.iterations, this.config.keyLength, 'sha512');
      return `${actualSalt}:${hash.toString('hex')}`;
    } catch (error) {
      throw new Error(`Hashing failed: ${error.message}`);
    }
  }

  /**
   * Verify hashed data
   */
  verifyHash(data: string, hashedData: string): boolean {
    try {
      const [salt, hash] = hashedData.split(':');
      const newHash = crypto.pbkdf2Sync(data, salt, this.config.iterations, this.config.keyLength, 'sha512');
      return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), newHash);
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate secure random string
   */
  generateSecureRandom(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate API key
   */
  generateApiKey(prefix: string = 'rc'): string {
    const randomPart = this.generateSecureRandom(24);
    return `${prefix}_${randomPart}`;
  }

  /**
   * Generate secure token
   */
  generateSecureToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Encrypt API keys and sensitive configuration
   */
  encryptApiKey(apiKey: string): string {
    return this.encrypt(apiKey);
  }

  /**
   * Decrypt API keys and sensitive configuration
   */
  decryptApiKey(encryptedApiKey: string): string {
    return this.decrypt(encryptedApiKey);
  }

  /**
   * Encrypt trading signals and sensitive trading data
   */
  encryptTradingData(data: any): string {
    const jsonData = JSON.stringify(data);
    return this.encrypt(jsonData);
  }

  /**
   * Decrypt trading signals and sensitive trading data
   */
  decryptTradingData(encryptedData: string): any {
    const decrypted = this.decrypt(encryptedData);
    return JSON.parse(decrypted);
  }

  /**
   * Encrypt user personal data
   */
  encryptPersonalData(data: any): string {
    const jsonData = JSON.stringify(data);
    return this.encrypt(jsonData);
  }

  /**
   * Decrypt user personal data
   */
  decryptPersonalData(encryptedData: string): any {
    const decrypted = this.decrypt(encryptedData);
    return JSON.parse(decrypted);
  }

  /**
   * Create secure hash for audit trails
   */
  createAuditHash(data: any): string {
    const jsonData = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(jsonData).digest('hex');
  }

  /**
   * Verify data integrity
   */
  verifyIntegrity(data: any, expectedHash: string): boolean {
    const actualHash = this.createAuditHash(data);
    return crypto.timingSafeEqual(Buffer.from(actualHash, 'hex'), Buffer.from(expectedHash, 'hex'));
  }

  /**
   * Derive encryption key from password
   */
  private deriveKey(password: string, salt?: string): Buffer {
    const actualSalt = salt || crypto.randomBytes(this.config.saltLength);
    return crypto.pbkdf2Sync(password, actualSalt, this.config.iterations, this.config.keyLength, 'sha512');
  }

  /**
   * Generate secure password
   */
  generateSecurePassword(length: number = 16): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one character from each category
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length < 8) {
      feedback.push('Password must be at least 8 characters long');
    } else {
      score += 1;
    }

    if (!/[a-z]/.test(password)) {
      feedback.push('Password must contain at least one lowercase letter');
    } else {
      score += 1;
    }

    if (!/[A-Z]/.test(password)) {
      feedback.push('Password must contain at least one uppercase letter');
    } else {
      score += 1;
    }

    if (!/\d/.test(password)) {
      feedback.push('Password must contain at least one number');
    } else {
      score += 1;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      feedback.push('Password must contain at least one special character');
    } else {
      score += 1;
    }

    if (password.length >= 12) {
      score += 1;
    }

    return {
      isValid: score >= 4,
      score,
      feedback
    };
  }
}
