#!/usr/bin/env bash
# Prints an xcodebuild destination for the newest available simulator of a
# device family ("iPad" or "iPhone"), so CI does not depend on exact names.
set -euo pipefail
family="$1"
xcrun simctl list devices available --json | python3 -c '
import json, sys, re
family = sys.argv[1]
data = json.load(sys.stdin)["devices"]
best = None
for runtime, devices in data.items():
    m = re.search(r"iOS-(\d+)-(\d+)", runtime)
    if not m:
        continue
    ver = (int(m.group(1)), int(m.group(2)))
    if ver[0] < 26:
        continue
    for d in devices:
        name = d["name"]
        if not name.startswith(family):
            continue
        # prefer Pro models (Pencil Pro class iPads), then newest runtime
        score = (ver, "Pro" in name, name)
        if best is None or score > best[0]:
            best = (score, d["udid"])
if best is None:
    sys.exit("no simulator for " + family)
print("platform=iOS Simulator,id=" + best[1])
' "$family"
