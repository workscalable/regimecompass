# Deployment Guide

Complete guide for deploying the Paper Trading System to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Database Setup](#database-setup)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Load Balancing](#load-balancing)
- [Monitoring Setup](#monitoring-setup)
- [Backup Strategy](#backup-strategy)
- [Security Hardening](#security-hardening)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

**Minimum Requirements:**
- CPU: 2 cores
- RAM: 4GB
- Storage: 20GB SSD
- Network: 100 Mbps

**Recommended Requirements:**
- CPU: 4+ cores
- RAM: 8GB+
- Storage: 50GB+ SSD
- Network: 1 Gbps

### Software Dependencies

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18.0+ (for local development)
- PostgreSQL 15+
- Redis 7+
- Nginx (for reverse proxy)

### API Keys Required

- Polygon.io API key
- Tradier API key
- SMTP credentials (for alerts)
- Slack webhook URL (optional)

## Environment Setup

### 1. Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Nginx
sudo apt install nginx -y

# Install certbot for SSL
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Application Setup

```bash
# Clone repository
git clone <repository-url>
cd paper-trading-system

# Create production environment file
cp .env.example .env.production
nano .env.production
```

### 3. Production Environment Variables

```bash
# .env.production
NODE_ENV=production
PORT=3000

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=paper_trading_prod
DB_USER=paper_trading_user
DB_PASSWORD=your_secure_password_here

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# API Keys
POLYGON_API_KEY=your_polygon_api_key
TRADIER_API_KEY=your_tradier_api_key

# Security
JWT_SECRET=your_very_long_random_jwt_secret_key_here
BCRYPT_ROUNDS=12

# Monitoring
ENABLE_METRICS=true
LOG_LEVEL=INFO

# Alerts
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@company.com
SMTP_PASSWORD=your_app_password
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Performance
CLUSTER_MODE=true
CLUSTER_WORKERS=4
```

## Docker Deployment

### 1. Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    networks:
      - paper-trading-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d
    networks:
      - paper-trading-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - paper-trading-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - /etc/letsencrypt:/etc/letsencrypt
    depends_on:
      - app
    networks:
      - paper-trading-network

  prometheus:
    image: prom/prometheus:latest
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - paper-trading-network

  grafana:
    image: grafana/grafana:latest
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin_password_here
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana:/etc/grafana/provisioning
    networks:
      - paper-trading-network

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:

networks:
  paper-trading-network:
    driver: bridge
```

### 2. Production Dockerfile

Create `Dockerfile.prod`:

```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY gamma-services/ ./gamma-services/
COPY public/ ./public/

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Create directories
RUN mkdir -p logs uploads && chown -R nextjs:nodejs logs uploads

USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
```

### 3. Deployment Script

Create `deployment/scripts/deploy.sh`:

```bash
#!/bin/bash

set -e

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
BACKUP_DIR="./backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    command -v docker >/dev/null 2>&1 || error "Docker is not installed"
    command -v docker-compose >/dev/null 2>&1 || error "Docker Compose is not installed"
    
    if [ ! -f "$ENV_FILE" ]; then
        error "Environment file $ENV_FILE not found"
    fi
    
    log "Prerequisites check passed"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
    
    # Backup database
    docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U paper_trading_user paper_trading_prod > "$BACKUP_DIR/${BACKUP_NAME}_db.sql"
    
    # Backup volumes
    docker run --rm -v paper-trading-system_postgres_data:/data -v $(pwd)/$BACKUP_DIR:/backup alpine tar czf /backup/${BACKUP_NAME}_postgres_data.tar.gz -C /data .
    docker run --rm -v paper-trading-system_redis_data:/data -v $(pwd)/$BACKUP_DIR:/backup alpine tar czf /backup/${BACKUP_NAME}_redis_data.tar.gz -C /data .
    
    log "Backup created: $BACKUP_NAME"
}

# Deploy application
deploy() {
    log "Starting deployment..."
    
    # Pull latest images
    docker-compose -f "$COMPOSE_FILE" pull
    
    # Build application
    docker-compose -f "$COMPOSE_FILE" build --no-cache app
    
    # Start services
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    sleep 30
    
    # Check health
    if ! curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        error "Health check failed"
    fi
    
    log "Deployment completed successfully"
}

# Rollback deployment
rollback() {
    warn "Rolling back deployment..."
    
    # Stop current services
    docker-compose -f "$COMPOSE_FILE" down
    
    # Restore from latest backup
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*_db.sql | head -n1)
    if [ -n "$LATEST_BACKUP" ]; then
        log "Restoring from backup: $LATEST_BACKUP"
        # Restore database
        docker-compose -f "$COMPOSE_FILE" up -d postgres
        sleep 10
        cat "$LATEST_BACKUP" | docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U paper_trading_user -d paper_trading_prod
    fi
    
    # Start services
    docker-compose -f "$COMPOSE_FILE" up -d
    
    log "Rollback completed"
}

# Health check
health_check() {
    log "Performing health check..."
    
    # Check application health
    if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        log "Application is healthy"
    else
        error "Application health check failed"
    fi
    
    # Check database connection
    if docker-compose -f "$COMPOSE_FILE" exec postgres pg_isready -U paper_trading_user -d paper_trading_prod >/dev/null 2>&1; then
        log "Database is healthy"
    else
        error "Database health check failed"
    fi
    
    # Check Redis connection
    if docker-compose -f "$COMPOSE_FILE" exec redis redis-cli ping >/dev/null 2>&1; then
        log "Redis is healthy"
    else
        error "Redis health check failed"
    fi
    
    log "All health checks passed"
}

# Show logs
show_logs() {
    docker-compose -f "$COMPOSE_FILE" logs -f --tail=100 "$@"
}

# Main script
case "$1" in
    "deploy")
        check_prerequisites
        create_backup
        deploy
        health_check
        ;;
    "rollback")
        rollback
        ;;
    "health")
        health_check
        ;;
    "logs")
        show_logs "${@:2}"
        ;;
    "backup")
        create_backup
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|health|logs|backup}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Deploy the application"
        echo "  rollback - Rollback to previous version"
        echo "  health   - Check application health"
        echo "  logs     - Show application logs"
        echo "  backup   - Create backup"
        exit 1
        ;;
