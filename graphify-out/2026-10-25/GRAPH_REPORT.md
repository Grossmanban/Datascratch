# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 131 files · ~50,412 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 3)

## Summary
- 1447 nodes · 2919 edges · 117 communities (101 shown, 16 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 249 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `34399488`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Процесс разработки (docs/development.md)
- Shared test vectors (input -> expected output) run in Swift and TypeScript
- D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS)
- 2026-10-25
- Платформы и клиенты
- Документация Datascratch (docs/README.md)
- План разработки
- Дизайн и организация
- Graphify
- 10-sync.md
- Модель данных и глоссарий
- stack.md
- Datascratch — правила для ИИ (CLAUDE.md)
- 09-agents-api.md
- Скрипт обновления графа
- 0031-crdt-yjs.md
- Модель данных и глоссарий (2)
- Контракт: модель документа (v1)
- AgentsStore
- 06-data-server.md
- glossary.md
- handwriting-png.ts
- risks.md
- agent-service.ts
- 06-data-server.md (2)
- Платформы и клиенты (2)
- oauth.ts
- strokes.ts
- edits.ts
- registerOAuthRoutes
- 11. Нефункциональные требования
- Технологический стек — РЕШЕНО (2026-10-25)
- 0026-file-storage.md
- open-questions.md (2)
- package.json
- dependencies
- Обзор архитектуры: разделы
- agents/package.json
- compilerOptions
- 0024-product-name.md
- InMemoryUserAuth
- 0005-living-stroke.md
- 0005-living-stroke.md
- open-questions.md (3)
- Контракт: шифрование (v1)
- oauth.test.ts
- src/index.ts
- world.ts
- 0003-platforms.md
- 04-editor.md
- open-questions.md
- compilerOptions
- tasks
- Контракт: REST API сервера (v1)
- Контракт: протокол синхронизации (v1)
- Datascratch — правила для ИИ
- D-29. Graphify: порядок работы, чтобы граф был всегда актуален
- 08-sharing.md
- 12. Функции по мотивам Craft
- Контракт: рукописные штрихи (v1)
- tsconfig.build.json
- 0010-agent-edits.md
- Snapshot
- Контракт: дизайн-токены «Тихая бумага» (v1)
- InMemoryDataSource
- decisions/README.md
- fixtures.ts
- 0025-no-redis.md
- InMemoryAgentsStore
- 07-encryption.md
- plugin.ts
- overview.md
- 0004-encryption-and-api.md
- 0014-organization.md
- handwriting.ts
- D-32. Минимальная версия iOS/iPadOS — 26
- D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления
- D-39. Разработка параллельными сессиями; Claude сам вливает в main
- Определение «готово» для любого изменения
- 5. Организация заметок и дизайн
- scripts
- 0001-storage-in-database.md
- D-35. Пометка на удалённом тексте исчезает вместе с ним
- D-36. Структура: пространство → блокноты → папки
- D-38. Дизайн-направление — «Тихая бумага», ориентир Craft
- D-41. Набор функций по мотивам Craft
- 03-pencil.md
- AgentsContext
- ./testing
- Контракты между частями системы
- D-33. Bundle ID — com.datascratch.app
- D-37. Гости по ссылке рисуют; ссылка живёт до отзыва
- D-40. Хостинг — позже; сервер готов к запуску одной командой
- changelog.d/README.md
- 3. Apple Pencil в тексте — ключевая фича
- agents/README.md
- design-tokens/README.md
- ui/README.md
- web-editor/README.md
- pnpm-workspace.yaml
- in-memory.ts
- Server stack
- TestProvider
- Процесс разработки (docs/development.md)
- AgentDataSource
- D-28. Процесс разработки: облако + Mac, сборка iOS в CI
- D-30. База данных сервера — PostgreSQL
- GrantService
- 2026-10-25
- 0006-finger-drawing-iphone.md
- 7. Шифрование и доступ агентов
- 0015-design-first.md
- D-03. Платформы: нативные iPhone и iPad + полноценный веб
- 2. Платформы
- Datascratch
- D-02. Отдельной десктоп-версии нет, на компьютере — веб
- fonts.ts

## God Nodes (most connected - your core abstractions)
1. `AgentError` - 37 edges
2. `Principal` - 35 edges
3. `AgentService` - 33 edges
4. `registerOAuthRoutes()` - 32 edges
5. `childElements()` - 24 edges
6. `buildMcpServer()` - 20 edges
7. `contentOf()` - 20 edges
8. `renderHandwriting()` - 19 edges
9. `InMemoryAgentsStore` - 19 edges
10. `yjs` - 18 edges

## Surprising Connections (you probably didn't know these)
- `4.2. Схема блоков` --references--> `label()`  [INFERRED]
  docs/architecture/contracts/document-model.md → tools/graphify_docs.py
