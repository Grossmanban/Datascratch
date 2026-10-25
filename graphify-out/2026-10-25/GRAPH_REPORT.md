# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 120 files · ~46,362 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 5, .resolved 1)

## Summary
- 1854 nodes · 3814 edges · 126 communities (99 shown, 27 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 304 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b8d7ffd3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Datascratch — правила для ИИ (CLAUDE.md)
- Монорепозиторий и CLAUDE.md
- 04-editor.md
- D-21: разделы
- Платформы и клиенты
- Хранение в БД и редактор
- План разработки
- Дизайн и организация
- Процесс разработки и Graphify
- 10-sync.md
- overview.md
- stack.md
- Компоненты стека
- 0009-notebook-mode-choice.md
- Скрипт обновления графа
- 0031-crdt-yjs.md
- Модель данных и глоссарий (2)
- 0026-file-storage.md
- RustBuffer
- 06-data-server.md
- glossary.md
- Two Notebook Modes (private E2E / for agents)
- risks.md
- open-questions.md
- 06-data-server.md (2)
- Платформы и клиенты (2)
- 09-agents-api.md
- UInt8
- Data
- iOS client stack
- 03-pencil.md
- tests.rs
- Компоненты стека (2)
- open-questions.md (2)
- CRDTTransaction
- yrs_ffi.swift
- Обзор архитектуры: разделы
- YValue
- steps
- 7. Шифрование и доступ агентов
- generate.mjs
- 0005-living-stroke.md
- YrsError
- open-questions.md (3)
- Модель данных и глоссарий (7)
- D-23. Документация — источник истины; Graphify — граф знаний поверх неё
- YValue
- Код пишет Claude, документация (2)
- FfiConverter
- Sendable
- String
- UInt64
- .lift
- events.rs
- lib.rs
- 0001-storage-in-database.md
- YDocument
- YEventKind
- 01-concept.md
- xml.rs
- FfiConverterPrimitive
- YValue
- YOp
- YDocument
- package.json
- compilerOptions
- YOp
- CRDTDocument
- RootRef
- Container
- .from
- UniffiInternalError
- Контракт: модель документа (v1)
- .observe_deep
- Контракт: шифрование (v1)
- D-21. Технологический стек
- tasks
- DocKind
- CRDTDocumentTests.swift
- Определение «готово» для любого изменения
- Контракт: REST API сервера (v1)
- Контракт: протокол синхронизации (v1)
- D-29. Graphify: порядок работы, чтобы граф был всегда актуален
- YrsError
- Datascratch — правила для ИИ
- Процесс разработки (docs/development.md)
- 3. Apple Pencil в тексте — ключевая фича
- 12. Функции по мотивам Craft
- Data
- git-хук Graphify (пересборка только по изменённому коду)
- Контракт: рукописные штрихи (v1)
- Соглашения
- RootKind
- CRDTSubscription
- XmlNode
- Контракт: дизайн-токены «Тихая бумага» (v1)
- 0014-organization.md
- D-32. Минимальная версия iOS/iPadOS — 26
- D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления
- D-39. Разработка параллельными сессиями; Claude сам вливает в main
- build-xcframework.sh
- InitializationResult
- D-35. Пометка на удалённом тексте исчезает вместе с ним
- D-36. Структура: пространство → блокноты → папки
- D-38. Дизайн-направление — «Тихая бумага», ориентир Craft
- D-41. Набор функций по мотивам Craft
- DSCore
- Контракты между частями системы
- D-33. Bundle ID — com.datascratch.app
- D-37. Гости по ссылке рисуют; ссылка живёт до отзыва
- D-40. Хостинг — позже; сервер готов к запуску одной командой
- build-linux.sh
- generate-bindings.sh
- changelog.d/README.md
- agents/README.md
- design-tokens/README.md
- ui/README.md
- web-editor/README.md
- pnpm-workspace.yaml
- yrs-ffi

## God Nodes (most connected - your core abstractions)
1. `readInt()` - 46 edges
2. `writeInt()` - 46 edges
3. `RustBuffer` - 42 edges
4. `FfiConverterRustBuffer` - 40 edges
5. `YDocument` - 36 edges
6. `YDocument` - 36 edges
7. `YrsError` - 33 edges
8. `CRDTDocument` - 32 edges
9. `YValue` - 30 edges
10. `YDocumentProtocol` - 28 edges

## Surprising Connections (you probably didn't know these)
- `1. Три вида документов Yjs` --references--> `DocKind`  [INFERRED]
  docs/architecture/contracts/document-model.md → apps/ios/Packages/DSCore/Sources/DSCore/CRDT/CRDTDocument.swift
- `4.2. Схема блоков` --references--> `label()`  [INFERRED]
  docs/architecture/contracts/document-model.md → tools/graphify_docs.py
- `Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО` --semantically_similar_to--> `Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/README.md
- `Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md` --semantically_similar_to--> `Конец сессии: файл в docs/history + roadmap/open-questions`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/development.md
- `Определение «готово» для любого изменения` --semantically_similar_to--> `Как вносить изменения — всё в одном коммите`  [INFERRED] [semantically similar]
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

## Communities (126 total, 27 thin omitted)

### Community 0 - "Datascratch — правила для ИИ (CLAUDE.md)"
Cohesion: 0.13
Nodes (15): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел) (+7 more)

### Community 1 - "Монорепозиторий и CLAUDE.md"
Cohesion: 0.08
Nodes (21): apps/ios — iPhone + iPad, iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), apps/server — сервер, apps/web — веб-клиент, Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), iPhone and iPad share one codebase (universal app), Web client as full desktop replacement (Pointer Events pressure, offline PWA) (+13 more)

### Community 2 - "04-editor.md"
Cohesion: 0.15
Nodes (12): Obsidian (reference product: links, backlinks, tags, Markdown export), 4. Редактор, Backlinks, iOS editor: UIKit + TextKit 2, Link graph view (not in MVP, stage 6), Web editor: TipTap (ProseMirror) + Yjs, [[ ]] links with autocomplete, Платформенная реализация (+4 more)

### Community 3 - "D-21: разделы"
Cohesion: 0.10
Nodes (19): 2026-10-25, Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Обоснованы PostgreSQL (D-30) и Yjs (D-31) как отдельные решения, Прототип пера хранит текст в Yrs (D-27), Журнал изменений, D-27. В прототипе пера текст хранится в Yrs, Контекст, Последствия (+11 more)

### Community 4 - "Платформы и клиенты"
Cohesion: 0.12
Nodes (15): D-06. Рисование пальцем на iPhone — да, опционально, Решение, D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, 2. Платформы, UI languages Russian and English, no RTL (D-17), iPad client (primary, Pencil / Pencil Pro, hover, Stage Manager) (+7 more)

### Community 5 - "Хранение в БД и редактор"
Cohesion: 0.16
Nodes (12): D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account, Universal Links (paid Apple Developer account), Последствия, Решение, 8. Совместная работа и шеринг, Guest editing without account in any browser, Share links with view/edit rights, expiry and revocation (+4 more)

### Community 6 - "План разработки"
Cohesion: 0.17
Nodes (12): Критерии приёмки, План разработки, Подготовка, Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad), Этап 2 — MVP на iPad и iPhone, локально (+4 more)

### Community 7 - "Дизайн и организация"
Cohesion: 0.12
Nodes (16): D-15. Дизайн — основная концепция продукта, Design references: Things 3, Linear, Craft, Arc, Последствия, Решение, 5. Организация заметок и дизайн, Light/dark theme, Dynamic Type, VoiceOver, full iPad keyboard, Feel references: Things 3, Linear, Craft, Arc, Own design system unified on iOS and web (+8 more)

### Community 8 - "Процесс разработки и Graphify"
Cohesion: 0.12
Nodes (15): Monorepo Structure (apps/, packages/, infra/), packages/test-vectors, Git, Graphify, Автоматизация, Две среды, Команды, Конец сессии (+7 more)

### Community 9 - "10-sync.md"
Cohesion: 0.13
Nodes (15): D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение, Agent edits applied immediately, highlighted, revertible via history (D-10), 10. Синхронизация и офлайн, Local storage: SQLite via GRDB (iOS), IndexedDB via Dexie (web) (+7 more)

### Community 10 - "overview.md"
Cohesion: 0.12
Nodes (27): agent_tokens / agent_audit_log Tables, Server PostgreSQL Schema (Stage 3 Draft), Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, File Storage (disk or external S3), Guest via Link (web, no account) (+19 more)

### Community 11 - "stack.md"
Cohesion: 0.09
Nodes (26): Web PWA Client (React, TipTap, Yjs, IndexedDB), Astro (landing page), Dexie (IndexedDB), Drizzle ORM, Fastify, GRDB (SQLite), Custom iOS Pen Render Layer (Metal or Core Animation), iPhone / iPad (`apps/ios`) (+18 more)

### Community 12 - "Компоненты стека"
Cohesion: 0.13
Nodes (19): Убран Redis (D-25): один процесс сервера, очередь — pg-boss на PostgreSQL, pg-boss job queue, D-25. Redis не используем, Edit broadcast interface (in-memory), PostgreSQL LISTEN/NOTIFY, Redis (rejected), Valkey (free Redis alternative), Будущее (+11 more)

### Community 13 - "0009-notebook-mode-choice.md"
Cohesion: 0.13
Nodes (14): D-04. Одновременно сквозное шифрование и доступ по API, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), Контекст, Последствия, Решение, D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение (+6 more)

### Community 14 - "Скрипт обновления графа"
Cohesion: 0.28
Nodes (7): Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 15 - "0031-crdt-yjs.md"
Cohesion: 0.15
Nodes (15): End-to-end encryption, libsodium, docs/history session log, Pen prototype (stage 1), Automerge (fallback CRDT), Encrypted history compaction by clients (R-05, stage 3), Last-write-wins (unsuitable), Loro (too early) (+7 more)

### Community 16 - "Модель данных и глоссарий (2)"
Cohesion: 0.22
Nodes (11): Anchor (textRange / paragraph / drawingBlock / image), Note, Stroke, StrokePoint, Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3) (+3 more)

### Community 17 - "0026-file-storage.md"
Cohesion: 0.21
Nodes (12): MinIO (rejected), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Server disk folder storage (default), External S3-compatible storage (Hetzner, R2, B2), File storage interface (two implementations, chosen by config), Garage / SeaweedFS, MinIO (rejected) (+4 more)

### Community 18 - "RustBuffer"
Cohesion: 0.05
Nodes (53): Base64URLData, ArrayDelta, delete, insert, retain, FfiConverterTypeArrayDelta_lift(), FfiConverterTypeArrayDelta_lower(), FfiConverterTypeResolvedIndex_lift() (+45 more)

### Community 19 - "06-data-server.md"
Cohesion: 0.10
Nodes (20): Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), 6. Модель данных и сервер, Daily off-VPS backups of DB and files with verified restore (R-11), App server: Node.js + TypeScript (Fastify), Metadata: title, tags, links, dates, space, folder, Self-hosting, Модель данных (общий обзор; детали — `architecture/data-model.md`), Резервные копии (+12 more)

### Community 20 - "glossary.md"
Cohesion: 0.16
Nodes (16): Organization Hierarchy (Account > Space > Notebook > Folder > Note), Automerge (fallback CRDT), Yjs, Yrs (Rust Yjs) with Swift Wrapper, ADR (Architecture Decision Record), CRDT, Living Stroke, Predicted / Coalesced Touches (+8 more)

### Community 21 - "Two Notebook Modes (private E2E / for agents)"
Cohesion: 0.32
Nodes (7): VPS Hosting (Hetzner or similar), End-to-End Encryption (E2E), Private Notebook, Recovery Key for Forgotten Password, R-02 Forgotten Password Loses Private Notes, R-11 Single VPS Is a Single Point of Failure, Stage 3: Server, Sync, Encryption

### Community 22 - "risks.md"
Cohesion: 0.11
Nodes (17): Official MCP TypeScript SDK (Streamable HTTP, OAuth 2.1), D-08. Аннотации PDF пером — не в MVP, PDF pen annotations (PDFKit + stroke layer), Решение (предложение), MCP (Model Context Protocol), Universal Links, Apple Developer Account, PDF Annotations Not in MVP (+9 more)

### Community 23 - "open-questions.md"
Cohesion: 0.12
Nodes (20): GitHub Actions CI (incl. macOS iOS builds), XcodeGen, Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст, Решение (+12 more)

### Community 24 - "06-data-server.md (2)"
Cohesion: 0.19
Nodes (10): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, Контекст, Решение (на сейчас) (+2 more)

### Community 25 - "Платформы и клиенты (2)"
Cohesion: 0.33
Nodes (6): 1. Концепция продукта, Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения, Суть в одном абзаце

### Community 26 - "09-agents-api.md"
Cohesion: 0.12
Nodes (17): D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Handwriting Format for Agents (PNG), Export: Markdown, PDF, HTML (handwriting as images), Server responsibilities: accounts, encrypted relay, attachments, realtime, API/MCP, handwriting PNG render, Local MCP bridge (future): local utility holding key for agent access to private notebooks, 9. API и внешние ИИ-агенты, Handwriting rendered to PNG for agents with text annotation (D-11) (+9 more)

### Community 27 - "UInt8"
Cohesion: 0.11
Nodes (4): createWriter(), writeBytes(), writeFloat(), writeInt()

### Community 28 - "Data"
Cohesion: 0.10
Nodes (4): Data, readBytes(), readFloat(), readInt()

### Community 29 - "iOS client stack"
Cohesion: 0.15
Nodes (11): Custom pen renderer (Metal vs Core Animation TBD), GRDB (SQLite), iOS client stack, Node.js + TypeScript server, Swift 6, SwiftUI (shell), TypeScript, UIKit + TextKit 2 (editor) (+3 more)

### Community 30 - "03-pencil.md"
Cohesion: 0.14
Nodes (12): D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, Handwriting input types (text marks, margin notes, drawing block, drawing on images, Scribble), Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps, Pencil gestures (zigzag delete, underline, strike, lasso), Prototype open questions (multi-word circles, deleted marked text R-04), Stroke point anchoring: character anchor + dx/dy in font-size units (+4 more)

### Community 31 - "tests.rs"
Cohesion: 0.07
Nodes (29): arrays_and_errors(), chunk(), Collect, local(), merge_and_diff_updates(), nested_maps_merge_per_field(), note_roots(), observers_report_paths_deltas_and_origins() (+21 more)

### Community 32 - "Компоненты стека (2)"
Cohesion: 0.20
Nodes (11): Canvas + Pointer Events, Dexie (IndexedDB), Drizzle ORM, Fastify, MCP TypeScript SDK, OAuth 2.1, Radix + Tailwind + Motion, Server stack (+3 more)

### Community 33 - "open-questions.md (2)"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 34 - "CRDTTransaction"
Cohesion: 0.08
Nodes (6): CRDTTransaction, DSDate, EntityID, Locked, Foundation, PackageDescription

### Community 35 - "yrs_ffi.swift"
Cohesion: 0.09
Nodes (40): createReader(), FfiConverterData, FfiConverterDictionaryStringTypeYValue, FfiConverterOptionData, FfiConverterOptionDictionaryStringTypeYValue, FfiConverterOptionString, FfiConverterOptionTypeResolvedIndex, FfiConverterOptionTypeYValue (+32 more)

### Community 36 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 37 - "YValue"
Cohesion: 0.06
Nodes (18): XmlNode, .attributes, .children, .elementName, .textContent, YValue, .boolValue, .dataValue (+10 more)

### Community 38 - "steps"
Cohesion: 0.06
Nodes (35): concurrency, cancel-in-progress, group, defaults, run, name, runs-on, steps (+27 more)

### Community 39 - "7. Шифрование и доступ агентов"
Cohesion: 0.33
Nodes (6): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 40 - "generate.mjs"
Cohesion: 0.07
Nodes (28): b64(), content, doc, firstRun, fixture, json, para, rel() (+20 more)

### Community 41 - "0005-living-stroke.md"
Cohesion: 0.24
Nodes (6): D-05. Перо при перекладке текста — вариант А «живой штрих», PencilKit (rejected), Гипотеза реализации, Контекст, Последствия, Решение

### Community 42 - "YrsError"
Cohesion: 0.11
Nodes (14): check_text_range(), decoding(), diff_update(), merge_updates(), mismatch(), missing_map(), nested_map(), state_vector_from_update() (+6 more)

### Community 43 - "open-questions.md (3)"
Cohesion: 0.40
Nodes (5): docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, iOS build and tests on macOS CI runner per push

### Community 44 - "Модель данных и глоссарий (7)"
Cohesion: 0.47
Nodes (6): doc_snapshots Table (compacted snapshots, version history), doc_updates Table (encrypted Yjs updates), Snapshot, Update (Yjs binary edit record), Yjs History Compaction under Encryption, R-05 Edit History Growth

### Community 45 - "D-23. Документация — источник истины; Graphify — граф знаний поверх неё"
Cohesion: 0.50
Nodes (4): D-23. Документация — источник истины; Graphify — граф знаний поверх неё, Контекст, Последствия, Решение

### Community 46 - "YValue"
Cohesion: 0.08
Nodes (17): attrs_to_map(), value_to_in(), YValue, BigInt, Bool, Bytes, List, Null (+9 more)

### Community 47 - "Код пишет Claude, документация (2)"
Cohesion: 0.67
Nodes (3): D-19. Весь код пишет Claude, Последствия, Решение

### Community 48 - "FfiConverter"
Cohesion: 0.12
Nodes (8): FfiConverter, FfiConverterBool, FfiConverterString, FfiConverterTypeYDocument, FfiConverterTypeYSubscription, NoHandle, YSubscription, YSubscriptionProtocol

### Community 49 - "Sendable"
Cohesion: 0.12
Nodes (12): DeepHandler, TransactionOrigin, .description, .isOutgoing, local, other, remote, storage (+4 more)

### Community 51 - "UInt64"
Cohesion: 0.17
Nodes (8): DeepObserver, FfiConverterCallbackInterfaceDeepObserver, NSLock, UniffiCallbackInterfaceDeepObserver, UniffiCallbackInterfaceUpdateObserver, UniffiHandleMap, .count, uniffiTraitInterfaceCall()

### Community 52 - ".lift"
Cohesion: 0.21
Nodes (7): diffUpdate(), FfiConverterCallbackInterfaceUpdateObserver, FfiConverterTypeXmlNode_lift(), mergeUpdates(), rustCallWithError(), stateVectorFromUpdate(), UpdateObserver

### Community 53 - "events.rs"
Cohesion: 0.15
Nodes (11): convert(), DeepObserver, path(), sorted_keys(), text_delta(), UpdateObserver, YEvent, YPathSegment (+3 more)

### Community 54 - "lib.rs"
Cohesion: 0.10
Nodes (3): is_inside(), ORIGIN_LOCAL, ORIGIN_UNDO

### Community 55 - "0001-storage-in-database.md"
Cohesion: 0.11
Nodes (15): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты, Решение (+7 more)

### Community 57 - "YEventKind"
Cohesion: 0.11
Nodes (17): ArrayDelta, Delete, Insert, Retain, TextDelta, Delete, Insert, Retain (+9 more)

### Community 58 - "01-concept.md"
Cohesion: 0.14
Nodes (10): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, D-03. Платформы: нативные iPhone и iPad + полноценный веб, Full-featured web client (TypeScript), Контекст, Последствия, Решение (+2 more)

### Community 59 - "xml.rs"
Cohesion: 0.27
Nodes (7): container(), element(), index_paths(), invalid(), read_node(), resolve(), text()

### Community 60 - "FfiConverterPrimitive"
Cohesion: 0.15
Nodes (8): FfiConverterDouble, FfiConverterInt32, FfiConverterInt64, FfiConverterPrimitive, FfiConverterUInt32, FfiConverterUInt64, readDouble(), writeDouble()

### Community 61 - "YValue"
Cohesion: 0.12
Nodes (16): FfiConverterTypeYValue_lift(), FfiConverterTypeYValue_lower(), YValue, bigInt, bool, bytes, list, null (+8 more)

### Community 62 - "YOp"
Cohesion: 0.12
Nodes (16): FfiConverterTypeYOp_lift(), FfiConverterTypeYOp_lower(), YOp, arrayDelete, arrayInsert, mapDelete, mapSet, rootTextDelete (+8 more)

### Community 64 - "package.json"
Cohesion: 0.14
Nodes (15): devDependencies, turbo@^2.3.0, typescript@^5.6.0, engines, node, name, packageManager, private (+7 more)

### Community 65 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+7 more)

### Community 67 - "YOp"
Cohesion: 0.13
Nodes (14): YOp, ArrayDelete, ArrayInsert, MapDelete, MapSet, RootTextDelete, RootTextInsert, TextDelete (+6 more)

### Community 68 - "CRDTDocument"
Cohesion: 0.21
Nodes (4): CRDTDocument, .canRedo, .canUndo, .clientId

### Community 69 - "RootRef"
Cohesion: 0.15
Nodes (11): RootDef, RootKind, Array, Map, Text, XmlFragment, RootRef, Array (+3 more)

### Community 70 - "Container"
Cohesion: 0.26
Nodes (7): map_to_attrs(), value_to_any(), Container, Element, Fragment, insert_chunks(), insert_nodes()

### Community 72 - "UniffiInternalError"
Cohesion: 0.17
Nodes (11): UniffiInternalError, bufferOverflow, .errorDescription, incompleteData, rustPanic, unexpectedEnumCase, unexpectedNullPointer, unexpectedOptionalTag (+3 more)

### Community 73 - "Контракт: модель документа (v1)"
Cohesion: 0.17
Nodes (11): 1. Три вида документов Yjs, 2. Документ `account`, 3. Документ `notebook` (индекс блокнота), 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note` (+3 more)

### Community 75 - "Контракт: шифрование (v1)"
Cohesion: 0.18
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 76 - "D-21. Технологический стек"
Cohesion: 0.18
Nodes (11): Утверждён технологический стек (D-21), отказ от ядра на Rust (D-22), D-21. Технологический стек, Контекст, Последствия, Рассмотренные варианты (по обсуждению 2026-10-25), Решение, D-22. Без собственного общего ядра на Rust, Контекст (+3 more)

### Community 77 - "tasks"
Cohesion: 0.18
Nodes (10): dependsOn, outputs, $schema, tasks, build, lint, test, typecheck (+2 more)

### Community 78 - "DocKind"
Cohesion: 0.20
Nodes (5): DocKind, account, note, notebook, .roots

### Community 79 - "CRDTDocumentTests.swift"
Cohesion: 0.24
Nodes (4): CRDTDocumentTests, Fixture, DSCore, Testing

### Community 80 - "Определение «готово» для любого изменения"
Cohesion: 0.27
Nodes (5): Скрипт tools/graphify_docs.py (prepare → агенты → finish), Обновление графа после правки документов (prepare → агенты → finish → export html → check-update), Промпт извлечения .claude/skills/graphify/references/extraction-spec.md, Git: ветки, PR, один коммит = код + docs + граф, Команды Graphify (query, explain, path, update, check-update, /graphify)

### Community 81 - "Контракт: REST API сервера (v1)"
Cohesion: 0.20
Nodes (9): Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1), Общее, Служебное, Токены агентов (`spec/09-agents-api.md`) (+1 more)

