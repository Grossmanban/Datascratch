# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 88 files · ~21,782 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 3)

## Summary
- 1090 nodes · 2105 edges · 87 communities (86 shown, 1 thin omitted)
- Extraction: 80% EXTRACTED · 20% INFERRED · 0% AMBIGUOUS · INFERRED: 411 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2fc922ab`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Монорепозиторий и CLAUDE.md
- Контракт: протокол синхронизации (v1)
- strokes.md
- 0018-monetization.md
- 0011-handwriting-for-agents.md
- overview.md
- decisions/README.md
- stack.md
- Ядро, Yrs и шифрование
- Правила для ИИ и документации
- 0009-notebook-mode-choice.md
- 0005-living-stroke.md
- 2026-10-25
- 0025-no-redis.md
- Правила для ИИ и документации (2) (2)
- Контракт: модель документа (v1)
- risks.md
- D-28. Процесс разработки: облако + Mac, сборка iOS в CI
- 04-editor.md
- Модель данных и глоссарий (2)
- 0009-notebook-mode-choice.md (2)
- api.md
- 0001-storage-in-database.md
- Datascratch
- package.json
- compilerOptions
- Скрипт обновления графа
- Organization Hierarchy (Account > Space > Notebook > Folder > Note)
- 0009-notebook-mode-choice.md (3)
- Контракт: дизайн-токены «Тихая бумага» (v1)
- Private Notebook Edit Flow
- 12. Функции по мотивам Craft
- glossary.md
- Дизайн и организация
- План этапов и отложенное
- Модель данных и глоссарий (2) (2)
- Компоненты стека (2) (2)
- open-questions.md (2)
- Контракт: модель документа (v1) (2)
- Модель данных и глоссарий (5)
- 02-platforms.md
- tasks
- Контракт: шифрование (v1)
- 06-data-server.md
- D-04. Одновременно сквозное шифрование и доступ по API
- 11-nfr.md
- Монорепозиторий и CLAUDE.md (2)
- Datascratch — правила для ИИ (CLAUDE.md)
- D-30. База данных сервера — PostgreSQL
- D-41. Набор функций по мотивам Craft
- Технологический стек — РЕШЕНО (2026-10-25)
- iOS-стек и два языка (2)
- Правила для ИИ и документации (4)
- 12. Функции по мотивам Craft (2)
- Обзор архитектуры: разделы
- D-38. Дизайн-направление — «Тихая бумага», ориентир Craft
- Дизайн и организация (2)
- Перепривязка якорей после отмены/повтора: в той же транзакции якорь удалённого символа с redone-элементом переписывается на относительную позицию нового элемента
- iOS-стек и два языка (2) (2)
- Процесс разработки и Graphify (2)
- Платформы и клиенты (2)
- 0009-notebook-mode-choice.md (5)
- Контракт: дизайн-токены «Тихая бумага» (v1) (2)
- 0005-living-stroke.md
- D-21. Технологический стек
- D-21. Технологический стек (2)
- D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS)
- 04-editor.md (4)
- Дизайн и организация (2) (2)
- 0035-strokes-on-deleted-text.md
- open-questions.md (3)
- D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS) (2)
- Контракт: рукописные штрихи (v1)
- open-questions.md
- libsodium on all platforms (swift-sodium on iOS, libsodium-wrappers in TS)
- 3. Apple Pencil в тексте — ключевая фича
- pnpm-workspace.yaml
- 0010-agent-edits.md
- 0026-file-storage.md
- Web client stack (PWA)
- Custom iOS Pen Render Layer (Metal or Core Animation)
- Вывод ключей из пароля: Argon2id13 (ops 3, mem 64 MiB, выход 64 байта), NFKC, соль 16 байт
- D-01. Хранение заметок — в базе данных на своём сервере, не в файлах
- D-05. Перо при перекладке текста — вариант А «живой штрих»
- D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO
- D-15. Дизайн — основная концепция продукта
- D-24. Название продукта

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 15 edges
2. `D-29. Graphify: порядок работы, чтобы граф был всегда актуален` - 14 edges
3. `packages/design-tokens/tokens.json — источник значений; генерирует CSS-переменные и Swift` - 13 edges
4. `Решения по анкетам пользователя: D-32…D-41 и PDF после MVP (D-08)` - 13 edges
5. `Yrs (Rust Yjs) with Swift Wrapper` - 13 edges
6. `Datascratch — правила для ИИ (CLAUDE.md)` - 13 edges
7. `Stage 1: pen-in-text prototype on iPad (TextKit 2 + Yrs + pen layer, living stroke)` - 12 edges
8. `Graphify` - 11 edges
9. `Coordinator session (merges branches into main, owns roadmap.md, CHANGELOG.md and contracts)` - 11 edges
10. `PostgreSQL` - 11 edges

## Surprising Connections (you probably didn't know these)
- `finish refuses to write graph if nodes of unchanged files disappear` --references--> `finish()`  [EXTRACTED]
  docs/development.md → tools/graphify_docs.py
- `Web editor: TipTap + Yjs per document-model contract, all blocks, Canvas pen layer per strokes contract` --semantically_similar_to--> `Web editor: TipTap (ProseMirror) + Yjs`  [INFERRED] [semantically similar]
  packages/web-editor/README.md → docs/spec/04-editor.md
- `Определение «готово» для любого изменения` --semantically_similar_to--> `Как вносить изменения — spec/architecture, ADR, CHANGELOG, roadmap, граф — в одном коммите`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/README.md
- `Graph update after doc edits: graphify_docs.py prepare -> parallel extraction agents -> finish -> graphify export html -> check-update` --references--> `prepare()`  [EXTRACTED]
  docs/development.md → tools/graphify_docs.py
- `Graph update after doc edits: graphify_docs.py prepare -> parallel extraction agents -> finish -> graphify export html -> check-update` --references--> `finish()`  [EXTRACTED]
  docs/development.md → tools/graphify_docs.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Типы ответов REST API: Session, Notebook, Device, Share, AgentToken** — docs_architecture_contracts_api_session_object, docs_architecture_contracts_api_notebook_type, docs_architecture_contracts_api_device_type, docs_architecture_contracts_api_share_type, docs_architecture_contracts_api_agent_token_type [EXTRACTED 1.00]
- **iOS-Web Compatibility Without Shared Core** — docs_architecture_overview_no_shared_core, docs_architecture_stack_yrs, docs_architecture_stack_yjs, docs_architecture_stack_libsodium, docs_architecture_overview_test_vectors_package [EXTRACTED 1.00]
- **Иерархия ключей шифрования (passwordKey → masterKey → notebookKey → noteKey, serverKey)** — docs_architecture_contracts_crypto_password_key, docs_architecture_contracts_crypto_master_key, docs_architecture_contracts_crypto_notebook_key, docs_architecture_contracts_crypto_note_key, docs_architecture_contracts_crypto_server_key [EXTRACTED 1.00]
- **Nine parallel development streams coordinated via contracts (D-39)** — docs_roadmap_stream_core, docs_roadmap_stream_design_system, docs_roadmap_stream_server, docs_roadmap_stream_agents, docs_roadmap_stream_web_app, docs_roadmap_stream_web_editor, docs_roadmap_stream_ios_core, docs_roadmap_stream_ios_editor, docs_roadmap_stream_ios_app, docs_roadmap_coordinator_session [EXTRACTED 1.00]
- **Craft-inspired MVP features: tasks, daily notes, calendar, document beauty, card documents, navigation (D-41)** — docs_spec_12_craft_features_tasks_in_documents, docs_spec_12_craft_features_inbox, docs_spec_12_craft_features_tasks_screen, docs_spec_12_craft_features_daily_note, docs_spec_12_craft_features_calendar_screen, docs_spec_12_craft_features_document_cover, docs_spec_12_craft_features_document_style, docs_spec_12_craft_features_card_document, docs_spec_12_craft_features_sidebar_navigation, docs_spec_12_craft_features_document_tabs [EXTRACTED 1.00]
- **Двухслойная модель графа Graphify и кто обновляет каждый слой** — docs_decisions_0029_graphify_workflow_structural_layer, docs_decisions_0029_graphify_workflow_semantic_layer, docs_decisions_0029_graphify_workflow_git_hook, docs_decisions_0029_graphify_workflow_graphify_docs_script, docs_development_two_layer_graph [EXTRACTED 1.00]
- **Конвейер отрисовки живого штриха (якоря → глиф → разрыв по строкам → правило D-35)** — docs_architecture_contracts_strokes_text_anchors, docs_architecture_contracts_strokes_em_glyph_offset, docs_architecture_contracts_strokes_render_after_reflow, docs_architecture_contracts_strokes_line_break_segmentation, docs_architecture_contracts_strokes_deleted_text_rendering [EXTRACTED 1.00]
- **Notebook encryption crypto stack: libsodium, Argon2id, XChaCha20-Poly1305, per-notebook key wrapping** — docs_spec_07_encryption_libsodium, docs_spec_07_encryption_argon2id, docs_spec_07_encryption_xchacha20_poly1305, docs_spec_07_encryption_per_notebook_key_wrapping, docs_spec_07_encryption_server_key_separate_from_db [EXTRACTED 1.00]
- **Жизненный цикл якорей штриха на удалённом тексте: скрытие (D-35) → перепривязка при отмене / восстановлении версии → orphanedAt → удаление при уплотнении** — docs_architecture_contracts_strokes_deleted_text_rendering, docs_architecture_contracts_strokes_anchor_rebasing, docs_architecture_contracts_strokes_version_restore_rebase, docs_architecture_contracts_strokes_orphaned_at, docs_architecture_contracts_strokes_stroke_purge_on_compaction [EXTRACTED 1.00]
- **Поток сессии синхронизации: hello → welcome → subscribe → updates → push → ack** — docs_architecture_contracts_sync_protocol_hello_message, docs_architecture_contracts_sync_protocol_welcome_message, docs_architecture_contracts_sync_protocol_subscribe_message, docs_architecture_contracts_sync_protocol_updates_message, docs_architecture_contracts_sync_protocol_push_message, docs_architecture_contracts_sync_protocol_ack_message [EXTRACTED 1.00]
- **Encryption key custody strategies** — docs_decisions_0004_encryption_and_api_private_notebook_mode, docs_decisions_0004_encryption_and_api_agent_notebook_mode, docs_decisions_0013_collaboration_sharing_key_in_url_fragment, docs_decisions_0004_encryption_and_api_local_mcp_bridge [INFERRED 0.75]
- **Rejected extra server services (lean two-container deployment)** — docs_decisions_0025_no_redis_redis, docs_decisions_0026_file_storage_minio, docs_decisions_0022_no_rust_core_shared_rust_core, docs_decisions_0030_server_database_postgresql_mysql [INFERRED 0.75]
- **Agent access to notes model** — docs_decisions_0004_encryption_and_api_agent_notebook_mode, docs_decisions_0009_notebook_mode_choice_notebook_mode_switch_reencryption, docs_decisions_0010_agent_edits_immediate_agent_edits, docs_decisions_0011_handwriting_for_agents_handwriting_png_render, docs_decisions_0004_encryption_and_api_local_mcp_bridge [INFERRED 0.85]
- **External agent access surface (MCP/REST, tokens, RLS, audit log, PNG ink)** — docs_spec_09_agents_api_remote_mcp_server, docs_spec_09_agents_api_rest_api, docs_spec_09_agents_api_thin_mcp_over_service_layer, docs_spec_09_agents_api_token_permissions_rls, docs_spec_09_agents_api_agent_action_log, docs_spec_09_agents_api_rate_limits, docs_spec_09_agents_api_handwriting_as_png, docs_spec_09_agents_api_mcp_tools_sketch [INFERRED 0.85]
- **Agent Notebook Edit Flow via MCP** — docs_architecture_overview_external_ai_agents, docs_architecture_overview_mcp_rest_api, docs_architecture_overview_edit_note_tool, docs_architecture_overview_auth_service, docs_architecture_overview_key_store, docs_glossary_row_level_security, docs_architecture_data_model_agent_audit_log [INFERRED 0.85]
- **CRDT + E2E encrypted sync design** — docs_decisions_0031_crdt_yjs_yjs, docs_decisions_0031_crdt_yjs_yrs, docs_decisions_0031_crdt_yjs_client_side_merge, docs_decisions_0021_tech_stack_end_to_end_encryption, docs_decisions_0031_crdt_yjs_relativeposition_stroke_anchor [INFERRED 0.85]
- **Handwriting anchored to CRDT text structure** — docs_decisions_0001_storage_in_database_crdt_structured_documents, docs_decisions_0005_living_stroke_living_stroke, docs_decisions_0005_living_stroke_stroke_point_anchor, docs_decisions_0005_living_stroke_textkit2_render_layer, docs_decisions_0010_agent_edits_immediate_agent_edits [INFERRED 0.85]
- **Living-stroke anchoring pipeline (strokes anchored to CRDT text positions)** — docs_spec_03_pencil_living_stroke, docs_spec_03_pencil_stroke_anchor_hypothesis, docs_spec_03_pencil_crdt_relative_position_anchors, docs_spec_03_pencil_yrs_in_prototype, docs_spec_06_data_server_handwriting_layer, docs_spec_06_data_server_crdt_block_tree [INFERRED 0.85]
- **Private Notebook Encrypted Sync Flow** — docs_architecture_overview_private_notebook_edit_flow, docs_architecture_overview_ios_client, docs_architecture_stack_yrs, docs_architecture_stack_grdb, docs_architecture_stack_libsodium, docs_architecture_overview_sync_realtime, docs_architecture_stack_postgresql [INFERRED 0.85]

## Communities (87 total, 1 thin omitted)

### Community 0 - "Монорепозиторий и CLAUDE.md"
Cohesion: 0.06
Nodes (44): apps/ios — iPhone + iPad, iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), apps/server — сервер, Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), apps/web — веб-клиент, Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), rebaseRedoneAnchors(doc) — хелпер TS перепривязки якорей (на iOS — эквивалент в DSCore), Radix + Tailwind + Motion Design System (+36 more)

### Community 1 - "Контракт: протокол синхронизации (v1)"
Cohesion: 0.07
Nodes (41): Формат ошибок { error: { code, message } } и коды bad_request…internal, 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05), 6. Права, 7. Коды ошибок (+33 more)

### Community 2 - "strokes.md"
Cohesion: 0.20
Nodes (10): Блок drawing (высота в pt; штрихи — в strokes), anchorKind: text | block (заметка на полях) | image | drawing, Координаты block / image / drawing — в долях ширины блока, Штрих почти неизменяем после рисования; ластик удаляет штрих целиком или заменяет кусками, Разрыв штриха по строкам: соседние точки на разных line fragments → отдельные сегменты, Изменяемые поля штриха после рисования: anchors (перепривязка, §4.1) и hidden (резерв), Упаковка точек: записи по 8 × Float32 LE (a, x, y, pressure, altitude, azimuth, roll, t), Наклон влияет только у pencil и marker; highlighter рисуется под текстом в режиме multiply (+2 more)

### Community 3 - "0018-monetization.md"
Cohesion: 0.19
Nodes (10): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, Контекст, Решение (на сейчас) (+2 more)

### Community 4 - "0011-handwriting-for-agents.md"
Cohesion: 0.08
Nodes (28): AgentToken { id, name, notebookIds, permission, expiresAt, createdAt, lastUsedAt } — без секрета, Токены агентов /agent-tokens: блокноты, read / read_write, срок; токен показывается один раз, Контракт agents-api.md (MCP и REST для самих агентов) — появится на этапе агентов, blockId (UUIDv7) у каждого блочного узла — для точечных правок агентов, заметок на полях и комментариев, hint — распознанная форма (underline, strike, circle, highlight, arrow, scribble) для агентов и экспорта, D-11. Рукопись для агента — рендер в картинку (PNG), Решение, OPEN (before stage 5): handwriting format for agents — PNG (D-11, proposed) (+20 more)

### Community 5 - "overview.md"
Cohesion: 0.30
Nodes (10): Accounts, OAuth, Tokens Service, External AI Agents, File Storage (disk or external S3), Guest via Link (web, no account), Handwriting-to-PNG Render (pg-boss queue), Key Store (agent notebooks), MCP + REST API, Sync / Realtime Service (+2 more)

### Community 6 - "decisions/README.md"
Cohesion: 0.11
Nodes (17): Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, D-19. Весь код пишет Claude, Последствия, Решение, D-23. Документация — источник истины; Graphify — граф знаний поверх неё, Контекст, Последствия (+9 more)

### Community 7 - "stack.md"
Cohesion: 0.28
Nodes (10): Astro (landing page), docker compose Self-Hosting (server + PostgreSQL), Drizzle ORM, TypeScript on Node.js, pg-boss Job Queue, Scaling via PostgreSQL LISTEN/NOTIFY, PostgreSQL, Redis (rejected) (+2 more)

### Community 8 - "Ядро, Yrs и шифрование"
Cohesion: 0.27
Nodes (10): Утверждён технологический стек (D-21), отказ от ядра на Rust (D-22), Прототип пера хранит текст в Yrs (D-27), Pen prototype (stage 1), Automerge (fallback CRDT), Last-write-wins (unsuitable), Loro (too early), Yjs RelativePosition as stroke-point anchor, Yjs (+2 more)

### Community 9 - "Правила для ИИ и документации"
Cohesion: 0.14
Nodes (13): Стартовый хук Claude Code (.claude/hooks/session-start.sh), D-23 (документация), D-29. Graphify: порядок работы, чтобы граф был всегда актуален, git-хук Graphify (пересборка только по изменённому коду), Graphify 0.9.95 (пакет graphifyy), R-09 (риск: Graphify сломается или исчезнет), Структурный слой графа (код, файлы, заголовки — без ИИ), Контекст (+5 more)

### Community 10 - "0009-notebook-mode-choice.md"
Cohesion: 0.19
Nodes (16): Вложения: загрузка и докачка по кускам (/attachments/:id/chunks/:index), лимит 200 МБ, Ассоциированные данные ds1|… привязывают шифротекст к месту (doc, awareness, ключи, куски вложений), Вложения шифруются кусками по 1 MiB, каждый — отдельный конверт, Конверт шифротекста: версия 0x01 + nonce 24 байта + XChaCha20-Poly1305-IETF (тег 16 байт), Иерархия ключей: пароль → passwordKey → masterKey → notebookKey → noteKey, masterKey — 32 случайных байта, создаётся при регистрации, шифрует account-документ, noteKey — ключ заметки: шифрует note-документ и вложения, notebookKey — случайный ключ блокнота, шифрует notebook-документ (+8 more)

### Community 11 - "0005-living-stroke.md"
Cohesion: 0.21
Nodes (7): D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, Handwriting input types (text marks, margin notes, drawing block, drawing on images, Scribble), Stroke point anchoring: character anchor + dx/dy in font-size units, System Scribble only; no recognition of drawn ink (D-07), Handwriting layer: vector strokes with anchors (text range, paragraph, drawing block, image)

### Community 12 - "2026-10-25"
Cohesion: 0.16
Nodes (14): pnpm + Turborepo Monorepo, 2026-10-25, 2026-10-25 (вторая половина дня), Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, Каркас монорепозитория (pnpm + Turborepo), девять потоков разработки, правила сессий-исполнителей, changelog.d (+6 more)

### Community 13 - "0025-no-redis.md"
Cohesion: 0.24
Nodes (9): D-25. Redis не используем, Edit broadcast interface (in-memory), PostgreSQL LISTEN/NOTIFY, Redis (rejected), Valkey (free Redis alternative), Будущее, Контекст, Последствия (+1 more)

### Community 14 - "Правила для ИИ и документации (2) (2)"
Cohesion: 0.20
Nodes (10): Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, Stream sessions write changelog fragments in docs/changelog.d/ instead of editing CHANGELOG.md; stream history files docs/history/YYYY-MM-DD-<stream>-NN.md, Graph update after doc edits: graphify_docs.py prepare -> parallel extraction agents -> finish -> graphify export html -> check-update, Extraction prompt .claude/skills/graphify/references/extraction-spec.md, Git: English code/commits, Russian docs, branches + PR, one commit = code + docs + updated graph, Graphify commands (query, explain, path, update, check-update, /graphify --update), graphifyy PyPI package (command graphify), verified on 0.9.95, Graphify install on Mac (brew install uv, uv tool install graphifyy) (+2 more)

### Community 15 - "Контракт: модель документа (v1)"
Cohesion: 0.17
Nodes (20): y-prosemirror не записывает атрибуты узлов со значением null: отсутствующий атрибут = null (значение по умолчанию схемы), Документ account: spaces, notebooks, settings, starred, tabs (ключ — masterKey), Даты ISO 8601 в UTC; «только дата» YYYY-MM-DD; миллисекунды — только в штрихах, Векторы совместимости модели документа packages/test-vectors/document/* (iOS/Yrs обязан читать и писать формат y-prosemirror), Вставка текста в Y.XmlText без явных атрибутов наследует форматирование слева (Yjs/Yrs) — писатели всегда передают явный набор атрибутов, Folder { parentId, name, icon, color, order } — вложенность без ограничения глубины, Значение метки — объект атрибутов ({ bold: {} }, { link: { href, … } }); читатели принимают {} и true и ключи <имя>--<хэш>, Документ note: content (Y.XmlFragment), meta, strokes, comments (ключ заметки) (+12 more)

### Community 16 - "risks.md"
Cohesion: 0.14
Nodes (14): iOS / iPadOS Client (Swift, TextKit 2, Yrs, GRDB), Automerge (fallback CRDT), Dexie (IndexedDB), GRDB (SQLite), VPS Hosting (Hetzner or similar), Yrs (Rust Yjs) with Swift Wrapper, Платный аккаунт Apple Developer; Team ID задаётся на Mac при первой подписи, в репозитории не хранится, Universal Links (+6 more)

### Community 17 - "D-28. Процесс разработки: облако + Mac, сборка iOS в CI"
Cohesion: 0.18
Nodes (13): XcodeGen project.yml (D-28), GitHub Actions CI (incl. macOS iOS builds), XcodeGen, Последствия: ошибки сборки видны с задержкой CI; ощущение пера проверяет только пользователь на iPad (Pencil Pro), D-28. Процесс разработки: облако + Mac, сборка iOS в CI, GitHub Actions собирает iOS-проект и гоняет тесты на macOS-раннере на каждый push, Смешанный режим: облачные сессии (Linux, без Xcode) + Mac пользователя для сборки и iPad, XcodeGen (project.yml) вместо ручного .xcodeproj — принят в работу в D-39 (+5 more)

### Community 18 - "04-editor.md"
Cohesion: 0.16
Nodes (14): Схема блоков: doc = title block+ (paragraph, heading, списки, taskList, callout, codeBlock, mathBlock, mermaid, table, image, file, drawing, pageCard), Производные данные строятся локально: индекс задач, полнотекстовый поиск, бэклинки, теги, Inline-узлы noteLink ([[ ]]) и tag (без #, вложенность через /), taskItem: taskId, state open / done / cancelled, scheduled, deadline, completedAt, Obsidian (reference product: links, backlinks, tags, Markdown export), Backlinks, Editor content (headings, lists, tables, code, formulas, attachments, drawing blocks), iOS editor: UIKit + TextKit 2 (+6 more)

### Community 19 - "Модель данных и глоссарий (2)"
Cohesion: 0.15
Nodes (15): meta.formatVersion = 1; документ новее клиента открывается только для чтения (R-03), Поля штриха: v, tool, color, width, opacity, anchorKind, blockId, anchors, points, hint, author, createdAt, Anchor (textRange / paragraph / drawingBlock / image), Note, Stroke, StrokePoint, Заметка, Иерархия организации (+7 more)

### Community 20 - "0009-notebook-mode-choice.md (2)"
Cohesion: 0.22
Nodes (11): PATCH /notebooks/:id/mode — включение режима «для агентов» передаёт notebookKey, выключение удаляет серверную обёртку, Режим «для агентов»: клиент передаёт notebookKey по TLS, сервер оборачивает его serverKey; расшифровка только при запросе агента с токеном, NotebookRef { id, spaceId, name, mode: private | agent, … } — ключ блокнота здесь не хранится, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, Блокнот — единица режима шифрования (приватный / для агентов) и шеринга (+3 more)

### Community 21 - "api.md"
Cohesion: 0.05
Nodes (51): Аккаунт и устройства: /me, /devices (отзыв сессий), удаление аккаунта, Эндпоинты /auth: prelogin, signup, login, refresh, logout, recovery, password, Аутентификация Bearer: accessToken 15 мин + refreshToken 30 дней с ротацией, Идентификаторы создаёт клиент (UUIDv7); повторный POST идемпотентен, иначе 409 conflict, Device { id, name, createdAt, lastSeenAt, current } — устройство (сессия) аккаунта, POST /docs — регистрация документа (account / notebook / note) до первого push, POST /shares/:id/guest — гостевой токен (без авторизации) для hello в синхронизации, GET /health → { ok: true, version } — служебная проверка сервера (+43 more)

### Community 22 - "0001-storage-in-database.md"
Cohesion: 0.43
Nodes (4): Markdown files option (rejected), Obsidian, Own server storage, PostgreSQL

### Community 23 - "Datascratch"
Cohesion: 0.50
Nodes (4): Datascratch, For non-Russian readers, Где что лежит, Текущий статус

### Community 24 - "package.json"
Cohesion: 0.14
Nodes (15): devDependencies, turbo@^2.3.0, typescript@^5.6.0, engines, node, name, packageManager, private (+7 more)

### Community 25 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+7 more)

### Community 26 - "Скрипт обновления графа"
Cohesion: 0.27
Nodes (6): finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 27 - "Organization Hierarchy (Account > Space > Notebook > Folder > Note)"
Cohesion: 0.19
Nodes (14): Space { id, name, icon, color, order, createdAt } в account-документе, Organization Hierarchy (Account > Space > Notebook > Folder > Note), Предложенная структура: пространства → вложенные папки; поперёк — вложенные и умные теги, цвета, избранное, недавние, Поперёк структуры — теги, умные теги, избранное, недавние, D-36. Структура: пространство → блокноты → папки, Пространство (Личное, Работа, Учёба) содержит несколько блокнотов, Вариант «пространство = блокнот» — отклонён: нельзя смешивать режимы в одном контексте, Рассмотренные варианты (+6 more)

### Community 28 - "0009-notebook-mode-choice.md (3)"
Cohesion: 0.16
Nodes (15): Восстановление: recoveryLoginKey → wrappedMasterKeyRecovery → новый пароль; данные не перешифровываются, Ключ восстановления: 32 байта, Crockford Base32 с префиксом DS1-, показывается один раз, Notesnook, Import from Obsidian/Notesnook (later), D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления, Вход по email + паролю; один пароль и для входа, и для шифрования (как в Notesnook), Passkeys — сложно совместить со сквозным шифрованием сейчас; возможно позже, Ключ восстановления, выдаваемый при регистрации (+7 more)

### Community 29 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.27
Nodes (13): Подложки backdrop.* (sand, dusk, mist, meadow, ember) — мягкие градиенты в духе Craft, Цветовые токены: bg.canvas («бумага»), text.primary («чернила»), accent («синие чернила»), danger/success/warning — светлая и тёмная тема, Ширина колонки документа: normal 720, wide 960, full, Тактильная отдача iOS: selection, success (задача выполнена), warning (удаление), Чернила пера ink.* (black, blue, red, green, purple, brown) и маркеры highlight.*, Движение: пружины motion.snappy / smooth / gentle, длительности duration.* для веба, Сетка отступов 4 pt, радиусы radius.*, тени shadow.card / shadow.popover, Цвета tint.* (.fg / .bg) для папок, тегов и выносок (+5 more)

### Community 30 - "Private Notebook Edit Flow"
Cohesion: 0.22
Nodes (10): Журнал действий агента GET /agent-tokens/:id/audit, agent_tokens / agent_audit_log Tables, doc_snapshots Table (compacted snapshots, version history), doc_updates Table (encrypted Yjs updates), Server PostgreSQL Schema (Stage 3 Draft), Private Notebook Edit Flow, libsodium (swift-sodium), End-to-End Encryption (E2E) (+2 more)

### Community 31 - "12. Функции по мотивам Craft"
Cohesion: 0.24
Nodes (13): Stream ios-app (claude/ios-app): apps/ios — XcodeGen project, Craft-style SwiftUI shell, navigation, tasks, calendar, settings, Calendar screen: day feed with tasks and daily note (MVP); system calendar integration after MVP, Card document: nested document shown as a card with cover (MVP), Collections: records with properties and table / gallery / kanban views with filter, sort, grouping (after MVP), Daily note: one per day, created on demand, from template (MVP), Document cover image with offset (MVP), Document style: font (serif/sans/mono), width, paper (smooth/dots/grid/ruled), backdrop color or gradient, text color; style gallery after MVP, Tabs: several open documents on iPad and web (MVP) (+5 more)

### Community 32 - "glossary.md"
Cohesion: 0.15
Nodes (15): Agent Edit Flow (agent notebook), edit_note MCP Tool, Web PWA Client (React, TipTap, Yjs, IndexedDB), TextKit 2 (UIKit editor), TipTap (ProseMirror), Vite + React + TypeScript PWA, Yjs, ADR (Architecture Decision Record) (+7 more)

### Community 33 - "Дизайн и организация"
Cohesion: 0.25
Nodes (8): SwiftUI, Design references: Things 3, Linear, Craft, Arc, Ориентир Craft: градиентные подложки, документы-карточки с обложками, боковая панель «Вкладки / Избранное / Папки / Теги», стеклянные панели, контекстные меню, Light/dark theme, Dynamic Type, VoiceOver, full iPad keyboard support, Feel references: Things 3, Linear, Craft, Arc, Own design system (typography, grid, colors, icons, animation, haptics) unified on iOS and web, UI implementation: SwiftUI shell with tokens in code on iOS; Radix + Tailwind + Motion on web, Accessibility: Dynamic Type, VoiceOver, light/dark, iPad keyboard

### Community 34 - "План этапов и отложенное"
Cohesion: 0.15
Nodes (13): Критерии приёмки, План разработки, Подготовка, Потоки разработки (D-39), Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad) (+5 more)

### Community 35 - "Модель данных и глоссарий (2) (2)"
Cohesion: 0.17
Nodes (12): Тестовые векторы crypto: KDF, конверты, Base32 ключа восстановления, куски вложений (Swift и TS), Контракт — точное описание формата/протокола, который реализуют несколько частей (iOS на Swift, веб и сервер на TS), Версионирование контрактов v1, v2…; ломающее изменение — новая версия с явной миграцией, Контракт меняет только сессия-координатор; исполнитель присылает предложение, Совместимость доказывается общими тестовыми векторами (packages/test-vectors), Типы TypeScript контрактов в packages/shared/src/contracts/ — часть контракта, Контракты между частями системы, Правила изменения (+4 more)

### Community 36 - "Компоненты стека (2) (2)"
Cohesion: 0.23
Nodes (10): Обоснованы PostgreSQL (D-30) и Yjs (D-31) как отдельные решения, Drizzle ORM, MCP TypeScript SDK, OAuth 2.1, pg-boss job queue, Server stack, MongoDB (rejected), MySQL (rejected) (+2 more)

### Community 37 - "open-questions.md (2)"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 38 - "Контракт: модель документа (v1) (2)"
Cohesion: 0.18
Nodes (11): 1. Три вида документов Yjs, 2. Документ `account`, 3. Документ `notebook` (индекс блокнота), 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note` (+3 more)

