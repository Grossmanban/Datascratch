#!/usr/bin/env bash
# Builds build/yrs_ffiFFI.xcframework (iOS device + iOS simulator + macOS) from yrs-ffi.
# Requires macOS with Xcode and rustup. Usage: scripts/build-xcframework.sh
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
TARGETS=(aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios aarch64-apple-darwin x86_64-apple-darwin)
rustup target add "${TARGETS[@]}" >/dev/null

"$ROOT/scripts/generate-bindings.sh"

cd yrs-ffi
export IPHONEOS_DEPLOYMENT_TARGET=26.0
export MACOSX_DEPLOYMENT_TARGET=26.0
for t in "${TARGETS[@]}"; do
  cargo build --release --lib --target "$t"
done

OUT="$ROOT/build"
WORK="$OUT/xcframework-work"
rm -rf "$WORK" "$OUT/yrs_ffiFFI.xcframework"
mkdir -p "$WORK/headers" "$WORK/ios-sim" "$WORK/macos"
cp target/swift/yrs_ffiFFI.h "$WORK/headers/"
cat > "$WORK/headers/module.modulemap" <<'MAP'
module yrs_ffiFFI {
    header "yrs_ffiFFI.h"
    export *
}
MAP
lipo -create target/aarch64-apple-ios-sim/release/libyrs_ffi.a target/x86_64-apple-ios/release/libyrs_ffi.a \
  -output "$WORK/ios-sim/libyrs_ffi.a"
lipo -create target/aarch64-apple-darwin/release/libyrs_ffi.a target/x86_64-apple-darwin/release/libyrs_ffi.a \
  -output "$WORK/macos/libyrs_ffi.a"
xcodebuild -create-xcframework \
  -library target/aarch64-apple-ios/release/libyrs_ffi.a -headers "$WORK/headers" \
  -library "$WORK/ios-sim/libyrs_ffi.a" -headers "$WORK/headers" \
  -library "$WORK/macos/libyrs_ffi.a" -headers "$WORK/headers" \
  -output "$OUT/yrs_ffiFFI.xcframework"
rm -rf "$WORK"
echo "$OUT/yrs_ffiFFI.xcframework ready"
