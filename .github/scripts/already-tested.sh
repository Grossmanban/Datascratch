#!/usr/bin/env bash
# Skip a repeat of the slow macOS checks on main (D-46): when this workflow already passed on a
# commit whose files under the given paths are identical to HEAD — typically the branch tip that
# was just merged — the result cannot differ, so the macOS jobs are skipped.
#
# Usage: already-tested.sh <workflow file> <path>...
# Env:   GH_TOKEN, GITHUB_OUTPUT; KNOWN_FAILING_STEP (optional) — a failed run still counts as
#        passed when this step is the only one that failed (ios-editor's demo-only crash step).
# Output: skip=true|false in $GITHUB_OUTPUT.
set -euo pipefail
wf=$1
shift

passed() {
  local id=$1 conclusion=$2
  [ "$conclusion" = success ] && return 0
  [ "$conclusion" = failure ] && [ -n "${KNOWN_FAILING_STEP:-}" ] || return 1
  local failed
  failed=$(gh run view "$id" --json jobs \
    -q '[.jobs[] | select(.conclusion == "failure") | .steps[] | select(.conclusion == "failure") | .name] | unique | join("\n")')
  [ "$failed" = "$KNOWN_FAILING_STEP" ]
}

while read -r id sha conclusion; do
  [ -n "$id" ] || continue
  [ "$sha" = "$GITHUB_SHA" ] && continue
  passed "$id" "$conclusion" || continue
  git cat-file -e "$sha^{commit}" 2>/dev/null || git fetch -q --depth=1 origin "$sha" 2>/dev/null || continue
  if git diff --quiet "$sha" HEAD -- "$@"; then
    echo "::notice title=Already tested::$wf passed on ${sha:0:7} with the same files — macOS jobs skipped (run $id)."
    echo "skip=true" >> "$GITHUB_OUTPUT"
    exit 0
  fi
done < <(gh run list --workflow "$wf" --limit 40 --json databaseId,headSha,status,conclusion \
  -q '.[] | select(.status == "completed") | "\(.databaseId) \(.headSha) \(.conclusion)"')

echo "skip=false" >> "$GITHUB_OUTPUT"
