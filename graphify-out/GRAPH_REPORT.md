# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 137 files · ~50,088 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .css 2)

## Summary
- 1345 nodes · 2484 edges · 109 communities (98 shown, 11 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 228 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d1ed693c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Datascratch — правила для ИИ (CLAUDE.md)
- Монорепозиторий и CLAUDE.md
- 03-pencil.md
- D-30. База данных сервера — PostgreSQL
- Платформы и клиенты
- 0001-storage-in-database.md
- roadmap.md
- Дизайн и организация
- Graphify
- 10-sync.md
- Agent Edit Flow (agent notebook)
- stack.md
- Компоненты стека
- 0009-notebook-mode-choice.md
- Скрипт обновления графа
- Код пишет Claude, документация
- Модель данных и глоссарий (2)
- 0026-file-storage.md
- 0031-crdt-yjs.md
- 06-data-server.md
- Модель данных и глоссарий (3)
- 2026-10-25
- Модель данных и глоссарий (5)
- open-questions.md
- 06-data-server.md (2)
- Платформы и клиенты (2)
- 09-agents-api.md
- schema/index.ts
- 0004-encryption-and-api.md
- iOS client stack
- 06-data-server.md (3)
- Технологический стек — РЕШЕНО (2026-10-25)
- D-21. Технологический стек
- open-questions.md (2)
- web-editor/package.json
- overview.md
- Обзор архитектуры: разделы
- 04-editor.md
- main.tsx
- 7. Шифрование и доступ агентов
- 9. API и внешние ИИ-агенты
- steps
- 0005-living-stroke.md
- open-questions.md (3)
- Server PostgreSQL Schema (Stage 3 Draft)
- PenLayer.ts
- PenLayer
- src/index.ts
- Editor.tsx
- .bindTextStroke
- devDependencies
- layout.ts
- yjs
- Popups.tsx
- package.json
- compilerOptions
- 0003-platforms.md
- strokes.ts
- Two Notebook Modes (private E2E / for agents)
- Контракт: модель документа (v1)
- Контракт: рукописные штрихи (v1)
- План разработки
- pen.spec.tsx
- PenLayer.ts
- Контракт: шифрование (v1)
- tasks
- Контракт: REST API сервера (v1)
- Контракт: протокол синхронизации (v1)
- D-29. Graphify: порядок работы, чтобы граф был всегда актуален
- 08-sharing.md
- host.ts
- hint.ts
- @tiptap/core
- .resolveEntry
- 3. Apple Pencil в тексте — ключевая фича
- 12. Функции по мотивам Craft
- No Shared Core (contracts + shared test vectors)
- compilerOptions
- 0016-no-import-now.md
- Процесс разработки (docs/development.md)
- Модель данных — ЧЕРНОВИК
- Соглашения
- Living stroke (variant A, D-05): strokes bound to words, re-flow and split across lines
- 0010-agent-edits.md
- 2. Платформы
- Контракт: дизайн-токены «Тихая бумага» (v1)
- D-03. Платформы: нативные iPhone и iPad + полноценный веб
- scripts
- 0014-organization.md
- D-32. Минимальная версия iOS/iPadOS — 26
- D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления
- D-39. Разработка параллельными сессиями; Claude сам вливает в main
- 5. Организация заметок и дизайн
- 10. Синхронизация и офлайн
- D-35. Пометка на удалённом тексте исчезает вместе с ним
- D-36. Структура: пространство → блокноты → папки
- D-38. Дизайн-направление — «Тихая бумага», ориентир Craft
- D-41. Набор функций по мотивам Craft
- Контракты между частями системы
- D-33. Bundle ID — com.datascratch.app
- D-37. Гости по ссылке рисуют; ссылка живёт до отзыва
- D-40. Хостинг — позже; сервер готов к запуску одной командой
- changelog.d/README.md
- agents/README.md
- design-tokens/README.md
- ui/README.md
- packages/web-editor — веб-редактор
- pnpm-workspace.yaml

## God Nodes (most connected - your core abstractions)
1. `PenLayer` - 42 edges
2. `DatascratchEditor()` - 25 edges
3. `@tiptap/core` - 19 edges
4. `yjs` - 17 edges
5. `Stage 1: Pen-in-Text Prototype (iPad)` - 17 edges
6. `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` - 17 edges
7. `compilerOptions` - 15 edges
8. `Процесс разработки (docs/development.md)` - 14 edges
9. `2026-10-25` - 13 edges
10. `Datascratch — правила для ИИ (CLAUDE.md)` - 13 edges

## Surprising Connections (you probably didn't know these)
- `4.2. Схема блоков` --references--> `label()`  [INFERRED]
  docs/architecture/contracts/document-model.md → tools/graphify_docs.py
- `Определение «готово» для любого изменения` --semantically_similar_to--> `Как вносить изменения — всё в одном коммите`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/README.md
- `3. Упаковка точек` --references--> `t()`  [INFERRED]
  docs/architecture/contracts/strokes.md → packages/web-editor/demo/sample.ts
- `Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md` --semantically_similar_to--> `Конец сессии: файл в docs/history + roadmap/open-questions`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/development.md
- `Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО` --semantically_similar_to--> `Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/README.md

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

## Communities (109 total, 11 thin omitted)

### Community 0 - "Datascratch — правила для ИИ (CLAUDE.md)"
Cohesion: 0.21
Nodes (9): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, D-28 (облако + Mac, CI), GitHub Actions на macOS — проверка сборки iOS, Две среды: облачная сессия Claude Code (Linux) и Mac пользователя (+1 more)

### Community 1 - "Монорепозиторий и CLAUDE.md"
Cohesion: 0.06
Nodes (25): apps/ios — iPhone + iPad, apps/server — сервер, apps/web — веб-клиент, Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой (+17 more)

### Community 2 - "03-pencil.md"
Cohesion: 0.22
Nodes (8): D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, Handwriting input types (text marks, margin notes, drawing block, drawing on images, Scribble), Pencil gestures (zigzag delete, underline, strike, lasso), Prototype open questions (multi-word circles, deleted marked text R-04), System Scribble only; no recognition of drawn ink (D-07), Editor content (headings, lists, tables, code, formulas, attachments, drawing blocks)

### Community 3 - "D-30. База данных сервера — PostgreSQL"
Cohesion: 0.12
Nodes (16): Обоснованы PostgreSQL (D-30) и Yjs (D-31) как отдельные решения, Прототип пера хранит текст в Yrs (D-27), D-27. В прототипе пера текст хранится в Yrs, Контекст, Последствия, Решение, D-30. База данных сервера — PostgreSQL, Контекст (+8 more)

### Community 4 - "Платформы и клиенты"
Cohesion: 0.15
Nodes (12): D-06. Рисование пальцем на iPhone — да, опционально, Finger drawing toggle on iPhone, Решение, D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, UI languages Russian and English, no RTL (D-17), iPad client (primary, Pencil / Pencil Pro, hover, Stage Manager) (+4 more)

### Community 5 - "0001-storage-in-database.md"
Cohesion: 0.24
Nodes (8): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 6 - "roadmap.md"
Cohesion: 0.22
Nodes (8): D-08. Аннотации PDF пером — не в MVP, PDF pen annotations (PDFKit + stroke layer), Решение (предложение), PDF Annotations Not in MVP, R-08 Huge Project Scope, Stage 2: Local MVP on iPad and iPhone, Stage 6: Extensions, Current status: stack approved, next is stage 1 pencil prototype

### Community 7 - "Дизайн и организация"
Cohesion: 0.17
Nodes (11): D-15. Дизайн — основная концепция продукта, Design references: Things 3, Linear, Craft, Arc, Последствия, Решение, Light/dark theme, Dynamic Type, VoiceOver, full iPad keyboard, Feel references: Things 3, Linear, Craft, Arc, Own design system unified on iOS and web, Design tokens as single source for both platforms (format at stage 2) (+3 more)

### Community 8 - "Graphify"
Cohesion: 0.14
Nodes (13): Git, Graphify, Автоматизация, Две среды, Команды, Конец сессии, Кто что делает, Обновление графа после правки документов (по шагам) (+5 more)

### Community 9 - "10-sync.md"
Cohesion: 0.24
Nodes (8): Attachments as separate encrypted files, on-demand resumable download, Agent edits applied immediately, highlighted, revertible via history (D-10), Chunked resumable attachments; thumbnails-only on iPhone, Local storage: SQLite via GRDB (iOS), IndexedDB via Dexie (web), Agent notebooks: server decrypts and applies agent edit as a normal update, Trash for 30 days, Version history: snapshots, view, rollback, Each note is a Yjs CRDT doc; edits are small binary updates

### Community 10 - "Agent Edit Flow (agent notebook)"
Cohesion: 0.27
Nodes (10): agent_tokens / agent_audit_log Tables, Agent Edit Flow (agent notebook), edit_note MCP Tool, Key Store (agent notebooks), Official MCP TypeScript SDK (Streamable HTTP, OAuth 2.1), Notebook for Agents, MCP (Model Context Protocol), Row-Level Security (RLS) (+2 more)

### Community 11 - "stack.md"
Cohesion: 0.13
Nodes (23): iOS / iPadOS Client (Swift, TextKit 2, Yrs, GRDB), Web PWA Client (React, TipTap, Yjs, IndexedDB), Astro (landing page), Dexie (IndexedDB), Drizzle ORM, Fastify, GRDB (SQLite), Custom iOS Pen Render Layer (Metal or Core Animation) (+15 more)

### Community 12 - "Компоненты стека"
Cohesion: 0.13
Nodes (19): Убран Redis (D-25): один процесс сервера, очередь — pg-boss на PostgreSQL, Dexie (IndexedDB), Drizzle ORM, Fastify, MCP TypeScript SDK, OAuth 2.1, pg-boss job queue, Radix + Tailwind + Motion (+11 more)

### Community 13 - "0009-notebook-mode-choice.md"
Cohesion: 0.16
Nodes (12): D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, Notesnook (reference product: E2E encryption, reliable sync), Space -> notebook -> folder relation (open; encryption mode per notebook, D-09), Argon2id password key derivation, libsodium on all platforms (swift-sodium, libsodium-wrappers), Local MCP bridge (future): local utility holding key for agent access to private notebooks, Per-notebook key wrapped by user master key or server key (+4 more)

### Community 14 - "Скрипт обновления графа"
Cohesion: 0.28
Nodes (7): Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 15 - "Код пишет Claude, документация"
Cohesion: 0.14
Nodes (9): D-19. Весь код пишет Claude, Последствия, Решение, D-23. Документация — источник истины; Graphify — граф знаний поверх неё, docs/history session log, Контекст, Последствия, Решение (+1 more)

### Community 16 - "Модель данных и глоссарий (2)"
Cohesion: 0.42
Nodes (6): Anchor (textRange / paragraph / drawingBlock / image), Note, Stroke, StrokePoint, RelativePosition (CRDT), R-03 Data Format Cannot Change Cheaply

### Community 17 - "0026-file-storage.md"
Cohesion: 0.21
Nodes (12): MinIO (rejected), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Server disk folder storage (default), External S3-compatible storage (Hetzner, R2, B2), File storage interface (two implementations, chosen by config), Garage / SeaweedFS, MinIO (rejected) (+4 more)

### Community 18 - "0031-crdt-yjs.md"
Cohesion: 0.15
Nodes (20): Automerge (fallback CRDT), Yrs (Rust Yjs) with Swift Wrapper, Canvas + Pointer Events, End-to-end encryption, TipTap editor, Vite + React + TypeScript PWA, Web client stack (PWA), libsodium (+12 more)

### Community 19 - "06-data-server.md"
Cohesion: 0.11
Nodes (17): iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), MongoDB (rejected), MySQL (rejected), Row-Level Security for agent token permissions, iPhone and iPad share one codebase (universal app) (+9 more)

### Community 20 - "Модель данных и глоссарий (3)"
Cohesion: 0.25
Nodes (8): Organization Hierarchy (Account > Space > Notebook > Folder > Note), ADR (Architecture Decision Record), PencilKit / PKCanvasView, Predicted / Coalesced Touches, PWA, Smart Tag, Space, Глоссарий

### Community 21 - "2026-10-25"
Cohesion: 0.22
Nodes (9): 2026-10-25, Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Журнал изменений, D-28. Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen (project.yml) - proposed, Контекст, Последствия (+1 more)

### Community 22 - "Модель данных и глоссарий (5)"
Cohesion: 0.24
Nodes (7): Universal Links, Apple Developer Account, R-04 Strokes on Deleted or Changed Text, R-07 Web Pen Worse than Native, R-12 No Paid Apple Account (7-day installs), Риски, Stage 4: Web Client

### Community 23 - "open-questions.md"
Cohesion: 0.14
Nodes (18): GitHub Actions CI (incl. macOS iOS builds), XcodeGen, D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст, Решение, Mixed cloud + Mac development mode (+10 more)

### Community 24 - "06-data-server.md (2)"
Cohesion: 0.17
Nodes (11): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, PostgreSQL, Контекст (+3 more)

### Community 25 - "Платформы и клиенты (2)"
Cohesion: 0.22
Nodes (7): D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, 1. Концепция продукта, Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения, Суть в одном абзаце

### Community 26 - "09-agents-api.md"
Cohesion: 0.18
Nodes (11): D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Handwriting Format for Agents (PNG), Export: Markdown, PDF, HTML (handwriting as images), Server responsibilities: accounts, encrypted relay, attachments, realtime, API/MCP, handwriting PNG render, Log of all agent actions, Handwriting rendered to PNG for agents with text annotation (D-11), MCP tools sketch (list_spaces, list_notebooks, search_notes, read_note, get_handwriting_image, create_note, edit_note, add_comment, get_backlinks) (+3 more)

### Community 27 - "schema/index.ts"
Cohesion: 0.05
Nodes (57): CoreOptions, HostRef, PenTool, TOOL_DEFAULTS, BlockId, blockIdPluginKey, findIdFixes(), hasAttr() (+49 more)

### Community 28 - "0004-encryption-and-api.md"
Cohesion: 0.25
Nodes (6): D-04. Одновременно сквозное шифрование и доступ по API, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), Контекст, Последствия, Решение

### Community 29 - "iOS client stack"
Cohesion: 0.18
Nodes (11): Custom pen renderer (Metal vs Core Animation TBD), GRDB (SQLite), iOS client stack, Node.js + TypeScript server, Swift 6, SwiftUI (shell), TypeScript, UIKit + TextKit 2 (editor) (+3 more)

### Community 30 - "06-data-server.md (3)"
Cohesion: 0.20
Nodes (9): Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps, Daily off-VPS backups of DB and files with verified restore (R-11), 11. Нефункциональные требования, Performance targets (PencilKit latency, 120 fps, 300 ms open, 1-min first sync, 2 s delivery, 1 s cold start), Reliability: no edit lost on network drop, crash or low storage, Доступность, Надёжность, Ресурсы сервера (+1 more)

### Community 31 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 32 - "D-21. Технологический стек"
Cohesion: 0.18
Nodes (11): Утверждён технологический стек (D-21), отказ от ядра на Rust (D-22), D-21. Технологический стек, Контекст, Последствия, Рассмотренные варианты (по обсуждению 2026-10-25), Решение, D-22. Без собственного общего ядра на Rust, Контекст (+3 more)

### Community 33 - "open-questions.md (2)"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 34 - "web-editor/package.json"
Cohesion: 0.07
Nodes (38): dependencies, katex@^0.16.0, lowlight@^3.3.0, mermaid@^12.2.0, @tiptap/core@^3.32.0, @tiptap/extension-code-block-lowlight@^3.32.0, @tiptap/extension-horizontal-rule@^3.32.0, @tiptap/extension-link@^3.32.0 (+30 more)

### Community 35 - "overview.md"
Cohesion: 0.29
Nodes (11): Accounts, OAuth, Tokens Service, External AI Agents, File Storage (disk or external S3), Guest via Link (web, no account), Handwriting-to-PNG Render (pg-boss queue), MCP + REST API, Private Notebook Edit Flow, Sync / Realtime Service (+3 more)

### Community 36 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 37 - "04-editor.md"
Cohesion: 0.14
Nodes (12): Obsidian (reference product: links, backlinks, tags, Markdown export), 4. Редактор, Backlinks, iOS editor: UIKit + TextKit 2, Link graph view (not in MVP, stage 6), Web editor: TipTap (ProseMirror) + Yjs, [[ ]] links with autocomplete, Платформенная реализация (+4 more)

### Community 38 - "main.tsx"
Cohesion: 0.10
Nodes (19): TestEditorProps, Window, App(), attachments, awA, awB, docA, docB (+11 more)

### Community 39 - "7. Шифрование и доступ агентов"
Cohesion: 0.33
Nodes (6): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 40 - "9. API и внешние ИИ-агенты"
Cohesion: 0.33
Nodes (6): 9. API и внешние ИИ-агенты, Агент умеет, Безопасность, Набросок инструментов MCP (ПРЕДЛОЖЕНО), Правки агента (D-10), Реализация

### Community 41 - "steps"
Cohesion: 0.06
Nodes (31): concurrency, cancel-in-progress, group, run, CI, jobs, test, name (+23 more)

### Community 42 - "0005-living-stroke.md"
Cohesion: 0.24
Nodes (6): D-05. Перо при перекладке текста — вариант А «живой штрих», PencilKit (rejected), Гипотеза реализации, Контекст, Последствия, Решение

### Community 43 - "open-questions.md (3)"
Cohesion: 0.40
Nodes (5): docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, iOS build and tests on macOS CI runner per push

### Community 44 - "Server PostgreSQL Schema (Stage 3 Draft)"
Cohesion: 0.36
Nodes (8): doc_snapshots Table (compacted snapshots, version history), doc_updates Table (encrypted Yjs updates), Server PostgreSQL Schema (Stage 3 Draft), pg-boss Job Queue, Snapshot, Update (Yjs binary edit record), Yjs History Compaction under Encryption, R-05 Edit History Growth

### Community 45 - "PenLayer.ts"
Cohesion: 0.19
Nodes (18): AnchorBox, bindToText(), distToSegment(), glyphForX(), groupLines(), hitsSegments(), intervalDistance(), leadingEdge() (+10 more)

### Community 46 - "PenLayer"
Cohesion: 0.16
Nodes (5): RenderPoint, PenLayer, fillSegments(), prepareCanvas(), pointerSample()

### Community 47 - "src/index.ts"
Cohesion: 0.16
Nodes (20): Collaboration, CollaborationOptions, cursorBuilder(), META_ORIGIN, PEN_ORIGIN, DatascratchEditorProps, EditorUser, initNoteMeta() (+12 more)

### Community 48 - "Editor.tsx"
Cohesion: 0.22
Nodes (16): addDays(), Commands, dateChipLabel(), localDate(), MONTHS, nextWeek(), requestTaskMenu(), TASK_MENU_EVENT (+8 more)

### Community 49 - ".bindTextStroke"
Cohesion: 0.36
Nodes (4): bindToSurface(), packPoints(), StrokeTool, strokeToYMap()

### Community 50 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, happy-dom@^21.0.4, react@^19.0.0, @types/katex@^0.16.8, @types/react@^19.0.0, @types/react-dom@^19.0.0, typescript@^5.6.0, vite@^8.3.5 (+10 more)

### Community 51 - "layout.ts"
Cohesion: 0.20
Nodes (9): Glyph, blockIdOf(), blockIds, ElementInfo, FontMetrics, LayoutPass, metricsCache, resetFontMetrics() (+1 more)

### Community 52 - "yjs"
Cohesion: 0.25
Nodes (13): decodeAnchor(), encodeCharAnchor(), followRedone(), isAnchorDeleted(), resolveCharAnchor(), setup(), binding(), findText() (+5 more)

### Community 53 - "Popups.tsx"
Cohesion: 0.11
Nodes (29): react-dom@^19.0.0, Cover(), DatascratchEditor(), FONT_VARS, useHostRef(), WIDTHS, readNoteMeta(), readTitle() (+21 more)

### Community 54 - "package.json"
Cohesion: 0.14
Nodes (15): devDependencies, turbo@^2.3.0, typescript@^5.6.0, engines, node, typescript, name, packageManager (+7 more)

### Community 55 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+7 more)

### Community 56 - "0003-platforms.md"
Cohesion: 0.27
Nodes (4): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, Full-featured web client (TypeScript)

### Community 57 - "strokes.ts"
Cohesion: 0.24
Nodes (9): FIELDS, POINT_BYTES, POINT_FLOATS, pressureCurve(), StrokeAnchorKind, strokeFromYMap(), StrokeHint, tiltFactor() (+1 more)

### Community 58 - "Two Notebook Modes (private E2E / for agents)"
Cohesion: 0.28
Nodes (7): VPS Hosting (Hetzner or similar), End-to-End Encryption (E2E), Private Notebook, Recovery Key for Forgotten Password, R-02 Forgotten Password Loses Private Notes, R-11 Single VPS Is a Single Point of Failure, Stage 3: Server, Sync, Encryption

### Community 59 - "Контракт: модель документа (v1)"
Cohesion: 0.17
Nodes (11): 1. Три вида документов Yjs, 2. Документ `account`, 3. Документ `notebook` (индекс блокнота), 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note` (+3 more)

### Community 60 - "Контракт: рукописные штрихи (v1)"
Cohesion: 0.22
Nodes (8): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4. Привязка к тексту (живой штрих), 5. Отрисовка толщины, 6. Тестовые векторы, Контракт: рукописные штрихи (v1), t()

### Community 61 - "План разработки"
Cohesion: 0.17
Nodes (12): Критерии приёмки, План разработки, Подготовка, Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad), Этап 2 — MVP на iPad и iPhone, локально (+4 more)

