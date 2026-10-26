#!/usr/bin/env bash
# Restore a Datascratch backup made by backup.sh.  DESTROYS the current data.
# Usage:  infra/restore.sh backups/db-20261025T031700Z.dump [backups/files-20261025T031700Z.tar.gz]
set -euo pipefail

cd "$(dirname "$0")"
[ -f .env ] && set -a && . ./.env && set +a

DUMP="${1:?usage: restore.sh <db-*.dump> [files-*.tar.gz]}"
FILES="${2:-}"
PGUSER="${POSTGRES_USER:-datascratch}"
PGDB="${POSTGRES_DB:-datascratch}"

if [ "${RESTORE_YES:-}" != "1" ]; then
  read -r -p "This replaces ALL current data with the backup. Type 'yes' to continue: " answer
  [ "$answer" = "yes" ] || { echo "aborted"; exit 1; }
fi

docker compose up -d postgres
docker compose stop server || true
# Over TCP: the temporary server of the first start (initdb) listens on the socket only.
until docker compose exec -T postgres pg_isready -h 127.0.0.1 -U "$PGUSER" -d "$PGDB" > /dev/null 2>&1; do sleep 1; done

docker compose exec -T postgres psql -U "$PGUSER" -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS \"$PGDB\" WITH (FORCE)" -c "CREATE DATABASE \"$PGDB\"" \
  -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ds_agent') THEN CREATE ROLE ds_agent NOLOGIN; END IF; END \$\$" \
  -c "GRANT ds_agent TO CURRENT_USER"
docker compose exec -T postgres pg_restore -U "$PGUSER" -d "$PGDB" --no-owner --exit-on-error < "$DUMP"

if [ -n "$FILES" ]; then
  docker compose run --rm --no-deps -T --entrypoint sh server -c 'rm -rf /data/files/* && tar -xzf - -C /data/files' < "$FILES"
fi

docker compose up -d server
echo "restored from $DUMP${FILES:+ and $FILES}"
