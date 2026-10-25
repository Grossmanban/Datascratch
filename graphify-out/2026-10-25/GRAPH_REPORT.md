# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 109 files · ~54,843 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1653 nodes · 2980 edges · 132 communities (113 shown, 19 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 204 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- sync.test.ts
- context.ts
- 0003-platforms.md
- server
- auth.ts
- with
- attachments.ts
- api.ts
- DiskStorage
- host.ts
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
- Новая группа (2)
- D-29. Graphify: порядок работы, чтобы граф был всегда актуален
- 0004-encryption-and-api.md
- 11-nfr.md
- SyncConnection (2)
- Datascratch — правила для ИИ (CLAUDE.md)
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
- glossary.md
- 0031-crdt-yjs.md (2)
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
- 0031-crdt-yjs.md (3)
- D-41. Набор функций по мотивам Craft
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
- Обзор архитектуры: разделы
- D-28. Процесс разработки: облако + Mac, сборка iOS в CI
- 0005-living-stroke.md
- 0010-agent-edits.md
- Платформы и клиенты (2)
- 06-data-server.md (2)
- Monorepo layout (apps/ios, apps/web, apps/server, packages, infra) (3)
- Новая группа (8)
- Контракты между частями системы
- Процесс разработки
- 7. Шифрование и доступ агентов
- 0004-encryption-and-api.md (2)
- 9. API и внешние ИИ-агенты
- @eslint/js
- Контракт: дизайн-токены «Тихая бумага» (v1)
- 0014-organization.md
- D-01. Хранение заметок — в базе данных на своём сервере, не в файлах
- 0005-living-stroke.md (2)
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
- @fastify/websocket
- @node-rs/argon2
- typescript@^5.6.0
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

