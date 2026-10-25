# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 141 files · ~48,426 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 4, .xcconfig 3, .example 1)

## Summary
- 1700 nodes · 3580 edges · 113 communities (101 shown, 12 thin omitted)
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 545 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `165ec788`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Datascratch — правила для ИИ (CLAUDE.md)
- iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)
- 03-pencil.md
- D-30. База данных сервера — PostgreSQL
- 02-platforms.md
- Хранение в БД и редактор
- roadmap.md
- 05-organization-design.md
- Graphify
- 10-sync.md
- Модель данных и глоссарий
- Yrs (Rust Yjs) with Swift Wrapper
- stack.md
- 0009-notebook-mode-choice.md
- Скрипт обновления графа
- 0031-crdt-yjs.md
- data-model.md
- steps
- 0005-living-stroke.md
- TaskEntry
- properties
- base
- Модель данных и глоссарий (5)
- open-questions.md
- 06-data-server.md (2)
- 01-concept.md
- 09-agents-api.md
- DatascratchTests
- 0004-encryption-and-api.md
- iOS client stack
- TaskEntry
- Технологический стек — РЕШЕНО (2026-10-25)
- 0025-no-redis.md
- Datascratch
- 06-data-server.md
- risks.md
- Обзор архитектуры: разделы
- 0001-storage-in-database.md
- Datascratch
- LibraryStore
- SceneSheet
- 0003-platforms.md
- project.yml
- options
- SceneSheet
- .destination
- View
- .body
- Foundation
- LibraryUITests
- Backdrop
- 0014-organization.md
- 5. Организация заметок и дизайн
- D-03. Платформы: нативные iPhone и iPad + полноценный веб
- 2. Платформы
- NoteMeta
- SyncCenter
- ci-destination.sh
- generate.sh
- BlockRow
- Sendable
- LocalAccountService
- AppSettings
- .body
- SceneModel
- AppModel
- .dismiss
- .createNote
- AgentPermission
- DocumentStyleSheet
- SharedLink
- .selection
- .success
- .make
- Определение «готово» для любого изменения
- .content
- String
- RecoveryKey
- 2026-10-25
- ModelTests
- 04-editor.md
- SecureStore
- .body
- Kind
- AppRoute
- План разработки
- D-21. Технологический стек
- Tint
- D-29. Graphify: порядок работы, чтобы граф был всегда актуален
- 0026-file-storage.md
- Server stack
- 3. Apple Pencil в тексте — ключевая фича
- Открытые вопросы
- Соглашения
- NoteWindow
- Step
- Theme
- glossary.md
- make_placeholder_icon.py
- Theme.swift
- 0010-agent-edits.md
- Font
- 7. Шифрование и доступ агентов
- 9. API и внешние ИИ-агенты
- Infrastructure stack
- AppCommands
- .init
- D-23. Документация — источник истины; Graphify — граф знаний поверх неё
- D-15. Дизайн — основная концепция продукта

## God Nodes (most connected - your core abstractions)
1. `LibraryStore` - 91 edges
2. `LibrarySnapshot` - 49 edges
3. `AppModel` - 48 edges
4. `NoteMeta` - 40 edges
5. `Tint` - 35 edges
6. `NoteBody` - 29 edges
7. `SceneModel` - 28 edges
8. `Backdrop` - 25 edges
9. `base` - 24 edges
10. `SceneSheet` - 22 edges

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

## Communities (113 total, 12 thin omitted)

### Community 0 - "Datascratch — правила для ИИ (CLAUDE.md)"
Cohesion: 0.21
Nodes (9): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, D-28 (облако + Mac, CI), GitHub Actions на macOS — проверка сборки iOS, Две среды: облачная сессия Claude Code (Linux) и Mac пользователя (+1 more)

### Community 1 - "iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)"
Cohesion: 0.10
Nodes (18): apps/ios — iPhone + iPad, iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), apps/server — сервер, Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), apps/web — веб-клиент, Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), iPhone and iPad share one codebase (universal app) (+10 more)

### Community 2 - "03-pencil.md"
Cohesion: 0.14
Nodes (12): D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, Handwriting input types (text marks, margin notes, drawing block, drawing on images, Scribble), Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps, Pencil gestures (zigzag delete, underline, strike, lasso), Prototype open questions (multi-word circles, deleted marked text R-04), Stroke point anchoring: character anchor + dx/dy in font-size units (+4 more)

