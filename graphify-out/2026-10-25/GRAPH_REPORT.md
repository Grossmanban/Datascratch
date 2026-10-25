# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 101 files · ~22,615 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 4, .xcconfig 3, .example 1)

## Summary
- 875 nodes · 1426 edges · 59 communities (55 shown, 4 thin omitted)
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 218 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2a762b7f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Правила для ИИ и документации
- Монорепозиторий и CLAUDE.md
- 0005-living-stroke.md
- D-21: разделы
- 02-platforms.md
- Хранение в БД и редактор
- План этапов и отложенное
- 05-organization-design.md
- Процесс разработки и Graphify
- 10-sync.md
- Модель данных и глоссарий
- stack.md
- Компоненты стека
- 0009-notebook-mode-choice.md
- Скрипт обновления графа
- Код пишет Claude, документация
- glossary.md
- steps
- 0031-crdt-yjs.md
- Text as CRDT block tree (Yjs; Yrs on iOS)
- properties
- base
- Модель данных и глоссарий (5)
- open-questions.md
- 06-data-server.md (2)
- Платформы и клиенты (2)
- 09-agents-api.md
- DatascratchTests
- 0004-encryption-and-api.md
- iOS client stack
- 11. Нефункциональные требования
- Технологический стек — РЕШЕНО (2026-10-25)
- 0030-server-database-postgresql.md
- Datascratch
- 06-data-server.md
- overview.md
- Обзор архитектуры: разделы
- 04-editor.md
- Datascratch
- 7. Шифрование и доступ агентов
- 9. API и внешние ИИ-агенты
- 0003-platforms.md
- project.yml
- options
- Server PostgreSQL Schema (Stage 3 Draft)
- PostgreSQL
- 0010-agent-edits.md
- DatascratchApp
- SmokeTests.swift
- LaunchTests
- Модель данных — ЧЕРНОВИК
- 0014-organization.md
- 5. Организация заметок и дизайн
- D-03. Платформы: нативные iPhone и iPad + полноценный веб
- 2. Платформы
- 10. Синхронизация и офлайн
- D-15. Дизайн — основная концепция продукта
- ci-destination.sh
- generate.sh

## God Nodes (most connected - your core abstractions)
1. `base` - 25 edges
2. `properties` - 18 edges
3. `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` - 17 edges
4. `Stage 1: Pen-in-Text Prototype (iPad)` - 17 edges
5. `Процесс разработки (docs/development.md)` - 14 edges
6. `2026-10-25` - 13 edges
7. `Datascratch — правила для ИИ (CLAUDE.md)` - 13 edges
8. `Stage 0: Preparation (done)` - 13 edges
9. `Graphify` - 12 edges
10. `Yrs (Rust Yjs) with Swift Wrapper` - 12 edges

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

## Communities (59 total, 4 thin omitted)

### Community 0 - "Правила для ИИ и документации"
Cohesion: 0.05
Nodes (50): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, Стартовый хук Claude Code (.claude/hooks/session-start.sh) (+42 more)

### Community 1 - "Монорепозиторий и CLAUDE.md"
Cohesion: 0.08
Nodes (18): apps/ios — iPhone + iPad, apps/server — сервер, apps/web — веб-клиент, Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой (+10 more)

### Community 2 - "0005-living-stroke.md"
Cohesion: 0.07
Nodes (25): D-05. Перо при перекладке текста — вариант А «живой штрих», PencilKit (rejected), Гипотеза реализации, Контекст, Последствия, Решение, D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support (+17 more)

### Community 3 - "D-21: разделы"
Cohesion: 0.05
Nodes (38): 2026-10-25, Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, Обоснованы PostgreSQL (D-30) и Yjs (D-31) как отдельные решения, Утверждён технологический стек (D-21), отказ от ядра на Rust (D-22), Прототип пера хранит текст в Yrs (D-27), Журнал изменений, D-21. Технологический стек (+30 more)

### Community 4 - "02-platforms.md"
Cohesion: 0.15
Nodes (12): D-06. Рисование пальцем на iPhone — да, опционально, Finger drawing toggle on iPhone, Решение, D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, UI languages Russian and English, no RTL (D-17), iPad client (primary, Pencil / Pencil Pro, hover, Stage Manager) (+4 more)

