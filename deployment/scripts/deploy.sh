#!/bin/bash

# Gamma Adaptive System - Deployment Script
# Supports deployment to development, staging, and production environments

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOYMENT_DIR="$PROJECT_ROOT/deployment"

# Default values
ENVIRONMENT="development"
BUILD_ONLY=false
SKIP_TESTS=false
FORCE_DEPLOY=false
BACKUP_BEFORE_DEPLOY=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

# Help function
show_help() {
    cat << EOF
Gamma Adaptive System Deployment Script

Usage: $0 [OPTIONS]

Options:
    -e, --environment ENV    Target environment (development|staging|production) [default: development]
    -b, --build-only        Only build the Docker image, don't deploy
    -s, --skip-tests        Skip running tests before deployment
    -f, --force             Force deployment without confirmation
    --no-backup            Skip backup before deployment
    -h, --help              Show this help message

Examples:
    $0 -e development                    # Deploy to development
    $0 -e staging --skip-tests          # Deploy to staging without tests
    $0 -e production --force            # Force deploy to production
    $0 --build-only                     # Only build Docker image

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -b|--build-only)
            BUILD_ONLY=true
            shift
            ;;
        -s|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -f|--force)
            FORCE_DEPLOY=true
            shift
            ;;
        --no-backup)
            BACKUP_BEFORE_DEPLOY=false
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT"
    log_error "Valid environments: development, staging, production"
    exit 1
fi

# Check if required files exist
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if [[ ! -f "$PROJECT_ROOT/Dockerfile" ]]; then
        log_error "Dockerfile not found in project root"
        exit 1
    fi
    
    if [[ ! -f "$PROJECT_ROOT/docker-compose.yml" ]]; then
        log_error "docker-compose.yml not found in project root"
        exit 1
    fi
    
    if [[ ! -f "$DEPLOYMENT_DIR/environments/.env.$ENVIRONMENT" ]]; then
        log_error "Environment file not found: .env.$ENVIRONMENT"
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running or not accessible"
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose > /dev/null 2>&1; then
        log_error "docker-compose is not installed or not in PATH"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        log_warning "Skipping tests as requested"
        return 0
    fi
    
    log_info "Running tests..."
    
    cd "$PROJECT_ROOT"
    
    # Install dependencies if needed
    if [[ ! -d "node_modules" ]]; then
        log_info "Installing dependencies..."
        npm ci
    fi
    
    # Run tests
    if npm test; then
        log_success "All tests passed"
    else
        log_error "Tests failed"
        exit 1
    fi
}

# Create backup
create_backup() {
    if [[ "$BACKUP_BEFORE_DEPLOY" == false ]]; then
        log_warning "Skipping backup as requested"
        return 0
    fi
    
    if [[ "$ENVIRONMENT" == "development" ]]; then
        log_info "Skipping backup for development environment"
        return 0
    fi
    
    log_info "Creating backup before deployment..."
    
    BACKUP_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_DIR="$PROJECT_ROOT/backups/$ENVIRONMENT/$BACKUP_TIMESTAMP"
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup configuration
    cp "$DEPLOYMENT_DIR/environments/.env.$ENVIRONMENT" "$BACKUP_DIR/"
    
    # Backup database (if running)
    if docker-compose ps postgres | grep -q "Up"; then
        log_info "Backing up database..."
        docker-compose exec -T postgres pg_dump -U gamma_${ENVIRONMENT} gamma_adaptive_${ENVIRONMENT} > "$BACKUP_DIR/database_backup.sql"
    fi
    
    # Create backup manifest
    cat > "$BACKUP_DIR/manifest.json" << EOF
{
    "timestamp": "$BACKUP_TIMESTAMP",
    "environment": "$ENVIRONMENT",
    "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "git_branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')",
    "backup_type": "pre_deployment"
}
EOF
    
    log_success "Backup created: $BACKUP_DIR"
}

# Build Docker image
build_image() {
    log_info "Building Docker image for $ENVIRONMENT environment..."
    
    cd "$PROJECT_ROOT"
    
    # Build the image
    docker build \
        --target production \
        --build-arg NODE_ENV="$ENVIRONMENT" \
        -t "gamma-adaptive:$ENVIRONMENT" \
        -t "gamma-adaptive:latest" \
        .
    
    log_success "Docker image built successfully"
}

# Deploy application
deploy_application() {
    if [[ "$BUILD_ONLY" == true ]]; then
        log_info "Build-only mode, skipping deployment"
        return 0
    fi
    
    log_info "Deploying to $ENVIRONMENT environment..."
    
    cd "$PROJECT_ROOT"
    
    # Copy environment file
    cp "$DEPLOYMENT_DIR/environments/.env.$ENVIRONMENT" .env
    
    # Set compose profiles based on environment
    COMPOSE_PROFILES=""
    if [[ "$ENVIRONMENT" == "production" ]]; then
        COMPOSE_PROFILES="production,monitoring"
    elif [[ "$ENVIRONMENT" == "staging" ]]; then
        COMPOSE_PROFILES="monitoring"
    fi
    
    # Deploy with Docker Compose
    if [[ -n "$COMPOSE_PROFILES" ]]; then
        COMPOSE_PROFILES="$COMPOSE_PROFILES" docker-compose up -d
    else
        docker-compose up -d
    fi
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 30
    
    # Check service health
    if docker-compose ps | grep -q "unhealthy"; then
        log_error "Some services are unhealthy"
        docker-compose ps
        exit 1
    fi
    
    log_success "Deployment completed successfully"
}

# Confirmation prompt
confirm_deployment() {
    if [[ "$FORCE_DEPLOY" == true ]]; then
        return 0
    fi
    
    echo
    log_warning "You are about to deploy to: $ENVIRONMENT"
    log_warning "This will:"
    echo "  - Build a new Docker image"
    if [[ "$BUILD_ONLY" == false ]]; then
        echo "  - Stop and restart services"
        echo "  - Apply configuration changes"
        if [[ "$BACKUP_BEFORE_DEPLOY" == true && "$ENVIRONMENT" != "development" ]]; then
            echo "  - Create a backup"
        fi
    fi
    echo
    
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled"
        exit 0
    fi
}

# Main deployment flow
main() {
    log_info "Starting deployment to $ENVIRONMENT environment"
    
    check_prerequisites
    confirm_deployment
    run_tests
    create_backup
    build_image
    deploy_application
    
    log_success "Deployment process completed!"
    
    if [[ "$BUILD_ONLY" == false ]]; then
        echo
        log_info "Service status:"
        docker-compose ps
        
        echo
        log_info "Application logs (last 20 lines):"
        docker-compose logs --tail=20 gamma-adaptive
        
        echo
        log_info "Access the application:"
        if [[ "$ENVIRONMENT" == "production" ]]; then
            echo "  - Application: https://gamma-adaptive.com"
            echo "  - Monitoring: https://gamma-adaptive.com:3001"
        else
            echo "  - Application: http://localhost:3000"
            echo "  - Monitoring: http://localhost:3001"
        fi
    fi
}

# Run main function
main