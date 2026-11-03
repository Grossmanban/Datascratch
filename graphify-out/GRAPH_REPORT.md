# Graph Report - Datascratch  (2026-11-03)

## Corpus Check
- 1010 files · ~909,959 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 40 file(s) not represented in the graph (top: (none) 20, .css 6, .example 4)

## Summary
- 22211 nodes · 64137 edges · 457 communities (391 shown, 66 thin omitted)
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 9949 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d131dd39`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- mermaid.min.js
- cn
- 0031-crdt-yjs.md
- t
- Sendable
- contracts/api.ts
- EditorTheme
- KeyRing
- ge
- PenLayer.ts
- iOS editor and pen layer: apps/ios/Packages/DSEditor — modules DSInk, DSEditorModel (EditorDocument), DSEditor; demo com.datascratch.app.editordemo
- 0039-parallel-sessions.md
- DSRGBA
- String
- Foundation
- r
- actions.ts
- router.tsx
- plugin.ts
- crypto/keys.ts (2)
- AppModel
- CoreLibrary
- DSPenToolbar
- L9n
- .make
- ref_yjs
- decisions/README.md
- Contract: AI agents API — MCP, REST, OAuth (v1)
- D-10: agent edits applied immediately, highlighted, rolled back via version history
- contracts/document.ts
- AccountSection.tsx
- InMemoryEditorDocument
- actions.ts (2)
- EditorCommands
- View
- SyncEngine (2)
- Dr
- SyncClient
- OnboardingFlow.swift
- .content
- View (3)
- DocPage.tsx
- routes/sharing.ts
- APIClient
- SceneModel
- Stroke
- store.ts (2)
- h (2)
- agent-service.ts
- EditorTheme (2)
- DSCrypto
- toBase64Url
- Журнал решений (ADR)
- n
- CodingKeys
- LocalStore (2)
- contracts/api.ts (2)
- CodingKeys (2)
- TransactionOrigin
- CRDTDocument
- CoreEditorDocument
- web-editor/package.json
- FakeRESTServer
- contracts/api.ts (3)
- contracts/document.ts (2)
- BlockNode
- file
- 02-platforms.md
- schema/index.ts
- DSAvatar
- SyncEngine
- edits.ts
- ServerConnection
- api/client.ts
- server/README.md
- CaseIterable
- store.ts
- SidebarView
- ServerAccountSharingService
- MarkSet
- Tint
- DSTaskState
- i18n/index.ts
- Block
- DSMotionToken (2)
- in-memory.ts
- TaskRow
- DatascratchEditor
- TextDiff
- packages/test-vectors (shared test vectors)
- WebSocketConnection
- devDependencies
- agents/package.json
- iXe
- db/client.ts
- InkController
- SyncConnection
- DocumentStyle
- CoverAction
- EditorTextView
- EditorView.swift
- Jr
- Datascratch web client (apps/web)
- strokes.md
- sync/client.ts
- SceneSheet
- zn
- DSCore
- DSDesign Swift package (iOS 26, Swift 6) — «Тихая бумага» design system tokens + SwiftUI components
- CodingKeys
- SyncClient (2)
- DocumentCollectionView
- DSBackdrop
- tasks.ts
- AccountService (2)
- crypto/keys.ts (2) (2)
- AttachmentManager
- GuestPage.tsx
- ReadOnlyDocument
- .textView
- D-10: agent edits applied immediately, highlighted, rolled back via version history
- FlakyTransport
- DSSidebarItem
- scripts/generate.mjs
- DSMotionToken
- steps
- sync-protocol.md
- n (3)
- DSFormatBarElement
- .makeLibrary
- NoteBodyCodec
- DSSettingsSampleContent
- BlockStyle
- .content
- AgentAuditView
- caddy
- Popups.tsx
- Как устроено
- iOS checks and TestFlight builds (D-46): macOS runners ios-app/ios-editor/ios-core/design; ios-app ~25 min, ios-release ~30 min, Apple 5-30 min
- cu
- .parse
- DSLanguage (2) (2)
- test-vectors/package.json
- No reruns on main: Linux gate step skips macOS jobs when the same tracked files already passed the workflow (already-tested.sh)
- consume
- 07-encryption.md (2)
- GitHub Actions deploy workflow (VPS over SSH, no computer needed)
- ios-editor.yml
- CoverImages
- Projection (2)
- UIKit (3)
- Color
- Block (2)
- asc.py
- server.mjs
- 02-platforms.md (2)
- String
- tapped
- LibraryPersistence
- InkController (2)
- 07-encryption.md
- DSBackdrop (2)
- DSPenColorFamily
- clear
- .log
- .width
- LiveInkOutline
- devDependencies (2)
- engine.ts
- D-54: account sharing — notebook or note by email (simple variant)
- specs/helpers.ts
- node
- SyncClient (@datascratch/shared/sync)
- BlockRow
- build_number
- EditorHost (editor/hosts.ts)
- DS_KMS_KEY — save via ds key / ds key-saved
- Shared with me (sharedWithMe.ts, SharedWithMe.tsx)
- test-vectors/package.json (2)
- TaskEntry
- AccountService (2) (2)
- createNoteIndexer derived data (tasks, noteIndex, MiniSearch)
- PaperView
- oi
- ga
- BlockRow (2)
- D-48: spaces fully isolated (РЕШЕНО, user, 2026-10-26; refines D-36)
- MCP tools / REST operations set
- LibraryUITests
- YValue
- options
- StorageTests
- env
- AttachmentRecord
- WidthPoint
- .segments
- D-44 iPad columns: sidebar controlled only by its own button (РЕШЕНО; three-panel layout superseded by D-47)
- Behind existing proxy (127.0.0.1:8480; nginx/Caddy/Traefik snippets)
- .make
- D-49. Адрес сервера вводится в приложении, а не вшит в сборку
- D-52: web image-by-URL paste fetched via own server
- boot-guard.js
- LocalStore
- TouchObserver
- handleException
- Blue ink stroke brand motif on warm off-white background
- documents.ts
- ref_yjs (2)
- CameraPicker
- RecoveryKey
- PresenceCenter
- Guest route /s/:shareId#k=
- ps
- server/src/context.ts
- SyncClient (3)
- Серверная схема PostgreSQL
- agents-api.md (2)
- ui/package.json
- uploads.ts
- Sendable (4)
- RecordingRemote (2)
- YValue (2)
- W
- D-55 Backup and migration — simple, done by the server admin (РЕШЕНО, user answers 2026-10-26 «Удвреждено!», recorded 2026-10-27) (2)
- paste.spec.tsx
- D-59. Проверка безопасности перед публичным запуском
- DSDateChip (2)
- Revoked device wipes data (wipeRevokedDevice)
- D-55. Бэкап и переезд — просто, силами админа сервера
- Vfr
- Rx
- db/client.ts (2)
- FakeSharingServer
- finalize
- hub-worker.ts
- sync/client.ts (2)
- DeviceRevocationReason
- visit
- Ru
- .acceptAll
- routes/sharing.ts (2)
- with
- tasks.ts (2)
- uuidv7
- Editor.tsx
- normalize.ts
- DSTypeToken
- SidebarView.swift
- collab/reanchor.ts
- Ngi
- d (6)
- D-55 Backup and migration — simple, done by the server admin (РЕШЕНО, user answers 2026-10-26 «Удвреждено!», recorded 2026-10-27) (3)
- design-tokens/package.json
- ui/package.json (2)
- AccountError
- .iso (2)
- XCUIApplication
- DSTaskState (2)
- MathBlockView
- calculateSpace (2)
- DSSkeleton
- deploy.sh
- DSBackdrop (2) (2)
- InkInputRecognizer
- ios
- index.d.ts
- Palette
- Foundation (3)
- .content (2) (2)
- EditorAction
- ben
- Ka
- CodeTokenKind
- .decode
- .classify
- apps/web index.html (PWA entry)
- D-29. Graphify: порядок работы, чтобы граф был всегда актуален
- shares.ts (2)
- ref_tiptap_core
- index.d.ts (2)
- EditorDemoUITests
- .contains
- ucn
- vVr
- repairTitle.test.ts
- aen
- mermaid.min.js (15)
- DSSuggestionList (2)
- .classify (2)
- apply
- mermaid.min.js (4)
- schema.ts
- 0043-local-library-migration.md
- uo (2)
- DatascratchTests
- .attachmentBounds (2)
- Card.tsx (2)
- 0025-no-redis.md
- AccountService
- options
- Контракт: API для ИИ-агентов — MCP, REST, OAuth (v1) (2)
- server/README.md (2)
- D-55 Backup and migration — simple, done by the server admin (РЕШЕНО, user answers 2026-10-26 «Удвреждено!», recorded 2026-10-27) (4)
- store.ts (3) (2)
- AgentNoteEditor.tsx
- tasks.ts (3)
- BareEditorProbe
- .success
- .launch
- DatascratchTests (2)
- Pen Manual Test Checklist (iPad/iPhone)
- XCTestCase
- Контракт: шифрование (v1) (2)
- mermaid.min.js (22)
- _9n
- nAr
- Datascratch
- server (2)
- inspect
- agents-api.md (5)
- server.yml
- metrics.ts (2)
- paste/markdown.ts
- MathBlockView (2)
- .decode (3)
- DSDateChip
- EditorDemo README
- createLinkingError
- hjt
- shared/package.json
- steps (2) (2)
- build-test
- server.yml (2)
- world.ts (2)
- metrics.ts (3)
- ui/test/setup.ts
- CodingKeys (3)
- ios/project.yml
- True (2) (2)
- scripts
- loadKatex
- Как подключить Claude или ChatGPT к Datascratch
- compilerOptions (2) (2)
- ios
- with (2) (2)
- infra/README.md (3)
- 2026-10-25 (вторая половина дня) (2) (2)
- tokens.test.mjs (2)
- Запуск
- ui/package.json (3)
- compat/package.json (2)
- katex
- EditorTextView (2)
- decisions/README.md (3)
- .decode (3)
- BlockLayoutFragment (2) (2)
- AgentsContext plugin-server interface (2)
- collab/reanchor.ts (2)
- deploy.yml
- web.yml
- Features
- DSFeedback
- FrameRateBoost (2)
- mermaid.min.js (28)
- zKe
- bie
- ios/project.yml (2)
- CHANGELOG.md (2)
- gate
- steps
- steps (4)
- postgres
- with (2) (2) (2)
- compilerOptions (4)
- web
- pen.spec.tsx
- peerDependencies (2)
- compilerOptions (3) (2)
- design.yml
- ios (2)
- react
- e2e-real-server
- contracts/sync.ts (2) (2)
- ui/package.json (4)
- deploy-e2e
- DSMotionToken (2) (2)
- 08-sharing.md (2) (3)
- secrets
- test
- G6
- StrokePoint (2)
- web (2)
- EditorDemo README (2)
- options (2) (2)
- D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления
- Открытые вопросы (3)
- folders.spec.ts
- test-vectors/tsconfig.json
- lowlight
- with (2) (2) (2) (2)
- scripts (2) (2)
- spaces.spec.ts
- CHANGELOG.md (4)
- deploy-e2e (2)
- Demo/project.yml
- @tiptap/extension-code-block-lowlight
- @datascratch/design-tokens — токены «Тихая бумага» (2)
- remoteImage.test.ts
- address.sh
- DSSuggestionList (2) (2)
- True (4) (2)
- ./strokes
- ui/package.json (5)
- @tiptap/react@^3.32.0
- EditorDemo (2)
- specs/helpers.ts (2)
- y-prosemirror@^1.3.7
- y-protocols@^1.0.7
- apps/ios README (iPhone + iPad app) (3)
- web/playwright.config.ts
- Новая группа
- CHANGELOG.md (3)
- CHANGELOG.md (4) (2)
- Новая группа (2)
- CHANGELOG.md (5)
- ssh-setup.sh
- tsx@^4.20.0
- ui/package.json (2) (2)
- Обзор архитектуры (2)
- agents.authenticate(dsa_ token) -> AgentPrincipal { tokenId, userId, permission, notebookIds } or null; updates lastUsedAt
- shared/README.md
- strokes.md (3)
- roadmap.md
- stack.md (2)
- Новая группа (8)
- Новая группа (2) (2)
- shared/README.md (2)
- Новая группа (3)
- Новая группа (4)
- Новая группа (5)
- CHANGELOG.md (6)
- roadmap.md (5)
- Новая группа (6)
- Новая группа (7)
- CHANGELOG.md (5) (2)
- Manual step-by-step VPS on Hetzner: CX22/CAX11, Ubuntu 24.04, SSH key, A record, Docker, ufw, git clone to /opt/datascratch
- open-questions.md (3)
- Manual step-by-step VPS on Hetzner: CX22/CAX11, Ubuntu 24.04, SSH key, A record, Docker, ufw, git clone to /opt/datascratch (2)
- open-questions.md (4)
- EditorDemoUITests (2)
- t (2) (2)

## God Nodes (most connected - your core abstractions)
1. `t()` - 469 edges
2. `n()` - 402 edges
3. `r()` - 385 edges
4. `ge()` - 363 edges
5. `pe()` - 363 edges
6. `s()` - 325 edges
7. `e()` - 320 edges
8. `a()` - 312 edges
9. `o()` - 189 edges
10. `d()` - 166 edges

## Surprising Connections (you probably didn't know these)
- `Данные` --references--> `dailyNotebookId()`  [INFERRED]
  docs/decisions/0048-isolated-spaces.md → apps/web/src/domain/actions.ts
- `No reruns on main: Linux gate step skips macOS jobs when the same tracked files already passed the workflow (already-tested.sh)` --references--> `gate`  [INFERRED]
  docs/decisions/0046-faster-ios-ci.md → .github/workflows/design.yml
- `No reruns on main: Linux gate step skips macOS jobs when the same tracked files already passed the workflow (already-tested.sh)` --references--> `gate`  [INFERRED]
  docs/decisions/0046-faster-ios-ci.md → .github/workflows/ios-app.yml
- `No reruns on main: Linux gate step skips macOS jobs when the same tracked files already passed the workflow (already-tested.sh)` --references--> `gate`  [INFERRED]
  docs/decisions/0046-faster-ios-ci.md → .github/workflows/ios-core.yml
- `yrs-ffi crate: coarse-grained UniFFI API (one document, nodes by path, batched ops in one transaction, observers)` --references--> `YDocument`  [INFERRED]
  docs/decisions/0042-yrs-uniffi-binding.md → apps/ios/Packages/DSCore/yrs-ffi/src/lib.rs

## Import Cycles
- 2-file cycle: `apps/ios/Packages/DSCore/yrs-ffi/src/lib.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/xml.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/lib.rs`
- 3-file cycle: `apps/ios/Packages/DSCore/yrs-ffi/src/events.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/xml.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/lib.rs -> apps/ios/Packages/DSCore/yrs-ffi/src/events.rs`

## Hyperedges (group relationships)
- **Реализация D-54 по потокам: контракт → сервер → веб и iOS** — docs_decisions_readme_d_54, docs_changelog_shared_sharing_client, docs_changelog_server_account_sharing, docs_changelog_web_account_sharing_parts_1_4, docs_changelog_ios_account_sharing_build_23, docs_changelog_account_x25519_keypair, docs_changelog_notebook_key_rotation [EXTRACTED 1.00]
- **AgentsContext server interface methods** — docs_architecture_contracts_agents_api_context_listagentnotebooks, docs_architecture_contracts_agents_api_context_loaddoc, docs_architecture_contracts_agents_api_context_docseqs, docs_architecture_contracts_agents_api_context_applyupdate, docs_architecture_contracts_agents_api_context_createnotedoc, docs_architecture_contracts_agents_api_context_movenotedoc, docs_architecture_contracts_agents_api_context_loadattachmentimage, docs_architecture_contracts_agents_api_context_users_authenticate, docs_architecture_contracts_agents_api_context_users_loginurl, docs_architecture_contracts_agents_api_context_store, docs_architecture_contracts_agents_api_context_store_listaudit [EXTRACTED 1.00]
- **Agents OAuth 2.1 connection flow** — docs_architecture_contracts_agents_api_oauth_2_1_authorization_server, docs_architecture_contracts_agents_api_client_id_metadata_documents, docs_architecture_contracts_agents_api_dynamic_client_registration_rfc7591, docs_architecture_contracts_agents_api_pkce_s256, docs_architecture_contracts_agents_api_consent_screen, docs_architecture_contracts_agents_api_www_authenticate_401, docs_architecture_contracts_agents_api_rfc_9728_protected_resource_metadata, docs_architecture_contracts_agents_api_rfc_8414_authorization_server_metadata, docs_architecture_contracts_agents_api_insufficient_scope_step_up [EXTRACTED 1.00]
- **D-49 amendment: our server never shown — ADR, spec/06, decision log, changelog** — docs_decisions_0049_server_address_in_app_amendment_not_shown, docs_decisions_0049_server_address_in_app_build_address_hidden, docs_decisions_0049_server_address_in_app_address_three_sources, docs_decisions_readme_d_49 [EXTRACTED 1.00]
- **D-55 simple backup and migration by server admin — ADR, open question closed, spec/06 backups, decision log, changelog** — docs_decisions_0055_backup_simple_d55, docs_decisions_0055_backup_simple_admin_ssh_commands, docs_decisions_0055_backup_simple_kms_key_first_install_message, docs_spec_06_data_server_backups_offsite, docs_decisions_readme_d_55 [EXTRACTED 1.00]
- **D-57 agent capabilities: allNotebooks, pictures, trash** — docs_decisions_0057_agents_all_notebooks_pictures_trash_allnotebooks, docs_decisions_0057_agents_all_notebooks_pictures_trash_note_pictures_for_agents, docs_decisions_0057_agents_all_notebooks_pictures_trash_agent_trash, docs_architecture_contracts_agents_api_get_image, docs_architecture_contracts_agents_api_trash_note, docs_decisions_0057_agents_all_notebooks_pictures_trash_ds_agent_notebooks [EXTRACTED 1.00]
- **D-58 frame anchoring across decision, contract and platforms** — docs_decisions_0058_pen_frames_anchor_to_enclosed_lines_d_58_decision, docs_architecture_contracts_strokes_enclosing_strokes_rule, docs_decisions_0058_pen_frames_anchor_to_enclosed_lines_inkcontroller_enclosedlinehits, docs_decisions_0058_pen_frames_anchor_to_enclosed_lines_linesforstroke, docs_decisions_readme_d_58 [EXTRACTED 1.00]
- **Deploy coexistence modes on shared VPS** — infra_deploy_deploy_modes, infra_deploy_sinhron_edge, infra_deploy_behind_proxy, infra_deploy_memory_profiles, infra_deploy_docker_project_isolation, infra_deploy_host_mode [EXTRACTED 1.00]
- **Поток отзыва устройства и стирания данных (D-53)** — docs_changelog_device_revoked_signal, docs_changelog_classify_api_failure, docs_changelog_dscore_device_revoked_error, docs_changelog_ios_revoked_device_wipe, docs_changelog_web_revoked_device_wipe, docs_decisions_readme_d_53 [EXTRACTED 1.00]
- **Local edit → store/outbox → encrypt → push** — apps_ios_packages_dscore_readme_crdtdocument, apps_ios_packages_dscore_readme_localstore, apps_ios_packages_dscore_readme_dscrypto, apps_ios_packages_dscore_readme_syncengine, apps_ios_packages_dscore_readme_syncclient [EXTRACTED 1.00]
- **Read-only editor enforcement (UI flag, model guard, newer-format lock)** — docs_spec_04_editor_read_only_mode, docs_spec_04_editor_readonlydocument_model_guard, docs_spec_04_editor_is_effectively_read_only, apps_ios_packages_dseditor_sources_dseditormodel_readonlydocument_readonlydocument, apps_ios_packages_dseditor_sources_dseditor_editorview_editorview [EXTRACTED 1.00]
- **Функции, спрятанные за расширенным режимом D-51** — docs_decisions_0051_minimal_mode_extended_mode, docs_spec_12_craft_features_tasks, docs_spec_12_craft_features_12_2_ежедневные_заметки_и_календарь, docs_spec_12_craft_features_collections, docs_changelog_ios_minimal_mode_default, docs_changelog_web_minimal_mode_default [EXTRACTED 1.00]
- **Key wrapping hierarchy** — docs_architecture_contracts_crypto_passwordkey, docs_architecture_contracts_crypto_masterkey, docs_architecture_contracts_crypto_notebookkey, docs_architecture_contracts_crypto_notekey, docs_architecture_contracts_crypto_serverkey, docs_architecture_contracts_crypto_recovery_key [EXTRACTED 1.00]
- **Living stroke anchoring rules (text anchoring, boundary, line splitting, D-35, free drawing, enclosing strokes)** — docs_architecture_contracts_strokes_living_stroke_text_anchoring, docs_architecture_contracts_strokes_right_char_boundary_rule, docs_architecture_contracts_strokes_line_break_segmentation, docs_architecture_contracts_strokes_deleted_text_rule, docs_architecture_contracts_strokes_free_drawing, docs_architecture_contracts_strokes_enclosing_strokes_rule [EXTRACTED 1.00]
- **Notebook key rotation flow** — docs_architecture_contracts_crypto_notebook_rotation_procedure, docs_architecture_contracts_crypto_notemeta, docs_architecture_contracts_crypto_key_chain, docs_architecture_contracts_crypto_guest_link_recreation [EXTRACTED 1.00]
- **Rich paste pipeline (HTML/Markdown → blocks → images uploaded as attachments)** — docs_spec_04_editor_rich_paste_mapping, docs_spec_04_editor_paste_markdown_agent_import, docs_spec_04_editor_paste_images, docs_spec_04_editor_fetch_remote_image, docs_spec_04_editor_image_insert_upload_progress, docs_spec_04_editor_paste_cases_vector [EXTRACTED 1.00]
- **Security audit 2026-10-27: owner decisions and resulting controls** — docs_decisions_0053_security_audit_owner_decisions_d53, docs_decisions_0053_security_audit_owner_decisions_revoked_device_wipe, docs_decisions_0053_security_audit_owner_decisions_storage_quota_10gb, docs_decisions_0053_security_audit_owner_decisions_signup_open, docs_spec_06_data_server_storage_quota, docs_spec_06_data_server_signup_modes, docs_spec_06_data_server_trusted_proxy_xff, docs_spec_07_encryption_ios_device_protection [EXTRACTED 1.00]
- **Web resilience to bad network** — apps_web_readme_service_worker_cache, apps_web_readme_boot_guard, apps_web_readme_api_client, apps_web_readme_sync_socket [EXTRACTED 1.00]
- **Security audit 2026-10-27 hardening** — apps_web_readme_kdf_bounds, apps_web_readme_safe_mime, apps_web_readme_awareness_sanitize, apps_web_readme_guest_route [EXTRACTED 1.00]
- **Account sharing (D-54) web implementation** — apps_web_readme_people_invite_ui, apps_web_readme_invitations_inbox, apps_web_readme_maintain_owned_shares, apps_web_readme_shared_with_me, apps_web_readme_history_dialog [INFERRED 0.85]
- **ds:// app-link flow: web «Открыть в приложении» → ds:// scheme → iOS link handling** — docs_decisions_0056_app_links_custom_scheme_decision, apps_ios_readme_xcodegen_project [INFERRED 0.85]
- **Revoked-device data handling: keep-data rule (2026-10-26) replaced by wipe (D-53)** — docs_decisions_0053_security_audit_owner_decisions_revoked_device_wipe, docs_decisions_0053_security_audit_owner_decisions_revocation_reasons, docs_spec_07_encryption_revoked_device_wipe, docs_open_questions_closed_lost_device [INFERRED 0.85]

## Communities (457 total, 66 thin omitted)

### Community 0 - "mermaid.min.js"
Cohesion: 0.00
Nodes (988): _1i(), _3r(), _6t(), _7n(), $8r(), a0i(), A1i(), A2e() (+980 more)

### Community 1 - "cn"
Cohesion: 0.02
Nodes (275): ButtonProps, Ctx, Drop, queue, Variant, backdropNames, colorNames, highlightNames (+267 more)

### Community 2 - "0031-crdt-yjs.md"
Cohesion: 0.02
Nodes (190): fastify@^5.12.7, fastify, Agent rate limits (in-memory counters, D-25) and OAuth 2.1 for MCP are the plugin's responsibility, Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, File Storage (disk or external S3) (+182 more)

### Community 3 - "t"
Cohesion: 0.01
Nodes (248): addToResyncTokens(), r(), aRn(), AT_LEAST_ONE(), AT_LEAST_ONE1(), AT_LEAST_ONE2(), AT_LEAST_ONE3(), AT_LEAST_ONE4() (+240 more)

### Community 4 - "Sendable"
Cohesion: 0.04
Nodes (122): Font, mono, sans, serif, NoteCover, NoteStyle, NoteVersion, StarRef (+114 more)

### Community 5 - "contracts/api.ts"
Cohesion: 0.02
Nodes (141): dexie@^4, accountApi, notebooksApi, deviceId(), deviceKey(), openLocal(), SealedBlob, sealLocal() (+133 more)

### Community 6 - "EditorTheme"
Cohesion: 0.05
Nodes (24): LibrarySnapshot, LibraryStore, .activeNotebookIds, .activeSpace, .activeSpaceNotes, .activeTab, .dailyNotebook, .documents (+16 more)

### Community 7 - "KeyRing"
Cohesion: 0.07
Nodes (9): KeychainSecretStore, KeyRing, .keptNotebookKeys, PasswordChangeMaterial, RecoveryKeyRotation, SecretStore, SecretStoreError, keychain (+1 more)

### Community 8 - "ge"
Cohesion: 0.01
Nodes (496): _0(), _1n(), _3n(), _7(), _7e(), _8e(), _9t(), a1t() (+488 more)

### Community 9 - "PenLayer.ts"
Cohesion: 0.03
Nodes (91): AuthorKind, Stroke, StrokeAuthor, StrokePoint, StrokeTool, packPoints(), AnchorSnapshot, isStructural() (+83 more)

### Community 10 - "iOS editor and pen layer: apps/ios/Packages/DSEditor — modules DSInk, DSEditorModel (EditorDocument), DSEditor; demo com.datascratch.app.editordemo"
Cohesion: 0.02
Nodes (170): Без Mac (временный вариант), Демо «Живой штрих» (EditorDemo), Как поставить на iPad (Mac с Xcode), Профилирование, Что проверить, 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек (+162 more)

### Community 11 - "0039-parallel-sessions.md"
Cohesion: 0.02
Nodes (166): XcodeGen project (project.yml) with ds:// and datascratch:// URL schemes, Local Mac build: brew xcodegen, Config/Local.xcconfig with Team ID, scripts/generate.sh, Datascratch.xcodeproj, Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Datascratch — правила для ИИ, Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST (+158 more)

### Community 12 - "DSRGBA"
Cohesion: 0.02
Nodes (85): .color, .uiColor, .color, .color, .color, .color, .uiColor, .background (+77 more)

### Community 13 - "String"
Cohesion: 0.04
Nodes (44): MemberRow, AccessConfirmation, .id, AccessRole, editor, .systemImage, .title, viewer (+36 more)

### Community 14 - "Foundation"
Cohesion: 0.02
Nodes (46): FocusedValues, View, CoreLibrarySafetyTests, Counter, RecordingRemote, SpaceSwitchTests, Data, DSNetwork (+38 more)

### Community 15 - "r"
Cohesion: 0.01
Nodes (284): _8n(), _9r(), a7n(), a9r(), aAr(), t(), aCr(), addNode() (+276 more)

### Community 16 - "actions.ts"
Cohesion: 0.05
Nodes (124): useRecoveryUnconfirmed(), useIndexVersion, leaveShared(), useShared, moveNote(), openTab(), toggleStar(), updateFolder() (+116 more)

### Community 17 - "router.tsx"
Cohesion: 0.03
Nodes (104): agentTokensApi, membersApi, App(), queryClient, allRoute, appLayout, authLayout, calendarRoute (+96 more)

### Community 18 - "plugin.ts"
Cohesion: 0.04
Nodes (100): RFC-7009, RFC-8252, RFC-9207, ACCESS_PREFIX, bearer(), GrantService, REFRESH_PREFIX, SCOPE_READ (+92 more)

### Community 19 - "crypto/keys.ts (2)"
Cohesion: 0.04
Nodes (119): RFC-4648, DEVICE_REVOKED_REASONS, AD, ATTACHMENT_CHUNK_BYTES, BOX_PUBLIC_KEY_BYTES, BOX_SECRET_KEY_BYTES, DEFAULT_KDF, ENVELOPE_OVERHEAD (+111 more)

### Community 20 - "AppModel"
Cohesion: 0.03
Nodes (44): AppModel, .isLocalOnlyTesting, .linkHost, .linkServer, .phase, .serverFromLink, LaunchOptions, CollapsedPenButton (+36 more)

### Community 21 - "CoreLibrary"
Cohesion: 0.06
Nodes (12): CoreLibrary, .knownNoteIds, .lockedNotebookIds, .needsCarriedMerge, .notebooksWithoutKey, .pendingMoves, .remote, .unsentChangeCount (+4 more)

### Community 22 - "DSPenToolbar"
Cohesion: 0.03
Nodes (91): DSPenMode, .eraserMode, highlighter, lasso, marker, pen, pencil, pixelEraser (+83 more)

### Community 23 - "L9n"
Cohesion: 0.03
Nodes (174): $1r(), _3t(), a(), a5n(), b(), bcr(), C_(), C4() (+166 more)

### Community 24 - ".make"
Cohesion: 0.05
Nodes (21): NoteDocument, .isReadOnly, .noteId, Author, DeviceRevokedError, docs, Locked, BenchmarkTests (+13 more)

### Community 25 - "ref_yjs"
Cohesion: 0.03
Nodes (161): @napi-rs/canvas@^1.0.13, cellPlace(), clip(), collectHandwriting(), describeGroup(), GROUP_GAP_EM, GROUP_PAUSE_MS, HandwritingItem (+153 more)

### Community 26 - "decisions/README.md"
Cohesion: 0.01
Nodes (204): Shared notebooks for participant agents (D-54 amendment), Account sharing (members, invitations, box keys), Invitations, keyRotationPending / pendingSinceVersion, Member agents access to shared for-agents notebooks, Members and key rotation, SharedItem (agentsMode), Пара ключей X25519 аккаунта, версии ключей и цепочка (crypto.md §10) (+196 more)

### Community 27 - "Contract: AI agents API — MCP, REST, OAuth (v1)"
Cohesion: 0.02
Nodes (124): GET /v1/openapi.json, zod (OpenAPI from code), MCP tool add_comment, Agent access rules (for-agents notebooks, grant, trash hidden), Agent Markdown dialect (block markers, callouts, tasks), /v1/agent-tokens endpoints (plugin), AgentsContext (packages/agents/src/context.ts), AgentService (+116 more)

### Community 28 - "D-10: agent edits applied immediately, highlighted, rolled back via version history"
Cohesion: 0.03
Nodes (87): POST /fetch-image, D-16. Импорт — не сейчас, Решение, D-51. Минимализм (KISS): по умолчанию — только заметки; задачи, календарь и вкладки — в «расширенном режиме», Контекст, Рассмотренные варианты, Решение, D-52. Картинки по ссылке при вставке в вебе — через сервер (+79 more)

### Community 29 - "contracts/document.ts"
Cohesion: 0.04
Nodes (84): buildNoteIndex(), SearchHit, createNotebookRequestSchema, registerDocRequestSchema, signupRequestSchema, AUTHOR_KINDS, authorKindSchema, Base64Url (+76 more)

### Community 30 - "AccountSection.tsx"
Cohesion: 0.08
Nodes (65): createNewRecoveryKey(), confirmRecoveryKeySaved(), forgetRevokedData(), getRecoveryKey(), skipRecoveryStep(), useAuth, setSetting(), TAB_TIDY_DEFAULT (+57 more)

### Community 31 - "InMemoryEditorDocument"
Cohesion: 0.04
Nodes (44): ChangeOrigin, local, redo, remote, system, textInput, undo, DocumentChange (+36 more)

### Community 32 - "actions.ts (2)"
Cohesion: 0.05
Nodes (107): docsApi, rememberNotebookKey(), rememberNoteKey(), enqueueOp(), runtime(), accountMaps(), AccountSnapshot, initAccountDoc() (+99 more)

### Community 33 - "EditorCommands"
Cohesion: 0.05
Nodes (21): BlockKind, blockquote, bulletList, callout, codeBlock, heading, orderedList, paragraph (+13 more)

### Community 34 - "View"
Cohesion: 0.03
Nodes (88): AboutView, .body, AccountSettings, .body, AppearanceSettings, .body, AppSettings.Appearance, .symbol (+80 more)

### Community 35 - "SyncEngine (2)"
Cohesion: 0.06
Nodes (19): Backdrop, .yValue, Comment, .fields, Cover, .value, DocumentError, notFound (+11 more)

### Community 36 - "Dr"
Cohesion: 0.01
Nodes (344): _1t(), a8(), a8e(), a9(), abn(), afe(), ai(), aln() (+336 more)

### Community 37 - "SyncClient"
Cohesion: 0.03
Nodes (80): Author, authorSchema, DeviceRevokedReason, deviceRevokedReasonSchema, base64UrlDecodedLength(), AckMessage, ackMessageSchema, authorFieldSchema (+72 more)

### Community 38 - "OnboardingFlow.swift"
Cohesion: 0.03
Nodes (83): .body, LinkProblem, missingDocument, missingNotebook, otherServer, CalendarView, DailyNoteCard, .body (+75 more)

### Community 39 - ".content"
Cohesion: 0.04
Nodes (42): CardsPreview, .body, DSCard, .body, DSDocCard, .body, .hasStrip, View (+34 more)

### Community 40 - "View (3)"
Cohesion: 0.04
Nodes (43): TaskDateField, deadline, scheduled, Haptics, CommandPaletteView, .body, .documents, .ranked (+35 more)

### Community 41 - "DocPage.tsx"
Cohesion: 0.05
Nodes (116): openDecrypted(), resizeImage(), svgToPng(), addTask(), agentCreatedOf(), deleteTask(), editTaskText(), findInbox() (+108 more)

### Community 42 - "routes/sharing.ts"
Cohesion: 0.04
Nodes (131): Revoking a device, a share or deleting the account immediately closes WebSocket connections (code 4401), bearer(), deviceActive(), readCookie(), requireUser(), requireUserOrGuest(), verifyGuestToken(), verifyUserToken() (+123 more)

### Community 43 - "APIClient"
Cohesion: 0.04
Nodes (6): APIClient, .currentSession, .isSignedIn, SecretSessionStore, SessionStore, APIClientTests

### Community 44 - "SceneModel"
Cohesion: 0.05
Nodes (40): ClosingEditor, FullScreen, content, document, PadLevel, document, list, SceneModel (+32 more)

### Community 45 - "Stroke"
Cohesion: 0.03
Nodes (70): AnchorKind, block, drawing, image, text, .value, Hint, arrow (+62 more)

### Community 46 - "store.ts (2)"
Cohesion: 0.06
Nodes (5): EditorViewTests, ImageStore, EditorDocument, .allBlocks, Только чтение — нельзя: ввод, вставка/вырезание/удаление, диктовка, Scribble, перо (двойное касание/сжатие Pencil), форматирование, меню «/», фото/файлы, drag-in, задачи и даты, ширина/удаление картинок, ячейки таблиц, отмена/повтор

### Community 47 - "h (2)"
Cohesion: 0.02
Nodes (85): add(), addAstNodeRegionWithAssignmentsTo(), b4r(), h(), b8n(), bKe(), f(), Bqn() (+77 more)

### Community 48 - "agent-service.ts"
Cohesion: 0.06
Nodes (61): AgentNotebook, findHandwriting(), AgentError, buildMcpServer(), AgentImage, Principal, requireWrite(), AgentService (+53 more)

### Community 49 - "EditorTheme (2)"
Cohesion: 0.04
Nodes (28): AttachmentFactory, .fileViews, .imageViews, .isReadOnly, .previews, .resolver, .showsResizeHandle, .theme (+20 more)

### Community 50 - "DSCrypto"
Cohesion: 0.06
Nodes (27): CryptoAD, CryptoError, boxKeyMismatch, decryptionFailed, invalidKeyLength, invalidPeerKey, invalidRecoveryKey, kdfFailed (+19 more)

### Community 51 - "toBase64Url"
Cohesion: 0.20
Nodes (22): authApi, deviceName(), changePassword(), loginKeyFor(), normalizeEmail(), recoverAccount(), signIn(), signUp() (+14 more)

### Community 52 - "Журнал решений (ADR)"
Cohesion: 0.03
Nodes (71): App structure: App (AppModel, SceneModel, WindowGroup), Services, Design, Features, Resources, apps/ios — iPhone + iPad, CI ios-app.yml (unit + UI on iPad/iPhone) and ios-release.yml (TestFlight), Integration/CoreLibrary.swift over DSCore (Yrs docs, LocalStore GRDB, KeyRing, point edits by blockId), apps/ios README (iPhone + iPad app), DSDesign tokens or Theme literal fallback, Localization catalog build (build_catalog.py, Localizable.xcstrings, ru.json), LibraryStore (local JSON store / screen interface) (+63 more)

### Community 53 - "n"
Cohesion: 0.01
Nodes (583): _1(), _2(), _2n(), _4n(), _5(), _5e(), _6e(), _7t() (+575 more)

### Community 54 - "CodingKeys"
Cohesion: 0.09
Nodes (4): normalizeEmail(), APIValidation, CreateShareRequest, RegisterDocRequest

### Community 55 - "LocalStore (2)"
Cohesion: 0.09
Nodes (56): N, UPDATES_PER_NOTE, COMPACT_JOB, AD, seal(), agentsPlugin, createAgentsContext(), call() (+48 more)

### Community 56 - "contracts/api.ts (2)"
Cohesion: 0.02
Nodes (134): api, noAuth, notebooksModeApi, opBodies, sharesApi, getWorker(), pending, Req (+126 more)

### Community 57 - "CodingKeys (2)"
Cohesion: 0.03
Nodes (75): UpdateAuthor, agent, guest, user, ClientMessage, awareness, hello, push (+67 more)

### Community 58 - "TransactionOrigin"
Cohesion: 0.04
Nodes (27): CarriedNotebook, daily, TransactionOrigin, .description, .isOutgoing, local, other, remote (+19 more)

### Community 59 - "CRDTDocument"
Cohesion: 0.04
Nodes (16): CRDTDocument, .canRedo, .canUndo, .clientId, CRDTSubscription, CRDTUpdates, DeepHandler, DocKind (+8 more)

### Community 60 - "CoreEditorDocument"
Cohesion: 0.06
Nodes (13): CoreEditorDocument, .blocks, .canRedo, .canUndo, .coreOrigin, .isReadOnly, .strokes, .style (+5 more)

### Community 61 - "web-editor/package.json"
Cohesion: 0.03
Nodes (91): dependencies, @datascratch/design-tokens@workspace:*, @datascratch/shared@workspace:*, @datascratch/ui@workspace:*, katex@^0.18.10, lowlight@^3.3.0, lucide-react@^1.61.0, marked@16.4.2 (+83 more)

### Community 62 - "FakeRESTServer"
Cohesion: 0.06
Nodes (14): .trust, MemberTrust, keyChanged, notInvited, TrustRecord, .isMigrated, .accessExpiry, .date (+6 more)

### Community 63 - "contracts/api.ts (3)"
Cohesion: 0.03
Nodes (81): dependencies, @aws-sdk/client-s3@^3.1156.0, @datascratch/agents@workspace:^, @datascratch/shared@workspace:^, drizzle-orm@^0.45.4, @fastify/cors@^11.3.1, fastify-plugin@^6.0.1, @fastify/rate-limit@^11.2.1 (+73 more)

### Community 64 - "contracts/document.ts (2)"
Cohesion: 0.06
Nodes (74): moveNoteToNotebook(), folders(), SharedRef, sharedRefKey(), TabItem, TagProps, buildBacklinks(), tagAncestors() (+66 more)

### Community 65 - "BlockNode"
Cohesion: 0.04
Nodes (30): .shape, BlockNode, .isTextblock, .plainText, .textLength, InlineAtom, InlineElement, atom (+22 more)

### Community 66 - "file"
Cohesion: 0.09
Nodes (19): ResolvedStrokeSegment, .fields, StrokeCodec, StrokeCodecError, invalidLength, StrokePoint, StrokeCodecTests, BadValue (+11 more)

### Community 67 - "02-platforms.md"
Cohesion: 0.05
Nodes (56): App Store Connect app record (Datascratch, iOS, Russian, SKU datascratch, Full Access), Bundle ID com.datascratch.app (no Capabilities; links open the app via ds:// scheme, D-56), D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, D-03. Платформы: нативные iPhone и iPad + полноценный веб, Full-featured web client (TypeScript), Контекст (+48 more)

### Community 68 - "schema/index.ts"
Cohesion: 0.06
Nodes (52): CalloutTone, Callout, CALLOUT_TONES, Commands, Drawing, DRAWING_REFERENCE_WIDTH, FileBlock, formatSize() (+44 more)

### Community 69 - "DSAvatar"
Cohesion: 0.18
Nodes (11): AvatarPreview, .body, DSAvatar, .body, .presenceLabel, DSAvatarStack, .body, DSPresence (+3 more)

### Community 70 - "SyncEngine"
Cohesion: 0.06
Nodes (14): known, OpenDoc, Summary, failed, offline, synced, syncing, SyncEngine (+6 more)

### Community 71 - "edits.ts"
Cohesion: 0.07
Nodes (48): BuildContext, cloneInto(), copyChildren(), createBlock(), inlineChildren(), insertBlock(), insertBlocks(), withAgentMark() (+40 more)

### Community 72 - "ServerConnection"
Cohesion: 0.05
Nodes (7): ServerAccessService, ServerAccountService, .isServerBacked, .unsentChanges, ServerConnection, ServerSharingService, KeyRingDocumentKeys

### Community 73 - "api/client.ts"
Cohesion: 0.08
Nodes (45): ApiError, checkRevoked(), DeviceRevokedError, doFetch(), fetchOnce(), NetworkError, READ_RETRY_DELAYS_MS, request() (+37 more)

### Community 74 - "server/README.md"
Cohesion: 0.05
Nodes (69): Access rights model (user, guest, agent), AgentPrincipal, Agents API contract (agents-api.md), AgentsContext (store, data, users), agents data (plugins/agents-data.ts), Пакет @datascratch/agents (MCP, OAuth 2.1, REST, токены, журнал, PNG), @datascratch/agents Fastify plugin (MCP, OAuth 2.1), agents store (plugins/agents-store.ts) (+61 more)

### Community 75 - "CaseIterable"
Cohesion: 0.03
Nodes (60): Appearance, dark, .id, light, system, AppSettings, .appearance, .colorScheme (+52 more)

### Community 76 - "store.ts"
Cohesion: 0.06
Nodes (68): ANCHOR_KINDS, AnchorKind, MIN_SEGMENT_POINTS, ORPHAN_STROKE_PURGE_DAYS, POINT_BYTES, POINT_FIELDS, REFERENCE_BLOCK_WIDTH, REFERENCE_FONT_SIZE (+60 more)

### Community 77 - "SidebarView"
Cohesion: 0.04
Nodes (42): AllTagsSheet, .body, SidebarCollapse, .folded, SidebarMoreRow, .body, SidebarSectionHeader, .body (+34 more)

### Community 78 - "ServerAccountSharingService"
Cohesion: 0.09
Nodes (5): .names, ServerAccountSharingService, .accounts, .api, .isAvailable

### Community 79 - "MarkSet"
Cohesion: 0.03
Nodes (49): .blockId, .text, AttributedRenderer, MarksBox, .hash, ParagraphDecoration, .taskState, BlockLayoutFragment (+41 more)

### Community 80 - "Tint"
Cohesion: 0.05
Nodes (34): .background, .foreground, .localizedName, NoteBlock, .linkedTitles, .plainText, .tags, Notebook (+26 more)

### Community 81 - "DSTaskState"
Cohesion: 0.07
Nodes (23): TaskCheckbox, .body, .fallback, .content, DSCheckmark, DSTaskCheckbox, .body, .isDone (+15 more)

### Community 82 - "i18n/index.ts"
Cohesion: 0.24
Nodes (8): en, Loose, keys(), Lang, setLang(), Messages, ru, i18next

### Community 83 - "Block"
Cohesion: 0.07
Nodes (20): Array, .attributes, Block, .isKnown, .isTextBlock, .xml, BlockType, Inline (+12 more)

### Community 84 - "DSMotionToken (2)"
Cohesion: 0.09
Nodes (16): YMap, expectSynced(), newDoc(), PASSWORD, signIn(), signUp(), uniqueEmail(), leaveForSnapshot() (+8 more)

### Community 85 - "in-memory.ts"
Cohesion: 0.03
Nodes (26): date(), grantDto(), iso(), PgAgentsStore, AgentEditOrigin, AgentGrant, AgentsContext, AgentsStore (+18 more)

### Community 86 - "TaskRow"
Cohesion: 0.07
Nodes (24): DateLabel, deadline, scheduled, TaskGroup, TaskIndex.Bucket, .emptyMessage, .emptySymbol, .emptyTitle (+16 more)

### Community 87 - "DatascratchEditor"
Cohesion: 0.04
Nodes (28): agentEdit, AgentTitleEditor(), AgentTitleVariant, block(), blocksOf(), Window, AwarenessEditor(), awarenesses (+20 more)

### Community 88 - "TextDiff"
Cohesion: 0.06
Nodes (34): .noteHistory, DiffLegend, .body, DiffText, .body, VersionDetail, .body, .header (+26 more)

### Community 89 - "packages/test-vectors (shared test vectors)"
Cohesion: 0.04
Nodes (59): classifyApiFailure, @datascratch/shared/contracts, @datascratch/shared/crypto, @datascratch/shared package, deliverAwaitingKeys, @datascratch/shared/document, ensureAccountKeyPair, @datascratch/shared/ids (uuidv7) (+51 more)

### Community 90 - "WebSocketConnection"
Cohesion: 0.05
Nodes (25): Configuration, SyncClient, .isConnected, SyncClientDelegate, SyncClientError, closed, deviceRevoked, notConnected (+17 more)

### Community 91 - "devDependencies"
Cohesion: 0.04
Nodes (66): dependencies, clsx@^2.1.1, cmdk@^1, @datascratch/design-tokens@workspace:^, @datascratch/shared@workspace:^, @datascratch/ui@workspace:^, @datascratch/web-editor@workspace:^, dexie-react-hooks@^4.4.0 (+58 more)

### Community 92 - "agents/package.json"
Cohesion: 0.04
Nodes (66): dependencies, @datascratch/design-tokens@workspace:^, @datascratch/shared@workspace:^, @expo-google-fonts/inter@^0.4.2, @expo-google-fonts/newsreader@^0.4.1, @expo-google-fonts/noto-emoji@^0.4.8, fastify-plugin@^6.0.1, mdast-util-from-markdown@^2.1.0 (+58 more)

### Community 93 - "iXe"
Cohesion: 0.04
Nodes (47): Afr(), aXe(), Az(), bDr(), BLn(), Bve(), Dfr(), DXe() (+39 more)

### Community 94 - "db/client.ts"
Cohesion: 0.05
Nodes (31): pino@^10.4.0, buildApp(), BuildOptions, codeForStatus(), base64urlKey, bool, ConfigSchema, loadConfig() (+23 more)

### Community 95 - "InkController"
Cohesion: 0.04
Nodes (22): reproject(), FrameRateBoost, .isActive, Tick, InkCanvas, RenderedStroke, InkController, .commands (+14 more)

### Community 96 - "SyncConnection"
Cohesion: 0.09
Nodes (26): AuthorRef, publicAuthor(), loadDocs(), loadMemberships(), AppendInput, CatchUpItem, item(), Pending (+18 more)

### Community 97 - "DocumentStyle"
Cohesion: 0.06
Nodes (24): DemoImages, DemoModel, .fileURL, .style, DemoView, .body, .content, .editorAndPalette (+16 more)

### Community 98 - "CoverAction"
Cohesion: 0.08
Nodes (22): CoverAction, file, .kind, .noteId, photo, reposition, CoverHeader, .body (+14 more)

### Community 99 - "EditorTextView"
Cohesion: 0.07
Nodes (14): DictationPlaceholder, DocumentUndoManager, .canRedo, .canUndo, .groupingLevel, .isUndoRegistrationEnabled, .redoActionName, .undoActionName (+6 more)

### Community 100 - "EditorView.swift"
Cohesion: 0.07
Nodes (53): alignPaper(), animateCheck(), applyKeyboardInset(), applyReadOnly(), applySlashCommand(), applyTheme(), caretIsInTitle(), caretLineFrame() (+45 more)

### Community 101 - "Jr"
Cohesion: 0.02
Nodes (198): $4(), a0t(), A2(), aDe(), ajt(), aMn(), aNn(), aNt() (+190 more)

### Community 102 - "Datascratch web client (apps/web)"
Cohesion: 0.15
Nodes (17): Accessibility WCAG 2.1 AA (axe e2e), Minimal vs extended mode (D-51, VITE_DS_EXTENDED_MODE), glyph.ts SF Symbol to emoji mapping, Version history with authors and diff (HistoryDialog), ListFilter in-list search, newDocTarget (where new document goes), VITE_DS_TEST_HOOKS window.__ds perf hooks, PWA offline-first web client (+9 more)

### Community 103 - "strokes.md"
Cohesion: 0.05
Nodes (43): anchorKind: text | block (margin note) | image | drawing, block / image / drawing coords in fractions of block width (x 0..1, y ≥ 0), captureAnchorOffsets — TS helper (@datascratch/shared/strokes), Strokes contract v1 (handwritten strokes), D-05 living stroke (reference), D-35 stroke on deleted text (reference), Drawing space below last paragraph (≥ viewport height) only while drawing is available; content height includes free drawings, text stroke coords: offset from anchored glyph origin (leading edge, baseline) in em (+35 more)

### Community 104 - "sync/client.ts"
Cohesion: 0.09
Nodes (34): Folder, NoteMeta, .isTrashed, AgentAuthor, .value, AnyKey, .intValue, .fields (+26 more)

### Community 105 - "SceneSheet"
Cohesion: 0.06
Nodes (29): AppCommands, .body, DatascratchApp, .body, .mainContent, MainWindow, NoteWindow, .body (+21 more)

### Community 106 - "zn"
Cohesion: 0.03
Nodes (78): a_t(), aFt(), awt(), b3t(), bbt(), bSt(), c5(), c5e() (+70 more)

### Community 107 - "DSCore"
Cohesion: 0.05
Nodes (45): Account sharing (D-54, crypto.md §10), AccountService, NoteMeta.createdByAgent (D-45), APIClient (REST), AttachmentManager, spec/11 benchmarks (BenchmarkTests), CRDTDocument, DSCore (+37 more)

### Community 108 - "DSDesign Swift package (iOS 26, Swift 6) — «Тихая бумага» design system tokens + SwiftUI components"
Cohesion: 0.02
Nodes (188): accessibilityIdentifier палитры пера для UI-тестов, CI design.yml (macOS): build, Swift Testing, DSShowcase PNG snapshots artifact dsdesign-snapshots, DSAvatar / DSAvatarStack (avatars and presence), DSBackdrop / DSGrain (gradient backdrops with paper grain), DSButtonStyle (primary / secondary / ghost / destructive), DSCallout (tinted warning with action), DSCalloutTone (note/info/success/warning/danger tones), DSCard / DSDocCard (cover thumbnail only own image) (+180 more)

### Community 109 - "CodingKeys"
Cohesion: 0.05
Nodes (37): APIErrorBody.Inner, CodingKeys, accessExpiresAt, accessToken, accountDocId, alg, at, chunkCount (+29 more)

### Community 110 - "SyncClient (2)"
Cohesion: 0.05
Nodes (6): GuestSession, DexieSyncStorage, DocEntry, SyncClient, DocSyncState, OutboxItem

### Community 111 - "DocumentCollectionView"
Cohesion: 0.06
Nodes (40): .body, DocumentActions, DocumentCard, .body, .designSystemCard, .standInCard, DocumentCollectionView, .body (+32 more)

### Community 112 - "DSBackdrop"
Cohesion: 0.15
Nodes (8): BackdropGallery, .body, DSBackdrop, .body, DSGrain, .body, GrainPattern, SplitMix64

### Community 113 - "tasks.ts"
Cohesion: 0.08
Nodes (42): NoteBackdrop, NoteCover, NoteStyle, App(), attachments, awA, awB, docA (+34 more)

### Community 114 - "AccountService (2)"
Cohesion: 0.08
Nodes (18): check_text_range(), decoding(), diff_update(), merge_updates(), mismatch(), missing_map(), nested_map(), ResolvedIndex (+10 more)

### Community 115 - "crypto/keys.ts (2) (2)"
Cohesion: 0.10
Nodes (51): NB(), Member, ShareTarget, NoteMeta, generateKey(), BoxKeyPair, unwrapKeyChain(), wrapPreviousKey() (+43 more)

### Community 116 - "AttachmentManager"
Cohesion: 0.14
Nodes (6): AttachmentError, alreadyExists, invalidDownload, invalidId, AttachmentManager, LocalStore

### Community 117 - "GuestPage.tsx"
Cohesion: 0.12
Nodes (26): attachmentUrl(), Reader, sanitizeAwarenessUpdate(), sanitizeUser(), received(), writeUint(), channels, colorFor() (+18 more)

### Community 118 - "ReadOnlyDocument"
Cohesion: 0.06
Nodes (17): .isReadOnly, ObservationToken, .blocks, ReadOnlyDocument, .blocks, .canRedo, .canUndo, .isReadOnly (+9 more)

### Community 119 - ".textView"
Cohesion: 0.07
Nodes (8): edit, deleteLassoSelection(), EditorView, flushPendingAtomRelayout(), init(), keepingScroll(), pastePlainText(), TaskDatePickerController

### Community 120 - "D-10: agent edits applied immediately, highlighted, rolled back via version history"
Cohesion: 0.07
Nodes (28): Handwriting anchors as CRDT relative positions (not broken by agent edits), D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Rejected option: agent suggestions awaiting user approval, Version history as rollback mechanism for agent edits, Рассмотренные варианты, Решение, «Правки агента · Принять все» bar and per-block accept for agent edits in existing notes, Whole agent-created note highlighted green (problem) (+20 more)

### Community 121 - "FlakyTransport"
Cohesion: 0.06
Nodes (16): HTTPTransport, URLSession, RequestMetrics, .requestStarted, TransportFailure, .description, URLSessionTransport, URLSessionWebSocketFactory (+8 more)

### Community 122 - "DSSidebarItem"
Cohesion: 0.13
Nodes (11): DSSidebarItem, .body, .disclosure, DSSidebarSection, .body, .isExpanded, SidebarPreview, .body (+3 more)

### Community 123 - "scripts/generate.mjs"
Cohesion: 0.06
Nodes (47): doc, s1, update, [mode, base], backdropCss(), backdropSwift(), block(), formatted() (+39 more)

### Community 124 - "DSMotionToken"
Cohesion: 0.09
Nodes (21): Motion, .springAnimation, .body, DSSuggestionGroup, DSSuggestionItem, DSSuggestionList, .body, .isEmpty (+13 more)

### Community 125 - "steps"
Cohesion: 0.10
Nodes (29): container, runs-on, steps, steps, if, needs, runs-on, steps (+21 more)

### Community 126 - "sync-protocol.md"
Cohesion: 0.03
Nodes (98): 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05), 6. Права, 7. Коды ошибок, 8. Тестовые векторы (+90 more)

### Community 127 - "n (3)"
Cohesion: 0.04
Nodes (72): a2n(), a9t(), aF(), AN(), apn(), aRe(), aW(), bRt() (+64 more)

### Community 128 - "DSFormatBarElement"
Cohesion: 0.12
Nodes (15): .body, DSFormatBar, .body, DSFormatBarButton, .body, DSFormatBarElement, .id, item (+7 more)

### Community 129 - ".makeLibrary"
Cohesion: 0.19
Nodes (4): LatencyConnection, LatencyFactory, Library, SyncPerfTests

### Community 131 - "DSSettingsSampleContent"
Cohesion: 0.15
Nodes (10): DSSettingsSampleContent, .account, .body, .syncedAt, DSSettingsSampleScreen, .body, Kind, account (+2 more)

### Community 132 - "BlockStyle"
Cohesion: 0.09
Nodes (17): updateSlashMenu(), BlockStyle, bulletList, code, heading1, heading2, heading3, orderedList (+9 more)

### Community 133 - ".content"
Cohesion: 0.21
Nodes (9): BacklinksSection, .body, CloseDocumentButton, DocumentBackground, DocumentScreen, .body, .library, FullScreenButton (+1 more)

### Community 134 - "AgentAuditView"
Cohesion: 0.17
Nodes (7): AgentAuditView, .body, AgentTokensSettings, .body, .mcpURL, NewAgentTokenSheet, .body

### Community 135 - "caddy"
Cohesion: 0.04
Nodes (46): context, dockerfile, depends_on, environment, image, ports, profiles, restart (+38 more)

### Community 136 - "Popups.tsx"
Cohesion: 0.17
Nodes (11): SuggestionGroup, LinkItem, NoteLinkMenu(), SlashMenu(), useLiveCaretRect(), useStore(), createSuggestionExtension(), createSuggestionStore() (+3 more)

### Community 137 - "Как устроено"
Cohesion: 0.04
Nodes (43): apps/web — веб-клиент Datascratch, Аудит безопасности 2026-10-27, Большие списки (10 000 заметок), Вкладки: полоса, «+N», обзор (spec/12 §12.6), Вложения (crypto.md §6), Выход из аккаунта (spec/07), Гибкий интерфейс, Гости (D-13, D-37) (+35 more)

### Community 138 - "iOS checks and TestFlight builds (D-46): macOS runners ios-app/ios-editor/ios-core/design; ios-app ~25 min, ios-release ~30 min, Apple 5-30 min"
Cohesion: 0.09
Nodes (25): GitHub Actions builds iOS and runs tests on macOS runner on every push, D-46. Ускорение проверок iOS: без повторов на main и быстрый набор перед сборкой, Full UI suite failure after the build -> fix in next build, user informed, gate step (Linux) skips macOS jobs on main if same files already passed (.github/scripts/already-tested.sh), Rejected option: paid faster GitHub runners (cost; user has not chosen), Not chosen: paid fast GitHub runners (cost), UI tests (smoke — release gate): SMOKE_UI_TESTS; tools/ci/wait-release-gate.sh starts TestFlight before full set, Rejected option: change nothing (max checks before build, slow) (+17 more)

### Community 139 - "cu"
Cohesion: 0.05
Nodes (56): $3e(), a3e(), aLt(), B3e(), C3e(), cNr(), Cse(), cu() (+48 more)

### Community 140 - ".parse"
Cohesion: 0.18
Nodes (7): Problem, empty, invalid, notHTTPS, ServerAddress, ServerInfo, ServerAddressTests

### Community 141 - "DSLanguage (2) (2)"
Cohesion: 0.08
Nodes (17): .dsState, Phase, failed, localOnly, notSent, offline, sessionEnded, syncing (+9 more)

### Community 142 - "test-vectors/package.json"
Cohesion: 0.13
Nodes (20): map_to_attrs(), value_to_any(), Container, container(), Element, Fragment, element(), index_paths() (+12 more)

### Community 143 - "No reruns on main: Linux gate step skips macOS jobs when the same tracked files already passed the workflow (already-tested.sh)"
Cohesion: 0.13
Nodes (15): ios-editor run counts as passed if only the known demo-typing step failed, No reruns on main: Linux gate step skips macOS jobs when the same tracked files already passed the workflow (already-tested.sh), passed(), already-tested.sh script, run, GH_REPO, GH_TOKEN, KNOWN_FAILING_STEP (+7 more)

### Community 144 - "consume"
Cohesion: 0.06
Nodes (62): ACTION(), after(), assign(), assignWithoutOverride(), before(), callFunction(), construct(), constructInfix() (+54 more)

### Community 145 - "07-encryption.md (2)"
Cohesion: 0.06
Nodes (50): Block / Inline / Mark, DSCard / DSDocCard — карточка документа, Account keys and sharing (D-54), Account X25519 key pair, Agent mode with serverKey (R-10), Argon2id password KDF (ops=3, mem=64MiB, NFKC), Associated data (ad) bindings, Attachment chunking (1 MiB envelopes) (+42 more)

### Community 146 - "GitHub Actions deploy workflow (VPS over SSH, no computer needed)"
Cohesion: 0.15
Nodes (15): Workflow deploy: образы в GHCR, выкладка по SSH, проверка по HTTPS, откат, Образы в GHCR, без Docker Hub, Additive-only DB migrations (rollback safe), Automatic rollback on failed deploy, DEPLOY_ENABLED safety switch, Deploy secrets (DEPLOY_HOST, DEPLOY_SSH_KEY, DEPLOY_USER, DEPLOY_PORT), deploy.sh (status, rollback), Deploy SSH key generated on server (DEPLOY_SSH_KEY) (+7 more)

### Community 147 - "ios-editor.yml"
Cohesion: 0.13
Nodes (14): concurrency, group, permissions, name, permissions, actions, contents, paths (+6 more)

### Community 148 - "CoverImages"
Cohesion: 0.07
Nodes (8): Added, AddedImage, CoverAttachmentRemote, CoverImages, CoverImagesTests, NoteMediaTests, RecordingAttachmentRemote, ImageIO

### Community 149 - "Projection (2)"
Cohesion: 0.08
Nodes (18): .source, .pasteboardIsImages, Array, HTMLMapper, HTMLNode, .isText, .style, .textContent (+10 more)

### Community 150 - "UIKit (3)"
Cohesion: 0.09
Nodes (4): MermaidBlockView, Key, MermaidRenderer, Off-screen WKWebView sandbox: content rule list blocks network, non-persistent store, no navigation, securityLevel strict

### Community 151 - "Color"
Cohesion: 0.14
Nodes (14): Color, .dsAccent, .dsCanvas, .dsDanger, .dsElevated, .dsOnAccent, .dsPrimary, .dsSecondary (+6 more)

### Community 152 - "Block (2)"
Cohesion: 0.12
Nodes (42): alternative(), assertion(), atom(), atomEscape(), characterClass(), characterClassEscape(), classAtom(), classEscape() (+34 more)

### Community 153 - "asc.py"
Cohesion: 0.08
Nodes (16): b64url(), call(), check_app(), der_to_raw(), ensure_bundle_id(), prune_ci_certs(), token(), literals() (+8 more)

### Community 154 - "server.mjs"
Cohesion: 0.07
Nodes (32): attAccess(), authed(), b64u(), canRead(), clients, cors, db, deviceRevoked() (+24 more)

### Community 155 - "02-platforms.md (2)"
Cohesion: 0.05
Nodes (37): Code licensed GNU AGPL-3.0-only (LICENSE, D-50), All rights to the code belong to the project owner, Участие в проекте, D-20. Сроки — начинаем сейчас, без жёсткого дедлайна, D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст (+29 more)

### Community 156 - "String"
Cohesion: 0.09
Nodes (24): attributedString(), fragment(), hasTapTarget(), hovered(), image(), imageFailed(), insertImage(), linkParagraph() (+16 more)

### Community 157 - "tapped"
Cohesion: 0.22
Nodes (6): DSHaptics, openFile(), openImage(), tapped(), TapTargetAccessibilityElement, tapTargetElements()

### Community 158 - "LibraryPersistence"
Cohesion: 0.24
Nodes (3): LibraryBackend, .lockedNotebookIds, LibraryPersistence

### Community 159 - "InkController (2)"
Cohesion: 0.11
Nodes (14): Phase, onboarding, ready, BlockAnchorBuilder, CharacterHit, GlyphPlacement, InkSample, LivingStrokeResolver (+6 more)

### Community 160 - "07-encryption.md"
Cohesion: 0.03
Nodes (93): data.loadDoc, 10.1. Пара ключей аккаунта, 10.2. Ключ для участника, 10.3. Версии ключей и смена ключа, 10.4. Участник создаёт заметку, 10.5. Код безопасности (необязательно, в интерфейсе пока не показывается), 10. Ключи аккаунтов и общий доступ (D-54), 1. Иерархия ключей (+85 more)

### Community 161 - "DSBackdrop (2)"
Cohesion: 0.06
Nodes (40): concurrency, cancel-in-progress, group, run, CI, jobs, test, webkit-paper (+32 more)

### Community 162 - "DSPenColorFamily"
Cohesion: 0.09
Nodes (10): Coordinator, DSPenColorFamily, highlight, ink, DSRecentPenColors, DSSystemColorPicker, .hex, .tokenValue (+2 more)

### Community 163 - "clear"
Cohesion: 0.04
Nodes (69): addAnnotation(), addClass(), addDescription(), addInterface(), addMember(), addMembers(), addRelation(), addRelationObjs() (+61 more)

### Community 167 - "devDependencies (2)"
Cohesion: 0.05
Nodes (37): devDependencies, fake-indexeddb@^6.2.6, jsdom@^30.1.3, @playwright/test@1.63.0, tailwindcss@^4, @tailwindcss/vite@^4, @testing-library/dom@^10.4.2, @testing-library/react@^16.3.3 (+29 more)

### Community 168 - "engine.ts"
Cohesion: 0.23
Nodes (10): NotSent(), StorageFullBanner(), SyncIndicator(), createSyncStatusStore(), SyncFailure, SyncState, SyncStatus, SyncStatusStore (+2 more)

### Community 169 - "D-54: account sharing — notebook or note by email (simple variant)"
Cohesion: 0.06
Nodes (29): D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account, Universal Links (paid Apple Developer account), Последствия, Решение, Paid Apple Developer account; Team ID set on Mac at first signing, not stored in repo, D-37. Гости по ссылке рисуют; ссылка живёт до отзыва, Guest drawing via edit link (+21 more)

### Community 170 - "specs/helpers.ts"
Cohesion: 0.07
Nodes (28): ArrayDelta, Delete, Insert, Retain, convert(), DeepObserver, path(), sorted_keys() (+20 more)

### Community 171 - "node"
Cohesion: 0.05
Nodes (58): a4(), brighter(), BYe(), clamp(), Cur(), cYe(), darker(), Dbe() (+50 more)

### Community 172 - "SyncClient (@datascratch/shared/sync)"
Cohesion: 0.20
Nodes (11): DexieSyncStorage (syncStorage.ts), FolderStrip and UnreadableNote banner, IndexedDB via Dexie (ds-device, ds-account), E2E mock server, Multi-tab session with Web Locks token refresh, useNoteContentReady (wait for content before mounting editor), Skipped unreadable sync items recovery, Stored-docs sync mode (DocStore.acquire/release) (+3 more)

### Community 173 - "BlockRow"
Cohesion: 0.07
Nodes (23): .body, BlockRow, .body, .bodyFont, .font, .leading, .menu, .placeholder (+15 more)

### Community 174 - "build_number"
Cohesion: 0.18
Nodes (11): description, required, build_number, ref, tags, description, required, True (+3 more)

### Community 175 - "EditorHost (editor/hosts.ts)"
Cohesion: 0.22
Nodes (9): Agent-created note banner (D-45), Chunked encrypted attachments (1 MiB), infra/deploy/Caddyfile, Document cover (encrypted attachment), EditorHost (editor/hosts.ts), Images and files in note (uploadAttachment), fetchRemoteImage via POST /fetch-image (D-52), securityHeaders.ts CSP and security headers (+1 more)

### Community 176 - "DS_KMS_KEY — save via ds key / ds key-saved"
Cohesion: 0.25
Nodes (9): DS_KMS_KEY не входит в копии: ds key — только в терминале, ds CLI (backup, backups, restore, key, key-saved), DS_KMS_KEY — save via ds key / ds key-saved, iOS asks server address at login (not baked into build), Nightly backups 03:17, 14 days (db dump + files tarball), Restore verifies copy and saves pre-restore data, Server layout /opt/datascratch (.env secrets created on server), Moving to a new server recipe (+1 more)

### Community 177 - "Shared with me (sharedWithMe.ts, SharedWithMe.tsx)"
Cohesion: 0.25
Nodes (8): AgentsBadge 'Open to AI agents', Invitations inbox (Invitations.tsx), Web key storage (master key in memory, wrapped notebook keys), maintainOwnedShares owner key distribution and rotation, Open in app (appLink.ts, OpenInApp.tsx), People / invite by email UI (People.tsx), reconcileNotebooks notebook key reconciliation, Shared with me (sharedWithMe.ts, SharedWithMe.tsx)

### Community 178 - "test-vectors/package.json (2)"
Cohesion: 0.06
Nodes (35): env, runs-on, services, steps, timeout-minutes, concurrency, cancel-in-progress, group (+27 more)

### Community 179 - "TaskEntry"
Cohesion: 0.11
Nodes (13): Bucket, all, .id, inbox, today, upcoming, .taskEntries, TaskEntry (+5 more)

### Community 180 - "AccountService (2) (2)"
Cohesion: 0.07
Nodes (17): UpdateObserver, is_inside(), ORIGIN_LOCAL, origin_name(), ORIGIN_UNDO, RootDef, RootKind, Array (+9 more)

### Community 181 - "createNoteIndexer derived data (tasks, noteIndex, MiniSearch)"
Cohesion: 0.29
Nodes (8): Default note title (defaultNoteTitle), Empty fresh note deletion (isNoteEmpty, freshNotes), Pause doc sync until key available (keyAvailable), moveNoteToNotebook (move note to another notebook), Opening a note writes nothing, createNoteIndexer derived data (tasks, noteIndex, MiniSearch), @datascratch/shared (core), syncNotebookMetaCopy

### Community 182 - "PaperView"
Cohesion: 0.09
Nodes (11): AgentEditsBanner, .mode, .onShowHistory, Mode, createdBy, edits, PaperView, .paper (+3 more)

### Community 183 - "oi"
Cohesion: 0.02
Nodes (111): _5t(), a5(), a8t(), ah(), Au(), B3r(), b_e(), Bfr() (+103 more)

### Community 184 - "ga"
Cohesion: 0.03
Nodes (67): a0n(), ain(), bC(), bDn(), bsn(), cbt(), cC(), cen() (+59 more)

### Community 185 - "BlockRow (2)"
Cohesion: 0.07
Nodes (32): devDependencies, eslint@^9.39.0, eslint-config-prettier@^10.1.0, @eslint/js@^9.39.0, globals@^16.4.0, prettier@^3.6.0, turbo@^2.5.0, typescript-eslint@^8.46.0 (+24 more)

### Community 186 - "D-48: spaces fully isolated (РЕШЕНО, user, 2026-10-26; refines D-36)"
Cohesion: 0.05
Nodes (62): 1. Три вида документов Yjs, 2. Документ `account`, 3. Документ `notebook` (индекс блокнота), 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note` (+54 more)

