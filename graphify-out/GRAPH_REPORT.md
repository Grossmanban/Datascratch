# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 139 files · ~46,146 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 5)

## Summary
- 1631 nodes · 2933 edges · 116 communities (100 shown, 16 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 243 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c6b85e88`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Datascratch — правила для ИИ (CLAUDE.md)
- iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)
- 06-data-server.md
- SyncClient
- 02-platforms.md
- 0001-storage-in-database.md
- risks.md
- 05-organization-design.md
- decisions/README.md
- 10-sync.md
- PostgreSQL
- stack.md
- 0018-monetization.md
- 09-agents-api.md
- Скрипт обновления графа
- extract.ts
- glossary.md
- keys.ts
- 0031-crdt-yjs.md
- blocks.ts
- Organization Hierarchy (Account > Space > Notebook > Folder > Note)
- Graphify
- roadmap.md
- open-questions.md
- api.ts
- Платформы и клиенты (2)
- document.ts
- shared/package.json
- sync.ts
- markdown.ts
- overview.md
- package.json
- 0030-server-database-postgresql.md
- open-questions.md (2)
- steps
- exports
- Обзор архитектуры: разделы
- compilerOptions
- factories.ts
- common.ts
- store.ts
- 2026-10-25
- Процесс разработки (docs/development.md)
- open-questions.md (3)
- Snapshot
- D-21. Технологический стек
- 03-pencil.md
- Контракт: REST API сервера (v1)
- records.ts
- План разработки
- tasks
- devDependencies
- Контракт: шифрование (v1)
- D-30. База данных сервера — PostgreSQL
- 0003-platforms.md
- 0026-file-storage.md
- 07-encryption.md
- Контракт: протокол синхронизации (v1)
- D-29. Graphify: порядок работы, чтобы граф был всегда актуален
- vitest
- client.ts
- 0004-encryption-and-api.md
- 08-sharing.md
- 12. Функции по мотивам Craft
- contracts.test.ts
- memory-hub.ts
- Соглашения
- tsconfig.json
- D-01. Хранение заметок — в базе данных на своём сервере, не в файлах
- 04-editor.md
- 01-concept.md
- Контракт: дизайн-токены «Тихая бумага» (v1)
- yjs.ts
- Определение «готово» для любого изменения
- D-21. Технологический стек
- D-32. Минимальная версия iOS/iPadOS — 26
- D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления
- D-39. Разработка параллельными сессиями; Claude сам вливает в main
- MemorySyncHub
- 4. Редактор
- Контракт: модель документа (v1)
- D-35. Пометка на удалённом тексте исчезает вместе с ним
- D-36. Структура: пространство → блокноты → папки
- D-38. Дизайн-направление — «Тихая бумага», ориентир Craft
- D-41. Набор функций по мотивам Craft
- 10. Синхронизация и офлайн
- .prettierrc.json
- Контракты между частями системы
- Технологический стек — РЕШЕНО (2026-10-25)
- D-33. Bundle ID — com.datascratch.app
- D-37. Гости по ссылке рисуют; ссылка живёт до отзыва
- D-40. Хостинг — позже; сервер готов к запуску одной командой
- ids.ts
- changelog.d/README.md
- agents/README.md
- design-tokens/README.md
- ui/README.md
- web-editor/README.md
- pnpm-workspace.yaml
- MemorySyncStorage
- Web client stack (PWA)
- 3. Apple Pencil в тексте — ключевая фича
- 7. Шифрование и доступ агентов
- 9. API и внешние ИИ-агенты
- scripts
- 0010-agent-edits.md
- Private notebooks: key from password, server stores only ciphertext, no agent access
- data-model.md
- 0005-living-stroke.md
- iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)
- D-03. Платформы: нативные iPhone и iPad + полноценный веб
- 5. Организация заметок и дизайн
- ./sync
- @types/ws@^8.5.13
- ws@^8.18.0

## God Nodes (most connected - your core abstractions)
1. `SyncClient` - 32 edges
2. `CryptoError` - 25 edges
3. `accountRoots()` - 20 edges
4. `compilerOptions` - 18 edges
5. `Stage 1: Pen-in-Text Prototype (iPad)` - 17 edges
6. `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` - 17 edges
7. `yjs` - 15 edges
8. `notebookRoots()` - 15 edges
9. `noteRoots()` - 15 edges
10. `Процесс разработки (docs/development.md)` - 14 edges

## Surprising Connections (you probably didn't know these)
- `4.2. Схема блоков` --references--> `label()`  [INFERRED]
  docs/architecture/contracts/document-model.md → tools/graphify_docs.py
- `Аутентификация (D-34, `crypto.md`)` --references--> `Session`  [INFERRED]
  docs/architecture/contracts/api.md → packages/shared/src/contracts/api.ts
- `Блокноты и документы (D-36)` --references--> `Notebook`  [INFERRED]
  docs/architecture/contracts/api.md → packages/shared/src/contracts/api.ts
- `Шеринг (D-13, D-37)` --references--> `Share`  [INFERRED]
  docs/architecture/contracts/api.md → packages/shared/src/contracts/api.ts
- `1. Три вида документов Yjs` --references--> `DocKind`  [INFERRED]
  docs/architecture/contracts/document-model.md → packages/shared/src/contracts/common.ts

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

## Communities (116 total, 16 thin omitted)

### Community 0 - "Datascratch — правила для ИИ (CLAUDE.md)"
Cohesion: 0.16
Nodes (13): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, GitHub Actions на macOS — проверка сборки iOS, Две среды: облачная сессия Claude Code (Linux) и Mac пользователя (+5 more)

### Community 1 - "iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)"
Cohesion: 0.18
Nodes (9): apps/server — сервер, Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), apps/web — веб-клиент, Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), App server: Node.js + TypeScript (Fastify), packages/shared — общие TypeScript-типы и схемы, Shared TypeScript types and schemas (document, strokes, metadata, sync protocol, API), packages/test-vectors — общие тестовые векторы (+1 more)

### Community 2 - "06-data-server.md"
Cohesion: 0.10
Nodes (18): 6. Модель данных и сервер, Daily off-VPS backups of DB and files with verified restore (R-11), Metadata: title, tags, links, dates, space, folder, Self-hosting, Модель данных (общий обзор; детали — `architecture/data-model.md`), Резервные копии, Сервер, Real-time co-editing with cursors and presence (guests shown as 'Guest') (+10 more)

### Community 4 - "02-platforms.md"
Cohesion: 0.12
Nodes (15): D-06. Рисование пальцем на iPhone — да, опционально, Finger drawing toggle on iPhone, Решение, D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, 2. Платформы, UI languages Russian and English, no RTL (D-17) (+7 more)

### Community 5 - "0001-storage-in-database.md"
Cohesion: 0.27
Nodes (5): Markdown files option (rejected), Obsidian, Own server storage, Real-time collaborative editing, PostgreSQL

### Community 6 - "risks.md"
Cohesion: 0.24
Nodes (9): Canvas + Pointer Events Pen Layer, Universal Links, Apple Developer Account, R-04 Strokes on Deleted or Changed Text, R-07 Web Pen Worse than Native, R-12 No Paid Apple Account (7-day installs), Риски, Stage 4: Web Client (+1 more)

### Community 7 - "05-organization-design.md"
Cohesion: 0.17
Nodes (11): D-15. Дизайн — основная концепция продукта, Design references: Things 3, Linear, Craft, Arc, Последствия, Решение, Light/dark theme, Dynamic Type, VoiceOver, full iPad keyboard, Feel references: Things 3, Linear, Craft, Arc, Own design system unified on iOS and web, Design tokens as single source for both platforms (format at stage 2) (+3 more)

### Community 8 - "decisions/README.md"
Cohesion: 0.13
Nodes (10): D-19. Весь код пишет Claude, Последствия, Решение, D-23. Документация — источник истины; Graphify — граф знаний поверх неё, docs/history session log, Контекст, Последствия, Решение (+2 more)

### Community 9 - "10-sync.md"
Cohesion: 0.31
Nodes (6): Agent edits applied immediately, highlighted, revertible via history (D-10), Local storage: SQLite via GRDB (iOS), IndexedDB via Dexie (web), Agent notebooks: server decrypts and applies agent edit as a normal update, Trash for 30 days, Version history: snapshots, view, rollback, Each note is a Yjs CRDT doc; edits are small binary updates

### Community 10 - "PostgreSQL"
Cohesion: 0.16
Nodes (19): agent_tokens / agent_audit_log Tables, Server PostgreSQL Schema (Stage 3 Draft), Agent Edit Flow (agent notebook), edit_note MCP Tool, External AI Agents, Handwriting-to-PNG Render (pg-boss queue), Key Store (agent notebooks), MCP + REST API (+11 more)

### Community 11 - "stack.md"
Cohesion: 0.13
Nodes (20): Web PWA Client (React, TipTap, Yjs, IndexedDB), Astro (landing page), Dexie (IndexedDB), Drizzle ORM, Fastify, GRDB (SQLite), Custom iOS Pen Render Layer (Metal or Core Animation), TypeScript on Node.js (+12 more)

### Community 12 - "0018-monetization.md"
Cohesion: 0.19
Nodes (10): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, Контекст, Решение (на сейчас) (+2 more)

### Community 13 - "09-agents-api.md"
Cohesion: 0.18
Nodes (11): D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Handwriting Format for Agents (PNG), Export: Markdown, PDF, HTML (handwriting as images), Server responsibilities: accounts, encrypted relay, attachments, realtime, API/MCP, handwriting PNG render, Local MCP bridge (future): local utility holding key for agent access to private notebooks, Handwriting rendered to PNG for agents with text annotation (D-11), MCP tools sketch (list_spaces, list_notebooks, search_notes, read_note, get_handwriting_image, create_note, edit_note, add_comment, get_backlinks) (+3 more)

### Community 14 - "Скрипт обновления графа"
Cohesion: 0.28
Nodes (7): Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 15 - "extract.ts"
Cohesion: 0.15
Nodes (20): TASK_STATES, TaskState, ATTR_TEXT_BLOCKS, attrText(), buildBacklinks(), deltaText(), extractNoteLinks(), extractTags() (+12 more)

### Community 16 - "glossary.md"
Cohesion: 0.22
Nodes (11): Organization Hierarchy (Account > Space > Notebook > Folder > Note), Automerge (fallback CRDT), Yjs, Yrs (Rust Yjs) with Swift Wrapper, ADR (Architecture Decision Record), CRDT, Predicted / Coalesced Touches, Smart Tag (+3 more)

### Community 17 - "keys.ts"
Cohesion: 0.06
Nodes (86): RFC-4648, AD, ATTACHMENT_CHUNK_BYTES, DEFAULT_KDF, ENVELOPE_OVERHEAD, ENVELOPE_VERSION, KDF_ALG, KDF_MEM (+78 more)

### Community 18 - "0031-crdt-yjs.md"
Cohesion: 0.14
Nodes (21): Custom pen renderer (Metal vs Core Animation TBD), End-to-end encryption, iOS client stack, Node.js + TypeScript server, Swift 6, SwiftUI (shell), TypeScript, UIKit + TextKit 2 (editor) (+13 more)

### Community 19 - "blocks.ts"
Cohesion: 0.10
Nodes (32): BLOCK_NODES, INLINE_NODES, MARKS, pmNodeSchema, TEXTBLOCK_NODES, addAgentMark(), applyBlockOperations(), ApplyOptions (+24 more)

### Community 20 - "Organization Hierarchy (Account > Space > Notebook > Folder > Note)"
Cohesion: 0.40
Nodes (4): D-14. Организация: богатая, но не перегруженная, Spaces, nested folders, smart tags, colors, Решение, Organization Structure (notebook vs space vs folder)

### Community 21 - "Graphify"
Cohesion: 0.15
Nodes (12): Git, Graphify, Автоматизация, Две среды, Команды, Конец сессии, Кто что делает, Обновление графа после правки документов (по шагам) (+4 more)

### Community 22 - "roadmap.md"
Cohesion: 0.14
Nodes (13): Notesnook, D-08. Аннотации PDF пером — не в MVP, PDF pen annotations (PDFKit + stroke layer), Решение (предложение), D-16. Импорт — не сейчас, Import from Obsidian/Notesnook (later), Решение, PDF Annotations Not in MVP (+5 more)

### Community 23 - "open-questions.md"
Cohesion: 0.13
Nodes (20): Accounts, OAuth, Tokens Service, GitHub Actions CI (incl. macOS iOS builds), XcodeGen, Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), D-28. Процесс разработки: облако + Mac, сборка iOS в CI, Mixed cloud + Mac development mode, XcodeGen (project.yml) - proposed, Контекст (+12 more)

### Community 24 - "api.ts"
Cohesion: 0.03
Nodes (72): ACCESS_TOKEN_TTL_MS, AGENT_PERMISSIONS, AgentPermission, AgentToken, agentTokenSchema, API_ERROR_CODES, API_PREFIX, API_ROUTES (+64 more)

### Community 25 - "Платформы и клиенты (2)"
Cohesion: 0.33
Nodes (6): 1. Концепция продукта, Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения, Суть в одном абзаце

### Community 26 - "document.ts"
Cohesion: 0.05
Nodes (46): DateOnly, IsoDateTime, Uuid, ACCOUNT_SETTINGS_KEYS, AccountSettings, ATOM_BLOCK_NODES, BlockAttrs, BlockNodeName (+38 more)

### Community 27 - "shared/package.json"
Cohesion: 0.15
Nodes (14): dependencies, libsodium-wrappers-sumo@^0.8.2, zod@^4.1.0, description, files, name, peerDependencies, yjs@^13.6.0 (+6 more)

### Community 28 - "sync.ts"
Cohesion: 0.05
Nodes (39): AckMessage, ackMessageSchema, CLIENT_PLATFORMS, ClientAwarenessMessage, clientAwarenessMessageSchema, clientMessageSchema, clientMsgIdSchema, deviceIdSchema (+31 more)

### Community 29 - "markdown.ts"
Cohesion: 0.09
Nodes (37): 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note`, 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек (+29 more)

### Community 30 - "overview.md"
Cohesion: 0.15
Nodes (16): File Storage (disk or external S3), Guest via Link (web, no account), iOS / iPadOS Client (Swift, TextKit 2, Yrs, GRDB), Private Notebook Edit Flow, Monorepo Structure (apps/, packages/, infra/), Sync / Realtime Service, packages/test-vectors, libsodium (swift-sodium) (+8 more)

### Community 31 - "package.json"
Cohesion: 0.08
Nodes (31): devDependencies, eslint@^9.39.0, eslint-config-prettier@^10.1.0, @eslint/js@^9.39.0, globals@^16.4.0, prettier@^3.6.0, turbo@^2.5.0, typescript@^5.9.0 (+23 more)

### Community 32 - "0030-server-database-postgresql.md"
Cohesion: 0.12
Nodes (21): Убран Redis (D-25): один процесс сервера, очередь — pg-boss на PostgreSQL, GRDB (SQLite), pg-boss job queue, D-25. Redis не используем, Edit broadcast interface (in-memory), PostgreSQL LISTEN/NOTIFY, Redis (rejected), Valkey (free Redis alternative) (+13 more)

### Community 33 - "open-questions.md (2)"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 34 - "steps"
Cohesion: 0.09
Nodes (22): runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group, jobs, check (+14 more)

### Community 35 - "exports"
Cohesion: 0.12
Nodes (17): import, types, import, types, import, types, exports, ./contracts (+9 more)

### Community 36 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 37 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib, module (+10 more)

### Community 38 - "factories.ts"
Cohesion: 0.15
Nodes (15): ACCOUNT_ROOTS, DEFAULT_NOTE_STYLE, FORMAT_VERSION, NOTE_ROOTS, NOTEBOOK_ROOTS, NoteDocMeta, PMNode, AccountDocRoots (+7 more)

### Community 39 - "common.ts"
Cohesion: 0.12
Nodes (16): AUTHOR_KINDS, authorKindSchema, Base64Url, BASE64URL_REGEX, base64UrlBytesSchema(), base64UrlLength(), base64UrlSchema, DATE_ONLY_REGEX (+8 more)

### Community 40 - "store.ts"
Cohesion: 0.06
Nodes (58): AuthorKind, ANCHOR_KINDS, AnchorKind, MIN_SEGMENT_POINTS, ORPHAN_STROKE_PURGE_DAYS, POINT_BYTES, POINT_FIELDS, REFERENCE_BLOCK_WIDTH (+50 more)

### Community 41 - "2026-10-25"
Cohesion: 0.22
Nodes (8): Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой, Правила, Среда разработки, Создан CLAUDE.md и скелет монорепозитория (apps/, packages/, infra/)

### Community 42 - "Процесс разработки (docs/development.md)"
Cohesion: 0.20
Nodes (13): Стартовый хук Claude Code (.claude/hooks/session-start.sh), D-23 (документация), git-хук Graphify (пересборка только по изменённому коду), Graphify 0.9.95 (пакет graphifyy), Смысловой слой графа (понятия, решения, связи — проход ИИ), Структурный слой графа (код, файлы, заголовки — без ИИ), Автоматизация: стартовый хук, git-хук, graphify update после git pull, D-19 (код пишет Claude) (+5 more)

### Community 43 - "open-questions.md (3)"
Cohesion: 0.40
Nodes (5): docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, iOS build and tests on macOS CI runner per push

### Community 44 - "Snapshot"
Cohesion: 0.47
Nodes (6): doc_snapshots Table (compacted snapshots, version history), doc_updates Table (encrypted Yjs updates), Snapshot, Update (Yjs binary edit record), Yjs History Compaction under Encryption, R-05 Edit History Growth

### Community 45 - "D-21. Технологический стек"
Cohesion: 0.22
Nodes (9): 2026-10-25, Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Утверждён технологический стек (D-21), отказ от ядра на Rust (D-22), Журнал изменений, D-22. Без собственного общего ядра на Rust, Контекст, Последствия, Рассмотренные варианты (+1 more)

### Community 46 - "03-pencil.md"
Cohesion: 0.14
Nodes (12): D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, Handwriting input types (text marks, margin notes, drawing block, drawing on images, Scribble), Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps, Pencil gestures (zigzag delete, underline, strike, lasso), Prototype open questions (multi-word circles, deleted marked text R-04), Stroke point anchoring: character anchor + dx/dy in font-size units (+4 more)

### Community 47 - "Контракт: REST API сервера (v1)"
Cohesion: 0.15
Nodes (12): Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1), Общее, Служебное, Токены агентов (`spec/09-agents-api.md`) (+4 more)

