# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 114 files · ~40,307 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 3)

## Summary
- 1305 nodes · 2418 edges · 118 communities (104 shown, 14 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 223 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `41a7ab44`
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
- Модель данных и глоссарий (5)
- agent-service.ts
- 06-data-server.md (2)
- Платформы и клиенты (2)
- model.ts
- strokes.ts
- edits.ts
- D-21. Технологический стек
- 06-data-server.md (3)
- Технологический стек — РЕШЕНО (2026-10-25)
- 0026-file-storage.md
- open-questions.md (2)
- package.json
- dependencies
- Обзор архитектуры: разделы
- devDependencies
- compilerOptions
- 0024-product-name.md
- in-memory.ts
- 0005-living-stroke.md
- 0005-living-stroke.md
- open-questions.md (3)
- Контракт: шифрование (v1)
- D-23. Документация — источник истины; Graphify — граф знаний поверх неё
- .block
- world.ts
- 0003-platforms.md
- 04-editor.md
- agents/package.json
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
- risks.md
- Контракт: дизайн-токены «Тихая бумага» (v1)
- InMemoryDataSource
- decisions/README.md
- fixtures.ts
- 0025-no-redis.md
- InMemoryAgentsStore
- 07-encryption.md
- context.ts
- PostgreSQL
- 0004-encryption-and-api.md
- 0014-organization.md
- 0030-server-database-postgresql.md
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
- fastify
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
- iOS client stack
- Server stack
- 0013-collaboration-sharing.md
- Private notebooks: key from password, server stores only ciphertext, no agent access
- AgentDataSource
- D-28. Процесс разработки: облако + Mac, сборка iOS в CI
- D-30. База данных сервера — PostgreSQL
- 0016-no-import-now.md
- 0007-no-handwriting-recognition.md
- Two-language policy (Swift + TypeScript)
- 7. Шифрование и доступ агентов
- 9. API и внешние ИИ-агенты
- iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)
- D-01. Хранение заметок — в базе данных на своём сервере, не в файлах
- 4. Редактор
- 10. Синхронизация и офлайн
- micromark-extension-gfm
- @napi-rs/canvas

## God Nodes (most connected - your core abstractions)
1. `AgentService` - 28 edges
2. `Principal` - 25 edges
3. `childElements()` - 24 edges
4. `AgentError` - 24 edges
5. `contentOf()` - 20 edges
6. `InMemoryAgentsStore` - 19 edges
7. `AgentsStore` - 18 edges
8. `yjs` - 17 edges
9. `renderHandwriting()` - 17 edges
10. `Stage 1: Pen-in-Text Prototype (iPad)` - 17 edges

## Surprising Connections (you probably didn't know these)
- `4.2. Схема блоков` --references--> `label()`  [INFERRED]
  docs/architecture/contracts/document-model.md → tools/graphify_docs.py
