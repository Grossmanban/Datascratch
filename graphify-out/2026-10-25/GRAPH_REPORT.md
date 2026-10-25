# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 161 files · ~68,847 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1941 nodes · 4577 edges · 111 communities (104 shown, 7 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 261 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- actions.ts
- CalendarPage.tsx
- ShareDialog.tsx
- web/package.json
- GuestPage.tsx
- 0031-crdt-yjs.md
- 06-data-server.md
- overview.md
- AppShell.tsx
- session.ts
- dependencies
- 01-concept.md
- workspace.ts
- Editor.tsx
- Компоненты стека
- contracts.ts
- Процесс разработки (docs/development.md)
- data-model.md
- stack.md
- router.tsx
- crypto.ts
- server.mjs
- 10-sync.md
- CalendarPage.tsx (2)
- iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)
- accountDb
- roadmap.md
- SignupPage.tsx
- GuestPage.tsx (2)
- 01-concept.md (2)
- D-41. Набор функций по мотивам Craft
- client.ts
- accountDb (2)
- useWorkspace
- Контракты между частями системы
- 0001-storage-in-database.md
- 0009-notebook-mode-choice.md
- 0009-notebook-mode-choice.md (2)
- deriveKeys
- App.tsx
- accountDb (3)
- cn
- 0031-crdt-yjs.md (2)
- 04-editor.md
- package.json
- compilerOptions
- guest.ts
- 03-pencil.md
- web-editor/README.md
- shared.ts
- Скрипт обновления графа
- Контракт: REST API сервера (v1)
- open-questions.md (3)
- 06-data-server.md (2)
- Дизайн и организация
- Дизайн и организация (2)
- accountDb (4)
- compilerOptions (2)
- roadmap.md (2)
- Платформы и клиенты
- D-38. Дизайн-направление — «Тихая бумага», ориентир Craft
- План разработки
- 09-agents-api.md
- i18n/index.ts
- glossary.md
- Процесс разработки и Graphify
- main.tsx
- guest.ts (2)
- D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления
- changelog.d/README.md
- 4. Документ `note`
- D-39. Разработка параллельными сессиями; Claude сам вливает в main
- 08-sharing.md
- tasks
- iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium) (2)
- compilerOptions (3)
- accountDb (5)
- Процесс разработки и Graphify (2)
- 0031-crdt-yjs.md (3)
- D-21. Технологический стек
- D-36. Структура: пространство → блокноты → папки
- 0031-crdt-yjs.md (4)
- glossary.md (2)
- scripts
- Контракт: дизайн-токены «Тихая бумага» (v1)
- Контракт: протокол синхронизации (v1)
- D-32. Минимальная версия iOS/iPadOS — 26
- D-37. Гости по ссылке рисуют; ссылка живёт до отзыва
- 03-pencil.md (2)
- accountDb (6)
- StylePopover.tsx
- 08-sharing.md (2)
- open-questions.md (2)
- Соглашения
- 12. Функции по мотивам Craft
- App.tsx (2)
- cn (2)
- CalendarPage.tsx (3)
- Обзор архитектуры: разделы
- D-35. Пометка на удалённом тексте исчезает вместе с ним
- cn (3)
- D-40. Хостинг — позже; сервер готов к запуску одной командой
- Процесс разработки и Graphify (3)
- 0009-notebook-mode-choice.md (3)
- web-editor/index.ts
- accountDb (7)
- Дизайн и организация (3)
- design-tokens/README.md
- Новая группа
- dependencies (2)
- pnpm-workspace.yaml

## God Nodes (most connected - your core abstractions)
1. `useWorkspace` - 47 edges
2. `cn()` - 41 edges
3. `react` - 41 edges
4. `accountDb` - 39 edges
5. `react-i18next` - 31 edges
6. `DocScreen()` - 29 edges
7. `lucide-react` - 28 edges
8. `DocStore` - 26 edges
9. `runtime()` - 26 edges
10. `openTab()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)` --references--> `libsodium on all platforms`  [INFERRED]
  apps/ios/README.md → docs/spec/07-encryption.md