### Community 39 - "Модель данных и глоссарий (5)"
Cohesion: 0.20
Nodes (10): Monorepo Structure (apps/, packages/, infra/), packages/test-vectors, Graphify, Автоматизация, Команды, Обновление графа после правки документов (по шагам), Почему два способа обновления, Установка на Mac (один раз) (+2 more)

### Community 40 - "02-platforms.md"
Cohesion: 0.06
Nodes (38): Решения по анкетам пользователя: D-32…D-41 и PDF после MVP (D-08), D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, D-03. Платформы: нативные iPhone и iPad + полноценный веб, Full-featured web client (TypeScript), Контекст, Последствия (+30 more)

### Community 41 - "tasks"
Cohesion: 0.18
Nodes (10): dependsOn, outputs, $schema, tasks, build, lint, test, typecheck (+2 more)

### Community 42 - "Контракт: шифрование (v1)"
Cohesion: 0.20
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 43 - "06-data-server.md"
Cohesion: 0.21
Nodes (10): D-40. Хостинг — позже; сервер готов к запуску одной командой, Решение, Stream server (claude/server): apps/server, infra/ — Fastify, PostgreSQL, auth, sync, attachments, sharing, docker compose, 6. Модель данных и сервер, Self-hosting, Модель данных (общий обзор; детали — `architecture/data-model.md`), Резервные копии, Сервер (+2 more)