- `Определение «готово» для любого изменения` --semantically_similar_to--> `Как вносить изменения — всё в одном коммите`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/README.md
- `Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md` --semantically_similar_to--> `Конец сессии: файл в docs/history + roadmap/open-questions`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/development.md
- `Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО` --semantically_similar_to--> `Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/README.md
- `Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов` --references--> `prepare()`  [EXTRACTED]
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

## Communities (118 total, 14 thin omitted)

### Community 0 - "Процесс разработки (docs/development.md)"
Cohesion: 0.20
Nodes (13): Стартовый хук Claude Code (.claude/hooks/session-start.sh), D-23 (документация), git-хук Graphify (пересборка только по изменённому коду), Graphify 0.9.95 (пакет graphifyy), Смысловой слой графа (понятия, решения, связи — проход ИИ), Структурный слой графа (код, файлы, заголовки — без ИИ), Автоматизация: стартовый хук, git-хук, graphify update после git pull, D-19 (код пишет Claude) (+5 more)

### Community 1 - "Shared test vectors (input -> expected output) run in Swift and TypeScript"
Cohesion: 0.13
Nodes (12): apps/server — сервер, apps/web — веб-клиент, Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), Web client as full desktop replacement (Pointer Events pressure, offline PWA), packages/shared — общие TypeScript-типы и схемы, Shared TypeScript types and schemas (document, strokes, metadata, sync protocol, API), packages/test-vectors — общие тестовые векторы, Datascratch (+4 more)

### Community 2 - "D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS)"
Cohesion: 0.18
Nodes (10): Прототип пера хранит текст в Yrs (D-27), D-27. В прототипе пера текст хранится в Yrs, Контекст, Последствия, Решение, D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS), Контекст, Последствия (+2 more)

### Community 3 - "2026-10-25"
Cohesion: 0.22
Nodes (9): 2026-10-25, Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Утверждён технологический стек (D-21), отказ от ядра на Rust (D-22), Журнал изменений, D-22. Без собственного общего ядра на Rust, Контекст, Последствия, Рассмотренные варианты (+1 more)

### Community 4 - "Платформы и клиенты"
Cohesion: 0.12
Nodes (16): D-06. Рисование пальцем на iPhone — да, опционально, Finger drawing toggle on iPhone, Решение, D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, 2. Платформы, UI languages Russian and English, no RTL (D-17) (+8 more)

### Community 5 - "Документация Datascratch (docs/README.md)"
Cohesion: 0.25
Nodes (8): Документация Datascratch, История, Как вносить изменения, Оглавление, Порядок чтения для новичка, Соглашения, Ссылки на решения, Статусы

### Community 6 - "План разработки"
Cohesion: 0.17
Nodes (12): Критерии приёмки, План разработки, Подготовка, Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad), Этап 2 — MVP на iPad и iPhone, локально (+4 more)

### Community 7 - "Дизайн и организация"
Cohesion: 0.17
Nodes (11): D-15. Дизайн — основная концепция продукта, Design references: Things 3, Linear, Craft, Arc, Последствия, Решение, Light/dark theme, Dynamic Type, VoiceOver, full iPad keyboard, Feel references: Things 3, Linear, Craft, Arc, Own design system unified on iOS and web, Design tokens as single source for both platforms (format at stage 2) (+3 more)

### Community 8 - "Graphify"
Cohesion: 0.13
Nodes (13): Monorepo Structure (apps/, packages/, infra/), Git, Graphify, Автоматизация, Две среды, Команды, Конец сессии, Кто что делает (+5 more)

### Community 9 - "10-sync.md"
Cohesion: 0.31
Nodes (6): Agent edits applied immediately, highlighted, revertible via history (D-10), Local storage: SQLite via GRDB (iOS), IndexedDB via Dexie (web), Agent notebooks: server decrypts and applies agent edit as a normal update, Trash for 30 days, Version history: snapshots, view, rollback, Each note is a Yjs CRDT doc; edits are small binary updates

### Community 10 - "Модель данных и глоссарий"
Cohesion: 0.17
Nodes (17): Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, File Storage (disk or external S3), iOS / iPadOS Client (Swift, TextKit 2, Yrs, GRDB), Key Store (agent notebooks), MCP + REST API (+9 more)

### Community 11 - "stack.md"
Cohesion: 0.12
Nodes (21): packages/test-vectors, Web PWA Client (React, TipTap, Yjs, IndexedDB), Astro (landing page), Dexie (IndexedDB), Drizzle ORM, Fastify, GRDB (SQLite), libsodium (swift-sodium) (+13 more)

### Community 12 - "Datascratch — правила для ИИ (CLAUDE.md)"
Cohesion: 0.16
Nodes (13): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, GitHub Actions на macOS — проверка сборки iOS, Две среды: облачная сессия Claude Code (Linux) и Mac пользователя (+5 more)

### Community 13 - "09-agents-api.md"
Cohesion: 0.18
Nodes (11): D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Handwriting Format for Agents (PNG), Export: Markdown, PDF, HTML (handwriting as images), Server responsibilities: accounts, encrypted relay, attachments, realtime, API/MCP, handwriting PNG render, Local MCP bridge (future): local utility holding key for agent access to private notebooks, Handwriting rendered to PNG for agents with text annotation (D-11), MCP tools sketch (list_spaces, list_notebooks, search_notes, read_note, get_handwriting_image, create_note, edit_note, add_comment, get_backlinks) (+3 more)

### Community 14 - "Скрипт обновления графа"
Cohesion: 0.28
Nodes (7): Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 15 - "0031-crdt-yjs.md"
Cohesion: 0.19
Nodes (17): Automerge (fallback CRDT), Yrs (Rust Yjs) with Swift Wrapper, Canvas + Pointer Events, TipTap editor, Vite + React + TypeScript PWA, Web client stack (PWA), Pen prototype (stage 1), Automerge (fallback CRDT) (+9 more)

### Community 16 - "Модель данных и глоссарий (2)"
Cohesion: 0.22
Nodes (11): Anchor (textRange / paragraph / drawingBlock / image), Note, Stroke, StrokePoint, Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3) (+3 more)

### Community 17 - "Контракт: модель документа (v1)"
Cohesion: 0.17
Nodes (11): 1. Три вида документов Yjs, 2. Документ `account`, 3. Документ `notebook` (индекс блокнота), 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note` (+3 more)

