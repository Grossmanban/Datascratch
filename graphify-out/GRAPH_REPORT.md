# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 162 files · ~56,756 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 5)

## Summary
- 1943 nodes · 4075 edges · 115 communities (110 shown, 5 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 486 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `45575fd0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- 0039-parallel-sessions.md
- sync-protocol.md
- strokes.md
- SyncClient
- 0011-handwriting-for-agents.md
- glossary.md
- docs/README.md
- stack.md
- 0031-crdt-yjs.md
- Правила для ИИ и документации
- layout.ts
- open-questions.md
- CHANGELOG.md
- 06-data-server.md
- Правила для ИИ и документации (2) (2)
- extract.ts
- contracts/strokes.ts
- sync.test.ts
- 04-editor.md
- Модель данных и глоссарий (2)
- 0009-notebook-mode-choice.md (2)
- 08-sharing.md
- 0001-storage-in-database.md
- 01-concept.md
- package.json
- compilerOptions
- Скрипт обновления графа
- 0036-space-notebook-folder.md
- 0009-notebook-mode-choice.md (3)
- Контракт: дизайн-токены «Тихая бумага» (v1)
- test-vectors/package.json
- 12. Функции по мотивам Craft
- api.md
- Дизайн и организация
- План этапов и отложенное
- exports
- Компоненты стека (2) (2)
- open-questions.md (2)
- Контракт: модель документа (v1) (2)
- vectors.test.ts
- store.ts
- tasks
- Контракт: шифрование (v1)
- strokes.test.ts
- 0003-platforms.md
- 0034-auth-email-password.md
- 10-sync.md
- Datascratch — правила для ИИ (CLAUDE.md)
- D-30. База данных сервера — PostgreSQL
- 12-craft-features.md
- Технологический стек — РЕШЕНО (2026-10-25)
- iOS-стек и два языка (2)
- Снимки и уплотнение: > 500 обновлений или > 1 MiB → снимок; удаление seq ≤ baseSeq, кроме нужных истории (R-05)
- 12. Функции по мотивам Craft (2)
- Обзор архитектуры: разделы
- D-38. Дизайн-направление — «Тихая бумага», ориентир Craft
- 02-platforms.md
- document-model.md
- graphify_docs.py
- contracts/crypto.ts
- Платформы и клиенты (2)
- 0009-notebook-mode-choice.md (5)
- Контракт: дизайн-токены «Тихая бумага» (v1) (2)
- glossary.md
- D-21. Технологический стек
- D-21. Технологический стек (2)
- contracts/README.md
- 04-editor.md (4)
- Дизайн и организация (2) (2)
- 04-editor.md
- design-tokens.md
- data-model.md
- yjs.ts
- Решения по анкетам пользователя: D-32…D-41 и PDF после MVP (D-08)
- libsodium on all platforms (swift-sodium on iOS, libsodium-wrappers in TS)
- D-39. Разработка параллельными сессиями; Claude сам вливает в main
- pnpm-workspace.yaml
- risks.md
- MemorySyncHub
- План разработки
- 0028-dev-workflow.md
- shared/package.json
- Shared test vectors (input -> expected output) run in Swift and TypeScript
- D-38. Дизайн-направление — «Тихая бумага», ориентир Craft
- Контракт: REST API сервера (v1)
- generate.ts
- .prettierrc.json
- 0008-pdf-annotations.md
- Контракт: протокол синхронизации (v1)
- Контракт: модель документа (v1)
- 0032-min-ios-version.md
- Контракт: рукописные штрихи (v1)
- vitest
- development.md
- Stream design-system (claude/design-system): packages/design-tokens, packages/ui, apps/ios/Packages/DSDesign — Quiet Paper tokens, web and SwiftUI components
- 3. Apple Pencil в тексте — ключевая фича
- Модель данных — ЧЕРНОВИК
- 0010-agent-edits.md
- 0041-craft-inspired-features.md
- Процесс разработки
- pm-schema.ts
- D-22. Без собственного общего ядра на Rust
- D-25. Redis не используем
- D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO
- 4. Редактор
- scripts
- 11. Нефункциональные требования
- yjs
- D-23. Документация — источник истины; Graphify — граф знаний поверх неё
- D-27. В прототипе пера текст хранится в Yrs
- D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления
- Stream agents (claude/agents): packages/agents, agents-api contract draft — MCP, REST, tokens, log, PNG render
- ./document
- ws
- test-vectors/tsconfig.json

## God Nodes (most connected - your core abstractions)
1. `SyncClient` - 32 edges
2. `documentVectors()` - 26 edges
3. `CryptoError` - 25 edges
4. `toBase64Url()` - 20 edges
5. `accountRoots()` - 20 edges
6. `Stage 1: pen-in-text prototype on iPad (TextKit 2 + Yrs + pen layer, living stroke)` - 20 edges
7. `compilerOptions` - 18 edges
8. `cryptoVectors()` - 17 edges
9. `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` - 17 edges
10. `encryptEnvelope()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО` --semantically_similar_to--> `Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/README.md
- `4.2. Схема блоков` --references--> `table()`  [INFERRED]
  docs/architecture/contracts/document-model.md → packages/shared/src/document/markdown.ts
- `4.2. Схема блоков` --references--> `label()`  [INFERRED]
  docs/architecture/contracts/document-model.md → tools/graphify_docs.py
- `Web editor: TipTap + Yjs per document-model contract, all blocks, Canvas pen layer per strokes contract` --semantically_similar_to--> `Web editor: TipTap (ProseMirror) + Yjs`  [INFERRED] [semantically similar]
  packages/web-editor/README.md → docs/spec/04-editor.md
- `Аутентификация (D-34, `crypto.md`)` --references--> `Session`  [INFERRED]
  docs/architecture/contracts/api.md → packages/shared/src/contracts/api.ts

## Import Cycles
- None detected.

## Communities (115 total, 5 thin omitted)

### Community 0 - "0039-parallel-sessions.md"
Cohesion: 0.25
Nodes (10): apps/ios — iPhone + iPad, Cross-stream contracts (docs/architecture/contracts/) changed only via the coordinator session, Claude coordinator merges stream branches into main when CI is green, Coordinator session (merges branches into main, owns roadmap.md, CHANGELOG.md and contracts), Stream ios-app (claude/ios-app): apps/ios — XcodeGen project, Craft-style SwiftUI shell, navigation, tasks, calendar, settings, Stream ios-core (claude/ios-core): apps/ios/Packages/DSCore — Swift crypto, Yrs document model, GRDB, sync and API client, Stream ios-editor (claude/ios-editor): apps/ios/Packages/DSEditor — TextKit 2 + Yrs + living stroke pen layer, blocks, demo app, Stream web-editor (claude/web-editor): packages/web-editor — TipTap editor with all blocks, Canvas pen (+2 more)

### Community 1 - "sync-protocol.md"
Cohesion: 0.19
Nodes (18): Формат ошибок { error: { code, message } } и коды bad_request…internal, ack — обновление или снимок принят и сохранён (docId, clientMsgId, seq), Единица синхронизации — документ Yjs (account, notebook, note), Коды ошибок синхронизации: unauthorized, forbidden, doc_not_found, payload_too_large (2 MiB / 50 MiB), rate_limited, protocol_mismatch, internal, error — сообщение сервера: code, message, ref? (clientMsgId / docId), Клиент хранит lastSeq по каждому документу и догоняет недостающее при подключении, Сервер не присылает клиенту его собственные обновления (кроме updates при догоняющей подписке с другого устройства), Офлайн: обновления копятся в локальной очереди до подтверждения ack (+10 more)

### Community 2 - "strokes.md"
Cohesion: 0.20
Nodes (17): История версий: GET /docs/:id/versions и /versions/:seq (зашифрованные снимки), Перепривязка якорей после отмены/повтора: в той же транзакции якорь удалённого символа с redone-элементом переписывается на относительную позицию нового элемента, Координаты block / image / drawing — в долях ширины блока, Правило D-35 в отрисовке: точки удалённых символов не рисуются, штрих остаётся в документе; отмена возвращает пометку, Штрих почти неизменяем после рисования; ластик удаляет штрих целиком или заменяет кусками, Разрыв штриха по строкам: соседние точки на разных line fragments → отдельные сегменты, Изменяемые поля штриха после рисования: anchors (перепривязка, §4.1) и hidden (резерв), orphanedAt — локальная отметка клиента, когда все якоря штриха впервые оказались удалены (стирается, если якоря снова живы) (+9 more)

### Community 4 - "0011-handwriting-for-agents.md"
Cohesion: 0.09
Nodes (24): AgentToken { id, name, notebookIds, permission, expiresAt, createdAt, lastUsedAt } — без секрета, Токены агентов /agent-tokens: блокноты, read / read_write, срок; токен показывается один раз, blockId (UUIDv7) у каждого блочного узла — для точечных правок агентов, заметок на полях и комментариев, D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Export: Markdown, PDF, HTML (handwriting as images), pg-boss background job queue on PostgreSQL, PostgreSQL via Drizzle (D-30): accounts, notebooks, rights, tokens, encrypted updates, snapshots, agent log (+16 more)

### Community 5 - "glossary.md"
Cohesion: 0.15
Nodes (20): Контракт agents-api.md (MCP и REST для самих агентов) — появится на этапе агентов, Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, File Storage (disk or external S3), Handwriting-to-PNG Render (pg-boss queue), Key Store (agent notebooks) (+12 more)

### Community 6 - "docs/README.md"
Cohesion: 0.17
Nodes (15): ADR file number equals decision number (D-05 -> 0005-*.md), template 0000-template.md, Нумерация решений D-NN и файлы decisions/00NN-*.md, Документация Datascratch — единственный источник истины, history/ — архив, не источник истины; исключена из графа (.graphifyignore), Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Правило замены: решение РЕШЕНО не переписывается, ADR получает статус «ЗАМЕНЕНО решением D-NN», Оглавление docs/ (spec, contracts, architecture, decisions, roadmap, risks…), Документация Datascratch (+7 more)

### Community 7 - "stack.md"
Cohesion: 0.11
Nodes (29): Server PostgreSQL Schema (Stage 3 Draft), iOS / iPadOS Client (Swift, TextKit 2, Yrs, GRDB), Private Notebook Edit Flow, Sync / Realtime Service, Web PWA Client (React, TipTap, Yjs, IndexedDB), Astro (landing page), Automerge (fallback CRDT), Dexie (IndexedDB) (+21 more)

### Community 8 - "0031-crdt-yjs.md"
Cohesion: 0.10
Nodes (23): D-19. Весь код пишет Claude, Последствия, Решение, Custom pen renderer (Metal vs Core Animation TBD), End-to-end encryption, iOS client stack, Node.js + TypeScript server, Swift 6 (+15 more)

### Community 9 - "Правила для ИИ и документации"
Cohesion: 0.22
Nodes (6): D-29. Graphify: порядок работы, чтобы граф был всегда актуален, R-09 (риск: Graphify сломается или исчезнет), Контекст, Последствия, Решение, graphify-out/ layout: what is committed (graph.json, report, html, manifest, cache) vs machine-local (.gitignore)

### Community 10 - "layout.ts"
Cohesion: 0.15
Nodes (17): AnchorKind, MIN_SEGMENT_POINTS, encodeAnchor(), isCharDeleted(), rebaseAnchorList(), resolveAnchor(), resolveAnchors(), ResolvedAnchor (+9 more)

### Community 11 - "open-questions.md"
Cohesion: 0.12
Nodes (15): Координаты text-штриха: смещение от начала глифа якорного символа в em, Привязка к тексту: каждая точка → ближайший символ строки (живой штрих), PencilKit (rejected), D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, Living Stroke, OPEN (stage 1): living stroke details — circles around several words, arrows between words on different lines; decide on prototype (+7 more)

### Community 12 - "CHANGELOG.md"
Cohesion: 0.10
Nodes (31): pnpm + Turborepo Monorepo, 2026-10-25, 2026-10-25 (вторая половина дня), Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, Каркас монорепозитория (pnpm + Turborepo), девять потоков разработки, правила сессий-исполнителей, changelog.d (+23 more)

### Community 13 - "06-data-server.md"
Cohesion: 0.08
Nodes (29): Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), MinIO (rejected), D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting (+21 more)

