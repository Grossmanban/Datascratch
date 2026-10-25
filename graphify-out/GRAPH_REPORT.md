# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 52 files · ~50,793 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1601 nodes · 3334 edges · 110 communities (106 shown, 4 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 451 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Монорепозиторий и CLAUDE.md
- api.md
- sync-protocol.md
- 0005-living-stroke.md
- Organization Hierarchy (Account > Space > Notebook > Folder > Note)
- src/index.ts
- tasks
- Контракт: модель документа (v1) (2)
- PenLayer.ts
- 09-agents-api.md
- DatascratchEditor
- Правила для ИИ и документации
- Контракт: модель документа (v1)
- Дизайн и организация (2)
- 06-data-server.md
- 0009-notebook-mode-choice.md (3)
- CHANGELOG.md
- Правила для ИИ и документации (4)
- @tiptap/core
- iOS-стек и два языка (2)
- PenLayer.ts (2)
- Монорепозиторий и CLAUDE.md (2)
- 0001-storage-in-database.md
- План этапов и отложенное
- strokes.md
- open-questions.md
- D-41. Набор функций по мотивам Craft
- D-30. База данных сервера — PostgreSQL
- D-28. Процесс разработки: облако + Mac, сборка iOS в CI
- stack.md
- MCP + REST API
- Модель данных и глоссарий (5)
- decisions/README.md
- D-21. Технологический стек
- 12. Функции по мотивам Craft
- Server stack
- package.json
- compilerOptions
- Скрипт обновления графа
- 0034-auth-email-password.md
- 0002-no-desktop-app.md
- D-30. База данных сервера — PostgreSQL (2)
- design-tokens.md
- iOS-стек и два языка (2) (2)
- 12. Функции по мотивам Craft (2)
- 0004-encryption-and-api.md
- design-tokens.md (2)
- design-tokens.md (3)
- 08-sharing.md
- stack.md (2)
- 0024-product-name.md
- План разработки
- web-editor/package.json
- PostgreSQL
- Технологический стек — РЕШЕНО (2026-10-25)
- D-21. Технологический стек (2)
- Контракт: модель документа (v1) (2)
- 0005-living-stroke.md (2)
- Платформы и клиенты (2)
- open-questions.md (2)
- Контракт: дизайн-токены «Тихая бумага» (v1) (2)
- D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS) (2)
- tasks (2)
- Datascratch — правила для ИИ
- Правила для ИИ и документации (2) (2)
- Контракт: шифрование (v1)
- Модель данных и глоссарий (2) (2)
- Контракт: рукописные штрихи (v1)
- Модель данных и глоссарий (2)
- glossary.md
- 0032-min-ios-version.md
- blockId.ts
- compilerOptions (2)
- sync-protocol.md (2)
- Технологический стек — РЕШЕНО (2026-10-25) (2)
- open-questions.md (2)
- 12. Функции по мотивам Craft (3)
- NoteMeta: folderId, parentNoteId, title, kind, dailyDate, tags, wrappedKey, trashedAt, order
- Обзор архитектуры: разделы
- 0016-no-import-now.md
- design-tokens.md (4)
- 0009-notebook-mode-choice.md (5)
- risks.md
- scripts
- design-tokens.md (5)
- Модель данных — ЧЕРНОВИК
- 0005-living-stroke.md (3)
- 02-platforms.md
- 02-platforms.md (2)
- D-22. Без собственного общего ядра на Rust
- Компоненты стека (2) (2)
- 0016-no-import-now.md (2)
- 0030-server-database-postgresql.md
- 0030-server-database-postgresql.md (2)
- 2. Платформы
- design-tokens.md (6)
- 11. Нефункциональные требования
- Технологический стек — РЕШЕНО (2026-10-25) (3)
- Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1)
- 0003-platforms.md
- 0004-encryption-and-api.md (2)
- roadmap.md
- CHANGELOG.md (2)
- D-28. Процесс разработки: облако + Mac, сборка iOS в CI (2)
- roadmap.md (2)
- Дизайн и организация (2) (2)
- План этапов и отложенное (2)
- План этапов и отложенное (3)
- План этапов и отложенное (4)
- pnpm-workspace.yaml

## God Nodes (most connected - your core abstractions)
1. `PenLayer` - 42 edges
2. `DatascratchEditor()` - 24 edges
3. `Stage 1: pen-in-text prototype on iPad (TextKit 2 + Yrs + pen layer, living stroke)` - 20 edges
4. `@tiptap/core` - 19 edges
5. `yjs` - 17 edges
6. `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` - 17 edges
7. `compilerOptions` - 15 edges
8. `Процесс разработки (docs/development.md)` - 14 edges
9. `Yrs (Rust Yjs) with Swift Wrapper` - 14 edges
10. `2026-10-25` - 13 edges

## Surprising Connections (you probably didn't know these)
- `4.2. Схема блоков` --references--> `label()`  [INFERRED]
  docs/architecture/contracts/document-model.md → tools/graphify_docs.py
