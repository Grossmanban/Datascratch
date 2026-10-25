# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 186 files · ~57,854 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 4, .css 2, .example 1)

## Summary
- 1710 nodes · 3910 edges · 104 communities (91 shown, 13 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 303 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `54d5f3ad`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Datascratch — правила для ИИ (CLAUDE.md)
- iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)
- 03-pencil.md
- D-21: разделы
- Платформы и клиенты
- 04-editor.md
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
- Модель данных — ЧЕРНОВИК
- decisions/README.md
- flows.ts
- 06-data-server.md
- glossary.md
- web/package.json
- note.ts
- dependencies
- 06-data-server.md (2)
- 01-concept.md
- 09-agents-api.md
- runtime.ts
- client.ts
- SyncEngine
- 11-nfr.md
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
- risks.md
- dates.ts
- open-questions.md (3)
- server.mjs
- docStore.ts
- SyncHost
- accountDb
- Контракт: REST API сервера (v1)
- ListPages.tsx
- main.tsx
- 01-concept.md
- Процесс разработки (docs/development.md)
- package.json
- compilerOptions
- db.ts
- .start
- 10-sync.md
- createNotebook
- compilerOptions
- App.tsx
- .stop
- D-21. Технологический стек
- Контракт: шифрование (v1)
- tasks
- compilerOptions
- 0005-living-stroke.md
- Контракт: модель документа (v1)
- Контракт: протокол синхронизации (v1)
- D-29. Graphify: порядок работы, чтобы граф был всегда актуален
- 08-sharing.md
- scripts
- Datascratch — правила для ИИ
- 12. Функции по мотивам Craft
- Соглашения
- text
- 3. Apple Pencil в тексте — ключевая фича
- Контракт: дизайн-токены «Тихая бумага» (v1)
- D-28. Процесс разработки: облако + Mac, сборка iOS в CI
- web-editor/index.ts
- Технологический стек — РЕШЕНО (2026-10-25)
- 0010-agent-edits.md
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
- @tiptap/core
- 7. Шифрование и доступ агентов
- stubs/README.md
- changelog.d/README.md
- agents/README.md
- design-tokens/README.md
- ui/README.md
- web-editor/README.md
- pnpm-workspace.yaml
- config.ts
- 4. Документ `note`

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
- `8. Режим «для агентов» (R-10)` --references--> `notebookKey()`  [INFERRED]
  docs/architecture/contracts/crypto.md → apps/web/src/data/keys.ts
- `1. Три вида документов Yjs` --references--> `DocKind`  [INFERRED]
  docs/architecture/contracts/document-model.md → apps/web/src/stubs/shared/contracts.ts
- `4. Ключ восстановления` --references--> `recoveryLoginKey()`  [INFERRED]
  docs/architecture/contracts/crypto.md → apps/web/src/stubs/shared/crypto.ts
- `4.2. Схема блоков` --references--> `label()`  [INFERRED]
  docs/architecture/contracts/document-model.md → tools/graphify_docs.py
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

## Communities (104 total, 13 thin omitted)

### Community 0 - "Datascratch — правила для ИИ (CLAUDE.md)"
Cohesion: 0.12
Nodes (18): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел) (+10 more)

### Community 1 - "iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)"
Cohesion: 0.08
Nodes (21): apps/ios — iPhone + iPad, iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), apps/server — сервер, apps/web — веб-клиент, Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), iPhone and iPad share one codebase (universal app), Web client as full desktop replacement (Pointer Events pressure, offline PWA) (+13 more)

### Community 2 - "03-pencil.md"
Cohesion: 0.15
Nodes (11): D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, Handwriting input types (text marks, margin notes, drawing block, drawing on images, Scribble), Pencil gestures (zigzag delete, underline, strike, lasso), Prototype open questions (multi-word circles, deleted marked text R-04), Stroke point anchoring: character anchor + dx/dy in font-size units, System Scribble only; no recognition of drawn ink (D-07) (+3 more)

