#!/usr/bin/env bash
# Idempotent preparation of a VPS for Datascratch. Runs as root on every deploy;
# every step checks first and does nothing when already done.
#
# The server may already run other software (another app, its own Docker, nginx,
# a firewall). Then this script only ADDS what Datascratch needs and never changes
# what is there:
#   - Docker: an existing Docker (any source) is used as is; only a missing compose
#     plugin is added (matching package). Fresh server: docker.io from Ubuntu.
#   - Firewall: an active ufw is left untouched (the deploy checks that 80/443 are
#     allowed when it needs them). Fresh server: ufw with 22/80/443.
#   - Automatic updates: an existing setup is left untouched. Fresh server: enabled.
#   - Secrets (.env) are generated once, only if missing; never printed.
#   - Nightly backups of Datascratch only (its own cron file).
# It writes /opt/datascratch/.host-profile (non-secret facts used by deploy.sh).
#
# Environment: DS_DIR (/opt/datascratch), DS_DEPLOY_USER (non-root SSH user, added to
# the docker group), DS_HOST_MODE (auto | fresh | shared), DS_SKIP_FIREWALL=1 (tests).
set -euo pipefail

DS_DIR="${DS_DIR:-/opt/datascratch}"
export DEBIAN_FRONTEND=noninteractive

log() { echo "[bootstrap] $*"; }
[ "$(id -u)" -eq 0 ] || { echo "bootstrap.sh must run as root" >&2; exit 1; }
have() { command -v "$1" > /dev/null 2>&1; }
installed() { dpkg-query -W -f='${Status}' "$1" 2> /dev/null | grep -q 'install ok installed'; }

apt_install() {
  local missing=()
  for p in "$@"; do installed "$p" || missing+=("$p"); done
  [ ${#missing[@]} -eq 0 ] && return 0
  log "installing: ${missing[*]}"
  apt-get update -qq
  apt-get install -y -qq --no-install-recommends "${missing[@]}" > /dev/null
}

# 0. Tools used by the scripts (only added if missing).
apt_install ca-certificates curl openssl cron iproute2

# 1. Docker Engine + compose plugin — never replaced if present (from the
#    distribution's repository; Docker Hub and download.docker.com may be unreachable).
if ! have docker; then
  apt_install docker.io
  systemctl enable --now docker > /dev/null 2>&1 || true
fi
if ! docker compose version > /dev/null 2>&1; then
  if installed docker-ce; then
    apt_install docker-compose-plugin
  else
    apt_install docker-compose-v2 || apt_install docker-compose-plugin
  fi
fi
docker compose version > /dev/null 2>&1 || { echo "docker compose plugin is missing and could not be installed" >&2; exit 1; }
log "docker: $(docker --version | head -1); compose: $(docker compose version --short 2> /dev/null || echo '?')"
if [ -n "${DS_DEPLOY_USER:-}" ] && [ "$DS_DEPLOY_USER" != "root" ] && id "$DS_DEPLOY_USER" > /dev/null 2>&1; then
  id -nG "$DS_DEPLOY_USER" | grep -qw docker || usermod -aG docker "$DS_DEPLOY_USER"
fi

# 2. What else lives here? (Datascratch's own containers are prefixed "datascratch-".)
foreign_containers=$(docker ps -a --format '{{.Names}}' 2> /dev/null | grep -vc '^datascratch-' || true)
web_services=""
for svc in nginx apache2 httpd caddy traefik haproxy; do
  systemctl is-active --quiet "$svc" 2> /dev/null && web_services="$web_services $svc"
done
port_busy() { ss -H -ltn "sport = :$1" 2> /dev/null | grep -q .; }
ours_on_443() { docker ps --filter name='^datascratch-web$' --format '{{.Ports}}' 2> /dev/null | grep -q ':443->'; }
web_ports_free=1
if { port_busy 80 || port_busy 443; } && ! ours_on_443; then web_ports_free=0; fi
case "${DS_HOST_MODE:-auto}" in
  fresh) shared=0 ;;
  shared) shared=1 ;;
  *) shared=0; { [ "${foreign_containers:-0}" -gt 0 ] || [ -n "$web_services" ] || [ "$web_ports_free" = 0 ]; } && shared=1 ;;
esac
if [ "$shared" = 1 ]; then
  log "shared server: other containers: ${foreign_containers:-0}, web services:${web_services:- none}, ports 80/443 $([ "$web_ports_free" = 1 ] && echo free || echo taken) — existing setup is left untouched"