### Community 3 - "D-30. База данных сервера — PostgreSQL"
Cohesion: 0.11
Nodes (19): 2026-10-25, Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Обоснованы PostgreSQL (D-30) и Yjs (D-31) как отдельные решения, Прототип пера хранит текст в Yrs (D-27), Журнал изменений, D-27. В прототипе пера текст хранится в Yrs, Контекст, Последствия (+11 more)

### Community 4 - "02-platforms.md"
Cohesion: 0.15
Nodes (12): D-06. Рисование пальцем на iPhone — да, опционально, Finger drawing toggle on iPhone, Решение, D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, UI languages Russian and English, no RTL (D-17), iPad client (primary, Pencil / Pencil Pro, hover, Stage Manager) (+4 more)

### Community 5 - "Хранение в БД и редактор"
Cohesion: 0.16
Nodes (12): D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account, Universal Links (paid Apple Developer account), Последствия, Решение, 8. Совместная работа и шеринг, Guest editing without account in any browser, Share links with view/edit rights, expiry and revocation (+4 more)

### Community 6 - "roadmap.md"
Cohesion: 0.16
Nodes (11): D-08. Аннотации PDF пером — не в MVP, PDF pen annotations (PDFKit + stroke layer), Решение (предложение), D-16. Импорт — не сейчас, Решение, PDF Annotations Not in MVP, R-08 Huge Project Scope, Stage 2: Local MVP on iPad and iPhone (+3 more)

### Community 7 - "05-organization-design.md"
Cohesion: 0.23
Nodes (8): Design references: Things 3, Linear, Craft, Arc, Light/dark theme, Dynamic Type, VoiceOver, full iPad keyboard, Feel references: Things 3, Linear, Craft, Arc, Own design system unified on iOS and web, Design tokens as single source for both platforms (format at stage 2), Nested folders without depth limit, Top-level spaces (Personal, Work, Study), Accessibility: Dynamic Type, VoiceOver, light/dark, iPad keyboard

### Community 8 - "Graphify"
Cohesion: 0.10
Nodes (17): Monorepo Structure (apps/, packages/, infra/), packages/test-vectors, libsodium (swift-sodium), Git, Graphify, Автоматизация, Две среды, Команды (+9 more)

### Community 9 - "10-sync.md"
Cohesion: 0.17
Nodes (12): Attachments as separate encrypted files, on-demand resumable download, Agent edits applied immediately, highlighted, revertible via history (D-10), 10. Синхронизация и офлайн, Chunked resumable attachments; thumbnails-only on iPhone, Local storage: SQLite via GRDB (iOS), IndexedDB via Dexie (web), Agent notebooks: server decrypts and applies agent edit as a normal update, Trash for 30 days, Version history: snapshots, view, rollback (+4 more)

### Community 10 - "Модель данных и глоссарий"
Cohesion: 0.13
Nodes (26): agent_tokens / agent_audit_log Tables, Server PostgreSQL Schema (Stage 3 Draft), Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, File Storage (disk or external S3), Guest via Link (web, no account) (+18 more)

### Community 11 - "Yrs (Rust Yjs) with Swift Wrapper"
Cohesion: 0.18
Nodes (13): iOS / iPadOS Client (Swift, TextKit 2, Yrs, GRDB), Web PWA Client (React, TipTap, Yjs, IndexedDB), Automerge (fallback CRDT), Dexie (IndexedDB), GRDB (SQLite), TextKit 2 (UIKit editor), TipTap (ProseMirror), Vite + React + TypeScript PWA (+5 more)

### Community 12 - "stack.md"
Cohesion: 0.22
Nodes (11): Astro (landing page), Drizzle ORM, Fastify, TypeScript on Node.js, pnpm + Turborepo Monorepo, Scaling via PostgreSQL LISTEN/NOTIFY, Radix + Tailwind + Motion Design System, Redis (rejected) (+3 more)