### Community 14 - "Правила для ИИ и документации (2) (2)"
Cohesion: 0.15
Nodes (12): Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой, Правила, Среда разработки, Скрипт tools/graphify_docs.py (prepare → агенты → finish) (+4 more)

### Community 15 - "extract.ts"
Cohesion: 0.15
Nodes (17): TASK_STATES, TaskState, ATTR_TEXT_BLOCKS, attrText(), buildBacklinks(), deltaText(), extractNoteLinks(), extractTags() (+9 more)

### Community 16 - "contracts/strokes.ts"
Cohesion: 0.16
Nodes (15): AuthorKind, POINT_BYTES, POINT_FIELDS, REFERENCE_BLOCK_WIDTH, REFERENCE_FONT_SIZE, Stroke, StrokeAuthor, StrokeHint (+7 more)

### Community 17 - "sync.test.ts"
Cohesion: 0.12
Nodes (8): SyncStatus, WebSocketFactory, WebSocketLike, deliver(), MemorySyncStorage, clients, makeClient(), text()

### Community 18 - "04-editor.md"
Cohesion: 0.16
Nodes (13): Схема блоков: doc = title block+ (paragraph, heading, списки, taskList, callout, codeBlock, mathBlock, mermaid, table, image, file, drawing, pageCard), Производные данные строятся локально: индекс задач, полнотекстовый поиск, бэклинки, теги, Inline-узлы noteLink ([[ ]]) и tag (без #, вложенность через /), taskItem: taskId, state open / done / cancelled, scheduled, deadline, completedAt, Obsidian (reference product: links, backlinks, tags, Markdown export), Backlinks, Editor content (headings, lists, tables, code, formulas, attachments, drawing blocks), iOS editor: UIKit + TextKit 2 (+5 more)

### Community 19 - "Модель данных и глоссарий (2)"
Cohesion: 0.08
Nodes (37): RFC-9562, UUID_V7_REGEX, BLOCK_NODES, INLINE_NODES, MARKS, pmNodeSchema, TEXTBLOCK_NODES, addAgentMark() (+29 more)

### Community 20 - "0009-notebook-mode-choice.md (2)"
Cohesion: 0.15
Nodes (17): PATCH /notebooks/:id/mode — включение режима «для агентов» передаёт notebookKey, выключение удаляет серверную обёртку, Режим «для агентов»: клиент передаёт notebookKey по TLS, сервер оборачивает его serverKey; расшифровка только при запросе агента с токеном, serverKey — 32 байта из DS_KMS_KEY (окружение сервера, не в базе), D-04. Одновременно сквозное шифрование и доступ по API, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), Контекст, Последствия (+9 more)