- `Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО` --semantically_similar_to--> `Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/README.md
- `Graph update after doc edits: graphify_docs.py prepare -> parallel extraction agents -> finish -> graphify export html -> check-update` --references--> `finish()`  [EXTRACTED]
  docs/development.md → tools/graphify_docs.py
- `finish refuses to write graph if nodes of unchanged files disappear` --references--> `finish()`  [EXTRACTED]
  docs/development.md → tools/graphify_docs.py
- `Graph update after doc edits: graphify_docs.py prepare -> parallel extraction agents -> finish -> graphify export html -> check-update` --references--> `prepare()`  [EXTRACTED]
  docs/development.md → tools/graphify_docs.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Live stroke anchoring design (D-05, char anchors, Yjs RelativePosition, Yrs)** — docs_spec_03_pencil_d05_live_stroke, docs_spec_03_pencil_char_anchor_offset_storage, docs_spec_03_pencil_yjs_relativeposition_anchors, docs_spec_03_pencil_d27_yrs_prototype [EXTRACTED 1.00]
- **Web pen layer pipeline (input, anchoring, reflow redraw, rendering)** — docs_spec_03_pencil_pointer_events_input, docs_spec_03_pencil_dom_range_anchoring, docs_spec_03_pencil_reflow_redraw, docs_spec_03_pencil_three_canvas_layers [EXTRACTED 1.00]

## Communities (110 total, 4 thin omitted)

### Community 0 - "Монорепозиторий и CLAUDE.md"
Cohesion: 0.05
Nodes (53): apps/ios — iPhone + iPad, iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), apps/server — сервер, apps/web — веб-клиент, Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), Custom iOS Pen Render Layer (Metal or Core Animation), TextKit 2 (UIKit editor), D-08. Аннотации PDF пером — не в MVP (+45 more)

### Community 1 - "api.md"
Cohesion: 0.05
Nodes (54): Аккаунт и устройства: /me, /devices (отзыв сессий), удаление аккаунта, Эндпоинты /auth: prelogin, signup, login, refresh, logout, recovery, password, Аутентификация Bearer: accessToken 15 мин + refreshToken 30 дней с ротацией, Идентификаторы создаёт клиент (UUIDv7); повторный POST идемпотентен, иначе 409 conflict, Device { id, name, createdAt, lastSeenAt, current } — устройство (сессия) аккаунта, POST /docs — регистрация документа (account / notebook / note) до первого push, POST /shares/:id/guest — гостевой токен (без авторизации) для hello в синхронизации, GET /health → { ok: true, version } — служебная проверка сервера (+46 more)

### Community 2 - "sync-protocol.md"
Cohesion: 0.06
Nodes (48): Формат ошибок { error: { code, message } } и коды bad_request…internal, История версий: GET /docs/:id/versions и /versions/:seq (зашифрованные снимки), 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05), 6. Права (+40 more)

### Community 3 - "0005-living-stroke.md"
Cohesion: 0.05
Nodes (47): Apple Pencil in text — key feature, Stroke point stored as (char anchor, dx/dy in font-size units), Custom stroke render layer over TextKit 2 (Metal or Core Animation), Web anchoring via DOM Range measurement, em offsets, Yjs relative position, Drawing block between paragraphs, Drawing on images (image coordinates), Stroke and pixel eraser (one undo step per gesture), Handwriting input types (text marks, margin notes, drawing block, drawing on images, system Scribble) (+39 more)

### Community 4 - "Organization Hierarchy (Account > Space > Notebook > Folder > Note)"
Cohesion: 0.08
Nodes (38): CoreOptions, HostRef, NoteSummary, UploadedAttachment, Callout, CALLOUT_TONES, Commands, Drawing (+30 more)

### Community 5 - "src/index.ts"
Cohesion: 0.14
Nodes (27): META_ORIGIN, Cover(), DatascratchEditorProps, EditorUser, FONT_VARS, WIDTHS, EditorHost, initNoteMeta() (+19 more)

### Community 6 - "tasks"
Cohesion: 0.06
Nodes (31): concurrency, cancel-in-progress, group, run, CI, jobs, test, name (+23 more)

### Community 7 - "Контракт: модель документа (v1) (2)"
Cohesion: 0.08
Nodes (20): TestEditor(), TestEditorProps, Window, App(), attachments, awA, awB, docA (+12 more)

### Community 8 - "PenLayer.ts"
Cohesion: 0.15
Nodes (22): bindToText(), distToSegment(), glyphForX(), groupLines(), hitsSegments(), intervalDistance(), leadingEdge(), lineForPoint() (+14 more)

### Community 9 - "09-agents-api.md"
Cohesion: 0.10
Nodes (23): AgentToken { id, name, notebookIds, permission, expiresAt, createdAt, lastUsedAt } — без секрета, Токены агентов /agent-tokens: блокноты, read / read_write, срок; токен показывается один раз, Контракт agents-api.md (MCP и REST для самих агентов) — появится на этапе агентов, blockId (UUIDv7) у каждого блочного узла — для точечных правок агентов, заметок на полях и комментариев, D-11. Рукопись для агента — рендер в картинку (PNG), Решение, pg-boss background job queue on PostgreSQL, PostgreSQL via Drizzle (D-30): accounts, notebooks, rights, tokens, encrypted updates, snapshots, agent log (+15 more)

### Community 10 - "DatascratchEditor"
Cohesion: 0.12
Nodes (18): react-dom@^19.0.0, BlockMenu(), blockTargetAt(), DragHandle(), LIST_ITEMS, Target, Floating(), LinkItem (+10 more)

### Community 11 - "Правила для ИИ и документации"
Cohesion: 0.13
Nodes (19): Стартовый хук Claude Code (.claude/hooks/session-start.sh), D-23 (документация), D-29. Graphify: порядок работы, чтобы граф был всегда актуален, git-хук Graphify (пересборка только по изменённому коду), Graphify 0.9.95 (пакет graphifyy), R-09 (риск: Graphify сломается или исчезнет), Смысловой слой графа (понятия, решения, связи — проход ИИ), Структурный слой графа (код, файлы, заголовки — без ИИ) (+11 more)

### Community 12 - "Контракт: модель документа (v1)"
Cohesion: 0.14
Nodes (22): y-prosemirror не записывает атрибуты узлов со значением null: отсутствующий атрибут = null (значение по умолчанию схемы), Документ account: spaces, notebooks, settings, starred, tabs (ключ — masterKey), Схема блоков: doc = title block+ (paragraph, heading, списки, taskList, callout, codeBlock, mathBlock, mermaid, table, image, file, drawing, pageCard), Comment { blockId, anchor (относительные позиции), author user | guest | agent, text, resolvedAt }, Даты ISO 8601 в UTC; «только дата» YYYY-MM-DD; миллисекунды — только в штрихах, Векторы совместимости модели документа packages/test-vectors/document/* (iOS/Yrs обязан читать и писать формат y-prosemirror), Блок drawing (высота в pt; штрихи — в strokes), Вставка текста в Y.XmlText без явных атрибутов наследует форматирование слева (Yjs/Yrs) — писатели всегда передают явный набор атрибутов (+14 more)

### Community 13 - "Дизайн и организация (2)"
Cohesion: 0.15
Nodes (19): Space { id, name, icon, color, order, createdAt } в account-документе, Organization Hierarchy (Account > Space > Notebook > Folder > Note), D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, D-14. Организация: богатая, но не перегруженная, Предложенная структура: пространства → вложенные папки; поперёк — вложенные и умные теги, цвета, избранное, недавние, Решение, Поперёк структуры — теги, умные теги, избранное, недавние (+11 more)

### Community 14 - "06-data-server.md"
Cohesion: 0.12
Nodes (16): Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), D-40. Хостинг — позже; сервер готов к запуску одной командой, Решение, OPEN (before stage 3): server hosting and domain, when the user buys a VPS (D-40), 6. Модель данных и сервер, Daily off-VPS backups of DB and files with verified restore (R-11), App server: Node.js + TypeScript (Fastify), Handwriting layer: vector strokes with anchors (text range, paragraph, drawing block, image) (+8 more)

### Community 15 - "0009-notebook-mode-choice.md (3)"
Cohesion: 0.15
Nodes (22): Вложения: загрузка и докачка по кускам (/attachments/:id/chunks/:index), лимит 200 МБ, Ассоциированные данные ds1|… привязывают шифротекст к месту (doc, awareness, ключи, куски вложений), Вложения шифруются кусками по 1 MiB, каждый — отдельный конверт, Конверт шифротекста: версия 0x01 + nonce 24 байта + XChaCha20-Poly1305-IETF (тег 16 байт), Иерархия ключей: пароль → passwordKey → masterKey → notebookKey → noteKey, libsodium на всех платформах (libsodium-wrappers-sumo в TS, swift-sodium в iOS), loginKey = BLAKE2b(authSeed, "ds1|login"); сервер хранит Argon2id(loginKey), masterKey — 32 случайных байта, создаётся при регистрации, шифрует account-документ (+14 more)

### Community 16 - "CHANGELOG.md"
Cohesion: 0.15
Nodes (22): pnpm + Turborepo Monorepo, 2026-10-25, 2026-10-25 (вторая половина дня), Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально (+14 more)

### Community 17 - "Правила для ИИ и документации (4)"
Cohesion: 0.18
Nodes (17): y-prosemirror@^1.3.7, vitest@^5.0.5, decodeAnchor(), encodeCharAnchor(), followRedone(), followRedoneId(), isAnchorDeleted(), rebaseRedoneAnchors() (+9 more)

### Community 18 - "@tiptap/core"
Cohesion: 0.16
Nodes (20): Collaboration, CollaborationOptions, createNoteUndoManager(), cursorBuilder(), PEN_ORIGIN, buildExtensions(), createHeadlessEditor(), guardEditorSchema() (+12 more)

### Community 19 - "iOS-стек и два языка (2)"
Cohesion: 0.14
Nodes (12): ProsemirrorMapping, AnchorBox, Glyph, segmentsBounds(), blockIdOf(), blockIds, ElementInfo, FontMetrics (+4 more)

### Community 20 - "PenLayer.ts (2)"
Cohesion: 0.13
Nodes (16): Bounds, InputPoint, pointsWithin(), RenderPoint, ActiveStroke, ANCHOR_REBASE_ORIGIN, DEFAULT_PEN_SETTINGS, Entry (+8 more)

### Community 21 - "Монорепозиторий и CLAUDE.md (2)"
Cohesion: 0.19
Nodes (3): PenLayer, prepareCanvas(), pointerSample()

### Community 22 - "0001-storage-in-database.md"
Cohesion: 0.11
Nodes (16): hint — распознанная форма (underline, strike, circle, highlight, arrow, scribble) для агентов и экспорта, D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты (+8 more)

### Community 23 - "План этапов и отложенное"
Cohesion: 0.10
Nodes (20): dependencies, katex@^0.16.0, lowlight@^3.3.0, mermaid@^12.2.0, @tiptap/core@^3.32.0, @tiptap/extension-code-block-lowlight@^3.32.0, @tiptap/extension-list@^3.32.0, @tiptap/extensions@^3.32.0 (+12 more)

### Community 24 - "strokes.md"
Cohesion: 0.19
Nodes (18): Перепривязка якорей после отмены/повтора: в той же транзакции якорь удалённого символа с redone-элементом переписывается на относительную позицию нового элемента, Координаты block / image / drawing — в долях ширины блока, Правило D-35 в отрисовке: точки удалённых символов не рисуются, штрих остаётся в документе; отмена возвращает пометку, Записываются только сглаженные coalesced-точки завершённого штриха, без predicted, Штрих почти неизменяем после рисования; ластик удаляет штрих целиком или заменяет кусками, Разрыв штриха по строкам: соседние точки на разных line fragments → отдельные сегменты, Изменяемые поля штриха после рисования: anchors (перепривязка, §4.1) и hidden (резерв), orphanedAt — локальная отметка клиента, когда все якоря штриха впервые оказались удалены (стирается, если якоря снова живы) (+10 more)

### Community 25 - "open-questions.md"
Cohesion: 0.24
Nodes (8): Automerge (fallback CRDT), Yrs (Rust Yjs) with Swift Wrapper, MongoDB (rejected), MySQL (rejected), Журнал решений (ADR), Порядок чтения для новичка: концепция → roadmap → стек → обзор → перо → решения → вопросы/риски → процесс → history, R-06 Immature Yrs Swift Wrapper, Stage 0: preparation (done) — stack approved, PostgreSQL/Yjs justified, repo and docs deployed, Graphify set up

### Community 26 - "D-41. Набор функций по мотивам Craft"
Cohesion: 0.19
Nodes (9): bindToSurface(), splitStroke(), packPoints(), POINT_BYTES, Stroke, strokeFromYMap(), StrokeTool, strokeToYMap() (+1 more)

### Community 27 - "D-30. База данных сервера — PostgreSQL"
Cohesion: 0.22
Nodes (16): addDays(), Commands, dateChipLabel(), localDate(), MONTHS, nextWeek(), requestTaskMenu(), TASK_MENU_EVENT (+8 more)

### Community 28 - "D-28. Процесс разработки: облако + Mac, сборка iOS в CI"
Cohesion: 0.15
Nodes (15): XcodeGen project.yml (D-28), GitHub Actions CI (incl. macOS iOS builds), XcodeGen, docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, Последствия: ошибки сборки видны с задержкой CI; ощущение пера проверяет только пользователь на iPad (Pencil Pro) (+7 more)

### Community 29 - "stack.md"
Cohesion: 0.18
Nodes (15): Транспорт wss://<host>/v1/sync: JSON-кадры с type, base64url, ping/pong каждые 25 с, Astro (landing page), Drizzle ORM, TypeScript on Node.js, Scaling via PostgreSQL LISTEN/NOTIFY, Radix + Tailwind + Motion Design System, Redis (rejected), Swift 6 (+7 more)

### Community 30 - "MCP + REST API"
Cohesion: 0.22
Nodes (14): Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, File Storage (disk or external S3), iOS / iPadOS Client (Swift, TextKit 2, Yrs, GRDB), Key Store (agent notebooks), MCP + REST API (+6 more)

### Community 31 - "Модель данных и глоссарий (5)"
Cohesion: 0.12
Nodes (16): Monorepo Structure (apps/, packages/, infra/), packages/test-vectors, Git, Graphify, Автоматизация, Две среды, Команды, Конец сессии (+8 more)

### Community 32 - "decisions/README.md"
Cohesion: 0.17
Nodes (15): ADR file number equals decision number (D-05 -> 0005-*.md), template 0000-template.md, Нумерация решений D-NN и файлы decisions/00NN-*.md, Документация Datascratch — единственный источник истины, history/ — архив, не источник истины; исключена из графа (.graphifyignore), Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Правило замены: решение РЕШЕНО не переписывается, ADR получает статус «ЗАМЕНЕНО решением D-NN», Оглавление docs/ (spec, contracts, architecture, decisions, roadmap, risks…), Документация Datascratch (+7 more)

### Community 33 - "D-21. Технологический стек"
Cohesion: 0.17
Nodes (14): PenTool, TOOL_DEFAULTS, HIGHLIGHT_TOKENS, INK_TOKENS, TINTS, TOKEN_FALLBACKS, BubbleToolbar(), Panel (+6 more)

### Community 34 - "12. Функции по мотивам Craft"
Cohesion: 0.12
Nodes (13): D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, 3. Apple Pencil в тексте — ключевая фича, Веб: слой пера (поток web-editor), Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером (+5 more)

### Community 35 - "Server stack"
Cohesion: 0.17
Nodes (14): Canvas + Pointer Events, Dexie (IndexedDB), Drizzle ORM, Fastify, MCP TypeScript SDK, OAuth 2.1, pg-boss job queue, Radix + Tailwind + Motion (+6 more)

### Community 36 - "package.json"
Cohesion: 0.14
Nodes (15): devDependencies, turbo@^2.3.0, typescript@^5.6.0, engines, node, typescript, name, packageManager (+7 more)

### Community 37 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+7 more)

### Community 38 - "Скрипт обновления графа"
Cohesion: 0.28
Nodes (7): Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 39 - "0034-auth-email-password.md"
Cohesion: 0.17
Nodes (14): Восстановление: recoveryLoginKey → wrappedMasterKeyRecovery → новый пароль; данные не перешифровываются, Ключ восстановления: 32 байта, Crockford Base32 с префиксом DS1-, показывается один раз, Notesnook, D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления, Вход по email + паролю; один пароль и для входа, и для шифрования (как в Notesnook), Passkeys — сложно совместить со сквозным шифрованием сейчас; возможно позже, Ключ восстановления, выдаваемый при регистрации, Sign in with Apple — отклонён: всё равно нужен отдельный пароль шифрования (+6 more)

### Community 40 - "0002-no-desktop-app.md"
Cohesion: 0.22
Nodes (7): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, Full-featured web client (TypeScript), iPad client (primary, Apple Pencil / Pencil Pro squeeze and roll, hover, Stage Manager, keyboard shortcuts), iPhone and iPad share one codebase (universal app), Web client as full desktop replacement (Pointer Events with pressure, offline, PWA, mobile-browser editing for guests)

### Community 41 - "D-30. База данных сервера — PostgreSQL (2)"
Cohesion: 0.19
Nodes (10): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, Контекст, Решение (на сейчас) (+2 more)

### Community 42 - "design-tokens.md"
Cohesion: 0.20
Nodes (9): Проекты, личное, работа, учёба не смешиваются; минимум кнопок на экране, D-15. Дизайн — основная концепция продукта, Последствия, Решение, Light/dark theme, Dynamic Type, VoiceOver, full iPad keyboard support, Own design system (typography, grid, colors, icons, animation, haptics) unified on iOS and web, Design tokens (colors, spacing, typography, animation durations) as single source for both platforms, Accessibility: Dynamic Type, VoiceOver, light/dark, iPad keyboard (+1 more)

### Community 43 - "iOS-стек и два языка (2) (2)"
Cohesion: 0.15
Nodes (11): Custom pen renderer (Metal vs Core Animation TBD), GRDB (SQLite), iOS client stack, Node.js + TypeScript server, Swift 6, SwiftUI (shell), TypeScript, UIKit + TextKit 2 (editor) (+3 more)

### Community 44 - "12. Функции по мотивам Craft (2)"
Cohesion: 0.25
Nodes (12): Calendar screen: day feed with tasks and daily note (MVP); system calendar integration after MVP, Card document: nested document shown as a card with cover (MVP), Collections: records with properties and table / gallery / kanban views with filter, sort, grouping (after MVP), Daily note: one per day, created on demand, from template (MVP), Document cover image with offset (MVP), Document style: font (serif/sans/mono), width, paper (smooth/dots/grid/ruled), backdrop color or gradient, text color; style gallery after MVP, Tabs: several open documents on iPad and web (MVP), Inbox: standalone tasks outside documents in a service note of the notebook (MVP) (+4 more)

### Community 45 - "0004-encryption-and-api.md"
Cohesion: 0.27
Nodes (7): PATCH /notebooks/:id/mode — включение режима «для агентов» передаёт notebookKey, выключение удаляет серверную обёртку, Режим «для агентов»: клиент передаёт notebookKey по TLS, сервер оборачивает его serverKey; расшифровка только при запросе агента с токеном, serverKey — 32 байта из DS_KMS_KEY (окружение сервера, не в базе), End-to-end encryption vs agent API access conflict, Local MCP bridge (future), R-10 Agent Notebooks Readable if Server Breached, Local MCP bridge (future): utility on user computer holding the key so local agents can reach private notebooks

### Community 46 - "design-tokens.md (2)"
Cohesion: 0.29
Nodes (12): Подложки backdrop.* (sand, dusk, mist, meadow, ember) — мягкие градиенты в духе Craft, Цветовые токены: bg.canvas («бумага»), text.primary («чернила»), accent («синие чернила»), danger/success/warning — светлая и тёмная тема, Ширина колонки документа: normal 720, wide 960, full, Тактильная отдача iOS: selection, success (задача выполнена), warning (удаление), Чернила пера ink.* (black, blue, red, green, purple, brown) и маркеры highlight.*, Движение: пружины motion.snappy / smooth / gentle, длительности duration.* для веба, Сетка отступов 4 pt, радиусы radius.*, тени shadow.card / shadow.popover, Цвета tint.* (.fg / .bg) для папок, тегов и выносок (+4 more)

### Community 47 - "design-tokens.md (3)"
Cohesion: 0.15
Nodes (11): Ежедневные заметки и «Входящие» (kind daily / inbox) в блокноте settings.dailyNotebookId, Производные данные строятся локально: индекс задач, полнотекстовый поиск, бэклинки, теги, Inline-узлы noteLink ([[ ]]) и tag (без #, вложенность через /), taskItem: taskId, state open / done / cancelled, scheduled, deadline, completedAt, D-41. Набор функций по мотивам Craft, Контекст, Решение, OPEN (before stage 2): Craft features MVP / post-MVP split (D-41, proposed) (+3 more)

### Community 48 - "08-sharing.md"
Cohesion: 0.18
Nodes (12): Контракт меняет только сессия-координатор; исполнитель присылает предложение, Обводки и стрелки «растягиваются» вместе с текстом; при проблемах — изменение контракта через координатора, D-35. Пометка на удалённом тексте исчезает вместе с ним, Окончательная очистка таких штрихов — при уплотнении истории, Вариант «потерянные пометки» — отклонён: лишний интерфейс, Частичное удаление: штрих «сжимается» до оставшегося текста, Вариант «прилипать к соседнему символу» — отклонён: пометка может оказаться не на том слове, Рукописная пометка исчезает вместе с удалённым текстом (пользователем, агентом, другим устройством) (+4 more)

### Community 49 - "stack.md (2)"
Cohesion: 0.19
Nodes (11): Web PWA Client (React, TipTap, Yjs, IndexedDB), Dexie (IndexedDB), GRDB (SQLite), TipTap (ProseMirror), Vite + React + TypeScript PWA, Yjs, ADR (Architecture Decision Record), CRDT (+3 more)

### Community 50 - "0024-product-name.md"
Cohesion: 0.18
Nodes (11): Решения по анкетам пользователя: D-32…D-41 и PDF после MVP (D-08), D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст, Решение, Bundle ID com.datascratch.app, D-33. Bundle ID — com.datascratch.app (+3 more)

### Community 51 - "План разработки"
Cohesion: 0.15
Nodes (13): Критерии приёмки, План разработки, Подготовка, Потоки разработки (D-39), Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad) (+5 more)

### Community 52 - "web-editor/package.json"
Cohesion: 0.15
Nodes (12): @tiptap/extension-horizontal-rule@^3.32.0, @tiptap/extension-table@^3.32.0, exports, ./styles.css, main, name, private, type (+4 more)

### Community 53 - "PostgreSQL"
Cohesion: 0.24
Nodes (11): Журнал действий агента GET /agent-tokens/:id/audit, agent_tokens / agent_audit_log Tables, Server PostgreSQL Schema (Stage 3 Draft), Handwriting-to-PNG Render (pg-boss queue), docker compose Self-Hosting (server + PostgreSQL), pg-boss Job Queue, PostgreSQL, Row-Level Security (RLS) (+3 more)

### Community 54 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.17
Nodes (12): devDependencies, happy-dom@^21.0.4, react@^19.0.0, @types/katex@^0.16.8, @types/react@^19.0.0, @types/react-dom@^19.0.0, typescript@^5.6.0, typescript (+4 more)

### Community 55 - "D-21. Технологический стек (2)"
Cohesion: 0.18
Nodes (9): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, docs/history session log (+1 more)

### Community 56 - "Контракт: модель документа (v1) (2)"
Cohesion: 0.18
Nodes (11): 1. Три вида документов Yjs, 2. Документ `account`, 3. Документ `notebook` (индекс блокнота), 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note` (+3 more)

