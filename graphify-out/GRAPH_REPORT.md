# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 154 files · ~55,156 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 6, .example 2, .dockerignore 1)

## Summary
- 1505 nodes · 2925 edges · 111 communities (90 shown, 21 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 238 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `48895e05`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Datascratch — правила для ИИ (CLAUDE.md)
- Monorepo layout (apps/ios, apps/web, apps/server, packages, infra)
- 0005-living-stroke.md
- sync.test.ts
- 02-platforms.md
- 0013-collaboration-sharing.md
- План разработки
- Дизайн и организация
- Graphify
- 10-sync.md
- Модель данных и глоссарий
- stack.md
- D-30. База данных сервера — PostgreSQL
- 0025-no-redis.md
- Скрипт обновления графа
- 0026-file-storage.md
- data-model.md
- notFound
- auth.ts
- PgBossQueue
- src/index.ts
- helpers.ts
- server
- glossary.md
- 0018-monetization.md
- Платформы и клиенты (2)
- 09-agents-api.md
- with
- 0004-encryption-and-api.md
- iOS client stack
- 06-data-server.md
- Технологический стек — РЕШЕНО (2026-10-25)
- Контракт: шифрование (v1)
- open-questions.md (2)
- host.ts
- SyncConnection
- Обзор архитектуры: разделы
- 3. Apple Pencil в тексте — ключевая фича
- D-21. Технологический стек
- 7. Шифрование и доступ агентов
- InlineQueue
- smoke-test.sh script
- DiskStorage
- 0028-dev-workflow.md
- context.ts
- 0031-crdt-yjs.md
- AgentScope
- Datascratch — правила для ИИ
- dependencies
- SyncClient
- keys.ts
- devDependencies
- open-questions.md
- package.json
- compilerOptions
- Web PWA Client (React, TipTap, Yjs, IndexedDB)
- app.ts
- attachments.ts
- Процесс разработки (docs/development.md)
- server/package.json
- jose
- PluginCrypto
- compilerOptions
- Web client stack (PWA)
- 2026-10-25
- 0003-platforms.md
- 04-editor.md
- tasks
- notebooks.ts
- compilerOptions
- S3Storage
- D-29. Graphify: порядок работы, чтобы граф был всегда актуален
- 0001-storage-in-database.md
- risks.md
- scripts
- decisions/README.md
- Snapshot
- Контракт: REST API сервера (v1)
- D-39. Разработка параллельными сессиями; Claude сам вливает в main
- 12. Функции по мотивам Craft
- D-02. Отдельной десктоп-версии нет, на компьютере — веб
- Контракт: рукописные штрихи (v1)
- Соглашения
- D-15. Дизайн — основная концепция продукта
- @fastify/rate-limit
- D-04. Одновременно сквозное шифрование и доступ по API
- Контракт: дизайн-токены «Тихая бумага» (v1)
- @fastify/swagger
- pino-pretty@^13.2.0
- ws
- 0014-organization.md
- D-32. Минимальная версия iOS/iPadOS — 26
- D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления
- 5. Организация заметок и дизайн
- ./plugin-api
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
- agents/README.md
- design-tokens/README.md
- ui/README.md
- web-editor/README.md
- pnpm-workspace.yaml

## God Nodes (most connected - your core abstractions)
1. `AppContext` - 28 edges
2. `SyncConnection` - 26 edges
3. `notFound()` - 25 edges
4. `authRoutes()` - 22 edges
5. `drizzle-orm` - 21 edges
6. `DbOrTx` - 18 edges
7. `startServer()` - 17 edges
8. `Stage 1: Pen-in-Text Prototype (iPad)` - 17 edges
9. `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` - 17 edges
10. `fromB64()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Решение` --references--> `main()`  [INFERRED]
  docs/decisions/0039-parallel-sessions.md → apps/server/src/index.ts
- `Фрагменты журнала изменений` --references--> `main()`  [INFERRED]
  docs/changelog.d/README.md → apps/server/src/index.ts
- `7. Коды ошибок` --references--> `unauthorized()`  [INFERRED]
  docs/architecture/contracts/sync-protocol.md → apps/server/src/lib/errors.ts
- `7. Коды ошибок` --references--> `forbidden()`  [INFERRED]
  docs/architecture/contracts/sync-protocol.md → apps/server/src/lib/errors.ts
- `1. Иерархия ключей` --references--> `note()`  [INFERRED]
  docs/architecture/contracts/crypto.md → apps/server/src/plugins/api.ts

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

## Communities (111 total, 21 thin omitted)

### Community 0 - "Datascratch — правила для ИИ (CLAUDE.md)"
Cohesion: 0.13
Nodes (14): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, D-28 (облако + Mac, CI), GitHub Actions на macOS — проверка сборки iOS (+6 more)

### Community 1 - "Monorepo layout (apps/ios, apps/web, apps/server, packages, infra)"
Cohesion: 0.10
Nodes (16): apps/ios — iPhone + iPad, iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), apps/server — сервер, apps/web — веб-клиент, Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), iPhone and iPad share one codebase (universal app), Web client as full desktop replacement (Pointer Events pressure, offline PWA) (+8 more)