### Community 13 - "0009-notebook-mode-choice.md"
Cohesion: 0.16
Nodes (12): D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, Notesnook (reference product: E2E encryption, reliable sync), Space -> notebook -> folder relation (open; encryption mode per notebook, D-09), Argon2id password key derivation, libsodium on all platforms (swift-sodium, libsodium-wrappers), Local MCP bridge (future): local utility holding key for agent access to private notebooks, Per-notebook key wrapped by user master key or server key (+4 more)

### Community 14 - "Скрипт обновления графа"
Cohesion: 0.21
Nodes (9): literals(), main(), Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, finish(), label(), _line_count(), prepare(), _read() (+1 more)

### Community 15 - "0031-crdt-yjs.md"
Cohesion: 0.12
Nodes (17): D-19. Весь код пишет Claude, Последствия, Решение, End-to-end encryption, libsodium, docs/history session log, Pen prototype (stage 1), Automerge (fallback CRDT) (+9 more)

### Community 16 - "data-model.md"
Cohesion: 0.22
Nodes (11): Anchor (textRange / paragraph / drawingBlock / image), Note, Stroke, StrokePoint, Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3) (+3 more)

### Community 17 - "steps"
Cohesion: 0.06
Nodes (33): defaults, name, runs-on, steps, strategy, timeout-minutes, concurrency, cancel-in-progress (+25 more)

### Community 18 - "0005-living-stroke.md"
Cohesion: 0.24
Nodes (6): D-05. Перо при перекладке текста — вариант А «живой штрих», PencilKit (rejected), Гипотеза реализации, Контекст, Последствия, Решение

### Community 19 - "TaskEntry"
Cohesion: 0.07
Nodes (31): TaskDateField, deadline, scheduled, CalendarView, .body, DailyNoteCard, .body, DayCell (+23 more)

### Community 20 - "properties"
Cohesion: 0.10
Nodes (21): CFBundleURLName, CFBundleURLSchemes, properties, CFBundleDevelopmentRegion, CFBundleDisplayName, CFBundleLocalizations, CFBundleShortVersionString, CFBundleURLTypes (+13 more)

### Community 21 - "base"
Cohesion: 0.10
Nodes (21): ASSETCATALOG_COMPILER_APPICON_NAME, ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME, BUNDLE_LOADER, CODE_SIGN_STYLE, ENABLE_PREVIEWS, ENABLE_USER_SCRIPT_SANDBOXING, GENERATE_INFOPLIST_FILE, LOCALIZATION_PREFERS_STRING_CATALOGS (+13 more)

### Community 22 - "Модель данных и глоссарий (5)"
Cohesion: 0.29
Nodes (8): Custom iOS Pen Render Layer (Metal or Core Animation), Canvas + Pointer Events Pen Layer, PencilKit / PKCanvasView, Universal Links, Apple Developer Account, R-07 Web Pen Worse than Native, R-12 No Paid Apple Account (7-day installs), Stage 4: Web Client

### Community 23 - "open-questions.md"
Cohesion: 0.11
Nodes (24): GitHub Actions CI (incl. macOS iOS builds), XcodeGen, Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст, Решение (+16 more)

### Community 24 - "06-data-server.md (2)"
Cohesion: 0.21
Nodes (9): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, Контекст, Решение (на сейчас) (+1 more)

### Community 25 - "01-concept.md"
Cohesion: 0.22
Nodes (7): D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, 1. Концепция продукта, Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения, Суть в одном абзаце

### Community 26 - "09-agents-api.md"
Cohesion: 0.20
Nodes (10): D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Handwriting Format for Agents (PNG), Export: Markdown, PDF, HTML (handwriting as images), Server responsibilities: accounts, encrypted relay, attachments, realtime, API/MCP, handwriting PNG render, Handwriting rendered to PNG for agents with text annotation (D-11), MCP tools sketch (list_spaces, list_notebooks, search_notes, read_note, get_handwriting_image, create_note, edit_note, add_comment, get_backlinks), Request rate limits (+2 more)

### Community 27 - "DatascratchTests"
Cohesion: 0.14
Nodes (15): targets, build, dependencies, platform, settings, sources, type, dependencies (+7 more)

### Community 28 - "0004-encryption-and-api.md"
Cohesion: 0.23
Nodes (8): D-04. Одновременно сквозное шифрование и доступ по API, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), Notesnook, Контекст, Последствия, Решение, Import from Obsidian/Notesnook (later)

