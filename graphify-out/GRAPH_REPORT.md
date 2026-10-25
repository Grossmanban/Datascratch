# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 137 files · ~0 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1618 nodes · 3023 edges · 134 communities (112 shown, 22 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 221 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- oauth.test.ts
- plugin.ts (2)
- oauth.ts (2)
- InMemoryAgentsStore
- agent-service.ts
- oauth.ts (5)
- InMemoryDataSource
- model.ts
- Importer
- InMemoryUserAuth
- fixtures.ts
- AgentsStore
- edits.ts (2)
- handwriting-png.ts
- context.ts
- edits.ts
- context.ts (2)
- src/index.ts
- plugin.ts
- oauth.ts (4)
- oauth.ts
- AgentDataSource
- Скрипт обновления графа
- oauth.ts (3)
- overview.md
- 0003-platforms.md (2)
- D-30. База данных сервера — PostgreSQL (2)
- D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления
- D-39. Разработка параллельными сессиями; Claude сам вливает в main
- 4. Редактор
- 5. Организация заметок и дизайн
- scripts
- AgentsContext
- glossary.md
- 2026-10-25
- D-03. Платформы: нативные iPhone и iPad + полноценный веб
- D-23. Документация — источник истины; Graphify — граф знаний поверх неё
- D-30. База данных сервера — PostgreSQL (3)
- D-38. Дизайн-направление — «Тихая бумага», ориентир Craft
- D-41. Набор функций по мотивам Craft
- ./testing
- Контракты между частями системы
- risks.md (2)
- D-37. Гости по ссылке рисуют; ссылка живёт до отзыва
- iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)
- D-40. Хостинг — позже; сервер готов к запуску одной командой
- changelog.d/README.md
- 0031-crdt-yjs.md (4)
- dependencies (3)
- dependencies (4)
- context.ts (3)
- design-tokens/README.md
- ui/README.md
- web-editor/README.md
- risks.md
- pnpm-workspace.yaml
- 06-data-server.md
- stack.md
- 07-encryption.md
- D-29. Graphify: порядок работы, чтобы граф был всегда актуален
- Контракт: рукописные штрихи (v1)
- Контракт: REST API сервера (v1)
- Контракт: модель документа (v1)
- package.json
- devDependencies
- compilerOptions
- 11-nfr.md
- 10-sync.md
- Контракт: API для ИИ-агентов — MCP, REST, OAuth (v1, черновик)
- glossary.md (2)
- 03-pencil.md
- dependencies
- 06-data-server.md (2)
- 06-data-server.md (2)
- 01-concept.md (2)
- open-questions.md
- План разработки
- dependencies (2)
- Контракт: дизайн-токены «Тихая бумага» (v1)
- 0031-crdt-yjs.md
- 0013-collaboration-sharing.md
- 0031-crdt-yjs.md (2)
- iOS client stack
- 04-editor.md
- Контракт: шифрование (v1)
- D-30. База данных сервера — PostgreSQL
- Graphify
- Как подключить Claude или ChatGPT к Datascratch
- compilerOptions (2)
- tasks
- steps
- D-36. Структура: пространство → блокноты → папки
- Контракт: протокол синхронизации (v1)
- Документация Datascratch (docs/README.md)
- 0001-storage-in-database.md
- 0016-no-import-now.md
- 0005-living-stroke.md
- D-21. Технологический стек (2)
- 0025-no-redis.md
- Платформы и клиенты
- 3. Apple Pencil в тексте — ключевая фича
- 12. Функции по мотивам Craft
- Технологический стек — РЕШЕНО (2026-10-25)
- open-questions.md (2)
- tsconfig.build.json
- Datascratch — правила для ИИ
- Обзор архитектуры: разделы
- Дизайн и организация (2)
- Graphify (2)
- 0003-platforms.md
- 01-concept.md (3)
- Контракт: модель документа (v1) (2)
- D-01. Хранение заметок — в базе данных на своём сервере, не в файлах
- Новая группа (5)
- 0031-crdt-yjs.md (3)
- Новая группа (6)
- Этап 1 и потоки разработки
- API сервера и доступ агентов
- 01-concept.md
- Дизайн и организация
- Datascratch — правила для ИИ (CLAUDE.md)
- D-21. Технологический стек
- 09-agents-api.md
- Datascratch — правила для ИИ (CLAUDE.md) (2)
- Web client stack (PWA)
- 08-sharing.md
- MVP: блоки и функции Craft
- Datascratch — правила для ИИ (CLAUDE.md) (3)
- stack.md (2)
- Новая группа (4)
- iOS client stack (2)

