# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 134 files · ~59,496 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 6, .resolved 1)

## Summary
- 2454 nodes · 5829 edges · 114 communities (100 shown, 14 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 820 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `312f329c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- 0039-parallel-sessions.md
- sync-protocol.md
- String
- 06-data-server.md
- 0011-handwriting-for-agents.md
- open-questions.md
- decisions/README.md
- Снимки и уплотнение: > 500 обновлений или > 1 MiB → снимок; удаление seq ≤ baseSeq, кроме нужных истории (R-05)
- CodingKeys
- Правила для ИИ и документации
- crypto.md
- CRDTTransaction
- CHANGELOG.md
- ServerMessage
- APIClient
- Контракт: модель документа (v1)
- Sendable
- TransactionOrigin
- 04-editor.md
- glossary.md
- docs/README.md
- 08-sharing.md
- 0001-storage-in-database.md
- Monorepo layout (apps/ios, apps/web, apps/server, packages, infra)
- package.json
- compilerOptions
- Скрипт обновления графа
- NoteDocument
- SyncClient
- Контракт: дизайн-токены «Тихая бумага» (v1)
- Foundation
- tests.rs
- Stroke
- AuthSession
- String
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
- 0005-living-stroke.md
- Монорепозиторий и CLAUDE.md (2)
- 5. Организация заметок и дизайн
- Data
- D-41. Набор функций по мотивам Craft
- WebSocketConnection
- yjs_compat.rs
- 04-editor.md
- APIError
- lib.rs
- String
- 0036-space-notebook-folder.md
- strokes.md
- 11. Нефункциональные требования
- Процесс разработки и Graphify (2)
- 01-concept.md
- NoteDerivedData
- Контракт: дизайн-токены «Тихая бумага» (v1) (2)
- Graphify
- api.md
- KeyRing
- NotebookDocument
- 04-editor.md (4)
- Дизайн и организация (2) (2)
- 0035-strokes-on-deleted-text.md
- 0028-dev-workflow.md
- Процесс разработки (docs/development.md)
- 0024-product-name.md
- Соглашения
- development.md
- Контракт: шифрование (v1)
- pnpm-workspace.yaml
- 10-sync.md
- Block
- 0038-design-quiet-paper.md
- .iso
- 12-craft-features.md
- 0034-auth-email-password.md
- .open
- CryptoError
- Datascratch — правила для ИИ (CLAUDE.md)
- 0032-min-ios-version.md
- design-tokens.md
- StubTransport
- DSCrypto
- План разработки
- 0010-agent-edits.md
- roadmap.md
- Контракт: шифрование (v1)
- 0003-platforms.md
- .make
- Контракт: REST API сервера (v1)
- Контракт: протокол синхронизации (v1)
- KDFParams
- .json
- Открытые вопросы
- Datascratch — правила для ИИ
- build-xcframework.sh
- Обзор архитектуры
- Модель данных — ЧЕРНОВИК
- 7. Шифрование и доступ агентов
- D-23. Документация — источник истины; Graphify — граф знаний поверх неё
- D-39. Разработка параллельными сессиями; Claude сам вливает в main
- Процесс разработки
- build-linux.sh
- generate-bindings.sh
- yrs-ffi

## God Nodes (most connected - your core abstractions)
1. `TransactionOrigin` - 70 edges
2. `NoteDocument` - 59 edges
3. `APIClient` - 57 edges
4. `CRDTDocument` - 44 edges
5. `YrsError` - 41 edges
6. `YDocument` - 38 edges
7. `NotebookDocument` - 36 edges
8. `SyncEngine` - 34 edges
9. `SyncClient` - 32 edges
10. `AccountDocument` - 30 edges

## Surprising Connections (you probably didn't know these)
- `1. Три вида документов Yjs` --references--> `DocKind`  [INFERRED]
  docs/architecture/contracts/document-model.md → apps/ios/Packages/DSCore/Sources/DSCore/CRDT/CRDTDocument.swift
- `4.4. `comments`` --references--> `Comment`  [INFERRED]
  docs/architecture/contracts/document-model.md → apps/ios/Packages/DSCore/Sources/DSCore/Model/NoteDocument.swift
- `4.2. Схема блоков` --references--> `label()`  [INFERRED]
  docs/architecture/contracts/document-model.md → tools/graphify_docs.py
- `Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО` --semantically_similar_to--> `Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/README.md
- `3. Документ `notebook` (индекс блокнота)` --references--> `NoteMeta`  [INFERRED]
  docs/architecture/contracts/document-model.md → apps/ios/Packages/DSCore/Sources/DSCore/Model/Records.swift

## Import Cycles
- 2-file cycle: `apps/ios/Packages/DSCore/yrs-ffi/src/lib.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/xml.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/lib.rs`
- 3-file cycle: `apps/ios/Packages/DSCore/yrs-ffi/src/events.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/xml.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/lib.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/events.rs`

## Communities (114 total, 14 thin omitted)

### Community 0 - "0039-parallel-sessions.md"
Cohesion: 0.12
Nodes (21): rebaseRedoneAnchors(doc) — хелпер TS перепривязки якорей (на iOS — эквивалент в DSCore), Radix + Tailwind + Motion Design System, SwiftUI, Canvas + Pointer Events Pen Layer, XcodeGen (project.yml) вместо ручного .xcodeproj — принят в работу в D-39, Cross-stream contracts (docs/architecture/contracts/) changed only via the coordinator session, Claude coordinator merges stream branches into main when CI is green, Coordinator session (merges branches into main, owns roadmap.md, CHANGELOG.md and contracts) (+13 more)

### Community 1 - "sync-protocol.md"
Cohesion: 0.22
Nodes (17): Формат ошибок { error: { code, message } } и коды bad_request…internal, ack — обновление или снимок принят и сохранён (docId, clientMsgId, seq), Коды ошибок синхронизации: unauthorized, forbidden, doc_not_found, payload_too_large (2 MiB / 50 MiB), rate_limited, protocol_mismatch, internal, error — сообщение сервера: code, message, ref? (clientMsgId / docId), Клиент хранит lastSeq по каждому документу и догоняет недостающее при подключении, Сервер не присылает клиенту его собственные обновления (кроме updates при догоняющей подписке с другого устройства), Офлайн: обновления копятся в локальной очереди до подтверждения ack, Лимиты payload_too_large: обновление 2 MiB, снимок 50 MiB — считаются декодированные байты, не base64 (+9 more)

### Community 2 - "String"
Cohesion: 0.09
Nodes (19): .entries, .formatVersion, .formatVersion, Backdrop, .yValue, Comment, .fields, Cover (+11 more)

### Community 3 - "06-data-server.md"
Cohesion: 0.06
Nodes (37): Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting (+29 more)

### Community 4 - "0011-handwriting-for-agents.md"
Cohesion: 0.10
Nodes (22): AgentToken { id, name, notebookIds, permission, expiresAt, createdAt, lastUsedAt } — без секрета, Токены агентов /agent-tokens: блокноты, read / read_write, срок; токен показывается один раз, Контракт agents-api.md (MCP и REST для самих агентов) — появится на этапе агентов, D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Export: Markdown, PDF, HTML (handwriting as images), pg-boss background job queue on PostgreSQL, PostgreSQL via Drizzle (D-30): accounts, notebooks, rights, tokens, encrypted updates, snapshots, agent log (+14 more)

### Community 5 - "open-questions.md"
Cohesion: 0.07
Nodes (52): Журнал действий агента GET /agent-tokens/:id/audit, Транспорт wss://<host>/v1/sync: JSON-кадры с type, base64url, ping/pong каждые 25 с, agent_tokens / agent_audit_log Tables, Server PostgreSQL Schema (Stage 3 Draft), Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents (+44 more)

### Community 6 - "decisions/README.md"
Cohesion: 0.10
Nodes (24): D-19. Весь код пишет Claude, Последствия, Решение, Custom pen renderer (Metal vs Core Animation TBD), End-to-end encryption, iOS client stack, Node.js + TypeScript server, Swift 6 (+16 more)

### Community 7 - "Снимки и уплотнение: > 500 обновлений или > 1 MiB → снимок; удаление seq ≤ baseSeq, кроме нужных истории (R-05)"
Cohesion: 0.40
Nodes (5): Осиротевшие штрихи (все якоря удалены, orphanedAt или createdAt старше 30 дней) окончательно удаляются клиентом при уплотнении истории, Снимки и уплотнение: > 500 обновлений или > 1 MiB → снимок; удаление seq ≤ baseSeq, кроме нужных истории (R-05), Encrypted history compaction by clients (R-05, stage 3), Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps, Performance targets (PencilKit latency, 120 fps, 300 ms open, 1-min first sync, 2 s delivery, 1 s cold start)

### Community 8 - "CodingKeys"
Cohesion: 0.06
Nodes (28): CodingKeys, accessToken, auth, baseSeq, client, clientMsgId, code, deviceId (+20 more)

### Community 9 - "Правила для ИИ и документации"
Cohesion: 0.16
Nodes (13): Стартовый хук Claude Code (.claude/hooks/session-start.sh), D-23 (документация), D-29. Graphify: порядок работы, чтобы граф был всегда актуален, git-хук Graphify (пересборка только по изменённому коду), Graphify 0.9.95 (пакет graphifyy), R-09 (риск: Graphify сломается или исчезнет), Смысловой слой графа (понятия, решения, связи — проход ИИ), Структурный слой графа (код, файлы, заголовки — без ИИ) (+5 more)

### Community 10 - "crypto.md"
Cohesion: 0.12
Nodes (27): Вложения: загрузка и докачка по кускам (/attachments/:id/chunks/:index), лимит 200 МБ, Ассоциированные данные ds1|… привязывают шифротекст к месту (doc, awareness, ключи, куски вложений), Вложения шифруются кусками по 1 MiB, каждый — отдельный конверт, Конверт шифротекста: версия 0x01 + nonce 24 байта + XChaCha20-Poly1305-IETF (тег 16 байт), Иерархия ключей: пароль → passwordKey → masterKey → notebookKey → noteKey, libsodium на всех платформах (libsodium-wrappers-sumo в TS, swift-sodium в iOS), loginKey = BLAKE2b(authSeed, "ds1|login"); сервер хранит Argon2id(loginKey), masterKey — 32 случайных байта, создаётся при регистрации, шифрует account-документ (+19 more)

### Community 11 - "CRDTTransaction"
Cohesion: 0.07
Nodes (36): CRDTTransaction, Folder, .fields, Kind, folder, note, notebook, MapRecord (+28 more)

### Community 12 - "CHANGELOG.md"
Cohesion: 0.07
Nodes (42): 2026-10-25, 2026-10-25 (вторая половина дня), Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, Каркас монорепозитория (pnpm + Turborepo), девять потоков разработки, правила сессий-исполнителей, changelog.d (+34 more)

### Community 13 - "ServerMessage"
Cohesion: 0.08
Nodes (26): ClientInfo, ClientMessage, awareness, hello, push, snapshot, subscribe, unsubscribe (+18 more)

### Community 14 - "APIClient"
Cohesion: 0.12
Nodes (3): APIClient, .currentSession, .isSignedIn

### Community 15 - "Контракт: модель документа (v1)"
Cohesion: 0.15
Nodes (22): y-prosemirror не записывает атрибуты узлов со значением null: отсутствующий атрибут = null (значение по умолчанию схемы), Comment { blockId, anchor (относительные позиции), author user | guest | agent, text, resolvedAt }, Даты ISO 8601 в UTC; «только дата» YYYY-MM-DD; миллисекунды — только в штрихах, Векторы совместимости модели документа packages/test-vectors/document/* (iOS/Yrs обязан читать и писать формат y-prosemirror), Блок drawing (высота в pt; штрихи — в strokes), Вставка текста в Y.XmlText без явных атрибутов наследует форматирование слева (Yjs/Yrs) — писатели всегда передают явный набор атрибутов, Folder { parentId, name, icon, color, order } — вложенность без ограничения глубины, Значение метки — объект атрибутов ({ bold: {} }, { link: { href, … } }); читатели принимают {} и true и ключи <имя>--<хэш> (+14 more)

### Community 16 - "Sendable"
Cohesion: 0.19
Nodes (26): AgentPermission, read, readWrite, AgentToken, APIErrorBody, AttachmentStatus, CreatedAgentToken, Device (+18 more)

### Community 17 - "TransactionOrigin"
Cohesion: 0.12
Nodes (13): TransactionOrigin, .description, .isOutgoing, local, other, remote, storage, system (+5 more)

### Community 18 - "04-editor.md"
Cohesion: 0.10
Nodes (12): AttachmentRecord, .missingChunks, .uploaded, LocalStore, SearchHit, State, pendingUpload, remote (+4 more)

### Community 19 - "glossary.md"
Cohesion: 0.09
Nodes (29): meta.formatVersion = 1; документ новее клиента открывается только для чтения (R-03), Поля штриха: v, tool, color, width, opacity, anchorKind, blockId, anchors, points, hint, author, createdAt, Anchor (textRange / paragraph / drawingBlock / image), doc_snapshots Table (compacted snapshots, version history), doc_updates Table (encrypted Yjs updates), Note, Stroke, StrokePoint (+21 more)

### Community 20 - "docs/README.md"
Cohesion: 0.27
Nodes (10): ADR file number equals decision number (D-05 -> 0005-*.md), template 0000-template.md, Нумерация решений D-NN и файлы decisions/00NN-*.md, Документация Datascratch — единственный источник истины, history/ — архив, не источник истины; исключена из графа (.graphifyignore), Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Правило замены: решение РЕШЕНО не переписывается, ADR получает статус «ЗАМЕНЕНО решением D-NN», Оглавление docs/ (spec, contracts, architecture, decisions, roadmap, risks…), Документация Datascratch (+2 more)

### Community 21 - "08-sharing.md"
Cohesion: 0.10
Nodes (27): POST /docs — регистрация документа (account / notebook / note) до первого push, Share { id, target { kind, id }, permission, expiresAt, createdAt } — ссылка шеринга, Шеринг: /shares (view/edit, бессрочно по умолчанию, отзыв сразу отключает гостей), Ссылка шеринга /s/<shareId>#k=<ключ> — ключ в части после #, не уходит на сервер, awareness — курсоры и присутствие: зашифровано, не хранится, только рассылается, Права: user — документы своего аккаунта; guest — только документы шеринга, push только с правом edit, D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account (+19 more)

### Community 22 - "0001-storage-in-database.md"
Cohesion: 0.18
Nodes (10): hint — распознанная форма (underline, strike, circle, highlight, arrow, scribble) для агентов и экспорта, D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты (+2 more)

### Community 23 - "Monorepo layout (apps/ios, apps/web, apps/server, packages, infra)"
Cohesion: 0.13
Nodes (13): apps/server — сервер, Stream core (claude/core): packages/shared, packages/test-vectors, root configs — contract types, crypto, stroke codec, document schema, sync client, test vectors, Stream server (claude/server): apps/server, infra/ — Fastify, PostgreSQL, auth, sync, attachments, sharing, docker compose, 6. Модель данных и сервер, Self-hosting, Модель данных (общий обзор; детали — `architecture/data-model.md`), Резервные копии, Сервер (+5 more)

### Community 24 - "package.json"
Cohesion: 0.14
Nodes (15): devDependencies, turbo@^2.3.0, typescript@^5.6.0, engines, node, name, packageManager, private (+7 more)

### Community 25 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+7 more)

### Community 26 - "Скрипт обновления графа"
Cohesion: 0.28
Nodes (7): Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 27 - "NoteDocument"
Cohesion: 0.10
Nodes (8): InlineLocation, NoteDocument, .isReadOnly, .noteId, RunPiece, node, text, NoteDocumentTests

### Community 28 - "SyncClient"
Cohesion: 0.11
Nodes (8): SyncClient, SyncClientDelegate, SyncConnectionState, connected, connecting, disconnected, stopped, waiting

### Community 29 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.08
Nodes (29): ArrayDelta, Delete, Insert, Retain, convert(), path(), sorted_keys(), text_delta() (+21 more)

### Community 30 - "Foundation"
Cohesion: 0.16
Nodes (7): EntityID, StrokeMaintenanceTests, UtilTests, DSCore, Foundation, PackageDescription, Testing

### Community 31 - "tests.rs"
Cohesion: 0.19
Nodes (17): arrays_and_errors(), Collect, local(), merge_and_diff_updates(), nested_maps_merge_per_field(), note_roots(), observers_report_paths_deltas_and_origins(), paragraph() (+9 more)

### Community 32 - "Stroke"
Cohesion: 0.07
Nodes (31): AnchorKind, block, drawing, image, text, Author, .value, Hint (+23 more)

### Community 33 - "AuthSession"
Cohesion: 0.12
Nodes (7): HTTPTransport, SecretSessionStore, SessionStore, AuthSession, normalizeEmail(), APIClientTests, FoundationNetworking

### Community 34 - "String"
Cohesion: 0.18
Nodes (6): Криптография (crypto.md), InMemorySecretStore, KeychainSecretStore, SecretStore, SecretStoreError, keychain

### Community 35 - "contracts/README.md"
Cohesion: 0.20
Nodes (10): Тестовые векторы crypto: KDF, конверты, Base32 ключа восстановления, куски вложений (Swift и TS), Контракт — точное описание формата/протокола, который реализуют несколько частей (iOS на Swift, веб и сервер на TS), Версионирование контрактов v1, v2…; ломающее изменение — новая версия с явной миграцией, Совместимость доказывается общими тестовыми векторами (packages/test-vectors), Типы TypeScript контрактов в packages/shared/src/contracts/ — часть контракта, Контракты между частями системы, Правила изменения, Тестовые векторы strokes: упаковка точек, разрешение якорей после правок, правило D-35 (+2 more)

### Community 36 - "0025-no-redis.md"
Cohesion: 0.12
Nodes (18): Canvas + Pointer Events, Dexie (IndexedDB), Drizzle ORM, Fastify, GRDB (SQLite), MCP TypeScript SDK, OAuth 2.1, pg-boss job queue (+10 more)

### Community 37 - "open-questions.md (2)"
Cohesion: 0.07
Nodes (19): DSCore, Документы (CRDT), Подключение, Тесты, Устройство, XmlNode, .attributes, .children (+11 more)

### Community 38 - "Контракт: модель документа (v1) (2)"
Cohesion: 0.06
Nodes (35): concurrency, cancel-in-progress, group, defaults, run, name, runs-on, steps (+27 more)

### Community 40 - "generate.mjs"
Cohesion: 0.07
Nodes (28): b64(), content, doc, firstRun, fixture, json, para, rel() (+20 more)

### Community 41 - "tasks"
Cohesion: 0.18
Nodes (10): dependsOn, outputs, $schema, tasks, build, lint, test, typecheck (+2 more)

### Community 42 - "YrsError"
Cohesion: 0.07
Nodes (18): check_text_range(), decoding(), diff_update(), is_inside(), merge_updates(), mismatch(), missing_map(), nested_map() (+10 more)

### Community 43 - "LocalStore"
Cohesion: 0.08
Nodes (15): Локальное хранилище, DocKind, account, note, notebook, .roots, DocumentRecord, Kind (+7 more)

### Community 44 - "0004-encryption-and-api.md"
Cohesion: 0.19
Nodes (10): PATCH /notebooks/:id/mode — включение режима «для агентов» передаёт notebookKey, выключение удаляет серверную обёртку, Режим «для агентов»: клиент передаёт notebookKey по TLS, сервер оборачивает его serverKey; расшифровка только при запросе агента с токеном, blockId (UUIDv7) у каждого блочного узла — для точечных правок агентов, заметок на полях и комментариев, D-04. Одновременно сквозное шифрование и доступ по API, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), Контекст, Последствия (+2 more)

### Community 45 - "0005-living-stroke.md"
Cohesion: 0.11
Nodes (15): Привязка к тексту: каждая точка → ближайший символ строки (живой штрих), D-05. Перо при перекладке текста — вариант А «живой штрих», PencilKit (rejected), Гипотеза реализации, Контекст, Последствия, Решение, D-07. Распознавание рукописи в текст — не делаем (+7 more)

### Community 46 - "Монорепозиторий и CLAUDE.md (2)"
Cohesion: 0.09
Nodes (15): value_to_in(), YValue, BigInt, Bool, Bytes, List, Null, Number (+7 more)

### Community 47 - "5. Организация заметок и дизайн"
Cohesion: 0.40
Nodes (5): 5. Организация заметок и дизайн, Дизайн (D-15 — РЕШЕНО, главный принцип продукта), Организация (D-14 — РЕШЕНО по сути; структура ниже — ПРЕДЛОЖЕНО), Принципы, Реализация

### Community 48 - "Data"
Cohesion: 0.16
Nodes (4): CRDTUpdates, Base64URL, Data, .hexString

### Community 49 - "D-41. Набор функций по мотивам Craft"
Cohesion: 0.12
Nodes (4): CRDTSubscription, DeepHandler, UpdateHandler, YrsFFI

### Community 50 - "WebSocketConnection"
Cohesion: 0.16
Nodes (7): URLSession, Configuration, URLSessionWebSocket, URLSessionWebSocketFactory, WebSocketConnection, WebSocketFactory, FakeFactory

### Community 51 - "yjs_compat.rs"
Cohesion: 0.19
Nodes (12): b64(), el(), empty(), fixture(), normalize(), reads_yjs_document(), roots(), s() (+4 more)

### Community 52 - "04-editor.md"
Cohesion: 0.11
Nodes (20): Схема блоков: doc = title block+ (paragraph, heading, списки, taskList, callout, codeBlock, mathBlock, mermaid, table, image, file, drawing, pageCard), Производные данные строятся локально: индекс задач, полнотекстовый поиск, бэклинки, теги, Inline-узлы noteLink ([[ ]]) и tag (без #, вложенность через /), taskItem: taskId, state open / done / cancelled, scheduled, deadline, completedAt, Obsidian (reference product: links, backlinks, tags, Markdown export), 4. Редактор, Backlinks, Editor content (headings, lists, tables, code, formulas, attachments, drawing blocks) (+12 more)

### Community 53 - "APIError"
Cohesion: 0.09
Nodes (20): StrokeCodecError, invalidLength, APIError, .code, invalidResponse, notAuthenticated, server, transport (+12 more)

### Community 54 - "lib.rs"
Cohesion: 0.07
Nodes (17): DeepObserver, UpdateObserver, ORIGIN_LOCAL, origin_name(), ORIGIN_UNDO, RootDef, RootKind, Array (+9 more)

### Community 55 - "String"
Cohesion: 0.21
Nodes (4): CryptoAD, PasswordKeys, RecoveryKeyFormat, Clibsodium

### Community 56 - "0036-space-notebook-folder.md"
Cohesion: 0.11
Nodes (23): NotebookRef { id, spaceId, name, mode: private | agent, … } — ключ блокнота здесь не хранится, Space { id, name, icon, color, order, createdAt } в account-документе, Organization Hierarchy (Account > Space > Notebook > Folder > Note), D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, Проекты, личное, работа, учёба не смешиваются; минимум кнопок на экране, D-14. Организация: богатая, но не перегруженная, Предложенная структура: пространства → вложенные папки; поперёк — вложенные и умные теги, цвета, избранное, недавние (+15 more)

### Community 57 - "strokes.md"
Cohesion: 0.18
Nodes (17): История версий: GET /docs/:id/versions и /versions/:seq (зашифрованные снимки), Перепривязка якорей после отмены/повтора: в той же транзакции якорь удалённого символа с redone-элементом переписывается на относительную позицию нового элемента, Координаты block / image / drawing — в долях ширины блока, Правило D-35 в отрисовке: точки удалённых символов не рисуются, штрих остаётся в документе; отмена возвращает пометку, Координаты text-штриха: смещение от начала глифа якорного символа в em, Штрих почти неизменяем после рисования; ластик удаляет штрих целиком или заменяет кусками, Разрыв штриха по строкам: соседние точки на разных line fragments → отдельные сегменты, Изменяемые поля штриха после рисования: anchors (перепривязка, §4.1) и hidden (резерв) (+9 more)

### Community 58 - "11. Нефункциональные требования"
Cohesion: 0.40
Nodes (5): 11. Нефункциональные требования, Доступность, Надёжность, Ресурсы сервера, Языки

### Community 59 - "Процесс разработки и Graphify (2)"
Cohesion: 0.12
Nodes (19): chunk(), map_to_attrs(), value_to_any(), Container, container(), Element, Fragment, element() (+11 more)

### Community 60 - "01-concept.md"
Cohesion: 0.09
Nodes (21): D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст, Решение, Bundle ID com.datascratch.app, D-33. Bundle ID — com.datascratch.app, Решение (+13 more)

### Community 61 - "NoteDerivedData"
Cohesion: 0.57
Nodes (3): NoteDerivedData, NoteLinkEntry, TaskEntry

### Community 62 - "Контракт: дизайн-токены «Тихая бумага» (v1) (2)"
Cohesion: 0.40
Nodes (5): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 63 - "Graphify"
Cohesion: 0.18
Nodes (11): Monorepo Structure (apps/, packages/, infra/), packages/test-vectors, Graphify, Автоматизация, Команды, Обновление графа после правки документов (по шагам), Почему два способа обновления, Установка на Mac (один раз) (+3 more)

### Community 64 - "api.md"
Cohesion: 0.17
Nodes (15): Аккаунт и устройства: /me, /devices (отзыв сессий), удаление аккаунта, Эндпоинты /auth: prelogin, signup, login, refresh, logout, recovery, password, Аутентификация Bearer: accessToken 15 мин + refreshToken 30 дней с ротацией, Идентификаторы создаёт клиент (UUIDv7); повторный POST идемпотентен, иначе 409 conflict, Device { id, name, createdAt, lastSeenAt, current } — устройство (сессия) аккаунта, POST /shares/:id/guest — гостевой токен (без авторизации) для hello в синхронизации, GET /health → { ok: true, version } — служебная проверка сервера, Notebook { id, mode, createdAt, wrappedKey } — ответ /notebooks (+7 more)

### Community 66 - "NotebookDocument"
Cohesion: 0.13
Nodes (8): Блокнот и аккаунт, NotebookDocument, .inbox, .notebookId, NoteMeta, .fields, .isTrashed, IndexDocumentTests

### Community 67 - "04-editor.md (4)"
Cohesion: 0.14
Nodes (14): YOp, ArrayDelete, ArrayInsert, MapDelete, MapSet, RootTextDelete, RootTextInsert, TextDelete (+6 more)

### Community 68 - "Дизайн и организация (2) (2)"
Cohesion: 0.11
Nodes (5): CRDTDocument, .canRedo, .canUndo, .clientId, CRDTDocumentTests

### Community 69 - "0035-strokes-on-deleted-text.md"
Cohesion: 0.18
Nodes (12): Контракт меняет только сессия-координатор; исполнитель присылает предложение, Обводки и стрелки «растягиваются» вместе с текстом; при проблемах — изменение контракта через координатора, D-35. Пометка на удалённом тексте исчезает вместе с ним, Окончательная очистка таких штрихов — при уплотнении истории, Вариант «потерянные пометки» — отклонён: лишний интерфейс, Частичное удаление: штрих «сжимается» до оставшегося текста, Вариант «прилипать к соседнему символу» — отклонён: пометка может оказаться не на том слове, Рукописная пометка исчезает вместе с удалённым текстом (пользователем, агентом, другим устройством) (+4 more)

### Community 70 - "0028-dev-workflow.md"
Cohesion: 0.12
Nodes (20): Записываются только сглаженные coalesced-точки завершённого штриха, без predicted, GitHub Actions CI (incl. macOS iOS builds), Custom iOS Pen Render Layer (Metal or Core Animation), XcodeGen, docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo (+12 more)

### Community 71 - "Процесс разработки (docs/development.md)"
Cohesion: 0.24
Nodes (10): XcodeGen project.yml (D-28), Смешанный режим: облачные сессии (Linux, без Xcode) + Mac пользователя для сборки и iPad, D-19 (код пишет Claude), D-28 (облако + Mac, CI), GitHub Actions on macOS verifies iOS code written in the cloud, Процесс разработки (docs/development.md), Roles: user is product author/owner and checks pen feel on iPad; Claude writes all code and docs, Two environments: cloud Claude Code session (Linux, no Xcode) and user Mac (Apple Silicon, Xcode, iPad with Pencil Pro) (+2 more)

### Community 72 - "0024-product-name.md"
Cohesion: 0.22
Nodes (9): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4.1. Перепривязка якорей (отмена и восстановление версии), 4.2. Когда штрих считается «осиротевшим» и удаляется навсегда, 4. Привязка к тексту (живой штрих), 5. Отрисовка толщины, 6. Тестовые векторы (+1 more)

### Community 73 - "Соглашения"
Cohesion: 0.40
Nodes (5): История, Как вносить изменения, Соглашения, Ссылки на решения, Статусы

### Community 74 - "development.md"
Cohesion: 0.22
Nodes (10): Скрипт tools/graphify_docs.py (prepare → агенты → finish), Stream sessions write changelog fragments in docs/changelog.d/ instead of editing CHANGELOG.md; stream history files docs/history/YYYY-MM-DD-<stream>-NN.md, Graph update after doc edits: graphify_docs.py prepare -> parallel extraction agents -> finish -> graphify export html -> check-update, Extraction prompt .claude/skills/graphify/references/extraction-spec.md, Git: English code/commits, Russian docs, branches + PR, one commit = code + docs + updated graph, Graphify commands (query, explain, path, update, check-update, /graphify --update), graphifyy PyPI package (command graphify), verified on 0.9.95, Graphify install on Mac (brew install uv, uv tool install graphifyy) (+2 more)

### Community 75 - "Контракт: шифрование (v1)"
Cohesion: 0.22
Nodes (9): 3. Apple Pencil в тексте — ключевая фича, Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера, Перекладка текста — вариант А «живой штрих» (D-05, РЕШЕНО) (+1 more)

### Community 77 - "10-sync.md"
Cohesion: 0.21
Nodes (9): Агенты не подключаются по WebSocket — работают через MCP/REST; сервер применяет их правки как обычные обновления, Agent edits applied immediately, highlighted, revertible via history (D-10), 10. Синхронизация и офлайн, Local storage: SQLite via GRDB (iOS), IndexedDB via Dexie (web), Agent notebooks: server decrypts and applies agent edit as a normal update, Each note is a Yjs CRDT doc; edits are small binary updates, Как это работает (обзор), Требования (+1 more)

### Community 78 - "Block"
Cohesion: 0.10
Nodes (20): Модель заметки, Array, .attributes, Block, .blockId, .isKnown, .isTextBlock, .text (+12 more)

### Community 79 - "0038-design-quiet-paper.md"
Cohesion: 0.15
Nodes (14): Ежедневные заметки и «Входящие» (kind daily / inbox) в блокноте settings.dailyNotebookId, Решения по анкетам пользователя: D-32…D-41 и PDF после MVP (D-08), Design references: Things 3, Linear, Craft, Arc, Ориентир Craft: градиентные подложки, документы-карточки с обложками, боковая панель «Вкладки / Избранное / Папки / Теги», стеклянные панели, контекстные меню, D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Вариант «графит по умолчанию» — отклонён: чернила на тёмном читаются хуже, Вариант «чистый нейтральный» (Linear / Things) — не выбран, Тёмная тема — тёплый графит (+6 more)

### Community 81 - "12-craft-features.md"
Cohesion: 0.11
Nodes (23): apps/web — веб-клиент, Stream ios-app (claude/ios-app): apps/ios — XcodeGen project, Craft-style SwiftUI shell, navigation, tasks, calendar, settings, Stream web-app (claude/web-app): apps/web — web shell: login, sidebar, spaces/notebooks/folders, tasks, calendar, sharing, offline, PWA, 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции (+15 more)

### Community 82 - "0034-auth-email-password.md"
Cohesion: 0.20
Nodes (10): Notesnook, Import from Obsidian/Notesnook (later), D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления, Вход по email + паролю; один пароль и для входа, и для шифрования (как в Notesnook), Passkeys — сложно совместить со сквозным шифрованием сейчас; возможно позже, Sign in with Apple — отклонён: всё равно нужен отдельный пароль шифрования, Контекст, Рассмотренные варианты (+2 more)

### Community 84 - "CryptoError"
Cohesion: 0.20
Nodes (9): CryptoError, decryptionFailed, invalidKeyLength, invalidRecoveryKey, kdfFailed, malformedEnvelope, sodiumInit, unsupportedKDF (+1 more)

### Community 85 - "Datascratch — правила для ИИ (CLAUDE.md)"
Cohesion: 0.18
Nodes (9): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, docs/history session log (+1 more)

### Community 86 - "0032-min-ios-version.md"
Cohesion: 0.27
Nodes (9): D-32. Минимальная версия iOS/iPadOS — 26, Минимальная версия iOS/iPadOS 26 (IPHONEOS_DEPLOYMENT_TARGET = 26.0), Liquid Glass — системный дизайн iOS 26, Отклонённые варианты: iOS 18+ (шире охват) и 17.5+ (минимум для Pencil Pro), Последствия, Рассмотренные варианты, Решение, CLOSED: minimum iOS 26+ (D-32); XcodeGen accepted (D-39); Bundle ID (D-33); paid Apple Developer account exists (+1 more)

### Community 87 - "design-tokens.md"
Cohesion: 0.16
Nodes (19): Подложки backdrop.* (sand, dusk, mist, meadow, ember) — мягкие градиенты в духе Craft, Цветовые токены: bg.canvas («бумага»), text.primary («чернила»), accent («синие чернила»), danger/success/warning — светлая и тёмная тема, Ширина колонки документа: normal 720, wide 960, full, Тактильная отдача iOS: selection, success (задача выполнена), warning (удаление), Чернила пера ink.* (black, blue, red, green, purple, brown) и маркеры highlight.*, Движение: пружины motion.snappy / smooth / gentle, длительности duration.* для веба, Сетка отступов 4 pt, радиусы radius.*, тени shadow.card / shadow.popover, Цвета tint.* (.fg / .bg) для папок, тегов и выносок (+11 more)

### Community 90 - "План разработки"
Cohesion: 0.15
Nodes (13): Критерии приёмки, План разработки, Подготовка, Потоки разработки (D-39), Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad) (+5 more)

### Community 91 - "0010-agent-edits.md"
Cohesion: 0.32
Nodes (6): Метка agentEdit (agentId, at) — подсветка правок агента до принятия пользователем, D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение

### Community 92 - "roadmap.md"
Cohesion: 0.07
Nodes (31): apps/ios — iPhone + iPad, iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), Отрисовка после перекладки: якорь → абсолютная позиция (с учётом redone-элементов) → текущий прямоугольник глифа, Guest via Link (web, no account), D-08. Аннотации PDF пером — не в MVP, Аннотации PDF пером (PDFKit + свой слой штрихов) — после MVP, этап расширений, Решение, Решение (предложение) (+23 more)

### Community 93 - "Контракт: шифрование (v1)"
Cohesion: 0.20
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 94 - "0003-platforms.md"
Cohesion: 0.08
Nodes (24): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, D-03. Платформы: нативные iPhone и iPad + полноценный веб, Full-featured web client (TypeScript), Контекст, Последствия, Решение (+16 more)

### Community 96 - "Контракт: REST API сервера (v1)"
Cohesion: 0.22
Nodes (9): Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1), Общее, Служебное, Токены агентов (`spec/09-agents-api.md`) (+1 more)

### Community 97 - "Контракт: протокол синхронизации (v1)"
Cohesion: 0.22
Nodes (9): 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05), 6. Права, 7. Коды ошибок, 8. Тестовые векторы (+1 more)

### Community 98 - "KDFParams"
Cohesion: 0.40
Nodes (4): KDFParams, PasswordChangeMaterial, SignupMaterial, Security

### Community 100 - "Открытые вопросы"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 101 - "Datascratch — правила для ИИ"
Cohesion: 0.29
Nodes (7): Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой, Правила, Среда разработки

### Community 102 - "build-xcframework.sh"
Cohesion: 0.50
Nodes (3): IPHONEOS_DEPLOYMENT_TARGET, MACOSX_DEPLOYMENT_TARGET, build-xcframework.sh script

### Community 103 - "Обзор архитектуры"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 104 - "Модель данных — ЧЕРНОВИК"
Cohesion: 0.40
Nodes (5): Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3), Штрих (черновик для прототипа)

### Community 105 - "7. Шифрование и доступ агентов"
Cohesion: 0.29
Nodes (7): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Вход и восстановление доступа (D-34), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 106 - "D-23. Документация — источник истины; Graphify — граф знаний поверх неё"
Cohesion: 0.50
Nodes (4): D-23. Документация — источник истины; Graphify — граф знаний поверх неё, Контекст, Последствия, Решение

### Community 107 - "D-39. Разработка параллельными сессиями; Claude сам вливает в main"
Cohesion: 0.50
Nodes (4): D-39. Разработка параллельными сессиями; Claude сам вливает в main, Контекст, Последствия, Решение

### Community 110 - "Процесс разработки"
Cohesion: 0.33
Nodes (6): Git, Две среды, Конец сессии, Кто что делает, Правила для сессий-исполнителей (D-39), Процесс разработки

## Knowledge Gaps
- **269 isolated node(s):** `PackageDescription`, `YrsFFI`, `account`, `notebook`, `note` (+264 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 731 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Контракт: модель документа (v1)` connect `CRDTTransaction` to `Контракт: модель документа (v1)`?**
  _High betweenness centrality (0.340) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `NoteDocument` (e.g. with `.snapshotIfNeeded()` and `.strokesRoundTripAndResolveAnchors()`) actually correct?**
  _`NoteDocument` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PackageDescription`, `YrsFFI`, `account` to the rest of the system?**
  _269 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `0039-parallel-sessions.md` be split into smaller, more focused modules?**
  _Cohesion score 0.1168091168091168 - nodes in this community are weakly interconnected._
- **Why does `DocKind` connect `LocalStore` to `Stroke`, `Дизайн и организация (2) (2)`, `CRDTTransaction`, `APIClient`, `Sendable`, `D-41. Набор функций по мотивам Craft`, `.open`?**
  _High betweenness centrality (0.246) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `APIClient` (e.g. with `.loginRefreshesOnExpiryAnd401()` and `.registerDocSendsExplicitNull()`) actually correct?**
  _`APIClient` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `String` be split into smaller, more focused modules?**
  _Cohesion score 0.08536585365853659 - nodes in this community are weakly interconnected._