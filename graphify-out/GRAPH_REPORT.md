# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 128 files · ~49,617 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 6, .resolved 1)

## Summary
- 2105 nodes · 4764 edges · 121 communities (108 shown, 13 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 676 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ea883364`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- 0039-parallel-sessions.md
- sync-protocol.md
- String
- 0018-monetization.md
- 0011-handwriting-for-agents.md
- glossary.md
- roadmap.md
- stack.md
- 0031-crdt-yjs.md
- Правила для ИИ и документации
- crypto.md
- 0005-living-stroke.md
- CHANGELOG.md
- DSCrypto
- Правила для ИИ и документации (2) (2)
- Контракт: модель документа (v1)
- risks.md
- TransactionOrigin
- 04-editor.md
- Модель данных и глоссарий (2)
- 0009-notebook-mode-choice.md (2)
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
- Дизайн и организация
- План этапов и отложенное
- contracts/README.md
- 0025-no-redis.md
- open-questions.md (2)
- Контракт: модель документа (v1) (2)
- Модель данных и глоссарий (5)
- generate.mjs
- tasks
- Контракт: шифрование (v1)
- LocalStore
- 0004-encryption-and-api.md
- Процесс разработки (docs/development.md)
- Монорепозиторий и CLAUDE.md (2)
- YDocument
- Data
- D-41. Набор функций по мотивам Craft
- Технологический стек — РЕШЕНО (2026-10-25)
- yjs_compat.rs
- 04-editor.md
- 12. Функции по мотивам Craft (2)
- Обзор архитектуры: разделы
- D-38. Дизайн-направление — «Тихая бумага», ориентир Craft
- 0036-space-notebook-folder.md
- strokes.md
- String
- Процесс разработки и Graphify (2)
- Платформы и клиенты (2)
- 0009-notebook-mode-choice.md (5)
- Контракт: дизайн-токены «Тихая бумага» (v1) (2)
- Stage 4: Web Client
- api.md
- CryptoError
- D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS)
- 04-editor.md (4)
- Дизайн и организация (2) (2)
- D-35. Пометка на удалённом тексте исчезает вместе с ним
- 0028-dev-workflow.md
- Процесс разработки (docs/development.md)
- 0024-product-name.md
- RootRef
- .observe_deep
- Контракт: шифрование (v1)
- pnpm-workspace.yaml
- 10-sync.md
- Block
- Решения по анкетам пользователя: D-32…D-41 и PDF после MVP (D-08)
- Stage 1: pen-in-text prototype on iPad (TextKit 2 + Yrs + pen layer, living stroke)
- 12-craft-features.md
- KeychainSecretStore
- D-29. Graphify: порядок работы, чтобы граф был всегда актуален
- 06-data-server.md
- Datascratch — правила для ИИ (CLAUDE.md)
- open-questions.md
- design-tokens.md
- 02-platforms.md
- String
- План разработки
- .xml_root
- 0008-pdf-annotations.md
- Контракт: шифрование (v1)
- 0003-platforms.md
- StorageTests
- Контракт: REST API сервера (v1)
- Контракт: протокол синхронизации (v1)
- 0041-craft-inspired-features.md
- 0011-handwriting-for-agents.md
- Открытые вопросы
- Datascratch — правила для ИИ
- build-xcframework.sh
- Обзор архитектуры
- Stream design-system (claude/design-system): packages/design-tokens, packages/ui, apps/ios/Packages/DSDesign — Quiet Paper tokens, web and SwiftUI components
- 7. Шифрование и доступ агентов
- KDFParams
- git-хук Graphify (пересборка только по изменённому коду)
- 0002-no-desktop-app.md
- DSCore
- Процесс разработки
- Модель данных — ЧЕРНОВИК
- 2. Платформы
- 4. Редактор
- build-linux.sh
- generate-bindings.sh
- 5. Организация заметок и дизайн
- D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления
- D-39. Разработка параллельными сессиями; Claude сам вливает в main
- yrs-ffi

## God Nodes (most connected - your core abstractions)
1. `TransactionOrigin` - 69 edges
2. `NoteDocument` - 50 edges
3. `CRDTDocument` - 41 edges
4. `YrsError` - 40 edges
5. `YDocument` - 37 edges
6. `NotebookDocument` - 33 edges
7. `AccountDocument` - 29 edges
8. `Block` - 28 edges
9. `LocalStore` - 28 edges
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
- `3. Документ `notebook` (индекс блокнота)` --references--> `NoteMeta`  [INFERRED]
  docs/architecture/contracts/document-model.md → apps/ios/Packages/DSCore/Sources/DSCore/Model/Records.swift

## Import Cycles
- 2-file cycle: `apps/ios/Packages/DSCore/yrs-ffi/src/lib.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/xml.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/lib.rs`
- 3-file cycle: `apps/ios/Packages/DSCore/yrs-ffi/src/events.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/xml.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/lib.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/events.rs`

## Communities (121 total, 13 thin omitted)

### Community 0 - "0039-parallel-sessions.md"
Cohesion: 0.22
Nodes (15): apps/ios — iPhone + iPad, apps/server — сервер, Claude coordinator merges stream branches into main when CI is green, Coordinator session (merges branches into main, owns roadmap.md, CHANGELOG.md and contracts), Stream agents (claude/agents): packages/agents, agents-api contract draft — MCP, REST, tokens, log, PNG render, Stream core (claude/core): packages/shared, packages/test-vectors, root configs — contract types, crypto, stroke codec, document schema, sync client, test vectors, Stream ios-app (claude/ios-app): apps/ios — XcodeGen project, Craft-style SwiftUI shell, navigation, tasks, calendar, settings, Stream ios-core (claude/ios-core): apps/ios/Packages/DSCore — Swift crypto, Yrs document model, GRDB, sync and API client (+7 more)

### Community 1 - "sync-protocol.md"
Cohesion: 0.22
Nodes (17): Формат ошибок { error: { code, message } } и коды bad_request…internal, ack — обновление или снимок принят и сохранён (docId, clientMsgId, seq), Коды ошибок синхронизации: unauthorized, forbidden, doc_not_found, payload_too_large (2 MiB / 50 MiB), rate_limited, protocol_mismatch, internal, error — сообщение сервера: code, message, ref? (clientMsgId / docId), Клиент хранит lastSeq по каждому документу и догоняет недостающее при подключении, Сервер не присылает клиенту его собственные обновления (кроме updates при догоняющей подписке с другого устройства), Офлайн: обновления копятся в локальной очереди до подтверждения ack, Лимиты payload_too_large: обновление 2 MiB, снимок 50 MiB — считаются декодированные байты, не base64 (+9 more)

### Community 2 - "String"
Cohesion: 0.09
Nodes (14): .formatVersion, .formatVersion, Backdrop, .yValue, Comment, Cover, .value, Kind (+6 more)

### Community 3 - "0018-monetization.md"
Cohesion: 0.17
Nodes (11): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, PostgreSQL, Контекст (+3 more)

### Community 4 - "0011-handwriting-for-agents.md"
Cohesion: 0.11
Nodes (21): Журнал действий агента GET /agent-tokens/:id/audit, AgentToken { id, name, notebookIds, permission, expiresAt, createdAt, lastUsedAt } — без секрета, Токены агентов /agent-tokens: блокноты, read / read_write, срок; токен показывается один раз, Контракт agents-api.md (MCP и REST для самих агентов) — появится на этапе агентов, blockId (UUIDv7) у каждого блочного узла — для точечных правок агентов, заметок на полях и комментариев, pg-boss background job queue on PostgreSQL, PostgreSQL via Drizzle (D-30): accounts, notebooks, rights, tokens, encrypted updates, snapshots, agent log, Local MCP bridge (future): utility on user computer holding the key so local agents can reach private notebooks (+13 more)

### Community 5 - "glossary.md"
Cohesion: 0.12
Nodes (25): agent_tokens / agent_audit_log Tables, Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, File Storage (disk or external S3), Guest via Link (web, no account), Handwriting-to-PNG Render (pg-boss queue) (+17 more)

### Community 6 - "roadmap.md"
Cohesion: 0.09
Nodes (25): D-19. Весь код пишет Claude, Последствия, Решение, D-23. Документация — источник истины; Graphify — граф знаний поверх неё, Контекст, Последствия, Решение, ADR file number equals decision number (D-05 -> 0005-*.md), template 0000-template.md (+17 more)

### Community 7 - "stack.md"
Cohesion: 0.09
Nodes (35): Транспорт wss://<host>/v1/sync: JSON-кадры с type, base64url, ping/pong каждые 25 с, doc_snapshots Table (compacted snapshots, version history), doc_updates Table (encrypted Yjs updates), Server PostgreSQL Schema (Stage 3 Draft), iOS / iPadOS Client (Swift, TextKit 2, Yrs, GRDB), Private Notebook Edit Flow, Sync / Realtime Service, Web PWA Client (React, TipTap, Yjs, IndexedDB) (+27 more)

### Community 8 - "0031-crdt-yjs.md"
Cohesion: 0.08
Nodes (36): Automerge (fallback CRDT), Yrs (Rust Yjs) with Swift Wrapper, Утверждён технологический стек (D-21), отказ от ядра на Rust (D-22), Custom pen renderer (Metal vs Core Animation TBD), D-21. Технологический стек, End-to-end encryption, GRDB (SQLite), iOS client stack (+28 more)

### Community 9 - "Правила для ИИ и документации"
Cohesion: 0.25
Nodes (6): D-29. Graphify: порядок работы, чтобы граф был всегда актуален, R-09 (риск: Graphify сломается или исчезнет), Контекст, Последствия, Решение, graphify-out/ layout: what is committed (graph.json, report, html, manifest, cache) vs machine-local (.gitignore)

### Community 10 - "crypto.md"
Cohesion: 0.11
Nodes (31): Вложения: загрузка и докачка по кускам (/attachments/:id/chunks/:index), лимит 200 МБ, Ассоциированные данные ds1|… привязывают шифротекст к месту (doc, awareness, ключи, куски вложений), Вложения шифруются кусками по 1 MiB, каждый — отдельный конверт, Конверт шифротекста: версия 0x01 + nonce 24 байта + XChaCha20-Poly1305-IETF (тег 16 байт), Иерархия ключей: пароль → passwordKey → masterKey → notebookKey → noteKey, libsodium на всех платформах (libsodium-wrappers-sumo в TS, swift-sodium в iOS), loginKey = BLAKE2b(authSeed, "ds1|login"); сервер хранит Argon2id(loginKey), noteKey — ключ заметки: шифрует note-документ и вложения (+23 more)

### Community 11 - "0005-living-stroke.md"
Cohesion: 0.18
Nodes (9): Штрих почти неизменяем после рисования; ластик удаляет штрих целиком или заменяет кусками, D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, Handwriting input types (text marks, margin notes, drawing block, drawing on images, Scribble), Pencil gestures (zigzag delete, underline, strike, lasso), Stroke point anchoring: character anchor + dx/dy in font-size units, System Scribble only; no recognition of drawn ink (D-07) (+1 more)

### Community 12 - "CHANGELOG.md"
Cohesion: 0.10
Nodes (30): pnpm + Turborepo Monorepo, 2026-10-25, 2026-10-25 (вторая половина дня), Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально (+22 more)

### Community 14 - "Правила для ИИ и документации (2) (2)"
Cohesion: 0.26
Nodes (7): Скрипт tools/graphify_docs.py (prepare → агенты → finish), Stream sessions write changelog fragments in docs/changelog.d/ instead of editing CHANGELOG.md; stream history files docs/history/YYYY-MM-DD-<stream>-NN.md, Graph update after doc edits: graphify_docs.py prepare -> parallel extraction agents -> finish -> graphify export html -> check-update, Extraction prompt .claude/skills/graphify/references/extraction-spec.md, Git: English code/commits, Russian docs, branches + PR, one commit = code + docs + updated graph, Rules for stream executor sessions (D-39): own branch and directories, contracts via coordinator, merge main regularly, green stream CI, deps only in own package, report to coordinator, Как вносить изменения — spec/architecture, ADR, CHANGELOG, roadmap, граф — в одном коммите

### Community 15 - "Контракт: модель документа (v1)"
Cohesion: 0.13
Nodes (24): masterKey — 32 случайных байта, создаётся при регистрации, шифрует account-документ, y-prosemirror не записывает атрибуты узлов со значением null: отсутствующий атрибут = null (значение по умолчанию схемы), Документ account: spaces, notebooks, settings, starred, tabs (ключ — masterKey), Comment { blockId, anchor (относительные позиции), author user | guest | agent, text, resolvedAt }, Даты ISO 8601 в UTC; «только дата» YYYY-MM-DD; миллисекунды — только в штрихах, Векторы совместимости модели документа packages/test-vectors/document/* (iOS/Yrs обязан читать и писать формат y-prosemirror), Блок drawing (высота в pt; штрихи — в strokes), Вставка текста в Y.XmlText без явных атрибутов наследует форматирование слева (Yjs/Yrs) — писатели всегда передают явный набор атрибутов (+16 more)

### Community 16 - "risks.md"
Cohesion: 0.16
Nodes (13): Canvas + Pointer Events Pen Layer, Платный аккаунт Apple Developer; Team ID задаётся на Mac при первой подписи, в репозитории не хранится, Universal Links, Apple Developer Account, R-07 Web Pen Worse than Native, R-08 Huge Project Scope, R-12 No Paid Apple Account (7-day installs), Риски (+5 more)

### Community 17 - "TransactionOrigin"
Cohesion: 0.11
Nodes (13): TransactionOrigin, .description, .isOutgoing, local, other, remote, storage, system (+5 more)

### Community 18 - "04-editor.md"
Cohesion: 0.13
Nodes (10): AttachmentRecord, .missingChunks, .uploaded, LocalStore, SearchHit, State, pendingUpload, remote (+2 more)

### Community 19 - "Модель данных и глоссарий (2)"
Cohesion: 0.24
Nodes (9): meta.formatVersion = 1; документ новее клиента открывается только для чтения (R-03), Версионирование контрактов v1, v2…; ломающее изменение — новая версия с явной миграцией, Поля штриха: v, tool, color, width, opacity, anchorKind, blockId, anchors, points, hint, author, createdAt, Anchor (textRange / paragraph / drawingBlock / image), Note, Stroke, StrokePoint, RelativePosition (CRDT) (+1 more)

### Community 20 - "0009-notebook-mode-choice.md (2)"
Cohesion: 0.14
Nodes (7): NotebookDocument, .inbox, .notebookId, NoteMeta, .fields, .isTrashed, IndexDocumentTests

### Community 21 - "08-sharing.md"
Cohesion: 0.10
Nodes (27): POST /docs — регистрация документа (account / notebook / note) до первого push, Share { id, target { kind, id }, permission, expiresAt, createdAt } — ссылка шеринга, Шеринг: /shares (view/edit, бессрочно по умолчанию, отзыв сразу отключает гостей), Ссылка шеринга /s/<shareId>#k=<ключ> — ключ в части после #, не уходит на сервер, awareness — курсоры и присутствие: зашифровано, не хранится, только рассылается, Права: user — документы своего аккаунта; guest — только документы шеринга, push только с правом edit, D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account (+19 more)

### Community 22 - "0001-storage-in-database.md"
Cohesion: 0.21
Nodes (9): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты, Решение (+1 more)

### Community 23 - "Monorepo layout (apps/ios, apps/web, apps/server, packages, infra)"
Cohesion: 0.17
Nodes (8): apps/web — веб-клиент, packages/shared — общие TypeScript-типы и схемы, packages/test-vectors — общие тестовые векторы, Datascratch, For non-Russian readers, Monorepo layout (apps/ios, apps/web, apps/server, packages, infra), Где что лежит, Текущий статус

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
Cohesion: 0.11
Nodes (8): InlineLocation, NoteDocument, .isReadOnly, .noteId, RunPiece, node, text, NoteDocumentTests

### Community 28 - "Hint"
Cohesion: 0.11
Nodes (18): AnchorKind, block, drawing, image, text, Hint, arrow, circle (+10 more)

### Community 29 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.07
Nodes (28): ArrayDelta, Delete, Insert, Retain, convert(), DeepObserver, path(), sorted_keys() (+20 more)

### Community 31 - "tests.rs"
Cohesion: 0.21
Nodes (16): arrays_and_errors(), Collect, local(), merge_and_diff_updates(), nested_maps_merge_per_field(), note_roots(), observers_report_paths_deltas_and_origins(), paragraph() (+8 more)

### Community 32 - "Stroke"
Cohesion: 0.12
Nodes (15): Author, .value, Kind, agent, guest, user, ResolvedStrokeSegment, Stroke (+7 more)

### Community 33 - "Дизайн и организация"
Cohesion: 0.17
Nodes (12): Проекты, личное, работа, учёба не смешиваются; минимум кнопок на экране, D-15. Дизайн — основная концепция продукта, Design references: Things 3, Linear, Craft, Arc, Последствия, Решение, Ориентир Craft: градиентные подложки, документы-карточки с обложками, боковая панель «Вкладки / Избранное / Папки / Теги», стеклянные панели, контекстные меню, Light/dark theme, Dynamic Type, VoiceOver, full iPad keyboard support, Feel references: Things 3, Linear, Craft, Arc (+4 more)

### Community 34 - "План этапов и отложенное"
Cohesion: 0.07
Nodes (9): DSDate, EntityID, Locked, Fixture, UtilTests, DSCore, Foundation, PackageDescription (+1 more)

### Community 35 - "contracts/README.md"
Cohesion: 0.22
Nodes (9): Тестовые векторы crypto: KDF, конверты, Base32 ключа восстановления, куски вложений (Swift и TS), Контракт — точное описание формата/протокола, который реализуют несколько частей (iOS на Swift, веб и сервер на TS), Совместимость доказывается общими тестовыми векторами (packages/test-vectors), Типы TypeScript контрактов в packages/shared/src/contracts/ — часть контракта, Контракты между частями системы, Правила изменения, Тестовые векторы strokes: упаковка точек, разрешение якорей после правок, правило D-35, Тестовые векторы sync: примеры всех сообщений в JSON (схема проверяется в TS и Swift) (+1 more)

### Community 36 - "0025-no-redis.md"
Cohesion: 0.09
Nodes (25): Canvas + Pointer Events, Dexie (IndexedDB), Drizzle ORM, Fastify, MCP TypeScript SDK, OAuth 2.1, pg-boss job queue, Radix + Tailwind + Motion (+17 more)

### Community 37 - "open-questions.md (2)"
Cohesion: 0.09
Nodes (14): XmlNode, .attributes, .children, .elementName, .textContent, YValue, .boolValue, .dataValue (+6 more)

### Community 38 - "Контракт: модель документа (v1) (2)"
Cohesion: 0.06
Nodes (35): concurrency, cancel-in-progress, group, defaults, run, name, runs-on, steps (+27 more)

### Community 39 - "Модель данных и глоссарий (5)"
Cohesion: 0.29
Nodes (7): Graphify, Автоматизация, Команды, Обновление графа после правки документов (по шагам), Почему два способа обновления, Установка на Mac (один раз), Что где лежит

### Community 40 - "generate.mjs"
Cohesion: 0.07
Nodes (28): b64(), content, doc, firstRun, fixture, json, para, rel() (+20 more)

### Community 41 - "tasks"
Cohesion: 0.18
Nodes (10): dependsOn, outputs, $schema, tasks, build, lint, test, typecheck (+2 more)

### Community 42 - "Контракт: шифрование (v1)"
Cohesion: 0.12
Nodes (14): check_text_range(), decoding(), diff_update(), merge_updates(), mismatch(), missing_map(), nested_map(), state_vector_from_update() (+6 more)

### Community 43 - "LocalStore"
Cohesion: 0.08
Nodes (15): DocKind, account, note, notebook, .roots, DocumentRecord, Kind, push (+7 more)

### Community 44 - "0004-encryption-and-api.md"
Cohesion: 0.20
Nodes (11): PATCH /notebooks/:id/mode — включение режима «для агентов» передаёт notebookKey, выключение удаляет серверную обёртку, Режим «для агентов»: клиент передаёт notebookKey по TLS, сервер оборачивает его serverKey; расшифровка только при запросе агента с токеном, serverKey — 32 байта из DS_KMS_KEY (окружение сервера, не в базе), D-04. Одновременно сквозное шифрование и доступ по API, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), Контекст, Последствия (+3 more)

### Community 45 - "Процесс разработки (docs/development.md)"
Cohesion: 0.20
Nodes (9): Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps, Daily off-VPS backups of DB and files with verified restore (R-11), 11. Нефункциональные требования, Performance targets (PencilKit latency, 120 fps, 300 ms open, 1-min first sync, 2 s delivery, 1 s cold start), Reliability: no edit lost on network drop, crash or low storage, Доступность, Надёжность, Ресурсы сервера (+1 more)

### Community 46 - "Монорепозиторий и CLAUDE.md (2)"
Cohesion: 0.09
Nodes (16): attrs_to_map(), value_to_in(), YValue, BigInt, Bool, Bytes, List, Null (+8 more)

### Community 48 - "Data"
Cohesion: 0.15
Nodes (7): CRDTUpdates, .jsonObject, .fields, Base64URL, Base64URLData, Data, .hexString

### Community 49 - "D-41. Набор функций по мотивам Craft"
Cohesion: 0.14
Nodes (4): CRDTSubscription, DeepHandler, UpdateHandler, YrsFFI

### Community 50 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 51 - "yjs_compat.rs"
Cohesion: 0.19
Nodes (12): b64(), el(), empty(), fixture(), normalize(), reads_yjs_document(), roots(), s() (+4 more)

### Community 52 - "04-editor.md"
Cohesion: 0.14
Nodes (15): iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), Схема блоков: doc = title block+ (paragraph, heading, списки, taskList, callout, codeBlock, mathBlock, mermaid, table, image, file, drawing, pageCard), Производные данные строятся локально: индекс задач, полнотекстовый поиск, бэклинки, теги, Inline-узлы noteLink ([[ ]]) и tag (без #, вложенность через /), taskItem: taskId, state open / done / cancelled, scheduled, deadline, completedAt, Obsidian (reference product: links, backlinks, tags, Markdown export), iPhone and iPad share one codebase (universal app), Backlinks (+7 more)

### Community 53 - "12. Функции по мотивам Craft (2)"
Cohesion: 0.25
Nodes (8): 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft, Связь с моделью данных

### Community 55 - "D-38. Дизайн-направление — «Тихая бумага», ориентир Craft"
Cohesion: 0.33
Nodes (6): D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Вариант «графит по умолчанию» — отклонён: чернила на тёмном читаются хуже, Вариант «чистый нейтральный» (Linear / Things) — не выбран, Тёмная тема — тёплый графит, Рассмотренные варианты, Решение

### Community 56 - "0036-space-notebook-folder.md"
Cohesion: 0.13
Nodes (21): NotebookRef { id, spaceId, name, mode: private | agent, … } — ключ блокнота здесь не хранится, Space { id, name, icon, color, order, createdAt } в account-документе, Organization Hierarchy (Account > Space > Notebook > Folder > Note), D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, D-14. Организация: богатая, но не перегруженная, Предложенная структура: пространства → вложенные папки; поперёк — вложенные и умные теги, цвета, избранное, недавние, Решение (+13 more)

### Community 57 - "strokes.md"
Cohesion: 0.12
Nodes (27): Контракт меняет только сессия-координатор; исполнитель присылает предложение, Перепривязка якорей после отмены/повтора: в той же транзакции якорь удалённого символа с redone-элементом переписывается на относительную позицию нового элемента, Координаты block / image / drawing — в долях ширины блока, Обводки и стрелки «растягиваются» вместе с текстом; при проблемах — изменение контракта через координатора, Правило D-35 в отрисовке: точки удалённых символов не рисуются, штрих остаётся в документе; отмена возвращает пометку, Координаты text-штриха: смещение от начала глифа якорного символа в em, Записываются только сглаженные coalesced-точки завершённого штриха, без predicted, Разрыв штриха по строкам: соседние точки на разных line fragments → отдельные сегменты (+19 more)

### Community 58 - "String"
Cohesion: 0.21
Nodes (4): CryptoAD, PasswordKeys, RecoveryKeyFormat, Clibsodium

### Community 59 - "Процесс разработки и Graphify (2)"
Cohesion: 0.13
Nodes (21): chunk(), map_to_attrs(), value_to_any(), Container, container(), Element, Fragment, element() (+13 more)

### Community 60 - "Платформы и клиенты (2)"
Cohesion: 0.20
Nodes (8): D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, 1. Концепция продукта, Notesnook (reference product: E2E encryption, reliable sync), Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения, Суть в одном абзаце

### Community 61 - "0009-notebook-mode-choice.md (5)"
Cohesion: 0.31
Nodes (7): TaskState, cancelled, done, open, NoteDerivedData, NoteLinkEntry, TaskEntry

### Community 62 - "Контракт: дизайн-токены «Тихая бумага» (v1) (2)"
Cohesion: 0.40
Nodes (5): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 63 - "Stage 4: Web Client"
Cohesion: 0.33
Nodes (5): Отрисовка после перекладки: якорь → абсолютная позиция (с учётом redone-элементов) → текущий прямоугольник глифа, Привязка к тексту: каждая точка → ближайший символ строки (живой штрих), PencilKit (rejected), Living Stroke, Reflow

### Community 64 - "api.md"
Cohesion: 0.17
Nodes (15): Аккаунт и устройства: /me, /devices (отзыв сессий), удаление аккаунта, Эндпоинты /auth: prelogin, signup, login, refresh, logout, recovery, password, Аутентификация Bearer: accessToken 15 мин + refreshToken 30 дней с ротацией, Идентификаторы создаёт клиент (UUIDv7); повторный POST идемпотентен, иначе 409 conflict, Device { id, name, createdAt, lastSeenAt, current } — устройство (сессия) аккаунта, POST /shares/:id/guest — гостевой токен (без авторизации) для hello в синхронизации, GET /health → { ok: true, version } — служебная проверка сервера, Notebook { id, mode, createdAt, wrappedKey } — ответ /notebooks (+7 more)

### Community 65 - "CryptoError"
Cohesion: 0.14
Nodes (12): CryptoError, decryptionFailed, invalidKeyLength, invalidRecoveryKey, kdfFailed, malformedEnvelope, sodiumInit, unsupportedKDF (+4 more)

### Community 66 - "D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS)"
Cohesion: 0.10
Nodes (35): Folder, .fields, Kind, folder, note, notebook, MapRecord, NotebookMode (+27 more)

### Community 67 - "04-editor.md (4)"
Cohesion: 0.14
Nodes (14): YOp, ArrayDelete, ArrayInsert, MapDelete, MapSet, RootTextDelete, RootTextInsert, TextDelete (+6 more)

### Community 68 - "Дизайн и организация (2) (2)"
Cohesion: 0.11
Nodes (5): CRDTDocument, .canRedo, .canUndo, .clientId, CRDTDocumentTests

### Community 69 - "D-35. Пометка на удалённом тексте исчезает вместе с ним"
Cohesion: 0.67
Nodes (3): D-35. Пометка на удалённом тексте исчезает вместе с ним, Рассмотренные варианты, Решение

### Community 70 - "0028-dev-workflow.md"
Cohesion: 0.14
Nodes (14): GitHub Actions CI (incl. macOS iOS builds), XcodeGen, docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, Последствия: ошибки сборки видны с задержкой CI; ощущение пера проверяет только пользователь на iPad (Pencil Pro), D-28. Процесс разработки: облако + Mac, сборка iOS в CI (+6 more)

### Community 71 - "Процесс разработки (docs/development.md)"
Cohesion: 0.16
Nodes (14): XcodeGen project.yml (D-28), Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, docs/history session log, Смешанный режим: облачные сессии (Linux, без Xcode) + Mac пользователя для сборки и iPad, D-23 (документация), D-19 (код пишет Claude), D-28 (облако + Mac, CI), GitHub Actions on macOS verifies iOS code written in the cloud (+6 more)

### Community 72 - "0024-product-name.md"
Cohesion: 0.22
Nodes (9): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4.1. Перепривязка якорей (отмена и восстановление версии), 4.2. Когда штрих считается «осиротевшим» и удаляется навсегда, 4. Привязка к тексту (живой штрих), 5. Отрисовка толщины, 6. Тестовые векторы (+1 more)

### Community 73 - "RootRef"
Cohesion: 0.15
Nodes (11): RootDef, RootKind, Array, Map, Text, XmlFragment, RootRef, Array (+3 more)

### Community 75 - "Контракт: шифрование (v1)"
Cohesion: 0.22
Nodes (9): 3. Apple Pencil в тексте — ключевая фича, Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера, Перекладка текста — вариант А «живой штрих» (D-05, РЕШЕНО) (+1 more)

### Community 77 - "10-sync.md"
Cohesion: 0.12
Nodes (18): История версий: GET /docs/:id/versions и /versions/:seq (зашифрованные снимки), Метка agentEdit (agentId, at) — подсветка правок агента до принятия пользователем, Агенты не подключаются по WebSocket — работают через MCP/REST; сервер применяет их правки как обычные обновления, Снимки и уплотнение: > 500 обновлений или > 1 MiB → снимок; удаление seq ≤ baseSeq, кроме нужных истории (R-05), D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты (+10 more)

### Community 78 - "Block"
Cohesion: 0.11
Nodes (15): Array, .attributes, Block, .blockId, .isKnown, .isTextBlock, .text, .xml (+7 more)

### Community 79 - "Решения по анкетам пользователя: D-32…D-41 и PDF после MVP (D-08)"
Cohesion: 0.18
Nodes (13): Решения по анкетам пользователя: D-32…D-41 и PDF после MVP (D-08), D-32. Минимальная версия iOS/iPadOS — 26, Минимальная версия iOS/iPadOS 26 (IPHONEOS_DEPLOYMENT_TARGET = 26.0), Liquid Glass — системный дизайн iOS 26, Отклонённые варианты: iOS 18+ (шире охват) и 17.5+ (минимум для Pencil Pro), Последствия, Рассмотренные варианты, Решение (+5 more)

### Community 80 - "Stage 1: pen-in-text prototype on iPad (TextKit 2 + Yrs + pen layer, living stroke)"
Cohesion: 0.33
Nodes (7): Custom iOS Pen Render Layer (Metal or Core Animation), TextKit 2 (UIKit editor), PencilKit / PKCanvasView, ProMotion (120 Hz), R-01 Pen-in-Text May Not Work, Pen render choice: Metal vs Core Animation (latency and frame measurement), Stage 1: pen-in-text prototype on iPad (TextKit 2 + Yrs + pen layer, living stroke)

### Community 81 - "12-craft-features.md"
Cohesion: 0.25
Nodes (12): Calendar screen: day feed with tasks and daily note (MVP); system calendar integration after MVP, Card document: nested document shown as a card with cover (MVP), Collections: records with properties and table / gallery / kanban views with filter, sort, grouping (after MVP), Daily note: one per day, created on demand, from template (MVP), Document cover image with offset (MVP), Document style: font (serif/sans/mono), width, paper (smooth/dots/grid/ruled), backdrop color or gradient, text color; style gallery after MVP, Tabs: several open documents on iPad and web (MVP), Inbox: standalone tasks outside documents in a service note of the notebook (MVP) (+4 more)

### Community 82 - "KeychainSecretStore"
Cohesion: 0.26
Nodes (3): KeychainSecretStore, SecretStoreError, keychain

### Community 83 - "D-29. Graphify: порядок работы, чтобы граф был всегда актуален"
Cohesion: 0.40
Nodes (5): D-05. Перо при перекладке текста — вариант А «живой штрих», Гипотеза реализации, Контекст, Последствия, Решение

### Community 84 - "06-data-server.md"
Cohesion: 0.08
Nodes (27): Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), MinIO (rejected), D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Server disk folder storage (default), External S3-compatible storage (Hetzner, R2, B2), File storage interface (two implementations, chosen by config), Garage / SeaweedFS (+19 more)

### Community 85 - "Datascratch — правила для ИИ (CLAUDE.md)"
Cohesion: 0.19
Nodes (10): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Graphify 0.9.95 (пакет graphifyy), Graphify commands (query, explain, path, update, check-update, /graphify --update) (+2 more)

### Community 86 - "open-questions.md"
Cohesion: 0.22
Nodes (9): D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст, Решение, Bundle ID com.datascratch.app, OPEN (no deadline): final product name (D-24), before App Store release, OPEN (stage 1): living stroke details — circles around several words, arrows between words on different lines; decide on prototype (+1 more)

### Community 87 - "design-tokens.md"
Cohesion: 0.29
Nodes (12): Подложки backdrop.* (sand, dusk, mist, meadow, ember) — мягкие градиенты в духе Craft, Цветовые токены: bg.canvas («бумага»), text.primary («чернила»), accent («синие чернила»), danger/success/warning — светлая и тёмная тема, Ширина колонки документа: normal 720, wide 960, full, Тактильная отдача iOS: selection, success (задача выполнена), warning (удаление), Чернила пера ink.* (black, blue, red, green, purple, brown) и маркеры highlight.*, Движение: пружины motion.snappy / smooth / gentle, длительности duration.* для веба, Сетка отступов 4 pt, радиусы radius.*, тени shadow.card / shadow.popover, Цвета tint.* (.fg / .bg) для папок, тегов и выносок (+4 more)

### Community 88 - "02-platforms.md"
Cohesion: 0.19
Nodes (9): D-06. Рисование пальцем на iPhone — да, опционально, Finger drawing toggle on iPhone, Решение, D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, UI languages Russian and English, no RTL (D-17), iPad client (primary, Apple Pencil / Pencil Pro squeeze and roll, hover, Stage Manager, keyboard shortcuts) (+1 more)

### Community 89 - "String"
Cohesion: 0.21
Nodes (3): InMemorySecretStore, KeyRing, SecretStore

### Community 90 - "План разработки"
Cohesion: 0.15
Nodes (13): Критерии приёмки, План разработки, Подготовка, Потоки разработки (D-39), Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad) (+5 more)

### Community 92 - "0008-pdf-annotations.md"
Cohesion: 0.22
Nodes (9): D-08. Аннотации PDF пером — не в MVP, Аннотации PDF пером (PDFKit + свой слой штрихов) — после MVP, этап расширений, Решение, Решение (предложение), D-16. Импорт — не сейчас, Решение, CLOSED: PDF annotations after MVP (D-08), Stage 6: extensions (PDF annotations, link graph, templates, import, maybe built-in AI) (+1 more)

### Community 93 - "Контракт: шифрование (v1)"
Cohesion: 0.20
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 94 - "0003-platforms.md"
Cohesion: 0.29
Nodes (5): D-03. Платформы: нативные iPhone и iPad + полноценный веб, Full-featured web client (TypeScript), Контекст, Последствия, Решение

### Community 96 - "Контракт: REST API сервера (v1)"
Cohesion: 0.22
Nodes (9): Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1), Общее, Служебное, Токены агентов (`spec/09-agents-api.md`) (+1 more)

### Community 97 - "Контракт: протокол синхронизации (v1)"
Cohesion: 0.22
Nodes (9): 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05), 6. Права, 7. Коды ошибок, 8. Тестовые векторы (+1 more)

### Community 98 - "0041-craft-inspired-features.md"
Cohesion: 0.25
Nodes (6): Ежедневные заметки и «Входящие» (kind daily / inbox) в блокноте settings.dailyNotebookId, D-41. Набор функций по мотивам Craft, Контекст, Решение, OPEN (before stage 2): Craft features MVP / post-MVP split (D-41, proposed), Stage 2: MVP on iPad and iPhone, local (editor, handwriting, links, tags, organization, search, design system)

### Community 99 - "0011-handwriting-for-agents.md"
Cohesion: 0.25
Nodes (6): hint — распознанная форма (underline, strike, circle, highlight, arrow, scribble) для агентов и экспорта, D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Export: Markdown, PDF, HTML (handwriting as images), Server responsibilities: accounts, encrypted relay, attachments, realtime, API/MCP, handwriting PNG render, Handwriting rendered to PNG for agents with text annotation (D-11)

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
Cohesion: 0.38
Nodes (5): Stream design-system (claude/design-system): packages/design-tokens, packages/ui, apps/ios/Packages/DSDesign — Quiet Paper tokens, web and SwiftUI components, packages/design-tokens — дизайн-токены «Тихая бумага», tokens.json as source of Quiet Paper design token values; generators to CSS variables (web) and Swift (iOS), packages/ui — веб-компоненты дизайн-системы, React design-system components on Radix + Tailwind + Motion in Quiet Paper style

### Community 105 - "7. Шифрование и доступ агентов"
Cohesion: 0.29
Nodes (7): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Вход и восстановление доступа (D-34), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 106 - "KDFParams"
Cohesion: 0.40
Nodes (4): KDFParams, PasswordChangeMaterial, SignupMaterial, Security

### Community 107 - "git-хук Graphify (пересборка только по изменённому коду)"
Cohesion: 0.47
Nodes (5): Стартовый хук Claude Code (.claude/hooks/session-start.sh), git-хук Graphify (пересборка только по изменённому коду), Смысловой слой графа (понятия, решения, связи — проход ИИ), Структурный слой графа (код, файлы, заголовки — без ИИ), Automation: SessionStart hook installs Graphify and git hook; git hook rebuilds code graph after commit/checkout/merge; graphify update after git pull on Mac

### Community 108 - "0002-no-desktop-app.md"
Cohesion: 0.40
Nodes (4): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, Web client as full desktop replacement (Pointer Events with pressure, offline, PWA, mobile-browser editing for guests)

### Community 110 - "Процесс разработки"
Cohesion: 0.33
Nodes (6): Git, Две среды, Конец сессии, Кто что делает, Правила для сессий-исполнителей (D-39), Процесс разработки

### Community 111 - "Модель данных — ЧЕРНОВИК"
Cohesion: 0.40
Nodes (5): Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3), Штрих (черновик для прототипа)

### Community 112 - "2. Платформы"
Cohesion: 0.40
Nodes (5): 2. Платформы, Минимальная версия iOS/iPadOS — 26 (D-32), Минимальная версия iOS/iPadOS — ОТКРЫТО, Тестовые устройства (известно на 2026-10-25), Требования

### Community 113 - "4. Редактор"
Cohesion: 0.40
Nodes (5): 4. Редактор, Платформенная реализация, Прочее, Связи, Содержимое

### Community 117 - "5. Организация заметок и дизайн"
Cohesion: 0.40
Nodes (5): 5. Организация заметок и дизайн, Дизайн (D-15 — РЕШЕНО, главный принцип продукта), Организация (D-14 — РЕШЕНО по сути; структура ниже — ПРЕДЛОЖЕНО), Принципы, Реализация

### Community 118 - "D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления"
Cohesion: 0.50
Nodes (4): D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления, Контекст, Рассмотренные варианты, Решение

### Community 119 - "D-39. Разработка параллельными сессиями; Claude сам вливает в main"
Cohesion: 0.50
Nodes (4): D-39. Разработка параллельными сессиями; Claude сам вливает в main, Контекст, Последствия, Решение

## Knowledge Gaps
- **204 isolated node(s):** `PackageDescription`, `YrsFFI`, `account`, `notebook`, `note` (+199 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 638 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Контракт: модель документа (v1)` connect `D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS)` to `Контракт: модель документа (v1)`?**
  _High betweenness centrality (0.301) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `NoteDocument` (e.g. with `.strokesRoundTripAndResolveAnchors()` and `.undoRestoresTextAndStrokeAnchors()`) actually correct?**
  _`NoteDocument` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PackageDescription`, `YrsFFI`, `account` to the rest of the system?**
  _204 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `String` be split into smaller, more focused modules?**
  _Cohesion score 0.08717948717948718 - nodes in this community are weakly interconnected._
- **Why does `DocKind` connect `LocalStore` to `D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS)`, `Дизайн и организация (2) (2)`, `D-41. Набор функций по мотивам Craft`, `Hint`, `0009-notebook-mode-choice.md (5)`?**
  _High betweenness centrality (0.175) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `CRDTDocument` (e.g. with `.readsDocumentWrittenByYjs()` and `.syncsTwoDocumentsAndUndoesLocalEdits()`) actually correct?**
  _`CRDTDocument` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `0011-handwriting-for-agents.md` be split into smaller, more focused modules?**
  _Cohesion score 0.10869565217391304 - nodes in this community are weakly interconnected._