### Community 62 - "pen.spec.tsx"
Cohesion: 0.17
Nodes (5): TestEditor(), @playwright/experimental-ct-react@1.62.1, @playwright/test@1.62.1, @playwright/experimental-ct-react, @playwright/test

### Community 63 - "PenLayer.ts"
Cohesion: 0.20
Nodes (12): Bounds, InputPoint, ActiveStroke, DEFAULT_PEN_SETTINGS, Entry, EraserMode, PenLayerOptions, Surface (+4 more)

### Community 64 - "Контракт: шифрование (v1)"
Cohesion: 0.18
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 65 - "tasks"
Cohesion: 0.18
Nodes (10): dependsOn, outputs, $schema, tasks, build, lint, test, typecheck (+2 more)

### Community 66 - "Контракт: REST API сервера (v1)"
Cohesion: 0.20
Nodes (9): Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1), Общее, Служебное, Токены агентов (`spec/09-agents-api.md`) (+1 more)

### Community 67 - "Контракт: протокол синхронизации (v1)"
Cohesion: 0.20
Nodes (9): 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05), 6. Права, 7. Коды ошибок, 8. Тестовые векторы (+1 more)

### Community 68 - "D-29. Graphify: порядок работы, чтобы граф был всегда актуален"
Cohesion: 0.15
Nodes (12): Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел), D-29. Graphify: порядок работы, чтобы граф был всегда актуален, R-09 (риск: Graphify сломается или исчезнет), Контекст, Последствия, Решение (+4 more)

