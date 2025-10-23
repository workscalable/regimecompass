# Fly.io Troubleshooting Guide

This guide helps resolve common Fly.io deployment issues, especially the "launch manifest" error.

## Common Error: "launch manifest was created for a app, but this is a Next.js app"

### Root Causes:
1. **Conflicting fly.toml configuration**
2. **Existing app with different configuration**
3. **Fly.io CLI version issues**
4. **Docker build context problems**

## Solutions

### Solution 1: Clean Slate Approach

#### Step 1: Remove existing app (if any)
```bash
# Check if app exists
fly apps list

# If app exists, delete it
fly apps destroy regimecompass --yes

# Or rename the app in fly.toml
```

#### Step 2: Use a unique app name
```bash
# Edit fly.toml and change the app name
app = "regimecompass-yourname"  # Use your unique name
```

#### Step 3: Clean deployment
```bash
# Remove any existing fly.toml
rm fly.toml

# Create new fly.toml with minimal config
cat > fly.toml << EOF
app = "regimecompass-$(date +%s)"
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
EOF

# Deploy
fly launch --no-deploy
fly deploy
```

### Solution 2: Manual App Creation

#### Step 1: Create app manually
```bash
# Create app without launch
fly apps create regimecompass-manual --region ord

# Set the app name in fly.toml
echo 'app = "regimecompass-manual"' > fly.toml
```

#### Step 2: Deploy directly
```bash
fly deploy
```

### Solution 3: Fix Configuration Issues

#### Check fly.toml syntax
```bash
# Validate fly.toml
fly config validate

# If validation fails, use minimal config
```

#### Minimal fly.toml for Next.js:
```toml
app = "your-unique-app-name"
primary_region = "ord"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "3000"

[http_service]
  internal_port = 3000
  force_https = true

[machine]
  memory = "1gb"
  cpu_kind = "shared"
  cpus = 2
```

### Solution 4: Docker Build Issues

#### Check Docker build locally
```bash
# Test Docker build
docker build -t regimecompass-test .

# Run locally to test
docker run -p 3000:3000 regimecompass-test
```

#### Optimize Dockerfile
```dockerfile
# Use this minimal Dockerfile for Next.js
FROM node:18-alpine AS base
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build Next.js
RUN npm run build

# Start server
EXPOSE 3000
CMD ["npm", "start"]
```

### Solution 5: Fly.io CLI Issues

#### Update Fly.io CLI
```bash
# Update to latest version
fly version

# If outdated, reinstall
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# Or download from: https://fly.io/docs/hands-on/install-flyctl/
```

#### Clear Fly.io cache
```bash
# Clear any cached configurations
fly auth logout
fly auth login

# Try again
fly launch --no-deploy
```

## Step-by-Step Resolution

### Method 1: Complete Reset
```bash
# 1. Remove existing configuration
rm fly.toml
rm -rf .fly/

# 2. Create minimal fly.toml
cat > fly.toml << 'EOF'
app = "regimecompass-$(whoami)-$(date +%s)"
primary_region = "ord"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "3000"

[http_service]
  internal_port = 3000
  force_https = true

[machine]
  memory = "1gb"
  cpu_kind = "shared"
  cpus = 2
EOF

# 3. Deploy
fly launch --no-deploy
fly deploy
```

### Method 2: Use Different App Name
```bash
# 1. Edit fly.toml
# Change: app = "regimecompass"
# To: app = "regimecompass-$(whoami)"

# 2. Deploy
fly launch --no-deploy
fly deploy
```

### Method 3: Manual App Creation
```bash
# 1. Create app manually
fly apps create regimecompass-manual --region ord

# 2. Update fly.toml
echo 'app = "regimecompass-manual"' > fly.toml

# 3. Deploy
fly deploy
```

## Debugging Commands

### Check App Status
```bash
# List all apps
fly apps list

# Check specific app
fly status -a regimecompass

# Check app info
fly info -a regimecompass
```

### Check Build Process
```bash
# View build logs
fly logs --build

# Check machine status
fly machines list -a regimecompass

# SSH into machine
fly ssh console -a regimecompass
```

### Check Configuration
```bash
# Validate configuration
fly config validate

# Check secrets
fly secrets list -a regimecompass

# Check environment
fly ssh console -a regimecompass -C "env"
```

## Alternative Deployment Methods

### Method 1: GitHub Actions
```yaml
# .github/workflows/fly.yml
name: Deploy to Fly.io
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### Method 2: Docker Hub
```bash
# Build and push to Docker Hub
docker build -t yourusername/regimecompass .
docker push yourusername/regimecompass

# Deploy from Docker Hub
fly deploy --image yourusername/regimecompass
```

### Method 3: Manual Docker
```bash
# Build locally
docker build -t regimecompass .

# Run locally to test
docker run -p 3000:3000 regimecompass

# If working, deploy
fly deploy
```

## Prevention Tips

### 1. Use Unique App Names
```bash
# Always use unique app names
app = "regimecompass-$(whoami)-$(date +%s)"
```

### 2. Keep fly.toml Simple
```toml
# Minimal configuration
app = "your-app-name"
primary_region = "ord"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 3000
```

### 3. Test Locally First
```bash
# Always test Docker build locally
docker build -t test .
docker run -p 3000:3000 test
```

### 4. Use .flyignore
```bash
# Create .flyignore to exclude unnecessary files
echo "node_modules/" > .flyignore
echo ".git/" >> .flyignore
echo "*.md" >> .flyignore
```

## Getting Help

### Fly.io Support
- **Documentation**: https://fly.io/docs/
- **Community**: https://community.fly.io/
- **Discord**: https://fly.io/discord

### Common Issues
1. **App name conflicts**: Use unique names
2. **Configuration errors**: Keep fly.toml simple
3. **Build failures**: Test Docker locally
4. **CLI issues**: Update to latest version

### Debug Information
```bash
# Get debug info
fly version
fly apps list
fly status -a your-app-name
fly logs -a your-app-name
```

## Quick Fix Commands

```bash
# Quick fix for launch manifest error
rm fly.toml
echo 'app = "regimecompass-$(whoami)"' > fly.toml
echo 'primary_region = "ord"' >> fly.toml
echo '[build]' >> fly.toml
echo '  dockerfile = "Dockerfile"' >> fly.toml
echo '[http_service]' >> fly.toml
echo '  internal_port = 3000' >> fly.toml
fly launch --no-deploy
fly deploy
```