### Community 57 - "0005-living-stroke.md (2)"
Cohesion: 0.25
Nodes (7): Координаты text-штриха: смещение от начала глифа якорного символа в em, Привязка к тексту: каждая точка → ближайший символ строки (живой штрих), PencilKit (rejected), Living Stroke, Reflow, OPEN (stage 1): living stroke details — circles around several words, arrows between words on different lines; decide on prototype, MVP blocks: headings, lists, quote, callout, divider, links, [[ ]], tags, table, code with highlighting, LaTeX formula, Mermaid, drawing, image, file

### Community 58 - "Платформы и клиенты (2)"
Cohesion: 0.18
Nodes (9): D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, 1. Концепция продукта, Notesnook (reference product: E2E encryption, reliable sync), Obsidian (reference product: links, backlinks, tags, Markdown export), Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения (+1 more)

### Community 59 - "open-questions.md (2)"
Cohesion: 0.29
Nodes (9): End-to-end encryption, Pen prototype (stage 1), Automerge (fallback CRDT), Last-write-wins (unsuitable), Loro (too early), Operational Transformation (unsuitable), Yjs RelativePosition as stroke-point anchor, Yjs (+1 more)

### Community 60 - "Контракт: дизайн-токены «Тихая бумага» (v1) (2)"
Cohesion: 0.18
Nodes (4): @playwright/experimental-ct-react@1.62.1, @playwright/test@1.62.1, @playwright/experimental-ct-react, @playwright/test

