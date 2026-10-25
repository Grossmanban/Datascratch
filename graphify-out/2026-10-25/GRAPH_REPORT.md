# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 63 files · ~0 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 700 nodes · 1237 edges · 31 communities
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 202 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Скрипт обновления графа
- Правила для ИИ и документации
- Платформы и клиенты
- Архитектура и стек
- Концепция и название
- CRDT и журнал изменений
- Шифрование и доступ агентов
- Код пишет Claude, документация
- Шеринг и совместная правка
- Ядро, Yrs и шифрование
- Перо: разделы ТЗ
- Компоненты стека
- Аудитория, монетизация, хранение файлов
- Открытые вопросы
- Облако + Mac + CI
- Обзор архитектуры: разделы
- Живой штрих и перо
- D-21: разделы
- Без ядра на Rust
- Redis, PostgreSQL, очередь
- D-25: разделы
- Хранение в БД и редактор
- D-30: разделы
- CRDT Yjs: разделы
- Yrs в прототипе
- Монорепозиторий и CLAUDE.md
- План этапов и отложенное
- Модель данных и глоссарий
- Дизайн и организация
- Процесс разработки и Graphify
- iOS-стек и два языка

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
- `Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1)` --implements--> `Remote MCP server (Streamable HTTP, OAuth 2.1)`  [INFERRED]
  apps/server/README.md → docs/spec/09-agents-api.md
- `Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion)` --implements--> `Web client as full desktop replacement (Pointer Events pressure, offline PWA)`  [INFERRED]
  apps/web/README.md → docs/spec/02-platforms.md

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

## Communities (31 total, 0 thin omitted)

### Community 11 - "Скрипт обновления графа"
Cohesion: 0.32
Nodes (5): finish(), _line_count(), prepare(), _read(), _write()

### Community 0 - "Правила для ИИ и документации"
Cohesion: 0.06
Nodes (40): Контекст, Последствия, Решение, Перед любой работой: порядок чтения, Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск (+32 more)

### Community 1 - "Платформы и клиенты"
Cohesion: 0.07
Nodes (27): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, D-03. Платформы: нативные iPhone и iPad + полноценный веб, Контекст, Последствия, Решение, D-06. Рисование пальцем на iPhone — да, опционально (+19 more)

### Community 10 - "Архитектура и стек"
Cohesion: 0.06
Nodes (56): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25) (+48 more)

### Community 12 - "Концепция и название"
Cohesion: 0.10
Nodes (17): D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, D-24. Название продукта, Контекст, Решение, 1. Концепция продукта, Аудитория (D-12), Главные принципы, Почему не существующие приложения (+9 more)

### Community 13 - "CRDT и журнал изменений"
Cohesion: 0.31
Nodes (7): 2026-10-25, Журнал изменений, Automerge (fallback CRDT), Yjs, Yrs (Rust Yjs) with Swift Wrapper, CRDT, R-06 Immature Yrs Swift Wrapper

### Community 14 - "Шифрование и доступ агентов"
Cohesion: 0.05
Nodes (41): D-04. Одновременно сквозное шифрование и доступ по API, Контекст, Последствия, Решение, D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, D-11. Рукопись для агента — рендер в картинку (PNG), Решение (+33 more)

### Community 15 - "Код пишет Claude, документация"
Cohesion: 0.14
Nodes (9): D-19. Весь код пишет Claude, Последствия, Решение, D-23. Документация — источник истины; Graphify — граф знаний поверх неё, Контекст, Последствия, Решение, Журнал решений (ADR) (+1 more)

### Community 16 - "Шеринг и совместная правка"
Cohesion: 0.11
Nodes (15): D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Последствия, Решение, 8. Совместная работа и шеринг, Открыто (см. `open-questions.md`), Реализация, Требования, Link sharing with editing without account (+7 more)

### Community 17 - "Ядро, Yrs и шифрование"
Cohesion: 0.24
Nodes (12): End-to-end encryption, libsodium, Pen prototype (stage 1), Automerge (fallback CRDT), Encrypted history compaction by clients (R-05, stage 3), Last-write-wins (unsuitable), Loro (too early), Operational Transformation (unsuitable) (+4 more)

### Community 18 - "Перо: разделы ТЗ"
Cohesion: 0.22
Nodes (9): 3. Apple Pencil в тексте — ключевая фича, Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера, Перекладка текста — вариант А «живой штрих» (D-05, РЕШЕНО) (+1 more)

### Community 19 - "Компоненты стека"
Cohesion: 0.16
Nodes (14): Canvas + Pointer Events, Dexie (IndexedDB), docker compose, Drizzle ORM, Fastify, Infrastructure stack, MCP TypeScript SDK, OAuth 2.1 (+6 more)

### Community 2 - "Аудитория, монетизация, хранение файлов"
Cohesion: 0.09
Nodes (21): D-12. Аудитория — в первую очередь для себя, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Контекст, Решение (на сейчас), D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Контекст (+13 more)