## God Nodes (most connected - your core abstractions)
1. `AppContext` - 28 edges
2. `SyncConnection` - 26 edges
3. `notFound()` - 25 edges
4. `authRoutes()` - 22 edges
5. `drizzle-orm` - 21 edges
6. `DbOrTx` - 18 edges
7. `startServer()` - 17 edges
8. `fromB64()` - 15 edges
9. `id()` - 15 edges
10. `compilerOptions` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Self-hosting via one docker compose up: server + PostgreSQL (2 cores, 2-4 GB VPS)` --semantically_similar_to--> `docker-compose.yml: server + PostgreSQL containers, file volume or external S3`  [INFERRED] [semantically similar]
  docs/spec/06-data-server.md → infra/README.md
- `Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md` --semantically_similar_to--> `Session end: docs/history record + roadmap/open-questions updates`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/development.md
- `Daily off-VPS backups of DB and files with verified restore (R-11)` --semantically_similar_to--> `backup.sh / restore.sh: nightly cron backups, 14-day retention, off-server copy via rclone (Storage Box)`  [INFERRED] [semantically similar]
  docs/spec/06-data-server.md → infra/README.md
- `Правило: сначала graphify query/path/explain, потом чтение файлов` --references--> `Graphify 0.9.95 (пакет graphifyy)`  [INFERRED]
  CLAUDE.md → docs/decisions/0029-graphify-workflow.md
- `iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)` --implements--> `Local storage: SQLite via GRDB (iOS), IndexedDB via Dexie (web)`  [INFERRED]
  apps/ios/README.md → docs/spec/10-sync.md

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

## Communities (132 total, 19 thin omitted)

### Community 0 - "sync.test.ts"
Cohesion: 0.05
Nodes (49): pg@^8.23.1, base64urlKey, bool, ConfigSchema, loadConfig(), createContext(), createDatabase(), Db (+41 more)

### Community 1 - "context.ts"
Cohesion: 0.06
Nodes (23): Config, AppContext, Database, DbOrTx, agentAudit, docSnapshots, docUpdates, AuditEntry (+15 more)

### Community 2 - "0003-platforms.md"
Cohesion: 0.05
Nodes (35): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, D-03. Платформы: нативные iPhone и iPad + полноценный веб, Full-featured web client (TypeScript), Контекст, Последствия, Решение (+27 more)

### Community 3 - "server"
Cohesion: 0.04
Nodes (46): context, dockerfile, depends_on, environment, image, ports, profiles, restart (+38 more)

### Community 4 - "auth.ts"
Cohesion: 0.12
Nodes (39): users, b64(), fromB64(), id(), randomToken(), safeEqual(), sha256(), uuidv7() (+31 more)

### Community 5 - "with"
Cohesion: 0.05
Nodes (45): concurrency, cancel-in-progress, group, runs-on, steps, timeout-minutes, POSTGRES_DB, POSTGRES_PASSWORD (+37 more)

### Community 6 - "attachments.ts"
Cohesion: 0.12
Nodes (32): bearer(), requireUser(), requireUserOrGuest(), verifyGuestToken(), verifyUserToken(), docs, shares, ApiError (+24 more)

### Community 7 - "api.ts"
Cohesion: 0.06
Nodes (13): fastify@^5.12.7, AgentDoc, AgentHost, AgentNotebook, AgentPrincipal, AgentScope, PluginCrypto, PluginJobs (+5 more)

### Community 8 - "DiskStorage"
Cohesion: 0.08
Nodes (10): AccessClaims, GuestClaims, subkey(), TokenSigner, DiskStorage, createStorage(), S3Options, S3Storage (+2 more)

### Community 9 - "host.ts"
Cohesion: 0.14
Nodes (26): withAgentScope(), agentTokenNotebooks, agentTokens, notebooks, notFound(), AD, getSodium(), open() (+18 more)

### Community 10 - "SyncConnection"
Cohesion: 0.23
Nodes (3): SyncConnection, SyncError, b64Size()

### Community 11 - "0013-collaboration-sharing.md"
Cohesion: 0.11
Nodes (16): D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account, Universal Links (paid Apple Developer account), Последствия, Решение, D-37. Гости по ссылке рисуют; ссылка живёт до отзыва, Guests with edit link can write and draw (pen, finger, mouse), Решение (+8 more)

### Community 12 - "devDependencies"
Cohesion: 0.10
Nodes (20): devDependencies, drizzle-kit@^0.31.11, eslint@^10.13.0, pino-pretty@^13.2.0, tsx@^4.23.15, @types/libsodium-wrappers-sumo@^0.8.2, @types/node@^22.20.5, @types/pg@^8.23.1 (+12 more)

### Community 13 - "dependencies"
Cohesion: 0.10
Nodes (21): dependencies, @aws-sdk/client-s3@^3.1156.0, drizzle-orm@^0.45.4, @fastify/cors@^11.3.1, fastify-plugin@^6.0.1, @fastify/swagger@^9.9.2, @fastify/swagger-ui@^6.1.2, fastify-type-provider-zod@^7.0.0 (+13 more)

### Community 14 - "MCP + REST API"
Cohesion: 0.18
Nodes (17): Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, File Storage (disk or external S3), Guest via Link (web, no account), Handwriting-to-PNG Render (pg-boss queue), iOS / iPadOS Client (Swift, TextKit 2, Yrs, GRDB) (+9 more)

### Community 15 - "risks.md"
Cohesion: 0.11
Nodes (18): VPS Hosting (Hetzner or similar), Snapshot, Universal Links, Yjs history compaction under encryption (R-05), R-02 Forgotten Password Loses Private Notes, R-04 Strokes on Deleted or Changed Text, R-05 Edit History Growth, R-11 Single VPS Is a Single Point of Failure (+10 more)

### Community 16 - "notebooks.ts"
Cohesion: 0.15
Nodes (17): buildApp(), BuildOptions, codeForStatus(), CLEANUP_JOB, toB64(), ApiErrorCode, LoadedPlugin, DocKind (+9 more)

### Community 17 - "host.ts (2)"
Cohesion: 0.13
Nodes (17): agentPermission, attachmentChunks, attachments, bytea, devices, docKind, KdfParams, notebookMode (+9 more)

### Community 18 - "decisions/README.md"
Cohesion: 0.11
Nodes (13): D-19. Весь код пишет Claude, Последствия, Решение, D-23. Документация — источник истины; Graphify — граф знаний поверх неё, docs/history session log, Контекст, Последствия, Решение (+5 more)

### Community 19 - "Новая группа"
Cohesion: 0.15
Nodes (19): AgentScope, PostgreSQL via Drizzle, Agent token endpoints and audit, Notebook and document endpoints, Agent mode: notebookKey wrapped by serverKey (DS_KMS_KEY), Key hierarchy (password → masterKey → notebookKey → noteKey), masterKey, noteKey (+11 more)

### Community 20 - "Контракт: шифрование (v1)"
Cohesion: 0.11
Nodes (15): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+7 more)

### Community 21 - "stack.md"
Cohesion: 0.17
Nodes (16): Astro (landing page), Dexie (IndexedDB), docker compose Self-Hosting (server + PostgreSQL), Drizzle ORM, Fastify, GRDB (SQLite), TypeScript on Node.js, pg-boss Job Queue (+8 more)

### Community 22 - "Новая группа (2)"
Cohesion: 0.13
Nodes (17): AgentPrincipal, BlobStorage (disk / S3), Datascratch Server (apps/server), Fastify + zod (OpenAPI from code), pg-boss background jobs, PluginHost, Revocation closes WebSocket (code 4401), ServerPlugin interface (@datascratch/agents) (+9 more)

### Community 23 - "D-29. Graphify: порядок работы, чтобы граф был всегда актуален"
Cohesion: 0.14
Nodes (12): Стартовый хук Claude Code (.claude/hooks/session-start.sh), D-23 (документация), D-29. Graphify: порядок работы, чтобы граф был всегда актуален, git-хук Graphify (пересборка только по изменённому коду), Скрипт tools/graphify_docs.py (prepare → агенты → finish), Graphify 0.9.95 (пакет graphifyy), R-09 (риск: Graphify сломается или исчезнет), Смысловой слой графа (понятия, решения, связи — проход ИИ) (+4 more)

### Community 24 - "0004-encryption-and-api.md"
Cohesion: 0.20
Nodes (9): End-to-end encryption vs agent API access conflict, Local MCP bridge (future), D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, Trash encrypted in notebook index; client deletes after 30 days via DELETE /v1/docs/:id, Local MCP bridge (future): local utility holding key for agent access to private notebooks, Private notebooks: key from password, server stores only ciphertext, no agent access, Two notebook modes chosen at creation, switchable with client re-encryption (D-09) (+1 more)

### Community 25 - "11-nfr.md"
Cohesion: 0.11
Nodes (16): D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, UI languages Russian and English, no RTL (D-17), Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps, Light/dark theme, Dynamic Type, VoiceOver, full iPad keyboard, Self-hosting, 11. Нефункциональные требования (+8 more)

### Community 26 - "SyncConnection (2)"
Cohesion: 0.18
Nodes (12): Pending, Subscription, SyncPrincipal, HubListener, HubMessage, topics, ClientMessage, CloseCode (+4 more)

### Community 27 - "Datascratch — правила для ИИ (CLAUDE.md)"
Cohesion: 0.14
Nodes (12): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, Git: branches, PRs, one commit = code + docs + graph (+4 more)

### Community 28 - "overview.md"
Cohesion: 0.18
Nodes (14): Private Notebook Edit Flow, packages/test-vectors, libsodium (swift-sodium), ADR (Architecture Decision Record), End-to-End Encryption (E2E), Living Stroke, Private Notebook, Reflow (+6 more)

### Community 29 - "0031-crdt-yjs.md"
Cohesion: 0.18
Nodes (13): Dexie (IndexedDB), End-to-end encryption, TipTap editor, Vite + React + TypeScript PWA, Web client stack (PWA), Pen prototype (stage 1), Automerge (fallback CRDT), Encrypted history compaction by clients (R-05, stage 3) (+5 more)

### Community 30 - "package.json"
Cohesion: 0.14
Nodes (15): devDependencies, turbo@^2.3.0, typescript@^5.6.0, engines, node, typescript, name, packageManager (+7 more)

### Community 31 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+7 more)

### Community 32 - "Monorepo layout (apps/ios, apps/web, apps/server, packages, infra)"
Cohesion: 0.16
Nodes (9): apps/ios — iPhone + iPad, apps/web — веб-клиент, Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), Stream core: packages/shared, test-vectors, crypto, stroke codec, sync client, Own design system unified on iOS and web (typography, grid, colors, icons, motion, haptics), packages/shared — общие TypeScript-типы и схемы, Shared TypeScript types and schemas (document, strokes, metadata, sync protocol, API), packages/test-vectors — общие тестовые векторы (+1 more)

### Community 33 - "D-36. Структура: пространство → блокноты → папки"
Cohesion: 0.14
Nodes (10): D-14. Организация: богатая, но не перегруженная, Решение, D-36. Структура: пространство → блокноты → папки, Space = notebook (rejected alternative), Рассмотренные варианты, Решение, Nested folders without depth limit, Space -> notebook -> folder structure (D-36); encryption mode and sharing per notebook (+2 more)

### Community 34 - "0018-monetization.md"
Cohesion: 0.18
Nodes (10): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, Контекст, Решение (на сейчас) (+2 more)

### Community 35 - "0025-no-redis.md"
Cohesion: 0.15
Nodes (13): GRDB (SQLite), D-30. База данных сервера — PostgreSQL, MongoDB (rejected), MySQL (rejected), Row-Level Security for agent token permissions, SQLite on server (rejected), Контекст, Последствия (+5 more)

### Community 36 - "D-32. Минимальная версия iOS/iPadOS — 26"
Cohesion: 0.13
Nodes (12): D-32. Минимальная версия iOS/iPadOS — 26, Последствия, Рассмотренные варианты, Решение, D-33. Bundle ID — com.datascratch.app, Решение, D-35. Пометка на удалённом тексте исчезает вместе с ним, Рассмотренные варианты (+4 more)

### Community 37 - "10-sync.md"
Cohesion: 0.18
Nodes (9): Text as CRDT block tree (Yjs; Yrs on iOS), Attachments as separate encrypted files, on-demand resumable download, Agent edits applied immediately, highlighted, revertible via history (D-10), Chunked resumable attachments; thumbnails-only on iPhone, Local storage: SQLite via GRDB (iOS), IndexedDB via Dexie (web), Agent notebooks: server decrypts and applies agent edit as a normal update, Trash for 30 days, Version history: snapshots, view, rollback (+1 more)

### Community 38 - "Скрипт обновления графа"
Cohesion: 0.27
Nodes (6): finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 39 - "Datascratch — правила для ИИ"
Cohesion: 0.18
Nodes (12): Cross-component contracts (iOS / web / server), Shared TS contract types (packages/shared/src/contracts), Datascratch Changelog, Monorepo skeleton (pnpm + Turborepo), Nine parallel development streams, D-28 Dev workflow: cloud + Mac, iOS build in CI, iOS CI on GitHub Actions macOS runner, XcodeGen (project.yml) (+4 more)

### Community 40 - "0026-file-storage.md"
Cohesion: 0.20
Nodes (12): MinIO (rejected), D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Server disk folder storage (default), External S3-compatible storage (Hetzner, R2, B2), File storage interface (two implementations, chosen by config), Garage / SeaweedFS, MinIO (rejected), Контекст (+4 more)

### Community 41 - "server/package.json"
Cohesion: 0.15
Nodes (12): @fastify/rate-limit@^11.2.1, jose@^6.2.13, engines, node, files, main, name, private (+4 more)

### Community 42 - "Новая группа (3)"
Cohesion: 0.17
Nodes (12): Server access rights (user / guest / agent), Broadcaster (in-memory hub), API error format and codes, Share endpoints and guest token, Client messages (hello, subscribe, push, snapshot, awareness), Sync error codes and size limits, Offline queue with ack, seq (per-document ordering) (+4 more)

### Community 43 - "glossary.md"
Cohesion: 0.17
Nodes (13): Custom iOS Pen Render Layer (Metal or Core Animation), TextKit 2 (UIKit editor), Canvas + Pointer Events Pen Layer, PencilKit / PKCanvasView, Predicted / Coalesced Touches, ProMotion (120 Hz), R-01 Pen-in-Text May Not Work, R-07 Web Pen Worse than Native (+5 more)

### Community 44 - "0031-crdt-yjs.md (2)"
Cohesion: 0.21
Nodes (11): Custom pen renderer (Metal vs Core Animation TBD), iOS client stack, Node.js + TypeScript server, Swift 6, SwiftUI (shell), TypeScript, UIKit + TextKit 2 (editor), libsodium (+3 more)

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
Cohesion: 0.18
Nodes (9): D-15. Дизайн — основная концепция продукта, Design references: Things 3, Linear, Craft, Arc, Последствия, Решение, 5. Организация заметок и дизайн, Дизайн (D-15 — РЕШЕНО, главный принцип продукта), Организация (D-14 — РЕШЕНО по сути; структура ниже — ПРЕДЛОЖЕНО), Принципы (+1 more)

### Community 50 - "04-editor.md"
Cohesion: 0.21
Nodes (8): Obsidian (reference product: links, backlinks, tags, Markdown export), Backlinks, Editor content (headings, lists, tables, code, formulas, attachments, drawing blocks), iOS editor: UIKit + TextKit 2, Link graph view (not in MVP, stage 6), Web editor: TipTap (ProseMirror) + Yjs, [[ ]] links with autocomplete, Nested tags and smart tags (saved filters), colors and icons

### Community 51 - "06-data-server.md"
Cohesion: 0.17
Nodes (12): 6. Модель данных и сервер, Агенты (D-30), Вход и сессии (D-34, `contracts/crypto.md`), Корзина, Модель данных (общий обзор; детали — `architecture/data-model.md`), Реализация сервера (поток server, 2026-10-25), Резервные копии, Сервер (+4 more)

### Community 52 - "Контракт: шифрование (v1) (3)"
Cohesion: 0.18
Nodes (11): 1. Три вида документов Yjs, 2. Документ `account`, 3. Документ `notebook` (индекс блокнота), 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note` (+3 more)

