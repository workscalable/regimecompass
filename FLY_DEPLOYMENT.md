# Fly.io Deployment Guide for RegimeCompass

This guide covers deploying RegimeCompass to Fly.io with proper Next.js configuration.

## Prerequisites

1. **Fly.io CLI**: Install from [fly.io/docs/hands-on/install-flyctl/](https://fly.io/docs/hands-on/install-flyctl/)
2. **Fly.io Account**: Sign up at [fly.io](https://fly.io)
3. **Docker**: For local testing

## Quick Deployment

### 1. Login to Fly.io
```bash
fly auth login
```

### 2. Initialize the App
```bash
# This will create the app and fly.toml
fly launch --no-deploy
```

### 3. Set Environment Variables
```bash
# Database configuration
fly secrets set POSTGRES_HOST="your-postgres-host"
fly secrets set POSTGRES_PORT="5432"
fly secrets set POSTGRES_DB="regimecompass"
fly secrets set POSTGRES_USER="regimecompass"
fly secrets set POSTGRES_PASSWORD="your-secure-password"
fly secrets set POSTGRES_SSL="true"

# Security
fly secrets set JWT_SECRET="your-jwt-secret"
fly secrets set ENCRYPTION_KEY="your-encryption-key"
fly secrets set SESSION_SECRET="your-session-secret"
fly secrets set COOKIE_SECRET="your-cookie-secret"

# API Keys
fly secrets set POLYGON_API_KEY="your-polygon-key"
fly secrets set TRADIER_API_KEY="your-tradier-key"
fly secrets set TWELVEDATA_API_KEY="your-twelve-data-key"

# Application
fly secrets set NODE_ENV="production"
fly secrets set PORT="3000"
```

### 4. Deploy the Application
```bash
fly deploy
```

### 5. Check Deployment Status
```bash
fly status
fly logs
```

## Configuration Details

### Fly.io Configuration (fly.toml)
```toml
app = "regimecompass"
primary_region = "ord"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "3000"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1

[machine]
  memory = "1gb"
  cpu_kind = "shared"
  cpus = 2
```

### Next.js Configuration
The app is configured with:
- **Standalone Output**: Optimized for containerized deployment
- **API Routes**: All API endpoints under `/api/*`
- **Health Check**: `/api/health` endpoint for monitoring

### Docker Configuration
- **Multi-stage Build**: Optimized for production
- **Non-root User**: Security best practices
- **Health Checks**: Container health monitoring
- **Standalone Server**: Self-contained Next.js server

## Database Setup

### Option 1: External PostgreSQL
```bash
# Use managed PostgreSQL service
fly secrets set POSTGRES_HOST="your-managed-postgres-host"
fly secrets set POSTGRES_PASSWORD="your-password"
```

### Option 2: Fly.io PostgreSQL
```bash
# Create PostgreSQL app
fly postgres create --name regimecompass-db

# Get connection details
fly postgres connect -a regimecompass-db

# Set secrets
fly secrets set POSTGRES_HOST="$(fly postgres info -a regimecompass-db -j | jq -r .Hostname)"
fly secrets set POSTGRES_PASSWORD="$(fly postgres info -a regimecompass-db -j | jq -r .Password)"
```

### Option 3: Supabase (Alternative)
```bash
# Use Supabase instead of PostgreSQL
fly secrets set SUPABASE_URL="your-supabase-url"
fly secrets set SUPABASE_ANON_KEY="your-supabase-key"
```

## Monitoring and Logs

### View Logs
```bash
# Real-time logs
fly logs

# Historical logs
fly logs --since 1h
```

### Monitor Performance
```bash
# Check app status
fly status

# View metrics
fly metrics

# SSH into the machine
fly ssh console
```

### Health Checks
The app includes health checks at `/api/health`:
- Database connectivity
- Service status
- Performance metrics

## Scaling

### Horizontal Scaling
```bash
# Scale to multiple machines
fly scale count 3

# Scale in specific regions
fly scale count 2 --region ord
fly scale count 1 --region lax
```

### Vertical Scaling
```bash
# Increase memory
fly scale memory 2048

# Increase CPU
fly scale vm shared-cpu-2x
```

## Environment Management

### Development
```bash
# Deploy to staging
fly deploy --config fly.staging.toml
```

### Production
```bash
# Deploy to production
fly deploy
```

### Secrets Management
```bash
# List all secrets
fly secrets list

# Set a secret
fly secrets set KEY="value"

# Remove a secret
fly secrets unset KEY
```

## Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Check build logs
fly logs --build

# Test build locally
docker build -t regimecompass .
```

#### 2. Database Connection Issues
```bash
# Check database connectivity
fly ssh console
# Inside the container:
node -e "console.log(process.env.POSTGRES_HOST)"
```

#### 3. Memory Issues
```bash
# Check memory usage
fly metrics

# Increase memory
fly scale memory 2048
```

#### 4. Health Check Failures
```bash
# Check health endpoint
curl https://your-app.fly.dev/api/health

# Check logs for errors
fly logs
```

### Debug Commands
```bash
# SSH into the machine
fly ssh console

# Check environment variables
fly ssh console -C "env | grep POSTGRES"

# Check application status
fly ssh console -C "ps aux | grep node"

# Check disk usage
fly ssh console -C "df -h"
```

## Security

### SSL/TLS
- Automatically enabled by Fly.io
- Force HTTPS in production
- Certificate management handled by Fly.io

### Environment Variables
- All secrets stored securely in Fly.io
- No secrets in code or configuration files
- Automatic secret rotation support

### Network Security
- Private networking between services
- Firewall rules configured automatically
- DDoS protection included

## Backup and Recovery

### Database Backups
```bash
# Backup PostgreSQL
fly postgres backup create -a regimecompass-db

# List backups
fly postgres backup list -a regimecompass-db
```

### Application Backups
```bash
# Create volume snapshot
fly volumes snapshot create regimecompass_data

# List snapshots
fly volumes snapshot list
```

## Cost Optimization

### Resource Management
```bash
# Check current usage
fly metrics

# Optimize machine size
fly scale vm shared-cpu-1x  # Smaller machine
fly scale memory 512        # Less memory
```

### Auto-scaling
```bash
# Enable auto-scaling
fly scale auto

# Set scaling rules
fly scale auto --min=1 --max=5
```

## Performance Optimization

### Caching
- Next.js built-in caching
- API response caching
- Static asset optimization

### Database Optimization
- Connection pooling
- Query optimization
- Index management

### CDN
- Global edge deployment
- Static asset distribution
- Automatic compression

## Monitoring and Alerting

### Health Monitoring
- Automatic health checks
- Uptime monitoring
- Performance metrics

### Log Aggregation
- Centralized logging
- Log search and filtering
- Alert configuration

### Metrics
- Application metrics
- Database performance
- Resource utilization

## Deployment Checklist

- [ ] Fly.io CLI installed and authenticated
- [ ] Environment variables configured
- [ ] Database setup completed
- [ ] Health checks passing
- [ ] SSL certificates valid
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Security review completed
- [ ] Performance testing done
- [ ] Documentation updated

## Support

For Fly.io deployment issues:

1. **Check logs**: `fly logs`
2. **Verify configuration**: `fly status`
3. **Test locally**: `docker build -t regimecompass .`
4. **Review documentation**: [fly.io/docs](https://fly.io/docs)
5. **Contact support**: support@fly.io

## Additional Resources

- [Fly.io Documentation](https://fly.io/docs/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [PostgreSQL on Fly.io](https://fly.io/docs/postgres/)