### Community 44 - "D-04. Одновременно сквозное шифрование и доступ по API"
Cohesion: 0.50
Nodes (4): D-04. Одновременно сквозное шифрование и доступ по API, Контекст, Последствия, Решение

### Community 45 - "11-nfr.md"
Cohesion: 0.14
Nodes (11): Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps, Daily off-VPS backups of DB and files with verified restore (R-11), Real time when a note is open on two devices (WebSocket, in-process broadcast), 11. Нефункциональные требования, Performance targets (PencilKit latency, 120 fps, 300 ms open, 1-min first sync, 2 s delivery, 1 s cold start), Reliability: no edit lost on network drop, crash or low storage, Server resource budget: one VPS 2 cores, 2-4 GB; ~300-400 MB idle (D-12), Доступность (+3 more)

### Community 46 - "Монорепозиторий и CLAUDE.md (2)"
Cohesion: 0.18
Nodes (9): Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой, Правила, Среда разработки, Скрипт tools/graphify_docs.py (prepare → агенты → finish) (+1 more)

### Community 47 - "Datascratch — правила для ИИ (CLAUDE.md)"
Cohesion: 0.18
Nodes (9): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, docs/history session log, GitHub Actions on macOS verifies iOS code written in the cloud (+1 more)

### Community 48 - "D-30. База данных сервера — PostgreSQL"
Cohesion: 0.40
Nodes (5): D-30. База данных сервера — PostgreSQL, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 49 - "D-41. Набор функций по мотивам Craft"
Cohesion: 0.25
Nodes (6): Ежедневные заметки и «Входящие» (kind daily / inbox) в блокноте settings.dailyNotebookId, D-41. Набор функций по мотивам Craft, Контекст, Решение, OPEN (before stage 2): Craft features MVP / post-MVP split (D-41, proposed), Stage 2: MVP on iPad and iPhone, local (editor, handwriting, links, tags, organization, search, design system)