### Community 69 - "08-sharing.md"
Cohesion: 0.14
Nodes (14): D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account, Real-time collaborative editing, Universal Links (paid Apple Developer account), Последствия, Решение, Web client as full desktop replacement (Pointer Events pressure, offline PWA), 8. Совместная работа и шеринг (+6 more)

### Community 70 - "host.ts"
Cohesion: 0.24
Nodes (6): EditorHost, NoteSummary, UploadedAttachment, BLOCK_ITEMS, BlockItem, filterBlocks()

### Community 71 - "hint.ts"
Cohesion: 0.29
Nodes (8): Line, P, pathLength(), recognizeHint(), totalTurning(), xReversals(), glyphs, lines

### Community 72 - "@tiptap/core"
Cohesion: 0.18
Nodes (15): SAMPLE_CONTENT, createNoteUndoManager(), buildExtensions(), createHeadlessEditor(), guardEditorSchema(), createSchemaExtensions(), createUnknownExtensions(), guardSchema() (+7 more)

### Community 73 - ".resolveEntry"
Cohesion: 0.25
Nodes (3): ProsemirrorMapping, pointsWithin(), segmentsBounds()

### Community 74 - "3. Apple Pencil в тексте — ключевая фича"
Cohesion: 0.22
Nodes (9): 3. Apple Pencil в тексте — ключевая фича, Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера, Перекладка текста — вариант А «живой штрих» (D-05, РЕШЕНО) (+1 more)