- `iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)` --implements--> `Local storage: SQLite via GRDB (iOS), IndexedDB via Dexie (web)`  [INFERRED]
  apps/ios/README.md → docs/spec/10-sync.md
- `Shared test vectors (input -> expected output) run in Swift and TypeScript` --shares_data_with--> `Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1)`  [INFERRED]
  packages/test-vectors/README.md → apps/server/README.md
- `Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1)` --implements--> `App server: Node.js + TypeScript (Fastify)`  [INFERRED]
  apps/server/README.md → docs/spec/06-data-server.md
- `Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1)` --implements--> `Remote MCP server (Streamable HTTP, OAuth 2.1)`  [INFERRED]
  apps/server/README.md → docs/spec/09-agents-api.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
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

## Communities (111 total, 7 thin omitted)

### Community 0 - "actions.ts"
Cohesion: 0.05
Nodes (95): dexie-react-hooks@^4.4.0, cachedNoteKey(), rememberNotebookKey(), rememberNoteKey(), enqueueOp(), acc(), belongsTo(), bootstrapAccount() (+87 more)

### Community 1 - "CalendarPage.tsx"
Cohesion: 0.12
Nodes (42): addTask(), dailyNotebookId(), deleteTask(), editTaskText(), findDaily(), findInbox(), getOrCreateInbox(), moveTask() (+34 more)

### Community 2 - "ShareDialog.tsx"
Cohesion: 0.10
Nodes (30): NetworkError, signOut(), setNotebookMode(), AccountSection(), ChangePasswordDialog(), submit(), DeleteAccountDialog(), submit() (+22 more)

### Community 3 - "web/package.json"
Cohesion: 0.06
Nodes (43): devDependencies, fake-indexeddb@^6.2.6, jsdom@^30.1.3, @playwright/test@1.63.0, tailwindcss@^4, @tailwindcss/vite@^4, @testing-library/dom@^10.4.2, @testing-library/react@^16.3.3 (+35 more)

### Community 4 - "GuestPage.tsx"
Cohesion: 0.11
Nodes (33): y-protocols@^1.0.7, Channel, channels, colorFor(), COLORS, joinPresence(), PresenceUser, runtime() (+25 more)

### Community 5 - "0031-crdt-yjs.md"
Cohesion: 0.08
Nodes (33): Automerge (fallback CRDT), Yrs (Rust Yjs) with Swift Wrapper, Custom pen renderer (Metal vs Core Animation TBD), End-to-end encryption, iOS client stack, Node.js + TypeScript server, Swift 6, SwiftUI (shell) (+25 more)

### Community 6 - "06-data-server.md"
Cohesion: 0.07
Nodes (32): Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), MinIO (rejected), D-25. Redis не используем, Edit broadcast interface (in-memory), PostgreSQL LISTEN/NOTIFY, Redis (rejected), Valkey (free Redis alternative), Будущее (+24 more)

### Community 7 - "overview.md"
Cohesion: 0.10
Nodes (32): agent_tokens / agent_audit_log Tables, doc_snapshots Table (compacted snapshots, version history), doc_updates Table (encrypted Yjs updates), Server PostgreSQL Schema (Stage 3 Draft), Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents (+24 more)

### Community 8 - "AppShell.tsx"
Cohesion: 0.14
Nodes (30): useIndexVersion, hasRuntime(), startRuntime(), getOrCreateDaily(), useWorkspace, CommandPalette(), Item(), PaletteBody() (+22 more)

### Community 9 - "session.ts"
Cohesion: 0.10
Nodes (31): dexie@^4, deviceId(), deviceKey(), openLocal(), SealedBlob, sealLocal(), AuthState, AuthStatus (+23 more)

### Community 10 - "dependencies"
Cohesion: 0.06
Nodes (34): dependencies, clsx@^2.1.1, cmdk@^1, i18next@^26, libsodium-wrappers-sumo@^0.8, lucide-react@^1.61.0, minisearch@^7, radix-ui@^1.4 (+26 more)

### Community 11 - "01-concept.md"
Cohesion: 0.07
Nodes (25): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, D-03. Платформы: нативные iPhone и iPad + полноценный веб, Full-featured web client (TypeScript), Контекст, Последствия, Решение (+17 more)