## God Nodes (most connected - your core abstractions)
1. `AgentError` - 37 edges
2. `Principal` - 35 edges
3. `AgentService` - 33 edges
4. `registerOAuthRoutes()` - 32 edges
5. `childElements()` - 24 edges
6. `Контракт: REST API сервера (v1)` - 21 edges
7. `Контракт: модель документа (v1)` - 21 edges
8. `buildMcpServer()` - 20 edges
9. `contentOf()` - 20 edges
10. `InMemoryAgentsStore` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Custom stroke rendering layer over TextKit 2 (Metal or Core Animation)` --conceptually_related_to--> `iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)`  [INFERRED]
  docs/spec/03-pencil.md → apps/ios/README.md
- `iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)` --implements--> `Local storage: SQLite via GRDB (iOS), IndexedDB via Dexie (web)`  [INFERRED]
  apps/ios/README.md → docs/spec/10-sync.md
- `Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion)` --implements--> `Local storage: SQLite via GRDB (iOS), IndexedDB via Dexie (web)`  [INFERRED]
  apps/web/README.md → docs/spec/10-sync.md
- `Shared test vectors (input -> expected output) run in Swift and TypeScript` --shares_data_with--> `Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1)`  [INFERRED]
  packages/test-vectors/README.md → apps/server/README.md
- `Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1)` --implements--> `App server: Node.js + TypeScript (Fastify)`  [INFERRED]
  apps/server/README.md → docs/spec/06-data-server.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Контракты, проверяемые общими тестовыми векторами Swift/TS** — docs_architecture_contracts_readme_test_vectors, docs_architecture_contracts_crypto_crypto_contract, docs_architecture_contracts_strokes_контракт_рукописные_штрихи_v1, docs_architecture_contracts_sync_protocol_sync_protocol_contract, docs_architecture_contracts_document_model_y_prosemirror_compat [EXTRACTED 1.00]
- **iOS-Web Compatibility Without Shared Core** — docs_architecture_overview_no_shared_core, docs_architecture_stack_yrs, docs_architecture_stack_yjs, docs_architecture_stack_libsodium, docs_architecture_overview_test_vectors_package [EXTRACTED 1.00]
- **Двухслойная модель графа Graphify и кто обновляет каждый слой** — docs_decisions_0029_graphify_workflow_structural_layer, docs_decisions_0029_graphify_workflow_semantic_layer, docs_decisions_0029_graphify_workflow_git_hook, docs_decisions_0029_graphify_workflow_graphify_docs_script [EXTRACTED 1.00]
- **Parallel-session workflow (streams, contracts, coordinator, executor rules)** — docs_decisions_0039_parallel_sessions_work_streams, docs_decisions_0039_parallel_sessions_contracts, docs_decisions_0039_parallel_sessions_coordinator, docs_development_executor_rules, docs_roadmap_streams_table [EXTRACTED 1.00]
- **Encryption key custody strategies** — docs_decisions_0004_encryption_and_api_private_notebook_mode, docs_decisions_0004_encryption_and_api_agent_notebook_mode, docs_decisions_0013_collaboration_sharing_key_in_url_fragment, docs_decisions_0004_encryption_and_api_local_mcp_bridge [INFERRED 0.75]
- **Rejected extra server services (lean two-container deployment)** — docs_decisions_0025_no_redis_redis, docs_decisions_0026_file_storage_minio, docs_decisions_0022_no_rust_core_shared_rust_core, docs_decisions_0030_server_database_postgresql_mysql [INFERRED 0.75]
- **Agent access to notes model** — docs_decisions_0004_encryption_and_api_agent_notebook_mode, docs_decisions_0009_notebook_mode_choice_notebook_mode_switch_reencryption, docs_decisions_0010_agent_edits_immediate_agent_edits, docs_decisions_0011_handwriting_for_agents_handwriting_png_render, docs_decisions_0004_encryption_and_api_local_mcp_bridge [INFERRED 0.85]
- **External agent access pipeline (agent notebooks, MCP/REST, consent, PNG render)** — docs_spec_07_encryption_agent_notebooks, docs_spec_09_agents_api_remote_mcp, docs_spec_09_agents_api_rest_api, docs_spec_09_agents_api_consent_screen, docs_spec_09_agents_api_shared_service_layer, packages_agents_readme_agents_package, docs_guides_connect_ai_agents_guide [INFERRED 0.85]
- **Agent Notebook Edit Flow via MCP** — docs_architecture_overview_external_ai_agents, docs_architecture_overview_mcp_rest_api, docs_architecture_overview_edit_note_tool, docs_architecture_overview_auth_service, docs_architecture_overview_key_store, docs_glossary_row_level_security, docs_architecture_data_model_agent_audit_log [INFERRED 0.85]
- **CRDT + E2E encrypted sync design** — docs_decisions_0031_crdt_yjs_yjs, docs_decisions_0031_crdt_yjs_yrs, docs_decisions_0031_crdt_yjs_client_side_merge, docs_decisions_0021_tech_stack_end_to_end_encryption, docs_decisions_0031_crdt_yjs_relativeposition_stroke_anchor [INFERRED 0.85]
- **Handwriting anchored to CRDT text structure** — docs_decisions_0001_storage_in_database_crdt_structured_documents, docs_decisions_0005_living_stroke_living_stroke, docs_decisions_0005_living_stroke_stroke_point_anchor, docs_decisions_0005_living_stroke_textkit2_render_layer, docs_decisions_0010_agent_edits_immediate_agent_edits [INFERRED 0.85]
- **Living-stroke anchoring pipeline (strokes anchored to CRDT text positions)** — docs_spec_03_pencil_living_stroke, docs_spec_03_pencil_stroke_anchor_hypothesis, docs_spec_03_pencil_crdt_relative_position_anchors, docs_spec_03_pencil_yrs_in_prototype, docs_spec_06_data_server_handwriting_layer, docs_spec_06_data_server_crdt_block_tree [INFERRED 0.85]
- **Вход по паролю и восстановление (D-34)** — docs_decisions_0034_auth_email_password_d_34, docs_architecture_contracts_crypto_argon2id_kdf, docs_architecture_contracts_crypto_recovery_key, docs_architecture_contracts_api_auth_endpoints, docs_architecture_contracts_api_session [INFERRED 0.85]
- **Private Notebook Encrypted Sync Flow** — docs_architecture_overview_private_notebook_edit_flow, docs_architecture_overview_ios_client, docs_architecture_stack_yrs, docs_architecture_stack_grdb, docs_architecture_stack_libsodium, docs_architecture_overview_sync_realtime, docs_architecture_stack_postgresql [INFERRED 0.85]
- **Quiet Paper design system across docs and packages** — docs_decisions_0038_design_quiet_paper_quiet_paper, docs_spec_05_organization_design_shared_tokens, packages_design_tokens_readme_design_tokens, packages_ui_readme_ui, docs_roadmap_stream_design_system [INFERRED 0.85]
- **Жизненный цикл пометки на удалённом тексте (D-35)** — docs_decisions_0035_strokes_on_deleted_text_d_35, docs_architecture_contracts_strokes_deleted_text_rendering_rule, docs_architecture_contracts_sync_protocol_snapshots_compaction, docs_architecture_contracts_agents_api_agent_markdown_dialect [INFERRED 0.85]

## Communities (134 total, 22 thin omitted)

### Community 1 - "oauth.test.ts"
Cohesion: 0.07
Nodes (28): TestProvider, bearer(), agentsPlugin(), parseForm(), blockIdAt(), makeNotebookDoc(), authorize(), consent() (+20 more)

### Community 78 - "plugin.ts (2)"
Cohesion: 0.22
Nodes (4): RateLimiter, OAuthDeps, AgentsContext, InMemoryAgentsContext

### Community 20 - "oauth.ts (2)"
Cohesion: 0.29
Nodes (12): ClientRegistry, OAuthProblem, OAuthClient, scopeFor(), canonicalResource(), registerOAuthRoutes(), exchangeCode(), issue() (+4 more)

### Community 0 - "agent-service.ts"
Cohesion: 0.07
Nodes (42): AgentError, AgentService, NoteIndexCache, HandwritingItem, MarkdownOptions, Principal, FolderView, NoteMetaView (+34 more)

### Community 88 - "oauth.ts (5)"
Cohesion: 0.46
Nodes (3): GrantService, AgentGrant, Permission

### Community 44 - "InMemoryDataSource"
Cohesion: 0.19
Nodes (4): InMemoryDataSource, AgentNotebook, NotebookView, StoredNotebook

### Community 3 - "model.ts"
Cohesion: 0.13
Nodes (25): Writer, BlockLocation, Inline, inlineMarkdown(), noteToMarkdown(), wrapMarks(), atomText(), attr() (+17 more)

### Community 89 - "InMemoryUserAuth"
Cohesion: 0.25
Nodes (3): InMemoryUserAuth, UserAuth, createInMemoryContext()

### Community 15 - "fixtures.ts"
Cohesion: 0.15
Nodes (13): StrokeHint, StrokePoint, StrokeTool, NoteMetaInit, TextStrokeOptions, encodePoints(), writeStroke(), pressureCurve() (+5 more)

### Community 36 - "edits.ts (2)"
Cohesion: 0.20
Nodes (12): BuildContext, EditContext, BlockSpec, ImportOptions, InlineSpec, cloneInto(), copyChildren(), fill() (+4 more)

### Community 4 - "handwriting-png.ts"
Cohesion: 0.10
Nodes (28): Marks, BlockStyle, Glyph, Layout, Line, Painter, Pt, RenderedImage (+20 more)

### Community 45 - "context.ts"
Cohesion: 0.26
Nodes (10): AuditTarget, audited(), targetOf(), coerceQuery(), parse(), registerRestRoutes(), uuidv7(), NUMERIC (+2 more)

### Community 5 - "edits.ts"
Cohesion: 0.16
Nodes (28): EditOp, EditResult, Position, insertBlocks(), applyEdits(), convertItem(), deleteBlock(), fitRoot() (+20 more)

### Community 52 - "context.ts (2)"
Cohesion: 0.29
Nodes (9): AgentEditOrigin, AuthorizationCode, LoadedDoc, OAuthToken, UserIdentity, StoredDoc, RFC-7591, fastify (+1 more)

### Community 6 - "src/index.ts"
Cohesion: 0.12
Nodes (26): HandwritingKind, TextMark, FlatText, AnchoredStroke, AnchorKind, ResolvedAnchor, Stroke, clip() (+18 more)

### Community 8 - "plugin.ts"
Cohesion: 0.13
Nodes (19): VerifiedToken, OAuthConfig, AgentErrorCode, Bucket, RateLimitRule, AgentsPluginOptions, AgentsRuntime, FastifyInstance (+11 more)

### Community 83 - "oauth.ts (4)"
Cohesion: 0.44
Nodes (8): ConsentNotebook, ConsentPageInput, consentPage(), errorPage(), esc(), layout(), safeHost(), signInPage()

### Community 9 - "oauth.ts"
Cohesion: 0.11
Nodes (23): PendingRequest, clientAuth(), fetchClientMetadataDocument(), html(), isLoopback(), isPrivateAddress(), noStore(), redirectAllowed() (+15 more)

### Community 38 - "Скрипт обновления графа"
Cohesion: 0.27
Nodes (6): finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 61 - "oauth.ts (3)"
Cohesion: 0.21
Nodes (9): authorizationServerMetadata(), protectedResourceMetadata(), ACCESS_PREFIX, REFRESH_PREFIX, SCOPE_READ, SCOPE_WRITE, STATIC_PREFIX, VERSION (+1 more)

### Community 10 - "overview.md"
Cohesion: 0.16
Nodes (21): agent_tokens / agent_audit_log Tables, Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, File Storage (disk or external S3), Guest via Link (web, no account), Handwriting-to-PNG Render (pg-boss queue) (+13 more)

### Community 100 - "0003-platforms.md (2)"
Cohesion: 0.40
Nodes (3): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение

### Community 101 - "D-30. База данных сервера — PostgreSQL (2)"
Cohesion: 0.40
Nodes (5): D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS), Контекст, Последствия, Рассмотренные варианты, Решение

### Community 102 - "D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления"
Cohesion: 0.40
Nodes (4): D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления, Контекст, Рассмотренные варианты, Решение

### Community 103 - "D-39. Разработка параллельными сессиями; Claude сам вливает в main"
Cohesion: 0.40
Nodes (4): D-39. Разработка параллельными сессиями; Claude сам вливает в main, Контекст, Последствия, Решение

### Community 106 - "4. Редактор"
Cohesion: 0.40
Nodes (5): 4. Редактор, Платформенная реализация, Прочее, Связи, Содержимое

### Community 107 - "5. Организация заметок и дизайн"
Cohesion: 0.40
Nodes (5): 5. Организация заметок и дизайн, Дизайн (D-15 — РЕШЕНО, главный принцип продукта), Организация (D-14 — РЕШЕНО по сути; структура ниже — ПРЕДЛОЖЕНО), Принципы, Реализация

### Community 108 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, lint, test, typecheck

### Community 109 - "AgentsContext"
Cohesion: 0.40
Nodes (4): packages/agents — доступ внешних ИИ-агентов, Команды, Подключение в сервере, Устройство

### Community 11 - "glossary.md"
Cohesion: 0.11
Nodes (22): Глоссарий, doc_snapshots Table (compacted snapshots, version history), doc_updates Table (encrypted Yjs updates), Organization Hierarchy (Account > Space > Notebook > Folder > Note), Server PostgreSQL Schema (Stage 3 Draft), packages/test-vectors, libsodium (swift-sodium), pg-boss Job Queue (+14 more)

### Community 110 - "2026-10-25"
Cohesion: 0.50
Nodes (3): 2026-10-25, 2026-10-25 (вторая половина дня), Журнал изменений

### Community 111 - "D-03. Платформы: нативные iPhone и iPad + полноценный веб"
Cohesion: 0.50
Nodes (4): D-03. Платформы: нативные iPhone и iPad + полноценный веб, Контекст, Последствия, Решение

### Community 112 - "D-23. Документация — источник истины; Graphify — граф знаний поверх неё"
Cohesion: 0.50
Nodes (4): D-23. Документация — источник истины; Graphify — граф знаний поверх неё, Контекст, Последствия, Решение

### Community 113 - "D-30. База данных сервера — PostgreSQL (3)"
Cohesion: 0.50
Nodes (4): D-27. В прототипе пера текст хранится в Yrs, Контекст, Последствия, Решение

### Community 114 - "D-38. Дизайн-направление — «Тихая бумага», ориентир Craft"
Cohesion: 0.50
Nodes (3): D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Рассмотренные варианты, Решение

### Community 115 - "D-41. Набор функций по мотивам Craft"
Cohesion: 0.50
Nodes (3): D-41. Набор функций по мотивам Craft, Контекст, Решение

### Community 116 - "./testing"
Cohesion: 0.50
Nodes (4): exports, ./testing, default, types

### Community 12 - "iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)"
Cohesion: 0.12
Nodes (13): apps/ios — iPhone + iPad, apps/server — сервер, apps/web — веб-клиент, packages/shared — общие TypeScript-типы и схемы, packages/test-vectors — общие тестовые векторы, iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion) (+5 more)

### Community 13 - "risks.md"
Cohesion: 0.11
Nodes (16): Риски, Custom iOS Pen Render Layer (Metal or Core Animation), TextKit 2 (UIKit editor), VPS Hosting (Hetzner or similar), Canvas + Pointer Events Pen Layer, PencilKit / PKCanvasView, ProMotion (120 Hz), Universal Links (+8 more)

### Community 16 - "06-data-server.md"
Cohesion: 0.14
Nodes (15): 6. Модель данных и сервер, Self-hosting, Модель данных (общий обзор; детали — `architecture/data-model.md`), Резервные копии, Сервер, infra — self-hosting, Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), App server: Node.js + TypeScript (Fastify) (+7 more)

### Community 18 - "stack.md"
Cohesion: 0.16
Nodes (15): Astro (landing page), Dexie (IndexedDB), Drizzle ORM, Fastify, GitHub Actions CI (incl. macOS iOS builds), GRDB (SQLite), TypeScript on Node.js, pnpm + Turborepo Monorepo (+7 more)

### Community 2 - "07-encryption.md"
Cohesion: 0.06
Nodes (28): D-04. Одновременно сквозное шифрование и доступ по API, Контекст, Последствия, Решение, D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Рассмотренные варианты (+20 more)

### Community 21 - "D-29. Graphify: порядок работы, чтобы граф был всегда актуален"
Cohesion: 0.15
Nodes (12): Контекст, Последствия, Решение, Стартовый хук Claude Code (.claude/hooks/session-start.sh), D-23 (документация), git-хук Graphify (пересборка только по изменённому коду), Скрипт tools/graphify_docs.py (prepare → агенты → finish), Graphify 0.9.95 (пакет graphifyy) (+4 more)

### Community 22 - "Контракт: рукописные штрихи (v1)"
Cohesion: 0.15
Nodes (13): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4. Привязка к тексту (живой штрих), 5. Отрисовка толщины, 6. Тестовые векторы, Контракт: рукописные штрихи (v1), Рассмотренные варианты (+5 more)

### Community 25 - "Контракт: REST API сервера (v1)"
Cohesion: 0.13
Nodes (13): Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1), Общее, Служебное, Токены агентов (`spec/09-agents-api.md`) (+5 more)

### Community 26 - "Контракт: модель документа (v1)"
Cohesion: 0.16
Nodes (11): 1. Три вида документов Yjs, 2. Документ `account`, 3. Документ `notebook` (индекс блокнота), 5. Производные данные (не синхронизируются), 6. Версия формата, Контракт: модель документа (v1), Чернила пера и маркеры (ink.*, highlight.*), Метка agentEdit (подсветка правок агента, D-10) (+3 more)

### Community 28 - "package.json"
Cohesion: 0.14
Nodes (15): devDependencies, turbo@^2.3.0, typescript@^5.6.0, engines, node, name, packageManager, private (+7 more)

### Community 29 - "devDependencies"
Cohesion: 0.12
Nodes (16): devDependencies, fastify@^5.6.0, @modelcontextprotocol/client@^2.4.0, pixelmatch@^7, pngjs@^7, @types/mdast@^4.0.4, @types/node@^22, @types/pngjs@^6.0.5 (+8 more)

### Community 31 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+7 more)

### Community 33 - "11-nfr.md"
Cohesion: 0.13
Nodes (13): D-17. Языки интерфейса — русский и английский, без RTL, Решение, 11. Нефункциональные требования, Доступность, Надёжность, Ресурсы сервера, Языки, Russian and English UI, no RTL (+5 more)

### Community 35 - "10-sync.md"
Cohesion: 0.17
Nodes (11): 10. Синхронизация и офлайн, Как это работает (обзор), Требования, Уплотнение истории — ОТКРЫТО до этапа 3 (R-05), Attachments as separate encrypted files, on-demand resumable download, Chunked resumable attachments; thumbnails-only on iPhone, Local storage: SQLite via GRDB (iOS), IndexedDB via Dexie (web), Agent notebooks: server decrypts and applies agent edit as a normal update (+3 more)

### Community 39 - "Контракт: API для ИИ-агентов — MCP, REST, OAuth (v1, черновик)"
Cohesion: 0.14
Nodes (13): 10. Открытые вопросы (к координатору), 1. Как устроено, 2.1. Токены, 2.2. OAuth 2.1 (по спецификации MCP 2026-07-28), 2. Доступ, 3. Инструменты MCP и REST, 4. Markdown для агента (`read_note`), 5. Правки агента (D-10) (+5 more)

### Community 40 - "glossary.md (2)"
Cohesion: 0.22
Nodes (11): Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3), Штрих (черновик для прототипа), Anchor (textRange / paragraph / drawingBlock / image), Note, Stroke (+3 more)

### Community 41 - "03-pencil.md"
Cohesion: 0.18
Nodes (9): D-07. Распознавание рукописи в текст — не делаем, Решение, iOS system Scribble support, Handwriting input types (text marks, margin notes, drawing block, drawing on images, Scribble), Pencil gestures (zigzag delete, underline, strike, lasso), Stroke point anchoring: character anchor + dx/dy in font-size units, System Scribble only; no recognition of drawn ink (D-07), Editor content (headings, lists, tables, code, formulas, attachments, drawing blocks) (+1 more)

### Community 43 - "dependencies"
Cohesion: 0.14
Nodes (14): dependencies, @expo-google-fonts/newsreader@^0.4.1, mdast-util-from-markdown@^2.1.0, mdast-util-gfm@^3.1.0, micromark-extension-gfm@^3.0.0, @napi-rs/canvas@^1.0.13, yjs@^13.6.27, zod@^4.2.0 (+6 more)

### Community 46 - "06-data-server.md (2)"
Cohesion: 0.19
Nodes (11): D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Контекст, Последствия, Рассмотренные варианты, Решение, MinIO (rejected), Server disk folder storage (default), External S3-compatible storage (Hetzner, R2, B2) (+3 more)

### Community 47 - "06-data-server.md (2)"
Cohesion: 0.21
Nodes (9): D-12. Аудитория — в первую очередь для себя, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Контекст, Решение (на сейчас), Single VPS, single process server, Monetization options: subscription, one-time, open source + paid hosting (+1 more)

### Community 48 - "01-concept.md (2)"
Cohesion: 0.17
Nodes (10): D-24. Название продукта, Контекст, Решение, Datascratch, For non-Russian readers, Где что лежит, Текущий статус, Datascratch (working name) (+2 more)

### Community 49 - "open-questions.md"
Cohesion: 0.15
Nodes (11): D-28. Процесс разработки: облако + Mac, сборка iOS в CI, Контекст, Последствия, Решение, Последствия, Рассмотренные варианты, Решение, D-33. Bundle ID — com.datascratch.app (+3 more)

### Community 50 - "План разработки"
Cohesion: 0.15
Nodes (13): Критерии приёмки, План разработки, Подготовка, Потоки разработки (D-39), Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad) (+5 more)

### Community 51 - "dependencies (2)"
Cohesion: 0.15
Nodes (12): description, engines, node, files, main, name, peerDependencies, fastify@^5.0.0 (+4 more)

### Community 53 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.17
Nodes (11): Движение, Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема), Рендер рукописи в PNG (@napi-rs/canvas), Цветовые токены (светлая/тёмная тема), Движение: пружины, длительности, тактильная отдача, packages/design-tokens/tokens.json → CSS и Swift (+3 more)

### Community 54 - "0031-crdt-yjs.md"
Cohesion: 0.27
Nodes (9): TipTap editor, Pen prototype (stage 1), Automerge (fallback CRDT), Encrypted history compaction by clients (R-05, stage 3), Last-write-wins (unsuitable), Loro (too early), Yjs RelativePosition as stroke-point anchor, Yjs (+1 more)

### Community 55 - "0013-collaboration-sharing.md"
Cohesion: 0.20
Nodes (9): D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Последствия, Решение, 8. Совместная работа и шеринг, Гости (D-37), Реализация, Требования, Link sharing with editing without account (+1 more)

### Community 56 - "0031-crdt-yjs.md (2)"
Cohesion: 0.20
Nodes (5): D-19. Весь код пишет Claude, Последствия, Решение, docs/history session log, R-09 Graphify Is a Young Third-Party Tool

### Community 57 - "iOS client stack"
Cohesion: 0.20
Nodes (10): D-22. Без собственного общего ядра на Rust, Контекст, Последствия, Рассмотренные варианты, Решение, Node.js + TypeScript server, Swift 6, TypeScript (+2 more)

### Community 60 - "04-editor.md"
Cohesion: 0.21
Nodes (7): Obsidian (reference product: links, backlinks, tags, Markdown export), Backlinks, Export: Markdown, PDF, HTML (handwriting as images), iOS editor: UIKit + TextKit 2, Link graph view (not in MVP, stage 6), Web editor: TipTap (ProseMirror) + Yjs, [[ ]] links with autocomplete

### Community 64 - "Контракт: шифрование (v1)"
Cohesion: 0.18
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 65 - "D-30. База данных сервера — PostgreSQL"
Cohesion: 0.18
Nodes (10): D-30. База данных сервера — PostgreSQL, Контекст, Последствия, Рассмотренные варианты, Решение, GRDB (SQLite), MongoDB (rejected), MySQL (rejected) (+2 more)

### Community 66 - "Graphify"
Cohesion: 0.18
Nodes (11): Graphify, Автоматизация, Команды, Обновление графа после правки документов (по шагам), Почему два способа обновления, Установка на Mac (один раз), Что где лежит, tools/graphify_docs.py prepare/finish (+3 more)

### Community 67 - "Как подключить Claude или ChatGPT к Datascratch"
Cohesion: 0.18
Nodes (10): ChatGPT, Claude (claude.ai, приложение Claude, Claude Code), Агент без OAuth или свой скрипт, Если что-то не работает, Как подключить Claude или ChatGPT к Datascratch, Управление доступом, Что получит агент, Шаг 1. Включите режим «для агентов» у блокнота (+2 more)

### Community 68 - "compilerOptions (2)"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, module, moduleResolution, noEmit, rootDir, types, extends (+2 more)

### Community 69 - "tasks"
Cohesion: 0.18
Nodes (10): dependsOn, outputs, $schema, tasks, build, lint, test, typecheck (+2 more)

### Community 7 - "steps"
Cohesion: 0.07
Nodes (26): concurrency, cancel-in-progress, group, CI, jobs, test, name, paths (+18 more)

### Community 70 - "D-36. Структура: пространство → блокноты → папки"
Cohesion: 0.22
Nodes (8): Решение, Рассмотренные варианты, Решение, Открытый вопрос: имена блокнотов/пространств для агентов в meta документа notebook, Документ account (пространства, NotebookRef, настройки), Документ notebook — индекс блокнота (папки, NoteMeta, теги), D-14. Организация: богатая, но не перегруженная, D-36. Структура: пространство → блокноты → папки

### Community 71 - "Контракт: протокол синхронизации (v1)"
Cohesion: 0.20
Nodes (9): 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05), 6. Права, 7. Коды ошибок, 8. Тестовые векторы (+1 more)

### Community 72 - "Документация Datascratch (docs/README.md)"
Cohesion: 0.20
Nodes (9): Документация Datascratch, История, Как вносить изменения, Оглавление, Порядок чтения для новичка, Соглашения, Ссылки на решения, Статусы (+1 more)

### Community 73 - "0001-storage-in-database.md"
Cohesion: 0.27
Nodes (5): Markdown files option (rejected), Obsidian, Own server storage, Real-time collaborative editing, PostgreSQL

### Community 74 - "0016-no-import-now.md"
Cohesion: 0.20
Nodes (7): D-16. Импорт — не сейчас, Решение, D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, Notesnook, Import from Obsidian/Notesnook (later), No import for now (D-16), Current status: stack approved, next is stage 1 pencil prototype

### Community 75 - "0005-living-stroke.md"
Cohesion: 0.24
Nodes (6): D-05. Перо при перекладке текста — вариант А «живой штрих», Гипотеза реализации, Контекст, Последствия, Решение, PencilKit (rejected)

### Community 76 - "D-21. Технологический стек (2)"
Cohesion: 0.20
Nodes (9): D-21. Технологический стек, Контекст, Последствия, Рассмотренные варианты (по обсуждению 2026-10-25), Решение, docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack (+1 more)

### Community 77 - "0025-no-redis.md"
Cohesion: 0.24
Nodes (9): D-25. Redis не используем, Будущее, Контекст, Последствия, Решение, Edit broadcast interface (in-memory), PostgreSQL LISTEN/NOTIFY, Redis (rejected) (+1 more)

### Community 80 - "Платформы и клиенты"
Cohesion: 0.22
Nodes (7): D-06. Рисование пальцем на iPhone — да, опционально, Решение, 2. Платформы, Минимальная версия iOS/iPadOS — 26 (D-32), Тестовые устройства (известно на 2026-10-25), Требования, Finger drawing toggle on iPhone

### Community 81 - "3. Apple Pencil в тексте — ключевая фича"
Cohesion: 0.22
Nodes (9): 3. Apple Pencil в тексте — ключевая фича, Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера, Перекладка текста — вариант А «живой штрих» (D-05, РЕШЕНО) (+1 more)

### Community 82 - "12. Функции по мотивам Craft"
Cohesion: 0.22
Nodes (8): 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft, Связь с моделью данных

### Community 85 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 87 - "open-questions.md (2)"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 90 - "tsconfig.build.json"
Cohesion: 0.25
Nodes (7): compilerOptions, noEmit, outDir, rootDir, extends, include, ./tsconfig.json

### Community 91 - "Datascratch — правила для ИИ"
Cohesion: 0.29
Nodes (7): Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой, Правила, Среда разработки

### Community 92 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 93 - "Дизайн и организация (2)"
Cohesion: 0.33
Nodes (4): D-15. Дизайн — основная концепция продукта, Последствия, Решение, Design references: Things 3, Linear, Craft, Arc

### Community 94 - "Graphify (2)"
Cohesion: 0.29
Nodes (6): Git, Две среды, Конец сессии, Кто что делает, Правила для сессий-исполнителей (D-39), Процесс разработки

### Community 97 - "01-concept.md (3)"
Cohesion: 0.33
Nodes (6): 1. Концепция продукта, Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения, Суть в одном абзаце

### Community 98 - "Контракт: модель документа (v1) (2)"
Cohesion: 0.40
Nodes (5): 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note`