### Community 2 - "0005-living-stroke.md"
Cohesion: 0.10
Nodes (16): D-05. Перо при перекладке текста — вариант А «живой штрих», PencilKit (rejected), Гипотеза реализации, Контекст, Последствия, Решение, D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support (+8 more)

### Community 3 - "sync.test.ts"
Cohesion: 0.29
Nodes (15): setupNotebook(), token(), api(), b64(), createNote(), createNotebook(), newId(), rnd() (+7 more)

### Community 4 - "02-platforms.md"
Cohesion: 0.16
Nodes (11): D-06. Рисование пальцем на iPhone — да, опционально, Finger drawing toggle on iPhone, Решение, D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, UI languages Russian and English, no RTL (D-17), iPad client (primary, Pencil / Pencil Pro, hover, Stage Manager) (+3 more)

### Community 5 - "0013-collaboration-sharing.md"
Cohesion: 0.16
Nodes (12): D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account, Universal Links (paid Apple Developer account), Последствия, Решение, 8. Совместная работа и шеринг, Guest editing without account in any browser, Share links with view/edit rights, expiry and revocation (+4 more)

### Community 6 - "План разработки"
Cohesion: 0.17
Nodes (12): Критерии приёмки, План разработки, Подготовка, Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad), Этап 2 — MVP на iPad и iPhone, локально (+4 more)

### Community 7 - "Дизайн и организация"
Cohesion: 0.23
Nodes (8): Design references: Things 3, Linear, Craft, Arc, Light/dark theme, Dynamic Type, VoiceOver, full iPad keyboard, Feel references: Things 3, Linear, Craft, Arc, Own design system unified on iOS and web, Design tokens as single source for both platforms (format at stage 2), Nested folders without depth limit, Top-level spaces (Personal, Work, Study), Accessibility: Dynamic Type, VoiceOver, light/dark, iPad keyboard

### Community 8 - "Graphify"
Cohesion: 0.12
Nodes (15): Monorepo Structure (apps/, packages/, infra/), packages/test-vectors, Git, Graphify, Автоматизация, Две среды, Команды, Конец сессии (+7 more)

### Community 9 - "10-sync.md"
Cohesion: 0.11
Nodes (17): D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение, Attachments as separate encrypted files, on-demand resumable download, Agent edits applied immediately, highlighted, revertible via history (D-10), 10. Синхронизация и офлайн (+9 more)

### Community 10 - "Модель данных и глоссарий"
Cohesion: 0.12
Nodes (27): agent_tokens / agent_audit_log Tables, Server PostgreSQL Schema (Stage 3 Draft), Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, File Storage (disk or external S3), Guest via Link (web, no account) (+19 more)

### Community 11 - "stack.md"
Cohesion: 0.22
Nodes (11): Astro (landing page), Drizzle ORM, Fastify, TypeScript on Node.js, pnpm + Turborepo Monorepo, Scaling via PostgreSQL LISTEN/NOTIFY, Radix + Tailwind + Motion Design System, Redis (rejected) (+3 more)

