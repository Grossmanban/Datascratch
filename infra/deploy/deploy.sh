#!/usr/bin/env bash
# Runs on the server (as root) from /opt/datascratch.
#   deploy.sh up <tag>     pull images, migrate the database, start, wait until healthy
#   deploy.sh rollback     start the previously deployed tag again
#   deploy.sh status       print the current tag, mode and container states
#   deploy.sh info         print the mode (key=value) and, behind a proxy, its config snippet
#
# Environment for `up`: DS_DOMAIN, DS_SERVER_IMAGE, DS_WEB_IMAGE, DS_POSTGRES_IMAGE (all GHCR);
# optional DS_REGISTRY_USER + registry token on stdin (GHCR login for the pull only);
# DS_DEPLOY_MODE (auto | standalone | behind-proxy), DS_PROXY_PORT (8480), DS_NGINX_AUTO=true
# (add a site to an existing nginx, with backup and `nginx -t`), DS_NGINX_CERTBOT=true
# (then run certbot for it), DS_MEM_PROFILE (auto | full | shared);
# behind another app's Caddy ("edge" mode): DS_EDGE_CADDY (sinhron-caddy),
# DS_EDGE_SITES_DIR (/etc/sinhron/caddy-sites), DS_EDGE_NETWORK (edge).
#
# Modes: direct — our Caddy on 80/443; edge — the other app's Caddy imports our site
# file and reaches datascratch-web:80 over the `edge` network; proxy — any other
# reverse proxy reaches 127.0.0.1:<DS_PROXY_PORT>.
#
# Only Datascratch's own compose project ("datascratch") is touched: no prune, no
# changes to other containers, networks or volumes.
set -euo pipefail
cd "$(dirname "$0")"

log() { echo "[deploy] $*"; }
HISTORY=.deploy-tags
BEGIN='# >>> managed by deploy.sh (do not edit)'
END='# <<< managed by deploy.sh'
MANAGED_KEYS='COMPOSE_FILE|DS_TAG|DS_DOMAIN|DS_SERVER_IMAGE|DS_WEB_IMAGE|DS_POSTGRES_IMAGE|DS_MODE|DS_SITE|DS_PORT_HTTP|DS_PORT_HTTPS|DS_PORT_HTTPS_UDP|DS_PROXY_PORT|DS_MEM_POSTGRES|DS_MEM_SERVER|DS_MEM_CADDY|DS_NODE_HEAP_MB|DS_PG_SHARED_BUFFERS|DS_PG_CACHE_SIZE'
export COMPOSE_PROJECT_NAME=datascratch

current() { grep -E "^($MANAGED_KEYS)=" .env 2> /dev/null | sed -n "s/^$1=//p" | tail -1; }
[ -f .host-profile ] && . ./.host-profile

# Rewrite the managed block of .env (non-secret settings); secrets stay untouched.
# Arguments: KEY=VALUE ...
write_managed() {
  local tmp
  tmp=$(mktemp)
  awk -v b="$BEGIN" -v e="$END" '$0==b{skip=1;next} $0==e{skip=0;next} !skip' .env > "$tmp"
  { cat "$tmp"; echo "$BEGIN"; printf '%s\n' "$@"; echo "$END"; } > .env.new
  rm -f "$tmp"
  chmod 600 .env.new
  mv .env.new .env
}

# The managed block for a tag, keeping mode/ports/memory chosen at `up` time.
managed_for() {
  local tag="$1"
  echo "DS_TAG=$tag"
  for k in COMPOSE_FILE DS_DOMAIN DS_SERVER_IMAGE DS_WEB_IMAGE DS_POSTGRES_IMAGE DS_MODE DS_SITE DS_PORT_HTTP DS_PORT_HTTPS \
    DS_PORT_HTTPS_UDP DS_PROXY_PORT DS_MEM_POSTGRES DS_MEM_SERVER DS_MEM_CADDY DS_NODE_HEAP_MB DS_PG_SHARED_BUFFERS DS_PG_CACHE_SIZE; do
    echo "$k=${!k:-$(current "$k")}"
  done
}