### Community 5 - "Хранение в БД и редактор"
Cohesion: 0.15
Nodes (13): D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account, Universal Links (paid Apple Developer account), Последствия, Решение, Web client as full desktop replacement (Pointer Events pressure, offline PWA), 8. Совместная работа и шеринг, Guest editing without account in any browser (+5 more)

### Community 6 - "План этапов и отложенное"
Cohesion: 0.06
Nodes (29): iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), Notesnook, D-08. Аннотации PDF пером — не в MVP, PDF pen annotations (PDFKit + stroke layer), Решение (предложение), D-16. Импорт — не сейчас, Import from Obsidian/Notesnook (later) (+21 more)

### Community 7 - "05-organization-design.md"
Cohesion: 0.23
Nodes (8): Design references: Things 3, Linear, Craft, Arc, Light/dark theme, Dynamic Type, VoiceOver, full iPad keyboard, Feel references: Things 3, Linear, Craft, Arc, Own design system unified on iOS and web, Design tokens as single source for both platforms (format at stage 2), Nested folders without depth limit, Top-level spaces (Personal, Work, Study), Accessibility: Dynamic Type, VoiceOver, light/dark, iPad keyboard

### Community 8 - "Процесс разработки и Graphify"
Cohesion: 0.15
Nodes (12): Git, Graphify, Автоматизация, Две среды, Команды, Конец сессии, Кто что делает, Обновление графа после правки документов (по шагам) (+4 more)

### Community 9 - "10-sync.md"
Cohesion: 0.20
Nodes (10): Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps, Attachments as separate encrypted files, on-demand resumable download, Agent edits applied immediately, highlighted, revertible via history (D-10), Chunked resumable attachments; thumbnails-only on iPhone, Local storage: SQLite via GRDB (iOS), IndexedDB via Dexie (web), Agent notebooks: server decrypts and applies agent edit as a normal update, Trash for 30 days, Version history: snapshots, view, rollback (+2 more)

### Community 10 - "Модель данных и глоссарий"
Cohesion: 0.22
Nodes (13): Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, Key Store (agent notebooks), MCP + REST API, Official MCP TypeScript SDK (Streamable HTTP, OAuth 2.1), Notebook for Agents (+5 more)

### Community 11 - "stack.md"
Cohesion: 0.13
Nodes (20): Web PWA Client (React, TipTap, Yjs, IndexedDB), Astro (landing page), Dexie (IndexedDB), Drizzle ORM, Fastify, GRDB (SQLite), Custom iOS Pen Render Layer (Metal or Core Animation), TypeScript on Node.js (+12 more)

### Community 12 - "Компоненты стека"
Cohesion: 0.22
Nodes (11): Убран Redis (D-25): один процесс сервера, очередь — pg-boss на PostgreSQL, pg-boss job queue, D-25. Redis не используем, Edit broadcast interface (in-memory), PostgreSQL LISTEN/NOTIFY, Redis (rejected), Valkey (free Redis alternative), Будущее (+3 more)

### Community 13 - "0009-notebook-mode-choice.md"
Cohesion: 0.16
Nodes (12): D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, Notesnook (reference product: E2E encryption, reliable sync), Space -> notebook -> folder relation (open; encryption mode per notebook, D-09), Argon2id password key derivation, libsodium on all platforms (swift-sodium, libsodium-wrappers), Local MCP bridge (future): local utility holding key for agent access to private notebooks, Per-notebook key wrapped by user master key or server key (+4 more)

### Community 14 - "Скрипт обновления графа"
Cohesion: 0.18
Nodes (8): draw(), Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 15 - "Код пишет Claude, документация"
Cohesion: 0.13
Nodes (10): D-19. Весь код пишет Claude, Последствия, Решение, D-23. Документация — источник истины; Graphify — граф знаний поверх неё, docs/history session log, Контекст, Последствия, Решение (+2 more)

### Community 16 - "glossary.md"
Cohesion: 0.19
Nodes (14): Anchor (textRange / paragraph / drawingBlock / image), Note, Organization Hierarchy (Account > Space > Notebook > Folder > Note), Stroke, StrokePoint, ADR (Architecture Decision Record), Living Stroke, Predicted / Coalesced Touches (+6 more)

### Community 17 - "steps"
Cohesion: 0.06
Nodes (33): defaults, name, runs-on, steps, strategy, timeout-minutes, concurrency, cancel-in-progress (+25 more)

