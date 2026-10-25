# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 62 files · ~14,586 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 3)

## Summary
- 702 nodes · 1241 edges · 41 communities (40 shown, 1 thin omitted)
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 203 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `24c4fd88`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Правила для ИИ и документации
- Платформы и клиенты
- 06-data-server.md
- 0005-living-stroke.md
- Хранение в БД и редактор
- Монорепозиторий и CLAUDE.md
- План этапов и отложенное
- Модель данных и глоссарий
- Дизайн и организация
- Процесс разработки и Graphify
- stack.md
- Скрипт обновления графа
- Технологический стек — РЕШЕНО (2026-10-25)
- CRDT и журнал изменений
- 09-agents-api.md
- Код пишет Claude, документация
- 10-sync.md
- Ядро, Yrs и шифрование
- 0026-file-storage.md
- Компоненты стека
- 07-encryption.md
- open-questions.md
- 0011-handwriting-for-agents.md
- Private notebooks: key from password, server stores only ciphertext, no agent access
- 0004-encryption-and-api.md
- iOS-стек и два языка
- 0009-notebook-mode-choice.md
- 7. Шифрование и доступ агентов
- 9. API и внешние ИИ-агенты
- Обзор архитектуры: разделы
- Модель данных — ЧЕРНОВИК
- D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO
- D-04. Одновременно сквозное шифрование и доступ по API
- D-23. Документация — источник истины; Graphify — граф знаний поверх неё
- D-21: разделы
- Без ядра на Rust
- 0025-no-redis.md
- D-25: разделы
- D-30: разделы
- CRDT Yjs: разделы
- Yrs в прототипе

## God Nodes (most connected - your core abstractions)
1. `Stage 1: Pen-in-Text Prototype (iPad)` - 17 edges
2. `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` - 15 edges
3. `Процесс разработки (docs/development.md)` - 14 edges
4. `Graphify` - 13 edges
5. `Datascratch — правила для ИИ (CLAUDE.md)` - 13 edges
6. `Yrs (Rust Yjs) with Swift Wrapper` - 13 edges
7. `Stage 0: Preparation (done)` - 13 edges
8. `PostgreSQL` - 12 edges
9. `MCP + REST API` - 10 edges
10. `Sync / Realtime Service` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО` --semantically_similar_to--> `Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/README.md
- `Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md` --semantically_similar_to--> `Конец сессии: файл в docs/history + roadmap/open-questions`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/development.md
- `Определение «готово» для любого изменения` --semantically_similar_to--> `Как вносить изменения — всё в одном коммите`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/README.md
- `Local MCP bridge (future): local utility holding key for agent access to private notebooks` --semantically_similar_to--> `Remote MCP server (Streamable HTTP, OAuth 2.1)`  [INFERRED] [semantically similar]
  docs/spec/07-encryption.md → docs/spec/09-agents-api.md
- `Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1)` --implements--> `Remote MCP server (Streamable HTTP, OAuth 2.1)`  [INFERRED]
  apps/server/README.md → docs/spec/09-agents-api.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **iOS-Web Compatibility Without Shared Core** — docs_architecture_overview_no_shared_core, docs_architecture_stack_yrs, docs_architecture_stack_yjs, docs_architecture_stack_libsodium, docs_architecture_overview_test_vectors_package [EXTRACTED 1.00]
