#!/usr/bin/env bash
# READ-ONLY survey of a server before deploying Datascratch next to whatever already
# runs there. Changes nothing, starts nothing, prints no secrets: only versions, names,
# ports and sizes. Output is Markdown (the deploy workflow puts it into the summary).
#   ssh user@host 'bash -s' < inspect.sh
set -uo pipefail
export LC_ALL=C

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  if sudo -n true 2> /dev/null; then SUDO="sudo -n"; else SUDO=""; fi
fi
have() { command -v "$1" > /dev/null 2>&1; }
pkg() { dpkg-query -W -f='${Status} ${Version}' "$1" 2> /dev/null | sed -n 's/^install ok installed //p'; }
section() { printf '\n### %s\n\n```\n' "$1"; }
end() { printf '```\n'; }

echo "## Server survey (read-only)"
[ "$(id -u)" -eq 0 ] || echo "_Connected as $(id -un)$([ -n "$SUDO" ] && echo ' (sudo available)' || echo ' (no sudo: some details may be missing)')_"

section "System"
. /etc/os-release 2> /dev/null && echo "OS: ${PRETTY_NAME:-unknown}"
echo "Kernel: $(uname -r)  Arch: $(uname -m)"
echo "Uptime: $(uptime -p 2> /dev/null || uptime)"
echo "CPU: $(nproc) x $(grep -m1 'model name' /proc/cpuinfo 2> /dev/null | cut -d: -f2- | sed 's/^ *//')"
echo "Load: $(cut -d' ' -f1-3 /proc/loadavg)"
end

section "Memory (MB)"
free -m
end

section "Disk"
df -h -x tmpfs -x devtmpfs -x overlay 2> /dev/null || df -h
[ -d /var/lib/docker ] && echo && echo "Docker data: $($SUDO du -sh /var/lib/docker 2> /dev/null | cut -f1)"
end

section "Listening ports (TCP/UDP)"
if have ss; then
  # Process names only (no command lines).
  $SUDO ss -H -ltnup 2> /dev/null | awk '{proc=$7; sub(/^users:\(\("/, "", proc); sub(/".*/, "", proc); printf "%-5s %-28s %s\n", $1, $5, proc}' | sort -u
else
  echo "ss not available"
fi
end

section "Docker"
if have docker; then
  docker --version 2> /dev/null
  docker compose version 2> /dev/null || echo "compose plugin: not installed"
  for p in docker-ce docker.io moby-engine podman-docker docker-compose-plugin docker-compose-v2 docker-compose; do
    v=$(pkg "$p")
    [ -n "$v" ] && echo "package: $p $v"
  done
  echo
  echo "Containers (name | image | status | ports):"
  $SUDO docker ps -a --format '{{.Names}} | {{.Image}} | {{.Status}} | {{.Ports}}' 2> /dev/null || echo "(no access to the Docker daemon)"
  echo
  echo "Memory use (name | mem):"
  $SUDO docker stats --no-stream --format '{{.Name}} | {{.MemUsage}}' 2> /dev/null || true
  echo
  echo "Compose projects:"
  $SUDO docker compose ls -a 2> /dev/null || true
  echo
  echo "Networks:"
  $SUDO docker network ls --format '{{.Name}} ({{.Driver}})' 2> /dev/null || true
  echo
  echo "Volumes: $($SUDO docker volume ls -q 2> /dev/null | wc -l)"
  # Reverse proxies configured through container labels (rules only, no other labels).
  rules=$($SUDO docker ps -q 2> /dev/null | xargs -r $SUDO docker inspect --format '{{.Name}}{{range $k, $v := .Config.Labels}}{{if or (eq (printf "%.15s" $k) "traefik.http.ro") (eq $k "caddy")}} {{$k}}={{$v}}{{end}}{{end}}' 2> /dev/null | grep '=' || true)
  [ -n "$rules" ] && echo && echo "Proxy labels:" && echo "$rules"
else
  echo "docker: not installed"
fi
end

