# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 135 files · ~53,811 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 3)

## Summary
- 1505 nodes · 2972 edges · 114 communities (99 shown, 15 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 252 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d8c702c1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- steps
- iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)
- 2026-10-25
- agent-service.ts
- Платформы и клиенты
- Документация Datascratch (docs/README.md)
- План разработки
- Дизайн и организация
- Graphify
- 10-sync.md
- engines
- stack.md
- Datascratch — правила для ИИ (CLAUDE.md)
- 09-agents-api.md
- Скрипт обновления графа
- 0031-crdt-yjs.md
- glossary.md
- Контракт: модель документа (v1)
- AgentsStore
- 06-data-server.md
- open-questions.md
- handwriting-png.ts
- roadmap.md
- Principal
- 06-data-server.md (2)
- Платформы и клиенты (2)
- oauth.ts
- src/index.ts
- edits.ts
- iOS client stack
- markdown-export.ts
- strokes.ts
- 0026-file-storage.md
- open-questions.md (2)
- package.json
- dependencies
- Обзор архитектуры: разделы
- devDependencies
- compilerOptions
- Контракт: API для ИИ-агентов — MCP, REST, OAuth (v1, черновик)
- context.ts
- 0016-no-import-now.md
- 0005-living-stroke.md
- open-questions.md (3)
- Контракт: шифрование (v1)
- Importer
- context.ts
- oauth.test.ts
- 0003-platforms.md
- 04-editor.md
- Определение «готово» для любого изменения
- compilerOptions
- tasks
- Контракт: REST API сервера (v1)
- Контракт: протокол синхронизации (v1)
- Как подключить Claude или ChatGPT к Datascratch
- D-29. Graphify: порядок работы, чтобы граф был всегда актуален
- 08-sharing.md
- 12. Функции по мотивам Craft
- Контракт: рукописные штрихи (v1)
- tsconfig.build.json
- 0010-agent-edits.md
- PostgreSQL
- Контракт: дизайн-токены «Тихая бумага» (v1)
- InMemoryDataSource
- D-23. Документация — источник истины; Graphify — граф знаний поверх неё
- fixtures.ts
- 0025-no-redis.md
- InMemoryAgentsStore
- 07-encryption.md
- plugin.ts
- overview.md
- 0004-encryption-and-api.md
- 0014-organization.md
- model.ts
- D-32. Минимальная версия iOS/iPadOS — 26
- D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления
- D-39. Разработка параллельными сессиями; Claude сам вливает в main
- Процесс разработки (docs/development.md)
- 5. Организация заметок и дизайн
- scripts
- 0001-storage-in-database.md
- D-35. Пометка на удалённом тексте исчезает вместе с ним
- D-36. Структура: пространство → блокноты → папки
- D-38. Дизайн-направление — «Тихая бумага», ориентир Craft
- D-41. Набор функций по мотивам Craft
- 03-pencil.md
- AgentsContext
- ./testing
- Контракты между частями системы
- D-33. Bundle ID — com.datascratch.app
- D-37. Гости по ссылке рисуют; ссылка живёт до отзыва
- D-40. Хостинг — позже; сервер готов к запуску одной командой
- changelog.d/README.md
- TestProvider
- Процесс разработки (docs/development.md)
- design-tokens/README.md
- ui/README.md
- web-editor/README.md
- pnpm-workspace.yaml
- risks.md
- Two Notebook Modes (private E2E / for agents)
- Технологический стек — РЕШЕНО (2026-10-25)
- 9. API и внешние ИИ-агенты
- AgentDataSource
- data-model.md
- Web client stack (PWA)
- Документация Datascratch (docs/README.md)
- .noteIndex
- D-19. Весь код пишет Claude
- 7. Шифрование и доступ агентов
- D-03. Платформы: нативные iPhone и iPad + полноценный веб
- 01-concept.md

