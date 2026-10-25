# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 165 files · ~48,150 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 4, .css 3)

## Summary
- 1802 nodes · 3309 edges · 116 communities (105 shown, 11 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 265 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b8d7ffd3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Процесс разработки (docs/development.md)
- Monorepo layout (apps/ios, apps/web, apps/server, packages, infra)
- 04-editor.md
- Server stack
- 02-platforms.md
- Хранение в БД и редактор
- План разработки
- Дизайн и организация
- Процесс разработки и Graphify
- 10-sync.md
- Модель данных и глоссарий
- stack.md
- 06-data-server.md
- 0009-notebook-mode-choice.md
- Скрипт обновления графа
- 0023-documentation-source-of-truth.md
- Модель данных и глоссарий (2)
- generate.mjs
- 0031-crdt-yjs.md
- DSBackdrop
- cn
- risks.md
- DSDateChipModel
- open-questions.md
- 06-data-server.md (2)
- Платформы и клиенты (2)
- 09-agents-api.md
- components.test.tsx
- 0004-encryption-and-api.md
- index.ts
- 06-data-server.md (3)
- Технологический стек — РЕШЕНО (2026-10-25)
- Sendable
- open-questions.md (2)
- tokens.ts
- DSTintToken
- Обзор архитектуры: разделы
- DSInkToken
- DatePicker.tsx
- 7. Шифрование и доступ агентов
- 9. API и внешние ИИ-агенты
- 0005-living-stroke.md
- DSMotionToken
- open-questions.md (3)
- ios
- cn.ts
- DSButtonBody
- DSRGBA
- ui/package.json
- DSColorToken
- DSAvatar
- String
- DSTypeToken
- View
- index.d.ts
- design-tokens/package.json
- Dialog.tsx
- DSSidebarItem
- SwiftUI
- 2026-10-25
- package.json
- compilerOptions
- Документация Datascratch (docs/README.md)
- 0001-storage-in-database.md
- devDependencies
- DSSkeleton
- Компоненты
- DSStrings
- DSShadowToken
- Datascratch — правила для ИИ (CLAUDE.md)
- Контракт: модель документа (v1)
- iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)
- D-21. Технологический стек
- Контракт: шифрование (v1)
- 0003-platforms.md
- setup.ts
- Button.tsx
- tasks
- DSSegment
- Контракт: REST API сервера (v1)
- Контракт: протокол синхронизации (v1)
- D-29. Graphify: порядок работы, чтобы граф был всегда актуален
- compilerOptions
- Datascratch — правила для ИИ
- 3. Apple Pencil в тексте — ключевая фича
- 12. Функции по мотивам Craft
- peerDependencies
- 0010-agent-edits.md
- Контракт: дизайн-токены «Тихая бумага» (v1)
- 0016-no-import-now.md
- 0007-no-handwriting-recognition.md
- scripts
- 0014-organization.md
- D-32. Минимальная версия iOS/iPadOS — 26
- D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления
- 5. Организация заметок и дизайн
- @tailwindcss/vite
- vitest
- D-03. Платформы: нативные iPhone и iPad + полноценный веб
- D-35. Пометка на удалённом тексте исчезает вместе с ним
- D-36. Структура: пространство → блокноты → папки
- D-38. Дизайн-направление — «Тихая бумага», ориентир Craft
- D-41. Набор функций по мотивам Craft
- 2. Платформы
- Контракты между частями системы
- D-33. Bundle ID — com.datascratch.app
- D-37. Гости по ссылке рисуют; ссылка живёт до отзыва
- D-40. Хостинг — позже; сервер готов к запуску одной командой
- exports
- Package.swift
- agents/README.md
- design-tokens/README.md
- ui/README.md
- web-editor/README.md
- pnpm-workspace.yaml