### Community 48 - "records.ts"
Cohesion: 0.09
Nodes (45): StarredItem, TabItem, TagProps, accountRoots(), createAccountDoc(), createNotebookDoc(), notebookRoots(), closeTab() (+37 more)

### Community 49 - "План разработки"
Cohesion: 0.17
Nodes (12): Критерии приёмки, План разработки, Подготовка, Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad), Этап 2 — MVP на iPad и iPhone, локально (+4 more)

### Community 50 - "tasks"
Cohesion: 0.17
Nodes (11): dependsOn, outputs, dependsOn, $schema, tasks, build, lint, test (+3 more)

### Community 51 - "devDependencies"
Cohesion: 0.13
Nodes (14): devDependencies, eslint@^9.39.0, prosemirror-model@^1.25.12, tsup@^8.5.0, @types/node@^22.10.0, typescript@^5.9.0, y-prosemirror@^1.3.7, yjs@^13.6.27 (+6 more)

### Community 52 - "Контракт: шифрование (v1)"
Cohesion: 0.18
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 53 - "D-30. База данных сервера — PostgreSQL"
Cohesion: 0.12
Nodes (16): Обоснованы PostgreSQL (D-30) и Yjs (D-31) как отдельные решения, Прототип пера хранит текст в Yrs (D-27), D-27. В прототипе пера текст хранится в Yrs, Контекст, Последствия, Решение, D-30. База данных сервера — PostgreSQL, Контекст (+8 more)

