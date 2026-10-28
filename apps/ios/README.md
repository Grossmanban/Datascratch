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
| `Config/*.xcconfig` | Версия, `DS_WEB_HOST` (домен Universal Links, только для `applinks:`), `DS_TEAM_ID` из `Local.xcconfig` |
| `Datascratch/App` | Точка входа, окна (WindowGroup для документа — многооконность и Stage Manager), команды меню и шорткаты, `AppModel` (сервисы), `SceneModel` (навигация окна) |
| `Datascratch/Services` | Модели (зеркало `contracts/document-model.md`), `LibraryStore` (локальное хранилище), индекс задач, аккаунт и ключ восстановления, синхронизация (статус), шеринг и маршруты ссылок, устройства и токены агентов |
| `Datascratch/Design` | Временные токены «Тихой бумаги» (`contracts/design-tokens.md`) до пакета `DSDesign` |
| `Datascratch/Features` | Экраны: боковая панель, документы (карточки/список), документ, задачи, календарь, палитра ⌘K, шеринг, настройки, онбординг |
| `Datascratch/Resources` | Иконка-заглушка, цвета, `Localizable.xcstrings` (en/ru) |
| `DatascratchTests`, `DatascratchUITests` | Юнит-тесты (Swift Testing) и UI-тесты (XCUITest) |
| `scripts/` | `generate.sh`, выбор симулятора для CI, сборка каталога строк (`l10n/`), рисование иконки-заглушки |

## Пакеты и временные замены

`scripts/generate.sh` подключает пакеты, которые есть в `Packages/`; код приложения использует их через `#if canImport(...)`, иначе — встроенные замены.

| Что | С пакетом | Без пакета |
| --- | --- | --- |
| Данные | `Integration/CoreLibrary.swift` поверх **DSCore**: документы `account` / `notebook` / `note` на Yrs, каждое обновление — в `LocalStore` (GRDB) вместе с очередью отправки; ключи блокнотов и заметок — `KeyRing` (crypto.md); в `meta` блокнота — `name`, `icon`, `space` для агентов. Тело заметки записывается точечными правками по `blockId` — блоки, которых не знает временный редактор (код, формулы, разметка с других устройств), не перезаписываются. Старый JSON переносится один раз | `LibraryStore` с JSON-файлом |
| Редактор | `Integration/NativeDocumentScreen.swift`: **DSEditor** (`EditorView`, TextKit 2 + живой штрих) над `CoreEditorDocument` (DSEditorCore) — отмена/повтор, вставка блоков, стеклянная панель пера, рисование пальцем | `StandInBlockEditor` — простой блочный редактор |
| Дизайн-токены | **DSDesign**: цвета, оттенки, `DSDateChip`, `DSTaskCheckbox`, `DSShowcase` в отладке | `Theme` с литералами из контракта |
| Аккаунт, синхронизация, шеринг, токены агентов | пока локальные реализации (`LocalAccountService`, `LocalSharingService`, `LocalAccessService`); подключение к серверу через DSCore (`AccountService`, `SyncEngine`, `APIClient`) — следующий шаг | то же |

Рисование пальцем (D-06): в режиме «Текст» палец всегда прокручивает и выделяет; рисует, когда выбран инструмент пера и включён флаг. На iPhone флаг включён по умолчанию (Pencil нет), на iPad — выключен.

Экраны обращаются только к `LibraryStore` и протоколам сервисов, поэтому подключение пакета — это новая реализация за тем же интерфейсом.

## Строки интерфейса

Ключи — английские строки в коде, переводы — `scripts/l10n/ru.json`. После изменения строк:

```bash
python3 scripts/l10n/build_catalog.py --check   # покажет непереведённые
python3 scripts/l10n/build_catalog.py           # пересоберёт Localizable.xcstrings
```
