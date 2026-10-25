# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
<<<<<<< HEAD
- 208 files · ~71,273 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 4, .css 2, .example 1)

## Summary
- 1977 nodes · 4902 edges · 110 communities (106 shown, 4 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 261 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `81c6ce52`
=======
- 399 files · ~183,074 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: (none) 10, .css 5, .example 2)

## Summary
- 5123 nodes · 11471 edges · 218 communities (191 shown, 27 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 856 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `84701452`
>>>>>>> origin/main
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
<<<<<<< HEAD
- actions.ts
- CalendarPage.tsx
- ShareDialog.tsx
- web/package.json
- DocPage.tsx
- 0031-crdt-yjs.md
- 06-data-server.md
- overview.md
- AppShell.tsx
- session.ts
- dependencies
- 02-platforms.md
- workspace.ts
- Editor.tsx
- Компоненты стека
- contracts.ts
- Процесс разработки (docs/development.md)
- glossary.md
- stack.md
- router.tsx
- crypto.ts
- server.mjs
- 10-sync.md
- steps
- iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)
- accountDb
- roadmap.md
- SignupPage.tsx
- GuestPage.tsx (2)
- 01-concept.md (2)
- D-41. Набор функций по мотивам Craft
- attachments.ts
- accountDb (2)
- useWorkspace
- Контракты между частями системы
- 04-editor.md
- GuestPage.tsx
- 07-encryption.md
- deriveKeys
- App.tsx
- accountDb (3)
- react
- 0031-crdt-yjs.md (2)
- helpers.ts
- package.json
- compilerOptions
- DocCards.tsx
- 03-pencil.md
- web-editor/README.md
- runtime.ts
- Скрипт обновления графа
- Контракт: REST API сервера (v1)
- open-questions.md (3)
- 06-data-server.md (2)
- Дизайн и организация
- Дизайн и организация (2)
- engine.ts
- compilerOptions (2)
- roadmap.md (2)
- Платформы и клиенты
- D-38. Дизайн-направление — «Тихая бумага», ориентир Craft
- data-model.md
- 09-agents-api.md
- i18n/index.ts
- glossary.md
- Процесс разработки и Graphify
- main.tsx
- Datascratch — правила для ИИ (CLAUDE.md)
- D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления
- 01-concept.md
- 4. Документ `note`
- D-39. Разработка параллельными сессиями; Claude сам вливает в main
- 08-sharing.md
- tasks
- iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium) (2)
- compilerOptions (3)
- accountDb (5)
- Процесс разработки и Graphify (2)
- D-05. Перо при перекладке текста — вариант А «живой штрих»
- D-21. Технологический стек
- D-36. Структура: пространство → блокноты → папки
- decisions/README.md
- PostgreSQL
- scripts
- Контракт: дизайн-токены «Тихая бумага» (v1)
- Контракт: протокол синхронизации (v1)
- D-32. Минимальная версия iOS/iPadOS — 26
- Технологический стек — РЕШЕНО (2026-10-25)
- 0003-platforms.md
- useNoteDoc.ts
- 0002-no-desktop-app.md
- 08-sharing.md (2)
- open-questions.md (2)
- Соглашения
- 12. Функции по мотивам Craft
- App.tsx (2)
- SyncIndicator.tsx
- CalendarPage.tsx (3)
- Обзор архитектуры: разделы
- D-35. Пометка на удалённом тексте исчезает вместе с ним
- D-03. Платформы: нативные iPhone и iPad + полноценный веб
- D-40. Хостинг — позже; сервер готов к запуску одной командой
- Процесс разработки и Graphify (3)
- 0006-finger-drawing-iphone.md
- web-editor/index.ts
- D-39. Разработка параллельными сессиями; Claude сам вливает в main
- Дизайн и организация (3)
- 2. Платформы
- Новая группа
- pnpm-workspace.yaml

## God Nodes (most connected - your core abstractions)
1. `cn()` - 62 edges
2. `useWorkspace` - 47 edges
3. `accountDb` - 43 edges
4. `react` - 42 edges
5. `Button` - 38 edges
6. `DocScreen()` - 34 edges
7. `react-i18next` - 32 edges
8. `lucide-react` - 29 edges
9. `runtime()` - 28 edges
10. `DocStore` - 26 edges

## Surprising Connections (you probably didn't know these)
- `Правило: сначала graphify query/path/explain, потом чтение файлов` --references--> `Graphify 0.9.95 (пакет graphifyy)`  [INFERRED]
  CLAUDE.md → docs/decisions/0029-graphify-workflow.md
- `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` --rationale_for--> `Иерархия источников истины (docs > граф > код > history)`  [EXTRACTED]
  docs/decisions/0029-graphify-workflow.md → CLAUDE.md
- `iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)` --implements--> `Local storage: SQLite via GRDB (iOS), IndexedDB via Dexie (web)`  [INFERRED]
  apps/ios/README.md → docs/spec/10-sync.md
- `iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)` --references--> `libsodium on all platforms`  [INFERRED]
  apps/ios/README.md → docs/spec/07-encryption.md
- `Custom stroke rendering layer over TextKit 2 (Metal or Core Animation)` --conceptually_related_to--> `iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)`  [INFERRED]
  docs/spec/03-pencil.md → apps/ios/README.md
=======
- package.json
- 0039-parallel-sessions.md
- stack.md
- devDependencies
- Контракт: модель документа (v1)
- store.ts
- strokes.md (2)
- D-29. Graphify: порядок работы, чтобы граф был всегда актуален
- crypto.md
- plugin.ts
- 11-nfr.md
- 0031-crdt-yjs.md (2)
- handwriting-png.ts
- schema.ts
- oauth.ts
- edits.ts
- D-30. База данных сервера — PostgreSQL
- agent-service.ts (2)
- auth.ts
- 10-sync.md
- stack.md (2)
- 0038-design-quiet-paper.md
- glossary.md
- InMemoryAgentsStore
- Скрипт обновления графа
- @datascratch/shared/crypto (libsodium)
- Монорепозиторий и CLAUDE.md
- main.tsx
- sync.test.ts
- strokes.md (3)
- server
- connection.ts
- api.md
- with
- ui/src/index.ts
- Правила для ИИ и документации (2) (2)
- KeyService
- Ядро, Yrs и шифрование
- 0005-living-stroke.md (3)
- PgBossQueue
- model.ts
- app.ts (2)
- 08-sharing.md
- blockId.ts
- document-model.md
- contracts/sync.ts
- decisions/README.md
- devDependencies
- tokens.ts
- План этапов и отложенное (2)
- compilerOptions
- 12. Функции по мотивам Craft (2)
- 04-editor.md
- Organization Hierarchy (Account > Space > Notebook > Folder > Note)
- Модель данных и глоссарий (2)
- 02-platforms.md
- decisions/README.md (2)
- open-questions.md
- with (2)
- 0018-monetization.md (2) (2)
- Контракт: протокол синхронизации (v1)
- keys.ts
- SyncClient
- test-vectors/package.json
- SyncConnection
- 01-concept.md
- oauth.test.ts
- documents.ts
- 09-agents-api.md
- Stage 1: Pen-in-Text Prototype (iPad)
- devDependencies
- Контракт: модель документа (v1) (2)
- DSDateChip
- D-39 Parallel sessions; Claude merges into main
- dependencies
- contracts/crypto.ts
- 02-platforms.md (2)
- steps
- risks.md
- Скрипт обновления графа (2)
- vectors.test.ts
- PenLayer.ts
- Обзор архитектуры: разделы
- 04-editor.md (2)
- Organization Hierarchy (Account > Space > Notebook > Folder > Note) (2)
- DSBackdrop
- design-tokens.md
- 12-craft-features.md
- steps
- Контракт: дизайн-токены «Тихая бумага» (v1)
- D-30. База данных сервера — PostgreSQL (2)
- DSDateChip (2)
- components.test.tsx
- 0005-living-stroke.md (2)
- store.ts
- @tiptap/core
- geometry.ts
- Контракт: REST API сервера (v1)
- plugins/host.ts
- tasks
- dependencies (2)
- Дизайн и организация (2)
- contracts/sync.ts (2)
- D-21. Технологический стек
- Datascratch — правила для ИИ (CLAUDE.md)
- open-questions.md (2)
- 0009-notebook-mode-choice.md (2)
- Правила для ИИ и документации (4)
- compilerOptions (4)
- exports
- 0036-space-notebook-folder.md
- Дизайн и организация
- AgentsStore
- sync-protocol.md
- 0009-notebook-mode-choice.md (2) (2)
- iOS-стек и два языка (2) (2)
- dependencies
- D-30. База данных сервера — PostgreSQL (2)
- devDependencies (3)
- shared/test/sync.test.ts
- Контракт: API для ИИ-агентов — MCP, REST, OAuth (v1, черновик) (2)
- Контракт: API для ИИ-агентов — MCP, REST, OAuth (v1, черновик)
- contracts/sync.ts (3)
- 06-data-server.md (2)
- document.test.ts
- @datascratch/design-tokens README
- 04-editor.md (4)
- shared/package.json
- 0009-notebook-mode-choice.md (5)
- context.ts (2)
- compilerOptions (2)
- 06-data-server.md
- Importer
- shared/test/sync.test.ts
- ref_react
- graphify_docs.py
- open-questions.md (2) (2)
- D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS) (2)
- Инструменты MCP и REST для агентов
- Как подключить Claude или ChatGPT к Datascratch
- oauth.test.ts (3)
- compilerOptions (2)
- @tailwindcss/vite
- peerDependencies
- compilerOptions (3)
- OAuth 2.1 для MCP
- 08-sharing.md (2)
- Контракт: рукописные штрихи (v1)
- 0005-living-stroke.md
- 0018-monetization.md
- web-editor/package.json
- scripts
- sync-protocol.md (2)
- 01-concept.md
- 0005-living-stroke.md (2)
- Shared test vectors (input -> expected output) run in Swift and TypeScript
- compilerOptions (3)
- agents/package.json
- Правки агента и Markdown для агентов
- generate.ts
- Технологический стек — РЕШЕНО (2026-10-25)
- pen.spec.tsx
- 0005-living-stroke.md (4)
- 04-editor.md (4) (2)
- test-vectors/tsconfig.json
- contracts/README.md
- D-39 Parallel sessions; Claude merges into main
- Правки агента и Markdown для агентов (2)
- Обзор архитектуры
- web-editor.yml
- Новая группа (4)
- Контракт: API для ИИ-агентов — MCP, REST, OAuth (v1, черновик) (2)
- @datascratch/shared package
- agents/tsconfig.build.json
- 7. Шифрование и доступ агентов
- scripts (2)
- True
- scripts (2)
- scripts (3)
- @datascratch/shared/strokes
- @datascratch/shared/sync
- scripts (2) (2)
- roadmap.md (2)
- 2026-10-25 (вторая половина дня) (2)
- 2026-10-25 (вторая половина дня) (3)
- Stream design-system (claude/design-system): packages/design-tokens, packages/ui, apps/ios/Packages/DSDesign — Quiet Paper tokens, web and SwiftUI components (3)
- ./plugin-api
- ./testing
- yjs
- 04-editor.md
- .prettierrc.json
- ./contracts
- tsup
- exports (2)
- Package.swift
- typescript@^5.9.0
- pnpm-workspace.yaml (2)
- Новая группа
- Новая группа (2)
- Новая группа (3)
- Новая группа (4) (2)
- iOS system fonts New York / SF Pro / SF Mono
- @fastify/rate-limit
- MCP Toolset
- fastify
- PM-JSON <-> Yjs conversion (y-prosemirror compatible)
- drizzle-kit
- concurrency
- @datascratch/shared/contracts (types and zod schemas)
- index.tsx
- @expo-google-fonts/newsreader@^0.4.1
- @tiptap/extension-horizontal-rule
- @tiptap/extensions
- @tiptap/react@^3.32.0
- @tiptap/suggestion

## God Nodes (most connected - your core abstractions)
1. `cn()` - 80 edges
2. `PenLayer` - 43 edges
3. `AgentError` - 37 edges
4. `Principal` - 35 edges
5. `DSTintToken` - 34 edges
6. `registerOAuthRoutes()` - 33 edges
7. `AgentService` - 33 edges
8. `SyncClient` - 33 edges
9. `DSRGBA` - 32 edges
10. `AppContext` - 29 edges

## Surprising Connections (you probably didn't know these)
- `Перестройка блоков (§4.1a): при разделении, слиянии, смене типа и перемещении блока клиент в той же транзакции заменяет затронутый штрих копией (новый strokeId, те же точки, якоря по соответствию символов)` --semantically_similar_to--> `rebaseRedoneAnchors()`  [INFERRED] [semantically similar]
  docs/architecture/contracts/strokes.md → packages/shared/src/strokes/store.ts
