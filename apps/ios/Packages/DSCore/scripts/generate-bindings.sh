#!/usr/bin/env bash
# Regenerates the UniFFI Swift bindings (Sources/YrsFFI/yrs_ffi.swift) and the C header
# from yrs-ffi. Works on macOS and Linux. Usage: scripts/generate-bindings.sh
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
cd yrs-ffi
cargo build --lib --quiet
case "$(uname)" in
  Darwin) LIB=target/debug/libyrs_ffi.dylib ;;
  *) LIB=target/debug/libyrs_ffi.so ;;
esac
rm -rf target/swift
cargo run --quiet --features cli --bin uniffi-bindgen -- generate --library "$LIB" --language swift --out-dir target/swift >/dev/null 2>&1 || \
  cargo run --quiet --features cli --bin uniffi-bindgen -- generate --library "$LIB" --language swift --out-dir target/swift
cp target/swift/yrs_ffi.swift "$ROOT/Sources/YrsFFI/yrs_ffi.swift"
cp target/swift/yrs_ffiFFI.h "$ROOT/Sources/yrs_ffiFFI/include/yrs_ffiFFI.h"
echo "bindings regenerated"