### Community 187 - "MCP tools / REST operations set"
Cohesion: 0.07
Nodes (33): description, devDependencies, @datascratch/shared@workspace:*, eslint@^9.39.0, libsodium-wrappers-sumo@^0.8.2, prosemirror-model@^1.25.0, tsx@^4.20.0, @types/node@^22.10.0 (+25 more)

### Community 189 - "YValue"
Cohesion: 0.08
Nodes (15): XmlNode, .attributes, .children, .elementName, .textContent, YValue, .boolValue, .dataValue (+7 more)

### Community 190 - "options"
Cohesion: 0.36
Nodes (8): driver, options, max-file, max-size, logging, logging, logging, options

### Community 192 - "env"
Cohesion: 0.06
Nodes (37): run, BUILD_NUMBER, CERT_P12, CERT_PASSWORD, ISSUER_ID, KEY_ID, KEY_P8, TEAM_ID (+29 more)

### Community 193 - "AttachmentRecord"
Cohesion: 0.08
Nodes (14): NoteDerivedData, NoteLinkEntry, TaskEntry, AttachmentRecord, .missingChunks, .uploaded, LocalStore, SearchHit (+6 more)

### Community 195 - ".segments"
Cohesion: 0.16
Nodes (3): StrokeVectorTests, Vectors, .available

