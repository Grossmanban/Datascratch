# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 2 files · ~14,609 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 714 nodes · 1264 edges · 48 communities (47 shown, 1 thin omitted)
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 218 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Правила для ИИ и документации
- Монорепозиторий и CLAUDE.md
- 0005-living-stroke.md
- D-21: разделы
- Платформы и клиенты
- Хранение в БД и редактор
- План этапов и отложенное
- Дизайн и организация
- Процесс разработки и Graphify
- 10-sync.md
- Модель данных и глоссарий
- stack.md
- Компоненты стека
- 0009-notebook-mode-choice.md
- Скрипт обновления графа
- Код пишет Claude, документация
- Модель данных и глоссарий (2)
- 0026-file-storage.md
- Ядро, Yrs и шифрование
- 06-data-server.md
- Модель данных и глоссарий (3)
- Модель данных и глоссарий (4)
- Модель данных и глоссарий (5)
- open-questions.md
- 06-data-server.md (2)
- Платформы и клиенты (2)
- 09-agents-api.md
- CRDT и журнал изменений
- 0004-encryption-and-api.md
- iOS-стек и два языка
- 06-data-server.md (3)
- Технологический стек — РЕШЕНО (2026-10-25)
- Компоненты стека (2)
- open-questions.md (2)
- 06-data-server.md (4)
- Модель данных и глоссарий (6)
- Обзор архитектуры: разделы
- 0011-handwriting-for-agents.md
- iOS-стек и два языка (2)
- 7. Шифрование и доступ агентов
- 9. API и внешние ИИ-агенты
- 0005-living-stroke.md (2)
- 0005-living-stroke.md (3)
- open-questions.md (3)
- Модель данных и глоссарий (7)
- D-23. Документация — источник истины; Graphify — граф знаний поверх неё
- 06-data-server.md (5)
- Код пишет Claude, документация (2)

## God Nodes (most connected - your core abstractions)
1. `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` - 17 edges
2. `Stage 1: Pen-in-Text Prototype (iPad)` - 17 edges
3. `Процесс разработки (docs/development.md)` - 14 edges
4. `Datascratch — правила для ИИ (CLAUDE.md)` - 13 edges
5. `Stage 0: Preparation (done)` - 13 edges
6. `2026-10-25` - 13 edges
7. `Graphify` - 12 edges
8. `Yrs (Rust Yjs) with Swift Wrapper` - 12 edges
9. `PostgreSQL` - 11 edges
10. `MCP + REST API` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО` --semantically_similar_to--> `Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/README.md
- `Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md` --semantically_similar_to--> `Конец сессии: файл в docs/history + roadmap/open-questions`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/development.md
- `Определение «готово» для любого изменения` --semantically_similar_to--> `Как вносить изменения — всё в одном коммите`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/README.md
- `Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов` --references--> `finish()`  [EXTRACTED]
  docs/CHANGELOG.md → tools/graphify_docs.py
- `Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов` --references--> `label()`  [EXTRACTED]
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

## Communities (48 total, 1 thin omitted)

### Community 0 - "Правила для ИИ и документации"
Cohesion: 0.06
Nodes (42): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, Стартовый хук Claude Code (.claude/hooks/session-start.sh) (+34 more)

### Community 1 - "Монорепозиторий и CLAUDE.md"
Cohesion: 0.05
Nodes (31): apps/ios — iPhone + iPad, iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), apps/server — сервер, apps/web — веб-клиент, Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), Datascratch — правила для ИИ, graphify (+23 more)

### Community 2 - "0005-living-stroke.md"
Cohesion: 0.06
Nodes (31): D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, Obsidian (reference product: links, backlinks, tags, Markdown export), 3. Apple Pencil в тексте — ключевая фича, Handwriting input types (text marks, margin notes, drawing block, drawing on images, Scribble), Pencil gestures (zigzag delete, underline, strike, lasso), Prototype open questions (multi-word circles, deleted marked text R-04) (+23 more)

### Community 3 - "D-21: разделы"
Cohesion: 0.06
Nodes (36): 2026-10-25, Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Обоснованы PostgreSQL (D-30) и Yjs (D-31) как отдельные решения, Утверждён технологический стек (D-21), отказ от ядра на Rust (D-22), Прототип пера хранит текст в Yrs (D-27), Журнал изменений, D-21. Технологический стек (+28 more)

### Community 4 - "Платформы и клиенты"
Cohesion: 0.07
Nodes (24): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, D-03. Платформы: нативные iPhone и iPad + полноценный веб, Full-featured web client (TypeScript), Контекст, Последствия, Решение (+16 more)