### Community 53 - "0001-storage-in-database.md"
Cohesion: 0.25
Nodes (5): Markdown files option (rejected), Obsidian, Own server storage, Real-time collaborative editing, PostgreSQL

### Community 54 - "0016-no-import-now.md"
Cohesion: 0.18
Nodes (9): Notesnook, D-08. Аннотации PDF пером — не в MVP, Решение, D-16. Импорт — не сейчас, Import from Obsidian/Notesnook (later), Решение, R-08 Huge Project Scope, Stage 6: Extensions (+1 more)

### Community 55 - "0007-no-handwriting-recognition.md"
Cohesion: 0.22
Nodes (7): D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, Handwriting input types (text marks, margin notes, drawing block, drawing on images, Scribble), Pencil gestures (zigzag delete, underline, strike, lasso), Stroke point anchoring: character anchor + dx/dy in font-size units, System Scribble only; no recognition of drawn ink (D-07)

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
Cohesion: 0.24
Nodes (8): agentEdit mark, Block schema (ProseMirror nodes and marks), blockId on every block, Comment, Note document (content, meta, strokes, comments), Point packing (8 x Float32 LE), Stroke (immutable Y.Map), D-08 PDF pen annotations after MVP

### Community 62 - "0031-crdt-yjs.md (3)"
Cohesion: 0.27
Nodes (9): Web PWA Client (React, TipTap, Yjs, IndexedDB), Automerge (fallback CRDT), TipTap (ProseMirror), Vite + React + TypeScript PWA, Yjs, Yrs (Rust Yjs) with Swift Wrapper, CRDT, PWA (+1 more)

