# Paper Trading System Deployment Guide

This guide covers the complete deployment, migration, and backup procedures for the Paper Trading System.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Migrations](#database-migrations)
4. [Deployment](#deployment)
5. [Backup and Recovery](#backup-and-recovery)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+ recommended) or macOS
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Memory**: Minimum 4GB RAM (8GB+ recommended for production)
- **Storage**: Minimum 20GB free space (100GB+ recommended for production)
- **Network**: Internet access for API calls and Docker image pulls

### Required Services

- **PostgreSQL**: Database for persistent storage
- **Redis**: Caching and session storage
- **Nginx**: Reverse proxy and load balancing
- **Prometheus**: Metrics collection
- **Grafana**: Monitoring dashboards

## Environment Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd paper-trading-system
```

### 2. Environment Configuration

Copy the appropriate environment template:

```bash
# For production
cp deployment/.env.production deployment/.env.production.local

# For staging
cp deployment/.env.staging deployment/.env.staging.local
```

### 3. Configure Environment Variables

Edit your environment file and set the required values:

```bash
# Required API Keys
POLYGON_API_KEY=your_polygon_api_key_here
TRADIER_API_KEY=your_tradier_api_key_here

# Database Security
DB_PASSWORD=your_secure_database_password
REDIS_PASSWORD=your_secure_redis_password

# Email Configuration (Production)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
ALERT_EMAIL_1=admin@yourcompany.com

# Slack Integration (Optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Security (Production)
JWT_SECRET=your_jwt_secret_minimum_32_characters_long
ENCRYPTION_KEY=your_encryption_key_minimum_32_characters_long
```

### 4. Validate Configuration

```bash
# Validate environment variables
cd deployment/scripts
./deploy.sh validate
```

## Database Migrations

### Migration Management

The system includes a comprehensive migration management system:

```bash
# Run all pending migrations
./deploy.sh migrate

# Check migration status
node -e "
const { migrationManager } = require('../../database/MigrationManager');
migrationManager.getStatus().then(console.log);
"

# Validate migration integrity
node -e "
const { migrationManager } = require('../../database/MigrationManager');
migrationManager.validateIntegrity().then(console.log);
"
```

### Manual Migration Operations

```bash
# Create backup before migration
./backup.sh backup

# Run specific migration
# (Implement specific migration execution if needed)

# Rollback to specific version
node -e "
const { migrationManager } = require('../../database/MigrationManager');
migrationManager.rollback('001').then(console.log);
"
```

## Deployment

### Production Deployment

```bash
# Set environment
export ENVIRONMENT=production

# Full deployment with health checks
cd deployment/scripts
./deploy.sh deploy
```

### Staging Deployment

```bash
# Set environment
export ENVIRONMENT=staging

# Deploy to staging
cd deployment/scripts
./deploy.sh deploy
```

### Deployment Options

```bash
# Deploy without backup
BACKUP_ENABLED=false ./deploy.sh deploy

# Deploy without migrations
MIGRATION_ENABLED=false ./deploy.sh deploy

# Deploy with custom health check timeout
HEALTH_CHECK_TIMEOUT=600 ./deploy.sh deploy
```

### Deployment Verification

```bash
# Check deployment status
./deploy.sh status

# Run health checks
./deploy.sh health

# View service logs
docker-compose -f ../docker/docker-compose.yml logs -f paper-trading-app
```

## Backup and Recovery

### Creating Backups

```bash
# Create full system backup
cd deployment/scripts
./backup.sh backup

# Create backup with custom retention
RETENTION_DAYS=60 ./backup.sh backup

# Enable S3 backup
S3_BACKUP_ENABLED=true AWS_S3_BUCKET=my-backup-bucket ./backup.sh backup
```

### Backup Components

The backup system includes:

- **Database**: Full PostgreSQL dump (SQL and custom format)
- **Configuration**: Application config, environment files, Docker configs
- **Logs**: Application logs and container logs
- **Application Data**: Docker volumes and persistent data

### Restoring from Backup

```bash
# Interactive restore (select from available backups)
./restore.sh restore

# Restore specific backup
./restore.sh restore /path/to/backup.tar.gz

# Force restore without prompts
FORCE_RESTORE=true ./restore.sh restore backup.tar.gz
```

### Backup Management

```bash
# List available backups
./backup.sh list

# Verify backup integrity
./backup.sh verify /path/to/backup.tar.gz

# Clean up old backups
./backup.sh cleanup
```

## Monitoring

### Service Monitoring

Access monitoring dashboards:

- **Application**: http://localhost:3000
- **Grafana**: http://localhost:3001 (admin/password from env)
- **Prometheus**: http://localhost:9090

### Health Endpoints

```bash
# Application health
curl http://localhost:3000/api/health

# Detailed health with metrics
curl http://localhost:3000/api/health?detailed=true

# Performance metrics
curl http://localhost:3000/api/health/performance

# Error metrics
curl http://localhost:3000/api/health/errors
```

### Log Management

```bash
# View application logs
docker-compose logs -f paper-trading-app

# View database logs
docker-compose logs -f postgres

# View all service logs
docker-compose logs -f

# Export logs for analysis
docker-compose logs --no-color > system-logs-$(date +%Y%m%d).log
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues

```bash
# Check database status
docker-compose exec postgres pg_isready -U paper_trading_user -d paper_trading

# Reset database connection
docker-compose restart postgres
docker-compose restart paper-trading-app
```

#### 2. API Key Issues

```bash
# Validate API keys
curl -H "Authorization: Bearer $POLYGON_API_KEY" https://api.polygon.io/v1/meta/symbols/AAPL/company
curl -H "Authorization: Bearer $TRADIER_API_KEY" https://api.tradier.com/v1/markets/quotes?symbols=AAPL
```

#### 3. Memory Issues

```bash
# Check container memory usage
docker stats

# Increase memory limits in docker-compose.yml
# Add under service definition:
# deploy:
#   resources:
#     limits:
#       memory: 2G
```

#### 4. Port Conflicts

```bash
# Check port usage
netstat -tulpn | grep :3000

# Change ports in docker-compose.yml if needed
```

### Recovery Procedures

#### 1. Application Crash Recovery

```bash
# Check container status
docker-compose ps

# Restart crashed services
docker-compose restart paper-trading-app

# Full system restart
docker-compose down
docker-compose up -d
```

#### 2. Database Recovery

```bash
# Create emergency backup
./backup.sh backup

# Restore from latest backup
./restore.sh restore

# Manual database repair (if needed)
docker-compose exec postgres pg_dump -U paper_trading_user -d paper_trading > emergency_backup.sql
```

#### 3. Configuration Recovery

```bash
# Restore configuration from backup
./restore.sh restore

# Reset to default configuration
git checkout HEAD -- config/
docker-compose restart paper-trading-app
```

### Performance Optimization

#### 1. Database Optimization

```bash
# Analyze database performance
docker-compose exec postgres psql -U paper_trading_user -d paper_trading -c "
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'public' 
ORDER BY n_distinct DESC;
"

# Rebuild indexes
docker-compose exec postgres psql -U paper_trading_user -d paper_trading -c "REINDEX DATABASE paper_trading;"
```

#### 2. Application Performance

```bash
# Monitor application metrics
curl http://localhost:3000/api/health/performance?minutes=60

# Check memory usage
docker exec paper-trading-app node -e "console.log(process.memoryUsage())"
```

### Security Checklist

- [ ] All default passwords changed
- [ ] API keys properly secured
- [ ] SSL/TLS enabled for production
- [ ] Database access restricted
- [ ] Regular security updates applied
- [ ] Backup encryption enabled
- [ ] Access logs monitored

### Maintenance Tasks

#### Daily

- [ ] Check system health endpoints
- [ ] Review error logs
- [ ] Monitor resource usage

#### Weekly

- [ ] Create system backup
- [ ] Review performance metrics
- [ ] Check for security updates

#### Monthly

- [ ] Full system backup verification
- [ ] Performance optimization review
- [ ] Security audit
- [ ] Cleanup old logs and backups

## Support

For additional support:

1. Check the application logs for detailed error messages
2. Review the monitoring dashboards for system metrics
3. Consult the API documentation for integration issues
4. Create an issue in the project repository with:
   - Environment details
   - Error logs
   - Steps to reproduce
   - Expected vs actual behavior

## Version History

- **v1.0.0**: Initial deployment system with Docker Compose
- **v1.1.0**: Added comprehensive backup and recovery procedures
- **v1.2.0**: Enhanced monitoring and alerting capabilities
- **v1.3.0**: Improved migration management and rollback procedures