esac
```

### 4. Deploy the Application

```bash
# Make script executable
chmod +x deployment/scripts/deploy.sh

# Deploy
./deployment/scripts/deploy.sh deploy

# Check health
./deployment/scripts/deploy.sh health

# View logs
./deployment/scripts/deploy.sh logs app
```

## Kubernetes Deployment

### 1. Kubernetes Manifests

Create `k8s/namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: paper-trading
```

Create `k8s/configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: paper-trading-config
  namespace: paper-trading
data:
  NODE_ENV: "production"
  PORT: "3000"
  DB_HOST: "postgres-service"
  DB_PORT: "5432"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  LOG_LEVEL: "INFO"
```

Create `k8s/secret.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: paper-trading-secrets
  namespace: paper-trading
type: Opaque
stringData:
  DB_PASSWORD: "your_secure_password"
  JWT_SECRET: "your_jwt_secret"
  POLYGON_API_KEY: "your_polygon_key"
  TRADIER_API_KEY: "your_tradier_key"
  SMTP_PASSWORD: "your_smtp_password"
```

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: paper-trading-app
  namespace: paper-trading
spec:
  replicas: 3
  selector:
    matchLabels:
      app: paper-trading-app
  template:
    metadata:
      labels:
        app: paper-trading-app
    spec:
      containers:
      - name: app
        image: paper-trading:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: paper-trading-config
        - secretRef:
            name: paper-trading-secrets
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
```

### 2. Deploy to Kubernetes

```bash
# Apply manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n paper-trading

# Check logs
kubectl logs -f deployment/paper-trading-app -n paper-trading
```

## Cloud Deployment

### AWS Deployment with ECS

