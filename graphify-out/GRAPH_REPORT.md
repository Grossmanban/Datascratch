# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 186 files · ~57,854 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 4, .css 2, .example 1)

## Summary
- 1710 nodes · 3910 edges · 102 communities (87 shown, 15 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 303 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b8d7ffd3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Datascratch — правила для ИИ (CLAUDE.md)
- iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)
- 10-sync.md
- D-21: разделы
- Платформы и клиенты
- 0001-storage-in-database.md
- План разработки
- Дизайн и организация
- Процесс разработки и Graphify
- contracts.ts
- Модель данных и глоссарий
- stack.md
- Компоненты стека
- 0009-notebook-mode-choice.md
- Скрипт обновления графа
- 0031-crdt-yjs.md
- Модель данных и глоссарий (2)
- 0026-file-storage.md
- flows.ts
- 06-data-server.md
- glossary.md
- web/package.json
- note.ts
- dependencies
- 06-data-server.md (2)
- Платформы и клиенты (2)
- 09-agents-api.md
- runtime.ts
- 0004-encryption-and-api.md
- SyncEngine
- 11. Нефункциональные требования
- router.tsx
- Sidebar.tsx
- open-questions.md (2)
- SignupPage.tsx
- AppShell.tsx
- Обзор архитектуры: разделы
- cn
- DocPage.tsx
- Editor.tsx
- actions.ts
- 0005-living-stroke.md
- dates.ts
- open-questions.md (3)
- server.mjs
- docStore.ts
- session.ts
- accountDb
- menus.tsx
- ListPages.tsx
- main.tsx
- 01-concept.md
- Процесс разработки (docs/development.md)
- package.json
- compilerOptions
- db.ts
- .start
- 04-editor.md
- createNotebook
- compilerOptions
- App.tsx
- .host
- D-21. Технологический стек
- 0024-product-name.md
- tasks
- compilerOptions
- Определение «готово» для любого изменения
- Контракт: модель документа (v1)
- Контракт: протокол синхронизации (v1)
- D-29. Graphify: порядок работы, чтобы граф был всегда актуален
- 08-sharing.md
- scripts
- Datascratch — правила для ИИ
- 12. Функции по мотивам Craft
- Соглашения
- 0013-collaboration-sharing.md
- SyncIndicator.tsx
- Контракт: дизайн-токены «Тихая бумага» (v1)
- D-28. Процесс разработки: облако + Mac, сборка iOS в CI
- web-editor/index.ts
- AuthLayout.tsx
- 0014-organization.md
- D-32. Минимальная версия iOS/iPadOS — 26
- D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления
- D-39. Разработка параллельными сессиями; Claude сам вливает в main
- D-35. Пометка на удалённом тексте исчезает вместе с ним
- D-36. Структура: пространство → блокноты → папки
- D-38. Дизайн-направление — «Тихая бумага», ориентир Craft
- D-41. Набор функций по мотивам Craft
- Контракты между частями системы
- D-33. Bundle ID — com.datascratch.app
- D-37. Гости по ссылке рисуют; ссылка живёт до отзыва
- D-40. Хостинг — позже; сервер готов к запуску одной командой
- @tiptap/extensions
- @tiptap/starter-kit
- stubs/README.md
- changelog.d/README.md
- agents/README.md
- design-tokens/README.md
- ui/README.md
- web-editor/README.md
- pnpm-workspace.yaml

