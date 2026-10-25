# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 208 files · ~71,273 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 4, .css 2, .example 1)

## Summary
- 1977 nodes · 4902 edges · 110 communities (106 shown, 4 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 261 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `81c6ce52`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
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
Cohesion: 0.28
Nodes (13): NoteEntry, noteTitle(), useAttachmentUrl(), CardThumb(), DocCard(), DocCollection(), DocRow(), useOpen() (+5 more)

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
Cohesion: 0.40
Nodes (5): D-05. Перо при перекладке текста — вариант А «живой штрих», Гипотеза реализации, Контекст, Последствия, Решение

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

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

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