### Community 3 - "D-21: разделы"
Cohesion: 0.12
Nodes (16): Обоснованы PostgreSQL (D-30) и Yjs (D-31) как отдельные решения, Прототип пера хранит текст в Yrs (D-27), D-27. В прототипе пера текст хранится в Yrs, Контекст, Последствия, Решение, D-30. База данных сервера — PostgreSQL, Контекст (+8 more)

### Community 4 - "Платформы и клиенты"
Cohesion: 0.11
Nodes (16): D-06. Рисование пальцем на iPhone — да, опционально, Finger drawing toggle on iPhone, Решение, D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, 2. Платформы, UI languages Russian and English, no RTL (D-17) (+8 more)

### Community 5 - "04-editor.md"
Cohesion: 0.08
Nodes (23): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты, Решение (+15 more)

### Community 6 - "План разработки"
Cohesion: 0.17
Nodes (12): Критерии приёмки, План разработки, Подготовка, Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad), Этап 2 — MVP на iPad и iPhone, локально (+4 more)

### Community 7 - "Дизайн и организация"
Cohesion: 0.12
Nodes (16): D-15. Дизайн — основная концепция продукта, Design references: Things 3, Linear, Craft, Arc, Последствия, Решение, 5. Организация заметок и дизайн, Light/dark theme, Dynamic Type, VoiceOver, full iPad keyboard, Feel references: Things 3, Linear, Craft, Arc, Own design system unified on iOS and web (+8 more)

### Community 8 - "Процесс разработки и Graphify"
Cohesion: 0.13
Nodes (13): Monorepo Structure (apps/, packages/, infra/), Git, Graphify, Автоматизация, Две среды, Команды, Конец сессии, Кто что делает (+5 more)

### Community 9 - "contracts.ts"
Cohesion: 0.12
Nodes (23): accountApi, agentTokensApi, authApi, docsApi, noAuth, notebooksModeApi, opBodies, sharesApi (+15 more)

### Community 10 - "Модель данных и глоссарий"
Cohesion: 0.11
Nodes (33): agent_tokens / agent_audit_log Tables, doc_updates Table (encrypted Yjs updates), Server PostgreSQL Schema (Stage 3 Draft), Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, File Storage (disk or external S3) (+25 more)

### Community 11 - "stack.md"
Cohesion: 0.12
Nodes (21): packages/test-vectors, Web PWA Client (React, TipTap, Yjs, IndexedDB), Astro (landing page), Dexie (IndexedDB), Drizzle ORM, Fastify, GRDB (SQLite), libsodium (swift-sodium) (+13 more)

### Community 12 - "Компоненты стека"
Cohesion: 0.09
Nodes (27): Убран Redis (D-25): один процесс сервера, очередь — pg-boss на PostgreSQL, Dexie (IndexedDB), Drizzle ORM, Fastify, GRDB (SQLite), MCP TypeScript SDK, OAuth 2.1, pg-boss job queue (+19 more)

### Community 13 - "0009-notebook-mode-choice.md"
Cohesion: 0.13
Nodes (14): D-04. Одновременно сквозное шифрование и доступ по API, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), Контекст, Последствия, Решение, D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение (+6 more)

### Community 14 - "Скрипт обновления графа"
Cohesion: 0.28
Nodes (7): Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 15 - "0031-crdt-yjs.md"
Cohesion: 0.13
Nodes (24): Automerge (fallback CRDT), Yrs (Rust Yjs) with Swift Wrapper, Canvas + Pointer Events, Custom pen renderer (Metal vs Core Animation TBD), End-to-end encryption, iOS client stack, SwiftUI (shell), TipTap editor (+16 more)

### Community 16 - "Модель данных — ЧЕРНОВИК"
Cohesion: 0.40
Nodes (5): Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3), Штрих (черновик для прототипа)

