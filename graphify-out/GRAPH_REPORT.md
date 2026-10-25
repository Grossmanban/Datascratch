# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 135 files · ~50,793 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .css 2)

## Summary
- 1568 nodes · 3336 edges · 111 communities (106 shown, 5 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 474 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b01d4ab5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Монорепозиторий и CLAUDE.md
- sync-protocol.md
- strokes.md
- D-30. База данных сервера — PostgreSQL
- 09-agents-api.md
- MCP + REST API
- roadmap.md
- stack.md
- open-questions.md
- Правила для ИИ и документации
- 08-sharing.md
- 0005-living-stroke.md
- CHANGELOG.md
- decisions/README.md
- Правила для ИИ и документации (2) (2)
- Контракт: модель документа (v1)
- Stage 4: web client (parity with iOS, link sharing, guests, Universal Links)
- D-28. Процесс разработки: облако + Mac, сборка iOS в CI
- 04-editor.md
- Модель данных и глоссарий (2)
- 0004-encryption-and-api.md
- api.md
- Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1)
- 0037-guest-links.md
- package.json
- compilerOptions
- Скрипт обновления графа
- Organization Hierarchy (Account > Space > Notebook > Folder > Note)
- 0009-notebook-mode-choice.md (3)
- Server stack
- Stage 3: server, sync, encryption (accounts, CRDT sync, history compaction, two notebook modes, docker compose, VPS, backups)
- 12. Функции по мотивам Craft
- glossary.md
- design-tokens.md
- План этапов и отложенное
- Модель данных и глоссарий (2) (2)
- Компоненты стека (2) (2)
- open-questions.md (2)
- Контракт: модель документа (v1) (2)
- Модель данных и глоссарий (5)
- 02-platforms.md
- tasks
- Контракт: шифрование (v1)
- 06-data-server.md
- PostgreSQL
- PenLayer.ts
- Монорепозиторий и CLAUDE.md (2)
- src/index.ts
- D-30. База данных сервера — PostgreSQL
- D-41. Набор функций по мотивам Craft
- Технологический стек — РЕШЕНО (2026-10-25)
- iOS-стек и два языка (2)
- Правила для ИИ и документации (4)
- DatascratchEditor
- Обзор архитектуры: разделы
- 0001-storage-in-database.md
- Дизайн и организация (2)
- strokes.ts
- iOS-стек и два языка (2) (2)
- NoteMeta: folderId, parentNoteId, title, kind, dailyDate, tags, wrappedKey, trashedAt, order
- Платформы и клиенты (2)
- 0009-notebook-mode-choice.md (5)
- Контракт: дизайн-токены «Тихая бумага» (v1) (2)
- PenLayer.ts
- D-21. Технологический стек
- D-21. Технологический стек (2)
- 0030-server-database-postgresql.md
- 04-editor.md (4)
- 07-encryption.md
- 08-sharing.md
- open-questions.md (3)
- D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS) (2)
- @tiptap/core
- 0024-product-name.md
- План разработки
- 12. Функции по мотивам Craft
- pnpm-workspace.yaml
- compilerOptions
- 0016-no-import-now.md
- 0033-bundle-id.md
- 9. API и внешние ИИ-агенты
- 11. Нефункциональные требования
- web-editor/package.json
- 0005-living-stroke.md
- Модель данных — ЧЕРНОВИК
- 0008-pdf-annotations.md
- Контракт: модель документа (v1)
- scripts
- D-01. Хранение заметок — в базе данных на своём сервере, не в файлах
- D-22. Без собственного общего ядра на Rust
- tasks
- Контракт: рукописные штрихи (v1)
- 0003-platforms.md
- 0032-min-ios-version.md
- 2. Платформы
- Контракт: REST API сервера (v1)
- risks.md
- blockId.ts
- Технологический стек — РЕШЕНО (2026-10-25)
- 12. Функции по мотивам Craft
- Datascratch — правила для ИИ
- 0002-no-desktop-app.md
- Stream design-system (claude/design-system): packages/design-tokens, packages/ui, apps/ios/Packages/DSDesign — Quiet Paper tokens, web and SwiftUI components
- host.ts
- 8. Совместная работа и шеринг
- 0034-auth-email-password.md
- D-39. Разработка параллельными сессиями; Claude сам вливает в main
- katex
- @tiptap/extension-code-block-lowlight
- @tiptap/extension-horizontal-rule
- @tiptap/extension-table

## God Nodes (most connected - your core abstractions)
1. `PenLayer` - 42 edges
2. `DatascratchEditor()` - 25 edges
3. `Stage 1: pen-in-text prototype on iPad (TextKit 2 + Yrs + pen layer, living stroke)` - 20 edges
4. `@tiptap/core` - 19 edges
5. `yjs` - 17 edges
6. `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` - 17 edges
7. `compilerOptions` - 15 edges
8. `Yrs (Rust Yjs) with Swift Wrapper` - 14 edges
9. `Процесс разработки (docs/development.md)` - 14 edges
10. `2026-10-25` - 13 edges

## Surprising Connections (you probably didn't know these)
- `4.2. Схема блоков` --references--> `label()`  [INFERRED]
  docs/architecture/contracts/document-model.md → tools/graphify_docs.py