### Community 54 - "0003-platforms.md"
Cohesion: 0.27
Nodes (4): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, Full-featured web client (TypeScript)

### Community 55 - "0026-file-storage.md"
Cohesion: 0.21
Nodes (12): MinIO (rejected), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Server disk folder storage (default), External S3-compatible storage (Hetzner, R2, B2), File storage interface (two implementations, chosen by config), Garage / SeaweedFS, MinIO (rejected) (+4 more)

### Community 56 - "07-encryption.md"
Cohesion: 0.23
Nodes (9): D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, Space -> notebook -> folder relation (open; encryption mode per notebook, D-09), Attachments as separate encrypted files, on-demand resumable download, Argon2id password key derivation, libsodium on all platforms (swift-sodium, libsodium-wrappers), Two notebook modes chosen at creation, switchable with client re-encryption (D-09), XChaCha20-Poly1305 content encryption (+1 more)

### Community 57 - "Контракт: протокол синхронизации (v1)"
Cohesion: 0.20
Nodes (9): 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05), 6. Права, 7. Коды ошибок, 8. Тестовые векторы (+1 more)

### Community 58 - "D-29. Graphify: порядок работы, чтобы граф был всегда актуален"
Cohesion: 0.24
Nodes (7): Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, D-29. Graphify: порядок работы, чтобы граф был всегда актуален, R-09 (риск: Graphify сломается или исчезнет), Контекст, Последствия, Решение, Раскладка graphify-out/ и что хранится в git