### Community 21 - "08-sharing.md"
Cohesion: 0.08
Nodes (30): POST /docs — регистрация документа (account / notebook / note) до первого push, Share { id, target { kind, id }, permission, expiresAt, createdAt } — ссылка шеринга, Шеринг: /shares (view/edit, бессрочно по умолчанию, отзыв сразу отключает гостей), Ссылка шеринга /s/<shareId>#k=<ключ> — ключ в части после #, не уходит на сервер, Права: user — документы своего аккаунта; guest — только документы шеринга, push только с правом edit, D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение (+22 more)

### Community 22 - "0001-storage-in-database.md"
Cohesion: 0.18
Nodes (10): hint — распознанная форма (underline, strike, circle, highlight, arrow, scribble) для агентов и экспорта, D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты (+2 more)

### Community 23 - "01-concept.md"
Cohesion: 0.12
Nodes (12): D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, 1. Концепция продукта, Notesnook (reference product: E2E encryption, reliable sync), Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения, Суть в одном абзаце (+4 more)

### Community 24 - "package.json"
Cohesion: 0.03
Nodes (73): ACCESS_TOKEN_TTL_MS, AGENT_PERMISSIONS, AgentPermission, AgentToken, agentTokenSchema, API_ERROR_CODES, API_PREFIX, API_ROUTES (+65 more)

### Community 25 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib, module (+10 more)

### Community 26 - "Скрипт обновления графа"
Cohesion: 0.04
Nodes (62): AUTHOR_KINDS, authorKindSchema, Base64Url, BASE64URL_REGEX, base64UrlBytesSchema(), base64UrlLength(), base64UrlSchema, DATE_ONLY_REGEX (+54 more)

### Community 27 - "0036-space-notebook-folder.md"
Cohesion: 0.17
Nodes (15): Space { id, name, icon, color, order, createdAt } в account-документе, Organization Hierarchy (Account > Space > Notebook > Folder > Note), D-14. Организация: богатая, но не перегруженная, Предложенная структура: пространства → вложенные папки; поперёк — вложенные и умные теги, цвета, избранное, недавние, Решение, Поперёк структуры — теги, умные теги, избранное, недавние, D-36. Структура: пространство → блокноты → папки, Пространство (Личное, Работа, Учёба) содержит несколько блокнотов (+7 more)