### Community 5 - "Хранение в БД и редактор"
Cohesion: 0.08
Nodes (22): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты, Решение (+14 more)

### Community 6 - "План этапов и отложенное"
Cohesion: 0.08
Nodes (25): Notesnook, D-08. Аннотации PDF пером — не в MVP, PDF pen annotations (PDFKit + stroke layer), Решение (предложение), D-16. Импорт — не сейчас, Import from Obsidian/Notesnook (later), Решение, PDF Annotations Not in MVP (+17 more)

### Community 7 - "Дизайн и организация"
Cohesion: 0.09
Nodes (20): D-14. Организация: богатая, но не перегруженная, Spaces, nested folders, smart tags, colors, Решение, D-15. Дизайн — основная концепция продукта, Design references: Things 3, Linear, Craft, Arc, Последствия, Решение, Organization Structure (notebook vs space vs folder) (+12 more)

### Community 8 - "Процесс разработки и Graphify"
Cohesion: 0.08
Nodes (22): Monorepo Structure (apps/, packages/, infra/), Git, Graphify, Автоматизация, Две среды, Команды, Конец сессии, Кто что делает (+14 more)

### Community 9 - "10-sync.md"
Cohesion: 0.12
Nodes (16): D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение, Attachments as separate encrypted files, on-demand resumable download, Agent edits applied immediately, highlighted, revertible via history (D-10), 10. Синхронизация и офлайн (+8 more)

### Community 10 - "Модель данных и глоссарий"
Cohesion: 0.18
Nodes (17): agent_tokens / agent_audit_log Tables, Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, Handwriting-to-PNG Render (pg-boss queue), Key Store (agent notebooks), MCP + REST API (+9 more)

### Community 11 - "stack.md"
Cohesion: 0.16
Nodes (17): Server PostgreSQL Schema (Stage 3 Draft), Astro (landing page), Dexie (IndexedDB), docker compose Self-Hosting (server + PostgreSQL), Drizzle ORM, Fastify, GRDB (SQLite), TypeScript on Node.js (+9 more)

### Community 12 - "Компоненты стека"
Cohesion: 0.17
Nodes (15): Убран Redis (D-25): один процесс сервера, очередь — pg-boss на PostgreSQL, pg-boss job queue, D-25. Redis не используем, Edit broadcast interface (in-memory), PostgreSQL LISTEN/NOTIFY, Redis (rejected), Valkey (free Redis alternative), Будущее (+7 more)

### Community 13 - "0009-notebook-mode-choice.md"
Cohesion: 0.18
Nodes (10): D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, Space -> notebook -> folder relation (open; encryption mode per notebook, D-09), Argon2id password key derivation, libsodium on all platforms (swift-sodium, libsodium-wrappers), Per-notebook key wrapped by user master key or server key, Private notebooks: key from password, server stores only ciphertext, no agent access, Two notebook modes chosen at creation, switchable with client re-encryption (D-09) (+2 more)

### Community 14 - "Скрипт обновления графа"
Cohesion: 0.28
Nodes (7): Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 15 - "Код пишет Claude, документация"
Cohesion: 0.25
Nodes (3): docs/history session log, Журнал решений (ADR), Stage 0: Preparation (done)

### Community 16 - "Модель данных и глоссарий (2)"
Cohesion: 0.22
Nodes (11): Anchor (textRange / paragraph / drawingBlock / image), Note, Stroke, StrokePoint, Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3) (+3 more)

### Community 17 - "0026-file-storage.md"
Cohesion: 0.21
Nodes (12): MinIO (rejected), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Server disk folder storage (default), External S3-compatible storage (Hetzner, R2, B2), File storage interface (two implementations, chosen by config), Garage / SeaweedFS, MinIO (rejected) (+4 more)

### Community 18 - "Ядро, Yrs и шифрование"
Cohesion: 0.23
Nodes (12): Canvas + Pointer Events, TipTap editor, Vite + React + TypeScript PWA, Web client stack (PWA), Pen prototype (stage 1), Automerge (fallback CRDT), Encrypted history compaction by clients (R-05, stage 3), Last-write-wins (unsuitable) (+4 more)

### Community 19 - "06-data-server.md"
Cohesion: 0.20
Nodes (6): Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), App server: Node.js + TypeScript (Fastify), Metadata: title, tags, links, dates, space, folder, Real-time co-editing with cursors and presence (guests shown as 'Guest'), Real time when a note is open on two devices (WebSocket, in-process broadcast), Server resource budget: one VPS 2 cores, 2-4 GB; ~300-400 MB idle (D-12)

