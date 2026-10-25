#!/usr/bin/env bash
# Runs on the GitHub Actions runner (or locally) and talks to the server over SSH.
# Used by .github/workflows/deploy.yml and the end-to-end test.
#   remote.sh inspect      read-only survey of the server (Markdown on stdout)
#   remote.sh deploy       bootstrap (idempotent) + deploy.sh up $DS_TAG
#   remote.sh info         mode of the running deployment (key=value lines)
#   remote.sh smoke-local  smoke test of 127.0.0.1:<proxy port> through an SSH tunnel
#   remote.sh check        health of Datascratch inside its web container (edge mode)
#   remote.sh snippet      the config snippet for an existing nginx (behind-proxy mode)
#   remote.sh rollback     deploy.sh rollback
# Required env: DEPLOY_HOST, DEPLOY_KEY_FILE, DEPLOY_KNOWN_HOSTS_FILE; for deploy also
#   DS_DOMAIN, DS_TAG, DS_SERVER_IMAGE, DS_WEB_IMAGE, DS_POSTGRES_IMAGE.
# Optional: DEPLOY_USER (root), DEPLOY_PORT (22), DS_REGISTRY_USER + DS_REGISTRY_TOKEN
#   (GHCR pull), DS_DEPLOY_MODE (auto|standalone|behind-proxy), DS_PROXY_PORT,
#   DS_EDGE_CADDY, DS_EDGE_SITES_DIR, DS_EDGE_NETWORK, DS_NGINX_AUTO, DS_NGINX_CERTBOT,
#   DS_HOST_MODE, DS_MEM_PROFILE, DS_SKIP_FIREWALL.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
USER_="${DEPLOY_USER:-root}"
PORT="${DEPLOY_PORT:-22}"
SSH_OPTS=(-i "$DEPLOY_KEY_FILE" -p "$PORT" -o BatchMode=yes -o StrictHostKeyChecking=yes
  -o UserKnownHostsFile="$DEPLOY_KNOWN_HOSTS_FILE" -o ConnectTimeout=20 -o ServerAliveInterval=15)
SUDO=""
[ "$USER_" = "root" ] || SUDO="sudo -n"

remote() { ssh "${SSH_OPTS[@]}" "$USER_@$DEPLOY_HOST" "$@"; }
q() { printf '%q' "$1"; }

case "${1:-}" in
  inspect)
    # Read-only: the script runs as the SSH user; it uses sudo -n only to read.
    remote 'bash -s' < "$HERE/inspect.sh"
    ;;
  deploy)
    echo "::group::Upload deployment files"
    tar -C "$HERE" -cf - docker-compose.yml docker-compose.edge.yml bootstrap.sh deploy.sh inspect.sh -C "$HERE/.." backup.sh restore.sh \
      | remote "rm -rf /tmp/ds-deploy && mkdir -p /tmp/ds-deploy && tar -xf - -C /tmp/ds-deploy"
    echo "::endgroup::"

    echo "::group::Prepare the server (bootstrap)"
    remote "$SUDO env DS_DEPLOY_USER=$(q "$USER_") DS_HOST_MODE=$(q "${DS_HOST_MODE:-auto}") DS_SKIP_FIREWALL=$(q "${DS_SKIP_FIREWALL:-0}") bash /tmp/ds-deploy/bootstrap.sh"
    remote "$SUDO install -m 0644 /tmp/ds-deploy/docker-compose.yml /tmp/ds-deploy/docker-compose.edge.yml /opt/datascratch/ \
      && $SUDO install -m 0755 /tmp/ds-deploy/deploy.sh /tmp/ds-deploy/inspect.sh /tmp/ds-deploy/backup.sh /tmp/ds-deploy/restore.sh /opt/datascratch/ \
      && rm -rf /tmp/ds-deploy"
    echo "::endgroup::"

    echo "::group::Deploy $DS_TAG"
    vars="DS_DOMAIN=$(q "$DS_DOMAIN") DS_SERVER_IMAGE=$(q "$DS_SERVER_IMAGE") DS_WEB_IMAGE=$(q "$DS_WEB_IMAGE")"
    vars="$vars DS_POSTGRES_IMAGE=$(q "$DS_POSTGRES_IMAGE") DS_DEPLOY_MODE=$(q "${DS_DEPLOY_MODE:-auto}")"
    for v in DS_EDGE_CADDY DS_EDGE_SITES_DIR DS_EDGE_NETWORK; do
      [ -n "${!v:-}" ] && vars="$vars $v=$(q "${!v}")"
    done
    vars="$vars DS_PROXY_PORT=$(q "${DS_PROXY_PORT:-8480}") DS_NGINX_AUTO=$(q "${DS_NGINX_AUTO:-false}")"
    vars="$vars DS_NGINX_CERTBOT=$(q "${DS_NGINX_CERTBOT:-false}") DS_MEM_PROFILE=$(q "${DS_MEM_PROFILE:-auto}")"
    if [ -n "${DS_REGISTRY_TOKEN:-}" ]; then
      # The token travels on stdin, never on a command line or in a log.
      printf '%s' "$DS_REGISTRY_TOKEN" \
        | remote "$SUDO env $vars DS_REGISTRY_USER=$(q "${DS_REGISTRY_USER:?}") /opt/datascratch/deploy.sh up $(q "$DS_TAG")"
    else
      remote "$SUDO env $vars /opt/datascratch/deploy.sh up $(q "$DS_TAG")" < /dev/null
    fi
    echo "::endgroup::"
    ;;
  info)
    remote "$SUDO /opt/datascratch/deploy.sh info" < /dev/null
    ;;
  snippet)
    remote "$SUDO cat /opt/datascratch/proxy/nginx.conf" < /dev/null
    ;;
  smoke-local)
    # Reach 127.0.0.1:<proxy port> on the server through an SSH tunnel.
    rport="${DS_PROXY_PORT:-8480}"
    lport="${LOCAL_PORT:-18480}"
    ssh "${SSH_OPTS[@]}" -N -o ExitOnForwardFailure=yes -L "127.0.0.1:$lport:127.0.0.1:$rport" "$USER_@$DEPLOY_HOST" &
    tunnel=$!
    trap 'kill "$tunnel" 2> /dev/null || true' EXIT
    for _ in $(seq 1 20); do (exec 3<> "/dev/tcp/127.0.0.1/$lport") 2> /dev/null && break; sleep 0.5; done
    node "$HERE/smoke.mjs" "http://127.0.0.1:$lport" "${SMOKE_TIMEOUT:-180}"
    ;;
  check)
    remote "$SUDO /opt/datascratch/deploy.sh check" < /dev/null
    ;;
  rollback)
    remote "$SUDO /opt/datascratch/deploy.sh rollback" < /dev/null
    ;;
  *)
    echo "usage: remote.sh inspect | deploy | info | snippet | smoke-local | check | rollback" >&2
    exit 2
    ;;
esac
