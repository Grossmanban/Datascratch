# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 128 files · ~50,775 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 6, .resolved 1)

## Summary
- 2120 nodes · 4825 edges · 113 communities (106 shown, 7 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 696 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7379a183`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- 0039-parallel-sessions.md
- sync-protocol.md
- String
- 0018-monetization.md
- 0011-handwriting-for-agents.md
- stack.md
- 0023-documentation-source-of-truth.md
- Снимки и уплотнение: > 500 обновлений или > 1 MiB → снимок; удаление seq ≤ baseSeq, кроме нужных истории (R-05)
- 0031-crdt-yjs.md
- Правила для ИИ и документации
- crypto.md
- String
- CHANGELOG.md
- DSCrypto
- Правила для ИИ и документации (2) (2)
- Контракт: модель документа (v1)
- Universal Links (paid Apple Developer account)
- TransactionOrigin
- 04-editor.md
- Модель данных и глоссарий (2)
- docs/README.md
- 08-sharing.md
- 0001-storage-in-database.md
- Monorepo layout (apps/ios, apps/web, apps/server, packages, infra)
- package.json
- compilerOptions
- Скрипт обновления графа
- NoteDocument
- Hint
- Контракт: дизайн-токены «Тихая бумага» (v1)
- CRDTTransaction
- tests.rs
- Stroke
- Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1)
- libsodium on all platforms (swift-sodium on iOS, libsodium-wrappers in TS)
- contracts/README.md
- 0025-no-redis.md
- open-questions.md (2)
- Контракт: модель документа (v1) (2)
- 0010-agent-edits.md
- generate.mjs
- tasks
- YrsError
- LocalStore
- 0004-encryption-and-api.md
- 06-data-server.md
- Монорепозиторий и CLAUDE.md (2)
- .mapValue
- Data
- D-41. Набор функций по мотивам Craft
- Технологический стек — РЕШЕНО (2026-10-25)
- yjs_compat.rs
- 04-editor.md
- 12. Функции по мотивам Craft (2)
- lib.rs
- 4. Документ `note`
- 0036-space-notebook-folder.md
- strokes.md
- String
- Процесс разработки и Graphify (2)
- Платформы и клиенты (2)
- 0009-notebook-mode-choice.md (5)
- Контракт: дизайн-токены «Тихая бумага» (v1) (2)
- 0005-living-stroke.md
- api.md
- CryptoError
- NotebookDocument
- 04-editor.md (4)
- Дизайн и организация (2) (2)
- 0035-strokes-on-deleted-text.md
- 0028-dev-workflow.md
- Процесс разработки (docs/development.md)
- 0024-product-name.md
- Соглашения
- 8. Совместная работа и шеринг
- Контракт: шифрование (v1)
- pnpm-workspace.yaml
- 10-sync.md
- Block
- Решения по анкетам пользователя: D-32…D-41 и PDF после MVP (D-08)
- D-04. Одновременно сквозное шифрование и доступ по API
- 12-craft-features.md
- D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время
- D-29. Graphify: порядок работы, чтобы граф был всегда актуален
- 0026-file-storage.md
- Datascratch — правила для ИИ (CLAUDE.md)
- open-questions.md
- design-tokens.md
- 02-platforms.md
- String
- План разработки
- decisions/README.md
- Контракт: шифрование (v1)
- 0003-platforms.md
- TaskQuery
- Контракт: REST API сервера (v1)
- Контракт: протокол синхронизации (v1)
- 0038-design-quiet-paper.md
- Открытые вопросы
- Datascratch — правила для ИИ
- build-xcframework.sh
- Обзор архитектуры
- Stream design-system (claude/design-system): packages/design-tokens, packages/ui, apps/ios/Packages/DSDesign — Quiet Paper tokens, web and SwiftUI components
- 7. Шифрование и доступ агентов
- .keyHierarchy
- DSCore
- Процесс разработки
- Модель данных — ЧЕРНОВИК
- build-linux.sh
- generate-bindings.sh
- D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления
- yrs-ffi

## God Nodes (most connected - your core abstractions)
1. `TransactionOrigin` - 69 edges
2. `NoteDocument` - 56 edges
3. `CRDTDocument` - 42 edges
4. `YrsError` - 41 edges
5. `YDocument` - 38 edges
6. `NotebookDocument` - 34 edges
7. `LocalStore` - 30 edges
8. `AccountDocument` - 29 edges
9. `Block` - 28 edges
10. `YValue` - 27 edges

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

## Communities (113 total, 7 thin omitted)

### Community 0 - "0039-parallel-sessions.md"
Cohesion: 0.11
Nodes (20): apps/ios — iPhone + iPad, rebaseRedoneAnchors(doc) — хелпер TS перепривязки якорей (на iOS — эквивалент в DSCore), Canvas + Pointer Events Pen Layer, Cross-stream contracts (docs/architecture/contracts/) changed only via the coordinator session, Claude coordinator merges stream branches into main when CI is green, D-39. Разработка параллельными сессиями; Claude сам вливает в main, Контекст, Последствия (+12 more)

### Community 1 - "sync-protocol.md"
Cohesion: 0.17
Nodes (19): Формат ошибок { error: { code, message } } и коды bad_request…internal, ack — обновление или снимок принят и сохранён (docId, clientMsgId, seq), Коды ошибок синхронизации: unauthorized, forbidden, doc_not_found, payload_too_large (2 MiB / 50 MiB), rate_limited, protocol_mismatch, internal, error — сообщение сервера: code, message, ref? (clientMsgId / docId), Клиент хранит lastSeq по каждому документу и догоняет недостающее при подключении, Сервер не присылает клиенту его собственные обновления (кроме updates при догоняющей подписке с другого устройства), Офлайн: обновления копятся в локальной очереди до подтверждения ack, Лимиты payload_too_large: обновление 2 MiB, снимок 50 MiB — считаются декодированные байты, не base64 (+11 more)

### Community 2 - "String"
Cohesion: 0.17
Nodes (13): Backdrop, .yValue, Comment, Cover, .value, InlineLocation, Kind, color (+5 more)

### Community 3 - "0018-monetization.md"
Cohesion: 0.17
Nodes (11): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, PostgreSQL, Контекст (+3 more)

### Community 4 - "0011-handwriting-for-agents.md"
Cohesion: 0.09
Nodes (23): AgentToken { id, name, notebookIds, permission, expiresAt, createdAt, lastUsedAt } — без секрета, Токены агентов /agent-tokens: блокноты, read / read_write, срок; токен показывается один раз, Контракт agents-api.md (MCP и REST для самих агентов) — появится на этапе агентов, blockId (UUIDv7) у каждого блочного узла — для точечных правок агентов, заметок на полях и комментариев, hint — распознанная форма (underline, strike, circle, highlight, arrow, scribble) для агентов и экспорта, D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Export: Markdown, PDF, HTML (handwriting as images) (+15 more)

### Community 5 - "stack.md"
Cohesion: 0.07
Nodes (52): agent_tokens / agent_audit_log Tables, doc_updates Table (encrypted Yjs updates), Server PostgreSQL Schema (Stage 3 Draft), Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, File Storage (disk or external S3) (+44 more)

### Community 6 - "0023-documentation-source-of-truth.md"
Cohesion: 0.10
Nodes (15): D-19. Весь код пишет Claude, Последствия, Решение, D-23. Документация — источник истины; Graphify — граф знаний поверх неё, Контекст, Последствия, Решение, Graphify (+7 more)

### Community 7 - "Снимки и уплотнение: > 500 обновлений или > 1 MiB → снимок; удаление seq ≤ baseSeq, кроме нужных истории (R-05)"
Cohesion: 0.36
Nodes (9): orphanedAt — локальная отметка клиента, когда все якоря штриха впервые оказались удалены (стирается, если якоря снова живы), Осиротевшие штрихи (все якоря удалены, orphanedAt или createdAt старше 30 дней) окончательно удаляются клиентом при уплотнении истории, Снимки и уплотнение: > 500 обновлений или > 1 MiB → снимок; удаление seq ≤ baseSeq, кроме нужных истории (R-05), doc_snapshots Table (compacted snapshots, version history), Encrypted history compaction by clients (R-05, stage 3), Окончательная очистка таких штрихов — при уплотнении истории, Snapshot, OPEN (before stage 3): Yjs history compaction under encryption — snapshot scheme (R-05) (+1 more)

### Community 8 - "0031-crdt-yjs.md"
Cohesion: 0.08
Nodes (36): Automerge (fallback CRDT), Yrs (Rust Yjs) with Swift Wrapper, Утверждён технологический стек (D-21), отказ от ядра на Rust (D-22), Custom pen renderer (Metal vs Core Animation TBD), D-21. Технологический стек, End-to-end encryption, GRDB (SQLite), iOS client stack (+28 more)

### Community 9 - "Правила для ИИ и документации"
Cohesion: 0.24
Nodes (7): Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, D-29. Graphify: порядок работы, чтобы граф был всегда актуален, R-09 (риск: Graphify сломается или исчезнет), Контекст, Последствия, Решение, graphify-out/ layout: what is committed (graph.json, report, html, manifest, cache) vs machine-local (.gitignore)

### Community 10 - "crypto.md"
Cohesion: 0.16
Nodes (22): Режим «для агентов»: клиент передаёт notebookKey по TLS, сервер оборачивает его serverKey; расшифровка только при запросе агента с токеном, Вложения шифруются кусками по 1 MiB, каждый — отдельный конверт, Иерархия ключей: пароль → passwordKey → masterKey → notebookKey → noteKey, loginKey = BLAKE2b(authSeed, "ds1|login"); сервер хранит Argon2id(loginKey), masterKey — 32 случайных байта, создаётся при регистрации, шифрует account-документ, noteKey — ключ заметки: шифрует note-документ и вложения, notebookKey — случайный ключ блокнота, шифрует notebook-документ, Смена пароля перешифровывает только обёртку masterKey (+14 more)

### Community 11 - "String"
Cohesion: 0.25
Nodes (4): Array, .attributes, Mark, .attributeValue

### Community 12 - "CHANGELOG.md"
Cohesion: 0.11
Nodes (27): 2026-10-25, 2026-10-25 (вторая половина дня), Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, Каркас монорепозитория (pnpm + Turborepo), девять потоков разработки, правила сессий-исполнителей, changelog.d, Создан CLAUDE.md и скелет монорепозитория (apps/, packages/, infra/) (+19 more)

### Community 13 - "DSCrypto"
Cohesion: 0.18
Nodes (4): CRDTUpdates, DSCrypto, Data, .hexString

### Community 14 - "Правила для ИИ и документации (2) (2)"
Cohesion: 0.16
Nodes (16): Стартовый хук Claude Code (.claude/hooks/session-start.sh), git-хук Graphify (пересборка только по изменённому коду), Скрипт tools/graphify_docs.py (prepare → агенты → finish), Graphify 0.9.95 (пакет graphifyy), Смысловой слой графа (понятия, решения, связи — проход ИИ), Структурный слой графа (код, файлы, заголовки — без ИИ), Automation: SessionStart hook installs Graphify and git hook; git hook rebuilds code graph after commit/checkout/merge; graphify update after git pull on Mac, Stream sessions write changelog fragments in docs/changelog.d/ instead of editing CHANGELOG.md; stream history files docs/history/YYYY-MM-DD-<stream>-NN.md (+8 more)

### Community 15 - "Контракт: модель документа (v1)"
Cohesion: 0.17
Nodes (20): y-prosemirror не записывает атрибуты узлов со значением null: отсутствующий атрибут = null (значение по умолчанию схемы), Документ account: spaces, notebooks, settings, starred, tabs (ключ — masterKey), Даты ISO 8601 в UTC; «только дата» YYYY-MM-DD; миллисекунды — только в штрихах, Векторы совместимости модели документа packages/test-vectors/document/* (iOS/Yrs обязан читать и писать формат y-prosemirror), Вставка текста в Y.XmlText без явных атрибутов наследует форматирование слева (Yjs/Yrs) — писатели всегда передают явный набор атрибутов, Folder { parentId, name, icon, color, order } — вложенность без ограничения глубины, Значение метки — объект атрибутов ({ bold: {} }, { link: { href, … } }); читатели принимают {} и true и ключи <имя>--<хэш>, Документ note: content (Y.XmlFragment), meta, strokes, comments (ключ заметки) (+12 more)

### Community 16 - "Universal Links (paid Apple Developer account)"
Cohesion: 0.40
Nodes (6): Universal Links (paid Apple Developer account), Платный аккаунт Apple Developer; Team ID задаётся на Mac при первой подписи, в репозитории не хранится, Universal Links, Apple Developer Account, R-12 No Paid Apple Account (7-day installs), Universal Links: open in app if installed, else web (needs paid Apple Developer account and apple-app-site-association)

### Community 17 - "TransactionOrigin"
Cohesion: 0.13
Nodes (9): TransactionOrigin, .description, .isOutgoing, local, other, remote, storage, system (+1 more)

### Community 18 - "04-editor.md"
Cohesion: 0.15
Nodes (9): AttachmentRecord, .missingChunks, .uploaded, LocalStore, State, pendingUpload, remote, synced (+1 more)

### Community 19 - "Модель данных и глоссарий (2)"
Cohesion: 0.18
Nodes (12): meta.formatVersion = 1; документ новее клиента открывается только для чтения (R-03), Поля штриха: v, tool, color, width, opacity, anchorKind, blockId, anchors, points, hint, author, createdAt, Anchor (textRange / paragraph / drawingBlock / image), Note, Stroke, StrokePoint, RelativePosition (CRDT), R-03 Data Format Cannot Change Cheaply (+4 more)

### Community 20 - "docs/README.md"
Cohesion: 0.26
Nodes (11): ADR file number equals decision number (D-05 -> 0005-*.md), template 0000-template.md, Нумерация решений D-NN и файлы decisions/00NN-*.md, Документация Datascratch — единственный источник истины, Передаточный документ history/2026-10-25-handoff.md (устарел: Redis, MinIO, стек «предложен»), history/ — архив, не источник истины; исключена из графа (.graphifyignore), Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Правило замены: решение РЕШЕНО не переписывается, ADR получает статус «ЗАМЕНЕНО решением D-NN», Оглавление docs/ (spec, contracts, architecture, decisions, roadmap, risks…) (+3 more)

### Community 21 - "08-sharing.md"
Cohesion: 0.16
Nodes (18): POST /docs — регистрация документа (account / notebook / note) до первого push, Share { id, target { kind, id }, permission, expiresAt, createdAt } — ссылка шеринга, Шеринг: /shares (view/edit, бессрочно по умолчанию, отзыв сразу отключает гостей), Права: user — документы своего аккаунта; guest — только документы шеринга, push только с правом edit, Guest via Link (web, no account), Link sharing with editing without account, Real-time collaborative editing, D-37. Гости по ссылке рисуют; ссылка живёт до отзыва (+10 more)

### Community 22 - "0001-storage-in-database.md"
Cohesion: 0.19
Nodes (10): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты, Решение (+2 more)

### Community 23 - "Monorepo layout (apps/ios, apps/web, apps/server, packages, infra)"
Cohesion: 0.19
Nodes (10): apps/server — сервер, Stream server (claude/server): apps/server, infra/ — Fastify, PostgreSQL, auth, sync, attachments, sharing, docker compose, 6. Модель данных и сервер, Self-hosting, Модель данных (общий обзор; детали — `architecture/data-model.md`), Резервные копии, Сервер, docker-compose.yml: server + PostgreSQL containers, file volume or external S3 (+2 more)

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
Nodes (7): NoteDocument, .isReadOnly, .noteId, RunPiece, node, text, NoteDocumentTests

### Community 28 - "Hint"
Cohesion: 0.11
Nodes (18): AnchorKind, block, drawing, image, text, Hint, arrow, circle (+10 more)

### Community 29 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.08
Nodes (29): ArrayDelta, Delete, Insert, Retain, convert(), path(), sorted_keys(), text_delta() (+21 more)

### Community 30 - "CRDTTransaction"
Cohesion: 0.10
Nodes (7): CRDTTransaction, Locked, Fixture, DSCore, Foundation, PackageDescription, Testing

### Community 31 - "tests.rs"
Cohesion: 0.18
Nodes (18): arrays_and_errors(), chunk(), Collect, local(), merge_and_diff_updates(), nested_maps_merge_per_field(), note_roots(), observers_report_paths_deltas_and_origins() (+10 more)

### Community 32 - "Stroke"
Cohesion: 0.10
Nodes (16): Author, .value, Kind, agent, guest, user, ResolvedStrokeSegment, Stroke (+8 more)

### Community 33 - "Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1)"
Cohesion: 0.28
Nodes (6): Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), Own design system (typography, grid, colors, icons, animation, haptics) unified on iOS and web, App server: Node.js + TypeScript (Fastify), packages/shared — общие TypeScript-типы и схемы, Shared TypeScript types and schemas (document, strokes, metadata, sync protocol, API)

### Community 34 - "libsodium on all platforms (swift-sodium on iOS, libsodium-wrappers in TS)"
Cohesion: 0.22
Nodes (11): Вложения: загрузка и докачка по кускам (/attachments/:id/chunks/:index), лимит 200 МБ, Ассоциированные данные ds1|… привязывают шифротекст к месту (doc, awareness, ключи, куски вложений), Конверт шифротекста: версия 0x01 + nonce 24 байта + XChaCha20-Poly1305-IETF (тег 16 байт), libsodium на всех платформах (libsodium-wrappers-sumo в TS, swift-sodium в iOS), awareness — курсоры и присутствие: зашифровано, не хранится, только рассылается, libsodium, Attachments as separate encrypted files, on-demand resumable download, Argon2id password key derivation (+3 more)

### Community 35 - "contracts/README.md"
Cohesion: 0.17
Nodes (12): Тестовые векторы crypto: KDF, конверты, Base32 ключа восстановления, куски вложений (Swift и TS), Контракт — точное описание формата/протокола, который реализуют несколько частей (iOS на Swift, веб и сервер на TS), Версионирование контрактов v1, v2…; ломающее изменение — новая версия с явной миграцией, Контракт меняет только сессия-координатор; исполнитель присылает предложение, Совместимость доказывается общими тестовыми векторами (packages/test-vectors), Типы TypeScript контрактов в packages/shared/src/contracts/ — часть контракта, Контракты между частями системы, Правила изменения (+4 more)

### Community 36 - "0025-no-redis.md"
Cohesion: 0.09
Nodes (25): Canvas + Pointer Events, Dexie (IndexedDB), Drizzle ORM, Fastify, MCP TypeScript SDK, OAuth 2.1, pg-boss job queue, Radix + Tailwind + Motion (+17 more)

### Community 37 - "open-questions.md (2)"
Cohesion: 0.09
Nodes (15): XmlNode, .attributes, .children, .elementName, .textContent, YValue, .boolValue, .dataValue (+7 more)

### Community 38 - "Контракт: модель документа (v1) (2)"
Cohesion: 0.06
Nodes (35): concurrency, cancel-in-progress, group, defaults, run, name, runs-on, steps (+27 more)

### Community 39 - "0010-agent-edits.md"
Cohesion: 0.32
Nodes (6): Метка agentEdit (agentId, at) — подсветка правок агента до принятия пользователем, D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение

### Community 40 - "generate.mjs"
Cohesion: 0.07
Nodes (28): b64(), content, doc, firstRun, fixture, json, para, rel() (+20 more)

### Community 41 - "tasks"
Cohesion: 0.18
Nodes (10): dependsOn, outputs, $schema, tasks, build, lint, test, typecheck (+2 more)

### Community 42 - "YrsError"
Cohesion: 0.09
Nodes (13): check_text_range(), mismatch(), missing_map(), nested_map(), ResolvedIndex, YDocument, YrsError, Decoding (+5 more)

### Community 43 - "LocalStore"
Cohesion: 0.05
Nodes (17): DocKind, account, note, notebook, .roots, DocumentRecord, Kind, push (+9 more)

### Community 44 - "0004-encryption-and-api.md"
Cohesion: 0.22
Nodes (10): NotebookRef { id, spaceId, name, mode: private | agent, … } — ключ блокнота здесь не хранится, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, Блокнот — единица режима шифрования (приватный / для агентов) и шеринга, Structure decided: space -> notebooks -> folders; encryption mode and sharing at notebook level (D-36), Per-notebook key wrapped by user master key (private) or server key (agent mode) (+2 more)

### Community 45 - "06-data-server.md"
Cohesion: 0.09
Nodes (15): Журнал действий агента GET /agent-tokens/:id/audit, Stroke point anchoring: character anchor + dx/dy in font-size units, Daily off-VPS backups of DB and files with verified restore (R-11), Handwriting layer: vector strokes with anchors (text range, paragraph, drawing block, image), pg-boss background job queue on PostgreSQL, PostgreSQL via Drizzle (D-30): accounts, notebooks, rights, tokens, encrypted updates, snapshots, agent log, Log of all agent actions, Real time when a note is open on two devices (WebSocket, in-process broadcast) (+7 more)

### Community 46 - "Монорепозиторий и CLAUDE.md (2)"
Cohesion: 0.09
Nodes (15): value_to_in(), YValue, BigInt, Bool, Bytes, List, Null, Number (+7 more)

### Community 47 - ".mapValue"
Cohesion: 0.29
Nodes (3): .formatVersion, .formatVersion, .formatVersion

### Community 48 - "Data"
Cohesion: 0.18
Nodes (3): .fields, Base64URL, Base64URLData

### Community 49 - "D-41. Набор функций по мотивам Craft"
Cohesion: 0.14
Nodes (4): CRDTSubscription, DeepHandler, UpdateHandler, YrsFFI

### Community 50 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 51 - "yjs_compat.rs"
Cohesion: 0.13
Nodes (18): RootDef, RootKind, Array, Map, Text, XmlFragment, b64(), el() (+10 more)

### Community 52 - "04-editor.md"
Cohesion: 0.12
Nodes (18): Схема блоков: doc = title block+ (paragraph, heading, списки, taskList, callout, codeBlock, mathBlock, mermaid, table, image, file, drawing, pageCard), Производные данные строятся локально: индекс задач, полнотекстовый поиск, бэклинки, теги, Inline-узлы noteLink ([[ ]]) и tag (без #, вложенность через /), taskItem: taskId, state open / done / cancelled, scheduled, deadline, completedAt, Obsidian (reference product: links, backlinks, tags, Markdown export), 4. Редактор, Backlinks, Editor content (headings, lists, tables, code, formulas, attachments, drawing blocks) (+10 more)

### Community 53 - "12. Функции по мотивам Craft (2)"
Cohesion: 0.25
Nodes (8): 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft, Связь с моделью данных

### Community 54 - "lib.rs"
Cohesion: 0.06
Nodes (16): DeepObserver, UpdateObserver, decoding(), diff_update(), is_inside(), merge_updates(), ORIGIN_LOCAL, origin_name() (+8 more)

### Community 55 - "4. Документ `note`"
Cohesion: 0.40
Nodes (5): 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note`

### Community 56 - "0036-space-notebook-folder.md"
Cohesion: 0.10
Nodes (24): Space { id, name, icon, color, order, createdAt } в account-документе, Organization Hierarchy (Account > Space > Notebook > Folder > Note), Проекты, личное, работа, учёба не смешиваются; минимум кнопок на экране, D-14. Организация: богатая, но не перегруженная, Предложенная структура: пространства → вложенные папки; поперёк — вложенные и умные теги, цвета, избранное, недавние, Решение, Поперёк структуры — теги, умные теги, избранное, недавние, D-36. Структура: пространство → блокноты → папки (+16 more)

### Community 57 - "strokes.md"
Cohesion: 0.17
Nodes (16): Comment { blockId, anchor (относительные позиции), author user | guest | agent, text, resolvedAt }, Блок drawing (высота в pt; штрихи — в strokes), anchorKind: text | block (заметка на полях) | image | drawing, Перепривязка якорей после отмены/повтора: в той же транзакции якорь удалённого символа с redone-элементом переписывается на относительную позицию нового элемента, Координаты block / image / drawing — в долях ширины блока, Координаты text-штриха: смещение от начала глифа якорного символа в em, Штрих почти неизменяем после рисования; ластик удаляет штрих целиком или заменяет кусками, Разрыв штриха по строкам: соседние точки на разных line fragments → отдельные сегменты (+8 more)

### Community 58 - "String"
Cohesion: 0.22
Nodes (4): CryptoAD, PasswordKeys, RecoveryKeyFormat, Clibsodium

### Community 59 - "Процесс разработки и Graphify (2)"
Cohesion: 0.13
Nodes (18): map_to_attrs(), value_to_any(), Container, container(), Element, Fragment, element(), index_paths() (+10 more)

### Community 60 - "Платформы и клиенты (2)"
Cohesion: 0.17
Nodes (11): 1. Концепция продукта, Notesnook (reference product: E2E encryption, reliable sync), Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения, Суть в одном абзаце, Datascratch (+3 more)

### Community 61 - "0009-notebook-mode-choice.md (5)"
Cohesion: 0.27
Nodes (7): TaskState, cancelled, done, open, NoteDerivedData, NoteLinkEntry, TaskEntry

### Community 62 - "Контракт: дизайн-токены «Тихая бумага» (v1) (2)"
Cohesion: 0.40
Nodes (5): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 63 - "0005-living-stroke.md"
Cohesion: 0.15
Nodes (15): Записываются только сглаженные coalesced-точки завершённого штриха, без predicted, Отрисовка после перекладки: якорь → абсолютная позиция (с учётом redone-элементов) → текущий прямоугольник глифа, Привязка к тексту: каждая точка → ближайший символ строки (живой штрих), Custom iOS Pen Render Layer (Metal or Core Animation), TextKit 2 (UIKit editor), PencilKit (rejected), Living Stroke, PencilKit / PKCanvasView (+7 more)

### Community 64 - "api.md"
Cohesion: 0.15
Nodes (16): Аккаунт и устройства: /me, /devices (отзыв сессий), удаление аккаунта, Эндпоинты /auth: prelogin, signup, login, refresh, logout, recovery, password, Аутентификация Bearer: accessToken 15 мин + refreshToken 30 дней с ротацией, Идентификаторы создаёт клиент (UUIDv7); повторный POST идемпотентен, иначе 409 conflict, Device { id, name, createdAt, lastSeenAt, current } — устройство (сессия) аккаунта, POST /shares/:id/guest — гостевой токен (без авторизации) для hello в синхронизации, GET /health → { ok: true, version } — служебная проверка сервера, PATCH /notebooks/:id/mode — включение режима «для агентов» передаёт notebookKey, выключение удаляет серверную обёртку (+8 more)

### Community 65 - "CryptoError"
Cohesion: 0.14
Nodes (12): CryptoError, decryptionFailed, invalidKeyLength, invalidRecoveryKey, kdfFailed, malformedEnvelope, sodiumInit, unsupportedKDF (+4 more)

### Community 66 - "NotebookDocument"
Cohesion: 0.06
Nodes (41): AccountDocument, .accountDocId, .activeTab, .dailyNotebookId, NotebookDocument, .inbox, .notebookId, Folder (+33 more)

### Community 67 - "04-editor.md (4)"
Cohesion: 0.14
Nodes (14): YOp, ArrayDelete, ArrayInsert, MapDelete, MapSet, RootTextDelete, RootTextInsert, TextDelete (+6 more)

### Community 68 - "Дизайн и организация (2) (2)"
Cohesion: 0.10
Nodes (5): CRDTDocument, .canRedo, .canUndo, .clientId, CRDTDocumentTests

### Community 69 - "0035-strokes-on-deleted-text.md"
Cohesion: 0.24
Nodes (10): Правило D-35 в отрисовке: точки удалённых символов не рисуются, штрих остаётся в документе; отмена возвращает пометку, D-35. Пометка на удалённом тексте исчезает вместе с ним, Вариант «потерянные пометки» — отклонён: лишний интерфейс, Частичное удаление: штрих «сжимается» до оставшегося текста, Вариант «прилипать к соседнему символу» — отклонён: пометка может оказаться не на том слове, Рукописная пометка исчезает вместе с удалённым текстом (пользователем, агентом, другим устройством), Рассмотренные варианты, Решение (+2 more)

### Community 70 - "0028-dev-workflow.md"
Cohesion: 0.18
Nodes (13): GitHub Actions CI (incl. macOS iOS builds), XcodeGen, docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, Последствия: ошибки сборки видны с задержкой CI; ощущение пера проверяет только пользователь на iPad (Pencil Pro), D-28. Процесс разработки: облако + Mac, сборка iOS в CI (+5 more)

### Community 71 - "Процесс разработки (docs/development.md)"
Cohesion: 0.21
Nodes (11): XcodeGen project.yml (D-28), Смешанный режим: облачные сессии (Linux, без Xcode) + Mac пользователя для сборки и iPad, D-23 (документация), D-19 (код пишет Claude), D-28 (облако + Mac, CI), GitHub Actions on macOS verifies iOS code written in the cloud, Процесс разработки (docs/development.md), Roles: user is product author/owner and checks pen feel on iPad; Claude writes all code and docs (+3 more)

### Community 72 - "0024-product-name.md"
Cohesion: 0.22
Nodes (9): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4.1. Перепривязка якорей (отмена и восстановление версии), 4.2. Когда штрих считается «осиротевшим» и удаляется навсегда, 4. Привязка к тексту (живой штрих), 5. Отрисовка толщины, 6. Тестовые векторы (+1 more)

### Community 73 - "Соглашения"
Cohesion: 0.40
Nodes (5): История, Как вносить изменения, Соглашения, Ссылки на решения, Статусы

### Community 74 - "8. Совместная работа и шеринг"
Cohesion: 0.40
Nodes (5): 8. Совместная работа и шеринг, Гости (D-37), Открыто (см. `open-questions.md`), Реализация, Требования

### Community 75 - "Контракт: шифрование (v1)"
Cohesion: 0.22
Nodes (9): 3. Apple Pencil в тексте — ключевая фича, Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера, Перекладка текста — вариант А «живой штрих» (D-05, РЕШЕНО) (+1 more)

### Community 77 - "10-sync.md"
Cohesion: 0.15
Nodes (13): История версий: GET /docs/:id/versions и /versions/:seq (зашифрованные снимки), Агенты не подключаются по WebSocket — работают через MCP/REST; сервер применяет их правки как обычные обновления, Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps, Agent edits applied immediately, highlighted, revertible via history (D-10), 10. Синхронизация и офлайн, Local storage: SQLite via GRDB (iOS), IndexedDB via Dexie (web), Agent notebooks: server decrypts and applies agent edit as a normal update, Version history: snapshots, view, rollback (+5 more)

### Community 78 - "Block"
Cohesion: 0.13
Nodes (11): Block, .blockId, .isKnown, .isTextBlock, .text, .xml, BlockType, Inline (+3 more)

### Community 79 - "Решения по анкетам пользователя: D-32…D-41 и PDF после MVP (D-08)"
Cohesion: 0.27
Nodes (9): D-32. Минимальная версия iOS/iPadOS — 26, Минимальная версия iOS/iPadOS 26 (IPHONEOS_DEPLOYMENT_TARGET = 26.0), Liquid Glass — системный дизайн iOS 26, Отклонённые варианты: iOS 18+ (шире охват) и 17.5+ (минимум для Pencil Pro), Последствия, Рассмотренные варианты, Решение, CLOSED: minimum iOS 26+ (D-32); XcodeGen accepted (D-39); Bundle ID (D-33); paid Apple Developer account exists (+1 more)

### Community 80 - "D-04. Одновременно сквозное шифрование и доступ по API"
Cohesion: 0.50
Nodes (4): D-04. Одновременно сквозное шифрование и доступ по API, Контекст, Последствия, Решение

### Community 81 - "12-craft-features.md"
Cohesion: 0.20
Nodes (14): apps/web — веб-клиент, Stream web-app (claude/web-app): apps/web — web shell: login, sidebar, spaces/notebooks/folders, tasks, calendar, sharing, offline, PWA, Calendar screen: day feed with tasks and daily note (MVP); system calendar integration after MVP, Card document: nested document shown as a card with cover (MVP), Collections: records with properties and table / gallery / kanban views with filter, sort, grouping (after MVP), Daily note: one per day, created on demand, from template (MVP), Document cover image with offset (MVP), Document style: font (serif/sans/mono), width, paper (smooth/dots/grid/ruled), backdrop color or gradient, text color; style gallery after MVP (+6 more)

### Community 82 - "D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время"
Cohesion: 0.67
Nodes (3): D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Последствия, Решение

### Community 83 - "D-29. Graphify: порядок работы, чтобы граф был всегда актуален"
Cohesion: 0.40
Nodes (5): D-05. Перо при перекладке текста — вариант А «живой штрих», Гипотеза реализации, Контекст, Последствия, Решение

### Community 84 - "0026-file-storage.md"
Cohesion: 0.24
Nodes (10): D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Server disk folder storage (default), External S3-compatible storage (Hetzner, R2, B2), File storage interface (two implementations, chosen by config), Garage / SeaweedFS, MinIO (rejected), Контекст, Последствия (+2 more)

### Community 85 - "Datascratch — правила для ИИ (CLAUDE.md)"
Cohesion: 0.18
Nodes (9): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, docs/history session log (+1 more)

### Community 86 - "open-questions.md"
Cohesion: 0.20
Nodes (10): D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст, Решение, Bundle ID com.datascratch.app, D-33. Bundle ID — com.datascratch.app, Решение (+2 more)

### Community 87 - "design-tokens.md"
Cohesion: 0.27
Nodes (13): Подложки backdrop.* (sand, dusk, mist, meadow, ember) — мягкие градиенты в духе Craft, Цветовые токены: bg.canvas («бумага»), text.primary («чернила»), accent («синие чернила»), danger/success/warning — светлая и тёмная тема, Ширина колонки документа: normal 720, wide 960, full, Тактильная отдача iOS: selection, success (задача выполнена), warning (удаление), Чернила пера ink.* (black, blue, red, green, purple, brown) и маркеры highlight.*, Движение: пружины motion.snappy / smooth / gentle, длительности duration.* для веба, Сетка отступов 4 pt, радиусы radius.*, тени shadow.card / shadow.popover, Цвета tint.* (.fg / .bg) для папок, тегов и выносок (+5 more)

### Community 88 - "02-platforms.md"
Cohesion: 0.11
Nodes (17): iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), D-06. Рисование пальцем на iPhone — да, опционально, Finger drawing toggle on iPhone, Решение, D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, 2. Платформы (+9 more)