- `Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО` --semantically_similar_to--> `Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/README.md
- `Web editor: TipTap + Yjs per document-model contract, all blocks, Canvas pen layer per strokes contract` --semantically_similar_to--> `Web editor: TipTap (ProseMirror) + Yjs`  [INFERRED] [semantically similar]
  packages/web-editor/README.md → docs/spec/04-editor.md
- `3. Упаковка точек` --references--> `t()`  [INFERRED]
  docs/architecture/contracts/strokes.md → packages/web-editor/demo/sample.ts
- `Graph update after doc edits: graphify_docs.py prepare -> parallel extraction agents -> finish -> graphify export html -> check-update` --references--> `prepare()`  [EXTRACTED]
  docs/development.md → tools/graphify_docs.py

## Import Cycles
- None detected.

## Communities (111 total, 5 thin omitted)

### Community 0 - "Монорепозиторий и CLAUDE.md"
Cohesion: 0.14
Nodes (20): apps/ios — iPhone + iPad, Custom iOS Pen Render Layer (Metal or Core Animation), TextKit 2 (UIKit editor), Canvas + Pointer Events Pen Layer, Cross-stream contracts (docs/architecture/contracts/) changed only via the coordinator session, Claude coordinator merges stream branches into main when CI is green, ProMotion (120 Hz), R-01 Pen-in-Text May Not Work (+12 more)

### Community 1 - "sync-protocol.md"
Cohesion: 0.06
Nodes (51): Формат ошибок { error: { code, message } } и коды bad_request…internal, История версий: GET /docs/:id/versions и /versions/:seq (зашифрованные снимки), Метка agentEdit (agentId, at) — подсветка правок агента до принятия пользователем, 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05) (+43 more)

### Community 2 - "strokes.md"
Cohesion: 0.16
Nodes (20): Перепривязка якорей после отмены/повтора: в той же транзакции якорь удалённого символа с redone-элементом переписывается на относительную позицию нового элемента, Координаты block / image / drawing — в долях ширины блока, Правило D-35 в отрисовке: точки удалённых символов не рисуются, штрих остаётся в документе; отмена возвращает пометку, Координаты text-штриха: смещение от начала глифа якорного символа в em, Записываются только сглаженные coalesced-точки завершённого штриха, без predicted, Штрих почти неизменяем после рисования; ластик удаляет штрих целиком или заменяет кусками, Разрыв штриха по строкам: соседние точки на разных line fragments → отдельные сегменты, Изменяемые поля штриха после рисования: anchors (перепривязка, §4.1) и hidden (резерв) (+12 more)

### Community 3 - "D-30. База данных сервера — PostgreSQL"
Cohesion: 0.19
Nodes (10): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, Контекст, Решение (на сейчас) (+2 more)

### Community 4 - "09-agents-api.md"
Cohesion: 0.15
Nodes (16): AgentToken { id, name, notebookIds, permission, expiresAt, createdAt, lastUsedAt } — без секрета, Токены агентов /agent-tokens: блокноты, read / read_write, срок; токен показывается один раз, Контракт agents-api.md (MCP и REST для самих агентов) — появится на этапе агентов, blockId (UUIDv7) у каждого блочного узла — для точечных правок агентов, заметок на полях и комментариев, Export: Markdown, PDF, HTML (handwriting as images), pg-boss background job queue on PostgreSQL, PostgreSQL via Drizzle (D-30): accounts, notebooks, rights, tokens, encrypted updates, snapshots, agent log, Server responsibilities: accounts, encrypted relay, attachments, realtime, API/MCP, handwriting PNG render (+8 more)

### Community 5 - "MCP + REST API"
Cohesion: 0.20
Nodes (15): Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, Handwriting-to-PNG Render (pg-boss queue), Key Store (agent notebooks), MCP + REST API, Official MCP TypeScript SDK (Streamable HTTP, OAuth 2.1) (+7 more)

### Community 6 - "roadmap.md"
Cohesion: 0.18
Nodes (7): D-19. Весь код пишет Claude, Последствия, Решение, D-23. Документация — источник истины; Graphify — граф знаний поверх неё, Контекст, Последствия, Решение

### Community 7 - "stack.md"
Cohesion: 0.22
Nodes (12): Web PWA Client (React, TipTap, Yjs, IndexedDB), Astro (landing page), Dexie (IndexedDB), Drizzle ORM, GRDB (SQLite), TypeScript on Node.js, pnpm + Turborepo Monorepo, Swift 6 (+4 more)

### Community 8 - "open-questions.md"
Cohesion: 0.24
Nodes (10): End-to-end encryption, Pen prototype (stage 1), Automerge (fallback CRDT), Last-write-wins (unsuitable), Loro (too early), Operational Transformation (unsuitable), Yjs RelativePosition as stroke-point anchor, Yjs (+2 more)

### Community 9 - "Правила для ИИ и документации"
Cohesion: 0.16
Nodes (12): Стартовый хук Claude Code (.claude/hooks/session-start.sh), D-29. Graphify: порядок работы, чтобы граф был всегда актуален, git-хук Graphify (пересборка только по изменённому коду), Graphify 0.9.95 (пакет graphifyy), R-09 (риск: Graphify сломается или исчезнет), Смысловой слой графа (понятия, решения, связи — проход ИИ), Структурный слой графа (код, файлы, заголовки — без ИИ), Контекст (+4 more)

### Community 10 - "08-sharing.md"
Cohesion: 0.22
Nodes (9): D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account, Real-time collaborative editing, Universal Links (paid Apple Developer account), Последствия, Решение, Real-time co-editing with cursors and presence (guests shown as Guest), Universal Links: open in app if installed, else web (needs paid Apple Developer account and apple-app-site-association) (+1 more)

### Community 11 - "0005-living-stroke.md"
Cohesion: 0.14
Nodes (11): D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, Порядок чтения для новичка: концепция → roadmap → стек → обзор → перо → решения → вопросы/риски → процесс → history, Notesnook (reference product: E2E encryption, reliable sync), Handwriting input types (text marks, margin notes, drawing block, drawing on images, Scribble), Pencil gestures (zigzag delete, underline, strike, lasso) (+3 more)

### Community 12 - "CHANGELOG.md"
Cohesion: 0.14
Nodes (20): 2026-10-25, 2026-10-25 (вторая половина дня), Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел), Каркас монорепозитория (pnpm + Turborepo), девять потоков разработки, правила сессий-исполнителей, changelog.d, Создан CLAUDE.md и скелет монорепозитория (apps/, packages/, infra/), Формат журнала: новые записи сверху, дата — что изменилось (ссылки на решения) (+12 more)

### Community 13 - "decisions/README.md"
Cohesion: 0.17
Nodes (15): ADR file number equals decision number (D-05 -> 0005-*.md), template 0000-template.md, Нумерация решений D-NN и файлы decisions/00NN-*.md, Документация Datascratch — единственный источник истины, history/ — архив, не источник истины; исключена из графа (.graphifyignore), Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Правило замены: решение РЕШЕНО не переписывается, ADR получает статус «ЗАМЕНЕНО решением D-NN», Оглавление docs/ (spec, contracts, architecture, decisions, roadmap, risks…), Документация Datascratch (+7 more)

### Community 14 - "Правила для ИИ и документации (2) (2)"
Cohesion: 0.14
Nodes (16): Скрипт tools/graphify_docs.py (prepare → агенты → finish), Stream sessions write changelog fragments in docs/changelog.d/ instead of editing CHANGELOG.md; stream history files docs/history/YYYY-MM-DD-<stream>-NN.md, Graph update after doc edits: graphify_docs.py prepare -> parallel extraction agents -> finish -> graphify export html -> check-update, Extraction prompt .claude/skills/graphify/references/extraction-spec.md, Git, Git: English code/commits, Russian docs, branches + PR, one commit = code + docs + updated graph, Graphify commands (query, explain, path, update, check-update, /graphify --update), graphifyy PyPI package (command graphify), verified on 0.9.95 (+8 more)

### Community 15 - "Контракт: модель документа (v1)"
Cohesion: 0.21
Nodes (16): y-prosemirror не записывает атрибуты узлов со значением null: отсутствующий атрибут = null (значение по умолчанию схемы), Документ account: spaces, notebooks, settings, starred, tabs (ключ — masterKey), Comment { blockId, anchor (относительные позиции), author user | guest | agent, text, resolvedAt }, Даты ISO 8601 в UTC; «только дата» YYYY-MM-DD; миллисекунды — только в штрихах, Векторы совместимости модели документа packages/test-vectors/document/* (iOS/Yrs обязан читать и писать формат y-prosemirror), Блок drawing (высота в pt; штрихи — в strokes), Вставка текста в Y.XmlText без явных атрибутов наследует форматирование слева (Yjs/Yrs) — писатели всегда передают явный набор атрибутов, Значение метки — объект атрибутов ({ bold: {} }, { link: { href, … } }); читатели принимают {} и true и ключи <имя>--<хэш> (+8 more)

### Community 16 - "Stage 4: web client (parity with iOS, link sharing, guests, Universal Links)"
Cohesion: 0.40
Nodes (6): Платный аккаунт Apple Developer; Team ID задаётся на Mac при первой подписи, в репозитории не хранится, Universal Links, Apple Developer Account, R-12 No Paid Apple Account (7-day installs), Stage 4: web client (parity with iOS, link sharing, guests, Universal Links), Shared with me documents (stage 4, with sharing)

### Community 17 - "D-28. Процесс разработки: облако + Mac, сборка iOS в CI"
Cohesion: 0.11
Nodes (25): XcodeGen project.yml (D-28), GitHub Actions CI (incl. macOS iOS builds), XcodeGen, Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo (+17 more)

### Community 18 - "04-editor.md"
Cohesion: 0.18
Nodes (13): Схема блоков: doc = title block+ (paragraph, heading, списки, taskList, callout, codeBlock, mathBlock, mermaid, table, image, file, drawing, pageCard), Производные данные строятся локально: индекс задач, полнотекстовый поиск, бэклинки, теги, Inline-узлы noteLink ([[ ]]) и tag (без #, вложенность через /), taskItem: taskId, state open / done / cancelled, scheduled, deadline, completedAt, Obsidian (reference product: links, backlinks, tags, Markdown export), Backlinks, Editor content (headings, lists, tables, code, formulas, attachments, drawing blocks), iOS editor: UIKit + TextKit 2 (+5 more)

### Community 19 - "Модель данных и глоссарий (2)"
Cohesion: 0.24
Nodes (9): meta.formatVersion = 1; документ новее клиента открывается только для чтения (R-03), Версионирование контрактов v1, v2…; ломающее изменение — новая версия с явной миграцией, Поля штриха: v, tool, color, width, opacity, anchorKind, blockId, anchors, points, hint, author, createdAt, Anchor (textRange / paragraph / drawingBlock / image), Note, Stroke, StrokePoint, RelativePosition (CRDT) (+1 more)

### Community 20 - "0004-encryption-and-api.md"
Cohesion: 0.17
Nodes (11): PATCH /notebooks/:id/mode — включение режима «для агентов» передаёт notebookKey, выключение удаляет серверную обёртку, Режим «для агентов»: клиент передаёт notebookKey по TLS, сервер оборачивает его serverKey; расшифровка только при запросе агента с токеном, D-04. Одновременно сквозное шифрование и доступ по API, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), Контекст, Последствия, Решение (+3 more)

### Community 21 - "api.md"
Cohesion: 0.17
Nodes (15): Аккаунт и устройства: /me, /devices (отзыв сессий), удаление аккаунта, Эндпоинты /auth: prelogin, signup, login, refresh, logout, recovery, password, Аутентификация Bearer: accessToken 15 мин + refreshToken 30 дней с ротацией, Идентификаторы создаёт клиент (UUIDv7); повторный POST идемпотентен, иначе 409 conflict, Device { id, name, createdAt, lastSeenAt, current } — устройство (сессия) аккаунта, POST /shares/:id/guest — гостевой токен (без авторизации) для hello в синхронизации, GET /health → { ok: true, version } — служебная проверка сервера, Notebook { id, mode, createdAt, wrappedKey } — ответ /notebooks (+7 more)

### Community 22 - "Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1)"
Cohesion: 0.13
Nodes (14): apps/server — сервер, Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), apps/web — веб-клиент, Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), Stream core (claude/core): packages/shared, packages/test-vectors, root configs — contract types, crypto, stroke codec, document schema, sync client, test vectors, App server: Node.js + TypeScript (Fastify), packages/shared — общие TypeScript-типы и схемы, Shared TypeScript types and schemas (document, strokes, metadata, sync protocol, API) (+6 more)

### Community 23 - "0037-guest-links.md"
Cohesion: 0.22
Nodes (13): POST /docs — регистрация документа (account / notebook / note) до первого push, Share { id, target { kind, id }, permission, expiresAt, createdAt } — ссылка шеринга, Шеринг: /shares (view/edit, бессрочно по умолчанию, отзыв сразу отключает гостей), Права: user — документы своего аккаунта; guest — только документы шеринга, push только с правом edit, Guest via Link (web, no account), D-37. Гости по ссылке рисуют; ссылка живёт до отзыва, Гости со ссылкой на правку пишут и рисуют (пером, пальцем, мышью), Ссылка по умолчанию действует до отзыва; срок можно задать при создании (+5 more)

### Community 24 - "package.json"
Cohesion: 0.14
Nodes (15): devDependencies, turbo@^2.3.0, typescript@^5.6.0, engines, node, typescript, name, packageManager (+7 more)

### Community 25 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+7 more)

### Community 26 - "Скрипт обновления графа"
Cohesion: 0.28
Nodes (7): Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 27 - "Organization Hierarchy (Account > Space > Notebook > Folder > Note)"
Cohesion: 0.08
Nodes (37): CoreOptions, HostRef, Callout, CALLOUT_TONES, Commands, Drawing, DRAWING_REFERENCE_WIDTH, FileBlock (+29 more)

### Community 28 - "0009-notebook-mode-choice.md (3)"
Cohesion: 0.13
Nodes (25): Вложения: загрузка и докачка по кускам (/attachments/:id/chunks/:index), лимит 200 МБ, Ассоциированные данные ds1|… привязывают шифротекст к месту (doc, awareness, ключи, куски вложений), Вложения шифруются кусками по 1 MiB, каждый — отдельный конверт, Конверт шифротекста: версия 0x01 + nonce 24 байта + XChaCha20-Poly1305-IETF (тег 16 байт), Иерархия ключей: пароль → passwordKey → masterKey → notebookKey → noteKey, libsodium на всех платформах (libsodium-wrappers-sumo в TS, swift-sodium в iOS), loginKey = BLAKE2b(authSeed, "ds1|login"); сервер хранит Argon2id(loginKey), masterKey — 32 случайных байта, создаётся при регистрации, шифрует account-документ (+17 more)

### Community 29 - "Server stack"
Cohesion: 0.20
Nodes (11): Canvas + Pointer Events, Dexie (IndexedDB), Drizzle ORM, Fastify, MCP TypeScript SDK, OAuth 2.1, Radix + Tailwind + Motion, Server stack (+3 more)

### Community 30 - "Stage 3: server, sync, encryption (accounts, CRDT sync, history compaction, two notebook modes, docker compose, VPS, backups)"
Cohesion: 0.40
Nodes (5): VPS Hosting (Hetzner or similar), Recovery Key for Forgotten Password, OPEN (before stage 3): server hosting and domain, when the user buys a VPS (D-40), R-11 Single VPS Is a Single Point of Failure, Stage 3: server, sync, encryption (accounts, CRDT sync, history compaction, two notebook modes, docker compose, VPS, backups)

### Community 31 - "12. Функции по мотивам Craft"
Cohesion: 0.22
Nodes (14): OPEN (before stage 2): Craft features MVP / post-MVP split (D-41, proposed), Stage 2: MVP on iPad and iPhone, local (editor, handwriting, links, tags, organization, search, design system), Stream web-app (claude/web-app): apps/web — web shell: login, sidebar, spaces/notebooks/folders, tasks, calendar, sharing, offline, PWA, Calendar screen: day feed with tasks and daily note (MVP); system calendar integration after MVP, Card document: nested document shown as a card with cover (MVP), Collections: records with properties and table / gallery / kanban views with filter, sort, grouping (after MVP), Daily note: one per day, created on demand, from template (MVP), Document cover image with offset (MVP) (+6 more)

### Community 32 - "glossary.md"
Cohesion: 0.19
Nodes (12): doc_updates Table (encrypted Yjs updates), Automerge (fallback CRDT), Yrs (Rust Yjs) with Swift Wrapper, ADR (Architecture Decision Record), CRDT, End-to-End Encryption (E2E), PencilKit / PKCanvasView, Private Notebook (+4 more)

### Community 33 - "design-tokens.md"
Cohesion: 0.06
Nodes (44): Подложки backdrop.* (sand, dusk, mist, meadow, ember) — мягкие градиенты в духе Craft, Цветовые токены: bg.canvas («бумага»), text.primary («чернила»), accent («синие чернила»), danger/success/warning — светлая и тёмная тема, Ширина колонки документа: normal 720, wide 960, full, Тактильная отдача iOS: selection, success (задача выполнена), warning (удаление), Чернила пера ink.* (black, blue, red, green, purple, brown) и маркеры highlight.*, Движение: пружины motion.snappy / smooth / gentle, длительности duration.* для веба, Сетка отступов 4 pt, радиусы radius.*, тени shadow.card / shadow.popover, Цвета tint.* (.fg / .bg) для папок, тегов и выносок (+36 more)

### Community 34 - "План этапов и отложенное"
Cohesion: 0.11
Nodes (19): dependencies, lowlight@^3.3.0, @tiptap/core@^3.32.0, @tiptap/extension-link@^3.32.0, @tiptap/extension-list@^3.32.0, @tiptap/extensions@^3.32.0, @tiptap/pm@^3.32.0, @tiptap/react@^3.32.0 (+11 more)

### Community 35 - "Модель данных и глоссарий (2) (2)"
Cohesion: 0.22
Nodes (9): Тестовые векторы crypto: KDF, конверты, Base32 ключа восстановления, куски вложений (Swift и TS), Контракт — точное описание формата/протокола, который реализуют несколько частей (iOS на Swift, веб и сервер на TS), Совместимость доказывается общими тестовыми векторами (packages/test-vectors), Типы TypeScript контрактов в packages/shared/src/contracts/ — часть контракта, Контракты между частями системы, Правила изменения, Тестовые векторы strokes: упаковка точек, разрешение якорей после правок, правило D-35, Тестовые векторы sync: примеры всех сообщений в JSON (схема проверяется в TS и Swift) (+1 more)

### Community 36 - "Компоненты стека (2) (2)"
Cohesion: 0.19
Nodes (14): Убран Redis (D-25): один процесс сервера, очередь — pg-boss на PostgreSQL, pg-boss job queue, D-25. Redis не используем, Edit broadcast interface (in-memory), PostgreSQL LISTEN/NOTIFY, Redis (rejected), Valkey (free Redis alternative), Будущее (+6 more)

### Community 37 - "open-questions.md (2)"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 38 - "Контракт: модель документа (v1) (2)"
Cohesion: 0.08
Nodes (21): TestEditor(), TestEditorProps, Window, App(), attachments, awA, awB, docA (+13 more)

### Community 39 - "Модель данных и глоссарий (5)"
Cohesion: 0.25
Nodes (8): Graphify, Автоматизация, Команды, Обновление графа после правки документов (по шагам), Почему два способа обновления, Установка на Mac (один раз), Что где лежит, R-09 Graphify Is a Young Third-Party Tool

### Community 40 - "02-platforms.md"
Cohesion: 0.19
Nodes (9): D-06. Рисование пальцем на iPhone — да, опционально, Finger drawing toggle on iPhone, Решение, D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, UI languages Russian and English, no RTL (D-17), iPad client (primary, Apple Pencil / Pencil Pro squeeze and roll, hover, Stage Manager, keyboard shortcuts) (+1 more)

### Community 41 - "tasks"
Cohesion: 0.06
Nodes (31): concurrency, cancel-in-progress, group, run, CI, jobs, test, name (+23 more)

### Community 42 - "Контракт: шифрование (v1)"
Cohesion: 0.20
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 43 - "06-data-server.md"
Cohesion: 0.14
Nodes (14): Решения по анкетам пользователя: D-32…D-41 и PDF после MVP (D-08), D-40. Хостинг — позже; сервер готов к запуску одной командой, Решение, Stream server (claude/server): apps/server, infra/ — Fastify, PostgreSQL, auth, sync, attachments, sharing, docker compose, 6. Модель данных и сервер, Daily off-VPS backups of DB and files with verified restore (R-11), Self-hosting, Модель данных (общий обзор; детали — `architecture/data-model.md`) (+6 more)

### Community 44 - "PostgreSQL"
Cohesion: 0.25
Nodes (10): Журнал действий агента GET /agent-tokens/:id/audit, Транспорт wss://<host>/v1/sync: JSON-кадры с type, base64url, ping/pong каждые 25 с, agent_tokens / agent_audit_log Tables, Server PostgreSQL Schema (Stage 3 Draft), docker compose Self-Hosting (server + PostgreSQL), pg-boss Job Queue, Scaling via PostgreSQL LISTEN/NOTIFY, PostgreSQL (+2 more)

### Community 45 - "PenLayer.ts"
Cohesion: 0.18
Nodes (18): bindToText(), distToSegment(), glyphForX(), groupLines(), hitsSegments(), intervalDistance(), leadingEdge(), lineForPoint() (+10 more)

### Community 46 - "Монорепозиторий и CLAUDE.md (2)"
Cohesion: 0.13
Nodes (6): RenderPoint, resetFontMetrics(), PenLayer, fillSegments(), prepareCanvas(), pointerSample()

### Community 47 - "src/index.ts"
Cohesion: 0.17
Nodes (24): META_ORIGIN, Cover(), DatascratchEditorProps, EditorUser, FONT_VARS, WIDTHS, initNoteMeta(), NoteMetaState (+16 more)

### Community 48 - "D-30. База данных сервера — PostgreSQL"
Cohesion: 0.22
Nodes (16): addDays(), Commands, dateChipLabel(), localDate(), MONTHS, nextWeek(), requestTaskMenu(), TASK_MENU_EVENT (+8 more)

### Community 49 - "D-41. Набор функций по мотивам Craft"
Cohesion: 0.32
Nodes (5): bindToSurface(), splitStroke(), packPoints(), StrokeTool, strokeToYMap()

### Community 50 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.12
Nodes (16): devDependencies, happy-dom@^21.0.4, react@^19.0.0, @types/katex@^0.16.8, @types/react@^19.0.0, @types/react-dom@^19.0.0, typescript@^5.6.0, vite@^8.3.5 (+8 more)

### Community 51 - "iOS-стек и два языка (2)"
Cohesion: 0.18
Nodes (10): AnchorBox, Glyph, segmentsBounds(), blockIdOf(), blockIds, ElementInfo, FontMetrics, LayoutPass (+2 more)

### Community 52 - "Правила для ИИ и документации (4)"
Cohesion: 0.19
Nodes (16): vitest@^5.0.5, decodeAnchor(), encodeCharAnchor(), followRedone(), followRedoneId(), isAnchorDeleted(), ProsemirrorMapping, rebaseRedoneAnchors() (+8 more)

### Community 53 - "DatascratchEditor"
Cohesion: 0.11
Nodes (22): DatascratchEditor(), useHostRef(), BubbleToolbar(), Panel, selectionRect(), BlockMenu(), blockTargetAt(), DragHandle() (+14 more)

### Community 54 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 55 - "0001-storage-in-database.md"
Cohesion: 0.31
Nodes (5): hint — распознанная форма (underline, strike, circle, highlight, arrow, scribble) для агентов и экспорта, Markdown files option (rejected), Obsidian, Own server storage, PostgreSQL

### Community 56 - "Дизайн и организация (2)"
Cohesion: 0.13
Nodes (20): Space { id, name, icon, color, order, createdAt } в account-документе, Organization Hierarchy (Account > Space > Notebook > Folder > Note), D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, D-14. Организация: богатая, но не перегруженная, Предложенная структура: пространства → вложенные папки; поперёк — вложенные и умные теги, цвета, избранное, недавние, Решение, Поперёк структуры — теги, умные теги, избранное, недавние (+12 more)

### Community 57 - "strokes.ts"
Cohesion: 0.27
Nodes (8): FIELDS, POINT_BYTES, POINT_FLOATS, pressureCurve(), StrokeAnchorKind, strokeFromYMap(), StrokeHint, unpackPoints()

### Community 58 - "iOS-стек и два языка (2) (2)"
Cohesion: 0.18
Nodes (11): Custom pen renderer (Metal vs Core Animation TBD), GRDB (SQLite), iOS client stack, Node.js + TypeScript server, Swift 6, SwiftUI (shell), TypeScript, UIKit + TextKit 2 (editor) (+3 more)

### Community 59 - "NoteMeta: folderId, parentNoteId, title, kind, dailyDate, tags, wrappedKey, trashedAt, order"
Cohesion: 0.25
Nodes (8): Folder { parentId, name, icon, color, order } — вложенность без ограничения глубины, NoteMeta: folderId, parentNoteId, title, kind, dailyDate, tags, wrappedKey, trashedAt, order, Документ notebook — индекс блокнота: folders, notes (NoteMeta), tags (ключ блокнота), pageCard — вложенная заметка-карточка (noteId, card | link), Внутри блокнота — вложенные папки без ограничения глубины и заметки, Nested folders without depth limit, Metadata: title, tags, links, dates, space, folder, Trash for 30 days

### Community 60 - "Платформы и клиенты (2)"
Cohesion: 0.33
Nodes (6): 1. Концепция продукта, Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения, Суть в одном абзаце

### Community 61 - "0009-notebook-mode-choice.md (5)"
Cohesion: 0.29
Nodes (7): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Вход и восстановление доступа (D-34), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 62 - "Контракт: дизайн-токены «Тихая бумага» (v1) (2)"
Cohesion: 0.18
Nodes (4): @playwright/experimental-ct-react@1.62.1, @playwright/test@1.62.1, @playwright/experimental-ct-react, @playwright/test

### Community 63 - "PenLayer.ts"
Cohesion: 0.18
Nodes (12): Bounds, InputPoint, ActiveStroke, ANCHOR_REBASE_ORIGIN, DEFAULT_PEN_SETTINGS, Entry, EraserMode, PenLayerOptions (+4 more)

### Community 64 - "D-21. Технологический стек"
Cohesion: 0.19
Nodes (12): PenTool, TOOL_DEFAULTS, HIGHLIGHT_TOKENS, INK_TOKENS, resolveColor(), TINTS, TOKEN_FALLBACKS, tokenVarName() (+4 more)

### Community 65 - "D-21. Технологический стек (2)"
Cohesion: 0.20
Nodes (9): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, docs/history session log (+1 more)

### Community 66 - "0030-server-database-postgresql.md"
Cohesion: 0.15
Nodes (13): Обоснованы PostgreSQL (D-30) и Yjs (D-31) как отдельные решения, D-30. База данных сервера — PostgreSQL, MongoDB (rejected), MySQL (rejected), Контекст, Последствия, Рассмотренные варианты, Решение (+5 more)

### Community 67 - "04-editor.md (4)"
Cohesion: 0.40
Nodes (5): 4. Редактор, Платформенная реализация, Прочее, Связи, Содержимое

### Community 68 - "07-encryption.md"
Cohesion: 0.62
Nodes (3): Per-notebook key wrapped by user master key (private) or server key (agent mode), Private notebooks (Notesnook-like): key derived from password, only on user devices; server stores ciphertext; no agent access, Two notebook modes chosen at creation, switchable with client re-encryption (D-09)

### Community 69 - "08-sharing.md"
Cohesion: 0.20
Nodes (11): Контракт меняет только сессия-координатор; исполнитель присылает предложение, Обводки и стрелки «растягиваются» вместе с текстом; при проблемах — изменение контракта через координатора, D-35. Пометка на удалённом тексте исчезает вместе с ним, Вариант «потерянные пометки» — отклонён: лишний интерфейс, Частичное удаление: штрих «сжимается» до оставшегося текста, Вариант «прилипать к соседнему символу» — отклонён: пометка может оказаться не на том слове, Рукописная пометка исчезает вместе с удалённым текстом (пользователем, агентом, другим устройством), Рассмотренные варианты (+3 more)

### Community 70 - "open-questions.md (3)"
Cohesion: 0.27
Nodes (8): File Storage (disk or external S3), iOS / iPadOS Client (Swift, TextKit 2, Yrs, GRDB), Private Notebook Edit Flow, Monorepo Structure (apps/, packages/, infra/), Sync / Realtime Service, packages/test-vectors, libsodium (swift-sodium), Test Vectors

### Community 71 - "D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS) (2)"
Cohesion: 0.29
Nodes (8): Line, P, pathLength(), recognizeHint(), totalTurning(), xReversals(), glyphs, lines

### Community 72 - "@tiptap/core"
Cohesion: 0.16
Nodes (19): Collaboration, CollaborationOptions, createNoteUndoManager(), cursorBuilder(), PEN_ORIGIN, buildExtensions(), createHeadlessEditor(), guardEditorSchema() (+11 more)

### Community 73 - "0024-product-name.md"
Cohesion: 0.33
Nodes (5): D-24. Название продукта, Name candidates: Kora, Margins, Folio, Контекст, Решение, OPEN (no deadline): final product name (D-24), before App Store release

### Community 74 - "План разработки"
Cohesion: 0.15
Nodes (13): Критерии приёмки, План разработки, Подготовка, Потоки разработки (D-39), Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad) (+5 more)

### Community 75 - "12. Функции по мотивам Craft"
Cohesion: 0.22
Nodes (9): 3. Apple Pencil в тексте — ключевая фича, Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера, Перекладка текста — вариант А «живой штрих» (D-05, РЕШЕНО) (+1 more)

### Community 77 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, jsx, lib, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 78 - "0016-no-import-now.md"
Cohesion: 0.20
Nodes (12): MinIO (rejected), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Server disk folder storage (default), External S3-compatible storage (Hetzner, R2, B2), File storage interface (two implementations, chosen by config), Garage / SeaweedFS, MinIO (rejected) (+4 more)

### Community 79 - "0033-bundle-id.md"
Cohesion: 0.40
Nodes (5): Datascratch (working name), Bundle ID com.datascratch.app, D-33. Bundle ID — com.datascratch.app, Решение, Bundle ID com.datascratch.app (D-33); paid Apple Developer account

### Community 80 - "9. API и внешние ИИ-агенты"
Cohesion: 0.33
Nodes (6): 9. API и внешние ИИ-агенты, Агент умеет, Безопасность, Набросок инструментов MCP (ПРЕДЛОЖЕНО), Правки агента (D-10), Реализация

### Community 81 - "11. Нефункциональные требования"
Cohesion: 0.40
Nodes (5): 11. Нефункциональные требования, Доступность, Надёжность, Ресурсы сервера, Языки

### Community 82 - "web-editor/package.json"
Cohesion: 0.15
Nodes (12): mermaid@^12.2.0, @tiptap/suggestion@^3.32.0, exports, ./styles.css, main, name, private, type (+4 more)

### Community 83 - "0005-living-stroke.md"
Cohesion: 0.23
Nodes (8): Привязка к тексту: каждая точка → ближайший символ строки (живой штрих), D-05. Перо при перекладке текста — вариант А «живой штрих», PencilKit (rejected), Гипотеза реализации, Контекст, Последствия, Решение, Living Stroke

### Community 84 - "Модель данных — ЧЕРНОВИК"
Cohesion: 0.40
Nodes (5): Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3), Штрих (черновик для прототипа)

### Community 85 - "0008-pdf-annotations.md"
Cohesion: 0.20
Nodes (10): D-08. Аннотации PDF пером — не в MVP, Аннотации PDF пером (PDFKit + свой слой штрихов) — после MVP, этап расширений, Решение, Решение (предложение), D-16. Импорт — не сейчас, Import from Obsidian/Notesnook (later), Решение, CLOSED: PDF annotations after MVP (D-08) (+2 more)

### Community 86 - "Контракт: модель документа (v1)"
Cohesion: 0.18
Nodes (11): 1. Три вида документов Yjs, 2. Документ `account`, 3. Документ `notebook` (индекс блокнота), 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note` (+3 more)