### Community 17 - "decisions/README.md"
Cohesion: 0.10
Nodes (14): D-19. Весь код пишет Claude, Последствия, Решение, Node.js + TypeScript server, Swift 6, TypeScript, Shared Rust core (rejected), Shared test vectors (packages/test-vectors) (+6 more)

### Community 18 - "flows.ts"
Cohesion: 0.06
Nodes (71): deviceId(), deviceKey(), deviceName(), openLocal(), SealedBlob, sealLocal(), changePassword(), loginKeyFor() (+63 more)

### Community 19 - "06-data-server.md"
Cohesion: 0.09
Nodes (25): Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), MinIO (rejected), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Server disk folder storage (default), External S3-compatible storage (Hetzner, R2, B2), File storage interface (two implementations, chosen by config), Garage / SeaweedFS (+17 more)

### Community 20 - "glossary.md"
Cohesion: 0.08
Nodes (36): Anchor (textRange / paragraph / drawingBlock / image), Note, Organization Hierarchy (Account > Space > Notebook > Folder > Note), Stroke, StrokePoint, GitHub Actions CI (incl. macOS iOS builds), Custom iOS Pen Render Layer (Metal or Core Animation), TextKit 2 (UIKit editor) (+28 more)

### Community 21 - "web/package.json"
Cohesion: 0.06
Nodes (43): devDependencies, fake-indexeddb@^6.2.6, jsdom@^30.1.3, @playwright/test@1.63.0, tailwindcss@^4, @tailwindcss/vite@^4, @testing-library/dom@^10.4.2, @testing-library/react@^16.3.3 (+35 more)

### Community 22 - "note.ts"
Cohesion: 0.13
Nodes (27): addTask(), deleteTask(), moveTask(), patchTask(), setTitleOf(), withNote(), appendTask(), cloneNode() (+19 more)

### Community 23 - "dependencies"
Cohesion: 0.05
Nodes (37): dependencies, clsx@^2.1.1, cmdk@^1, dexie@^4, libsodium-wrappers-sumo@^0.8, lucide-react@^1.61.0, minisearch@^7, motion@^12 (+29 more)

### Community 24 - "06-data-server.md (2)"
Cohesion: 0.19
Nodes (10): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, Контекст, Решение (на сейчас) (+2 more)

### Community 25 - "01-concept.md"
Cohesion: 0.15
Nodes (11): D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, 1. Концепция продукта, Obsidian (reference product: links, backlinks, tags, Markdown export), Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения, Суть в одном абзаце (+3 more)

### Community 26 - "09-agents-api.md"
Cohesion: 0.11
Nodes (18): D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Handwriting Format for Agents (PNG), Export: Markdown, PDF, HTML (handwriting as images), Server responsibilities: accounts, encrypted relay, attachments, realtime, API/MCP, handwriting PNG render, Local MCP bridge (future): local utility holding key for agent access to private notebooks, 9. API и внешние ИИ-агенты, Log of all agent actions (+10 more)

### Community 27 - "runtime.ts"
Cohesion: 0.15
Nodes (24): accountMaps(), AccountSnapshot, initAccountDoc(), readAccount(), initNotebookDoc(), notebookMaps(), NotebookSnapshot, readNotebook() (+16 more)

### Community 28 - "client.ts"
Cohesion: 0.16
Nodes (15): api, ApiError, doFetch(), NetworkError, request(), RequestOptions, setTokenSource(), toError() (+7 more)

### Community 29 - "SyncEngine"
Cohesion: 0.13
Nodes (7): ClientMessage, HelloAuth, BACKOFF, OutgoingMessage, SyncEngine, SyncState, SyncStatus

### Community 30 - "11-nfr.md"
Cohesion: 0.20
Nodes (9): Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps, Daily off-VPS backups of DB and files with verified restore (R-11), 11. Нефункциональные требования, Performance targets (PencilKit latency, 120 fps, 300 ms open, 1-min first sync, 2 s delivery, 1 s cold start), Reliability: no edit lost on network drop, crash or low storage, Доступность, Надёжность, Ресурсы сервера (+1 more)