- `Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО` --semantically_similar_to--> `Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/README.md
- `Чип даты (одинаково на iOS и в вебе): «Сегодня/Завтра/Вчера», день недели на 2–6 дней вперёд, иначе короткая дата; цвета danger/warning/accent/text.tertiary` --implements--> `DSDateChipModel`  [INFERRED]
  docs/architecture/contracts/design-tokens.md → apps/ios/Packages/DSDesign/Sources/DSDesign/Components/DSDateChip.swift
- `server: apps/server — Fastify + zod (OpenAPI), PostgreSQL через Drizzle, весь REST API, WebSocket-синхронизация, RLS для агентов, pg-boss; infra/ (Dockerfile, docker compose + Caddy, бэкапы, инструкция для VPS); CI server.yml` --references--> `buildApp()`  [INFERRED]
  docs/CHANGELOG.md → apps/server/src/app.ts
- `.env settings: POSTGRES_PASSWORD, DOMAIN, PUBLIC_URL, DS_JWT_SECRET, DS_KMS_KEY (secrets via openssl rand)` --references--> `loadConfig()`  [INFERRED]
  infra/README.md → apps/server/src/config.ts
>>>>>>> origin/main

## Import Cycles
- None detected.

## Hyperedges (group relationships)
<<<<<<< HEAD
- **iOS-Web Compatibility Without Shared Core** — docs_architecture_overview_no_shared_core, docs_architecture_stack_yrs, docs_architecture_stack_yjs, docs_architecture_stack_libsodium, docs_architecture_overview_test_vectors_package [EXTRACTED 1.00]
- **Cross-platform contracts (iOS/web/server)** — docs_architecture_contracts_document_model, docs_architecture_contracts_strokes, docs_architecture_contracts_sync_protocol, docs_architecture_contracts_crypto, docs_architecture_contracts_api, docs_architecture_contracts_design_tokens [EXTRACTED 1.00]
- **Двухслойная модель графа Graphify и кто обновляет каждый слой** — docs_decisions_0029_graphify_workflow_structural_layer, docs_decisions_0029_graphify_workflow_semantic_layer, docs_decisions_0029_graphify_workflow_git_hook, docs_decisions_0029_graphify_workflow_graphify_docs_script [EXTRACTED 1.00]
- **Parallel streams coordinated via contracts** — docs_roadmap_nine_streams, docs_decisions_0039_parallel_sessions_contracts, docs_decisions_0039_parallel_sessions_coordinator [EXTRACTED 1.00]
- **Web app icon set sharing one logo mark** — apps_web_public_favicon, apps_web_public_icons_icon_192, apps_web_public_icons_icon_512 [EXTRACTED 1.00]
- **Encryption key custody strategies** — docs_decisions_0004_encryption_and_api_private_notebook_mode, docs_decisions_0004_encryption_and_api_agent_notebook_mode, docs_decisions_0013_collaboration_sharing_key_in_url_fragment, docs_decisions_0004_encryption_and_api_local_mcp_bridge [INFERRED 0.75]
- **Rejected extra server services (lean two-container deployment)** — docs_decisions_0025_no_redis_redis, docs_decisions_0026_file_storage_minio, docs_decisions_0022_no_rust_core_shared_rust_core, docs_decisions_0030_server_database_postgresql_mysql [INFERRED 0.75]
- **Agent access to notes model** — docs_decisions_0004_encryption_and_api_agent_notebook_mode, docs_decisions_0009_notebook_mode_choice_notebook_mode_switch_reencryption, docs_decisions_0010_agent_edits_immediate_agent_edits, docs_decisions_0011_handwriting_for_agents_handwriting_png_render, docs_decisions_0004_encryption_and_api_local_mcp_bridge [INFERRED 0.85]
- **External agent access surface (MCP/REST, tokens, RLS, audit log, PNG ink)** — docs_spec_09_agents_api_remote_mcp_server, docs_spec_09_agents_api_rest_api, docs_spec_09_agents_api_thin_mcp_over_service_layer, docs_spec_09_agents_api_token_permissions_rls, docs_spec_09_agents_api_agent_action_log, docs_spec_09_agents_api_rate_limits, docs_spec_09_agents_api_handwriting_as_png, docs_spec_09_agents_api_mcp_tools_sketch [INFERRED 0.85]
- **Agent Notebook Edit Flow via MCP** — docs_architecture_overview_external_ai_agents, docs_architecture_overview_mcp_rest_api, docs_architecture_overview_edit_note_tool, docs_architecture_overview_auth_service, docs_architecture_overview_key_store, docs_glossary_row_level_security, docs_architecture_data_model_agent_audit_log [INFERRED 0.85]
- **Tasks, daily notes and calendar flow** — docs_spec_12_craft_features_tasks_in_docs, docs_spec_12_craft_features_tasks_screen, docs_spec_12_craft_features_daily_notes, docs_spec_12_craft_features_calendar_screen [INFERRED 0.85]
- **CRDT + E2E encrypted sync design** — docs_decisions_0031_crdt_yjs_yjs, docs_decisions_0031_crdt_yjs_yrs, docs_decisions_0031_crdt_yjs_client_side_merge, docs_decisions_0021_tech_stack_end_to_end_encryption, docs_decisions_0031_crdt_yjs_relativeposition_stroke_anchor [INFERRED 0.85]
- **End-to-end encryption flow (KDF, key hierarchy, envelope, recovery)** — docs_architecture_contracts_crypto_argon2id_kdf, docs_architecture_contracts_crypto_key_hierarchy, docs_architecture_contracts_crypto_envelope, docs_architecture_contracts_crypto_recovery_key, docs_decisions_0034_auth_email_password [INFERRED 0.85]
- **Handwriting anchored to CRDT text structure** — docs_decisions_0001_storage_in_database_crdt_structured_documents, docs_decisions_0005_living_stroke_living_stroke, docs_decisions_0005_living_stroke_stroke_point_anchor, docs_decisions_0005_living_stroke_textkit2_render_layer, docs_decisions_0010_agent_edits_immediate_agent_edits [INFERRED 0.85]
- **Living-stroke anchoring pipeline (strokes anchored to CRDT text positions)** — docs_spec_03_pencil_living_stroke, docs_spec_03_pencil_stroke_anchor_hypothesis, docs_spec_03_pencil_crdt_relative_position_anchors, docs_spec_03_pencil_yrs_in_prototype, docs_spec_06_data_server_handwriting_layer, docs_spec_06_data_server_crdt_block_tree [INFERRED 0.85]
- **Notebook encryption and sharing model** — docs_decisions_0036_space_notebook_folder_notebook, docs_spec_07_encryption_private_notebooks, docs_spec_07_encryption_agent_notebooks, docs_spec_08_sharing_key_in_url_fragment [INFERRED 0.85]
- **Private Notebook Encrypted Sync Flow** — docs_architecture_overview_private_notebook_edit_flow, docs_architecture_overview_ios_client, docs_architecture_stack_yrs, docs_architecture_stack_grdb, docs_architecture_stack_libsodium, docs_architecture_overview_sync_realtime, docs_architecture_stack_postgresql [INFERRED 0.85]
- **Web offline-first sync pipeline** — apps_web_readme_offline_first_storage, apps_web_readme_sync_engine, apps_web_readme_derived_indexer, docs_architecture_contracts_sync_protocol_ws_messages [INFERRED 0.85]

## Communities (110 total, 4 thin omitted)

### Community 0 - "actions.ts"
Cohesion: 0.06
Nodes (98): i18next@^26, cachedNoteKey(), rememberNoteKey(), enqueueOp(), runtime(), acc(), belongsTo(), bootstrapAccount() (+90 more)

### Community 1 - "CalendarPage.tsx"
Cohesion: 0.14
Nodes (44): TaskRow, addTask(), dailyNotebookId(), findDaily(), findInbox(), getOrCreateDaily(), getOrCreateInbox(), openTab() (+36 more)

### Community 2 - "ShareDialog.tsx"
Cohesion: 0.14
Nodes (37): resizeImage(), setNotebookMode(), coverError(), CoverImage(), uploadCover(), HistoryDialog(), DevicesCard(), AgentsSection() (+29 more)

### Community 3 - "web/package.json"
Cohesion: 0.06
Nodes (42): devDependencies, fake-indexeddb@^6.2.6, jsdom@^30.1.3, @playwright/test@1.63.0, tailwindcss@^4, @tailwindcss/vite@^4, @testing-library/dom@^10.4.2, @testing-library/react@^16.3.3 (+34 more)

### Community 4 - "DocPage.tsx"
Cohesion: 0.18
Nodes (24): setNoteMeta(), Backlinks(), pickImage(), DocPage(), DocScreen(), IconPicker(), DocView(), Row() (+16 more)

### Community 5 - "0031-crdt-yjs.md"
Cohesion: 0.08
Nodes (28): PencilKit (rejected), PDF pen annotations (PDFKit + stroke layer), End-to-end encryption, TipTap editor, D-22. Без собственного общего ядра на Rust, libsodium, Контекст, Последствия (+20 more)

### Community 6 - "06-data-server.md"
Cohesion: 0.09
Nodes (22): Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Server disk folder storage (default), External S3-compatible storage (Hetzner, R2, B2), File storage interface (two implementations, chosen by config), Garage / SeaweedFS, MinIO (rejected), Контекст (+14 more)

### Community 7 - "overview.md"
Cohesion: 0.19
Nodes (16): Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, File Storage (disk or external S3), Guest via Link (web, no account), iOS / iPadOS Client (Swift, TextKit 2, Yrs, GRDB), Key Store (agent notebooks) (+8 more)

### Community 8 - "AppShell.tsx"
Cohesion: 0.14
Nodes (24): consumeFreshAccount(), useIndexVersion, hasRuntime(), startRuntime(), purgeOldTrash(), CommandPalette(), Item(), PaletteBody() (+16 more)

### Community 9 - "session.ts"
Cohesion: 0.09
Nodes (31): setTokenSource(), authApi, deviceId(), deviceKey(), openLocal(), SealedBlob, sealLocal(), AuthState (+23 more)

### Community 10 - "dependencies"
Cohesion: 0.05
Nodes (41): dependencies, clsx@^2.1.1, cmdk@^1, dexie@^4, dexie-react-hooks@^4.4.0, libsodium-wrappers-sumo@^0.8, lucide-react@^1.61.0, minisearch@^7 (+33 more)

### Community 11 - "02-platforms.md"
Cohesion: 0.20
Nodes (10): Bundle ID com.datascratch.app (D-33), Minimum iOS/iPadOS 26 (D-32), iPad main pen client, iPhone quick notes client, Languages RU and EN, no RTL, iOS editor native, not WebView, Platforms spec, Test devices: Apple Silicon Mac, iPad with Pencil Pro (+2 more)

### Community 12 - "workspace.ts"
Cohesion: 0.14
Nodes (23): accountMaps(), AccountSnapshot, initAccountDoc(), readAccount(), initNotebookDoc(), notebookMaps(), NotebookSnapshot, readNotebook() (+15 more)

### Community 13 - "Editor.tsx"
Cohesion: 0.14
Nodes (28): DsDocument, DsLink, AgentEdit, atomBlock(), attr(), BlockIds, Callout, DrawingBlock (+20 more)

### Community 14 - "Компоненты стека"
Cohesion: 0.06
Nodes (36): Canvas + Pointer Events, Custom pen renderer (Metal vs Core Animation TBD), Dexie (IndexedDB), docker compose, Drizzle ORM, Fastify, GitHub Actions (incl. iOS build on macOS), GRDB (SQLite) (+28 more)

### Community 15 - "contracts.ts"
Cohesion: 0.10
Nodes (27): api, agentTokensApi, docsApi, noAuth, notebooksApi, notebooksModeApi, opBodies, Req (+19 more)

### Community 16 - "Процесс разработки (docs/development.md)"
Cohesion: 0.15
Nodes (12): Стартовый хук Claude Code (.claude/hooks/session-start.sh), D-23 (документация), D-29. Graphify: порядок работы, чтобы граф был всегда актуален, git-хук Graphify (пересборка только по изменённому коду), Скрипт tools/graphify_docs.py (prepare → агенты → finish), Graphify 0.9.95 (пакет graphifyy), R-09 (риск: Graphify сломается или исчезнет), Смысловой слой графа (понятия, решения, связи — проход ИИ) (+4 more)

### Community 17 - "glossary.md"
Cohesion: 0.12
Nodes (22): Organization Hierarchy (Account > Space > Notebook > Folder > Note), Web PWA Client (React, TipTap, Yjs, IndexedDB), Automerge (fallback CRDT), Custom iOS Pen Render Layer (Metal or Core Animation), TextKit 2 (UIKit editor), TipTap (ProseMirror), Vite + React + TypeScript PWA, Yjs (+14 more)

### Community 18 - "stack.md"
Cohesion: 0.17
Nodes (14): Astro (landing page), Dexie (IndexedDB), Drizzle ORM, Fastify, GRDB (SQLite), MinIO (rejected), TypeScript on Node.js, pnpm + Turborepo Monorepo (+6 more)

### Community 19 - "router.tsx"
Cohesion: 0.07
Nodes (26): allRoute, appLayout, authLayout, calendarRoute, docRoute, folderRoute, guestRoute, indexRoute (+18 more)

### Community 20 - "crypto.ts"
Cohesion: 0.14
Nodes (24): sharesApi, ORIGIN_REMOTE, Channel, channels, COLORS, receivePresence(), loadVersion(), fromBase64Url() (+16 more)

### Community 21 - "server.mjs"
Cohesion: 0.11
Nodes (18): attAccess(), authed(), b64u(), clients, cors, db, err(), issueSession() (+10 more)

### Community 22 - "10-sync.md"
Cohesion: 0.11
Nodes (17): D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение, Attachments as separate encrypted files, on-demand resumable download, Agent edits applied immediately, highlighted, revertible via history (D-10), 10. Синхронизация и офлайн (+9 more)

### Community 23 - "steps"
Cohesion: 0.06
Nodes (31): concurrency, cancel-in-progress, group, run, VITE_DS_SERVER_URL, jobs, web, name (+23 more)

### Community 24 - "iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)"
Cohesion: 0.10
Nodes (15): apps/ios — iPhone + iPad, iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), apps/server — сервер, Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст (+7 more)

### Community 25 - "accountDb"
Cohesion: 0.26
Nodes (4): accountDb, DocRow, DocStore, DocKind

### Community 26 - "roadmap.md"
Cohesion: 0.09
Nodes (34): Coordinator session, Nine parallel streams, Development roadmap, Stage 0 preparation (done), Stage 1 pen-in-text prototype on iPad, Stage 1 acceptance criteria (strokes stay anchored, 120fps, user check on iPad), Stage 2 local MVP, Stage 3 server, sync, encryption (+26 more)

### Community 27 - "SignupPage.tsx"
Cohesion: 0.17
Nodes (22): accountApi, loginKeyFor(), signOut(), useAuth, authErrorMessage(), LoginPage(), submit(), RecoverPage() (+14 more)

### Community 29 - "01-concept.md (2)"
Cohesion: 0.18
Nodes (9): D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст, Решение, Datascratch, For non-Russian readers, Где что лежит (+1 more)

### Community 30 - "D-41. Набор функций по мотивам Craft"
Cohesion: 0.16
Nodes (17): D-41 Craft-inspired feature set, D-41. Набор функций по мотивам Craft, Контекст, Решение, Craft features MVP/post-MVP split, Block catalog (table, code, LaTeX, Mermaid, drawing, card), Calendar screen, Collections (table/gallery/kanban views) (+9 more)

### Community 31 - "attachments.ts"
Cohesion: 0.12
Nodes (30): ApiError, doFetch(), NetworkError, request(), RequestOptions, toError(), TokenSource, getSession() (+22 more)

### Community 33 - "useWorkspace"
Cohesion: 0.29
Nodes (17): allTags(), folderPath(), notesInSpace(), spaceNotebooks(), useWorkspace, visibleNotes(), AllDocsPage(), FolderChips() (+9 more)

### Community 34 - "Контракты между частями системы"
Cohesion: 0.10
Nodes (15): Stub packages (shared, ui, design-tokens, web-editor), Temporary stubs, Contract change rules (versioned, coordinator-only), Контракты между частями системы, Правила изменения, 2026-10-25, 2026-10-25 (вторая половина дня), Executor sessions write fragments, coordinator merges (+7 more)

### Community 35 - "04-editor.md"
Cohesion: 0.07
Nodes (27): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты, Решение (+19 more)

### Community 36 - "GuestPage.tsx"
Cohesion: 0.27
Nodes (14): colorFor(), joinPresence(), PresenceUser, PresenceStack(), usePresence(), GuestFrame(), GuestNote(), GuestNotebook() (+6 more)

### Community 37 - "07-encryption.md"
Cohesion: 0.08
Nodes (29): D-04. Одновременно сквозное шифрование и доступ по API, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), Контекст, Последствия, Решение, D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение (+21 more)

### Community 38 - "deriveKeys"
Cohesion: 0.29
Nodes (16): deviceName(), changePassword(), normalizeEmail(), recoverAccount(), signIn(), signUp(), deriveKeys(), getWorker() (+8 more)

### Community 39 - "App.tsx"
Cohesion: 0.20
Nodes (11): App(), queryClient, router, onSignedOut(), stopRuntime(), PwaPrompt(), ConfirmHost(), useConfirm (+3 more)

### Community 40 - "accountDb (3)"
Cohesion: 0.15
Nodes (4): Indexer, snippetAround(), AccountRuntime, NoteKind

### Community 41 - "react"
Cohesion: 0.14
Nodes (15): ButtonProps, Size, sizes, Variant, variants, Req, TextArea, DropdownMenu() (+7 more)

### Community 42 - "0031-crdt-yjs.md (2)"
Cohesion: 0.14
Nodes (9): D-19. Весь код пишет Claude, Последствия, Решение, D-23. Документация — источник истины; Graphify — граф знаний поверх неё, docs/history session log, Контекст, Последствия, Решение (+1 more)

### Community 43 - "helpers.ts"
Cohesion: 0.39
Nodes (7): expectSynced(), newDoc(), PASSWORD, signIn(), signUp(), uniqueEmail(), @playwright/test

### Community 44 - "package.json"
Cohesion: 0.14
Nodes (15): devDependencies, turbo@^2.3.0, typescript@^5.6.0, engines, node, typescript, name, packageManager (+7 more)

### Community 45 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+7 more)

### Community 46 - "DocCards.tsx"
=======
- **OAuth 2.1 authorization code flow with PKCE** — docs_architecture_contracts_agents_api_oauth21, docs_architecture_contracts_agents_api_pkce, docs_architecture_contracts_agents_api_resource_indicator, docs_architecture_contracts_agents_api_iss_param, docs_architecture_contracts_agents_api_consent_screen, docs_architecture_contracts_agents_api_token_formats [EXTRACTED 1.00]
- **External agent access pipeline (agent notebooks, MCP/REST, consent, PNG render)** — docs_spec_07_encryption_agent_notebooks, docs_spec_09_agents_api_remote_mcp, docs_spec_09_agents_api_rest_api, docs_spec_09_agents_api_consent_screen, docs_spec_09_agents_api_shared_service_layer, packages_agents_readme_agents_package, docs_guides_connect_ai_agents_guide [INFERRED 0.85]
- **Agent access control layers** — docs_architecture_contracts_agents_api_agent_notebook_mode, docs_architecture_contracts_agents_api_grant, docs_architecture_contracts_agents_api_permissions, docs_architecture_contracts_agents_api_scopes, docs_architecture_contracts_agents_api_rls [INFERRED 0.85]
- **Handwriting exposure to agents** — docs_architecture_contracts_agents_api_handwriting_refs, docs_architecture_contracts_agents_api_handwriting_group, docs_architecture_contracts_agents_api_png_renderer, docs_architecture_contracts_agents_api_tool_get_handwriting_image, docs_architecture_contracts_agents_api_deleted_anchor_strokes [INFERRED 0.85]

## Communities (218 total, 27 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.03
Nodes (78): ACCESS_TOKEN_TTL_MS, AGENT_PERMISSIONS, AgentPermission, AgentToken, agentTokenSchema, API_PREFIX, API_ROUTES, ApiError (+70 more)

### Community 1 - "0039-parallel-sessions.md"
Cohesion: 0.11
Nodes (37): apps/ios — iPhone + iPad, iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), apps/web — веб-клиент, agents-api v1 — предложен потоком agents и утверждён координатором 2026-10-25, Контракт меняет только сессия-координатор; исполнитель присылает предложение, pnpm + Turborepo Monorepo, 2026-10-25 (вторая половина дня) (+29 more)

### Community 2 - "stack.md"
Cohesion: 0.06
Nodes (64): Agent rate limits (in-memory counters, D-25) and OAuth 2.1 for MCP are the plugin's responsibility, Журнал действий агента GET /agent-tokens/:id/audit, Контракт agents-api.md (MCP и REST для самих агентов) — появится на этапе агентов, OpenAPI-схема генерируется сервером из кода (GET /v1/openapi.json), Транспорт wss://<host>/v1/sync: JSON-кадры с type, base64url, ping/pong каждые 25 с, agent_tokens / agent_audit_log Tables, doc_updates Table (encrypted Yjs updates), Server PostgreSQL Schema (Stage 3 Draft) (+56 more)

### Community 3 - "devDependencies"
Cohesion: 0.10
Nodes (21): devDependencies, happy-dom@^21.0.4, react@^19.0.0, react-dom@^19.0.0, @types/katex@^0.16.8, @types/react@^19.0.0, @types/react-dom@^19.0.0, typescript@^5.6.0 (+13 more)

### Community 4 - "Контракт: модель документа (v1)"
Cohesion: 0.08
Nodes (27): mime вложения: передаётся в POST /attachments и возвращается в GET /attachments/:id для докачки, Чернила пера и маркеры (ink.*, highlight.*), 1. Три вида документов Yjs, 2. Документ `account`, 3. Документ `notebook` (индекс блокнота), 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки (+19 more)

### Community 5 - "store.ts"
Cohesion: 0.07
Nodes (39): AuthorKind, ANCHOR_KINDS, AnchorKind, MIN_SEGMENT_POINTS, ORPHAN_STROKE_PURGE_DAYS, POINT_BYTES, POINT_FIELDS, REFERENCE_FONT_SIZE (+31 more)

### Community 6 - "strokes.md (2)"
Cohesion: 0.05
Nodes (50): DSPresence, away, none, online, .dsOnAccent, .color, .uiColor, .color (+42 more)

### Community 7 - "D-29. Graphify: порядок работы, чтобы граф был всегда актуален"
Cohesion: 0.06
Nodes (46): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Datascratch — правила для ИИ, Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, graphify, Apple Pencil в тексте — ключевая фича и главный риск (+38 more)

### Community 8 - "crypto.md"
Cohesion: 0.07
Nodes (35): Вложения: загрузка и докачка по кускам (/attachments/:id/chunks/:index), лимит 200 МБ, PATCH /notebooks/:id/mode — включение режима «для агентов» передаёт notebookKey, выключение удаляет серверную обёртку, Режим «для агентов»: клиент передаёт notebookKey по TLS, сервер оборачивает его serverKey; расшифровка только при запросе агента с токеном, Вложения шифруются кусками по 1 MiB, каждый — отдельный конверт, Конверт шифротекста: версия 0x01 + nonce 24 байта + XChaCha20-Poly1305-IETF (тег 16 байт), libsodium на всех платформах (libsodium-wrappers-sumo в TS, swift-sodium в iOS), loginKey = BLAKE2b(authSeed, "ds1|login"); сервер хранит Argon2id(loginKey), Смена пароля перешифровывает только обёртку masterKey (+27 more)

### Community 9 - "plugin.ts"
Cohesion: 0.07
Nodes (41): SCOPE_READ, SCOPE_WRITE, VerifiedToken, authorizationServerMetadata(), OAuthConfig, protectedResourceMetadata(), AgentsContext, EditOp (+33 more)

### Community 10 - "11-nfr.md"
Cohesion: 0.06
Nodes (45): S3Storage, MinIO (rejected), 2026-10-25, Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально (+37 more)

### Community 11 - "0031-crdt-yjs.md (2)"
Cohesion: 0.05
Nodes (52): Утверждён технологический стек (D-21), отказ от ядра на Rust (D-22), Прототип пера хранит текст в Yrs (D-27), Canvas + Pointer Events, Custom pen renderer (Metal vs Core Animation TBD), D-21. Технологический стек, Dexie (IndexedDB), Drizzle ORM, End-to-end encryption (+44 more)

### Community 12 - "handwriting-png.ts"
Cohesion: 0.05
Nodes (65): @napi-rs/canvas@^1.0.13, clip(), collectHandwriting(), describeSpans(), findHandwriting(), HandwritingItem, HandwritingKind, HINT_RU (+57 more)

### Community 13 - "schema.ts"
Cohesion: 0.10
Nodes (24): Drizzle schema and SQL migrations (drizzle-kit db:generate, DB_MIGRATE_ON_START; 0001 = Row-Level Security + file cleanup trigger), agentPermission, agentTokenNotebooks, agentTokens, attachmentChunks, attachments, bytea, docKind (+16 more)

### Community 14 - "oauth.ts"
Cohesion: 0.06
Nodes (57): RFC-7009, RFC-8252, RFC-9207, ACCESS_PREFIX, bearer(), GrantService, REFRESH_PREFIX, scopeFor() (+49 more)

### Community 15 - "edits.ts"
Cohesion: 0.11
Nodes (36): BuildContext, cloneInto(), copyChildren(), fill(), fillInline(), insertBlock(), insertBlocks(), withAgentMark() (+28 more)

### Community 16 - "D-30. База данных сервера — PostgreSQL"
Cohesion: 0.15
Nodes (30): accountRoots(), notebookRoots(), closeTab(), deleteFolder(), deleteNotebookRef(), deleteNoteMeta(), deleteSpace(), findDailyNote() (+22 more)

### Community 17 - "agent-service.ts (2)"
Cohesion: 0.10
Nodes (29): buildMcpServer(), Principal, requireWrite(), AgentService, folderPath(), FolderView, NoteMetaView, NoteSummary (+21 more)

### Community 18 - "auth.ts"
Cohesion: 0.08
Nodes (71): Fastify + zod with OpenAPI generated from code (GET /v1/openapi.json), Revoking a device, a share or deleting the account immediately closes WebSocket connections (code 4401), buildApp(), codeForStatus(), requireUser(), devices, refreshTokens, shares (+63 more)

### Community 19 - "10-sync.md"
Cohesion: 0.10
Nodes (23): RetentionPolicy, История версий: GET /docs/:id/versions и /versions/:seq (зашифрованные снимки), Метка agentEdit (agentId, at) — подсветка правок агента до принятия пользователем, Агенты не подключаются по WebSocket — работают через MCP/REST; сервер применяет их правки как обычные обновления, Снимки и уплотнение: > 500 обновлений или > 1 MiB → снимок; удаление seq ≤ baseSeq, кроме нужных истории (R-05), doc_snapshots Table (compacted snapshots, version history), D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected) (+15 more)

### Community 20 - "stack.md (2)"
Cohesion: 0.09
Nodes (50): ContextMenuCheckboxItem, ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuItemProps, ContextMenuLabel(), ContextMenuRadioGroup, ContextMenuRadioItem (+42 more)

### Community 21 - "0038-design-quiet-paper.md"
Cohesion: 0.09
Nodes (23): Проекты, личное, работа, учёба не смешиваются; минимум кнопок на экране, D-15. Дизайн — основная концепция продукта, Design references: Things 3, Linear, Craft, Arc, Последствия, Решение, Ориентир Craft: градиентные подложки, документы-карточки с обложками, боковая панель «Вкладки / Избранное / Папки / Теги», стеклянные панели, контекстные меню, D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Вариант «графит по умолчанию» — отклонён: чернила на тёмном читаются хуже (+15 more)

### Community 22 - "glossary.md"
Cohesion: 0.05
Nodes (40): meta.formatVersion = 1; документ новее клиента открывается только для чтения (R-03), Версионирование контрактов v1, v2…; ломающее изменение — новая версия с явной миграцией, Поля штриха: v, tool, color, width, opacity, anchorKind, blockId, anchors, points, hint, author, createdAt, Anchor (textRange / paragraph / drawingBlock / image), Note, Stroke, StrokePoint, Заметка (+32 more)

### Community 23 - "InMemoryAgentsStore"
Cohesion: 0.05
Nodes (19): AgentDataSource, AgentEditOrigin, AgentGrant, AgentNotebook, AuditEntry, AuthorizationCode, LoadedDoc, OAuthClient (+11 more)

### Community 24 - "Скрипт обновления графа"
Cohesion: 0.04
Nodes (53): DateOnly, IsoDateTime, Uuid, ACCOUNT_SETTINGS_KEYS, AccountSettings, ATOM_BLOCK_NODES, BlockAttrs, BlockNodeName (+45 more)

### Community 25 - "@datascratch/shared/crypto (libsodium)"
Cohesion: 0.15
Nodes (8): createAccountKeys / rekeyPassword, crypto.md contract, @datascratch/shared/crypto (libsodium), crypto/attachment.json vector, crypto/envelope.json vector, crypto/kdf.json vector, crypto/key-wraps.json vector, crypto/recovery-key.json vector

### Community 26 - "Монорепозиторий и CLAUDE.md"
Cohesion: 0.09
Nodes (45): D-39. Разработка параллельными сессиями; Claude сам вливает в main, Контекст, Последствия, Решение, backdropCss(), backdropSwift(), block(), main() (+37 more)

### Community 27 - "main.tsx"
Cohesion: 0.06
Nodes (58): TestEditor(), TestEditorProps, Window, App(), attachments, awA, awB, docA (+50 more)

### Community 28 - "sync.test.ts"
Cohesion: 0.11
Nodes (23): Server tests: vitest against a real PostgreSQL (TEST_DATABASE_URL), setupNotebook(), token(), adminUrl(), setup(), TEMPLATE_DB, withDatabase(), api() (+15 more)

### Community 29 - "strokes.md (3)"
Cohesion: 0.07
Nodes (48): Блок drawing (высота в pt; штрихи — в strokes), Отображаемая высота drawing = height × ширинаБлока / 600 (опорная ширина 600, как в формуле толщины штриха), anchorKind: text | block (заметка на полях) | image | drawing, Перепривязка якорей после отмены/повтора: в той же транзакции якорь удалённого символа с redone-элементом переписывается на относительную позицию нового элемента, Координаты block / image / drawing — в долях ширины блока, Перестройка блоков (§4.1a): при разделении, слиянии, смене типа и перемещении блока клиент в той же транзакции заменяет затронутый штрих копией (новый strokeId, те же точки, якоря по соответствию символов), Обводки и стрелки «растягиваются» вместе с текстом; при проблемах — изменение контракта через координатора, Признак «символ удалён» проверяется по самому элементу Yjs (с учётом redone), а не по результату резолвинга относительной позиции (+40 more)

### Community 30 - "server"
Cohesion: 0.04
Nodes (47): context, dockerfile, depends_on, environment, image, ports, profiles, restart (+39 more)

### Community 31 - "connection.ts"
Cohesion: 0.12
Nodes (26): Access rules: user = own docs; guest = shared note/notebook docs (push/snapshot only with edit); agent = only token notebooks in agent mode, also enforced by PostgreSQL RLS, bearer(), requireUserOrGuest(), verifyGuestToken(), verifyUserToken(), AppContext, CHUNK_PLAINTEXT, ENVELOPE_OVERHEAD (+18 more)

### Community 32 - "api.md"
Cohesion: 0.09
Nodes (26): SessionDto, Аккаунт и устройства: /me, /devices (отзыв сессий), удаление аккаунта, AgentToken { id, name, notebookIds, permission, expiresAt, createdAt, lastUsedAt } — без секрета, Токены агентов /agent-tokens: блокноты, read / read_write, срок; токен показывается один раз, bad_request — код ошибки REST для некорректного запроса (тело/параметры не прошли проверку), Аутентификация Bearer: accessToken 15 мин + refreshToken 30 дней с ротацией, Идентификаторы создаёт клиент (UUIDv7); повторный POST идемпотентен, иначе 409 conflict, deviceName при регистрации устройства: обязательно в /auth/login, необязательно в signup и recovery/finish (уточнение потока server) (+18 more)

### Community 33 - "with"
Cohesion: 0.05
Nodes (45): concurrency, cancel-in-progress, group, runs-on, steps, timeout-minutes, POSTGRES_DB, POSTGRES_PASSWORD (+37 more)

### Community 34 - "ui/src/index.ts"
Cohesion: 0.17
Nodes (15): Provider(), ToastProvider(), TooltipProvider, DateLabelOptions, Locale, LocaleContext, systemDark(), ThemeContext (+7 more)

### Community 35 - "Правила для ИИ и документации (2) (2)"
Cohesion: 0.06
Nodes (34): DSGlassPanel, .body, GlassPreview, .body, View, Color, .dsAccent, .dsCanvas (+26 more)

### Community 37 - "Ядро, Yrs и шифрование"
Cohesion: 0.07
Nodes (22): .body, .disclosure, DSFeedback, delete, selection, .sensoryFeedback, taskComplete, DSHaptics (+14 more)

### Community 38 - "0005-living-stroke.md (3)"
Cohesion: 0.06
Nodes (32): .color, .color, DSShadowModifier, View, DSDocumentWidth, full, normal, .points (+24 more)

### Community 39 - "PgBossQueue"
Cohesion: 0.05
Nodes (28): base64urlKey, bool, Config, ConfigSchema, loadConfig(), createContext(), createDatabase(), Database (+20 more)

### Community 40 - "model.ts"
Cohesion: 0.10
Nodes (39): initNoteContent(), inlineMarkdown(), MARK_ORDER, noteToMarkdown(), TONES, wrapMarks(), Writer, markdownToBlocks() (+31 more)

### Community 41 - "app.ts (2)"
Cohesion: 0.05
Nodes (15): AgentScope: one transaction under role ds_agent with RLS by token; listNotebooks/listDocs/getDoc, notebookKey/docKey, readDoc, applyUpdate, createNoteDoc, attachments, audit, tx, Server plugin interface (ServerPlugin) for optional package @datascratch/agents, loaded at startup if present, BuildOptions, withAgentScope(), AgentDoc, AgentHost, AgentScope, PluginCrypto (+7 more)

### Community 42 - "08-sharing.md"
Cohesion: 0.07
Nodes (36): POST /docs — регистрация документа (account / notebook / note) до первого push, Share { id, target { kind, id }, permission, expiresAt, createdAt } — ссылка шеринга, Шеринг: /shares (view/edit, бессрочно по умолчанию, отзыв сразу отключает гостей), Ссылка шеринга с ключом после # (не уходит на сервер), Ссылка шеринга /s/<shareId>#k=<ключ> — ключ в части после #, не уходит на сервер, Права: user — документы своего аккаунта; guest — только документы шеринга, push только с правом edit, D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account (+28 more)

### Community 43 - "blockId.ts"
Cohesion: 0.13
Nodes (13): BlockId, blockIdPluginKey, findIdFixes(), hasAttr(), stripIds(), UNIQUE_ATTRS, uuidv7(), createSuggestionExtension() (+5 more)

### Community 44 - "document-model.md"
Cohesion: 0.11
Nodes (32): noteKey — ключ заметки: шифрует note-документ и вложения, notebookKey — случайный ключ блокнота, шифрует notebook-документ, y-prosemirror не записывает атрибуты узлов со значением null: отсутствующий атрибут = null (значение по умолчанию схемы), blockId (UUIDv7) у каждого блочного узла — для точечных правок агентов, заметок на полях и комментариев, Даты ISO 8601 в UTC; «только дата» YYYY-MM-DD; миллисекунды — только в штрихах, Векторы совместимости модели документа packages/test-vectors/document/* (iOS/Yrs обязан читать и писать формат y-prosemirror), Вставка текста в Y.XmlText без явных атрибутов наследует форматирование слева (Yjs/Yrs) — писатели всегда передают явный набор атрибутов, Folder { parentId, name, icon, color, order } — вложенность без ограничения глубины (+24 more)

### Community 45 - "contracts/sync.ts"
Cohesion: 0.06
Nodes (37): AckMessage, ackMessageSchema, CLIENT_PLATFORMS, ClientAwarenessMessage, clientAwarenessMessageSchema, clientMessageSchema, clientMsgIdSchema, deviceIdSchema (+29 more)

### Community 46 - "decisions/README.md"
Cohesion: 0.10
Nodes (33): Button, buttonClasses(), ButtonProps, ButtonSize, ButtonVariant, sizes, variants, Checkbox (+25 more)

### Community 47 - "devDependencies"
Cohesion: 0.09
Nodes (31): devDependencies, eslint@^10.13.0, @eslint/js@^10.0.1, pino-pretty@^13.2.0, tsx@^4.23.15, @types/libsodium-wrappers-sumo@^0.8.2, @types/node@^22.20.5, @types/pg@^8.23.1 (+23 more)

### Community 48 - "tokens.ts"
Cohesion: 0.08
Nodes (18): backdropNames, colorNames, highlightNames, inkNames, tintNames, tokens, @ladle/react@^5.1.1, BackdropProps (+10 more)

### Community 49 - "План этапов и отложенное (2)"
Cohesion: 0.08
Nodes (26): ChipsPreview, .body, DSBadge, .body, .colors, DSTagChip, .body, Style (+18 more)

### Community 50 - "compilerOptions"
Cohesion: 0.09
Nodes (22): DSCheckmark, DSTaskCheckbox, .body, .isDone, DSTaskState, cancelled, done, open (+14 more)

### Community 51 - "12. Функции по мотивам Craft (2)"
Cohesion: 0.07
Nodes (31): devDependencies, eslint@^9.39.0, eslint-config-prettier@^10.1.0, @eslint/js@^9.39.0, globals@^16.4.0, prettier@^3.6.0, turbo@^2.5.0, typescript@^5.9.0 (+23 more)

### Community 52 - "04-editor.md"
Cohesion: 0.12
Nodes (15): hint — распознанная форма (underline, strike, circle, highlight, arrow, scribble) для агентов и экспорта, D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты (+7 more)

### Community 53 - "Organization Hierarchy (Account > Space > Notebook > Folder > Note)"
Cohesion: 0.08
Nodes (34): SAMPLE_CONTENT, CoreOptions, HostRef, Callout, CALLOUT_TONES, Commands, FileBlock, formatSize() (+26 more)

### Community 54 - "Модель данных и глоссарий (2)"
Cohesion: 0.08
Nodes (38): BLOCK_NODES, INLINE_NODES, PMMark, pmNodeSchema, TEXTBLOCK_NODES, addAgentMark(), applyBlockOperations(), ApplyOptions (+30 more)

### Community 55 - "02-platforms.md"
Cohesion: 0.07
Nodes (30): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, D-03. Платформы: нативные iPhone и iPad + полноценный веб, Full-featured web client (TypeScript), Контекст, Последствия, Решение (+22 more)

### Community 56 - "decisions/README.md (2)"
Cohesion: 0.09
Nodes (22): D-19. Весь код пишет Claude, Последствия, Решение, D-23. Документация — источник истины; Graphify — граф знаний поверх неё, Контекст, Последствия, Решение, ADR file number equals decision number (D-05 -> 0005-*.md), template 0000-template.md (+14 more)

### Community 57 - "open-questions.md"
Cohesion: 0.11
Nodes (23): Ключ восстановления: 32 байта, Crockford Base32 с префиксом DS1-, показывается один раз, Notesnook, Import from Obsidian/Notesnook (later), D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления, Вход по email + паролю; один пароль и для входа, и для шифрования (как в Notesnook), Passkeys — сложно совместить со сквозным шифрованием сейчас; возможно позже, Ключ восстановления, выдаваемый при регистрации, Sign in with Apple — отклонён: всё равно нужен отдельный пароль шифрования (+15 more)

### Community 58 - "with (2)"
Cohesion: 0.07
Nodes (33): concurrency, cancel-in-progress, group, run, defaults, name, runs-on, steps (+25 more)

### Community 59 - "0018-monetization.md (2) (2)"
Cohesion: 0.13
Nodes (27): DateChipProps, tones, Calendar(), CalendarProps, DatePicker(), DatePickerProps, Popover, PopoverAnchor (+19 more)

### Community 60 - "Контракт: протокол синхронизации (v1)"
Cohesion: 0.08
Nodes (35): D-15 Design principle, D-38 Design system decision, D-39 design-system stream, design-tokens contract (docs/architecture/contracts/design-tokens.md), design.yml CI workflow (macOS), DSAvatar / DSAvatarStack, DSBackdrop / DSGrain, DSButtonStyle (+27 more)

### Community 61 - "keys.ts"
Cohesion: 0.13
Nodes (32): KdfParams, bytesEqual(), checkKey(), decryptEnvelope(), decryptFromBase64Url(), randomBytes(), generateSalt(), createAccountKeys() (+24 more)

### Community 63 - "test-vectors/package.json"
Cohesion: 0.08
Nodes (32): description, devDependencies, @datascratch/shared@workspace:*, eslint@^9.39.0, libsodium-wrappers-sumo@^0.8.2, prosemirror-model@^1.25.0, tsx@^4.20.0, @types/node@^22.10.0 (+24 more)

### Community 64 - "SyncConnection"
Cohesion: 0.17
Nodes (7): SyncConnection, SyncError, b64Size(), SyncErrorCode, docs table: account/notebook/note documents with owner, notebook, last_seq, snapshot_seq, counters since last snapshot, Sync limits: update 2 MB, snapshot 50 MB, awareness 64 KB, 100 msg/s per connection (burst x5), Sync rules: seq under doc row lock, ordered live delivery, idempotent push by clientMsgId; deviceId forms user / guest:<shareId>:<deviceId> / agent:<tokenId>; bad message -> protocol_mismatch

### Community 65 - "01-concept.md"
Cohesion: 0.06
Nodes (34): Журнал изменений (CHANGELOG), D-08. Аннотации PDF пером — не в MVP (PDFKit + слой штрихов), D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст, Решение (+26 more)

### Community 66 - "oauth.test.ts"
Cohesion: 0.13
Nodes (24): @modelcontextprotocol/client@^2.4.0, makeNotebookDoc(), authorize(), consent(), setup(), freePort(), SECRET, startServer() (+16 more)

### Community 67 - "documents.ts"
Cohesion: 0.06
Nodes (25): Live broadcast via Broadcaster interface (sync/hub.ts, in-memory); subscribers receive updates strictly in seq order, gaps backfilled from DB, Server makes snapshots itself every 500 updates / 1 MB for agent edits (it knows the key), DbOrTx, agentAudit, docSnapshots, docUpdates, AuditEntry, AuditService (+17 more)

### Community 68 - "09-agents-api.md"
Cohesion: 0.14
Nodes (19): Agent access management: list, journal, revoke, Enable agent access mode on notebook, Claude/ChatGPT custom MCP connector at /mcp, Guide: connect Claude or ChatGPT to Datascratch, Static agent token dsa_ (Bearer), Agent connection troubleshooting table, Spec 9: API and external AI agents, OAuth consent screen (notebooks + permissions) (+11 more)

### Community 69 - "Stage 1: Pen-in-Text Prototype (iPad)"
Cohesion: 0.14
Nodes (16): Записываются только сглаженные coalesced-точки завершённого штриха, без predicted, GitHub Actions CI (incl. macOS iOS builds), Custom iOS Pen Render Layer (Metal or Core Animation), XcodeGen, docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo (+8 more)

### Community 70 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, pixelmatch@^7, pngjs@^7, @types/mdast@^4.0.4, @types/node@^22, @types/pngjs@^6.0.5, typescript@^5.9.0, vitest@^4.0.0 (+7 more)

### Community 71 - "Контракт: модель документа (v1) (2)"
Cohesion: 0.13
Nodes (17): DocKind, ACCOUNT_ROOTS, DEFAULT_NOTE_STYLE, FORMAT_VERSION, NOTE_ROOTS, NOTEBOOK_ROOTS, NoteDocMeta, PMNode (+9 more)

### Community 72 - "DSDateChip"
Cohesion: 0.11
Nodes (17): DateChipPreview, .body, DSDateChip, .body, .color, .model, DSDateChipModel, Tone (+9 more)

### Community 73 - "D-39 Parallel sessions; Claude merges into main"
Cohesion: 0.09
Nodes (20): Git, Graphify, tools/graphify_docs.py prepare/finish, Graphify git hook (code only), Claude Code session-start hook, Structural vs semantic graph layers, Автоматизация, Две среды (+12 more)

### Community 74 - "dependencies"
Cohesion: 0.07
Nodes (27): dependencies, @aws-sdk/client-s3@^3.1156.0, drizzle-orm@^0.45.4, fastify@^5.12.7, @fastify/cors@^11.3.1, fastify-plugin@^6.0.1, @fastify/swagger@^9.9.2, @fastify/swagger-ui@^6.1.2 (+19 more)

### Community 75 - "contracts/crypto.ts"
Cohesion: 0.08
Nodes (43): RFC-4648, AD, DEFAULT_KDF, ENVELOPE_OVERHEAD, ENVELOPE_VERSION, KDF_ALG, KDF_MEM, KDF_OPS (+35 more)

### Community 76 - "02-platforms.md (2)"
Cohesion: 0.13
Nodes (12): CardsPreview, .body, DSCard, .body, DSDocCard, .body, View, .background (+4 more)

### Community 77 - "steps"
Cohesion: 0.07
Nodes (26): concurrency, cancel-in-progress, group, CI, jobs, test, name, paths (+18 more)

### Community 78 - "risks.md"
Cohesion: 0.10
Nodes (18): ButtonsPreview, .body, ButtonStyle, DSButtonBody, .body, .fill, .foreground, .height (+10 more)

### Community 79 - "Скрипт обновления графа (2)"
Cohesion: 0.10
Nodes (20): AUTHOR_KINDS, authorKindSchema, Base64Url, BASE64URL_REGEX, base64UrlBytesSchema(), base64UrlLength(), base64UrlSchema, DATE_ONLY_REGEX (+12 more)

### Community 80 - "vectors.test.ts"
Cohesion: 0.19
Nodes (20): ATTACHMENT_CHUNK_BYTES, attachmentChunkCount(), encryptAttachment(), encryptAttachmentChunk(), fromHex(), toHex(), utf8(), encryptEnvelope() (+12 more)

### Community 81 - "PenLayer.ts"
Cohesion: 0.08
Nodes (25): EditorUser, ProsemirrorMapping, bindToSurface(), Bounds, InputPoint, RenderPoint, segmentsBounds(), splitStroke() (+17 more)

### Community 82 - "Обзор архитектуры: разделы"
Cohesion: 0.14
Nodes (13): DSSegment, .id, DSSegmentedControl, SegmentedPreview, .body, DSSkeleton, .body, DSSkeletonLines (+5 more)

### Community 83 - "04-editor.md (2)"
Cohesion: 0.15
Nodes (11): Решения по анкетам пользователя: D-32…D-41 и PDF после MVP (D-08), D-08. Аннотации PDF пером — не в MVP, PDF pen annotations (PDFKit + stroke layer), Решение, Решение (предложение), D-16. Импорт — не сейчас, Решение, PDF Annotations Not in MVP (+3 more)

### Community 84 - "Organization Hierarchy (Account > Space > Notebook > Folder > Note) (2)"
Cohesion: 0.15
Nodes (8): AvatarPreview, .body, DSAvatar, .body, .presenceLabel, DSAvatarStack, .body, TokenTests

### Community 85 - "DSBackdrop"
Cohesion: 0.15
Nodes (8): BackdropGallery, .body, DSBackdrop, .body, DSGrain, .body, GrainPattern, SplitMix64

### Community 86 - "design-tokens.md"
Cohesion: 0.10
Nodes (30): Подложки backdrop.* (sand, dusk, mist, meadow, ember) — мягкие градиенты в духе Craft, Цветовые токены: bg.canvas («бумага»), text.primary («чернила»), accent («синие чернила»), danger/success/warning — светлая и тёмная тема, Ширина колонки документа: normal 720, wide 960, full, Чип даты (одинаково на iOS и в вебе): «Сегодня/Завтра/Вчера», день недели на 2–6 дней вперёд, иначе короткая дата; цвета danger/warning/accent/text.tertiary, Тактильная отдача iOS: selection, success (задача выполнена), warning (удаление), Чернила пера ink.* (black, blue, red, green, purple, brown) и маркеры highlight.*, Движение: пружины motion.snappy / smooth / gentle, длительности duration.* для веба, Сетка отступов 4 pt, радиусы radius.*, тени shadow.card / shadow.popover (+22 more)

### Community 87 - "12-craft-features.md"
Cohesion: 0.10
Nodes (24): Ежедневные заметки и «Входящие» (kind daily / inbox) в блокноте settings.dailyNotebookId, D-41. Набор функций по мотивам Craft, Контекст, Решение, 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки (+16 more)

### Community 88 - "steps"
Cohesion: 0.18
Nodes (11): runs-on, steps, timeout-minutes, jobs, check, name, run, uses (+3 more)

### Community 89 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.19
Nodes (21): attr(), block(), blockBody(), CALLOUT_KIND, children(), close(), Ctx, escapeBlockStart() (+13 more)

### Community 90 - "D-30. База данных сервера — PostgreSQL (2)"
Cohesion: 0.22
Nodes (16): addDays(), Commands, dateChipLabel(), localDate(), MONTHS, nextWeek(), requestTaskMenu(), TASK_MENU_EVENT (+8 more)

### Community 91 - "DSDateChip (2)"
Cohesion: 0.16
Nodes (6): DateChipTests, .now, SnapshotTests, DSDesign, Foundation, Testing

### Community 92 - "components.test.tsx"
Cohesion: 0.12
Nodes (33): Avatar(), AvatarProps, AvatarStack(), AvatarStackProps, initials(), Presence, Backdrop(), Badge() (+25 more)

### Community 93 - "0005-living-stroke.md (2)"
Cohesion: 0.12
Nodes (12): DSFontModifier, View, DSTypeToken, body, callout, caption, footnote, h1 (+4 more)

### Community 94 - "store.ts"
Cohesion: 0.16
Nodes (27): allAnchorsDeleted(), encodeAnchor(), isCharDeleted(), rebaseAnchorList(), resolveAnchor(), resolveAnchors(), atPath(), attachAnchorRebase() (+19 more)

### Community 95 - "@tiptap/core"
Cohesion: 0.16
Nodes (19): Collaboration, CollaborationOptions, createNoteUndoManager(), cursorBuilder(), META_ORIGIN, PEN_ORIGIN, buildExtensions(), createHeadlessEditor() (+11 more)

### Community 96 - "geometry.ts"
Cohesion: 0.09
Nodes (34): bindToText(), distToSegment(), glyphForX(), groupLines(), hitsSegments(), intervalDistance(), leadingEdge(), Line (+26 more)

### Community 97 - "Контракт: REST API сервера (v1)"
Cohesion: 0.11
Nodes (23): Эндпоинты /auth: prelogin, signup, login, refresh, logout, recovery, password, Блокноты и документы: /notebooks, /docs, версии, prelogin: детерминированная фальшивая соль для неизвестного email, Session (accessToken 15 мин, refreshToken 30 дней с ротацией), Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6) (+15 more)

### Community 98 - "plugins/host.ts"
Cohesion: 0.12
Nodes (31): agents.authenticate(dsa_ token) -> AgentPrincipal { tokenId, userId, permission, notebookIds } or null; updates lastUsedAt, PluginHost (apiVersion 1): log/config, db + pool for plugin tables, jobs (pg-boss register/enqueue/schedule), crypto seal/open, agents.authenticate, agents.withScope, Tx, notebooks, ApiError, forbidden(), notFound(), AD (+23 more)

### Community 99 - "tasks"
Cohesion: 0.10
Nodes (20): run, CI, jobs, test, working-directory, env, if, name (+12 more)

### Community 100 - "dependencies (2)"
Cohesion: 0.12
Nodes (16): dependencies, @expo-google-fonts/inter@^0.4.2, fastify-plugin@^6.0.1, mdast-util-from-markdown@^2.1.0, mdast-util-gfm@^3.1.0, micromark-extension-gfm@^3.0.0, @modelcontextprotocol/server@^2.4.0, yjs@^13.6.27 (+8 more)

### Community 101 - "Дизайн и организация (2)"
Cohesion: 0.11
Nodes (18): BackdropBlob, BackdropName, BackdropSpec, ColorName, DurationName, HighlightName, InkName, MotionName (+10 more)

### Community 102 - "contracts/sync.ts (2)"
Cohesion: 0.13
Nodes (14): ClientMessage, ClientPlatform, SNAPSHOT_THRESHOLD_BYTES, SNAPSHOT_THRESHOLD_UPDATES, SyncErrorCode, DocEntry, Listeners, REMOTE_ORIGIN (+6 more)

### Community 103 - "D-21. Технологический стек"
Cohesion: 0.18
Nodes (15): PenTool, TOOL_DEFAULTS, HIGHLIGHT_TOKENS, INK_TOKENS, resolveColor(), TINTS, TOKEN_FALLBACKS, tokenVarName() (+7 more)

### Community 104 - "Datascratch — правила для ИИ (CLAUDE.md)"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib, module (+10 more)

### Community 105 - "open-questions.md (2)"
Cohesion: 0.11
Nodes (17): description, exports, ./theme.css, ./tokens.css, ./tokens.json, files, main, name (+9 more)

### Community 106 - "0009-notebook-mode-choice.md (2)"
Cohesion: 0.11
Nodes (18): dependencies, clsx@^2.1.1, cmdk@^1.1.1, @datascratch/design-tokens@workspace:*, @fontsource-variable/inter@^5.3.0, @fontsource-variable/jetbrains-mono@^5.3.0, @fontsource-variable/source-serif-4@^5, lucide-react@^1.61.0 (+10 more)

### Community 107 - "Правила для ИИ и документации (4)"
Cohesion: 0.23
Nodes (13): decodeAnchor(), encodeCharAnchor(), followRedone(), followRedoneId(), isAnchorDeleted(), rebaseRedoneAnchors(), resolveCharAnchor(), setup() (+5 more)

### Community 108 - "compilerOptions (4)"
Cohesion: 0.20
Nodes (9): compilerOptions, declaration, noEmit, outDir, rootDir, sourceMap, extends, include (+1 more)

### Community 109 - "exports"
Cohesion: 0.12
Nodes (17): import, types, import, types, exports, ./crypto, ./document, ./ids (+9 more)

### Community 110 - "0036-space-notebook-folder.md"
Cohesion: 0.14
Nodes (21): Notebook { id, mode, createdAt, wrappedKey } — ответ /notebooks, Блокноты: POST/GET /notebooks, /notebooks/:id/key, DELETE (D-36), masterKey — 32 случайных байта, создаётся при регистрации, шифрует account-документ, Документ account: spaces, notebooks, settings, starred, tabs (ключ — masterKey), NotebookRef { id, spaceId, name, mode: private | agent, … } — ключ блокнота здесь не хранится, Space { id, name, icon, color, order, createdAt } в account-документе, Organization Hierarchy (Account > Space > Notebook > Folder > Note), users table: email, KDF salt and params, Argon2id(loginKey), Argon2id(recoveryLoginKey), wrapped masterKey, accountDocId (+13 more)

### Community 111 - "Дизайн и организация"
Cohesion: 0.10
Nodes (16): Rejected design options: Clean Neutral, Graphite, docker compose up one-command server launch, infra/README.md deployment guide, Decision log (ADR table), Decision statuses: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО / ЗАМЕНЕНО, OPEN (before stage 2): Craft features MVP / post-MVP split (D-41, proposed), Open: server hosting and domain, Open questions list (+8 more)

### Community 113 - "sync-protocol.md"
Cohesion: 0.15
Nodes (23): Ассоциированные данные ds1|… привязывают шифротекст к месту (doc, awareness, ключи, куски вложений), ack — обновление или снимок принят и сохранён (docId, clientMsgId, seq), awareness — курсоры и присутствие: зашифровано, не хранится, только рассылается, bad_request — код ошибки синхронизации для некорректного сообщения, Коды ошибок синхронизации: unauthorized, forbidden, doc_not_found, payload_too_large (2 MiB / 50 MiB), rate_limited, protocol_mismatch, internal, error — сообщение сервера: code, message, ref? (clientMsgId / docId), Правило ref в error: для ошибок push/snapshot ref = их clientMsgId, иначе — docId при наличии, Клиент хранит lastSeq по каждому документу и догоняет недостающее при подключении (+15 more)

### Community 114 - "0009-notebook-mode-choice.md (2) (2)"
Cohesion: 0.11
Nodes (23): description, devDependencies, jsdom@^30.1.3, @testing-library/user-event@^14.6.8, @types/react@^19.3.0, @types/react-dom@^19.3.0, typescript@^5.9.3, vite@^8.3.5 (+15 more)

### Community 115 - "iOS-стек и два языка (2) (2)"
Cohesion: 0.21
Nodes (9): AnchorBox, Glyph, blockIdOf(), blockIds, ElementInfo, FontMetrics, LayoutPass, metricsCache (+1 more)

### Community 116 - "dependencies"
Cohesion: 0.10
Nodes (21): dependencies, katex@^0.16.0, lowlight@^3.3.0, @tiptap/core@^3.32.0, @tiptap/extension-code-block-lowlight@^3.32.0, @tiptap/extension-list@^3.32.0, @tiptap/extension-table@^3.32.0, @tiptap/pm@^3.32.0 (+13 more)

### Community 117 - "D-30. База данных сервера — PostgreSQL (2)"
Cohesion: 0.26
Nodes (7): DSSidebarItem, .body, DSSidebarSection, .body, .isExpanded, SidebarPreview, .body

### Community 118 - "devDependencies (3)"
Cohesion: 0.13
Nodes (15): devDependencies, eslint@^9.39.0, prosemirror-model@^1.25.12, @types/node@^22.10.0, @types/ws@^8.5.13, vitest@^3.2.0, ws@^8.18.0, y-prosemirror@^1.3.7 (+7 more)

### Community 120 - "Контракт: API для ИИ-агентов — MCP, REST, OAuth (v1, черновик) (2)"
Cohesion: 0.14
Nodes (13): 10. Открытые вопросы (к координатору), 1. Как устроено, 2.1. Токены, 2.2. OAuth 2.1 (по спецификации MCP 2026-07-28), 2. Доступ, 3. Инструменты MCP и REST, 4. Markdown для агента (`read_note`), 5. Правки агента (D-10) (+5 more)

### Community 121 - "Контракт: API для ИИ-агентов — MCP, REST, OAuth (v1, черновик)"
Cohesion: 0.25
Nodes (12): /v1/agent-tokens access management endpoints, @datascratch/agents Fastify plugin (packages/agents), Audit log (AuditEntry), OAuth consent screen 'Тихая бумага', Agents API Contract (MCP, REST, OAuth) v1 — approved by coordinator 2026-10-25, context.store (grants, OAuth clients, codes, tokens, audit), context.users (authenticate, loginUrl), /mcp MCP server (Streamable HTTP) (+4 more)

### Community 122 - "contracts/sync.ts (3)"
Cohesion: 0.19
Nodes (11): Лимиты payload_too_large: обновление 2 MiB, снимок 50 MiB — считаются декодированные байты, не base64, MAX_SNAPSHOT_BYTES, MAX_UPDATE_BYTES, ServerMessage, SYNC_PROTOCOL_VERSION, SyncAuth, UpdateItem, Connection (+3 more)

### Community 123 - "06-data-server.md (2)"
Cohesion: 0.14
Nodes (14): 1. Купить сервер, 2. Домен, 3. Подключиться и подготовить сервер, 4. Скачать проект, 5. Заполнить настройки, 6. Запустить, 7. Резервные копии каждую ночь, 8. Обновление сервера (+6 more)

### Community 124 - "document.test.ts"
Cohesion: 0.08
Nodes (47): NoteMeta, TASK_STATES, TaskState, listTopLevelBlocks(), setTitle(), ATTR_TEXT_BLOCKS, attrText(), buildBacklinks() (+39 more)

### Community 125 - "@datascratch/design-tokens README"
Cohesion: 0.08
Nodes (30): DSDateChip / DSDateChipModel, dsdesign-snapshots CI artifact, DSDesign — дизайн-система «Тихая бумага» для iOS, DSShowcase, SwiftUI token API (dsFont, .ds colors, dsTint, ink, dsShadow, withDSAnimation, DSHaptics), Как пользоваться, Компоненты, Сборка и тесты (+22 more)

### Community 126 - "04-editor.md (4)"
Cohesion: 0.15
Nodes (13): Критерии приёмки, План разработки, Подготовка, Потоки разработки (D-39), Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad) (+5 more)

### Community 127 - "shared/package.json"
Cohesion: 0.18
Nodes (12): dependencies, libsodium-wrappers-sumo@^0.8.2, zod@^4.1.0, description, files, libsodium-wrappers-sumo, zod, name (+4 more)

### Community 128 - "0009-notebook-mode-choice.md (5)"
Cohesion: 0.15
Nodes (5): @testing-library/jest-dom@^7.0.1, @testing-library/react@^16.3.3, RO, @testing-library/jest-dom, @testing-library/react

### Community 129 - "context.ts (2)"
Cohesion: 0.18
Nodes (6): jose@^6.2.13, AccessClaims, GuestClaims, subkey(), TokenSigner, jose

### Community 130 - "compilerOptions (2)"
Cohesion: 0.17
Nodes (11): compilerOptions, lib, module, moduleResolution, noEmit, outDir, rootDir, types (+3 more)

### Community 131 - "06-data-server.md"
Cohesion: 0.08
Nodes (31): apps/server — сервер, apps/server — сервер Datascratch, Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), Запуск для разработки, Плагины (интерфейс для `@datascratch/agents`), Устройство, server: apps/server — Fastify + zod (OpenAPI), PostgreSQL через Drizzle, весь REST API, WebSocket-синхронизация, RLS для агентов, pg-boss; infra/ (Dockerfile, docker compose + Caddy, бэкапы, инструкция для VPS); CI server.yml, D-40. Хостинг — позже; сервер готов к запуску одной командой (+23 more)

### Community 133 - "shared/test/sync.test.ts"
Cohesion: 0.12
Nodes (8): SyncStatus, WebSocketFactory, WebSocketLike, deliver(), MemorySyncStorage, clients, makeClient(), text()

### Community 134 - "ref_react"
Cohesion: 0.07
Nodes (33): BadgeProps, TagChipProps, tones, CheckboxProps, TaskCheckboxProps, TaskState, CommandGroup(), CommandItem() (+25 more)

### Community 135 - "graphify_docs.py"
>>>>>>> origin/main
Cohesion: 0.28
Nodes (13): NoteEntry, noteTitle(), useAttachmentUrl(), CardThumb(), DocCard(), DocCollection(), DocRow(), useOpen() (+5 more)

<<<<<<< HEAD
### Community 47 - "03-pencil.md"
Cohesion: 0.10
Nodes (17): D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, 3. Apple Pencil в тексте — ключевая фича, Handwriting input types (text marks, margin notes, drawing block, drawing on images, Scribble), Pencil gestures (zigzag delete, underline, strike, lasso), Stroke point anchoring: character anchor + dx/dy in font-size units, System Scribble only; no recognition of drawn ink (D-07) (+9 more)

### Community 48 - "web-editor/README.md"
Cohesion: 0.18
Nodes (11): apps/web index.html (PWA entry), Inline theme bootstrap script (ds.theme), Derived data indexer (tasks, noteIndex, MiniSearch), Mock server and e2e tests (Playwright), Offline-first device storage (Dexie/IndexedDB), Web client (Vite + React + TS PWA), Derived local data (task index, search, backlinks, tags), formatVersion read-only fallback (+3 more)

### Community 49 - "runtime.ts"
Cohesion: 0.16
Nodes (14): getMasterKey(), Listener, ORIGIN_LOAD, ORIGIN_REMOTE, SNAPSHOT_AFTER, SearchHit, clearKeys(), notebookKey() (+6 more)

### Community 50 - "Скрипт обновления графа"
Cohesion: 0.27
Nodes (6): finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 51 - "Контракт: REST API сервера (v1)"
Cohesion: 0.14
Nodes (13): Agent tokens endpoints, Chunked attachment endpoints, Client-generated UUIDv7 idempotent creation, Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1) (+5 more)

### Community 52 - "open-questions.md (3)"
Cohesion: 0.20
Nodes (9): GitHub Actions CI (incl. macOS iOS builds), XcodeGen, Stack decisions D-21..D-31 (no Rust core, no Redis, no MinIO), D-28. Процесс разработки: облако + Mac, сборка iOS в CI, Mixed cloud + Mac development mode, XcodeGen (project.yml) - proposed, Контекст, Последствия (+1 more)

### Community 53 - "06-data-server.md (2)"
Cohesion: 0.11
Nodes (18): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, Контекст, Решение (на сейчас) (+10 more)

### Community 54 - "Дизайн и организация"
Cohesion: 0.12
Nodes (14): D-15. Дизайн — основная концепция продукта, Design references: Things 3, Linear, Craft, Arc, Последствия, Решение, D-15 Design is main principle, Minimal buttons; command palette Cmd-K, Nested tags and smart tags, Own design system shared iOS/web (+6 more)

### Community 55 - "Дизайн и организация (2)"
Cohesion: 0.17
Nodes (12): Guest share route /s/:shareId#k=key, Notebooks and docs endpoints, Shares endpoints (guest token), Agent mode (server KMS key wraps notebookKey), Share link key in URL fragment, account document structure, Three Yjs doc kinds (account, notebook, note), notebook index document (folders, NoteMeta, tags) (+4 more)

### Community 56 - "engine.ts"
Cohesion: 0.12
Nodes (11): ClientMessage, HelloAuth, ServerMessage, BACKOFF, createSyncStatusStore(), OutgoingMessage, SyncHost, SyncState (+3 more)

### Community 57 - "compilerOptions (2)"
Cohesion: 0.15
Nodes (12): compilerOptions, baseUrl, declaration, jsx, lib, noEmit, paths, sourceMap (+4 more)

### Community 58 - "roadmap.md (2)"
Cohesion: 0.19
Nodes (12): Color tokens (light/dark, ink, tints, backdrops), Block schema with blockId, note document (content, meta, strokes, comments), TipTap / y-prosemirror compatibility, Deleted text hides stroke, not deletes it (D-35), Live stroke anchoring to text (Yjs relative positions), Point packing (8 x Float32 LE), Stroke object (immutable Y.Map) (+4 more)

### Community 59 - "Платформы и клиенты"
Cohesion: 0.13
Nodes (13): D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps, Daily off-VPS backups of DB and files with verified restore (R-11), 11. Нефункциональные требования, Accessibility: Dynamic Type, VoiceOver, light/dark, iPad keyboard, Performance targets (PencilKit latency, 120 fps, 300 ms open, 1-min first sync, 2 s delivery, 1 s cold start) (+5 more)

### Community 60 - "D-38. Дизайн-направление — «Тихая бумага», ориентир Craft"
Cohesion: 0.18
Nodes (12): Craft as visual reference, D-38 Design direction Quiet Paper, D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Design tokens contract (design-tokens.md), Quiet Paper design direction, Рассмотренные варианты, Решение, Organization and design spec (+4 more)

### Community 61 - "data-model.md"
Cohesion: 0.22
Nodes (11): Anchor (textRange / paragraph / drawingBlock / image), Note, Stroke, StrokePoint, Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3) (+3 more)

### Community 62 - "09-agents-api.md"
Cohesion: 0.11
Nodes (19): D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Export: Markdown, PDF, HTML (handwriting as images), pg-boss background job queue on PostgreSQL, PostgreSQL via Drizzle (D-30): accounts, notebooks, rights, tokens, encrypted updates, snapshots, agent log, Server responsibilities: accounts, encrypted relay, attachments, realtime, API/MCP, handwriting PNG render, 9. API и внешние ИИ-агенты, Log of all agent actions (+11 more)

### Community 63 - "i18n/index.ts"
Cohesion: 0.27
Nodes (7): en, Loose, keys(), Lang, setLang(), Messages, ru

### Community 64 - "glossary.md"
Cohesion: 0.12
Nodes (17): doc_snapshots Table (compacted snapshots, version history), doc_updates Table (encrypted Yjs updates), libsodium (swift-sodium), VPS Hosting (Hetzner or similar), Canvas + Pointer Events Pen Layer, End-to-End Encryption (E2E), Snapshot, Universal Links (+9 more)

### Community 65 - "Процесс разработки и Graphify"
Cohesion: 0.23
Nodes (11): Changelog fragments in docs/changelog.d, Development process, Rules for executor sessions (D-39), Doc graph update: prepare -> agents -> finish, Graphify git hook skips documents, Graphify structural layer + semantic layer, GitHub Actions macOS CI checks iOS code, End-of-session history record (+3 more)

### Community 66 - "main.tsx"
Cohesion: 0.18
Nodes (8): @fontsource-variable/inter@^5.3.0, @fontsource-variable/jetbrains-mono@^5.3.0, @fontsource-variable/newsreader@^5.3.0, react-dom@^19, @fontsource-variable/inter, @fontsource-variable/jetbrains-mono, @fontsource-variable/newsreader, react-dom

### Community 67 - "Datascratch — правила для ИИ (CLAUDE.md)"
Cohesion: 0.18
Nodes (7): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md

### Community 68 - "D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления"
Cohesion: 0.25
Nodes (9): Auth endpoints (prelogin, signup, login, recovery), Argon2id KDF producing loginKey and passwordKey, Key hierarchy (password, master, notebook, note keys), Recovery key (DS1- Crockford Base32), D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления, Recovery key mechanism, Контекст, Рассмотренные варианты (+1 more)

### Community 69 - "01-concept.md"
Cohesion: 0.20
Nodes (8): D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, 1. Концепция продукта, Notesnook (reference product: E2E encryption, reliable sync), Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения, Суть в одном абзаце

### Community 70 - "4. Документ `note`"
Cohesion: 0.18
Nodes (11): 1. Три вида документов Yjs, 2. Документ `account`, 3. Документ `notebook` (индекс блокнота), 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note` (+3 more)

