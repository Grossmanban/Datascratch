# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 139 files · ~67,126 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 6, .resolved 1)

## Summary
- 2619 nodes · 6368 edges · 130 communities (114 shown, 16 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 873 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `92da4d3a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Block
- SyncClient
- CRDTTransaction
- NoteDocument
- open-questions.md
- LocalStore
- CHANGELOG.md
- Stroke
- APIClient
- YrsError
- iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)
- decisions/README.md
- 0003-platforms.md
- TransactionOrigin
- lib.rs
- WebSocketConnection
- design-tokens.md
- SyncEngine
- SecretStore
- Контракт: дизайн-токены «Тихая бумага» (v1)
- crypto.md
- stack.md
- Sendable
- Процесс разработки и Graphify (2)
- CRDTDocument
- 06-data-server.md
- Контракт: модель документа (v1) (2)
- generate.mjs
- 04-editor.md
- StubTransport
- String
- open-questions.md (2)
- String
- LocalStore (2)
- 08-sharing.md
- 0004-encryption-and-api.md
- CodingKeys
- yjs_compat.rs
- Монорепозиторий и CLAUDE.md (2)
- api.md
- tests.rs
- Graph update after doc edits: graphify_docs.py prepare -> parallel extraction agents -> finish -> graphify export html -> check-update
- 09-agents-api.md
- 04-editor.md (2)
- 0005-living-stroke.md
- 12-craft-features.md
- Контракт: модель документа (v1)
- ServerMessage
- 0030-server-database-postgresql.md
- 0036-space-notebook-folder.md
- APIClient (3)
- strokes.md
- Data
- ServerMessage
- sync-protocol.md
- 10-sync.md
- .iso
- 01-concept.md
- D-29. Graphify: порядок работы, чтобы граф был всегда актуален
- 0001-storage-in-database.md
- Открытые вопросы
- package.json
- compilerOptions
- Foundation (2)
- .observe_deep
- graphify_docs.py
- .json
- 04-editor.md (4)
- glossary.md
- CryptoError
- TaskState
- Foundation (3)
- 0035-strokes-on-deleted-text.md
- План разработки
- CRDTDocument.swift
- 0008-pdf-annotations.md
- Снимки и уплотнение: > 500 обновлений или > 1 MiB → снимок; удаление seq ≤ baseSeq, кроме нужных истории (R-05)
- 03-pencil.md (2)
- AccountService
- development.md
- tasks
- contracts/README.md
- 0038-design-quiet-paper.md
- 0024-product-name.md (2)
- Контракт: протокол синхронизации (v1)
- Контракт: шифрование (v1)
- SyncErrorCode
- 02-platforms.md
- 0032-min-ios-version.md
- stack.md
- Контракт: шифрование (v1)
- 12. Функции по мотивам Craft
- Foundation (4)
- Обзор архитектуры
- 7. Шифрование и доступ агентов
- Datascratch — правила для ИИ
- Graphify
- 0002-no-desktop-app.md
- design-tokens.md (2)
- 0033-bundle-id.md
- Контракт: REST API сервера (v1)
- D-05. Перо при перекладке текста — вариант А «живой штрих»
- 0010-agent-edits.md
- 05-organization-design.md
- 0017-languages.md
- D-22. Без собственного общего ядра на Rust
- build-xcframework.sh
- 0039-parallel-sessions.md
- 1. Концепция продукта
- build-linux.sh
- generate-bindings.sh
- pnpm-workspace.yaml
- Модель данных — ЧЕРНОВИК
- D-25. Redis не используем
- D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO
- HTTPTransport
- 2. Платформы
- D-30. База данных сервера — PostgreSQL
- D-27. В прототипе пера текст хранится в Yrs
- D-28. Процесс разработки: облако + Mac, сборка iOS в CI
- yrs-ffi

## God Nodes (most connected - your core abstractions)
1. `TransactionOrigin` - 70 edges
2. `NoteDocument` - 68 edges
3. `APIClient` - 62 edges
4. `CRDTDocument` - 46 edges
5. `YrsError` - 41 edges
6. `NotebookDocument` - 40 edges
7. `YDocument` - 38 edges
8. `Block` - 36 edges
9. `SyncEngine` - 34 edges
10. `CodingKeys` - 34 edges

## Surprising Connections (you probably didn't know these)
- `4.4. `comments`` --references--> `Comment`  [INFERRED]
  docs/architecture/contracts/document-model.md → apps/ios/Packages/DSCore/Sources/DSCore/Model/NoteDocument.swift
- `1. Три вида документов Yjs` --references--> `DocKind`  [INFERRED]
  docs/architecture/contracts/document-model.md → apps/ios/Packages/DSCore/Sources/DSCore/CRDT/CRDTDocument.swift
- `4.2. Схема блоков` --references--> `label()`  [INFERRED]
  docs/architecture/contracts/document-model.md → tools/graphify_docs.py
- `Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО` --semantically_similar_to--> `Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/README.md
- `Web editor: TipTap + Yjs per document-model contract, all blocks, Canvas pen layer per strokes contract` --semantically_similar_to--> `Web editor: TipTap (ProseMirror) + Yjs`  [INFERRED] [semantically similar]
  packages/web-editor/README.md → docs/spec/04-editor.md

## Import Cycles
- 2-file cycle: `apps/ios/Packages/DSCore/yrs-ffi/src/lib.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/xml.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/lib.rs`
- 3-file cycle: `apps/ios/Packages/DSCore/yrs-ffi/src/events.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/xml.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/lib.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/events.rs`

## Hyperedges (group relationships)
- **Local edit → store/outbox → encrypt → push** — apps_ios_packages_dscore_readme_crdtdocument, apps_ios_packages_dscore_readme_localstore, apps_ios_packages_dscore_readme_dscrypto, apps_ios_packages_dscore_readme_syncengine, apps_ios_packages_dscore_readme_syncclient [EXTRACTED 1.00]

## Communities (130 total, 16 thin omitted)

### Community 0 - "Block"
Cohesion: 0.07
Nodes (18): Array, .attributes, Block, .blockId, .isKnown, .isTextBlock, .text, .xml (+10 more)

### Community 1 - "SyncClient"
Cohesion: 0.11
Nodes (8): SyncClient, SyncClientDelegate, SyncConnectionState, connected, connecting, disconnected, stopped, waiting

### Community 2 - "CRDTTransaction"
Cohesion: 0.07
Nodes (39): CRDTTransaction, Folder, .fields, Kind, folder, note, notebook, MapRecord (+31 more)

### Community 3 - "NoteDocument"
Cohesion: 0.08
Nodes (11): InlineLocation, NoteDocument, .isReadOnly, .noteId, RunPiece, node, text, NoteDocumentTests (+3 more)

### Community 4 - "open-questions.md"
Cohesion: 0.09
Nodes (36): Журнал действий агента GET /agent-tokens/:id/audit, agent_tokens / agent_audit_log Tables, Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, File Storage (disk or external S3), Guest via Link (web, no account) (+28 more)

### Community 5 - "LocalStore"
Cohesion: 0.09
Nodes (14): DocKind, account, note, notebook, .roots, DocumentRecord, Kind, push (+6 more)

### Community 6 - "CHANGELOG.md"
Cohesion: 0.13
Nodes (25): 2026-10-25, 2026-10-25 (вторая половина дня), Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, Создан CLAUDE.md и скелет монорепозитория (apps/, packages/, infra/) (+17 more)

### Community 7 - "Stroke"
Cohesion: 0.07
Nodes (33): AnchorKind, block, drawing, image, text, Author, .value, Hint (+25 more)

### Community 8 - "APIClient"
Cohesion: 0.08
Nodes (8): APIClient, .currentSession, .isSignedIn, SecretSessionStore, SessionStore, AuthSession, normalizeEmail(), APIClientTests

### Community 9 - "YrsError"
Cohesion: 0.08
Nodes (17): check_text_range(), decoding(), diff_update(), merge_updates(), mismatch(), missing_map(), nested_map(), ResolvedIndex (+9 more)

### Community 10 - "iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)"
Cohesion: 0.14
Nodes (14): iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), apps/server — сервер, Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), apps/web — веб-клиент, Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), libsodium на всех платформах (libsodium-wrappers-sumo в TS, swift-sodium в iOS), libsodium (+6 more)