### Community 29 - "iOS client stack"
Cohesion: 0.18
Nodes (11): Custom pen renderer (Metal vs Core Animation TBD), GRDB (SQLite), iOS client stack, Node.js + TypeScript server, Swift 6, SwiftUI (shell), TypeScript, UIKit + TextKit 2 (editor) (+3 more)

### Community 30 - "TaskEntry"
Cohesion: 0.12
Nodes (13): Bucket, all, .id, inbox, today, upcoming, .taskEntries, TaskEntry (+5 more)

### Community 31 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 32 - "0025-no-redis.md"
Cohesion: 0.13
Nodes (19): Убран Redis (D-25): один процесс сервера, очередь — pg-boss на PostgreSQL, pg-boss job queue, D-25. Redis не используем, Edit broadcast interface (in-memory), PostgreSQL LISTEN/NOTIFY, Redis (rejected), Valkey (free Redis alternative), Будущее (+11 more)

### Community 33 - "Datascratch"
Cohesion: 0.17
Nodes (12): config, archive, run, test, config, schemes, Datascratch, name (+4 more)

### Community 34 - "06-data-server.md"
Cohesion: 0.10
Nodes (18): 6. Модель данных и сервер, Daily off-VPS backups of DB and files with verified restore (R-11), Metadata: title, tags, links, dates, space, folder, Self-hosting, Модель данных (общий обзор; детали — `architecture/data-model.md`), Резервные копии, Сервер, Real-time co-editing with cursors and presence (guests shown as 'Guest') (+10 more)

### Community 35 - "risks.md"
Cohesion: 0.15
Nodes (14): doc_snapshots Table (compacted snapshots, version history), doc_updates Table (encrypted Yjs updates), VPS Hosting (Hetzner or similar), End-to-End Encryption (E2E), Snapshot, Update (Yjs binary edit record), Recovery Key for Forgotten Password, Yjs History Compaction under Encryption (+6 more)

### Community 36 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 37 - "0001-storage-in-database.md"
Cohesion: 0.16
Nodes (10): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты, Решение (+2 more)

### Community 38 - "Datascratch"
Cohesion: 0.15
Nodes (13): entitlements, info, platform, settings, sources, type, path, properties (+5 more)

### Community 39 - "LibraryStore"
Cohesion: 0.10
Nodes (10): LibraryPersistence, LibrarySnapshot, LibraryStore, .activeSpace, .dailyNotebook, .openTabs, .spaces, .starredNotes (+2 more)

### Community 40 - "SceneSheet"
Cohesion: 0.12
Nodes (18): SidebarItem, allDocuments, calendar, folder, notebook, starred, tag, tasks (+10 more)

### Community 41 - "0003-platforms.md"
Cohesion: 0.27
Nodes (4): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, Full-featured web client (TypeScript)

### Community 42 - "project.yml"
Cohesion: 0.20
Nodes (9): configFiles, Debug, Release, include, path, relativePaths, name, settings (+1 more)

### Community 43 - "options"
Cohesion: 0.25
Nodes (8): iOS, options, bundleIdPrefix, createIntermediateGroups, deploymentTarget, developmentLanguage, groupSortPosition, xcodeVersion

### Community 44 - "SceneSheet"
Cohesion: 0.12
Nodes (16): SceneSheet, documentStyle, editFolder, editNotebook, editSpace, .id, move, newFolder (+8 more)

### Community 45 - ".destination"
Cohesion: 0.22
Nodes (8): FolderEditor, .body, ModeOption, .body, MoveNoteSheet, .body, NotebookEditor, .body

### Community 46 - "View"
Cohesion: 0.14
Nodes (27): View, AuthCard, .body, CheckboxToggleStyle, ConfirmRecoveryKeyView, .body, ErrorText, .body (+19 more)

### Community 47 - ".body"
Cohesion: 0.15
Nodes (10): .body, TrashView, .body, ContentColumn, .body, EmptyDetailView, .body, MainSplitView (+2 more)

### Community 48 - "Foundation"
Cohesion: 0.18
Nodes (8): AccountServiceTests, Datascratch, Foundation, Network, Observation, Security, SwiftUI, Testing