### Community 12 - "D-30. База данных сервера — PostgreSQL"
Cohesion: 0.12
Nodes (16): Обоснованы PostgreSQL (D-30) и Yjs (D-31) как отдельные решения, Прототип пера хранит текст в Yrs (D-27), D-27. В прототипе пера текст хранится в Yrs, Контекст, Последствия, Решение, D-30. База данных сервера — PostgreSQL, Контекст (+8 more)

### Community 13 - "0025-no-redis.md"
Cohesion: 0.14
Nodes (19): Убран Redis (D-25): один процесс сервера, очередь — pg-boss на PostgreSQL, Drizzle ORM, MCP TypeScript SDK, OAuth 2.1, pg-boss job queue, Server stack, D-25. Redis не используем, Edit broadcast interface (in-memory) (+11 more)

### Community 14 - "Скрипт обновления графа"
Cohesion: 0.28
Nodes (7): Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 15 - "0026-file-storage.md"
Cohesion: 0.19
Nodes (12): MinIO (rejected), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Server disk folder storage (default), External S3-compatible storage (Hetzner, R2, B2), File storage interface (two implementations, chosen by config), Garage / SeaweedFS, MinIO (rejected) (+4 more)

### Community 16 - "data-model.md"
Cohesion: 0.22
Nodes (11): Anchor (textRange / paragraph / drawingBlock / image), Note, Stroke, StrokePoint, Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3) (+3 more)

### Community 17 - "notFound"
Cohesion: 0.29
Nodes (12): withAgentScope(), notFound(), createAgentHost(), authenticate(), makeScope(), decryptState(), docKey(), getDoc() (+4 more)

### Community 18 - "auth.ts"
Cohesion: 0.12
Nodes (39): devices, refreshTokens, users, b64(), fromB64(), id(), randomToken(), safeEqual() (+31 more)

### Community 19 - "PgBossQueue"
Cohesion: 0.14
Nodes (7): EnqueueOptions, JobHandler, JobQueue, PgBossQueue, RegisterOptions, sleep(), pino

### Community 20 - "src/index.ts"
Cohesion: 0.14
Nodes (14): base64urlKey, bool, ConfigSchema, loadConfig(), createDatabase(), config, database, main() (+6 more)

### Community 21 - "helpers.ts"
Cohesion: 0.18
Nodes (12): pg@^8.23.1, Db, migrationsFolder, runMigrations(), Tx, adminUrl(), setup(), TEMPLATE_DB (+4 more)

### Community 22 - "server"
Cohesion: 0.04
Nodes (46): context, dockerfile, depends_on, environment, image, ports, profiles, restart (+38 more)

### Community 23 - "glossary.md"
Cohesion: 0.17
Nodes (18): Organization Hierarchy (Account > Space > Notebook > Folder > Note), Custom iOS Pen Render Layer (Metal or Core Animation), TextKit 2 (UIKit editor), ADR (Architecture Decision Record), Living Stroke, PencilKit / PKCanvasView, Predicted / Coalesced Touches, ProMotion (120 Hz) (+10 more)

### Community 24 - "0018-monetization.md"
Cohesion: 0.19
Nodes (10): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, Контекст, Решение (на сейчас) (+2 more)

### Community 25 - "Платформы и клиенты (2)"
Cohesion: 0.22
Nodes (7): D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, 1. Концепция продукта, Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения, Суть в одном абзаце

### Community 26 - "09-agents-api.md"
Cohesion: 0.11
Nodes (20): D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Handwriting Format for Agents (PNG), Export: Markdown, PDF, HTML (handwriting as images), pg-boss background job queue on PostgreSQL, PostgreSQL via Drizzle (D-30): accounts, notebooks, rights, tokens, encrypted updates, snapshots, agent log, Server responsibilities: accounts, encrypted relay, attachments, realtime, API/MCP, handwriting PNG render, 9. API и внешние ИИ-агенты (+12 more)