### Community 89 - "String"
Cohesion: 0.14
Nodes (7): InMemorySecretStore, KeychainSecretStore, KeyRing, SecretStore, SecretStoreError, keychain, Security

### Community 90 - "План разработки"
Cohesion: 0.15
Nodes (13): Критерии приёмки, План разработки, Подготовка, Потоки разработки (D-39), Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad) (+5 more)

### Community 92 - "decisions/README.md"
Cohesion: 0.09
Nodes (25): VPS Hosting (Hetzner or similar), Решения по анкетам пользователя: D-32…D-41 и PDF после MVP (D-08), D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, D-08. Аннотации PDF пером — не в MVP, Аннотации PDF пером (PDFKit + свой слой штрихов) — после MVP, этап расширений, Решение (+17 more)

### Community 93 - "Контракт: шифрование (v1)"
Cohesion: 0.20
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 94 - "0003-platforms.md"
Cohesion: 0.17
Nodes (9): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, D-03. Платформы: нативные iPhone и iPad + полноценный веб, Full-featured web client (TypeScript), Контекст, Последствия, Решение (+1 more)

### Community 96 - "Контракт: REST API сервера (v1)"
Cohesion: 0.22
Nodes (9): Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1), Общее, Служебное, Токены агентов (`spec/09-agents-api.md`) (+1 more)

