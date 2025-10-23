#!/bin/bash

# Paper Trading System Restore Script
# Comprehensive restore solution for database, configuration, and application data

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOYMENT_DIR="$PROJECT_ROOT/deployment"
BACKUP_DIR="${BACKUP_DIR:-$DEPLOYMENT_DIR/backups}"
ENVIRONMENT="${ENVIRONMENT:-production}"
FORCE_RESTORE="${FORCE_RESTORE:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

error_exit() {
    log_error "$1"
    exit 1
}

# Load environment variables
load_environment() {
    if [[ -f "$DEPLOYMENT_DIR/.env.$ENVIRONMENT" ]]; then
        set -a
        source "$DEPLOYMENT_DIR/.env.$ENVIRONMENT"
        set +a
        log_info "Environment variables loaded for $ENVIRONMENT"
    else
        log_warning "Environment file not found: .env.$ENVIRONMENT"
    fi
}

# Validate backup file
validate_backup() {
    local backup_path="$1"
    
    if [[ ! -f "$backup_path" && ! -d "$backup_path" ]]; then
        error_exit "Backup not found: $backup_path"
    fi
    
    log_info "Validating backup: $backup_path"
    
    if [[ -f "$backup_path" && "$backup_path" == *.tar.gz ]]; then
        # Validate compressed backup
        if ! tar -tzf "$backup_path" >/dev/null 2>&1; then
            error_exit "Invalid or corrupted backup file: $backup_path"
        fi
        log_success "Compressed backup validation passed"
    elif [[ -d "$backup_path" ]]; then
        # Validate directory backup
        local required_dirs=("database" "config")
        for dir in "${required_dirs[@]}"; do
            if [[ ! -d "$backup_path/$dir" ]]; then
                error_exit "Missing backup directory: $backup_path/$dir"
            fi
        done
        log_success "Directory backup validation passed"
    else
        error_exit "Unknown backup format: $backup_path"
    fi
}

# Extract backup if compressed
extract_backup() {
    local backup_path="$1"
    local extract_dir="$BACKUP_DIR/restore_$(date +%Y%m%d-%H%M%S)"
    
    if [[ -f "$backup_path" && "$backup_path" == *.tar.gz ]]; then
        log_info "Extracting compressed backup..."
        mkdir -p "$extract_dir"
        tar -xzf "$backup_path" -C "$extract_dir" --strip-components=1
        echo "$extract_dir"
    else
        echo "$backup_path"
    fi
}

# Create pre-restore backup
create_pre_restore_backup() {
    if [[ "$FORCE_RESTORE" == "true" ]]; then
        log_info "Force restore enabled, skipping pre-restore backup"
        return 0
    fi
    
    log_info "Creating pre-restore backup..."
    
    local pre_restore_backup="$BACKUP_DIR/pre-restore-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$pre_restore_backup/database"
    
    # Backup current database if accessible
    if docker-compose -f "$DEPLOYMENT_DIR/docker/docker-compose.yml" exec -T postgres pg_isready -U paper_trading_user -d paper_trading &> /dev/null; then
        docker-compose -f "$DEPLOYMENT_DIR/docker/docker-compose.yml" exec -T postgres pg_dump \
            -U paper_trading_user \
            -d paper_trading \
            --no-password \
            --verbose \
            --format=custom \
            --file="/tmp/pre_restore_backup.backup"
        
        docker-compose -f "$DEPLOYMENT_DIR/docker/docker-compose.yml" exec -T postgres cat "/tmp/pre_restore_backup.backup" > "$pre_restore_backup/database/pre_restore_backup.backup"
        docker-compose -f "$DEPLOYMENT_DIR/docker/docker-compose.yml" exec -T postgres rm -f "/tmp/pre_restore_backup.backup"
        
        log_success "Pre-restore backup created: $pre_restore_backup"
        echo "$pre_restore_backup" > "$BACKUP_DIR/last_pre_restore_backup.txt"
    else
        log_warning "Database not accessible, skipping pre-restore backup"
    fi
}