## God Nodes (most connected - your core abstractions)
1. `AgentError` - 37 edges
2. `Principal` - 35 edges
3. `AgentService` - 34 edges
4. `registerOAuthRoutes()` - 32 edges
5. `childElements()` - 24 edges
6. `contentOf()` - 20 edges
7. `buildMcpServer()` - 20 edges
8. `renderHandwriting()` - 19 edges
9. `InMemoryAgentsStore` - 19 edges
10. `yjs` - 18 edges

## Surprising Connections (you probably didn't know these)
- `1. Как устроено` --references--> `AgentService`  [INFERRED]
  docs/architecture/contracts/agents-api.md → packages/agents/src/service/agent-service.ts
- `4.2. Схема блоков` --references--> `label()`  [INFERRED]
  docs/architecture/contracts/document-model.md → tools/graphify_docs.py
- `7. Журнал и лимиты` --references--> `AuditEntry`  [INFERRED]
  docs/architecture/contracts/agents-api.md → packages/agents/src/context.ts
- `Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО` --semantically_similar_to--> `Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/README.md
- `Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md` --semantically_similar_to--> `Конец сессии: файл в docs/history + roadmap/open-questions`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/development.md

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

## Communities (114 total, 15 thin omitted)

### Community 0 - "steps"
Cohesion: 0.07
Nodes (26): concurrency, cancel-in-progress, group, CI, jobs, test, name, paths (+18 more)

### Community 1 - "iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)"
Cohesion: 0.12
Nodes (13): apps/ios — iPhone + iPad, iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), apps/server — сервер, Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), apps/web — веб-клиент, Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), iPhone and iPad share one codebase (universal app) (+5 more)

### Community 2 - "2026-10-25"
Cohesion: 0.05
Nodes (44): Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой, Правила, Среда разработки, 2026-10-25 (+36 more)

### Community 3 - "agent-service.ts"
Cohesion: 0.09
Nodes (27): findHandwriting(), RenderedImage, FolderView, NoteMetaView, NoteSummary, readNotebookDoc(), ReadNoteResult, ServiceOptions (+19 more)

### Community 4 - "Платформы и клиенты"
Cohesion: 0.11
Nodes (16): D-06. Рисование пальцем на iPhone — да, опционально, Finger drawing toggle on iPhone, Решение, D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, 2. Платформы, UI languages Russian and English, no RTL (D-17) (+8 more)

### Community 5 - "Документация Datascratch (docs/README.md)"
Cohesion: 0.25
Nodes (8): Документация Datascratch, История, Как вносить изменения, Оглавление, Порядок чтения для новичка, Соглашения, Ссылки на решения, Статусы

### Community 6 - "План разработки"
Cohesion: 0.17
Nodes (12): Критерии приёмки, План разработки, Подготовка, Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad), Этап 2 — MVP на iPad и iPhone, локально (+4 more)

### Community 7 - "Дизайн и организация"
Cohesion: 0.17
Nodes (11): D-15. Дизайн — основная концепция продукта, Design references: Things 3, Linear, Craft, Arc, Последствия, Решение, Light/dark theme, Dynamic Type, VoiceOver, full iPad keyboard, Feel references: Things 3, Linear, Craft, Arc, Own design system unified on iOS and web, Design tokens as single source for both platforms (format at stage 2) (+3 more)

### Community 8 - "Graphify"
Cohesion: 0.12
Nodes (15): Monorepo Structure (apps/, packages/, infra/), packages/test-vectors, Git, Graphify, Автоматизация, Две среды, Команды, Конец сессии (+7 more)

### Community 9 - "10-sync.md"
Cohesion: 0.14
Nodes (14): Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps, Attachments as separate encrypted files, on-demand resumable download, Agent edits applied immediately, highlighted, revertible via history (D-10), 10. Синхронизация и офлайн, Chunked resumable attachments; thumbnails-only on iPhone, Local storage: SQLite via GRDB (iOS), IndexedDB via Dexie (web), Agent notebooks: server decrypts and applies agent edit as a normal update, Trash for 30 days (+6 more)

### Community 10 - "engines"
Cohesion: 0.33
Nodes (4): engines, node, peerDependencies, fastify@^5.0.0

### Community 11 - "stack.md"
Cohesion: 0.13
Nodes (21): Web PWA Client (React, TipTap, Yjs, IndexedDB), Astro (landing page), Dexie (IndexedDB), Drizzle ORM, Fastify, GRDB (SQLite), Custom iOS Pen Render Layer (Metal or Core Animation), TypeScript on Node.js (+13 more)

### Community 12 - "Datascratch — правила для ИИ (CLAUDE.md)"
Cohesion: 0.15
Nodes (11): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел), Git: ветки, PR, один коммит = код + docs + граф (+3 more)

### Community 13 - "09-agents-api.md"
Cohesion: 0.20
Nodes (10): D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Export: Markdown, PDF, HTML (handwriting as images), Server responsibilities: accounts, encrypted relay, attachments, realtime, API/MCP, handwriting PNG render, Local MCP bridge (future): local utility holding key for agent access to private notebooks, Handwriting rendered to PNG for agents with text annotation (D-11), MCP tools sketch (list_spaces, list_notebooks, search_notes, read_note, get_handwriting_image, create_note, edit_note, add_comment, get_backlinks), Request rate limits (+2 more)

### Community 14 - "Скрипт обновления графа"
Cohesion: 0.28
Nodes (7): Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 15 - "0031-crdt-yjs.md"
Cohesion: 0.15
Nodes (14): End-to-end encryption, libsodium, docs/history session log, Pen prototype (stage 1), Automerge (fallback CRDT), Encrypted history compaction by clients (R-05, stage 3), Last-write-wins (unsuitable), Loro (too early) (+6 more)

### Community 16 - "glossary.md"
Cohesion: 0.22
Nodes (11): Organization Hierarchy (Account > Space > Notebook > Folder > Note), Automerge (fallback CRDT), Yjs, Yrs (Rust Yjs) with Swift Wrapper, ADR (Architecture Decision Record), CRDT, Predicted / Coalesced Touches, Smart Tag (+3 more)

### Community 17 - "Контракт: модель документа (v1)"
Cohesion: 0.17
Nodes (11): 1. Три вида документов Yjs, 2. Документ `account`, 3. Документ `notebook` (индекс блокнота), 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note` (+3 more)

