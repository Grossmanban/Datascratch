# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 139 files · ~66,688 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 6, .resolved 1)

## Summary
- 2591 nodes · 6359 edges · 130 communities (117 shown, 13 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 912 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bcf8ae83`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- 0039-parallel-sessions.md
- 10-sync.md
- String
- 0018-monetization.md
- 09-agents-api.md
- overview.md
- sync-protocol.md
- AuthSession
- CodingKeys
- development.md
- crypto.md
- NotebookDocument
- CHANGELOG.md
- AccountService
- APIClient
- Контракт: модель документа (v1)
- Sendable
- yjs_compat.rs
- 04-editor.md
- glossary.md
- docs/README.md
- 08-sharing.md
- 03-pencil.md
- AttachmentManager
- package.json
- compilerOptions
- String
- NoteDocument
- SyncClient
- Контракт: дизайн-токены «Тихая бумага» (v1)
- Foundation
- tests.rs
- Stroke
- .json
- Data
- contracts/README.md
- Server stack
- open-questions.md (2)
- Контракт: модель документа (v1) (2)
- SyncEngine
- generate.mjs
- tasks
- YrsError
- LocalStore
- 0004-encryption-and-api.md
- D-05. Перо при перекладке текста — вариант А «живой штрих»
- Монорепозиторий и CLAUDE.md (2)
- 5. Организация заметок и дизайн
- CRDTTransaction
- TransactionOrigin
- 0035-strokes-on-deleted-text.md
- FakeSyncServer
- 4. Редактор
- SyncErrorCode
- lib.rs
- 0031-crdt-yjs.md
- 0036-space-notebook-folder.md
- strokes.md
- CRDTDocument.swift
- Процесс разработки и Graphify (2)
- 0008-pdf-annotations.md
- TaskState
- .iso
- ClientMessage
- SecretStore
- api.md
- String
- 04-editor.md (4)
- CRDTDocument
- graphify_docs.py
- .make
- libsodium on all platforms (swift-sodium on iOS, libsodium-wrappers in TS)
- 0024-product-name.md
- CryptoError
- APIError
- Контракт: шифрование (v1)
- pnpm-workspace.yaml
- Процесс разработки (docs/development.md)
- Block
- iOS client stack
- Контракт: дизайн-токены «Тихая бумага» (v1)
- 12-craft-features.md
- WebSocketConnection
- 0024-product-name.md
- D-29. Graphify: порядок работы, чтобы граф был всегда актуален
- .observe_deep
- 02-platforms.md
- design-tokens.md
- SyncClient.swift
- 1. Концепция продукта
- План разработки
- Configuration
- Контракт: REST API сервера (v1)
- Контракт: шифрование (v1)
- SyncConnectionState
- Контракт: протокол синхронизации (v1)
- 0010-agent-edits.md
- 12. Функции по мотивам Craft
- Открытые вопросы
- Datascratch — правила для ИИ
- Снимки и уплотнение: > 500 обновлений или > 1 MiB → снимок; удаление seq ≤ baseSeq, кроме нужных истории (R-05)
- decisions/README.md
- build-xcframework.sh
- Обзор архитектуры
- CRDTSubscription
- Universal Links (paid Apple Developer account)
- Процесс разработки
- Технологический стек — РЕШЕНО (2026-10-25)
- 9. API и внешние ИИ-агенты
- DSCore
- .data
- Модель данных — ЧЕРНОВИК
- D-22. Без собственного общего ядра на Rust
- build-linux.sh
- generate-bindings.sh
- D-25. Redis не используем
- 11. Нефункциональные требования
- D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO
- 8. Совместная работа и шеринг
- D-23. Документация — источник истины; Graphify — граф знаний поверх неё
- D-27. В прототипе пера текст хранится в Yrs
- D-28. Процесс разработки: облако + Mac, сборка iOS в CI
- D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления
- yrs-ffi
- D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время
- D-37. Гости по ссылке рисуют; ссылка живёт до отзыва
- .decode
- ServerMessage

## God Nodes (most connected - your core abstractions)
1. `TransactionOrigin` - 71 edges
2. `NoteDocument` - 66 edges
3. `APIClient` - 62 edges
4. `CRDTDocument` - 46 edges
5. `YrsError` - 41 edges
6. `NotebookDocument` - 39 edges
7. `YDocument` - 38 edges
8. `Block` - 37 edges
9. `AccountDocument` - 34 edges
10. `SyncEngine` - 34 edges

## Surprising Connections (you probably didn't know these)
- `1. Три вида документов Yjs` --references--> `DocKind`  [INFERRED]
  docs/architecture/contracts/document-model.md → apps/ios/Packages/DSCore/Sources/DSCore/CRDT/CRDTDocument.swift
- `4.4. `comments`` --references--> `Comment`  [INFERRED]
  docs/architecture/contracts/document-model.md → apps/ios/Packages/DSCore/Sources/DSCore/Model/NoteDocument.swift
- `4.2. Схема блоков` --references--> `label()`  [INFERRED]
  docs/architecture/contracts/document-model.md → tools/graphify_docs.py
- `3. Документ `notebook` (индекс блокнота)` --references--> `Folder`  [INFERRED]
  docs/architecture/contracts/document-model.md → apps/ios/Packages/DSCore/Sources/DSCore/Model/Records.swift
- `3. Документ `notebook` (индекс блокнота)` --references--> `NoteMeta`  [INFERRED]
  docs/architecture/contracts/document-model.md → apps/ios/Packages/DSCore/Sources/DSCore/Model/Records.swift

## Import Cycles
- 2-file cycle: `apps/ios/Packages/DSCore/yrs-ffi/src/lib.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/xml.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/lib.rs`
- 3-file cycle: `apps/ios/Packages/DSCore/yrs-ffi/src/events.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/xml.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/lib.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/events.rs`

## Communities (130 total, 13 thin omitted)

### Community 0 - "0039-parallel-sessions.md"
Cohesion: 0.07
Nodes (39): apps/ios — iPhone + iPad, iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), apps/server — сервер, Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), apps/web — веб-клиент, Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), XcodeGen (project.yml) вместо ручного .xcodeproj — принят в работу в D-39 (+31 more)

### Community 1 - "10-sync.md"
Cohesion: 0.15
Nodes (14): История версий: GET /docs/:id/versions и /versions/:seq (зашифрованные снимки), Восстановление версии из истории: восстанавливаются content и strokes; якоря пересчитываются через абсолютные индексы → новая относительная позиция, Агенты не подключаются по WebSocket — работают через MCP/REST; сервер применяет их правки как обычные обновления, Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps, Agent edits applied immediately, highlighted, revertible via history (D-10), 10. Синхронизация и офлайн, Local storage: SQLite via GRDB (iOS), IndexedDB via Dexie (web), Agent notebooks: server decrypts and applies agent edit as a normal update (+6 more)

### Community 2 - "String"
Cohesion: 0.10
Nodes (14): Backdrop, .yValue, Comment, Cover, .value, DocumentError, notFound, readOnly (+6 more)

### Community 3 - "0018-monetization.md"
Cohesion: 0.07
Nodes (29): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, Контекст, Решение (на сейчас) (+21 more)

### Community 4 - "09-agents-api.md"
Cohesion: 0.18
Nodes (13): AgentToken { id, name, notebookIds, permission, expiresAt, createdAt, lastUsedAt } — без секрета, Токены агентов /agent-tokens: блокноты, read / read_write, срок; токен показывается один раз, Контракт agents-api.md (MCP и REST для самих агентов) — появится на этапе агентов, blockId (UUIDv7) у каждого блочного узла — для точечных правок агентов, заметок на полях и комментариев, pg-boss background job queue on PostgreSQL, PostgreSQL via Drizzle (D-30): accounts, notebooks, rights, tokens, encrypted updates, snapshots, agent log, Log of all agent actions, Agent capabilities: search/read Markdown, block-level edits, comments, links/tags/backlinks (+5 more)

### Community 5 - "overview.md"
Cohesion: 0.08
Nodes (39): Журнал действий агента GET /agent-tokens/:id/audit, agent_tokens / agent_audit_log Tables, doc_updates Table (encrypted Yjs updates), Server PostgreSQL Schema (Stage 3 Draft), Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents (+31 more)

### Community 6 - "sync-protocol.md"
Cohesion: 0.20
Nodes (17): Формат ошибок { error: { code, message } } и коды bad_request…internal, ack — обновление или снимок принят и сохранён (docId, clientMsgId, seq), Коды ошибок синхронизации: unauthorized, forbidden, doc_not_found, payload_too_large (2 MiB / 50 MiB), rate_limited, protocol_mismatch, internal, error — сообщение сервера: code, message, ref? (clientMsgId / docId), Клиент хранит lastSeq по каждому документу и догоняет недостающее при подключении, Сервер не присылает клиенту его собственные обновления (кроме updates при догоняющей подписке с другого устройства), Офлайн: обновления копятся в локальной очереди до подтверждения ack, Лимиты payload_too_large: обновление 2 MiB, снимок 50 MiB — считаются декодированные байты, не base64 (+9 more)

### Community 7 - "AuthSession"
Cohesion: 0.11
Nodes (7): HTTPTransport, SecretSessionStore, SessionStore, AuthSession, Locked, APIClientTests, StubTransport

### Community 8 - "CodingKeys"
Cohesion: 0.07
Nodes (26): CodingKeys, accessToken, baseSeq, client, clientMsgId, code, deviceId, docId (+18 more)

### Community 9 - "development.md"
Cohesion: 0.16
Nodes (16): Стартовый хук Claude Code (.claude/hooks/session-start.sh), git-хук Graphify (пересборка только по изменённому коду), Скрипт tools/graphify_docs.py (prepare → агенты → finish), Graphify 0.9.95 (пакет graphifyy), Смысловой слой графа (понятия, решения, связи — проход ИИ), Структурный слой графа (код, файлы, заголовки — без ИИ), Automation: SessionStart hook installs Graphify and git hook; git hook rebuilds code graph after commit/checkout/merge; graphify update after git pull on Mac, Stream sessions write changelog fragments in docs/changelog.d/ instead of editing CHANGELOG.md; stream history files docs/history/YYYY-MM-DD-<stream>-NN.md (+8 more)

### Community 10 - "crypto.md"
Cohesion: 0.15
Nodes (23): Режим «для агентов»: клиент передаёт notebookKey по TLS, сервер оборачивает его serverKey; расшифровка только при запросе агента с токеном, Вложения шифруются кусками по 1 MiB, каждый — отдельный конверт, Иерархия ключей: пароль → passwordKey → masterKey → notebookKey → noteKey, loginKey = BLAKE2b(authSeed, "ds1|login"); сервер хранит Argon2id(loginKey), masterKey — 32 случайных байта, создаётся при регистрации, шифрует account-документ, noteKey — ключ заметки: шифрует note-документ и вложения, notebookKey — случайный ключ блокнота, шифрует notebook-документ, Смена пароля перешифровывает только обёртку masterKey (+15 more)

### Community 11 - "NotebookDocument"
Cohesion: 0.13
Nodes (8): Блокнот и аккаунт, NotebookDocument, .inbox, .notebookId, NoteMeta, .fields, .isTrashed, IndexDocumentTests

### Community 12 - "CHANGELOG.md"
Cohesion: 0.10
Nodes (31): pnpm + Turborepo Monorepo, 2026-10-25, 2026-10-25 (вторая половина дня), Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, Каркас монорепозитория (pnpm + Turborepo), девять потоков разработки, правила сессий-исполнителей, changelog.d (+23 more)

### Community 13 - "AccountService"
Cohesion: 0.19
Nodes (6): AccountError, missingKey, notSignedIn, AccountService, ShareLink, SignupResult

### Community 14 - "APIClient"
Cohesion: 0.11
Nodes (4): APIClient, .currentSession, .isSignedIn, normalizeEmail()

### Community 15 - "Контракт: модель документа (v1)"
Cohesion: 0.12
Nodes (26): y-prosemirror не записывает атрибуты узлов со значением null: отсутствующий атрибут = null (значение по умолчанию схемы), Документ account: spaces, notebooks, settings, starred, tabs (ключ — masterKey), Даты ISO 8601 в UTC; «только дата» YYYY-MM-DD; миллисекунды — только в штрихах, Производные данные строятся локально: индекс задач, полнотекстовый поиск, бэклинки, теги, Векторы совместимости модели документа packages/test-vectors/document/* (iOS/Yrs обязан читать и писать формат y-prosemirror), Вставка текста в Y.XmlText без явных атрибутов наследует форматирование слева (Yjs/Yrs) — писатели всегда передают явный набор атрибутов, Folder { parentId, name, icon, color, order } — вложенность без ограничения глубины, Inline-узлы noteLink ([[ ]]) и tag (без #, вложенность через /) (+18 more)

### Community 16 - "Sendable"
Cohesion: 0.17
Nodes (30): AgentPermission, read, readWrite, AgentToken, APIErrorBody, AttachmentStatus, CreatedAgentToken, Device (+22 more)

### Community 17 - "yjs_compat.rs"
Cohesion: 0.20
Nodes (12): b64(), el(), empty(), fixture(), normalize(), reads_yjs_document(), roots(), s() (+4 more)

### Community 18 - "04-editor.md"
Cohesion: 0.13
Nodes (11): Локальное хранилище, AttachmentRecord, .missingChunks, .uploaded, LocalStore, SearchHit, State, pendingUpload (+3 more)

### Community 19 - "glossary.md"
Cohesion: 0.05
Nodes (53): meta.formatVersion = 1; документ новее клиента открывается только для чтения (R-03), Версионирование контрактов v1, v2…; ломающее изменение — новая версия с явной миграцией, Контракт меняет только сессия-координатор; исполнитель присылает предложение, Обводки и стрелки «растягиваются» вместе с текстом; при проблемах — изменение контракта через координатора, Поля штриха: v, tool, color, width, opacity, anchorKind, blockId, anchors, points, hint, author, createdAt, Привязка к тексту: каждая точка → ближайший символ строки (живой штрих), Anchor (textRange / paragraph / drawingBlock / image), Note (+45 more)

### Community 20 - "docs/README.md"
Cohesion: 0.15
Nodes (16): Перед любой работой: порядок чтения, Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, ADR file number equals decision number (D-05 -> 0005-*.md), template 0000-template.md, Нумерация решений D-NN и файлы decisions/00NN-*.md, Документация Datascratch — единственный источник истины, Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Правило замены: решение РЕШЕНО не переписывается, ADR получает статус «ЗАМЕНЕНО решением D-NN», Оглавление docs/ (spec, contracts, architecture, decisions, roadmap, risks…) (+8 more)

### Community 21 - "08-sharing.md"
Cohesion: 0.21
Nodes (14): POST /docs — регистрация документа (account / notebook / note) до первого push, Share { id, target { kind, id }, permission, expiresAt, createdAt } — ссылка шеринга, Шеринг: /shares (view/edit, бессрочно по умолчанию, отзыв сразу отключает гостей), Права: user — документы своего аккаунта; guest — только документы шеринга, push только с правом edit, Guest via Link (web, no account), Link sharing with editing without account, Гости со ссылкой на правку пишут и рисуют (пером, пальцем, мышью), Ссылка по умолчанию действует до отзыва; срок можно задать при создании (+6 more)

### Community 22 - "03-pencil.md"
Cohesion: 0.06
Nodes (28): Схема блоков: doc = title block+ (paragraph, heading, списки, taskList, callout, codeBlock, mathBlock, mermaid, table, image, file, drawing, pageCard), hint — распознанная форма (underline, strike, circle, highlight, arrow, scribble) для агентов и экспорта, D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия (+20 more)

### Community 24 - "package.json"
Cohesion: 0.14
Nodes (15): devDependencies, turbo@^2.3.0, typescript@^5.6.0, engines, node, name, packageManager, private (+7 more)

### Community 25 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+7 more)

### Community 26 - "String"
Cohesion: 0.13
Nodes (3): CryptoAD, DSCrypto, CryptoTests

### Community 27 - "NoteDocument"
Cohesion: 0.10
Nodes (9): InlineLocation, NoteDocument, .isReadOnly, .noteId, RunPiece, node, text, NoteDocumentTests (+1 more)

### Community 28 - "SyncClient"
Cohesion: 0.16
Nodes (3): SyncClient, SyncClientDelegate, auth

### Community 29 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.08
Nodes (30): ArrayDelta, Delete, Insert, Retain, convert(), DeepObserver, path(), sorted_keys() (+22 more)

### Community 30 - "Foundation"
Cohesion: 0.18
Nodes (9): ShareLinkTests, StrokeMaintenanceTests, VersionRestoreTests, FakeFactory, DSCore, Foundation, FoundationNetworking, PackageDescription (+1 more)

### Community 31 - "tests.rs"
Cohesion: 0.19
Nodes (17): arrays_and_errors(), Collect, local(), merge_and_diff_updates(), nested_maps_merge_per_field(), note_roots(), observers_report_paths_deltas_and_origins(), paragraph() (+9 more)

### Community 32 - "Stroke"
Cohesion: 0.07
Nodes (33): AnchorKind, block, drawing, image, text, Author, .value, Hint (+25 more)

### Community 33 - ".json"
Cohesion: 0.19
Nodes (8): BadValue, CryptoVectorTests, jsonEqual(), sortedMarks(), StrokeVectorTests, SyncVectorTests, Vectors, .available

### Community 34 - "Data"
Cohesion: 0.13
Nodes (7): CRDTUpdates, KeyRing, .fields, .url, Base64URL, Data, .hexString

### Community 35 - "contracts/README.md"
Cohesion: 0.22
Nodes (9): Тестовые векторы crypto: KDF, конверты, Base32 ключа восстановления, куски вложений (Swift и TS), Контракт — точное описание формата/протокола, который реализуют несколько частей (iOS на Swift, веб и сервер на TS), Совместимость доказывается общими тестовыми векторами (packages/test-vectors), Типы TypeScript контрактов в packages/shared/src/contracts/ — часть контракта, Контракты между частями системы, Правила изменения, Тестовые векторы strokes: упаковка точек, разрешение якорей после правок, правило D-35, Тестовые векторы sync: примеры всех сообщений в JSON (схема проверяется в TS и Swift) (+1 more)

### Community 36 - "Server stack"
Cohesion: 0.14
Nodes (16): Canvas + Pointer Events, Dexie (IndexedDB), Drizzle ORM, Fastify, MCP TypeScript SDK, OAuth 2.1, pg-boss job queue, Radix + Tailwind + Motion (+8 more)

### Community 37 - "open-questions.md (2)"
Cohesion: 0.09
Nodes (15): XmlNode, .attributes, .children, .elementName, .textContent, YValue, .boolValue, .dataValue (+7 more)

### Community 38 - "Контракт: модель документа (v1) (2)"
Cohesion: 0.06
Nodes (35): concurrency, cancel-in-progress, group, defaults, run, name, runs-on, steps (+27 more)

### Community 39 - "SyncEngine"
Cohesion: 0.09
Nodes (5): .isConnected, KeyRingDocumentKeys, OpenDoc, SyncEngine, SyncStatus

### Community 40 - "generate.mjs"
Cohesion: 0.07
Nodes (28): b64(), content, doc, firstRun, fixture, json, para, rel() (+20 more)

### Community 41 - "tasks"
Cohesion: 0.18
Nodes (10): dependsOn, outputs, $schema, tasks, build, lint, test, typecheck (+2 more)

### Community 42 - "YrsError"
Cohesion: 0.08
Nodes (17): check_text_range(), decoding(), diff_update(), merge_updates(), mismatch(), missing_map(), nested_map(), ResolvedIndex (+9 more)

### Community 43 - "LocalStore"
Cohesion: 0.09
Nodes (14): DocKind, account, note, notebook, .roots, DocumentRecord, Kind, push (+6 more)

### Community 44 - "0004-encryption-and-api.md"
Cohesion: 0.10
Nodes (23): PATCH /notebooks/:id/mode — включение режима «для агентов» передаёт notebookKey, выключение удаляет серверную обёртку, NotebookRef { id, spaceId, name, mode: private | agent, … } — ключ блокнота здесь не хранится, D-04. Одновременно сквозное шифрование и доступ по API, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), Контекст, Последствия, Решение (+15 more)

### Community 45 - "D-05. Перо при перекладке текста — вариант А «живой штрих»"
Cohesion: 0.40
Nodes (5): D-05. Перо при перекладке текста — вариант А «живой штрих», Гипотеза реализации, Контекст, Последствия, Решение

### Community 46 - "Монорепозиторий и CLAUDE.md (2)"
Cohesion: 0.09
Nodes (15): value_to_in(), YValue, BigInt, Bool, Bytes, List, Null, Number (+7 more)

### Community 47 - "5. Организация заметок и дизайн"
Cohesion: 0.40
Nodes (5): 5. Организация заметок и дизайн, Дизайн (D-15 — РЕШЕНО, главный принцип продукта), Организация (D-14 — РЕШЕНО по сути; структура ниже — ПРЕДЛОЖЕНО), Принципы, Реализация

### Community 48 - "CRDTTransaction"
Cohesion: 0.14
Nodes (11): CRDTTransaction, 1. Три вида документов Yjs, 3. Документ `notebook` (индекс блокнота), 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note` (+3 more)

### Community 49 - "TransactionOrigin"
Cohesion: 0.11
Nodes (14): Документы (CRDT), TransactionOrigin, .description, .isOutgoing, local, other, remote, storage (+6 more)

### Community 50 - "0035-strokes-on-deleted-text.md"
Cohesion: 0.19
Nodes (12): Правило D-35 в отрисовке: точки удалённых символов не рисуются, штрих остаётся в документе; отмена возвращает пометку, orphanedAt — локальная отметка клиента, когда все якоря штриха впервые оказались удалены (стирается, если якоря снова живы), Осиротевшие штрихи (все якоря удалены, orphanedAt или createdAt старше 30 дней) окончательно удаляются клиентом при уплотнении истории, D-35. Пометка на удалённом тексте исчезает вместе с ним, Окончательная очистка таких штрихов — при уплотнении истории, Вариант «потерянные пометки» — отклонён: лишний интерфейс, Частичное удаление: штрих «сжимается» до оставшегося текста, Вариант «прилипать к соседнему символу» — отклонён: пометка может оказаться не на том слове (+4 more)

### Community 51 - "FakeSyncServer"
Cohesion: 0.15
Nodes (4): docs, Conn, FakeSyncServer, Stored

### Community 52 - "4. Редактор"
Cohesion: 0.40
Nodes (5): 4. Редактор, Платформенная реализация, Прочее, Связи, Содержимое

### Community 53 - "SyncErrorCode"
Cohesion: 0.14
Nodes (12): JSONEncoder, .sync, SyncErrorCode, docNotFound, forbidden, `internal`, payloadTooLarge, protocolMismatch (+4 more)

### Community 54 - "lib.rs"
Cohesion: 0.08
Nodes (14): is_inside(), ORIGIN_LOCAL, ORIGIN_UNDO, RootDef, RootKind, Array, Map, Text (+6 more)

### Community 55 - "0031-crdt-yjs.md"
Cohesion: 0.24
Nodes (10): End-to-end encryption, Pen prototype (stage 1), Automerge (fallback CRDT), Last-write-wins (unsuitable), Loro (too early), Operational Transformation (unsuitable), Yjs RelativePosition as stroke-point anchor, Yjs (+2 more)

### Community 56 - "0036-space-notebook-folder.md"
Cohesion: 0.13
Nodes (18): Space { id, name, icon, color, order, createdAt } в account-документе, Organization Hierarchy (Account > Space > Notebook > Folder > Note), Проекты, личное, работа, учёба не смешиваются; минимум кнопок на экране, D-14. Организация: богатая, но не перегруженная, Предложенная структура: пространства → вложенные папки; поперёк — вложенные и умные теги, цвета, избранное, недавние, Решение, Поперёк структуры — теги, умные теги, избранное, недавние, D-36. Структура: пространство → блокноты → папки (+10 more)

### Community 57 - "strokes.md"
Cohesion: 0.14
Nodes (19): Comment { blockId, anchor (относительные позиции), author user | guest | agent, text, resolvedAt }, Блок drawing (высота в pt; штрихи — в strokes), Документ note: content (Y.XmlFragment), meta, strokes, comments (ключ заметки), meta заметки: style (font, width, paper, textColor), cover, backdrop, anchorKind: text | block (заметка на полях) | image | drawing, Перепривязка якорей после отмены/повтора: в той же транзакции якорь удалённого символа с redone-элементом переписывается на относительную позицию нового элемента, Координаты block / image / drawing — в долях ширины блока, Координаты text-штриха: смещение от начала глифа якорного символа в em (+11 more)

### Community 58 - "CRDTDocument.swift"
Cohesion: 0.20
Nodes (3): DeepHandler, UpdateHandler, YrsFFI

### Community 59 - "Процесс разработки и Graphify (2)"
Cohesion: 0.12
Nodes (19): chunk(), map_to_attrs(), value_to_any(), Container, container(), Element, Fragment, element() (+11 more)

### Community 60 - "0008-pdf-annotations.md"
Cohesion: 0.20
Nodes (10): D-08. Аннотации PDF пером — не в MVP, Аннотации PDF пером (PDFKit + свой слой штрихов) — после MVP, этап расширений, Решение, Решение (предложение), D-16. Импорт — не сейчас, Import from Obsidian/Notesnook (later), Решение, CLOSED: PDF annotations after MVP (D-08) (+2 more)

### Community 61 - "TaskState"
Cohesion: 0.14
Nodes (9): TaskState, cancelled, done, open, NoteDerivedData, NoteLinkEntry, TaskEntry, TaskQuery (+1 more)

### Community 62 - ".iso"
Cohesion: 0.11
Nodes (6): .accessExpiry, DSDate, EntityID, FakeRESTServer, User, UtilTests

### Community 63 - "ClientMessage"
Cohesion: 0.18
Nodes (7): ClientMessage, awareness, hello, push, snapshot, subscribe, unsubscribe

### Community 64 - "SecretStore"
Cohesion: 0.13
Nodes (11): Криптография (crypto.md), KDFParams, InMemorySecretStore, KeychainSecretStore, PasswordChangeMaterial, SecretStore, SecretStoreError, keychain (+3 more)

### Community 65 - "api.md"
Cohesion: 0.17
Nodes (15): Аккаунт и устройства: /me, /devices (отзыв сессий), удаление аккаунта, Эндпоинты /auth: prelogin, signup, login, refresh, logout, recovery, password, Аутентификация Bearer: accessToken 15 мин + refreshToken 30 дней с ротацией, Идентификаторы создаёт клиент (UUIDv7); повторный POST идемпотентен, иначе 409 conflict, Device { id, name, createdAt, lastSeenAt, current } — устройство (сессия) аккаунта, POST /shares/:id/guest — гостевой токен (без авторизации) для hello в синхронизации, GET /health → { ok: true, version } — служебная проверка сервера, Notebook { id, mode, createdAt, wrappedKey } — ответ /notebooks (+7 more)

### Community 66 - "String"
Cohesion: 0.14
Nodes (25): Folder, .fields, Kind, folder, note, notebook, MapRecord, NotebookMode (+17 more)

### Community 67 - "04-editor.md (4)"
Cohesion: 0.14
Nodes (14): YOp, ArrayDelete, ArrayInsert, MapDelete, MapSet, RootTextDelete, RootTextInsert, TextDelete (+6 more)

### Community 68 - "CRDTDocument"
Cohesion: 0.10
Nodes (8): CRDTDocument, .canRedo, .canUndo, .clientId, .formatVersion, .formatVersion, .formatVersion, CRDTDocumentTests

### Community 69 - "graphify_docs.py"
Cohesion: 0.28
Nodes (7): Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 71 - "libsodium on all platforms (swift-sodium on iOS, libsodium-wrappers in TS)"
Cohesion: 0.20
Nodes (12): Вложения: загрузка и докачка по кускам (/attachments/:id/chunks/:index), лимит 200 МБ, Ассоциированные данные ds1|… привязывают шифротекст к месту (doc, awareness, ключи, куски вложений), Конверт шифротекста: версия 0x01 + nonce 24 байта + XChaCha20-Poly1305-IETF (тег 16 байт), libsodium на всех платформах (libsodium-wrappers-sumo в TS, swift-sodium в iOS), awareness — курсоры и присутствие: зашифровано, не хранится, только рассылается, libsodium, Attachments as separate encrypted files, on-demand resumable download, Argon2id password key derivation (+4 more)

### Community 72 - "0024-product-name.md"
Cohesion: 0.22
Nodes (9): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4.1. Перепривязка якорей (отмена и восстановление версии), 4.2. Когда штрих считается «осиротевшим» и удаляется навсегда, 4. Привязка к тексту (живой штрих), 5. Отрисовка толщины, 6. Тестовые векторы (+1 more)

### Community 73 - "CryptoError"
Cohesion: 0.12
Nodes (12): CryptoError, decryptionFailed, invalidKeyLength, invalidRecoveryKey, kdfFailed, malformedEnvelope, sodiumInit, unsupportedKDF (+4 more)

### Community 74 - "APIError"
Cohesion: 0.22
Nodes (6): APIError, .code, invalidResponse, notAuthenticated, server, transport

### Community 75 - "Контракт: шифрование (v1)"
Cohesion: 0.22
Nodes (9): 3. Apple Pencil в тексте — ключевая фича, Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера, Перекладка текста — вариант А «живой штрих» (D-05, РЕШЕНО) (+1 more)

### Community 77 - "Процесс разработки (docs/development.md)"
Cohesion: 0.13
Nodes (16): Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, docs/history session log, Смешанный режим: облачные сессии (Linux, без Xcode) + Mac пользователя для сборки и iPad, D-23 (документация) (+8 more)

### Community 78 - "Block"
Cohesion: 0.07
Nodes (19): Модель заметки, Array, .attributes, Block, .blockId, .isKnown, .isTextBlock, .text (+11 more)

### Community 79 - "iOS client stack"
Cohesion: 0.18
Nodes (11): Custom pen renderer (Metal vs Core Animation TBD), GRDB (SQLite), iOS client stack, Node.js + TypeScript server, Swift 6, SwiftUI (shell), TypeScript, UIKit + TextKit 2 (editor) (+3 more)

### Community 80 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.40
Nodes (5): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 81 - "12-craft-features.md"
Cohesion: 0.13
Nodes (18): Ежедневные заметки и «Входящие» (kind daily / inbox) в блокноте settings.dailyNotebookId, D-41. Набор функций по мотивам Craft, Контекст, Решение, OPEN (before stage 2): Craft features MVP / post-MVP split (D-41, proposed), Stage 2: MVP on iPad and iPhone, local (editor, handwriting, links, tags, organization, search, design system), Calendar screen: day feed with tasks and daily note (MVP); system calendar integration after MVP, Card document: nested document shown as a card with cover (MVP) (+10 more)

### Community 83 - "0024-product-name.md"
Cohesion: 0.12
Nodes (16): Решения по анкетам пользователя: D-32…D-41 и PDF после MVP (D-08), D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст, Решение, Bundle ID com.datascratch.app, D-33. Bundle ID — com.datascratch.app (+8 more)

### Community 84 - "D-29. Graphify: порядок работы, чтобы граф был всегда актуален"
Cohesion: 0.22
Nodes (8): Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, D-29. Graphify: порядок работы, чтобы граф был всегда актуален, R-09 (риск: Graphify сломается или исчезнет), Контекст, Последствия, Решение, graphify-out/ layout: what is committed (graph.json, report, html, manifest, cache) vs machine-local (.gitignore), history/ — архив, не источник истины; исключена из графа (.graphifyignore)

### Community 85 - ".observe_deep"
Cohesion: 0.27
Nodes (3): UpdateObserver, origin_name(), YSubscription

### Community 86 - "02-platforms.md"
Cohesion: 0.06
Nodes (32): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, D-03. Платформы: нативные iPhone и iPad + полноценный веб, Full-featured web client (TypeScript), Контекст, Последствия, Решение (+24 more)

### Community 87 - "design-tokens.md"
Cohesion: 0.11
Nodes (28): Подложки backdrop.* (sand, dusk, mist, meadow, ember) — мягкие градиенты в духе Craft, Цветовые токены: bg.canvas («бумага»), text.primary («чернила»), accent («синие чернила»), danger/success/warning — светлая и тёмная тема, Ширина колонки документа: normal 720, wide 960, full, Тактильная отдача iOS: selection, success (задача выполнена), warning (удаление), Чернила пера ink.* (black, blue, red, green, purple, brown) и маркеры highlight.*, Движение: пружины motion.snappy / smooth / gentle, длительности duration.* для веба, Сетка отступов 4 pt, радиусы radius.*, тени shadow.card / shadow.popover, Цвета tint.* (.fg / .bg) для папок, тегов и выносок (+20 more)

### Community 88 - "SyncClient.swift"
Cohesion: 0.24
Nodes (7): URLSession, SyncClientError, closed, notConnected, server, URLSessionWebSocketFactory, WebSocketFactory

### Community 89 - "1. Концепция продукта"
Cohesion: 0.33
Nodes (6): 1. Концепция продукта, Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения, Суть в одном абзаце

### Community 90 - "План разработки"
Cohesion: 0.15
Nodes (13): Критерии приёмки, План разработки, Подготовка, Потоки разработки (D-39), Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad) (+5 more)

