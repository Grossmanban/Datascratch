# packages/agents — доступ внешних ИИ-агентов

`@datascratch/agents` — Fastify-плагин, который сервер подключает в свой процесс: MCP-сервер (Streamable HTTP, MCP SDK v2, спецификация 2026-07-28), сервер авторизации OAuth 2.1 с экраном согласия, статические токены агентов, REST для агентов (`/v1/agent/*`), журнал действий, лимиты, рендер рукописи в PNG. Поток: agents (D-39).

Контракт: `docs/architecture/contracts/agents-api.md`. Инструкция для пользователя: `docs/guides/connect-ai-agents.md`.

## Подключение в сервере

```ts
import { agentsPlugin } from "@datascratch/agents";

await app.register(agentsPlugin, {
  context,                       // AgentsContext: store, data (KMS + документы), users
  publicUrl: "https://notes.example.com",
  secret: process.env.DS_AGENTS_SECRET!, // ≥ 32 байт, стабильный
  appUrl: "https://notes.example.com",
});
```

Интерфейс `AgentsContext` — `src/context.ts`; in-memory реализация для тестов — `@datascratch/agents/testing`.

## Устройство

| Каталог | Что |
| --- | --- |
| `src/doc/` | Модель документа (y-prosemirror), Markdown ⇄ блоки, операции правки, штрихи и их якоря, группировка рукописи |
| `src/service/` | Общий сервисный слой (MCP и REST вызывают его), схемы входных данных, индекс поиска/задач |
| `src/auth/` | Разрешения и токены, сервер авторизации OAuth 2.1, HTML-страницы |
| `src/mcp/` | Инструменты MCP — тонкий адаптер |
| `src/http/` | REST, `/v1/agent-tokens`, журнал, лимиты |
| `src/render/` | Рендер рукописи в PNG (`@napi-rs/canvas`, шрифты Inter и Newsreader в комплекте) |

## Команды

```bash
pnpm --filter @datascratch/agents test        # vitest
UPDATE_PNG=1 pnpm --filter @datascratch/agents test   # перезаписать эталонные картинки (test/__images__)
pnpm --filter @datascratch/agents typecheck
pnpm --filter @datascratch/agents build
```

Когда поток core опубликует `@datascratch/shared` (модель документа, кодек штрихов, Markdown-экспорт), локальные помощники в `src/doc/` заменяются на общие (помечены `TODO(core)`).