### Community 60 - "client.ts"
Cohesion: 0.13
Nodes (16): ClientMessage, ClientPlatform, SNAPSHOT_THRESHOLD_BYTES, SNAPSHOT_THRESHOLD_UPDATES, SyncErrorCode, DocEntry, Listeners, REMOTE_ORIGIN (+8 more)

### Community 61 - "0004-encryption-and-api.md"
Cohesion: 0.29
Nodes (6): D-04. Одновременно сквозное шифрование и доступ по API, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), Контекст, Последствия, Решение

### Community 62 - "08-sharing.md"
Cohesion: 0.15
Nodes (13): D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account, Universal Links (paid Apple Developer account), Последствия, Решение, Web client as full desktop replacement (Pointer Events pressure, offline PWA), 8. Совместная работа и шеринг, Guest editing without account in any browser (+5 more)

### Community 63 - "12. Функции по мотивам Craft"
Cohesion: 0.22
Nodes (8): 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft, Связь с моделью данных

### Community 64 - "contracts.test.ts"
Cohesion: 0.25
Nodes (7): createNotebookRequestSchema, emailSchema, registerDocRequestSchema, signupRequestSchema, isoDateTimeSchema, uuidSchema, KEY

### Community 65 - "memory-hub.ts"
Cohesion: 0.18
Nodes (11): base64UrlDecodedLength(), MAX_SNAPSHOT_BYTES, MAX_UPDATE_BYTES, ServerMessage, SYNC_PROTOCOL_VERSION, SyncAuth, UpdateItem, Connection (+3 more)