Create `aws/task-definition.json`:

```json
{
  "family": "paper-trading-system",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "paper-trading-app",
      "image": "your-account.dkr.ecr.region.amazonaws.com/paper-trading:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:paper-trading/db-password"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/paper-trading-system",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3000/api/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### Deploy to AWS

```bash
# Build and push image to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin your-account.dkr.ecr.us-east-1.amazonaws.com

docker build -f Dockerfile.prod -t paper-trading .
docker tag paper-trading:latest your-account.dkr.ecr.us-east-1.amazonaws.com/paper-trading:latest
docker push your-account.dkr.ecr.us-east-1.amazonaws.com/paper-trading:latest

# Register task definition
aws ecs register-task-definition --cli-input-json file://aws/task-definition.json

# Update service
aws ecs update-service --cluster paper-trading-cluster --service paper-trading-service --task-definition paper-trading-system
```

## Database Setup

### 1. Production Database Configuration

```sql
-- Create database and user
CREATE DATABASE paper_trading_prod;
CREATE USER paper_trading_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE paper_trading_prod TO paper_trading_user;

-- Configure connection limits
ALTER USER paper_trading_user CONNECTION LIMIT 20;

-- Create extensions
\c paper_trading_prod;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
```

### 2. Database Migrations

```bash
# Run migrations
npm run db:migrate:prod

# Seed initial data
npm run db:seed:prod
```

### 3. Database Optimization

```sql
-- Optimize PostgreSQL settings for production
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