### Community 82 - "Контракт: протокол синхронизации (v1)"
Cohesion: 0.20
Nodes (9): 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05), 6. Права, 7. Коды ошибок, 8. Тестовые векторы (+1 more)

### Community 83 - "D-29. Graphify: порядок работы, чтобы граф был всегда актуален"
Cohesion: 0.24
Nodes (7): Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, D-29. Graphify: порядок работы, чтобы граф был всегда актуален, R-09 (риск: Graphify сломается или исчезнет), Контекст, Последствия, Решение, Раскладка graphify-out/ и что хранится в git

### Community 84 - "YrsError"
Cohesion: 0.22
Nodes (9): FfiConverterTypeYrsError_lift(), FfiConverterTypeYrsError_lower(), YrsError, Decoding, .errorDescription, InvalidPath, Operation, TypeMismatch (+1 more)

### Community 85 - "Datascratch — правила для ИИ"
Cohesion: 0.22
Nodes (8): Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой, Правила, Среда разработки, Создан CLAUDE.md и скелет монорепозитория (apps/, packages/, infra/)

### Community 86 - "Процесс разработки (docs/development.md)"
Cohesion: 0.31
Nodes (8): D-23 (документация), D-19 (код пишет Claude), D-28 (облако + Mac, CI), GitHub Actions на macOS — проверка сборки iOS, Процесс разработки (docs/development.md), Роли: пользователь — владелец продукта, Claude — пишет код и docs, Две среды: облачная сессия Claude Code (Linux) и Mac пользователя, XcodeGen (apps/ios/project.yml, ПРЕДЛОЖЕНО)