### Community 63 - "D-41. Набор функций по мотивам Craft"
Cohesion: 0.20
Nodes (7): D-40. Хостинг — позже; сервер готов к запуску одной командой, Решение, D-41. Набор функций по мотивам Craft, Контекст, Решение, Decision log table D-01..D-41 (one file per decision, template 0000), Server hosting and domain when VPS is bought (D-40)

### Community 64 - "12. Функции по мотивам Craft"
Cohesion: 0.20
Nodes (9): Craft features MVP / post-MVP split (D-41, before stage 2), 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft (+1 more)

### Community 65 - "agents/README.md"
Cohesion: 0.20
Nodes (9): Coordinator session: merges into main, owns roadmap, CHANGELOG, contracts, Stream agents: packages/agents (MCP, agent REST, tokens, PNG render), Stream ios-app: XcodeGen project, Craft-style SwiftUI shell, Stream ios-core: DSCore (crypto, Yrs model, GRDB, sync/API client), Stream ios-editor: DSEditor (TextKit 2 + Yrs + living stroke pen layer), Stream web-app: apps/web shell (sidebar, spaces, tasks, calendar, PWA), Stream web-editor: TipTap editor with all blocks, pen on Canvas, Nine parallel development streams (D-39) (+1 more)

### Community 66 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, db:generate, db:migrate, dev, lint, start, test (+1 more)