section "Web servers and reverse proxies"
for svc in nginx apache2 httpd caddy traefik haproxy; do
  if have "$svc" || systemctl cat "$svc.service" > /dev/null 2>&1; then
    echo "$svc: installed, service $(systemctl is-active "$svc" 2> /dev/null || echo unknown)"
  fi
done
if have nginx; then
  echo
  echo "nginx $(nginx -v 2>&1 | sed 's/.*version: //') — sites (server_name / listen only):"
  $SUDO nginx -T 2> /dev/null | grep -E '^\s*(server_name|listen)\s' | sed 's/^\s*//' | sort | uniq -c || echo "(cannot read the configuration)"
  echo
  echo "Enabled site files:" /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*
fi
if have apache2ctl; then
  echo
  echo "apache virtual hosts:"
  $SUDO apache2ctl -S 2> /dev/null | grep -E 'namevhost|port' | sed 's/^\s*//' || true
fi
f=/etc/caddy/Caddyfile
if [ -r "$f" ] || $SUDO test -r "$f" 2> /dev/null; then
  echo
  echo "Caddy sites ($f, addresses only):"
  $SUDO cat "$f" 2> /dev/null | grep -E '^[^[:space:]#(].*\{\s*$' | sed 's/\s*{\s*$//' || true
fi
have certbot && echo && echo "certbot: installed ($($SUDO certbot certificates 2> /dev/null | grep -c 'Certificate Name') certificates)"
end

section "Firewall"
if have ufw; then
  $SUDO ufw status verbose 2> /dev/null || echo "ufw installed (status needs root)"
else
  echo "ufw: not installed"
fi
have nft && echo "nftables rules: $($SUDO nft list ruleset 2> /dev/null | grep -c . || echo '?') lines"
end