### Community 49 - "LibraryUITests"
Cohesion: 0.17
Nodes (3): LibraryUITests, OnboardingUITests, XCTest

### Community 50 - "Backdrop"
Cohesion: 0.15
Nodes (12): .colors, .gradient, .localizedName, CoverView, .body, Backdrop, dusk, ember (+4 more)

### Community 51 - "0014-organization.md"
Cohesion: 0.40
Nodes (4): D-14. Организация: богатая, но не перегруженная, Spaces, nested folders, smart tags, colors, Решение, Organization Structure (notebook vs space vs folder)

### Community 52 - "5. Организация заметок и дизайн"
Cohesion: 0.40
Nodes (5): 5. Организация заметок и дизайн, Дизайн (D-15 — РЕШЕНО, главный принцип продукта), Организация (D-14 — РЕШЕНО по сути; структура ниже — ПРЕДЛОЖЕНО), Принципы, Реализация

### Community 53 - "D-03. Платформы: нативные iPhone и iPad + полноценный веб"
Cohesion: 0.50
Nodes (4): D-03. Платформы: нативные iPhone и iPad + полноценный веб, Контекст, Последствия, Решение

### Community 54 - "2. Платформы"
Cohesion: 0.50
Nodes (4): 2. Платформы, Минимальная версия iOS/iPadOS — ОТКРЫТО, Тестовые устройства (известно на 2026-10-25), Требования

### Community 55 - "NoteMeta"
Cohesion: 0.17
Nodes (5): DocumentActions, DocumentCard, .body, DocumentRow, .body

### Community 56 - "SyncCenter"
Cohesion: 0.07
Nodes (20): Phase, onboarding, ready, AccountError, accountExists, .errorDescription, invalidEmail, invalidRecoveryKey (+12 more)

### Community 59 - "BlockRow"
Cohesion: 0.14
Nodes (13): BlockRow, .body, .bodyFont, .font, .leading, .placeholder, .textColor, .topPadding (+5 more)

### Community 60 - "Sendable"
Cohesion: 0.15
Nodes (24): Folder, NoteBlock, .plainText, Notebook, NotebookMode, agent, `private`, NoteKind (+16 more)

### Community 61 - "LocalAccountService"
Cohesion: 0.20
Nodes (6): Account, AccountService, LocalAccountService, .isServerBacked, Record, CryptoKit

### Community 62 - "AppSettings"
Cohesion: 0.09
Nodes (21): Appearance, dark, .id, light, system, AppSettings, .appearance, .colorScheme (+13 more)

### Community 63 - ".body"
Cohesion: 0.12
Nodes (17): AboutView, .body, AccountSettings, .body, AppearanceSettings, .body, ChangePasswordView, .body (+9 more)

### Community 64 - "SceneModel"
Cohesion: 0.09
Nodes (12): FocusedValues, SceneModel, .library, .newNoteDestination, .sidebar, DocumentCollectionView, .canCreate, .emptyState (+4 more)

### Community 65 - "AppModel"
Cohesion: 0.14
Nodes (10): AppModel, .phase, .body, .body, PaperPattern, .body, AgentTokensSettings, .body (+2 more)

### Community 66 - ".dismiss"
Cohesion: 0.17
Nodes (12): CommandPaletteView, .body, .commands, .documents, .ranked, FuzzyMatch, Kind, command (+4 more)

### Community 67 - ".createNote"
Cohesion: 0.23
Nodes (3): .filtered, .documents, LibraryStoreTests

### Community 68 - "AgentPermission"
Cohesion: 0.23
Nodes (7): AccessService, AgentPermission, read, readWrite, AgentToken, Device, LocalAccessService

### Community 69 - "DocumentStyleSheet"
Cohesion: 0.36
Nodes (6): DocumentStyleSheet, .body, EmojiField, .body, GradientChooser, .body

### Community 70 - "SharedLink"
Cohesion: 0.18
Nodes (11): Base64URL, Kind, note, notebook, LocalSharingService, SharedLink, SharePermission, edit (+3 more)

### Community 71 - ".selection"
Cohesion: 0.20
Nodes (7): Haptics, SpaceEditor, .body, SymbolPicker, .body, TintPicker, .body

