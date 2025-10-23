import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getPostgreSQLConfig, validatePostgreSQLConfig } from './postgresql-config';

export class PostgreSQLMigrator {
  private pool: Pool;
  private config: ReturnType<typeof getPostgreSQLConfig>;

  constructor() {
    this.config = getPostgreSQLConfig();
    validatePostgreSQLConfig(this.config);
    this.pool = new Pool({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
      max: this.config.maxConnections,
      idleTimeoutMillis: this.config.idleTimeout,
      connectionTimeoutMillis: this.config.connectionTimeout,
    });
  }

  async runMigrations(): Promise<void> {
    console.log('🚀 Starting PostgreSQL migrations...');
    
    try {
      // Test connection
      await this.testConnection();
      
      // Create migrations table if it doesn't exist
      await this.createMigrationsTable();
      
      // Run migration 001: Initial Schema
      await this.runMigration('001_initial_schema.sql');
      
      // Run migration 002: Indexes and Performance
      await this.runMigration('002_indexes_and_performance.sql');
      
      // Run migration 003: Security and RLS
      await this.runMigration('003_security_and_rls.sql');
      
      console.log('✅ All PostgreSQL migrations completed successfully!');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  private async testConnection(): Promise<void> {
    console.log('🔍 Testing PostgreSQL connection...');
    
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time');
      client.release();
      
      console.log('✅ PostgreSQL connection successful');
      console.log(`📅 Database time: ${result.rows[0].current_time}`);
    } catch (error) {
      throw new Error(`PostgreSQL connection failed: ${error.message}`);
    }
  }

  private async createMigrationsTable(): Promise<void> {
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

  private async runMigration(migrationFile: string): Promise<void> {
    console.log(`📄 Running migration: ${migrationFile}`);
    
    try {
      // Check if migration already ran
      const checkQuery = 'SELECT id FROM schema_migrations WHERE filename = $1';
      const checkResult = await this.pool.query(checkQuery, [migrationFile]);
      
      if (checkResult.rows.length > 0) {
        console.log(`⏭️ Migration ${migrationFile} already executed, skipping`);
        return;
      }
      
      const migrationPath = join(__dirname, 'migrations', migrationFile);
      const migrationSQL = readFileSync(migrationPath, 'utf8');
      
      // Split the migration into individual statements
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      // Execute each statement
      for (const statement of statements) {
        if (statement.trim()) {
          await this.pool.query(statement);
        }
      }
      
      // Record migration as completed
      const insertQuery = `
        INSERT INTO schema_migrations (version, filename) 
        VALUES ($1, $2)
      `;
      const version = migrationFile.split('_')[0];
      await this.pool.query(insertQuery, [version, migrationFile]);
      
      console.log(`✅ Migration ${migrationFile} completed successfully`);
    } catch (error) {
      console.error(`❌ Migration ${migrationFile} failed:`, error);
      throw error;
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT 1 as health');
      client.release();
      
      return result.rows[0].health === 1;
    } catch (error) {
      console.error('❌ PostgreSQL connection failed:', error);
      return false;
    }
  }

  async getMigrationStatus(): Promise<any[]> {
    const query = `
      SELECT version, filename, executed_at 
      FROM schema_migrations 
      ORDER BY executed_at ASC
    `;
    
    const result = await this.pool.query(query);
    return result.rows;
  }

  async rollbackMigration(migrationFile: string): Promise<void> {
    console.log(`🔄 Rolling back migration: ${migrationFile}`);
    
    try {
      // Remove migration record
      const deleteQuery = 'DELETE FROM schema_migrations WHERE filename = $1';
      await this.pool.query(deleteQuery, [migrationFile]);
      
      console.log(`✅ Migration ${migrationFile} rolled back successfully`);
    } catch (error) {
      console.error(`❌ Rollback failed for ${migrationFile}:`, error);
      throw error;
    }
  }
}

// CLI interface
if (require.main === module) {
  const migrator = new PostgreSQLMigrator();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'migrate':
      migrator.runMigrations()
        .then(() => {
          console.log('🎉 PostgreSQL setup complete!');
          process.exit(0);
        })
        .catch((error) => {
          console.error('💥 PostgreSQL setup failed:', error);
          process.exit(1);
        });
      break;
      
    case 'status':
      migrator.getMigrationStatus()
        .then((migrations) => {
          console.log('📋 Migration Status:');
          migrations.forEach(migration => {
            console.log(`  ${migration.version}: ${migration.filename} (${migration.executed_at})`);
          });
          process.exit(0);
        })
        .catch((error) => {
          console.error('💥 Failed to get migration status:', error);
          process.exit(1);
        });
      break;
      
    case 'rollback':
      const migrationFile = process.argv[3];
      if (!migrationFile) {
        console.error('❌ Please specify migration file to rollback');
        process.exit(1);
      }
      
      migrator.rollbackMigration(migrationFile)
        .then(() => {
          console.log('🎉 Rollback complete!');
          process.exit(0);
        })
        .catch((error) => {
          console.error('💥 Rollback failed:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Usage: node postgresql-migrate.js [migrate|status|rollback] [migration_file]');
      process.exit(1);
  }
}
