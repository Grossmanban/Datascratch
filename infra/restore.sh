#!/usr/bin/env bash
# Restore a Datascratch backup made by backup.sh.  REPLACES the current data.
# Usage:  infra/restore.sh backups/db-20261025T031700Z.dump [backups/files-20261025T031700Z.tar.gz]
# Before anything is dropped, the backup is checked (pg_restore --list, tar -t) and the
# current database (and files, when they are restored too) is saved to
# backups/pre-restore-<time>.* so that a wrong restore can be undone.
set -euo pipefail

cd "$(dirname "$0")"
[ -f .env ] && set -a && . ./.env && set +a

DUMP="${1:?usage: restore.sh <db-*.dump> [files-*.tar.gz]}"
FILES="${2:-}"
PGUSER="${POSTGRES_USER:-datascratch}"
PGDB="${POSTGRES_DB:-datascratch}"
DIR="${BACKUP_DIR:-$(pwd)/backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
[ -f "$DUMP" ] || { echo "no such file: $DUMP" >&2; exit 1; }
[ -z "$FILES" ] || [ -f "$FILES" ] || { echo "no such file: $FILES" >&2; exit 1; }

if [ "${RESTORE_YES:-}" != "1" ]; then
  read -r -p "This replaces ALL current data with the backup. Type 'yes' to continue: " answer
  [ "$answer" = "yes" ] || { echo "aborted"; exit 1; }
fi

docker compose up -d postgres
docker compose stop server || true
# Over TCP: the temporary server of the first start (initdb) listens on the socket only.
until docker compose exec -T postgres pg_isready -h 127.0.0.1 -U "$PGUSER" -d "$PGDB" > /dev/null 2>&1; do sleep 1; done

# 1. The backup must be readable before anything is dropped.
docker compose exec -T postgres pg_restore --list < "$DUMP" > /dev/null || { echo "$DUMP is not a readable dump; nothing was changed" >&2; exit 1; }
if [ -n "$FILES" ]; then
  tar -tzf "$FILES" > /dev/null || { echo "$FILES is not a readable archive; nothing was changed" >&2; exit 1; }
fi

# 2. Keep what is there now.
mkdir -p "$DIR"
docker compose exec -T postgres pg_dump -U "$PGUSER" -d "$PGDB" -Fc --no-owner > "$DIR/pre-restore-$STAMP.dump.part"
mv "$DIR/pre-restore-$STAMP.dump.part" "$DIR/pre-restore-$STAMP.dump"
if [ -n "$FILES" ]; then
  docker compose run --rm --no-deps -T --entrypoint sh server -c 'tar -czf - -C /data/files .' > "$DIR/pre-restore-files-$STAMP.tar.gz.part"
  mv "$DIR/pre-restore-files-$STAMP.tar.gz.part" "$DIR/pre-restore-files-$STAMP.tar.gz"
fi
echo "current data saved to $DIR/pre-restore-$STAMP.*"

# 3. Replace.
docker compose exec -T postgres psql -U "$PGUSER" -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS \"$PGDB\" WITH (FORCE)" -c "CREATE DATABASE \"$PGDB\"" \
  -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ds_agent') THEN CREATE ROLE ds_agent NOLOGIN; END IF; END \$\$" \
  -c "GRANT ds_agent TO CURRENT_USER"
docker compose exec -T postgres pg_restore -U "$PGUSER" -d "$PGDB" --no-owner --exit-on-error < "$DUMP"

if [ -n "$FILES" ]; then
  # find -delete also removes dotfiles, which /data/files/* would leave behind.
  docker compose run --rm --no-deps -T --entrypoint sh server -c 'find /data/files -mindepth 1 -delete && tar -xzf - -C /data/files' < "$FILES"
fi

docker compose up -d server
echo "restored from $DUMP${FILES:+ and $FILES}"
