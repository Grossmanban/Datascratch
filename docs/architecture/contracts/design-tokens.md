# Контракт: дизайн-токены «Тихая бумага» (v1)

Связано: D-15, D-38, D-41. Источник истины значений — `packages/design-tokens/tokens.json`; из него генерируются CSS-переменные (веб) и Swift (iOS). Значения ниже — ПРЕДЛОЖЕНО, их настраивает поток дизайн-системы, имена токенов — контракт.

## Цвета (светлая / тёмная тема)

| Токен | Светлая | Тёмная | Назначение |
| --- | --- | --- | --- |
| `bg.canvas` | `#FAF8F4` | `#1A1917` | фон приложения («бумага») |
| `bg.surface` | `#FFFFFF` | `#22211E` | карточки, документ |
| `bg.sidebar` | `#F3EFE7` | `#1F1E1B` | боковая панель |
| `bg.elevated` | `#FFFFFFCC` | `#2A2926CC` | стеклянные плавающие панели (с размытием) |
| `text.primary` | `#1D1C1A` | `#ECE9E3` | основной текст («чернила») |
| `text.secondary` | `#6B6862` | `#A19D95` | вторичный |
| `text.tertiary` | `#9C978E` | `#77736C` | подсказки |
| `line.separator` | `#E6E1D8` | `#34322E` | разделители |
| `accent` | `#2E5BDB` | `#7B9BFF` | акцент («синие чернила») |
| `danger` | `#D2453B` | `#FF6B5E` | удаление, просрочено |
| `success` | `#3E8E5A` | `#6BC48A` | выполнено |
| `warning` | `#C98A1B` | `#F2B54B` | дедлайн скоро |

**Чернила пера:** `ink.black #1D1C1A`, `ink.blue #2E5BDB`, `ink.red #D2453B`, `ink.green #3E8E5A`, `ink.purple #7A4FD6`, `ink.brown #8A5A32`; маркеры: `highlight.yellow #FFE36E80`, `highlight.green #9BE3A880`, `highlight.pink #FFB3C780`, `highlight.blue #A9CCFF80`. В тёмной теме чернила осветляются генератором (те же имена).

**Цвета папок/тегов/выносок:** `tint.red`, `tint.orange`, `tint.yellow`, `tint.green`, `tint.teal`, `tint.blue`, `tint.indigo`, `tint.purple`, `tint.pink`, `tint.gray` — каждый с вариантами `.fg` и `.bg`.

**Подложки (backdrop):** `backdrop.sand`, `backdrop.dusk`, `backdrop.mist`, `backdrop.meadow`, `backdrop.ember` — мягкие градиенты в духе Craft (2–3 цвета + шум).

## Типографика

| Токен | iOS | Веб |
| --- | --- | --- |
| `font.display` (заголовки, с засечками) | New York | Newsreader (Google Fonts) |
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
