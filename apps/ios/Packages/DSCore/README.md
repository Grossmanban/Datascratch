# DSCore

Ядро данных iOS-приложения Datascratch (поток ios-core, D-39): модель документа на Yrs,
криптография, локальное хранилище, REST- и sync-клиенты. На нём строятся `DSEditor` и приложение.

Статус: в работе. Полное описание публичного API — ниже по мере готовности.

## Сборка

- **macOS (Xcode 26+, rustup):** `scripts/build-xcframework.sh` собирает `build/yrs_ffiFFI.xcframework`
  (Rust-библиотека Yrs для iOS-устройства, симулятора и macOS). После этого пакет открывается в
  Xcode / `xcodebuild test -scheme DSCore`.
- **Linux (облачные сессии):** `scripts/build-linux.sh`, затем `swift build` / `swift test`
  (Swift 6.2+, `libsodium-dev`, `libsqlite3-dev`).
- `scripts/generate-bindings.sh` — перегенерировать Swift-привязки после правки `yrs-ffi/src`.
