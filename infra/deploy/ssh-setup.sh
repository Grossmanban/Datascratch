#!/usr/bin/env bash
# GitHub Actions helper: write the deploy key and the server's host key for SSH.
# Env: DEPLOY_HOST, DEPLOY_PORT, KEY (private key), KNOWN_HOSTS (optional pinned
# known_hosts lines, repository variable DEPLOY_KNOWN_HOSTS), REQUIRE_KNOWN_HOSTS=1
# (deploy: a missing pinned host key is an error, no trust on first use). Exports
# DEPLOY_KEY_FILE and DEPLOY_KNOWN_HOSTS_FILE through $GITHUB_ENV.
set -euo pipefail
dir="${RUNNER_TEMP:-/tmp}/ssh"
install -d -m 700 "$dir"
printf '%s\n' "$KEY" | tr -d '\r' > "$dir/key"
chmod 600 "$dir/key"
if ! ssh-keygen -y -f "$dir/key" > /dev/null 2>&1; then
  # Keys copied from a provider's web console often lose their line breaks or gain
  # spaces: rebuild the PEM block from its base64 body (OpenSSH wraps at 70).
  kind=$(printf '%s' "$KEY" | grep -oE 'BEGIN [A-Z ]*PRIVATE KEY' | head -1 | sed 's/^BEGIN //' || true)
  kind=${kind:-OPENSSH PRIVATE KEY}
  body=$(printf '%s' "$KEY" | tr -d '\r' | sed -E 's/-----(BEGIN|END) [A-Z ]*PRIVATE KEY-----//g' | LC_ALL=C tr -cd 'A-Za-z0-9+/=')
  { echo "-----BEGIN $kind-----"; printf '%s' "$body" | fold -w 70; echo; echo "-----END $kind-----"; } | sed '/^$/d' > "$dir/key"
  chmod 600 "$dir/key"
fi
if ! ssh-keygen -y -f "$dir/key" > /dev/null 2>&1; then
  markers=$(printf '%s' "$KEY" | grep -c 'PRIVATE KEY' || true)
  hint="Copy the whole output of 'cat /root/.ssh/github_deploy' including the BEGIN/END lines."
  if printf '%s' "$KEY" | grep -q '^ssh-'; then hint="This looks like the PUBLIC key (.pub); the secret needs the private one: cat /root/.ssh/github_deploy (without .pub)."; fi
  echo "::error title=DEPLOY_SSH_KEY::The secret is not a valid private key: ${#body} base64 characters after cleanup (an ed25519 key has about 320-400), BEGIN/END lines found: $markers. $hint See infra/DEPLOY.md."
  exit 1
fi
if [ -n "${KNOWN_HOSTS:-}" ]; then
  printf '%s\n' "$KNOWN_HOSTS" > "$dir/known_hosts"
  echo "Host key pinned by the DEPLOY_KNOWN_HOSTS variable."
elif [ "${REQUIRE_KNOWN_HOSTS:-0}" = "1" ]; then
  echo "::error title=DEPLOY_KNOWN_HOSTS is not set::Deploying needs the server's host key pinned. Run the workflow in 'inspect' mode once: it prints the key lines and their fingerprint. Compare the fingerprint with the provider's console and save the lines as the repository variable DEPLOY_KNOWN_HOSTS (infra/DEPLOY.md)."
  exit 1
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