else
  log "fresh server"
fi

# 3. Directory and secrets (generated once, kept only on this server).
install -d -m 0750 "$DS_DIR" "$DS_DIR/backups"
if [ ! -f "$DS_DIR/.env" ] && docker volume inspect datascratch_pgdata > /dev/null 2>&1; then
  # New secrets would not open the existing database (and would lose DS_KMS_KEY).
  echo "$DS_DIR/.env is missing but the Datascratch database volume exists." >&2
  echo "Restore .env from your copy (it holds the database password and DS_KMS_KEY) and deploy again." >&2
  exit 1
fi
if [ ! -f "$DS_DIR/.env" ]; then
  log "generating $DS_DIR/.env with new secrets"
  secret() { openssl rand -base64 32 | tr '+/' '-_' | tr -d '=\n'; }
  umask 077
  cat > "$DS_DIR/.env" <<ENV
# Datascratch server settings. Generated on this server by bootstrap.sh on $(date -u +%F).
# Secrets below never leave this server. Keep a copy of DS_KMS_KEY in a password
# manager: without it AI agents lose access to "for agents" notebooks.
NODE_ENV=production
LOG_LEVEL=info
POSTGRES_USER=datascratch
POSTGRES_DB=datascratch
POSTGRES_PASSWORD=$(secret)
DS_JWT_SECRET=$(secret)
DS_KMS_KEY=$(secret)
METRICS_TOKEN=$(secret)
STORAGE_DRIVER=disk
BACKUP_KEEP_DAYS=14
BACKUP_RCLONE_REMOTE=
ENV
  umask 022
else
  log ".env exists — secrets kept"
fi
chmod 600 "$DS_DIR/.env"

# 4. Firewall.
ufw_active=0
have ufw && ufw status 2> /dev/null | grep -q '^Status: active' && ufw_active=1
web_allowed=1
if [ "$ufw_active" = 1 ]; then
  rules=$(ufw status 2> /dev/null)
  for p in 80 443; do
    echo "$rules" | grep -Eq "^($p|$p/tcp|[0-9,]*\\b$p\\b[0-9,]*/tcp|Nginx Full|Apache Full|WWW Full)[[:space:]].*ALLOW" || web_allowed=0
  done
  log "ufw is active and left untouched (80/443 allowed: $([ "$web_allowed" = 1 ] && echo yes || echo no))"
elif [ "${DS_SKIP_FIREWALL:-0}" = "1" ]; then
  log "firewall skipped (DS_SKIP_FIREWALL=1)"
elif [ "$shared" = 1 ]; then
  log "firewall: ufw is not active; not enabling it on a shared server (it could cut off the other apps)"
else
  apt_install ufw
  for r in 22/tcp 80/tcp 443/tcp 443/udp; do ufw allow "$r" > /dev/null; done
  ufw --force enable > /dev/null && log "firewall enabled (22, 80, 443)" || log "WARNING: could not enable ufw"
fi

# 5. Automatic security updates: only set up on a fresh server without them.
if installed unattended-upgrades; then
  log "automatic updates: already installed, left as is"
elif [ "$shared" = 1 ]; then
  log "automatic updates: not installed; not changing a shared server's update policy"
else
  apt_install unattended-upgrades
  cat > /etc/apt/apt.conf.d/20auto-upgrades <<'APT'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT
fi

# 6. Nightly backups of Datascratch at 03:17 (own cron file and log only).
cat > /etc/cron.d/datascratch-backup <<CRON
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
17 3 * * * root $DS_DIR/backup.sh >> /var/log/datascratch-backup.log 2>&1
CRON
chmod 644 /etc/cron.d/datascratch-backup
cat > /etc/logrotate.d/datascratch-backup <<'ROT'
/var/log/datascratch-backup.log {
  weekly
  rotate 8
  compress
  missingok
  notifempty
}
ROT
(systemctl enable --now cron > /dev/null 2>&1 || service cron start > /dev/null 2>&1) || true

# 7. Facts for deploy.sh (no secrets).
mem_mb=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
cat > "$DS_DIR/.host-profile" <<PROFILE
HOST_SHARED=$shared
WEB_PORTS_FREE=$web_ports_free
UFW_ACTIVE=$ufw_active
UFW_WEB_ALLOWED=$web_allowed
WEB_SERVICES="${web_services# }"
MEM_TOTAL_MB=$mem_mb
PROFILE

log "done"