### Community 19 - "06-data-server.md"
Cohesion: 0.10
Nodes (18): 6. Модель данных и сервер, Daily off-VPS backups of DB and files with verified restore (R-11), Metadata: title, tags, links, dates, space, folder, Self-hosting, Модель данных (общий обзор; детали — `architecture/data-model.md`), Резервные копии, Сервер, Real-time co-editing with cursors and presence (guests shown as 'Guest') (+10 more)

### Community 20 - "open-questions.md"
Cohesion: 0.24
Nodes (12): GitHub Actions CI (incl. macOS iOS builds), XcodeGen, Mixed cloud + Mac development mode, Living Stroke, ProMotion (120 Hz), Reflow, Guest Pen Drawing and Link Lifetime, Minimum iOS/iPadOS Version (+4 more)

### Community 21 - "handwriting-png.ts"
Cohesion: 0.10
Nodes (29): attr(), Marks, DISPLAY_FAMILY, ensureFonts(), require, TEXT_FAMILY, BlockStyle, boxOf() (+21 more)

### Community 22 - "roadmap.md"
Cohesion: 0.22
Nodes (8): D-08. Аннотации PDF пером — не в MVP, PDF pen annotations (PDFKit + stroke layer), Решение (предложение), PDF Annotations Not in MVP, R-08 Huge Project Scope, Stage 2: Local MVP on iPad and iPhone, Stage 6: Extensions, Current status: stack approved, next is stage 1 pencil prototype

### Community 23 - "Principal"
Cohesion: 0.29
Nodes (5): buildMcpServer(), Principal, requireWrite(), AgentService, folderPath()