- **Двухслойная модель графа Graphify и кто обновляет каждый слой** — docs_decisions_0029_graphify_workflow_structural_layer, docs_decisions_0029_graphify_workflow_semantic_layer, docs_decisions_0029_graphify_workflow_git_hook, docs_decisions_0029_graphify_workflow_graphify_docs_script, docs_development_two_layer_graph [EXTRACTED 1.00]
- **Encryption key custody strategies** — docs_decisions_0004_encryption_and_api_private_notebook_mode, docs_decisions_0004_encryption_and_api_agent_notebook_mode, docs_decisions_0013_collaboration_sharing_key_in_url_fragment, docs_decisions_0004_encryption_and_api_local_mcp_bridge [INFERRED 0.75]
- **Rejected extra server services (lean two-container deployment)** — docs_decisions_0025_no_redis_redis, docs_decisions_0026_file_storage_minio, docs_decisions_0022_no_rust_core_shared_rust_core, docs_decisions_0030_server_database_postgresql_mysql [INFERRED 0.75]
- **Agent access to notes model** — docs_decisions_0004_encryption_and_api_agent_notebook_mode, docs_decisions_0009_notebook_mode_choice_notebook_mode_switch_reencryption, docs_decisions_0010_agent_edits_immediate_agent_edits, docs_decisions_0011_handwriting_for_agents_handwriting_png_render, docs_decisions_0004_encryption_and_api_local_mcp_bridge [INFERRED 0.85]
- **External agent access surface (MCP/REST, tokens, RLS, audit log, PNG ink)** — docs_spec_09_agents_api_remote_mcp_server, docs_spec_09_agents_api_rest_api, docs_spec_09_agents_api_thin_mcp_over_service_layer, docs_spec_09_agents_api_token_permissions_rls, docs_spec_09_agents_api_agent_action_log, docs_spec_09_agents_api_rate_limits, docs_spec_09_agents_api_handwriting_as_png, docs_spec_09_agents_api_mcp_tools_sketch [INFERRED 0.85]
- **Agent Notebook Edit Flow via MCP** — docs_architecture_overview_external_ai_agents, docs_architecture_overview_mcp_rest_api, docs_architecture_overview_edit_note_tool, docs_architecture_overview_auth_service, docs_architecture_overview_key_store, docs_glossary_row_level_security, docs_architecture_data_model_agent_audit_log [INFERRED 0.85]
- **Сборка iOS из облака без Xcode: облако + Mac + CI + XcodeGen** — docs_development_two_environments, docs_development_github_actions_macos, docs_development_xcodegen, claude_ios_ci_must_build_rule, docs_development_d28 [INFERRED 0.85]
- **CRDT + E2E encrypted sync design** — docs_decisions_0031_crdt_yjs_yjs, docs_decisions_0031_crdt_yjs_yrs, docs_decisions_0031_crdt_yjs_client_side_merge, docs_decisions_0021_tech_stack_end_to_end_encryption, docs_decisions_0031_crdt_yjs_relativeposition_stroke_anchor [INFERRED 0.85]
- **Dual-mode encryption and sync flow (private relay vs agent decrypt)** — docs_spec_07_encryption_two_notebook_modes, docs_spec_07_encryption_private_notebooks, docs_spec_07_encryption_agent_notebooks, docs_spec_10_sync_encrypted_update_relay, docs_spec_10_sync_server_side_agent_merge, docs_spec_07_encryption_per_notebook_key_wrapping, docs_spec_07_encryption_server_key_separate_from_db [INFERRED 0.85]
- **Поток обновления графа при коммите (код и документы)** — claude_definition_of_done, docs_decisions_0029_graphify_workflow_git_hook, docs_decisions_0029_graphify_workflow_graphify_docs_script, docs_development_docs_update_procedure, docs_development_finish_node_loss_guard [INFERRED 0.85]
- **Handwriting anchored to CRDT text structure** — docs_decisions_0001_storage_in_database_crdt_structured_documents, docs_decisions_0005_living_stroke_living_stroke, docs_decisions_0005_living_stroke_stroke_point_anchor, docs_decisions_0005_living_stroke_textkit2_render_layer, docs_decisions_0010_agent_edits_immediate_agent_edits [INFERRED 0.85]
- **Living-stroke anchoring pipeline (strokes anchored to CRDT text positions)** — docs_spec_03_pencil_living_stroke, docs_spec_03_pencil_stroke_anchor_hypothesis, docs_spec_03_pencil_crdt_relative_position_anchors, docs_spec_03_pencil_yrs_in_prototype, docs_spec_06_data_server_handwriting_layer, docs_spec_06_data_server_crdt_block_tree [INFERRED 0.85]
- **Private Notebook Encrypted Sync Flow** — docs_architecture_overview_private_notebook_edit_flow, docs_architecture_overview_ios_client, docs_architecture_stack_yrs, docs_architecture_stack_grdb, docs_architecture_stack_libsodium, docs_architecture_overview_sync_realtime, docs_architecture_stack_postgresql [INFERRED 0.85]

