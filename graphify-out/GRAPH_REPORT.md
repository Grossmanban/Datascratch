# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 142 files · ~51,060 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 4, .xcconfig 3, .example 1)

## Summary
- 1335 nodes · 2603 edges · 101 communities (95 shown, 6 thin omitted)
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 452 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `518dcb6a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- 0039-parallel-sessions.md
- Контракт: протокол синхронизации (v1)
- LibraryStore
- .updateNote
- 0011-handwriting-for-agents.md
- План разработки
- .mutate
- stack.md
- steps
- D-29. Graphify: порядок работы, чтобы граф был всегда актуален
- R-10 Agent Notebooks Readable if Server Breached
- Palette
- 2026-10-25
- 06-data-server.md
- Правила для ИИ и документации (2) (2)
- document-model.md
- 2026-10-25-coordinator-contract-clarifications.md
- D-28. Процесс разработки: облако + Mac, сборка iOS в CI
- 04-editor.md
- Модель данных и глоссарий (2)
- 0009-notebook-mode-choice.md (2)
- api.md
- 0001-storage-in-database.md
- BlockRow
- package.json
- compilerOptions
- Скрипт обновления графа
- Organization Hierarchy (Account > Space > Notebook > Folder > Note)
- crypto.md
- Контракт: дизайн-токены «Тихая бумага» (v1)
- glossary.md
- 12. Функции по мотивам Craft
- Yrs (Rust Yjs) with Swift Wrapper
- 05-organization-design.md
- План этапов и отложенное
- Модель данных и глоссарий (2) (2)
- Server stack
- open-questions.md (2)
- Контракт: модель документа (v1) (2)
- Модель данных и глоссарий (5)
- 02-platforms.md
- tasks
- Контракт: шифрование (v1)
- LibraryUITests
- D-04. Одновременно сквозное шифрование и доступ по API
- 0003-platforms.md
- Монорепозиторий и CLAUDE.md (2)
- Datascratch — правила для ИИ (CLAUDE.md)
- D-30. База данных сервера — PostgreSQL
- D-41. Набор функций по мотивам Craft
- Технологический стек — РЕШЕНО (2026-10-25)
- iOS-стек и два языка (2)
- Правила для ИИ и документации (4)
- 12. Функции по мотивам Craft (2)
- Обзор архитектуры: разделы
- 0038-design-quiet-paper.md
- libsodium on all platforms (swift-sodium on iOS, libsodium-wrappers in TS)
- strokes.md
- iOS-стек и два языка (2) (2)
- Процесс разработки и Graphify (2)
- Платформы и клиенты (2)
- 0009-notebook-mode-choice.md (5)
- Контракт: дизайн-токены «Тихая бумага» (v1) (2)
- 0005-living-stroke.md
- D-21. Технологический стек
- D-21. Технологический стек (2)
- D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS)
- 04-editor.md (4)
- Дизайн и организация (2) (2)
- 0035-strokes-on-deleted-text.md
- open-questions.md (3)
- D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS) (2)
- Контракт: рукописные штрихи (v1)
- 0024-product-name.md
- 0031-crdt-yjs.md
- 03-pencil.md
- pnpm-workspace.yaml
- Theme
- TaskComponents.swift
- TaskDateChips
- Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1)
- NoteMeta: folderId, parentNoteId, title, kind, dailyDate, tags, wrappedKey, trashedAt, order
- D-01. Хранение заметок — в базе данных на своём сервере, не в файлах
- D-05. Перо при перекладке текста — вариант А «живой штрих»
- D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO
- 0032-min-ios-version.md
- Theme.swift
- PostgreSQL
- Производные данные строятся локально: индекс задач, полнотекстовый поиск, бэклинки, теги
- 0002-no-desktop-app.md
- Модель данных — ЧЕРНОВИК
- .init
- Haptics
- D-03. Платформы: нативные iPhone и iPad + полноценный веб
- Notesnook
- 0013-collaboration-sharing.md
- D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления
- 2. Платформы
- TaskDateSheet
- D-09. Режим блокнота выбирается при создании, сменить можно позже

## God Nodes (most connected - your core abstractions)
1. `LibraryStore` - 73 edges
2. `LibrarySnapshot` - 42 edges
3. `BlockRow` - 16 edges
4. `compilerOptions` - 15 edges
5. `Palette` - 14 edges
6. `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` - 14 edges
7. `StandInBlockEditor` - 13 edges
8. `AppModel` - 13 edges
9. `Yrs (Rust Yjs) with Swift Wrapper` - 13 edges
10. `packages/design-tokens/tokens.json — источник значений; генерирует CSS-переменные и Swift` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Web editor: TipTap + Yjs per document-model contract, all blocks, Canvas pen layer per strokes contract` --semantically_similar_to--> `Web editor: TipTap (ProseMirror) + Yjs`  [INFERRED] [semantically similar]
  packages/web-editor/README.md → docs/spec/04-editor.md
- `Определение «готово» для любого изменения` --semantically_similar_to--> `Как вносить изменения — spec/architecture, ADR, CHANGELOG, roadmap, граф — в одном коммите`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/README.md
- `Graph update after doc edits: graphify_docs.py prepare -> parallel extraction agents -> finish -> graphify export html -> check-update` --references--> `finish()`  [EXTRACTED]
  docs/development.md → tools/graphify_docs.py