# Restore database
restore_database() {
    local backup_dir="$1"
    
    log_info "Starting database restore..."
    
    # Check for database backup files
    local sql_backup=""
    local custom_backup=""
    
    if [[ -f "$backup_dir/database/paper_trading_"*".sql" ]]; then
        sql_backup=$(find "$backup_dir/database" -name "paper_trading_*.sql" | head -1)
    fi
    
    if [[ -f "$backup_dir/database/paper_trading_"*".backup" ]]; then
        custom_backup=$(find "$backup_dir/database" -name "paper_trading_*.backup" | head -1)
    fi
    
    if [[ -z "$sql_backup" && -z "$custom_backup" ]]; then
        log_warning "No database backup found, skipping database restore"
        return 0
    fi
    
    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if docker-compose -f "$DEPLOYMENT_DIR/docker/docker-compose.yml" exec -T postgres pg_isready -U paper_trading_user -d paper_trading &> /dev/null; then
            log_success "Database is ready"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            error_exit "Database failed to become ready after $max_attempts attempts"
        fi
        
        log_info "Attempt $attempt/$max_attempts: Database not ready, waiting..."
        sleep 5
        ((attempt++))
    done
    
    # Stop application to prevent connections during restore
    log_info "Stopping application during database restore..."
    docker-compose -f "$DEPLOYMENT_DIR/docker/docker-compose.yml" stop paper-trading-app || true
    
    # Restore database
    if [[ -n "$custom_backup" ]]; then
        log_info "Restoring from custom format backup: $(basename "$custom_backup")"
        
        # Copy backup to container
        docker cp "$custom_backup" paper-trading-db:/tmp/restore_backup.backup
        
        # Drop and recreate database
        docker-compose -f "$DEPLOYMENT_DIR/docker/docker-compose.yml" exec -T postgres psql -U paper_trading_user -d postgres -c "
            SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'paper_trading' AND pid <> pg_backend_pid();
            DROP DATABASE IF EXISTS paper_trading;
            CREATE DATABASE paper_trading OWNER paper_trading_user;
        "
        
        # Restore from custom backup
        docker-compose -f "$DEPLOYMENT_DIR/docker/docker-compose.yml" exec -T postgres pg_restore \
            -U paper_trading_user \
            -d paper_trading \
            --verbose \
            --clean \
            --if-exists \
            --no-owner \
            --no-privileges \
            /tmp/restore_backup.backup
        
        # Clean up
        docker-compose -f "$DEPLOYMENT_DIR/docker/docker-compose.yml" exec -T postgres rm -f /tmp/restore_backup.backup
        
    elif [[ -n "$sql_backup" ]]; then
        log_info "Restoring from SQL backup: $(basename "$sql_backup")"
        
        # Restore from SQL backup
        docker-compose -f "$DEPLOYMENT_DIR/docker/docker-compose.yml" exec -T postgres psql -U paper_trading_user -d postgres < "$sql_backup"
    fi
    
    # Restart application
    log_info "Restarting application..."
    docker-compose -f "$DEPLOYMENT_DIR/docker/docker-compose.yml" start paper-trading-app
    
    log_success "Database restore completed"
}

# Restore configuration
restore_configuration() {
    local backup_dir="$1"
    
    if [[ ! -d "$backup_dir/config" ]]; then
        log_warning "No configuration backup found, skipping configuration restore"
        return 0
    fi
    
    log_info "Starting configuration restore..."
    
    # Backup current configuration
    if [[ -d "$PROJECT_ROOT/config" ]]; then
        mv "$PROJECT_ROOT/config" "$PROJECT_ROOT/config.backup.$(date +%Y%m%d-%H%M%S)" || true
    fi
    
    # Restore configuration files
    if [[ -d "$backup_dir/config/config" ]]; then
        cp -r "$backup_dir/config/config" "$PROJECT_ROOT/"
        log_info "Application configuration restored"
    fi
    
    # Restore Docker configuration (be careful not to overwrite current environment)
    if [[ -d "$backup_dir/config/docker" ]]; then
        local docker_backup_dir="$DEPLOYMENT_DIR/docker.backup.$(date +%Y%m%d-%H%M%S)"
        mv "$DEPLOYMENT_DIR/docker" "$docker_backup_dir" 2>/dev/null || true
        cp -r "$backup_dir/config/docker" "$DEPLOYMENT_DIR/"
        log_info "Docker configuration restored (previous config backed up to $(basename "$docker_backup_dir"))"
    fi
    
    log_success "Configuration restore completed"
}