### Community 11 - "decisions/README.md"
Cohesion: 0.09
Nodes (27): D-19. Весь код пишет Claude, Последствия, Решение, Custom pen renderer (Metal vs Core Animation TBD), End-to-end encryption, iOS client stack, Node.js + TypeScript server, Swift 6 (+19 more)

### Community 12 - "0003-platforms.md"
Cohesion: 0.31
Nodes (5): D-03. Платформы: нативные iPhone и iPad + полноценный веб, Full-featured web client (TypeScript), Контекст, Последствия, Решение

### Community 13 - "TransactionOrigin"
Cohesion: 0.07
Nodes (17): TransactionOrigin, .description, .isOutgoing, local, other, remote, storage, system (+9 more)

### Community 14 - "lib.rs"
Cohesion: 0.08
Nodes (14): is_inside(), ORIGIN_LOCAL, ORIGIN_UNDO, RootDef, RootKind, Array, Map, Text (+6 more)

### Community 15 - "WebSocketConnection"
Cohesion: 0.16
Nodes (5): Configuration, URLSessionWebSocket, URLSessionWebSocketFactory, WebSocketConnection, WebSocketFactory

### Community 16 - "design-tokens.md"
Cohesion: 0.29
Nodes (12): Подложки backdrop.* (sand, dusk, mist, meadow, ember) — мягкие градиенты в духе Craft, Цветовые токены: bg.canvas («бумага»), text.primary («чернила»), accent («синие чернила»), danger/success/warning — светлая и тёмная тема, Ширина колонки документа: normal 720, wide 960, full, Тактильная отдача iOS: selection, success (задача выполнена), warning (удаление), Чернила пера ink.* (black, blue, red, green, purple, brown) и маркеры highlight.*, Движение: пружины motion.snappy / smooth / gentle, длительности duration.* для веба, Сетка отступов 4 pt, радиусы radius.*, тени shadow.card / shadow.popover, Цвета tint.* (.fg / .bg) для папок, тегов и выносок (+4 more)

### Community 17 - "SyncEngine"
Cohesion: 0.11
Nodes (4): .isConnected, KeyRingDocumentKeys, SyncEngine, SyncStatus