### Community 20 - "Открытые вопросы"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 21 - "Облако + Mac + CI"
Cohesion: 0.22
Nodes (8): D-28. Процесс разработки: облако + Mac, сборка iOS в CI, Контекст, Последствия, Решение, GitHub Actions (incl. iOS build on macOS), iOS build and tests on macOS CI runner per push, Mixed cloud + Mac development mode, XcodeGen (project.yml) - proposed

### Community 29 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 3 - "Живой штрих и перо"
Cohesion: 0.05
Nodes (33): D-05. Перо при перекладке текста — вариант А «живой штрих», Гипотеза реализации, Контекст, Последствия, Решение, D-07. Распознавание рукописи в текст — не делаем, Решение, D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю (+25 more)

### Community 35 - "D-21: разделы"
Cohesion: 0.40
Nodes (5): D-21. Технологический стек, Контекст, Последствия, Рассмотренные варианты (по обсуждению 2026-10-25), Решение

### Community 36 - "Без ядра на Rust"
Cohesion: 0.40
Nodes (5): D-22. Без собственного общего ядра на Rust, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 37 - "Redis, PostgreSQL, очередь"
Cohesion: 0.26
Nodes (9): pg-boss job queue, Edit broadcast interface (in-memory), PostgreSQL LISTEN/NOTIFY, Redis (rejected), Valkey (free Redis alternative), MongoDB (rejected), MySQL (rejected), PostgreSQL (+1 more)

### Community 38 - "D-25: разделы"
Cohesion: 0.40
Nodes (5): D-25. Redis не используем, Будущее, Контекст, Последствия, Решение

### Community 4 - "Хранение в БД и редактор"
Cohesion: 0.08
Nodes (22): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Контекст, Последствия, Рассмотренные варианты, Решение, 4. Редактор, Платформенная реализация, Прочее (+14 more)

### Community 40 - "D-30: разделы"
Cohesion: 0.40
Nodes (5): D-30. База данных сервера — PostgreSQL, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 41 - "CRDT Yjs: разделы"
Cohesion: 0.40
Nodes (5): D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS), Контекст, Последствия, Рассмотренные варианты, Решение

### Community 42 - "Yrs в прототипе"
Cohesion: 0.50
Nodes (4): D-27. В прототипе пера текст хранится в Yrs, Контекст, Последствия, Решение

### Community 5 - "Монорепозиторий и CLAUDE.md"
Cohesion: 0.06
Nodes (34): apps/ios — iPhone + iPad, apps/server — сервер, apps/web — веб-клиент, Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой (+26 more)

### Community 6 - "План этапов и отложенное"
Cohesion: 0.08
Nodes (25): D-08. Аннотации PDF пером — не в MVP, Решение (предложение), D-16. Импорт — не сейчас, Решение, Критерии приёмки, План разработки, Подготовка, Состав прототипа (+17 more)

### Community 7 - "Модель данных и глоссарий"
Cohesion: 0.06
Nodes (51): Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3), Штрих (черновик для прототипа), Глоссарий, Риски, Anchor (textRange / paragraph / drawingBlock / image) (+43 more)

### Community 8 - "Дизайн и организация"
Cohesion: 0.08
Nodes (23): D-15. Дизайн — основная концепция продукта, Последствия, Решение, 5. Организация заметок и дизайн, Дизайн (D-15 — РЕШЕНО, главный принцип продукта), Организация (D-14 — РЕШЕНО по сути; структура ниже — ПРЕДЛОЖЕНО), Принципы, Реализация (+15 more)

### Community 9 - "Процесс разработки и Graphify"
Cohesion: 0.08
Nodes (22): Git, Graphify, Автоматизация, Две среды, Команды, Конец сессии, Кто что делает, Обновление графа после правки документов (по шагам) (+14 more)

### Community 25 - "iOS-стек и два языка"
Cohesion: 0.18
Nodes (11): Custom pen renderer (Metal vs Core Animation TBD), GRDB (SQLite), iOS client stack, Node.js + TypeScript server, Swift 6, SwiftUI (shell), TypeScript, UIKit + TextKit 2 (editor) (+3 more)

## Knowledge Gaps
- **49 isolated node(s):** `Доступ внешних ИИ-агентов через MCP/REST`, `Apple Pencil в тексте — ключевая фича и главный риск`, `R-09 (риск: Graphify сломается или исчезнет)`, `Промпт извлечения .claude/skills/graphify/references/extraction-spec.md`, `Russian and English UI, no RTL` (+44 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 243 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

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
- **Why does `Stage 0: Preparation (done)` connect `Ядро, Yrs и шифрование` to `Аудитория, монетизация, хранение файлов`, `Redis, PostgreSQL, очередь`, `План этапов и отложенное`, `Процесс разработки и Graphify`, `Архитектура и стек`, `Код пишет Claude, документация`, `Компоненты стека`, `Облако + Mac + CI`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Graphify` (e.g. with `R-09 Graphify Is a Young Third-Party Tool` and `glossary.md`) actually correct?**
  _`Graphify` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `Платформы и клиенты` be split into smaller, more focused modules?**
  _Cohesion score 0.06543385490753911 - nodes in this community are weakly interconnected._