### Community 99 - "D-01. Хранение заметок — в базе данных на своём сервере, не в файлах"
Cohesion: 0.40
Nodes (5): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 104 - "Новая группа (5)"
Cohesion: 0.40
Nodes (3): Stream core (packages/shared, test-vectors), Shared crypto test vectors (packages/test-vectors), TODO(core): replace local doc helpers with @datascratch/shared

### Community 105 - "0031-crdt-yjs.md (3)"
Cohesion: 0.40
Nodes (3): Stage 0 preparation (done), Stage 5 API and MCP for agents, PostgreSQL Row-Level Security for agent permissions

### Community 14 - "Этап 1 и потоки разработки"
Cohesion: 0.12
Nodes (11): docker compose up one-command server launch, Open: server hosting and domain, Open: living stroke details (multi-word circles, cross-line arrows), Pen prototype acceptance criteria (120 fps, no drift), Stage 1 pen-in-text prototype (iPad), Stream ios-editor (DSEditor), Stream server (apps/server, infra), Handwriting fragment rendered as PNG with text annotation (+3 more)

### Community 17 - "API сервера и доступ агентов"
Cohesion: 0.18
Nodes (14): Разрешение агента (grant): static / oauth, Форматы токенов агентов (dsa_, dso_at_, dso_rt_, dso_code_), хранится SHA-256, Контекст плагина: интерфейс с сервером (data, users, store), Вложения по кускам /attachments (лимит 200 МБ), Эндпоинты аутентификации /auth (prelogin, signup, login, recovery), Блокноты и документы: /notebooks, /docs, версии, Session (accessToken 15 мин, refreshToken 30 дней с ротацией), Режим «для агентов»: notebookKey обёрнут serverKey (DS_KMS_KEY) (+6 more)