### Community 18 - "SecretStore"
Cohesion: 0.16
Nodes (7): InMemorySecretStore, KeychainSecretStore, SecretStore, SecretStoreError, keychain, SignupMaterial, Security

### Community 19 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.08
Nodes (30): ArrayDelta, Delete, Insert, Retain, convert(), DeepObserver, path(), sorted_keys() (+22 more)

### Community 20 - "crypto.md"
Cohesion: 0.10
Nodes (30): Вложения: загрузка и докачка по кускам (/attachments/:id/chunks/:index), лимит 200 МБ, Ассоциированные данные ds1|… привязывают шифротекст к месту (doc, awareness, ключи, куски вложений), Вложения шифруются кусками по 1 MiB, каждый — отдельный конверт, Конверт шифротекста: версия 0x01 + nonce 24 байта + XChaCha20-Poly1305-IETF (тег 16 байт), Иерархия ключей: пароль → passwordKey → masterKey → notebookKey → noteKey, loginKey = BLAKE2b(authSeed, "ds1|login"); сервер хранит Argon2id(loginKey), masterKey — 32 случайных байта, создаётся при регистрации, шифрует account-документ, noteKey — ключ заметки: шифрует note-документ и вложения (+22 more)

### Community 21 - "stack.md"
Cohesion: 0.10
Nodes (31): doc_updates Table (encrypted Yjs updates), Server PostgreSQL Schema (Stage 3 Draft), iOS / iPadOS Client (Swift, TextKit 2, Yrs, GRDB), Private Notebook Edit Flow, Sync / Realtime Service, Astro (landing page), Dexie (IndexedDB), docker compose Self-Hosting (server + PostgreSQL) (+23 more)

### Community 22 - "Sendable"
Cohesion: 0.19
Nodes (26): AgentPermission, read, readWrite, AgentToken, APIErrorBody, AttachmentStatus, CreatedAgentToken, Device (+18 more)

### Community 23 - "Процесс разработки и Graphify (2)"
Cohesion: 0.12
Nodes (19): chunk(), map_to_attrs(), value_to_any(), Container, container(), Element, Fragment, element() (+11 more)

### Community 24 - "CRDTDocument"
Cohesion: 0.10
Nodes (6): CRDTDocument, .canRedo, .canUndo, .clientId, OpenDoc, CRDTDocumentTests

### Community 25 - "06-data-server.md"
Cohesion: 0.06
Nodes (34): Поля штриха: v, tool, color, width, opacity, anchorKind, blockId, anchors, points, hint, author, createdAt, MinIO (rejected), D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting (+26 more)

### Community 26 - "Контракт: модель документа (v1) (2)"
Cohesion: 0.06
Nodes (35): concurrency, cancel-in-progress, group, defaults, run, name, runs-on, steps (+27 more)

### Community 27 - "generate.mjs"
Cohesion: 0.07
Nodes (28): b64(), content, doc, firstRun, fixture, json, para, rel() (+20 more)

### Community 28 - "04-editor.md"
Cohesion: 0.14
Nodes (10): AttachmentRecord, .missingChunks, .uploaded, LocalStore, SearchHit, State, pendingUpload, remote (+2 more)

### Community 30 - "String"
Cohesion: 0.11
Nodes (8): CryptoAD, DSCrypto, KDFParams, PasswordKeys, RecoveryKeyFormat, PasswordChangeMaterial, CryptoTests, Clibsodium

### Community 31 - "open-questions.md (2)"
Cohesion: 0.09
Nodes (15): XmlNode, .attributes, .children, .elementName, .textContent, YValue, .boolValue, .dataValue (+7 more)

### Community 32 - "String"
Cohesion: 0.08
Nodes (15): .formatVersion, .formatVersion, Backdrop, .yValue, Comment, Cover, .value, Kind (+7 more)

### Community 33 - "LocalStore (2)"
Cohesion: 0.11
Nodes (27): AccountService, APIClient (REST), AttachmentManager, Block / Inline / Mark, CRDTDocument, DSCore, DSCrypto / KeyRing / KeychainSecretStore, NotebookDocument / AccountDocument (+19 more)

### Community 35 - "08-sharing.md"
Cohesion: 0.11
Nodes (24): POST /docs — регистрация документа (account / notebook / note) до первого push, Share { id, target { kind, id }, permission, expiresAt, createdAt } — ссылка шеринга, Шеринг: /shares (view/edit, бессрочно по умолчанию, отзыв сразу отключает гостей), Ссылка шеринга /s/<shareId>#k=<ключ> — ключ в части после #, не уходит на сервер, Права: user — документы своего аккаунта; guest — только документы шеринга, push только с правом edit, D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account, Universal Links (paid Apple Developer account) (+16 more)

### Community 36 - "0004-encryption-and-api.md"
Cohesion: 0.13
Nodes (19): PATCH /notebooks/:id/mode — включение режима «для агентов» передаёт notebookKey, выключение удаляет серверную обёртку, Режим «для агентов»: клиент передаёт notebookKey по TLS, сервер оборачивает его serverKey; расшифровка только при запросе агента с токеном, serverKey — 32 байта из DS_KMS_KEY (окружение сервера, не в базе), NotebookRef { id, spaceId, name, mode: private | agent, … } — ключ блокнота здесь не хранится, D-04. Одновременно сквозное шифрование и доступ по API, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), Контекст (+11 more)