## Communities (41 total, 1 thin omitted)

### Community 0 - "Правила для ИИ и документации"
Cohesion: 0.06
Nodes (40): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, Стартовый хук Claude Code (.claude/hooks/session-start.sh) (+32 more)

### Community 1 - "Платформы и клиенты"
Cohesion: 0.06
Nodes (31): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, D-03. Платформы: нативные iPhone и iPad + полноценный веб, Full-featured web client (TypeScript), Контекст, Последствия, Решение (+23 more)

### Community 2 - "06-data-server.md"
Cohesion: 0.07
Nodes (26): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, Контекст, Решение (на сейчас) (+18 more)

### Community 3 - "0005-living-stroke.md"
Cohesion: 0.07
Nodes (24): D-05. Перо при перекладке текста — вариант А «живой штрих», PencilKit (rejected), Гипотеза реализации, Контекст, Последствия, Решение, D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support (+16 more)

### Community 4 - "Хранение в БД и редактор"
Cohesion: 0.06
Nodes (28): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты, Решение (+20 more)

### Community 5 - "Монорепозиторий и CLAUDE.md"
Cohesion: 0.07
Nodes (25): apps/ios — iPhone + iPad, iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), apps/server — сервер, Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), apps/web — веб-клиент, Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), Datascratch — правила для ИИ (+17 more)

### Community 6 - "План этапов и отложенное"
Cohesion: 0.08
Nodes (25): Notesnook, D-08. Аннотации PDF пером — не в MVP, PDF pen annotations (PDFKit + stroke layer), Решение (предложение), D-16. Импорт — не сейчас, Import from Obsidian/Notesnook (later), Решение, PDF Annotations Not in MVP (+17 more)

### Community 7 - "Модель данных и глоссарий"
Cohesion: 0.05
Nodes (63): agent_tokens / agent_audit_log Tables, Anchor (textRange / paragraph / drawingBlock / image), doc_snapshots Table (compacted snapshots, version history), doc_updates Table (encrypted Yjs updates), Note, Organization Hierarchy (Account > Space > Notebook > Folder > Note), Server PostgreSQL Schema (Stage 3 Draft), Stroke (+55 more)

### Community 8 - "Дизайн и организация"
Cohesion: 0.09
Nodes (20): D-14. Организация: богатая, но не перегруженная, Spaces, nested folders, smart tags, colors, Решение, D-15. Дизайн — основная концепция продукта, Design references: Things 3, Linear, Craft, Arc, Последствия, Решение, Organization Structure (notebook vs space vs folder) (+12 more)

### Community 9 - "Процесс разработки и Graphify"
Cohesion: 0.08
Nodes (22): Monorepo Structure (apps/, packages/, infra/), Git, Graphify, Автоматизация, Две среды, Команды, Конец сессии, Кто что делает (+14 more)

### Community 10 - "stack.md"
Cohesion: 0.16
Nodes (15): Web PWA Client (React, TipTap, Yjs, IndexedDB), Astro (landing page), Dexie (IndexedDB), Drizzle ORM, Fastify, GRDB (SQLite), TypeScript on Node.js, pnpm + Turborepo Monorepo (+7 more)

### Community 11 - "Скрипт обновления графа"
Cohesion: 0.27
Nodes (6): finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 12 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 13 - "CRDT и журнал изменений"
Cohesion: 0.31
Nodes (7): Automerge (fallback CRDT), Yjs, Yrs (Rust Yjs) with Swift Wrapper, 2026-10-25, Журнал изменений, CRDT, R-06 Immature Yrs Swift Wrapper