### Community 66 - "Соглашения"
Cohesion: 0.25
Nodes (8): Документация Datascratch, История, Как вносить изменения, Оглавление, Порядок чтения для новичка, Соглашения, Ссылки на решения, Статусы

### Community 67 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, lib, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 68 - "D-01. Хранение заметок — в базе данных на своём сервере, не в файлах"
Cohesion: 0.40
Nodes (5): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 69 - "04-editor.md"
Cohesion: 0.31
Nodes (7): Obsidian (reference product: links, backlinks, tags, Markdown export), Backlinks, iOS editor: UIKit + TextKit 2, Link graph view (not in MVP, stage 6), Web editor: TipTap (ProseMirror) + Yjs, [[ ]] links with autocomplete, Nested tags and smart tags (saved filters), colors and icons

### Community 70 - "01-concept.md"
Cohesion: 0.15
Nodes (11): D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст, Решение, Final Product Name, Datascratch (+3 more)

### Community 71 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.33
Nodes (5): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 72 - "yjs.ts"
Cohesion: 0.22
Nodes (11): PMMark, attributesToMarks(), Attrs, markNameFromAttr(), marksToAttributes(), pmContentToY(), pmNodeToY(), YChild (+3 more)

### Community 73 - "Определение «готово» для любого изменения"
Cohesion: 0.31
Nodes (4): Скрипт tools/graphify_docs.py (prepare → агенты → finish), Обновление графа после правки документов (prepare → агенты → finish → export html → check-update), Промпт извлечения .claude/skills/graphify/references/extraction-spec.md, Git: ветки, PR, один коммит = код + docs + граф

