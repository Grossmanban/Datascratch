# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 139 files · ~67,126 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 6, .resolved 1)

## Summary
- 2612 nodes · 6368 edges · 123 communities (110 shown, 13 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 873 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8dd5dfc3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Block
- SyncClient
- NotebookDocument
- NoteDocument
- R-10 Agent Notebooks Readable if Server Breached
- LocalStore
- CHANGELOG.md
- Stroke
- APIClient
- YrsError
- Coordinator session (merges branches into main, owns roadmap.md, CHANGELOG.md and contracts)
- decisions/README.md
- 02-platforms.md
- TransactionOrigin
- lib.rs
- NotebookDocument (2)
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
- APIClient (2)
- String
- open-questions.md (2)
- String
- LocalStore (2)
- Data
- 08-sharing.md
- 0004-encryption-and-api.md
- CodingKeys
- yjs_compat.rs
- Монорепозиторий и CLAUDE.md (2)
- api.md
- tests.rs
- development.md
- 09-agents-api.md
- 04-editor.md (2)
- roadmap.md
- 12-craft-features.md
- Контракт: модель документа (v1)
- DSCrypto
- 0025-no-redis.md
- 0036-space-notebook-folder.md
- APIClient (3)
- strokes.md
- Data
- ServerMessage
- sync-protocol.md
- 10-sync.md
- .iso
- CRDTTransaction
- D-29. Graphify: порядок работы, чтобы граф был всегда актуален
- D-01. Хранение заметок — в базе данных на своём сервере, не в файлах
- Открытые вопросы
- package.json
- compilerOptions
- Foundation (2)
- .mapValue
- graphify_docs.py
- .json
- 04-editor.md (4)
- glossary.md
- CryptoError
- TaskState
- Foundation (3)
- 0035-strokes-on-deleted-text.md
- План разработки
- DeepHandler
- Datascratch — правила для ИИ (CLAUDE.md)
- FakeRESTServer
- Снимки и уплотнение: > 500 обновлений или > 1 MiB → снимок; удаление seq ≤ baseSeq, кроме нужных истории (R-05)
- 03-pencil.md (2)
- AccountService
- Процесс разработки (docs/development.md)
- tasks
- contracts/README.md
- 0038-design-quiet-paper.md
- 0024-product-name.md (2)
- Контракт: протокол синхронизации (v1)
- Контракт: шифрование (v1)
- SyncErrorCode
- libsodium on all platforms (swift-sodium on iOS, libsodium-wrappers in TS)
- D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления
- stack.md
- Контракт: шифрование (v1)
- APIError
- Foundation (4)
- Обзор архитектуры
- 7. Шифрование и доступ агентов
- 0011-handwriting-for-agents.md
- Процесс разработки
- StrokePoint
- design-tokens.md (2)
- 4. Документ `note`
- Контракт: REST API сервера (v1)
- Hint
- 0010-agent-edits.md
- 5. Организация заметок и дизайн
- 08-sharing.md (2)
- build-xcframework.sh
- 0039-parallel-sessions.md
- 1. Концепция продукта
- build-linux.sh
- generate-bindings.sh
- pnpm-workspace.yaml
- Модель данных — ЧЕРНОВИК
- Соглашения
- 11. Нефункциональные требования
- 2. Платформы
- Контракт: модель документа (v1)
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
- `1. Три вида документов Yjs` --references--> `DocKind`  [INFERRED]
  docs/architecture/contracts/document-model.md → apps/ios/Packages/DSCore/Sources/DSCore/CRDT/CRDTDocument.swift
- `4.4. `comments`` --references--> `Comment`  [INFERRED]
  docs/architecture/contracts/document-model.md → apps/ios/Packages/DSCore/Sources/DSCore/Model/NoteDocument.swift
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

## Communities (123 total, 13 thin omitted)

### Community 0 - "Block"
Cohesion: 0.07
Nodes (22): Array, .attributes, Block, .blockId, .isKnown, .isTextBlock, .text, .xml (+14 more)

### Community 1 - "SyncClient"
Cohesion: 0.07
Nodes (19): URLSession, Configuration, SyncClient, SyncClientDelegate, SyncClientError, closed, notConnected, server (+11 more)

### Community 2 - "NotebookDocument"
Cohesion: 0.13
Nodes (21): Kind, folder, note, notebook, MapRecord, NotebookMode, agent, `private` (+13 more)

### Community 3 - "NoteDocument"
Cohesion: 0.10
Nodes (8): InlineLocation, NoteDocument, .isReadOnly, .noteId, RunPiece, node, text, NoteDocumentTests

### Community 4 - "R-10 Agent Notebooks Readable if Server Breached"
Cohesion: 0.29
Nodes (9): Журнал действий агента GET /agent-tokens/:id/audit, serverKey — 32 байта из DS_KMS_KEY (окружение сервера, не в базе), agent_tokens / agent_audit_log Tables, Agent Edit Flow (agent notebook), edit_note MCP Tool, Key Store (agent notebooks), Notebook for Agents, Row-Level Security (RLS) (+1 more)

### Community 5 - "LocalStore"
Cohesion: 0.09
Nodes (14): DocKind, account, note, notebook, .roots, DocumentRecord, Kind, push (+6 more)

### Community 6 - "CHANGELOG.md"
Cohesion: 0.09
Nodes (32): 2026-10-25, 2026-10-25 (вторая половина дня), Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел), Каркас монорепозитория (pnpm + Turborepo), девять потоков разработки, правила сессий-исполнителей, changelog.d, Создан CLAUDE.md и скелет монорепозитория (apps/, packages/, infra/) (+24 more)

