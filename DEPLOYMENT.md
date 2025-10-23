# RegimeCompass Production Deployment Guide

This guide covers the complete deployment process for RegimeCompass in production environments.

## Overview

RegimeCompass is designed for high-availability, scalable deployment with the following architecture:

- **Application**: Next.js application with TypeScript
- **Database**: PostgreSQL via Supabase
- **Caching**: Redis for session and data caching
- **Monitoring**: Prometheus + Grafana
- **Load Balancing**: Nginx ingress controller
- **Container Orchestration**: Kubernetes
- **Security**: JWT authentication, encryption, audit logging

## Prerequisites

### System Requirements

- **Kubernetes**: 1.24+ with ingress controller
- **Docker**: 20.10+ for containerization
- **kubectl**: 1.24+ for cluster management
- **helm**: 3.8+ for package management (optional)
- **SSL Certificate**: Let's Encrypt or custom certificates

### Cloud Providers

Supported cloud providers:
- **AWS**: EKS with ALB ingress
- **Google Cloud**: GKE with ingress
- **Azure**: AKS with ingress
- **DigitalOcean**: Kubernetes with ingress
- **Self-hosted**: On-premises Kubernetes

## Quick Start

### 1. Environment Setup

```bash
# Clone repository
git clone https://github.com/your-org/regimecompass.git
cd regimecompass

# Copy environment template
cp env.example .env

# Edit environment variables
nano .env
```

### 2. Database Setup

```bash
# Set up Supabase database
npm run db:setup

# Run migrations
npm run db:migrate
```

### 3. Security Setup

```bash
# Generate secure keys
npm run security:setup

# Review security configuration
cat SECURITY.md
```

### 4. Build and Deploy

```bash
# Build Docker image
docker build -t regimecompass:latest .

# Deploy to Kubernetes
./scripts/deploy.sh deploy latest production

# Or on Windows
.\scripts\deploy.ps1 -Action deploy -ImageTag latest -Environment production
```

## Detailed Deployment

### Docker Deployment

#### Single Container

```bash
# Build image
docker build -t regimecompass:latest .

# Run container
docker run -d \
  --name regimecompass \
  -p 3000:3000 \
  --env-file .env \
  -v ./logs:/app/logs \
  -v ./data:/app/data \
  regimecompass:latest
```

#### Docker Compose

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f regimecompass
```

### Kubernetes Deployment

#### 1. Create Namespace

```bash
kubectl apply -f kubernetes/namespace.yaml
```

#### 2. Set up RBAC

```bash
kubectl apply -f kubernetes/rbac.yaml
```

#### 3. Configure Secrets

```bash
# Create secrets (replace with actual values)
kubectl create secret generic regimecompass-secrets \
  --from-literal=SUPABASE_URL=your_supabase_url \
  --from-literal=SUPABASE_ANON_KEY=your_supabase_key \
  --from-literal=JWT_SECRET=your_jwt_secret \
  --from-literal=ENCRYPTION_KEY=your_encryption_key \
  -n regimecompass
```

#### 4. Deploy Application

```bash
# Apply all manifests
kubectl apply -f kubernetes/

# Check deployment status
kubectl get pods -n regimecompass
kubectl get services -n regimecompass
kubectl get ingress -n regimecompass
```

#### 5. Verify Deployment

```bash
# Check pod logs
kubectl logs -f deployment/regimecompass-app -n regimecompass

# Test health endpoint
kubectl port-forward service/regimecompass-service 3000:3000 -n regimecompass
curl http://localhost:3000/api/health
```

## Configuration

### Environment Variables

#### Required Variables

```env
# Database
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Security
JWT_SECRET=your_jwt_secret_key
ENCRYPTION_KEY=your_encryption_key
SESSION_SECRET=your_session_secret
COOKIE_SECRET=your_cookie_secret

# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
```

#### Optional Variables

```env
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=1000
API_RATE_LIMIT_MAX=1000
AUTH_RATE_LIMIT_MAX=10
TRADING_RATE_LIMIT_MAX=10

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
ENABLE_AUDIT_LOGGING=true
AUDIT_LOG_LEVEL=standard

# Trading
DEFAULT_ACCOUNT_BALANCE=100000
MAX_RISK_PER_TRADE=0.02
MAX_PORTFOLIO_HEAT=0.20
```

### Kubernetes Configuration

#### ConfigMap

The ConfigMap contains non-sensitive configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: regimecompass-config
  namespace: regimecompass
data:
  NODE_ENV: "production"
  PORT: "3000"
  LOG_LEVEL: "info"
  # ... other non-sensitive config
```

#### Secrets

Sensitive data is stored in Kubernetes secrets:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: regimecompass-secrets
  namespace: regimecompass
type: Opaque
data:
  SUPABASE_URL: "" # base64 encoded
  JWT_SECRET: "" # base64 encoded
  # ... other secrets