### Community 20 - "Модель данных и глоссарий (3)"
Cohesion: 0.21
Nodes (11): Organization Hierarchy (Account > Space > Notebook > Folder > Note), Custom iOS Pen Render Layer (Metal or Core Animation), TextKit 2 (UIKit editor), ADR (Architecture Decision Record), PencilKit / PKCanvasView, Predicted / Coalesced Touches, ProMotion (120 Hz), Smart Tag (+3 more)

### Community 21 - "Модель данных и глоссарий (4)"
Cohesion: 0.24
Nodes (10): doc_updates Table (encrypted Yjs updates), Private Notebook Edit Flow, packages/test-vectors, libsodium (swift-sodium), End-to-End Encryption (E2E), Private Notebook, Test Vectors, Update (Yjs binary edit record) (+2 more)

### Community 22 - "Модель данных и глоссарий (5)"
Cohesion: 0.22
Nodes (10): Guest via Link (web, no account), Canvas + Pointer Events Pen Layer, Universal Links, Apple Developer Account, Guest Pen Drawing and Link Lifetime, R-04 Strokes on Deleted or Changed Text, R-07 Web Pen Worse than Native, R-12 No Paid Apple Account (7-day installs) (+2 more)

### Community 23 - "open-questions.md"
Cohesion: 0.33
Nodes (9): GitHub Actions CI (incl. macOS iOS builds), XcodeGen, Mixed cloud + Mac development mode, Living Stroke, Reflow, Minimum iOS/iPadOS Version, Stroke on Deleted Text, Stage 1: Pen-in-Text Prototype (iPad) (+1 more)

### Community 24 - "06-data-server.md (2)"
Cohesion: 0.25
Nodes (7): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, Monetization options: subscription, one-time, open source + paid hosting, Monetization, Audience: the author first, maybe a narrow circle later (D-12)

### Community 25 - "Платформы и клиенты (2)"
Cohesion: 0.18
Nodes (8): D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, 1. Концепция продукта, Notesnook (reference product: E2E encryption, reliable sync), Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения, Суть в одном абзаце

### Community 26 - "09-agents-api.md"
Cohesion: 0.25
Nodes (9): pg-boss background job queue on PostgreSQL, PostgreSQL via Drizzle (D-30): accounts, notebooks, rights, tokens, encrypted updates, snapshots, agent log, Local MCP bridge (future): local utility holding key for agent access to private notebooks, Log of all agent actions, MCP tools sketch (list_spaces, list_notebooks, search_notes, read_note, get_handwriting_image, create_note, edit_note, add_comment, get_backlinks), Request rate limits, Remote MCP server (Streamable HTTP, OAuth 2.1), REST API (+1 more)

### Community 27 - "CRDT и журнал изменений"
Cohesion: 0.27
Nodes (9): Web PWA Client (React, TipTap, Yjs, IndexedDB), Automerge (fallback CRDT), TipTap (ProseMirror), Vite + React + TypeScript PWA, Yjs, Yrs (Rust Yjs) with Swift Wrapper, CRDT, PWA (+1 more)

### Community 28 - "0004-encryption-and-api.md"
Cohesion: 0.29
Nodes (6): D-04. Одновременно сквозное шифрование и доступ по API, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), Контекст, Последствия, Решение

### Community 29 - "iOS-стек и два языка"
Cohesion: 0.20
Nodes (9): Custom pen renderer (Metal vs Core Animation TBD), End-to-end encryption, GRDB (SQLite), iOS client stack, SwiftUI (shell), UIKit + TextKit 2 (editor), libsodium, SQLite on server (rejected) (+1 more)

### Community 30 - "06-data-server.md (3)"
Cohesion: 0.20
Nodes (9): Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps, Daily off-VPS backups of DB and files with verified restore (R-11), 11. Нефункциональные требования, Performance targets (PencilKit latency, 120 fps, 300 ms open, 1-min first sync, 2 s delivery, 1 s cold start), Reliability: no edit lost on network drop, crash or low storage, Доступность, Надёжность, Ресурсы сервера (+1 more)

### Community 31 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 32 - "Компоненты стека (2)"
Cohesion: 0.29
Nodes (7): Dexie (IndexedDB), Drizzle ORM, Fastify, MCP TypeScript SDK, OAuth 2.1, Radix + Tailwind + Motion, Server stack

### Community 33 - "open-questions.md (2)"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 34 - "06-data-server.md (4)"
Cohesion: 0.29
Nodes (7): 6. Модель данных и сервер, Self-hosting, Модель данных (общий обзор; детали — `architecture/data-model.md`), Резервные копии, Сервер, docker-compose.yml: server + PostgreSQL containers, file volume or external S3, infra — self-hosting

