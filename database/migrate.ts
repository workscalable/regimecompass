import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getDatabaseConfig, validateDatabaseConfig } from './config';

export class DatabaseMigrator {
  private supabase: any;
  private config: ReturnType<typeof getDatabaseConfig>;

  constructor() {
    this.config = getDatabaseConfig();
    validateDatabaseConfig(this.config);
    this.supabase = createClient(this.config.supabaseUrl, this.config.supabaseKey);
  }

  async runMigrations(): Promise<void> {
    console.log('🚀 Starting database migrations...');
    
    try {
      // Run migration 001: Initial Schema
      await this.runMigration('001_initial_schema.sql');
      
      // Run migration 002: Indexes and Performance
      await this.runMigration('002_indexes_and_performance.sql');
      
      // Run migration 003: Security and RLS
      await this.runMigration('003_security_and_rls.sql');
      
      console.log('✅ All migrations completed successfully!');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  private async runMigration(migrationFile: string): Promise<void> {
    console.log(`📄 Running migration: ${migrationFile}`);
    
    try {
      const migrationPath = join(__dirname, 'migrations', migrationFile);
      const migrationSQL = readFileSync(migrationPath, 'utf8');
      
      // Split the migration into individual statements
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          const { error } = await this.supabase.rpc('exec_sql', { sql: statement });
          if (error) {
            console.error(`❌ Error executing statement: ${statement.substring(0, 100)}...`);
            throw error;
          }
        }
      }
      
      console.log(`✅ Migration ${migrationFile} completed successfully`);
    } catch (error) {
      console.error(`❌ Migration ${migrationFile} failed:`, error);
      throw error;
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (error) {
        console.error('❌ Database connection failed:', error);
        return false;
      }
      
      console.log('✅ Database connection successful');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
  }

  async createIndexes(): Promise<void> {
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
        console.warn(`⚠️ Index creation warning: ${error}`);
      }
    }
    
    console.log('✅ Database indexes created');
  }
}

// CLI interface
if (require.main === module) {
  const migrator = new DatabaseMigrator();
  
  migrator.runMigrations()
    .then(() => {
      console.log('🎉 Database setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database setup failed:', error);
      process.exit(1);
    });
}