### Community 14 - "09-agents-api.md"
Cohesion: 0.27
Nodes (8): pg-boss background job queue on PostgreSQL, PostgreSQL via Drizzle (D-30): accounts, notebooks, rights, tokens, encrypted updates, snapshots, agent log, Log of all agent actions, MCP tools sketch (list_spaces, list_notebooks, search_notes, read_note, get_handwriting_image, create_note, edit_note, add_comment, get_backlinks), Request rate limits, Remote MCP server (Streamable HTTP, OAuth 2.1), REST API, Per-notebook token permissions (read / read+write) enforced also by PostgreSQL RLS (D-30)

### Community 15 - "Код пишет Claude, документация"
Cohesion: 0.19
Nodes (5): D-19. Весь код пишет Claude, Последствия, Решение, docs/history session log, Журнал решений (ADR)

### Community 16 - "10-sync.md"
Cohesion: 0.07
Nodes (26): D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение, Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps, 8. Совместная работа и шеринг, Guest editing without account in any browser (+18 more)

### Community 17 - "Ядро, Yrs и шифрование"
Cohesion: 0.24
Nodes (12): End-to-end encryption, libsodium, Pen prototype (stage 1), Automerge (fallback CRDT), Encrypted history compaction by clients (R-05, stage 3), Last-write-wins (unsuitable), Loro (too early), Operational Transformation (unsuitable) (+4 more)

### Community 18 - "0026-file-storage.md"
Cohesion: 0.36
Nodes (6): MinIO (rejected), Server disk folder storage (default), External S3-compatible storage (Hetzner, R2, B2), File storage interface (two implementations, chosen by config), Garage / SeaweedFS, MinIO (rejected)

### Community 19 - "Компоненты стека"
Cohesion: 0.15
Nodes (16): Canvas + Pointer Events, Dexie (IndexedDB), Drizzle ORM, Fastify, MCP TypeScript SDK, OAuth 2.1, pg-boss job queue, Radix + Tailwind + Motion (+8 more)

### Community 20 - "07-encryption.md"
Cohesion: 0.32
Nodes (6): Attachments as separate encrypted files, on-demand resumable download, Argon2id password key derivation, libsodium on all platforms (swift-sodium, libsodium-wrappers), Local MCP bridge (future): local utility holding key for agent access to private notebooks, XChaCha20-Poly1305 content encryption, Chunked resumable attachments; thumbnails-only on iPhone

### Community 21 - "open-questions.md"
Cohesion: 0.06
Nodes (37): GitHub Actions CI (incl. macOS iOS builds), XcodeGen, docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, D-24. Название продукта, Datascratch (working name) (+29 more)

### Community 22 - "0011-handwriting-for-agents.md"
Cohesion: 0.29
Nodes (6): D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Handwriting Format for Agents (PNG), Export: Markdown, PDF, HTML (handwriting as images), Server responsibilities: accounts, encrypted relay, attachments, realtime, API/MCP, handwriting PNG render, Handwriting rendered to PNG for agents with text annotation (D-11)

### Community 23 - "Private notebooks: key from password, server stores only ciphertext, no agent access"
Cohesion: 0.29
Nodes (4): Notesnook (reference product: E2E encryption, reliable sync), Per-notebook key wrapped by user master key or server key, Private notebooks: key from password, server stores only ciphertext, no agent access, Agent capabilities: search/read Markdown, block-level edits, comments, links/tags/backlinks

### Community 25 - "iOS-стек и два языка"
Cohesion: 0.18
Nodes (11): Custom pen renderer (Metal vs Core Animation TBD), GRDB (SQLite), iOS client stack, Node.js + TypeScript server, Swift 6, SwiftUI (shell), TypeScript, UIKit + TextKit 2 (editor) (+3 more)

### Community 26 - "0009-notebook-mode-choice.md"
Cohesion: 0.47
Nodes (4): D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, Space -> notebook -> folder relation (open; encryption mode per notebook, D-09), Two notebook modes chosen at creation, switchable with client re-encryption (D-09)