### Community 19 - "06-data-server.md"
Cohesion: 0.14
Nodes (13): Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), 6. Модель данных и сервер, App server: Node.js + TypeScript (Fastify), Metadata: title, tags, links, dates, space, folder, Self-hosting, Модель данных (общий обзор; детали — `architecture/data-model.md`), Резервные копии, Сервер (+5 more)

### Community 20 - "glossary.md"
Cohesion: 0.16
Nodes (20): Organization Hierarchy (Account > Space > Notebook > Folder > Note), GitHub Actions CI (incl. macOS iOS builds), Custom iOS Pen Render Layer (Metal or Core Animation), TextKit 2 (UIKit editor), XcodeGen, Mixed cloud + Mac development mode, ADR (Architecture Decision Record), Living Stroke (+12 more)

### Community 21 - "handwriting-png.ts"
Cohesion: 0.10
Nodes (30): attr(), Marks, DISPLAY_FAMILY, ensureFonts(), require, TEXT_FAMILY, BlockStyle, boxOf() (+22 more)

### Community 22 - "Модель данных и глоссарий (5)"
Cohesion: 0.29
Nodes (8): Guest via Link (web, no account), Canvas + Pointer Events Pen Layer, Universal Links, Apple Developer Account, Guest Pen Drawing and Link Lifetime, R-07 Web Pen Worse than Native, R-12 No Paid Apple Account (7-day installs), Stage 4: Web Client

### Community 23 - "agent-service.ts"
Cohesion: 0.08
Nodes (33): findHandwriting(), AgentError, AgentErrorCode, STATUS, toAgentError(), Principal, requireWrite(), AgentService (+25 more)

### Community 24 - "06-data-server.md (2)"
Cohesion: 0.19
Nodes (10): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, Контекст, Решение (на сейчас) (+2 more)

### Community 25 - "Платформы и клиенты (2)"
Cohesion: 0.22
Nodes (7): D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, 1. Концепция продукта, Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения, Суть в одном абзаце

### Community 26 - "model.ts"
Cohesion: 0.21
Nodes (19): atomText(), attrs(), blockIdOf(), BlockLocation, childElements(), CONTAINER_BLOCKS, contentOf(), flatten() (+11 more)

### Community 27 - "strokes.ts"
Cohesion: 0.13
Nodes (25): clip(), collectHandwriting(), describeSpans(), HandwritingKind, HINT_RU, hintOf(), TextMark, wordSpan() (+17 more)

### Community 28 - "edits.ts"
Cohesion: 0.06
Nodes (45): RFC-9562, BuildContext, cloneInto(), copyChildren(), fill(), fillInline(), insertBlock(), insertBlocks() (+37 more)

