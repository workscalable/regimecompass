#!/bin/bash

# Paper Trading System Backup Script
# Comprehensive backup solution for database, configuration, and application data

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOYMENT_DIR="$PROJECT_ROOT/deployment"
BACKUP_DIR="${BACKUP_DIR:-$DEPLOYMENT_DIR/backups}"
ENVIRONMENT="${ENVIRONMENT:-production}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
COMPRESSION_ENABLED="${COMPRESSION_ENABLED:-true}"
S3_BACKUP_ENABLED="${S3_BACKUP_ENABLED:-false}"

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

# Create backup directory structure
setup_backup_directory() {
    local timestamp=$(date +%Y%m%d-%H%M%S)
    BACKUP_TIMESTAMP="$timestamp"
    BACKUP_PATH="$BACKUP_DIR/$timestamp"
    
    mkdir -p "$BACKUP_PATH"/{database,config,logs,application}
    
    log_info "Backup directory created: $BACKUP_PATH"
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

# Backup database
backup_database() {
    log_info "Starting database backup..."
    
    local db_backup_file="$BACKUP_PATH/database/paper_trading_${BACKUP_TIMESTAMP}.sql"
    local db_custom_backup="$BACKUP_PATH/database/paper_trading_${BACKUP_TIMESTAMP}.backup"
    
    # Check if database is accessible
    if ! docker-compose -f "$DEPLOYMENT_DIR/docker/docker-compose.yml" exec -T postgres pg_isready -U paper_trading_user -d paper_trading &> /dev/null; then
        log_warning "Database not accessible, skipping database backup"
        return 1
    fi
    
    # Create SQL dump
    log_info "Creating SQL dump..."
    docker-compose -f "$DEPLOYMENT_DIR/docker/docker-compose.yml" exec -T postgres pg_dump \
        -U paper_trading_user \
        -d paper_trading \
        --no-password \
        --verbose \
        --clean \
        --if-exists \
        --create > "$db_backup_file"
    
    # Create custom format backup (for faster restore)
    log_info "Creating custom format backup..."
    docker-compose -f "$DEPLOYMENT_DIR/docker/docker-compose.yml" exec -T postgres pg_dump \
        -U paper_trading_user \
        -d paper_trading \
        --no-password \
        --verbose \
        --format=custom \
        --file="/tmp/paper_trading_${BACKUP_TIMESTAMP}.backup"
    
    # Copy custom backup to host
    docker-compose -f "$DEPLOYMENT_DIR/docker/docker-compose.yml" exec -T postgres cat "/tmp/paper_trading_${BACKUP_TIMESTAMP}.backup" > "$db_custom_backup"
    
    # Clean up temporary file in container
    docker-compose -f "$DEPLOYMENT_DIR/docker/docker-compose.yml" exec -T postgres rm -f "/tmp/paper_trading_${BACKUP_TIMESTAMP}.backup"
    
    # Create database schema info
    log_info "Collecting database metadata..."
    cat > "$BACKUP_PATH/database/metadata.json" << EOF
{
    "backup_timestamp": "$BACKUP_TIMESTAMP",
    "database_name": "paper_trading",
    "database_user": "paper_trading_user",
    "backup_type": "full",
    "format": "sql_and_custom",
    "environment": "$ENVIRONMENT",
    "created_by": "$(whoami)",
    "host": "$(hostname)",
    "files": {
        "sql_dump": "paper_trading_${BACKUP_TIMESTAMP}.sql",
        "custom_backup": "paper_trading_${BACKUP_TIMESTAMP}.backup"
    }
}
EOF
    
    # Get database size and table counts
    docker-compose -f "$DEPLOYMENT_DIR/docker/docker-compose.yml" exec -T postgres psql -U paper_trading_user -d paper_trading -c "
        SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
            pg_stat_get_tuples_inserted(c.oid) as inserts,
            pg_stat_get_tuples_updated(c.oid) as updates,
            pg_stat_get_tuples_deleted(c.oid) as deletes
        FROM pg_tables pt
        JOIN pg_class c ON c.relname = pt.tablename
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    " > "$BACKUP_PATH/database/table_stats.txt"
    
    log_success "Database backup completed"
    
    # Get file sizes
    local sql_size=$(du -h "$db_backup_file" | cut -f1)
    local custom_size=$(du -h "$db_custom_backup" | cut -f1)
    log_info "Backup sizes - SQL: $sql_size, Custom: $custom_size"
}

# Backup configuration files
backup_configuration() {
    log_info "Starting configuration backup..."
    
    # Copy configuration files
    if [[ -d "$PROJECT_ROOT/config" ]]; then
        cp -r "$PROJECT_ROOT/config" "$BACKUP_PATH/"
        log_info "Configuration files backed up"
    fi
    
    # Copy environment files (without sensitive data)
    for env_file in "$DEPLOYMENT_DIR"/.env.*; do
        if [[ -f "$env_file" ]]; then
            local env_name=$(basename "$env_file")
            # Create sanitized version without sensitive values
            sed 's/=.*/=***REDACTED***/g' "$env_file" > "$BACKUP_PATH/config/$env_name.sanitized"
        fi
    done
    
    # Copy Docker configuration
    cp -r "$DEPLOYMENT_DIR/docker" "$BACKUP_PATH/config/"
    
    # Copy deployment scripts
    cp -r "$DEPLOYMENT_DIR/scripts" "$BACKUP_PATH/config/"
    
    # Create configuration metadata
    cat > "$BACKUP_PATH/config/metadata.json" << EOF
{
    "backup_timestamp": "$BACKUP_TIMESTAMP",
    "environment": "$ENVIRONMENT",
    "config_version": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "backup_includes": [
        "application_config",
        "environment_files_sanitized",
        "docker_configuration",
        "deployment_scripts"
    ]
}
EOF
    
    log_success "Configuration backup completed"
}

# Backup application logs
backup_logs() {
    log_info "Starting logs backup..."
    
    # Copy application logs if they exist
    if [[ -d "$PROJECT_ROOT/logs" ]]; then
        cp -r "$PROJECT_ROOT/logs" "$BACKUP_PATH/"
        log_info "Application logs backed up"
    fi
    
    # Export Docker container logs
    local containers=("paper-trading-app" "paper-trading-db" "paper-trading-redis" "paper-trading-nginx")
    
    for container in "${containers[@]}"; do
        if docker ps -a --format "table {{.Names}}" | grep -q "^$container$"; then
            log_info "Exporting logs for container: $container"
            docker logs "$container" > "$BACKUP_PATH/logs/${container}.log" 2>&1 || true
        fi
    done
    
    log_success "Logs backup completed"
}

# Backup application data
backup_application_data() {
    log_info "Starting application data backup..."
    
    # Backup any persistent volumes
    local volumes=("app-logs" "app-config")
    
    for volume in "${volumes[@]}"; do
        if docker volume ls --format "table {{.Name}}" | grep -q "^docker_$volume$"; then
            log_info "Backing up volume: $volume"
            docker run --rm -v "docker_$volume:/source" -v "$BACKUP_PATH/application:/backup" alpine \
                tar czf "/backup/${volume}.tar.gz" -C /source .
        fi
    done
    
    # Create application metadata
    cat > "$BACKUP_PATH/application/metadata.json" << EOF
{
    "backup_timestamp": "$BACKUP_TIMESTAMP",
    "application_version": "$(git describe --tags 2>/dev/null || echo 'unknown')",
    "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "docker_images": $(docker images --format "table {{.Repository}}:{{.Tag}}" | grep paper-trading | jq -R . | jq -s .),
    "volumes_backed_up": $(printf '%s\n' "${volumes[@]}" | jq -R . | jq -s .)
}
EOF
    
    log_success "Application data backup completed"
}

# Compress backup
compress_backup() {
    if [[ "$COMPRESSION_ENABLED" != "true" ]]; then
        log_info "Compression disabled, skipping..."
        return 0
    fi
    
    log_info "Compressing backup..."
    
    local compressed_file="$BACKUP_DIR/paper_trading_backup_${BACKUP_TIMESTAMP}.tar.gz"
    
    cd "$BACKUP_DIR"
    tar -czf "$compressed_file" "$BACKUP_TIMESTAMP"
    
    # Verify compression
    if [[ -f "$compressed_file" ]]; then
        local original_size=$(du -sh "$BACKUP_TIMESTAMP" | cut -f1)
        local compressed_size=$(du -sh "$compressed_file" | cut -f1)
        
        log_success "Backup compressed successfully"
        log_info "Original size: $original_size, Compressed size: $compressed_size"
        
        # Remove uncompressed backup
        rm -rf "$BACKUP_TIMESTAMP"
        
        # Update backup path for further operations
        BACKUP_PATH="$compressed_file"
    else
        log_error "Compression failed"
        return 1
    fi
}

# Upload to S3 (if enabled)
upload_to_s3() {
    if [[ "$S3_BACKUP_ENABLED" != "true" ]]; then
        log_info "S3 backup disabled, skipping..."
        return 0
    fi
    
    if [[ -z "${AWS_S3_BUCKET:-}" ]]; then
        log_warning "AWS_S3_BUCKET not configured, skipping S3 upload"
        return 1
    fi
    
    log_info "Uploading backup to S3..."
    
    local s3_key="paper-trading-backups/$ENVIRONMENT/$(basename "$BACKUP_PATH")"
    
    if command -v aws &> /dev/null; then
        aws s3 cp "$BACKUP_PATH" "s3://$AWS_S3_BUCKET/$s3_key"
        log_success "Backup uploaded to S3: s3://$AWS_S3_BUCKET/$s3_key"
    else
        log_warning "AWS CLI not installed, skipping S3 upload"
        return 1
    fi
}

# Clean up old backups
cleanup_old_backups() {
    log_info "Cleaning up old backups (retention: $RETENTION_DAYS days)..."
    
    # Clean up local backups
    find "$BACKUP_DIR" -name "paper_trading_backup_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -maxdepth 1 -type d -name "20*" -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true
    
    # Clean up S3 backups if enabled
    if [[ "$S3_BACKUP_ENABLED" == "true" && -n "${AWS_S3_BUCKET:-}" ]] && command -v aws &> /dev/null; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
        aws s3 ls "s3://$AWS_S3_BUCKET/paper-trading-backups/$ENVIRONMENT/" | \
            awk '$1 < "'$cutoff_date'" {print $4}' | \
            xargs -I {} aws s3 rm "s3://$AWS_S3_BUCKET/paper-trading-backups/$ENVIRONMENT/{}"
    fi
    
    log_success "Old backups cleaned up"
}

# Create backup manifest
create_manifest() {
    log_info "Creating backup manifest..."
    
    local manifest_file="$BACKUP_DIR/backup_manifest_${BACKUP_TIMESTAMP}.json"
    
    cat > "$manifest_file" << EOF
{
    "backup_id": "$BACKUP_TIMESTAMP",
    "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$ENVIRONMENT",
    "backup_type": "full",
    "components": {
        "database": true,
        "configuration": true,
        "logs": true,
        "application_data": true
    },
    "compression": {
        "enabled": $COMPRESSION_ENABLED,
        "format": "tar.gz"
    },
    "s3_upload": {
        "enabled": $S3_BACKUP_ENABLED,
        "bucket": "${AWS_S3_BUCKET:-null}"
    },
    "retention_days": $RETENTION_DAYS,
    "backup_path": "$BACKUP_PATH",
    "created_by": "$(whoami)",
    "host": "$(hostname)",
    "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')"
}
EOF
    
    log_success "Backup manifest created: $manifest_file"
}

# Verify backup integrity
verify_backup() {
    log_info "Verifying backup integrity..."
    
    if [[ "$COMPRESSION_ENABLED" == "true" ]]; then
        # Verify compressed backup
        if tar -tzf "$BACKUP_PATH" >/dev/null 2>&1; then
            log_success "Compressed backup integrity verified"
        else
            log_error "Compressed backup integrity check failed"
            return 1
        fi
    else
        # Verify uncompressed backup
        if [[ -d "$BACKUP_PATH" ]]; then
            local required_dirs=("database" "config" "logs" "application")
            for dir in "${required_dirs[@]}"; do
                if [[ ! -d "$BACKUP_PATH/$dir" ]]; then
                    log_error "Missing backup directory: $dir"
                    return 1
                fi
            done
            log_success "Backup directory structure verified"
        else
            log_error "Backup directory not found"
            return 1
        fi
    fi
}

# List available backups
list_backups() {
    log_info "Available backups:"
    echo
    
    # List local backups
    echo "Local backups:"
    if [[ -d "$BACKUP_DIR" ]]; then
        find "$BACKUP_DIR" -name "paper_trading_backup_*.tar.gz" -type f -printf "%T@ %Tc %p\n" | sort -n | cut -d' ' -f2- || true
        find "$BACKUP_DIR" -maxdepth 1 -type d -name "20*" -printf "%T@ %Tc %p\n" | sort -n | cut -d' ' -f2- || true
    else
        echo "  No local backups found"
    fi
    
    echo
    
    # List S3 backups if enabled
    if [[ "$S3_BACKUP_ENABLED" == "true" && -n "${AWS_S3_BUCKET:-}" ]] && command -v aws &> /dev/null; then
        echo "S3 backups:"
        aws s3 ls "s3://$AWS_S3_BUCKET/paper-trading-backups/$ENVIRONMENT/" || echo "  No S3 backups found"
    fi
}

# Main backup function
main() {
    local action="${1:-backup}"
    
    case "$action" in
        "backup")
            log_info "Starting Paper Trading System backup..."
            load_environment
            setup_backup_directory
            backup_database
            backup_configuration
            backup_logs
            backup_application_data
            compress_backup
            upload_to_s3
            create_manifest
            verify_backup
            cleanup_old_backups
            log_success "Backup completed successfully: $BACKUP_PATH"
            ;;
        "list")
            load_environment
            list_backups
            ;;
        "verify")
            local backup_file="${2:-}"
            if [[ -z "$backup_file" ]]; then
                error_exit "Please specify backup file to verify"
            fi
            BACKUP_PATH="$backup_file"
            COMPRESSION_ENABLED="true"
            verify_backup
            ;;
        "cleanup")
            load_environment
            cleanup_old_backups
            ;;
        *)
            echo "Usage: $0 {backup|list|verify|cleanup}"
            echo
            echo "Commands:"
            echo "  backup           - Create full system backup"
            echo "  list             - List available backups"
            echo "  verify <file>    - Verify backup integrity"
            echo "  cleanup          - Clean up old backups"
            echo
            echo "Environment variables:"
            echo "  ENVIRONMENT      - Environment name (default: production)"
            echo "  BACKUP_DIR       - Backup directory (default: ./backups)"
            echo "  RETENTION_DAYS   - Backup retention in days (default: 30)"
            echo "  COMPRESSION_ENABLED - Enable compression (default: true)"
            echo "  S3_BACKUP_ENABLED - Enable S3 upload (default: false)"
            echo "  AWS_S3_BUCKET    - S3 bucket for backups"
            exit 1
            ;;
    esac
}

# Handle script interruption
trap 'log_error "Backup interrupted"; exit 1' INT TERM

# Run main function
main "$@"