### Community 97 - "Контракт: протокол синхронизации (v1)"
Cohesion: 0.22
Nodes (9): 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05), 6. Права, 7. Коды ошибок, 8. Тестовые векторы (+1 more)

### Community 98 - "0038-design-quiet-paper.md"
Cohesion: 0.11
Nodes (18): Ежедневные заметки и «Входящие» (kind daily / inbox) в блокноте settings.dailyNotebookId, D-15. Дизайн — основная концепция продукта, Design references: Things 3, Linear, Craft, Arc, Последствия, Решение, Ориентир Craft: градиентные подложки, документы-карточки с обложками, боковая панель «Вкладки / Избранное / Папки / Теги», стеклянные панели, контекстные меню, D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Вариант «графит по умолчанию» — отклонён: чернила на тёмном читаются хуже (+10 more)

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

### Community 104 - "Stream design-system (claude/design-system): packages/design-tokens, packages/ui, apps/ios/Packages/DSDesign — Quiet Paper tokens, web and SwiftUI components"
Cohesion: 0.24
Nodes (8): Radix + Tailwind + Motion Design System, SwiftUI, Stream design-system (claude/design-system): packages/design-tokens, packages/ui, apps/ios/Packages/DSDesign — Quiet Paper tokens, web and SwiftUI components, UI implementation: SwiftUI shell with tokens in code on iOS; Radix + Tailwind + Motion on web, packages/design-tokens — дизайн-токены «Тихая бумага», tokens.json as source of Quiet Paper design token values; generators to CSS variables (web) and Swift (iOS), packages/ui — веб-компоненты дизайн-системы, React design-system components on Radix + Tailwind + Motion in Quiet Paper style

