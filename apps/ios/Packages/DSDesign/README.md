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
| `DSSpaceTile` | Плитка пространства / блокнота: эмодзи или буква на его `tint` |
| `DSCard`, `DSDocCard` | Карточка и документ-карточка: миниатюра обложки — только своё изображение (spec 12.7), без обложки — без полосы |
| `DSEmptyState` | Пустые состояния |
| `DSButtonStyle` (`.buttonStyle(.ds(.primary))`) | Кнопки: primary / secondary / ghost / destructive |
| `DSSegmentedControl` | Переключатель видов |
| `DSSkeleton`, `DSSkeletonLines`, `DSSpinner` | Загрузка |
| `DSAvatar`, `DSAvatarStack` | Аватары и присутствие |
| `DSTaskRow`, `DSTag` | Строка задачи целиком: чек-бокс, название, заметка, даты, теги, документ-источник (контекстное меню — у вызывающего) |
| `DSDocRow`, `DSDocIcon`, `DSDocGrid` | Строка документа в списке (иконка, заголовок с засечками, выдержка, дата, цвет папки) и адаптивная сетка карточек |
| `DSPenToolbar`, `DSPenSelection`, `DSPenTool`, `DSPenColor`, `DSPenWidth`, `DSEraserMode` | Палитра пера «Тихой бумаги» (как `PenToolbar` в вебе): инструменты стоят в тихом стеклянном лотке и выглядывают из его нижнего края, выбранный поднимается на 10 pt с пружиной; режим «Текст» (`tool == nil`), ручка / карандаш / маркер / текстовыделитель / ластик («штрих / пиксель» повторным нажатием) / лассо. Цвета: готовые `ink.*` (для текстовыделителя — `highlight.*`), до 6 недавних своих цветов и «+» — системный выбор цвета; свой цвет хранится как `#RRGGBB` (`DSPenColor.custom`, `tokenValue` — значение для `strokes.md` §1, в тёмной теме не осветляется). Толщина — 3 шага точками реальной толщины (множитель базовой толщины редактора 0.6 / 1 / 1.6). Рисование пальцем, отменить / повторить. `compact: true` (iPhone) — инструменты в ряд по 44 pt + «Ещё» (цвета, толщина, палец, отмена). `isCollapsed:` — палитра сворачивается в круглую кнопку с текущим пером. Логика переключения — `DSPenSelection.selecting(…)` |
| `DSPenNib(tool:color:)`, `DSRecentPenColors`, `DSPenToolbarGallery` | Реалистичное залитое перо: бумажный корпус с мягким градиентом и бликом, кольцо и кончик цвета чернил (у ручки металлическая обойма, у карандаша — деревянная), маркер, скошенный текстовыделитель, ластик, лассо пунктиром; размер 20×52 pt. Недавние свои цвета — `UserDefaults` `ds.pen.recent.ink` / `ds.pen.recent.highlight` (JSON, до 6, новые первыми). Галерея всех состояний палитры — снимки `pen-light.png` / `pen-dark.png` в CI |
| `DSPenMode`, `DSPenToolbar(mode:color:width:drawWithFinger:…)` | Плоский режим пера для редактора: text / pen / pencil / marker / highlighter / strokeEraser / pixelEraser / lasso; палитра на простых `Binding` (`DSPenSelection.mode` — то же в одном значении); `DSPenWidth.points(base:)` |
| `DSFormatBar`, `DSFormatBarItem`, `DSFormatBarElement` | Стеклянная панель форматирования с активными состояниями и разделителями |
| `DSInlineChip`, `DSInlineChipStyle` (`.wikiLink`, `.tag(_:)`) | Плашки `[[ссылок]]` и `#тегов` в тексте; `renderImage(…)` — картинка для `NSTextAttachment`, `uiFont(for:)` — метрики |
| `DSSuggestionList`, `DSSuggestionGroup`, `DSSuggestionItem` | Меню «/» и `[[ ]]` (как `SuggestionMenu` в вебе): группы, плитки иконок, подсказки сокращений, прокрутка к выбранному; клавиатуру ведёт редактор |
| `DSCalloutTone` | Тона выносок note / info / success / warning / danger → `tint` gray / blue / green / yellow / red, цвета и SF Symbol |

| `DSSettingsSection`, `DSSettingsRow`, `.dsSettingsRow` | Экраны настроек «Тихая бумага»: карточка-секция с волосяными разделителями, строка с нейтральной иконкой-плиткой, значение, шеврон / переключатель / бейдж / своя вьюшка, деструктивная роль |
| `DSProfileHeader`, `DSSyncChip`, `DSSyncState` | Шапка профиля (аватар, имя, почта) и чип статуса синхронизации |
| `DSCallout` | Тонированное предупреждение с действием (например, «Проверьте ключ восстановления») |
| `DSSettingsSampleScreen` | Образцы экранов «Настройки» и «Аккаунт» (снимки в CI: `settings-*.png`, `account-*.png`) |
| `DSShowcase` | Все компоненты на одном экране (превью, отладочный экран, снимки в CI) |

У каждого компонента есть превью (`#Preview`) в светлой и тёмной теме.

Подключение в приложении: локальная зависимость `.package(path: "Packages/DSDesign")`, продукт `DSDesign`.

## Сборка и тесты

```bash
xcodebuild -scheme DSDesign -destination 'generic/platform=iOS Simulator' build
xcodebuild -scheme DSDesign -destination 'platform=iOS Simulator,name=<iPhone>' test
```

В CI — `.github/workflows/design.yml` (macOS). Тесты — Swift Testing (`Tests/DSDesignTests`). CI также рендерит `DSShowcase` в PNG (светлая и тёмная тема) и выкладывает артефактом `dsdesign-snapshots` — для проверки дизайна без Mac. Локально: `TEST_RUNNER_DS_SNAPSHOT_DIR=/tmp/snap xcodebuild test …`.

Для UI-тестов у кнопок палитры пера есть `accessibilityIdentifier`: `tool.text`, `tool.pen` … `tool.lasso`, `tool.more`, `tool.finger`, `tool.undo`, `tool.redo`, `tool.collapse`, `tool.expand`, `color.<имя>`, `color.recent.<N>`, `color.custom`, `width.<1–3>`.

`ImageRenderer` не рисует Liquid Glass, поэтому снимки ставят `.environment(\.dsGlassFallback, true)` — `.dsGlass` рисуется сплошной приподнятой поверхностью.

Правила дат (`DSDateChipModel`) совпадают с вебом (`packages/ui/src/lib/date.ts`): одинаковые подписи и тона, общие тестовые случаи.
