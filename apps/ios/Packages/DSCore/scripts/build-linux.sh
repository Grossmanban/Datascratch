#!/usr/bin/env bash
# Linux development build (cloud sessions without Xcode): builds yrs-ffi for the host as a
# static library into build/linux so that `swift build` / `swift test` work on Linux.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
"$ROOT/scripts/generate-bindings.sh"
(cd yrs-ffi && cargo build --release --lib --quiet)
mkdir -p build/linux
cp yrs-ffi/target/release/libyrs_ffi.a build/linux/
echo "build/linux/libyrs_ffi.a ready"
