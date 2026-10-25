#!/usr/bin/env bash
# Runs on the GitHub Actions runner (or locally): prepares the server over SSH and
# deploys a tag. Used by .github/workflows/deploy.yml and the end-to-end test.
#   remote.sh deploy     bootstrap (idempotent) + deploy.sh up $DS_TAG
#   remote.sh rollback   deploy.sh rollback
# Required env: DEPLOY_HOST, DEPLOY_KEY_FILE, DEPLOY_KNOWN_HOSTS_FILE, DS_DOMAIN,
#   DS_TAG, DS_SERVER_IMAGE, DS_WEB_IMAGE, DS_POSTGRES_IMAGE (full reference with tag).
# Optional: DEPLOY_USER (root), DEPLOY_PORT (22), DS_REGISTRY_USER + DS_REGISTRY_TOKEN
#   (GHCR pull), DS_SKIP_FIREWALL.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
USER_="${DEPLOY_USER:-root}"
PORT="${DEPLOY_PORT:-22}"
SSH=(ssh -i "$DEPLOY_KEY_FILE" -p "$PORT" -o BatchMode=yes -o StrictHostKeyChecking=yes
  -o UserKnownHostsFile="$DEPLOY_KNOWN_HOSTS_FILE" -o ConnectTimeout=20 -o ServerAliveInterval=15
  "$USER_@$DEPLOY_HOST")
SUDO=""
[ "$USER_" = "root" ] || SUDO="sudo -n"

remote() { "${SSH[@]}" "$@"; }

case "${1:-}" in
  deploy)
    echo "::group::Upload deployment files"
    tar -C "$HERE" -cf - docker-compose.yml bootstrap.sh deploy.sh -C "$HERE/.." backup.sh restore.sh \
      | remote "rm -rf /tmp/ds-deploy && mkdir -p /tmp/ds-deploy && tar -xf - -C /tmp/ds-deploy"
    echo "::endgroup::"

    echo "::group::Prepare the server (bootstrap)"
    remote "$SUDO env DS_DEPLOY_USER='$USER_' DS_SKIP_FIREWALL='${DS_SKIP_FIREWALL:-0}' bash /tmp/ds-deploy/bootstrap.sh"
    remote "$SUDO install -m 0644 /tmp/ds-deploy/docker-compose.yml /opt/datascratch/docker-compose.yml \
      && $SUDO install -m 0755 /tmp/ds-deploy/deploy.sh /tmp/ds-deploy/backup.sh /tmp/ds-deploy/restore.sh /opt/datascratch/ \
      && rm -rf /tmp/ds-deploy"
    echo "::endgroup::"

    echo "::group::Deploy $DS_TAG"
    vars="DS_DOMAIN='$DS_DOMAIN' DS_SERVER_IMAGE='$DS_SERVER_IMAGE' DS_WEB_IMAGE='$DS_WEB_IMAGE' DS_POSTGRES_IMAGE='$DS_POSTGRES_IMAGE'"
    if [ -n "${DS_REGISTRY_TOKEN:-}" ]; then
      # The token travels on stdin, never on a command line or in a log.
      printf '%s' "$DS_REGISTRY_TOKEN" \
        | remote "$SUDO env $vars DS_REGISTRY_USER='${DS_REGISTRY_USER:?}' /opt/datascratch/deploy.sh up '$DS_TAG'"
    else
      remote "$SUDO env $vars /opt/datascratch/deploy.sh up '$DS_TAG'" < /dev/null
    fi
    echo "::endgroup::"
    ;;
  rollback)
    remote "$SUDO /opt/datascratch/deploy.sh rollback" < /dev/null
    ;;
  *)
    echo "usage: remote.sh deploy | rollback" >&2
    exit 2
    ;;
esac
