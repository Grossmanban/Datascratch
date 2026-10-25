# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 117 files · ~40,566 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 4)

## Summary
- 1507 nodes · 3182 edges · 111 communities (94 shown, 17 thin omitted)
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 500 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `91cfc928`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Datascratch — правила для ИИ (CLAUDE.md)
- iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)
- 0005-living-stroke.md
- D-30. База данных сервера — PostgreSQL
- Платформы и клиенты
- Хранение в БД и редактор
- План разработки
- 05-organization-design.md
- Процесс разработки и Graphify
- 10-sync.md
- Модель данных и глоссарий
- stack.md
- 0030-server-database-postgresql.md
- 0009-notebook-mode-choice.md
- Скрипт обновления графа
- 06-data-server.md
- glossary.md
- 0026-file-storage.md
- ProjectedParagraph
- 6. Модель данных и сервер
- glossary.md
- DocumentStyle
- MarkSet
- EditorCommands
- D-12. Аудитория — в первую очередь для себя
- 01-concept.md
- Foundation
- ResolvedInkPoint
- 0004-encryption-and-api.md
- WidthPoint
- 11. Нефункциональные требования
- Технологический стек — РЕШЕНО (2026-10-25)
- Web client stack (PWA)
- steps
- CodeTokenKind
- InMemoryEditorDocument
- Обзор архитектуры: разделы
- BlockKind
- BlockNode
- 7. Шифрование и доступ агентов
- Процесс разработки (docs/development.md)
- JSONValue
- open-questions.md (3)
- StrokePoint
- TextAnchorBuilder
- ItemID
- 2026-10-25
- package.json
- compilerOptions
- Node
- D-25. Redis не используем
- 0001-storage-in-database.md
- makeDoc
- roadmap.md
- Контракт: модель документа (v1)
- 04-editor.md
- Контракт: шифрование (v1)
- 0003-platforms.md
- tasks
- Stroke
- Контракт: REST API сервера (v1)
- Контракт: протокол синхронизации (v1)
- D-29. Graphify: порядок работы, чтобы граф был всегда актуален
- DocumentChange
- Op
- git-хук Graphify (пересборка только по изменённому коду)
- 3. Apple Pencil в тексте — ключевая фича
- 12. Функции по мотивам Craft
- Codable
- D-21. Технологический стек
- InlineAtom
- Определение «готово» для любого изменения
- 09-agents-api.md
- Контракт: рукописные штрихи (v1)
- Соглашения
- 0031-crdt-yjs.md
- Документация Datascratch (docs/README.md)
- D-28. Процесс разработки: облако + Mac, сборка iOS в CI
- Открытые вопросы
- D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS)
- 0013-collaboration-sharing.md
- 0016-no-import-now.md
- Контракт: дизайн-токены «Тихая бумага» (v1)
- 0006-finger-drawing-iphone.md
- D-23. Документация — источник истины; Graphify — граф знаний поверх неё
- D-32. Минимальная версия iOS/iPadOS — 26
- D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления
- D-39. Разработка параллельными сессиями; Claude сам вливает в main
- D-02. Отдельной десктоп-версии нет, на компьютере — веб
- D-03. Платформы: нативные iPhone и iPad + полноценный веб
- D-35. Пометка на удалённом тексте исчезает вместе с ним
- D-36. Структура: пространство → блокноты → папки
- D-38. Дизайн-направление — «Тихая бумага», ориентир Craft
- D-41. Набор функций по мотивам Craft
- Контракты между частями системы
- D-18. Монетизация — не решена; архитектура готова к self-hosting
- D-33. Bundle ID — com.datascratch.app
- D-37. Гости по ссылке рисуют; ссылка живёт до отзыва
- D-40. Хостинг — позже; сервер готов к запуску одной командой
- Package.swift
- changelog.d/README.md
- agents/README.md
- design-tokens/README.md
- ui/README.md
- web-editor/README.md
- pnpm-workspace.yaml
- 2. Платформы

