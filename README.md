# Datascratch

> Рабочее название. Финальное не выбрано (см. `docs/decisions/0024-product-name.md`).

Приложение для заметок, где **рукописный ввод Apple Pencil и обычный текст живут в одном слое**: пером можно подчеркнуть, зачеркнуть, обвести или заштриховать любое слово прямо в тексте, и пометки едут вместе с текстом при любой перекладке. Гибрид Obsidian (связи, бэклинки, теги, экспорт в Markdown) и Notesnook (сквозное шифрование, надёжная синхронизация) плюс доступ внешних ИИ-агентов через MCP и REST API.

Клиенты: нативные iPhone и iPad (главные), полноценный веб вместо десктопа. Свой сервер, поднимается одной командой Docker.

## Где что лежит

| Путь | Что там |
| --- | --- |
| `CLAUDE.md` | Правила для ИИ, работающего с репозиторием |
| `docs/` | **Источник истины**: ТЗ, архитектура, решения, план. Начинать с `docs/README.md` |
| `graphify-out/` | Граф знаний Graphify по документации и коду |
| `apps/ios/` | iPhone + iPad (Swift, TextKit 2) |
| `apps/web/` | Веб-клиент (Vite + React + TypeScript, PWA) |
| `apps/server/` | Сервер (Node.js + TypeScript): синхронизация, API, MCP |
| `packages/shared/` | Общие TypeScript-типы и схемы |
| `packages/test-vectors/` | Общие тестовые векторы шифрования и синхронизации для Swift и TS |
| `infra/` | Self-hosting: `docker compose` |

## Текущий статус

См. `docs/roadmap.md`. Кратко: стек утверждён, репозиторий и документация развёрнуты, следующий шаг — этап 1, прототип пера в тексте на iPad.

## For non-Russian readers

Project documentation is written in Russian (the owner's language); code, identifiers and commit messages are in English. Start with `docs/README.md`.