### Community 28 - "0009-notebook-mode-choice.md (3)"
Cohesion: 0.05
Nodes (39): AckMessage, ackMessageSchema, CLIENT_PLATFORMS, ClientAwarenessMessage, clientAwarenessMessageSchema, clientMessageSchema, clientMsgIdSchema, deviceIdSchema (+31 more)

### Community 29 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.18
Nodes (22): attr(), block(), blockBody(), CALLOUT_KIND, children(), close(), Ctx, escapeBlockStart() (+14 more)

### Community 30 - "test-vectors/package.json"
Cohesion: 0.08
Nodes (32): description, devDependencies, @datascratch/shared@workspace:*, eslint@^9.39.0, libsodium-wrappers-sumo@^0.8.2, prosemirror-model@^1.25.0, tsx@^4.20.0, @types/node@^22.10.0 (+24 more)

### Community 31 - "12. Функции по мотивам Craft"
Cohesion: 0.08
Nodes (31): devDependencies, eslint@^9.39.0, eslint-config-prettier@^10.1.0, @eslint/js@^9.39.0, globals@^16.4.0, prettier@^3.6.0, turbo@^2.5.0, typescript@^5.9.0 (+23 more)

### Community 32 - "api.md"
Cohesion: 0.14
Nodes (17): Аккаунт и устройства: /me, /devices (отзыв сессий), удаление аккаунта, Журнал действий агента GET /agent-tokens/:id/audit, Эндпоинты /auth: prelogin, signup, login, refresh, logout, recovery, password, Аутентификация Bearer: accessToken 15 мин + refreshToken 30 дней с ротацией, Идентификаторы создаёт клиент (UUIDv7); повторный POST идемпотентен, иначе 409 conflict, Device { id, name, createdAt, lastSeenAt, current } — устройство (сессия) аккаунта, POST /shares/:id/guest — гостевой токен (без авторизации) для hello в синхронизации, GET /health → { ok: true, version } — служебная проверка сервера (+9 more)

### Community 33 - "Дизайн и организация"
Cohesion: 0.19
Nodes (11): Radix + Tailwind + Motion Design System, SwiftUI, D-15. Дизайн — основная концепция продукта, Design references: Things 3, Linear, Craft, Arc, Последствия, Решение, Ориентир Craft: градиентные подложки, документы-карточки с обложками, боковая панель «Вкладки / Избранное / Папки / Теги», стеклянные панели, контекстные меню, Light/dark theme, Dynamic Type, VoiceOver, full iPad keyboard support (+3 more)

### Community 34 - "План этапов и отложенное"
Cohesion: 0.09
Nodes (22): runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group, jobs, check (+14 more)

### Community 35 - "exports"
Cohesion: 0.12
Nodes (17): import, types, import, types, exports, ./contracts, ./crypto, ./ids (+9 more)

### Community 36 - "Компоненты стека (2) (2)"
Cohesion: 0.12
Nodes (18): Canvas + Pointer Events, Dexie (IndexedDB), Drizzle ORM, Fastify, GRDB (SQLite), MCP TypeScript SDK, OAuth 2.1, pg-boss job queue (+10 more)

### Community 37 - "open-questions.md (2)"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 38 - "Контракт: модель документа (v1) (2)"
Cohesion: 0.16
Nodes (14): ACCOUNT_ROOTS, FORMAT_VERSION, NOTE_ROOTS, NOTEBOOK_ROOTS, NoteDocMeta, PMNode, AccountDocRoots, DocOptions (+6 more)

### Community 39 - "vectors.test.ts"
Cohesion: 0.18
Nodes (8): fromHex(), GlyphBox, layoutBlockStroke(), pressureCurve(), strokeWidthAt(), tiltFactor(), dir, Json

### Community 40 - "store.ts"
Cohesion: 0.15
Nodes (26): ANCHOR_KINDS, ORPHAN_STROKE_PURGE_DAYS, STROKE_FORMAT_VERSION, STROKE_HINTS, STROKE_TOOLS, allAnchorsDeleted(), atPath(), attachAnchorRebase() (+18 more)

### Community 41 - "tasks"
Cohesion: 0.17
Nodes (11): dependsOn, outputs, dependsOn, $schema, tasks, build, lint, test (+3 more)

### Community 42 - "Контракт: шифрование (v1)"
Cohesion: 0.20
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 43 - "strokes.test.ts"
Cohesion: 0.27
Nodes (8): Stream server (claude/server): apps/server, infra/ — Fastify, PostgreSQL, auth, sync, attachments, sharing, docker compose, 6. Модель данных и сервер, Self-hosting, Модель данных (общий обзор; детали — `architecture/data-model.md`), Резервные копии, Сервер, docker-compose.yml: server + PostgreSQL containers, file volume or external S3, infra — self-hosting

### Community 44 - "0003-platforms.md"
Cohesion: 0.23
Nodes (7): D-03. Платформы: нативные iPhone и iPad + полноценный веб, Full-featured web client (TypeScript), Контекст, Последствия, Решение, Finger drawing toggle on iPhone, Own design system (typography, grid, colors, icons, animation, haptics) unified on iOS and web

