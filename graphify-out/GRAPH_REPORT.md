# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 154 files · ~56,962 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 6, .example 2, .dockerignore 1)

## Summary
- 1691 nodes · 3048 edges · 137 communities (120 shown, 17 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 201 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d16e9d75`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- sync.test.ts
- context.ts
- 0003-platforms.md
- server
- auth.ts
- with
- attachments.ts
- loader.ts
- DiskStorage
- agents-data.ts
- SyncConnection
- 0013-collaboration-sharing.md
- devDependencies
- dependencies
- MCP + REST API
- risks.md
- notebooks.ts
- host.ts (2)
- decisions/README.md
- Новая группа
- Контракт: шифрование (v1)
- stack.md
- Datascratch Server (apps/server)
- D-29. Graphify: порядок работы, чтобы граф был всегда актуален
- 0004-encryption-and-api.md
- 11-nfr.md
- SyncConnection (2)
- PgAgentsStore
- overview.md
- 0031-crdt-yjs.md
- package.json
- compilerOptions
- Monorepo layout (apps/ios, apps/web, apps/server, packages, infra)
- D-36. Структура: пространство → блокноты → папки
- 0018-monetization.md
- 0025-no-redis.md
- D-32. Минимальная версия iOS/iPadOS — 26
- 10-sync.md
- Скрипт обновления графа
- Datascratch — правила для ИИ
- 0026-file-storage.md
- server/package.json
- Новая группа (3)
- AgentsStore
- Shared test vectors (packages/test-vectors)
- 0025-no-redis.md (2)
- План разработки
- compilerOptions (2)
- Контракт: шифрование (v1) (2)
- Дизайн и организация
- 04-editor.md
- 06-data-server.md
- Контракт: шифрование (v1) (3)
- 0001-storage-in-database.md
- 0016-no-import-now.md
- 0007-no-handwriting-recognition.md
- D-38. Дизайн-направление — «Тихая бумага», ориентир Craft
- smoke-test.sh script
- tasks
- compilerOptions (3)
- Контракт: REST API сервера (v1)
- Новая группа (4)
- TokenSigner
- Decision log table D-01..D-41 (one file per decision, template 0000)
- 12. Функции по мотивам Craft
- agents/README.md
- scripts
- Дизайн и организация (2)
- decisions/README.md (2)
- Web client stack (PWA)
- main
- 3. Apple Pencil в тексте — ключевая фича
- Новая группа (5)
- Monorepo layout (apps/ios, apps/web, apps/server, packages, infra) (2)
- Контракт: рукописные штрихи (v1)
- Технологический стек — РЕШЕНО (2026-10-25)
- 0011-handwriting-for-agents.md
- 09-agents-api.md
- open-questions.md (2)
- Соглашения
- web-editor/README.md
- Datascratch — правила для ИИ (2)
- Новая группа (6)
- Новая группа (7)
- data-model.md
- agents-store.ts
- 0028-dev-workflow.md
- 0005-living-stroke.md
- 0010-agent-edits.md
- agents-context.ts
- iOS client stack
- Monorepo layout (apps/ios, apps/web, apps/server, packages, infra) (3)
- Новая группа (8)
- Контракты между частями системы
- Encryption contract (v1)
- 7. Шифрование и доступ агентов
- 0004-encryption-and-api.md (2)
- 9. API и внешние ИИ-агенты
- @eslint/js
- 0034-auth-email-password.md
- 0014-organization.md
- D-01. Хранение заметок — в базе данных на своём сервере, не в файлах
- PostgreSQL
- 2026-10-25
- 2026-10-25 (2)
- D-30. База данных сервера — PostgreSQL
- design-tokens/README.md
- 4. Редактор
- ./plugin-api
- 2026-10-25 (3)
- 0004-encryption-and-api.md (3)
- Infrastructure stack
- D-30. База данных сервера — PostgreSQL (2)
- Определение «готово» для любого изменения
- 10. Синхронизация и офлайн
- 0037-guest-links.md
- 6. Модель данных и сервер
- 0008-pdf-annotations.md
- main (2)
- decisions/README.md (3)
- pnpm-workspace.yaml
- Процесс разработки (docs/development.md)
- Процесс разработки (docs/development.md) (2)
- roadmap.md
- overview.md (2)
- MCP + REST API (2)
- 02-platforms.md
- Дизайн и организация (3)
- 03-pencil.md
- 06-data-server.md (3)
- D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO
- 5. Организация заметок и дизайн
- 0033-bundle-id.md
- 8. Совместная работа и шеринг
- OAuthToken

## God Nodes (most connected - your core abstractions)
1. `AppContext` - 29 edges
2. `SyncConnection` - 26 edges
3. `authRoutes()` - 22 edges
4. `drizzle-orm` - 21 edges
5. `PgAgentsStore` - 20 edges
6. `notFound()` - 19 edges
7. `AgentsStore` - 18 edges
8. `startServer()` - 17 edges
9. `PgAgentDataSource` - 16 edges
10. `DbOrTx` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Self-hosting via one docker compose up: server + PostgreSQL (2 cores, 2-4 GB VPS)` --semantically_similar_to--> `docker-compose.yml: server + PostgreSQL containers, file volume or external S3`  [INFERRED] [semantically similar]
  docs/spec/06-data-server.md → infra/README.md
- `Daily off-VPS backups of DB and files with verified restore (R-11)` --semantically_similar_to--> `backup.sh / restore.sh: nightly cron backups, 14-day retention, off-server copy via rclone (Storage Box)`  [INFERRED] [semantically similar]
  docs/spec/06-data-server.md → infra/README.md
- `Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md` --semantically_similar_to--> `Session end: docs/history record + roadmap/open-questions updates`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/development.md
- `Design tokens as single source for both platforms` --implements--> `tokens.json 'Quiet Paper' tokens with CSS variable and Swift generators`  [INFERRED]
  docs/spec/05-organization-design.md → packages/design-tokens/README.md
- `AgentScope` --shares_data_with--> `Snapshots and compaction (500 updates / 1 MB)`  [INFERRED]
  apps/server/README.md → docs/architecture/contracts/sync-protocol.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Contracts verified by shared test vectors** — docs_decisions_0022_no_rust_core_shared_test_vectors, docs_architecture_contracts_crypto_crypto_contract, docs_architecture_contracts_strokes_stroke_contract, docs_architecture_contracts_sync_protocol_sync_protocol, docs_architecture_contracts_document_model_document_model [EXTRACTED 1.00]
- **iOS-Web Compatibility Without Shared Core** — docs_architecture_overview_no_shared_core, docs_architecture_stack_yrs, docs_architecture_stack_yjs, docs_architecture_stack_libsodium, docs_architecture_overview_test_vectors_package [EXTRACTED 1.00]
- **Двухслойная модель графа Graphify и кто обновляет каждый слой** — docs_decisions_0029_graphify_workflow_structural_layer, docs_decisions_0029_graphify_workflow_semantic_layer, docs_decisions_0029_graphify_workflow_git_hook, docs_decisions_0029_graphify_workflow_graphify_docs_script, docs_development_two_layer_graph [EXTRACTED 1.00]
- **Key wrapping chain securing account/notebook/note documents** — docs_architecture_contracts_crypto_argon2id_kdf, docs_architecture_contracts_crypto_master_key, docs_architecture_contracts_crypto_notebook_key, docs_architecture_contracts_crypto_note_key, docs_architecture_contracts_crypto_recovery_key, docs_architecture_contracts_crypto_agent_mode_server_key [EXTRACTED 1.00]
- **Nine parallel development streams coordinated by contracts** — docs_roadmap_stream_core, docs_roadmap_stream_design_system, docs_roadmap_stream_server, docs_roadmap_stream_agents, docs_roadmap_stream_web_app, docs_roadmap_stream_web_editor, docs_roadmap_stream_ios_core, docs_roadmap_stream_ios_editor, docs_roadmap_stream_ios_app, docs_roadmap_coordinator, docs_decisions_0039_parallel_sessions_contracts_coordination [EXTRACTED 1.00]
- **Encryption key custody strategies** — docs_decisions_0004_encryption_and_api_private_notebook_mode, docs_decisions_0004_encryption_and_api_agent_notebook_mode, docs_decisions_0013_collaboration_sharing_key_in_url_fragment, docs_decisions_0004_encryption_and_api_local_mcp_bridge [INFERRED 0.75]
- **Rejected extra server services (lean two-container deployment)** — docs_decisions_0025_no_redis_redis, docs_decisions_0026_file_storage_minio, docs_decisions_0022_no_rust_core_shared_rust_core, docs_decisions_0030_server_database_postgresql_mysql [INFERRED 0.75]
- **Agent access to notes model** — docs_decisions_0004_encryption_and_api_agent_notebook_mode, docs_decisions_0009_notebook_mode_choice_notebook_mode_switch_reencryption, docs_decisions_0010_agent_edits_immediate_agent_edits, docs_decisions_0011_handwriting_for_agents_handwriting_png_render, docs_decisions_0004_encryption_and_api_local_mcp_bridge [INFERRED 0.85]
- **External agent access surface (MCP/REST, tokens, RLS, audit log, PNG ink)** — docs_spec_09_agents_api_remote_mcp_server, docs_spec_09_agents_api_rest_api, docs_spec_09_agents_api_thin_mcp_over_service_layer, docs_spec_09_agents_api_token_permissions_rls, docs_spec_09_agents_api_agent_action_log, docs_spec_09_agents_api_rate_limits, docs_spec_09_agents_api_handwriting_as_png, docs_spec_09_agents_api_mcp_tools_sketch [INFERRED 0.85]
- **Agent Notebook Edit Flow via MCP** — docs_architecture_overview_external_ai_agents, docs_architecture_overview_mcp_rest_api, docs_architecture_overview_edit_note_tool, docs_architecture_overview_auth_service, docs_architecture_overview_key_store, docs_glossary_row_level_security [INFERRED 0.85]
- **Agent notebook key protection chain** — docs_spec_07_encryption_agent_notebooks, docs_spec_07_encryption_server_key_separate_from_db, infra_readme_ds_kms_key, docs_spec_06_data_server_agent_rls_transactions, docs_spec_07_encryption_per_notebook_key_wrapping [INFERRED 0.85]
- **CRDT + E2E encrypted sync design** — docs_decisions_0031_crdt_yjs_yjs, docs_decisions_0031_crdt_yjs_yrs, docs_decisions_0031_crdt_yjs_client_side_merge, docs_decisions_0021_tech_stack_end_to_end_encryption, docs_decisions_0031_crdt_yjs_relativeposition_stroke_anchor [INFERRED 0.85]
- **Stroke lifecycle on deleted text (hide, undo, compaction cleanup)** — docs_decisions_0035_strokes_on_deleted_text_d35, docs_architecture_contracts_strokes_deleted_anchor_rule, docs_architecture_contracts_strokes_live_stroke_anchoring, docs_architecture_contracts_sync_protocol_snapshots_compaction [INFERRED 0.85]
- **Handwriting anchored to CRDT text structure** — docs_decisions_0001_storage_in_database_crdt_structured_documents, docs_decisions_0005_living_stroke_living_stroke, docs_decisions_0005_living_stroke_stroke_point_anchor, docs_decisions_0005_living_stroke_textkit2_render_layer, docs_decisions_0010_agent_edits_immediate_agent_edits [INFERRED 0.85]
- **Living-stroke anchoring pipeline (strokes anchored to CRDT text positions)** — docs_spec_03_pencil_living_stroke, docs_spec_03_pencil_stroke_anchor_hypothesis, docs_spec_03_pencil_crdt_relative_position_anchors, docs_spec_03_pencil_yrs_in_prototype, docs_spec_06_data_server_handwriting_layer, docs_spec_06_data_server_crdt_block_tree [INFERRED 0.85]
- **Private Notebook Encrypted Sync Flow** — docs_architecture_overview_private_notebook_edit_flow, docs_architecture_overview_ios_client, docs_architecture_stack_yrs, docs_architecture_stack_grdb, docs_architecture_stack_libsodium, docs_architecture_overview_sync_realtime, docs_architecture_stack_postgresql [INFERRED 0.85]
- **Quiet Paper design system across tokens, web and iOS** — docs_decisions_0038_design_quiet_paper_quiet_paper_direction, packages_design_tokens_readme_tokens_json, packages_ui_readme_web_components, docs_roadmap_stream_design_system, docs_spec_05_organization_design_design_tokens [INFERRED 0.85]

## Communities (137 total, 17 thin omitted)

### Community 0 - "sync.test.ts"
Cohesion: 0.05
Nodes (47): pg@^8.23.1, base64urlKey, bool, ConfigSchema, loadConfig(), createContext(), AgentScope, createDatabase() (+39 more)

### Community 1 - "context.ts"
Cohesion: 0.10
Nodes (14): DbOrTx, docSnapshots, docUpdates, AppendInput, AppendResult, CatchUpItem, CatchUpPage, DocumentService (+6 more)

### Community 2 - "0003-platforms.md"
Cohesion: 0.05
Nodes (35): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, D-03. Платформы: нативные iPhone и iPad + полноценный веб, Full-featured web client (TypeScript), Контекст, Последствия, Решение (+27 more)

### Community 3 - "server"
Cohesion: 0.04
Nodes (46): context, dockerfile, depends_on, environment, image, ports, profiles, restart (+38 more)

### Community 4 - "auth.ts"
Cohesion: 0.13
Nodes (37): requireUser(), fromB64(), id(), randomToken(), sha256(), toB64(), uuidv7(), unauthorized() (+29 more)

### Community 5 - "with"
Cohesion: 0.05
Nodes (45): concurrency, cancel-in-progress, group, runs-on, steps, timeout-minutes, POSTGRES_DB, POSTGRES_PASSWORD (+37 more)

### Community 6 - "attachments.ts"
Cohesion: 0.11
Nodes (28): bearer(), deviceActive(), readCookie(), requireUserOrGuest(), verifyGuestToken(), verifyUserToken(), verifyWebCookie(), WEB_COOKIE (+20 more)

### Community 7 - "loader.ts"
Cohesion: 0.20
Nodes (8): BuildOptions, ServerUserAuth, AgentsModule, agentsPlugin(), createAgentsContext(), LoadedPlugin, loadPlugins(), fastify

### Community 8 - "DiskStorage"
Cohesion: 0.12
Nodes (6): DiskStorage, createStorage(), S3Options, S3Storage, BlobStorage, chunkKey()

### Community 9 - "agents-data.ts"
Cohesion: 0.10
Nodes (12): Tx, notebooks, AD, getSodium(), open(), seal(), Sodium, AgentDataSource (+4 more)

### Community 10 - "SyncConnection"
Cohesion: 0.23
Nodes (3): SyncConnection, SyncError, b64Size()

### Community 11 - "0013-collaboration-sharing.md"
Cohesion: 0.23
Nodes (8): D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account, Universal Links (paid Apple Developer account), Последствия, Решение, Guests with edit link can write and draw (pen, finger, mouse), Guest token lives as long as share link; revoking link disables guests; notebook share covers all notes, Share links to note or notebook with view/edit rights, expiry and revocation

### Community 12 - "devDependencies"
Cohesion: 0.10
Nodes (20): devDependencies, drizzle-kit@^0.31.11, eslint@^10.13.0, pino-pretty@^13.2.0, @types/libsodium-wrappers-sumo@^0.8.2, @types/node@^22.20.5, @types/pg@^8.23.1, @types/ws@^8.18.2 (+12 more)

### Community 13 - "dependencies"
Cohesion: 0.08
Nodes (24): dependencies, @aws-sdk/client-s3@^3.1156.0, drizzle-orm@^0.45.4, fastify@^5.12.7, @fastify/cors@^11.3.1, fastify-plugin@^6.0.1, @fastify/rate-limit@^11.2.1, @fastify/swagger@^9.9.2 (+16 more)

### Community 14 - "MCP + REST API"
Cohesion: 0.19
Nodes (16): Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, File Storage (disk or external S3), Guest via Link (web, no account), iOS / iPadOS Client (Swift, TextKit 2, Yrs, GRDB), Key Store (agent notebooks) (+8 more)

### Community 15 - "risks.md"
Cohesion: 0.12
Nodes (17): VPS Hosting (Hetzner or similar), Snapshot, Universal Links, Yjs history compaction under encryption (R-05), R-02 Forgotten Password Loses Private Notes, R-04 Strokes on Deleted or Changed Text, R-05 Edit History Growth, R-11 Single VPS Is a Single Point of Failure (+9 more)

### Community 16 - "notebooks.ts"
Cohesion: 0.15
Nodes (26): buildApp(), codeForStatus(), users, safeEqual(), ApiError, ApiErrorCode, badRequest(), conflict() (+18 more)

### Community 17 - "host.ts (2)"
Cohesion: 0.12
Nodes (18): agentPermission, attachmentChunks, attachments, bytea, devices, docKind, KdfParams, notebookMode (+10 more)

### Community 18 - "decisions/README.md"
Cohesion: 0.11
Nodes (13): D-19. Весь код пишет Claude, Последствия, Решение, D-23. Документация — источник истины; Graphify — граф знаний поверх неё, docs/history session log, Контекст, Последствия, Решение (+5 more)

### Community 19 - "Новая группа"
Cohesion: 0.18
Nodes (16): AgentScope, PostgreSQL via Drizzle, Agent token endpoints and audit, Notebook and document endpoints, Agent mode: notebookKey wrapped by serverKey (DS_KMS_KEY), Key hierarchy (password → masterKey → notebookKey → noteKey), masterKey, noteKey (+8 more)

### Community 20 - "Контракт: шифрование (v1)"
Cohesion: 0.20
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 21 - "stack.md"
Cohesion: 0.11
Nodes (22): Web PWA Client (React, TipTap, Yjs, IndexedDB), Astro (landing page), Dexie (IndexedDB), Drizzle ORM, Fastify, GRDB (SQLite), Custom iOS Pen Render Layer (Metal or Core Animation), TypeScript on Node.js (+14 more)

### Community 22 - "Datascratch Server (apps/server)"
Cohesion: 0.20
Nodes (11): AgentPrincipal, BlobStorage (disk / S3), Broadcaster (in-memory hub), Datascratch Server (apps/server), Fastify + zod (OpenAPI from code), pg-boss background jobs, PluginHost, Revocation closes WebSocket (code 4401) (+3 more)

### Community 23 - "D-29. Graphify: порядок работы, чтобы граф был всегда актуален"
Cohesion: 0.08
Nodes (24): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, Стартовый хук Claude Code (.claude/hooks/session-start.sh) (+16 more)

### Community 24 - "0004-encryption-and-api.md"
Cohesion: 0.21
Nodes (8): End-to-end encryption vs agent API access conflict, Local MCP bridge (future), D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, Trash encrypted in notebook index; client deletes after 30 days via DELETE /v1/docs/:id, Local MCP bridge (future): local utility holding key for agent access to private notebooks, Private notebooks: key from password, server stores only ciphertext, no agent access, Two notebook modes chosen at creation, switchable with client re-encryption (D-09)

### Community 25 - "11-nfr.md"
Cohesion: 0.15
Nodes (11): D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, UI languages Russian and English, no RTL (D-17), Light/dark theme, Dynamic Type, VoiceOver, full iPad keyboard, 11. Нефункциональные требования, Accessibility: Dynamic Type, VoiceOver, light/dark, iPad keyboard, Доступность (+3 more)

### Community 26 - "SyncConnection (2)"
Cohesion: 0.12
Nodes (18): Config, AppContext, Database, b64(), Pending, Subscription, SyncPrincipal, Broadcaster (+10 more)

### Community 27 - "PgAgentsStore"
Cohesion: 0.15
Nodes (6): AuditEntry, AuthorizationCode, OAuthClient, grantDto(), iso(), PgAgentsStore

### Community 28 - "overview.md"
Cohesion: 0.14
Nodes (19): Private Notebook Edit Flow, packages/test-vectors, libsodium (swift-sodium), ADR (Architecture Decision Record), End-to-End Encryption (E2E), Living Stroke, Predicted / Coalesced Touches, Private Notebook (+11 more)

### Community 29 - "0031-crdt-yjs.md"
Cohesion: 0.24
Nodes (13): Automerge (fallback CRDT), Yjs, Yrs (Rust Yjs) with Swift Wrapper, Pen prototype (stage 1), Automerge (fallback CRDT), Encrypted history compaction by clients (R-05, stage 3), Last-write-wins (unsuitable), Loro (too early) (+5 more)

### Community 30 - "package.json"
Cohesion: 0.14
Nodes (15): devDependencies, turbo@^2.3.0, typescript@^5.6.0, engines, node, typescript, name, packageManager (+7 more)

### Community 31 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+7 more)

### Community 32 - "Monorepo layout (apps/ios, apps/web, apps/server, packages, infra)"
Cohesion: 0.29
Nodes (5): Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), Stream core: packages/shared, test-vectors, crypto, stroke codec, sync client, packages/shared — общие TypeScript-типы и схемы, Shared TypeScript types and schemas (document, strokes, metadata, sync protocol, API), packages/test-vectors — общие тестовые векторы