- `finish refuses to write graph if nodes of unchanged files disappear` --references--> `finish()`  [EXTRACTED]
  docs/development.md → tools/graphify_docs.py
- `Graph update after doc edits: graphify_docs.py prepare -> parallel extraction agents -> finish -> graphify export html -> check-update` --references--> `prepare()`  [EXTRACTED]
  docs/development.md → tools/graphify_docs.py

## Import Cycles
- None detected.

## Communities (101 total, 6 thin omitted)

### Community 0 - "0039-parallel-sessions.md"
Cohesion: 0.05
Nodes (47): apps/ios — iPhone + iPad, XcodeGen project.yml (D-28), apps/server — сервер, rebaseRedoneAnchors(doc) — хелпер TS перепривязки якорей (на iOS — эквивалент в DSCore), pnpm + Turborepo Monorepo, XcodeGen, Каркас монорепозитория (pnpm + Turborepo), девять потоков разработки, правила сессий-исполнителей, changelog.d, Создан CLAUDE.md и скелет монорепозитория (apps/, packages/, infra/) (+39 more)

### Community 1 - "Контракт: протокол синхронизации (v1)"
Cohesion: 0.06
Nodes (50): Формат ошибок { error: { code, message } } и коды bad_request…internal, История версий: GET /docs/:id/versions и /versions/:seq (зашифрованные снимки), Метка agentEdit (agentId, at) — подсветка правок агента до принятия пользователем, 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05) (+42 more)

### Community 2 - "LibraryStore"
Cohesion: 0.06
Nodes (20): AppModel, .pendingRecoveryKey, .phase, LaunchOptions, Phase, onboarding, ready, LibraryPersistence (+12 more)

### Community 3 - ".updateNote"
Cohesion: 0.11
Nodes (18): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, Контекст, Решение (на сейчас) (+10 more)

### Community 4 - "0011-handwriting-for-agents.md"
Cohesion: 0.09
Nodes (27): AgentToken { id, name, notebookIds, permission, expiresAt, createdAt, lastUsedAt } — без секрета, Токены агентов /agent-tokens: блокноты, read / read_write, срок; токен показывается один раз, Контракт agents-api.md (MCP и REST для самих агентов) — появится на этапе агентов, blockId (UUIDv7) у каждого блочного узла — для точечных правок агентов, заметок на полях и комментариев, D-11. Рукопись для агента — рендер в картинку (PNG), Решение, OPEN (before stage 5): handwriting format for agents — PNG (D-11, proposed), OPEN (before stage 5): MCP toolset (proposed in spec/09-agents-api.md) (+19 more)

### Community 5 - "План разработки"
Cohesion: 0.24
Nodes (13): Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, File Storage (disk or external S3), Handwriting-to-PNG Render (pg-boss queue), Key Store (agent notebooks), MCP + REST API (+5 more)

### Community 6 - ".mutate"
Cohesion: 0.13
Nodes (14): Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, D-19. Весь код пишет Claude, Последствия, Решение, D-23. Документация — источник истины; Graphify — граф знаний поверх неё, Контекст, Последствия, Решение (+6 more)

### Community 7 - "stack.md"
Cohesion: 0.22
Nodes (13): Транспорт wss://<host>/v1/sync: JSON-кадры с type, base64url, ping/pong каждые 25 с, Guest via Link (web, no account), iOS / iPadOS Client (Swift, TextKit 2, Yrs, GRDB), Sync / Realtime Service, Astro (landing page), Dexie (IndexedDB), Drizzle ORM, GRDB (SQLite) (+5 more)

### Community 8 - "steps"
Cohesion: 0.06
Nodes (34): defaults, name, runs-on, steps, strategy, timeout-minutes, concurrency, cancel-in-progress (+26 more)

### Community 9 - "D-29. Graphify: порядок работы, чтобы граф был всегда актуален"
Cohesion: 0.14
Nodes (13): Стартовый хук Claude Code (.claude/hooks/session-start.sh), D-23 (документация), D-29. Graphify: порядок работы, чтобы граф был всегда актуален, git-хук Graphify (пересборка только по изменённому коду), Скрипт tools/graphify_docs.py (prepare → агенты → finish), Graphify 0.9.95 (пакет graphifyy), R-09 (риск: Graphify сломается или исчезнет), Смысловой слой графа (понятия, решения, связи — проход ИИ) (+5 more)

### Community 10 - "R-10 Agent Notebooks Readable if Server Breached"
Cohesion: 0.27
Nodes (9): Иерархия ключей: пароль → passwordKey → masterKey → notebookKey → noteKey, masterKey — 32 случайных байта, создаётся при регистрации, шифрует account-документ, noteKey — ключ заметки: шифрует note-документ и вложения, notebookKey — случайный ключ блокнота, шифрует notebook-документ, serverKey — 32 байта из DS_KMS_KEY (окружение сервера, не в базе), Ссылка шеринга /s/<shareId>#k=<ключ> — ключ в части после #, не уходит на сервер, Документ account: spaces, notebooks, settings, starred, tabs (ключ — masterKey), R-10 Agent Notebooks Readable if Server Breached (+1 more)

