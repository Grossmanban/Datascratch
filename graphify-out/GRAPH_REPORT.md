# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 4 files · ~13,105 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 680 nodes · 1197 edges · 47 communities (45 shown, 2 thin omitted)
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 189 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Название продукта и ощущение пера
- Аудитория, монетизация, один VPS
- Хранение в БД и экспорт
- Части монорепозитория
- Перо в тексте: виды ввода
- Заменяемые компоненты стека
- Части монорепозитория (2)
- План этапов
- Дизайн-система
- Стек: библиотеки
- Синхронизация и офлайн
- Концепция продукта
- Сквозное шифрование и восстановление
- Шеринг и совместная правка
- Журнал изменений и стек
- Модель данных: штрихи и якоря
- Код пишет Claude
- Модель данных: штрихи и якоря (2)
- Архитектура: сервер и агенты
- Режимы блокнотов и ключи
- CI и инфраструктура
- iOS-стек и два языка
- Рукопись для агентов
- Соглашения репозитория
- Процесс разработки и Graphify
- PostgreSQL, RLS, очередь
- CI и инфраструктура (2)
- Стек: разделы документа
- Yrs в прототипе
- Название продукта и ощущение пера (2)
- Оглавление документации
- Шифрование плюс API
- Обзор архитектуры: разделы
- Рукопись для агентов (2)
- Права агентов и ключи
- Живой штрих и «готово»
- Шифрование: разделы
- API агентов: разделы
- D-05: разделы
- D-21: разделы
- Без ядра на Rust
- D-25: разделы
- D-30: разделы
- CRDT Yjs
- Шифрование плюс API (2)
- D-23: разделы
- CI и инфраструктура (3)

