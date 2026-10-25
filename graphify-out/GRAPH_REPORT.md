# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 184 files · ~56,855 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 4, .css 3)

## Summary
- 2060 nodes · 3991 edges · 132 communities (117 shown, 15 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 304 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9494a85f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Скрипт обновления графа
- Новая группа
- 0006-finger-drawing-iphone.md
- Платформы и клиенты (2)
- components.test.tsx
- DSBackdrop
- DSPenSelection
- Правила для ИИ и документации (3)
- SwiftUI
- with
- overview.md
- DSTypeToken
- Tokens.generated.swift
- 0031-crdt-yjs.md
- tasks
- react
- Технологический стек — РЕШЕНО (2026-10-25)
- stack.md
- 06-data-server.md
- PenToolbar.tsx
- 0024-product-name.md
- open-questions.md (2)
- 1. Концепция продукта
- 07-encryption.md
- Server stack
- DSTaskRow
- 09-agents-api.md
- Правила для ИИ и документации (4)
- glossary.md
- tokens.ts
- DSDateChip
- 0011-handwriting-for-agents.md (4)
- Stage 0: Preparation (done)
- Компоненты стека
- Обзор архитектуры: разделы
- Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1)
- D-23. Документация — источник истины; Graphify — граф знаний поверх неё
- 06-data-server.md (2) (3)
- data-model.md
- 2026-10-25
- Контракт: дизайн-токены «Тихая бумага» (v1)
- roadmap.md
- Datascratch — правила для ИИ (CLAUDE.md)
- 02-platforms.md (2)
- Хранение в БД и редактор
- D-02. Отдельной десктоп-версии нет, на компьютере — веб
- PostgreSQL
- 01-concept.md (2)
- Монорепозиторий и CLAUDE.md (2)
- Модель данных и глоссарий
- Компоненты стека (2) (2)
- Дизайн и организация (2)
- 10-sync.md
- Foundations.stories.tsx
- 0009-notebook-mode-choice.md (5)
- 0011-handwriting-for-agents.md (2)
- risks.md
- View
- 0005-living-stroke.md (2)
- 0025-no-redis.md
- Процесс разработки и Graphify (2)
- 06-data-server.md (2) (4)
- 0009-notebook-mode-choice.md (6)
- DSShadowModifier
- DSFormatBarItem
- 0005-living-stroke.md (4)
- DSDocRow
- 0009-notebook-mode-choice.md
- 04-editor.md (4)
- DSShowcase
- .animation
- D-21. Технологический стек (2)
- Компоненты стека (2)
- D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS)
- Процесс разработки (docs/development.md)
- Дизайн и организация (2) (2)
- 06-data-server.md (2) (5)
- 01-concept.md (2) (2)
- 0005-living-stroke.md
- 02-platforms.md
- 05-organization-design.md
- Sendable
- 0009-notebook-mode-choice.md (7)
- open-questions.md
- Datascratch — правила для ИИ
- design.yml
- D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS) (2)
- Organization Hierarchy (Account > Space > Notebook > Folder > Note)
- 01-concept.md
- Toast.tsx
- 04-editor.md (2)
- 0011-handwriting-for-agents.md (3)
- 2. Платформы
- SplitMix64
- Контракт: шифрование (v1)
- @datascratch/design-tokens — токены «Тихая бумага»
- 0009-notebook-mode-choice.md (5) (2)
- pnpm-workspace.yaml
- iOS-стек и два языка (2)
- scripts
- @datascratch/ui — веб-компоненты «Тихая бумага»
- True
- Новая группа (2)
- ios
- Graphify
- .path
- 3. Apple Pencil в тексте — ключевая фича
- D-32. Минимальная версия iOS/iPadOS — 26 (2)
- D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления
- @tailwindcss/vite
- vitest
- D-35. Пометка на удалённом тексте исчезает вместе с ним
- D-36. Структура: пространство → блокноты → папки
- D-38. Дизайн-направление — «Тихая бумага», ориентир Craft
- D-41. Набор функций по мотивам Craft
- DSInkToken
- Контракты между частями системы
- D-33. Bundle ID — com.datascratch.app (2)
- D-37. Гости по ссылке рисуют; ссылка живёт до отзыва
- D-40. Хостинг — позже; сервер готов к запуску одной командой
- exports
- Package.swift
- agents/README.md
- web-editor/README.md
- pnpm-workspace.yaml (2)
- Новая группа (3)
- 0025-no-redis.md
- 0014-organization.md
- Infrastructure stack

## God Nodes (most connected - your core abstractions)
1. `cn()` - 90 edges
2. `react` - 42 edges
3. `DSTintToken` - 38 edges
4. `DSRGBA` - 31 edges
5. `DSColorToken` - 25 edges
6. `.content` - 24 edges
7. `lucide-react` - 21 edges
8. `useStrings()` - 21 edges
9. `DSDesign Swift package (iOS 26, Swift 6)` - 21 edges
10. `DSTypeToken` - 20 edges

## Surprising Connections (you probably didn't know these)
- `2. Поля штриха` --references--> `block()`  [INFERRED]
  docs/architecture/contracts/strokes.md → packages/design-tokens/scripts/generate.mjs
- `3. Упаковка точек` --references--> `block()`  [INFERRED]
  docs/architecture/contracts/strokes.md → packages/design-tokens/scripts/generate.mjs
