# Graph Report - Datascratch  (2026-10-25)

## Corpus Check
- 145 files · ~50,731 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 4, .xcconfig 3, .example 1)

## Summary
- 267 nodes · 484 edges · 17 communities (12 shown, 5 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `40d768a0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Модель данных и глоссарий
- Монорепозиторий и CLAUDE.md
- Хранение в БД и редактор
- Модель данных и глоссарий (2)
- План разработки
- LibraryStore
- 06-data-server.md (2)
- 06-data-server.md (2) (2)
- Palette
- Контракт: модель документа (v1)
- Контракт: REST API сервера (v1)
- Контракт: протокол синхронизации (v1)

## God Nodes (most connected - your core abstractions)
1. `LibraryStore` - 73 edges
2. `LibrarySnapshot` - 42 edges
3. `BlockRow` - 16 edges
4. `Palette` - 14 edges
5. `StandInBlockEditor` - 13 edges
6. `AppModel` - 11 edges
7. `LibraryPersistence` - 11 edges
8. `План разработки` - 10 edges
9. `Контракт: REST API сервера (v1)` - 9 edges
10. `Контракт: протокол синхронизации (v1)` - 9 edges

## Surprising Connections (you probably didn't know these)
- `.leading` --references--> `AppModel`  [INFERRED]
  apps/ios/Datascratch/Features/Document/EditorHost.swift → apps/ios/Datascratch/App/AppModel.swift
- `StandInBlockEditor` --references--> `LibraryStore`  [EXTRACTED]
  apps/ios/Datascratch/Features/Document/EditorHost.swift → apps/ios/Datascratch/Services/LibraryStore.swift
- `AppModel` --references--> `LibraryStore`  [EXTRACTED]
  apps/ios/Datascratch/App/AppModel.swift → apps/ios/Datascratch/Services/LibraryStore.swift

## Import Cycles
- None detected.

## Communities (17 total, 5 thin omitted)

### Community 0 - "Модель данных и глоссарий"
Cohesion: 0.13
Nodes (16): BlockRow, .body, .bodyFont, .font, .leading, .menu, .placeholder, .textColor (+8 more)

### Community 1 - "Монорепозиторий и CLAUDE.md"
Cohesion: 0.09
Nodes (22): defaults, name, runs-on, steps, strategy, timeout-minutes, run, build-test (+14 more)

### Community 2 - "Хранение в БД и редактор"
Cohesion: 0.08
Nodes (10): AppModel, .pendingRecoveryKey, .phase, LaunchOptions, Phase, onboarding, ready, LibraryPersistence (+2 more)

### Community 4 - "Модель данных и глоссарий (2)"
Cohesion: 0.17
Nodes (3): LibraryUITests, OnboardingUITests, XCTest

### Community 5 - "План разработки"
Cohesion: 0.14
Nodes (13): Критерии приёмки, План разработки, Подготовка, Потоки разработки (D-39), Состав прототипа, Текущий статус, Этап 0 — подготовка (завершён), Этап 1 — прототип пера в тексте (iPad) (+5 more)

### Community 7 - "LibraryStore"
Cohesion: 0.18
Nodes (4): LibraryStore, .openTabs, .starredNotes, .tags

### Community 8 - "06-data-server.md (2)"
Cohesion: 0.15
Nodes (12): concurrency, cancel-in-progress, group, jobs, name, paths, branches, paths (+4 more)

### Community 9 - "06-data-server.md (2) (2)"
Cohesion: 0.14
Nodes (6): LibrarySnapshot, .activeSpace, .dailyNotebook, .documents, .spaces, .trashed

### Community 11 - "Palette"
Cohesion: 0.06
Nodes (29): Backdrop, .colors, .gradient, Color, Haptics, Motion, Palette, .accent (+21 more)

### Community 12 - "Контракт: модель документа (v1)"
Cohesion: 0.17
Nodes (11): 1. Три вида документов Yjs, 2. Документ `account`, 3. Документ `notebook` (индекс блокнота), 4.1. Совместимость с TipTap / y-prosemirror, 4.2. Схема блоков, 4.3. `meta` заметки, 4.4. `comments`, 4. Документ `note` (+3 more)

### Community 14 - "Контракт: REST API сервера (v1)"
Cohesion: 0.20
Nodes (9): Аккаунт и устройства, Аутентификация (D-34, `crypto.md`), Блокноты и документы (D-36), Вложения (`crypto.md` §6), Контракт: REST API сервера (v1), Общее, Служебное, Токены агентов (`spec/09-agents-api.md`) (+1 more)

### Community 15 - "Контракт: протокол синхронизации (v1)"
Cohesion: 0.20
Nodes (9): 1. Принципы, 2. Транспорт, 3. Сообщения клиента, 4. Сообщения сервера, 5. Снимки и уплотнение (R-05), 6. Права, 7. Коды ошибок, 8. Тестовые векторы (+1 more)

## Knowledge Gaps
- **31 isolated node(s):** `UIKit`, `DSDesign`, `.canvas`, `.surface`, `.sidebar` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 120 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LibraryStore` connect `LibraryStore` to `Модель данных и глоссарий`, `Хранение в БД и редактор`, `.updateNote`, `.mutate`, `06-data-server.md (2) (2)`, `String`?**
  _High betweenness centrality (0.241) - this node is a cross-community bridge._
- **Are the 31 inferred relationships involving `LibrarySnapshot` (e.g. with `.activeSpace` and `.body()`) actually correct?**
  _`LibrarySnapshot` has 31 INFERRED edges - model-reasoned connections that need verification._
- **What connects `UIKit`, `DSDesign`, `.canvas` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Модель данных и глоссарий` be split into smaller, more focused modules?**
  _Cohesion score 0.1349206349206349 - nodes in this community are weakly interconnected._
- **Why does `StandInBlockEditor` connect `Модель данных и глоссарий` to `LibraryStore`?**
  _High betweenness centrality (0.149) - this node is a cross-community bridge._
- **Should `Монорепозиторий и CLAUDE.md` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Why does `SwiftUI` connect `Модель данных и глоссарий` to `Palette`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._