### Community 24 - "06-data-server.md (2)"
Cohesion: 0.19
Nodes (10): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, Контекст, Решение (на сейчас) (+2 more)

### Community 25 - "Платформы и клиенты (2)"
Cohesion: 0.33
Nodes (6): 1. Концепция продукта, Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения, Суть в одном абзаце

### Community 26 - "oauth.ts"
Cohesion: 0.07
Nodes (54): RFC-7009, RFC-8252, RFC-9207, RFC-9562, ACCESS_PREFIX, GrantService, REFRESH_PREFIX, scopeFor() (+46 more)

### Community 27 - "src/index.ts"
Cohesion: 0.20
Nodes (14): EditOp, clip(), collectHandwriting(), describeSpans(), HandwritingKind, HINT_RU, hintOf(), TextMark (+6 more)

### Community 28 - "edits.ts"
Cohesion: 0.10
Nodes (39): BuildContext, cloneInto(), copyChildren(), fill(), fillInline(), insertBlock(), insertBlocks(), withAgentMark() (+31 more)

### Community 29 - "iOS client stack"
Cohesion: 0.18
Nodes (11): Custom pen renderer (Metal vs Core Animation TBD), GRDB (SQLite), iOS client stack, Node.js + TypeScript server, Swift 6, SwiftUI (shell), TypeScript, UIKit + TextKit 2 (editor) (+3 more)

### Community 30 - "markdown-export.ts"
Cohesion: 0.20
Nodes (10): HandwritingItem, inlineMarkdown(), MARK_ORDER, MarkdownOptions, noteToMarkdown(), TONES, wrapMarks(), Writer (+2 more)

### Community 31 - "strokes.ts"
Cohesion: 0.18
Nodes (14): FlatText, textBlockOf(), AnchorKind, decodePoints(), field(), followRedone(), POINT_BYTES, POINT_FLOATS (+6 more)

### Community 32 - "0026-file-storage.md"
Cohesion: 0.19
Nodes (12): MinIO (rejected), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Server disk folder storage (default), External S3-compatible storage (Hetzner, R2, B2), File storage interface (two implementations, chosen by config), Garage / SeaweedFS, MinIO (rejected) (+4 more)

### Community 33 - "open-questions.md (2)"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 34 - "package.json"
Cohesion: 0.14
Nodes (15): devDependencies, turbo@^2.3.0, typescript@^5.6.0, engines, node, typescript, name, packageManager (+7 more)

### Community 35 - "dependencies"
Cohesion: 0.10
Nodes (26): dependencies, @expo-google-fonts/inter@^0.4.2, @expo-google-fonts/newsreader@^0.4.1, fastify-plugin@^6.0.1, mdast-util-from-markdown@^2.1.0, mdast-util-gfm@^3.1.0, micromark-extension-gfm@^3.0.0, @modelcontextprotocol/server@^2.4.0 (+18 more)

### Community 36 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 37 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, fastify@^5.6.0, pixelmatch@^7, pngjs@^7, @types/mdast@^4.0.4, @types/node@^22, @types/pngjs@^6.0.5, typescript@^5.9.0 (+6 more)

### Community 38 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+7 more)

### Community 39 - "Контракт: API для ИИ-агентов — MCP, REST, OAuth (v1, черновик)"
Cohesion: 0.15
Nodes (12): 10. Открытые вопросы (к координатору), 1. Как устроено, 2.1. Токены, 2.2. OAuth 2.1 (по спецификации MCP 2026-07-28), 2. Доступ, 3. Инструменты MCP и REST, 4. Markdown для агента (`read_note`), 5. Правки агента (D-10) (+4 more)

### Community 40 - "context.ts"
Cohesion: 0.14
Nodes (10): AgentEditOrigin, AuthorizationCode, OAuthClient, OAuthToken, RFC-7591, UserAuth, UserIdentity, InMemoryUserAuth (+2 more)

