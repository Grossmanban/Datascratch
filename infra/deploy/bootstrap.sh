#!/usr/bin/env bash
# One-time (idempotent) preparation of a fresh VPS for Datascratch.
# Run as root (the deploy workflow runs it over SSH on every deploy; each step
# checks first and does nothing when already done):
#   - Docker Engine + compose plugin
#   - /opt/datascratch with .env holding generated secrets (only if .env is missing;
#     secrets never leave the server and are never printed)
#   - firewall (ufw: 22, 80, 443), automatic security updates
#   - nightly backups (backup.sh) with rotation
# Environment: DS_DIR (default /opt/datascratch), DS_DEPLOY_USER (non-root user that
# connects over SSH; added to the docker group), DS_SKIP_FIREWALL=1 (containers/tests).
set -euo pipefail

DS_DIR="${DS_DIR:-/opt/datascratch}"
export DEBIAN_FRONTEND=noninteractive

log() { echo "[bootstrap] $*"; }
[ "$(id -u)" -eq 0 ] || { echo "bootstrap.sh must run as root" >&2; exit 1; }

apt_install() {
  local missing=()
  for p in "$@"; do dpkg -s "$p" > /dev/null 2>&1 || missing+=("$p"); done
  [ ${#missing[@]} -eq 0 ] && return 0
  log "installing: ${missing[*]}"
  apt-get update -qq
  apt-get install -y -qq --no-install-recommends "${missing[@]}" > /dev/null
}

# 1. Docker Engine + compose plugin — from the distribution's own repository
#    (Docker Hub and download.docker.com may be unreachable from some regions).
if ! command -v docker > /dev/null 2>&1 || ! docker compose version > /dev/null 2>&1; then
  apt_install docker.io
  if ! docker compose version > /dev/null 2>&1; then
    apt-get install -y -qq --no-install-recommends docker-compose-v2 > /dev/null 2>&1 \
      || apt-get install -y -qq --no-install-recommends docker-compose-plugin > /dev/null 2>&1 \
      || { echo "cannot install the docker compose plugin from apt (Ubuntu 24.04 is supported)" >&2; exit 1; }
  fi
  systemctl enable --now docker > /dev/null 2>&1 || true
fi
log "docker: $(docker --version | head -1); compose: $(docker compose version --short 2>/dev/null || echo '?')"
if [ -n "${DS_DEPLOY_USER:-}" ] && [ "$DS_DEPLOY_USER" != "root" ] && id "$DS_DEPLOY_USER" > /dev/null 2>&1; then
  usermod -aG docker "$DS_DEPLOY_USER"
fi

# 2. Tools used by the scripts.
apt_install openssl cron curl ca-certificates

# 3. Directory and secrets (generated once, kept only on this server).
install -d -m 0750 "$DS_DIR" "$DS_DIR/backups"
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

# 4. Firewall: only SSH and the web.
if [ "${DS_SKIP_FIREWALL:-0}" != "1" ]; then
  apt_install ufw
  ufw allow 22/tcp > /dev/null
  ufw allow 80/tcp > /dev/null
  ufw allow 443/tcp > /dev/null
  ufw allow 443/udp > /dev/null
  if ufw status | grep -q inactive; then
    ufw --force enable > /dev/null && log "firewall enabled (22, 80, 443)" || log "WARNING: could not enable ufw"
  fi
else
  log "firewall skipped (DS_SKIP_FIREWALL=1)"
fi

# 5. Automatic security updates.
apt_install unattended-upgrades
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'APT'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT

# 6. Nightly backups at 03:17 (backup.sh keeps BACKUP_KEEP_DAYS days locally and
#    copies off-site when BACKUP_RCLONE_REMOTE is set in .env).
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

log "done"
