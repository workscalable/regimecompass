import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { DatabaseManager } from '../database/DatabaseManager';

export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export class AuthenticationService {
  private supabase: any;
  private databaseManager: DatabaseManager;
  private jwtSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    jwtSecret: string,
    refreshTokenSecret: string
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.databaseManager = new DatabaseManager({ supabaseUrl, supabaseKey });
    this.jwtSecret = jwtSecret;
    this.refreshTokenSecret = refreshTokenSecret;
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
  }

  async register(data: RegisterData): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      // Validate input
      this.validateRegistrationData(data);

      // Check if user already exists
      const existingUser = await this.getUserByEmail(data.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      const existingUsername = await this.getUserByUsername(data.username);
      if (existingUsername) {
        throw new Error('Username already taken');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 12);

      // Create user in database
      const { data: userData, error } = await this.supabase
        .from('users')
        .insert({
          email: data.email,
          username: data.username,
          password_hash: passwordHash,
          first_name: data.firstName,
          last_name: data.lastName,
          is_active: true,
          email_verified: false
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Registration failed: ${error.message}`);
      }

      const user: User = {
        id: userData.id,
        email: userData.email,
        username: userData.username,
        firstName: userData.first_name,
        lastName: userData.last_name,
        isActive: userData.is_active,
        emailVerified: userData.email_verified,
        createdAt: new Date(userData.created_at),
        updatedAt: new Date(userData.updated_at)
      };

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Create default paper account
      await this.createDefaultPaperAccount(user.id);

      return { user, tokens };
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      // Validate input
      this.validateLoginCredentials(credentials);

      // Get user by email
      const user = await this.getUserByEmail(credentials.email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(credentials.password, user.id);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Generate tokens
      const tokens = await this.generateTokens(user);

      return { user, tokens };
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.refreshTokenSecret) as any;
      
      // Get user
      const user = await this.getUserById(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens
      return await this.generateTokens(user);
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    try {
      // In a production system, you would invalidate the refresh token
      // For now, we'll just log the logout
      console.log(`User ${userId} logged out`);
    } catch (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  async verifyToken(token: string): Promise<User> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      const user = await this.getUserById(decoded.userId);
      
      if (!user || !user.isActive) {
        throw new Error('Invalid token');
      }

      return user;
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Verify current password
      const isValidPassword = await this.verifyPassword(currentPassword, userId);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password
      this.validatePassword(newPassword);

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      // Update password in database
      const { error } = await this.supabase
        .from('users')
        .update({ password_hash: newPasswordHash })
        .eq('id', userId);

      if (error) {
        throw new Error(`Password change failed: ${error.message}`);
      }
    } catch (error) {
      throw new Error(`Password change failed: ${error.message}`);
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      // In a production system, you would:
      // 1. Generate a secure reset token
      // 2. Send reset email
      // 3. Store reset token with expiry
      
      const user = await this.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists
        return;
      }

      // For now, just log the reset request
      console.log(`Password reset requested for ${email}`);
    } catch (error) {
      throw new Error(`Password reset failed: ${error.message}`);
    }
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const accessToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        username: user.username 
      },
      this.jwtSecret,
      { expiresIn: this.accessTokenExpiry }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      this.refreshTokenSecret,
      { expiresIn: this.refreshTokenExpiry }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.getTokenExpiry(this.accessTokenExpiry)
    };
  }

  private async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapUserFromDatabase(data);
  }

  private async getUserByUsername(username: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapUserFromDatabase(data);
  }

  private async getUserById(id: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapUserFromDatabase(data);
  }

  private async verifyPassword(password: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return false;
    }

    return await bcrypt.compare(password, data.password_hash);
  }

  private async createDefaultPaperAccount(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('paper_accounts')
      .insert({
        user_id: userId,
        account_name: 'Default Account',
        initial_balance: 100000,
        current_balance: 100000,
        available_balance: 100000
      });

    if (error) {
      throw new Error(`Failed to create default paper account: ${error.message}`);
    }
  }

  private mapUserFromDatabase(data: any): User {
    return {
      id: data.id,
      email: data.email,
      username: data.username,
      firstName: data.first_name,
      lastName: data.last_name,
      isActive: data.is_active,
      emailVerified: data.email_verified,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private validateRegistrationData(data: RegisterData): void {
    if (!data.email || !this.isValidEmail(data.email)) {
      throw new Error('Valid email is required');
    }
    if (!data.username || data.username.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }
    this.validatePassword(data.password);
  }

  private validateLoginCredentials(credentials: LoginCredentials): void {
    if (!credentials.email || !credentials.password) {
      throw new Error('Email and password are required');
    }
  }

  private validatePassword(password: string): void {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private getTokenExpiry(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 15 * 60 * 1000; // 15 minutes default
    }
  }
}
