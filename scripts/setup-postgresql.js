#!/usr/bin/env node

/**
 * RegimeCompass PostgreSQL Setup Script
 * This script sets up the PostgreSQL database for production deployment
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

class PostgreSQLSetup {
  constructor() {
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'regimecompass',
      user: process.env.POSTGRES_USER || 'regimecompass',
      password: process.env.POSTGRES_PASSWORD || '',
      ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20'),
      idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '10000'),
    });
  }

  async setup() {
    console.log('🐘 Setting up RegimeCompass PostgreSQL database...');
    
    try {
      // Check connection
      await this.checkConnection();
      
      // Run migrations
      await this.runMigrations();
      
      // Create indexes
      await this.createIndexes();
      
      // Set up RLS policies
      await this.setupRLS();
      
      console.log('✅ PostgreSQL setup completed successfully!');
    } catch (error) {
      console.error('❌ PostgreSQL setup failed:', error);
      process.exit(1);
    } finally {
      await this.pool.end();
    }
  }

  async checkConnection() {
    console.log('🔍 Checking PostgreSQL connection...');
    
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as version');
      client.release();
      
      console.log('✅ PostgreSQL connection successful');
      console.log(`📅 Database time: ${result.rows[0].current_time}`);
      console.log(`🐘 PostgreSQL version: ${result.rows[0].version.split(' ')[0]}`);
    } catch (error) {
      throw new Error(`PostgreSQL connection failed: ${error.message}`);
    }
  }

  async runMigrations() {
    console.log('📄 Running PostgreSQL migrations...');
    
    const migrations = [
      '001_initial_schema.sql',
      '002_indexes_and_performance.sql',
      '003_security_and_rls.sql'
    ];
    
    for (const migration of migrations) {
      await this.runMigration(migration);
    }
  }

  async runMigration(migrationFile) {
    console.log(`📄 Running migration: ${migrationFile}`);
    
    try {
      // Check if migration already ran
      await this.createMigrationsTable();
      
      const checkQuery = 'SELECT id FROM schema_migrations WHERE filename = $1';
      const checkResult = await this.pool.query(checkQuery, [migrationFile]);
      
      if (checkResult.rows.length > 0) {
        console.log(`⏭️ Migration ${migrationFile} already executed, skipping`);
        return;
      }
      
      const migrationPath = path.join(__dirname, '..', 'database', 'migrations', migrationFile);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      // Split into statements and execute
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          await this.pool.query(statement);
        }
      }
      
      // Record migration as completed
      const version = migrationFile.split('_')[0];
      await this.pool.query(
        'INSERT INTO schema_migrations (version, filename) VALUES ($1, $2)',
        [version, migrationFile]
      );
      
      console.log(`✅ Migration ${migrationFile} completed`);
    } catch (error) {
      console.error(`❌ Migration ${migrationFile} failed:`, error.message);
      throw error;
    }
  }

  async createMigrationsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) NOT NULL UNIQUE,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    await this.pool.query(query);
  }

  async createIndexes() {
    console.log('📊 Creating database indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_paper_positions_account_id ON paper_positions(account_id)',
      'CREATE INDEX IF NOT EXISTS idx_paper_positions_ticker ON paper_positions(ticker)',
      'CREATE INDEX IF NOT EXISTS idx_paper_positions_status ON paper_positions(status)',
      'CREATE INDEX IF NOT EXISTS idx_paper_positions_created_at ON paper_positions(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_paper_positions_account_status ON paper_positions(account_id, status)',
      'CREATE INDEX IF NOT EXISTS idx_paper_positions_ticker_status ON paper_positions(ticker, status)'
    ];
    
    for (const indexSQL of indexes) {
      try {
        await this.pool.query(indexSQL);
      } catch (error) {
        console.warn(`⚠️ Index creation warning: ${error.message}`);
      }
    }
    
    console.log('✅ Database indexes created');
  }

  async setupRLS() {
    console.log('🔒 Setting up Row Level Security...');
    
    // RLS is already set up in the migration files
    console.log('✅ Row Level Security configured');
  }

  async getMigrationStatus() {
    try {
      const query = `
        SELECT version, filename, executed_at 
        FROM schema_migrations 
        ORDER BY executed_at ASC
      `;
      
      const result = await this.pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Failed to get migration status:', error);
      return [];
    }
  }
}

// CLI interface
if (require.main === module) {
  const setup = new PostgreSQLSetup();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'setup':
    case undefined:
      setup.setup();
      break;
      
    case 'status':
      setup.getMigrationStatus()
        .then((migrations) => {
          console.log('📋 Migration Status:');
          migrations.forEach(migration => {
            console.log(`  ${migration.version}: ${migration.filename} (${migration.executed_at})`);
          });
        })
        .catch((error) => {
          console.error('💥 Failed to get migration status:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Usage: node setup-postgresql.js [setup|status]');
      process.exit(1);
  }
}

module.exports = PostgreSQLSetup;