- `Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО` --semantically_similar_to--> `Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/README.md
- `Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md` --semantically_similar_to--> `Конец сессии: файл в docs/history + roadmap/open-questions`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/development.md
- `Определение «готово» для любого изменения` --semantically_similar_to--> `Как вносить изменения — всё в одном коммите`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/README.md
- `Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов` --references--> `finish()`  [EXTRACTED]
  docs/CHANGELOG.md → tools/graphify_docs.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **iOS-Web Compatibility Without Shared Core** — docs_architecture_overview_no_shared_core, docs_architecture_stack_yrs, docs_architecture_stack_yjs, docs_architecture_stack_libsodium, docs_architecture_overview_test_vectors_package [EXTRACTED 1.00]
- **Поддержание графа Graphify: D-29, git-хук для кода, graphify_docs.py для документов, граф в репозитории** — docs_changelog_graphify_workflow_fixed, docs_changelog_graphify_docs_tool_added, docs_decisions_0029_graphify_workflow_d29, docs_decisions_0029_graphify_workflow_git_hook, tools_graphify_docs, docs_decisions_0029_graphify_workflow_graph_committed [EXTRACTED 1.00]
- **Двухслойная модель графа Graphify и кто обновляет каждый слой** — docs_decisions_0029_graphify_workflow_structural_layer, docs_decisions_0029_graphify_workflow_semantic_layer, docs_decisions_0029_graphify_workflow_git_hook, docs_decisions_0029_graphify_workflow_graphify_docs_script, docs_development_two_layer_graph [EXTRACTED 1.00]
- **Encryption key custody strategies** — docs_decisions_0004_encryption_and_api_private_notebook_mode, docs_decisions_0004_encryption_and_api_agent_notebook_mode, docs_decisions_0013_collaboration_sharing_key_in_url_fragment, docs_decisions_0004_encryption_and_api_local_mcp_bridge [INFERRED 0.75]
- **Rejected extra server services (lean two-container deployment)** — docs_decisions_0025_no_redis_redis, docs_decisions_0026_file_storage_minio, docs_decisions_0022_no_rust_core_shared_rust_core, docs_decisions_0030_server_database_postgresql_mysql [INFERRED 0.75]
- **Agent access to notes model** — docs_decisions_0004_encryption_and_api_agent_notebook_mode, docs_decisions_0009_notebook_mode_choice_notebook_mode_switch_reencryption, docs_decisions_0010_agent_edits_immediate_agent_edits, docs_decisions_0011_handwriting_for_agents_handwriting_png_render, docs_decisions_0004_encryption_and_api_local_mcp_bridge [INFERRED 0.85]
- **External agent access surface (MCP/REST, tokens, RLS, audit log, PNG ink)** — docs_spec_09_agents_api_remote_mcp_server, docs_spec_09_agents_api_rest_api, docs_spec_09_agents_api_thin_mcp_over_service_layer, docs_spec_09_agents_api_token_permissions_rls, docs_spec_09_agents_api_agent_action_log, docs_spec_09_agents_api_rate_limits, docs_spec_09_agents_api_handwriting_as_png, docs_spec_09_agents_api_mcp_tools_sketch [INFERRED 0.85]
- **Agent Notebook Edit Flow via MCP** — docs_architecture_overview_external_ai_agents, docs_architecture_overview_mcp_rest_api, docs_architecture_overview_edit_note_tool, docs_architecture_overview_auth_service, docs_architecture_overview_key_store, docs_glossary_row_level_security, docs_architecture_data_model_agent_audit_log [INFERRED 0.85]
- **Сборка iOS из облака без Xcode: облако + Mac + CI + XcodeGen** — docs_development_two_environments, docs_development_github_actions_macos, docs_development_xcodegen, claude_ios_ci_must_build_rule, docs_development_d28 [INFERRED 0.85]
- **CRDT + E2E encrypted sync design** — docs_decisions_0031_crdt_yjs_yjs, docs_decisions_0031_crdt_yjs_yrs, docs_decisions_0031_crdt_yjs_client_side_merge, docs_decisions_0021_tech_stack_end_to_end_encryption, docs_decisions_0031_crdt_yjs_relativeposition_stroke_anchor [INFERRED 0.85]
- **Данные и синхронизация: PostgreSQL (D-30), Yjs (D-31), Yrs в прототипе (D-27)** — docs_changelog_postgresql_yjs_justified, docs_changelog_yrs_pen_prototype, docs_decisions_0030_server_database_postgresql_d_30_база_данных_сервера_postgresql, docs_decisions_0031_crdt_yjs_d_31_crdt_yjs_веб_сервер_и_yrs_ios, docs_decisions_0027_yrs_in_prototype_d_27_в_прототипе_пера_текст_хранится_в_yrs [INFERRED 0.85]
- **Упрощение инфраструктуры: без Rust-ядра, без Redis, без MinIO — опора на PostgreSQL и диск** — docs_changelog_tech_stack_approved, docs_changelog_redis_removed, docs_changelog_minio_removed, docs_decisions_0022_no_rust_core_d_22_без_собственного_общего_ядра_на_rust, docs_decisions_0025_no_redis_d_25_redis_не_используем, docs_decisions_0026_file_storage_d_26_хранение_файлов_диск_по_умолчанию_внешнее_s3_опционально_без_minio [INFERRED 0.85]
- **Dual-mode encryption and sync flow (private relay vs agent decrypt)** — docs_spec_07_encryption_two_notebook_modes, docs_spec_07_encryption_private_notebooks, docs_spec_07_encryption_agent_notebooks, docs_spec_10_sync_encrypted_update_relay, docs_spec_10_sync_server_side_agent_merge, docs_spec_07_encryption_per_notebook_key_wrapping, docs_spec_07_encryption_server_key_separate_from_db [INFERRED 0.85]
- **Поток обновления графа при коммите (код и документы)** — claude_definition_of_done, docs_decisions_0029_graphify_workflow_git_hook, docs_decisions_0029_graphify_workflow_graphify_docs_script, docs_development_docs_update_procedure, docs_development_finish_node_loss_guard [INFERRED 0.85]
- **Handwriting anchored to CRDT text structure** — docs_decisions_0001_storage_in_database_crdt_structured_documents, docs_decisions_0005_living_stroke_living_stroke, docs_decisions_0005_living_stroke_stroke_point_anchor, docs_decisions_0005_living_stroke_textkit2_render_layer, docs_decisions_0010_agent_edits_immediate_agent_edits [INFERRED 0.85]
- **Living-stroke anchoring pipeline (strokes anchored to CRDT text positions)** — docs_spec_03_pencil_living_stroke, docs_spec_03_pencil_stroke_anchor_hypothesis, docs_spec_03_pencil_crdt_relative_position_anchors, docs_spec_03_pencil_yrs_in_prototype, docs_spec_06_data_server_handwriting_layer, docs_spec_06_data_server_crdt_block_tree [INFERRED 0.85]
- **Private Notebook Encrypted Sync Flow** — docs_architecture_overview_private_notebook_edit_flow, docs_architecture_overview_ios_client, docs_architecture_stack_yrs, docs_architecture_stack_grdb, docs_architecture_stack_libsodium, docs_architecture_overview_sync_realtime, docs_architecture_stack_postgresql [INFERRED 0.85]

## Communities (117 total, 16 thin omitted)

### Community 0 - "Процесс разработки (docs/development.md)"
Cohesion: 0.36
Nodes (7): Стартовый хук Claude Code (.claude/hooks/session-start.sh), git-хук Graphify (пересборка только по изменённому коду), Graphify 0.9.95 (пакет graphifyy), Смысловой слой графа (понятия, решения, связи — проход ИИ), Структурный слой графа (код, файлы, заголовки — без ИИ), Автоматизация: стартовый хук, git-хук, graphify update после git pull, Установка Graphify на Mac (brew install uv, uv tool install graphifyy)

### Community 1 - "Shared test vectors (input -> expected output) run in Swift and TypeScript"
Cohesion: 0.20
Nodes (5): apps/server — сервер, apps/web — веб-клиент, packages/shared — общие TypeScript-типы и схемы, packages/test-vectors — общие тестовые векторы, Monorepo layout (apps/ios, apps/web, apps/server, packages, infra)

### Community 2 - "D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS)"
Cohesion: 0.20
Nodes (10): Прототип пера хранит текст в Yrs (D-27), D-27. В прототипе пера текст хранится в Yrs, Контекст, Последствия, Решение, D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS), Контекст, Последствия (+2 more)

### Community 3 - "2026-10-25"
Cohesion: 0.18
Nodes (11): Утверждён технологический стек (D-21), отказ от ядра на Rust (D-22), D-21. Технологический стек, Контекст, Последствия, Рассмотренные варианты (по обсуждению 2026-10-25), Решение, D-22. Без собственного общего ядра на Rust, Контекст (+3 more)

### Community 4 - "Платформы и клиенты"
Cohesion: 0.22
Nodes (8): D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, UI languages Russian and English, no RTL (D-17), iPad client (primary, Pencil / Pencil Pro, hover, Stage Manager), Minimum iOS/iPadOS version (OPEN: current + previous major), Test devices: Apple Silicon Mac with Xcode, iPad with Apple Pencil Pro, Web without cuts: full feature parity with iOS (R-07 pen quality risk)

### Community 5 - "Документация Datascratch (docs/README.md)"
Cohesion: 0.20
Nodes (9): Monorepo Structure (apps/, packages/, infra/), Документация Datascratch, История, Как вносить изменения, Оглавление, Порядок чтения для новичка, Соглашения, Ссылки на решения (+1 more)

### Community 6 - "План разработки"
Cohesion: 0.17
Nodes (12): Критерии приёмки, План разработки, Подготовка, Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad), Этап 2 — MVP на iPad и iPhone, локально (+4 more)

### Community 7 - "Дизайн и организация"
Cohesion: 0.27
Nodes (7): Light/dark theme, Dynamic Type, VoiceOver, full iPad keyboard, Feel references: Things 3, Linear, Craft, Arc, Own design system unified on iOS and web, Design tokens as single source for both platforms (format at stage 2), Nested folders without depth limit, Top-level spaces (Personal, Work, Study), Accessibility: Dynamic Type, VoiceOver, light/dark, iPad keyboard

### Community 8 - "Graphify"
Cohesion: 0.15
Nodes (12): Git, Graphify, Автоматизация, Две среды, Команды, Конец сессии, Кто что делает, Обновление графа после правки документов (по шагам) (+4 more)

### Community 9 - "10-sync.md"
Cohesion: 0.14
Nodes (14): Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps, Attachments as separate encrypted files, on-demand resumable download, Agent edits applied immediately, highlighted, revertible via history (D-10), 10. Синхронизация и офлайн, Chunked resumable attachments; thumbnails-only on iPhone, Local storage: SQLite via GRDB (iOS), IndexedDB via Dexie (web), Agent notebooks: server decrypts and applies agent edit as a normal update, Trash for 30 days (+6 more)

### Community 10 - "Модель данных и глоссарий"
Cohesion: 0.17
Nodes (16): agent_tokens / agent_audit_log Tables, Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, Key Store (agent notebooks), MCP + REST API, Official MCP TypeScript SDK (Streamable HTTP, OAuth 2.1) (+8 more)

### Community 11 - "stack.md"
Cohesion: 0.15
Nodes (20): iOS / iPadOS Client (Swift, TextKit 2, Yrs, GRDB), Web PWA Client (React, TipTap, Yjs, IndexedDB), Astro (landing page), Dexie (IndexedDB), Drizzle ORM, Fastify, GRDB (SQLite), TypeScript on Node.js (+12 more)

### Community 12 - "Datascratch — правила для ИИ (CLAUDE.md)"
Cohesion: 0.13
Nodes (15): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел) (+7 more)

### Community 13 - "09-agents-api.md"
Cohesion: 0.13
Nodes (16): D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Export: Markdown, PDF, HTML (handwriting as images), Server responsibilities: accounts, encrypted relay, attachments, realtime, API/MCP, handwriting PNG render, Local MCP bridge (future): local utility holding key for agent access to private notebooks, 9. API и внешние ИИ-агенты, Handwriting rendered to PNG for agents with text annotation (D-11), MCP tools sketch (list_spaces, list_notebooks, search_notes, read_note, get_handwriting_image, create_note, edit_note, add_comment, get_backlinks) (+8 more)

### Community 14 - "Скрипт обновления графа"
Cohesion: 0.28
Nodes (7): Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 15 - "0031-crdt-yjs.md"
Cohesion: 0.11
Nodes (27): Automerge (fallback CRDT), Yrs (Rust Yjs) with Swift Wrapper, Custom pen renderer (Metal vs Core Animation TBD), End-to-end encryption, GRDB (SQLite), iOS client stack, Node.js + TypeScript server, Swift 6 (+19 more)

### Community 16 - "Модель данных и глоссарий (2)"
Cohesion: 0.22
Nodes (11): Anchor (textRange / paragraph / drawingBlock / image), Note, Stroke, StrokePoint, Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3) (+3 more)

### Community 17 - "Контракт: модель документа (v1)"
Cohesion: 0.17
Nodes (11): 1. Три вида документов Yjs, 2. Документ `account`, 3. Документ `notebook` (индекс блокнота), 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note` (+3 more)

