#!/usr/bin/env bash
# GitHub Actions helper: write the deploy key and the server's host key for SSH.
# Env: DEPLOY_HOST, DEPLOY_PORT, KEY (private key), KNOWN_HOSTS (optional pinned
# known_hosts lines, repository variable DEPLOY_KNOWN_HOSTS). Exports
# DEPLOY_KEY_FILE and DEPLOY_KNOWN_HOSTS_FILE through $GITHUB_ENV.
set -euo pipefail
dir="${RUNNER_TEMP:-/tmp}/ssh"
install -d -m 700 "$dir"
printf '%s\n' "$KEY" | tr -d '\r' > "$dir/key"
chmod 600 "$dir/key"
if ! ssh-keygen -y -f "$dir/key" > /dev/null 2>&1; then
  echo "::error title=DEPLOY_SSH_KEY::The secret is not a valid private key (no passphrase). Copy the whole file including the BEGIN/END lines. See infra/DEPLOY.md."
  exit 1
fi
if [ -n "${KNOWN_HOSTS:-}" ]; then
  printf '%s\n' "$KNOWN_HOSTS" > "$dir/known_hosts"
  echo "Host key pinned by the DEPLOY_KNOWN_HOSTS variable."
else
  # Trust on first use: remember the key the server presents now and show its
  # fingerprint, so it can be compared with the provider's console (infra/DEPLOY.md).
  ssh-keyscan -p "${DEPLOY_PORT:-22}" -t ed25519,ecdsa,rsa "$DEPLOY_HOST" 2> /dev/null > "$dir/known_hosts" || true
  if [ ! -s "$dir/known_hosts" ]; then
    echo "::error title=Server unreachable::No SSH answer from $DEPLOY_HOST:${DEPLOY_PORT:-22}. Is the server running and the port open?"
    exit 1
  fi
  echo "::notice title=Server host key (verify once)::$(ssh-keygen -lf "$dir/known_hosts" | head -1). To pin it, save the lines below as the repository variable DEPLOY_KNOWN_HOSTS."
  cat "$dir/known_hosts"
fi
{
  echo "DEPLOY_KEY_FILE=$dir/key"
  echo "DEPLOY_KNOWN_HOSTS_FILE=$dir/known_hosts"
} >> "${GITHUB_ENV:-/dev/null}"