### Community 50 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 51 - "iOS-стек и два языка (2)"
Cohesion: 0.40
Nodes (5): Node.js + TypeScript server, Swift 6, TypeScript, Shared Rust core (rejected), Shared test vectors (packages/test-vectors)

### Community 52 - "Правила для ИИ и документации (4)"
Cohesion: 0.25
Nodes (8): Документация Datascratch, История, Как вносить изменения, Оглавление, Порядок чтения для новичка, Соглашения, Ссылки на решения, Статусы

### Community 53 - "12. Функции по мотивам Craft (2)"
Cohesion: 0.25
Nodes (8): 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft, Связь с моделью данных

### Community 54 - "Обзор архитектуры: разделы"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 55 - "D-38. Дизайн-направление — «Тихая бумага», ориентир Craft"
Cohesion: 0.33
Nodes (6): D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Вариант «графит по умолчанию» — отклонён: чернила на тёмном читаются хуже, Вариант «чистый нейтральный» (Linear / Things) — не выбран, Тёмная тема — тёплый графит, Рассмотренные варианты, Решение

### Community 56 - "Дизайн и организация (2)"
Cohesion: 0.33
Nodes (4): Проекты, личное, работа, учёба не смешиваются; минимум кнопок на экране, D-14. Организация: богатая, но не перегруженная, Решение, Command palette Cmd+K, context menus, floating glass panels (MVP)