### Community 105 - "7. Шифрование и доступ агентов"
Cohesion: 0.29
Nodes (7): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Вход и восстановление доступа (D-34), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 106 - ".keyHierarchy"
Cohesion: 0.32
Nodes (4): KDFParams, PasswordChangeMaterial, SignupMaterial, CryptoTests

### Community 110 - "Процесс разработки"
Cohesion: 0.33
Nodes (6): Git, Две среды, Конец сессии, Кто что делает, Правила для сессий-исполнителей (D-39), Процесс разработки

### Community 111 - "Модель данных — ЧЕРНОВИК"
Cohesion: 0.40
Nodes (5): Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3), Штрих (черновик для прототипа)

### Community 118 - "D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления"
Cohesion: 0.50
Nodes (4): D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления, Контекст, Рассмотренные варианты, Решение

## Knowledge Gaps
- **204 isolated node(s):** `PackageDescription`, `YrsFFI`, `account`, `notebook`, `note` (+199 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 640 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Контракт: модель документа (v1)` connect `NotebookDocument` to `4. Документ `note``, `Контракт: модель документа (v1)`?**
  _High betweenness centrality (0.311) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `NoteDocument` (e.g. with `.strokesRoundTripAndResolveAnchors()` and `.undoRestoresTextAndStrokeAnchors()`) actually correct?**
  _`NoteDocument` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PackageDescription`, `YrsFFI`, `account` to the rest of the system?**
  _204 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `0039-parallel-sessions.md` be split into smaller, more focused modules?**
  _Cohesion score 0.10826210826210826 - nodes in this community are weakly interconnected._
- **Why does `DocKind` connect `LocalStore` to `Stroke`, `String`, `NotebookDocument`, `Дизайн и организация (2) (2)`, `D-41. Набор функций по мотивам Craft`, `Hint`, `0009-notebook-mode-choice.md (5)`?**
  _High betweenness centrality (0.186) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `CRDTDocument` (e.g. with `.readsDocumentWrittenByYjs()` and `.syncsTwoDocumentsAndUndoesLocalEdits()`) actually correct?**
  _`CRDTDocument` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `0011-handwriting-for-agents.md` be split into smaller, more focused modules?**
  _Cohesion score 0.08994708994708994 - nodes in this community are weakly interconnected._