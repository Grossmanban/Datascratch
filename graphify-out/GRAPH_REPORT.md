# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 139 files · ~66,975 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 6, .resolved 1)

## Summary
- 2610 nodes · 6354 edges · 126 communities (118 shown, 8 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 872 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a5f4128a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Block
- SyncClient
- NotebookDocument
- NoteDocument
- overview.md
- LocalStore
- CHANGELOG.md
- Stroke
- APIClient
- YrsError
- 0039-parallel-sessions.md
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
- risks.md
- Sendable
- Процесс разработки и Graphify (2)
- CRDTDocument
- 0018-monetization.md
- Контракт: модель документа (v1) (2)
- generate.mjs
- 04-editor.md
- APIClient (2)
- String
- open-questions.md (2)
- String (2)
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
- 03-pencil.md
- 12-craft-features.md
- Контракт: модель документа (v1)
- Foundation
- decisions/README.md (2)
- 0036-space-notebook-folder.md
- APIClient (3)
- strokes.md
- Data
- ServerMessage
- sync-protocol.md
- 10-sync.md
- .iso
- Monorepo layout (apps/ios, apps/web, apps/server, packages, infra)
- D-29. Graphify: порядок работы, чтобы граф был всегда актуален
- 0001-storage-in-database.md
- open-questions.md
- package.json
- compilerOptions
- Foundation (2)
- ClientMessage
- graphify_docs.py
- .json
- 04-editor.md (4)
- glossary.md
- CryptoError
- TaskState
- Foundation (3)
- 06-data-server.md
- План разработки
- CRDTDocument.swift
- stack.md
- WebSocketConnection
- 0008-pdf-annotations.md
- 03-pencil.md (2)
- KeyRing
- Процесс разработки (docs/development.md)
- tasks
- contracts/README.md
- 0038-design-quiet-paper.md
- 0024-product-name.md (2)
- Контракт: протокол синхронизации (v1)
- Контракт: шифрование (v1)
- SyncErrorCode
- 05-organization-design.md
- 0034-auth-email-password.md
- stack.md
- Контракт: шифрование (v1)
- APIError
- Foundation (4)
- Обзор архитектуры
- 7. Шифрование и доступ агентов
- 0032-min-ios-version.md
- Процесс разработки
- SyncClientError
- design-tokens.md (2)
- 4. Документ `note`
- Контракт: REST API сервера (v1)
- D-05. Перо при перекладке текста — вариант А «живой штрих»
- Stage 1: pen-in-text prototype on iPad (TextKit 2 + Yrs + pen layer, living stroke)
- 5. Организация заметок и дизайн
- 08-sharing.md (2)
- 12. Функции по мотивам Craft
- build-xcframework.sh
- 0028-dev-workflow.md
- Datascratch — правила для ИИ
- build-linux.sh
- generate-bindings.sh
- pnpm-workspace.yaml
- git-хук Graphify (пересборка только по изменённому коду)
- Stream design-system (claude/design-system): packages/design-tokens, packages/ui, apps/ios/Packages/DSDesign — Quiet Paper tokens, web and SwiftUI components
- XmlNode
- Web editor: TipTap + Yjs per document-model contract, all blocks, Canvas pen layer per strokes contract
- 2. Платформы
- D-03. Платформы: нативные iPhone и iPad + полноценный веб
- D-04. Одновременно сквозное шифрование и доступ по API
- D-23. Документация — источник истины; Graphify — граф знаний поверх неё
- D-39. Разработка параллельными сессиями; Claude сам вливает в main
- yrs-ffi

## God Nodes (most connected - your core abstractions)
1. `TransactionOrigin` - 70 edges
2. `NoteDocument` - 66 edges
3. `APIClient` - 62 edges
4. `CRDTDocument` - 46 edges
5. `YrsError` - 41 edges
6. `NotebookDocument` - 38 edges
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
- `3. Документ `notebook` (индекс блокнота)` --references--> `NoteMeta`  [INFERRED]
  docs/architecture/contracts/document-model.md → apps/ios/Packages/DSCore/Sources/DSCore/Model/Records.swift

## Import Cycles
- 2-file cycle: `apps/ios/Packages/DSCore/yrs-ffi/src/lib.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/xml.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/lib.rs`
- 3-file cycle: `apps/ios/Packages/DSCore/yrs-ffi/src/events.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/xml.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/lib.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/events.rs`

## Hyperedges (group relationships)
- **Local edit → store/outbox → encrypt → push** — apps_ios_packages_dscore_readme_crdtdocument, apps_ios_packages_dscore_readme_localstore, apps_ios_packages_dscore_readme_dscrypto, apps_ios_packages_dscore_readme_syncengine, apps_ios_packages_dscore_readme_syncclient [EXTRACTED 1.00]

## Communities (126 total, 8 thin omitted)

### Community 0 - "Block"
Cohesion: 0.07
Nodes (17): Array, .attributes, Block, .blockId, .isKnown, .isTextBlock, .text, BlockType (+9 more)

### Community 1 - "SyncClient"
Cohesion: 0.12
Nodes (8): SyncClient, SyncClientDelegate, SyncConnectionState, connected, connecting, disconnected, stopped, waiting

### Community 2 - "NotebookDocument"
Cohesion: 0.08
Nodes (31): CRDTTransaction, Folder, .fields, Kind, folder, note, notebook, MapRecord (+23 more)

### Community 3 - "NoteDocument"
Cohesion: 0.09
Nodes (7): NoteDocument, .isReadOnly, .noteId, RunPiece, node, text, NoteDocumentTests

### Community 4 - "overview.md"
Cohesion: 0.11
Nodes (29): Журнал действий агента GET /agent-tokens/:id/audit, agent_tokens / agent_audit_log Tables, Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, File Storage (disk or external S3), Guest via Link (web, no account) (+21 more)

### Community 5 - "LocalStore"
Cohesion: 0.08
Nodes (14): DocKind, account, note, notebook, .roots, DocumentRecord, Kind, push (+6 more)

### Community 6 - "CHANGELOG.md"
Cohesion: 0.06
Nodes (45): pnpm + Turborepo Monorepo, 2026-10-25, 2026-10-25 (вторая половина дня), Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, Каркас монорепозитория (pnpm + Turborepo), девять потоков разработки, правила сессий-исполнителей, changelog.d (+37 more)

### Community 7 - "Stroke"
Cohesion: 0.07
Nodes (32): AnchorKind, block, drawing, image, text, Author, .value, Hint (+24 more)

### Community 8 - "APIClient"
Cohesion: 0.10
Nodes (5): APIClient, .currentSession, .isSignedIn, AuthSession, normalizeEmail()

### Community 9 - "YrsError"
Cohesion: 0.09
Nodes (13): check_text_range(), mismatch(), missing_map(), nested_map(), ResolvedIndex, YDocument, YrsError, Decoding (+5 more)

### Community 10 - "0039-parallel-sessions.md"
Cohesion: 0.24
Nodes (13): apps/ios — iPhone + iPad, Cross-stream contracts (docs/architecture/contracts/) changed only via the coordinator session, Claude coordinator merges stream branches into main when CI is green, Coordinator session (merges branches into main, owns roadmap.md, CHANGELOG.md and contracts), Stream agents (claude/agents): packages/agents, agents-api contract draft — MCP, REST, tokens, log, PNG render, Stream core (claude/core): packages/shared, packages/test-vectors, root configs — contract types, crypto, stroke codec, document schema, sync client, test vectors, Stream ios-app (claude/ios-app): apps/ios — XcodeGen project, Craft-style SwiftUI shell, navigation, tasks, calendar, settings, Stream ios-core (claude/ios-core): apps/ios/Packages/DSCore — Swift crypto, Yrs document model, GRDB, sync and API client (+5 more)

### Community 11 - "decisions/README.md"
Cohesion: 0.11
Nodes (24): D-19. Весь код пишет Claude, Последствия, Решение, Custom pen renderer (Metal vs Core Animation TBD), End-to-end encryption, iOS client stack, Node.js + TypeScript server, Swift 6 (+16 more)

### Community 12 - "02-platforms.md"
Cohesion: 0.12
Nodes (14): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, Full-featured web client (TypeScript), D-06. Рисование пальцем на iPhone — да, опционально, Finger drawing toggle on iPhone, Решение, D-17. Языки интерфейса — русский и английский, без RTL (+6 more)

### Community 13 - "TransactionOrigin"
Cohesion: 0.11
Nodes (13): TransactionOrigin, .description, .isOutgoing, local, other, remote, storage, system (+5 more)

### Community 14 - "lib.rs"
Cohesion: 0.06
Nodes (16): DeepObserver, UpdateObserver, decoding(), diff_update(), is_inside(), merge_updates(), ORIGIN_LOCAL, origin_name() (+8 more)

### Community 15 - "NotebookDocument (2)"
Cohesion: 0.13
Nodes (7): NotebookDocument, .inbox, .notebookId, NoteMeta, .fields, .isTrashed, IndexDocumentTests

### Community 16 - "design-tokens.md"
Cohesion: 0.29
Nodes (12): Подложки backdrop.* (sand, dusk, mist, meadow, ember) — мягкие градиенты в духе Craft, Цветовые токены: bg.canvas («бумага»), text.primary («чернила»), accent («синие чернила»), danger/success/warning — светлая и тёмная тема, Ширина колонки документа: normal 720, wide 960, full, Тактильная отдача iOS: selection, success (задача выполнена), warning (удаление), Чернила пера ink.* (black, blue, red, green, purple, brown) и маркеры highlight.*, Движение: пружины motion.snappy / smooth / gentle, длительности duration.* для веба, Сетка отступов 4 pt, радиусы radius.*, тени shadow.card / shadow.popover, Цвета tint.* (.fg / .bg) для папок, тегов и выносок (+4 more)

### Community 17 - "SyncEngine"
Cohesion: 0.09
Nodes (6): .xml, .isConnected, KeyRingDocumentKeys, OpenDoc, SyncEngine, SyncStatus

### Community 18 - "SecretStore"
Cohesion: 0.16
Nodes (7): InMemorySecretStore, KeychainSecretStore, SecretStore, SecretStoreError, keychain, SignupMaterial, Security

### Community 19 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.08
Nodes (29): ArrayDelta, Delete, Insert, Retain, convert(), path(), sorted_keys(), text_delta() (+21 more)

### Community 20 - "crypto.md"
Cohesion: 0.13
Nodes (25): Вложения: загрузка и докачка по кускам (/attachments/:id/chunks/:index), лимит 200 МБ, Ассоциированные данные ds1|… привязывают шифротекст к месту (doc, awareness, ключи, куски вложений), Вложения шифруются кусками по 1 MiB, каждый — отдельный конверт, Конверт шифротекста: версия 0x01 + nonce 24 байта + XChaCha20-Poly1305-IETF (тег 16 байт), Иерархия ключей: пароль → passwordKey → masterKey → notebookKey → noteKey, libsodium на всех платформах (libsodium-wrappers-sumo в TS, swift-sodium в iOS), loginKey = BLAKE2b(authSeed, "ds1|login"); сервер хранит Argon2id(loginKey), masterKey — 32 случайных байта, создаётся при регистрации, шифрует account-документ (+17 more)

### Community 21 - "risks.md"
Cohesion: 0.07
Nodes (37): Записываются только сглаженные coalesced-точки завершённого штриха, без predicted, doc_snapshots Table (compacted snapshots, version history), doc_updates Table (encrypted Yjs updates), Web PWA Client (React, TipTap, Yjs, IndexedDB), Automerge (fallback CRDT), TipTap (ProseMirror), Vite + React + TypeScript PWA, VPS Hosting (Hetzner or similar) (+29 more)

### Community 22 - "Sendable"
Cohesion: 0.16
Nodes (31): KDFParams, InlineLocation, AgentPermission, read, readWrite, AgentToken, APIErrorBody, AttachmentStatus (+23 more)

### Community 23 - "Процесс разработки и Graphify (2)"
Cohesion: 0.13
Nodes (18): map_to_attrs(), value_to_any(), Container, container(), Element, Fragment, element(), index_paths() (+10 more)

### Community 24 - "CRDTDocument"
Cohesion: 0.11
Nodes (5): CRDTDocument, .canRedo, .canUndo, .clientId, CRDTDocumentTests

### Community 25 - "0018-monetization.md"
Cohesion: 0.10
Nodes (18): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, Контекст, Решение (на сейчас) (+10 more)

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
Cohesion: 0.12
Nodes (6): HTTPTransport, SecretSessionStore, SessionStore, Locked, APIClientTests, StubTransport

### Community 31 - "open-questions.md (2)"
Cohesion: 0.12
Nodes (8): YValue, .boolValue, .dataValue, .doubleValue, .intValue, .isNull, .items, .stringValue

### Community 32 - "String (2)"
Cohesion: 0.08
Nodes (18): .entries, .formatVersion, .formatVersion, Backdrop, .yValue, Comment, Cover, .value (+10 more)

### Community 33 - "LocalStore (2)"
Cohesion: 0.11
Nodes (27): AccountService, APIClient (REST), AttachmentManager, Block / Inline / Mark, CRDTDocument, DSCore, DSCrypto / KeyRing / KeychainSecretStore, NotebookDocument / AccountDocument (+19 more)

### Community 34 - "Data"
Cohesion: 0.13
Nodes (7): .jsonObject, .fields, ShareLink, .url, Base64URL, ShareLinkTests, UtilTests

### Community 35 - "08-sharing.md"
Cohesion: 0.11
Nodes (25): POST /docs — регистрация документа (account / notebook / note) до первого push, Share { id, target { kind, id }, permission, expiresAt, createdAt } — ссылка шеринга, Шеринг: /shares (view/edit, бессрочно по умолчанию, отзыв сразу отключает гостей), Права: user — документы своего аккаунта; guest — только документы шеринга, push только с правом edit, D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account, Real-time collaborative editing, Universal Links (paid Apple Developer account) (+17 more)

### Community 36 - "0004-encryption-and-api.md"
Cohesion: 0.21
Nodes (12): PATCH /notebooks/:id/mode — включение режима «для агентов» передаёт notebookKey, выключение удаляет серверную обёртку, Режим «для агентов»: клиент передаёт notebookKey по TLS, сервер оборачивает его serverKey; расшифровка только при запросе агента с токеном, NotebookRef { id, spaceId, name, mode: private | agent, … } — ключ блокнота здесь не хранится, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, Блокнот — единица режима шифрования (приватный / для агентов) и шеринга (+4 more)

### Community 37 - "CodingKeys"
Cohesion: 0.07
Nodes (27): CodingKeys, accessToken, auth, baseSeq, client, clientMsgId, code, deviceId (+19 more)

### Community 38 - "yjs_compat.rs"
Cohesion: 0.13
Nodes (18): RootDef, RootKind, Array, Map, Text, XmlFragment, b64(), el() (+10 more)

### Community 39 - "Монорепозиторий и CLAUDE.md (2)"
Cohesion: 0.09
Nodes (15): value_to_in(), YValue, BigInt, Bool, Bytes, List, Null, Number (+7 more)

### Community 40 - "api.md"
Cohesion: 0.15
Nodes (16): Аккаунт и устройства: /me, /devices (отзыв сессий), удаление аккаунта, Эндпоинты /auth: prelogin, signup, login, refresh, logout, recovery, password, Аутентификация Bearer: accessToken 15 мин + refreshToken 30 дней с ротацией, Идентификаторы создаёт клиент (UUIDv7); повторный POST идемпотентен, иначе 409 conflict, Device { id, name, createdAt, lastSeenAt, current } — устройство (сессия) аккаунта, Формат ошибок { error: { code, message } } и коды bad_request…internal, POST /shares/:id/guest — гостевой токен (без авторизации) для hello в синхронизации, GET /health → { ok: true, version } — служебная проверка сервера (+8 more)

### Community 41 - "tests.rs"
Cohesion: 0.18
Nodes (18): arrays_and_errors(), chunk(), Collect, local(), merge_and_diff_updates(), nested_maps_merge_per_field(), note_roots(), observers_report_paths_deltas_and_origins() (+10 more)

### Community 42 - "development.md"
Cohesion: 0.22
Nodes (10): Скрипт tools/graphify_docs.py (prepare → агенты → finish), Stream sessions write changelog fragments in docs/changelog.d/ instead of editing CHANGELOG.md; stream history files docs/history/YYYY-MM-DD-<stream>-NN.md, Graph update after doc edits: graphify_docs.py prepare -> parallel extraction agents -> finish -> graphify export html -> check-update, Extraction prompt .claude/skills/graphify/references/extraction-spec.md, Git: English code/commits, Russian docs, branches + PR, one commit = code + docs + updated graph, Graphify commands (query, explain, path, update, check-update, /graphify --update), graphifyy PyPI package (command graphify), verified on 0.9.95, Graphify install on Mac (brew install uv, uv tool install graphifyy) (+2 more)

### Community 43 - "09-agents-api.md"
Cohesion: 0.09
Nodes (23): AgentToken { id, name, notebookIds, permission, expiresAt, createdAt, lastUsedAt } — без секрета, Токены агентов /agent-tokens: блокноты, read / read_write, срок; токен показывается один раз, Контракт agents-api.md (MCP и REST для самих агентов) — появится на этапе агентов, blockId (UUIDv7) у каждого блочного узла — для точечных правок агентов, заметок на полях и комментариев, hint — распознанная форма (underline, strike, circle, highlight, arrow, scribble) для агентов и экспорта, D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Export: Markdown, PDF, HTML (handwriting as images) (+15 more)

### Community 44 - "04-editor.md (2)"
Cohesion: 0.13
Nodes (18): Схема блоков: doc = title block+ (paragraph, heading, списки, taskList, callout, codeBlock, mathBlock, mermaid, table, image, file, drawing, pageCard), Производные данные строятся локально: индекс задач, полнотекстовый поиск, бэклинки, теги, Inline-узлы noteLink ([[ ]]) и tag (без #, вложенность через /), taskItem: taskId, state open / done / cancelled, scheduled, deadline, completedAt, Obsidian (reference product: links, backlinks, tags, Markdown export), 4. Редактор, Backlinks, Editor content (headings, lists, tables, code, formulas, attachments, drawing blocks) (+10 more)

### Community 45 - "03-pencil.md"
Cohesion: 0.12
Nodes (15): Координаты text-штриха: смещение от начала глифа якорного символа в em, Привязка к тексту: каждая точка → ближайший символ строки (живой штрих), PencilKit (rejected), D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, Living Stroke, Reflow (+7 more)

### Community 46 - "12-craft-features.md"
Cohesion: 0.21
Nodes (14): OPEN (before stage 2): Craft features MVP / post-MVP split (D-41, proposed), Stage 2: MVP on iPad and iPhone, local (editor, handwriting, links, tags, organization, search, design system), Calendar screen: day feed with tasks and daily note (MVP); system calendar integration after MVP, Card document: nested document shown as a card with cover (MVP), Collections: records with properties and table / gallery / kanban views with filter, sort, grouping (after MVP), Daily note: one per day, created on demand, from template (MVP), Document cover image with offset (MVP), Document style: font (serif/sans/mono), width, paper (smooth/dots/grid/ruled), backdrop color or gradient, text color; style gallery after MVP (+6 more)

### Community 47 - "Контракт: модель документа (v1)"
Cohesion: 0.14
Nodes (23): y-prosemirror не записывает атрибуты узлов со значением null: отсутствующий атрибут = null (значение по умолчанию схемы), Документ account: spaces, notebooks, settings, starred, tabs (ключ — masterKey), Comment { blockId, anchor (относительные позиции), author user | guest | agent, text, resolvedAt }, Даты ISO 8601 в UTC; «только дата» YYYY-MM-DD; миллисекунды — только в штрихах, Векторы совместимости модели документа packages/test-vectors/document/* (iOS/Yrs обязан читать и писать формат y-prosemirror), Блок drawing (высота в pt; штрихи — в strokes), Вставка текста в Y.XmlText без явных атрибутов наследует форматирование слева (Yjs/Yrs) — писатели всегда передают явный набор атрибутов, Folder { parentId, name, icon, color, order } — вложенность без ограничения глубины (+15 more)

### Community 48 - "Foundation"
Cohesion: 0.18
Nodes (3): docs, Conn, Stored

### Community 49 - "decisions/README.md (2)"
Cohesion: 0.11
Nodes (21): Canvas + Pointer Events, Dexie (IndexedDB), Drizzle ORM, Fastify, GRDB (SQLite), MCP TypeScript SDK, OAuth 2.1, pg-boss job queue (+13 more)

### Community 50 - "0036-space-notebook-folder.md"
Cohesion: 0.14
Nodes (17): Space { id, name, icon, color, order, createdAt } в account-документе, Organization Hierarchy (Account > Space > Notebook > Folder > Note), Проекты, личное, работа, учёба не смешиваются; минимум кнопок на экране, D-14. Организация: богатая, но не перегруженная, Предложенная структура: пространства → вложенные папки; поперёк — вложенные и умные теги, цвета, избранное, недавние, Решение, Поперёк структуры — теги, умные теги, избранное, недавние, D-36. Структура: пространство → блокноты → папки (+9 more)

### Community 51 - "APIClient (3)"
Cohesion: 0.18
Nodes (3): AttachmentManager, LocalStore, AccountServiceTests

### Community 52 - "strokes.md"
Cohesion: 0.11
Nodes (30): Контракт меняет только сессия-координатор; исполнитель присылает предложение, Перепривязка якорей после отмены/повтора: в той же транзакции якорь удалённого символа с redone-элементом переписывается на относительную позицию нового элемента, Координаты block / image / drawing — в долях ширины блока, Обводки и стрелки «растягиваются» вместе с текстом; при проблемах — изменение контракта через координатора, Правило D-35 в отрисовке: точки удалённых символов не рисуются, штрих остаётся в документе; отмена возвращает пометку, Штрих почти неизменяем после рисования; ластик удаляет штрих целиком или заменяет кусками, Разрыв штриха по строкам: соседние точки на разных line fragments → отдельные сегменты, Изменяемые поля штриха после рисования: anchors (перепривязка, §4.1) и hidden (резерв) (+22 more)

### Community 53 - "Data"
Cohesion: 0.15
Nodes (5): CRDTUpdates, DSCrypto, PasswordChangeMaterial, Data, .hexString

### Community 54 - "ServerMessage"
Cohesion: 0.16
Nodes (12): Item, ServerMessage, ack, awareness, error, update, updates, welcome (+4 more)

### Community 55 - "sync-protocol.md"
Cohesion: 0.20
Nodes (17): ack — обновление или снимок принят и сохранён (docId, clientMsgId, seq), Коды ошибок синхронизации: unauthorized, forbidden, doc_not_found, payload_too_large (2 MiB / 50 MiB), rate_limited, protocol_mismatch, internal, error — сообщение сервера: code, message, ref? (clientMsgId / docId), Клиент хранит lastSeq по каждому документу и догоняет недостающее при подключении, Сервер не присылает клиенту его собственные обновления (кроме updates при догоняющей подписке с другого устройства), Офлайн: обновления копятся в локальной очереди до подтверждения ack, Лимиты payload_too_large: обновление 2 MiB, снимок 50 MiB — считаются декодированные байты, не base64, Порядок (обязательно для сервера): назначение seq и рассылка внутри документа сериализованы, подписчики получают строго по seq, ack — только после записи; дыры в seq допустимы (+9 more)

### Community 56 - "10-sync.md"
Cohesion: 0.10
Nodes (21): iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), История версий: GET /docs/:id/versions и /versions/:seq (зашифрованные снимки), Метка agentEdit (agentId, at) — подсветка правок агента до принятия пользователем, Агенты не подключаются по WebSocket — работают через MCP/REST; сервер применяет их правки как обычные обновления, D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты (+13 more)

### Community 57 - ".iso"
Cohesion: 0.13
Nodes (5): .accessExpiry, DSDate, EntityID, FakeRESTServer, User

### Community 58 - "Monorepo layout (apps/ios, apps/web, apps/server, packages, infra)"
Cohesion: 0.14
Nodes (12): apps/server — сервер, apps/web — веб-клиент, Stream server (claude/server): apps/server, infra/ — Fastify, PostgreSQL, auth, sync, attachments, sharing, docker compose, 6. Модель данных и сервер, Self-hosting, Модель данных (общий обзор; детали — `architecture/data-model.md`), Резервные копии, Сервер (+4 more)

### Community 59 - "D-29. Graphify: порядок работы, чтобы граф был всегда актуален"
Cohesion: 0.13
Nodes (12): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, D-29. Graphify: порядок работы, чтобы граф был всегда актуален, R-09 (риск: Graphify сломается или исчезнет) (+4 more)

### Community 60 - "0001-storage-in-database.md"
Cohesion: 0.19
Nodes (10): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты, Решение (+2 more)

### Community 61 - "open-questions.md"
Cohesion: 0.06
Nodes (31): D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст, Решение, Bundle ID com.datascratch.app, D-33. Bundle ID — com.datascratch.app (+23 more)

### Community 62 - "package.json"
Cohesion: 0.14
Nodes (15): devDependencies, turbo@^2.3.0, typescript@^5.6.0, engines, node, name, packageManager, private (+7 more)

### Community 63 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+7 more)

### Community 64 - "Foundation (2)"
Cohesion: 0.18
Nodes (8): StrokeCodecTests, StrokeMaintenanceTests, VersionRestoreTests, DSCore, Foundation, FoundationNetworking, PackageDescription, Testing

### Community 65 - "ClientMessage"
Cohesion: 0.12
Nodes (12): ClientInfo, ClientMessage, awareness, hello, push, snapshot, subscribe, unsubscribe (+4 more)

### Community 66 - "graphify_docs.py"
Cohesion: 0.28
Nodes (7): Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 67 - ".json"
Cohesion: 0.14
Nodes (9): BadValue, CryptoVectorTests, DocumentVectorTests, jsonEqual(), sortedMarks(), StrokeVectorTests, SyncVectorTests, Vectors (+1 more)

### Community 68 - "04-editor.md (4)"
Cohesion: 0.14
Nodes (14): YOp, ArrayDelete, ArrayInsert, MapDelete, MapSet, RootTextDelete, RootTextInsert, TextDelete (+6 more)

### Community 69 - "glossary.md"
Cohesion: 0.17
Nodes (13): meta.formatVersion = 1; документ новее клиента открывается только для чтения (R-03), Поля штриха: v, tool, color, width, opacity, anchorKind, blockId, anchors, points, hint, author, createdAt, Anchor (textRange / paragraph / drawingBlock / image), Note, Stroke, StrokePoint, Заметка, Иерархия организации (+5 more)

### Community 70 - "CryptoError"
Cohesion: 0.11
Nodes (13): CryptoError, decryptionFailed, invalidKeyLength, invalidRecoveryKey, kdfFailed, malformedEnvelope, sodiumInit, unsupportedKDF (+5 more)

### Community 71 - "TaskState"
Cohesion: 0.27
Nodes (7): TaskState, cancelled, done, open, NoteDerivedData, NoteLinkEntry, TaskEntry

### Community 72 - "Foundation (3)"
Cohesion: 0.26
Nodes (4): eventually(), FakeFactory, FakeSyncServer, SyncTests

### Community 73 - "06-data-server.md"
Cohesion: 0.10
Nodes (20): Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), awareness — курсоры и присутствие: зашифровано, не хранится, только рассылается, Решения по анкетам пользователя: D-32…D-41 и PDF после MVP (D-08), D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Server disk folder storage (default), External S3-compatible storage (Hetzner, R2, B2), File storage interface (two implementations, chosen by config) (+12 more)

### Community 74 - "План разработки"
Cohesion: 0.15
Nodes (13): Критерии приёмки, План разработки, Подготовка, Потоки разработки (D-39), Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad) (+5 more)

### Community 75 - "CRDTDocument.swift"
Cohesion: 0.14
Nodes (4): CRDTSubscription, DeepHandler, UpdateHandler, YrsFFI

### Community 76 - "stack.md"
Cohesion: 0.14
Nodes (21): Транспорт wss://<host>/v1/sync: JSON-кадры с type, base64url, ping/pong каждые 25 с, Server PostgreSQL Schema (Stage 3 Draft), Astro (landing page), Dexie (IndexedDB), docker compose Self-Hosting (server + PostgreSQL), Drizzle ORM, GRDB (SQLite), TypeScript on Node.js (+13 more)

### Community 77 - "WebSocketConnection"
Cohesion: 0.17
Nodes (3): Configuration, URLSessionWebSocket, WebSocketConnection

### Community 78 - "0008-pdf-annotations.md"
Cohesion: 0.20
Nodes (10): D-08. Аннотации PDF пером — не в MVP, Аннотации PDF пером (PDFKit + свой слой штрихов) — после MVP, этап расширений, Решение, Решение (предложение), D-16. Импорт — не сейчас, Решение, CLOSED: PDF annotations after MVP (D-08), R-08 Huge Project Scope (+2 more)

### Community 79 - "03-pencil.md (2)"
Cohesion: 0.17
Nodes (15): ADR file number equals decision number (D-05 -> 0005-*.md), template 0000-template.md, Нумерация решений D-NN и файлы decisions/00NN-*.md, Документация Datascratch — единственный источник истины, history/ — архив, не источник истины; исключена из графа (.graphifyignore), Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Правило замены: решение РЕШЕНО не переписывается, ADR получает статус «ЗАМЕНЕНО решением D-NN», Оглавление docs/ (spec, contracts, architecture, decisions, roadmap, risks…), Документация Datascratch (+7 more)

### Community 80 - "KeyRing"
Cohesion: 0.21
Nodes (3): KeyRing, AccountService, SignupResult

### Community 81 - "Процесс разработки (docs/development.md)"
Cohesion: 0.16
Nodes (14): XcodeGen project.yml (D-28), Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, docs/history session log, Смешанный режим: облачные сессии (Linux, без Xcode) + Mac пользователя для сборки и iPad, D-23 (документация), D-19 (код пишет Claude), D-28 (облако + Mac, CI), GitHub Actions on macOS verifies iOS code written in the cloud (+6 more)

### Community 82 - "tasks"
Cohesion: 0.18
Nodes (10): dependsOn, outputs, $schema, tasks, build, lint, test, typecheck (+2 more)

### Community 83 - "contracts/README.md"
Cohesion: 0.20
Nodes (10): Тестовые векторы crypto: KDF, конверты, Base32 ключа восстановления, куски вложений (Swift и TS), Контракт — точное описание формата/протокола, который реализуют несколько частей (iOS на Swift, веб и сервер на TS), Версионирование контрактов v1, v2…; ломающее изменение — новая версия с явной миграцией, Совместимость доказывается общими тестовыми векторами (packages/test-vectors), Типы TypeScript контрактов в packages/shared/src/contracts/ — часть контракта, Контракты между частями системы, Правила изменения, Тестовые векторы strokes: упаковка точек, разрешение якорей после правок, правило D-35 (+2 more)

### Community 84 - "0038-design-quiet-paper.md"
Cohesion: 0.17
Nodes (10): Ежедневные заметки и «Входящие» (kind daily / inbox) в блокноте settings.dailyNotebookId, D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Вариант «графит по умолчанию» — отклонён: чернила на тёмном читаются хуже, Вариант «чистый нейтральный» (Linear / Things) — не выбран, Тёмная тема — тёплый графит, Рассмотренные варианты, Решение, D-41. Набор функций по мотивам Craft (+2 more)

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

### Community 89 - "05-organization-design.md"
Cohesion: 0.23
Nodes (10): D-15. Дизайн — основная концепция продукта, Design references: Things 3, Linear, Craft, Arc, Последствия, Решение, Ориентир Craft: градиентные подложки, документы-карточки с обложками, боковая панель «Вкладки / Избранное / Папки / Теги», стеклянные панели, контекстные меню, Light/dark theme, Dynamic Type, VoiceOver, full iPad keyboard support, Feel references: Things 3, Linear, Craft, Arc, Own design system (typography, grid, colors, icons, animation, haptics) unified on iOS and web (+2 more)

### Community 90 - "0034-auth-email-password.md"
Cohesion: 0.20
Nodes (10): Notesnook, D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления, Вход по email + паролю; один пароль и для входа, и для шифрования (как в Notesnook), Passkeys — сложно совместить со сквозным шифрованием сейчас; возможно позже, Ключ восстановления, выдаваемый при регистрации, Sign in with Apple — отклонён: всё равно нужен отдельный пароль шифрования, Контекст, Рассмотренные варианты (+2 more)

### Community 91 - "stack.md"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 92 - "Контракт: шифрование (v1)"
Cohesion: 0.20
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 93 - "APIError"
Cohesion: 0.15
Nodes (9): URLSession, APIError, .code, invalidResponse, notAuthenticated, server, transport, URLSessionWebSocketFactory (+1 more)

### Community 95 - "Обзор архитектуры"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 96 - "7. Шифрование и доступ агентов"
Cohesion: 0.29
Nodes (7): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Вход и восстановление доступа (D-34), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 97 - "0032-min-ios-version.md"
Cohesion: 0.27
Nodes (9): D-32. Минимальная версия iOS/iPadOS — 26, Минимальная версия iOS/iPadOS 26 (IPHONEOS_DEPLOYMENT_TARGET = 26.0), Liquid Glass — системный дизайн iOS 26, Отклонённые варианты: iOS 18+ (шире охват) и 17.5+ (минимум для Pencil Pro), Последствия, Рассмотренные варианты, Решение, CLOSED: minimum iOS 26+ (D-32); XcodeGen accepted (D-39); Bundle ID (D-33); paid Apple Developer account exists (+1 more)

### Community 98 - "Процесс разработки"
Cohesion: 0.33
Nodes (6): Git, Две среды, Конец сессии, Кто что делает, Правила для сессий-исполнителей (D-39), Процесс разработки

### Community 99 - "SyncClientError"
Cohesion: 0.22
Nodes (7): AccountError, missingKey, notSignedIn, SyncClientError, closed, notConnected, server

### Community 100 - "design-tokens.md (2)"
Cohesion: 0.40
Nodes (5): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 101 - "4. Документ `note`"
Cohesion: 0.40
Nodes (5): 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note`

### Community 102 - "Контракт: REST API сервера (v1)"
Cohesion: 0.22
Nodes (9): Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1), Общее, Служебное, Токены агентов (`spec/09-agents-api.md`) (+1 more)

### Community 103 - "D-05. Перо при перекладке текста — вариант А «живой штрих»"
Cohesion: 0.40
Nodes (5): D-05. Перо при перекладке текста — вариант А «живой штрих», Гипотеза реализации, Контекст, Последствия, Решение

### Community 104 - "Stage 1: pen-in-text prototype on iPad (TextKit 2 + Yrs + pen layer, living stroke)"
Cohesion: 0.39
Nodes (6): Custom iOS Pen Render Layer (Metal or Core Animation), TextKit 2 (UIKit editor), ProMotion (120 Hz), R-01 Pen-in-Text May Not Work, Pen render choice: Metal vs Core Animation (latency and frame measurement), Stage 1: pen-in-text prototype on iPad (TextKit 2 + Yrs + pen layer, living stroke)

### Community 105 - "5. Организация заметок и дизайн"
Cohesion: 0.40
Nodes (5): 5. Организация заметок и дизайн, Дизайн (D-15 — РЕШЕНО, главный принцип продукта), Организация (D-14 — РЕШЕНО по сути; структура ниже — ПРЕДЛОЖЕНО), Принципы, Реализация

### Community 106 - "08-sharing.md (2)"
Cohesion: 0.40
Nodes (5): 8. Совместная работа и шеринг, Гости (D-37), Открыто (см. `open-questions.md`), Реализация, Требования

### Community 107 - "12. Функции по мотивам Craft"
Cohesion: 0.25
Nodes (8): 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft, Связь с моделью данных

### Community 108 - "build-xcframework.sh"
Cohesion: 0.50
Nodes (3): IPHONEOS_DEPLOYMENT_TARGET, MACOSX_DEPLOYMENT_TARGET, build-xcframework.sh script

### Community 109 - "0028-dev-workflow.md"
Cohesion: 0.17
Nodes (14): GitHub Actions CI (incl. macOS iOS builds), XcodeGen, Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, Последствия: ошибки сборки видны с задержкой CI; ощущение пера проверяет только пользователь на iPad (Pencil Pro) (+6 more)

### Community 110 - "Datascratch — правила для ИИ"
Cohesion: 0.29
Nodes (7): Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой, Правила, Среда разработки

### Community 116 - "git-хук Graphify (пересборка только по изменённому коду)"
Cohesion: 0.43
Nodes (6): Стартовый хук Claude Code (.claude/hooks/session-start.sh), git-хук Graphify (пересборка только по изменённому коду), Graphify 0.9.95 (пакет graphifyy), Смысловой слой графа (понятия, решения, связи — проход ИИ), Структурный слой графа (код, файлы, заголовки — без ИИ), Automation: SessionStart hook installs Graphify and git hook; git hook rebuilds code graph after commit/checkout/merge; graphify update after git pull on Mac

### Community 117 - "Stream design-system (claude/design-system): packages/design-tokens, packages/ui, apps/ios/Packages/DSDesign — Quiet Paper tokens, web and SwiftUI components"
Cohesion: 0.38
Nodes (5): Stream design-system (claude/design-system): packages/design-tokens, packages/ui, apps/ios/Packages/DSDesign — Quiet Paper tokens, web and SwiftUI components, packages/design-tokens — дизайн-токены «Тихая бумага», tokens.json as source of Quiet Paper design token values; generators to CSS variables (web) and Swift (iOS), packages/ui — веб-компоненты дизайн-системы, React design-system components on Radix + Tailwind + Motion in Quiet Paper style

### Community 118 - "XmlNode"
Cohesion: 0.33
Nodes (5): XmlNode, .attributes, .children, .elementName, .textContent

### Community 119 - "Web editor: TipTap + Yjs per document-model contract, all blocks, Canvas pen layer per strokes contract"
Cohesion: 0.50
Nodes (4): Canvas + Pointer Events Pen Layer, Stream web-editor (claude/web-editor): packages/web-editor — TipTap editor with all blocks, Canvas pen, packages/web-editor — веб-редактор, Web editor: TipTap + Yjs per document-model contract, all blocks, Canvas pen layer per strokes contract

### Community 120 - "2. Платформы"
Cohesion: 0.40
Nodes (5): 2. Платформы, Минимальная версия iOS/iPadOS — 26 (D-32), Минимальная версия iOS/iPadOS — ОТКРЫТО, Тестовые устройства (известно на 2026-10-25), Требования

### Community 121 - "D-03. Платформы: нативные iPhone и iPad + полноценный веб"
Cohesion: 0.50
Nodes (4): D-03. Платформы: нативные iPhone и iPad + полноценный веб, Контекст, Последствия, Решение

### Community 122 - "D-04. Одновременно сквозное шифрование и доступ по API"
Cohesion: 0.50
Nodes (4): D-04. Одновременно сквозное шифрование и доступ по API, Контекст, Последствия, Решение

### Community 123 - "D-23. Документация — источник истины; Graphify — граф знаний поверх неё"
Cohesion: 0.50
Nodes (4): D-23. Документация — источник истины; Graphify — граф знаний поверх неё, Контекст, Последствия, Решение

### Community 124 - "D-39. Разработка параллельными сессиями; Claude сам вливает в main"
Cohesion: 0.50
Nodes (4): D-39. Разработка параллельными сессиями; Claude сам вливает в main, Контекст, Последствия, Решение

## Knowledge Gaps
- **276 isolated node(s):** `PackageDescription`, `YrsFFI`, `account`, `notebook`, `note` (+271 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 755 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Контракт: модель документа (v1)` connect `NotebookDocument` to `4. Документ `note``, `Контракт: модель документа (v1)`?**
  _High betweenness centrality (0.331) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `NoteDocument` (e.g. with `.snapshotIfNeeded()` and `.strokesRoundTripAndResolveAnchors()`) actually correct?**
  _`NoteDocument` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PackageDescription`, `YrsFFI`, `account` to the rest of the system?**
  _276 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Block` be split into smaller, more focused modules?**
  _Cohesion score 0.07287784679089027 - nodes in this community are weakly interconnected._
- **Why does `DocKind` connect `LocalStore` to `NotebookDocument`, `Stroke`, `APIClient`, `CRDTDocument.swift`, `SyncEngine`, `Sendable`, `CRDTDocument`?**
  _High betweenness centrality (0.217) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `APIClient` (e.g. with `.makeService()` and `.loginRefreshesOnExpiryAnd401()`) actually correct?**
  _`APIClient` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `SyncClient` be split into smaller, more focused modules?**
  _Cohesion score 0.12169312169312169 - nodes in this community are weakly interconnected._