### Community 12 - "workspace.ts"
Cohesion: 0.14
Nodes (24): TaskRow, SearchHit, accountMaps(), AccountSnapshot, initAccountDoc(), readAccount(), NotebookSnapshot, readNotebook() (+16 more)

### Community 13 - "Editor.tsx"
Cohesion: 0.14
Nodes (28): DsDocument, DsLink, AgentEdit, atomBlock(), attr(), BlockIds, Callout, DrawingBlock (+20 more)

### Community 14 - "Компоненты стека"
Cohesion: 0.08
Nodes (27): Canvas + Pointer Events, Dexie (IndexedDB), Drizzle ORM, Fastify, GRDB (SQLite), MCP TypeScript SDK, OAuth 2.1, pg-boss job queue (+19 more)

### Community 15 - "contracts.ts"
Cohesion: 0.10
Nodes (27): accountApi, agentTokensApi, authApi, docsApi, noAuth, notebooksModeApi, opBodies, AgentAuditEntry (+19 more)

### Community 16 - "Процесс разработки (docs/development.md)"
Cohesion: 0.09
Nodes (19): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, Стартовый хук Claude Code (.claude/hooks/session-start.sh) (+11 more)

### Community 17 - "data-model.md"
Cohesion: 0.11
Nodes (24): Anchor (textRange / paragraph / drawingBlock / image), Note, Organization Hierarchy (Account > Space > Notebook > Folder > Note), Stroke, StrokePoint, Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК (+16 more)

### Community 18 - "stack.md"
Cohesion: 0.10
Nodes (26): Web PWA Client (React, TipTap, Yjs, IndexedDB), Astro (landing page), Dexie (IndexedDB), Drizzle ORM, Fastify, GRDB (SQLite), iPhone / iPad (`apps/ios`), TypeScript on Node.js (+18 more)

### Community 19 - "router.tsx"
Cohesion: 0.07
Nodes (26): allRoute, appLayout, authLayout, calendarRoute, docRoute, folderRoute, guestRoute, indexRoute (+18 more)

### Community 20 - "crypto.ts"
Cohesion: 0.19
Nodes (21): loginKeyFor(), signUp(), receivePresence(), fromBase64Url(), toBase64Url(), derivePasswordKeys(), enc, encodeRecoveryKey() (+13 more)

### Community 21 - "server.mjs"
Cohesion: 0.11
Nodes (15): authed(), b64u(), clients, cors, db, err(), issueSession(), newTokens() (+7 more)

### Community 22 - "10-sync.md"
Cohesion: 0.10
Nodes (19): D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение, Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps, Attachments as separate encrypted files, on-demand resumable download, Agent edits applied immediately, highlighted, revertible via history (D-10) (+11 more)

### Community 23 - "CalendarPage.tsx (2)"
Cohesion: 0.16
Nodes (18): appendTask(), cloneNode(), DEFAULT_STYLE, el(), Extracted, ExtractedTask, extractNote(), findTask() (+10 more)

### Community 24 - "iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)"
Cohesion: 0.10
Nodes (15): apps/ios — iPhone + iPad, iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), apps/server — сервер, Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст (+7 more)

### Community 25 - "accountDb"
Cohesion: 0.26
Nodes (4): accountDb, DocRow, DocStore, DocKind

### Community 26 - "roadmap.md"
Cohesion: 0.16
Nodes (21): Coordinator session, Nine parallel streams, Development roadmap, Stage 0 preparation (done), Stage 1 pen-in-text prototype on iPad, Stage 1 acceptance criteria (strokes stay anchored, 120fps, user check on iPad), Stage 2 local MVP, Stage 3 server, sync, encryption (+13 more)

### Community 27 - "SignupPage.tsx"
Cohesion: 0.26
Nodes (15): recoverAccount(), authErrorMessage(), LoginPage(), submit(), RecoverPage(), submit(), MIN_PASSWORD, RecoveryKeyStep() (+7 more)

### Community 28 - "GuestPage.tsx (2)"
Cohesion: 0.19
Nodes (9): GuestSession, GuestFrame(), GuestNote(), GuestNotebook(), GuestPage(), keyFromHash(), Loading(), useReady() (+1 more)

