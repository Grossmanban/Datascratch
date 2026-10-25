# DSDesign — дизайн-система «Тихая бумага» для iOS

Swift-пакет (iOS 26, Swift 6) с токенами и SwiftUI-компонентами дизайн-системы (D-15, D-38). Поток: design-system (D-39). Веб-аналог — `packages/ui`.

## Токены

`Sources/DSDesign/Tokens.generated.swift` **генерируется** из `packages/design-tokens/tokens.json` — руками не править:

```bash
pnpm --filter @datascratch/design-tokens generate   # пересобрать
pnpm --filter @datascratch/design-tokens check      # CI: сгенерированное совпадает с закоммиченным
```

Имена токенов — контракт (`docs/architecture/contracts/design-tokens.md`), значения — ПРЕДЛОЖЕНО.

## Как пользоваться

```swift
import DSDesign

Text("Заголовок").dsFont(.h1)                      // New York, Dynamic Type
    .foregroundStyle(.ds(.textPrimary))           // семантический цвет, светлая/тёмная тема
Text("#идеи").foregroundStyle(.dsTint(.purple))  // цвет папки/тега
Path().stroke(.ink(.blue))                        // чернила пера (в тёмной теме осветлены)

card.dsShadow(.card)                              // мягкая тень
withDSAnimation(.snappy) { isOpen.toggle() }      // пружина, уважает «Уменьшение движения»
DSHaptics.taskComplete()                          // тактильная отдача
```

## Компоненты

| Компонент | Что это |
| --- | --- |
| `DSGlassPanel`, `.dsGlass()` | Плавающие стеклянные панели (Liquid Glass) |
| `DSBackdrop`, `DSGrain` | Мягкие градиентные подложки с зерном бумаги |
| `DSSidebarSection`, `DSSidebarItem` | Боковая панель как в Craft: иконка, цвет, счётчик, раскрытие |
| `DSDateChip`, `DSDateChipModel` | «Сегодня / Завтра / дата», красный для просрочки (ru/en) |
| `DSTagChip`, `DSBadge` | Теги и счётчики |
| `DSTaskCheckbox` | Круглый чек-бокс задачи с анимацией и тактильной отдачей |
| `DSCard`, `DSDocCard` | Карточка и документ-карточка с обложкой |
| `DSEmptyState` | Пустые состояния |
| `DSButtonStyle` (`.buttonStyle(.ds(.primary))`) | Кнопки: primary / secondary / ghost / destructive |
| `DSSegmentedControl` | Переключатель видов |
| `DSSkeleton`, `DSSkeletonLines`, `DSSpinner` | Загрузка |
| `DSAvatar`, `DSAvatarStack` | Аватары и присутствие |
| `DSTaskRow`, `DSTag` | Строка задачи целиком: чек-бокс, название, заметка, даты, теги, документ-источник (контекстное меню — у вызывающего) |
| `DSDocRow`, `DSDocIcon`, `DSDocGrid` | Строка документа в списке (иконка, заголовок с засечками, выдержка, дата, цвет папки) и адаптивная сетка карточек |
| `DSPenToolbar`, `DSPenSelection`, `DSPenTool`, `DSPenWidth` | Стеклянная палитра пера: перо / маркер / ластик / лассо, чернила и маркеры из токенов, три толщины (как в вебе: перо 1.5/2.5/4, маркер 10/16/24, ластик 8/16/32 pt) |
| `DSFormatBar`, `DSFormatBarItem`, `DSFormatBarElement` | Стеклянная панель форматирования с активными состояниями и разделителями |

| `DSShowcase` | Все компоненты на одном экране (превью, отладочный экран, снимки в CI) |

У каждого компонента есть превью (`#Preview`) в светлой и тёмной теме.

Подключение в приложении: локальная зависимость `.package(path: "Packages/DSDesign")`, продукт `DSDesign`.

## Сборка и тесты

```bash
xcodebuild -scheme DSDesign -destination 'generic/platform=iOS Simulator' build
xcodebuild -scheme DSDesign -destination 'platform=iOS Simulator,name=<iPhone>' test
```

В CI — `.github/workflows/design.yml` (macOS). Тесты — Swift Testing (`Tests/DSDesignTests`). CI также рендерит `DSShowcase` в PNG (светлая и тёмная тема) и выкладывает артефактом `dsdesign-snapshots` — для проверки дизайна без Mac. Локально: `TEST_RUNNER_DS_SNAPSHOT_DIR=/tmp/snap xcodebuild test …`.

Правила дат (`DSDateChipModel`) совпадают с вебом (`packages/ui/src/lib/date.ts`): одинаковые подписи и тона, общие тестовые случаи.