### Community 74 - "D-21. Технологический стек"
Cohesion: 0.18
Nodes (10): Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел), D-21. Технологический стек, Контекст, Последствия, Рассмотренные варианты (по обсуждению 2026-10-25), Решение, Конец сессии: файл в docs/history + roadmap/open-questions (+2 more)

### Community 75 - "D-32. Минимальная версия iOS/iPadOS — 26"
Cohesion: 0.40
Nodes (4): D-32. Минимальная версия iOS/iPadOS — 26, Последствия, Рассмотренные варианты, Решение

### Community 76 - "D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления"
Cohesion: 0.40
Nodes (4): D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления, Контекст, Рассмотренные варианты, Решение

### Community 77 - "D-39. Разработка параллельными сессиями; Claude сам вливает в main"
Cohesion: 0.40
Nodes (4): D-39. Разработка параллельными сессиями; Claude сам вливает в main, Контекст, Последствия, Решение

### Community 78 - "MemorySyncHub"
Cohesion: 0.22
Nodes (4): WebSocketFactory, deliver(), MemorySyncHub, makeClient()

### Community 79 - "4. Редактор"
Cohesion: 0.40
Nodes (5): 4. Редактор, Платформенная реализация, Прочее, Связи, Содержимое

### Community 80 - "Контракт: модель документа (v1)"
Cohesion: 0.17
Nodes (11): 1. Три вида документов Yjs, 2. Документ `account`, 3. Документ `notebook` (индекс блокнота), 5. Производные данные (не синхронизируются), 6. Версия формата, Контракт: модель документа (v1), DocKind, Folder (+3 more)