### Community 57 - "Перепривязка якорей после отмены/повтора: в той же транзакции якорь удалённого символа с redone-элементом переписывается на относительную позицию нового элемента"
Cohesion: 0.27
Nodes (11): История версий: GET /docs/:id/versions и /versions/:seq (зашифрованные снимки), Comment { blockId, anchor (относительные позиции), author user | guest | agent, text, resolvedAt }, Перепривязка якорей после отмены/повтора: в той же транзакции якорь удалённого символа с redone-элементом переписывается на относительную позицию нового элемента, Правило D-35 в отрисовке: точки удалённых символов не рисуются, штрих остаётся в документе; отмена возвращает пометку, orphanedAt — локальная отметка клиента, когда все якоря штриха впервые оказались удалены (стирается, если якоря снова живы), Осиротевшие штрихи (все якоря удалены, orphanedAt или createdAt старше 30 дней) окончательно удаляются клиентом при уплотнении истории, anchors — Y.encodeRelativePosition для каждого символа, которого касается штрих, Восстановление версии из истории: восстанавливаются content и strokes; якоря пересчитываются через абсолютные индексы → новая относительная позиция (+3 more)

### Community 58 - "iOS-стек и два языка (2) (2)"
Cohesion: 0.33
Nodes (6): Custom pen renderer (Metal vs Core Animation TBD), GRDB (SQLite), iOS client stack, SwiftUI (shell), UIKit + TextKit 2 (editor), SQLite on server (rejected)