- `design.yml workflow` --semantically_similar_to--> `design.yml CI workflow (macOS)`  [INFERRED] [semantically similar]
  docs/changelog.d/2026-10-25-design-system-v1.md → apps/ios/Packages/DSDesign/README.md
- `Фрагменты журнала изменений` --references--> `main()`  [INFERRED]
  docs/changelog.d/README.md → packages/design-tokens/scripts/generate.mjs
- `Решение` --references--> `main()`  [INFERRED]
  docs/decisions/0039-parallel-sessions.md → packages/design-tokens/scripts/generate.mjs

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **iOS-Web Compatibility Without Shared Core** — docs_architecture_overview_no_shared_core, docs_architecture_stack_yrs, docs_architecture_stack_yjs, docs_architecture_stack_libsodium, docs_architecture_overview_test_vectors_package [EXTRACTED 1.00]
- **Поддержание графа Graphify: D-29, git-хук для кода, graphify_docs.py для документов, граф в репозитории** — docs_changelog_graphify_workflow_fixed, docs_changelog_graphify_docs_tool_added, docs_decisions_0029_graphify_workflow_d29, docs_decisions_0029_graphify_workflow_git_hook, tools_graphify_docs, docs_decisions_0029_graphify_workflow_graph_committed [EXTRACTED 1.00]
- **Двухслойная модель графа Graphify и кто обновляет каждый слой** — docs_decisions_0029_graphify_workflow_structural_layer, docs_decisions_0029_graphify_workflow_semantic_layer, docs_decisions_0029_graphify_workflow_git_hook, docs_decisions_0029_graphify_workflow_graphify_docs_script, docs_development_two_layer_graph [EXTRACTED 1.00]
- **Тихая бумага design system packages (tokens, web UI, iOS)** — packages_design_tokens_readme_design_tokens_package, packages_ui_readme_ui_package, apps_ios_packages_dsdesign_readme_dsdesign_package, packages_design_tokens_readme_tokens_json [EXTRACTED 1.00]
- **tokens.json generation pipeline** — packages_design_tokens_readme_tokens_json, packages_design_tokens_readme_generate_mjs, packages_design_tokens_readme_tokens_css, packages_design_tokens_readme_theme_css, packages_design_tokens_readme_index_js, apps_ios_packages_dsdesign_sources_dsdesign_tokens_generated [EXTRACTED 1.00]
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
- **Cross-platform date chip rules** — packages_ui_readme_datelabel, apps_ios_packages_dsdesign_readme_dsdatechipmodel, packages_ui_readme_datechip [INFERRED 0.85]

## Communities (132 total, 15 thin omitted)

### Community 0 - "Скрипт обновления графа"
Cohesion: 0.06
Nodes (53): 1. Где хранятся, 2. Поля штриха, 3. Упаковка точек, 4. Привязка к тексту (живой штрих), 5. Отрисовка толщины, 6. Тестовые векторы, Контракт: рукописные штрихи (v1), Фрагменты журнала изменений (+45 more)

### Community 1 - "Новая группа"
Cohesion: 0.05
Nodes (58): D-15 Design principle, D-38 Design system decision, D-39 design-system stream, design-tokens contract (docs/architecture/contracts/design-tokens.md), design.yml CI workflow (macOS), DSAvatar / DSAvatarStack, DSBackdrop / DSGrain, DSButtonStyle (+50 more)

### Community 2 - "0006-finger-drawing-iphone.md"
Cohesion: 0.14
Nodes (12): .color, .uiColor, .color, .uiColor, DSBackdropBlob, DSBackdropSpec, DSColorPair, DSRGBA (+4 more)

### Community 3 - "Платформы и клиенты (2)"
Cohesion: 0.10
Nodes (40): DateChipProps, tones, Calendar(), CalendarProps, DatePicker(), DatePickerProps, Popover, PopoverAnchor (+32 more)

### Community 4 - "components.test.tsx"
Cohesion: 0.09
Nodes (44): Button, buttonClasses(), Checkbox, TaskCheckbox, Dialog, DialogClose, DialogContent, DialogContentProps (+36 more)

### Community 5 - "DSBackdrop"
Cohesion: 0.25
Nodes (5): BackdropGallery, .body, DSBackdrop, .body, DSGrain

### Community 6 - "DSPenSelection"
Cohesion: 0.10
Nodes (18): DSPenSelection, .color, .points, DSPenTool, eraser, .hasColor, highlighter, lasso (+10 more)

### Community 7 - "Правила для ИИ и документации (3)"
Cohesion: 0.08
Nodes (57): Backdrop(), DocCard, CommandGroup(), CommandItem(), CommandItemProps, CommandPalette(), CommandPaletteProps, useCommandPaletteShortcut() (+49 more)

### Community 8 - "SwiftUI"
Cohesion: 0.14
Nodes (12): Animation, DSAnimationModifier, .animation, View, DSSpringSpec, DSMotionToken, gentle, smooth (+4 more)

### Community 9 - "with"
Cohesion: 0.24
Nodes (11): steps, if, name, run, uses, with, steps, cache (+3 more)

### Community 10 - "overview.md"
Cohesion: 0.15
Nodes (20): agent_tokens / agent_audit_log Tables, Agent Edit Flow (agent notebook), Accounts, OAuth, Tokens Service, edit_note MCP Tool, External AI Agents, Handwriting-to-PNG Render (pg-boss queue), Key Store (agent notebooks), MCP + REST API (+12 more)