## God Nodes (most connected - your core abstractions)
1. `cn()` - 80 edges
2. `DSTintToken` - 34 edges
3. `react` - 34 edges
4. `DSRGBA` - 31 edges
5. `DSColorToken` - 24 edges
6. `useStrings()` - 21 edges
7. `Компоненты` - 21 edges
8. `DSTypeToken` - 20 edges
9. `Showcase()` - 19 edges
10. `DSColorPair` - 17 edges

## Surprising Connections (you probably didn't know these)
- `2. Поля штриха` --references--> `block()`  [INFERRED]
  docs/architecture/contracts/strokes.md → packages/design-tokens/scripts/generate.mjs
- `3. Упаковка точек` --references--> `block()`  [INFERRED]
  docs/architecture/contracts/strokes.md → packages/design-tokens/scripts/generate.mjs
- `Определение «готово» для любого изменения` --semantically_similar_to--> `Как вносить изменения — всё в одном коммите`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/README.md
- `Фрагменты журнала изменений` --references--> `main()`  [INFERRED]
  docs/changelog.d/README.md → packages/design-tokens/scripts/generate.mjs
- `Решение` --references--> `main()`  [INFERRED]
  docs/decisions/0039-parallel-sessions.md → packages/design-tokens/scripts/generate.mjs

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

## Communities (116 total, 11 thin omitted)

### Community 0 - "Процесс разработки (docs/development.md)"
Cohesion: 0.15
Nodes (16): Стартовый хук Claude Code (.claude/hooks/session-start.sh), D-23 (документация), git-хук Graphify (пересборка только по изменённому коду), Скрипт tools/graphify_docs.py (prepare → агенты → finish), Graphify 0.9.95 (пакет graphifyy), Смысловой слой графа (понятия, решения, связи — проход ИИ), Структурный слой графа (код, файлы, заголовки — без ИИ), Автоматизация: стартовый хук, git-хук, graphify update после git pull (+8 more)

### Community 1 - "Monorepo layout (apps/ios, apps/web, apps/server, packages, infra)"
Cohesion: 0.11
Nodes (15): apps/ios — iPhone + iPad, apps/server — сервер, apps/web — веб-клиент, 6. Модель данных и сервер, Self-hosting, Модель данных (общий обзор; детали — `architecture/data-model.md`), Резервные копии, Сервер (+7 more)

### Community 2 - "04-editor.md"
Cohesion: 0.14
Nodes (13): Obsidian (reference product: links, backlinks, tags, Markdown export), 4. Редактор, Backlinks, Editor content (headings, lists, tables, code, formulas, attachments, drawing blocks), iOS editor: UIKit + TextKit 2, Link graph view (not in MVP, stage 6), Web editor: TipTap (ProseMirror) + Yjs, [[ ]] links with autocomplete (+5 more)

### Community 3 - "Server stack"
Cohesion: 0.05
Nodes (44): Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, Обоснованы PostgreSQL (D-30) и Yjs (D-31) как отдельные решения, Убран Redis (D-25): один процесс сервера, очередь — pg-boss на PostgreSQL, Прототип пера хранит текст в Yrs (D-27), Canvas + Pointer Events, Dexie (IndexedDB), Drizzle ORM, Fastify (+36 more)

### Community 4 - "02-platforms.md"
Cohesion: 0.16
Nodes (11): D-06. Рисование пальцем на iPhone — да, опционально, Finger drawing toggle on iPhone, Решение, D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, UI languages Russian and English, no RTL (D-17), iPad client (primary, Pencil / Pencil Pro, hover, Stage Manager) (+3 more)

### Community 5 - "Хранение в БД и редактор"
Cohesion: 0.16
Nodes (12): D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account, Universal Links (paid Apple Developer account), Последствия, Решение, 8. Совместная работа и шеринг, Guest editing without account in any browser, Share links with view/edit rights, expiry and revocation (+4 more)

### Community 6 - "План разработки"
Cohesion: 0.17
Nodes (12): Критерии приёмки, План разработки, Подготовка, Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad), Этап 2 — MVP на iPad и iPhone, локально (+4 more)

