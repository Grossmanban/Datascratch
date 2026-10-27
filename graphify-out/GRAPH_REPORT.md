# Graph Report - Datascratch  (2026-10-27)

## Corpus Check
- 904 files · ~680,797 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 38 file(s) not represented in the graph (top: (none) 19, .css 6, .example 4)

## Summary
- 17638 nodes · 45715 edges · 457 communities (384 shown, 73 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 4902 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `91ffc4b1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Data
- r
- design-tokens.md
- stack.md
- shared.ts (2)
- EditorView.swift
- shell/Sidebar.tsx
- Data (2)
- iOS editor and pen layer: apps/ios/Packages/DSEditor — modules DSInk, DSEditorModel (EditorDocument), DSEditor; demo com.datascratch.app.editordemo
- EditorTheme
- sync-protocol.md
- AttachmentFactory
- DSPenToolbar
- InMemoryEditorDocument
- records.ts
- open-questions.md
- PenLayer
- contracts/crypto.ts
- Foundation
- e
- oauth.ts (2)
- NativeEditorModel
- AccountSection.tsx
- r
- docs/README.md
- EditorCommands
- 08-sharing.md (2)
- strokes.md
- InMemoryEditorDocument (2)
- GuestPage.tsx
- TransactionOrigin
- store.ts (2)
- contracts/sync.ts
- roadmap.md
- 2026-10-25 (вторая половина дня)
- View
- SceneModel
- Sendable
- handwriting-png.ts
- DSDesign Swift package (iOS 26, Swift 6) — «Тихая бумага» design system tokens + SwiftUI components
- CaseIterable
- NoteDocument
- HTTPTransport
- MarkSet
- web-editor/package.json
- actions.ts
- handwriting-png.ts (2)
- contracts/api.ts
- SyncEngine
- EditorHost.fetchRemoteImage(url) (lib/remoteImage.ts) for images in pasted HTML (rich paste, D-52): asks own server POST /fetch-image { url }; non-200 (422 with reason, 429, network failure, 30 s timeout) → editor keeps the image as a link; received bytes go through regular uploadAttachment
- crypto.md
- store.ts
- AppShell.tsx
- PenLayer.ts
- String
- agents/src/context.ts
- CodingKeys
- .from
- server/README.md
- View (2) (2)
- sync/client.ts
- Projection
- DSTypeToken
- DSTaskState
- Editor.tsx
- t
- View (2) (2) (2)
- Журнал изменений (newest first; date — what changed, decision refs) (2)
- shared/test/sync.test.ts (2)
- Журнал изменений (newest first; date — what changed, decision refs)
- dependencies
- InkController
- crypto.md (2)
- Editor.tsx
- APIClient
- agent-service.ts
- LocalStore
- SyncClient
- CalendarPage.tsx
- SwiftUI
- auth.ts
- web/package.json
- ServerConnection
- CoreEditorDocument
- LocalStore (2)
- SidebarView
- tn (3)
- 0048-isolated-spaces.md
- DSTintToken
- CoreLibrary
- 02-platforms.md
- file
- AppModel
- MarkSet
- schema/index.ts
- shared.ts
- .dismiss
- document-model.md
- DemoModel
- tn
- DSMotionToken (2)
- CaseIterable
- Gi (2) (2) (2) (2) (2) (2)
- shares.ts
- cn (2)
- memory-check.ts
- SyncClient (3)
- ref_react
- AccountService (2)
- router.tsx
- shared/README.md
- AppModel
- paste.spec.tsx
- 11-nfr.md
- EditorCommands (2)
- DocumentCollectionView (2) (2) (2) (2)
- infra/README.md
- LibraryUITests
- Stroke
- DSCore (2)
- store.ts (2)
- Equatable (2)
- open-questions.md (2)
- Server PostgreSQL Schema
- packages/test-vectors — общие тестовые векторы
- Equatable
- CodingKeys
- caddy
- .iso
- HTMLNode
- world.ts
- RecoveryKey (2)
- Contract: AI agents API — MCP, REST, OAuth (v1) (3)
- 0025-no-redis.md
- JSONValue (2) (2)
- 05-organization-design.md
- DSLanguage (2)
- CodingKeys (3) (2)
- CoverImages
- lib.rs
- Block (2)
- Server implementation rules (apps/server, ПРЕДЛОЖЕНО)
- CRDTDocument
- graphify_docs.py
- DbOrTx
- D-51: minimalism (KISS) — notes only by default; tasks, calendar, tabs in «extended mode» (РЕШЕНО, 2026-10-26)
- specs/helpers.ts
- Компоненты
- devDependencies
- Block
- childElements
- InkCanvas
- TextGeometry
- DSBackdrop (2)
- test-vectors/package.json
- Theme
- BlockLayoutFragment
- 0038-design-quiet-paper.md
- BlockRow (2)
- world.ts (2)
- DSLanguage (2)
- DSPenColorFamily
- 0045-agent-created-notes.md
- test-vectors/package.json (2)
- Automatic deploy workflow (GHCR, SSH, rollback)
- MCP tools / REST operations set
- NotebookTree.swift
- Как устроено
- contracts/document.ts
- YValue
- DSTaskState (2)
- UIKit (3)
- WidthPoint
- .body
- Contract: AI agents API — MCP, REST, OAuth (v1)
- env
- NoteBlock (3)
- StrokeVectorTests
- DiskStorage
- .decode
- ii
- scripts/generate.mjs
- ii (2)
- DexieSyncStorage
- TaskEntry
- FakeRESTServer
- ref_react (2)
- EditorTextView
- editorCore.ts
- document/blocks.ts (2)
- server/src/context.ts
- schema.ts (2)
- 0011-handwriting-for-agents.md
- RecoveryKey
- ui/package.json
- schema/index.ts (2)
- uOe
- CodingKeys
- server.mjs
- iOS checks and TestFlight builds (D-46): macOS runners ios-app/ios-editor/ios-core/design; ios-app ~25 min, ios-release ~30 min, Apple 5-30 min
- D-44 iPad columns: sidebar controlled only by its own button (РЕШЕНО; three-panel layout superseded by D-47)
- DocumentRecord
- in-memory.ts
- image-fetch.ts
- TabStrip — tabs of current space as a strip above the screen (outside <main>, nav with links and aria-current), not a sidebar section
- agents-api.md (2)
- paste.spec.tsx (2)
- DSDateChip (2)
- DocumentUndoManager
- asc.py
- CRDTTransaction
- DSMotionToken
- YrsError (2)
- 0043-local-library-migration.md
- ios
- SwiftUI
- DragHandle.tsx
- DSSuggestionList
- with
- paper.ts
- @datascratch/web-editor DatascratchEditor React component (state entirely in Y.Doc)
- Importer
- DSBackdrop
- deploy.sh
- ios (2)
- tasks.ts
- document/blocks.ts
- DSColorToken (2)
- AttachmentManager
- Как поставить Datascratch на iPad без Mac (TestFlight)
- .ranges
- apps/web index.html (PWA entry)
- web/vite.config.ts
- pen/layout.ts
- InkInputRecognizer
- design-tokens/package.json
- .parse
- devDependencies (2)
- 0043-local-library-migration.md
- DSSkeleton
- Contract: AI agents API — MCP, REST, OAuth (v1)
- @tanstack/react-virtual
- RecordingRemote (2)
- document-model.md (2)
- AgentNoteEditor.tsx
- DSGlassModifier
- InkInputRecognizer (2)
- ios-app.yml
- NSObject
- env
- TokenSigner
- ios-release Workflow
- DSSettingsSampleContent
- .content (2) (2)
- Технологический стек — РЕШЕНО (2026-10-25)
- EditorAction
- DocumentUndoManager (2)
- infra/README.md (2)
- RecordingRemote
- gate (2)
- D-29. Graphify: порядок работы, чтобы граф был всегда актуален
- index.d.ts
- shares.ts (2)
- web-editor/src/index.ts (2)
- index.d.ts (2)
- CameraPicker
- SwiftUI
- UIKit (2)
- oauth.ts
- Snapshots and compaction (R-05): >500 updates or >1 MiB, and on document close after >=30 local edits
- 12-craft-features.md
- LocalStore.swift
- Демо «Живой штрих» (EditorDemo)
- .finishLasso
- first-sync.bench.ts
- PenPalette.tsx
- DSSuggestionList (2)
- .classify
- AgentTitleEditor.tsx
- build-test
- steps (3)
- compat/generate.mjs
- AccountError
- AgentEditsBanner
- DatascratchTests
- D-48. Пространства полностью изолированы
- Синхронизация
- 0045-agent-created-notes.md (3)
- .attachmentBounds (2)
- Card.tsx (2)
- True
- True
- @datascratch/design-tokens — токены «Тихая бумага»
- options
- DocKind
- Контракт: API для ИИ-агентов — MCP, REST, OAuth (v1) (2)
- .content (2)
- DSDocRow (2)
- build_number
- store.ts (3) (2)
- make_placeholder_icon.py
- EditorTextView (2)
- DatascratchTests (2)
- Pen Manual Test Checklist (iPad/iPhone)
- first-sync.bench.ts (2)
- agents-api.md (5)
- hint.ts
- ParagraphDecoration
- fake-indexeddb
- @datascratch/design-tokens@workspace:^
- Контракт: шифрование (v1) (2)
- Datascratch
- ObservationToken
- server (2)
- scripts/generate.mjs (2)
- server.yml
- metrics.ts (2)
- .decode (3)
- paste/markdown.ts
- MathBlockView
- EditorDemo README
- src/tokens.ts
- shared/package.json
- steps (2)
- world.ts (2) (2)
- metrics.ts (3)
- ui/test/setup.ts
- repairTitle.test.ts
- FrameRateBoost
- ios/project.yml
- True (2)
- EditorDemo
- loadKatex
- Как подключить Claude или ChatGPT к Datascratch
- Блочный редактор с Markdown-сокращениями
- compilerOptions (2) (2)
- with (2)
- 2026-10-25 (вторая половина дня) (2) (2)
- tokens.test.mjs (2)
- Запуск
- peerDependencies
- compat/package.json (2)
- StuckConnection
- verify.mjs
- touchHandles.spec.tsx
- with
- katex
- server.yml (2)
- react
- BlockLayoutFragment (2) (2)
- AgentsContext plugin-server interface (2)
- memory-load.mjs
- deploy.yml
- web.yml
- Features
- .receiveImages
- Kind
- FrameRateBoost (2)
- QuarantinedItem
- ios/project.yml (2)
- 09-agents-api.md
- first-sync.bench.ts (3)
- contracts/sync.ts (2) (2)
- G6
- steps (4)
- postgres
- with (2) (2)
- compilerOptions (4)
- web
- pen.spec.tsx
- peerDependencies (2)
- compilerOptions (3) (2)
- logic-linux
- clsx@^2.1.1
- Обзор архитектуры
- Журнал изменений (newest first; date — what changed, decision refs) (2) (2)
- Одно касание: ссылки, кружки задач, чипы дат (меню переноса), VoiceOver
- Block editor with Markdown shortcuts; storage = CRDT block tree, Markdown only export/agent format
- scripts
- deploy-e2e
- secrets
- test
- G6
- StrokePoint (2)
- web (2)
- EditorDemo README (2)
- options (2) (2)
- D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления
- Открытые вопросы (3)
- build_number (2)
- test-vectors/tsconfig.json
- lowlight
- with (2) (2) (2)
- scripts (2) (2)
- Block editor with Markdown shortcuts; storage = CRDT block tree, Markdown only export/agent format (2)
- 2026-10-27 web-editor: rich paste aligned with iOS — one rule in spec/04 and shared vectors packages/test-vectors/vectors/paste/cases.json (HTML/Markdown → blocks) checked by CT; fixed Apple Notes <div> rows and Google Docs <br> becoming a second title; Markdown parsed by agent import rules; column widths and trailing code newline dropped
- deploy-e2e (2)
- Demo/project.yml
- @tiptap/extension-code-block-lowlight
- @datascratch/design-tokens — токены «Тихая бумага» (2)
- Step (2)
- True (4)
- DSSuggestionList (2) (2)
- True (4) (2)
- exports
- @tiptap/react@^3.32.0
- EditorDemo (2)
- specs/helpers.ts (2)
- y-prosemirror@^1.3.7
- y-protocols@^1.0.7
- apps/web index.html (PWA entry) (4)
- apps/web index.html (PWA entry) (5)
- 2026-10-25 (вторая половина дня) (3)
- ssh-setup.sh
- True (3) (2)
- devDependencies (2) (2)
- Обзор архитектуры (2)
- resources
- agents.authenticate(dsa_ token) -> AgentPrincipal { tokenId, userId, permission, notebookIds } or null; updates lastUsedAt
- 12-craft-features.md (2)
- Snapshots and compaction (R-05): >500 updates or >1 MiB, and on document close after >=30 local edits
- Новая группа (8)
- specs/helpers.ts (2) (2)
- EditorDemoUITests
- t (2)

## God Nodes (most connected - your core abstractions)
1. `e()` - 207 edges
2. `r()` - 175 edges
3. `cn()` - 156 edges
4. `LibraryStore` - 152 edges
5. `2026-10-25 (вторая половина дня)` - 122 edges
6. `BlockNode` - 120 edges
7. `NoteDocument` - 118 edges
8. `t()` - 110 edges
9. `CoreLibrary` - 109 edges
10. `AppModel` - 108 edges

## Surprising Connections (you probably didn't know these)
- `Agent Markdown escaping: backslash-escaped chars are plain text; read_note escapes everything that would become markup` --semantically_similar_to--> `escapeText()`  [INFERRED] [semantically similar]
  docs/architecture/contracts/agents-api.md → packages/shared/src/document/markdown.ts
- `Перестройка блоков (§4.1a): при разделении, слиянии, смене типа и перемещении блока клиент в той же транзакции заменяет затронутый штрих копией (новый strokeId, те же точки, якоря по соответствию символов)` --semantically_similar_to--> `rebaseRedoneAnchors()`  [INFERRED] [semantically similar]
  docs/architecture/contracts/strokes.md → packages/shared/src/strokes/store.ts
- `3. Упаковка точек` --references--> `t()`  [INFERRED]
  docs/architecture/contracts/strokes.md → packages/web-editor/demo/sample.ts
- `Данные` --references--> `dailyNotebookId()`  [INFERRED]
  docs/decisions/0048-isolated-spaces.md → apps/web/src/domain/actions.ts
- `callout block: tone note|info|success|warning|danger + emoji` --references--> `CALLOUT_TONES`  [INFERRED]
  docs/architecture/contracts/document-model.md → packages/shared/src/contracts/document.ts

## Import Cycles
- 2-file cycle: `apps/ios/Packages/DSCore/yrs-ffi/src/lib.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/xml.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/lib.rs`
- 3-file cycle: `apps/ios/Packages/DSCore/yrs-ffi/src/events.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/xml.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/lib.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/events.rs`

## Hyperedges (group relationships)
- **Local edit → store/outbox → encrypt → push** — apps_ios_packages_dscore_readme_crdtdocument, apps_ios_packages_dscore_readme_localstore, apps_ios_packages_dscore_readme_dscrypto, apps_ios_packages_dscore_readme_syncengine, apps_ios_packages_dscore_readme_syncclient [EXTRACTED 1.00]
- **Pasted image by URL: web fetchRemoteImage → POST /v1/fetch-image → SSRF-guarded server download → encrypted attachment (D-52)** — docs_architecture_contracts_api_fetch_image_endpoint, docs_spec_06_data_server_fetch_image_ssrf, docs_changelog_web_editor_rich_paste, docs_architecture_contracts_api_attachments_endpoints [EXTRACTED 1.00]
- **Web resilience to hanging TLS handshakes** — apps_web_readme_flaky_network, apps_web_readme_service_worker_cache_first, apps_web_readme_boot_guard, apps_web_readme_api_client_timeouts, apps_web_readme_ws_open_timeout, apps_web_readme_session_restore_timeout [EXTRACTED 1.00]

## Communities (457 total, 73 thin omitted)

### Community 0 - "Data"
Cohesion: 0.00
Nodes (272): _7(), a8e(), addDocument(), addParents(), ait(), AN(), AT_LEAST_ONE(), AT_LEAST_ONE1() (+264 more)

### Community 1 - "r"
Cohesion: 0.02
Nodes (242): $9(), Aet(), aRe(), AS(), b(), B3(), bB(), bh() (+234 more)

### Community 2 - "design-tokens.md"
Cohesion: 0.06
Nodes (53): SwiftUI token API: dsFont, .ds(), dsTint, ink, dsShadow, pnpm @datascratch/design-tokens generate / check (CI: generated equals committed), Tokens.generated.swift (generated, do not edit by hand), packages/design-tokens/tokens.json (token source), Accessibility: a11y.spec.ts (axe-core WCAG 2.1 AA), keyboard.spec.ts, text.secondary for meaningful small text, focus-visible hover buttons, sr-only labels, iconGlyph / withIcon (src/lib/glyph.ts): SF Symbol names shown as similar emoji, unknown names hidden, Instant theme switch (theme.spec.ts), design-review polish (paper top bar, sentence case), reduced-motion respected (MotionConfig reducedMotion="user"), Backdrop Gradients (+45 more)

### Community 3 - "stack.md"
Cohesion: 0.03
Nodes (135): fastify@^5.12.7, fastify, Agent rate limits (in-memory counters, D-25) and OAuth 2.1 for MCP are the plugin's responsibility, Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, File Storage (disk or external S3) (+127 more)

### Community 4 - "shared.ts (2)"
Cohesion: 0.06
Nodes (10): uploadPending(), DocRow, DocStore, NoteSync, Indexer, snippetAround(), withoutTitle(), flushOps() (+2 more)

### Community 5 - "EditorView.swift"
Cohesion: 0.03
Nodes (87): DSHaptics, EditorDiagnostics, acceptAgentEdits(), alignPaper(), animateCheck(), applyKeyboardInset(), applySlashCommand(), applyTheme() (+79 more)

### Community 6 - "shell/Sidebar.tsx"
Cohesion: 0.06
Nodes (101): useRecoveryUnconfirmed(), useIndexVersion, deleteSpace(), isDescendant(), moveFolder(), moveNote(), moveNotebookToSpace(), updateFolder() (+93 more)

### Community 7 - "Data (2)"
Cohesion: 0.04
Nodes (37): CRDTUpdates, CryptoAD, CryptoError, decryptionFailed, invalidKeyLength, invalidRecoveryKey, kdfFailed, malformedEnvelope (+29 more)

### Community 8 - "iOS editor and pen layer: apps/ios/Packages/DSEditor — modules DSInk, DSEditorModel (EditorDocument), DSEditor; demo com.datascratch.app.editordemo"
Cohesion: 0.02
Nodes (135): Finger drawing (D-06): in Text mode finger scrolls/selects; draws with pen tool + flag; flag on by default on iPhone, off on iPad, ios-editor: бисекция вылета демо (BareEditorProbeTests, -bareEditorProbe), D-06. Рисование пальцем на iPhone — да, опционально, Решение, D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, 3. Apple Pencil в тексте — ключевая фича (+127 more)

### Community 9 - "EditorTheme"
Cohesion: 0.04
Nodes (31): .newNoteDestination, .commands, .filtered, .subfolders, .title, .body, LibraryBackend, .lockedNotebookIds (+23 more)

### Community 10 - "sync-protocol.md"
Cohesion: 0.03
Nodes (105): «Переместить в блокнот…»: moveNoteToNotebook rewraps note key, writes NoteMeta to new index, PATCH /v1/docs/:id, removes old entry (rollback on error); online only; warning for agent notebooks, Offline-first device data in IndexedDB via Dexie (spec/10): ds-device and ds-account-<userId> (docs, Yjs updates, outbox, REST ops queue, task and note index), Account and devices endpoints (/me, /devices, DELETE /me), Agent tokens endpoints (/agent-tokens, audit), contracts/agents-api.md — API for agents themselves (MCP/REST), Auth endpoints (prelogin, signup, login, refresh, logout, recovery, password), POST /auth/recovery-key — new recovery key, old stops working, pending recoveries cancelled, Base https://<host>/v1, JSON UTF-8, binary as base64url without padding (+97 more)

### Community 11 - "AttachmentFactory"
Cohesion: 0.03
Nodes (29): AttachmentFactory, .fileViews, .imageViews, .previews, .resolver, .showsResizeHandle, .theme, BlockAttachment (+21 more)

### Community 12 - "DSPenToolbar"
Cohesion: 0.03
Nodes (93): DSPenMode, .eraserMode, highlighter, lasso, marker, pen, pencil, pixelEraser (+85 more)

### Community 13 - "InMemoryEditorDocument"
Cohesion: 0.04
Nodes (45): ChangeOrigin, local, redo, remote, system, textInput, undo, DocumentChange (+37 more)

### Community 14 - "records.ts"
Cohesion: 0.07
Nodes (72): folders(), TASK_STATES, ATTR_TEXT_BLOCKS, attrText(), buildBacklinks(), deltaText(), extractNoteLinks(), extractTags() (+64 more)

### Community 15 - "open-questions.md"
Cohesion: 0.06
Nodes (31): Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой, Правила, Среда разработки, Code licensed GNU AGPL-3.0-only (LICENSE, D-50) (+23 more)

### Community 16 - "PenLayer"
Cohesion: 0.10
Nodes (7): Stroke, packPoints(), AnchorSnapshot, bindToSurface(), PenLayer, prepareCanvas(), pointerSample()

### Community 17 - "contracts/crypto.ts"
Cohesion: 0.05
Nodes (109): RFC-4648, AD, ATTACHMENT_CHUNK_BYTES, DEFAULT_KDF, ENVELOPE_OVERHEAD, ENVELOPE_VERSION, KDF_ALG, KDF_MEM (+101 more)

### Community 18 - "Foundation"
Cohesion: 0.03
Nodes (33): View, CoreLibrarySafetyTests, Counter, SpaceSwitchTests, DSNetwork, NSAttributedString.Key, DSEditorInfo, EditorView (+25 more)

### Community 19 - "e"
Cohesion: 0.02
Nodes (130): _4(), aD(), B6(), b8(), BNe(), c_e(), cIe(), co() (+122 more)

### Community 20 - "oauth.ts (2)"
Cohesion: 0.07
Nodes (46): bearer(), GrantService, SCOPE_READ, SCOPE_WRITE, STATIC_PREFIX, RFC-8707, VerifiedToken, OAuthDeps (+38 more)

### Community 21 - "NativeEditorModel"
Cohesion: 0.03
Nodes (45): CollapsedPenButton, .body, FormatBarRow, .body, HideKeyboardButton, .body, LinkPrompt, MediaChooser (+37 more)

### Community 22 - "AccountSection.tsx"
Cohesion: 0.07
Nodes (75): docsApi, deviceName(), changePassword(), loginKeyFor(), normalizeEmail(), recoverAccount(), signIn(), signUp() (+67 more)

### Community 23 - "r"
Cohesion: 0.02
Nodes (111): _8(), aEe(), Ake(), aMe(), aOe(), r(), AW(), bke() (+103 more)

### Community 24 - "docs/README.md"
Cohesion: 0.04
Nodes (82): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, Стартовый хук Claude Code (.claude/hooks/session-start.sh) (+74 more)

### Community 25 - "EditorCommands"
Cohesion: 0.06
Nodes (21): deleteLassoSelection(), menu(), setImageAttributes(), setImageWidth(), BlockKind, blockquote, bulletList, callout (+13 more)

### Community 26 - "08-sharing.md (2)"
Cohesion: 0.04
Nodes (66): Guest route /s/:shareId#k= (D-13, D-37): key in fragment never sent, in-memory guest session via POST /v1/shares/:id/guest, encrypted presence, src/ layout: app (TanStack Router), auth, api, data (Dexie, Yjs, keys, ops queue, indexes, runtime, guest, presence), sync, domain, features, lib/ui/editor/i18n/styles; e2e/, Web status: full main path works — auth with recovery key, spaces/notebooks/folders, doc screen, tasks/calendar, sharing and guest route, agent tokens; offline and sync covered by e2e against mock server, POST /docs — register doc (account/notebook/note) before first push, POST /shares/:id/guest — guest token for sync hello (no auth), Sharing endpoints /shares (view/edit, no expiry by default, revoke disconnects guests), awareness — курсоры и присутствие: зашифровано, не хранится, только рассылается, Права: user — документы своего аккаунта; guest — только документы шеринга, push только с правом edit (+58 more)

### Community 27 - "strokes.md"
Cohesion: 0.06
Nodes (83): drawing block: displayed height = height × blockWidth / 600 (strokes in strokes map), 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4.1. Перепривязка якорей (отмена и восстановление версии), 4.1a. Перестройка блоков (разделение, слияние, смена типа, перемещение), 4.2. Когда штрих считается «осиротевшим» и удаляется навсегда, 4. Привязка к тексту (живой штрих) (+75 more)

### Community 28 - "InMemoryEditorDocument (2)"
Cohesion: 0.02
Nodes (112): add(), aie(), ase(), atLeastOneInternalRecord(), atLeastOneSepFirstInternalRecord(), bMe(), br(), cacheForContext() (+104 more)

### Community 29 - "GuestPage.tsx"
Cohesion: 0.05
Nodes (82): attachmentUrl(), resizeImage(), storeAttachment(), GuestSession, channels, colorFor(), COLORS, joinPresence() (+74 more)

### Community 30 - "TransactionOrigin"
Cohesion: 0.05
Nodes (23): TransactionOrigin, .description, .isOutgoing, local, other, remote, storage, system (+15 more)

### Community 31 - "store.ts (2)"
Cohesion: 0.06
Nodes (5): EditorViewTests, ImageStore, EditorDocument, .allBlocks, .isReadOnly

### Community 32 - "contracts/sync.ts"
Cohesion: 0.03
Nodes (70): Лимиты payload_too_large: обновление 2 MiB, снимок 50 MiB — считаются декодированные байты, не base64, base64UrlDecodedLength(), base64UrlSchema, AckMessage, ackMessageSchema, CLIENT_PLATFORMS, ClientAwarenessMessage, clientAwarenessMessageSchema (+62 more)

### Community 33 - "roadmap.md"
Cohesion: 0.05
Nodes (100): Контракт agents-api.md — MCP и REST для ИИ-агентов, OAuth 2.1; реализуют сервер (плагин @datascratch/agents), веб и iOS (настройки токенов, страница /connect), Контракт меняет только сессия-координатор; исполнитель присылает предложение, agents: @datascratch/agents Fastify plugin with MCP server, OAuth 2.1 (CIMD + DCR, PKCE), REST /v1/agent/*, handwriting PNG; contracts/agents-api.md, 2026-10-25 server apps/server: Fastify + zod, PostgreSQL via Drizzle, full REST API from api.md, WebSocket sync, RLS for agents, pg-boss, D-19. Весь код пишет Claude, Последствия, Решение, docker compose (+92 more)

### Community 34 - "2026-10-25 (вторая половина дня)"
Cohesion: 0.02
Nodes (109): 2026-10-25 (вторая половина дня), agents, shared: create_note пишет NoteMeta.createdByAgent вместо меток agentEdit (D-45), agents: исправлен edit_note replace_text в тексте с метками; вектор create-note.json, agents: рукопись через границу ячеек таблицы, PNG как в редакторе iOS, agents: группировка штрихов по «заходу» письма, Markdown $…$, [[…]], align, agents, server: битое обновление не прячет блокнот от агентов (unavailable: true), Контракт document-model: «никогда не удалять непонятное», codeBlock допускает agentEdit, align ячеек, Контракт document-model: meta.color в документе блокнота (+101 more)

### Community 35 - "View"
Cohesion: 0.03
Nodes (90): RecoveryKeyGrid, .body, AboutView, .body, AccountSettings, .body, AppearanceSettings, .body (+82 more)

### Community 36 - "SceneModel"
Cohesion: 0.04
Nodes (48): ClosingEditor, FocusedValues, FullScreen, content, document, PadLevel, document, list (+40 more)

### Community 37 - "Sendable"
Cohesion: 0.05
Nodes (79): ViewedImage, Font, mono, sans, serif, Notebook, NotebookMode, agent (+71 more)

### Community 38 - "handwriting-png.ts"
Cohesion: 0.05
Nodes (72): cellPlace(), clip(), collectHandwriting(), describeGroup(), findHandwriting(), GROUP_GAP_EM, GROUP_PAUSE_MS, HandwritingKind (+64 more)

### Community 39 - "DSDesign Swift package (iOS 26, Swift 6) — «Тихая бумага» design system tokens + SwiftUI components"
Cohesion: 0.05
Nodes (53): accessibilityIdentifier палитры пера для UI-тестов, CI design.yml (macOS): build, Swift Testing, DSShowcase PNG snapshots artifact dsdesign-snapshots, DSAvatar / DSAvatarStack (avatars and presence), DSBackdrop / DSGrain (gradient backdrops with paper grain), DSButtonStyle (primary / secondary / ghost / destructive), DSCallout (tinted warning with action), DSCalloutTone (note/info/success/warning/danger tones), DSDateChip / DSDateChipModel (Today / Tomorrow / date, red when overdue) (+45 more)

### Community 40 - "CaseIterable"
Cohesion: 0.03
Nodes (69): .color, .uiColor, .color, .color, .color, .color, .uiColor, ShapeStyle (+61 more)

### Community 41 - "NoteDocument"
Cohesion: 0.05
Nodes (27): Backdrop, .yValue, Comment, .fields, Cover, .value, DocumentError, notFound (+19 more)

### Community 42 - "HTTPTransport"
Cohesion: 0.09
Nodes (8): HTTPTransport, URLSession, RequestMetrics, .requestStarted, TransportFailure, .description, URLSessionTransport, StubTransport

### Community 43 - "MarkSet"
Cohesion: 0.06
Nodes (24): .shape, .plainText, .textLength, InlineElement, atom, .length, .marks, text (+16 more)

### Community 44 - "web-editor/package.json"
Cohesion: 0.03
Nodes (91): dependencies, @datascratch/design-tokens@workspace:*, @datascratch/shared@workspace:*, @datascratch/ui@workspace:*, katex@^0.16.0, lowlight@^3.3.0, lucide-react@^1.61.0, marked@16.4.2 (+83 more)

### Community 45 - "actions.ts"
Cohesion: 0.04
Nodes (154): syncRecoveryFlag(), consumeFreshAccount(), getMasterKey(), cachedNoteKey(), notebookKey(), rememberNotebookKey(), rememberNoteKey(), enqueueOp() (+146 more)

### Community 46 - "handwriting-png.ts (2)"
Cohesion: 0.05
Nodes (77): BuildContext, cloneInto(), copyChildren(), fill(), fillInline(), insertBlock(), insertBlocks(), withAgentMark() (+69 more)

### Community 47 - "contracts/api.ts"
Cohesion: 0.03
Nodes (86): dependencies, @aws-sdk/client-s3@^3.1156.0, @datascratch/agents@workspace:^, @datascratch/shared@workspace:^, drizzle-orm@^0.45.4, @fastify/cors@^11.3.1, fastify-plugin@^6.0.1, @fastify/rate-limit@^11.2.1 (+78 more)

### Community 48 - "SyncEngine"
Cohesion: 0.03
Nodes (33): Summary, failed, offline, synced, syncing, SyncEngine, SyncOnceResult, SyncStatus (+25 more)

### Community 49 - "EditorHost.fetchRemoteImage(url) (lib/remoteImage.ts) for images in pasted HTML (rich paste, D-52): asks own server POST /fetch-image { url }; non-200 (422 with reason, 429, network failure, 30 s timeout) → editor keeps the image as a link; received bytes go through regular uploadAttachment"
Cohesion: 0.21
Nodes (13): EditorHost (src/editor/hosts.ts) passed to DatascratchEditor: attachments, [[ ]] links, cards, tags, task actions, EditorHost.fetchRemoteImage(url) (lib/remoteImage.ts) for images in pasted HTML (rich paste, D-52): asks own server POST /fetch-image { url }; non-200 (422 with reason, 429, network failure, 30 s timeout) → editor keeps the image as a link; received bytes go through regular uploadAttachment, e2e images.spec: slash menu picture, paste, second device decrypts and shows both; top-bar button inserts two images, not into title, visible on phone, Images and files in a note: «/» → «Картинка»/«Файл», paste, drag; image/file blocks; EditorHost.uploadAttachment encrypts in 1 MiB chunks (storeAttachment), resolveAttachment → blob:; works in minimal build (D-51), «Вставить картинку» button in document top bar (InsertPicture in DocPage): several images, at cursor or at end if cursor in title; percent progress; visible on narrow screen / iPad Safari, Packages of other streams: @datascratch/shared (core), web-editor (DatascratchEditor + EditorHost), ui and design-tokens, Upload progress: uploadAttachment(file, { onProgress }) (form agreed with web-editor; bare callback also accepted; failure → editor «Повторить» calls it again); top-bar button uses EditorApi.pickImage() when available, else own file picker; uploadNoteFile (editor/hosts.ts) reports 0…1 while chunks are encrypted (storeAttachment(…, onProgress)); server upload in background, Next: images and files inside documents (attachments exist — covers; image/file blocks drawn by web-editor stream), web reminders (after MVP), «Доступные мне» (+5 more)

### Community 50 - "crypto.md"
Cohesion: 0.06
Nodes (58): endKeepingData("revoked") — session ended from another device: tokens/keys wiped from memory, account DB kept, revoked record in kv; revoked.spec.ts, Sign-out warns about unsent changes (unsentCount; «Сначала отправить» / «Выйти»), keeps local DB and notebook keys until sign-in to same account, settings.recoveryKeyConfirmed flag in account document (reminder synced across devices; auth/recovery.ts), Recovery key flow (spec/07): copy/download/confirm last 4 chars, optional confirmation, stored only on creating device, «Создать новый ключ» with password, security log, Access only to agent-mode notebooks in grant, D-09 decision/requirement ref, D-04. Одновременно сквозное шифрование и доступ по API, End-to-end encryption vs agent API access conflict (+50 more)

### Community 51 - "store.ts"
Cohesion: 0.06
Nodes (67): AuthorKind, NOTE_ROOTS, ANCHOR_KINDS, AnchorKind, MIN_SEGMENT_POINTS, ORPHAN_STROKE_PURGE_DAYS, POINT_BYTES, POINT_FIELDS (+59 more)

### Community 52 - "AppShell.tsx"
Cohesion: 0.03
Nodes (85): addAstNodeRegionWithAssignmentsTo(), Ar(), aze(), bAe(), bT(), buildKeywordPattern(), buildKeywordToken(), buildKeywordTokens() (+77 more)

### Community 53 - "PenLayer.ts"
Cohesion: 0.09
Nodes (39): StrokePoint, AnchorBox, bindToText(), Bounds, distToSegment(), expandToWords(), fractionInside(), FREE_DRAWING_DISTANCE_EM (+31 more)

### Community 54 - "String"
Cohesion: 0.04
Nodes (44): AppRoute, note, noteTitled, share, today, Base64URL, Kind, note (+36 more)

### Community 55 - "agents/src/context.ts"
Cohesion: 0.03
Nodes (24): Resolved: notebook/space name, icon and color copied into notebook doc meta; plugin uses AgentNotebook else meta; fallback «Без названия», AgentDataSource, AgentEditOrigin, AgentNotebook, AgentsStore, AuditEntry, LoadedDoc, UserAuth (+16 more)

### Community 56 - "CodingKeys"
Cohesion: 0.09
Nodes (13): normalizeEmail(), APIErrorCode, badRequest, conflict, forbidden, `internal`, notFound, payloadTooLarge (+5 more)

### Community 57 - ".from"
Cohesion: 0.06
Nodes (34): .body, DailyNoteCard, .body, DayCell, .body, DayStrip, .body, .menu (+26 more)

### Community 58 - "server/README.md"
Cohesion: 0.04
Nodes (73): Access rights model (user, guest, agent), AgentScope (listNotebooks, docKey, readDoc, applyUpdate, createNoteDoc, attachments, audit, tx), Agents API contract (agents-api.md), agents.authenticate(token) -> AgentPrincipal, AgentsContext (store, data, users), agents data (plugins/agents-data.ts), Пакет @datascratch/agents (MCP, OAuth 2.1, REST, токены, журнал, PNG), @datascratch/agents Fastify plugin (MCP, OAuth 2.1) (+65 more)

### Community 59 - "View (2) (2)"
Cohesion: 0.03
Nodes (75): ACCESS_TOKEN_TTL_MS, AGENT_PERMISSIONS, AgentToken, agentTokenSchema, API_ERROR_CODES, API_PREFIX, API_ROUTES, ApiError (+67 more)

### Community 60 - "sync/client.ts"
Cohesion: 0.08
Nodes (35): Folder, NoteMeta, .isTrashed, UUIDv7, AgentAuthor, .value, AnyKey, .intValue (+27 more)

### Community 61 - "Projection"
Cohesion: 0.03
Nodes (77): a(), aA(), aFe(), aU(), bA(), brighter(), c8(), cA() (+69 more)

### Community 62 - "DSTypeToken"
Cohesion: 0.06
Nodes (35): DSFontFamily, display, mono, text, DSFontWeight, bold, medium, regular (+27 more)

### Community 63 - "DSTaskState"
Cohesion: 0.07
Nodes (23): TaskCheckbox, .body, .fallback, DSCheckmark, DSTaskCheckbox, .body, .isDone, DSTaskState (+15 more)

### Community 64 - "Editor.tsx"
Cohesion: 0.09
Nodes (35): SuggestionGroup, DatascratchEditor(), uploadFiles(), FONT_VARS, plural(), useHostRef(), WIDTHS, EditorHost (+27 more)

### Community 65 - "t"
Cohesion: 0.03
Nodes (76): $3(), b5e(), B7(), blockTokens(), bOe(), bTe(), buildEarlyExitMessage(), buildMismatchTokenMessage() (+68 more)

### Community 66 - "View (2) (2) (2)"
Cohesion: 0.07
Nodes (43): AuthCard, .body, CheckboxToggleStyle, ConfirmRecoveryKeyView, .body, Entry, ErrorText, .body (+35 more)

### Community 67 - "Журнал изменений (newest first; date — what changed, decision refs) (2)"
Cohesion: 0.05
Nodes (39): Server stack: Node 22 + Fastify + zod + Drizzle + pg-boss, Notesnook, D-08. Аннотации PDF пером — не в MVP, PDF pen annotations on iPad: PDFKit + own stroke layer, Решение, Решение (предложение), D-16. Импорт — не сейчас, Import from Obsidian/Notesnook (later) (+31 more)

### Community 68 - "shared/test/sync.test.ts (2)"
Cohesion: 0.04
Nodes (74): addToResyncTokens(), atLeastOneInternalLogic(), atLeastOneSepFirstInternalLogic(), attemptInRepetitionRecovery(), BACKTRACK(), buildFullFollowKeyStack(), canPerformInRuleRecovery(), canRecoverWithSingleTokenDeletion() (+66 more)

### Community 69 - "Журнал изменений (newest first; date — what changed, decision refs)"
Cohesion: 0.03
Nodes (79): ios-editor + web-editor: agent edits quiet margin bar, «Правки агента · Принять все» banner (DSEditorModel.AgentEdits), agents: create_folder/rename_folder/move_folder/delete_folder, move_note in one server transaction (migration 0003_agent_move_note); agents cannot create notebooks (E2E master key), agents: handwriting PNG for agents — strokes grouped by writing session, table-cell crossing fixed, Noto Emoji, scale 3, agents: edit_note replace_text fixed for marked text (agentEdit); new vector agents/create-note.json, infra: web-app CSP no longer applied on server paths (/v1, /mcp, /oauth, /.well-known/oauth-*) — consent «Разрешить» was blocked by form-action 'self', Журнал изменений (newest first; date — what changed, decision refs), Contracts for parallel development docs/architecture/contracts/ (document model, strokes, sync, crypto, REST API, design tokens), 2026-10-25 decision D-43: local library auto-migrated to account on login; server deployed at ds.777400777.xyz (D-40 updated) (+71 more)

### Community 70 - "dependencies"
Cohesion: 0.04
Nodes (67): dependencies, @datascratch/design-tokens@workspace:^, @datascratch/shared@workspace:^, @expo-google-fonts/inter@^0.4.2, @expo-google-fonts/newsreader@^0.4.1, @expo-google-fonts/noto-emoji@^0.4.8, fastify-plugin@^6.0.1, mdast-util-from-markdown@^2.1.0 (+59 more)

### Community 71 - "InkController"
Cohesion: 0.08
Nodes (8): InkController, .commands, .eraserRadius, Session, Target, block, text, EditorSignpost

### Community 72 - "crypto.md (2)"
Cohesion: 0.05
Nodes (67): Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1), Общее, Служебное, Токены агентов (`spec/09-agents-api.md`) (+59 more)

### Community 73 - "Editor.tsx"
Cohesion: 0.06
Nodes (43): NoteBackdrop, NoteCover, NoteStyle, App(), attachments, awA, awB, docA (+35 more)

### Community 74 - "APIClient"
Cohesion: 0.05
Nodes (9): PasswordChangeMaterial, APIClient, .currentSession, .isSignedIn, SecretSessionStore, SessionStore, AuthSession, SignupResult (+1 more)

### Community 75 - "agent-service.ts"
Cohesion: 0.08
Nodes (43): AgentError, buildMcpServer(), Principal, requireWrite(), AgentService, folderPath(), FolderView, nextOrder() (+35 more)

### Community 77 - "SyncClient"
Cohesion: 0.05
Nodes (19): Configuration, SyncClient, .isConnected, SyncClientDelegate, SyncClientError, closed, notConnected, server (+11 more)

### Community 78 - "CalendarPage.tsx"
Cohesion: 0.07
Nodes (71): TaskRow, addTask(), dailyNotebookId(), deleteTask(), editTaskText(), findDaily(), findInbox(), getOrCreateInbox() (+63 more)

### Community 79 - "SwiftUI"
Cohesion: 0.03
Nodes (67): addHiddenToken(), addHiddenTokens(), bD(), BIe(), children(), computeIsSubtype(), createDehyrationContext(), createGrammarElementIdMap() (+59 more)

### Community 80 - "auth.ts"
Cohesion: 0.06
Nodes (81): Revoking a device, a share or deleting the account immediately closes WebSocket connections (code 4401), buildApp(), codeForStatus(), requireUser(), devices, refreshTokens, securityEvents, users (+73 more)

### Community 81 - "web/package.json"
Cohesion: 0.04
Nodes (48): dependencies, cmdk@^1, @datascratch/shared@workspace:^, @datascratch/ui@workspace:^, @datascratch/web-editor@workspace:^, dexie@^4, dexie-react-hooks@^4.4.0, i18next@^26 (+40 more)

### Community 82 - "ServerConnection"
Cohesion: 0.06
Nodes (6): ServerAccessService, ServerAccountService, .isServerBacked, .unsentChanges, ServerConnection, ServerSharingService

### Community 83 - "CoreEditorDocument"
Cohesion: 0.06
Nodes (13): CoreEditorDocument, .blocks, .canRedo, .canUndo, .coreOrigin, .isReadOnly, .strokes, .style (+5 more)

### Community 84 - "LocalStore (2)"
Cohesion: 0.08
Nodes (36): N, UPDATES_PER_NOTE, Server tests: vitest against a real PostgreSQL (TEST_DATABASE_URL), BuildOptions, AD, open(), seal(), agentsPlugin (+28 more)

### Community 85 - "SidebarView"
Cohesion: 0.05
Nodes (37): AllTagsSheet, .body, SidebarCollapse, .folded, SidebarMoreRow, .body, SidebarSectionHeader, .body (+29 more)

### Community 86 - "tn (3)"
Cohesion: 0.06
Nodes (65): acquireParserWorker(), ACTION(), after(), assign(), assignWithoutOverride(), before(), BG(), callFunction() (+57 more)

### Community 87 - "0048-isolated-spaces.md"
Cohesion: 0.08
Nodes (42): «Искать в этом списке» (ListFilter): filters current list by title and text (indexer.matching + MiniSearch); «/» or ⌘F focus, Esc clears; list-filter.spec, «Переместить в пространство…» — explicit cross-space move (note: space → notebook → folder; notebook: space), Spaces fully isolated on web (D-48): spaceOfNote, starredInSpace, tabsInSpace, activeTabBySpace, dailyNotebookBySpace, migrateSpaceSettings, 2. Документ `account`, Document account: meta, spaces, notebooks, settings, starred, tabs (master key), Account starred (note|folder|notebook) and open tabs; settings.activeTab, settings.activeTabBySpace { spaceId: noteId } — active tab per space (D-48), settings.dailyNotebookBySpace { spaceId: notebookId } — daily notes and Inbox notebook per space (D-48) (+34 more)

### Community 88 - "DSTintToken"
Cohesion: 0.04
Nodes (51): AvatarPreview, .body, DSAvatar, .body, .presenceLabel, DSAvatarStack, .body, DSPresence (+43 more)

### Community 89 - "CoreLibrary"
Cohesion: 0.07
Nodes (13): CarriedNotebook, CoreLibrary, .knownNoteIds, .lockedNotebookIds, .needsCarriedMerge, .notebooksWithoutKey, .pendingMoves, .remote (+5 more)

### Community 90 - "02-platforms.md"
Cohesion: 0.06
Nodes (44): Web client: Vite + React + TypeScript PWA (offline, install), no SSR — full desktop replacement (D-02, D-03), D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, D-03. Платформы: нативные iPhone и iPad + полноценный веб, Full-featured web client (TypeScript), Контекст, Последствия (+36 more)

### Community 91 - "file"
Cohesion: 0.12
Nodes (13): Fixture, BadValue, CryptoVectorTests, DocumentVectorTests, EncodingVectorTests, FlowVectorTests, jsonEqual(), sortedMarks() (+5 more)

### Community 92 - "AppModel"
Cohesion: 0.03
Nodes (43): AppModel, .isRecoveryKeyConfirmed, .phase, LaunchOptions, Phase, onboarding, ready, CoverAction (+35 more)

### Community 93 - "MarkSet"
Cohesion: 0.05
Nodes (29): .blockId, .text, AttributedRenderer, MarksBox, .hash, EditorTheme, .bodyFont, .horizontalPadding (+21 more)

### Community 94 - "schema/index.ts"
Cohesion: 0.07
Nodes (44): CalloutTone, Callout, CALLOUT_TONES, Commands, Drawing, DRAWING_REFERENCE_WIDTH, FileBlock, formatSize() (+36 more)

### Community 95 - "shared.ts"
Cohesion: 0.02
Nodes (160): api, ApiError, doFetch(), fetchOnce(), NetworkError, READ_RETRY_DELAYS_MS, request(), RequestOptions (+152 more)

### Community 96 - ".dismiss"
Cohesion: 0.04
Nodes (43): Haptics, CommandPaletteView, .body, .documents, .ranked, FuzzyMatch, Kind, command (+35 more)

### Community 97 - "document-model.md"
Cohesion: 0.06
Nodes (63): DSInlineChip ([[links]] and #tags chips in text), Derived data indexer (createNoteIndexer, batches of 100, 0.4 s): tasks, noteIndex, MiniSearch; title/tags copied into NoteMeta, syncNotebookMetaCopy — notebook name/icon/colour/space copied into notebook meta (document-model §3) for server-side agents and consent screen, Obsidian/GitHub callout names mapped to nearest scheme tone (tip/check→success, important/todo→info, caution→warning, error/bug→danger, else note), Line break inside paragraph kept as hardBreak; read_note writes \ + newline (with > prefix / indent in quotes and lists), Agent-written [[Title]] / [text](note:<noteId>) become noteLink when accessible, MCP tool get_backlinks (GET /v1/agent/notes/:noteId/backlinks, read), MCP tool list_tasks (GET /v1/agent/tasks, read) (+55 more)

### Community 98 - "DemoModel"
Cohesion: 0.05
Nodes (26): DemoImages, DemoModel, .fileURL, .style, DemoView, .body, .content, .editorAndPalette (+18 more)

### Community 99 - "tn"
Cohesion: 0.04
Nodes (60): all(), allElements(), computeExports(), computeExportsForNode(), computeLocalScopes(), createDescription(), createDescriptions(), createLinkingError() (+52 more)

### Community 100 - "DSMotionToken (2)"
Cohesion: 0.06
Nodes (24): YMap, T, YMap, expectSynced(), extendedScreens(), isExtended(), newDoc(), PASSWORD (+16 more)

### Community 101 - "CaseIterable"
Cohesion: 0.03
Nodes (75): Appearance, dark, .id, light, system, AppSettings, .appearance, .colorScheme (+67 more)

### Community 102 - "Gi (2) (2) (2) (2) (2) (2)"
Cohesion: 0.04
Nodes (58): bl(), build(), buildDocuments(), calculateHorizontalSpace(), calculateSpace(), calculateSpaceIfDrawnHorizontally(), calculateSpaceIfDrawnVertical(), calculateVerticalSpace() (+50 more)

### Community 103 - "shares.ts"
Cohesion: 0.10
Nodes (26): bearer(), deviceActive(), readCookie(), requireUserOrGuest(), verifyGuestToken(), verifyUserToken(), verifyWebCookie(), WEB_COOKIE (+18 more)

### Community 104 - "cn (2)"
Cohesion: 0.05
Nodes (57): _5(), am(), arc(), Bj(), C5(), C9(), cAe(), circle() (+49 more)

### Community 105 - "memory-check.ts"
Cohesion: 0.05
Nodes (29): device(), client, docs, done, hub, ids, key, LATENCY (+21 more)

### Community 106 - "SyncClient (3)"
Cohesion: 0.10
Nodes (3): keyFor returns null → document paused (no skip, cursor kept); keyAvailable(docId) resumes; key_missing >30 s does not hold indicator; retrySkipped after key change, SyncClient, OutboxItem

### Community 107 - "ref_react"
Cohesion: 0.02
Nodes (274): ButtonProps, Ctx, Drop, DropdownMenu(), MenuItem, queue, renderItems(), Variant (+266 more)

### Community 108 - "AccountService (2)"
Cohesion: 0.08
Nodes (18): check_text_range(), decoding(), diff_update(), merge_updates(), mismatch(), missing_map(), nested_map(), ResolvedIndex (+10 more)

### Community 109 - "router.tsx"
Cohesion: 0.06
Nodes (38): App(), queryClient, allRoute, appLayout, authLayout, calendarRoute, connectRoute, docRoute (+30 more)

### Community 110 - "shared/README.md"
Cohesion: 0.05
Nodes (77): TS types packages/shared/src/contracts/strokes.ts and codec packages/shared/src/strokes/, applyBlockOperations (block ops for agents), @datascratch/shared/contracts (types, zod schemas), @datascratch/shared/contracts (types and zod schemas, parseClientMessage/parseServerMessage), createAccountKeys / rekeyPassword, @datascratch/shared/crypto (libsodium, Argon2id, envelope v1), crypto.md contract, @datascratch/shared/crypto (libsodium, Argon2id, envelope v1, recovery key DS1-, 1 MiB chunks, share links) (+69 more)

### Community 111 - "AppModel"
Cohesion: 0.07
Nodes (20): .body, .signedOutEmail, Account, .signedOutEmail, .unsentChanges, Credentials, Kind, passwordChanged (+12 more)

### Community 112 - "paste.spec.tsx"
Cohesion: 0.05
Nodes (17): AwarenessEditor(), awarenesses, docs, Window, PaperEditor(), Window, TestEditor(), TestEditorProps (+9 more)

### Community 113 - "11-nfr.md"
Cohesion: 0.09
Nodes (36): 6. Модель данных и сервер, Self-hosting, Адрес сервера в клиентах (D-49), Модель данных (общий обзор; детали — `architecture/data-model.md`), Резервные копии, Сервер, 11. Нефункциональные требования, Accessibility: Dynamic Type, VoiceOver, light/dark theme, full iPad keyboard support (+28 more)

### Community 114 - "EditorCommands (2)"
Cohesion: 0.09
Nodes (13): CalloutInfo, ListMarker, bullet, ordered, task, ParagraphContext, ProjectedParagraph, Projection (+5 more)

### Community 115 - "DocumentCollectionView (2) (2) (2) (2)"
Cohesion: 0.07
Nodes (32): .body, DocumentActions, DocumentCard, .body, .designSystemCard, .standInCard, DocumentCollectionView, .body (+24 more)

### Community 116 - "infra/README.md"
Cohesion: 0.06
Nodes (52): VPS Hosting (Hetzner or similar), R-11 Single VPS Is a Single Point of Failure, backup.sh script, 1. Купить сервер, 2. Домен, 3. Подключиться и подготовить сервер, 4. Скачать проект, 5. Заполнить настройки (+44 more)

### Community 117 - "LibraryUITests"
Cohesion: 0.06
Nodes (7): BareEditorProbeTests, AppearanceUITests, LibraryUITests, OnboardingUITests, SessionEndedUITests, EditorDemoUITests, XCTest

### Community 118 - "Stroke"
Cohesion: 0.03
Nodes (59): AnchorKind, block, drawing, image, text, .value, Hint, arrow (+51 more)

### Community 119 - "DSCore (2)"
Cohesion: 0.07
Nodes (37): AccountService, APIClient (REST), AttachmentManager, spec/11 benchmarks (BenchmarkTests), Block / Inline / Mark, CRDTDocument, DSCore, DSCrypto / KeyRing / KeychainSecretStore (+29 more)

### Community 120 - "store.ts (2)"
Cohesion: 0.11
Nodes (29): resolveAnchor(), reanchorStrokes(), replaceStrokeWithReanchored(), isStructural(), isStructuralStep(), locate(), mappingOf(), Pending (+21 more)

### Community 121 - "Equatable (2)"
Cohesion: 0.11
Nodes (10): AttachmentRecord, .missingChunks, .uploaded, LocalStore, State, pendingUpload, remote, synced (+2 more)

### Community 122 - "open-questions.md (2)"
Cohesion: 0.05
Nodes (47): Missing Compliance (Encryption Export Question), Совместная работа по аккаунтам — проект, Account-based collaboration draft (roles, groups, invites, AI policy, 15 questions), Ответ о шифровании для App Store (ITSAppUsesNonExemptEncryption), App Store encryption export answer (ITSAppUsesNonExemptEncryption), Вход, гости, хостинг — закрыто, Уплотнение истории R-05 — закрыто, iOS 26+, XcodeGen, Bundle ID — закрыто (+39 more)

### Community 123 - "Server PostgreSQL Schema"
Cohesion: 0.05
Nodes (61): AgentPrincipal, AgentScope, agent_tokens / agent_audit_log Tables, agent_audit table, agent_grants table, agent_tokens / agent_token_notebooks tables, Anchor (textRange/paragraph/drawingBlock/image), attachments, attachment_chunks and storage_trash tables (chunks stored in file storage att/<id>/<index>; trigger fills storage_trash) (+53 more)

### Community 124 - "packages/test-vectors — общие тестовые векторы"
Cohesion: 0.40
Nodes (5): packages/test-vectors — общие тестовые векторы, Как обновлять, Как пользоваться из Swift, Канонический JSON содержимого заметки, Что внутри

### Community 125 - "Equatable"
Cohesion: 0.13
Nodes (10): OutlineKey, BlockAnchorBuilder, CharacterHit, GlyphPlacement, InkSample, LivingStrokeResolver, ResolvedInkPoint, TextAnchorBuilder (+2 more)

### Community 126 - "CodingKeys"
Cohesion: 0.06
Nodes (35): APIErrorBody.Inner, CodingKeys, accessExpiresAt, accessToken, accountDocId, alg, at, chunkCount (+27 more)

### Community 127 - "caddy"
Cohesion: 0.04
Nodes (46): context, dockerfile, depends_on, environment, image, ports, profiles, restart (+38 more)

### Community 128 - ".iso"
Cohesion: 0.06
Nodes (13): .accessExpiry, .date, DSDate, EntityID, UtilTests, FailingURLProtocol, Failure, maybeSent (+5 more)

### Community 129 - "HTMLNode"
Cohesion: 0.13
Nodes (10): .source, Array, HTMLImport, HTMLMapper, HTMLNode, .isText, .style, .textContent (+2 more)

### Community 130 - "world.ts"
Cohesion: 0.07
Nodes (45): af(), Ai(), bFe(), buildDuplicateFoundError(), buildEmptyRepetitionError(), buildLookaheadForAlternation(), buildLookaheadForOptional(), dg() (+37 more)

### Community 131 - "RecoveryKey (2)"
Cohesion: 0.06
Nodes (45): BBe(), checkIsTarget(), e0(), fR(), Iae(), oBe(), pBe(), startWalking() (+37 more)

### Community 132 - "Contract: AI agents API — MCP, REST, OAuth (v1) (3)"
Cohesion: 0.06
Nodes (47): 3. Инструменты MCP и REST, 5.1. Папки и перенос заметок, add_comment, Agent Markdown dialect (read_note / write): tasks ⏳/📅, callouts, $$, mermaid, [[ ]], #tags, attachment:<id>, create_note, Cross-notebook note move (key rewrap, single transaction), edit_note, Agent error format: MCP isError '<code>: <message>'; REST { error: { code, message } } (api.md codes) (+39 more)

### Community 133 - "0025-no-redis.md"
Cohesion: 0.04
Nodes (56): D-30 decision/requirement ref, Optional grantId on context.data methods — server queries under RLS role limited to grant notebooks (D-30), PostgreSQL Row-Level Security per grant (server stream, via context), Handwriting-to-PNG Render (pg-boss queue), pg-boss Job Queue, Scaling via PostgreSQL LISTEN/NOTIFY, PostgreSQL, Redis (rejected) (+48 more)

### Community 134 - "JSONValue (2) (2)"
Cohesion: 0.05
Nodes (44): aO(), bK(), Cd(), CQ(), cze(), eK(), eQ(), Fh() (+36 more)

### Community 135 - "05-organization-design.md"
Cohesion: 0.08
Nodes (36): newDocTarget(pathname): open notebook/folder, else last used notebook in this space (lib/lastNotebook.ts), else first; tag list applies tag, Split sidebar button «Новый документ» + «в «Ии» ▾» chooser; same rule for ⌥N, ⌘K and «Все документы»; new-doc-target.spec, Projects, personal, work, study not mixed; minimum buttons on screen, Proposed structure: spaces → nested folders; cross-cutting nested/smart tags, colours, icons, favourites, recents, One space can hold both private and agent-open notebooks, Nested folders of unlimited depth and notes inside a notebook, Notebook (unit of encryption mode and sharing), Notebook — unit of encryption mode (private / for agents) and sharing (+28 more)

### Community 136 - "DSLanguage (2)"
Cohesion: 0.08
Nodes (17): .dsState, Phase, failed, localOnly, notSent, offline, sessionEnded, syncing (+9 more)

### Community 137 - "CodingKeys (3) (2)"
Cohesion: 0.12
Nodes (15): loadDocs(), Pending, Subscription, SyncConnection, SyncError, SyncPrincipal, HubMessage, b64Size() (+7 more)

### Community 138 - "CoverImages"
Cohesion: 0.08
Nodes (10): Added, AddedImage, CoverAttachmentRemote, CoverError, .errorDescription, notAnImage, CoverImages, CoverImagesTests (+2 more)

### Community 139 - "lib.rs"
Cohesion: 0.07
Nodes (17): UpdateObserver, is_inside(), ORIGIN_LOCAL, origin_name(), ORIGIN_UNDO, RootDef, RootKind, Array (+9 more)

### Community 140 - "Block (2)"
Cohesion: 0.12
Nodes (42): alternative(), assertion(), atom(), atomEscape(), characterClass(), characterClassEscape(), classAtom(), classEscape() (+34 more)

### Community 141 - "Server implementation rules (apps/server, ПРЕДЛОЖЕНО)"
Cohesion: 0.05
Nodes (41): Attachments endpoints (chunked upload, resume, 200 MB limit), Bearer accessToken 15 min + rotating refreshToken 30 days; reuse = theft, device revoked, POST /fetch-image { url } → image bytes (D-52), fetch-image errors: 422 blocked/not_image/too_large/timeout/unreachable; 429 rate or concurrency; Content-Type from signature, Note move PATCH /docs/:id { notebookId } — rewrap noteKey, rights follow note, Refresh reuse grace: retry within 60 s returns the same new refreshToken (idempotent), Version history GET /docs/:id/versions and /versions/:seq (encrypted snapshots), doc_snapshots Table (compacted snapshots, version history) (+33 more)

### Community 142 - "CRDTDocument"
Cohesion: 0.06
Nodes (10): CRDTDocument, .canRedo, .canUndo, .clientId, CRDTSubscription, DeepHandler, UpdateHandler, OpenDoc (+2 more)

### Community 143 - "graphify_docs.py"
Cohesion: 0.20
Nodes (8): literals(), main(), finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 144 - "DbOrTx"
Cohesion: 0.09
Nodes (15): Server makes snapshots itself every 500 updates / 1 MB for agent edits (it knows the key), DbOrTx, docSnapshots, docUpdates, AppendInput, AppendResult, CatchUpItem, CatchUpPage (+7 more)

### Community 145 - "D-51: minimalism (KISS) — notes only by default; tasks, calendar, tabs in «extended mode» (РЕШЕНО, 2026-10-26)"
Cohesion: 0.06
Nodes (29): e2e projects: desktop (minimal dist, minimal.spec) and extended (dist-ext, port 4174: tasks.spec, tabs.spec, isExtended() branches); real-server e2e minimal only, Web minimal mode and «расширенный режим» (D-51): notes only by default; tasks, calendar/daily notes, tabs only in extended mode, Pre-D-51 §12.6 tabs work preserved in branch claude/web-app-tabs-extended, Inline checklists stay; minimal build task dates are inert labels (EditorHost.taskDates: "inert"), VITE_DS_EXTENDED_MODE=1 — build-time flag, read only in src/lib/features.ts (extendedMode, features.tasks/calendar/tabs), extendedMode, D-15. Дизайн — основная концепция продукта, Последствия (+21 more)

### Community 146 - "specs/helpers.ts"
Cohesion: 0.08
Nodes (27): ArrayDelta, Delete, Insert, Retain, convert(), DeepObserver, path(), sorted_keys() (+19 more)

### Community 147 - "Компоненты"
Cohesion: 0.04
Nodes (51): DSSuggestionList («/» and [[ ]] menu), Button / IconButton / Kbd, Button, IconButton, Kbd, ColorPanel, ColorPicker, CommandPalette (cmdk, ⌘K), ContextMenu / DropdownMenu (строка: иконка | подпись | правый слот), @datascratch/ui — «Тихая бумага» web components (React 19 + Radix + Tailwind v4 + Motion + Lucide) (+43 more)

### Community 148 - "devDependencies"
Cohesion: 0.07
Nodes (41): devDependencies, @axe-core/playwright@^4, jsdom@^30.1.3, @playwright/test@1.63.0, tailwindcss@^4, @tailwindcss/vite@^4, @testing-library/dom@^10.4.2, @testing-library/react@^16.3.3 (+33 more)

### Community 149 - "Block"
Cohesion: 0.07
Nodes (20): Array, .attributes, Block, .isKnown, .isTextBlock, .xml, BlockType, Inline (+12 more)

### Community 150 - "childElements"
Cohesion: 0.14
Nodes (20): HandwritingItem, codeSpan(), escapePlain(), escapeText(), inlineMarkdown(), MARK_ORDER, MarkdownOptions, noteToMarkdown() (+12 more)

### Community 151 - "InkCanvas"
Cohesion: 0.10
Nodes (7): InkCanvas, PaperView, .paper, .phase, .pitch, .ruleLift, RenderedStroke

### Community 152 - "TextGeometry"
Cohesion: 0.12
Nodes (6): TextGeometry, .columnFrame, .contentManager, .layoutManager, .origin, .projection

### Community 153 - "DSBackdrop (2)"
Cohesion: 0.06
Nodes (38): concurrency, cancel-in-progress, group, run, CI, jobs, test, webkit-paper (+30 more)

### Community 154 - "test-vectors/package.json"
Cohesion: 0.13
Nodes (20): map_to_attrs(), value_to_any(), Container, container(), Element, Fragment, element(), index_paths() (+12 more)

### Community 155 - "Theme"
Cohesion: 0.07
Nodes (24): Backdrop, .colors, .gradient, Color, Motion, Palette, .accent, .canvas (+16 more)

### Community 156 - "BlockLayoutFragment"
Cohesion: 0.12
Nodes (7): BlockLayoutFragment, .calloutGeometry, .containerWidth, .decoration, .renderingSurfaceBounds, .textBounds, DateChip

### Community 157 - "0038-design-quiet-paper.md"
Cohesion: 0.14
Nodes (20): Design references: Things 3, Linear, Craft, Arc, Ориентир Craft: градиентные подложки, документы-карточки с обложками, боковая панель «Вкладки / Избранное / Папки / Теги», стеклянные панели, контекстные меню, Craft as main visual reference (gradient backdrops, doc cards with covers, sidebar Tabs/Favourites/Folders/Tags, glass floating panels, context menus), D-38 Design direction Quiet Paper, D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Design tokens contract (design-tokens.md), Rejected: graphite dark by default (ink on dark reads worse), Not chosen: clean neutral (Linear/Things) (+12 more)

### Community 158 - "BlockRow (2)"
Cohesion: 0.07
Nodes (32): devDependencies, eslint@^9.39.0, eslint-config-prettier@^10.1.0, @eslint/js@^9.39.0, globals@^16.4.0, prettier@^3.6.0, turbo@^2.5.0, typescript@^5.9.0 (+24 more)

### Community 159 - "world.ts (2)"
Cohesion: 0.13
Nodes (27): @modelcontextprotocol/client@^2.4.0, makeNotebookDoc(), bodyBlocks(), roundTrip(), strip(), authorize(), consent(), setup() (+19 more)

### Community 160 - "DSLanguage (2)"
Cohesion: 0.10
Nodes (14): DateChipPreview, .body, DSDateChip, .body, .color, .model, DSDateChipModel, Tone (+6 more)

### Community 161 - "DSPenColorFamily"
Cohesion: 0.12
Nodes (8): Coordinator, DSPenColorFamily, highlight, ink, DSRecentPenColors, DSSystemColorPicker, .hex, .tokenValue

### Community 162 - "0045-agent-created-notes.md"
Cohesion: 0.04
Nodes (62): «Создано агентом {agentName}» strip (D-45): createdByAgent, onAcknowledgeAgentCreated; «Понятно» nulls it in notebook index; agent-created.spec.ts, New note title (spec/04): cursor in title, Enter to text; empty title auto-filled «Заметка 26 октября 2026» / «Note Oct 26, 2026» (defaultNoteTitle, EditorHost.defaultTitle, EditorApi.focusTitle, setTitleOf), 5. Правки агента (D-10), agentEdit { agentId: grantId, at } on all text the agent inserts into an existing note; explicit marks on insert, agentEdit mark on text inserted into existing notes, context.data.applyUpdate with agent origin, context.data: listAgentNotebooks, loadDoc, docSeqs, applyUpdate, createNoteDoc, loadAttachmentImage, NoteMeta.createdByAgent (D-45) (+54 more)

### Community 163 - "test-vectors/package.json (2)"
Cohesion: 0.06
Nodes (33): env, runs-on, services, steps, timeout-minutes, concurrency, cancel-in-progress, group (+25 more)

### Community 164 - "Automatic deploy workflow (GHCR, SSH, rollback)"
Cohesion: 0.08
Nodes (29): Автоматический откат на предыдущую версию, Behind-proxy mode on 127.0.0.1:8480 (nginx/Caddy/Traefik), Caddy (веб + обратный прокси), Custom domain via DS_DOMAIN, DEPLOY_ENABLED safety switch, Deploy modes direct / edge / proxy (DEPLOY_MODE), deploy.sh (rollback, status), Dedicated deploy SSH key generated on server (+21 more)

### Community 165 - "MCP tools / REST operations set"
Cohesion: 0.07
Nodes (33): description, devDependencies, @datascratch/shared@workspace:*, eslint@^9.39.0, libsodium-wrappers-sumo@^0.8.2, prosemirror-model@^1.25.0, tsx@^4.20.0, @types/node@^22.10.0 (+25 more)

### Community 166 - "NotebookTree.swift"
Cohesion: 0.16
Nodes (12): FolderMenuItems, .body, FolderRow, .body, .label, FolderRows, .body, NotebookRow (+4 more)

### Community 167 - "Как устроено"
Cohesion: 0.06
Nodes (33): apps/web — веб-клиент Datascratch, Большие списки (10 000 заметок), Вкладки: полоса, «+N», обзор (spec/12 §12.6), Вложения (crypto.md §6), Выход из аккаунта (spec/07), Гибкий интерфейс, Гости (D-13, D-37), Данные на устройстве (офлайн-первый, spec/10) (+25 more)

### Community 168 - "contracts/document.ts"
Cohesion: 0.04
Nodes (64): RFC-9562, AUTHOR_KINDS, authorKindSchema, Base64Url, BASE64URL_REGEX, base64UrlBytesSchema(), base64UrlLength(), DATE_ONLY_REGEX (+56 more)

### Community 169 - "YValue"
Cohesion: 0.08
Nodes (15): XmlNode, .attributes, .children, .elementName, .textContent, YValue, .boolValue, .dataValue (+7 more)

### Community 170 - "DSTaskState (2)"
Cohesion: 0.13
Nodes (16): DSPenNib, .body, .eraser, .highlighter, .lasso, .marker, .pen, .pencil (+8 more)

### Community 171 - "UIKit (3)"
Cohesion: 0.17
Nodes (3): Key, MermaidRenderer, WebKit

### Community 172 - "WidthPoint"
Cohesion: 0.15
Nodes (4): InkOutline, WidthPoint, LiveInkOutline, LiveInkOutlineTests

### Community 173 - ".body"
Cohesion: 0.11
Nodes (17): .body, CalendarView, TrashView, .deleteTitle, ContentColumn, .body, EmptyDetailView, .body (+9 more)

### Community 174 - "Contract: AI agents API — MCP, REST, OAuth (v1)"
Cohesion: 0.14
Nodes (14): «Could not fetch the client metadata document… timeout» → OAUTH_CLIENT_METADATA_DOCUMENTS=false, Guide: how to connect Claude or ChatGPT to Datascratch, Connect ChatGPT (developer mode connector, OAuth), Connect Claude (custom connector, claude mcp add), Step 1: enable agent mode on notebook, OAUTH_CLIENT_METADATA_DOCUMENTS=false, «Too many requests» — 120 requests/minute limit, agent retries, Troubleshooting table (no agent notebooks, client metadata timeout, sign in first, read-only, Too many requests, note not visible) (+6 more)

### Community 175 - "env"
Cohesion: 0.07
Nodes (33): run, BUILD_NUMBER, CERT_P12, CERT_PASSWORD, DS_SERVER_URL, DS_WEB_HOST, ISSUER_ID, KEY_ID (+25 more)

### Community 176 - "NoteBlock (3)"
Cohesion: 0.06
Nodes (22): BlockRow, .body, .bodyFont, .font, .leading, .placeholder, .textColor, .topPadding (+14 more)

### Community 177 - "StrokeVectorTests"
Cohesion: 0.12
Nodes (5): InkWidth, InkWidthTests, StrokeVectorTests, Vectors, .available

### Community 178 - "DiskStorage"
Cohesion: 0.12
Nodes (5): Server source layout (index, config, app, context, db, routes, sync, services, storage, jobs, plugins, drizzle), DiskStorage, S3Options, S3Storage, BlobStorage

### Community 179 - ".decode"
Cohesion: 0.15
Nodes (3): StrokePointCodec, UUIDv7, StrokeCodecTests

### Community 180 - "ii"
Cohesion: 0.08
Nodes (30): A7(), D7(), Dit(), Ent(), f7(), G7(), e(), hy() (+22 more)

### Community 181 - "scripts/generate.mjs"
Cohesion: 0.07
Nodes (48): aue(), D-39. Разработка параллельными сессиями; Claude сам вливает в main, Контекст, Последствия, Решение, backdropCss(), backdropSwift(), block() (+40 more)

### Community 182 - "ii (2)"
Cohesion: 0.16
Nodes (12): AccessService, AgentAuditEntry, .id, AgentPermission, read, readWrite, AgentToken, Device (+4 more)

### Community 183 - "DexieSyncStorage"
Cohesion: 0.14
Nodes (8): DocStore (acquire/release, appendStored, open waits up to 15 s for docs row), DB migration v3→v4 moves old outbox into syncOutbox (no lost edits), Snapshot on leaving document after ≥30 edits (requestSnapshot, version history), Sync: SyncClient from @datascratch/shared/sync with DexieSyncStorage (batched getDocStates/setDocStates), Sync status indicator: synced / syncing / offline + unsent count; «Не отправлено: N» + «Повторить» on server refusal; sync-status.spec.ts, DexieSyncStorage, DocEntry, DocSyncState

### Community 184 - "TaskEntry"
Cohesion: 0.14
Nodes (7): .taskEntries, TaskEntry, .id, .isOpen, .scheduledDay, TaskIndex, TaskIndexTests

### Community 185 - "FakeRESTServer"
Cohesion: 0.19
Nodes (4): AccountServiceTests, FakeRESTServer, User, SecurityTests

### Community 186 - "ref_react (2)"
Cohesion: 0.09
Nodes (16): attrs_to_map(), value_to_in(), YValue, BigInt, Bool, Bytes, List, Null (+8 more)

### Community 187 - "EditorTextView"
Cohesion: 0.15
Nodes (5): EditorTextView, .bounds, .editorTap, .pasteboardIsImages, .undoManager

### Community 188 - "editorCore.ts"
Cohesion: 0.16
Nodes (20): Collaboration, createNoteUndoManager(), TitleRepair, buildExtensions(), CoreOptions, createHeadlessEditor(), guardEditorSchema(), HostRef (+12 more)

### Community 189 - "document/blocks.ts (2)"
Cohesion: 0.12
Nodes (29): _2e(), A1(), A2e(), B2e(), cl(), D2e(), DS(), F2e() (+21 more)

### Community 190 - "server/src/context.ts"
Cohesion: 0.04
Nodes (45): base64urlKey, bool, Config, ConfigSchema, loadConfig(), AppContext, createContext(), AgentScope (+37 more)

### Community 191 - "schema.ts (2)"
Cohesion: 0.06
Nodes (32): Drizzle schema and SQL migrations (drizzle-kit db:generate, DB_MIGRATE_ON_START; 0001 = Row-Level Security + file cleanup trigger), Db, agentAudit, agentGrants, agentPermission, attachmentChunks, attachments, bytea (+24 more)

### Community 192 - "0011-handwriting-for-agents.md"
Cohesion: 0.16
Nodes (18): 4. Markdown для агента (`read_note`), 6. Рендер рукописи в PNG, Agent Markdown dialect (read_note output), Block markers <!-- block:<blockId> --> (tasks: task:<taskId>), Callout tone mapping (Obsidian/GitHub -> note/info/success/warning/danger), D-11 decision/requirement ref, D-35 decision/requirement ref, Strokes with all anchors deleted are not shown (D-35) (+10 more)

### Community 193 - "RecoveryKey"
Cohesion: 0.15
Nodes (7): .pendingRecoveryKey, .savedRecoveryKey, RecoveryKey, .base32, .formatted, .groups, RecoveryKeyTests

### Community 194 - "ui/package.json"
Cohesion: 0.09
Nodes (28): dependencies, clsx@^2.1.1, cmdk@^1.1.1, @datascratch/design-tokens@workspace:*, @fontsource-variable/inter@^5.3.0, @fontsource-variable/jetbrains-mono@^5.3.0, @fontsource-variable/source-serif-4@^5, lucide-react@^1.61.0 (+20 more)

### Community 195 - "schema/index.ts (2)"
Cohesion: 0.13
Nodes (20): BlockId, blockIdPluginKey, findIdFixes(), hasAttr(), stripIds(), UNIQUE_ATTRS, dataUrlToFile(), findBlock() (+12 more)

### Community 196 - "uOe"
Cohesion: 0.10
Nodes (19): addEntry(), Ane(), cancelWrite(), cne(), dequeue(), enqueue(), HIe(), hOe() (+11 more)

### Community 197 - "CodingKeys"
Cohesion: 0.04
Nodes (63): ClientInfo, ClientMessage, awareness, hello, push, snapshot, subscribe, unsubscribe (+55 more)

### Community 198 - "server.mjs"
Cohesion: 0.10
Nodes (22): attAccess(), authed(), b64u(), clients, cors, db, err(), heldDocs (+14 more)

### Community 199 - "iOS checks and TestFlight builds (D-46): macOS runners ios-app/ios-editor/ios-core/design; ios-app ~25 min, ios-release ~30 min, Apple 5-30 min"
Cohesion: 0.09
Nodes (26): GitHub Actions builds iOS and runs tests on macOS runner on every push, D-46. Ускорение проверок iOS: без повторов на main и быстрый набор перед сборкой, Full UI suite failure after the build -> fix in next build, user informed, gate step (Linux) skips macOS jobs on main if same files already passed (.github/scripts/already-tested.sh), ios-editor run counts as passed if only the known demo-typing step failed, No reruns on main: Linux gate step skips macOS jobs when the same tracked files already passed the workflow (already-tested.sh), Rejected option: paid faster GitHub runners (cost; user has not chosen), Not chosen: paid fast GitHub runners (cost) (+18 more)

### Community 200 - "D-44 iPad columns: sidebar controlled only by its own button (РЕШЕНО; three-panel layout superseded by D-47)"
Cohesion: 0.13
Nodes (15): Close document (×) removes only the document; list/tasks/calendar fills workspace, D-44. Колонки на iPad: сайдбар управляется только своей кнопкой, «На весь экран» — only mode hiding sidebar and neighbour; exit restores previous layout, iPhone and narrow window: stack of screens, Narrow workspace (< 640 pt): document shown alone, sidebar untouched, Superseded rule: sidebar hides when a document opens, Three panels: Sidebar | List | Document (sidebar + workspace), Behaviour verified by UI tests in portrait and landscape (+7 more)

### Community 201 - "DocumentRecord"
Cohesion: 0.22
Nodes (3): DocumentRecord, OutboxItem, StoredUpdate

### Community 202 - "in-memory.ts"
Cohesion: 0.22
Nodes (6): Tx, withAgentScope(), getSodium(), BoundedMap, PgAgentDataSource, readWrappedKey()

### Community 203 - "image-fetch.ts"
Cohesion: 0.12
Nodes (16): FetchedImage, FetchImageError, FetchImageFailure, ImageFetcher, ImageFetcherOptions, isPublicAddress(), REDIRECTS, sniffImage() (+8 more)

### Community 204 - "TabStrip — tabs of current space as a strip above the screen (outside <main>, nav with links and aria-current), not a sidebar section"
Cohesion: 0.09
Nodes (27): Flexible UI: sidebar hide (⌘\, inert), fullscreen per view (⌘⇧F, ds.focus.*), explicit doc tab close (× / ⌥W), transition key from resolvedLocation, Manual notebook ordering by drag-and-drop — not done yet on web, Collapsible pen palette (round button, useUi.penPaletteCollapsed, showPalette={false}); pen-palette.spec.ts, Pinned tabs — left, icon only, survive middle click and «Закрыть остальные»; openedAt written at most hourly (openTab), «Недавно закрытые» — per device, per space, up to 20 (lib/closedTabs.ts, localStorage in try/catch), Long sidebar sections (spec/12 §12.6): «Избранное», «Блокноты», «Теги» collapse per space (useSpaceCollapsed); MoreList up to 7 rows + «Ещё N», Tags as tree by «/» (parent counts include subtags, recent first); «Все теги» sheet (useTagTree, TagRow, AllTagsDialog), TabOverview — via «+N», grid button or ⌘⇧\; phone tab counter; cards, search, grouping by notebook, closeOtherTabs (+19 more)

### Community 205 - "agents-api.md (2)"
Cohesion: 0.07
Nodes (26): concurrency, cancel-in-progress, group, CI, jobs, test, name, paths (+18 more)

### Community 206 - "paste.spec.tsx (2)"
Cohesion: 0.11
Nodes (16): find(), J, marksOf(), PasteEditor(), Window, GOOGLE_DOCS, input(), MARKDOWN (+8 more)

### Community 207 - "DSDateChip (2)"
Cohesion: 0.10
Nodes (18): ButtonsPreview, .body, ButtonStyle, DSButtonBody, .body, .fill, .foreground, .height (+10 more)

### Community 208 - "DocumentUndoManager"
Cohesion: 0.10
Nodes (8): DocumentUndoManager, .canRedo, .canUndo, .groupingLevel, .isUndoRegistrationEnabled, .redoActionName, .undoActionName, .keyCommands

### Community 209 - "asc.py"
Cohesion: 0.17
Nodes (7): b64url(), call(), check_app(), der_to_raw(), ensure_bundle_id(), prune_ci_certs(), token()

### Community 211 - "DSMotionToken"
Cohesion: 0.15
Nodes (12): .springAnimation, .disclosure, Animation, DSAnimationModifier, .animation, View, withDSAnimation(), DSMotionToken (+4 more)

### Community 212 - "YrsError (2)"
Cohesion: 0.18
Nodes (25): a_e(), aZ(), Ci(), cm(), CZ(), e_e(), F5(), iZ() (+17 more)

### Community 213 - "0043-local-library-migration.md"
Cohesion: 0.10
Nodes (19): FolderStrip: current-level folder cards above documents; breadcrumbs inside nested folder, Notebook mode switch sends serverNotebookKey, retried on network error (Safari «Load failed»), clear error, dialog stays open; notebook-keys.spec.ts, Sidebar «Блокноты» with folder tree of any depth (incl. agent-created folders), context menu, drag-and-drop; folders.spec.ts, Unreadable server items skipped: alternateKeysFor, recoverSkippedFromSnapshot, own snapshot re-upload, __dsSyncDebug(); never hold «Синхронизация…», «Часть изменений здесь пока не читается» banner (UnreadableNote), dismissible per notebook (ds.unreadableDismissed), reshown from notebook menu, SwiftUI, 5. Организация заметок и дизайн, Дизайн — главный принцип: премиальный SaaS-уровень (D-15) (+11 more)

### Community 214 - "ios"
Cohesion: 0.05
Nodes (48): concurrency, cancel-in-progress, group, run, GH_REPO, GH_TOKEN, defaults, outputs (+40 more)

### Community 215 - "SwiftUI"
Cohesion: 0.03
Nodes (54): AppCommands, .body, DatascratchApp, .body, .mainContent, MainWindow, NoteWindow, .body (+46 more)

### Community 216 - "DragHandle.tsx"
Cohesion: 0.21
Nodes (15): BlockLift, blockLiftKey, BlockLiftMeta, BlockMenu(), blockTargetAt(), DragHandle(), endTouchDrag(), liftTouchDrag() (+7 more)

### Community 217 - "DSSuggestionList"
Cohesion: 0.26
Nodes (8): DSSuggestionGroup, DSSuggestionItem, DSSuggestionList, .body, .isEmpty, SuggestionPreview, .body, .body

### Community 218 - "with"
Cohesion: 0.19
Nodes (18): arrays_and_errors(), chunk(), Collect, local(), merge_and_diff_updates(), nested_maps_merge_per_field(), note_roots(), observers_report_paths_deltas_and_origins() (+10 more)

### Community 219 - "paper.ts"
Cohesion: 0.23
Nodes (12): alignPaper(), baselineShift(), clearPaper(), KINDS, lastKeys, measureText(), paperKey, PaperSnap (+4 more)

### Community 220 - "@datascratch/web-editor DatascratchEditor React component (state entirely in Y.Doc)"
Cohesion: 0.09
Nodes (22): New note title like Apple Notes: focusTitle(), Enter → body, empty title → defaultTitle «Заметка <дата>», empty note not saved, Block editor with Markdown shortcuts; storage = CRDT block tree, Markdown only export/agent format, Block handles by input: hover for mouse/trackpad, single quiet handle for touch, never for Apple Pencil, blockId (UUIDv7) per block node, unique taskId; ids reset on paste, @datascratch/web-editor DatascratchEditor React component (state entirely in Y.Doc), Editor UI from @datascratch/ui: PenToolbar, FormatToolbar, ColorPanel, LinkPanel, SuggestionMenu, .ds-task-check, dateLabel, document-model.md contract, EditorApi.pickImage() / insertFiles(files); PenToolbar.onInsertImage (+14 more)

### Community 221 - "Importer"
Cohesion: 0.22
Nodes (5): Agent Markdown escaping: backslash-escaped chars are plain text; read_note escapes everything that would become markup, escapeMask(), Importer, withVerbatimMath(), INLINE_MATH_RE

### Community 222 - "DSBackdrop"
Cohesion: 0.08
Nodes (19): BackdropGallery, .body, DSBackdrop, .body, DSGrain, .body, GrainPattern, SplitMix64 (+11 more)

### Community 223 - "deploy.sh"
Cohesion: 0.09
Nodes (23): CFBundleURLName, CFBundleURLSchemes, properties, CADisableMinimumFrameDurationOnPhone, CFBundleDevelopmentRegion, CFBundleDisplayName, CFBundleLocalizations, CFBundleShortVersionString (+15 more)

### Community 224 - "ios (2)"
Cohesion: 0.15
Nodes (12): concurrency, group, container, runs-on, if, needs, runs-on, timeout-minutes (+4 more)

### Community 225 - "tasks.ts"
Cohesion: 0.16
Nodes (20): TaskState, addDays(), Commands, dateChip(), dateChipLabel(), localDate(), nextWeek(), parseLocalDate() (+12 more)

### Community 226 - "document/blocks.ts"
Cohesion: 0.04
Nodes (87): base, docs, N, now, state, stored, t, ACCOUNT_ROOTS (+79 more)

### Community 227 - "DSColorToken (2)"
Cohesion: 0.16
Nodes (5): DSInlineChip, .body, DSInlineChipStyle, InlineChipsPreview, .body

### Community 228 - "AttachmentManager"
Cohesion: 0.18
Nodes (6): AttachmentError, alreadyExists, invalidDownload, invalidId, AttachmentManager, LocalStore

### Community 229 - "Как поставить Datascratch на iPad без Mac (TestFlight)"
Cohesion: 0.18
Nodes (11): Если что-то пошло не так, Запасной вариант: свой сертификат распространения, Как выпустить сборку, Как поставить Datascratch на iPad без Mac (TestFlight), Необязательные настройки, Сборка на Mac (когда он будет), Шаг 1. Узнать Team ID, Шаг 2. Зарегистрировать идентификатор приложения (+3 more)

### Community 230 - ".ranges"
Cohesion: 0.19
Nodes (4): AgentEdits, WikiLinkMatch, WikiLinks, AgentEditsTests

### Community 231 - "apps/web index.html (PWA entry)"
Cohesion: 0.08
Nodes (27): apps/web index.html (PWA entry), Load watchdog script /boot-guard.js, <script src="/boot-guard.js"> in head (boot watchdog), Module entry /src/main.tsx into #root, PWA/Apple meta (theme-color #FAF8F4, apple-mobile-web-app-capable, icons), Theme bootstrap via external /theme-init.js before render, fail(), retries() (+19 more)

### Community 232 - "web/vite.config.ts"
Cohesion: 0.10
Nodes (10): vite-plugin-pwa@^1.2, contentSecurityPolicy(), securityHeaders(), SERVER_PATHS, isServer(), previewSecurityHeaders(), Client encrypts fetched bytes with note key and uploads as regular attachment, POST /v1/fetch-image (+2 more)

### Community 233 - "pen/layout.ts"
Cohesion: 0.19
Nodes (9): Glyph, blockIdOf(), blockIds, ElementInfo, FontMetrics, LayoutPass, metricsCache, resetFontMetrics() (+1 more)

### Community 234 - "InkInputRecognizer"
Cohesion: 0.06
Nodes (40): defaults, run, GH_REPO, GH_TOKEN, defaults, outputs, permissions, runs-on (+32 more)

### Community 235 - "design-tokens/package.json"
Cohesion: 0.10
Nodes (21): description, devDependencies, prettier@^3.6.0, exports, ./theme.css, ./tokens.css, ./tokens.json, files (+13 more)

### Community 236 - ".parse"
Cohesion: 0.18
Nodes (7): Problem, empty, invalid, notHTTPS, ServerAddress, ServerInfo, ServerAddressTests

### Community 237 - "devDependencies (2)"
Cohesion: 0.09
Nodes (22): devDependencies, jsdom@^30.1.3, @ladle/react@^5.1.1, @playwright/test@1.63.0, @tailwindcss/vite@^4.3.3, @testing-library/react@^16.3.3, @testing-library/user-event@^14.6.8, @types/react@^19.3.0 (+14 more)

### Community 238 - "0043-local-library-migration.md"
Cohesion: 0.12
Nodes (13): Альтернативы: перенос с вопросом; раздельное хранение, Решение: всё созданное до входа переносится в аккаунт автоматически и без вопроса; перенос идемпотентен (409 «уже есть» — не ошибка), Контекст: локальные данные после входа (build 5) не переносились, регистрация документов получала 404, синхронизация висела, D-43 Local library migrates into account automatically on sign-in, D-43. Локальная библиотека переносится в аккаунт автоматически, Идемпотентный перенос (409 не ошибка, ключи переобёртываются), On-this-device mode: local spaces/notebooks/notes, keys wrapped by local master key, Idempotent migration: rewrap notebook keys, create notebooks on server before sync, 409 is not an error, no duplicate welcome doc (+5 more)

### Community 239 - "DSSkeleton"
Cohesion: 0.10
Nodes (21): ASSETCATALOG_COMPILER_APPICON_NAME, ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME, BUNDLE_LOADER, CODE_SIGN_STYLE, ENABLE_PREVIEWS, ENABLE_USER_SCRIPT_SANDBOXING, GENERATE_INFOPLIST_FILE, LOCALIZATION_PREFERS_STRING_CATALOGS (+13 more)

### Community 240 - "Contract: AI agents API — MCP, REST, OAuth (v1)"
Cohesion: 0.06
Nodes (73): 10. Решённые вопросы стыков, 1. Как устроено, 2.1. Токены, 2.2. OAuth 2.1 (по спецификации MCP 2026-07-28), 2. Доступ, 7. Журнал и лимиты, 8. `/v1/agent-tokens` (уточнение `api.md`), 9. Контекст плагина (интерфейс с сервером) (+65 more)

### Community 242 - "RecordingRemote (2)"
Cohesion: 0.19
Nodes (12): b64(), el(), empty(), fixture(), normalize(), reads_yjs_document(), roots(), s() (+4 more)

### Community 243 - "document-model.md (2)"
Cohesion: 0.17
Nodes (14): DSCard / DSDocCard — карточка документа, Title cannot be deleted/replaced/moved; rename via replace_text; plugin syncs NoteMeta title, tags, updatedAt, 3. Документ `notebook` (индекс блокнота), Daily notes and Inbox (kind daily / inbox) in settings.dailyNotebookId notebook, Daily notes and Inbox live in the notebook from settings.dailyNotebookBySpace, Folder { id, parentId, name, icon, color, order } — unlimited nesting, Document notebook — notebook index: meta, folders, notes (NoteMeta), tags, notebook meta copy of names (name, icon, color, space {id, name, icon}) from the account document (+6 more)

### Community 244 - "AgentNoteEditor.tsx"
Cohesion: 0.27
Nodes (11): AGENT, buildAgentNote(), el(), EXISTING_NOTE_ID, FLOWCHART, para(), SEQUENCE, text() (+3 more)

### Community 245 - "DSGlassModifier"
Cohesion: 0.18
Nodes (10): DSGlassFallbackKey, DSGlassModifier, .glass, DSGlassPanel, .body, EnvironmentValues, .dsGlassFallback, GlassPreview (+2 more)

### Community 247 - "ios-app.yml"
Cohesion: 0.15
Nodes (12): concurrency, cancel-in-progress, group, jobs, name, paths, branches, paths (+4 more)

### Community 248 - "NSObject"
Cohesion: 0.18
Nodes (3): FragmentProvider, DictationPlaceholder, .insertDictationResultPlaceholder

### Community 249 - "env"
Cohesion: 0.50
Nodes (4): GH_REPO, GH_TOKEN, KNOWN_FAILING_STEP, env

### Community 250 - "TokenSigner"
Cohesion: 0.18
Nodes (4): AccessClaims, GuestClaims, subkey(), TokenSigner

### Community 251 - "ios-release Workflow"
Cohesion: 0.03
Nodes (89): Datascratch/App: entry point, WindowGroup per document (multi-window, Stage Manager), menu commands and shortcuts, AppModel, SceneModel, apps/ios — iPhone + iPad, Integration/CoreLibrary.swift over DSCore: account/notebook/note documents on Yrs, LocalStore (GRDB) with send queue, KeyRing keys, notebook meta name/icon/space for agents, one-time JSON migration, DSCore package (data: Yrs documents, GRDB LocalStore, KeyRing, AccountService, SyncEngine, APIClient), Server connection via DSCore (AccountService, SyncEngine, APIClient) — next step, DSDesign package (colors, tints, DSDateChip, DSTaskCheckbox, DSShowcase in debug), DSEditor package (EditorView, TextKit 2 + live stroke, DSEditorCore), Datascratch/Features screens: sidebar, documents (cards/list), document, tasks, calendar, ⌘K palette, sharing, settings, onboarding (+81 more)

### Community 252 - "DSSettingsSampleContent"
Cohesion: 0.18
Nodes (9): DSSettingsSampleContent, .body, .syncedAt, DSSettingsSampleScreen, .body, Kind, account, settings (+1 more)

### Community 253 - ".content (2) (2)"
Cohesion: 0.11
Nodes (19): CODE_SIGN_STYLE, CURRENT_PROJECT_VERSION, DEVELOPMENT_TEAM, GENERATE_INFOPLIST_FILE, INFOPLIST_KEY_CFBundleDisplayName, INFOPLIST_KEY_LSSupportsOpeningDocumentsInPlace, INFOPLIST_KEY_UIApplicationSceneManifest_Generation, INFOPLIST_KEY_UIApplicationSupportsIndirectInputEvents (+11 more)

### Community 254 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 255 - "EditorAction"
Cohesion: 0.11
Nodes (19): EditorAction, bold, bulletList, code, heading1, heading2, heading3, highlight (+11 more)

### Community 256 - "DocumentUndoManager (2)"
Cohesion: 0.20
Nodes (4): LineMetrics, .midline, StrokeShapeClassifier, ShapeClassifierTests

### Community 257 - "infra/README.md (2)"
Cohesion: 0.14
Nodes (14): Адрес сервера для iPhone и iPad, Если выкладка не удалась, Как развернуть сервер Datascratch на своём VPS без компьютера (GitHub Actions), Какие адреса в интернете нужны серверу, Память, Подключить свой домен (по желанию), Сервер, на котором уже что-то работает, Что происходит на сервере (+6 more)

### Community 259 - "gate (2)"
Cohesion: 0.20
Nodes (10): run, defaults, outputs, permissions, runs-on, gate, skip, actions (+2 more)

### Community 260 - "D-29. Graphify: порядок работы, чтобы граф был всегда актуален"
Cohesion: 0.22
Nodes (16): choose_memory(), choose_mode(), COMPOSE_PROJECT_NAME, current(), edge_install_site(), edge_missing(), edge_present(), log() (+8 more)

### Community 261 - "index.d.ts"
Cohesion: 0.15
Nodes (18): cleanup(), DEPLOY_HOST, DEPLOY_KEY_FILE, DEPLOY_KNOWN_HOSTS_FILE, DEPLOY_PORT, DS_DOMAIN, DS_POSTGRES_IMAGE, DS_SERVER_IMAGE (+10 more)

### Community 262 - "shares.ts (2)"
Cohesion: 0.11
Nodes (18): BackdropBlob, BackdropName, BackdropSpec, ColorName, DurationName, HighlightName, InkName, MotionName (+10 more)

### Community 263 - "web-editor/src/index.ts (2)"
Cohesion: 0.18
Nodes (20): ALIGNS, blank(), BLOCK_SELECTOR, BLOCK_TAGS, cellAlign(), hoist(), INLINE_WRAPPERS, isBlock() (+12 more)

### Community 264 - "index.d.ts (2)"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib, module (+10 more)

### Community 265 - "CameraPicker"
Cohesion: 0.18
Nodes (3): ActivityView, CameraPicker, Coordinator

### Community 266 - "SwiftUI"
Cohesion: 0.05
Nodes (31): .bucketPicker, .background, CardsPreview, .body, DSCard, .body, DSDocCard, .body (+23 more)

### Community 268 - "oauth.ts"
Cohesion: 0.07
Nodes (56): RFC-7009, RFC-8252, RFC-9207, Consent screen notebook row: icon (emoji or bundled SVG instead of SF symbol, e.g. globe) on plate of notebook colour (meta.color, else accent), ACCESS_PREFIX, REFRESH_PREFIX, scopeFor(), ICON_STYLE (+48 more)

### Community 269 - "Snapshots and compaction (R-05): >500 updates or >1 MiB, and on document close after >=30 local edits"
Cohesion: 0.24
Nodes (9): 5. Снимки и уплотнение (R-05), Server may delete updates seq <= baseSeq except those needed by version history, Client skips undecryptable/unappliable item, reports {docId, seq, deviceId, reason}, may resubscribe once with since: 0, Snapshots and compaction (R-05): >500 updates or >1 MiB, and on document close after >=30 local edits, Subscribe with since < latest snapshot seq always returns latest snapshot + later updates, Encrypted history compaction by clients (R-05, stage 3), Снимки, уплотнение и история версий (R-05), Version history: snapshots, view, rollback (+1 more)

### Community 270 - "12-craft-features.md"
Cohesion: 0.07
Nodes (31): DSCard / DSDocCard (cover thumbnail only own image), Attachments in 1 MiB encrypted chunks (crypto.md §6): stored in IndexedDB first, uploaded in background; new note waits for POST /v1/docs; cover 2400 px, coverThumb 640 px, Cover — own image only (spec/12 §12.7): drag/paste/file dialog, compact header 150/190 px, DocCard asChild thumbnail (coverThumb), SpaceTile; meta.backdrop not offered, Бумага «линейка/клетка/точки»: текст стоит на линиях (шаг = межстрочный интервал), 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки (+23 more)

### Community 271 - "LocalStore.swift"
Cohesion: 0.22
Nodes (3): FailedSync, SnapshotPolicy, UnreadableSync

### Community 272 - "Демо «Живой штрих» (EditorDemo)"
Cohesion: 0.29
Nodes (6): Без Mac (временный вариант), Демо «Живой штрих» (EditorDemo), Как поставить на iPad (Mac с Xcode), Профилирование, Что проверить, os_signpost profiling (subsystem com.datascratch.editor) for Instruments traces of long notes

### Community 274 - "first-sync.bench.ts"
Cohesion: 0.21
Nodes (17): Content: headings, lists, checklists, quotes, callouts, tables, code, formulas, attachments, drawing blocks, Касание по блоку файла (и VoiceOver) — приложение открывает или делится файлом, Блок image (attachmentId, width 0..1/null, alt, caption) — модель не меняется; вложение создаётся локально до загрузки, временных id нет, Картинка вставки остаётся на своём месте, figcaption — её подпись (caption), Pasted images: data: decoded, http(s) via EditorHost.fetchRemoteImage(url) → File, else link; file:/cid: skipped, Картинки file:/cid: (локальные пути Word) при вставке пропускаются, Подпись и описание фото (caption, alt) — лист приложения «Подпись…»; «Заменить» меняет вложение; обе правки отменяются, Вставка фото после абзаца с курсором (пустой заменяется), одна правка отмены, локальное превью до загрузки (+9 more)

### Community 275 - "PenPalette.tsx"
Cohesion: 0.29
Nodes (9): penColorToken(), PenSelection, PenWidth, TOOL_DEFAULTS, PenPalette(), readCollapsed(), toSelection(), toSettings() (+1 more)

### Community 276 - "DSSuggestionList (2)"
Cohesion: 0.12
Nodes (17): import, types, import, types, exports, ./contracts, ./document, ./ids (+9 more)

### Community 277 - ".classify"
Cohesion: 0.12
Nodes (17): devDependencies, eslint@^9.39.0, prosemirror-model@^1.25.12, tsx@^4.20.0, @types/ws@^8.5.13, typescript@^5.9.0, vitest@^3.2.0, ws@^8.18.0 (+9 more)

### Community 278 - "AgentTitleEditor.tsx"
Cohesion: 0.29
Nodes (6): agentEdit, AgentTitleEditor(), AgentTitleVariant, block(), blocksOf(), Window

### Community 279 - "build-test"
Cohesion: 0.06
Nodes (38): defaults, env, if, name, needs, runs-on, steps, strategy (+30 more)

### Community 280 - "steps (3)"
Cohesion: 0.35
Nodes (11): steps, steps, steps, steps, id, if, name, run (+3 more)

### Community 281 - "compat/generate.mjs"
Cohesion: 0.15
Nodes (12): b64(), content, doc, firstRun, fixture, json, para, rel() (+4 more)

### Community 282 - "AccountError"
Cohesion: 0.22
Nodes (9): AccountError, accountExists, .errorDescription, invalidEmail, invalidRecoveryKey, passwordsDoNotMatch, server, weakPassword (+1 more)

### Community 283 - "AgentEditsBanner"
Cohesion: 0.16
Nodes (6): AgentEditsBanner, .mode, .onShowHistory, Mode, createdBy, edits

### Community 284 - "DatascratchTests"
Cohesion: 0.14
Nodes (15): targets, build, dependencies, platform, settings, sources, type, dependencies (+7 more)

### Community 285 - "D-48. Пространства полностью изолированы"
Cohesion: 0.29
Nodes (7): D-48. Пространства полностью изолированы, Данные, Детали (ПРЕДЛОЖЕНО, ждёт подтверждения), Детали (РЕШЕНО пользователем 2026-10-26), Контекст, Рассмотренные варианты, Решение

### Community 286 - "Синхронизация"
Cohesion: 0.22
Nodes (9): Индексация (поиск, задачи, ссылки, теги), Ключи блокнотов: канонический — с сервера, Ненадёжная сеть, Нет ключа ≠ нечитаемо, Нечитаемые данные (карантин), Синхронизация, Скорость синхронизации, Статус и ошибки отправки (+1 more)

### Community 287 - "0045-agent-created-notes.md (3)"
Cohesion: 0.13
Nodes (15): 4. Редактор, Экспорт Markdown/PDF/HTML; рукопись — картинками, Кнопка «Скрыть клавиатуру» (isEditingText, dismissKeyboard), Импорт — не сейчас, Правило «Один title»: починка повреждённого начала документа (repairTitles), Тест обратного прохода на заметке, собранной как у агента, Прокрутка к курсору без прыжков: при наборе, удалении, Enter, склейке и вставке положение прокрутки сохраняется (собственная прокрутка системы к курсору отключена, пока палец не на тексте: в пустой строке система ставит курсор не там), добавляется только минимальная прокрутка, чтобы строка с курсором была над клавиатурой и палитрой с запасом в строку; смена высоты шапки компенсируется прокруткой, если есть куда; редактор не прокручивает, пока палец на тексте, Поиск: полнотекстовый индекс локально на каждом клиенте (+7 more)

### Community 288 - ".attachmentBounds (2)"
Cohesion: 0.15
Nodes (15): env, DEPLOY_HOST, DEPLOY_PORT, DEPLOY_USER, DS_DEPLOY_MODE, DS_HOST_MODE, DS_MEM_PROFILE, DS_NGINX_AUTO (+7 more)

### Community 289 - "Card.tsx (2)"
Cohesion: 0.13
Nodes (15): default, description, type, diag_docs, mode, default, description, options (+7 more)

### Community 290 - "True"
Cohesion: 0.29
Nodes (7): paths, branches, paths, True, pull_request, push, workflow_dispatch

### Community 291 - "True"
Cohesion: 0.29
Nodes (7): paths, branches, paths, True, pull_request, push, workflow_dispatch

### Community 292 - "@datascratch/design-tokens — токены «Тихая бумага»"
Cohesion: 0.29
Nodes (7): @datascratch/design-tokens — токены «Тихая бумага», Команды, Контраст (WCAG AA), Подключение в вебе, Правила генерации, Что внутри, Шрифты

### Community 293 - "options"
Cohesion: 0.18
Nodes (13): dependencies, prosemirror-model@1.25.1, y-prosemirror@1.3.7, yjs@13.6.27, description, prosemirror-model, y-prosemirror, yjs (+5 more)

### Community 294 - "DocKind"
Cohesion: 0.22
Nodes (5): DocKind, account, note, notebook, .roots

### Community 295 - "Контракт: API для ИИ-агентов — MCP, REST, OAuth (v1) (2)"
Cohesion: 0.14
Nodes (14): YOp, ArrayDelete, ArrayInsert, MapDelete, MapSet, RootTextDelete, RootTextInsert, TextDelete (+6 more)

### Community 296 - ".content (2)"
Cohesion: 0.23
Nodes (8): DSSkeleton, .body, DSSkeletonLines, .body, DSSpinner, .body, SkeletonPreview, .body

### Community 297 - "DSDocRow (2)"
Cohesion: 0.19
Nodes (14): B_e(), F_e(), G5(), G_e(), hZ(), kv(), lZ(), oZ() (+6 more)

### Community 298 - "build_number"
Cohesion: 0.25
Nodes (8): description, required, build_number, tags, True, push, workflow_dispatch, inputs

### Community 299 - "store.ts (3) (2)"
Cohesion: 0.16
Nodes (13): dependencies, libsodium-wrappers-sumo@^0.8.2, zod@^4.1.0, description, files, libsodium-wrappers-sumo, zod, license (+5 more)

### Community 302 - "EditorTextView (2)"
Cohesion: 0.15
Nodes (13): entitlements, info, platform, settings, sources, type, path, properties (+5 more)

### Community 303 - "DatascratchTests (2)"
Cohesion: 0.15
Nodes (12): compilerOptions, baseUrl, declaration, jsx, lib, noEmit, paths, sourceMap (+4 more)

### Community 304 - "Pen Manual Test Checklist (iPad/iPhone)"
Cohesion: 0.15
Nodes (13): Open 10,000 Words Stress Test, 120 Hz Smoothness While Drawing, Delete and Undo with Marks, Stroke/Pixel Eraser and Lasso Move, iPhone Finger Drawing Toggle, Pen Latency Check vs Apple Notes, Metrics Overlay (FPS, open time, redraw time), Palette Use without Finger Drawing (+5 more)

### Community 305 - "first-sync.bench.ts (2)"
Cohesion: 0.24
Nodes (10): Выравнивание ячейки при вставке — из align/text-align ячейки или общего выравнивания её абзацев, Список становится задачами, только если чек-бокс у каждого пункта, Обёртка Google Docs <b style="font-weight:normal"> не делает всё жирным, Заголовки h4–h6 при вставке → уровень 3, Ограничения вставки: нет вложенных таблиц и картинок в ячейках, Обычный текст, похожий на Markdown, разбирается как Markdown; обычная проза вставляется как есть, Списки Word (mso-list, маркеры ·/o/1.) восстанавливаются с вложенностью, Вставка фото из буфера (⌘V) и перетаскивание из «Фото»/«Файлов» — передаются приложению (+2 more)

### Community 306 - "agents-api.md (5)"
Cohesion: 0.17
Nodes (12): DOMAIN, DS_REGISTRY_TOKEN, DS_REGISTRY_USER, ENABLED, EVENT, HOST, IOS_URL, KEY (+4 more)

### Community 307 - "hint.ts"
Cohesion: 0.39
Nodes (6): pathLength(), recognizeHint(), totalTurning(), xReversals(), glyphs, lines

### Community 310 - "@datascratch/design-tokens@workspace:^"
Cohesion: 0.11
Nodes (10): @datascratch/design-tokens@workspace:^, lucide-react@^1.61.0, motion@^12, react-dom@^19, @tiptap/starter-kit@^3, @datascratch/design-tokens, lucide-react, motion (+2 more)

### Community 311 - "Контракт: шифрование (v1) (2)"
Cohesion: 0.17
Nodes (12): package, product, dependencies, info, platform, settings, sources, type (+4 more)

### Community 312 - "Datascratch"
Cohesion: 0.17
Nodes (12): config, archive, run, test, config, schemes, Datascratch, name (+4 more)

### Community 314 - "server (2)"
Cohesion: 0.17
Nodes (11): compilerOptions, lib, module, moduleResolution, noEmit, outDir, rootDir, types (+3 more)

### Community 315 - "scripts/generate.mjs (2)"
Cohesion: 0.17
Nodes (11): concurrency, cancel-in-progress, group, if, name, needs, runs-on, timeout-minutes (+3 more)

### Community 316 - "server.yml"
Cohesion: 0.17
Nodes (12): with, cache-from, cache-to, context, file, labels, node-version, password (+4 more)

### Community 317 - "metrics.ts (2)"
Cohesion: 0.17
Nodes (12): env, APP_URL, CORS_ORIGINS, DATABASE_URL, DB_MIGRATE_ON_START, E2E_SERVER_URL, HOST, LOG_LEVEL (+4 more)

### Community 318 - ".decode (3)"
Cohesion: 0.17
Nodes (12): runs-on, services, timeout-minutes, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, e2e-real-server, env (+4 more)

### Community 319 - "paste/markdown.ts"
Cohesion: 0.21
Nodes (10): CALLOUT_TONE, firstText(), highlight, inlineMath, lastText(), markdownToHtml(), marked, mathBlock (+2 more)

### Community 320 - "MathBlockView"
Cohesion: 0.17
Nodes (11): dependsOn, outputs, dependsOn, $schema, tasks, build, lint, test (+3 more)

### Community 321 - "EditorDemo README"
Cohesion: 0.24
Nodes (10): Demo verification checklist, EditorDemo README, EditorDemo app, ios-editor.yml CI unsigned IPA artifact, Metrics menu (open time, redraw, FPS, 10k words), Profiling with Instruments (Points of Interest), Sideloadly / AltStore sideload, com.datascratch.editor signposts (+2 more)

### Community 322 - "src/tokens.ts"
Cohesion: 0.33
Nodes (6): HIGHLIGHT_TOKENS, INK_TOKENS, resolveColor(), TINTS, TOKEN_FALLBACKS, tokenVarName()

### Community 323 - "shared/package.json"
Cohesion: 0.20
Nodes (11): if, name, needs, permissions, runs-on, timeout-minutes, permissions, deploy (+3 more)

### Community 324 - "steps (2)"
Cohesion: 0.18
Nodes (11): if, name, needs, outputs, runs-on, timeout-minutes, images, postgres (+3 more)

### Community 326 - "metrics.ts (3)"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, module, moduleResolution, noEmit, rootDir, types, extends (+2 more)

### Community 327 - "ui/test/setup.ts"
Cohesion: 0.18
Nodes (3): @testing-library/jest-dom@^7.0.1, RO, @testing-library/jest-dom

### Community 328 - "repairTitle.test.ts"
Cohesion: 0.38
Nodes (4): agentEdit, agentNote(), demoted(), emptyBlock()

### Community 329 - "FrameRateBoost"
Cohesion: 0.24
Nodes (3): FrameRateBoost, .isActive, Tick

### Community 330 - "ios/project.yml"
Cohesion: 0.20
Nodes (9): configFiles, Debug, Release, include, path, relativePaths, name, settings (+1 more)

### Community 331 - "True (2)"
Cohesion: 0.20
Nodes (9): compilerOptions, declaration, noEmit, outDir, rootDir, sourceMap, extends, include (+1 more)

### Community 332 - "EditorDemo"
Cohesion: 0.20
Nodes (10): scripts, build, dev, e2e, e2e:build, lint, mock-server, preview (+2 more)

### Community 333 - "loadKatex"
Cohesion: 0.20
Nodes (9): compilerOptions, declaration, lib, noEmit, sourceMap, types, extends, include (+1 more)

### Community 334 - "Как подключить Claude или ChatGPT к Datascratch"
Cohesion: 0.20
Nodes (10): ChatGPT, Claude (claude.ai, приложение Claude, Claude Code), Агент без OAuth или свой скрипт, Если что-то не работает, Как подключить Claude или ChatGPT к Datascratch, Управление доступом, Что получит агент, Шаг 1. Включите режим «для агентов» у блокнота (+2 more)

### Community 335 - "Блочный редактор с Markdown-сокращениями"
Cohesion: 0.20
Nodes (10): Collaborator cursors via awareness (y-protocols); awareness change swaps cursor layer only, Ручки блоков зависят от ввода (мышь — наведение, палец — тихая ручка, Pencil — никогда), blockId (UUIDv7) у каждого блочного узла, taskId у задач, DatascratchEditor (@datascratch/web-editor) — состояние целиком в Y.Doc, EditorHost — колбэки приложения (вложения, ссылки, теги, задачи, defaultTitle, taskDates), Строчные формулы $…$ показываются KaTeX без изменения документа, Mermaid и KaTeX загружаются лениво, Одна вставка — один шаг отмены; первый абзац продолжает текст до курсора, последний переходит в текст после, остальные блоки — в том же контейнере; пустой абзац не остаётся (+2 more)

### Community 336 - "compilerOptions (2) (2)"
Cohesion: 0.33
Nodes (10): steps, steps, steps, steps, continue-on-error, id, if, name (+2 more)

### Community 337 - "with (2)"
Cohesion: 0.20
Nodes (10): with, cache, cache-from, cache-to, context, file, load, node-version (+2 more)

### Community 338 - "2026-10-25 (вторая половина дня) (2) (2)"
Cohesion: 0.38
Nodes (8): apt_install(), DEBIAN_FRONTEND, have(), installed(), log(), ours_on_443(), port_busy(), bootstrap.sh script

### Community 339 - "tokens.test.mjs (2)"
Cohesion: 0.20
Nodes (10): DS_DOMAIN, DS_SITE, web, container_name, depends_on, environment, image, ports (+2 more)

### Community 340 - "Запуск"
Cohesion: 0.20
Nodes (10): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, command, environment, image, restart, shm_size (+2 more)

### Community 341 - "peerDependencies"
Cohesion: 0.20
Nodes (10): react@^19.3.1, react-dom@^19.3.1, tailwindcss@^4.3.3, react, react-dom, tailwindcss, peerDependencies, react@^19.0.0 (+2 more)

### Community 342 - "compat/package.json (2)"
Cohesion: 0.20
Nodes (9): compilerOptions, declaration, jsx, lib, noEmit, types, extends, include (+1 more)

### Community 344 - "verify.mjs"
Cohesion: 0.33
Nodes (3): doc, s1, update

### Community 346 - "with"
Cohesion: 0.40
Nodes (5): with, if-no-files-found, key, name, path

### Community 347 - "katex"
Cohesion: 0.22
Nodes (8): iOS, name, options, bundleIdPrefix, createIntermediateGroups, deploymentTarget, settings, targets

### Community 348 - "server.yml (2)"
Cohesion: 0.22
Nodes (8): concurrency, cancel-in-progress, group, runs-on, timeout-minutes, jobs, docker, name

### Community 349 - "react"
Cohesion: 0.22
Nodes (8): concurrency, cancel-in-progress, group, jobs, web-image, name, runs-on, timeout-minutes

### Community 350 - "BlockLayoutFragment (2) (2)"
Cohesion: 0.22
Nodes (9): APP_URL, DATABASE_URL, DS_VERSION, NODE_OPTIONS, OAUTH_CLIENT_METADATA_DOCUMENTS, PORT, PUBLIC_URL, STORAGE_DIR (+1 more)

### Community 351 - "AgentsContext plugin-server interface (2)"
Cohesion: 0.33
Nodes (7): b64(), base, fetchImageBlocksPrivate(), post(), retry(), sleep(), uuidv7()

### Community 353 - "deploy.yml"
Cohesion: 0.22
Nodes (9): scripts, bench, bench:memory, build, lint, test, test:memory, test:watch (+1 more)

### Community 354 - "web.yml"
Cohesion: 0.22
Nodes (8): compilerOptions, jsx, lib, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 355 - "Features"
Cohesion: 0.29
Nodes (4): Features, .calendar, .tabs, .tasks

### Community 357 - "Kind"
Cohesion: 0.67
Nodes (3): Kind, push, snapshot

### Community 359 - "FrameRateBoost (2)"
Cohesion: 0.25
Nodes (8): target, dependencies, platform, settings, sources, type, dependencies, EditorDemoTests

### Community 361 - "ios/project.yml (2)"
Cohesion: 0.25
Nodes (8): iOS, options, bundleIdPrefix, createIntermediateGroups, deploymentTarget, developmentLanguage, groupSortPosition, xcodeVersion

### Community 362 - "09-agents-api.md"
Cohesion: 0.29
Nodes (8): Метка agentEdit — правки агента до принятия, Плашка «Правки агента · Принять все · Посмотреть историю», Agent edits (D-10): agentEdit mark, quiet green margin bar, «Правки агента · Принять все» banner, per-block accept, Заметка, созданная агентом: плашка «Создано агентом · Понятно» (NoteMeta.createdByAgent), D-45: «Создано агентом {имя} · Понятно» strip via NoteMeta.createdByAgent, DSEditorModel.AgentEdits (iOS logic, web mirrors), Тихая подсветка: зелёная полоса на левом поле, Правки агента (D-10): как выглядят и как принимаются

### Community 363 - "first-sync.bench.ts (3)"
Cohesion: 0.29
Nodes (8): Метки на курсоре применяются к следующему набранному тексту, Панель форматирования DSFormatBar (EditorView.formatState, perform), Ссылка через onLinkRequest → setLink, Вставка в заголовок — только текст одной строкой (переносы — пробелы), в блок кода — текст как есть, в ячейку таблицы — текст в одну строку, «Вставить без форматирования» (меню редактирования, ⇧⌘V на iPad) — только текст, Меню текста «Формат» и «Стиль», Название новой заметки как в Apple Notes (focusTitle, defaultTitle, commitDefaultTitleIfNeeded), Форматирование касанием (iOS)

### Community 364 - "contracts/sync.ts (2) (2)"
Cohesion: 0.39
Nodes (6): end(), have(), LC_ALL, pkg(), section(), inspect.sh script

### Community 366 - "steps (4)"
Cohesion: 0.43
Nodes (8): steps, steps, if, name, run, uses, working-directory, steps

### Community 367 - "postgres"
Cohesion: 0.25
Nodes (8): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, env, image, options, ports, postgres

### Community 368 - "with (2) (2)"
Cohesion: 0.50
Nodes (8): steps, if, name, run, uses, working-directory, steps, steps

### Community 369 - "compilerOptions (4)"
Cohesion: 0.25
Nodes (7): name, services, volumes, caddy_config, caddy_data, files, pgdata

### Community 370 - "web"
Cohesion: 0.25
Nodes (8): postgres, condition, depends_on, env_file, image, restart, volumes, server

### Community 371 - "pen.spec.tsx"
Cohesion: 0.25
Nodes (7): compilerOptions, noEmit, outDir, rootDir, extends, include, ./tsconfig.json

### Community 372 - "peerDependencies (2)"
Cohesion: 0.25
Nodes (7): compilerOptions, lib, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 373 - "compilerOptions (3) (2)"
Cohesion: 0.25
Nodes (7): compilerOptions, lib, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 374 - "logic-linux"
Cohesion: 0.67
Nodes (3): logic-linux, container, runs-on

### Community 377 - "Обзор архитектуры"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 378 - "Журнал изменений (newest first; date — what changed, decision refs) (2) (2)"
Cohesion: 0.29
Nodes (7): 2026-10-25, tools/graphify_docs.py (prepare / finish / label) — graph update after doc edits; git hook reacts only to code (D-29), Передаточный документ history/2026-10-25-handoff.md (устарел в части стека), 2026-10-25: stack approved (D-21), no Rust core (D-22), no Redis (D-25), no MinIO (D-26), Yrs in prototype (D-27), dev process (D-28), Graphify (D-29), PostgreSQL (D-30), Yjs (D-31), Журнал изменений, finish refuses to write graph if nodes of unchanged files disappear, Doc graph update: tools/graphify_docs.py prepare → parallel extraction agents (extraction-spec.md) → finish → export html → check-update

### Community 379 - "Одно касание: ссылки, кружки задач, чипы дат (меню переноса), VoiceOver"
Cohesion: 0.38
Nodes (7): Dictation/IME marked text inserted at cursor; unreported field changes carried into document, Литеральный [[Название]] — показывается ссылкой, касание открывает или создаёт заметку, noteLink atom (noteId, label) shown as chip; literal [[Название]] rendered as link, tap opens/creates note, iOS single tap on link/task circle/date chip acts without cursor or keyboard; each is an accessibility element, taskDatesEnabled / EditorHost.taskDates "inert" — режим «только заметки», Ссылки `[[Название]]`, Контекстное меню задачи: перенести, дедлайн, выполнить, отменить, открыть, переместить

### Community 380 - "Block editor with Markdown shortcuts; storage = CRDT block tree, Markdown only export/agent format"
Cohesion: 0.33
Nodes (6): iOS formula/Mermaid block sizing by real bounds; scroll stability after open (full layout up to 40 000 chars), iOS: UIKit + TextKit 2 (not WebView), iOS: UIKit + TextKit 2 (не WebView), Общие примеры вставки (HTML → ожидаемые блоки) переносятся в packages/test-vectors/vectors/paste/ после сборки 19, Web: TipTap (ProseMirror) + Yjs, Платформенная реализация

### Community 383 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, dev, lint, showcase:build, test, test:layout, typecheck

### Community 385 - "deploy-e2e"
Cohesion: 0.33
Nodes (6): targets, build, test, schemes, EditorDemo, targets

### Community 388 - "secrets"
Cohesion: 0.33
Nodes (6): secrets, inspect, ready, name, outputs, runs-on

### Community 389 - "test"
Cohesion: 0.33
Nodes (6): TEST_DATABASE_URL, test, env, runs-on, services, timeout-minutes

### Community 390 - "G6"
Cohesion: 0.33
Nodes (6): paths, branches, paths, True, pull_request, push

### Community 391 - "StrokePoint (2)"
Cohesion: 0.33
Nodes (6): run, web, working-directory, defaults, runs-on, timeout-minutes

### Community 392 - "web (2)"
Cohesion: 0.33
Nodes (6): paths, branches, paths, True, pull_request, push

### Community 393 - "EditorDemo README (2)"
Cohesion: 0.33
Nodes (6): with, cache, name, node-version, path, retention-days

### Community 394 - "options (2) (2)"
Cohesion: 0.33
Nodes (6): resources, memory, deploy, limits, deploy, deploy

### Community 396 - "D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления"
Cohesion: 0.40
Nodes (5): path, path, packages, DSDesign, DSEditor

### Community 397 - "Открытые вопросы (3)"
Cohesion: 0.40
Nodes (5): platform, settings, sources, type, EditorDemoUITests

### Community 398 - "build_number (2)"
Cohesion: 0.40
Nodes (4): A1e(), C1e(), n1e(), O6()

### Community 403 - "test-vectors/tsconfig.json"
Cohesion: 0.40
Nodes (5): NODE_ENV, VITE_DS_EXTENDED_MODE, VITE_DS_SERVER_URL, VITE_DS_TEST_HOOKS, env

### Community 404 - "lowlight"
Cohesion: 0.40
Nodes (5): interval, retries, test, timeout, healthcheck

### Community 406 - "scripts (2) (2)"
Cohesion: 0.50
Nodes (3): IPHONEOS_DEPLOYMENT_TARGET, MACOSX_DEPLOYMENT_TARGET, build-xcframework.sh script

### Community 409 - "Block editor with Markdown shortcuts; storage = CRDT block tree, Markdown only export/agent format (2)"
Cohesion: 0.50
Nodes (4): Модули DSEditor: DSInk, DSEditorModel, DSEditor, Link: onLinkRequest → setLink(_:) (editor does not read clipboard itself), «/» block menu (DSEditorModel.SlashCommands, same items as web; ru/en keywords), Touch formatting (iOS): DSFormatBar, EditorView.formatState/perform, marks on next typed text, text menu Формат/Стиль

### Community 410 - "2026-10-27 web-editor: rich paste aligned with iOS — one rule in spec/04 and shared vectors packages/test-vectors/vectors/paste/cases.json (HTML/Markdown → blocks) checked by CT; fixed Apple Notes <div> rows and Google Docs <br> becoming a second title; Markdown parsed by agent import rules; column widths and trailing code newline dropped"
Cohesion: 0.50
Nodes (4): packages/test-vectors/vectors/paste/cases.json (ct/pasteVectors.spec.tsx, DSEditorModelTests), Markdown paste parsed by agent import rules (packages/agents/src/doc/markdown-import.ts), Rich paste rule (web + iOS one mapping): HTML from web/Google Docs/Word/Apple Notes/Notion → blocks; formatting dropped; never second title, paste/cases.json — rich paste HTML/Markdown → expected blocks (web + iOS)

### Community 411 - "deploy-e2e (2)"
Cohesion: 0.50
Nodes (4): name, runs-on, timeout-minutes, deploy-e2e

### Community 412 - "Demo/project.yml"
Cohesion: 0.83
Nodes (3): q(), remote(), remote.sh script

### Community 413 - "@tiptap/extension-code-block-lowlight"
Cohesion: 0.50
Nodes (4): yjs@^13.6.27, yjs, peerDependencies, yjs@^13.6.0

### Community 414 - "@datascratch/design-tokens — токены «Тихая бумага» (2)"
Cohesion: 0.50
Nodes (3): printWidth, singleQuote, trailingComma

### Community 415 - "Step (2)"
Cohesion: 1.00
Nodes (3): Mermaid MIT License, mermaid.js (Knut Sveidqvist), MIT License terms

### Community 420 - "DSSuggestionList (2) (2)"
Cohesion: 0.67
Nodes (3): import, types, ./crypto

### Community 422 - "exports"
Cohesion: 0.67
Nodes (3): exports, ./fonts.css, ./styles.css

### Community 423 - "@tiptap/react@^3.32.0"
Cohesion: 1.00
Nodes (3): Web editor showcase page (index.html), Module entry script /demo/main.tsx, Root mount element #root

## Ambiguous Edges - Review These
- `0030-server-database-postgresql.md` → `Shared for the whole account: app settings, account, keys, devices, agent grants`  [AMBIGUOUS]
  docs/decisions/0048-isolated-spaces.md · relation: references
- `Daily notes and Inbox live in the notebook from settings.dailyNotebookBySpace` → `settings.dailyNotebookBySpace { spaceId: notebookId } — daily notes and Inbox notebook per space (D-48)`  [AMBIGUOUS]
  docs/architecture/contracts/document-model.md · relation: conceptually_related_to
- `D-30 БД сервера: PostgreSQL` → `Account-wide (shared across spaces): app settings (theme, language, pen), account, keys, devices, agent grants`  [AMBIGUOUS]
  docs/decisions/0048-isolated-spaces.md · relation: references

## Knowledge Gaps
- **1645 isolated node(s):** `Clibsodium`, `sodiumInit`, `invalidKeyLength`, `kdfFailed`, `unsupportedKDF` (+1640 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 5067 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **73 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `packages/design-tokens/tokens.json — источник значений; генерирует CSS-переменные и Swift` connect `design-tokens.md` to `CaseIterable`, `02-platforms.md`, `scripts/generate.mjs`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Are the 121 inferred relationships involving `e()` (e.g. with `_4()` and `a()`) actually correct?**
  _`e()` has 121 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Clibsodium`, `sodiumInit`, `invalidKeyLength` to the rest of the system?**
  _1645 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Data` be split into smaller, more focused modules?**
  _Cohesion score 0.0034853527411037558 - nodes in this community are weakly interconnected._
- **Why does `Чип даты (одинаково на iOS и в вебе): «Сегодня/Завтра/Вчера», день недели на 2–6 дней вперёд, иначе короткая дата; цвета danger/warning/accent/text.tertiary` connect `design-tokens.md` to `DSLanguage (2)`, `roadmap.md`, `DSDesign Swift package (iOS 26, Swift 6) — «Тихая бумага» design system tokens + SwiftUI components`, `ref_react`, `Foundation`, `scripts/generate.mjs`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `0030-server-database-postgresql.md` and `Shared for the whole account: app settings, account, keys, devices, agent grants`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Daily notes and Inbox live in the notebook from settings.dailyNotebookBySpace` and `settings.dailyNotebookBySpace { spaceId: notebookId } — daily notes and Inbox notebook per space (D-48)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._