### Community 29 - "D-21. Технологический стек"
Cohesion: 0.18
Nodes (10): Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел), D-21. Технологический стек, Контекст, Последствия, Рассмотренные варианты (по обсуждению 2026-10-25), Решение, Конец сессии: файл в docs/history + roadmap/open-questions (+2 more)

### Community 30 - "06-data-server.md (3)"
Cohesion: 0.20
Nodes (9): Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps, Daily off-VPS backups of DB and files with verified restore (R-11), 11. Нефункциональные требования, Performance targets (PencilKit latency, 120 fps, 300 ms open, 1-min first sync, 2 s delivery, 1 s cold start), Reliability: no edit lost on network drop, crash or low storage, Доступность, Надёжность, Ресурсы сервера (+1 more)

### Community 31 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 32 - "0026-file-storage.md"
Cohesion: 0.19
Nodes (12): MinIO (rejected), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Server disk folder storage (default), External S3-compatible storage (Hetzner, R2, B2), File storage interface (two implementations, chosen by config), Garage / SeaweedFS, MinIO (rejected) (+4 more)

### Community 33 - "open-questions.md (2)"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 34 - "package.json"
Cohesion: 0.14
Nodes (15): devDependencies, turbo@^2.3.0, typescript@^5.6.0, engines, node, typescript, name, packageManager (+7 more)

### Community 35 - "dependencies"
Cohesion: 0.12
Nodes (16): dependencies, @expo-google-fonts/inter@^0.4.2, @expo-google-fonts/newsreader@^0.4.1, fastify-plugin@^6.0.1, mdast-util-from-markdown@^2.1.0, mdast-util-gfm@^3.1.0, @modelcontextprotocol/server@^2.4.0, yjs@^13.6.27 (+8 more)

### Community 36 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 37 - "devDependencies"
Cohesion: 0.12
Nodes (15): devDependencies, pixelmatch@^7, pngjs@^7, @types/mdast@^4.0.4, @types/node@^22, @types/pngjs@^6.0.5, typescript@^5.9.0, vitest@^4.0.0 (+7 more)

### Community 38 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+7 more)

### Community 39 - "0024-product-name.md"
Cohesion: 0.29
Nodes (6): D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст, Решение, Final Product Name

### Community 40 - "in-memory.ts"
Cohesion: 0.14
Nodes (9): AgentEditOrigin, AgentsContext, OAuthClient, UserAuth, UserIdentity, createInMemoryContext(), InMemoryAgentsContext, InMemoryUserAuth (+1 more)

### Community 41 - "0005-living-stroke.md"
Cohesion: 0.22
Nodes (8): D-08. Аннотации PDF пером — не в MVP, PDF pen annotations (PDFKit + stroke layer), Решение (предложение), PDF Annotations Not in MVP, R-08 Huge Project Scope, Stage 2: Local MVP on iPad and iPhone, Stage 6: Extensions, Current status: stack approved, next is stage 1 pencil prototype

### Community 42 - "0005-living-stroke.md"
Cohesion: 0.24
Nodes (6): D-05. Перо при перекладке текста — вариант А «живой штрих», PencilKit (rejected), Гипотеза реализации, Контекст, Последствия, Решение

### Community 43 - "open-questions.md (3)"
Cohesion: 0.40
Nodes (5): docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, iOS build and tests on macOS CI runner per push

### Community 44 - "Контракт: шифрование (v1)"
Cohesion: 0.18
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 45 - "D-23. Документация — источник истины; Graphify — граф знаний поверх неё"
Cohesion: 0.50
Nodes (4): D-23. Документация — источник истины; Graphify — граф знаний поверх неё, Контекст, Последствия, Решение

### Community 46 - ".block"
Cohesion: 0.20
Nodes (10): HandwritingItem, inlineMarkdown(), MARK_ORDER, MarkdownOptions, noteToMarkdown(), TONES, wrapMarks(), Writer (+2 more)