### Community 87 - "3. Apple Pencil в тексте — ключевая фича"
Cohesion: 0.22
Nodes (9): 3. Apple Pencil в тексте — ключевая фича, Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера, Перекладка текста — вариант А «живой штрих» (D-05, РЕШЕНО) (+1 more)

### Community 88 - "12. Функции по мотивам Craft"
Cohesion: 0.22
Nodes (8): 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft, Связь с моделью данных

### Community 90 - "git-хук Graphify (пересборка только по изменённому коду)"
Cohesion: 0.36
Nodes (7): Стартовый хук Claude Code (.claude/hooks/session-start.sh), git-хук Graphify (пересборка только по изменённому коду), Graphify 0.9.95 (пакет graphifyy), Смысловой слой графа (понятия, решения, связи — проход ИИ), Структурный слой графа (код, файлы, заголовки — без ИИ), Автоматизация: стартовый хук, git-хук, graphify update после git pull, Установка Graphify на Mac (brew install uv, uv tool install graphifyy)

### Community 91 - "Контракт: рукописные штрихи (v1)"
Cohesion: 0.25
Nodes (7): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4. Привязка к тексту (живой штрих), 5. Отрисовка толщины, 6. Тестовые векторы, Контракт: рукописные штрихи (v1)

### Community 92 - "Соглашения"
Cohesion: 0.25
Nodes (8): Документация Datascratch, История, Как вносить изменения, Оглавление, Порядок чтения для новичка, Соглашения, Ссылки на решения, Статусы

