# apps/ios — iPhone + iPad

Нативное universal-приложение Datascratch: Swift 6, SwiftUI (оболочка), iOS/iPadOS 26+ (D-32), bundle `com.datascratch.app` (D-33). Проект описан текстом через XcodeGen — Xcode-проект в git не хранится.

## Сборка

```bash
brew install xcodegen
cd apps/ios
cp Config/Local.xcconfig.example Config/Local.xcconfig   # Team ID (не хранится в git)
scripts/generate.sh                                      # создаёт Datascratch.xcodeproj
open Datascratch.xcodeproj
```

`scripts/generate.sh` подключает те локальные пакеты из `Packages/`, которые уже существуют (`DSCore`, `DSEditor`, `DSDesign` — их пишут другие потоки). Пока пакета нет, приложение использует встроенную временную замену.

- CI: `.github/workflows/ios-app.yml` — сборка и тесты (юнит + UI) на симуляторах iPad и iPhone.
- TestFlight без Mac: `.github/workflows/ios-release.yml`, инструкция — [`RELEASE.md`](RELEASE.md).

## Структура

| Путь | Что |
| --- | --- |
| `project.yml` | Описание проекта XcodeGen: цели, Info.plist, entitlements (Associated Domains), схемы |
| `Config/*.xcconfig` | Версия, `DS_WEB_HOST` (домен ссылок), `DS_SERVER_URL` (сервер), `DS_TEAM_ID` из `Local.xcconfig` |
| `Datascratch/App` | Точка входа, окна (WindowGroup для документа — многооконность и Stage Manager), команды меню и шорткаты, `AppModel` (сервисы), `SceneModel` (навигация окна) |
| `Datascratch/Services` | Модели (зеркало `contracts/document-model.md`), `LibraryStore` (локальное хранилище), индекс задач, аккаунт и ключ восстановления, синхронизация (статус), шеринг и маршруты ссылок, устройства и токены агентов |
| `Datascratch/Design` | Временные токены «Тихой бумаги» (`contracts/design-tokens.md`) до пакета `DSDesign` |
| `Datascratch/Features` | Экраны: боковая панель, документы (карточки/список), документ, задачи, календарь, палитра ⌘K, шеринг, настройки, онбординг |
| `Datascratch/Resources` | Иконка-заглушка, цвета, `Localizable.xcstrings` (en/ru) |
| `DatascratchTests`, `DatascratchUITests` | Юнит-тесты (Swift Testing) и UI-тесты (XCUITest) |
| `scripts/` | `generate.sh`, выбор симулятора для CI, сборка каталога строк (`l10n/`), рисование иконки-заглушки |

## Временные замены (до пакетов других потоков)

| Что | Сейчас | Будет |
| --- | --- | --- |
| Данные, шифрование, синхронизация | `LibraryStore` — JSON в Application Support; `LocalAccountService` — учётная запись на устройстве (SHA-256 вместо Argon2id); `SyncCenter` — только статус сети | `DSCore`: Yrs-документы, GRDB, libsodium, клиент API и синхронизации |
| Редактор | `StandInBlockEditor` — простой блочный редактор (Markdown-сокращения, задачи) | `DSEditor`: TextKit 2 + Yrs + слой пера |
| Дизайн-токены | `Theme` (значения из контракта) | `DSDesign` |
| Шеринг, токены агентов, устройства | Локальные заглушки с тем же интерфейсом (`SharingService`, `AccessService`) | Реализация через REST (`contracts/api.md`) в `DSCore` |

Интерфейс приложения обращается только к протоколам и `LibraryStore`, поэтому замена — это новые реализации сервисов, а не переписывание экранов.

## Строки интерфейса

Ключи — английские строки в коде, переводы — `scripts/l10n/ru.json`. После изменения строк:

```bash
python3 scripts/l10n/build_catalog.py --check   # покажет непереведённые
python3 scripts/l10n/build_catalog.py           # пересоберёт Localizable.xcstrings
```