### Community 41 - "0016-no-import-now.md"
Cohesion: 0.33
Nodes (5): Notesnook, D-16. Импорт — не сейчас, Import from Obsidian/Notesnook (later), Решение, No import for now (D-16)

### Community 42 - "0005-living-stroke.md"
Cohesion: 0.24
Nodes (6): D-05. Перо при перекладке текста — вариант А «живой штрих», PencilKit (rejected), Гипотеза реализации, Контекст, Последствия, Решение

### Community 43 - "open-questions.md (3)"
Cohesion: 0.40
Nodes (5): docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, iOS build and tests on macOS CI runner per push

### Community 44 - "Контракт: шифрование (v1)"
Cohesion: 0.18
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 46 - "context.ts"
Cohesion: 0.12
Nodes (18): zod@^4.2.0, SCOPE_READ, SCOPE_WRITE, VerifiedToken, audited(), AuditTarget, targetOf(), coerceQuery() (+10 more)

### Community 47 - "oauth.test.ts"
Cohesion: 0.16
Nodes (13): @modelcontextprotocol/client@^2.4.0, vitest@^4.0.0, authorize(), consent(), setup(), freePort(), startServer(), NB_OTHER (+5 more)

### Community 48 - "0003-platforms.md"
Cohesion: 0.27
Nodes (4): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, Full-featured web client (TypeScript)

### Community 49 - "04-editor.md"
Cohesion: 0.18
Nodes (12): Obsidian (reference product: links, backlinks, tags, Markdown export), 4. Редактор, Backlinks, iOS editor: UIKit + TextKit 2, Link graph view (not in MVP, stage 6), Web editor: TipTap (ProseMirror) + Yjs, [[ ]] links with autocomplete, Платформенная реализация (+4 more)

### Community 50 - "Определение «готово» для любого изменения"
Cohesion: 0.36
Nodes (4): Скрипт tools/graphify_docs.py (prepare → агенты → finish), Обновление графа после правки документов (prepare → агенты → finish → export html → check-update), Промпт извлечения .claude/skills/graphify/references/extraction-spec.md, Команды Graphify (query, explain, path, update, check-update, /graphify)

### Community 51 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, module, moduleResolution, noEmit, rootDir, types, extends (+2 more)

### Community 52 - "tasks"
Cohesion: 0.18
Nodes (10): dependsOn, outputs, $schema, tasks, build, lint, test, typecheck (+2 more)

### Community 53 - "Контракт: REST API сервера (v1)"
Cohesion: 0.20
Nodes (9): Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1), Общее, Служебное, Токены агентов (`spec/09-agents-api.md`) (+1 more)

### Community 54 - "Контракт: протокол синхронизации (v1)"
Cohesion: 0.20
Nodes (9): 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05), 6. Права, 7. Коды ошибок, 8. Тестовые векторы (+1 more)

### Community 55 - "Как подключить Claude или ChatGPT к Datascratch"
Cohesion: 0.18
Nodes (10): ChatGPT, Claude (claude.ai, приложение Claude, Claude Code), Агент без OAuth или свой скрипт, Если что-то не работает, Как подключить Claude или ChatGPT к Datascratch, Управление доступом, Что получит агент, Шаг 1. Включите режим «для агентов» у блокнота (+2 more)

### Community 56 - "D-29. Graphify: порядок работы, чтобы граф был всегда актуален"
Cohesion: 0.24
Nodes (7): Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, D-29. Graphify: порядок работы, чтобы граф был всегда актуален, R-09 (риск: Graphify сломается или исчезнет), Контекст, Последствия, Решение, Раскладка graphify-out/ и что хранится в git

### Community 57 - "08-sharing.md"
Cohesion: 0.15
Nodes (13): D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account, Universal Links (paid Apple Developer account), Последствия, Решение, Web client as full desktop replacement (Pointer Events pressure, offline PWA), 8. Совместная работа и шеринг, Guest editing without account in any browser (+5 more)