### Community 196 - "D-44 iPad columns: sidebar controlled only by its own button (РЕШЕНО; three-panel layout superseded by D-47)"
Cohesion: 0.10
Nodes (19): Close document (×) removes only the document; list/tasks/calendar fills workspace, D-44. Колонки на iPad: сайдбар управляется только своей кнопкой, «На весь экран» — only mode hiding sidebar and neighbour; exit restores previous layout, iPhone and narrow window: stack of screens, Narrow workspace (< 640 pt): document shown alone, sidebar untouched, Superseded rule: sidebar hides when a document opens, Three panels: Sidebar | List | Document (sidebar + workspace), Behaviour verified by UI tests in portrait and landscape (+11 more)

### Community 197 - "Behind existing proxy (127.0.0.1:8480; nginx/Caddy/Traefik snippets)"
Cohesion: 0.15
Nodes (16): Выкладка на общий сервер (Sinhron, behind-proxy), X-Forwarded-For только от доверенных прокси (TRUST_PROXY), Behind existing proxy (127.0.0.1:8480; nginx/Caddy/Traefik snippets), Caddy reverse proxy / TLS, Coexistence with existing programs (Docker, ufw, auto-updates untouched), Custom domain (A record + DS_DOMAIN), Deploy modes (direct / edge / proxy; DEPLOY_MODE), Isolated docker compose project datascratch (+8 more)