section "Automatic updates"
if [ -n "$(pkg unattended-upgrades)" ]; then
  echo "unattended-upgrades: installed"
  grep -h -E 'Unattended-Upgrade|Update-Package-Lists' /etc/apt/apt.conf.d/*auto-upgrades 2> /dev/null || true
else
  echo "unattended-upgrades: not installed"
fi
end

section "Scheduled jobs (names only)"
echo "root crontab:"
$SUDO crontab -l -u root 2> /dev/null | grep -vE '^\s*(#|$)' | awk '{cmd=""; for (i=6;i<=NF;i++) if ($i !~ /^[A-Z_]+=/) {cmd=$i; break}; n=split(cmd, p, "/"); print "  " $1" "$2" "$3" "$4" "$5"  " p[n]}' || echo "  (none or no access)"
echo "/etc/cron.d: $(ls /etc/cron.d 2> /dev/null | tr '\n' ' ')"
echo "systemd timers: $(systemctl list-timers --all --no-legend 2> /dev/null | awk '{print $(NF-1)}' | grep -v '^$' | tr '\n' ' ')"
end

section "/opt (top level)"
ls -la /opt 2> /dev/null | tail -n +2 | awk '{print $1, $3, $NF}'
end

section "Datascratch"
if [ -d /opt/datascratch ]; then
  echo "/opt/datascratch exists (previous deploy): $(ls /opt/datascratch 2> /dev/null | tr '\n' ' ')"
  grep -E '^DS_(TAG|DOMAIN|MODE)=' /opt/datascratch/.env 2> /dev/null || $SUDO grep -E '^DS_(TAG|DOMAIN|MODE)=' /opt/datascratch/.env 2> /dev/null || true
else
  echo "not deployed yet"
fi
end

# Agent access diagnostics (read-only; the owner allowed it 2026-10-26). Prints only ids, modes,
# flags, times and error messages — no names, emails, keys, tokens or note content.
srv=$($SUDO docker ps --format '{{.Names}} {{.Image}}' 2> /dev/null | awk '/datascratch-server/ {print $1; exit}')
pg=$($SUDO docker ps --format '{{.Names}} {{.Image}}' 2> /dev/null | awk '/datascratch-postgres/ {print $1; exit}')
if [ -n "$srv" ]; then
  section "Server log: agent read failures (last 6 h)"
  $SUDO docker logs --since 6h "$srv" 2>&1 | grep -E 'could not be decrypted|decrypt|agent:' |
    sed -E 's/"(email|token|authorization|cookie|ip|remoteAddress|userAgent)":"[^"]*"/"\1":"…"/g' | tail -40
  end
fi
if [ -n "$pg" ]; then
  section "Agent access (metadata only)"
  $SUDO docker exec -i "$pg" sh -c 'psql -X -q -U "$POSTGRES_USER" -d "$POSTGRES_DB" -P pager=off' 2>&1 << 'SQL' | head -80
\echo Grants: kind | permission | created | revoked | expires | last used | notebooks (id prefix : mode : server key)
SELECT g.kind, g.permission, g.created_at, g.revoked_at, g.expires_at, g.last_used_at,
       (SELECT string_agg(left(gid::text, 13) || ':' || coalesce(n.mode::text, 'MISSING') || ':' || coalesce((n.server_wrapped_key IS NOT NULL)::text, '-'), ', ')
          FROM unnest(g.notebook_ids) AS gid LEFT JOIN notebooks n ON n.id = gid) AS notebooks
  FROM agent_grants g ORDER BY g.created_at DESC LIMIT 6;
\echo Agent-mode notebooks: id prefix | server key | last update seq | update devices (last 10)
SELECT left(n.id::text, 13) AS id, n.server_wrapped_key IS NOT NULL AS server_key, d.last_seq,
       (SELECT string_agg(x.dev || '@' || x.seq, ' ') FROM (SELECT left(u.device_id, 18) AS dev, u.seq FROM doc_updates u WHERE u.doc_id = n.id ORDER BY u.seq DESC LIMIT 10) x) AS recent
  FROM notebooks n LEFT JOIN docs d ON d.id = n.id WHERE n.mode = 'agent';
\echo Recent notebook-doc updates of agent notebooks: seq | device prefix | device kind | payload bytes | envelope head
SELECT u.seq, left(u.device_id, 13) AS device,
       CASE WHEN u.device_id LIKE 'agent:%' THEN 'agent'
            ELSE coalesce((SELECT CASE WHEN dv.name ILIKE '%ipad%' THEN 'iPad' WHEN dv.name ILIKE '%iphone%' THEN 'iPhone'
                                       WHEN dv.name ILIKE '%mac%' OR dv.name ILIKE '%safari%' OR dv.name ILIKE '%chrome%' OR dv.name ILIKE '%web%' OR dv.name ILIKE '%browser%' THEN 'web'
                                       ELSE 'other' END FROM devices dv WHERE dv.id::text = u.device_id), 'unknown') END AS kind,
       octet_length(u.payload) AS bytes, encode(substring(u.payload from 1 for 4), 'hex') AS head
  FROM doc_updates u JOIN notebooks n ON n.id = u.doc_id AND n.mode = 'agent'
  ORDER BY u.seq DESC LIMIT 14;
\echo Snapshots of agent notebooks and their notes: doc prefix | base seq | device prefix | device kind | created | bytes
SELECT left(sn.doc_id::text, 13) AS doc, sn.seq, left(sn.device_id, 13) AS device,
       CASE WHEN sn.device_id LIKE 'agent:%' THEN 'agent'
            ELSE coalesce((SELECT CASE WHEN dv.name ILIKE '%ipad%' THEN 'iPad' WHEN dv.name ILIKE '%iphone%' THEN 'iPhone' ELSE 'web/other' END
                             FROM devices dv WHERE dv.id::text = sn.device_id), 'unknown') END AS kind,
       sn.created_at, octet_length(sn.payload) AS bytes
  FROM doc_snapshots sn JOIN docs d ON d.id = sn.doc_id JOIN notebooks n ON n.id = d.notebook_id AND n.mode = 'agent'
  ORDER BY sn.created_at DESC LIMIT 12;
SQL
  end
fi