## God Nodes (most connected - your core abstractions)
1. `InMemoryEditorDocument` - 73 edges
2. `EditorCommands` - 52 edges
3. `JSONValue` - 46 edges
4. `BlockNode` - 45 edges
5. `EditorDocument` - 38 edges
6. `MarkSet` - 33 edges
7. `Stroke` - 31 edges
8. `Projection` - 30 edges
9. `TextPosition` - 29 edges
10. `StrokePoint` - 25 edges

## Surprising Connections (you probably didn't know these)
- `4.2. Схема блоков` --references--> `label()`  [INFERRED]
  docs/architecture/contracts/document-model.md → tools/graphify_docs.py
- `Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md` --semantically_similar_to--> `Конец сессии: файл в docs/history + roadmap/open-questions`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/development.md
- `Определение «готово» для любого изменения` --semantically_similar_to--> `Как вносить изменения — всё в одном коммите`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/README.md
- `Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО` --semantically_similar_to--> `Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО`  [INFERRED] [semantically similar]
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

## Communities (111 total, 17 thin omitted)

### Community 0 - "Datascratch — правила для ИИ (CLAUDE.md)"
Cohesion: 0.15
Nodes (11): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел), Git: ветки, PR, один коммит = код + docs + граф (+3 more)

### Community 1 - "iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)"
Cohesion: 0.10
Nodes (14): apps/ios — iPhone + iPad, apps/server — сервер, apps/web — веб-клиент, Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой (+6 more)

### Community 2 - "0005-living-stroke.md"
Cohesion: 0.14
Nodes (12): D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, Handwriting input types (text marks, margin notes, drawing block, drawing on images, Scribble), Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps, Pencil gestures (zigzag delete, underline, strike, lasso), Prototype open questions (multi-word circles, deleted marked text R-04), Stroke point anchoring: character anchor + dx/dy in font-size units (+4 more)

### Community 3 - "D-30. База данных сервера — PostgreSQL"
Cohesion: 0.33
Nodes (6): Обоснованы PostgreSQL (D-30) и Yjs (D-31) как отдельные решения, D-30. База данных сервера — PostgreSQL, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 4 - "Платформы и клиенты"
Cohesion: 0.22
Nodes (8): D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, UI languages Russian and English, no RTL (D-17), iPad client (primary, Pencil / Pencil Pro, hover, Stage Manager), Minimum iOS/iPadOS version (OPEN: current + previous major), Test devices: Apple Silicon Mac with Xcode, iPad with Apple Pencil Pro, Web without cuts: full feature parity with iOS (R-07 pen quality risk)

### Community 5 - "Хранение в БД и редактор"
Cohesion: 0.24
Nodes (8): Web client as full desktop replacement (Pointer Events pressure, offline PWA), 8. Совместная работа и шеринг, Guest editing without account in any browser, Share links with view/edit rights, expiry and revocation, Universal Links (requires Apple Developer account and apple-app-site-association), Открыто (см. `open-questions.md`), Реализация, Требования

### Community 6 - "План разработки"
Cohesion: 0.17
Nodes (12): Критерии приёмки, План разработки, Подготовка, Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad), Этап 2 — MVP на iPad и iPhone, локально (+4 more)

### Community 7 - "05-organization-design.md"
Cohesion: 0.12
Nodes (16): D-15. Дизайн — основная концепция продукта, Design references: Things 3, Linear, Craft, Arc, Последствия, Решение, 5. Организация заметок и дизайн, Light/dark theme, Dynamic Type, VoiceOver, full iPad keyboard, Feel references: Things 3, Linear, Craft, Arc, Own design system unified on iOS and web (+8 more)

### Community 8 - "Процесс разработки и Graphify"
Cohesion: 0.11
Nodes (16): Monorepo Structure (apps/, packages/, infra/), packages/test-vectors, libsodium (swift-sodium), Git, Graphify, Автоматизация, Две среды, Команды (+8 more)

### Community 9 - "10-sync.md"
Cohesion: 0.13
Nodes (15): D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение, Agent edits applied immediately, highlighted, revertible via history (D-10), 10. Синхронизация и офлайн, Local storage: SQLite via GRDB (iOS), IndexedDB via Dexie (web) (+7 more)