### Community 61 - "D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS) (2)"
Cohesion: 0.25
Nodes (9): Line, P, pathLength(), recognizeHint(), totalTurning(), xReversals(), StrokeHint, glyphs (+1 more)

### Community 62 - "tasks (2)"
Cohesion: 0.18
Nodes (10): dependsOn, outputs, $schema, tasks, build, lint, test, typecheck (+2 more)

### Community 63 - "Datascratch — правила для ИИ"
Cohesion: 0.20
Nodes (9): Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой, Правила, Среда разработки, Stream sessions write changelog fragments in docs/changelog.d/ instead of editing CHANGELOG.md; stream history files docs/history/YYYY-MM-DD-<stream>-NN.md (+1 more)

### Community 64 - "Правила для ИИ и документации (2) (2)"
Cohesion: 0.31
Nodes (5): Скрипт tools/graphify_docs.py (prepare → агенты → finish), Graph update after doc edits: graphify_docs.py prepare -> parallel extraction agents -> finish -> graphify export html -> check-update, Extraction prompt .claude/skills/graphify/references/extraction-spec.md, Git: English code/commits, Russian docs, branches + PR, one commit = code + docs + updated graph, Как вносить изменения — spec/architecture, ADR, CHANGELOG, roadmap, граф — в одном коммите