### Community 71 - "D-39. Разработка параллельными сессиями; Claude сам вливает в main"
Cohesion: 0.57
Nodes (6): Contracts between streams (docs/architecture/contracts), Coordinator session merges when CI green, D-39 Parallel sessions; coordinator merges to main, Public repository for free macOS CI, Workstreams with ownership zones (branch claude/<stream>), XcodeGen accepted (D-28)

### Community 72 - "08-sharing.md"
Cohesion: 0.12
Nodes (18): D-37 Guests draw; links live until revoked, D-37. Гости по ссылке рисуют; ссылка живёт до отзыва, Guests with edit link can write and draw, Link valid until revoked, optional expiry, Решение, Encryption and agent access spec, 8. Совместная работа и шеринг, Guests edit without an account (+10 more)

### Community 73 - "tasks"
Cohesion: 0.18
Nodes (10): dependsOn, outputs, $schema, tasks, build, lint, test, typecheck (+2 more)

### Community 74 - "iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium) (2)"
Cohesion: 0.20
Nodes (9): apps/web — веб-клиент Datascratch, Гости (D-13, D-37), Данные на устройстве (офлайн-первый, spec/10), Заглушки других потоков, Запуск, Как устроено, Производные данные (document-model.md §5), Синхронизация (+1 more)