### Community 92 - "Контракт: REST API сервера (v1)"
Cohesion: 0.22
Nodes (9): Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1), Общее, Служебное, Токены агентов (`spec/09-agents-api.md`) (+1 more)

### Community 93 - "Контракт: шифрование (v1)"
Cohesion: 0.20
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 94 - "SyncConnectionState"
Cohesion: 0.25
Nodes (6): SyncConnectionState, connected, connecting, disconnected, stopped, waiting

### Community 95 - "Контракт: протокол синхронизации (v1)"
Cohesion: 0.22
Nodes (9): 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05), 6. Права, 7. Коды ошибок, 8. Тестовые векторы (+1 more)

### Community 96 - "0010-agent-edits.md"
Cohesion: 0.32
Nodes (6): Метка agentEdit (agentId, at) — подсветка правок агента до принятия пользователем, D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение

### Community 97 - "12. Функции по мотивам Craft"
Cohesion: 0.25
Nodes (8): 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft, Связь с моделью данных

### Community 98 - "Открытые вопросы"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 99 - "Datascratch — правила для ИИ"
Cohesion: 0.29
Nodes (7): Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой, Правила, Среда разработки

### Community 100 - "Снимки и уплотнение: > 500 обновлений или > 1 MiB → снимок; удаление seq ≤ baseSeq, кроме нужных истории (R-05)"
Cohesion: 0.52
Nodes (7): Снимки и уплотнение: > 500 обновлений или > 1 MiB → снимок; удаление seq ≤ baseSeq, кроме нужных истории (R-05), snapshot — загрузка зашифрованного снимка состояния до baseSeq, doc_snapshots Table (compacted snapshots, version history), Encrypted history compaction by clients (R-05, stage 3), Snapshot, OPEN (before stage 3): Yjs history compaction under encryption — snapshot scheme (R-05), R-05 Edit History Growth