### Community 65 - "Контракт: шифрование (v1)"
Cohesion: 0.20
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 66 - "Модель данных и глоссарий (2) (2)"
Cohesion: 0.22
Nodes (9): Тестовые векторы crypto: KDF, конверты, Base32 ключа восстановления, куски вложений (Swift и TS), Контракт — точное описание формата/протокола, который реализуют несколько частей (iOS на Swift, веб и сервер на TS), Совместимость доказывается общими тестовыми векторами (packages/test-vectors), Типы TypeScript контрактов в packages/shared/src/contracts/ — часть контракта, Контракты между частями системы, Правила изменения, Тестовые векторы strokes: упаковка точек, разрешение якорей после правок, правило D-35, Тестовые векторы sync: примеры всех сообщений в JSON (схема проверяется в TS и Swift) (+1 more)

### Community 67 - "Контракт: рукописные штрихи (v1)"
Cohesion: 0.20
Nodes (10): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4.1. Перепривязка якорей (отмена и восстановление версии), 4.2. Когда штрих считается «осиротевшим» и удаляется навсегда, 4. Привязка к тексту (живой штрих), 5. Отрисовка толщины, 6. Тестовые векторы (+2 more)

### Community 68 - "Модель данных и глоссарий (2)"
Cohesion: 0.36
Nodes (7): Поля штриха: v, tool, color, width, opacity, anchorKind, blockId, anchors, points, hint, author, createdAt, Anchor (textRange / paragraph / drawingBlock / image), Note, Stroke, StrokePoint, RelativePosition (CRDT), R-03 Data Format Cannot Change Cheaply

