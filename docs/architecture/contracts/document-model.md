# Контракт: модель документа (v1)

> Уточнение 2026-10-25 (предложение потока core): формат меток и отсутствующих атрибутов в §4.1.

Связано: D-01, D-05, D-31, D-36, D-41. Типы TS: `packages/shared/src/contracts/document.ts`.

## 1. Три вида документов Yjs

Всё содержимое пользователя — документы Yjs (CRDT). Синхронизируются они одинаково (`sync-protocol.md`), отличаются назначением и ключом шифрования (`crypto.md`).

| Вид (`DocKind`) | Сколько | Что внутри | Ключ |
| --- | --- | --- | --- |
| `account` | 1 на аккаунт | Пространства, список блокнотов, настройки, избранное, вкладки | мастер-ключ |
| `notebook` | 1 на блокнот | Индекс блокнота: папки, метаданные заметок, обёрнутые ключи заметок, теги | ключ блокнота |
| `note` | 1 на заметку | Содержимое заметки: блоки, штрихи, комментарии | ключ заметки |

Идентификаторы всех сущностей — **UUIDv7** в нижнем регистре со дефисами (`0192f3c4-...`), генерируются на клиенте. `docId` документа `notebook` совпадает с `notebookId`; `docId` документа `note` совпадает с `noteId`.

Все даты — ISO 8601 в UTC (`2026-10-25T12:00:00.000Z`); «только дата» — `YYYY-MM-DD` (в локальном календаре пользователя). Время в миллисекундах — только в штрихах.

## 2. Документ `account`

Корневые типы:

```
Y.Map "meta"        { formatVersion: 1 }
Y.Map "spaces"      spaceId -> Y.Map Space
Y.Map "notebooks"   notebookId -> Y.Map NotebookRef
Y.Map "settings"    ключ -> значение (JSON)
Y.Array "starred"   [ { kind: "note"|"folder"|"notebook", id } ]  (показывается только избранное текущего пространства, D-48)
Y.Array "tabs"      [ { noteId } ]  (открытые вкладки всех пространств; клиент показывает только вкладки текущего пространства — по блокноту документа, D-48; активная — settings.activeTabBySpace)
```

`Space`: `{ id, name, icon (emoji или SF-символ), color (токен цвета), order (число с плавающей точкой для сортировки), createdAt }`.

`NotebookRef`: `{ id, spaceId, name, icon, color, order, mode: "private"|"agent", createdAt }`. Ключ блокнота **не** хранится здесь — он лежит в `notebook_keys` на сервере, обёрнутый мастер-ключом (`crypto.md`).

Известные ключи `settings` (остальные — свободный JSON): `dailyNotebookBySpace` (`{ spaceId: notebookId }` — блокнот ежедневных заметок и «Входящих» каждого пространства, D-48), `activeTabBySpace` (`{ spaceId: noteId }` — активная вкладка каждого пространства, D-48); устаревшие `dailyNotebookId` и `activeTab` читаются один раз при переходе и относятся к пространству своего блокнота/документа, новые клиенты их не пишут; `recoveryKeyConfirmed: boolean` — пользователь подтвердил, что сохранил текущий ключ восстановления; сбрасывается в `false` при его ротации (`POST /v1/auth/recovery-key`, `api.md`). Уточнение 2026-10-25 (по поручению координатора).

## 3. Документ `notebook` (индекс блокнота)

```
Y.Map "meta"     { formatVersion: 1, notebookId, name, icon, color, space: { id, name, icon } }
Y.Map "folders"  folderId -> Y.Map Folder
Y.Map "notes"    noteId -> Y.Map NoteMeta
Y.Map "tags"     tagName -> Y.Map { color, icon }   (необязательные свойства тегов)
```

`meta.name`, `meta.icon`, `meta.color`, `meta.space` — **копия** названий из документа `account` (его сервер не видит), чтобы агенты в режиме «для агентов» видели названия блокнота и пространства. Клиенты обновляют копию при создании блокнота, переименовании блокнота/пространства, смене иконки или цвета и включении режима «для агентов» (уточнение потока agents, 2026-10-25; `color` — токен цвета как в `NotebookRef`, 2026-10-26: экран согласия агента рисует иконку блокнота его цветом).

