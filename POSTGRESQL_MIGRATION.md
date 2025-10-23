# PostgreSQL Migration Guide

This guide helps you migrate from Supabase to direct PostgreSQL for better control and performance.

## Why PostgreSQL over Supabase?

### Advantages of Direct PostgreSQL:
- **Better Performance**: Direct connection, no API overhead
- **Full Control**: Complete database administration capabilities
- **Cost Effective**: No per-request pricing, just server costs
- **Advanced Features**: Full PostgreSQL feature set
- **Custom Extensions**: Install any PostgreSQL extensions
- **Better Monitoring**: Direct access to PostgreSQL metrics
- **Backup Control**: Full control over backup and recovery

### When to Use Supabase:
- **Rapid Prototyping**: Quick setup for development
- **Built-in Auth**: Supabase Auth integration
- **Real-time Features**: Built-in real-time subscriptions
- **Managed Service**: Less database administration

## Migration Steps

### 1. Set up PostgreSQL Database

#### Option A: Local Development
```bash
# Using Docker
docker run --name regimecompass-postgres \
  -e POSTGRES_DB=regimecompass \
  -e POSTGRES_USER=regimecompass \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  -d postgres:15-alpine

# Or using Docker Compose
docker-compose up -d postgres
```

#### Option B: Production (Cloud Providers)
- **AWS RDS**: Managed PostgreSQL service
- **Google Cloud SQL**: Managed PostgreSQL
- **Azure Database**: Managed PostgreSQL
- **DigitalOcean**: Managed PostgreSQL
- **Self-hosted**: Your own PostgreSQL server

### 2. Configure Environment Variables

Update your `.env` file:

```env
# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=regimecompass
POSTGRES_USER=regimecompass
POSTGRES_PASSWORD=your_secure_password
POSTGRES_SSL=false  # true for production
POSTGRES_MAX_CONNECTIONS=20
POSTGRES_IDLE_TIMEOUT=30000
POSTGRES_CONNECTION_TIMEOUT=10000

# Legacy Supabase (comment out or remove)
# SUPABASE_URL=your_supabase_url
# SUPABASE_ANON_KEY=your_supabase_key
```

### 3. Run Database Setup

```bash
# Set up PostgreSQL database
npm run db:postgres

# Check migration status
npm run db:postgres:status
```

### 4. Update Application Code

The application will automatically use PostgreSQL when configured. The `PostgreSQLManager` class provides the same interface as the Supabase version.

### 5. Data Migration (if migrating existing data)

If you have existing data in Supabase, you'll need to export and import it:

```bash
# Export from Supabase (using Supabase CLI)
supabase db dump --data-only > data_export.sql

# Import to PostgreSQL
psql -h localhost -U regimecompass -d regimecompass -f data_export.sql
```

## Configuration Options

### Development Configuration
```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_SSL=false
POSTGRES_MAX_CONNECTIONS=10
```

### Production Configuration
```env
POSTGRES_HOST=your-production-host
POSTGRES_PORT=5432
POSTGRES_SSL=true
POSTGRES_MAX_CONNECTIONS=50
```

### High-Performance Configuration
```env
POSTGRES_MAX_CONNECTIONS=100
POSTGRES_IDLE_TIMEOUT=60000
POSTGRES_CONNECTION_TIMEOUT=5000
```

## Performance Optimization

### 1. Connection Pooling
```typescript
const pool = new Pool({
  max: 20,                    // Maximum connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Connection timeout
});
```

### 2. Query Optimization
- Use prepared statements
- Implement connection pooling
- Add appropriate indexes
- Monitor slow queries

### 3. Monitoring
```bash
# Check connection status
npm run db:postgres:status

# Monitor performance
SELECT * FROM pg_stat_activity;
SELECT * FROM pg_stat_database;
```

## Security Considerations

### 1. SSL/TLS Encryption
```env
POSTGRES_SSL=true
```

### 2. Row Level Security (RLS)
RLS policies are automatically applied during migration to ensure data isolation.

### 3. Connection Security
- Use strong passwords
- Restrict network access
- Enable SSL in production
- Use connection pooling

## Backup and Recovery

### 1. Automated Backups
```bash
# Create backup
pg_dump -h localhost -U regimecompass regimecompass > backup.sql

# Restore backup
psql -h localhost -U regimecompass regimecompass < backup.sql
```

### 2. Point-in-Time Recovery
```bash
# Enable WAL archiving
archive_mode = on
archive_command = 'cp %p /backup/wal/%f'
```

### 3. Cloud Provider Backups
Most cloud providers offer automated backup and point-in-time recovery.

## Monitoring and Maintenance

### 1. Health Checks
```typescript
const healthCheck = await postgresManager.healthCheck();
console.log('Database health:', healthCheck);
```

### 2. Performance Monitoring
- Monitor connection pool usage
- Track query performance
- Monitor disk usage
- Set up alerts for failures

### 3. Regular Maintenance
```sql
-- Analyze tables for query optimization
ANALYZE;

-- Vacuum to reclaim space
VACUUM;

-- Reindex for performance
REINDEX DATABASE regimecompass;
```

## Troubleshooting

### Common Issues

#### Connection Refused
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Check PostgreSQL logs
tail -f /var/log/postgresql/postgresql-15-main.log
```

#### Authentication Failed
```bash
# Check user permissions
psql -h localhost -U regimecompass -d regimecompass -c "\du"
```

#### Performance Issues
```sql
-- Check active connections
SELECT * FROM pg_stat_activity;

-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC;
```

### Migration Rollback

If you need to rollback to Supabase:

1. Update environment variables to use Supabase
2. Restore Supabase database from backup
3. Update application configuration
4. Test all functionality

## Production Deployment

### 1. Kubernetes Configuration
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secrets
type: Opaque
data:
  POSTGRES_PASSWORD: <base64-encoded-password>
```

### 2. Docker Configuration
```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=regimecompass
      - POSTGRES_USER=regimecompass
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

### 3. Cloud Deployment
- Use managed PostgreSQL services
- Configure automated backups
- Set up monitoring and alerts
- Implement high availability

## Cost Comparison

### Supabase Pricing
- Free tier: 500MB database, 2GB bandwidth
- Pro: $25/month + usage-based pricing
- Enterprise: Custom pricing

### PostgreSQL Hosting
- **AWS RDS**: $13-50/month for small instances
- **Google Cloud SQL**: $25-100/month
- **DigitalOcean**: $15-60/month
- **Self-hosted**: Server costs only

## Migration Checklist

- [ ] PostgreSQL server set up
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Application tested
- [ ] Data migrated (if applicable)
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Security review completed
- [ ] Performance testing done
- [ ] Production deployment ready

## Support

For PostgreSQL migration issues:

1. Check the logs: `npm run db:postgres:status`
2. Verify connection: Test database connectivity
3. Review configuration: Check environment variables
4. Monitor performance: Use PostgreSQL monitoring tools
5. Contact support: support@regimecompass.com

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js PostgreSQL Driver](https://node-postgres.com/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Database Migration Best Practices](https://www.postgresql.org/docs/current/ddl-alter.html)