### Community 75 - "12. Функции по мотивам Craft"
Cohesion: 0.22
Nodes (8): 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft, Связь с моделью данных

### Community 76 - "No Shared Core (contracts + shared test vectors)"
Cohesion: 0.33
Nodes (4): Monorepo Structure (apps/, packages/, infra/), packages/test-vectors, libsodium (swift-sodium), Test Vectors

### Community 77 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, jsx, lib, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 78 - "0016-no-import-now.md"
Cohesion: 0.33
Nodes (5): Notesnook, D-16. Импорт — не сейчас, Import from Obsidian/Notesnook (later), Решение, No import for now (D-16)

### Community 79 - "Процесс разработки (docs/development.md)"
Cohesion: 0.15
Nodes (16): Стартовый хук Claude Code (.claude/hooks/session-start.sh), D-23 (документация), git-хук Graphify (пересборка только по изменённому коду), Скрипт tools/graphify_docs.py (prepare → агенты → finish), Graphify 0.9.95 (пакет graphifyy), Смысловой слой графа (понятия, решения, связи — проход ИИ), Структурный слой графа (код, файлы, заголовки — без ИИ), Автоматизация: стартовый хук, git-хук, graphify update после git pull (+8 more)

### Community 80 - "Модель данных — ЧЕРНОВИК"
Cohesion: 0.40
Nodes (5): Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3), Штрих (черновик для прототипа)