## God Nodes (most connected - your core abstractions)
1. `cn()` - 41 edges
2. `accountDb` - 35 edges
3. `useWorkspace` - 32 edges
4. `react` - 30 edges
5. `DocScreen()` - 29 edges
6. `DocStore` - 26 edges
7. `createNote()` - 21 edges
8. `react-i18next` - 20 edges
9. `runtime()` - 20 edges
10. `createNotebook()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `1. Три вида документов Yjs` --references--> `DocKind`  [INFERRED]
  docs/architecture/contracts/document-model.md → apps/web/src/stubs/shared/contracts.ts
- `4. Ключ восстановления` --references--> `recoveryLoginKey()`  [INFERRED]
  docs/architecture/contracts/crypto.md → apps/web/src/stubs/shared/crypto.ts
- `4.2. Схема блоков` --references--> `label()`  [INFERRED]
  docs/architecture/contracts/document-model.md → tools/graphify_docs.py
- `8. Режим «для агентов» (R-10)` --references--> `notebookKey()`  [INFERRED]
  docs/architecture/contracts/crypto.md → apps/web/src/data/keys.ts
- `2. Поля штриха` --references--> `text()`  [INFERRED]
  docs/architecture/contracts/strokes.md → apps/web/src/domain/note.ts

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

## Communities (102 total, 15 thin omitted)

### Community 0 - "Datascratch — правила для ИИ (CLAUDE.md)"
Cohesion: 0.13
Nodes (15): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел) (+7 more)

### Community 1 - "iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)"
Cohesion: 0.13
Nodes (12): apps/ios — iPhone + iPad, iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), apps/server — сервер, Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), apps/web — веб-клиент, Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), iPhone and iPad share one codebase (universal app) (+4 more)

### Community 2 - "10-sync.md"
Cohesion: 0.05
Nodes (38): D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение (+30 more)

### Community 3 - "D-21: разделы"
Cohesion: 0.11
Nodes (19): 2026-10-25, Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Обоснованы PostgreSQL (D-30) и Yjs (D-31) как отдельные решения, Прототип пера хранит текст в Yrs (D-27), Журнал изменений, D-27. В прототипе пера текст хранится в Yrs, Контекст, Последствия (+11 more)

### Community 4 - "Платформы и клиенты"
Cohesion: 0.11
Nodes (16): D-06. Рисование пальцем на iPhone — да, опционально, Finger drawing toggle on iPhone, Решение, D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, 2. Платформы, UI languages Russian and English, no RTL (D-17) (+8 more)

### Community 5 - "0001-storage-in-database.md"
Cohesion: 0.16
Nodes (10): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты, Решение (+2 more)

### Community 6 - "План разработки"
Cohesion: 0.17
Nodes (12): Критерии приёмки, План разработки, Подготовка, Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad), Этап 2 — MVP на iPad и iPhone, локально (+4 more)

### Community 7 - "Дизайн и организация"
Cohesion: 0.12
Nodes (16): D-15. Дизайн — основная концепция продукта, Design references: Things 3, Linear, Craft, Arc, Последствия, Решение, 5. Организация заметок и дизайн, Light/dark theme, Dynamic Type, VoiceOver, full iPad keyboard, Feel references: Things 3, Linear, Craft, Arc, Own design system unified on iOS and web (+8 more)

### Community 8 - "Процесс разработки и Graphify"
Cohesion: 0.11
Nodes (16): Monorepo Structure (apps/, packages/, infra/), packages/test-vectors, libsodium (swift-sodium), Git, Graphify, Автоматизация, Две среды, Команды (+8 more)

### Community 9 - "contracts.ts"
Cohesion: 0.05
Nodes (50): api, ApiError, doFetch(), NetworkError, request(), RequestOptions, setTokenSource(), toError() (+42 more)

### Community 10 - "Модель данных и глоссарий"
Cohesion: 0.12
Nodes (28): agent_tokens / agent_audit_log Tables, Server PostgreSQL Schema (Stage 3 Draft), Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, File Storage (disk or external S3), Guest via Link (web, no account) (+20 more)

### Community 11 - "stack.md"
Cohesion: 0.10
Nodes (26): Web PWA Client (React, TipTap, Yjs, IndexedDB), Astro (landing page), Dexie (IndexedDB), Drizzle ORM, Fastify, GRDB (SQLite), iPhone / iPad (`apps/ios`), TypeScript on Node.js (+18 more)

### Community 12 - "Компоненты стека"
Cohesion: 0.09
Nodes (28): Убран Redis (D-25): один процесс сервера, очередь — pg-boss на PostgreSQL, Canvas + Pointer Events, Dexie (IndexedDB), Drizzle ORM, Fastify, GRDB (SQLite), MCP TypeScript SDK, OAuth 2.1 (+20 more)

### Community 13 - "0009-notebook-mode-choice.md"
Cohesion: 0.11
Nodes (18): D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, Notesnook (reference product: E2E encryption, reliable sync), Space -> notebook -> folder relation (open; encryption mode per notebook, D-09), 7. Шифрование и доступ агентов, Argon2id password key derivation, libsodium on all platforms (swift-sodium, libsodium-wrappers), Local MCP bridge (future): local utility holding key for agent access to private notebooks (+10 more)

### Community 14 - "Скрипт обновления графа"
Cohesion: 0.28
Nodes (7): Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 15 - "0031-crdt-yjs.md"
Cohesion: 0.07
Nodes (34): Automerge (fallback CRDT), Yrs (Rust Yjs) with Swift Wrapper, D-19. Весь код пишет Claude, Последствия, Решение, Custom pen renderer (Metal vs Core Animation TBD), End-to-end encryption, iOS client stack (+26 more)

### Community 16 - "Модель данных и глоссарий (2)"
Cohesion: 0.22
Nodes (11): Anchor (textRange / paragraph / drawingBlock / image), Note, Stroke, StrokePoint, Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3) (+3 more)

### Community 17 - "0026-file-storage.md"
Cohesion: 0.21
Nodes (12): MinIO (rejected), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Server disk folder storage (default), External S3-compatible storage (Hetzner, R2, B2), File storage interface (two implementations, chosen by config), Garage / SeaweedFS, MinIO (rejected) (+4 more)

### Community 18 - "flows.ts"
Cohesion: 0.10
Nodes (45): deviceName(), changePassword(), loginKeyFor(), normalizeEmail(), recoverAccount(), signIn(), signUp(), deriveKeys() (+37 more)

### Community 19 - "06-data-server.md"
Cohesion: 0.12
Nodes (14): 6. Модель данных и сервер, Daily off-VPS backups of DB and files with verified restore (R-11), App server: Node.js + TypeScript (Fastify), Metadata: title, tags, links, dates, space, folder, Self-hosting, Модель данных (общий обзор; детали — `architecture/data-model.md`), Резервные копии, Сервер (+6 more)

### Community 20 - "glossary.md"
Cohesion: 0.07
Nodes (41): doc_snapshots Table (compacted snapshots, version history), doc_updates Table (encrypted Yjs updates), Organization Hierarchy (Account > Space > Notebook > Folder > Note), GitHub Actions CI (incl. macOS iOS builds), Custom iOS Pen Render Layer (Metal or Core Animation), TextKit 2 (UIKit editor), Canvas + Pointer Events Pen Layer, XcodeGen (+33 more)

### Community 21 - "web/package.json"
Cohesion: 0.06
Nodes (43): devDependencies, fake-indexeddb@^6.2.6, jsdom@^30.1.3, @playwright/test@1.63.0, tailwindcss@^4, @tailwindcss/vite@^4, @testing-library/dom@^10.4.2, @testing-library/react@^16.3.3 (+35 more)

### Community 22 - "note.ts"
Cohesion: 0.09
Nodes (38): addTask(), deleteTask(), moveTask(), patchTask(), setTitleOf(), updateNote(), withNote(), appendTask() (+30 more)

### Community 23 - "dependencies"
Cohesion: 0.05
Nodes (37): dependencies, clsx@^2.1.1, cmdk@^1, dexie@^4, dexie-react-hooks@^4.4.0, libsodium-wrappers-sumo@^0.8, lucide-react@^1.61.0, minisearch@^7 (+29 more)

### Community 24 - "06-data-server.md (2)"
Cohesion: 0.19
Nodes (10): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, Контекст, Решение (на сейчас) (+2 more)

### Community 25 - "Платформы и клиенты (2)"
Cohesion: 0.33
Nodes (6): 1. Концепция продукта, Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения, Суть в одном абзаце

### Community 26 - "09-agents-api.md"
Cohesion: 0.11
Nodes (20): D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Handwriting Format for Agents (PNG), Export: Markdown, PDF, HTML (handwriting as images), pg-boss background job queue on PostgreSQL, PostgreSQL via Drizzle (D-30): accounts, notebooks, rights, tokens, encrypted updates, snapshots, agent log, Server responsibilities: accounts, encrypted relay, attachments, realtime, API/MCP, handwriting PNG render, 9. API и внешние ИИ-агенты (+12 more)

### Community 27 - "runtime.ts"
Cohesion: 0.11
Nodes (31): OpRow, flushOps(), listeners, onOpsChanged(), runOps(), accountMaps(), AccountSnapshot, initAccountDoc() (+23 more)

### Community 28 - "0004-encryption-and-api.md"
Cohesion: 0.16
Nodes (11): D-04. Одновременно сквозное шифрование и доступ по API, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), Notesnook, Контекст, Последствия, Решение, D-16. Импорт — не сейчас (+3 more)

### Community 29 - "SyncEngine"
Cohesion: 0.11
Nodes (9): ClientMessage, HelloAuth, ServerMessage, BACKOFF, OutgoingMessage, SyncEngine, SyncHost, SyncState (+1 more)

### Community 30 - "11. Нефункциональные требования"
Cohesion: 0.40
Nodes (5): 11. Нефункциональные требования, Доступность, Надёжность, Ресурсы сервера, Языки

### Community 31 - "router.tsx"
Cohesion: 0.07
Nodes (30): allRoute, appLayout, authLayout, calendarRoute, docRoute, folderRoute, guestRoute, indexRoute (+22 more)

### Community 32 - "Sidebar.tsx"
Cohesion: 0.14
Nodes (30): openTab(), activeSpace(), isStarred(), NoteEntry, noteTitle(), DocCard(), DocCollection(), DocRow() (+22 more)

### Community 33 - "open-questions.md (2)"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 34 - "SignupPage.tsx"
Cohesion: 0.16
Nodes (22): confirmRecoveryKeySaved(), authErrorMessage(), LoginPage(), submit(), RecoverPage(), submit(), MIN_PASSWORD, RecoveryKeyStep() (+14 more)

### Community 35 - "AppShell.tsx"
Cohesion: 0.15
Nodes (25): consumeFreshAccount(), useIndexVersion, hasRuntime(), startRuntime(), getOrCreateDaily(), purgeOldTrash(), HistoryDialog(), CommandPalette() (+17 more)

### Community 36 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 37 - "cn"
Cohesion: 0.14
Nodes (20): zustand@^5, ButtonProps, Size, sizes, Variant, variants, cn(), ConfirmHost() (+12 more)

### Community 38 - "DocPage.tsx"
Cohesion: 0.15
Nodes (25): colorFor(), folderPath(), Backlinks(), DocPage(), DocScreen(), IconPicker(), DocView(), Row() (+17 more)

### Community 39 - "Editor.tsx"
Cohesion: 0.14
Nodes (28): DsDocument, DsLink, AgentEdit, atomBlock(), attr(), BlockIds, Callout, DrawingBlock (+20 more)

### Community 40 - "actions.ts"
Cohesion: 0.15
Nodes (28): cachedNoteKey(), rememberNoteKey(), enqueueOp(), opsChanged(), runtime(), acc(), belongsTo(), bootstrapAccount() (+20 more)

### Community 41 - "0005-living-stroke.md"
Cohesion: 0.12
Nodes (14): D-05. Перо при перекладке текста — вариант А «живой штрих», PencilKit (rejected), Гипотеза реализации, Контекст, Последствия, Решение, D-08. Аннотации PDF пером — не в MVP, PDF pen annotations (PDFKit + stroke layer) (+6 more)

### Community 42 - "dates.ts"
Cohesion: 0.14
Nodes (19): en, Loose, keys(), Lang, Messages, ru, addDays(), formatDateTime() (+11 more)

### Community 43 - "open-questions.md (3)"
Cohesion: 0.40
Nodes (5): docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, iOS build and tests on macOS CI runner per push

### Community 44 - "server.mjs"
Cohesion: 0.11
Nodes (15): authed(), b64u(), clients, cors, db, err(), issueSession(), newTokens() (+7 more)

### Community 45 - "docStore.ts"
Cohesion: 0.11
Nodes (20): getMasterKey(), Listener, ORIGIN_LOAD, ORIGIN_REMOTE, SNAPSHOT_AFTER, notebookKey(), notebookKeys, noteKey() (+12 more)

### Community 46 - "session.ts"
Cohesion: 0.17
Nodes (20): deviceId(), deviceKey(), openLocal(), SealedBlob, sealLocal(), AuthState, AuthStatus, persist() (+12 more)

### Community 47 - "accountDb"
Cohesion: 0.26
Nodes (4): accountDb, DocRow, DocStore, DocKind

### Community 48 - "menus.tsx"
Cohesion: 0.22
Nodes (19): createFolder(), deleteFolder(), deleteNoteForever(), moveFolder(), moveNote(), nbMaps(), removeStarredWhere(), restoreNote() (+11 more)

### Community 49 - "ListPages.tsx"
Cohesion: 0.27
Nodes (18): allTags(), notesInSpace(), spaceNotebooks(), useWorkspace, visibleNotes(), AllDocsPage(), FolderChips(), FolderPage() (+10 more)

### Community 50 - "main.tsx"
Cohesion: 0.14
Nodes (14): @fontsource-variable/inter@^5.3.0, @fontsource-variable/jetbrains-mono@^5.3.0, @fontsource-variable/newsreader@^5.3.0, react-dom@^19, apply(), initTheme(), read(), setTheme() (+6 more)

### Community 51 - "01-concept.md"
Cohesion: 0.15
Nodes (9): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, D-03. Платформы: нативные iPhone и iPad + полноценный веб, Full-featured web client (TypeScript), Контекст, Последствия, Решение (+1 more)

### Community 52 - "Процесс разработки (docs/development.md)"
Cohesion: 0.18
Nodes (15): Стартовый хук Claude Code (.claude/hooks/session-start.sh), D-23 (документация), git-хук Graphify (пересборка только по изменённому коду), Graphify 0.9.95 (пакет graphifyy), Смысловой слой графа (понятия, решения, связи — проход ИИ), Структурный слой графа (код, файлы, заголовки — без ИИ), Автоматизация: стартовый хук, git-хук, graphify update после git pull, D-19 (код пишет Claude) (+7 more)

### Community 53 - "package.json"
Cohesion: 0.14
Nodes (15): devDependencies, turbo@^2.3.0, typescript@^5.6.0, engines, node, typescript, name, packageManager (+7 more)

### Community 54 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+7 more)

### Community 55 - "db.ts"
Cohesion: 0.15
Nodes (9): deviceDb, KvRow, NoteIndexRow, OutboxRow, TaskRow, UpdateRow, SearchHit, snippetAround() (+1 more)

### Community 57 - "04-editor.md"
Cohesion: 0.18
Nodes (12): Obsidian (reference product: links, backlinks, tags, Markdown export), 4. Редактор, Backlinks, iOS editor: UIKit + TextKit 2, Link graph view (not in MVP, stage 6), Web editor: TipTap (ProseMirror) + Yjs, [[ ]] links with autocomplete, Платформенная реализация (+4 more)

### Community 58 - "createNotebook"
Cohesion: 0.22
Nodes (11): i18next@^26, rememberNotebookKey(), createNotebook(), createSpace(), nextOrder(), setActiveSpace(), orderBetween(), toYMap() (+3 more)

### Community 59 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, baseUrl, declaration, jsx, lib, noEmit, paths, sourceMap (+4 more)

### Community 60 - "App.tsx"
Cohesion: 0.26
Nodes (10): App(), queryClient, router, onSignedOut(), useAuth, stopRuntime(), PwaPrompt(), TooltipProvider (+2 more)

### Community 62 - "D-21. Технологический стек"
Cohesion: 0.18
Nodes (11): Утверждён технологический стек (D-21), отказ от ядра на Rust (D-22), D-21. Технологический стек, Контекст, Последствия, Рассмотренные варианты (по обсуждению 2026-10-25), Решение, D-22. Без собственного общего ядра на Rust, Контекст (+3 more)

### Community 63 - "0024-product-name.md"
Cohesion: 0.18
Nodes (10): D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст, Решение, Final Product Name, Datascratch, For non-Russian readers (+2 more)

### Community 64 - "tasks"
Cohesion: 0.18
Nodes (10): dependsOn, outputs, $schema, tasks, build, lint, test, typecheck (+2 more)

### Community 65 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, declaration, lib, noEmit, sourceMap, types, extends, include (+1 more)

### Community 66 - "Определение «готово» для любого изменения"
Cohesion: 0.27
Nodes (5): Скрипт tools/graphify_docs.py (prepare → агенты → finish), Обновление графа после правки документов (prepare → агенты → finish → export html → check-update), Промпт извлечения .claude/skills/graphify/references/extraction-spec.md, Git: ветки, PR, один коммит = код + docs + граф, Команды Graphify (query, explain, path, update, check-update, /graphify)

### Community 67 - "Контракт: модель документа (v1)"
Cohesion: 0.20
Nodes (9): 1. Три вида документов Yjs, 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note`, 5. Производные данные (не синхронизируются), 6. Версия формата (+1 more)

