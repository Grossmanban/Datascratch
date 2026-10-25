# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 355 files · ~151,038 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: (none) 10, .css 5, .example 2)

## Summary
- 4257 nodes · 9187 edges · 169 communities (154 shown, 15 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 596 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6439ae29`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- store.ts
- auth.ts
- contracts/sync.ts
- package.json
- development.md
- sync.test.ts
- crypto.md
- MCP + REST API
- context.ts
- strokes.md
- routes/attachments.ts
- Монорепозиторий и CLAUDE.md
- dependencies
- D-30. База данных сервера — PostgreSQL
- 0005-living-stroke.md
- crypto/keys.ts
- stack.md
- 10-sync.md
- Скрипт обновления графа
- setup.ts
- DSMotionToken
- decisions/README.md
- server
- with
- Монорепозиторий и CLAUDE.md (2)
- Popups.tsx
- Контракт: протокол синхронизации (v1)
- Правила для ИИ и документации (2) (2)
- CHANGELOG.md
- web-editor/package.json
- DSColorToken
- 09-agents-api.md
- infra/README.md
- strokes.md (2)
- lib/tokens.ts
- SyncConnection
- data-model.md
- api.md
- plugins/host.ts
- Organization Hierarchy (Account > Space > Notebook > Folder > Note)
- 0018-monetization.md (2)
- 12. Функции по мотивам Craft
- package.json (2)
- InlineQueue
- Shared test vectors (input -> expected output) run in Swift and TypeScript
- cn
- peerDependencies
- test-vectors/package.json
- Модель данных и глоссарий (2)
- compilerOptions
- src/crypto.ts
- document-model.md
- 0002-no-desktop-app.md
- tasks
- SyncClient
- server/README.md
- Editor.tsx
- 02-platforms.md
- 0009-notebook-mode-choice.md (2)
- DSDateChip
- compilerOptions
- sync-protocol.md
- Контракт: модель документа (v1) (2)
- Toast.tsx
- Organization Hierarchy (Account > Space > Notebook > Folder > Note) (2)
- DSBackdrop
- contracts/crypto.ts
- decisions/README.md
- Монорепозиторий и CLAUDE.md (2)
- risks.md
- 0023-documentation-source-of-truth.md
- main.tsx
- app.ts
- Dialog.tsx
- Контракт: дизайн-токены «Тихая бумага» (v1)
- 12. Функции по мотивам Craft (2)
- geometry.ts
- risks.md
- План этапов и отложенное (2)
- storage/index.ts
- shared/test/sync.test.ts
- decisions/README.md (2)
- 0005-living-stroke.md (2)
- 0001-storage-in-database.md
- with (2)
- iOS-стек и два языка (2)
- DSDateChip (2)
- pen/anchors.ts
- Контракт: шифрование (v1)
- Дизайн и организация (2)
- Дизайн и организация
- vectors.test.ts
- 0004-encryption-and-api.md
- compilerOptions (3)
- schema.ts
- SwiftUI
- Server PostgreSQL schema (encrypted bytea content; spaces/folders/meta inside account/notebook docs)
- open-questions.md (2)
- PenLayer.ts
- D-30. База данных сервера — PostgreSQL (2)
- contracts/README.md
- exports
- 0008-pdf-annotations.md
- D-29. Graphify: порядок работы, чтобы граф был всегда актуален
- D-21. Технологический стек
- CryptoError
- @tiptap/core
- iOS-стек и два языка (2) (2)
- api.md
- design-tokens.md
- Card.tsx
- Новая группа (2)
- План разработки
- Технологический стек — РЕШЕНО (2026-10-25)
- Открытые вопросы
- shared/package.json
- shared/strokes.ts
- tasks (2)
- api.md (2)
- smoke-test.sh script
- Datascratch — правила для ИИ (CLAUDE.md)
- compilerOptions (4)
- devDependencies
- 12. Функции по мотивам Craft (2)
- D-25. Redis не используем
- scripts
- D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO
- blockId.ts
- DSSidebarItem
- server/package.json
- D-21. Технологический стек (2)
- 04-editor.md (4)
- test-vectors/tsconfig.json
- D-27. В прототипе пера текст хранится в Yrs
- Обзор архитектуры: разделы (2)
- 0009-notebook-mode-choice.md (5) (2)
- True
- hint.ts
- 01-concept.md
- @node-rs/argon2
- scripts (2)
- pg-boss
- scripts (3)
- graphify_docs.py
- tsx@^4.23.15
- DSFeedback
- @types/pg@^8.23.1
- .bindTextStroke
- .resolveEntry
- yjs
- .prettierrc.json
- devDependencies
- iOS-стек и два языка (2) (3)
- jose
- Package.swift
- pnpm-workspace.yaml
- Datascratch — правила для ИИ
- iOS system fonts New York / SF Pro / SF Mono
- CommandPalette.tsx
- MemorySyncHub
- yjs.ts
- compilerOptions
- compilerOptions
- @tailwindcss/vite
- ./plugin-api
- ./contracts
- exports
- typescript@^5.9.0

## God Nodes (most connected - your core abstractions)
1. `cn()` - 80 edges
2. `PenLayer` - 42 edges
3. `DSTintToken` - 34 edges
4. `DSRGBA` - 32 edges
5. `SyncClient` - 31 edges
6. `AppContext` - 28 edges
7. `documentVectors()` - 27 edges
8. `SyncConnection` - 26 edges
9. `CryptoError` - 25 edges
10. `notFound()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО` --semantically_similar_to--> `Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/README.md
- `Чип даты (одинаково на iOS и в вебе): «Сегодня/Завтра/Вчера», день недели на 2–6 дней вперёд, иначе короткая дата; цвета danger/warning/accent/text.tertiary` --implements--> `DSDateChipModel`  [INFERRED]
  docs/architecture/contracts/design-tokens.md → apps/ios/Packages/DSDesign/Sources/DSDesign/Components/DSDateChip.swift
- `Общее` --references--> `unauthorized()`  [INFERRED]
  docs/architecture/contracts/api.md → apps/server/src/lib/errors.ts
- `7. Коды ошибок` --references--> `unauthorized()`  [INFERRED]
  docs/architecture/contracts/sync-protocol.md → apps/server/src/lib/errors.ts
- `2. Поля штриха` --references--> `block()`  [INFERRED]
  docs/architecture/contracts/strokes.md → packages/design-tokens/scripts/generate.mjs

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Off-site backup and verified restore flow (R-11)** — docs_spec_06_data_server_backups, infra_readme_nightly_backups, infra_readme_restore, infra_readme_smoke_test [EXTRACTED 1.00]
- **Crypto test vectors** — packages_test_vectors_readme_crypto_kdf_json, packages_test_vectors_readme_crypto_envelope_json, packages_test_vectors_readme_crypto_key_wraps_json, packages_test_vectors_readme_crypto_recovery_key_json, packages_test_vectors_readme_crypto_attachment_json [EXTRACTED 1.00]
- **Live stroke anchoring design (D-05, char anchors, Yjs RelativePosition, Yrs)** — docs_spec_03_pencil_d05_live_stroke, docs_spec_03_pencil_char_anchor_offset_storage, docs_spec_03_pencil_yjs_relativeposition_anchors, docs_spec_03_pencil_d27_yrs_prototype [EXTRACTED 1.00]
- **Strokes test vectors** — packages_test_vectors_readme_strokes_points_json, packages_test_vectors_readme_strokes_anchors_json, packages_test_vectors_readme_strokes_layout_json, packages_test_vectors_readme_strokes_width_json [EXTRACTED 1.00]
- **Web pen layer pipeline (input, anchoring, reflow redraw, rendering)** — docs_spec_03_pencil_pointer_events_input, docs_spec_03_pencil_dom_range_anchoring, docs_spec_03_pencil_reflow_redraw, docs_spec_03_pencil_three_canvas_layers [EXTRACTED 1.00]
- **Agent access path: token auth, ds_agent RLS scope, server-held notebook key** — apps_server_readme_agents_authenticate, apps_server_readme_agents_withscope, apps_server_readme_agent_scope, docs_architecture_data_model_rls_ds_agent, docs_spec_06_data_server_agents, infra_readme_ds_kms_key [INFERRED 0.85]
- **Strict seq ordering guarantee between server and SyncClient** — apps_server_readme_seq_assignment, apps_server_readme_broadcaster, docs_spec_06_data_server_sync_rules, packages_shared_readme_lastseq_max, docs_architecture_data_model_table_doc_updates [INFERRED 0.85]

## Communities (169 total, 15 thin omitted)

### Community 0 - "store.ts"
Cohesion: 0.05
Nodes (73): AuthorKind, NOTE_ROOTS, ANCHOR_KINDS, AnchorKind, MIN_SEGMENT_POINTS, ORPHAN_STROKE_PURGE_DAYS, POINT_BYTES, POINT_FIELDS (+65 more)

### Community 1 - "auth.ts"
Cohesion: 0.09
Nodes (55): requireUser(), agentTokenNotebooks, agentTokens, devices, refreshTokens, users, b64(), fromB64() (+47 more)

### Community 2 - "contracts/sync.ts"
Cohesion: 0.03
Nodes (69): AckMessage, ackMessageSchema, CLIENT_PLATFORMS, ClientAwarenessMessage, clientAwarenessMessageSchema, ClientMessage, clientMessageSchema, clientMsgIdSchema (+61 more)

### Community 3 - "package.json"
Cohesion: 0.03
Nodes (72): ACCESS_TOKEN_TTL_MS, AGENT_PERMISSIONS, AgentPermission, AgentToken, agentTokenSchema, API_ERROR_CODES, API_PREFIX, API_ROUTES (+64 more)

### Community 4 - "development.md"
Cohesion: 0.21
Nodes (11): Каркас монорепозитория (pnpm + Turborepo), девять потоков разработки, правила сессий-исполнителей, changelog.d, Скрипт tools/graphify_docs.py (prepare → агенты → finish), Stream sessions write changelog fragments in docs/changelog.d/ instead of editing CHANGELOG.md; stream history files docs/history/YYYY-MM-DD-<stream>-NN.md, Graph update after doc edits: graphify_docs.py prepare -> parallel extraction agents -> finish -> graphify export html -> check-update, Extraction prompt .claude/skills/graphify/references/extraction-spec.md, Git: English code/commits, Russian docs, branches + PR, one commit = code + docs + updated graph, Graphify commands (query, explain, path, update, check-update, /graphify --update), graphifyy PyPI package (command graphify), verified on 0.9.95 (+3 more)

### Community 5 - "sync.test.ts"
Cohesion: 0.09
Nodes (33): pg@^8.23.1, base64urlKey, bool, Config, ConfigSchema, loadConfig(), createDatabase(), runMigrations() (+25 more)

### Community 6 - "crypto.md"
Cohesion: 0.09
Nodes (36): Ассоциированные данные ds1|… привязывают шифротекст к месту (doc, awareness, ключи, куски вложений), Вложения шифруются кусками по 1 MiB, каждый — отдельный конверт, Конверт шифротекста: версия 0x01 + nonce 24 байта + XChaCha20-Poly1305-IETF (тег 16 байт), Иерархия ключей: пароль → passwordKey → masterKey → notebookKey → noteKey, libsodium на всех платформах (libsodium-wrappers-sumo в TS, swift-sodium в iOS), loginKey = BLAKE2b(authSeed, "ds1|login"); сервер хранит Argon2id(loginKey), masterKey — 32 случайных байта, создаётся при регистрации, шифрует account-документ, noteKey — ключ заметки: шифрует note-документ и вложения (+28 more)

### Community 7 - "MCP + REST API"
Cohesion: 0.07
Nodes (51): Agent Edit Flow (agent notebook), edit_note MCP Tool, External AI Agents, File Storage (disk or external S3), Guest via Link (web, no account), Handwriting-to-PNG Render (pg-boss queue), iOS / iPadOS Client (Swift, TextKit 2, Yrs, GRDB), Key Store (agent notebooks) (+43 more)

### Community 8 - "context.ts"
Cohesion: 0.05
Nodes (29): AccessClaims, GuestClaims, subkey(), TokenSigner, createContext(), Database, DbOrTx, agentAudit (+21 more)

### Community 9 - "strokes.md"
Cohesion: 0.07
Nodes (38): .dsOnAccent, .color, .uiColor, .color, .uiColor, .animation, DSBackdropBlob, DSBackdropSpec (+30 more)

### Community 10 - "routes/attachments.ts"
Cohesion: 0.08
Nodes (43): bearer(), requireUserOrGuest(), verifyGuestToken(), verifyUserToken(), AppContext, docs, shares, ApiError (+35 more)

### Community 11 - "Монорепозиторий и CLAUDE.md"
Cohesion: 0.07
Nodes (52): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 5. Отрисовка толщины, 6. Тестовые векторы, Контракт: рукописные штрихи (v1), D-39. Разработка параллельными сессиями; Claude сам вливает в main, Контекст (+44 more)

### Community 12 - "dependencies"
Cohesion: 0.10
Nodes (21): dependencies, @aws-sdk/client-s3@^3.1156.0, drizzle-orm@^0.45.4, fastify@^5.12.7, @fastify/cors@^11.3.1, @fastify/rate-limit@^11.2.1, @fastify/swagger@^9.9.2, @fastify/swagger-ui@^6.1.2 (+13 more)

### Community 13 - "D-30. База данных сервера — PostgreSQL"
Cohesion: 0.08
Nodes (52): DEFAULT_NOTE_STYLE, accountRoots(), createAccountDoc(), createNotebookDoc(), notebookRoots(), closeTab(), deleteFolder(), deleteNotebookRef() (+44 more)

### Community 14 - "0005-living-stroke.md"
Cohesion: 0.05
Nodes (47): Apple Pencil in text — key feature, Stroke point stored as (char anchor, dx/dy in font-size units), Custom stroke render layer over TextKit 2 (Metal or Core Animation), Web anchoring via DOM Range measurement, em offsets, Yjs relative position, Drawing block between paragraphs, Drawing on images (image coordinates), Stroke and pixel eraser (one undo step per gesture), Handwriting input types (text marks, margin notes, drawing block, drawing on images, system Scribble) (+39 more)

### Community 15 - "crypto/keys.ts"
Cohesion: 0.14
Nodes (30): AD, ATTACHMENT_CHUNK_BYTES, KdfParams, attachmentChunkCount(), attachmentCiphertextSize(), encryptAttachment(), encryptToBase64Url(), randomBytes() (+22 more)

### Community 16 - "stack.md"
Cohesion: 0.11
Nodes (34): ContextMenu, ContextMenuCheckboxItem, ContextMenuGroup, ContextMenuItemProps, ContextMenuLabel(), ContextMenuRadioGroup, ContextMenuRadioItem, ContextMenuSub (+26 more)

### Community 17 - "10-sync.md"
Cohesion: 0.11
Nodes (23): История версий: GET /docs/:id/versions и /versions/:seq (зашифрованные снимки), Метка agentEdit (agentId, at) — подсветка правок агента до принятия пользователем, Восстановление версии из истории: восстанавливаются content и strokes; якоря пересчитываются через абсолютные индексы → новая относительная позиция, Агенты не подключаются по WebSocket — работают через MCP/REST; сервер применяет их правки как обычные обновления, Снимки и уплотнение: > 500 обновлений или > 1 MiB → снимок; удаление seq ≤ baseSeq, кроме нужных истории (R-05), D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history (+15 more)

### Community 18 - "Скрипт обновления графа"
Cohesion: 0.03
Nodes (82): 1. Три вида документов Yjs, 2. Документ `account`, 3. Документ `notebook` (индекс блокнота), 4.1. Совместимость с TipTap / y-prosemirror, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note`, 5. Производные данные (не синхронизируются) (+74 more)

### Community 19 - "setup.ts"
Cohesion: 0.18
Nodes (3): @testing-library/jest-dom@^7.0.1, RO, @testing-library/jest-dom

### Community 20 - "DSMotionToken"
Cohesion: 0.14
Nodes (12): .body, Animation, DSAnimationModifier, .animation, DSPressableStyle, View, withDSAnimation(), DSMotionToken (+4 more)

### Community 21 - "decisions/README.md"
Cohesion: 0.04
Nodes (82): Server app (Node.js 22 + TypeScript, Fastify, zod, Drizzle/PostgreSQL, pg-boss, in-memory WebSocket broadcast), Automerge (fallback CRDT), Yrs (Rust Yjs) with Swift Wrapper, Утверждён технологический стек (D-21), отказ от ядра на Rust (D-22), D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение (+74 more)

### Community 22 - "server"
Cohesion: 0.04
Nodes (46): context, dockerfile, depends_on, environment, image, ports, profiles, restart (+38 more)

### Community 23 - "with"
Cohesion: 0.05
Nodes (45): concurrency, cancel-in-progress, group, runs-on, steps, timeout-minutes, POSTGRES_DB, POSTGRES_PASSWORD (+37 more)

### Community 24 - "Монорепозиторий и CLAUDE.md (2)"
Cohesion: 0.07
Nodes (43): apps/ios — iPhone + iPad, iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), GitHub Actions CI (incl. macOS iOS builds), Custom iOS Pen Render Layer (Metal or Core Animation), TextKit 2 (UIKit editor), XcodeGen, Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28) (+35 more)

### Community 25 - "Popups.tsx"
Cohesion: 0.12
Nodes (17): @tiptap/pm@^3.32.0, @tiptap/suggestion@^3.32.0, BlockMenu(), blockTargetAt(), DragHandle(), LIST_ITEMS, Target, Floating() (+9 more)

### Community 26 - "Контракт: протокол синхронизации (v1)"
Cohesion: 0.05
Nodes (54): D-15 Design principle, D-38 Design system decision, D-39 design-system stream, design-tokens contract (docs/architecture/contracts/design-tokens.md), design.yml CI workflow (macOS), DSAvatar / DSAvatarStack, DSBackdrop / DSGrain, DSButtonStyle (+46 more)

### Community 27 - "Правила для ИИ и документации (2) (2)"
Cohesion: 0.06
Nodes (36): DSGlassPanel, .body, GlassPreview, .body, View, Color, .dsAccent, .dsCanvas (+28 more)

### Community 28 - "CHANGELOG.md"
Cohesion: 0.13
Nodes (24): 2026-10-25, 2026-10-25 (вторая половина дня), Контракты для параллельной разработки (docs/architecture/contracts/), Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел), Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, Создан CLAUDE.md и скелет монорепозитория (apps/, packages/, infra/) (+16 more)

### Community 29 - "web-editor/package.json"
Cohesion: 0.04
Nodes (64): dependencies, lowlight@^3.3.0, mermaid@^12.2.0, @tiptap/extension-code-block-lowlight@^3.32.0, @tiptap/extension-horizontal-rule@^3.32.0, @tiptap/extension-link@^3.32.0, @tiptap/extension-list@^3.32.0, @tiptap/extension-table@^3.32.0 (+56 more)

### Community 30 - "DSColorToken"
Cohesion: 0.04
Nodes (39): .color, DSShadowModifier, View, DSBackdropToken, dusk, ember, meadow, mist (+31 more)

### Community 31 - "09-agents-api.md"
Cohesion: 0.10
Nodes (22): Журнал действий агента GET /agent-tokens/:id/audit, AgentToken { id, name, notebookIds, permission, expiresAt, createdAt, lastUsedAt } — без секрета, Токены агентов /agent-tokens: блокноты, read / read_write, срок; токен показывается один раз, Контракт agents-api.md (MCP и REST для самих агентов) — появится на этапе агентов, blockId (UUIDv7) у каждого блочного узла — для точечных правок агентов, заметок на полях и комментариев, D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Server responsibilities (accounts, encrypted relay, attachments, realtime, API/MCP, PNG render for agents) (+14 more)

### Community 32 - "infra/README.md"
Cohesion: 0.06
Nodes (33): notebooks table (private/agent mode, notebookKey wrapped), R-11 Single VPS Is a Single Point of Failure, 6. Модель данных и сервер, Self-hosting, Агенты (D-30), Вход и сессии (D-34, `contracts/crypto.md`), Корзина, Модель данных (общий обзор; детали — `architecture/data-model.md`) (+25 more)

### Community 33 - "strokes.md (2)"
Cohesion: 0.06
Nodes (44): Блок drawing (высота в pt; штрихи — в strokes), Контракт меняет только сессия-координатор; исполнитель присылает предложение, anchorKind: text | block (заметка на полях) | image | drawing, Перепривязка якорей после отмены/повтора: в той же транзакции якорь удалённого символа с redone-элементом переписывается на относительную позицию нового элемента, Координаты block / image / drawing — в долях ширины блока, Обводки и стрелки «растягиваются» вместе с текстом; при проблемах — изменение контракта через координатора, Правило D-35 в отрисовке: точки удалённых символов не рисуются, штрих остаётся в документе; отмена возвращает пометку, Координаты text-штриха: смещение от начала глифа якорного символа в em (+36 more)

### Community 34 - "lib/tokens.ts"
Cohesion: 0.08
Nodes (23): backdropNames, colorNames, highlightNames, inkNames, tintNames, tokens, Avatar(), AvatarProps (+15 more)

### Community 35 - "SyncConnection"
Cohesion: 0.21
Nodes (4): SyncConnection, SyncError, b64Size(), SyncErrorCode

### Community 36 - "data-model.md"
Cohesion: 0.12
Nodes (16): Поля штриха: v, tool, color, width, opacity, anchorKind, blockId, anchors, points, hint, author, createdAt, Anchor (textRange | paragraph | drawingBlock | image), Note (text tree, handwriting layer, attachments, metadata), Organization hierarchy (Account > Space > Notebook > Folder > Note), Stroke (formatVersion, id, tool, color, width, anchor, points, createdAt, author), StrokePoint (charAnchor RelativePosition, dx/dy, pressure, altitude, azimuth, roll, t), storage_trash table (file keys to delete, filled by trigger), Заметка (+8 more)

### Community 37 - "api.md"
Cohesion: 0.09
Nodes (26): POST /docs — регистрация документа (account / notebook / note) до первого push, Share { id, target { kind, id }, permission, expiresAt, createdAt } — ссылка шеринга, Шеринг: /shares (view/edit, бессрочно по умолчанию, отзыв сразу отключает гостей), Права: user — документы своего аккаунта; guest — только документы шеринга, push только с правом edit, shares table (share links: target, permission, expiry, revocation), D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account, Real-time collaborative editing (+18 more)

### Community 38 - "plugins/host.ts"
Cohesion: 0.15
Nodes (25): Db, migrationsFolder, Tx, withAgentScope(), notebooks, notFound(), AD, getSodium() (+17 more)

### Community 39 - "Organization Hierarchy (Account > Space > Notebook > Folder > Note)"
Cohesion: 0.08
Nodes (35): katex@^0.16.0, Callout, CALLOUT_TONES, Commands, Drawing, DRAWING_REFERENCE_WIDTH, FileBlock, formatSize() (+27 more)

### Community 40 - "0018-monetization.md (2)"
Cohesion: 0.09
Nodes (38): Provider(), DateChipProps, tones, Calendar(), CalendarProps, DatePicker(), DatePickerProps, Popover (+30 more)

### Community 41 - "12. Функции по мотивам Craft"
Cohesion: 0.07
Nodes (27): ChipsPreview, .body, DSBadge, .body, .colors, DSTagChip, .body, Style (+19 more)

### Community 42 - "package.json (2)"
Cohesion: 0.07
Nodes (31): devDependencies, eslint@^9.39.0, eslint-config-prettier@^10.1.0, @eslint/js@^9.39.0, globals@^16.4.0, prettier@^3.6.0, turbo@^2.5.0, typescript@^5.9.0 (+23 more)

### Community 43 - "InlineQueue"
Cohesion: 0.11
Nodes (6): EnqueueOptions, InlineQueue, JobHandler, JobQueue, PgBossQueue, RegisterOptions

### Community 44 - "Shared test vectors (input -> expected output) run in Swift and TypeScript"
Cohesion: 0.06
Nodes (33): Broadcaster interface (sync/hub.ts, in-memory), @datascratch/shared/contracts (types and zod schemas, parseClientMessage/parseServerMessage), @datascratch/shared package (ESM, strict TS, tsup), @datascratch/shared/document (account/notebook/note factories, PM-JSON <-> Yjs, backlinks, Markdown export, applyBlockOperations), @datascratch/shared/ids (monotonic uuidv7), MemorySyncHub (reference in-memory protocol server for tests), packages/shared — `@datascratch/shared`, REMOTE_ORIGIN update origin (+25 more)

### Community 45 - "cn"
Cohesion: 0.16
Nodes (28): AvatarStack(), Backdrop(), Badge(), TagChip(), DocCard, TaskCheckbox, ContextMenuContent, ContextMenuItem (+20 more)

### Community 46 - "peerDependencies"
Cohesion: 0.20
Nodes (10): react@^19.3.1, react-dom@^19.3.1, tailwindcss@^4.3.3, react, react-dom, peerDependencies, react@^19.0.0, react-dom@^19.0.0 (+2 more)

### Community 47 - "test-vectors/package.json"
Cohesion: 0.08
Nodes (32): description, devDependencies, @datascratch/shared@workspace:*, eslint@^9.39.0, libsodium-wrappers-sumo@^0.8.2, prosemirror-model@^1.25.0, tsx@^4.20.0, @types/node@^22.10.0 (+24 more)

### Community 48 - "Модель данных и глоссарий (2)"
Cohesion: 0.08
Nodes (40): RFC-9562, UUID_V7_REGEX, BLOCK_NODES, INLINE_NODES, MARKS, pmNodeSchema, TEXTBLOCK_NODES, addAgentMark() (+32 more)

### Community 49 - "compilerOptions"
Cohesion: 0.09
Nodes (22): DSCheckmark, DSTaskCheckbox, .body, .isDone, DSTaskState, cancelled, done, open (+14 more)

### Community 50 - "src/crypto.ts"
Cohesion: 0.15
Nodes (22): toBase64Url(), toHex(), utf8(), deriveRecoveryLoginKey(), signupFields(), initCrypto(), resolveAnchors(), cryptoVectors() (+14 more)

### Community 51 - "document-model.md"
Cohesion: 0.11
Nodes (32): y-prosemirror не записывает атрибуты узлов со значением null: отсутствующий атрибут = null (значение по умолчанию схемы), Документ account: spaces, notebooks, settings, starred, tabs (ключ — masterKey), Схема блоков: doc = title block+ (paragraph, heading, списки, taskList, callout, codeBlock, mathBlock, mermaid, table, image, file, drawing, pageCard), Comment { blockId, anchor (относительные позиции), author user | guest | agent, text, resolvedAt }, Даты ISO 8601 в UTC; «только дата» YYYY-MM-DD; миллисекунды — только в штрихах, Производные данные строятся локально: индекс задач, полнотекстовый поиск, бэклинки, теги, Векторы совместимости модели документа packages/test-vectors/document/* (iOS/Yrs обязан читать и писать формат y-prosemirror), Вставка текста в Y.XmlText без явных атрибутов наследует форматирование слева (Yjs/Yrs) — писатели всегда передают явный набор атрибутов (+24 more)

### Community 52 - "0002-no-desktop-app.md"
Cohesion: 0.05
Nodes (39): Решения по анкетам пользователя: D-32…D-41 и PDF после MVP (D-08), D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, D-03. Платформы: нативные iPhone и iPad + полноценный веб, Full-featured web client (TypeScript), Контекст, Последствия (+31 more)

### Community 53 - "tasks"
Cohesion: 0.06
Nodes (31): concurrency, cancel-in-progress, group, run, CI, jobs, test, name (+23 more)

### Community 55 - "server/README.md"
Cohesion: 0.08
Nodes (11): AgentScope (listNotebooks, docKey, readDoc, applyUpdate, createNoteDoc, attachments, audit, tx), agents.withScope(principal, fn): transaction under ds_agent with RLS, apps/server — сервер Datascratch, Server dev commands (pnpm build/typecheck/lint/test/db:generate/db:migrate), OpenAPI from code (GET /v1/openapi.json), ServerPlugin interface (@datascratch/agents loading), Запуск для разработки, Плагины (интерфейс для `@datascratch/agents`) (+3 more)

### Community 56 - "Editor.tsx"
Cohesion: 0.11
Nodes (33): META_ORIGIN, Cover(), DatascratchEditor(), DatascratchEditorProps, EditorUser, FONT_VARS, useHostRef(), WIDTHS (+25 more)

### Community 57 - "02-platforms.md"
Cohesion: 0.14
Nodes (14): CardsPreview, .body, DSCard, .body, DSDocCard, .body, View, DSSegment (+6 more)

### Community 58 - "0009-notebook-mode-choice.md (2)"
Cohesion: 0.10
Nodes (24): dependencies, clsx@^2.1.1, cmdk@^1.1.1, @datascratch/design-tokens@workspace:*, @fontsource-variable/inter@^5.3.0, @fontsource-variable/jetbrains-mono@^5.3.0, @fontsource-variable/source-serif-4@^5, lucide-react@^1.61.0 (+16 more)

### Community 59 - "DSDateChip"
Cohesion: 0.11
Nodes (17): DateChipPreview, .body, DSDateChip, .body, .color, .model, DSDateChipModel, Tone (+9 more)

### Community 60 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, lib, module, moduleResolution, noEmit, outDir, rootDir, types (+3 more)

### Community 61 - "sync-protocol.md"
Cohesion: 0.20
Nodes (18): Формат ошибок { error: { code, message } } и коды bad_request…internal, ack — обновление или снимок принят и сохранён (docId, clientMsgId, seq), Коды ошибок синхронизации: unauthorized, forbidden, doc_not_found, payload_too_large (2 MiB / 50 MiB), rate_limited, protocol_mismatch, internal, error — сообщение сервера: code, message, ref? (clientMsgId / docId), Клиент хранит lastSeq по каждому документу и догоняет недостающее при подключении, Сервер не присылает клиенту его собственные обновления (кроме updates при догоняющей подписке с другого устройства), Офлайн: обновления копятся в локальной очереди до подтверждения ack, Лимиты payload_too_large: обновление 2 MiB, снимок 50 MiB — считаются декодированные байты, не base64 (+10 more)

### Community 62 - "Контракт: модель документа (v1) (2)"
Cohesion: 0.13
Nodes (17): ACCOUNT_ROOTS, FORMAT_VERSION, NOTEBOOK_ROOTS, NotebookMeta, NotebookMetaFields, NoteDocMeta, PMNode, AccountDocRoots (+9 more)

### Community 63 - "Toast.tsx"
Cohesion: 0.25
Nodes (8): icons, ToastApi, ToastContext, ToastItem, ToastOptions, ToastTone, useToast(), Toasts()

### Community 64 - "Organization Hierarchy (Account > Space > Notebook > Folder > Note) (2)"
Cohesion: 0.10
Nodes (19): AvatarPreview, .body, DSAvatar, .body, .presenceLabel, DSAvatarStack, .body, DSPresence (+11 more)

### Community 65 - "DSBackdrop"
Cohesion: 0.15
Nodes (8): BackdropGallery, .body, DSBackdrop, .body, DSGrain, .body, GrainPattern, SplitMix64

### Community 66 - "contracts/crypto.ts"
Cohesion: 0.11
Nodes (25): DEFAULT_KDF, ENVELOPE_VERSION, KDF_ALG, KDF_MEM, KDF_OPS, KDF_OUTPUT_BYTES, kdfParamsSchema, KEY_BYTES (+17 more)

### Community 67 - "decisions/README.md"
Cohesion: 0.08
Nodes (38): Button, buttonClasses(), ButtonProps, ButtonSize, ButtonVariant, sizes, variants, Checkbox (+30 more)

### Community 68 - "Монорепозиторий и CLAUDE.md (2)"
Cohesion: 0.15
Nodes (6): RenderPoint, resetFontMetrics(), PenLayer, fillSegments(), prepareCanvas(), pointerSample()

### Community 69 - "risks.md"
Cohesion: 0.10
Nodes (18): ButtonsPreview, .body, ButtonStyle, DSButtonBody, .body, .fill, .foreground, .height (+10 more)

### Community 70 - "0023-documentation-source-of-truth.md"
Cohesion: 0.14
Nodes (10): Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, D-19. Весь код пишет Claude, Последствия, Решение, D-23. Документация — источник истины; Graphify — граф знаний поверх неё, docs/history session log, Контекст, Последствия (+2 more)

### Community 71 - "main.tsx"
Cohesion: 0.07
Nodes (17): TestEditor(), TestEditorProps, Window, App(), attachments, awA, awB, docA (+9 more)

### Community 72 - "app.ts"
Cohesion: 0.07
Nodes (23): agents.authenticate(token) -> AgentPrincipal, PluginHost (apiVersion, log, config, db, pool, jobs, crypto, agents), buildApp(), BuildOptions, codeForStatus(), main(), ApiErrorCode, AgentDoc (+15 more)

### Community 73 - "Dialog.tsx"
Cohesion: 0.22
Nodes (15): Dialog, DialogClose, DialogContent, DialogContentProps, DialogTrigger, Sheet, SheetClose, SheetContent (+7 more)

### Community 74 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.15
Nodes (25): at(), 4.2. Схема блоков, PMMark, attr(), block(), blockBody(), CALLOUT_KIND, children() (+17 more)

### Community 75 - "12. Функции по мотивам Craft (2)"
Cohesion: 0.09
Nodes (26): Ежедневные заметки и «Входящие» (kind daily / inbox) в блокноте settings.dailyNotebookId, D-41. Набор функций по мотивам Craft, Контекст, Решение, OPEN (before stage 2): Craft features MVP / post-MVP split (D-41, proposed), Stage 2: MVP on iPad and iPhone, local (editor, handwriting, links, tags, organization, search, design system), 12.1. Задачи, 12.2. Ежедневные заметки и календарь (+18 more)

### Community 76 - "geometry.ts"
Cohesion: 0.21
Nodes (15): bindToText(), distToSegment(), glyphForX(), groupLines(), hitsSegments(), intervalDistance(), leadingEdge(), lineForPoint() (+7 more)

### Community 77 - "risks.md"
Cohesion: 0.09
Nodes (25): Canvas + Pointer Events Pen Layer, Платный аккаунт Apple Developer; Team ID задаётся на Mac при первой подписи, в репозитории не хранится, Git, Graphify, Автоматизация, Две среды, Команды, Конец сессии (+17 more)

### Community 78 - "План этапов и отложенное (2)"
Cohesion: 0.06
Nodes (33): env, runs-on, services, steps, timeout-minutes, concurrency, cancel-in-progress, group (+25 more)

### Community 79 - "storage/index.ts"
Cohesion: 0.13
Nodes (7): Server source layout (index, config, app, context, db, routes, sync, services, storage, jobs, plugins, drizzle), DiskStorage, createStorage(), S3Options, S3Storage, BlobStorage, chunkKey()

### Community 81 - "decisions/README.md (2)"
Cohesion: 0.17
Nodes (15): ADR file number equals decision number (D-05 -> 0005-*.md), template 0000-template.md, Нумерация решений D-NN и файлы decisions/00NN-*.md, Документация Datascratch — единственный источник истины, history/ — архив, не источник истины; исключена из графа (.graphifyignore), Соглашение о статусах РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Правило замены: решение РЕШЕНО не переписывается, ADR получает статус «ЗАМЕНЕНО решением D-NN», Оглавление docs/ (spec, contracts, architecture, decisions, roadmap, risks…), Документация Datascratch (+7 more)

### Community 82 - "0005-living-stroke.md (2)"
Cohesion: 0.12
Nodes (12): DSFontModifier, View, DSTypeToken, body, callout, caption, footnote, h1 (+4 more)

### Community 83 - "0001-storage-in-database.md"
Cohesion: 0.10
Nodes (18): hint — распознанная форма (underline, strike, circle, highlight, arrow, scribble) для агентов и экспорта, D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты (+10 more)

### Community 84 - "with (2)"
Cohesion: 0.11
Nodes (22): run, defaults, name, runs-on, steps, jobs, ios, web (+14 more)

### Community 85 - "iOS-стек и два языка (2)"
Cohesion: 0.21
Nodes (9): AnchorBox, Glyph, blockIdOf(), blockIds, ElementInfo, FontMetrics, LayoutPass, metricsCache (+1 more)

### Community 87 - "pen/anchors.ts"
Cohesion: 0.24
Nodes (13): decodeAnchor(), encodeCharAnchor(), followRedone(), followRedoneId(), isAnchorDeleted(), rebaseRedoneAnchors(), resolveCharAnchor(), setup() (+5 more)

### Community 88 - "Контракт: шифрование (v1)"
Cohesion: 0.11
Nodes (19): note(), 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке (+11 more)

### Community 89 - "Дизайн и организация (2)"
Cohesion: 0.13
Nodes (16): Space { id, name, icon, color, order, createdAt } в account-документе, Проекты, личное, работа, учёба не смешиваются; минимум кнопок на экране, D-14. Организация: богатая, но не перегруженная, Предложенная структура: пространства → вложенные папки; поперёк — вложенные и умные теги, цвета, избранное, недавние, Решение, Поперёк структуры — теги, умные теги, избранное, недавние, D-36. Структура: пространство → блокноты → папки, Пространство (Личное, Работа, Учёба) содержит несколько блокнотов (+8 more)

### Community 90 - "Дизайн и организация"
Cohesion: 0.11
Nodes (18): BackdropBlob, BackdropName, BackdropSpec, ColorName, DurationName, HighlightName, InkName, MotionName (+10 more)

### Community 91 - "vectors.test.ts"
Cohesion: 0.13
Nodes (21): TASK_STATES, TaskState, fromHex(), ATTR_TEXT_BLOCKS, attrText(), buildBacklinks(), deltaText(), extractNoteLinks() (+13 more)

### Community 92 - "0004-encryption-and-api.md"
Cohesion: 0.15
Nodes (17): PATCH /notebooks/:id/mode — включение режима «для агентов» передаёт notebookKey, выключение удаляет серверную обёртку, Режим «для агентов»: клиент передаёт notebookKey по TLS, сервер оборачивает его serverKey; расшифровка только при запросе агента с токеном, NotebookRef { id, spaceId, name, mode: private | agent, … } — ключ блокнота здесь не хранится, D-04. Одновременно сквозное шифрование и доступ по API, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), Контекст, Последствия (+9 more)

### Community 93 - "compilerOptions (3)"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib, module (+10 more)

### Community 94 - "schema.ts"
Cohesion: 0.13
Nodes (17): agentPermission, attachmentChunks, attachments, bytea, docKind, KdfParams, notebookMode, recoveryTokens (+9 more)

### Community 95 - "SwiftUI"
Cohesion: 0.13
Nodes (8): DSShowcase, .body, .sidebar, SnapshotTests, DSDesign, Foundation, SwiftUI, Testing

### Community 96 - "Server PostgreSQL schema (encrypted bytea content; spaces/folders/meta inside account/notebook docs)"
Cohesion: 0.14
Nodes (12): Server PostgreSQL schema (encrypted bytea content; spaces/folders/meta inside account/notebook docs), agent_audit table (agent action log), agent_tokens / agent_token_notebooks tables, attachments / attachment_chunks tables, devices table (devices = sessions), doc_snapshots table (encrypted snapshots = history versions), doc_updates table (encrypted Yjs updates, (doc_id, seq), client_msg_id), docs table (account/notebook/note, last_seq, snapshot_seq) (+4 more)

### Community 97 - "open-questions.md (2)"
Cohesion: 0.11
Nodes (17): description, exports, ./theme.css, ./tokens.css, ./tokens.json, files, main, name (+9 more)

### Community 98 - "PenLayer.ts"
Cohesion: 0.18
Nodes (11): Bounds, InputPoint, pointsWithin(), ActiveStroke, ANCHOR_REBASE_ORIGIN, DEFAULT_PEN_SETTINGS, Entry, EraserMode (+3 more)

### Community 99 - "D-30. База данных сервера — PostgreSQL (2)"
Cohesion: 0.19
Nodes (18): @tiptap/core@^3.32.0, addDays(), Commands, dateChipLabel(), localDate(), MONTHS, nextWeek(), requestTaskMenu() (+10 more)

### Community 100 - "contracts/README.md"
Cohesion: 0.22
Nodes (9): Тестовые векторы crypto: KDF, конверты, Base32 ключа восстановления, куски вложений (Swift и TS), Контракт — точное описание формата/протокола, который реализуют несколько частей (iOS на Swift, веб и сервер на TS), Версионирование контрактов v1, v2…; ломающее изменение — новая версия с явной миграцией, Совместимость доказывается общими тестовыми векторами (packages/test-vectors), Типы TypeScript контрактов в packages/shared/src/contracts/ — часть контракта, Контракты между частями системы, Правила изменения, Тестовые векторы strokes: упаковка точек, разрешение якорей после правок, правило D-35 (+1 more)

### Community 101 - "exports"
Cohesion: 0.12
Nodes (17): import, types, import, types, exports, ./crypto, ./document, ./ids (+9 more)

### Community 102 - "0008-pdf-annotations.md"
Cohesion: 0.24
Nodes (8): D-08. Аннотации PDF пером — не в MVP, Аннотации PDF пером (PDFKit + свой слой штрихов) — после MVP, этап расширений, Решение, Решение (предложение), D-16. Импорт — не сейчас, Решение, CLOSED: PDF annotations after MVP (D-08), Stage 6: extensions (PDF annotations, link graph, templates, import, maybe built-in AI)

### Community 103 - "D-29. Graphify: порядок работы, чтобы граф был всегда актуален"
Cohesion: 0.14
Nodes (16): Стартовый хук Claude Code (.claude/hooks/session-start.sh), D-23 (документация), D-29. Graphify: порядок работы, чтобы граф был всегда актуален, git-хук Graphify (пересборка только по изменённому коду), Graphify 0.9.95 (пакет graphifyy), R-09 (риск: Graphify сломается или исчезнет), Смысловой слой графа (понятия, решения, связи — проход ИИ), Структурный слой графа (код, файлы, заголовки — без ИИ) (+8 more)

### Community 104 - "D-21. Технологический стек"
Cohesion: 0.19
Nodes (16): PenTool, TOOL_DEFAULTS, colorTokenVar(), HIGHLIGHT_TOKENS, INK_TOKENS, resolveColor(), TINTS, TOKEN_FALLBACKS (+8 more)

### Community 105 - "CryptoError"
Cohesion: 0.14
Nodes (22): RFC-4648, ENVELOPE_OVERHEAD, SHARE_LINK_KEY_PARAM, decryptAttachment(), decryptAttachmentChunk(), encryptAttachmentChunk(), bytesEqual(), concatBytes() (+14 more)

### Community 106 - "@tiptap/core"
Cohesion: 0.14
Nodes (23): y-protocols@^1.0.7, Collaboration, CollaborationOptions, createNoteUndoManager(), cursorBuilder(), PEN_ORIGIN, buildExtensions(), CoreOptions (+15 more)

### Community 107 - "iOS-стек и два языка (2) (2)"
Cohesion: 0.13
Nodes (15): devDependencies, eslint@^9.39.0, prosemirror-model@^1.25.12, @types/node@^22.10.0, @types/ws@^8.5.13, vitest@^3.2.0, ws@^8.18.0, y-prosemirror@^1.3.7 (+7 more)

### Community 108 - "api.md"
Cohesion: 0.14
Nodes (17): Аккаунт и устройства: /me, /devices (отзыв сессий), удаление аккаунта, Вложения: загрузка и докачка по кускам (/attachments/:id/chunks/:index), лимит 200 МБ, Эндпоинты /auth: prelogin, signup, login, refresh, logout, recovery, password, Аутентификация Bearer: accessToken 15 мин + refreshToken 30 дней с ротацией, Идентификаторы создаёт клиент (UUIDv7); повторный POST идемпотентен, иначе 409 conflict, Device { id, name, createdAt, lastSeenAt, current } — устройство (сессия) аккаунта, POST /shares/:id/guest — гостевой токен (без авторизации) для hello в синхронизации, GET /health → { ok: true, version } — служебная проверка сервера (+9 more)

### Community 109 - "design-tokens.md"
Cohesion: 0.04
Nodes (72): DSDesign — дизайн-система «Тихая бумага» для iOS, Как пользоваться, Компоненты, Сборка и тесты, Токены, Подложки backdrop.* (sand, dusk, mist, meadow, ember) — мягкие градиенты в духе Craft, Цветовые токены: bg.canvas («бумага»), text.primary («чернила»), accent («синие чернила»), danger/success/warning — светлая и тёмная тема, Ширина колонки документа: normal 720, wide 960, full (+64 more)

### Community 110 - "Card.tsx"
Cohesion: 0.22
Nodes (7): BackdropProps, Card, CardProps, coverHeights, DocCardProps, pads, titleSizes

### Community 111 - "Новая группа (2)"
Cohesion: 0.14
Nodes (14): 1. Купить сервер, 2. Домен, 3. Подключиться и подготовить сервер, 4. Скачать проект, 5. Заполнить настройки, 6. Запустить, 7. Резервные копии каждую ночь, 8. Обновление сервера (+6 more)

### Community 112 - "План разработки"
Cohesion: 0.15
Nodes (13): Критерии приёмки, План разработки, Подготовка, Потоки разработки (D-39), Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad) (+5 more)

### Community 113 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 114 - "Открытые вопросы"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 115 - "shared/package.json"
Cohesion: 0.18
Nodes (12): dependencies, libsodium-wrappers-sumo@^0.8.2, zod@^4.1.0, description, files, libsodium-wrappers-sumo, zod, name (+4 more)

### Community 116 - "shared/strokes.ts"
Cohesion: 0.21
Nodes (13): PenLayerOptions, FIELDS, POINT_BYTES, POINT_FLOATS, pressureCurve(), Stroke, StrokeAnchorKind, StrokeAuthor (+5 more)

### Community 117 - "tasks (2)"
Cohesion: 0.17
Nodes (11): dependsOn, outputs, dependsOn, $schema, tasks, build, lint, test (+3 more)

### Community 118 - "api.md (2)"
Cohesion: 0.18
Nodes (11): Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1), Служебное, Токены агентов (`spec/09-agents-api.md`), Шеринг (D-13, D-37) (+3 more)

### Community 119 - "smoke-test.sh script"
Cohesion: 0.29
Nodes (7): backup.sh script, restore.sh script, json(), rnd(), smoke-test.sh script, uuid(), wait_health()

### Community 120 - "Datascratch — правила для ИИ (CLAUDE.md)"
Cohesion: 0.16
Nodes (12): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Смешанный режим: облачные сессии (Linux, без Xcode) + Mac пользователя для сборки и iPad, D-28 (облако + Mac, CI) (+4 more)

### Community 121 - "compilerOptions (4)"
Cohesion: 0.20
Nodes (9): compilerOptions, declaration, noEmit, outDir, rootDir, sourceMap, extends, include (+1 more)

### Community 122 - "devDependencies"
Cohesion: 0.11
Nodes (19): devDependencies, jsdom@^30.1.3, @ladle/react@^5.1.1, @testing-library/react@^16.3.3, @testing-library/user-event@^14.6.8, @types/react@^19.3.0, @types/react-dom@^19.3.0, typescript@^5.9.3 (+11 more)

### Community 123 - "12. Функции по мотивам Craft (2)"
Cohesion: 0.20
Nodes (10): 3. Apple Pencil в тексте — ключевая фича, Веб: слой пера (поток web-editor), Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера (+2 more)

### Community 124 - "D-25. Redis не используем"
Cohesion: 0.40
Nodes (5): D-25. Redis не используем, Будущее, Контекст, Последствия, Решение

### Community 125 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, db:generate, db:migrate, dev, lint, start, test (+1 more)

### Community 126 - "D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO"
Cohesion: 0.40
Nodes (5): D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Контекст, Последствия, Рассмотренные варианты, Решение

### Community 127 - "blockId.ts"
Cohesion: 0.36
Nodes (7): BlockId, blockIdPluginKey, findIdFixes(), hasAttr(), stripIds(), UNIQUE_ATTRS, uuidv7()

### Community 128 - "DSSidebarItem"
Cohesion: 0.22
Nodes (8): DSSidebarItem, .body, .disclosure, DSSidebarSection, .body, .isExpanded, SidebarPreview, .body

### Community 129 - "server/package.json"
Cohesion: 0.13
Nodes (14): fastify-plugin@^6.0.1, @fastify/websocket@^11.3.4, ws@^8.22.0, engines, node, files, ws, main (+6 more)

### Community 130 - "D-21. Технологический стек (2)"
Cohesion: 0.25
Nodes (7): createNotebookRequestSchema, emailSchema, registerDocRequestSchema, signupRequestSchema, isoDateTimeSchema, uuidSchema, KEY

### Community 131 - "04-editor.md (4)"
Cohesion: 0.25
Nodes (7): compilerOptions, lib, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 132 - "test-vectors/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, lib, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 133 - "D-27. В прототипе пера текст хранится в Yrs"
Cohesion: 0.50
Nodes (4): D-27. В прототипе пера текст хранится в Yrs, Контекст, Последствия, Решение

### Community 134 - "Обзор архитектуры: разделы (2)"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 135 - "0009-notebook-mode-choice.md (5) (2)"
Cohesion: 0.29
Nodes (7): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Вход и восстановление доступа (D-34), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 136 - "True"
Cohesion: 0.29
Nodes (7): paths, branches, paths, True, pull_request, push, workflow_dispatch

### Community 137 - "hint.ts"
Cohesion: 0.25
Nodes (9): Line, P, pathLength(), recognizeHint(), totalTurning(), xReversals(), StrokeHint, glyphs (+1 more)

### Community 138 - "01-concept.md"
Cohesion: 0.06
Nodes (26): apps/web — веб-клиент, Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, Порядок чтения для новичка: концепция → roadmap → стек → обзор → перо → решения → вопросы/риски → процесс → history, 1. Концепция продукта (+18 more)

### Community 140 - "scripts (2)"
Cohesion: 0.33
Nodes (6): scripts, build, lint, test, test:watch, typecheck

### Community 142 - "scripts (3)"
Cohesion: 0.33
Nodes (6): scripts, dev, lint, showcase:build, test, typecheck

### Community 143 - "graphify_docs.py"
Cohesion: 0.28
Nodes (7): Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 145 - "DSFeedback"
Cohesion: 0.21
Nodes (7): DSFeedback, delete, selection, .sensoryFeedback, taskComplete, DSHaptics, View

### Community 147 - ".bindTextStroke"
Cohesion: 0.40
Nodes (3): bindToSurface(), packPoints(), StrokeTool

### Community 148 - ".resolveEntry"
Cohesion: 0.29
Nodes (3): ProsemirrorMapping, resolveSurfaceSegments(), segmentsBounds()

### Community 149 - "yjs"
Cohesion: 0.50
Nodes (4): yjs@^13.6.27, yjs, peerDependencies, yjs@^13.6.0

### Community 150 - ".prettierrc.json"
Cohesion: 0.50
Nodes (3): printWidth, singleQuote, trailingComma

### Community 151 - "devDependencies"
Cohesion: 0.09
Nodes (21): devDependencies, drizzle-kit@^0.31.11, eslint@^10.13.0, @eslint/js@^10.0.1, pino-pretty@^13.2.0, @types/libsodium-wrappers-sumo@^0.8.2, @types/node@^22.20.5, @types/ws@^8.18.2 (+13 more)

### Community 157 - "Datascratch — правила для ИИ"
Cohesion: 0.29
Nodes (7): Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой, Правила, Среда разработки

### Community 159 - "CommandPalette.tsx"
Cohesion: 0.14
Nodes (18): CommandGroup(), CommandItem(), CommandItemProps, CommandPalette(), CommandPaletteProps, useCommandPaletteShortcut(), IconButtonProps, sizes (+10 more)

### Community 161 - "MemorySyncHub"
Cohesion: 0.22
Nodes (4): base64UrlDecodedLength(), WebSocketFactory, deliver(), MemorySyncHub

### Community 162 - "yjs.ts"
Cohesion: 0.26
Nodes (10): attributesToMarks(), Attrs, jsonEqual(), markNameFromAttr(), marksToAttributes(), pmContentToY(), pmNodeToY(), yChildrenToPM() (+2 more)

### Community 163 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, declaration, jsx, lib, noEmit, types, extends, include (+1 more)

### Community 164 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, jsx, lib, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 170 - "./plugin-api"
Cohesion: 0.50
Nodes (4): exports, ./plugin-api, default, types

### Community 172 - "./contracts"
Cohesion: 0.67
Nodes (3): import, types, ./contracts

### Community 174 - "exports"
Cohesion: 0.67
Nodes (3): exports, ./fonts.css, ./styles.css

## Knowledge Gaps
- **260 isolated node(s):** `RFC-4648`, `./tsconfig.json`, `.body`, `.isExpanded`, `../../tsconfig.base.json` (+255 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1479 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Чип даты (одинаково на iOS и в вебе): «Сегодня/Завтра/Вчера», день недели на 2–6 дней вперёд, иначе короткая дата; цвета danger/warning/accent/text.tertiary` connect `design-tokens.md` to `0018-monetization.md (2)`, `Монорепозиторий и CLAUDE.md`, `12. Функции по мотивам Craft (2)`, `Контракт: протокол синхронизации (v1)`, `DSDateChip`, `SwiftUI`?**
  _High betweenness centrality (0.132) - this node is a cross-community bridge._
- **What connects `RFC-4648`, `./tsconfig.json`, `.body` to the rest of the system?**
  _260 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05329153605015674 - nodes in this community are weakly interconnected._
- **Why does `packages/design-tokens/tokens.json — источник значений; генерирует CSS-переменные и Swift` connect `design-tokens.md` to `Монорепозиторий и CLAUDE.md`, `0002-no-desktop-app.md`, `DSColorToken`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Should `auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09137529137529138 - nodes in this community are weakly interconnected._
- **Why does `DSDateChipModel` connect `DSDateChip` to `strokes.md`, `design-tokens.md`, `DSDateChip (2)`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Should `contracts/sync.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03314621758887998 - nodes in this community are weakly interconnected._