`Folder`: `{ id, parentId (null = корень блокнота), name, icon, color, order, createdAt }`. Вложенность без ограничения глубины.

`NoteMeta`:

| Поле | Тип | Смысл |
| --- | --- | --- |
| `id` | string | noteId |
| `folderId` | string \| null | папка (null — корень блокнота) |
| `parentNoteId` | string \| null | если заметка вложена в другую как документ-карточка |
| `title` | string | копия заголовка для списков (обновляет редактор) |
| `kind` | `"note"`\|`"daily"`\|`"inbox"` | ежедневная заметка / входящие задачи блокнота |
| `dailyDate` | `YYYY-MM-DD` \| null | для `kind = "daily"` |
| `tags` | string[] | теги заметки (копия для списков) |
| `icon`, `coverThumb` | string \| null | эмодзи; attachmentId миниатюры обложки |
| `wrappedKey` | string (base64url) | ключ заметки, обёрнутый ключом блокнота (`crypto.md`) |
| `createdAt`, `updatedAt` | ISO | |
| `trashedAt` | ISO \| null | в корзине (удаление через 30 дней) |
| `order` | number | ручная сортировка |
| `createdByAgent` | `{ agentId, agentName, at }` \| null | заметку целиком создал агент (D-45): клиенты показывают полоску «Создано агентом», «Понятно» ставит `null`. Поле может отсутствовать (= null) |

Ежедневные заметки и «Входящие» живут в блокноте, выбранном в `settings.dailyNotebookId` аккаунта.

## 4. Документ `note`

```
Y.XmlFragment "content"   дерево блоков (ProseMirror-схема ниже)
Y.Map "meta"              { formatVersion: 1, style, cover, backdrop }
Y.Map "strokes"           strokeId -> Y.Map Stroke   (strokes.md)
Y.Map "comments"          commentId -> Y.Map Comment
```

### 4.1. Совместимость с TipTap / y-prosemirror

Веб использует TipTap + `y-prosemirror` с `field: "content"`. Поэтому `content` — это ровно то, что пишет y-prosemirror:

- узел ProseMirror = `Y.XmlElement` с `nodeName` = имя узла, атрибуты узла = атрибуты элемента (значения — JSON: строка, число, boolean, null);
- текст = `Y.XmlText`, метки (marks) = атрибуты форматирования; значение — **объект атрибутов метки**: `{ bold: {} }`, `{ link: { href } }` (у метки без атрибутов — пустой объект `{}`). Писатели пишут объект; читатели обязаны принимать и `{}`, и `true`, а также ключи вида `<имя>--<хэш>` (так y-prosemirror хранит перекрывающиеся метки одного типа);
- вставка текста в `Y.XmlText` без явных атрибутов **наследует форматирование слева** (поведение Yjs/Yrs) — писатели всегда передают явный набор атрибутов (уточнение потока ios-core);
- y-prosemirror **не записывает** атрибуты узлов со значением `null`: отсутствующий атрибут читатель трактует как `null` (значение по умолчанию из схемы). Это особенно важно для iOS (Yrs).

iOS (Yrs) **обязан** читать и писать именно этот формат. Совместимость проверяется векторами `packages/test-vectors/document/*`.

### 4.2. Схема блоков

Документ: `doc = title block+`.

У **каждого блочного узла** есть атрибут `blockId` (UUIDv7). Он нужен агентам для точечных правок, заметкам на полях и комментариям. Клиент присваивает `blockId` при создании блока и при вставке/разделении (новый блок получает новый id, исходный сохраняет свой).

