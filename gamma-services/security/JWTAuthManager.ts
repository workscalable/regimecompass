import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { SecureKeyManager } from './SecureKeyManager';

export interface JWTConfig {
  secretKey: string;
  issuer: string;
  audience: string;
  accessTokenExpiry: string; // e.g., '15m'
  refreshTokenExpiry: string; // e.g., '7d'
  algorithm: jwt.Algorithm;
  clockTolerance: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

export interface TokenPayload {
  sub: string; // subject (user ID)
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  iat: number; // issued at
  exp: number; // expires at
  iss: string; // issuer
  aud: string; // audience
  jti: string; // JWT ID
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface RefreshTokenData {
  userId: string;
  tokenId: string;
  createdAt: Date;
  expiresAt: Date;
  isRevoked: boolean;
  deviceInfo?: string;
  ipAddress?: string;
}

export class JWTAuthManager {
  private config: JWTConfig;
  private keyManager: SecureKeyManager;
  private refreshTokens: Map<string, RefreshTokenData> = new Map();
  private revokedTokens: Set<string> = new Set();
  private users: Map<string, User> = new Map();

  constructor(config: JWTConfig, keyManager: SecureKeyManager) {
    this.config = config;
    this.keyManager = keyManager;
  }

  public async initialize(): Promise<void> {
    console.log('🔐 Initializing JWT Auth Manager...');
    
    // Load existing refresh tokens and revoked tokens
    await this.loadPersistedData();
    
    // Set up token cleanup
    this.setupTokenCleanup();
    
    console.log('✅ JWT Auth Manager initialized');
  }

  public async createUser(userData: {
    username: string;
    email: string;
    password: string;
    roles?: string[];
    permissions?: string[];
    metadata?: Record<string, any>;
  }): Promise<User> {
    const userId = crypto.randomUUID();
    const hashedPassword = await this.hashPassword(userData.password);
    
    const user: User = {
      id: userId,
      username: userData.username,
      email: userData.email,
      roles: userData.roles || ['user'],
      permissions: userData.permissions || [],
      metadata: {
        ...userData.metadata,
        passwordHash: hashedPassword
      },
      createdAt: new Date(),
      isActive: true
    };

    this.users.set(userId, user);
    await this.persistUsers();
    
    console.log(`👤 Created user: ${userData.username} (${userId})`);
    return user;
  }

  public async authenticateUser(username: string, password: string): Promise<User | null> {
    // Find user by username or email
    const user = Array.from(this.users.values()).find(
      u => u.username === username || u.email === username
    );

    if (!user || !user.isActive) {
      return null;
    }

    const passwordHash = user.metadata.passwordHash;
    if (!passwordHash) {
      return null;
    }

    const isValidPassword = await this.verifyPassword(password, passwordHash);
    if (!isValidPassword) {
      return null;
    }

    // Update last login
    user.lastLogin = new Date();
    await this.persistUsers();

    console.log(`✅ User authenticated: ${username}`);
    return user;
  }

  public async generateTokens(user: User, deviceInfo?: string, ipAddress?: string): Promise<AuthTokens> {
    const tokenId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    
    // Create access token payload
    const accessPayload: TokenPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
      iat: now,
      exp: now + this.parseExpiry(this.config.accessTokenExpiry),
      iss: this.config.issuer,
      aud: this.config.audience,
      jti: tokenId
    };

    // Generate tokens
    const accessToken = jwt.sign(accessPayload, this.config.secretKey, {
      algorithm: this.config.algorithm
    });

    const refreshTokenId = crypto.randomUUID();
    const refreshToken = jwt.sign(
      {
        sub: user.id,
        jti: refreshTokenId,
        type: 'refresh',
        iat: now,
        exp: now + this.parseExpiry(this.config.refreshTokenExpiry)
      },
      this.config.secretKey,
      { algorithm: this.config.algorithm }
    );

    // Store refresh token data
    const refreshTokenData: RefreshTokenData = {
      userId: user.id,
      tokenId: refreshTokenId,
      createdAt: new Date(),
      expiresAt: new Date((now + this.parseExpiry(this.config.refreshTokenExpiry)) * 1000),
      isRevoked: false,
      deviceInfo,
      ipAddress
    };

    this.refreshTokens.set(refreshTokenId, refreshTokenData);
    await this.persistRefreshTokens();

    console.log(`🎫 Generated tokens for user: ${user.username}`);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.parseExpiry(this.config.accessTokenExpiry)
    };
  }

  public async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      const decoded = jwt.verify(token, this.config.secretKey, {
        issuer: this.config.issuer,
        audience: this.config.audience,
        algorithms: [this.config.algorithm],
        clockTolerance: this.config.clockTolerance
      }) as TokenPayload;

      // Check if token is revoked
      if (this.revokedTokens.has(decoded.jti)) {
        console.log(`🚫 Token is revoked: ${decoded.jti}`);
        return null;
      }

      // Verify user still exists and is active
      const user = this.users.get(decoded.sub);
      if (!user || !user.isActive) {
        console.log(`🚫 User not found or inactive: ${decoded.sub}`);
        return null;
      }