### Community 7 - "Дизайн и организация"
Cohesion: 0.17
Nodes (11): D-15. Дизайн — основная концепция продукта, Design references: Things 3, Linear, Craft, Arc, Последствия, Решение, Light/dark theme, Dynamic Type, VoiceOver, full iPad keyboard, Feel references: Things 3, Linear, Craft, Arc, Own design system unified on iOS and web, Design tokens as single source for both platforms (format at stage 2) (+3 more)

### Community 8 - "Процесс разработки и Graphify"
Cohesion: 0.15
Nodes (12): Git, Graphify, Автоматизация, Две среды, Команды, Конец сессии, Кто что делает, Обновление графа после правки документов (по шагам) (+4 more)

### Community 9 - "10-sync.md"
Cohesion: 0.12
Nodes (15): Attachments as separate encrypted files, on-demand resumable download, Real-time co-editing with cursors and presence (guests shown as 'Guest'), Agent edits applied immediately, highlighted, revertible via history (D-10), 10. Синхронизация и офлайн, Chunked resumable attachments; thumbnails-only on iPhone, Local storage: SQLite via GRDB (iOS), IndexedDB via Dexie (web), Real time when a note is open on two devices (WebSocket, in-process broadcast), Agent notebooks: server decrypts and applies agent edit as a normal update (+7 more)

### Community 10 - "Модель данных и глоссарий"
Cohesion: 0.12
Nodes (28): agent_tokens / agent_audit_log Tables, Server PostgreSQL Schema (Stage 3 Draft), Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, File Storage (disk or external S3), Guest via Link (web, no account) (+20 more)

### Community 11 - "stack.md"
Cohesion: 0.13
Nodes (21): Web PWA Client (React, TipTap, Yjs, IndexedDB), Astro (landing page), Dexie (IndexedDB), Drizzle ORM, Fastify, GRDB (SQLite), Custom iOS Pen Render Layer (Metal or Core Animation), TypeScript on Node.js (+13 more)

### Community 12 - "06-data-server.md"
Cohesion: 0.18
Nodes (14): Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), MinIO (rejected), Scaling via PostgreSQL LISTEN/NOTIFY, Redis (rejected), WebSocket In-Process Broadcast, Edit broadcast interface (in-memory), PostgreSQL LISTEN/NOTIFY, Redis (rejected) (+6 more)

### Community 13 - "0009-notebook-mode-choice.md"
Cohesion: 0.17
Nodes (11): D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, Notesnook (reference product: E2E encryption, reliable sync), Space -> notebook -> folder relation (open; encryption mode per notebook, D-09), Argon2id password key derivation, libsodium on all platforms (swift-sodium, libsodium-wrappers), Per-notebook key wrapped by user master key or server key, Private notebooks: key from password, server stores only ciphertext, no agent access (+3 more)

### Community 14 - "Скрипт обновления графа"
Cohesion: 0.28
Nodes (7): Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 15 - "0023-documentation-source-of-truth.md"
Cohesion: 0.14
Nodes (9): D-19. Весь код пишет Claude, Последствия, Решение, D-23. Документация — источник истины; Graphify — граф знаний поверх неё, docs/history session log, Контекст, Последствия, Решение (+1 more)

### Community 16 - "Модель данных и глоссарий (2)"
Cohesion: 0.14
Nodes (17): Anchor (textRange / paragraph / drawingBlock / image), Note, Organization Hierarchy (Account > Space > Notebook > Folder > Note), Stroke, StrokePoint, Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК (+9 more)

### Community 17 - "generate.mjs"
Cohesion: 0.06
Nodes (53): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4. Привязка к тексту (живой штрих), 5. Отрисовка толщины, 6. Тестовые векторы, Контракт: рукописные штрихи (v1), Фрагменты журнала изменений (+45 more)

### Community 18 - "0031-crdt-yjs.md"
Cohesion: 0.11
Nodes (26): Automerge (fallback CRDT), Yrs (Rust Yjs) with Swift Wrapper, Custom pen renderer (Metal vs Core Animation TBD), End-to-end encryption, iOS client stack, Node.js + TypeScript server, Swift 6, SwiftUI (shell) (+18 more)