### Community 19 - "01-concept.md"
Cohesion: 0.14
Nodes (13): Enable agent access mode on notebook, Open: MCP tool set, Agent-mode notebooks (server-held key), Future local MCP bridge for private notebooks, Per-notebook key wrapped by master or server key, Private notebooks (E2E, Notesnook-like), Login keys derived from password + recovery key (R-02), Server key stored separately from DB (R-10) (+5 more)

### Community 23 - "Дизайн и организация"
Cohesion: 0.18
Nodes (13): Craft as visual reference, Quiet Paper (Тихая бумага) design direction, Rejected design options: Clean Neutral, Graphite, Stream design-system, Command palette (Cmd+K), Design principles: minimal buttons, command palette, own design system, Radix + Tailwind + Motion web design system, Single design-token source for iOS and web (+5 more)

### Community 27 - "Datascratch — правила для ИИ (CLAUDE.md)"
Cohesion: 0.18
Nodes (12): Architecture contracts (docs/architecture/contracts), Claude coordinator session merges to main on green CI, Work streams with ownership zones (claude/<stream> branches), docs/changelog.d changelog fragments, Rules for executor sessions (D-39), XcodeGen project.yml, Stream ios-app, Stream ios-core (DSCore) (+4 more)

### Community 32 - "D-21. Технологический стек"
Cohesion: 0.18
Nodes (10): Типы TS контрактов packages/shared/src/contracts, Общие тестовые векторы packages/test-vectors, Сообщения hello/subscribe/push/snapshot/awareness и welcome/updates/ack, history/ — архив, исключён из графа Graphify, Контракты между частями системы (iOS ↔ веб ↔ сервер), Контракт: протокол синхронизации по WebSocket (v1), Фрагмент журнала: пакет @datascratch/agents, Журнал изменений (CHANGELOG) (+2 more)