### Community 19 - "06-data-server.md"
Cohesion: 0.14
Nodes (14): Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), 6. Модель данных и сервер, App server: Node.js + TypeScript (Fastify), Metadata: title, tags, links, dates, space, folder, Self-hosting, Модель данных (общий обзор; детали — `architecture/data-model.md`), Резервные копии (+6 more)

### Community 20 - "glossary.md"
Cohesion: 0.18
Nodes (13): Organization Hierarchy (Account > Space > Notebook > Folder > Note), packages/test-vectors, ADR (Architecture Decision Record), Living Stroke, Predicted / Coalesced Touches, ProMotion (120 Hz), Reflow, Smart Tag (+5 more)

### Community 21 - "handwriting-png.ts"
Cohesion: 0.13
Nodes (25): Marks, StrokePoint, boxOf(), COLORS, COLUMN, cssColor(), drawSegment(), drawText() (+17 more)

### Community 22 - "risks.md"
Cohesion: 0.20
Nodes (9): Custom iOS Pen Render Layer (Metal or Core Animation), Canvas + Pointer Events Pen Layer, PencilKit / PKCanvasView, Universal Links, Apple Developer Account, R-07 Web Pen Worse than Native, R-12 No Paid Apple Account (7-day installs), Риски (+1 more)

### Community 23 - "agent-service.ts"
Cohesion: 0.06
Nodes (61): HandwritingItem, inlineMarkdown(), MARK_ORDER, MarkdownOptions, noteToMarkdown(), TONES, wrapMarks(), Writer (+53 more)