### Community 72 - ".success"
Cohesion: 0.12
Nodes (12): VersionHistoryView, .body, SharedLinkView, .body, .webURL, ShareLinkButton, .body, ShareLinkRow (+4 more)

### Community 73 - ".make"
Cohesion: 0.15
Nodes (5): .linkedTitles, .tags, TextScanner, UUIDv7, ModelTests

### Community 74 - "Определение «готово» для любого изменения"
Cohesion: 0.15
Nodes (16): Стартовый хук Claude Code (.claude/hooks/session-start.sh), D-23 (документация), git-хук Graphify (пересборка только по изменённому коду), Скрипт tools/graphify_docs.py (prepare → агенты → finish), Graphify 0.9.95 (пакет graphifyy), Смысловой слой графа (понятия, решения, связи — проход ИИ), Структурный слой графа (код, файлы, заголовки — без ИИ), Автоматизация: стартовый хук, git-хук, graphify update после git pull (+8 more)

### Community 75 - ".content"
Cohesion: 0.16
Nodes (8): BacklinksSection, .body, DocumentBackground, DocumentScreen, .body, .library, NoteMeta, .isTrashed

### Community 77 - "RecoveryKey"
Cohesion: 0.21
Nodes (5): RecoveryKey, .base32, .formatted, .groups, RecoveryKeyTests

### Community 78 - "2026-10-25"
Cohesion: 0.22
Nodes (8): Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой, Правила, Среда разработки, Создан CLAUDE.md и скелет монорепозитория (apps/, packages/, infra/)

### Community 80 - "04-editor.md"
Cohesion: 0.15
Nodes (12): Obsidian (reference product: links, backlinks, tags, Markdown export), 4. Редактор, Backlinks, iOS editor: UIKit + TextKit 2, Link graph view (not in MVP, stage 6), Web editor: TipTap (ProseMirror) + Yjs, [[ ]] links with autocomplete, Платформенная реализация (+4 more)

### Community 82 - ".body"
Cohesion: 0.24
Nodes (8): NoteTitleLabel, .body, SidebarFooter, SidebarView, .body, .library, SpaceSwitcher, .body

### Community 83 - "Kind"
Cohesion: 0.17
Nodes (12): Kind, bullet, divider, folder, heading1, heading2, heading3, note (+4 more)

### Community 84 - "AppRoute"
Cohesion: 0.23
Nodes (5): AppRoute, note, share, today, RoutingTests

### Community 85 - "План разработки"
Cohesion: 0.17
Nodes (12): Критерии приёмки, План разработки, Подготовка, Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad), Этап 2 — MVP на iPad и iPhone, локально (+4 more)

### Community 86 - "D-21. Технологический стек"
Cohesion: 0.18
Nodes (11): Утверждён технологический стек (D-21), отказ от ядра на Rust (D-22), D-21. Технологический стек, Контекст, Последствия, Рассмотренные варианты (по обсуждению 2026-10-25), Решение, D-22. Без собственного общего ядра на Rust, Контекст (+3 more)

### Community 87 - "Tint"
Cohesion: 0.13
Nodes (14): .background, .foreground, .localizedName, Tint, blue, gray, green, indigo (+6 more)

### Community 88 - "D-29. Graphify: порядок работы, чтобы граф был всегда актуален"
Cohesion: 0.15
Nodes (12): Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел), D-29. Graphify: порядок работы, чтобы граф был всегда актуален, R-09 (риск: Graphify сломается или исчезнет), Контекст, Последствия, Решение (+4 more)

### Community 89 - "0026-file-storage.md"
Cohesion: 0.21
Nodes (12): MinIO (rejected), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Server disk folder storage (default), External S3-compatible storage (Hetzner, R2, B2), File storage interface (two implementations, chosen by config), Garage / SeaweedFS, MinIO (rejected) (+4 more)

### Community 90 - "Server stack"
Cohesion: 0.20
Nodes (11): Canvas + Pointer Events, Dexie (IndexedDB), Drizzle ORM, Fastify, MCP TypeScript SDK, OAuth 2.1, Radix + Tailwind + Motion, Server stack (+3 more)

