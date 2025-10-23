#!/bin/bash

# Gamma Adaptive System - Rollback Script
# Rollback to previous deployment or specific backup

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOYMENT_DIR="$PROJECT_ROOT/deployment"

# Default values
ENVIRONMENT="development"
BACKUP_TIMESTAMP=""
LIST_BACKUPS=false
FORCE_ROLLBACK=false

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
Gamma Adaptive System Rollback Script

Usage: $0 [OPTIONS]

Options:
    -e, --environment ENV    Target environment (development|staging|production) [default: development]
    -t, --timestamp TS       Specific backup timestamp to rollback to
    -l, --list              List available backups
    -f, --force             Force rollback without confirmation
    -h, --help              Show this help message

Examples:
    $0 -e production --list                    # List available backups
    $0 -e production -t 20240101_120000        # Rollback to specific backup
    $0 -e staging --force                      # Force rollback to latest backup

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -t|--timestamp)
            BACKUP_TIMESTAMP="$2"
            shift 2
            ;;
        -l|--list)
            LIST_BACKUPS=true
            shift
            ;;
        -f|--force)
            FORCE_ROLLBACK=true
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

# List available backups
list_backups() {
    local backup_base_dir="$PROJECT_ROOT/backups/$ENVIRONMENT"
    
    if [[ ! -d "$backup_base_dir" ]]; then
        log_warning "No backups found for $ENVIRONMENT environment"
        return 0
    fi
    
    log_info "Available backups for $ENVIRONMENT environment:"
    echo
    
    # Find all backup directories
    local backups=($(find "$backup_base_dir" -maxdepth 1 -type d -name "*_*" | sort -r))
    
    if [[ ${#backups[@]} -eq 0 ]]; then
        log_warning "No backups found"
        return 0
    fi
    
    printf "%-20s %-15s %-40s %-15s\n" "TIMESTAMP" "TYPE" "GIT_COMMIT" "GIT_BRANCH"
    printf "%-20s %-15s %-40s %-15s\n" "--------" "----" "----------" "----------"
    
    for backup_dir in "${backups[@]}"; do
        local timestamp=$(basename "$backup_dir")
        local manifest_file="$backup_dir/manifest.json"
        
        if [[ -f "$manifest_file" ]]; then
            local backup_type=$(jq -r '.backup_type // "unknown"' "$manifest_file" 2>/dev/null || echo "unknown")
            local git_commit=$(jq -r '.git_commit // "unknown"' "$manifest_file" 2>/dev/null || echo "unknown")
            local git_branch=$(jq -r '.git_branch // "unknown"' "$manifest_file" 2>/dev/null || echo "unknown")
            
            # Truncate long commit hashes
            if [[ ${#git_commit} -gt 8 && "$git_commit" != "unknown" ]]; then
                git_commit="${git_commit:0:8}..."
            fi
            
            printf "%-20s %-15s %-40s %-15s\n" "$timestamp" "$backup_type" "$git_commit" "$git_branch"
        else
            printf "%-20s %-15s %-40s %-15s\n" "$timestamp" "unknown" "unknown" "unknown"
        fi
    done
    
    echo
    log_info "Total backups: ${#backups[@]}"
}

# Find latest backup
find_latest_backup() {
    local backup_base_dir="$PROJECT_ROOT/backups/$ENVIRONMENT"
    
    if [[ ! -d "$backup_base_dir" ]]; then
        log_error "No backups directory found for $ENVIRONMENT environment"
        exit 1
    fi
    
    local latest_backup=$(find "$backup_base_dir" -maxdepth 1 -type d -name "*_*" | sort -r | head -n 1)
    
    if [[ -z "$latest_backup" ]]; then
        log_error "No backups found for $ENVIRONMENT environment"
        exit 1
    fi
    
    echo "$(basename "$latest_backup")"
}

# Validate backup
validate_backup() {
    local timestamp="$1"
    local backup_dir="$PROJECT_ROOT/backups/$ENVIRONMENT/$timestamp"
    
    if [[ ! -d "$backup_dir" ]]; then
        log_error "Backup not found: $timestamp"
        exit 1
    fi
    
    # Check required files
    if [[ ! -f "$backup_dir/.env.$ENVIRONMENT" ]]; then
        log_error "Environment configuration not found in backup"
        exit 1
    fi
    
    if [[ ! -f "$backup_dir/manifest.json" ]]; then
        log_warning "Backup manifest not found, proceeding anyway"
    fi
    
    log_success "Backup validation passed"
}

# Create pre-rollback backup
create_pre_rollback_backup() {
    log_info "Creating pre-rollback backup..."
    
    local backup_timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_dir="$PROJECT_ROOT/backups/$ENVIRONMENT/${backup_timestamp}_pre_rollback"
    
    mkdir -p "$backup_dir"
    
    # Backup current configuration
    if [[ -f "$PROJECT_ROOT/.env" ]]; then
        cp "$PROJECT_ROOT/.env" "$backup_dir/.env.$ENVIRONMENT"
    fi
    
    # Backup database (if running)
    if docker-compose ps postgres | grep -q "Up"; then
        log_info "Backing up current database..."
        docker-compose exec -T postgres pg_dump -U gamma_${ENVIRONMENT} gamma_adaptive_${ENVIRONMENT} > "$backup_dir/database_backup.sql"
    fi
    
    # Create backup manifest
    cat > "$backup_dir/manifest.json" << EOF
{
    "timestamp": "$backup_timestamp",
    "environment": "$ENVIRONMENT",
    "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "git_branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')",
    "backup_type": "pre_rollback"
}
EOF
    
    log_success "Pre-rollback backup created: $backup_dir"
}

# Perform rollback
perform_rollback() {
    local timestamp="$1"
    local backup_dir="$PROJECT_ROOT/backups/$ENVIRONMENT/$timestamp"
    
    log_info "Rolling back to backup: $timestamp"
    
    cd "$PROJECT_ROOT"
    
    # Stop current services
    log_info "Stopping current services..."
    docker-compose down
    
    # Restore configuration
    log_info "Restoring configuration..."
    cp "$backup_dir/.env.$ENVIRONMENT" .env
    
    # Restore database if backup exists
    if [[ -f "$backup_dir/database_backup.sql" ]]; then
        log_info "Restoring database..."
        
        # Start only the database service
        docker-compose up -d postgres
        
        # Wait for database to be ready
        sleep 10
        
        # Restore database
        docker-compose exec -T postgres psql -U gamma_${ENVIRONMENT} -d gamma_adaptive_${ENVIRONMENT} < "$backup_dir/database_backup.sql"
        
        log_success "Database restored"
    fi
    
    # Start all services
    log_info "Starting services..."
    
    # Set compose profiles based on environment
    COMPOSE_PROFILES=""
    if [[ "$ENVIRONMENT" == "production" ]]; then
        COMPOSE_PROFILES="production,monitoring"
    elif [[ "$ENVIRONMENT" == "staging" ]]; then
        COMPOSE_PROFILES="monitoring"
    fi
    
    # Start services
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
        log_error "Some services are unhealthy after rollback"
        docker-compose ps
        exit 1
    fi
    
    log_success "Rollback completed successfully"
}

# Confirmation prompt
confirm_rollback() {
    if [[ "$FORCE_ROLLBACK" == true ]]; then
        return 0
    fi
    
    local timestamp="$1"
    local backup_dir="$PROJECT_ROOT/backups/$ENVIRONMENT/$timestamp"
    
    echo
    log_warning "You are about to rollback $ENVIRONMENT environment to backup: $timestamp"
    
    if [[ -f "$backup_dir/manifest.json" ]]; then
        local git_commit=$(jq -r '.git_commit // "unknown"' "$backup_dir/manifest.json" 2>/dev/null || echo "unknown")
        local git_branch=$(jq -r '.git_branch // "unknown"' "$backup_dir/manifest.json" 2>/dev/null || echo "unknown")
        local backup_type=$(jq -r '.backup_type // "unknown"' "$backup_dir/manifest.json" 2>/dev/null || echo "unknown")
        
        echo "  - Git commit: $git_commit"
        echo "  - Git branch: $git_branch"
        echo "  - Backup type: $backup_type"
    fi
    
    log_warning "This will:"
    echo "  - Stop current services"
    echo "  - Restore configuration from backup"
    echo "  - Restore database from backup (if available)"
    echo "  - Restart services"
    echo "  - Create a pre-rollback backup"
    echo
    
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Rollback cancelled"
        exit 0
    fi
}

# Main rollback flow
main() {
    if [[ "$LIST_BACKUPS" == true ]]; then
        list_backups
        exit 0
    fi
    
    # Determine backup timestamp
    if [[ -z "$BACKUP_TIMESTAMP" ]]; then
        log_info "No specific backup timestamp provided, finding latest backup..."
        BACKUP_TIMESTAMP=$(find_latest_backup)
        log_info "Latest backup found: $BACKUP_TIMESTAMP"
    fi
    
    log_info "Starting rollback process for $ENVIRONMENT environment"
    
    validate_backup "$BACKUP_TIMESTAMP"
    confirm_rollback "$BACKUP_TIMESTAMP"
    create_pre_rollback_backup
    perform_rollback "$BACKUP_TIMESTAMP"
    
    log_success "Rollback process completed!"
    
    echo
    log_info "Service status:"
    docker-compose ps
    
    echo
    log_info "Application logs (last 20 lines):"
    docker-compose logs --tail=20 gamma-adaptive
}

# Run main function
main