### Community 24 - "06-data-server.md (2)"
Cohesion: 0.15
Nodes (12): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, Контекст, Решение (на сейчас) (+4 more)

### Community 25 - "Платформы и клиенты (2)"
Cohesion: 0.15
Nodes (11): D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, 1. Концепция продукта, Obsidian (reference product: links, backlinks, tags, Markdown export), Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения, Суть в одном абзаце (+3 more)

### Community 26 - "oauth.ts"
Cohesion: 0.10
Nodes (27): RFC-7009, RFC-7591, RFC-8252, RFC-9207, clientAuth(), fetchClientMetadataDocument(), html(), isLoopback() (+19 more)

### Community 27 - "strokes.ts"
Cohesion: 0.20
Nodes (14): flatten(), FlatText, textBlockOf(), AnchorKind, anchorTextStrokes(), decodePoints(), field(), followRedone() (+6 more)

### Community 28 - "edits.ts"
Cohesion: 0.08
Nodes (43): BuildContext, cloneInto(), copyChildren(), fill(), fillInline(), insertBlock(), insertBlocks(), withAgentMark() (+35 more)

### Community 29 - "registerOAuthRoutes"
Cohesion: 0.17
Nodes (19): RFC-9562, scopeFor(), canonicalResource(), ClientRegistry, OAuthProblem, registerOAuthRoutes(), exchangeCode(), issue() (+11 more)