### Community 19 - "DSBackdrop"
Cohesion: 0.06
Nodes (27): BackdropGallery, .body, DSBackdrop, .body, DSGrain, .body, GrainPattern, SplitMix64 (+19 more)

### Community 20 - "cn"
Cohesion: 0.08
Nodes (40): CommandItem(), CommandItemProps, CommandPalette(), CommandPaletteProps, ContextMenuCheckboxItem, ContextMenuGroup, ContextMenuItemProps, ContextMenuLabel() (+32 more)

### Community 21 - "risks.md"
Cohesion: 0.10
Nodes (19): doc_snapshots Table (compacted snapshots, version history), doc_updates Table (encrypted Yjs updates), Monorepo Structure (apps/, packages/, infra/), packages/test-vectors, libsodium (swift-sodium), End-to-End Encryption (E2E), Snapshot, Test Vectors (+11 more)

### Community 22 - "DSDateChipModel"
Cohesion: 0.08
Nodes (21): DateChipPreview, .body, DSDateChip, .body, .color, DSDateChipModel, Tone, done (+13 more)

### Community 23 - "open-questions.md"
Cohesion: 0.10
Nodes (24): GitHub Actions CI (incl. macOS iOS builds), XcodeGen, GRDB (SQLite), D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст, Решение (+16 more)

### Community 24 - "06-data-server.md (2)"
Cohesion: 0.19
Nodes (10): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, Контекст, Решение (на сейчас) (+2 more)

### Community 25 - "Платформы и клиенты (2)"
Cohesion: 0.20
Nodes (7): D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, 1. Концепция продукта, Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения, Суть в одном абзаце

### Community 26 - "09-agents-api.md"
Cohesion: 0.14
Nodes (15): D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Handwriting Format for Agents (PNG), Export: Markdown, PDF, HTML (handwriting as images), pg-boss background job queue on PostgreSQL, PostgreSQL via Drizzle (D-30): accounts, notebooks, rights, tokens, encrypted updates, snapshots, agent log, Server responsibilities: accounts, encrypted relay, attachments, realtime, API/MCP, handwriting PNG render, Local MCP bridge (future): local utility holding key for agent access to private notebooks (+7 more)

### Community 27 - "components.test.tsx"
Cohesion: 0.10
Nodes (36): Backdrop(), DocCard, TaskCheckbox, ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator(), ContextMenuTrigger (+28 more)

### Community 28 - "0004-encryption-and-api.md"
Cohesion: 0.29
Nodes (6): D-04. Одновременно сквозное шифрование и доступ по API, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), Контекст, Последствия, Решение

### Community 29 - "index.ts"
Cohesion: 0.11
Nodes (25): Provider(), Skeleton(), SkeletonProps, icons, ToastApi, ToastContext, ToastItem, ToastOptions (+17 more)

### Community 30 - "06-data-server.md (3)"
Cohesion: 0.20
Nodes (9): Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps, Daily off-VPS backups of DB and files with verified restore (R-11), 11. Нефункциональные требования, Performance targets (PencilKit latency, 120 fps, 300 ms open, 1-min first sync, 2 s delivery, 1 s cold start), Reliability: no edit lost on network drop, crash or low storage, Доступность, Надёжность, Ресурсы сервера (+1 more)

### Community 31 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 32 - "Sendable"
Cohesion: 0.10
Nodes (27): .color, .uiColor, DSColorPair, DSFontFamily, display, mono, text, DSFontWeight (+19 more)

### Community 33 - "open-questions.md (2)"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 34 - "tokens.ts"
Cohesion: 0.10
Nodes (22): backdropNames, colorNames, highlightNames, inkNames, tintNames, tokens, Avatar(), AvatarProps (+14 more)

### Community 35 - "DSTintToken"
Cohesion: 0.07
Nodes (27): Color, .dsAccent, .dsCanvas, .dsDanger, .dsElevated, .dsPrimary, .dsSecondary, .dsSeparator (+19 more)

