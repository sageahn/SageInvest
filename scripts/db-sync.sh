#!/bin/bash
# PostgreSQL Database Sync Script for SageInvest
# Usage: ./scripts/db-sync.sh [push|pull|status]
#
# push: Export local DB to backup file
# pull: Import backup file to local DB
# status: Show backup file info
#
# Prerequisites:
# - Docker PostgreSQL container running
# - pg_dump and psql available (or via docker exec)
#
# Setup:
# 1. Create .db-backups directory (auto-created)
# 2. Sync .db-backups via Git LFS, Dropbox, iCloud, etc.

set -e

# Configuration
BACKUP_DIR=".db-backups"
BACKUP_FILE="sageinvest-sync.dump"
CONTAINER_NAME="${DB_CONTAINER:-postgres}"  # Default container name
DB_NAME="${DB_NAME:-sageinvest}"
DB_USER="${DB_USER:-postgres}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker container is running
check_container() {
    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        print_error "Docker container '${CONTAINER_NAME}' is not running"
        print_info "Available containers:"
        docker ps --format '  - {{.Names}} ({{.Image}})'
        exit 1
    fi
}

# Create backup directory if not exists
ensure_backup_dir() {
    mkdir -p "$BACKUP_DIR"
}

# Get backup file path
get_backup_path() {
    echo "$BACKUP_DIR/$BACKUP_FILE"
}

# Push: Export DB to backup file
do_push() {
    print_info "Exporting database to backup file..."
    ensure_backup_dir
    check_container

    BACKUP_PATH=$(get_backup_path)

    # Create timestamped backup first
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    TIMESTAMPED_BACKUP="$BACKUP_DIR/sageinvest-${TIMESTAMP}.dump"

    print_info "Creating timestamped backup: $TIMESTAMPED_BACKUP"
    docker exec -i "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" -F c -f "/tmp/sync.dump"

    # Copy from container to host
    docker cp "${CONTAINER_NAME}:/tmp/sync.dump" "$TIMESTAMPED_BACKUP"
    docker cp "${CONTAINER_NAME}:/tmp/sync.dump" "$BACKUP_PATH"

    # Cleanup temp file in container
    docker exec "$CONTAINER_NAME" rm -f /tmp/sync.dump

    # Get file size
    FILE_SIZE=$(ls -lh "$BACKUP_PATH" | awk '{print $5}')

    print_info "Backup created successfully!"
    echo ""
    echo "  File: $BACKUP_PATH"
    echo "  Size: $FILE_SIZE"
    echo "  Timestamped: $TIMESTAMPED_BACKUP"
    echo ""
    print_info "To sync to another machine:"
    echo "  1. Commit .db-backups/ to Git, OR"
    echo "  2. Copy .db-backups/ via cloud storage"
    echo ""

    # Keep only last 5 timestamped backups
    cd "$BACKUP_DIR"
    ls -t sageinvest-*.dump 2>/dev/null | tail -n +6 | xargs -r rm -f
    print_info "Old backups cleaned (keeping last 5)"
}

# Pull: Import backup file to DB
do_pull() {
    ensure_backup_dir
    check_container

    BACKUP_PATH=$(get_backup_path)

    if [ ! -f "$BACKUP_PATH" ]; then
        print_error "Backup file not found: $BACKUP_PATH"
        print_info "Run './scripts/db-sync.sh push' on the source machine first"
        exit 1
    fi

    FILE_SIZE=$(ls -lh "$BACKUP_PATH" | awk '{print $5}')
    FILE_DATE=$(ls -l "$BACKUP_PATH" | awk '{print $6, $7, $8}')

    print_warn "This will REPLACE your local database!"
    echo ""
    echo "  Backup file: $BACKUP_PATH"
    echo "  Size: $FILE_SIZE"
    echo "  Date: $FILE_DATE"
    echo ""
    read -p "Continue? (y/N) " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Aborted"
        exit 0
    fi

    print_info "Importing database from backup file..."

    # Copy backup to container
    docker cp "$BACKUP_PATH" "${CONTAINER_NAME}:/tmp/sync.dump"

    # Drop existing connections and recreate DB
    docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" 2>/dev/null || true

    docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c \
        "DROP DATABASE IF EXISTS $DB_NAME;"

    docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c \
        "CREATE DATABASE $DB_NAME;"

    # Restore from backup
    docker exec -i "$CONTAINER_NAME" pg_restore -U "$DB_USER" -d "$DB_NAME" -v /tmp/sync.dump 2>&1 | grep -E "(processing|creating|loading)" || true

    # Cleanup
    docker exec "$CONTAINER_NAME" rm -f /tmp/sync.dump

    print_info "Database imported successfully!"
}

# Status: Show backup info
do_status() {
    ensure_backup_dir

    BACKUP_PATH=$(get_backup_path)

    echo "Database Sync Status"
    echo "==================="
    echo ""

    if [ -f "$BACKUP_PATH" ]; then
        FILE_SIZE=$(ls -lh "$BACKUP_PATH" | awk '{print $5}')
        FILE_DATE=$(ls -l "$BACKUP_PATH" | awk '{print $6, $7, $8}')
        echo "Current sync file:"
        echo "  Path: $BACKUP_PATH"
        echo "  Size: $FILE_SIZE"
        echo "  Date: $FILE_DATE"
    else
        echo "No sync file found"
    fi

    echo ""
    echo "Available backups:"
    ls -lht "$BACKUP_DIR"/*.dump 2>/dev/null | head -10 || echo "  (none)"

    echo ""
    echo "Docker container:"
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo "  Status: ${GREEN}Running${NC}"
        docker ps --filter "name=^${CONTAINER_NAME}$" --format "  Container: {{.Names}} ({{.Image}})"
    else
        echo "  Status: ${RED}Not running${NC}"
    fi
}

# Main
case "${1:-}" in
    push)
        do_push
        ;;
    pull)
        do_pull
        ;;
    status)
        do_status
        ;;
    *)
        echo "Usage: $0 {push|pull|status}"
        echo ""
        echo "Commands:"
        echo "  push   - Export local DB to .db-backups/sageinvest-sync.dump"
        echo "  pull   - Import from .db-backups/sageinvest-sync.dump to local DB"
        echo "  status - Show backup status"
        echo ""
        echo "Environment variables:"
        echo "  DB_CONTAINER  - Docker container name (default: postgres)"
        echo "  DB_NAME       - Database name (default: sageinvest)"
        echo "  DB_USER       - Database user (default: postgres)"
        exit 1
        ;;
esac