### Community 30 - "11. Нефункциональные требования"
Cohesion: 0.40
Nodes (5): 11. Нефункциональные требования, Доступность, Надёжность, Ресурсы сервера, Языки

### Community 31 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 32 - "0026-file-storage.md"
Cohesion: 0.21
Nodes (11): Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Server disk folder storage (default), External S3-compatible storage (Hetzner, R2, B2), File storage interface (two implementations, chosen by config), Garage / SeaweedFS, MinIO (rejected), Контекст (+3 more)

### Community 33 - "open-questions.md (2)"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 34 - "package.json"
Cohesion: 0.14
Nodes (15): devDependencies, turbo@^2.3.0, typescript@^5.6.0, engines, node, typescript, name, packageManager (+7 more)

### Community 35 - "dependencies"
Cohesion: 0.12
Nodes (16): dependencies, @expo-google-fonts/inter@^0.4.2, @expo-google-fonts/newsreader@^0.4.1, fastify-plugin@^6.0.1, mdast-util-from-markdown@^2.1.0, mdast-util-gfm@^3.1.0, micromark-extension-gfm@^3.0.0, @modelcontextprotocol/server@^2.4.0 (+8 more)

### Community 36 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 37 - "agents/package.json"
Cohesion: 0.09
Nodes (26): description, devDependencies, fastify@^5.6.0, pixelmatch@^7, pngjs@^7, @types/mdast@^4.0.4, @types/node@^22, @types/pngjs@^6.0.5 (+18 more)

### Community 38 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+7 more)

### Community 39 - "0024-product-name.md"
Cohesion: 0.29
Nodes (6): D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст, Решение, Final Product Name

### Community 40 - "InMemoryUserAuth"
Cohesion: 0.25
Nodes (3): UserAuth, UserIdentity, InMemoryUserAuth

### Community 41 - "0005-living-stroke.md"
Cohesion: 0.16
Nodes (11): D-08. Аннотации PDF пером — не в MVP, PDF pen annotations (PDFKit + stroke layer), Решение (предложение), D-16. Импорт — не сейчас, Решение, PDF Annotations Not in MVP, R-08 Huge Project Scope, Stage 2: Local MVP on iPad and iPhone (+3 more)

### Community 42 - "0005-living-stroke.md"
Cohesion: 0.24
Nodes (6): D-05. Перо при перекладке текста — вариант А «живой штрих», PencilKit (rejected), Гипотеза реализации, Контекст, Последствия, Решение

### Community 43 - "open-questions.md (3)"
Cohesion: 0.40
Nodes (5): docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, iOS build and tests on macOS CI runner per push

### Community 44 - "Контракт: шифрование (v1)"
Cohesion: 0.18
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 45 - "oauth.test.ts"
Cohesion: 0.18
Nodes (11): @modelcontextprotocol/client@^2.4.0, vitest@^4.0.0, authorize(), consent(), setup(), freePort(), SECRET, startServer() (+3 more)

### Community 46 - "src/index.ts"
Cohesion: 0.16
Nodes (13): ACCESS_PREFIX, bearer(), REFRESH_PREFIX, SCOPE_READ, SCOPE_WRITE, STATIC_PREFIX, RFC-8707, authorizationServerMetadata() (+5 more)

