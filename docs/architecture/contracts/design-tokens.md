# Контракт: дизайн-токены «Тихая бумага» (v1)

> Уточнение 2026-10-25 (поток design-system): шрифт заголовков в вебе — Source Serif 4, токен `text.onAccent`, правила чипа даты.

Связано: D-15, D-38, D-41. Источник истины значений — `packages/design-tokens/tokens.json`; из него генерируются CSS-переменные (веб) и Swift (iOS). Значения ниже — ПРЕДЛОЖЕНО, их настраивает поток дизайн-системы, имена токенов — контракт.

## Цвета (светлая / тёмная тема)

| Токен | Светлая | Тёмная | Назначение |
| --- | --- | --- | --- |
| `bg.canvas` | `#FAF8F4` | `#1A1917` | фон приложения («бумага») |
| `bg.surface` | `#FFFFFF` | `#22211E` | карточки, документ |
| `bg.sidebar` | `#F3EFE7` | `#1F1E1B` | боковая панель |
| `bg.elevated` | `#FFFFFFCC` | `#2A2926CC` | стеклянные плавающие панели (с размытием) |
| `text.primary` | `#1D1C1A` | `#ECE9E3` | основной текст («чернила») |
| `text.secondary` | `#57544F` | `#B1ADA7` | вторичный |
| `text.tertiary` | `#706B62` | `#95918A` | значимый третичный текст: даты, подписи, счётчики, подсказки клавиш |
| `line.separator` | `#E6E1D8` | `#34322E` | разделители |
| `accent` | `#2B58DA` | `#7B9BFF` | акцент («синие чернила») |
| `danger` | `#B43329` | `#FF6B5E` | удаление, просрочено |
| `success` | `#317047` | `#6BC48A` | выполнено |
| `warning` | `#855B12` | `#F2B54B` | дедлайн скоро |
| `text.onAccent` | `#FFFFFF` | = `bg.canvas` | текст и иконки на заливке `accent`/`danger` (в тёмной теме акцент светлый, белый на нём не читается) |

**Контраст (обязательно).** Любой цвет, которым пишут текст, проходит WCAG AA в обеих темах на всех фонах, где встречается (`bg.canvas`, `bg.surface`, `bg.sidebar`, `bg.elevated`, мягкие подложки 14 %, `tint.*.bg`): `text.primary` ≥ 12:1, `text.secondary` ≥ 6:1, `text.tertiary`, `accent`, `danger`, `success`, `warning`, `tint.*.fg` ≥ 4,5:1. `text.tertiary` — для значимого вторичного текста; декоративные линии и обводки берут его с прозрачностью. Проверяется тестом `packages/design-tokens/test/tokens.test.mjs` в CI. Точные значения `tint.*` — в `packages/design-tokens/tokens.json` (уточнение 2026-10-25 по замечанию web-app: прежние tertiary/semantic-цвета светлой темы давали 2,5–3,9:1).

**Чернила пера:** `ink.black #1D1C1A`, `ink.blue #2E5BDB`, `ink.red #D2453B`, `ink.green #3E8E5A`, `ink.purple #7A4FD6`, `ink.brown #8A5A32`; маркеры: `highlight.yellow #FFE36E80`, `highlight.green #9BE3A880`, `highlight.pink #FFB3C780`, `highlight.blue #A9CCFF80`. В тёмной теме чернила осветляются генератором (те же имена).

**Цвета папок/тегов/выносок:** `tint.red`, `tint.orange`, `tint.yellow`, `tint.green`, `tint.teal`, `tint.blue`, `tint.indigo`, `tint.purple`, `tint.pink`, `tint.gray` — каждый с вариантами `.fg` и `.bg`.

**Подложки (backdrop):** `backdrop.sand`, `backdrop.dusk`, `backdrop.mist`, `backdrop.meadow`, `backdrop.ember` — мягкие градиенты в духе Craft (2–3 цвета + шум).

## Чип даты (одинаково на iOS и в вебе)

- Подпись: «Сегодня», «Завтра», «Вчера»; день недели — на 2–6 дней вперёд; иначе короткая дата по локали («12 ноя»).
- Цвет: просрочено — `danger`; дедлайн сегодня или завтра — `warning`; запланировано на сегодня — `accent`; выполнено — `text.tertiary`.
- Общие тестовые случаи — в `packages/design-tokens/test` и `DSDesign` (поток design-system).

## Типографика

| Токен | iOS | Веб |
| --- | --- | --- |
| `font.display` (заголовки, с засечками) | New York | Source Serif 4 (локально, `@datascratch/ui/fonts.css`; у Newsreader нет кириллицы) |
| `font.text` | SF Pro Text | Inter |
| `font.mono` | SF Mono | JetBrains Mono |
| Шкала размеров | `title 34`, `h1 28`, `h2 22`, `h3 19`, `body 17`, `callout 16`, `footnote 13`, `caption 12` (pt/px, с поддержкой Dynamic Type на iOS) |

Межстрочный интервал текста — 1.5; заголовков — 1.2.

## Пространство, формы, тени

- Сетка отступов 4 pt: `space.1 = 4` … `space.10 = 40`.
- Радиусы: `radius.sm 6`, `radius.md 10`, `radius.lg 14`, `radius.xl 20`, `radius.full`.
- Тени: `shadow.card` (мягкая, большой радиус размытия, низкая непрозрачность), `shadow.popover`.
- Ширина колонки документа: `normal 720`, `wide 960`, `full` — вся ширина.

## Движение

- Пружины: `motion.snappy` (response 0.3, damping 0.85), `motion.smooth` (0.45, 0.9), `motion.gentle` (0.6, 1.0).
- Длительности (для веба): `duration.fast 120ms`, `duration.base 200ms`, `duration.slow 320ms`.
- Тактильная отдача (iOS): выбор — `selection`, завершение задачи — `success`, удаление — `warning`.
