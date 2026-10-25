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

## Плагины (интерфейс для `@datascratch/agents`)

Сервер при старте пытается загрузить пакет `@datascratch/agents`; если его нет — работает без него. Пакет экспортирует `plugin` (или `default`) вида `ServerPlugin` из `src/plugins/api.ts`:

```ts
export const plugin = {
  name: 'agents',
  async register(app, host) {
    // app — корневой Fastify (пути без префикса: /v1/agent/..., /mcp, /.well-known/...)
    app.post('/mcp', async (req) => {
      const principal = await host.agents.authenticate(bearer(req));
      if (!principal) throw …;
      return host.agents.withScope(principal, async (scope) => {
        const { state } = await scope.readDoc(noteId);        // расшифрованное состояние (Yjs-обновление)
        // … изменить Y.Doc, получить дельту …
        await scope.applyUpdate(noteId, delta);                // шифрует, сохраняет, рассылает клиентам
        await scope.audit('edit_note', { docId: noteId });
      });
    });
  },
};
```

Чтобы не было циклической зависимости пакетов, `@datascratch/agents` **не зависит** от сервера: он повторяет нужные типы из `src/plugins/api.ts` структурно (или копирует файл). Изменения интерфейса — согласованно, с повышением `host.apiVersion`.

`PluginHost`:

| Поле | Что даёт |
| --- | --- |
| `apiVersion` | `1` |
| `log`, `config.publicUrl`, `config.nodeEnv` | Логгер pino и настройки |
| `db`, `pool` | Drizzle и пул `pg` — для собственных таблиц плагина (свои миграции, своя схема или префикс таблиц) |
| `jobs` | Очередь pg-boss: `register`, `enqueue`, `schedule` (например, рендер PNG) |
| `crypto` | `seal`/`open` (конверт v1 из `crypto.md`), `randomKey()`, строки `ad` |
| `agents.authenticate(token)` | Проверка токена `dsa_…` → `AgentPrincipal { tokenId, userId, permission, notebookIds }` или `null` (отозван, истёк, неизвестен). Обновляет `lastUsedAt` |
| `agents.withScope(principal, fn)` | Одна транзакция под ролью `ds_agent` с RLS по токену; правки рассылаются клиентам после фиксации |

`AgentScope` (внутри `withScope`):

| Метод | Смысл |
| --- | --- |
| `listNotebooks()`, `listDocs(notebookId)`, `getDoc(docId)` | Что доступно токену |
| `notebookKey(notebookId)` | Ключ блокнота, расшифрованный ключом сервера `DS_KMS_KEY` |
| `docKey(docId)` | Ключ документа: для индекса блокнота — ключ блокнота; для заметки — ключ заметки из `NoteMeta.wrappedKey` индекса |
| `readDoc(docId)` | `{ state, seq }` — всё состояние как одно Yjs-обновление (`Y.applyUpdate(new Y.Doc(), state)`) |
| `applyUpdate(docId, update)` | Шифрует и добавляет обновление (устройство `agent:<tokenId>`), рассылает. Каждые 500 обновлений / 1 МБ сервер сам делает снимок (он знает ключ) |
| `createNoteDoc(notebookId, noteId)` | Регистрирует новую заметку (метаданные `NoteMeta` с обёрнутым ключом агент пишет в индекс блокнота сам через `applyUpdate`) |
| `readAttachment(id)`, `writeAttachment({ … })` | Вложения с шифрованием кусками по 1 MiB |
| `audit(action, entry)` | Запись в журнал агента (`GET /v1/agent-tokens/:id/audit`) |
| `tx` | Транзакция Drizzle с RLS — для собственных запросов плагина |

Лимиты запросов агентов (D-25: счётчики в памяти процесса) и OAuth 2.1 для MCP — забота плагина.