### Community 101 - "decisions/README.md"
Cohesion: 0.09
Nodes (28): Astro (landing page), Drizzle ORM, GitHub Actions CI (incl. macOS iOS builds), TypeScript on Node.js, Scaling via PostgreSQL LISTEN/NOTIFY, Radix + Tailwind + Motion Design System, Redis (rejected), Swift 6 (+20 more)

### Community 102 - "build-xcframework.sh"
Cohesion: 0.50
Nodes (3): IPHONEOS_DEPLOYMENT_TARGET, MACOSX_DEPLOYMENT_TARGET, build-xcframework.sh script

### Community 103 - "Обзор архитектуры"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 105 - "Universal Links (paid Apple Developer account)"
Cohesion: 0.40
Nodes (6): Universal Links (paid Apple Developer account), Платный аккаунт Apple Developer; Team ID задаётся на Mac при первой подписи, в репозитории не хранится, Universal Links, Apple Developer Account, R-12 No Paid Apple Account (7-day installs), Universal Links: open in app if installed, else web (needs paid Apple Developer account and apple-app-site-association)

### Community 106 - "Процесс разработки"
Cohesion: 0.33
Nodes (6): Git, Две среды, Конец сессии, Кто что делает, Правила для сессий-исполнителей (D-39), Процесс разработки