### Community 67 - "Дизайн и организация (2)"
Cohesion: 0.25
Nodes (7): Craft as primary visual reference (gradient backdrops, doc cards, glass panels, context menus), Rejected: clean neutral (Linear/Things) and graphite dark-by-default, Warm graphite dark theme, Command palette (Cmd+K), context menus, gestures - minimum on-screen buttons, Design tokens as single source for both platforms, Craft-like navigation: sidebar, tabs, Cmd+K palette, context menus, floating glass panels, tokens.json 'Quiet Paper' tokens with CSS variable and Swift generators

### Community 68 - "decisions/README.md (2)"
Cohesion: 0.22
Nodes (8): Monorepo Structure (apps/, packages/, infra/), Graphify, Автоматизация, Команды, Обновление графа после правки документов (по шагам), Почему два способа обновления, Установка на Mac (один раз), Что где лежит

### Community 69 - "Web client stack (PWA)"
Cohesion: 0.36
Nodes (6): Drizzle ORM, Fastify, OAuth 2.1, pg-boss job queue, Server stack, PostgreSQL

### Community 70 - "main"
Cohesion: 0.22
Nodes (8): MCP TypeScript SDK, Radix + Tailwind + Motion, D-39. Разработка параллельными сессиями; Claude сам вливает в main, Контекст, Последствия, Решение, Agents package: MCP server (Streamable HTTP, OAuth 2.1), agent REST, handwriting PNG render; server plugin, React design-system components on Radix + Tailwind + Motion ('Quiet Paper')