-- Reload configuration
SELECT pg_reload_conf();
```

## SSL/TLS Configuration

### 1. Nginx SSL Configuration

Create `nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream paper_trading_app {
        server app:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=trading:10m rate=1r/s;

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL Configuration
        ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
        add_header X-XSS-Protection "1; mode=block";

        # API endpoints
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://paper_trading_app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Trading endpoints (stricter rate limiting)
        location /api/trades {
            limit_req zone=trading burst=5 nodelay;
            proxy_pass http://paper_trading_app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket support
        location /ws {
            proxy_pass http://paper_trading_app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static files
        location / {
            proxy_pass http://paper_trading_app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### 2. Obtain SSL Certificate

```bash
# Get SSL certificate from Let's Encrypt
sudo certbot --nginx -d your-domain.com

# Set up auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Load Balancing

### 1. Application Load Balancer (AWS)

```json
{
  "LoadBalancerArn": "arn:aws:elasticloadbalancing:region:account:loadbalancer/app/paper-trading-alb/id",
  "DNSName": "paper-trading-alb-123456789.region.elb.amazonaws.com",
  "Scheme": "internet-facing",
  "Type": "application",
  "SecurityGroups": ["sg-12345678"],
  "Subnets": ["subnet-12345678", "subnet-87654321"]
}
```

### 2. Target Group Configuration

```json
{
  "TargetGroupArn": "arn:aws:elasticloadbalancing:region:account:targetgroup/paper-trading-tg/id",
  "TargetGroupName": "paper-trading-tg",
  "Protocol": "HTTP",
  "Port": 3000,
  "VpcId": "vpc-12345678",
  "HealthCheckProtocol": "HTTP",
  "HealthCheckPath": "/api/health",
  "HealthCheckIntervalSeconds": 30,
  "HealthCheckTimeoutSeconds": 5,
  "HealthyThresholdCount": 2,
  "UnhealthyThresholdCount": 3
}
```

## Monitoring Setup

### 1. Prometheus Configuration

Create `monitoring/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'paper-trading-app'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
```

### 2. Grafana Dashboards

Create monitoring dashboards for:
- Application performance metrics
- Database performance
- Trading system metrics
- System resource usage
- Error rates and alerts

## Backup Strategy

### 1. Automated Backup Script

Create `scripts/backup.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/backups"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
pg_dump -h postgres -U paper_trading_user paper_trading_prod | gzip > "$BACKUP_DIR/db_backup_$DATE.sql.gz"

# File system backup
tar -czf "$BACKUP_DIR/files_backup_$DATE.tar.gz" /app/uploads /app/logs

# Clean old backups
find "$BACKUP_DIR" -name "*.gz" -mtime +$RETENTION_DAYS -delete

# Upload to S3 (optional)
aws s3 cp "$BACKUP_DIR/db_backup_$DATE.sql.gz" s3://your-backup-bucket/database/
aws s3 cp "$BACKUP_DIR/files_backup_$DATE.tar.gz" s3://your-backup-bucket/files/
```

### 2. Schedule Backups

```bash
# Add to crontab
0 2 * * * /path/to/backup.sh
```

## Security Hardening

### 1. Application Security

```javascript
// Security middleware configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));
```

### 2. Database Security

```sql
-- Revoke public permissions
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO paper_trading_user;

-- Enable row level security
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

-- Create security policies
CREATE POLICY account_isolation ON accounts
  FOR ALL TO paper_trading_user
  USING (user_id = current_setting('app.current_user_id')::uuid);
```

### 3. Network Security

```bash
# Firewall rules (UFW)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Fail2ban configuration
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## Performance Optimization

### 1. Application Optimization

```javascript
// Enable compression
app.use(compression());

// Enable caching
app.use('/api/', cache('5 minutes'));

// Connection pooling
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 2. Database Optimization

```sql
-- Create indexes for performance
CREATE INDEX CONCURRENTLY idx_positions_account_id ON positions(account_id);
CREATE INDEX CONCURRENTLY idx_trades_ticker ON trades(ticker);
CREATE INDEX CONCURRENTLY idx_trades_created_at ON trades(created_at);

-- Analyze tables
ANALYZE accounts;
ANALYZE positions;
ANALYZE trades;
```

### 3. Caching Strategy

```javascript
// Redis caching
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
});

// Cache frequently accessed data
app.get('/api/quotes/:ticker', async (req, res) => {
  const cached = await redis.get(`quote:${req.params.ticker}`);
  if (cached) {
    return res.json(JSON.parse(cached));
  }
  
  const quote = await getQuote(req.params.ticker);
  await redis.setex(`quote:${req.params.ticker}`, 60, JSON.stringify(quote));
  res.json(quote);
});
```

## Troubleshooting

### Common Issues

1. **Application won't start**
   ```bash
   # Check logs
   docker-compose logs app
   
   # Check environment variables
   docker-compose exec app env
   
   # Check database connection
   docker-compose exec app npm run db:test
   ```

2. **Database connection issues**
   ```bash
   # Check database status
   docker-compose exec postgres pg_isready
   
   # Check database logs
   docker-compose logs postgres
   
   # Test connection
   docker-compose exec postgres psql -U paper_trading_user -d paper_trading_prod -c "SELECT 1;"
   ```

3. **High memory usage**
   ```bash
   # Check memory usage
   docker stats
   
   # Check for memory leaks
   docker-compose exec app npm run heap-snapshot
   
   # Restart services
   docker-compose restart app
   ```

4. **API rate limiting issues**
   ```bash
   # Check rate limit status
   curl -I http://localhost:3000/api/health
   
   # Adjust rate limits in configuration
   # Restart nginx
   docker-compose restart nginx
   ```

### Performance Issues

1. **Slow database queries**
   ```sql
   -- Check slow queries
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC 
   LIMIT 10;
   
   -- Check missing indexes
   SELECT schemaname, tablename, attname, n_distinct, correlation 
   FROM pg_stats 
   WHERE schemaname = 'public' 
   ORDER BY n_distinct DESC;
   ```

2. **High CPU usage**
   ```bash
   # Check CPU usage by container
   docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
   
   # Profile application
   docker-compose exec app npm run profile
   ```

### Monitoring Alerts

Set up alerts for:
- Application errors > 5%
- Response time > 2 seconds
- Database connections > 80%
- Memory usage > 85%
- Disk usage > 90%

For additional support, check the logs and monitoring dashboards, or contact the development team.