### Community 29 - "01-concept.md (2)"
Cohesion: 0.10
Nodes (17): D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст, Решение, 1. Концепция продукта, Notesnook (reference product: E2E encryption, reliable sync) (+9 more)

### Community 30 - "D-41. Набор функций по мотивам Craft"
Cohesion: 0.16
Nodes (17): D-41 Craft-inspired feature set, D-41. Набор функций по мотивам Craft, Контекст, Решение, Craft features MVP/post-MVP split, Block catalog (table, code, LaTeX, Mermaid, drawing, card), Calendar screen, Collections (table/gallery/kanban views) (+9 more)

### Community 31 - "client.ts"
Cohesion: 0.16
Nodes (15): api, ApiError, doFetch(), request(), RequestOptions, setTokenSource(), toError(), TokenSource (+7 more)

### Community 33 - "useWorkspace"
Cohesion: 0.25
Nodes (17): allTags(), notesInSpace(), spaceNotebooks(), visibleNotes(), AllDocsPage(), FolderChips(), FolderPage(), ListPage() (+9 more)

### Community 34 - "Контракты между частями системы"
Cohesion: 0.12
Nodes (14): Stub packages (shared, ui, design-tokens, web-editor), Temporary stubs, Contract change rules (versioned, coordinator-only), Контракты между частями системы, Правила изменения, 2026-10-25, 2026-10-25 (вторая половина дня), Nine parallel development streams (+6 more)

### Community 35 - "0001-storage-in-database.md"
Cohesion: 0.13
Nodes (13): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты, Решение (+5 more)

### Community 36 - "0009-notebook-mode-choice.md"
Cohesion: 0.16
Nodes (10): D-04. Одновременно сквозное шифрование и доступ по API, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), Контекст, Последствия, Решение, D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение (+2 more)

### Community 37 - "0009-notebook-mode-choice.md (2)"
Cohesion: 0.18
Nodes (15): Agent notebooks (server-held key, token-gated), API and MCP: tokens, permissions, audit log, Argon2id key derivation, External agents (Claude, ChatGPT), libsodium on all platforms, Email+password login, recovery key (D-34), Per-notebook key wrapped by master or server key, Private notebooks (end-to-end, password-derived key) (+7 more)

### Community 38 - "deriveKeys"
Cohesion: 0.19
Nodes (14): deviceName(), changePassword(), normalizeEmail(), signIn(), deriveKeys(), getWorker(), pending, Req (+6 more)

### Community 39 - "App.tsx"
Cohesion: 0.20
Nodes (11): App(), queryClient, router, onSignedOut(), restore(), useAuth, stopRuntime(), PwaPrompt() (+3 more)

### Community 40 - "accountDb (3)"
Cohesion: 0.17
Nodes (5): Indexer, snippetAround(), prefetchNotebookKeys(), onOpsChanged(), NoteKind

### Community 41 - "cn"
Cohesion: 0.25
Nodes (9): SyncIndicator(), cn(), TextArea, Prims, renderItems(), TaskCheckbox(), Tooltip(), useSyncStatus (+1 more)

### Community 42 - "0031-crdt-yjs.md (2)"
Cohesion: 0.14
Nodes (9): D-19. Весь код пишет Claude, Последствия, Решение, D-23. Документация — источник истины; Graphify — граф знаний поверх неё, docs/history session log, Контекст, Последствия, Решение (+1 more)

### Community 43 - "04-editor.md"
Cohesion: 0.15
Nodes (14): Obsidian (reference product: links, backlinks, tags, Markdown export), 4. Редактор, Backlinks, Export: Markdown, PDF, HTML (handwriting as images), iOS editor: UIKit + TextKit 2, Link graph view (not in MVP, stage 6), Web editor: TipTap (ProseMirror) + Yjs, [[ ]] links with autocomplete (+6 more)

### Community 44 - "package.json"
Cohesion: 0.14
Nodes (15): devDependencies, turbo@^2.3.0, typescript@^5.6.0, engines, node, typescript, name, packageManager (+7 more)

### Community 45 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+7 more)