### Community 33 - "D-36. Структура: пространство → блокноты → папки"
Cohesion: 0.22
Nodes (5): D-14. Организация: богатая, но не перегруженная, Решение, Space = notebook (rejected alternative), Top-level spaces (Personal, Work, Study), MVP blocks: headings, lists, callout, [[ ]] links, table, code, LaTeX, Mermaid, drawing, image/file, document card

### Community 34 - "0018-monetization.md"
Cohesion: 0.18
Nodes (10): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, Контекст, Решение (на сейчас) (+2 more)

### Community 35 - "0025-no-redis.md"
Cohesion: 0.22
Nodes (8): D-30. База данных сервера — PostgreSQL, MongoDB (rejected), MySQL (rejected), Row-Level Security for agent token permissions, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 36 - "D-32. Минимальная версия iOS/iPadOS — 26"
Cohesion: 0.18
Nodes (9): D-32. Минимальная версия iOS/iPadOS — 26, Последствия, Рассмотренные варианты, Решение, D-35. Пометка на удалённом тексте исчезает вместе с ним, Рассмотренные варианты, Решение, Closed questions: min iOS 26, XcodeGen, bundle ID, auth, guests, hosting later, stack, Redis/MinIO, PostgreSQL (+1 more)

### Community 37 - "10-sync.md"
Cohesion: 0.13
Nodes (13): Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps, Stroke point anchoring: character anchor + dx/dy in font-size units, Text as CRDT block tree (Yjs; Yrs on iOS), Attachments as separate encrypted files, on-demand resumable download, Agent capabilities: search/read Markdown, block-level edits, comments, links/tags/backlinks, Agent edits applied immediately, highlighted, revertible via history (D-10), Chunked resumable attachments; thumbnails-only on iPhone, Local storage: SQLite via GRDB (iOS), IndexedDB via Dexie (web) (+5 more)