### Community 199 - "D-49. Адрес сервера вводится в приложении, а не вшит в сборку"
Cohesion: 0.33
Nodes (6): D-49. Адрес сервера вводится в приложении, а не вшит в сборку, Контекст, Нюансы, Поправка: наш сервер не показывается (пользователь, 2026-10-26, комментарий в заметке; записано 2026-10-27), Рассмотренные варианты, Решение

### Community 200 - "D-52: web image-by-URL paste fetched via own server"
Cohesion: 0.10
Nodes (10): vite-plugin-pwa@^1.2, contentSecurityPolicy(), securityHeaders(), SERVER_PATHS, isServer(), previewSecurityHeaders(), Client encrypts fetched bytes with note key and uploads as regular attachment, POST /v1/fetch-image (+2 more)

### Community 201 - "boot-guard.js"
Cohesion: 0.70
Nodes (4): fail(), retries(), retry(), show()

### Community 202 - "LocalStore"
Cohesion: 0.08
Nodes (9): DocumentRecord, FailedSync, LocalStore, .migrator, OutboxItem, QuarantinedItem, SnapshotPolicy, StoredUpdate (+1 more)

### Community 204 - "handleException"
Cohesion: 0.40
Nodes (5): enqueue(), handleException(), Kie(), performNextOperation(), read()