### Community 81 - "Соглашения"
Cohesion: 0.14
Nodes (13): Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Нумерация решений D-NN и файлы decisions/00NN-*.md, Документация Datascratch (docs/README.md), Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Оглавление docs/ (spec, architecture, decisions, roadmap, risks…), Документация Datascratch, История, Как вносить изменения (+5 more)

### Community 83 - "0010-agent-edits.md"
Cohesion: 0.33
Nodes (5): D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение

### Community 84 - "2. Платформы"
Cohesion: 0.50
Nodes (4): 2. Платформы, Минимальная версия iOS/iPadOS — ОТКРЫТО, Тестовые устройства (известно на 2026-10-25), Требования

### Community 85 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.33
Nodes (5): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 86 - "D-03. Платформы: нативные iPhone и iPad + полноценный веб"
Cohesion: 0.50
Nodes (4): D-03. Платформы: нативные iPhone и iPad + полноценный веб, Контекст, Последствия, Решение

### Community 87 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, test, test:ct, typecheck

### Community 89 - "0014-organization.md"
Cohesion: 0.40
Nodes (4): D-14. Организация: богатая, но не перегруженная, Spaces, nested folders, smart tags, colors, Решение, Organization Structure (notebook vs space vs folder)

### Community 90 - "D-32. Минимальная версия iOS/iPadOS — 26"
Cohesion: 0.40
Nodes (4): D-32. Минимальная версия iOS/iPadOS — 26, Последствия, Рассмотренные варианты, Решение