### Community 93 - "RootKind"
Cohesion: 0.29
Nodes (7): FfiConverterTypeRootKind_lift(), FfiConverterTypeRootKind_lower(), RootKind, array, map, text, xmlFragment

### Community 96 - "XmlNode"
Cohesion: 0.40
Nodes (5): sorted(), TextChunk, XmlNode, Element, Text

### Community 97 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.33
Nodes (5): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 98 - "0014-organization.md"
Cohesion: 0.40
Nodes (4): D-14. Организация: богатая, но не перегруженная, Spaces, nested folders, smart tags, colors, Решение, Organization Structure (notebook vs space vs folder)

### Community 99 - "D-32. Минимальная версия iOS/iPadOS — 26"
Cohesion: 0.40
Nodes (4): D-32. Минимальная версия iOS/iPadOS — 26, Последствия, Рассмотренные варианты, Решение

### Community 100 - "D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления"
Cohesion: 0.40
Nodes (4): D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления, Контекст, Рассмотренные варианты, Решение

### Community 101 - "D-39. Разработка параллельными сессиями; Claude сам вливает в main"
Cohesion: 0.40
Nodes (4): D-39. Разработка параллельными сессиями; Claude сам вливает в main, Контекст, Последствия, Решение

### Community 102 - "build-xcframework.sh"
Cohesion: 0.50
Nodes (3): IPHONEOS_DEPLOYMENT_TARGET, MACOSX_DEPLOYMENT_TARGET, build-xcframework.sh script