### Community 46 - "guest.ts"
Cohesion: 0.17
Nodes (10): apiBase(), APP_VERSION, serverOrigin(), syncUrl(), BACKOFF, createSyncStatusStore(), OutgoingMessage, SyncState (+2 more)

### Community 47 - "03-pencil.md"
Cohesion: 0.16
Nodes (10): D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, Handwriting input types (text marks, margin notes, drawing block, drawing on images, Scribble), Pencil gestures (zigzag delete, underline, strike, lasso), Prototype open questions (multi-word circles, deleted marked text R-04), Stroke point anchoring: character anchor + dx/dy in font-size units, System Scribble only; no recognition of drawn ink (D-07) (+2 more)

### Community 48 - "web-editor/README.md"
Cohesion: 0.16
Nodes (12): apps/web index.html (PWA entry), Inline theme bootstrap script (ds.theme), Derived data indexer (tasks, noteIndex, MiniSearch), Mock server and e2e tests (Playwright), Offline-first device storage (Dexie/IndexedDB), Web sync engine (WebSocket, push queue, lastSeq), Web client (Vite + React + TS PWA), Derived local data (task index, search, backlinks, tags) (+4 more)

### Community 49 - "shared.ts"
Cohesion: 0.21
Nodes (11): notebooksApi, Listener, ORIGIN_LOAD, ORIGIN_REMOTE, SNAPSHOT_AFTER, notebookKey(), notebookKeys, noteKey() (+3 more)

### Community 50 - "Скрипт обновления графа"
Cohesion: 0.27
Nodes (6): finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 51 - "Контракт: REST API сервера (v1)"
Cohesion: 0.14
Nodes (13): Agent tokens endpoints, Chunked attachment endpoints, Client-generated UUIDv7 idempotent creation, Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1) (+5 more)

### Community 52 - "open-questions.md (3)"
Cohesion: 0.14
Nodes (13): GitHub Actions CI (incl. macOS iOS builds), XcodeGen, docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, D-28. Процесс разработки: облако + Mac, сборка iOS в CI, iOS build and tests on macOS CI runner per push (+5 more)

### Community 53 - "06-data-server.md (2)"
Cohesion: 0.19
Nodes (10): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, PostgreSQL, Контекст (+2 more)

### Community 54 - "Дизайн и организация"
Cohesion: 0.16
Nodes (11): D-15. Дизайн — основная концепция продукта, Design references: Things 3, Linear, Craft, Arc, Последствия, Решение, D-15 Design is main principle, Minimal buttons; command palette Cmd-K, Nested tags and smart tags, Own design system shared iOS/web (+3 more)

### Community 55 - "Дизайн и организация (2)"
Cohesion: 0.17
Nodes (12): Guest share route /s/:shareId#k=key, Notebooks and docs endpoints, Shares endpoints (guest token), Agent mode (server KMS key wraps notebookKey), Share link key in URL fragment, account document structure, Three Yjs doc kinds (account, notebook, note), notebook index document (folders, NoteMeta, tags) (+4 more)

### Community 57 - "compilerOptions (2)"
Cohesion: 0.15
Nodes (12): compilerOptions, baseUrl, declaration, jsx, lib, noEmit, paths, sourceMap (+4 more)

### Community 58 - "roadmap.md (2)"
Cohesion: 0.21
Nodes (11): Color tokens (light/dark, ink, tints, backdrops), Block schema with blockId, note document (content, meta, strokes, comments), TipTap / y-prosemirror compatibility, Live stroke anchoring to text (Yjs relative positions), Point packing (8 x Float32 LE), Stroke object (immutable Y.Map), Shared pressure-to-width curve f(p) (+3 more)

### Community 59 - "Платформы и клиенты"
Cohesion: 0.15
Nodes (11): D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, Daily off-VPS backups of DB and files with verified restore (R-11), 11. Нефункциональные требования, Accessibility: Dynamic Type, VoiceOver, light/dark, iPad keyboard, Reliability: no edit lost on network drop, crash or low storage, Доступность (+3 more)

### Community 60 - "D-38. Дизайн-направление — «Тихая бумага», ориентир Craft"
Cohesion: 0.18
Nodes (11): Craft as visual reference, D-38 Design direction Quiet Paper, D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Design tokens contract (design-tokens.md), Quiet Paper design direction, Рассмотренные варианты, Решение, Organization and design spec (+3 more)