### Community 7 - "Stroke"
Cohesion: 0.13
Nodes (17): AnchorKind, block, drawing, image, text, Author, .value, Kind (+9 more)

### Community 8 - "APIClient"
Cohesion: 0.09
Nodes (5): APIClient, .currentSession, .isSignedIn, AuthSession, normalizeEmail()

### Community 9 - "YrsError"
Cohesion: 0.07
Nodes (18): check_text_range(), decoding(), diff_update(), is_inside(), merge_updates(), mismatch(), missing_map(), nested_map() (+10 more)

### Community 10 - "Coordinator session (merges branches into main, owns roadmap.md, CHANGELOG.md and contracts)"
Cohesion: 0.11
Nodes (17): apps/ios — iPhone + iPad, iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), apps/web — веб-клиент, Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), Coordinator session (merges branches into main, owns roadmap.md, CHANGELOG.md and contracts), Stream core (claude/core): packages/shared, packages/test-vectors, root configs — contract types, crypto, stroke codec, document schema, sync client, test vectors, Stream ios-app (claude/ios-app): apps/ios — XcodeGen project, Craft-style SwiftUI shell, navigation, tasks, calendar, settings, Stream web-app (claude/web-app): apps/web — web shell: login, sidebar, spaces/notebooks/folders, tasks, calendar, sharing, offline, PWA (+9 more)

### Community 11 - "decisions/README.md"
Cohesion: 0.07
Nodes (39): Automerge (fallback CRDT), Yrs (Rust Yjs) with Swift Wrapper, D-19. Весь код пишет Claude, Последствия, Решение, Canvas + Pointer Events, Custom pen renderer (Metal vs Core Animation TBD), Dexie (IndexedDB) (+31 more)

### Community 12 - "02-platforms.md"
Cohesion: 0.08
Nodes (27): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, D-03. Платформы: нативные iPhone и iPad + полноценный веб, Full-featured web client (TypeScript), Контекст, Последствия, Решение (+19 more)

### Community 13 - "TransactionOrigin"
Cohesion: 0.09
Nodes (17): TransactionOrigin, .description, .isOutgoing, local, other, remote, storage, system (+9 more)

### Community 14 - "lib.rs"
Cohesion: 0.07
Nodes (17): DeepObserver, UpdateObserver, ORIGIN_LOCAL, origin_name(), ORIGIN_UNDO, RootDef, RootKind, Array (+9 more)

### Community 15 - "NotebookDocument (2)"
Cohesion: 0.12
Nodes (10): NotebookDocument, .inbox, .notebookId, Folder, .fields, NoteMeta, .fields, .isTrashed (+2 more)

### Community 16 - "design-tokens.md"
Cohesion: 0.14
Nodes (22): Подложки backdrop.* (sand, dusk, mist, meadow, ember) — мягкие градиенты в духе Craft, Цветовые токены: bg.canvas («бумага»), text.primary («чернила»), accent («синие чернила»), danger/success/warning — светлая и тёмная тема, Ширина колонки документа: normal 720, wide 960, full, Тактильная отдача iOS: selection, success (задача выполнена), warning (удаление), Чернила пера ink.* (black, blue, red, green, purple, brown) и маркеры highlight.*, Движение: пружины motion.snappy / smooth / gentle, длительности duration.* для веба, Сетка отступов 4 pt, радиусы radius.*, тени shadow.card / shadow.popover, Цвета tint.* (.fg / .bg) для папок, тегов и выносок (+14 more)

### Community 17 - "SyncEngine"
Cohesion: 0.09
Nodes (5): CRDTSubscription, .isConnected, OpenDoc, SyncEngine, SyncStatus

### Community 18 - "SecretStore"
Cohesion: 0.17
Nodes (5): InMemorySecretStore, KeychainSecretStore, SecretStore, SecretStoreError, keychain

### Community 19 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.08
Nodes (29): ArrayDelta, Delete, Insert, Retain, convert(), path(), sorted_keys(), text_delta() (+21 more)