### Community 34 - "09-agents-api.md"
Cohesion: 0.18
Nodes (15): Agent access management: list, journal, revoke, Claude/ChatGPT custom MCP connector at /mcp, Static agent token dsa_ (Bearer), Agent connection troubleshooting table, Stream agents, OAuth consent screen (notebooks + permissions), Rate limit 120 requests/min per connection, Remote MCP server (Streamable HTTP, OAuth 2.1) (+7 more)

### Community 37 - "Datascratch — правила для ИИ (CLAUDE.md) (2)"
Cohesion: 0.14
Nodes (8): Public repository for free macOS CI runners, GitHub Actions macOS iOS build CI, Two environments: cloud Linux session and user's Mac, Native-only iOS editor (no WebView), Test devices: Apple Silicon Mac, iPad with Apple Pencil Pro, Universal iPhone+iPad app, one codebase, Web without cuts (full parity, PWA, Pointer Events), Spec 2: Platforms

### Community 42 - "Web client stack (PWA)"
Cohesion: 0.20
Nodes (12): Canvas + Pointer Events, Dexie (IndexedDB), Drizzle ORM, Fastify, MCP TypeScript SDK, OAuth 2.1, pg-boss job queue, Radix + Tailwind + Motion (+4 more)

### Community 58 - "08-sharing.md"
Cohesion: 0.18
Nodes (9): Guest drawing via edit link, Share link valid until revoked, Decision statuses: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО / ЗАМЕНЕНО, Stage 4 web client, Encryption key in URL fragment after # (Excalidraw-style), Real-time co-editing, cursors, presence, Universal Links (apple-app-site-association), Decision log (ADR table) (+1 more)