### Community 75 - "compilerOptions (3)"
Cohesion: 0.20
Nodes (9): compilerOptions, declaration, lib, noEmit, sourceMap, types, extends, include (+1 more)

### Community 76 - "accountDb (5)"
Cohesion: 0.20
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 77 - "Процесс разработки и Graphify (2)"
Cohesion: 0.18
Nodes (10): Monorepo Structure (apps/, packages/, infra/), packages/test-vectors, Graphify, Автоматизация, Команды, Обновление графа после правки документов (по шагам), Почему два способа обновления, Установка на Mac (один раз) (+2 more)

### Community 78 - "D-05. Перо при перекладке текста — вариант А «живой штрих»"
=======
### Community 136 - "open-questions.md (2) (2)"
Cohesion: 0.17
Nodes (11): dependsOn, outputs, dependsOn, $schema, tasks, build, lint, test (+3 more)

### Community 137 - "D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS) (2)"
Cohesion: 0.18
Nodes (11): note(), 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке (+3 more)

### Community 138 - "Инструменты MCP и REST для агентов"
Cohesion: 0.18
Nodes (11): Agent error format (isError / REST error codes), packages/agents/src/service/schemas.ts (zod input schemas), MCP tool add_comment, MCP tool get_backlinks, MCP tool list_notebooks, MCP tool list_notes, MCP tool list_spaces, MCP tool list_tasks (+3 more)