### Community 20 - "crypto.md"
Cohesion: 0.14
Nodes (20): Вложения шифруются кусками по 1 MiB, каждый — отдельный конверт, Иерархия ключей: пароль → passwordKey → masterKey → notebookKey → noteKey, loginKey = BLAKE2b(authSeed, "ds1|login"); сервер хранит Argon2id(loginKey), masterKey — 32 случайных байта, создаётся при регистрации, шифрует account-документ, noteKey — ключ заметки: шифрует note-документ и вложения, notebookKey — случайный ключ блокнота, шифрует notebook-документ, Смена пароля перешифровывает только обёртку masterKey, Вывод ключей из пароля: Argon2id13 (ops 3, mem 64 MiB, выход 64 байта), NFKC, соль 16 байт (+12 more)

### Community 21 - "stack.md"
Cohesion: 0.06
Nodes (61): Записываются только сглаженные coalesced-точки завершённого штриха, без predicted, doc_updates Table (encrypted Yjs updates), Server PostgreSQL Schema (Stage 3 Draft), Accounts, OAuth, Tokens Service, External AI Agents, File Storage (disk or external S3), Guest via Link (web, no account), Handwriting-to-PNG Render (pg-boss queue) (+53 more)

### Community 22 - "Sendable"
Cohesion: 0.17
Nodes (27): Comment, AgentPermission, read, readWrite, AgentToken, APIErrorBody, AttachmentStatus, CreatedAgentToken (+19 more)

### Community 23 - "Процесс разработки и Graphify (2)"
Cohesion: 0.12
Nodes (19): chunk(), map_to_attrs(), value_to_any(), Container, container(), Element, Fragment, element() (+11 more)

### Community 24 - "CRDTDocument"
Cohesion: 0.12
Nodes (4): CRDTDocument, .canRedo, .canUndo, .clientId

### Community 25 - "06-data-server.md"
Cohesion: 0.06
Nodes (32): apps/server — сервер, Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), awareness — курсоры и присутствие: зашифровано, не хранится, только рассылается, Решения по анкетам пользователя: D-32…D-41 и PDF после MVP (D-08), Own server storage, D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия (+24 more)

### Community 26 - "Контракт: модель документа (v1) (2)"
Cohesion: 0.06
Nodes (35): concurrency, cancel-in-progress, group, defaults, run, name, runs-on, steps (+27 more)

### Community 27 - "generate.mjs"
Cohesion: 0.07
Nodes (28): b64(), content, doc, firstRun, fixture, json, para, rel() (+20 more)

### Community 28 - "04-editor.md"
Cohesion: 0.10
Nodes (12): AttachmentRecord, .missingChunks, .uploaded, LocalStore, SearchHit, State, pendingUpload, remote (+4 more)

### Community 29 - "APIClient (2)"
Cohesion: 0.13
Nodes (6): HTTPTransport, SecretSessionStore, SessionStore, Locked, APIClientTests, StubTransport

### Community 30 - "String"
Cohesion: 0.16
Nodes (8): CryptoAD, KDFParams, PasswordKeys, RecoveryKeyFormat, PasswordChangeMaterial, SignupMaterial, Clibsodium, Security

### Community 31 - "open-questions.md (2)"
Cohesion: 0.09
Nodes (13): XmlNode, .attributes, .children, .elementName, .textContent, YValue, .boolValue, .dataValue (+5 more)

### Community 32 - "String"
Cohesion: 0.15
Nodes (10): .entries, Backdrop, .yValue, Cover, .value, Kind, color, gradient (+2 more)

### Community 33 - "LocalStore (2)"
Cohesion: 0.11
Nodes (27): AccountService, APIClient (REST), AttachmentManager, Block / Inline / Mark, CRDTDocument, DSCore, DSCrypto / KeyRing / KeychainSecretStore, NotebookDocument / AccountDocument (+19 more)

### Community 34 - "Data"
Cohesion: 0.22
Nodes (6): .jsonObject, .fields, ShareLink, .url, Base64URL, ShareLinkTests

### Community 35 - "08-sharing.md"
Cohesion: 0.08
Nodes (34): POST /docs — регистрация документа (account / notebook / note) до первого push, Share { id, target { kind, id }, permission, expiresAt, createdAt } — ссылка шеринга, Шеринг: /shares (view/edit, бессрочно по умолчанию, отзыв сразу отключает гостей), Права: user — документы своего аккаунта; guest — только документы шеринга, push только с правом edit, D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account, Universal Links (paid Apple Developer account), Последствия (+26 more)