### Community 59 - "MVP: блоки и функции Craft"
Cohesion: 0.23
Nodes (10): Open: Craft features MVP / post-MVP split, Stage 2 MVP on iPad/iPhone, local, Stream web-editor, Rich blocks (table, code, LaTeX, Mermaid, drawing, doc card, kanban, board), Collections (table/gallery/kanban views), Daily notes and Calendar screen, Document cover, style, paper, backdrop, Document model contract (document-model.md) (+2 more)

### Community 63 - "Datascratch — правила для ИИ (CLAUDE.md) (3)"
Cohesion: 0.20
Nodes (7): Перед любой работой: порядок чтения, Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, Datascratch — правила для ИИ (CLAUDE.md)

### Community 79 - "stack.md (2)"
Cohesion: 0.31
Nodes (9): Web PWA Client (React, TipTap, Yjs, IndexedDB), Automerge (fallback CRDT), TipTap (ProseMirror), Vite + React + TypeScript PWA, Yjs, Yrs (Rust Yjs) with Swift Wrapper, CRDT, PWA (+1 more)

### Community 84 - "Новая группа (4)"
Cohesion: 0.25
Nodes (7): Fastify-плагин @datascratch/agents, Экран согласия OAuth «Тихая бумага» (без JS, HMAC-состояние), MCP-сервер /mcp (SDK v2, Streamable HTTP, без состояния), Сервер авторизации OAuth 2.1 (CIMD, RFC 7591, PKCE S256), Шеринг /shares и гостевой токен, Ссылка шеринга с ключом после # (не уходит на сервер), Права в синхронизации: user, guest; агенты не подключаются по WebSocket

