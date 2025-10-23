import { DatabaseConfig } from '../gamma-services/database/DatabaseManager';

export interface ProductionDatabaseConfig extends DatabaseConfig {
  environment: 'development' | 'staging' | 'production';
  connectionPoolSize: number;
  ssl: boolean;
  maxConnections: number;
  idleTimeout: number;
  connectionTimeout: number;
}

export const getDatabaseConfig = (): ProductionDatabaseConfig => {
  const environment = (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development';
  
  return {
    environment,
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_ANON_KEY || '',
    connectionPoolSize: parseInt(process.env.DB_CONNECTION_POOL_SIZE || '10'),
    ssl: environment === 'production',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000')
  };
};

export const validateDatabaseConfig = (config: ProductionDatabaseConfig): void => {
  if (!config.supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required');
  }
  
  if (!config.supabaseKey) {
    throw new Error('SUPABASE_ANON_KEY environment variable is required');
  }
  
  if (config.connectionPoolSize < 1 || config.connectionPoolSize > 100) {
    throw new Error('DB_CONNECTION_POOL_SIZE must be between 1 and 100');
  }
  
  if (config.maxConnections < 1 || config.maxConnections > 100) {
    throw new Error('DB_MAX_CONNECTIONS must be between 1 and 100');
  }
};