### Community 38 - "Скрипт обновления графа"
Cohesion: 0.27
Nodes (6): finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 39 - "Datascratch — правила для ИИ"
Cohesion: 0.14
Nodes (15): Client-side derived data (task index, search, backlinks, tags), Document model contract (v1), formatVersion (read-only on newer), Cross-component contracts (iOS / web / server), Shared TS contract types (packages/shared/src/contracts), Datascratch Changelog, Monorepo skeleton (pnpm + Turborepo), Nine parallel development streams (+7 more)

### Community 40 - "0026-file-storage.md"
Cohesion: 0.36
Nodes (7): MinIO (rejected), Server disk folder storage (default), External S3-compatible storage (Hetzner, R2, B2), File storage interface (two implementations, chosen by config), Garage / SeaweedFS, MinIO (rejected), External S3 attachments (STORAGE_DRIVER=s3: Hetzner Object Storage, R2, B2)

### Community 41 - "server/package.json"
Cohesion: 0.13
Nodes (14): @fastify/websocket@^11.3.4, pg-boss@^12.38.0, tsx@^4.23.15, engines, node, files, main, name (+6 more)

### Community 42 - "Новая группа (3)"
Cohesion: 0.25
Nodes (8): Server access rights (user / guest / agent), Share endpoints and guest token, Client messages (hello, subscribe, push, snapshot, awareness), Offline queue with ack, seq (per-document ordering), Sync permissions (user / guest; agents via MCP), Sync protocol contract (v1), WebSocket transport /v1/sync