### Community 18 - "0031-crdt-yjs.md"
Cohesion: 0.21
Nodes (15): Automerge (fallback CRDT), Yrs (Rust Yjs) with Swift Wrapper, End-to-end encryption, libsodium, Pen prototype (stage 1), Automerge (fallback CRDT), Encrypted history compaction by clients (R-05, stage 3), Last-write-wins (unsuitable) (+7 more)

### Community 20 - "properties"
Cohesion: 0.08
Nodes (24): CFBundleURLName, CFBundleURLSchemes, info, path, properties, CFBundleDevelopmentRegion, CFBundleDisplayName, CFBundleLocalizations (+16 more)

### Community 21 - "base"
Cohesion: 0.09
Nodes (22): ASSETCATALOG_COMPILER_APPICON_NAME, ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME, BUNDLE_LOADER, CODE_SIGN_STYLE, ENABLE_PREVIEWS, ENABLE_USER_SCRIPT_SANDBOXING, GENERATE_INFOPLIST_FILE, LOCALIZATION_PREFERS_STRING_CATALOGS (+14 more)

### Community 22 - "Модель данных и глоссарий (5)"
Cohesion: 0.28
Nodes (6): Universal Links, Apple Developer Account, R-07 Web Pen Worse than Native, R-12 No Paid Apple Account (7-day installs), Риски, Stage 4: Web Client

### Community 23 - "open-questions.md"
Cohesion: 0.06
Nodes (42): GitHub Actions CI (incl. macOS iOS builds), XcodeGen, Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, D-24. Название продукта (+34 more)

### Community 24 - "06-data-server.md (2)"
Cohesion: 0.15
Nodes (12): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, Контекст, Решение (на сейчас) (+4 more)

### Community 25 - "Платформы и клиенты (2)"
Cohesion: 0.29
Nodes (6): 1. Концепция продукта, Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения, Суть в одном абзаце

### Community 26 - "09-agents-api.md"
Cohesion: 0.27
Nodes (8): pg-boss background job queue on PostgreSQL, PostgreSQL via Drizzle (D-30): accounts, notebooks, rights, tokens, encrypted updates, snapshots, agent log, Log of all agent actions, MCP tools sketch (list_spaces, list_notebooks, search_notes, read_note, get_handwriting_image, create_note, edit_note, add_comment, get_backlinks), Request rate limits, Remote MCP server (Streamable HTTP, OAuth 2.1), REST API, Per-notebook token permissions (read / read+write) enforced also by PostgreSQL RLS (D-30)

### Community 27 - "DatascratchTests"
Cohesion: 0.14
Nodes (15): targets, build, dependencies, platform, settings, sources, type, dependencies (+7 more)

### Community 28 - "0004-encryption-and-api.md"
Cohesion: 0.29
Nodes (6): D-04. Одновременно сквозное шифрование и доступ по API, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), Контекст, Последствия, Решение

### Community 29 - "iOS client stack"
Cohesion: 0.18
Nodes (11): Custom pen renderer (Metal vs Core Animation TBD), GRDB (SQLite), iOS client stack, Node.js + TypeScript server, Swift 6, SwiftUI (shell), TypeScript, UIKit + TextKit 2 (editor) (+3 more)

### Community 30 - "11. Нефункциональные требования"
Cohesion: 0.40
Nodes (5): 11. Нефункциональные требования, Доступность, Надёжность, Ресурсы сервера, Языки

### Community 31 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 32 - "0030-server-database-postgresql.md"
Cohesion: 0.15
Nodes (15): Canvas + Pointer Events, Dexie (IndexedDB), Drizzle ORM, Fastify, MCP TypeScript SDK, OAuth 2.1, Radix + Tailwind + Motion, Server stack (+7 more)

### Community 33 - "Datascratch"
Cohesion: 0.17
Nodes (12): config, archive, run, test, config, schemes, Datascratch, name (+4 more)

### Community 34 - "06-data-server.md"
Cohesion: 0.14
Nodes (16): Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), MinIO (rejected), Server disk folder storage (default), External S3-compatible storage (Hetzner, R2, B2), File storage interface (two implementations, chosen by config), 6. Модель данных и сервер, App server: Node.js + TypeScript (Fastify) (+8 more)

### Community 35 - "overview.md"
Cohesion: 0.17
Nodes (13): File Storage (disk or external S3), Guest via Link (web, no account), iOS / iPadOS Client (Swift, TextKit 2, Yrs, GRDB), Private Notebook Edit Flow, Monorepo Structure (apps/, packages/, infra/), Sync / Realtime Service, packages/test-vectors, libsodium (swift-sodium) (+5 more)

