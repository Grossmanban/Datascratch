#!/usr/bin/env bash
# Memory check of the production stack with the "shared server" limits
# (PostgreSQL 512 MB, server 512 MB, web 128 MB): first sync of N encrypted notes
# (snapshot ~3.5 KB each) over WebSocket, peak memory sampled with docker stats.
#   infra/deploy/test/memory-check.sh            (needs Docker and Node 22; N=10000)
# Env: DS_SERVER_IMAGE / DS_WEB_IMAGE (default datascratch-server / datascratch-web, tag latest),
#      DS_POSTGRES_IMAGE (postgres:16-alpine), N.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="$(mktemp -d)"
N="${N:-10000}"
P=dsmem
cleanup() {
  (cd "$WORK" && docker compose -p "$P" down -v > /dev/null 2>&1) || true
  [ -n "${SAMPLER:-}" ] && kill "$SAMPLER" 2> /dev/null || true
  rm -rf "$WORK"
}
trap cleanup EXIT

cp "$HERE/../docker-compose.yml" "$WORK/"
cat > "$WORK/docker-compose.check.yml" <<'YML'
services:
  server:
    ports: ["127.0.0.1:18080:8080"]
YML
secret() { openssl rand -base64 32 | tr '+/' '-_' | tr -d '=\n'; }
cat > "$WORK/.env" <<ENV
NODE_ENV=production
LOG_LEVEL=warn
POSTGRES_USER=datascratch
POSTGRES_DB=datascratch
POSTGRES_PASSWORD=$(secret)
DS_JWT_SECRET=$(secret)
DS_KMS_KEY=$(secret)
DS_TAG=latest
DS_DOMAIN=localhost
DS_SITE=http://:80
DS_SERVER_IMAGE=${DS_SERVER_IMAGE:-datascratch-server}
DS_WEB_IMAGE=${DS_WEB_IMAGE:-datascratch-web}
DS_POSTGRES_IMAGE=${DS_POSTGRES_IMAGE:-postgres:16-alpine}
DS_PORT_HTTP=127.0.0.1:0:80
DS_PORT_HTTPS=127.0.0.1:0:443
DS_PORT_HTTPS_UDP=127.0.0.1:0:443/udp
DS_MEM_POSTGRES=512m
DS_PG_SHARED_BUFFERS=128MB
DS_PG_CACHE_SIZE=384MB
DS_MEM_SERVER=512m
DS_NODE_HEAP_MB=384
DS_MEM_CADDY=128m
ENV
cd "$WORK"
dc() { docker compose -p "$P" -f docker-compose.yml -f docker-compose.check.yml "$@"; }
dc up -d --wait > /dev/null
for _ in $(seq 1 60); do curl -fs http://127.0.0.1:18080/v1/health > /dev/null && break; sleep 1; done

# Sample memory of every container of the project every 0.5 s.
mapfile -t containers < <(dc ps -q)
(while :; do docker stats --no-stream --format '{{.Name}} {{.MemUsage}}' "${containers[@]}" 2> /dev/null; sleep 0.5; done) > "$WORK/stats.log" &
SAMPLER=$!

# Account + notebook over the API, N notes with a ~3.5 KB snapshot each straight into the DB.
node "$HERE/memory-load.mjs" setup http://127.0.0.1:18080 > "$WORK/account.json"
uid=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).userId)' "$WORK/account.json")
nb=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).notebookId)' "$WORK/account.json")
node "$HERE/memory-load.mjs" ids "$N" > "$WORK/ids.txt"
{
  echo "CREATE TEMP TABLE ids (id uuid);"
  echo "COPY ids FROM STDIN;"
  cat "$WORK/ids.txt"
  printf '\\.\n'
  echo "INSERT INTO docs (id, user_id, kind, notebook_id, last_seq, snapshot_seq) SELECT id, '$uid', 'note', '$nb', 1, 1 FROM ids;"
  echo "INSERT INTO doc_snapshots (doc_id, seq, payload, device_id) SELECT id, 1, decode(repeat(md5(random()::text), 110), 'hex') || decode(repeat(md5(random()::text), 110), 'hex'), 'seed' FROM ids;"
} | dc exec -T postgres psql -q -U datascratch -d datascratch -v ON_ERROR_STOP=1 > /dev/null
echo "seeded $(wc -l < "$WORK/ids.txt") notes"
node "$HERE/memory-load.mjs" sync http://127.0.0.1:18080 "$WORK/account.json" "$WORK/ids.txt"

kill "$SAMPLER" 2> /dev/null || true
SAMPLER=""
echo
echo "Peak memory (limit: postgres 512 MiB, server 512 MiB, web 128 MiB):"
awk '{
  v=$2; u=v; sub(/[0-9.]+/, "", u); sub(/[A-Za-z]+/, "", v);
  m = (u ~ /GiB/) ? v*1024 : (u ~ /KiB|kB/) ? v/1024 : v;
  if (m > peak[$1]) peak[$1] = m
} END { for (c in peak) printf "  %-28s %6.0f MiB\n", c, peak[c] }' "$WORK/stats.log" | sort
oom=$(docker inspect -f '{{.Name}} {{.State.OOMKilled}} {{.RestartCount}}' "${containers[@]}" | awk '$2=="true" || $3>0')
[ -z "$oom" ] || { echo "OOM or restarts: $oom" >&2; exit 1; }
echo "no container was OOM-killed or restarted"