### Community 87 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, test, test:ct, typecheck

### Community 88 - "D-01. Хранение заметок — в базе данных на своём сервере, не в файлах"
Cohesion: 0.40
Nodes (5): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 89 - "D-22. Без собственного общего ядра на Rust"
Cohesion: 0.40
Nodes (5): D-22. Без собственного общего ядра на Rust, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 90 - "tasks"
Cohesion: 0.18
Nodes (10): dependsOn, outputs, $schema, tasks, build, lint, test, typecheck (+2 more)

### Community 91 - "Контракт: рукописные штрихи (v1)"
Cohesion: 0.20
Nodes (10): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4.1. Перепривязка якорей (отмена и восстановление версии), 4.2. Когда штрих считается «осиротевшим» и удаляется навсегда, 4. Привязка к тексту (живой штрих), 5. Отрисовка толщины, 6. Тестовые векторы (+2 more)

### Community 92 - "0003-platforms.md"
Cohesion: 0.21
Nodes (7): iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), D-03. Платформы: нативные iPhone и iPad + полноценный веб, Full-featured web client (TypeScript), Контекст, Последствия, Решение, iPhone and iPad share one codebase (universal app)

### Community 93 - "0032-min-ios-version.md"
Cohesion: 0.27
Nodes (9): D-32. Минимальная версия iOS/iPadOS — 26, Минимальная версия iOS/iPadOS 26 (IPHONEOS_DEPLOYMENT_TARGET = 26.0), Liquid Glass — системный дизайн iOS 26, Отклонённые варианты: iOS 18+ (шире охват) и 17.5+ (минимум для Pencil Pro), Последствия, Рассмотренные варианты, Решение, CLOSED: minimum iOS 26+ (D-32); XcodeGen accepted (D-39); Bundle ID (D-33); paid Apple Developer account exists (+1 more)