### Community 27 - "with"
Cohesion: 0.05
Nodes (45): concurrency, cancel-in-progress, group, runs-on, steps, timeout-minutes, POSTGRES_DB, POSTGRES_PASSWORD (+37 more)

### Community 28 - "0004-encryption-and-api.md"
Cohesion: 0.13
Nodes (14): End-to-end encryption vs agent API access conflict, Local MCP bridge (future), D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, Notesnook (reference product: E2E encryption, reliable sync), Space -> notebook -> folder relation (open; encryption mode per notebook, D-09), Argon2id password key derivation, libsodium on all platforms (swift-sodium, libsodium-wrappers) (+6 more)

### Community 29 - "iOS client stack"
Cohesion: 0.18
Nodes (11): Custom pen renderer (Metal vs Core Animation TBD), GRDB (SQLite), iOS client stack, Node.js + TypeScript server, Swift 6, SwiftUI (shell), TypeScript, UIKit + TextKit 2 (editor) (+3 more)

### Community 30 - "06-data-server.md"
Cohesion: 0.09
Nodes (22): Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps, 6. Модель данных и сервер, Daily off-VPS backups of DB and files with verified restore (R-11), App server: Node.js + TypeScript (Fastify), Metadata: title, tags, links, dates, space, folder, Self-hosting, Модель данных (общий обзор; детали — `architecture/data-model.md`) (+14 more)

### Community 31 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 32 - "Контракт: шифрование (v1)"
Cohesion: 0.05
Nodes (35): note(), selectSnapshotsToDrop(), at(), now, policy, 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт) (+27 more)

### Community 33 - "open-questions.md (2)"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 34 - "host.ts"
Cohesion: 0.07
Nodes (35): agentPermission, agentTokenNotebooks, agentTokens, attachmentChunks, attachments, bytea, docKind, docs (+27 more)

### Community 35 - "SyncConnection"
Cohesion: 0.12
Nodes (15): Pending, Subscription, SyncConnection, SyncError, SyncPrincipal, HubListener, HubMessage, topics (+7 more)

### Community 36 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 37 - "3. Apple Pencil в тексте — ключевая фича"
Cohesion: 0.22
Nodes (9): 3. Apple Pencil в тексте — ключевая фича, Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера, Перекладка текста — вариант А «живой штрих» (D-05, РЕШЕНО) (+1 more)

### Community 38 - "D-21. Технологический стек"
Cohesion: 0.18
Nodes (10): Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел), D-21. Технологический стек, Контекст, Последствия, Рассмотренные варианты (по обсуждению 2026-10-25), Решение, Конец сессии: файл в docs/history + roadmap/open-questions (+2 more)

### Community 39 - "7. Шифрование и доступ агентов"
Cohesion: 0.33
Nodes (6): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 41 - "smoke-test.sh script"
Cohesion: 0.27
Nodes (7): backup.sh script, restore.sh script, json(), rnd(), smoke-test.sh script, uuid(), wait_health()

### Community 42 - "DiskStorage"
Cohesion: 0.17
Nodes (5): DiskStorage, createStorage(), S3Options, BlobStorage, chunkKey()

### Community 43 - "0028-dev-workflow.md"
Cohesion: 0.14
Nodes (14): GitHub Actions CI (incl. macOS iOS builds), XcodeGen, Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, D-28. Процесс разработки: облако + Mac, сборка iOS в CI (+6 more)

### Community 44 - "context.ts"
Cohesion: 0.07
Nodes (17): AccessClaims, GuestClaims, subkey(), TokenSigner, Config, AppContext, createContext(), Database (+9 more)

### Community 45 - "0031-crdt-yjs.md"
Cohesion: 0.21
Nodes (15): Automerge (fallback CRDT), Yrs (Rust Yjs) with Swift Wrapper, End-to-end encryption, libsodium, Pen prototype (stage 1), Automerge (fallback CRDT), Encrypted history compaction by clients (R-05, stage 3), Last-write-wins (unsuitable) (+7 more)