### Community 11 - "DSTypeToken"
Cohesion: 0.12
Nodes (12): DSFontModifier, View, DSTypeToken, body, callout, caption, footnote, h1 (+4 more)

### Community 12 - "Tokens.generated.swift"
Cohesion: 0.09
Nodes (23): .color, DSBackdropToken, dusk, ember, meadow, mist, sand, DSDocumentWidth (+15 more)

### Community 13 - "0031-crdt-yjs.md"
Cohesion: 0.14
Nodes (21): Custom pen renderer (Metal vs Core Animation TBD), End-to-end encryption, iOS client stack, Node.js + TypeScript server, Swift 6, SwiftUI (shell), TypeScript, UIKit + TextKit 2 (editor) (+13 more)

### Community 14 - "tasks"
Cohesion: 0.10
Nodes (20): DSGlassPanel, .body, GlassPreview, .body, View, Color, .dsAccent, .dsCanvas (+12 more)

### Community 15 - "react"
Cohesion: 0.08
Nodes (26): BackdropProps, ButtonProps, ButtonSize, ButtonVariant, sizes, variants, Card, CardProps (+18 more)

### Community 16 - "Технологический стек — РЕШЕНО (2026-10-25)"
Cohesion: 0.10
Nodes (18): ButtonsPreview, .body, ButtonStyle, DSButtonBody, .body, .fill, .foreground, .height (+10 more)

### Community 17 - "stack.md"
Cohesion: 0.12
Nodes (22): File Storage (disk or external S3), iOS / iPadOS Client (Swift, TextKit 2, Yrs, GRDB), Sync / Realtime Service, Web PWA Client (React, TipTap, Yjs, IndexedDB), Astro (landing page), Dexie (IndexedDB), Drizzle ORM, Fastify (+14 more)

### Community 18 - "06-data-server.md"
Cohesion: 0.10
Nodes (18): 6. Модель данных и сервер, Daily off-VPS backups of DB and files with verified restore (R-11), Metadata: title, tags, links, dates, space, folder, Self-hosting, Модель данных (общий обзор; детали — `architecture/data-model.md`), Резервные копии, Сервер, Real-time co-editing with cursors and presence (guests shown as 'Guest') (+10 more)

### Community 19 - "PenToolbar.tsx"
Cohesion: 0.09
Nodes (26): DocGrid(), DocGridProps, DocList(), DocListProps, DocRow, DocRowProps, FormatToolbar(), COLOR_NAMES (+18 more)

### Community 20 - "0024-product-name.md"
Cohesion: 0.10
Nodes (24): dependencies, clsx@^2.1.1, cmdk@^1.1.1, @datascratch/design-tokens@workspace:*, @fontsource-variable/inter@^5.3.0, @fontsource-variable/jetbrains-mono@^5.3.0, @fontsource-variable/source-serif-4@^5, lucide-react@^1.61.0 (+16 more)

### Community 21 - "open-questions.md (2)"
Cohesion: 0.09
Nodes (17): .color, DSColorToken, accent, bgCanvas, bgElevated, bgSidebar, bgSurface, danger (+9 more)

### Community 22 - "1. Концепция продукта"
Cohesion: 0.33
Nodes (6): 1. Концепция продукта, Аудитория (D-12), Главные принципы, Почему не существующие приложения, Связанные решения, Суть в одном абзаце

### Community 23 - "07-encryption.md"
Cohesion: 0.11
Nodes (18): D-04. Одновременно сквозное шифрование и доступ по API, End-to-end encryption vs agent API access conflict, Local MCP bridge (future), Контекст, Последствия, Решение, D-09. Режим блокнота выбирается при создании, сменить можно позже, Решение (+10 more)

### Community 24 - "Server stack"
Cohesion: 0.20
Nodes (11): Canvas + Pointer Events, Dexie (IndexedDB), Drizzle ORM, Fastify, MCP TypeScript SDK, OAuth 2.1, Radix + Tailwind + Motion, Server stack (+3 more)

### Community 25 - "DSTaskRow"
Cohesion: 0.09
Nodes (19): DSCheckmark, DSTaskCheckbox, .body, .isDone, DSTaskState, cancelled, done, open (+11 more)

### Community 26 - "09-agents-api.md"
Cohesion: 0.13
Nodes (16): D-11. Рукопись для агента — рендер в картинку (PNG), Решение, Handwriting Format for Agents (PNG), Export: Markdown, PDF, HTML (handwriting as images), Server responsibilities: accounts, encrypted relay, attachments, realtime, API/MCP, handwriting PNG render, 9. API и внешние ИИ-агенты, Handwriting rendered to PNG for agents with text annotation (D-11), MCP tools sketch (list_spaces, list_notebooks, search_notes, read_note, get_handwriting_image, create_note, edit_note, add_comment, get_backlinks) (+8 more)

### Community 27 - "Правила для ИИ и документации (4)"
Cohesion: 0.18
Nodes (11): AvatarPreview, .body, DSAvatar, .body, .presenceLabel, DSAvatarStack, .body, DSPresence (+3 more)

### Community 28 - "glossary.md"
Cohesion: 0.14
Nodes (23): Automerge (fallback CRDT), GitHub Actions CI (incl. macOS iOS builds), Custom iOS Pen Render Layer (Metal or Core Animation), TextKit 2 (UIKit editor), TipTap (ProseMirror), XcodeGen, Yjs, Yrs (Rust Yjs) with Swift Wrapper (+15 more)