### Community 71 - "3. Apple Pencil в тексте — ключевая фича"
Cohesion: 0.22
Nodes (9): 3. Apple Pencil в тексте — ключевая фича, Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера, Перекладка текста — вариант А «живой штрих» (D-05, РЕШЕНО) (+1 more)

### Community 72 - "Новая группа (5)"
Cohesion: 0.22
Nodes (9): 1. Купить сервер, 2. Домен, 3. Подключиться и подготовить сервер, 4. Скачать проект, 5. Заполнить настройки, 6. Запустить, 7. Резервные копии каждую ночь, 8. Обновление сервера (+1 more)

### Community 73 - "Monorepo layout (apps/ios, apps/web, apps/server, packages, infra) (2)"
Cohesion: 0.25
Nodes (8): iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), iPad client (primary, Pencil / Pencil Pro, hover, Stage Manager), iPhone client (primary, quick notes, finger drawing option D-06), iPhone and iPad share one codebase (universal app), Argon2id password key derivation, libsodium on all platforms (swift-sodium, libsodium-wrappers), XChaCha20-Poly1305 content encryption

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
Cohesion: 0.39
Nodes (5): MCP toolset (proposed in spec/09-agents-api.md), MCP tools sketch (list_spaces, list_notebooks, search_notes, read_note, get_handwriting_image, create_note, edit_note, add_comment, get_backlinks), Request rate limits, Remote MCP server (Streamable HTTP, OAuth 2.1), REST API

