#!/usr/bin/env bash
# GitHub Actions helper: write the deploy key and the server's host key for SSH.
# Env: DEPLOY_HOST, DEPLOY_PORT, KEY (private key), KNOWN_HOSTS (optional pinned
# known_hosts lines, repository variable DEPLOY_KNOWN_HOSTS), REQUIRE_KNOWN_HOSTS=1
# (deploy). Deploy trusts, in order: DEPLOY_KNOWN_HOSTS, the committed
# infra/deploy/known_hosts (host pattern `*`: only ever used for the one deploy host);
# without either it stops. Inspect (read-only) uses DEPLOY_KNOWN_HOSTS or trusts on first
# use, printing the key and warning when it differs from the committed one. Exports
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
pinned="$(dirname "$0")/known_hosts"
if [ -n "${KNOWN_HOSTS:-}" ]; then
  printf '%s\n' "$KNOWN_HOSTS" > "$dir/known_hosts"
  echo "Host key pinned by the DEPLOY_KNOWN_HOSTS variable."
elif [ "${REQUIRE_KNOWN_HOSTS:-0}" = "1" ] && grep -qE '^[^#[:space:]]' "$pinned" 2> /dev/null; then
  cp "$pinned" "$dir/known_hosts"
  echo "Host key pinned by infra/deploy/known_hosts: $(ssh-keygen -lf "$dir/known_hosts" | awk '{print $2}' | paste -sd ' ')"
elif [ "${REQUIRE_KNOWN_HOSTS:-0}" = "1" ]; then
  echo "::error title=No pinned host key::Deploying needs the server's host key pinned (infra/deploy/known_hosts or the DEPLOY_KNOWN_HOSTS variable). Run the workflow in 'inspect' mode once: it prints the key lines and their fingerprint; see infra/DEPLOY.md, step 4.3."
  exit 1
else
  # Trust on first use: remember the key the server presents now and show its
  # fingerprint, so it can be compared with the provider's console (infra/DEPLOY.md).
  ssh-keyscan -p "${DEPLOY_PORT:-22}" -t ed25519,ecdsa,rsa "$DEPLOY_HOST" 2> /dev/null > "$dir/known_hosts" || true
  if [ ! -s "$dir/known_hosts" ]; then
    echo "::error title=Server unreachable::No SSH answer from $DEPLOY_HOST:${DEPLOY_PORT:-22}. Is the server running and the port open?"
    exit 1
  fi
  echo "::notice title=Server host key (verify once)::$(ssh-keygen -lf "$dir/known_hosts" | head -1). To pin it, put the lines below into infra/deploy/known_hosts (address replaced by *) or the repository variable DEPLOY_KNOWN_HOSTS."
  cat "$dir/known_hosts"
  # Inspect only: tell when the server no longer presents the key the deploy trusts.
  if grep -qE '^[^#[:space:]]' "$pinned" 2> /dev/null; then
    seen=$(grep -v '^#' "$dir/known_hosts" | awk '{print $2, $3}' | sort)
    want=$(grep -v '^#' "$pinned" | awk '{print $2, $3}' | sort)
    if [ -n "$(comm -12 <(echo "$seen") <(echo "$want"))" ]; then
      echo "The server presents a key pinned in infra/deploy/known_hosts."
    else
      echo "::warning title=Host key changed::The server's key is not the one in infra/deploy/known_hosts: deploys will refuse to connect. Reinstalled server? Verify the fingerprint above with the provider's console before updating the file."
    fi
  fi
fi
{
  echo "DEPLOY_KEY_FILE=$dir/key"
  echo "DEPLOY_KNOWN_HOSTS_FILE=$dir/known_hosts"
} >> "${GITHUB_ENV:-/dev/null}"