### Community 37 - "CodingKeys"
Cohesion: 0.07
Nodes (26): CodingKeys, accessToken, baseSeq, client, clientMsgId, code, deviceId, docId (+18 more)

### Community 38 - "yjs_compat.rs"
Cohesion: 0.20
Nodes (12): b64(), el(), empty(), fixture(), normalize(), reads_yjs_document(), roots(), s() (+4 more)

### Community 39 - "Монорепозиторий и CLAUDE.md (2)"
Cohesion: 0.09
Nodes (15): value_to_in(), YValue, BigInt, Bool, Bytes, List, Null, Number (+7 more)

### Community 40 - "api.md"
Cohesion: 0.20
Nodes (13): Аккаунт и устройства: /me, /devices (отзыв сессий), удаление аккаунта, Эндпоинты /auth: prelogin, signup, login, refresh, logout, recovery, password, Аутентификация Bearer: accessToken 15 мин + refreshToken 30 дней с ротацией, Device { id, name, createdAt, lastSeenAt, current } — устройство (сессия) аккаунта, POST /shares/:id/guest — гостевой токен (без авторизации) для hello в синхронизации, GET /health → { ok: true, version } — служебная проверка сервера, Notebook { id, mode, createdAt, wrappedKey } — ответ /notebooks, Блокноты: POST/GET /notebooks, /notebooks/:id/key, DELETE (D-36) (+5 more)

### Community 41 - "tests.rs"
Cohesion: 0.19
Nodes (17): arrays_and_errors(), Collect, local(), merge_and_diff_updates(), nested_maps_merge_per_field(), note_roots(), observers_report_paths_deltas_and_origins(), paragraph() (+9 more)

### Community 42 - "Graph update after doc edits: graphify_docs.py prepare -> parallel extraction agents -> finish -> graphify export html -> check-update"
Cohesion: 0.31
Nodes (5): Скрипт tools/graphify_docs.py (prepare → агенты → finish), Graph update after doc edits: graphify_docs.py prepare -> parallel extraction agents -> finish -> graphify export html -> check-update, Extraction prompt .claude/skills/graphify/references/extraction-spec.md, Git: English code/commits, Russian docs, branches + PR, one commit = code + docs + updated graph, Как вносить изменения — spec/architecture, ADR, CHANGELOG, roadmap, граф — в одном коммите

### Community 43 - "09-agents-api.md"
Cohesion: 0.09
Nodes (22): AgentToken { id, name, notebookIds, permission, expiresAt, createdAt, lastUsedAt } — без секрета, Токены агентов /agent-tokens: блокноты, read / read_write, срок; токен показывается один раз, Контракт agents-api.md (MCP и REST для самих агентов) — появится на этапе агентов, blockId (UUIDv7) у каждого блочного узла — для точечных правок агентов, заметок на полях и комментариев, hint — распознанная форма (underline, strike, circle, highlight, arrow, scribble) для агентов и экспорта, D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Export: Markdown, PDF, HTML (handwriting as images) (+14 more)