### Community 69 - "glossary.md"
Cohesion: 0.22
Nodes (9): doc_updates Table (encrypted Yjs updates), libsodium (swift-sodium), VPS Hosting (Hetzner or similar), End-to-End Encryption (E2E), Private Notebook, Update (Yjs binary edit record), Recovery Key for Forgotten Password, R-11 Single VPS Is a Single Point of Failure (+1 more)

### Community 70 - "0032-min-ios-version.md"
Cohesion: 0.27
Nodes (9): D-32. Минимальная версия iOS/iPadOS — 26, Минимальная версия iOS/iPadOS 26 (IPHONEOS_DEPLOYMENT_TARGET = 26.0), Liquid Glass — системный дизайн iOS 26, Отклонённые варианты: iOS 18+ (шире охват) и 17.5+ (минимум для Pencil Pro), Последствия, Рассмотренные варианты, Решение, CLOSED: minimum iOS 26+ (D-32); XcodeGen accepted (D-39); Bundle ID (D-33); paid Apple Developer account exists (+1 more)

### Community 71 - "blockId.ts"
Cohesion: 0.36
Nodes (7): BlockId, blockIdPluginKey, findIdFixes(), hasAttr(), stripIds(), UNIQUE_ATTRS, uuidv7()

### Community 72 - "compilerOptions (2)"
Cohesion: 0.22
Nodes (8): compilerOptions, jsx, lib, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 73 - "sync-protocol.md (2)"
Cohesion: 0.32
Nodes (6): Метка agentEdit (agentId, at) — подсветка правок агента до принятия пользователем, D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение

