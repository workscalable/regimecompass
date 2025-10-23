# RegimeCompass Database Setup

This directory contains the database schema, migrations, and setup scripts for the RegimeCompass trading system.

## Overview

The RegimeCompass database is built on **PostgreSQL** via **Supabase** and includes:

- **User Management**: User accounts and authentication
- **Paper Trading**: Virtual trading accounts, positions, and orders
- **Analytics**: Trade analysis and performance metrics
- **Logging**: System logs and audit trails
- **Security**: Row Level Security (RLS) for data isolation

## Quick Start

### 1. Environment Setup

Copy the environment template and configure your database:

```bash
cp env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 2. Database Setup

Run the database setup script:

```bash
npm run db:setup
```

This will:
- Create all necessary tables
- Set up indexes for performance
- Configure Row Level Security
- Create audit and logging tables

### 3. Verify Setup

Check that the database is properly configured:

```bash
npm run db:migrate
```

## Database Schema

### Core Tables

#### Users
- User authentication and profile information
- Email verification and account status

#### Paper Accounts
- Virtual trading accounts
- Balance tracking and risk settings
- User-specific account isolation

#### Paper Positions
- Open and closed trading positions
- Options contracts with Greeks
- PnL tracking and performance metrics

#### Paper Orders
- Order history and execution tracking
- Market, limit, and stop orders
- Fill tracking and timestamps

### Analytics Tables

#### Trade Analysis
- Detailed trade performance analysis
- Learning insights and recommendations
- Entry/exit confidence tracking

#### Performance Metrics
- Portfolio performance over time
- Win rates, profit factors, Sharpe ratios
- Drawdown analysis and risk metrics

### Logging Tables

#### System Logs
- Application logs with correlation IDs
- User actions and system events
- Error tracking and debugging

#### Audit Logs
- Security and compliance logging
- User actions and data changes
- Regulatory compliance tracking

#### System Alerts
- Alert management and tracking
- Severity levels and acknowledgments
- Alert resolution and history

## Security Features

### Row Level Security (RLS)

All tables have RLS enabled with policies that ensure:

- **User Isolation**: Users can only access their own data
- **Account Security**: Paper accounts are user-specific
- **Position Privacy**: Trading positions are private to account owners
- **Audit Trail**: System logs are accessible to authorized users

### Data Encryption

- **At Rest**: Supabase handles encryption of data at rest
- **In Transit**: All connections use SSL/TLS
- **Sensitive Data**: API keys and secrets are environment-based

## Performance Optimization

### Indexes

The database includes optimized indexes for:

- **Position Queries**: Account ID, ticker, status, timestamps
- **Order Lookups**: Account ID, position ID, status
- **Analytics**: Time-based queries and aggregations
- **Logging**: Level, category, timestamp, correlation ID

### Connection Pooling

- **Pool Size**: Configurable connection pool (default: 10)
- **Max Connections**: Maximum concurrent connections (default: 20)
- **Timeouts**: Idle and connection timeouts configured
- **SSL**: Production connections use SSL

## Migration System

### Migration Files

- `001_initial_schema.sql`: Core table structure
- `002_indexes_and_performance.sql`: Performance optimization
- `003_security_and_rls.sql`: Security policies

### Running Migrations

```bash
# Run all migrations
npm run db:migrate

# Reset database (development only)
npm run db:reset
```

## Production Considerations

### Environment Variables

Required for production:

```env
NODE_ENV=production
SUPABASE_URL=your_production_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DB_CONNECTION_POOL_SIZE=20
DB_MAX_CONNECTIONS=50
```

### Monitoring

- **Connection Monitoring**: Track active connections
- **Query Performance**: Monitor slow queries
- **Error Tracking**: Database error logging
- **Backup Strategy**: Regular automated backups

### Scaling

- **Read Replicas**: For analytics queries
- **Connection Pooling**: PgBouncer for connection management
- **Index Optimization**: Regular index maintenance
- **Query Optimization**: Performance monitoring

## Troubleshooting

### Common Issues

1. **Connection Failures**
   - Check Supabase URL and keys
   - Verify network connectivity
   - Check SSL configuration

2. **Migration Errors**
   - Ensure proper permissions
   - Check for existing tables
   - Verify SQL syntax

3. **Performance Issues**
   - Monitor connection pool usage
   - Check index usage
   - Analyze slow queries

### Support

For database issues:

1. Check the logs: `tail -f logs/regimecompass.log`
2. Verify environment variables
3. Test connection: `npm run db:migrate`
4. Check Supabase dashboard for errors

## Development

### Local Development

For local development, you can use:

- **Supabase Local**: Local Supabase instance
- **Docker**: Containerized PostgreSQL
- **Cloud**: Supabase cloud instance

### Testing

```bash
# Run database tests
npm test -- --grep "database"

# Test migrations
npm run db:migrate -- --dry-run
```

## Schema Changes

When making schema changes:

1. Create a new migration file
2. Test the migration locally
3. Update the migration runner
4. Test in staging environment
5. Deploy to production

Example migration file:

```sql
-- Migration 004: Add new feature
-- Description of changes

ALTER TABLE paper_positions ADD COLUMN new_field VARCHAR(100);
CREATE INDEX idx_paper_positions_new_field ON paper_positions(new_field);
```