## God Nodes (most connected - your core abstractions)
1. `Stage 1: Pen-in-Text Prototype (iPad)` - 16 edges
2. `Stage 0: Preparation (done)` - 13 edges
3. `CLAUDE.md AI rules` - 13 edges
4. `Risk register (R-01..R-13)` - 13 edges
5. `PostgreSQL` - 12 edges
6. `Yrs (Rust Yjs) with Swift Wrapper` - 12 edges
7. `Graphify` - 12 edges
8. `D-29 Graphify workflow: keep graph always current` - 11 edges
9. `MCP + REST API` - 10 edges
10. `Sync / Realtime Service` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1)` --implements--> `App server: Node.js + TypeScript (Fastify)`  [INFERRED]
  apps/server/README.md → docs/spec/06-data-server.md
- `Git workflow: branches + PR; one commit = code + docs + updated graph` --semantically_similar_to--> `Language rules (Russian with user and docs, English for code/commits)`  [INFERRED] [semantically similar]
  docs/development.md → CLAUDE.md
- `Graphify commands (query, explain, path, update, check-update, /graphify)` --semantically_similar_to--> `graphify rules: query/path/explain before grep or file reads`  [INFERRED] [semantically similar]
  docs/development.md → CLAUDE.md
- `Custom stroke rendering layer over TextKit 2 (Metal or Core Animation)` --conceptually_related_to--> `iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium)`  [INFERRED]
  docs/spec/03-pencil.md → apps/ios/README.md
- `Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1)` --implements--> `Remote MCP server (Streamable HTTP, OAuth 2.1)`  [INFERRED]
  apps/server/README.md → docs/spec/09-agents-api.md

## Hyperedges (group relationships)
- **iOS-Web Compatibility Without Shared Core** — docs_architecture_overview_no_shared_core, docs_architecture_stack_yrs, docs_architecture_stack_yjs, docs_architecture_stack_libsodium, docs_architecture_overview_test_vectors_package [EXTRACTED 1.00]
- **Mechanism keeping the Graphify graph current** — docs_decisions_0029_graphify_workflow_structural_layer, docs_decisions_0029_graphify_workflow_semantic_layer, docs_decisions_0029_graphify_workflow_git_hook, docs_decisions_0029_graphify_workflow_session_start_hook, claude_definition_of_done, docs_decisions_0029_graphify_workflow_graph_in_repo [EXTRACTED 1.00]
- **Cloud-written iOS code to iPad build path** — docs_development_two_environments, docs_development_github_actions_macos_ci, docs_development_xcodegen, claude_ios_must_build_rule, docs_risks_r_12 [INFERRED 0.75]
- **Encryption key custody strategies** — docs_decisions_0004_encryption_and_api_private_notebook_mode, docs_decisions_0004_encryption_and_api_agent_notebook_mode, docs_decisions_0013_collaboration_sharing_key_in_url_fragment, docs_decisions_0004_encryption_and_api_local_mcp_bridge [INFERRED 0.75]
- **Rejected extra server services (lean two-container deployment)** — docs_decisions_0025_no_redis_redis, docs_decisions_0026_file_storage_minio, docs_decisions_0022_no_rust_core_shared_rust_core, docs_decisions_0030_server_database_postgresql_mysql [INFERRED 0.75]
- **Agent access to notes model** — docs_decisions_0004_encryption_and_api_agent_notebook_mode, docs_decisions_0009_notebook_mode_choice_notebook_mode_switch_reencryption, docs_decisions_0010_agent_edits_immediate_agent_edits, docs_decisions_0011_handwriting_for_agents_handwriting_png_render, docs_decisions_0004_encryption_and_api_local_mcp_bridge [INFERRED 0.85]
- **External agent access surface (MCP/REST, tokens, RLS, audit log, PNG ink)** — docs_spec_09_agents_api_remote_mcp_server, docs_spec_09_agents_api_rest_api, docs_spec_09_agents_api_thin_mcp_over_service_layer, docs_spec_09_agents_api_token_permissions_rls, docs_spec_09_agents_api_agent_action_log, docs_spec_09_agents_api_rate_limits, docs_spec_09_agents_api_handwriting_as_png, docs_spec_09_agents_api_mcp_tools_sketch [INFERRED 0.85]
- **Agent Notebook Edit Flow via MCP** — docs_architecture_overview_external_ai_agents, docs_architecture_overview_mcp_rest_api, docs_architecture_overview_edit_note_tool, docs_architecture_overview_auth_service, docs_architecture_overview_key_store, docs_glossary_row_level_security, docs_architecture_data_model_agent_audit_log [INFERRED 0.85]
- **CRDT + E2E encrypted sync design** — docs_decisions_0031_crdt_yjs_yjs, docs_decisions_0031_crdt_yjs_yrs, docs_decisions_0031_crdt_yjs_client_side_merge, docs_decisions_0021_tech_stack_end_to_end_encryption, docs_decisions_0031_crdt_yjs_relativeposition_stroke_anchor [INFERRED 0.85]
- **Dual-mode encryption and sync flow (private relay vs agent decrypt)** — docs_spec_07_encryption_two_notebook_modes, docs_spec_07_encryption_private_notebooks, docs_spec_07_encryption_agent_notebooks, docs_spec_10_sync_encrypted_update_relay, docs_spec_10_sync_server_side_agent_merge, docs_spec_07_encryption_per_notebook_key_wrapping, docs_spec_07_encryption_server_key_separate_from_db [INFERRED 0.85]
- **Handwriting anchored to CRDT text structure** — docs_decisions_0001_storage_in_database_crdt_structured_documents, docs_decisions_0005_living_stroke_living_stroke, docs_decisions_0005_living_stroke_stroke_point_anchor, docs_decisions_0005_living_stroke_textkit2_render_layer, docs_decisions_0010_agent_edits_immediate_agent_edits [INFERRED 0.85]
- **Living-stroke anchoring pipeline (strokes anchored to CRDT text positions)** — docs_spec_03_pencil_living_stroke, docs_spec_03_pencil_stroke_anchor_hypothesis, docs_spec_03_pencil_crdt_relative_position_anchors, docs_spec_03_pencil_yrs_in_prototype, docs_spec_06_data_server_handwriting_layer, docs_spec_06_data_server_crdt_block_tree [INFERRED 0.85]
- **Risks around the pen-in-text feature** — claude_pen_in_text, docs_risks_r_01, docs_risks_r_04, docs_risks_r_07 [INFERRED 0.85]
- **Private Notebook Encrypted Sync Flow** — docs_architecture_overview_private_notebook_edit_flow, docs_architecture_overview_ios_client, docs_architecture_stack_yrs, docs_architecture_stack_grdb, docs_architecture_stack_libsodium, docs_architecture_overview_sync_realtime, docs_architecture_stack_postgresql [INFERRED 0.85]

## Communities (47 total, 2 thin omitted)

### Community 0 - "Название продукта и ощущение пера"
Cohesion: 0.06
Nodes (42): CLAUDE.md AI rules, Datascratch (note app: Apple Pencil in text, Obsidian+Notesnook hybrid, MCP/REST agents), Decision statuses: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Pen in text (strokes anchored to words, reflow with text), End-of-session record docs/history/YYYY-MM-DD-session-NN.md, D-23 (documentation decision), D-29 Graphify workflow: keep graph always current, Graphify git hook (graphify hook install; structural layer only) (+34 more)

### Community 1 - "Аудитория, монетизация, один VPS"
Cohesion: 0.06
Nodes (31): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, Контекст, Решение (на сейчас) (+23 more)

### Community 2 - "Хранение в БД и экспорт"
Cohesion: 0.07
Nodes (25): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты, Решение (+17 more)

### Community 3 - "Части монорепозитория"
Cohesion: 0.07
Nodes (24): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, D-03. Платформы: нативные iPhone и iPad + полноценный веб, Full-featured web client (TypeScript), Контекст, Последствия, Решение (+16 more)

### Community 4 - "Перо в тексте: виды ввода"
Cohesion: 0.07
Nodes (21): D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, Риски, Web without cuts: full feature parity with iOS (R-07 pen quality risk), 3. Apple Pencil в тексте — ключевая фича, Handwriting input types (text marks, margin notes, drawing block, drawing on images, Scribble), Pencil gestures (zigzag delete, underline, strike, lasso) (+13 more)

### Community 5 - "Заменяемые компоненты стека"
Cohesion: 0.09
Nodes (26): Canvas + Pointer Events, Dexie (IndexedDB), Drizzle ORM, Fastify, MCP TypeScript SDK, OAuth 2.1, pg-boss job queue, Radix + Tailwind + Motion (+18 more)

### Community 6 - "Части монорепозитория (2)"
Cohesion: 0.09
Nodes (20): apps/ios — iPhone + iPad, iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), apps/server — сервер, Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), apps/web — веб-клиент, Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), Datascratch — правила для ИИ (+12 more)

### Community 7 - "План этапов"
Cohesion: 0.09
Nodes (22): VPS Hosting (Hetzner or similar), D-08. Аннотации PDF пером — не в MVP, Решение (предложение), D-16. Импорт — не сейчас, Решение, PDF Annotations Not in MVP, Stage 2: Local MVP on iPad and iPhone, Stage 3: Server, Sync, Encryption (+14 more)

### Community 8 - "Дизайн-система"
Cohesion: 0.09
Nodes (20): D-14. Организация: богатая, но не перегруженная, Spaces, nested folders, smart tags, colors, Решение, D-15. Дизайн — основная концепция продукта, Design references: Things 3, Linear, Craft, Arc, Последствия, Решение, Organization Structure (notebook vs space vs folder) (+12 more)

### Community 9 - "Стек: библиотеки"
Cohesion: 0.13
Nodes (22): Web PWA Client (React, TipTap, Yjs, IndexedDB), Astro (landing page), Dexie (IndexedDB), Drizzle ORM, Fastify, GRDB (SQLite), Custom iOS Pen Render Layer (Metal or Core Animation), TypeScript on Node.js (+14 more)

### Community 10 - "Синхронизация и офлайн"
Cohesion: 0.13
Nodes (15): D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение, Agent edits applied immediately, highlighted, revertible via history (D-10), 10. Синхронизация и офлайн, Local storage: SQLite via GRDB (iOS), IndexedDB via Dexie (web) (+7 more)

### Community 11 - "Концепция продукта"
Cohesion: 0.10
Nodes (17): D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст, Решение, Final Product Name, 1. Концепция продукта (+9 more)

### Community 12 - "Сквозное шифрование и восстановление"
Cohesion: 0.14
Nodes (16): doc_updates Table (encrypted Yjs updates), Organization Hierarchy (Account > Space > Notebook > Folder > Note), Monorepo Structure (apps/, packages/, infra/), packages/test-vectors, libsodium (swift-sodium), End-to-End Encryption (E2E), Predicted / Coalesced Touches, Private Notebook (+8 more)

### Community 13 - "Шеринг и совместная правка"
Cohesion: 0.16
Nodes (12): D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account, Universal Links (paid Apple Developer account), Последствия, Решение, 8. Совместная работа и шеринг, Guest editing without account in any browser, Share links with view/edit rights, expiry and revocation (+4 more)

### Community 14 - "Журнал изменений и стек"
Cohesion: 0.24
Nodes (12): End-to-end encryption, libsodium, Pen prototype (stage 1), Automerge (fallback CRDT), Encrypted history compaction by clients (R-05, stage 3), Last-write-wins (unsuitable), Loro (too early), Operational Transformation (unsuitable) (+4 more)

### Community 15 - "Модель данных: штрихи и якоря"
Cohesion: 0.21
Nodes (11): File Storage (disk or external S3), Guest via Link (web, no account), iOS / iPadOS Client (Swift, TextKit 2, Yrs, GRDB), Private Notebook Edit Flow, Sync / Realtime Service, Automerge (fallback CRDT), MinIO (rejected), Yrs (Rust Yjs) with Swift Wrapper (+3 more)

### Community 16 - "Код пишет Claude"
Cohesion: 0.19
Nodes (5): D-19. Весь код пишет Claude, Последствия, Решение, docs/history session log, Журнал решений (ADR)

### Community 17 - "Модель данных: штрихи и якоря (2)"
Cohesion: 0.23
Nodes (10): Anchor (textRange / paragraph / drawingBlock / image), Note, Stroke, StrokePoint, Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3) (+2 more)

### Community 18 - "Архитектура: сервер и агенты"
Cohesion: 0.21
Nodes (13): Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, Key Store (agent notebooks), MCP + REST API, Official MCP TypeScript SDK (Streamable HTTP, OAuth 2.1), Notebook for Agents (+5 more)

### Community 19 - "Режимы блокнотов и ключи"
Cohesion: 0.23
Nodes (9): D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, Space -> notebook -> folder relation (open; encryption mode per notebook, D-09), Attachments as separate encrypted files, on-demand resumable download, Argon2id password key derivation, libsodium on all platforms (swift-sodium, libsodium-wrappers), Two notebook modes chosen at creation, switchable with client re-encryption (D-09), XChaCha20-Poly1305 content encryption (+1 more)

### Community 20 - "CI и инфраструктура"
Cohesion: 0.20
Nodes (9): docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, Redis (rejected), Valkey (free Redis alternative), iOS build and tests on macOS CI runner per push, MongoDB (rejected) (+1 more)

### Community 21 - "iOS-стек и два языка"
Cohesion: 0.18
Nodes (11): Custom pen renderer (Metal vs Core Animation TBD), GRDB (SQLite), iOS client stack, Node.js + TypeScript server, Swift 6, SwiftUI (shell), TypeScript, UIKit + TextKit 2 (editor) (+3 more)

### Community 22 - "Рукопись для агентов"
Cohesion: 0.24
Nodes (9): pg-boss background job queue on PostgreSQL, PostgreSQL via Drizzle (D-30): accounts, notebooks, rights, tokens, encrypted updates, snapshots, agent log, Local MCP bridge (future): local utility holding key for agent access to private notebooks, Log of all agent actions, MCP tools sketch (list_spaces, list_notebooks, search_notes, read_note, get_handwriting_image, create_note, edit_note, add_comment, get_backlinks), Request rate limits, Remote MCP server (Streamable HTTP, OAuth 2.1), REST API (+1 more)

### Community 23 - "Соглашения репозитория"
Cohesion: 0.25
Nodes (5): 2026-10-25, Журнал изменений, ADR (Architecture Decision Record), history/ Archive, Newcomer Reading Order

### Community 24 - "Процесс разработки и Graphify"
Cohesion: 0.18
Nodes (11): Git, Graphify, Автоматизация, Две среды, Команды, Конец сессии, Кто что делает, Почему два способа обновления (+3 more)

### Community 25 - "PostgreSQL, RLS, очередь"
Cohesion: 0.29
Nodes (9): agent_tokens / agent_audit_log Tables, doc_snapshots Table (compacted snapshots, version history), Server PostgreSQL Schema (Stage 3 Draft), Handwriting-to-PNG Render (pg-boss queue), docker compose Self-Hosting (server + PostgreSQL), pg-boss Job Queue, PostgreSQL, Snapshot (+1 more)

### Community 26 - "CI и инфраструктура (2)"
Cohesion: 0.36
Nodes (8): GitHub Actions CI (incl. macOS iOS builds), XcodeGen, Mixed cloud + Mac development mode, XcodeGen (project.yml) - proposed, Living Stroke, Minimum iOS/iPadOS Version, Stroke on Deleted Text, Stage 1: Pen-in-Text Prototype (iPad)

### Community 27 - "Стек: разделы документа"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 28 - "Yrs в прототипе"
Cohesion: 0.21
Nodes (8): D-27. В прототипе пера текст хранится в Yrs, Контекст, Последствия, Решение, D-29. Graphify: порядок работы, чтобы граф был всегда актуален, Контекст, Последствия, Решение

### Community 29 - "Название продукта и ощущение пера (2)"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 30 - "Оглавление документации"
Cohesion: 0.25
Nodes (8): Документация Datascratch, История, Как вносить изменения, Оглавление, Порядок чтения для новичка, Соглашения, Ссылки на решения, Статусы

### Community 32 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 33 - "Рукопись для агентов (2)"
Cohesion: 0.29
Nodes (6): D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Handwriting Format for Agents (PNG), Export: Markdown, PDF, HTML (handwriting as images), Server responsibilities: accounts, encrypted relay, attachments, realtime, API/MCP, handwriting PNG render, Handwriting rendered to PNG for agents with text annotation (D-11)

### Community 34 - "Права агентов и ключи"
Cohesion: 0.29
Nodes (4): Notesnook (reference product: E2E encryption, reliable sync), Per-notebook key wrapped by user master key or server key, Private notebooks: key from password, server stores only ciphertext, no agent access, Agent capabilities: search/read Markdown, block-level edits, comments, links/tags/backlinks

### Community 36 - "Шифрование: разделы"
Cohesion: 0.33
Nodes (6): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 37 - "API агентов: разделы"
Cohesion: 0.33
Nodes (6): 9. API и внешние ИИ-агенты, Агент умеет, Безопасность, Набросок инструментов MCP (ПРЕДЛОЖЕНО), Правки агента (D-10), Реализация

### Community 38 - "D-05: разделы"
Cohesion: 0.40
Nodes (5): D-05. Перо при перекладке текста — вариант А «живой штрих», Гипотеза реализации, Контекст, Последствия, Решение

### Community 39 - "D-21: разделы"
Cohesion: 0.40
Nodes (5): D-21. Технологический стек, Контекст, Последствия, Рассмотренные варианты (по обсуждению 2026-10-25), Решение

### Community 40 - "Без ядра на Rust"
Cohesion: 0.40
Nodes (5): D-22. Без собственного общего ядра на Rust, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 41 - "D-25: разделы"
Cohesion: 0.40
Nodes (5): D-25. Redis не используем, Будущее, Контекст, Последствия, Решение

### Community 42 - "D-30: разделы"
Cohesion: 0.40
Nodes (5): D-30. База данных сервера — PostgreSQL, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 43 - "CRDT Yjs"
Cohesion: 0.40
Nodes (5): D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS), Контекст, Последствия, Рассмотренные варианты, Решение

### Community 44 - "Шифрование плюс API (2)"
Cohesion: 0.50
Nodes (4): D-04. Одновременно сквозное шифрование и доступ по API, Контекст, Последствия, Решение

### Community 45 - "D-23: разделы"
Cohesion: 0.50
Nodes (4): D-23. Документация — источник истины; Graphify — граф знаний поверх неё, Контекст, Последствия, Решение

### Community 46 - "CI и инфраструктура (3)"
Cohesion: 0.50
Nodes (4): D-28. Процесс разработки: облако + Mac, сборка iOS в CI, Контекст, Последствия, Решение

## Ambiguous Edges - Review These
- `Pen in text (strokes anchored to words, reflow with text)` → `R-08 Huge project scope (risk of never finishing)`  [AMBIGUOUS]
  docs/risks.md · relation: conceptually_related_to

## Knowledge Gaps
- **50 isolated node(s):** `Metadata: title, tags, links, dates, space, folder`, `Link graph view (not in MVP, stage 6)`, `Stage 2: Local MVP on iPad and iPhone`, `Current status: stack approved, next is stage 1 pencil prototype`, `docker compose` (+45 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 243 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Apple Developer Account` connect `Название продукта и ощущение пера` to `CI и инфраструктура (2)`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `Stage 1: Pen-in-Text Prototype (iPad)` (e.g. with `Predicted / Coalesced Touches` and `Living Stroke`) actually correct?**
  _`Stage 1: Pen-in-Text Prototype (iPad)` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Metadata: title, tags, links, dates, space, folder`, `Link graph view (not in MVP, stage 6)`, `Stage 2: Local MVP on iPad and iPhone` to the rest of the system?**
  _50 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Название продукта и ощущение пера` be split into smaller, more focused modules?**
  _Cohesion score 0.06458635703918723 - nodes in this community are weakly interconnected._
- **Should `Аудитория, монетизация, один VPS` be split into smaller, more focused modules?**
  _Cohesion score 0.06219512195121951 - nodes in this community are weakly interconnected._
- **Should `Хранение в БД и экспорт` be split into smaller, more focused modules?**
  _Cohesion score 0.07130124777183601 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Pen in text (strokes anchored to words, reflow with text)` and `R-08 Huge project scope (risk of never finishing)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._