| Узел | Атрибуты (кроме `blockId`) | Содержимое | Этап |
| --- | --- | --- | --- |
| `title` | — | inline* | MVP |
| `paragraph` | `textAlign?` | inline* | MVP |
| `heading` | `level: 1\|2\|3` | inline* | MVP |
| `bulletList` / `orderedList` | `start?` (orderedList) | `listItem+` | MVP |
| `listItem` | — | `paragraph block*` | MVP |
| `taskList` | — | `taskItem+` | MVP |
| `taskItem` | `taskId`, `state: "open"\|"done"\|"cancelled"`, `scheduled: YYYY-MM-DD\|null`, `deadline: YYYY-MM-DD\|null`, `completedAt: ISO\|null` | `paragraph block*` | MVP |
| `blockquote` | — | `block+` | MVP |
| `callout` | `tone: "note"\|"info"\|"success"\|"warning"\|"danger"`, `emoji: string\|null` | `block+` | MVP |
| `codeBlock` | `language: string\|null` | text* (без меток, кроме `agentEdit`) | MVP |
| `mathBlock` | `latex: string` | — (атом) | MVP |
| `mermaid` | `source: string` | — (атом) | MVP |
| `horizontalRule` | `style: "line"\|"dots"\|"wave"` | — | MVP |
| `table` / `tableRow` / `tableHeader` / `tableCell` | `colspan`, `rowspan`, `colwidth` (как в TipTap); у `tableHeader`/`tableCell` — `align: "left"\|"center"\|"right"` (выравнивание столбца из Markdown `:---`, `:---:`, `---:`; нет атрибута — по умолчанию) | | MVP |
| `image` | `attachmentId`, `width: number\|null` (доля ширины 0..1), `alt`, `caption` | — | MVP |
| `file` | `attachmentId`, `name`, `size`, `mime` | — | MVP |
| `drawing` | `height: number` — отображаемая высота = `height × ширинаБлока / 600` (опорная ширина 600, как в формуле толщины штриха) | — (штрихи — в `strokes`) | MVP |
| `pageCard` | `noteId`, `style: "card"\|"link"` | — | MVP |
| `collection` | (после MVP) | | После MVP |

**Никогда не удалять «непонятное» (правило для всех клиентов, 2026-10-26).** Узел или элемент, не прошедший проверку схемы клиента (недопустимая метка, неожиданное содержимое, неизвестный атрибут), **не удаляется и не переписывается** при открытии документа: клиент показывает его без недопустимых меток или заглушкой и сохраняет как есть. Повод: веб-редактор при открытии удалял блоки кода, созданные агентом (текст с меткой `agentEdit` в `codeBlock`), и удаление синхронизировалось — потеря данных.

Inline-узлы и метки:

| Имя | Вид | Атрибуты |
| --- | --- | --- |
| `noteLink` | inline-атом | `noteId`, `label` (текст `[[ ]]`) |
| `tag` | inline-атом | `name` (без `#`, вложенность через `/`) |
| `mention`(резерв) | inline-атом | — |
| `hardBreak` | inline | — |
| `bold`, `italic`, `underline`, `strike`, `code` | метки | — |
| `link` | метка | `href` (писатели пишут только `href`; `target`/`rel` добавляются при отрисовке, читатели терпят лишние поля) |
| `highlight` | метка | `color` (токен) |
| `textColor` | метка | `color` (токен) |
| `agentEdit` | метка | `agentId`, `at` (ISO) — подсветка правок агента (D-10); снимается, когда пользователь принял правку |

Неизвестные узлы и метки клиент **сохраняет как есть** и показывает заглушкой «Неподдерживаемый блок» — так старые версии не портят документы новых.

### 4.3. `meta` заметки

```
style:    { font: "serif"|"sans"|"mono", width: "normal"|"wide"|"full",
            paper: "plain"|"dots"|"grid"|"lines", textColor: токен|null }
cover:    { attachmentId, offsetY: 0..1 } | null
backdrop: { kind: "color"|"gradient", value: токен или имя градиента } | null
```

### 4.4. `comments`

`Comment`: `{ id, blockId, anchor: { start, end } (относительные позиции, base64url) | null, author: { kind: "user"|"guest"|"agent", id, name }, text, createdAt, resolvedAt }`.

## 5. Производные данные (не синхронизируются)

Строятся каждым клиентом локально из документов, потому что сервер содержимое не видит:

- **индекс задач** — все `taskItem` всех заметок: `{ noteId, taskId, text, state, scheduled, deadline }`;
- **полнотекстовый поиск**;
- **бэклинки** — по `noteLink`;
- **теги** — по `tag`.

## 6. Версия формата

`meta.formatVersion = 1` в каждом документе. Клиент, увидевший версию больше своей, открывает документ **только для чтения** и предлагает обновиться (R-03).