### Community 10 - "Модель данных и глоссарий"
Cohesion: 0.11
Nodes (31): agent_tokens / agent_audit_log Tables, Server PostgreSQL Schema (Stage 3 Draft), Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, File Storage (disk or external S3), Guest via Link (web, no account) (+23 more)

### Community 11 - "stack.md"
Cohesion: 0.14
Nodes (19): Web PWA Client (React, TipTap, Yjs, IndexedDB), Astro (landing page), Automerge (fallback CRDT), Dexie (IndexedDB), Drizzle ORM, Fastify, GRDB (SQLite), MinIO (rejected) (+11 more)

### Community 12 - "0030-server-database-postgresql.md"
Cohesion: 0.29
Nodes (9): Убран Redis (D-25): один процесс сервера, очередь — pg-boss на PostgreSQL, Drizzle ORM, Fastify, MCP TypeScript SDK, OAuth 2.1, pg-boss job queue, Server stack, PostgreSQL (+1 more)

### Community 13 - "0009-notebook-mode-choice.md"
Cohesion: 0.15
Nodes (13): D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, Notesnook (reference product: E2E encryption, reliable sync), Space -> notebook -> folder relation (open; encryption mode per notebook, D-09), Attachments as separate encrypted files, on-demand resumable download, Argon2id password key derivation, libsodium on all platforms (swift-sodium, libsodium-wrappers), Per-notebook key wrapped by user master key or server key (+5 more)

### Community 14 - "Скрипт обновления графа"
Cohesion: 0.28
Nodes (7): Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 15 - "06-data-server.md"
Cohesion: 0.07
Nodes (31): Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), Single VPS, single process server, Monetization options: subscription, one-time, open source + paid hosting, D-19. Весь код пишет Claude, Последствия, Решение, Node.js + TypeScript server, Swift 6 (+23 more)

### Community 16 - "glossary.md"
Cohesion: 0.12
Nodes (18): Anchor (textRange / paragraph / drawingBlock / image), Note, Organization Hierarchy (Account > Space > Notebook > Folder > Note), Stroke, StrokePoint, Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК (+10 more)

### Community 17 - "0026-file-storage.md"
Cohesion: 0.25
Nodes (8): Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Garage / SeaweedFS, MinIO (rejected), Контекст, Последствия, Рассмотренные варианты, Решение

### Community 18 - "ProjectedParagraph"
Cohesion: 0.13
Nodes (13): CalloutInfo, ListMarker, bullet, ordered, task, ParagraphContext, ParagraphKind, atom (+5 more)

### Community 19 - "6. Модель данных и сервер"
Cohesion: 0.29
Nodes (7): 6. Модель данных и сервер, Self-hosting, Модель данных (общий обзор; детали — `architecture/data-model.md`), Резервные копии, Сервер, docker-compose.yml: server + PostgreSQL containers, file volume or external S3, infra — self-hosting

### Community 20 - "glossary.md"
Cohesion: 0.08
Nodes (39): doc_snapshots Table (compacted snapshots, version history), doc_updates Table (encrypted Yjs updates), GitHub Actions CI (incl. macOS iOS builds), Custom iOS Pen Render Layer (Metal or Core Animation), TextKit 2 (UIKit editor), Canvas + Pointer Events Pen Layer, XcodeGen, Mixed cloud + Mac development mode (+31 more)

### Community 21 - "DocumentStyle"
Cohesion: 0.15
Nodes (14): DocumentStyle, Font, mono, sans, serif, Paper, dots, grid (+6 more)

### Community 22 - "MarkSet"
Cohesion: 0.23
Nodes (3): MarkSet, .isEmpty, .names

### Community 23 - "EditorCommands"
Cohesion: 0.07
Nodes (17): TextPosition, EditorCommands, .projection, Segment, EditorDocument, .allBlocks, MarkdownShortcuts, .document (+9 more)

### Community 24 - "D-12. Аудитория — в первую очередь для себя"
Cohesion: 0.67
Nodes (3): D-12. Аудитория — в первую очередь для себя, Последствия, Решение

