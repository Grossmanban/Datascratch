# apps/server — сервер Datascratch

Node.js 22 + TypeScript, один процесс: Fastify + zod (OpenAPI из кода), PostgreSQL через Drizzle, pg-boss для фоновых задач, WebSocket-синхронизация с рассылкой в памяти процесса (D-25), файлы на диске или во внешнем S3 (D-26). Без Redis и MinIO.

Контракты, которые реализует сервер: `docs/architecture/contracts/api.md`, `sync-protocol.md`, `crypto.md`. Требования — `docs/spec/06-data-server.md`. Развёртывание — `infra/README.md`.

## Запуск для разработки

```bash
pnpm install
cp apps/server/.env.example apps/server/.env     # заполнить DS_JWT_SECRET, DS_KMS_KEY, DATABASE_URL
pnpm --filter @datascratch/server dev            # http://localhost:8080/v1/health
```

Нужен PostgreSQL 16 (локальный или `docker compose up -d postgres` из `infra/`). Миграции применяются при старте (`DB_MIGRATE_ON_START=true`) или командой `pnpm --filter @datascratch/server db:migrate`.

| Команда | Что делает |
| --- | --- |
| `pnpm --filter @datascratch/server build` | Сборка в `dist/` |
| `… typecheck` / `… lint` | Проверки TypeScript и ESLint |
| `… test` | vitest + настоящий PostgreSQL (`TEST_DATABASE_URL`, по умолчанию `postgres://ds:ds@localhost:5432/ds_test`; роль должна уметь создавать базы и роли) |
| `… db:generate` | Новая миграция из `src/db/schema.ts` (drizzle-kit) |

OpenAPI: `GET /v1/openapi.json`.

## Устройство

```
src/
  index.ts            точка входа: конфиг → миграции → хранилище → очередь → приложение
  config.ts           переменные окружения (zod), см. .env.example
  app.ts              Fastify: ошибки в формате контракта, OpenAPI, лимиты, маршруты /v1, плагины
  context.ts          AppContext — всё, что нужно обработчикам, задачам и плагинам
  db/                 схема Drizzle, пул, миграции, withAgentScope (RLS)
  routes/             REST: auth, account (me, devices), notebooks (+ docs), attachments, shares, agent-tokens
  sync/               WebSocket /v1/sync: connection.ts (протокол), hub.ts (рассылка), messages.ts
  services/           documents (seq, снимки, уплотнение), access (права), sessions, keys (KMS), audit
  storage/            BlobStorage: disk.ts, s3.ts
  jobs/               pg-boss: уплотнение, очистка, ежедневный проход по истории
  plugins/            интерфейс плагинов (api.ts) и его реализация (host.ts)
drizzle/              SQL-миграции; 0001 — Row-Level Security и триггер очистки файлов
```

Ключевые решения реализации (подробно — `docs/spec/06-data-server.md`):

- **seq** присваивается в транзакции под блокировкой строки документа (`docs.last_seq`), поэтому строго возрастает без пропусков. Повтор `push` с тем же `clientMsgId` от того же устройства возвращает прежний `seq`.
- **Живая рассылка** идёт через интерфейс `Broadcaster` (`sync/hub.ts`, реализация в памяти). Подписчик получает обновления строго по порядку `seq`: если параллельные записи опубликованы не по порядку, пропуск дочитывается из базы.
- **Права:** пользователь — свои документы; гость — документы шеринга (заметка или блокнот целиком, включая новые заметки), `push`/`snapshot` только с правом `edit`; агент — только блокноты своего токена в режиме «для агентов», дополнительно ограничено RLS в PostgreSQL.
- **Отзыв** устройства, шеринга или удаление аккаунта сразу закрывают WebSocket-соединения (код 4401).

## Агенты (`@datascratch/agents`)

Пакет агентов (MCP, OAuth 2.1, REST для агентов, токены, журнал, рендер PNG) — Fastify-плагин потока agents. Интерфейс между ним и сервером — `AgentsContext` из `packages/agents/src/context.ts` (контракт — `docs/architecture/contracts/agents-api.md`). Сервер зависит от пакета (`workspace:*`), берёт типы из него (`src/plugins/agents-context.ts`) и реализует:

| Часть | Файл | Что делает |
| --- | --- | --- |
| `store` | `plugins/agents-store.ts` | Таблицы `agent_grants`, `oauth_clients`, `oauth_codes`, `oauth_tokens`, `agent_audit` (секреты — только SHA-256; `takeCode` — атомарный `DELETE … RETURNING`) |
| `data` | `plugins/agents-data.ts` | Расшифровка: notebookKey = open(`DS_KMS_KEY`), noteKey = open(notebookKey, `NoteMeta.wrappedKey`); `loadDoc` → расшифрованный `Y.Doc` + `seq`; `applyUpdate` шифрует, присваивает `seq`, рассылает (устройство `agent:<grantId>`), каждые 500 обновлений / 1 MiB сам делает снимок; `createNoteDoc` создаёт ключ заметки и возвращает его обёртку; `docSeqs`, `loadAttachmentImage` |
| `users` | `plugins/agents-users.ts` | Bearer access-токен или cookie `ds_web` (экран согласия OAuth в браузере); `loginUrl` → `${APP_URL}/connect?returnTo=…` |

**Row-Level Security (D-30).** Каждый вызов `data` идёт в транзакции под ролью `ds_agent` (`withAgentScope`): видны только блокноты пользователя в режиме «для агентов», а если передан `grantId` (необязательный последний параметр методов `data`, в `applyUpdate` — `origin.grantId`) — только блокноты этого гранта, и запись — только при `read_write`, неотозванном и неистёкшем гранте.

**Подключение** (`src/plugins/loader.ts`), без префикса:

```ts
app.register(agentsPlugin, { context, publicUrl: PUBLIC_URL, secret /* HKDF от DS_JWT_SECRET */, appUrl: APP_URL, allowedOrigins: CORS_ORIGINS })
```

Плагин владеет путями `/mcp`, `/oauth/*`, `/.well-known/oauth-*`, `/v1/agent/*`, `/v1/agent-tokens*` — сервер их не занимает.

**Cookie для экрана согласия.** Веб-приложение (уже вошедшее) вызывает `POST /v1/auth/web-session` с Bearer-токеном и `credentials: "include"` — сервер ставит `ds_web` (HttpOnly, SameSite=Lax, Secure при https, 1 ч) — и переходит на `returnTo`. `DELETE /v1/auth/web-session` — выход.
