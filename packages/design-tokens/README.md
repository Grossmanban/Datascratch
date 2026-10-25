# @datascratch/design-tokens — токены «Тихая бумага»

Единый источник значений дизайн-системы для веба и iOS (D-15, D-38). Имена токенов — контракт (`docs/architecture/contracts/design-tokens.md`), значения — ПРЕДЛОЖЕНО и настраиваются здесь. Поток: design-system (D-39).

## Что внутри

| Файл | Что |
| --- | --- |
| `tokens.json` | **Источник истины.** Цвета (светлая/тёмная), чернила, маркеры, оттенки `tint.*` (`fg`/`bg`), подложки, шрифты, шкала размеров, отступы, радиусы, тени, ширины колонки, пружины, длительности, тактильная отдача |
| `scripts/generate.mjs` | Генератор (без зависимостей) |
| `generated/tokens.css` | CSS-переменные `--ds-*`: светлая тема в `:root`, тёмная — `[data-theme="dark"]` и `prefers-color-scheme` |
| `generated/theme.css` | Тема Tailwind v4 (`@theme inline`): `bg-canvas`, `text-fg`, `text-fg-secondary`, `border-separator`, `text-tint-blue`, `bg-tint-blue-bg`, `font-display`, `text-h1`, `rounded-lg`, `shadow-card`, `ease-snappy`, `max-w-doc-normal`, вариант `dark:` |
| `generated/index.js` + `.d.ts` | Токены для JS/TS (в т. ч. сервер — рендер рукописи в PNG) и параметры пружин для Motion |
| `apps/ios/Packages/DSDesign/Sources/DSDesign/Tokens.generated.swift` | Токены для Swift |

## Команды

```bash
pnpm --filter @datascratch/design-tokens generate   # после правки tokens.json
pnpm --filter @datascratch/design-tokens check      # CI: сгенерированное совпадает с закоммиченным
pnpm --filter @datascratch/design-tokens test       # имена по контракту, контраст WCAG, детерминизм
```

## Правила генерации

- **Чернила в тёмной теме** получаются из светлых автоматически: та же тональность, светлее (почти чёрные — цвет основного текста тёмной темы). Тест проверяет контраст ≥ 4.5 на графите.
- **Маркеры в тёмной теме** — глубже и прозрачнее, чтобы светлый текст оставался читаемым.
- **Пружины** заданы как в SwiftUI (`response`, `damping`). Для веба генератор строит CSS-кривую `linear(…)` той же пружины (`--ds-motion-snappy-easing`, `-duration`) и параметры Motion (`visualDuration`, `bounce`) — движение на iOS и в вебе ощущается одинаково.
- **Подложки** — базовый линейный градиент + 3 мягких цветовых пятна + зерно бумаги (`--ds-noise`).
- **Трекинг** задан в pt (как в SwiftUI); в CSS — в `em` относительно размера.

## Шрифты

iOS — системные New York / SF Pro / SF Mono. Веб — Source Serif 4 / Inter / JetBrains Mono (подключаются в `@datascratch/ui/fonts.css`, хранятся локально). Source Serif 4 вместо Newsreader из первой версии контракта: у Newsreader нет кириллицы, заголовки на русском падали на системный шрифт.

## Подключение в вебе

```css
@import "tailwindcss";
@import "@datascratch/design-tokens/tokens.css";
@import "@datascratch/design-tokens/theme.css";
```

Обычно достаточно `@datascratch/ui/styles.css` — он делает это сам.
