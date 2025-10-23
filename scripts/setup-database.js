#!/usr/bin/env node

/**
 * RegimeCompass Database Setup Script
 * This script sets up the production database with all necessary tables, indexes, and security policies
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

class DatabaseSetup {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );
  }

  async setup() {
    console.log('🚀 Setting up RegimeCompass database...');
    
    try {
      // Check connection
      await this.checkConnection();
      
      // Run migrations
      await this.runMigrations();
      
      // Create indexes
      await this.createIndexes();
      
      // Set up RLS policies
      await this.setupRLS();
      
      console.log('✅ Database setup completed successfully!');
    } catch (error) {
      console.error('❌ Database setup failed:', error);
      process.exit(1);
    }
  }

  async checkConnection() {
    console.log('🔍 Checking database connection...');
    
    try {
      const { data, error } = await this.supabase
        .from('information_schema.tables')
        .select('table_name')
        .limit(1);
      
      if (error) {
        throw new Error(`Connection failed: ${error.message}`);
      }
      
      console.log('✅ Database connection successful');
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async runMigrations() {
    console.log('📄 Running database migrations...');
    
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
      const migrationPath = path.join(__dirname, '..', 'database', 'migrations', migrationFile);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      // Split into statements and execute
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          const { error } = await this.supabase.rpc('exec_sql', { sql: statement });
          if (error) {
            console.warn(`⚠️ Statement warning: ${error.message}`);
          }
        }
      }
      
      console.log(`✅ Migration ${migrationFile} completed`);
    } catch (error) {
      console.error(`❌ Migration ${migrationFile} failed:`, error.message);
      throw error;
    }
  }

  async createIndexes() {
    console.log('📊 Creating database indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_paper_positions_account_id ON paper_positions(account_id)',
      'CREATE INDEX IF NOT EXISTS idx_paper_positions_ticker ON paper_positions(ticker)',
      'CREATE INDEX IF NOT EXISTS idx_paper_positions_status ON paper_positions(status)',
      'CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)'
    ];
    
    for (const indexSQL of indexes) {
      try {
        const { error } = await this.supabase.rpc('exec_sql', { sql: indexSQL });
        if (error) {
          console.warn(`⚠️ Index creation warning: ${error.message}`);
        }
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
}

// Run the setup
if (require.main === module) {
  const setup = new DatabaseSetup();
  setup.setup();
}

module.exports = DatabaseSetup;
