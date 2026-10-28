#!/usr/bin/env bash
# The server's web host for the iOS release build (Universal Links, `applinks:`), without
# printing it (D-49). Read-only on the server.
# Env: DS_WEB_HOST_SECRET (repository secret DS_WEB_HOST; used as is when set), else
#   DEPLOY_HOST, DEPLOY_SSH_KEY, DEPLOY_PORT (22), DEPLOY_USER (root), DEPLOY_KNOWN_HOSTS
#   (optional; else the committed infra/deploy/known_hosts) and GITHUB_ENV.
# Out: DS_WEB_HOST=<host> appended to $GITHUB_ENV, masked first; stdout carries only the
#   runner's mask commands and one status line.
# Exit: 0 found; 1 no access (key, host key, SSH); 2 the server has no Datascratch domain yet.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
: "${GITHUB_ENV:?GITHUB_ENV is required}"

valid() { [[ "$1" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]{0,251}[A-Za-z0-9])?$ ]]; }

if [ -n "${DS_WEB_HOST_SECRET:-}" ]; then
  host="$DS_WEB_HOST_SECRET"
  host="${host#https://}"
  host="${host%%/*}"
  echo "::add-mask::$host"
  valid "$host" || { echo "::error title=DS_WEB_HOST::The DS_WEB_HOST secret is not a host name."; exit 1; }
  echo "DS_WEB_HOST=$host" >> "$GITHUB_ENV"
  echo "Web host set from the secret (hidden, D-49)."
  exit 0
fi

[ -n "${DEPLOY_HOST:-}" ] && [ -n "${DEPLOY_SSH_KEY:-}" ] || {
  echo "::error title=Web host::Neither the DS_WEB_HOST secret nor DEPLOY_HOST / DEPLOY_SSH_KEY are set."
  exit 1
}
export DEPLOY_PORT="${DEPLOY_PORT:-22}" DEPLOY_USER="${DEPLOY_USER:-root}"

# The SSH setup of the deploy (pinned host key required), into a private env file.
env_file="$(mktemp)"
trap 'rm -f "$env_file"' EXIT
if ! GITHUB_ENV="$env_file" KEY="$DEPLOY_SSH_KEY" KNOWN_HOSTS="${DEPLOY_KNOWN_HOSTS:-}" REQUIRE_KNOWN_HOSTS=1 \
  "$HERE/ssh-setup.sh"; then
  exit 1
fi
DEPLOY_KEY_FILE="$(sed -n 's/^DEPLOY_KEY_FILE=//p' "$env_file")"
DEPLOY_KNOWN_HOSTS_FILE="$(sed -n 's/^DEPLOY_KNOWN_HOSTS_FILE=//p' "$env_file")"
export DEPLOY_KEY_FILE DEPLOY_KNOWN_HOSTS_FILE

# Reachability first, so that "no access" and "not deployed" stay apart.
if ! "$HERE/remote.sh" probe > /dev/null 2>&1; then
  echo "::error title=Web host::No SSH access to the server (DEPLOY_* secrets, host key, port)."
  exit 1
fi
host="$("$HERE/remote.sh" domain 2> /dev/null || true)"
# The server's answer is not trusted beyond a plain host name.
valid "$host" || host=""
if [ -z "$host" ]; then
  echo "::error title=Web host::The server runs no Datascratch yet: deploy first, or add the repository secret DS_WEB_HOST."
  exit 2
fi
echo "::add-mask::$host"
echo "DS_WEB_HOST=$host" >> "$GITHUB_ENV"
echo "Web host set from the server (hidden, D-49)."