### Community 29 - "tokens.ts"
Cohesion: 0.09
Nodes (29): Avatar(), AvatarProps, AvatarStack(), AvatarStackProps, initials(), Presence, Badge(), BadgeProps (+21 more)

### Community 30 - "DSDateChip"
Cohesion: 0.06
Nodes (24): DateChipPreview, .body, DSDateChip, .body, .color, .model, DSDateChipModel, Tone (+16 more)

### Community 31 - "0011-handwriting-for-agents.md (4)"
Cohesion: 0.12
Nodes (16): DSEmptyState, .body, .body, .foreground, DSTintToken, blue, gray, green (+8 more)

### Community 32 - "Stage 0: Preparation (done)"
Cohesion: 0.07
Nodes (21): Процесс разработки: облако + Mac, сборка iOS в CI, XcodeGen предложен (D-28), D-19. Весь код пишет Claude, Последствия, Решение, D-23. Документация — источник истины; Graphify — граф знаний поверх неё, docs/history session log, Контекст, Последствия (+13 more)

### Community 33 - "Компоненты стека"
Cohesion: 0.11
Nodes (18): BackdropBlob, BackdropName, BackdropSpec, ColorName, DurationName, HighlightName, InkName, MotionName (+10 more)

### Community 34 - "Обзор архитектуры: разделы"
Cohesion: 0.15
Nodes (13): ChipsPreview, .body, DSBadge, .body, .colors, DSTagChip, .body, Style (+5 more)

### Community 35 - "Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1)"
Cohesion: 0.10
Nodes (18): apps/ios — iPhone + iPad, iOS universal app (Swift 6, SwiftUI shell, UIKit + TextKit 2 editor, GRDB, Yrs, libsodium), XcodeGen project.yml (D-28), apps/server — сервер, Server app (Node.js + TypeScript, Fastify, Drizzle/PostgreSQL, pg-boss, WebSocket, MCP SDK, OAuth 2.1), apps/web — веб-клиент, Web client app (Vite + React + TS PWA, TipTap + Yjs, Canvas pen, Dexie, Radix + Tailwind + Motion), iPhone and iPad share one codebase (universal app) (+10 more)

### Community 36 - "D-23. Документация — источник истины; Graphify — граф знаний поверх неё"
Cohesion: 0.14
Nodes (12): D-07. Распознавание рукописи в текст — не делаем, iOS system Scribble support, Решение, Handwriting input types (text marks, margin notes, drawing block, drawing on images, Scribble), Pencil feel: PencilKit-level latency, predicted/coalesced touches, 120 fps, Pencil gestures (zigzag delete, underline, strike, lasso), Prototype open questions (multi-word circles, deleted marked text R-04), Stroke point anchoring: character anchor + dx/dy in font-size units (+4 more)

### Community 37 - "06-data-server.md (2) (3)"
Cohesion: 0.11
Nodes (17): description, exports, ./theme.css, ./tokens.css, ./tokens.json, files, main, name (+9 more)

### Community 38 - "data-model.md"
Cohesion: 0.22
Nodes (11): Anchor (textRange / paragraph / drawingBlock / image), Note, Stroke, StrokePoint, Заметка, Иерархия организации, Модель данных — ЧЕРНОВИК, Сервер (PostgreSQL, черновик этапа 3) (+3 more)

### Community 39 - "2026-10-25"
Cohesion: 0.09
Nodes (20): 2026-10-25, Развёрнута документация: ТЗ, архитектура, ADR D-01…D-31, план, открытые вопросы, риски, процесс, глоссарий, Создан CLAUDE.md и скелет монорепозитория (apps/, packages/, infra/), Обоснованы PostgreSQL (D-30) и Yjs (D-31) как отдельные решения, Прототип пера хранит текст в Yrs (D-27), Журнал изменений, D-27. В прототипе пера текст хранится в Yrs, Контекст (+12 more)

### Community 40 - "Контракт: дизайн-токены «Тихая бумага» (v1)"
Cohesion: 0.24
Nodes (9): CardsPreview, .body, DSCard, .body, DSDocCard, .body, View, .background (+1 more)

### Community 41 - "roadmap.md"
Cohesion: 0.16
Nodes (11): D-08. Аннотации PDF пером — не в MVP, PDF pen annotations (PDFKit + stroke layer), Решение (предложение), D-16. Импорт — не сейчас, Решение, PDF Annotations Not in MVP, R-08 Huge Project Scope, Stage 2: Local MVP on iPad and iPhone (+3 more)

### Community 42 - "Datascratch — правила для ИИ (CLAUDE.md)"
Cohesion: 0.12
Nodes (16): Перед любой работой: порядок чтения, Datascratch — правила для ИИ (CLAUDE.md), Datascratch — приложение заметок (Obsidian + Notesnook, перо в тексте), Статусы решений: РЕШЕНО / ПРЕДЛОЖЕНО / ОТКРЫТО, Доступ внешних ИИ-агентов через MCP/REST, Apple Pencil в тексте — ключевая фича и главный риск, Запись итогов сессии docs/history/ГГГГ-ММ-ДД-session-NN.md, Сохранён передаточный документ history/2026-10-25-handoff.md (в части стека устарел) (+8 more)

