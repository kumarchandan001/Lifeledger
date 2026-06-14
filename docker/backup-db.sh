#!/bin/sh
# ═══════════════════════════════════════════════════
# LifeLedger — Automated Database Backup Script
# ═══════════════════════════════════════════════════

# Configuration
BACKUP_DIR="/app/backups"
RETENTION_DAYS=7
DB_NAME=${POSTGRES_DB:-"lifeledger"}
DB_USER=${POSTGRES_USER:-"lifeledger"}
DB_HOST=${POSTGRES_HOST:-"localhost"}
DB_PORT=${POSTGRES_PORT:-5432}
PGPASSWORD=${POSTGRES_PASSWORD:-"lifeledger_dev_2026"}

export PGPASSWORD

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Generate backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/${DB_NAME}_backup_${TIMESTAMP}.sql.gz"

echo "⏳ Starting database backup for '$DB_NAME' at $(date)..."

# Run pg_dump and compress
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" | gzip > "$FILENAME"

if [ $? -eq 0 ]; then
  echo "✅ Backup created successfully: $FILENAME"
  # Print file size
  ls -lh "$FILENAME"
else
  echo "❌ Error: Database backup failed!" >&2
  exit 1
fi

# Clean up backups older than RETENTION_DAYS
echo "🧹 Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "${DB_NAME}_backup_*.sql.gz" -mtime +"$RETENTION_DAYS" -exec rm -f {} \;

echo "🎉 Backup lifecycle complete."