### Community 139 - "Как подключить Claude или ChatGPT к Datascratch"
Cohesion: 0.17
Nodes (11): ChatGPT, Claude (claude.ai, приложение Claude, Claude Code), Агент без OAuth или свой скрипт, Если что-то не работает, Как подключить Claude или ChatGPT к Datascratch, Управление доступом, Что получит агент, Шаг 1. Включите режим «для агентов» у блокнота (+3 more)

### Community 141 - "compilerOptions (2)"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, module, moduleResolution, noEmit, rootDir, types, extends (+2 more)

### Community 143 - "peerDependencies"
Cohesion: 0.20
Nodes (10): react@^19.3.1, react-dom@^19.3.1, tailwindcss@^4.3.3, react, react-dom, peerDependencies, react@^19.0.0, react-dom@^19.0.0 (+2 more)

### Community 144 - "compilerOptions (3)"
Cohesion: 0.20
Nodes (9): compilerOptions, declaration, jsx, lib, noEmit, types, extends, include (+1 more)

### Community 145 - "OAuth 2.1 для MCP"
Cohesion: 0.31
Nodes (10): Client ID Metadata Documents (CIMD), Dynamic Client Registration RFC 7591, Authorization response iss (RFC 9207), MCP TypeScript SDK v2 (@modelcontextprotocol/server 2.4, spec 2026-07-28), OAuth 2.1 authorization server (per MCP spec 2026-07-28), PKCE S256 mandatory, response_type=code, Resource parameter (RFC 8707), OAuth well-known metadata (RFC 9728, RFC 8414) (+2 more)