### Community 78 - "open-questions.md (2)"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 79 - "Соглашения"
Cohesion: 0.25
Nodes (8): Документация Datascratch, История, Как вносить изменения, Оглавление, Порядок чтения для новичка, Соглашения, Ссылки на решения, Статусы

### Community 80 - "web-editor/README.md"
Cohesion: 0.29
Nodes (5): Контракт document-model.md, packages/web-editor — веб-редактор, Контракт strokes.md, TipTap, Yjs

### Community 81 - "Datascratch — правила для ИИ (2)"
Cohesion: 0.29
Nodes (7): Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой, Правила, Среда разработки

### Community 82 - "Новая группа (6)"
Cohesion: 0.38
Nodes (7): Auth endpoints (prelogin, signup, login, refresh, recovery), Client-generated UUIDv7 IDs with idempotent POST, REST API contract (v1), Session (access 15 min + rotating refresh 30 days), Argon2id password KDF (loginKey + passwordKey), Recovery key (Crockford Base32, DS1-), D-34 Email + password auth with recovery key

### Community 83 - "Новая группа (7)"
Cohesion: 0.38
Nodes (7): Deleted-anchor rendering rule, Stroke split across line fragments, Live stroke text anchoring (relative positions + em offsets), Handwritten strokes contract (v1), Stroke thickness pressure curve, Snapshots and compaction (500 updates / 1 MB), D-35 Annotation disappears with deleted text

### Community 84 - "data-model.md"
Cohesion: 0.29
Nodes (6): Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL) — реализовано (поток server, 2026-10-25), Штрих (черновик для прототипа), R-03 Data Format Cannot Change Cheaply

### Community 85 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 86 - "D-28. Процесс разработки: облако + Mac, сборка iOS в CI"
Cohesion: 0.29
Nodes (6): GitHub Actions CI (incl. macOS iOS builds), XcodeGen, D-28. Процесс разработки: облако + Mac, сборка iOS в CI, Контекст, Последствия, Решение

### Community 88 - "0010-agent-edits.md"
Cohesion: 0.33
Nodes (5): D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение

### Community 89 - "Платформы и клиенты (2)"
Cohesion: 0.29
Nodes (4): D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, Coordinator Claude merges branches into main when CI is green, Parallel work streams: one Claude Code session and claude/<stream> branch per directory ownership zone, Current status: stack approved, next is stage 1 pencil prototype

### Community 90 - "06-data-server.md (2)"
Cohesion: 0.29
Nodes (6): Self-hosting via one docker compose up: server + PostgreSQL (2 cores, 2-4 GB VPS), infra — развёртывание сервера Datascratch, Без домена (локально или для проверки), Вложения во внешнем S3 (по желанию, D-26), Восстановление из копии, Если что-то не так

### Community 91 - "Monorepo layout (apps/ios, apps/web, apps/server, packages, infra) (3)"
Cohesion: 0.33
Nodes (5): apps/server — сервер Datascratch, Запуск для разработки, Плагины (интерфейс для `@datascratch/agents`), Устройство, Stream server: apps/server, infra (Fastify, PostgreSQL, sync, sharing, docker compose)

### Community 92 - "Новая группа (8)"
Cohesion: 0.33
Nodes (6): Color tokens (light/dark), Pen ink and highlighter tokens, Motion and haptics tokens, Design tokens «Тихая бумага» (v1), Spacing, radius, shadow tokens, Typography tokens

### Community 93 - "Контракты между частями системы"
Cohesion: 0.40
Nodes (5): Контракты между частями системы, Правила изменения, Streams coordinate via contracts (docs/architecture/contracts/); changed only by coordinator, Executor changelog fragments in docs/changelog.d/ instead of editing CHANGELOG.md, Rules for executor sessions (own branch/directories, no contract edits, merge main, green CI, report to coordinator)

