#!/usr/bin/env bash
# Short hash of everything that goes into yrs_ffiFFI.xcframework (Rust sources, vendored yrs,
# lockfile, generated header). Names the GitHub release that hosts the binary.
set -euo pipefail
cd "$(dirname "$0")/.."
git ls-files -- yrs-ffi/Cargo.toml yrs-ffi/Cargo.lock yrs-ffi/src yrs-ffi/vendor Sources/yrs_ffiFFI/include scripts/build-xcframework.sh \
  | LC_ALL=C sort | xargs git hash-object | git hash-object --stdin | cut -c1-12