### Community 104 - "InitializationResult"
Cohesion: 0.50
Nodes (4): InitializationResult, apiChecksumMismatch, contractVersionMismatch, ok

### Community 105 - "D-35. Пометка на удалённом тексте исчезает вместе с ним"
Cohesion: 0.50
Nodes (3): D-35. Пометка на удалённом тексте исчезает вместе с ним, Рассмотренные варианты, Решение

### Community 106 - "D-36. Структура: пространство → блокноты → папки"
Cohesion: 0.50
Nodes (3): D-36. Структура: пространство → блокноты → папки, Рассмотренные варианты, Решение

### Community 107 - "D-38. Дизайн-направление — «Тихая бумага», ориентир Craft"
Cohesion: 0.50
Nodes (3): D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Рассмотренные варианты, Решение

### Community 108 - "D-41. Набор функций по мотивам Craft"
Cohesion: 0.50
Nodes (3): D-41. Набор функций по мотивам Craft, Контекст, Решение

## Knowledge Gaps
- **202 isolated node(s):** `PackageDescription`, `YrsFFI`, `account`, `notebook`, `note` (+197 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 664 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов` connect `Скрипт обновления графа` to `Определение «готово» для любого изменения`, `D-29. Graphify: порядок работы, чтобы граф был всегда актуален`, `D-21: разделы`, `git-хук Graphify (пересборка только по изменённому коду)`?**
  _High betweenness centrality (0.412) - this node is a cross-community bridge._
- **What connects `PackageDescription`, `YrsFFI`, `account` to the rest of the system?**
  _202 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Datascratch — правила для ИИ (CLAUDE.md)` be split into smaller, more focused modules?**
  _Cohesion score 0.13450292397660818 - nodes in this community are weakly interconnected._
- **Why does `DocKind` connect `DocKind` to `Контракт: модель документа (v1)`, `Sendable`, `String`, `CRDTDocument`?**
  _High betweenness centrality (0.410) - this node is a cross-community bridge._
- **Should `Монорепозиторий и CLAUDE.md` be split into smaller, more focused modules?**
  _Cohesion score 0.08465608465608465 - nodes in this community are weakly interconnected._
- **Should `D-21: разделы` be split into smaller, more focused modules?**
  _Cohesion score 0.1038961038961039 - nodes in this community are weakly interconnected._
- **Should `Платформы и клиенты` be split into smaller, more focused modules?**
  _Cohesion score 0.12418300653594772 - nodes in this community are weakly interconnected._