### Community 43 - "02-platforms.md (2)"
Cohesion: 0.16
Nodes (12): D-13. Совместная работа: шеринг по ссылке, правка без аккаунта, реальное время, Link sharing with editing without account, Universal Links (paid Apple Developer account), Последствия, Решение, 8. Совместная работа и шеринг, Guest editing without account in any browser, Share links with view/edit rights, expiry and revocation (+4 more)

### Community 44 - "Хранение в БД и редактор"
Cohesion: 0.15
Nodes (12): Obsidian (reference product: links, backlinks, tags, Markdown export), 4. Редактор, Backlinks, iOS editor: UIKit + TextKit 2, Link graph view (not in MVP, stage 6), Web editor: TipTap (ProseMirror) + Yjs, [[ ]] links with autocomplete, Платформенная реализация (+4 more)

### Community 45 - "D-02. Отдельной десктоп-версии нет, на компьютере — веб"
Cohesion: 0.14
Nodes (15): devDependencies, turbo@^2.3.0, typescript@^5.6.0, engines, node, typescript, name, packageManager (+7 more)

### Community 46 - "PostgreSQL"
Cohesion: 0.31
Nodes (9): doc_snapshots Table (compacted snapshots, version history), doc_updates Table (encrypted Yjs updates), Server PostgreSQL Schema (Stage 3 Draft), docker compose Self-Hosting (server + PostgreSQL), pg-boss Job Queue, PostgreSQL, Snapshot, Yjs History Compaction under Encryption (+1 more)

### Community 47 - "01-concept.md (2)"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution (+7 more)

### Community 48 - "Монорепозиторий и CLAUDE.md (2)"
Cohesion: 0.27
Nodes (7): DSSidebarItem, DSSidebarSection, .body, .isExpanded, SidebarPreview, .body, .sidebar

### Community 49 - "Модель данных и глоссарий"
Cohesion: 0.36
Nodes (7): Стартовый хук Claude Code (.claude/hooks/session-start.sh), git-хук Graphify (пересборка только по изменённому коду), Graphify 0.9.95 (пакет graphifyy), Смысловой слой графа (понятия, решения, связи — проход ИИ), Структурный слой графа (код, файлы, заголовки — без ИИ), Автоматизация: стартовый хук, git-хук, graphify update после git pull, Установка Graphify на Mac (brew install uv, uv tool install graphifyy)

### Community 50 - "Компоненты стека (2) (2)"
Cohesion: 0.28
Nodes (7): Добавлен tools/graphify_docs.py (prepare / finish / label) — обновление графа после правки документов, finish(), label(), _line_count(), prepare(), _read(), _write()

### Community 51 - "Дизайн и организация (2)"
Cohesion: 0.14
Nodes (12): D-01. Хранение заметок — в базе данных на своём сервере, не в файлах, Markdown files option (rejected), Obsidian, Own server storage, Контекст, Последствия, Рассмотренные варианты, Решение (+4 more)

### Community 52 - "10-sync.md"
Cohesion: 0.11
Nodes (17): D-10. Правки агента применяются сразу, подсвечиваются, откатываются через историю, Suggestions for approval (rejected), Version history, Рассмотренные варианты, Решение, Attachments as separate encrypted files, on-demand resumable download, Agent edits applied immediately, highlighted, revertible via history (D-10), 10. Синхронизация и офлайн (+9 more)

### Community 53 - "Foundations.stories.tsx"
Cohesion: 0.12
Nodes (11): backdropNames, colorNames, highlightNames, inkNames, tintNames, tokens, Provider(), Backdrops() (+3 more)

### Community 54 - "0009-notebook-mode-choice.md (5)"
Cohesion: 0.23
Nodes (8): DSSkeleton, .body, DSSkeletonLines, .body, DSSpinner, .body, SkeletonPreview, .body

### Community 55 - "0011-handwriting-for-agents.md (2)"
Cohesion: 0.21
Nodes (7): DSFeedback, delete, selection, .sensoryFeedback, taskComplete, DSHaptics, View

### Community 56 - "risks.md"
Cohesion: 0.22
Nodes (10): Guest via Link (web, no account), Canvas + Pointer Events Pen Layer, Universal Links, Apple Developer Account, Guest Pen Drawing and Link Lifetime, R-07 Web Pen Worse than Native, R-09 Graphify Is a Young Third-Party Tool, R-12 No Paid Apple Account (7-day installs) (+2 more)

### Community 57 - "View"
Cohesion: 0.18
Nodes (9): Axis, horizontal, vertical, DSPenToolbar, .body, .separator, .stack, .swatches (+1 more)

### Community 58 - "0005-living-stroke.md (2)"
Cohesion: 0.21
Nodes (11): Убран MinIO (D-26): файлы на диске, внешнее S3 — опционально, D-26. Хранение файлов: диск по умолчанию, внешнее S3 — опционально; без MinIO, Server disk folder storage (default), External S3-compatible storage (Hetzner, R2, B2), File storage interface (two implementations, chosen by config), Garage / SeaweedFS, MinIO (rejected), Контекст (+3 more)

### Community 59 - "0025-no-redis.md"
Cohesion: 0.21
Nodes (9): D-12. Аудитория — в первую очередь для себя, Single VPS, single process server, Последствия, Решение, D-18. Монетизация — не решена; архитектура готова к self-hosting, Monetization options: subscription, one-time, open source + paid hosting, Контекст, Решение (на сейчас) (+1 more)