port_busy() { ss -H -ltn "sport = :$1" 2> /dev/null | grep -q .; }
ours_on_443() { docker ps --filter name='^datascratch-web$' --format '{{.Ports}}' 2> /dev/null | grep -q ':443->'; }

EDGE_CADDY="${DS_EDGE_CADDY:-sinhron-caddy}"
EDGE_DIR="${DS_EDGE_SITES_DIR:-/etc/sinhron/caddy-sites}"
EDGE_NET="${DS_EDGE_NETWORK:-edge}"
EDGE_CADDYFILE=/etc/caddy/Caddyfile
edge_present() { docker ps --filter "name=^${EDGE_CADDY}\$" --format '{{.Names}}' 2> /dev/null | grep -qx "$EDGE_CADDY"; }

# Is the other app's Caddy ready to import our site? Prints what is missing.
edge_missing() {
  local missing=()
  docker exec "$EDGE_CADDY" cat "$EDGE_CADDYFILE" 2> /dev/null | grep -Eq '^[[:space:]]*import[[:space:]]+/etc/caddy/sites/\*\.caddy' \
    || missing+=("import /etc/caddy/sites/*.caddy in its Caddyfile")
  docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$EDGE_CADDY" 2> /dev/null | grep -qw "$EDGE_NET" \
    || missing+=("membership in the '$EDGE_NET' docker network")
  [ -d "$EDGE_DIR" ] || missing+=("the folder $EDGE_DIR mounted at /etc/caddy/sites")
  printf '%s\n' "${missing[@]}"
}

choose_mode() {
  local want="${DS_DEPLOY_MODE:-auto}"
  case "$want" in
    standalone) echo direct; return ;;
    behind-proxy) edge_present && echo edge || echo proxy; return ;;
  esac
  if edge_present; then echo edge
  elif { port_busy 80 || port_busy 443; } && ! ours_on_443; then echo proxy
  else echo direct
  fi
}

# Add our site to the other app's Caddy: validate first; on any failure our file is
# removed (a broken file would stop that Caddy from starting on its next restart).
edge_install_site() {
  local domain="$1" file="$EDGE_DIR/datascratch.caddy" backup=""
  [ -f "$file" ] && backup=$(mktemp) && cp -p "$file" "$backup"
  cat > "$file.new" <<SITE
# Managed by Datascratch (/opt/datascratch/deploy.sh). Do not edit: it is rewritten on deploy.
# Datascratch sends its own security headers; Sinhron's are intentionally not imported here.
$domain {
	encode zstd gzip
	reverse_proxy datascratch-web:80 {
		# Keep sync WebSockets open across reloads of this Caddy.
		stream_close_delay 5m
	}
}
SITE
  chmod 644 "$file.new"
  mv "$file.new" "$file"
  restore() {
    if [ -n "$backup" ]; then mv "$backup" "$file"; else rm -f "$file"; fi
  }
  if ! docker exec "$EDGE_CADDY" caddy validate --config "$EDGE_CADDYFILE" > /tmp/ds-caddy-validate.log 2>&1; then
    log "$EDGE_CADDY rejected the Datascratch site — removing it again"
    tail -5 /tmp/ds-caddy-validate.log >&2 || true
    restore
    return 1
  fi
  if ! docker exec "$EDGE_CADDY" caddy reload --config "$EDGE_CADDYFILE" > /tmp/ds-caddy-reload.log 2>&1; then
    log "$EDGE_CADDY reload failed — restoring the previous site file"
    tail -5 /tmp/ds-caddy-reload.log >&2 || true
    restore
    docker exec "$EDGE_CADDY" caddy reload --config "$EDGE_CADDYFILE" > /dev/null 2>&1 || true
    return 1
  fi
  [ -n "$backup" ] && rm -f "$backup"
  log "$EDGE_CADDY now serves https://$domain → datascratch-web:80"
}