### Community 44 - "Shared test vectors (packages/test-vectors)"
Cohesion: 0.33
Nodes (5): Node.js + TypeScript server, Swift 6, TypeScript, Shared Rust core (rejected), Shared test vectors (packages/test-vectors)

### Community 45 - "0025-no-redis.md (2)"
Cohesion: 0.19
Nodes (11): D-25. Redis не используем, Edit broadcast interface (in-memory), PostgreSQL LISTEN/NOTIFY, Redis (rejected), Valkey (free Redis alternative), Будущее, Контекст, Последствия (+3 more)

### Community 46 - "План разработки"
Cohesion: 0.15
Nodes (13): Критерии приёмки, План разработки, Подготовка, Потоки разработки (D-39), Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad) (+5 more)

### Community 47 - "compilerOptions (2)"
Cohesion: 0.17
Nodes (11): compilerOptions, lib, module, moduleResolution, noEmit, outDir, rootDir, types (+3 more)

### Community 48 - "Контракт: шифрование (v1) (2)"
Cohesion: 0.17
Nodes (11): 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05), 6. Права, 7. Коды ошибок, 8. Тестовые векторы (+3 more)

### Community 49 - "Дизайн и организация"
Cohesion: 0.25
Nodes (6): D-15. Дизайн — основная концепция продукта, Design references: Things 3, Linear, Craft, Arc, Последствия, Решение, Own design system unified on iOS and web (typography, grid, colors, icons, motion, haptics), Design tokens as single source for both platforms

