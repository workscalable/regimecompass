# RegimeCompass Deployment Script (PowerShell)
# This script deploys the RegimeCompass application to production

param(
    [string]$ImageTag = "latest",
    [string]$Environment = "production",
    [string]$Action = "deploy"
)

# Configuration
$NAMESPACE = "regimecompass"
$APP_NAME = "regimecompass"

# Functions
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check prerequisites
function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Check if kubectl is installed
    if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
        Write-Error "kubectl is not installed"
        exit 1
    }
    
    # Check if docker is installed
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "docker is not installed"
        exit 1
    }
    
    Write-Success "Prerequisites check passed"
}

# Build Docker image
function Build-Image {
    Write-Info "Building Docker image..."
    
    docker build -t "${APP_NAME}:${ImageTag}" .
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Docker image built successfully"
    } else {
        Write-Error "Docker image build failed"
        exit 1
    }
}

# Deploy to Kubernetes
function Deploy-Kubernetes {
    Write-Info "Deploying to Kubernetes..."
    
    # Create namespace if it doesn't exist
    kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply Kubernetes manifests
    Write-Info "Applying Kubernetes manifests..."
    
    # Apply in order
    kubectl apply -f kubernetes/namespace.yaml
    kubectl apply -f kubernetes/rbac.yaml
    kubectl apply -f kubernetes/configmap.yaml
    kubectl apply -f kubernetes/secret.yaml
    kubectl apply -f kubernetes/pvc.yaml
    kubectl apply -f kubernetes/deployment.yaml
    kubectl apply -f kubernetes/service.yaml
    kubectl apply -f kubernetes/ingress.yaml
    kubectl apply -f kubernetes/hpa.yaml
    
    Write-Success "Kubernetes manifests applied successfully"
}

# Wait for deployment
function Wait-ForDeployment {
    Write-Info "Waiting for deployment to be ready..."
    
    kubectl wait --for=condition=available --timeout=300s "deployment/${APP_NAME}-app" -n $NAMESPACE
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Deployment is ready"
    } else {
        Write-Error "Deployment failed to become ready"
        exit 1
    }
}

# Verify deployment
function Test-Deployment {
    Write-Info "Verifying deployment..."
    
    # Check pods
    kubectl get pods -n $NAMESPACE
    
    # Check services
    kubectl get services -n $NAMESPACE
    
    # Check ingress
    kubectl get ingress -n $NAMESPACE
    
    # Check HPA
    kubectl get hpa -n $NAMESPACE
    
    Write-Success "Deployment verification completed"
}

# Run health checks
function Test-Health {
    Write-Info "Running health checks..."
    
    # Get service URL
    $SERVICE_URL = kubectl get service "${APP_NAME}-service" -n $NAMESPACE -o jsonpath='{.spec.clusterIP}'
    
    if (-not $SERVICE_URL) {
        Write-Error "Could not get service URL"
        return $false
    }
    
    # Check health endpoint
    kubectl run health-check --image=curlimages/curl --rm -i --restart=Never -- curl -f "http://${SERVICE_URL}:3000/api/health"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Health check passed"
        return $true
    } else {
        Write-Error "Health check failed"
        return $false
    }
}

# Rollback deployment
function Invoke-Rollback {
    Write-Info "Rolling back deployment..."
    
    kubectl rollout undo "deployment/${APP_NAME}-app" -n $NAMESPACE
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Rollback completed"
    } else {
        Write-Error "Rollback failed"
        exit 1
    }
}

# Cleanup
function Remove-Cleanup {
    Write-Info "Cleaning up..."
    
    # Remove health check pod
    kubectl delete pod health-check -n $NAMESPACE --ignore-not-found=true
    
    Write-Success "Cleanup completed"
}

# Main deployment function
function Start-Deploy {
    Write-Info "Starting RegimeCompass deployment..."
    Write-Info "Environment: $Environment"
    Write-Info "Image tag: $ImageTag"
    
    Test-Prerequisites
    Build-Image
    Deploy-Kubernetes
    Wait-ForDeployment
    Test-Deployment
    Test-Health
    Remove-Cleanup
    
    Write-Success "RegimeCompass deployment completed successfully!"
    Write-Info "Application is available at: https://regimecompass.com"
}

# Handle script arguments
switch ($Action) {
    "deploy" {
        Start-Deploy
    }
    "rollback" {
        Invoke-Rollback
    }
    "verify" {
        Test-Deployment
    }
    "health" {
        Test-Health
    }
    default {
        Write-Host "Usage: .\scripts\deploy.ps1 [deploy|rollback|verify|health] [image_tag] [environment]"
        Write-Host "  deploy   - Deploy the application (default)"
        Write-Host "  rollback - Rollback to previous version"
        Write-Host "  verify   - Verify deployment status"
        Write-Host "  health   - Run health checks"
        exit 1
    }
}