### Community 94 - "2. Платформы"
Cohesion: 0.40
Nodes (5): 2. Платформы, Минимальная версия iOS/iPadOS — 26 (D-32), Минимальная версия iOS/iPadOS — ОТКРЫТО, Тестовые устройства (известно на 2026-10-25), Требования

### Community 95 - "Контракт: REST API сервера (v1)"
Cohesion: 0.22
Nodes (9): Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1), Общее, Служебное, Токены агентов (`spec/09-agents-api.md`) (+1 more)

### Community 97 - "risks.md"
Cohesion: 0.33
Nodes (6): OPEN (stage 1): living stroke details — circles around several words, arrows between words on different lines; decide on prototype, R-07 Web Pen Worse than Native, R-08 Huge Project Scope, Риски, Web without cuts: full feature parity with iOS (pen quality may be lower, R-07), Prototype open questions (multi-word circles, deleted marked text R-04)

### Community 98 - "blockId.ts"
Cohesion: 0.36
Nodes (7): BlockId, blockIdPluginKey, findIdFixes(), hasAttr(), stripIds(), UNIQUE_ATTRS, uuidv7()

### Community 101 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 102 - "12. Функции по мотивам Craft"
Cohesion: 0.25
Nodes (8): 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft, Связь с моделью данных

### Community 103 - "Datascratch — правила для ИИ"
Cohesion: 0.29
Nodes (7): Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой, Правила, Среда разработки