### Community 59 - "Процесс разработки и Graphify (2)"
Cohesion: 0.33
Nodes (6): Git, Две среды, Конец сессии, Кто что делает, Правила для сессий-исполнителей (D-39), Процесс разработки

### Community 60 - "Платформы и клиенты (2)"
Cohesion: 0.18
Nodes (9): D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, Порядок чтения для новичка: концепция → roadmap → стек → обзор → перо → решения → вопросы/риски → процесс → history, 1. Концепция продукта, Notesnook (reference product: E2E encryption, reliable sync), Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения (+1 more)

### Community 61 - "0009-notebook-mode-choice.md (5)"
Cohesion: 0.33
Nodes (6): 7. Шифрование и доступ агентов, Вход и восстановление доступа (D-34), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 62 - "Контракт: дизайн-токены «Тихая бумага» (v1) (2)"
Cohesion: 0.40
Nodes (5): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 63 - "0005-living-stroke.md"
Cohesion: 0.29
Nodes (6): Координаты text-штриха: смещение от начала глифа якорного символа в em, Отрисовка после перекладки: якорь → абсолютная позиция (с учётом redone-элементов) → текущий прямоугольник глифа, Привязка к тексту: каждая точка → ближайший символ строки (живой штрих), PencilKit (rejected), Living Stroke, Reflow

