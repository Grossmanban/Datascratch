#!/usr/bin/env python3
"""Print the `-only-testing:` arguments for one shard of the UI suite (one per line).

The full UI suite runs on several machines at once (owner, 2026-11-08: "a check takes 45 min").
Every test method of DatascratchUITests is listed from the sources, the release-gate smoke tests
(already run in the build job) are left out, and the rest is dealt round-robin over the shards in
a fixed order, so each shard gets a fair share and every test runs in exactly one shard.

usage: ui-test-shard.py <shard 1..N> <N> [smoke test ids...]
       ui-test-shard.py --list [smoke test ids...]   # every test that some shard runs
A smoke id is `Class` or `Class/testMethod`, as in SMOKE_UI_TESTS.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent / "DatascratchUITests"
CLASS = re.compile(r"^(?:@\w+\s+)*(?:(?:final|public|open|internal)\s+)*class\s+(\w+)\s*:\s*XCTestCase\b")
EXT = re.compile(r"^extension\s+(\w+)\b")
TEST = re.compile(r"^\s+(?:@\w+\s+)*(?:(?:override|public|internal)\s+)*func\s+(test\w*)\s*\(\s*\)")


def all_tests():
    test_classes = set()
    found = []
    files = sorted(ROOT.glob("*.swift"))
    # First pass: which types are XCTestCase subclasses (extensions may live in other files).
    for f in files:
        for line in f.read_text(encoding="utf-8").splitlines():
            m = CLASS.match(line)
            if m:
                test_classes.add(m.group(1))
    for f in files:
        current = None
        for line in f.read_text(encoding="utf-8").splitlines():
            m = CLASS.match(line)
            if m:
                current = m.group(1)
                continue
            m = EXT.match(line)
            if m:
                current = m.group(1) if m.group(1) in test_classes else None
                continue
            if re.match(r"^(?:\S.*\s)?(?:class|struct|enum|actor)\s+\w+", line) and not line.startswith(" "):
                current = None  # a top-level helper type
                continue
            m = TEST.match(line)
            if m and current:
                found.append(f"{current}/{m.group(1)}")
    return sorted(set(found))


def main(argv):
    if not argv:
        sys.exit(__doc__)
    if argv[0] == "--list":
        shard, count, smoke = None, None, argv[1:]
    else:
        shard, count, smoke = int(argv[0]), int(argv[1]), argv[2:]
        if not 1 <= shard <= count:
            sys.exit(f"shard {shard} is not in 1..{count}")
    def is_smoke(t):
        cls = t.split("/")[0]
        return t in smoke or cls in smoke
    tests = [t for t in all_tests() if not is_smoke(t)]
    if not tests:
        sys.exit("no UI tests found")
    mine = tests if shard is None else tests[shard - 1 :: count]
    for t in mine:
        print(t if shard is None else f"-only-testing:DatascratchUITests/{t}")


if __name__ == "__main__":
    main(sys.argv[1:])