### Community 45 - "0034-auth-email-password.md"
Cohesion: 0.16
Nodes (21): Вложения шифруются кусками по 1 MiB, каждый — отдельный конверт, Иерархия ключей: пароль → passwordKey → masterKey → notebookKey → noteKey, loginKey = BLAKE2b(authSeed, "ds1|login"); сервер хранит Argon2id(loginKey), masterKey — 32 случайных байта, создаётся при регистрации, шифрует account-документ, noteKey — ключ заметки: шифрует note-документ и вложения, notebookKey — случайный ключ блокнота, шифрует notebook-документ, Смена пароля перешифровывает только обёртку masterKey, Вывод ключей из пароля: Argon2id13 (ops 3, mem 64 MiB, выход 64 байта), NFKC, соль 16 байт (+13 more)

### Community 46 - "10-sync.md"
Cohesion: 0.19
Nodes (10): Агенты не подключаются по WebSocket — работают через MCP/REST; сервер применяет их правки как обычные обновления, Сервер присваивает зашифрованным обновлениям seq, хранит и рассылает; не сливает и не читает, Agent edits applied immediately, highlighted, revertible via history (D-10), 10. Синхронизация и офлайн, Local storage: SQLite via GRDB (iOS), IndexedDB via Dexie (web), Agent notebooks: server decrypts and applies agent edit as a normal update, Each note is a Yjs CRDT doc; edits are small binary updates, Как это работает (обзор) (+2 more)

### Community 47 - "Datascratch — правила для ИИ (CLAUDE.md)"
Cohesion: 0.15
Nodes (13): XcodeGen project.yml (D-28), Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Смешанный режим: облачные сессии (Linux, без Xcode) + Mac пользователя для сборки и iPad (+5 more)

### Community 48 - "D-30. База данных сервера — PostgreSQL"
Cohesion: 0.09
Nodes (52): DEFAULT_NOTE_STYLE, StarredItem, TabItem, TagProps, accountRoots(), createAccountDoc(), createNotebookDoc(), notebookRoots() (+44 more)

### Community 49 - "12-craft-features.md"
Cohesion: 0.19
Nodes (14): Проекты, личное, работа, учёба не смешиваются; минимум кнопок на экране, Calendar screen: day feed with tasks and daily note (MVP); system calendar integration after MVP, Card document: nested document shown as a card with cover (MVP), Collections: records with properties and table / gallery / kanban views with filter, sort, grouping (after MVP), Command palette Cmd+K, context menus, floating glass panels (MVP), Daily note: one per day, created on demand, from template (MVP), Document cover image with offset (MVP), Document style: font (serif/sans/mono), width, paper (smooth/dots/grid/ruled), backdrop color or gradient, text color; style gallery after MVP (+6 more)

### Community 50 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 51 - "iOS-стек и два языка (2)"
Cohesion: 0.12
Nodes (15): devDependencies, eslint@^9.39.0, prosemirror-model@^1.25.12, tsup@^8.5.0, @types/node@^22.10.0, @types/ws@^8.5.13, typescript@^5.9.0, y-prosemirror@^1.3.7 (+7 more)

### Community 52 - "Снимки и уплотнение: > 500 обновлений или > 1 MiB → снимок; удаление seq ≤ baseSeq, кроме нужных истории (R-05)"
Cohesion: 0.31
Nodes (9): Осиротевшие штрихи (все якоря удалены, orphanedAt или createdAt старше 30 дней) окончательно удаляются клиентом при уплотнении истории, Снимки и уплотнение: > 500 обновлений или > 1 MiB → снимок; удаление seq ≤ baseSeq, кроме нужных истории (R-05), doc_snapshots Table (compacted snapshots, version history), Encrypted history compaction by clients (R-05, stage 3), Snapshot, OPEN (before stage 3): Yjs history compaction under encryption — snapshot scheme (R-05), R-05 Edit History Growth, Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps (+1 more)

### Community 53 - "12. Функции по мотивам Craft (2)"
Cohesion: 0.25
Nodes (8): 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft, Связь с моделью данных

### Community 54 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 55 - "D-38. Дизайн-направление — «Тихая бумага», ориентир Craft"
Cohesion: 0.29
Nodes (7): Решения по анкетам пользователя: D-32…D-41 и PDF после MVP (D-08), D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Вариант «графит по умолчанию» — отклонён: чернила на тёмном читаются хуже, Вариант «чистый нейтральный» (Linear / Things) — не выбран, Тёмная тема — тёплый графит, Рассмотренные варианты, Решение

### Community 56 - "02-platforms.md"
Cohesion: 0.15
Nodes (13): D-06. Рисование пальцем на iPhone — да, опционально, Решение, D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, 2. Платформы, UI languages Russian and English, no RTL (D-17), iPad client (primary, Apple Pencil / Pencil Pro squeeze and roll, hover, Stage Manager, keyboard shortcuts) (+5 more)

