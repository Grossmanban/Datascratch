# @datascratch/ui — веб-компоненты «Тихая бумага»

React 19 + Radix + Tailwind v4 + Motion + иконки Lucide (D-15, D-38). Токены — `@datascratch/design-tokens`. Поток: design-system (D-39). iOS-аналог — `apps/ios/Packages/DSDesign`.

## Подключение

```tsx
// main.tsx
import "@datascratch/ui/fonts.css";   // Source Serif 4, Inter, JetBrains Mono (локально, работает офлайн)
import "@datascratch/ui/styles.css";  // Tailwind v4 + токены + утилиты дизайн-системы
import { UIProvider } from "@datascratch/ui";

<UIProvider locale="ru" theme="system">
  <App />
</UIProvider>
```

`styles.css` импортирует Tailwind и сам сканирует исходники пакета (`@source`). Приложение, которое собирает свой Tailwind (`@tailwindcss/vite`), импортирует этот файл в свой главный CSS и добавляет `@source` для своих файлов. Пакет поставляется исходниками TypeScript (Vite их собирает сам).

`UIProvider`: язык (ru/en), уважение к «Уменьшению движения» (Motion), подсказки, тосты и (необязательно) тема — `data-theme` на `<html>`; `"system"` следует настройке ОС без мигания.

## Компоненты

| Группа | Компоненты |
| --- | --- |
| Кнопки | `Button` (primary / ink / secondary / ghost / danger, `loading`, `asChild`), `IconButton` (подсказка с горячей клавишей), `Kbd` |
| Поля | `Input` (иконки, `bare` для заголовков), `TextArea` (растёт с текстом) |
| Выбор | `Checkbox`, `TaskCheckbox` (круглый, пружина + рисование галочки + всплеск; `open / done / cancelled`), `Switch`, `SegmentedControl` (скользящая плашка), `Tabs` |
| Всплывающее | `Tooltip`, `Popover`, `DropdownMenu`, `ContextMenu` (главный способ действий, D-38), `Dialog`, `Sheet` (справа или снизу), `CommandPalette` (cmdk, ⌘K, `useCommandPaletteShortcut`), `Toast` (`useToast`, действие «Отменить») |
| Даты | `DateChip` (Сегодня / Завтра / день недели / дата; красный — просрочено), `DatePicker` (быстрый выбор + календарь), `Calendar` (полная клавиатурная навигация) |
| Метки и люди | `Badge`, `TagChip`, `Avatar` (присутствие), `AvatarStack` |
| Поверхности | `Card`, `DocCard` (обложка или подложка, заголовок с засечками), `GlassPanel`, `Backdrop` (градиент + зерно) |
| Навигация | `Sidebar`, `SidebarSection` (сворачивается, действие при наведении), `SidebarItem` (иконка, цвет, счётчик, вложенность, ←/→ раскрывают) |
| Списки | `TaskRow` (задача целиком: чек-бокс, заметка, даты, теги, «из «документа»»), `DocRow` + `DocList` (вид «список»), `DocGrid` (вид «галерея» для `DocCard`) |
| Редактор | `PenToolbar` (стеклянная палитра пера: режим «текст» (`tool: null`), ручка, карандаш, маркер, текстовыделитель, ластик (повторное нажатие — штрих ↔ пиксель), лассо; перья окрашены текущими чернилами; цвета `ink.*` / `highlight.*`; толщина 1–3 — множитель базовой толщины инструмента; «рисовать мышью и пальцем»; отменить/повторить; `compact` — цвета и толщины сворачиваются в одну кнопку, по умолчанию на экранах уже 640px), `FormatToolbar` (кнопки через props, `panel` для раскрывающихся панелей, `anchorRect` — парит над выделением), `ColorPanel` (цвет текста `tint.*`, выделение `highlight.*`), `LinkPanel`, `SuggestionMenu` (меню «/» и `[[ ]]`: группы, иконки, подсказки сокращений; клавиатуру и фокус ведёт редактор, `suggestionOptionId` для `aria-activedescendant`) |
| Состояния | `EmptyState`, `Skeleton`, `Spinner` |

Утилиты Tailwind сверх токенов: `text-on-accent` (токен `text.onAccent`), `bg-hover`, `bg-pressed`, `bg-selected`, `bg-accent-soft`, `bg-danger-soft`, `border-hairline`, `focus-ring`, `glass`, `paper-noise`, `animate-pop`, `animate-overlay`, `animate-sheet-*`, `animate-shimmer`.

Чек-бокс задачи без React (узлы ProseMirror): `<button role="checkbox" class="ds-task-check" data-state="open|done|cancelled">` — тот же вид и анимация, что у `TaskCheckbox`. Типографику документа (`.ds-prose`) ведёт `packages/web-editor` на токенах этого пакета.

Правила дат (`dateLabel`) совпадают с iOS (`DSDateChipModel`) — общие тестовые случаи.

## Доступность и движение

Все интерактивные элементы — на примитивах Radix (роли, фокус, клавиатура), у иконок-кнопок обязательная подпись. Анимации — пружины из токенов; при `prefers-reduced-motion` всплывающие окна только плавно проявляются, мерцание скелетона и всплески отключены.

## Витрина и тесты

```bash
pnpm --filter @datascratch/ui dev              # витрина Ladle (localhost:61000), переключатель темы
pnpm --filter @datascratch/ui showcase:build   # статическая витрина (в CI — артефакт ui-showcase)
pnpm --filter @datascratch/ui test             # vitest + testing-library
pnpm --filter @datascratch/ui typecheck
```

Истории: `src/stories/` — «Editor / Document» (документ, панель форматирования, палитра пера), «Lists» (задачи, документы), «Overview / Showcase» (экран в духе Craft: боковая панель, карточки, задачи, стеклянная панель пера), основы (цвета, типографика, подложки, тени), элементы управления, всплывающие окна.