### Community 47 - "world.ts"
Cohesion: 0.20
Nodes (16): makeNotebookDoc(), setup(), FOLDER, grant(), makeNoteDocWithLink(), makeWorld(), NB_OTHER, NB_PRIVATE (+8 more)

### Community 48 - "0003-platforms.md"
Cohesion: 0.18
Nodes (8): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, D-03. Платформы: нативные iPhone и iPad + полноценный веб, Full-featured web client (TypeScript), Контекст, Последствия, Решение

### Community 49 - "04-editor.md"
Cohesion: 0.21
Nodes (7): Obsidian (reference product: links, backlinks, tags, Markdown export), Backlinks, iOS editor: UIKit + TextKit 2, Link graph view (not in MVP, stage 6), Web editor: TipTap (ProseMirror) + Yjs, [[ ]] links with autocomplete, Nested tags and smart tags (saved filters), colors and icons

### Community 50 - "agents/package.json"
Cohesion: 0.18
Nodes (10): description, engines, node, files, main, name, private, type (+2 more)

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
Cohesion: 0.28
Nodes (7): 8. Совместная работа и шеринг, Guest editing without account in any browser, Share links with view/edit rights, expiry and revocation, Universal Links (requires Apple Developer account and apple-app-site-association), Открыто (см. `open-questions.md`), Реализация, Требования

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

### Community 62 - "risks.md"
Cohesion: 0.18
Nodes (14): doc_snapshots Table (compacted snapshots, version history), doc_updates Table (encrypted Yjs updates), VPS Hosting (Hetzner or similar), End-to-End Encryption (E2E), Snapshot, Update (Yjs binary edit record), Recovery Key for Forgotten Password, Yjs History Compaction under Encryption (+6 more)

### Community 63 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.33
Nodes (5): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 64 - "InMemoryDataSource"
Cohesion: 0.17
Nodes (5): AgentNotebook, LoadedDoc, NotebookView, InMemoryDataSource, StoredNotebook

### Community 65 - "decisions/README.md"
Cohesion: 0.17
Nodes (6): D-19. Весь код пишет Claude, Последствия, Решение, docs/history session log, Журнал решений (ADR), R-09 Graphify Is a Young Third-Party Tool

### Community 66 - "fixtures.ts"
Cohesion: 0.23
Nodes (13): findBlock(), encodePoints(), StrokeHint, StrokeTool, writeStroke(), addBlockStroke(), addTextStroke(), blockIdAt() (+5 more)

### Community 67 - "0025-no-redis.md"
Cohesion: 0.22
Nodes (12): Убран Redis (D-25): один процесс сервера, очередь — pg-boss на PostgreSQL, pg-boss job queue, D-25. Redis не используем, Edit broadcast interface (in-memory), PostgreSQL LISTEN/NOTIFY, Redis (rejected), Valkey (free Redis alternative), Будущее (+4 more)

### Community 68 - "InMemoryAgentsStore"
Cohesion: 0.15
Nodes (3): AuditEntry, AuthorizationCode, InMemoryAgentsStore

### Community 69 - "07-encryption.md"
Cohesion: 0.23
Nodes (9): D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, Space -> notebook -> folder relation (open; encryption mode per notebook, D-09), Attachments as separate encrypted files, on-demand resumable download, Argon2id password key derivation, libsodium on all platforms (swift-sodium, libsodium-wrappers), Two notebook modes chosen at creation, switchable with client re-encryption (D-09), XChaCha20-Poly1305 content encryption (+1 more)

### Community 70 - "context.ts"
Cohesion: 0.24
Nodes (4): RFC-7591, AgentGrant, OAuthToken, Permission

### Community 71 - "PostgreSQL"
Cohesion: 0.31
Nodes (9): agent_tokens / agent_audit_log Tables, Server PostgreSQL Schema (Stage 3 Draft), Handwriting-to-PNG Render (pg-boss queue), docker compose Self-Hosting (server + PostgreSQL), pg-boss Job Queue, PostgreSQL, Row-Level Security (RLS), R-10 Agent Notebooks Readable if Server Breached (+1 more)