# Restore application data
restore_application_data() {
    local backup_dir="$1"
    
    if [[ ! -d "$backup_dir/application" ]]; then
        log_warning "No application data backup found, skipping application data restore"
        return 0
    fi
    
    log_info "Starting application data restore..."
    
    # Restore Docker volumes
    local volume_backups=($(find "$backup_dir/application" -name "*.tar.gz" 2>/dev/null || true))
    
    for volume_backup in "${volume_backups[@]}"; do
        local volume_name=$(basename "$volume_backup" .tar.gz)
        local docker_volume="docker_$volume_name"
        
        log_info "Restoring volume: $volume_name"
        
        # Create volume if it doesn't exist
        docker volume create "$docker_volume" >/dev/null 2>&1 || true
        
        # Restore volume data
        docker run --rm -v "$docker_volume:/target" -v "$backup_dir/application:/backup" alpine \
            sh -c "cd /target && tar -xzf /backup/$(basename "$volume_backup")"
    done
    
    log_success "Application data restore completed"
}

# Restore logs
restore_logs() {
    local backup_dir="$1"
    
    if [[ ! -d "$backup_dir/logs" ]]; then
        log_warning "No logs backup found, skipping logs restore"
        return 0
    fi
    
    log_info "Starting logs restore..."
    
    # Backup current logs
    if [[ -d "$PROJECT_ROOT/logs" ]]; then
        mv "$PROJECT_ROOT/logs" "$PROJECT_ROOT/logs.backup.$(date +%Y%m%d-%H%M%S)" || true
    fi
    
    # Restore logs
    cp -r "$backup_dir/logs" "$PROJECT_ROOT/"
    
    log_success "Logs restore completed"
}

# Verify restore
verify_restore() {
    log_info "Verifying restore..."
    
    # Check database connectivity
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if docker-compose -f "$DEPLOYMENT_DIR/docker/docker-compose.yml" exec -T postgres pg_isready -U paper_trading_user -d paper_trading &> /dev/null; then
            log_success "Database connectivity verified"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            log_error "Database connectivity verification failed"
            return 1
        fi
        
        log_info "Attempt $attempt/$max_attempts: Verifying database connectivity..."
        sleep 5
        ((attempt++))
    done
    
    # Check application health
    log_info "Checking application health..."
    sleep 10  # Give application time to start
    
    local health_attempts=20
    local health_attempt=1
    
    while [[ $health_attempt -le $health_attempts ]]; do
        if curl -f -s "http://localhost:3000/api/health" >/dev/null 2>&1; then
            log_success "Application health check passed"
            break
        fi
        
        if [[ $health_attempt -eq $health_attempts ]]; then
            log_warning "Application health check failed - may need manual intervention"
            return 1
        fi
        
        log_info "Health check attempt $health_attempt/$health_attempts..."
        sleep 10
        ((health_attempt++))
    done
    
    # Check database tables
    log_info "Verifying database schema..."
    local table_count=$(docker-compose -f "$DEPLOYMENT_DIR/docker/docker-compose.yml" exec -T postgres psql -U paper_trading_user -d paper_trading -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' \n')
    
    if [[ "$table_count" -gt 0 ]]; then
        log_success "Database schema verified ($table_count tables found)"
    else
        log_error "Database schema verification failed (no tables found)"
        return 1
    fi
    
    log_success "Restore verification completed"
}

# List available backups for restore
list_backups() {
    log_info "Available backups for restore:"
    echo
    
    if [[ -d "$BACKUP_DIR" ]]; then
        # List compressed backups
        echo "Compressed backups:"
        find "$BACKUP_DIR" -name "paper_trading_backup_*.tar.gz" -type f -printf "%T@ %Tc %p\n" 2>/dev/null | sort -rn | cut -d' ' -f2- || echo "  None found"
        
        echo
        
        # List directory backups
        echo "Directory backups:"
        find "$BACKUP_DIR" -maxdepth 1 -type d -name "20*" -printf "%T@ %Tc %p\n" 2>/dev/null | sort -rn | cut -d' ' -f2- || echo "  None found"
    else
        echo "No backup directory found: $BACKUP_DIR"
    fi
}