### Community 106 - "0002-no-desktop-app.md"
Cohesion: 0.40
Nodes (4): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, Web client as full desktop replacement (Pointer Events with pressure, offline, PWA, mobile-browser editing for guests)

### Community 107 - "Stream design-system (claude/design-system): packages/design-tokens, packages/ui, apps/ios/Packages/DSDesign — Quiet Paper tokens, web and SwiftUI components"
Cohesion: 0.24
Nodes (8): Radix + Tailwind + Motion Design System, SwiftUI, Stream design-system (claude/design-system): packages/design-tokens, packages/ui, apps/ios/Packages/DSDesign — Quiet Paper tokens, web and SwiftUI components, UI implementation: SwiftUI shell with tokens in code on iOS; Radix + Tailwind + Motion on web, packages/design-tokens — дизайн-токены «Тихая бумага», tokens.json as source of Quiet Paper design token values; generators to CSS variables (web) and Swift (iOS), packages/ui — веб-компоненты дизайн-системы, React design-system components on Radix + Tailwind + Motion in Quiet Paper style

### Community 109 - "host.ts"
Cohesion: 0.16
Nodes (10): packages/web-editor — веб-редактор, Использование, Команды, Устройство, EditorHost, NoteSummary, UploadedAttachment, BLOCK_ITEMS (+2 more)