### Community 72 - "0004-encryption-and-api.md"
Cohesion: 0.29
Nodes (6): D-04. Одновременно сквозное шифрование и доступ по API, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), Контекст, Последствия, Решение

### Community 73 - "0014-organization.md"
Cohesion: 0.40
Nodes (4): D-14. Организация: богатая, но не перегруженная, Spaces, nested folders, smart tags, colors, Решение, Organization Structure (notebook vs space vs folder)

### Community 74 - "0030-server-database-postgresql.md"
Cohesion: 0.22
Nodes (9): GRDB (SQLite), MongoDB (rejected), MySQL (rejected), Row-Level Security for agent token permissions, SQLite on server (rejected), pg-boss background job queue on PostgreSQL, PostgreSQL via Drizzle (D-30): accounts, notebooks, rights, tokens, encrypted updates, snapshots, agent log, Log of all agent actions (+1 more)

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
Cohesion: 0.31
Nodes (4): Скрипт tools/graphify_docs.py (prepare → агенты → finish), Обновление графа после правки документов (prepare → агенты → finish → export html → check-update), Промпт извлечения .claude/skills/graphify/references/extraction-spec.md, Git: ветки, PR, один коммит = код + docs + граф

### Community 79 - "5. Организация заметок и дизайн"
Cohesion: 0.40
Nodes (5): 5. Организация заметок и дизайн, Дизайн (D-15 — РЕШЕНО, главный принцип продукта), Организация (D-14 — РЕШЕНО по сути; структура ниже — ПРЕДЛОЖЕНО), Принципы, Реализация

### Community 80 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, lint, test, typecheck

### Community 81 - "0001-storage-in-database.md"
Cohesion: 0.31
Nodes (5): Markdown files option (rejected), Obsidian, Own server storage, Real-time collaborative editing, PostgreSQL

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
Cohesion: 0.28
Nodes (5): Pencil gestures (zigzag delete, underline, strike, lasso), Prototype open questions (multi-word circles, deleted marked text R-04), Stroke point anchoring: character anchor + dx/dy in font-size units, Editor content (headings, lists, tables, code, formulas, attachments, drawing blocks), Handwriting layer: vector strokes with anchors (text range, paragraph, drawing block, image)

### Community 87 - "fastify"
Cohesion: 0.50
Nodes (4): fastify@^5.6.0, peerDependencies, fastify@^5.0.0, fastify

### Community 88 - "./testing"
Cohesion: 0.50
Nodes (4): exports, ./testing, default, types

### Community 94 - "3. Apple Pencil в тексте — ключевая фича"
Cohesion: 0.22
Nodes (9): 3. Apple Pencil в тексте — ключевая фича, Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера, Перекладка текста — вариант А «живой штрих» (D-05, РЕШЕНО) (+1 more)

### Community 100 - "iOS client stack"
Cohesion: 0.25
Nodes (7): Custom pen renderer (Metal vs Core Animation TBD), End-to-end encryption, iOS client stack, SwiftUI (shell), UIKit + TextKit 2 (editor), libsodium, Operational Transformation (unsuitable)

### Community 101 - "Server stack"
Cohesion: 0.29
Nodes (7): Dexie (IndexedDB), Drizzle ORM, Fastify, MCP TypeScript SDK, OAuth 2.1, Radix + Tailwind + Motion, Server stack

### Community 102 - "0013-collaboration-sharing.md"
Cohesion: 0.38
Nodes (5): D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account, Universal Links (paid Apple Developer account), Последствия, Решение

### Community 103 - "Private notebooks: key from password, server stores only ciphertext, no agent access"
Cohesion: 0.29
Nodes (4): Notesnook (reference product: E2E encryption, reliable sync), Per-notebook key wrapped by user master key or server key, Private notebooks: key from password, server stores only ciphertext, no agent access, Agent capabilities: search/read Markdown, block-level edits, comments, links/tags/backlinks