### Community 91 - "D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления"
Cohesion: 0.40
Nodes (4): D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления, Контекст, Рассмотренные варианты, Решение

### Community 92 - "D-39. Разработка параллельными сессиями; Claude сам вливает в main"
Cohesion: 0.40
Nodes (4): D-39. Разработка параллельными сессиями; Claude сам вливает в main, Контекст, Последствия, Решение

### Community 94 - "5. Организация заметок и дизайн"
Cohesion: 0.40
Nodes (5): 5. Организация заметок и дизайн, Дизайн (D-15 — РЕШЕНО, главный принцип продукта), Организация (D-14 — РЕШЕНО по сути; структура ниже — ПРЕДЛОЖЕНО), Принципы, Реализация

### Community 95 - "10. Синхронизация и офлайн"
Cohesion: 0.50
Nodes (4): 10. Синхронизация и офлайн, Как это работает (обзор), Требования, Уплотнение истории — ОТКРЫТО до этапа 3 (R-05)

### Community 96 - "D-35. Пометка на удалённом тексте исчезает вместе с ним"
Cohesion: 0.50
Nodes (3): D-35. Пометка на удалённом тексте исчезает вместе с ним, Рассмотренные варианты, Решение

### Community 97 - "D-36. Структура: пространство → блокноты → папки"
Cohesion: 0.50
Nodes (3): D-36. Структура: пространство → блокноты → папки, Рассмотренные варианты, Решение

