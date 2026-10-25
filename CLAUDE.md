# Datascratch — правила для ИИ

> Этот файл читает любой ИИ, который открывает репозиторий. Он короткий намеренно:
> всё содержательное лежит в `docs/`, здесь — как с этим работать.

## Контекст

Приложение заметок: Apple Pencil прямо в тексте (штрихи привязаны к словам и
едут вместе с текстом при перекладке), гибрид Obsidian + Notesnook, доступ
внешних ИИ-агентов через MCP/REST. Клиенты: iOS/iPadOS (главные), веб. Свой
сервер. Весь код пишет Claude, пользователь — автор и владелец продукта, не
программист-исполнитель. Рабочее название — Datascratch (финальное не выбрано).

## Перед любой работой

1. Прочитай `docs/README.md` — оглавление и порядок чтения.
2. Прочитай `docs/roadmap.md` (где мы сейчас) и `docs/open-questions.md`
   (что ещё не решено — не решай это молча).
3. Для навигации используй граф Graphify (`graphify-out/`, раздел «graphify»
   ниже): сначала `graphify query "<вопрос>"`, потом точечное чтение файлов.
4. Последняя запись в `docs/history/` — что делали в прошлой сессии.

## Иерархия источников истины

1. `docs/` — **единственный источник истины** о требованиях, решениях и архитектуре.
2. `graphify-out/` — карта поверх `docs/` и кода. Главный инструмент навигации,
   но если граф и `docs/` расходятся — прав `docs/`, а граф надо пересобрать.
3. Код — истина о текущей реализации. Если код расходится с `docs/` — это баг
   либо в коде, либо в документации; выясни и исправь одно из двух.
4. `docs/history/` — архив. Передаточный документ `2026-10-25-handoff.md`
   **устарел** в части стека; актуальное — в `docs/spec`, `docs/architecture`,
   `docs/decisions`.

## Правила

- С пользователем — по-русски. Код, идентификаторы, коммиты, комментарии в
  коде — по-английски. Документация в `docs/` — по-русски.
- Объясняй пользователю решения простым языком, предлагай варианты с
  рекомендацией, не заваливай техническими деталями без нужды.
- Статусы решений: **РЕШЕНО** (подтверждено пользователем — не пересматривать
  без его согласия), **ПРЕДЛОЖЕНО** (рекомендация, ждёт подтверждения),
  **ОТКРЫТО** (нужно обсудить).
- Дизайн — главный принцип (D-15): премиальный SaaS-уровень. Не упрощать
  интерфейс в ущерб красоте и плавности без обсуждения с пользователем.
- Перо в тексте — ключевая фича и главный риск; качество важнее широты.

## Определение «готово» для любого изменения

Изменение не считается сделанным, пока в **том же коммите** не выполнено:

- [ ] изменились требования → обновлён раздел в `docs/spec/`;
- [ ] принято или изменено решение → новый/обновлённый ADR в `docs/decisions/`
      и строка в таблице `docs/decisions/README.md`;
- [ ] изменилась архитектура или стек → обновлён `docs/architecture/`;
- [ ] строка в `docs/CHANGELOG.md`;
- [ ] сдвинулся этап → обновлён `docs/roadmap.md`;
- [ ] появился/закрылся вопрос → обновлён `docs/open-questions.md`;
- [ ] **граф Graphify обновлён и закоммичен вместе с изменениями**:
      менялся только код → `graphify update .`;
      менялись документы (`*.md` и т. п.) → `/graphify . --update`
      (git-хук Graphify документы **не** пересобирает).

В конце рабочей сессии — запись в `docs/history/ГГГГ-ММ-ДД-session-NN.md`:
что сделано, что решили, что дальше.

## Среда разработки

- Работаем в двух местах: облачные сессии Claude Code (Linux, без Xcode) и Mac
  пользователя (Apple Silicon, Xcode). Подробно — `docs/development.md`.
- iOS-код, написанный в облаке, обязан собираться: его проверяет CI на macOS
  (GitHub Actions). Не оставляй в основной ветке код, который не собирается.
- В облачных сессиях стартовый хук (`.claude/hooks/session-start.sh`) ставит
  Graphify и git-хук автоматически.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