### Community 58 - "12. Функции по мотивам Craft"
Cohesion: 0.22
Nodes (8): 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft, Связь с моделью данных

### Community 59 - "Контракт: рукописные штрихи (v1)"
Cohesion: 0.25
Nodes (7): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4. Привязка к тексту (живой штрих), 5. Отрисовка толщины, 6. Тестовые векторы, Контракт: рукописные штрихи (v1)

### Community 60 - "tsconfig.build.json"
Cohesion: 0.25
Nodes (7): compilerOptions, noEmit, outDir, rootDir, extends, include, ./tsconfig.json

### Community 61 - "0010-agent-edits.md"
Cohesion: 0.33
Nodes (5): D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение

### Community 62 - "PostgreSQL"
Cohesion: 0.18
Nodes (16): agent_tokens / agent_audit_log Tables, doc_snapshots Table (compacted snapshots, version history), doc_updates Table (encrypted Yjs updates), Server PostgreSQL Schema (Stage 3 Draft), Handwriting-to-PNG Render (pg-boss queue), docker compose Self-Hosting (server + PostgreSQL), pg-boss Job Queue, PostgreSQL (+8 more)

### Community 63 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.33
Nodes (5): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 64 - "InMemoryDataSource"
Cohesion: 0.17
Nodes (5): AgentNotebook, LoadedDoc, NotebookView, InMemoryDataSource, StoredNotebook

### Community 65 - "D-23. Документация — источник истины; Graphify — граф знаний поверх неё"
Cohesion: 0.50
Nodes (4): D-23. Документация — источник истины; Graphify — граф знаний поверх неё, Контекст, Последствия, Решение

### Community 66 - "fixtures.ts"
Cohesion: 0.12
Nodes (26): encodePoints(), StrokeHint, StrokeTool, writeStroke(), addBlockStroke(), addTextStroke(), blockIdAt(), makeNotebookDoc() (+18 more)

### Community 67 - "0025-no-redis.md"
Cohesion: 0.11
Nodes (23): Убран Redis (D-25): один процесс сервера, очередь — pg-boss на PostgreSQL, Drizzle ORM, MCP TypeScript SDK, OAuth 2.1, pg-boss job queue, Server stack, D-25. Redis не используем, Edit broadcast interface (in-memory) (+15 more)

### Community 68 - "InMemoryAgentsStore"
Cohesion: 0.14
Nodes (4): 7. Журнал и лимиты, AgentGrant, AuditEntry, InMemoryAgentsStore

### Community 69 - "07-encryption.md"
Cohesion: 0.17
Nodes (11): D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, Notesnook (reference product: E2E encryption, reliable sync), Space -> notebook -> folder relation (open; encryption mode per notebook, D-09), Argon2id password key derivation, libsodium on all platforms (swift-sodium, libsodium-wrappers), Per-notebook key wrapped by user master key or server key, Private notebooks: key from password, server stores only ciphertext, no agent access (+3 more)

### Community 70 - "plugin.ts"
Cohesion: 0.11
Nodes (24): bearer(), OAuthDeps, AgentError, AgentErrorCode, errorBody(), STATUS, toAgentError(), createInput (+16 more)

### Community 71 - "overview.md"
Cohesion: 0.16
Nodes (18): Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, File Storage (disk or external S3), Guest via Link (web, no account), iOS / iPadOS Client (Swift, TextKit 2, Yrs, GRDB), Key Store (agent notebooks) (+10 more)

### Community 72 - "0004-encryption-and-api.md"
Cohesion: 0.29
Nodes (6): D-04. Одновременно сквозное шифрование и доступ по API, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), Контекст, Последствия, Решение

### Community 73 - "0014-organization.md"
Cohesion: 0.40
Nodes (4): D-14. Организация: богатая, но не перегруженная, Spaces, nested folders, smart tags, colors, Решение, Organization Structure (notebook vs space vs folder)