      return decoded;
    } catch (error) {
      console.log(`🚫 Token verification failed: ${(error as Error).message}`);
      return null;
    }
  }

  public async refreshTokens(refreshToken: string): Promise<AuthTokens | null> {
    try {
      const decoded = jwt.verify(refreshToken, this.config.secretKey) as any;
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      const refreshTokenData = this.refreshTokens.get(decoded.jti);
      if (!refreshTokenData || refreshTokenData.isRevoked) {
        throw new Error('Refresh token not found or revoked');
      }

      if (refreshTokenData.expiresAt < new Date()) {
        throw new Error('Refresh token expired');
      }

      const user = this.users.get(decoded.sub);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Revoke old refresh token
      refreshTokenData.isRevoked = true;
      
      // Generate new tokens
      const newTokens = await this.generateTokens(user);
      
      console.log(`🔄 Refreshed tokens for user: ${user.username}`);
      return newTokens;

    } catch (error) {
      console.log(`🚫 Token refresh failed: ${(error as Error).message}`);
      return null;
    }
  }

  public async revokeToken(tokenId: string): Promise<boolean> {
    this.revokedTokens.add(tokenId);
    await this.persistRevokedTokens();
    
    console.log(`🚫 Revoked token: ${tokenId}`);
    return true;
  }

  public async revokeAllUserTokens(userId: string): Promise<number> {
    let revokedCount = 0;

    // Revoke all refresh tokens for user
    for (const [tokenId, tokenData] of this.refreshTokens) {
      if (tokenData.userId === userId && !tokenData.isRevoked) {
        tokenData.isRevoked = true;
        revokedCount++;
      }
    }

    await this.persistRefreshTokens();
    
    console.log(`🚫 Revoked ${revokedCount} tokens for user: ${userId}`);
    return revokedCount;
  }

  public hasPermission(user: TokenPayload, permission: string): boolean {
    return user.permissions.includes(permission) || user.roles.includes('admin');
  }

  public hasRole(user: TokenPayload, role: string): boolean {
    return user.roles.includes(role);
  }

  public hasAnyRole(user: TokenPayload, roles: string[]): boolean {
    return roles.some(role => user.roles.includes(role));
  }

  public async updateUserRoles(userId: string, roles: string[]): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) {
      return false;
    }

    user.roles = roles;
    await this.persistUsers();
    
    console.log(`👤 Updated roles for user ${userId}: ${roles.join(', ')}`);
    return true;
  }

  public async updateUserPermissions(userId: string, permissions: string[]): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) {
      return false;
    }

    user.permissions = permissions;
    await this.persistUsers();
    
    console.log(`👤 Updated permissions for user ${userId}: ${permissions.join(', ')}`);
    return true;
  }

  public async deactivateUser(userId: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) {
      return false;
    }

    user.isActive = false;
    await this.persistUsers();
    
    // Revoke all tokens for this user
    await this.revokeAllUserTokens(userId);
    
    console.log(`👤 Deactivated user: ${userId}`);
    return true;
  }

  public getTokenStats(): {
    activeRefreshTokens: number;
    revokedTokens: number;
    expiredTokens: number;
    totalUsers: number;
    activeUsers: number;
  } {
    const now = new Date();
    let expiredTokens = 0;
    let activeRefreshTokens = 0;

    for (const tokenData of this.refreshTokens.values()) {
      if (tokenData.expiresAt < now) {
        expiredTokens++;
      } else if (!tokenData.isRevoked) {
        activeRefreshTokens++;
      }
    }

    const activeUsers = Array.from(this.users.values()).filter(u => u.isActive).length;

    return {
      activeRefreshTokens,
      revokedTokens: this.revokedTokens.size,
      expiredTokens,
      totalUsers: this.users.size,
      activeUsers
    };
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    const [salt, hash] = hashedPassword.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }

  private parseExpiry(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: return parseInt(expiry);
    }
  }

  private setupTokenCleanup(): void {
    // Clean up expired tokens every hour
    setInterval(async () => {
      await this.cleanupExpiredTokens();
    }, 60 * 60 * 1000);
  }

  private async cleanupExpiredTokens(): Promise<void> {
    const now = new Date();
    let cleanedCount = 0;

    // Clean up expired refresh tokens
    for (const [tokenId, tokenData] of this.refreshTokens) {
      if (tokenData.expiresAt < now) {
        this.refreshTokens.delete(tokenId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      await this.persistRefreshTokens();
      console.log(`🧹 Cleaned up ${cleanedCount} expired refresh tokens`);
    }
  }

  private async loadPersistedData(): Promise<void> {
    try {
      // Load users
      const usersKey = await this.keyManager.getKeyByName('jwt_users');
      if (usersKey) {
        const usersData = JSON.parse(usersKey);
        for (const [userId, userData] of Object.entries(usersData)) {
          this.users.set(userId, {
            ...(userData as any),
            createdAt: new Date((userData as any).createdAt),
            lastLogin: (userData as any).lastLogin ? new Date((userData as any).lastLogin) : undefined
          });
        }
      }

      // Load refresh tokens
      const refreshTokensKey = await this.keyManager.getKeyByName('jwt_refresh_tokens');
      if (refreshTokensKey) {
        const refreshTokensData = JSON.parse(refreshTokensKey);
        for (const [tokenId, tokenData] of Object.entries(refreshTokensData)) {
          this.refreshTokens.set(tokenId, {
            ...(tokenData as any),
            createdAt: new Date((tokenData as any).createdAt),
            expiresAt: new Date((tokenData as any).expiresAt)
          });
        }
      }

      // Load revoked tokens
      const revokedTokensKey = await this.keyManager.getKeyByName('jwt_revoked_tokens');
      if (revokedTokensKey) {
        const revokedTokensData = JSON.parse(revokedTokensKey);
        this.revokedTokens = new Set(revokedTokensData);
      }

    } catch (error) {
      console.error('⚠️  Failed to load persisted JWT data:', error);
    }
  }

  private async persistUsers(): Promise<void> {
    const usersData: Record<string, any> = {};
    for (const [userId, user] of this.users) {
      usersData[userId] = user;
    }
    
    await this.keyManager.storeKey('jwt_users', JSON.stringify(usersData), {
      encrypt: true,
      metadata: { type: 'jwt_users' }
    });
  }

  private async persistRefreshTokens(): Promise<void> {
    const refreshTokensData: Record<string, any> = {};
    for (const [tokenId, tokenData] of this.refreshTokens) {
      refreshTokensData[tokenId] = tokenData;
    }
    
    await this.keyManager.storeKey('jwt_refresh_tokens', JSON.stringify(refreshTokensData), {
      encrypt: true,
      metadata: { type: 'jwt_refresh_tokens' }
    });
  }

  private async persistRevokedTokens(): Promise<void> {
    const revokedTokensArray = Array.from(this.revokedTokens);
    
    await this.keyManager.storeKey('jwt_revoked_tokens', JSON.stringify(revokedTokensArray), {
      encrypt: true,
      metadata: { type: 'jwt_revoked_tokens' }
    });
  }

  public async shutdown(): Promise<void> {
    console.log('🛑 Shutting down JWT Auth Manager...');
    
    // Persist all data
    await Promise.all([
      this.persistUsers(),
      this.persistRefreshTokens(),
      this.persistRevokedTokens()
    ]);
    
    console.log('✅ JWT Auth Manager shut down');
  }
}

// Default JWT configuration
export const createDefaultJWTConfig = (): JWTConfig => ({
  secretKey: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
  issuer: process.env.JWT_ISSUER || 'gamma-adaptive-system',
  audience: process.env.JWT_AUDIENCE || 'gamma-adaptive-users',
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  algorithm: (process.env.JWT_ALGORITHM as jwt.Algorithm) || 'HS256',
  clockTolerance: parseInt(process.env.JWT_CLOCK_TOLERANCE || '30')
});

// Role-based access control helpers
export const ROLES = {
  ADMIN: 'admin',
  TRADER: 'trader',
  ANALYST: 'analyst',
  VIEWER: 'viewer',
  USER: 'user'
} as const;

export const PERMISSIONS = {
  // Trading permissions
  EXECUTE_TRADES: 'execute_trades',
  VIEW_POSITIONS: 'view_positions',
  MANAGE_PORTFOLIO: 'manage_portfolio',
  
  // System permissions
  MANAGE_USERS: 'manage_users',
  VIEW_SYSTEM_METRICS: 'view_system_metrics',
  MANAGE_CONFIGURATION: 'manage_configuration',
  
  // Data permissions
  VIEW_MARKET_DATA: 'view_market_data',
  EXPORT_DATA: 'export_data',
  
  // Admin permissions
  SYSTEM_ADMIN: 'system_admin',
  SECURITY_ADMIN: 'security_admin'
} as const;

export const DEFAULT_ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.EXECUTE_TRADES,
    PERMISSIONS.VIEW_POSITIONS,
    PERMISSIONS.MANAGE_PORTFOLIO,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_SYSTEM_METRICS,
    PERMISSIONS.MANAGE_CONFIGURATION,
    PERMISSIONS.VIEW_MARKET_DATA,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.SYSTEM_ADMIN,
    PERMISSIONS.SECURITY_ADMIN
  ],
  [ROLES.TRADER]: [
    PERMISSIONS.EXECUTE_TRADES,
    PERMISSIONS.VIEW_POSITIONS,
    PERMISSIONS.MANAGE_PORTFOLIO,
    PERMISSIONS.VIEW_MARKET_DATA
  ],
  [ROLES.ANALYST]: [
    PERMISSIONS.VIEW_POSITIONS,
    PERMISSIONS.VIEW_SYSTEM_METRICS,
    PERMISSIONS.VIEW_MARKET_DATA,
    PERMISSIONS.EXPORT_DATA
  ],
  [ROLES.VIEWER]: [
    PERMISSIONS.VIEW_POSITIONS,
    PERMISSIONS.VIEW_MARKET_DATA
  ],
  [ROLES.USER]: [
    PERMISSIONS.VIEW_MARKET_DATA
  ]
};