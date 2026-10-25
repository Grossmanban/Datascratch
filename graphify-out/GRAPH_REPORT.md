# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 162 files · ~56,930 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 5)

## Summary
- 2002 nodes · 4144 edges · 121 communities (116 shown, 5 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 492 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f50fdfaf`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- store.ts
- Скрипт обновления графа
- strokes.md
- Shared test vectors (input -> expected output) run in Swift and TypeScript
- 0009-notebook-mode-choice.md (3)
- 0039-parallel-sessions.md
- D-30. База данных сервера — PostgreSQL
- extract.ts
- SyncClient
- stack.md
- CHANGELOG.md
- generate.ts
- 12. Функции по мотивам Craft
- test-vectors/package.json
- 0031-crdt-yjs.md
- Контракт: дизайн-токены «Тихая бумага» (v1)
- Модель данных и глоссарий (2)
- 08-sharing.md
- 0034-auth-email-password.md
- document-model.md
- keys.ts
- 0035-strokes-on-deleted-text.md
- 0009-notebook-mode-choice.md (2)
- План этапов и отложенное
- stack.md (2)
- contracts/crypto.ts
- Платформы и клиенты (2)
- Datascratch — правила для ИИ
- 0011-handwriting-for-agents.md
- Компоненты стека (2) (2)
- docs/README.md
- Graphify
- crypto.test.ts
- Дизайн и организация
- Правила для ИИ и документации
- compilerOptions
- data-model.md
- 0036-space-notebook-folder.md
- base64url.ts
- sync-protocol.md
- exports
- Контракт: модель документа (v1) (2)
- api.md
- open-questions.md
- iOS-стек и два языка (2)
- memory-hub.ts
- Правила для ИИ и документации (2)
- graphify_docs.py
- sync-protocol.md (2)
- 0001-storage-in-database.md
- D-23. Документация — источник истины; Graphify — граф знаний поверх неё
- 12-craft-features.md
- 06-data-server.md
- 06-data-server.md (2)
- 01-concept.md
- strokes.test.ts (2)
- design-tokens.md
- 0038-design-quiet-paper.md
- glossary.md
- Решения по анкетам пользователя: D-32…D-41 и PDF после MVP (D-08)
- 02-platforms.md
- open-questions.md
- План разработки
- shared/package.json
- yjs.ts
- Платформы и клиенты (2) (2)
- shared/src/ids.ts
- Контракт: REST API сервера (v1)
- src/crypto.ts
- tasks
- Контракт: модель документа (v1)
- Datascratch — правила для ИИ (CLAUDE.md)
- 0008-pdf-annotations.md
- 11. Нефункциональные требования
- Monorepo layout (apps/ios, apps/web, apps/server, packages, infra)
- Контракт: шифрование (v1)
- 0041-craft-inspired-features.md
- Stream design-system (claude/design-system): packages/design-tokens, packages/ui, apps/ios/Packages/DSDesign — Quiet Paper tokens, web and SwiftUI components
- 0003-platforms.md
- 0032-min-ios-version.md
- 04-editor.md
- sync-protocol.md (3)
- 3. Apple Pencil в тексте — ключевая фича
- 0028-dev-workflow.md
- sync-protocol.md (4)
- CryptoError
- Технологический стек — РЕШЕНО (2026-10-25)
- open-questions.md (2)
- contracts/README.md
- D-21. Технологический стек
- 04-editor.md (4)
- test-vectors/tsconfig.json
- sync-protocol.md (5)
- Обзор архитектуры: разделы
- 07-encryption.md
- Процесс разработки
- scripts
- pm-schema.ts
- Контракт: дизайн-токены «Тихая бумага» (v1) (2)
- Agent notebooks: notebook key in server keystore, decrypt only on request with valid token and rights
- CHANGELOG.md (2)
- 06-data-server.md (4)
- 06-data-server.md (5)
- Контракт: рукописные штрихи (v1)
- 4. Редактор
- Дизайн и организация (2) (2)
- Stream core (claude/core): packages/shared, packages/test-vectors, root configs — contract types, crypto, stroke codec, document schema, sync client, test vectors
- Модель данных — ЧЕРНОВИК
- Web editor: TipTap + Yjs per document-model contract, all blocks, Canvas pen layer per strokes contract
- D-05. Перо при перекладке текста — вариант А «живой штрих»
- D-39. Разработка параллельными сессиями; Claude сам вливает в main
- 8. Совместная работа и шеринг
- D-27. В прототипе пера текст хранится в Yrs
- yjs
- .prettierrc.json
- vitest
- ./document
- ws
- pnpm-workspace.yaml
- 0020-no-deadline.md

## God Nodes (most connected - your core abstractions)
1. `SyncClient` - 32 edges
2. `documentVectors()` - 26 edges
3. `CryptoError` - 25 edges
4. `packages/test-vectors (shared test vectors)` - 22 edges
5. `toBase64Url()` - 20 edges
6. `accountRoots()` - 20 edges
7. `Stage 1: pen-in-text prototype on iPad (TextKit 2 + Yrs + pen layer, living stroke)` - 20 edges
8. `compilerOptions` - 18 edges
9. `cryptoVectors()` - 17 edges
10. `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО` --semantically_similar_to--> `Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/README.md
- `4.2. Схема блоков` --references--> `label()`  [INFERRED]
  docs/architecture/contracts/document-model.md → tools/graphify_docs.py
- `Web editor: TipTap + Yjs per document-model contract, all blocks, Canvas pen layer per strokes contract` --semantically_similar_to--> `Web editor: TipTap (ProseMirror) + Yjs`  [INFERRED] [semantically similar]
  packages/web-editor/README.md → docs/spec/04-editor.md
- `Аутентификация (D-34, `crypto.md`)` --references--> `Session`  [INFERRED]
  docs/architecture/contracts/api.md → packages/shared/src/contracts/api.ts
- `Блокноты и документы (D-36)` --references--> `Notebook`  [INFERRED]
  docs/architecture/contracts/api.md → packages/shared/src/contracts/api.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Crypto test vectors** — packages_test_vectors_readme_crypto_kdf_json, packages_test_vectors_readme_crypto_envelope_json, packages_test_vectors_readme_crypto_key_wraps_json, packages_test_vectors_readme_crypto_recovery_key_json, packages_test_vectors_readme_crypto_attachment_json [EXTRACTED 1.00]
- **@datascratch/shared subpath modules** — packages_shared_readme_contracts_subpath, packages_shared_readme_crypto_subpath, packages_shared_readme_ids_subpath, packages_shared_readme_document_subpath, packages_shared_readme_strokes_subpath, packages_shared_readme_sync_subpath [EXTRACTED 1.00]
- **Strokes test vectors** — packages_test_vectors_readme_strokes_points_json, packages_test_vectors_readme_strokes_anchors_json, packages_test_vectors_readme_strokes_layout_json, packages_test_vectors_readme_strokes_width_json [EXTRACTED 1.00]

## Communities (121 total, 5 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.03
Nodes (72): ACCESS_TOKEN_TTL_MS, AGENT_PERMISSIONS, AgentPermission, AgentToken, agentTokenSchema, API_ERROR_CODES, API_PREFIX, API_ROUTES (+64 more)

### Community 1 - "store.ts"
Cohesion: 0.06
Nodes (66): AuthorKind, ANCHOR_KINDS, AnchorKind, MIN_SEGMENT_POINTS, ORPHAN_STROKE_PURGE_DAYS, POINT_BYTES, POINT_FIELDS, REFERENCE_BLOCK_WIDTH (+58 more)

### Community 2 - "Скрипт обновления графа"
Cohesion: 0.04
Nodes (65): AUTHOR_KINDS, authorKindSchema, Base64Url, BASE64URL_REGEX, base64UrlBytesSchema(), base64UrlLength(), base64UrlSchema, DATE_ONLY_REGEX (+57 more)

### Community 3 - "strokes.md"
Cohesion: 0.20
Nodes (14): Блок drawing (высота в pt; штрихи — в strokes), anchorKind: text | block (заметка на полях) | image | drawing, Перепривязка якорей после отмены/повтора: в той же транзакции якорь удалённого символа с redone-элементом переписывается на относительную позицию нового элемента, Координаты block / image / drawing — в долях ширины блока, Штрих почти неизменяем после рисования; ластик удаляет штрих целиком или заменяет кусками, Разрыв штриха по строкам: соседние точки на разных line fragments → отдельные сегменты, Изменяемые поля штриха после рисования: anchors (перепривязка, §4.1) и hidden (резерв), orphanedAt — локальная отметка клиента, когда все якоря штриха впервые оказались удалены (стирается, если якоря снова живы) (+6 more)

### Community 4 - "Shared test vectors (input -> expected output) run in Swift and TypeScript"
Cohesion: 0.05
Nodes (41): applyBlockOperations (block ops for agents), @datascratch/shared/contracts (types and zod schemas), createAccountKeys / rekeyPassword, crypto.md contract, @datascratch/shared/crypto (libsodium), D-35 (strokes on deleted text kept), @datascratch/shared package, document-model.md contract (+33 more)

### Community 5 - "0009-notebook-mode-choice.md (3)"
Cohesion: 0.05
Nodes (40): AckMessage, ackMessageSchema, CLIENT_PLATFORMS, ClientAwarenessMessage, clientAwarenessMessageSchema, ClientMessage, clientMsgIdSchema, deviceIdSchema (+32 more)

### Community 6 - "0039-parallel-sessions.md"
Cohesion: 0.31
Nodes (10): apps/ios — iPhone + iPad, Cross-stream contracts (docs/architecture/contracts/) changed only via the coordinator session, Claude coordinator merges stream branches into main when CI is green, Coordinator session (merges branches into main, owns roadmap.md, CHANGELOG.md and contracts), Stream ios-app (claude/ios-app): apps/ios — XcodeGen project, Craft-style SwiftUI shell, navigation, tasks, calendar, settings, Stream ios-core (claude/ios-core): apps/ios/Packages/DSCore — Swift crypto, Yrs document model, GRDB, sync and API client, Stream ios-editor (claude/ios-editor): apps/ios/Packages/DSEditor — TextKit 2 + Yrs + living stroke pen layer, blocks, demo app, Stream server (claude/server): apps/server, infra/ — Fastify, PostgreSQL, auth, sync, attachments, sharing, docker compose (+2 more)

### Community 7 - "D-30. База данных сервера — PostgreSQL"
Cohesion: 0.14
Nodes (31): accountRoots(), notebookRoots(), closeTab(), deleteFolder(), deleteNotebookRef(), deleteNoteMeta(), deleteSpace(), findDailyNote() (+23 more)

### Community 8 - "extract.ts"
Cohesion: 0.11
Nodes (35): TASK_STATES, TaskState, ATTR_TEXT_BLOCKS, attrText(), buildBacklinks(), deltaText(), extractNoteLinks(), extractTags() (+27 more)

### Community 10 - "stack.md"
Cohesion: 0.12
Nodes (27): Контракт agents-api.md (MCP и REST для самих агентов) — появится на этапе агентов, doc_updates Table (encrypted Yjs updates), Server PostgreSQL Schema (Stage 3 Draft), Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, File Storage (disk or external S3) (+19 more)

### Community 11 - "CHANGELOG.md"
Cohesion: 0.10
Nodes (32): pnpm + Turborepo Monorepo, 2026-10-25, 2026-10-25 (вторая половина дня), Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально (+24 more)

### Community 12 - "generate.ts"
Cohesion: 0.10
Nodes (13): ATTACHMENT_CHUNK_BYTES, clientMessageSchema, serverMessageSchema, initCrypto(), dir, Json, p(), check (+5 more)

### Community 13 - "12. Функции по мотивам Craft"
Cohesion: 0.08
Nodes (31): devDependencies, eslint@^9.39.0, eslint-config-prettier@^10.1.0, @eslint/js@^9.39.0, globals@^16.4.0, prettier@^3.6.0, turbo@^2.5.0, typescript@^5.9.0 (+23 more)

### Community 14 - "test-vectors/package.json"
Cohesion: 0.08
Nodes (32): description, devDependencies, @datascratch/shared@workspace:*, eslint@^9.39.0, libsodium-wrappers-sumo@^0.8.2, prosemirror-model@^1.25.0, tsx@^4.20.0, @types/node@^22.10.0 (+24 more)

### Community 15 - "0031-crdt-yjs.md"
Cohesion: 0.08
Nodes (30): Automerge (fallback CRDT), Yrs (Rust Yjs) with Swift Wrapper, D-19. Весь код пишет Claude, Последствия, Решение, Custom pen renderer (Metal vs Core Animation TBD), End-to-end encryption, GRDB (SQLite) (+22 more)

### Community 16 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.12
Nodes (28): 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note`, Comment, PMMark, attr() (+20 more)

### Community 17 - "Модель данных и глоссарий (2)"
Cohesion: 0.10
Nodes (32): BLOCK_NODES, INLINE_NODES, MARKS, pmNodeSchema, TEXTBLOCK_NODES, addAgentMark(), applyBlockOperations(), ApplyOptions (+24 more)

### Community 18 - "08-sharing.md"
Cohesion: 0.10
Nodes (29): POST /docs — регистрация документа (account / notebook / note) до первого push, Share { id, target { kind, id }, permission, expiresAt, createdAt } — ссылка шеринга, Шеринг: /shares (view/edit, бессрочно по умолчанию, отзыв сразу отключает гостей), awareness — курсоры и присутствие: зашифровано, не хранится, только рассылается, Права: user — документы своего аккаунта; guest — только документы шеринга, push только с правом edit, D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account, Real-time collaborative editing (+21 more)

### Community 19 - "0034-auth-email-password.md"
Cohesion: 0.14
Nodes (23): Вложения: загрузка и докачка по кускам (/attachments/:id/chunks/:index), лимит 200 МБ, Ассоциированные данные ds1|… привязывают шифротекст к месту (doc, awareness, ключи, куски вложений), Вложения шифруются кусками по 1 MiB, каждый — отдельный конверт, Конверт шифротекста: версия 0x01 + nonce 24 байта + XChaCha20-Poly1305-IETF (тег 16 байт), Иерархия ключей: пароль → passwordKey → masterKey → notebookKey → noteKey, libsodium на всех платформах (libsodium-wrappers-sumo в TS, swift-sodium в iOS), loginKey = BLAKE2b(authSeed, "ds1|login"); сервер хранит Argon2id(loginKey), masterKey — 32 случайных байта, создаётся при регистрации, шифрует account-документ (+15 more)

### Community 20 - "document-model.md"
Cohesion: 0.16
Nodes (21): y-prosemirror не записывает атрибуты узлов со значением null: отсутствующий атрибут = null (значение по умолчанию схемы), Документ account: spaces, notebooks, settings, starred, tabs (ключ — masterKey), Comment { blockId, anchor (относительные позиции), author user | guest | agent, text, resolvedAt }, Даты ISO 8601 в UTC; «только дата» YYYY-MM-DD; миллисекунды — только в штрихах, Векторы совместимости модели документа packages/test-vectors/document/* (iOS/Yrs обязан читать и писать формат y-prosemirror), Вставка текста в Y.XmlText без явных атрибутов наследует форматирование слева (Yjs/Yrs) — писатели всегда передают явный набор атрибутов, Folder { parentId, name, icon, color, order } — вложенность без ограничения глубины, Значение метки — объект атрибутов ({ bold: {} }, { link: { href, … } }); читатели принимают {} и true и ключи <имя>--<хэш> (+13 more)

### Community 21 - "keys.ts"
Cohesion: 0.17
Nodes (23): KdfParams, decryptFromBase64Url(), encryptToBase64Url(), generateSalt(), createAccountKeys(), generateKey(), NewAccountKeys, RekeyedPassword (+15 more)

### Community 22 - "0035-strokes-on-deleted-text.md"
Cohesion: 0.17
Nodes (14): Контракт меняет только сессия-координатор; исполнитель присылает предложение, Обводки и стрелки «растягиваются» вместе с текстом; при проблемах — изменение контракта через координатора, Правило D-35 в отрисовке: точки удалённых символов не рисуются, штрих остаётся в документе; отмена возвращает пометку, D-35. Пометка на удалённом тексте исчезает вместе с ним, Окончательная очистка таких штрихов — при уплотнении истории, Вариант «потерянные пометки» — отклонён: лишний интерфейс, Частичное удаление: штрих «сжимается» до оставшегося текста, Вариант «прилипать к соседнему символу» — отклонён: пометка может оказаться не на том слове (+6 more)

### Community 23 - "0009-notebook-mode-choice.md (2)"
Cohesion: 0.16
Nodes (14): PATCH /notebooks/:id/mode — включение режима «для агентов» передаёт notebookKey, выключение удаляет серверную обёртку, Режим «для агентов»: клиент передаёт notebookKey по TLS, сервер оборачивает его serverKey; расшифровка только при запросе агента с токеном, NotebookRef { id, spaceId, name, mode: private | agent, … } — ключ блокнота здесь не хранится, D-04. Одновременно сквозное шифрование и доступ по API, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), Контекст, Последствия (+6 more)

### Community 24 - "План этапов и отложенное"
Cohesion: 0.09
Nodes (22): runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group, jobs, check (+14 more)

### Community 25 - "stack.md (2)"
Cohesion: 0.16
Nodes (18): Транспорт wss://<host>/v1/sync: JSON-кадры с type, base64url, ping/pong каждые 25 с, Web PWA Client (React, TipTap, Yjs, IndexedDB), Astro (landing page), Dexie (IndexedDB), Drizzle ORM, GRDB (SQLite), TypeScript on Node.js, Scaling via PostgreSQL LISTEN/NOTIFY (+10 more)

### Community 26 - "contracts/crypto.ts"
Cohesion: 0.12
Nodes (23): DEFAULT_KDF, ENVELOPE_OVERHEAD, ENVELOPE_VERSION, KDF_ALG, KDF_MEM, KDF_OPS, KDF_OUTPUT_BYTES, kdfParamsSchema (+15 more)

### Community 27 - "Платформы и клиенты (2)"
Cohesion: 0.15
Nodes (11): ClientPlatform, encryptAwareness(), encryptDocUpdate(), DocEntry, Listeners, REMOTE_ORIGIN, SyncClientOptions, DocSyncState (+3 more)

### Community 28 - "Datascratch — правила для ИИ"
Cohesion: 0.29
Nodes (7): Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой, Правила, Среда разработки

### Community 29 - "0011-handwriting-for-agents.md"
Cohesion: 0.12
Nodes (19): AgentToken { id, name, notebookIds, permission, expiresAt, createdAt, lastUsedAt } — без секрета, Токены агентов /agent-tokens: блокноты, read / read_write, срок; токен показывается один раз, Export: Markdown, PDF, HTML (handwriting as images), pg-boss background job queue on PostgreSQL, PostgreSQL via Drizzle (D-30): accounts, notebooks, rights, tokens, encrypted updates, snapshots, agent log, Server responsibilities: accounts, encrypted relay, attachments, realtime, API/MCP, handwriting PNG render, 9. API и внешние ИИ-агенты, Log of all agent actions (+11 more)

### Community 30 - "Компоненты стека (2) (2)"
Cohesion: 0.12
Nodes (20): Canvas + Pointer Events, Dexie (IndexedDB), Drizzle ORM, Fastify, MCP TypeScript SDK, OAuth 2.1, pg-boss job queue, Radix + Tailwind + Motion (+12 more)

### Community 31 - "docs/README.md"
Cohesion: 0.17
Nodes (15): ADR file number equals decision number (D-05 -> 0005-*.md), template 0000-template.md, Нумерация решений D-NN и файлы decisions/00NN-*.md, Документация Datascratch — единственный источник истины, history/ — архив, не источник истины; исключена из графа (.graphifyignore), Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Правило замены: решение РЕШЕНО не переписывается, ADR получает статус «ЗАМЕНЕНО решением D-NN», Оглавление docs/ (spec, contracts, architecture, decisions, roadmap, risks…), Документация Datascratch (+7 more)

### Community 32 - "Graphify"
Cohesion: 0.17
Nodes (11): Monorepo Structure (apps/, packages/, infra/), packages/test-vectors, Graphify, Автоматизация, Команды, Обновление графа после правки документов (по шагам), Почему два способа обновления, Установка на Mac (один раз) (+3 more)

### Community 33 - "crypto.test.ts"
Cohesion: 0.24
Nodes (13): AD, attachmentChunkCount(), attachmentCiphertextSize(), decryptAttachment(), decryptAttachmentChunk(), encryptAttachment(), concatBytes(), checkKey() (+5 more)

### Community 34 - "Дизайн и организация"
Cohesion: 0.22
Nodes (10): D-15. Дизайн — основная концепция продукта, Design references: Things 3, Linear, Craft, Arc, Последствия, Решение, Ориентир Craft: градиентные подложки, документы-карточки с обложками, боковая панель «Вкладки / Избранное / Папки / Теги», стеклянные панели, контекстные меню, Light/dark theme, Dynamic Type, VoiceOver, full iPad keyboard support, Feel references: Things 3, Linear, Craft, Arc, Own design system (typography, grid, colors, icons, animation, haptics) unified on iOS and web (+2 more)

### Community 35 - "Правила для ИИ и документации"
Cohesion: 0.22
Nodes (6): D-29. Graphify: порядок работы, чтобы граф был всегда актуален, R-09 (риск: Graphify сломается или исчезнет), Контекст, Последствия, Решение, graphify-out/ layout: what is committed (graph.json, report, html, manifest, cache) vs machine-local (.gitignore)

### Community 36 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib, module (+10 more)

### Community 37 - "data-model.md"
Cohesion: 0.27
Nodes (8): meta.formatVersion = 1; документ новее клиента открывается только для чтения (R-03), Поля штриха: v, tool, color, width, opacity, anchorKind, blockId, anchors, points, hint, author, createdAt, Anchor (textRange / paragraph / drawingBlock / image), Note, Stroke, StrokePoint, RelativePosition (CRDT), R-03 Data Format Cannot Change Cheaply

### Community 38 - "0036-space-notebook-folder.md"
Cohesion: 0.14
Nodes (17): Space { id, name, icon, color, order, createdAt } в account-документе, Organization Hierarchy (Account > Space > Notebook > Folder > Note), Проекты, личное, работа, учёба не смешиваются; минимум кнопок на экране, D-14. Организация: богатая, но не перегруженная, Предложенная структура: пространства → вложенные папки; поперёк — вложенные и умные теги, цвета, избранное, недавние, Решение, Поперёк структуры — теги, умные теги, избранное, недавние, D-36. Структура: пространство → блокноты → папки (+9 more)

### Community 39 - "base64url.ts"
Cohesion: 0.25
Nodes (6): RFC-4648, bytesEqual(), decoder, encoder, fromHex(), LOOKUP

### Community 40 - "sync-protocol.md"
Cohesion: 0.22
Nodes (16): Формат ошибок { error: { code, message } } и коды bad_request…internal, ack — обновление или снимок принят и сохранён (docId, clientMsgId, seq), Коды ошибок синхронизации: unauthorized, forbidden, doc_not_found, payload_too_large (2 MiB / 50 MiB), rate_limited, protocol_mismatch, internal, error — сообщение сервера: code, message, ref? (clientMsgId / docId), Клиент хранит lastSeq по каждому документу и догоняет недостающее при подключении, Сервер не присылает клиенту его собственные обновления (кроме updates при догоняющей подписке с другого устройства), Офлайн: обновления копятся в локальной очереди до подтверждения ack, Лимиты payload_too_large: обновление 2 MiB, снимок 50 MiB — считаются декодированные байты, не base64 (+8 more)

### Community 41 - "exports"
Cohesion: 0.12
Nodes (17): import, types, import, types, exports, ./contracts, ./crypto, ./ids (+9 more)

### Community 42 - "Контракт: модель документа (v1) (2)"
Cohesion: 0.15
Nodes (15): ACCOUNT_ROOTS, DEFAULT_NOTE_STYLE, FORMAT_VERSION, NOTE_ROOTS, NOTEBOOK_ROOTS, NoteDocMeta, PMNode, AccountDocRoots (+7 more)

### Community 43 - "api.md"
Cohesion: 0.09
Nodes (25): Аккаунт и устройства: /me, /devices (отзыв сессий), удаление аккаунта, Эндпоинты /auth: prelogin, signup, login, refresh, logout, recovery, password, Аутентификация Bearer: accessToken 15 мин + refreshToken 30 дней с ротацией, Идентификаторы создаёт клиент (UUIDv7); повторный POST идемпотентен, иначе 409 conflict, Device { id, name, createdAt, lastSeenAt, current } — устройство (сессия) аккаунта, POST /shares/:id/guest — гостевой токен (без авторизации) для hello в синхронизации, GET /health → { ok: true, version } — служебная проверка сервера, Notebook { id, mode, createdAt, wrappedKey } — ответ /notebooks (+17 more)

### Community 44 - "open-questions.md"
Cohesion: 0.21
Nodes (9): D-11. Рукопись для агента — рендер в картинку (PNG), Решение, OPEN (before stage 5): handwriting format for agents — PNG (D-11, proposed), OPEN (stage 1): living stroke details — circles around several words, arrows between words on different lines; decide on prototype, Порядок чтения для новичка: концепция → roadmap → стек → обзор → перо → решения → вопросы/риски → процесс → history, R-07 Web Pen Worse than Native, Риски, Web without cuts: full feature parity with iOS (pen quality may be lower, R-07) (+1 more)

### Community 45 - "iOS-стек и два языка (2)"
Cohesion: 0.12
Nodes (15): devDependencies, eslint@^9.39.0, prosemirror-model@^1.25.12, tsup@^8.5.0, @types/node@^22.10.0, @types/ws@^8.5.13, typescript@^5.9.0, y-prosemirror@^1.3.7 (+7 more)

### Community 46 - "memory-hub.ts"
Cohesion: 0.18
Nodes (11): base64UrlDecodedLength(), MAX_SNAPSHOT_BYTES, MAX_UPDATE_BYTES, ServerMessage, SYNC_PROTOCOL_VERSION, SyncAuth, UpdateItem, Connection (+3 more)

### Community 47 - "Правила для ИИ и документации (2)"
Cohesion: 0.15
Nodes (20): Стартовый хук Claude Code (.claude/hooks/session-start.sh), D-23 (документация), git-хук Graphify (пересборка только по изменённому коду), Скрипт tools/graphify_docs.py (prepare → агенты → finish), Graphify 0.9.95 (пакет graphifyy), Смысловой слой графа (понятия, решения, связи — проход ИИ), Структурный слой графа (код, файлы, заголовки — без ИИ), Automation: SessionStart hook installs Graphify and git hook; git hook rebuilds code graph after commit/checkout/merge; graphify update after git pull on Mac (+12 more)

### Community 48 - "graphify_docs.py"
Cohesion: 0.28
Nodes (7): Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 49 - "sync-protocol.md (2)"
Cohesion: 0.15
Nodes (14): История версий: GET /docs/:id/versions и /versions/:seq (зашифрованные снимки), Восстановление версии из истории: восстанавливаются content и strokes; якоря пересчитываются через абсолютные индексы → новая относительная позиция, Агенты не подключаются по WebSocket — работают через MCP/REST; сервер применяет их правки как обычные обновления, Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps, Agent edits applied immediately, highlighted, revertible via history (D-10), 10. Синхронизация и офлайн, Local storage: SQLite via GRDB (iOS), IndexedDB via Dexie (web), Agent notebooks: server decrypts and applies agent edit as a normal update (+6 more)

### Community 50 - "0001-storage-in-database.md"
Cohesion: 0.18
Nodes (10): hint — распознанная форма (underline, strike, circle, highlight, arrow, scribble) для агентов и экспорта, D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты (+2 more)

### Community 51 - "D-23. Документация — источник истины; Graphify — граф знаний поверх неё"
Cohesion: 0.50
Nodes (4): D-23. Документация — источник истины; Graphify — граф знаний поверх неё, Контекст, Последствия, Решение

### Community 52 - "12-craft-features.md"
Cohesion: 0.13
Nodes (20): 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft, Calendar screen: day feed with tasks and daily note (MVP); system calendar integration after MVP (+12 more)

### Community 53 - "06-data-server.md"
Cohesion: 0.10
Nodes (22): Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), MinIO (rejected), Server disk folder storage (default), External S3-compatible storage (Hetzner, R2, B2), File storage interface (two implementations, chosen by config), Garage / SeaweedFS, MinIO (rejected), D-40. Хостинг — позже; сервер готов к запуску одной командой (+14 more)

### Community 54 - "06-data-server.md (2)"
Cohesion: 0.19
Nodes (10): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, Контекст, Решение (на сейчас) (+2 more)

### Community 55 - "01-concept.md"
Cohesion: 0.15
Nodes (12): 1. Концепция продукта, Obsidian (reference product: links, backlinks, tags, Markdown export), Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения, Суть в одном абзаце, Backlinks (+4 more)

### Community 56 - "strokes.test.ts (2)"
Cohesion: 0.26
Nodes (3): SyncErrorCode, SyncClientError, MemorySyncHub

### Community 57 - "design-tokens.md"
Cohesion: 0.29
Nodes (12): Подложки backdrop.* (sand, dusk, mist, meadow, ember) — мягкие градиенты в духе Craft, Цветовые токены: bg.canvas («бумага»), text.primary («чернила»), accent («синие чернила»), danger/success/warning — светлая и тёмная тема, Ширина колонки документа: normal 720, wide 960, full, Тактильная отдача iOS: selection, success (задача выполнена), warning (удаление), Чернила пера ink.* (black, blue, red, green, purple, brown) и маркеры highlight.*, Движение: пружины motion.snappy / smooth / gentle, длительности duration.* для веба, Сетка отступов 4 pt, радиусы radius.*, тени shadow.card / shadow.popover, Цвета tint.* (.fg / .bg) для папок, тегов и выносок (+4 more)

### Community 58 - "0038-design-quiet-paper.md"
Cohesion: 0.33
Nodes (6): D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Вариант «графит по умолчанию» — отклонён: чернила на тёмном читаются хуже, Вариант «чистый нейтральный» (Linear / Things) — не выбран, Тёмная тема — тёплый графит, Рассмотренные варианты, Решение

### Community 59 - "glossary.md"
Cohesion: 0.13
Nodes (18): Координаты text-штриха: смещение от начала глифа якорного символа в em, Записываются только сглаженные coalesced-точки завершённого штриха, без predicted, Привязка к тексту: каждая точка → ближайший символ строки (живой штрих), Custom iOS Pen Render Layer (Metal or Core Animation), TextKit 2 (UIKit editor), PencilKit (rejected), ADR (Architecture Decision Record), Notebook for Agents (+10 more)

### Community 60 - "Решения по анкетам пользователя: D-32…D-41 и PDF после MVP (D-08)"
Cohesion: 0.18
Nodes (11): Решения по анкетам пользователя: D-32…D-41 и PDF после MVP (D-08), D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст, Решение, Bundle ID com.datascratch.app, D-33. Bundle ID — com.datascratch.app (+3 more)

### Community 61 - "02-platforms.md"
Cohesion: 0.14
Nodes (14): D-06. Рисование пальцем на iPhone — да, опционально, Finger drawing toggle on iPhone, Решение, D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, 2. Платформы, UI languages Russian and English, no RTL (D-17) (+6 more)

### Community 62 - "open-questions.md"
Cohesion: 0.15
Nodes (10): iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, iPhone and iPad share one codebase (universal app), Handwriting input types (text marks, margin notes, drawing block, drawing on images, Scribble), Pencil gestures (zigzag delete, underline, strike, lasso), Stroke point anchoring: character anchor + dx/dy in font-size units (+2 more)

### Community 63 - "План разработки"
Cohesion: 0.15
Nodes (13): Критерии приёмки, План разработки, Подготовка, Потоки разработки (D-39), Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad) (+5 more)

### Community 64 - "shared/package.json"
Cohesion: 0.18
Nodes (12): dependencies, libsodium-wrappers-sumo@^0.8.2, zod@^4.1.0, description, files, libsodium-wrappers-sumo, name, private (+4 more)

### Community 65 - "yjs.ts"
Cohesion: 0.22
Nodes (10): attributesToMarks(), Attrs, jsonEqual(), markNameFromAttr(), marksToAttributes(), pmContentToY(), pmNodeToY(), YChild (+2 more)

### Community 66 - "Платформы и клиенты (2) (2)"
Cohesion: 0.12
Nodes (8): SyncStatus, WebSocketFactory, WebSocketLike, deliver(), MemorySyncStorage, clients, makeClient(), text()

### Community 67 - "shared/src/ids.ts"
Cohesion: 0.27
Nodes (7): RFC-9562, UUID_V7_REGEX, isUuidV7(), random(), uuidv7(), uuidv7FromParts(), uuidv7Timestamp()

### Community 68 - "Контракт: REST API сервера (v1)"
Cohesion: 0.17
Nodes (12): Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1), Общее, Служебное, Токены агентов (`spec/09-agents-api.md`) (+4 more)

### Community 69 - "src/crypto.ts"
Cohesion: 0.25
Nodes (17): encryptAttachmentChunk(), toBase64Url(), toHex(), utf8(), encryptEnvelope(), derivePasswordKeys(), deriveRecoveryLoginKey(), normalizePassword() (+9 more)

### Community 70 - "tasks"
Cohesion: 0.17
Nodes (11): dependsOn, outputs, dependsOn, $schema, tasks, build, lint, test (+3 more)

### Community 71 - "Контракт: модель документа (v1)"
Cohesion: 0.18
Nodes (11): 1. Три вида документов Yjs, 2. Документ `account`, 3. Документ `notebook` (индекс блокнота), 5. Производные данные (не синхронизируются), 6. Версия формата, Контракт: модель документа (v1), DocKind, Folder (+3 more)

### Community 72 - "Datascratch — правила для ИИ (CLAUDE.md)"
Cohesion: 0.18
Nodes (9): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, docs/history session log (+1 more)

### Community 73 - "0008-pdf-annotations.md"
Cohesion: 0.20
Nodes (10): D-08. Аннотации PDF пером — не в MVP, Аннотации PDF пером (PDFKit + свой слой штрихов) — после MVP, этап расширений, Решение, Решение (предложение), D-16. Импорт — не сейчас, Решение, CLOSED: PDF annotations after MVP (D-08), R-08 Huge Project Scope (+2 more)

### Community 74 - "11. Нефункциональные требования"
Cohesion: 0.40
Nodes (5): 11. Нефункциональные требования, Доступность, Надёжность, Ресурсы сервера, Языки

### Community 75 - "Monorepo layout (apps/ios, apps/web, apps/server, packages, infra)"
Cohesion: 0.20
Nodes (7): apps/server — сервер, apps/web — веб-клиент, Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), Stream agents (claude/agents): packages/agents, agents-api contract draft — MCP, REST, tokens, log, PNG render, Agents package: MCP server (Streamable HTTP, OAuth 2.1), REST for agents, handwriting PNG render; plugs into apps/server as plugin, packages/agents — доступ внешних ИИ-агентов, Monorepo layout (apps/ios, apps/web, apps/server, packages, infra)

### Community 76 - "Контракт: шифрование (v1)"
Cohesion: 0.20
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 77 - "0041-craft-inspired-features.md"
Cohesion: 0.15
Nodes (10): Ежедневные заметки и «Входящие» (kind daily / inbox) в блокноте settings.dailyNotebookId, Производные данные строятся локально: индекс задач, полнотекстовый поиск, бэклинки, теги, Inline-узлы noteLink ([[ ]]) и tag (без #, вложенность через /), taskItem: taskId, state open / done / cancelled, scheduled, deadline, completedAt, D-41. Набор функций по мотивам Craft, Контекст, Решение, OPEN (before stage 2): Craft features MVP / post-MVP split (D-41, proposed) (+2 more)

### Community 78 - "Stream design-system (claude/design-system): packages/design-tokens, packages/ui, apps/ios/Packages/DSDesign — Quiet Paper tokens, web and SwiftUI components"
Cohesion: 0.38
Nodes (5): Stream design-system (claude/design-system): packages/design-tokens, packages/ui, apps/ios/Packages/DSDesign — Quiet Paper tokens, web and SwiftUI components, packages/design-tokens — дизайн-токены «Тихая бумага», tokens.json as source of Quiet Paper design token values; generators to CSS variables (web) and Swift (iOS), packages/ui — веб-компоненты дизайн-системы, React design-system components on Radix + Tailwind + Motion in Quiet Paper style

### Community 79 - "0003-platforms.md"
Cohesion: 0.18
Nodes (9): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, D-03. Платформы: нативные iPhone и iPad + полноценный веб, Full-featured web client (TypeScript), Контекст, Последствия, Решение (+1 more)

### Community 80 - "0032-min-ios-version.md"
Cohesion: 0.27
Nodes (9): D-32. Минимальная версия iOS/iPadOS — 26, Минимальная версия iOS/iPadOS 26 (IPHONEOS_DEPLOYMENT_TARGET = 26.0), Liquid Glass — системный дизайн iOS 26, Отклонённые варианты: iOS 18+ (шире охват) и 17.5+ (минимум для Pencil Pro), Последствия, Рассмотренные варианты, Решение, CLOSED: minimum iOS 26+ (D-32); XcodeGen accepted (D-39); Bundle ID (D-33); paid Apple Developer account exists (+1 more)

### Community 81 - "04-editor.md"
Cohesion: 0.25
Nodes (7): Схема блоков: doc = title block+ (paragraph, heading, списки, taskList, callout, codeBlock, mathBlock, mermaid, table, image, file, drawing, pageCard), Editor content (headings, lists, tables, code, formulas, attachments, drawing blocks), iOS editor: UIKit + TextKit 2, Link graph view (not in MVP, stage 6), Web editor: TipTap (ProseMirror) + Yjs, [[ ]] links with autocomplete, MVP blocks: headings, lists, quote, callout, divider, links, [[ ]], tags, table, code with highlighting, LaTeX formula, Mermaid, drawing, image, file

### Community 82 - "sync-protocol.md (3)"
Cohesion: 0.22
Nodes (9): 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05), 6. Права, 7. Коды ошибок, 8. Тестовые векторы (+1 more)

### Community 83 - "3. Apple Pencil в тексте — ключевая фича"
Cohesion: 0.22
Nodes (9): 3. Apple Pencil в тексте — ключевая фича, Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера, Перекладка текста — вариант А «живой штрих» (D-05, РЕШЕНО) (+1 more)

### Community 84 - "0028-dev-workflow.md"
Cohesion: 0.12
Nodes (20): XcodeGen project.yml (D-28), GitHub Actions CI (incl. macOS iOS builds), XcodeGen, docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, Последствия: ошибки сборки видны с задержкой CI; ощущение пера проверяет только пользователь на iPad (Pencil Pro) (+12 more)

### Community 85 - "sync-protocol.md (4)"
Cohesion: 0.32
Nodes (6): Метка agentEdit (agentId, at) — подсветка правок агента до принятия пользователем, D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение

### Community 86 - "CryptoError"
Cohesion: 0.27
Nodes (10): RECOVERY_KEY_CHARS, RECOVERY_KEY_GROUP, RECOVERY_KEY_PREFIX, CryptoError, CROCKFORD_ALPHABET, crockfordValue(), decodeCrockford(), encodeCrockford() (+2 more)

### Community 87 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 88 - "open-questions.md (2)"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 89 - "contracts/README.md"
Cohesion: 0.20
Nodes (10): Тестовые векторы crypto: KDF, конверты, Base32 ключа восстановления, куски вложений (Swift и TS), Контракт — точное описание формата/протокола, который реализуют несколько частей (iOS на Swift, веб и сервер на TS), Версионирование контрактов v1, v2…; ломающее изменение — новая версия с явной миграцией, Совместимость доказывается общими тестовыми векторами (packages/test-vectors), Типы TypeScript контрактов в packages/shared/src/contracts/ — часть контракта, Контракты между частями системы, Правила изменения, Тестовые векторы strokes: упаковка точек, разрешение якорей после правок, правило D-35 (+2 more)

### Community 90 - "D-21. Технологический стек"
Cohesion: 0.25
Nodes (7): createNotebookRequestSchema, emailSchema, registerDocRequestSchema, signupRequestSchema, isoDateTimeSchema, uuidSchema, KEY

### Community 91 - "04-editor.md (4)"
Cohesion: 0.25
Nodes (7): compilerOptions, lib, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 92 - "test-vectors/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, lib, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 93 - "sync-protocol.md (5)"
Cohesion: 0.46
Nodes (8): Осиротевшие штрихи (все якоря удалены, orphanedAt или createdAt старше 30 дней) окончательно удаляются клиентом при уплотнении истории, Снимки и уплотнение: > 500 обновлений или > 1 MiB → снимок; удаление seq ≤ baseSeq, кроме нужных истории (R-05), snapshot — загрузка зашифрованного снимка состояния до baseSeq, doc_snapshots Table (compacted snapshots, version history), Encrypted history compaction by clients (R-05, stage 3), Snapshot, OPEN (before stage 3): Yjs history compaction under encryption — snapshot scheme (R-05), R-05 Edit History Growth

### Community 94 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 95 - "07-encryption.md"
Cohesion: 0.16
Nodes (13): Attachments as separate encrypted files, on-demand resumable download, 7. Шифрование и доступ агентов, Argon2id password key derivation, libsodium on all platforms (swift-sodium on iOS, libsodium-wrappers in TS), Local MCP bridge (future): utility on user computer holding the key so local agents can reach private notebooks, XChaCha20-Poly1305 content encryption, Восстановление доступа — ОТКРЫТО (R-02), Вход и восстановление доступа (D-34) (+5 more)

### Community 96 - "Процесс разработки"
Cohesion: 0.33
Nodes (6): Git, Две среды, Конец сессии, Кто что делает, Правила для сессий-исполнителей (D-39), Процесс разработки

### Community 97 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, lint, test, test:watch, typecheck

### Community 98 - "pm-schema.ts"
Cohesion: 0.33
Nodes (3): cellAttrs, id, schema

### Community 99 - "Контракт: дизайн-токены «Тихая бумага» (v1) (2)"
Cohesion: 0.40
Nodes (5): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 100 - "Agent notebooks: notebook key in server keystore, decrypt only on request with valid token and rights"
Cohesion: 0.24
Nodes (8): Журнал действий агента GET /agent-tokens/:id/audit, notebookKey — случайный ключ блокнота, шифрует notebook-документ, serverKey — 32 байта из DS_KMS_KEY (окружение сервера, не в базе), blockId (UUIDv7) у каждого блочного узла — для точечных правок агентов, заметок на полях и комментариев, agent_tokens / agent_audit_log Tables, R-10 Agent Notebooks Readable if Server Breached, Per-notebook key wrapped by user master key (private) or server key (agent mode), Agent capabilities: search/read Markdown, block-level edits, comments, links/tags/backlinks

### Community 101 - "CHANGELOG.md (2)"
Cohesion: 0.40
Nodes (5): D-22. Без собственного общего ядра на Rust, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 102 - "06-data-server.md (4)"
Cohesion: 0.40
Nodes (5): D-25. Redis не используем, Будущее, Контекст, Последствия, Решение

### Community 103 - "06-data-server.md (5)"
Cohesion: 0.40
Nodes (5): D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 104 - "Контракт: рукописные штрихи (v1)"
Cohesion: 0.22
Nodes (9): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4.1. Перепривязка якорей (отмена и восстановление версии), 4.2. Когда штрих считается «осиротевшим» и удаляется навсегда, 4. Привязка к тексту (живой штрих), 5. Отрисовка толщины, 6. Тестовые векторы (+1 more)

### Community 105 - "4. Редактор"
Cohesion: 0.40
Nodes (5): 4. Редактор, Платформенная реализация, Прочее, Связи, Содержимое

### Community 106 - "Дизайн и организация (2) (2)"
Cohesion: 0.40
Nodes (5): 5. Организация заметок и дизайн, Дизайн (D-15 — РЕШЕНО, главный принцип продукта), Организация (D-14 — РЕШЕНО по сути; структура ниже — ПРЕДЛОЖЕНО), Принципы, Реализация

### Community 107 - "Stream core (claude/core): packages/shared, packages/test-vectors, root configs — contract types, crypto, stroke codec, document schema, sync client, test vectors"
Cohesion: 0.15
Nodes (11): Stream core (claude/core): packages/shared, packages/test-vectors, root configs — contract types, crypto, stroke codec, document schema, sync client, test vectors, packages/shared — `@datascratch/shared`, Коротко об использовании, Особенности, о которых стоит знать, Подпути, Разработка, packages/test-vectors — общие тестовые векторы, Как обновлять (+3 more)

### Community 108 - "Модель данных — ЧЕРНОВИК"
Cohesion: 0.40
Nodes (5): Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3), Штрих (черновик для прототипа)

### Community 109 - "Web editor: TipTap + Yjs per document-model contract, all blocks, Canvas pen layer per strokes contract"
Cohesion: 0.50
Nodes (4): Canvas + Pointer Events Pen Layer, Stream web-editor (claude/web-editor): packages/web-editor — TipTap editor with all blocks, Canvas pen, packages/web-editor — веб-редактор, Web editor: TipTap + Yjs per document-model contract, all blocks, Canvas pen layer per strokes contract

### Community 110 - "D-05. Перо при перекладке текста — вариант А «живой штрих»"
Cohesion: 0.40
Nodes (5): D-05. Перо при перекладке текста — вариант А «живой штрих», Гипотеза реализации, Контекст, Последствия, Решение

### Community 111 - "D-39. Разработка параллельными сессиями; Claude сам вливает в main"
Cohesion: 0.50
Nodes (4): D-39. Разработка параллельными сессиями; Claude сам вливает в main, Контекст, Последствия, Решение

### Community 112 - "8. Совместная работа и шеринг"
Cohesion: 0.40
Nodes (5): 8. Совместная работа и шеринг, Гости (D-37), Открыто (см. `open-questions.md`), Реализация, Требования

### Community 113 - "D-27. В прототипе пера текст хранится в Yrs"
Cohesion: 0.50
Nodes (4): D-27. В прототипе пера текст хранится в Yrs, Контекст, Последствия, Решение

### Community 114 - "yjs"
Cohesion: 0.50
Nodes (4): yjs@^13.6.27, yjs, peerDependencies, yjs@^13.6.0

### Community 115 - ".prettierrc.json"
Cohesion: 0.50
Nodes (3): printWidth, singleQuote, trailingComma

### Community 117 - "./document"
Cohesion: 0.67
Nodes (3): import, types, ./document

## Knowledge Gaps
- **65 isolated node(s):** `RFC-4648`, `RFC-9562`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `docker compose` (+60 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 691 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Контракт: модель документа (v1)` connect `Контракт: модель документа (v1)` to `Контракт: дизайн-токены «Тихая бумага» (v1)`, `document-model.md`?**
  _High betweenness centrality (0.240) - this node is a cross-community bridge._
- **What connects `RFC-4648`, `RFC-9562`, `../../tsconfig.base.json` to the rest of the system?**
  _65 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.02702702702702703 - nodes in this community are weakly interconnected._
- **Why does `packages/test-vectors (shared test vectors)` connect `Shared test vectors (input -> expected output) run in Swift and TypeScript` to `04-editor.md`, `document-model.md`, `07-encryption.md`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05744888023369036 - nodes in this community are weakly interconnected._
- **Should `Скрипт обновления графа` be split into smaller, more focused modules?**
  _Cohesion score 0.037991858887381276 - nodes in this community are weakly interconnected._
- **Should `Shared test vectors (input -> expected output) run in Swift and TypeScript` be split into smaller, more focused modules?**
  _Cohesion score 0.05052790346907994 - nodes in this community are weakly interconnected._