### Community 31 - "router.tsx"
Cohesion: 0.07
Nodes (31): allRoute, appLayout, authLayout, calendarRoute, docRoute, folderRoute, guestRoute, indexRoute (+23 more)

### Community 32 - "Sidebar.tsx"
Cohesion: 0.11
Nodes (49): dexie-react-hooks@^4.4.0, deleteFolder(), deleteSpace(), isDescendant(), moveFolder(), moveNote(), openTab(), updateFolder() (+41 more)

### Community 33 - "open-questions.md (2)"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 34 - "SignupPage.tsx"
Cohesion: 0.19
Nodes (20): authErrorMessage(), LoginPage(), submit(), RecoverPage(), submit(), MIN_PASSWORD, RecoveryKeyStep(), SignupForm() (+12 more)

### Community 35 - "AppShell.tsx"
Cohesion: 0.13
Nodes (29): useAuth, useIndexVersion, hasRuntime(), startRuntime(), getOrCreateDaily(), purgeOldTrash(), HistoryDialog(), CommandPalette() (+21 more)

### Community 36 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 37 - "cn"
Cohesion: 0.13
Nodes (20): SyncIndicator(), ButtonProps, Size, sizes, Variant, variants, cn(), ConfirmHost() (+12 more)

### Community 38 - "DocPage.tsx"
Cohesion: 0.11
Nodes (29): colorFor(), PresenceUser, toggleStar(), updateNote(), DEFAULT_STYLE, folderPath(), Backlinks(), DocScreen() (+21 more)

### Community 39 - "Editor.tsx"
Cohesion: 0.14
Nodes (28): DsDocument, DsLink, AgentEdit, atomBlock(), attr(), BlockIds, Callout, DrawingBlock (+20 more)

### Community 40 - "actions.ts"
Cohesion: 0.18
Nodes (26): cachedNoteKey(), runtime(), acc(), belongsTo(), bootstrapAccount(), closeTab(), createNote(), dailyNotebookId() (+18 more)

### Community 41 - "risks.md"
Cohesion: 0.10
Nodes (20): doc_snapshots Table (compacted snapshots, version history), Canvas + Pointer Events Pen Layer, D-08. Аннотации PDF пером — не в MVP, PDF pen annotations (PDFKit + stroke layer), Решение (предложение), Snapshot, Universal Links, Apple Developer Account (+12 more)

### Community 42 - "dates.ts"
Cohesion: 0.13
Nodes (21): i18next@^26, en, Loose, keys(), Lang, Messages, ru, addDays() (+13 more)

### Community 43 - "open-questions.md (3)"
Cohesion: 0.40
Nodes (5): docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, iOS build and tests on macOS CI runner per push

### Community 44 - "server.mjs"
Cohesion: 0.11
Nodes (15): authed(), b64u(), clients, cors, db, err(), issueSession(), newTokens() (+7 more)

### Community 45 - "docStore.ts"
Cohesion: 0.16
Nodes (14): notebooksApi, getMasterKey(), Listener, ORIGIN_LOAD, ORIGIN_REMOTE, SNAPSHOT_AFTER, notebookKey(), notebookKeys (+6 more)

### Community 47 - "accountDb"
Cohesion: 0.24
Nodes (5): accountDb, DocRow, DocStore, enqueueOp(), DocKind

### Community 48 - "Контракт: REST API сервера (v1)"
Cohesion: 0.15
Nodes (12): Notebook, Session, Share, Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1) (+4 more)

### Community 49 - "ListPages.tsx"
Cohesion: 0.23
Nodes (21): allTags(), notesInSpace(), readLocalSpace(), spaceNotebooks(), useWorkspace, visibleNotes(), DocPage(), AllDocsPage() (+13 more)

### Community 50 - "main.tsx"
Cohesion: 0.18
Nodes (8): @fontsource-variable/inter@^5.3.0, @fontsource-variable/jetbrains-mono@^5.3.0, @fontsource-variable/newsreader@^5.3.0, react-dom@^19, @fontsource-variable/inter, @fontsource-variable/jetbrains-mono, @fontsource-variable/newsreader, react-dom