### Community 60 - "Процесс разработки и Graphify (2)"
Cohesion: 0.15
Nodes (13): devDependencies, jsdom@^30.1.3, @ladle/react@^5.1.1, react@^19.3.1, @testing-library/user-event@^14.6.8, @types/react@^19.3.0, @types/react-dom@^19.3.0, typescript@^5.9.3 (+5 more)

### Community 61 - "06-data-server.md (2) (4)"
Cohesion: 0.15
Nodes (5): @testing-library/jest-dom@^7.0.1, @testing-library/react@^16.3.3, RO, @testing-library/jest-dom, @testing-library/react

### Community 62 - "0009-notebook-mode-choice.md (6)"
Cohesion: 0.29
Nodes (11): DSStrings, .away, .cancelled, .collapse, .collapsed, .done, .expand, .expanded (+3 more)

### Community 63 - "DSShadowModifier"
Cohesion: 0.20
Nodes (7): DSShadowModifier, View, DSShadowToken, card, .dark, .light, popover

### Community 64 - "DSFormatBarItem"
Cohesion: 0.20
Nodes (11): DSFormatBar, .body, DSFormatBarButton, .body, DSFormatBarElement, .id, item, separator (+3 more)

### Community 65 - "0005-living-stroke.md (4)"
Cohesion: 0.17
Nodes (11): 1. Три вида документов Yjs, 2. Документ `account`, 3. Документ `notebook` (индекс блокнота), 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note` (+3 more)

### Community 66 - "DSDocRow"
Cohesion: 0.19
Nodes (10): DocRowPreview, .body, DSDocGrid, .body, DSDocIcon, emoji, symbol, DSDocRow (+2 more)

### Community 67 - "0009-notebook-mode-choice.md"
Cohesion: 0.17
Nodes (12): Критерии приёмки, План разработки, Подготовка, Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad), Этап 2 — MVP на iPad и iPhone, локально (+4 more)

### Community 68 - "04-editor.md (4)"
Cohesion: 0.31
Nodes (5): DSSegment, .id, DSSegmentedControl, SegmentedPreview, .body

### Community 70 - ".animation"
Cohesion: 0.28
Nodes (4): .body, .disclosure, .animation, withDSAnimation()

### Community 71 - "D-21. Технологический стек (2)"
Cohesion: 0.18
Nodes (10): 1. Иерархия ключей, 2. Вывод ключей из пароля, 3. Формат шифротекста (конверт), 4. Ключ восстановления, 5. Смена пароля, 6. Вложения, 7. Шеринг по ссылке, 8. Режим «для агентов» (R-10) (+2 more)

### Community 72 - "Компоненты стека (2)"
Cohesion: 0.18
Nodes (11): Утверждён технологический стек (D-21), отказ от ядра на Rust (D-22), D-21. Технологический стек, Контекст, Последствия, Рассмотренные варианты (по обсуждению 2026-10-25), Решение, D-22. Без собственного общего ядра на Rust, Контекст (+3 more)

### Community 73 - "D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS)"
Cohesion: 0.18
Nodes (10): dependsOn, outputs, $schema, tasks, build, lint, test, typecheck (+2 more)

### Community 74 - "Процесс разработки (docs/development.md)"
Cohesion: 0.31
Nodes (8): D-23 (документация), D-19 (код пишет Claude), D-28 (облако + Mac, CI), GitHub Actions на macOS — проверка сборки iOS, Процесс разработки (docs/development.md), Роли: пользователь — владелец продукта, Claude — пишет код и docs, Две среды: облачная сессия Claude Code (Linux) и Mac пользователя, XcodeGen (apps/ios/project.yml, ПРЕДЛОЖЕНО)

### Community 75 - "Дизайн и организация (2) (2)"
Cohesion: 0.20
Nodes (9): Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1), Общее, Служебное, Токены агентов (`spec/09-agents-api.md`) (+1 more)

### Community 76 - "06-data-server.md (2) (5)"
Cohesion: 0.20
Nodes (9): 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05), 6. Права, 7. Коды ошибок, 8. Тестовые векторы (+1 more)

### Community 77 - "01-concept.md (2) (2)"
Cohesion: 0.24
Nodes (7): Порядок работы с Graphify (D-29); граф построен и хранится в репозитории, D-29. Graphify: порядок работы, чтобы граф был всегда актуален, R-09 (риск: Graphify сломается или исчезнет), Контекст, Последствия, Решение, Раскладка graphify-out/ и что хранится в git

### Community 78 - "0005-living-stroke.md"
Cohesion: 0.24
Nodes (6): D-05. Перо при перекладке текста — вариант А «живой штрих», PencilKit (rejected), Гипотеза реализации, Контекст, Последствия, Решение

### Community 79 - "02-platforms.md"
Cohesion: 0.12
Nodes (16): D-06. Рисование пальцем на iPhone — да, опционально, Finger drawing toggle on iPhone, Решение, D-17. Языки интерфейса — русский и английский, без RTL, Russian and English UI, no RTL, Решение, 2. Платформы, UI languages Russian and English, no RTL (D-17) (+8 more)

### Community 80 - "05-organization-design.md"
Cohesion: 0.12
Nodes (16): D-15. Дизайн — основная концепция продукта, Design references: Things 3, Linear, Craft, Arc, Последствия, Решение, 5. Организация заметок и дизайн, Light/dark theme, Dynamic Type, VoiceOver, full iPad keyboard, Feel references: Things 3, Linear, Craft, Arc, Own design system unified on iOS and web (+8 more)

### Community 81 - "Sendable"
Cohesion: 0.10
Nodes (23): DSFontFamily, display, mono, text, DSFontWeight, bold, medium, regular (+15 more)

### Community 82 - "0009-notebook-mode-choice.md (7)"
Cohesion: 0.20
Nodes (9): compilerOptions, declaration, jsx, lib, noEmit, types, extends, include (+1 more)

### Community 83 - "open-questions.md"
Cohesion: 0.15
Nodes (15): Private Notebook Edit Flow, libsodium (swift-sodium), D-24. Название продукта, Datascratch (working name), Name candidates: Kora, Margins, Folio, Контекст, Решение, End-to-End Encryption (E2E) (+7 more)

### Community 84 - "Datascratch — правила для ИИ"
Cohesion: 0.16
Nodes (11): Datascratch — правила для ИИ, graphify, Иерархия источников истины, Контекст, Перед любой работой, Правила, Среда разработки, Скрипт tools/graphify_docs.py (prepare → агенты → finish) (+3 more)

### Community 85 - "design.yml"
Cohesion: 0.22
Nodes (8): concurrency, cancel-in-progress, group, jobs, web, name, name, runs-on

### Community 86 - "D-31. CRDT — Yjs (веб, сервер) и Yrs (iOS) (2)"
Cohesion: 0.22
Nodes (8): 12.1. Задачи, 12.2. Ежедневные заметки и календарь, 12.3. Красота документа, 12.4. Блоки, 12.5. Коллекции, 12.6. Навигация (как в Craft), 12. Функции по мотивам Craft, Связь с моделью данных

### Community 87 - "Organization Hierarchy (Account > Space > Notebook > Folder > Note)"
Cohesion: 0.25
Nodes (8): iPhone / iPad (`apps/ios`), Веб (`apps/web`), Инфраструктура, Как будем масштабироваться, если понадобится, Ресурсы сервера, Сервер (`apps/server`), Совместимость iOS ↔ веб без общего ядра (D-22), Технологический стек — РЕШЕНО (2026-10-25)

### Community 88 - "01-concept.md"
Cohesion: 0.15
Nodes (9): D-02. Отдельной десктоп-версии нет, на компьютере — веб, Последствия, Решение, D-03. Платформы: нативные iPhone и iPad + полноценный веб, Full-featured web client (TypeScript), Контекст, Последствия, Решение (+1 more)

### Community 89 - "Toast.tsx"
Cohesion: 0.33
Nodes (6): icons, ToastApi, ToastContext, ToastItem, ToastOptions, ToastTone

### Community 90 - "04-editor.md (2)"
Cohesion: 0.25
Nodes (8): Без срока, Закрытые (для истории), Нужно до или во время этапа 1, Нужно до этапа 2, Нужно до этапа 3, Нужно до этапа 4, Нужно до этапа 5, Открытые вопросы

### Community 91 - "0011-handwriting-for-agents.md (3)"
Cohesion: 0.22
Nodes (8): Документация Datascratch, История, Как вносить изменения, Оглавление, Порядок чтения для новичка, Соглашения, Ссылки на решения, Статусы

### Community 92 - "2. Платформы"
Cohesion: 0.25
Nodes (8): react-dom@^19.3.1, tailwindcss@^4.3.3, peerDependencies, react@^19.0.0, react-dom@^19.0.0, tailwindcss@^4.0.0, react-dom, tailwindcss

### Community 94 - "Контракт: шифрование (v1)"
Cohesion: 0.29
Nodes (7): Ключевые архитектурные идеи, Обзор архитектуры, Общая схема, Потоки данных, Правка агента в блокноте «для агентов», Правка в приватном блокноте, Структура репозитория

### Community 96 - "@datascratch/design-tokens — токены «Тихая бумага»"
Cohesion: 0.29
Nodes (6): @datascratch/design-tokens — токены «Тихая бумага», Команды, Подключение в вебе, Правила генерации, Что внутри, Шрифты

### Community 97 - "0009-notebook-mode-choice.md (5) (2)"
Cohesion: 0.33
Nodes (5): DSDesign — дизайн-система «Тихая бумага» для iOS, Как пользоваться, Компоненты, Сборка и тесты, Токены

### Community 98 - "pnpm-workspace.yaml"
Cohesion: 0.33
Nodes (5): Движение, Контракт: дизайн-токены «Тихая бумага» (v1), Пространство, формы, тени, Типографика, Цвета (светлая / тёмная тема)

### Community 100 - "iOS-стек и два языка (2)"
Cohesion: 0.33
Nodes (6): 7. Шифрование и доступ агентов, Восстановление доступа — ОТКРЫТО (R-02), Два режима блокнотов, Криптография (ПРЕДЛОЖЕНО, детали — этап 3), На будущее, Схема

### Community 101 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, dev, lint, showcase:build, test, typecheck

### Community 102 - "@datascratch/ui — веб-компоненты «Тихая бумага»"
Cohesion: 0.33
Nodes (5): @datascratch/ui — веб-компоненты «Тихая бумага», Витрина и тесты, Доступность и движение, Компоненты, Подключение

### Community 103 - "True"
Cohesion: 0.29
Nodes (7): paths, branches, paths, True, pull_request, push, workflow_dispatch

### Community 104 - "Новая группа (2)"
Cohesion: 0.40
Nodes (5): Changelog: coordinator contract clarifications, core stream proposals, Device / Share / AgentToken types (api.md), Sync limits in MiB of decoded bytes (sync-protocol), Yjs mark and missing-attribute format (document-model §4.1)

### Community 105 - "ios"
Cohesion: 0.33
Nodes (6): run, defaults, name, runs-on, ios, working-directory

### Community 106 - "Graphify"
Cohesion: 0.29
Nodes (7): Graphify, Автоматизация, Команды, Обновление графа после правки документов (по шагам), Почему два способа обновления, Установка на Mac (один раз), Что где лежит

### Community 108 - "3. Apple Pencil в тексте — ключевая фича"
Cohesion: 0.22
Nodes (9): 3. Apple Pencil в тексте — ключевая фича, Виды рукописного ввода, Гипотеза реализации (проверяется на этапе 1), Жесты пером, Критерии приёмки прототипа, Нужно решить на прототипе (см. `open-questions.md`), Ощущение пера, Перекладка текста — вариант А «живой штрих» (D-05, РЕШЕНО) (+1 more)

### Community 109 - "D-32. Минимальная версия iOS/iPadOS — 26 (2)"
Cohesion: 0.40
Nodes (4): D-32. Минимальная версия iOS/iPadOS — 26, Последствия, Рассмотренные варианты, Решение

### Community 110 - "D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления"
Cohesion: 0.40
Nodes (4): D-34. Вход: email + пароль; пароль же даёт ключ шифрования; ключ восстановления, Контекст, Рассмотренные варианты, Решение

### Community 112 - "@tailwindcss/vite"
Cohesion: 0.40
Nodes (4): @tailwindcss/vite@^4.3.3, vite@^8.3.5, @tailwindcss/vite, vite

### Community 113 - "vitest"
Cohesion: 0.40
Nodes (4): @vitejs/plugin-react@^6.1.2, vitest@^5.0.5, @vitejs/plugin-react, vitest

### Community 117 - "D-35. Пометка на удалённом тексте исчезает вместе с ним"
Cohesion: 0.50
Nodes (3): D-35. Пометка на удалённом тексте исчезает вместе с ним, Рассмотренные варианты, Решение

### Community 118 - "D-36. Структура: пространство → блокноты → папки"
Cohesion: 0.50
Nodes (3): D-36. Структура: пространство → блокноты → папки, Рассмотренные варианты, Решение

### Community 119 - "D-38. Дизайн-направление — «Тихая бумага», ориентир Craft"
Cohesion: 0.50
Nodes (3): D-38. Дизайн-направление — «Тихая бумага», ориентир Craft, Рассмотренные варианты, Решение

### Community 120 - "D-41. Набор функций по мотивам Craft"
Cohesion: 0.50
Nodes (3): D-41. Набор функций по мотивам Craft, Контекст, Решение

### Community 121 - "DSInkToken"
Cohesion: 0.22
Nodes (9): .color, DSInkToken, black, blue, brown, green, purple, red (+1 more)

### Community 128 - "exports"
Cohesion: 0.67
Nodes (3): exports, ./fonts.css, ./styles.css

### Community 141 - "0025-no-redis.md"
Cohesion: 0.12
Nodes (21): Убран Redis (D-25): один процесс сервера, очередь — pg-boss на PostgreSQL, GRDB (SQLite), pg-boss job queue, D-25. Redis не используем, Edit broadcast interface (in-memory), PostgreSQL LISTEN/NOTIFY, Redis (rejected), Valkey (free Redis alternative) (+13 more)

### Community 142 - "0014-organization.md"
Cohesion: 0.25
Nodes (7): Organization Hierarchy (Account > Space > Notebook > Folder > Note), D-14. Организация: богатая, но не перегруженная, Spaces, nested folders, smart tags, colors, Решение, Smart Tag, Space, Organization Structure (notebook vs space vs folder)

### Community 143 - "Infrastructure stack"
Cohesion: 0.40
Nodes (5): docker compose, GitHub Actions (incl. iOS build on macOS), Infrastructure stack, pnpm + Turborepo, iOS build and tests on macOS CI runner per push

## Knowledge Gaps
- **235 isolated node(s):** `PackageDescription`, `none`, `online`, `away`, `.presenceLabel` (+230 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 799 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Правила для ИИ и документации (3)` to `Платформы и клиенты (2)`, `components.test.tsx`, `react`, `PenToolbar.tsx`, `Toast.tsx`, `tokens.ts`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **What connects `PackageDescription`, `none`, `online` to the rest of the system?**
  _235 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Скрипт обновления графа` be split into smaller, more focused modules?**
  _Cohesion score 0.06349206349206349 - nodes in this community are weakly interconnected._
- **Why does `PenToolbar()` connect `PenToolbar.tsx` to `Платформы и клиенты (2)`, `components.test.tsx`, `tokens.ts`, `Правила для ИИ и документации (3)`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Should `Новая группа` be split into smaller, more focused modules?**
  _Cohesion score 0.05109126984126984 - nodes in this community are weakly interconnected._
- **Why does `DSDocRow` connect `DSDocRow` to `Контракт: дизайн-токены «Тихая бумага» (v1)`, `View`, `PenToolbar.tsx`, `0011-handwriting-for-agents.md (4)`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Should `0006-finger-drawing-iphone.md` be split into smaller, more focused modules?**
  _Cohesion score 0.14245014245014245 - nodes in this community are weakly interconnected._