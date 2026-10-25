# packages/web-editor — веб-редактор

`@datascratch/web-editor`: React-компонент `DatascratchEditor` — TipTap + Yjs по контракту `document-model.md`, все блоки, слой пера на Canvas по контракту `strokes.md` (живой штрих, D-05). Поток: web-editor (D-39). Описание поведения — `docs/spec/04-editor.md` и `docs/spec/03-pencil.md` (разделы «Веб»).

## Использование

```tsx
import { DatascratchEditor } from "@datascratch/web-editor";
import "@datascratch/web-editor/styles.css";

<DatascratchEditor doc={noteDoc} awareness={awareness} user={{ id, name, color }} host={host} onTitleChange={...} />
```

`host` — колбэки приложения (`EditorHost` в `src/host.ts`): вложения, заметки для `[[ ]]` и карточек, теги, действия задач. Стиль и обложка — `setNoteStyle` / `setNoteCover` (пишут в `meta` заметки).

## Устройство

| Путь | Что |
| --- | --- |
| `src/schema/` | Узлы и метки контракта, `blockId`-плагин, заглушки неизвестных узлов |
| `src/collab/` | Привязка y-prosemirror, общий `Y.UndoManager` для текста и штрихов |
| `src/pen/` | Слой пера: ввод, сглаживание, привязка (`geometry.ts`, `anchors.ts`, `layout.ts`), отрисовка, ластик, распознавание `hint` |
| `src/ui/` | Меню «/», `[[`, панель форматирования, ручки блоков, меню задачи, палитра пера |
| `src/shared/` | **Временные** копии типов и кодека штрихов до появления `@datascratch/shared` в `main` |
| `demo/` | Витрина: `pnpm dev` → http://localhost:5174 |
| `test/` | vitest: схема, якоря, D-35, кодек, геометрия, hint |
| `ct/` | Playwright component tests: рисование поверх текста, перекладка, ластики |

## Команды

```bash
pnpm install --filter "@datascratch/web-editor..."
pnpm --filter @datascratch/web-editor test       # vitest
pnpm --filter @datascratch/web-editor test:ct    # Playwright (в облаке: PW_CHROMIUM_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome)
pnpm --filter @datascratch/web-editor dev        # витрина
```