### Community 11 - "Palette"
Cohesion: 0.15
Nodes (13): Palette, .accent, .canvas, .danger, .elevated, .separator, .sidebar, .success (+5 more)

### Community 12 - "2026-10-25"
Cohesion: 0.14
Nodes (14): 2026-10-25, 2026-10-25 (вторая половина дня), Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, Формат журнала: новые записи сверху, дата — что изменилось (ссылки на решения) (+6 more)

### Community 13 - "06-data-server.md"
Cohesion: 0.14
Nodes (15): MinIO (rejected), D-25. Redis не используем, Edit broadcast interface (in-memory), PostgreSQL LISTEN/NOTIFY, Redis (rejected), Valkey (free Redis alternative), Будущее, Контекст (+7 more)

### Community 14 - "Правила для ИИ и документации (2) (2)"
Cohesion: 0.20
Nodes (11): Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, Stream sessions write changelog fragments in docs/changelog.d/ instead of editing CHANGELOG.md; stream history files docs/history/YYYY-MM-DD-<stream>-NN.md, Graph update after doc edits: graphify_docs.py prepare -> parallel extraction agents -> finish -> graphify export html -> check-update, Extraction prompt .claude/skills/graphify/references/extraction-spec.md, Git: English code/commits, Russian docs, branches + PR, one commit = code + docs + updated graph, Graphify commands (query, explain, path, update, check-update, /graphify --update), graphifyy PyPI package (command graphify), verified on 0.9.95, Graphify install on Mac (brew install uv, uv tool install graphifyy) (+3 more)