```

## Monitoring and Observability

### Prometheus Metrics

The application exposes metrics on port 9090:

- **HTTP requests**: Request count, duration, status codes
- **Trading metrics**: Position count, PnL, win rate
- **System metrics**: CPU, memory, disk usage
- **Custom metrics**: Business-specific metrics

### Grafana Dashboards

Pre-configured dashboards for:
- **Application Performance**: Response times, error rates
- **Trading Metrics**: PnL, win rates, position analysis
- **System Health**: Resource usage, alerts
- **Security**: Authentication, audit logs

### Logging

Structured logging with correlation IDs:
- **Application logs**: Info, warn, error levels
- **Audit logs**: User actions, security events
- **Trading logs**: Trade execution, position changes
- **System logs**: Infrastructure events

## Security

### Authentication

- **JWT tokens**: Secure token-based authentication
- **Password hashing**: bcrypt with salt
- **Session management**: Secure session handling
- **Token refresh**: Automatic token renewal

### Authorization

- **Role-based access**: User permissions
- **Resource-level security**: Account ownership
- **API key validation**: External service access
- **Rate limiting**: Request throttling

### Data Protection

- **Encryption at rest**: Database encryption
- **Encryption in transit**: TLS/SSL
- **Sensitive data**: Field-level encryption
- **Key management**: Secure key storage

### Audit Logging

- **Security events**: Login, logout, failures
- **User actions**: Trading, configuration changes
- **API access**: Request/response logging
- **Compliance**: Regulatory requirements

## Scaling

### Horizontal Pod Autoscaler

Automatically scales based on:
- **CPU utilization**: Target 70%
- **Memory utilization**: Target 80%
- **Custom metrics**: Trading volume, requests

### Vertical Scaling

Resource limits and requests:
- **CPU**: 250m request, 1000m limit
- **Memory**: 512Mi request, 2Gi limit
- **Storage**: 10Gi persistent volume

### Load Balancing

- **Ingress controller**: Nginx with SSL termination
- **Service mesh**: Istio (optional)
- **CDN**: CloudFlare or AWS CloudFront

## Backup and Recovery

### Database Backups

- **Automated backups**: Daily snapshots
- **Point-in-time recovery**: Transaction logs
- **Cross-region replication**: Disaster recovery
- **Backup encryption**: Secure storage

### Application Backups

- **Configuration**: Kubernetes manifests
- **Secrets**: Encrypted secret storage
- **Logs**: Centralized log collection
- **Metrics**: Historical data retention

## Troubleshooting

### Common Issues

#### Pod Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n regimecompass

# Check logs
kubectl logs <pod-name> -n regimecompass

# Check events
kubectl get events -n regimecompass
```

#### Database Connection Issues

```bash
# Test database connectivity
kubectl exec -it <pod-name> -n regimecompass -- curl -f http://localhost:3000/api/health

# Check database credentials
kubectl get secret regimecompass-secrets -n regimecompass -o yaml
```

#### Performance Issues

```bash
# Check resource usage
kubectl top pods -n regimecompass

# Check HPA status
kubectl get hpa -n regimecompass

# Check metrics
kubectl port-forward service/regimecompass-metrics 9090:9090 -n regimecompass
```

### Health Checks

#### Application Health

```bash
# Health endpoint
curl https://regimecompass.com/api/health

# Metrics endpoint
curl https://regimecompass.com/metrics
```

#### Kubernetes Health

```bash
# Pod status
kubectl get pods -n regimecompass

# Service status
kubectl get services -n regimecompass

# Ingress status
kubectl get ingress -n regimecompass
```

## Maintenance

### Updates

#### Application Updates

```bash
# Build new image
docker build -t regimecompass:v1.1.0 .

# Update deployment
kubectl set image deployment/regimecompass-app regimecompass=regimecompass:v1.1.0 -n regimecompass

# Check rollout status
kubectl rollout status deployment/regimecompass-app -n regimecompass
```

#### Database Migrations

```bash
# Run migrations
npm run db:migrate

# Check migration status
kubectl logs deployment/regimecompass-app -n regimecompass
```

### Monitoring

#### Alerts

Configure alerts for:
- **High error rates**: >5% error rate
- **High response times**: >2s average
- **Resource usage**: >80% CPU/memory
- **Database issues**: Connection failures
- **Security events**: Failed logins, violations

#### Log Analysis

```bash
# View application logs
kubectl logs -f deployment/regimecompass-app -n regimecompass

# Search for errors
kubectl logs deployment/regimecompass-app -n regimecompass | grep ERROR

# Export logs
kubectl logs deployment/regimecompass-app -n regimecompass > logs.txt
```

## Production Checklist

### Pre-Deployment

- [ ] Environment variables configured
- [ ] Database setup completed
- [ ] Security keys generated
- [ ] SSL certificates configured
- [ ] Monitoring configured
- [ ] Backup strategy implemented

### Post-Deployment

- [ ] Health checks passing
- [ ] Metrics collection working
- [ ] Logs being collected
- [ ] Alerts configured
- [ ] Performance testing completed
- [ ] Security audit completed

### Ongoing Maintenance

- [ ] Regular security updates
- [ ] Performance monitoring
- [ ] Log analysis
- [ ] Backup verification
- [ ] Capacity planning
- [ ] Disaster recovery testing

## Support

For deployment issues:

1. **Check logs**: `kubectl logs -f deployment/regimecompass-app -n regimecompass`
2. **Verify configuration**: `kubectl describe deployment regimecompass-app -n regimecompass`
3. **Test connectivity**: `kubectl port-forward service/regimecompass-service 3000:3000 -n regimecompass`
4. **Review documentation**: Check this guide and SECURITY.md
5. **Contact support**: support@regimecompass.com

## Additional Resources

- **Security Guide**: SECURITY.md
- **Database Guide**: database/README.md
- **API Documentation**: docs/api.md
- **Monitoring Guide**: docs/monitoring.md
- **Troubleshooting Guide**: docs/troubleshooting.md