### Community 74 - "model.ts"
Cohesion: 0.23
Nodes (16): atomText(), attrs(), BlockLocation, childElements(), CONTAINER_BLOCKS, contentOf(), flatten(), Inline (+8 more)

### Community 75 - "D-32. Минимальная версия iOS/iPadOS — 26"
Cohesion: 0.40
Nodes (4): D-32. Минимальная версия iOS/iPadOS — 26, Последствия, Рассмотренные варианты, Решение

### Community 76 - "D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления"
Cohesion: 0.40
Nodes (4): D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления, Контекст, Рассмотренные варианты, Решение

### Community 77 - "D-39. Разработка параллельными сессиями; Claude сам вливает в main"
Cohesion: 0.40
Nodes (4): D-39. Разработка параллельными сессиями; Claude сам вливает в main, Контекст, Последствия, Решение

### Community 78 - "Процесс разработки (docs/development.md)"
Cohesion: 0.36
Nodes (7): Стартовый хук Claude Code (.claude/hooks/session-start.sh), git-хук Graphify (пересборка только по изменённому коду), Graphify 0.9.95 (пакет graphifyy), Смысловой слой графа (понятия, решения, связи — проход ИИ), Структурный слой графа (код, файлы, заголовки — без ИИ), Автоматизация: стартовый хук, git-хук, graphify update после git pull, Установка Graphify на Mac (brew install uv, uv tool install graphifyy)

### Community 79 - "5. Организация заметок и дизайн"
Cohesion: 0.40
Nodes (5): 5. Организация заметок и дизайн, Дизайн (D-15 — РЕШЕНО, главный принцип продукта), Организация (D-14 — РЕШЕНО по сути; структура ниже — ПРЕДЛОЖЕНО), Принципы, Реализация

### Community 80 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, lint, test, typecheck

### Community 81 - "0001-storage-in-database.md"
Cohesion: 0.16
Nodes (10): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты, Решение (+2 more)

### Community 82 - "D-35. Пометка на удалённом тексте исчезает вместе с ним"
Cohesion: 0.50
Nodes (3): D-35. Пометка на удалённом тексте исчезает вместе с ним, Рассмотренные варианты, Решение

### Community 83 - "D-36. Структура: пространство → блокноты → папки"
Cohesion: 0.50
Nodes (3): D-36. Структура: пространство → блокноты → папки, Рассмотренные варианты, Решение

### Community 84 - "D-38. Дизайн-направление — «Тихая бумага», ориентир Craft"
Cohesion: 0.50
Nodes (3): D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Рассмотренные варианты, Решение

### Community 85 - "D-41. Набор функций по мотивам Craft"
Cohesion: 0.50
Nodes (3): D-41. Набор функций по мотивам Craft, Контекст, Решение

### Community 86 - "03-pencil.md"
Cohesion: 0.09
Nodes (19): D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, 3. Apple Pencil в тексте — ключевая фича, Handwriting input types (text marks, margin notes, drawing block, drawing on images, Scribble), Pencil gestures (zigzag delete, underline, strike, lasso), Prototype open questions (multi-word circles, deleted marked text R-04), Stroke point anchoring: character anchor + dx/dy in font-size units (+11 more)

### Community 87 - "AgentsContext"
Cohesion: 0.22
Nodes (6): packages/agents — доступ внешних ИИ-агентов, Команды, Подключение в сервере, Устройство, AgentsContext, InMemoryAgentsContext

### Community 88 - "./testing"
Cohesion: 0.50
Nodes (4): exports, ./testing, default, types

### Community 95 - "Процесс разработки (docs/development.md)"
Cohesion: 0.31
Nodes (8): D-23 (документация), D-19 (код пишет Claude), D-28 (облако + Mac, CI), GitHub Actions на macOS — проверка сборки iOS, Процесс разработки (docs/development.md), Роли: пользователь — владелец продукта, Claude — пишет код и docs, Две среды: облачная сессия Claude Code (Linux) и Mac пользователя, XcodeGen (apps/ios/project.yml, ПРЕДЛОЖЕНО)