### Community 86 - "iOS client stack (2)"
Cohesion: 0.25
Nodes (7): Custom pen renderer (Metal vs Core Animation TBD), End-to-end encryption, iOS client stack, SwiftUI (shell), UIKit + TextKit 2 (editor), libsodium, Operational Transformation (unsuitable)

## Knowledge Gaps
- **97 isolated node(s):** `RFC-9562`, `RFC-7591`, `RFC-8707`, `../../tsconfig.base.json`, `RFC-8414` (+92 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 638 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `D-28. Процесс разработки: облако + Mac, сборка iOS в CI` connect `open-questions.md` to `D-21. Технологический стек`, `stack.md`, `Datascratch — правила для ИИ (CLAUDE.md)`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `registerOAuthRoutes()` (e.g. with `canonicalResource()` and `.now()`) actually correct?**
  _`registerOAuthRoutes()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-9562`, `RFC-7591`, `RFC-8707` to the rest of the system?**
  _97 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `oauth.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07482993197278912 - nodes in this community are weakly interconnected._
- **Why does `Журнал изменений (CHANGELOG)` connect `D-21. Технологический стек` to `open-questions.md`, `D-36. Структура: пространство → блокноты → папки`, `API сервера и доступ агентов`, `Контракт: рукописные штрихи (v1)`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Should `InMemoryAgentsStore` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Why does `D-39 Parallel sessions; Claude merges into main` connect `Datascratch — правила для ИИ (CLAUDE.md)` to `09-agents-api.md`, `Datascratch — правила для ИИ (CLAUDE.md) (2)`, `Дизайн и организация`, `08-sharing.md`, `MVP: блоки и функции Craft`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._