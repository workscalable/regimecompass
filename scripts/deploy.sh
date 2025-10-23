#!/bin/bash

# RegimeCompass Deployment Script
# This script deploys the RegimeCompass application to production

set -e

# Configuration
NAMESPACE="regimecompass"
APP_NAME="regimecompass"
IMAGE_TAG="${1:-latest}"
ENVIRONMENT="${2:-production}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "docker is not installed"
        exit 1
    fi
    
    # Check if helm is installed (optional)
    if ! command -v helm &> /dev/null; then
        log_warning "helm is not installed (optional)"
    fi
    
    log_success "Prerequisites check passed"
}

# Build Docker image
build_image() {
    log_info "Building Docker image..."
    
    docker build -t ${APP_NAME}:${IMAGE_TAG} .
    
    if [ $? -eq 0 ]; then
        log_success "Docker image built successfully"
    else
        log_error "Docker image build failed"
        exit 1
    fi
}

# Deploy to Kubernetes
deploy_kubernetes() {
    log_info "Deploying to Kubernetes..."
    
    # Create namespace if it doesn't exist
    kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply Kubernetes manifests
    log_info "Applying Kubernetes manifests..."
    
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
    
    log_success "Kubernetes manifests applied successfully"
}

# Wait for deployment
wait_for_deployment() {
    log_info "Waiting for deployment to be ready..."
    
    kubectl wait --for=condition=available --timeout=300s deployment/${APP_NAME}-app -n ${NAMESPACE}
    
    if [ $? -eq 0 ]; then
        log_success "Deployment is ready"
    else
        log_error "Deployment failed to become ready"
        exit 1
    fi
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check pods
    kubectl get pods -n ${NAMESPACE}
    
    # Check services
    kubectl get services -n ${NAMESPACE}
    
    # Check ingress
    kubectl get ingress -n ${NAMESPACE}
    
    # Check HPA
    kubectl get hpa -n ${NAMESPACE}
    
    log_success "Deployment verification completed"
}

# Run health checks
health_check() {
    log_info "Running health checks..."
    
    # Get service URL
    SERVICE_URL=$(kubectl get service ${APP_NAME}-service -n ${NAMESPACE} -o jsonpath='{.spec.clusterIP}')
    
    if [ -z "$SERVICE_URL" ]; then
        log_error "Could not get service URL"
        return 1
    fi
    
    # Check health endpoint
    kubectl run health-check --image=curlimages/curl --rm -i --restart=Never -- \
        curl -f http://${SERVICE_URL}:3000/api/health
    
    if [ $? -eq 0 ]; then
        log_success "Health check passed"
    else
        log_error "Health check failed"
        return 1
    fi
}

# Rollback deployment
rollback() {
    log_info "Rolling back deployment..."
    
    kubectl rollout undo deployment/${APP_NAME}-app -n ${NAMESPACE}
    
    if [ $? -eq 0 ]; then
        log_success "Rollback completed"
    else
        log_error "Rollback failed"
        exit 1
    fi
}

# Cleanup
cleanup() {
    log_info "Cleaning up..."
    
    # Remove health check pod
    kubectl delete pod health-check -n ${NAMESPACE} --ignore-not-found=true
    
    log_success "Cleanup completed"
}

# Main deployment function
deploy() {
    log_info "Starting RegimeCompass deployment..."
    log_info "Environment: ${ENVIRONMENT}"
    log_info "Image tag: ${IMAGE_TAG}"
    
    check_prerequisites
    build_image
    deploy_kubernetes
    wait_for_deployment
    verify_deployment
    health_check
    cleanup
    
    log_success "RegimeCompass deployment completed successfully!"
    log_info "Application is available at: https://regimecompass.com"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "rollback")
        rollback
        ;;
    "verify")
        verify_deployment
        ;;
    "health")
        health_check
        ;;
    *)
        echo "Usage: $0 [deploy|rollback|verify|health] [image_tag] [environment]"
        echo "  deploy   - Deploy the application (default)"
        echo "  rollback - Rollback to previous version"
        echo "  verify   - Verify deployment status"
        echo "  health   - Run health checks"
        exit 1
        ;;
esac