### Community 146 - "08-sharing.md (2)"
Cohesion: 0.22
Nodes (4): Native-only iOS editor (no WebView), Spec 2: Platforms, Universal iPhone+iPad app, one codebase, Web without cuts (full parity, PWA, Pointer Events)

### Community 147 - "Контракт: рукописные штрихи (v1)"
Cohesion: 0.18
Nodes (12): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 5. Отрисовка толщины, 6. Тестовые векторы, Упаковка точек: 8 × Float32 LE [a,x,y,pressure,altitude,azimuth,roll,t], Толщина: width × f(pressure) × (fontSize/17), f(p)=0.35+0.65·p^0.8, Контракт: рукописные штрихи (v1) (+4 more)

### Community 148 - "0005-living-stroke.md"
Cohesion: 0.13
Nodes (17): Custom stroke render layer over TextKit 2 (Metal or Core Animation), Agent edits with agentEdit mark (D-10), Collaborator cursors via awareness (y-protocols), Block editor with Markdown shortcuts; CRDT block tree storage, Markdown export only (D-01), Contract schema: y-prosemirror field content, blockId UUIDv7, taskId, 4. Editor, EditorHost app callbacks, Export (Markdown, PDF, HTML; ink as images); no import now (D-16) (+9 more)

### Community 149 - "0018-monetization.md"
Cohesion: 0.06
Nodes (33): VPS Hosting (Hetzner or similar), D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, Контекст (+25 more)

