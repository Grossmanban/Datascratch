#!/usr/bin/env bash
# Datascratch backup: PostgreSQL dump + attachment files, kept on this server (copy them off with
# scp/rsync; on a deployed server: /opt/datascratch/ds backup, D-55).
# Usage (from anywhere):  infra/backup.sh
# Daily via cron:         17 3 * * * /opt/datascratch/infra/backup.sh >> /var/log/datascratch-backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")"
# Read only the settings this script needs from .env, without running it as shell code: a value
# with spaces (DS_ADMIN_EMAILS="a@x, b@y") would otherwise run as a command.
if [ -f .env ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      POSTGRES_DB=* | POSTGRES_USER=* | BACKUP_DIR=* | BACKUP_KEEP_DAYS=* | STORAGE_DRIVER=*)
        export "${line%%=*}=${line#*=}" ;;
    esac
  done < .env
fi

PGUSER="${POSTGRES_USER:-datascratch}"
PGDB="${POSTGRES_DB:-datascratch}"
DIR="${BACKUP_DIR:-$(pwd)/backups}"
KEEP="${BACKUP_KEEP_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$DIR"

# Status for the admin screen (spec/06 «Эксплуатация»; the server mounts this directory
# read-only): last-run.json after every run, last-success.json after a good one. Times, sizes
# and the failed step only — no paths, no host.
STATUS="$(pwd)/backup-status"
mkdir -p "$STATUS" 2> /dev/null || true
STEP=start
write_status() { # <file> <json> — best effort: the status never fails a backup
  { printf '%s\n' "$2" > "$STATUS/$1.part" && chmod 644 "$STATUS/$1.part" && mv "$STATUS/$1.part" "$STATUS/$1"; } 2> /dev/null ||
    echo "warning: backup status not written ($STATUS/$1 not writable)" >&2
}
on_error() {
  write_status last-run.json "{\"finishedAt\":\"$(date -u +%FT%TZ)\",\"ok\":false,\"error\":\"$STEP\"}" || true
}
trap on_error ERR

echo "[$(date -u +%FT%TZ)] backup $STAMP → $DIR"

# 1. Database: custom format (compressed, restorable with pg_restore).
STEP=db
docker compose exec -T postgres pg_dump -U "$PGUSER" -d "$PGDB" -Fc --no-owner > "$DIR/db-$STAMP.dump.part"
mv "$DIR/db-$STAMP.dump.part" "$DIR/db-$STAMP.dump"

# 2. Attachment files (already encrypted on the devices). Skipped when they live in S3.
FILES_BYTES=null
if [ "${STORAGE_DRIVER:-disk}" = "disk" ]; then
  STEP=files
  docker compose exec -T server tar -czf - -C /data/files . > "$DIR/files-$STAMP.tar.gz.part"
  mv "$DIR/files-$STAMP.tar.gz.part" "$DIR/files-$STAMP.tar.gz"
  FILES_BYTES=$(stat -c %s "$DIR/files-$STAMP.tar.gz")
fi

# 3. Quick integrity check of the dump.
STEP=check
docker compose exec -T postgres pg_restore --list < "$DIR/db-$STAMP.dump" > /dev/null

# 4. Local retention. Copies off the server are made by the admin (scp/rsync, D-55).
STEP=prune
find "$DIR" -maxdepth 1 -type f \( -name 'db-*.dump' -o -name 'files-*.tar.gz' \) -mtime +"$KEEP" -delete

STEP=status
DONE="$(date -u +%FT%TZ)"
DB_BYTES=$(stat -c %s "$DIR/db-$STAMP.dump")
COUNT=$(find "$DIR" -maxdepth 1 -type f -name 'db-*.dump' | wc -l)
write_status last-success.json "{\"finishedAt\":\"$DONE\",\"dbBytes\":$DB_BYTES,\"filesBytes\":$FILES_BYTES,\"count\":$COUNT}"
write_status last-run.json "{\"finishedAt\":\"$DONE\",\"ok\":true,\"error\":null}"

echo "[$(date -u +%FT%TZ)] done"