### Community 36 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 37 - "DSInkToken"
Cohesion: 0.08
Nodes (26): .color, .color, DSDocumentWidth, full, normal, .points, wide, DSDuration (+18 more)

### Community 38 - "DatePicker.tsx"
Cohesion: 0.14
Nodes (24): DateChipProps, tones, Calendar(), CalendarProps, DatePicker(), DatePickerProps, Popover, PopoverAnchor (+16 more)

### Community 39 - "7. Шифрование и доступ агентов"
Cohesion: 0.33
Nodes (6): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 40 - "9. API и внешние ИИ-агенты"
Cohesion: 0.33
Nodes (6): 9. API и внешние ИИ-агенты, Агент умеет, Безопасность, Набросок инструментов MCP (ПРЕДЛОЖЕНО), Правки агента (D-10), Реализация

### Community 41 - "0005-living-stroke.md"
Cohesion: 0.09
Nodes (18): D-05. Перо при перекладке текста — вариант А «живой штрих», PencilKit (rejected), Гипотеза реализации, Контекст, Последствия, Решение, D-08. Аннотации PDF пером — не в MVP, PDF pen annotations (PDFKit + stroke layer) (+10 more)

### Community 42 - "DSMotionToken"
Cohesion: 0.11
Nodes (14): .body, Animation, DSAnimationModifier, .animation, DSPressableStyle, .animation, View, withDSAnimation() (+6 more)

### Community 43 - "open-questions.md (3)"
Cohesion: 0.40
Nodes (5): docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, iOS build and tests on macOS CI runner per push

### Community 44 - "ios"
Cohesion: 0.08
Nodes (26): concurrency, cancel-in-progress, group, run, defaults, name, runs-on, steps (+18 more)

### Community 45 - "cn.ts"
Cohesion: 0.09
Nodes (19): BackdropProps, Card, CardProps, coverHeights, DocCardProps, pads, titleSizes, Checkbox (+11 more)

### Community 46 - "DSButtonBody"
Cohesion: 0.10
Nodes (18): ButtonsPreview, .body, ButtonStyle, DSButtonBody, .body, .fill, .foreground, .height (+10 more)

### Community 47 - "DSRGBA"
Cohesion: 0.12
Nodes (14): .color, .uiColor, DSBackdropBlob, DSBackdropSpec, DSRGBA, .hex, DSBackdropToken, .dark (+6 more)

### Community 48 - "ui/package.json"
Cohesion: 0.10
Nodes (24): dependencies, clsx@^2.1.1, cmdk@^1.1.1, @datascratch/design-tokens@workspace:*, @fontsource-variable/inter@^5.3.0, @fontsource-variable/jetbrains-mono@^5.3.0, @fontsource-variable/newsreader@^5.3.0, lucide-react@^1.61.0 (+16 more)

### Community 49 - "DSColorToken"
Cohesion: 0.10
Nodes (16): .color, DSColorToken, accent, bgCanvas, bgElevated, bgSidebar, bgSurface, danger (+8 more)

### Community 50 - "DSAvatar"
Cohesion: 0.18
Nodes (11): AvatarPreview, .body, DSAvatar, .body, .presenceLabel, DSAvatarStack, .body, DSPresence (+3 more)

### Community 51 - "String"
Cohesion: 0.14
Nodes (11): DSCheckmark, DSTaskCheckbox, .body, .isDone, DSTaskState, cancelled, done, open (+3 more)

### Community 52 - "DSTypeToken"
Cohesion: 0.12
Nodes (12): DSFontModifier, View, DSTypeToken, body, callout, caption, footnote, h1 (+4 more)

### Community 53 - "View"
Cohesion: 0.16
Nodes (12): ChipsPreview, .body, DSBadge, .body, .colors, DSTagChip, .body, Style (+4 more)