### Community 51 - "01-concept.md"
Cohesion: 0.13
Nodes (12): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, D-03. Платформы: нативные iPhone и iPad + полноценный веб, Full-featured web client (TypeScript), Контекст, Последствия, Решение (+4 more)

### Community 52 - "Процесс разработки (docs/development.md)"
Cohesion: 0.14
Nodes (16): Стартовый хук Claude Code (.claude/hooks/session-start.sh), git-хук Graphify (пересборка только по изменённому коду), Скрипт tools/graphify_docs.py (prepare → агенты → finish), Graphify 0.9.95 (пакет graphifyy), Смысловой слой графа (понятия, решения, связи — проход ИИ), Структурный слой графа (код, файлы, заголовки — без ИИ), Автоматизация: стартовый хук, git-хук, graphify update после git pull, D-19 (код пишет Claude) (+8 more)

### Community 53 - "package.json"
Cohesion: 0.14
Nodes (15): devDependencies, turbo@^2.3.0, typescript@^5.6.0, engines, node, typescript, name, packageManager (+7 more)

### Community 54 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+7 more)

### Community 55 - "db.ts"
Cohesion: 0.25
Nodes (5): NoteIndexRow, TaskRow, SearchHit, snippetAround(), NoteKind

### Community 56 - ".start"
Cohesion: 0.17
Nodes (3): Indexer, onOpsChanged(), AccountRuntime

### Community 57 - "10-sync.md"
Cohesion: 0.21
Nodes (9): 10. Синхронизация и офлайн, Local storage: SQLite via GRDB (iOS), IndexedDB via Dexie (web), Agent notebooks: server decrypts and applies agent edit as a normal update, Trash for 30 days, Version history: snapshots, view, rollback, Each note is a Yjs CRDT doc; edits are small binary updates, Как это работает (обзор), Требования (+1 more)

### Community 58 - "createNotebook"
Cohesion: 0.33
Nodes (10): createFolder(), createNotebook(), createSpace(), nextOrder(), now(), setActiveSpace(), toYMap(), submit() (+2 more)

### Community 59 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, baseUrl, declaration, jsx, lib, noEmit, paths, sourceMap (+4 more)

### Community 60 - "App.tsx"
Cohesion: 0.17
Nodes (13): App(), queryClient, onSignedOut(), stopRuntime(), AuthLayout(), PwaPrompt(), Logo(), Splash() (+5 more)

### Community 62 - "D-21. Технологический стек"
Cohesion: 0.18
Nodes (11): Утверждён технологический стек (D-21), отказ от ядра на Rust (D-22), D-21. Технологический стек, Контекст, Последствия, Рассмотренные варианты (по обсуждению 2026-10-25), Решение, D-22. Без собственного общего ядра на Rust, Контекст (+3 more)

### Community 63 - "Контракт: шифрование (v1)"
Cohesion: 0.20
Nodes (9): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 8. Режим «для агентов» (R-10), 9. Тестовые векторы (+1 more)

### Community 64 - "tasks"
Cohesion: 0.18
Nodes (10): dependsOn, outputs, $schema, tasks, build, lint, test, typecheck (+2 more)

### Community 65 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, declaration, lib, noEmit, sourceMap, types, extends, include (+1 more)

### Community 66 - "0005-living-stroke.md"
Cohesion: 0.24
Nodes (6): D-05. Перо при перекладке текста — вариант А «живой штрих», PencilKit (rejected), Гипотеза реализации, Контекст, Последствия, Решение

### Community 67 - "Контракт: модель документа (v1)"
Cohesion: 0.40
Nodes (4): 1. Три вида документов Yjs, 5. Производные данные (не синхронизируются), 6. Версия формата, Контракт: модель документа (v1)