### Community 150 - "web-editor/package.json"
Cohesion: 0.15
Nodes (12): mermaid@^12.2.0, @tiptap/extension-link@^3.32.0, exports, ./styles.css, main, name, private, type (+4 more)

### Community 151 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, db:generate, db:migrate, dev, lint, start, test (+1 more)

### Community 152 - "sync-protocol.md (2)"
Cohesion: 0.22
Nodes (9): 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05), 6. Права, 7. Коды ошибок, 8. Тестовые векторы (+1 more)

### Community 153 - "01-concept.md"
Cohesion: 0.33
Nodes (4): D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, Stroke hint classification (underline, strike, circle, arrow, scribble, highlight, free)

### Community 154 - "0005-living-stroke.md (2)"
Cohesion: 0.15
Nodes (13): Apple Pencil in text — key feature, Stroke point stored as (char anchor, dx/dy in font-size units), Web anchoring via DOM Range measurement, em offsets, Yjs relative position, Pen feel requirements (PencilKit latency, predicted/coalesced touches, pressure, tilt, eraser, 120 fps), Pen gestures (zigzag delete, underline, strike, lasso), Glass pen palette (tools, ink.* / highlight.* tokens, widths), Pointer Events input (pressure, tilt, twist, coalesced/predicted events, palm rejection), Prototype open issues (multi-word circles, deleted marked text R-04, versioned stroke format R-03) (+5 more)

### Community 155 - "Shared test vectors (input -> expected output) run in Swift and TypeScript"
Cohesion: 0.20
Nodes (9): Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), Shared TypeScript types and schemas (document, strokes, metadata, sync protocol, API), docs/architecture/contracts/README.md (coordinator), D-22 (no shared core, compatibility via vectors), document/notebook.json, document/account.json vector, DSCore Swift package (apps/ios/Packages/DSCore), strokes/layout.json vector, strokes/points.json vector (+1 more)

### Community 156 - "compilerOptions (3)"
Cohesion: 0.22
Nodes (8): compilerOptions, jsx, lib, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 157 - "agents/package.json"
Cohesion: 0.18
Nodes (10): description, engines, node, files, main, name, private, type (+2 more)

### Community 158 - "Правки агента и Markdown для агентов"
Cohesion: 0.25
Nodes (8): Agent Markdown dialect, Block markers <!-- block:<blockId> -->, Strokes with all anchors deleted hidden (D-35), Handwriting image references (D-11), Handwriting PNG renderer (@napi-rs/canvas), In-process PNG render cache (200 images), MCP tool get_handwriting_image, MCP tool read_note

### Community 159 - "generate.ts"
Cohesion: 0.22
Nodes (6): initCrypto(), check, files, root, doc, syncVectors()

### Community 160 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 161 - "pen.spec.tsx"
Cohesion: 0.18
Nodes (4): @playwright/experimental-ct-react@1.62.1, @playwright/test@1.62.1, @playwright/experimental-ct-react, @playwright/test

### Community 162 - "0005-living-stroke.md (4)"
Cohesion: 0.22
Nodes (9): Stroke and pixel eraser (one undo step per gesture), Redraw on any reflow; line splitting and D-35 rule, Web editor demo showcase (port 5174, two devices, agent edit, width slider), Single Y.UndoManager over content and strokes, Web editor demo HTML entry (loads demo/main.tsx, Inter/JetBrains Mono/Newsreader fonts), Playwright component test HTML entry (loads index.tsx), web-editor commands (vitest, Playwright CT, dev), web-editor package layout (schema, collab, pen, ui, shared, demo, test, ct) (+1 more)

### Community 163 - "04-editor.md (4) (2)"
Cohesion: 0.25
Nodes (7): compilerOptions, lib, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 164 - "test-vectors/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, lib, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 165 - "contracts/README.md"
Cohesion: 0.22
Nodes (9): Тестовые векторы crypto: KDF, конверты, Base32 ключа восстановления, куски вложений (Swift и TS), Контракт — точное описание формата/протокола, который реализуют несколько частей (iOS на Swift, веб и сервер на TS), Совместимость доказывается общими тестовыми векторами (packages/test-vectors), Типы TypeScript контрактов в packages/shared/src/contracts/ — часть контракта, Контракты между частями системы, Правила изменения, Тестовые векторы strokes: упаковка точек, разрешение якорей после правок, правило D-35, Тестовые векторы sync: примеры всех сообщений в JSON (схема проверяется в TS и Swift) (+1 more)

### Community 166 - "D-39 Parallel sessions; Claude merges into main"
Cohesion: 0.29
Nodes (6): Architecture contracts (docs/architecture/contracts), Claude coordinator session merges to main on green CI, Work streams with ownership zones (claude/<stream> branches), Development process, Rules for executor sessions (D-39), Development roadmap

### Community 167 - "Правки агента и Markdown для агентов (2)"
Cohesion: 0.38
Nodes (6): agentEdit mark { agentId, at }, edit_note operations (insert, replace, delete, move, replace_text), Handwriting group (strokes within 24 chars), edit_note move: блок копируется, у затронутых штрихов и комментариев переписываются anchors на символы копии, MCP tool edit_note, Agent edit as Yjs update via context.data.applyUpdate

### Community 168 - "Обзор архитектуры"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 169 - "web-editor.yml"
Cohesion: 0.17
Nodes (11): concurrency, cancel-in-progress, group, name, paths, branches, paths, True (+3 more)

### Community 170 - "Новая группа (4)"
Cohesion: 0.32
Nodes (6): AgentNotebook, context.data methods (listAgentNotebooks, loadDoc, docSeqs, applyUpdate, createNoteDoc, loadAttachmentImage), KMS decryption of agent notebooks (R-10), Open question: notebook and space names for server (resolved — copy in notebook meta, document-model §3), MCP tool create_note, meta.name / meta.icon / meta.space документа notebook — копия названий из account для агентов; клиенты обновляют при создании, переименовании и включении режима «для агентов»

### Community 171 - "Контракт: API для ИИ-агентов — MCP, REST, OAuth (v1, черновик) (2)"
Cohesion: 0.33
Nodes (6): Grant (static / oauth), Permissions read / read_write, In-process rate limits (D-25), OAuth scopes notes:read / notes:write, Insufficient scope step-up (403 insufficient_scope), Token formats (dsa_, dso_at_, dso_rt_, dso_code_)

### Community 172 - "@datascratch/shared package"
Cohesion: 0.25
Nodes (8): applyBlockOperations (block ops for agents), @datascratch/shared package, document-model.md contract, @datascratch/shared/document, @datascratch/shared/ids (uuidv7), uuidv7() monotonic, src/generate.ts generator, ids/uuidv7.json vector

### Community 173 - "agents/tsconfig.build.json"
Cohesion: 0.25
Nodes (7): compilerOptions, noEmit, outDir, rootDir, extends, include, ./tsconfig.json

### Community 174 - "7. Шифрование и доступ агентов"
Cohesion: 0.29
Nodes (7): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Вход и восстановление доступа (D-34), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 175 - "scripts (2)"
Cohesion: 0.33
Nodes (6): scripts, build, lint, test, test:watch, typecheck

### Community 176 - "True"
Cohesion: 0.29
Nodes (7): paths-ignore, branches, paths-ignore, True, pull_request, push, workflow_dispatch

### Community 177 - "scripts (2)"
Cohesion: 0.33
Nodes (6): scripts, dev, lint, showcase:build, test, typecheck

### Community 178 - "scripts (3)"
Cohesion: 0.33
Nodes (6): scripts, build, dev, test, test:ct, typecheck