### Community 68 - "Контракт: протокол синхронизации (v1)"
Cohesion: 0.20
Nodes (9): 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05), 6. Права, 7. Коды ошибок, 8. Тестовые векторы (+1 more)

### Community 69 - "D-29. Graphify: порядок работы, чтобы граф был всегда актуален"
Cohesion: 0.24
Nodes (7): Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, D-29. Graphify: порядок работы, чтобы граф был всегда актуален, R-09 (риск: Graphify сломается или исчезнет), Контекст, Последствия, Решение, Раскладка graphify-out/ и что хранится в git

### Community 70 - "08-sharing.md"
Cohesion: 0.24
Nodes (8): Web client as full desktop replacement (Pointer Events pressure, offline PWA), 8. Совместная работа и шеринг, Guest editing without account in any browser, Share links with view/edit rights, expiry and revocation, Universal Links (requires Apple Developer account and apple-app-site-association), Открыто (см. `open-questions.md`), Реализация, Требования

### Community 71 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, e2e, lint, mock-server, preview, test (+1 more)

### Community 72 - "Datascratch — правила для ИИ"
Cohesion: 0.22
Nodes (8): Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой, Правила, Среда разработки, Создан CLAUDE.md и скелет монорепозитория (apps/, packages/, infra/)

### Community 73 - "12. Функции по мотивам Craft"
Cohesion: 0.22
Nodes (8): 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft, Связь с моделью данных