### Community 105 - "D-28. Процесс разработки: облако + Mac, сборка iOS в CI"
Cohesion: 0.33
Nodes (6): Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), D-28. Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen (project.yml) - proposed, Контекст, Последствия, Решение

### Community 106 - "D-30. База данных сервера — PostgreSQL"
Cohesion: 0.33
Nodes (6): Обоснованы PostgreSQL (D-30) и Yjs (D-31) как отдельные решения, D-30. База данных сервера — PostgreSQL, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 107 - "0016-no-import-now.md"
Cohesion: 0.33
Nodes (5): Notesnook, D-16. Импорт — не сейчас, Import from Obsidian/Notesnook (later), Решение, No import for now (D-16)

### Community 108 - "0007-no-handwriting-recognition.md"
Cohesion: 0.33
Nodes (5): D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, Handwriting input types (text marks, margin notes, drawing block, drawing on images, Scribble), System Scribble only; no recognition of drawn ink (D-07)

### Community 109 - "Two-language policy (Swift + TypeScript)"
Cohesion: 0.40
Nodes (5): Node.js + TypeScript server, Swift 6, TypeScript, Shared Rust core (rejected), Shared test vectors (packages/test-vectors)

### Community 110 - "7. Шифрование и доступ агентов"
Cohesion: 0.33
Nodes (6): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 111 - "9. API и внешние ИИ-агенты"
Cohesion: 0.33
Nodes (6): 9. API и внешние ИИ-агенты, Агент умеет, Безопасность, Набросок инструментов MCP (ПРЕДЛОЖЕНО), Правки агента (D-10), Реализация

### Community 112 - "iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)"
Cohesion: 0.40
Nodes (4): apps/ios — iPhone + iPad, iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), iPhone and iPad share one codebase (universal app)

### Community 113 - "D-01. Хранение заметок — в базе данных на своём сервере, не в файлах"
Cohesion: 0.40
Nodes (5): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 114 - "4. Редактор"
Cohesion: 0.40
Nodes (5): 4. Редактор, Платформенная реализация, Прочее, Связи, Содержимое

### Community 115 - "10. Синхронизация и офлайн"
Cohesion: 0.50
Nodes (4): 10. Синхронизация и офлайн, Как это работает (обзор), Требования, Уплотнение истории — ОТКРЫТО до этапа 3 (R-05)

## Knowledge Gaps
- **52 isolated node(s):** `RFC-7591`, `RFC-9562`, `./tsconfig.json`, `../../tsconfig.base.json`, `Промпт извлечения .claude/skills/graphify/references/extraction-spec.md` (+47 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 502 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` connect `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` to `Процесс разработки (docs/development.md)`, `decisions/README.md`, `Datascratch — правила для ИИ (CLAUDE.md)`, `Скрипт обновления графа`, `Определение «готово» для любого изменения`, `D-21. Технологический стек`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `RFC-7591`, `RFC-9562`, `./tsconfig.json` to the rest of the system?**
  _52 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Shared test vectors (input -> expected output) run in Swift and TypeScript` be split into smaller, more focused modules?**
  _Cohesion score 0.13071895424836602 - nodes in this community are weakly interconnected._
- **Why does `Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов` connect `Скрипт обновления графа` to `D-29. Graphify: порядок работы, чтобы граф был всегда актуален`, `Процесс разработки (docs/development.md)`, `2026-10-25`, `Определение «готово» для любого изменения`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Should `Платформы и клиенты` be split into smaller, more focused modules?**
  _Cohesion score 0.11695906432748537 - nodes in this community are weakly interconnected._
- **Why does `yjs` connect `fixtures.ts` to `dependencies`, `context.ts`, `in-memory.ts`, `.block`, `world.ts`, `agents/package.json`, `handwriting-png.ts`, `agent-service.ts`, `model.ts`, `strokes.ts`, `edits.ts`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Should `Graphify` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._