### Community 50 - "04-editor.md"
Cohesion: 0.21
Nodes (8): Obsidian (reference product: links, backlinks, tags, Markdown export), Backlinks, Editor content (headings, lists, tables, code, formulas, attachments, drawing blocks), iOS editor: UIKit + TextKit 2, Link graph view (not in MVP, stage 6), Web editor: TipTap (ProseMirror) + Yjs, [[ ]] links with autocomplete, Nested tags and smart tags (saved filters), colors and icons

### Community 51 - "06-data-server.md"
Cohesion: 0.25
Nodes (8): Агенты (D-30), Вход и сессии (D-34, `contracts/crypto.md`), Корзина, Реализация сервера (поток server, 2026-10-25), Синхронизация (`contracts/sync-protocol.md`), Снимки, уплотнение и история версий (R-05), Фоновые задачи (pg-boss), Шеринг и гости (D-13, D-37)

### Community 52 - "Контракт: шифрование (v1) (3)"
Cohesion: 0.18
Nodes (11): 1. Три вида документов Yjs, 2. Документ `account`, 3. Документ `notebook` (индекс блокнота), 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note` (+3 more)

### Community 53 - "0001-storage-in-database.md"
Cohesion: 0.25
Nodes (5): Markdown files option (rejected), Obsidian, Own server storage, Real-time collaborative editing, PostgreSQL

### Community 54 - "0016-no-import-now.md"
Cohesion: 0.20
Nodes (7): Notesnook, D-16. Импорт — не сейчас, Import from Obsidian/Notesnook (later), Решение, D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, No import for now (D-16), Current status: stack approved, next is stage 1 pencil prototype

### Community 55 - "0007-no-handwriting-recognition.md"
Cohesion: 0.24
Nodes (6): D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, Handwriting input types (text marks, margin notes, drawing block, drawing on images, Scribble), Pencil gestures (zigzag delete, underline, strike, lasso), System Scribble only; no recognition of drawn ink (D-07)

### Community 56 - "D-38. Дизайн-направление — «Тихая бумага», ориентир Craft"
Cohesion: 0.20
Nodes (8): D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Рассмотренные варианты, Решение, Collections: records with properties and table/gallery/kanban views (post-MVP), Daily notes and Calendar screen (day feed with tasks and daily note), Document beauty: cover, font/width/paper style, backdrop color or gradient, Post-MVP blocks: VisionKit scan, kanban, infinite board, Tasks: taskItem checkboxes in documents, scheduled date/deadline, Inbox, unified Tasks screen (Inbox/Today/Upcoming/All)

### Community 57 - "smoke-test.sh script"
Cohesion: 0.27
Nodes (7): backup.sh script, restore.sh script, json(), rnd(), smoke-test.sh script, uuid(), wait_health()

### Community 58 - "tasks"
Cohesion: 0.18
Nodes (10): dependsOn, outputs, $schema, tasks, build, lint, test, typecheck (+2 more)

### Community 59 - "compilerOptions (3)"
Cohesion: 0.20
Nodes (9): compilerOptions, declaration, noEmit, outDir, rootDir, sourceMap, extends, include (+1 more)

### Community 60 - "Контракт: REST API сервера (v1)"
Cohesion: 0.20
Nodes (9): Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1), Общее, Служебное, Токены агентов (`spec/09-agents-api.md`) (+1 more)

### Community 61 - "Новая группа (4)"
Cohesion: 0.28
Nodes (8): agentEdit mark, Block schema (ProseMirror nodes and marks), blockId on every block, Comment, Note document (content, meta, strokes, comments), Point packing (8 x Float32 LE), Stroke (immutable Y.Map), D-08 PDF pen annotations after MVP

### Community 62 - "TokenSigner"
Cohesion: 0.15
Nodes (6): jose@^6.2.13, AccessClaims, GuestClaims, subkey(), TokenSigner, jose

### Community 63 - "Decision log table D-01..D-41 (one file per decision, template 0000)"
Cohesion: 0.15
Nodes (10): D-36. Структура: пространство → блокноты → папки, Рассмотренные варианты, Решение, D-41. Набор функций по мотивам Craft, Контекст, Решение, Decision log table D-01..D-41 (one file per decision, template 0000), Craft features MVP / post-MVP split (D-41, before stage 2) (+2 more)

### Community 64 - "12. Функции по мотивам Craft"
Cohesion: 0.25
Nodes (8): 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft, Связь с моделью данных

### Community 65 - "agents/README.md"
Cohesion: 0.20
Nodes (9): Coordinator session: merges into main, owns roadmap, CHANGELOG, contracts, Stream agents: packages/agents (MCP, agent REST, tokens, PNG render), Stream ios-app: XcodeGen project, Craft-style SwiftUI shell, Stream ios-core: DSCore (crypto, Yrs model, GRDB, sync/API client), Stream ios-editor: DSEditor (TextKit 2 + Yrs + living stroke pen layer), Stream web-app: apps/web shell (sidebar, spaces, tasks, calendar, PWA), Stream web-editor: TipTap editor with all blocks, pen on Canvas, Nine parallel development streams (D-39) (+1 more)

### Community 66 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, db:generate, db:migrate, dev, lint, start, test (+1 more)

### Community 67 - "Дизайн и организация (2)"
Cohesion: 0.17
Nodes (11): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема), Craft as primary visual reference (gradient backdrops, doc cards, glass panels, context menus), Rejected: clean neutral (Linear/Things) and graphite dark-by-default, Warm graphite dark theme (+3 more)

### Community 68 - "decisions/README.md (2)"
Cohesion: 0.22
Nodes (8): Monorepo Structure (apps/, packages/, infra/), Graphify, Автоматизация, Команды, Обновление графа после правки документов (по шагам), Почему два способа обновления, Установка на Mac (один раз), Что где лежит

### Community 69 - "Web client stack (PWA)"
Cohesion: 0.20
Nodes (12): Dexie (IndexedDB), Drizzle ORM, Fastify, OAuth 2.1, pg-boss job queue, Radix + Tailwind + Motion, Server stack, TipTap editor (+4 more)

### Community 70 - "main"
Cohesion: 0.29
Nodes (6): MCP TypeScript SDK, D-39. Разработка параллельными сессиями; Claude сам вливает в main, Контекст, Последствия, Решение, Agents package: MCP server (Streamable HTTP, OAuth 2.1), agent REST, handwriting PNG render; server plugin

### Community 71 - "3. Apple Pencil в тексте — ключевая фича"
Cohesion: 0.22
Nodes (9): 3. Apple Pencil в тексте — ключевая фича, Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера, Перекладка текста — вариант А «живой штрих» (D-05, РЕШЕНО) (+1 more)

### Community 72 - "Новая группа (5)"
Cohesion: 0.14
Nodes (14): 1. Купить сервер, 2. Домен, 3. Подключиться и подготовить сервер, 4. Скачать проект, 5. Заполнить настройки, 6. Запустить, 7. Резервные копии каждую ночь, 8. Обновление сервера (+6 more)

### Community 73 - "Monorepo layout (apps/ios, apps/web, apps/server, packages, infra) (2)"
Cohesion: 0.20
Nodes (9): apps/ios — iPhone + iPad, iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), iPad client (primary, Pencil / Pencil Pro, hover, Stage Manager), iPhone client (primary, quick notes, finger drawing option D-06), iPhone and iPad share one codebase (universal app), Argon2id password key derivation, libsodium on all platforms (swift-sodium, libsodium-wrappers) (+1 more)

### Community 74 - "Контракт: рукописные штрихи (v1)"
Cohesion: 0.25
Nodes (7): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4. Привязка к тексту (живой штрих), 5. Отрисовка толщины, 6. Тестовые векторы, Контракт: рукописные штрихи (v1)

### Community 75 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 76 - "0011-handwriting-for-agents.md"
Cohesion: 0.25
Nodes (7): D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Handwriting format for agents: PNG (D-11), Export: Markdown, PDF, HTML (handwriting as images), App server: Node.js + TypeScript (Fastify), Server responsibilities: accounts, encrypted relay, attachments, realtime, API/MCP, handwriting PNG render, Handwriting rendered to PNG for agents with text annotation (D-11)

### Community 77 - "09-agents-api.md"
Cohesion: 0.22
Nodes (10): MCP toolset (proposed in spec/09-agents-api.md), Background jobs: doc-compact, cleanup (hourly), history-sweep (daily), pg-boss background job queue on PostgreSQL, PostgreSQL via Drizzle (D-30): accounts, notebooks, rights, tokens, encrypted updates, snapshots, agent log, Log of all agent actions, MCP tools sketch (list_spaces, list_notebooks, search_notes, read_note, get_handwriting_image, create_note, edit_note, add_comment, get_backlinks), Request rate limits, Remote MCP server (Streamable HTTP, OAuth 2.1) (+2 more)

### Community 78 - "open-questions.md (2)"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 79 - "Соглашения"
Cohesion: 0.12
Nodes (15): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория, Документация Datascratch (+7 more)

### Community 80 - "web-editor/README.md"
Cohesion: 0.29
Nodes (5): Контракт document-model.md, packages/web-editor — веб-редактор, Контракт strokes.md, TipTap, Yjs

### Community 81 - "Datascratch — правила для ИИ (2)"
Cohesion: 0.18
Nodes (9): apps/web — веб-клиент, Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой, Правила, Среда разработки (+1 more)

### Community 82 - "Новая группа (6)"
Cohesion: 0.28
Nodes (9): Auth endpoints (prelogin, signup, login, refresh, recovery), Client-generated UUIDv7 IDs with idempotent POST, API error format and codes, REST API contract (v1), Session (access 15 min + rotating refresh 30 days), Argon2id password KDF (loginKey + passwordKey), Recovery key (Crockford Base32, DS1-), Sync error codes and size limits (+1 more)

### Community 83 - "Новая группа (7)"
Cohesion: 0.38
Nodes (7): Deleted-anchor rendering rule, Stroke split across line fragments, Live stroke text anchoring (relative positions + em offsets), Handwritten strokes contract (v1), Stroke thickness pressure curve, Snapshots and compaction (500 updates / 1 MB), D-35 Annotation disappears with deleted text

### Community 84 - "data-model.md"
Cohesion: 0.29
Nodes (6): Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL) — реализовано (поток server, 2026-10-25), Штрих (черновик для прототипа), R-03 Data Format Cannot Change Cheaply

### Community 85 - "agents-store.ts"
Cohesion: 0.18
Nodes (9): Db, agentAudit, agentGrants, oauthClients, oauthCodes, oauthTokens, AgentGrant, date() (+1 more)

### Community 86 - "0028-dev-workflow.md"
Cohesion: 0.12
Nodes (14): GitHub Actions CI (incl. macOS iOS builds), XcodeGen, D-28. Процесс разработки: облако + Mac, сборка iOS в CI, Контекст, Последствия, Решение, Coordinator Claude merges branches into main when CI is green, Parallel work streams: one Claude Code session and claude/<stream> branch per directory ownership zone (+6 more)

### Community 87 - "0005-living-stroke.md"
Cohesion: 0.20
Nodes (7): D-05. Перо при перекладке текста — вариант А «живой штрих», PencilKit (rejected), Гипотеза реализации, Контекст, Последствия, Решение, Living stroke details: circles around several words, arrows across lines (stage 1)

### Community 88 - "0010-agent-edits.md"
Cohesion: 0.33
Nodes (5): D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение

### Community 89 - "agents-context.ts"
Cohesion: 0.18
Nodes (7): AgentEditOrigin, AgentNotebook, AgentsContext, LoadedDoc, Permission, UserAuth, RFC-7591

### Community 90 - "iOS client stack"
Cohesion: 0.20
Nodes (9): Custom pen renderer (Metal vs Core Animation TBD), End-to-end encryption, GRDB (SQLite), iOS client stack, SwiftUI (shell), UIKit + TextKit 2 (editor), libsodium, SQLite on server (rejected) (+1 more)

### Community 91 - "Monorepo layout (apps/ios, apps/web, apps/server, packages, infra) (3)"
Cohesion: 0.25
Nodes (6): apps/server — сервер Datascratch, Запуск для разработки, Плагины (интерфейс для `@datascratch/agents`), Устройство, Stream server: apps/server, infra (Fastify, PostgreSQL, sync, sharing, docker compose), Self-hosting via one docker compose up: server + PostgreSQL (2 cores, 2-4 GB VPS)

### Community 92 - "Новая группа (8)"
Cohesion: 0.33
Nodes (6): Color tokens (light/dark), Pen ink and highlighter tokens, Motion and haptics tokens, Design tokens «Тихая бумага» (v1), Spacing, radius, shadow tokens, Typography tokens

### Community 93 - "Контракты между частями системы"
Cohesion: 0.40
Nodes (5): Контракты между частями системы, Правила изменения, Streams coordinate via contracts (docs/architecture/contracts/); changed only by coordinator, Executor changelog fragments in docs/changelog.d/ instead of editing CHANGELOG.md, Rules for executor sessions (own branch/directories, no contract edits, merge main, green CI, report to coordinator)

### Community 94 - "Encryption contract (v1)"
Cohesion: 0.22
Nodes (8): Attachment chunk endpoints, Associated data strings (ds1|...), Attachment 1 MiB chunk encryption, Encryption contract (v1), Ciphertext envelope v1 (XChaCha20-Poly1305), libsodium (all platforms), infra: Docker, compose + Caddy, backups, Changelog fragment: initial server implementation

### Community 95 - "7. Шифрование и доступ агентов"
Cohesion: 0.33
Nodes (6): 7. Шифрование и доступ агентов, Вход и восстановление доступа (D-34), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 96 - "0004-encryption-and-api.md (2)"
Cohesion: 0.22
Nodes (7): D-40. Хостинг — позже; сервер готов к запуску одной командой, Решение, Server hosting and domain when VPS is bought (D-40), Per-notebook key wrapped by user master key or server key, Caddy optional container for automatic HTTPS (https profile), docker-compose.yml: server + PostgreSQL containers, file volume or external S3, Step-by-step VPS deployment on Hetzner (Ubuntu 24.04, CX22/CAX11, DNS A record, ufw)

### Community 97 - "9. API и внешние ИИ-агенты"
Cohesion: 0.33
Nodes (6): 9. API и внешние ИИ-агенты, Агент умеет, Безопасность, Набросок инструментов MCP (ПРЕДЛОЖЕНО), Правки агента (D-10), Реализация

### Community 98 - "@eslint/js"
Cohesion: 0.40
Nodes (4): @eslint/js@^10.0.1, typescript-eslint@^8.72.0, @eslint/js, typescript-eslint

### Community 99 - "0034-auth-email-password.md"
Cohesion: 0.25
Nodes (5): D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления, Контекст, Рассмотренные варианты, Решение, Login email + password; login and encryption keys derived on device; recovery key at signup (D-34, R-02)

### Community 100 - "0014-organization.md"
Cohesion: 0.40
Nodes (4): Data model (draft), Organization hierarchy (account → space → notebook → folder → note), Stroke / StrokePoint / Anchor draft, D-14 Organization: rich but not overloaded

### Community 101 - "D-01. Хранение заметок — в базе данных на своём сервере, не в файлах"
Cohesion: 0.40
Nodes (5): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 102 - "PostgreSQL"
Cohesion: 0.39
Nodes (7): Handwriting-to-PNG Render (pg-boss queue), docker compose Self-Hosting (server + PostgreSQL), pg-boss Job Queue, Scaling via PostgreSQL LISTEN/NOTIFY, PostgreSQL, Redis (rejected), WebSocket In-Process Broadcast

### Community 103 - "2026-10-25"
Cohesion: 0.40
Nodes (5): D-21. Технологический стек, Контекст, Последствия, Рассмотренные варианты (по обсуждению 2026-10-25), Решение

### Community 104 - "2026-10-25 (2)"
Cohesion: 0.40
Nodes (5): D-22. Без собственного общего ядра на Rust, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 105 - "D-30. База данных сервера — PostgreSQL"
Cohesion: 0.40
Nodes (5): D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS), Контекст, Последствия, Рассмотренные варианты, Решение

### Community 106 - "design-tokens/README.md"
Cohesion: 0.40
Nodes (3): Stream design-system: design-tokens, ui, DSDesign, packages/design-tokens — дизайн-токены «Тихая бумага», packages/ui — веб-компоненты дизайн-системы

### Community 107 - "4. Редактор"
Cohesion: 0.40
Nodes (5): 4. Редактор, Платформенная реализация, Прочее, Связи, Содержимое

### Community 108 - "./plugin-api"
Cohesion: 0.50
Nodes (4): exports, ./plugin-api, default, types

### Community 109 - "2026-10-25 (3)"
Cohesion: 0.50
Nodes (3): 2026-10-25, 2026-10-25 (вторая половина дня), Журнал изменений

### Community 110 - "0004-encryption-and-api.md (3)"
Cohesion: 0.50
Nodes (4): D-04. Одновременно сквозное шифрование и доступ по API, Контекст, Последствия, Решение

### Community 111 - "Infrastructure stack"
Cohesion: 0.50
Nodes (4): docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo

### Community 112 - "D-30. База данных сервера — PostgreSQL (2)"
Cohesion: 0.50
Nodes (4): D-27. В прототипе пера текст хранится в Yrs, Контекст, Последствия, Решение

### Community 114 - "10. Синхронизация и офлайн"
Cohesion: 0.50
Nodes (4): 10. Синхронизация и офлайн, Как это работает (обзор), Требования, Уплотнение истории — ОТКРЫТО до этапа 3 (R-05)

### Community 115 - "0037-guest-links.md"
Cohesion: 0.33
Nodes (4): D-37. Гости по ссылке рисуют; ссылка живёт до отзыва, Решение, Guest editing without account in any browser, Guests with edit rights write and draw; link valid until revoked (D-37)

### Community 116 - "6. Модель данных и сервер"
Cohesion: 0.33
Nodes (6): 6. Модель данных и сервер, Self-hosting, Модель данных (общий обзор; детали — `architecture/data-model.md`), Резервные копии, Сервер, Server resource budget: one VPS 2 cores, 2-4 GB; ~300-400 MB idle (D-12)

### Community 117 - "0008-pdf-annotations.md"
Cohesion: 0.40
Nodes (4): D-08. Аннотации PDF пером — не в MVP, Решение, R-08 Huge Project Scope, Stage 6: Extensions

### Community 132 - "D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO"
Cohesion: 0.40
Nodes (5): D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 133 - "5. Организация заметок и дизайн"
Cohesion: 0.40
Nodes (5): 5. Организация заметок и дизайн, Дизайн (D-15 — РЕШЕНО, главный принцип продукта), Организация (D-14 — РЕШЕНО по сути; структура ниже — ПРЕДЛОЖЕНО), Принципы, Реализация

### Community 134 - "0033-bundle-id.md"
Cohesion: 0.50
Nodes (3): D-33. Bundle ID — com.datascratch.app, Решение, Bundle ID com.datascratch.app (D-33), paid Apple Developer account

### Community 135 - "8. Совместная работа и шеринг"
Cohesion: 0.50
Nodes (4): 8. Совместная работа и шеринг, Гости (D-37), Реализация, Требования

## Knowledge Gaps
- **127 isolated node(s):** `RFC-7591`, `./tsconfig.json`, `../../tsconfig.base.json`, `D-14 Organization: rich but not overloaded`, `Share links to note or notebook with view/edit rights, expiry and revocation` (+122 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 701 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Shared test vectors (packages/test-vectors)` connect `Shared test vectors (packages/test-vectors)` to `Datascratch — правила для ИИ`, `Новая группа (3)`, `Новая группа (7)`, `0031-crdt-yjs.md`, `Encryption contract (v1)`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **What connects `RFC-7591`, `./tsconfig.json`, `../../tsconfig.base.json` to the rest of the system?**
  _127 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `sync.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0526195378631892 - nodes in this community are weakly interconnected._
- **Why does `Decision log table D-01..D-41 (one file per decision, template 0000)` connect `Decision log table D-01..D-41 (one file per decision, template 0000)` to `0004-encryption-and-api.md (2)`, `0018-monetization.md`, `0003-platforms.md`, `Web client stack (PWA)`, `main`, `0037-guest-links.md`, `D-38. Дизайн-направление — «Тихая бумага», ориентир Craft`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Should `context.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10052910052910052 - nodes in this community are weakly interconnected._
- **Why does `Sync protocol contract (v1)` connect `Новая группа (3)` to `Datascratch — правила для ИИ`, `Shared test vectors (packages/test-vectors)`, `Новая группа (6)`, `Новая группа (7)`, `Новая группа`, `Datascratch Server (apps/server)`, `Encryption contract (v1)`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Should `0003-platforms.md` be split into smaller, more focused modules?**
  _Cohesion score 0.05180388529139685 - nodes in this community are weakly interconnected._