### Community 15 - "document-model.md"
Cohesion: 0.28
Nodes (12): y-prosemirror не записывает атрибуты узлов со значением null: отсутствующий атрибут = null (значение по умолчанию схемы), Comment { blockId, anchor (относительные позиции), author user | guest | agent, text, resolvedAt }, Даты ISO 8601 в UTC; «только дата» YYYY-MM-DD; миллисекунды — только в штрихах, Векторы совместимости модели документа packages/test-vectors/document/* (iOS/Yrs обязан читать и писать формат y-prosemirror), Блок drawing (высота в pt; штрихи — в strokes), Вставка текста в Y.XmlText без явных атрибутов наследует форматирование слева (Yjs/Yrs) — писатели всегда передают явный набор атрибутов, Значение метки — объект атрибутов ({ bold: {} }, { link: { href, … } }); читатели принимают {} и true и ключи <имя>--<хэш>, Документ note: content (Y.XmlFragment), meta, strokes, comments (ключ заметки) (+4 more)

### Community 16 - "2026-10-25-coordinator-contract-clarifications.md"
Cohesion: 0.15
Nodes (11): VPS Hosting (Hetzner or similar), Canvas + Pointer Events Pen Layer, Платный аккаунт Apple Developer; Team ID задаётся на Mac при первой подписи, в репозитории не хранится, Universal Links, R-07 Web Pen Worse than Native, R-08 Huge Project Scope, R-09 Graphify Is a Young Third-Party Tool, R-11 Single VPS Is a Single Point of Failure (+3 more)

### Community 17 - "D-28. Процесс разработки: облако + Mac, сборка iOS в CI"
Cohesion: 0.22
Nodes (10): GitHub Actions CI (incl. macOS iOS builds), Последствия: ошибки сборки видны с задержкой CI; ощущение пера проверяет только пользователь на iPad (Pencil Pro), D-28. Процесс разработки: облако + Mac, сборка iOS в CI, GitHub Actions собирает iOS-проект и гоняет тесты на macOS-раннере на каждый push, Контекст, Последствия, Решение, OPEN (stage 1): living stroke details — circles around several words, arrows between words on different lines; decide on prototype (+2 more)

### Community 18 - "04-editor.md"
Cohesion: 0.32
Nodes (5): Схема блоков: doc = title block+ (paragraph, heading, списки, taskList, callout, codeBlock, mathBlock, mermaid, table, image, file, drawing, pageCard), Editor content (headings, lists, tables, code, formulas, attachments, drawing blocks), Link graph view (not in MVP, stage 6), No import for now (D-16), Web editor: TipTap (ProseMirror) + Yjs

### Community 19 - "Модель данных и глоссарий (2)"
Cohesion: 0.20
Nodes (11): meta.formatVersion = 1; документ новее клиента открывается только для чтения (R-03), Версионирование контрактов v1, v2…; ломающее изменение — новая версия с явной миграцией, Поля штриха: v, tool, color, width, opacity, anchorKind, blockId, anchors, points, hint, author, createdAt, Anchor (textRange / paragraph / drawingBlock / image), Note, Stroke, StrokePoint, RelativePosition (CRDT) (+3 more)

### Community 20 - "0009-notebook-mode-choice.md (2)"
Cohesion: 0.22
Nodes (10): PATCH /notebooks/:id/mode — включение режима «для агентов» передаёт notebookKey, выключение удаляет серверную обёртку, Режим «для агентов»: клиент передаёт notebookKey по TLS, сервер оборачивает его serverKey; расшифровка только при запросе агента с токеном, NotebookRef { id, spaceId, name, mode: private | agent, … } — ключ блокнота здесь не хранится, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), Блокнот — единица режима шифрования (приватный / для агентов) и шеринга, Notesnook (reference product: E2E encryption, reliable sync), Local MCP bridge (future): utility on user computer holding the key so local agents can reach private notebooks (+2 more)

### Community 21 - "api.md"
Cohesion: 0.05
Nodes (48): Аккаунт и устройства: /me, /devices (отзыв сессий), удаление аккаунта, Эндпоинты /auth: prelogin, signup, login, refresh, logout, recovery, password, Аутентификация Bearer: accessToken 15 мин + refreshToken 30 дней с ротацией, Идентификаторы создаёт клиент (UUIDv7); повторный POST идемпотентен, иначе 409 conflict, Device { id, name, createdAt, lastSeenAt, current } — устройство (сессия) аккаунта, POST /docs — регистрация документа (account / notebook / note) до первого push, POST /shares/:id/guest — гостевой токен (без авторизации) для hello в синхронизации, GET /health → { ok: true, version } — служебная проверка сервера (+40 more)

### Community 22 - "0001-storage-in-database.md"
Cohesion: 0.21
Nodes (8): hint — распознанная форма (underline, strike, circle, highlight, arrow, scribble) для агентов и экспорта, Markdown files option (rejected), Obsidian, Own server storage, Real-time collaborative editing, PostgreSQL, Real-time co-editing with cursors and presence (guests shown as Guest), Real time when a note is open on two devices (WebSocket, in-process broadcast)

### Community 23 - "BlockRow"
Cohesion: 0.13
Nodes (16): BlockRow, .body, .bodyFont, .font, .leading, .menu, .placeholder, .textColor (+8 more)

### Community 24 - "package.json"
Cohesion: 0.14
Nodes (15): devDependencies, turbo@^2.3.0, typescript@^5.6.0, engines, node, name, packageManager, private (+7 more)

### Community 25 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+7 more)

### Community 26 - "Скрипт обновления графа"
Cohesion: 0.25
Nodes (6): finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 27 - "Organization Hierarchy (Account > Space > Notebook > Folder > Note)"
Cohesion: 0.19
Nodes (14): Space { id, name, icon, color, order, createdAt } в account-документе, Organization Hierarchy (Account > Space > Notebook > Folder > Note), Предложенная структура: пространства → вложенные папки; поперёк — вложенные и умные теги, цвета, избранное, недавние, Поперёк структуры — теги, умные теги, избранное, недавние, D-36. Структура: пространство → блокноты → папки, Пространство (Личное, Работа, Учёба) содержит несколько блокнотов, Вариант «пространство = блокнот» — отклонён: нельзя смешивать режимы в одном контексте, Рассмотренные варианты (+6 more)

### Community 28 - "crypto.md"
Cohesion: 0.24
Nodes (13): loginKey = BLAKE2b(authSeed, "ds1|login"); сервер хранит Argon2id(loginKey), Смена пароля перешифровывает только обёртку masterKey, Вывод ключей из пароля: Argon2id13 (ops 3, mem 64 MiB, выход 64 байта), NFKC, соль 16 байт, passwordKey — никогда не покидает устройство, оборачивает masterKey, Восстановление: recoveryLoginKey → wrappedMasterKeyRecovery → новый пароль; данные не перешифровываются, Ключ восстановления: 32 байта, Crockford Base32 с префиксом DS1-, показывается один раз, Passkeys — сложно совместить со сквозным шифрованием сейчас; возможно позже, Ключ восстановления, выдаваемый при регистрации (+5 more)

### Community 29 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.27
Nodes (13): Подложки backdrop.* (sand, dusk, mist, meadow, ember) — мягкие градиенты в духе Craft, Цветовые токены: bg.canvas («бумага»), text.primary («чернила»), accent («синие чернила»), danger/success/warning — светлая и тёмная тема, Ширина колонки документа: normal 720, wide 960, full, Тактильная отдача iOS: selection, success (задача выполнена), warning (удаление), Чернила пера ink.* (black, blue, red, green, purple, brown) и маркеры highlight.*, Движение: пружины motion.snappy / smooth / gentle, длительности duration.* для веба, Сетка отступов 4 pt, радиусы radius.*, тени shadow.card / shadow.popover, Цвета tint.* (.fg / .bg) для папок, тегов и выносок (+5 more)

### Community 30 - "glossary.md"
Cohesion: 0.22
Nodes (12): doc_updates Table (encrypted Yjs updates), Private Notebook Edit Flow, Custom iOS Pen Render Layer (Metal or Core Animation), libsodium (swift-sodium), TextKit 2 (UIKit editor), ADR (Architecture Decision Record), End-to-End Encryption (E2E), PencilKit / PKCanvasView (+4 more)

### Community 31 - "12. Функции по мотивам Craft"
Cohesion: 0.24
Nodes (13): Stream web-app (claude/web-app): apps/web — web shell: login, sidebar, spaces/notebooks/folders, tasks, calendar, sharing, offline, PWA, Calendar screen: day feed with tasks and daily note (MVP); system calendar integration after MVP, Card document: nested document shown as a card with cover (MVP), Collections: records with properties and table / gallery / kanban views with filter, sort, grouping (after MVP), Daily note: one per day, created on demand, from template (MVP), Document cover image with offset (MVP), Document style: font (serif/sans/mono), width, paper (smooth/dots/grid/ruled), backdrop color or gradient, text color; style gallery after MVP, Tabs: several open documents on iPad and web (MVP) (+5 more)

### Community 32 - "Yrs (Rust Yjs) with Swift Wrapper"
Cohesion: 0.27
Nodes (9): Web PWA Client (React, TipTap, Yjs, IndexedDB), Automerge (fallback CRDT), TipTap (ProseMirror), Vite + React + TypeScript PWA, Yjs, Yrs (Rust Yjs) with Swift Wrapper, CRDT, PWA (+1 more)

### Community 33 - "05-organization-design.md"
Cohesion: 0.15
Nodes (12): Проекты, личное, работа, учёба не смешиваются; минимум кнопок на экране, D-14. Организация: богатая, но не перегруженная, Решение, D-15. Дизайн — основная концепция продукта, Design references: Things 3, Linear, Craft, Arc, Последствия, Решение, Ориентир Craft: градиентные подложки, документы-карточки с обложками, боковая панель «Вкладки / Избранное / Папки / Теги», стеклянные панели, контекстные меню (+4 more)

### Community 34 - "План этапов и отложенное"
Cohesion: 0.15
Nodes (13): Критерии приёмки, План разработки, Подготовка, Потоки разработки (D-39), Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad) (+5 more)

### Community 35 - "Модель данных и глоссарий (2) (2)"
Cohesion: 0.20
Nodes (10): Тестовые векторы crypto: KDF, конверты, Base32 ключа восстановления, куски вложений (Swift и TS), Контракт — точное описание формата/протокола, который реализуют несколько частей (iOS на Swift, веб и сервер на TS), Совместимость доказывается общими тестовыми векторами (packages/test-vectors), Типы TypeScript контрактов в packages/shared/src/contracts/ — часть контракта, Контракты между частями системы, Правила изменения, Тестовые векторы strokes: упаковка точек, разрешение якорей после правок, правило D-35, Тестовые векторы sync: примеры всех сообщений в JSON (схема проверяется в TS и Swift) (+2 more)

### Community 36 - "Server stack"
Cohesion: 0.17
Nodes (14): Canvas + Pointer Events, Dexie (IndexedDB), Drizzle ORM, Fastify, MCP TypeScript SDK, OAuth 2.1, pg-boss job queue, Radix + Tailwind + Motion (+6 more)

### Community 37 - "open-questions.md (2)"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 38 - "Контракт: модель документа (v1) (2)"
Cohesion: 0.18
Nodes (11): 1. Три вида документов Yjs, 2. Документ `account`, 3. Документ `notebook` (индекс блокнота), 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note` (+3 more)

### Community 39 - "Модель данных и глоссарий (5)"
Cohesion: 0.18
Nodes (10): Monorepo Structure (apps/, packages/, infra/), packages/test-vectors, Graphify, Автоматизация, Команды, Обновление графа после правки документов (по шагам), Почему два способа обновления, Установка на Mac (один раз) (+2 more)

### Community 40 - "02-platforms.md"
Cohesion: 0.21
Nodes (9): D-06. Рисование пальцем на iPhone — да, опционально, Finger drawing toggle on iPhone, Решение, D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, UI languages Russian and English, no RTL (D-17), iPad client (primary, Apple Pencil / Pencil Pro squeeze and roll, hover, Stage Manager, keyboard shortcuts) (+1 more)

### Community 41 - "tasks"
Cohesion: 0.18
Nodes (10): dependsOn, outputs, $schema, tasks, build, lint, test, typecheck (+2 more)

### Community 42 - "Контракт: шифрование (v1)"
Cohesion: 0.20
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 43 - "LibraryUITests"
Cohesion: 0.18
Nodes (4): LibraryUITests, OnboardingUITests, UIKit, XCTest

### Community 44 - "D-04. Одновременно сквозное шифрование и доступ по API"
Cohesion: 0.50
Nodes (4): D-04. Одновременно сквозное шифрование и доступ по API, Контекст, Последствия, Решение

### Community 45 - "0003-platforms.md"
Cohesion: 0.27
Nodes (4): iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), Full-featured web client (TypeScript), iPhone and iPad share one codebase (universal app), iOS editor: UIKit + TextKit 2

### Community 46 - "Монорепозиторий и CLAUDE.md (2)"
Cohesion: 0.29
Nodes (7): Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой, Правила, Среда разработки

### Community 47 - "Datascratch — правила для ИИ (CLAUDE.md)"
Cohesion: 0.13
Nodes (13): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, docs/history session log, Смешанный режим: облачные сессии (Linux, без Xcode) + Mac пользователя для сборки и iPad (+5 more)

### Community 48 - "D-30. База данных сервера — PostgreSQL"
Cohesion: 0.40
Nodes (5): D-30. База данных сервера — PostgreSQL, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 49 - "D-41. Набор функций по мотивам Craft"
Cohesion: 0.25
Nodes (6): Ежедневные заметки и «Входящие» (kind daily / inbox) в блокноте settings.dailyNotebookId, D-41. Набор функций по мотивам Craft, Контекст, Решение, OPEN (before stage 2): Craft features MVP / post-MVP split (D-41, proposed), Stage 2: MVP on iPad and iPhone, local (editor, handwriting, links, tags, organization, search, design system)

### Community 50 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 51 - "iOS-стек и два языка (2)"
Cohesion: 0.29
Nodes (5): Node.js + TypeScript server, Swift 6, TypeScript, Shared Rust core (rejected), Shared test vectors (packages/test-vectors)

### Community 52 - "Правила для ИИ и документации (4)"
Cohesion: 0.25
Nodes (8): Документация Datascratch, История, Как вносить изменения, Оглавление, Порядок чтения для новичка, Соглашения, Ссылки на решения, Статусы

### Community 53 - "12. Функции по мотивам Craft (2)"
Cohesion: 0.25
Nodes (8): 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft, Связь с моделью данных

### Community 54 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 55 - "0038-design-quiet-paper.md"
Cohesion: 0.15
Nodes (14): Radix + Tailwind + Motion Design System, SwiftUI, D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Вариант «графит по умолчанию» — отклонён: чернила на тёмном читаются хуже, Вариант «чистый нейтральный» (Linear / Things) — не выбран, Тёмная тема — тёплый графит, Рассмотренные варианты, Решение (+6 more)

### Community 56 - "libsodium on all platforms (swift-sodium on iOS, libsodium-wrappers in TS)"
Cohesion: 0.20
Nodes (11): Вложения: загрузка и докачка по кускам (/attachments/:id/chunks/:index), лимит 200 МБ, Ассоциированные данные ds1|… привязывают шифротекст к месту (doc, awareness, ключи, куски вложений), Вложения шифруются кусками по 1 MiB, каждый — отдельный конверт, Конверт шифротекста: версия 0x01 + nonce 24 байта + XChaCha20-Poly1305-IETF (тег 16 байт), libsodium на всех платформах (libsodium-wrappers-sumo в TS, swift-sodium в iOS), awareness — курсоры и присутствие: зашифровано, не хранится, только рассылается, libsodium, Attachments as separate encrypted files, on-demand resumable download (+3 more)

### Community 57 - "strokes.md"
Cohesion: 0.16
Nodes (19): Перепривязка якорей после отмены/повтора: в той же транзакции якорь удалённого символа с redone-элементом переписывается на относительную позицию нового элемента, Координаты block / image / drawing — в долях ширины блока, Правило D-35 в отрисовке: точки удалённых символов не рисуются, штрих остаётся в документе; отмена возвращает пометку, Координаты text-штриха: смещение от начала глифа якорного символа в em, Записываются только сглаженные coalesced-точки завершённого штриха, без predicted, Штрих почти неизменяем после рисования; ластик удаляет штрих целиком или заменяет кусками, Разрыв штриха по строкам: соседние точки на разных line fragments → отдельные сегменты, Изменяемые поля штриха после рисования: anchors (перепривязка, §4.1) и hidden (резерв) (+11 more)

### Community 58 - "iOS-стек и два языка (2) (2)"
Cohesion: 0.20
Nodes (9): Обоснованы PostgreSQL (D-30) и Yjs (D-31) как отдельные решения, Custom pen renderer (Metal vs Core Animation TBD), GRDB (SQLite), iOS client stack, SwiftUI (shell), UIKit + TextKit 2 (editor), MongoDB (rejected), MySQL (rejected) (+1 more)

### Community 59 - "Процесс разработки и Graphify (2)"
Cohesion: 0.33
Nodes (6): Git, Две среды, Конец сессии, Кто что делает, Правила для сессий-исполнителей (D-39), Процесс разработки

### Community 60 - "Платформы и клиенты (2)"
Cohesion: 0.15
Nodes (11): D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, 1. Концепция продукта, Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения, Суть в одном абзаце, Datascratch (+3 more)

### Community 61 - "0009-notebook-mode-choice.md (5)"
Cohesion: 0.33
Nodes (6): 7. Шифрование и доступ агентов, Вход и восстановление доступа (D-34), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 62 - "Контракт: дизайн-токены «Тихая бумага» (v1) (2)"
Cohesion: 0.40
Nodes (5): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 63 - "0005-living-stroke.md"
Cohesion: 0.33
Nodes (5): Отрисовка после перекладки: якорь → абсолютная позиция (с учётом redone-элементов) → текущий прямоугольник глифа, Привязка к тексту: каждая точка → ближайший символ строки (живой штрих), PencilKit (rejected), Living Stroke, Reflow

### Community 64 - "D-21. Технологический стек"
Cohesion: 0.40
Nodes (5): D-21. Технологический стек, Контекст, Последствия, Рассмотренные варианты (по обсуждению 2026-10-25), Решение

### Community 65 - "D-21. Технологический стек (2)"
Cohesion: 0.40
Nodes (5): D-22. Без собственного общего ядра на Rust, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 66 - "D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS)"
Cohesion: 0.40
Nodes (5): D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS), Контекст, Последствия, Рассмотренные варианты, Решение

### Community 67 - "04-editor.md (4)"
Cohesion: 0.40
Nodes (5): 4. Редактор, Платформенная реализация, Прочее, Связи, Содержимое

### Community 68 - "Дизайн и организация (2) (2)"
Cohesion: 0.40
Nodes (5): 5. Организация заметок и дизайн, Дизайн (D-15 — РЕШЕНО, главный принцип продукта), Организация (D-14 — РЕШЕНО по сути; структура ниже — ПРЕДЛОЖЕНО), Принципы, Реализация

### Community 69 - "0035-strokes-on-deleted-text.md"
Cohesion: 0.20
Nodes (11): Контракт меняет только сессия-координатор; исполнитель присылает предложение, Обводки и стрелки «растягиваются» вместе с текстом; при проблемах — изменение контракта через координатора, D-35. Пометка на удалённом тексте исчезает вместе с ним, Вариант «потерянные пометки» — отклонён: лишний интерфейс, Частичное удаление: штрих «сжимается» до оставшегося текста, Вариант «прилипать к соседнему символу» — отклонён: пометка может оказаться не на том слове, Рукописная пометка исчезает вместе с удалённым текстом (пользователем, агентом, другим устройством), Рассмотренные варианты (+3 more)

### Community 70 - "open-questions.md (3)"
Cohesion: 0.50
Nodes (4): docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo

### Community 71 - "D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS) (2)"
Cohesion: 0.50
Nodes (4): D-27. В прототипе пера текст хранится в Yrs, Контекст, Последствия, Решение

### Community 72 - "Контракт: рукописные штрихи (v1)"
Cohesion: 0.22
Nodes (9): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4.1. Перепривязка якорей (отмена и восстановление версии), 4.2. Когда штрих считается «осиротевшим» и удаляется навсегда, 4. Привязка к тексту (живой штрих), 5. Отрисовка толщины, 6. Тестовые векторы (+1 more)

### Community 73 - "0024-product-name.md"
Cohesion: 0.20
Nodes (10): D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст, Решение, Bundle ID com.datascratch.app, D-33. Bundle ID — com.datascratch.app, Решение (+2 more)

### Community 74 - "0031-crdt-yjs.md"
Cohesion: 0.24
Nodes (11): Утверждён технологический стек (D-21), отказ от ядра на Rust (D-22), End-to-end encryption, Pen prototype (stage 1), Automerge (fallback CRDT), Last-write-wins (unsuitable), Loro (too early), Operational Transformation (unsuitable), Yjs RelativePosition as stroke-point anchor (+3 more)

### Community 75 - "03-pencil.md"
Cohesion: 0.11
Nodes (16): D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, 3. Apple Pencil в тексте — ключевая фича, Handwriting input types (text marks, margin notes, drawing block, drawing on images, Scribble), Stroke point anchoring: character anchor + dx/dy in font-size units, System Scribble only; no recognition of drawn ink (D-07), Виды рукописного ввода (+8 more)

### Community 77 - "Theme"
Cohesion: 0.24
Nodes (5): Motion, Radius, Space, Theme, Typography

### Community 78 - "TaskComponents.swift"
Cohesion: 0.20
Nodes (5): LibraryStore, TaskCheckbox, .body, .body, DSDesign

### Community 79 - "TaskDateChips"
Cohesion: 0.40
Nodes (3): TaskDateChips, .body, TaskMenuItems

### Community 80 - "Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1)"
Cohesion: 0.24
Nodes (7): Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), apps/web — веб-клиент, Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), Own design system (typography, grid, colors, icons, animation, haptics) unified on iOS and web, App server: Node.js + TypeScript (Fastify), packages/shared — общие TypeScript-типы и схемы, Shared TypeScript types and schemas (document, strokes, metadata, sync protocol, API)

### Community 81 - "NoteMeta: folderId, parentNoteId, title, kind, dailyDate, tags, wrappedKey, trashedAt, order"
Cohesion: 0.20
Nodes (10): Folder { parentId, name, icon, color, order } — вложенность без ограничения глубины, NoteMeta: folderId, parentNoteId, title, kind, dailyDate, tags, wrappedKey, trashedAt, order, Документ notebook — индекс блокнота: folders, notes (NoteMeta), tags (ключ блокнота), pageCard — вложенная заметка-карточка (noteId, card | link), Три вида документов Yjs (DocKind): account, notebook, note — разные назначение и ключ, Единица синхронизации — документ Yjs (account, notebook, note), Внутри блокнота — вложенные папки без ограничения глубины и заметки, Nested folders without depth limit (+2 more)

### Community 82 - "D-01. Хранение заметок — в базе данных на своём сервере, не в файлах"
Cohesion: 0.40
Nodes (5): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 83 - "D-05. Перо при перекладке текста — вариант А «живой штрих»"
Cohesion: 0.40
Nodes (5): D-05. Перо при перекладке текста — вариант А «живой штрих», Гипотеза реализации, Контекст, Последствия, Решение

### Community 84 - "D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO"
Cohesion: 0.40
Nodes (5): D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 85 - "0032-min-ios-version.md"
Cohesion: 0.27
Nodes (9): D-32. Минимальная версия iOS/iPadOS — 26, Минимальная версия iOS/iPadOS 26 (IPHONEOS_DEPLOYMENT_TARGET = 26.0), Liquid Glass — системный дизайн iOS 26, Отклонённые варианты: iOS 18+ (шире охват) и 17.5+ (минимум для Pencil Pro), Последствия, Рассмотренные варианты, Решение, CLOSED: minimum iOS 26+ (D-32); XcodeGen accepted (D-39); Bundle ID (D-33); paid Apple Developer account exists (+1 more)

### Community 86 - "Theme.swift"
Cohesion: 0.28
Nodes (7): Backdrop, .colors, .gradient, Color, Tint, .background, .foreground

### Community 87 - "PostgreSQL"
Cohesion: 0.32
Nodes (7): Журнал действий агента GET /agent-tokens/:id/audit, agent_tokens / agent_audit_log Tables, doc_snapshots Table (compacted snapshots, version history), Server PostgreSQL Schema (Stage 3 Draft), docker compose Self-Hosting (server + PostgreSQL), pg-boss Job Queue, PostgreSQL

### Community 88 - "Производные данные строятся локально: индекс задач, полнотекстовый поиск, бэклинки, теги"
Cohesion: 0.32
Nodes (8): Производные данные строятся локально: индекс задач, полнотекстовый поиск, бэклинки, теги, Inline-узлы noteLink ([[ ]]) и tag (без #, вложенность через /), taskItem: taskId, state open / done / cancelled, scheduled, deadline, completedAt, Obsidian (reference product: links, backlinks, tags, Markdown export), Backlinks, [[ ]] links with autocomplete, Nested tags, smart tags (saved filters), colors and icons; favorites and recents, MVP blocks: headings, lists, quote, callout, divider, links, [[ ]], tags, table, code with highlighting, LaTeX formula, Mermaid, drawing, image, file

### Community 89 - "0002-no-desktop-app.md"
Cohesion: 0.40
Nodes (4): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, Web client as full desktop replacement (Pointer Events with pressure, offline, PWA, mobile-browser editing for guests)

### Community 90 - "Модель данных — ЧЕРНОВИК"
Cohesion: 0.40
Nodes (5): Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3), Штрих (черновик для прототипа)

### Community 93 - "D-03. Платформы: нативные iPhone и iPad + полноценный веб"
Cohesion: 0.50
Nodes (4): D-03. Платформы: нативные iPhone и iPad + полноценный веб, Контекст, Последствия, Решение

### Community 94 - "Notesnook"
Cohesion: 0.50
Nodes (4): Notesnook, Import from Obsidian/Notesnook (later), Вход по email + паролю; один пароль и для входа, и для шифрования (как в Notesnook), CLOSED: login email + password with recovery key (D-34)

### Community 95 - "0013-collaboration-sharing.md"
Cohesion: 0.50
Nodes (3): D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Последствия, Решение

### Community 96 - "D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления"
Cohesion: 0.50
Nodes (4): D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления, Контекст, Рассмотренные варианты, Решение

### Community 97 - "2. Платформы"
Cohesion: 0.50
Nodes (4): 2. Платформы, Минимальная версия iOS/iPadOS — 26 (D-32), Тестовые устройства (известно на 2026-10-25), Требования

## Knowledge Gaps
- **80 isolated node(s):** `.body`, `XCTest`, `.bodyFont`, `.menu`, `.placeholder` (+75 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 436 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Порядок чтения для новичка: концепция → roadmap → стек → обзор → перо → решения → вопросы/риски → процесс → history` connect `.mutate` to `0039-parallel-sessions.md`, `План разработки`, `stack.md`, `03-pencil.md`, `Правила для ИИ и документации (2) (2)`, `2026-10-25-coordinator-contract-clarifications.md`, `D-28. Процесс разработки: облако + Mac, сборка iOS в CI`, `Платформы и клиенты (2)`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Are the 31 inferred relationships involving `LibrarySnapshot` (e.g. with `.activeSpace` and `.body()`) actually correct?**
  _`LibrarySnapshot` has 31 INFERRED edges - model-reasoned connections that need verification._
- **What connects `.body`, `XCTest`, `.bodyFont` to the rest of the system?**
  _80 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `0039-parallel-sessions.md` be split into smaller, more focused modules?**
  _Cohesion score 0.0523532522474881 - nodes in this community are weakly interconnected._
- **Why does `Контракт: модель документа (v1)` connect `Контракт: модель документа (v1) (2)` to `document-model.md`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Should `Контракт: протокол синхронизации (v1)` be split into smaller, more focused modules?**
  _Cohesion score 0.05764411027568922 - nodes in this community are weakly interconnected._
- **Why does `Открытые вопросы` connect `open-questions.md (2)` to `D-28. Процесс разработки: облако + Mac, сборка iOS в CI`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._