### Community 111 - "8. Совместная работа и шеринг"
Cohesion: 0.40
Nodes (5): 8. Совместная работа и шеринг, Гости (D-37), Открыто (см. `open-questions.md`), Реализация, Требования

### Community 112 - "0034-auth-email-password.md"
Cohesion: 0.17
Nodes (14): Восстановление: recoveryLoginKey → wrappedMasterKeyRecovery → новый пароль; данные не перешифровываются, Ключ восстановления: 32 байта, Crockford Base32 с префиксом DS1-, показывается один раз, Notesnook, D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления, Вход по email + паролю; один пароль и для входа, и для шифрования (как в Notesnook), Passkeys — сложно совместить со сквозным шифрованием сейчас; возможно позже, Ключ восстановления, выдаваемый при регистрации, Sign in with Apple — отклонён: всё равно нужен отдельный пароль шифрования (+6 more)

### Community 113 - "D-39. Разработка параллельными сессиями; Claude сам вливает в main"
Cohesion: 0.50
Nodes (4): D-39. Разработка параллельными сессиями; Claude сам вливает в main, Контекст, Последствия, Решение

## Knowledge Gaps
- **48 isolated node(s):** `../../tsconfig.base.json`, `Current status: stack approved, next is stage 1 pencil prototype`, `subscribe / unsubscribe — подписка на документы с since`, `welcome — аутентификация успешна (userId | null, serverTime, protocol: 1)`, `PencilKit (rejected)` (+43 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 472 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `packages/web-editor — веб-редактор` connect `host.ts` to `Монорепозиторий и CLAUDE.md`, `DatascratchEditor`?**
  _High betweenness centrality (0.390) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `DatascratchEditor()` (e.g. with `packages/web-editor — веб-редактор` and `.destroy()`) actually correct?**
  _`DatascratchEditor()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `../../tsconfig.base.json`, `Current status: stack approved, next is stage 1 pencil prototype`, `subscribe / unsubscribe — подписка на документы с since` to the rest of the system?**
  _48 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Монорепозиторий и CLAUDE.md` be split into smaller, more focused modules?**
  _Cohesion score 0.14039408866995073 - nodes in this community are weakly interconnected._
- **Why does `DatascratchEditor()` connect `DatascratchEditor` to `D-21. Технологический стек`, `Контракт: модель документа (v1) (2)`, `@tiptap/core`, `host.ts`, `Монорепозиторий и CLAUDE.md (2)`, `src/index.ts`, `D-30. База данных сервера — PostgreSQL`?**
  _High betweenness centrality (0.371) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `Stage 1: pen-in-text prototype on iPad (TextKit 2 + Yrs + pen layer, living stroke)` (e.g. with `Predicted / Coalesced Touches` and `Living Stroke`) actually correct?**
  _`Stage 1: pen-in-text prototype on iPad (TextKit 2 + Yrs + pen layer, living stroke)` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Should `sync-protocol.md` be split into smaller, more focused modules?**
  _Cohesion score 0.056866303690260134 - nodes in this community are weakly interconnected._