### Community 98 - "D-38. Дизайн-направление — «Тихая бумага», ориентир Craft"
Cohesion: 0.50
Nodes (3): D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Рассмотренные варианты, Решение

### Community 99 - "D-41. Набор функций по мотивам Craft"
Cohesion: 0.50
Nodes (3): D-41. Набор функций по мотивам Craft, Контекст, Решение

### Community 109 - "packages/web-editor — веб-редактор"
Cohesion: 0.50
Nodes (3): packages/web-editor — веб-редактор, Команды, Устройство

## Knowledge Gaps
- **49 isolated node(s):** `../../tsconfig.base.json`, `Доступ внешних ИИ-агентов через MCP/REST`, `Apple Pencil в тексте — ключевая фича и главный риск`, `Astro (landing page)`, `Drizzle ORM` (+44 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 492 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` connect `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` to `Datascratch — правила для ИИ (CLAUDE.md)`, `Процесс разработки (docs/development.md)`, `Скрипт обновления графа`, `Код пишет Claude, документация`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `DatascratchEditor()` (e.g. with `packages/web-editor — веб-редактор` and `.destroy()`) actually correct?**
  _`DatascratchEditor()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `../../tsconfig.base.json`, `Доступ внешних ИИ-агентов через MCP/REST`, `Apple Pencil в тексте — ключевая фича и главный риск` to the rest of the system?**
  _49 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Монорепозиторий и CLAUDE.md` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._
- **Why does `Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов` connect `Скрипт обновления графа` to `D-29. Graphify: порядок работы, чтобы граф был всегда актуален`, `2026-10-25`, `Процесс разработки (docs/development.md)`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Should `D-30. База данных сервера — PostgreSQL` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Why does `@tiptap/core` connect `@tiptap/core` to `web-editor/package.json`, `host.ts`, `src/index.ts`, `Editor.tsx`, `yjs`, `Popups.tsx`, `schema/index.ts`, `PenLayer.ts`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._