### Community 74 - "Соглашения"
Cohesion: 0.25
Nodes (8): Документация Datascratch, История, Как вносить изменения, Оглавление, Порядок чтения для новичка, Соглашения, Ссылки на решения, Статусы

### Community 75 - "0013-collaboration-sharing.md"
Cohesion: 0.38
Nodes (5): D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account, Universal Links (paid Apple Developer account), Последствия, Решение

### Community 76 - "SyncIndicator.tsx"
Cohesion: 0.53
Nodes (4): PresenceStack(), SyncIndicator(), Tooltip(), useSyncStatus

### Community 77 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.33
Nodes (5): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 78 - "D-28. Процесс разработки: облако + Mac, сборка iOS в CI"
Cohesion: 0.33
Nodes (6): Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), D-28. Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen (project.yml) - proposed, Контекст, Последствия, Решение

### Community 79 - "web-editor/index.ts"
Cohesion: 0.40
Nodes (3): @tiptap/react@^3, NoteEditorProps, @tiptap/react

### Community 80 - "AuthLayout.tsx"
Cohesion: 0.70
Nodes (3): AuthLayout(), Logo(), Splash()

### Community 81 - "0014-organization.md"
Cohesion: 0.40
Nodes (4): D-14. Организация: богатая, но не перегруженная, Spaces, nested folders, smart tags, colors, Решение, Organization Structure (notebook vs space vs folder)