### Community 61 - "План разработки"
Cohesion: 0.15
Nodes (13): Критерии приёмки, План разработки, Подготовка, Потоки разработки (D-39), Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad) (+5 more)

### Community 62 - "09-agents-api.md"
Cohesion: 0.21
Nodes (10): 9. API и внешние ИИ-агенты, MCP tools sketch (list_spaces, list_notebooks, search_notes, read_note, get_handwriting_image, create_note, edit_note, add_comment, get_backlinks), Request rate limits, Remote MCP server (Streamable HTTP, OAuth 2.1), REST API, Агент умеет, Безопасность, Набросок инструментов MCP (ПРЕДЛОЖЕНО) (+2 more)

### Community 63 - "i18n/index.ts"
Cohesion: 0.27
Nodes (7): en, Loose, keys(), Lang, setLang(), Messages, ru

### Community 64 - "glossary.md"
Cohesion: 0.17
Nodes (9): VPS Hosting (Hetzner or similar), Canvas + Pointer Events Pen Layer, Universal Links, R-04 Strokes on Deleted or Changed Text, R-07 Web Pen Worse than Native, R-08 Huge Project Scope, R-11 Single VPS Is a Single Point of Failure, R-12 No Paid Apple Account (7-day installs) (+1 more)

### Community 65 - "Процесс разработки и Graphify"
Cohesion: 0.23
Nodes (11): Changelog fragments in docs/changelog.d, Development process, Rules for executor sessions (D-39), Doc graph update: prepare -> agents -> finish, Graphify git hook skips documents, Graphify structural layer + semantic layer, GitHub Actions macOS CI checks iOS code, End-of-session history record (+3 more)

### Community 66 - "main.tsx"
Cohesion: 0.18
Nodes (8): @fontsource-variable/inter@^5.3.0, @fontsource-variable/jetbrains-mono@^5.3.0, @fontsource-variable/newsreader@^5.3.0, react-dom@^19, @fontsource-variable/inter, @fontsource-variable/jetbrains-mono, @fontsource-variable/newsreader, react-dom

### Community 68 - "D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления"
Cohesion: 0.25
Nodes (9): Auth endpoints (prelogin, signup, login, recovery), Argon2id KDF producing loginKey and passwordKey, Key hierarchy (password, master, notebook, note keys), Recovery key (DS1- Crockford Base32), D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления, Recovery key mechanism, Контекст, Рассмотренные варианты (+1 more)

### Community 69 - "changelog.d/README.md"
Cohesion: 0.20
Nodes (8): Ciphertext envelope (XChaCha20-Poly1305 with AD binding), Deleted text hides stroke, not deletes it (D-35), Awareness (encrypted presence, not stored), Server-assigned seq over encrypted updates, Snapshots and compaction (R-05), WebSocket client/server messages (hello, subscribe, push, ack), Executor sessions write fragments, coordinator merges, Фрагменты журнала изменений