### Community 107 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 109 - "9. API и внешние ИИ-агенты"
Cohesion: 0.33
Nodes (6): 9. API и внешние ИИ-агенты, Агент умеет, Безопасность, Набросок инструментов MCP (ПРЕДЛОЖЕНО), Правки агента (D-10), Реализация

### Community 110 - "DSCore"
Cohesion: 0.40
Nodes (4): DSCore, Подключение, Тесты, Устройство

### Community 112 - "Модель данных — ЧЕРНОВИК"
Cohesion: 0.40
Nodes (5): Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3), Штрих (черновик для прототипа)

### Community 113 - "D-22. Без собственного общего ядра на Rust"
Cohesion: 0.40
Nodes (5): D-22. Без собственного общего ядра на Rust, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 117 - "D-25. Redis не используем"
Cohesion: 0.40
Nodes (5): D-25. Redis не используем, Будущее, Контекст, Последствия, Решение

### Community 118 - "11. Нефункциональные требования"
Cohesion: 0.40
Nodes (5): 11. Нефункциональные требования, Доступность, Надёжность, Ресурсы сервера, Языки

### Community 119 - "D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO"
Cohesion: 0.40
Nodes (5): D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 120 - "8. Совместная работа и шеринг"
Cohesion: 0.40
Nodes (5): 8. Совместная работа и шеринг, Гости (D-37), Открыто (см. `open-questions.md`), Реализация, Требования