### Community 82 - "D-32. Минимальная версия iOS/iPadOS — 26"
Cohesion: 0.40
Nodes (4): D-32. Минимальная версия iOS/iPadOS — 26, Последствия, Рассмотренные варианты, Решение

### Community 83 - "D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления"
Cohesion: 0.40
Nodes (4): D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления, Контекст, Рассмотренные варианты, Решение

### Community 84 - "D-39. Разработка параллельными сессиями; Claude сам вливает в main"
Cohesion: 0.40
Nodes (4): D-39. Разработка параллельными сессиями; Claude сам вливает в main, Контекст, Последствия, Решение

### Community 85 - "D-35. Пометка на удалённом тексте исчезает вместе с ним"
Cohesion: 0.50
Nodes (3): D-35. Пометка на удалённом тексте исчезает вместе с ним, Рассмотренные варианты, Решение

### Community 86 - "D-36. Структура: пространство → блокноты → папки"
Cohesion: 0.50
Nodes (3): D-36. Структура: пространство → блокноты → папки, Рассмотренные варианты, Решение

### Community 87 - "D-38. Дизайн-направление — «Тихая бумага», ориентир Craft"
Cohesion: 0.50
Nodes (3): D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Рассмотренные варианты, Решение

### Community 88 - "D-41. Набор функций по мотивам Craft"
Cohesion: 0.50
Nodes (3): D-41. Набор функций по мотивам Craft, Контекст, Решение