### Community 57 - "document-model.md"
Cohesion: 0.14
Nodes (23): y-prosemirror не записывает атрибуты узлов со значением null: отсутствующий атрибут = null (значение по умолчанию схемы), Документ account: spaces, notebooks, settings, starred, tabs (ключ — masterKey), Comment { blockId, anchor (относительные позиции), author user | guest | agent, text, resolvedAt }, Даты ISO 8601 в UTC; «только дата» YYYY-MM-DD; миллисекунды — только в штрихах, Векторы совместимости модели документа packages/test-vectors/document/* (iOS/Yrs обязан читать и писать формат y-prosemirror), Блок drawing (высота в pt; штрихи — в strokes), Вставка текста в Y.XmlText без явных атрибутов наследует форматирование слева (Yjs/Yrs) — писатели всегда передают явный набор атрибутов, Folder { parentId, name, icon, color, order } — вложенность без ограничения глубины (+15 more)

### Community 58 - "graphify_docs.py"
Cohesion: 0.25
Nodes (8): Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, Graph update after doc edits: graphify_docs.py prepare -> parallel extraction agents -> finish -> graphify export html -> check-update, finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 59 - "contracts/crypto.ts"
Cohesion: 0.06
Nodes (87): RFC-4648, AD, ATTACHMENT_CHUNK_BYTES, DEFAULT_KDF, ENVELOPE_OVERHEAD, ENVELOPE_VERSION, KDF_ALG, KDF_MEM (+79 more)

### Community 60 - "Платформы и клиенты (2)"
Cohesion: 0.13
Nodes (14): ClientMessage, ClientPlatform, SNAPSHOT_THRESHOLD_BYTES, SNAPSHOT_THRESHOLD_UPDATES, SyncErrorCode, DocEntry, Listeners, REMOTE_ORIGIN (+6 more)

### Community 61 - "0009-notebook-mode-choice.md (5)"
Cohesion: 0.29
Nodes (7): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Вход и восстановление доступа (D-34), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 62 - "Контракт: дизайн-токены «Тихая бумага» (v1) (2)"
Cohesion: 0.40
Nodes (5): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 63 - "glossary.md"
Cohesion: 0.15
Nodes (17): Записываются только сглаженные coalesced-точки завершённого штриха, без predicted, doc_updates Table (encrypted Yjs updates), Custom iOS Pen Render Layer (Metal or Core Animation), TextKit 2 (UIKit editor), ADR (Architecture Decision Record), End-to-End Encryption (E2E), PencilKit / PKCanvasView, Predicted / Coalesced Touches (+9 more)

### Community 64 - "D-21. Технологический стек"
Cohesion: 0.22
Nodes (7): createNotebookRequestSchema, emailSchema, registerDocRequestSchema, signupRequestSchema, isoDateTimeSchema, uuidSchema, KEY

### Community 65 - "D-21. Технологический стек (2)"
Cohesion: 0.18
Nodes (11): base64UrlDecodedLength(), MAX_SNAPSHOT_BYTES, MAX_UPDATE_BYTES, ServerMessage, SYNC_PROTOCOL_VERSION, SyncAuth, UpdateItem, Connection (+3 more)

### Community 66 - "contracts/README.md"
Cohesion: 0.20
Nodes (10): Тестовые векторы crypto: KDF, конверты, Base32 ключа восстановления, куски вложений (Swift и TS), Контракт — точное описание формата/протокола, который реализуют несколько частей (iOS на Swift, веб и сервер на TS), Версионирование контрактов v1, v2…; ломающее изменение — новая версия с явной миграцией, Совместимость доказывается общими тестовыми векторами (packages/test-vectors), Типы TypeScript контрактов в packages/shared/src/contracts/ — часть контракта, Контракты между частями системы, Правила изменения, Тестовые векторы strokes: упаковка точек, разрешение якорей после правок, правило D-35 (+2 more)

### Community 67 - "04-editor.md (4)"
Cohesion: 0.25
Nodes (7): compilerOptions, lib, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 68 - "Дизайн и организация (2) (2)"
Cohesion: 0.40
Nodes (5): 5. Организация заметок и дизайн, Дизайн (D-15 — РЕШЕНО, главный принцип продукта), Организация (D-14 — РЕШЕНО по сути; структура ниже — ПРЕДЛОЖЕНО), Принципы, Реализация

### Community 69 - "04-editor.md"
Cohesion: 0.18
Nodes (12): Контракт меняет только сессия-координатор; исполнитель присылает предложение, Обводки и стрелки «растягиваются» вместе с текстом; при проблемах — изменение контракта через координатора, D-35. Пометка на удалённом тексте исчезает вместе с ним, Окончательная очистка таких штрихов — при уплотнении истории, Вариант «потерянные пометки» — отклонён: лишний интерфейс, Частичное удаление: штрих «сжимается» до оставшегося текста, Вариант «прилипать к соседнему символу» — отклонён: пометка может оказаться не на том слове, Рукописная пометка исчезает вместе с удалённым текстом (пользователем, агентом, другим устройством) (+4 more)

### Community 70 - "design-tokens.md"
Cohesion: 0.27
Nodes (13): Подложки backdrop.* (sand, dusk, mist, meadow, ember) — мягкие градиенты в духе Craft, Цветовые токены: bg.canvas («бумага»), text.primary («чернила»), accent («синие чернила»), danger/success/warning — светлая и тёмная тема, Ширина колонки документа: normal 720, wide 960, full, Тактильная отдача iOS: selection, success (задача выполнена), warning (удаление), Чернила пера ink.* (black, blue, red, green, purple, brown) и маркеры highlight.*, Движение: пружины motion.snappy / smooth / gentle, длительности duration.* для веба, Сетка отступов 4 pt, радиусы radius.*, тени shadow.card / shadow.popover, Цвета tint.* (.fg / .bg) для папок, тегов и выносок (+5 more)

### Community 71 - "data-model.md"
Cohesion: 0.27
Nodes (8): meta.formatVersion = 1; документ новее клиента открывается только для чтения (R-03), Поля штриха: v, tool, color, width, opacity, anchorKind, blockId, anchors, points, hint, author, createdAt, Anchor (textRange / paragraph / drawingBlock / image), Note, Stroke, StrokePoint, RelativePosition (CRDT), R-03 Data Format Cannot Change Cheaply

### Community 72 - "yjs.ts"
Cohesion: 0.22
Nodes (12): PMMark, attributesToMarks(), Attrs, jsonEqual(), markNameFromAttr(), marksToAttributes(), pmContentToY(), pmNodeToY() (+4 more)

### Community 73 - "Решения по анкетам пользователя: D-32…D-41 и PDF после MVP (D-08)"
Cohesion: 0.20
Nodes (10): D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст, Решение, Bundle ID com.datascratch.app, D-33. Bundle ID — com.datascratch.app, Решение (+2 more)

### Community 74 - "libsodium on all platforms (swift-sodium on iOS, libsodium-wrappers in TS)"
Cohesion: 0.22
Nodes (11): Вложения: загрузка и докачка по кускам (/attachments/:id/chunks/:index), лимит 200 МБ, Ассоциированные данные ds1|… привязывают шифротекст к месту (doc, awareness, ключи, куски вложений), Конверт шифротекста: версия 0x01 + nonce 24 байта + XChaCha20-Poly1305-IETF (тег 16 байт), libsodium на всех платформах (libsodium-wrappers-sumo в TS, swift-sodium в iOS), awareness — курсоры и присутствие: зашифровано, не хранится, только рассылается, libsodium, Attachments as separate encrypted files, on-demand resumable download, Argon2id password key derivation (+3 more)

### Community 75 - "D-39. Разработка параллельными сессиями; Claude сам вливает в main"
Cohesion: 0.50
Nodes (4): D-39. Разработка параллельными сессиями; Claude сам вливает в main, Контекст, Последствия, Решение

### Community 77 - "risks.md"
Cohesion: 0.12
Nodes (19): Guest via Link (web, no account), Canvas + Pointer Events Pen Layer, Платный аккаунт Apple Developer; Team ID задаётся на Mac при первой подписи, в репозитории не хранится, Graphify, Автоматизация, Команды, Обновление графа после правки документов (по шагам), Почему два способа обновления (+11 more)

### Community 79 - "План разработки"
Cohesion: 0.15
Nodes (13): Критерии приёмки, План разработки, Подготовка, Потоки разработки (D-39), Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad) (+5 more)

### Community 80 - "0028-dev-workflow.md"
Cohesion: 0.17
Nodes (14): GitHub Actions CI (incl. macOS iOS builds), XcodeGen, Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, Последствия: ошибки сборки видны с задержкой CI; ощущение пера проверяет только пользователь на iPad (Pencil Pro) (+6 more)

### Community 81 - "shared/package.json"
Cohesion: 0.18
Nodes (12): dependencies, libsodium-wrappers-sumo@^0.8.2, zod@^4.1.0, description, files, libsodium-wrappers-sumo, name, private (+4 more)

### Community 82 - "Shared test vectors (input -> expected output) run in Swift and TypeScript"
Cohesion: 0.15
Nodes (11): iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), apps/server — сервер, apps/web — веб-клиент, Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), Stream core (claude/core): packages/shared, packages/test-vectors, root configs — contract types, crypto, stroke codec, document schema, sync client, test vectors, Stream web-app (claude/web-app): apps/web — web shell: login, sidebar, spaces/notebooks/folders, tasks, calendar, sharing, offline, PWA, iPhone and iPad share one codebase (universal app), packages/shared — общие TypeScript-типы и схемы (+3 more)

### Community 83 - "D-38. Дизайн-направление — «Тихая бумага», ориентир Craft"
Cohesion: 0.40
Nodes (5): D-05. Перо при перекладке текста — вариант А «живой штрих», Гипотеза реализации, Контекст, Последствия, Решение

### Community 84 - "Контракт: REST API сервера (v1)"
Cohesion: 0.17
Nodes (12): Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1), Общее, Служебное, Токены агентов (`spec/09-agents-api.md`) (+4 more)

### Community 85 - "generate.ts"
Cohesion: 0.14
Nodes (17): toHex(), uuidv7FromParts(), packPoints(), base(), p(), check, files, root (+9 more)

### Community 86 - ".prettierrc.json"
Cohesion: 0.50
Nodes (3): printWidth, singleQuote, trailingComma

### Community 87 - "0008-pdf-annotations.md"
Cohesion: 0.19
Nodes (11): D-08. Аннотации PDF пером — не в MVP, Аннотации PDF пером (PDFKit + свой слой штрихов) — после MVP, этап расширений, Решение, Решение (предложение), D-16. Импорт — не сейчас, Решение, CLOSED: PDF annotations after MVP (D-08), R-08 Huge Project Scope (+3 more)

### Community 88 - "Контракт: протокол синхронизации (v1)"
Cohesion: 0.22
Nodes (9): 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05), 6. Права, 7. Коды ошибок, 8. Тестовые векторы (+1 more)

### Community 89 - "Контракт: модель документа (v1)"
Cohesion: 0.12
Nodes (17): 1. Три вида документов Yjs, 2. Документ `account`, 3. Документ `notebook` (индекс блокнота), 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note` (+9 more)

### Community 90 - "0032-min-ios-version.md"
Cohesion: 0.27
Nodes (9): D-32. Минимальная версия iOS/iPadOS — 26, Минимальная версия iOS/iPadOS 26 (IPHONEOS_DEPLOYMENT_TARGET = 26.0), Liquid Glass — системный дизайн iOS 26, Отклонённые варианты: iOS 18+ (шире охват) и 17.5+ (минимум для Pencil Pro), Последствия, Рассмотренные варианты, Решение, CLOSED: minimum iOS 26+ (D-32); XcodeGen accepted (D-39); Bundle ID (D-33); paid Apple Developer account exists (+1 more)

### Community 91 - "Контракт: рукописные штрихи (v1)"
Cohesion: 0.22
Nodes (9): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4.1. Перепривязка якорей (отмена и восстановление версии), 4.2. Когда штрих считается «осиротевшим» и удаляется навсегда, 4. Привязка к тексту (живой штрих), 5. Отрисовка толщины, 6. Тестовые векторы (+1 more)

### Community 93 - "development.md"
Cohesion: 0.18
Nodes (17): Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, Стартовый хук Claude Code (.claude/hooks/session-start.sh), docs/history session log, D-23 (документация), git-хук Graphify (пересборка только по изменённому коду), Graphify 0.9.95 (пакет graphifyy), Смысловой слой графа (понятия, решения, связи — проход ИИ), Структурный слой графа (код, файлы, заголовки — без ИИ) (+9 more)

### Community 94 - "Stream design-system (claude/design-system): packages/design-tokens, packages/ui, apps/ios/Packages/DSDesign — Quiet Paper tokens, web and SwiftUI components"
Cohesion: 0.38
Nodes (5): Stream design-system (claude/design-system): packages/design-tokens, packages/ui, apps/ios/Packages/DSDesign — Quiet Paper tokens, web and SwiftUI components, packages/design-tokens — дизайн-токены «Тихая бумага», tokens.json as source of Quiet Paper design token values; generators to CSS variables (web) and Swift (iOS), packages/ui — веб-компоненты дизайн-системы, React design-system components on Radix + Tailwind + Motion in Quiet Paper style

### Community 95 - "3. Apple Pencil в тексте — ключевая фича"
Cohesion: 0.22
Nodes (9): 3. Apple Pencil в тексте — ключевая фича, Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера, Перекладка текста — вариант А «живой штрих» (D-05, РЕШЕНО) (+1 more)

### Community 96 - "Модель данных — ЧЕРНОВИК"
Cohesion: 0.40
Nodes (5): Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3), Штрих (черновик для прототипа)

### Community 97 - "0010-agent-edits.md"
Cohesion: 0.32
Nodes (6): Метка agentEdit (agentId, at) — подсветка правок агента до принятия пользователем, D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение

### Community 98 - "0041-craft-inspired-features.md"
Cohesion: 0.25
Nodes (6): Ежедневные заметки и «Входящие» (kind daily / inbox) в блокноте settings.dailyNotebookId, D-41. Набор функций по мотивам Craft, Контекст, Решение, OPEN (before stage 2): Craft features MVP / post-MVP split (D-41, proposed), Stage 2: MVP on iPad and iPhone, local (editor, handwriting, links, tags, organization, search, design system)

### Community 99 - "Процесс разработки"
Cohesion: 0.33
Nodes (6): Git, Две среды, Конец сессии, Кто что делает, Правила для сессий-исполнителей (D-39), Процесс разработки

### Community 100 - "pm-schema.ts"
Cohesion: 0.33
Nodes (3): cellAttrs, id, schema

### Community 101 - "D-22. Без собственного общего ядра на Rust"
Cohesion: 0.40
Nodes (5): D-22. Без собственного общего ядра на Rust, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 102 - "D-25. Redis не используем"
Cohesion: 0.40
Nodes (5): D-25. Redis не используем, Будущее, Контекст, Последствия, Решение

### Community 103 - "D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO"
Cohesion: 0.40
Nodes (5): D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 104 - "4. Редактор"
Cohesion: 0.40
Nodes (5): 4. Редактор, Платформенная реализация, Прочее, Связи, Содержимое

### Community 105 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, lint, test, test:watch, typecheck

### Community 106 - "11. Нефункциональные требования"
Cohesion: 0.40
Nodes (5): 11. Нефункциональные требования, Доступность, Надёжность, Ресурсы сервера, Языки

### Community 107 - "yjs"
Cohesion: 0.50
Nodes (4): yjs@^13.6.27, yjs, peerDependencies, yjs@^13.6.0

### Community 108 - "D-23. Документация — источник истины; Graphify — граф знаний поверх неё"
Cohesion: 0.50
Nodes (4): D-23. Документация — источник истины; Graphify — граф знаний поверх неё, Контекст, Последствия, Решение

### Community 109 - "D-27. В прототипе пера текст хранится в Yrs"
Cohesion: 0.50
Nodes (4): D-27. В прототипе пера текст хранится в Yrs, Контекст, Последствия, Решение

### Community 110 - "D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления"
Cohesion: 0.50
Nodes (4): D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления, Контекст, Рассмотренные варианты, Решение

### Community 111 - "Stream agents (claude/agents): packages/agents, agents-api contract draft — MCP, REST, tokens, log, PNG render"
Cohesion: 0.67
Nodes (3): Stream agents (claude/agents): packages/agents, agents-api contract draft — MCP, REST, tokens, log, PNG render, Agents package: MCP server (Streamable HTTP, OAuth 2.1), REST for agents, handwriting PNG render; plugs into apps/server as plugin, packages/agents — доступ внешних ИИ-агентов

### Community 112 - "./document"
Cohesion: 0.67
Nodes (3): import, types, ./document

### Community 116 - "test-vectors/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, lib, noEmit, types, extends, include, ../../tsconfig.base.json

## Knowledge Gaps
- **51 isolated node(s):** `RFC-4648`, `RFC-9562`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `Current status: stack approved, next is stage 1 pencil prototype` (+46 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 670 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Контракт: модель документа (v1)` connect `Контракт: модель документа (v1)` to `document-model.md`?**
  _High betweenness centrality (0.265) - this node is a cross-community bridge._
- **What connects `RFC-4648`, `RFC-9562`, `../../tsconfig.base.json` to the rest of the system?**
  _51 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `0011-handwriting-for-agents.md` be split into smaller, more focused modules?**
  _Cohesion score 0.09259259259259259 - nodes in this community are weakly interconnected._
- **Why does `Контракт: REST API сервера (v1)` connect `Контракт: REST API сервера (v1)` to `api.md`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Should `stack.md` be split into smaller, more focused modules?**
  _Cohesion score 0.1140819964349376 - nodes in this community are weakly interconnected._
- **Should `0031-crdt-yjs.md` be split into smaller, more focused modules?**
  _Cohesion score 0.10099573257467995 - nodes in this community are weakly interconnected._
- **Should `layout.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14761904761904762 - nodes in this community are weakly interconnected._