### Community 94 - "Процесс разработки"
Cohesion: 0.33
Nodes (6): Git, Две среды, Конец сессии, Кто что делает, Правила для сессий-исполнителей (D-39), Процесс разработки

### Community 95 - "7. Шифрование и доступ агентов"
Cohesion: 0.33
Nodes (6): 7. Шифрование и доступ агентов, Вход и восстановление доступа (D-34), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 96 - "0004-encryption-and-api.md (2)"
Cohesion: 0.40
Nodes (4): Per-notebook key wrapped by user master key or server key, Caddy optional container for automatic HTTPS (https profile), docker-compose.yml: server + PostgreSQL containers, file volume or external S3, Step-by-step VPS deployment on Hetzner (Ubuntu 24.04, CX22/CAX11, DNS A record, ufw)

### Community 97 - "9. API и внешние ИИ-агенты"
Cohesion: 0.33
Nodes (6): 9. API и внешние ИИ-агенты, Агент умеет, Безопасность, Набросок инструментов MCP (ПРЕДЛОЖЕНО), Правки агента (D-10), Реализация

### Community 98 - "@eslint/js"
Cohesion: 0.40
Nodes (4): @eslint/js@^10.0.1, typescript-eslint@^8.72.0, @eslint/js, typescript-eslint

### Community 99 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.40
Nodes (5): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 100 - "0014-organization.md"
Cohesion: 0.40
Nodes (4): Data model (draft), Organization hierarchy (account → space → notebook → folder → note), Stroke / StrokePoint / Anchor draft, D-14 Organization: rich but not overloaded

### Community 101 - "D-01. Хранение заметок — в базе данных на своём сервере, не в файлах"
Cohesion: 0.40
Nodes (5): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 102 - "0005-living-stroke.md (2)"
Cohesion: 0.40
Nodes (5): D-05. Перо при перекладке текста — вариант А «живой штрих», Гипотеза реализации, Контекст, Последствия, Решение

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

## Knowledge Gaps
- **126 isolated node(s):** `../../tsconfig.base.json`, `./tsconfig.json`, `Доступ внешних ИИ-агентов через MCP/REST`, `Apple Pencil в тексте — ключевая фича и главный риск`, `Astro (landing page)` (+121 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 694 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Shared test vectors (packages/test-vectors)` connect `0031-crdt-yjs.md (2)` to `Datascratch — правила для ИИ`, `Новая группа (3)`, `Новая группа (7)`, `Новая группа (2)`, `Новая группа (4)`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **What connects `../../tsconfig.base.json`, `./tsconfig.json`, `Доступ внешних ИИ-агентов через MCP/REST` to the rest of the system?**
  _126 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `sync.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05173572228443449 - nodes in this community are weakly interconnected._
- **Why does `Decision log table D-01..D-41 (one file per decision, template 0000)` connect `D-41. Набор функций по мотивам Craft` to `D-36. Структура: пространство → блокноты → папки`, `0018-monetization.md`, `0003-platforms.md`, `Web client stack (PWA)`, `main`, `0013-collaboration-sharing.md`, `D-38. Дизайн-направление — «Тихая бумага», ориентир Craft`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Should `context.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0611764705882353 - nodes in this community are weakly interconnected._
- **Why does `Closed questions: min iOS 26, XcodeGen, bundle ID, auth, guests, hosting later, stack, Redis/MinIO, PostgreSQL` connect `D-32. Минимальная версия iOS/iPadOS — 26` to `D-36. Структура: пространство → блокноты → папки`, `0025-no-redis.md`, `0026-file-storage.md`, `0013-collaboration-sharing.md`, `0025-no-redis.md (2)`, `Контракт: шифрование (v1)`, `0016-no-import-now.md`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Should `0003-platforms.md` be split into smaller, more focused modules?**
  _Cohesion score 0.05180388529139685 - nodes in this community are weakly interconnected._