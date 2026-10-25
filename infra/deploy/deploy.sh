#!/usr/bin/env bash
# Runs on the server (as root) from /opt/datascratch.
#   deploy.sh up <tag>     pull images, migrate the database, start, wait until healthy
#   deploy.sh rollback     start the previously deployed tag again
#   deploy.sh status       print the current tag and container states
# Environment for `up`: DS_DOMAIN, DS_SERVER_IMAGE, DS_WEB_IMAGE, DS_POSTGRES_IMAGE (all GHCR); optional
# DS_REGISTRY_USER + registry token on stdin (GHCR login for the pull only).
set -euo pipefail
cd "$(dirname "$0")"

log() { echo "[deploy] $*"; }
HISTORY=.deploy-tags
BEGIN='# >>> managed by deploy.sh (do not edit)'
END='# <<< managed by deploy.sh'

# Rewrite the managed block of .env (non-secret settings); secrets stay untouched.
write_managed() {
  local tmp
  tmp=$(mktemp)
  awk -v b="$BEGIN" -v e="$END" '$0==b{skip=1;next} $0==e{skip=0;next} !skip' .env > "$tmp"
  {
    cat "$tmp"
    echo "$BEGIN"
    echo "DS_TAG=$1"
    echo "DS_DOMAIN=$2"
    echo "DS_SERVER_IMAGE=$3"
    echo "DS_WEB_IMAGE=$4"
    echo "DS_POSTGRES_IMAGE=$5"
    echo "$END"
  } > .env.new
  rm -f "$tmp"
  chmod 600 .env.new
  mv .env.new .env
}

current() { grep -E '^DS_(TAG|DOMAIN|SERVER_IMAGE|WEB_IMAGE|POSTGRES_IMAGE)=' .env 2>/dev/null | sed -n "s/^$1=//p" | tail -1; }

wait_healthy() {
  for _ in $(seq 1 90); do
    state=$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q server)" 2>/dev/null || echo starting)
    [ "$state" = "healthy" ] && return 0
    sleep 2
  done
  docker compose logs --tail 80 server >&2 || true
  return 1
}

# Every step checks its result explicitly: `set -e` does not apply inside `if start`.
start() {
  docker compose up -d --wait postgres || return 1
  # Explicit migration step: a failing migration stops the deploy before the switch.
  docker compose run --rm --no-deps -T server node dist/db/migrate-cli.js || return 1
  docker compose up -d --remove-orphans || return 1
  wait_healthy
}

case "${1:-}" in
  up)
    tag="${2:?usage: deploy.sh up <tag>}"
    domain="${DS_DOMAIN:?DS_DOMAIN is required}"
    srv="${DS_SERVER_IMAGE:?}"
    web="${DS_WEB_IMAGE:?}"
    pg="${DS_POSTGRES_IMAGE:?}"
    if [ -n "${DS_REGISTRY_USER:-}" ]; then
      # The short-lived workflow token arrives on stdin; it is used for this pull only.
      docker login ghcr.io -u "$DS_REGISTRY_USER" --password-stdin > /dev/null
    fi
    for img in "$srv:$tag" "$web:$tag" "$pg"; do
      docker image inspect "$img" > /dev/null 2>&1 || docker pull -q "$img"
    done
    [ -n "${DS_REGISTRY_USER:-}" ] && docker logout ghcr.io > /dev/null 2>&1 || true
    prev=$(current DS_TAG || true)
    write_managed "$tag" "$domain" "$srv" "$web" "$pg"
    if start; then
      { [ -n "$prev" ] && [ "$prev" != "$tag" ] && echo "$prev"; echo "$tag"; } >> "$HISTORY"
      tail -n 10 "$HISTORY" | tac | awk '!seen[$0]++' | tac > "$HISTORY.tmp" && mv "$HISTORY.tmp" "$HISTORY"
      log "running $tag on https://$domain"
    else
      log "new version did not become healthy"
      if [ -n "$prev" ] && [ "$prev" != "$tag" ]; then
        log "rolling back to $prev"
        write_managed "$prev" "$domain" "$srv" "$web" "$pg"
        start || true
      fi
      exit 1
    fi
    ;;
  rollback)
    tag=$(current DS_TAG)
    prev=$(grep -vxF "$tag" "$HISTORY" 2>/dev/null | tail -1 || true)
    [ -n "$prev" ] || { log "no previous version to roll back to"; exit 1; }
    log "rolling back $tag -> $prev"
    write_managed "$prev" "$(current DS_DOMAIN)" "$(current DS_SERVER_IMAGE)" "$(current DS_WEB_IMAGE)" "$(current DS_POSTGRES_IMAGE)"
    grep -vxF "$tag" "$HISTORY" > "$HISTORY.tmp" || true
    mv "$HISTORY.tmp" "$HISTORY"
    start
    log "running $prev"
    ;;
  status)
    echo "tag: $(current DS_TAG)"
    echo "domain: $(current DS_DOMAIN)"
    docker compose ps
    ;;
  *)
    echo "usage: deploy.sh up <tag> | rollback | status" >&2
    exit 2
    ;;
esac