### Community 91 - "3. Apple Pencil в тексте — ключевая фича"
Cohesion: 0.22
Nodes (9): 3. Apple Pencil в тексте — ключевая фича, Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера, Перекладка текста — вариант А «живой штрих» (D-05, РЕШЕНО) (+1 more)

### Community 92 - "Открытые вопросы"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 93 - "Соглашения"
Cohesion: 0.15
Nodes (13): Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Нумерация решений D-NN и файлы decisions/00NN-*.md, Документация Datascratch (docs/README.md), Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Оглавление docs/ (spec, architecture, decisions, roadmap, risks…), Документация Datascratch, История, Как вносить изменения (+5 more)

### Community 94 - "NoteWindow"
Cohesion: 0.24
Nodes (7): DatascratchApp, .body, MainWindow, NoteWindow, .body, RootView, .body

### Community 95 - "Step"
Cohesion: 0.33
Nodes (6): Step, confirmKey, recover, recoveryKey, signIn, signUp

### Community 96 - "Theme"
Cohesion: 0.28
Nodes (6): Motion, Palette, Radius, Space, Theme, Typography

### Community 97 - "glossary.md"
Cohesion: 0.28
Nodes (7): Organization Hierarchy (Account > Space > Notebook > Folder > Note), ADR (Architecture Decision Record), Predicted / Coalesced Touches, Private Notebook, Smart Tag, Space, Глоссарий

### Community 99 - "Theme.swift"
Cohesion: 0.38
Nodes (3): Color, UIColor, UIKit

### Community 100 - "0010-agent-edits.md"
Cohesion: 0.33
Nodes (5): D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение

### Community 101 - "Font"
Cohesion: 0.33
Nodes (6): NoteStyle.Font, .design, Font, mono, sans, serif

### Community 102 - "7. Шифрование и доступ агентов"
Cohesion: 0.33
Nodes (6): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 103 - "9. API и внешние ИИ-агенты"
Cohesion: 0.33
Nodes (6): 9. API и внешние ИИ-агенты, Агент умеет, Безопасность, Набросок инструментов MCP (ПРЕДЛОЖЕНО), Правки агента (D-10), Реализация

### Community 104 - "Infrastructure stack"
Cohesion: 0.40
Nodes (5): docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, iOS build and tests on macOS CI runner per push

### Community 107 - "D-23. Документация — источник истины; Graphify — граф знаний поверх неё"
Cohesion: 0.50
Nodes (4): D-23. Документация — источник истины; Graphify — граф знаний поверх неё, Контекст, Последствия, Решение

### Community 108 - "D-15. Дизайн — основная концепция продукта"
Cohesion: 0.67
Nodes (3): D-15. Дизайн — основная концепция продукта, Последствия, Решение

## Knowledge Gaps
- **221 isolated node(s):** `.library`, `.bodyFont`, `.textColor`, `.topPadding`, `.placeholder` (+216 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 585 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `View` connect `View` to `SceneModel`, `AppModel`, `.dismiss`, `DocumentStyleSheet`, `.selection`, `.success`, `SceneSheet`, `.content`, `SceneSheet`, `.destination`, `.body`, `Backdrop`, `TaskEntry`, `.body`, `NoteMeta`, `BlockRow`, `NoteWindow`, `.body`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `LibraryStore` (e.g. with `.header()` and `.persistsAndReloads()`) actually correct?**
  _`LibraryStore` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `.library`, `.bodyFont`, `.textColor` to the rest of the system?**
  _221 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Why does `AppModel` connect `AppModel` to `TaskEntry`, `LibraryStore`, `SceneSheet`, `.destination`, `View`, `.body`, `Foundation`, `SyncCenter`, `BlockRow`, `LocalAccountService`, `AppSettings`, `.body`, `SceneModel`, `AgentPermission`, `SharedLink`, `.selection`, `.success`, `.content`, `RecoveryKey`, `AppRoute`, `NoteWindow`, `.init`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Are the 31 inferred relationships involving `LibrarySnapshot` (e.g. with `.activeSpace` and `.body()`) actually correct?**
  _`LibrarySnapshot` has 31 INFERRED edges - model-reasoned connections that need verification._
- **Should `03-pencil.md` be split into smaller, more focused modules?**
  _Cohesion score 0.13970588235294118 - nodes in this community are weakly interconnected._