### Community 47 - "Datascratch — правила для ИИ"
Cohesion: 0.22
Nodes (8): Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой, Правила, Среда разработки, Создан CLAUDE.md и скелет монорепозитория (apps/, packages/, infra/)

### Community 48 - "dependencies"
Cohesion: 0.10
Nodes (21): dependencies, @aws-sdk/client-s3@^3.1156.0, drizzle-orm@^0.45.4, @fastify/cors@^11.3.1, fastify-plugin@^6.0.1, @fastify/swagger-ui@^6.1.2, fastify-type-provider-zod@^7.0.0, @fastify/websocket@^11.3.4 (+13 more)

### Community 50 - "keys.ts"
Cohesion: 0.29
Nodes (9): libsodium-wrappers-sumo@^0.8.4, notebooks, AD, getSodium(), open(), seal(), Sodium, createPluginHost() (+1 more)

### Community 51 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, drizzle-kit@^0.31.11, eslint@^10.13.0, @eslint/js@^10.0.1, @types/libsodium-wrappers-sumo@^0.8.2, @types/pg@^8.23.1, @types/ws@^8.18.2, typescript@^5.6.0 (+10 more)

### Community 52 - "open-questions.md"
Cohesion: 0.15
Nodes (14): VPS Hosting (Hetzner or similar), D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст, Решение, End-to-End Encryption (E2E), Private Notebook (+6 more)

### Community 53 - "package.json"
Cohesion: 0.14
Nodes (15): devDependencies, turbo@^2.3.0, typescript@^5.6.0, engines, node, typescript, name, packageManager (+7 more)

### Community 54 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+7 more)

### Community 55 - "Web PWA Client (React, TipTap, Yjs, IndexedDB)"
Cohesion: 0.25
Nodes (8): Web PWA Client (React, TipTap, Yjs, IndexedDB), Dexie (IndexedDB), GRDB (SQLite), TipTap (ProseMirror), Vite + React + TypeScript PWA, Yjs, CRDT, PWA

### Community 56 - "app.ts"
Cohesion: 0.18
Nodes (14): fastify@^5.12.7, buildApp(), BuildOptions, codeForStatus(), ApiErrorCode, ServerPlugin, LoadedPlugin, loadPlugins() (+6 more)

### Community 57 - "attachments.ts"
Cohesion: 0.12
Nodes (33): bearer(), requireUser(), requireUserOrGuest(), verifyGuestToken(), verifyUserToken(), shares, ApiError, badRequest() (+25 more)

### Community 58 - "Процесс разработки (docs/development.md)"
Cohesion: 0.15
Nodes (16): Стартовый хук Claude Code (.claude/hooks/session-start.sh), D-23 (документация), git-хук Graphify (пересборка только по изменённому коду), Скрипт tools/graphify_docs.py (prepare → агенты → finish), Graphify 0.9.95 (пакет graphifyy), Смысловой слой графа (понятия, решения, связи — проход ИИ), Структурный слой графа (код, файлы, заголовки — без ИИ), Автоматизация: стартовый хук, git-хук, graphify update после git pull (+8 more)

### Community 59 - "server/package.json"
Cohesion: 0.15
Nodes (12): tsx@^4.23.15, @types/node@^22.20.5, engines, node, files, main, name, private (+4 more)

### Community 62 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, lib, module, moduleResolution, noEmit, outDir, rootDir, types (+3 more)

### Community 63 - "Web client stack (PWA)"
Cohesion: 0.29
Nodes (7): Canvas + Pointer Events, Dexie (IndexedDB), Fastify, Radix + Tailwind + Motion, TipTap editor, Vite + React + TypeScript PWA, Web client stack (PWA)

### Community 64 - "2026-10-25"
Cohesion: 0.22
Nodes (9): 2026-10-25, Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Утверждён технологический стек (D-21), отказ от ядра на Rust (D-22), Журнал изменений, D-22. Без собственного общего ядра на Rust, Контекст, Последствия, Рассмотренные варианты (+1 more)