### Community 27 - "7. Шифрование и доступ агентов"
Cohesion: 0.33
Nodes (6): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 28 - "9. API и внешние ИИ-агенты"
Cohesion: 0.33
Nodes (6): 9. API и внешние ИИ-агенты, Агент умеет, Безопасность, Набросок инструментов MCP (ПРЕДЛОЖЕНО), Правки агента (D-10), Реализация

### Community 29 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 30 - "Модель данных — ЧЕРНОВИК"
Cohesion: 0.40
Nodes (5): Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3), Штрих (черновик для прототипа)

### Community 31 - "D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO"
Cohesion: 0.40
Nodes (5): D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 32 - "D-04. Одновременно сквозное шифрование и доступ по API"
Cohesion: 0.50
Nodes (4): D-04. Одновременно сквозное шифрование и доступ по API, Контекст, Последствия, Решение

### Community 33 - "D-23. Документация — источник истины; Graphify — граф знаний поверх неё"
Cohesion: 0.50
Nodes (4): D-23. Документация — источник истины; Graphify — граф знаний поверх неё, Контекст, Последствия, Решение

### Community 35 - "D-21: разделы"
Cohesion: 0.40
Nodes (5): D-21. Технологический стек, Контекст, Последствия, Рассмотренные варианты (по обсуждению 2026-10-25), Решение

### Community 36 - "Без ядра на Rust"
Cohesion: 0.40
Nodes (5): D-22. Без собственного общего ядра на Rust, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 37 - "0025-no-redis.md"
Cohesion: 0.39
Nodes (7): Scaling via PostgreSQL LISTEN/NOTIFY, Redis (rejected), WebSocket In-Process Broadcast, Edit broadcast interface (in-memory), PostgreSQL LISTEN/NOTIFY, Redis (rejected), Valkey (free Redis alternative)

### Community 38 - "D-25: разделы"
Cohesion: 0.40
Nodes (5): D-25. Redis не используем, Будущее, Контекст, Последствия, Решение

### Community 40 - "D-30: разделы"
Cohesion: 0.40
Nodes (5): D-30. База данных сервера — PostgreSQL, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 41 - "CRDT Yjs: разделы"
Cohesion: 0.40
Nodes (5): D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS), Контекст, Последствия, Рассмотренные варианты, Решение

### Community 42 - "Yrs в прототипе"
Cohesion: 0.50
Nodes (4): D-27. В прототипе пера текст хранится в Yrs, Контекст, Последствия, Решение

## Knowledge Gaps
- **49 isolated node(s):** `Доступ внешних ИИ-агентов через MCP/REST`, `Apple Pencil в тексте — ключевая фича и главный риск`, `R-09 (риск: Graphify сломается или исчезнет)`, `Промпт извлечения .claude/skills/graphify/references/extraction-spec.md`, `Russian and English UI, no RTL` (+44 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 244 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` connect `Правила для ИИ и документации` to `Код пишет Claude, документация`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `Stage 1: Pen-in-Text Prototype (iPad)` (e.g. with `Predicted / Coalesced Touches` and `Living Stroke`) actually correct?**
  _`Stage 1: Pen-in-Text Prototype (iPad)` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Доступ внешних ИИ-агентов через MCP/REST`, `Apple Pencil в тексте — ключевая фича и главный риск`, `R-09 (риск: Graphify сломается или исчезнет)` to the rest of the system?**
  _49 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Правила для ИИ и документации` be split into smaller, more focused modules?**
  _Cohesion score 0.06359189378057302 - nodes in this community are weakly interconnected._
- **Why does `Stage 0: Preparation (done)` connect `Ядро, Yrs и шифрование` to `0025-no-redis.md`, `План этапов и отложенное`, `Процесс разработки и Graphify`, `stack.md`, `Код пишет Claude, документация`, `0026-file-storage.md`, `Компоненты стека`, `open-questions.md`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Graphify` (e.g. with `glossary.md` and `R-09 Graphify Is a Young Third-Party Tool`) actually correct?**
  _`Graphify` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `Платформы и клиенты` be split into smaller, more focused modules?**
  _Cohesion score 0.05758582502768549 - nodes in this community are weakly interconnected._