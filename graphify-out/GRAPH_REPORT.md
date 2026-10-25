# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 162 files · ~56,992 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 5)

## Summary
- 2003 nodes · 4146 edges · 108 communities (103 shown, 5 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 492 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b2801983`
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
- decisions/README.md
- Контракт: дизайн-токены «Тихая бумага» (v1)
- Модель данных и глоссарий (2)
- 08-sharing.md
- crypto.md
- document-model.md
- keys.ts
- 0035-strokes-on-deleted-text.md
- 0009-notebook-mode-choice.md (2)
- План этапов и отложенное
- stack.md
- contracts/crypto.ts
- client.ts
- Datascratch — правила для ИИ
- 0011-handwriting-for-agents.md
- envelope.ts
- Технологический стек — РЕШЕНО (2026-10-25)
- Graphify
- 9. API и внешние ИИ-агенты
- Дизайн и организация
- D-05. Перо при перекладке текста — вариант А «живой штрих»
- compilerOptions
- data-model.md
- 0036-space-notebook-folder.md
- envelope.ts
- 2. Платформы
- exports
- Контракт: модель документа (v1) (2)
- api.md
- risks.md
- iOS-стек и два языка (2)
- HubPrincipal
- development.md
- graphify_docs.py
- sync-protocol.md
- 0001-storage-in-database.md
- Stage 3: server, sync, encryption (accounts, CRDT sync, history compaction, two notebook modes, docker compose, VPS, backups)
- 12-craft-features.md
- 06-data-server.md
- 11. Нефункциональные требования
- 01-concept.md
- strokes.test.ts (2)
- design-tokens.md
- 0038-design-quiet-paper.md
- Stage 1: pen-in-text prototype on iPad (TextKit 2 + Yrs + pen layer, living stroke)
- 0013-collaboration-sharing.md
- 0017-languages.md
- 0005-living-stroke.md
- План разработки
- shared/package.json
- yjs.ts
- MemorySyncStorage
- common.ts
- Контракт: REST API сервера (v1)
- glossary.md
- tasks
- Контракт: модель документа (v1)
- D-03. Платформы: нативные iPhone и iPad + полноценный веб
- 0008-pdf-annotations.md
- PostgreSQL
- D-36. Структура: пространство → блокноты → папки
- Контракт: шифрование (v1)
- 0041-craft-inspired-features.md
- Stream design-system (claude/design-system): packages/design-tokens, packages/ui, apps/ios/Packages/DSDesign — Quiet Paper tokens, web and SwiftUI components
- 02-platforms.md
- 0032-min-ios-version.md
- 04-editor.md
- vitest
- 3. Apple Pencil в тексте — ключевая фича
- open-questions.md
- ./document
- CryptoError
- 12. Функции по мотивам Craft
- ws
- contracts/README.md
- D-21. Технологический стек
- 04-editor.md (4)
- test-vectors/tsconfig.json
- Обзор архитектуры: разделы
- 7. Шифрование и доступ агентов
- scripts
- Контракт: дизайн-токены «Тихая бумага» (v1) (2)
- 0025-no-redis.md
- Контракт: рукописные штрихи (v1)
- D-02. Отдельной десктоп-версии нет, на компьютере — веб
- Дизайн и организация (2) (2)
- Stream core (claude/core): packages/shared, packages/test-vectors, root configs — contract types, crypto, stroke codec, document schema, sync client, test vectors
- D-39. Разработка параллельными сессиями; Claude сам вливает в main
- 0031-crdt-yjs.md
- yjs
- .prettierrc.json
- 0034-auth-email-password.md
- pnpm-workspace.yaml

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
- `4.2. Схема блоков` --references--> `table()`  [INFERRED]
  docs/architecture/contracts/document-model.md → packages/shared/src/document/markdown.ts
- `4.2. Схема блоков` --references--> `label()`  [INFERRED]
  docs/architecture/contracts/document-model.md → tools/graphify_docs.py
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

## Communities (108 total, 5 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.03
Nodes (72): ACCESS_TOKEN_TTL_MS, AGENT_PERMISSIONS, AgentPermission, AgentToken, agentTokenSchema, API_ERROR_CODES, API_PREFIX, API_ROUTES (+64 more)

### Community 1 - "store.ts"
Cohesion: 0.05
Nodes (71): AuthorKind, ANCHOR_KINDS, AnchorKind, MIN_SEGMENT_POINTS, ORPHAN_STROKE_PURGE_DAYS, POINT_BYTES, POINT_FIELDS, REFERENCE_BLOCK_WIDTH (+63 more)

### Community 2 - "Скрипт обновления графа"
Cohesion: 0.05
Nodes (49): DateOnly, IsoDateTime, Uuid, ACCOUNT_SETTINGS_KEYS, AccountSettings, ATOM_BLOCK_NODES, BlockAttrs, BlockNodeName (+41 more)

### Community 3 - "strokes.md"
Cohesion: 0.14
Nodes (22): Блок drawing (высота в pt; штрихи — в strokes), anchorKind: text | block (заметка на полях) | image | drawing, Перепривязка якорей после отмены/повтора: в той же транзакции якорь удалённого символа с redone-элементом переписывается на относительную позицию нового элемента, Координаты block / image / drawing — в долях ширины блока, Правило D-35 в отрисовке: точки удалённых символов не рисуются, штрих остаётся в документе; отмена возвращает пометку, Координаты text-штриха: смещение от начала глифа якорного символа в em, Штрих почти неизменяем после рисования; ластик удаляет штрих целиком или заменяет кусками, Разрыв штриха по строкам: соседние точки на разных line fragments → отдельные сегменты (+14 more)

### Community 4 - "Shared test vectors (input -> expected output) run in Swift and TypeScript"
Cohesion: 0.05
Nodes (41): applyBlockOperations (block ops for agents), @datascratch/shared/contracts (types and zod schemas), createAccountKeys / rekeyPassword, crypto.md contract, @datascratch/shared/crypto (libsodium), D-35 (strokes on deleted text kept), @datascratch/shared package, document-model.md contract (+33 more)

### Community 5 - "0009-notebook-mode-choice.md (3)"
Cohesion: 0.05
Nodes (39): AckMessage, ackMessageSchema, CLIENT_PLATFORMS, ClientAwarenessMessage, clientAwarenessMessageSchema, clientMessageSchema, clientMsgIdSchema, deviceIdSchema (+31 more)

### Community 6 - "0039-parallel-sessions.md"
Cohesion: 0.17
Nodes (18): apps/ios — iPhone + iPad, iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), apps/server — сервер, Cross-stream contracts (docs/architecture/contracts/) changed only via the coordinator session, Claude coordinator merges stream branches into main when CI is green, Coordinator session (merges branches into main, owns roadmap.md, CHANGELOG.md and contracts), Stream agents (claude/agents): packages/agents, agents-api contract draft — MCP, REST, tokens, log, PNG render, Stream core (claude/core): packages/shared, packages/test-vectors, root configs — contract types, crypto, stroke codec, document schema, sync client, test vectors (+10 more)

### Community 7 - "D-30. База данных сервера — PostgreSQL"
Cohesion: 0.13
Nodes (37): accountRoots(), notebookRoots(), closeTab(), deleteFolder(), deleteNotebookRef(), deleteNoteMeta(), deleteSpace(), findDailyNote() (+29 more)

### Community 8 - "extract.ts"
Cohesion: 0.09
Nodes (33): DEFAULT_NOTE_STYLE, TASK_STATES, TaskState, ATTR_TEXT_BLOCKS, attrText(), buildBacklinks(), deltaText(), extractNoteLinks() (+25 more)

### Community 9 - "SyncClient"
Cohesion: 0.14
Nodes (5): ClientMessage, decryptAwareness(), encryptDocUpdate(), SyncClient, OutboxItem

### Community 10 - "stack.md"
Cohesion: 0.21
Nodes (13): Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, File Storage (disk or external S3), Guest via Link (web, no account), iOS / iPadOS Client (Swift, TextKit 2, Yrs, GRDB), Key Store (agent notebooks) (+5 more)

### Community 11 - "CHANGELOG.md"
Cohesion: 0.14
Nodes (20): 2026-10-25, 2026-10-25 (вторая половина дня), Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел), Каркас монорепозитория (pnpm + Turborepo), девять потоков разработки, правила сессий-исполнителей, changelog.d, Создан CLAUDE.md и скелет монорепозитория (apps/, packages/, infra/) (+12 more)

### Community 12 - "generate.ts"
Cohesion: 0.15
Nodes (14): encryptAttachmentChunk(), toHex(), initCrypto(), cryptoVectors(), check, files, root, idVectors() (+6 more)

### Community 13 - "12. Функции по мотивам Craft"
Cohesion: 0.08
Nodes (31): devDependencies, eslint@^9.39.0, eslint-config-prettier@^10.1.0, @eslint/js@^9.39.0, globals@^16.4.0, prettier@^3.6.0, turbo@^2.5.0, typescript@^5.9.0 (+23 more)

### Community 14 - "test-vectors/package.json"
Cohesion: 0.08
Nodes (32): description, devDependencies, @datascratch/shared@workspace:*, eslint@^9.39.0, libsodium-wrappers-sumo@^0.8.2, prosemirror-model@^1.25.0, tsx@^4.20.0, @types/node@^22.10.0 (+24 more)

### Community 15 - "decisions/README.md"
Cohesion: 0.09
Nodes (25): D-19. Весь код пишет Claude, Последствия, Решение, D-23. Документация — источник истины; Graphify — граф знаний поверх неё, Контекст, Последствия, Решение, ADR file number equals decision number (D-05 -> 0005-*.md), template 0000-template.md (+17 more)

### Community 16 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.17
Nodes (23): attr(), block(), blockBody(), CALLOUT_KIND, children(), close(), Ctx, escapeBlockStart() (+15 more)

### Community 17 - "Модель данных и глоссарий (2)"
Cohesion: 0.10
Nodes (32): BLOCK_NODES, INLINE_NODES, MARKS, pmNodeSchema, TEXTBLOCK_NODES, addAgentMark(), applyBlockOperations(), ApplyOptions (+24 more)

### Community 18 - "08-sharing.md"
Cohesion: 0.16
Nodes (17): POST /docs — регистрация документа (account / notebook / note) до первого push, Share { id, target { kind, id }, permission, expiresAt, createdAt } — ссылка шеринга, Шеринг: /shares (view/edit, бессрочно по умолчанию, отзыв сразу отключает гостей), Права: user — документы своего аккаунта; guest — только документы шеринга, push только с правом edit, D-37. Гости по ссылке рисуют; ссылка живёт до отзыва, Гости со ссылкой на правку пишут и рисуют (пером, пальцем, мышью), Ссылка по умолчанию действует до отзыва; срок можно задать при создании, Решение (+9 more)

### Community 19 - "crypto.md"
Cohesion: 0.15
Nodes (21): Вложения: загрузка и докачка по кускам (/attachments/:id/chunks/:index), лимит 200 МБ, Ассоциированные данные ds1|… привязывают шифротекст к месту (doc, awareness, ключи, куски вложений), Вложения шифруются кусками по 1 MiB, каждый — отдельный конверт, Конверт шифротекста: версия 0x01 + nonce 24 байта + XChaCha20-Poly1305-IETF (тег 16 байт), Иерархия ключей: пароль → passwordKey → masterKey → notebookKey → noteKey, libsodium на всех платформах (libsodium-wrappers-sumo в TS, swift-sodium в iOS), loginKey = BLAKE2b(authSeed, "ds1|login"); сервер хранит Argon2id(loginKey), masterKey — 32 случайных байта, создаётся при регистрации, шифрует account-документ (+13 more)

### Community 20 - "document-model.md"
Cohesion: 0.16
Nodes (21): y-prosemirror не записывает атрибуты узлов со значением null: отсутствующий атрибут = null (значение по умолчанию схемы), Документ account: spaces, notebooks, settings, starred, tabs (ключ — masterKey), Схема блоков: doc = title block+ (paragraph, heading, списки, taskList, callout, codeBlock, mathBlock, mermaid, table, image, file, drawing, pageCard), Comment { blockId, anchor (относительные позиции), author user | guest | agent, text, resolvedAt }, Даты ISO 8601 в UTC; «только дата» YYYY-MM-DD; миллисекунды — только в штрихах, Векторы совместимости модели документа packages/test-vectors/document/* (iOS/Yrs обязан читать и писать формат y-prosemirror), Вставка текста в Y.XmlText без явных атрибутов наследует форматирование слева (Yjs/Yrs) — писатели всегда передают явный набор атрибутов, Folder { parentId, name, icon, color, order } — вложенность без ограничения глубины (+13 more)

### Community 21 - "keys.ts"
Cohesion: 0.18
Nodes (21): KdfParams, decryptFromBase64Url(), generateSalt(), createAccountKeys(), generateKey(), NewAccountKeys, RekeyedPassword, rekeyPassword() (+13 more)

### Community 22 - "0035-strokes-on-deleted-text.md"
Cohesion: 0.20
Nodes (11): Контракт меняет только сессия-координатор; исполнитель присылает предложение, Обводки и стрелки «растягиваются» вместе с текстом; при проблемах — изменение контракта через координатора, D-35. Пометка на удалённом тексте исчезает вместе с ним, Вариант «потерянные пометки» — отклонён: лишний интерфейс, Частичное удаление: штрих «сжимается» до оставшегося текста, Вариант «прилипать к соседнему символу» — отклонён: пометка может оказаться не на том слове, Рукописная пометка исчезает вместе с удалённым текстом (пользователем, агентом, другим устройством), Рассмотренные варианты (+3 more)

### Community 23 - "0009-notebook-mode-choice.md (2)"
Cohesion: 0.17
Nodes (14): PATCH /notebooks/:id/mode — включение режима «для агентов» передаёт notebookKey, выключение удаляет серверную обёртку, Режим «для агентов»: клиент передаёт notebookKey по TLS, сервер оборачивает его serverKey; расшифровка только при запросе агента с токеном, serverKey — 32 байта из DS_KMS_KEY (окружение сервера, не в базе), D-04. Одновременно сквозное шифрование и доступ по API, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), Контекст, Последствия (+6 more)

### Community 24 - "План этапов и отложенное"
Cohesion: 0.09
Nodes (22): runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group, jobs, check (+14 more)

### Community 25 - "stack.md"
Cohesion: 0.21
Nodes (12): Транспорт wss://<host>/v1/sync: JSON-кадры с type, base64url, ping/pong каждые 25 с, Astro (landing page), Drizzle ORM, TypeScript on Node.js, pnpm + Turborepo Monorepo, Scaling via PostgreSQL LISTEN/NOTIFY, Radix + Tailwind + Motion Design System, Redis (rejected) (+4 more)

### Community 26 - "contracts/crypto.ts"
Cohesion: 0.12
Nodes (23): DEFAULT_KDF, ENVELOPE_VERSION, KDF_ALG, KDF_MEM, KDF_OPS, KDF_OUTPUT_BYTES, kdfParamsSchema, KEY_BYTES (+15 more)

### Community 27 - "client.ts"
Cohesion: 0.13
Nodes (22): base64UrlDecodedLength(), ClientPlatform, MAX_SNAPSHOT_BYTES, MAX_UPDATE_BYTES, ServerMessage, SNAPSHOT_THRESHOLD_BYTES, SNAPSHOT_THRESHOLD_UPDATES, SYNC_PROTOCOL_VERSION (+14 more)

### Community 28 - "Datascratch — правила для ИИ"
Cohesion: 0.29
Nodes (7): Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой, Правила, Среда разработки

### Community 29 - "0011-handwriting-for-agents.md"
Cohesion: 0.12
Nodes (20): AgentToken { id, name, notebookIds, permission, expiresAt, createdAt, lastUsedAt } — без секрета, Токены агентов /agent-tokens: блокноты, read / read_write, срок; токен показывается один раз, Контракт agents-api.md (MCP и REST для самих агентов) — появится на этапе агентов, blockId (UUIDv7) у каждого блочного узла — для точечных правок агентов, заметок на полях и комментариев, D-11. Рукопись для агента — рендер в картинку (PNG), Решение, OPEN (before stage 5): MCP toolset (proposed in spec/09-agents-api.md), Stage 5: API and MCP for agents (tokens, rights incl. RLS, log, limits, handwriting PNG) (+12 more)

### Community 30 - "envelope.ts"
Cohesion: 0.26
Nodes (11): NONCE_BYTES, toBase64Url(), checkKey(), decryptEnvelope(), encryptEnvelope(), encryptToBase64Url(), randomBytes(), encryptAwareness() (+3 more)

### Community 31 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 32 - "Graphify"
Cohesion: 0.12
Nodes (16): Monorepo Structure (apps/, packages/, infra/), packages/test-vectors, Git, Graphify, Автоматизация, Две среды, Команды, Конец сессии (+8 more)

### Community 33 - "9. API и внешние ИИ-агенты"
Cohesion: 0.33
Nodes (6): 9. API и внешние ИИ-агенты, Агент умеет, Безопасность, Набросок инструментов MCP (ПРЕДЛОЖЕНО), Правки агента (D-10), Реализация

### Community 34 - "Дизайн и организация"
Cohesion: 0.17
Nodes (12): Проекты, личное, работа, учёба не смешиваются; минимум кнопок на экране, D-15. Дизайн — основная концепция продукта, Design references: Things 3, Linear, Craft, Arc, Последствия, Решение, Ориентир Craft: градиентные подложки, документы-карточки с обложками, боковая панель «Вкладки / Избранное / Папки / Теги», стеклянные панели, контекстные меню, Light/dark theme, Dynamic Type, VoiceOver, full iPad keyboard support, Feel references: Things 3, Linear, Craft, Arc (+4 more)

### Community 35 - "D-05. Перо при перекладке текста — вариант А «живой штрих»"
Cohesion: 0.40
Nodes (5): D-05. Перо при перекладке текста — вариант А «живой штрих», Гипотеза реализации, Контекст, Последствия, Решение

### Community 36 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib, module (+10 more)

### Community 37 - "data-model.md"
Cohesion: 0.18
Nodes (11): meta.formatVersion = 1; документ новее клиента открывается только для чтения (R-03), Поля штриха: v, tool, color, width, opacity, anchorKind, blockId, anchors, points, hint, author, createdAt, Note, Stroke, StrokePoint, Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК (+3 more)

### Community 38 - "0036-space-notebook-folder.md"
Cohesion: 0.15
Nodes (18): NotebookRef { id, spaceId, name, mode: private | agent, … } — ключ блокнота здесь не хранится, Space { id, name, icon, color, order, createdAt } в account-документе, Organization Hierarchy (Account > Space > Notebook > Folder > Note), D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, D-14. Организация: богатая, но не перегруженная, Предложенная структура: пространства → вложенные папки; поперёк — вложенные и умные теги, цвета, избранное, недавние, Решение (+10 more)

### Community 39 - "envelope.ts"
Cohesion: 0.13
Nodes (19): RFC-4648, ATTACHMENT_CHUNK_BYTES, ENVELOPE_OVERHEAD, attachmentChunkCount(), attachmentCiphertextSize(), decryptAttachment(), decryptAttachmentChunk(), encryptAttachment() (+11 more)

### Community 40 - "2. Платформы"
Cohesion: 0.40
Nodes (5): 2. Платформы, Минимальная версия iOS/iPadOS — 26 (D-32), Минимальная версия iOS/iPadOS — ОТКРЫТО, Тестовые устройства (известно на 2026-10-25), Требования

### Community 41 - "exports"
Cohesion: 0.12
Nodes (17): import, types, import, types, exports, ./contracts, ./crypto, ./ids (+9 more)

### Community 42 - "Контракт: модель документа (v1) (2)"
Cohesion: 0.16
Nodes (14): ACCOUNT_ROOTS, FORMAT_VERSION, NOTE_ROOTS, NOTEBOOK_ROOTS, NoteDocMeta, PMNode, AccountDocRoots, DocOptions (+6 more)

### Community 43 - "api.md"
Cohesion: 0.17
Nodes (15): Аккаунт и устройства: /me, /devices (отзыв сессий), удаление аккаунта, Эндпоинты /auth: prelogin, signup, login, refresh, logout, recovery, password, Аутентификация Bearer: accessToken 15 мин + refreshToken 30 дней с ротацией, Идентификаторы создаёт клиент (UUIDv7); повторный POST идемпотентен, иначе 409 conflict, Device { id, name, createdAt, lastSeenAt, current } — устройство (сессия) аккаунта, POST /shares/:id/guest — гостевой токен (без авторизации) для hello в синхронизации, GET /health → { ok: true, version } — служебная проверка сервера, Notebook { id, mode, createdAt, wrappedKey } — ответ /notebooks (+7 more)

### Community 44 - "risks.md"
Cohesion: 0.18
Nodes (13): Official MCP TypeScript SDK (Streamable HTTP, OAuth 2.1), Платный аккаунт Apple Developer; Team ID задаётся на Mac при первой подписи, в репозитории не хранится, MCP (Model Context Protocol), Universal Links, Apple Developer Account, R-07 Web Pen Worse than Native, R-09 Graphify Is a Young Third-Party Tool, R-12 No Paid Apple Account (7-day installs) (+5 more)

### Community 45 - "iOS-стек и два языка (2)"
Cohesion: 0.12
Nodes (15): devDependencies, eslint@^9.39.0, prosemirror-model@^1.25.12, tsup@^8.5.0, @types/node@^22.10.0, @types/ws@^8.5.13, typescript@^5.9.0, y-prosemirror@^1.3.7 (+7 more)

### Community 47 - "development.md"
Cohesion: 0.08
Nodes (35): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, Стартовый хук Claude Code (.claude/hooks/session-start.sh) (+27 more)

### Community 48 - "graphify_docs.py"
Cohesion: 0.28
Nodes (7): Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 49 - "sync-protocol.md"
Cohesion: 0.06
Nodes (52): Формат ошибок { error: { code, message } } и коды bad_request…internal, История версий: GET /docs/:id/versions и /versions/:seq (зашифрованные снимки), Метка agentEdit (agentId, at) — подсветка правок агента до принятия пользователем, 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05) (+44 more)

### Community 50 - "0001-storage-in-database.md"
Cohesion: 0.18
Nodes (10): hint — распознанная форма (underline, strike, circle, highlight, arrow, scribble) для агентов и экспорта, D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты (+2 more)

### Community 51 - "Stage 3: server, sync, encryption (accounts, CRDT sync, history compaction, two notebook modes, docker compose, VPS, backups)"
Cohesion: 0.50
Nodes (4): VPS Hosting (Hetzner or similar), Recovery Key for Forgotten Password, R-11 Single VPS Is a Single Point of Failure, Stage 3: server, sync, encryption (accounts, CRDT sync, history compaction, two notebook modes, docker compose, VPS, backups)

### Community 52 - "12-craft-features.md"
Cohesion: 0.25
Nodes (12): Calendar screen: day feed with tasks and daily note (MVP); system calendar integration after MVP, Card document: nested document shown as a card with cover (MVP), Collections: records with properties and table / gallery / kanban views with filter, sort, grouping (after MVP), Daily note: one per day, created on demand, from template (MVP), Document cover image with offset (MVP), Document style: font (serif/sans/mono), width, paper (smooth/dots/grid/ruled), backdrop color or gradient, text color; style gallery after MVP, Tabs: several open documents on iPad and web (MVP), Inbox: standalone tasks outside documents in a service note of the notebook (MVP) (+4 more)

### Community 53 - "06-data-server.md"
Cohesion: 0.06
Nodes (38): Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), MinIO (rejected), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting (+30 more)

### Community 54 - "11. Нефункциональные требования"
Cohesion: 0.40
Nodes (5): 11. Нефункциональные требования, Доступность, Надёжность, Ресурсы сервера, Языки

### Community 55 - "01-concept.md"
Cohesion: 0.20
Nodes (8): D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, 1. Концепция продукта, Notesnook (reference product: E2E encryption, reliable sync), Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения, Суть в одном абзаце

### Community 56 - "strokes.test.ts (2)"
Cohesion: 0.15
Nodes (7): SyncStatus, WebSocketFactory, deliver(), MemorySyncHub, clients, makeClient(), text()

### Community 57 - "design-tokens.md"
Cohesion: 0.29
Nodes (12): Подложки backdrop.* (sand, dusk, mist, meadow, ember) — мягкие градиенты в духе Craft, Цветовые токены: bg.canvas («бумага»), text.primary («чернила»), accent («синие чернила»), danger/success/warning — светлая и тёмная тема, Ширина колонки документа: normal 720, wide 960, full, Тактильная отдача iOS: selection, success (задача выполнена), warning (удаление), Чернила пера ink.* (black, blue, red, green, purple, brown) и маркеры highlight.*, Движение: пружины motion.snappy / smooth / gentle, длительности duration.* для веба, Сетка отступов 4 pt, радиусы radius.*, тени shadow.card / shadow.popover, Цвета tint.* (.fg / .bg) для папок, тегов и выносок (+4 more)

### Community 58 - "0038-design-quiet-paper.md"
Cohesion: 0.33
Nodes (6): D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Вариант «графит по умолчанию» — отклонён: чернила на тёмном читаются хуже, Вариант «чистый нейтральный» (Linear / Things) — не выбран, Тёмная тема — тёплый графит, Рассмотренные варианты, Решение

### Community 59 - "Stage 1: pen-in-text prototype on iPad (TextKit 2 + Yrs + pen layer, living stroke)"
Cohesion: 0.21
Nodes (11): Записываются только сглаженные coalesced-точки завершённого штриха, без predicted, Custom iOS Pen Render Layer (Metal or Core Animation), TextKit 2 (UIKit editor), Canvas + Pointer Events Pen Layer, Predicted / Coalesced Touches, ProMotion (120 Hz), R-01 Pen-in-Text May Not Work, Pen render choice: Metal vs Core Animation (latency and frame measurement) (+3 more)

### Community 60 - "0013-collaboration-sharing.md"
Cohesion: 0.22
Nodes (9): awareness — курсоры и присутствие: зашифровано, не хранится, только рассылается, D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account, Real-time collaborative editing, Universal Links (paid Apple Developer account), Последствия, Решение, Real-time co-editing with cursors and presence (guests shown as Guest) (+1 more)

### Community 61 - "0017-languages.md"
Cohesion: 0.50
Nodes (4): D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, UI languages Russian and English, no RTL (D-17)

### Community 62 - "0005-living-stroke.md"
Cohesion: 0.14
Nodes (12): Привязка к тексту: каждая точка → ближайший символ строки (живой штрих), PencilKit (rejected), D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, Living Stroke, OPEN (stage 1): living stroke details — circles around several words, arrows between words on different lines; decide on prototype, Handwriting input types (text marks, margin notes, drawing block, drawing on images, Scribble) (+4 more)

### Community 63 - "План разработки"
Cohesion: 0.15
Nodes (13): Критерии приёмки, План разработки, Подготовка, Потоки разработки (D-39), Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad) (+5 more)

### Community 64 - "shared/package.json"
Cohesion: 0.18
Nodes (12): dependencies, libsodium-wrappers-sumo@^0.8.2, zod@^4.1.0, description, files, libsodium-wrappers-sumo, name, private (+4 more)

### Community 65 - "yjs.ts"
Cohesion: 0.22
Nodes (11): PMMark, attributesToMarks(), Attrs, jsonEqual(), markNameFromAttr(), marksToAttributes(), pmContentToY(), pmNodeToY() (+3 more)

### Community 67 - "common.ts"
Cohesion: 0.09
Nodes (23): RFC-9562, AUTHOR_KINDS, authorKindSchema, Base64Url, BASE64URL_REGEX, base64UrlBytesSchema(), base64UrlLength(), base64UrlSchema (+15 more)

### Community 68 - "Контракт: REST API сервера (v1)"
Cohesion: 0.17
Nodes (12): Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1), Общее, Служебное, Токены агентов (`spec/09-agents-api.md`) (+4 more)

### Community 69 - "glossary.md"
Cohesion: 0.14
Nodes (17): Anchor (textRange / paragraph / drawingBlock / image), doc_updates Table (encrypted Yjs updates), Web PWA Client (React, TipTap, Yjs, IndexedDB), Dexie (IndexedDB), GRDB (SQLite), TipTap (ProseMirror), Vite + React + TypeScript PWA, Yjs (+9 more)

### Community 70 - "tasks"
Cohesion: 0.17
Nodes (11): dependsOn, outputs, dependsOn, $schema, tasks, build, lint, test (+3 more)

### Community 71 - "Контракт: модель документа (v1)"
Cohesion: 0.12
Nodes (17): 1. Три вида документов Yjs, 2. Документ `account`, 3. Документ `notebook` (индекс блокнота), 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note` (+9 more)

### Community 72 - "D-03. Платформы: нативные iPhone и iPad + полноценный веб"
Cohesion: 0.50
Nodes (4): D-03. Платформы: нативные iPhone и iPad + полноценный веб, Контекст, Последствия, Решение

### Community 73 - "0008-pdf-annotations.md"
Cohesion: 0.20
Nodes (10): D-08. Аннотации PDF пером — не в MVP, Аннотации PDF пером (PDFKit + свой слой штрихов) — после MVP, этап расширений, Решение, Решение (предложение), D-16. Импорт — не сейчас, Решение, CLOSED: PDF annotations after MVP (D-08), R-08 Huge Project Scope (+2 more)

### Community 74 - "PostgreSQL"
Cohesion: 0.31
Nodes (8): Журнал действий агента GET /agent-tokens/:id/audit, agent_tokens / agent_audit_log Tables, Server PostgreSQL Schema (Stage 3 Draft), Handwriting-to-PNG Render (pg-boss queue), docker compose Self-Hosting (server + PostgreSQL), pg-boss Job Queue, PostgreSQL, OPEN (before stage 5): handwriting format for agents — PNG (D-11, proposed)

### Community 75 - "D-36. Структура: пространство → блокноты → папки"
Cohesion: 0.67
Nodes (3): D-36. Структура: пространство → блокноты → папки, Рассмотренные варианты, Решение

### Community 76 - "Контракт: шифрование (v1)"
Cohesion: 0.20
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 77 - "0041-craft-inspired-features.md"
Cohesion: 0.25
Nodes (6): Ежедневные заметки и «Входящие» (kind daily / inbox) в блокноте settings.dailyNotebookId, D-41. Набор функций по мотивам Craft, Контекст, Решение, OPEN (before stage 2): Craft features MVP / post-MVP split (D-41, proposed), Stage 2: MVP on iPad and iPhone, local (editor, handwriting, links, tags, organization, search, design system)

### Community 78 - "Stream design-system (claude/design-system): packages/design-tokens, packages/ui, apps/ios/Packages/DSDesign — Quiet Paper tokens, web and SwiftUI components"
Cohesion: 0.38
Nodes (5): Stream design-system (claude/design-system): packages/design-tokens, packages/ui, apps/ios/Packages/DSDesign — Quiet Paper tokens, web and SwiftUI components, packages/design-tokens — дизайн-токены «Тихая бумага», tokens.json as source of Quiet Paper design token values; generators to CSS variables (web) and Swift (iOS), packages/ui — веб-компоненты дизайн-системы, React design-system components on Radix + Tailwind + Motion in Quiet Paper style

### Community 79 - "02-platforms.md"
Cohesion: 0.16
Nodes (9): Full-featured web client (TypeScript), D-06. Рисование пальцем на iPhone — да, опционально, Finger drawing toggle on iPhone, Решение, iPad client (primary, Apple Pencil / Pencil Pro squeeze and roll, hover, Stage Manager, keyboard shortcuts), iPhone client (primary, quick notes, one-handed, finger drawing option D-06), iPhone and iPad share one codebase (universal app), Web client as full desktop replacement (Pointer Events with pressure, offline, PWA, mobile-browser editing for guests) (+1 more)

### Community 80 - "0032-min-ios-version.md"
Cohesion: 0.15
Nodes (15): Решения по анкетам пользователя: D-32…D-41 и PDF после MVP (D-08), Datascratch (working name), D-32. Минимальная версия iOS/iPadOS — 26, Минимальная версия iOS/iPadOS 26 (IPHONEOS_DEPLOYMENT_TARGET = 26.0), Liquid Glass — системный дизайн iOS 26, Отклонённые варианты: iOS 18+ (шире охват) и 17.5+ (минимум для Pencil Pro), Последствия, Рассмотренные варианты (+7 more)

### Community 81 - "04-editor.md"
Cohesion: 0.14
Nodes (15): Производные данные строятся локально: индекс задач, полнотекстовый поиск, бэклинки, теги, Inline-узлы noteLink ([[ ]]) и tag (без #, вложенность через /), taskItem: taskId, state open / done / cancelled, scheduled, deadline, completedAt, Obsidian (reference product: links, backlinks, tags, Markdown export), 4. Редактор, Backlinks, Editor content (headings, lists, tables, code, formulas, attachments, drawing blocks), Link graph view (not in MVP, stage 6) (+7 more)

### Community 83 - "3. Apple Pencil в тексте — ключевая фича"
Cohesion: 0.22
Nodes (9): 3. Apple Pencil в тексте — ключевая фича, Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера, Перекладка текста — вариант А «живой штрих» (D-05, РЕШЕНО) (+1 more)

### Community 84 - "open-questions.md"
Cohesion: 0.08
Nodes (29): XcodeGen project.yml (D-28), GitHub Actions CI (incl. macOS iOS builds), XcodeGen, docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, D-24. Название продукта (+21 more)

### Community 85 - "./document"
Cohesion: 0.67
Nodes (3): import, types, ./document

### Community 86 - "CryptoError"
Cohesion: 0.33
Nodes (8): CryptoError, CryptoErrorCode, CROCKFORD_ALPHABET, crockfordValue(), decodeCrockford(), encodeCrockford(), formatRecoveryKey(), parseRecoveryKey()

### Community 87 - "12. Функции по мотивам Craft"
Cohesion: 0.25
Nodes (8): 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft, Связь с моделью данных

### Community 89 - "contracts/README.md"
Cohesion: 0.20
Nodes (10): Тестовые векторы crypto: KDF, конверты, Base32 ключа восстановления, куски вложений (Swift и TS), Контракт — точное описание формата/протокола, который реализуют несколько частей (iOS на Swift, веб и сервер на TS), Версионирование контрактов v1, v2…; ломающее изменение — новая версия с явной миграцией, Совместимость доказывается общими тестовыми векторами (packages/test-vectors), Типы TypeScript контрактов в packages/shared/src/contracts/ — часть контракта, Контракты между частями системы, Правила изменения, Тестовые векторы strokes: упаковка точек, разрешение якорей после правок, правило D-35 (+2 more)

### Community 90 - "D-21. Технологический стек"
Cohesion: 0.22
Nodes (8): createNotebookRequestSchema, emailSchema, registerDocRequestSchema, signupRequestSchema, isoDateTimeSchema, uuidSchema, AD, KEY

### Community 91 - "04-editor.md (4)"
Cohesion: 0.25
Nodes (7): compilerOptions, lib, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 92 - "test-vectors/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, lib, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 94 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 95 - "7. Шифрование и доступ агентов"
Cohesion: 0.29
Nodes (7): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Вход и восстановление доступа (D-34), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 97 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, lint, test, test:watch, typecheck

### Community 99 - "Контракт: дизайн-токены «Тихая бумага» (v1) (2)"
Cohesion: 0.40
Nodes (5): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 102 - "0025-no-redis.md"
Cohesion: 0.12
Nodes (22): Убран Redis (D-25): один процесс сервера, очередь — pg-boss на PostgreSQL, GRDB (SQLite), pg-boss job queue, D-25. Redis не используем, Edit broadcast interface (in-memory), PostgreSQL LISTEN/NOTIFY, Redis (rejected), Valkey (free Redis alternative) (+14 more)

### Community 104 - "Контракт: рукописные штрихи (v1)"
Cohesion: 0.22
Nodes (9): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4.1. Перепривязка якорей (отмена и восстановление версии), 4.2. Когда штрих считается «осиротевшим» и удаляется навсегда, 4. Привязка к тексту (живой штрих), 5. Отрисовка толщины, 6. Тестовые векторы (+1 more)

### Community 105 - "D-02. Отдельной десктоп-версии нет, на компьютере — веб"
Cohesion: 0.67
Nodes (3): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение

### Community 106 - "Дизайн и организация (2) (2)"
Cohesion: 0.40
Nodes (5): 5. Организация заметок и дизайн, Дизайн (D-15 — РЕШЕНО, главный принцип продукта), Организация (D-14 — РЕШЕНО по сути; структура ниже — ПРЕДЛОЖЕНО), Принципы, Реализация

### Community 107 - "Stream core (claude/core): packages/shared, packages/test-vectors, root configs — contract types, crypto, stroke codec, document schema, sync client, test vectors"
Cohesion: 0.10
Nodes (17): apps/web — веб-клиент, Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), packages/shared — `@datascratch/shared`, Коротко об использовании, Особенности, о которых стоит знать, Подпути, Разработка, packages/test-vectors — общие тестовые векторы (+9 more)

### Community 111 - "D-39. Разработка параллельными сессиями; Claude сам вливает в main"
Cohesion: 0.50
Nodes (4): D-39. Разработка параллельными сессиями; Claude сам вливает в main, Контекст, Последствия, Решение

### Community 113 - "0031-crdt-yjs.md"
Cohesion: 0.06
Nodes (49): Automerge (fallback CRDT), Yrs (Rust Yjs) with Swift Wrapper, Утверждён технологический стек (D-21), отказ от ядра на Rust (D-22), Прототип пера хранит текст в Yrs (D-27), Canvas + Pointer Events, Custom pen renderer (Metal vs Core Animation TBD), Dexie (IndexedDB), Drizzle ORM (+41 more)

### Community 114 - "yjs"
Cohesion: 0.50
Nodes (4): yjs@^13.6.27, yjs, peerDependencies, yjs@^13.6.0

### Community 115 - ".prettierrc.json"
Cohesion: 0.50
Nodes (3): printWidth, singleQuote, trailingComma

### Community 116 - "0034-auth-email-password.md"
Cohesion: 0.16
Nodes (15): Восстановление: recoveryLoginKey → wrappedMasterKeyRecovery → новый пароль; данные не перешифровываются, Ключ восстановления: 32 байта, Crockford Base32 с префиксом DS1-, показывается один раз, Notesnook, Import from Obsidian/Notesnook (later), D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления, Вход по email + паролю; один пароль и для входа, и для шифрования (как в Notesnook), Passkeys — сложно совместить со сквозным шифрованием сейчас; возможно позже, Ключ восстановления, выдаваемый при регистрации (+7 more)

## Knowledge Gaps
- **65 isolated node(s):** `RFC-4648`, `RFC-9562`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `Canvas + Pointer Events` (+60 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 691 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Контракт: модель документа (v1)` connect `Контракт: модель документа (v1)` to `document-model.md`?**
  _High betweenness centrality (0.227) - this node is a cross-community bridge._
- **What connects `RFC-4648`, `RFC-9562`, `../../tsconfig.base.json` to the rest of the system?**
  _65 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.02702702702702703 - nodes in this community are weakly interconnected._
- **Why does `Контракт: REST API сервера (v1)` connect `Контракт: REST API сервера (v1)` to `api.md`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05490296220633299 - nodes in this community are weakly interconnected._
- **Should `Скрипт обновления графа` be split into smaller, more focused modules?**
  _Cohesion score 0.04816326530612245 - nodes in this community are weakly interconnected._
- **Should `strokes.md` be split into smaller, more focused modules?**
  _Cohesion score 0.1422924901185771 - nodes in this community are weakly interconnected._