### Community 74 - "Технологический стек — РЕШЕНО (2026-10-25) (2)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 75 - "open-questions.md (2)"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 76 - "12. Функции по мотивам Craft (3)"
Cohesion: 0.25
Nodes (8): 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft, Связь с моделью данных

### Community 77 - "NoteMeta: folderId, parentNoteId, title, kind, dailyDate, tags, wrappedKey, trashedAt, order"
Cohesion: 0.33
Nodes (7): NoteMeta: folderId, parentNoteId, title, kind, dailyDate, tags, wrappedKey, trashedAt, order, pageCard — вложенная заметка-карточка (noteId, card | link), Design references: Things 3, Linear, Craft, Arc, Ориентир Craft: градиентные подложки, документы-карточки с обложками, боковая панель «Вкладки / Избранное / Папки / Теги», стеклянные панели, контекстные меню, Feel references: Things 3, Linear, Craft, Arc, Metadata: title, tags, links, dates, space, folder, Trash for 30 days

### Community 78 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 79 - "0016-no-import-now.md"
Cohesion: 0.43
Nodes (6): MinIO (rejected), Server disk folder storage (default), External S3-compatible storage (Hetzner, R2, B2), File storage interface (two implementations, chosen by config), Garage / SeaweedFS, MinIO (rejected)

### Community 80 - "design-tokens.md (4)"
Cohesion: 0.33
Nodes (6): D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Вариант «графит по умолчанию» — отклонён: чернила на тёмном читаются хуже, Вариант «чистый нейтральный» (Linear / Things) — не выбран, Тёмная тема — тёплый графит, Рассмотренные варианты, Решение

### Community 81 - "0009-notebook-mode-choice.md (5)"
Cohesion: 0.29
Nodes (7): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Вход и восстановление доступа (D-34), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 82 - "risks.md"
Cohesion: 0.40
Nodes (5): Canvas + Pointer Events Pen Layer, R-07 Web Pen Worse than Native, R-09 Graphify Is a Young Third-Party Tool, Риски, Web without cuts: full feature parity with iOS (pen quality may be lower, R-07)

### Community 83 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, test, test:ct, typecheck

### Community 84 - "design-tokens.md (5)"
Cohesion: 0.40
Nodes (5): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 85 - "Модель данных — ЧЕРНОВИК"
Cohesion: 0.40
Nodes (5): Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3), Штрих (черновик для прототипа)

### Community 86 - "0005-living-stroke.md (3)"
Cohesion: 0.40
Nodes (5): D-05. Перо при перекладке текста — вариант А «живой штрих», Гипотеза реализации, Контекст, Последствия, Решение