# Interactive backup selection
select_backup() {
    log_info "Select a backup to restore:"
    echo
    
    local backups=()
    
    # Find compressed backups
    while IFS= read -r -d '' backup; do
        backups+=("$backup")
    done < <(find "$BACKUP_DIR" -name "paper_trading_backup_*.tar.gz" -type f -print0 2>/dev/null | sort -z)
    
    # Find directory backups
    while IFS= read -r -d '' backup; do
        backups+=("$backup")
    done < <(find "$BACKUP_DIR" -maxdepth 1 -type d -name "20*" -print0 2>/dev/null | sort -z)
    
    if [[ ${#backups[@]} -eq 0 ]]; then
        error_exit "No backups found in $BACKUP_DIR"
    fi
    
    # Display options
    for i in "${!backups[@]}"; do
        local backup="${backups[$i]}"
        local backup_name=$(basename "$backup")
        local backup_date=""
        
        if [[ -f "$backup" ]]; then
            backup_date=$(stat -c %y "$backup" 2>/dev/null | cut -d' ' -f1,2 | cut -d'.' -f1)
        elif [[ -d "$backup" ]]; then
            backup_date=$(stat -c %y "$backup" 2>/dev/null | cut -d' ' -f1,2 | cut -d'.' -f1)
        fi
        
        echo "$((i+1)). $backup_name ($backup_date)"
    done
    
    echo
    read -p "Enter backup number (1-${#backups[@]}): " selection
    
    if [[ "$selection" =~ ^[0-9]+$ ]] && [[ "$selection" -ge 1 ]] && [[ "$selection" -le ${#backups[@]} ]]; then
        echo "${backups[$((selection-1))]}"
    else
        error_exit "Invalid selection: $selection"
    fi
}

# Main restore function
main() {
    local action="${1:-}"
    local backup_path="${2:-}"
    
    case "$action" in
        "restore")
            if [[ -z "$backup_path" ]]; then
                backup_path=$(select_backup)
            fi
            
            log_info "Starting Paper Trading System restore from: $backup_path"
            
            load_environment
            validate_backup "$backup_path"
            
            # Confirm restore
            if [[ "$FORCE_RESTORE" != "true" ]]; then
                echo
                log_warning "This will restore the system from backup and may overwrite current data."
                read -p "Are you sure you want to continue? (yes/no): " confirm
                if [[ "$confirm" != "yes" ]]; then
                    log_info "Restore cancelled by user"
                    exit 0
                fi
            fi
            
            create_pre_restore_backup
            
            local extracted_backup=$(extract_backup "$backup_path")
            
            restore_database "$extracted_backup"
            restore_configuration "$extracted_backup"
            restore_application_data "$extracted_backup"
            restore_logs "$extracted_backup"
            
            # Clean up extracted backup if it was temporary
            if [[ "$extracted_backup" != "$backup_path" ]]; then
                rm -rf "$extracted_backup"
            fi
            
            verify_restore
            
            log_success "Restore completed successfully!"
            log_info "Please verify that all services are working correctly."
            ;;
        "list")
            load_environment
            list_backups
            ;;
        "verify")
            if [[ -z "$backup_path" ]]; then
                error_exit "Please specify backup path to verify"
            fi
            validate_backup "$backup_path"
            log_success "Backup verification passed: $backup_path"
            ;;
        *)
            echo "Usage: $0 {restore|list|verify} [backup_path]"
            echo
            echo "Commands:"
            echo "  restore [path]   - Restore system from backup (interactive selection if no path)"
            echo "  list             - List available backups"
            echo "  verify <path>    - Verify backup integrity"
            echo
            echo "Environment variables:"
            echo "  ENVIRONMENT      - Environment name (default: production)"
            echo "  BACKUP_DIR       - Backup directory (default: ./backups)"
            echo "  FORCE_RESTORE    - Skip confirmations (default: false)"
            echo
            echo "Examples:"
            echo "  $0 restore                                    # Interactive backup selection"
            echo "  $0 restore /path/to/backup.tar.gz           # Restore specific backup"
            echo "  FORCE_RESTORE=true $0 restore backup.tar.gz # Force restore without prompts"
            exit 1
            ;;
    esac
}

# Handle script interruption
trap 'log_error "Restore interrupted"; exit 1' INT TERM

# Run main function
main "$@"