### Community 81 - "D-35. Пометка на удалённом тексте исчезает вместе с ним"
Cohesion: 0.50
Nodes (3): D-35. Пометка на удалённом тексте исчезает вместе с ним, Рассмотренные варианты, Решение

### Community 82 - "D-36. Структура: пространство → блокноты → папки"
Cohesion: 0.50
Nodes (3): D-36. Структура: пространство → блокноты → папки, Рассмотренные варианты, Решение

### Community 83 - "D-38. Дизайн-направление — «Тихая бумага», ориентир Craft"
Cohesion: 0.50
Nodes (3): D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Рассмотренные варианты, Решение

### Community 84 - "D-41. Набор функций по мотивам Craft"
Cohesion: 0.50
Nodes (3): D-41. Набор функций по мотивам Craft, Контекст, Решение

### Community 85 - "10. Синхронизация и офлайн"
Cohesion: 0.50
Nodes (4): 10. Синхронизация и офлайн, Как это работает (обзор), Требования, Уплотнение истории — ОТКРЫТО до этапа 3 (R-05)

### Community 86 - ".prettierrc.json"
Cohesion: 0.50
Nodes (3): printWidth, singleQuote, trailingComma

### Community 88 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 92 - "ids.ts"
Cohesion: 0.27
Nodes (7): RFC-9562, UUID_V7_REGEX, isUuidV7(), random(), uuidv7(), uuidv7FromParts(), uuidv7Timestamp()

### Community 101 - "Web client stack (PWA)"
Cohesion: 0.20
Nodes (11): Canvas + Pointer Events, Dexie (IndexedDB), Drizzle ORM, Fastify, MCP TypeScript SDK, OAuth 2.1, Radix + Tailwind + Motion, Server stack (+3 more)