### Community 54 - "index.d.ts"
Cohesion: 0.11
Nodes (18): BackdropBlob, BackdropName, BackdropSpec, ColorName, DurationName, HighlightName, InkName, MotionName (+10 more)

### Community 55 - "design-tokens/package.json"
Cohesion: 0.11
Nodes (17): description, exports, ./theme.css, ./tokens.css, ./tokens.json, files, main, name (+9 more)

### Community 56 - "Dialog.tsx"
Cohesion: 0.15
Nodes (16): DialogClose, DialogContent, DialogContentProps, DialogTrigger, Sheet, SheetClose, SheetContent, SheetContentProps (+8 more)

### Community 57 - "DSSidebarItem"
Cohesion: 0.22
Nodes (8): DSSidebarItem, .body, .disclosure, DSSidebarSection, .body, .isExpanded, SidebarPreview, .body

### Community 58 - "SwiftUI"
Cohesion: 0.17
Nodes (9): DSFeedback, delete, selection, .sensoryFeedback, taskComplete, DSHaptics, View, SwiftUI (+1 more)

### Community 59 - "2026-10-25"
Cohesion: 0.13
Nodes (15): 2026-10-25, Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Утверждён технологический стек (D-21), отказ от ядра на Rust (D-22), Журнал изменений, D-22. Без собственного общего ядра на Rust, Контекст, Последствия (+7 more)

### Community 60 - "package.json"
Cohesion: 0.14
Nodes (15): devDependencies, turbo@^2.3.0, typescript@^5.6.0, engines, node, typescript, name, packageManager (+7 more)

### Community 61 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+7 more)

### Community 62 - "Документация Datascratch (docs/README.md)"
Cohesion: 0.14
Nodes (13): Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Нумерация решений D-NN и файлы decisions/00NN-*.md, Документация Datascratch (docs/README.md), Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Оглавление docs/ (spec, architecture, decisions, roadmap, risks…), Документация Datascratch, История, Как вносить изменения (+5 more)

### Community 63 - "0001-storage-in-database.md"
Cohesion: 0.16
Nodes (10): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты, Решение (+2 more)

### Community 64 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, jsdom@^30.1.3, @ladle/react@^5.1.1, react@^19.3.1, @testing-library/react@^16.3.3, @testing-library/user-event@^14.6.8, @types/react@^19.3.0, @types/react-dom@^19.3.0 (+7 more)

### Community 65 - "DSSkeleton"
Cohesion: 0.23
Nodes (8): DSSkeleton, .body, DSSkeletonLines, .body, DSSpinner, .body, SkeletonPreview, .body

### Community 66 - "Компоненты"
Cohesion: 0.20
Nodes (7): DSDesign — дизайн-система «Тихая бумага» для iOS, Как пользоваться, Компоненты, Сборка и тесты, Токены, DSEmptyState, .body

### Community 67 - "DSStrings"
Cohesion: 0.32
Nodes (11): DSStrings, .away, .cancelled, .collapse, .collapsed, .done, .expand, .expanded (+3 more)

### Community 68 - "DSShadowToken"
Cohesion: 0.20
Nodes (7): DSShadowModifier, View, DSShadowToken, card, .dark, .light, popover

### Community 69 - "Datascratch — правила для ИИ (CLAUDE.md)"
Cohesion: 0.21
Nodes (9): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, D-28 (облако + Mac, CI), GitHub Actions на macOS — проверка сборки iOS, Две среды: облачная сессия Claude Code (Linux) и Mac пользователя (+1 more)