### Community 68 - "Контракт: протокол синхронизации (v1)"
Cohesion: 0.20
Nodes (9): 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05), 6. Права, 7. Коды ошибок, 8. Тестовые векторы (+1 more)

### Community 69 - "D-29. Graphify: порядок работы, чтобы граф был всегда актуален"
Cohesion: 0.22
Nodes (8): Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, D-23 (документация), D-29. Graphify: порядок работы, чтобы граф был всегда актуален, R-09 (риск: Graphify сломается или исчезнет), Контекст, Последствия, Решение, Раскладка graphify-out/ и что хранится в git

### Community 70 - "08-sharing.md"
Cohesion: 0.16
Nodes (12): D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account, Universal Links (paid Apple Developer account), Последствия, Решение, 8. Совместная работа и шеринг, Guest editing without account in any browser, Share links with view/edit rights, expiry and revocation (+4 more)

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

### Community 75 - "text"
Cohesion: 0.28
Nodes (8): text(), 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4. Привязка к тексту (живой штрих), 5. Отрисовка толщины, 6. Тестовые векторы, Контракт: рукописные штрихи (v1)

### Community 76 - "3. Apple Pencil в тексте — ключевая фича"
Cohesion: 0.22
Nodes (9): 3. Apple Pencil в тексте — ключевая фича, Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера, Перекладка текста — вариант А «живой штрих» (D-05, РЕШЕНО) (+1 more)

### Community 77 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.33
Nodes (5): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 78 - "D-28. Процесс разработки: облако + Mac, сборка iOS в CI"
Cohesion: 0.22
Nodes (9): 2026-10-25, Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Журнал изменений, D-28. Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen (project.yml) - proposed, Контекст, Последствия (+1 more)

### Community 79 - "web-editor/index.ts"
Cohesion: 0.40
Nodes (3): @tiptap/react@^3, NoteEditorProps, @tiptap/react

### Community 80 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 81 - "0010-agent-edits.md"
Cohesion: 0.33
Nodes (5): D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение

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

### Community 93 - "@tiptap/core"
Cohesion: 0.33
Nodes (4): @tiptap/core@^3, @tiptap/extensions@^3, @tiptap/core, @tiptap/extensions

### Community 94 - "7. Шифрование и доступ агентов"
Cohesion: 0.33
Nodes (6): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 102 - "config.ts"
Cohesion: 0.60
Nodes (4): apiBase(), APP_VERSION, serverOrigin(), syncUrl()

### Community 103 - "4. Документ `note`"
Cohesion: 0.40
Nodes (5): 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note`

## Knowledge Gaps
- **50 isolated node(s):** `../../tsconfig.base.json`, `../../tsconfig.base.json`, `Доступ внешних ИИ-агентов через MCP/REST`, `Apple Pencil в тексте — ключевая фича и главный риск`, `Astro (landing page)` (+45 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 512 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Контракт: модель документа (v1)` connect `Контракт: модель документа (v1)` to `runtime.ts`, `4. Документ `note``?**
  _High betweenness centrality (0.425) - this node is a cross-community bridge._
- **What connects `../../tsconfig.base.json`, `../../tsconfig.base.json`, `Доступ внешних ИИ-агентов через MCP/REST` to the rest of the system?**
  _50 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Datascratch — правила для ИИ (CLAUDE.md)` be split into smaller, more focused modules?**
  _Cohesion score 0.11688311688311688 - nodes in this community are weakly interconnected._
- **Why does `label()` connect `Скрипт обновления графа` to `4. Документ `note``?**
  _High betweenness centrality (0.420) - this node is a cross-community bridge._
- **Should `iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)` be split into smaller, more focused modules?**
  _Cohesion score 0.0812807881773399 - nodes in this community are weakly interconnected._
- **Why does `4. Документ `note`` connect `4. Документ `note`` to `Контракт: модель документа (v1)`?**
  _High betweenness centrality (0.419) - this node is a cross-community bridge._
- **Should `D-21: разделы` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._