## Knowledge Gaps
- **50 isolated node(s):** `../../tsconfig.base.json`, `../../tsconfig.base.json`, `Доступ внешних ИИ-агентов через MCP/REST`, `Apple Pencil в тексте — ключевая фича и главный риск`, `R-09 (риск: Graphify сломается или исчезнет)` (+45 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 512 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Контракт: модель документа (v1)` connect `Контракт: модель документа (v1)` to `runtime.ts`?**
  _High betweenness centrality (0.435) - this node is a cross-community bridge._
- **What connects `../../tsconfig.base.json`, `../../tsconfig.base.json`, `Доступ внешних ИИ-агентов через MCP/REST` to the rest of the system?**
  _50 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Datascratch — правила для ИИ (CLAUDE.md)` be split into smaller, more focused modules?**
  _Cohesion score 0.13450292397660818 - nodes in this community are weakly interconnected._
- **Why does `label()` connect `Скрипт обновления графа` to `Контракт: модель документа (v1)`?**
  _High betweenness centrality (0.430) - this node is a cross-community bridge._
- **Should `iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)` be split into smaller, more focused modules?**
  _Cohesion score 0.13157894736842105 - nodes in this community are weakly interconnected._
- **Should `10-sync.md` be split into smaller, more focused modules?**
  _Cohesion score 0.050170068027210885 - nodes in this community are weakly interconnected._
- **Should `D-21: разделы` be split into smaller, more focused modules?**
  _Cohesion score 0.10952380952380952 - nodes in this community are weakly interconnected._