### Community 205 - "Blue ink stroke brand motif on warm off-white background"
Cohesion: 0.60
Nodes (5): Web favicon (SVG), Blue ink stroke logo mark on warm paper (#2E5BDB on #FAF8F4), PWA icon 192x192 (blue ink stroke on warm paper), PWA icon 512x512 (blue ink stroke on warm paper), Blue ink stroke brand motif on warm off-white background

### Community 206 - "documents.ts"
Cohesion: 0.10
Nodes (13): Server makes snapshots itself every 500 updates / 1 MB for agent edits (it knows the key), DbOrTx, docSnapshots, docUpdates, AppendResult, CatchUpPage, DocumentService, isUniqueViolation() (+5 more)

### Community 207 - "ref_yjs (2)"
Cohesion: 0.11
Nodes (16): CLIENT_LIMITS, CALLOUT_TONE, escapeMask(), Importer, isEmptyParagraph(), markdownCost(), markdownToBlocks(), MAX_NESTING (+8 more)

### Community 208 - "CameraPicker"
Cohesion: 0.06
Nodes (12): UIColor, Coordinator, SafariView, ActivityView, CameraPicker, Coordinator, DocumentPicker, ImageViewer (+4 more)

### Community 209 - "RecoveryKey"
Cohesion: 0.06
Nodes (26): .isRecoveryKeyConfirmed, .pendingRecoveryKey, .savedRecoveryKey, .body, .signedOutEmail, Account, Credentials, Kind (+18 more)

### Community 210 - "PresenceCenter"
Cohesion: 0.15
Nodes (7): .body, AwarenessCodec, Entry, PresenceCenter, PresencePeer, .initial, PresenceTests

### Community 211 - "Guest route /s/:shareId#k="
Cohesion: 0.50
Nodes (5): awarenessSanitize.ts presence sanitization, Guest route /s/:shareId#k=, kdfBounds.ts prelogin KDF validation, safeMime.ts attachment MIME whitelist, Security audit 2026-10-27

### Community 212 - "ps"
Cohesion: 0.02
Nodes (106): a1r(), Ac(), Agr(), aZr(), b0r(), b2e(), Bmr(), bmt() (+98 more)

### Community 213 - "server/src/context.ts"
Cohesion: 0.04
Nodes (35): AccessClaims, GuestClaims, subkey(), TokenSigner, Config, AppContext, createContext(), Database (+27 more)

### Community 214 - "SyncClient (3)"
Cohesion: 0.09
Nodes (15): device(), client, docs, done, hub, ids, key, LATENCY (+7 more)

### Community 215 - "Серверная схема PostgreSQL"
Cohesion: 0.08
Nodes (28): Anchor (textRange | paragraph | drawingBlock | image), DS_KMS_KEY, Триггер members_gone, Заметка (текст, рукопись, вложения, метаданные), Серверная схема PostgreSQL, Row-Level Security для ds_agent (D-30), Stroke, StrokePoint (+20 more)

### Community 216 - "agents-api.md (2)"
Cohesion: 0.07
Nodes (28): concurrency, cancel-in-progress, group, CI, jobs, test, name, permissions (+20 more)

### Community 217 - "ui/package.json"
Cohesion: 0.09
Nodes (28): dependencies, clsx@^2.1.1, cmdk@^1.1.1, @datascratch/design-tokens@workspace:*, @fontsource-variable/inter@^5.3.0, @fontsource-variable/jetbrains-mono@^5.3.0, @fontsource-variable/source-serif-4@^5, lucide-react@^1.61.0 (+20 more)

### Community 218 - "uploads.ts"
Cohesion: 0.11
Nodes (24): dataUrlBytes(), BlockId, blockIdPluginKey, findIdFixes(), hasAttr(), stripIds(), UNIQUE_ATTRS, dataUrlToFile() (+16 more)

### Community 219 - "Sendable (4)"
Cohesion: 0.16
Nodes (12): AccessService, AgentAuditEntry, .id, AgentPermission, read, readWrite, AgentToken, Device (+4 more)

### Community 220 - "RecordingRemote (2)"
Cohesion: 0.18
Nodes (14): Shared test vectors (VectorTests), b64(), el(), empty(), fixture(), normalize(), reads_yjs_document(), roots() (+6 more)

### Community 221 - "YValue (2)"
Cohesion: 0.09
Nodes (15): value_to_in(), YValue, BigInt, Bool, Bytes, List, Null, Number (+7 more)

### Community 222 - "W"
Cohesion: 0.05
Nodes (74): D9n(), ce(), de(), _e(), Ee(), ft(), He(), ke() (+66 more)

### Community 223 - "D-55 Backup and migration — simple, done by the server admin (РЕШЕНО, user answers 2026-10-26 «Удвреждено!», recorded 2026-10-27) (2)"
Cohesion: 0.25
Nodes (8): Admin backs up over SSH with simple commands: backup now (prints file path and size), list backups, restore in one command (integrity check and current data saved first), First install ends with a prominent DS_KMS_KEY message: what it is (needed for «for agents» notebooks), where it lies (/opt/datascratch/.env), save it in a password manager, it is deliberately excluded from backups and what happens if lost, Migration recipe in infra/DEPLOY.md: scp the backup file, install server, restore, switch DNS; new domain → people enter the new address in the app (D-49), no new build, Existing nightly backups: 03:17, kept 14 days in /opt/datascratch/backups/ on the server; restore verified in CI — stay as is, Consequences for server: backup / list / restore commands (wrappers over infra/backup.sh and restore.sh), DS_KMS_KEY message, «Бэкап и переезд» section in infra/DEPLOY.md, R-11 Один VPS — одна точка отказа (копии вне сервера уносит админ, D-55), Резервные копии на сервере (03:17, 14 дней); уносит админ (D-55, ds backup/backups/restore), Унести копии с сервера — дело администратора (D-55), rsync

### Community 224 - "paste.spec.tsx"
Cohesion: 0.09
Nodes (18): find(), J, marksOf(), inflight, PasteEditor(), Window, GOOGLE_DOCS, input() (+10 more)

### Community 225 - "D-59. Проверка безопасности перед публичным запуском"
Cohesion: 0.40
Nodes (4): D-59. Проверка безопасности перед публичным запуском, Контекст, Не сделано (осознанно), Решение

### Community 226 - "DSDateChip (2)"
Cohesion: 0.10
Nodes (18): ButtonsPreview, .body, ButtonStyle, DSButtonBody, .body, .fill, .foreground, .height (+10 more)

### Community 227 - "Revoked device wipes data (wipeRevokedDevice)"
Cohesion: 0.50
Nodes (4): api/client.ts REST client with timeouts and retries, Revoked device wipes data (wipeRevokedDevice), endKeepingData session end preserving unsent data, Logout with unsent changes

### Community 228 - "D-55. Бэкап и переезд — просто, силами админа сервера"
Cohesion: 0.50
Nodes (4): D-55. Бэкап и переезд — просто, силами админа сервера, Контекст, Последствия, Решение

### Community 229 - "Vfr"
Cohesion: 0.27
Nodes (9): ave(), Bw(), cte(), gve(), l4(), mz(), Vfr(), O() (+1 more)

### Community 230 - "Rx"
Cohesion: 0.03
Nodes (76): _4t(), b3n(), bFt(), bse(), bwt(), bY(), cSn(), cW() (+68 more)

### Community 232 - "db/client.ts (2)"
Cohesion: 0.13
Nodes (6): Server source layout (index, config, app, context, db, routes, sync, services, storage, jobs, plugins, drizzle), DiskStorage, S3Options, S3Storage, BlobStorage, chunkKey()

### Community 234 - "FakeSharingServer"
Cohesion: 0.16
Nodes (10): Device, FakeSharingServer, Membership, Owner, .key, .target, Resource, SharingFlowTests (+2 more)

### Community 236 - "finalize"
Cohesion: 0.12
Nodes (26): applyActorProperty(), applyClassDefinitions(), applyClassesAndStyles(), applyDeclarationMetadata(), applyMetadataAssignments(), applyStandaloneElementMetadata(), collectBoundary(), collectElement() (+18 more)

### Community 237 - "hub-worker.ts"
Cohesion: 0.08
Nodes (14): hub, { ids, key }, state, wss, before, BUDGET_MB, client, done (+6 more)

### Community 239 - "DeviceRevocationReason"
Cohesion: 0.13
Nodes (12): APIFailure, deviceRevoked, error, network, unauthorized, DeviceRevocationReason, accountDeleted, passwordChange (+4 more)

### Community 241 - "visit"
Cohesion: 0.04
Nodes (89): accDescrStatement(), accTitleStatement(), actorDeclarationOnly(), actorDraft(), actorItem(), actorName(), actorOccurrence(), actorStatement() (+81 more)

### Community 243 - "Ru"
Cohesion: 0.06
Nodes (32): AB(), ace(), bEt(), gbt(), han(), i7(), jk(), kCt() (+24 more)

### Community 244 - ".acceptAll"
Cohesion: 0.18
Nodes (5): acceptAgentEdits(), AgentEdits, WikiLinkMatch, WikiLinks, AgentEditsTests

### Community 245 - "routes/sharing.ts (2)"
Cohesion: 0.10
Nodes (18): AgentScope (listNotebooks, docKey, readDoc, applyUpdate, createNoteDoc, attachments, audit, tx), agents.authenticate(token) -> AgentPrincipal, agents.withScope(principal, fn): transaction under ds_agent with RLS, Server plugin interface (ServerPlugin) for optional package @datascratch/agents, loaded at startup if present, PluginHost (apiVersion, log, config, db, pool, jobs, crypto, agents), Tx, withAgentScope(), docs (+10 more)

### Community 248 - "with"
Cohesion: 0.19
Nodes (18): arrays_and_errors(), chunk(), Collect, local(), merge_and_diff_updates(), nested_maps_merge_per_field(), note_roots(), observers_report_paths_deltas_and_origins() (+10 more)

### Community 250 - "tasks.ts (2)"
Cohesion: 0.18
Nodes (19): TaskState, addDays(), Commands, dateChip(), dateChipLabel(), localDate(), nextWeek(), parseLocalDate() (+11 more)

### Community 251 - "uuidv7"
Cohesion: 0.04
Nodes (89): RFC-9562, UUID_V7_REGEX, ACCOUNT_ROOTS, BLOCK_NODES, DEFAULT_NOTE_STYLE, INLINE_NODES, MARKS, NOTE_ROOTS (+81 more)

### Community 253 - "Editor.tsx"
Cohesion: 0.12
Nodes (26): Collaboration, createNoteUndoManager(), TitleRepair, buildExtensions(), CoreOptions, createHeadlessEditor(), guardEditorSchema(), HostRef (+18 more)

### Community 254 - "normalize.ts"
Cohesion: 0.16
Nodes (22): ALIGNS, blank(), BLOCK_SELECTOR, BLOCK_TAGS, cellAlign(), hoist(), INLINE_WRAPPERS, isBlock() (+14 more)

### Community 255 - "DSTypeToken"
Cohesion: 0.05
Nodes (39): DSInlineChip, .body, DSInlineChipStyle, InlineChipsPreview, .body, DSFontFamily, display, mono (+31 more)

### Community 256 - "SidebarView.swift"
Cohesion: 0.18
Nodes (11): FolderMenuItems, .body, FolderRow, .body, .label, FolderRows, .body, .body (+3 more)

### Community 257 - "collab/reanchor.ts"
Cohesion: 0.15
Nodes (12): b64(), content, doc, firstRun, fixture, json, para, rel() (+4 more)

### Community 259 - "Ngi"
Cohesion: 0.29
Nodes (6): Agi(), Dgi(), Mgi(), Ngi(), Rgi(), Xut()

### Community 260 - "d (6)"
Cohesion: 0.10
Nodes (18): Aqn(), Cqn(), Dqn(), Eqn(), a(), kqn(), Lne(), o() (+10 more)

### Community 261 - "D-55 Backup and migration — simple, done by the server admin (РЕШЕНО, user answers 2026-10-26 «Удвреждено!», recorded 2026-10-27) (3)"
Cohesion: 0.25
Nodes (11): Address reaches the app only three ways: typed by the person, from an invitation link, or already saved on the device after login; settings show the person's own current server, Build address DS_SERVER_URL shown nowhere: not in field, hints, error texts or «О приложении», Problem: iOS server address set at build time (DS_SERVER_URL) — server move needs a new build, self-hosting impossible from TestFlight, Address check: https:// only (localhost for development); server name and version from /v1/health shown before password entry, Share and invitation links carry the server address: link opens app/web with the server chosen, person logs in or signs up and immediately gets the shared item, Future (stage 6): several servers/accounts at once like mail accounts — account switcher, each with own server, spaces and keys; server choice in web together with this, «Сервер» field on sign-in/sign-up; address checked via GET /v1/health before login, stored with account on device; switching server = log out (unsent-changes warning) and log in elsewhere; current server visible in settings, Universal Links open the app only for domains in the build; links from a foreign server open in browser with «Открыть в приложении» (datascratch:// scheme with server address) (+3 more)

### Community 262 - "design-tokens/package.json"
Cohesion: 0.10
Nodes (21): description, devDependencies, prettier@^3.6.0, exports, ./theme.css, ./tokens.css, ./tokens.json, files (+13 more)

### Community 263 - "ui/package.json (2)"
Cohesion: 0.09
Nodes (22): devDependencies, jsdom@^30.1.3, @ladle/react@^5.1.1, @playwright/test@1.63.0, @tailwindcss/vite@^4.3.3, @testing-library/react@^16.3.3, @testing-library/user-event@^14.6.8, @types/react@^19.3.0 (+14 more)

### Community 264 - "AccountError"
Cohesion: 0.13
Nodes (14): AccountError, accountExists, .errorDescription, invalidEmail, invalidRecoveryKey, passwordsDoNotMatch, server, unsafeServerParameters (+6 more)

### Community 265 - ".iso (2)"
Cohesion: 0.07
Nodes (7): FetchError, badResponse, refused, tooLarge, RedirectGuard, RemoteImageFetcher, SecurityAuditTests

### Community 267 - "DSTaskState (2)"
Cohesion: 0.20
Nodes (10): DSPenNib, .body, .eraser, .highlighter, .lasso, .marker, .pen, .pencil (+2 more)

### Community 270 - "calculateSpace (2)"
Cohesion: 0.15
Nodes (21): calculateHorizontalSpace(), calculateOffsetByRotation(), calculateSpace(), calculateSpaceIfDrawnHorizontally(), calculateSpaceIfDrawnVertical(), calculateVerticalSpace(), getDrawableElement(), getDrawableElements() (+13 more)

### Community 272 - "DSSkeleton"
Cohesion: 0.10
Nodes (21): ASSETCATALOG_COMPILER_APPICON_NAME, ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME, BUNDLE_LOADER, CODE_SIGN_STYLE, ENABLE_PREVIEWS, ENABLE_USER_SCRIPT_SANDBOXING, GENERATE_INFOPLIST_FILE, LOCALIZATION_PREFERS_STRING_CATALOGS (+13 more)

### Community 273 - "deploy.sh"
Cohesion: 0.10
Nodes (21): CFBundleURLName, CFBundleURLSchemes, properties, CADisableMinimumFrameDurationOnPhone, CFBundleDevelopmentRegion, CFBundleDisplayName, CFBundleLocalizations, CFBundleShortVersionString (+13 more)

### Community 277 - "DSBackdrop (2) (2)"
Cohesion: 0.18
Nodes (10): DSGlassFallbackKey, DSGlassModifier, .glass, DSGlassPanel, .body, EnvironmentValues, .dsGlassFallback, GlassPreview (+2 more)

### Community 281 - "ios"
Cohesion: 0.16
Nodes (20): GH_REPO, GH_TOKEN, steps, steps, steps, steps, continue-on-error, env (+12 more)

### Community 282 - "index.d.ts"
Cohesion: 0.14
Nodes (18): cleanup(), DEPLOY_HOST, DEPLOY_KEY_FILE, DEPLOY_KNOWN_HOSTS_FILE, DEPLOY_PORT, DS_DOMAIN, DS_POSTGRES_IMAGE, DS_SERVER_IMAGE (+10 more)

### Community 284 - "Palette"
Cohesion: 0.07
Nodes (22): Backdrop, .colors, .gradient, Color, Palette, .accent, .canvas, .danger (+14 more)

### Community 285 - "Foundation (3)"
Cohesion: 0.12
Nodes (6): DeviceOwner, DeviceRevokedNotice, .isPending, HiddenWhenCaptured, SafeFileName, View

### Community 286 - ".content (2) (2)"
Cohesion: 0.11
Nodes (19): CODE_SIGN_STYLE, CURRENT_PROJECT_VERSION, DEVELOPMENT_TEAM, GENERATE_INFOPLIST_FILE, INFOPLIST_KEY_CFBundleDisplayName, INFOPLIST_KEY_LSSupportsOpeningDocumentsInPlace, INFOPLIST_KEY_UIApplicationSceneManifest_Generation, INFOPLIST_KEY_UIApplicationSupportsIndirectInputEvents (+11 more)

### Community 287 - "EditorAction"
Cohesion: 0.11
Nodes (19): EditorAction, bold, bulletList, code, heading1, heading2, heading3, highlight (+11 more)

### Community 289 - "ben"
Cohesion: 0.04
Nodes (71): _8t(), abt(), b5t(), bd(), ben(), bRn(), c5t(), c_t() (+63 more)

### Community 292 - "Ka"
Cohesion: 0.02
Nodes (131): aJr(), aoe(), b7(), b7e(), bF(), BN(), bNt(), bzt() (+123 more)

### Community 294 - "CodeTokenKind"
Cohesion: 0.13
Nodes (11): CodeHighlighter, CodeToken, CodeTokenKind, comment, function, keyword, number, punctuation (+3 more)

### Community 295 - ".decode"
Cohesion: 0.18
Nodes (4): StrokeCodecError, invalidLength, StrokePointCodec, StrokeCodecTests

### Community 296 - ".classify"
Cohesion: 0.20
Nodes (4): LineMetrics, .midline, StrokeShapeClassifier, ShapeClassifierTests

### Community 297 - "apps/web index.html (PWA entry)"
Cohesion: 0.25
Nodes (8): apps/web index.html (PWA entry), Load watchdog script /boot-guard.js, <script src="/boot-guard.js"> in head (boot watchdog), Module entry /src/main.tsx into #root, PWA/Apple meta (theme-color #FAF8F4, apple-mobile-web-app-capable, icons), Theme bootstrap via external /theme-init.js before render, boot-guard.js boot recovery, Color tokens (light/dark, ink, tints, backdrops)

### Community 299 - "D-29. Graphify: порядок работы, чтобы граф был всегда актуален"
Cohesion: 0.22
Nodes (16): choose_memory(), choose_mode(), COMPOSE_PROJECT_NAME, current(), edge_install_site(), edge_missing(), edge_present(), log() (+8 more)

### Community 300 - "shares.ts (2)"
Cohesion: 0.11
Nodes (18): BackdropBlob, BackdropName, BackdropSpec, ColorName, DurationName, HighlightName, InkName, MotionName (+10 more)

### Community 301 - "ref_tiptap_core"
Cohesion: 0.08
Nodes (32): FormatElement, SAMPLE_CONTENT, acceptAll(), acceptBlock(), AgentReview, agentReviewKey, blocksWithAgentEdits(), decorations() (+24 more)

### Community 302 - "index.d.ts (2)"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib, module (+10 more)

### Community 306 - "ucn"
Cohesion: 0.04
Nodes (64): _0n(), a1n(), a3t(), ahe(), amt(), aSt(), B1r(), byt() (+56 more)

### Community 307 - "vVr"
Cohesion: 0.17
Nodes (15): AVr(), CVr(), EVr(), fVr(), gmi(), pht(), pmi(), pVr() (+7 more)

### Community 309 - "repairTitle.test.ts"
Cohesion: 0.16
Nodes (12): attachTitleRepair(), cloneInline(), isEmpty(), REPAIR_ORIGIN, repairTitles(), uuidv7Time(), Json, vector (+4 more)

### Community 310 - "aen"
Cohesion: 0.09
Nodes (30): ale(), av(), cNt(), createGrammarElementIdMap(), cue(), dehydrateCstNode(), dLr(), e1t() (+22 more)

### Community 312 - "mermaid.min.js (15)"
Cohesion: 0.14
Nodes (17): buildDuplicateFoundError(), buildEmptyRepetitionError(), computeLookaheadFunc(), disableRecording(), g_r(), i_r(), iHr(), M4() (+9 more)

### Community 314 - "DSSuggestionList (2)"
Cohesion: 0.12
Nodes (17): import, types, import, types, exports, ./contracts, ./document, ./ids (+9 more)

### Community 315 - ".classify (2)"
Cohesion: 0.12
Nodes (17): devDependencies, eslint@^9.39.0, prosemirror-model@^1.25.12, @types/node@^22.10.0, @types/ws@^8.5.13, typescript@^5.9.0, vitest@^3.2.0, ws@^8.18.0 (+9 more)

### Community 318 - "apply"
Cohesion: 0.20
Nodes (16): activationCount(), addActor(), addALink(), addBox(), addDetails(), addLinks(), addMessage(), addNote() (+8 more)

### Community 320 - "mermaid.min.js (4)"
Cohesion: 0.19
Nodes (14): ami(), bht(), cmi(), hmi(), hVr(), imi(), lmi(), mht() (+6 more)

### Community 322 - "schema.ts"
Cohesion: 0.06
Nodes (47): pg@^8.23.1, Drizzle schema and SQL migrations (drizzle-kit db:generate, DB_MIGRATE_ON_START; 0001 = Row-Level Security + file cleanup trigger), AgentScope, Db, migrationsFolder, runMigrations(), agentAudit, agentGrants (+39 more)

### Community 324 - "0043-local-library-migration.md"
Cohesion: 0.12
Nodes (13): Альтернативы: перенос с вопросом; раздельное хранение, Решение: всё созданное до входа переносится в аккаунт автоматически и без вопроса; перенос идемпотентен (409 «уже есть» — не ошибка), Контекст: локальные данные после входа (build 5) не переносились, регистрация документов получала 404, синхронизация висела, D-43 Local library migrates into account automatically on sign-in, D-43. Локальная библиотека переносится в аккаунт автоматически, Идемпотентный перенос (409 не ошибка, ключи переобёртываются), On-this-device mode: local spaces/notebooks/notes, keys wrapped by local master key, Idempotent migration: rewrap notebook keys, create notebooks on server before sync, 409 is not an error, no duplicate welcome doc (+5 more)

### Community 327 - "uo (2)"
Cohesion: 0.24
Nodes (13): arc(), bgr(), bMn(), g2e(), Lgr(), nl(), tgr(), uo() (+5 more)

### Community 330 - "DatascratchTests"
Cohesion: 0.14
Nodes (15): targets, build, dependencies, platform, settings, sources, type, dependencies (+7 more)

### Community 331 - ".attachmentBounds (2)"
Cohesion: 0.15
Nodes (15): env, DEPLOY_HOST, DEPLOY_PORT, DEPLOY_USER, DS_DEPLOY_MODE, DS_HOST_MODE, DS_MEM_PROFILE, DS_NGINX_AUTO (+7 more)

### Community 332 - "Card.tsx (2)"
Cohesion: 0.13
Nodes (15): default, description, type, diag_docs, mode, default, description, options (+7 more)

### Community 333 - "0025-no-redis.md"
Cohesion: 0.13
Nodes (15): 1. Купить сервер, 2. Домен, 3. Подключиться и подготовить сервер, 4. Скачать проект, 5. Заполнить настройки, 6. Запустить, 7. Резервные копии каждую ночь, 8. Обновление сервера (+7 more)

### Community 334 - "AccountService"
Cohesion: 0.05
Nodes (27): .signedOutEmail, .unsentChanges, SharingError, noBoxKey, noPublicKey, notConfirmed, notSignedIn, olderKey (+19 more)

### Community 336 - "options"
Cohesion: 0.18
Nodes (13): dependencies, prosemirror-model@1.25.1, y-prosemirror@1.3.7, yjs@13.6.27, description, prosemirror-model, y-prosemirror, yjs (+5 more)

### Community 337 - "Контракт: API для ИИ-агентов — MCP, REST, OAuth (v1) (2)"
Cohesion: 0.14
Nodes (14): YOp, ArrayDelete, ArrayInsert, MapDelete, MapSet, RootTextDelete, RootTextInsert, TextDelete (+6 more)

### Community 344 - "server/README.md (2)"
Cohesion: 0.14
Nodes (14): 10. Решённые вопросы стыков, 1. Как устроено, 2.1. Токены, 2.2. OAuth 2.1 (по спецификации MCP 2026-07-28), 2. Доступ, 3. Инструменты MCP и REST, 4. Markdown для агента (`read_note`), 5.1. Папки и перенос заметок (+6 more)

### Community 345 - "D-55 Backup and migration — simple, done by the server admin (РЕШЕНО, user answers 2026-10-26 «Удвреждено!», recorded 2026-10-27) (4)"
Cohesion: 0.14
Nodes (14): Адрес сервера для iPhone и iPad, Бэкап и переезд, Если выкладка не удалась, Как развернуть сервер Datascratch на своём VPS без компьютера (GitHub Actions), Какие адреса в интернете нужны серверу, Память, Подключить свой домен (по желанию), Сервер, на котором уже что-то работает (+6 more)

### Community 346 - "store.ts (3) (2)"
Cohesion: 0.16
Nodes (13): dependencies, libsodium-wrappers-sumo@^0.8.2, zod@^4.1.0, description, files, libsodium-wrappers-sumo, zod, license (+5 more)

### Community 347 - "AgentNoteEditor.tsx"
Cohesion: 0.27
Nodes (11): AGENT, buildAgentNote(), el(), EXISTING_NOTE_ID, FLOWCHART, para(), SEQUENCE, text() (+3 more)

### Community 348 - "tasks.ts (3)"
Cohesion: 0.23
Nodes (12): alignPaper(), baselineShift(), clearPaper(), KINDS, lastKeys, measureText(), paperKey, PaperSnap (+4 more)

### Community 350 - "BareEditorProbe"
Cohesion: 0.14
Nodes (4): BareEditorProbe, .isRequested, NativeEditorRepresentable, EditorRepresentable

### Community 351 - ".success"
Cohesion: 0.07
Nodes (27): .label, .body, .body, .body, InviteRow, .body, .body, PersonBadge (+19 more)

### Community 360 - "DatascratchTests (2)"
Cohesion: 0.15
Nodes (12): compilerOptions, baseUrl, declaration, jsx, lib, noEmit, paths, sourceMap (+4 more)

### Community 361 - "Pen Manual Test Checklist (iPad/iPhone)"
Cohesion: 0.15
Nodes (13): Open 10,000 Words Stress Test, 120 Hz Smoothness While Drawing, Delete and Undo with Marks, Stroke/Pixel Eraser and Lasso Move, iPhone Finger Drawing Toggle, Pen Latency Check vs Apple Notes, Metrics Overlay (FPS, open time, redraw time), Palette Use without Finger Drawing (+5 more)

### Community 362 - "XCTestCase"
Cohesion: 0.18
Nodes (3): BareEditorProbeTests, SessionEndedUITests, XCTest

### Community 364 - "Контракт: шифрование (v1) (2)"
Cohesion: 0.17
Nodes (12): package, product, dependencies, info, platform, settings, sources, type (+4 more)

### Community 369 - "mermaid.min.js (22)"
Cohesion: 0.21
Nodes (12): bH(), bHr(), fHr(), Fht(), gHr(), Nht(), Oht(), pHr() (+4 more)

### Community 372 - "_9n"
Cohesion: 0.04
Nodes (35): _9n(), Byr(), Cb(), l(), CEe(), cre(), a(), dJe() (+27 more)

### Community 373 - "nAr"
Cohesion: 0.33
Nodes (4): nAr(), ote(), r(), pz()

### Community 376 - "Datascratch"
Cohesion: 0.17
Nodes (12): config, archive, run, test, config, schemes, Datascratch, name (+4 more)

### Community 377 - "server (2)"
Cohesion: 0.17
Nodes (11): compilerOptions, lib, module, moduleResolution, noEmit, outDir, rootDir, types (+3 more)

### Community 378 - "inspect"
Cohesion: 0.29
Nodes (7): environment, if, name, needs, runs-on, timeout-minutes, inspect

### Community 379 - "agents-api.md (5)"
Cohesion: 0.17
Nodes (12): DS_DOMAIN_SECRET, DS_REGISTRY_TOKEN, DS_REGISTRY_USER, ENABLED, EVENT, HOST, KEY, KNOWN_HOSTS (+4 more)

### Community 380 - "server.yml"
Cohesion: 0.17
Nodes (12): with, cache-from, cache-to, context, file, labels, node-version, password (+4 more)

### Community 381 - "metrics.ts (2)"
Cohesion: 0.17
Nodes (12): env, APP_URL, CORS_ORIGINS, DATABASE_URL, DB_MIGRATE_ON_START, E2E_SERVER_URL, HOST, LOG_LEVEL (+4 more)

### Community 382 - "paste/markdown.ts"
Cohesion: 0.21
Nodes (10): CALLOUT_TONE, firstText(), highlight, inlineMath, lastText(), markdownToHtml(), marked, mathBlock (+2 more)

### Community 383 - "MathBlockView (2)"
Cohesion: 0.17
Nodes (11): dependsOn, outputs, dependsOn, $schema, tasks, build, lint, test (+3 more)

### Community 385 - ".decode (3)"
Cohesion: 0.29
Nodes (3): Base64URL, Data, .hexString

### Community 386 - "DSDateChip"
Cohesion: 0.10
Nodes (14): DateChipPreview, .body, DSDateChip, .body, .color, .model, DSDateChipModel, Tone (+6 more)

### Community 387 - "EditorDemo README"
Cohesion: 0.24
Nodes (10): Demo verification checklist, EditorDemo README, EditorDemo app, ios-editor.yml CI unsigned IPA artifact, Metrics menu (open time, redraw, FPS, 10k words), Profiling with Instruments (Points of Interest), Sideloadly / AltStore sideload, com.datascratch.editor signposts (+2 more)

### Community 393 - "createLinkingError"
Cohesion: 0.38
Nodes (11): createLinkingError(), doLink(), getCandidate(), getCandidates(), getLinkedNode(), HRr(), loadAstNode(), resolveMultiReference() (+3 more)

### Community 394 - "hjt"
Cohesion: 0.07
Nodes (28): cKr(), dQr(), gKr(), goe(), hjt(), ibt(), iF(), j5e() (+20 more)

### Community 398 - "shared/package.json"
Cohesion: 0.12
Nodes (17): concurrency, cancel-in-progress, group, environment, if, name, needs, permissions (+9 more)

### Community 399 - "steps (2) (2)"
Cohesion: 0.18
Nodes (11): if, name, needs, outputs, runs-on, timeout-minutes, images, postgres (+3 more)

### Community 400 - "build-test"
Cohesion: 0.06
Nodes (35): defaults, env, if, name, needs, runs-on, strategy, timeout-minutes (+27 more)

### Community 401 - "server.yml (2)"
Cohesion: 0.18
Nodes (10): concurrency, cancel-in-progress, group, runs-on, timeout-minutes, jobs, docker, name (+2 more)

### Community 403 - "metrics.ts (3)"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, module, moduleResolution, noEmit, rootDir, types, extends (+2 more)

### Community 404 - "ui/test/setup.ts"
Cohesion: 0.18
Nodes (3): @testing-library/jest-dom@^7.0.1, RO, @testing-library/jest-dom

### Community 406 - "CodingKeys (3)"
Cohesion: 0.20
Nodes (10): APIErrorCode, badRequest, conflict, deviceRevoked, forbidden, `internal`, notFound, payloadTooLarge (+2 more)

### Community 413 - "ios/project.yml"
Cohesion: 0.20
Nodes (9): configFiles, Debug, Release, include, path, relativePaths, name, settings (+1 more)

### Community 414 - "True (2) (2)"
Cohesion: 0.20
Nodes (9): compilerOptions, declaration, noEmit, outDir, rootDir, sourceMap, extends, include (+1 more)

### Community 415 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build, dev, e2e, e2e:build, lint, mock-server, preview (+2 more)

### Community 416 - "loadKatex"
Cohesion: 0.20
Nodes (9): compilerOptions, declaration, lib, noEmit, sourceMap, types, extends, include (+1 more)

### Community 417 - "Как подключить Claude или ChatGPT к Datascratch"
Cohesion: 0.20
Nodes (10): ChatGPT, Claude (claude.ai, приложение Claude, Claude Code), Агент без OAuth или свой скрипт, Если что-то не работает, Как подключить Claude или ChatGPT к Datascratch, Управление доступом, Что получит агент, Шаг 1. Включите режим «для агентов» у блокнота (+2 more)

### Community 418 - "compilerOptions (2) (2)"
Cohesion: 0.33
Nodes (10): steps, steps, steps, steps, continue-on-error, id, if, name (+2 more)

### Community 420 - "ios"
Cohesion: 0.06
Nodes (34): concurrency, cancel-in-progress, group, defaults, run, defaults, outputs, permissions (+26 more)

### Community 422 - "with (2) (2)"
Cohesion: 0.20
Nodes (10): with, cache, cache-from, cache-to, context, file, load, node-version (+2 more)

### Community 423 - "infra/README.md (3)"
Cohesion: 0.29
Nodes (7): backup.sh script, restore.sh script, json(), rnd(), smoke-test.sh script, uuid(), wait_health()

### Community 424 - "2026-10-25 (вторая половина дня) (2) (2)"
Cohesion: 0.38
Nodes (8): apt_install(), DEBIAN_FRONTEND, have(), installed(), log(), ours_on_443(), port_busy(), bootstrap.sh script

### Community 425 - "tokens.test.mjs (2)"
Cohesion: 0.20
Nodes (10): DS_DOMAIN, DS_SITE, web, container_name, depends_on, environment, image, ports (+2 more)

### Community 426 - "Запуск"
Cohesion: 0.20
Nodes (10): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, command, environment, image, restart, shm_size (+2 more)

### Community 427 - "ui/package.json (3)"
Cohesion: 0.20
Nodes (10): react@^19.3.1, react-dom@^19.3.1, tailwindcss@^4.3.3, react, react-dom, tailwindcss, peerDependencies, react@^19.0.0 (+2 more)

### Community 428 - "compat/package.json (2)"
Cohesion: 0.20
Nodes (9): compilerOptions, declaration, jsx, lib, noEmit, types, extends, include (+1 more)

### Community 431 - "katex"
Cohesion: 0.22
Nodes (8): iOS, name, options, bundleIdPrefix, createIntermediateGroups, deploymentTarget, settings, targets

### Community 439 - "EditorTextView (2)"
Cohesion: 0.22
Nodes (9): info, platform, settings, sources, type, path, excludes, path (+1 more)

### Community 440 - "decisions/README.md (3)"
Cohesion: 0.22
Nodes (8): 8. Совместная работа и шеринг, Гости (D-37), На будущее, «Открыть в приложении» (2026-10-28, по просьбе владельца), Реализация, С аккаунтом по почте (D-54, РЕШЕНО пользователем 2026-10-27), Ссылки в приложении на iPhone и iPad (D-56), Требования

### Community 443 - ".decode (3)"
Cohesion: 0.22
Nodes (9): services, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, env, image, options, ports (+1 more)

### Community 444 - "BlockLayoutFragment (2) (2)"
Cohesion: 0.22
Nodes (9): APP_URL, DATABASE_URL, DS_VERSION, NODE_OPTIONS, OAUTH_CLIENT_METADATA_DOCUMENTS, PORT, PUBLIC_URL, STORAGE_DIR (+1 more)

### Community 445 - "AgentsContext plugin-server interface (2)"
Cohesion: 0.33
Nodes (7): b64(), base, fetchImageBlocksPrivate(), post(), retry(), sleep(), uuidv7()

### Community 446 - "collab/reanchor.ts (2)"
Cohesion: 0.22
Nodes (7): base, docs, N, now, state, stored, t

### Community 447 - "deploy.yml"
Cohesion: 0.22
Nodes (9): scripts, bench, bench:memory, build, lint, test, test:memory, test:watch (+1 more)

### Community 450 - "web.yml"
Cohesion: 0.22
Nodes (8): compilerOptions, jsx, lib, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 451 - "Features"
Cohesion: 0.29
Nodes (4): Features, .calendar, .tabs, .tasks

### Community 452 - "DSFeedback"
Cohesion: 0.29
Nodes (6): DSFeedback, delete, selection, .sensoryFeedback, taskComplete, View

### Community 453 - "FrameRateBoost (2)"
Cohesion: 0.25
Nodes (8): target, dependencies, platform, settings, sources, type, dependencies, EditorDemoTests

### Community 454 - "mermaid.min.js (28)"
Cohesion: 0.29
Nodes (7): Mermaid MIT License, mermaid.js (Knut Sveidqvist), MIT License terms, mermaid.min.js, mermaid.min.js SHA-256 a8a6a6f8…3b9f — integrity checksum of the vendored file, Updating mermaid: replace from dist/, update version and checksum, keep version equal to web editor, Vendored resources

### Community 457 - "zKe"
Cohesion: 0.11
Nodes (21): Cdr(), dDr(), hDr(), iDr(), JDr(), kfr(), m(), p() (+13 more)

### Community 459 - "bie"
Cohesion: 0.33
Nodes (4): bie(), getComment(), vLr(), wNr()

### Community 466 - "ios/project.yml (2)"
Cohesion: 0.25
Nodes (8): iOS, options, bundleIdPrefix, createIntermediateGroups, deploymentTarget, developmentLanguage, groupSortPosition, xcodeVersion

### Community 467 - "CHANGELOG.md (2)"
Cohesion: 0.29
Nodes (8): App Store Connect API key (Admin role), Fallback Apple Distribution certificate (DIST_CERTIFICATE_P12), GitHub secrets APPLE_TEAM_ID / APP_STORE_CONNECT_*, TestFlight Internal Testing group and install on iPad from TestFlight app, Pushing tag ios-v* (e.g. ios-v0.1.0) starts the release workflow, «Missing Compliance» export-encryption question answered once (standard encryption), prune-ci-certs (certificate limit cleanup), ios-release workflow (TestFlight)

### Community 469 - "gate"
Cohesion: 0.07
Nodes (34): run, GH_REPO, GH_TOKEN, defaults, outputs, runs-on, steps, defaults (+26 more)

### Community 472 - "steps"
Cohesion: 0.15
Nodes (16): steps, GH_REPO, GH_TOKEN, steps, env, id, if, name (+8 more)

### Community 473 - "steps (4)"
Cohesion: 0.43
Nodes (8): steps, steps, if, name, run, uses, working-directory, steps

### Community 474 - "postgres"
Cohesion: 0.25
Nodes (8): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, env, image, options, ports, postgres

### Community 475 - "with (2) (2) (2)"
Cohesion: 0.50
Nodes (8): steps, if, name, run, uses, working-directory, steps, steps

### Community 476 - "compilerOptions (4)"
Cohesion: 0.20
Nodes (9): name, services, volumes, caddy_config, caddy_data, files, pgdata, x-logging (+1 more)

### Community 477 - "web"
Cohesion: 0.25
Nodes (8): postgres, condition, depends_on, env_file, image, restart, volumes, server

### Community 478 - "pen.spec.tsx"
Cohesion: 0.25
Nodes (7): compilerOptions, noEmit, outDir, rootDir, extends, include, ./tsconfig.json

### Community 479 - "peerDependencies (2)"
Cohesion: 0.25
Nodes (7): compilerOptions, lib, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 480 - "compilerOptions (3) (2)"
Cohesion: 0.25
Nodes (7): compilerOptions, lib, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 493 - "design.yml"
Cohesion: 0.12
Nodes (15): concurrency, cancel-in-progress, group, permissions, name, permissions, actions, contents (+7 more)

### Community 495 - "ios (2)"
Cohesion: 0.29
Nodes (7): paths, branches, paths, True, pull_request, push, workflow_dispatch

### Community 496 - "react"
Cohesion: 0.29
Nodes (6): concurrency, cancel-in-progress, group, name, permissions, contents

### Community 497 - "e2e-real-server"
Cohesion: 0.29
Nodes (7): runs-on, timeout-minutes, jobs, e2e-real-server, web-image, runs-on, timeout-minutes

### Community 498 - "contracts/sync.ts (2) (2)"
Cohesion: 0.48
Nodes (6): end(), have(), LC_ALL, pkg(), section(), inspect.sh script

### Community 500 - "ui/package.json (4)"
Cohesion: 0.29
Nodes (7): scripts, dev, lint, showcase:build, test, test:layout, typecheck

### Community 501 - "deploy-e2e"
Cohesion: 0.33
Nodes (6): targets, build, test, schemes, EditorDemo, targets

### Community 513 - "DSMotionToken (2) (2)"
Cohesion: 0.33
Nodes (4): extendedScreens(), isExtended(), @axe-core/playwright@^4, @axe-core/playwright

### Community 516 - "08-sharing.md (2) (3)"
Cohesion: 0.33
Nodes (5): D-54. Совместная работа по аккаунтам — простой вариант, Контекст, Решение, Чего не делаем, Этапы

### Community 518 - "secrets"
Cohesion: 0.29
Nodes (7): secrets, inspect, ready, environment, name, outputs, runs-on

### Community 521 - "test"
Cohesion: 0.33
Nodes (6): TEST_DATABASE_URL, test, env, runs-on, services, timeout-minutes

### Community 522 - "G6"
Cohesion: 0.33
Nodes (6): paths, branches, paths, True, pull_request, push

### Community 523 - "StrokePoint (2)"
Cohesion: 0.33
Nodes (6): run, web, working-directory, defaults, runs-on, timeout-minutes

### Community 524 - "web (2)"
Cohesion: 0.33
Nodes (6): paths, branches, paths, True, pull_request, push

### Community 525 - "EditorDemo README (2)"
Cohesion: 0.33
Nodes (6): with, cache, name, node-version, path, retention-days

### Community 526 - "options (2) (2)"
Cohesion: 0.33
Nodes (6): resources, memory, deploy, limits, deploy, deploy

### Community 529 - "D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления"
Cohesion: 0.40
Nodes (5): path, path, packages, DSDesign, DSEditor

### Community 530 - "Открытые вопросы (3)"
Cohesion: 0.40
Nodes (5): platform, settings, sources, type, EditorDemoUITests

### Community 555 - "test-vectors/tsconfig.json"
Cohesion: 0.40
Nodes (5): NODE_ENV, VITE_DS_EXTENDED_MODE, VITE_DS_SERVER_URL, VITE_DS_TEST_HOOKS, env

### Community 556 - "lowlight"
Cohesion: 0.40
Nodes (5): interval, retries, test, timeout, healthcheck

### Community 561 - "scripts (2) (2)"
Cohesion: 0.50
Nodes (3): IPHONEOS_DEPLOYMENT_TARGET, MACOSX_DEPLOYMENT_TARGET, build-xcframework.sh script

### Community 583 - "CHANGELOG.md (4)"
Cohesion: 0.50
Nodes (4): fetch-image: адрес не журналируется, ds_fetch_image_total, Журналы без данных пользователей (белый список полей), GET /metrics (Prometheus, METRICS_TOKEN), Метрики: METRICS_TOKEN → GET /metrics (Prometheus)

### Community 585 - "deploy-e2e (2)"
Cohesion: 0.50
Nodes (4): name, runs-on, timeout-minutes, deploy-e2e

### Community 586 - "Demo/project.yml"
Cohesion: 0.83
Nodes (3): q(), remote(), remote.sh script

### Community 587 - "@tiptap/extension-code-block-lowlight"
Cohesion: 0.50
Nodes (4): yjs@^13.6.27, yjs, peerDependencies, yjs@^13.6.0

### Community 588 - "@datascratch/design-tokens — токены «Тихая бумага» (2)"
Cohesion: 0.50
Nodes (3): printWidth, singleQuote, trailingComma

### Community 631 - "DSSuggestionList (2) (2)"
Cohesion: 0.67
Nodes (3): import, types, ./crypto

### Community 633 - "./strokes"
Cohesion: 0.67
Nodes (3): ./strokes, import, types

### Community 634 - "ui/package.json (5)"
Cohesion: 0.67
Nodes (3): exports, ./fonts.css, ./styles.css

### Community 635 - "@tiptap/react@^3.32.0"
Cohesion: 1.00
Nodes (3): Web editor showcase page (index.html), Module entry script /demo/main.tsx, Root mount element #root

## Ambiguous Edges - Review These
- `0030-server-database-postgresql.md` → `Shared for the whole account: app settings, account, keys, devices, agent grants`  [AMBIGUOUS]
  docs/decisions/0048-isolated-spaces.md · relation: references
- `Account-wide (shared across spaces): app settings (theme, language, pen), account, keys, devices, agent grants` → `D-30 БД сервера`  [AMBIGUOUS]
  docs/decisions/0048-isolated-spaces.md · relation: references

## Knowledge Gaps
- **1637 isolated node(s):** `.body`, `onboarding`, `.phase`, `.isLocalOnlyTesting`, `.linkHost` (+1632 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 5650 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **66 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Чип даты (одинаково на iOS и в вебе): «Сегодня/Завтра/Вчера», день недели на 2–6 дней вперёд, иначе короткая дата; цвета danger/warning/accent/text.tertiary` connect `DSDesign Swift package (iOS 26, Swift 6) — «Тихая бумага» design system tokens + SwiftUI components` to `cn`, `DSDateChip`, `scripts/generate.mjs`, `Foundation`?**
  _High betweenness centrality (0.242) - this node is a cross-community bridge._
- **Are the 370 inferred relationships involving `t()` (e.g. with `accept()` and `ACTION()`) actually correct?**
  _`t()` has 370 INFERRED edges - model-reasoned connections that need verification._
- **What connects `.body`, `onboarding`, `.phase` to the rest of the system?**
  _1637 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `mermaid.min.js` be split into smaller, more focused modules?**
  _Cohesion score 0.001738712879447568 - nodes in this community are weakly interconnected._
- **Why does `DSDateChipModel` connect `DSDateChip` to `DSDesign Swift package (iOS 26, Swift 6) — «Тихая бумага» design system tokens + SwiftUI components`, `Sendable`, `MarkSet`, `InkController (2)`?**
  _High betweenness centrality (0.178) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `0030-server-database-postgresql.md` and `Shared for the whole account: app settings, account, keys, devices, agent grants`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Account-wide (shared across spaces): app settings (theme, language, pen), account, keys, devices, agent grants` and `D-30 БД сервера`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._