### Community 36 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 37 - "04-editor.md"
Cohesion: 0.06
Nodes (28): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты, Решение (+20 more)

### Community 38 - "Datascratch"
Cohesion: 0.18
Nodes (11): entitlements, platform, settings, sources, type, path, properties, com.apple.developer.associated-domains (+3 more)

### Community 39 - "7. Шифрование и доступ агентов"
Cohesion: 0.33
Nodes (6): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 40 - "9. API и внешние ИИ-агенты"
Cohesion: 0.33
Nodes (6): 9. API и внешние ИИ-агенты, Агент умеет, Безопасность, Набросок инструментов MCP (ПРЕДЛОЖЕНО), Правки агента (D-10), Реализация

### Community 41 - "0003-platforms.md"
Cohesion: 0.27
Nodes (4): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, Full-featured web client (TypeScript)

### Community 42 - "project.yml"
Cohesion: 0.20
Nodes (9): configFiles, Debug, Release, include, path, relativePaths, name, settings (+1 more)

### Community 43 - "options"
Cohesion: 0.25
Nodes (8): iOS, options, bundleIdPrefix, createIntermediateGroups, deploymentTarget, developmentLanguage, groupSortPosition, xcodeVersion

### Community 44 - "Server PostgreSQL Schema (Stage 3 Draft)"
Cohesion: 0.36
Nodes (8): agent_tokens / agent_audit_log Tables, doc_snapshots Table (compacted snapshots, version history), doc_updates Table (encrypted Yjs updates), Server PostgreSQL Schema (Stage 3 Draft), Snapshot, Update (Yjs binary edit record), Yjs History Compaction under Encryption, R-05 Edit History Growth

### Community 45 - "PostgreSQL"
Cohesion: 0.39
Nodes (7): Handwriting-to-PNG Render (pg-boss queue), docker compose Self-Hosting (server + PostgreSQL), pg-boss Job Queue, Scaling via PostgreSQL LISTEN/NOTIFY, PostgreSQL, Redis (rejected), WebSocket In-Process Broadcast

### Community 46 - "0010-agent-edits.md"
Cohesion: 0.33
Nodes (5): D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение

### Community 47 - "DatascratchApp"
Cohesion: 0.33
Nodes (3): DatascratchApp, .body, SwiftUI

### Community 48 - "SmokeTests.swift"
Cohesion: 0.40
Nodes (3): SmokeTests, Datascratch, Testing

### Community 50 - "Модель данных — ЧЕРНОВИК"
Cohesion: 0.40
Nodes (5): Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3), Штрих (черновик для прототипа)

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

### Community 55 - "10. Синхронизация и офлайн"
Cohesion: 0.50
Nodes (4): 10. Синхронизация и офлайн, Как это работает (обзор), Требования, Уплотнение истории — ОТКРЫТО до этапа 3 (R-05)

### Community 56 - "D-15. Дизайн — основная концепция продукта"
Cohesion: 0.67
Nodes (3): D-15. Дизайн — основная концепция продукта, Последствия, Решение

## Knowledge Gaps
- **53 isolated node(s):** `SwiftUI`, `.body`, `Testing`, `Datascratch`, `XCTest` (+48 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 348 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` connect `Правила для ИИ и документации` to `Скрипт обновления графа`, `Код пишет Claude, документация`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `Stage 1: Pen-in-Text Prototype (iPad)` (e.g. with `Predicted / Coalesced Touches` and `Living Stroke`) actually correct?**
  _`Stage 1: Pen-in-Text Prototype (iPad)` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `SwiftUI`, `.body`, `Testing` to the rest of the system?**
  _53 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Правила для ИИ и документации` be split into smaller, more focused modules?**
  _Cohesion score 0.05109126984126984 - nodes in this community are weakly interconnected._
- **Why does `Stage 0: Preparation (done)` connect `0031-crdt-yjs.md` to `0030-server-database-postgresql.md`, `06-data-server.md`, `План этапов и отложенное`, `Процесс разработки и Graphify`, `stack.md`, `Компоненты стека`, `Код пишет Claude, документация`, `open-questions.md`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `Монорепозиторий и CLAUDE.md` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Why does `Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов` connect `Скрипт обновления графа` to `Правила для ИИ и документации`, `D-21: разделы`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._