### Community 36 - "0004-encryption-and-api.md"
Cohesion: 0.13
Nodes (20): PATCH /notebooks/:id/mode — включение режима «для агентов» передаёт notebookKey, выключение удаляет серверную обёртку, Режим «для агентов»: клиент передаёт notebookKey по TLS, сервер оборачивает его serverKey; расшифровка только при запросе агента с токеном, blockId (UUIDv7) у каждого блочного узла — для точечных правок агентов, заметок на полях и комментариев, NotebookRef { id, spaceId, name, mode: private | agent, … } — ключ блокнота здесь не хранится, D-04. Одновременно сквозное шифрование и доступ по API, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), Контекст (+12 more)

### Community 37 - "CodingKeys"
Cohesion: 0.07
Nodes (27): CodingKeys, accessToken, baseSeq, client, clientMsgId, code, deviceId, docId (+19 more)

### Community 38 - "yjs_compat.rs"
Cohesion: 0.19
Nodes (12): b64(), el(), empty(), fixture(), normalize(), reads_yjs_document(), roots(), s() (+4 more)

### Community 39 - "Монорепозиторий и CLAUDE.md (2)"
Cohesion: 0.09
Nodes (15): value_to_in(), YValue, BigInt, Bool, Bytes, List, Null, Number (+7 more)

### Community 40 - "api.md"
Cohesion: 0.15
Nodes (16): Аккаунт и устройства: /me, /devices (отзыв сессий), удаление аккаунта, Контракт agents-api.md (MCP и REST для самих агентов) — появится на этапе агентов, Эндпоинты /auth: prelogin, signup, login, refresh, logout, recovery, password, Аутентификация Bearer: accessToken 15 мин + refreshToken 30 дней с ротацией, Идентификаторы создаёт клиент (UUIDv7); повторный POST идемпотентен, иначе 409 conflict, Device { id, name, createdAt, lastSeenAt, current } — устройство (сессия) аккаунта, POST /shares/:id/guest — гостевой токен (без авторизации) для hello в синхронизации, GET /health → { ok: true, version } — служебная проверка сервера (+8 more)

### Community 41 - "tests.rs"
Cohesion: 0.19
Nodes (17): arrays_and_errors(), Collect, local(), merge_and_diff_updates(), nested_maps_merge_per_field(), note_roots(), observers_report_paths_deltas_and_origins(), paragraph() (+9 more)

### Community 42 - "development.md"
Cohesion: 0.14
Nodes (17): Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой, Правила, Среда разработки, Скрипт tools/graphify_docs.py (prepare → агенты → finish) (+9 more)

### Community 43 - "09-agents-api.md"
Cohesion: 0.15
Nodes (16): AgentToken { id, name, notebookIds, permission, expiresAt, createdAt, lastUsedAt } — без секрета, Токены агентов /agent-tokens: блокноты, read / read_write, срок; токен показывается один раз, pg-boss background job queue on PostgreSQL, PostgreSQL via Drizzle (D-30): accounts, notebooks, rights, tokens, encrypted updates, snapshots, agent log, 9. API и внешние ИИ-агенты, Log of all agent actions, MCP tools sketch (list_spaces, list_notebooks, search_notes, read_note, get_handwriting_image, create_note, edit_note, add_comment, get_backlinks), Request rate limits (+8 more)

