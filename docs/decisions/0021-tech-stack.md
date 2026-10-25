# D-21. Технологический стек

- **Статус:** РЕШЕНО (подтверждено пользователем 2026-10-25)
- **Дата:** 2026-10-25
- **Связано:** D-22, D-25, D-26, D-27, D-28, D-30, D-31, `docs/architecture/stack.md`

## Контекст

Весь код пишет Claude (D-19), поэтому стек должен содержать как можно меньше языков и только проверенные библиотеки. Требования: нативное перо на iPad с задержкой уровня PencilKit, полноценный веб, сквозное шифрование, совместная правка в реальном времени, MCP для агентов, self-hosting одной командой.

## Решение

Полный состав — `docs/architecture/stack.md`. Коротко:
- **iOS:** Swift 6, SwiftUI (оболочка), UIKit + TextKit 2 (редактор), свой рендер пера, GRDB (SQLite), Yrs (CRDT), libsodium.
- **Веб:** Vite + React + TypeScript (PWA), TipTap + Yjs, Canvas + Pointer Events, Dexie (IndexedDB), Radix + Tailwind + Motion.
- **Сервер:** Node.js + TypeScript, Fastify, PostgreSQL + Drizzle, pg-boss, файлы на диске или во внешнем S3, MCP TypeScript SDK, OAuth 2.1.
- **Инфраструктура:** pnpm + Turborepo, GitHub Actions (в т. ч. сборка iOS на macOS), docker compose.

Два языка в проекте: Swift и TypeScript.

## Рассмотренные варианты (по обсуждению 2026-10-25)

| Вопрос | Альтернативы | Почему выбрано так |
| --- | --- | --- |
| Редактор на iOS | WebView с веб-редактором | Заметная задержка пера; привязка к глифам возможна только в TextKit 2 |
| Веб-фреймворк | Next.js / Nuxt | Их сила — SSR и SEO; у нас сервер не видит содержимого, приложение офлайн-первое |
| Язык сервера | Go, Rust, Python | Go сэкономил бы ~100 МБ памяти — для одного пользователя незаметно; TypeScript даёт родную среду Yjs, общие типы с вебом и официальный MCP SDK |
| База данных | MySQL, SQLite, MongoDB | См. D-30 |
| CRDT | Automerge, Loro, OT, last-write-wins | См. D-31 |
| Redis | — | Не нужен, см. D-25 |
| MinIO | — | Не нужен, см. D-26 |

## Последствия

- Уверенность высокая: нативный iOS + TextKit 2, PostgreSQL, TypeScript-сервер, React + TipTap + Yjs, libsodium, отказ от Rust-ядра.
- Проверяется на прототипе: зрелость Swift-обёртки Yrs (D-27; запасной вариант — Automerge), особенности TextKit 2, выбор Metal vs Core Animation для пера.
- Легко заменяемые мелочи: Fastify, Drizzle, Dexie, Radix, Tailwind.
