import { PostgreSQLConfig } from '../gamma-services/database/PostgreSQLManager';

export interface ProductionPostgreSQLConfig extends PostgreSQLConfig {
  environment: 'development' | 'staging' | 'production';
  ssl: boolean;
  maxConnections: number;
  idleTimeout: number;
  connectionTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export const getPostgreSQLConfig = (): ProductionPostgreSQLConfig => {
  const environment = (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development';
  
  return {
    environment,
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'regimecompass',
    username: process.env.POSTGRES_USER || 'regimecompass',
    password: process.env.POSTGRES_PASSWORD || '',
    ssl: environment === 'production' || process.env.POSTGRES_SSL === 'true',
    max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20'),
    idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '10000'),
    maxConnections: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20'),
    idleTimeout: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '30000'),
    connectionTimeout: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '10000'),
    retryAttempts: parseInt(process.env.POSTGRES_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.POSTGRES_RETRY_DELAY || '1000')
  };
};

export const validatePostgreSQLConfig = (config: ProductionPostgreSQLConfig): void => {
  if (!config.host) {
    throw new Error('POSTGRES_HOST environment variable is required');
  }
  
  if (!config.database) {
    throw new Error('POSTGRES_DB environment variable is required');
  }
  
  if (!config.username) {
    throw new Error('POSTGRES_USER environment variable is required');
  }
  
  if (!config.password) {
    throw new Error('POSTGRES_PASSWORD environment variable is required');
  }
  
  if (config.port < 1 || config.port > 65535) {
    throw new Error('POSTGRES_PORT must be a valid port number');
  }
  
  if (config.maxConnections < 1 || config.maxConnections > 100) {
    throw new Error('POSTGRES_MAX_CONNECTIONS must be between 1 and 100');
  }
  
  if (config.idleTimeout < 1000) {
    throw new Error('POSTGRES_IDLE_TIMEOUT must be at least 1000ms');
  }
  
  if (config.connectionTimeout < 1000) {
    throw new Error('POSTGRES_CONNECTION_TIMEOUT must be at least 1000ms');
  }
};

export const getConnectionString = (config: ProductionPostgreSQLConfig): string => {
  const sslParam = config.ssl ? '?sslmode=require' : '';
  return `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}${sslParam}`;
};