### Community 44 - "04-editor.md (2)"
Cohesion: 0.11
Nodes (20): Схема блоков: doc = title block+ (paragraph, heading, списки, taskList, callout, codeBlock, mathBlock, mermaid, table, image, file, drawing, pageCard), Производные данные строятся локально: индекс задач, полнотекстовый поиск, бэклинки, теги, Inline-узлы noteLink ([[ ]]) и tag (без #, вложенность через /), taskItem: taskId, state open / done / cancelled, scheduled, deadline, completedAt, Markdown files option (rejected), Obsidian, Obsidian (reference product: links, backlinks, tags, Markdown export), 4. Редактор (+12 more)

### Community 45 - "roadmap.md"
Cohesion: 0.05
Nodes (45): Отрисовка после перекладки: якорь → абсолютная позиция (с учётом redone-элементов) → текущий прямоугольник глифа, Привязка к тексту: каждая точка → ближайший символ строки (живой штрих), Custom iOS Pen Render Layer (Metal or Core Animation), TextKit 2 (UIKit editor), Canvas + Pointer Events Pen Layer, D-05. Перо при перекладке текста — вариант А «живой штрих», PencilKit (rejected), Гипотеза реализации (+37 more)

### Community 46 - "12-craft-features.md"
Cohesion: 0.09
Nodes (26): Ежедневные заметки и «Входящие» (kind daily / inbox) в блокноте settings.dailyNotebookId, D-41. Набор функций по мотивам Craft, Контекст, Решение, OPEN (before stage 2): Craft features MVP / post-MVP split (D-41, proposed), Stage 2: MVP on iPad and iPhone, local (editor, handwriting, links, tags, organization, search, design system), 12.1. Задачи, 12.2. Ежедневные заметки и календарь (+18 more)

### Community 47 - "Контракт: модель документа (v1)"
Cohesion: 0.16
Nodes (21): y-prosemirror не записывает атрибуты узлов со значением null: отсутствующий атрибут = null (значение по умолчанию схемы), Документ account: spaces, notebooks, settings, starred, tabs (ключ — masterKey), Comment { blockId, anchor (относительные позиции), author user | guest | agent, text, resolvedAt }, Даты ISO 8601 в UTC; «только дата» YYYY-MM-DD; миллисекунды — только в штрихах, Векторы совместимости модели документа packages/test-vectors/document/* (iOS/Yrs обязан читать и писать формат y-prosemirror), Вставка текста в Y.XmlText без явных атрибутов наследует форматирование слева (Yjs/Yrs) — писатели всегда передают явный набор атрибутов, Folder { parentId, name, icon, color, order } — вложенность без ограничения глубины, Значение метки — объект атрибутов ({ bold: {} }, { link: { href, … } }); читатели принимают {} и true и ключи <имя>--<хэш> (+13 more)

### Community 49 - "0025-no-redis.md"
Cohesion: 0.07
Nodes (39): MinIO (rejected), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, Убран Redis (D-25): один процесс сервера, очередь — pg-boss на PostgreSQL, Drizzle ORM, GRDB (SQLite), MCP TypeScript SDK, OAuth 2.1, pg-boss job queue (+31 more)

### Community 50 - "0036-space-notebook-folder.md"
Cohesion: 0.14
Nodes (17): Space { id, name, icon, color, order, createdAt } в account-документе, Organization Hierarchy (Account > Space > Notebook > Folder > Note), Проекты, личное, работа, учёба не смешиваются; минимум кнопок на экране, D-14. Организация: богатая, но не перегруженная, Предложенная структура: пространства → вложенные папки; поперёк — вложенные и умные теги, цвета, избранное, недавние, Решение, Поперёк структуры — теги, умные теги, избранное, недавние, D-36. Структура: пространство → блокноты → папки (+9 more)

### Community 51 - "APIClient (3)"
Cohesion: 0.16
Nodes (3): AttachmentManager, LocalStore, AccountServiceTests

### Community 52 - "strokes.md"
Cohesion: 0.14
Nodes (21): История версий: GET /docs/:id/versions и /versions/:seq (зашифрованные снимки), Блок drawing (высота в pt; штрихи — в strokes), anchorKind: text | block (заметка на полях) | image | drawing, Перепривязка якорей после отмены/повтора: в той же транзакции якорь удалённого символа с redone-элементом переписывается на относительную позицию нового элемента, Координаты block / image / drawing — в долях ширины блока, Правило D-35 в отрисовке: точки удалённых символов не рисуются, штрих остаётся в документе; отмена возвращает пометку, Координаты text-штриха: смещение от начала глифа якорного символа в em, Штрих почти неизменяем после рисования; ластик удаляет штрих целиком или заменяет кусками (+13 more)

### Community 53 - "Data"
Cohesion: 0.19
Nodes (5): CRDTUpdates, KeyRing, KeyRingDocumentKeys, Data, .hexString

### Community 54 - "ServerMessage"
Cohesion: 0.08
Nodes (27): ClientInfo, ClientMessage, awareness, hello, push, snapshot, subscribe, unsubscribe (+19 more)

### Community 55 - "sync-protocol.md"
Cohesion: 0.20
Nodes (18): Формат ошибок { error: { code, message } } и коды bad_request…internal, ack — обновление или снимок принят и сохранён (docId, clientMsgId, seq), Коды ошибок синхронизации: unauthorized, forbidden, doc_not_found, payload_too_large (2 MiB / 50 MiB), rate_limited, protocol_mismatch, internal, error — сообщение сервера: code, message, ref? (clientMsgId / docId), Клиент хранит lastSeq по каждому документу и догоняет недостающее при подключении, Сервер не присылает клиенту его собственные обновления (кроме updates при догоняющей подписке с другого устройства), Офлайн: обновления копятся в локальной очереди до подтверждения ack, Лимиты payload_too_large: обновление 2 MiB, снимок 50 MiB — считаются декодированные байты, не base64 (+10 more)

### Community 56 - "10-sync.md"
Cohesion: 0.21
Nodes (9): Агенты не подключаются по WebSocket — работают через MCP/REST; сервер применяет их правки как обычные обновления, Agent edits applied immediately, highlighted, revertible via history (D-10), 10. Синхронизация и офлайн, Local storage: SQLite via GRDB (iOS), IndexedDB via Dexie (web), Agent notebooks: server decrypts and applies agent edit as a normal update, Each note is a Yjs CRDT doc; edits are small binary updates, Как это работает (обзор), Требования (+1 more)

### Community 57 - ".iso"
Cohesion: 0.13
Nodes (4): .accessExpiry, DSDate, EntityID, UtilTests

### Community 59 - "D-29. Graphify: порядок работы, чтобы граф был всегда актуален"
Cohesion: 0.16
Nodes (13): Стартовый хук Claude Code (.claude/hooks/session-start.sh), D-23 (документация), D-29. Graphify: порядок работы, чтобы граф был всегда актуален, git-хук Graphify (пересборка только по изменённому коду), Graphify 0.9.95 (пакет graphifyy), R-09 (риск: Graphify сломается или исчезнет), Смысловой слой графа (понятия, решения, связи — проход ИИ), Структурный слой графа (код, файлы, заголовки — без ИИ) (+5 more)

### Community 60 - "D-01. Хранение заметок — в базе данных на своём сервере, не в файлах"
Cohesion: 0.40
Nodes (5): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Контекст, Последствия, Рассмотренные варианты, Решение

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
Cohesion: 0.19
Nodes (8): CRDTDocumentTests, StrokeMaintenanceTests, VersionRestoreTests, DSCore, Foundation, FoundationNetworking, PackageDescription, Testing

### Community 65 - ".mapValue"
Cohesion: 0.15
Nodes (7): .formatVersion, .formatVersion, DocumentError, notFound, readOnly, .formatVersion, NoteMetaContent

### Community 66 - "graphify_docs.py"
Cohesion: 0.28
Nodes (7): Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 67 - ".json"
Cohesion: 0.20
Nodes (8): BadValue, CryptoVectorTests, DocumentVectorTests, jsonEqual(), sortedMarks(), SyncVectorTests, Vectors, .available

### Community 68 - "04-editor.md (4)"
Cohesion: 0.14
Nodes (14): YOp, ArrayDelete, ArrayInsert, MapDelete, MapSet, RootTextDelete, RootTextInsert, TextDelete (+6 more)

### Community 69 - "glossary.md"
Cohesion: 0.24
Nodes (9): meta.formatVersion = 1; документ новее клиента открывается только для чтения (R-03), Версионирование контрактов v1, v2…; ломающее изменение — новая версия с явной миграцией, Поля штриха: v, tool, color, width, opacity, anchorKind, blockId, anchors, points, hint, author, createdAt, Anchor (textRange / paragraph / drawingBlock / image), Note, Stroke, StrokePoint, RelativePosition (CRDT) (+1 more)

### Community 70 - "CryptoError"
Cohesion: 0.20
Nodes (9): CryptoError, decryptionFailed, invalidKeyLength, invalidRecoveryKey, kdfFailed, malformedEnvelope, sodiumInit, unsupportedKDF (+1 more)

### Community 71 - "TaskState"
Cohesion: 0.46
Nodes (3): NoteDerivedData, NoteLinkEntry, TaskEntry

### Community 72 - "Foundation (3)"
Cohesion: 0.14
Nodes (6): Conn, eventually(), FakeFactory, FakeSyncServer, Stored, SyncTests

### Community 73 - "0035-strokes-on-deleted-text.md"
Cohesion: 0.18
Nodes (12): Контракт меняет только сессия-координатор; исполнитель присылает предложение, Обводки и стрелки «растягиваются» вместе с текстом; при проблемах — изменение контракта через координатора, D-35. Пометка на удалённом тексте исчезает вместе с ним, Окончательная очистка таких штрихов — при уплотнении истории, Вариант «потерянные пометки» — отклонён: лишний интерфейс, Частичное удаление: штрих «сжимается» до оставшегося текста, Вариант «прилипать к соседнему символу» — отклонён: пометка может оказаться не на том слове, Рукописная пометка исчезает вместе с удалённым текстом (пользователем, агентом, другим устройством) (+4 more)

### Community 74 - "План разработки"
Cohesion: 0.15
Nodes (13): Критерии приёмки, План разработки, Подготовка, Потоки разработки (D-39), Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad) (+5 more)

### Community 76 - "Datascratch — правила для ИИ (CLAUDE.md)"
Cohesion: 0.18
Nodes (9): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, docs/history session log (+1 more)

### Community 78 - "Снимки и уплотнение: > 500 обновлений или > 1 MiB → снимок; удаление seq ≤ baseSeq, кроме нужных истории (R-05)"
Cohesion: 0.31
Nodes (9): Осиротевшие штрихи (все якоря удалены, orphanedAt или createdAt старше 30 дней) окончательно удаляются клиентом при уплотнении истории, Снимки и уплотнение: > 500 обновлений или > 1 MiB → снимок; удаление seq ≤ baseSeq, кроме нужных истории (R-05), doc_snapshots Table (compacted snapshots, version history), Encrypted history compaction by clients (R-05, stage 3), Snapshot, OPEN (before stage 3): Yjs history compaction under encryption — snapshot scheme (R-05), R-05 Edit History Growth, Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps (+1 more)

### Community 79 - "03-pencil.md (2)"
Cohesion: 0.27
Nodes (10): ADR file number equals decision number (D-05 -> 0005-*.md), template 0000-template.md, Нумерация решений D-NN и файлы decisions/00NN-*.md, Документация Datascratch — единственный источник истины, history/ — архив, не источник истины; исключена из графа (.graphifyignore), Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Правило замены: решение РЕШЕНО не переписывается, ADR получает статус «ЗАМЕНЕНО решением D-NN», Оглавление docs/ (spec, contracts, architecture, decisions, roadmap, risks…), Документация Datascratch (+2 more)

### Community 80 - "AccountService"
Cohesion: 0.23
Nodes (5): AccountError, missingKey, notSignedIn, AccountService, SignupResult

### Community 81 - "Процесс разработки (docs/development.md)"
Cohesion: 0.24
Nodes (10): XcodeGen project.yml (D-28), Смешанный режим: облачные сессии (Linux, без Xcode) + Mac пользователя для сборки и iPad, D-19 (код пишет Claude), D-28 (облако + Mac, CI), GitHub Actions on macOS verifies iOS code written in the cloud, Процесс разработки (docs/development.md), Roles: user is product author/owner and checks pen feel on iPad; Claude writes all code and docs, Two environments: cloud Claude Code session (Linux, no Xcode) and user Mac (Apple Silicon, Xcode, iPad with Pencil Pro) (+2 more)

### Community 82 - "tasks"
Cohesion: 0.18
Nodes (10): dependsOn, outputs, $schema, tasks, build, lint, test, typecheck (+2 more)

### Community 83 - "contracts/README.md"
Cohesion: 0.22
Nodes (9): Тестовые векторы crypto: KDF, конверты, Base32 ключа восстановления, куски вложений (Swift и TS), Контракт — точное описание формата/протокола, который реализуют несколько частей (iOS на Swift, веб и сервер на TS), Совместимость доказывается общими тестовыми векторами (packages/test-vectors), Типы TypeScript контрактов в packages/shared/src/contracts/ — часть контракта, Контракты между частями системы, Правила изменения, Тестовые векторы strokes: упаковка точек, разрешение якорей после правок, правило D-35, Тестовые векторы sync: примеры всех сообщений в JSON (схема проверяется в TS и Swift) (+1 more)

### Community 84 - "0038-design-quiet-paper.md"
Cohesion: 0.15
Nodes (14): Radix + Tailwind + Motion Design System, SwiftUI, D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Вариант «графит по умолчанию» — отклонён: чернила на тёмном читаются хуже, Вариант «чистый нейтральный» (Linear / Things) — не выбран, Тёмная тема — тёплый графит, Рассмотренные варианты, Решение (+6 more)

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

### Community 89 - "libsodium on all platforms (swift-sodium on iOS, libsodium-wrappers in TS)"
Cohesion: 0.25
Nodes (9): Вложения: загрузка и докачка по кускам (/attachments/:id/chunks/:index), лимит 200 МБ, Ассоциированные данные ds1|… привязывают шифротекст к месту (doc, awareness, ключи, куски вложений), Конверт шифротекста: версия 0x01 + nonce 24 байта + XChaCha20-Poly1305-IETF (тег 16 байт), libsodium на всех платформах (libsodium-wrappers-sumo в TS, swift-sodium в iOS), Attachments as separate encrypted files, on-demand resumable download, Argon2id password key derivation, libsodium on all platforms (swift-sodium on iOS, libsodium-wrappers in TS), XChaCha20-Poly1305 content encryption (+1 more)

### Community 90 - "D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления"
Cohesion: 0.50
Nodes (4): D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления, Контекст, Рассмотренные варианты, Решение

### Community 91 - "stack.md"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 92 - "Контракт: шифрование (v1)"
Cohesion: 0.20
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 93 - "APIError"
Cohesion: 0.29
Nodes (6): APIError, .code, invalidResponse, notAuthenticated, server, transport

### Community 95 - "Обзор архитектуры"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 96 - "7. Шифрование и доступ агентов"
Cohesion: 0.29
Nodes (7): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Вход и восстановление доступа (D-34), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 97 - "0011-handwriting-for-agents.md"
Cohesion: 0.22
Nodes (6): hint — распознанная форма (underline, strike, circle, highlight, arrow, scribble) для агентов и экспорта, D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Export: Markdown, PDF, HTML (handwriting as images), Server responsibilities: accounts, encrypted relay, attachments, realtime, API/MCP, handwriting PNG render, Handwriting rendered to PNG for agents with text annotation (D-11)

### Community 98 - "Процесс разработки"
Cohesion: 0.33
Nodes (6): Git, Две среды, Конец сессии, Кто что делает, Правила для сессий-исполнителей (D-39), Процесс разработки

### Community 99 - "StrokePoint"
Cohesion: 0.15
Nodes (9): ResolvedStrokeSegment, .fields, StrokeCodec, StrokeCodecError, invalidLength, StrokeMetrics, StrokePoint, StrokeCodecTests (+1 more)

### Community 100 - "design-tokens.md (2)"
Cohesion: 0.40
Nodes (5): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 101 - "4. Документ `note`"
Cohesion: 0.40
Nodes (5): 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note`

### Community 102 - "Контракт: REST API сервера (v1)"
Cohesion: 0.22
Nodes (9): Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1), Общее, Служебное, Токены агентов (`spec/09-agents-api.md`) (+1 more)

### Community 103 - "Hint"
Cohesion: 0.25
Nodes (8): Hint, arrow, circle, free, highlight, scribble, strike, underline

### Community 104 - "0010-agent-edits.md"
Cohesion: 0.32
Nodes (6): Метка agentEdit (agentId, at) — подсветка правок агента до принятия пользователем, D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение

### Community 105 - "5. Организация заметок и дизайн"
Cohesion: 0.40
Nodes (5): 5. Организация заметок и дизайн, Дизайн (D-15 — РЕШЕНО, главный принцип продукта), Организация (D-14 — РЕШЕНО по сути; структура ниже — ПРЕДЛОЖЕНО), Принципы, Реализация

### Community 106 - "08-sharing.md (2)"
Cohesion: 0.40
Nodes (5): 8. Совместная работа и шеринг, Гости (D-37), Открыто (см. `open-questions.md`), Реализация, Требования

### Community 108 - "build-xcframework.sh"
Cohesion: 0.50
Nodes (3): IPHONEOS_DEPLOYMENT_TARGET, MACOSX_DEPLOYMENT_TARGET, build-xcframework.sh script

### Community 109 - "0039-parallel-sessions.md"
Cohesion: 0.09
Nodes (25): GitHub Actions CI (incl. macOS iOS builds), XcodeGen, docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, Последствия: ошибки сборки видны с задержкой CI; ощущение пера проверяет только пользователь на iPad (Pencil Pro), D-28. Процесс разработки: облако + Mac, сборка iOS в CI (+17 more)

### Community 110 - "1. Концепция продукта"
Cohesion: 0.33
Nodes (6): 1. Концепция продукта, Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения, Суть в одном абзаце

### Community 116 - "Модель данных — ЧЕРНОВИК"
Cohesion: 0.40
Nodes (5): Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3), Штрих (черновик для прототипа)

### Community 117 - "Соглашения"
Cohesion: 0.40
Nodes (5): История, Как вносить изменения, Соглашения, Ссылки на решения, Статусы

### Community 118 - "11. Нефункциональные требования"
Cohesion: 0.40
Nodes (5): 11. Нефункциональные требования, Доступность, Надёжность, Ресурсы сервера, Языки

### Community 120 - "2. Платформы"
Cohesion: 0.40
Nodes (5): 2. Платформы, Минимальная версия iOS/iPadOS — 26 (D-32), Минимальная версия iOS/iPadOS — ОТКРЫТО, Тестовые устройства (известно на 2026-10-25), Требования

### Community 121 - "Контракт: модель документа (v1)"
Cohesion: 0.50
Nodes (4): 1. Три вида документов Yjs, 5. Производные данные (не синхронизируются), 6. Версия формата, Контракт: модель документа (v1)

## Knowledge Gaps
- **276 isolated node(s):** `PackageDescription`, `YrsFFI`, `account`, `notebook`, `note` (+271 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 755 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Контракт: модель документа (v1)` connect `Контракт: модель документа (v1)` to `NotebookDocument`, `NotebookDocument (2)`, `4. Документ `note``, `Контракт: модель документа (v1)`?**
  _High betweenness centrality (0.345) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `NoteDocument` (e.g. with `.snapshotIfNeeded()` and `.strokesRoundTripAndResolveAnchors()`) actually correct?**
  _`NoteDocument` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PackageDescription`, `YrsFFI`, `account` to the rest of the system?**
  _276 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Block` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Why does `DocKind` connect `LocalStore` to `Stroke`, `APIClient`, `TransactionOrigin`, `SyncEngine`, `Sendable`, `CRDTDocument`, `Контракт: модель документа (v1)`?**
  _High betweenness centrality (0.229) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `APIClient` (e.g. with `.makeService()` and `.loginRefreshesOnExpiryAnd401()`) actually correct?**
  _`APIClient` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `SyncClient` be split into smaller, more focused modules?**
  _Cohesion score 0.06545879602571596 - nodes in this community are weakly interconnected._