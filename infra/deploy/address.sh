#!/usr/bin/env bash
# The public address of the deployment for the deploy workflow (D-49: never printed).
# Order: the DS_DOMAIN_SECRET env (the repository secret DS_DOMAIN), else the domain the
# server already runs with (its /opt/datascratch/.env, read over SSH), else — a first
# install without a domain — <ip-with-dashes>.sslip.io from DEPLOY_HOST. The value is
# masked (::add-mask::) before anything else happens with it and written to $GITHUB_ENV
# as DS_DOMAIN; stdout carries only the mask commands, which the runner hides.
# Env: DEPLOY_HOST, DEPLOY_KEY_FILE, DEPLOY_KNOWN_HOSTS_FILE (for remote.sh), GITHUB_ENV.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"

valid() { [[ "$1" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]{0,251}[A-Za-z0-9])?$ ]]; }

domain="${DS_DOMAIN_SECRET:-}"
source=secret
if [ -z "$domain" ]; then
  source=server
  domain="$("$HERE/remote.sh" domain 2> /dev/null || true)"
  # The server's answer is not trusted beyond a plain host name.
  valid "$domain" || domain=""
fi
if [ -z "$domain" ]; then
  source=ip
  ip="$DEPLOY_HOST"
  if ! [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    ip="$(getent ahostsv4 "$DEPLOY_HOST" | awk 'NR==1{print $1}')"
  fi
  [ -n "$ip" ] || { echo "::error::Cannot resolve the DEPLOY_HOST secret to an IPv4 address; add the repository secret DS_DOMAIN (infra/DEPLOY.md, «Подключить свой домен»)."; exit 1; }
  echo "::add-mask::$ip"
  echo "::add-mask::${ip//./-}"
  # <ip-with-dashes>.sslip.io resolves to the IP itself; it gets a real certificate.
  domain="${ip//./-}.sslip.io"
fi
valid "$domain" || { echo "::error::The DS_DOMAIN secret is not a host name."; exit 1; }
echo "::add-mask::$domain"
echo "DS_DOMAIN=$domain" >> "$GITHUB_ENV"
echo "Address set from the $source (hidden in this log, D-49)."