### Community 47 - "world.ts"
Cohesion: 0.21
Nodes (16): makeNotebookDoc(), createInMemoryContext(), setup(), FOLDER, grant(), makeNoteDocWithLink(), makeWorld(), NB_OTHER (+8 more)

### Community 49 - "04-editor.md"
Cohesion: 0.13
Nodes (12): apps/ios — iPhone + iPad, iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), iPhone and iPad share one codebase (universal app), 4. Редактор, iOS editor: UIKit + TextKit 2, Link graph view (not in MVP, stage 6), Web editor: TipTap (ProseMirror) + Yjs (+4 more)

### Community 50 - "open-questions.md"
Cohesion: 0.23
Nodes (12): GitHub Actions CI (incl. macOS iOS builds), XcodeGen, Mixed cloud + Mac development mode, End-to-End Encryption (E2E), Guest Pen Drawing and Link Lifetime, Minimum iOS/iPadOS Version, Monetization, Recovery Key for Forgotten Password (+4 more)

### Community 51 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, module, moduleResolution, noEmit, rootDir, types, extends (+2 more)

### Community 52 - "tasks"
Cohesion: 0.18
Nodes (10): dependsOn, outputs, $schema, tasks, build, lint, test, typecheck (+2 more)

### Community 53 - "Контракт: REST API сервера (v1)"
Cohesion: 0.20
Nodes (9): Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1), Общее, Служебное, Токены агентов (`spec/09-agents-api.md`) (+1 more)

### Community 54 - "Контракт: протокол синхронизации (v1)"
Cohesion: 0.20
Nodes (9): 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05), 6. Права, 7. Коды ошибок, 8. Тестовые векторы (+1 more)

### Community 55 - "Datascratch — правила для ИИ"
Cohesion: 0.22
Nodes (8): Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой, Правила, Среда разработки, Создан CLAUDE.md и скелет монорепозитория (apps/, packages/, infra/)

### Community 56 - "D-29. Graphify: порядок работы, чтобы граф был всегда актуален"
Cohesion: 0.24
Nodes (7): Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, D-29. Graphify: порядок работы, чтобы граф был всегда актуален, R-09 (риск: Graphify сломается или исчезнет), Контекст, Последствия, Решение, Раскладка graphify-out/ и что хранится в git

### Community 57 - "08-sharing.md"
Cohesion: 0.15
Nodes (13): D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account, Universal Links (paid Apple Developer account), Последствия, Решение, Web client as full desktop replacement (Pointer Events pressure, offline PWA), 8. Совместная работа и шеринг, Guest editing without account in any browser (+5 more)

### Community 58 - "12. Функции по мотивам Craft"
Cohesion: 0.22
Nodes (8): 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft, Связь с моделью данных

### Community 59 - "Контракт: рукописные штрихи (v1)"
Cohesion: 0.25
Nodes (7): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4. Привязка к тексту (живой штрих), 5. Отрисовка толщины, 6. Тестовые векторы, Контракт: рукописные штрихи (v1)

### Community 60 - "tsconfig.build.json"
Cohesion: 0.25
Nodes (7): compilerOptions, noEmit, outDir, rootDir, extends, include, ./tsconfig.json

### Community 61 - "0010-agent-edits.md"
Cohesion: 0.33
Nodes (5): D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение

### Community 62 - "Snapshot"
Cohesion: 0.47
Nodes (6): doc_snapshots Table (compacted snapshots, version history), doc_updates Table (encrypted Yjs updates), Snapshot, Update (Yjs binary edit record), Yjs History Compaction under Encryption, R-05 Edit History Growth

### Community 63 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.33
Nodes (5): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 65 - "decisions/README.md"
Cohesion: 0.13
Nodes (10): D-19. Весь код пишет Claude, Последствия, Решение, D-23. Документация — источник истины; Graphify — граф знаний поверх неё, docs/history session log, Контекст, Последствия, Решение (+2 more)

### Community 66 - "fixtures.ts"
Cohesion: 0.18
Nodes (15): findBlock(), encodePoints(), StrokeHint, StrokeTool, writeStroke(), addBlockStroke(), addTextStroke(), blockIdAt() (+7 more)

### Community 67 - "0025-no-redis.md"
Cohesion: 0.13
Nodes (19): Убран Redis (D-25): один процесс сервера, очередь — pg-boss на PostgreSQL, pg-boss job queue, D-25. Redis не используем, Edit broadcast interface (in-memory), PostgreSQL LISTEN/NOTIFY, Redis (rejected), Valkey (free Redis alternative), Будущее (+11 more)

### Community 68 - "InMemoryAgentsStore"
Cohesion: 0.12
Nodes (3): AuditEntry, AuthorizationCode, InMemoryAgentsStore

### Community 69 - "07-encryption.md"
Cohesion: 0.17
Nodes (11): D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, Notesnook (reference product: E2E encryption, reliable sync), Space -> notebook -> folder relation (open; encryption mode per notebook, D-09), Argon2id password key derivation, libsodium on all platforms (swift-sodium, libsodium-wrappers), Per-notebook key wrapped by user master key or server key, Private notebooks: key from password, server stores only ciphertext, no agent access (+3 more)

