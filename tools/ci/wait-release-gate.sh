#!/usr/bin/env bash
# Waits for the ios-app release gate (D-46): returns as soon as the "UI tests (smoke — release
# gate)" step has passed on every device of the run, without waiting for the full UI suite.
# Exit 0 = gate green (a TestFlight build may start), 1 = gate failed or the run ended without it.
#
# Usage: tools/ci/wait-release-gate.sh <run id> [repo]
set -euo pipefail
run=$1
repo=${2:-Grossmanban/Datascratch}
gate='UI tests (smoke — release gate)'
while :; do
  json=$(gh run view "$run" -R "$repo" --json status,jobs)
  states=$(jq -r --arg g "$gate" '[.jobs[] | select(.name | startswith("Build & test")) |
    ((.steps // []) | map(select(.name == $g)) | .[0] // {}) |
    (if .conclusion == "success" then "ok" elif (.conclusion // "") != "" and .conclusion != "skipped" then "fail" else "wait" end)] | join(" ")' <<<"$json")
  status=$(jq -r .status <<<"$json")
  echo "$(date -u +%H:%M) $status gate: $states"
  case " $states " in *" fail "*) exit 1 ;; esac
  if [ -n "$states" ] && [[ " $states " != *" wait "* ]]; then exit 0; fi
  [ "$status" = completed ] && exit 1
  sleep 30
done