### Community 87 - "02-platforms.md"
Cohesion: 0.40
Nodes (4): D-06. Рисование пальцем на iPhone — да, опционально, Finger drawing toggle on iPhone, Решение, iPhone client (primary, quick notes, one-handed, finger drawing option D-06)

### Community 88 - "02-platforms.md (2)"
Cohesion: 0.50
Nodes (4): D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, UI languages Russian and English, no RTL (D-17)

### Community 89 - "D-22. Без собственного общего ядра на Rust"
Cohesion: 0.40
Nodes (5): D-22. Без собственного общего ядра на Rust, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 90 - "Компоненты стека (2) (2)"
Cohesion: 0.40
Nodes (5): D-25. Redis не используем, Будущее, Контекст, Последствия, Решение

### Community 91 - "0016-no-import-now.md (2)"
Cohesion: 0.40
Nodes (5): D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 92 - "0030-server-database-postgresql.md"
Cohesion: 0.40
Nodes (5): D-30. База данных сервера — PostgreSQL, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 93 - "0030-server-database-postgresql.md (2)"
Cohesion: 0.40
Nodes (5): D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS), Контекст, Последствия, Рассмотренные варианты, Решение

### Community 94 - "2. Платформы"
Cohesion: 0.40
Nodes (5): 2. Платформы, Минимальная версия iOS/iPadOS — 26 (D-32), Минимальная версия iOS/iPadOS — ОТКРЫТО, Тестовые устройства (известно на 2026-10-25), Требования

### Community 95 - "design-tokens.md (6)"
Cohesion: 0.40
Nodes (5): 5. Организация заметок и дизайн, Дизайн (D-15 — РЕШЕНО, главный принцип продукта), Организация (D-14 — РЕШЕНО по сути; структура ниже — ПРЕДЛОЖЕНО), Принципы, Реализация

### Community 96 - "11. Нефункциональные требования"
Cohesion: 0.40
Nodes (5): 11. Нефункциональные требования, Доступность, Надёжность, Ресурсы сервера, Языки

### Community 97 - "Технологический стек — РЕШЕНО (2026-10-25) (3)"
Cohesion: 0.40
Nodes (4): vite@^8.3.5, @vitejs/plugin-react@^6.1.2, vite, @vitejs/plugin-react

### Community 98 - "Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1)"
Cohesion: 0.40
Nodes (4): Datascratch, For non-Russian readers, Где что лежит, Текущий статус

### Community 99 - "0003-platforms.md"
Cohesion: 0.50
Nodes (4): D-03. Платформы: нативные iPhone и iPad + полноценный веб, Контекст, Последствия, Решение

### Community 100 - "0004-encryption-and-api.md (2)"
Cohesion: 0.50
Nodes (4): D-04. Одновременно сквозное шифрование и доступ по API, Контекст, Последствия, Решение

### Community 101 - "roadmap.md"
Cohesion: 0.50
Nodes (4): D-23. Документация — источник истины; Graphify — граф знаний поверх неё, Контекст, Последствия, Решение

### Community 102 - "CHANGELOG.md (2)"
Cohesion: 0.50
Nodes (4): D-27. В прототипе пера текст хранится в Yrs, Контекст, Последствия, Решение

### Community 103 - "D-28. Процесс разработки: облако + Mac, сборка iOS в CI (2)"
Cohesion: 0.50
Nodes (4): D-28. Процесс разработки: облако + Mac, сборка iOS в CI, Контекст, Последствия, Решение

### Community 104 - "roadmap.md (2)"
Cohesion: 0.67
Nodes (3): D-19. Весь код пишет Claude, Последствия, Решение

### Community 105 - "Дизайн и организация (2) (2)"
Cohesion: 0.67
Nodes (3): D-36. Структура: пространство → блокноты → папки, Рассмотренные варианты, Решение

## Knowledge Gaps
- **66 isolated node(s):** `../../tsconfig.base.json`, `Current status: stack approved, next is stage 1 pencil prototype`, `subscribe / unsubscribe — подписка на документы с since`, `welcome — аутентификация успешна (userId | null, serverTime, protocol: 1)`, `Suggestions for approval (rejected)` (+61 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 496 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Контракт: рукописные штрихи (v1)` connect `Контракт: рукописные штрихи (v1)` to `strokes.md`?**
  _High betweenness centrality (0.391) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `Stage 1: pen-in-text prototype on iPad (TextKit 2 + Yrs + pen layer, living stroke)` (e.g. with `Predicted / Coalesced Touches` and `Living Stroke`) actually correct?**
  _`Stage 1: pen-in-text prototype on iPad (TextKit 2 + Yrs + pen layer, living stroke)` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `../../tsconfig.base.json`, `Current status: stack approved, next is stage 1 pencil prototype`, `subscribe / unsubscribe — подписка на документы с since` to the rest of the system?**
  _66 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Монорепозиторий и CLAUDE.md` be split into smaller, more focused modules?**
  _Cohesion score 0.0505175983436853 - nodes in this community are weakly interconnected._
- **Why does `t()` connect `Контракт: рукописные штрихи (v1)` to `Контракт: модель документа (v1) (2)`?**
  _High betweenness centrality (0.388) - this node is a cross-community bridge._
- **Should `api.md` be split into smaller, more focused modules?**
  _Cohesion score 0.0519774011299435 - nodes in this community are weakly interconnected._
- **Should `sync-protocol.md` be split into smaller, more focused modules?**
  _Cohesion score 0.061495457721872815 - nodes in this community are weakly interconnected._