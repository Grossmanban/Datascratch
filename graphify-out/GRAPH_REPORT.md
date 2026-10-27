# Graph Report - Datascratch  (2026-10-27)

## Corpus Check
- 904 files · ~680,797 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 38 file(s) not represented in the graph (top: (none) 19, .css 6, .example 4)

## Summary
- 17612 nodes · 45732 edges · 421 communities (381 shown, 40 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 4916 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `10496307`
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
- contracts/document.ts (2)
- open-questions.md
- PenLayer.ts
- contracts/crypto.ts
- UIKit
- e
- oauth.ts (2)
- NativeEditorModel
- session.ts
- X8
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
- .make
- MarkSet
- web-editor/package.json
- actions.ts
- handwriting-png.ts (2)
- contracts/api.ts
- SyncEngine
- data/attachments.ts
- crypto.md
- store.ts
- AppShell.tsx
- 0005-living-stroke.md
- String
- agents/src/context.ts
- CodingKeys
- .from
- server/README.md
- View (2) (2)
- sync/client.ts
- Projection
- CoverAction
- DSTaskState
- KeyRing
- tTe
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
- pages.ts
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
- cn
- AppModel
- MarkSet
- schema/index.ts
- shared.ts
- .dismiss
- Block schema: doc = title block+ (paragraph, heading, lists, taskList, blockquote, callout, codeBlock, mathBlock, mermaid, table, image, file, drawing, pageCard)
- DemoModel
- Gi
- DSMotionToken (2)
- CaseIterable
- Gi (2) (2) (2) (2) (2) (2)
- auth.ts (2)
- cn (2)
- memory-check.ts
- SyncClient (3)
- ref_react
- AccountService (2)
- AppShell.tsx
- shared/README.md
- AppModel
- paste.spec.tsx
- 11-nfr.md
- EditorCommands (2)
- DocumentCollectionView (2) (2) (2) (2)
- infra/README.md
- LibraryUITests
- Stroke (2)
- DSCore (2)
- store.ts (2)
- Equatable (2)
- open-questions.md (2)
- Server PostgreSQL Schema
- DSLanguage
- Equatable
- Contract: AI agents API — MCP, REST, OAuth (v1) (2)
- caddy
- FlakyTransport
- HTMLNode
- world.ts
- RecoveryKey (2)
- Contract: AI agents API — MCP, REST, OAuth (v1) (3)
- 0018-monetization.md
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
- TransactionOrigin (2)
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
- shared/src/ids.ts
- YValue
- DSTaskState (2)
- UIKit (3)
- WidthPoint
- .body
- Contract: AI agents API — MCP, REST, OAuth (v1)
- env
- NoteBlock (3)
- StrokeVectorTests
- guest.ts
- Foundation
- ii
- scripts/generate.mjs
- ii (2)
- DexieSyncStorage
- TaskEntry
- Phase
- ref_react (2)
- EditorTextView
- CaseIterable (2) (2)
- document/blocks.ts (2)
- server/src/context.ts
- schema.ts (2)
- 0011-handwriting-for-agents.md
- dj
- ui/package.json
- schema/index.ts (2)
- Images and files in a note: «/» → «Картинка»/«Файл», paste, drag; image/file blocks; EditorHost.uploadAttachment encrypts in 1 MiB chunks (storeAttachment), resolveAttachment → blob:; works in minimal build (D-51)
- CodingKeys
- server.mjs
- iOS checks and TestFlight builds (D-46): macOS runners ios-app/ios-editor/ios-core/design; ios-app ~25 min, ios-release ~30 min, Apple 5-30 min
- D-44 iPad columns: sidebar controlled only by its own button (РЕШЕНО; three-panel layout superseded by D-47)
- TagNode
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
- Color
- i18n/index.ts
- .make (2)
- with
- paper.ts
- @datascratch/web-editor DatascratchEditor React component (state entirely in Y.Doc)
- r8
- DSBackdrop
- deploy.sh
- ios (2)
- tasks.ts
- markdown.ts
- DSColorToken (2)
- AttachmentManager
- Как поставить Datascratch на iPad без Mac (TestFlight)
- WikiLinkMatch
- apps/web index.html (PWA entry)
- web/vite.config.ts
- gate
- InkInputRecognizer
- design-tokens/package.json
- lo
- devDependencies (2)
- .content (2)
- DSSkeleton
- Contract: AI agents API — MCP, REST, OAuth (v1) (2) (2)
- minisearch
- RecordingRemote (2)
- document-model.md (2)
- Контракт: шифрование (v1)
- DSGlassModifier
- InkInputRecognizer (2)
- DSFeedback
- Any
- No reruns on main: Linux gate step skips macOS jobs when the same tracked files already passed the workflow (already-tested.sh)
- memory.bench.ts
- Integration/CoreLibrary.swift over DSCore: account/notebook/note documents on Yrs, LocalStore (GRDB) with send queue, KeyRing keys, notebook meta name/icon/space for agents, one-time JSON migration
- DSSettingsSampleContent
- .content (2) (2)
- Технологический стек — РЕШЕНО (2026-10-25)
- EditorAction
- DocumentUndoManager (2)
- infra/README.md (2)
- edit_note atomic operations: insert, replace (keeps blockId), delete, move, replace_text
- gate (2)
- D-29. Graphify: порядок работы, чтобы граф был всегда актуален
- index.d.ts
- shares.ts (2)
- web-editor/src/index.ts (2)
- index.d.ts (2)
- NoteMedia.swift
- SwiftUI
- UIKit (2)
- pages.ts (2)
- steps
- 12.1. Задачи
- TaskQuery
- Демо «Живой штрих» (EditorDemo)
- .finishLasso
- first-sync.bench.ts
- with (2)
- DSSuggestionList (2)
- .classify
- steps (2)
- steps (3)
- compat/generate.mjs
- Pit
- AgentEditsBanner
- DatascratchTests
- D-48. Пространства полностью изолированы
- document-model.md
- 0045-agent-created-notes.md (3)
- .attachmentBounds (2)
- Card.tsx (2)
- True
- True
- @datascratch/design-tokens — токены «Тихая бумага»
- options
- Step
- Контракт: API для ИИ-агентов — MCP, REST, OAuth (v1) (2)
- .content (2)
- DSDocRow (2)
- metrics.ts
- store.ts (3) (2)
- make_placeholder_icon.py
- EditorTextView (2)
- DatascratchTests (2)
- Pen Manual Test Checklist (iPad/iPhone)
- first-sync.bench.ts (2)
- agents-api.md (5)
- State
- D-04. Одновременно сквозное шифрование и доступ по API
- fake-indexeddb
- react-dom@^19
- Контракт: шифрование (v1) (2)
- Datascratch
- @tiptap/core@^3
- server (2)
- scripts/generate.mjs (2)
- server.yml
- metrics.ts (2)
- .decode (3)
- paste/markdown.ts
- MathBlockView
- EditorDemo README
- y-protocols@^1.0.7
- shared/package.json
- steps (2)
- world.ts (2) (2)
- metrics.ts (3)
- ui/test/setup.ts
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
- katex
- server.yml (2)
- react
- BlockLayoutFragment (2) (2)
- AgentsContext plugin-server interface (2)
- infra/README.md (3)
- deploy.yml
- web.yml
- Features
- FrameRateBoost (2)
- ios/project.yml (2)
- 09-agents-api.md
- first-sync.bench.ts (3)
- contracts/sync.ts (2) (2)
- steps (4)
- postgres
- with (2) (2)
- compilerOptions (4)
- web
- pen.spec.tsx
- peerDependencies (2)
- compilerOptions (3) (2)
- Обзор архитектуры
- Журнал изменений (newest first; date — what changed, decision refs) (2) (2)
- Одно касание: ссылки, кружки задач, чипы дат (меню переноса), VoiceOver
- Block editor with Markdown shortcuts; storage = CRDT block tree, Markdown only export/agent format
- Contract: AI agents API — MCP, REST, OAuth (v1) (2)
- True
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
- `Перестройка блоков (§4.1a): при разделении, слиянии, смене типа и перемещении блока клиент в той же транзакции заменяет затронутый штрих копией (новый strokeId, те же точки, якоря по соответствию символов)` --semantically_similar_to--> `rebaseRedoneAnchors()`  [INFERRED] [semantically similar]
  docs/architecture/contracts/strokes.md → packages/shared/src/strokes/store.ts
- `Agent Markdown escaping: backslash-escaped chars are plain text; read_note escapes everything that would become markup` --semantically_similar_to--> `escapeText()`  [INFERRED] [semantically similar]
  docs/architecture/contracts/agents-api.md → packages/shared/src/document/markdown.ts
- `extendedMode build flag (DS_EXTENDED_MODE → DSExtendedMode Info.plist; VITE_DS_EXTENDED_MODE), default false` --references--> `VITE_DS_EXTENDED_MODE`  [INFERRED]
  docs/decisions/0051-minimal-mode.md → .github/workflows/web.yml
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

## Communities (421 total, 40 thin omitted)

### Community 0 - "Data"
Cohesion: 0.00
Nodes (264): _7(), a8e(), addDocument(), addParents(), ait(), AT_LEAST_ONE(), AT_LEAST_ONE1(), AT_LEAST_ONE2() (+256 more)

### Community 1 - "r"
Cohesion: 0.02
Nodes (228): _8(), $9(), a(), Aet(), aMe(), aOe(), r(), aRe() (+220 more)

### Community 2 - "design-tokens.md"
Cohesion: 0.06
Nodes (53): SwiftUI token API: dsFont, .ds(), dsTint, ink, dsShadow, pnpm @datascratch/design-tokens generate / check (CI: generated equals committed), Tokens.generated.swift (generated, do not edit by hand), packages/design-tokens/tokens.json (token source), Accessibility: a11y.spec.ts (axe-core WCAG 2.1 AA), keyboard.spec.ts, text.secondary for meaningful small text, focus-visible hover buttons, sr-only labels, iconGlyph / withIcon (src/lib/glyph.ts): SF Symbol names shown as similar emoji, unknown names hidden, Instant theme switch (theme.spec.ts), design-review polish (paper top bar, sentence case), reduced-motion respected (MotionConfig reducedMotion="user"), Backdrop Gradients (+45 more)

### Community 3 - "stack.md"
Cohesion: 0.02
Nodes (135): fastify@^5.12.7, fastify, Agent rate limits (in-memory counters, D-25) and OAuth 2.1 for MCP are the plugin's responsibility, Server stack: Node 22 + Fastify + zod + Drizzle + pg-boss, Optional grantId on context.data methods — server queries under RLS role limited to grant notebooks (D-30), PostgreSQL Row-Level Security per grant (server stream, via context), agent_tokens / agent_audit_log Tables, Row-Level Security for ds_agent (D-30) (+127 more)

### Community 4 - "shared.ts (2)"
Cohesion: 0.03
Nodes (61): notebooksApi, getMasterKey(), uploadPending(), accountDb, AttachmentRow, ChunkRow, deviceDb, DocRow (+53 more)

### Community 5 - "EditorView.swift"
Cohesion: 0.03
Nodes (88): edit, DSHaptics, EditorDiagnostics, acceptAgentEdits(), alignPaper(), animateCheck(), applyKeyboardInset(), applySlashCommand() (+80 more)

### Community 6 - "shell/Sidebar.tsx"
Cohesion: 0.05
Nodes (136): useRecoveryUnconfirmed(), acc(), closeOtherTabs(), closeTab(), createFolder(), deleteFolder(), deleteNoteForever(), deleteSpace() (+128 more)

### Community 7 - "Data (2)"
Cohesion: 0.05
Nodes (29): CRDTUpdates, CryptoAD, CryptoError, decryptionFailed, invalidKeyLength, invalidRecoveryKey, kdfFailed, malformedEnvelope (+21 more)

### Community 8 - "iOS editor and pen layer: apps/ios/Packages/DSEditor — modules DSInk, DSEditorModel (EditorDocument), DSEditor; demo com.datascratch.app.editordemo"
Cohesion: 0.03
Nodes (133): ios-editor: бисекция вылета демо (BareEditorProbeTests, -bareEditorProbe), D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, Free drawing far from text (>3 em) anchors whole stroke to nearest paragraph — confirm threshold on iPad, 3. Apple Pencil в тексте — ключевая фича, Prototype acceptance criteria — see roadmap stage 1, Implementation hypothesis: each point = (character anchor, dx/dy from glyph in font-size units); recompute on reflow, break where neighbours fall on different lines (+125 more)

### Community 9 - "EditorTheme"
Cohesion: 0.05
Nodes (24): .body, .filtered, .subfolders, LibraryBackend, .lockedNotebookIds, LibraryPersistence, LibrarySnapshot, LibraryStore (+16 more)

### Community 10 - "sync-protocol.md"
Cohesion: 0.03
Nodes (114): «Переместить в блокнот…»: moveNoteToNotebook rewraps note key, writes NoteMeta to new index, PATCH /v1/docs/:id, removes old entry (rollback on error); online only; warning for agent notebooks, Agent tokens endpoints (/agent-tokens, audit), contracts/agents-api.md — API for agents themselves (MCP/REST), Base https://<host>/v1, JSON UTF-8, binary as base64url without padding, Client-generated UUIDv7 ids; repeated POST idempotent, different body → 409, POST /docs — register doc (account/notebook/note) before first push, Error body { error: { code, message } } and codes (bad_request … internal), PATCH /notebooks/:id/mode — agent mode passes notebookKey, private removes server wrap (+106 more)

### Community 11 - "AttachmentFactory"
Cohesion: 0.04
Nodes (27): AttachmentFactory, .fileViews, .imageViews, .previews, .resolver, .showsResizeHandle, .theme, BlockAttachment (+19 more)

### Community 12 - "DSPenToolbar"
Cohesion: 0.03
Nodes (85): DSPenMode, .eraserMode, highlighter, lasso, marker, pen, pencil, pixelEraser (+77 more)

### Community 13 - "InMemoryEditorDocument"
Cohesion: 0.04
Nodes (36): File, FileItem, FileNode, FileStroke, InMemoryEditorDocument, .blocks, .canRedo, .canUndo (+28 more)

### Community 14 - "contracts/document.ts (2)"
Cohesion: 0.02
Nodes (178): buildNoteIndex(), matchNote(), SearchHit, snippet(), TaskInfo, DateOnly, IsoDateTime, Uuid (+170 more)

### Community 15 - "open-questions.md"
Cohesion: 0.04
Nodes (61): App Store Connect API Key (Admin), App Store Connect App Record, Apple Team ID (secret APPLE_TEAM_ID), Associated Domains Capability, Bundle ID com.datascratch.app with Associated Domains, Bundle ID com.datascratch.app, Workflow deletes development certificates created by previous cloud runs («Created via API», asc.py prune-ci-certs), Fallback Apple Distribution certificate (DIST_CERTIFICATE_P12) (+53 more)

### Community 16 - "PenLayer.ts"
Cohesion: 0.04
Nodes (65): AuthorKind, Stroke, StrokeAuthor, StrokeTool, packPoints(), strokeWidthAt(), tiltFactor(), ProsemirrorMapping (+57 more)

### Community 17 - "contracts/crypto.ts"
Cohesion: 0.06
Nodes (89): RFC-4648, AD, ATTACHMENT_CHUNK_BYTES, DEFAULT_KDF, ENVELOPE_OVERHEAD, ENVELOPE_VERSION, KDF_ALG, KDF_MEM (+81 more)

### Community 18 - "UIKit"
Cohesion: 0.04
Nodes (19): BareEditorProbe, .isRequested, SessionEndedUITests, NSAttributedString.Key, DSEditorInfo, UIColor, EditorView, ObservationToken (+11 more)

### Community 19 - "e"
Cohesion: 0.01
Nodes (165): $3(), _4(), aO(), b5e(), B6(), B7(), blockTokens(), BNe() (+157 more)

### Community 20 - "oauth.ts (2)"
Cohesion: 0.04
Nodes (85): RFC-7009, RFC-8252, RFC-9207, ACCESS_PREFIX, bearer(), GrantService, REFRESH_PREFIX, SCOPE_READ (+77 more)

### Community 21 - "NativeEditorModel"
Cohesion: 0.05
Nodes (27): CollapsedPenButton, .body, FormatBarRow, .body, HideKeyboardButton, .body, LinkPrompt, MediaChooser (+19 more)

### Community 22 - "session.ts"
Cohesion: 0.03
Nodes (142): accountApi, authApi, App(), queryClient, allRoute, appLayout, authLayout, calendarRoute (+134 more)

### Community 23 - "X8"
Cohesion: 0.02
Nodes (140): aEe(), Ake(), AW(), b(), bke(), buildLeafNode(), bW(), By() (+132 more)

### Community 24 - "docs/README.md"
Cohesion: 0.04
Nodes (67): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, Стартовый хук Claude Code (.claude/hooks/session-start.sh) (+59 more)

### Community 25 - "EditorCommands"
Cohesion: 0.06
Nodes (22): deleteLassoSelection(), menu(), setImageAttributes(), setImageWidth(), AgentEdits, BlockKind, blockquote, bulletList (+14 more)

### Community 26 - "08-sharing.md (2)"
Cohesion: 0.04
Nodes (64): Guest route /s/:shareId#k= (D-13, D-37): key in fragment never sent, in-memory guest session via POST /v1/shares/:id/guest, encrypted presence, src/ layout: app (TanStack Router), auth, api, data (Dexie, Yjs, keys, ops queue, indexes, runtime, guest, presence), sync, domain, features, lib/ui/editor/i18n/styles; e2e/, Web status: full main path works — auth with recovery key, spaces/notebooks/folders, doc screen, tasks/calendar, sharing and guest route, agent tokens; offline and sync covered by e2e against mock server, POST /shares/:id/guest — guest token for sync hello (no auth), Sharing endpoints /shares (view/edit, no expiry by default, revoke disconnects guests), awareness — курсоры и присутствие: зашифровано, не хранится, только рассылается, D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account (+56 more)

### Community 27 - "strokes.md"
Cohesion: 0.05
Nodes (82): Strokes with all anchors deleted are not shown (D-35), Handwriting in Markdown ![✍️ description](handwriting:<id>) — Russian description by stroke hint (D-11), 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4.1. Перепривязка якорей (отмена и восстановление версии), 4.1a. Перестройка блоков (разделение, слияние, смена типа, перемещение), 4.2. Когда штрих считается «осиротевшим» и удаляется навсегда (+74 more)

### Community 28 - "InMemoryEditorDocument (2)"
Cohesion: 0.03
Nodes (95): add(), ase(), atLeastOneInternalRecord(), atLeastOneSepFirstInternalRecord(), cacheForContext(), calculate(), cancel(), chopInput() (+87 more)

### Community 29 - "GuestPage.tsx"
Cohesion: 0.05
Nodes (84): current(), «Вставить картинку» button in document top bar (InsertPicture in DocPage): several images, at cursor or at end if cursor in title; percent progress; visible on narrow screen / iPad Safari, New note title (spec/04): cursor in title, Enter to text; empty title auto-filled «Заметка 26 октября 2026» / «Note Oct 26, 2026» (defaultNoteTitle, EditorHost.defaultTitle, EditorApi.focusTitle, setTitleOf), Upload progress: uploadAttachment(file, { onProgress }) (form agreed with web-editor; bare callback also accepted; failure → editor «Повторить» calls it again); top-bar button uses EditorApi.pickImage() when available, else own file picker; uploadNoteFile (editor/hosts.ts) reports 0…1 while chunks are encrypted (storeAttachment(…, onProgress)); server upload in background, attachmentUrl(), resizeImage(), storeAttachment(), channels (+76 more)

### Community 30 - "TransactionOrigin"
Cohesion: 0.06
Nodes (15): daily, AccountDocument, .accountDocId, .activeTab, .dailyNotebookId, .formatVersion, .recoveryKeyConfirmed, MetaCopy (+7 more)

### Community 31 - "store.ts (2)"
Cohesion: 0.06
Nodes (5): EditorViewTests, ImageStore, EditorDocument, .allBlocks, .isReadOnly

### Community 32 - "contracts/sync.ts"
Cohesion: 0.03
Nodes (76): ClientMessage, PROTOCOL_VERSION, ServerMessage, bad_request — код ошибки синхронизации для некорректного сообщения, base64UrlDecodedLength(), AckMessage, ackMessageSchema, CLIENT_PLATFORMS (+68 more)

### Community 33 - "roadmap.md"
Cohesion: 0.05
Nodes (101): Контракт agents-api.md — MCP и REST для ИИ-агентов, OAuth 2.1; реализуют сервер (плагин @datascratch/agents), веб и iOS (настройки токенов, страница /connect), Contract change rules (versioned, coordinator-only), Версионирование контрактов v1, v2…; ломающее изменение — новая версия с явной миграцией, Контракт меняет только сессия-координатор; исполнитель присылает предложение, Типы TypeScript контрактов в packages/shared/src/contracts/ — часть контракта, Контракты между частями системы, Правила изменения, GitHub Actions CI (incl. macOS iOS builds) (+93 more)

### Community 34 - "2026-10-25 (вторая половина дня)"
Cohesion: 0.02
Nodes (109): 2026-10-25 (вторая половина дня), agents, shared: create_note пишет NoteMeta.createdByAgent вместо меток agentEdit (D-45), agents: исправлен edit_note replace_text в тексте с метками; вектор create-note.json, agents: рукопись через границу ячеек таблицы, PNG как в редакторе iOS, agents: группировка штрихов по «заходу» письма, Markdown $…$, [[…]], align, agents, server: битое обновление не прячет блокнот от агентов (unavailable: true), Контракт document-model: «никогда не удалять непонятное», codeBlock допускает agentEdit, align ячеек, Контракт document-model: meta.color в документе блокнота (+101 more)

### Community 35 - "View"
Cohesion: 0.03
Nodes (75): AboutView, .body, AccountSettings, .body, AppearanceSettings, .body, AppSettings.Appearance, .symbol (+67 more)

### Community 36 - "SceneModel"
Cohesion: 0.03
Nodes (65): ClosingEditor, FocusedValues, FullScreen, content, document, PadLevel, document, list (+57 more)

### Community 37 - "Sendable"
Cohesion: 0.04
Nodes (101): Font, mono, sans, serif, NoteBlock, .plainText, Notebook, NotebookMode (+93 more)

### Community 38 - "handwriting-png.ts"
Cohesion: 0.04
Nodes (115): textTarget(), cellPlace(), clip(), collectHandwriting(), describeGroup(), findHandwriting(), GROUP_GAP_EM, GROUP_PAUSE_MS (+107 more)

### Community 39 - "DSDesign Swift package (iOS 26, Swift 6) — «Тихая бумага» design system tokens + SwiftUI components"
Cohesion: 0.06
Nodes (51): accessibilityIdentifier палитры пера для UI-тестов, CI design.yml (macOS): build, Swift Testing, DSShowcase PNG snapshots artifact dsdesign-snapshots, DSAvatar / DSAvatarStack (avatars and presence), DSBackdrop / DSGrain (gradient backdrops with paper grain), DSButtonStyle (primary / secondary / ghost / destructive), DSCallout (tinted warning with action), DSCalloutTone (note/info/success/warning/danger tones), DSDateChip / DSDateChipModel (Today / Tomorrow / date, red when overdue) (+43 more)

### Community 40 - "CaseIterable"
Cohesion: 0.02
Nodes (107): .pair, .color, .uiColor, .color, .color, .color, .color, .uiColor (+99 more)

### Community 41 - "NoteDocument"
Cohesion: 0.05
Nodes (32): TransactionOrigin, .description, .isOutgoing, local, other, remote, storage, system (+24 more)

### Community 42 - ".make"
Cohesion: 0.08
Nodes (9): docs, BenchmarkTests, Conn, eventually(), FakeFactory, FakeSyncServer, Stored, StubTransport (+1 more)

### Community 43 - "MarkSet"
Cohesion: 0.04
Nodes (41): .shape, BlockNode, .isTextblock, .plainText, .textLength, ChangeOrigin, local, redo (+33 more)

### Community 44 - "web-editor/package.json"
Cohesion: 0.03
Nodes (91): dependencies, @datascratch/design-tokens@workspace:*, @datascratch/shared@workspace:*, @datascratch/ui@workspace:*, katex@^0.16.0, lowlight@^3.3.0, lucide-react@^1.61.0, marked@16.4.2 (+83 more)

### Community 45 - "actions.ts"
Cohesion: 0.08
Nodes (41): rememberNotebookKey(), accountMaps(), AccountSnapshot, initAccountDoc(), readAccount(), TabEntry, createNotebook(), createSpace() (+33 more)

### Community 46 - "handwriting-png.ts (2)"
Cohesion: 0.05
Nodes (59): Empty paragraph at the end of an agent insert is dropped, BuildContext, cloneInto(), copyChildren(), fill(), fillInline(), insertBlock(), insertBlocks() (+51 more)

### Community 47 - "contracts/api.ts"
Cohesion: 0.03
Nodes (90): dependencies, @aws-sdk/client-s3@^3.1156.0, @datascratch/agents@workspace:^, @datascratch/shared@workspace:^, drizzle-orm@^0.45.4, @fastify/cors@^11.3.1, fastify-plugin@^6.0.1, @fastify/rate-limit@^11.2.1 (+82 more)

### Community 48 - "SyncEngine"
Cohesion: 0.05
Nodes (22): OpenDoc, Summary, failed, offline, synced, syncing, SyncEngine, SyncOnceResult (+14 more)

### Community 49 - "data/attachments.ts"
Cohesion: 0.08
Nodes (36): EditorHost.fetchRemoteImage(url) (lib/remoteImage.ts) for images in pasted HTML (rich paste, D-52): asks own server POST /fetch-image { url }; non-200 (422 with reason, 429, network failure, 30 s timeout) → editor keeps the image as a link; received bytes go through regular uploadAttachment, ApiError, doFetch(), fetchOnce(), NetworkError, READ_RETRY_DELAYS_MS, request(), RequestOptions (+28 more)

### Community 50 - "crypto.md"
Cohesion: 0.10
Nodes (42): endKeepingData("revoked") — session ended from another device: tokens/keys wiped from memory, account DB kept, revoked record in kv; revoked.spec.ts, Sign-out warns about unsent changes (unsentCount; «Сначала отправить» / «Выйти»), keeps local DB and notebook keys until sign-in to same account, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение, 7. Шифрование и доступ агентов, Login email + password; login and encryption keys derived on device; recovery key issued at registration (D-34, R-02) (+34 more)

### Community 51 - "store.ts"
Cohesion: 0.06
Nodes (66): readStrokes(), ResolvedAnchor, TextStrokeOptions, NOTE_ROOTS, ANCHOR_KINDS, AnchorKind, MIN_SEGMENT_POINTS, ORPHAN_STROKE_PURGE_DAYS (+58 more)

### Community 52 - "AppShell.tsx"
Cohesion: 0.03
Nodes (78): AN(), Ar(), aze(), bAe(), bT(), buildKeywordPattern(), buildKeywordToken(), buildKeywordTokens() (+70 more)

### Community 53 - "0005-living-stroke.md"
Cohesion: 0.03
Nodes (96): Shared test vectors (VectorTests), Контракт — точное описание формата/протокола, который реализуют несколько частей (iOS на Swift, веб и сервер на TS), Совместимость доказывается общими тестовыми векторами (packages/test-vectors), Anchor (textRange/paragraph/drawingBlock/image), Data Model Draft, doc_updates Table (encrypted Yjs updates), Note (text tree, handwriting layer, attachments, metadata), Note Structure (text, ink, attachments, metadata) (+88 more)

### Community 54 - "String"
Cohesion: 0.04
Nodes (44): AppRoute, note, noteTitled, share, today, Base64URL, Kind, note (+36 more)

### Community 55 - "agents/src/context.ts"
Cohesion: 0.03
Nodes (23): date(), grantDto(), PgAgentsStore, AgentDataSource, AgentEditOrigin, AgentGrant, AgentNotebook, AgentsStore (+15 more)

### Community 56 - "CodingKeys"
Cohesion: 0.05
Nodes (39): normalizeEmail(), APIErrorBody.Inner, APIValidation, CodingKeys, accessExpiresAt, accessToken, accountDocId, alg (+31 more)

### Community 57 - ".from"
Cohesion: 0.07
Nodes (27): .body, .menu, TaskDateChips, .body, TaskDateSheet, .body, TaskMenuItems, .body (+19 more)

### Community 58 - "server/README.md"
Cohesion: 0.05
Nodes (69): Access rights model (user, guest, agent), Agents API contract (agents-api.md), AgentsContext (store, data, users), agents data (plugins/agents-data.ts), Пакет @datascratch/agents (MCP, OAuth 2.1, REST, токены, журнал, PNG), @datascratch/agents Fastify plugin (MCP, OAuth 2.1), agents store (plugins/agents-store.ts), agents users (plugins/agents-users.ts) (+61 more)

### Community 59 - "View (2) (2)"
Cohesion: 0.02
Nodes (89): ACCESS_TOKEN_TTL_MS, AGENT_PERMISSIONS, AgentToken, agentTokenSchema, API_ERROR_CODES, API_PREFIX, API_ROUTES, ApiError (+81 more)

### Community 60 - "sync/client.ts"
Cohesion: 0.09
Nodes (34): Folder, NoteMeta, .isTrashed, AgentAuthor, .value, AnyKey, .intValue, .fields (+26 more)

### Community 61 - "Projection"
Cohesion: 0.03
Nodes (84): aA(), aFe(), aU(), bA(), brighter(), cA(), cFe(), clamp() (+76 more)

### Community 62 - "CoverAction"
Cohesion: 0.08
Nodes (23): CoverAction, file, .kind, .noteId, photo, reposition, CoverHeader, .body (+15 more)

### Community 63 - "DSTaskState"
Cohesion: 0.07
Nodes (23): TaskCheckbox, .body, .fallback, DSCheckmark, DSTaskCheckbox, .body, .isDone, DSTaskState (+15 more)

### Community 64 - "KeyRing"
Cohesion: 0.11
Nodes (6): .body, CoreLibraryRemoteTests, CoreLibraryTests, InMemorySecretStore, KeyRing, KeyRingDocumentKeys

### Community 65 - "tTe"
Cohesion: 0.40
Nodes (5): eTe(), tTe(), i(), n(), wTe()

### Community 66 - "View (2) (2) (2)"
Cohesion: 0.08
Nodes (42): AuthCard, .body, CheckboxToggleStyle, ConfirmRecoveryKeyView, .body, Entry, ErrorText, .body (+34 more)

### Community 67 - "Журнал изменений (newest first; date — what changed, decision refs) (2)"
Cohesion: 0.07
Nodes (22): Service endpoints GET /health { ok, version } and /openapi.json, D-08. Аннотации PDF пером — не в MVP, PDF pen annotations on iPad: PDFKit + own stroke layer, Решение, Решение (предложение), D-16. Импорт — не сейчас, Решение, Журнал решений (ADR): one file per decision (+14 more)

### Community 68 - "shared/test/sync.test.ts (2)"
Cohesion: 0.03
Nodes (82): addToResyncTokens(), atLeastOneInternalLogic(), atLeastOneSepFirstInternalLogic(), attemptInRepetitionRecovery(), BACKTRACK(), _Be(), buildFullFollowKeyStack(), canPerformInRuleRecovery() (+74 more)

### Community 69 - "Журнал изменений (newest first; date — what changed, decision refs)"
Cohesion: 0.03
Nodes (79): ios-editor + web-editor: agent edits quiet margin bar, «Правки агента · Принять все» banner (DSEditorModel.AgentEdits), agents: create_folder/rename_folder/move_folder/delete_folder, move_note in one server transaction (migration 0003_agent_move_note); agents cannot create notebooks (E2E master key), agents: handwriting PNG for agents — strokes grouped by writing session, table-cell crossing fixed, Noto Emoji, scale 3, agents: edit_note replace_text fixed for marked text (agentEdit); new vector agents/create-note.json, infra: web-app CSP no longer applied on server paths (/v1, /mcp, /oauth, /.well-known/oauth-*) — consent «Разрешить» was blocked by form-action 'self', Журнал изменений (newest first; date — what changed, decision refs), Contracts for parallel development docs/architecture/contracts/ (document model, strokes, sync, crypto, REST API, design tokens), 2026-10-25 decision D-43: local library auto-migrated to account on login; server deployed at ds.777400777.xyz (D-40 updated) (+71 more)

### Community 70 - "dependencies"
Cohesion: 0.04
Nodes (68): dependencies, @datascratch/design-tokens@workspace:^, @datascratch/shared@workspace:^, @expo-google-fonts/inter@^0.4.2, @expo-google-fonts/newsreader@^0.4.1, @expo-google-fonts/noto-emoji@^0.4.8, fastify-plugin@^6.0.1, mdast-util-from-markdown@^2.1.0 (+60 more)

### Community 71 - "InkController"
Cohesion: 0.07
Nodes (11): InkController, .commands, .eraserRadius, OutlineKey, Session, Target, block, text (+3 more)

### Community 72 - "crypto.md (2)"
Cohesion: 0.08
Nodes (40): Offline-first device data in IndexedDB via Dexie (spec/10): ds-device and ds-account-<userId> (docs, Yjs updates, outbox, REST ops queue, task and note index), Agent Mode (R-10), Режим «для агентов»: notebookKey обёрнут serverKey (DS_KMS_KEY), Вложения шифруются кусками по 1 MiB, каждый — отдельный конверт, Ciphertext Envelope (XChaCha20-Poly1305), Контракт: шифрование (v1, libsodium), Encryption Contract v1, Ciphertext envelope (XChaCha20-Poly1305 with AD binding) (+32 more)

### Community 73 - "Editor.tsx"
Cohesion: 0.05
Nodes (71): DEFAULT_NOTE_STYLE, NoteBackdrop, NoteCover, NoteStyle, SuggestionGroup, App(), attachments, awA (+63 more)

### Community 74 - "APIClient"
Cohesion: 0.04
Nodes (13): .signedOutEmail, .unsentChanges, APIClient, .currentSession, .isSignedIn, HTTPTransport, SecretSessionStore, SessionStore (+5 more)

### Community 75 - "agent-service.ts"
Cohesion: 0.07
Nodes (45): Resolved: notebook/space name, icon and color copied into notebook doc meta; plugin uses AgentNotebook else meta; fallback «Без названия», AgentError, buildMcpServer(), Principal, requireWrite(), AgentService, folderPath(), FolderView (+37 more)

### Community 76 - "pages.ts"
Cohesion: 0.07
Nodes (12): DocumentRecord, FailedSync, Kind, push, snapshot, LocalStore, .migrator, OutboxItem (+4 more)

### Community 77 - "SyncClient"
Cohesion: 0.05
Nodes (19): Configuration, SyncClient, .isConnected, SyncClientDelegate, SyncClientError, closed, notConnected, server (+11 more)

### Community 78 - "CalendarPage.tsx"
Cohesion: 0.08
Nodes (82): TaskRow, cachedNoteKey(), addTask(), AgentCreated, belongsTo(), dailyNotebookId(), deleteNotebook(), deleteTask() (+74 more)

### Community 79 - "SwiftUI"
Cohesion: 0.02
Nodes (109): addAstNodeRegionWithAssignmentsTo(), addHiddenToken(), addHiddenTokens(), all(), allElements(), bD(), BIe(), children() (+101 more)

### Community 80 - "auth.ts"
Cohesion: 0.10
Nodes (42): Revoking a device, a share or deleting the account immediately closes WebSocket connections (code 4401), WEB_COOKIE, WEB_SESSION_TTL_SEC, b64(), fromB64(), randomToken(), sha256(), toB64() (+34 more)

### Community 81 - "web/package.json"
Cohesion: 0.04
Nodes (45): dependencies, clsx@^2.1.1, cmdk@^1, @datascratch/design-tokens@workspace:^, @datascratch/shared@workspace:^, @datascratch/ui@workspace:^, dexie@^4, dexie-react-hooks@^4.4.0 (+37 more)

### Community 82 - "ServerConnection"
Cohesion: 0.06
Nodes (7): ServerAccessService, ServerAccountService, .isServerBacked, .unsentChanges, ServerConnection, ServerSharingService, os

### Community 83 - "CoreEditorDocument"
Cohesion: 0.06
Nodes (13): CoreEditorDocument, .blocks, .canRedo, .canUndo, .coreOrigin, .isReadOnly, .strokes, .style (+5 more)

### Community 84 - "LocalStore (2)"
Cohesion: 0.09
Nodes (36): N, UPDATES_PER_NOTE, Drizzle schema and SQL migrations (drizzle-kit db:generate, DB_MIGRATE_ON_START; 0001 = Row-Level Security + file cleanup trigger), runMigrations(), AD, seal(), agentsPlugin, createAgentsContext() (+28 more)

### Community 85 - "SidebarView"
Cohesion: 0.06
Nodes (30): AllTagsSheet, SidebarCollapse, .folded, SidebarMoreRow, .body, SidebarSectionHeader, .body, TagTreeRow (+22 more)

### Community 86 - "tn (3)"
Cohesion: 0.06
Nodes (65): acquireParserWorker(), ACTION(), after(), assign(), assignWithoutOverride(), before(), BG(), callFunction() (+57 more)

### Community 87 - "0048-isolated-spaces.md"
Cohesion: 0.09
Nodes (37): «Искать в этом списке» (ListFilter): filters current list by title and text (indexer.matching + MiniSearch); «/» or ⌘F focus, Esc clears; list-filter.spec, «Переместить в пространство…» — explicit cross-space move (note: space → notebook → folder; notebook: space), Spaces fully isolated on web (D-48): spaceOfNote, starredInSpace, tabsInSpace, activeTabBySpace, dailyNotebookBySpace, migrateSpaceSettings, 2. Документ `account`, Document account: meta, spaces, notebooks, settings, starred, tabs (master key), Account starred (note|folder|notebook) and open tabs; settings.activeTab, settings.activeTabBySpace { spaceId: noteId } — active tab per space (D-48), settings.dailyNotebookBySpace { spaceId: notebookId } — daily notes and Inbox notebook per space (D-48) (+29 more)

### Community 88 - "DSTintToken"
Cohesion: 0.03
Nodes (56): .background, .foreground, .localizedName, .emptyState, Tint, blue, gray, green (+48 more)

### Community 89 - "CoreLibrary"
Cohesion: 0.06
Nodes (13): CarriedNotebook, CoreLibrary, .knownNoteIds, .lockedNotebookIds, .needsCarriedMerge, .notebooksWithoutKey, .pendingMoves, .remote (+5 more)

### Community 90 - "02-platforms.md"
Cohesion: 0.04
Nodes (74): apps/ios — iPhone + iPad, DSCore package (data: Yrs documents, GRDB LocalStore, KeyRing, AccountService, SyncEngine, APIClient), Server connection via DSCore (AccountService, SyncEngine, APIClient) — next step, DSDesign package (colors, tints, DSDateChip, DSTaskCheckbox, DSShowcase in debug), DSEditor package (EditorView, TextKit 2 + live stroke, DSEditorCore), Finger drawing (D-06): in Text mode finger scrolls/selects; draws with pen tool + flag; flag on by default on iPhone, off on iPad, scripts/generate.sh (generates Datascratch.xcodeproj, attaches existing local packages from Packages/), scripts/generate.sh (attaches existing local packages) (+66 more)

### Community 91 - "cn"
Cohesion: 0.05
Nodes (124): NotSent(), SyncIndicator(), useSyncStatus, ButtonProps, Ctx, Drop, Popover(), queue (+116 more)

### Community 92 - "AppModel"
Cohesion: 0.04
Nodes (33): AppCommands, .body, AppModel, .isRecoveryKeyConfirmed, .phase, LaunchOptions, Phase, onboarding (+25 more)

### Community 93 - "MarkSet"
Cohesion: 0.05
Nodes (23): AttributedRenderer, MarksBox, .hash, JSONValue, array, bool, .boolValue, .isNull (+15 more)

### Community 94 - "schema/index.ts"
Cohesion: 0.05
Nodes (63): CalloutTone, CoreOptions, HostRef, Callout, CALLOUT_TONES, Commands, Drawing, DRAWING_REFERENCE_WIDTH (+55 more)

### Community 95 - "shared.ts"
Cohesion: 0.07
Nodes (55): getSodium(), api, agentTokensApi, docsApi, noAuth, notebooksModeApi, opBodies, deviceName() (+47 more)

### Community 96 - ".dismiss"
Cohesion: 0.04
Nodes (43): Haptics, CommandPaletteView, .body, .documents, .ranked, FuzzyMatch, Kind, command (+35 more)

### Community 97 - "Block schema: doc = title block+ (paragraph, heading, lists, taskList, blockquote, callout, codeBlock, mathBlock, mermaid, table, image, file, drawing, pageCard)"
Cohesion: 0.10
Nodes (34): DSInlineChip ([[links]] and #tags chips in text), Agent Markdown dialect (read_note / write): tasks ⏳/📅, callouts, $$, mermaid, [[ ]], #tags, attachment:<id>, Obsidian/GitHub callout names mapped to nearest scheme tone (tip/check→success, important/todo→info, caution→warning, error/bug→danger, else note), Line break inside paragraph kept as hardBreak; read_note writes \ + newline (with > prefix / indent in quotes and lists), Agent-written [[Title]] / [text](note:<noteId>) become noteLink when accessible, MCP tool get_backlinks (GET /v1/agent/notes/:noteId/backlinks, read), MCP tool list_tasks (GET /v1/agent/tasks, read), MCP tool update_task (PATCH /v1/agent/tasks/:taskId, read_write) (+26 more)

### Community 98 - "DemoModel"
Cohesion: 0.05
Nodes (27): DemoImages, DemoModel, .fileURL, .style, DemoView, .body, .content, .editorAndPalette (+19 more)

### Community 99 - "Gi"
Cohesion: 0.04
Nodes (60): addEntry(), Ane(), buildDocuments(), cancelWrite(), cne(), computeExports(), computeExportsForNode(), computeLocalScopes() (+52 more)

### Community 100 - "DSMotionToken (2)"
Cohesion: 0.07
Nodes (23): YMap, T, YMap, expectSynced(), extendedScreens(), isExtended(), newDoc(), PASSWORD (+15 more)

### Community 101 - "CaseIterable"
Cohesion: 0.02
Nodes (81): Appearance, dark, .id, light, system, AppSettings, .appearance, .colorScheme (+73 more)

### Community 102 - "Gi (2) (2) (2) (2) (2) (2)"
Cohesion: 0.08
Nodes (34): bl(), build(), c3(), calculateHorizontalSpace(), calculateSpace(), calculateSpaceIfDrawnHorizontally(), calculateSpaceIfDrawnVertical(), calculateVerticalSpace() (+26 more)

### Community 103 - "auth.ts (2)"
Cohesion: 0.05
Nodes (77): buildApp(), BuildOptions, codeForStatus(), bearer(), deviceActive(), readCookie(), requireUser(), requireUserOrGuest() (+69 more)

### Community 104 - "cn (2)"
Cohesion: 0.08
Nodes (39): _5(), am(), arc(), C5(), C9(), cAe(), circle(), curve() (+31 more)

### Community 105 - "memory-check.ts"
Cohesion: 0.05
Nodes (29): device(), client, docs, done, hub, ids, key, LATENCY (+21 more)

### Community 106 - "SyncClient (3)"
Cohesion: 0.11
Nodes (3): keyFor returns null → document paused (no skip, cursor kept); keyAvailable(docId) resumes; key_missing >30 s does not hold indicator; retrySkipped after key change, SyncClient, OutboxItem

### Community 107 - "ref_react"
Cohesion: 0.02
Nodes (159): backdropNames, colorNames, highlightNames, inkNames, tintNames, tokens, Provider(), Avatar() (+151 more)

### Community 108 - "AccountService (2)"
Cohesion: 0.08
Nodes (18): check_text_range(), decoding(), diff_update(), merge_updates(), mismatch(), missing_map(), nested_map(), ResolvedIndex (+10 more)

### Community 109 - "AppShell.tsx"
Cohesion: 0.07
Nodes (51): syncRecoveryFlag(), consumeFreshAccount(), useIndexVersion, rememberNoteKey(), hasRuntime(), activeTabOf(), bootstrapAccount(), createNote() (+43 more)

### Community 110 - "shared/README.md"
Cohesion: 0.09
Nodes (44): Толщина: width × f(pressure) × масштаб; f(p) = 0.35 + 0.65·p^0.8, applyBlockOperations (block ops for agents), @datascratch/shared/contracts (types, zod schemas), @datascratch/shared/contracts (types and zod schemas, parseClientMessage/parseServerMessage), createAccountKeys / rekeyPassword, @datascratch/shared/crypto (libsodium, Argon2id, envelope v1), crypto.md contract, @datascratch/shared/crypto (libsodium, Argon2id, envelope v1, recovery key DS1-, 1 MiB chunks, share links) (+36 more)

### Community 111 - "AppModel"
Cohesion: 0.05
Nodes (33): .pendingRecoveryKey, .savedRecoveryKey, .body, .signedOutEmail, Account, AccountError, accountExists, .errorDescription (+25 more)

### Community 112 - "paste.spec.tsx"
Cohesion: 0.04
Nodes (30): AGENT, buildAgentNote(), el(), EXISTING_NOTE_ID, FLOWCHART, para(), SEQUENCE, text() (+22 more)

### Community 113 - "11-nfr.md"
Cohesion: 0.07
Nodes (47): Localization: English keys in code, translations in scripts/l10n/ru.json, build_catalog.py (--check) rebuilds Localizable.xcstrings, Строки интерфейса, 6. Модель данных и сервер, Self-hosting, Автоматическое развёртывание (`infra/DEPLOY.md`), Агенты (D-30), Адрес сервера в клиентах (D-49), Вход и сессии (D-34, `contracts/crypto.md`) (+39 more)

### Community 114 - "EditorCommands (2)"
Cohesion: 0.08
Nodes (14): CalloutInfo, ListMarker, bullet, ordered, task, ParagraphContext, ProjectedParagraph, Projection (+6 more)

### Community 115 - "DocumentCollectionView (2) (2) (2) (2)"
Cohesion: 0.07
Nodes (31): .body, DocumentActions, DocumentCard, .body, .designSystemCard, DocumentCollectionView, .canCreate, .emptyState (+23 more)

### Community 116 - "infra/README.md"
Cohesion: 0.08
Nodes (43): VPS Hosting (Hetzner or similar), R-11 Single VPS Is a Single Point of Failure, backup.sh script, backup.sh / restore.sh with rclone off-site copy, backup.sh / restore.sh, Caddy — automatic HTTPS certificate (Caddyfile, https profile), D-40 one-command deployment, docker compose up -d (D-40): server + PostgreSQL, attachments in disk volume or S3; optional Caddy for HTTPS (profile https) (+35 more)

### Community 117 - "LibraryUITests"
Cohesion: 0.06
Nodes (5): BareEditorProbeTests, AppearanceUITests, LibraryUITests, OnboardingUITests, EditorDemoUITests

### Community 118 - "Stroke (2)"
Cohesion: 0.06
Nodes (28): Author, .value, Kind, agent, guest, user, ResolvedStrokeSegment, .fields (+20 more)

### Community 119 - "DSCore (2)"
Cohesion: 0.06
Nodes (44): AccountService, APIClient (REST), AttachmentManager, spec/11 benchmarks (BenchmarkTests), Block / Inline / Mark, CRDTDocument, DSCore, DSCrypto / KeyRing / KeychainSecretStore (+36 more)

### Community 120 - "store.ts (2)"
Cohesion: 0.08
Nodes (36): AnchorSnapshot, isStructural(), isStructuralStep(), locate(), mappingOf(), Pending, Reanchor, reanchorAfterEdit() (+28 more)

### Community 121 - "Equatable (2)"
Cohesion: 0.15
Nodes (5): AttachmentRecord, .missingChunks, .uploaded, LocalStore, SearchHit

### Community 122 - "open-questions.md (2)"
Cohesion: 0.04
Nodes (47): Missing Compliance (Encryption Export Question), Совместная работа по аккаунтам — проект, Account-based collaboration draft (roles, groups, invites, AI policy, 15 questions), Ответ о шифровании для App Store (ITSAppUsesNonExemptEncryption), App Store encryption export answer (ITSAppUsesNonExemptEncryption), Вход, гости, хостинг — закрыто, Уплотнение истории R-05 — закрыто, iOS 26+, XcodeGen, Bundle ID — закрыто (+39 more)

### Community 123 - "Server PostgreSQL Schema"
Cohesion: 0.07
Nodes (42): AgentPrincipal, agents.authenticate(token) -> AgentPrincipal, agents.withScope(principal, fn): transaction under ds_agent with RLS, AgentScope, Server plugin interface (ServerPlugin) for optional package @datascratch/agents, loaded at startup if present, PluginHost (apiVersion, log, config, db, pool, jobs, crypto, agents), Режим «для агентов»: клиент передаёт notebookKey по TLS, сервер оборачивает его serverKey; расшифровка только при запросе агента с токеном, serverKey — 32 байта из DS_KMS_KEY (окружение сервера, не в базе) (+34 more)

### Community 124 - "DSLanguage"
Cohesion: 0.06
Nodes (39): api/bodies.json — valid/invalid REST bodies per schema, Canonical note content JSON: null attrs not stored, marks as formatting attributes (name--hash for overlapping), inline nodes as XmlElements, docs/architecture/contracts/, docs/architecture/contracts/README.md (coordinator), crypto/attachment.json vector, crypto/envelope.json vector, crypto/kdf.json vector, crypto/key-wraps.json vector (+31 more)

### Community 125 - "Equatable"
Cohesion: 0.12
Nodes (11): BlockAnchorBuilder, CharacterHit, GlyphPlacement, InkSample, LivingStrokeResolver, ResolvedInkPoint, TextAnchorBuilder, StrokeCodecError (+3 more)

### Community 126 - "Contract: AI agents API — MCP, REST, OAuth (v1) (2)"
Cohesion: 0.09
Nodes (45): 10. Решённые вопросы стыков, 2.1. Токены, 2. Доступ, 5.1. Папки и перенос заметок, 5. Правки агента (D-10), 7. Журнал и лимиты, 8. `/v1/agent-tokens` (уточнение `api.md`), 9. Контекст плагина (интерфейс с сервером) (+37 more)

### Community 127 - "caddy"
Cohesion: 0.04
Nodes (46): context, dockerfile, depends_on, environment, image, ports, profiles, restart (+38 more)

### Community 128 - "FlakyTransport"
Cohesion: 0.06
Nodes (15): URLSession, DSNetwork, RequestMetrics, .requestStarted, TransportFailure, .description, URLSessionTransport, URLSessionWebSocketFactory (+7 more)

### Community 129 - "HTMLNode"
Cohesion: 0.12
Nodes (9): .source, Array, HTMLImport, HTMLMapper, HTMLNode, .isText, .style, .textContent (+1 more)

### Community 130 - "world.ts"
Cohesion: 0.04
Nodes (71): aD(), af(), Ai(), aie(), bMe(), br(), buildDuplicateFoundError(), buildEmptyRepetitionError() (+63 more)

### Community 131 - "RecoveryKey (2)"
Cohesion: 0.06
Nodes (45): BBe(), checkIsTarget(), e0(), fR(), Iae(), oBe(), pBe(), startWalking() (+37 more)

### Community 132 - "Contract: AI agents API — MCP, REST, OAuth (v1) (3)"
Cohesion: 0.07
Nodes (39): 3. Инструменты MCP и REST, add_comment, create_note, Agent error format: MCP isError '<code>: <message>'; REST { error: { code, message } } (api.md codes), Folders and note moves (Folder records in notebook index), get_backlinks, get_handwriting_image, list_notebooks (+31 more)

### Community 133 - "0018-monetization.md"
Cohesion: 0.05
Nodes (38): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты, Решение (+30 more)

### Community 134 - "JSONValue (2) (2)"
Cohesion: 0.07
Nodes (36): bK(), Cd(), CQ(), cze(), eK(), eQ(), Fh(), fK() (+28 more)

### Community 135 - "05-organization-design.md"
Cohesion: 0.06
Nodes (44): newDocTarget(pathname): open notebook/folder, else last used notebook in this space (lib/lastNotebook.ts), else first; tag list applies tag, Split sidebar button «Новый документ» + «в «Ии» ▾» chooser; same rule for ⌥N, ⌘K and «Все документы»; new-doc-target.spec, Organization Hierarchy (Account/Space/Notebook/Folder/Note), Projects, personal, work, study not mixed; minimum buttons on screen, D-14. Организация: богатая, но не перегруженная, Proposed structure: spaces → nested folders; cross-cutting nested/smart tags, colours, icons, favourites, recents, Решение, D-36. Структура: пространство → блокноты → папки (+36 more)

### Community 136 - "DSLanguage (2)"
Cohesion: 0.12
Nodes (4): .dsState, SyncCenter, .isLocalOnly, SyncCenterTests

### Community 137 - "CodingKeys (3) (2)"
Cohesion: 0.18
Nodes (4): SyncConnection, SyncError, b64Size(), SyncErrorCode

### Community 138 - "CoverImages"
Cohesion: 0.05
Nodes (16): Added, AddedImage, CoverAttachmentRemote, CoverError, .errorDescription, notAnImage, CoverImages, CoreLibrarySafetyTests (+8 more)

### Community 139 - "lib.rs"
Cohesion: 0.07
Nodes (18): DeepObserver, UpdateObserver, is_inside(), ORIGIN_LOCAL, origin_name(), ORIGIN_UNDO, RootDef, RootKind (+10 more)

### Community 140 - "Block (2)"
Cohesion: 0.12
Nodes (42): alternative(), assertion(), atom(), atomEscape(), characterClass(), characterClassEscape(), classAtom(), classEscape() (+34 more)

### Community 141 - "Server implementation rules (apps/server, ПРЕДЛОЖЕНО)"
Cohesion: 0.04
Nodes (48): Account and devices endpoints (/me, /devices, DELETE /me), Attachments endpoints (chunked upload, resume, 200 MB limit), Auth endpoints (prelogin, signup, login, refresh, logout, recovery, password), POST /auth/recovery-key — new recovery key, old stops working, pending recoveries cancelled, Bearer accessToken 15 min + rotating refreshToken 30 days; reuse = theft, device revoked, POST /fetch-image { url } → image bytes (D-52), fetch-image errors: 422 blocked/not_image/too_large/timeout/unreachable; 429 rate or concurrency; Content-Type from signature, Note move PATCH /docs/:id { notebookId } — rewrap noteKey, rights follow note (+40 more)

### Community 142 - "CRDTDocument"
Cohesion: 0.07
Nodes (8): CRDTDocument, .canRedo, .canUndo, .clientId, UpdateHandler, CRDTDocumentTests, Fixture, YrsFFI

### Community 143 - "graphify_docs.py"
Cohesion: 0.20
Nodes (8): literals(), main(), finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 144 - "DbOrTx"
Cohesion: 0.06
Nodes (26): Server makes snapshots itself every 500 updates / 1 MB for agent edits (it knows the key), DbOrTx, docSnapshots, docUpdates, check(), config, database, fingerprint() (+18 more)

### Community 145 - "D-51: minimalism (KISS) — notes only by default; tasks, calendar, tabs in «extended mode» (РЕШЕНО, 2026-10-26)"
Cohesion: 0.06
Nodes (30): e2e projects: desktop (minimal dist, minimal.spec) and extended (dist-ext, port 4174: tasks.spec, tabs.spec, isExtended() branches); real-server e2e minimal only, Web minimal mode and «расширенный режим» (D-51): notes only by default; tasks, calendar/daily notes, tabs only in extended mode, Pre-D-51 §12.6 tabs work preserved in branch claude/web-app-tabs-extended, Inline checklists stay; minimal build task dates are inert labels (EditorHost.taskDates: "inert"), VITE_DS_EXTENDED_MODE=1 — build-time flag, read only in src/lib/features.ts (extendedMode, features.tasks/calendar/tabs), extendedMode, D-15. Дизайн — основная концепция продукта, Последствия (+22 more)

### Community 146 - "specs/helpers.ts"
Cohesion: 0.08
Nodes (29): ArrayDelta, Delete, Insert, Retain, convert(), path(), sorted_keys(), text_delta() (+21 more)

### Community 147 - "Компоненты"
Cohesion: 0.05
Nodes (40): Button / IconButton / Kbd, Button, IconButton, Kbd, ColorPanel, ColorPicker, CommandPalette (cmdk, ⌘K), ContextMenu / DropdownMenu (строка: иконка | подпись | правый слот), @datascratch/ui — «Тихая бумага» web components (React 19 + Radix + Tailwind v4 + Motion + Lucide), DateChip / DatePicker / Calendar (+32 more)

### Community 148 - "devDependencies"
Cohesion: 0.07
Nodes (41): devDependencies, @axe-core/playwright@^4, jsdom@^30.1.3, @playwright/test@1.63.0, tailwindcss@^4, @tailwindcss/vite@^4, @testing-library/dom@^10.4.2, @testing-library/react@^16.3.3 (+33 more)

### Community 149 - "Block"
Cohesion: 0.06
Nodes (24): Array, .attributes, Block, .blockId, .isKnown, .isTextBlock, .text, .xml (+16 more)

### Community 150 - "TransactionOrigin (2)"
Cohesion: 0.14
Nodes (5): .accessExpiry, .date, DSDate, EntityID, UtilTests

### Community 151 - "InkCanvas"
Cohesion: 0.10
Nodes (8): InkCanvas, PaperView, .paper, .phase, .pitch, .ruleLift, RenderedStroke, QuartzCore

### Community 152 - "TextGeometry"
Cohesion: 0.13
Nodes (5): TextGeometry, .columnFrame, .contentManager, .layoutManager, .origin

### Community 153 - "DSBackdrop (2)"
Cohesion: 0.06
Nodes (38): concurrency, cancel-in-progress, group, run, CI, jobs, test, webkit-paper (+30 more)

### Community 154 - "test-vectors/package.json"
Cohesion: 0.16
Nodes (11): Container, container(), Element, Fragment, element(), index_paths(), insert_chunks(), insert_nodes() (+3 more)

### Community 155 - "Theme"
Cohesion: 0.07
Nodes (24): Backdrop, .colors, .gradient, Color, Palette, .accent, .canvas, .danger (+16 more)

### Community 156 - "BlockLayoutFragment"
Cohesion: 0.08
Nodes (10): ParagraphDecoration, .taskState, BlockLayoutFragment, .calloutGeometry, .containerWidth, .decoration, .renderingSurfaceBounds, .textBounds (+2 more)

### Community 157 - "0038-design-quiet-paper.md"
Cohesion: 0.08
Nodes (35): Design references: Things 3, Linear, Craft, Arc, Ориентир Craft: градиентные подложки, документы-карточки с обложками, боковая панель «Вкладки / Избранное / Папки / Теги», стеклянные панели, контекстные меню, Craft as main visual reference (gradient backdrops, doc cards with covers, sidebar Tabs/Favourites/Folders/Tags, glass floating panels, context menus), D-38 Design direction Quiet Paper, D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Design tokens contract (design-tokens.md), Rejected: graphite dark by default (ink on dark reads worse), Not chosen: clean neutral (Linear/Things) (+27 more)

### Community 158 - "BlockRow (2)"
Cohesion: 0.07
Nodes (31): devDependencies, eslint@^9.39.0, eslint-config-prettier@^10.1.0, @eslint/js@^9.39.0, globals@^16.4.0, prettier@^3.6.0, turbo@^2.5.0, typescript@^5.9.0 (+23 more)

### Community 159 - "world.ts (2)"
Cohesion: 0.13
Nodes (28): makeNotebookDoc(), createInMemoryContext(), roundTrip(), strip(), authorize(), consent(), folders(), setup() (+20 more)

### Community 160 - "DSLanguage (2)"
Cohesion: 0.08
Nodes (18): DateChipPreview, .body, DSDateChip, .body, .color, .model, DSDateChipModel, Tone (+10 more)

### Community 161 - "DSPenColorFamily"
Cohesion: 0.09
Nodes (10): Coordinator, DSPenColorFamily, highlight, ink, DSRecentPenColors, DSSystemColorPicker, .hex, .tokenValue (+2 more)

### Community 162 - "0045-agent-created-notes.md"
Cohesion: 0.07
Nodes (38): «Создано агентом {agentName}» strip (D-45): createdByAgent, onAcknowledgeAgentCreated; «Понятно» nulls it in notebook index; agent-created.spec.ts, New note: context.data.createNoteDoc → content without agentEdit marks → NoteMeta.createdByAgent (D-45), MCP tool read_note (GET /v1/agent/notes/:noteId, read), NoteMeta.createdByAgent { agentId, agentName, at } | null (D-45) — «Создано агентом» strip, «Понятно» sets null, Handwriting anchors as CRDT relative positions (not broken by agent edits), D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Rejected option: agent suggestions awaiting user approval, Рассмотренные варианты (+30 more)

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

### Community 168 - "shared/src/ids.ts"
Cohesion: 0.11
Nodes (27): RFC-9562, UUID_V7_REGEX, toHex(), guestDeviceId(), isUuidV7(), random(), uuidv7FromParts(), uuidv7Timestamp() (+19 more)

### Community 169 - "YValue"
Cohesion: 0.08
Nodes (15): XmlNode, .attributes, .children, .elementName, .textContent, YValue, .boolValue, .dataValue (+7 more)

### Community 170 - "DSTaskState (2)"
Cohesion: 0.20
Nodes (10): DSPenNib, .body, .eraser, .highlighter, .lasso, .marker, .pen, .pencil (+2 more)

### Community 171 - "UIKit (3)"
Cohesion: 0.11
Nodes (4): MermaidBlockView, Key, MermaidRenderer, WebKit

### Community 172 - "WidthPoint"
Cohesion: 0.15
Nodes (4): InkOutline, WidthPoint, LiveInkOutline, LiveInkOutlineTests

### Community 173 - ".body"
Cohesion: 0.08
Nodes (23): .body, CalendarView, DailyNoteCard, .body, DayCell, .body, DayStrip, .body (+15 more)

### Community 174 - "Contract: AI agents API — MCP, REST, OAuth (v1)"
Cohesion: 0.13
Nodes (15): «Could not fetch the client metadata document… timeout» → OAUTH_CLIENT_METADATA_DOCUMENTS=false, Guide: how to connect Claude or ChatGPT to Datascratch, Connect ChatGPT (developer mode connector, OAuth), Connect Claude (custom connector, claude mcp add), Step 1: enable agent mode on notebook, OAUTH_CLIENT_METADATA_DOCUMENTS=false, Static token dsa_… for agents without OAuth / scripts, «Too many requests» — 120 requests/minute limit, agent retries (+7 more)

### Community 175 - "env"
Cohesion: 0.07
Nodes (31): run, BUILD_NUMBER, CERT_P12, CERT_PASSWORD, DS_SERVER_URL, DS_WEB_HOST, ISSUER_ID, KEY_ID (+23 more)

### Community 176 - "NoteBlock (3)"
Cohesion: 0.08
Nodes (18): BlockRow, .body, .bodyFont, .font, .leading, .placeholder, .textColor, .topPadding (+10 more)

### Community 177 - "StrokeVectorTests"
Cohesion: 0.08
Nodes (9): InkWidth, StrokePoint, .anchorIndex, StrokePointCodec, InkWidthTests, StrokeCodecTests, StrokeVectorTests, Vectors (+1 more)

### Community 178 - "guest.ts"
Cohesion: 0.10
Nodes (15): sharesApi, APP_VERSION, syncUrl(), GuestSession, receivePresence(), sodiumReady(), createSyncStatusStore(), SyncFailure (+7 more)

### Community 179 - "Foundation"
Cohesion: 0.05
Nodes (20): NoteBodyCodec, AccountError, missingKey, notSignedIn, ShareLink, .url, ShareLinkTests, StrokeMaintenanceTests (+12 more)

### Community 180 - "ii"
Cohesion: 0.15
Nodes (14): A7(), D7(), f7(), G7(), e(), hy(), I7(), ii() (+6 more)

### Community 181 - "scripts/generate.mjs"
Cohesion: 0.05
Nodes (53): doc, s1, update, aue(), desktop, D-39. Разработка параллельными сессиями; Claude сам вливает в main, Контекст, Последствия (+45 more)

### Community 182 - "ii (2)"
Cohesion: 0.16
Nodes (12): AccessService, AgentAuditEntry, .id, AgentPermission, read, readWrite, AgentToken, Device (+4 more)

### Community 183 - "DexieSyncStorage"
Cohesion: 0.12
Nodes (4): DexieSyncStorage, DocEntry, DocSyncState, SyncStorage

### Community 184 - "TaskEntry"
Cohesion: 0.11
Nodes (13): Bucket, all, .id, inbox, today, upcoming, .taskEntries, TaskEntry (+5 more)

### Community 185 - "Phase"
Cohesion: 0.12
Nodes (13): Phase, failed, localOnly, notSent, offline, sessionEnded, syncing, upToDate (+5 more)

### Community 186 - "ref_react (2)"
Cohesion: 0.09
Nodes (17): map_to_attrs(), value_to_any(), value_to_in(), YValue, BigInt, Bool, Bytes, List (+9 more)

### Community 187 - "EditorTextView"
Cohesion: 0.14
Nodes (7): DictationPlaceholder, EditorTextView, .bounds, .editorTap, .insertDictationResultPlaceholder, .pasteboardIsImages, .undoManager

### Community 188 - "CaseIterable (2) (2)"
Cohesion: 0.07
Nodes (27): InkPaint, InkToolState, .allowsFingerDrawing, .currentPaint, .mode, .paints, PenMode, .capturesPen (+19 more)

### Community 189 - "document/blocks.ts (2)"
Cohesion: 0.12
Nodes (29): _2e(), A1(), A2e(), B2e(), cl(), D2e(), DS(), F2e() (+21 more)

### Community 190 - "server/src/context.ts"
Cohesion: 0.05
Nodes (27): Server source layout (index, config, app, context, db, routes, sync, services, storage, jobs, plugins, drizzle), base64urlKey, bool, Config, ConfigSchema, loadConfig(), createContext(), createDatabase() (+19 more)

### Community 191 - "schema.ts (2)"
Cohesion: 0.09
Nodes (27): Db, agentAudit, agentGrants, agentPermission, attachments, bytea, devices, docKind (+19 more)

### Community 192 - "0011-handwriting-for-agents.md"
Cohesion: 0.19
Nodes (15): 4. Markdown для агента (`read_note`), 6. Рендер рукописи в PNG, Agent Markdown dialect (read_note output), Block markers <!-- block:<blockId> --> (tasks: task:<taskId>), Callout tone mapping (Obsidian/GitHub -> note/info/success/warning/danger), D-11 decision/requirement ref, D-35 decision/requirement ref, Handwriting rendering in Markdown (D-11) — ![✍️ ...](handwriting:<id>) (+7 more)

### Community 193 - "dj"
Cohesion: 0.13
Nodes (18): Bj(), dj(), E9(), F9(), fj(), g9(), getMaxDimension(), gj() (+10 more)

### Community 194 - "ui/package.json"
Cohesion: 0.09
Nodes (28): dependencies, clsx@^2.1.1, cmdk@^1.1.1, @datascratch/design-tokens@workspace:*, @fontsource-variable/inter@^5.3.0, @fontsource-variable/jetbrains-mono@^5.3.0, @fontsource-variable/source-serif-4@^5, lucide-react@^1.61.0 (+20 more)

### Community 195 - "schema/index.ts (2)"
Cohesion: 0.12
Nodes (22): uploadFiles(), BlockId, blockIdPluginKey, findIdFixes(), hasAttr(), stripIds(), UNIQUE_ATTRS, dataUrlToFile() (+14 more)

### Community 196 - "Images and files in a note: «/» → «Картинка»/«Файл», paste, drag; image/file blocks; EditorHost.uploadAttachment encrypts in 1 MiB chunks (storeAttachment), resolveAttachment → blob:; works in minimal build (D-51)"
Cohesion: 0.11
Nodes (17): EditorHost (src/editor/hosts.ts) passed to DatascratchEditor: attachments, [[ ]] links, cards, tags, task actions, e2e images.spec: slash menu picture, paste, second device decrypts and shows both; top-bar button inserts two images, not into title, visible on phone, Images and files in a note: «/» → «Картинка»/«Файл», paste, drag; image/file blocks; EditorHost.uploadAttachment encrypts in 1 MiB chunks (storeAttachment), resolveAttachment → blob:; works in minimal build (D-51), Menu rows (renderItems): title with ellipsis and ✓ in fixed right column — MenuRow from @datascratch/ui (checked prop); menu-layout.spec, Packages of other streams: @datascratch/shared (core), web-editor (DatascratchEditor + EditorHost), ui and design-tokens, Next: images and files inside documents (attachments exist — covers; image/file blocks drawn by web-editor stream), web reminders (after MVP), «Доступные мне», Implementation: SwiftUI shell (iOS); Radix + Tailwind + Motion (web), @datascratch/ui — веб-компоненты «Тихая бумага» (+9 more)

### Community 197 - "CodingKeys"
Cohesion: 0.04
Nodes (62): ClientInfo, ClientMessage, awareness, hello, push, snapshot, subscribe, unsubscribe (+54 more)

### Community 198 - "server.mjs"
Cohesion: 0.10
Nodes (22): attAccess(), authed(), b64u(), clients, cors, db, err(), heldDocs (+14 more)

### Community 199 - "iOS checks and TestFlight builds (D-46): macOS runners ios-app/ios-editor/ios-core/design; ios-app ~25 min, ios-release ~30 min, Apple 5-30 min"
Cohesion: 0.04
Nodes (53): GitHub Actions builds iOS and runs tests on macOS runner on every push, D-46. Ускорение проверок iOS: без повторов на main и быстрый набор перед сборкой, Full UI suite failure after the build -> fix in next build, user informed, gate step (Linux) skips macOS jobs on main if same files already passed (.github/scripts/already-tested.sh), Rejected option: paid faster GitHub runners (cost; user has not chosen), Not chosen: paid fast GitHub runners (cost), UI tests (smoke — release gate): SMOKE_UI_TESTS; tools/ci/wait-release-gate.sh starts TestFlight before full set, Rejected option: change nothing (max checks before build, slow) (+45 more)

### Community 200 - "D-44 iPad columns: sidebar controlled only by its own button (РЕШЕНО; three-panel layout superseded by D-47)"
Cohesion: 0.13
Nodes (15): Close document (×) removes only the document; list/tasks/calendar fills workspace, D-44. Колонки на iPad: сайдбар управляется только своей кнопкой, «На весь экран» — only mode hiding sidebar and neighbour; exit restores previous layout, iPhone and narrow window: stack of screens, Narrow workspace (< 640 pt): document shown alone, sidebar untouched, Superseded rule: sidebar hides when a document opens, Three panels: Sidebar | List | Document (sidebar + workspace), Behaviour verified by UI tests in portrait and landscape (+7 more)

### Community 201 - "TagNode"
Cohesion: 0.15
Nodes (6): .body, .tagTree, SidebarLimit, TagNode, .id, SidebarTests

### Community 202 - "in-memory.ts"
Cohesion: 0.22
Nodes (6): AgentScope (listNotebooks, docKey, readDoc, applyUpdate, createNoteDoc, attachments, audit, tx), Tx, withAgentScope(), BoundedMap, PgAgentDataSource, readWrappedKey()

### Community 203 - "image-fetch.ts"
Cohesion: 0.13
Nodes (13): FetchedImage, FetchImageError, FetchImageFailure, ImageFetcher, ImageFetcherOptions, isPublicAddress(), REDIRECTS, sniffImage() (+5 more)

### Community 204 - "TabStrip — tabs of current space as a strip above the screen (outside <main>, nav with links and aria-current), not a sidebar section"
Cohesion: 0.05
Nodes (45): DSCard / DSDocCard (cover thumbnail only own image), Attachments in 1 MiB encrypted chunks (crypto.md §6): stored in IndexedDB first, uploaded in background; new note waits for POST /v1/docs; cover 2400 px, coverThumb 640 px, Cover — own image only (spec/12 §12.7): drag/paste/file dialog, compact header 150/190 px, DocCard asChild thumbnail (coverThumb), SpaceTile; meta.backdrop not offered, Flexible UI: sidebar hide (⌘\, inert), fullscreen per view (⌘⇧F, ds.focus.*), explicit doc tab close (× / ⌥W), transition key from resolvedLocation, Manual notebook ordering by drag-and-drop — not done yet on web, Collapsible pen palette (round button, useUi.penPaletteCollapsed, showPalette={false}); pen-palette.spec.ts, Pinned tabs — left, icon only, survive middle click and «Закрыть остальные»; openedAt written at most hourly (openTab), «Недавно закрытые» — per device, per space, up to 20 (lib/closedTabs.ts, localStorage in try/catch) (+37 more)

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
Cohesion: 0.13
Nodes (7): DocumentUndoManager, .canRedo, .canUndo, .groupingLevel, .isUndoRegistrationEnabled, .redoActionName, .undoActionName

### Community 209 - "asc.py"
Cohesion: 0.17
Nodes (7): b64url(), call(), check_app(), der_to_raw(), ensure_bundle_id(), prune_ci_certs(), token()

### Community 211 - "DSMotionToken"
Cohesion: 0.10
Nodes (21): Motion, .springAnimation, .body, DSSuggestionGroup, DSSuggestionItem, DSSuggestionList, .body, .isEmpty (+13 more)

### Community 212 - "YrsError (2)"
Cohesion: 0.12
Nodes (33): a_e(), aZ(), bFe(), Ci(), cm(), CZ(), e_e(), F5() (+25 more)

### Community 213 - "0043-local-library-migration.md"
Cohesion: 0.05
Nodes (33): FolderStrip: current-level folder cards above documents; breadcrumbs inside nested folder, Notebook mode switch sends serverNotebookKey, retried on network error (Safari «Load failed»), clear error, dialog stays open; notebook-keys.spec.ts, Sidebar «Блокноты» with folder tree of any depth (incl. agent-created folders), context menu, drag-and-drop; folders.spec.ts, Unreadable server items skipped: alternateKeysFor, recoverSkippedFromSnapshot, own snapshot re-upload, __dsSyncDebug(); never hold «Синхронизация…», «Часть изменений здесь пока не читается» banner (UnreadableNote), dismissible per notebook (ds.unreadableDismissed), reshown from notebook menu, SwiftUI, Альтернативы: перенос с вопросом; раздельное хранение, Решение: всё созданное до входа переносится в аккаунт автоматически и без вопроса; перенос идемпотентен (409 «уже есть» — не ошибка) (+25 more)

### Community 214 - "ios"
Cohesion: 0.08
Nodes (24): concurrency, cancel-in-progress, group, run, defaults, outputs, permissions, runs-on (+16 more)

### Community 215 - "Color"
Cohesion: 0.14
Nodes (14): Color, .dsAccent, .dsCanvas, .dsDanger, .dsElevated, .dsOnAccent, .dsPrimary, .dsSecondary (+6 more)

### Community 216 - "i18n/index.ts"
Cohesion: 0.22
Nodes (9): i18next@^26, en, Loose, keys(), Lang, setLang(), Messages, ru (+1 more)

### Community 217 - ".make (2)"
Cohesion: 0.17
Nodes (4): LatencyConnection, LatencyFactory, Library, SyncPerfTests

### Community 218 - "with"
Cohesion: 0.19
Nodes (17): arrays_and_errors(), Collect, local(), merge_and_diff_updates(), nested_maps_merge_per_field(), note_roots(), observers_report_paths_deltas_and_origins(), paragraph() (+9 more)

### Community 219 - "paper.ts"
Cohesion: 0.23
Nodes (12): alignPaper(), baselineShift(), clearPaper(), KINDS, lastKeys, measureText(), paperKey, PaperSnap (+4 more)

### Community 220 - "@datascratch/web-editor DatascratchEditor React component (state entirely in Y.Doc)"
Cohesion: 0.10
Nodes (20): New note title like Apple Notes: focusTitle(), Enter → body, empty title → defaultTitle «Заметка <дата>», empty note not saved, Block editor with Markdown shortcuts; storage = CRDT block tree, Markdown only export/agent format, Block handles by input: hover for mouse/trackpad, single quiet handle for touch, never for Apple Pencil, blockId (UUIDv7) per block node, unique taskId; ids reset on paste, @datascratch/web-editor DatascratchEditor React component (state entirely in Y.Doc), Editor UI from @datascratch/ui: PenToolbar, FormatToolbar, ColorPanel, LinkPanel, SuggestionMenu, .ds-task-check, dateLabel, document-model.md contract, EditorHost callbacks (attachments, open note, search/create notes, tags, task actions, defaultTitle, fetchRemoteImage) (+12 more)

### Community 221 - "r8"
Cohesion: 0.19
Nodes (12): b8(), bh(), d3(), gTe(), l3(), m3(), o3(), od() (+4 more)

### Community 222 - "DSBackdrop"
Cohesion: 0.08
Nodes (19): BackdropGallery, .body, DSBackdrop, .body, DSGrain, .body, GrainPattern, SplitMix64 (+11 more)

### Community 223 - "deploy.sh"
Cohesion: 0.09
Nodes (23): CFBundleURLName, CFBundleURLSchemes, properties, CADisableMinimumFrameDurationOnPhone, CFBundleDevelopmentRegion, CFBundleDisplayName, CFBundleLocalizations, CFBundleShortVersionString (+15 more)

### Community 224 - "ios (2)"
Cohesion: 0.12
Nodes (15): concurrency, group, container, runs-on, if, needs, runs-on, timeout-minutes (+7 more)

### Community 225 - "tasks.ts"
Cohesion: 0.08
Nodes (41): TaskState, acceptAll(), acceptBlock(), AgentReview, agentReviewKey, blocksWithAgentEdits(), decorations(), addDays() (+33 more)

### Community 226 - "markdown.ts"
Cohesion: 0.15
Nodes (24): Agent Markdown escaping: backslash-escaped chars are plain text; read_note escapes everything that would become markup, escapeMask(), PMMark, attr(), block(), blockBody(), CALLOUT_KIND, children() (+16 more)

### Community 227 - "DSColorToken (2)"
Cohesion: 0.16
Nodes (5): DSInlineChip, .body, DSInlineChipStyle, InlineChipsPreview, .body

### Community 228 - "AttachmentManager"
Cohesion: 0.08
Nodes (11): AttachmentError, alreadyExists, invalidDownload, invalidId, AttachmentManager, LocalStore, AccountServiceTests, FakeRESTServer (+3 more)

### Community 229 - "Как поставить Datascratch на iPad без Mac (TestFlight)"
Cohesion: 0.18
Nodes (11): Если что-то пошло не так, Запасной вариант: свой сертификат распространения, Как выпустить сборку, Как поставить Datascratch на iPad без Mac (TestFlight), Необязательные настройки, Сборка на Mac (когда он будет), Шаг 1. Узнать Team ID, Шаг 2. Зарегистрировать идентификатор приложения (+3 more)

### Community 231 - "apps/web index.html (PWA entry)"
Cohesion: 0.06
Nodes (32): apps/web index.html (PWA entry), Load watchdog script /boot-guard.js, <script src="/boot-guard.js"> in head (boot watchdog), Module entry /src/main.tsx into #root, PWA/Apple meta (theme-color #FAF8F4, apple-mobile-web-app-capable, icons), Theme bootstrap via external /theme-init.js before render, fail(), retries() (+24 more)

### Community 232 - "web/vite.config.ts"
Cohesion: 0.15
Nodes (7): vite-plugin-pwa@^1.2, contentSecurityPolicy(), securityHeaders(), SERVER_PATHS, isServer(), previewSecurityHeaders(), vite-plugin-pwa

### Community 233 - "gate"
Cohesion: 0.18
Nodes (11): defaults, run, defaults, outputs, permissions, runs-on, gate, skip (+3 more)

### Community 234 - "InkInputRecognizer"
Cohesion: 0.10
Nodes (22): defaults, run, defaults, outputs, permissions, runs-on, if, name (+14 more)

### Community 235 - "design-tokens/package.json"
Cohesion: 0.10
Nodes (21): description, devDependencies, prettier@^3.6.0, exports, ./theme.css, ./tokens.css, ./tokens.json, files (+13 more)

### Community 236 - "lo"
Cohesion: 0.27
Nodes (10): co(), jk(), lo(), nce(), qk(), qze(), toMarkdown(), toMarkdownDefault() (+2 more)

### Community 237 - "devDependencies (2)"
Cohesion: 0.09
Nodes (22): devDependencies, jsdom@^30.1.3, @ladle/react@^5.1.1, @playwright/test@1.63.0, @tailwindcss/vite@^4.3.3, @testing-library/react@^16.3.3, @testing-library/user-event@^14.6.8, @types/react@^19.3.0 (+14 more)

### Community 238 - ".content (2)"
Cohesion: 0.18
Nodes (11): AvatarPreview, .body, DSAvatar, .body, .presenceLabel, DSAvatarStack, .body, DSPresence (+3 more)

### Community 239 - "DSSkeleton"
Cohesion: 0.10
Nodes (21): ASSETCATALOG_COMPILER_APPICON_NAME, ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME, BUNDLE_LOADER, CODE_SIGN_STYLE, ENABLE_PREVIEWS, ENABLE_USER_SCRIPT_SANDBOXING, GENERATE_INFOPLIST_FILE, LOCALIZATION_PREFERS_STRING_CATALOGS (+13 more)

### Community 240 - "Contract: AI agents API — MCP, REST, OAuth (v1) (2) (2)"
Cohesion: 0.09
Nodes (35): 1. Как устроено, 2.2. OAuth 2.1 (по спецификации MCP 2026-07-28), AgentService — shared service; MCP is a thin adapter, REST calls the same functions, AgentService shared service layer, agentsPlugin (@datascratch/agents Fastify plugin), Client ID Metadata Documents (HTTPS only, public addresses, ≤ 64 KiB, 5 s, 24 h cache; public clients), OAuth consent screen — server HTML page «Тихая бумага» (no JS, CSP frame-ancestors 'none'), notebooks + rights choice, HMAC-signed state 15 min, Dynamic Client Registration RFC 7591 (kept for compatibility) (+27 more)

### Community 241 - "minisearch"
Cohesion: 0.11
Nodes (10): @datascratch/web-editor@workspace:^, minisearch@^7, @tanstack/react-virtual@^3, @tiptap/extension-collaboration@^3, @tiptap/extension-link@^3, @tiptap/extension-link, @datascratch/web-editor, minisearch (+2 more)

### Community 242 - "RecordingRemote (2)"
Cohesion: 0.19
Nodes (12): b64(), el(), empty(), fixture(), normalize(), reads_yjs_document(), roots(), s() (+4 more)

### Community 243 - "document-model.md (2)"
Cohesion: 0.14
Nodes (13): Title cannot be deleted/replaced/moved; rename via replace_text; plugin syncs NoteMeta title, tags, updatedAt, 3. Документ `notebook` (индекс блокнота), Daily notes and Inbox (kind daily / inbox) in settings.dailyNotebookId notebook, Daily notes and Inbox live in the notebook from settings.dailyNotebookBySpace, Folder { id, parentId, name, icon, color, order } — unlimited nesting, Document notebook — notebook index: meta, folders, notes (NoteMeta), tags, notebook meta copy of names (name, icon, color, space {id, name, icon}) from the account document, NoteMeta (notebook index entry: folderId, parentNoteId, title, kind, dailyDate, tags, icon, coverThumb, wrappedKey, trashedAt, order) (+5 more)

### Community 244 - "Контракт: шифрование (v1)"
Cohesion: 0.20
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 245 - "DSGlassModifier"
Cohesion: 0.18
Nodes (10): DSGlassFallbackKey, DSGlassModifier, .glass, DSGlassPanel, .body, EnvironmentValues, .dsGlassFallback, GlassPreview (+2 more)

### Community 247 - "DSFeedback"
Cohesion: 0.28
Nodes (6): DSFeedback, delete, selection, .sensoryFeedback, taskComplete, View

### Community 249 - "No reruns on main: Linux gate step skips macOS jobs when the same tracked files already passed the workflow (already-tested.sh)"
Cohesion: 0.25
Nodes (8): ios-editor run counts as passed if only the known demo-typing step failed, No reruns on main: Linux gate step skips macOS jobs when the same tracked files already passed the workflow (already-tested.sh), passed(), already-tested.sh script, GH_REPO, GH_TOKEN, KNOWN_FAILING_STEP, env

### Community 250 - "memory.bench.ts"
Cohesion: 0.22
Nodes (7): base, docs, N, now, state, stored, t

### Community 251 - "Integration/CoreLibrary.swift over DSCore: account/notebook/note documents on Yrs, LocalStore (GRDB) with send queue, KeyRing keys, notebook meta name/icon/space for agents, one-time JSON migration"
Cohesion: 0.25
Nodes (8): Datascratch/App: entry point, WindowGroup per document (multi-window, Stage Manager), menu commands and shortcuts, AppModel, SceneModel, Integration/CoreLibrary.swift over DSCore: account/notebook/note documents on Yrs, LocalStore (GRDB) with send queue, KeyRing keys, notebook meta name/icon/space for agents, one-time JSON migration, Datascratch/Features screens: sidebar, documents (cards/list), document, tasks, calendar, ⌘K palette, sharing, settings, onboarding, LibraryStore (local JSON-file storage stand-in; the screens' storage interface), Datascratch/Services: models mirroring document-model contract, LibraryStore, task index, account and recovery key, sync status, sharing and link routes, devices and agent tokens, DatascratchTests (Swift Testing) and DatascratchUITests (XCUITest), Config/*.xcconfig: version, DS_WEB_HOST, DS_SERVER_URL, DS_TEAM_ID from Local.xcconfig (Team ID not in git), Структура

### Community 252 - "DSSettingsSampleContent"
Cohesion: 0.18
Nodes (7): DSSettingsSampleContent, .account, .body, .syncedAt, DSSettingsSampleScreen, .body, SnapshotTests

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
Cohesion: 0.22
Nodes (4): LineMetrics, .midline, StrokeShapeClassifier, ShapeClassifierTests

### Community 257 - "infra/README.md (2)"
Cohesion: 0.11
Nodes (17): DS_WEB_HOST / DS_SERVER_URL build variables, Production header copy in infra/deploy/Caddyfile (unit test compares), DS_SERVER_URL для сборки iOS, Адрес сервера для iPhone и iPad, Если выкладка не удалась, Как развернуть сервер Datascratch на своём VPS без компьютера (GitHub Actions), Какие адреса в интернете нужны серверу, Память (+9 more)

### Community 258 - "edit_note atomic operations: insert, replace (keeps blockId), delete, move, replace_text"
Cohesion: 0.13
Nodes (14): agentEdit mark on text inserted into existing notes, context.data.applyUpdate with agent origin, context.data: listAgentNotebooks, loadDoc, docSeqs, applyUpdate, createNoteDoc, loadAttachmentImage, edit_note, edit_note atomic operations: insert, replace (keeps blockId), delete, move, replace_text, Decryption of 'for agents' notebook docs with KMS key (R-10), edit_note placement: list items go into a list, rows into a table; other blocks next to a list item leave the list, Row-Level Security by grantId (+6 more)

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

### Community 265 - "NoteMedia.swift"
Cohesion: 0.06
Nodes (13): ActivityView, CameraPicker, Coordinator, ImageViewer, .body, .body, NoteAttachments, NoteMedia (+5 more)

### Community 266 - "SwiftUI"
Cohesion: 0.04
Nodes (46): .bucketPicker, DSCalloutTone, .background, danger, .foreground, info, note, success (+38 more)

### Community 267 - "UIKit (2)"
Cohesion: 0.17
Nodes (4): InkBounds, MathBlockView, Metrics, SwiftMath

### Community 268 - "pages.ts (2)"
Cohesion: 0.24
Nodes (15): Consent screen notebook row: icon (emoji or bundled SVG instead of SF symbol, e.g. globe) on plate of notebook colour (meta.color, else accent), ICON_STYLE, isSymbolName(), notebookIcon(), SVG, Tint, tintOf(), ConsentNotebook (+7 more)

### Community 269 - "steps"
Cohesion: 0.16
Nodes (18): GH_REPO, GH_TOKEN, steps, steps, steps, continue-on-error, env, id (+10 more)

### Community 270 - "12.1. Задачи"
Cohesion: 0.25
Nodes (7): 12.1. Задачи, Inbox (service note of a notebook) for standalone tasks, Напоминания — после MVP, Контекстное меню задачи: перенести, дедлайн, выполнить, отменить, открыть, переместить, Задачи taskItem в любом документе (запланировано, дедлайн, выполнено/отменено), Reminders (local iOS notifications; web later) — after MVP, 12.1 Tasks: taskItem in any document, scheduled/deadline, Inbox, Tasks screen, context menu

### Community 272 - "Демо «Живой штрих» (EditorDemo)"
Cohesion: 0.29
Nodes (6): Без Mac (временный вариант), Демо «Живой штрих» (EditorDemo), Как поставить на iPad (Mac с Xcode), Профилирование, Что проверить, os_signpost profiling (subsystem com.datascratch.editor) for Instruments traces of long notes

### Community 274 - "first-sync.bench.ts"
Cohesion: 0.26
Nodes (14): EditorApi.pickImage() / insertFiles(files); PenToolbar.onInsertImage, Блок image (attachmentId, width 0..1/null, alt, caption) — модель не меняется; вложение создаётся локально до загрузки, временных id нет, Insert image/file (web): instant local preview + quiet progress ring, same blockId gets attachmentId; Повторить/Удалить on error; uploadAttachment(file,{onProgress}), Картинка вставки остаётся на своём месте, figcaption — её подпись (caption), Pasted images: data: decoded, http(s) via EditorHost.fetchRemoteImage(url) → File, else link; file:/cid: skipped, Картинки file:/cid: (локальные пути Word) при вставке пропускаются, Подпись и описание фото (caption, alt) — лист приложения «Подпись…»; «Заменить» меняет вложение; обе правки отменяются, Вставка фото после абзаца с курсором (пустой заменяется), одна правка отмены, локальное превью до загрузки (+6 more)

### Community 275 - "with (2)"
Cohesion: 0.15
Nodes (17): GH_REPO, GH_TOKEN, steps, steps, env, id, if, name (+9 more)

### Community 276 - "DSSuggestionList (2)"
Cohesion: 0.12
Nodes (17): import, types, import, types, exports, ./contracts, ./document, ./ids (+9 more)

### Community 277 - ".classify"
Cohesion: 0.12
Nodes (17): devDependencies, eslint@^9.39.0, prosemirror-model@^1.25.12, tsx@^4.20.0, @types/ws@^8.5.13, typescript@^5.9.0, vitest@^3.2.0, ws@^8.18.0 (+9 more)

### Community 279 - "steps (2)"
Cohesion: 0.15
Nodes (16): steps, GH_REPO, GH_TOKEN, steps, env, id, if, name (+8 more)

### Community 280 - "steps (3)"
Cohesion: 0.21
Nodes (16): steps, steps, steps, steps, id, if, name, run (+8 more)

### Community 281 - "compat/generate.mjs"
Cohesion: 0.15
Nodes (12): b64(), content, doc, firstRun, fixture, json, para, rel() (+4 more)

### Community 282 - "Pit"
Cohesion: 0.43
Nodes (7): Dit(), Li(), Lit(), Mit(), Oit(), Pit(), Rit()

### Community 283 - "AgentEditsBanner"
Cohesion: 0.15
Nodes (6): AgentEditsBanner, .mode, .onShowHistory, Mode, createdBy, edits

### Community 284 - "DatascratchTests"
Cohesion: 0.14
Nodes (15): targets, build, dependencies, platform, settings, sources, type, dependencies (+7 more)

### Community 285 - "D-48. Пространства полностью изолированы"
Cohesion: 0.29
Nodes (7): D-48. Пространства полностью изолированы, Данные, Детали (ПРЕДЛОЖЕНО, ждёт подтверждения), Детали (РЕШЕНО пользователем 2026-10-26), Контекст, Рассмотренные варианты, Решение

### Community 286 - "document-model.md"
Cohesion: 0.11
Nodes (34): Derived data indexer (createNoteIndexer, batches of 100, 0.4 s): tasks, noteIndex, MiniSearch; title/tags copied into NoteMeta, syncNotebookMetaCopy — notebook name/icon/colour/space copied into notebook meta (document-model §3) for server-side agents and consent screen, settings.recoveryKeyConfirmed flag in account document (reminder synced across devices; auth/recovery.ts), Recovery key flow (spec/07): copy/download/confirm last 4 chars, optional confirmation, stored only on creating device, «Создать новый ключ» with password, security log, agentEdit { agentId: grantId, at } on all text the agent inserts into an existing note; explicit marks on insert, 1. Три вида документов Yjs, 4.1. Совместимость с TipTap / y-prosemirror, 4.3. `meta` заметки (+26 more)

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

### Community 294 - "Step"
Cohesion: 0.33
Nodes (6): Step, confirmKey, recover, recoveryKey, signIn, signUp

### Community 295 - "Контракт: API для ИИ-агентов — MCP, REST, OAuth (v1) (2)"
Cohesion: 0.10
Nodes (20): YOp, ArrayDelete, ArrayInsert, MapDelete, MapSet, RootTextDelete, RootTextInsert, TextDelete (+12 more)

### Community 296 - ".content (2)"
Cohesion: 0.23
Nodes (8): DSSkeleton, .body, DSSkeletonLines, .body, DSSpinner, .body, SkeletonPreview, .body

### Community 297 - "DSDocRow (2)"
Cohesion: 0.19
Nodes (14): B_e(), F_e(), G5(), G_e(), hZ(), kv(), lZ(), oZ() (+6 more)

### Community 298 - "metrics.ts"
Cohesion: 0.19
Nodes (6): Counter, Gauge, gaugeText(), key(), Labels, Metrics

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

### Community 307 - "State"
Cohesion: 0.50
Nodes (4): State, pendingUpload, remote, synced

### Community 308 - "D-04. Одновременно сквозное шифрование и доступ по API"
Cohesion: 0.50
Nodes (4): D-04. Одновременно сквозное шифрование и доступ по API, Контекст, Последствия, Решение

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

### Community 352 - "infra/README.md (3)"
Cohesion: 0.22
Nodes (9): 1. Купить сервер, 2. Домен, 3. Подключиться и подготовить сервер, 4. Скачать проект, 5. Заполнить настройки, 6. Запустить, 7. Резервные копии каждую ночь, 8. Обновление сервера (+1 more)

### Community 353 - "deploy.yml"
Cohesion: 0.22
Nodes (9): scripts, bench, bench:memory, build, lint, test, test:memory, test:watch (+1 more)

### Community 354 - "web.yml"
Cohesion: 0.22
Nodes (8): compilerOptions, jsx, lib, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 355 - "Features"
Cohesion: 0.29
Nodes (4): Features, .calendar, .tabs, .tasks

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

### Community 377 - "Обзор архитектуры"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 378 - "Журнал изменений (newest first; date — what changed, decision refs) (2) (2)"
Cohesion: 0.29
Nodes (7): 2026-10-25, tools/graphify_docs.py (prepare / finish / label) — graph update after doc edits; git hook reacts only to code (D-29), Передаточный документ history/2026-10-25-handoff.md (устарел в части стека), 2026-10-25: stack approved (D-21), no Rust core (D-22), no Redis (D-25), no MinIO (D-26), Yrs in prototype (D-27), dev process (D-28), Graphify (D-29), PostgreSQL (D-30), Yjs (D-31), Журнал изменений, finish refuses to write graph if nodes of unchanged files disappear, Doc graph update: tools/graphify_docs.py prepare → parallel extraction agents (extraction-spec.md) → finish → export html → check-update

### Community 379 - "Одно касание: ссылки, кружки задач, чипы дат (меню переноса), VoiceOver"
Cohesion: 0.22
Nodes (11): Content: headings, lists, checklists, quotes, callouts, tables, code, formulas, attachments, drawing blocks, Dictation/IME marked text inserted at cursor; unreported field changes carried into document, Касание по блоку файла (и VoiceOver) — приложение открывает или делится файлом, Литеральный [[Название]] — показывается ссылкой, касание открывает или создаёт заметку, noteLink atom (noteId, label) shown as chip; literal [[Название]] rendered as link, tap opens/creates note, Касание по фото — увеличение (VoiceOver «Изображение», подпись alt); курсор и клавиатура не появляются, iOS single tap on link/task circle/date chip acts without cursor or keyboard; each is an accessibility element, taskDatesEnabled / EditorHost.taskDates "inert" — режим «только заметки» (+3 more)

### Community 380 - "Block editor with Markdown shortcuts; storage = CRDT block tree, Markdown only export/agent format"
Cohesion: 0.33
Nodes (6): iOS formula/Mermaid block sizing by real bounds; scroll stability after open (full layout up to 40 000 chars), iOS: UIKit + TextKit 2 (not WebView), iOS: UIKit + TextKit 2 (не WebView), Общие примеры вставки (HTML → ожидаемые блоки) переносятся в packages/test-vectors/vectors/paste/ после сборки 19, Web: TipTap (ProseMirror) + Yjs, Платформенная реализация

### Community 381 - "Contract: AI agents API — MCP, REST, OAuth (v1) (2)"
Cohesion: 0.29
Nodes (7): 9. API и внешние ИИ-агенты, Агент умеет, Безопасность, Инструменты MCP (реализовано, контракт — ЧЕРНОВИК), Подключение, Правки агента (D-10), Реализация

### Community 382 - "True"
Cohesion: 0.29
Nodes (7): paths, branches, paths, True, pull_request, push, workflow_dispatch

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
- **1645 isolated node(s):** `.body`, `onboarding`, `.phase`, `system`, `light` (+1640 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 5040 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **40 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `packages/design-tokens/tokens.json — источник значений; генерирует CSS-переменные и Swift` connect `design-tokens.md` to `CaseIterable`, `02-platforms.md`, `scripts/generate.mjs`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Are the 121 inferred relationships involving `e()` (e.g. with `_4()` and `a()`) actually correct?**
  _`e()` has 121 INFERRED edges - model-reasoned connections that need verification._
- **What connects `.body`, `onboarding`, `.phase` to the rest of the system?**
  _1645 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Data` be split into smaller, more focused modules?**
  _Cohesion score 0.0035022014905847967 - nodes in this community are weakly interconnected._
- **Why does `Чип даты (одинаково на iOS и в вебе): «Сегодня/Завтра/Вчера», день недели на 2–6 дней вперёд, иначе короткая дата; цвета danger/warning/accent/text.tertiary` connect `design-tokens.md` to `DSLanguage (2)`, `DSDesign Swift package (iOS 26, Swift 6) — «Тихая бумага» design system tokens + SwiftUI components`, `SwiftUI`, `ref_react`, `scripts/generate.mjs`, `0048-isolated-spaces.md`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `0030-server-database-postgresql.md` and `Shared for the whole account: app settings, account, keys, devices, agent grants`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Daily notes and Inbox live in the notebook from settings.dailyNotebookBySpace` and `settings.dailyNotebookBySpace { spaceId: notebookId } — daily notes and Inbox notebook per space (D-48)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._