### Community 64 - "D-21. Технологический стек"
Cohesion: 0.40
Nodes (5): D-21. Технологический стек, Контекст, Последствия, Рассмотренные варианты (по обсуждению 2026-10-25), Решение

### Community 65 - "D-21. Технологический стек (2)"
Cohesion: 0.40
Nodes (5): D-22. Без собственного общего ядра на Rust, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 66 - "D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS)"
Cohesion: 0.40
Nodes (5): D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS), Контекст, Последствия, Рассмотренные варианты, Решение

### Community 67 - "04-editor.md (4)"
Cohesion: 0.40
Nodes (5): 4. Редактор, Платформенная реализация, Прочее, Связи, Содержимое

### Community 68 - "Дизайн и организация (2) (2)"
Cohesion: 0.40
Nodes (5): 5. Организация заметок и дизайн, Дизайн (D-15 — РЕШЕНО, главный принцип продукта), Организация (D-14 — РЕШЕНО по сути; структура ниже — ПРЕДЛОЖЕНО), Принципы, Реализация

### Community 69 - "0035-strokes-on-deleted-text.md"
Cohesion: 0.24
Nodes (9): D-35. Пометка на удалённом тексте исчезает вместе с ним, Вариант «потерянные пометки» — отклонён: лишний интерфейс, Частичное удаление: штрих «сжимается» до оставшегося текста, Вариант «прилипать к соседнему символу» — отклонён: пометка может оказаться не на том слове, Рукописная пометка исчезает вместе с удалённым текстом (пользователем, агентом, другим устройством), Рассмотренные варианты, Решение, CLOSED: stroke on deleted text disappears with the text (D-35) (+1 more)

### Community 70 - "open-questions.md (3)"
Cohesion: 0.50
Nodes (4): docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo

### Community 71 - "D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS) (2)"
Cohesion: 0.50
Nodes (4): D-27. В прототипе пера текст хранится в Yrs, Контекст, Последствия, Решение

### Community 72 - "Контракт: рукописные штрихи (v1)"
Cohesion: 0.22
Nodes (9): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4.1. Перепривязка якорей (отмена и восстановление версии), 4.2. Когда штрих считается «осиротевшим» и удаляется навсегда, 4. Привязка к тексту (живой штрих), 5. Отрисовка толщины, 6. Тестовые векторы (+1 more)

