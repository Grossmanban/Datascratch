# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 124 files · ~42,498 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 6, .resolved 1)

## Summary
- 1707 nodes · 3283 edges · 123 communities (96 shown, 27 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 333 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7c72b083`
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
- MCP + REST API
- stack.md
- Компоненты стека
- 0009-notebook-mode-choice.md
- Скрипт обновления графа
- 0031-crdt-yjs.md
- Модель данных — ЧЕРНОВИК
- 0026-file-storage.md
- Hint
- 11. Нефункциональные требования
- NotebookDocument
- TransactionOrigin
- roadmap.md
- glossary.md
- 06-data-server.md (2)
- 01-concept.md
- 09-agents-api.md
- TransactionOrigin
- Stroke
- YEventKind
- 03-pencil.md
- tests.rs
- String
- open-questions.md (2)
- .make
- yjs_compat.rs
- Обзор архитектуры: разделы
- YValue
- steps
- 7. Шифрование и доступ агентов
- generate.mjs
- D-05. Перо при перекладке текста — вариант А «живой штрих»
- YrsError
- open-questions.md (3)
- CRDTTransaction
- D-23. Документация — источник истины; Graphify — граф знаний поверх неё
- YValue
- .xml_root
- Процесс разработки (docs/development.md)
- Sendable
- open-questions.md
- 0004-encryption-and-api.md
- 0011-handwriting-for-agents.md
- events.rs
- lib.rs
- 0001-storage-in-database.md
- Технологический стек — РЕШЕНО (2026-10-25)
- DocKind
- 01-concept.md
- xml.rs
- Author
- 0016-no-import-now.md
- git-хук Graphify (пересборка только по изменённому коду)
- YDocument
- package.json
- compilerOptions
- Sendable
- YOp
- CRDTDocument
- RootRef
- 5. Организация заметок и дизайн
- D-28. Процесс разработки: облако + Mac, сборка iOS в CI
- .json
- Контракт: модель документа (v1)
- .observe_deep
- Контракт: шифрование (v1)
- D-21. Технологический стек
- tasks
- Block
- 4. Документ `note`
- Определение «готово» для любого изменения
- Контракт: REST API сервера (v1)
- Контракт: протокол синхронизации (v1)
- D-29. Graphify: порядок работы, чтобы граф был всегда актуален
- 0017-languages.md
- Datascratch — правила для ИИ
- 3. Apple Pencil в тексте — ключевая фича
- 12. Функции по мотивам Craft
- Data
- D-03. Платформы: нативные iPhone и iPad + полноценный веб
- Контракт: рукописные штрихи (v1)
- Соглашения
- Контракт: дизайн-токены «Тихая бумага» (v1)
- 0014-organization.md
- D-32. Минимальная версия iOS/iPadOS — 26
- D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления
- D-39. Разработка параллельными сессиями; Claude сам вливает в main
- build-xcframework.sh
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
1. `TransactionOrigin` - 68 edges
2. `NoteDocument` - 49 edges
3. `YrsError` - 40 edges
4. `YDocument` - 37 edges
5. `NotebookDocument` - 33 edges
6. `CRDTDocument` - 32 edges
7. `AccountDocument` - 29 edges
8. `Block` - 28 edges
9. `YValue` - 27 edges
10. `Stroke` - 24 edges

## Surprising Connections (you probably didn't know these)
- `4.4. `comments`` --references--> `Comment`  [INFERRED]
  docs/architecture/contracts/document-model.md → apps/ios/Packages/DSCore/Sources/DSCore/Model/NoteDocument.swift
- `1. Три вида документов Yjs` --references--> `DocKind`  [INFERRED]
  docs/architecture/contracts/document-model.md → apps/ios/Packages/DSCore/Sources/DSCore/CRDT/CRDTDocument.swift
- `4.2. Схема блоков` --references--> `label()`  [INFERRED]
  docs/architecture/contracts/document-model.md → tools/graphify_docs.py
- `2. Документ `account`` --references--> `Space`  [INFERRED]
  docs/architecture/contracts/document-model.md → apps/ios/Packages/DSCore/Sources/DSCore/Model/Records.swift
- `2. Документ `account`` --references--> `NotebookRef`  [INFERRED]
  docs/architecture/contracts/document-model.md → apps/ios/Packages/DSCore/Sources/DSCore/Model/Records.swift

## Import Cycles
- 2-file cycle: `apps/ios/Packages/DSCore/yrs-ffi/src/lib.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/xml.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/lib.rs`
- 3-file cycle: `apps/ios/Packages/DSCore/yrs-ffi/src/events.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/xml.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/lib.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/events.rs`

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

## Communities (123 total, 27 thin omitted)

### Community 0 - "Datascratch — правила для ИИ (CLAUDE.md)"
Cohesion: 0.16
Nodes (13): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, Конец сессии: файл в docs/history + roadmap/open-questions (+5 more)

### Community 1 - "Монорепозиторий и CLAUDE.md"
Cohesion: 0.09
Nodes (17): apps/ios — iPhone + iPad, apps/server — сервер, apps/web — веб-клиент, 6. Модель данных и сервер, Self-hosting, Модель данных (общий обзор; детали — `architecture/data-model.md`), Резервные копии, Сервер (+9 more)

### Community 2 - "04-editor.md"
Cohesion: 0.20
Nodes (8): 4. Редактор, iOS editor: UIKit + TextKit 2, Link graph view (not in MVP, stage 6), Web editor: TipTap (ProseMirror) + Yjs, Платформенная реализация, Прочее, Связи, Содержимое

### Community 3 - "D-21: разделы"
Cohesion: 0.12
Nodes (16): Обоснованы PostgreSQL (D-30) и Yjs (D-31) как отдельные решения, Прототип пера хранит текст в Yrs (D-27), D-27. В прототипе пера текст хранится в Yrs, Контекст, Последствия, Решение, D-30. База данных сервера — PostgreSQL, Контекст (+8 more)

### Community 4 - "Платформы и клиенты"
Cohesion: 0.14
Nodes (13): D-06. Рисование пальцем на iPhone — да, опционально, Finger drawing toggle on iPhone, Решение, 2. Платформы, iPad client (primary, Pencil / Pencil Pro, hover, Stage Manager), iPhone client (primary, quick notes, finger drawing option D-06), Minimum iOS/iPadOS version (OPEN: current + previous major), Test devices: Apple Silicon Mac with Xcode, iPad with Apple Pencil Pro (+5 more)

### Community 5 - "Хранение в БД и редактор"
Cohesion: 0.15
Nodes (13): D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account, Universal Links (paid Apple Developer account), Последствия, Решение, Web client as full desktop replacement (Pointer Events pressure, offline PWA), 8. Совместная работа и шеринг, Guest editing without account in any browser (+5 more)

### Community 6 - "План разработки"
Cohesion: 0.17
Nodes (12): Критерии приёмки, План разработки, Подготовка, Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad), Этап 2 — MVP на iPad и iPhone, локально (+4 more)

### Community 7 - "Дизайн и организация"
Cohesion: 0.17
Nodes (11): D-15. Дизайн — основная концепция продукта, Design references: Things 3, Linear, Craft, Arc, Последствия, Решение, Light/dark theme, Dynamic Type, VoiceOver, full iPad keyboard, Feel references: Things 3, Linear, Craft, Arc, Own design system unified on iOS and web, Design tokens as single source for both platforms (format at stage 2) (+3 more)

### Community 8 - "Процесс разработки и Graphify"
Cohesion: 0.11
Nodes (16): Monorepo Structure (apps/, packages/, infra/), packages/test-vectors, libsodium (swift-sodium), Git, Graphify, Автоматизация, Две среды, Команды (+8 more)

### Community 9 - "10-sync.md"
Cohesion: 0.12
Nodes (16): D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение, Real-time co-editing with cursors and presence (guests shown as 'Guest'), Agent edits applied immediately, highlighted, revertible via history (D-10), 10. Синхронизация и офлайн (+8 more)

### Community 10 - "MCP + REST API"
Cohesion: 0.12
Nodes (28): agent_tokens / agent_audit_log Tables, doc_updates Table (encrypted Yjs updates), Server PostgreSQL Schema (Stage 3 Draft), Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, File Storage (disk or external S3) (+20 more)

### Community 11 - "stack.md"
Cohesion: 0.15
Nodes (18): Web PWA Client (React, TipTap, Yjs, IndexedDB), Astro (landing page), Dexie (IndexedDB), Drizzle ORM, Fastify, GRDB (SQLite), TypeScript on Node.js, pnpm + Turborepo Monorepo (+10 more)

### Community 12 - "Компоненты стека"
Cohesion: 0.07
Nodes (33): Убран Redis (D-25): один процесс сервера, очередь — pg-boss на PostgreSQL, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, Контекст, Решение (на сейчас), Canvas + Pointer Events, Dexie (IndexedDB), Drizzle ORM (+25 more)

### Community 13 - "0009-notebook-mode-choice.md"
Cohesion: 0.17
Nodes (11): D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, Space -> notebook -> folder relation (open; encryption mode per notebook, D-09), Attachments as separate encrypted files, on-demand resumable download, Argon2id password key derivation, libsodium on all platforms (swift-sodium, libsodium-wrappers), Per-notebook key wrapped by user master key or server key, Private notebooks: key from password, server stores only ciphertext, no agent access (+3 more)

### Community 14 - "Скрипт обновления графа"
Cohesion: 0.28
Nodes (7): Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 15 - "0031-crdt-yjs.md"
Cohesion: 0.08
Nodes (30): Automerge (fallback CRDT), Yrs (Rust Yjs) with Swift Wrapper, D-19. Весь код пишет Claude, Последствия, Решение, Custom pen renderer (Metal vs Core Animation TBD), End-to-end encryption, iOS client stack (+22 more)

### Community 16 - "Модель данных — ЧЕРНОВИК"
Cohesion: 0.40
Nodes (5): Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3), Штрих (черновик для прототипа)

### Community 17 - "0026-file-storage.md"
Cohesion: 0.11
Nodes (20): iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), MinIO (rejected), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Server disk folder storage (default) (+12 more)

### Community 18 - "Hint"
Cohesion: 0.11
Nodes (18): AnchorKind, block, drawing, image, text, Hint, arrow, circle (+10 more)

### Community 19 - "11. Нефункциональные требования"
Cohesion: 0.40
Nodes (5): 11. Нефункциональные требования, Доступность, Надёжность, Ресурсы сервера, Языки

### Community 20 - "NotebookDocument"
Cohesion: 0.15
Nodes (10): NotebookDocument, .formatVersion, .inbox, .notebookId, Folder, .fields, NoteMeta, .fields (+2 more)

### Community 21 - "TransactionOrigin"
Cohesion: 0.11
Nodes (14): TransactionOrigin, .description, .isOutgoing, local, other, remote, storage, system (+6 more)

### Community 22 - "roadmap.md"
Cohesion: 0.14
Nodes (10): PencilKit (rejected), D-08. Аннотации PDF пером — не в MVP, PDF pen annotations (PDFKit + stroke layer), Решение (предложение), D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, PDF Annotations Not in MVP, R-08 Huge Project Scope, Stage 2: Local MVP on iPad and iPhone (+2 more)

### Community 23 - "glossary.md"
Cohesion: 0.12
Nodes (26): Anchor (textRange / paragraph / drawingBlock / image), Note, Organization Hierarchy (Account > Space > Notebook > Folder > Note), Stroke, StrokePoint, GitHub Actions CI (incl. macOS iOS builds), Custom iOS Pen Render Layer (Metal or Core Animation), TextKit 2 (UIKit editor) (+18 more)

### Community 24 - "06-data-server.md (2)"
Cohesion: 0.18
Nodes (10): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, Audience: the author first, maybe a narrow circle later (D-12), Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps, Daily off-VPS backups of DB and files with verified restore (R-11), Performance targets (PencilKit latency, 120 fps, 300 ms open, 1-min first sync, 2 s delivery, 1 s cold start) (+2 more)

### Community 25 - "01-concept.md"
Cohesion: 0.15
Nodes (11): 1. Концепция продукта, Notesnook (reference product: E2E encryption, reliable sync), Obsidian (reference product: links, backlinks, tags, Markdown export), Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения, Суть в одном абзаце (+3 more)

### Community 26 - "09-agents-api.md"
Cohesion: 0.13
Nodes (16): pg-boss background job queue on PostgreSQL, PostgreSQL via Drizzle (D-30): accounts, notebooks, rights, tokens, encrypted updates, snapshots, agent log, Local MCP bridge (future): local utility holding key for agent access to private notebooks, 9. API и внешние ИИ-агенты, Log of all agent actions, Agent capabilities: search/read Markdown, block-level edits, comments, links/tags/backlinks, MCP tools sketch (list_spaces, list_notebooks, search_notes, read_note, get_handwriting_image, create_note, edit_note, add_comment, get_backlinks), Request rate limits (+8 more)

### Community 27 - "TransactionOrigin"
Cohesion: 0.05
Nodes (24): .entries, Backdrop, .yValue, Comment, Cover, .value, DocumentError, notFound (+16 more)

### Community 28 - "Stroke"
Cohesion: 0.18
Nodes (9): ResolvedStrokeSegment, Stroke, .fields, StrokeCodec, StrokeCodecError, invalidLength, StrokeMetrics, StrokePoint (+1 more)

### Community 29 - "YEventKind"
Cohesion: 0.11
Nodes (17): ArrayDelta, Delete, Insert, Retain, TextDelta, Delete, Insert, Retain (+9 more)

### Community 30 - "03-pencil.md"
Cohesion: 0.16
Nodes (10): D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, Handwriting input types (text marks, margin notes, drawing block, drawing on images, Scribble), Pencil gestures (zigzag delete, underline, strike, lasso), Prototype open questions (multi-word circles, deleted marked text R-04), Stroke point anchoring: character anchor + dx/dy in font-size units, System Scribble only; no recognition of drawn ink (D-07) (+2 more)

### Community 31 - "tests.rs"
Cohesion: 0.18
Nodes (17): UpdateObserver, arrays_and_errors(), Collect, local(), merge_and_diff_updates(), nested_maps_merge_per_field(), note_roots(), observers_report_paths_deltas_and_origins() (+9 more)

### Community 33 - "open-questions.md (2)"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 34 - ".make"
Cohesion: 0.14
Nodes (3): DSDate, EntityID, UtilTests

### Community 35 - "yjs_compat.rs"
Cohesion: 0.19
Nodes (12): b64(), el(), empty(), fixture(), normalize(), reads_yjs_document(), roots(), s() (+4 more)

### Community 36 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 37 - "YValue"
Cohesion: 0.09
Nodes (13): XmlNode, .attributes, .children, .elementName, .textContent, YValue, .boolValue, .dataValue (+5 more)

### Community 38 - "steps"
Cohesion: 0.06
Nodes (35): concurrency, cancel-in-progress, group, defaults, run, name, runs-on, steps (+27 more)

### Community 39 - "7. Шифрование и доступ агентов"
Cohesion: 0.33
Nodes (6): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 40 - "generate.mjs"
Cohesion: 0.07
Nodes (28): b64(), content, doc, firstRun, fixture, json, para, rel() (+20 more)

### Community 41 - "D-05. Перо при перекладке текста — вариант А «живой штрих»"
Cohesion: 0.40
Nodes (5): D-05. Перо при перекладке текста — вариант А «живой штрих», Гипотеза реализации, Контекст, Последствия, Решение

### Community 42 - "YrsError"
Cohesion: 0.12
Nodes (14): check_text_range(), decoding(), diff_update(), merge_updates(), mismatch(), missing_map(), nested_map(), state_vector_from_update() (+6 more)

### Community 43 - "open-questions.md (3)"
Cohesion: 0.40
Nodes (5): docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, iOS build and tests on macOS CI runner per push

### Community 44 - "CRDTTransaction"
Cohesion: 0.12
Nodes (7): CRDTTransaction, Locked, CRDTDocumentTests, DSCore, Foundation, PackageDescription, Testing

### Community 45 - "D-23. Документация — источник истины; Graphify — граф знаний поверх неё"
Cohesion: 0.50
Nodes (4): D-23. Документация — источник истины; Graphify — граф знаний поверх неё, Контекст, Последствия, Решение

### Community 46 - "YValue"
Cohesion: 0.09
Nodes (17): map_to_attrs(), value_to_any(), value_to_in(), YValue, BigInt, Bool, Bytes, List (+9 more)

### Community 48 - "Процесс разработки (docs/development.md)"
Cohesion: 0.31
Nodes (8): D-23 (документация), D-19 (код пишет Claude), D-28 (облако + Mac, CI), GitHub Actions на macOS — проверка сборки iOS, Процесс разработки (docs/development.md), Роли: пользователь — владелец продукта, Claude — пишет код и docs, Две среды: облачная сессия Claude Code (Linux) и Mac пользователя, XcodeGen (apps/ios/project.yml, ПРЕДЛОЖЕНО)

### Community 49 - "Sendable"
Cohesion: 0.14
Nodes (4): CRDTSubscription, DeepHandler, UpdateHandler, YrsFFI

### Community 50 - "open-questions.md"
Cohesion: 0.08
Nodes (27): doc_snapshots Table (compacted snapshots, version history), Guest via Link (web, no account), Canvas + Pointer Events Pen Layer, D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст, Решение (+19 more)

### Community 51 - "0004-encryption-and-api.md"
Cohesion: 0.25
Nodes (6): D-04. Одновременно сквозное шифрование и доступ по API, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), Контекст, Последствия, Решение

### Community 52 - "0011-handwriting-for-agents.md"
Cohesion: 0.29
Nodes (6): D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Handwriting Format for Agents (PNG), Export: Markdown, PDF, HTML (handwriting as images), Server responsibilities: accounts, encrypted relay, attachments, realtime, API/MCP, handwriting PNG render, Handwriting rendered to PNG for agents with text annotation (D-11)

### Community 53 - "events.rs"
Cohesion: 0.15
Nodes (11): convert(), DeepObserver, path(), sorted_keys(), text_delta(), YEvent, YPathSegment, Index (+3 more)

### Community 55 - "0001-storage-in-database.md"
Cohesion: 0.16
Nodes (10): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты, Решение (+2 more)

### Community 56 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 57 - "DocKind"
Cohesion: 0.25
Nodes (5): DocKind, account, note, notebook, .roots

### Community 58 - "01-concept.md"
Cohesion: 0.27
Nodes (4): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, Full-featured web client (TypeScript)

### Community 59 - "xml.rs"
Cohesion: 0.13
Nodes (19): chunk(), Container, container(), Element, Fragment, element(), index_paths(), insert_chunks() (+11 more)

### Community 60 - "Author"
Cohesion: 0.36
Nodes (6): Author, .value, Kind, agent, guest, user

### Community 61 - "0016-no-import-now.md"
Cohesion: 0.33
Nodes (5): Notesnook, D-16. Импорт — не сейчас, Import from Obsidian/Notesnook (later), Решение, No import for now (D-16)

### Community 62 - "git-хук Graphify (пересборка только по изменённому коду)"
Cohesion: 0.36
Nodes (7): Стартовый хук Claude Code (.claude/hooks/session-start.sh), git-хук Graphify (пересборка только по изменённому коду), Graphify 0.9.95 (пакет graphifyy), Смысловой слой графа (понятия, решения, связи — проход ИИ), Структурный слой графа (код, файлы, заголовки — без ИИ), Автоматизация: стартовый хук, git-хук, graphify update после git pull, Установка Graphify на Mac (brew install uv, uv tool install graphifyy)

### Community 64 - "package.json"
Cohesion: 0.14
Nodes (15): devDependencies, turbo@^2.3.0, typescript@^5.6.0, engines, node, name, packageManager, private (+7 more)

### Community 65 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+7 more)

### Community 66 - "Sendable"
Cohesion: 0.11
Nodes (24): CRDTTransaction, Kind, folder, note, notebook, MapRecord, NotebookMode, agent (+16 more)

### Community 67 - "YOp"
Cohesion: 0.14
Nodes (14): YOp, ArrayDelete, ArrayInsert, MapDelete, MapSet, RootTextDelete, RootTextInsert, TextDelete (+6 more)

### Community 68 - "CRDTDocument"
Cohesion: 0.16
Nodes (4): CRDTDocument, .canRedo, .canUndo, .clientId

### Community 69 - "RootRef"
Cohesion: 0.15
Nodes (11): RootDef, RootKind, Array, Map, Text, XmlFragment, RootRef, Array (+3 more)

### Community 70 - "5. Организация заметок и дизайн"
Cohesion: 0.40
Nodes (5): 5. Организация заметок и дизайн, Дизайн (D-15 — РЕШЕНО, главный принцип продукта), Организация (D-14 — РЕШЕНО по сути; структура ниже — ПРЕДЛОЖЕНО), Принципы, Реализация

### Community 71 - "D-28. Процесс разработки: облако + Mac, сборка iOS в CI"
Cohesion: 0.33
Nodes (6): Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), D-28. Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen (project.yml) - proposed, Контекст, Последствия, Решение

### Community 73 - "Контракт: модель документа (v1)"
Cohesion: 0.29
Nodes (6): 1. Три вида документов Yjs, 2. Документ `account`, 3. Документ `notebook` (индекс блокнота), 5. Производные данные (не синхронизируются), 6. Версия формата, Контракт: модель документа (v1)

### Community 75 - "Контракт: шифрование (v1)"
Cohesion: 0.18
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 76 - "D-21. Технологический стек"
Cohesion: 0.12
Nodes (16): 2026-10-25, Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел), Утверждён технологический стек (D-21), отказ от ядра на Rust (D-22), Журнал изменений, D-21. Технологический стек, Контекст, Последствия (+8 more)

### Community 77 - "tasks"
Cohesion: 0.18
Nodes (10): dependsOn, outputs, $schema, tasks, build, lint, test, typecheck (+2 more)

### Community 78 - "Block"
Cohesion: 0.08
Nodes (22): Array, .attributes, Block, .blockId, .isKnown, .isTextBlock, .text, .xml (+14 more)

### Community 79 - "4. Документ `note`"
Cohesion: 0.40
Nodes (5): 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note`

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

### Community 84 - "0017-languages.md"
Cohesion: 0.40
Nodes (4): D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, UI languages Russian and English, no RTL (D-17)

### Community 85 - "Datascratch — правила для ИИ"
Cohesion: 0.22
Nodes (8): Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой, Правила, Среда разработки, Создан CLAUDE.md и скелет монорепозитория (apps/, packages/, infra/)

### Community 87 - "3. Apple Pencil в тексте — ключевая фича"
Cohesion: 0.22
Nodes (9): 3. Apple Pencil в тексте — ключевая фича, Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера, Перекладка текста — вариант А «живой штрих» (D-05, РЕШЕНО) (+1 more)

### Community 88 - "12. Функции по мотивам Craft"
Cohesion: 0.22
Nodes (8): 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft, Связь с моделью данных

### Community 89 - "Data"
Cohesion: 0.16
Nodes (6): CRDTUpdates, .jsonObject, .fields, Base64URL, Data, .hexString

### Community 90 - "D-03. Платформы: нативные iPhone и iPad + полноценный веб"
Cohesion: 0.50
Nodes (4): D-03. Платформы: нативные iPhone и iPad + полноценный веб, Контекст, Последствия, Решение

### Community 91 - "Контракт: рукописные штрихи (v1)"
Cohesion: 0.25
Nodes (7): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4. Привязка к тексту (живой штрих), 5. Отрисовка толщины, 6. Тестовые векторы, Контракт: рукописные штрихи (v1)

### Community 92 - "Соглашения"
Cohesion: 0.25
Nodes (8): Документация Datascratch, История, Как вносить изменения, Оглавление, Порядок чтения для новичка, Соглашения, Ссылки на решения, Статусы

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
- **189 isolated node(s):** `.attributeValue`, `.attributes`, `text`, `node`, `.utf16Length` (+184 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 637 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `4. Документ `note`` connect `4. Документ `note`` to `Контракт: модель документа (v1)`?**
  _High betweenness centrality (0.239) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `NoteDocument` (e.g. with `.strokesRoundTripAndResolveAnchors()` and `.undoRestoresTextAndStrokeAnchors()`) actually correct?**
  _`NoteDocument` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `.attributeValue`, `.attributes`, `text` to the rest of the system?**
  _189 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Монорепозиторий и CLAUDE.md` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Why does `Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов` connect `Скрипт обновления графа` to `Определение «готово» для любого изменения`, `D-29. Graphify: порядок работы, чтобы граф был всегда актуален`, `D-21. Технологический стек`, `git-хук Graphify (пересборка только по изменённому коду)`?**
  _High betweenness centrality (0.238) - this node is a cross-community bridge._
- **Should `D-21: разделы` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Why does `label()` connect `Скрипт обновления графа` to `4. Документ `note``?**
  _High betweenness centrality (0.236) - this node is a cross-community bridge._