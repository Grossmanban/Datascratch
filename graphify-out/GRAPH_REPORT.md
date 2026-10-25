# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 136 files · ~63,723 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 6, .resolved 1)

## Summary
- 2530 nodes · 6123 edges · 111 communities (102 shown, 9 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 856 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `100d0fad`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- 0039-parallel-sessions.md
- sync-protocol.md
- String
- 0018-monetization.md
- 0011-handwriting-for-agents.md
- stack.md
- 0031-crdt-yjs.md
- AuthSession
- CodingKeys
- development.md
- crypto.md
- String
- CHANGELOG.md
- ClientMessage
- APIClient
- Контракт: модель документа (v1)
- Sendable
- TransactionOrigin
- 04-editor.md
- data-model.md
- docs/README.md
- 08-sharing.md
- 0001-storage-in-database.md
- Monorepo layout (apps/ios, apps/web, apps/server, packages, infra)
- package.json
- compilerOptions
- DSCrypto
- NoteDocument
- SyncClient
- Контракт: дизайн-токены «Тихая бумага» (v1)
- Foundation
- tests.rs
- Stroke
- .json
- Data
- contracts/README.md
- 0025-no-redis.md
- open-questions.md (2)
- Контракт: модель документа (v1) (2)
- SyncEngine
- generate.mjs
- tasks
- YrsError
- LocalStore
- 0004-encryption-and-api.md
- 03-pencil.md
- Монорепозиторий и CLAUDE.md (2)
- 5. Организация заметок и дизайн
- CRDTTransaction
- D-41. Набор функций по мотивам Craft
- String
- FakeSyncServer
- 04-editor.md
- SyncErrorCode
- lib.rs
- overview.md
- 0036-space-notebook-folder.md
- strokes.md
- 05-organization-design.md
- Процесс разработки и Graphify (2)
- open-questions.md
- TaskState
- 0026-file-storage.md
- Graphify
- SecretStore
- api.md
- NotebookDocument
- 04-editor.md (4)
- CRDTDocument
- 0008-pdf-annotations.md
- 0034-auth-email-password.md
- 0028-dev-workflow.md
- 0024-product-name.md
- CryptoError
- APIError
- Контракт: шифрование (v1)
- pnpm-workspace.yaml
- RootRef
- Block
- 0038-design-quiet-paper.md
- Контракт: дизайн-токены «Тихая бумага» (v1)
- 12-craft-features.md
- WebSocketConnection
- D-39. Разработка параллельными сессиями; Claude сам вливает в main
- 0032-min-ios-version.md
- design-tokens.md
- StubTransport
- 01-concept.md
- План разработки
- glossary.md
- Контракт: шифрование (v1)
- 02-platforms.md
- Контракт: REST API сервера (v1)
- D-23. Документация — источник истины; Graphify — граф знаний поверх неё
- build-xcframework.sh
- Обзор архитектуры
- 7. Шифрование и доступ агентов
- Технологический стек — РЕШЕНО (2026-10-25)
- build-linux.sh
- generate-bindings.sh
- risks.md
- 0005-living-stroke.md
- 0022-no-rust-core.md
- 2. Платформы
- yrs-ffi
- 8. Совместная работа и шеринг
- D-04. Одновременно сквозное шифрование и доступ по API
- .decode
- ServerMessage

## God Nodes (most connected - your core abstractions)
1. `TransactionOrigin` - 70 edges
2. `NoteDocument` - 63 edges
3. `APIClient` - 57 edges
4. `CRDTDocument` - 46 edges
5. `YrsError` - 41 edges
6. `YDocument` - 38 edges
7. `Block` - 37 edges
8. `NotebookDocument` - 37 edges
9. `SyncEngine` - 34 edges
10. `CodingKeys` - 34 edges

## Surprising Connections (you probably didn't know these)
- `4.4. `comments`` --references--> `Comment`  [INFERRED]
  docs/architecture/contracts/document-model.md → apps/ios/Packages/DSCore/Sources/DSCore/Model/NoteDocument.swift
- `4.2. Схема блоков` --references--> `label()`  [INFERRED]
  docs/architecture/contracts/document-model.md → tools/graphify_docs.py
- `Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО` --semantically_similar_to--> `Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/README.md
- `1. Три вида документов Yjs` --references--> `DocKind`  [INFERRED]
  docs/architecture/contracts/document-model.md → apps/ios/Packages/DSCore/Sources/DSCore/CRDT/CRDTDocument.swift
- `3. Документ `notebook` (индекс блокнота)` --references--> `NoteMeta`  [INFERRED]
  docs/architecture/contracts/document-model.md → apps/ios/Packages/DSCore/Sources/DSCore/Model/Records.swift

## Import Cycles
- 2-file cycle: `apps/ios/Packages/DSCore/yrs-ffi/src/lib.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/xml.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/lib.rs`
- 3-file cycle: `apps/ios/Packages/DSCore/yrs-ffi/src/events.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/xml.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/lib.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/events.rs`

## Communities (111 total, 9 thin omitted)

### Community 0 - "0039-parallel-sessions.md"
Cohesion: 0.13
Nodes (24): apps/ios — iPhone + iPad, Canvas + Pointer Events Pen Layer, XcodeGen (project.yml) вместо ручного .xcodeproj — принят в работу в D-39, Cross-stream contracts (docs/architecture/contracts/) changed only via the coordinator session, Claude coordinator merges stream branches into main when CI is green, Coordinator session (merges branches into main, owns roadmap.md, CHANGELOG.md and contracts), Stream agents (claude/agents): packages/agents, agents-api contract draft — MCP, REST, tokens, log, PNG render, Stream core (claude/core): packages/shared, packages/test-vectors, root configs — contract types, crypto, stroke codec, document schema, sync client, test vectors (+16 more)

### Community 1 - "sync-protocol.md"
Cohesion: 0.06
Nodes (42): Формат ошибок { error: { code, message } } и коды bad_request…internal, Метка agentEdit (agentId, at) — подсветка правок агента до принятия пользователем, 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05), 6. Права (+34 more)

### Community 2 - "String"
Cohesion: 0.08
Nodes (18): .entries, .formatVersion, .formatVersion, Backdrop, .yValue, Comment, Cover, .value (+10 more)

### Community 3 - "0018-monetization.md"
Cohesion: 0.07
Nodes (28): Решения по анкетам пользователя: D-32…D-41 и PDF после MVP (D-08), D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, Контекст (+20 more)

### Community 4 - "0011-handwriting-for-agents.md"
Cohesion: 0.09
Nodes (24): AgentToken { id, name, notebookIds, permission, expiresAt, createdAt, lastUsedAt } — без секрета, Токены агентов /agent-tokens: блокноты, read / read_write, срок; токен показывается один раз, Контракт agents-api.md (MCP и REST для самих агентов) — появится на этапе агентов, blockId (UUIDv7) у каждого блочного узла — для точечных правок агентов, заметок на полях и комментариев, D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Export: Markdown, PDF, HTML (handwriting as images), pg-boss background job queue on PostgreSQL (+16 more)

### Community 5 - "stack.md"
Cohesion: 0.08
Nodes (32): OpenAPI-схема генерируется сервером из кода (GET /v1/openapi.json), Транспорт wss://<host>/v1/sync: JSON-кадры с type, base64url, ping/pong каждые 25 с, iOS / iPadOS Client (Swift, TextKit 2, Yrs, GRDB), Sync / Realtime Service, Astro (landing page), Dexie (IndexedDB), docker compose Self-Hosting (server + PostgreSQL), Drizzle ORM (+24 more)

### Community 6 - "0031-crdt-yjs.md"
Cohesion: 0.11
Nodes (23): Прототип пера хранит текст в Yrs (D-27), Canvas + Pointer Events, TipTap editor, Vite + React + TypeScript PWA, Web client stack (PWA), D-27. В прототипе пера текст хранится в Yrs, Pen prototype (stage 1), Контекст (+15 more)

### Community 7 - "AuthSession"
Cohesion: 0.15
Nodes (5): HTTPTransport, SecretSessionStore, SessionStore, AuthSession, APIClientTests

### Community 8 - "CodingKeys"
Cohesion: 0.07
Nodes (26): CodingKeys, accessToken, baseSeq, client, clientMsgId, code, deviceId, docId (+18 more)

### Community 9 - "development.md"
Cohesion: 0.05
Nodes (55): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Datascratch — правила для ИИ, Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, graphify, Apple Pencil в тексте — ключевая фича и главный риск (+47 more)

### Community 10 - "crypto.md"
Cohesion: 0.13
Nodes (25): Вложения: загрузка и докачка по кускам (/attachments/:id/chunks/:index), лимит 200 МБ, Ассоциированные данные ds1|… привязывают шифротекст к месту (doc, awareness, ключи, куски вложений), Вложения шифруются кусками по 1 MiB, каждый — отдельный конверт, Конверт шифротекста: версия 0x01 + nonce 24 байта + XChaCha20-Poly1305-IETF (тег 16 байт), Иерархия ключей: пароль → passwordKey → masterKey → notebookKey → noteKey, libsodium на всех платформах (libsodium-wrappers-sumo в TS, swift-sodium в iOS), loginKey = BLAKE2b(authSeed, "ds1|login"); сервер хранит Argon2id(loginKey), masterKey — 32 случайных байта, создаётся при регистрации, шифрует account-документ (+17 more)

### Community 11 - "String"
Cohesion: 0.14
Nodes (24): Folder, .fields, Kind, folder, note, notebook, MapRecord, NotebookMode (+16 more)

### Community 12 - "CHANGELOG.md"
Cohesion: 0.13
Nodes (24): pnpm + Turborepo Monorepo, 2026-10-25, 2026-10-25 (вторая половина дня), Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, Каркас монорепозитория (pnpm + Turborepo), девять потоков разработки, правила сессий-исполнителей, changelog.d (+16 more)

### Community 13 - "ClientMessage"
Cohesion: 0.13
Nodes (15): ClientMessage, awareness, hello, push, snapshot, subscribe, unsubscribe, JSONEncoder (+7 more)

### Community 14 - "APIClient"
Cohesion: 0.11
Nodes (4): APIClient, .currentSession, .isSignedIn, normalizeEmail()

### Community 15 - "Контракт: модель документа (v1)"
Cohesion: 0.13
Nodes (25): Идентификаторы создаёт клиент (UUIDv7); повторный POST идемпотентен, иначе 409 conflict, y-prosemirror не записывает атрибуты узлов со значением null: отсутствующий атрибут = null (значение по умолчанию схемы), Документ account: spaces, notebooks, settings, starred, tabs (ключ — masterKey), Comment { blockId, anchor (относительные позиции), author user | guest | agent, text, resolvedAt }, Даты ISO 8601 в UTC; «только дата» YYYY-MM-DD; миллисекунды — только в штрихах, Векторы совместимости модели документа packages/test-vectors/document/* (iOS/Yrs обязан читать и писать формат y-prosemirror), Блок drawing (высота в pt; штрихи — в strokes), Вставка текста в Y.XmlText без явных атрибутов наследует форматирование слева (Yjs/Yrs) — писатели всегда передают явный набор атрибутов (+17 more)

### Community 16 - "Sendable"
Cohesion: 0.17
Nodes (26): AgentPermission, read, readWrite, AgentToken, APIErrorBody, AttachmentStatus, CreatedAgentToken, Device (+18 more)

### Community 17 - "TransactionOrigin"
Cohesion: 0.10
Nodes (15): TransactionOrigin, .description, .isOutgoing, local, other, remote, storage, system (+7 more)

### Community 18 - "04-editor.md"
Cohesion: 0.14
Nodes (10): AttachmentRecord, .missingChunks, .uploaded, LocalStore, SearchHit, State, pendingUpload, remote (+2 more)

### Community 19 - "data-model.md"
Cohesion: 0.16
Nodes (14): meta.formatVersion = 1; документ новее клиента открывается только для чтения (R-03), Версионирование контрактов v1, v2…; ломающее изменение — новая версия с явной миграцией, Поля штриха: v, tool, color, width, opacity, anchorKind, blockId, anchors, points, hint, author, createdAt, Anchor (textRange / paragraph / drawingBlock / image), Note, Stroke, StrokePoint, Заметка (+6 more)

### Community 20 - "docs/README.md"
Cohesion: 0.16
Nodes (16): ADR file number equals decision number (D-05 -> 0005-*.md), template 0000-template.md, Журнал решений (ADR), Нумерация решений D-NN и файлы decisions/00NN-*.md, Документация Datascratch — единственный источник истины, history/ — архив, не источник истины; исключена из графа (.graphifyignore), Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Правило замены: решение РЕШЕНО не переписывается, ADR получает статус «ЗАМЕНЕНО решением D-NN», Оглавление docs/ (spec, contracts, architecture, decisions, roadmap, risks…) (+8 more)

### Community 21 - "08-sharing.md"
Cohesion: 0.14
Nodes (21): POST /docs — регистрация документа (account / notebook / note) до первого push, Share { id, target { kind, id }, permission, expiresAt, createdAt } — ссылка шеринга, Шеринг: /shares (view/edit, бессрочно по умолчанию, отзыв сразу отключает гостей), Ссылка шеринга /s/<shareId>#k=<ключ> — ключ в части после #, не уходит на сервер, Права: user — документы своего аккаунта; guest — только документы шеринга, push только с правом edit, Guest via Link (web, no account), D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account (+13 more)

### Community 22 - "0001-storage-in-database.md"
Cohesion: 0.16
Nodes (11): hint — распознанная форма (underline, strike, circle, highlight, arrow, scribble) для агентов и экспорта, D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты (+3 more)

### Community 23 - "Monorepo layout (apps/ios, apps/web, apps/server, packages, infra)"
Cohesion: 0.20
Nodes (9): apps/server — сервер, Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), apps/web — веб-клиент, Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), App server: Node.js + TypeScript (Fastify), packages/shared — общие TypeScript-типы и схемы, Shared TypeScript types and schemas (document, strokes, metadata, sync protocol, API), packages/test-vectors — общие тестовые векторы (+1 more)

### Community 24 - "package.json"
Cohesion: 0.14
Nodes (15): devDependencies, turbo@^2.3.0, typescript@^5.6.0, engines, node, name, packageManager, private (+7 more)

### Community 25 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+7 more)

### Community 27 - "NoteDocument"
Cohesion: 0.09
Nodes (9): InlineLocation, NoteDocument, .isReadOnly, .noteId, RunPiece, node, text, NoteDocumentTests (+1 more)

### Community 28 - "SyncClient"
Cohesion: 0.11
Nodes (10): SyncClient, .isConnected, SyncClientDelegate, SyncConnectionState, connected, connecting, disconnected, stopped (+2 more)

### Community 29 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.08
Nodes (29): ArrayDelta, Delete, Insert, Retain, convert(), path(), sorted_keys(), text_delta() (+21 more)

### Community 30 - "Foundation"
Cohesion: 0.09
Nodes (12): .jsonObject, .fields, Base64URL, EntityID, CRDTDocumentTests, Fixture, StrokeMaintenanceTests, UtilTests (+4 more)

### Community 31 - "tests.rs"
Cohesion: 0.08
Nodes (37): RootDef, RootKind, Array, Map, Text, XmlFragment, arrays_and_errors(), chunk() (+29 more)

### Community 32 - "Stroke"
Cohesion: 0.06
Nodes (33): AnchorKind, block, drawing, image, text, Author, .value, Hint (+25 more)

### Community 33 - ".json"
Cohesion: 0.11
Nodes (8): BadValue, CryptoVectorTests, jsonEqual(), sortedMarks(), StrokeVectorTests, SyncVectorTests, Vectors, .available

### Community 34 - "Data"
Cohesion: 0.16
Nodes (7): CRDTUpdates, KDFParams, KeyRing, PasswordChangeMaterial, SignupMaterial, Data, .hexString

### Community 35 - "contracts/README.md"
Cohesion: 0.22
Nodes (9): Тестовые векторы crypto: KDF, конверты, Base32 ключа восстановления, куски вложений (Swift и TS), Контракт — точное описание формата/протокола, который реализуют несколько частей (iOS на Swift, веб и сервер на TS), Совместимость доказывается общими тестовыми векторами (packages/test-vectors), Типы TypeScript контрактов в packages/shared/src/contracts/ — часть контракта, Контракты между частями системы, Правила изменения, Тестовые векторы strokes: упаковка точек, разрешение якорей после правок, правило D-35, Тестовые векторы sync: примеры всех сообщений в JSON (схема проверяется в TS и Swift) (+1 more)

### Community 36 - "0025-no-redis.md"
Cohesion: 0.12
Nodes (18): Custom pen renderer (Metal vs Core Animation TBD), Dexie (IndexedDB), Drizzle ORM, Fastify, GRDB (SQLite), iOS client stack, MCP TypeScript SDK, OAuth 2.1 (+10 more)

### Community 37 - "open-questions.md (2)"
Cohesion: 0.09
Nodes (13): XmlNode, .attributes, .children, .elementName, .textContent, YValue, .boolValue, .dataValue (+5 more)

### Community 38 - "Контракт: модель документа (v1) (2)"
Cohesion: 0.06
Nodes (35): concurrency, cancel-in-progress, group, defaults, run, name, runs-on, steps (+27 more)

### Community 39 - "SyncEngine"
Cohesion: 0.11
Nodes (3): KeyRingDocumentKeys, SyncEngine, SyncStatus

### Community 40 - "generate.mjs"
Cohesion: 0.07
Nodes (28): b64(), content, doc, firstRun, fixture, json, para, rel() (+20 more)

### Community 41 - "tasks"
Cohesion: 0.18
Nodes (10): dependsOn, outputs, $schema, tasks, build, lint, test, typecheck (+2 more)

### Community 42 - "YrsError"
Cohesion: 0.08
Nodes (17): check_text_range(), decoding(), diff_update(), is_inside(), merge_updates(), mismatch(), missing_map(), nested_map() (+9 more)

### Community 43 - "LocalStore"
Cohesion: 0.06
Nodes (24): Локальное хранилище, DocKind, account, note, notebook, .roots, DocumentRecord, Kind (+16 more)

### Community 44 - "0004-encryption-and-api.md"
Cohesion: 0.18
Nodes (15): PATCH /notebooks/:id/mode — включение режима «для агентов» передаёт notebookKey, выключение удаляет серверную обёртку, Режим «для агентов»: клиент передаёт notebookKey по TLS, сервер оборачивает его serverKey; расшифровка только при запросе агента с токеном, serverKey — 32 байта из DS_KMS_KEY (окружение сервера, не в базе), NotebookRef { id, spaceId, name, mode: private | agent, … } — ключ блокнота здесь не хранится, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение (+7 more)

### Community 45 - "03-pencil.md"
Cohesion: 0.16
Nodes (9): iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, Handwriting input types (text marks, margin notes, drawing block, drawing on images, Scribble), Stroke point anchoring: character anchor + dx/dy in font-size units, System Scribble only; no recognition of drawn ink (D-07) (+1 more)

### Community 46 - "Монорепозиторий и CLAUDE.md (2)"
Cohesion: 0.09
Nodes (15): value_to_in(), YValue, BigInt, Bool, Bytes, List, Null, Number (+7 more)

### Community 47 - "5. Организация заметок и дизайн"
Cohesion: 0.40
Nodes (5): 5. Организация заметок и дизайн, Дизайн (D-15 — РЕШЕНО, главный принцип продукта), Организация (D-14 — РЕШЕНО по сути; структура ниже — ПРЕДЛОЖЕНО), Принципы, Реализация

### Community 49 - "D-41. Набор функций по мотивам Craft"
Cohesion: 0.14
Nodes (4): CRDTSubscription, DeepHandler, UpdateHandler, YrsFFI

### Community 50 - "String"
Cohesion: 0.20
Nodes (4): CryptoAD, PasswordKeys, RecoveryKeyFormat, Clibsodium

### Community 51 - "FakeSyncServer"
Cohesion: 0.08
Nodes (9): .accessExpiry, docs, DSDate, Conn, eventually(), FakeFactory, FakeSyncServer, Stored (+1 more)

### Community 52 - "04-editor.md"
Cohesion: 0.12
Nodes (18): Схема блоков: doc = title block+ (paragraph, heading, списки, taskList, callout, codeBlock, mathBlock, mermaid, table, image, file, drawing, pageCard), Производные данные строятся локально: индекс задач, полнотекстовый поиск, бэклинки, теги, Inline-узлы noteLink ([[ ]]) и tag (без #, вложенность через /), taskItem: taskId, state open / done / cancelled, scheduled, deadline, completedAt, Obsidian (reference product: links, backlinks, tags, Markdown export), 4. Редактор, Backlinks, Editor content (headings, lists, tables, code, formulas, attachments, drawing blocks) (+10 more)

### Community 53 - "SyncErrorCode"
Cohesion: 0.15
Nodes (12): SyncClientError, closed, notConnected, server, SyncErrorCode, docNotFound, forbidden, `internal` (+4 more)

### Community 54 - "lib.rs"
Cohesion: 0.10
Nodes (6): DeepObserver, UpdateObserver, ORIGIN_LOCAL, origin_name(), ORIGIN_UNDO, YSubscription

### Community 55 - "overview.md"
Cohesion: 0.19
Nodes (17): Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, File Storage (disk or external S3), Handwriting-to-PNG Render (pg-boss queue), Key Store (agent notebooks), MCP + REST API (+9 more)

### Community 56 - "0036-space-notebook-folder.md"
Cohesion: 0.17
Nodes (15): Space { id, name, icon, color, order, createdAt } в account-документе, Organization Hierarchy (Account > Space > Notebook > Folder > Note), D-14. Организация: богатая, но не перегруженная, Предложенная структура: пространства → вложенные папки; поперёк — вложенные и умные теги, цвета, избранное, недавние, Решение, Поперёк структуры — теги, умные теги, избранное, недавние, D-36. Структура: пространство → блокноты → папки, Пространство (Личное, Работа, Учёба) содержит несколько блокнотов (+7 more)

### Community 57 - "strokes.md"
Cohesion: 0.08
Nodes (41): История версий: GET /docs/:id/versions и /versions/:seq (зашифрованные снимки), Контракт меняет только сессия-координатор; исполнитель присылает предложение, Перепривязка якорей после отмены/повтора: в той же транзакции якорь удалённого символа с redone-элементом переписывается на относительную позицию нового элемента, Координаты block / image / drawing — в долях ширины блока, Обводки и стрелки «растягиваются» вместе с текстом; при проблемах — изменение контракта через координатора, Правило D-35 в отрисовке: точки удалённых символов не рисуются, штрих остаётся в документе; отмена возвращает пометку, Координаты text-штриха: смещение от начала глифа якорного символа в em, Записываются только сглаженные coalesced-точки завершённого штриха, без predicted (+33 more)

### Community 58 - "05-organization-design.md"
Cohesion: 0.18
Nodes (11): Проекты, личное, работа, учёба не смешиваются; минимум кнопок на экране, D-15. Дизайн — основная концепция продукта, Design references: Things 3, Linear, Craft, Arc, Последствия, Решение, Ориентир Craft: градиентные подложки, документы-карточки с обложками, боковая панель «Вкладки / Избранное / Папки / Теги», стеклянные панели, контекстные меню, Light/dark theme, Dynamic Type, VoiceOver, full iPad keyboard support, Feel references: Things 3, Linear, Craft, Arc (+3 more)

### Community 59 - "Процесс разработки и Graphify (2)"
Cohesion: 0.13
Nodes (18): map_to_attrs(), value_to_any(), Container, container(), Element, Fragment, element(), index_paths() (+10 more)

### Community 60 - "open-questions.md"
Cohesion: 0.09
Nodes (23): XcodeGen, D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст, Решение, Bundle ID com.datascratch.app, D-33. Bundle ID — com.datascratch.app (+15 more)

### Community 61 - "TaskState"
Cohesion: 0.14
Nodes (9): TaskState, cancelled, done, open, NoteDerivedData, NoteLinkEntry, TaskEntry, TaskQuery (+1 more)

### Community 62 - "0026-file-storage.md"
Cohesion: 0.18
Nodes (12): End-to-end encryption, D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Server disk folder storage (default), External S3-compatible storage (Hetzner, R2, B2), File storage interface (two implementations, chosen by config), Garage / SeaweedFS, MinIO (rejected), Контекст (+4 more)

### Community 63 - "Graphify"
Cohesion: 0.14
Nodes (14): Git, Graphify, Автоматизация, Две среды, Команды, Конец сессии, Кто что делает, Обновление графа после правки документов (по шагам) (+6 more)

### Community 64 - "SecretStore"
Cohesion: 0.18
Nodes (7): Криптография (crypto.md), InMemorySecretStore, KeychainSecretStore, SecretStore, SecretStoreError, keychain, Security

### Community 65 - "api.md"
Cohesion: 0.20
Nodes (13): Аккаунт и устройства: /me, /devices (отзыв сессий), удаление аккаунта, Журнал действий агента GET /agent-tokens/:id/audit, Эндпоинты /auth: prelogin, signup, login, refresh, logout, recovery, password, Аутентификация Bearer: accessToken 15 мин + refreshToken 30 дней с ротацией, Device { id, name, createdAt, lastSeenAt, current } — устройство (сессия) аккаунта, POST /shares/:id/guest — гостевой токен (без авторизации) для hello в синхронизации, GET /health → { ok: true, version } — служебная проверка сервера, Notebook { id, mode, createdAt, wrappedKey } — ответ /notebooks (+5 more)

### Community 66 - "NotebookDocument"
Cohesion: 0.14
Nodes (8): Блокнот и аккаунт, NotebookDocument, .inbox, .notebookId, NoteMeta, .fields, .isTrashed, IndexDocumentTests

### Community 67 - "04-editor.md (4)"
Cohesion: 0.14
Nodes (14): YOp, ArrayDelete, ArrayInsert, MapDelete, MapSet, RootTextDelete, RootTextInsert, TextDelete (+6 more)

### Community 68 - "CRDTDocument"
Cohesion: 0.09
Nodes (10): DSCore, Документы (CRDT), Подключение, Тесты, Устройство, CRDTDocument, .canRedo, .canUndo (+2 more)

### Community 69 - "0008-pdf-annotations.md"
Cohesion: 0.20
Nodes (10): D-08. Аннотации PDF пером — не в MVP, Аннотации PDF пером (PDFKit + свой слой штрихов) — после MVP, этап расширений, Решение, Решение (предложение), D-16. Импорт — не сейчас, Решение, CLOSED: PDF annotations after MVP (D-08), R-08 Huge Project Scope (+2 more)

### Community 70 - "0034-auth-email-password.md"
Cohesion: 0.20
Nodes (10): Notesnook, Import from Obsidian/Notesnook (later), D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления, Вход по email + паролю; один пароль и для входа, и для шифрования (как в Notesnook), Passkeys — сложно совместить со сквозным шифрованием сейчас; возможно позже, Sign in with Apple — отклонён: всё равно нужен отдельный пароль шифрования, Контекст, Рассмотренные варианты (+2 more)

### Community 71 - "0028-dev-workflow.md"
Cohesion: 0.18
Nodes (12): GitHub Actions CI (incl. macOS iOS builds), Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, Последствия: ошибки сборки видны с задержкой CI; ощущение пера проверяет только пользователь на iPad (Pencil Pro), D-28. Процесс разработки: облако + Mac, сборка iOS в CI (+4 more)

### Community 72 - "0024-product-name.md"
Cohesion: 0.22
Nodes (9): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4.1. Перепривязка якорей (отмена и восстановление версии), 4.2. Когда штрих считается «осиротевшим» и удаляется навсегда, 4. Привязка к тексту (живой штрих), 5. Отрисовка толщины, 6. Тестовые векторы (+1 more)

### Community 73 - "CryptoError"
Cohesion: 0.20
Nodes (9): CryptoError, decryptionFailed, invalidKeyLength, invalidRecoveryKey, kdfFailed, malformedEnvelope, sodiumInit, unsupportedKDF (+1 more)

### Community 74 - "APIError"
Cohesion: 0.24
Nodes (6): APIError, .code, invalidResponse, notAuthenticated, server, transport

### Community 75 - "Контракт: шифрование (v1)"
Cohesion: 0.22
Nodes (9): 3. Apple Pencil в тексте — ключевая фича, Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера, Перекладка текста — вариант А «живой штрих» (D-05, РЕШЕНО) (+1 more)

### Community 77 - "RootRef"
Cohesion: 0.29
Nodes (5): RootRef, Array, Map, Text, Xml

### Community 78 - "Block"
Cohesion: 0.07
Nodes (19): Модель заметки, Array, .attributes, Block, .blockId, .isKnown, .isTextBlock, .text (+11 more)

### Community 79 - "0038-design-quiet-paper.md"
Cohesion: 0.17
Nodes (10): Ежедневные заметки и «Входящие» (kind daily / inbox) в блокноте settings.dailyNotebookId, D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Вариант «графит по умолчанию» — отклонён: чернила на тёмном читаются хуже, Вариант «чистый нейтральный» (Linear / Things) — не выбран, Тёмная тема — тёплый графит, Рассмотренные варианты, Решение, D-41. Набор функций по мотивам Craft (+2 more)

### Community 80 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.40
Nodes (5): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 81 - "12-craft-features.md"
Cohesion: 0.13
Nodes (20): 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft, Calendar screen: day feed with tasks and daily note (MVP); system calendar integration after MVP (+12 more)

### Community 82 - "WebSocketConnection"
Cohesion: 0.14
Nodes (7): URLSession, Configuration, URLSessionWebSocket, URLSessionWebSocketFactory, WebSocketConnection, WebSocketFactory, FoundationNetworking

### Community 83 - "D-39. Разработка параллельными сессиями; Claude сам вливает в main"
Cohesion: 0.50
Nodes (4): D-39. Разработка параллельными сессиями; Claude сам вливает в main, Контекст, Последствия, Решение

### Community 86 - "0032-min-ios-version.md"
Cohesion: 0.27
Nodes (9): D-32. Минимальная версия iOS/iPadOS — 26, Минимальная версия iOS/iPadOS 26 (IPHONEOS_DEPLOYMENT_TARGET = 26.0), Liquid Glass — системный дизайн iOS 26, Отклонённые варианты: iOS 18+ (шире охват) и 17.5+ (минимум для Pencil Pro), Последствия, Рассмотренные варианты, Решение, CLOSED: minimum iOS 26+ (D-32); XcodeGen accepted (D-39); Bundle ID (D-33); paid Apple Developer account exists (+1 more)

### Community 87 - "design-tokens.md"
Cohesion: 0.27
Nodes (13): Подложки backdrop.* (sand, dusk, mist, meadow, ember) — мягкие градиенты в духе Craft, Цветовые токены: bg.canvas («бумага»), text.primary («чернила»), accent («синие чернила»), danger/success/warning — светлая и тёмная тема, Ширина колонки документа: normal 720, wide 960, full, Тактильная отдача iOS: selection, success (задача выполнена), warning (удаление), Чернила пера ink.* (black, blue, red, green, purple, brown) и маркеры highlight.*, Движение: пружины motion.snappy / smooth / gentle, длительности duration.* для веба, Сетка отступов 4 pt, радиусы radius.*, тени shadow.card / shadow.popover, Цвета tint.* (.fg / .bg) для папок, тегов и выносок (+5 more)

### Community 89 - "01-concept.md"
Cohesion: 0.12
Nodes (13): D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, Порядок чтения для новичка: концепция → roadmap → стек → обзор → перо → решения → вопросы/риски → процесс → history, 1. Концепция продукта, Notesnook (reference product: E2E encryption, reliable sync), Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения (+5 more)

### Community 90 - "План разработки"
Cohesion: 0.15
Nodes (13): Критерии приёмки, План разработки, Подготовка, Потоки разработки (D-39), Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad) (+5 more)

### Community 92 - "glossary.md"
Cohesion: 0.12
Nodes (23): doc_updates Table (encrypted Yjs updates), Server PostgreSQL Schema (Stage 3 Draft), Private Notebook Edit Flow, Monorepo Structure (apps/, packages/, infra/), packages/test-vectors, Web PWA Client (React, TipTap, Yjs, IndexedDB), Automerge (fallback CRDT), libsodium (swift-sodium) (+15 more)

### Community 93 - "Контракт: шифрование (v1)"
Cohesion: 0.20
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 94 - "02-platforms.md"
Cohesion: 0.10
Nodes (19): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, D-03. Платформы: нативные iPhone и iPad + полноценный веб, Full-featured web client (TypeScript), Контекст, Последствия, Решение (+11 more)

### Community 96 - "Контракт: REST API сервера (v1)"
Cohesion: 0.22
Nodes (9): Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1), Общее, Служебное, Токены агентов (`spec/09-agents-api.md`) (+1 more)

### Community 101 - "D-23. Документация — источник истины; Graphify — граф знаний поверх неё"
Cohesion: 0.50
Nodes (4): D-23. Документация — источник истины; Graphify — граф знаний поверх неё, Контекст, Последствия, Решение

### Community 102 - "build-xcframework.sh"
Cohesion: 0.50
Nodes (3): IPHONEOS_DEPLOYMENT_TARGET, MACOSX_DEPLOYMENT_TARGET, build-xcframework.sh script

### Community 103 - "Обзор архитектуры"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 105 - "7. Шифрование и доступ агентов"
Cohesion: 0.29
Nodes (7): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Вход и восстановление доступа (D-34), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 107 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 118 - "risks.md"
Cohesion: 0.31
Nodes (8): Universal Links, Apple Developer Account, R-07 Web Pen Worse than Native, R-12 No Paid Apple Account (7-day installs), Риски, Stage 4: web client (parity with iOS, link sharing, guests, Universal Links), Web without cuts: full feature parity with iOS (pen quality may be lower, R-07), Shared with me documents (stage 4, with sharing)

### Community 122 - "0005-living-stroke.md"
Cohesion: 0.13
Nodes (16): Отрисовка после перекладки: якорь → абсолютная позиция (с учётом redone-элементов) → текущий прямоугольник глифа, Привязка к тексту: каждая точка → ближайший символ строки (живой штрих), Custom iOS Pen Render Layer (Metal or Core Animation), TextKit 2 (UIKit editor), D-05. Перо при перекладке текста — вариант А «живой штрих», PencilKit (rejected), Гипотеза реализации, Контекст (+8 more)

### Community 123 - "0022-no-rust-core.md"
Cohesion: 0.13
Nodes (16): Утверждён технологический стек (D-21), отказ от ядра на Rust (D-22), D-21. Технологический стек, Node.js + TypeScript server, Swift 6, TypeScript, Контекст, Последствия, Рассмотренные варианты (по обсуждению 2026-10-25) (+8 more)

### Community 124 - "2. Платформы"
Cohesion: 0.40
Nodes (5): 2. Платформы, Минимальная версия iOS/iPadOS — 26 (D-32), Минимальная версия iOS/iPadOS — ОТКРЫТО, Тестовые устройства (известно на 2026-10-25), Требования

### Community 126 - "8. Совместная работа и шеринг"
Cohesion: 0.40
Nodes (5): 8. Совместная работа и шеринг, Гости (D-37), Открыто (см. `open-questions.md`), Реализация, Требования

### Community 130 - "D-04. Одновременно сквозное шифрование и доступ по API"
Cohesion: 0.50
Nodes (4): D-04. Одновременно сквозное шифрование и доступ по API, Контекст, Последствия, Решение

### Community 136 - ".decode"
Cohesion: 0.30
Nodes (3): ClientInfo, SyncValidation, UpdateItem

### Community 137 - "ServerMessage"
Cohesion: 0.15
Nodes (9): Item, ServerMessage, ack, awareness, error, update, updates, welcome (+1 more)

## Knowledge Gaps
- **272 isolated node(s):** `PackageDescription`, `YrsFFI`, `account`, `notebook`, `note` (+267 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 740 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Контракт: модель документа (v1)` connect `LocalStore` to `String`, `Контракт: модель документа (v1)`?**
  _High betweenness centrality (0.352) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `NoteDocument` (e.g. with `.snapshotIfNeeded()` and `.strokesRoundTripAndResolveAnchors()`) actually correct?**
  _`NoteDocument` has 8 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PackageDescription`, `YrsFFI`, `account` to the rest of the system?**
  _272 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `0039-parallel-sessions.md` be split into smaller, more focused modules?**
  _Cohesion score 0.12701612903225806 - nodes in this community are weakly interconnected._
- **Why does `DocKind` connect `LocalStore` to `Stroke`, `CRDTDocument`, `SyncEngine`, `APIClient`, `Sendable`, `D-41. Набор функций по мотивам Craft`?**
  _High betweenness centrality (0.258) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `APIClient` (e.g. with `.loginRefreshesOnExpiryAnd401()` and `.registerDocSendsExplicitNull()`) actually correct?**
  _`APIClient` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `sync-protocol.md` be split into smaller, more focused modules?**
  _Cohesion score 0.06292517006802721 - nodes in this community are weakly interconnected._