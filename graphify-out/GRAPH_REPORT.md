# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 165 files · ~48,159 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 4, .css 3)

## Summary
- 1822 nodes · 3290 edges · 127 communities (116 shown, 11 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 265 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `947d67fc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Процесс разработки (docs/development.md)
- 06-data-server.md
- 04-editor.md
- 0025-no-redis.md
- 02-platforms.md
- Хранение в БД и редактор
- План разработки
- Дизайн и организация
- Процесс разработки и Graphify
- 10-sync.md
- Модель данных и глоссарий
- stack.md
- 06-data-server.md
- 0004-encryption-and-api.md
- Скрипт обновления графа
- D-23. Документация — источник истины; Graphify — граф знаний поверх неё
- data-model.md
- generate.mjs
- 0031-crdt-yjs.md
- DSBackdrop
- cn
- DSDocCard
- DSDateChipModel
- glossary.md
- 06-data-server.md (2)
- 1. Концепция продукта
- 09-agents-api.md
- components.test.tsx
- D-04. Одновременно сквозное шифрование и доступ по API
- index.ts
- react
- Технологический стек — РЕШЕНО (2026-10-25)
- Sendable
- open-questions.md (2)
- tokens.ts
- DSTintToken
- Обзор архитектуры: разделы
- DSInkToken
- DatePicker.tsx
- 7. Шифрование и доступ агентов
- D-30. База данных сервера — PostgreSQL
- risks.md
- DSMotionToken
- open-questions.md (3)
- ios
- Card.tsx
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
- Overview.stories.tsx
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
- String
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
- 03-pencil.md
- 12. Функции по мотивам Craft
- peerDependencies
- open-questions.md
- Контракт: дизайн-токены «Тихая бумага» (v1)
- 0016-no-import-now.md
- Server stack
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
- iOS client stack
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
- 0005-living-stroke.md
- DSBackdropToken
- Server PostgreSQL Schema (Stage 3 Draft)
- 0010-agent-edits.md
- 0011-handwriting-for-agents.md
- 01-concept.md
- D-28. Процесс разработки: облако + Mac, сборка iOS в CI
- 9. API и внешние ИИ-агенты
- Private notebooks: key from password, server stores only ciphertext, no agent access
- 2. Платформы
- D-19. Весь код пишет Claude

## God Nodes (most connected - your core abstractions)
1. `cn()` - 80 edges
2. `react` - 34 edges
3. `DSTintToken` - 34 edges
4. `DSRGBA` - 31 edges
5. `DSColorToken` - 24 edges
6. `useStrings()` - 21 edges
7. `Компоненты` - 21 edges
8. `DSTypeToken` - 20 edges
9. `radix-ui` - 17 edges
10. `DSInkToken` - 17 edges

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

## Communities (127 total, 11 thin omitted)

### Community 0 - "Процесс разработки (docs/development.md)"
Cohesion: 0.15
Nodes (16): Стартовый хук Claude Code (.claude/hooks/session-start.sh), D-23 (документация), git-хук Graphify (пересборка только по изменённому коду), Скрипт tools/graphify_docs.py (prepare → агенты → finish), Graphify 0.9.95 (пакет graphifyy), Смысловой слой графа (понятия, решения, связи — проход ИИ), Структурный слой графа (код, файлы, заголовки — без ИИ), Автоматизация: стартовый хук, git-хук, graphify update после git pull (+8 more)

### Community 1 - "06-data-server.md"
Cohesion: 0.11
Nodes (18): Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), 6. Модель данных и сервер, Daily off-VPS backups of DB and files with verified restore (R-11), App server: Node.js + TypeScript (Fastify), Metadata: title, tags, links, dates, space, folder, Self-hosting, Модель данных (общий обзор; детали — `architecture/data-model.md`), Резервные копии (+10 more)

### Community 2 - "04-editor.md"
Cohesion: 0.20
Nodes (8): 4. Редактор, iOS editor: UIKit + TextKit 2, Link graph view (not in MVP, stage 6), Web editor: TipTap (ProseMirror) + Yjs, Платформенная реализация, Прочее, Связи, Содержимое

### Community 3 - "0025-no-redis.md"
Cohesion: 0.13
Nodes (19): Убран Redis (D-25): один процесс сервера, очередь — pg-boss на PostgreSQL, pg-boss job queue, D-25. Redis не используем, Edit broadcast interface (in-memory), PostgreSQL LISTEN/NOTIFY, Redis (rejected), Valkey (free Redis alternative), Будущее (+11 more)

### Community 4 - "02-platforms.md"
Cohesion: 0.15
Nodes (12): D-06. Рисование пальцем на iPhone — да, опционально, Finger drawing toggle on iPhone, Решение, D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, UI languages Russian and English, no RTL (D-17), iPad client (primary, Pencil / Pencil Pro, hover, Stage Manager) (+4 more)

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
Cohesion: 0.13
Nodes (13): Attachments as separate encrypted files, on-demand resumable download, XChaCha20-Poly1305 content encryption, Real-time co-editing with cursors and presence (guests shown as 'Guest'), 10. Синхронизация и офлайн, Chunked resumable attachments; thumbnails-only on iPhone, Local storage: SQLite via GRDB (iOS), IndexedDB via Dexie (web), Real time when a note is open on two devices (WebSocket, in-process broadcast), Trash for 30 days (+5 more)

### Community 10 - "Модель данных и глоссарий"
Cohesion: 0.12
Nodes (27): agent_tokens / agent_audit_log Tables, Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, File Storage (disk or external S3), Guest via Link (web, no account), Handwriting-to-PNG Render (pg-boss queue) (+19 more)

### Community 11 - "stack.md"
Cohesion: 0.12
Nodes (22): Web PWA Client (React, TipTap, Yjs, IndexedDB), Astro (landing page), Automerge (fallback CRDT), Dexie (IndexedDB), Drizzle ORM, Fastify, GRDB (SQLite), TypeScript on Node.js (+14 more)

### Community 12 - "06-data-server.md"
Cohesion: 0.19
Nodes (12): MinIO (rejected), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Server disk folder storage (default), External S3-compatible storage (Hetzner, R2, B2), File storage interface (two implementations, chosen by config), Garage / SeaweedFS, MinIO (rejected) (+4 more)

### Community 13 - "0004-encryption-and-api.md"
Cohesion: 0.27
Nodes (6): End-to-end encryption vs agent API access conflict, Local MCP bridge (future), D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, Space -> notebook -> folder relation (open; encryption mode per notebook, D-09), Two notebook modes chosen at creation, switchable with client re-encryption (D-09)

### Community 14 - "Скрипт обновления графа"
Cohesion: 0.28
Nodes (7): Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 15 - "D-23. Документация — источник истины; Graphify — граф знаний поверх неё"
Cohesion: 0.50
Nodes (4): D-23. Документация — источник истины; Graphify — граф знаний поверх неё, Контекст, Последствия, Решение

### Community 16 - "data-model.md"
Cohesion: 0.22
Nodes (11): Anchor (textRange / paragraph / drawingBlock / image), Note, Stroke, StrokePoint, Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3) (+3 more)

### Community 17 - "generate.mjs"
Cohesion: 0.06
Nodes (53): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4. Привязка к тексту (живой штрих), 5. Отрисовка толщины, 6. Тестовые векторы, Контракт: рукописные штрихи (v1), Фрагменты журнала изменений (+45 more)

### Community 18 - "0031-crdt-yjs.md"
Cohesion: 0.15
Nodes (14): End-to-end encryption, libsodium, docs/history session log, Pen prototype (stage 1), Automerge (fallback CRDT), Encrypted history compaction by clients (R-05, stage 3), Last-write-wins (unsuitable), Loro (too early) (+6 more)

### Community 19 - "DSBackdrop"
Cohesion: 0.16
Nodes (7): BackdropGallery, .body, DSBackdrop, .body, DSGrain, GrainPattern, SplitMix64

### Community 20 - "cn"
Cohesion: 0.08
Nodes (43): CommandItem(), ContextMenu, ContextMenuCheckboxItem, ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuItemProps, ContextMenuLabel() (+35 more)

### Community 21 - "DSDocCard"
Cohesion: 0.25
Nodes (8): CardsPreview, .body, DSCard, .body, DSDocCard, .body, View, .background

### Community 22 - "DSDateChipModel"
Cohesion: 0.08
Nodes (21): DateChipPreview, .body, DSDateChip, .body, .color, DSDateChipModel, Tone, done (+13 more)

### Community 23 - "glossary.md"
Cohesion: 0.15
Nodes (20): GitHub Actions CI (incl. macOS iOS builds), Custom iOS Pen Render Layer (Metal or Core Animation), TextKit 2 (UIKit editor), Canvas + Pointer Events Pen Layer, XcodeGen, Mixed cloud + Mac development mode, ADR (Architecture Decision Record), Living Stroke (+12 more)

### Community 24 - "06-data-server.md (2)"
Cohesion: 0.19
Nodes (10): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, Контекст, Решение (на сейчас) (+2 more)

### Community 25 - "1. Концепция продукта"
Cohesion: 0.33
Nodes (6): 1. Концепция продукта, Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения, Суть в одном абзаце

### Community 26 - "09-agents-api.md"
Cohesion: 0.22
Nodes (8): Local MCP bridge (future): local utility holding key for agent access to private notebooks, Agent capabilities: search/read Markdown, block-level edits, comments, links/tags/backlinks, Agent edits applied immediately, highlighted, revertible via history (D-10), MCP tools sketch (list_spaces, list_notebooks, search_notes, read_note, get_handwriting_image, create_note, edit_note, add_comment, get_backlinks), Request rate limits, Remote MCP server (Streamable HTTP, OAuth 2.1), REST API, Agent notebooks: server decrypts and applies agent edit as a normal update

### Community 27 - "components.test.tsx"
Cohesion: 0.11
Nodes (28): Checkbox, CheckboxProps, TaskCheckbox, TaskCheckboxProps, TaskState, Dialog, SegmentedControl(), SegmentedControlProps (+20 more)

### Community 28 - "D-04. Одновременно сквозное шифрование и доступ по API"
Cohesion: 0.50
Nodes (4): D-04. Одновременно сквозное шифрование и доступ по API, Контекст, Последствия, Решение

### Community 29 - "index.ts"
Cohesion: 0.12
Nodes (21): Provider(), IconButtonProps, sizes, variants, Kbd(), ToastProvider(), Tooltip(), TooltipProps (+13 more)

### Community 30 - "react"
Cohesion: 0.10
Nodes (18): CommandItemProps, CommandPalette(), CommandPaletteProps, GlassPanel, GlassPanelProps, Skeleton(), SkeletonProps, Switch (+10 more)

### Community 31 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 32 - "Sendable"
Cohesion: 0.10
Nodes (28): .animation, DSBackdropBlob, DSBackdropSpec, DSFontFamily, display, mono, text, DSFontWeight (+20 more)

### Community 33 - "open-questions.md (2)"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 34 - "tokens.ts"
Cohesion: 0.10
Nodes (22): backdropNames, colorNames, highlightNames, inkNames, tintNames, tokens, Avatar(), AvatarProps (+14 more)

### Community 35 - "DSTintToken"
Cohesion: 0.09
Nodes (21): Color, .dsAccent, .dsCanvas, .dsDanger, .dsElevated, .dsPrimary, .dsSecondary, .dsSeparator (+13 more)

### Community 36 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 37 - "DSInkToken"
Cohesion: 0.10
Nodes (19): .color, DSDocumentWidth, full, normal, .points, wide, DSDuration, DSFontFamilyName (+11 more)

### Community 38 - "DatePicker.tsx"
Cohesion: 0.09
Nodes (38): DateChip, DateChipProps, tones, Calendar(), CalendarProps, DatePicker(), DatePickerProps, DialogClose (+30 more)

### Community 39 - "7. Шифрование и доступ агентов"
Cohesion: 0.33
Nodes (6): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 40 - "D-30. База данных сервера — PostgreSQL"
Cohesion: 0.12
Nodes (16): Обоснованы PostgreSQL (D-30) и Yjs (D-31) как отдельные решения, Прототип пера хранит текст в Yrs (D-27), D-27. В прототипе пера текст хранится в Yrs, Контекст, Последствия, Решение, D-30. База данных сервера — PostgreSQL, Контекст (+8 more)

### Community 41 - "risks.md"
Cohesion: 0.14
Nodes (15): D-08. Аннотации PDF пером — не в MVP, PDF pen annotations (PDFKit + stroke layer), Решение (предложение), Universal Links, Apple Developer Account, PDF Annotations Not in MVP, R-07 Web Pen Worse than Native, R-08 Huge Project Scope (+7 more)

### Community 42 - "DSMotionToken"
Cohesion: 0.10
Nodes (15): .body, .disclosure, Animation, DSAnimationModifier, .animation, DSPressableStyle, View, withDSAnimation() (+7 more)

### Community 43 - "open-questions.md (3)"
Cohesion: 0.40
Nodes (5): docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, iOS build and tests on macOS CI runner per push

### Community 44 - "ios"
Cohesion: 0.06
Nodes (33): .body, concurrency, cancel-in-progress, group, run, defaults, name, runs-on (+25 more)

### Community 45 - "Card.tsx"
Cohesion: 0.21
Nodes (9): Backdrop(), BackdropProps, Card, CardProps, coverHeights, DocCard, DocCardProps, pads (+1 more)

### Community 46 - "DSButtonBody"
Cohesion: 0.08
Nodes (23): ButtonsPreview, .body, ButtonStyle, DSButtonBody, .body, .fill, .foreground, .height (+15 more)

### Community 47 - "DSRGBA"
Cohesion: 0.14
Nodes (8): .color, .uiColor, .color, .uiColor, DSColorPair, DSRGBA, .hex, .value

### Community 48 - "ui/package.json"
Cohesion: 0.10
Nodes (24): dependencies, clsx@^2.1.1, cmdk@^1.1.1, @datascratch/design-tokens@workspace:*, @fontsource-variable/inter@^5.3.0, @fontsource-variable/jetbrains-mono@^5.3.0, @fontsource-variable/source-serif-4@^5, lucide-react@^1.61.0 (+16 more)

### Community 49 - "DSColorToken"
Cohesion: 0.10
Nodes (15): .color, DSColorToken, accent, bgCanvas, bgElevated, bgSidebar, bgSurface, danger (+7 more)

### Community 50 - "DSAvatar"
Cohesion: 0.18
Nodes (11): AvatarPreview, .body, DSAvatar, .body, .presenceLabel, DSAvatarStack, .body, DSPresence (+3 more)

### Community 51 - "String"
Cohesion: 0.13
Nodes (11): DSCheckmark, DSTaskCheckbox, .body, .isDone, DSTaskState, cancelled, done, open (+3 more)

### Community 52 - "DSTypeToken"
Cohesion: 0.12
Nodes (12): DSFontModifier, View, DSTypeToken, body, callout, caption, footnote, h1 (+4 more)

### Community 53 - "View"
Cohesion: 0.09
Nodes (25): ChipsPreview, .body, DSBadge, .body, .colors, DSTagChip, .body, Style (+17 more)

### Community 54 - "index.d.ts"
Cohesion: 0.11
Nodes (18): BackdropBlob, BackdropName, BackdropSpec, ColorName, DurationName, HighlightName, InkName, MotionName (+10 more)

### Community 55 - "design-tokens/package.json"
Cohesion: 0.11
Nodes (17): description, exports, ./theme.css, ./tokens.css, ./tokens.json, files, main, name (+9 more)

### Community 56 - "Overview.stories.tsx"
Cohesion: 0.09
Nodes (3): docs, Showcase(), Tasks()

### Community 57 - "DSSidebarItem"
Cohesion: 0.26
Nodes (7): DSSidebarItem, .body, DSSidebarSection, .body, .isExpanded, SidebarPreview, .body

### Community 58 - "SwiftUI"
Cohesion: 0.21
Nodes (7): DSFeedback, delete, selection, .sensoryFeedback, taskComplete, DSHaptics, View

### Community 59 - "2026-10-25"
Cohesion: 0.22
Nodes (9): 2026-10-25, Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Утверждён технологический стек (D-21), отказ от ядра на Rust (D-22), Журнал изменений, D-22. Без собственного общего ядра на Rust, Контекст, Последствия, Рассмотренные варианты (+1 more)

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
Cohesion: 0.24
Nodes (8): DSSkeleton, .body, DSSkeletonLines, .body, DSSpinner, .body, SkeletonPreview, .body

### Community 66 - "Компоненты"
Cohesion: 0.20
Nodes (7): DSDesign — дизайн-система «Тихая бумага» для iOS, Как пользоваться, Компоненты, Сборка и тесты, Токены, DSEmptyState, .body

### Community 67 - "String"
Cohesion: 0.29
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
Cohesion: 0.10
Nodes (17): apps/ios — iPhone + iPad, iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), apps/server — сервер, apps/web — веб-клиент, Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), iPhone and iPad share one codebase (universal app), Argon2id password key derivation (+9 more)

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

### Community 84 - "03-pencil.md"
Cohesion: 0.09
Nodes (21): D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, 3. Apple Pencil в тексте — ключевая фича, Handwriting input types (text marks, margin notes, drawing block, drawing on images, Scribble), Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps, Pencil gestures (zigzag delete, underline, strike, lasso), Prototype open questions (multi-word circles, deleted marked text R-04) (+13 more)

### Community 85 - "12. Функции по мотивам Craft"
Cohesion: 0.22
Nodes (8): 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft, Связь с моделью данных

### Community 86 - "peerDependencies"
Cohesion: 0.25
Nodes (8): react-dom@^19.3.1, tailwindcss@^4.3.3, peerDependencies, react@^19.0.0, react-dom@^19.0.0, tailwindcss@^4.0.0, react-dom, tailwindcss

### Community 87 - "open-questions.md"
Cohesion: 0.19
Nodes (10): D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст, Решение, End-to-End Encryption (E2E), Final Product Name, Guest Pen Drawing and Link Lifetime (+2 more)

### Community 88 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.33
Nodes (5): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 89 - "0016-no-import-now.md"
Cohesion: 0.33
Nodes (5): Notesnook, D-16. Импорт — не сейчас, Import from Obsidian/Notesnook (later), Решение, No import for now (D-16)

### Community 90 - "Server stack"
Cohesion: 0.20
Nodes (11): Canvas + Pointer Events, Dexie (IndexedDB), Drizzle ORM, Fastify, MCP TypeScript SDK, OAuth 2.1, Radix + Tailwind + Motion, Server stack (+3 more)

### Community 91 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, dev, lint, showcase:build, test, typecheck

### Community 92 - "0014-organization.md"
Cohesion: 0.25
Nodes (7): Organization Hierarchy (Account > Space > Notebook > Folder > Note), D-14. Организация: богатая, но не перегруженная, Spaces, nested folders, smart tags, colors, Решение, Smart Tag, Space, Organization Structure (notebook vs space vs folder)

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

### Community 103 - "iOS client stack"
Cohesion: 0.18
Nodes (11): Custom pen renderer (Metal vs Core Animation TBD), GRDB (SQLite), iOS client stack, Node.js + TypeScript server, Swift 6, SwiftUI (shell), TypeScript, UIKit + TextKit 2 (editor) (+3 more)

### Community 108 - "exports"
Cohesion: 0.67
Nodes (3): exports, ./fonts.css, ./styles.css

### Community 116 - "0005-living-stroke.md"
Cohesion: 0.24
Nodes (6): D-05. Перо при перекладке текста — вариант А «живой штрих», PencilKit (rejected), Гипотеза реализации, Контекст, Последствия, Решение

### Community 117 - "DSBackdropToken"
Cohesion: 0.25
Nodes (8): DSBackdropToken, .dark, dusk, ember, .light, meadow, mist, sand

### Community 118 - "Server PostgreSQL Schema (Stage 3 Draft)"
Cohesion: 0.36
Nodes (8): doc_snapshots Table (compacted snapshots, version history), doc_updates Table (encrypted Yjs updates), Server PostgreSQL Schema (Stage 3 Draft), pg-boss Job Queue, Snapshot, Update (Yjs binary edit record), Yjs History Compaction under Encryption, R-05 Edit History Growth

### Community 119 - "0010-agent-edits.md"
Cohesion: 0.33
Nodes (5): D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение

### Community 120 - "0011-handwriting-for-agents.md"
Cohesion: 0.29
Nodes (6): D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Handwriting Format for Agents (PNG), Export: Markdown, PDF, HTML (handwriting as images), Server responsibilities: accounts, encrypted relay, attachments, realtime, API/MCP, handwriting PNG render, Handwriting rendered to PNG for agents with text annotation (D-11)

### Community 121 - "01-concept.md"
Cohesion: 0.29
Nodes (5): D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, Obsidian (reference product: links, backlinks, tags, Markdown export), Backlinks, [[ ]] links with autocomplete, Nested tags and smart tags (saved filters), colors and icons

### Community 122 - "D-28. Процесс разработки: облако + Mac, сборка iOS в CI"
Cohesion: 0.33
Nodes (6): Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), D-28. Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen (project.yml) - proposed, Контекст, Последствия, Решение

### Community 123 - "9. API и внешние ИИ-агенты"
Cohesion: 0.33
Nodes (6): 9. API и внешние ИИ-агенты, Агент умеет, Безопасность, Набросок инструментов MCP (ПРЕДЛОЖЕНО), Правки агента (D-10), Реализация

### Community 124 - "Private notebooks: key from password, server stores only ciphertext, no agent access"
Cohesion: 0.50
Nodes (3): Notesnook (reference product: E2E encryption, reliable sync), Per-notebook key wrapped by user master key or server key, Private notebooks: key from password, server stores only ciphertext, no agent access

### Community 125 - "2. Платформы"
Cohesion: 0.50
Nodes (4): 2. Платформы, Минимальная версия iOS/iPadOS — ОТКРЫТО, Тестовые устройства (известно на 2026-10-25), Требования

### Community 126 - "D-19. Весь код пишет Claude"
Cohesion: 0.67
Nodes (3): D-19. Весь код пишет Claude, Последствия, Решение

## Knowledge Gaps
- **190 isolated node(s):** `PackageDescription`, `.body`, `.color`, `done`, `normal` (+185 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 746 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` connect `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` to `Процесс разработки (docs/development.md)`, `Datascratch — правила для ИИ (CLAUDE.md)`, `D-21. Технологический стек`, `Скрипт обновления графа`, `0031-crdt-yjs.md`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `DSRGBA` (e.g. with `.dark` and `.light`) actually correct?**
  _`DSRGBA` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PackageDescription`, `.body`, `.color` to the rest of the system?**
  _190 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `06-data-server.md` be split into smaller, more focused modules?**
  _Cohesion score 0.10507246376811594 - nodes in this community are weakly interconnected._
- **Why does `Color` connect `DSTintToken` to `DSInkToken`, `DSMotionToken`, `DSButtonBody`, `DSRGBA`, `DSColorToken`, `String`, `View`, `DSDateChipModel`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Should `0025-no-redis.md` be split into smaller, more focused modules?**
  _Cohesion score 0.1341991341991342 - nodes in this community are weakly interconnected._
- **Why does `DSTintToken` connect `View` to `Sendable`, `Компоненты`, `DSTintToken`, `String`, `DSInkToken`, `DSMotionToken`, `DSAvatar`, `DSDocCard`, `DSSidebarItem`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._