### Community 66 - "04-editor.md"
Cohesion: 0.14
Nodes (12): Obsidian (reference product: links, backlinks, tags, Markdown export), 4. Редактор, Backlinks, iOS editor: UIKit + TextKit 2, Link graph view (not in MVP, stage 6), Web editor: TipTap (ProseMirror) + Yjs, [[ ]] links with autocomplete, Платформенная реализация (+4 more)

### Community 67 - "tasks"
Cohesion: 0.18
Nodes (10): dependsOn, outputs, $schema, tasks, build, lint, test, typecheck (+2 more)

### Community 68 - "notebooks.ts"
Cohesion: 0.24
Nodes (9): DocKind, dto(), Mode, Notebook, notebookRoutes(), ownNotebook(), NotebookRow, revokeSharesFor() (+1 more)

### Community 69 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, declaration, noEmit, outDir, rootDir, sourceMap, extends, include (+1 more)

### Community 71 - "D-29. Graphify: порядок работы, чтобы граф был всегда актуален"
Cohesion: 0.24
Nodes (7): Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, D-29. Graphify: порядок работы, чтобы граф был всегда актуален, R-09 (риск: Graphify сломается или исчезнет), Контекст, Последствия, Решение, Раскладка graphify-out/ и что хранится в git

### Community 72 - "0001-storage-in-database.md"
Cohesion: 0.12
Nodes (15): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты, Решение (+7 more)

### Community 73 - "risks.md"
Cohesion: 0.13
Nodes (16): Canvas + Pointer Events Pen Layer, D-08. Аннотации PDF пером — не в MVP, Решение (предложение), Universal Links, Apple Developer Account, PDF Annotations Not in MVP, R-07 Web Pen Worse than Native, R-08 Huge Project Scope (+8 more)

### Community 74 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, db:generate, db:migrate, dev, lint, start, test (+1 more)

### Community 75 - "decisions/README.md"
Cohesion: 0.13
Nodes (10): D-19. Весь код пишет Claude, Последствия, Решение, D-23. Документация — источник истины; Graphify — граф знаний поверх неё, docs/history session log, Контекст, Последствия, Решение (+2 more)

### Community 76 - "Snapshot"
Cohesion: 0.47
Nodes (6): doc_snapshots Table (compacted snapshots, version history), doc_updates Table (encrypted Yjs updates), Snapshot, Update (Yjs binary edit record), Yjs History Compaction under Encryption, R-05 Edit History Growth

### Community 77 - "Контракт: REST API сервера (v1)"
Cohesion: 0.22
Nodes (8): Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1), Служебное, Токены агентов (`spec/09-agents-api.md`), Шеринг (D-13, D-37)

### Community 78 - "D-39. Разработка параллельными сессиями; Claude сам вливает в main"
Cohesion: 0.40
Nodes (4): D-39. Разработка параллельными сессиями; Claude сам вливает в main, Контекст, Последствия, Решение

### Community 79 - "12. Функции по мотивам Craft"
Cohesion: 0.22
Nodes (8): 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft, Связь с моделью данных

### Community 80 - "D-02. Отдельной десктоп-версии нет, на компьютере — веб"
Cohesion: 0.67
Nodes (3): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение

### Community 81 - "Контракт: рукописные штрихи (v1)"
Cohesion: 0.25
Nodes (7): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4. Привязка к тексту (живой штрих), 5. Отрисовка толщины, 6. Тестовые векторы, Контракт: рукописные штрихи (v1)

### Community 82 - "Соглашения"
Cohesion: 0.25
Nodes (8): Документация Datascratch, История, Как вносить изменения, Оглавление, Порядок чтения для новичка, Соглашения, Ссылки на решения, Статусы

### Community 83 - "D-15. Дизайн — основная концепция продукта"
Cohesion: 0.67
Nodes (3): D-15. Дизайн — основная концепция продукта, Последствия, Решение

### Community 85 - "D-04. Одновременно сквозное шифрование и доступ по API"
Cohesion: 0.50
Nodes (4): D-04. Одновременно сквозное шифрование и доступ по API, Контекст, Последствия, Решение