### Community 179 - "@datascratch/shared/strokes"
Cohesion: 0.33
Nodes (6): D-35 (strokes on deleted text kept), rebaseRedoneAnchors / attachAnchorRebase, restoreNoteVersion, strokes.md contract, @datascratch/shared/strokes, strokes/anchors.json vector

### Community 180 - "@datascratch/shared/sync"
Cohesion: 0.43
Nodes (7): MemorySyncHub (in-memory reference protocol server), MemorySyncStorage, REMOTE_ORIGIN, sync-protocol.md contract, @datascratch/shared/sync, SyncClient, SyncStorage (offline queue interface)

### Community 181 - "scripts (2) (2)"
>>>>>>> origin/main
Cohesion: 0.40
Nodes (5): scripts, build, lint, test, typecheck

<<<<<<< HEAD
### Community 79 - "D-21. Технологический стек"
Cohesion: 0.40
Nodes (5): D-21. Технологический стек, Контекст, Последствия, Рассмотренные варианты (по обсуждению 2026-10-25), Решение

### Community 80 - "D-36. Структура: пространство → блокноты → папки"
Cohesion: 0.29
Nodes (9): Tags, smart tags, favorites, recents, D-36 Space > Notebooks > Folders, D-36. Структура: пространство → блокноты → папки, Document model contract (document-model.md), Nested folders (unlimited depth), Notebook (unit of encryption mode and sharing), Space (Personal, Work, Study), Рассмотренные варианты (+1 more)

### Community 81 - "decisions/README.md"
Cohesion: 0.10
Nodes (19): ADR log index (D-01..D-41), D-04 Encryption and API simultaneously: two notebook modes, D-18 Monetization OPEN, D-22 No Rust core; Yjs/Yrs + libsodium + test vectors, D-24 Product name OPEN, D-25 No Redis, D-30 PostgreSQL server DB, D-31 CRDT Yjs/Yrs (+11 more)

### Community 82 - "PostgreSQL"
Cohesion: 0.33
Nodes (8): agent_tokens / agent_audit_log Tables, Server PostgreSQL Schema (Stage 3 Draft), Handwriting-to-PNG Render (pg-boss queue), docker compose Self-Hosting (server + PostgreSQL), pg-boss Job Queue, PostgreSQL, Row-Level Security (RLS), R-10 Agent Notebooks Readable if Server Breached

### Community 83 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build, dev, e2e, e2e:build, lint, mock-server, preview (+2 more)

### Community 84 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.22
Nodes (8): Motion and haptics tokens, packages/design-tokens/tokens.json source, Typography tokens (Newsreader, Inter, New York, SF), Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 85 - "Контракт: протокол синхронизации (v1)"
Cohesion: 0.14
Nodes (14): Web sync engine (WebSocket, push queue, lastSeq), Ciphertext envelope (XChaCha20-Poly1305 with AD binding), 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05), 6. Права (+6 more)

### Community 86 - "D-32. Минимальная версия iOS/iPadOS — 26"
Cohesion: 0.25
Nodes (7): Decisions D-32..D-41 from user questionnaires, D-32. Минимальная версия iOS/iPadOS — 26, Последствия, Рассмотренные варианты, Решение, D-33. Bundle ID — com.datascratch.app, Решение

### Community 87 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 89 - "useNoteDoc.ts"
Cohesion: 0.60
Nodes (4): readNoteMeta(), cachedMeta(), metaCache, useNoteMeta()

### Community 90 - "0002-no-desktop-app.md"
Cohesion: 0.40
Nodes (3): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение

### Community 91 - "08-sharing.md (2)"
Cohesion: 0.38
Nodes (5): D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account, Universal Links (paid Apple Developer account), Последствия, Решение

### Community 92 - "open-questions.md (2)"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 93 - "Соглашения"
Cohesion: 0.25
Nodes (8): Документация Datascratch, История, Как вносить изменения, Оглавление, Порядок чтения для новичка, Соглашения, Ссылки на решения, Статусы

### Community 94 - "12. Функции по мотивам Craft"
Cohesion: 0.25
Nodes (8): 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft, Связь с моделью данных

### Community 95 - "App.tsx (2)"
Cohesion: 0.70
Nodes (3): AuthLayout(), Logo(), Splash()

### Community 96 - "SyncIndicator.tsx"
Cohesion: 0.83
Nodes (3): SyncIndicator(), Tooltip(), useSyncStatus

### Community 97 - "CalendarPage.tsx (3)"
Cohesion: 0.29
Nodes (7): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4. Привязка к тексту (живой штрих), 5. Отрисовка толщины, 6. Тестовые векторы, Контракт: рукописные штрихи (v1)

### Community 98 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 99 - "D-35. Пометка на удалённом тексте исчезает вместе с ним"
Cohesion: 0.33
Nodes (6): D-35 Stroke vanishes with deleted text, D-35. Пометка на удалённом тексте исчезает вместе с ним, Strokes hidden when anchors deleted (compaction cleans later), Strokes contract (strokes.md), Рассмотренные варианты, Решение

### Community 100 - "D-03. Платформы: нативные iPhone и iPad + полноценный веб"
Cohesion: 0.50
Nodes (4): D-03. Платформы: нативные iPhone и iPad + полноценный веб, Контекст, Последствия, Решение

### Community 101 - "D-40. Хостинг — позже; сервер готов к запуску одной командой"
Cohesion: 0.40
Nodes (5): D-40 Hosting later; one-command launch, D-40. Хостинг — позже; сервер готов к запуску одной командой, docker compose up deployment + infra/README.md, Решение, Hosting and domain

### Community 102 - "Процесс разработки и Graphify (3)"
Cohesion: 0.33
Nodes (6): Git, Две среды, Конец сессии, Кто что делает, Правила для сессий-исполнителей (D-39), Процесс разработки

### Community 103 - "0006-finger-drawing-iphone.md"
Cohesion: 0.50
Nodes (3): D-06. Рисование пальцем на iPhone — да, опционально, Finger drawing toggle on iPhone, Решение

### Community 104 - "web-editor/index.ts"
Cohesion: 0.40
Nodes (3): @tiptap/react@^3, NoteEditorProps, @tiptap/react

### Community 105 - "D-39. Разработка параллельными сессиями; Claude сам вливает в main"
Cohesion: 0.50
Nodes (4): D-39. Разработка параллельными сессиями; Claude сам вливает в main, Контекст, Последствия, Решение

### Community 106 - "Дизайн и организация (3)"
Cohesion: 0.40
Nodes (5): 5. Организация заметок и дизайн, Дизайн (D-15 — РЕШЕНО, главный принцип продукта), Организация (D-14 — РЕШЕНО по сути; структура ниже — ПРЕДЛОЖЕНО), Принципы, Реализация

### Community 107 - "2. Платформы"
Cohesion: 0.50
Nodes (4): 2. Платформы, Минимальная версия iOS/iPadOS — 26 (D-32), Тестовые устройства (известно на 2026-10-25), Требования

### Community 108 - "Новая группа"
Cohesion: 0.83
Nodes (4): Web favicon (SVG), Blue ink stroke logo mark on warm paper (#2E5BDB on #FAF8F4), PWA icon 192x192, PWA icon 512x512

## Ambiguous Edges - Review These
- `0008-pdf-annotations.md` → `Block schema with blockId`  [AMBIGUOUS]
  docs/architecture/contracts/document-model.md · relation: conceptually_related_to

## Knowledge Gaps
- **102 isolated node(s):** `../../tsconfig.base.json`, `../../tsconfig.base.json`, `Bundle ID com.datascratch.app (D-33)`, `Minimum iOS/iPadOS 26 (D-32)`, `iPhone quick notes client` (+97 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 598 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.
=======
### Community 182 - "roadmap.md (2)"
Cohesion: 0.40
Nodes (4): packages/agents — доступ внешних ИИ-агентов, Команды, Подключение в сервере, Устройство

### Community 183 - "2026-10-25 (вторая половина дня) (2)"
Cohesion: 0.40
Nodes (5): packages/shared — `@datascratch/shared`, Коротко об использовании, Особенности, о которых стоит знать, Подпути, Разработка

### Community 184 - "2026-10-25 (вторая половина дня) (3)"
Cohesion: 0.40
Nodes (5): packages/test-vectors — общие тестовые векторы, Как обновлять, Как пользоваться из Swift, Канонический JSON содержимого заметки, Что внутри

### Community 185 - "Stream design-system (claude/design-system): packages/design-tokens, packages/ui, apps/ios/Packages/DSDesign — Quiet Paper tokens, web and SwiftUI components (3)"
Cohesion: 0.25
Nodes (7): @datascratch/ui — веб-компоненты «Тихая бумага», packages/ui — веб-компоненты дизайн-системы, React design-system components on Radix + Tailwind + Motion in Quiet Paper style, Витрина и тесты, Доступность и движение, Компоненты, Подключение

### Community 186 - "./plugin-api"
Cohesion: 0.50
Nodes (4): exports, ./plugin-api, default, types

### Community 187 - "./testing"
Cohesion: 0.50
Nodes (4): exports, ./testing, default, types

### Community 188 - "yjs"
Cohesion: 0.50
Nodes (4): yjs@^13.6.27, yjs, peerDependencies, yjs@^13.6.0

### Community 189 - "04-editor.md"
Cohesion: 0.09
Nodes (25): Производные данные строятся локально: индекс задач, полнотекстовый поиск, бэклинки, теги, Inline-узлы noteLink ([[ ]]) и tag (без #, вложенность через /), taskItem: taskId, state open / done / cancelled, scheduled, deadline, completedAt, Разрыв штриха по строкам: соседние точки на разных line fragments → отдельные сегменты, Canvas + Pointer Events Pen Layer, web-editor: @datascratch/web-editor — TipTap-редактор поверх Y.Doc со всеми блоками и слой пера на Canvas с живым штрихом; витрина, vitest и Playwright, CI web-editor.yml, Obsidian (reference product: links, backlinks, tags, Markdown export), 4. Редактор (+17 more)

### Community 190 - ".prettierrc.json"
Cohesion: 0.50
Nodes (3): printWidth, singleQuote, trailingComma

### Community 191 - "./contracts"
Cohesion: 0.67
Nodes (3): import, types, ./contracts

### Community 193 - "exports (2)"
Cohesion: 0.67
Nodes (3): exports, ./fonts.css, ./styles.css

### Community 205 - "@fastify/rate-limit"
Cohesion: 0.20
Nodes (6): @fastify/rate-limit@^11.2.1, pg-boss@^12.38.0, engines, node, @fastify/rate-limit, pg-boss

### Community 206 - "MCP Toolset"
Cohesion: 0.40
Nodes (4): MCP Toolset, edit_note atomic blockId edits, MCP tools table (list_notebooks, search_notes, read_note, edit_note, ...), Tasks (taskItem, Inbox, unified Tasks screen)

### Community 207 - "fastify"
Cohesion: 0.50
Nodes (4): fastify@^5.6.0, fastify, peerDependencies, fastify@^5.0.0

### Community 210 - "concurrency"
Cohesion: 0.67
Nodes (3): concurrency, cancel-in-progress, group

### Community 211 - "@datascratch/shared/contracts (types and zod schemas)"
Cohesion: 0.67
Nodes (3): @datascratch/shared/contracts (types and zod schemas), parseClientMessage / parseServerMessage, sync/messages.json vector

## Knowledge Gaps
- **306 isolated node(s):** `PackageDescription`, `none`, `online`, `away`, `.presenceLabel` (+301 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1714 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.
>>>>>>> origin/main

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

<<<<<<< HEAD
- **Why does `yjs` connect `workspace.ts` to `actions.ts`, `ShareDialog.tsx`, `web/package.json`, `DocPage.tsx`, `GuestPage.tsx`, `dependencies`, `Editor.tsx`, `runtime.ts`, `crypto.ts`, `useNoteDoc.ts`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `../../tsconfig.base.json`, `../../tsconfig.base.json`, `Bundle ID com.datascratch.app (D-33)` to the rest of the system?**
  _102 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.060835831423029445 - nodes in this community are weakly interconnected._
- **Why does `ws` connect `web/package.json` to `server.mjs`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Should `CalendarPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13877551020408163 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `actions.ts`, `CalendarPage.tsx`, `ShareDialog.tsx`, `web/package.json`, `DocPage.tsx`, `GuestPage.tsx`, `useWorkspace`, `App.tsx`, `AppShell.tsx`, `main.tsx`, `dependencies`, `Editor.tsx`, `DocCards.tsx`, `useNoteDoc.ts`, `SignupPage.tsx`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `0008-pdf-annotations.md` and `Block schema with blockId`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
=======
- **Why does `Чип даты (одинаково на iOS и в вебе): «Сегодня/Завтра/Вчера», день недели на 2–6 дней вперёд, иначе короткая дата; цвета danger/warning/accent/text.tertiary` connect `design-tokens.md` to `DSDateChip`, `0018-monetization.md (2) (2)`, `12-craft-features.md`, `Монорепозиторий и CLAUDE.md`, `DSDateChip (2)`, `@datascratch/design-tokens README`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **What connects `PackageDescription`, `none`, `online` to the rest of the system?**
  _306 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.026234567901234566 - nodes in this community are weakly interconnected._
- **Why does `packages/design-tokens/tokens.json — источник значений; генерирует CSS-переменные и Swift` connect `design-tokens.md` to `Монорепозиторий и CLAUDE.md`, `0005-living-stroke.md (3)`, `02-platforms.md`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Should `0039-parallel-sessions.md` be split into smaller, more focused modules?**
  _Cohesion score 0.11497584541062802 - nodes in this community are weakly interconnected._
- **Why does `DSDateChipModel` connect `DSDateChip` to `design-tokens.md`, `DSDateChip (2)`, `strokes.md (2)`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Should `stack.md` be split into smaller, more focused modules?**
  _Cohesion score 0.0554954954954955 - nodes in this community are weakly interconnected._
>>>>>>> origin/main