### Community 70 - "plugin.ts"
Cohesion: 0.12
Nodes (28): VerifiedToken, Permission, errorBody(), STATUS, toAgentError(), createInput, grantView(), registerAgentTokenRoutes() (+20 more)

### Community 71 - "overview.md"
Cohesion: 0.16
Nodes (16): Server PostgreSQL Schema (Stage 3 Draft), File Storage (disk or external S3), Guest via Link (web, no account), Handwriting-to-PNG Render (pg-boss queue), Private Notebook Edit Flow, Sync / Realtime Service, docker compose Self-Hosting (server + PostgreSQL), libsodium (swift-sodium) (+8 more)

### Community 72 - "0004-encryption-and-api.md"
Cohesion: 0.23
Nodes (8): D-04. Одновременно сквозное шифрование и доступ по API, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), Notesnook, Контекст, Последствия, Решение, Import from Obsidian/Notesnook (later)

### Community 73 - "0014-organization.md"
Cohesion: 0.40
Nodes (4): D-14. Организация: богатая, но не перегруженная, Spaces, nested folders, smart tags, colors, Решение, Organization Structure (notebook vs space vs folder)

### Community 74 - "handwriting.ts"
Cohesion: 0.23
Nodes (12): clip(), collectHandwriting(), describeSpans(), findHandwriting(), HandwritingKind, HINT_RU, hintOf(), TextMark (+4 more)

### Community 75 - "D-32. Минимальная версия iOS/iPadOS — 26"
Cohesion: 0.40
Nodes (4): D-32. Минимальная версия iOS/iPadOS — 26, Последствия, Рассмотренные варианты, Решение

### Community 76 - "D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления"
Cohesion: 0.40
Nodes (4): D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления, Контекст, Рассмотренные варианты, Решение

### Community 77 - "D-39. Разработка параллельными сессиями; Claude сам вливает в main"
Cohesion: 0.40
Nodes (4): D-39. Разработка параллельными сессиями; Claude сам вливает в main, Контекст, Последствия, Решение

### Community 78 - "Определение «готово» для любого изменения"
Cohesion: 0.27
Nodes (5): Скрипт tools/graphify_docs.py (prepare → агенты → finish), Обновление графа после правки документов (prepare → агенты → finish → export html → check-update), Промпт извлечения .claude/skills/graphify/references/extraction-spec.md, Git: ветки, PR, один коммит = код + docs + граф, Команды Graphify (query, explain, path, update, check-update, /graphify)

### Community 79 - "5. Организация заметок и дизайн"
Cohesion: 0.40
Nodes (5): 5. Организация заметок и дизайн, Дизайн (D-15 — РЕШЕНО, главный принцип продукта), Организация (D-14 — РЕШЕНО по сути; структура ниже — ПРЕДЛОЖЕНО), Принципы, Реализация

### Community 80 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, lint, test, typecheck

### Community 81 - "0001-storage-in-database.md"
Cohesion: 0.16
Nodes (10): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты, Решение (+2 more)

### Community 82 - "D-35. Пометка на удалённом тексте исчезает вместе с ним"
Cohesion: 0.50
Nodes (3): D-35. Пометка на удалённом тексте исчезает вместе с ним, Рассмотренные варианты, Решение

### Community 83 - "D-36. Структура: пространство → блокноты → папки"
Cohesion: 0.50
Nodes (3): D-36. Структура: пространство → блокноты → папки, Рассмотренные варианты, Решение

### Community 84 - "D-38. Дизайн-направление — «Тихая бумага», ориентир Craft"
Cohesion: 0.50
Nodes (3): D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Рассмотренные варианты, Решение

### Community 85 - "D-41. Набор функций по мотивам Craft"
Cohesion: 0.50
Nodes (3): D-41. Набор функций по мотивам Craft, Контекст, Решение

### Community 86 - "03-pencil.md"
Cohesion: 0.16
Nodes (10): D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, Handwriting input types (text marks, margin notes, drawing block, drawing on images, Scribble), Pencil gestures (zigzag delete, underline, strike, lasso), Prototype open questions (multi-word circles, deleted marked text R-04), Stroke point anchoring: character anchor + dx/dy in font-size units, System Scribble only; no recognition of drawn ink (D-07) (+2 more)

### Community 87 - "AgentsContext"
Cohesion: 0.20
Nodes (6): OAuthDeps, AgentsContext, Bucket, RateLimiter, RateLimitRule, AgentsPluginOptions

### Community 88 - "./testing"
Cohesion: 0.50
Nodes (4): exports, ./testing, default, types

### Community 94 - "3. Apple Pencil в тексте — ключевая фича"
Cohesion: 0.22
Nodes (9): 3. Apple Pencil в тексте — ключевая фича, Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера, Перекладка текста — вариант А «живой штрих» (D-05, РЕШЕНО) (+1 more)