### Community 86 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.33
Nodes (5): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 92 - "0014-organization.md"
Cohesion: 0.40
Nodes (4): D-14. Организация: богатая, но не перегруженная, Spaces, nested folders, smart tags, colors, Решение, Organization Structure (notebook vs space vs folder)

### Community 93 - "D-32. Минимальная версия iOS/iPadOS — 26"
Cohesion: 0.40
Nodes (4): D-32. Минимальная версия iOS/iPadOS — 26, Последствия, Рассмотренные варианты, Решение

### Community 94 - "D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления"
Cohesion: 0.40
Nodes (4): D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления, Контекст, Рассмотренные варианты, Решение

### Community 97 - "5. Организация заметок и дизайн"
Cohesion: 0.40
Nodes (5): 5. Организация заметок и дизайн, Дизайн (D-15 — РЕШЕНО, главный принцип продукта), Организация (D-14 — РЕШЕНО по сути; структура ниже — ПРЕДЛОЖЕНО), Принципы, Реализация

### Community 98 - "./plugin-api"
Cohesion: 0.50
Nodes (4): exports, ./plugin-api, default, types

### Community 99 - "D-03. Платформы: нативные iPhone и iPad + полноценный веб"
Cohesion: 0.50
Nodes (4): D-03. Платформы: нативные iPhone и iPad + полноценный веб, Контекст, Последствия, Решение

### Community 100 - "D-35. Пометка на удалённом тексте исчезает вместе с ним"
Cohesion: 0.50
Nodes (3): D-35. Пометка на удалённом тексте исчезает вместе с ним, Рассмотренные варианты, Решение

### Community 101 - "D-36. Структура: пространство → блокноты → папки"
Cohesion: 0.50
Nodes (3): D-36. Структура: пространство → блокноты → папки, Рассмотренные варианты, Решение

### Community 102 - "D-38. Дизайн-направление — «Тихая бумага», ориентир Craft"
Cohesion: 0.50
Nodes (3): D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Рассмотренные варианты, Решение

### Community 103 - "D-41. Набор функций по мотивам Craft"
Cohesion: 0.50
Nodes (3): D-41. Набор функций по мотивам Craft, Контекст, Решение

### Community 104 - "2. Платформы"
Cohesion: 0.50
Nodes (4): 2. Платформы, Минимальная версия iOS/iPadOS — ОТКРЫТО, Тестовые устройства (известно на 2026-10-25), Требования

## Knowledge Gaps
- **50 isolated node(s):** `./tsconfig.json`, `../../tsconfig.base.json`, `Доступ внешних ИИ-агентов через MCP/REST`, `Apple Pencil в тексте — ключевая фича и главный риск`, `Astro (landing page)` (+45 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 588 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов` connect `Скрипт обновления графа` to `2026-10-25`, `Процесс разработки (docs/development.md)`, `D-29. Graphify: порядок работы, чтобы граф был всегда актуален`?**
  _High betweenness centrality (0.356) - this node is a cross-community bridge._
- **What connects `./tsconfig.json`, `../../tsconfig.base.json`, `Доступ внешних ИИ-агентов через MCP/REST` to the rest of the system?**
  _50 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Datascratch — правила для ИИ (CLAUDE.md)` be split into smaller, more focused modules?**
  _Cohesion score 0.13450292397660818 - nodes in this community are weakly interconnected._
- **Why does `label()` connect `Скрипт обновления графа` to `Контракт: шифрование (v1)`?**
  _High betweenness centrality (0.355) - this node is a cross-community bridge._
- **Should `Monorepo layout (apps/ios, apps/web, apps/server, packages, infra)` be split into smaller, more focused modules?**
  _Cohesion score 0.10276679841897234 - nodes in this community are weakly interconnected._
- **Why does `4.2. Схема блоков` connect `Контракт: шифрование (v1)` to `Скрипт обновления графа`?**
  _High betweenness centrality (0.353) - this node is a cross-community bridge._
- **Should `0005-living-stroke.md` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._