# Memory for a 4 GB VPS; smaller when other apps share the server.
choose_memory() {
  local profile="${DS_MEM_PROFILE:-auto}"
  [ "$profile" = auto ] && profile=$([ "${HOST_SHARED:-0}" = 1 ] && echo shared || echo full)
  if [ "$profile" = shared ]; then
    # Next to another app (e.g. Sinhron: ~1–1.5 GB) on a 4 GB VPS.
    DS_MEM_POSTGRES=512m DS_PG_SHARED_BUFFERS=128MB DS_PG_CACHE_SIZE=384MB DS_MEM_SERVER=512m DS_NODE_HEAP_MB=384 DS_MEM_CADDY=128m
  else
    DS_MEM_POSTGRES=1g DS_PG_SHARED_BUFFERS=256MB DS_PG_CACHE_SIZE=1GB DS_MEM_SERVER=1g DS_NODE_HEAP_MB=768 DS_MEM_CADDY=256m
  fi
  export DS_MEM_POSTGRES DS_PG_SHARED_BUFFERS DS_PG_CACHE_SIZE DS_MEM_SERVER DS_NODE_HEAP_MB DS_MEM_CADDY
  log "memory profile: $profile (postgres $DS_MEM_POSTGRES, server $DS_MEM_SERVER, web $DS_MEM_CADDY)"
}

# Config snippets for an existing reverse proxy (behind-proxy mode).
write_snippets() {
  local domain="$1" port="$2" listen6=""
  # IPv6 listen only where the host has IPv6 (nginx -t fails otherwise).
  [ -s /proc/net/if_inet6 ] && listen6="    listen [::]:80;"
  install -d -m 0755 proxy
  cat > proxy/nginx.conf <<NGINX
# Datascratch behind nginx. Save as /etc/nginx/sites-available/datascratch.conf,
# link it into sites-enabled, then:  nginx -t && systemctl reload nginx
# HTTPS for the domain (if nginx does not have it yet):  certbot --nginx -d $domain
map \$http_upgrade \$datascratch_connection {
    default upgrade;
    ''      close;
}
server {
    listen 80;
$listen6
    server_name $domain;
    client_max_body_size 64m;

    location / {
        proxy_pass http://127.0.0.1:$port;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        # The client address as nginx sees it; a client-supplied X-Forwarded-For is dropped.
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        # WebSocket (sync) and long-lived connections.
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$datascratch_connection;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_buffering off;
    }
}
NGINX
  cat > proxy/Caddyfile <<CADDY
# Datascratch behind an existing Caddy: add to its Caddyfile, then: caddy reload
$domain {
	reverse_proxy 127.0.0.1:$port
}
CADDY
  cat > proxy/traefik.yml <<TRAEFIK
# Datascratch behind Traefik (file provider). If Traefik runs in Docker, replace
# 127.0.0.1 with the host address reachable from it (e.g. host.docker.internal or 172.17.0.1).
http:
  routers:
    datascratch:
      rule: "Host(\`$domain\`)"
      service: datascratch
      tls:
        certResolver: letsencrypt
  services:
    datascratch:
      loadBalancer:
        servers:
          - url: "http://127.0.0.1:$port"
TRAEFIK
}

# Opt-in: add the site to an existing nginx (backup + nginx -t, restored on failure).
nginx_auto() {
  local domain="$1" dir target backup="" stamp
  command -v nginx > /dev/null 2>&1 || { log "DS_NGINX_AUTO: nginx is not installed — skipped"; return 0; }
  if [ -d /etc/nginx/sites-available ]; then dir=/etc/nginx/sites-available; else dir=/etc/nginx/conf.d; fi
  target="$dir/datascratch.conf"
  stamp=$(date -u +%Y%m%dT%H%M%SZ)
  if [ -f "$target" ]; then
    backup="$target.bak.$stamp"
    cp -p "$target" "$backup"
  fi
  install -m 0644 proxy/nginx.conf "$target"
  [ "$dir" = /etc/nginx/sites-available ] && ln -sf "$target" /etc/nginx/sites-enabled/datascratch.conf
  if nginx -t > /dev/null 2>&1; then
    (systemctl reload nginx 2> /dev/null || nginx -s reload) && log "nginx: site $domain added ($target)${backup:+, previous version saved as $backup}"
  else
    log "nginx -t failed with the Datascratch site — restoring the previous configuration"
    nginx -t 2>&1 | tail -5 >&2 || true
    if [ -n "$backup" ]; then mv "$backup" "$target"; else rm -f "$target" /etc/nginx/sites-enabled/datascratch.conf; fi
    return 1
  fi
  if [ "${DS_NGINX_CERTBOT:-false}" = true ] && command -v certbot > /dev/null 2>&1; then
    certbot --nginx -d "$domain" --non-interactive --agree-tos --register-unsafely-without-email --redirect \
      && log "nginx: HTTPS certificate for $domain obtained by certbot" \
      || log "WARNING: certbot could not obtain a certificate for $domain"
  fi
}