### Community 73 - "open-questions.md"
Cohesion: 0.31
Nodes (7): Записываются только сглаженные coalesced-точки завершённого штриха, без predicted, Name candidates: Kora, Margins, Folio, Predicted / Coalesced Touches, OPEN (no deadline): final product name (D-24), before App Store release, OPEN (stage 1): living stroke details — circles around several words, arrows between words on different lines; decide on prototype, Stage 1: pen-in-text prototype on iPad (TextKit 2 + Yrs + pen layer, living stroke), Prototype open questions (multi-word circles, deleted marked text R-04)

### Community 74 - "libsodium on all platforms (swift-sodium on iOS, libsodium-wrappers in TS)"
Cohesion: 0.40
Nodes (5): libsodium на всех платформах (libsodium-wrappers-sumo в TS, swift-sodium в iOS), End-to-end encryption, libsodium, Operational Transformation (unsuitable), libsodium on all platforms (swift-sodium on iOS, libsodium-wrappers in TS)

### Community 75 - "3. Apple Pencil в тексте — ключевая фича"
Cohesion: 0.22
Nodes (9): 3. Apple Pencil в тексте — ключевая фича, Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера, Перекладка текста — вариант А «живой штрих» (D-05, РЕШЕНО) (+1 more)

### Community 77 - "0010-agent-edits.md"
Cohesion: 0.32
Nodes (6): Метка agentEdit (agentId, at) — подсветка правок агента до принятия пользователем, D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение

### Community 78 - "0026-file-storage.md"
Cohesion: 0.36
Nodes (6): MinIO (rejected), Server disk folder storage (default), External S3-compatible storage (Hetzner, R2, B2), File storage interface (two implementations, chosen by config), Garage / SeaweedFS, MinIO (rejected)

### Community 79 - "Web client stack (PWA)"
Cohesion: 0.29
Nodes (7): Canvas + Pointer Events, Dexie (IndexedDB), Fastify, Radix + Tailwind + Motion, TipTap editor, Vite + React + TypeScript PWA, Web client stack (PWA)

### Community 80 - "Custom iOS Pen Render Layer (Metal or Core Animation)"
Cohesion: 0.33
Nodes (6): Custom iOS Pen Render Layer (Metal or Core Animation), Canvas + Pointer Events Pen Layer, PencilKit / PKCanvasView, R-07 Web Pen Worse than Native, Pen render choice: Metal vs Core Animation (latency and frame measurement), Web without cuts: full feature parity with iOS (pen quality may be lower, R-07)

### Community 81 - "Вывод ключей из пароля: Argon2id13 (ops 3, mem 64 MiB, выход 64 байта), NFKC, соль 16 байт"
Cohesion: 0.50
Nodes (5): loginKey = BLAKE2b(authSeed, "ds1|login"); сервер хранит Argon2id(loginKey), Вывод ключей из пароля: Argon2id13 (ops 3, mem 64 MiB, выход 64 байта), NFKC, соль 16 байт, passwordKey — никогда не покидает устройство, оборачивает masterKey, Из пароля выводятся два независимых ключа: для входа (сервер хранит хэш) и для шифрования (не покидает устройство), Argon2id password key derivation

### Community 82 - "D-01. Хранение заметок — в базе данных на своём сервере, не в файлах"
Cohesion: 0.40
Nodes (5): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 83 - "D-05. Перо при перекладке текста — вариант А «живой штрих»"
Cohesion: 0.40
Nodes (5): D-05. Перо при перекладке текста — вариант А «живой штрих», Гипотеза реализации, Контекст, Последствия, Решение

### Community 84 - "D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO"
Cohesion: 0.40
Nodes (5): D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 85 - "D-15. Дизайн — основная концепция продукта"
Cohesion: 0.67
Nodes (3): D-15. Дизайн — основная концепция продукта, Последствия, Решение

### Community 86 - "D-24. Название продукта"
Cohesion: 0.67
Nodes (3): D-24. Название продукта, Контекст, Решение

## Knowledge Gaps
- **50 isolated node(s):** `Current status: stack approved, next is stage 1 pencil prototype`, `subscribe / unsubscribe — подписка на документы с since`, `welcome — аутентификация успешна (userId | null, serverTime, protocol: 1)`, `Suggestions for approval (rejected)`, `Смена пароля перешифровывает только обёртку masterKey` (+45 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 355 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Порядок чтения для новичка: концепция → roadmap → стек → обзор → перо → решения → вопросы/риски → процесс → history` connect `Платформы и клиенты (2)` to `Монорепозиторий и CLAUDE.md`, `overview.md`, `decisions/README.md`, `stack.md`, `open-questions.md`, `0005-living-stroke.md`, `Правила для ИИ и документации (2) (2)`, `risks.md`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `packages/design-tokens/tokens.json — источник значений; генерирует CSS-переменные и Swift` (e.g. with `Own unified design system for iOS and web` and `Design tokens (colors, spacing, typography, animation durations) as single source for both platforms`) actually correct?**
  _`packages/design-tokens/tokens.json — источник значений; генерирует CSS-переменные и Swift` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Current status: stack approved, next is stage 1 pencil prototype`, `subscribe / unsubscribe — подписка на документы с since`, `welcome — аутентификация успешна (userId | null, serverTime, protocol: 1)` to the rest of the system?**
  _50 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Монорепозиторий и CLAUDE.md` be split into smaller, more focused modules?**
  _Cohesion score 0.055191256830601096 - nodes in this community are weakly interconnected._
- **Why does `Datascratch — правила для ИИ` connect `Монорепозиторий и CLAUDE.md (2)` to `Правила для ИИ и документации (2) (2)`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `Yrs (Rust Yjs) with Swift Wrapper` (e.g. with `y-prosemirror не записывает атрибуты узлов со значением null: отсутствующий атрибут = null (значение по умолчанию схемы)` and `Вставка текста в Y.XmlText без явных атрибутов наследует форматирование слева (Yjs/Yrs) — писатели всегда передают явный набор атрибутов`) actually correct?**
  _`Yrs (Rust Yjs) with Swift Wrapper` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Should `Контракт: протокол синхронизации (v1)` be split into smaller, more focused modules?**
  _Cohesion score 0.06845513413506013 - nodes in this community are weakly interconnected._