### Community 44 - "04-editor.md (2)"
Cohesion: 0.12
Nodes (19): Схема блоков: doc = title block+ (paragraph, heading, списки, taskList, callout, codeBlock, mathBlock, mermaid, table, image, file, drawing, pageCard), Производные данные строятся локально: индекс задач, полнотекстовый поиск, бэклинки, теги, Inline-узлы noteLink ([[ ]]) и tag (без #, вложенность через /), taskItem: taskId, state open / done / cancelled, scheduled, deadline, completedAt, Obsidian (reference product: links, backlinks, tags, Markdown export), 4. Редактор, Backlinks, Editor content (headings, lists, tables, code, formulas, attachments, drawing blocks) (+11 more)

### Community 45 - "0005-living-stroke.md"
Cohesion: 0.12
Nodes (12): Координаты text-штриха: смещение от начала глифа якорного символа в em, Привязка к тексту: каждая точка → ближайший символ строки (живой штрих), PencilKit (rejected), D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, Handwriting input types (text marks, margin notes, drawing block, drawing on images, Scribble), Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps (+4 more)

### Community 46 - "12-craft-features.md"
Cohesion: 0.25
Nodes (12): Calendar screen: day feed with tasks and daily note (MVP); system calendar integration after MVP, Card document: nested document shown as a card with cover (MVP), Collections: records with properties and table / gallery / kanban views with filter, sort, grouping (after MVP), Daily note: one per day, created on demand, from template (MVP), Document cover image with offset (MVP), Document style: font (serif/sans/mono), width, paper (smooth/dots/grid/ruled), backdrop color or gradient, text color; style gallery after MVP, Tabs: several open documents on iPad and web (MVP), Inbox: standalone tasks outside documents in a service note of the notebook (MVP) (+4 more)

### Community 47 - "Контракт: модель документа (v1)"
Cohesion: 0.12
Nodes (26): Идентификаторы создаёт клиент (UUIDv7); повторный POST идемпотентен, иначе 409 conflict, y-prosemirror не записывает атрибуты узлов со значением null: отсутствующий атрибут = null (значение по умолчанию схемы), Документ account: spaces, notebooks, settings, starred, tabs (ключ — masterKey), Comment { blockId, anchor (относительные позиции), author user | guest | agent, text, resolvedAt }, Даты ISO 8601 в UTC; «только дата» YYYY-MM-DD; миллисекунды — только в штрихах, Векторы совместимости модели документа packages/test-vectors/document/* (iOS/Yrs обязан читать и писать формат y-prosemirror), Вставка текста в Y.XmlText без явных атрибутов наследует форматирование слева (Yjs/Yrs) — писатели всегда передают явный набор атрибутов, Folder { parentId, name, icon, color, order } — вложенность без ограничения глубины (+18 more)

### Community 48 - "ServerMessage"
Cohesion: 0.18
Nodes (9): Item, ServerMessage, ack, awareness, error, update, updates, welcome (+1 more)

### Community 49 - "0030-server-database-postgresql.md"
Cohesion: 0.11
Nodes (21): Canvas + Pointer Events, Dexie (IndexedDB), Drizzle ORM, Fastify, GRDB (SQLite), MCP TypeScript SDK, OAuth 2.1, pg-boss job queue (+13 more)

### Community 50 - "0036-space-notebook-folder.md"
Cohesion: 0.14
Nodes (15): Space { id, name, icon, color, order, createdAt } в account-документе, Проекты, личное, работа, учёба не смешиваются; минимум кнопок на экране, D-14. Организация: богатая, но не перегруженная, Предложенная структура: пространства → вложенные папки; поперёк — вложенные и умные теги, цвета, избранное, недавние, Решение, Поперёк структуры — теги, умные теги, избранное, недавние, D-36. Структура: пространство → блокноты → папки, Пространство (Личное, Работа, Учёба) содержит несколько блокнотов (+7 more)

### Community 51 - "APIClient (3)"
Cohesion: 0.17
Nodes (3): AttachmentManager, LocalStore, AccountServiceTests

### Community 52 - "strokes.md"
Cohesion: 0.15
Nodes (19): История версий: GET /docs/:id/versions и /versions/:seq (зашифрованные снимки), Блок drawing (высота в pt; штрихи — в strokes), anchorKind: text | block (заметка на полях) | image | drawing, Перепривязка якорей после отмены/повтора: в той же транзакции якорь удалённого символа с redone-элементом переписывается на относительную позицию нового элемента, Координаты block / image / drawing — в долях ширины блока, Записываются только сглаженные coalesced-точки завершённого штриха, без predicted, Штрих почти неизменяем после рисования; ластик удаляет штрих целиком или заменяет кусками, Разрыв штриха по строкам: соседние точки на разных line fragments → отдельные сегменты (+11 more)

### Community 53 - "Data"
Cohesion: 0.13
Nodes (9): CRDTUpdates, KeyRing, .fields, ShareLink, .url, Base64URL, Data, .hexString (+1 more)

### Community 54 - "ServerMessage"
Cohesion: 0.11
Nodes (19): ClientInfo, ClientMessage, awareness, hello, push, snapshot, subscribe, unsubscribe (+11 more)

### Community 55 - "sync-protocol.md"
Cohesion: 0.20
Nodes (17): Формат ошибок { error: { code, message } } и коды bad_request…internal, ack — обновление или снимок принят и сохранён (docId, clientMsgId, seq), Коды ошибок синхронизации: unauthorized, forbidden, doc_not_found, payload_too_large (2 MiB / 50 MiB), rate_limited, protocol_mismatch, internal, error — сообщение сервера: code, message, ref? (clientMsgId / docId), Клиент хранит lastSeq по каждому документу и догоняет недостающее при подключении, Сервер не присылает клиенту его собственные обновления (кроме updates при догоняющей подписке с другого устройства), Офлайн: обновления копятся в локальной очереди до подтверждения ack, Лимиты payload_too_large: обновление 2 MiB, снимок 50 MiB — считаются декодированные байты, не base64 (+9 more)

### Community 56 - "10-sync.md"
Cohesion: 0.21
Nodes (9): Агенты не подключаются по WebSocket — работают через MCP/REST; сервер применяет их правки как обычные обновления, Agent edits applied immediately, highlighted, revertible via history (D-10), 10. Синхронизация и офлайн, Local storage: SQLite via GRDB (iOS), IndexedDB via Dexie (web), Agent notebooks: server decrypts and applies agent edit as a normal update, Each note is a Yjs CRDT doc; edits are small binary updates, Как это работает (обзор), Требования (+1 more)

### Community 57 - ".iso"
Cohesion: 0.11
Nodes (6): .accessExpiry, DSDate, EntityID, FakeRESTServer, User, UtilTests

### Community 58 - "01-concept.md"
Cohesion: 0.15
Nodes (10): D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, D-24. Название продукта, Name candidates: Kora, Margins, Folio, Контекст, Решение, OPEN (no deadline): final product name (D-24), before App Store release, Datascratch, For non-Russian readers (+2 more)

### Community 59 - "D-29. Graphify: порядок работы, чтобы граф был всегда актуален"
Cohesion: 0.08
Nodes (29): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, Стартовый хук Claude Code (.claude/hooks/session-start.sh) (+21 more)

### Community 60 - "0001-storage-in-database.md"
Cohesion: 0.14
Nodes (14): awareness — курсоры и присутствие: зашифровано, не хранится, только рассылается, D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты (+6 more)

### Community 61 - "Открытые вопросы"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 62 - "package.json"
Cohesion: 0.14
Nodes (15): devDependencies, turbo@^2.3.0, typescript@^5.6.0, engines, node, name, packageManager, private (+7 more)

### Community 63 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+7 more)

### Community 64 - "Foundation (2)"
Cohesion: 0.26
Nodes (6): VersionRestoreTests, DSCore, Foundation, FoundationNetworking, PackageDescription, Testing

### Community 65 - ".observe_deep"
Cohesion: 0.27
Nodes (3): UpdateObserver, origin_name(), YSubscription

### Community 66 - "graphify_docs.py"
Cohesion: 0.28
Nodes (7): Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 67 - ".json"
Cohesion: 0.19
Nodes (8): BadValue, CryptoVectorTests, jsonEqual(), sortedMarks(), StrokeVectorTests, SyncVectorTests, Vectors, .available

### Community 68 - "04-editor.md (4)"
Cohesion: 0.14
Nodes (14): YOp, ArrayDelete, ArrayInsert, MapDelete, MapSet, RootTextDelete, RootTextInsert, TextDelete (+6 more)

### Community 69 - "glossary.md"
Cohesion: 0.11
Nodes (28): Anchor (textRange / paragraph / drawingBlock / image), Note, Organization Hierarchy (Account > Space > Notebook > Folder > Note), Stroke, StrokePoint, Web PWA Client (React, TipTap, Yjs, IndexedDB), Automerge (fallback CRDT), Custom iOS Pen Render Layer (Metal or Core Animation) (+20 more)

### Community 70 - "CryptoError"
Cohesion: 0.09
Nodes (22): CryptoError, decryptionFailed, invalidKeyLength, invalidRecoveryKey, kdfFailed, malformedEnvelope, sodiumInit, unsupportedKDF (+14 more)

### Community 71 - "TaskState"
Cohesion: 0.14
Nodes (9): TaskState, cancelled, done, open, NoteDerivedData, NoteLinkEntry, TaskEntry, TaskQuery (+1 more)

### Community 72 - "Foundation (3)"
Cohesion: 0.14
Nodes (5): docs, Conn, FakeFactory, FakeSyncServer, Stored

### Community 73 - "0035-strokes-on-deleted-text.md"
Cohesion: 0.17
Nodes (14): Контракт меняет только сессия-координатор; исполнитель присылает предложение, Обводки и стрелки «растягиваются» вместе с текстом; при проблемах — изменение контракта через координатора, Правило D-35 в отрисовке: точки удалённых символов не рисуются, штрих остаётся в документе; отмена возвращает пометку, D-35. Пометка на удалённом тексте исчезает вместе с ним, Окончательная очистка таких штрихов — при уплотнении истории, Вариант «потерянные пометки» — отклонён: лишний интерфейс, Частичное удаление: штрих «сжимается» до оставшегося текста, Вариант «прилипать к соседнему символу» — отклонён: пометка может оказаться не на том слове (+6 more)

### Community 74 - "План разработки"
Cohesion: 0.15
Nodes (13): Критерии приёмки, План разработки, Подготовка, Потоки разработки (D-39), Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad) (+5 more)

### Community 75 - "CRDTDocument.swift"
Cohesion: 0.14
Nodes (4): CRDTSubscription, DeepHandler, UpdateHandler, YrsFFI

### Community 76 - "0008-pdf-annotations.md"
Cohesion: 0.22
Nodes (9): D-08. Аннотации PDF пером — не в MVP, Аннотации PDF пером (PDFKit + свой слой штрихов) — после MVP, этап расширений, Решение, Решение (предложение), D-16. Импорт — не сейчас, Решение, CLOSED: PDF annotations after MVP (D-08), R-08 Huge Project Scope (+1 more)

### Community 78 - "Снимки и уплотнение: > 500 обновлений или > 1 MiB → снимок; удаление seq ≤ baseSeq, кроме нужных истории (R-05)"
Cohesion: 0.46
Nodes (8): Осиротевшие штрихи (все якоря удалены, orphanedAt или createdAt старше 30 дней) окончательно удаляются клиентом при уплотнении истории, Снимки и уплотнение: > 500 обновлений или > 1 MiB → снимок; удаление seq ≤ baseSeq, кроме нужных истории (R-05), snapshot — загрузка зашифрованного снимка состояния до baseSeq, doc_snapshots Table (compacted snapshots, version history), Encrypted history compaction by clients (R-05, stage 3), Snapshot, OPEN (before stage 3): Yjs history compaction under encryption — snapshot scheme (R-05), R-05 Edit History Growth

### Community 79 - "03-pencil.md (2)"
Cohesion: 0.17
Nodes (15): ADR file number equals decision number (D-05 -> 0005-*.md), template 0000-template.md, Нумерация решений D-NN и файлы decisions/00NN-*.md, Документация Datascratch — единственный источник истины, history/ — архив, не источник истины; исключена из графа (.graphifyignore), Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Правило замены: решение РЕШЕНО не переписывается, ADR получает статус «ЗАМЕНЕНО решением D-NN», Оглавление docs/ (spec, contracts, architecture, decisions, roadmap, risks…), Документация Datascratch (+7 more)

### Community 80 - "AccountService"
Cohesion: 0.17
Nodes (5): AccountError, missingKey, notSignedIn, AccountService, SignupResult

### Community 81 - "development.md"
Cohesion: 0.17
Nodes (15): GitHub Actions CI (incl. macOS iOS builds), XcodeGen, docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, Последствия: ошибки сборки видны с задержкой CI; ощущение пера проверяет только пользователь на iPad (Pencil Pro), GitHub Actions собирает iOS-проект и гоняет тесты на macOS-раннере на каждый push (+7 more)

### Community 82 - "tasks"
Cohesion: 0.18
Nodes (10): dependsOn, outputs, $schema, tasks, build, lint, test, typecheck (+2 more)

### Community 83 - "contracts/README.md"
Cohesion: 0.22
Nodes (9): Тестовые векторы crypto: KDF, конверты, Base32 ключа восстановления, куски вложений (Swift и TS), Контракт — точное описание формата/протокола, который реализуют несколько частей (iOS на Swift, веб и сервер на TS), Совместимость доказывается общими тестовыми векторами (packages/test-vectors), Типы TypeScript контрактов в packages/shared/src/contracts/ — часть контракта, Контракты между частями системы, Правила изменения, Тестовые векторы strokes: упаковка точек, разрешение якорей после правок, правило D-35, Тестовые векторы sync: примеры всех сообщений в JSON (схема проверяется в TS и Swift) (+1 more)

### Community 84 - "0038-design-quiet-paper.md"
Cohesion: 0.13
Nodes (16): Ежедневные заметки и «Входящие» (kind daily / inbox) в блокноте settings.dailyNotebookId, Решения по анкетам пользователя: D-32…D-41 и PDF после MVP (D-08), Design references: Things 3, Linear, Craft, Arc, Ориентир Craft: градиентные подложки, документы-карточки с обложками, боковая панель «Вкладки / Избранное / Папки / Теги», стеклянные панели, контекстные меню, D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Вариант «графит по умолчанию» — отклонён: чернила на тёмном читаются хуже, Вариант «чистый нейтральный» (Linear / Things) — не выбран, Тёмная тема — тёплый графит (+8 more)

### Community 85 - "0024-product-name.md (2)"
Cohesion: 0.22
Nodes (9): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4.1. Перепривязка якорей (отмена и восстановление версии), 4.2. Когда штрих считается «осиротевшим» и удаляется навсегда, 4. Привязка к тексту (живой штрих), 5. Отрисовка толщины, 6. Тестовые векторы (+1 more)

### Community 86 - "Контракт: протокол синхронизации (v1)"
Cohesion: 0.22
Nodes (9): 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05), 6. Права, 7. Коды ошибок, 8. Тестовые векторы (+1 more)

### Community 87 - "Контракт: шифрование (v1)"
Cohesion: 0.22
Nodes (9): 3. Apple Pencil в тексте — ключевая фича, Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера, Перекладка текста — вариант А «живой штрих» (D-05, РЕШЕНО) (+1 more)

### Community 88 - "SyncErrorCode"
Cohesion: 0.25
Nodes (8): SyncErrorCode, docNotFound, forbidden, `internal`, payloadTooLarge, protocolMismatch, rateLimited, unauthorized

### Community 89 - "02-platforms.md"
Cohesion: 0.22
Nodes (7): D-06. Рисование пальцем на iPhone — да, опционально, Finger drawing toggle on iPhone, Решение, iPad client (primary, Apple Pencil / Pencil Pro squeeze and roll, hover, Stage Manager, keyboard shortcuts), iPhone client (primary, quick notes, one-handed, finger drawing option D-06), Test devices: Apple Silicon Mac with Xcode, iPad with Apple Pencil Pro (pressure, tilt, hover, squeeze, roll), iPhone and iPad share one codebase (universal app)

### Community 90 - "0032-min-ios-version.md"
Cohesion: 0.28
Nodes (8): D-32. Минимальная версия iOS/iPadOS — 26, Минимальная версия iOS/iPadOS 26 (IPHONEOS_DEPLOYMENT_TARGET = 26.0), Liquid Glass — системный дизайн iOS 26, Отклонённые варианты: iOS 18+ (шире охват) и 17.5+ (минимум для Pencil Pro), Последствия, Рассмотренные варианты, Решение, Minimum iOS/iPadOS 26 (D-32)

### Community 91 - "stack.md"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 92 - "Контракт: шифрование (v1)"
Cohesion: 0.20
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 93 - "12. Функции по мотивам Craft"
Cohesion: 0.25
Nodes (8): 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft, Связь с моделью данных

### Community 95 - "Обзор архитектуры"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 96 - "7. Шифрование и доступ агентов"
Cohesion: 0.29
Nodes (7): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Вход и восстановление доступа (D-34), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 97 - "Datascratch — правила для ИИ"
Cohesion: 0.29
Nodes (7): Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой, Правила, Среда разработки

### Community 98 - "Graphify"
Cohesion: 0.11
Nodes (17): Monorepo Structure (apps/, packages/, infra/), packages/test-vectors, Git, Graphify, Автоматизация, Две среды, Команды, Конец сессии (+9 more)

### Community 99 - "0002-no-desktop-app.md"
Cohesion: 0.40
Nodes (4): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, Web client as full desktop replacement (Pointer Events with pressure, offline, PWA, mobile-browser editing for guests)

### Community 100 - "design-tokens.md (2)"
Cohesion: 0.40
Nodes (5): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 101 - "0033-bundle-id.md"
Cohesion: 0.40
Nodes (5): Datascratch (working name), Bundle ID com.datascratch.app, D-33. Bundle ID — com.datascratch.app, Решение, Bundle ID com.datascratch.app (D-33); paid Apple Developer account

### Community 102 - "Контракт: REST API сервера (v1)"
Cohesion: 0.22
Nodes (9): Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1), Общее, Служебное, Токены агентов (`spec/09-agents-api.md`) (+1 more)

### Community 103 - "D-05. Перо при перекладке текста — вариант А «живой штрих»"
Cohesion: 0.40
Nodes (5): D-05. Перо при перекладке текста — вариант А «живой штрих», Гипотеза реализации, Контекст, Последствия, Решение

### Community 104 - "0010-agent-edits.md"
Cohesion: 0.32
Nodes (6): Метка agentEdit (agentId, at) — подсветка правок агента до принятия пользователем, D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение

### Community 105 - "05-organization-design.md"
Cohesion: 0.13
Nodes (14): D-15. Дизайн — основная концепция продукта, Последствия, Решение, 5. Организация заметок и дизайн, Light/dark theme, Dynamic Type, VoiceOver, full iPad keyboard support, Own design system (typography, grid, colors, icons, animation, haptics) unified on iOS and web, Design tokens (colors, spacing, typography, animation durations) as single source for both platforms, Дизайн (D-15 — РЕШЕНО, главный принцип продукта) (+6 more)

### Community 106 - "0017-languages.md"
Cohesion: 0.50
Nodes (4): D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, UI languages Russian and English, no RTL (D-17)

### Community 107 - "D-22. Без собственного общего ядра на Rust"
Cohesion: 0.40
Nodes (5): D-22. Без собственного общего ядра на Rust, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 108 - "build-xcframework.sh"
Cohesion: 0.50
Nodes (3): IPHONEOS_DEPLOYMENT_TARGET, MACOSX_DEPLOYMENT_TARGET, build-xcframework.sh script

### Community 109 - "0039-parallel-sessions.md"
Cohesion: 0.11
Nodes (27): apps/ios — iPhone + iPad, pnpm + Turborepo Monorepo, Canvas + Pointer Events Pen Layer, Каркас монорепозитория (pnpm + Turborepo), девять потоков разработки, правила сессий-исполнителей, changelog.d, Cross-stream contracts (docs/architecture/contracts/) changed only via the coordinator session, Claude coordinator merges stream branches into main when CI is green, D-39. Разработка параллельными сессиями; Claude сам вливает в main, Контекст (+19 more)

### Community 110 - "1. Концепция продукта"
Cohesion: 0.33
Nodes (6): 1. Концепция продукта, Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения, Суть в одном абзаце

### Community 116 - "Модель данных — ЧЕРНОВИК"
Cohesion: 0.40
Nodes (5): Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3), Штрих (черновик для прототипа)

### Community 117 - "D-25. Redis не используем"
Cohesion: 0.40
Nodes (5): D-25. Redis не используем, Будущее, Контекст, Последствия, Решение

### Community 118 - "D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO"
Cohesion: 0.40
Nodes (5): D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 120 - "2. Платформы"
Cohesion: 0.40
Nodes (5): 2. Платформы, Минимальная версия iOS/iPadOS — 26 (D-32), Минимальная версия iOS/iPadOS — ОТКРЫТО, Тестовые устройства (известно на 2026-10-25), Требования

### Community 121 - "D-30. База данных сервера — PostgreSQL"
Cohesion: 0.40
Nodes (5): D-30. База данных сервера — PostgreSQL, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 122 - "D-27. В прототипе пера текст хранится в Yrs"
Cohesion: 0.50
Nodes (4): D-27. В прототипе пера текст хранится в Yrs, Контекст, Последствия, Решение

### Community 123 - "D-28. Процесс разработки: облако + Mac, сборка iOS в CI"
Cohesion: 0.50
Nodes (4): D-28. Процесс разработки: облако + Mac, сборка iOS в CI, Контекст, Последствия, Решение

## Knowledge Gaps
- **276 isolated node(s):** `notSignedIn`, `missingKey`, `.attributes`, `.blockId`, `node` (+271 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 762 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Контракт: модель документа (v1)` connect `CRDTTransaction` to `Контракт: модель документа (v1)`?**
  _High betweenness centrality (0.331) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `NoteDocument` (e.g. with `.snapshotIfNeeded()` and `.strokesRoundTripAndResolveAnchors()`) actually correct?**
  _`NoteDocument` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `notSignedIn`, `missingKey`, `.attributes` to the rest of the system?**
  _276 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Block` be split into smaller, more focused modules?**
  _Cohesion score 0.07203219315895372 - nodes in this community are weakly interconnected._
- **Why does `DocKind` connect `LocalStore` to `CRDTTransaction`, `Stroke`, `APIClient`, `CRDTDocument.swift`, `SyncEngine`, `Sendable`, `CRDTDocument`?**
  _High betweenness centrality (0.209) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `APIClient` (e.g. with `.makeService()` and `.loginRefreshesOnExpiryAnd401()`) actually correct?**
  _`APIClient` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `SyncClient` be split into smaller, more focused modules?**
  _Cohesion score 0.11375661375661375 - nodes in this community are weakly interconnected._