### Community 102 - "3. Apple Pencil в тексте — ключевая фича"
Cohesion: 0.22
Nodes (9): 3. Apple Pencil в тексте — ключевая фича, Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера, Перекладка текста — вариант А «живой штрих» (D-05, РЕШЕНО) (+1 more)

### Community 103 - "7. Шифрование и доступ агентов"
Cohesion: 0.33
Nodes (6): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 104 - "9. API и внешние ИИ-агенты"
Cohesion: 0.33
Nodes (6): 9. API и внешние ИИ-агенты, Агент умеет, Безопасность, Набросок инструментов MCP (ПРЕДЛОЖЕНО), Правки агента (D-10), Реализация

### Community 105 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, lint, test, test:watch, typecheck

### Community 106 - "0010-agent-edits.md"
Cohesion: 0.33
Nodes (5): D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение

### Community 107 - "Private notebooks: key from password, server stores only ciphertext, no agent access"
Cohesion: 0.29
Nodes (4): Notesnook (reference product: E2E encryption, reliable sync), Per-notebook key wrapped by user master key or server key, Private notebooks: key from password, server stores only ciphertext, no agent access, Agent capabilities: search/read Markdown, block-level edits, comments, links/tags/backlinks

### Community 108 - "data-model.md"
Cohesion: 0.22
Nodes (11): Anchor (textRange / paragraph / drawingBlock / image), Note, Stroke, StrokePoint, Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3) (+3 more)

### Community 109 - "0005-living-stroke.md"
Cohesion: 0.24
Nodes (6): D-05. Перо при перекладке текста — вариант А «живой штрих», PencilKit (rejected), Гипотеза реализации, Контекст, Последствия, Решение

### Community 110 - "iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)"
Cohesion: 0.33
Nodes (4): apps/ios — iPhone + iPad, iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), iPhone and iPad share one codebase (universal app)

### Community 111 - "D-03. Платформы: нативные iPhone и iPad + полноценный веб"
Cohesion: 0.50
Nodes (4): D-03. Платформы: нативные iPhone и iPad + полноценный веб, Контекст, Последствия, Решение

### Community 112 - "5. Организация заметок и дизайн"
Cohesion: 0.40
Nodes (5): 5. Организация заметок и дизайн, Дизайн (D-15 — РЕШЕНО, главный принцип продукта), Организация (D-14 — РЕШЕНО по сути; структура ниже — ПРЕДЛОЖЕНО), Принципы, Реализация

### Community 115 - "./sync"
Cohesion: 0.67
Nodes (3): ./sync, import, types

## Knowledge Gaps
- **51 isolated node(s):** `RFC-4648`, `RFC-9562`, `../../tsconfig.base.json`, `Доступ внешних ИИ-агентов через MCP/REST`, `Apple Pencil в тексте — ключевая фича и главный риск` (+46 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 660 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов` connect `Скрипт обновления графа` to `Определение «готово» для любого изменения`, `D-29. Graphify: порядок работы, чтобы граф был всегда актуален`, `Процесс разработки (docs/development.md)`, `D-21. Технологический стек`?**
  _High betweenness centrality (0.394) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `Stage 1: Pen-in-Text Prototype (iPad)` (e.g. with `Predicted / Coalesced Touches` and `Living Stroke`) actually correct?**
  _`Stage 1: Pen-in-Text Prototype (iPad)` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4648`, `RFC-9562`, `../../tsconfig.base.json` to the rest of the system?**
  _51 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `06-data-server.md` be split into smaller, more focused modules?**
  _Cohesion score 0.09538461538461539 - nodes in this community are weakly interconnected._
- **Why does `label()` connect `Скрипт обновления графа` to `markdown.ts`?**
  _High betweenness centrality (0.393) - this node is a cross-community bridge._
- **Should `02-platforms.md` be split into smaller, more focused modules?**
  _Cohesion score 0.11695906432748537 - nodes in this community are weakly interconnected._
- **Why does `4.2. Схема блоков` connect `markdown.ts` to `Скрипт обновления графа`?**
  _High betweenness centrality (0.393) - this node is a cross-community bridge._