### Community 25 - "01-concept.md"
Cohesion: 0.11
Nodes (17): D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст, Решение, Final Product Name, 1. Концепция продукта (+9 more)

### Community 26 - "Foundation"
Cohesion: 0.06
Nodes (16): DSEditorInfo, ObservationToken, MarkName, InkWidth, LineMetrics, .midline, StrokeShapeClassifier, SmokeTests (+8 more)

### Community 27 - "ResolvedInkPoint"
Cohesion: 0.23
Nodes (6): BlockAnchorBuilder, CharacterHit, GlyphPlacement, InkSample, LivingStrokeResolver, ResolvedInkPoint

### Community 28 - "0004-encryption-and-api.md"
Cohesion: 0.29
Nodes (6): D-04. Одновременно сквозное шифрование и доступ по API, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), Контекст, Последствия, Решение

### Community 29 - "WidthPoint"
Cohesion: 0.14
Nodes (4): InkGeometry, InkOutline, WidthPoint, InkGeometryTests

### Community 30 - "11. Нефункциональные требования"
Cohesion: 0.40
Nodes (5): 11. Нефункциональные требования, Доступность, Надёжность, Ресурсы сервера, Языки

### Community 31 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 32 - "Web client stack (PWA)"
Cohesion: 0.33
Nodes (6): Canvas + Pointer Events, Dexie (IndexedDB), Radix + Tailwind + Motion, TipTap editor, Vite + React + TypeScript PWA, Web client stack (PWA)

### Community 33 - "steps"
Cohesion: 0.07
Nodes (30): concurrency, cancel-in-progress, group, runs-on, steps, timeout-minutes, jobs, ios (+22 more)

### Community 34 - "CodeTokenKind"
Cohesion: 0.13
Nodes (11): CodeHighlighter, CodeToken, CodeTokenKind, comment, function, keyword, number, punctuation (+3 more)

### Community 35 - "InMemoryEditorDocument"
Cohesion: 0.13
Nodes (8): InMemoryEditorDocument, .blocks, .canRedo, .canUndo, .strokes, .style, UndoStep, SampleDocument

### Community 36 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 37 - "BlockKind"
Cohesion: 0.22
Nodes (9): BlockKind, blockquote, bulletList, callout, codeBlock, heading, orderedList, paragraph (+1 more)

### Community 38 - "BlockNode"
Cohesion: 0.11
Nodes (10): BlockNode, .isTextblock, .plainText, .textLength, InlineElement, atom, .length, .marks (+2 more)

### Community 39 - "7. Шифрование и доступ агентов"
Cohesion: 0.33
Nodes (6): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 40 - "Процесс разработки (docs/development.md)"
Cohesion: 0.31
Nodes (8): D-23 (документация), D-19 (код пишет Claude), D-28 (облако + Mac, CI), GitHub Actions на macOS — проверка сборки iOS, Процесс разработки (docs/development.md), Роли: пользователь — владелец продукта, Claude — пишет код и docs, Две среды: облачная сессия Claude Code (Linux) и Mac пользователя, XcodeGen (apps/ios/project.yml, ПРЕДЛОЖЕНО)

### Community 41 - "JSONValue"
Cohesion: 0.09
Nodes (12): JSONValue, array, bool, .boolValue, .isNull, null, number, .numberValue (+4 more)

### Community 43 - "open-questions.md (3)"
Cohesion: 0.40
Nodes (5): docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, iOS build and tests on macOS CI runner per push

### Community 44 - "StrokePoint"
Cohesion: 0.14
Nodes (7): StrokePoint, .anchorIndex, StrokeCodecError, invalidLength, StrokePointCodec, UUIDv7, StrokeCodecTests

### Community 45 - "TextAnchorBuilder"
Cohesion: 0.29
Nodes (3): TextAnchorBuilder, GridLayout, LivingStrokeTests

### Community 47 - "2026-10-25"
Cohesion: 0.60
Nodes (3): 2026-10-25, Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Журнал изменений

### Community 48 - "package.json"
Cohesion: 0.14
Nodes (15): devDependencies, turbo@^2.3.0, typescript@^5.6.0, engines, node, name, packageManager, private (+7 more)