### Community 70 - "Контракт: модель документа (v1)"
Cohesion: 0.17
Nodes (11): 1. Три вида документов Yjs, 2. Документ `account`, 3. Документ `notebook` (индекс блокнота), 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note` (+3 more)

### Community 71 - "iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)"
Cohesion: 0.20
Nodes (8): iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), iPhone and iPad share one codebase (universal app), Web client as full desktop replacement (Pointer Events pressure, offline PWA), packages/shared — общие TypeScript-типы и схемы, Shared TypeScript types and schemas (document, strokes, metadata, sync protocol, API), packages/test-vectors — общие тестовые векторы

### Community 72 - "D-21. Технологический стек"
Cohesion: 0.18
Nodes (10): Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел), D-21. Технологический стек, Контекст, Последствия, Рассмотренные варианты (по обсуждению 2026-10-25), Решение, Конец сессии: файл в docs/history + roadmap/open-questions (+2 more)

### Community 73 - "Контракт: шифрование (v1)"
Cohesion: 0.18
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 74 - "0003-platforms.md"
Cohesion: 0.27
Nodes (4): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, Full-featured web client (TypeScript)

### Community 75 - "setup.ts"
Cohesion: 0.18
Nodes (3): @testing-library/jest-dom@^7.0.1, RO, @testing-library/jest-dom

### Community 76 - "Button.tsx"
Cohesion: 0.24
Nodes (9): Button, buttonClasses(), ButtonProps, ButtonSize, ButtonVariant, sizes, variants, Spinner() (+1 more)

### Community 77 - "tasks"
Cohesion: 0.18
Nodes (10): dependsOn, outputs, $schema, tasks, build, lint, test, typecheck (+2 more)

### Community 78 - "DSSegment"
Cohesion: 0.31
Nodes (5): DSSegment, .id, DSSegmentedControl, SegmentedPreview, .body

### Community 79 - "Контракт: REST API сервера (v1)"
Cohesion: 0.20
Nodes (9): Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1), Общее, Служебное, Токены агентов (`spec/09-agents-api.md`) (+1 more)

### Community 80 - "Контракт: протокол синхронизации (v1)"
Cohesion: 0.20
Nodes (9): 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05), 6. Права, 7. Коды ошибок, 8. Тестовые векторы (+1 more)

### Community 81 - "D-29. Graphify: порядок работы, чтобы граф был всегда актуален"
Cohesion: 0.24
Nodes (7): Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, D-29. Graphify: порядок работы, чтобы граф был всегда актуален, R-09 (риск: Graphify сломается или исчезнет), Контекст, Последствия, Решение, Раскладка graphify-out/ и что хранится в git

### Community 82 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, declaration, jsx, lib, noEmit, types, extends, include (+1 more)

### Community 83 - "Datascratch — правила для ИИ"
Cohesion: 0.22
Nodes (8): Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой, Правила, Среда разработки, Создан CLAUDE.md и скелет монорепозитория (apps/, packages/, infra/)

### Community 84 - "3. Apple Pencil в тексте — ключевая фича"
Cohesion: 0.22
Nodes (9): 3. Apple Pencil в тексте — ключевая фича, Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера, Перекладка текста — вариант А «живой штрих» (D-05, РЕШЕНО) (+1 more)

### Community 85 - "12. Функции по мотивам Craft"
Cohesion: 0.22
Nodes (8): 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft, Связь с моделью данных

### Community 86 - "peerDependencies"
Cohesion: 0.25
Nodes (8): react-dom@^19.3.1, tailwindcss@^4.3.3, peerDependencies, react@^19.0.0, react-dom@^19.0.0, tailwindcss@^4.0.0, react-dom, tailwindcss

### Community 87 - "0010-agent-edits.md"
Cohesion: 0.33
Nodes (5): D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение

### Community 88 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.33
Nodes (5): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 89 - "0016-no-import-now.md"
Cohesion: 0.33
Nodes (5): Notesnook, D-16. Импорт — не сейчас, Import from Obsidian/Notesnook (later), Решение, No import for now (D-16)

### Community 90 - "0007-no-handwriting-recognition.md"
Cohesion: 0.33
Nodes (5): D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, Handwriting input types (text marks, margin notes, drawing block, drawing on images, Scribble), System Scribble only; no recognition of drawn ink (D-07)

### Community 91 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, dev, lint, showcase:build, test, typecheck

### Community 92 - "0014-organization.md"
Cohesion: 0.40
Nodes (4): D-14. Организация: богатая, но не перегруженная, Spaces, nested folders, smart tags, colors, Решение, Organization Structure (notebook vs space vs folder)

### Community 93 - "D-32. Минимальная версия iOS/iPadOS — 26"
Cohesion: 0.40
Nodes (4): D-32. Минимальная версия iOS/iPadOS — 26, Последствия, Рассмотренные варианты, Решение

### Community 94 - "D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления"
Cohesion: 0.40
Nodes (4): D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления, Контекст, Рассмотренные варианты, Решение

### Community 95 - "5. Организация заметок и дизайн"
Cohesion: 0.40
Nodes (5): 5. Организация заметок и дизайн, Дизайн (D-15 — РЕШЕНО, главный принцип продукта), Организация (D-14 — РЕШЕНО по сути; структура ниже — ПРЕДЛОЖЕНО), Принципы, Реализация

### Community 96 - "@tailwindcss/vite"
Cohesion: 0.40
Nodes (4): @tailwindcss/vite@^4.3.3, vite@^8.3.5, @tailwindcss/vite, vite

### Community 97 - "vitest"
Cohesion: 0.40
Nodes (4): @vitejs/plugin-react@^6.1.2, vitest@^5.0.5, @vitejs/plugin-react, vitest

### Community 98 - "D-03. Платформы: нативные iPhone и iPad + полноценный веб"
Cohesion: 0.50
Nodes (4): D-03. Платформы: нативные iPhone и iPad + полноценный веб, Контекст, Последствия, Решение

### Community 99 - "D-35. Пометка на удалённом тексте исчезает вместе с ним"
Cohesion: 0.50
Nodes (3): D-35. Пометка на удалённом тексте исчезает вместе с ним, Рассмотренные варианты, Решение

### Community 100 - "D-36. Структура: пространство → блокноты → папки"
Cohesion: 0.50
Nodes (3): D-36. Структура: пространство → блокноты → папки, Рассмотренные варианты, Решение

### Community 101 - "D-38. Дизайн-направление — «Тихая бумага», ориентир Craft"
Cohesion: 0.50
Nodes (3): D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Рассмотренные варианты, Решение

### Community 102 - "D-41. Набор функций по мотивам Craft"
Cohesion: 0.50
Nodes (3): D-41. Набор функций по мотивам Craft, Контекст, Решение

### Community 103 - "2. Платформы"
Cohesion: 0.50
Nodes (4): 2. Платформы, Минимальная версия iOS/iPadOS — ОТКРЫТО, Тестовые устройства (известно на 2026-10-25), Требования

### Community 108 - "exports"
Cohesion: 0.67
Nodes (3): exports, ./fonts.css, ./styles.css

## Knowledge Gaps
- **190 isolated node(s):** `PackageDescription`, `none`, `online`, `away`, `.presenceLabel` (+185 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 724 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` connect `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` to `Процесс разработки (docs/development.md)`, `Datascratch — правила для ИИ (CLAUDE.md)`, `D-21. Технологический стек`, `Скрипт обновления графа`, `0023-documentation-source-of-truth.md`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `DSRGBA` (e.g. with `.dark` and `.light`) actually correct?**
  _`DSRGBA` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PackageDescription`, `none`, `online` to the rest of the system?**
  _190 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Monorepo layout (apps/ios, apps/web, apps/server, packages, infra)` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Why does `Компоненты` connect `Компоненты` to `DSSkeleton`, `DSButtonBody`, `DSSegment`, `DSAvatar`, `DSBackdrop`, `String`, `View`, `DSDateChipModel`, `DSSidebarItem`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Should `04-editor.md` be split into smaller, more focused modules?**
  _Cohesion score 0.13970588235294118 - nodes in this community are weakly interconnected._
- **Why does `DSTintToken` connect `DSTintToken` to `Sendable`, `Компоненты`, `DSInkToken`, `DSAvatar`, `DSBackdrop`, `String`, `View`, `DSSidebarItem`, `SwiftUI`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._