wait_healthy() {
  for _ in $(seq 1 90); do
    state=$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q server)" 2> /dev/null || echo starting)
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
    DS_DOMAIN="${DS_DOMAIN:?DS_DOMAIN is required}"
    : "${DS_SERVER_IMAGE:?}" "${DS_WEB_IMAGE:?}" "${DS_POSTGRES_IMAGE:?}"
    export DS_DOMAIN DS_SERVER_IMAGE DS_WEB_IMAGE DS_POSTGRES_IMAGE

    DS_MODE=$(choose_mode)
    DS_PROXY_PORT="${DS_PROXY_PORT:-8480}"
    COMPOSE_FILE=docker-compose.yml
    if [ "$DS_MODE" = edge ]; then
      gaps=$(edge_missing)
      if [ -n "$gaps" ]; then
        log "$EDGE_CADDY is running but is not ready for neighbours. Missing:"
        sed 's/^/  - /' <<< "$gaps" >&2
        log "Update Sinhron first (its owner: sudo bash /opt/sinhron/server/install.sh --yes --no-upgrade), then deploy again."
        exit 1
      fi
      docker network inspect "$EDGE_NET" > /dev/null 2>&1 || docker network create "$EDGE_NET" > /dev/null
      COMPOSE_FILE=docker-compose.yml:docker-compose.edge.yml
      DS_SITE="http://:80" DS_PORT_HTTP=127.0.0.1:0:80 DS_PORT_HTTPS=127.0.0.1:0:443 DS_PORT_HTTPS_UDP=127.0.0.1:0:443/udp
      log "mode: behind $EDGE_CADDY — it serves https://$DS_DOMAIN and reaches datascratch-web:80 over the '$EDGE_NET' network"
    elif [ "$DS_MODE" = direct ]; then
      if [ "${UFW_ACTIVE:-0}" = 1 ] && [ "${UFW_WEB_ALLOWED:-1}" = 0 ]; then
        log "ufw is active and does not allow ports 80/443. Datascratch does not change the firewall."
        log "Allow them yourself (ufw allow 80/tcp && ufw allow 443/tcp) or deploy behind your proxy (repository variable DEPLOY_MODE=behind-proxy)."
        exit 1
      fi
      DS_SITE="$DS_DOMAIN" DS_PORT_HTTP=80:80 DS_PORT_HTTPS=443:443 DS_PORT_HTTPS_UDP=443:443/udp
      log "mode: direct — Caddy serves https://$DS_DOMAIN on ports 80/443"
    else
      if port_busy "$DS_PROXY_PORT" && ! docker ps --filter name='^datascratch-web$' --format '{{.Ports}}' | grep -q "127.0.0.1:$DS_PROXY_PORT->"; then
        log "port $DS_PROXY_PORT is taken; set DS_PROXY_PORT to a free port"
        exit 1
      fi
      DS_SITE="http://:8480"
      DS_PORT_HTTP="127.0.0.1:$DS_PROXY_PORT:8480"
      DS_PORT_HTTPS="127.0.0.1:$((DS_PROXY_PORT + 1)):443"
      DS_PORT_HTTPS_UDP="127.0.0.1:$((DS_PROXY_PORT + 1)):443/udp"
      log "mode: behind your existing proxy — Datascratch listens on 127.0.0.1:$DS_PROXY_PORT only (ports 80/443 are in use)"
    fi
    export COMPOSE_FILE DS_MODE DS_SITE DS_PORT_HTTP DS_PORT_HTTPS DS_PORT_HTTPS_UDP DS_PROXY_PORT
    choose_memory

    if [ -n "${DS_REGISTRY_USER:-}" ]; then
      # The short-lived workflow token arrives on stdin; it is used for this pull only.
      docker login ghcr.io -u "$DS_REGISTRY_USER" --password-stdin > /dev/null
    fi
    for img in "$DS_SERVER_IMAGE:$tag" "$DS_WEB_IMAGE:$tag" "$DS_POSTGRES_IMAGE"; do
      docker image inspect "$img" > /dev/null 2>&1 || docker pull -q "$img"
    done
    [ -n "${DS_REGISTRY_USER:-}" ] && docker logout ghcr.io > /dev/null 2>&1 || true

    prev=$(current DS_TAG || true)
    mapfile -t block < <(managed_for "$tag")
    write_managed "${block[@]}"
    if start; then
      { [ -n "$prev" ] && [ "$prev" != "$tag" ] && echo "$prev"; echo "$tag"; } >> "$HISTORY"
      tail -n 10 "$HISTORY" | tac | awk '!seen[$0]++' | tac > "$HISTORY.tmp" && mv "$HISTORY.tmp" "$HISTORY"
      if [ "$DS_MODE" = edge ]; then
        edge_install_site "$DS_DOMAIN" || { log "Datascratch runs, but $EDGE_CADDY does not serve it yet"; exit 1; }
      elif [ "$DS_MODE" = proxy ]; then
        write_snippets "$DS_DOMAIN" "$DS_PROXY_PORT"
        if [ "${DS_NGINX_AUTO:-false}" = true ]; then
          nginx_auto "$DS_DOMAIN" || log "WARNING: the nginx site was not added; use $(pwd)/proxy/nginx.conf manually"
        else
          log "connect your proxy to 127.0.0.1:$DS_PROXY_PORT — ready configs: $(pwd)/proxy/{nginx.conf,Caddyfile,traefik.yml}"
        fi
      else
        rm -rf proxy
      fi
      # Left another app's Caddy? Remove our site there (it would point nowhere).
      if [ "$DS_MODE" != edge ] && [ -f "$EDGE_DIR/datascratch.caddy" ] && edge_present; then
        rm -f "$EDGE_DIR/datascratch.caddy"
        docker exec "$EDGE_CADDY" caddy reload --config "$EDGE_CADDYFILE" > /dev/null 2>&1 || true
      fi
      log "running $tag ($DS_MODE) for https://$DS_DOMAIN"
    else
      log "new version did not become healthy"
      if [ -n "$prev" ] && [ "$prev" != "$tag" ]; then
        log "rolling back to $prev"
        mapfile -t block < <(managed_for "$prev")
        write_managed "${block[@]}"
        start || true
      fi
      exit 1
    fi
    ;;
  rollback)
    tag=$(current DS_TAG)
    prev=$(grep -vxF "$tag" "$HISTORY" 2> /dev/null | tail -1 || true)
    [ -n "$prev" ] || { log "no previous version to roll back to"; exit 1; }
    log "rolling back $tag -> $prev"
    mapfile -t block < <(managed_for "$prev")
    write_managed "${block[@]}"
    grep -vxF "$tag" "$HISTORY" > "$HISTORY.tmp" || true
    mv "$HISTORY.tmp" "$HISTORY"
    start
    log "running $prev"
    ;;
  status)
    echo "tag: $(current DS_TAG)"
    echo "mode: $(current DS_MODE)"
    echo "domain: $(current DS_DOMAIN)"
    docker compose ps
    ;;
  info)
    echo "DS_MODE=$(current DS_MODE)"
    echo "DS_DOMAIN=$(current DS_DOMAIN)"
    echo "DS_PROXY_PORT=$(current DS_PROXY_PORT)"
    echo "DS_TAG=$(current DS_TAG)"
    ;;
  check)
    # Datascratch itself answers inside its web container (used in edge mode).
    docker exec datascratch-web wget -qO- http://127.0.0.1/v1/health
    echo
    ;;
  *)
    echo "usage: deploy.sh up <tag> | rollback | status | info | check" >&2
    exit 2
    ;;
esac