### Community 49 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+7 more)

### Community 50 - "Node"
Cohesion: 0.22
Nodes (6): Item, Node, .isLive, .length, .liveChildren, .offsets

### Community 51 - "D-25. Redis не используем"
Cohesion: 0.40
Nodes (5): D-25. Redis не используем, Будущее, Контекст, Последствия, Решение

### Community 52 - "0001-storage-in-database.md"
Cohesion: 0.16
Nodes (10): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты, Решение (+2 more)

### Community 53 - "makeDoc"
Cohesion: 0.25
Nodes (3): DocumentModelTests, makeDoc(), RelativePositionTests

### Community 54 - "roadmap.md"
Cohesion: 0.14
Nodes (13): iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), D-08. Аннотации PDF пером — не в MVP, PDF pen annotations (PDFKit + stroke layer), Решение (предложение), PDF Annotations Not in MVP, R-08 Huge Project Scope (+5 more)

### Community 55 - "Контракт: модель документа (v1)"
Cohesion: 0.17
Nodes (11): 1. Три вида документов Yjs, 2. Документ `account`, 3. Документ `notebook` (индекс блокнота), 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note` (+3 more)

### Community 56 - "04-editor.md"
Cohesion: 0.15
Nodes (12): Obsidian (reference product: links, backlinks, tags, Markdown export), 4. Редактор, Backlinks, iOS editor: UIKit + TextKit 2, Link graph view (not in MVP, stage 6), Web editor: TipTap (ProseMirror) + Yjs, [[ ]] links with autocomplete, Платформенная реализация (+4 more)

### Community 57 - "Контракт: шифрование (v1)"
Cohesion: 0.18
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 59 - "tasks"
Cohesion: 0.18
Nodes (10): dependsOn, outputs, $schema, tasks, build, lint, test, typecheck (+2 more)

### Community 60 - "Stroke"
Cohesion: 0.09
Nodes (26): AnchorKind, block, drawing, image, text, InkTool, .drawsUnderText, highlighter (+18 more)

### Community 61 - "Контракт: REST API сервера (v1)"
Cohesion: 0.20
Nodes (9): Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1), Общее, Служебное, Токены агентов (`spec/09-agents-api.md`) (+1 more)

### Community 62 - "Контракт: протокол синхронизации (v1)"
Cohesion: 0.20
Nodes (9): 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05), 6. Права, 7. Коды ошибок, 8. Тестовые векторы (+1 more)

### Community 63 - "D-29. Graphify: порядок работы, чтобы граф был всегда актуален"
Cohesion: 0.24
Nodes (7): Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, D-29. Graphify: порядок работы, чтобы граф был всегда актуален, R-09 (риск: Graphify сломается или исчезнет), Контекст, Последствия, Решение, Раскладка graphify-out/ и что хранится в git

### Community 64 - "DocumentChange"
Cohesion: 0.19
Nodes (8): ChangeOrigin, local, redo, remote, textInput, undo, DocumentChange, .isEmpty

### Community 65 - "Op"
Cohesion: 0.22
Nodes (9): Op, addStroke, deleteItems, deleteNode, insertItems, insertNode, marks, removeStroke (+1 more)

### Community 66 - "git-хук Graphify (пересборка только по изменённому коду)"
Cohesion: 0.36
Nodes (7): Стартовый хук Claude Code (.claude/hooks/session-start.sh), git-хук Graphify (пересборка только по изменённому коду), Graphify 0.9.95 (пакет graphifyy), Смысловой слой графа (понятия, решения, связи — проход ИИ), Структурный слой графа (код, файлы, заголовки — без ИИ), Автоматизация: стартовый хук, git-хук, graphify update после git pull, Установка Graphify на Mac (brew install uv, uv tool install graphifyy)

### Community 67 - "3. Apple Pencil в тексте — ключевая фича"
Cohesion: 0.22
Nodes (9): 3. Apple Pencil в тексте — ключевая фича, Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера, Перекладка текста — вариант А «живой штрих» (D-05, РЕШЕНО) (+1 more)

### Community 68 - "12. Функции по мотивам Craft"
Cohesion: 0.22
Nodes (8): 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft, Связь с моделью данных

### Community 69 - "Codable"
Cohesion: 0.18
Nodes (7): File, FileItem, FileNode, FileStroke, Unit, atom, char

### Community 70 - "D-21. Технологический стек"
Cohesion: 0.18
Nodes (11): Утверждён технологический стек (D-21), отказ от ядра на Rust (D-22), D-21. Технологический стек, Контекст, Последствия, Рассмотренные варианты (по обсуждению 2026-10-25), Решение, D-22. Без собственного общего ядра на Rust, Контекст (+3 more)

### Community 71 - "InlineAtom"
Cohesion: 0.33
Nodes (3): InlineAtom, .plainText, attrs

### Community 72 - "Определение «готово» для любого изменения"
Cohesion: 0.36
Nodes (4): Скрипт tools/graphify_docs.py (prepare → агенты → finish), Обновление графа после правки документов (prepare → агенты → finish → export html → check-update), Промпт извлечения .claude/skills/graphify/references/extraction-spec.md, Команды Graphify (query, explain, path, update, check-update, /graphify)

### Community 73 - "09-agents-api.md"
Cohesion: 0.10
Nodes (21): D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Handwriting Format for Agents (PNG), Export: Markdown, PDF, HTML (handwriting as images), pg-boss background job queue on PostgreSQL, PostgreSQL via Drizzle (D-30): accounts, notebooks, rights, tokens, encrypted updates, snapshots, agent log, Server responsibilities: accounts, encrypted relay, attachments, realtime, API/MCP, handwriting PNG render, Local MCP bridge (future): local utility holding key for agent access to private notebooks (+13 more)

### Community 74 - "Контракт: рукописные штрихи (v1)"
Cohesion: 0.25
Nodes (7): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4. Привязка к тексту (живой штрих), 5. Отрисовка толщины, 6. Тестовые векторы, Контракт: рукописные штрихи (v1)

### Community 75 - "Соглашения"
Cohesion: 0.25
Nodes (8): Документация Datascratch, История, Как вносить изменения, Оглавление, Порядок чтения для новичка, Соглашения, Ссылки на решения, Статусы

### Community 76 - "0031-crdt-yjs.md"
Cohesion: 0.09
Nodes (24): D-05. Перо при перекладке текста — вариант А «живой штрих», PencilKit (rejected), Гипотеза реализации, Контекст, Последствия, Решение, Custom pen renderer (Metal vs Core Animation TBD), End-to-end encryption (+16 more)

### Community 77 - "Документация Datascratch (docs/README.md)"
Cohesion: 0.40
Nodes (5): Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Нумерация решений D-NN и файлы decisions/00NN-*.md, Документация Datascratch (docs/README.md), Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Оглавление docs/ (spec, architecture, decisions, roadmap, risks…)

### Community 78 - "D-28. Процесс разработки: облако + Mac, сборка iOS в CI"
Cohesion: 0.33
Nodes (6): Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), D-28. Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen (project.yml) - proposed, Контекст, Последствия, Решение

### Community 79 - "Открытые вопросы"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 80 - "D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS)"
Cohesion: 0.20
Nodes (10): Прототип пера хранит текст в Yrs (D-27), D-27. В прототипе пера текст хранится в Yrs, Контекст, Последствия, Решение, D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS), Контекст, Последствия (+2 more)

### Community 81 - "0013-collaboration-sharing.md"
Cohesion: 0.38
Nodes (5): D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account, Universal Links (paid Apple Developer account), Последствия, Решение

### Community 82 - "0016-no-import-now.md"
Cohesion: 0.33
Nodes (5): Notesnook, D-16. Импорт — не сейчас, Import from Obsidian/Notesnook (later), Решение, No import for now (D-16)

### Community 83 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.33
Nodes (5): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 84 - "0006-finger-drawing-iphone.md"
Cohesion: 0.40
Nodes (4): D-06. Рисование пальцем на iPhone — да, опционально, Finger drawing toggle on iPhone, Решение, iPhone client (primary, quick notes, finger drawing option D-06)

### Community 85 - "D-23. Документация — источник истины; Graphify — граф знаний поверх неё"
Cohesion: 0.50
Nodes (4): D-23. Документация — источник истины; Graphify — граф знаний поверх неё, Контекст, Последствия, Решение

### Community 86 - "D-32. Минимальная версия iOS/iPadOS — 26"
Cohesion: 0.40
Nodes (4): D-32. Минимальная версия iOS/iPadOS — 26, Последствия, Рассмотренные варианты, Решение

### Community 87 - "D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления"
Cohesion: 0.40
Nodes (4): D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления, Контекст, Рассмотренные варианты, Решение

### Community 88 - "D-39. Разработка параллельными сессиями; Claude сам вливает в main"
Cohesion: 0.40
Nodes (4): D-39. Разработка параллельными сессиями; Claude сам вливает в main, Контекст, Последствия, Решение

### Community 89 - "D-02. Отдельной десктоп-версии нет, на компьютере — веб"
Cohesion: 0.67
Nodes (3): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение

### Community 90 - "D-03. Платформы: нативные iPhone и iPad + полноценный веб"
Cohesion: 0.50
Nodes (4): D-03. Платформы: нативные iPhone и iPad + полноценный веб, Контекст, Последствия, Решение

### Community 91 - "D-35. Пометка на удалённом тексте исчезает вместе с ним"
Cohesion: 0.50
Nodes (3): D-35. Пометка на удалённом тексте исчезает вместе с ним, Рассмотренные варианты, Решение

### Community 92 - "D-36. Структура: пространство → блокноты → папки"
Cohesion: 0.50
Nodes (3): D-36. Структура: пространство → блокноты → папки, Рассмотренные варианты, Решение

### Community 93 - "D-38. Дизайн-направление — «Тихая бумага», ориентир Craft"
Cohesion: 0.50
Nodes (3): D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Рассмотренные варианты, Решение

### Community 94 - "D-41. Набор функций по мотивам Craft"
Cohesion: 0.50
Nodes (3): D-41. Набор функций по мотивам Craft, Контекст, Решение

### Community 96 - "D-18. Монетизация — не решена; архитектура готова к self-hosting"
Cohesion: 0.67
Nodes (3): D-18. Монетизация — не решена; архитектура готова к self-hosting, Контекст, Решение (на сейчас)

### Community 109 - "2. Платформы"
Cohesion: 0.50
Nodes (4): 2. Платформы, Минимальная версия iOS/iPadOS — ОТКРЫТО, Тестовые устройства (известно на 2026-10-25), Требования

## Knowledge Gaps
- **149 isolated node(s):** `keyword`, `string`, `comment`, `number`, `type` (+144 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 543 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` connect `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` to `Datascratch — правила для ИИ (CLAUDE.md)`, `git-хук Graphify (пересборка только по изменённому коду)`, `Процесс разработки (docs/development.md)`, `Определение «готово» для любого изменения`, `Скрипт обновления графа`, `06-data-server.md`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `InMemoryEditorDocument` (e.g. with `.strokesUndoTogetherWithText()` and `.textAndMarks()`) actually correct?**
  _`InMemoryEditorDocument` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `keyword`, `string`, `comment` to the rest of the system?**
  _149 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Why does `InMemoryEditorDocument` connect `InMemoryEditorDocument` to `DocumentChange`, `Op`, `Codable`, `BlockNode`, `.deleteText`, `ItemID`, `Node`, `DocumentStyle`, `makeDoc`, `EditorCommands`, `Foundation`, `Stroke`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Are the 12 inferred relationships involving `EditorCommands` (e.g. with `.crossParagraphReplace()` and `.indentAndOutdent()`) actually correct?**
  _`EditorCommands` has 12 INFERRED edges - model-reasoned connections that need verification._
- **Should `0005-living-stroke.md` be split into smaller, more focused modules?**
  _Cohesion score 0.13970588235294118 - nodes in this community are weakly interconnected._