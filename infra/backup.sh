#!/usr/bin/env bash
# Datascratch backup: PostgreSQL dump + attachment files, kept on this server (copy them off with
# scp/rsync; on a deployed server: /opt/datascratch/ds backup, D-55).
# Usage (from anywhere):  infra/backup.sh
# Daily via cron:         17 3 * * * /opt/datascratch/infra/backup.sh >> /var/log/datascratch-backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")"
[ -f .env ] && set -a && . ./.env && set +a

PGUSER="${POSTGRES_USER:-datascratch}"
PGDB="${POSTGRES_DB:-datascratch}"
DIR="${BACKUP_DIR:-$(pwd)/backups}"
KEEP="${BACKUP_KEEP_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$DIR"

echo "[$(date -u +%FT%TZ)] backup $STAMP → $DIR"

# 1. Database: custom format (compressed, restorable with pg_restore).
docker compose exec -T postgres pg_dump -U "$PGUSER" -d "$PGDB" -Fc --no-owner > "$DIR/db-$STAMP.dump.part"
mv "$DIR/db-$STAMP.dump.part" "$DIR/db-$STAMP.dump"

# 2. Attachment files (already encrypted on the devices). Skipped when they live in S3.
if [ "${STORAGE_DRIVER:-disk}" = "disk" ]; then
  docker compose exec -T server tar -czf - -C /data/files . > "$DIR/files-$STAMP.tar.gz.part"
  mv "$DIR/files-$STAMP.tar.gz.part" "$DIR/files-$STAMP.tar.gz"
fi

# 3. Quick integrity check of the dump.
docker compose exec -T postgres pg_restore --list < "$DIR/db-$STAMP.dump" > /dev/null

# 4. Local retention. Copies off the server are made by the admin (scp/rsync, D-55).
find "$DIR" -maxdepth 1 -type f \( -name 'db-*.dump' -o -name 'files-*.tar.gz' \) -mtime +"$KEEP" -delete

echo "[$(date -u +%FT%TZ)] done"
