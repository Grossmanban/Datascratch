#!/usr/bin/env bash
# End-to-end test of the deploy scripts against a simulated VPS (Ubuntu 24.04 + sshd
# in a container, Docker via the host socket). Uses locally built images, the
# "localhost" domain (Caddy's local CA) and the real SSH path of remote.sh.
#   infra/deploy/test/e2e.sh            (needs Docker; destroys the "datascratch" compose project)
# Env: E2E_APT_PROXY (apt proxy inside the simulated VPS), DS_SERVER_IMAGE / DS_WEB_IMAGE — locally built images (default datascratch-server / datascratch-web,
# tag "latest"); SSH_PORT (2222).
set -euo pipefail
cd "$(dirname "$0")"
DEPLOY_DIR="$(cd .. && pwd)"
WORK="$(mktemp -d)"
SSH_PORT="${SSH_PORT:-2222}"
SRV="${DS_SERVER_IMAGE:-datascratch-server}"
WEB="${DS_WEB_IMAGE:-datascratch-web}"
VPS=ds-e2e-vps

cleanup() {
  docker exec "$VPS" sh -c 'cd /opt/datascratch && docker compose down -v --remove-orphans' > /dev/null 2>&1 || true
  docker rm -f "$VPS" sinhron-demo > /dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT
step() { echo; echo "=== $*"; }

step "images: e2e1, e2e2 (same build) and a broken one that never becomes healthy"
docker tag "$SRV:latest" "$SRV:e2e1"
docker tag "$SRV:latest" "$SRV:e2e2"
docker tag "$WEB:latest" "$WEB:e2e1"
docker tag "$WEB:latest" "$WEB:e2e2"
docker tag "$WEB:latest" "$WEB:broken"
printf 'FROM %s:latest\nCMD ["node", "-e", "setTimeout(() => process.exit(1), 1000)"]\n' "$SRV" \
  | docker build -q -t "$SRV:broken" - > /dev/null

step "simulated VPS"
docker image inspect ds-e2e-vps > /dev/null 2>&1 || docker build -q -t ds-e2e-vps -f vps.Dockerfile . > /dev/null
ssh-keygen -q -t ed25519 -N '' -f "$WORK/key" -C ds-deploy-e2e
# Host network: the "VPS" publishes 80/443 exactly like a real server would.
docker run -d --name "$VPS" --network host -v /var/run/docker.sock:/var/run/docker.sock \
  ds-e2e-vps /usr/sbin/sshd -D -e -p "$SSH_PORT" > /dev/null
if [ -n "${E2E_APT_PROXY:-}" ]; then
  # Sandboxes without direct internet: let apt inside the "VPS" use a proxy.
  docker exec "$VPS" sh -c "printf 'Acquire::http::Proxy \"%s\";\nAcquire::https::Proxy \"%s\";\n' '$E2E_APT_PROXY' '$E2E_APT_PROXY' > /etc/apt/apt.conf.d/90proxy"
fi
docker exec -i "$VPS" sh -c 'cat > /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys' < "$WORK/key.pub"
for _ in $(seq 1 30); do ssh-keyscan -p "$SSH_PORT" -t ed25519 127.0.0.1 > "$WORK/known_hosts" 2> /dev/null && [ -s "$WORK/known_hosts" ] && break; sleep 1; done
ssh-keygen -lf "$WORK/known_hosts"

export DEPLOY_HOST=127.0.0.1 DEPLOY_PORT="$SSH_PORT" DEPLOY_KEY_FILE="$WORK/key" DEPLOY_KNOWN_HOSTS_FILE="$WORK/known_hosts"
export DS_DOMAIN=localhost DS_SERVER_IMAGE="$SRV" DS_WEB_IMAGE="$WEB" DS_POSTGRES_IMAGE="${DS_POSTGRES_IMAGE:-postgres:16-alpine}" DS_SKIP_FIREWALL=1
export NODE_TLS_REJECT_UNAUTHORIZED=0
vps() { docker exec "$VPS" "$@"; }
secrets_hash() { vps sh -c "grep -E '^(POSTGRES_PASSWORD|DS_KMS_KEY|DS_JWT_SECRET)=' /opt/datascratch/.env | sha256sum"; }

step "read-only survey of the server"
before="$(docker exec "$VPS" sh -c 'ls -la /opt /etc/cron.d; ls /etc/apt/apt.conf.d' | sha256sum)"
"$DEPLOY_DIR/remote.sh" inspect > "$WORK/inspect.md"
grep -q '^## Server survey' "$WORK/inspect.md"
grep -q 'not deployed yet' "$WORK/inspect.md"
[ "$(docker exec "$VPS" sh -c 'ls -la /opt /etc/cron.d; ls /etc/apt/apt.conf.d' | sha256sum)" = "$before" ] || { echo "inspect changed the server" >&2; exit 1; }
if grep -Eiq 'PASSWORD=|KMS_KEY=|SECRET=' "$WORK/inspect.md"; then echo "inspect printed a secret" >&2; exit 1; fi

step "first deploy (fresh server: bootstrap + e2e1)"
DS_HOST_MODE=fresh DS_TAG=e2e1 "$DEPLOY_DIR/remote.sh" deploy
node "$DEPLOY_DIR/smoke.mjs" https://localhost 180
vps sh -c 'test "$(stat -c %a /opt/datascratch/.env)" = 600'
vps test -f /etc/cron.d/datascratch-backup
first="$(secrets_hash)"

step "second deploy (idempotent bootstrap, secrets kept)"
DS_HOST_MODE=fresh DS_TAG=e2e2 "$DEPLOY_DIR/remote.sh" deploy
node "$DEPLOY_DIR/smoke.mjs" https://localhost 120
[ "$(secrets_hash)" = "$first" ] || { echo "secrets changed on redeploy" >&2; exit 1; }

step "broken version is rolled back automatically"
if DS_HOST_MODE=fresh DS_TAG=broken "$DEPLOY_DIR/remote.sh" deploy; then echo "broken deploy unexpectedly succeeded" >&2; exit 1; fi
vps grep -qx 'DS_TAG=e2e2' /opt/datascratch/.env
node "$DEPLOY_DIR/smoke.mjs" https://localhost 120

step "manual rollback to the previous version"
"$DEPLOY_DIR/remote.sh" rollback
vps grep -qx 'DS_TAG=e2e1' /opt/datascratch/.env
node "$DEPLOY_DIR/smoke.mjs" https://localhost 120

step "nightly backup script works on the deployed stack"
vps /opt/datascratch/backup.sh
vps sh -c 'ls /opt/datascratch/backups/db-*.dump /opt/datascratch/backups/files-*.tar.gz'

step "shared server: an existing app behind nginx owns ports 80/443"
vps sh -c 'cd /opt/datascratch && docker compose down' > /dev/null 2>&1
# The "messenger": a foreign container, served by the server's own nginx.
docker run -d --name sinhron-demo --network host caddy:2-alpine caddy respond --listen 127.0.0.1:9999 "messenger ok" > /dev/null
vps sh -c 'cat > /etc/nginx/sites-available/messenger <<NGX
server { listen 80; server_name messenger.test; location / { proxy_pass http://127.0.0.1:9999; } }
NGX
ln -sf /etc/nginx/sites-available/messenger /etc/nginx/sites-enabled/messenger && rm -f /etc/nginx/sites-enabled/default && nginx'
for _ in $(seq 1 20); do curl -fs -H 'Host: messenger.test' http://127.0.0.1/ > /dev/null && break; sleep 0.5; done
nginx_before="$(vps sh -c 'cat /etc/nginx/sites-available/messenger' | sha256sum)"

DS_NGINX_AUTO=true DS_TAG=e2e2 "$DEPLOY_DIR/remote.sh" deploy
info="$("$DEPLOY_DIR/remote.sh" info)"
grep -qx 'DS_MODE=proxy' <<< "$info"
vps grep -qx 'DS_MEM_POSTGRES=512m' /opt/datascratch/.env
listen="$(vps sh -c 'ss -H -ltn "sport = :8480"')"
grep -q '127.0.0.1:8480' <<< "$listen"
if grep -q '0.0.0.0:8480' <<< "$listen"; then echo "8480 must be loopback only" >&2; exit 1; fi
snippet="$("$DEPLOY_DIR/remote.sh" snippet)"
grep -q 'proxy_pass http://127.0.0.1:8480' <<< "$snippet"
# Through the SSH tunnel, and through the existing nginx (WebSocket included).
SMOKE_TIMEOUT=120 "$DEPLOY_DIR/remote.sh" smoke-local
for _ in $(seq 1 20); do curl -fs http://localhost/v1/health > /dev/null && break; sleep 0.5; done
node "$DEPLOY_DIR/smoke.mjs" http://localhost 60
# The existing app is untouched.
[ "$(curl -fs -H 'Host: messenger.test' http://127.0.0.1/)" = "messenger ok" ]
[ "$(vps sh -c 'cat /etc/nginx/sites-available/messenger' | sha256sum)" = "$nginx_before" ]
[ "$(docker inspect -f '{{.State.Running}}' sinhron-demo)" = true ]

step "a broken nginx config is never left behind"
vps sh -c 'echo "server { listen 80; server_name broken.test; bogus_directive on; }" > /etc/nginx/sites-enabled/zz-broken'
DS_NGINX_AUTO=true DS_TAG=e2e1 "$DEPLOY_DIR/remote.sh" deploy > "$WORK/nginx-fail.log" 2>&1 || true
if ! grep -q 'restoring the previous configuration' "$WORK/nginx-fail.log"; then
  cat "$WORK/nginx-fail.log"; echo "expected nginx -t failure handling" >&2; exit 1
fi
vps sh -c 'rm /etc/nginx/sites-enabled/zz-broken && nginx -t' > /dev/null 2>&1
[ "$(curl -fs -H 'Host: messenger.test' http://127.0.0.1/)" = "messenger ok" ]

echo
echo "deploy end-to-end test passed"