### Community 121 - "D-23. Документация — источник истины; Graphify — граф знаний поверх неё"
Cohesion: 0.50
Nodes (4): D-23. Документация — источник истины; Graphify — граф знаний поверх неё, Контекст, Последствия, Решение

### Community 122 - "D-27. В прототипе пера текст хранится в Yrs"
Cohesion: 0.50
Nodes (4): D-27. В прототипе пера текст хранится в Yrs, Контекст, Последствия, Решение

### Community 123 - "D-28. Процесс разработки: облако + Mac, сборка iOS в CI"
Cohesion: 0.50
Nodes (4): D-28. Процесс разработки: облако + Mac, сборка iOS в CI, Контекст, Последствия, Решение

### Community 124 - "D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления"
Cohesion: 0.50
Nodes (4): D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления, Контекст, Рассмотренные варианты, Решение

### Community 126 - "D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время"
Cohesion: 0.67
Nodes (3): D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Последствия, Решение

### Community 136 - ".decode"
Cohesion: 0.30
Nodes (3): ClientInfo, SyncValidation, UpdateItem

### Community 137 - "ServerMessage"
Cohesion: 0.21
Nodes (9): Item, ServerMessage, ack, awareness, error, update, updates, welcome (+1 more)

## Knowledge Gaps
- **274 isolated node(s):** `PackageDescription`, `YrsFFI`, `account`, `notebook`, `note` (+269 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 746 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Контракт: модель документа (v1)` connect `CRDTTransaction` to `String`, `Контракт: модель документа (v1)`?**
  _High betweenness centrality (0.348) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `NoteDocument` (e.g. with `.snapshotIfNeeded()` and `.strokesRoundTripAndResolveAnchors()`) actually correct?**
  _`NoteDocument` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PackageDescription`, `YrsFFI`, `account` to the rest of the system?**
  _274 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `0039-parallel-sessions.md` be split into smaller, more focused modules?**
  _Cohesion score 0.07039187227866474 - nodes in this community are weakly interconnected._
- **Why does `DocKind` connect `LocalStore` to `Stroke`, `CRDTDocument`, `SyncEngine`, `APIClient`, `Sendable`, `CRDTTransaction`, `CRDTDocument.swift`?**
  _High betweenness centrality (0.229) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `APIClient` (e.g. with `.makeService()` and `.loginRefreshesOnExpiryAnd401()`) actually correct?**
  _`APIClient` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `String` be split into smaller, more focused modules?**
  _Cohesion score 0.10252100840336134 - nodes in this community are weakly interconnected._