### Community 35 - "Модель данных и глоссарий (6)"
Cohesion: 0.33
Nodes (6): File Storage (disk or external S3), iOS / iPadOS Client (Swift, TextKit 2, Yrs, GRDB), Sync / Realtime Service, VPS Hosting (Hetzner or similar), R-11 Single VPS Is a Single Point of Failure, Stage 3: Server, Sync, Encryption

### Community 36 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 37 - "0011-handwriting-for-agents.md"
Cohesion: 0.29
Nodes (6): D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Handwriting Format for Agents (PNG), Export: Markdown, PDF, HTML (handwriting as images), Server responsibilities: accounts, encrypted relay, attachments, realtime, API/MCP, handwriting PNG render, Handwriting rendered to PNG for agents with text annotation (D-11)

### Community 38 - "iOS-стек и два языка (2)"
Cohesion: 0.40
Nodes (5): Node.js + TypeScript server, Swift 6, TypeScript, Shared Rust core (rejected), Shared test vectors (packages/test-vectors)

### Community 39 - "7. Шифрование и доступ агентов"
Cohesion: 0.33
Nodes (6): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 40 - "9. API и внешние ИИ-агенты"
Cohesion: 0.33
Nodes (6): 9. API и внешние ИИ-агенты, Агент умеет, Безопасность, Набросок инструментов MCP (ПРЕДЛОЖЕНО), Правки агента (D-10), Реализация

### Community 42 - "0005-living-stroke.md (3)"
Cohesion: 0.40
Nodes (5): D-05. Перо при перекладке текста — вариант А «живой штрих», Гипотеза реализации, Контекст, Последствия, Решение

### Community 43 - "open-questions.md (3)"
Cohesion: 0.40
Nodes (5): docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, iOS build and tests on macOS CI runner per push

### Community 44 - "Модель данных и глоссарий (7)"
Cohesion: 0.83
Nodes (4): doc_snapshots Table (compacted snapshots, version history), Snapshot, Yjs History Compaction under Encryption, R-05 Edit History Growth

### Community 45 - "D-23. Документация — источник истины; Graphify — граф знаний поверх неё"
Cohesion: 0.50
Nodes (4): D-23. Документация — источник истины; Graphify — граф знаний поверх неё, Контекст, Последствия, Решение

### Community 46 - "06-data-server.md (5)"
Cohesion: 0.67
Nodes (3): D-18. Монетизация — не решена; архитектура готова к self-hosting, Контекст, Решение (на сейчас)

### Community 47 - "Код пишет Claude, документация (2)"
Cohesion: 0.67
Nodes (3): D-19. Весь код пишет Claude, Последствия, Решение

## Knowledge Gaps
- **48 isolated node(s):** `Доступ внешних ИИ-агентов через MCP/REST`, `Apple Pencil в тексте — ключевая фича и главный риск`, `R-09 (риск: Graphify сломается или исчезнет)`, `Промпт извлечения .claude/skills/graphify/references/extraction-spec.md`, `Russian and English UI, no RTL` (+43 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 242 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` connect `Правила для ИИ и документации` to `Скрипт обновления графа`, `Код пишет Claude, документация`?**
  _High betweenness centrality (0.153) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `Stage 1: Pen-in-Text Prototype (iPad)` (e.g. with `Predicted / Coalesced Touches` and `Living Stroke`) actually correct?**
  _`Stage 1: Pen-in-Text Prototype (iPad)` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Доступ внешних ИИ-агентов через MCP/REST`, `Apple Pencil в тексте — ключевая фича и главный риск`, `R-09 (риск: Graphify сломается или исчезнет)` to the rest of the system?**
  _48 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Правила для ИИ и документации` be split into smaller, more focused modules?**
  _Cohesion score 0.06103896103896104 - nodes in this community are weakly interconnected._
- **Why does `Stage 0: Preparation (done)` connect `Код пишет Claude, документация` to `План этапов и отложенное`, `Процесс разработки и Graphify`, `stack.md`, `Компоненты стека`, `0026-file-storage.md`, `Ядро, Yrs и шифрование`, `open-questions.md`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Should `Монорепозиторий и CLAUDE.md` be split into smaller, more focused modules?**
  _Cohesion score 0.054878048780487805 - nodes in this community are weakly interconnected._
- **Why does `Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов` connect `Скрипт обновления графа` to `Правила для ИИ и документации`, `D-21: разделы`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._