### Community 100 - "risks.md"
Cohesion: 0.28
Nodes (8): Universal Links, Apple Developer Account, R-04 Strokes on Deleted or Changed Text, R-07 Web Pen Worse than Native, R-09 Graphify Is a Young Third-Party Tool, R-12 No Paid Apple Account (7-day installs), Риски, Stage 4: Web Client

### Community 101 - "Two Notebook Modes (private E2E / for agents)"
Cohesion: 0.32
Nodes (7): VPS Hosting (Hetzner or similar), End-to-End Encryption (E2E), Private Notebook, Recovery Key for Forgotten Password, R-02 Forgotten Password Loses Private Notes, R-11 Single VPS Is a Single Point of Failure, Stage 3: Server, Sync, Encryption

### Community 102 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 103 - "9. API и внешние ИИ-агенты"
Cohesion: 0.33
Nodes (6): 9. API и внешние ИИ-агенты, Агент умеет, Безопасность, Набросок инструментов MCP (ПРЕДЛОЖЕНО), Правки агента (D-10), Реализация

### Community 105 - "data-model.md"
Cohesion: 0.22
Nodes (11): Anchor (textRange / paragraph / drawingBlock / image), Note, Stroke, StrokePoint, Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3) (+3 more)

### Community 106 - "Web client stack (PWA)"
Cohesion: 0.29
Nodes (7): Canvas + Pointer Events, Dexie (IndexedDB), Fastify, Radix + Tailwind + Motion, TipTap editor, Vite + React + TypeScript PWA, Web client stack (PWA)

### Community 107 - "Документация Datascratch (docs/README.md)"
Cohesion: 0.40
Nodes (5): Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Нумерация решений D-NN и файлы decisions/00NN-*.md, Документация Datascratch (docs/README.md), Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Оглавление docs/ (spec, architecture, decisions, roadmap, risks…)

### Community 109 - "D-19. Весь код пишет Claude"
Cohesion: 0.67
Nodes (3): D-19. Весь код пишет Claude, Последствия, Решение

### Community 110 - "7. Шифрование и доступ агентов"
Cohesion: 0.33
Nodes (6): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 112 - "D-03. Платформы: нативные iPhone и iPad + полноценный веб"
Cohesion: 0.50
Nodes (4): D-03. Платформы: нативные iPhone и iPad + полноценный веб, Контекст, Последствия, Решение

### Community 115 - "01-concept.md"
Cohesion: 0.15
Nodes (11): D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст, Решение, Final Product Name, Datascratch (+3 more)

## Knowledge Gaps
- **62 isolated node(s):** `RFC-8707`, `RFC-9728`, `RFC-8414`, `RFC-7591`, `RFC-8707` (+57 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 572 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` connect `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` to `Datascratch — правила для ИИ (CLAUDE.md)`, `Процесс разработки (docs/development.md)`, `Скрипт обновления графа`, `0031-crdt-yjs.md`, `Определение «готово» для любого изменения`, `Процесс разработки (docs/development.md)`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `registerOAuthRoutes()` (e.g. with `canonicalResource()` and `.get()`) actually correct?**
  _`registerOAuthRoutes()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-8707`, `RFC-9728`, `RFC-8414` to the rest of the system?**
  _62 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `steps` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Why does `Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов` connect `Скрипт обновления графа` to `D-29. Graphify: порядок работы, чтобы граф был всегда актуален`, `2026-10-25`, `Определение «готово» для любого изменения`, `Процесс разработки (docs/development.md)`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Should `iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)` be split into smaller, more focused modules?**
  _Cohesion score 0.12380952380952381 - nodes in this community are weakly interconnected._
- **Why does `yjs` connect `fixtures.ts` to `dependencies`, `agent-service.ts`, `context.ts`, `model.ts`, `handwriting-png.ts`, `src/index.ts`, `edits.ts`, `markdown-export.ts`, `strokes.ts`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._