### Community 70 - "4. Документ `note`"
Cohesion: 0.18
Nodes (11): 1. Три вида документов Yjs, 2. Документ `account`, 3. Документ `notebook` (индекс блокнота), 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note` (+3 more)

### Community 71 - "D-39. Разработка параллельными сессиями; Claude сам вливает в main"
Cohesion: 0.29
Nodes (10): Contracts between streams (docs/architecture/contracts), Coordinator session merges when CI green, D-39 Parallel sessions; coordinator merges to main, D-39. Разработка параллельными сессиями; Claude сам вливает в main, Public repository for free macOS CI, Workstreams with ownership zones (branch claude/<stream>), XcodeGen accepted (D-28), Контекст (+2 more)

### Community 72 - "08-sharing.md"
Cohesion: 0.20
Nodes (10): Encryption and agent access spec, 8. Совместная работа и шеринг, Guests edit without an account, Encryption key in URL fragment after #, Realtime collaboration, cursors, presence, Share link: view/edit, expiry, revoke, Universal Links with apple-app-site-association, Гости (D-37) (+2 more)

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
Cohesion: 0.20
Nodes (10): Monorepo Structure (apps/, packages/, infra/), packages/test-vectors, Graphify, Автоматизация, Команды, Обновление графа после правки документов (по шагам), Почему два способа обновления, Установка на Mac (один раз) (+2 more)

### Community 78 - "0031-crdt-yjs.md (3)"
Cohesion: 0.24
Nodes (6): D-05. Перо при перекладке текста — вариант А «живой штрих», PencilKit (rejected), Гипотеза реализации, Контекст, Последствия, Решение

### Community 79 - "D-21. Технологический стек"
Cohesion: 0.18
Nodes (10): D-21. Технологический стек, Контекст, Последствия, Рассмотренные варианты (по обсуждению 2026-10-25), Решение, D-22. Без собственного общего ядра на Rust, Контекст, Последствия (+2 more)

### Community 80 - "D-36. Структура: пространство → блокноты → папки"
Cohesion: 0.29
Nodes (9): Tags, smart tags, favorites, recents, D-36 Space > Notebooks > Folders, D-36. Структура: пространство → блокноты → папки, Document model contract (document-model.md), Nested folders (unlimited depth), Notebook (unit of encryption mode and sharing), Space (Personal, Work, Study), Рассмотренные варианты (+1 more)

### Community 81 - "0031-crdt-yjs.md (4)"
Cohesion: 0.22
Nodes (9): ADR log index (D-01..D-41), D-04 Encryption and API simultaneously: two notebook modes, D-22 No Rust core; Yjs/Yrs + libsodium + test vectors, D-25 No Redis, D-30 PostgreSQL server DB, D-31 CRDT Yjs/Yrs, D-32 Minimum iOS 26, Decision statuses RESOLVED/PROPOSED/OPEN/REPLACED (+1 more)

### Community 82 - "glossary.md (2)"
Cohesion: 0.20
Nodes (9): D-18 Monetization OPEN, D-24 Product name OPEN, Open questions register, Handwriting format for agents PNG, Final product name, Live stroke details: multi-word circles, cross-line arrows, MCP toolset, Monetization (+1 more)

### Community 83 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, e2e, lint, mock-server, preview, test (+1 more)

### Community 84 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.22
Nodes (8): Motion and haptics tokens, packages/design-tokens/tokens.json source, Typography tokens (Newsreader, Inter, New York, SF), Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 85 - "Контракт: протокол синхронизации (v1)"
Cohesion: 0.22
Nodes (9): 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05), 6. Права, 7. Коды ошибок, 8. Тестовые векторы (+1 more)

### Community 86 - "D-32. Минимальная версия iOS/iPadOS — 26"
Cohesion: 0.25
Nodes (7): Decisions D-32..D-41 from user questionnaires, D-32. Минимальная версия iOS/iPadOS — 26, Последствия, Рассмотренные варианты, Решение, D-33. Bundle ID — com.datascratch.app, Решение

### Community 87 - "D-37. Гости по ссылке рисуют; ссылка живёт до отзыва"
Cohesion: 0.28
Nodes (8): D-37 Guests draw; links live until revoked, D-37. Гости по ссылке рисуют; ссылка живёт до отзыва, Guests with edit link can write and draw, Link valid until revoked, optional expiry, Решение, Guests write and draw; link until revoked (D-37), Collaboration and sharing spec, Shared with me (stage 4)

### Community 88 - "03-pencil.md (2)"
Cohesion: 0.22
Nodes (9): 3. Apple Pencil в тексте — ключевая фича, Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера, Перекладка текста — вариант А «живой штрих» (D-05, РЕШЕНО) (+1 more)

### Community 90 - "StylePopover.tsx"
Cohesion: 0.43
Nodes (7): setNoteMeta(), Row(), StylePopover(), backdropCss(), NoteStyle, IconButton, SegmentedControl()

### Community 91 - "08-sharing.md (2)"
Cohesion: 0.32
Nodes (6): D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account, Real-time collaborative editing, Universal Links (paid Apple Developer account), Последствия, Решение

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
Cohesion: 0.48
Nodes (5): motion@^12, AuthLayout(), Logo(), Splash(), motion

### Community 96 - "cn (2)"
Cohesion: 0.52
Nodes (5): ConfirmHost(), Req, useConfirm, Dialog(), DialogActions()

### Community 97 - "CalendarPage.tsx (3)"
Cohesion: 0.29
Nodes (7): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4. Привязка к тексту (живой штрих), 5. Отрисовка толщины, 6. Тестовые векторы, Контракт: рукописные штрихи (v1)

### Community 98 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 99 - "D-35. Пометка на удалённом тексте исчезает вместе с ним"
Cohesion: 0.33
Nodes (6): D-35 Stroke vanishes with deleted text, D-35. Пометка на удалённом тексте исчезает вместе с ним, Strokes hidden when anchors deleted (compaction cleans later), Strokes contract (strokes.md), Рассмотренные варианты, Решение

### Community 100 - "cn (3)"
Cohesion: 0.33
Nodes (5): ButtonProps, Size, sizes, Variant, variants

### Community 101 - "D-40. Хостинг — позже; сервер готов к запуску одной командой"
Cohesion: 0.40
Nodes (5): D-40 Hosting later; one-command launch, D-40. Хостинг — позже; сервер готов к запуску одной командой, docker compose up deployment + infra/README.md, Решение, Hosting and domain

### Community 102 - "Процесс разработки и Graphify (3)"
Cohesion: 0.33
Nodes (6): Git, Две среды, Конец сессии, Кто что делает, Правила для сессий-исполнителей (D-39), Процесс разработки

### Community 103 - "0009-notebook-mode-choice.md (3)"
Cohesion: 0.33
Nodes (6): 7. Шифрование и доступ агентов, Вход и восстановление доступа (D-34), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 104 - "web-editor/index.ts"
Cohesion: 0.40
Nodes (3): @tiptap/react@^3, NoteEditorProps, @tiptap/react

### Community 106 - "Дизайн и организация (3)"
Cohesion: 0.40
Nodes (5): 5. Организация заметок и дизайн, Дизайн (D-15 — РЕШЕНО, главный принцип продукта), Организация (D-14 — РЕШЕНО по сути; структура ниже — ПРЕДЛОЖЕНО), Принципы, Реализация

### Community 107 - "design-tokens/README.md"
Cohesion: 0.50
Nodes (4): Design tokens single source for both platforms, packages/design-tokens: Quiet Paper tokens.json + CSS/Swift generators, packages/design-tokens — дизайн-токены «Тихая бумага», tokens.json source of values

### Community 108 - "Новая группа"
Cohesion: 0.83
Nodes (4): Web favicon (SVG), Blue ink stroke logo mark on warm paper (#2E5BDB on #FAF8F4), PWA icon 192x192, PWA icon 512x512

## Ambiguous Edges - Review These
- `0008-pdf-annotations.md` → `Block schema with blockId`  [AMBIGUOUS]
  docs/architecture/contracts/document-model.md · relation: conceptually_related_to

## Knowledge Gaps
- **102 isolated node(s):** `../../tsconfig.base.json`, `../../tsconfig.base.json`, `Astro (landing page)`, `Drizzle ORM`, `Fastify` (+97 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 596 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `AppShell.tsx` to `actions.ts`, `CalendarPage.tsx`, `useWorkspace`, `web/package.json`, `GuestPage.tsx`, `ShareDialog.tsx`, `main.tsx`, `App.tsx`, `cn (3)`, `cn (2)`, `dependencies`, `cn`, `Editor.tsx`, `SignupPage.tsx`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `../../tsconfig.base.json`, `../../tsconfig.base.json`, `Astro (landing page)` to the rest of the system?**
  _102 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.051833122629582805 - nodes in this community are weakly interconnected._
- **Why does `ws` connect `web/package.json` to `server.mjs`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Should `CalendarPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12019566736547868 - nodes in this community are weakly interconnected._
- **Why does `yjs` connect `workspace.ts` to `actions.ts`, `guest.ts (2)`, `web/package.json`, `GuestPage.tsx`, `dependencies`, `Editor.tsx`, `shared.ts`, `CalendarPage.tsx (2)`, `StylePopover.tsx`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `0008-pdf-annotations.md` and `Block schema with blockId`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._