### Community 100 - "in-memory.ts"
Cohesion: 0.22
Nodes (7): AgentEditOrigin, AgentNotebook, OAuthToken, NotebookView, InMemoryAgentsContext, StoredDoc, StoredNotebook

### Community 101 - "Server stack"
Cohesion: 0.20
Nodes (11): Canvas + Pointer Events, Dexie (IndexedDB), Drizzle ORM, Fastify, MCP TypeScript SDK, OAuth 2.1, Radix + Tailwind + Motion, Server stack (+3 more)

### Community 103 - "Процесс разработки (docs/development.md)"
Cohesion: 0.31
Nodes (8): D-23 (документация), D-19 (код пишет Claude), D-28 (облако + Mac, CI), GitHub Actions на macOS — проверка сборки iOS, Процесс разработки (docs/development.md), Роли: пользователь — владелец продукта, Claude — пишет код и docs, Две среды: облачная сессия Claude Code (Linux) и Mac пользователя, XcodeGen (apps/ios/project.yml, ПРЕДЛОЖЕНО)

### Community 105 - "D-28. Процесс разработки: облако + Mac, сборка iOS в CI"
Cohesion: 0.33
Nodes (6): Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), D-28. Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen (project.yml) - proposed, Контекст, Последствия, Решение

### Community 106 - "D-30. База данных сервера — PostgreSQL"
Cohesion: 0.33
Nodes (6): Обоснованы PostgreSQL (D-30) и Yjs (D-31) как отдельные решения, D-30. База данных сервера — PostgreSQL, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 108 - "2026-10-25"
Cohesion: 0.60
Nodes (3): 2026-10-25, Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Журнал изменений

### Community 109 - "0006-finger-drawing-iphone.md"
Cohesion: 0.40
Nodes (4): D-06. Рисование пальцем на iPhone — да, опционально, Finger drawing toggle on iPhone, Решение, iPhone client (primary, quick notes, finger drawing option D-06)

### Community 110 - "7. Шифрование и доступ агентов"
Cohesion: 0.33
Nodes (6): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 111 - "0015-design-first.md"
Cohesion: 0.40
Nodes (4): D-15. Дизайн — основная концепция продукта, Design references: Things 3, Linear, Craft, Arc, Последствия, Решение

### Community 112 - "D-03. Платформы: нативные iPhone и iPad + полноценный веб"
Cohesion: 0.50
Nodes (4): D-03. Платформы: нативные iPhone и iPad + полноценный веб, Контекст, Последствия, Решение

### Community 113 - "2. Платформы"
Cohesion: 0.50
Nodes (4): 2. Платформы, Минимальная версия iOS/iPadOS — ОТКРЫТО, Тестовые устройства (известно на 2026-10-25), Требования

### Community 114 - "Datascratch"
Cohesion: 0.50
Nodes (4): Datascratch, For non-Russian readers, Где что лежит, Текущий статус

### Community 115 - "D-02. Отдельной десктоп-версии нет, на компьютере — веб"
Cohesion: 0.67
Nodes (3): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение

### Community 117 - "fonts.ts"
Cohesion: 0.22
Nodes (6): @napi-rs/canvas@^1.0.13, DISPLAY_FAMILY, ensureFonts(), require, TEXT_FAMILY, @napi-rs/canvas

## Knowledge Gaps
- **60 isolated node(s):** `RFC-8707`, `RFC-9728`, `RFC-8414`, `RFC-8707`, `RFC-9207` (+55 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 532 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` connect `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` to `Процесс разработки (docs/development.md)`, `decisions/README.md`, `Процесс разработки (docs/development.md)`, `Datascratch — правила для ИИ (CLAUDE.md)`, `Скрипт обновления графа`, `Определение «готово» для любого изменения`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `registerOAuthRoutes()` (e.g. with `canonicalResource()` and `.get()`) actually correct?**
  _`registerOAuthRoutes()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-8707`, `RFC-9728`, `RFC-8414` to the rest of the system?**
  _60 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `10-sync.md` be split into smaller, more focused modules?**
  _Cohesion score 0.1437908496732026 - nodes in this community are weakly interconnected._
- **Why does `Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов` connect `Скрипт обновления графа` to `D-29. Graphify: порядок работы, чтобы граф был всегда актуален`, `Процесс разработки (docs/development.md)`, `2026-10-25`, `Определение «готово» для любого изменения`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Should `stack.md` be split into smaller, more focused modules?**
  _Cohesion score 0.1471861471861472 - nodes in this community are weakly interconnected._
- **Why does `yjs` connect `fixtures.ts` to `dependencies`, `in-memory.ts`, `agents/package.json`, `plugin.ts`, `handwriting.ts`, `world.ts`, `handwriting-png.ts`, `agent-service.ts`, `strokes.ts`, `edits.ts`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._